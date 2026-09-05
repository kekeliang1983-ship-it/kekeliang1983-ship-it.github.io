<!--
  src/views/race/RacePage.vue —— 仙宠竞速（赛马式小游戏）入口页
  玩法：从「已解锁且空闲」的仙宠中点选一只出战，与 5 只机器人同场竞速；实时赛道动画 + 五行相生相克 + 赛道事件变数。
  多宠独立：一只旅行绝不妨碍其他空闲宠参赛；只有全部在旅行/未解锁才禁用并提示「暂无可出战仙宠」。
  每日 5 场免费，之后每场投注 15 元宝（硬上限 5 场）。末名也有安慰礼，逆袭有彩头。
  入口：仙宠页「🏁 竞速」横幅 → router.push('/app/race')；左上角返回键回上一页。
-->
<template>
  <div class="race-page">
    <header class="topbar">
      <button class="back-btn" v-feedback="'BUTTON_CLICK'" @click="goBack" aria-label="返回">‹</button>
      <div class="brand">
        <h1>仙宠竞速</h1>
        <p>派它出战，看谁先冲线 ✦</p>
      </div>
    </header>

    <!-- 顶部状态条：天气 / 连胜 / 称号（一眼可见） -->
    <div class="race-hud">
      <span class="hud-chip hud-weather"><span class="hud-emoji">{{ weather.emoji }}</span>{{ weather.name }}</span>
      <span class="hud-chip hud-streak" :class="{ hot: winStreak >= 3 }">🔥 {{ winStreak }} 连胜<span v-if="streakBonus > 0" class="hud-bonus">+{{ Math.round(streakBonus * 100) }}%</span></span>
      <span class="hud-chip hud-title" v-for="t in unlockedTitles" :key="t.id" :title="t.desc">{{ t.emoji }}{{ t.name }}</span>
    </div>

    <!-- 出战仙宠选择 -->
    <section class="card-glass picker">
      <div class="pk-title">选择出战仙宠</div>
      <div class="pk-row">
        <button
          v-for="p in petList"
          :key="p.el"
          class="pk-card"
          :class="[p.el, { active: p.el === selectedEl, disabled: p.status !== 'idle', locked: !p.owned }]"
          :disabled="p.status !== 'idle'"
          v-feedback="'BUTTON_CLICK'"
          @click="onPick(p.el)"
        >
          <span class="pk-emoji">{{ p.emoji }}</span>
          <span class="pk-name">{{ p.name }}</span>
          <span class="pk-badge" v-if="p.status === 'traveling'">旅行中</span>
          <span class="pk-badge" v-else-if="p.status === 'returning'">归来中</span>
          <span class="pk-badge lock" v-else-if="!p.owned">🔒 未解锁</span>
          <span class="pk-badge ok" v-else>空闲</span>
        </button>
      </div>
      <p class="pk-tip" v-if="!raceStore.hasAvailablePet()">所有仙宠都在旅行或尚未解锁，暂无可出战仙宠～等一只归来再战吧</p>
    </section>

    <!-- 参赛仙宠 -->
    <section class="card-glass hero">
      <div class="hero-figure" :class="selectedEl">
        <div class="hero-glow" :class="selectedEl"></div>
        <span class="hero-emoji">{{ selMeta.emoji }}</span>
      </div>
      <div class="hero-info">
        <b class="hero-name">{{ selUnit.petName || selMeta.name }}</b>
        <s class="hero-sub">{{ selMeta.name }} · {{ ELEM_LABEL[selectedEl] }}属 · {{ statusLabel }}</s>
        <div class="hero-track">
          今日赛道 <b>{{ trackLabel }}</b>
          <span class="ht-skin" v-if="skin"><span class="ht-skin-emoji">{{ skin.emoji }}</span>{{ skin.name }}</span>
          <span class="ht-factor" :class="factorClass">{{ factorLabel }}</span>
        </div>
        <div class="hero-persona" v-if="selPersona"><span class="hp-emoji">{{ selPersona.emoji }}</span>{{ selPersona.name }} · {{ selPersona.desc }}</div>
        <p class="hero-tip">{{ trackTip }}</p>
      </div>
    </section>

    <!-- 今日场次 -->
    <section class="card-glass quota">
      <div class="q-row">
        <span class="q-label">🎟️ 免费场</span>
        <span class="q-val">剩 {{ freeLeft }} / {{ rc.dailyFree }}</span>
      </div>
      <div class="q-row">
        <span class="q-label">💰 投注场</span>
        <span class="q-val">剩 {{ paidLeft }} / {{ rc.paidDailyLimit }}（每场 {{ rc.paidCost }} 元宝）</span>
      </div>
      <div class="q-row" v-if="bestRank">
        <span class="q-label">🏅 历史最佳</span>
        <span class="q-val">第 {{ bestRank }} 名</span>
      </div>
    </section>

    <!-- 开赛按钮 -->
    <button
      class="start-btn"
      v-feedback="'BUTTON_CLICK'"
      :disabled="!canStartMode"
      @click="onStart"
    >{{ startLabel }}</button>
    <p class="hint" v-if="!isCooldown">
      6 只同场 · 约 20~30 秒一局 · 途中互扔道具随时翻盘，末名也有小奖励
    </p>

    <!-- 赛道动画 -->
    <RaceTrack
      :open="racing"
      :racers="startInfo?.racers ?? []"
      :track-element="startInfo?.trackElement ?? 'wood'"
      :track-skin="skin"
      :weather="weather"
      @finished="onFinished"
    />

    <!-- 结算卡 -->
    <RaceResultModal :open="resultOpen" :result="result" @close="onClose" @again="onAgain" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, onActivated, onDeactivated } from 'vue';
