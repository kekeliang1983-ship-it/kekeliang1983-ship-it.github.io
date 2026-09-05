// src/constants/avatarPool.ts —— 头像库（emoji + 五行底环）
// 设计：emoji 头像混搭治愈 / 仙侠风，每个自带五行归属（决定底环渐变色）。
// 与项目「零素材依赖」基调一致：无需图片资源、跨端即用、点选即时生效。
import type { ElementType } from '@/types/index';

export interface AvatarOption {
  emoji: string;
  element: ElementType; // 五行归属 → 头像底环色
  label: string;        // 中文名（无障碍 / 可选搜索）
}

/** 头像库：约 44 个，五行均衡混搭（治愈绿 / 青碧水 / 暖橙火 / 厚土 / 流金） */
export const AVATARS: AvatarOption[] = [
  // —— 木（治愈绿）——
  { emoji: '🌿', element: 'wood', label: '灵草' },
  { emoji: '🌱', element: 'wood', label: '新芽' },
  { emoji: '🌳', element: 'wood', label: '大树' },
  { emoji: '🍃', element: 'wood', label: '落叶' },
  { emoji: '🌲', element: 'wood', label: '松柏' },
  { emoji: '🌸', element: 'wood', label: '樱花' },
  { emoji: '🌼', element: 'wood', label: '雏菊' },
  { emoji: '🌺', element: 'wood', label: '木槿' },
  { emoji: '🦋', element: 'wood', label: '蝴蝶' },
  // —— 水（青碧）——
  { emoji: '💧', element: 'water', label: '露珠' },
  { emoji: '🌊', element: 'water', label: '海浪' },
  { emoji: '🫧', element: 'water', label: '气泡' },
  { emoji: '🐟', element: 'water', label: '游鱼' },
  { emoji: '🐬', element: 'water', label: '海豚' },
  { emoji: '🌙', element: 'water', label: '明月' },
  { emoji: '🕊️', element: 'water', label: '白鸽' },
  { emoji: '🌧️', element: 'water', label: '细雨' },
  { emoji: '☁️', element: 'water', label: '云朵' },
  // —— 火（暖橙）——
  { emoji: '☀️', element: 'fire', label: '暖阳' },
  { emoji: '🔥', element: 'fire', label: '星火' },
  { emoji: '🌻', element: 'fire', label: '向日葵' },
  { emoji: '🦊', element: 'fire', label: '灵狐' },
  { emoji: '🌟', element: 'fire', label: '晨星' },
  { emoji: '✨', element: 'fire', label: '流光' },
  { emoji: '⚡', element: 'fire', label: '惊雷' },
  { emoji: '🏮', element: 'fire', label: '灯笼' },
  { emoji: '🍂', element: 'fire', label: '红叶' },
  // —— 土（厚土）——
  { emoji: '🪨', element: 'earth', label: '顽石' },
  { emoji: '⛰️', element: 'earth', label: '远山' },
  { emoji: '🍄', element: 'earth', label: '菌菇' },
  { emoji: '🐻', element: 'earth', label: '小熊' },
  { emoji: '🌾', element: 'earth', label: '麦穗' },
  { emoji: '🐰', element: 'earth', label: '玉兔' },
  { emoji: '🌰', element: 'earth', label: '橡果' },
  { emoji: '🍯', element: 'earth', label: '蜜罐' },
  { emoji: '🐾', element: 'earth', label: '爪印' },
  // —— 金（流金）——
  { emoji: '🪙', element: 'gold', label: '金锭' },
  { emoji: '💫', element: 'gold', label: '流星' },
  { emoji: '🔔', element: 'gold', label: '风铃' },
  { emoji: '🪷', element: 'gold', label: '金莲' },
  { emoji: '🐉', element: 'gold', label: '祥龙' },
  { emoji: '🦄', element: 'gold', label: '麒麟' },
  { emoji: '🪞', element: 'gold', label: '宝镜' },
  { emoji: '🌷', element: 'gold', label: '郁金' },
];

/** 五行底环渐变（复用项目柔色基调：global.css --wuxing-* / gallery ELEMENT_COLORS） */
export const ELEMENT_RING: Record<ElementType, { from: string; to: string }> = {
  gold:  { from: '#F7EDD0', to: '#E6C677' },
  wood:  { from: '#DCEFD6', to: '#8CCB8A' },
  water: { from: '#D6EAF4', to: '#7FB8E0' },
  fire:  { from: '#FBE0D4', to: '#E8916A' },
  earth: { from: '#F0E6D2', to: '#C9A66B' },
};

/** 默认底环（未选五行 / 昵称首字态）：与「我的」页原头像紫色一致 */
export const DEFAULT_RING = { from: '#8A80D8', to: '#A39AE8' };

let _last = '';
/** 随机一个头像（均匀随机，且不与上一次相同，避免连点撞重复） */
export function randomAvatar(): AvatarOption {
  const pool = AVATARS;
  let pick = pool[(Math.random() * pool.length) | 0];
  if (pool.length > 1) {
    let guard = 0;
    while (pick.emoji === _last && guard++ < 10) pick = pool[(Math.random() * pool.length) | 0];
  }
  _last = pick.emoji;
  return pick;
}
