// src/stores/useRaceStore.ts —— 仙宠竞速（赛马式小游戏）状态与结算
// 一期纯前端：玩家派当前陪伴仙宠出战，对手为机器人；联网后 beginRace 预留真人匹配占位。
// 结算权威在此 store：beginRace 扣费+冷却+计场次，finishRace 发奖+每日封顶+逆袭彩头。
import { defineStore } from 'pinia';
import type { ElementType } from '@/types/index';
import { useUserStore } from './useUserStore';
import { useModulesStore, PET_META, PET_ELEMENTS } from './useModulesStore';
import type { Racer, IRaceOpponentSource, RaceOpponentContext, RaceOpponentMode } from '@/constants/race';
import { PET_PERSONALITY } from '@/constants/race';
import type { RaceOpponent } from '@/services/supabase';
import { uploadRaceScore } from '@/services/supabase';

const todayKey = () => new Date().toISOString().slice(0, 10);
/** 本周键（用于周积分清零）：年 + 周一所在周序号 */
function weekKey(d = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7; // 周一=0
  date.setUTCDate(date.getUTCDate() - dayNum);
  return date.toISOString().slice(0, 10);
}

/** 称号定义（达标即解锁，本地持久化到 titles 数组）。condition 在结算时判定。 */
export interface RaceTitleDef { id: string; name: string; emoji: string; desc: string }
export const RACE_TITLES: RaceTitleDef[] = [
  { id: 'first_win', name: '初露锋芒', emoji: '🌟', desc: '完成首次夺冠' },
  { id: 'streak3', name: '三连胜王', emoji: '🔥', desc: '达成三连胜' },
  { id: 'streak5', name: '五连胜王', emoji: '👑', desc: '达成五连胜' },
  { id: 'hundred', name: '百战萌将', emoji: '🛡️', desc: '累计参赛 100 场' },
  { id: 'veteran', name: '常胜将军', emoji: '🏆', desc: '累计夺冠 50 次' },
  { id: 'weekly_star', name: '周榜新星', emoji: '✨', desc: '单周积分达 30' },
];

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export interface RaceStartInfo {
  racers: Racer[];
  trackElement: ElementType;
  /** 按基础速度（不含事件）排的预期名次（1=最快），用于“逆袭彩头”判定 */
  predictedRank: number;
  isPaid: boolean;
  /** 赛前同元素结阵信息（用于结算/展示）：元素 → 参与只数 */
  teamBuff: Record<string, number>;
}
export interface RaceResult {
  rank: number;
  gold: number;
  pearl: number;
  comfort: boolean;
  upset: boolean;
  expectedRank: number;
  winStreak: number;
  weeklyPoints: number;
  streakBonus: number;
  newTitles: string[];
}

/* —— 选手来源层实现（联机二期只换这一层，赛道表现层 RaceTrack.vue 不变） —— */
const localBotOpponentSource: IRaceOpponentSource = {
  mode: 'bot',
  getOpponents(ctx: RaceOpponentContext) {
    const pool = [...ctx.botNames];
    const modules = useModulesStore();
    const bots: Racer[] = [];
    for (let i = 0; i < ctx.count; i++) {
      const bel = pick(PET_ELEMENTS);
      const nm = pool.length ? pool.splice(Math.floor(Math.random() * pool.length), 1)[0] : `灵宠${i + 1}`;
      const botCond = rand(0.95, 1.05);
      bots.push({
        id: 'bot' + i,
        name: nm,
        emoji: PET_META[bel].emoji,
        element: bel,
        isPlayer: false,
        baseSpeed: ctx.makeBase(bel, botCond),
        speedFactor: modules.raceSpeedFactor(bel, ctx.trackElement),
        personality: PET_PERSONALITY[bel],
        teamBuffed: false,
      });
    }
    return bots;
  },
};

/**
 * 在线真人对手来源（联机二期）：当前无后端，返回空数组 + 打 warn；
 * beginRace 检测到空会自动回退本地 BOT，保证可玩。
 * 接入后端后改为 async 匹配真人宠物填充此处（算法不变）。
 */
const onlineHumanOpponentSource: IRaceOpponentSource = {
  mode: 'online',
  getOpponents() {
    console.warn('[race] 在线对手来源尚未接入后端，已回退本地 BOT');
    return [];
  },
};

/** 按 opponentMode 选择选手来源层；online 未就绪（返回空）时自动回退 bot */
function selectRaceOpponents(ctx: RaceOpponentContext, mode: RaceOpponentMode): Racer[] {
  const src: IRaceOpponentSource = mode === 'online' ? onlineHumanOpponentSource : localBotOpponentSource;
  const opp = src.getOpponents(ctx);
  if (opp.length === 0) return localBotOpponentSource.getOpponents(ctx); // 在线回退
  return opp;
}

