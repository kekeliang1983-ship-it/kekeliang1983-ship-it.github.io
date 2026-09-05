<!--
  src/views/farm/FarmPage.vue —— 灵植（种植系统）主页面
  数据驱动：modulesStore.plots / unlockedPlots / useUserStore 货币·灵气·心境·等级
  机制对齐策划：01-全局规则 / 02-全局核心常量 / 03-API / 05-核心代码 / 08-模拟后端
  交互（方案A）：地块可点选 -> 成长卡联动；浇水/收获/播种作用于选中格；成熟格"点我收获"
  注：TabBar 由 AppLayout 全局注入，资源条由 ResourceHud 全局提供
-->
<template>
  <div class="farm-page">

    <!-- ============ 品牌区（种子 + 拜访 双入口） ============ -->
    <header class="topbar">
      <div class="brand">
        <h1>灵植</h1>
        <p>{{ subtitle }}</p>
      </div>
      <div class="actions">
        <CornerButton label="种子" @click="openSeed">
          <svg viewBox="0 0 24 24"><path d="M12 20s-7-4.2-7-9.3C5 7.6 7 6 9.2 6c1.2 0 2.3.6 2.8 1.5C12.5 6.6 13.6 6 14.8 6 17 6 19 7.6 19 10.7 19 15.8 12 20 12 20Z"/></svg>
        </CornerButton>
        <CornerButton label="拜访" :badge="pendingVisits > 0" @click="openVisit">
          <svg viewBox="0 0 24 24"><path d="M5 9c0-3 2.7-5 7-5s7 2 7 5v7a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V9Z"/><path d="M9 9V7m6 2V7M8 13h.01M16 13h.01"/></svg>
        </CornerButton>
        <CornerButton label="图鉴" @click="openCodex">
          <svg viewBox="0 0 24 24"><path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Zm4 4h8M8 13h8M8 17h5"/></svg>
        </CornerButton>
        <CornerButton label="风水" @click="openFengshui">
          <svg viewBox="0 0 24 24"><path d="M12 3l9 16H3L12 3Z"/></svg>
        </CornerButton>
      </div>
    </header>

    <!-- ============ 今日天象（每日随机，小额产出加成） ============ -->
    <div class="weather-bar" v-if="todayWeather">
      <span class="w-icon">{{ todayWeather.icon }}</span>
      <span class="w-text">今日天象 · {{ todayWeather.name }}｜{{ todayWeather.desc }}</span>
    </div>

    <!-- ============ 灵田繁荣度（每次收获 +1；满 100 产出 +20%） ============ -->
    <div class="prosperity-bar" v-if="modules.farmProsperity > 0">
      <span class="p-label">🌿 繁荣</span>
      <div class="p-track">
        <i class="p-fill" :style="{ width: (modules.farmProsperity / PROSPERITY_MAX * 100) + '%' }"></i>
        <span class="p-tier" v-for="t in PROSPERITY_TIERS" :key="t" :style="{ left: (t / PROSPERITY_MAX * 100) + '%' }"></span>
      </div>
      <span class="p-count">{{ modules.farmProsperity }}/{{ PROSPERITY_MAX }}</span>
    </div>

    <!-- ============ 生态缸（选中地块作物可视化） ============ -->
    <section class="garden">
      <div class="terrarium" :style="{ '--g': growthRatio }">
        <div class="water-shadow"></div>
        <div class="glass-tank"></div>
        <div class="soil"></div>
        <div class="rock r1"></div><div class="rock r2"></div><div class="rock r3"></div>
        <div class="stem main"></div>
        <div class="leaf l1"></div><div class="leaf l2"></div><div class="leaf l3"></div><div class="leaf l4"></div>
        <div class="flower-head"></div>
        <i class="glow gl1"></i><i class="glow gl2"></i><i class="glow gl3"></i>
      </div>
    </section>

    <!-- ============ 成长状态卡（跟随选中地块） ============ -->
    <section class="card card-glass growth-card" v-if="selectedPlot && selectedPlot.status !== 'idle'">
      <div class="growth-head">
        <div class="c-title">{{ cropName(selectedPlot) }} <span>{{ elementLabel(selectedPlot.element) }}·{{ qualityLabel(selectedPlot.seedType) }} · 种植等级 Lv.{{ user.level }}</span></div>
        <div class="head-pills">
          <span class="pill combo-pill" v-if="modules.harvestCombo > 1">🔥 连击 ×{{ modules.harvestCombo }}</span>
          <span class="pill" :class="{ ready: selectedPlot.status === 'ready' }">{{ selectedPlot.status === 'ready' ? '可收获' : '生长中' }}</span>
        </div>
      </div>
      <div class="c-sub">浇水可减半生长时间（今日免费 {{ 3 - modules.dailyLimits.freeWaterUsed }}/3，付费 {{ 3 - modules.dailyLimits.paidWaterUsed }}/3·每次 10 灵珠）</div>
      <div class="progress-row">
        <div class="bar"><i :style="{ width: progressPct(selectedPlot) + '%' }"></i></div>
        <span class="c-count">{{ progressPct(selectedPlot) }}%</span>
      </div>
      <div class="growth-foot">
        <div class="c-eta">{{ selectedPlot.status === 'ready' ? '已成熟，点击下方按钮收获' : '预计 ' + fmtEta(selectedPlot) + ' 后成熟' }}</div>
        <button class="water-btn" v-feedback="'BUTTON_CLICK'" @click="selectedPlot.status === 'ready' ? onHarvest(selectedPlot, $event) : onWater(selectedPlot, $event)">{{ selectedPlot.status === 'ready' ? '收获' : '浇水' }}</button>
      </div>
    </section>
    <section class="card card-glass growth-card" v-else-if="selectedPlot">
      <div class="c-sub" style="padding:6px 0">这块{{ elementLabel(selectedPlot.element) }}地还空着，点右上角「种子」播种吧</div>
    </section>

    <!-- ============ 我的土地（5 块，五行柔色；可点选 / 成熟收获 / 锁定提示扩建） ============ -->
    <section class="card card-glass">
      <div class="land-head">
        <div class="c-title">我的土地</div>
        <button class="expand-btn" v-feedback="'BUTTON_CLICK'" @click="onExpand">扩建 ›</button>
      </div>
      <div class="slots">
        <div
          v-for="(plot, idx) in modules.plots"
          :key="plot.plotId"
          :class="['slot', elementClass(plot.element), {
            active: idx < modules.unlockedPlots,
            locked: idx >= modules.unlockedPlots,
            selected: idx === selectedIdx && idx < modules.unlockedPlots,
          }]"
          @click="onPlotClick(idx)"
        >
          <span class="attr">{{ elementLabel(plot.element) }}</span>
          <span class="feng-badge" v-if="modules.formationBonus(plot.element) > 0" title="风水阵加成">⛩️</span>
          <template v-if="idx < modules.unlockedPlots">
            <div class="crop" v-if="plot.status === 'ready'">
              {{ cropName(plot) }}<small class="pulse">点我收获</small>
            </div>
            <div class="crop" v-else-if="plot.status === 'growing'">
              {{ cropName(plot) }}<small>生长中 {{ fmtEta(plot) }}</small>
            </div>
            <div class="crop" v-else><small>可播种</small></div>
            <div class="fert-wrap" title="地力（轮作提升·连作下降）">
              <i class="fert" :class="{ low: plot.fertility < FERTILITY_START }" :style="{ width: plot.fertility + '%' }"></i>
            </div>
          </template>
          <template v-else>
            <svg class="lock" viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
            <span class="cost">解锁 <b>{{ expandPrice(idx) }}</b></span>
          </template>
        </div>
      </div>
    </section>

    <!-- ============ 天降福缘 toast（收获时 5% 触发，+30元宝 +5灵珠） ============ -->
    <div class="toast" v-if="toastMsg">{{ toastMsg }} <span class="x" @click="hideToast">✕</span></div>

    <!-- ============ 调试：重播入场动画（生产自动移除，预览保留） ============ -->
    <button
      v-if="IS_PREVIEW"
      class="debug-replay-btn"
      aria-label="重播入场动画"
      v-feedback="'BUTTON_CLICK'"
      @click="pageIntro.replay()"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="23 4 23 10 17 10"/>
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
      </svg>
    </button>

    <!-- ============ 种子 sheet ============ -->
    <Overlay variant="sheet" :open="seedOpen" @close="seedOpen = false">
      <h3 class="sheet-title">选择种子</h3>
      <p class="hint">播种消耗 5 灵气 · 属性由地块决定 · 心境&gt;80 触发 ×1.15 产出</p>
      <div class="seed" v-for="s in seeds" :key="s.q">
        <div class="tag" :class="s.cls">{{ s.label }}</div>
        <div class="meta"><b>{{ s.name }}</b><p>{{ s.desc }}</p></div>
        <button class="plant" v-feedback="'BUTTON_CLICK'" @click="onPlant(s)">种植</button>
      </div>
    </Overlay>

    <!-- ============ 拜访（邻圃）sheet ============ -->
    <Overlay variant="sheet" :open="visitOpen" @close="visitOpen = false">
      <h3 class="sheet-title">邻圃 · 友友 <span class="online-tag">联机后开启</span></h3>
      <p class="hint">拜访好友菜地借走成熟作物（主人若在线守护将少借 50%）· 当前为预览，联机版本上线后可真实借产</p>
      <div class="visit-list">
        <div class="friend" v-for="f in friends" :key="f.id">
          <div class="ava">{{ f.emoji }}</div>
          <div class="info"><b>{{ f.name }}</b><p>{{ visitDesc(f) }}</p></div>
          <button
            class="btn"
            v-feedback="'BUTTON_CLICK'"
            :disabled="f.disabled || modules.hasVisitedToday(f.id)"
            @click="onVisit(f)"
          >{{ f.disabled ? '未熟' : (modules.hasVisitedToday(f.id) ? '已拜访' : '拜访') }}</button>
        </div>
      </div>
    </Overlay>

    <!-- ============ 种子图鉴 sheet ============ -->
    <Overlay variant="sheet" :open="codexOpen" @close="codexOpen = false">
      <h3 class="sheet-title">种子图鉴 <span class="online-tag">{{ codexSeenCount }}/15</span></h3>
      <p class="hint">收获过对应「元素·品质」作物即可收录 · 同元素集齐 3 品质，该属性收获 +5%</p>
      <div class="codex-grid">
        <div class="codex-cell" v-for="c in codexGrid" :key="c.id" :class="['codex-cell-'+c.el, { seen: c.seen }]">
          <span class="cx-emoji">{{ c.seen ? c.emoji : '❔' }}</span>
          <span class="cx-name">{{ c.seen ? c.name : '未收录' }}</span>
          <span class="cx-tag">{{ FARM_ELEMENT_LABEL[c.el] }}·{{ FARM_QUALITY_LABEL[c.q] }}</span>
        </div>
      </div>
    </Overlay>

    <!-- ============ 五行风水阵 sheet ============ -->
    <Overlay variant="sheet" :open="fengOpen" @close="fengOpen = false">
      <h3 class="sheet-title">⛩️ 五行风水阵</h3>
      <p class="hint">每日自选一个「主生属性」：该属性作物收获 +12%，其相生属性 +6%（每日可改）。当前主生：<b>{{ fengMainLabel }}</b></p>
      <div class="feng-grid">
        <button
          class="feng-cell"
          v-for="el in FARM_ELEMENTS"
          :key="el"
          :class="['el-'+el, { on: modules.farmFormation === el }]"
          v-feedback="'BUTTON_CLICK'"
          @click="setFormation(el)"
        >
          <span class="fx-el">{{ FARM_ELEMENT_LABEL[el] }}</span>
          <span class="fx-sub">主生 +12%</span>
          <span class="fx-eng" v-if="FIVE_ENGENDER[el]">生 {{ FARM_ELEMENT_LABEL[FIVE_ENGENDER[el]] }} +6%</span>
        </button>
      </div>
    </Overlay>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'Farm' });