import { useRouter } from 'vue-router';
import type { ElementType } from '@/types/index';
import { useModulesStore } from '@/stores/useModulesStore';
import { useRaceStore } from '@/stores/useRaceStore';
import { PET_PERSONALITY } from '@/constants/race';
import { useUserStore } from '@/stores/useUserStore';
import { useToast } from '@/composables/useToast';
import RaceTrack from '@/components/RaceTrack.vue';
import RaceResultModal from '@/components/RaceResultModal.vue';

const router = useRouter();
const modules = useModulesStore();
const raceStore = useRaceStore();
const user = useUserStore();
const { showToast } = useToast();

const ELEM_LABEL: Record<string, string> = { gold: '金', wood: '木', water: '水', fire: '火', earth: '土' };
/** 竞速配置（后台 race.json 覆盖，App 实时生效） */
const rc = computed(() => modules.raceConfig);
const trackElement = computed(() => modules.raceTrackElement());

/* 出战仙宠清单（含空闲/旅行/未解锁状态） */
const petList = computed(() => modules.petConfig.elements.map((el) => {
  const status = raceStore.petStatus(el);
  const u = modules.getUnit(el);
  return {
    el,
    emoji: modules.petConfig.petMap[el]?.emoji ?? '🐾',
    name: u.petName ?? modules.petConfig.petMap[el]?.name ?? '仙宠',
    status,
    owned: modules.pet.ownedPets.includes(el),
  };
}));

const selectedEl = ref<ElementType>(modules.pet.type);
function pickDefault() {
  const idle = modules.petConfig.elements.find((el) => raceStore.petStatus(el) === 'idle');
  selectedEl.value = idle ?? modules.pet.type;
}
function onPick(el: ElementType) {
  if (raceStore.petStatus(el) === 'idle') selectedEl.value = el;
}

