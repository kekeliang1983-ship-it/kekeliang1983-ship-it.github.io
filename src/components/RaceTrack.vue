<!--
  src/components/RaceTrack.vue —— 仙宠竞速「赛道」实时动画（核心刺激感来源）
  6 道横向赛道，宠物 emoji 弹跳跑动，进度实时可见；比赛中随机触发：
   · 自身事件（御风/踩云/灵草/绊脚/雷劫/蟠桃/打盹/火遁/旋风）改写瞬时速度 → 名次实时翻盘
   · 互扔道具（🪨砸领先者 / 🍬喂落后者 / 💩甩泥巴）带飞行动画与命中反馈 → 互坑互保的喜感
  加速拖尾💨、被砸抖动💥、贴身反超提示、玩家冲线🎉彩带、底部实时解说字幕。
  纯前端：rAF 推进，无图片资源，契合零素材基调。
-->
<template>
  <teleport to="body">
    <transition name="race-fade">
      <div v-if="open" class="race-overlay">
        <div class="race-card card-glass">
          <header class="race-head">
            <div class="rh-title">🏁 仙宠竞速</div>
            <div class="rh-track">
              今日赛道 · <b>{{ trackLabel }}</b>
              <span class="rh-skin" v-if="skin"><span class="rh-skin-emoji">{{ skin.emoji }}</span>{{ skin.name }}</span>
              <span class="rh-weather" v-if="weather"><span class="rh-weather-emoji">{{ weather.emoji }}</span>{{ weather.name }}</span>
              <span class="rh-tip">五行生克 · 性格各异 · 天气变幻 · 互扔道具随时翻盘 ✦</span>
            </div>
          </header>

          <div class="ghost-bar" v-if="ghostTargetMs && ghostTargetMs > 0">
            <span class="gb-label">👻 远方对手残影</span>
            <div class="gb-track">
              <span class="gb-runner" :style="{ left: `calc(${Math.min(100, ghostProgress * 100)}% - 16px)` }">👻</span>
            </div>
          </div>

          <div class="lanes" :style="skinLaneStyle">
            <div
              v-for="(r, i) in runners"
              :key="r.id"
              class="lane"
              :class="[r.element, { player: r.isPlayer, done: r.finished, shake: r.shake }]"
            >
              <div class="lane-name">
                <span class="ln-emoji">{{ r.emoji }}</span>
                <span class="ln-text">{{ r.name }}<i v-if="r.isPlayer">·你 {{ r.personality.emoji }}</i><i v-if="r.teamBuffed" class="ln-team" title="同元素结阵">🛡️</i></span>
                <span class="ln-combo" v-if="r.combo >= 2">🔥×{{ r.combo }}</span>
              </div>
              <div class="lane-track">
                <span class="lane-flag">🏁</span>
                <span
                  class="runner"
                  :class="{ blink: r.eventEmoji, trail: r.trail, hop: r._recentHop }"
                  :style="{ left: `calc(${Math.min(100, r.progress * 100)}% - 16px)` }"
                >
                  {{ r.emoji }}
                  <span v-if="r.trail" class="trail">💨</span>
                </span>
                <transition name="bubble-pop">
                  <span v-if="r.eventEmoji && !r.finished" class="event-bubble">{{ r.eventEmoji }}</span>
                </transition>
                <transition name="bubble-pop">
                  <span v-if="r.hitEmoji && !r.finished" class="hit-bubble">{{ r.hitEmoji }}</span>
                </transition>
                <span v-if="r.finished" class="finish-badge">{{ r.finishOrder }}</span>
                <span v-if="r.isPlayer && r.overtake" class="overtake">反超！</span>
              </div>
            </div>

            <!-- 飞射道具（跨道动画） -->
            <span
              v-for="p in projectiles"
              :key="p.id"
              class="projectile"
              :style="{ ['--from']: p.fromIdx, ['--to']: p.toIdx }"
            >{{ p.emoji }}</span>
          </div>

          <!-- 实时解说字幕 -->
          <div class="race-foot">
            <div class="rf-status">{{ allDone ? '冲线完毕！' : '比赛中…灵气拖尾翻飞' }}</div>
            <div class="commentary">
              <p v-for="(c, i) in comments" :key="c.id" :class="{ dim: i < comments.length - 1 }">{{ c.text }}</p>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import type { ElementType } from '@/types/index';
