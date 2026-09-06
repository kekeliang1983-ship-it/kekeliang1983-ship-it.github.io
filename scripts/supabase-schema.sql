-- scripts/supabase-schema.sql —— CozyCreatures 联机后端建表全集
-- 用法（由 Agent 代执行）：psql "<DB_CONNECTION_STRING>" -f scripts/supabase-schema.sql
-- 已含 if not exists / drop policy if exists / DO 块，可重复执行。
-- 涵盖 B2 漂流瓶 / B3 访友邻圃 / B4 竞速榜，及数据合法性 CHECK 约束。

create extension if not exists pgcrypto;

-- ============================================================
-- B2 漂流瓶：公共瓶海 + 随机捞取
-- ============================================================
create table if not exists public.drift_bottles (
  id uuid primary key default gen_random_uuid(),
  emotion text not null,
  text text not null,
  owner_fingerprint text not null default '',
  created_at timestamptz not null default now()
);
alter table public.drift_bottles enable row level security;
drop policy if exists "anon_insert" on public.drift_bottles;
create policy "anon_insert" on public.drift_bottles for insert to anon with check (true);
drop policy if exists "anon_select" on public.drift_bottles;
create policy "anon_select" on public.drift_bottles for select to anon using (true);
-- 新增 owner_fingerprint 列（老数据默认 ''，不会与本机指纹冲突，安全）
alter table public.drift_bottles add column if not exists owner_fingerprint text not null default '';
create or replace function public.random_bottle(p_exclude text)
returns setof public.drift_bottles language sql stable as $$
  select * from public.drift_bottles
  where owner_fingerprint is distinct from p_exclude
  order by random() limit 1; $$;
grant execute on function public.random_bottle(text) to anon;

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
create policy "anon_snap_select" on public.farm_snapshots for select to anon using (true);
drop policy if exists "anon_snap_write" on public.farm_snapshots;
create policy "anon_snap_write" on public.farm_snapshots for insert to anon with check (true);
drop policy if exists "anon_snap_update" on public.farm_snapshots;
create policy "anon_snap_update" on public.farm_snapshots for update to anon using (true) with check (true);

create or replace function public.random_farm_snapshots(p_limit integer, p_exclude text)
returns setof public.farm_snapshots language sql stable as $$
  select * from public.farm_snapshots where fingerprint is distinct from p_exclude order by random() limit p_limit; $$;
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
create policy "anon_visit_insert" on public.farm_visits for insert to anon with check (true);

-- ============================================================
-- B4 竞速异步成绩榜
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
create policy "anon_race_select" on public.race_scores for select to anon using (true);
drop policy if exists "anon_race_insert" on public.race_scores;
create policy "anon_race_insert" on public.race_scores for insert to anon with check (true);

create or replace function public.best_race_opponents(p_track text, p_exclude text, p_limit integer, p_element text default null)
returns table (fingerprint text, time_ms integer, pet_element text) language sql stable as $$
  with ranked as (
    select s.fingerprint, s.time_ms, s.pet_element,
           row_number() over (partition by s.fingerprint order by s.time_ms asc) as rn
    from public.race_scores s
    where s.track_id = p_track
      and s.fingerprint is distinct from p_exclude
      and (p_element is null or s.pet_element = p_element)
  )
  select r.fingerprint, r.time_ms, r.pet_element from ranked r where r.rn = 1
  order by r.time_ms asc limit p_limit; $$;
grant execute on function public.best_race_opponents(text, text, integer) to anon;

-- ============================================================
-- 数据合法性 CHECK 约束（not valid：不校验历史，对新写入立即生效）
-- ============================================================
do $$ begin
  if not exists (select 1 from pg_constraint where conname='ck_drift_text_len' and conrelid='public.drift_bottles'::regclass) then
    alter table public.drift_bottles add constraint ck_drift_text_len check (char_length(text) between 1 and 280) not valid; end if;
  if not exists (select 1 from pg_constraint where conname='ck_drift_emotion' and conrelid='public.drift_bottles'::regclass) then
    alter table public.drift_bottles add constraint ck_drift_emotion check (char_length(emotion) between 1 and 40) not valid; end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='ck_snap_level' and conrelid='public.farm_snapshots'::regclass) then
    alter table public.farm_snapshots add constraint ck_snap_level check (level between 1 and 200) not valid; end if;
  if not exists (select 1 from pg_constraint where conname='ck_snap_amulet' and conrelid='public.farm_snapshots'::regclass) then
    alter table public.farm_snapshots add constraint ck_snap_amulet check (amulet_level between 0 and 50) not valid; end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='ck_visit_pct' and conrelid='public.farm_visits'::regclass) then
    alter table public.farm_visits add constraint ck_visit_pct check (borrowed_pct between 0 and 100) not valid; end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='ck_race_time' and conrelid='public.race_scores'::regclass) then
    alter table public.race_scores add constraint ck_race_time check (time_ms between 300 and 600000) not valid; end if;
  if not exists (select 1 from pg_constraint where conname='ck_race_keys' and conrelid='public.race_scores'::regclass) then
    alter table public.race_scores add constraint ck_race_keys check (char_length(track_id) between 1 and 40 and char_length(weather_id) between 1 and 40 and char_length(pet_element) between 1 and 20) not valid; end if;
end $$;
