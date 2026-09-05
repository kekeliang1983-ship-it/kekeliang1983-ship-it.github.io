<!--
  src/admin/editors/CheckinEditor.vue —— 七日灵签（签到）可视化后台
  开放：补签花费、七日递增奖励曲线（含签文）、累计里程碑（永不重置长线）。
  经济定位：签到日均≈92元宝，覆盖竞速付费75+种子+干粮，形成输血闭环。
-->
<template>
  <div class="editor">
    <div class="ed-head">
      <div class="ed-title">📿 七日灵签</div>
      <div class="ed-sub">签到全参外置 · 改完保存即生效（App 刷新拉取）</div>
    </div>

    <div class="ed-body">
      <!-- ① 全局 -->
      <section class="ed-sec">
        <h4>① 补签设置</h4>
        <div class="ed-grid">
          <label class="ed-field"><span>补签花费(元宝)</span><input type="number" v-model.number="cfg.makeupCost" /></label>
        </div>
      </section>

      <!-- ② 七日曲线 -->
      <section class="ed-sec">
        <h4>② 七日递增奖励曲线</h4>
        <div class="ed-list">
          <div class="ed-row ed-row-head">
            <span>第N天</span><span>元宝</span><span>灵珠</span><span>魔丸</span><span>天玑</span><span>签文</span><span></span>
          </div>
          <div class="ed-row" v-for="(d, i) in cfg.days" :key="d.day">
            <input type="number" v-model.number="d.day" class="w-day" />
            <input type="number" v-model.number="d.reward.gold" />
            <input type="number" v-model.number="d.reward.pearl" />
            <input type="number" v-model.number="d.reward.magic" />
            <input type="number" v-model.number="d.reward.jade" />
            <input v-model="d.quote" class="w-quote" />
            <button class="ed-del" @click="cfg.days.splice(i, 1)">✕</button>
          </div>
          <button class="ed-add" @click="addDay()">+ 新增一天</button>
        </div>
      </section>

      <!-- ③ 累计里程碑 -->
      <section class="ed-sec">
        <h4>③ 累计签到里程碑（永不重置长线进度）</h4>
        <div class="ed-list">
          <div class="ed-row ed-row-head">
            <span>累计天数</span><span>元宝</span><span>灵珠</span><span>魔丸</span><span>天玑</span><span>标题/emoji</span><span></span>
          </div>
          <div class="ed-row" v-for="(m, i) in cfg.milestones" :key="m.days">
            <input type="number" v-model.number="m.days" class="w-day" />
            <input type="number" v-model.number="m.reward.gold" />
            <input type="number" v-model.number="m.reward.pearl" />
            <input type="number" v-model.number="m.reward.magic" />
            <input type="number" v-model.number="m.reward.jade" />
            <div class="w-title">
              <input v-model="m.emoji" class="e-emoji" />
              <input v-model="m.title" class="e-title" />
            </div>
            <button class="ed-del" @click="cfg.milestones.splice(i, 1)">✕</button>
          </div>
          <button class="ed-add" @click="addMilestone()">+ 新增里程碑</button>
        </div>
      </section>

      <!-- ④ 即时预览 -->
      <section class="ed-sec">
        <h4>④ 即时预览</h4>
        <div class="ed-preview">
          <div>补签花费：<b>{{ cfg.makeupCost }}</b> 元宝</div>
          <div>七日曲线：<b>{{ cfg.days.length }}</b> 天 · 日均元宝约 <b>{{ avgGold }}</b></div>
          <div>累计里程碑：<b>{{ cfg.milestones.length }}</b> 档（最高 {{ maxDays }} 天）</div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';

const props = defineProps<{ data: any }>();
const cfg = computed(() => props.data);

function addDay() {
  const next = (cfg.value.days && cfg.value.days.length) ? cfg.value.days[cfg.value.days.length - 1].day + 1 : 1;
  cfg.value.days.push({ day: next, reward: { gold: 50 }, quote: '签文待填' });
}
function addMilestone() {
  const next = (cfg.value.milestones && cfg.value.milestones.length) ? cfg.value.milestones[cfg.value.milestones.length - 1].days + 10 : 10;
  cfg.value.milestones.push({ days: next, reward: { gold: 100 }, title: '新里程碑', emoji: '✨' });
}

const avgGold = computed(() => {
  const ds = cfg.value.days || [];
  if (!ds.length) return 0;
  const sum = ds.reduce((a: number, d: any) => a + (Number(d.reward?.gold) || 0), 0);
  return Math.round(sum / ds.length);
});
const maxDays = computed(() => {
  const ms = cfg.value.milestones || [];
  return ms.length ? Math.max(...ms.map((m: any) => m.days)) : 0;
});

// 自愈：缺字段补默认值，保证保存/预览不崩
watch(cfg, (c) => {
  const n = (v: any, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  c.makeupCost = n(c.makeupCost, 20);
  c.days = Array.isArray(c.days) ? c.days : [];
  c.days.forEach((d: any) => {
    d.day = n(d.day, 1);
    d.reward = d.reward && typeof d.reward === 'object' ? d.reward : {};
    d.quote = typeof d.quote === 'string' ? d.quote : '';
  });
  c.milestones = Array.isArray(c.milestones) ? c.milestones : [];
  c.milestones.forEach((m: any) => {
    m.days = n(m.days, 1);
    m.reward = m.reward && typeof m.reward === 'object' ? m.reward : {};
    m.title = typeof m.title === 'string' ? m.title : '';
    m.emoji = typeof m.emoji === 'string' ? m.emoji : '✨';
  });
}, { immediate: true, deep: false });
</script>

<style scoped>
.editor { display: flex; flex-direction: column; gap: 12px; }
.ed-head { padding: 4px 0 8px; border-bottom: 1px solid var(--bg-card-strong); }
.ed-title { font-size: 18px; font-weight: 800; }
.ed-sub { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.ed-body { display: flex; flex-direction: column; gap: 16px; }
.ed-sec h4 { margin: 0 0 8px; font-size: 14px; font-weight: 700; }
.ed-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.ed-field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--text-muted); }
.ed-field input { padding: 6px 8px; border-radius: 8px; border: 1px solid var(--bg-card-strong); background: var(--bg-card); color: var(--text); }
.ed-list { display: flex; flex-direction: column; gap: 6px; }
.ed-row { display: grid; grid-template-columns: 64px 80px 80px 80px 80px 1fr 32px; gap: 8px; align-items: center; }
.ed-row-head { font-size: 11px; color: var(--text-muted); font-weight: 700; }
.ed-row input { padding: 5px 7px; border-radius: 7px; border: 1px solid var(--bg-card-strong); background: var(--bg-card); color: var(--text); }
.w-day { text-align: center; }
.w-quote { width: 100%; }
.w-title { display: flex; gap: 4px; }
.e-emoji { width: 36px; text-align: center; }
.e-title { flex: 1; }
.ed-del { border: none; background: transparent; color: #E0913A; cursor: pointer; font-size: 14px; }
.ed-add { align-self: flex-start; margin-top: 4px; padding: 5px 12px; border-radius: 8px; border: 1px dashed var(--bg-card-strong); background: transparent; color: var(--growth); cursor: pointer; }
.ed-preview { display: flex; flex-direction: column; gap: 4px; padding: 10px 12px; border-radius: 10px; background: var(--bg-card); font-size: 13px; color: var(--text-muted); }
.ed-preview b { color: var(--text); }
</style>
