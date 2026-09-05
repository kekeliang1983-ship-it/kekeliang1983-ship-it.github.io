// src/stores/useModulesStore.ts —— 7模块实时状态（部分字段持久化）
import { defineStore } from 'pinia';
import type {
  IPlot, IPet, IEmotionBottle, IArtifact, IActiveBuff, IDailyLimits,
  IModuleExtras, ElementType, SeedQuality, IncenseType, IMusicTrack,
  IPetTravelNote, IPetDailyTasks, IPetUnit,
  TravelMode, TravelChannel, PetFoodType, EmotionType, IShrineState,
  CropId, IDriftBottle, IDriftMessage, DriftReward,
} from '@/types/index';
import { useUserStore, useRaceStore, NICKNAME_MIN, NICKNAME_MAX } from './index';
// 情绪瓶：运行时数值已全部收编进 bottleConfig（后台 bottle.json 覆盖），此处仅借常量构造默认值
import { EMOTIONS, BOTTLE_OVERFLOW, BOTTLE_MILESTONES, TRIPLE_LABEL, TRIPLE_THEME_CHANCE } from '@/constants/bottle';
import { GALLERY_ELEMENTS, GALLERY_QUALITY_BONUS, DEFAULT_UNLOCKED, DAILY_FREE_COUNT, LEGENDARY_DAILY_LIMIT, type WallpaperQuality } from '@/constants/gallery';
import { useContentStore } from './useContentStore';
// 联机后端接入层（Supabase）：漂流瓶真·跨用户投递；未配置时自动降级本地
import { pushDriftToCloud, fetchRandomDriftFromCloud } from '@/services/supabase';
import { TRAVEL_CFG_MAP, TRAVEL_NOTES, HUNGER_DECAY_PER_MIN, HUNGER_TRAVEL_MIN, SPEED_UP_DAILY_LIMIT, PET_MAIN_NAME, PET_ELEMENT_LABEL, TRAVEL_MILESTONES, PET_FOODS } from '@/constants/pet';
import type { ArtifactId } from '@/types/index';
// 漂流瓶：运行时数值已全部收编进 bottleConfig.drift，此处仅借常量构造默认值
import { DRIFT_SEND_DAILY, DRIFT_PICK_DAILY, DRIFT_INBOX_MAX, DRIFT_REWARD_CHANCE, DRIFT_REWARD_DOUBLE_CHANCE, DRIFT_REWARD_POOL, DRIFT_REWARD_META, DRIFT_WARM_WORDS, DRIFT_GENERIC, DRIFT_EMOTION_SET } from '@/constants/drift';
// 商店：运行时价目已收编进 farmConfig.shop，此处仅借常量构造默认值
import { SHOP, CURRENCY_LABEL } from '@/constants/shop';
// 灵田：运行时数值已全部收编进 farmConfig（后台 farm.json 覆盖），此处仅借常量构造默认值
import {
  CROPS, ELEMENT_BONUS, FIVE_ENGENDER, FIVE_RESTRAIN,
  FARM_ELEMENTS, FARM_QUALITIES, FARM_ELEMENT_LABEL, FARM_QUALITY_LABEL,
  FENGSHUI_MAIN_BONUS, FENGSHUI_ENGENDER_BONUS, CODEX_ELEMENT_BONUS,
  FERTILITY_MAX, FERTILITY_START, FERTILITY_ROTATE_GAIN, FERTILITY_REPEAT_PENALTY,
  FERTILITY_YIELD_COEF, ROTATE_REPEAT_YIELD_PENALTY,
  PROSPERITY_MAX, PROSPERITY_PER_HARVEST, PROSPERITY_RARE_BONUS, PROSPERITY_YIELD_COEF, PROSPERITY_TIERS,
  COMBO_WINDOW_MS, COMBO_PER_STEP, COMBO_CAP,
} from '@/constants/farm';
// 竞速：运行时数值已全部收编进 raceConfig（后台 race.json 覆盖），此处仅借常量构造默认值
import {
  RACE_DAILY_FREE, RACE_PAID_COST, RACE_PAID_DAILY_LIMIT, RACE_COOLDOWN_MS,
  RACE_BASE_SPEED, RACE_MAX_MS, RACE_DAILY_GOLD_CAP, RACE_DAILY_PEARL_CAP,
  RACE_EVENTS, RACE_TARGETED, RACE_EVENT_EVERY_MS, RACE_TARGETED_EVERY_MS,
  RANK_REWARDS, UPSET_BONUS, BOT_NAMES, RACE_TRACK_SKINS, RACE_WEATHERS,
  type RaceEvent, type TargetedEvent, type RankReward, type RaceTrackSkin, type RaceWeather, type RaceOpponentMode,
} from '@/constants/race';
// 签到：运行时数值已全部收编进 checkinConfig（后台 checkin.json 覆盖），此处仅借常量构造默认值
import {
  CHECKIN_DAYS, CHECKIN_MILESTONES, CHECKIN_MAKEUP_COST,
  type CheckinDay, type CheckinReward, type CheckinMilestone,
} from '@/constants/checkin';
// 素材池：头像库 + 起名词库 + 五行底环色 已全部收编进 poolConfig（后台 pool.json 覆盖），此处仅借常量构造默认值
import {
  AVATARS, ELEMENT_RING, DEFAULT_RING,
  type AvatarOption,
} from '@/constants/avatarPool';
import { NAME_POOL } from '@/constants/namePool';

const todayKey = () => new Date().toISOString().slice(0, 10);

/** 抚摸「大满足」冷却：10 分钟（原 3 小时过于漫长，治愈系陪伴应更频繁；冷却中轻摸仍有小回应） */
export const STROKE_COOL_MS = 3 * 60 * 1000;

/* ---------- 仙宠配置（02-全局核心常量 六、仙宠数值表） ---------- */
/* 旅行六档配置见 @/constants/pet.ts（TRAVEL_CONFIGS / TRAVEL_CFG_MAP / unlockedTravelModes）；
   见闻文案池 TRAVEL_NOTES 亦在该文件。2026-08-26 大改：6 地 × 固定时长 × 食物/魔丸双通道。 */

/** 五行宠物名与 emoji（页面共用） */
export const PET_ELEMENTS: ElementType[] = ['gold', 'wood', 'water', 'fire', 'earth'];
export const PET_META: Record<ElementType, { name: string; emoji: string }> = {
  gold:  { name: '白泽', emoji: '🦅' },
  wood:  { name: '夫诸', emoji: '🦌' },
  water: { name: '文鳐', emoji: '🐢' },
  fire:  { name: '毕方', emoji: '🦊' },
  earth: { name: '貔貅', emoji: '🐻' },
};

/* ============ 仙宠内容层（#254：后台高自由度，配置态外置 / 运行态进度死守 localStorage） ============ */
export interface PetParamCfg {
  hungerDecayPerMin: number;
  hungerHappinessFactor: number;
  hungerTravelMin: number;
  speedUpDailyLimit: number;
  strokeCoolMs: number;
  strokeGainSmall: number;
  strokeGainBig: number;
  strokeMoodBig: number;
  multElement: number;
  multFirstDaily: number;
  multLively: number;
  dailyRewardGold: number;
  livelyThreshold: number;
}
export interface PetCfg {
  element: ElementType;
  name: string;
  emoji: string;
  image: string;
  elementLabel: string;
  nickname: string;
  unlockJade: number;
  desc: string;
}
export interface FoodCfg {
  type: PetFoodType;
  emoji: string;
  name: string;
  desc: string;
  hungerGain: number;
  priceType: 'gold' | 'pearl';
  price: number;
}
export interface TravelCfg {
  id: TravelMode;
  name: string;
  element: ElementType | 'chaos';
  hours: number;
  food: PetFoodType;
  foodQty: number;
  magicHours?: number;
  magicCost?: number;
  rewards: { gold: number; pearl: number; magic: number };
  drops: { jadeChance?: number; jadeGuarantee?: number; hiddenChance?: number; hiddenPool?: 'spirit' | 'legend' };
  unlockAt: number;
  milestones: [string, string, string];
  notes: string[];
}
export interface PetConfig {
  elements: ElementType[];
  params: PetParamCfg;
  pets: PetCfg[];
  foods: FoodCfg[];
  travels: TravelCfg[];
  petMap: Record<string, PetCfg>;
  travelMap: Record<string, TravelCfg>;
}

/* ===================== 神龛配置（后台 shrine.json 驱动；运行态进度不在此） ===================== */
export interface ShrineParamCfg {
  /** 神恩总增益封顶红线（软预警：editor 超限橙字，运行时仍按设值生效） */
  buffCeil: number;
  /** 上香灵气消耗 */
  incenseQiCost: number;
  /** 求签灵气消耗 */
  fortuneQiCost: number;
  /** 每日头香随机货币数量 */
  firstIncenseReward: number;
  /** 上上签兑换元宝 */
  couponValueGold: number;
  /** 长按点燃毫秒（原写死 3000） */
  pressMs: number;
  /** 心愿墙上限（原写死 20） */
  maxWishes: number;
  /** 头香随机池（原写死 ['gold','pearl','magic','jade']，可配货币集合） */
  firstRewardCurrencies: string[];
}
export interface ShrineIncenseCfg {
  type: string;
  name: string;
  emoji: string;
  /** 立绘（可选，空则回退 emoji） */
  image: string;
  cost: { currency: 'gold' | 'pearl' | 'magic'; amount: number };
  durationHours: number;
  buff: number;          // 全资源产出增益
  desc: string;
  special?: string;
  refundRate?: number;   // 概率返还消耗（原檀香 0.1）
  /** 必得上上签（原龙涎香特例，改为每档香可配开关） */
  guaranteeTop?: boolean;
  /** 香火光晕色（神位主卡 halo） */
  glow?: string;
}
export interface ShrineDeityUnlockCfg {
  desc: string;
  incenseCount?: number;
  overflowCount?: number;
  jade?: number;
}
export interface ShrineDeityCfg {
  id: string;
  name: string;
  emoji: string;
  /** 立绘（可选，空则回退 emoji） */
  image: string;
  blessing: string;
  /** 上香成功的小馈赠（基础神位：货币/心境） */
  bonus?: { currency: 'gold' | 'pearl' | 'magic'; amount: number } | { mood: number };
  /** 神恩系数（高级神位，乘在香品 buff 上） */
  mult?: number;
  /** 解锁条件（高级神位；阈值全部取自已有持久化字段） */
  unlock?: ShrineDeityUnlockCfg | null;
}
export interface ShrineFortuneCfg {
  rank: string;
  text: string;
  emoji: string;
}
export interface ShrineAlmanacCfg {
  yi: string[];
  ji: string[];
  /** 宜 → 推荐神位 id（今日宜忌稳定联动） */
  yiDeity: Record<string, string>;
}
export interface ShrineConfig {
  params: ShrineParamCfg;
  incenses: ShrineIncenseCfg[];
  deities: ShrineDeityCfg[];
  fortunes: ShrineFortuneCfg[];
  almanac: ShrineAlmanacCfg;
}

/* ===================== 法器配置（后台 artifacts.json 驱动；运行态进度不在此） ===================== */
/** 法器增益归属键（与游戏数值接入点一一对应） */
export type ArtifactMetric = 'gold' | 'qiSpeed' | 'defend' | 'magicPellet' | 'bottlePearl';
/** 法器效果描述（结构化，可序列化、可编辑器旋钮调参；原 effectText 是 JS 函数，无法进 JSON） */
export interface ArtifactEffectCfg {
  /** 增益归属（与游戏数值接入点对应；gold/bell已接入 FarmPage，qiSpeed/bowl 接入灵气恢复，magicPellet/flute 接入天籁魔丸，bottlePearl/wheel 接入情绪瓶满溢） */
  metric: ArtifactMetric;
  /** 展示前缀，如「灵田元宝产出」 */
  label: string;
  /** 增益形态：percent 百分比 / mult 倍率 / flat 固定值 */
  mode: 'percent' | 'mult' | 'flat';
  /** 每级增量（percent: 0.10=+10%；mult: 1；flat: +1） */
  perLevel: number;
  /** mult 形态基准（flute base=1 → 满级 ×6） */
  base?: number;
  /** 是否为「减益式增益」（结界符借走比例 −X%） */
  negative?: boolean;
  /** 是否已接入游戏数值（bell=gold 真；其余配置就绪但游戏内接入待排期） */
  wired?: boolean;
}
export interface ArtifactCfg {
  id: string;
  name: string;
  emoji: string;
  /** 立绘（可选，空则回退 emoji） */
  image: string;
  /** 一句话定位（hero 副标题） */
  blurb: string;
  /** 解锁成就文案（🔒 时显示） */
  unlockText: string;
  /** 解锁进度来源键（store 内对应计数器） */
  unlockKey: 'harvest' | 'onlineSec' | 'defend' | 'musicListen' | 'overflow';
  unlockThreshold: number;
  /** 效果系数（替代原 effectText 函数，结构化可调） */
  effect: ArtifactEffectCfg;
  /** 碎片真实来源（卡片/指南展示） */
  fragSource: string;
  /** 需联机才真正生效（结界符） */
  onlineOnly?: boolean;
}
export interface ArtifactParamsCfg {
  /** 满级等级（原写死 5） */
  maxLevel: number;
  /** 每级升级消耗碎片（原写死 3） */
  upgradeFrag: number;
  /** 每次掉落碎片数（原写死 1） */
  fragPerDrop: number;
}
export interface ArtifactsConfig {
  params: ArtifactParamsCfg;
  artifacts: ArtifactCfg[];
}

/* ===================== 情绪瓶 / 漂流瓶 配置（全开放：后台 bottle.json 覆盖） =====================
 * 设计原则（与 pet/shrine/artifacts 一致）：
 *  - 全部数值（容量/每日上限/心境加成/满溢产出/小三元/里程碑/漂流参数/暖语库）外置于 BottleConfig；
 *  - 运行态进度（emotionBottle/driftBottle 的 localStorage 数据）绝不进配置，仅覆盖配置态；
 *  - 后台 bottle.json 缺字段时逐项对齐 buildDefaultBottleConfig 兜底（铁律13⑦ 自愈）。 */
export interface BottleEmotionCfg {
  type: EmotionType;
  label: string;
  emoji: string;
  color: string;
  light: string;
}
export interface BottleOverflowCfg {
  pearl: number;
  magic: number;
  jadeChance: number;
}
export interface BottleMilestoneCfg {
  at: number;
  pearl: number;
  mood: number;
  text: string;
}
export interface DriftRewardPoolItem {
  kind: 'gold' | 'magic' | 'pearl';
  weight: number;
  min: number;
  max: number;
}
export interface DriftRewardMeta {
  emoji: string;
  label: string;
  color: string;
}
export interface DriftWarmGroup {
  resonate: string[];
  lift: string[];
}
export interface DriftCfg {
  sendDaily: number;
  pickDaily: number;
  inboxMax: number;
  rewardChance: number;
  rewardDoubleChance: number;
  rewardPool: DriftRewardPoolItem[];
  rewardMeta: Record<string, DriftRewardMeta>;
  /** 按情绪分池（键 = EmotionType），8 情绪各含 resonate/lift 两向 */
  warmWords: Record<string, DriftWarmGroup>;
  /** 无明确情绪时的兜底池 */
  generic: string[];
}
export interface BottleConfig {
  maxCapacity: number;
  dailyLimit: number;
  moodPerDrop: number;
  moodPerDriftOut: number;
  moodPerLetterRead: number;
  overflow: BottleOverflowCfg;
  tripleLabel: string;
  tripleThemeChance: number;
  milestones: BottleMilestoneCfg[];
  emotions: BottleEmotionCfg[];
  /** 大瓶主视觉背景图（留空回退内置渐变） */
  bottleImage: string;
  drift: DriftCfg;
}

/** 配置驱动：生成今日 3 颗情绪球（今日主题情绪机制，保证至少 2 颗同款） */
function rollTodayBallsCfg(emotions: EmotionType[], chance: number): EmotionType[] {
  if (!emotions.length) return [];
  const pool = emotions;
  const theme = pool[Math.floor(Math.random() * pool.length)];
  const third = Math.random() < chance
    ? theme
    : pool[Math.floor(Math.random() * pool.length)];
  const balls: EmotionType[] = [theme, theme, third];
  for (let i = balls.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [balls[i], balls[j]] = [balls[j], balls[i]];
  }
  return balls;
}

/** 配置驱动：按情绪从暖语库随机取一句（共鸣向 + 托举向混合）；emotion 为 null 回落通用池 */
function pickWarmWordCfg(emotion: EmotionType | null, warmWords: Record<string, DriftWarmGroup>, generic: string[]): string {
  if (!emotion || !warmWords[emotion] || !warmWords[emotion].resonate.length) {
    return generic.length ? generic[Math.floor(Math.random() * generic.length)] : '愿你被这世界温柔以待';
  }
  const pool = [...warmWords[emotion].resonate, ...warmWords[emotion].lift];
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : (generic[0] ?? '愿你被这世界温柔以待');
}

/** 配置驱动：掷一次读信掉落奖励（0 / 1 / 2 份） */
function rollDriftRewardCfg(cfg: DriftCfg): DriftReward[] {
  if (Math.random() > cfg.rewardChance) return [];
  const rollOne = (): DriftReward => {
    const total = cfg.rewardPool.reduce((s, r) => s + r.weight, 0);
    let r = Math.random() * total;
    let pick = cfg.rewardPool[0];
    for (const p of cfg.rewardPool) {
      if (r < p.weight) { pick = p; break; }
      r -= p.weight;
    }
    const amount = pick.min + Math.floor(Math.random() * (pick.max - pick.min + 1));
    return { kind: pick.kind, amount };
  };
  const out = [rollOne()];
  if (Math.random() < cfg.rewardDoubleChance) {
    let second = rollOne();
    let guard = 0;
    while (second.kind === out[0].kind && guard++ < 6) second = rollOne();
    out.push(second);
  }
  return out;
}

/* ---------- 灵田（Farm）配置态：全部读 farmConfig（后台 farm.json 覆盖） ---------- */

/** 单作物配置（15 种 = 5 元素 × 3 品质） */
export interface FarmCropCfg {
  id: string;                 // 'gold-common'
  name: string;
  element: string;
  quality: string;
  emoji: string;
  image?: string;             // 可选立绘，留空回退 emoji
  growSec: number;
  base: { gold: number; pearl: number; magic?: number };
  exp: number;
  jadeChance: number;
  quotes: string[];
}
/** 每日天象（按日期稳定随机，提供全局产出乘子） */
export interface FarmWeatherCfg { key: string; icon: string; name: string; desc: string; bonus: number; jadeExtra: number }
/** 作物变异 */
export interface FarmVariantCfg { key: string; label: string; rate: number }
/** 收获奇遇事件 */
export interface FarmLuckyEventCfg { emoji: string; text: string; gold: number; pearl: number; magic: number }

export interface FarmConfig {
  elements: { id: string; label: string }[];
  qualities: { id: string; label: string }[];
  crops: FarmCropCfg[];
  fiveEngender: Record<string, string>;
  fiveRestrain: Record<string, string>;
  elementBonus: Record<string, { gold?: number; pearl?: number; magic?: number; qty?: number }>;
  fengshuiMainBonus: number;
  fengshuiEngenderBonus: number;
  codexElementBonus: number;
  fertility: { max: number; start: number; rotateGain: number; repeatPenalty: number; yieldCoef: number; repeatYieldPenalty: number };
  prosperity: { max: number; perHarvest: number; rareBonus: number; yieldCoef: number; tiers: number[] };
  combo: { windowMs: number; perStep: number; cap: number };
  /** 心境加成阈值与幅度（原 FarmPage 内联：mood>80 → +15%） */
  moodThreshold: number;
  moodBonus: number;
  /** 种植等级每级产出加成（原内联：level × 2%） */
  levelPerBonus: number;
  weathers: FarmWeatherCfg[];
  variants: FarmVariantCfg[];
  luckyRate: number;
  luckyEvents: FarmLuckyEventCfg[];
  /** 招财铃碎片掉率（原 FarmPage 内联） */
  bellFragChance: Record<string, number>;
  /** 付费浇水每日上限（原 FarmPage 内联） */
  paidWaterDailyLimit: number;
  /** 集中价目表（原 constants/shop.ts 的 SHOP） */
  shop: {
    seed: Record<string, Record<string, number>>;
    petFood: Record<string, Record<string, number>>;
    petUnlock: Record<string, number>;
    water: Record<string, number>;
  };
  currencyLabel: Record<string, string>;
}

