// src/composables/useAudioPlayer.ts
// 天籁·全局常驻播放器单例
// 设计目标：
//  1) <audio> 与播控状态常驻于模块级，路由切换 / 切到其它版块 / 锁屏时音乐不断、计时不停；
//  2) 聆听时长按「真实播放时长」累计（wall-clock delta，去除前台可见闸门），
//     后台/锁屏照计，且诚信地以 audio.paused 判定，杜绝无声假播放刷收益；
//  3) 接入 Media Session，提供锁屏控制并提升移动端后台保活概率；
//  4) 收益结算（每满 5 分钟）在页面可见时即时弹 toast，页面不可见时缓存，回到页面再播报。
import { ref, computed } from 'vue';
import { useUserStore, useModulesStore } from '@/stores/index';
import type { IMusicTrack } from '@/types/index';

const modules = useModulesStore();
const user = useUserStore();

const player = new Audio();
player.preload = 'auto';

const isPlaying = ref(false);
const currentTrackId = ref(modules.musicTracks.find((t) => t.isUnlocked)?.id ?? '');
const position = ref(0);      // 当前曲目已播秒数（进度条，真实音频时间）
const duration = ref(0);      // 当前曲目真实时长
const lastSettledInterval = ref(Math.floor(modules.musicListenSeconds / 300));
const pendingSettle = ref({ segments: 0, magic: 0, mood: 0, extra: 0 });
const pendingError = ref('');

const currentTrack = computed<IMusicTrack | undefined>(
  () => modules.musicTracks.find((t) => t.id === currentTrackId.value)
);
const unlockedTracks = computed(() => modules.musicTracks.filter((t) => t.isUnlocked));
const canSwitch = computed(() => unlockedTracks.value.length > 1);
const flute = computed(() => modules.artifacts.find((a) => a.id === 'flute'));
const fluteEquipped = computed(() => flute.value?.equipped ?? false);
// 空灵笛魔丸产出：配置驱动（读 artifacts.json 的 magicPellet·mult 系数，默认 ×(lv+1)）
const fluteMult = computed(() => {
  const eff = modules.artifactEffect('magicPellet');
  return eff.equipped ? eff.multiplier : 1;
});

interface SettleInfo { magic: number; extra: boolean; }
interface PlayerUI { showToast: (msg: string) => void; onSettle: (info: SettleInfo) => void; }
let ui: PlayerUI | null = null;
export function connectPlayerUI(u: PlayerUI | null) { ui = u; }

/* ---------- 真实播放时长累计（无前台闸门；按 audio.paused 诚实判定） ---------- */
let lastTickTs = Date.now();

function flushAccum() {
  const now = Date.now();
  const delta = Math.floor((now - lastTickTs) / 1000);
  lastTickTs = now;
  if (delta <= 0 || player.paused) return;
  modules.addMusicListenSeconds(delta);
  const intervals = Math.floor(modules.musicListenSeconds / 300);
  while (intervals > lastSettledInterval.value) {
    lastSettledInterval.value += 1;
    settleReward();
  }
}

function settleReward() {
  const magic = fluteMult.value;
  user.changeCurrency('magic', magic);
  user.changeMood(2);
  // 每满 5 分钟 5% 概率「小惊喜」，制造期待感并跨版块引流（灵珠回流神龛/灵植）
  let extra = false;
  if (Math.random() < 0.05) { user.changeCurrency('pearl', 1); extra = true; }
  const info: SettleInfo = { magic, extra };
  if (ui?.onSettle) ui.onSettle(info);
  else {
    pendingSettle.value = {
      segments: pendingSettle.value.segments + 1,
      magic: pendingSettle.value.magic + magic,
      mood: pendingSettle.value.mood + 2,
      extra: pendingSettle.value.extra + (extra ? 1 : 0),
    };
  }
}

