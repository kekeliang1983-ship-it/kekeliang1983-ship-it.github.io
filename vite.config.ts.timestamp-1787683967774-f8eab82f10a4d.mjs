// vite.config.ts
import { defineConfig, loadEnv } from "file:///C:/Users/KEKELIANG/WorkBuddy/NEW%20OBB/CozyCreatures/node_modules/vite/dist/node/index.js";
import vue from "file:///C:/Users/KEKELIANG/WorkBuddy/NEW%20OBB/CozyCreatures/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import { VitePWA } from "file:///C:/Users/KEKELIANG/WorkBuddy/NEW%20OBB/CozyCreatures/node_modules/vite-plugin-pwa/dist/index.js";
import legacy from "file:///C:/Users/KEKELIANG/WorkBuddy/NEW%20OBB/CozyCreatures/node_modules/@vitejs/plugin-legacy/dist/index.mjs";
import compression from "file:///C:/Users/KEKELIANG/WorkBuddy/NEW%20OBB/CozyCreatures/node_modules/vite-plugin-compression/dist/index.mjs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import autoprefixer from "file:///C:/Users/KEKELIANG/WorkBuddy/NEW%20OBB/CozyCreatures/node_modules/autoprefixer/lib/autoprefixer.js";
var __vite_injected_original_import_meta_url = "file:///C:/Users/KEKELIANG/WorkBuddy/NEW%20OBB/CozyCreatures/vite.config.ts";
var __filename = fileURLToPath(__vite_injected_original_import_meta_url);
var __dirname = dirname(__filename);
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const isProd = mode === "production";
  const isStaging = mode === "staging";
  const enablePwa = mode !== "offline";
  return {
    base: "/",
    publicDir: "public",
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
        "@components": resolve(__dirname, "src/components"),
        "@core": resolve(__dirname, "src/core"),
        "@stores": resolve(__dirname, "src/stores"),
        "@assets": resolve(__dirname, "src/assets"),
        "@types": resolve(__dirname, "src/types"),
        "@styles": resolve(__dirname, "src/styles"),
        "@views": resolve(__dirname, "src/views")
      }
    },
    css: {
      postcss: {
        plugins: [autoprefixer]
      }
    },
    server: {
      port: 5173,
      host: true,
      strictPort: false,
      proxy: {
        "/api": {
          target: env.VITE_API_BASE_URL || "http://localhost:3000",
          changeOrigin: true
        }
      },
      hmr: { overlay: true, protocol: "ws" },
      warmup: { clientFiles: ["./src/App.vue", "./src/main.ts"] }
    },
    preview: { port: 4173, host: true },
    build: {
      target: "es2020",
      outDir: "dist",
      assetsDir: "assets",
      sourcemap: !isProd,
      cssCodeSplit: true,
      minify: isProd ? "terser" : "esbuild",
      terserOptions: {
        compress: {
          drop_console: isProd,
          drop_debugger: isProd,
          pure_funcs: isProd ? ["console.log", "console.debug"] : []
        },
        format: { comments: false }
      },
      chunkSizeWarningLimit: 1e3,
      rollupOptions: {
        external: [],
        input: { main: resolve(__dirname, "index.html") },
        output: {
          entryFileNames: "assets/[name]-[hash].js",
          chunkFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]",
          manualChunks: (id) => {
            if (id.includes("node_modules/vue") || id.includes("node_modules/vue-router") || id.includes("node_modules/pinia")) return "vue-core";
            if (id.includes("node_modules/gsap")) return "gsap";
            if (id.includes("node_modules/workbox-")) return "workbox";
            if (id.includes("node_modules")) return "vendor";
          },
          experimentalMinChunkSize: 1e4
        }
      },
      // 离线构建关闭自动清空：绕过环境 safe-delete shim 对 fs.rmSync 的拦截（手动清理一次即可）
      emptyOutDir: mode !== "offline"
    },
    plugins: [
      vue({
        template: {
          compilerOptions: {
            isCustomElement: (tag) => tag === "ErrorBoundary"
          }
        }
      }),
      // PWA：离线测试构建关闭（workbox 动态 require 报错；游戏逻辑已全本地，无需 SW）
      enablePwa ? VitePWA({
        strategies: "injectManifest",
        srcDir: "src",
        filename: "sw.ts",
        injectManifest: {
          swDest: "dist/sw.js",
          globIgnores: ["**/node_modules/**", "**/.*"],
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024
        },
        manifest: {
          name: env.VITE_APP_TITLE || "\u7075\u5883 \xB7 LingJing",
          short_name: "\u7075\u5883",
          description: "\u4E1C\u65B9\u6CBB\u6108 \xB7 \u6C89\u6D78\u5F0F\u4F11\u95F2\u7A7A\u95F4",
          theme_color: "#DEE5F5",
          background_color: "#DEE5F5",
          display: "standalone",
          orientation: "portrait",
          scope: "/",
          start_url: "/?utm_source=pwa",
          icons: [
            { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            { src: "/icons/icon-192x192-maskable.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
            { src: "/icons/icon-512x512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
          ]
        },
        devOptions: { enabled: false, type: "module", navigateFallback: "index.html" },
        registerType: "autoUpdate",
        injectRegister: "auto",
        workbox: {
          runtimeCaching: [
            {
              urlPattern: /\.(?:png|jpg|jpeg|webp|svg|gif)$/,
              handler: "CacheFirst",
              options: { cacheName: "images-cache-v1", expiration: { maxEntries: 100, maxAgeSeconds: 604800 } }
            }
          ],
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
          navigateFallback: "index.html",
          navigateFallbackDenylist: [/^\/api\//, /^\/assets\//]
        }
      }) : null,
      legacy({
        targets: ["defaults", "not IE 11", "chrome >= 70", "safari >= 12", "iOS >= 12", "android >= 7"],
        modernPolyfills: false,
        renderLegacyChunks: true,
        polyfills: ["es.promise.finally", "es.array.flat", "es.array.flat-map", "es.object.from-entries"]
      }),
      compression({ algorithm: "gzip", ext: ".gz", threshold: 1024, deleteOriginalAssets: false }),
      compression({ algorithm: "brotliCompress", ext: ".br", threshold: 1024, deleteOriginalAssets: false })
    ],
    optimizeDeps: {
      include: ["vue", "vue-router", "pinia", "gsap", "axios"],
      force: false
    },
    logLevel: isProd ? "error" : "info",
    clearScreen: true
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxLRUtFTElBTkdcXFxcV29ya0J1ZGR5XFxcXE5FVyBPQkJcXFxcQ296eUNyZWF0dXJlc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcS0VLRUxJQU5HXFxcXFdvcmtCdWRkeVxcXFxORVcgT0JCXFxcXENvenlDcmVhdHVyZXNcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL0tFS0VMSUFORy9Xb3JrQnVkZHkvTkVXJTIwT0JCL0NvenlDcmVhdHVyZXMvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcsIGxvYWRFbnYsIHR5cGUgQ29uZmlnRW52IH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgdnVlIGZyb20gJ0B2aXRlanMvcGx1Z2luLXZ1ZSc7XG5pbXBvcnQgeyBWaXRlUFdBIH0gZnJvbSAndml0ZS1wbHVnaW4tcHdhJztcbmltcG9ydCBsZWdhY3kgZnJvbSAnQHZpdGVqcy9wbHVnaW4tbGVnYWN5JztcbmltcG9ydCBjb21wcmVzc2lvbiBmcm9tICd2aXRlLXBsdWdpbi1jb21wcmVzc2lvbic7XG5pbXBvcnQgeyByZXNvbHZlLCBkaXJuYW1lIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSAndXJsJztcbmltcG9ydCBhdXRvcHJlZml4ZXIgZnJvbSAnYXV0b3ByZWZpeGVyJztcblxuLy8gRVNNIFx1NkEyMVx1NUYwRlx1NEUwQlx1NjZGRlx1NEVFMyBfX2Rpcm5hbWVcdUZGMDhcdTUzOUYgQ0pTIFx1NTNEOFx1OTFDRlx1RkYwOVxuY29uc3QgX19maWxlbmFtZSA9IGZpbGVVUkxUb1BhdGgoaW1wb3J0Lm1ldGEudXJsKTtcbmNvbnN0IF9fZGlybmFtZSA9IGRpcm5hbWUoX19maWxlbmFtZSk7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9OiBDb25maWdFbnYpID0+IHtcbiAgY29uc3QgZW52ID0gbG9hZEVudihtb2RlLCBwcm9jZXNzLmN3ZCgpLCAnJyk7XG4gIGNvbnN0IGlzUHJvZCA9IG1vZGUgPT09ICdwcm9kdWN0aW9uJztcbiAgY29uc3QgaXNTdGFnaW5nID0gbW9kZSA9PT0gJ3N0YWdpbmcnO1xuICAvLyBcdTc5QkJcdTdFQkZcdTZENEJcdThCRDVcdTY3ODRcdTVFRkFcdTUxNzNcdTk1RUQgUFdBXHVGRjFBd29ya2JveC1idWlsZCBcdTUyQThcdTYwMDEgcmVxdWlyZSBcdTU3MjhcdTc5QkJcdTdFQkZcdTZBMjFcdTVGMEZcdTRFMEJcdTRGMUFcdTYyQTVcdTk1MTlcdUZGMENcbiAgLy8gXHU4MDBDXHU2RTM4XHU2MjBGXHU5MDNCXHU4RjkxXHU1REYyXHU1MTY4XHU2NzJDXHU1NzMwXHVGRjA4R1NBUCBcdTVERjJcdTYyNTNcdTUzMDVcdTMwMDFcdTY1RTAgQ0ROIFx1NEY5RFx1OEQ1Nlx1RkYwOVx1RkYwQ1x1NjVFMFx1OTcwMCBTZXJ2aWNlIFdvcmtlciBcdTdGMTNcdTVCNThcdTUzNzNcdTUzRUZcdTc5QkJcdTdFQkZcdThGRDBcdTg4NENcbiAgY29uc3QgZW5hYmxlUHdhID0gbW9kZSAhPT0gJ29mZmxpbmUnO1xuXG4gIHJldHVybiB7XG4gICAgYmFzZTogJy8nLFxuICAgIHB1YmxpY0RpcjogJ3B1YmxpYycsXG5cbiAgICByZXNvbHZlOiB7XG4gICAgICBhbGlhczoge1xuICAgICAgICAnQCc6IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjJyksXG4gICAgICAgICdAY29tcG9uZW50cyc6IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjL2NvbXBvbmVudHMnKSxcbiAgICAgICAgJ0Bjb3JlJzogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvY29yZScpLFxuICAgICAgICAnQHN0b3Jlcyc6IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjL3N0b3JlcycpLFxuICAgICAgICAnQGFzc2V0cyc6IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjL2Fzc2V0cycpLFxuICAgICAgICAnQHR5cGVzJzogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvdHlwZXMnKSxcbiAgICAgICAgJ0BzdHlsZXMnOiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy9zdHlsZXMnKSxcbiAgICAgICAgJ0B2aWV3cyc6IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjL3ZpZXdzJyksXG4gICAgICB9LFxuICAgIH0sXG5cbiAgICBjc3M6IHtcbiAgICAgIHBvc3Rjc3M6IHtcbiAgICAgICAgcGx1Z2luczogW2F1dG9wcmVmaXhlciBhcyBhbnldLFxuICAgICAgfSxcbiAgICB9LFxuXG4gICAgc2VydmVyOiB7XG4gICAgICBwb3J0OiA1MTczLFxuICAgICAgaG9zdDogdHJ1ZSxcbiAgICAgIHN0cmljdFBvcnQ6IGZhbHNlLFxuICAgICAgcHJveHk6IHtcbiAgICAgICAgJy9hcGknOiB7XG4gICAgICAgICAgdGFyZ2V0OiBlbnYuVklURV9BUElfQkFTRV9VUkwgfHwgJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMCcsXG4gICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIGhtcjogeyBvdmVybGF5OiB0cnVlLCBwcm90b2NvbDogJ3dzJyB9LFxuICAgICAgd2FybXVwOiB7IGNsaWVudEZpbGVzOiBbJy4vc3JjL0FwcC52dWUnLCAnLi9zcmMvbWFpbi50cyddIH0sXG4gICAgfSxcblxuICAgIHByZXZpZXc6IHsgcG9ydDogNDE3MywgaG9zdDogdHJ1ZSB9LFxuXG4gICAgYnVpbGQ6IHtcbiAgICAgIHRhcmdldDogJ2VzMjAyMCcsXG4gICAgICBvdXREaXI6ICdkaXN0JyxcbiAgICAgIGFzc2V0c0RpcjogJ2Fzc2V0cycsXG4gICAgICBzb3VyY2VtYXA6ICFpc1Byb2QsXG4gICAgICBjc3NDb2RlU3BsaXQ6IHRydWUsXG4gICAgICBtaW5pZnk6IGlzUHJvZCA/ICd0ZXJzZXInIDogJ2VzYnVpbGQnLFxuICAgICAgdGVyc2VyT3B0aW9uczoge1xuICAgICAgICBjb21wcmVzczoge1xuICAgICAgICAgIGRyb3BfY29uc29sZTogaXNQcm9kLFxuICAgICAgICAgIGRyb3BfZGVidWdnZXI6IGlzUHJvZCxcbiAgICAgICAgICBwdXJlX2Z1bmNzOiBpc1Byb2QgPyBbJ2NvbnNvbGUubG9nJywgJ2NvbnNvbGUuZGVidWcnXSA6IFtdLFxuICAgICAgICB9LFxuICAgICAgICBmb3JtYXQ6IHsgY29tbWVudHM6IGZhbHNlIH0sXG4gICAgICB9LFxuICAgICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiAxMDAwLFxuICAgICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgICBleHRlcm5hbDogW10sXG4gICAgICAgIGlucHV0OiB7IG1haW46IHJlc29sdmUoX19kaXJuYW1lLCAnaW5kZXguaHRtbCcpIH0sXG4gICAgICAgIG91dHB1dDoge1xuICAgICAgICAgIGVudHJ5RmlsZU5hbWVzOiAnYXNzZXRzL1tuYW1lXS1baGFzaF0uanMnLFxuICAgICAgICAgIGNodW5rRmlsZU5hbWVzOiAnYXNzZXRzL1tuYW1lXS1baGFzaF0uanMnLFxuICAgICAgICAgIGFzc2V0RmlsZU5hbWVzOiAnYXNzZXRzL1tuYW1lXS1baGFzaF0uW2V4dF0nLFxuICAgICAgICAgIG1hbnVhbENodW5rczogKGlkKSA9PiB7XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy92dWUnKSB8fFxuICAgICAgICAgICAgICAgIGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvdnVlLXJvdXRlcicpIHx8XG4gICAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9waW5pYScpKSByZXR1cm4gJ3Z1ZS1jb3JlJztcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL2dzYXAnKSkgcmV0dXJuICdnc2FwJztcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL3dvcmtib3gtJykpIHJldHVybiAnd29ya2JveCc7XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcycpKSByZXR1cm4gJ3ZlbmRvcic7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBleHBlcmltZW50YWxNaW5DaHVua1NpemU6IDEwMDAwLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIC8vIFx1NzlCQlx1N0VCRlx1Njc4NFx1NUVGQVx1NTE3M1x1OTVFRFx1ODFFQVx1NTJBOFx1NkUwNVx1N0E3QVx1RkYxQVx1N0VENVx1OEZDN1x1NzNBRlx1NTg4MyBzYWZlLWRlbGV0ZSBzaGltIFx1NUJGOSBmcy5ybVN5bmMgXHU3Njg0XHU2MkU2XHU2MjJBXHVGRjA4XHU2MjRCXHU1MkE4XHU2RTA1XHU3NDA2XHU0RTAwXHU2QjIxXHU1MzczXHU1M0VGXHVGRjA5XG4gICAgICBlbXB0eU91dERpcjogbW9kZSAhPT0gJ29mZmxpbmUnLFxuICAgIH0sXG5cbiAgICBwbHVnaW5zOiBbXG4gICAgICB2dWUoe1xuICAgICAgICB0ZW1wbGF0ZToge1xuICAgICAgICAgIGNvbXBpbGVyT3B0aW9uczoge1xuICAgICAgICAgICAgaXNDdXN0b21FbGVtZW50OiAodGFnKSA9PiB0YWcgPT09ICdFcnJvckJvdW5kYXJ5JyxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSksXG5cbiAgICAgIC8vIFBXQVx1RkYxQVx1NzlCQlx1N0VCRlx1NkQ0Qlx1OEJENVx1Njc4NFx1NUVGQVx1NTE3M1x1OTVFRFx1RkYwOHdvcmtib3ggXHU1MkE4XHU2MDAxIHJlcXVpcmUgXHU2MkE1XHU5NTE5XHVGRjFCXHU2RTM4XHU2MjBGXHU5MDNCXHU4RjkxXHU1REYyXHU1MTY4XHU2NzJDXHU1NzMwXHVGRjBDXHU2NUUwXHU5NzAwIFNXXHVGRjA5XG4gICAgICBlbmFibGVQd2EgPyBWaXRlUFdBKHtcbiAgICAgICAgc3RyYXRlZ2llczogJ2luamVjdE1hbmlmZXN0JyxcbiAgICAgICAgc3JjRGlyOiAnc3JjJyxcbiAgICAgICAgZmlsZW5hbWU6ICdzdy50cycsXG4gICAgICAgIGluamVjdE1hbmlmZXN0OiB7XG4gICAgICAgICAgc3dEZXN0OiAnZGlzdC9zdy5qcycsXG4gICAgICAgICAgZ2xvYklnbm9yZXM6IFsnKiovbm9kZV9tb2R1bGVzLyoqJywgJyoqLy4qJ10sXG4gICAgICAgICAgbWF4aW11bUZpbGVTaXplVG9DYWNoZUluQnl0ZXM6IDMgKiAxMDI0ICogMTAyNCxcbiAgICAgICAgfSxcbiAgICAgICAgbWFuaWZlc3Q6IHtcbiAgICAgICAgICBuYW1lOiBlbnYuVklURV9BUFBfVElUTEUgfHwgJ1x1NzA3NVx1NTg4MyBcdTAwQjcgTGluZ0ppbmcnLFxuICAgICAgICAgIHNob3J0X25hbWU6ICdcdTcwNzVcdTU4ODMnLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnXHU0RTFDXHU2NUI5XHU2Q0JCXHU2MTA4IFx1MDBCNyBcdTZDODlcdTZENzhcdTVGMEZcdTRGMTFcdTk1RjJcdTdBN0FcdTk1RjQnLFxuICAgICAgICAgIHRoZW1lX2NvbG9yOiAnI0RFRTVGNScsXG4gICAgICAgICAgYmFja2dyb3VuZF9jb2xvcjogJyNERUU1RjUnLFxuICAgICAgICAgIGRpc3BsYXk6ICdzdGFuZGFsb25lJyxcbiAgICAgICAgICBvcmllbnRhdGlvbjogJ3BvcnRyYWl0JyxcbiAgICAgICAgICBzY29wZTogJy8nLFxuICAgICAgICAgIHN0YXJ0X3VybDogJy8/dXRtX3NvdXJjZT1wd2EnLFxuICAgICAgICAgIGljb25zOiBbXG4gICAgICAgICAgICB7IHNyYzogJy9pY29ucy9pY29uLTE5MngxOTIucG5nJywgc2l6ZXM6ICcxOTJ4MTkyJywgdHlwZTogJ2ltYWdlL3BuZycsIHB1cnBvc2U6ICdhbnknIH0sXG4gICAgICAgICAgICB7IHNyYzogJy9pY29ucy9pY29uLTUxMng1MTIucG5nJywgc2l6ZXM6ICc1MTJ4NTEyJywgdHlwZTogJ2ltYWdlL3BuZycsIHB1cnBvc2U6ICdhbnknIH0sXG4gICAgICAgICAgICB7IHNyYzogJy9pY29ucy9pY29uLTE5MngxOTItbWFza2FibGUucG5nJywgc2l6ZXM6ICcxOTJ4MTkyJywgdHlwZTogJ2ltYWdlL3BuZycsIHB1cnBvc2U6ICdtYXNrYWJsZScgfSxcbiAgICAgICAgICAgIHsgc3JjOiAnL2ljb25zL2ljb24tNTEyeDUxMi1tYXNrYWJsZS5wbmcnLCBzaXplczogJzUxMng1MTInLCB0eXBlOiAnaW1hZ2UvcG5nJywgcHVycG9zZTogJ21hc2thYmxlJyB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGRldk9wdGlvbnM6IHsgZW5hYmxlZDogZmFsc2UsIHR5cGU6ICdtb2R1bGUnLCBuYXZpZ2F0ZUZhbGxiYWNrOiAnaW5kZXguaHRtbCcgfSxcbiAgICAgICAgcmVnaXN0ZXJUeXBlOiAnYXV0b1VwZGF0ZScsXG4gICAgICAgIGluamVjdFJlZ2lzdGVyOiAnYXV0bycsXG4gICAgICAgIHdvcmtib3g6IHtcbiAgICAgICAgICBydW50aW1lQ2FjaGluZzogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB1cmxQYXR0ZXJuOiAvXFwuKD86cG5nfGpwZ3xqcGVnfHdlYnB8c3ZnfGdpZikkLyxcbiAgICAgICAgICAgICAgaGFuZGxlcjogJ0NhY2hlRmlyc3QnLFxuICAgICAgICAgICAgICBvcHRpb25zOiB7IGNhY2hlTmFtZTogJ2ltYWdlcy1jYWNoZS12MScsIGV4cGlyYXRpb246IHsgbWF4RW50cmllczogMTAwLCBtYXhBZ2VTZWNvbmRzOiA2MDQ4MDAgfSB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICAgIGNsZWFudXBPdXRkYXRlZENhY2hlczogdHJ1ZSxcbiAgICAgICAgICBza2lwV2FpdGluZzogdHJ1ZSxcbiAgICAgICAgICBjbGllbnRzQ2xhaW06IHRydWUsXG4gICAgICAgICAgbmF2aWdhdGVGYWxsYmFjazogJ2luZGV4Lmh0bWwnLFxuICAgICAgICAgIG5hdmlnYXRlRmFsbGJhY2tEZW55bGlzdDogWy9eXFwvYXBpXFwvLywgL15cXC9hc3NldHNcXC8vXSxcbiAgICAgICAgfSxcbiAgICAgIH0pIDogbnVsbCxcblxuICAgICAgbGVnYWN5KHtcbiAgICAgICAgdGFyZ2V0czogWydkZWZhdWx0cycsICdub3QgSUUgMTEnLCAnY2hyb21lID49IDcwJywgJ3NhZmFyaSA+PSAxMicsICdpT1MgPj0gMTInLCAnYW5kcm9pZCA+PSA3J10sXG4gICAgICAgIG1vZGVyblBvbHlmaWxsczogZmFsc2UsXG4gICAgICAgIHJlbmRlckxlZ2FjeUNodW5rczogdHJ1ZSxcbiAgICAgICAgcG9seWZpbGxzOiBbJ2VzLnByb21pc2UuZmluYWxseScsICdlcy5hcnJheS5mbGF0JywgJ2VzLmFycmF5LmZsYXQtbWFwJywgJ2VzLm9iamVjdC5mcm9tLWVudHJpZXMnXSxcbiAgICAgIH0pLFxuXG4gICAgICBjb21wcmVzc2lvbih7IGFsZ29yaXRobTogJ2d6aXAnLCBleHQ6ICcuZ3onLCB0aHJlc2hvbGQ6IDEwMjQsIGRlbGV0ZU9yaWdpbmFsQXNzZXRzOiBmYWxzZSB9KSxcbiAgICAgIGNvbXByZXNzaW9uKHsgYWxnb3JpdGhtOiAnYnJvdGxpQ29tcHJlc3MnLCBleHQ6ICcuYnInLCB0aHJlc2hvbGQ6IDEwMjQsIGRlbGV0ZU9yaWdpbmFsQXNzZXRzOiBmYWxzZSB9KSxcbiAgICBdLFxuXG4gICAgb3B0aW1pemVEZXBzOiB7XG4gICAgICBpbmNsdWRlOiBbJ3Z1ZScsICd2dWUtcm91dGVyJywgJ3BpbmlhJywgJ2dzYXAnLCAnYXhpb3MnXSxcbiAgICAgIGZvcmNlOiBmYWxzZSxcbiAgICB9LFxuXG4gICAgbG9nTGV2ZWw6IGlzUHJvZCA/ICdlcnJvcicgOiAnaW5mbycsXG4gICAgY2xlYXJTY3JlZW46IHRy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