/** 默认灵田配置（对齐 constants/farm.ts + shop.ts + 原 FarmPage 内联彩蛋常量；后台 farm.json 缺字段时逐项兜底） */
function buildDefaultFarmConfig(): FarmConfig {
  const crops: FarmCropCfg[] = Object.values(CROPS).map((c) => ({
    id: c.id, name: c.name, element: c.element, quality: c.quality,
    emoji: c.emoji, image: '', growSec: c.growSec,
    base: { gold: c.base.gold, pearl: c.base.pearl, magic: c.base.magic },
    exp: c.exp, jadeChance: c.jadeChance, quotes: [...c.quotes],
  }));
  return {
    elements: FARM_ELEMENTS.map((id) => ({ id, label: FARM_ELEMENT_LABEL[id] })),
    qualities: FARM_QUALITIES.map((id) => ({ id, label: FARM_QUALITY_LABEL[id] })),
    crops,
    fiveEngender: { ...FIVE_ENGENDER },
    fiveRestrain: { ...FIVE_RESTRAIN },
    elementBonus: JSON.parse(JSON.stringify(ELEMENT_BONUS)),
    fengshuiMainBonus: FENGSHUI_MAIN_BONUS,
    fengshuiEngenderBonus: FENGSHUI_ENGENDER_BONUS,
    codexElementBonus: CODEX_ELEMENT_BONUS,
    fertility: {
      max: FERTILITY_MAX, start: FERTILITY_START,
      rotateGain: FERTILITY_ROTATE_GAIN, repeatPenalty: FERTILITY_REPEAT_PENALTY,
      yieldCoef: FERTILITY_YIELD_COEF, repeatYieldPenalty: ROTATE_REPEAT_YIELD_PENALTY,
    },
    prosperity: {
      max: PROSPERITY_MAX, perHarvest: PROSPERITY_PER_HARVEST, rareBonus: PROSPERITY_RARE_BONUS,
      yieldCoef: PROSPERITY_YIELD_COEF, tiers: [...PROSPERITY_TIERS],
    },
    combo: { windowMs: COMBO_WINDOW_MS, perStep: COMBO_PER_STEP, cap: COMBO_CAP },
    moodThreshold: 80, moodBonus: 0.15, levelPerBonus: 0.02,
    weathers: [
      { key: 'rain', icon: '🌧️', name: '灵雨', desc: '收获 +10%', bonus: 0.1, jadeExtra: 0 },
      { key: 'moon', icon: '🌕', name: '月华', desc: '收获 +8% · 仙品天玑 +5%', bonus: 0.08, jadeExtra: 0.05 },
      { key: 'harvest', icon: '🌾', name: '丰收日', desc: '收获 +15%', bonus: 0.15, jadeExtra: 0 },
    ],
    variants: [
      { key: 'gold', label: '黄金', rate: 0.04 },
      { key: 'ice', label: '晶莹', rate: 0.03 },
      { key: 'twin', label: '双生', rate: 0.03 },
    ],
    luckyRate: 0.05,
    luckyEvents: [
      { emoji: '🎐', text: '天降福缘！+30 元宝 +5 灵珠', gold: 30, pearl: 5, magic: 0 },
      { emoji: '🦌', text: '灵鹿路过，衔来灵珠 +8', gold: 0, pearl: 8, magic: 0 },
      { emoji: '🧧', text: '土地公打赏，元宝 +12', gold: 12, pearl: 0, magic: 0 },
      { emoji: '🕊️', text: '仙鹤赠魔丸 +3', gold: 0, pearl: 0, magic: 3 },
      { emoji: '🌱', text: '萌芽馈赠，+15 元宝 +3 灵珠', gold: 15, pearl: 3, magic: 0 },
    ],
    bellFragChance: { common: 0.15, uncommon: 0.35, rare: 1 },
    paidWaterDailyLimit: 3,
    shop: {
      seed: JSON.parse(JSON.stringify(SHOP.seed)),
      petFood: JSON.parse(JSON.stringify(SHOP.petFood)),
      petUnlock: { ...SHOP.petUnlock },
      water: { ...SHOP.water },
    },
    currencyLabel: { ...CURRENCY_LABEL },
  };
}

/* ---------- 竞速（Race）配置态：全部读 raceConfig（后台 race.json 覆盖） ---------- */

export interface RaceConfig {
  /** 每日免费场次 */
  dailyFree: number;
  /** 免费用完后每场投注（元宝） */
  paidCost: number;
  /** 每日最多额外购买场次（付费硬上限） */
  paidDailyLimit: number;
  /** 同宠出战冷却（仅防连点） */
  cooldownMs: number;
  /** 基础速度：归一化赛道长度/秒 */
  baseSpeed: number;
  /** 强制结束兜底（防事件异常卡死） */
  maxMs: number;
  /** 每日奖励封顶（防通胀） */
  dailyGoldCap: number;
  dailyPearlCap: number;
  /** 赛道五行每日轮换顺序（金木水火土各守一天） */
  trackOrder: ElementType[];
  /** 五行相生 / 相克 */
  engender: Record<string, string>;
  restrain: Record<string, string>;
  /** 比赛中随机触发的小事件（作用于自己） */
  events: RaceEvent[];
  /** 互扔道具事件（作用于对手） */
  targeted: TargetedEvent[];
  /** 事件触发节奏（毫秒期望） */
  eventEveryMs: number;
  targetedEveryMs: number;
  /** 名次奖励（末名含安慰礼） */
  rankRewards: Record<number, RankReward>;
  /** 逆袭彩头：实际比预期好 ≥2 位的额外奖励 */
  upsetBonus: { gold: number };
  /** 机器人对手名（山海经风，不与玩家五宠撞名） */
  botNames: string[];
  /** 末名安慰文案池 */
  comfortLines: string[];
  /** 赛道皮肤（视觉 + 全局修正，按日轮换；后台可改/扩） */
  tracks: RaceTrackSkin[];
  /** 天气（视觉 + 全局修正，按日轮换，与皮肤/五行正交） */
  weather: RaceWeather[];
  /** 连击：连续触发正向自身事件时，增量加成（每层 +comboStep，封顶 comboMax 层） */
  comboStep: number;
  /** 连击封顶层数 */
  comboMax: number;
  /** 同元素结阵加成：某元素出现 >=2 只时，该元素全体 baseSpeed 乘此值 */
  teamBuffMult: number;
  /** 选手来源层模式（联机二期）：'bot' 本地机器人 / 'online' 联机真人（未接入后端时自动回退 bot） */
  opponentMode: RaceOpponentMode;
}

/** 默认竞速配置（对齐 constants/race.ts；后台 race.json 缺字段时逐项兜底） */
function buildDefaultRaceConfig(): RaceConfig {
  return {
    dailyFree: RACE_DAILY_FREE,
    paidCost: RACE_PAID_COST,
    paidDailyLimit: RACE_PAID_DAILY_LIMIT,
    cooldownMs: RACE_COOLDOWN_MS,
    baseSpeed: RACE_BASE_SPEED,
    maxMs: RACE_MAX_MS,
    dailyGoldCap: RACE_DAILY_GOLD_CAP,
    dailyPearlCap: RACE_DAILY_PEARL_CAP,
    trackOrder: ['wood', 'fire', 'earth', 'gold', 'water'],
    // 五行相生（木→火→土→金→水→木）/ 相克（木克土、火克金、土克水、金克木、水克火）
    engender: { wood: 'fire', fire: 'earth', earth: 'gold', gold: 'water', water: 'wood' },
    restrain: { wood: 'earth', fire: 'gold', earth: 'water', gold: 'wood', water: 'fire' },
    events: JSON.parse(JSON.stringify(RACE_EVENTS)),
    targeted: JSON.parse(JSON.stringify(RACE_TARGETED)),
    eventEveryMs: RACE_EVENT_EVERY_MS,
    targetedEveryMs: RACE_TARGETED_EVERY_MS,
    rankRewards: JSON.parse(JSON.stringify(RANK_REWARDS)),
    upsetBonus: { ...UPSET_BONUS },
    botNames: [...BOT_NAMES],
    comfortLines: [
      '虽未夺魁，它叼回一朵野花递给你：「下次一定行！」',
      '垫底的小家伙在路边捡了颗糖，笑盈盈塞进你手心',
      '它慢悠悠晃回来，尾巴尖还沾着草叶，一点也不沮丧',
      '最后一名也值得掌声——它朝你比了个萌萌的爪',
      '它没赢，却带回一片发亮的叶子，说「这个送你当安慰」',
    ],
    tracks: JSON.parse(JSON.stringify(RACE_TRACK_SKINS)),
    weather: JSON.parse(JSON.stringify(RACE_WEATHERS)),
    comboStep: 0.08,
    comboMax: 3,
    teamBuffMult: 1.04,
    opponentMode: 'bot',
  };
}

/* ---------- 签到（Checkin）配置态：全部读 checkinConfig（后台 checkin.json 覆盖） ---------- */

export interface CheckinConfig {
  /** 七日递增奖励曲线 */
  days: CheckinDay[];
  /** 补签花费（元宝） */
  makeupCost: number;
  /** 累计签到里程碑（totalDays 永不重置） */
  milestones: CheckinMilestone[];
}

/** 默认签到配置（对齐 constants/checkin.ts；后台 checkin.json 缺字段时逐项兜底） */
function buildDefaultCheckinConfig(): CheckinConfig {
  return {
    days: JSON.parse(JSON.stringify(CHECKIN_DAYS)),
    makeupCost: CHECKIN_MAKEUP_COST,
    milestones: JSON.parse(JSON.stringify(CHECKIN_MILESTONES)),
  };
}

/* ---------- 素材池（Pool）配置态：全部读 poolConfig（后台 pool.json 覆盖） ---------- */

/** 五行底环渐变（与 global.css --wuxing-* / gallery ELEMENT_COLORS 对齐） */
export type RingPair = { from: string; to: string };

export interface PoolConfig {
  /** 头像库：emoji + 五行归属 + 中文名 */
  avatars: AvatarOption[];
  /** 起名赐名词库（全量，均匀随机） */
  names: string[];
  /** 五行底环渐变（决定头像组件底环色） */
  elementRing: Record<ElementType, RingPair>;
  /** 默认底环（未选五行 / 昵称首字态） */
  defaultRing: RingPair;
}

/** 默认素材池配置（对齐 constants/avatarPool.ts + namePool.ts；后台 pool.json 缺字段时逐项兜底） */
function buildDefaultPoolConfig(): PoolConfig {
  return {
    avatars: JSON.parse(JSON.stringify(AVATARS)),
    names: [...NAME_POOL],
    elementRing: JSON.parse(JSON.stringify(ELEMENT_RING)),
    defaultRing: { ...DEFAULT_RING },
  };
}

/** 素材池随机取用的「上次抽中」记忆（模块级，跨调用保持；store 单例天然持久） */
let _lastAvatarEmoji = '';
let _lastNameIndex = -1;

/** 默认情绪瓶配置（与旧硬编码常量对齐；后台 bottle.json 缺字段时逐项兜底） */
function buildDefaultBottleConfig(): BottleConfig {
  const emotions: BottleEmotionCfg[] = EMOTIONS.map((e) => ({
    type: e.type, label: e.label, emoji: e.emoji, color: e.color, light: e.light,
  }));
  const milestones: BottleMilestoneCfg[] = BOTTLE_MILESTONES.map((m) => ({
    at: m.at, pearl: m.pearl, mood: m.mood, text: m.text,
  }));
  const warmWords: Record<string, DriftWarmGroup> = {};
  (Object.keys(DRIFT_WARM_WORDS) as EmotionType[]).forEach((k) => {
    warmWords[k] = { resonate: [...DRIFT_WARM_WORDS[k].resonate], lift: [...DRIFT_WARM_WORDS[k].lift] };
  });
  const rewardMeta: Record<string, DriftRewardMeta> = {
    gold: { ...DRIFT_REWARD_META.gold },
    magic: { ...DRIFT_REWARD_META.magic },
    pearl: { ...DRIFT_REWARD_META.pearl },
  };
  return {
    maxCapacity: 30,
    dailyLimit: 3,
    moodPerDrop: 2,
    moodPerDriftOut: 1,
    moodPerLetterRead: 1,
    overflow: { pearl: BOTTLE_OVERFLOW.pearl, magic: BOTTLE_OVERFLOW.magic, jadeChance: BOTTLE_OVERFLOW.jadeChance },
    tripleLabel: TRIPLE_LABEL,
    tripleThemeChance: TRIPLE_THEME_CHANCE,
    milestones,
    emotions,
    bottleImage: '',
    drift: {
      sendDaily: DRIFT_SEND_DAILY,
      pickDaily: DRIFT_PICK_DAILY,
      inboxMax: DRIFT_INBOX_MAX,
      rewardChance: DRIFT_REWARD_CHANCE,
      rewardDoubleChance: DRIFT_REWARD_DOUBLE_CHANCE,
      rewardPool: DRIFT_REWARD_POOL.map((p) => ({ kind: p.kind, weight: p.weight, min: p.min, max: p.max })),
      rewardMeta,
      warmWords,
      generic: [...DRIFT_GENERIC],
    },
  };
}

/** 把法器数组归一为 id→cfg 映射 */
function toArtifactMap(list?: ArtifactCfg[]): Record<string, ArtifactCfg> {
  const m: Record<string, ArtifactCfg> = {};
  (list || []).forEach((a) => (m[a.id] = a));
  return m;
}

/** 默认法器配置（与旧硬编码 ARTIFACT_LIST 对齐；后台 artifacts.json 缺字段时逐项兜底） */
function buildDefaultArtifactsConfig(): ArtifactsConfig {
  const artifacts: ArtifactCfg[] = [
    {
      id: 'bell', name: '招财铃', emoji: '🔔', image: '',
      blurb: '系于灵田的风铃，收获时引动一缕财气',
      unlockText: '灵植收获满 10 次解锁', unlockKey: 'harvest', unlockThreshold: 10,
      effect: { metric: 'gold', label: '灵田元宝产出', mode: 'percent', perLevel: 0.10, wired: true },
      fragSource: '灵植收获时掉落（凡品 15% / 灵品 35% / 仙品必得）',
    },
    {
      id: 'bowl', name: '聚灵碗', emoji: '🥣', image: '',
      blurb: '静置案头的玉碗，缓缓聚拢天地灵气',
      unlockText: '累计在线满 10 小时解锁', unlockKey: 'onlineSec', unlockThreshold: 36000,
      effect: { metric: 'qiSpeed', label: '灵气恢复速度', mode: 'percent', perLevel: 0.20, wired: true },
      fragSource: '累计在线每满 1 小时得 1 枚',
    },
    {
      id: 'amulet', name: '结界符', emoji: '🪬', image: '',
      blurb: '温柔结界护住小院，访客借走也留得住',
      unlockText: '联机后开放 · 守护灵田 10 次', unlockKey: 'defend', unlockThreshold: 10,
      effect: { metric: 'defend', label: '守护灵田·借走比例', mode: 'percent', perLevel: 0.20, negative: true },
      fragSource: '联机后开放', onlineOnly: true,
    },
    {
      id: 'flute', name: '空灵笛', emoji: '🎋', image: '',
      blurb: '吹奏时魔气随音律流转，听歌收益倍增',
      unlockText: '天籁听歌累计满 1 小时解锁', unlockKey: 'musicListen', unlockThreshold: 3600,
      effect: { metric: 'magicPellet', label: '天籁魔丸产出', mode: 'mult', perLevel: 1, base: 1, wired: true },
      fragSource: '天籁聆听每满 1 小时得 1 枚（里程碑另有加成）',
    },
    {
      id: 'wheel', name: '轮回珠', emoji: '☸️', image: '',
      blurb: '掌中流转的宝珠，满溢时必有回响',
      unlockText: '情绪瓶满溢 1 次解锁', unlockKey: 'overflow', unlockThreshold: 1,
      effect: { metric: 'bottlePearl', label: '情绪瓶满溢额外灵珠', mode: 'flat', perLevel: 1, wired: true },
      fragSource: '情绪瓶每次满溢得 1 枚',
    },
  ];
  return {
    params: { maxLevel: 5, upgradeFrag: 3, fragPerDrop: 1 },
    artifacts,
  };
}

/** 自愈：补齐单个法器缺字段（后台手滑删字段不白屏） */
function normalizeArtifact(a: any, base?: ArtifactCfg): ArtifactCfg {
  const b = base ?? ({} as ArtifactCfg);
  return {
    id: a?.id ?? b.id ?? 'bell',
    name: a?.name ?? b.name ?? '法器',
    emoji: a?.emoji ?? b.emoji ?? '🔮',
    image: a?.image ?? b.image ?? '',
    blurb: a?.blurb ?? b.blurb ?? '',
    unlockText: a?.unlockText ?? b.unlockText ?? '',
    unlockKey: a?.unlockKey ?? b.unlockKey ?? 'harvest',
    unlockThreshold: typeof a?.unlockThreshold === 'number' ? a.unlockThreshold : (b.unlockThreshold ?? 1),
    effect: normalizeEffect(a?.effect, b?.effect),
    fragSource: a?.fragSource ?? b.fragSource ?? '',
    onlineOnly: typeof a?.onlineOnly === 'boolean' ? a.onlineOnly : (b.onlineOnly ?? false),
  };
}
function normalizeEffect(e: any, base?: ArtifactEffectCfg): ArtifactEffectCfg {
  const b = base ?? ({} as ArtifactEffectCfg);
  return {
    metric: e?.metric ?? b.metric ?? 'gold',
    label: e?.label ?? b.label ?? '',
    mode: e?.mode ?? b.mode ?? 'percent',
    perLevel: typeof e?.perLevel === 'number' ? e.perLevel : (b.perLevel ?? 0.1),
    base: typeof e?.base === 'number' ? e.base : (b.base ?? 1),
    negative: typeof e?.negative === 'boolean' ? e.negative : (b.negative ?? false),
    wired: typeof e?.wired === 'boolean' ? e.wired : (b.wired ?? false),
  };
}

/** 把结构化效果格式化为展示文案（如「灵田元宝产出 +10%（满级 +50%）」） */
export function formatArtifactEffect(e: ArtifactEffectCfg, level: number, maxLevel: number): string {
  const v = e.perLevel * level;
  const mx = e.perLevel * maxLevel;
  const sign = e.negative ? '−' : '+';
  if (e.mode === 'percent') {
    return `${e.label} ${sign}${Math.round(v * 100)}%（满级 ${sign}${Math.round(mx * 100)}%）`;
  }
  if (e.mode === 'mult') {
    const base = e.base ?? 1;
    return `${e.label} ×${base + v}（满级 ×${base + mx}）`;
  }
  return `${e.label} ${sign}${Math.round(v)}（满级 ${sign}${Math.round(mx)}）`;
}

/** 把香品数组归一为 type→cfg 映射 */
function toIncenseMap(list?: ShrineIncenseCfg[]): Record<string, ShrineIncenseCfg> {
  const m: Record<string, ShrineIncenseCfg> = {};
  (list || []).forEach((c) => (m[c.type] = c));
  return m;
}
/** 把神位数组归一为 id→cfg 映射 */
function toDeityMap(list?: ShrineDeityCfg[]): Record<string, ShrineDeityCfg> {
  const m: Record<string, ShrineDeityCfg> = {};
  (list || []).forEach((d) => (m[d.id] = d));
  return m;
}

