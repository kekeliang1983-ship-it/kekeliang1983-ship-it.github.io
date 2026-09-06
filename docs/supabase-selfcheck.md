# Supabase 联机自检清单（本地）

> 用途：配好 `.env.local` 的 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` 并建表后，
> 在**你本机**逐项确认"真联机"已打通。沙箱代理封锁了项目子域，故无法远程替你验，本清单给你对照跑。

## 前置
- `.env.local` 已含这两行（anon key，非 service_role）：
  ```
  VITE_SUPABASE_URL=https://你的项目.supabase.co
  VITE_SUPABASE_ANON_KEY=eyJ...
  ```
- 云端已建表（4 表 + 3 函数 + CHECK）。建表二选一：
  - 浏览器：Dashboard → SQL Editor 贴 `scripts/supabase-schema.sql` 跑一次；
  - 或本机：`node scripts/supabase-run-schema.mjs`（需 `.env.local` 加 `SUPABASE_DB_URI=` 或传参）。

## 步骤
- [ ] **1. 重启 dev**：Vite 不会热加载 `.env.local` 新增键，先停掉再 `npm run dev`。
      地址固定 `http://127.0.0.1:5173/`（用 127.0.0.1 防 IPv6）。
- [ ] **2. 控制台确认开关**：浏览器 F12 → Console，确认
      `import.meta.env.VITE_SUPABASE_URL` 非空、`isSupabaseEnabled === true`
      （为 false 说明 anon key/URL 没读进，回去查第 1 步重启）。
- [ ] **3. 跑端到端探针**：本机项目目录
      ```
      node scripts/sbtest.mjs
      ```
      期望 B2 漂流瓶 / B3 访友邻圃 / B4 竞速榜 三套全 ✅（各含 insert→rpc→delete 自清理）。
- [ ] **4. 进游戏实测**：
  - 竞速：开局后能拉到他人成绩（非只剩本地 BOT）；
  - 漂流瓶：能捞到跨用户瓶（非永远本地池）；
  - 访友：邻圃能拉到他人桩、减借逻辑跑通。
- [ ] **5. 看 Network**：DevTools → Network，竞速/漂流瓶请求打到
      `https://你的项目.supabase.co/rest/v1/...`，返回 2xx 即真联机。

## 常见 ❌ 与对策
| 现象 | 原因 | 对策 |
|---|---|---|
| `isSupabaseEnabled===false` | dev 没重启 / 变量名拼错 | 重启 dev；确认是 `VITE_` 前缀 |
| sbtest 报 `42P01 relation does not exist` | 表没建 | 回去跑 `supabase-schema.sql` |
| sbtest 报 `42501 / permission denied` | RLS 策略没建 | 同上（SQL 含 `enable row level security` + anon 策略） |
| sbtest 报 `fetch failed` / 超时 | 本机网络拦项目域 | 用浏览器/本机跑，勿在沙箱跑 |
| 线上（Pages）仍是本地降级 | 构建机读不到本机 `.env.local` | 部署环境注入 `VITE_SUPABASE_URL`/`ANON_KEY`（另处理） |

## 安全红线
- ❌ 永不用 `service_role` key 进前端或本机脚本（联网即用 anon）。
- ❌ `SUPABASE_DB_URI`（含密码）只本地用，不进仓库（`.env.local` 已被 gitignore）。
- ✅ anon key 是公开前端密钥，进 `.env.local` 安全。
