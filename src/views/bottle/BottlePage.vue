<!--
  src/views/bottle/BottlePage.vue —— 情绪瓶 全屏子页（无Tab，左上返回）
  版式：2026-08-25 参考图版式复刻（大瓶主视觉 + 今日球投入 + 统计 + 图鉴）
  机制对齐：01-全局规则 模块7 / 02-全局核心常量 七、情绪瓶数值表 / 03-API 8 / 05-core IEmotionBottle
    · 每日 0 点刷新 3 颗随机情绪球（8 种：喜怒静哀惊念倦盼）
    · 点击待投球 → 坠入瓶中，液面上升 + 瓶身晃动 + 心境 +2
    · 容量 30 颗，满溢触发「灵光乍现」：灵珠×30 + 魔丸×10，30% 天玑×1
    · 小三元彩蛋：当日连投 3 颗同表情 → 返还 1 次投入（当天可投 4 次）
  投入交互：点按 + 坠落动画（拖拽版后续素材到位再升级）
-->
<template>
  <div class="bottle-page app-page">
    <nav class="sub-nav">
      <BackButton />
      <h1 class="nav-title">情绪瓶</h1>
      <CornerButton tone="accent" aria-label="情绪瓶指南" @click="showGuide = true">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      </CornerButton>
    </nav>

    <div class="page-body">
      <!-- ============ 主卡：大瓶主视觉 + 今日球 ============ -->
      <section class="card-glass bottle-main" :class="{ overflow: isFull }">
        <p class="sub-title">{{ subtitle }}</p>
        <p class="theme-hint" v-if="themeEmotion && pendingBalls.length">今日缘定 · <b>{{ themeEmotion.emoji }} {{ themeEmotion.label }}</b> · 连收 3 颗触发小三元</p>

        <!-- 瓶口上方：今日待投球（剩余可投的 + 小三元返还的缘定球） -->
        <div class="pending-row" v-if="pendingBalls.length">
          <button
            v-for="(ball, i) in pendingBalls"
            :key="`pb-${i}`"
            class="pending-ball"
            :class="{ bonus: isBonus(i) }"
            :style="{ background: meta(ball).light, borderColor: meta(ball).color }"
            v-feedback="'BUTTON_CLICK'"
            @click="onDrop(ball, $event)"
          >
            <span>{{ meta(ball).emoji }}</span>
          </button>
          <p class="pending-hint">{{ pendingHintText }}</p>
        </div>
        <p class="pending-hint alone" v-else>今日情绪已收完，明天灵球再来 🌙</p>

        <!-- 玻璃瓶 -->
        <div class="bottle-stage">
          <img v-if="cfg.bottleImage" class="bottle-bg" :src="cfg.bottleImage" alt="" />
          <div class="bottle" :class="{ shaking: shaking }">
            <div class="bottle-neck"></div>
            <div class="bottle-body">
              <div class="liquid" :style="liquidStyle"></div>
              <div class="liquid-shine"></div>
              <!-- 瓶内浮动情绪球（按瓶内分布取前4种） -->
              <span
                v-for="(e, i) in floatingEmotions"
                :key="e + i"
                class="float-ball"
                :style="{ left: 18 + i * 22 + '%', animationDelay: (i * 0.7) + 's' }"
              >{{ meta(e).emoji }}</span>
            </div>
            <div class="bottle-base"></div>
          </div>
          <div class="stage-glow" v-if="isFull"></div>
          <span class="full-tag" v-if="isFull">灵光乍现</span>
        </div>

        <!-- 瓶子信息行 -->
        <div class="bottle-meta">
          <div class="meta-item">
            <b class="num">{{ bottle.currentCount }}</b>
            <s>/ {{ bottle.maxCapacity }} 颗</s>
          </div>
          <div class="meta-item">
            <b class="num">{{ bottle.todayUsed }}</b>
            <s>/ {{ bottle.dailyLimit }} 今日</s>
          </div>
          <div class="meta-item">
            <b class="num">{{ bottle.overflowCount }}</b>
            <s>次灵光</s>
          </div>
        </div>

        <!-- 满溢领取按钮（核心爽点） -->
        <button class="claim-btn" v-if="isFull" v-feedback="'BUTTON_CLICK'" @click="onClaim">
          ✨ 领取灵光 · 灵珠×{{ cfg.overflow.pearl }} 魔丸×{{ cfg.overflow.magic }}
        </button>
        <p class="refresh-hint">距明日灵球刷新 {{ countdown }}</p>
      </section>

      <!-- ============ 小三元提示卡 ============ -->
      <section class="triple-card" :class="{ on: tripleOn }">
        <span class="t-emoji">🎯</span>
        <div class="t-text">
          <b>小三元 · 彩蛋</b>
          <s>{{ tripleHint }}</s>
        </div>
      </section>

      <!-- ============ 瓶内情绪分布 ============ -->
      <section class="card-glass stats-card">
        <h2 class="card-title">瓶中情绪</h2>
        <div class="dist-bar" v-if="distTotal">
          <i
            v-for="d in distList"
            :key="d.type"
            :style="{ width: d.pct + '%', background: d.color }"
          ></i>
        </div>
        <p class="dist-empty" v-else>瓶子还空着，收入第一颗情绪球吧</p>
        <ul class="dist-list" v-if="distTotal">
          <li v-for="d in distList" :key="d.type">
            <span class="dot" :style="{ background: d.color }"></span>
            <em>{{ d.emoji }} {{ d.label }}</em>
            <b>×{{ d.count }}</b>
            <s>{{ d.pct }}%</s>
          </li>
        </ul>
      </section>

      <!-- ============ 情绪图鉴（8 种 · 永久收录） ============ -->
      <section class="card-glass legend-card">
        <h2 class="card-title">情绪灵球 · 八种 <span class="legend-count">{{ seenCount }}/{{ totalEmotions }}</span></h2>
        <div class="legend-grid">
          <div class="legend-item" v-for="e in modulesStore.bottleEmotions" :key="e.type" :class="{ unseen: !isSeen(e.type) }">
            <span class="lg-ball" :style="{ background: e.light, borderColor: e.color }">{{ isSeen(e.type) ? e.emoji : '❔' }}</span>
            <b>{{ isSeen(e.type) ? e.label : '？' }}</b>
          </div>
        </div>
        <p class="legend-note">已收入过的情绪永久收录 · 满溢倒空也不丢失</p>
      </section>

      <!-- ============ 漂流海（情绪瓶「向外」的一半） ============ -->
      <section class="card-glass drift-sea">
        <h2 class="card-title">漂流海 <span class="ds-count">放流 {{ drift.driftedOutTotal }} · 捞起 {{ drift.pickedTotal }}</span></h2>
        <p class="ds-tip">收进瓶里的是自己，放去海上的也是自己。写一句心事随浪漂走，也捞起陌生人留下的一句暖话。</p>
        <div class="ds-actions">
          <button class="ds-btn send" :class="{ done: !canSend }" v-feedback="'BUTTON_CLICK'" @click="openSend">
            <span class="ds-ic">🌊</span>
            <span class="ds-txt">
              <b>放流一只</b>
              <s>{{ canSend ? '写点心事，心境 +1' : '今日已放流' }}</s>
            </span>
          </button>
          <button class="ds-btn pick" :class="{ done: !canPick }" v-feedback="'BUTTON_CLICK'" @click="onPick">
            <span class="ds-ic">🪣</span>
            <span class="ds-txt">
              <b>捞起一只</b>
              <s>{{ canPick ? '捞句暖话，飘进信箱' : '今日已捞起' }}</s>
            </span>
          </button>
        </div>
      </section>
    </div>

    <!-- ============ 放流 compose 弹层 ============ -->
    <Overlay variant="sheet" :open="sendOpen" @close="sendOpen = false">
      <div class="send-sheet">
        <div class="ss-head"><b>放流一只漂流瓶</b><s>选一种情绪，写一句想说给海的话</s></div>
        <div class="ss-emotions">
          <button
            v-for="e in modulesStore.bottleEmotions"
            :key="e.type"
            class="ss-emo"
            :class="{ on: sendEmotion === e.type }"
            :style="sendEmotion === e.type ? { borderColor: e.color, background: e.light } : {}"
            v-feedback="'BUTTON_CLICK'"
            @click="sendEmotion = e.type"
          >
            <span>{{ e.emoji }}</span>
            <i>{{ e.label }}</i>
          </button>
        </div>
        <textarea
          class="ss-input"
          v-model="sendText"
          maxlength="120"
          placeholder="此刻最想说的一句话…（最多 120 字）"
          rows="4"
        ></textarea>
        <div class="ss-foot">
          <span class="ss-count">{{ sendText.length }}/120</span>
          <button class="ss-btn" :disabled="!sendText.trim()" v-feedback="'BUTTON_CLICK'" @click="confirmSend">
            放流 · 心境 +1
          </button>
        </div>
      </div>
    </Overlay>

    <!-- ============ 情绪瓶指南弹层 ============ -->
    <Overlay variant="modal" :open="showGuide" @close="showGuide = false">
      <div class="guide-card">
        <div class="g-head"><b>情绪瓶指南</b></div>
        <div class="g-body">
          <div class="g-item"><span class="g-ic">🌅</span><div><b>每日灵球</b><p>每天 0 点随机凝出 3 颗情绪灵球（共八种），点击收入瓶中即得心境 +{{ cfg.moodPerDrop }}，当天不投就浪费啦</p></div></div>
          <div class="g-item"><span class="g-ic">🍶</span><div><b>液面与满溢</b><p>瓶容量 {{ cfg.maxCapacity }} 颗，投入越多液面越高；装满时触发「灵光乍现」，清空瓶子领取灵珠×{{ cfg.overflow.pearl }} + 魔丸×{{ cfg.overflow.magic }}</p></div></div>
          <div class="g-item"><span class="g-ic">✨</span><div><b>天玑惊喜</b><p>满溢领取时有 {{ jadePct }}% 概率额外获得稀有货币「天玑」×1</p></div></div>
          <div class="g-item"><span class="g-ic">🎯</span><div><b>小三元彩蛋</b><p>每天有「缘定情绪」提示，连收 3 颗同表情灵球即触发，返还 1 次投入并赠 1 颗缘定球（当天最多可投 {{ cfg.dailyLimit + 1 }} 次）</p></div></div>
          <div class="g-item"><span class="g-ic">💫</span><div><b>中途小灵光</b><p>每投满 {{ milestoneText }} 颗，瓶子会泛起微光回赠灵珠与心境，让 {{ cfg.maxCapacity }} 颗的长路也有沿途的小确幸</p></div></div>
          <div class="g-item"><span class="g-ic">🧪</span><div><b>瓶中情绪</b><p>瓶内颜色记录着你近期的情绪构成，装满即是与自己和解的一程，倒空再启新程；情绪图鉴永久收录，不会因倒空而丢失</p></div></div>
          <div class="g-item"><span class="g-ic">🌊</span><div><b>漂流海</b><p>收进瓶里的是自己，放去海上的也是自己。每天可放流一只写满心事的漂流瓶（心境 +1），也能捞起一只陌生人留下的暖话，飘进首页信箱，读信再得心境 +1</p></div></div>
        </div>
      </div>
    </Overlay>

    <!-- ============ 中途「小灵光」庆祝卡 ============ -->
    <transition name="ms-pop">
      <div class="milestone-pop" v-if="milestoneCard" @click="milestoneCard = null">
        <div class="ms-inner">
          <span class="ms-ic">💫</span>
          <b class="ms-title">小灵光 · 第 {{ milestoneCard.at }} 颗</b>
          <p class="ms-text">{{ milestoneCard.text }}</p>
          <s class="ms-reward">灵珠 +{{ milestoneCard.pearl }} · 心境 +{{ milestoneCard.mood }}</s>
        </div>
      </div>
    </transition>

    <!-- toast -->
    <div class="toast" v-if="toastMsg">{{ toastMsg }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import BackButton from '@/components/navigation/BackButton.vue';
import CornerButton from '@/components/common/CornerButton.vue';
import Overlay from '@/components/common/Overlay.vue';
import { useModulesStore } from '@/stores/index';
import { vFeedback, audio } from '@/core/feedback';
import { useToast } from '@/composables/useToast';
import { usePageIntro } from '@/composables/usePageIntro';
import { msUntilMidnight, fmtCountdown } from '@/constants/bottle';
import { useFloaters } from '@/composables/useFloaters';
import type { EmotionType } from '@/types/index';

const modulesStore = useModulesStore();
const { toastMsg, showToast } = useToast(2600);

const bottle = computed(() => modulesStore.emotionBottle);
const isFull = computed(() => bottle.value.currentCount >= bottle.value.maxCapacity);
/** 情绪 cfg 映射（后台改色/emoji/文案即时生效） */
const emotionMap = computed(() => modulesStore.bottleEmotionMap);
/** 数值类配置（容量/心境加成/满溢/漂流参数） */
const cfg = computed(() => modulesStore.bottleConfig);
/** 满溢天玑概率（百分比展示） */
const jadePct = computed(() => Math.round(cfg.value.overflow.jadeChance * 100));
/** 中途里程碑档位文案（如 "10 / 20"） */
const milestoneText = computed(() => cfg.value.milestones.map((m) => m.at).join(' / '));

/** 今日剩余待投球 = 未投的今日球 + 小三元返还的缘定球 */
const pendingBalls = computed(() => {
  const b = bottle.value;
  const used = Math.min(b.todayUsed, b.todayBalls.length);
  const regular = b.todayBalls.slice(used);
  return [...regular, ...(b.bonusBalls || [])];
});
/** 今日球中「非返还」的部分数量（用于标记哪些待投球是缘定球） */
const regularPendingCount = computed(() => {
  const b = bottle.value;
  return Math.max(0, b.todayBalls.length - Math.min(b.todayUsed, b.todayBalls.length));
});
function isBonus(i: number) { return i >= regularPendingCount.value; }

/** 今日缘定情绪（今日 3 颗中占多数的主题，连收 3 颗触发小三元） */
const themeEmotion = computed(() => {
  const b = bottle.value;
  const counts: Partial<Record<EmotionType, number>> = {};
  for (const t of b.todayBalls) counts[t] = (counts[t] || 0) + 1;
  let dom: EmotionType | null = null; let max = 0;
  for (const k in counts) {
    const n = counts[k as EmotionType]!;
    if (n > max) { max = n; dom = k as EmotionType; }
  }
  return dom && max >= 2 ? (emotionMap.value[dom] ?? null) : null;
});

/** 情绪图鉴（永久收录） */
const seenCount = computed(() => (bottle.value.emotionsSeen || []).length);
const totalEmotions = computed(() => modulesStore.bottleEmotions.length);
function isSeen(t: EmotionType) { return (bottle.value.emotionsSeen || []).includes(t); }

/** 待投区提示文案（满溢时引导先领灵光） */
const pendingHintText = computed(() =>
  isFull.value ? '瓶子满溢了，先领取灵光再投' : '点击情绪球，收入瓶中');

/** 瓶内浮动球：按分布取数量最多的前 4 种 */
const floatingEmotions = computed(() => {
  const entries = Object.entries(bottle.value.contents) as [EmotionType, number][];
  return entries.sort((a, b) => b[1] - a[1]).slice(0, 4).map(([t]) => t);
});

/** 液体样式：高度 = 进度；颜色 = 占比最高的情绪渐变（空瓶用默认色） */
const liquidStyle = computed(() => {
  const b = bottle.value;
  const h = Math.max(0, Math.min(100, (b.currentCount / b.maxCapacity) * 100));
  const top = distList.value[0];
  const c = top ? emotionMap.value[top.type] : null;
  return {
    height: h + '%',
    background: c
      ? `linear-gradient(180deg, ${c.light} 0%, ${c.color} 100%)`
      : 'linear-gradient(180deg, #CDEDE6 0%, #6FBFA9 100%)',
  };
});

/** 瓶内分布（降序 + 百分比） */
const distList = computed(() => {
  const entries = Object.entries(bottle.value.contents) as [EmotionType, number][];
  const total = entries.reduce((s, [, n]) => s + n, 0);
  return entries
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({
      type, count,
      color: emotionMap.value[type].color,
      label: emotionMap.value[type].label,
      emoji: emotionMap.value[type].emoji,
      pct: Math.round((count / total) * 100),
    }));
});
const distTotal = computed(() => bottle.value.currentCount > 0);

