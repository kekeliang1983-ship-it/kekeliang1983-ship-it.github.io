<template>
  <div class="art-ed">
    <!-- ===================== ① 全局参数 ===================== -->
    <section class="blk">
      <div class="blk-head">
        <b>① 全局参数</b>
        <span class="hint">法器系统通用旋钮，改一处全链路生效（与 App 运行态进度严格分离）</span>
      </div>
      <div class="param-grid">
        <label class="param" :class="{ warnp: cfg.params.maxLevel < 1 || cfg.params.maxLevel > 10 }">
          <span class="pk">满级等级</span>
          <input type="number" min="1" step="1" v-model.number="cfg.params.maxLevel" />
          <span class="ph" v-if="cfg.params.maxLevel < 1 || cfg.params.maxLevel > 10">⚠ 建议 1~10 级（过低无成长、过高刷本疲劳）</span>
          <span class="ph" v-else>每件法器最高可升到的等级</span>
        </label>
      </div>
    </section>

    <!-- ===================== ② 法器本体（含立绘） ===================== -->
    <section class="blk">
      <div class="blk-head">
        <div class="ch-l">
          <b>② 法器本体</b>
          <span class="hint">固定 5 件 · id 唯一不可改 · 可上传立绘（留空回退 emoji）· 名称/emoji/定位语全可调</span>
        </div>
      </div>

      <div class="art" v-for="(a, i) in cfg.artifacts" :key="i">
        <ImageField
          :model-value="a.image"
          :label="`${a.name || a.id} · 立绘`"
          :upload-name="`artifact_${a.id || 'new' + i}`"
          :max-dim="512"
          :quality="0.85"
          @update:model-value="(v: string) => (a.image = v)"
        />
        <div class="art-fields">
          <label>id<input v-model="a.id" disabled class="ro" /></label>
          <label>名称<input v-model="a.name" placeholder="如 招财铃" /></label>
          <label>emoji<input v-model="a.emoji" class="em" maxlength="2" /></label>
          <label class="grow">一句话定位<textarea v-model="a.blurb" rows="1" placeholder="hero 副标题"></textarea></label>
        </div>
      </div>
    </section>

    <!-- ===================== ③ 解锁条件 ===================== -->
    <section class="blk">
      <div class="blk-head">
        <b>③ 解锁条件</b>
        <span class="hint">每件法器对应一个成就门槛；达成即永久解锁，可自由装备</span>
      </div>
      <div class="unlock" v-for="(a, i) in cfg.artifacts" :key="i">
        <div class="u-head"><span class="u-ic">{{ a.emoji }}</span><b>{{ a.name || a.id }}</b></div>
        <div class="u-fields">
          <label class="grow">解锁文案<textarea v-model="a.unlockText" rows="1" placeholder="如 灵植收获满 10 次解锁"></textarea></label>
          <label>进度来源
            <select v-model="a.unlockKey">
              <option value="harvest">灵植收获</option>
              <option value="onlineSec">累计在线(秒)</option>
              <option value="defend">守护灵田</option>
              <option value="musicListen">天籁聆听(秒)</option>
              <option value="overflow">情绪瓶满溢</option>
            </select>
          </label>
          <label>门槛值<input type="number" min="0" v-model.number="a.unlockThreshold" /></label>
          <label class="chk"><input type="checkbox" v-model="a.onlineOnly" /> 需联机开放</label>
        </div>
      </div>
    </section>

    <!-- ===================== ④ 升级消耗 ===================== -->
    <section class="blk">
      <div class="blk-head">
        <b>④ 升级消耗</b>
        <span class="hint">碎片经济：每级消耗 / 每次掉落，塞满即升一级</span>
      </div>
      <div class="param-grid">
        <label class="param">
          <span class="pk">每级升级消耗碎片</span>
          <input type="number" min="1" step="1" v-model.number="cfg.params.upgradeFrag" />
          <span class="ph">集满该数量碎片可升 1 级</span>
        </label>
        <label class="param">
          <span class="pk">每次掉落碎片数</span>
          <input type="number" min="1" step="1" v-model.number="cfg.params.fragPerDrop" />
          <span class="ph">达成来源事件时掉落的碎片量</span>
        </label>
      </div>
    </section>

    <!-- ===================== ⑤ 效果系数 ===================== -->
    <section class="blk">
      <div class="blk-head">
        <b>⑤ 效果系数</b>
        <span class="hint">结构化效果（可序列化、可旋钮调参）。wired=✅ 表示已真接入游戏数值：招财铃(元宝)/聚灵碗(灵气)/空灵笛(魔丸)/轮回珠(灵珠) 均已实时生效，改系数 App 立即响应；结界符为联机后开启，单机不生效</span>
      </div>
      <div class="eff" v-for="(a, i) in cfg.artifacts" :key="i">
        <div class="e-head"><span class="e-ic">{{ a.emoji }}</span><b>{{ a.name || a.id }}</b></div>
        <div class="e-fields">
          <label class="grow">效果标签<textarea v-model="a.effect.label" rows="1" placeholder="如 灵田元宝产出"></textarea></label>
          <label>增益归属
            <select v-model="a.effect.metric">
              <option value="gold">灵田元宝(gold)</option>
              <option value="qiSpeed">灵气恢复(qiSpeed)</option>
              <option value="defend">守护灵田(defend)</option>
              <option value="magicPellet">天籁魔丸(magicPellet)</option>
              <option value="bottlePearl">情绪瓶灵珠(bottlePearl)</option>
            </select>
          </label>
          <label>增益形态
            <select v-model="a.effect.mode" @change="onModeChange(a)">
              <option value="percent">百分比 +%</option>
              <option value="mult">倍率 ×</option>
              <option value="flat">固定值 +</option>
            </select>
          </label>
          <label>每级增量
            <input type="number" step="0.01" v-model.number="a.effect.perLevel" :title="a.effect.mode === 'percent' ? '0.10 = +10%/级' : a.effect.mode === 'mult' ? '1 = +1/级' : '1 = +1/级'" />
          </label>
          <label v-if="a.effect.mode === 'mult'">基准(base)
            <input type="number" step="0.1" v-model.number="a.effect.base" title="mult 形态：最终 = base + 每级增量×级" />
          </label>
          <label class="chk"><input type="checkbox" v-model="a.effect.negative" /> 减益式增益(−)</label>
          <label class="chk"><input type="checkbox" v-model="a.effect.wired" /> 已真接入游戏 ✅</label>
        </div>
        <div class="e-prev">预览（满级）：{{ fmt(a.effect, cfg.params.maxLevel) }}</div>
      </div>
    </section>

    <!-- ===================== ⑥ 即时预览 ===================== -->
    <section class="blk preview">
      <div class="blk-head">
        <b>⑥ 即时预览</b>
        <span class="hint">保存前核对：满级 / 升级消耗 / 5 件效果文案（1 级与满级）</span>
      </div>
      <div class="pv">
        <div class="pv-item"><b>满级等级</b><span :class="{ red: cfg.params.maxLevel < 1 || cfg.params.maxLevel > 10 }">{{ cfg.params.maxLevel }} 级</span></div>
        <div class="pv-item"><b>升级消耗</b><span>{{ cfg.params.upgradeFrag }} 碎片/级 · 掉落 {{ cfg.params.fragPerDrop }} 枚/次</span></div>
        <div class="pv-item" v-for="a in cfg.artifacts" :key="a.id">
          <b>{{ a.emoji }} {{ a.name }}</b>
          <span>
            <span :class="{ wired: a.effect.wired }">{{ fmt(a.effect, 1) }}</span>
            <span class="pv-max"> · 满级 {{ fmt(a.effect, cfg.params.maxLevel) }}</span>
            <span v-if="a.onlineOnly" class="pv-on"> · 联机开放</span>
          </span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import ImageField from '../components/ImageField.vue';
