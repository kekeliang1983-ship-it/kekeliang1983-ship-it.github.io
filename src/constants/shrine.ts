/**
 * src/constants/shrine.ts —— 神龛配置（02-全局核心常量 三、神龛数值表）
 * 机制：摆放供品(消耗货币) → 长按3秒点燃 → 获得神恩Buff（全资源产出增益）
 * 同一时间仅生效最高等级的香火效果（02-L35）
 */
import type { IncenseType } from '@/types/index';

/** 三档香品（02-L37~41） */
export interface IncenseCfg {
  type: IncenseType;
  name: string;
  emoji: string;
  cost: { currency: 'gold' | 'pearl' | 'magic'; amount: number };
  durationHours: number;
  buff: number;          // 全资源产出增益
  desc: string;
  special?: string;      // 特殊附加说明
  refundRate?: number;   // 檀香 10% 概率返还消耗
}

export const INCENSE_LIST: IncenseCfg[] = [
  {
    type: 'incense_basic', name: '线香', emoji: '🕯️',
    cost: { currency: 'gold', amount: 5 },
    durationHours: 1, buff: 0.05,
    desc: '神恩 1 小时 · 收益 +5%',
  },
  {
    type: 'incense_mid', name: '檀香', emoji: '🌸',
    cost: { currency: 'pearl', amount: 10 },
    durationHours: 4, buff: 0.15,
    refundRate: 0.1,
    desc: '神恩 4 小时 · 收益 +15%',
    special: '10% 概率返还消耗灵珠',
  },
  {
    type: 'incense_high', name: '龙涎香', emoji: '🐉',
    cost: { currency: 'magic', amount: 8 },
    durationHours: 12, buff: 0.30,
    desc: '神恩 12 小时 · 收益 +30%',
    special: '必得上上签 x1（可兑 20 元宝）',
  },
];

export const INCENSE_META: Record<IncenseType, IncenseCfg> =
  Object.fromEntries(INCENSE_LIST.map((c) => [c.type, c])) as Record<IncenseType, IncenseCfg>;

/**
 * 八神位（01-L49 基础四神 + 2026-08-26 高级四神）
 * 基础四神：上香小馈赠（财神元宝/月老灵珠/文昌魔丸/药王心境，贴合 01-L49 神恩设定）
 * 高级四神：神恩系数（乘香品 buff，封顶 30%×1.4=42% < 45% 红线），按已有进度解锁
 */
export interface DeityCfg {
  id: string;
  name: string;
  emoji: string;
  blessing: string;
  /** 上香成功的小馈赠（基础四神） */
  bonus?: { currency: 'gold' | 'pearl' | 'magic'; amount: number } | { mood: number };
  /** 神恩系数（高级四神，乘在香品 buff 上） */
  mult?: number;
  /** 解锁条件（高级四神；阈值全部取自已有持久化字段，零新增状态） */
  unlock?: { desc: string; incenseCount?: number; overflowCount?: number; jade?: number };
}

export const DEITIES: DeityCfg[] = [
  { id: 'wealth',  name: '财神', emoji: '🧧', blessing: '庇佑元宝盈仓', bonus: { currency: 'gold', amount: 1 } },
  { id: 'love',    name: '月老', emoji: '💞', blessing: '庇佑灵珠生长', bonus: { currency: 'pearl', amount: 1 } },
  { id: 'scholar', name: '文昌', emoji: '📖', blessing: '庇佑魔丸精进', bonus: { currency: 'magic', amount: 1 } },
  { id: 'healer',  name: '药王', emoji: '🌿', blessing: '庇佑心境安宁', bonus: { mood: 2 } },
  { id: 'mystic',    name: '玄女', emoji: '🪷', blessing: '神恩加持 ×1.2', mult: 1.2,
    unlock: { desc: '累计上香 10 次', incenseCount: 10 } },
  { id: 'starlord', name: '星君', emoji: '⭐', blessing: '神恩加持 ×1.2', mult: 1.2,
    unlock: { desc: '情绪瓶满溢 1 次', overflowCount: 1 } },
  { id: 'dragon',   name: '烛龙', emoji: '🐲', blessing: '神恩加持 ×1.4', mult: 1.4,
    unlock: { desc: '累计上香 30 次', incenseCount: 30 } },
  { id: 'queen',    name: '王母', emoji: '👑', blessing: '神恩加持 ×1.4', mult: 1.4,
    unlock: { desc: '天玑≥3 且 满溢≥2', jade: 3, overflowCount: 2 } },
];