/** 副标题：满溢 > 今日进度 > 空瓶 */
const subtitle = computed(() => {
  if (isFull.value) return '灵光满溢，收取这份沉淀的礼物';
  if (bottle.value.todayUsed >= bottle.value.dailyLimit) return '今日情绪已收好，让瓶子慢慢盛满';
  return '收下此刻情绪，让心慢慢沉静';
});

/** 小三元提示 */
const tripleOn = computed(() => {
  const l = bottle.value.lastThreeEmotions;
  return l.length === 3 && l.every((e) => e === l[0]);
});
const tripleHint = computed(() => {
  if (tripleOn.value) return '已触发！明日 3 颗球有缘再聚';
  const l = bottle.value.lastThreeEmotions;
  // 【P3 修复】仅当：本日尚有可投球、且下一颗恰好是缘定情绪时，才提示"再连收"——
  // 否则在 65% 的日子里第 3 颗是异色、三元本就不可达，提示会误导玩家
  const next = pendingBalls.value[0];
  if (l.length >= 2 && l[0] === l[1] && next && next === l[0])
    return `再连收 1 颗「${emotionMap.value[l[0]].label}」即触发，返还 1 次投入`;
  return '当日连收 3 颗同表情，返还 1 次投入次数';
});

function meta(t: EmotionType) { return emotionMap.value[t]; }

