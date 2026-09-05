// src/constants/pet.ts —— 仙宠公共常量（PetPage 等共用；数值对齐 02-全局核心常量 六、仙宠数值表）
import type { ElementType, PetFoodType, TravelMode, TravelChannel } from '@/types/index';

/* ---------- 宠物名称（2026-08-26 拍板：主名取《山海经》神兽，昵称按五行） ---------- */
/** 主名：《山海经》神兽雅称，按五行各取其一（白泽/夫诸/文鳐/毕方/貔貅） */
export const PET_MAIN_NAME: Record<ElementType, string> = {
  gold: '白泽', wood: '夫诸', water: '文鳐', fire: '毕方', earth: '貔貅',
};
/** 昵称前缀：主名下方小字「金系精灵 / 木系精灵 …」 */
export const PET_ELEMENT_LABEL: Record<ElementType, string> = {
  gold: '金系', wood: '木系', water: '水系', fire: '火系', earth: '土系',
};

/* ---------- 饱食度衰减（2026-08-26 拍板：实时流逝，不再形同虚设） ---------- */
/** 每分钟自然衰减点数（100 点 ≈ 100 分钟饿空；便于调参只用一处） */
export const HUNGER_DECAY_PER_MIN = 1;
/** 出发旅行的最低饱食门槛：低于此值禁止出发（先喂再走） */
export const HUNGER_TRAVEL_MIN = 20;

/** 旅行档位标签（见闻展示用） */
export const TRAVEL_NAME: Record<TravelMode, string> = {
  taijing: '苔径',
  huaxin: '花信屿',
  fengling: '风铃坞',
  yunmeng: '云梦泽',
  xinghe: '星河渡',
  taixu: '太虚境',
};

/** 隐藏壁纸掉落的池子（决定稀有度与归属档） */
export type HiddenPool = 'spirit' | 'legend';

export interface TravelReward {
  gold: number;
  pearl: number;
  magic: number;
  // ⚠️ 天玑不要放这里：结算只认 drops.jadeGuarantee / drops.jadeChance，
  //    曾在此放 jade 导致「太虚境必得天玑」永远发不出的 P0 事故，已彻底移除该字段。
}

export interface TravelDrops {
  /** 概率天玑（魔丸通道也走此概率，不继承必得） */
  jadeChance?: number;
  /** 必得天玑（仅食物通道特定档，如太虚境） */
  jadeGuarantee?: number;
  /** 概率掉落隐藏壁纸 */
  hiddenChance?: number;
  /** 掉落哪个隐藏池（spirit=隐·灵品 / legend=隐·仙品传说） */
  hiddenPool?: HiddenPool;
}

export interface TravelConfig {
  id: TravelMode;
  name: string;
  /** 目的地五行（chaos=太虚境，不参与五行匹配） */
  element: ElementType | 'chaos';
  hours: number;
  /** 携粮通道消耗的食物类型（干粮/精粮） */
  food: PetFoodType;
  /** 携粮通道消耗的食物数量 */
  foodQty: number;
  /**
   * ⭐ 魔丸时空加速（2026-08-31 重做定位）
   * - magicHours：加速后的时长（小时）。**undefined = 该档不开放加速**
   *   （短档 <3h 等待感弱，开放既无意义又会被用来刷旅行次数/解锁进度）
   * - magicCost：加速净耗魔丸，**出发即扣、不再返还**
   *   （旧版「先冻结全额再返还」制造了巨大隐形门槛且 UI 只显示净耗，属误导，已取消）
   * - ⚠️ 核心取舍：加速档**放弃该档必得稀有物（天玑）**——见 claimPetTravel 的 food 通道判定。
   *   于是稀缺货币产出被永久锁在慢路径上，只有软货币可被加速，通胀风险归零。
   */
  magicHours?: number;
  magicCost?: number;
  /** 必得奖励（携粮 / 加速通道共享同一组基础产出） */
  rewards: TravelReward;
  drops: TravelDrops;
  /** 累计完成旅行次数达到该值才解锁（0=初始即开放） */
  unlockAt: number;
}

