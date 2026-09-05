// 灵境 · LingJing — 手写 Service Worker（离线缓存）
// 绕过 vite-plugin-pwa 的 workbox-build ESM 动态 require 报错
const CACHE = 'lingjing-v3';
// 预缓存：首页 + manifest + 6 首真实背景音乐（保证首次离线即开即播）
const CORE = [
  '/index.html',
  '/manifest.webmanifest',
  '/audio/track_001.mp3',
  '/audio/track_002.mp3',
  '/audio/track_003.mp3',
  '/audio/track_004.mp3',
  '/audio/track_005.mp3',
  '/audio/track_006.mp3',
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

  // 开发期资源（vite ESM 模块 / 依赖预构建 / 后台 API）：网络优先，绝不缓存，
  // 否则 SW 缓存旧的 /src/*.ts 模块会导致开发版白屏、热更新失效（铁律：dev 禁用 SW 缓存）
  const p = url.pathname;
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

  // 内容层保护：/content/*.json 永远走网络、禁用任何缓存，
  // 保证线上「改完 JSON → 玩家刷新即得」，不被 SW 缓存优先拖成旧版。
  // （路径含 /content/ 即可兼容根部署与 GitHub Pages 子路径部署）
  if (p.includes('/content/')) {
    e.respondWith(fetch(req));
    return;
  }

  // 静态资源：缓存优先 + 后台更新
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        fetch(req)
          .then((res) => {
            if (res && res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
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