/* ---------- 投入 ---------- */
const shaking = ref(false);
const showGuide = ref(false);   // 情绪瓶指南弹层（右上 ? ）
const { pushFloater, rectCenter } = useFloaters();
function onDrop(type: EmotionType, ev?: Event) {
  const r = modulesStore.dropEmotion(type);
  if (!r.success) {
    audio.play('error');
    showToast(r.reason === 'full' ? '瓶子满溢了，先领取灵光吧' : '今日已收满，明天再来');
    return;
  }
  audio.play('soft');
  shaking.value = true;
  setTimeout(() => (shaking.value = false), 600);
  // 来源处飘字：心境 +2（顶栏 FloatDelta 同步显示总量变化）
  const c = rectCenter(ev?.currentTarget as Element | undefined);
  pushFloater({ x: c.x, y: c.y - 14, text: '心境 +2', kind: 'mood', duration: 1300 });
  if (r.milestone) {
    celebrate(r.milestone);
  } else   if (r.triple) {
    showToast(`🎉 小三元！${emotionMap.value[type].label}×3，返还 1 次今日投入`);
  } else {
    showToast(`${emotionMap.value[type].emoji} ${emotionMap.value[type].label} · 已收入瓶中，心境 +${cfg.value.moodPerDrop}`);
  }
}

