// src/stores/useCheckinStore.ts —— 七日灵签（签到系统）
//
// 【连签位 streak 的语义】= 本轮已连续签到的天数（0~7）。
//   今日可领第几天 = streak >= 7 ? 1（新循环） : streak + 1
//   领完 streak 直接置为「刚领的那一天」，满 7 后自然回到 1，无需额外循环变量。
//
// 【断签规则】回退 1 天，永不归零（治愈系铁律：不惩罚玩家）。
//   回退在 ensureDailyReset() 里惰性执行，用 lastEvalDate 保证同一天只判定一次（幂等）。
//   判定必须在「打开面板」之前完成，否则面板会显示回退前的旧天数，与玩家实际可领的对不上。
//
// 【补签】花 20 元宝补回昨天：撤销本次回退 + 补领昨天那份奖励 + 当日仍可正常签到。
//   一天最多补 1 次（makeupDate），且把 lastCheckinDate 回拨到昨天，使今日签到不触发二次回退。
import { defineStore } from 'pinia';
import { useUserStore } from './useUserStore';
import { useModulesStore } from './useModulesStore';
import type { CheckinReward, CheckinMilestone } from '@/constants/checkin';

const DAY_MS = 24 * 60 * 60 * 1000;
const todayKey = () => new Date().toISOString().slice(0, 10);
const yesterdayKey = () => new Date(Date.now() - DAY_MS).toISOString().slice(0, 10);

/** 两个 YYYY-MM-DD 之间相差的自然日数（按 UTC 零点对齐，避免时区分界处算错） */
function dayGap(from: string, to: string): number {
  const a = Date.parse(from + 'T00:00:00Z');
  const b = Date.parse(to + 'T00:00:00Z');
  return Math.round((b - a) / DAY_MS);
}

export interface CheckinResult {
  /** 本次领的是第几天（1~7） */
  day: number;
  reward: CheckinReward;
  /** 签文（仙侠仪式感文案） */
  quote: string;
  /** 领完后的连签位 */
  streak: number;
  /** 本次顺带达成的累计里程碑（auto-grant，无需二次点击） */
  milestone: CheckinMilestone | null;
}

export type MakeupFailReason = 'checkedIn' | 'used' | 'none' | 'noGold';

