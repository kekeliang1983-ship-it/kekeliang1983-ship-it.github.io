// src/stores/useUserStore.ts —— 用户核心数值（持久化）
import { defineStore } from 'pinia';
import type { IUser } from '@/types/index';
import { emitResourceDelta } from '@/composables/useResourceDelta';

const DAY_MS = 24 * 60 * 60 * 1000;
const todayKey = () => new Date().toISOString().slice(0, 10);

// 昵称长度约束（起名/改名统一，2~8 个字符，按码点计兼容 emoji）
export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 8;

export const useUserStore = defineStore('user', {
  state: (): IUser => ({
    level: 1,
    exp: 0,
    maxExp: 100,
    gold: 200,          // 初始元宝（略高于日循环测试的硬成本）
    pearl: 50,          // 初始灵珠
    magic: 10,          // 初始魔丸
    jade: 0,            // 初始天玑（稀有）
    qi: 100,            // 初始满灵气
    maxQi: 100,
    mood: 80,           // 初始心境=80（02-全局常量 BASE_MOOD）
    lastActiveTimestamp: Date.now(),
    lastDailyReset: todayKey(),
    nickname: null,
    avatar: null,          // 头像：emoji 字符串或 null（null=用昵称首字）
    renameSkipped: false,  // 首进起名引导是否已跳过（持久化，跳过后不再自动弹）
    notifUnread: 3,     // 初始通知（测试角标用）
    soundOn: true,      // 音效开关（持久化；初始化时应用到 audio 引擎）
    hapticOn: true,     // 震动开关（持久化；初始化时应用到 haptic 引擎）
    qiBubbleDate: '',   // 灵气泡泡当日已收日期（初始空→首次进入按当天处理）
    qiBubbleGain: 0,    // 灵气泡泡当日已收灵气
  }),

  getters: {
    isMoodCritActive: (s) => s.mood > 80,
    /** 统一回退的显示名：无昵称时回退 '友'，消除各处散落的 || '友' */
    displayName: (state): string => {
      const n = state.nickname;
      return (n && n.trim()) ? n.trim() : '友';
    },
  },

  actions: {
    /** 每日重置检测（路由进入时调用）—— 参考project_memory跨天重置规则 */
    ensureDailyReset() {
      const today = todayKey();
      if (this.lastDailyReset !== today) {
        this.lastDailyReset = today;
        this.mood = Math.max(70, this.mood - 10); // 每日衰减-10（01-全局规则 L14）
        this.qiBubbleDate = today;
        this.qiBubbleGain = 0;
        // 注意：情绪瓶todayUsed/shrineOffersToday/dailyLimits的重置在modulesStore内同步执行
      }
      this.lastActiveTimestamp = Date.now();
    },

    /** 修改货币（统一用Math.floor确保整数，参考05-核心指令）*/
    changeCurrency(currency: 'gold' | 'pearl' | 'magic' | 'jade', delta: number) {
      const before = this[currency];
      this[currency] = Math.max(0, Math.floor(before + delta));
      emitResourceDelta(currency, this[currency] - before);
    },

    /**
     * 统一消费端：原子校验 + 扣减（替代各模块散落的“余额检查 + changeCurrency”）。
     * - 任一货币不足：返回首个不足货币，且不扣任何币（避免半扣）
     * - 全部充足：一次性扣减，返回 { ok: true }
     * 接入点：所有购买/消耗统一走此方法（01/02/03 多货币消费）
     */
    purchase(cost: Partial<Record<'gold' | 'pearl' | 'magic' | 'jade', number>>):
      { ok: true } | { ok: false; reason: 'insufficient'; currency: 'gold' | 'pearl' | 'magic' | 'jade' } {
      const keys = ['gold', 'pearl', 'magic', 'jade'] as const;
      for (const c of keys) {
        const need = cost[c] ?? 0;
        if (need > 0 && this[c] < need) return { ok: false, reason: 'insufficient', currency: c };
      }
      for (const c of keys) {
        const need = cost[c] ?? 0;
        if (need > 0) this.changeCurrency(c, -need);
      }
      return { ok: true };
    },

    /** 灵气增减（0~maxQi 裁剪，05/08：每5分钟恢复1点，操作消耗）*/
    changeQi(delta: number) {
      const before = this.qi;
      this.qi = Math.max(0, Math.min(this.maxQi, Math.floor(this.qi + delta)));
      emitResourceDelta('qi', this.qi - before);
    },

    /** 心境增减（0~100 裁剪，01-L14：天籁聆听+2/满5分钟，每日-10）*/
    changeMood(delta: number) {
      const before = this.mood;
      this.mood = Math.max(0, Math.min(100, this.mood + delta));
      emitResourceDelta('mood', this.mood - before);
    },

    /** 获得种植经验并升级（08-L433-438：exp累加，>=maxExp 则升级，maxExp×1.2 递增）*/
    addExp(n: number) {
      this.exp += n;
      while (this.exp >= this.maxExp) {
        this.exp -= this.maxExp;
        this.level += 1;
        this.maxExp = Math.floor(this.maxExp * 1.2);
      }
    },

    /**
     * 设置昵称（起名/改名统一入口）。
     * 校验：trim → 过滤零宽/控制字符（防隐写刷屏）→ 按码点截断 2~8 字（emoji 不被拆半个）→ 空转 null。
     * 外部宿主（main.ts）也可能直接调用，故这里做兜底清洗，UI 层再叠加 2 字最小值提示。
     */
    setNickname(name: string | null) {
      if (name === null) { this.nickname = null; return; }
      const trimmed = String(name).trim();
      // 过滤零宽字符与控制字符：\u200B-\u200D 零宽连字、\uFEFF BOM、\u0000-\u001F 控制符、\u007F DEL
      const cleaned = trimmed.replace(/[\u200B-\u200D\uFEFF\u0000-\u001F\u007F]/g, '');
      const chars = Array.from(cleaned); // 按码点展开，兼容 emoji 不被拆半个
      if (chars.length === 0) { this.nickname = null; return; }
      // 超出上限按码点截断（NICKNAME_MAX=8），下限 2 字由 UI 内联提示拦截
      this.nickname = chars.slice(0, NICKNAME_MAX).join('');
    },
    setNotifUnread(n: number) { this.notifUnread = Math.max(0, n); },

    /**
     * 设置头像：emoji 字符串、或 data:image 上传图（base64）、或 null 恢复昵称首字。
     * 仅展示用：emoji 不经清洗；上传图由调用方 (AvatarPickerModal) 经 compressAvatar 压缩后传入。
     */
    setAvatar(emoji: string | null) {
      this.avatar = emoji === null ? null : String(emoji);
    },
  },

  // 持久化字段（严格按契约2.1）—— pinia-plugin-persistedstate v3
  // 注意：v3 用 paths 代替 pick（契约2.1字段保持不变）
  persist: {
    key: 'lingjing:user',
    paths: [
      'level', 'exp', 'maxExp',
      'gold', 'pearl', 'magic', 'jade',
      'qi', 'mood',
      'lastActiveTimestamp', 'lastDailyReset',
      'nickname', 'notifUnread', 'renameSkipped', 'avatar',
      'soundOn', 'hapticOn',
      'qiBubbleDate', 'qiBubbleGain',
    ],
  },
});