/* ---------- 满溢领取 ---------- */
function onClaim(ev?: Event) {
  const r = modulesStore.claimBottleOverflow();
  if (!r.success) return;
  audio.play('coin');
  const c = rectCenter(ev?.currentTarget as Element | undefined);
  pushFloater({ x: c.x, y: c.y - 18, text: `灵珠 +${r.pearl}`, kind: 'pearl', duration: 1500 });
  pushFloater({ x: c.x + 28, y: c.y - 6, text: `魔丸 +${r.magic}`, kind: 'magic', duration: 1500 });
  if (r.jade) pushFloater({ x: c.x - 28, y: c.y + 4, text: `天玑 +${r.jade}`, kind: 'jade', duration: 1500 });
  showToast(r.jade
    ? `✨ 灵光乍现！灵珠×${r.pearl} 魔丸×${r.magic} 天玑×${r.jade}`
    : `✨ 灵光乍现！灵珠×${r.pearl} 魔丸×${r.magic}`);
}

/* ---------- 漂流海（情绪瓶「向外」的一半） ---------- */
const drift = computed(() => modulesStore.driftBottle);
const canSend = computed(() => drift.value.driftedOutUsed < cfg.value.drift.sendDaily);
const canPick = computed(() => drift.value.pickedUsed < cfg.value.drift.pickDaily);