import { ref, computed, onMounted, onUnmounted, onActivated, onDeactivated } from 'vue';
import { useUserStore, useModulesStore } from '@/stores/index';
import { vFeedback, audio } from '@/core/feedback';
import type { IPlot, ElementType, SeedQuality, CropId } from '@/types/index';

import CornerButton from '@/components/common/CornerButton.vue';
import Overlay from '@/components/common/Overlay.vue';
import { usePageIntro } from '@/composables/usePageIntro';
import { useToast } from '@/composables/useToast';
import { useConfirm } from '@/composables/useConfirm';
import { visitService } from '@/services/visitService';
import { useFloaters } from '@/composables/useFloaters';
const { pushFloater, rectCenter } = useFloaters();

const user = useUserStore();
const modules = useModulesStore();
const { ask: askConfirm } = useConfirm();

/* ---------- 灵田配置：全部读 farmConfig（后台 farm.json 覆盖，App 实时生效） ----------
 * 命名沿用原常量名，模板可直接引用（computed 自动解包）；script 内需 .value。 */
const cfg = computed(() => modules.farmConfig);
const CURRENCY_LABEL = computed(() => cfg.value.currencyLabel);
const FARM_ELEMENTS = computed(() => modules.farmElements);
const FARM_QUALITIES = computed(() => modules.farmQualities);
const FARM_ELEMENT_LABEL = computed(() => modules.farmElementLabelMap as Record<string, string>);
const FARM_QUALITY_LABEL = computed(() => modules.farmQualityLabelMap as Record<string, string>);
const FIVE_ENGENDER = computed(() => cfg.value.fiveEngender);
const ELEMENT_BONUS = computed(() => cfg.value.elementBonus);
const CROPS = computed(() => modules.farmCropMap);
const SEED_CONFIG = computed(() => modules.farmSeedConfig);
/** 招财铃碎片掉率（品质越高越易得；原内联常量，现可后台调） */
const BELL_FRAG_CHANCE = computed(() => cfg.value.bellFragChance as Record<string, number>);
/** 付费浇水每日上限（原内联常量，现可后台调） */
const PAID_WATER_DAILY_LIMIT = computed(() => cfg.value.paidWaterDailyLimit);
const FERTILITY_MAX = computed(() => cfg.value.fertility.max);
const FERTILITY_START = computed(() => cfg.value.fertility.start);
const FERTILITY_ROTATE_GAIN = computed(() => cfg.value.fertility.rotateGain);
const FERTILITY_REPEAT_PENALTY = computed(() => cfg.value.fertility.repeatPenalty);
const FERTILITY_YIELD_COEF = computed(() => cfg.value.fertility.yieldCoef);
const ROTATE_REPEAT_YIELD_PENALTY = computed(() => cfg.value.fertility.repeatYieldPenalty);
const PROSPERITY_MAX = computed(() => cfg.value.prosperity.max);
const PROSPERITY_PER_HARVEST = computed(() => cfg.value.prosperity.perHarvest);
const PROSPERITY_RARE_BONUS = computed(() => cfg.value.prosperity.rareBonus);
const PROSPERITY_YIELD_COEF = computed(() => cfg.value.prosperity.yieldCoef);
const PROSPERITY_TIERS = computed(() => cfg.value.prosperity.tiers);
const COMBO_WINDOW_MS = computed(() => cfg.value.combo.windowMs);
const COMBO_PER_STEP = computed(() => cfg.value.combo.perStep);
const COMBO_CAP = computed(() => cfg.value.combo.cap);
/** 取作物定义（按元素 + 品质） */
function cropOf(element: string, quality: string) {
  return modules.farmCropOf(element, quality);
}

