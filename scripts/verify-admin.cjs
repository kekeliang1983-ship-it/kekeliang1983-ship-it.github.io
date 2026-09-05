// 后台组件渲染验证：用 Vite SSR 在 Node 里真实渲染，捕获模板级运行时错误（如 null.length）。
// 用法：node scripts/verify-admin.cjs
const { createServer } = require('vite');
const { createSSRApp } = require('vue');
const { renderToString } = require('vue/server-renderer');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const contentDir = path.join(root, 'public', 'content');
const readJson = (n) => JSON.parse(fs.readFileSync(path.join(contentDir, n + '.json'), 'utf-8'));

async function render(mod, props) {
  const app = createSSRApp(mod.default, props);
  const html = await renderToString(app);
  return html;
}

async function check(name, modPath, props) {
  try {
    const mod = await vite.ssrLoadModule(modPath);
    const html = await render(mod, props);
    const ok = html && html.length > 0;
    console.log(`  ${ok ? 'OK  ' : 'EMPTY'} ${name}  (${html.length} bytes)`);
    return ok;
  } catch (e) {
    console.log(`  FAIL ${name}  -> ${e && e.message ? e.message.split('\n')[0] : e}`);
    return false;
  }
}

let vite;
(async () => {
  vite = await createServer({
    root,
    logLevel: 'error',
    server: { middlewareMode: true },
    appType: 'custom',
  });

  const gallery = readJson('gallery');
  const allWallpapers = [
    ...(gallery.wallpapers || []),
    ...(gallery.hidden || []).map((w) => ({ ...w, hidden: true })),
  ];
  const normWp = allWallpapers.map((w) => ({ ...w, price: { ...(w.price || {}) } }));
  const banner = readJson('banner');
  const music = readJson('music');
  const normMusic = music.map((t) => ({ ...t, unlockCost: { ...(t.unlockCost || {}) } }));

  let allOk = true;

  console.log('\n[1] 空值容错（模拟父级数据未就绪，这是白屏根因）');
  allOk &= await check('GalleryEditor items=null', '/src/admin/editors/GalleryEditor.vue', { items: null });
  allOk &= await check('BannerEditor  banner=null', '/src/admin/editors/BannerEditor.vue', { banner: null });
  allOk &= await check('MusicEditor   tracks=null', '/src/admin/editors/MusicEditor.vue', { tracks: null });
  allOk &= await check('JsonEditor      data=null', '/src/admin/components/JsonEditor.vue', { data: null, file: 'pet' });
  allOk &= await check('HomeEditor      home=null', '/src/admin/editors/HomeEditor.vue', { home: null });
  allOk &= await check('BannerParticles particles=null', '/src/components/BannerParticles.vue', { particles: null });

  console.log('\n[2] 真实数据渲染');
  allOk &= await check(`GalleryEditor  ${normWp.length} 张壁纸`, '/src/admin/editors/GalleryEditor.vue', { items: normWp });
  allOk &= await check('BannerEditor   真实 banner', '/src/admin/editors/BannerEditor.vue', { banner });
  allOk &= await check(`MusicEditor    ${normMusic.length} 首曲目`, '/src/admin/editors/MusicEditor.vue', { tracks: normMusic });
  allOk &= await check('JsonEditor     真实对象', '/src/admin/components/JsonEditor.vue', { data: { a: 1 }, file: 'pet' });
  const home = readJson('home');
  allOk &= await check(`HomeEditor     ${(home.features || []).length} 个版块`, '/src/admin/editors/HomeEditor.vue', { home });
  const pConf = { enabled: true, type: 'petal', count: 60, maxCount: 150, color: '#fff', color2: '#ffd6e8', sizeMin: 6, sizeMax: 14, speed: 1, direction: 'down', opacity: 0.8, rotate: true, followMouse: false };
  allOk &= await check('BannerParticles petal配置', '/src/components/BannerParticles.vue', { particles: pConf });

  console.log('\n[3] 未规范化数据（编辑器须自愈，不能依赖调用方先规范化）');
  // 曲库 6 首里 4 首没有 unlockCost；壁纸 price 也可能缺失
  allOk &= await check(`MusicEditor    ${music.length} 首原始(缺 unlockCost)`, '/src/admin/editors/MusicEditor.vue', { tracks: music });
  const rawWp = allWallpapers.map((w) => { const c = { ...w }; delete c.price; return c; });
  allOk &= await check(`GalleryEditor  ${rawWp.length} 张(全缺 price)`, '/src/admin/editors/GalleryEditor.vue', { items: rawWp });
  // 空壳 home：三段结构全缺（background/quote/features）——编辑器须自愈出默认 7 项
  allOk &= await check('HomeEditor     空壳对象(三段全缺)', '/src/admin/editors/HomeEditor.vue', { home: {} });
  // 脏数据：features 非数组、icon/cardImage 为 undefined
  allOk &= await check('HomeEditor     脏数据(features非数组)', '/src/admin/editors/HomeEditor.vue', {
    home: { features: 'oops', background: null, quote: null },
  });
  // 旧单对象 banner（缺 slides）：编辑器须自愈成轮播结构
  allOk &= await check('BannerEditor   旧单对象(缺 slides)', '/src/admin/editors/BannerEditor.vue', {
    banner: { titleLines: ['静心探索'], buttonText: '开始探索', bgImage: '' },
  });

  await vite.close();
  console.log(`\n结果：${allOk ? '全部通过 ✅' : '存在失败项 ❌'}`);
  process.exit(allOk ? 0 : 1);
})().catch((e) => {
  console.error('验证脚本异常：', e);
  process.exit(2);
});