export type DeityId = (typeof DEITIES)[number]['id'];
export const DEITY_MAP: Record<string, DeityCfg> =
  Object.fromEntries(DEITIES.map((d) => [d.id, d]));

/** 求签消耗（01-L12：神龛求签消耗 10 点灵气） */
export const FORTUNE_QI_COST = 10;
/** 上香灵气消耗（05-core lightIncense consumeQi(10)） */
export const INCENSE_QI_COST = 10;
/** 上上签兑换价（02-L40：可兑换20元宝） */
export const COUPON_VALUE_GOLD = 20;
/** 每日头香奖励（02-L41：随机货币 x5） */
export const FIRST_INCENSE_REWARD = 5;

/** 签文库（求签随机；上上签可兑奖，其余为心境彩蛋文案） */
export const FORTUNES = [
  { rank: '上上签', text: '紫气东来，万事顺遂', emoji: '🪙' },
  { rank: '上签',   text: '心之所向，皆有回响', emoji: '🎋' },
  { rank: '中签',   text: '静水流深，徐徐图之', emoji: '🍃' },
  { rank: '中签',   text: '不急不躁，自有安排', emoji: '🌾' },
  { rank: '下签',   text: '今日宜静养，莫强求', emoji: '🍂' },
] as const;

/** 今日宜/忌库（按 dayKey 稳定随机，联动各模块） */
export const DAILY_YI = [
  '宜聆听天籁', '宜浇灌灵植', '宜陪伴仙宠', '宜投入情绪球', '宜整理心愿', '宜早些休息',
] as const;
/**
 * 今日宜 → 推荐神位（增强决策感，与黄历稳定联动）
 * 让玩家每天有个"今天该请哪位神"的小理由，提升仪式感与正反馈
 */
export const YI_DEITY: Record<string, DeityId> = {
  '宜聆听天籁': 'scholar',  // 文昌 · 庇佑魔丸精进
  '宜浇灌灵植': 'love',     // 月老 · 庇佑灵珠生长
  '宜陪伴仙宠': 'healer',   // 药王 · 庇佑心境安宁
  '宜投入情绪球': 'healer', // 药王 · 庇佑心境安宁
  '宜整理心愿': 'wealth',   // 财神 · 庇佑元宝盈仓
  '宜早些休息': 'healer',   // 药王 · 庇佑心境安宁
};
export const DAILY_JI = [
  '忌久坐不动', '忌熬夜伤神', '忌心浮气躁', '忌暴饮暴食', '忌埋头苦干', '忌苛责自己',
] as const;

/** 香火光颜色（三档） */
export const INCENSE_GLOW: Record<IncenseType, string> = {
  incense_basic: 'rgba(240, 180, 120, .5)',
  incense_mid: 'rgba(200, 150, 230, .5)',
  incense_high: 'rgba(120, 200, 255, .55)',
};

/** 稳定伪随机（同一天同一盐 → 同一结果，宜/忌不闪烁） */
export function seededPick<T>(arr: readonly T[], salt: string, dayKey: string): T {
  let h = 0;
  const s = dayKey + salt;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return arr[Math.abs(h) % arr.length];
}

export function fmtBuffLeft(expireAt: number): string {
  const left = expireAt - Date.now();
  if (left <= 0) return '';
  const h = Math.floor(left / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  return h > 0 ? `${h}小时${m}分` : `${m}分`;
}
