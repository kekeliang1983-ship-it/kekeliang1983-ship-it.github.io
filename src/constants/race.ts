// src/constants/race.ts —— 仙宠竞速（赛马式小游戏）核心常量与配置
// 设计内核：派自己的仙宠出战（非博彩），实时赛道动画 + 五行相生相克 + 赛道事件变数 + 末名安慰礼
// 数值均集中此处，便于上线后按数据微调（2026-09-02 拍板方案）
import type { ElementType } from '@/types/index';

/* ====================== 基础配置 ====================== */
/** 每日免费场次（基础能量） */
export const RACE_DAILY_FREE = 5;
/** 免费用完后，每场统一投注（元宝）——用户拍板：固定 15，不递增 */
export const RACE_PAID_COST = 15;
/** 每日最多额外购买场次（付费场硬上限，防通胀） */
export const RACE_PAID_DAILY_LIMIT = 5;
/** 同宠出战冷却（仅防连点，短到无感） */
export const RACE_COOLDOWN_MS = 3000;
/** 基础速度：归一化赛道长度/秒，≈20s 跑完（单局短平快） */
export const RACE_BASE_SPEED = 0.05;
/** 强制结束兜底（防止事件异常卡死）；精彩可接受拉长到 ~30s 一局 */
export const RACE_MAX_MS = 32000;
/** 每日奖励封顶（元宝/灵珠），与免费5场+付费5场的期望产出对齐，防通胀 */
export const RACE_DAILY_GOLD_CAP = 200;
export const RACE_DAILY_PEARL_CAP = 40;

/* ====================== 赛道五行（每日轮换） ====================== */
const TRACK_ORDER: ElementType[] = ['wood', 'fire', 'earth', 'gold', 'water'];
/** 今天赛道属性：按日期轮换（金木水火土各守一天），让"挑对日子出战"成为策略 */
export function getTrackElement(date = new Date()): ElementType {
  const start = Date.UTC(2026, 0, 1);
  const day = Math.floor((date.getTime() - start) / 86400000);
  return TRACK_ORDER[((day % 5) + 5) % 5];
}

/** 五行相生（木→火→土→金→水→木） */
const ENGENDER: Record<ElementType, ElementType> = { wood: 'fire', fire: 'earth', earth: 'gold', gold: 'water', water: 'wood' };
/** 五行相克（木克土、火克金、土克水、金克木、水克火） */
const KE: Record<ElementType, ElementType> = { wood: 'earth', fire: 'gold', earth: 'water', gold: 'wood', water: 'fire' };

/**
 * 宠物五行 vs 赛道五行 的速度系数（赛前可见，构成策略层）：
 * - 同属性：1.0
 * - 顺生（宠物生赛道）：1.12 顺风
 * - 得生（赛道生宠物）：1.06 得助
 * - 势克（宠物克赛道）：1.05 势如破竹
 * - 逆克（赛道克宠物）：0.9 逆风
 */
export function speedFactor(petEl: ElementType, trackEl: ElementType): number {
  if (petEl === trackEl) return 1.0;
  if (ENGENDER[petEl] === trackEl) return 1.12;
  if (ENGENDER[trackEl] === petEl) return 1.06;
  if (KE[petEl] === trackEl) return 1.05;
  return 0.9;
}

/** 系数 → 人类可读标签（赛前提示用） */
export function speedFactorLabel(f: number): string {
  if (f >= 1.12) return '顺生 · 顺风';
  if (f >= 1.06) return '得生 · 相助';
  if (f >= 1.05) return '势克 · 破阵';
  if (f <= 0.9) return '逆克 · 顶风';
  return '平';
}

