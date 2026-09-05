/**
 * src/constants/artifacts.ts —— 法器配置（02-全局核心常量 三·法器清单 L46-L51）
 * 机制：达成成就门槛解锁 → 可装备 → 装备后强化对应产出端；升级消耗碎片提升效果
 */
import type { IArtifact, ArtifactId } from '@/types/index';

/** 统一从 types 转出，保持既有 `from '@/constants/artifacts'` 导入路径不变 */
export type { ArtifactId };

/** 解锁进度来源键（store 内对应计数 / 现有计数器） */
export type UnlockKey = 'harvest' | 'onlineSec' | 'defend' | 'musicListen' | 'overflow';

export interface ArtifactCfg {
  id: ArtifactId;
  name: string;
  emoji: string;
  /** 一句话定位（hero 副标题 / 卡片描述） */
  blurb: string;
  /** 解锁成就文案（🔒 时显示） */
  unlockText: string;
  unlockKey: UnlockKey;
  unlockThreshold: number;
  /** 每级效果文案（level 1-5） */
  effectText: (level: number) => string;
  /** 主线产出端标识（指南说明用） */
  bonusTarget: string;
  /** 碎片真实来源（卡片/指南展示，杜绝"旅行掉落"类虚假承诺） */
  fragSource: string;
  /** 需联机才真正生效：单机可查看，但效果与碎片待联机开放（结界符） */
  onlineOnly?: boolean;
}

export const ARTIFACT_LIST: ArtifactCfg[] = [
  {
    id: 'bell',
    name: '招财铃',
    emoji: '🔔',
    blurb: '系于灵田的风铃，收获时引动一缕财气',
    unlockText: '灵植收获满 10 次解锁',
    unlockKey: 'harvest',
    unlockThreshold: 10,
    effectText: (lv) => `元宝产出 +${lv * 10}%（满级 +50%）`,
    bonusTarget: '灵植收获',
    fragSource: '灵植收获时掉落（凡品 15% / 灵品 35% / 仙品必得）',
  },
  {
    id: 'bowl',
    name: '聚灵碗',
    emoji: '🥣',
    blurb: '静置案头的玉碗，缓缓聚拢天地灵气',
    unlockText: '累计在线满 10 小时解锁',
    unlockKey: 'onlineSec',
    unlockThreshold: 36000,
    effectText: (lv) => `灵气恢复速度 +${lv * 20}%（满级 +100%）`,
    bonusTarget: '灵气恢复',
    fragSource: '累计在线每满 1 小时得 1 枚',
  },
  {
    id: 'amulet',
    name: '结界符',
    emoji: '🪬',
    blurb: '温柔结界护住小院，访客借走也留得住',
    unlockText: '联机后开放 · 守护灵田 10 次',
    unlockKey: 'defend',
    unlockThreshold: 10,
    effectText: (lv) => `访客借走比例 -${lv * 20}%（满级免借）· 联机后生效`,
    bonusTarget: '守护灵田',
    fragSource: '联机后开放',
    onlineOnly: true,
  },
  {
    id: 'flute',
    name: '空灵笛',
    emoji: '🎋',
    blurb: '吹奏时魔气随音律流转，听歌收益倍增',
    unlockText: '天籁听歌累计满 1 小时解锁',
    unlockKey: 'musicListen',
    unlockThreshold: 3600,
    effectText: (lv) => `天籁魔丸产出 ×${lv + 1}（满级 ×6）`,
    bonusTarget: '天籁产出',
    fragSource: '天籁聆听每满 1 小时得 1 枚（里程碑另有加成）',
  },
  {
    id: 'wheel',
    name: '轮回珠',
    emoji: '☸️',
    blurb: '掌中流转的宝珠，满溢时必有回响',
    unlockText: '情绪瓶满溢 1 次解锁',
    unlockKey: 'overflow',
    unlockThreshold: 1,
    effectText: (lv) => `满溢必得天玑×1，额外灵珠 +${lv}`,
    bonusTarget: '情绪瓶满溢',
    fragSource: '情绪瓶每次满溢得 1 枚',
  },
];

export const ARTIFACT_META: Record<ArtifactId, ArtifactCfg> = Object.fromEntries(
  ARTIFACT_LIST.map((c) => [c.id, c]),
) as Record<ArtifactId, ArtifactCfg>;

/** 升级消耗：每级 3 碎片（与空灵笛碎片规则一致），满级 5 */
export const ARTIFACT_MAX_LEVEL = 5;
export const ARTIFACT_UPGRADE_FRAG = 3;

export type { IArtifact };