/* ---------- 页面轻量入场动画（usePageIntro：入场 expo.out/back.out + 光点浮动循环，总观感 ~0.55s） ---------- */
const IS_PREVIEW = import.meta.env.MODE !== 'production';
const pageIntro = usePageIntro({
  rootSelector: '.farm-page',
  sections: [
    { selector: '.topbar', y: 14, duration: 0.38 },
    { selector: '.garden', y: 16, scale: 0.985, duration: 0.45 },
    { selector: '.growth-card', y: 16, duration: 0.4 },
    { selector: '.land-head', y: 10, duration: 0.35 },
    // 地块只做 y+淡入（省电：scale+渐变背景重绘成本高，已去掉）
    { selector: '.slots .slot', y: 14, duration: 0.36, stagger: 0.1 },
  ],
  // 循环只保留光点浮动（轻；flower-head 的 conic-gradient+drop-shadow 旋转重绘最耗电，已移除）
  loops: [
    { selector: '.glow', y: -4, duration: 2.8 },
  ],
});

/* ---------- 常量 ---------- */
const EXPAND_PRICES = [100, 200, 400, 800]; // 扩建价（已拍板：等比递增，第4块=800）

/* ---------- 趣味彩蛋（第1批）：作物变异 / 收获奇遇 / 每日天时 —— 全部读 farmConfig（后台可调） ---------- */
// 每日天象：按日期稳定随机（当天不变，隔天可能变），提供小额全局产出乘子
interface WeatherCfg { key: string; icon: string; name: string; desc: string; bonus: number; jadeExtra: number; }
const WEATHERS = computed<WeatherCfg[]>(() => (cfg.value.weathers || []) as WeatherCfg[]);
function getTodayWeather(): WeatherCfg {
  const list = WEATHERS.value;
  if (!list.length) return { key: 'none', icon: '☀️', name: '晴', desc: '', bonus: 0, jadeExtra: 0 };
  const d = new Date().toDateString();
  let h = 0; for (const ch of d) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}

// 作物变异：收获时小概率变异（零新资源）。gold=产量翻倍 / ice=额外灵珠 / twin=多收一份基础产出
type VariantKey = 'gold' | 'ice' | 'twin';
const VARIANT_RATE = computed<Record<string, number>>(() => {
  const out: Record<string, number> = {};
  for (const v of cfg.value.variants || []) out[v.key] = v.rate;
  return out;
});
const VARIANT_LABEL = computed<Record<string, string>>(() => {
  const out: Record<string, string> = {};
  for (const v of cfg.value.variants || []) out[v.key] = v.label;
  return out;
});

// 收获奇遇（趣味化包装策划"福缘"）：随机事件池，每种小额奖励 + 专属文案
interface LuckEvent { emoji: string; text: string; gold: number; pearl: number; magic: number; }
const LUCKY_EVENTS = computed<LuckEvent[]>(() => (cfg.value.luckyEvents || []) as LuckEvent[]);
const LUCKY_RATE = computed(() => cfg.value.luckyRate);

/* ---------- 本地状态 ---------- */
const selectedIdx = ref(0); // 当前选中地块
const seedOpen = ref(false);
const visitOpen = ref(false);
const codexOpen = ref(false);  // 种子图鉴 sheet
const fengOpen = ref(false);   // 五行风水阵 sheet
// 福缘 toast（收获时5%触发，手动✕关闭，不自动消失）
const { toastMsg, showToast, hideToast } = useToast();

/** 种子卡片：全部由 farmConfig 派生（后台改价目/产出/成长时间，卡片文案自动跟着变） */
const seeds = computed(() => {
  const sc = SEED_CONFIG.value;
  const meta: Array<{ q: SeedQuality; label: string; cls: string }> = [
    { q: 'common', label: '凡', cls: 'fan' },
    { q: 'uncommon', label: '灵', cls: 'ling' },
    { q: 'rare', label: '仙', cls: 'xian' },
  ];
  return meta.map((m) => {
    const s = sc[m.q];
    const name = `${FARM_QUALITY_LABEL.value[m.q] ?? m.label}种子`;
    if (!s) return { ...m, name, desc: '—' };
    const costTxt = Object.entries(s.cost || {}).map(([k, v]) => `${v} ${CURRENCY_LABEL.value[k] ?? k}`).join(' + ') || '免费';
    const min = Math.round(s.growSec / 60);
    const growTxt = min >= 60 ? `${Math.floor(min / 60)} 小时${min % 60 ? ` ${min % 60} 分` : ''}` : `${min} 分钟`;
    const out = [
      `${s.base.gold} 元宝`,
      `${s.base.pearl} 灵珠`,
      s.base.magic ? `${s.base.magic} 魔丸` : '',
      s.jadeChance ? `${Math.round(s.jadeChance * 100)}% 天玑` : '',
    ].filter(Boolean).join(' + ');
    return { ...m, name, desc: `消耗 ${costTxt} · 生长 ${growTxt}\n产出 ${out}` };
  });
});

const friends = ref([
  { id: 1, emoji: '🦊', name: '小狐仙的菜地', level: 3, disabled: false },
  { id: 2, emoji: '🐰', name: '兔子的菜地', level: 6, disabled: false },
  { id: 3, emoji: '🐻', name: '熊大的菜地', level: 1, disabled: true },
]);

/* ---------- 计算属性 ---------- */
const pendingVisits = computed(() => friends.value.filter((f) => !f.disabled && !modules.hasVisitedToday(f.id)).length);
const subtitle = computed(() => {
  const total = modules.plots.length;
  const mature = modules.plots.filter((p) => p.status === 'ready').length;
  return `${total}块地 / ${mature}成熟`;
});
const selectedPlot = computed<IPlot | null>(() => {
  const p = modules.plots[selectedIdx.value];
  return p && selectedIdx.value < modules.unlockedPlots ? p : null;
});
const growthRatio = computed(() => {
  const p = selectedPlot.value;
  if (!p || !p.growDurationSeconds || p.status === 'idle') return 0;
  return Math.min(1, Math.max(0, 1 - p.remainingSeconds / p.growDurationSeconds));
});
const todayWeather = computed<WeatherCfg>(() => getTodayWeather());

/* ---------- 灵植彩蛋第2/3批：图鉴 / 风水阵 展示数据 ---------- */
// 种子图鉴网格：5 元素 × 3 品质，按 seedSeen 判定已收录
const codexGrid = computed(() => FARM_ELEMENTS.value.flatMap((el) => FARM_QUALITIES.value.map((q) => {
  const id = `${el}-${q}` as CropId;
  const def = CROPS.value[id];
  return { id, el, q, name: def?.name ?? '—', emoji: def?.emoji ?? '🌱', seen: modules.seedSeen.includes(id) };
})));
const codexSeenCount = computed(() => modules.seedSeen.length);
const fengMainLabel = computed(() => {
  const f = modules.farmFormation;
  return f ? FARM_ELEMENT_LABEL.value[f] : '未设';
});

/* ---------- 等级抗借（策划01-L44：等级越高，访客可借走比例越低，下限5%） ---------- */
/* 基础可借 15%，每级减 1%，下限 5% —— 返回百分数（15~5） */
function borrowablePct(ownerLevel: number): number {
  return Math.max(5, 15 - (ownerLevel - 1));
}
function visitDesc(f: { level: number; disabled: boolean }): string {
  if (f.disabled) return '尚未成熟，暂无可借';
  return `作物已成熟，拜访可借走约 ${borrowablePct(f.level)}% 产量`;
}

/* ---------- 工具方法 ---------- */
function elementLabel(el: ElementType) { return FARM_ELEMENT_LABEL.value[el] ?? el; }
function elementClass(el: ElementType) { return el; }
function qualityLabel(q: SeedQuality | null) { return q ? (FARM_QUALITY_LABEL.value[q] ?? q) : '—'; }
function cropName(p: IPlot) { return cropOf(p.element, p.seedType ?? 'common')?.name ?? '—'; }
function progressPct(p: IPlot) {
  if (!p.growDurationSeconds) return 0;
  return Math.round((1 - p.remainingSeconds / p.growDurationSeconds) * 100);
}
function fmtEta(p: IPlot) {
  // remainingSeconds 为浮点（计时按真实 dt 递减累积），向上取整避免 56.999… 之类小数；倒计时语义用 ceil（至少还需）
  const s = Math.max(0, Math.ceil(p.remainingSeconds));
  const m = Math.floor(s / 60), sec = s % 60;
  return m > 0 ? `${m}分${sec}秒` : `${sec}秒`;
}
// 解锁第 N 块地（idx 为地块 0 基序号）的价 = EXPAND_PRICES[N-1]
// 例：默认已解锁第1块(idx0)，首扩解锁第2块(idx1)用 EXPAND_PRICES[0]=100，末块(idx4)用 EXPAND_PRICES[3]=800
function expandPrice(idx: number) { return EXPAND_PRICES[Math.min(Math.max(idx - 1, 0), EXPAND_PRICES.length - 1)]; }

