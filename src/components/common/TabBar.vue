<!-- src/components/common/TabBar.vue —— 底部导航栏 5Tab
     ⚠️  严格1:1复刻 stage0-skeleton-vD-GSAP.html （L381-L426 CSS  +  L597-L623 HTML  +  L897-L944 JS）
     ⚠️  SVG图标逐字复制（L598-L621）；下划线CSS用 scaleX(0.4)→1 transition（L410-L425）；GSAP弹跳按L922-L944
     ⚠️  违反规则 = 用户愤怒。逐字复制！禁止凭记忆重写！
-->
<template>
  <nav class="tabbar" :style="{ paddingBottom: safeAreaBottom + 'px' }">
    <button
      class="tab-item"
      :class="{ active: currentTab === tab.key }"
      v-for="tab in tabs"
      :key="tab.key"
      :ref="(el) => setTabRef(tab.key, el)"
      @click="switchTab(tab.key)"
      type="button"
    >
      <!-- ⚠️ SVG严格按方案D-GSAP L598~L621逐字复制（stroke-width 1.8 linecap/linejoin round）-->
      <svg v-html="tab.iconSvg" viewBox="0 0 24 24" width="24" height="24"></svg>
      <!-- L410-L425: 12px×2px圆角线，默认透明+scaleX(0.4)，active过渡到紫色+scaleX(1) -->
      <i class="tab-underline"></i>
      <span>{{ tab.label }}</span>
    </button>
    <!-- L430-L436: Home指示器（iPhone底部横条）-->
    <div class="home-ind" v-if="showHomeInd"></div>
  </nav>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, shallowRef } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useUiStore } from '@/stores/index';
import { audio, haptic } from '@/core/feedback';
import type { TabKey } from '@/types/index';

const router = useRouter();
const route = useRoute();
const uiStore = useUiStore();

interface TabDef {
  key: TabKey;
  label: string;
  iconSvg: string; // 严格按方案D-GSAP L598-L621的SVG内部path（不含外层<svg>标签，因为模板已用<svg>包一层）
}

/* ================================================================
   ⚠️  5Tab SVG 逐字复制方案D-GSAP L597~L622（禁止凭记忆重写！）
   每个tab.iconSvg只写SVG内部元素，外层<svg>在模板里统一渲染（加width=24/height=24/viewBox）
================================================================ */
const tabs = ref<TabDef[]>([
  // 首页 L598-L602: <path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/>
  {
    key: 'home',
    label: '首页',
    iconSvg: `<path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/>`,
  },
  // 灵植 L603-L607: <path d="M12 22c6-7 9-11 9-15A9 9 0 0 0 3 7c0 4 3 8 9 15z"/><path d="M12 22V11"/>
  {
    key: 'farm',
    label: '灵植',
    iconSvg: `<path d="M12 22c6-7 9-11 9-15A9 9 0 0 0 3 7c0 4 3 8 9 15z"/><path d="M12 22V11"/>`,
  },
  // 天籁 L608-L612: <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
  {
    key: 'music',
    label: '天籁',
    iconSvg: `<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>`,
  },
  // 仙宠 L613-L617: <circle cx="5" cy="10" r="1.2"/><circle cx="19" cy="10" r="1.2"/><path d="M12 22c3-3 6-5 6-9a6 6 0 0 0-12 0c0 4 3 6 6 9z"/>
  {
    key: 'pet',
    label: '仙宠',
    iconSvg: `<circle cx="5" cy="10" r="1.2"/><circle cx="19" cy="10" r="1.2"/><path d="M12 22c3-3 6-5 6-9a6 6 0 0 0-12 0c0 4 3 6 6 9z"/>`,
  },
  // 我的 L618-L622: <circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><circle cx="9" cy="10" r="1"/><circle cx="15" cy="10" r="1"/>
  {
    key: 'me',
    label: '我的',
    iconSvg: `<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><circle cx="9" cy="10" r="1"/><circle cx="15" cy="10" r="1"/>`,
  },
]);

