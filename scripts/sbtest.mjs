// scripts/sbtest.mjs —— Supabase 联机链路端到端探针
// 用法：先把 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 写进 .env.local，再 `node scripts/sbtest.mjs`
// 自动读 .env.local（与前端同源），跑通 B2 漂流瓶 / B3 访友邻圃 / B4 竞速榜，验证全链路读写 RPC 正常。
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// —— 极简解析 .env.local（KEY=VALUE，忽略注释/空行，不展开引号）——
function loadEnvLocal() {
  const out = {};
  try {
    const raw = readFileSync(resolve(root, '.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    /* 无 .env.local 时下方会直接判缺 */
  }
  return out;
}

const env = loadEnvLocal();
const url = env.VITE_SUPABASE_URL;
const anon = env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.error('❌ .env.local 缺少 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY，请先配置');
  process.exit(1);
}

const supabase = createClient(url, anon);
const ok = (label, cond, extra = '') => console.log(`${cond ? '✅' : '❌'} ${label}${extra ? ' — ' + extra : ''}`);

async function main() {
  console.log('🔗 Supabase:', url);

  // ===== B2 漂流瓶 =====
  try {
    // 放两只瓶：一只属 probeA（本机），一只属 other（他人）
    await supabase.from('drift_bottles').insert({ emotion: 'calm', text: 'probe-self-' + Date.now(), owner_fingerprint: 'probeA' });
    const ins = await supabase.from('drift_bottles').insert({ emotion: 'joy', text: 'probe-other-' + Date.now(), owner_fingerprint: 'other' });
    ok('B2 放流 insert', !ins.error, ins.error?.message);
    // 捞取时排除 probeA，应拿到他人瓶，验证不会捞回自己
    const { data, error } = await supabase.rpc('random_bottle', { p_exclude: 'probeA' }).maybeSingle();
    ok('B2 捞瓶 random_bottle(p_exclude) 排除自己', !error && !!data && data.owner_fingerprint !== 'probeA', error?.message || (data ? '取到:' + data.text : '空瓶海'));
    await supabase.from('drift_bottles').delete().neq('owner_fingerprint', '__never__');
  } catch (e) {
    ok('B2 漂流瓶', false, String(e));
  }

  // ===== B3 访友邻圃 =====
  try {
    await supabase.from('farm_snapshots').upsert({ fingerprint: 'probeA', level: 3, amulet_level: 1, amulet_equipped: true });
    await supabase.from('farm_snapshots').upsert({ fingerprint: 'probeB', level: 5, amulet_level: 0, amulet_equipped: false });
    const { data, error } = await supabase.rpc('random_farm_snapshots', { p_limit: 5, p_exclude: 'probeA' });
    ok('B3 邻圃 random_farm_snapshots()', !error && Array.isArray(data) && data.length > 0, error?.message || (data || []).map((f) => f.fingerprint).join(','));
    await supabase.from('farm_snapshots').delete().in('fingerprint', ['probeA', 'probeB']);
  } catch (e) {
    ok('B3 访友邻圃', false, String(e));
  }

  // ===== B4 竞速榜 =====
  try {
    await supabase.from('race_scores').insert({ fingerprint: 'probeX', track_id: 'wood', weather_id: 'sunny', time_ms: 21000, pet_element: 'wood' });
    await supabase.from('race_scores').insert({ fingerprint: 'probeY', track_id: 'wood', weather_id: 'sunny', time_ms: 18000, pet_element: 'fire' });
    const { data, error } = await supabase.rpc('best_race_opponents', { p_track: 'wood', p_exclude: 'probeX', p_limit: 5 });
    ok('B4 竞速 best_race_opponents()', !error && Array.isArray(data) && data.length > 0, error?.message || (data || []).map((o) => `${o.fingerprint}:${o.time_ms}`).join(','));
    await supabase.from('race_scores').delete().in('fingerprint', ['probeX', 'probeY']);
  } catch (e) {
    ok('B4 竞速榜', false, String(e));
  }

  console.log('\n完成。全绿即联机闭环打通；任一 ❌ 多为表/RPC 未建或凭证错（回 docs/Supabase建表SQL全集.md §1+§1.5 重建）。');
}

main();