/* ---------- 交互 ---------- */
function openSeed() { seedOpen.value = true; }
function openVisit() { visitOpen.value = true; }
function openCodex() { codexOpen.value = true; }
function openFengshui() { fengOpen.value = true; }
function setFormation(el: string) {
  modules.farmFormation = el as ElementType;
  audio.play('success');
  const main = Math.round(cfg.value.fengshuiMainBonus * 100);
  const eng = Math.round(cfg.value.fengshuiEngenderBonus * 100);
  const engEl = FIVE_ENGENDER.value[el];
  showToast(`风水阵主生属性已设为「${FARM_ELEMENT_LABEL.value[el]}」：${FARM_ELEMENT_LABEL.value[el]} +${main}%${engEl ? `·生 ${FARM_ELEMENT_LABEL.value[engEl]} +${eng}%` : ''}`);
}

/* 地块点击：成熟=直接收获；未成熟=选中；锁定=提示扩建 */
function onPlotClick(idx: number) {
  if (idx >= modules.unlockedPlots) {
    showToast(`该地块未解锁，扩建需 ${expandPrice(idx)} 元宝`);
    return;
  }
  const p = modules.plots[idx];
  if (p.status === 'ready') { onHarvest(p); return; }
  selectedIdx.value = idx;
}

/* 播种：先确认有空闲地块（防无地时先扣币又种不下→丢币），再确认消费，最后落种 */
interface SeedCard { q: SeedQuality; label: string; cls: string; name: string; desc: string }
async function onPlant(s: SeedCard) {
  if (user.qi < 5) { audio.play('error'); showToast('灵气不足，播种需 5 点灵气（每5分钟恢复1点）'); return; }

  // P1 修复：先找空闲地块，无地则提前提示并结束，绝不先扣币
  const emptyPlot: IPlot | null = (selectedPlot.value && selectedPlot.value.status === 'idle')
    ? selectedPlot.value
    : (modules.plots.find((p, i) => i < modules.unlockedPlots && p.status === 'idle') || null);
  if (!emptyPlot) { showToast('没有空闲地块，先收获或扩建吧'); return; }

  const cost = (cfg.value.shop.seed?.[s.q] || {}) as Record<string, number>;
  if (!(await askConfirm({ title: '播种', message: `确定播种 ${s.name} 吗？`, cost }))) return;
  const p = user.purchase(cost);
  if (!p.ok) { audio.play('error'); showToast(`${CURRENCY_LABEL.value[p.currency]}不足，${s.name}需 ${cost[p.currency]} ${CURRENCY_LABEL.value[p.currency]}`); return; }

  user.changeQi(-5);

  const seedCfg = SEED_CONFIG.value[s.q];
  emptyPlot.status = 'growing';
  emptyPlot.seedType = s.q;
  emptyPlot.growDurationSeconds = seedCfg?.growSec ?? 0;
  setRemaining(emptyPlot, seedCfg?.growSec ?? 0); // 折算 sowTimestamp，使其走绝对时间戳生长
  emptyPlot.isStealable = false;
  emptyPlot.stolenPercentage = 0;

  seedOpen.value = false;
  audio.play('success');
  showToast(`${s.name} 播种成功（${elementLabel(emptyPlot.element)}地，消耗 5 灵气）`);
}

/* 浇水：生长减半；每日免费3次，超次每日上限（各扣灵珠），防无限叠加秒收（P2平衡）*/
async function onWater(p: IPlot, _ev?: MouseEvent) {
  if (p.status !== 'growing') return;
  if (modules.dailyLimits.freeWaterUsed < 3) {
    modules.dailyLimits.freeWaterUsed++;
    setRemaining(p, Math.floor(p.remainingSeconds / 2));
    audio.play('success');
    showToast('浇水成功：生长时间减半');
    return;
  }
  const waterCost = { ...(cfg.value.shop.water || {}) } as Record<string, number>;
  const limit = PAID_WATER_DAILY_LIMIT.value;
  // 超次付费浇水：受每日上限约束
  if (modules.dailyLimits.paidWaterUsed >= limit) {
    showToast(`今日付费浇水已用完（每日上限 ${limit} 次）`);
    return;
  }
  // 超次：扣除灵珠，先二次确认防误触
  if (!(await askConfirm({ title: '付费浇水', message: `今日免费浇水已用完，本次浇水将消耗 ${waterCost.pearl} 灵珠（今日付费 ${modules.dailyLimits.paidWaterUsed}/${limit}）。确定吗？`, cost: waterCost }))) return;
  const r = user.purchase(waterCost);
  if (!r.ok) { audio.play('error'); showToast(`灵珠不足，浇水需 ${waterCost.pearl} 灵珠`); return; }
  modules.dailyLimits.paidWaterUsed++;
  setRemaining(p, Math.floor(p.remainingSeconds / 2));
  audio.play('success');
  showToast('浇水成功：生长时间减半');
}

