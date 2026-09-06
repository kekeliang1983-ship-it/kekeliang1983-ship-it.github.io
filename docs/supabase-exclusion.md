# Supabase 联机「排除自己」逻辑说明

> 用途：避免以后回看代码时误以为「联机没排除自己」——其实三套玩法都已通过统一的匿名指纹 + `p_exclude` 参数实现自排除。

## 匿名指纹（统一标识）

- 来源：`src/services/supabase.ts` 的 `getOrCreateFingerprint()`，每台设备一份，存 `localStorage['cc_farm_fp']`。
- 作用：作为 `farm_snapshots` / `race_scores` / `drift_bottles` 的归属键，**不暴露任何个人信息**。
- 所有「上传自己数据」与「拉取他人数据」都使用同一个 `fp`，保证自排除能命中。

## 三套玩法的排除逻辑

| 玩法 | 表 | RPC | 排除方式 | 代码位置 |
|---|---|---|---|---|
| 漂流瓶 | `drift_bottles` | `random_bottle(p_exclude)` | `owner_fingerprint is distinct from p_exclude` | `supabase.ts:47` 调、`:28` 上传写 `owner_fingerprint` |
| 访友邻圃 | `farm_snapshots` | `random_farm_snapshots(p_limit, p_exclude)` | `fingerprint is distinct from p_exclude` | `supabase.ts:111` 调、`:98` 上传写 `fingerprint` |
| 竞速榜 | `race_scores` | `best_race_opponents(p_track, p_exclude, p_limit, p_element)` | `fingerprint is distinct from p_exclude` + 可选 `(p_element is null or pet_element = p_element)` | `supabase.ts:184` 调、`:166` 上传写 `fingerprint` |

## 关键约定

1. **全部统一用 `is distinct from` 而非 `<>`**：`NULL` 与空串都安全，与 `random_bottle` 保持一致。
2. **竞速支持同元素匹配**（`p_element`）：前端 `RacePage.openBoard` 传入玩家出战仙宠元素 `selectedEl.value`，只拉同元素对手，竞速更公平；传 `null` 则不限制元素。
3. **建表/改表后必须重跑** `node scripts/supabase-run-schema.mjs`（SQL 用 `create or replace function` + `add column if not exists`，可重复执行）。
4. **降级**：缺 `VITE_SUPABASE_URL` 或网络不可达时，`isSupabaseEnabled=false`，三处均返回 `null`，由本地兜底（暖语库/桩好友/本地对手），主流程不崩。

## 自检

联机打通后跑 `node scripts/sbtest.mjs`，三处探针均已断言「排除自己 / 同元素过滤」：
- B2：`random_bottle(p_exclude:'probeA')` 不应捞回属 `probeA` 的瓶
- B3：`random_farm_snapshots(p_exclude:'probeA')` 不含 `probeA`
- B4：`best_race_opponents(p_exclude:'probeX', p_element:'wood')` 不含 `probeX` 且元素全为 `wood`
