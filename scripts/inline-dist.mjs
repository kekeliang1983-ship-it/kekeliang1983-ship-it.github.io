// 将 Vite 单文件构建产物（dist 下的 1 个 JS + 1 个 CSS）内联进 index.html，
// 输出自包含的 dist-single/index.html（双击即可用 file:// 打开，无需任何服务器/网络）。
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = resolve(__dirname, '..', 'dist');
const outDir = resolve(__dirname, '..', 'dist-single');
const htmlPath = resolve(dist, 'index.html');

if (!existsSync(htmlPath)) {
  console.error('[inline-dist] 未找到 dist/index.html，请先运行 build:singlefile');
  process.exit(1);
}

let html = readFileSync(htmlPath, 'utf8');

// 1) 去掉 modulepreload（file:// 下会 404，且已内联无需预载）
html = html.replace(/<link[^>]*rel="modulepreload"[^>]*>/g, '');

// 2) 内联样式表
html = html.replace(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (_m, href) => {
  const p = resolve(dist, href.replace(/^\.\//, ''));
  const css = readFileSync(p, 'utf8');
  return `<style>${css}</style>`;
});

// 3) 内联模块脚本（单文件模式下只有一个 main chunk）
html = html.replace(
  /<script[^>]*type="module"[^>]*src="([^"]+)"[^>]*>\s*<\/script>/g,
  (_m, src) => {
    const p = resolve(dist, src.replace(/^\.\//, ''));
    const js = readFileSync(p, 'utf8');
    return `<script type="module">${js}</script>`;
  }
);

mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, 'index.html'), html, 'utf8');

const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(0);
console.log(`[inline-dist] 已生成自包含单文件：dist-single/index.html (${kb} KB)`);
console.log('[inline-dist] 外部 <script src>:', /<script[^>]+src="https?:/.test(html) ? '仍存在!' : '无 ✓');
console.log('[inline-dist] 外部 <link href>:', /<link[^>]+href="https?:/.test(html) ? '仍存在!' : '无 ✓');