/* 收获：完整数值链（08-L393-467）*/
function onHarvest(p: IPlot, ev?: MouseEvent) {
  if (p.status !== 'ready' || !p.seedType) return;
  const seedCfg = SEED_CONFIG.value[p.seedType];
  if (!seedCfg) return;

  // 1) 基础产出 × 倍率（心境加成 + 神龛Buff + 今日天象 + 种植等级；阈值与系数全部读 farmConfig）
  let mult = 1;
  if (user.mood > cfg.value.moodThreshold) mult += cfg.value.moodBonus;
  if (modules.activeBuff.type && modules.activeBuff.expireAt > Date.now()) mult += modules.activeBuff.rate;
  const w = todayWeather.value;
  if (w.bonus) mult += w.bonus;
  // 种植等级加成（等级越高产量越高，形成成长正反馈）
  mult += user.level * cfg.value.levelPerBonus;
  let gold = Math.floor(seedCfg.base.gold * mult);
  let pearl = Math.floor(seedCfg.base.pearl * mult);
  let magic = seedCfg.base.magic ? Math.floor(seedCfg.base.magic * mult) : 0;

  // 2) 招财铃（法器：元宝产出，系数来自后台 artifacts.json 配置；默认 +10%/级，满级 +50%）
  const bellEff = modules.artifactEffect('gold');
  if (bellEff.equipped) gold = Math.floor(gold * bellEff.multiplier);
  // 法器解锁成就进度：收获 +1（招财铃）
  modules.artifactProgress.harvest += 1;
  // 结界符守护计数：单机无真实访客故恒为 0，联机接入后自动生效（不删，保留接入点）
  if (p.stolenPercentage > 0) modules.artifactProgress.defend += 1;
  // 招财铃碎片（P0-1 主题化产出）：按种子品质概率掉落
  const bellFragGot = Math.random() < (BELL_FRAG_CHANCE.value[p.seedType] ?? 0);
  if (bellFragGot) modules.grantFragments('bell', 1);

  // 3) 五行属性修正
  const b = ELEMENT_BONUS.value[p.element] ?? {};
  if (b.gold) gold = Math.floor(gold * (1 + b.gold));
  if (b.pearl) pearl = Math.floor(pearl * (1 + b.pearl));
  if (b.magic) magic = Math.floor(magic * (1 + b.magic));
  if (b.qty) { gold = Math.floor(gold * (1 + b.qty)); pearl = Math.floor(pearl * (1 + b.qty)); magic = Math.floor(magic * (1 + b.qty)); }

  // 3.1) 画境收集加成：集齐同属性壁纸 → 对应灵植元宝产量提升（02-L16-18）
  const gb = modules.elementBonus(p.element);
  if (gb) gold = Math.floor(gold * (1 + gb));

  // ===== 灵植彩蛋第2/3批：轮作地力 / 五行风水阵 / 种子图鉴 / 灵田繁荣度 / 收获连击 =====
  const cropEl = p.element;
  const cropId = `${cropEl}-${p.seedType}` as CropId;
  const prevEl = p.lastCropElement;
  const isRotate = prevEl != null && prevEl !== cropEl;
  const isRepeat = prevEl === cropEl;

  // ① 轮作地力（基于当前地力给产出加成；连作同属性当茬额外 ×repeatYieldPenalty）
  const fertilityMult = (p.fertility / FERTILITY_MAX.value) * FERTILITY_YIELD_COEF.value;
  if (fertilityMult > 0) { gold = Math.floor(gold * (1 + fertilityMult)); pearl = Math.floor(pearl * (1 + fertilityMult)); magic = Math.floor(magic * (1 + fertilityMult)); }
  if (isRepeat) { gold = Math.floor(gold * ROTATE_REPEAT_YIELD_PENALTY.value); pearl = Math.floor(pearl * ROTATE_REPEAT_YIELD_PENALTY.value); magic = Math.floor(magic * ROTATE_REPEAT_YIELD_PENALTY.value); }

  // ② 五行风水阵（玩家今日所选主生属性，相生加成）
  const feng = modules.formationBonus(cropEl);
  if (feng > 0) { gold = Math.floor(gold * (1 + feng)); pearl = Math.floor(pearl * (1 + feng)); magic = Math.floor(magic * (1 + feng)); }

  // ③ 种子图鉴集齐（同元素 3 品质全收 → 该属性产出 +5%）
  const codex = modules.seedCodexBonus(cropEl);
  if (codex > 0) { gold = Math.floor(gold * (1 + codex)); pearl = Math.floor(pearl * (1 + codex)); magic = Math.floor(magic * (1 + codex)); }

  // ④ 灵田繁荣度
  const prosMult = (modules.farmProsperity / PROSPERITY_MAX.value) * PROSPERITY_YIELD_COEF.value;
  if (prosMult > 0) { gold = Math.floor(gold * (1 + prosMult)); pearl = Math.floor(pearl * (1 + prosMult)); magic = Math.floor(magic * (1 + prosMult)); }

  // ⑤ 收获连击（连收窗口内累加；当前这茬是第 N 次）
  const nowTs = Date.now();
  const within = modules.lastHarvestTs > 0 && (nowTs - modules.lastHarvestTs) <= COMBO_WINDOW_MS.value;
  const newCombo = within ? modules.harvestCombo + 1 : 1;
  const comboMult = Math.min(COMBO_CAP.value, (newCombo - 1) * COMBO_PER_STEP.value);
  if (comboMult > 0) { gold = Math.floor(gold * (1 + comboMult)); pearl = Math.floor(pearl * (1 + comboMult)); magic = Math.floor(magic * (1 + comboMult)); }
  modules.harvestCombo = newCombo;
  modules.lastHarvestTs = nowTs;

  // ⑥ 状态回写：地力结算 + 图鉴收录 + 繁荣度增长（在发奖前落库，保证下次收获即生效）
  if (isRotate) p.fertility = Math.min(FERTILITY_MAX.value, p.fertility + FERTILITY_ROTATE_GAIN.value);
  else if (isRepeat) p.fertility = Math.max(0, p.fertility - FERTILITY_REPEAT_PENALTY.value);
  p.lastCropElement = cropEl;
  if (!modules.seedSeen.includes(cropId)) modules.seedSeen.push(cropId);
  const prosBefore = modules.farmProsperity;
  modules.farmProsperity = Math.min(PROSPERITY_MAX.value, prosBefore + PROSPERITY_PER_HARVEST.value + (p.seedType === 'rare' ? PROSPERITY_RARE_BONUS.value : 0));

  // ⑦ 作物语录（随机一句，纯趣味，无奖励）
  const cropDef = cropOf(cropEl, p.seedType);
  const quote = (cropDef?.quotes?.length ? cropDef.quotes : ['……'])[Math.floor(Math.random() * (cropDef?.quotes?.length || 1))];

  // 4) 扣访客借走（成熟时已按等级抗借记录 stolenPercentage）
  const stolenPct = p.stolenPercentage || 0;
  const stolenGold = Math.floor(gold * stolenPct);
  const stolenPearl = Math.floor(pearl * stolenPct);
  gold -= stolenGold; pearl -= stolenPearl;

  // 4.5) 作物变异（收获时小概率，零新资源）
  let variant: VariantKey | null = null;
  const rv = Math.random();
  const vr = VARIANT_RATE.value;
  if (rv < (vr.gold ?? 0)) variant = 'gold';
  else if (rv < (vr.gold ?? 0) + (vr.ice ?? 0)) variant = 'ice';
  else if (rv < (vr.gold ?? 0) + (vr.ice ?? 0) + (vr.twin ?? 0)) variant = 'twin';
  if (variant === 'gold') { gold = Math.floor(gold * 2); pearl = Math.floor(pearl * 2); magic = Math.floor(magic * 2); }
  else if (variant === 'ice') { pearl += 10; }
  else if (variant === 'twin') { gold += seedCfg.base.gold; pearl += seedCfg.base.pearl; if (seedCfg.base.magic) magic += seedCfg.base.magic; }

  // 5) 发奖 + EXP（08-L433-438：exp累加，>=maxExp升级）
  user.changeCurrency('gold', gold);
  user.changeCurrency('pearl', pearl);
  if (magic) user.changeCurrency('magic', magic);
  user.addExp(seedCfg.exp);

  // 6) 天玑掉落（仙种5% + 火地+1% + 月华+5%）
  let jadeDrop = 0;
  const jadeChance = seedCfg.jadeChance + (p.element === 'fire' ? 0.01 : 0) + (w.key === 'moon' ? w.jadeExtra : 0);
  if (jadeChance && Math.random() < jadeChance) { jadeDrop = 1; user.changeCurrency('jade', 1); }

  // 7) 收获奇遇（策划"福缘"趣味化：5% 随机一种小惊喜）
  let luck: LuckEvent | null = null;
  const luckPool = LUCKY_EVENTS.value;
  if (luckPool.length && Math.random() < LUCKY_RATE.value) {
    luck = luckPool[Math.floor(Math.random() * luckPool.length)];
    if (luck.gold) user.changeCurrency('gold', luck.gold);
    if (luck.pearl) user.changeCurrency('pearl', luck.pearl);
    if (luck.magic) user.changeCurrency('magic', luck.magic);
  }

  // 8) 重置土地
  p.status = 'idle'; p.seedType = null; p.remainingSeconds = 0; p.growDurationSeconds = 0;
  p.isStealable = false; p.stolenPercentage = 0;

  const parts = [`收获成功：+${gold}元宝 +${pearl}灵珠${magic ? ' +' + magic + '魔丸' : ''}${jadeDrop ? ' +1天玑' : ''}`, `EXP+${seedCfg.exp}（灵植等级 Lv.${user.level}）`];
  if (user.mood > 80) parts.push('心境>80 → 产出 ×1.15');
  if (w.bonus) parts.push(`${w.icon} ${w.name}：收获 +${Math.round(w.bonus * 100)}%`);
  if (user.level > 1) parts.push(`种植等级 Lv.${user.level}：产出 +${user.level * 2}%`);
  if (b.gold || b.pearl || b.magic || b.qty) parts.push(`${elementLabel(p.element)}属性加成生效`);
  if (gb) parts.push(`画境收藏·${elementLabel(p.element)}属性元宝 +${Math.round(gb * 100)}%`);
  // 灵植彩蛋第2/3批：反馈条目
  if (isRotate) parts.push(`🌱 轮作地力 +${FERTILITY_ROTATE_GAIN.value}（地力 ${Math.round(p.fertility)}）`);
  else if (isRepeat) parts.push(`⚠️ 连作·地力 -${FERTILITY_REPEAT_PENALTY.value}，且当茬产出 ×${ROTATE_REPEAT_YIELD_PENALTY.value}`);
  if (fertilityMult > 0) parts.push(`🌱 地力加成 +${Math.round(fertilityMult * 100)}%`);
  if (feng > 0) parts.push(`⛩️ 风水阵·${modules.farmFormation ? FARM_ELEMENT_LABEL.value[modules.farmFormation] : ''} +${Math.round(feng * 100)}%`);
  if (codex > 0) parts.push(`📒 图鉴集齐·${elementLabel(cropEl)} +${Math.round(codex * 100)}%`);
  if (prosMult > 0) parts.push(`🌿 灵田繁荣 +${Math.round(prosMult * 100)}%`);
  if (comboMult > 0) parts.push(`🔥 收获连击 ×${newCombo} +${Math.round(comboMult * 100)}%`);
  const prosTier = PROSPERITY_TIERS.value.find((t) => prosBefore < t && modules.farmProsperity >= t);
  if (prosTier) parts.push(`✨ 灵田繁荣度达 ${prosTier}！产出更旺`);
  if (modules.seedSeen.length === 15) parts.push('🌿 种子图鉴集齐 15/15！');
  parts.push(`「${quote}」`);
  if (variant) parts.push(`${VARIANT_LABEL.value[variant] ?? variant}变异！${variant === 'gold' ? '产量翻倍' : variant === 'ice' ? '额外灵珠+10' : '多收一份基础产出'}`);
  if (stolenGold || stolenPearl) parts.push(`被拜访带走 ${stolenGold}元宝 ${stolenPearl}灵珠`);
  if (luck) parts.push(`${luck.emoji} ${luck.text}`);
  if (bellFragGot) parts.push('🔔 招财铃碎片 +1');
  // 法器解锁反馈（P2）：本次收获达成的新解锁即时告知，并入队法器页庆祝卡
  const newUnlocks = modules.checkArtifactUnlocks();
  if (newUnlocks.length) {
    modules.pendingArtifactUnlocks.push(...newUnlocks);
    parts.push(`✨ 解锁新法器：${newUnlocks.map((id) => modules.artifactMap[id]?.name ?? id).join('、')}`);
  }
  audio.play('success');
  // 来源处飘字：定位到「收获」按钮，直观显示本次产出（与顶栏总量飘字互补）
  const hc = rectCenter(ev?.currentTarget as Element | undefined);
  let htxt = `+${gold}元宝 +${pearl}灵珠`;
  if (magic) htxt += ` +${magic}魔丸`;
  if (jadeDrop) htxt += ' +1天玑';
  pushFloater({ x: hc.x, y: hc.y - 12, text: htxt, kind: 'gold', duration: 1500 });
  showToast(parts.join('\n'));
}