import { formatArtifactEffect } from '@/stores/index';

const props = defineProps<{ data: any }>();
// 空值容错：父级数据未就绪时按空结构渲染，避免整页白屏
const cfg = computed<any>(() => props.data ?? { params: {}, artifacts: [] });

/** 自愈：补默认参数/对象，防止编辑器中 v-model 到 undefined 抛错白屏 */
watch(
  cfg,
  (c: any) => {
    if (!c || typeof c !== 'object') return;
    if (!c.params || typeof c.params !== 'object') c.params = {};
    const P = c.params;
    if (typeof P.maxLevel !== 'number') P.maxLevel = 5;
    if (typeof P.upgradeFrag !== 'number') P.upgradeFrag = 3;
    if (typeof P.fragPerDrop !== 'number') P.fragPerDrop = 1;

    if (!Array.isArray(c.artifacts)) c.artifacts = [];
    c.artifacts.forEach((a: any) => {
      if (!a || typeof a !== 'object') return;
      a.id = a.id || 'new';
      a.name = a.name || '';
      a.emoji = a.emoji || '🔮';
      a.image = a.image || '';
      a.blurb = a.blurb || '';
      a.unlockText = a.unlockText || '';
      a.unlockKey = a.unlockKey || 'harvest';
      a.unlockThreshold = typeof a.unlockThreshold === 'number' ? a.unlockThreshold : 1;
      a.fragSource = a.fragSource || '';
      a.onlineOnly = typeof a.onlineOnly === 'boolean' ? a.onlineOnly : false;
      if (!a.effect || typeof a.effect !== 'object') a.effect = {};
      const e = a.effect;
      e.metric = e.metric || 'gold';
      e.label = e.label || '';
      e.mode = e.mode || 'percent';
      e.perLevel = typeof e.perLevel === 'number' ? e.perLevel : 0.1;
      if (typeof e.base !== 'number') e.base = 1;
      e.negative = typeof e.negative === 'boolean' ? e.negative : false;
      e.wired = typeof e.wired === 'boolean' ? e.wired : false;
    });
  },
  { immediate: true, deep: false },
);