import { useModulesStore } from '@/stores/useModulesStore';
import {
  type Racer, type TargetedEvent, type RaceTrackSkin, type RaceWeather,
} from '@/constants/race';
import { audio } from '@/core/feedback';

const modules = useModulesStore();
const rc = computed(() => modules.raceConfig);

const props = defineProps<{
  open: boolean;
  racers: Racer[];
  trackElement: ElementType;
  /** 今日赛道皮肤（视觉 + 全局修正）；缺省不影响比赛 */
  trackSkin?: RaceTrackSkin | null;
  /** 今日天气（视觉 + 全局修正）；缺省不影响比赛 */
  weather?: RaceWeather | null;
  /** B4 异步对战：远方对手的「最佳用时」(ms)，用于渲染残影进度；无则无残影 */
  ghostTargetMs?: number | null;
}>();
const emit = defineEmits<{ (e: 'finished', payload: { rank: number; durationMs: number }): void }>();

interface Runner extends Racer {
  progress: number;
  eventEmoji: string;
  eventEnd: number;
  _eventMult: number;
  finished: boolean;
  finishOrder: number;
  hitEmoji: string;
  hitEnd: number;
  trail: boolean;
  shake: boolean;
  overtake: boolean;
  _recentHop: boolean;
  /** 连续正向自身事件连击数（每层增量加成，封顶） */
  combo: number;
}

