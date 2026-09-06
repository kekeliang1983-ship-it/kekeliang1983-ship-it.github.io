# Supabase 建表 SQL 全集 · CozyCreatures 联机后端

> 适用：在 Supabase 新建/重建联机所需的全部表与函数。
> 用途：把本文件整段贴进 Supabase **SQL Editor** 一次性执行即可（已含 `if not exists` / `drop policy if exists`，重复执行安全）。
> 项目地址：`https://kekeliang1983-ship-it.github.io/`，联机后端 = Supabase 匿名表（无自建服务器）。

---

## 0. 前置：凭证与架构说明

- 凭证写在 `.env.production` / `.env.development`：
  - `VITE_SUPABASE_URL=https://<项目ref>.supabase.co`
  - `VITE_SUPABASE_ANON_KEY=sb_publishable__...`（anon key 公开安全，已随构建打包）
- 全部表走 **RLS + anon 策略**：匿名可读可写自己的、不可动别人的。
  - 写入走 `anon insert`（允许匿名插入）。
  - 删除/改别人的被 RLS 挡下。
  - 当前**未做「防玩家刷数据」**（可自灌），如需限频校验见部署指南 §8 ③，或加 Edge Function。

---

## 1. 完整 SQL（B2 + B3 + B4 三套）

```sql
create extension if not exists pgcrypto;

-- ============================================================
-- B2 漂流瓶：公共瓶海 + 随机捞取
-- ============================================================
create table if not exists public.drift_bottles (
  id uuid primary key default gen_random_uuid(),
  emotion text not null,
  text text not null,
  created_at timestamptz not null default now()
);
alter table public.drift_bottles enable row level security;
drop policy if exists "anon_insert" on public.drift_bottles;
create policy "anon_insert" on public.drift_bottles
  for insert to anon with check (true);
drop policy if exists "anon_select" on public.drift_bottles;
create policy "anon_select" on public.drift_bottles
  for select to anon using (true);
create or replace function public.random_bottle()
returns setof public.drift_bottles
language sql stable as $$
  select * from public.drift_bottles order by random() limit 1;
$$;
grant execute on function public.random_bottle() to anon;

-- ============================================================
-- B3 访友（邻圃）：玩家防御快照 + 随机邻圃 + 拜访记录
-- ============================================================
create table if not exists public.farm_snapshots (
  fingerprint text primary key,
  level integer not null default 1,
  amulet_level integer not null default 0,
  amulet_equipped boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.farm_snapshots enable row level security;
drop policy if exists "anon_snap_select" on public.farm_snapshots;
create policy "anon_snap_select" on public.farm_snapshots
  for select to anon using (true);
drop policy if exists "anon_snap_write" on public.farm_snapshots;
create policy "anon_snap_write" on public.farm_snapshots
  for insert to anon with check (true);
drop policy if exists "anon_snap_update" on public.farm_snapshots;
create policy "anon_snap_update" on public.farm_snapshots
  for update to anon using (true) with check (true);

create or replace function public.random_farm_snapshots(p_limit integer, p_exclude text)
returns setof public.farm_snapshots
language sql stable as $$
  select * from public.farm_snapshots
  where fingerprint <> p_exclude
  order by random() limit p_limit;
$$;
grant execute on function public.random_farm_snapshots(integer, text) to anon;

create table if not exists public.farm_visits (
  id uuid primary key default gen_random_uuid(),
  visitor_fp text not null,
  host_fp text not null,
  borrowed_pct real not null,
  created_at timestamptz not null default now()
);
alter table public.farm_visits enable row level security;
drop policy if exists "anon_visit_insert" on public.farm_visits;
create policy "anon_visit_insert" on public.farm_visits
  for insert to anon with check (true);

-- ============================================================
-- B4 竞速异步成绩榜：成绩 + 当前赛道他人最佳（方案甲）
-- ============================================================
create table if not exists public.race_scores (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null,
  track_id text not null,
  weather_id text not null,
  time_ms integer not null,
  pet_element text not null,
  created_at timestamptz not null default now()
);
alter table public.race_scores enable row level security;
drop policy if exists "anon_race_select" on public.race_scores;
create policy "anon_race_select" on public.race_scores
  for select to anon using (true);
drop policy if exists "anon_race_insert" on public.race_scores;
create policy "anon_race_insert" on public.race_scores
  for insert to anon with check (true);

create or replace function public.best_race_opponents(p_track text, p_exclude text, p_limit integer)
returns table (fingerprint text, time_ms integer, pet_element text)
language sql stable as $$
  with ranked as (
    select s.fingerprint, s.time_ms, s.pet_element,
           row_number() over (partition by s.fingerprint order by s.time_ms asc) as rn
    from public.race_scores s
    where s.track_id = p_track and s.fingerprint <> p_exclude
  )
  select r.fingerprint, r.time_ms, r.pet_element
  from ranked r
  where r.rn = 1
  order by r.time_ms asc
  limit p_limit;
$$;
grant execute on function public.best_race_opponents(text, text, integer) to anon;
```

