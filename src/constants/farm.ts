import type { ElementType, SeedQuality } from '@/types';
import { SHOP } from '@/constants/shop';

/**
 * src/constants/farm.ts —— 灵植作物统一数据表（2026-09-02 灵植彩蛋第2/3批落地）
 *
 * 设计要点：
 * - 作物的「属性」等于地块的「土地属性」（seedType 只决定品质），即 15 种作物 = 5 元素 × 3 品质。
 * - 原 FarmPage.vue 内联的 CROP_NAME / SEED_CONFIG / ELEMENT_BONUS 三表全部改由本文件 CROPS 派生，
 *   消除三表漂移（数值与历史实现逐项一致，零行为变更）。
 * - 新增：五行相生相克、风水阵加成、种子图鉴集齐加成、地力/繁荣度/连击常量、作物语录。
 */

/** 作物 id：元素-品质，如 'gold-common' */
export type CropId = `${ElementType}-${SeedQuality}`;

/** 单作物定义 */
export interface CropDef {
  id: CropId;
  name: string;                 // 作物品名（按品质区分，凡品沿用旧名）
  element: ElementType;
  quality: SeedQuality;
  emoji: string;
  growSec: number;              // 成长时间（秒）
  base: { gold: number; pearl: number; magic?: number }; // 基础产出
  exp: number;
  jadeChance: number;           // 天玑概率
  quotes: string[];            // 作物语录（收获随机一句，纯趣味）
}

/** 单种子数值配置（与旧 SEED_CONFIG 字段兼容） */
export interface SeedCfg {
  cost: Partial<Record<'gold' | 'pearl' | 'magic', number>>;
  growSec: number;
  base: { gold: number; pearl: number; magic?: number };
  exp: number;
  jadeChance: number;
}

