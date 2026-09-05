<!--
  src/admin/editors/RaceEditor.vue —— 竞速玩法可视化后台
  对齐全量 raceConfig：场次/定价/封顶、赛道轮换、五行生克、赛事事件、互扔道具、
  名次奖励、逆袭彩头、BOT名、安慰文案。改动经内容层接缝实时生效（App 刷新即拉 race.json）。
-->
<template>
  <div class="editor">
    <div class="ed-head">
      <div class="ed-title">🏁 仙宠竞速</div>
      <div class="ed-sub">全量参数外置 · 改完保存即生效（App 刷新拉取）</div>
    </div>

    <div class="ed-body">
      <!-- ① 场次与定价 -->
      <section class="ed-sec">
        <h4>① 场次与定价 / 封顶</h4>
        <div class="ed-grid">
          <label class="ed-field"><span>每日免费场</span><input type="number" v-model.number="cfg.dailyFree" /></label>
          <label class="ed-field"><span>付费每场(元宝)</span><input type="number" v-model.number="cfg.paidCost" /></label>
          <label class="ed-field"><span>每日付费上限</span><input type="number" v-model.number="cfg.paidDailyLimit" /></label>
          <label class="ed-field"><span>同宠冷却(ms)</span><input type="number" v-model.number="cfg.cooldownMs" /></label>
          <label class="ed-field"><span>基础速度</span><input type="number" step="0.001" v-model.number="cfg.baseSpeed" /></label>
          <label class="ed-field"><span>强制结束(ms)</span><input type="number" v-model.number="cfg.maxMs" /></label>
          <label class="ed-field"><span>每日元宝封顶</span><input type="number" v-model.number="cfg.dailyGoldCap" /></label>
          <label class="ed-field"><span>每日灵珠封顶</span><input type="number" v-model.number="cfg.dailyPearlCap" /></label>
          <label class="ed-field"><span>事件节奏(ms)</span><input type="number" v-model.number="cfg.eventEveryMs" /></label>
          <label class="ed-field"><span>道具节奏(ms)</span><input type="number" v-model.number="cfg.targetedEveryMs" /></label>
        </div>
      </section>

      <!-- ② 赛道轮换 -->
      <section class="ed-sec">
        <h4>② 赛道五行轮换顺序</h4>
        <p class="ed-hint">按天轮换（金木水火土各守一天）。逗号分隔，顺序即轮换顺序。</p>
        <input class="ed-text" v-model="trackOrderText" placeholder="wood,fire,earth,gold,water" />
      </section>

      <!-- ②½ 赛道皮肤 -->
      <section class="ed-sec">
        <h4>②½ 赛道皮肤（按日轮换 · 视觉+全局修正）</h4>
        <p class="ed-hint">speedMult 全员速度（雪原 0.92 略慢 / 星河 1.1 略快）；eventRateMult 事件密度（雪原 1.4 更密集易翻盘）。bg 留空用默认。</p>
        <div class="ed-list">
          <div class="ed-row ed-row-head"><span>Emoji</span><span>名称</span><span>速度倍率</span><span>事件密度</span><span>背景CSS</span><span></span></div>
          <div class="ed-row ed-row-skin" v-for="(t, i) in cfg.tracks" :key="t.id">
            <input v-model="t.emoji" class="w-emoji" />
            <input v-model="t.name" />
            <input type="number" step="0.01" v-model.number="t.speedMult" />
            <input type="number" step="0.01" v-model.number="t.eventRateMult" />
            <input v-model="t.bg" placeholder="linear-gradient(...)" class="w-bg" />
            <button class="ed-del" @click="cfg.tracks.splice(i, 1)">✕</button>
          </div>
          <button class="ed-add" @click="addTrack()">+ 新增皮肤</button>
        </div>
      </section>

      <!-- ③ 五行生克（只读参考，从 trackOrder 推导无意义，这里给编辑入口） -->
      <section class="ed-sec">
        <h4>③ 五行相生 / 相克</h4>
        <div class="ed-kv" v-for="el in elements" :key="el">
          <b>{{ elLabel[el] }}</b>
          <label class="ed-inline">生 →
            <select v-model="cfg.engender[el]">
              <option v-for="t in elements" :key="t" :value="t">{{ elLabel[t] }}</option>
            </select>
          </label>
          <label class="ed-inline">克 →
            <select v-model="cfg.restrain[el]">
              <option v-for="t in elements" :key="t" :value="t">{{ elLabel[t] }}</option>
            </select>
          </label>
        </div>
      </section>

      <!-- ④ 赛道事件 -->
      <section class="ed-sec">
        <h4>④ 赛道事件（作用于自己）</h4>
        <div class="ed-list">
          <div class="ed-row ed-row-head"><span>Emoji</span><span>名称</span><span>速度倍率</span><span>时长ms</span><span>权重</span><span></span></div>
          <div class="ed-row" v-for="(e, i) in cfg.events" :key="e.id">
            <input v-model="e.emoji" class="w-emoji" />
            <input v-model="e.label" />
            <input type="number" step="0.01" v-model.number="e.mult" />
            <input type="number" v-model.number="e.durMs" />
            <input type="number" v-model.number="e.weight" />
            <button class="ed-del" @click="cfg.events.splice(i, 1)">✕</button>
          </div>
          <button class="ed-add" @click="addEvent()">+ 新增事件</button>
        </div>
      </section>

      <!-- ⑤ 互扔道具 -->
      <section class="ed-sec">
        <h4>⑤ 互扔道具（作用于对手）</h4>
        <div class="ed-list">
          <div class="ed-row ed-row-head"><span>道具</span><span>名称</span><span>命中倍率</span><span>时长ms</span><span>目标</span><span></span></div>
          <div class="ed-row" v-for="(t, i) in cfg.targeted" :key="t.id">
            <input v-model="t.emoji" class="w-emoji" />
            <input v-model="t.label" />
            <input type="number" step="0.01" v-model.number="t.mult" />
            <input type="number" v-model.number="t.durMs" />
            <select v-model="t.target"><option value="leader">领先者</option><option value="tail">落后者</option></select>
            <button class="ed-del" @click="cfg.targeted.splice(i, 1)">✕</button>
          </div>
          <button class="ed-add" @click="addTargeted()">+ 新增道具</button>
        </div>
      </section>

      <!-- ⑥ 名次奖励 -->
      <section class="ed-sec">
        <h4>⑥ 名次奖励（末名含安慰礼）</h4>
        <div class="ed-grid">
          <div class="ed-rank" v-for="n in 6" :key="n">
            <b>第{{ n }}名</b>
            <label class="ed-inline">元宝<input type="number" v-model.number="cfg.rankRewards[n].gold" /></label>
            <label class="ed-inline">灵珠<input type="number" v-model.number="cfg.rankRewards[n].pearl" /></label>
            <label class="ed-inline" v-if="n === 6">安慰<input type="checkbox" v-model="cfg.rankRewards[n].comfort" /></label>
          </div>
        </div>
        <div class="ed-line"><span>逆袭彩头(元宝)</span><input type="number" v-model.number="cfg.upsetBonus.gold" /></div>
      </section>

      <!-- ⑦ 素材池 -->
      <section class="ed-sec">
        <h4>⑦ 机器人名 / 安慰文案</h4>
        <label class="ed-block">机器人名（每行一个，山海经风，不与五宠撞名）</label>
        <textarea class="ed-area" v-model="botNamesText" rows="5"></textarea>
        <label class="ed-block">末名安慰文案（每行一条）</label>
        <textarea class="ed-area" v-model="comfortText" rows="5"></textarea>
      </section>

      <!-- ⑦½ 天气系统 -->
      <section class="ed-sec">
        <h4>⑦½ 天气系统（按日轮换 · 与皮肤/五行正交）</h4>
        <p class="ed-hint">speedMult 全员速度（顺风 1.08 / 细雨 0.94）· eventRateMult 事件密度（雷暴 1.3 天天事变）。bg 留空用默认。</p>
        <div class="ed-list">
          <div class="ed-row ed-row-head"><span>Emoji</span><span>名称</span><span>速度倍率</span><span>事件密度</span><span>背景CSS</span><span></span></div>
          <div class="ed-row ed-row-skin" v-for="(w, i) in cfg.weather" :key="w.id">
            <input v-model="w.emoji" class="w-emoji" />
            <input v-model="w.name" />
            <input type="number" step="0.01" v-model.number="w.speedMult" />
            <input type="number" step="0.01" v-model.number="w.eventRateMult" />
            <input v-model="w.bg" placeholder="linear-gradient(...)" class="w-bg" />
            <button class="ed-del" @click="cfg.weather.splice(i, 1)">✕</button>
          </div>
          <button class="ed-add" @click="addWeather()">+ 新增天气</button>
        </div>
      </section>

      <!-- ⑦⅔ 连击 / 结阵 -->
      <section class="ed-sec">
        <h4>⑦⅔ 连击 / 同元素结阵</h4>
        <p class="ed-hint">连击：连续触发正向自身事件，每层 +comboStep 加成（封顶 comboMax 层）。结阵：某元素 ≥2 只同场，该元素全体 baseSpeed ×teamBuffMult。</p>
        <div class="ed-grid">
          <label class="ed-field"><span>连击每层加成</span><input type="number" step="0.01" v-model.number="cfg.comboStep" /></label>
          <label class="ed-field"><span>连击封顶层数</span><input type="number" v-model.number="cfg.comboMax" /></label>
          <label class="ed-field"><span>结阵倍率</span><input type="number" step="0.01" v-model.number="cfg.teamBuffMult" /></label>
        </div>
      </section>

      <!-- ⑧ 即时预览 -->
      <section class="ed-sec">
        <h4>⑧ 即时预览</h4>
        <div class="ed-preview">
          <div>每日：免费 <b>{{ cfg.dailyFree }}</b> 场 · 付费上限 <b>{{ cfg.paidDailyLimit }}</b> 场（每场 {{ cfg.paidCost }} 元宝）</div>
          <div>每日封顶：元宝 <b>{{ cfg.dailyGoldCap }}</b> · 灵珠 <b>{{ cfg.dailyPearlCap }}</b></div>
          <div>赛道顺序：<b>{{ cfg.trackOrder.join(' → ') }}</b></div>
          <div>赛道皮肤 <b>{{ cfg.tracks.length }}</b> 款 · 天气 <b>{{ cfg.weather.length }}</b> 款 · 赛事事件 <b>{{ cfg.events.length }}</b> 条 · 互扔道具 <b>{{ cfg.targeted.length }}</b> 条</div>
          <div>机器人 <b>{{ cfg.botNames.length }}</b> 个 · 安慰文案 <b>{{ cfg.comfortLines.length }}</b> 条</div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';

