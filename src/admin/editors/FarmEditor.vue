<template>
  <div class="farm-ed">
    <!-- ===================== ① 全局数值参数 ===================== -->
    <section class="blk">
      <div class="blk-head">
        <b>① 灵田 · 全局数值</b>
        <span class="hint">地力 / 繁荣度 / 连击 / 心境与等级加成（与玩家地块进度严格分离，改完保存即生效）</span>
      </div>

      <div class="sub">轮作地力</div>
      <div class="param-grid">
        <label class="param">
          <span class="pk">地力上限</span>
          <input type="number" min="1" step="1" v-model.number="cfg.fertility.max" />
          <span class="ph">地力百分比封顶</span>
        </label>
        <label class="param">
          <span class="pk">初始地力</span>
          <input type="number" min="0" step="1" v-model.number="cfg.fertility.start" />
          <span class="ph">新地块的起始地力</span>
        </label>
        <label class="param">
          <span class="pk">轮作增益 +</span>
          <input type="number" step="1" v-model.number="cfg.fertility.rotateGain" />
          <span class="ph">异属性轮作时地力增加</span>
        </label>
        <label class="param">
          <span class="pk">连作惩罚 −</span>
          <input type="number" step="1" v-model.number="cfg.fertility.repeatPenalty" />
          <span class="ph">同属性连作时地力减少</span>
        </label>
        <label class="param" :class="{ warnp: cfg.fertility.yieldCoef < 0 || cfg.fertility.yieldCoef > 1 }">
          <span class="pk">满地力产出系数</span>
          <input type="number" step="0.05" min="0" max="1" v-model.number="cfg.fertility.yieldCoef" />
          <span class="ph">地力 100 时对产出的加成（0.3 = +30%）</span>
        </label>
        <label class="param">
          <span class="pk">连作当茬产出 ×</span>
          <input type="number" step="0.05" min="0" max="1" v-model.number="cfg.fertility.repeatYieldPenalty" />
          <span class="ph">连作时这一茬的产出折扣（0.85 = 八五折）</span>
        </label>
      </div>

      <div class="sub">灵田繁荣度</div>
      <div class="param-grid">
        <label class="param">
          <span class="pk">繁荣度上限</span>
          <input type="number" min="1" step="1" v-model.number="cfg.prosperity.max" />
          <span class="ph">繁荣度封顶值</span>
        </label>
        <label class="param">
          <span class="pk">每次收获 +</span>
          <input type="number" step="1" v-model.number="cfg.prosperity.perHarvest" />
          <span class="ph">每收获一茬增加的繁荣度</span>
        </label>
        <label class="param">
          <span class="pk">仙种额外 +</span>
          <input type="number" step="1" v-model.number="cfg.prosperity.rareBonus" />
          <span class="ph">收获仙品作物额外增加</span>
        </label>
        <label class="param" :class="{ warnp: cfg.prosperity.yieldCoef < 0 || cfg.prosperity.yieldCoef > 1 }">
          <span class="pk">满繁荣产出系数</span>
          <input type="number" step="0.05" min="0" max="1" v-model.number="cfg.prosperity.yieldCoef" />
          <span class="ph">繁荣满值对产出的加成（0.2 = +20%）</span>
        </label>
        <label class="param grow2">
          <span class="pk">里程碑档位（逗号分隔）</span>
          <input v-model="tiersText" placeholder="25, 50, 75, 100" />
          <span class="ph">跨过档位时给玩家正反馈提示</span>
        </label>
      </div>

      <div class="sub">收获连击 / 心境 / 等级 / 浇水</div>
      <div class="param-grid">
        <label class="param">
          <span class="pk">连击窗口（分钟）</span>
          <input type="number" min="0" step="1" :value="Math.round((cfg.combo.windowMs || 0) / 60000)" @input="setComboMin" />
          <span class="ph">窗口内连收才算连击</span>
        </label>
        <label class="param">
          <span class="pk">每连加成</span>
          <input type="number" step="0.01" min="0" v-model.number="cfg.combo.perStep" />
          <span class="ph">每多 1 连的产出加成（0.02 = +2%）</span>
        </label>
        <label class="param">
          <span class="pk">连击封顶</span>
          <input type="number" step="0.05" min="0" v-model.number="cfg.combo.cap" />
          <span class="ph">连击加成上限（0.2 = 封顶 +20%）</span>
        </label>
        <label class="param">
          <span class="pk">心境加成阈值</span>
          <input type="number" min="0" max="100" step="1" v-model.number="cfg.moodThreshold" />
          <span class="ph">心境高于此值时触发产出加成</span>
        </label>
        <label class="param">
          <span class="pk">心境加成幅度</span>
          <input type="number" step="0.05" min="0" v-model.number="cfg.moodBonus" />
          <span class="ph">满足条件时的产出加成（0.15 = +15%）</span>
        </label>
        <label class="param">
          <span class="pk">每级产出加成</span>
          <input type="number" step="0.01" min="0" v-model.number="cfg.levelPerBonus" />
          <span class="ph">种植等级每 1 级的产出加成（0.02 = +2%）</span>
        </label>
        <label class="param">
          <span class="pk">付费浇水每日上限</span>
          <input type="number" min="0" step="1" v-model.number="cfg.paidWaterDailyLimit" />
          <span class="ph">超出免费 3 次后的付费次数上限</span>
        </label>
      </div>
    </section>

    <!-- ===================== ② 五行关系与加成 ===================== -->
    <section class="blk">
      <div class="blk-head">
        <b>② 五行相生相克 · 风水阵 · 图鉴 · 元素产出</b>
        <span class="hint">相生用于风水阵加成传播；相克预留给后续玩法；元素产出修正按属性生效</span>
      </div>

      <div class="sub">相生 / 相克（左生右、左克右）</div>
      <div class="rel-grid">
        <div class="rel" v-for="el in elementIds" :key="'e' + el">
          <b :class="'el-' + el">{{ elLabel(el) }}</b>
          <span class="rel-arrow">生</span>
          <select v-model="cfg.fiveEngender[el]">
            <option v-for="o in elementIds" :key="o" :value="o">{{ elLabel(o) }}</option>
          </select>
          <span class="rel-arrow">克</span>
          <select v-model="cfg.fiveRestrain[el]">
            <option v-for="o in elementIds" :key="o" :value="o">{{ elLabel(o) }}</option>
          </select>
        </div>
      </div>

      <div class="sub">风水阵与图鉴</div>
      <div class="param-grid">
        <label class="param">
          <span class="pk">风水阵主属性加成</span>
          <input type="number" step="0.01" min="0" v-model.number="cfg.fengshuiMainBonus" />
          <span class="ph">玩家今日所选主生属性作物的加成</span>
        </label>
        <label class="param">
          <span class="pk">风水阵相生加成</span>
          <input type="number" step="0.01" min="0" v-model.number="cfg.fengshuiEngenderBonus" />
          <span class="ph">主属性「所生」属性作物的加成</span>
        </label>
        <label class="param">
          <span class="pk">图鉴集齐加成</span>
          <input type="number" step="0.01" min="0" v-model.number="cfg.codexElementBonus" />
          <span class="ph">同元素 3 品质全收录后的产出加成</span>
        </label>
      </div>

      <div class="sub">元素产出修正（百分比，0.2 = +20%；qty 为总数量加成）</div>
      <div class="rel-grid">
        <div class="rel" v-for="el in elementIds" :key="'b' + el">
          <b :class="'el-' + el">{{ elLabel(el) }}</b>
          <label>元宝<input type="number" step="0.05" v-model.number="(cfg.elementBonus[el] ||= {}).gold" /></label>
          <label>灵珠<input type="number" step="0.05" v-model.number="(cfg.elementBonus[el] ||= {}).pearl" /></label>
          <label>魔丸<input type="number" step="0.05" v-model.number="(cfg.elementBonus[el] ||= {}).magic" /></label>
          <label>数量<input type="number" step="0.05" v-model.number="(cfg.elementBonus[el] ||= {}).qty" /></label>
        </div>
      </div>
    </section>

    <!-- ===================== ③ 15 种作物 ===================== -->
    <section class="blk">
      <div class="blk-head">
        <b>③ 十五种灵植作物（5 元素 × 3 品质）</b>
        <span class="hint">固定 15 种不可增删 · id 与元素/品质不可改 · 名称/emoji/数值/语录/立绘全可改</span>
      </div>
      <div class="crop-grid">
        <div class="crop" v-for="c in cfg.crops" :key="c.id" :class="'crop-' + c.element">
          <div class="crop-head">
            <span class="crop-emo">{{ c.emoji || '🌱' }}</span>
            <input v-model="c.emoji" class="em" maxlength="4" placeholder="🌱" />
            <input v-model="c.name" class="nm" maxlength="8" placeholder="作物名" />
            <span class="crop-tag">{{ elLabel(c.element) }}·{{ qLabel(c.quality) }}</span>
          </div>
          <div class="crop-nums">
            <label>成长(分)<input type="number" min="0" step="1" :value="growMin(c)" @input="(e: Event) => setGrowMin(c, e)" /></label>
            <label>元宝<input type="number" min="0" step="1" v-model.number="c.base.gold" /></label>
            <label>灵珠<input type="number" min="0" step="1" v-model.number="c.base.pearl" /></label>
            <label>魔丸<input type="number" min="0" step="1" v-model.number="c.base.magic" /></label>
            <label>经验<input type="number" min="0" step="1" v-model.number="c.exp" /></label>
            <label>天玑%<input type="number" min="0" max="100" step="1" :value="pct(c.jadeChance)" @input="(e: Event) => setPct(c, e)" /></label>
          </div>
          <div class="crop-quote">
            <span class="wc-title">收获语录（每行一句，随机取一）</span>
            <textarea rows="2" :value="quotesText(c)" @input="(e: Event) => setQuotes(c, e)"></textarea>
          </div>
          <ImageField
            :model-value="c.image"
            :label="c.name + ' 立绘'"
            :upload-name="'farm_crop_' + c.id"
            :max-dim="512"
            :quality="0.85"
            @update:model-value="(v: string) => (c.image = v)"
          />
        </div>
      </div>
    </section>

    <!-- ===================== ④ 集中价目表 ===================== -->
    <section class="blk">
      <div class="blk-head">
        <b>④ 集中价目表</b>
        <span class="hint">种子 / 宠粮 / 解锁仙宠 / 付费浇水（种子价目即播种成本，与作物卡片联动）</span>
      </div>
      <div class="sub">种子（按品质）</div>
      <div class="price-grid">
        <div class="price" v-for="q in qualityIds" :key="'s' + q">
          <b>{{ qLabel(q) }}种子</b>
          <label>元宝<input type="number" min="0" step="1" v-model.number="(cfg.shop.seed[q] ||= {}).gold" /></label>
          <label>灵珠<input type="number" min="0" step="1" v-model.number="(cfg.shop.seed[q] ||= {}).pearl" /></label>
          <label>魔丸<input type="number" min="0" step="1" v-model.number="(cfg.shop.seed[q] ||= {}).magic" /></label>
        </div>
      </div>
      <div class="sub">其他</div>
      <div class="price-grid">
        <div class="price"><b>干粮</b><label>元宝<input type="number" min="0" v-model.number="(cfg.shop.petFood.dry ||= {}).gold" /></label></div>
        <div class="price"><b>精粮</b><label>灵珠<input type="number" min="0" v-model.number="(cfg.shop.petFood.premium ||= {}).pearl" /></label></div>
        <div class="price"><b>解锁新仙宠</b><label>天玑<input type="number" min="0" v-model.number="cfg.shop.petUnlock.jade" /></label></div>
        <div class="price"><b>付费浇水</b><label>灵珠<input type="number" min="0" v-model.number="cfg.shop.water.pearl" /></label></div>
      </div>
    </section>

    <!-- ===================== ⑤ 趣味彩蛋池 ===================== -->
    <section class="blk">
      <div class="blk-head">
        <b>⑤ 趣味彩蛋池</b>
        <span class="hint">每日天象 / 作物变异 / 收获奇遇（均可增删，改动即时影响产出手感）</span>
      </div>

      <div class="sub">
        每日天象
        <button class="add" @click="addWeather">+ 新增天象</button>
      </div>
      <div class="ms-list">
        <div class="ms" v-for="(w, i) in cfg.weathers" :key="'w' + i">
          <label>图标<input v-model="w.icon" class="em" maxlength="4" /></label>
          <label>名称<input v-model="w.name" /></label>
          <label>key<input v-model="w.key" class="ro" /></label>
          <label>产出加成<input type="number" step="0.01" v-model.number="w.bonus" /></label>
          <label>天玑概率+<input type="number" step="0.01" v-model.number="w.jadeExtra" /></label>
          <label class="grow">描述<input v-model="w.desc" /></label>
          <button class="del" @click="cfg.weathers.splice(i, 1)">✕</button>
        </div>
      </div>

      <div class="sub">作物变异（合计概率 {{ variantTotal }}%）</div>
      <div class="ms-list">
        <div class="ms" v-for="(v, i) in cfg.variants" :key="'v' + i">
          <label>key<input v-model="v.key" class="ro" /></label>
          <label>名称<input v-model="v.label" /></label>
          <label :class="{ warnp: v.rate < 0 || v.rate > 1 }">概率（0~1）<input type="number" step="0.01" min="0" max="1" v-model.number="v.rate" /></label>
        </div>
      </div>
      <div class="note">gold=产量翻倍 / ice=额外灵珠+10 / twin=多收一份基础产出（效果为固定逻辑，此处只调概率与名称）</div>

      <div class="sub">
        收获奇遇（触发概率 {{ pct(cfg.luckyRate) }}%）
        <button class="add" @click="addLucky">+ 新增奇遇</button>
      </div>
      <div class="param-grid">
        <label class="param" :class="{ warnp: cfg.luckyRate < 0 || cfg.luckyRate > 1 }">
          <span class="pk">奇遇触发概率</span>
          <input type="number" step="0.01" min="0" max="1" v-model.number="cfg.luckyRate" />
          <span class="ph">每次收获触发奇遇的几率（0.05 = 5%）</span>
        </label>
      </div>
      <div class="ms-list">
        <div class="ms" v-for="(e, i) in cfg.luckyEvents" :key="'l' + i">
          <label>图标<input v-model="e.emoji" class="em" maxlength="4" /></label>
          <label>元宝<input type="number" min="0" v-model.number="e.gold" /></label>
          <label>灵珠<input type="number" min="0" v-model.number="e.pearl" /></label>
          <label>魔丸<input type="number" min="0" v-model.number="e.magic" /></label>
          <label class="grow">文案<input v-model="e.text" /></label>
          <button class="del" @click="cfg.luckyEvents.splice(i, 1)">✕</button>
        </div>
      </div>
    </section>

    <!-- ===================== ⑥ 即时预览 ===================== -->
    <section class="blk preview">
      <div class="blk-head"><b>⑥ 即时预览</b><span class="hint">随上方改动实时计算，用于核对数值平衡</span></div>
      <div class="pv">
        <div class="pv-item"><b>作物 / 元素 / 品质</b><span>{{ cfg.crops.length }} 种 · {{ elementIds.length }} 元素 · {{ qualityIds.length }} 品质</span></div>
        <div class="pv-item"><b>凡品单茬基础</b><span>{{ baseOf('common') }}</span></div>
        <div class="pv-item"><b>灵品单茬基础</b><span>{{ baseOf('uncommon') }}</span></div>
        <div class="pv-item"><b>仙品单茬基础</b><span>{{ baseOf('rare') }}</span></div>
        <div class="pv-item"><b>满状态倍率</b><span>地力 +{{ pct(cfg.fertility.yieldCoef) }}% · 繁荣 +{{ pct(cfg.prosperity.yieldCoef) }}% · 连击 +{{ pct(cfg.combo.cap) }}%</span></div>
        <div class="pv-item"><b>叠加后仙品元宝</b><span>≈ {{ stackedGold }} 元宝（含心境/风水阵/图鉴，未计法器与天象）</span></div>
        <div class="pv-item"><b>仙品回本周期</b><span>{{ payback }}</span></div>
        <div class="pv-item"><b>彩蛋池</b><span>天象 {{ cfg.weathers.length }} 种 · 变异合计 {{ variantTotal }}% · 奇遇 {{ cfg.luckyEvents.length }} 条 @ {{ pct(cfg.luckyRate) }}%</span></div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import ImageField from '../components/ImageField.vue';