export const useCheckinStore = defineStore('checkin', {
  state: () => ({
    /** 上次签到日期 YYYY-MM-DD（'' = 从未签过） */
    lastCheckinDate: '',
    /** 连签位 0~7：本轮已连续签到天数 */
    streak: 0,
    /** 累计签到总天数（永不重置，喂长线里程碑） */
    totalDays: 0,
    /** 已发放的累计里程碑（存 days 值，防重复发奖） */
    milestoneClaimed: [] as number[],
    /** 上次补签的日期（每个自然日最多补 1 次） */
    makeupDate: '',
    /** 上次执行断签判定的日期（保证 ensureDailyReset 幂等） */
    lastEvalDate: '',
  }),

  getters: {
    /** 今日是否已签到 */
    isCheckedInToday: (s) => s.lastCheckinDate === todayKey(),
    /** 今日可领第几天（1~7） */
    todayDay: (s) => (s.streak >= 7 ? 1 : s.streak + 1),
    /** 今日能否补签（未签到 + 确实漏了至少 1 天 + 今日未补过） */
    canMakeup: (s) => {
      const today = todayKey();
      if (s.lastCheckinDate === today) return false;
      if (s.makeupDate === today) return false;
      if (!s.lastCheckinDate) return false;       // 从未签过，无需补
      return dayGap(s.lastCheckinDate, today) >= 2;
    },
    /** 下一个待达成的累计里程碑 */
    nextMilestone: (s) => useModulesStore().checkinNextMilestone(s.totalDays),
    /** 下一个里程碑的进度百分比（0~100，无里程碑时为 100） */
    milestoneProgress: (s) => {
      const modules = useModulesStore();
      const next = modules.checkinNextMilestone(s.totalDays);
      if (!next) return 100;
      const ms = modules.checkinConfig.milestones || [];
      const reached = [...ms].reverse().find((m) => s.totalDays >= m.days);
      const base = reached ? reached.days : 0;
      const span = next.days - base;
      if (span <= 0) return 100;
      return Math.min(100, Math.round(((s.totalDays - base) / span) * 100));
    },
  },

  actions: {
    /**
     * 断签判定（幂等）：由路由守卫/启动流程调用，也可在任何需要准确天数前主动调用。
     * 规则：距上次签到 >= 2 天 → streak 回退 1（最低 0）。注意不是归零。
     */
    ensureDailyReset() {
      const today = todayKey();
      if (this.lastEvalDate === today) return; // 今日已判定过
      if (this.lastCheckinDate && dayGap(this.lastCheckinDate, today) >= 2) {
        this.streak = Math.max(0, this.streak - 1);
      }
      this.lastEvalDate = today;
    },

    /** 统一发奖（仅发放 changeCurrency 支持的四种货币） */
    grant(reward: CheckinReward) {
      const user = useUserStore();
      if (reward.gold) user.changeCurrency('gold', reward.gold);
      if (reward.pearl) user.changeCurrency('pearl', reward.pearl);
      if (reward.magic) user.changeCurrency('magic', reward.magic);
      if (reward.jade) user.changeCurrency('jade', reward.jade);
    },

    /**
     * 签到：发当日奖励 + 连签位前进 + 累计天数 +1 + 顺带自动发放已达成的里程碑。
     * 里程碑采用 auto-grant（不额外要一次点击），避免玩家忘记领而损失奖励。
     * @returns 签到结果（含签文与里程碑），今日已签返回 null
     */
    checkin(): CheckinResult | null {
      const today = todayKey();
      if (this.lastCheckinDate === today) return null; // 今日已签
      this.ensureDailyReset();

      const day = this.streak >= 7 ? 1 : this.streak + 1;
      const cfg = useModulesStore().checkinDay(day);
      this.grant(cfg.reward);

      // 连签位直接置为刚领的那天：满 7 后自然回到 1，无需单独维护循环游标
      this.streak = day;
      this.totalDays += 1;
      this.lastCheckinDate = today;

      // 累计里程碑：找出「刚好跨过且未发过」的那一级
      let milestone: CheckinMilestone | null = null;
      for (const m of useModulesStore().checkinConfig.milestones) {
        if (this.totalDays >= m.days && !this.milestoneClaimed.includes(m.days)) {
          this.grant(m.reward);
          this.milestoneClaimed.push(m.days);
          milestone = m;
          break; // 一次只发一级，多级跨越时下次签到接着发（避免一次性刷屏）
        }
      }

      return { day, reward: cfg.reward, quote: cfg.quote, streak: this.streak, milestone };
    },

    /**
     * 补签：花 20 元宝补回昨天 —— 撤销本次回退、补领昨天那份奖励、今日仍可正常签到。
     * 实现要点：把 lastCheckinDate 回拨到昨天，使随后的 checkin() 判定为连签（gap=1）不再回退。
     */
    makeup(): { ok: true; day: number; reward: CheckinReward } | { ok: false; reason: MakeupFailReason } {
      const today = todayKey();
      if (this.lastCheckinDate === today) return { ok: false, reason: 'checkedIn' };
      if (this.makeupDate === today) return { ok: false, reason: 'used' };
      if (!this.lastCheckinDate) return { ok: false, reason: 'none' };
      this.ensureDailyReset();

      const user = useUserStore();
      const makeupCost = useModulesStore().checkinConfig.makeupCost;
      if (user.gold < makeupCost) return { ok: false, reason: 'noGold' };
      user.changeCurrency('gold', -makeupCost);

      const day = this.streak >= 7 ? 1 : this.streak + 1;
      const cfg = useModulesStore().checkinDay(day);
      this.grant(cfg.reward);

      this.streak = day;
      this.totalDays += 1;
      this.lastCheckinDate = yesterdayKey(); // 回拨：让今日的 checkin 走得是连签分支
      this.makeupDate = today;

      return { ok: true, day, reward: cfg.reward };
    },
  },

  persist: {
    key: 'lingjing:checkin',
    paths: ['lastCheckinDate', 'streak', 'totalDays', 'milestoneClaimed', 'makeupDate', 'lastEvalDate'],
  },
});
