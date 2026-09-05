// src/constants/bottle.ts —— 情绪瓶公共常量（数值对齐 02-全局核心常量 七、情绪瓶数值表）
// 2026-08-25 拍板：情绪球 6 种扩为 8 种（砍同质化的乐/思/空/涩），仅视觉区分，数值无差异
import type { EmotionType } from '@/types/index';

/** 情绪球 8 种（emoji/主色/浅色 —— 瓶身液色与球体渲染共用） */
export const EMOTIONS: { type: EmotionType; label: string; emoji: string; color: string; light: string }[] = [
  { type: 'joy',      label: '喜', emoji: '😊', color: '#E8B84B', light: '#F7E3B0' }, // 暖金
  { type: 'calm',     label: '静', emoji: '😌', color: '#4FB3A5', light: '#C4EDE6' }, // 青碧
  { type: 'anger',    label: '怒', emoji: '😠', color: '#E06A5A', light: '#F7C9C0' }, // 赤
  { type: 'sorrow',   label: '哀', emoji: '😔', color: '#5B7BD5', light: '#C6D4F5' }, // 靛蓝
  { type: 'surprise', label: '惊', emoji: '😮', color: '#9B6FD1', light: '#DDC9F2' }, // 紫
  { type: 'miss',     label: '念', emoji: '🥰', color: '#C77FA8', light: '#F0CFE2' }, // 藕荷
  { type: 'weary',    label: '倦', emoji: '😮‍💨', color: '#8A7FA6', light: '#D8D2E6' }, // 灰紫
  { type: 'hope',     label: '盼', emoji: '🤩', color: '#E88A3D', light: '#F8D9BC' }, // 橙
];

export const EMOTION_META: Record<EmotionType, { label: string; emoji: string; color: string; light: string }> =
  Object.fromEntries(EMOTIONS.map((e) => [e.type, { label: e.label, emoji: e.emoji, color: e.color, light: e.light }])) as Record<EmotionType, { label: string; emoji: string; color: string; light: string }>;

/** 满溢「灵光乍现」产出（02-L80：灵珠30 + 魔丸10，30% 额外天玑1） */
export const BOTTLE_OVERFLOW = { pearl: 30, magic: 10, jadeChance: 0.3 } as const;

/** 小三元彩蛋（02-L82：当日 3 颗同表情 → 返还 1 次投入次数） */
export const TRIPLE_LABEL = '小三元';

/**
 * 小三元触发概率（2026-09-02 重做）
 * 旧实现 8 种等概率随机 3 颗 → 3 颗全同概率仅 (1/8)² = 1/64 ≈ 1.56%/天（约 64 天一次），彩蛋实质死亡。
 * 新机制「今日主题情绪」：先抽一个主题情绪，保证 3 颗中至少 2 颗是它（让「再收 1 颗就触发」的期待真实存在），
 * 第 3 颗有 TRIPLE_THEME_CHANCE 概率同为主题（即当天直接触发）。触发率 ≈ 35%/天，可感知又不泛滥。
 */
export const TRIPLE_THEME_CHANCE = 0.35;

/**
 * 中途「小灵光」档位（2026-09-02 新增）
 * 旧版 30 颗容量 ÷ 每天 3 颗 = 满溢要 10 天，中间零反馈，长跑无感。
 * 每投满 10 / 20 颗自动给一次小额反馈，把 10 天空窗切成 3 段，避免「只等终点」的枯燥。
 */
export const BOTTLE_MILESTONES = [
  { at: 10, pearl: 5, mood: 3, text: '瓶底泛起微光，心事开始有了形状' },
  { at: 20, pearl: 8, mood: 3, text: '液面已过半，你与自己又近了一点' },
] as const;

/** 随机生成今日 3 颗情绪球（今日主题情绪机制：保证至少 2 颗同款） */
export function rollTodayBalls(): EmotionType[] {
  const pool = EMOTIONS.map((e) => e.type);
  const theme = pool[Math.floor(Math.random() * pool.length)];
  const third = Math.random() < TRIPLE_THEME_CHANCE
    ? theme
    : pool[Math.floor(Math.random() * pool.length)];
  const balls: EmotionType[] = [theme, theme, third];
  // 洗牌：让同款出现在不同位置，制造「连收」的节奏与悬念（触发与否只看 3 颗是否全同，与顺序无关）
  for (let i = balls.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [balls[i], balls[j]] = [balls[j], balls[i]];
  }
  return balls;
}

/** 距次日 0 点的剩余毫秒 */
export function msUntilMidnight(): number {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.getTime() - now.getTime();
}

/** 毫秒 → 「X小时Y分」（今日刷新倒计时展示） */
export function fmtCountdown(ms: number): string {
  const mins = Math.floor(ms / 60000);
  return mins >= 60 ? `${Math.floor(mins / 60)} 小时 ${mins % 60} 分` : `${mins} 分`;
}