const props = defineProps<{ data: any }>();
const cfg = computed<any>(() => props.data ?? {});

/* ---------- 自愈：补默认结构，防止 v-model 到 undefined 抛错白屏 ---------- */
watch(
  cfg,
  (c: any) => {
    if (!c || typeof c !== 'object') return;
    if (!Array.isArray(c.elements)) c.elements = [];
    if (!Array.isArray(c.qualities)) c.qualities = [];
    if (!Array.isArray(c.crops)) c.crops = [];
    c.crops.forEach((x: any) => {
      if (!x.base || typeof x.base !== 'object') x.base = { gold: 0, pearl: 0 };
      if (!Array.isArray(x.quotes)) x.quotes = [];
      if (typeof x.image !== 'string') x.image = '';
      if (typeof x.growSec !== 'number') x.growSec = 0;
      if (typeof x.exp !== 'number') x.exp = 0;
      if (typeof x.jadeChance !== 'number') x.jadeChance = 0;
    });
    if (!c.fiveEngender || typeof c.fiveEngender !== 'object') c.fiveEngender = {};
    if (!c.fiveRestrain || typeof c.fiveRestrain !== 'object') c.fiveRestrain = {};
    if (!c.elementBonus || typeof c.elementBonus !== 'object') c.elementBonus = {};
    if (typeof c.fengshuiMainBonus !== 'number') c.fengshuiMainBonus = 0.12;
    if (typeof c.fengshuiEngenderBonus !== 'number') c.fengshuiEngenderBonus = 0.06;
    if (typeof c.codexElementBonus !== 'number') c.codexElementBonus = 0.05;
    if (!c.fertility || typeof c.fertility !== 'object') c.fertility = {};
    const F = c.fertility;
    F.max ??= 100; F.start ??= 60; F.rotateGain ??= 5; F.repeatPenalty ??= 8; F.yieldCoef ??= 0.3; F.repeatYieldPenalty ??= 0.85;
    if (!c.prosperity || typeof c.prosperity !== 'object') c.prosperity = {};
    const P = c.prosperity;
    P.max ??= 100; P.perHarvest ??= 1; P.rareBonus ??= 1; P.yieldCoef ??= 0.2;
    if (!Array.isArray(P.tiers)) P.tiers = [25, 50, 75, 100];
    if (!c.combo || typeof c.combo !== 'object') c.combo = {};
    c.combo.windowMs ??= 600000; c.combo.perStep ??= 0.02; c.combo.cap ??= 0.2;
    c.moodThreshold ??= 80; c.moodBonus ??= 0.15; c.levelPerBonus ??= 0.02;
    if (!Array.isArray(c.weathers)) c.weathers = [];
    if (!Array.isArray(c.variants)) c.variants = [];
    if (typeof c.luckyRate !== 'number') c.luckyRate = 0.05;
    if (!Array.isArray(c.luckyEvents)) c.luckyEvents = [];
    if (!c.bellFragChance || typeof c.bellFragChance !== 'object') c.bellFragChance = {};
    if (typeof c.paidWaterDailyLimit !== 'number') c.paidWaterDailyLimit = 3;
    if (!c.shop || typeof c.shop !== 'object') c.shop = {};
    c.shop.seed ??= {}; c.shop.petFood ??= {}; c.shop.petUnlock ??= {}; c.shop.water ??= {};
    if (!c.currencyLabel || typeof c.currencyLabel !== 'object') c.currencyLabel = {};
  },
  { immediate: true, deep: false },
);

