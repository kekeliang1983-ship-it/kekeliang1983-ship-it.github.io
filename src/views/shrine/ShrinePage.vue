<!--
  src/views/shrine/ShrinePage.vue —— 神龛 全屏子页（无Tab，左上返回）
  版式：2026-08-25 参考图版式复刻（神位主视觉 + 四宫格供奉 + 心愿墙 + 今日宜忌）
  机制对齐：01-全局规则 模块3 / 02-全局核心常量 三、神龛数值表 / 05-core lightIncense
    · 三档香：线香(5元宝/1h/+5%)、檀香(10灵珠/4h/+15%·10%返还)、龙涎香(8魔丸/12h/+30%·必得上上签)
    · 长按 3 秒点燃（01-L50 模拟真实上香）→ 神恩Buff（同一时间仅生效最高档）
    · 每日头香：首次点香随机货币 x5（02-L41）
    · 求签：灵气 10（01-L12）；上上签可兑 20 元宝（02-L40）
    · 神位四选一：财神/月老/文昌/药王（01-L49）
-->
<template>
  <div class="shrine-page app-page">
    <nav class="sub-nav">
      <BackButton />
      <h1 class="nav-title">神龛</h1>
      <CornerButton tone="accent" aria-label="神龛指南" @click="showGuide = true">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      </CornerButton>
    </nav>

    <div class="page-body">
      <!-- ============ 主卡：神位主视觉 + 神恩Buff ============ -->
      <section class="card-glass deity-card" :class="{ blessed: buffActive }">
        <p class="sub-title">{{ buffActive ? `${buffName}神恩加持中` : '香火未燃 · 静候祈愿' }}</p>

        <!-- 神位主视觉 -->
        <div class="deity-stage">
          <div class="deity-halo" :style="haloStyle"></div>
          <img v-if="deityMeta.image" class="deity-img" :class="{ floating: !smoking }" :src="deityMeta.image" :alt="deityMeta.name" />
          <span v-else class="deity-emoji" :class="{ floating: !smoking }">{{ deityMeta.emoji }}</span>
          <!-- 燃香烟雾 -->
          <span v-for="i in 3" :key="i" class="smoke" v-if="smoking"
            :style="{ left: (38 + i * 12) + '%', animationDelay: (i * 0.5) + 's' }"></span>
        </div>

        <h2 class="deity-name">{{ deityMeta.name }}</h2>
        <p class="deity-bless">{{ deityMeta.blessing }}</p>

        <!-- 神恩Buff条 -->
        <div class="buff-bar" :class="{ active: buffActive }">
          <template v-if="buffActive">
            <span class="b-ic">{{ buffEmoji }}</span>
            <div class="b-info">
              <b>{{ buffName }} · 收益 +{{ Math.round(activeBuff.rate * 100) }}%</b>
              <i>剩余 {{ buffLeft }}</i>
            </div>
          </template>
          <template v-else>
            <span class="b-ic">🪔</span>
            <div class="b-info"><b>尚未点燃香火</b><i>上香后全资源产出提升</i></div>
          </template>
        </div>

        <!-- 神位切换（基础四神 + 解锁四神，锁定态灰显） -->
        <div class="deity-row">
          <button v-for="d in modules.shrineDeities" :key="d.id" class="deity-chip"
            :class="{ on: shrine.deity === d.id, locked: !modules.isDeityUnlocked(d.id) }"
            v-feedback="'BUTTON_CLICK'" @click="onPickDeity(d)">
            <img v-if="d.image" class="chip-img" :src="d.image" :alt="d.name" />
            <span v-else>{{ d.emoji }}</span><b>{{ d.name }}</b>
            <i v-if="d.unlock">🔒{{ d.unlock.desc }}</i>
          </button>
        </div>
      </section>

      <!-- ============ 四宫格：上香 / 求签 / 心愿 / 兑签 ============ -->
      <section class="grid-4">
        <button class="g-cell" v-feedback="'BUTTON_CLICK'" @click="openIncenseSheet">
          <span class="g-ic">🕯️</span><b>上香</b><i>点燃神恩</i>
        </button>
        <button class="g-cell" v-feedback="'BUTTON_CLICK'" @click="onDrawFortune">
          <span class="g-ic">🀄</span><b>求签</b><i>灵气×10</i>
        </button>
        <button class="g-cell" v-feedback="'BUTTON_CLICK'" @click="showWishSheet = true">
          <span class="g-ic">🎋</span><b>心愿</b><i>写下祈愿</i>
        </button>
        <button class="g-cell" :class="{ dim: shrine.coupons <= 0 }" v-feedback="'BUTTON_CLICK'" @click="onRedeem">
          <span class="g-ic">🧧</span><b>兑签</b><i>上上签×{{ shrine.coupons }}</i>
        </button>
      </section>

      <!-- ============ 今日宜 / 忌 ============ -->
      <section class="card-glass almanac-card">
        <h3 class="card-title">今日 · {{ dayKey }}</h3>
        <div class="almanac-row">
          <div class="al-item yi"><b>宜</b><span>{{ todayYi }}</span></div>
          <div class="al-item ji"><b>忌</b><span>{{ todayJi }}</span></div>
        </div>
        <p class="almanac-tip" v-if="recommendDeity">
          ✨ 今日祈愿 · 推荐请「{{ recommendDeity.name }}」（{{ recommendDeity.blessing }}）
        </p>
      </section>

      <!-- ============ 心愿墙 ============ -->
      <section class="card-glass wish-card">
        <h3 class="card-title">心愿墙</h3>
        <div class="wish-list" v-if="shrine.wishes.length">
          <div class="wish-item" v-for="(w, i) in shrine.wishes" :key="w.ts">
            <span class="w-knot">🪢</span>
            <p>{{ w.text }}</p>
            <i>{{ wishTime(w.ts) }}</i>
          </div>
        </div>
        <div class="wish-empty" v-else>
          <span>🎋</span>
          <p>还没有心愿 · 写下一句祈愿挂在墙上吧</p>
        </div>
      </section>
    </div>

    <!-- ============ 上香 sheet：选香 + 长按点燃 ============ -->
    <Overlay variant="sheet" :open="showIncenseSheet" @close="closeIncenseSheet">
      <div class="incense-sheet">
        <h3 class="card-title">选择香品</h3>
        <div class="incense-list">
          <button v-for="c in modules.shrineIncenses" :key="c.type" class="incense-item"
            :class="{ on: selectedType === c.type }"
            v-feedback="'BUTTON_CLICK'" @click="selectedType = c.type">
            <span class="i-ic">
              <img v-if="c.image" class="i-img" :src="c.image" :alt="c.name" />
              <template v-else>{{ c.emoji }}</template>
            </span>
            <div class="i-info">
              <b>{{ c.name }} <s>· {{ COST_LABEL[c.cost.currency] }}×{{ c.cost.amount }}</s></b>
              <p>{{ c.desc }}</p>
              <em v-if="c.special">{{ c.special }}</em>
            </div>
          </button>
        </div>

        <!-- 长按 3 秒点燃 -->
        <button class="ignite-btn" :class="{ holding: pressing }" :disabled="!selectedType"
          @pointerdown.prevent="startPress" @pointerup.prevent="cancelPress"
          @pointerleave="cancelPress" @pointercancel="cancelPress">
          <i class="ignite-fill"></i>
          <span>{{ pressing ? '虔诚点燃中…' : `长按 ${Math.round(modules.shrineConfig.params.pressMs / 1000)} 秒 · 点燃香火` }}</span>
        </button>
        <p class="qi-hint">每次上香消耗灵气 {{ modules.shrineConfig.params.incenseQiCost }} 点 · 当前 {{ user.qi }}</p>
      </div>
    </Overlay>

    <!-- ============ 心愿 sheet ============ -->
    <Overlay variant="sheet" :open="showWishSheet" @close="showWishSheet = false">
      <div class="wish-sheet">
        <h3 class="card-title">写下心愿</h3>
        <textarea v-model="wishText" class="wish-input" rows="3" maxlength="30"
          placeholder="对神明说句悄悄话（30字内）"></textarea>
        <button class="wish-submit" v-feedback="'BUTTON_CLICK'" @click="onAddWish">挂上心愿墙</button>
      </div>
    </Overlay>

    <!-- ============ 签文 modal ============ -->
    <Overlay variant="modal" :open="!!fortune" @close="fortune = null">
      <div class="fortune-card" v-if="fortune">
        <span class="f-emoji">{{ fortune.emoji }}</span>
        <b class="f-rank">{{ fortune.rank }}</b>
        <p class="f-text">{{ fortune.text }}</p>
        <p class="f-note" v-if="fortune.rank === '上上签'">已收入券包 · 可在「兑签」兑换 {{ modules.shrineConfig.params.couponValueGold }} 元宝</p>
      </div>
    </Overlay>

    <!-- ============ 神龛指南 modal ============ -->
    <Overlay variant="modal" :open="showGuide" @close="showGuide = false">
      <div class="guide-card">
        <div class="g-head"><b>神龛指南</b></div>
        <div class="g-body">
          <div class="g-item"><span class="g-ic">🕯️</span><div><b>上香得神恩</b><p>选香后长按 {{ Math.round(modules.shrineConfig.params.pressMs / 1000) }} 秒点燃，获得全资源产出增益；同一时间只生效最高档神恩</p></div></div>
          <div class="g-item" v-for="c in modules.shrineIncenses" :key="c.type"><span class="g-ic">{{ c.emoji }}</span><div><b>{{ c.name }}</b><p>{{ c.desc }}{{ c.special ? `（${c.special}）` : '' }}{{ c.guaranteeTop ? ' · 必得上上签' : '' }}</p></div></div>
          <div class="g-item"><span class="g-ic">🌅</span><div><b>每日头香</b><p>每天首次上香额外赠送随机货币 ×{{ modules.shrineConfig.params.firstIncenseReward }}，记得每天来点第一炷香</p></div></div>
          <div class="g-item"><span class="g-ic">🀄</span><div><b>求签</b><p>消耗 {{ modules.shrineConfig.params.fortuneQiCost }} 点灵气抽一签；抽到上上签自动存入券包，每张可兑换 {{ modules.shrineConfig.params.couponValueGold }} 元宝</p></div></div>
          <div class="g-item"><span class="g-ic">🎋</span><div><b>心愿墙</b><p>写下祈愿挂在墙上（上限 {{ modules.shrineConfig.params.maxWishes }} 条），心愿会说给神明听，也会说给未来的自己听</p></div></div>
        </div>
      </div>
    </Overlay>

    <!-- toast -->
    <div class="toast" v-if="toastMsg">{{ toastMsg }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import BackButton from '@/components/navigation/BackButton.vue';
import CornerButton from '@/components/common/CornerButton.vue';
import Overlay from '@/components/common/Overlay.vue';
import { useModulesStore, useUserStore } from '@/stores/index';
import { vFeedback, audio } from '@/core/feedback';
import { usePageIntro } from '@/composables/usePageIntro';
import { useToast } from '@/composables/useToast';
import { useConfirm } from '@/composables/useConfirm';
import { useFloaters } from '@/composables/useFloaters';
const { pushFloater } = useFloaters();
import {
  seededPick, fmtBuffLeft,
} from '@/constants/shrine';
import type { IncenseType } from '@/types/index';

const modules = useModulesStore();
const user = useUserStore();
const { toastMsg, showToast } = useToast();

const COST_LABEL: Record<'gold' | 'pearl' | 'magic', string> = { gold: '元宝', pearl: '灵珠', magic: '魔丸' };
const CURRENCY_LABEL: Record<string, string> = { gold: '元宝', pearl: '灵珠', magic: '魔丸', jade: '天玑' };

/* ---------- 页面轻量入场（规范：usePageIntro 分区入场） ---------- */
usePageIntro({
  rootSelector: '.shrine-page',
  sections: [
    { selector: '.deity-card', y: 16, scale: 0.985, duration: 0.45 },
    { selector: '.grid-4 .g-cell', y: 12, duration: 0.34, stagger: 0.05 },
    { selector: '.almanac-card', y: 12, duration: 0.34 },
    { selector: '.wish-card', y: 12, duration: 0.34 },
  ],
});

/* ---------- 状态 ---------- */
const showGuide = ref(false);
const showIncenseSheet = ref(false);
const showWishSheet = ref(false);
const selectedType = ref<IncenseType>('incense_basic');
const pressing = ref(false);
const smoking = ref(false);   // 点燃成功后的烟雾动画
const fortune = ref<{ rank: string; text: string; emoji: string } | null>(null);
const wishText = ref('');

const shrine = computed(() => modules.shrine);
const deityMeta = computed(() => modules.shrineDeityMap[shrine.value.deity] ?? modules.shrineDeities[0]);

/** 选择神位：未解锁的高级神位给出条件提示 */
function onPickDeity(d: { id: string; name: string; emoji?: string; blessing?: string; unlock?: { desc: string } | null }) {
  if (!modules.isDeityUnlocked(d.id)) {
    showToast(`🔒 ${d.name}尚未感应到你的诚意：${d.unlock?.desc}`);
    return;
  }
  modules.setDeity(d.id);
  showToast(`${d.emoji} 已请${d.name}入座 · ${d.blessing}`);
}
const activeBuff = computed(() => modules.activeBuff);
const buffActive = computed(() => !!activeBuff.value.type && activeBuff.value.expireAt > nowTs.value);
const buffName = computed(() => activeBuff.value.type ? modules.shrineIncenseMap[activeBuff.value.type]?.name ?? '' : '');
const buffEmoji = computed(() => activeBuff.value.type ? modules.shrineIncenseMap[activeBuff.value.type]?.emoji ?? '🪔' : '🪔');
const haloStyle = computed(() => buffActive.value && activeBuff.value.type
  ? { background: `radial-gradient(circle, ${buffGlow.value} 0%, transparent 70%)` } : {});

/* 倒计时秒级刷新（Buff剩余时间） */
const nowTs = ref(Date.now());
let tickTimer: number | undefined;
onMounted(() => { tickTimer = window.setInterval(() => { nowTs.value = Date.now(); }, 1000); });
onUnmounted(() => { if (tickTimer) clearInterval(tickTimer); });
const buffLeft = computed(() => fmtBuffLeft(activeBuff.value.expireAt));

const buffGlow = computed(() => {
  const t = activeBuff.value.type;
  return t ? (modules.shrineIncenseMap[t]?.glow ?? '') : '';
});

/* 今日宜/忌（dayKey 稳定随机，当天不闪烁，数据来自 shrineConfig.almanac） */
const dayKey = new Date().toISOString().slice(0, 10);
const almanac = computed(() => modules.shrineConfig.almanac);
const todayYi = seededPick(almanac.value.yi, 'yi', dayKey);
const todayJi = seededPick(almanac.value.ji, 'ji', dayKey);
/** 今日宜 → 推荐神位（决策感/仪式感，与黄历稳定联动） */
const recommendDeity = computed(() => modules.shrineDeityMap[almanac.value.yiDeity[todayYi] ?? ''] ?? modules.shrineDeities[0]);

/* ---------- 上香 ---------- */
function openIncenseSheet() {
  selectedType.value = activeBuff.value.type ?? 'incense_basic';
  showIncenseSheet.value = true;
}
function closeIncenseSheet() {
  cancelPress();
  showIncenseSheet.value = false;
}

let pressTimer: number | undefined;
function startPress() {
  if (!selectedType.value) return;
  pressing.value = true;
  pressTimer = window.setTimeout(ignite, 3000); // 01-L50 长按3秒
}
function cancelPress() {
  pressing.value = false;
  if (pressTimer) { clearTimeout(pressTimer); pressTimer = undefined; }
}
async function ignite() {
  pressing.value = false;
  pressTimer = undefined;
  const cfg = modules.shrineIncenseMap[selectedType.value];
  if (!cfg) { showToast('该香品配置缺失'); return; }
  // 购买性质：点燃前二次确认，防误触（长按3秒仍可能被误触）
  const ok = await useConfirm().ask({
    title: '点燃这柱香？',
    message: `${cfg.emoji} ${cfg.name} · ${cfg.desc}${cfg.special ? `（${cfg.special}）` : ''}`,
    cost: { [cfg.cost.currency]: cfg.cost.amount, qi: modules.shrineConfig.params.incenseQiCost } as Partial<Record<'gold' | 'pearl' | 'magic' | 'qi', number>>,
  });
  if (!ok) return;
  const r = modules.lightIncense(selectedType.value);
  if (!r.ok) {
    const msg = r.reason === 'qi' ? '灵气不足 · 每5分钟恢复1点'
      : r.reason === 'currency' ? `${COST_LABEL[cfg.cost.currency]}不足`
      : '已有更强的神恩在身，先等它燃尽吧';
    showToast(msg);
    return;
  }
  // 成功：关sheet + 烟雾动画 + 反馈
  showIncenseSheet.value = false;
  smoking.value = true;
  window.setTimeout(() => { smoking.value = false; }, 3600);
  audio.play('success');
  // 来源处飘字：定位神位区（长按点燃无 event，用屏幕中上坐标），直观显示神恩加成
  pushFloater({ x: window.innerWidth / 2, y: window.innerHeight * 0.32, text: `神恩+${Math.round(modules.activeBuff.rate * 100)}%`, kind: 'mood', duration: 1400 });
  let msg = `${cfg.emoji} ${cfg.name}已燃 · 神恩+${Math.round(modules.activeBuff.rate * 100)}%`;
  if (r.deityGift) msg += ` · ${r.deityGift}`;
  if (r.firstReward) msg += ` · 头香奖励${CURRENCY_LABEL[r.firstReward]}×${modules.shrineConfig.params.firstIncenseReward}`;
  if (r.refunded) msg += ` · 灵珠已返还`;
  if (cfg.guaranteeTop) msg += ` ·得上上签×1`;
  showToast(msg);
}

/* ---------- 求签 / 兑签 ---------- */
function onDrawFortune() {
  const f = modules.drawFortune();
  if (!f) { audio.play('error'); showToast('灵气不足 10 点，稍作歇息再来'); return; }
  audio.play('pray');
  fortune.value = f;
}
function onRedeem() {
  if (shrine.value.coupons <= 0) { showToast('还没有上上签 · 求签或燃必得签的香可得'); return; }
  if (modules.redeemCoupon()) { audio.play('coin'); showToast(`🧧 上上签兑换成功 · 元宝+${modules.shrineConfig.params.couponValueGold}`); }
}

/* ---------- 心愿墙 ---------- */
function onAddWish() {
  if (!wishText.value.trim()) { showToast('先写下一句心愿吧'); return; }
  if (modules.addWish(wishText.value)) {
    wishText.value = '';
    showWishSheet.value = false;
    audio.play('soft');
    showToast('🎋 心愿已挂上心愿墙');
  }
}
function wishTime(ts: number): string {
  const d = new Date(ts);
  const m = d.getMonth() + 1, day = d.getDate();
  const hh = String(d.getHours()).padStart(2, '0'), mm = String(d.getMinutes()).padStart(2, '0');
  return `${m}/${day} ${hh}:${mm}`;
}
</script>

<style scoped>
.shrine-page { padding-top: 8px; }

.sub-nav { display: flex; align-items: center; justify-content: space-between; padding: 4px 2px 8px; }
.nav-title { font-size: 17px; font-weight: 700; color: var(--text-primary); letter-spacing: .5px; }

.page-body { display: flex; flex-direction: column; gap: 14px; padding-bottom: 24px; }
.card-glass { border-radius: var(--radius-card, 20px); padding: 16px; }
.sub-title { font-size: 12px; color: var(--text-muted); text-align: center; margin-bottom: 10px; }
.card-title { font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 10px; }

/* ============ 神位主卡 ============ */
.deity-card { display: flex; flex-direction: column; align-items: center; padding: 18px 16px 14px; position: relative; overflow: hidden; }
.deity-card.blessed { box-shadow: 0 0 24px rgba(200,170,255,.18) inset; }

.deity-stage { position: relative; width: 130px; height: 130px; display: grid; place-items: center; }
.deity-halo { position: absolute; inset: -22px; border-radius: 50%; transition: background .8s ease; }
.deity-emoji { font-size: 64px; position: relative; filter: drop-shadow(0 8px 18px rgba(201,190,244,.4)); }
.deity-emoji.floating { animation: deity-float 3.2s ease-in-out infinite; }
.deity-img { width: 92px; height: 92px; object-fit: contain; position: relative; filter: drop-shadow(0 8px 18px rgba(201,190,244,.4)); }
.deity-img.floating { animation: deity-float 3.2s ease-in-out infinite; }
.chip-img { width: 20px; height: 20px; object-fit: contain; filter: grayscale(.55); border-radius: 5px; }
.deity-chip.on .chip-img { filter: none; }
.deity-chip.locked .chip-img { filter: grayscale(1); }
.i-img { width: 24px; height: 24px; object-fit: contain; }
@keyframes deity-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-7px) } }