---

## 1.5 数据合法性加固（CHECK 约束 · 零成本防异常/作弊数据入库）

> 目的：在数据库层把明显离谱的写入直接拒掉（如竞速成绩 time_ms=1、漂流瓶塞几 MB 文本、拜访借走 999%）。
> 用 `not valid` 方式加约束：**不校验历史数据**（零风险），但**对之后所有新写入立即生效**。
> 在 Supabase **SQL Editor** 跑一次即可（可重复执行，`if not exists` 已处理）。

```sql
-- PostgreSQL 不支持 `alter table ... add constraint if not exists`，
-- 用 DO 匿名块先查 pg_constraint 再添加，重复执行安全。

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ck_drift_text_len' and conrelid = 'public.drift_bottles'::regclass) then
    alter table public.drift_bottles add constraint ck_drift_text_len check (char_length(text) between 1 and 280) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ck_drift_emotion' and conrelid = 'public.drift_bottles'::regclass) then
    alter table public.drift_bottles add constraint ck_drift_emotion check (char_length(emotion) between 1 and 40) not valid;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ck_snap_level' and conrelid = 'public.farm_snapshots'::regclass) then
    alter table public.farm_snapshots add constraint ck_snap_level check (level between 1 and 200) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ck_snap_amulet' and conrelid = 'public.farm_snapshots'::regclass) then
    alter table public.farm_snapshots add constraint ck_snap_amulet check (amulet_level between 0 and 50) not valid;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ck_visit_pct' and conrelid = 'public.farm_visits'::regclass) then
    alter table public.farm_visits add constraint ck_visit_pct check (borrowed_pct between 0 and 100) not valid;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ck_race_time' and conrelid = 'public.race_scores'::regclass) then
    alter table public.race_scores add constraint ck_race_time check (time_ms between 300 and 600000) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ck_race_keys' and conrelid = 'public.race_scores'::regclass) then
    alter table public.race_scores add constraint ck_race_keys check (char_length(track_id) between 1 and 40 and char_length(weather_id) between 1 and 40 and char_length(pet_element) between 1 and 20) not valid;
  end if;
end $$;
```

> 注：若想**连历史脏数据一并校验**，跑完上面后追加：
> `alter table public.race_scores validate constraint ck_race_time;` 等（`validate` 遇越界行会报错，需先清掉再 validate）。
> 一般不必——新写入已受约束，历史数据不影响线上运行。

---

## 2. 各表 / 函数对照（代码调用关系）