/* ---------- 工具 ---------- */
const elementIds = computed(() => (cfg.value.elements || []).map((e: any) => e.id));
const qualityIds = computed(() => (cfg.value.qualities || []).map((q: any) => q.id));
function elLabel(id: string) { return (cfg.value.elements || []).find((e: any) => e.id === id)?.label ?? id; }
function qLabel(id: string) { return (cfg.value.qualities || []).find((q: any) => q.id === id)?.label ?? id; }
function pct(v: number) { return Math.round((Number(v) || 0) * 100); }

const tiersText = computed<string>({
  get: () => ((cfg.value.prosperity?.tiers) || []).join(', '),
  set: (v: string) => {
    const arr = v.split(/[,，]/).map((s) => Number(s.trim())).filter((n) => Number.isFinite(n));
    cfg.value.prosperity.tiers = arr;
  },
});

function setComboMin(e: Event) {
  const min = Number((e.target as HTMLInputElement).value) || 0;
  cfg.value.combo.windowMs = Math.round(min * 60000);
}
function growMin(c: any) { return Math.round((c.growSec || 0) / 60); }
function setGrowMin(c: any, e: Event) {
  c.growSec = Math.round((Number((e.target as HTMLInputElement).value) || 0) * 60);
}
function setPct(c: any, e: Event) {
  c.jadeChance = (Number((e.target as HTMLInputElement).value) || 0) / 100;
}
function quotesText(c: any) { return (c.quotes || []).join('\n'); }
function setQuotes(c: any, e: Event) {
  const v = (e.target as HTMLTextAreaElement).value;
  c.quotes = v.split('\n').map((s) => s.trim()).filter(Boolean);
}