/** 放流 compose 弹层状态 */
const sendOpen = ref(false);
const sendEmotion = ref<EmotionType>('calm');
const sendText = ref('');

function openSend() {
  if (!canSend.value) { showToast('今日已放流，明天再相遇 🌊'); return; }
  sendOpen.value = true;
}
function confirmSend(ev?: Event) {
  const r = modulesStore.sendDrift(sendEmotion.value, sendText.value);
  if (!r.success) {
    if (r.reason === 'empty') showToast('写点什么再放流吧');
    else showToast('今日已放流，明天再相遇 🌊');
    return;
  }
  audio.play('soft');
  const c = rectCenter(ev?.currentTarget as Element | undefined);
  pushFloater({ x: c.x, y: c.y - 14, text: '心境 +1', kind: 'mood', duration: 1300 });
  showToast('🌊 漂流瓶已放流，随浪去往远方');
  sendOpen.value = false;
  sendText.value = '';
}
async function onPick(ev?: Event) {
  if (!canPick.value) { showToast('今日已捞起，明天再来 🪣'); return; }
  const r = await modulesStore.pickDrift();
  if (!r.success) return;
  audio.play('soft');
  const c = rectCenter(ev?.currentTarget as Element | undefined);
  pushFloater({ x: c.x, y: c.y - 14, text: '心境 +1', kind: 'mood', duration: 1300 });
  showToast(r.message?.fromCloud ? '🌍 捞起一只远方的漂流瓶，暖话已漂进信箱' : '🪣 捞起一只漂流瓶，暖话已漂进信箱');
}

/* ---------- 中途「小灵光」庆祝卡 ---------- */
const milestoneCard = ref<null | { at: number; pearl: number; mood: number; text: string }>(null);
let milestoneTimer = 0;
function celebrate(m: { at: number; pearl: number; mood: number; text: string }) {
  milestoneCard.value = m;
  clearTimeout(milestoneTimer);
  milestoneTimer = window.setTimeout(() => (milestoneCard.value = null), 2800);
}

/* ---------- 刷新倒计时 ---------- */
const countdown = ref('');
let timer = 0;
function tick() { countdown.value = fmtCountdown(msUntilMidnight()); }

onMounted(() => {
  modulesStore.normalizeBottle();  // 旧数据补齐 + 今日球生成
  modulesStore.normalizeDrift();   // 漂流瓶跨天重置
  tick();
  timer = window.setInterval(tick, 30_000);
});
onUnmounted(() => { clearInterval(timer); clearTimeout(milestoneTimer); });

/* ---------- 分区入场动画 ---------- */
usePageIntro({
  rootSelector: '.bottle-page',
  sections: [
    { selector: '.bottle-main', y: 16, scale: 0.985, duration: 0.45 },
    { selector: '.triple-card', y: 14, duration: 0.38 },
    { selector: '.stats-card', y: 14, duration: 0.38 },
    { selector: '.legend-card', y: 14, duration: 0.38 },
  ],
  loops: [],
});
</script>

<style scoped>
.bottle-page { padding-top: 8px; display: flex; flex-direction: column; gap: 14px; }

.sub-nav {
  display: flex; align-items: center; justify-content: space-between;
  padding: 4px 2px 8px;
}
.nav-title { font-size: 17px; font-weight: 700; color: var(--text-primary); letter-spacing: .5px; }
/* 情绪瓶指南内容（遮罩/面板/关闭按钮/动画由 Overlay 组件统一提供） */
.guide-card { display: flex; flex-direction: column; gap: 12px; }
.g-head b { font-size: 16px; font-weight: 700; color: var(--text-primary); }
.g-body { display: flex; flex-direction: column; gap: 10px; }
.g-item { display: flex; gap: 10px; align-items: flex-start; padding: 10px; border-radius: 14px;
  background: rgba(255,255,255,.5); }
.g-ic { width: 34px; height: 34px; border-radius: 11px; background: var(--accent-soft, rgba(140,120,220,.14));
  display: grid; place-items: center; font-size: 16px; flex: 0 0 auto; }
.g-item b { display: block; font-size: 12.5px; color: var(--text-primary); }
.g-item p { margin: 2px 0 0; font-size: 11px; line-height: 1.5; color: var(--text-muted); }

.page-body { display: flex; flex-direction: column; gap: 14px; }

