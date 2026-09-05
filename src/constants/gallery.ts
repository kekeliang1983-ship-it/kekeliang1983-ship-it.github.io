import type { ElementType } from '@/types';

export type WallpaperQuality = 'common' | 'uncommon' | 'legendary';

export interface IWallpaper {
  id: string;
  name: string;
  element: ElementType;
  quality: WallpaperQuality;
  /** 解锁所需货币（免费缘份壁纸可绕过） */
  price: { gold?: number; pearl?: number; magic?: number; jade?: number };
  /** 占位 emoji（等统一出图后替换） */
  emoji: string;
  /** 真实壁纸图源（/wallpapers/xxx.png，压缩预览小图，进包省流量）；有则展示/下载真实图片，否则用 Canvas 生成 */
  src?: string;
  /** 原图全色路径（/originals/xxx.png，下载/长按保存用，保真；不进 SW 预缓存） */
  originalSrc?: string;
  /** 隐藏壁纸：不出现在常规五行 tab，仅获得后于画境隐藏栏位显示（2026-08-26 旅行掉落专属） */
  hidden?: boolean;
  /** 隐藏壁纸归属池（spirit=隐·灵品 / legend=隐·仙品传说） */
  pool?: 'spirit' | 'legend';
}

/**
 * 策展集合（后台可配 · schema 驱动，铁律13⑥）
 * 与「元素属性」解耦：元素 tab 按 `w.element` 过滤（一张壁纸只有一种元素）；
 * 集合 tab 按 `ids` 过滤（一张壁纸可同时进入任意多个集合 = 多对多）。
 * 「精选 / 限定 / 季节」等人工策展分类都走这里 —— **加分类只改 JSON，不改前台代码**。
 */
export interface IGalleryCollection {
  id: string;        // 唯一 key（如 'featured'），tab 过滤用它
  label: string;     // tab 显示名（如 '精选'）
  icon?: string;     // 可选 emoji，显示在名称前
  ids: string[];     // 成员壁纸 id（可跨五行）
  order?: number;    // 排序，越小越靠前（默认 50）
  enabled?: boolean; // 是否启用（默认 true）
}

/** 画境壁纸目标总数（策划规划库容，用户拍板先设为 99；当前 WALLPAPERS 为已录入种子数据，仅作内容源不参与进度分母） */
export const GALLERY_TOTAL = 99;

