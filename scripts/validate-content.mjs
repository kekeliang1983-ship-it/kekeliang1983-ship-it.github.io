// 内容层 JSON 合法性 + 结构防护（CI 与本地双跑）
// 目的：后台误改 / 手滑把 content/*.json 写崩时，在部署前拦截，避免线上 App 直接崩。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = path.resolve(__dirname, '../public/content');

const REQUIRED_TOP_KEYS = {
  artifacts: ['params', 'artifacts'],
  banner: ['slides'],
  bottle: ['bottle', 'drift'],
  checkin: ['days', 'milestones'],
  farm: ['elements', 'qualities', 'crops', 'fiveEngender', 'fiveRestrain'],
  gallery: ['wallpapers', 'collections'],
  home: ['background', 'features'],
  music: ['tracks', 'collections'],
  pet: ['elements', 'params', 'pets', 'foods', 'travels'],
  pool: ['avatars', 'names'],
  race: ['baseSpeed', 'maxMs', 'events', 'tracks'],
  shrine: ['params', 'incenses', 'deities', 'fortunes'],
};

const errors = [];
const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.json'));

function walkNaN(obj, where) {
  if (typeof obj === 'number') {
    if (!Number.isFinite(obj)) errors.push(`${where}: 非法数值 ${obj}（NaN/Infinity）`);
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => walkNaN(v, `${where}[${i}]`));
    return;
  }
  if (obj && typeof obj === 'object') {
    for (const k of Object.keys(obj)) walkNaN(obj[k], `${where}.${k}`);
  }
}

function isPlainObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

for (const file of files) {
  const full = path.join(CONTENT_DIR, file);
  let json;
  try {
    json = JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch (e) {
    errors.push(`${file}: JSON 解析失败 — ${e.message}`);
    continue;
  }
  if (!isPlainObject(json)) {
    errors.push(`${file}: 顶层必须是对象（当前为 ${Array.isArray(json) ? '数组' : typeof json}）`);
    continue;
  }
  const req = REQUIRED_TOP_KEYS[file.replace(/\.json$/, '')];
  if (req) {
    for (const k of req) {
      if (!(k in json)) errors.push(`${file}: 缺少必填顶层键 "${k}"`);
    }
  }
  walkNaN(json, file);
}

// —— 少量高价值结构不变式（便宜且能挡住典型误改）——
function get(file, path) {
  const j = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8'));
  return j;
}

try {
  const race = get('race.json');
  if (!(race.baseSpeed > 0)) errors.push('race.json: baseSpeed 必须 > 0');
  if (!(race.maxMs > 0)) errors.push('race.json: maxMs 必须 > 0');
  if (!Array.isArray(race.events) || race.events.length === 0) errors.push('race.json: events 不能为空');
  if (!Array.isArray(race.tracks) || race.tracks.length === 0) errors.push('race.json: tracks 不能为空');
} catch {}

try {
  const farm = get('farm.json');
  if (!Array.isArray(farm.crops)) errors.push('farm.json: crops 必须是数组');
  else farm.crops.forEach((c, i) => {
    if (!isPlainObject(c) || !c.id || !c.element) errors.push(`farm.json: crops[${i}] 缺 id/element`);
  });
} catch {}

try {
  const arts = get('artifacts.json');
  if (!Array.isArray(arts.artifacts)) errors.push('artifacts.json: artifacts 必须是数组');
  else arts.artifacts.forEach((a, i) => {
    if (!isPlainObject(a) || !a.id) errors.push(`artifacts.json: artifacts[${i}] 缺 id`);
    else if (typeof a.multiplier !== 'number') errors.push(`artifacts.json: 法器 ${a.id} 的 multiplier 必须是数字`);
  });
} catch {}

try {
  const bottle = get('bottle.json');
  if (!isPlainObject(bottle.drift) || !Array.isArray(bottle.drift.emotionSet) || bottle.drift.emotionSet.length === 0)
    errors.push('bottle.json: drift.emotionSet 必须是非空数组');
} catch {}

// —— 输出 ——
if (errors.length) {
  console.error('❌ content 校验未通过：');
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log(`✅ content 校验通过：${files.length} 个文件，无结构缺陷`);
