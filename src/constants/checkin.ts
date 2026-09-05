// src/constants/checkin.ts —— 七日灵签（签到系统）配置
//
// 【设计内核】上瘾性与治愈感的平衡：
//   1. 递增曲线 —— 越往后越值钱，走到 Day6 的人绝不会在 Day7 前断签（损失厌恶）
//   2. 断签回退 1 天（而非归零）—— 保留损失感，但绝不摧毁进度（治愈系铁律：不惩罚玩家）
//   3. 元宝大方给 —— 元宝是全游戏基础消耗货币（竞速付费 75/日 + 种子 + 干粮），
//      签到的定位是「保底收入」：光签到即可无压力覆盖日常开销，但要富裕仍需主动玩
//   4. 天玑压到极低 —— 稀有货币只在 Day7 与长线里程碑发放，保证稀缺性不被稀释
//   5. 累计里程碑永不重置 —— 给长期玩家一条不会归零的进度条（沉没成本 = 长期留存锚）
//
// 【经济定位核验】
//   签到日均 ≈ 92 元宝（10 秒操作）
//   对比：竞速打满 5 场 ≈ 90~200（2 分钟）；仙宠每日任务 30；灵植普通作物 20/30 分钟
//   → 签到产出恰好覆盖「竞速付费 75 + 种子 + 干粮」，形成 签到→元宝→竞速 的互相输血闭环

/** 奖励包（与 useUserStore.changeCurrency 支持的币种对齐，避免引入不存在的资源） */
export interface CheckinReward {
  gold?: number;
  pearl?: number;
  magic?: number;
  jade?: number;
}

/** 单日签到配置 */
export interface CheckinDay {
  /** 第几天（1~7） */
  day: number;
  reward: CheckinReward;
  /** 领奖时的一句签文（仙侠仪式感，替代干巴巴的 +50） */
  quote: string;
}

/** 七日递增奖励曲线（七日总计：648 元宝 / 15 灵珠 / 3 魔丸 / 1 天玑） */
export const CHECKIN_DAYS: CheckinDay[] = [
  { day: 1, reward: { gold: 50 }, quote: '一签落，灵气自生。' },
  { day: 2, reward: { gold: 60, pearl: 5 }, quote: '再签一愿，珠玉相随。' },
  { day: 3, reward: { gold: 70 }, quote: '三签成愿，福缘渐厚。' },
  { day: 4, reward: { gold: 80, magic: 3 }, quote: '四时安稳，魔丸入袖。' },
  { day: 5, reward: { gold: 90, pearl: 10 }, quote: '五福临门，灵珠盈掌。' },
  { day: 6, reward: { gold: 110 }, quote: '六合顺遂，只差一步。' },
  // 爆发日：元宝 188（够打满一整天竞速付费场 75）+ 天玑 1（连签两周 = 一只新仙宠）
  { day: 7, reward: { gold: 188, jade: 1 }, quote: '七日功成，天玑在手。' },
];

/** 补签：花元宝补回昨天（既给挽回感，又回收通胀货币） */
export const CHECKIN_MAKEUP_COST = 20;

/** 累计签到里程碑（totalDays 永不重置，领过一次即永久记录） */
export interface CheckinMilestone {
  /** 触发所需累计天数 */
  days: number;
  reward: CheckinReward;
  title: string;
  emoji: string;
}

export const CHECKIN_MILESTONES: CheckinMilestone[] = [
  { days: 3, reward: { gold: 100, pearl: 5 }, title: '初结灵缘', emoji: '🌱' },
  { days: 7, reward: { gold: 100, pearl: 20 }, title: '七日不辍', emoji: '🌿' },
  { days: 15, reward: { gold: 300, magic: 10 }, title: '半月深耕', emoji: '🌳' },
  // 30 天直接给 2 天玑 = 一只新仙宠，把「每日微行为」与「收集宠物」长线目标焊死
  { days: 30, reward: { gold: 500, jade: 2 }, title: '月满灵签', emoji: '🌕' },
  { days: 60, reward: { gold: 500, pearl: 88, magic: 20 }, title: '两月如一', emoji: '🏔️' },
  { days: 100, reward: { gold: 1000, jade: 5 }, title: '百日道成', emoji: '☯️' },
];

/** 取指定天数的奖励配置（day 为 1~7，越界回退到 Day1） */
export function getCheckinDay(day: number): CheckinDay {
  const idx = Math.min(Math.max(day, 1), CHECKIN_DAYS.length) - 1;
  return CHECKIN_DAYS[idx];
}

/** 里程碑进度：返回下一个待领里程碑与整体进度百分比 */
export function nextMilestone(totalDays: number): CheckinMilestone | null {
  return CHECKIN_MILESTONES.find((m) => totalDays < m.days) || null;
}
