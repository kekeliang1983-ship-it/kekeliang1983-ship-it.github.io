import { defineConfig, loadEnv, type ConfigEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import legacy from '@vitejs/plugin-legacy';
import compression from 'vite-plugin-compression';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';
import { spawn } from 'child_process';
import autoprefixer from 'autoprefixer';

// ESM 模式下替代 __dirname（原 CJS 变量）
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 本地可视化内容管理后台（仅 dev 生效，生产构建不包含）：
// 提供 /__admin_api/* 读写 public/content/*.json、接收 base64 图片写盘、触发本地构建。
// 简易口令门禁：设置环境变量 ADMIN_TOKEN 后，所有 /__admin_api/* 请求须带
// 请求头 x-admin-token 匹配才放行；未设置则保持向后兼容（不拦截）。
function adminApiPlugin(tokenFromEnv?: string) {
  const contentDir = join(__dirname, 'public', 'content');
  // 优先用 loadEnv 从 .env.local 读到的（方式 B），其次回退 shell 导出的 process.env（方式 A）
  const ADMIN_TOKEN = tokenFromEnv || process.env.ADMIN_TOKEN || '';
  const readBody = (req: any) =>
    new Promise<string>((resolve, reject) => {
      let data = '';
      req.on('data', (c: any) => (data += c));
      req.on('end', () => resolve(data));
      req.on('error', reject);
    });
  const sendJson = (res: any, code: number, obj: any) => {
    res.statusCode = code;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(obj));
  };
  return {
    name: 'admin-api',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const url: string = req.url || '';
        if (!url.startsWith('/__admin_api/')) return next();
        // —— 口令门禁 ——
        if (ADMIN_TOKEN && (req.headers['x-admin-token'] || '') !== ADMIN_TOKEN) {
          return sendJson(res, 401, { error: '需要后台口令（x-admin-token）' });
        }
        try {
          const root = url.replace('/__admin_api/', '').split('?')[0];

          // 通用内容读写：/__admin_api/<name>  ↔  public/content/<name>.json
          // 覆盖 gallery / banner / music / pet / shrine / artifacts / bottle 等所有模块
          const dyn = root.match(/^([a-z0-9_-]+)$/i);
          if (dyn && root !== 'upload' && root !== 'build') {
            const file = dyn[1];
            const p = join(contentDir, file + '.json');
            if (req.method === 'GET') {
              try {
                const txt = await fs.readFile(p, 'utf-8');
                return sendJson(res, 200, JSON.parse(txt));
              } catch {
                // 文件尚未生成：返回空对象，前端编辑器可据此创建
                return sendJson(res, 200, { __empty: true });
              }
            }
            if (req.method === 'POST') {
              const body = JSON.parse(await readBody(req));
              await fs.mkdir(contentDir, { recursive: true });
              await fs.writeFile(p, JSON.stringify(body, null, 2), 'utf-8');
              return sendJson(res, 200, { ok: true });
            }
          }

          if (req.method === 'POST' && root === 'upload') {
            const body = JSON.parse(await readBody(req)); // { path, data(base64) }
            const safe = (body.path || '').replace(/^\/+/, '').replace(/\.\.+/g, '');
            // 允许图片/视频/音频落盘：images/videos 走 content 目录，audio 走 public/audio（曲目 src 为 /audio/...）
            if (!safe || !/^(images|videos|audio)\//.test(safe)) return sendJson(res, 400, { error: '非法路径' });
            const dest = safe.startsWith('audio/') ? join(__dirname, 'public', safe) : join(contentDir, safe);
            await fs.mkdir(join(dest, '..'), { recursive: true });
            await fs.writeFile(dest, Buffer.from(body.data || '', 'base64'));
            return sendJson(res, 200, { ok: true, url: '/' + safe });
          }
          if (req.method === 'POST' && root === 'build') {
            // 本地构建（rm -rf dist && npm run build）；CloudStudio 发布由外部工具完成
            const child = spawn('npm', ['run', 'build'], { cwd: __dirname, shell: true });
            let log = '';
            child.stdout.on('data', (d: any) => (log += d.toString()));
            child.stderr.on('data', (d: any) => (log += d.toString()));
            child.on('close', (code: number) =>
              sendJson(res, code === 0 ? 200 : 500, { ok: code === 0, log: log.slice(-3000) }),
            );
            return;
          }
          return sendJson(res, 404, { error: 'not found' });
        } catch (e: any) {
          return sendJson(res, 500, { error: String(e?.message || e) });
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }: ConfigEnv) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProd = mode === 'production';
  const isStaging = mode === 'staging';
  const isSingle = mode === 'singlefile';
  // PWA：改用 public/sw.js 手写 Service Worker（绕过 vite-plugin-pwa 的
  // "Dynamic require of workbox-build is not supported" ESM 兼容死结）。
  // 手写 SW 依旧提供真·离线缓存（缓存优先 + SPA 导航回退），且满足手机 PWA 安装。
  const enablePwa = false;
  // 单文件版关闭 legacy/compression（会与 inlineDynamicImports 冲突，且单文件不需要）
  const enableLegacy = !isSingle;
  const enableCompress = !isSingle;

  return {
    base: isSingle ? './' : '/',
    publicDir: 'public',

    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@components': resolve(__dirname, 'src/components'),
        '@core': resolve(__dirname, 'src/core'),
        '@stores': resolve(__dirname, 'src/stores'),
        '@assets': resolve(__dirname, 'src/assets'),
        '@types': resolve(__dirname, 'src/types'),
        '@styles': resolve(__dirname, 'src/styles'),
        '@views': resolve(__dirname, 'src/views'),
      },
    },

    css: {
      postcss: {
        plugins: [autoprefixer as any],
      },
    },

    server: {
      port: 5173,
      host: true,
      strictPort: false,
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:3000',
          changeOrigin: true,
        },
      },
      hmr: { overlay: true, protocol: 'ws' },
      warmup: { clientFiles: ['./src/App.vue', './src/main.ts'] },
    },

    preview: { port: 4173, host: true },

    build: {
      target: 'es2020',
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: !isProd && !isSingle,
      cssCodeSplit: !isSingle,
      // 单文件版：把所有图片/字体等内联为 base64，彻底无外部资源
      assetsInlineLimit: isSingle ? 100_000_000 : 4096,
      minify: (isProd || isSingle) ? 'terser' : 'esbuild',
      terserOptions: {
        compress: {
          drop_console: isProd,
          drop_debugger: isProd,
          pure_funcs: isProd ? ['console.log', 'console.debug'] : [],
        },
        format: { comments: false },
      },
      chunkSizeWarningLimit: 10000,
      rollupOptions: {
        external: [],
        input: { main: resolve(__dirname, 'index.html') },
        output: isSingle
          ? {
              // 单文件：禁用分包 + 内联动态导入，全部打进一个模块文件，便于后续内联进 HTML
              inlineDynamicImports: true,
              entryFileNames: 'assets/[name]-[hash].js',
              chunkFileNames: 'assets/[name]-[hash].js',
              assetFileNames: 'assets/[name]-[hash].[ext]',
            }
          : {
              entryFileNames: 'assets/[name]-[hash].js',
              chunkFileNames: 'assets/[name]-[hash].js',
              assetFileNames: 'assets/[name]-[hash].[ext]',
              manualChunks: (id) => {
                if (id.includes('node_modules/vue') ||
                    id.includes('node_modules/vue-router') ||
                    id.includes('node_modules/pinia')) return 'vue-core';
                if (id.includes('node_modules/gsap')) return 'gsap';
                if (id.includes('node_modules/workbox-')) return 'workbox';
                if (id.includes('node_modules')) return 'vendor';
              },
              experimentalMinChunkSize: 10000,
            },
      },
      // 关闭自动清空：本沙箱 safe-delete shim 对 fs.rmSync 拦截（genie-trash 二进制超时 + PowerShell 回收站报错），
      // 任何清空 dist 的操作都会失败。改为不自动清空，构建直接覆盖写入；旧哈希资源为无害残留（index.html 不引用）。
      // 如日后需彻底清理，用不被 shim 拦截的方式删除 dist 目录即可。
      emptyOutDir: false,
    },

    plugins: [
      vue({
        template: {
          compilerOptions: {
            isCustomElement: (tag) => tag === 'ErrorBoundary',
          },
        },
      }),

      // PWA：离线测试构建关闭（workbox 动态 require 报错；游戏逻辑已全本地，无需 SW）
      enablePwa ? VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        injectManifest: {
          swDest: 'dist/sw.js',
          globIgnores: ['**/node_modules/**', '**/.*'],
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        },
        manifest: {
          name: env.VITE_APP_TITLE || '灵境 · LingJing',
          short_name: '灵境',
          description: '东方治愈 · 沉浸式休闲空间',
          theme_color: '#DEE5F5',
          background_color: '#DEE5F5',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/?utm_source=pwa',
          icons: [
            { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-192x192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
            { src: '/icons/icon-512x512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        devOptions: { enabled: false, type: 'module', navigateFallback: 'index.html' },
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        workbox: {
          runtimeCaching: [
            {
              urlPattern: /\.(?:png|jpg|jpeg|webp|svg|gif)$/,
              handler: 'CacheFirst',
              options: { cacheName: 'images-cache-v1', expiration: { maxEntries: 100, maxAgeSeconds: 604800 } },
            },
          ],
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/api\//, /^\/assets\//],
        },
      }) : null,

      enableLegacy ? legacy({
        targets: ['defaults', 'not IE 11', 'chrome >= 70', 'safari >= 12', 'iOS >= 12', 'android >= 7'],
        modernPolyfills: false,
        renderLegacyChunks: true,
        polyfills: ['es.promise.finally', 'es.array.flat', 'es.array.flat-map', 'es.object.from-entries'],
      }) : null,

      enableCompress ? compression({ algorithm: 'gzip', ext: '.gz', threshold: 1024, deleteOriginalAssets: false }) : null,
      enableCompress ? compression({ algorithm: 'brotliCompress', ext: '.br', threshold: 1024, deleteOriginalAssets: false }) : null,

      // 本地可视化内容后台（仅 dev：configureServer 不进生产构建）
      adminApiPlugin(env.ADMIN_TOKEN),
    ],

    optimizeDeps: {
      include: ['vue', 'vue-router', 'pinia', 'gsap', 'axios'],
      force: false,
    },

    logLevel: isProd ? 'error' : 'info',
    clearScreen: true,
  };
});