const selUnit = computed(() => modules.getUnit(selectedEl.value));
const selMeta = computed(() => modules.petConfig.petMap[selectedEl.value]);
const statusLabel = computed(() => {
  const s = raceStore.petStatus(selectedEl.value);
  if (s === 'traveling') return '旅行中';
  if (s === 'returning') return '归来中';
  return '空闲 · 可出战';
});
const trackLabel = computed(() => ELEM_LABEL[trackElement.value]);
/** 今日赛道皮肤（视觉 + 全局修正） */
const skin = computed(() => modules.raceTrackSkin());
/** 今日天气（视觉 + 全局修正） */
const weather = computed(() => modules.raceWeather());
/** 出战仙宠性格（五行映射，构成出战策略） */
const selPersona = computed(() => PET_PERSONALITY[selectedEl.value]);
const factor = computed(() => modules.raceSpeedFactor(selectedEl.value, trackElement.value));
const factorLabel = computed(() => modules.raceSpeedFactorLabel(factor.value));
const factorClass = computed(() => (factor.value >= 1.05 ? 'good' : factor.value <= 0.9 ? 'bad' : 'flat'));
const trackTip = computed(() => {
  if (factor.value >= 1.12) return '今天赛道正合它脾气，顺风满满，值得一搏！';
  if (factor.value >= 1.05) return '五行相济，状态不错，冲个好名次吧。';
  if (factor.value <= 0.9) return '今天略逆风，但途中事件能翻盘，别灰心。';
  return '今日平平，胜负看途中造化。';
});

/* 实时冷却（3s 防连点，无感）+ 开赛校验 */
const tick = ref(0);
const cooldownLeft = computed(() => {
  tick.value;
  return Math.max(0, rc.value.cooldownMs - (Date.now() - (raceStore.lastRaceAt[selectedEl.value] || 0)));
});
const isCooldown = computed(() => cooldownLeft.value > 0);

const freeLeft = computed(() => raceStore.freeLeft);
const paidLeft = computed(() => raceStore.paidLeft);
const bestRank = computed(() => raceStore.bestRank);
const winStreak = computed(() => raceStore.winStreak);
const streakBonus = computed(() => {
  const cap = 0.5;
  const s = raceStore.winStreak;
  return s > 1 ? Math.min(cap, (s - 1) * 0.1) : 0;
});
const unlockedTitles = computed(() => raceStore.unlockedTitles);

const startCheck = computed(() => raceStore.canStart(selectedEl.value));
const canStartMode = computed<'free' | 'paid' | null>(() => (startCheck.value.canStart ? startCheck.value.mode : null));
const startLabel = computed(() => {
  if (!raceStore.hasAvailablePet()) return '暂无可出战仙宠（都去旅行啦）';
  if (startCheck.value.reason === 'cooldown') return `冷却中 ${Math.ceil(cooldownLeft.value / 1000)}s`;
  if (startCheck.value.reason === 'traveling') return '该仙宠旅行中，换一只吧';
  if (startCheck.value.reason === 'noGold') return '元宝不足，先做做日常攒一攒';
  if (startCheck.value.reason === 'limit') return '今日投注场已用完，明日再来';
  if (startCheck.value.mode === 'free') return `开始竞速 · 免费（剩 ${freeLeft.value}）`;
  if (startCheck.value.mode === 'paid') return `开始竞速 · 投注 ${rc.value.paidCost} 元宝`;
  return '暂不可赛';
});

/* 比赛状态 */
const startInfo = ref<ReturnType<typeof raceStore.beginRace> | null>(null);
const racing = ref(false);
const result = ref<ReturnType<typeof raceStore.finishRace> | null>(null);
const resultOpen = computed(() => !racing.value && result.value !== null);

function onStart() {
  raceStore.ensureDailyReset();
  const info = raceStore.beginRace(selectedEl.value);
  if (!info) { showToast(startLabel.value); return; }
  startInfo.value = info;
  racing.value = true;
}

function onFinished(rank: number) {
  racing.value = false;
  if (!startInfo.value) return;
  result.value = raceStore.finishRace(rank, startInfo.value.predictedRank);
}

function onClose() { result.value = null; raceStore.releaseRacePet(); }

function onAgain() {
  result.value = null;
  if (canStartMode.value) onStart();
  else showToast(startLabel.value);
}

function goBack() {
  if (window.history.length > 1) router.back();
  else router.push('/app/pet');
}