.smoke { position: absolute; bottom: 22px; width: 6px; height: 6px; border-radius: 50%;
  background: rgba(220,215,240,.8); filter: blur(2px);
  animation: smoke-rise 1.2s ease-out infinite; }
@keyframes smoke-rise {
  0% { transform: translateY(0) scale(1); opacity: .85 }
  100% { transform: translateY(-52px) scale(2.6); opacity: 0 }
}

.deity-name { font-size: 18px; font-weight: 700; color: var(--text-primary); margin-top: 8px; }
.deity-bless { font-size: 12px; color: var(--text-muted); margin-top: 3px; }

/* 神恩Buff条 */
.buff-bar { width: 100%; display: flex; align-items: center; gap: 10px;
  margin-top: 14px; padding: 10px 12px; border-radius: 14px;
  background: rgba(255,255,255,.45); border: 1px solid var(--border-light); }
.buff-bar.active { background: linear-gradient(90deg, rgba(230,215,255,.6), rgba(255,255,255,.5)); }
.b-ic { width: 34px; height: 34px; border-radius: 11px; background: var(--accent-soft, rgba(140,120,220,.14));
  display: grid; place-items: center; font-size: 17px; flex: 0 0 auto; }
.b-info { display: flex; flex-direction: column; gap: 1px; }
.b-info b { font-size: 12.5px; color: var(--text-primary); }
.b-info i { font-style: normal; font-size: 11px; color: var(--text-muted); }