/* ---------- 15 种作物（元素 × 品质） ---------- */
export const CROPS: Record<CropId, CropDef> = {
  // 金
  'gold-common':   { id: 'gold-common',   name: '金盏花', element: 'gold', quality: 'common',   emoji: '🌼', growSec: 1800,  base: { gold: 20, pearl: 5 },                 exp: 10, jadeChance: 0,     quotes: ['金盏向阳，财气自生。', '一缕金光落掌心。'] },
  'gold-uncommon': { id: 'gold-uncommon', name: '金辉兰', element: 'gold', quality: 'uncommon', emoji: '🌟', growSec: 7200,  base: { gold: 50, pearl: 10, magic: 5 },      exp: 30, jadeChance: 0,     quotes: ['兰生幽谷，其辉自照。', '金辉流转，似有灵息。'] },
  'gold-rare':     { id: 'gold-rare',     name: '金曜莲', element: 'gold', quality: 'rare',     emoji: '🪙', growSec: 21600, base: { gold: 120, pearl: 30, magic: 15 },     exp: 80, jadeChance: 0.05,  quotes: ['曜莲一出，满室生辉。', '金魄凝莲，瑞气千条。'] },
  // 木
  'wood-common':   { id: 'wood-common',   name: '薄荷',   element: 'wood', quality: 'common',   emoji: '🌿', growSec: 1800,  base: { gold: 20, pearl: 5 },                 exp: 10, jadeChance: 0,     quotes: ['清芬一握，暑气全消。', '薄荷醒神，山风入怀。'] },
  'wood-uncommon': { id: 'wood-uncommon', name: '青萝',   element: 'wood', quality: 'uncommon', emoji: '🍀', growSec: 7200,  base: { gold: 50, pearl: 10, magic: 5 },      exp: 30, jadeChance: 0,     quotes: ['青萝蔓蔓，岁月静长。', '藤牵绿意，心亦安然。'] },
  'wood-rare':     { id: 'wood-rare',     name: '碧玉藤', element: 'wood', quality: 'rare',     emoji: '🌳', growSec: 21600, base: { gold: 120, pearl: 30, magic: 15 },     exp: 80, jadeChance: 0.05,  quotes: ['碧玉垂霜，灵木低语。', '藤结碧玉，似闻旧友声。'] },
  // 水
  'water-common':   { id: 'water-common',   name: '清萍',   element: 'water', quality: 'common',   emoji: '🌊', growSec: 1800,  base: { gold: 20, pearl: 5 },                 exp: 10, jadeChance: 0,     quotes: ['一萍浮水，天地皆静。', '清萍无根，随波亦安。'] },
  'water-uncommon': { id: 'water-uncommon', name: '涵珠藻', element: 'water', quality: 'uncommon', emoji: '💧', growSec: 7200,  base: { gold: 50, pearl: 10, magic: 5 },      exp: 30, jadeChance: 0,     quotes: ['藻含明珠，水韵悠长。', '露凝成珠，落手生凉。'] },
  'water-rare':     { id: 'water-rare',     name: '沧海珠', element: 'water', quality: 'rare',     emoji: '🫧', growSec: 21600, base: { gold: 120, pearl: 30, magic: 15 },     exp: 80, jadeChance: 0.05,  quotes: ['沧海遗珠，终有归处。', '珠光入梦，潮声渐远。'] },
  // 火
  'fire-common':   { id: 'fire-common',   name: '烈焰花', element: 'fire', quality: 'common',   emoji: '🔥', growSec: 1800,  base: { gold: 20, pearl: 5 },                 exp: 10, jadeChance: 0,     quotes: ['焰心虽烈，暖意可期。', '花开如火，照夜成灯。'] },
  'fire-uncommon': { id: 'fire-uncommon', name: '赤焰兰', element: 'fire', quality: 'uncommon', emoji: '🌶️', growSec: 7200,  base: { gold: 50, pearl: 10, magic: 5 },      exp: 30, jadeChance: 0,     quotes: ['赤兰浴火，愈烈愈香。', '一簇丹焰，驱散寒意。'] },
  'fire-rare':     { id: 'fire-rare',     name: '流焰莲', element: 'fire', quality: 'rare',     emoji: '🌋', growSec: 21600, base: { gold: 120, pearl: 30, magic: 15 },     exp: 80, jadeChance: 0.05,  quotes: ['莲生流焰，清净不焚。', '火中育莲，刚柔并济。'] },
  // 土
  'earth-common':   { id: 'earth-common',   name: '厚土草', element: 'earth', quality: 'common',   emoji: '🪨', growSec: 1800,  base: { gold: 20, pearl: 5 },                 exp: 10, jadeChance: 0,     quotes: ['厚土无言，载物无声。', '一抔春泥，养尽芳华。'] },
  'earth-uncommon': { id: 'earth-uncommon', name: '沃野参', element: 'earth', quality: 'uncommon', emoji: '🌾', growSec: 7200,  base: { gold: 50, pearl: 10, magic: 5 },      exp: 30, jadeChance: 0,     quotes: ['沃野藏参，根扎岁月。', '土润根深，静待东风。'] },
  'earth-rare':     { id: 'earth-rare',     name: '坤元芝', element: 'earth', quality: 'rare',     emoji: '⛰️', growSec: 21600, base: { gold: 120, pearl: 30, magic: 15 },     exp: 80, jadeChance: 0.05,  quotes: ['坤元毓秀，芝草长生。', '地脉凝芝，福泽绵长。'] },
};

/** 由 CROPS 派生：元素 → 该元素「凡品」作物品名（保留旧显示，避免 UI 突变） */
export const CROP_NAME: Record<ElementType, string> = {
  gold: CROPS['gold-common'].name,
  wood: CROPS['wood-common'].name,
  water: CROPS['water-common'].name,
  fire: CROPS['fire-common'].name,
  earth: CROPS['earth-common'].name,
};

/** 由 CROPS 派生：品质 → 种子数值配置（cost 取自 SHOP.seed，与定价单一来源一致） */
export const SEED_CONFIG: Record<SeedQuality, SeedCfg> = {
  common:   { cost: SHOP.seed.common as Partial<Record<'gold' | 'pearl' | 'magic', number>>,   growSec: CROPS['gold-common'].growSec,   base: CROPS['gold-common'].base,   exp: CROPS['gold-common'].exp,   jadeChance: CROPS['gold-common'].jadeChance },
  uncommon: { cost: SHOP.seed.uncommon as Partial<Record<'gold' | 'pearl' | 'magic', number>>, growSec: CROPS['gold-uncommon'].growSec, base: CROPS['gold-uncommon'].base, exp: CROPS['gold-uncommon'].exp, jadeChance: CROPS['gold-uncommon'].jadeChance },
  rare:     { cost: SHOP.seed.rare as Partial<Record<'gold' | 'pearl' | 'magic', number>>,     growSec: CROPS['gold-rare'].growSec,     base: CROPS['gold-rare'].base,     exp: CROPS['gold-rare'].exp,     jadeChance: CROPS['gold-rare'].jadeChance },
};