const props = defineProps<{ data: any }>();
const cfg = computed(() => props.data);

const elements: string[] = ['gold', 'wood', 'water', 'fire', 'earth'];
const elLabel: Record<string, string> = { gold: '金', wood: '木', water: '水', fire: '火', earth: '土' };

const trackOrderText = computed<string>({
  get: () => (cfg.value.trackOrder || []).join(','),
  set: (v: string) => {
    const arr = v.split(',').map((s) => s.trim()).filter(Boolean);
    cfg.value.trackOrder = arr;
  },
});
const botNamesText = computed<string>({
  get: () => (cfg.value.botNames || []).join('\n'),
  set: (v: string) => { cfg.value.botNames = v.split('\n').map((s) => s.trim()).filter(Boolean); },
});
const comfortText = computed<string>({
  get: () => (cfg.value.comfortLines || []).join('\n'),
  set: (v: string) => { cfg.value.comfortLines = v.split('\n').map((s) => s.trim()).filter(Boolean); },
});

function addEvent() {
  cfg.value.events.push({ id: 'ev' + Date.now(), emoji: '✨', label: '新事件', mult: 1.1, durMs: 1200, weight: 2 });
}
function addTargeted() {
  cfg.value.targeted.push({ id: 'tp' + Date.now(), emoji: '🪨', label: '新道具', mult: 0.6, durMs: 1300, weight: 2, target: 'leader', hitEmoji: '💥' });
}
function addTrack() {
  cfg.value.tracks.push({ id: 'trk' + Date.now(), emoji: '🌟', name: '新赛道', speedMult: 1, eventRateMult: 1, bg: '' });
}
function addWeather() {
  cfg.value.weather.push({ id: 'wth' + Date.now(), emoji: '🌈', name: '新天气', speedMult: 1, eventRateMult: 1, bg: '' });
}