function addWeather() {
  cfg.value.weathers.push({ key: 'w' + Date.now(), icon: '✨', name: '新天象', desc: '收获 +5%', bonus: 0.05, jadeExtra: 0 });
}
function addLucky() {
  cfg.value.luckyEvents.push({ emoji: '🎁', text: '新的奇遇', gold: 10, pearl: 0, magic: 0 });
}

/* ---------- 预览计算 ---------- */
const variantTotal = computed(() => pct((cfg.value.variants || []).reduce((s: number, v: any) => s + (Number(v?.rate) || 0), 0)));
function baseOf(q: string) {
  const c = (cfg.value.crops || []).find((x: any) => x.quality === q);
  if (!c) return '—';
  const parts = [`${c.base.gold} 元宝`, `${c.base.pearl} 灵珠`];
  if (c.base.magic) parts.push(`${c.base.magic} 魔丸`);
  if (c.jadeChance) parts.push(`${pct(c.jadeChance)}% 天玑`);
  return `${parts.join(' + ')} · ${growMin(c)} 分钟 · EXP ${c.exp}`;
}
const stackedGold = computed(() => {
  const c = (cfg.value.crops || []).find((x: any) => x.quality === 'rare');
  if (!c) return 0;
  const m = 1 + (cfg.value.fertility.yieldCoef || 0) + (cfg.value.prosperity.yieldCoef || 0)
    + (cfg.value.combo.cap || 0) + (cfg.value.moodBonus || 0)
    + (cfg.value.fengshuiMainBonus || 0) + (cfg.value.codexElementBonus || 0);
  return Math.floor(c.base.gold * m);
});
const payback = computed(() => {
  const c = (cfg.value.crops || []).find((x: any) => x.quality === 'rare');
  if (!c) return '—';
  const min = growMin(c);
  const h = Math.floor(min / 60), mm = min % 60;
  return `${h ? h + ' 小时 ' : ''}${mm ? mm + ' 分' : ''}（成本 ${JSON.stringify(cfg.value.shop.seed?.rare || {})}）`;
});
</script>