export const useRaceStore = defineStore('race', {
  state: () => ({
    date: todayKey(),
    freeUsed: 0,
    paidUsed: 0,
    rewardGoldToday: 0,
    rewardPearlToday: 0,
    lastRaceAt: { gold: 0, wood: 0, water: 0, fire: 0, earth: 0 } as Record<ElementType, number>,
    totalRaces: 0,
    bestRank: 0,
    // —— 元进度（连胜 / 周积分 / 称号）——
    winStreak: 0,
    totalWins: 0,
    weeklyPoints: 0,
    weekKey: weekKey(),
    titles: [] as string[],
    // —— 占用一致性：当前正在比赛的出战仙宠（防止赛跑与旅行重叠）——
    activeRacePet: null as ElementType | null,
    // —— B4 异步对战：当前挑战对象（他人最佳成绩）与上一局对战结果 ——
    challenge: null as { targetMs: number; petElement: string } | null,
    lastChallenge: null as { win: boolean; myMs: number; targetMs: number; petElement: string } | null,
  }),

  getters: {
    freeLeft(): number {
      return Math.max(0, useModulesStore().raceConfig.dailyFree - this.freeUsed);
    },
    paidLeft(): number {
      return Math.max(0, useModulesStore().raceConfig.paidDailyLimit - this.paidUsed);
    },
    /** 已解锁称号（按定义顺序返回，便于展示） */
    unlockedTitles(): RaceTitleDef[] {
      return RACE_TITLES.filter((t) => this.titles.includes(t.id));
    },
  },

  actions: {
    /** 每日跨天重置（路由进入时由父组件 ensureDailyReset 调用，这里幂等兜底） */
    ensureDailyReset() {
      const t = todayKey();
      if (this.date !== t) {
        this.date = t;
        this.freeUsed = 0;
        this.paidUsed = 0;
        this.rewardGoldToday = 0;
        this.rewardPearlToday = 0;
        (Object.keys(this.lastRaceAt) as ElementType[]).forEach((k) => { this.lastRaceAt[k] = 0; });
      }
      // 周积分跨周清零（与每日重置一并幂等触发）
      const wk = weekKey();
      if (this.weekKey !== wk) {
        this.weekKey = wk;
        this.weeklyPoints = 0;
      }
    },

    /**
     * 某元素仙宠的参赛资格状态：
     * - 'idle' 空闲可赛 / 'traveling'|'returning' 占用中 / 'locked' 未解锁
     * 多宠独立：一只旅行绝不妨碍其他已解锁空闲宠参赛。
     */
    petStatus(el: ElementType): 'idle' | 'traveling' | 'returning' | 'locked' {
      const modules = useModulesStore();
      if (!modules.pet.ownedPets.includes(el)) return 'locked';
      return modules.getUnit(el).travelStatus;
    },
    /** 是否存在任意空闲可赛仙宠（无则整页禁用并提示「暂无可出战仙宠」） */
    hasAvailablePet(): boolean {
      const modules = useModulesStore();
      return modules.pet.ownedPets.some((el) => this.petStatus(el) === 'idle');
    },

    /**
     * 能否开赛（指定出战仙宠 el，纯查询）。
     * 返回 mode：'free' 免费场 / 'paid' 付费场（扣 15 元宝）/ null 不能开。
     */
    canStart(el: ElementType): { canStart: boolean; reason: 'traveling' | 'racing' | 'cooldown' | 'noGold' | 'limit' | 'locked' | 'noIdle' | ''; mode: 'free' | 'paid' | null } {
      this.ensureDailyReset();
      const modules = useModulesStore();
      const rc = modules.raceConfig;
      if (!modules.pet.ownedPets.includes(el)) return { canStart: false, reason: 'locked', mode: null };
      if (this.activeRacePet === el) return { canStart: false, reason: 'racing', mode: null };
      const st = modules.getUnit(el).travelStatus;
      if (st !== 'idle') return { canStart: false, reason: 'traveling', mode: null };
      if (Date.now() - (this.lastRaceAt[el] || 0) < rc.cooldownMs) return { canStart: false, reason: 'cooldown', mode: null };
      if (this.freeUsed < rc.dailyFree) return { canStart: true, reason: '', mode: 'free' };
      if (this.paidUsed < rc.paidDailyLimit) {
        const user = useUserStore();
        if (user.gold >= rc.paidCost) return { canStart: true, reason: '', mode: 'paid' };
        return { canStart: false, reason: 'noGold', mode: null };
      }
      return { canStart: false, reason: 'limit', mode: null };
    },

    /**
     * 占用一致性：竞速结束/关闭时解锁出战仙宠（防止与旅行重叠）。
     * 竞速是同步 overlay，正常由 finishRace 调用；异常退出（离开页面）也兜底调用，避免死锁。
     */
    releaseRacePet() {
      this.activeRacePet = null;
    },

    /** B4 异步对战：设定挑战对象（他人的最佳成绩） */
    setChallenge(opp: RaceOpponent) {
      this.challenge = { targetMs: opp.timeMs, petElement: opp.petElement };
      this.lastChallenge = null; // 新挑战覆盖上一局结果
    },
    /** 取消挑战 */
    clearChallenge() {
      this.challenge = null;
      this.lastChallenge = null;
    },
    /** 仅清上一局对战结果（开赛前调用，保留当前挑战对象） */
    clearLastChallenge() {
      this.lastChallenge = null;
    },
    /**
     * B4 异步对战：本局结束后调用。上传成绩到云端（best-effort），
     * 若处于挑战中，则按「用时 ≤ 对方最佳」判定胜负并写入 lastChallenge。
     */
    submitRaceScore(durationMs: number, rank: number, petElement: ElementType) {
      const modules = useModulesStore();
      const trackId = modules.raceTrackSkin().id;
      const weatherId = modules.raceWeather().id;
      void uploadRaceScore(trackId, weatherId, durationMs, petElement); // 不阻塞
      if (this.challenge) {
        const win = durationMs <= this.challenge.targetMs;
        this.lastChallenge = {
          win,
          myMs: Math.round(durationMs),
          targetMs: this.challenge.targetMs,
          petElement: this.challenge.petElement,
        };
      }
    },

    /**
     * 开赛：扣费 + 冷却 + 计场次，并构建 6 名选手（1 玩家 + 5 机器人）。
     * 机器人属性按五行 × 赛道系数 + 随机状态模拟，山海经风命名不穿帮。
     * 联网二期：此处改为 async，优先匹配真人宠物，不足补机器人（算法不变）。
     */
    beginRace(el: ElementType): RaceStartInfo | null {
      const chk = this.canStart(el);
      if (!chk.canStart) return null;
      const user = useUserStore();
      const modules = useModulesStore();
      const rc = modules.raceConfig;
      const isPaid = chk.mode === 'paid';
      if (isPaid) user.changeCurrency('gold', -rc.paidCost);
      this.lastRaceAt[el] = Date.now();
      if (isPaid) this.paidUsed += 1; else this.freeUsed += 1;

      const trackElement = modules.raceTrackElement();
      const skin = modules.raceTrackSkin();
      const weather = modules.raceWeather();
      // 全局修正：皮肤 × 天气（雪原 + 雷暴 = 全员更慢且事件频发，制造更多翻盘谈资）
      const globalMult = skin.speedMult * weather.speedMult;

      const makeBase = (bel: ElementType, cond: number) => {
        const f = modules.raceSpeedFactor(bel, trackElement);
        const p = PET_PERSONALITY[bel];
        return rc.baseSpeed * f * cond * globalMult * p.baseSpeedMult * rand(0.96, 1.04);
      };

      const u = modules.getUnit(el);
      // 养成闭环：饱食+愉悦越好，出战状态系数越高（0.9~1.1）
      const condition = 0.9 + 0.1 * Math.min(100, u.hunger) / 100 + 0.1 * Math.min(100, u.happiness) / 100;
      const pPersonality = PET_PERSONALITY[el];
      const player: Racer = {
        id: 'player',
        name: u.petName || PET_META[el].name,
        emoji: PET_META[el].emoji,
        element: el,
        isPlayer: true,
        baseSpeed: makeBase(el, condition),
        speedFactor: modules.raceSpeedFactor(el, trackElement),
        personality: pPersonality,
        teamBuffed: false,
      };

      // —— 选手来源层（联机二期只换这一层；当前 opponentMode='bot'，online 未接入自动回退）——
      const bots = selectRaceOpponents(
        { count: 5, trackElement, botNames: rc.botNames, makeBase },
        rc.opponentMode,
      );

      const racers = [player, ...bots];

      // 同元素结阵：统计各元素出现次数，>=2 只则这些选手获得 teamBuffMult（赛前可见策略）
      const teamBuff: Record<string, number> = {};
      racers.forEach((r) => { teamBuff[r.element] = (teamBuff[r.element] || 0) + 1; });
      const buffedEls = Object.keys(teamBuff).filter((k) => teamBuff[k] >= 2);
      if (buffedEls.length && rc.teamBuffMult > 1) {
        racers.forEach((r) => {
          if (buffedEls.includes(r.element)) {
            r.baseSpeed *= rc.teamBuffMult;
            r.teamBuffed = true;
          }
        });
      }

      // 占用一致性：锁定出战仙宠，防止赛跑与旅行重叠（竞速结束/关闭时解锁）
      this.activeRacePet = el;

      // 预期名次：按基础速度（不含事件）排序，玩家所在位置 +1
      const sorted = [...racers].sort((a, b) => b.baseSpeed - a.baseSpeed);
      const predictedRank = sorted.findIndex((r) => r.isPlayer) + 1;
      return { racers, trackElement, predictedRank, isPaid, teamBuff };
    },

    /**
     * 结算：按最终名次发奖（含每日封顶），并计算逆袭彩头、连胜加成、周积分与称号解锁。
     * 全程不直接操作货币以外的状态，奖励走 user.changeCurrency（统一整数/防负）。
     */
    finishRace(playerFinalRank: number, predictedRank: number): RaceResult {
      const rc = useModulesStore().raceConfig;
      const reward = rc.rankRewards[playerFinalRank] ?? { gold: 0, pearl: 0 };
      const user = useUserStore();

      // 连胜：夺冠 +1，否则清零；连胜加成倍率封顶（streakBonusCap），让持续夺冠更有甜头
      const win = playerFinalRank === 1;
      this.winStreak = win ? this.winStreak + 1 : 0;
      if (win) this.totalWins += 1;
      const streakBonusCap = 0.5;
      const streakBonus = win ? Math.min(streakBonusCap, (this.winStreak - 1) * 0.1) : 0;

      let gold = Math.round(reward.gold * (1 + streakBonus));
      if (this.rewardGoldToday + gold > rc.dailyGoldCap) {
        gold = Math.max(0, rc.dailyGoldCap - this.rewardGoldToday);
      }
      let pearl = reward.pearl;
      if (this.rewardPearlToday + pearl > rc.dailyPearlCap) {
        pearl = Math.max(0, rc.dailyPearlCap - this.rewardPearlToday);
      }

      // 逆袭彩头：实际比预期好 ≥2 位 → 额外奖励（封顶内）
      const upset = predictedRank - playerFinalRank >= 2;
      let upsetGold = 0;
      if (upset) {
        upsetGold = rc.upsetBonus.gold;
        if (this.rewardGoldToday + gold + upsetGold > rc.dailyGoldCap) {
          upsetGold = Math.max(0, rc.dailyGoldCap - this.rewardGoldToday - gold);
        }
      }

      user.changeCurrency('gold', gold + upsetGold);
      user.changeCurrency('pearl', pearl);
      this.rewardGoldToday += gold + upsetGold;
      this.rewardPearlToday += pearl;
      this.totalRaces += 1;
      this.bestRank = this.bestRank === 0 ? playerFinalRank : Math.min(this.bestRank, playerFinalRank);

      // 周积分：按名次计分（夺冠最多），跨周已在 ensureDailyReset 清零
      const rankPts: Record<number, number> = { 1: 10, 2: 6, 3: 3, 4: 1, 5: 1, 6: 1 };
      this.weeklyPoints += rankPts[playerFinalRank] ?? 1;

      // 称号解锁：逐项判定，新增的标题收集进 newTitles 供结算展示
      const newTitles: string[] = [];
      const tryUnlock = (id: string, ok: boolean) => {
        if (ok && !this.titles.includes(id)) { this.titles.push(id); newTitles.push(id); }
      };
      tryUnlock('first_win', this.totalWins >= 1);
      tryUnlock('streak3', this.winStreak >= 3);
      tryUnlock('streak5', this.winStreak >= 5);
      tryUnlock('hundred', this.totalRaces >= 100);
      tryUnlock('veteran', this.totalWins >= 50);
      tryUnlock('weekly_star', this.weeklyPoints >= 30);

      // 解锁出战仙宠占用（占用一致性）
      this.activeRacePet = null;

      return {
        rank: playerFinalRank,
        gold,
        pearl,
        comfort: !!reward.comfort,
        upset,
        expectedRank: predictedRank,
        winStreak: this.winStreak,
        weeklyPoints: this.weeklyPoints,
        streakBonus,
        newTitles,
      };
    },
  },

  // 持久化（pinia-plugin-persistedstate v3）
  persist: {
    key: 'lingjing:race',
    paths: ['date', 'freeUsed', 'paidUsed', 'rewardGoldToday', 'rewardPearlToday', 'lastRaceAt', 'totalRaces', 'bestRank',
      'winStreak', 'totalWins', 'weeklyPoints', 'weekKey', 'titles', 'activeRacePet'],
  },
});
