#!/usr/bin/env node
// scripts/publish-content.mjs —— 内容一键发布
//
// 用途：在后台改完内容后，一条命令完成「校验 → 提交 → 推送」，CI 随后自动部署。
// 用法：
//   npm run content:publish                      # 只发布 public/ 下的内容 + 素材
//   npm run content:publish -- --msg "改了公告"   # 自定义提交信息
//   npm run content:publish -- --all             # 连代码改动一起发（谨慎）
//
// 安全设计：
//   1) 先跑 validate-content.mjs，不通过立即中止（线上保持旧版本，不会半吊子）
//   2) 只 stage 检测到的改动文件，不会误把无关文件带上
//   3) 推送前检查远端是否领先，避免覆盖别人/别的机器的提交

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const argv = process.argv.slice(2);
const includeAll = argv.includes('--all');
const msgIdx = argv.indexOf('--msg');
const customMsg = msgIdx >= 0 ? String(argv[msgIdx + 1] || '').trim() : '';
const dryRun = argv.includes('--dry-run'); // 只预览，不提交不推送
const SCOPE = includeAll ? '.' : 'public';

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: root, encoding: 'utf8', ...opts });
  return { ok: r.status === 0, status: r.status, out: `${r.stdout || ''}${r.stderr || ''}`.trim() };
}
const step = (t) => console.log(`\n▶ ${t}`);
const tail = (s, n = 6) => s.split('\n').slice(-n).join('\n');

/* ---------- 1. 内容结构校验（CI 也会跑，本地先拦一道） ---------- */
step('内容结构校验');
const v = run(process.execPath, ['scripts/validate-content.mjs']);
if (v.out) console.log(tail(v.out, 5));
if (!v.ok) {
  console.error('\n❌ 内容校验未通过，已中止发布 —— 线上仍是旧版本，未受影响。');
  process.exit(1);
}
console.log('✅ 内容校验通过');

/* ---------- 2. 检测待发布改动 ---------- */
step(`检测改动（范围：${SCOPE}）`);
const st = run('git', ['status', '--porcelain', '--', SCOPE]);
if (!st.ok) {
  console.error('❌ git status 失败：\n' + st.out);
  process.exit(1);
}
// porcelain 格式：2 位状态 + 空格 + 路径（重命名时是 "R  old -> new"）
const files = st.out
  .split('\n')
  .map((l) => l.trim())
  .filter(Boolean)
  .map((l) => l.slice(3).trim().replace(/^"|"$/g, '').split(' -> ').pop());

if (!files.length) {
  console.log('ℹ️  没有待发布的内容改动，无需操作。');
  process.exit(0);
}
files.forEach((f) => console.log('   · ' + f));

/* ---------- 3. 推送前确认远端没有领先（防覆盖） ---------- */
step('检查远端状态');
run('git', ['fetch', 'origin', 'main']);
const behind = run('git', ['rev-list', '--count', 'HEAD..origin/main']);
if (behind.ok && Number(behind.out) > 0) {
  console.error(`❌ 远端 main 领先你 ${behind.out} 个提交（可能在别的机器改过）。\n   请先执行：git pull --rebase，再重新发布。`);
  process.exit(1);
}
console.log('✅ 远端无领先提交');

/* ---------- 4. 提交 ---------- */
step('提交');
const modules = [
  ...new Set(
    files
      .map((f) => (f.match(/public[/\\]content[/\\]([a-z0-9_-]+)\.json$/i) || [])[1])
      .filter(Boolean),
  ),
];
const msg =
  customMsg ||
  (modules.length ? `content: 更新 ${modules.join(' / ')}` : 'content: 更新内容与素材');

if (dryRun) {
  console.log('\n🔍 演练模式（--dry-run）：不会提交、不会推送');
  console.log('   将提交的文件：\n' + files.map((f) => '     · ' + f).join('\n'));
  console.log('   提交信息：' + msg);
  process.exit(0);
}

const add = run('git', ['add', '--', ...files]);
if (!add.ok) {
  console.error('❌ git add 失败：\n' + add.out);
  process.exit(1);
}
const c = run('git', ['commit', '-m', msg]);
if (!c.ok) {
  console.error('❌ 提交失败：\n' + c.out);
  process.exit(1);
}
console.log('✅ ' + msg);

/* ---------- 5. 推送 ---------- */
step('推送到 origin/main');
const p = run('git', ['push', 'origin', 'main']);
if (!p.ok) {
  console.error('❌ 推送失败：\n' + p.out);
  process.exit(1);
}
console.log(tail(p.out, 3));

console.log('\n🎉 已推送！GitHub Actions 将自动构建部署（约 2–5 分钟）。');
console.log('   查看进度：https://github.com/kekeliang1983-ship-it/kekeliang1983-ship-it.github.io/actions');
console.log('   线上地址：https://kekeliang1983-ship-it.github.io/');