/** 默认神龛配置（与旧硬编码常量对齐；后台 shrine.json 缺字段时逐项兜底） */
function buildDefaultShrineConfig(): ShrineConfig {
  const incenses: ShrineIncenseCfg[] = [
    { type: 'incense_basic', name: '线香', emoji: '🕯️', image: '', cost: { currency: 'gold', amount: 5 }, durationHours: 1, buff: 0.05, desc: '神恩 1 小时 · 收益 +5%', glow: 'rgba(240,180,120,.45)' },
    { type: 'incense_mid', name: '檀香', emoji: '🌸', image: '', cost: { currency: 'pearl', amount: 10 }, durationHours: 4, buff: 0.15, desc: '神恩 4 小时 · 收益 +15%', special: '10% 概率返还消耗灵珠', refundRate: 0.1, glow: 'rgba(200,150,230,.45)' },
    { type: 'incense_high', name: '龙涎香', emoji: '🐉', image: '', cost: { currency: 'magic', amount: 8 }, durationHours: 12, buff: 0.30, desc: '神恩 12 小时 · 收益 +30%', special: '必得上上签 x1（可兑 20 元宝）', guaranteeTop: true, glow: 'rgba(120,200,255,.5)' },
  ];
  const deities: ShrineDeityCfg[] = [
    { id: 'wealth',  name: '财神', emoji: '🧧', image: '', blessing: '庇佑元宝盈仓', bonus: { currency: 'gold', amount: 1 } },
    { id: 'love',    name: '月老', emoji: '💞', image: '', blessing: '庇佑灵珠生长', bonus: { currency: 'pearl', amount: 1 } },
    { id: 'scholar', name: '文昌', emoji: '📖', image: '', blessing: '庇佑魔丸精进', bonus: { currency: 'magic', amount: 1 } },
    { id: 'healer',  name: '药王', emoji: '🌿', image: '', blessing: '庇佑心境安宁', bonus: { mood: 2 } },
    { id: 'mystic',    name: '玄女', emoji: '🪷', image: '', blessing: '神恩加持 ×1.2', mult: 1.2, unlock: { desc: '累计上香 10 次', incenseCount: 10 } },
    { id: 'starlord', name: '星君', emoji: '⭐', image: '', blessing: '神恩加持 ×1.2', mult: 1.2, unlock: { desc: '情绪瓶满溢 1 次', overflowCount: 1 } },
    { id: 'dragon',   name: '烛龙', emoji: '🐲', image: '', blessing: '神恩加持 ×1.4', mult: 1.4, unlock: { desc: '累计上香 30 次', incenseCount: 30 } },
    { id: 'queen',    name: '王母', emoji: '👑', image: '', blessing: '神恩加持 ×1.4', mult: 1.4, unlock: { desc: '天玑≥3 且 满溢≥2', jade: 3, overflowCount: 2 } },
  ];
  const fortunes: ShrineFortuneCfg[] = [
    { rank: '上上签', text: '紫气东来，万事顺遂', emoji: '🪙' },
    { rank: '上签',   text: '心之所向，皆有回响', emoji: '🎋' },
    { rank: '中签',   text: '静水流深，徐徐图之', emoji: '🍃' },
    { rank: '中签',   text: '不急不躁，自有安排', emoji: '🌾' },
    { rank: '下签',   text: '今日宜静养，莫强求', emoji: '🍂' },
  ];
  const almanac: ShrineAlmanacCfg = {
    yi: ['宜聆听天籁', '宜浇灌灵植', '宜陪伴仙宠', '宜投入情绪球', '宜整理心愿', '宜早些休息'],
    ji: ['忌久坐不动', '忌熬夜伤神', '忌心浮气躁', '忌暴饮暴食', '忌埋头苦干', '忌苛责自己'],
    yiDeity: {
      '宜聆听天籁': 'scholar',
      '宜浇灌灵植': 'love',
      '宜陪伴仙宠': 'healer',
      '宜投入情绪球': 'healer',
      '宜整理心愿': 'wealth',
      '宜早些休息': 'healer',
    },
  };
  return {
    params: {
      buffCeil: 0.45,
      incenseQiCost: 10,
      fortuneQiCost: 10,
      firstIncenseReward: 5,
      couponValueGold: 20,
      pressMs: 3000,
      maxWishes: 20,
      firstRewardCurrencies: ['gold', 'pearl', 'magic', 'jade'],
    },
    incenses, deities, fortunes, almanac,
  };
}

/** 自愈：补齐单个香品缺字段（后台手滑删字段不白屏） */
function normalizeIncense(c: any, base?: ShrineIncenseCfg): ShrineIncenseCfg {
  const b = base ?? ({} as ShrineIncenseCfg);
  return {
    type: c?.type ?? b.type ?? 'incense_basic',
    name: c?.name ?? b.name ?? '香',
    emoji: c?.emoji ?? b.emoji ?? '🕯️',
    image: c?.image ?? b.image ?? '',
    cost: (c?.cost && typeof c.cost === 'object') ? { currency: c.cost.currency ?? 'gold', amount: typeof c.cost.amount === 'number' ? c.cost.amount : 0 } : (b.cost ?? { currency: 'gold', amount: 0 }),
    durationHours: typeof c?.durationHours === 'number' ? c.durationHours : (b.durationHours ?? 1),
    buff: typeof c?.buff === 'number' ? c.buff : (b.buff ?? 0.05),
    desc: c?.desc ?? b.desc ?? '',
    special: c?.special ?? b.special ?? '',
    refundRate: typeof c?.refundRate === 'number' ? c.refundRate : (b.refundRate ?? 0),
    guaranteeTop: typeof c?.guaranteeTop === 'boolean' ? c.guaranteeTop : (b.guaranteeTop ?? false),
    glow: c?.glow ?? b.glow ?? 'rgba(200,200,255,.4)',
  };
}
/** 自愈：补齐单个神位缺字段（后台手滑删字段不白屏） */
function normalizeDeity(d: any, base?: ShrineDeityCfg): ShrineDeityCfg {
  const b = base ?? ({} as ShrineDeityCfg);
  return {
    id: d?.id ?? b.id ?? 'wealth',
    name: d?.name ?? b.name ?? '神',
    emoji: d?.emoji ?? b.emoji ?? '🧧',
    image: d?.image ?? b.image ?? '',
    blessing: d?.blessing ?? b.blessing ?? '',
    bonus: d?.bonus ?? b.bonus,
    mult: typeof d?.mult === 'number' ? d.mult : (b.mult ?? 1),
    unlock: d?.unlock === null || d?.unlock === undefined ? (b.unlock ?? null) : { desc: d.unlock.desc ?? '', incenseCount: d.unlock.incenseCount, overflowCount: d.unlock.overflowCount, jade: d.unlock.jade },
  };
}

const DEFAULT_PET_DESC: Record<ElementType, string> = {
  gold: '金系精灵 · 锐利而忠诚',
  wood: '木系精灵 · 温润而生长',
  water: '水系精灵 · 灵秀而包容',
  fire: '火系精灵 · 热烈而灵动',
  earth: '土系精灵 · 沉稳而可靠',
};

/** 默认仙宠配置（与旧硬编码常量对齐；后台 pet.json 缺字段时逐项兜底） */
function buildDefaultPetConfig(): PetConfig {
  const elements: ElementType[] = [...PET_ELEMENTS];
  const pets: PetCfg[] = elements.map((el) => ({
    element: el,
    name: PET_MAIN_NAME[el],
    emoji: PET_META[el].emoji,
    image: '',
    elementLabel: PET_ELEMENT_LABEL[el],
    nickname: `${PET_ELEMENT_LABEL[el]}精灵`,
    unlockJade: 2,
    desc: DEFAULT_PET_DESC[el],
  }));
  const foods: FoodCfg[] = PET_FOODS.map((f) => {
    const price = SHOP.petFood[f.type];
    return {
      type: f.type,
      emoji: f.emoji,
      name: f.name,
      desc: f.desc,
      hungerGain: f.type === 'dry' ? 20 : 35,
      priceType: (price.gold != null ? 'gold' : 'pearl') as 'gold' | 'pearl',
      price: price.gold ?? price.pearl ?? 5,
    };
  });
  const travels: TravelCfg[] = Object.values(TRAVEL_CFG_MAP).map((c) => ({
    ...c,
    milestones: (TRAVEL_MILESTONES[c.id] ?? ['', '', '']) as [string, string, string],
    notes: TRAVEL_NOTES[c.id] ?? [],
  }));
  const petMap: Record<string, PetCfg> = {};
  pets.forEach((p) => (petMap[p.element] = p));
  const travelMap: Record<string, TravelCfg> = {};
  travels.forEach((t) => (travelMap[t.id] = t));
  return {
    elements,
    params: {
      hungerDecayPerMin: HUNGER_DECAY_PER_MIN,
      hungerHappinessFactor: 0.7,
      hungerTravelMin: HUNGER_TRAVEL_MIN,
      speedUpDailyLimit: SPEED_UP_DAILY_LIMIT,
      strokeCoolMs: STROKE_COOL_MS,
      strokeGainSmall: 3,
      strokeGainBig: 12,
      strokeMoodBig: 2,
      multElement: 1.15,
      multFirstDaily: 1.5,
      multLively: 1.1,
      dailyRewardGold: 30,
      livelyThreshold: 80,
    },
    pets, foods, travels, petMap, travelMap,
  };
}

/** 自愈：补齐单个宠缺字段（后台手滑删字段不白屏，与天籁 syncMusicFromContent 同款接缝） */
function normalizePet(p: any, base?: PetCfg): PetCfg {
  const b = base ?? ({} as PetCfg);
  return {
    element: p?.element ?? b.element ?? 'wood',
    name: p?.name ?? b.name ?? '仙宠',
    emoji: p?.emoji ?? b.emoji ?? '🐾',
    image: p?.image ?? b.image ?? '',
    elementLabel: p?.elementLabel ?? b.elementLabel ?? '',
    nickname: p?.nickname ?? b.nickname ?? '',
    unlockJade: typeof p?.unlockJade === 'number' ? p.unlockJade : (b.unlockJade ?? 2),
    desc: p?.desc ?? b.desc ?? '',
  };
}
function normalizeTravel(t: any, base?: TravelCfg): TravelCfg {
  const b = base ?? ({} as TravelCfg);
  const ms = Array.isArray(t?.milestones) ? t.milestones : (b.milestones ?? ['', '', '']);
  return {
    id: (t?.id ?? b.id ?? 'taijing') as TravelMode,
    name: t?.name ?? b.name ?? '',
    element: (t?.element ?? b.element ?? 'wood') as ElementType | 'chaos',
    hours: typeof t?.hours === 'number' ? t.hours : (b.hours ?? 0.25),
    food: (t?.food ?? b.food ?? 'dry') as PetFoodType,
    foodQty: typeof t?.foodQty === 'number' ? t.foodQty : (b.foodQty ?? 1),
    magicHours: t?.magicHours,
    magicCost: t?.magicCost,
    rewards: t?.rewards ?? b.rewards ?? { gold: 0, pearl: 0, magic: 0 },
    drops: t?.drops ?? b.drops ?? {},
    unlockAt: typeof t?.unlockAt === 'number' ? t.unlockAt : (b.unlockAt ?? 0),
    milestones: [ms[0] ?? '', ms[1] ?? '', ms[2] ?? ''] as [string, string, string],
    notes: Array.isArray(t?.notes) ? t.notes : (b.notes ?? []),
  };
}
const makeDefaultPlots = (): IPlot[] => (
  // 初始5块地，各属性各1块解锁（01-全局规则 L33）
  (['gold', 'wood', 'water', 'fire', 'earth'] as ElementType[]).map((el, idx) => ({
    plotId: idx + 1,
    element: el,
    status: 'idle',
    seedType: null,
    sowTimestamp: 0,
    growDurationSeconds: 0,
    remainingSeconds: 0,
    isStealable: true,
    stolenPercentage: 0,
    fertility: FERTILITY_START,
    lastCropElement: null,
  }))
);

/* 天籁曲目元数据（2026-08-26：接入真实治愈背景音乐，6 首全部来自《音乐相关》文件夹）
   映射：前3首免费；track_004 20灵珠 / track_005 15魔丸 交替解锁；track_006 烟火长安 为 4h 里程碑典藏曲
   音频文件位于 public/audio/track_00X.mp3（128kbps 转码，单首约2.5MB，总约16MB）*/
const makeDefaultTracks = (): IMusicTrack[] => [
  { id: 'track_001', name: '孤城之心', durationSeconds: 169, isUnlocked: true, src: '/audio/track_001.mp3' },
  { id: 'track_002', name: '心境如水', durationSeconds: 174, isUnlocked: true, src: '/audio/track_002.mp3' },
  { id: 'track_003', name: '暮色归鸟', durationSeconds: 159, isUnlocked: true, src: '/audio/track_003.mp3' },
  { id: 'track_004', name: '烟雨小镇', durationSeconds: 180, isUnlocked: false, unlockCost: { pearl: 20 }, src: '/audio/track_004.mp3' },
  { id: 'track_005', name: '空山灵韵', durationSeconds: 156, isUnlocked: false, unlockCost: { magic: 15 }, src: '/audio/track_005.mp3' },
  // 典藏曲：无 unlockCost，仅 4h 里程碑领取解锁（不可货币购买）
  { id: 'track_006', name: '烟火长安', durationSeconds: 174, isUnlocked: false, milestoneHours: 4, src: '/audio/track_006.mp3' },
];