/* 神位切换（8神位两行4列，高级神位锁定态） */
.deity-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; width: 100%; }
.deity-chip { width: calc(25% - 6px); display: flex; flex-direction: column; align-items: center; gap: 3px;
  padding: 8px 0; border-radius: 13px; border: 1px solid var(--border-light);
  background: rgba(255,255,255,.4); cursor: pointer; transition: all .15s ease; }
.deity-chip span { font-size: 20px; filter: grayscale(.55); transition: filter .15s ease; }
.deity-chip b { font-size: 11px; color: var(--text-secondary); font-weight: 600; }
.deity-chip.on { border-color: var(--accent, #8A80D8); background: var(--accent-soft, rgba(140,120,220,.14)); }
.deity-chip.on span { filter: none; }
.deity-chip.on b { color: var(--accent, #8A80D8); }
.deity-chip i { font-size: 9px; line-height: 1.3; color: var(--text-muted); font-style: normal; }
.deity-chip.locked { opacity: .55; }
.deity-chip.locked span { filter: grayscale(1); }

/* ============ 四宫格 ============ */
.grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.g-cell { display: flex; flex-direction: column; align-items: center; gap: 3px;
  padding: 12px 4px; border-radius: 16px; border: 1px solid var(--border-light);
  background: rgba(255,255,255,.45); cursor: pointer; transition: transform .12s ease, opacity .15s ease; }
.g-cell:active { transform: scale(.96); }
.g-cell.dim { opacity: .55; }
.g-ic { font-size: 24px; }
.g-cell b { font-size: 12.5px; font-weight: 700; color: var(--text-primary); }
.g-cell i { font-style: normal; font-size: 10px; color: var(--text-muted); }

/* ============ 今日宜忌 ============ */
.almanac-row { display: flex; gap: 10px; }
.al-item { flex: 1; display: flex; align-items: center; gap: 10px; padding: 12px;
  border-radius: 14px; background: rgba(255,255,255,.5); }
.al-item b { width: 30px; height: 30px; border-radius: 10px; display: grid; place-items: center;
  font-size: 14px; color: #fff; flex: 0 0 auto; }
.al-item.yi b { background: #7FB88A; }
.al-item.ji b { background: #D98C8C; }
.al-item span { font-size: 13px; color: var(--text-primary); font-weight: 600; }
.almanac-tip { margin: 10px 0 0; padding: 8px 12px; border-radius: 12px;
  background: linear-gradient(90deg, rgba(230,215,255,.5), rgba(255,255,255,.4));
  font-size: 12px; color: var(--text-secondary); text-align: center; }

/* ============ 心愿墙 ============ */
.wish-list { display: flex; flex-direction: column; gap: 8px; }
.wish-item { display: flex; align-items: center; gap: 8px; padding: 10px 12px;
  border-radius: 12px; background: rgba(255,255,255,.5); }
.w-knot { font-size: 15px; }
.wish-item p { flex: 1; font-size: 12.5px; color: var(--text-primary); margin: 0; }
.wish-item i { font-style: normal; font-size: 10px; color: var(--text-muted); white-space: nowrap; }
.wish-empty { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 22px 0; }
.wish-empty span { font-size: 34px; opacity: .6; }
.wish-empty p { font-size: 12px; color: var(--text-muted); margin: 0; }

/* ============ 上香 sheet ============ */
.incense-sheet { display: flex; flex-direction: column; gap: 12px; }
.incense-list { display: flex; flex-direction: column; gap: 8px; }
.incense-item { display: flex; gap: 10px; align-items: center; text-align: left;
  padding: 11px; border-radius: 14px; border: 1.5px solid transparent;
  background: rgba(255,255,255,.5); cursor: pointer; transition: border-color .15s ease; }
.incense-item.on { border-color: var(--accent, #8A80D8); background: var(--accent-soft, rgba(140,120,220,.12)); }
.i-ic { width: 40px; height: 40px; border-radius: 12px; background: rgba(255,255,255,.6);
  display: grid; place-items: center; font-size: 20px; flex: 0 0 auto; }
.i-info { display: flex; flex-direction: column; gap: 2px; }
.i-info b { font-size: 13px; color: var(--text-primary); }
.i-info s { text-decoration: none; font-size: 11px; color: var(--accent, #8A80D8); font-weight: 600; }
.i-info p { margin: 0; font-size: 11px; color: var(--text-muted); }
.i-info em { font-style: normal; font-size: 10.5px; color: #C99A45; }

.ignite-btn { position: relative; height: 46px; border-radius: 23px; border: 0; overflow: hidden;
  background: var(--accent, #8A80D8); color: #fff; font-size: 14px; font-weight: 600;
  cursor: pointer; transition: opacity .15s ease; touch-action: none; user-select: none;
  -webkit-user-select: none; }
.ignite-btn:disabled { opacity: .5; cursor: not-allowed; }
.ignite-fill { position: absolute; left: 0; top: 0; bottom: 0; width: 0;
  background: rgba(255,255,255,.28); transition: width 3s linear; }
.ignite-btn.holding .ignite-fill { width: 100%; }
.ignite-btn span { position: relative; }

.qi-hint { margin: 0; text-align: center; font-size: 11px; color: var(--text-muted); }

/* ============ 心愿 sheet ============ */
.wish-sheet { display: flex; flex-direction: column; gap: 12px; }
.wish-input { width: 100%; box-sizing: border-box; padding: 12px; border-radius: 14px;
  border: 1px solid var(--border-light); background: rgba(255,255,255,.6);
  font-size: 13px; color: var(--text-primary); resize: none; font-family: inherit; }
.wish-input:focus { outline: none; border-color: var(--accent, #8A80D8); }
.wish-submit { height: 44px; border-radius: 22px; border: 0; background: var(--accent, #8A80D8);
  color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; }
.wish-submit:active { transform: scale(.98); }

/* ============ 签文 modal ============ */
.fortune-card { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 6px 4px; }
.f-emoji { font-size: 46px; }
.f-rank { font-size: 17px; font-weight: 700; color: var(--text-primary); letter-spacing: 2px; }
.f-text { margin: 0; font-size: 13px; color: var(--text-secondary); line-height: 1.6; }
.f-note { margin: 2px 0 0; font-size: 11px; color: #C99A45; }

/* ============ 指南 ============ */
.guide-card { display: flex; flex-direction: column; gap: 12px; }
.g-head b { font-size: 16px; font-weight: 700; color: var(--text-primary); }
.g-body { display: flex; flex-direction: column; gap: 10px; }
.g-item { display: flex; gap: 10px; align-items: flex-start; padding: 10px; border-radius: 14px;
  background: rgba(255,255,255,.5); }
.g-ic { width: 34px; height: 34px; border-radius: 11px; background: var(--accent-soft, rgba(140,120,220,.14));
  display: grid; place-items: center; font-size: 16px; flex: 0 0 auto; }
.g-item b { display: block; font-size: 12.5px; color: var(--text-primary); }
.g-item p { margin: 2px 0 0; font-size: 11px; line-height: 1.5; color: var(--text-muted); }

/* toast */
.toast {
  position: fixed; left: 50%; bottom: 96px; transform: translateX(-50%);
  max-width: 82vw; padding: 10px 18px; border-radius: 14px;
  background: rgba(45, 62, 58, .88); color: #fff;
  font-size: 13px; line-height: 1.5; text-align: center;
  box-shadow: 0 8px 24px rgba(0, 0, 0, .18); z-index: var(--z-toast, 1100);
  animation: toastIn .3s ease;
}
@keyframes toastIn { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
</style>