/* ====================== 赛道事件（变数引擎） ====================== */
export interface RaceEvent {
  id: string;
  emoji: string;
  label: string;
  /** 触发期间速度倍率（<1 减速，>1 加速） */
  mult: number;
  durMs: number;
  /** 抽取权重 */
  weight: number;
}
/** 比赛中随机触发的小事件（作用于自己），实时改写名次 → 永远有"刚才那一波太险了"的谈资 */
export const RACE_EVENTS: RaceEvent[] = [
  { id: 'wind', emoji: '🌬️', label: '御风', mult: 1.35, durMs: 1500, weight: 3 },
  { id: 'cloud', emoji: '☁️', label: '踩云', mult: 0.6, durMs: 1500, weight: 3 },
  { id: 'herb', emoji: '🌿', label: '灵草', mult: 1.22, durMs: 1200, weight: 2 },
  { id: 'fox', emoji: '🦊', label: '绊脚', mult: 0.65, durMs: 1300, weight: 2 },
  { id: 'thunder', emoji: '⚡', label: '雷劫', mult: 0.55, durMs: 1200, weight: 2 },
  { id: 'peach', emoji: '🍑', label: '蟠桃', mult: 1.25, durMs: 1200, weight: 2 },
  { id: 'nap', emoji: '💤', label: '打盹', mult: 0.55, durMs: 1400, weight: 2 },
  { id: 'fire', emoji: '🔥', label: '火遁', mult: 1.3, durMs: 1200, weight: 2 },
  { id: 'whirl', emoji: '🌀', label: '旋风', mult: 0.72, durMs: 1100, weight: 2 },
];

/** 互扔道具事件（作用于「对手」）：制造互坑互保的喜感与激烈感 */
export interface TargetedEvent {
  id: string;
  emoji: string;        // 飞行道具
  label: string;
  /** 命中目标后的速度倍率（<1 砸晕减速，>1 喂加速） */
  mult: number;
  durMs: number;
  weight: number;
  /** 作用目标：当前领先者 / 当前落后者 */
  target: 'leader' | 'tail';
  hitEmoji: string;     // 命中时的反馈气泡（💥 晕 / ✨ 旺）
}
export const RACE_TARGETED: TargetedEvent[] = [
  { id: 'rock', emoji: '🪨', label: '扔石头', mult: 0.5, durMs: 1300, weight: 3, target: 'leader', hitEmoji: '💥' },
  { id: 'candy', emoji: '🍬', label: '喂仙丹', mult: 1.32, durMs: 1300, weight: 3, target: 'tail', hitEmoji: '✨' },
  { id: 'mud', emoji: '💩', label: '甩泥巴', mult: 0.62, durMs: 1200, weight: 2, target: 'leader', hitEmoji: '💫' },
];

/** 体重事件触发节奏（毫秒期望） */
export const RACE_EVENT_EVERY_MS = 1100;
export const RACE_TARGETED_EVERY_MS = 2600;

/* ====================== 名次奖励（末名含安慰礼） ====================== */
export interface RankReward { gold: number; pearl: number; comfort?: boolean }
export const RANK_REWARDS: Record<number, RankReward> = {
  1: { gold: 50, pearl: 5 },
  2: { gold: 30, pearl: 2 },
  3: { gold: 18, pearl: 0 },
  4: { gold: 10, pearl: 0 },
  5: { gold: 5, pearl: 0 },
  6: { gold: 3, pearl: 0, comfort: true }, // 末名安慰：宠物叼回一朵花 + 文案
};
/** 逆袭彩头：实际名次比“预期名次”好 ≥2 位时额外奖励（搬运博彩的“爆冷爽感”） */
export const UPSET_BONUS = { gold: 15 };

/* ====================== 机器人对手（一期全部机器人，山海经风命名不穿帮） ====================== */
/** 与玩家五宠（白泽/夫诸/文鳐/毕方/貔貅）区分开，避免撞名穿帮 */
export const BOT_NAMES = [
  '驺吾', '九尾', '帝江', '穷奇', '梼杌', '饕餮',
  '椒图', '蒲牢', '狻猊', '当康', '英招', '陆吾',
  '开明', '钦原', '蜚', '化蛇', '讹兽', '长右',
];

/* ====================== 末名安慰文案池 ====================== */
const COMFORT_LINES = [
  '虽未夺魁，它叼回一朵野花递给你：「下次一定行！」',
  '垫底的小家伙在路边捡了颗糖，笑盈盈塞进你手心',
  '它慢悠悠晃回来，尾巴尖还沾着草叶，一点也不沮丧',
  '最后一名也值得掌声——它朝你比了个萌萌的爪',
  '它没赢，却带回一片发亮的叶子，说「这个送你当安慰」',
];
export function randomComfortLine(): string {
  return COMFORT_LINES[Math.floor(Math.random() * COMFORT_LINES.length)];
}

