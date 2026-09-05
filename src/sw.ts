// src/sw.ts —— PWA Service Worker 占位壳
// vite.config.ts 使用 VitePWA strategies: 'injectManifest'，构建时会自动在此文件注入预缓存清单
// 完整SW逻辑后续按 09-PWA部署清单.txt 补全，当前只保留最小可构建版本

/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

// 占位事件监听（构建后注入的预缓存会在此基础上生效）
self.addEventListener('install', (_e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });

// 兜底：未匹配的导航请求回退index.html（SPA）
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.mode === 'navigate') {
    e.respondWith(
      caches.match(req).then(r => r || fetch(req).catch(() => caches.match('/index.html') as Promise<Response>))
    );
  }
});

export {};