/** 每日魔丸加速次数上限（软兜底，防止无限刷加速） */
export const SPEED_UP_DAILY_LIMIT = 2;

/** 六档旅行（2026-08-26 大改：6 地 × 固定时长 × 食物/魔丸双通道；B 套缥缈仙墟地名） */
export const TRAVEL_CONFIGS: TravelConfig[] = [
  {
    id: 'taijing', name: '苔径', element: 'wood', hours: 0.25,
    food: 'dry', foodQty: 1, // 短档不开放加速
    rewards: { gold: 10, pearl: 0, magic: 0 },
    drops: {}, unlockAt: 0,
  },
  {
    id: 'huaxin', name: '花信屿', element: 'fire', hours: 0.5,
    food: 'dry', foodQty: 1, // 短档不开放加速
    rewards: { gold: 18, pearl: 0, magic: 0 },
    drops: {}, unlockAt: 0,
  },
  {
    id: 'fengling', name: '风铃坞', element: 'gold', hours: 1,
    food: 'dry', foodQty: 1, // 短档不开放加速
    rewards: { gold: 35, pearl: 0, magic: 0 },
    drops: { jadeChance: 0.01 }, unlockAt: 0,
  },
  {
    id: 'yunmeng', name: '云梦泽', element: 'water', hours: 3,
    food: 'premium', foodQty: 1,
    magicHours: 1.5, magicCost: 15, // 3h→1.5h（省 1.5h，10 魔丸/小时）
    rewards: { gold: 100, pearl: 10, magic: 0 },
    drops: { jadeChance: 0.03 }, unlockAt: 3,
  },
  {
    id: 'xinghe', name: '星河渡', element: 'earth', hours: 6,
    food: 'premium', foodQty: 1,
    magicHours: 3, magicCost: 30, // 6h→3h（省 3h）
    rewards: { gold: 190, pearl: 22, magic: 3 },
    drops: { jadeChance: 0.06, hiddenChance: 0.06, hiddenPool: 'spirit' }, unlockAt: 8,
  },
  {
    id: 'taixu', name: '太虚境', element: 'chaos', hours: 12,
    food: 'premium', foodQty: 1,
    magicHours: 6, magicCost: 60, // 12h→6h（省 6h）
    rewards: { gold: 360, pearl: 45, magic: 8 },
    // ⭐ 必得天玑×1：仅携粮通道可得（加速通道主动放弃，构成"要时间还是要收集"的取舍）
    drops: { jadeGuarantee: 1, hiddenChance: 0.15, hiddenPool: 'legend' }, unlockAt: 20,
  },
];

export const TRAVEL_CFG_MAP: Record<TravelMode, TravelConfig> = TRAVEL_CONFIGS.reduce(
  (acc, c) => { acc[c.id] = c; return acc; }, {} as Record<TravelMode, TravelConfig>,
);

/** 根据累计旅行次数，返回已解锁的目的地（渐进解锁：3/8/20 依次开放后三档） */
export function unlockedTravelModes(count: number): TravelMode[] {
  return TRAVEL_CONFIGS.filter((c) => count >= c.unlockAt).map((c) => c.id);
}

/** 食物（干粮 5 元宝 / 精粮 5 灵珠；喂食 +20/+35） */
export const PET_FOODS: { type: PetFoodType; emoji: string; name: string; desc: string; priceLabel: string }[] = [
  { type: 'dry', emoji: '🥮', name: '宠物干粮', desc: '基础口粮 · 饱食 +20 · 短途口粮', priceLabel: '5 元宝' },
  { type: 'premium', emoji: '🍙', name: '宠物精粮', desc: '精制口粮 · 饱食 +35 · 长途/远行口粮', priceLabel: '5 灵珠' },
];

/** 毫秒数格式化为「Xh Ym / X 分钟」（旅行剩余时长展示，兼容旧调用） */
export function fmtHours(h: number) {
  const mins = Math.round(h * 60);
  return mins >= 60 ? `${Math.floor(mins / 60)}h${mins % 60 ? mins % 60 + 'm' : ''}` : `${mins} 分钟`;
}