/* ---------- refs & computed ---------- */
const currentTab = computed<TabKey>(() => uiStore.currentTabKey);
const safeAreaBottom = ref(0);
const showHomeInd = ref(false); // 真实手机环境下通常系统自带，这里默认关闭；预览版可开
const tabRefs = shallowRef<Record<string, HTMLElement | null>>({});
function setTabRef(k: string, el: any) {
  if (el) tabRefs.value[k] = el;
}

/* ================================================================
   首入轻提示（设计稿 docs/onboarding-design.md §四）：
   首次进入首页后，按顺序对「仙宠 → 灵植 → 天籁」做一次性脉冲，引导视线。
   - 标志位 cc_tabhint_done；已标记则不再打扰
   - 只动 tab 内部 SVG 的 scale（不碰 tab-item 的 color/y/scale，避免与下方切换动画冲突）
   - 用户一旦点了任意 Tab 立即停止并置位，尊重主动操作
================================================================ */
const TABHINT_KEY = 'cc_tabhint_done';
const TABHINT_ORDER: TabKey[] = ['pet', 'farm', 'music'];
let hintTl: any = null;
let hintTimer: number | undefined;

function markTabHintDone() {
  try { localStorage.setItem(TABHINT_KEY, '1'); } catch (_e) {}
}
function stopTabHint() {
  try { hintTl?.kill(); } catch (_e) {}
  hintTl = null;
  window.clearTimeout(hintTimer);
  markTabHintDone();
}
function runTabHint() {
  try {
    if (localStorage.getItem(TABHINT_KEY)) return;
    const g = (window as any).gsap;
    const els = TABHINT_ORDER.map((k) => tabRefs.value[k]?.querySelector('svg')).filter(Boolean) as SVGElement[];
    if (!els.length) { markTabHintDone(); return; }
    if (!g) { markTabHintDone(); return; } // 无 GSAP 则不强撑动画，直接标记完成
    hintTl = g.timeline({ onComplete: markTabHintDone });
    els.forEach((el, i) => {
      hintTl.fromTo(
        el,
        { scale: 1 },
        { scale: 1.22, duration: 0.26, ease: 'power2.out', yoyo: true, repeat: 1 },
        i * 0.5,
      );
    });
  } catch (_e) {
    markTabHintDone();
  }
}

/* ---------- safeAreaBottom读取（实际真机下才有值）---------- */
onMounted(() => {
  const env =
    getComputedStyle(document.documentElement)
      .getPropertyValue('--safe-bottom')
      .replace('px', '') ||
    (getComputedStyle(document.documentElement) as any)['padding-bottom']?.replace('px', '') ||
    '0';
  safeAreaBottom.value = env ? parseInt(env, 10) : 0;
  // 延后 0.8s：避开入场动画与首屏渲染，让脉冲更容易被注意到
  hintTimer = window.setTimeout(runTabHint, 800);
});

