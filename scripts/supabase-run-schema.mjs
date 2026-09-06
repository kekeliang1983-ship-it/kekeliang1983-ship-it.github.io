// scripts/supabase-run-schema.mjs —— 本地一键建表（替代在 Dashboard 手动贴 SQL）
// 两种用法（任选其一）：
//   1) 连接串放 .env.local 的 SUPABASE_DB_URI，然后： node scripts/supabase-run-schema.mjs
//   2) 直接传参： node scripts/supabase-run-schema.mjs "postgresql://postgres:密码@db.xxxx.supabase.co:5432/postgres"
//
// ⚠️ SUPABASE_DB_URI 含数据库密码，仅用于本地执行；脚本不会把它写进任何仓库文件，.env.local 已被 git 忽略。
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnvLocal() {
  const out = {};
  try {
    const raw = readFileSync(resolve(root, '.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch { /* ignore */ }
  return out;
}

const argUri = process.argv[2];
const envUri = loadEnvLocal().SUPABASE_DB_URI;
const uri = argUri || envUri;

if (!uri) {
  console.error('❌ 未找到连接串。请把 Database → Connection string → URI 整串放进 .env.local 的 SUPABASE_DB_URI，或作为命令行参数传入。');
  process.exit(1);
}
if (/service_role|role=service_role/i.test(uri)) {
  console.error('❌ 检测到 service_role 连接串，拒绝执行（权限过大不安全）。请改用 postgres 主库 URI。');
  process.exit(1);
}

// 确保 pg 可用
try { require.resolve('pg'); } catch {
  console.log('📦 安装 pg ...');
  execSync('npm i -D pg', { cwd: root, stdio: 'inherit' });
}

const { Client } = await import('pg');
const sql = readFileSync(resolve(root, 'scripts/supabase-schema.sql'), 'utf8');

const client = new Client({ connectionString: uri, ssl: { rejectUnauthorized: false } });
try {
  await client.connect();
  await client.query(sql);
  console.log('✅ 建表完成：drift_bottles / farm_snapshots / farm_visits / race_scores + 3 个 RPC + CHECK 约束');
} catch (e) {
  console.error('❌ 建表失败：', e.message);
  process.exit(1);
} finally {
  await client.end();
}
console.log('下一步：node scripts/sbtest.mjs 跑端到端验证（B2/B3/B4 三套全绿即联机闭环打通）。');
