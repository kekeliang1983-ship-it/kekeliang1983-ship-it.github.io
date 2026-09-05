// src/services/supabase.ts —— 联机后端接入层（Supabase）
// 设计原则：缺省配置 / 离线 / 出错时整体降级为「本地模式」，绝不阻断主流程。
// B2 漂流瓶用它做「真·跨用户投递」：放流推入公共瓶海，捞起随机取他人瓶子。
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** 是否配置了 Supabase（缺任一即为本地模式，UI 与逻辑自动降级） */
export const isSupabaseEnabled = Boolean(url && anon);

/** 全局唯一客户端；未配置时为 null */
export const supabase: SupabaseClient | null = isSupabaseEnabled
  ? createClient(url as string, anon as string)
  : null;

/** 给 Promise 加超时，避免网络抽风时卡住 UI（超时返回 null → 本地兜底） */
function withTimeout<T>(p: Promise<T>, ms = 4500): Promise<T | null> {
  return Promise.race<T | null>([
    p,
    new Promise<T | null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

type DriftRowRes = { data: { emotion: string; text: string } | null; error: { message: string } | null };

/** 放流：把瓶子推入公共瓶海（best-effort，失败静默，不阻塞放流回执） */
export async function pushDriftToCloud(emotion: string, text: string): Promise<void> {
  if (!supabase) return;
  try {
    await withTimeout(supabase.from('drift_bottles').insert({ emotion, text }) as unknown as Promise<unknown>);
  } catch (e) {
    console.warn('[supabase] 放流失败', e);
  }
}

/** 捞起：从公共瓶海随机取一只他人瓶子；无网 / 空海 / 出错 / 超时都返回 null（交由本地兜底） */
export async function fetchRandomDriftFromCloud(): Promise<{ emotion: string; text: string } | null> {
  if (!supabase) return null;
  try {
    const res = (await withTimeout(
      supabase.rpc('random_bottle').maybeSingle() as unknown as Promise<DriftRowRes>,
    )) as DriftRowRes | null;
    if (!res) return null; // 超时
    if (res.error) {
      console.warn('[supabase] 捞瓶失败', res.error.message);
      return null;
    }
    if (!res.data) return null; // 瓶海空
    return { emotion: res.data.emotion, text: res.data.text };
  } catch (e) {
    console.warn('[supabase] 捞瓶异常', e);
    return null;
  }
}

// ============================================================
// B3 访友（邻圃）：匿名玩家防御快照 + 真实借产
// ============================================================

/** 持久化匿名指纹：每台设备一份，作为 farm_snapshots 主键（不暴露任何个人信息） */
const FP_KEY = 'cc_farm_fp';
export function getOrCreateFingerprint(): string {
  try {
    let fp = localStorage.getItem(FP_KEY);
    if (!fp) {
      fp = (crypto.randomUUID?.() ?? `fp_${Date.now()}_${Math.random().toString(36).slice(2)}`);
      localStorage.setItem(FP_KEY, fp);
    }
    return fp;
  } catch {
    return `fp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }
}

/** 邻圃玩家（来自他人上传的防御快照） */
export interface FarmFriend {
  fingerprint: string;
  level: number;
  amuletLevel: number;
  amuletEquipped: boolean;
}

/** 上传自己的防御快照（等级 + 结界符状态），供他人来访时计算减借 */
export async function uploadFarmSnapshot(level: number, amuletLevel: number, amuletEquipped: boolean): Promise<void> {
  if (!supabase) return;
  const fp = getOrCreateFingerprint();
  try {
    await withTimeout(
      supabase
        .from('farm_snapshots')
        .upsert({ fingerprint: fp, level, amulet_level: amuletLevel, amulet_equipped: amuletEquipped }) as unknown as Promise<unknown>,
    );
  } catch (e) {
    console.warn('[supabase] 快照上传失败', e);
  }
}

/** 随机拉取若干邻圃玩家（排除自己）；无网/出错/超时返回 null（交由本地桩兜底） */
export async function fetchRandomFarmFriends(limit = 6): Promise<FarmFriend[] | null> {
  if (!supabase) return null;
  const fp = getOrCreateFingerprint();
  try {
    const res = (await withTimeout(
      supabase.rpc('random_farm_snapshots', { p_limit: limit, p_exclude: fp }) as unknown as Promise<{
        data: Array<{ fingerprint: string; level: number; amulet_level: number; amulet_equipped: boolean }> | null;
        error: { message: string } | null;
      }>,
    )) as { data: Array<{ fingerprint: string; level: number; amulet_level: number; amulet_equipped: boolean }> | null; error: { message: string } | null } | null;
    if (!res) return null; // 超时
    if (res.error) {
      console.warn('[supabase] 拉邻圃失败', res.error.message);
      return null;
    }
    return (res.data || []).map((r) => ({
      fingerprint: r.fingerprint,
      level: r.level,
      amuletLevel: r.amulet_level,
      amuletEquipped: r.amulet_equipped,
    }));
  } catch (e) {
    console.warn('[supabase] 拉邻圃异常', e);
    return null;
  }
}

/** 记录一次拜访（best-effort，用于统计/未来防刷） */
export async function recordFarmVisit(visitorFingerprint: string, hostFingerprint: string, borrowedPct: number): Promise<void> {
  if (!supabase) return;
  try {
    await withTimeout(
      supabase
        .from('farm_visits')
        .insert({ visitor_fp: visitorFingerprint, host_fp: hostFingerprint, borrowed_pct: borrowedPct }) as unknown as Promise<unknown>,
    );
  } catch (e) {
    console.warn('[supabase] 记录拜访失败', e);
  }
}

// ============================================================
// B4 竞速异步成绩榜（方案甲）：上传成绩 + 拉取他人最佳成绩
// ============================================================

/** 联机榜上的对手（他人在「当前赛道」的最佳成绩） */
export interface RaceOpponent {
  fingerprint: string;
  timeMs: number;
  petElement: string;
}

/** 上传自己的一局成绩（best-effort，写入后由 best_race_opponents 聚合最佳） */
export async function uploadRaceScore(trackId: string, weatherId: string, timeMs: number, petElement: string): Promise<void> {
  if (!supabase) return;
  try {
    await withTimeout(
      supabase
        .from('race_scores')
        .insert({
          fingerprint: getOrCreateFingerprint(),
          track_id: trackId,
          weather_id: weatherId,
          time_ms: Math.round(timeMs),
          pet_element: petElement,
        }) as unknown as Promise<unknown>,
    );
  } catch (e) {
    console.warn('[supabase] 成绩上传失败', e);
  }
}

/** 拉取「当前赛道」上其他玩家的最佳成绩（排除自己）；无网/出错/超时返回 null（本地兜底） */
export async function fetchRaceOpponents(trackId: string, limit = 5): Promise<RaceOpponent[] | null> {
  if (!supabase) return null;
  const fp = getOrCreateFingerprint();
  try {
    const res = (await withTimeout(
      supabase.rpc('best_race_opponents', { p_track: trackId, p_exclude: fp, p_limit: limit }) as unknown as Promise<{
        data: Array<{ fingerprint: string; time_ms: number; pet_element: string }> | null;
        error: { message: string } | null;
      }>,
    )) as { data: Array<{ fingerprint: string; time_ms: number; pet_element: string }> | null; error: { message: string } | null } | null;
    if (!res) return null; // 超时
    if (res.error) {
      console.warn('[supabase] 拉榜失败', res.error.message);
      return null;
    }
    return (res.data || []).map((r) => ({ fingerprint: r.fingerprint, timeMs: r.time_ms, petElement: r.pet_element }));
  } catch (e) {
    console.warn('[supabase] 拉榜异常', e);
    return null;
  }
}