/* ===== 主卡 ===== */
.bottle-main {
  padding: 18px 18px 16px;
  display: flex; flex-direction: column; align-items: center;
  gap: 14px; border-radius: var(--radius-card, 20px);
  transition: box-shadow .4s ease;
}
.bottle-main.overflow { box-shadow: 0 0 0 1px rgba(232, 184, 75, .45), 0 12px 32px rgba(232, 184, 75, .25); }
.sub-title { font-size: 13px; color: var(--text-secondary); letter-spacing: .5px; }

/* 今日缘定情绪提示 */
.theme-hint {
  font-size: 11.5px; color: var(--text-muted); letter-spacing: .3px;
  background: rgba(232, 184, 75, .12); padding: 5px 12px; border-radius: 12px;
}
.theme-hint b { color: #B8860B; font-weight: 700; }

/* 待投球 */
.pending-row { display: flex; align-items: center; gap: 12px; min-height: 58px; }
.pending-ball {
  width: 52px; height: 52px; border-radius: 50%;
  border: 2px solid; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 24px;
  box-shadow: 0 6px 14px rgba(111, 191, 169, .25), inset 0 -4px 8px rgba(255, 255, 255, .55);
  transition: transform .15s ease;
  animation: bob 3s ease-in-out infinite;
}
.pending-ball:nth-child(2) { animation-delay: .4s; }
.pending-ball:nth-child(3) { animation-delay: .8s; }
.pending-ball:active { transform: scale(.9); }
/* 小三元返还的缘定球：金边呼吸，提示「这是额外赠送的」 */
.pending-ball.bonus {
  border-color: #E8B84B !important;
  box-shadow: 0 0 0 2px rgba(232, 184, 75, .35), 0 6px 16px rgba(232, 184, 75, .3);
  animation: bonusBreath 1.6s ease-in-out infinite;
}
.pending-hint { font-size: 12px; color: var(--text-muted); margin-left: 4px; }
.pending-hint.alone { margin: 0 auto; }

/* 玻璃瓶 */
.bottle-stage { position: relative; width: 200px; height: 252px; display: flex; justify-content: center; }
/* 瓶背景图（后台可上传，留空回退内置玻璃质感） */
.bottle-bg { position: absolute; inset: -14px; width: calc(100% + 28px); height: calc(100% + 28px); object-fit: cover; border-radius: 26px; z-index: 0; opacity: .45; pointer-events: none; }
.stage-glow {
  position: absolute; inset: -14px; border-radius: 50%;
  background: radial-gradient(circle, rgba(232, 184, 75, .35) 0%, transparent 70%);
  animation: glowPulse 1.8s ease-in-out infinite; pointer-events: none;
}
.full-tag {
  position: absolute; top: -6px; right: -34px;
  font-size: 11px; font-weight: 700; color: #B8860B;
  background: linear-gradient(135deg, #F7E3B0, #E8B84B);
  padding: 4px 10px; border-radius: 12px; letter-spacing: 1px;
  animation: bob 2.4s ease-in-out infinite;
}
.bottle { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; width: 160px; }
.bottle.shaking { animation: shake .55s ease; }
.bottle-neck {
  width: 44px; height: 26px;
  background: linear-gradient(90deg, rgba(214, 240, 235, .55), rgba(255, 255, 255, .8), rgba(214, 240, 235, .55));
  border: 1.5px solid rgba(111, 191, 169, .45); border-bottom: 0;
  border-radius: 8px 8px 4px 4px;
}
.bottle-body {
  position: relative; width: 160px; height: 190px; overflow: hidden;
  background: linear-gradient(100deg, rgba(255, 255, 255, .35), rgba(214, 240, 235, .25));
  border: 1.5px solid rgba(111, 191, 169, .45);
  border-radius: 26px 26px 34px 34px / 20px 20px 40px 40px;
  box-shadow: inset 0 6px 16px rgba(255, 255, 255, .5), 0 10px 24px rgba(111, 191, 169, .18);
}
.liquid {
  position: absolute; left: 0; right: 0; bottom: 0;
  transition: height .6s cubic-bezier(.34, 1.3, .64, 1), background .6s ease;
  opacity: .85;
}
.liquid::before {
  content: ''; position: absolute; top: -6px; left: -8%; width: 116%; height: 12px;
  background: inherit; border-radius: 50%;
}
.liquid-shine {
  position: absolute; top: 14px; left: 14px; width: 14px; height: 60px;
  background: rgba(255, 255, 255, .45); border-radius: 8px;
  filter: blur(2px); transform: rotate(8deg);
}
.float-ball {
  position: absolute; bottom: 6%; font-size: 18px;
  animation: floatUp 4s ease-in-out infinite;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, .15));
}
.bottle-base {
  width: 120px; height: 10px;
  background: linear-gradient(90deg, rgba(111, 191, 169, .35), rgba(111, 191, 169, .6), rgba(111, 191, 169, .35));
  border-radius: 50%;
}