/** mult 形态切换时，把 base 拉回默认 1，避免残留脏值 */
function onModeChange(a: any) {
  if (a.effect.mode === 'mult' && typeof a.effect.base !== 'number') a.effect.base = 1;
}

/** 预览文案：level + 满级 */
function fmt(e: any, level: number): string {
  return formatArtifactEffect(e, level, cfg.value.params.maxLevel || 5);
}
</script>

<style scoped>
.art-ed { display: flex; flex-direction: column; gap: 18px; }
.blk { border: 1px solid #e6e9f2; border-radius: 14px; padding: 14px; background: #fff; display: flex; flex-direction: column; gap: 12px; }
.blk-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.blk-head b { font-size: 15px; color: #2c3140; }
.hint { font-size: 11px; color: #9aa1b3; }
.ch-l { display: flex; flex-direction: column; }

.param-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
.param { display: flex; flex-direction: column; gap: 3px; font-size: 12px; color: #5a6072; border: 1px solid #eef1f8; border-radius: 10px; padding: 8px; }
.param .pk { font-weight: 600; color: #3a4150; }
.param input { border: 1px solid #dde2ee; border-radius: 8px; padding: 6px 8px; font-size: 13px; box-sizing: border-box; }
.param .ph { font-size: 10px; color: #aab; }
.param.warnp { border-color: #f0c27a; background: #fff8ec; }
.param.warnp .ph { color: #c98a2a; }

/* 法器本体卡 */
.art { display: flex; gap: 14px; border: 1px solid #eef1f8; border-radius: 12px; padding: 12px; align-items: flex-start; flex-wrap: wrap; }
.art-fields { flex: 1; display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; align-items: end; min-width: 240px; }
.art-fields label { font-size: 12px; color: #6b7180; display: flex; flex-direction: column; gap: 3px; }
.art-fields label.grow { grid-column: 1 / -1; }
.art-fields input, .art-fields textarea { border: 1px solid #dde2ee; border-radius: 8px; padding: 6px 8px; font-size: 13px; box-sizing: border-box; }
.art-fields .em { width: 56px; text-align: center; }
.art-fields .ro { background: #f4f6fa; color: #9aa1b3; }

/* 解锁条件卡 */
.unlock { border: 1px solid #eef1f8; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.u-head { display: flex; align-items: center; gap: 8px; }
.u-ic { font-size: 20px; }
.u-head b { font-size: 13px; color: #3a4150; }
.u-fields { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; align-items: end; }
.u-fields label { font-size: 12px; color: #6b7180; display: flex; flex-direction: column; gap: 3px; }
.u-fields label.grow { grid-column: 1 / -1; }
.u-fields input, .u-fields select, .u-fields textarea { border: 1px solid #dde2ee; border-radius: 8px; padding: 6px 8px; font-size: 13px; box-sizing: border-box; }
.u-fields .chk { flex-direction: row; align-items: center; gap: 5px; }

/* 效果系数卡 */
.eff { border: 1px solid #eef1f8; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.e-head { display: flex; align-items: center; gap: 8px; }
.e-ic { font-size: 20px; }
.e-head b { font-size: 13px; color: #3a4150; }
.e-fields { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; align-items: end; }
.e-fields label { font-size: 12px; color: #6b7180; display: flex; flex-direction: column; gap: 3px; }
.e-fields label.grow { grid-column: 1 / -1; }
.e-fields input, .e-fields select, .e-fields textarea { border: 1px solid #dde2ee; border-radius: 8px; padding: 6px 8px; font-size: 13px; box-sizing: border-box; }
.e-fields .chk { flex-direction: row; align-items: center; gap: 5px; }
.e-prev { font-size: 12px; color: #6b7180; background: #f7f9fc; border-radius: 8px; padding: 6px 10px; }
.e-prev b { color: #3a4150; }

/* 即时预览 */
.preview .pv { display: flex; flex-direction: column; gap: 8px; }
.pv-item { display: flex; gap: 10px; align-items: baseline; font-size: 13px; border-bottom: 1px dashed #eef1f8; padding-bottom: 6px; }
.pv-item b { width: 130px; color: #6b7180; font-weight: 600; flex: none; }
.pv-item span.red { color: #e67e22; font-weight: 600; }
.pv-item .wired { color: #16a34a; font-weight: 600; }
.pv-item .pv-max { color: #9aa1b3; }
.pv-item .pv-on { color: #6e8efb; font-weight: 600; }
</style>