export const useModulesStore = defineStore('modules', {
  state: (): IModuleExtras & {
    plots: IPlot[];
    pet: IPet;
    emotionBottle: IEmotionBottle;
    driftBottle: IDriftBottle;
    artifacts: IArtifact[];
    activeBuff: IActiveBuff;
    shrine: IShrineState;
    dailyLimits: IDailyLimits;
    dailyLimitsDay: string;  // dayKey：dailyLimits 跨天重置判定（修复路由跳转误清每日限购）
    shrineOffersDay: string; // dayKey用于shrineOffersToday跨天重置
    unlockedPlots: number;   // 已解锁地块数（01-L33：默认1）
    petConfig: PetConfig;    // 仙宠配置态（后台 pet.json 覆盖，运行态进度不在此）
    shrineConfig: ShrineConfig; // 神龛配置态（后台 shrine.json 覆盖，运行态进度不在此）
    artifactConfig: ArtifactsConfig; // 法器配置态（后台 artifacts.json 覆盖，运行态进度不在此）
    bottleConfig: BottleConfig; // 情绪瓶配置态（后台 bottle.json 覆盖，运行态进度不在此）
    farmConfig: FarmConfig; // 灵田配置态（后台 farm.json 覆盖，运行态进度不在此）
    raceConfig: RaceConfig; // 竞速配置态（后台 race.json 覆盖，运行态进度不在此）
    checkinConfig: CheckinConfig; // 签到配置态（后台 checkin.json 覆盖，运行态进度不在此）
    poolConfig: PoolConfig; // 素材池配置态（后台 pool.json 覆盖：头像库 / 起名词库 / 五行底环色）
  } => ({
    plots: makeDefaultPlots(),
    pet: {
      type: 'wood', // 初始免费自选，测试默认wood
      petName: '小灵灵', // 主卡可编辑（08-25 版式合并新增）
      hunger: 100,
      happiness: 100,
      travelStatus: 'idle',
      travelEndTimestamp: 0,
      travelMode: null,
      travelChannel: 'food', // 默认携粮出发
      travelCount: 0, // 累计完成旅行次数（渐进解锁用）
      travelFirstDoubleDate: '', // 每日首旅双倍已享日期
      food: { dry: 2, premium: 1 }, // 新手礼：2干粮 + 1精粮，可立即体验旅行闭环
      ownedPets: ['wood'],
      lastStrokeTimestamp: 0,
      lastDecayTimestamp: Date.now(),
      travelNote: null,
      travelNoteTimestamp: 0,
      travelNotes: [], // 见闻历史（倒序最新在前，上限20条）
      travelNotesSeen: [], // 见闻图鉴已收录（'mode:index'，永久留存，不受历史上限20条影响）
      travelSpeedUpDate: '', // 每日魔丸加速次数判定日
      travelSpeedUpCount: 0, // 今日已用加速次数（上限 SPEED_UP_DAILY_LIMIT）
      dailyTasks: { date: todayKey(), fed: false, stroked: false, traveled: false, claimed: false },
      // 非激活已解锁仙宠的独立状态池（多宠独立：切换/停放时完整保留各自饱食·愉悦·旅行）
      units: {},
    },
    emotionBottle: {
      currentCount: 0,
      maxCapacity: 30,
      todayUsed: 0,
      dailyLimit: 3,
      lastThreeEmotions: [],
      todayBalls: [], // 由 normalizeBottle 首次进入时生成
      ballsDay: '',
      contents: {},
      overflowCount: 0,
      emotionsSeen: [],    // 情绪图鉴永久收录（跨满溢保留）
      tripleDoneDay: '',   // 小三元当日已触发判定日
      bonusBalls: [],      // 小三元返还的第 4 颗球
      milestoneGiven: [],  // 本瓶已发中途里程碑档位
    },
    // 漂流瓶（情绪瓶「向外」的一半：放流心事 / 捞起陌生人暖语，纯单机模拟）
    driftBottle: {
      driftedOutDay: '',
      driftedOutUsed: 0,
      driftedOutTotal: 0,
      pickedDay: '',
      pickedUsed: 0,
      pickedTotal: 0,
      archiveCount: 0,
      inbox: [],
    },
    // 5个法器初始未装备（02-全局常量 L46-L51 法器清单）
    artifacts: [
      { id: 'bell',    level: 1, equipped: false, fragments: 0 },
      { id: 'bowl',    level: 1, equipped: false, fragments: 0 },
      { id: 'amulet',  level: 1, equipped: false, fragments: 0 },
      { id: 'flute',   level: 1, equipped: false, fragments: 0 },
      { id: 'wheel',   level: 1, equipped: false, fragments: 0 },
    ],
    // 已解锁法器记录（驱动"首次解锁"庆祝卡；老存档首次进游戏时会补齐已达成项而不弹卡）
    unlockedArtifacts: [] as ArtifactId[],
    activeBuff: { type: null, rate: 0, expireAt: 0 },
    // 神龛（01-全局规则 模块3 / 02-全局常量 三）
    shrine: {
      deity: 'wealth',
      firstIncenseDay: '',
      coupons: 0,
      wishes: [],
      incenseCount: 0,
    },
    dailyLimits: {
      legendaryWallpaperBought: 0,
      qiPotionBought: 0,
      freeWaterUsed: 0,
      paidWaterUsed: 0,
    },
    dailyLimitsDay: todayKey(), // 每日限购跨天重置判定基准
    galleryCount: 0,
    galleryUnlocked: [...DEFAULT_UNLOCKED],
    galleryFreeDate: '',
    galleryFreeIds: [],
    galleryFreeTheme: '',
    galleryHiddenCelebrated: false,
    unlockedPlots: 1, // 已解锁地块数（01-L33：默认解锁1块；本地无"锁定"字段，以此驱动）
    shrineOffersToday: 0,
    shrineOffersDay: todayKey(),
    musicTracks: makeDefaultTracks(),
    petConfig: buildDefaultPetConfig(), // 仙宠配置态（后台 pet.json 覆盖，运行态进度不在此）
    shrineConfig: buildDefaultShrineConfig(), // 神龛配置态（后台 shrine.json 覆盖，运行态进度不在此）
    artifactConfig: buildDefaultArtifactsConfig(), // 法器配置态（后台 artifacts.json 覆盖，运行态进度不在此）
    bottleConfig: buildDefaultBottleConfig(), // 情绪瓶配置态（后台 bottle.json 覆盖，运行态进度不在此）
    farmConfig: buildDefaultFarmConfig(), // 灵田配置态（后台 farm.json 覆盖，运行态进度不在此）
    raceConfig: buildDefaultRaceConfig(), // 竞速配置态（后台 race.json 覆盖，运行态进度不在此）
    checkinConfig: buildDefaultCheckinConfig(), // 签到配置态（后台 checkin.json 覆盖，运行态进度不在此）
    poolConfig: buildDefaultPoolConfig(), // 素材池配置态（后台 pool.json 覆盖：头像库 / 起名词库 / 五行底环色）
    musicListenSeconds: 0,
    musicClaimedMilestones: [],
    musicTag: false,
    // 待庆祝的新解锁法器队列（运行时，不持久化）：页面弹完一张庆祝卡后 shift
    pendingArtifactUnlocks: [] as ArtifactId[],
    // 法器解锁成就进度（02-法器清单：收获/在线/守护计数驱动解锁）
    artifactProgress: { harvest: 0, onlineSec: 0, defend: 0 },
    // 灵植·拜访（每日一次；刷新不重复刷，联机后天然防重复）
    visitedFriendIds: [] as number[],
    visitClaimsDay: '',
    // 演示苗仅首进播种一次，避免刷新循环补苗刷 common 收益
    farmDemoDone: false,
    // 灵植彩蛋第2/3批：繁荣度 / 连击 / 图鉴 / 风水阵
    farmProsperity: 0,
    harvestCombo: 0,
    lastHarvestTs: 0,
    seedSeen: [] as CropId[],
    farmFormation: '',
  }),

  actions: {
    /** 跨天重置（由userStore.ensureDailyReset同步触发）*/
    ensureDailyReset() {
      const today = todayKey();
      // 神龛次数按dayKey重置（project_memory硬性规则）
      if (this.shrineOffersDay !== today) {
        this.shrineOffersDay = today;
        this.shrineOffersToday = 0;
      }
      // 情绪瓶每日投入次数重置 + 今日球刷新/旧数据补齐（02-全局常量 L76）
      this.normalizeBottle();
      // 商店每日限购重置（按天判定：仅跨天时清零，避免路由跳转/点香误清导致每日上限失效）
      if (this.dailyLimitsDay !== today) {
        this.dailyLimitsDay = today;
        this.dailyLimits = {
          legendaryWallpaperBought: 0,
          qiPotionBought: 0,
          freeWaterUsed: 0,
          paidWaterUsed: 0,
        };
      }
      // 仙宠：每日成长任务跨天重置 + 旧持久化数据补齐新字段（petName/travelNotes/dailyTasks）
      this.normalizePet(today);
      // 仙宠离线饱食/愉悦衰减结算（每 6h 各 -20，旅行中不计）
      this.decayPet();
      // 法器解锁进度旧数据补齐（避免老存档缺字段）
      if (!this.artifactProgress || typeof this.artifactProgress !== 'object') {
        this.artifactProgress = { harvest: 0, onlineSec: 0, defend: 0 };
      } else {
        const p = this.artifactProgress as Record<string, any>;
        if (typeof p.harvest !== 'number') p.harvest = 0;
        if (typeof p.onlineSec !== 'number') p.onlineSec = 0;
        if (typeof p.defend !== 'number') p.defend = 0;
      }
      // 老存档补齐：把已达成的法器记入 unlockedArtifacts，但不补弹历史成就的庆祝卡
      if (!Array.isArray(this.unlockedArtifacts)) this.unlockedArtifacts = [];
      this.checkArtifactUnlocks(true);
      this.normalizeGallery();
      this.normalizeFarm();
    },

    /** 灵植彩蛋字段老存档补齐（确保地力/繁荣度/连击/图鉴/风水阵平滑升级） */
    normalizeFarm() {
      if (typeof this.farmProsperity !== 'number') this.farmProsperity = 0;
      if (typeof this.harvestCombo !== 'number') this.harvestCombo = 0;
      if (typeof this.lastHarvestTs !== 'number') this.lastHarvestTs = 0;
      if (!Array.isArray(this.seedSeen)) this.seedSeen = [] as CropId[];
      const els = this.farmElements;
      if (this.farmFormation !== '' && !els.includes(this.farmFormation)) this.farmFormation = '';
      for (const p of this.plots) {
        if (typeof p.fertility !== 'number') p.fertility = this.farmConfig.fertility.start;
        if (p.lastCropElement !== null && !els.includes(p.lastCropElement as ElementType)) p.lastCropElement = null;
      }
    },

    /* ---------- 画境（Gallery）---------- 01-L20 / 02-L12-18 / 08-L306 ---------- */
    /** 老存档补齐：缺字段则初始化，并同步 galleryCount = 已解锁数 */
    normalizeGallery() {
      const content = useContentStore();
      if (!Array.isArray(this.galleryUnlocked) || this.galleryUnlocked.length === 0) {
        this.galleryUnlocked = [...DEFAULT_UNLOCKED];
      }
      // 凡品（common）默认全解锁（用户 2026-08-26 决策）：补齐老存档未包含的凡品
      for (const w of content.wallpapers) {
        if (w.quality === 'common' && !this.galleryUnlocked.includes(w.id)) {
          this.galleryUnlocked.push(w.id);
        }
      }
      if (typeof this.galleryFreeDate !== 'string') this.galleryFreeDate = '';
      if (!Array.isArray(this.galleryFreeIds)) this.galleryFreeIds = [];
      if (this.galleryFreeTheme !== '' && !['gold', 'wood', 'water', 'fire', 'earth'].includes(this.galleryFreeTheme)) this.galleryFreeTheme = '';
      if (typeof this.galleryHiddenCelebrated !== 'boolean') this.galleryHiddenCelebrated = false;
      // 老档若已集齐隐藏壁纸，直接置为已庆祝，避免新逻辑误弹
      if (content.hiddenWallpapers.every((w) => this.galleryUnlocked.includes(w.id))) this.galleryHiddenCelebrated = true;
      if (!Array.isArray(this.visitedFriendIds)) this.visitedFriendIds = [];
      if (typeof this.visitClaimsDay !== 'string') this.visitClaimsDay = '';
      if (typeof this.farmDemoDone !== 'boolean') this.farmDemoDone = false;
      this.galleryCount = this.galleryUnlocked.length;
    },

    /**
     * 天籁曲库接内容层（2026-09-04 打通 wired:false→true）：
     * 把 contentStore 的 remoteMusic（后台目录）合进运行时 musicTracks。
     * - 目录字段（name/src/duration/解锁费/里程碑/标签/分类/歌单归属等）以后台为准
     * - 用户解锁进度 isUnlocked 按 id 保留，不被后台覆盖丢失
     * - 后台新增曲目自动出现；后台删除的曲目从运行时移除
     */
    syncMusicFromContent() {
      const remote = useContentStore().remoteMusic;
      if (!Array.isArray(remote) || !remote.length) return;
      const prev = new Map(this.musicTracks.map((t) => [t.id, t]));
      this.musicTracks = remote.map((r) => ({
        ...r,
        isUnlocked: prev.has(r.id) ? prev.get(r.id)!.isUnlocked : (r.isUnlocked ?? false),
      }));
    },
    /** 仙宠配置合并：仅覆盖配置态（params/pets/foods/travels），绝不回写 IPet 进度（铁律#13 向后兼容自愈） */
    syncPetFromContent() {
      const remote = useContentStore().remotePet;
      if (!remote || typeof remote !== 'object') return;
      const base = this.petConfig;
      const elements = Array.isArray(remote.elements) && remote.elements.length ? remote.elements : base.elements;
      const params = remote.params && typeof remote.params === 'object' ? { ...base.params, ...remote.params } : base.params;
      const pets = Array.isArray(remote.pets) && remote.pets.length
        ? remote.pets.map((p: any) => normalizePet(p, base.petMap[p?.element]))
        : base.pets;
      const foods = Array.isArray(remote.foods) && remote.foods.length ? remote.foods : base.foods;
      const travels = Array.isArray(remote.travels) && remote.travels.length
        ? remote.travels.map((t: any) => normalizeTravel(t, base.travelMap[t?.id]))
        : base.travels;
      const petMap: Record<string, PetCfg> = {};
      (pets as PetCfg[]).forEach((p) => (petMap[p.element] = p));
      const travelMap: Record<string, TravelCfg> = {};
      (travels as TravelCfg[]).forEach((t) => (travelMap[t.id] = t));
      this.petConfig = { elements, params, pets, foods, travels, petMap, travelMap };
    },

    /**
     * 神龛配置合并：仅覆盖配置态（params/incenses/deities/fortunes/almanac），绝不回写 IShrineState 进度（铁律#13 向后兼容自愈）
     * 后台 shrine.json 缺字段时逐项对齐 buildDefaultShrineConfig 兜底，保证旧部署/空配置不白屏。
     */
    syncShrineFromContent() {
      const remote = useContentStore().remoteShrine;
      if (!remote || typeof remote !== 'object') return;
      const base = this.shrineConfig;
      const params = remote.params && typeof remote.params === 'object'
        ? {
            buffCeil: typeof remote.params.buffCeil === 'number' ? remote.params.buffCeil : base.params.buffCeil,
            incenseQiCost: typeof remote.params.incenseQiCost === 'number' ? remote.params.incenseQiCost : base.params.incenseQiCost,
            fortuneQiCost: typeof remote.params.fortuneQiCost === 'number' ? remote.params.fortuneQiCost : base.params.fortuneQiCost,
            firstIncenseReward: typeof remote.params.firstIncenseReward === 'number' ? remote.params.firstIncenseReward : base.params.firstIncenseReward,
            couponValueGold: typeof remote.params.couponValueGold === 'number' ? remote.params.couponValueGold : base.params.couponValueGold,
            pressMs: typeof remote.params.pressMs === 'number' ? remote.params.pressMs : base.params.pressMs,
            maxWishes: typeof remote.params.maxWishes === 'number' ? remote.params.maxWishes : base.params.maxWishes,
            firstRewardCurrencies: Array.isArray(remote.params.firstRewardCurrencies) && remote.params.firstRewardCurrencies.length
              ? remote.params.firstRewardCurrencies
              : base.params.firstRewardCurrencies,
          }
        : base.params;
      const baseIncenseMap = toIncenseMap(base.incenses);
      const incenses = Array.isArray(remote.incenses) && remote.incenses.length
        ? remote.incenses.map((c: any) => normalizeIncense(c, baseIncenseMap[c?.type]))
        : base.incenses;
      const baseDeityMap = toDeityMap(base.deities);
      const deities = Array.isArray(remote.deities) && remote.deities.length
        ? remote.deities.map((d: any) => normalizeDeity(d, baseDeityMap[d?.id]))
        : base.deities;
      const fortunes = Array.isArray(remote.fortunes) && remote.fortunes.length ? remote.fortunes.map((f: any) => ({ rank: f?.rank ?? '', text: f?.text ?? '', emoji: f?.emoji ?? '🪙' })) : base.fortunes;
      const almanac = (remote.almanac && typeof remote.almanac === 'object')
        ? {
            yi: Array.isArray(remote.almanac.yi) && remote.almanac.yi.length ? remote.almanac.yi : base.almanac.yi,
            ji: Array.isArray(remote.almanac.ji) && remote.almanac.ji.length ? remote.almanac.ji : base.almanac.ji,
            yiDeity: (remote.almanac.yiDeity && typeof remote.almanac.yiDeity === 'object') ? remote.almanac.yiDeity : base.almanac.yiDeity,
          }
        : base.almanac;
      this.shrineConfig = { params, incenses, deities, fortunes, almanac };
    },

    /**
     * 法器配置合并：仅覆盖配置态（params/artifacts），绝不回写 IArtifact 进度（铁律#13 向后兼容自愈）
     * 后台 artifacts.json 缺字段时逐项对齐 buildDefaultArtifactsConfig 兜底，保证旧部署/空配置不白屏。
     */
    syncArtifactsFromContent() {
      const remote = useContentStore().remoteArtifacts;
      if (!remote || typeof remote !== 'object') return;
      const base = this.artifactConfig;
      const params = (remote.params && typeof remote.params === 'object')
        ? {
            maxLevel: typeof remote.params.maxLevel === 'number' ? remote.params.maxLevel : base.params.maxLevel,
            upgradeFrag: typeof remote.params.upgradeFrag === 'number' ? remote.params.upgradeFrag : base.params.upgradeFrag,
            fragPerDrop: typeof remote.params.fragPerDrop === 'number' ? remote.params.fragPerDrop : base.params.fragPerDrop,
          }
        : base.params;
      const baseMap = toArtifactMap(base.artifacts);
      const artifacts = Array.isArray(remote.artifacts) && remote.artifacts.length
        ? remote.artifacts.map((c: any) => normalizeArtifact(c, baseMap[c?.id]))
        : base.artifacts;
      this.artifactConfig = { params, artifacts };
    },

    /**
     * 灵田配置合并：仅覆盖配置态（作物/加成/彩蛋/价目），绝不回写地块进度与繁荣度（铁律#13 向后兼容自愈）
     * 后台 farm.json 缺字段时逐项对齐 buildDefaultFarmConfig 兜底，保证旧部署/空配置不白屏。
     */
    syncFarmFromContent() {
      const remote = useContentStore().remoteFarm;
      if (!remote || typeof remote !== 'object') return;
      const base = this.farmConfig;

      const num = (v: any, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);
      const str = (v: any, d: string): string => (typeof v === 'string' ? v : d);

      // 元素 / 品质（结构固定：5 元素 × 3 品质，标签可改）
      const elements = Array.isArray(remote.elements) && remote.elements.length
        ? remote.elements.map((e: any, i: number) => ({ id: str(e?.id, base.elements[i]?.id ?? ''), label: str(e?.label, base.elements[i]?.label ?? '') })).filter((e: any) => e.id)
        : base.elements;
      const qualities = Array.isArray(remote.qualities) && remote.qualities.length
        ? remote.qualities.map((q: any, i: number) => ({ id: str(q?.id, base.qualities[i]?.id ?? ''), label: str(q?.label, base.qualities[i]?.label ?? '') })).filter((q: any) => q.id)
        : base.qualities;

      // 15 作物：逐项兜底，quotes 至少保留一句避免出现空白语录
      const crops: FarmCropCfg[] = Array.isArray(remote.crops) && remote.crops.length
        ? remote.crops.map((c: any) => {
            const src = base.crops.find((x) => x.id === c?.id) || base.crops[0];
            return {
              id: str(c?.id, src?.id ?? ''),
              name: str(c?.name, src?.name ?? ''),
              element: str(c?.element, src?.element ?? ''),
              quality: str(c?.quality, src?.quality ?? ''),
              emoji: str(c?.emoji, src?.emoji ?? '🌱'),
              image: typeof c?.image === 'string' ? c.image : '',
              growSec: num(c?.growSec, src?.growSec ?? 0),
              base: {
                gold: num(c?.base?.gold, src?.base?.gold ?? 0),
                pearl: num(c?.base?.pearl, src?.base?.pearl ?? 0),
                magic: c?.base?.magic === undefined ? src?.base?.magic : num(c.base.magic, 0),
              },
              exp: num(c?.exp, src?.exp ?? 0),
              jadeChance: num(c?.jadeChance, src?.jadeChance ?? 0),
              quotes: Array.isArray(c?.quotes) && c.quotes.length ? c.quotes.filter((s: any) => typeof s === 'string') : [...(src?.quotes || ['……'])],
            };
          })
        : base.crops;

      // 彩蛋池（天象/变异/奇遇）可增删
      const weathers: FarmWeatherCfg[] = Array.isArray(remote.weathers)
        ? remote.weathers.filter((w: any) => w && typeof w.key === 'string').map((w: any) => ({
            key: w.key, icon: str(w.icon, '✨'), name: str(w.name, w.key),
            desc: str(w.desc, ''), bonus: num(w.bonus, 0), jadeExtra: num(w.jadeExtra, 0),
          }))
        : base.weathers;
      const variants: FarmVariantCfg[] = Array.isArray(remote.variants)
        ? remote.variants.filter((v: any) => v && typeof v.key === 'string').map((v: any) => ({
            key: v.key, label: str(v.label, v.key), rate: num(v.rate, 0),
          }))
        : base.variants;
      const luckyEvents: FarmLuckyEventCfg[] = Array.isArray(remote.luckyEvents)
        ? remote.luckyEvents.filter((e: any) => e && typeof e.text === 'string').map((e: any) => ({
            emoji: str(e.emoji, '🎁'), text: e.text,
            gold: num(e.gold, 0), pearl: num(e.pearl, 0), magic: num(e.magic, 0),
          }))
        : base.luckyEvents;

      // 价目表：按 base 的键集合逐项兜底，允许后台增删币种
      const mergePrice = (remoteObj: any, defaultObj: Record<string, Record<string, number>>): Record<string, Record<string, number>> => {
        const out: Record<string, Record<string, number>> = {};
        const keys = new Set([...Object.keys(defaultObj), ...Object.keys(remoteObj && typeof remoteObj === 'object' ? remoteObj : {})]);
        for (const k of keys) {
          const r = remoteObj?.[k];
          out[k] = r && typeof r === 'object' ? { ...(defaultObj[k] || {}), ...r } : { ...(defaultObj[k] || {}) };
        }
        return out;
      };
      const remoteShop = remote.shop && typeof remote.shop === 'object' ? remote.shop : {};
      const shop = {
        seed: mergePrice(remoteShop.seed, base.shop.seed),
        petFood: mergePrice(remoteShop.petFood, base.shop.petFood),
        petUnlock: typeof remoteShop.petUnlock === 'object' && remoteShop.petUnlock ? { ...base.shop.petUnlock, ...remoteShop.petUnlock } : base.shop.petUnlock,
        water: typeof remoteShop.water === 'object' && remoteShop.water ? { ...base.shop.water, ...remoteShop.water } : base.shop.water,
      };

      this.farmConfig = {
        elements,
        qualities,
        crops,
        fiveEngender: remote.fiveEngender && typeof remote.fiveEngender === 'object' ? { ...base.fiveEngender, ...remote.fiveEngender } : base.fiveEngender,
        fiveRestrain: remote.fiveRestrain && typeof remote.fiveRestrain === 'object' ? { ...base.fiveRestrain, ...remote.fiveRestrain } : base.fiveRestrain,
        elementBonus: remote.elementBonus && typeof remote.elementBonus === 'object' ? { ...base.elementBonus, ...remote.elementBonus } : base.elementBonus,
        fengshuiMainBonus: num(remote.fengshuiMainBonus, base.fengshuiMainBonus),
        fengshuiEngenderBonus: num(remote.fengshuiEngenderBonus, base.fengshuiEngenderBonus),
        codexElementBonus: num(remote.codexElementBonus, base.codexElementBonus),
        fertility: {
          max: num(remote.fertility?.max, base.fertility.max),
          start: num(remote.fertility?.start, base.fertility.start),
          rotateGain: num(remote.fertility?.rotateGain, base.fertility.rotateGain),
          repeatPenalty: num(remote.fertility?.repeatPenalty, base.fertility.repeatPenalty),
          yieldCoef: num(remote.fertility?.yieldCoef, base.fertility.yieldCoef),
          repeatYieldPenalty: num(remote.fertility?.repeatYieldPenalty, base.fertility.repeatYieldPenalty),
        },
        prosperity: {
          max: num(remote.prosperity?.max, base.prosperity.max),
          perHarvest: num(remote.prosperity?.perHarvest, base.prosperity.perHarvest),
          rareBonus: num(remote.prosperity?.rareBonus, base.prosperity.rareBonus),
          yieldCoef: num(remote.prosperity?.yieldCoef, base.prosperity.yieldCoef),
          tiers: Array.isArray(remote.prosperity?.tiers) && remote.prosperity.tiers.length ? remote.prosperity.tiers.filter((t: any) => typeof t === 'number') : base.prosperity.tiers,
        },
        combo: {
          windowMs: num(remote.combo?.windowMs, base.combo.windowMs),
          perStep: num(remote.combo?.perStep, base.combo.perStep),
          cap: num(remote.combo?.cap, base.combo.cap),
        },
        moodThreshold: num(remote.moodThreshold, base.moodThreshold),
        moodBonus: num(remote.moodBonus, base.moodBonus),
        levelPerBonus: num(remote.levelPerBonus, base.levelPerBonus),
        weathers: weathers.length ? weathers : base.weathers,
        variants: variants.length ? variants : base.variants,
        luckyRate: num(remote.luckyRate, base.luckyRate),
        luckyEvents: luckyEvents.length ? luckyEvents : base.luckyEvents,
        bellFragChance: remote.bellFragChance && typeof remote.bellFragChance === 'object' ? { ...base.bellFragChance, ...remote.bellFragChance } : base.bellFragChance,
        paidWaterDailyLimit: num(remote.paidWaterDailyLimit, base.paidWaterDailyLimit),
        shop,
        currencyLabel: remote.currencyLabel && typeof remote.currencyLabel === 'object' ? { ...base.currencyLabel, ...remote.currencyLabel } : base.currencyLabel,
      };
    },

    /**
     * 竞速配置合并：仅覆盖配置态（场次/事件池/名次奖励/机器人名/安慰语录），绝不回写每日场次与战绩（铁律#13 向后兼容自愈）
     * 后台 race.json 缺字段时逐项对齐 buildDefaultRaceConfig 兜底，保证旧部署/空配置不白屏。
     */
    syncRaceFromContent() {
      const remote = useContentStore().remoteRace;
      if (!remote || typeof remote !== 'object') return;
      const base = this.raceConfig;
      const num = (v: any, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);
      const str = (v: any, d: string): string => (typeof v === 'string' ? v : d);
      const arr = <T,>(v: any): T[] => (Array.isArray(v) ? (v as T[]) : []);

      const events: RaceEvent[] = (arr<RaceEvent>(remote.events).filter((e) => e && typeof e.id === 'string' && typeof e.mult === 'number' && typeof e.durMs === 'number')
        .length ? arr<RaceEvent>(remote.events).filter((e) => e && typeof e.id === 'string' && typeof e.mult === 'number' && typeof e.durMs === 'number') : base.events);
      const targeted: TargetedEvent[] = (arr<TargetedEvent>(remote.targeted).filter((e) => e && typeof e.id === 'string' && (e.target === 'leader' || e.target === 'tail'))
        .length ? arr<TargetedEvent>(remote.targeted).filter((e) => e && typeof e.id === 'string' && (e.target === 'leader' || e.target === 'tail')) : base.targeted);
      const rankRewards: Record<number, RankReward> = remote.rankRewards && typeof remote.rankRewards === 'object'
        ? { ...base.rankRewards, ...remote.rankRewards } : base.rankRewards;
      const botNames = arr<string>(remote.botNames).filter((s) => typeof s === 'string' && s.length);
      const comfortLines = arr<string>(remote.comfortLines).filter((s) => typeof s === 'string' && s.length);

      this.raceConfig = {
        dailyFree: num(remote.dailyFree, base.dailyFree),
        paidCost: num(remote.paidCost, base.paidCost),
        paidDailyLimit: num(remote.paidDailyLimit, base.paidDailyLimit),
        cooldownMs: num(remote.cooldownMs, base.cooldownMs),
        baseSpeed: num(remote.baseSpeed, base.baseSpeed),
        maxMs: num(remote.maxMs, base.maxMs),
        dailyGoldCap: num(remote.dailyGoldCap, base.dailyGoldCap),
        dailyPearlCap: num(remote.dailyPearlCap, base.dailyPearlCap),
        trackOrder: (arr<string>(remote.trackOrder).filter((s) => typeof s === 'string' && s.length).length
          ? arr<string>(remote.trackOrder).filter((s) => typeof s === 'string' && s.length) : base.trackOrder) as ElementType[],
        engender: remote.engender && typeof remote.engender === 'object' ? { ...base.engender, ...remote.engender } : base.engender,
        restrain: remote.restrain && typeof remote.restrain === 'object' ? { ...base.restrain, ...remote.restrain } : base.restrain,
        events,
        targeted,
        eventEveryMs: num(remote.eventEveryMs, base.eventEveryMs),
        targetedEveryMs: num(remote.targetedEveryMs, base.targetedEveryMs),
        rankRewards,
        upsetBonus: remote.upsetBonus && typeof remote.upsetBonus === 'object' && typeof remote.upsetBonus.gold === 'number' ? { gold: remote.upsetBonus.gold } : base.upsetBonus,
        botNames: botNames.length ? botNames : base.botNames,
        comfortLines: comfortLines.length ? comfortLines : base.comfortLines,
        tracks: (arr<RaceTrackSkin>(remote.tracks).filter((t) => t && typeof t.id === 'string' && typeof t.speedMult === 'number' && typeof t.eventRateMult === 'number').length
          ? arr<RaceTrackSkin>(remote.tracks).filter((t) => t && typeof t.id === 'string' && typeof t.speedMult === 'number' && typeof t.eventRateMult === 'number')
          : base.tracks),
        weather: (arr<RaceWeather>(remote.weather).filter((w) => w && typeof w.id === 'string' && typeof w.speedMult === 'number' && typeof w.eventRateMult === 'number').length
          ? arr<RaceWeather>(remote.weather).filter((w) => w && typeof w.id === 'string' && typeof w.speedMult === 'number' && typeof w.eventRateMult === 'number')
          : base.weather),
        comboStep: num(remote.comboStep, base.comboStep),
        comboMax: num(remote.comboMax, base.comboMax),
        teamBuffMult: num(remote.teamBuffMult, base.teamBuffMult),
        opponentMode: (remote.opponentMode === 'online' || remote.opponentMode === 'bot' ? remote.opponentMode : base.opponentMode),
      };
    },

    /**
     * 签到配置合并：仅覆盖配置态（days/milestones/makeupCost），绝不回写签到进度（铁律#13 向后兼容自愈）
     * 后台 checkin.json 缺字段时逐项对齐 buildDefaultCheckinConfig 兜底，保证旧部署/空配置不白屏。
     */
    syncCheckinFromContent() {
      const remote = useContentStore().remoteCheckin;
      if (!remote || typeof remote !== 'object') return;
      const base = this.checkinConfig;
      const num = (v: any, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);
      const arr = <T,>(v: any): T[] => (Array.isArray(v) ? (v as T[]) : []);

      const days: CheckinDay[] = arr<CheckinDay>(remote.days).filter((d) => d && typeof d.day === 'number' && d.reward && typeof d.reward === 'object' && typeof d.quote === 'string');
      const milestones: CheckinMilestone[] = arr<CheckinMilestone>(remote.milestones).filter((m) => m && typeof m.days === 'number' && m.reward && typeof m.reward === 'object');

      this.checkinConfig = {
        days: days.length ? days : base.days,
        makeupCost: num(remote.makeupCost, base.makeupCost),
        milestones: milestones.length ? milestones : base.milestones,
      };
    },

    /**
     * 素材池合并：仅覆盖配置态（头像库 / 起名词库 / 五行底环色），绝不回写玩家头像与昵称（铁律#13 向后兼容自愈）
     * 后台 pool.json 缺字段时逐项对齐 buildDefaultPoolConfig 兜底，保证旧部署/空配置不白屏。
     */
    syncPoolFromContent() {
      const remote = useContentStore().remotePool;
      if (!remote || typeof remote !== 'object') return;
      const base = this.poolConfig;
      const arr = <T,>(v: any): T[] => (Array.isArray(v) ? (v as T[]) : []);

      const avatars: AvatarOption[] = (arr<AvatarOption>(remote.avatars).filter((a) => a && typeof a.emoji === 'string')
        .length ? arr<AvatarOption>(remote.avatars).filter((a) => a && typeof a.emoji === 'string')
        : base.avatars).map((a) => ({
        emoji: a.emoji,
        element: (a.element ?? 'wood') as ElementType,
        label: typeof a.label === 'string' ? a.label : '',
      }));
      const names = arr<string>(remote.names).filter((n) => typeof n === 'string' && n.length);
      const elementRing = remote.elementRing && typeof remote.elementRing === 'object'
        ? { ...base.elementRing, ...remote.elementRing } : base.elementRing;
      const defaultRing = remote.defaultRing && typeof remote.defaultRing === 'object'
        && typeof remote.defaultRing.from === 'string' && typeof remote.defaultRing.to === 'string'
        ? { from: remote.defaultRing.from, to: remote.defaultRing.to } : base.defaultRing;

      this.poolConfig = {
        avatars: avatars.length ? avatars : base.avatars,
        names: names.length ? names : base.names,
        elementRing,
        defaultRing,
      };
    },

    /** 随机一个头像（替代原 randomAvatar，均匀随机且不与上一次撞重复） */
    poolRandomAvatar(): AvatarOption {
      const pool = this.poolConfig.avatars && this.poolConfig.avatars.length ? this.poolConfig.avatars : [];
      if (!pool.length) return { emoji: '', element: 'wood', label: '' };
      let pick = pool[(Math.random() * pool.length) | 0];
      if (pool.length > 1) {
        let guard = 0;
        while (pick.emoji === _lastAvatarEmoji && guard++ < 10) pick = pool[(Math.random() * pool.length) | 0];
      }
      _lastAvatarEmoji = pick.emoji;
      return pick;
    },
    /** 随机赐名（替代原 randomName，均匀随机且不与上一次抽中相同） */
    poolRandomName(): string {
      const pool = this.poolConfig.names && this.poolConfig.names.length ? this.poolConfig.names : [];
      if (!pool.length) return '';
      if (pool.length === 1) return pool[0];
      let i = Math.floor(Math.random() * pool.length);
      while (i === _lastNameIndex) i = Math.floor(Math.random() * pool.length);
      _lastNameIndex = i;
      return pool[i];
    },

    /**
     * 情绪瓶配置合并：仅覆盖配置态（bottle/drift），绝不回写 emotionBottle/driftBottle 进度（铁律#13 向后兼容自愈）
     * 后台 bottle.json 缺字段时逐项对齐 buildDefaultBottleConfig 兜底，保证旧部署/空配置不白屏。
     */
    syncBottleFromContent() {
      const remote = useContentStore().remoteBottle;
      if (!remote || typeof remote !== 'object') return;
      const base = this.bottleConfig;
      const bottle = remote.bottle && typeof remote.bottle === 'object' ? remote.bottle : {};
      const drift = remote.drift && typeof remote.drift === 'object' ? remote.drift : {};

      const maxCapacity = typeof bottle.maxCapacity === 'number' ? bottle.maxCapacity : base.maxCapacity;
      const dailyLimit = typeof bottle.dailyLimit === 'number' ? bottle.dailyLimit : base.dailyLimit;
      const moodPerDrop = typeof bottle.moodPerDrop === 'number' ? bottle.moodPerDrop : base.moodPerDrop;
      const moodPerDriftOut = typeof bottle.moodPerDriftOut === 'number' ? bottle.moodPerDriftOut : base.moodPerDriftOut;
      const moodPerLetterRead = typeof bottle.moodPerLetterRead === 'number' ? bottle.moodPerLetterRead : base.moodPerLetterRead;
      const overflow = bottle.overflow && typeof bottle.overflow === 'object'
        ? {
            pearl: typeof bottle.overflow.pearl === 'number' ? bottle.overflow.pearl : base.overflow.pearl,
            magic: typeof bottle.overflow.magic === 'number' ? bottle.overflow.magic : base.overflow.magic,
            jadeChance: typeof bottle.overflow.jadeChance === 'number' ? bottle.overflow.jadeChance : base.overflow.jadeChance,
          }
        : base.overflow;
      const tripleLabel = typeof bottle.tripleLabel === 'string' ? bottle.tripleLabel : base.tripleLabel;
      const tripleThemeChance = typeof bottle.tripleThemeChance === 'number' ? bottle.tripleThemeChance : base.tripleThemeChance;
      const milestones = Array.isArray(bottle.milestones) && bottle.milestones.length
        ? bottle.milestones.map((m: any) => ({
            at: typeof m?.at === 'number' ? m.at : 10,
            pearl: typeof m?.pearl === 'number' ? m.pearl : 5,
            mood: typeof m?.mood === 'number' ? m.mood : 3,
            text: typeof m?.text === 'string' ? m.text : '',
          }))
        : base.milestones;
      const emotions = Array.isArray(bottle.emotions) && bottle.emotions.length
        ? bottle.emotions.map((e: any) => ({
            type: (e?.type ?? 'calm') as EmotionType,
            label: e?.label ?? '',
            emoji: e?.emoji ?? '❔',
            color: e?.color ?? '#999999',
            light: e?.light ?? '#eeeeee',
          }))
        : base.emotions;
      const bottleImage = typeof bottle.bottleImage === 'string' ? bottle.bottleImage : base.bottleImage;

      const sendDaily = typeof drift.sendDaily === 'number' ? drift.sendDaily : base.drift.sendDaily;
      const pickDaily = typeof drift.pickDaily === 'number' ? drift.pickDaily : base.drift.pickDaily;
      const inboxMax = typeof drift.inboxMax === 'number' ? drift.inboxMax : base.drift.inboxMax;
      const rewardChance = typeof drift.rewardChance === 'number' ? drift.rewardChance : base.drift.rewardChance;
      const rewardDoubleChance = typeof drift.rewardDoubleChance === 'number' ? drift.rewardDoubleChance : base.drift.rewardDoubleChance;
      const rewardPool = Array.isArray(drift.rewardPool) && drift.rewardPool.length
        ? drift.rewardPool.map((p: any) => ({
            kind: (p?.kind ?? 'gold') as 'gold' | 'magic' | 'pearl',
            weight: typeof p?.weight === 'number' ? p.weight : 1,
            min: typeof p?.min === 'number' ? p.min : 1,
            max: typeof p?.max === 'number' ? p.max : 1,
          }))
        : base.drift.rewardPool;
      const rewardMeta = drift.rewardMeta && typeof drift.rewardMeta === 'object' ? drift.rewardMeta : base.drift.rewardMeta;
      // 暖语库：合并键集合（后台缺某情绪则回落默认，避免前台取暖语时空指针）
      const warmWords: Record<string, DriftWarmGroup> = {};
      const baseWarmMap = base.drift.warmWords;
      const allKeys = new Set<string>([...Object.keys(baseWarmMap), ...Object.keys(drift.warmWords || {})]);
      allKeys.forEach((k) => {
        const r = (drift.warmWords || {})[k];
        const b = baseWarmMap[k];
        warmWords[k] = {
          resonate: Array.isArray(r?.resonate) && r.resonate.length ? r.resonate : (b?.resonate ?? []),
          lift: Array.isArray(r?.lift) && r.lift.length ? r.lift : (b?.lift ?? []),
        };
      });
      const generic = Array.isArray(drift.generic) && drift.generic.length ? drift.generic : base.drift.generic;

      this.bottleConfig = {
        maxCapacity, dailyLimit, moodPerDrop, moodPerDriftOut, moodPerLetterRead,
        overflow, tripleLabel, tripleThemeChance, milestones, emotions, bottleImage,
        drift: { sendDaily, pickDaily, inboxMax, rewardChance, rewardDoubleChance, rewardPool, rewardMeta, warmWords, generic },
      };
      // 容量/每日上限实时同步运行态（跨天 normalize 也会兜底）
      this.emotionBottle.maxCapacity = maxCapacity;
    },

    /** 每日首次进入画境：刷新 3 张免费缘份壁纸（01-L24）；含「今日缘定属性」——至少 2 张同属性，给收集期待 */
    refreshDailyFree() {
      const today = todayKey();
      if (this.galleryFreeDate === today && this.galleryFreeIds.length) return;
      const content = useContentStore();
      const locked = content.wallpapers.filter((w) => !this.galleryUnlocked.includes(w.id));
      const picked: string[] = [];
      const pool = [...locked];
      // 【优化A·今日缘定】从仍有库存的属性里随机定一个缘定属性，让 3 张里≥2 张同属性（可期待/可凑套）
      const themePool = GALLERY_ELEMENTS.filter((e) =>
        locked.some((w) => w.element === e.key),
      );
      let theme: ElementType | '' = '';
      if (themePool.length) {
        theme = themePool[Math.floor(Math.random() * themePool.length)].key;
        const sameEl = pool.filter((w) => w.element === theme);
        // 取 2 张缘定属性（不足则全取），再补 1 张异属性
        for (let k = 0; k < 2 && sameEl.length; k++) {
          const i = Math.floor(Math.random() * sameEl.length);
          picked.push(sameEl[i].id);
          pool.splice(pool.indexOf(sameEl[i]), 1);
          sameEl.splice(i, 1);
        }
      }
      while (picked.length < DAILY_FREE_COUNT && pool.length) {
        const i = Math.floor(Math.random() * pool.length);
        picked.push(pool[i].id);
        pool.splice(i, 1);
      }
      this.galleryFreeIds = picked;
      this.galleryFreeDate = today;
      this.galleryFreeTheme = theme;
    },
    /** 记录今日已拜访某好友菜地（每日一次模型：跨天重置 visitedFriendIds） */
    recordVisit(id: number) {
      const today = todayKey();
      if (this.visitClaimsDay !== today) {
        this.visitClaimsDay = today;
        this.visitedFriendIds = [];
      }
      if (!this.visitedFriendIds.includes(id)) this.visitedFriendIds.push(id);
    },
    /** 今日是否已拜访某好友（驱动 UI 红点 / 按钮态） */
    hasVisitedToday(id: number): boolean {
      return this.visitClaimsDay === todayKey() && this.visitedFriendIds.includes(id);
    },

    /** 解锁/下载壁纸（02 定价 / 08-L315 限购；免费缘份壁纸不计费） */
    unlockWallpaper(id: string): { success: boolean; reason?: string; completedElement?: ElementType | '' } {
      const content = useContentStore();
      const wp = content.wallpapers.find((w) => w.id === id);
      if (!wp) return { success: false, reason: '壁纸不存在' };
      if (this.galleryUnlocked.includes(id)) return { success: false, reason: '已解锁' };
      const isFree = this.galleryFreeIds.includes(id) && this.galleryFreeDate === todayKey();
      if (wp.quality === 'legendary' && !isFree && this.dailyLimits.legendaryWallpaperBought >= LEGENDARY_DAILY_LIMIT) {
        return { success: false, reason: '今日仙品已达上限' };
      }
      const u = useUserStore();
      if (!isFree) {
        const p = u.purchase(wp.price);
        if (!p.ok) return { success: false, reason: '货币不足' };
      }
      this.galleryUnlocked.push(id);
      this.galleryCount = this.galleryUnlocked.length;
      if (wp.quality === 'legendary' && !isFree) this.dailyLimits.legendaryWallpaperBought += 1;
      // 【P2 快乐度】收藏即心境+1（收集愉悦）；若本次解锁「集齐某属性全套」再+2（合计+3）
      u.changeMood(1);
      let completedElement: ElementType | '' = '';
      const beforeBonus = this.elementBonus(wp.element);
      const afterBonus = this.elementBonus(wp.element);
      if (afterBonus > beforeBonus) {
        completedElement = wp.element;
        u.changeMood(2);
      }
      return { success: true, completedElement };
    },

    /** 集齐同属性全部某品质壁纸 → 对应灵植元宝产量加成（02-L16-18，分品质累加）
     *  【P2】纳入 ALL_WALLPAPERS（含隐藏壁纸），隐藏壁纸集齐也可贡献属性加成，消除"收集了却没反馈"断层 */
    elementBonus(element: ElementType): number {
      const quals: WallpaperQuality[] = ['common', 'uncommon', 'legendary'];
      let bonus = 0;
      for (const q of quals) {
        const content = useContentStore();
        const list = content.allWallpapers.filter((w) => w.element === element && w.quality === q);
        if (list.length && list.every((w) => this.galleryUnlocked.includes(w.id))) {
          bonus += GALLERY_QUALITY_BONUS[q];
        }
      }
      return bonus;
    },

    /**
     * 五行风水阵加成（灵植彩蛋第2批）：玩家每日自选一个「主生属性」farmFormation。
     * 该属性作物 +FENGSHUI_MAIN_BONUS，其相生属性（FIVE_ENGENDER[阵型]）作物 +FENGSHUI_ENGENDER_BONUS。
     */
    formationBonus(element: ElementType): number {
      const m = this.farmFormation;
      if (!m) return 0;
      if (m === element) return this.farmConfig.fengshuiMainBonus;
      if (this.farmConfig.fiveEngender[m] === element) return this.farmConfig.fengshuiEngenderBonus;
      return 0;
    },

    /**
     * 种子图鉴集齐加成（灵植彩蛋第3批）：同元素 3 品质全部收录 → 该属性灵植产出 +CODEX_ELEMENT_BONUS。
     */
    seedCodexBonus(element: ElementType): number {
      const seen = this.seedSeen.filter((id) => id.startsWith(`${element}-`));
      const allSeen = this.farmQualities.every((q) => seen.includes(`${element}-${q}` as CropId));
      return allSeen ? this.farmConfig.codexElementBonus : 0;
    },

    /* ---------- 神龛（Shrine）---------- 配置态：全部读 shrineConfig（后台 shrine.json 覆盖） */

    /** 高级神位是否已解锁（阈值全部取自已有持久化字段，零新增状态；配置来自 shrineConfig） */
    isDeityUnlocked(id: string): boolean {
      const u = this.shrineDeityMap[id]?.unlock;
      if (!u) return true; // 基础四神默认解锁
      const user = useUserStore();
      return (u.incenseCount ?? 0) <= this.shrine.incenseCount
        && (u.overflowCount ?? 0) <= this.emotionBottle.overflowCount
        && (u.jade ?? 0) <= user.jade;
    },

    /** 切换神位（基础四神 + 高级四神需解锁） */
    setDeity(id: string): boolean {
      if (!this.shrineDeityMap[id] || !this.isDeityUnlocked(id)) return false;
      this.shrine.deity = id;
      return true;
    },

    /**
     * 点燃香束：扣货币+灵气 → 神恩Buff（数值全部来自 shrineConfig）
     * 同一时间仅生效最高等级香火：更强神恩在身时拒绝
     * 附加：头香奖励（每日首次随机货币）/ 概率返还 / 必得上上签（每档香可配）
     */
    lightIncense(type: IncenseType): {
      ok: boolean; reason?: 'qi' | 'currency' | 'stronger';
      firstReward?: 'gold' | 'pearl' | 'magic' | 'jade'; refunded?: boolean;
      deityGift?: string;  // 基础神位小馈赠描述（页面 toast 用）
    } {
      this.ensureDailyReset();
      const cfg = this.shrineIncenseMap[type];
      if (!cfg) return { ok: false, reason: 'currency' };
      const user = useUserStore();
      const P = this.shrineConfig.params;
      // 神恩系数：高级神位乘在香品 buff 上（封顶红线见 params.buffCeil，软预警）
      const deity = this.shrineDeityMap[this.shrine.deity];
      const newRate = +(cfg.buff * (deity?.mult ?? 1)).toFixed(4);
      // 更强神恩判定：仅在 newRate ≤ 在身 rate 时拒绝（升级神位 / 换更高档香一律放行）
      if (this.activeBuff.type && this.activeBuff.expireAt > Date.now() && newRate <= this.activeBuff.rate) {
        return { ok: false, reason: 'stronger' };
      }
      if (user.qi < P.incenseQiCost) return { ok: false, reason: 'qi' };
      const p = user.purchase({ [cfg.cost.currency]: cfg.cost.amount } as Partial<Record<'gold' | 'pearl' | 'magic', number>>);
      if (!p.ok) return { ok: false, reason: 'currency' };

      user.changeQi(-P.incenseQiCost);
      this.activeBuff = { type, rate: newRate, expireAt: Date.now() + cfg.durationHours * 3600 * 1000 };
      this.shrine.incenseCount += 1;
      this.shrineOffersToday += 1; // 首页「今日上香 x 次」

      const res: { ok: boolean; firstReward?: 'gold' | 'pearl' | 'magic' | 'jade'; refunded?: boolean; deityGift?: string } = { ok: true };
      // 基础神位小馈赠（财神元宝/月老灵珠/文昌魔丸/药王心境）
      if (deity?.bonus) {
        if ('mood' in deity.bonus) {
          user.changeMood(deity.bonus.mood);
          res.deityGift = `${deity.name}赐福 心境 +${deity.bonus.mood}`;
        } else {
          user.changeCurrency(deity.bonus.currency, deity.bonus.amount);
          res.deityGift = `${deity.name}赐福 ${ { gold: '元宝', pearl: '灵珠', magic: '魔丸' }[deity.bonus.currency] } +${deity.bonus.amount}`;
        }
      }
      // 头香奖励（每日首次随机货币，池可配）
      const today = todayKey();
      if (this.shrine.firstIncenseDay !== today) {
        this.shrine.firstIncenseDay = today;
        const pool = (P.firstRewardCurrencies && P.firstRewardCurrencies.length ? P.firstRewardCurrencies : ['gold', 'pearl', 'magic', 'jade']) as ('gold' | 'pearl' | 'magic' | 'jade')[];
        const pick = pool[Math.floor(Math.random() * pool.length)];
        user.changeCurrency(pick, P.firstIncenseReward);
        res.firstReward = pick;
      }
      // 概率返还（原檀香 10%）
      if (cfg.refundRate && Math.random() < cfg.refundRate) {
        user.changeCurrency(cfg.cost.currency, cfg.cost.amount);
        res.refunded = true;
      }
      // 必得上上签（改为每档香可配开关，原龙涎香特例）
      if (cfg.guaranteeTop) this.shrine.coupons += 1;
      return res;
    },

    /** 求签（消耗灵气；抽到上上签入券包；数值来自 shrineConfig） */
    drawFortune(): { rank: string; text: string; emoji: string } | null {
      const user = useUserStore();
      if (user.qi < this.shrineConfig.params.fortuneQiCost) return null;
      user.changeQi(-this.shrineConfig.params.fortuneQiCost);
      const list = this.shrineConfig.fortunes;
      const f = list[Math.floor(Math.random() * list.length)];
      if (!f) return null;
      if (f.rank === '上上签') this.shrine.coupons += 1;
      return { rank: f.rank, text: f.text, emoji: f.emoji };
    },

    /** 上上签兑换元宝（数值来自 shrineConfig） */
    redeemCoupon(): boolean {
      if (this.shrine.coupons <= 0) return false;
      this.shrine.coupons -= 1;
      useUserStore().changeCurrency('gold', this.shrineConfig.params.couponValueGold);
      return true;
    },

    /** 心愿墙新增（上限来自 shrineConfig） */
    addWish(text: string): boolean {
      const t = text.trim();
      if (!t) return false;
      this.shrine.wishes.unshift({ text: t, ts: Date.now() });
      const max = this.shrineConfig.params.maxWishes || 20;
      if (this.shrine.wishes.length > max) this.shrine.wishes.length = max;
      return true;
    },

    /* ---------- 情绪瓶（Bottle） ---------- */

    /**
     * 情绪瓶规范化：旧持久化补齐新字段 + 跨天重置（今日球重新生成、次数归零）
     * 修复旧版 bug：todayUsed 原来无条件清零，导致路由每次跳转都白送 3 次投入
     */
    normalizeBottle(today = todayKey()) {
      const b = this.emotionBottle;
      // 容量/每日上限实时对齐配置（后台改容量即生效；跨天重置也兜底）
      b.maxCapacity = this.bottleConfig.maxCapacity;
      if (!Array.isArray(b.lastThreeEmotions)) b.lastThreeEmotions = [];
      if (!b.contents || typeof b.contents !== 'object') b.contents = {};
      if (typeof b.overflowCount !== 'number') b.overflowCount = 0;
      if (!Array.isArray(b.todayBalls)) b.todayBalls = [];
      // 【P0】新增字段补齐（老存档平滑升级，缺字段自愈）
      if (!Array.isArray(b.emotionsSeen)) b.emotionsSeen = [];
      if (typeof b.tripleDoneDay !== 'string') b.tripleDoneDay = '';
      if (!Array.isArray(b.bonusBalls)) b.bonusBalls = [];
      if (!Array.isArray(b.milestoneGiven)) b.milestoneGiven = [];
      if (b.ballsDay !== today) {
        b.ballsDay = today;
        b.todayUsed = 0;                 // 0点刷新每日次数
        b.dailyLimit = this.bottleConfig.dailyLimit; // 还原小三元的额外次数
        b.todayBalls = rollTodayBallsCfg(this.bottleConfig.emotions.map((e) => e.type), this.bottleConfig.tripleThemeChance); // 今日3颗随机情绪球（主题情绪机制）
        b.bonusBalls = [];               // 跨天清空小三元返还球
        b.lastThreeEmotions = [];        // 【P2】跨天清残留，避免昨天的小三元状态误导今天
      }
      if (!b.todayBalls.length) b.todayBalls = rollTodayBallsCfg(this.bottleConfig.emotions.map((e) => e.type), this.bottleConfig.tripleThemeChance);
    },

    /**
     * 投入一颗情绪球（03-8.2 drop）
     * 校验：今日次数未满 / 瓶未满溢；投入后液面上球、记 lastThree、心境+2（01-L14）
     * 小三元（02-L82）：当日投入3颗同表情 → 返还1次次数（当天可投4次），每瓶只触发1次
     */
    dropEmotion(type: EmotionType): {
      success: boolean;
      reason?: 'limit' | 'full';
      triple?: boolean;
      milestone?: { at: number; pearl: number; mood: number; text: string };
    } {
      this.normalizeBottle();
      const b = this.emotionBottle;
      // 【P3】先判满溢：瓶满时玩家真正该做的是「先领灵光」，比"今日次数用完"更该先说
      if (b.currentCount >= b.maxCapacity) return { success: false, reason: 'full' };
      if (b.todayUsed >= b.dailyLimit) return { success: false, reason: 'limit' };
      // 本次投放是否为「小三元返还的缘定球」：第 4 颗（todayUsed 已达今日球上限）且队列里确有缘定球
      const isBonusDrop = b.todayUsed >= b.todayBalls.length && b.bonusBalls.length > 0;
      b.todayUsed += 1;
      b.currentCount += 1;
      b.contents[type] = (b.contents[type] || 0) + 1;
      // 【P0】图鉴永久收录：与 contents 解耦，满溢清瓶不再把收集进度清零
      if (!b.emotionsSeen.includes(type)) b.emotionsSeen.push(type);
      b.lastThreeEmotions.push(type);
      if (b.lastThreeEmotions.length > 3) b.lastThreeEmotions.shift();
      useUserStore().changeMood(this.bottleConfig.moodPerDrop); // 投入情绪瓶提升心境（数值来自配置）
      // 【P0】小三元：连投 3 颗同表情 → 返还 1 次投入 + 追加 1 颗缘定之球（让返还真正可兑现）
      const today = todayKey();
      let triple = false;
      if (
        b.todayUsed >= 3
        && b.tripleDoneDay !== today          // 每日只触发一次，防连投同表情把投入次数刷爆
        && b.lastThreeEmotions.length === 3
        && b.lastThreeEmotions.every((e) => e === type)
      ) {
        triple = true;
        b.tripleDoneDay = today;
        b.dailyLimit += 1;
        b.bonusBalls.push(type); // 第 4 颗与触发表情相同：既是奖励，也让「缘定」有仪式感
      }
      // 【P0 修复】缘定球成功投入后消费队首，否则它会一直停在待投区、反复点报"今日已收满"
      if (isBonusDrop) b.bonusBalls.shift();
      // 【P1】中途里程碑：每投满 10 / 20 颗给一次「小灵光」，把长跑切成多段（档位全来自配置）
      let milestone: { at: number; pearl: number; mood: number; text: string } | null = null;
      for (const cfg of this.bottleConfig.milestones) {
        if (b.currentCount >= cfg.at && !b.milestoneGiven.includes(cfg.at)) {
          b.milestoneGiven.push(cfg.at);
          useUserStore().changeCurrency('pearl', cfg.pearl);
          useUserStore().changeMood(cfg.mood);
          milestone = { at: cfg.at, pearl: cfg.pearl, mood: cfg.mood, text: cfg.text };
          break;
        }
      }
      return { success: true, triple, milestone: milestone ?? undefined };
    },

    /**
     * 领取满溢「灵光乍现」（03-8.3 overflow-claim，02-L80）
     * 清空瓶子 → 灵珠30 + 魔丸10，30% 额外天玑1
     */
    claimBottleOverflow(): {
      success: boolean; reason?: 'notFull';
      pearl?: number; magic?: number; jade?: number; unlocks?: ArtifactId[];
    } {
      const b = this.emotionBottle;
      if (b.currentCount < b.maxCapacity) return { success: false, reason: 'notFull' };
      b.currentCount = 0;
      b.contents = {};
      b.lastThreeEmotions = [];
      b.milestoneGiven = [];   // 新瓶重新开始计中途里程碑
      b.overflowCount += 1;
      // 轮回珠碎片：每次满溢得 1 枚（P0-1 主题化产出，无需装备也可攒；数量来自配置 fragPerDrop）
      this.grantFragments('wheel', this.artifactConfig.params.fragPerDrop);
      // 【P2】取回本次新解锁的法器，让当前页能即时提示（旧版只入队，玩家在情绪瓶页毫无感知）
      const unlocks = this.syncArtifactUnlocks();
      b.dailyLimit = this.bottleConfig.dailyLimit; // 还原小三元的额外次数（来自配置）
      // 注意：emotionsSeen（情绪图鉴永久收录）不随清瓶重置 —— 收集进度只增不减
      const user = useUserStore();
      let pearl = this.bottleConfig.overflow.pearl;
      const magic = this.bottleConfig.overflow.magic;
      let jade = Math.random() < this.bottleConfig.overflow.jadeChance ? 1 : 0;
      // 轮回珠（法器）：满溢必得天玑×1，并按等级额外加灵珠（配置驱动：bottlePearl·flat 系数）
      const wheelEff = this.artifactEffect('bottlePearl');
      if (wheelEff.equipped) {
        jade = 1;
        pearl += wheelEff.add;
      }
      user.changeCurrency('pearl', pearl);
      user.changeCurrency('magic', magic);
      if (jade) user.changeCurrency('jade', jade);
      return { success: true, pearl, magic, jade, unlocks };
    },

    /* ---------- 漂流瓶（Drift）：情绪瓶「向外」的一半 ---------- */

    /** 漂流瓶规范化：旧持久化补齐新字段 + 跨天重置（放流/捞起次数归零） */
    normalizeDrift(today = todayKey()) {
      const d = this.driftBottle;
      if (typeof d.driftedOutUsed !== 'number') d.driftedOutUsed = 0;
      if (typeof d.driftedOutTotal !== 'number') d.driftedOutTotal = 0;
      if (typeof d.pickedUsed !== 'number') d.pickedUsed = 0;
      if (typeof d.pickedTotal !== 'number') d.pickedTotal = 0;
      if (typeof d.archiveCount !== 'number') d.archiveCount = 0;
      if (!Array.isArray(d.inbox)) d.inbox = [];
      if (d.driftedOutDay !== today) { d.driftedOutDay = today; d.driftedOutUsed = 0; }
      if (d.pickedDay !== today) { d.pickedDay = today; d.pickedUsed = 0; }
    },

    /** 推断用户近期主导情绪（用于捞起时匹配暖语）：优先待投/已投最近情绪，其次瓶内占比最高者 */
    recentEmotion(): EmotionType | null {
      const b = this.emotionBottle;
      const l3 = b.lastThreeEmotions;
      if (Array.isArray(l3) && l3.length) return l3[l3.length - 1];
      const entries = Object.entries(b.contents) as [EmotionType, number][];
      if (entries.length) return entries.sort((a, c) => c[1] - a[1])[0][0];
      return null;
    },

    /**
     * 放流一只漂流瓶（每日 1 次）
     * 写一句心事 + 选情绪，心境 +1；回执入信箱（标记已读，不触发红点）
     */
    sendDrift(emotion: EmotionType, text: string): { success: boolean; reason?: 'limit' | 'empty' } {
      this.normalizeDrift();
      const t = text.trim();
      if (!t) return { success: false, reason: 'empty' };
      if (this.driftBottle.driftedOutUsed >= this.bottleConfig.drift.sendDaily)
        return { success: false, reason: 'limit' };
      const msg: IDriftMessage = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        emotion,
        text: t,
        self: true,
        read: true,
        ts: Date.now(),
      };
      const d = this.driftBottle;
      d.inbox.unshift(msg);
      if (d.inbox.length > this.bottleConfig.drift.inboxMax) d.inbox.length = this.bottleConfig.drift.inboxMax;
      d.driftedOutUsed += 1;
      d.driftedOutTotal += 1;
      useUserStore().changeMood(this.bottleConfig.moodPerDriftOut);
      // 真·跨用户：推入公共瓶海（best-effort，不阻塞回执）
      void pushDriftToCloud(emotion, t);
      return { success: true };
    },

    /**
     * 捞起一只漂流瓶（每日 1 次）
     * 优先从 Supabase 公共瓶海随机取一只他人真实瓶子（真·跨用户）；
     * 未配置 / 离线 / 空海 / 超时 时降级为本机暖语库，行为不崩。
     */
    async pickDrift(): Promise<{ success: boolean; reason?: 'limit'; message?: IDriftMessage }> {
      this.normalizeDrift();
      if (this.driftBottle.pickedUsed >= this.bottleConfig.drift.pickDaily)
        return { success: false, reason: 'limit' };
      const cloud = await fetchRandomDriftFromCloud();
      let emotion: EmotionType | null;
      let text: string;
      let fromCloud = false;
      if (cloud) {
        emotion = DRIFT_EMOTION_SET.has(cloud.emotion) ? (cloud.emotion as EmotionType) : null;
        text = cloud.text;
        fromCloud = true;
      } else {
        emotion = this.recentEmotion();
        text = pickWarmWordCfg(emotion, this.bottleConfig.drift.warmWords, this.bottleConfig.drift.generic);
      }
      const msg: IDriftMessage = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        emotion: emotion ?? 'calm',
        text,
        self: false,
        read: false,
        ts: Date.now(),
        fromCloud,
      };
      const d = this.driftBottle;
      d.inbox.unshift(msg);
      if (d.inbox.length > this.bottleConfig.drift.inboxMax) d.inbox.length = this.bottleConfig.drift.inboxMax;
      d.pickedUsed += 1;
      d.pickedTotal += 1;
      return { success: true, message: msg };
    },

    /**
     * 读信：首次阅读标记已读、心境 +1，并按概率掉落「喜悦奖励」（元宝/魔丸/灵珠）写入 m.reward。
     * 返回掉落信息供 UI 播放动效；非首次读或自己放流的回执，reward 为空。
     */
    readDriftLetter(id: string): { firstRead: boolean; moodGained: number; reward: DriftReward[] } {
      const m = this.driftBottle.inbox.find((x) => x.id === id);
      if (!m) return { firstRead: false, moodGained: 0, reward: [] };
      if (m.read) return { firstRead: false, moodGained: 0, reward: m.reward ?? [] };
      m.read = true;
      const usr = useUserStore();
      usr.changeMood(this.bottleConfig.moodPerLetterRead);
      // 仅陌生人暖语会掉奖励（self 回执不掉）
      const reward: DriftReward[] = m.self ? [] : rollDriftRewardCfg(this.bottleConfig.drift);
      if (reward.length) {
        for (const r of reward) usr.changeCurrency(r.kind, r.amount);
        m.reward = reward;
      }
      return { firstRead: true, moodGained: this.bottleConfig.moodPerLetterRead, reward };
    },

    /** 切换珍藏：珍藏的留在「珍藏架」永久保存，取消则回归普通信 */
    favoriteDrift(id: string) {
      const m = this.driftBottle.inbox.find((x) => x.id === id);
      if (m) m.favorite = !m.favorite;
    },

    /** 归海：读过的信放归大海，从信箱移除并计数（只留「已拾起 N 只」的星痕） */
    archiveDrift(id: string) {
      const d = this.driftBottle;
      const idx = d.inbox.findIndex((x) => x.id === id);
      if (idx < 0) return;
      d.inbox.splice(idx, 1);
      d.archiveCount += 1;
    },

    /** 法器是否解锁（按成就进度动态推导，达成即永久解锁） */
    isArtifactUnlocked(id: ArtifactId | string): boolean {
      const cfg = this.artifactMap[id as string];
      if (!cfg) return false;
      switch (cfg.unlockKey) {
        case 'harvest': return this.artifactProgress.harvest >= cfg.unlockThreshold;
        case 'onlineSec': return this.artifactProgress.onlineSec >= cfg.unlockThreshold;
        case 'defend': return this.artifactProgress.defend >= cfg.unlockThreshold;
        case 'musicListen': return this.musicListenSeconds >= cfg.unlockThreshold;
        case 'overflow': return this.emotionBottle.overflowCount >= cfg.unlockThreshold;
      }
    },

    /** 装备/卸下（未解锁则忽略） */
    toggleEquip(id: ArtifactId) {
      const a = this.artifacts.find((x) => x.id === id);
      if (!a || !this.isArtifactUnlocked(id)) return;
      a.equipped = !a.equipped;
    },

    /** 升级：消耗碎片提升 1 级（满级 / 每级消耗均来自配置） */
    upgradeArtifact(id: ArtifactId): { success: boolean; reason?: string } {
      const a = this.artifacts.find((x) => x.id === id);
      if (!a) return { success: false, reason: 'notfound' };
      if (a.level >= this.artifactConfig.params.maxLevel) return { success: false, reason: 'max' };
      if (a.fragments < this.artifactConfig.params.upgradeFrag) return { success: false, reason: 'frag' };
      a.fragments -= this.artifactConfig.params.upgradeFrag;
      a.level += 1;
      return { success: true };
    },

    /**
     * 发放法器碎片（P0-1 主题化产出：每件法器从自己守护的版块获取）
     * 满级后不再累积，避免碎片无限溢出误导玩家。
     */
    grantFragments(id: ArtifactId, n: number) {
      if (n <= 0) return;
      const a = this.artifacts.find((x) => x.id === id);
      if (!a) return;
      if (a.level >= this.artifactConfig.params.maxLevel) return; // 已满级，不再囤积
      a.fragments += n;
    },

    /**
     * 检测「从未解锁 → 已解锁」的法器。
     * silent=true 只补齐记录不返回（老存档首次进入时避免补弹历史成就的庆祝卡）。
     */
    checkArtifactUnlocks(silent = false): ArtifactId[] {
      const fresh: ArtifactId[] = [];
      for (const c of this.artifactConfig.artifacts) {
        if (!this.isArtifactUnlocked(c.id)) continue;
        if (this.unlockedArtifacts.includes(c.id)) continue;
        this.unlockedArtifacts.push(c.id);
        if (!silent) fresh.push(c.id);
      }
      return fresh;
    },

    /** 各产出点调用：检测新解锁并入队待庆祝；返回本次新解锁（供调用方做即时提示） */
    syncArtifactUnlocks(): ArtifactId[] {
      const fresh = this.checkArtifactUnlocks();
      if (fresh.length) this.pendingArtifactUnlocks.push(...fresh);
      return fresh;
    },

    /** 消费一条待庆祝记录（页面弹完卡调用） */
    shiftPendingArtifactUnlock() {
      this.pendingArtifactUnlocks.shift();
    },

    /**
     * 累计在线秒数（P2：前后台都按真实时间计入，不再要求前台可见）
     * 每跨过 1 个整小时 → 聚灵碗碎片 +1
     */
    addOnlineSeconds(seconds: number) {
      if (seconds <= 0) return;
      const before = Math.floor(this.artifactProgress.onlineSec / 3600);
      this.artifactProgress.onlineSec += seconds;
      const after = Math.floor(this.artifactProgress.onlineSec / 3600);
      if (after > before) {
        this.grantFragments('bowl', after - before);
        this.syncArtifactUnlocks();
      }
    },

    /** 解锁曲目：扣对应货币（03-6.2 / 08 unlock；16 珠丸交替） */
    unlockMusicTrack(trackId: string): boolean {
      const track = this.musicTracks.find((t) => t.id === trackId);
      if (!track || track.isUnlocked) return false;
      const cost = track.unlockCost || {};
      const user = useUserStore();
      const p = user.purchase(cost);
      if (!p.ok) return false;
      track.isUnlocked = true;
      return true;
    },

    /**
     * 累计听歌秒数（03-6.3 heartbeat：每满300s由页面结算奖励）
     * P0-1：每跨过 1 个整小时 → 空灵笛碎片 +1（可重复，与里程碑的一次性奖励叠加）
     */
    addMusicListenSeconds(seconds: number) {
      if (seconds <= 0) return;
      const before = Math.floor(this.musicListenSeconds / 3600);
      this.musicListenSeconds += seconds;
      const after = Math.floor(this.musicListenSeconds / 3600);
      if (after > before) {
        this.grantFragments('flute', after - before);
        this.syncArtifactUnlocks();
      }
    },

    /**
     * 领取里程碑奖励（03-6.4 / 08 claim-milestone；2026-08-25 拍板扩为 5 档）
     * 0.25h → 灵珠x2；1h → 空灵笛碎片x1；4h → 解锁典藏曲·星辉长夜；
     * 12h → 空灵笛碎片x2；24h → 知音标签 + 天玑x1
     */
    claimMusicMilestone(hours: number): boolean {
      if (this.musicClaimedMilestones.includes(hours)) return false;
      if (this.musicListenSeconds / 3600 < hours) return false;
      this.musicClaimedMilestones.push(hours);
      if (hours === 0.25) {
        useUserStore().changeCurrency('pearl', 2);
      } else if (hours === 1) {
        this.grantFragments('flute', 1);
      } else if (hours === 4) {
        // 典藏曲「星辉·长夜」：由里程碑解锁，不可货币购买
        const feat = this.musicTracks.find((t) => t.milestoneHours === 4);
        if (feat) feat.isUnlocked = true;
      } else if (hours === 12) {
        this.grantFragments('flute', 2);
      } else if (hours === 24) {
        this.musicTag = true;
        useUserStore().changeCurrency('jade', 1);
      }
      return true;
    },

    /* ---------- 仙宠（Pet）---------- */

    /**
     * 仙宠字段规范化：补齐旧持久化缺失字段 + 每日任务跨天重置
     * 由 ensureDailyReset（启动/router.beforeEach）与各仙宠 action 兜底调用
     */
    normalizePet(today = todayKey()) {
      const pet = this.pet;
      if (!pet.units || typeof pet.units !== 'object') pet.units = {};
      for (const k of Object.keys(pet.units) as ElementType[]) {
        const u = pet.units[k]!;
        if (!u.petName) u.petName = '小灵灵';
        if (!Array.isArray(u.travelNotes)) u.travelNotes = [];
        if (!Array.isArray(u.travelNotesSeen)) u.travelNotesSeen = [];
        if (typeof u.lastDecayTimestamp !== 'number') u.lastDecayTimestamp = Date.now();
        if (u.travelStatus !== 'idle' && u.travelStatus !== 'traveling' && u.travelStatus !== 'returning') u.travelStatus = 'idle';
      }
      if (!pet.petName) pet.petName = '小灵灵';
      if (!Array.isArray(pet.travelNotes)) pet.travelNotes = [] as IPetTravelNote[];
      if (!Array.isArray(pet.travelNotesSeen)) pet.travelNotesSeen = [];
      // 每日魔丸加速次数跨天重置
      if (pet.travelSpeedUpDate !== today) {
        pet.travelSpeedUpDate = today;
        pet.travelSpeedUpCount = 0;
      }
      if (typeof pet.travelSpeedUpCount !== 'number') pet.travelSpeedUpCount = 0;
      if (typeof pet.travelChannel !== 'string') pet.travelChannel = 'food';
      if (typeof pet.travelCount !== 'number') pet.travelCount = 0;
      if (typeof pet.travelFirstDoubleDate !== 'string') pet.travelFirstDoubleDate = '';
      if (!pet.dailyTasks || pet.dailyTasks.date !== today) {
        pet.dailyTasks = { date: today, fed: false, stroked: false, traveled: false, claimed: false } as IPetDailyTasks;
      }
    },

    /* ============ 多宠独立：active ↔ units 状态交换 ============ */
    /** 从 active 抽取随身状态存入 units 池 */
    _snapshotUnit(p: IPet): IPetUnit {
      return {
        type: p.type, hunger: p.hunger, happiness: p.happiness,
        travelStatus: p.travelStatus, travelEndTimestamp: p.travelEndTimestamp,
        travelMode: p.travelMode, travelChannel: p.travelChannel,
        lastStrokeTimestamp: p.lastStrokeTimestamp, lastDecayTimestamp: p.lastDecayTimestamp,
        travelNote: p.travelNote, travelNoteTimestamp: p.travelNoteTimestamp,
        petName: p.petName, travelNotes: p.travelNotes, travelNotesSeen: p.travelNotesSeen,
      };
    },
    /** 把 units 中某宠随身状态载入 active */
    _loadUnit(u: IPetUnit) {
      const p = this.pet;
      p.type = u.type; p.hunger = u.hunger; p.happiness = u.happiness;
      p.travelStatus = u.travelStatus; p.travelEndTimestamp = u.travelEndTimestamp;
      p.travelMode = u.travelMode; p.travelChannel = u.travelChannel;
      p.lastStrokeTimestamp = u.lastStrokeTimestamp; p.lastDecayTimestamp = u.lastDecayTimestamp;
      p.travelNote = u.travelNote; p.travelNoteTimestamp = u.travelNoteTimestamp;
      p.petName = u.petName; p.travelNotes = u.travelNotes; p.travelNotesSeen = u.travelNotesSeen;
    },
    /** 目标宠物从未初始化时，给 active 重置为全新空闲状态 */
    _freshUnitFields(el: ElementType) {
      const p = this.pet;
      p.type = el; p.hunger = 100; p.happiness = 100; p.travelStatus = 'idle';
      p.travelEndTimestamp = 0; p.travelMode = null; p.travelChannel = 'food';
      p.lastStrokeTimestamp = 0; p.lastDecayTimestamp = Date.now();
      p.travelNote = null; p.travelNoteTimestamp = 0;
      p.travelNotes = []; p.travelNotesSeen = []; p.petName = '小灵灵';
    },
    /** 取某元素仙宠的随身状态（激活中读顶层，停放读 units，缺省给空闲满状态） */
    getUnit(el: ElementType): IPetUnit {
      const p = this.pet;
      if (el === p.type) return this._snapshotUnit(p);
      const u = p.units[el];
      if (u) return u;
      return {
        type: el, hunger: 100, happiness: 100, travelStatus: 'idle', travelEndTimestamp: 0,
        travelMode: null, travelChannel: 'food', lastStrokeTimestamp: 0, lastDecayTimestamp: Date.now(),
        travelNote: null, travelNoteTimestamp: 0, petName: '小灵灵', travelNotes: [], travelNotesSeen: [],
      };
    },

    /** 给宠物改名（玩家可在仙宠页点宠物名触发）：与玩家昵称同套校验
     *  — trim → 过滤零宽/控制字符 → 按码点 2~8 截断；空串/未定义回退默认名「小灵灵」。
     *  改名后比赛（RaceTrack/结算）自动显示宠物名，增强归属感与辨识度。 */
    setPetName(name: string | null) {
      const pet = this.pet;
      if (name === null) { pet.petName = '小灵灵'; return; }
      const trimmed = String(name).trim();
      const cleaned = trimmed.replace(/[\u200B-\u200D\uFEFF\u0000-\u001F\u007F]/g, '');
      const chars = Array.from(cleaned); // 按码点展开，兼容 emoji 不被拆半个
      if (chars.length === 0) { pet.petName = '小灵灵'; return; }
      // 下限 2 字由 UI 内联提示拦截；此处仅做上限截断（NICKNAME_MAX=8）
      pet.petName = chars.slice(0, NICKNAME_MAX).join('');
    },

    /** 记录每日成长任务进度（fed/stroked/traveled） */
    markPetDaily(key: 'fed' | 'stroked' | 'traveled') {
      this.normalizePet();
      const d = this.pet.dailyTasks;
      if (!d[key]) d[key] = true;
    },

    /** 领取每日成长奖励：三件事全完成 + 未领取 → +30 元宝 */
    claimPetDaily(): boolean {
      this.normalizePet();
      const d = this.pet.dailyTasks;
      if (d.claimed || !(d.fed && d.stroked && d.traveled)) return false;
      d.claimed = true;
      useUserStore().changeCurrency('gold', 30);
      return true;
    },

    /** 衰减结算：按真实时间戳实时流逝（HUNGER_DECAY_PER_MIN 点/分钟；旅行中暂停计时）
     *  — 2026-08-26 拍板：原「每 6h 才 -20 且仅动作触发」形同虚设，改为连续衰减，饱食度肉眼可见地下降 */
    decayPet() {
      const pet = this.pet;
      const now = Date.now();
      // 激活中（active）宠物：旅行中暂停衰减
      if (pet.travelStatus !== 'traveling') {
        const e = (now - pet.lastDecayTimestamp) / 60000;
        if (e > 0) {
          pet.hunger = Math.max(0, pet.hunger - e * this.petConfig.params.hungerDecayPerMin);
          pet.happiness = Math.max(0, pet.happiness - e * this.petConfig.params.hungerDecayPerMin * this.petConfig.params.hungerHappinessFactor);
          pet.lastDecayTimestamp = now;
        }
      }
      // 停放（非激活已解锁）宠物：各自独立衰减，旅行/归来中暂停
      for (const k of Object.keys(pet.units) as ElementType[]) {
        const u = pet.units[k]!;
        if (u.travelStatus === 'traveling' || u.travelStatus === 'returning') continue;
        const e = (now - u.lastDecayTimestamp) / 60000;
        if (e > 0) {
          u.hunger = Math.max(0, u.hunger - e * this.petConfig.params.hungerDecayPerMin);
          u.happiness = Math.max(0, u.happiness - e * this.petConfig.params.hungerDecayPerMin * this.petConfig.params.hungerHappinessFactor);
          u.lastDecayTimestamp = now;
        }
      }
    },

    /** 喂食：消耗背包食物 → 饱食度（干粮+20 / 精粮+35） */
    feedPet(type: PetFoodType): { success: boolean; gain?: number; reason?: string } {
      this.decayPet();
      const pet = this.pet;
      if (pet.travelStatus !== 'idle') return { success: false, reason: 'traveling' };
      if (pet.food[type] <= 0) return { success: false, reason: 'noFood' };
      if (pet.hunger >= 100) return { success: false, reason: 'full' };
      pet.food[type] -= 1;
      const gain = this.petConfig.foods.find((f) => f.type === type)?.hungerGain ?? (type === 'dry' ? 20 : 35);
      pet.hunger = Math.min(100, pet.hunger + gain);
      this.markPetDaily('fed'); // 每日成长：喂食 1 次
      return { success: true, gain };
    },

    /** 抚摸节奏：大满足冷却（原 3 小时过于漫长，治愈系陪伴应更频繁，改为 10 分钟） */
    strokePet(): { success: boolean; gain?: number; reason?: string; remainMs?: number; big?: boolean } {
      this.decayPet();
      const pet = this.pet;
      if (pet.travelStatus !== 'idle') return { success: false, reason: 'traveling' };
      const now = Date.now();
      const elapsed = now - pet.lastStrokeTimestamp;
      if (elapsed < this.petConfig.params.strokeCoolMs) {
        // 冷却中：轻摸小反馈——永远有回应，治愈不冷场（不刷数值、不计入每日任务）
        pet.happiness = Math.min(100, pet.happiness + this.petConfig.params.strokeGainSmall);
        return { success: true, gain: this.petConfig.params.strokeGainSmall, big: false };
      }
      pet.lastStrokeTimestamp = now;
      pet.happiness = Math.min(100, pet.happiness + this.petConfig.params.strokeGainBig);
      useUserStore().changeMood(this.petConfig.params.strokeMoodBig);
      this.markPetDaily('stroked'); // 每日成长：互动 1 次
      return { success: true, gain: 12, big: true };
    },

    /** 商店购买食物：优先取仙宠配置 petConfig.foods，缺失时回退集中价目表 farmConfig.shop.petFood */
    buyPetFood(type: PetFoodType): { success: boolean; reason?: string } {
      const user = useUserStore();
      const food = this.petConfig.foods.find((f) => f.type === type);
      const price = (food ? { [food.priceType]: food.price } : this.farmConfig.shop.petFood[type]) as any;
      const p = user.purchase(price);
      if (!p.ok) return { success: false, reason: 'noCurrency' };
      this.pet.food[type] += 1;
      return { success: true };
    },

    /**
     * 旅行出发：双通道
     * - `food` 携粮：消耗食物库存，**足时长**，保留该档「必得稀有物（天玑）」
     * - `magic` 魔丸时空加速：消耗 magicCost（**出发即扣、不返还**），时长压缩到 magicHours，
     *   但**放弃该档必得天玑**（见 claimPetTravel）。仅 ≥3h 长档开放，每日限 SPEED_UP_DAILY_LIMIT 次。
     *
     * 设计要点（2026-08-31 重做）：稀缺货币产出被永久锁在慢路径 → 加速只能买到软货币的时间，
     * 通胀风险归零；同时"要时间还是要收集"成为一次有意义的抉择，而非纯手续费。
     */
    startPetTravel(mode: TravelMode, channel: TravelChannel = 'food'): { success: boolean; hours?: number; reason?: string } {
      this.decayPet();
      this.normalizePet(); // 保证加速次数已按天重置
      const pet = this.pet;
      if (pet.travelStatus !== 'idle') return { success: false, reason: 'busy' };
      // 占用一致性：若当前正有仙宠在竞速中（赛跑锁定），禁止重叠出发旅行（防止赛跑+旅行同宠并发）
      if (useRaceStore().activeRacePet !== null) return { success: false, reason: 'racing' };
      // 太饿不能出发：先喂再走（2026-08-26 拍板：饱食度不再是摆设，饿了给硬约束）
      if (pet.hunger < this.petConfig.params.hungerTravelMin) return { success: false, reason: 'hungry' };
      // 渐进解锁：累计旅行次数不足则锁定
      if (!this.petConfig.travels.filter((c) => pet.travelCount >= c.unlockAt).map((c) => c.id).includes(mode)) return { success: false, reason: 'locked' };
      const cfg = this.petConfig.travelMap[mode];
      const user = useUserStore();
      let hours = cfg.hours;
      if (channel === 'food') {
        if (pet.food[cfg.food] <= 0) return { success: false, reason: 'noFood' };
        pet.food[cfg.food] -= cfg.foodQty;
      } else {
        // 闸2：短档不开放加速（等待感本就弱，且会被用来刷旅行次数/解锁进度）
        if (cfg.magicHours === undefined || cfg.magicCost === undefined) return { success: false, reason: 'noSpeedUp' };
        // 闸4：每日加速次数上限（软兜底）
        if (pet.travelSpeedUpCount >= this.petConfig.params.speedUpDailyLimit) return { success: false, reason: 'speedUpLimit' };
        const mp = user.purchase({ magic: cfg.magicCost });
        if (!mp.ok) return { success: false, reason: 'noMagic' }; // 直付不返还
        pet.travelSpeedUpCount += 1;
        hours = cfg.magicHours;
      }
      pet.travelStatus = 'traveling';
      pet.travelMode = mode;
      pet.travelChannel = channel;
      pet.travelEndTimestamp = Date.now() + Math.round(hours * 3600 * 1000);
      pet.lastDecayTimestamp = Date.now(); // 旅行中暂停衰减计时
      return { success: true, hours };
    },

    /**
     * 领取旅行奖励：五行匹配×1.15 + 每日首旅×1.5 + 灵动×1.1（可叠加）；概率天玑/隐藏壁纸；带回见闻。
     * 返回值刻意做成**结算卡所需的完整明细**（去了哪 / 加成因子 / 逐项收获 / 见闻），
     * 让归来从"一坨即逝的 toast"变成可回看的纪念品。
     */
    claimPetTravel(): {
      success: boolean;
      mode?: TravelMode; modeName?: string;
      rewards?: { gold: number; pearl: number; magic: number; jade: number };
      /** 加成明细：供结算卡逐条展示"为什么拿这么多" */
      bonus?: { element: boolean; firstDaily: boolean; lively: boolean; mult: number };
      /** 加速通道放弃了该档必得天玑（用于结算卡如实告知取舍代价） */
      jadeForgone?: number;
      note?: string;
      /** 本次见闻是否首次收录（图鉴新增 → 触发收集反馈） */
      noteIsNew?: boolean;
      seenCount?: number; totalNotes?: number;
      lively?: boolean; channel?: TravelChannel;
      hiddenWallpaper?: { id: string; name: string; emoji: string; quality: WallpaperQuality };
      /** 本次掉落使六张隐藏壁纸首次集齐（庆祝 + 心境+3 已在 store 施加） */
      hiddenComplete?: boolean;
      reason?: string;
    } {
      const pet = this.pet;
      if (pet.travelStatus !== 'traveling' && pet.travelStatus !== 'returning') {
        return { success: false, reason: 'notTraveling' };
      }
      if (Date.now() < pet.travelEndTimestamp) return { success: false, reason: 'notYet' };
      const mode = pet.travelMode as TravelMode;
      const channel = pet.travelChannel;
      const cfg = this.petConfig.travelMap[mode];
      const user = useUserStore();
      //  multipliers：五行匹配(目的地五行==宠物五行，混沌不参与) × 每日首旅 × 灵动
      let mult = 1;
      const elementMatch = cfg.element !== 'chaos' && pet.type === cfg.element;
      if (elementMatch) mult *= this.petConfig.params.multElement; // 五行匹配加成
      const today = todayKey();
      const firstDaily = pet.travelFirstDoubleDate !== today;
      if (firstDaily) { mult *= this.petConfig.params.multFirstDaily; pet.travelFirstDoubleDate = today; } // 每日首旅双倍
      const lively = pet.hunger + pet.happiness > this.petConfig.params.livelyThreshold;
      if (lively) mult *= this.petConfig.params.multLively; // 灵动状态
      const r = cfg.rewards;
      const gold = Math.floor(r.gold * mult);
      const pearl = Math.floor(r.pearl * mult);
      const magic = Math.floor(r.magic * mult);
      let jade = 0;
      // ⭐ 天玑取舍：**仅携粮通道**享该档必得（如太虚境×1）；魔丸加速通道主动放弃，只走概率。
      //    → 稀缺货币产出被永久锁在慢路径，加速无法刷取顶级货币（通胀风险归零）。
      const jadeForgone = channel === 'magic' ? (cfg.drops.jadeGuarantee || 0) : 0;
      if (channel === 'food' && cfg.drops.jadeGuarantee) jade += cfg.drops.jadeGuarantee;
      if (Math.random() < (cfg.drops.jadeChance || 0)) jade += 1;
      // 隐藏壁纸：概率掉落，从对应池里挑一张未拥有的
      const content = useContentStore();
      let hiddenWallpaper: { id: string; name: string; emoji: string; quality: WallpaperQuality } | undefined;
      let hiddenComplete = false;
      if (cfg.drops.hiddenChance && cfg.drops.hiddenPool && Math.random() < cfg.drops.hiddenChance) {
        const pool = content.hiddenWallpapers.filter(
          (w) => w.pool === cfg.drops.hiddenPool && !this.galleryUnlocked.includes(w.id),
        );
        if (pool.length) {
          const wp = pool[Math.floor(Math.random() * pool.length)];
          this.galleryUnlocked.push(wp.id);
          this.galleryCount = this.galleryUnlocked.length;
          hiddenWallpaper = { id: wp.id, name: wp.name, emoji: wp.emoji, quality: wp.quality };
          // 【P2 快乐度】本次掉落使隐藏壁纸首次集齐 → 标记全收集（庆祝由 PetPage 展示）
          if (!this.galleryHiddenCelebrated && content.hiddenWallpapers.every((w) => this.galleryUnlocked.includes(w.id))) {
            this.galleryHiddenCelebrated = true;
            hiddenComplete = true;
          }
        }
      }
      // 魔丸加速通道不再返还（旧版「冻结全额→返还」制造隐形门槛且 UI 只显示净耗，属误导，已取消）
      if (gold) user.changeCurrency('gold', gold);
      if (pearl) user.changeCurrency('pearl', pearl);
      if (magic) user.changeCurrency('magic', magic);
      if (jade) user.changeCurrency('jade', jade);
      // 见闻（按地分池，随机带回一句；写入历史上限 20 条 + 永久图鉴收录）
      const pool = cfg.notes;
      const noteIdx = Math.floor(Math.random() * pool.length);
      const note = pool[noteIdx];
      pet.travelNote = note;
      pet.travelNoteTimestamp = Date.now();
      pet.travelNotes.unshift({ text: note, timestamp: pet.travelNoteTimestamp, mode });
      if (pet.travelNotes.length > 20) pet.travelNotes.length = 20;
      // 图鉴收录（永久，不受历史 20 条上限影响）→ 给长线收集一个奔头
      if (!Array.isArray(pet.travelNotesSeen)) pet.travelNotesSeen = [];
      const seenKey = `${mode}:${noteIdx}`;
      const noteIsNew = !pet.travelNotesSeen.includes(seenKey);
      if (noteIsNew) pet.travelNotesSeen.push(seenKey);
      pet.travelStatus = 'idle';
      pet.travelMode = null;
      pet.travelEndTimestamp = 0;
      pet.lastDecayTimestamp = Date.now(); // 回家后重新计时衰减
      pet.travelCount += 1; // 累计完成次数（渐进解锁）
      this.markPetDaily('traveled'); // 每日成长：完成 1 次旅行
      const totalNotes = this.petConfig.travels.reduce((s, t) => s + (t.notes?.length || 0), 0);
      return {
        success: true,
        mode, modeName: cfg.name,
        rewards: { gold, pearl, magic, jade },
        bonus: { element: elementMatch, firstDaily, lively, mult },
        jadeForgone,
        note, noteIsNew,
        seenCount: pet.travelNotesSeen.length, totalNotes,
        lively, channel, hiddenWallpaper, hiddenComplete,
      };
    },

    /** 解锁新仙宠：2 天玑/只（02-六：额外解锁 2 天玑）；同时建独立状态 unit */
    unlockPet(element: ElementType): { success: boolean; reason?: string } {
      const pet = this.pet;
      if (pet.ownedPets.includes(element)) return { success: false, reason: 'owned' };
      const user = useUserStore();
      const p = user.purchase({ jade: this.petConfig.petMap[element].unlockJade });
      if (!p.ok) return { success: false, reason: 'noJade' };
      pet.ownedPets.push(element);
      if (!pet.units[element]) {
        pet.units[element] = {
          type: element, hunger: 100, happiness: 100, travelStatus: 'idle', travelEndTimestamp: 0,
          travelMode: null, travelChannel: 'food', lastStrokeTimestamp: 0, lastDecayTimestamp: Date.now(),
          travelNote: null, travelNoteTimestamp: 0, petName: '小灵灵', travelNotes: [], travelNotesSeen: [],
        };
      }
      return { success: true };
    },

    /** 切换当前陪伴宠物：保存当前 active 状态到 units，载入目标元素状态（多宠独立核心）
     *  — 旅行中不可切换（避免停放中的旅行宠难以结算）；饱食/愉悦/旅行随各自宠物独立保存。 */
    switchPet(element: ElementType) {
      const pet = this.pet;
      if (!pet.ownedPets.includes(element)) return false;
      if (pet.travelStatus !== 'idle') return false;
      if (element === pet.type) return true;
      pet.units[pet.type] = this._snapshotUnit(pet); // 存当前
      const u = pet.units[element];
      if (u) this._loadUnit(u);                      // 载入已有状态
      else this._freshUnitFields(element);           // 全新空闲
      return true;
    },

    /* ============ DEV 调试用（仅 ?debug=1 面板调用，生产不可达） ============ */
    /** 一键令所有生长中作物成熟（remaining->0, status->ready） */
    debugRipenAll() {
      for (const p of this.plots) {
        if (p.status === 'growing') { p.status = 'ready'; p.remainingSeconds = 0; p.isStealable = true; }
      }
    },
    /** 强制仙宠立即归来并结算奖励 */
    debugForcePetReturn() {
      const pet = this.pet;
      if (pet.travelStatus === 'traveling' || pet.travelStatus === 'returning') {
        pet.travelEndTimestamp = Date.now() - 1000;
        return this.claimPetTravel();
      }
      return { success: false, reason: 'notTraveling' };
    },
    /** 长周期快进：把进行中的旅行 / buff 剩余时间压缩到 ~1 秒 */
    debugFastForwardLong() {
      const pet = this.pet;
      if (pet.travelStatus === 'traveling') pet.travelEndTimestamp = Date.now() + 1000;
      if (this.activeBuff.type && this.activeBuff.expireAt > Date.now()) this.activeBuff.expireAt = Date.now() + 1000;
    },
    /** 神龛 buff 立即失效 */
    debugExpireBuff() { this.activeBuff.expireAt = Date.now(); },
    /** 神龛 buff 续期 1 小时 */
    debugRenewBuff() { if (this.activeBuff.type) this.activeBuff.expireAt = Date.now() + 3600 * 1000; },
    /** 强制跨天刷新（用户 + 模块每日重置） */
    debugDailyReset() {
      const user = useUserStore();
      user.lastDailyReset = '2000-01-01';
      user.ensureDailyReset();
      this.ensureDailyReset();
    },
    /** 图鉴全解锁（画境 / 仙宠 / 情绪 / 法器 / 天籁 / 神位） */
    debugUnlockAllCollections() {
      const user = useUserStore();
      const content = useContentStore();
      this.galleryUnlocked = content.wallpapers.map((w) => w.id);
      this.galleryCount = content.wallpapers.length;
      this.pet.ownedPets = [...this.petConfig.elements];
      for (const e of this.petConfig.elements) {
        if (!this.pet.units[e]) {
          this.pet.units[e] = {
            type: e, hunger: 100, happiness: 100, travelStatus: 'idle', travelEndTimestamp: 0,
            travelMode: null, travelChannel: 'food', lastStrokeTimestamp: 0, lastDecayTimestamp: Date.now(),
            travelNote: null, travelNoteTimestamp: 0, petName: '小灵灵', travelNotes: [], travelNotesSeen: [],
          };
        }
      }
      const contents: Record<string, number> = {};
      for (const e of this.bottleConfig.emotions) contents[e.type] = 1;
      this.emotionBottle.contents = contents;
      this.artifactProgress = { harvest: 1e9, onlineSec: 1e9, defend: 1e9 };
      this.musicListenSeconds = 1e9;
      this.musicTracks.forEach((t) => { t.isUnlocked = true; });
      this.emotionBottle.overflowCount = 1e9;
      this.shrine.incenseCount = 1e9;
      user.jade = 1e9;
      // 全解锁后把已达成的法器记入 unlockedArtifacts，避免随后补弹一堆历史成就卡
      this.checkArtifactUnlocks(true);
      this.pendingArtifactUnlocks = [];
    },
  },

  /** 信箱未读数（驱动首页消息 logo 红点） */
  getters: {
    /** 灵田：作物 id → cfg 映射（页面取名/emoji/产出用），后台改数值即时生效 */
    farmCropMap(state): Record<string, FarmCropCfg> {
      const m: Record<string, FarmCropCfg> = {};
      for (const c of state.farmConfig.crops) m[c.id] = c;
      return m;
    },
    /** 灵田：作物数组（图鉴遍历用） */
    farmCrops(state): FarmCropCfg[] {
      return state.farmConfig.crops || [];
    },
    /** 灵田：元素 id 列表 */
    farmElements(state): string[] {
      return (state.farmConfig.elements || []).map((e) => e.id);
    },
    /** 灵田：品质 id 列表 */
    farmQualities(state): string[] {
      return (state.farmConfig.qualities || []).map((q) => q.id);
    },
    /** 灵田：元素 id → 中文标签 */
    farmElementLabelMap(state): Record<string, string> {
      const m: Record<string, string> = {};
      for (const e of state.farmConfig.elements || []) m[e.id] = e.label;
      return m;
    },
    /** 灵田：品质 id → 中文标签 */
    farmQualityLabelMap(state): Record<string, string> {
      const m: Record<string, string> = {};
      for (const q of state.farmConfig.qualities || []) m[q.id] = q.label;
      return m;
    },
    /**
     * 灵田：品质 → 种子数值配置（原 SEED_CONFIG）。
     * 【重要】这是**派生值**：同品质各元素作物数值一致，取首个同品质作物为代表，
     * cost 取 farmConfig.shop.seed。改造后不落盘，后台改作物数值/价目即时生效。
     */
    farmSeedConfig(state): Record<string, {
      cost: Record<string, number>;
      growSec: number;
      base: { gold: number; pearl: number; magic?: number };
      exp: number;
      jadeChance: number;
    }> {
      const out: Record<string, {
        cost: Record<string, number>;
        growSec: number;
        base: { gold: number; pearl: number; magic?: number };
        exp: number;
        jadeChance: number;
      }> = {};
      for (const q of state.farmConfig.qualities || []) {
        const rep = (state.farmConfig.crops || []).find((c) => c.quality === q.id);
        out[q.id] = {
          cost: { ...((state.farmConfig.shop?.seed?.[q.id]) || {}) },
          growSec: rep?.growSec ?? 0,
          base: rep ? { gold: rep.base.gold, pearl: rep.base.pearl, magic: rep.base.magic } : { gold: 0, pearl: 0 },
          exp: rep?.exp ?? 0,
          jadeChance: rep?.jadeChance ?? 0,
        };
      }
      return out;
    },
    /** 灵田：取作物定义（按元素 + 品质），等价于原 cropOf() */
    farmCropOf(state) {
      return (element: string, quality: string): FarmCropCfg | undefined =>
        (state.farmConfig.crops || []).find((c) => c.element === element && c.quality === quality);
    },

    /* ====================== 竞速（Race）配置驱动 ====================== */
    /** 今日赛道属性：按日期在 raceConfig.trackOrder 上轮换（替代原 getTrackElement） */
    raceTrackElement(state) {
      return (date = new Date()): ElementType => {
        const order = state.raceConfig.trackOrder && state.raceConfig.trackOrder.length
          ? state.raceConfig.trackOrder : ['wood', 'fire', 'earth', 'gold', 'water'];
        const start = Date.UTC(2026, 0, 1);
        const day = Math.floor((date.getTime() - start) / 86400000);
        return order[((day % order.length) + order.length) % order.length] as ElementType;
      };
    },
    /** 今日赛道皮肤：按日期在 raceConfig.tracks 上轮换（与五行轮换正交），用于主题背景与全局修正 */
    raceTrackSkin(state) {
      return (date = new Date()): RaceTrackSkin => {
        const tracks = state.raceConfig.tracks && state.raceConfig.tracks.length
          ? state.raceConfig.tracks : RACE_TRACK_SKINS;
        const start = Date.UTC(2026, 0, 1);
        const day = Math.floor((date.getTime() - start) / 86400000);
        return tracks[((day % tracks.length) + tracks.length) % tracks.length];
      };
    },
    /** 今日天气：按日期在 raceConfig.weather 上轮换（与皮肤/五行错开相位），用于主题背景与全员速度/事件节奏修正 */
    raceWeather(state) {
      return (date = new Date()): RaceWeather => {
        const list = state.raceConfig.weather && state.raceConfig.weather.length
          ? state.raceConfig.weather : RACE_WEATHERS;
        const start = Date.UTC(2026, 0, 1);
        const day = Math.floor((date.getTime() - start) / 86400000);
        // 错开相位：+2，使天气与皮肤同日不同相，增加变化感
        return list[(((day + 2) % list.length) + list.length) % list.length];
      };
    },
    /** 宠物五行 vs 赛道五行 的速度系数（替代原 speedFactor），可经 raceConfig.engender/restrain 调整 */
    raceSpeedFactor(state) {
      return (petEl: ElementType, trackEl: ElementType): number => {
        const eng = state.raceConfig.engender || {};
        const ke = state.raceConfig.restrain || {};
        if (petEl === trackEl) return 1.0;
        if (eng[petEl] === trackEl) return 1.12;
        if (eng[trackEl] === petEl) return 1.06;
        if (ke[petEl] === trackEl) return 1.05;
        return 0.9;
      };
    },
    /** 系数 → 人类可读标签（替代原 speedFactorLabel） */
    raceSpeedFactorLabel(): (f: number) => string {
      return (f: number): string => {
        if (f >= 1.12) return '顺生 · 顺风';
        if (f >= 1.06) return '得生 · 相助';
        if (f >= 1.05) return '势克 · 破阵';
        if (f <= 0.9) return '逆克 · 顶风';
        return '平';
      };
    },
    /** 末名安慰文案（替代原 randomComfortLine） */
    raceComfortLine(state): () => string {
      const lines = state.raceConfig.comfortLines && state.raceConfig.comfortLines.length
        ? state.raceConfig.comfortLines : ['虽未夺魁，它叼回一朵野花递给你：「下次一定行！」'];
      return () => lines[Math.floor(Math.random() * lines.length)];
    },

    /* ====================== 签到（Checkin）配置驱动 ====================== */
    /** 取指定天数的奖励配置（替代原 getCheckinDay，day 越界回退 Day1） */
    checkinDay(state) {
      return (day: number): CheckinDay => {
        const arr = state.checkinConfig.days && state.checkinConfig.days.length ? state.checkinConfig.days : [];
        const idx = Math.min(Math.max(day, 1), arr.length || 1) - 1;
        return arr[idx] || arr[0];
      };
    },
    /** 下一个待达成的累计里程碑（替代原 nextMilestone） */
    checkinNextMilestone(state) {
      return (totalDays: number): CheckinMilestone | null => {
        const ms = state.checkinConfig.milestones || [];
        return ms.find((m) => totalDays < m.days) || null;
      };
    },
    /** 情绪瓶：type → cfg 映射（页面取 emoji/color/label 用），后台改色/文案即时生效 */
    bottleEmotionMap(state): Record<string, BottleEmotionCfg> {
      const m: Record<string, BottleEmotionCfg> = {};
      for (const e of state.bottleConfig.emotions) m[e.type] = e;
      return m;
    },
    /** 情绪瓶：情绪球数组（图鉴/选择器遍历用） */
    bottleEmotions(state): BottleEmotionCfg[] {
      return state.bottleConfig.emotions || [];
    },
    /** 神龛：香品列表（配置态，运行态进度不在此） */
    shrineIncenses(): ShrineIncenseCfg[] {
      return this.shrineConfig.incenses || [];
    },
    /** 神龛：神位列表 */
    shrineDeities(): ShrineDeityCfg[] {
      return this.shrineConfig.deities || [];
    },
    /** 神龛：香品 type→cfg 映射 */
    shrineIncenseMap(): Record<string, ShrineIncenseCfg> {
      return toIncenseMap(this.shrineConfig.incenses);
    },
    /** 神龛：神位 id→cfg 映射 */
    shrineDeityMap(): Record<string, ShrineDeityCfg> {
      return toDeityMap(this.shrineConfig.deities);
    },
    /** 法器：法器列表（配置态，运行态进度不在此） */
    artifactList(): ArtifactCfg[] {
      return this.artifactConfig.artifacts || [];
    },
    /** 法器：id→cfg 映射 */
    artifactMap(): Record<string, ArtifactCfg> {
      return toArtifactMap(this.artifactConfig.artifacts);
    },
    /**
     * 法器增益：配置驱动的唯一真值入口（消除 bowl/flute/wheel 散落的写死系数）。
     * 按 metric 找到对应法器 cfg，读取其运行态（是否装备、等级），据 effect.mode 计算：
     *  - percent：乘数 = 1 ± perLevel*level（negative 取减；如结界符借走比例 −X%）
     *  - mult   ：乘数 = base + perLevel*level（如空灵笛魔丸 ×(lv+1)）
     *  - flat   ：加数 = perLevel*level（如轮回珠满溢额外灵珠 +lv）
     * 改后台 artifacts.json 的 perLevel/mode/base，App 实时生效——真正实现「参数可调」。
     */
    artifactEffect(): (metric: ArtifactMetric) => {
      equipped: boolean; level: number;
      multiplier: number; add: number; mode: ArtifactEffectCfg['mode'];
    } {
      return (metric: ArtifactMetric) => {
        const cfg = (this.artifactConfig.artifacts || []).find((c) => c.effect.metric === metric);
        if (!cfg) return { equipped: false, level: 0, multiplier: 1, add: 0, mode: 'percent' };
        const run = this.artifacts.find((a) => a.id === cfg.id);
        if (!run || !run.equipped) return { equipped: false, level: 0, multiplier: 1, add: 0, mode: cfg.effect.mode };
        const e = cfg.effect;
        const lv = run.level;
        let multiplier = 1;
        let add = 0;
        if (e.mode === 'percent') {
          multiplier = 1 + e.perLevel * lv * (e.negative ? -1 : 1);
        } else if (e.mode === 'mult') {
          multiplier = (e.base ?? 1) + e.perLevel * lv;
        } else {
          add = e.perLevel * lv;
        }
        return { equipped: true, level: lv, multiplier, add, mode: e.mode };
      };
    },
    driftInboxUnread(): number {
      return this.driftBottle.inbox.filter((m) => !m.read).length;
    },
    /** 珍藏架（已珍藏的信，永远留在信箱顶部） */
    driftFavorites(): IDriftMessage[] {
      return this.driftBottle.inbox.filter((m) => m.favorite);
    },
    /** 已归海数（读后放归大海的累计，配合当前信箱已读数 = 已拾起总数） */
    driftArchiveCount(): number {
      return this.driftBottle.archiveCount;
    },
  },

  // 持久化（契约2.1：modulesStore只持久化关键业务字段，运行时倒计时等不持久）
  // pinia-plugin-persistedstate v3 用 paths 代替 pick
  persist: {
    key: 'lingjing:modules',
    paths: [
      'plots', 'pet', 'emotionBottle', 'driftBottle', 'artifacts',
      'activeBuff', 'dailyLimits', 'dailyLimitsDay',
      'galleryCount', 'galleryUnlocked', 'galleryFreeDate', 'galleryFreeIds', 'galleryFreeTheme', 'galleryHiddenCelebrated', 'unlockedPlots', 'artifactProgress',
      'unlockedArtifacts',
      'shrineOffersToday', 'shrineOffersDay',
      'shrine',
      'musicTracks', 'musicListenSeconds',
      'musicClaimedMilestones', 'musicTag',
      'visitedFriendIds', 'visitClaimsDay', 'farmDemoDone',
      'farmProsperity', 'harvestCombo', 'lastHarvestTs', 'seedSeen', 'farmFormation',
    ],
  },
});