/** 由 CROPS 派生：五行属性修正（金=元宝+20% / 木=灵珠+20% / 水=魔丸+20% / 火=无 / 土=总数量+20%） */
export const ELEMENT_BONUS: Record<ElementType, { gold?: number; pearl?: number; magic?: number; qty?: number }> = {
  gold:   { gold: 0.20 },
  wood:   { pearl: 0.20 },
  water:  { magic: 0.20 },
  fire:   {},
  earth:  { qty: 0.20 },
};

/** 五行顺序（与 GALLERY_ELEMENTS 保持一致） */
export const FARM_ELEMENTS: ElementType[] = ['gold', 'wood', 'water', 'fire', 'earth'];
export const FARM_QUALITIES: SeedQuality[] = ['common', 'uncommon', 'rare'];

/** 中文标签（UI 复用，避免与 FarmPage 重复定义） */
export const FARM_ELEMENT_LABEL: Record<ElementType, string> = { gold: '金', wood: '木', water: '水', fire: '火', earth: '土' };
export const FARM_QUALITY_LABEL: Record<SeedQuality, string> = { common: '凡品', uncommon: '灵品', rare: '仙品' };

/** 取作物定义：按元素 + 品质 */
export function cropOf(element: ElementType, quality: SeedQuality): CropDef {
  return CROPS[`${element}-${quality}` as CropId];
}

/* ---------- 五行相生相克 ---------- */
/** 相生：a 生 b（木生火、火生土、土生金、金生水、水生木） */
export const FIVE_ENGENDER: Record<ElementType, ElementType> = {
  wood: 'fire', fire: 'earth', earth: 'gold', gold: 'water', water: 'wood',
};
/** 相克：a 克 b（木克土、土克水、水克火、火克金、金克木） */
export const FIVE_RESTRAIN: Record<ElementType, ElementType> = {
  wood: 'earth', earth: 'water', water: 'fire', fire: 'gold', gold: 'wood',
};

/* ---------- 风水阵（玩家每日自选主生属性） ---------- */
export const FENGSHUI_MAIN_BONUS = 0.12;    // 主属性作物 +12%
export const FENGSHUI_ENGENDER_BONUS = 0.06; // 主属性所生属性作物 +6%

/* ---------- 种子图鉴集齐加成 ---------- */
export const CODEX_ELEMENT_BONUS = 0.05; // 同元素 3 品质全收 → 该属性产出 +5%

/* ---------- 轮作地力 ---------- */
export const FERTILITY_MAX = 100;
export const FERTILITY_START = 60;
export const FERTILITY_ROTATE_GAIN = 5;       // 异属性轮作 → 地力 +
export const FERTILITY_REPEAT_PENALTY = 8;    // 连作同属性 → 地力 -
export const FERTILITY_YIELD_COEF = 0.30;     // 满地力对产出的贡献（100 地力 → +30%）
export const ROTATE_REPEAT_YIELD_PENALTY = 0.85; // 连作当茬产出 ×0.85

/* ---------- 灵田繁荣度 ---------- */
export const PROSPERITY_MAX = 100;
export const PROSPERITY_PER_HARVEST = 1;  // 每次收获 +1
export const PROSPERITY_RARE_BONUS = 1;   // 仙种额外 +1
export const PROSPERITY_YIELD_COEF = 0.20; // 满繁荣对产出的贡献（100 → +20%）
export const PROSPERITY_TIERS = [25, 50, 75, 100]; // 里程碑档位

/* ---------- 收获连击 ---------- */
export const COMBO_WINDOW_MS = 10 * 60 * 1000; // 10 分钟内连收算连击
export const COMBO_PER_STEP = 0.02;  // 每多 1 连 +2%
export const COMBO_CAP = 0.20;       // 封顶 +20%（10 连）
