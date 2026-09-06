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

  // —— notices.json 特例：顶层是数组（每条公告一行），不走「顶层必须是对象」校验 ——
  if (file === 'notices.json') {
    if (!Array.isArray(json)) {
      errors.push('notices.json: 顶层必须是数组（每条公告一个对象）');
      continue;
    }
    json.forEach((n, i) => {
      if (!isPlainObject(n)) {
        errors.push(`notices.json[${i}]: 必须是对象`);
        return;
      }
      if (typeof n.id !== 'string' || !n.id) errors.push(`notices.json[${i}]: 缺少字符串字段 id`);
      if (typeof n.title !== 'string') errors.push(`notices.json[${i}]: 缺少字符串字段 title`);
      if (typeof n.body !== 'string') errors.push(`notices.json[${i}]: 缺少字符串字段 body`);
      if (typeof n.pinned !== 'boolean') errors.push(`notices.json[${i}]: 缺少布尔字段 pinned`);
      if (typeof n.createdAt !== 'string' || isNaN(new Date(n.createdAt).getTime()))
        errors.push(`notices.json[${i}]: createdAt 必须是合法 ISO 时间字符串`);
    });
    walkNaN(json, file);
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

// —— 数值范围断言（防后台误改出离谱值；区间保守，不误伤合法数据）——
function inRange(file, where, val, lo, hi, intOk = false) {
  if (typeof val !== 'number' || !Number.isFinite(val)) {
    errors.push(`${file}: ${where} 必须是有限数字（当前 ${val}）`);
    return;
  }
  if (intOk && !Number.isInteger(val)) errors.push(`${file}: ${where} 必须是整数（当前 ${val}）`);
  if (val < lo || val > hi) errors.push(`${file}: ${where}=${val} 超出合理区间 [${lo}, ${hi}]`);
}

try {
  const race = get('race.json');
  inRange('race.json', 'baseSpeed', race.baseSpeed, 0.0001, 10);
  inRange('race.json', 'maxMs', race.maxMs, 1000, 600000, true);
  inRange('race.json', 'cooldownMs', race.cooldownMs ?? 0, 0, 60000, true);
  inRange('race.json', 'dailyFree', race.dailyFree ?? 0, 0, 999, true);
  inRange('race.json', 'paidCost', race.paidCost ?? 0, 0, 9999, true);
  inRange('race.json', 'comboStep', race.comboStep ?? 0, 0, 1);
  inRange('race.json', 'comboMax', race.comboMax ?? 0, 1, 50, true);
  inRange('race.json', 'teamBuffMult', race.teamBuffMult ?? 0, 0.1, 3);
  for (const arr of [race.events, race.targeted]) {
    if (!Array.isArray(arr)) continue;
    arr.forEach((e, i) => {
      inRange(`race.json`, `${arr === race.events ? 'events' : 'targeted'}[${i}].mult`, e.mult, 0.1, 5);
      inRange(`race.json`, `${arr === race.events ? 'events' : 'targeted'}[${i}].durMs`, e.durMs, 100, 10000, true);
      inRange(`race.json`, `${arr === race.events ? 'events' : 'targeted'}[${i}].weight`, e.weight, 1, 100, true);
    });
  }
  (race.tracks || []).forEach((t, i) => {
    inRange('race.json', `tracks[${i}].speedMult`, t.speedMult, 0.1, 5);
    inRange('race.json', `tracks[${i}].eventRateMult`, t.eventRateMult, 0.1, 5);
  });
  (race.weather || []).forEach((w, i) => {
    inRange('race.json', `weather[${i}].speedMult`, w.speedMult, 0.1, 5);
    inRange('race.json', `weather[${i}].eventRateMult`, w.eventRateMult, 0.1, 5);
  });
} catch {}

try {
  const arts = get('artifacts.json');
  (arts.artifacts || []).forEach((a) => {
    if (typeof a.multiplier === 'number')
      inRange('artifacts.json', `法器 ${a.id}.multiplier`, a.multiplier, 0.01, 100);
  });
} catch {}

try {
  const checkin = get('checkin.json');
  (checkin.days || []).forEach((d, i) => {
    for (const cur of ['gold', 'pearl', 'jade']) {
      if (d[cur] != null) inRange('checkin.json', `days[${i}].${cur}`, d[cur], 0, 99999, true);
    }
  });
} catch {}

try {
  const pet = get('pet.json');
  if (pet.params) {
    inRange('pet.json', 'params.travelMs', pet.params.travelMs ?? 0, 1000, 600000, true);
    inRange('pet.json', 'params.travelCost', pet.params.travelCost ?? 0, 0, 99999, true);
  }
} catch {}

// —— 输出 ——
if (errors.length) {
  console.error('❌ content 校验未通过：');
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log(`✅ content 校验通过：${files.length} 个文件，无结构缺陷`);