<style scoped>
.farm-ed { display: flex; flex-direction: column; gap: 18px; }
.blk { border: 1px solid #e6e9f2; border-radius: 14px; padding: 14px; background: #fff; display: flex; flex-direction: column; gap: 12px; }
.blk-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.blk-head b { font-size: 15px; color: #2c3140; }
.hint { font-size: 11px; color: #9aa1b3; }
.sub { font-size: 12px; font-weight: 600; color: #6b7180; display: flex; align-items: center; gap: 10px; }

.param-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
.param { display: flex; flex-direction: column; gap: 3px; font-size: 12px; color: #5a6072; border: 1px solid #eef1f8; border-radius: 10px; padding: 8px; }
.param.grow2 { grid-column: span 2; }
.param .pk { font-weight: 600; color: #3a4150; }
.param input { border: 1px solid #dde2ee; border-radius: 8px; padding: 6px 8px; font-size: 13px; box-sizing: border-box; }
.param .ph { font-size: 10px; color: #aab; }
.param.warnp { border-color: #f0c27a; background: #fff8ec; }
.param.warnp .ph { color: #c98a2a; }

/* 五行关系 */
.rel-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 10px; }
.rel { display: flex; align-items: center; gap: 8px; border: 1px solid #eef1f8; border-radius: 10px; padding: 8px 10px; flex-wrap: wrap; }
.rel b { font-size: 13px; width: 24px; flex: none; }
.rel-arrow { font-size: 11px; color: #9aa1b3; }
.rel label { font-size: 10px; color: #6b7180; display: flex; flex-direction: column; gap: 2px; }
.rel input, .rel select { border: 1px solid #dde2ee; border-radius: 7px; padding: 4px 6px; font-size: 12px; width: 62px; box-sizing: border-box; }
.rel select { width: 56px; }
.el-gold { color: #c9a227; } .el-wood { color: #4a8f5b; } .el-water { color: #3f7fbf; }
.el-fire { color: #c9553d; } .el-earth { color: #8a7350; }

/* 作物卡片 */
.crop-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }
.crop { border: 1px solid #eef1f8; border-radius: 12px; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
.crop-head { display: flex; align-items: center; gap: 8px; }
.crop-emo { width: 34px; height: 34px; border-radius: 50%; background: #f6f8fc; display: grid; place-items: center; font-size: 18px; flex: none; }
.crop-head input.em { width: 46px; text-align: center; }
.crop-head input.nm { flex: 1; min-width: 0; }
.crop-head input { border: 1px solid #dde2ee; border-radius: 8px; padding: 5px 7px; font-size: 12.5px; box-sizing: border-box; }
.crop-tag { font-size: 10px; color: #9aa1b3; flex: none; }
.crop-nums { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.crop-nums label { font-size: 10px; color: #6b7180; display: flex; flex-direction: column; gap: 2px; }
.crop-nums input { border: 1px solid #dde2ee; border-radius: 7px; padding: 4px 6px; font-size: 12px; box-sizing: border-box; }
.crop-quote { display: flex; flex-direction: column; gap: 3px; }
.wc-title { font-size: 10px; color: #8a90a0; }
.crop-quote textarea { border: 1px solid #dde2ee; border-radius: 8px; padding: 5px 7px; font-size: 12px; line-height: 1.5; resize: vertical; font-family: inherit; box-sizing: border-box; }
.crop-quote textarea:focus { outline: none; border-color: #6e8efb; }
.crop-gold { border-left: 3px solid #e8c860; } .crop-wood { border-left: 3px solid #7cc08a; }
.crop-water { border-left: 3px solid #7cb0e0; } .crop-fire { border-left: 3px solid #e08a72; }
.crop-earth { border-left: 3px solid #c0a880; }

/* 价目 */
.price-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 10px; }
.price { border: 1px solid #eef1f8; border-radius: 10px; padding: 8px 10px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.price b { font-size: 12px; color: #3a4150; flex: none; }
.price label { font-size: 10px; color: #6b7180; display: flex; flex-direction: column; gap: 2px; }
.price input { border: 1px solid #dde2ee; border-radius: 7px; padding: 4px 6px; font-size: 12px; width: 56px; box-sizing: border-box; }

/* 列表 */
.ms-list { display: flex; flex-direction: column; gap: 10px; }
.ms { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)) 36px; gap: 8px; align-items: end; border: 1px solid #eef1f8; border-radius: 10px; padding: 10px; }
.ms label { font-size: 11px; color: #6b7180; display: flex; flex-direction: column; gap: 3px; }
.ms label.grow { grid-column: 1 / -1; }
.ms label.warnp input { border-color: #f0c27a; background: #fff8ec; }
.ms input { border: 1px solid #dde2ee; border-radius: 8px; padding: 6px 8px; font-size: 13px; box-sizing: border-box; }
.ms input.em { width: 52px; text-align: center; }
.ms input.ro { background: #f4f6fa; color: #9aa1b3; }
.add { border: 1px solid #6e8efb; color: #6e8efb; background: #fff; border-radius: 8px; padding: 4px 10px; font-size: 12px; cursor: pointer; }
.del { border: 1px solid #e6c0c0; color: #c96; background: #fff; border-radius: 8px; cursor: pointer; height: 32px; }
.note { font-size: 11px; color: #9aa1b3; }

/* 预览 */
.preview .pv { display: flex; flex-direction: column; gap: 8px; }
.pv-item { display: flex; gap: 10px; align-items: baseline; font-size: 13px; border-bottom: 1px dashed #eef1f8; padding-bottom: 6px; flex-wrap: wrap; }
.pv-item b { width: 130px; color: #6b7180; font-weight: 600; flex: none; }
.pv-item span { color: #3a4150; }
</style>