/* 扩建：解锁下一块，扣对应元宝（统一消费端，演示逻辑等16后端对接统一）*/
async function onExpand() {
  if (modules.unlockedPlots >= modules.plots.length) { showToast('地块已全部解锁'); return; }
  const price = expandPrice(modules.unlockedPlots);
  if (!(await askConfirm({ title: '扩建土地', message: '确定解锁下一块土地吗？', cost: { gold: price } }))) return;
  const p = user.purchase({ gold: price });
  if (!p.ok) { audio.play('error'); showToast(`元宝不足，需 ${price}`); return; }
  modules.unlockedPlots++;
  audio.play('success');
  showToast(`扩建成功：解锁第 ${modules.unlockedPlots} 块${elementLabel(modules.plots[modules.unlockedPlots - 1].element)}地，消耗 ${price} 元宝`);
}

function onVisit(f: typeof friends.value[number]) {
  if (f.disabled || modules.hasVisitedToday(f.id)) return;
  const pct = borrowablePct(f.level);
  const res = visitService.borrow(f.id, f.level, pct); // 联机后替换为真实后端，调用方无需改动
  showToast(res.note);
  modules.recordVisit(f.id); // 记入今日已拜访（每日一次，刷新不重复）
}

/* ---------- 时间引擎（绝对时间戳派生，跨页/后台/重启一致，与仙宠旅行同模型） ----------
   关键：remainingSeconds 不再靠每秒"递减"累积，而是从 sowTimestamp 实时推算：
     remaining = growDurationSeconds - (now - sowTimestamp)/1000
   因此：切页 / 切后台 / 杀进程重启 都自动追平（时间戳不丢失），彻底消灭"重启才生长"的断层。 */
let tickTimer: number | undefined;

/** 依据绝对时间戳，重算所有生长中地块的剩余时间并判定成熟 */
function refreshAll() {
  const now = Date.now();
  for (const p of modules.plots) {
    if (p.status === 'growing' && p.sowTimestamp && p.growDurationSeconds) {
      const remaining = Math.max(0, p.growDurationSeconds - (now - p.sowTimestamp) / 1000);
      p.remainingSeconds = remaining;
      if (remaining <= 0) {
        p.status = 'ready';
        p.isStealable = true;
        p.stolenPercentage = 0; // 单机版无真实访客事件，成熟作物不被自动扣减
      }
    }
  }
}

/** 在不改写 growDurationSeconds 的前提下，把某地块剩余时间直接设为 newRemaining（反推 sowTimestamp，保证时间戳模型自洽）*/
function setRemaining(p: IPlot, newRemaining: number) {
  const dur = p.growDurationSeconds;
  const r = Math.max(0, Math.min(newRemaining, dur));
  p.sowTimestamp = Date.now() - (dur - r) * 1000;
  p.remainingSeconds = r;
  if (r <= 0) {
    p.status = 'ready';
    p.isStealable = true;
    p.stolenPercentage = 0;
  }
}

function startTimeEngine() {
  if (tickTimer) return;
  refreshAll(); // 进入页面先按真实时间追平一次
  tickTimer = window.setInterval(() => refreshAll(), 1000);
}

function stopTimeEngine() {
  if (tickTimer) { clearInterval(tickTimer); tickTimer = undefined; }
}

onMounted(() => {
  // 演示：仅首次进入预播一棵凡品（90秒后成熟）；farmDemoDone 持久化，避免刷新循环补苗刷 common 收益
  const first = modules.plots[0];
  if (!modules.farmDemoDone && first && first.status === 'idle') {
    first.status = 'growing';
    first.seedType = 'common';
    first.growDurationSeconds = 90;   // P2：与 remaining 对齐，避免"95% 进度却写 90 秒"的矛盾
    first.remainingSeconds = 90;
    first.sowTimestamp = Date.now();
    first.isStealable = false;
    first.stolenPercentage = 0;
    modules.farmDemoDone = true;
  }
});
// keepAlive：首次挂载与切回前台都会触发 onActivated；切走触发 onDeactivated
onActivated(() => startTimeEngine());
onDeactivated(() => stopTimeEngine());
onUnmounted(() => { stopTimeEngine(); });
</script>

<style scoped>
.farm-page {
  padding: 14px 22px calc(96px + env(safe-area-inset-bottom, 0px));
  min-height: 100%;
  box-sizing: border-box;
}
.card-glass {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  backdrop-filter: var(--backdrop-lg);
  -webkit-backdrop-filter: var(--backdrop-lg);
  box-shadow: var(--shadow-float);
}
.card { margin: 0; border-radius: var(--radius-card); padding: 18px; }
.card + .card { margin-top: 14px; }

/* 品牌区 */
.topbar { display: flex; justify-content: space-between; align-items: flex-start; padding: 18px 0 0; }
.brand h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -.5px; color: var(--text-primary); }
.brand p { margin: 4px 0 0; font-size: 13px; color: var(--text-muted); }
.weather-bar { display: flex; align-items: center; gap: 8px; margin: 12px 0 0; padding: 8px 12px; border-radius: 12px;
  background: linear-gradient(135deg, rgba(138,128,216,.12), rgba(168,173,229,.10)); border: 1px solid var(--border-light); }
.weather-bar .w-icon { font-size: 16px; }
.weather-bar .w-text { font-size: 12px; color: var(--text-secondary); font-weight: 600; }
.actions { display: flex; gap: 10px; }