/* 信息行 */
.bottle-meta { display: flex; gap: 26px; align-items: baseline; }
.meta-item { display: flex; align-items: baseline; gap: 4px; }
.meta-item .num { font-size: 22px; font-weight: 800; color: var(--accent); }
.meta-item s { text-decoration: none; font-size: 12px; color: var(--text-muted); }

/* 满溢按钮 */
.claim-btn {
  height: 46px; padding: 0 26px; border: 0; border-radius: 23px; cursor: pointer;
  background: linear-gradient(135deg, #F0C96A, #E8B84B);
  color: #6B4E00; font-size: 15px; font-weight: 700; letter-spacing: .5px;
  box-shadow: 0 10px 26px rgba(232, 184, 75, .4);
  animation: breath 1.6s ease-in-out infinite;
  transition: transform .1s ease;
}
.claim-btn:active { transform: scale(.96); }
.refresh-hint { font-size: 11px; color: var(--text-muted); }

/* ===== 小三元卡 ===== */
.triple-card {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px; border-radius: 16px;
  background: rgba(255, 255, 255, .5);
  border: 1px dashed rgba(111, 191, 169, .5);
}
.triple-card.on {
  background: linear-gradient(135deg, rgba(247, 227, 176, .6), rgba(232, 184, 75, .25));
  border-style: solid; border-color: rgba(232, 184, 75, .6);
}
.t-emoji { font-size: 22px; }
.t-text { display: flex; flex-direction: column; gap: 2px; }
.t-text b { font-size: 13px; color: var(--text-primary); }
.t-text s { text-decoration: none; font-size: 12px; color: var(--text-secondary); }

/* ===== 分布卡 ===== */
.stats-card, .legend-card { padding: 16px; border-radius: var(--radius-card, 20px); }
.card-title { font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px; letter-spacing: .5px; }
.dist-bar {
  display: flex; height: 12px; border-radius: 6px; overflow: hidden;
  background: rgba(111, 191, 169, .12); margin-bottom: 12px;
}
.dist-bar i { transition: width .5s ease; }
.dist-empty { font-size: 12px; color: var(--text-muted); }
.dist-list { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
.dist-list li { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.dist-list .dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
.dist-list em { font-style: normal; color: var(--text-secondary); flex: 1; }
.dist-list b { color: var(--text-primary); }
.dist-list s { text-decoration: none; color: var(--text-muted); }

/* ===== 图鉴卡 ===== */
.legend-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px 8px; }
.legend-item { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.lg-ball {
  width: 44px; height: 44px; border-radius: 50%; border: 2px solid;
  display: flex; align-items: center; justify-content: center; font-size: 20px;
  box-shadow: inset 0 -4px 8px rgba(255, 255, 255, .5);
}
.legend-item b { font-size: 12px; color: var(--text-secondary); }
.legend-item.unseen .lg-ball { filter: grayscale(.7); opacity: .5; }
.legend-item.unseen b { color: var(--text-muted); opacity: .6; }
.legend-count {
  font-size: 12px; font-weight: 600; color: var(--accent);
  margin-left: 8px; padding: 2px 8px; border-radius: 10px;
  background: var(--accent-soft, rgba(140, 120, 220, .14));
}
.legend-note { margin-top: 12px; font-size: 11px; color: var(--text-muted); text-align: center; }

/* ===== toast ===== */
.toast {
  position: fixed; left: 50%; bottom: 96px; transform: translateX(-50%);
  max-width: 82vw; padding: 10px 18px; border-radius: 14px;
  background: rgba(45, 62, 58, .88); color: #fff;
  font-size: 13px; line-height: 1.5; text-align: center;
  box-shadow: 0 8px 24px rgba(0, 0, 0, .18); z-index: var(--z-toast, 1100);
  animation: toastIn .3s ease;
}

/* ===== 漂流海 ===== */
.drift-sea { padding: 16px; border-radius: var(--radius-card, 20px); }
.ds-count { font-size: 11px; font-weight: 600; color: var(--accent); margin-left: 8px; padding: 2px 8px; border-radius: 10px; background: var(--accent-soft, rgba(140, 120, 220, .14)); }
.ds-tip { margin: 0 0 14px; font-size: 12px; line-height: 1.7; color: var(--text-muted); }
.ds-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.ds-btn {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 14px; border-radius: 16px; cursor: pointer; text-align: left;
  border: 1px solid var(--border-light); background: rgba(255, 255, 255, .5);
  transition: transform .12s ease, box-shadow .25s ease, opacity .2s ease;
}
.ds-btn:active { transform: scale(.98); }
.ds-btn.send { background: linear-gradient(135deg, rgba(214, 240, 235, .5), rgba(255, 255, 255, .6)); }
.ds-btn.pick { background: linear-gradient(135deg, rgba(138, 128, 216, .1), rgba(255, 255, 255, .6)); }
.ds-btn.done { opacity: .55; cursor: default; }
.ds-ic { font-size: 26px; line-height: 1; }
.ds-txt { display: flex; flex-direction: column; gap: 2px; }
.ds-txt b { font-size: 13.5px; color: var(--text-primary); font-weight: 700; }
.ds-txt s { text-decoration: none; font-size: 11px; color: var(--text-muted); }

/* ===== 放流 compose 弹层 ===== */
.send-sheet { padding: 6px 2px 2px; }
.ss-head { display: flex; flex-direction: column; gap: 3px; margin-bottom: 14px; }
.ss-head b { font-size: 16px; font-weight: 800; color: var(--text-primary); }
.ss-head s { text-decoration: none; font-size: 12px; color: var(--text-muted); }
.ss-emotions { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
.ss-emo {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 9px 2px; border-radius: 14px; cursor: pointer;
  border: 2px solid var(--border-light); background: rgba(255, 255, 255, .5);
  transition: all .18s ease;
}
.ss-emo span { font-size: 22px; }
.ss-emo i { font-style: normal; font-size: 11px; color: var(--text-secondary); }
.ss-emo.on { box-shadow: 0 6px 16px rgba(111, 191, 169, .25); }
.ss-input {
  width: 100%; box-sizing: border-box; padding: 12px 14px;
  border-radius: 14px; border: 1px solid var(--border-light);
  background: rgba(255, 255, 255, .6); resize: none;
  font-size: 13.5px; line-height: 1.6; color: var(--text-primary);
  font-family: inherit;
}
.ss-input:focus { outline: none; border-color: var(--accent); }
.ss-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; }
.ss-count { font-size: 11px; color: var(--text-muted); }
.ss-btn {
  padding: 11px 22px; border: 0; border-radius: 16px; cursor: pointer;
  background: linear-gradient(135deg, #6FBFA9, #4FB3A5); color: #fff;
  font-size: 14px; font-weight: 700; letter-spacing: .5px;
  box-shadow: 0 8px 20px rgba(79, 179, 165, .32);
  transition: transform .12s ease, opacity .2s ease;
}
.ss-btn:active { transform: scale(.97); }
.ss-btn:disabled { opacity: .45; cursor: not-allowed; box-shadow: none; }

/* ===== 动画 ===== */
@keyframes bob { 0%, 100% { transform: translateY(0);} 50% { transform: translateY(-6px);} }
@keyframes shake {
  0%, 100% { transform: rotate(0);}
  20% { transform: rotate(2.4deg);}
  40% { transform: rotate(-2deg);}
  60% { transform: rotate(1.4deg);}
  80% { transform: rotate(-1deg);}
}
@keyframes floatUp { 0%, 100% { transform: translateY(0);} 50% { transform: translateY(-14px);} }
@keyframes glowPulse { 0%, 100% { opacity: .55; transform: scale(1);} 50% { opacity: 1; transform: scale(1.06);} }
@keyframes breath { 0%, 100% { transform: scale(1); box-shadow: 0 10px 26px rgba(232, 184, 75, .4);} 50% { transform: scale(1.04); box-shadow: 0 14px 34px rgba(232, 184, 75, .6);} }
@keyframes toastIn { from { opacity: 0; transform: translate(-50%, 8px);} to { opacity: 1; transform: translate(-50%, 0);} }

/* ===== 中途「小灵光」庆祝卡 ===== */
.milestone-pop {
  position: fixed; left: 50%; top: 38%; transform: translate(-50%, -50%);
  z-index: var(--z-overlay, 1000); width: min(78vw, 320px);
  cursor: pointer; pointer-events: auto;
}
.ms-inner {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 20px 22px; border-radius: 22px; text-align: center;
  background: linear-gradient(160deg, rgba(255, 251, 240, .98), rgba(247, 227, 176, .96));
  border: 1px solid rgba(232, 184, 75, .6);
  box-shadow: 0 18px 48px rgba(232, 184, 75, .4);
  animation: msIn .45s cubic-bezier(.34, 1.3, .64, 1);
}
.ms-ic { font-size: 34px; animation: glowPulse 1.8s ease-in-out infinite; }
.ms-title { font-size: 15px; font-weight: 800; color: #9A6B00; letter-spacing: .5px; }
.ms-text { margin: 2px 0; font-size: 12.5px; line-height: 1.55; color: #6B4E00; }
.ms-reward { text-decoration: none; font-size: 12px; color: #B8860B; font-weight: 600; }
.ms-pop-leave-active { transition: opacity .3s ease, transform .3s ease; }
.ms-pop-leave-to { opacity: 0; transform: translate(-50%, -50%) scale(.9); }
@keyframes msIn { from { opacity: 0; transform: translate(-50%, -50%) scale(.8);} to { opacity: 1; transform: translate(-50%, -50%) scale(1);} }
@keyframes bonusBreath { 0%, 100% { box-shadow: 0 0 0 2px rgba(232, 184, 75, .35), 0 6px 16px rgba(232, 184, 75, .3);} 50% { box-shadow: 0 0 0 4px rgba(232, 184, 75, .5), 0 8px 22px rgba(232, 184, 75, .45);} }
</style>