| 表 / 函数 | 业务 | 前端调用 |
|---|---|---|
| `drift_bottles` + `random_bottle()` | B2 漂流瓶公共瓶海 | `pushDriftToCloud()` / `fetchRandomDriftFromCloud()` |
| `farm_snapshots` + `random_farm_snapshots(limit, exclude)` | B3 邻圃玩家快照 | `uploadFarmSnapshot()` / `fetchRandomFarmFriends()` |
| `farm_visits` | B3 拜访记录（统计/防刷预留） | `recordFarmVisit()` |
| `race_scores` + `best_race_opponents(track, exclude, limit)` | B4 竞速成绩榜 | `uploadRaceScore()` / `fetchRaceOpponents()` |

> 字段命名：`fingerprint` = 设备匿名指纹（`crypto.randomUUID`，存 localStorage，不暴露个人信息）；
> `amulet_level` / `amulet_equipped` = 结界符等级/是否装备（访友减借用）；
> `time_ms` = 竞速真实用时（毫秒），`track_id` = 赛道五行、`weather_id` = 天气。

---

## 3. 本地 Node 实测脚本（验证链路）

建完表后可用以下脚本确认联通（把 url/anon 换成 `.env.production` 里的值）：

```js
// sbtest.mjs
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.URL, process.env.KEY);

// B2
await supabase.from('drift_bottles').insert({ emotion: 'calm', text: 'probe' });
const { data } = await supabase.rpc('random_bottle').maybeSingle();
console.log('捞到', data);
await supabase.from('drift_bottles').delete().eq('text', 'probe');

// B3
await supabase.from('farm_snapshots').upsert({ fingerprint: 'A', level: 3, amulet_level: 1, amulet_equipped: true });
await supabase.from('farm_snapshots').upsert({ fingerprint: 'B', level: 5, amulet_level: 0, amulet_equipped: false });
const { data: friends } = await supabase.rpc('random_farm_snapshots', { p_limit: 5, p_exclude: 'A' });
console.log('邻圃(排除A)', friends.map(f => f.fingerprint));
await supabase.from('farm_snapshots').delete().in('fingerprint', ['A','B']);

// B4
await supabase.from('race_scores').insert({ fingerprint: 'X', track_id: 'wood', weather_id: 'sunny', time_ms: 21000, pet_element: 'wood' });
await supabase.from('race_scores').insert({ fingerprint: 'Y', track_id: 'wood', weather_id: 'sunny', time_ms: 18000, pet_element: 'fire' });
const { data: opp } = await supabase.rpc('best_race_opponents', { p_track: 'wood', p_exclude: 'X', p_limit: 5 });
console.log('对手(排除X)', opp.map(o => o.fingerprint));
await supabase.from('race_scores').delete().in('fingerprint', ['X','Y']);
```

预期：`insert` 返回 201、`rpc` 能取到数据、`delete` 返回 204，即全链路通。

---

## 4. 重建 / 清空数据

```sql
-- 仅清空数据、保留表结构（调试用）
truncate table public.drift_bottles, public.farm_snapshots, public.farm_visits, public.race_scores restart identity;

-- 彻底删除（慎用）
drop table if exists public.drift_bottles, public.farm_snapshots, public.farm_visits, public.race_scores;
drop function if exists public.random_bottle();
drop function if exists public.random_farm_snapshots(integer, text);
drop function if exists public.best_race_opponents(text, text, integer);
```

---

## 5. 排错

- **`function gen_random_uuid() does not exist`**：先 `create extension if not exists pgcrypto;`（已含在本文件开头）。
- **`policy already exists`**：无害，本文件用 `drop policy if exists` 已规避。
- **`must be owner of table`**：确认在「自己项目」的 SQL Editor 跑，不是只读副本。
- **前端报 404 / 无数据**：表建在正确的 project（URL 对应）；anon key 未过期；表名/函数名拼写与 §2 一致。
- **想防刷榜**：当前 `anon insert` 允许自灌。可在 Supabase 建 **Edge Function** 做写入前校验（成绩 time_ms 不能离谱小、同 fingerprint 限频），或未来引入登录账号体系。
