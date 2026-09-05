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
  const isSingle = mode === "singlefile";
  const enablePwa = mode !== "offline" && !isSingle;
  const enableLegacy = !isSingle;
  const enableCompress = !isSingle;
  return {
    base: isSingle ? "./" : "/",
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
      sourcemap: !isProd && !isSingle,
      cssCodeSplit: !isSingle,
      // 单文件版：把所有图片/字体等内联为 base64，彻底无外部资源
      assetsInlineLimit: isSingle ? 1e8 : 4096,
      minify: isProd || isSingle ? "terser" : "esbuild",
      terserOptions: {
        compress: {
          drop_console: isProd,
          drop_debugger: isProd,
          pure_funcs: isProd ? ["console.log", "console.debug"] : []
        },
        format: { comments: false }
      },
      chunkSizeWarningLimit: 1e4,
      rollupOptions: {
        external: [],
        input: { main: resolve(__dirname, "index.html") },
        output: isSingle ? {
          // 单文件：禁用分包 + 内联动态导入，全部打进一个模块文件，便于后续内联进 HTML
          inlineDynamicImports: true,
          entryFileNames: "assets/[name]-[hash].js",
          chunkFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]"
        } : {
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
      // 离线/单文件构建关闭自动清空：绕过环境 safe-delete shim 对 fs.rmSync 的拦截（手动清理一次即可）
      emptyOutDir: !(mode === "offline" || isSingle)
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
      enableLegacy ? legacy({
        targets: ["defaults", "not IE 11", "chrome >= 70", "safari >= 12", "iOS >= 12", "android >= 7"],
        modernPolyfills: false,
        renderLegacyChunks: true,
        polyfills: ["es.promise.finally", "es.array.flat", "es.array.flat-map", "es.object.from-entries"]
      }) : null,
      enableCompress ? compression({ algorithm: "gzip", ext: ".gz", threshold: 1024, deleteOriginalAssets: false }) : null,
      enableCompress ? compression({ algorithm: "brotliCompress", ext: ".br", threshold: 1024, deleteOriginalAssets: false }) : null
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxLRUtFTElBTkdcXFxcV29ya0J1ZGR5XFxcXE5FVyBPQkJcXFxcQ296eUNyZWF0dXJlc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcS0VLRUxJQU5HXFxcXFdvcmtCdWRkeVxcXFxORVcgT0JCXFxcXENvenlDcmVhdHVyZXNcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL0tFS0VMSUFORy9Xb3JrQnVkZHkvTkVXJTIwT0JCL0NvenlDcmVhdHVyZXMvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcsIGxvYWRFbnYsIHR5cGUgQ29uZmlnRW52IH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgdnVlIGZyb20gJ0B2aXRlanMvcGx1Z2luLXZ1ZSc7XG5pbXBvcnQgeyBWaXRlUFdBIH0gZnJvbSAndml0ZS1wbHVnaW4tcHdhJztcbmltcG9ydCBsZWdhY3kgZnJvbSAnQHZpdGVqcy9wbHVnaW4tbGVnYWN5JztcbmltcG9ydCBjb21wcmVzc2lvbiBmcm9tICd2aXRlLXBsdWdpbi1jb21wcmVzc2lvbic7XG5pbXBvcnQgeyByZXNvbHZlLCBkaXJuYW1lIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSAndXJsJztcbmltcG9ydCBhdXRvcHJlZml4ZXIgZnJvbSAnYXV0b3ByZWZpeGVyJztcblxuLy8gRVNNIFx1NkEyMVx1NUYwRlx1NEUwQlx1NjZGRlx1NEVFMyBfX2Rpcm5hbWVcdUZGMDhcdTUzOUYgQ0pTIFx1NTNEOFx1OTFDRlx1RkYwOVxuY29uc3QgX19maWxlbmFtZSA9IGZpbGVVUkxUb1BhdGgoaW1wb3J0Lm1ldGEudXJsKTtcbmNvbnN0IF9fZGlybmFtZSA9IGRpcm5hbWUoX19maWxlbmFtZSk7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9OiBDb25maWdFbnYpID0+IHtcbiAgY29uc3QgZW52ID0gbG9hZEVudihtb2RlLCBwcm9jZXNzLmN3ZCgpLCAnJyk7XG4gIGNvbnN0IGlzUHJvZCA9IG1vZGUgPT09ICdwcm9kdWN0aW9uJztcbiAgY29uc3QgaXNTdGFnaW5nID0gbW9kZSA9PT0gJ3N0YWdpbmcnO1xuICBjb25zdCBpc1NpbmdsZSA9IG1vZGUgPT09ICdzaW5nbGVmaWxlJztcbiAgLy8gXHU3OUJCXHU3RUJGXHU2RDRCXHU4QkQ1XHU2Nzg0XHU1RUZBXHU1MTczXHU5NUVEIFBXQVx1RkYxQXdvcmtib3gtYnVpbGQgXHU1MkE4XHU2MDAxIHJlcXVpcmUgXHU1NzI4XHU3OUJCXHU3RUJGXHU2QTIxXHU1RjBGXHU0RTBCXHU0RjFBXHU2MkE1XHU5NTE5XHVGRjBDXG4gIC8vIFx1ODAwQ1x1NkUzOFx1NjIwRlx1OTAzQlx1OEY5MVx1NURGMlx1NTE2OFx1NjcyQ1x1NTczMFx1RkYwOEdTQVAgXHU1REYyXHU2MjUzXHU1MzA1XHUzMDAxXHU2NUUwIENETiBcdTRGOURcdThENTZcdUZGMDlcdUZGMENcdTY1RTBcdTk3MDAgU2VydmljZSBXb3JrZXIgXHU3RjEzXHU1QjU4XHU1MzczXHU1M0VGXHU3OUJCXHU3RUJGXHU4RkQwXHU4ODRDXG4gIGNvbnN0IGVuYWJsZVB3YSA9IG1vZGUgIT09ICdvZmZsaW5lJyAmJiAhaXNTaW5nbGU7XG4gIC8vIFx1NTM1NVx1NjU4N1x1NEVGNlx1NzI0OFx1NTE3M1x1OTVFRCBsZWdhY3kvY29tcHJlc3Npb25cdUZGMDhcdTRGMUFcdTRFMEUgaW5saW5lRHluYW1pY0ltcG9ydHMgXHU1MUIyXHU3QTgxXHVGRjBDXHU0RTE0XHU1MzU1XHU2NTg3XHU0RUY2XHU0RTBEXHU5NzAwXHU4OTgxXHVGRjA5XG4gIGNvbnN0IGVuYWJsZUxlZ2FjeSA9ICFpc1NpbmdsZTtcbiAgY29uc3QgZW5hYmxlQ29tcHJlc3MgPSAhaXNTaW5nbGU7XG5cbiAgcmV0dXJuIHtcbiAgICBiYXNlOiBpc1NpbmdsZSA/ICcuLycgOiAnLycsXG4gICAgcHVibGljRGlyOiAncHVibGljJyxcblxuICAgIHJlc29sdmU6IHtcbiAgICAgIGFsaWFzOiB7XG4gICAgICAgICdAJzogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMnKSxcbiAgICAgICAgJ0Bjb21wb25lbnRzJzogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvY29tcG9uZW50cycpLFxuICAgICAgICAnQGNvcmUnOiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy9jb3JlJyksXG4gICAgICAgICdAc3RvcmVzJzogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvc3RvcmVzJyksXG4gICAgICAgICdAYXNzZXRzJzogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvYXNzZXRzJyksXG4gICAgICAgICdAdHlwZXMnOiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy90eXBlcycpLFxuICAgICAgICAnQHN0eWxlcyc6IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjL3N0eWxlcycpLFxuICAgICAgICAnQHZpZXdzJzogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvdmlld3MnKSxcbiAgICAgIH0sXG4gICAgfSxcblxuICAgIGNzczoge1xuICAgICAgcG9zdGNzczoge1xuICAgICAgICBwbHVnaW5zOiBbYXV0b3ByZWZpeGVyIGFzIGFueV0sXG4gICAgICB9LFxuICAgIH0sXG5cbiAgICBzZXJ2ZXI6IHtcbiAgICAgIHBvcnQ6IDUxNzMsXG4gICAgICBob3N0OiB0cnVlLFxuICAgICAgc3RyaWN0UG9ydDogZmFsc2UsXG4gICAgICBwcm94eToge1xuICAgICAgICAnL2FwaSc6IHtcbiAgICAgICAgICB0YXJnZXQ6IGVudi5WSVRFX0FQSV9CQVNFX1VSTCB8fCAnaHR0cDovL2xvY2FsaG9zdDozMDAwJyxcbiAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgaG1yOiB7IG92ZXJsYXk6IHRydWUsIHByb3RvY29sOiAnd3MnIH0sXG4gICAgICB3YXJtdXA6IHsgY2xpZW50RmlsZXM6IFsnLi9zcmMvQXBwLnZ1ZScsICcuL3NyYy9tYWluLnRzJ10gfSxcbiAgICB9LFxuXG4gICAgcHJldmlldzogeyBwb3J0OiA0MTczLCBob3N0OiB0cnVlIH0sXG5cbiAgICBidWlsZDoge1xuICAgICAgdGFyZ2V0OiAnZXMyMDIwJyxcbiAgICAgIG91dERpcjogJ2Rpc3QnLFxuICAgICAgYXNzZXRzRGlyOiAnYXNzZXRzJyxcbiAgICAgIHNvdXJjZW1hcDogIWlzUHJvZCAmJiAhaXNTaW5nbGUsXG4gICAgICBjc3NDb2RlU3BsaXQ6ICFpc1NpbmdsZSxcbiAgICAgIC8vIFx1NTM1NVx1NjU4N1x1NEVGNlx1NzI0OFx1RkYxQVx1NjI4QVx1NjI0MFx1NjcwOVx1NTZGRVx1NzI0Ny9cdTVCNTdcdTRGNTNcdTdCNDlcdTUxODVcdTgwNTRcdTRFM0EgYmFzZTY0XHVGRjBDXHU1RjdCXHU1RTk1XHU2NUUwXHU1OTE2XHU5MEU4XHU4RDQ0XHU2RTkwXG4gICAgICBhc3NldHNJbmxpbmVMaW1pdDogaXNTaW5nbGUgPyAxMDBfMDAwXzAwMCA6IDQwOTYsXG4gICAgICBtaW5pZnk6IChpc1Byb2QgfHwgaXNTaW5nbGUpID8gJ3RlcnNlcicgOiAnZXNidWlsZCcsXG4gICAgICB0ZXJzZXJPcHRpb25zOiB7XG4gICAgICAgIGNvbXByZXNzOiB7XG4gICAgICAgICAgZHJvcF9jb25zb2xlOiBpc1Byb2QsXG4gICAgICAgICAgZHJvcF9kZWJ1Z2dlcjogaXNQcm9kLFxuICAgICAgICAgIHB1cmVfZnVuY3M6IGlzUHJvZCA/IFsnY29uc29sZS5sb2cnLCAnY29uc29sZS5kZWJ1ZyddIDogW10sXG4gICAgICAgIH0sXG4gICAgICAgIGZvcm1hdDogeyBjb21tZW50czogZmFsc2UgfSxcbiAgICAgIH0sXG4gICAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDEwMDAwLFxuICAgICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgICBleHRlcm5hbDogW10sXG4gICAgICAgIGlucHV0OiB7IG1haW46IHJlc29sdmUoX19kaXJuYW1lLCAnaW5kZXguaHRtbCcpIH0sXG4gICAgICAgIG91dHB1dDogaXNTaW5nbGVcbiAgICAgICAgICA/IHtcbiAgICAgICAgICAgICAgLy8gXHU1MzU1XHU2NTg3XHU0RUY2XHVGRjFBXHU3OTgxXHU3NTI4XHU1MjA2XHU1MzA1ICsgXHU1MTg1XHU4MDU0XHU1MkE4XHU2MDAxXHU1QkZDXHU1MTY1XHVGRjBDXHU1MTY4XHU5MEU4XHU2MjUzXHU4RkRCXHU0RTAwXHU0RTJBXHU2QTIxXHU1NzU3XHU2NTg3XHU0RUY2XHVGRjBDXHU0RkJGXHU0RThFXHU1NDBFXHU3RUVEXHU1MTg1XHU4MDU0XHU4RkRCIEhUTUxcbiAgICAgICAgICAgICAgaW5saW5lRHluYW1pY0ltcG9ydHM6IHRydWUsXG4gICAgICAgICAgICAgIGVudHJ5RmlsZU5hbWVzOiAnYXNzZXRzL1tuYW1lXS1baGFzaF0uanMnLFxuICAgICAgICAgICAgICBjaHVua0ZpbGVOYW1lczogJ2Fzc2V0cy9bbmFtZV0tW2hhc2hdLmpzJyxcbiAgICAgICAgICAgICAgYXNzZXRGaWxlTmFtZXM6ICdhc3NldHMvW25hbWVdLVtoYXNoXS5bZXh0XScsXG4gICAgICAgICAgICB9XG4gICAgICAgICAgOiB7XG4gICAgICAgICAgICAgIGVudHJ5RmlsZU5hbWVzOiAnYXNzZXRzL1tuYW1lXS1baGFzaF0uanMnLFxuICAgICAgICAgICAgICBjaHVua0ZpbGVOYW1lczogJ2Fzc2V0cy9bbmFtZV0tW2hhc2hdLmpzJyxcbiAgICAgICAgICAgICAgYXNzZXRGaWxlTmFtZXM6ICdhc3NldHMvW25hbWVdLVtoYXNoXS5bZXh0XScsXG4gICAgICAgICAgICAgIG1hbnVhbENodW5rczogKGlkKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvdnVlJykgfHxcbiAgICAgICAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy92dWUtcm91dGVyJykgfHxcbiAgICAgICAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9waW5pYScpKSByZXR1cm4gJ3Z1ZS1jb3JlJztcbiAgICAgICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9nc2FwJykpIHJldHVybiAnZ3NhcCc7XG4gICAgICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvd29ya2JveC0nKSkgcmV0dXJuICd3b3JrYm94JztcbiAgICAgICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcycpKSByZXR1cm4gJ3ZlbmRvcic7XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGV4cGVyaW1lbnRhbE1pbkNodW5rU2l6ZTogMTAwMDAsXG4gICAgICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIC8vIFx1NzlCQlx1N0VCRi9cdTUzNTVcdTY1ODdcdTRFRjZcdTY3ODRcdTVFRkFcdTUxNzNcdTk1RURcdTgxRUFcdTUyQThcdTZFMDVcdTdBN0FcdUZGMUFcdTdFRDVcdThGQzdcdTczQUZcdTU4ODMgc2FmZS1kZWxldGUgc2hpbSBcdTVCRjkgZnMucm1TeW5jIFx1NzY4NFx1NjJFNlx1NjIyQVx1RkYwOFx1NjI0Qlx1NTJBOFx1NkUwNVx1NzQwNlx1NEUwMFx1NkIyMVx1NTM3M1x1NTNFRlx1RkYwOVxuICAgICAgZW1wdHlPdXREaXI6ICEobW9kZSA9PT0gJ29mZmxpbmUnIHx8IGlzU2luZ2xlKSxcbiAgICB9LFxuXG4gICAgcGx1Z2luczogW1xuICAgICAgdnVlKHtcbiAgICAgICAgdGVtcGxhdGU6IHtcbiAgICAgICAgICBjb21waWxlck9wdGlvbnM6IHtcbiAgICAgICAgICAgIGlzQ3VzdG9tRWxlbWVudDogKHRhZykgPT4gdGFnID09PSAnRXJyb3JCb3VuZGFyeScsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0pLFxuXG4gICAgICAvLyBQV0FcdUZGMUFcdTc5QkJcdTdFQkZcdTZENEJcdThCRDVcdTY3ODRcdTVFRkFcdTUxNzNcdTk1RURcdUZGMDh3b3JrYm94IFx1NTJBOFx1NjAwMSByZXF1aXJlIFx1NjJBNVx1OTUxOVx1RkYxQlx1NkUzOFx1NjIwRlx1OTAzQlx1OEY5MVx1NURGMlx1NTE2OFx1NjcyQ1x1NTczMFx1RkYwQ1x1NjVFMFx1OTcwMCBTV1x1RkYwOVxuICAgICAgZW5hYmxlUHdhID8gVml0ZVBXQSh7XG4gICAgICAgIHN0cmF0ZWdpZXM6ICdpbmplY3RNYW5pZmVzdCcsXG4gICAgICAgIHNyY0RpcjogJ3NyYycsXG4gICAgICAgIGZpbGVuYW1lOiAnc3cudHMnLFxuICAgICAgICBpbmplY3RNYW5pZmVzdDoge1xuICAgICAgICAgIHN3RGVzdDogJ2Rpc3Qvc3cuanMnLFxuICAgICAgICAgIGdsb2JJZ25vcmVzOiBbJyoqL25vZGVfbW9kdWxlcy8qKicsICcqKi8uKiddLFxuICAgICAgICAgIG1heGltdW1GaWxlU2l6ZVRvQ2FjaGVJbkJ5dGVzOiAzICogMTAyNCAqIDEwMjQsXG4gICAgICAgIH0sXG4gICAgICAgIG1hbmlmZXN0OiB7XG4gICAgICAgICAgbmFtZTogZW52LlZJVEVfQVBQX1RJVExFIHx8ICdcdTcwNzVcdTU4ODMgXHUwMEI3IExpbmdKaW5nJyxcbiAgICAgICAgICBzaG9ydF9uYW1lOiAnXHU3MDc1XHU1ODgzJyxcbiAgICAgICAgICBkZXNjcmlwdGlvbjogJ1x1NEUxQ1x1NjVCOVx1NkNCQlx1NjEwOCBcdTAwQjcgXHU2Qzg5XHU2RDc4XHU1RjBGXHU0RjExXHU5NUYyXHU3QTdBXHU5NUY0JyxcbiAgICAgICAgICB0aGVtZV9jb2xvcjogJyNERUU1RjUnLFxuICAgICAgICAgIGJhY2tncm91bmRfY29sb3I6ICcjREVFNUY1JyxcbiAgICAgICAgICBkaXNwbGF5OiAnc3RhbmRhbG9uZScsXG4gICAgICAgICAgb3JpZW50YXRpb246ICdwb3J0cmFpdCcsXG4gICAgICAgICAgc2NvcGU6ICcvJyxcbiAgICAgICAgICBzdGFydF91cmw6ICcvP3V0bV9zb3VyY2U9cHdhJyxcbiAgICAgICAgICBpY29uczogW1xuICAgICAgICAgICAgeyBzcmM6ICcvaWNvbnMvaWNvbi0xOTJ4MTkyLnBuZycsIHNpemVzOiAnMTkyeDE5MicsIHR5cGU6ICdpbWFnZS9wbmcnLCBwdXJwb3NlOiAnYW55JyB9LFxuICAgICAgICAgICAgeyBzcmM6ICcvaWNvbnMvaWNvbi01MTJ4NTEyLnBuZycsIHNpemVzOiAnNTEyeDUxMicsIHR5cGU6ICdpbWFnZS9wbmcnLCBwdXJwb3NlOiAnYW55JyB9LFxuICAgICAgICAgICAgeyBzcmM6ICcvaWNvbnMvaWNvbi0xOTJ4MTkyLW1hc2thYmxlLnBuZycsIHNpemVzOiAnMTkyeDE5MicsIHR5cGU6ICdpbWFnZS9wbmcnLCBwdXJwb3NlOiAnbWFza2FibGUnIH0sXG4gICAgICAgICAgICB7IHNyYzogJy9pY29ucy9pY29uLTUxMng1MTItbWFza2FibGUucG5nJywgc2l6ZXM6ICc1MTJ4NTEyJywgdHlwZTogJ2ltYWdlL3BuZycsIHB1cnBvc2U6ICdtYXNrYWJsZScgfSxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBkZXZPcHRpb25zOiB7IGVuYWJsZWQ6IGZhbHNlLCB0eXBlOiAnbW9kdWxlJywgbmF2aWdhdGVGYWxsYmFjazogJ2luZGV4Lmh0bWwnIH0sXG4gICAgICAgIHJlZ2lzdGVyVHlwZTogJ2F1dG9VcGRhdGUnLFxuICAgICAgICBpbmplY3RSZWdpc3RlcjogJ2F1dG8nLFxuICAgICAgICB3b3JrYm94OiB7XG4gICAgICAgICAgcnVudGltZUNhY2hpbmc6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdXJsUGF0dGVybjogL1xcLig/OnBuZ3xqcGd8anBlZ3x3ZWJwfHN2Z3xnaWYpJC8sXG4gICAgICAgICAgICAgIGhhbmRsZXI6ICdDYWNoZUZpcnN0JyxcbiAgICAgICAgICAgICAgb3B0aW9uczogeyBjYWNoZU5hbWU6ICdpbWFnZXMtY2FjaGUtdjEnLCBleHBpcmF0aW9uOiB7IG1heEVudHJpZXM6IDEwMCwgbWF4QWdlU2Vjb25kczogNjA0ODAwIH0gfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgICBjbGVhbnVwT3V0ZGF0ZWRDYWNoZXM6IHRydWUsXG4gICAgICAgICAgc2tpcFdhaXRpbmc6IHRydWUsXG4gICAgICAgICAgY2xpZW50c0NsYWltOiB0cnVlLFxuICAgICAgICAgIG5hdmlnYXRlRmFsbGJhY2s6ICdpbmRleC5odG1sJyxcbiAgICAgICAgICBuYXZpZ2F0ZUZhbGxiYWNrRGVueWxpc3Q6IFsvXlxcL2FwaVxcLy8sIC9eXFwvYXNzZXRzXFwvL10sXG4gICAgICAgIH0sXG4gICAgICB9KSA6IG51bGwsXG5cbiAgICAgIGVuYWJsZUxlZ2FjeSA/IGxlZ2FjeSh7XG4gICAgICAgIHRhcmdldHM6IFsnZGVmYXVsdHMnLCAnbm90IElFIDExJywgJ2Nocm9tZSA+PSA3MCcsICdzYWZhcmkgPj0gMTInLCAnaU9TID49IDEyJywgJ2FuZHJvaWQgPj0gNyddLFxuICAgICAgICBtb2Rlcm5Qb2x5ZmlsbHM6IGZhbHNlLFxuICAgICAgICByZW5kZXJMZWdhY3lDaHVua3M6IHRydWUsXG4gICAgICAgIHBvbHlmaWxsczogWydlcy5wcm9taXNlLmZpbmFsbHknLCAnZXMuYXJyYXkuZmxhdCcsICdlcy5hcnJheS5mbGF0LW1hcCcsICdlcy5vYmplY3QuZnJvbS1lbnRyaWVzJ10sXG4gICAgICB9KSA6IG51bGwsXG5cbiAgICAgIGVuYWJsZUNvbXByZXNzID8gY29tcHJlc3Npb24oeyBhbGdvcml0aG06ICdnemlwJywgZXh0OiAnLmd6JywgdGhyZXNob2xkOiAxMDI0LCBkZWxldGVPcmlnaW5hbEFzc2V0czogZmFsc2UgfSkgOiBudWxsLFxuICAgICAgZW5hYmxlQ29tcHJlc3MgPyBjb21wcmVzc2lvbih7IGFsZ29yaXRobTogJ2Jyb3RsaUNvbXByZXNzJywgZXh0OiAnLmJyJywgdGhyZXNob2xkOiAxMDI0LCBkZWxldGVPcmlnaW5hbEFzc2V0czogZmFsc2UgfSkgOiBudWxsLFxuICAgIF0sXG5cbiAgICBvcHRpbWl6ZURlcHM6IHtcbiAgICAgIGluY2x1ZGU6IFsndnVlJywgJ3Z1ZS1yb3V0ZXInLCAncGluaWEnLCAnZ3NhcCcsICdheGlvcyddLFxuICAgICAgZm9yY2U6IGZhbHNlLFxuICAgIH0sXG5cbiAgICBsb2dMZXZlbDogaXNQcm9kID8gJ2Vycm9yJyA6ICdpbmZvJyxcbiAgICBjbGVhclNjcmVlbjogdHJ1ZSxcbiAgfTtcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFzVixTQUFTLGNBQWMsZUFBK0I7QUFDNVksT0FBTyxTQUFTO0FBQ2hCLFNBQVMsZUFBZTtBQUN4QixPQUFPLFlBQVk7QUFDbkIsT0FBTyxpQkFBaUI7QUFDeEIsU0FBUyxTQUFTLGVBQWU7QUFDakMsU0FBUyxxQkFBcUI7QUFDOUIsT0FBTyxrQkFBa0I7QUFQOEwsSUFBTSwyQ0FBMkM7QUFVeFEsSUFBTSxhQUFhLGNBQWMsd0NBQWU7QUFDaEQsSUFBTSxZQUFZLFFBQVEsVUFBVTtBQUdwQyxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssTUFBaUI7QUFDbkQsUUFBTSxNQUFNLFFBQVEsTUFBTSxRQUFRLElBQUksR0FBRyxFQUFFO0FBQzNDLFFBQU0sU0FBUyxTQUFTO0FBQ3hCLFFBQU0sWUFBWSxTQUFTO0FBQzNCLFFBQU0sV0FBVyxTQUFTO0FBRzFCLFFBQU0sWUFBWSxTQUFTLGFBQWEsQ0FBQztBQUV6QyxRQUFNLGVBQWUsQ0FBQztBQUN0QixRQUFNLGlCQUFpQixDQUFDO0FBRXhCLFNBQU87QUFBQSxJQUNMLE1BQU0sV0FBVyxPQUFPO0FBQUEsSUFDeEIsV0FBVztBQUFBLElBRVgsU0FBUztBQUFBLE1BQ1AsT0FBTztBQUFBLFFBQ0wsS0FBSyxRQUFR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