/* 生态缸 */
.garden { height: 220px; position: relative; margin-top: 4px; margin-bottom: 14px; }
.terrarium { position: absolute; left: 50%; top: 30px; transform: translateX(-50%); width: 250px; height: 200px; --g: 0.5; }
.water-shadow { position: absolute; left: 8px; top: 120px; width: 234px; height: 60px; border-radius: 50%; background: radial-gradient(ellipse at center, rgba(138,128,216,.16), transparent 72%); }
.glass-tank { position: absolute; left: 0; top: 104px; width: 250px; height: 78px; border-radius: 50% 50% 43% 43%;
  background: linear-gradient(180deg, rgba(255,255,255,.18), rgba(168,173,229,.16)); border: 1px solid rgba(136,139,193,.30);
  box-shadow: inset 0 9px 15px rgba(255,255,255,.7), inset 0 -12px 20px rgba(108,105,171,.10); overflow: hidden; }
.soil { position: absolute; left: 8px; top: 88px; width: 234px; height: 60px; border-radius: 50%;
  background: radial-gradient(ellipse at center, #5C7A6E 0 30%, #7C9486 31% 55%, #4E6B60 56% 100%); box-shadow: 0 7px 14px rgba(43,57,67,.18); }
.rock { position: absolute; background: linear-gradient(135deg,#a8b3ca,#4b5a70); border-radius: 25% 38% 30% 35%; box-shadow: inset 7px 5px 9px rgba(255,255,255,.3), 0 6px 8px rgba(50,55,73,.18); }
.r1 { left: 70px; top: 82px; width: 54px; height: 46px; transform: rotate(-14deg); }
.r2 { left: 120px; top: 92px; width: 74px; height: 44px; transform: rotate(9deg); }
.r3 { left: 178px; top: 94px; width: 44px; height: 38px; transform: rotate(13deg); }
.stem { position: absolute; width: 4px; border-radius: 8px; background: linear-gradient(var(--growth),#4E8270);
  transform-origin: bottom center; z-index: 3; height: calc(18px + 90px * var(--g)); }
.stem.main { left: 122px; top: calc(120px - 108px * var(--g)); }
.leaf { position: absolute; width: 30px; height: 17px; border-radius: 100% 0 100% 0;
  background: linear-gradient(135deg,#A9CF9C,#5BA06F); z-index: 4; opacity: calc(.25 + .75 * var(--g)); }
.leaf.l1 { left: 96px; top: 30px; } .leaf.l2 { left: 132px; top: 50px; transform: scaleX(-1); }
.leaf.l3 { left: 86px; top: 80px; transform: rotate(12deg); } .leaf.l4 { left: 134px; top: 98px; transform: scaleX(-1) rotate(18deg); }
.flower-head { position: absolute; z-index: 5; width: 24px; height: 24px; border-radius: 50%; left: 178px; top: calc(26px - 36px * var(--g));
  background: radial-gradient(circle,#fff 0 17%,#E4E0FF 18% 45%,transparent 46%), conic-gradient(from 0deg,var(--accent-soft),#fff,var(--accent-soft),#EDEAFF,var(--accent-soft));
  filter: drop-shadow(0 0 5px rgba(138,128,216,.35)); opacity: calc(0 + 1 * var(--g)); }
.glow { position: absolute; width: 7px; height: 7px; border-radius: 50%; background: #D8FBFF; box-shadow: 0 0 12px 4px rgba(138,128,216,.45); z-index: 8; }
.gl1 { left: 168px; top: 110px; } .gl2 { left: 200px; top: 128px; } .gl3 { left: 146px; top: 124px; }

/* 成长卡 */
.growth-card { display: flex; flex-direction: column; gap: 10px; }
.growth-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.growth-head .c-title { font-size: 16px; font-weight: 700; line-height: 1.25; flex: 1; min-width: 0; }
.growth-head .c-title span { display: block; font-size: 12px; color: var(--text-muted); font-weight: 400; margin-top: 2px; }
.pill { flex: 0 0 auto; font-size: 11px; font-weight: 700; color: var(--growth); background: var(--growth-soft); border-radius: 13px; padding: 5px 10px; white-space: nowrap; }
.pill.ready { color: #fff; background: var(--growth); }
.c-sub { font-size: 12px; color: var(--text-secondary); line-height: 1.5; white-space: pre-line; }
.progress-row { display: flex; align-items: center; gap: 10px; }
.bar { flex: 1; height: 6px; border-radius: 10px; background: var(--track-bg); overflow: hidden; }
.bar i { display: block; height: 100%; background: linear-gradient(90deg, var(--growth), #9CD3B6); border-radius: 10px; transition: width .3s ease; }
.c-count { font-size: 12px; font-weight: 700; color: var(--text-primary); white-space: nowrap; }
.growth-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.c-eta { font-size: 12px; color: var(--text-muted); }
.water-btn { border-radius: 12px; padding: 6px 12px; background: var(--growth-soft); color: var(--growth); font-size: 12px; font-weight: 700; border: 0; cursor: pointer; }

/* 我的土地 */
.land-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.c-title { font-size: 16px; font-weight: 700; color: var(--text-primary); }
.expand-btn { border: none; border-radius: 12px; padding: 6px 12px; background: var(--accent); color: #fff; font-size: 12px; font-weight: 600; box-shadow: 0 2px 8px rgba(138,128,216,.28); cursor: pointer; transition: transform .12s ease; }
.expand-btn:active { transform: scale(.96); }
.slots { display: flex; gap: 12px; overflow-x: auto; padding: 7px 8px 6px; }
.slot { flex: 0 0 96px; height: 104px; border-radius: 16px; position: relative; overflow: hidden;
  --el: var(--accent); --el-soft: #EFEFFB;
  background: linear-gradient(135deg,#F0F0FF,#E7E6FB); display: grid; place-items: center; cursor: pointer;
  transition: transform .14s ease, box-shadow .14s ease; }
.slot:active { transform: scale(.97); }
.slot.wood { --el: var(--wuxing-wood); --el-soft: var(--wuxing-wood-soft); }
.slot.water { --el: var(--wuxing-water); --el-soft: var(--wuxing-water-soft); }
.slot.fire { --el: var(--wuxing-fire); --el-soft: var(--wuxing-fire-soft); }
.slot.gold { --el: var(--wuxing-gold); --el-soft: var(--wuxing-gold-soft); }
.slot.earth { --el: var(--wuxing-earth); --el-soft: var(--wuxing-earth-soft); }
.slot.selected { box-shadow: 0 0 0 2px var(--accent), 0 8px 18px rgba(138,128,216,.22); transform: translateY(-3px); }
.slot .attr { position: absolute; top: 8px; left: 8px; font-size: 11px; font-weight: 700; color: var(--el); background: var(--el-soft); border-radius: 8px; padding: 1px 6px; }
.slot.active { background: linear-gradient(145deg, var(--el-soft), #fff); }
.slot.active .crop { font-size: 12px; color: var(--text-primary); font-weight: 600; text-align: center; }
.slot.active .crop small { display: block; color: var(--text-muted); font-weight: 400; font-size: 10px; margin-top: 2px; }
.slot.active .crop small.pulse { color: var(--growth); font-weight: 700; animation: pulse 1.2s ease-in-out infinite; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
.slot.locked { cursor: pointer; }
.slot.locked .lock { width: 22px; height: 22px; stroke: var(--text-muted); stroke-width: 1.7; fill: none; }
.slot.locked .cost { position: absolute; bottom: 10px; font-size: 11px; color: var(--text-secondary); }
.slot.locked .cost b { color: var(--el); }

/* 福缘 toast */
.toast { position: fixed; left: 50%; top: 18px; transform: translateX(-50%); z-index: var(--z-toast, 1100);
  background: linear-gradient(135deg, var(--accent), var(--accent-soft)); color: #fff;
  padding: 12px 18px; border-radius: 18px; font-size: 13px; box-shadow: 0 10px 30px rgba(138,128,216,.4);
  display: flex; align-items: center; gap: 8px; white-space: pre-line; }
.toast .x { opacity: .8; margin-left: 6px; cursor: pointer; }

/* sheet 内容（遮罩/面板/动画由 Overlay 组件统一提供） */
.sheet-title { margin: 0 0 4px; font-size: 18px; color: var(--text-primary); display: flex; align-items: center; gap: 8px; }
.online-tag { font-size: 10px; font-weight: 700; color: #fff; background: linear-gradient(135deg, #8A80D8, #A8ADD9); border-radius: 10px; padding: 2px 8px; letter-spacing: .5px; }
.hint { margin: 0 0 16px; font-size: 12px; color: var(--text-muted); }
.seed { display: flex; align-items: center; gap: 12px; padding: 14px; border-radius: 16px; margin-bottom: 12px;
  background: var(--bg-card); border: 1px solid var(--border-light); }
.seed .tag { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; font-size: 12px; font-weight: 700; color: #fff; flex: 0 0 auto; }
.seed .tag.fan { background: #8FB38C; } .seed .tag.ling { background: #8A80D8; } .seed .tag.xian { background: #D6B45D; }
.seed .meta { flex: 1; min-width: 0; } .seed .meta b { font-size: 14px; color: var(--text-primary); }
.seed .meta p { margin: 3px 0 0; font-size: 11px; color: var(--text-secondary); line-height: 1.5; white-space: pre-line; }
.seed .plant { border-radius: 14px; padding: 8px 12px; background: var(--accent); color: #fff; font-size: 12px; font-weight: 600; border: 0; cursor: pointer; flex: 0 0 auto; }

/* 拜访列表 */
.visit-list { display: flex; flex-direction: column; gap: 12px; }
.friend { display: flex; align-items: center; gap: 12px; padding: 14px; border-radius: 16px; background: var(--bg-card); border: 1px solid var(--border-light); }
.friend .ava { width: 44px; height: 44px; border-radius: 14px; background: linear-gradient(145deg, var(--accent), var(--accent-soft)); display: grid; place-items: center; color: #fff; font-size: 20px; flex: 0 0 auto; }
.friend .info { flex: 1; min-width: 0; } .friend .info b { font-size: 14px; color: var(--text-primary); } .friend .info p { margin: 3px 0 0; font-size: 12px; color: var(--text-secondary); }
.friend .btn { border-radius: 16px; padding: 9px 14px; background: var(--accent); color: #fff; font-size: 13px; font-weight: 600; border: 0; cursor: pointer; flex: 0 0 auto; }
.friend .btn:disabled { background: var(--growth-soft); color: var(--growth); cursor: default; }

/* 调试重播按钮（预览/开发可见；生产 v-if=false Tree-Shake 掉；避开 toast 顶部区域放右下） */
.debug-replay-btn {
  position: fixed;
  right: 18px;
  bottom: calc(96px + env(safe-area-inset-bottom, 0px));
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 0;
  background: rgba(255,255,255,.72);
  backdrop-filter: blur(14px) saturate(1.4);
  -webkit-backdrop-filter: blur(14px) saturate(1.4);
  box-shadow: 0 6px 14px rgba(80,70,120,.16), 0 1px 0 rgba(255,255,255,.6) inset;
  color: #6C63AC;
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer;
  z-index: 35;
  -webkit-tap-highlight-color: transparent;
  transition: transform .18s cubic-bezier(.2,.8,.2,1), box-shadow .18s ease;
}
.debug-replay-btn:active {
  transform: scale(0.92);
  box-shadow: 0 3px 8px rgba(80,70,120,.18), 0 1px 0 rgba(255,255,255,.5) inset;
}

/* 灵田繁荣度 */
.prosperity-bar { display: flex; align-items: center; gap: 8px; margin: 12px 0 0; padding: 6px 12px; border-radius: 12px;
  background: linear-gradient(135deg, rgba(138,200,160,.12), rgba(168,173,229,.10)); border: 1px solid var(--border-light); }
.prosperity-bar .p-label { font-size: 12px; font-weight: 700; color: var(--growth); white-space: nowrap; }
.prosperity-bar .p-track { position: relative; flex: 1; height: 6px; border-radius: 10px; background: var(--track-bg); overflow: hidden; }
.prosperity-bar .p-fill { display: block; height: 100%; background: linear-gradient(90deg, var(--growth), #9CD3B6); border-radius: 10px; transition: width .35s ease; }
.prosperity-bar .p-tier { position: absolute; top: -2px; width: 2px; height: 10px; background: rgba(120,110,170,.45); transform: translateX(-50%); }
.prosperity-bar .p-count { font-size: 11px; font-weight: 700; color: var(--text-secondary); white-space: nowrap; }

/* 成长卡：连击 pill + 多 pill 容器 */
.head-pills { display: flex; align-items: center; gap: 6px; flex: 0 0 auto; flex-wrap: wrap; justify-content: flex-end; }
.pill.combo-pill { color: #D9803B; background: #FBE6D2; }

/* 地块：风水角标 + 地力条 */
.slot .feng-badge { position: absolute; top: 6px; right: 6px; font-size: 13px; filter: drop-shadow(0 1px 2px rgba(138,128,216,.35)); }
.slot .fert-wrap { position: absolute; left: 8px; right: 8px; bottom: 7px; height: 4px; border-radius: 6px; background: rgba(120,110,170,.16); overflow: hidden; }
.slot .fert { display: block; height: 100%; border-radius: 6px; background: linear-gradient(90deg, #8FB38C, #C9E0A8); transition: width .35s ease; }
.slot .fert.low { background: linear-gradient(90deg, #E0A07A, #E8C59B); }

/* 种子图鉴网格 */
.codex-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.codex-cell { border-radius: 14px; padding: 12px 8px; text-align: center; background: var(--bg-card); border: 1px solid var(--border-light); opacity: .55; }
.codex-cell.seen { opacity: 1; border-color: var(--el, var(--accent)); box-shadow: 0 0 0 1px var(--el-soft, var(--accent-soft)) inset; }
.codex-cell-gold { --el: var(--wuxing-gold); --el-soft: var(--wuxing-gold-soft); }
.codex-cell-wood { --el: var(--wuxing-wood); --el-soft: var(--wuxing-wood-soft); }
.codex-cell-water { --el: var(--wuxing-water); --el-soft: var(--wuxing-water-soft); }
.codex-cell-fire { --el: var(--wuxing-fire); --el-soft: var(--wuxing-fire-soft); }
.codex-cell-earth { --el: var(--wuxing-earth); --el-soft: var(--wuxing-earth-soft); }
.codex-cell .cx-emoji { display: block; font-size: 22px; line-height: 1.1; }
.codex-cell .cx-name { display: block; font-size: 12px; font-weight: 600; color: var(--text-primary); margin-top: 4px; }
.codex-cell .cx-tag { display: block; font-size: 10px; color: var(--text-muted); margin-top: 2px; }

/* 五行风水阵选择 */
.feng-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
.feng-cell { border-radius: 14px; padding: 14px 6px; display: flex; flex-direction: column; align-items: center; gap: 3px;
  background: var(--bg-card); border: 1.5px solid var(--border-light); cursor: pointer; transition: transform .12s ease, box-shadow .12s ease; }
.feng-cell:active { transform: scale(.96); }
.feng-cell.on { border-color: var(--el); box-shadow: 0 0 0 2px var(--el) inset, 0 6px 16px rgba(138,128,216,.18); }
.feng-cell-gold { --el: var(--wuxing-gold); }
.feng-cell-wood { --el: var(--wuxing-wood); }
.feng-cell-water { --el: var(--wuxing-water); }
.feng-cell-fire { --el: var(--wuxing-fire); }
.feng-cell-earth { --el: var(--wuxing-earth); }
.feng-cell .fx-el { font-size: 18px; font-weight: 800; color: var(--el); }
.feng-cell .fx-sub { font-size: 10px; color: var(--text-muted); }
.feng-cell .fx-eng { font-size: 10px; color: var(--el); font-weight: 600; }
</style>