/* 时间引擎（每秒 tick 驱动冷却倒计时；keepAlive 省电） */
let tickTimer: number | undefined;
function startTick() {
  if (tickTimer) return;
  tickTimer = window.setInterval(() => { tick.value++; }, 1000);
}
function stopTick() { if (tickTimer) { clearInterval(tickTimer); tickTimer = undefined; } }

onMounted(() => { raceStore.ensureDailyReset(); pickDefault(); startTick(); });
onActivated(() => { pickDefault(); startTick(); });
onDeactivated(() => stopTick());
onUnmounted(() => { stopTick(); raceStore.releaseRacePet(); });
</script>

<style scoped>
.race-page {
  padding: 14px 22px calc(96px + env(safe-area-inset-bottom, 0px));
  min-height: 100%; box-sizing: border-box;
  display: flex; flex-direction: column; gap: 14px;
}
.topbar { display: flex; align-items: center; gap: 10px; padding: 4px 2px 0; }
.back-btn {
  width: 38px; height: 38px; flex: 0 0 38px; border: 0; border-radius: 12px; cursor: pointer;
  background: var(--bg-card-strong); color: var(--text-primary); font-size: 26px; line-height: 1;
  display: grid; place-items: center; box-shadow: var(--shadow-float);
}
.back-btn:active { transform: scale(.94); }
.brand h1 { font-size: 27px; font-weight: 800; color: var(--text-primary); letter-spacing: .6px; }
.brand p { margin-top: 5px; font-size: 12.5px; color: var(--text-secondary); }

