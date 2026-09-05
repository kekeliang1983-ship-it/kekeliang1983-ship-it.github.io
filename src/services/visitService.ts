// src/services/visitService.ts —— 拜访（邻圃）服务抽象层
// 离线为本地桩（仅友好提示）；联机（Supabase）下真实记录拜访并结算借产奖励。
// 调用方 FarmPage 只需改少量入参，无需关心具体实现。
// 策划 01-L44：访客可借比例由「主人等级抗借」与「主人结界符减借」共同决定，最终比例由调用方算好后传入。

export interface IBorrowResult {
  ok: boolean;                       // 是否真实借到（联机后为 true）
  borrowed: { gold: number; pearl: number; magic: number };
  note: string;                     // 给玩家的反馈文案
}

/** 借产输入：finalPct 已是扣除主人等级抗借 + 结界符减借后的最终可借比例 */
export interface IBorrowInput {
  hostId: number;                   // 本地 UI id（离线用，仅用于 UI 区分）
  hostFingerprint?: string;         // 在线主人指纹（联机记录拜访用）
  ownerLevel: number;               // 主人等级（抗借，已用于算 finalPct）
  finalPct: number;                 // 最终可借比例（百分数，0~100）
  visitorLevel: number;             // 访客等级（奖励缩放）
}

export interface IVisitService {
  /** 向某好友借走成熟作物 */
  borrow(input: IBorrowInput): IBorrowResult;
}

/**
 * 借产奖励基线：随访客等级小幅增长（高等级访客更易"满载而归"），
 * 最终按可借比例折算。纯数值，不依赖后端数据。
 */
export function computeBorrowReward(pct: number, visitorLevel: number): { gold: number; pearl: number; magic: number } {
  const base = { gold: 30, pearl: 14, magic: 6 };
  const scale = 1 + Math.max(0, visitorLevel - 1) * 0.08;
  const f = (Math.max(0, pct) / 100) * scale;
  return {
    gold: Math.max(0, Math.round(base.gold * f)),
    pearl: Math.max(0, Math.round(base.pearl * f)),
    magic: Math.max(0, Math.round(base.magic * f)),
  };
}

/** 单机桩：不产生真实借走，仅返回友好提示，避免"假 BUG"误导玩家 */
class LocalVisitService implements IVisitService {
  borrow(input: IBorrowInput): IBorrowResult {
    return {
      ok: false,
      borrowed: { gold: 0, pearl: 0, magic: 0 },
      note: `联机后将可向 Lv.${input.ownerLevel} 友友借走约 ${input.finalPct}% 产量，敬请期待～`,
    };
  }
}

/** 联机实现：真实结算奖励 + 异步记录拜访（不阻塞 UI） */
class SupabaseVisitService implements IVisitService {
  borrow(input: IBorrowInput): IBorrowResult {
    const reward = computeBorrowReward(input.finalPct, input.visitorLevel);
    if (input.hostFingerprint) {
      // 延迟引用，避免循环 import；运行时注入
      void import('@/services/supabase').then((m) => {
        const fp = m.getOrCreateFingerprint();
        void m.recordFarmVisit(fp, input.hostFingerprint as string, input.finalPct);
      });
    }
    const parts: string[] = [];
    if (reward.gold) parts.push(`+${reward.gold}元宝`);
    if (reward.pearl) parts.push(`+${reward.pearl}灵珠`);
    if (reward.magic) parts.push(`+${reward.magic}魔丸`);
    return {
      ok: true,
      borrowed: reward,
      note: `拜访成功：借走 ${input.finalPct}% 产量 ${parts.join(' ')}`.trim(),
    };
  }
}

// 联机时切换为真实实现（isSupabaseEnabled 由 supabase.ts 依据环境变量决定）
import { isSupabaseEnabled } from '@/services/supabase';
export const visitService: IVisitService = isSupabaseEnabled
  ? new SupabaseVisitService()
  : new LocalVisitService();