/* ================================================================
   ⚠️  Tab切换：GSAP弹性弹跳（严格按方案D-GSAP L922~L944行为）
   1) 相同tab重复点击 → 给个bounce.out小弹跳 y:-2→0
   2) 不同tab切换  → 旧tab回归#9699A8+y:0；新tab #8A80D8+y:-4 elastic.out(1,0.75) + scale 0.92→1 elastic.out(1,0.7)
================================================================ */
function switchTab(key: TabKey) {
  audio.play('click');
  haptic.play('light');
  // 用户主动点了 Tab → 首入提示立即收尾，不再打扰
  stopTabHint();
  const g = (window as any).gsap;
  const prev = currentTab.value;
  const prevEl = tabRefs.value[prev] || null;
  const nextEl = tabRefs.value[key] || null;

  if (prev === key) {
    // 重复点击 → 小弹跳（L928~L930）
    if (g && nextEl) {
      try { g.fromTo(nextEl, { y: -2 }, { y: 0, duration: 0.3, ease: 'bounce.out' }); } catch(_e) {}
    }
    return;
  }

  uiStore.setCurrentTab(key);
  router.push(`/app/${key}`);

  if (!g) return;
  // 旧tab → 回归非激活色 y=0（L933~L935）
  if (prevEl) {
    try {
      g.to(prevEl, { color: '#9699A8', y: 0, duration: 0.25, ease: 'power2.out' });
    } catch(_e) {}
  }
  // 新tab → 激活紫 + y:-4 弹性上弹 + scale 0.92→1（L937~L943）
  if (nextEl) {
    try {
      g.to(nextEl, {
        color: '#8A80D8',
        y: -4,
        duration: 0.45,
        ease: 'elastic.out(1, 0.75)',
      });
      g.fromTo(nextEl, { scale: 0.92 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.7)' });
    } catch(_e) {}
  }
}

/* ---------- 卸载时清理当前tab的内联y/scale（避免下次进入样式被破坏）---------- */
onBeforeUnmount(() => {
  const g = (window as any).gsap;
  stopTabHint(); // 清定时器 + kill 脉冲时间轴
  if (!g) return;
  try {
    Object.values(tabRefs.value).forEach((el) => {
      if (!el) return;
      try { g.killTweensOf(el, true); } catch(_e) {}
      try { g.set(el, { clearProps: 'transform,color,scale,y,x' }); } catch(_e) {}
    });
  } catch(_e) {}
});
</script>

<!--
  ⚠️  CSS 严格1:1复制 stage0-skeleton-vD-GSAP.html L381~L426
  ⚠️  每个选择器/属性名/值/单位/小数点 逐字复制
  ⚠️  微调：把tabbar的 position:absolute → relative（因AppLayout是flex column，TabBar在布局流中而非浮层）
  ⚠️  微调：去掉 tabbar 内部圆角 border-radius 0 0 46px 46px（那是预览app外壳机模框的内圆角，真实app不需要）
-->
<style scoped>
.tabbar {
  /* L382-L393：position:absolute → relative（流式布局，非机模浮层）；其余值逐字保留 */
  position: relative;
  left: 0; right: 0; bottom: 0;
  width: 100%;
  height: 92px;
  /* 底部安全区：抬升 tab 项避开地址栏/Home 指示条（border-box 不撑高）*/
  padding-bottom: env(safe-area-inset-bottom, 0px);
  display: flex;
  background: rgba(248,249,252,.72);
  backdrop-filter: blur(25px) saturate(160%);
  -webkit-backdrop-filter: blur(25px) saturate(160%);
  border-top: 1px solid rgba(255,255,255,.55);
  /* border-radius: 0 0 46px 46px; — 真机不需要机模内圆角 */
  z-index: var(--z-tabbar, 100);
}
.tab-item {
  flex: 1;
  border: 0; background: transparent;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 3px;
  color: #9699A8;
  cursor: pointer;
  padding-bottom: 8px;
  transform-origin: center center;
  will-change: transform, color;
}
/* L405-L409：SVG容器，stroke用currentColor继承tab-item激活色 */
.tab-item svg {
  width: 24px; height: 24px;
  stroke: currentColor;
  fill: none; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round;
}
/* L410-L425：12px×2px圆角下划线；非激活=透明+scaleX(0.4)；激活=紫色+scaleX(1)；200~280ms平滑过渡 */
.tab-underline {
  display: block;
  width: 12px;
  height: 2px;
  border-radius: 999px;
  background: transparent;
  transition: background 0.28s ease, transform 0.28s ease, opacity 0.28s ease;
  transform: scaleX(0.4);
  opacity: 0;
  will-change: transform, opacity;
}
.tab-item.active .tab-underline {
  background: #8A80D8;
  transform: scaleX(1);
  opacity: 1;
}
.tab-item span { font-size: 10px; font-weight: 500; }
.tab-item.active {
  color: #8A80D8;
}
/* L430~L436：底部Home横条（iPhone Home Indicator）*/
.home-ind {
  position: absolute;
  left: 50%; bottom: 8px; transform: translateX(-50%);
  width: 134px; height: 5px;
  background: #1a1a1f; border-radius: 999px;
  z-index: 501; opacity: 0.7;
}
</style>