/* 顶部状态条：天气 / 连胜 / 称号（一眼可见） */
.race-hud { display: flex; align-items: center; gap: 8px; overflow-x: auto; padding: 2px 1px; margin-top: 2px; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
.race-hud::-webkit-scrollbar { display: none; }
.hud-chip { flex: 0 0 auto; display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 700; padding: 5px 10px; border-radius: 999px; white-space: nowrap; }
.hud-emoji { font-size: 14px; }
.hud-weather { background: rgba(79,163,174,.16); color: #4FA3AE; }
.hud-streak { background: rgba(224,145,58,.14); color: #E0913A; }
.hud-streak.hot { background: linear-gradient(135deg, rgba(224,113,58,.24), rgba(224,145,58,.14)); }
.hud-bonus { font-size: 10.5px; opacity: .85; margin-left: 2px; }
.hud-title { background: rgba(138,128,216,.14); color: var(--accent); }

.card-glass {
  background: var(--bg-card); border: 1px solid var(--border-light);
  backdrop-filter: var(--backdrop-lg); -webkit-backdrop-filter: var(--backdrop-lg);
  border-radius: var(--radius-card, 20px); padding: 18px; box-shadow: var(--shadow-float);
}

/* 选宠 */
.picker { padding-bottom: 14px; }
.pk-title { font-size: 13px; font-weight: 700; color: var(--text-secondary); margin-bottom: 12px; }
.pk-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
.pk-card {
  position: relative; display: flex; flex-direction: column; align-items: center; gap: 3px;
  padding: 10px 4px 8px; border-radius: 14px; cursor: pointer; border: 1.5px solid transparent;
  background: var(--bg-card-strong); transition: transform .14s, border-color .2s, opacity .2s;
}
.pk-card:active { transform: scale(.95); }
.pk-card.active { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(138,128,216,.22); }
.pk-card.disabled { opacity: .5; cursor: default; }
.pk-card.locked { opacity: .42; }
.pk-emoji { font-size: 30px; filter: drop-shadow(0 4px 8px rgba(80,70,120,.22)); }
.pk-name { font-size: 10.5px; font-weight: 700; color: var(--text-primary); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pk-badge {
  position: absolute; top: -7px; right: -4px; font-size: 9px; font-weight: 700; padding: 1px 6px;
  border-radius: 999px; background: rgba(120,120,140,.18); color: var(--text-muted);
}
.pk-badge.ok { background: rgba(94,156,122,.2); color: var(--growth); }
.pk-badge.lock { background: rgba(120,120,140,.16); }
.pk-tip { margin: 12px 0 0; font-size: 11.5px; color: var(--text-muted); line-height: 1.6; }

/* 参赛仙宠 */
.hero { display: flex; align-items: center; gap: 16px; }
.hero-figure { position: relative; flex: 0 0 96px; width: 96px; height: 96px; display: grid; place-items: center; border-radius: 24px; border: 1.5px solid rgba(255,255,255,.7); }
.hero-glow { position: absolute; inset: 4px; border-radius: 20px; filter: blur(16px); opacity: .5; z-index: 0; }
.hero-glow.gold { background: radial-gradient(circle, rgba(196,154,62,.5), transparent 70%); }
.hero-glow.wood { background: radial-gradient(circle, rgba(94,156,122,.5), transparent 70%); }
.hero-glow.water { background: radial-gradient(circle, rgba(79,163,174,.5), transparent 70%); }
.hero-glow.fire { background: radial-gradient(circle, rgba(210,119,119,.5), transparent 70%); }
.hero-glow.earth { background: radial-gradient(circle, rgba(181,146,79,.5), transparent 70%); }
.hero-figure.gold { background: var(--wuxing-gold-soft); }
.hero-figure.wood { background: var(--wuxing-wood-soft); }
.hero-figure.water { background: var(--wuxing-water-soft); }
.hero-figure.fire { background: var(--wuxing-fire-soft); }
.hero-figure.earth { background: var(--wuxing-earth-soft); }
.hero-emoji { position: relative; z-index: 1; font-size: 50px; filter: drop-shadow(0 6px 12px rgba(80,70,120,.25)); }
.hero-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.hero-name { font-size: 18px; font-weight: 800; color: var(--text-primary); }
.hero-sub { font-size: 11.5px; font-weight: 600; color: var(--text-muted); text-decoration: none; }
.hero-track { font-size: 12.5px; color: var(--text-secondary); display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.hero-track b { color: var(--accent); }
.ht-skin { padding: 1px 8px; border-radius: 999px; background: rgba(138,128,216,.14); color: var(--accent); font-weight: 700; font-size: 11px; }
.ht-skin-emoji { margin-right: 2px; }
.hero-persona { font-size: 11.5px; color: var(--text-secondary); display: flex; align-items: center; gap: 4px; }
.hp-emoji { font-size: 14px; }
.ht-factor { font-size: 11px; font-weight: 700; padding: 1px 8px; border-radius: 8px; }
.ht-factor.good { color: var(--growth); background: rgba(94,156,122,.16); }
.ht-factor.bad { color: #E0913A; background: rgba(224,145,58,.12); }
.ht-factor.flat { color: var(--text-muted); background: var(--bg-card-strong); }
.hero-tip { margin: 2px 0 0; font-size: 11.5px; color: var(--text-muted); line-height: 1.6; }

/* 场次 */
.quota { display: flex; flex-direction: column; gap: 10px; }
.q-row { display: flex; align-items: center; justify-content: space-between; font-size: 13px; gap: 8px; }
.q-label { color: var(--text-secondary); font-weight: 600; flex: 0 0 auto; }
.q-val { color: var(--text-primary); font-weight: 700; text-align: right; }

/* 开赛 */
.start-btn {
  width: 100%; padding: 15px; border: 0; border-radius: 18px; cursor: pointer;
  background: linear-gradient(135deg, var(--accent), var(--accent-soft)); color: #fff;
  font-size: 15px; font-weight: 800; box-shadow: 0 12px 26px rgba(138,128,216,.35);
  transition: transform .14s cubic-bezier(.25,.46,.45,.94), opacity .2s;
}
.start-btn:active { transform: scale(.97); }
.start-btn:disabled { opacity: .45; cursor: default; transform: none; box-shadow: none; background: var(--bg-card-strong); color: var(--text-muted); }
.hint { margin: 0; font-size: 11px; color: var(--text-muted); text-align: center; }
</style>
