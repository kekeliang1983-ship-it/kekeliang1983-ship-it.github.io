import type { Currency } from '@/types';

/** 单商品价格（多货币组合） */
export type Price = Partial<Record<Currency, number>>;

/** 货币中文标签（统一消费端报错文案用） */
export const CURRENCY_LABEL: Record<Currency, string> = {
  gold: '元宝',
  pearl: '灵珠',
  magic: '魔丸',
  jade: '天玑',
};

/**
 * 集中价目表（对齐 02-全局核心常量 / 01-全局规则）。
 * 说明：此处集中“独立消耗品”的零散价格；模块自带结构化价格的（神龛 INCENSE_META、
 * 天籁 track.unlockCost、画境 wp.price）仍随各自数据，但一律经 useUserStore.purchase() 扣减。
 */
export const SHOP = {
  seed: {
    common:   { gold: 10 } as Price,   // 凡种
    uncommon: { pearl: 15 } as Price,  // 灵种
    rare:     { magic: 15 } as Price,  // 仙种（成本=产出魔丸，天玑5%为真正收益；P2平衡：原为20致净亏魔丸）
  },
  petFood: {
    dry:     { gold: 5 } as Price,     // 干粮
    premium: { pearl: 5 } as Price,    // 精粮
  },
  petUnlock: { jade: 2 } as Price,     // 解锁新仙宠 2 天玑（02-六）
  water:     { pearl: 10 } as Price,   // 超次浇水（05-L551-556）
} as const;