// 自愈：缺字段补默认值，保证保存/预览不崩
watch(cfg, (c) => {
  const n = (v: any, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  c.dailyFree = n(c.dailyFree, 5);
  c.paidCost = n(c.paidCost, 15);
  c.paidDailyLimit = n(c.paidDailyLimit, 5);
  c.cooldownMs = n(c.cooldownMs, 3000);
  c.baseSpeed = n(c.baseSpeed, 0.05);
  c.maxMs = n(c.maxMs, 32000);
  c.dailyGoldCap = n(c.dailyGoldCap, 200);
  c.dailyPearlCap = n(c.dailyPearlCap, 40);
  c.eventEveryMs = n(c.eventEveryMs, 1100);
  c.targetedEveryMs = n(c.targetedEveryMs, 2600);
  c.trackOrder = Array.isArray(c.trackOrder) && c.trackOrder.length ? c.trackOrder : ['wood', 'fire', 'earth', 'gold', 'water'];
  c.engender = c.engender && typeof c.engender === 'object' ? c.engender : {};
  c.restrain = c.restrain && typeof c.restrain === 'object' ? c.restrain : {};
  c.events = Array.isArray(c.events) ? c.events : [];
  c.targeted = Array.isArray(c.targeted) ? c.targeted : [];
  c.rankRewards = c.rankRewards && typeof c.rankRewards === 'object' ? c.rankRewards : {};
  for (let i = 1; i <= 6; i++) {
    if (!c.rankRewards[i]) c.rankRewards[i] = { gold: 0, pearl: 0, comfort: i === 6 };
  }
  c.upsetBonus = c.upsetBonus && typeof c.upsetBonus.gold === 'number' ? c.upsetBonus : { gold: 15 };
  c.botNames = Array.isArray(c.botNames) ? c.botNames : [];
  c.comfortLines = Array.isArray(c.comfortLines) ? c.comfortLines : [];
  c.tracks = Array.isArray(c.tracks) && c.tracks.length ? c.tracks : [];
  c.weather = Array.isArray(c.weather) && c.weather.length ? c.weather : [];
  c.comboStep = n(c.comboStep, 0.08);
  c.comboMax = n(c.comboMax, 3);
  c.teamBuffMult = n(c.teamBuffMult, 1.04);
}, { immediate: true, deep: false });
</script>

<style scoped>
.editor { display: flex; flex-direction: column; gap: 12px; }
.ed-head { padding: 4px 0 8px; border-bottom: 1px solid var(--bg-card-strong); }
.ed-title { font-size: 18px; font-weight: 800; }
.ed-sub { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.ed-body { display: flex; flex-direction: column; gap: 16px; }
.ed-sec h4 { margin: 0 0 8px; font-size: 14px; font-weight: 700; }
.ed-hint { font-size: 12px; color: var(--text-muted); margin: 0 0 6px; }
.ed-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.ed-field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--text-muted); }
.ed-field input { padding: 6px 8px; border-radius: 8px; border: 1px solid var(--bg-card-strong); background: var(--bg-card); color: var(--text); }
.ed-text { width: 100%; padding: 8px; border-radius: 8px; border: 1px solid var(--bg-card-strong); background: var(--bg-card); color: var(--text); }
.ed-kv { display: flex; gap: 16px; align-items: center; margin-bottom: 6px; font-size: 13px; }
.ed-inline { display: inline-flex; gap: 4px; align-items: center; font-size: 12px; color: var(--text-muted); }
.ed-inline input, .ed-inline select { padding: 3px 6px; border-radius: 6px; border: 1px solid var(--bg-card-strong); background: var(--bg-card); color: var(--text); }
.ed-list { display: flex; flex-direction: column; gap: 6px; }
.ed-row { display: grid; grid-template-columns: 56px 1fr 90px 90px 80px 32px; gap: 8px; align-items: center; }
.ed-row-skin { grid-template-columns: 56px 1fr 90px 90px 1.4fr 32px; }
.w-bg { min-width: 0; }
.ed-row-head { font-size: 11px; color: var(--text-muted); font-weight: 700; }
.ed-row input, .ed-row select { padding: 5px 7px; border-radius: 7px; border: 1px solid var(--bg-card-strong); background: var(--bg-card); color: var(--text); }
.w-emoji { text-align: center; font-size: 18px; }
.ed-del { border: none; background: transparent; color: #E0913A; cursor: pointer; font-size: 14px; }
.ed-add { align-self: flex-start; margin-top: 4px; padding: 5px 12px; border-radius: 8px; border: 1px dashed var(--bg-card-strong); background: transparent; color: var(--growth); cursor: pointer; }
.ed-rank { display: flex; flex-direction: column; gap: 4px; padding: 8px; border-radius: 10px; background: var(--bg-card); font-size: 12px; }
.ed-line { display: flex; gap: 8px; align-items: center; margin-top: 8px; font-size: 12px; color: var(--text-muted); }
.ed-line input { width: 90px; padding: 5px 7px; border-radius: 7px; border: 1px solid var(--bg-card-strong); background: var(--bg-card); color: var(--text); }
.ed-block { font-size: 12px; color: var(--text-muted); margin: 8px 0 4px; }
.ed-area { width: 100%; padding: 8px; border-radius: 8px; border: 1px solid var(--bg-card-strong); background: var(--bg-card); color: var(--text); font-family: inherit; resize: vertical; }
.ed-preview { display: flex; flex-direction: column; gap: 4px; padding: 10px 12px; border-radius: 10px; background: var(--bg-card); font-size: 13px; color: var(--text-muted); }
.ed-preview b { color: var(--text); }
</style>