/** 毫秒 → HH:MM:SS 倒计时（不足 1h 显示 MM:SS），旅行中营造紧迫感 */
export function fmtCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** 时间戳 →「刚刚 / X 分钟前 / X 小时前」（见闻时间展示） */
export function timeAgo(timestamp: number) {
  if (!timestamp) return '';
  const mins = Math.floor((Date.now() - timestamp) / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  if (mins < 60 * 24) return `${Math.floor(mins / 60)} 小时前`;
  return `${Math.floor(mins / (60 * 24))} 天前`;
}

/**
 * 旅途碎片（25% / 50% / 75% 进度各一句，纯文字零资源）
 * 作用：把长旅途的"空窗"切成 4 个章节，每次打开都有新东西看 —— 期待感最便宜的做法。
 */
export const TRAVEL_MILESTONES: Record<TravelMode, [string, string, string]> = {
  taijing: [
    '它踏上了苔径，露水打湿了爪尖',
    '林子深处传来溪声，它停下来听了很久',
    '前面有萤火聚成一小团，它放轻了脚步',
  ],
  huaxin: [
    '风里已经有了甜味，它加快了脚步',
    '花田翻起一层浪，它一头扎了进去',
    '它在一株最大的花下坐了会儿，像是在等谁',
  ],
  fengling: [
    '远远就听见铃声，它竖起了耳朵',
    '檐下挂满铜铃，它在风里转了个圈',
    '它替守铃的人摇了一阵，铃声散进了山谷',
  ],
  yunmeng: [
    '雾从水面漫上来，它的身影淡了些',
    '泽心有光一闪，它停下看了很久',
    '雾开始散了，对岸的轮廓慢慢清楚',
  ],
  xinghe: [
    '天色暗下来，第一颗星浮出了水面',
    '它上了船，星子落了满身',
    '船靠岸的声响很轻，它回头望了一眼',
  ],
  taixu: [
    '没有方向，也没有远近，它只是往前',
    '周围安静得能听见自己的心跳',
    '前面好像有光，很淡，但它认得',
  ],
};

/** 旅行见闻文案池（按地分池，纯文字零资源；归来随机带回一句） */
export const TRAVEL_NOTES: Record<TravelMode, string[]> = {
  taijing: [
    '在苔径的石缝间追着萤火跑了半刻，鞋尖沾了露水',
    '帮溪边洗衣的婆婆递了块皂角，得了一颗野莓',
    '躺在青苔上晒了一会儿太阳，听见地底有细碎的响动',
    '和一只路过的松鼠对峙了三秒，它赢了那枚松果',
  ],
  huaxin: [
    '花信屿的风里全是甜香，它替新娘递了一回花笺',
    '在花田里打滚，回来时绒毛上缀着星星点点的粉',
    '遇见一只迷路的蝶，一路护送它到了对岸',
    '偷尝了半口花蜜，被蜂群追着绕树三圈',
  ],
  fengling: [
    '风铃坞的檐角挂满铜铃，它替守铃的老妪摇了一夜清音',
    '在风里接住了一封被吹走的信，物归原主得了句道谢',
    '顺着铃声攀上高台，看见远山如黛',
    '和路过的小童比赛吹叶笛，输了一颗糖',
  ],
  yunmeng: [
    '云梦泽的雾散开时，水面浮起一座不曾存在的桥',
    '在泽边遇见一条会发光的水蛇，它衔来一粒珍珠',
    '听渔人讲了半宿旧事，临走塞给它一壶温酒',
    '在芦苇深处拾得一枚褪色的铃铛',
  ],
  xinghe: [
    '星河渡的船夫说，对岸有人在等一封迟了百年的信',
    '它替渡口的灯添了油，整夜星子都落进了水里',
    '在船头数星星，数到第一千颗时许了个愿',
    '遇见撑船的女子，赠它一片会发光的鳞',
  ],
  taixu: [
    '太虚境没有尽头，它走了一程，回头已不见来路',
    '在混沌里拾得一枚半明半灭的珠，握久了竟暖起来',
    '听见极远的地方有人在抚琴，弦音落成了雪',
    '于无形中照见了自己的影子，与它对了很久的眸',
  ],
};