/** 25 张壁纸库（种子数据对齐 16-真实后端对接 L2034-2065） */
export const WALLPAPERS: IWallpaper[] = [
  // 凡品 common · 元宝30 · 每元素各 2 张
  { id: 'wp_001', name: '金鳞祥云', element: 'gold',  quality: 'common', price: { gold: 30 }, emoji: '🪙' },
  { id: 'wp_002', name: '灵木逢春', element: 'wood',  quality: 'common', price: { gold: 30 }, emoji: '🌳' },
  { id: 'wp_003', name: '清泉映月', element: 'water', quality: 'common', price: { gold: 30 }, emoji: '💧' },
  { id: 'wp_004', name: '烈焰焚天', element: 'fire',  quality: 'common', price: { gold: 30 }, emoji: '🔥' },
  { id: 'wp_005', name: '厚土载物', element: 'earth', quality: 'common', price: { gold: 30 }, emoji: '⛰️' },
  { id: 'wp_006', name: '金秋送爽', element: 'gold',  quality: 'common', price: { gold: 30 }, emoji: '🍂' },
  { id: 'wp_007', name: '木秀于林', element: 'wood',  quality: 'common', price: { gold: 30 }, emoji: '🌲' },
  { id: 'wp_008', name: '水天一色', element: 'water', quality: 'common', price: { gold: 30 }, emoji: '🌊' },
  { id: 'wp_009', name: '火树银花', element: 'fire',  quality: 'common', price: { gold: 30 }, emoji: '🌋' },
  { id: 'wp_010', name: '土生万物', element: 'earth', quality: 'common', price: { gold: 30 }, emoji: '🪨' },
  // 灵品 uncommon · 灵珠20
  { id: 'wp_011', name: '金辉流转', element: 'gold',  quality: 'uncommon', price: { pearl: 20 }, emoji: '✨' },
  { id: 'wp_012', name: '木影婆娑', element: 'wood',  quality: 'uncommon', price: { pearl: 20 }, emoji: '🍃' },
  { id: 'wp_013', name: '水韵悠长', element: 'water', quality: 'uncommon', price: { pearl: 20 }, emoji: '💦' },
  { id: 'wp_014', name: '火光摇曳', element: 'fire',  quality: 'uncommon', price: { pearl: 20 }, emoji: '🕯️' },
  { id: 'wp_015', name: '土润万物', element: 'earth', quality: 'uncommon', price: { pearl: 20 }, emoji: '🌾' },
  { id: 'wp_016', name: '星辰·金', element: 'gold',  quality: 'uncommon', price: { pearl: 20 }, emoji: '🌟' },
  { id: 'wp_017', name: '星辰·木', element: 'wood',  quality: 'uncommon', price: { pearl: 20 }, emoji: '🌟' },
  { id: 'wp_018', name: '星辰·水', element: 'water', quality: 'uncommon', price: { pearl: 20 }, emoji: '🌟' },
  // 仙品 legendary · 魔丸15 或 天玑1（每日限购 1）
  { id: 'wp_019', name: '日月同辉·金', element: 'gold',  quality: 'legendary', price: { magic: 15, jade: 1 }, emoji: '🌌' },
  { id: 'wp_020', name: '日月同辉·木', element: 'wood',  quality: 'legendary', price: { magic: 15, jade: 1 }, emoji: '🌌' },
  { id: 'wp_021', name: '日月同辉·水', element: 'water', quality: 'legendary', price: { magic: 15, jade: 1 }, emoji: '🌌' },
  { id: 'wp_022', name: '日月同辉·火', element: 'fire',  quality: 'legendary', price: { magic: 15, jade: 1 }, emoji: '🌌' },
  { id: 'wp_023', name: '日月同辉·土', element: 'earth', quality: 'legendary', price: { magic: 15, jade: 1 }, emoji: '🌌' },
  { id: 'wp_024', name: '混沌初开', element: 'fire',  quality: 'legendary', price: { magic: 15, jade: 1 }, emoji: '🌀' },
  { id: 'wp_025', name: '星辉·土',   element: 'earth', quality: 'legendary', price: { magic: 15, jade: 1 }, emoji: '🌠' },
  // 真实壁纸（用户 2026-08-26 接入：壁纸相关文件夹 10 张 PNG，全部免费解锁，近无损压缩入库）
  { id: 'wp_026', name: '九尾奇缘', element: 'gold',  quality: 'common', price: {}, emoji: '🦊', src: '/wallpapers/wp_026.png', originalSrc: '/originals/wp_026.png' },
  { id: 'wp_027', name: '云光伴身', element: 'water', quality: 'common', price: {}, emoji: '☁️', src: '/wallpapers/wp_027.png', originalSrc: '/originals/wp_027.png' },
  { id: 'wp_028', name: '星晶九尾', element: 'gold',  quality: 'common', price: {}, emoji: '✨', src: '/wallpapers/wp_028.png', originalSrc: '/originals/wp_028.png' },
  { id: 'wp_029', name: '玄猫衔月', element: 'water', quality: 'common', price: {}, emoji: '🐱', src: '/wallpapers/wp_029.png', originalSrc: '/originals/wp_029.png' },
  { id: 'wp_030', name: '玉魄栖云', element: 'gold',  quality: 'common', price: {}, emoji: '🌟', src: '/wallpapers/wp_030.png', originalSrc: '/originals/wp_030.png' },
  { id: 'wp_031', name: '玉龙衔星', element: 'gold',  quality: 'common', price: {}, emoji: '🐉', src: '/wallpapers/wp_031.png', originalSrc: '/originals/wp_031.png' },
  { id: 'wp_032', name: '瑶台衔禄', element: 'gold',  quality: 'common', price: {}, emoji: '🏯', src: '/wallpapers/wp_032.png', originalSrc: '/originals/wp_032.png' },
  { id: 'wp_033', name: '福猫纳财', element: 'gold',  quality: 'common', price: {}, emoji: '🐈', src: '/wallpapers/wp_033.png', originalSrc: '/originals/wp_033.png' },
  { id: 'wp_034', name: '鎏金跃兔', element: 'gold',  quality: 'common', price: {}, emoji: '🐇', src: '/wallpapers/wp_034.png', originalSrc: '/originals/wp_034.png' },
  { id: 'wp_035', name: '青丘之狐', element: 'wood',  quality: 'common', price: {}, emoji: '🦊', src: '/wallpapers/wp_035.png', originalSrc: '/originals/wp_035.png' },
];