/* ====================== 赛道皮肤（视觉 + 全局修正，与五行轮换正交） ====================== */
/** 赛道皮肤：每日按日期轮换，提供主题背景与全局速度/事件节奏修正。纯本地，联机后直接继承。 */
export interface RaceTrackSkin {
  id: string;
  name: string;
  emoji: string;
  /** 赛道卡片主题背景（CSS 背景值）；留空用默认 */
  bg?: string;
  /** 全员速度倍率（雪原全员略慢、星河略快） */
  speedMult: number;
  /** 事件节奏倍率（>1 更密集，雪原更容易翻盘） */
  eventRateMult: number;
}
/** 默认赛道皮肤（4 款轮换；后台 race.json 可改/扩） */
export const RACE_TRACK_SKINS: RaceTrackSkin[] = [
  { id: 'meadow', name: '茸茸草甸', emoji: '🌿', bg: 'linear-gradient(135deg, #eaf6ec, #dcefe6)', speedMult: 1.0, eventRateMult: 1.0 },
  { id: 'snow', name: '落雪原野', emoji: '❄️', bg: 'linear-gradient(135deg, #eef4fb, #dde7f3)', speedMult: 0.92, eventRateMult: 1.4 },
  { id: 'night', name: '樱夜星河', emoji: '🌸', bg: 'linear-gradient(135deg, #2b2440, #3a2f52)', speedMult: 1.05, eventRateMult: 1.0 },
  { id: 'aurora', name: '极光之径', emoji: '🌌', bg: 'linear-gradient(135deg, #1f3a4d, #2a4a6b)', speedMult: 1.1, eventRateMult: 0.85 },
];

/* ====================== 天气系统（每日轮换，全局 buff/debuff） ====================== */
/** 天气：与赛道五行/皮肤正交的第 3 道轮换层，提供全员速度修正与事件节奏修正。 */
export interface RaceWeather {
  id: string;
  name: string;
  emoji: string;
  /** 赛道卡片主题背景（CSS 背景值）；留空用默认 */
  bg?: string;
  /** 全员速度倍率（顺风>1 / 逆风<1） */
  speedMult: number;
  /** 事件节奏倍率（>1 更频繁，如雷暴天天天有事变） */
  eventRateMult: number;
}
/** 默认天气（按日轮换；后台 race.json 可改/扩）。与皮肤错开相位，避免同日同相。 */
export const RACE_WEATHERS: RaceWeather[] = [
  { id: 'sunny', name: '晴空微风', emoji: '🌤️', speedMult: 1.03, eventRateMult: 1.0 },
  { id: 'tailwind', name: '顺风疾驰', emoji: '🌬️', bg: 'linear-gradient(135deg, #dff1ff, #cfe8ff)', speedMult: 1.08, eventRateMult: 1.1 },
  { id: 'drizzle', name: '细雨绵绵', emoji: '🌧️', bg: 'linear-gradient(135deg, #e3eaf0, #d2dbe4)', speedMult: 0.94, eventRateMult: 1.15 },
  { id: 'mist', name: '薄雾朦胧', emoji: '🌫️', speedMult: 1.0, eventRateMult: 0.9 },
  { id: 'storm', name: '雷暴将至', emoji: '⛈️', bg: 'linear-gradient(135deg, #3a3550, #4a4366)', speedMult: 1.05, eventRateMult: 1.3 },
];

