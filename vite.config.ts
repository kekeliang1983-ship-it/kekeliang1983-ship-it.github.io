import { defineConfig, loadEnv, type ConfigEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import legacy from '@vitejs/plugin-legacy';
import compression from 'vite-plugin-compression';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { promises as fs, readFileSync } from 'fs';
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
          // 注意：'publish' / 'build' / 'upload' 是专用处理器（见下文），
          // 必须从通用动态内容处理器中排除，否则会被当成 content 文件读写而短路。
          if (dyn && root !== 'upload' && root !== 'build' && root !== 'publish') {
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
            // og-cover.png 是分享卡片封面，直接落在 public 根目录（服务路径 /og-cover.png）
            if (!safe || !(/^(images|videos|audio)\//.test(safe) || safe === 'og-cover.png')) return sendJson(res, 400, { error: '非法路径' });
            const dest = safe === 'og-cover.png'
              ? join(__dirname, 'public', 'og-cover.png')
              : safe.startsWith('audio/') ? join(__dirname, 'public', safe) : join(contentDir, safe);
            await fs.mkdir(join(dest, '..'), { recursive: true });
            await fs.writeFile(dest, Buffer.from(body.data || '', 'base64'));
            return sendJson(res, 200, { ok: true, url: '/' + safe });
          }
          if (req.method === 'POST' && root === 'publish') {
            // 内容一键发布：跑 scripts/publish-content.mjs（校验 → 提交 → 推送），
            // 之后 GitHub Actions 自动构建部署。仅 dev 中间件可达，生产无此能力。
            const body = (await readBody(req)) || '{}';
            let dry = false;
            try { dry = !!JSON.parse(body || '{}').dry; } catch { dry = false; }
            const child = spawn(
              process.execPath,
              ['scripts/publish-content.mjs', ...(dry ? ['--dry-run'] : [])],
              { cwd: __dirname },
            );
            let log = '';
            child.stdout.on('data', (d: any) => (log += d.toString()));
            child.stderr.on('data', (d: any) => (log += d.toString()));
            child.on('close', (code: number) =>
              sendJson(res, 200, { ok: code === 0, code, log: log.slice(-4000) }),
            );
            return;
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

// 分享卡片 meta 注入：构建（及 dev 预览）时根据 public/content/share.json 生成 OG/Twitter 标签。
// 爬虫读静态 HTML，故 meta 必须写进 index.html（运行时 JS 注入爬虫看不到），本插件在打包阶段注入。
// share.json 缺失时用默认兜底，保证链接卡片永远可用。
function shareMetaPlugin(rootDir: string) {
  const DEF = {
    title: '灵境 · 治愈小生物',
    description: '东方治愈 · 沉浸式休闲空间。养成你的灵境小生物，收集、种植、聆听与旅行。',
    image: 'https://kekeliang1983-ship-it.github.io/og-cover.png',
  };
  const SITE_URL = 'https://kekeliang1983-ship-it.github.io/';
  return {
    name: 'share-meta-inject',
    transformIndexHtml(html: string) {
      let cfg = { ...DEF };
      try {
        const raw = readFileSync(join(rootDir, 'public', 'content', 'share.json'), 'utf-8');
        cfg = { ...DEF, ...JSON.parse(raw) };
      } catch { /* 用默认兜底 */ }
      const tags = [
        `<title>${cfg.title}</title>`,
        `<meta name="description" content="${cfg.description}" />`,
        `<meta property="og:site_name" content="${cfg.title}" />`,
        `<meta property="og:title" content="${cfg.title}" />`,
        `<meta property="og:description" content="${cfg.description}" />`,
        `<meta property="og:type" content="website" />`,
        `<meta property="og:url" content="${SITE_URL}" />`,
        `<meta property="og:image" content="${cfg.image}" />`,
        `<meta property="og:image:width" content="1200" />`,
        `<meta property="og:image:height" content="630" />`,
        `<meta name="twitter:card" content="summary_large_image" />`,
        `<meta name="twitter:title" content="${cfg.title}" />`,
        `<meta name="twitter:description" content="${cfg.description}" />`,
        `<meta name="twitter:image" content="${cfg.image}" />`,
      ].join('\n  ');
      return html.replace('<!-- 分享卡片 meta 由构建插件根据 public/content/share.json 注入（微信/QQ/微博等链接卡片） -->', tags);
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

    // 固定 dev 端口，避免 5173→5174→5175 跳变，后台地址稳定为 localhost:5173
    // 注意：本文件曾存在两个 server 块，后者会静默覆盖前者导致 strictPort 失效，现合并为一处
    server: {
      port: 5173,
      host: true,
      strictPort: true,
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:3000',
          changeOrigin: true,
        },
      },
      hmr: { overlay: true, protocol: 'ws' },
      warmup: { clientFiles: ['./src/App.vue', './src/main.ts'] },
    },

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

      // 分享卡片 meta 注入（构建 + dev 预览均生效；读取 public/content/share.json）
      shareMetaPlugin(__dirname),
    ],

    optimizeDeps: {
      include: ['vue', 'vue-router', 'pinia', 'gsap', 'axios'],
      force: false,
    },

    logLevel: isProd ? 'error' : 'info',
    clearScreen: true,
  };
});