/** 集齐同属性该品质全部壁纸 → 对应灵植元宝产量加成（02 数值表 L16-18） */
export const GALLERY_QUALITY_BONUS: Record<WallpaperQuality, number> = {
  common: 0.05,
  uncommon: 0.08,
  legendary: 0.12,
};

export const QUALITY_LABEL: Record<WallpaperQuality, string> = {
  common: '凡品',
  uncommon: '灵品',
  legendary: '仙品',
};

/** 五行顺序与中文标签 */
export const GALLERY_ELEMENTS: { key: ElementType; label: string }[] = [
  { key: 'gold', label: '金' },
  { key: 'wood', label: '木' },
  { key: 'water', label: '水' },
  { key: 'fire', label: '火' },
  { key: 'earth', label: '土' },
];

/** 五行配色（用于 Canvas 生成壁纸 / 样机底色，深浅两档） */
export const ELEMENT_COLORS: Record<ElementType, { from: string; to: string }> = {
  gold:  { from: '#F7EDD0', to: '#E6C677' },
  wood:  { from: '#DCEFD6', to: '#8CCB8A' },
  water: { from: '#D6EAF2', to: '#7FB6D6' },
  fire:  { from: '#F8DFD2', to: '#E8906F' },
  earth: { from: '#F0E6D2', to: '#C9A86A' },
};

/** 新档默认初始解锁：凡品（common）全部默认解锁（用户 2026-08-26 决策；策划原定 30元宝/张，此处改为默认开放）+ 真实壁纸 10 张（wp_026~035） */
export const DEFAULT_UNLOCKED: string[] = [
  'wp_001', 'wp_002', 'wp_003', 'wp_004', 'wp_005',
  'wp_006', 'wp_007', 'wp_008', 'wp_009', 'wp_010',
  'wp_026', 'wp_027', 'wp_028', 'wp_029', 'wp_030',
  'wp_031', 'wp_032', 'wp_033', 'wp_034', 'wp_035',
];

/** 每日免费缘份壁纸数量（01-L24） */
export const DAILY_FREE_COUNT = 3;

/**
 * 隐藏壁纸池（2026-08-26 新增）：不进常规 WALLPAPERS，旅行长线档概率掉落。
 * 仅获得（写入 galleryUnlocked）后于画境「隐藏壁纸」栏位显示。
 * 采用占位（emoji + Canvas 预览，同 wp_001~025 做法）；后期补真实图时按双轨 SOP 填 src/originalSrc。
 * - spirit 池（星河渡 6h 掉）：隐·灵品 3 张
 * - legend 池（太虚境 12h 掉）：隐·仙品传说 3 张
 */
export const HIDDEN_WALLPAPERS: IWallpaper[] = [
  // 隐·灵品（spirit）· 星河渡掉落
  { id: 'hwp_s1', name: '幽兰秘境', element: 'wood',  quality: 'uncommon', price: {}, emoji: '🌿', hidden: true, pool: 'spirit' },
  { id: 'hwp_s2', name: '月隐寒潭', element: 'water', quality: 'uncommon', price: {}, emoji: '🌙', hidden: true, pool: 'spirit' },
  { id: 'hwp_s3', name: '星落残垣', element: 'gold',  quality: 'uncommon', price: {}, emoji: '🪐', hidden: true, pool: 'spirit' },
  // 隐·仙品传说（legend）· 太虚境掉落
  { id: 'hwp_l1', name: '九霄遗珠', element: 'gold',  quality: 'legendary', price: {}, emoji: '💠', hidden: true, pool: 'legend' },
  { id: 'hwp_l2', name: '太虚心印', element: 'fire',  quality: 'legendary', price: {}, emoji: '🔆', hidden: true, pool: 'legend' },
  { id: 'hwp_l3', name: '混沌初醒', element: 'fire',  quality: 'legendary', price: {}, emoji: '🌀', hidden: true, pool: 'legend' },
];

/** 全部壁纸（常规 + 隐藏）按 id 查表，供 store 掉落/解锁定位 */
export const ALL_WALLPAPERS: IWallpaper[] = [...WALLPAPERS, ...HIDDEN_WALLPAPERS];


/** 仙品每日限购（02-L18 / 08-L326） */
export const LEGENDARY_DAILY_LIMIT = 1;
