// 灵境 · LingJing — 手写 Service Worker（离线缓存）
// 绕过 vite-plugin-pwa 的 workbox-build ESM 动态 require 报错
//
// v4 关键修正（解决三类线上问题）：
//   1) 曲目无法播放：旧版把音频放进 CORE 在 install 时预缓存约 15MB，且静态资源「缓存优先」
//      导致播放器的 HTTP Range 请求被 SW 返回的全量 200 响应破坏。现改为媒体「网络优先 + 缓存兜底」，
//      线上播放直接走网络（浏览器拿到的才是带 206/Accept-Ranges 的正确响应）。
//   2) 进入游戏偏慢 / 图片不及时显示：旧版 install 时并发下载 6 首 mp3 抢占带宽，拖慢首屏图片/视频。
//      现 CORE 只预缓存 index.html + manifest，音频改为首次播放成功后再惰性入缓存（离线兜底），首屏立刻变快。
//   3) 内容图（Banner 视频 / 今日心语卡片图）发布后即时生效：内容层（/content/*）改为「网络优先 + 缓存兜底」，
//      改完一键发布即玩家刷新即得，同时离线仍可回退缓存。
const CACHE = 'lingjing-v4';
// 仅预缓存最小骨架，避免首屏被大体积资源拖慢（音频改为惰性缓存，见 fetch 媒体分支）
const CORE = [
  '/index.html',
  '/manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  const p = url.pathname;

  // 开发期资源（vite ESM 模块 / 依赖预构建 / 后台 API）：网络优先，绝不缓存，
  // 否则 SW 缓存旧的 /src/*.ts 模块会导致开发版白屏、热更新失效（铁律：dev 禁用 SW 缓存）
  if (p.startsWith('/src/') || p.startsWith('/@') || p.startsWith('/node_modules/') || p.includes('/__admin_api') || p.startsWith('/@fs')) {
    e.respondWith(fetch(req).catch(() => caches.match('/index.html')));
    return;
  }

  // SPA 导航：网络优先，失败回退缓存首页
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // 内容层（/content/*.json 与内容图/视频）：网络优先 + 缓存兜底
  // —— 保证「后台改完 JSON / 换图 → 一键发布 → 玩家刷新即得」；离线时回退缓存仍可看
  if (p.includes('/content/')) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/index.html')))
    );
    return;
  }

  // 媒体（音频/视频）：网络优先 + 缓存兜底
  // 关键：直接走网络，浏览器才能拿到带 Range/206 的正确响应；离线时回退已缓存副本
  if (/\.(mp3|mp4|webm|ogg|wav|m4a|mov|m3u8)$/i.test(p) || p.startsWith('/audio/') || p.startsWith('/video/')) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/index.html')))
    );
    return;
  }

  // 构建产物（JS/CSS/字体，文件名带 contenthash，天然不可变）：缓存优先 + 后台更新（性能最优）
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        // 后台静默更新缓存（不影响本次响应）
        fetch(req)
          .then((res) => {
            if (res && res.ok && res.type === 'basic') {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
          })
          .catch(() => {});
        return cached;
      }
      return fetch(req)
        .then((res) => {
          if (res && res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match('/index.html'));
    })
  );
});