/** 当前皮肤（取 prop，无则回退 store 今日皮肤） */
const skin = computed<RaceTrackSkin | null>(() => props.trackSkin ?? modules.raceTrackSkin());
/** 当前天气（取 prop，无则回退 store 今日天气） */
const weather = computed<RaceWeather | null>(() => props.weather ?? modules.raceWeather());
/** 仅将浅色皮肤/天气背景应用到赛道区，避免深色压暗文字导致不可读（皮肤优先，天气兜底） */
const skinLaneStyle = computed(() => {
  const bg = skin.value?.bg || weather.value?.bg;
  if (!bg) return {};
  return /^linear-gradient\(135deg,\s*#[ed]/i.test(bg) ? { background: bg } : {};
});
/** 事件节奏综合倍率（皮肤 × 天气，>1 更密集） */
const eventRate = computed(() => (skin.value?.eventRateMult || 1) * (weather.value?.eventRateMult || 1));
interface Projectile { id: number; emoji: string; fromIdx: number; toIdx: number; born: number }

const ELEM_LABEL: Record<ElementType, string> = { gold: '金', wood: '木', water: '水', fire: '火', earth: '土' };
const trackLabel = ref(ELEM_LABEL[props.trackElement]);
const runners = ref<Runner[]>([]);
const projectiles = ref<Projectile[]>([]);
const comments = ref<{ id: number; text: string }[]>([]);
const allDone = ref(false);
/** B4 异步对战：远方对手残影进度（0~1，随 elapsed 线性逼近其最佳用时） */
const ghostProgress = ref(0);

let raf = 0;
let lastTs = 0;
let startTime = 0;
let finishCounter = 0;
let projId = 0;
let commentId = 0;
let prevPlayerRank = 0;
let nextSelfAt = 0;
let nextTargetedAt = 0;

function say(text: string) {
  comments.value.push({ id: ++commentId, text });
  if (comments.value.length > 4) comments.value.shift();
}

/** 按性格 throwBias 加权抽取道具来源（精准型更易被选中扔道具） */
function pickWeighted(list: Runner[]): Runner {
  const weights = list.map((r) => (r.personality && r.personality.throwBias > 0 ? r.personality.throwBias : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let x = Math.random() * total;
  for (let i = 0; i < list.length; i++) {
    x -= weights[i];
    if (x <= 0) return list[i];
  }
  return list[list.length - 1];
}

function buildRunners() {
  runners.value = props.racers.map((r) => ({
    ...r, progress: 0, eventEmoji: '', eventEnd: 0, _eventMult: 1, finished: false, finishOrder: 0,
    hitEmoji: '', hitEnd: 0, trail: false, shake: false, overtake: false, _recentHop: false, combo: 0,
  }));
  projectiles.value = [];
  comments.value = [];
  finishCounter = 0;
  allDone.value = false;
  ghostProgress.value = 0;
  prevPlayerRank = props.racers.length;
  const now = performance.now();
  const rate = eventRate.value; // 皮肤 × 天气，>1 事件更密集
  nextSelfAt = now + rc.value.eventEveryMs / rate;
  nextTargetedAt = now + rc.value.targetedEveryMs / rate;
}

function rankOf(r: Runner, all: Runner[]): number {
  const finished = all.filter((x) => x.finished).sort((a, b) => a.finishOrder - b.finishOrder);
  const ahead = finished.filter((x) => x !== r).length;
  const unfinishedAhead = all.filter((x) => !x.finished && x.progress > r.progress).length;
  return ahead + unfinishedAhead + 1;
}

function loop(ts: number) {
  if (!lastTs) { lastTs = ts; startTime = ts; }
  const dt = Math.min(0.05, (ts - lastTs) / 1000);
  lastTs = ts;
  const elapsed = ts - startTime;
  if (props.ghostTargetMs && props.ghostTargetMs > 0) {
    ghostProgress.value = Math.min(1, elapsed / props.ghostTargetMs);
  }

  // 清理过期命中/抖动
  for (const r of runners.value) {
    if (r.hitEmoji && ts >= r.hitEnd) r.hitEmoji = '';
    if (r.shake && ts >= r.hitEnd) r.shake = false;
    r.trail = false;
  }

  // 自身事件（性格：爆发增益加成 / 稳健免疫负面；连击：连续正向事件层层加成）
  if (ts >= nextSelfAt) {
    const cand = runners.value.filter((r) => !r.finished);
    if (cand.length) {
      const r = cand[Math.floor(Math.random() * cand.length)];
      const ev = rc.value.events[Math.floor(Math.random() * rc.value.events.length)];
      const immune = ev.mult < 1 && r.personality && r.personality.negEventImmune > 0 && Math.random() < r.personality.negEventImmune;
      if (immune) {
        say(`${r.name} 稳健如山，免疫了「${ev.label}」🌿`);
      } else {
        let m = ev.mult;
        if (ev.mult >= 1) {
          // 正向事件：性格爆发加成 + 连击层层加成（封顶 comboMax 层）
          if (r.personality && r.personality.selfBuffBonus > 0) m = ev.mult * (1 + r.personality.selfBuffBonus);
          r.combo = Math.min((rc.value.comboMax || 3), r.combo + 1);
          const comboBonus = (r.combo - 1) * (rc.value.comboStep || 0);
          if (comboBonus > 0) m *= (1 + comboBonus);
        } else {
          // 负面事件：连击中断
          r.combo = 0;
        }
        r._eventMult = m; r.eventEmoji = ev.emoji; r.eventEnd = ts + ev.durMs;
        r._recentHop = true; window.setTimeout(() => { r._recentHop = false; }, 300);
        const burstTag = r.personality && r.personality.selfBuffBonus > 0 && ev.mult >= 1 ? '（爆发！）' : '';
        const comboTag = r.combo >= 2 ? `（连击×${r.combo}！）` : '';
        say(`${r.name} ${ev.label}，${ev.mult >= 1 ? '加速冲刺！' : '一个趔趄～'}${burstTag}${comboTag}`);
      }
    }
    nextSelfAt = ts + (rc.value.eventEveryMs / eventRate.value) * (0.7 + Math.random() * 0.6);
  }

  // 互扔道具（性格：精准更易扔且更强 / 坚韧减轻命中减速）
  if (ts >= nextTargetedAt) {
    const unfinished = runners.value.filter((r) => !r.finished);
    if (unfinished.length >= 2) {
      const src = pickWeighted(unfinished);
      const ev: TargetedEvent = rc.value.targeted[Math.floor(Math.random() * rc.value.targeted.length)];
      const sorted = [...unfinished].sort((a, b) => b.progress - a.progress);
      const pool = sorted.filter((r) => r !== src);
      const tgt = ev.target === 'leader' ? pool[0] : pool[pool.length - 1];
      if (tgt) {
        let eff = ev.mult * (src.personality && src.personality.throwEffectMult ? src.personality.throwEffectMult : 1);
        if (ev.mult < 1 && tgt.personality && tgt.personality.hitPenaltyMult > 0 && tgt.personality.hitPenaltyMult < 1) {
          const penalty = 1 - eff;
          eff = 1 - penalty * tgt.personality.hitPenaltyMult;
        }
        const fromIdx = runners.value.indexOf(src);
        const toIdx = runners.value.indexOf(tgt);
        tgt._eventMult = eff; tgt.hitEmoji = ev.hitEmoji; tgt.hitEnd = ts + ev.durMs; tgt.shake = eff < 1;
        projectiles.value.push({ id: ++projId, emoji: ev.emoji, fromIdx, toIdx, born: ts });
        window.setTimeout(() => { projectiles.value = projectiles.value.filter((p) => p.id !== projId); }, 480);
        const precise = src.personality && src.personality.throwEffectMult > 1;
        say(`${src.name} 给 ${tgt.name} 来了一记「${ev.label}」${precise ? '💥精准一击' : (eff < 1 ? '💥' : '✨')}`);
      }
    }
    nextTargetedAt = ts + (rc.value.targetedEveryMs / eventRate.value) * (0.7 + Math.random() * 0.6);
  }

  // 推进
  for (const r of runners.value) {
    if (r.finished) continue;
    let mult = 1;
    if (ts < r.eventEnd || ts < r.hitEnd) {
      mult = r._eventMult;
      if (r._eventMult >= 1.1) r.trail = true;
    } else if (r.eventEmoji) {
      r.eventEmoji = '';
    }
    r.progress += r.baseSpeed * mult * dt;
    if (r.progress >= 1) {
      r.progress = 1; r.finished = true; r.eventEmoji = ''; r.hitEmoji = '';
      finishCounter += 1; r.finishOrder = finishCounter;
      say(`${r.name} 冲线！第 ${finishCounter} 名${r.isPlayer ? ' 🎉' : ''}`);
    }
  }

  // 玩家名次变化 → 反超提示
  const player = runners.value.find((r) => r.isPlayer);
  if (player && !player.finished) {
    const rk = rankOf(player, runners.value);
    if (rk < prevPlayerRank) {
      player.overtake = true; window.setTimeout(() => { player.overtake = false; }, 900);
      if (prevPlayerRank <= runners.value.length) say(`你的 ${player.name} 反超了！💨`);
    } else if (rk > prevPlayerRank) {
      say(`哎呀，${player.name} 被超了一步！`);
    }
    prevPlayerRank = rk;
  }

  const done = runners.value.every((r) => r.finished);
  if (done || elapsed >= rc.value.maxMs) {
    stopLoop();
    allDone.value = true;
    let rank: number;
    if (done) rank = runners.value.find((r) => r.isPlayer)!.finishOrder;
    else {
      const sorted = [...runners.value].sort((a, b) => b.progress - a.progress);
      rank = sorted.findIndex((r) => r.isPlayer) + 1;
    }
    audio.play('coin');
    const durationMs = elapsed; // 本局真实用时（与 ghost 同源时钟，保证对战公平）
    window.setTimeout(() => emit('finished', { rank, durationMs }), 700);
    return;
  }
  raf = requestAnimationFrame(loop);
}

function startLoop() {
  cancelAnimationFrame(raf);
  lastTs = 0;
  raf = requestAnimationFrame(loop);
}
function stopLoop() {
  cancelAnimationFrame(raf);
  raf = 0;
}

watch(() => props.open, (v) => {
  if (v) {
    trackLabel.value = ELEM_LABEL[props.trackElement];
    buildRunners();
    startLoop();
  } else {
    stopLoop();
  }
});

onUnmounted(() => stopLoop());
</script>

<style scoped>
.race-overlay {
  position: fixed; inset: 0; z-index: 1400;
  background: rgba(38, 32, 58, .55);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  display: grid; place-items: center; padding: 18px;
}
.race-card {
  width: 100%; max-width: 560px; border-radius: 24px; padding: 18px;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-light, rgba(0,0,0,.06));
  box-shadow: 0 24px 60px rgba(40, 30, 70, .35);
  --lane-h: 46px;
}
.race-head { margin-bottom: 14px; }
.rh-title { font-size: 19px; font-weight: 800; color: var(--text-primary, #2a2740); }
.rh-track { margin-top: 4px; font-size: 12.5px; color: var(--text-secondary, #666); }
.rh-track b { color: var(--accent, #8A80D8); }
.rh-skin { margin-left: 6px; padding: 1px 8px; border-radius: 999px; background: rgba(138,128,216,.14); color: var(--accent, #8A80D8); font-weight: 700; font-size: 11px; }
.rh-skin-emoji { margin-right: 2px; }
.rh-weather { margin-left: 6px; padding: 1px 8px; border-radius: 999px; background: rgba(79,163,174,.16); color: #4FA3AE; font-weight: 700; font-size: 11px; }
.rh-weather-emoji { margin-right: 2px; }
.rh-tip { margin-left: 6px; color: var(--text-muted, #999); font-size: 11px; }
.ln-team { color: #E0913A; font-style: normal; font-weight: 700; }
.ln-combo { flex: 0 0 auto; margin-left: 4px; font-size: 10px; font-weight: 800; color: #E0913A; background: rgba(224,145,58,.16); padding: 0 5px; border-radius: 999px; }

.lanes { position: relative; display: flex; flex-direction: column; gap: 9px; }
.ghost-bar { display: flex; align-items: center; gap: 10px; padding: 6px 10px; margin-bottom: 4px; border-radius: 12px; background: rgba(120,120,140,.1); border: 1px dashed rgba(120,120,140,.3); }
.gb-label { flex: 0 0 88px; font-size: 11px; font-weight: 700; color: var(--text-secondary, #666); white-space: nowrap; }
.gb-track { position: relative; flex: 1; height: 22px; background: repeating-linear-gradient(90deg, rgba(120,120,140,.12) 0 18px, transparent 18px 36px); border-radius: 8px; overflow: visible; }
.gb-runner { position: absolute; top: 50%; transform: translateY(-50%); font-size: 18px; opacity: .7; filter: drop-shadow(0 2px 4px rgba(80,70,120,.3)); transition: left .08s linear; }
.lane {
  display: flex; align-items: center; gap: 10px;
  padding: 7px 10px; border-radius: 14px;
  background: var(--bg-card-strong, #f4f2fb);
  border: 1px solid var(--border-light, rgba(0,0,0,.05));
  transition: background .2s;
}
.lane.player { border-color: rgba(138,128,216,.5); box-shadow: 0 0 0 1.5px rgba(138,128,216,.25); }
.lane.done { opacity: .72; }
.lane.shake { animation: laneShake .4s ease; }
@keyframes laneShake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-5px); } 40% { transform: translateX(5px); } 60% { transform: translateX(-3px); } 80% { transform: translateX(3px); } }
.lane-name { flex: 0 0 78px; display: flex; align-items: center; gap: 6px; min-width: 0; }
.ln-emoji { font-size: 20px; }
.ln-text { font-size: 12px; font-weight: 600; color: var(--text-primary, #2a2740); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ln-text i { font-style: normal; color: var(--accent, #8A80D8); font-weight: 700; }

.lane-track {
  position: relative; flex: 1; height: 30px;
  background: repeating-linear-gradient(90deg, rgba(138,128,216,.08) 0 18px, transparent 18px 36px);
  border-radius: 10px; overflow: visible;
}
.lane-flag { position: absolute; right: 2px; top: 50%; transform: translateY(-50%); font-size: 16px; opacity: .8; }
.runner {
  position: absolute; top: 50%; transform: translateY(-50%);
  font-size: 22px; line-height: 1; filter: drop-shadow(0 3px 5px rgba(80,70,120,.3));
  transition: left .08s linear;
}
.runner.blink { animation: runnerHop .5s ease-in-out infinite; }
.runner.hop { animation: runnerHop .3s ease-in-out 1; }
.runner.trail .trail { position: absolute; left: -14px; top: 50%; transform: translateY(-50%); font-size: 13px; opacity: .8; }
@keyframes runnerHop { 0%,100% { transform: translateY(-50%); } 50% { transform: translateY(-78%); } }
.event-bubble {
  position: absolute; top: -16px; left: calc(50% - 8px);
  font-size: 15px; filter: drop-shadow(0 2px 4px rgba(0,0,0,.2));
}
.hit-bubble {
  position: absolute; top: -18px; left: calc(50% - 8px);
  font-size: 17px; filter: drop-shadow(0 2px 4px rgba(0,0,0,.25));
  animation: hitPop .35s cubic-bezier(.34,1.56,.64,1);
}
@keyframes hitPop { 0% { transform: scale(.3) rotate(-20deg); opacity: 0; } 100% { transform: scale(1.2) rotate(0); opacity: 1; } }
.bubble-pop-enter-active { animation: bubbleIn .3s cubic-bezier(.34,1.56,.64,1); }
.bubble-pop-leave-active { opacity: 0; transition: opacity .2s; }
@keyframes bubbleIn { 0% { transform: scale(.3); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
.finish-badge {
  position: absolute; right: -6px; top: -8px;
  min-width: 18px; height: 18px; padding: 0 4px; border-radius: 999px;
  background: linear-gradient(135deg, var(--accent, #8A80D8), var(--accent-soft, #A39AE8));
  color: #fff; font-size: 11px; font-weight: 800; display: grid; place-items: center;
}
.overtake {
  position: absolute; left: 50%; top: -22px; transform: translateX(-50%);
  font-size: 11px; font-weight: 800; color: #E0913A;
  background: rgba(224,145,58,.16); padding: 1px 7px; border-radius: 999px;
  animation: bubbleIn .3s ease;
}

/* 飞射道具 */
.projectile {
  position: absolute; left: 24px; font-size: 18px; z-index: 5;
  pointer-events: none; filter: drop-shadow(0 2px 3px rgba(0,0,0,.25));
  animation: throwArc .46s cubic-bezier(.4,0,.5,1) forwards;
}
@keyframes throwArc {
  0% { top: calc(var(--from) * var(--lane-h) + 6px); left: 24px; opacity: 1; }
  100% { top: calc(var(--to) * var(--lane-h) + 6px); left: 70%; opacity: .9; }
}

.race-foot { margin-top: 12px; text-align: center; }
.rf-status { font-size: 12px; color: var(--text-muted, #999); }
.commentary {
  margin-top: 7px; display: flex; flex-direction: column; gap: 2px;
  min-height: 56px; justify-content: flex-end;
}
.commentary p {
  margin: 0; font-size: 12px; color: var(--text-primary, #2a2740); font-weight: 600;
  opacity: 1; transition: opacity .4s; line-height: 1.5;
}
.commentary p.dim { color: var(--text-muted, #999); font-weight: 500; opacity: .6; }

.race-fade-enter-active, .race-fade-leave-active { transition: opacity .25s; }
.race-fade-enter-from, .race-fade-leave-to { opacity: 0; }
</style>