/* ---------- 音频事件 ---------- */
player.addEventListener('timeupdate', () => { position.value = player.currentTime; });
player.addEventListener('loadedmetadata', () => {
  duration.value = player.duration || 0;
  const t = currentTrack.value;
  // 用真实文件时长校正 store 初始近似值，避免进度条分母偏差
  if (t && (!t.durationSeconds || t.durationSeconds <= 0) && player.duration) {
    t.durationSeconds = Math.round(player.duration);
  }
});
player.addEventListener('play', () => { isPlaying.value = true; updateMediaState('playing'); });
player.addEventListener('pause', () => { isPlaying.value = false; flushAccum(); updateMediaState('paused'); });
player.addEventListener('ended', () => {
  flushAccum();
  if (canSwitch.value) skip(1); else isPlaying.value = false;
});
player.addEventListener('error', () => {
  // 解码/加载失败：确保不进入「假播放」状态（防作弊），提示交由 UI 层处理
  isPlaying.value = false;
  const msg = '该曲目暂时无法播放，请稍后再试';
  if (ui?.showToast) ui.showToast(msg); else pendingError.value = msg;
});

/* ---------- Media Session（锁屏控制 + 后台保活） ---------- */
function setupMediaSession(t: IMusicTrack) {
  if (!('mediaSession' in navigator)) return;
  const ms = navigator.mediaSession;
  try {
    ms.metadata = new MediaMetadata({ title: t.name, artist: '灵境·治愈小生灵', album: '天籁' });
    ms.setActionHandler('play', () => { void player.play().catch(() => {}); });
    ms.setActionHandler('pause', () => player.pause());
    ms.setActionHandler('nexttrack', () => skip(1));
    ms.setActionHandler('previoustrack', () => skip(-1));
  } catch { /* 不支持时静默降级 */ }
}
function updateMediaState(state: 'playing' | 'paused') {
  if (!('mediaSession' in navigator)) return;
  try { navigator.mediaSession.playbackState = state; } catch { /* ignore */ }
}

/* ---------- 播放控制（UI 层直接调用） ---------- */
function playTrack(t: IMusicTrack) {
  // 点击当前正在播放的曲目 → 暂停
  if (currentTrackId.value === t.id && !player.paused) { player.pause(); return; }
  currentTrackId.value = t.id;
  position.value = 0;
  if (t.src) {
    player.src = t.src;
    player.currentTime = 0;
    setupMediaSession(t);
    // 仅由真实 'play' 事件驱动 isPlaying；失败回退，杜绝无声刷挂机收益（防作弊）
    void player.play().catch(() => {
      isPlaying.value = false;
      const msg = '该曲目暂时无法播放，请稍后再试';
      if (ui?.showToast) ui.showToast(msg); else pendingError.value = msg;
    });
  } else {
    isPlaying.value = false;
  }
}
function togglePlay() {
  const t = currentTrack.value;
  if (!t?.src) return;
  if (player.paused) void player.play().catch(() => {});
  else player.pause();
}
function skip(dir: 1 | -1) {
  const list = unlockedTracks.value;
  if (list.length < 2) return;
  const idx = list.findIndex((t) => t.id === currentTrackId.value);
  const next = list[(idx + dir + list.length) % list.length];
  playTrack(next);
}

/* ---------- 全局计时（模块级常驻，路由切换/锁屏均不中断） ---------- */
window.setInterval(flushAccum, 1000);

export function drainPendingSettle() {
  const p = { ...pendingSettle.value };
  pendingSettle.value = { segments: 0, magic: 0, mood: 0, extra: 0 };
  return p;
}
export function drainPendingError() {
  const e = pendingError.value;
  pendingError.value = '';
  return e;
}

export function useAudioPlayer() {
  return {
    isPlaying, currentTrackId, currentTrack, position, duration,
    canSwitch, fluteEquipped, fluteMult,
    playTrack, togglePlay, skip,
    connectPlayerUI, drainPendingSettle, drainPendingError,
  };
}