/* ====================== 宠物性格（五行 → 性格，稳定无需存储） ====================== */
export type PersonalityId = 'steady' | 'burst' | 'tough' | 'precise' | 'agile';
/** 宠物性格：让「选哪只出战」更具策略，而非只看五行。BOT 同规则按元素分配。 */
export interface PetPersonality {
  id: PersonalityId;
  name: string;
  emoji: string;
  desc: string;
  /** 构建时乘入基础速度（灵动 +3%） */
  baseSpeedMult: number;
  /** 自身增益事件额外加成（爆发：增益 mult ×1.2） */
  selfBuffBonus: number;
  /** 负面自身事件免疫概率 0~1（稳健） */
  negEventImmune: number;
  /** 被道具命中时负面减弱系数（坚韧 <1 减轻减速） */
  hitPenaltyMult: number;
  /** 作为道具来源被选中的权重加成（精准） */
  throwBias: number;
  /** 抛出道具生效强度倍率（精准 >1 更强） */
  throwEffectMult: number;
}
/** 五行 → 性格（稳定映射，玩家拥有不同元素即拥有不同性格，构成出战策略） */
export const PET_PERSONALITY: Record<ElementType, PetPersonality> = {
  wood:  { id: 'steady',  name: '稳健', emoji: '🌿', desc: '三成几率免疫负面事件', baseSpeedMult: 1,    selfBuffBonus: 0,    negEventImmune: 0.3, hitPenaltyMult: 1,   throwBias: 1,   throwEffectMult: 1 },
  fire:  { id: 'burst',   name: '爆发', emoji: '🔥', desc: '增益事件效果 +20%',     baseSpeedMult: 1,    selfBuffBonus: 0.2,  negEventImmune: 0,   hitPenaltyMult: 1,   throwBias: 1,   throwEffectMult: 1 },
  earth: { id: 'tough',   name: '坚韧', emoji: '🛡️', desc: '被命中减速减轻 30%',    baseSpeedMult: 1,    selfBuffBonus: 0,    negEventImmune: 0,   hitPenaltyMult: 0.7, throwBias: 1,   throwEffectMult: 1 },
  gold:  { id: 'precise', name: '精准', emoji: '🎯', desc: '更易扔道具且效果 +15%', baseSpeedMult: 1,    selfBuffBonus: 0,    negEventImmune: 0,   hitPenaltyMult: 1,   throwBias: 2.2, throwEffectMult: 1.15 },
  water: { id: 'agile',   name: '灵动', emoji: '💧', desc: '基础速度 +3%',         baseSpeedMult: 1.03, selfBuffBonus: 0,    negEventImmune: 0,   hitPenaltyMult: 1,   throwBias: 1,   throwEffectMult: 1 },
};

/* ====================== 选手类型 ====================== */
export interface Racer {
  id: string;
  name: string;
  emoji: string;
  element: ElementType;
  isPlayer: boolean;
  /** 基础速度（归一化/秒，已含五行系数与状态/随机抖动/性格/皮肤），事件期间再乘临时倍率 */
  baseSpeed: number;
  /** 五行相对赛道的系数（仅展示用） */
  speedFactor: number;
  /** 性格（五行映射，稳定）；BOT 按元素同规则分配 */
  personality: PetPersonality;
  /** 同元素结阵加成（赛前统计，>=2 只同元素则该元素全体获得 teamBuff）；仅展示用，速度已扑入 baseSpeed */
  teamBuffed: boolean;
}

/* ====================== 选手来源层（联机二期只换这一层） ====================== */
/**
 * 对手来源模式：
 * - 'bot'    本地机器人（一期默认，纯前端可玩）
 * - 'online' 联机真人（需后端匹配；未接入时自动回退 bot，保证可玩）
 */
export type RaceOpponentMode = 'bot' | 'online';

/** 构建对手所需的上下文（由 beginRace 注入；来源层只消费、不关心赛道表现） */
export interface RaceOpponentContext {
  /** 需要的对手数量 */
  count: number;
  /** 今日赛道属性（用于五行系数展示） */
  trackElement: ElementType;
  /** 机器人命名池（来自 raceConfig.botNames） */
  botNames: string[];
  /** 基础速度构建闭包（已封装五行系数/状态/性格/皮肤/天气），来源层直接调用 */
  makeBase: (el: ElementType, cond: number) => number;
}

/** 选手来源层接口：联机二期只替换此实现，赛道表现层（RaceTrack.vue）完全不变 */
export interface IRaceOpponentSource {
  mode: RaceOpponentMode;
  /** 同步返回对手 Racer[]；在线模式若后端未就绪可返回空数组，由调用方回退 */
  getOpponents(ctx: RaceOpponentContext): Racer[];
}
