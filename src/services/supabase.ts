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
