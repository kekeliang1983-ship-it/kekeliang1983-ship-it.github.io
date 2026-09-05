// src/composables/useQiBubbles.ts
// 灵气泡泡：全局常驻的随机掉落系统，跨路由持续漂浮（挂于 AppLayout）。
// 设计目标：为「灵气难获得」补上主动随机来源——随机掉落、点击即收、惊喜感强，
// 收取的灵气回流播种/求签/上香，闭合正循环。日上限防挂机刷爆。
import { ref } from 'vue';
import { useUserStore } from '@/stores/useUserStore';
import { audio } from '@/core/feedback';

export interface QiBubble {
  id: number;
  x: number;          // 起始横坐标 vw (0-100)
  y: number;          // 起始纵坐标 vh (0-100)
  amount: number;     // 收取可得灵气
  rare: boolean;      // 金色宝泡（+5、带光晕）
  drift: number;      // 横向摆动方向 -1 / 1
}

export interface PopResult {
  gained: number;
  rare: boolean;
  capped: boolean;    // 已达当日上限，本次未获得灵气
  gold: number;       // 本次附带随机元宝（1~5），保证货币不枯竭
}

const MAX_ON_SCREEN = 3;
const DAILY_CAP = 80;        // 灵气泡泡每日最多贡献 80 点灵气（充裕但不溢出）
// 安全兜底：正常游玩会随手收取，不会触发；仅清理长时间未点的陈旧气泡，避免堵塞生成通道（治愈系不惩罚，故设得很长）
const SOFT_EXPIRE_MS = 8 * 60 * 1000;
const SPAWN_MIN = 5000;      // 两次生成最小间隔（收紧，让灵气更充裕）
const SPAWN_MAX = 12000;     // 两次生成最大间隔
const RARE_RATE = 0.06;      // 金色宝泡概率

const bubbles = ref<QiBubble[]>([]);
let idSeq = 1;
let spawnTimer: number | undefined;
const lifeTimers = new Map<number, number>();
const todayKey = () => new Date().toISOString().slice(0, 10);

function getUser() {
  return useUserStore();
}

function gainedToday(): number {
  const u = getUser();
  if (u.qiBubbleDate !== todayKey()) return 0; // 跨天由 ensureDailyReset 清零
  return u.qiBubbleGain;
}

function scheduleNext() {
  const delay = SPAWN_MIN + Math.random() * (SPAWN_MAX - SPAWN_MIN);
  spawnTimer = window.setTimeout(() => {
    trySpawn();
    scheduleNext();
  }, delay);
}

function trySpawn() {
  if (bubbles.value.length >= MAX_ON_SCREEN) return;
  if (gainedToday() >= DAILY_CAP) return; // 今日已盈满，停止生成
  const rare = Math.random() < RARE_RATE;
  const amount = rare ? 5 : (Math.random() < 0.5 ? 1 : 2);
  const x = 12 + Math.random() * 76;       // 12%–88% vw（避开左右边缘）
  const y = 18 + Math.random() * 60;       // 18%–78% vh（避开顶部HUD/底部TabBar）
  const b: QiBubble = {
    id: idSeq++,
    x,
    y,
    amount,
    rare,
    drift: Math.random() < 0.5 ? -1 : 1,
  };
  bubbles.value.push(b);
  const t = window.setTimeout(() => removeBubble(b.id), SOFT_EXPIRE_MS);
  lifeTimers.set(b.id, t);
}

function removeBubble(id: number) {
  const t = lifeTimers.get(id);
  if (t) {
    clearTimeout(t);
    lifeTimers.delete(id);
  }
  const i = bubbles.value.findIndex((b) => b.id === id);
  if (i >= 0) bubbles.value.splice(i, 1);
}

/** 收取气泡：发放灵气并返回结果（供组件播放浮字/音效） */
function popBubble(id: number): PopResult | null {
  const b = bubbles.value.find((x) => x.id === id);
  if (!b) return null;
  const u = getUser();
  if (u.qiBubbleDate !== todayKey()) {
    u.qiBubbleDate = todayKey();
    u.qiBubbleGain = 0;
  }
  let gained = b.amount;
  let capped = false;
  const room = Math.max(0, DAILY_CAP - u.qiBubbleGain);
  if (gained > room) {
    gained = room;
    capped = true;
  }
  const noGain = gained <= 0;
  if (!noGain) {
    u.changeQi(gained);
    u.qiBubbleGain += gained;
  }
  // 额外随机 1~5 元宝：与灵气解耦，保证货币缓慢回血、永不枯竭
  const gold = 1 + Math.floor(Math.random() * 5);
  u.changeCurrency('gold', gold);
  removeBubble(id);
  if (!noGain) {
    if (u.soundOn) audio.play('coin');
    if (u.hapticOn) {
      try {
        navigator.vibrate?.(b.rare ? 20 : 10);
      } catch {
        /* 桌面端无震动 API，忽略 */
      }
    }
  }
  return { gained, rare: b.rare, capped: noGain || capped, gold };
}

function start() {
  if (spawnTimer) return; // 幂等：避免热重载/重复挂载多次启动
  scheduleNext();
}

function stop() {
  if (spawnTimer) {
    clearTimeout(spawnTimer);
    spawnTimer = undefined;
  }
  lifeTimers.forEach((t) => clearTimeout(t));
  lifeTimers.clear();
  bubbles.value = [];
}

export function useQiBubbles() {
  return {
    bubbles,
    popBubble,
    start,
    stop,
    DAILY_CAP,
    gainedToday,
  };
}
