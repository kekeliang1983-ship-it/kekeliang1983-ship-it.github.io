<template>
  <div class="bottle-ed">
    <!-- ===================== ① 情绪瓶全局参数 ===================== -->
    <section class="blk">
      <div class="blk-head">
        <b>① 情绪瓶 · 全局参数</b>
        <span class="hint">容量 / 每日上限 / 心境加成（与 App 运行态进度严格分离，改完即存）</span>
      </div>
      <div class="param-grid">
        <label class="param" :class="{ warnp: cfg.bottle.maxCapacity < 1 || cfg.bottle.maxCapacity > 99 }">
          <span class="pk">瓶容量</span>
          <input type="number" min="1" max="99" step="1" v-model.number="cfg.bottle.maxCapacity" />
          <span class="ph" v-if="cfg.bottle.maxCapacity < 1 || cfg.bottle.maxCapacity > 99">⚠ 建议 1~99 颗</span>
          <span class="ph" v-else>瓶子装满触发「灵光乍现」的颗数</span>
        </label>
        <label class="param" :class="{ warnp: cfg.bottle.dailyLimit < 1 || cfg.bottle.dailyLimit > 10 }">
          <span class="pk">每日可投上限</span>
          <input type="number" min="1" max="10" step="1" v-model.number="cfg.bottle.dailyLimit" />
          <span class="ph" v-if="cfg.bottle.dailyLimit < 1 || cfg.bottle.dailyLimit > 10">⚠ 建议 1~10 次</span>
          <span class="ph" v-else>每天 0 点刷新的免费投入次数（不含小三元返还）</span>
        </label>
        <label class="param">
          <span class="pk">投入心境 +</span>
          <input type="number" min="0" step="1" v-model.number="cfg.bottle.moodPerDrop" />
          <span class="ph">每收入一颗情绪球提升的心境值</span>
        </label>
        <label class="param">
          <span class="pk">放流心境 +</span>
          <input type="number" min="0" step="1" v-model.number="cfg.bottle.moodPerDriftOut" />
          <span class="ph">放流一只漂流瓶提升的心境值</span>
        </label>
        <label class="param">
          <span class="pk">读信心境 +</span>
          <input type="number" min="0" step="1" v-model.number="cfg.bottle.moodPerLetterRead" />
          <span class="ph">首次读陌生人暖语提升的心境值</span>
        </label>
      </div>
    </section>

    <!-- ===================== ② 八种情绪球 + 瓶背景图 ===================== -->
    <section class="blk">
      <div class="blk-head">
        <b>② 八种情绪灵球</b>
        <span class="hint">固定 8 种全可调 · id 唯一不可改 · emoji/名称/主色/浅色全可改 · 大瓶主视觉支持背景图上传</span>
      </div>

      <ImageField
        :model-value="cfg.bottle.bottleImage"
        label="大瓶主视觉背景图"
        upload-name="bottle_bg"
        :max-dim="640"
        :quality="0.8"
        @update:model-value="(v: string) => (cfg.bottle.bottleImage = v)"
      />

      <div class="emo-grid">
        <div class="emo" v-for="e in cfg.bottle.emotions" :key="e.type">
          <div class="emo-prev" :style="{ background: e.light, borderColor: e.color }">{{ e.emoji }}</div>
          <div class="emo-fields">
            <label class="ro">id<input v-model="e.type" disabled class="ro" /></label>
            <label>名称<input v-model="e.label" maxlength="4" placeholder="如 喜" /></label>
            <label>emoji<input v-model="e.emoji" class="em" maxlength="4" placeholder="😊" /></label>
            <label>主色<input v-model="e.color" class="clr" placeholder="#E8B84B" /></label>
            <label>浅色<input v-model="e.light" class="clr" placeholder="#F7E3B0" /></label>
          </div>
        </div>
      </div>
    </section>

    <!-- ===================== ③ 满溢产出 ===================== -->
    <section class="blk">
      <div class="blk-head">
        <b>③ 满溢「灵光乍现」产出</b>
        <span class="hint">瓶子装满领取的奖励；jadeChance 为额外天玑概率（0~1）</span>
      </div>
      <div class="param-grid">
        <label class="param">
          <span class="pk">灵珠</span>
          <input type="number" min="0" step="1" v-model.number="cfg.bottle.overflow.pearl" />
          <span class="ph">满溢固定给的灵珠数</span>
        </label>
        <label class="param">
          <span class="pk">魔丸</span>
          <input type="number" min="0" step="1" v-model.number="cfg.bottle.overflow.magic" />
          <span class="ph">满溢固定给的魔丸数</span>
        </label>
        <label class="param" :class="{ warnp: cfg.bottle.overflow.jadeChance < 0 || cfg.bottle.overflow.jadeChance > 1 }">
          <span class="pk">天玑概率</span>
          <input type="number" min="0" max="1" step="0.05" v-model.number="cfg.bottle.overflow.jadeChance" />
          <span class="ph" v-if="cfg.bottle.overflow.jadeChance < 0 || cfg.bottle.overflow.jadeChance > 1">⚠ 取值 0~1</span>
          <span class="ph" v-else>额外获得稀有货币「天玑」×1 的概率</span>
        </label>
      </div>
    </section>

    <!-- ===================== ④ 小三元 + 中途里程碑 ===================== -->
    <section class="blk">
      <div class="blk-head">
        <b>④ 小三元 & 中途里程碑</b>
        <span class="hint">小三元彩蛋标签与触发概率；中途里程碑把长跑切成多段（可任意增删）</span>
      </div>
      <div class="param-grid">
        <label class="param">
          <span class="pk">小三元标签</span>
          <input v-model="cfg.bottle.tripleLabel" maxlength="6" placeholder="小三元" />
          <span class="ph">彩蛋名称（展示用）</span>
        </label>
        <label class="param" :class="{ warnp: cfg.bottle.tripleThemeChance < 0 || cfg.bottle.tripleThemeChance > 1 }">
          <span class="pk">小三元触发概率</span>
          <input type="number" min="0" max="1" step="0.05" v-model.number="cfg.bottle.tripleThemeChance" />
          <span class="ph" v-if="cfg.bottle.tripleThemeChance < 0 || cfg.bottle.tripleThemeChance > 1">⚠ 取值 0~1</span>
          <span class="ph" v-else>今日第 3 颗同为主题情绪的概率（直接触发）</span>
        </label>
      </div>

      <div class="ms-list">
        <div class="ms-head">
          <b>中途「小灵光」里程碑</b>
          <button class="add" @click="addMilestone">＋ 加一档</button>
        </div>
        <div class="ms" v-for="(m, i) in cfg.bottle.milestones" :key="i">
          <label>满<input type="number" min="1" step="1" v-model.number="m.at" />颗</label>
          <label>灵珠<input type="number" min="0" step="1" v-model.number="m.pearl" /></label>
          <label>心境<input type="number" min="0" step="1" v-model.number="m.mood" /></label>
          <label class="grow">文案<textarea v-model="m.text" rows="1" placeholder="如 瓶底泛起微光…"></textarea></label>
          <button class="del" @click="cfg.bottle.milestones.splice(i, 1)">✕</button>
        </div>
      </div>
    </section>

    <!-- ===================== ⑤ 漂流瓶参数 ===================== -->
    <section class="blk">
      <div class="blk-head">
        <b>⑤ 漂流瓶 · 参数</b>
        <span class="hint">每日放流/捞起上限、信箱容量、读信掉落概率与奖励池</span>
      </div>
      <div class="param-grid">
        <label class="param">
          <span class="pk">每日放流上限</span>
          <input type="number" min="0" max="10" step="1" v-model.number="cfg.drift.sendDaily" />
        </label>
        <label class="param">
          <span class="pk">每日捞起上限</span>
          <input type="number" min="0" max="10" step="1" v-model.number="cfg.drift.pickDaily" />
        </label>
        <label class="param">
          <span class="pk">信箱容量</span>
          <input type="number" min="1" max="200" step="1" v-model.number="cfg.drift.inboxMax" />
        </label>
        <label class="param" :class="{ warnp: cfg.drift.rewardChance < 0 || cfg.drift.rewardChance > 1 }">
          <span class="pk">读信掉落概率</span>
          <input type="number" min="0" max="1" step="0.05" v-model.number="cfg.drift.rewardChance" />
          <span class="ph" v-if="cfg.drift.rewardChance < 0 || cfg.drift.rewardChance > 1">⚠ 取值 0~1</span>
        </label>
        <label class="param" :class="{ warnp: cfg.drift.rewardDoubleChance < 0 || cfg.drift.rewardDoubleChance > 1 }">
          <span class="pk">追加第二份概率</span>
          <input type="number" min="0" max="1" step="0.05" v-model.number="cfg.drift.rewardDoubleChance" />
          <span class="ph" v-if="cfg.drift.rewardDoubleChance < 0 || cfg.drift.rewardDoubleChance > 1">⚠ 取值 0~1</span>
        </label>
      </div>

      <div class="ms-list">
        <div class="ms-head">
          <b>奖励池（加权随机）</b>
          <button class="add" @click="addReward">＋ 加一项</button>
        </div>
        <div class="ms" v-for="(p, i) in cfg.drift.rewardPool" :key="i">
          <label>种类
            <select v-model="p.kind">
              <option value="gold">元宝</option>
              <option value="magic">魔丸</option>
              <option value="pearl">灵珠</option>
            </select>
          </label>
          <label>权重<input type="number" min="1" step="1" v-model.number="p.weight" /></label>
          <label>最少<input type="number" min="0" step="1" v-model.number="p.min" /></label>
          <label>最多<input type="number" min="0" step="1" v-model.number="p.max" /></label>
          <button class="del" @click="cfg.drift.rewardPool.splice(i, 1)">✕</button>
        </div>
      </div>
    </section>

    <!-- ===================== ⑥ 暖语库编辑 ===================== -->
    <section class="blk">
      <div class="blk-head">
        <b>⑥ 漂流暖语库</b>
        <span class="hint">按情绪分池，每情绪含「共鸣向 / 托举向」两句群；一行一句，留空行自动忽略</span>
      </div>
      <div class="warm" v-for="e in cfg.bottle.emotions" :key="e.type">
        <div class="warm-head">
          <span class="warm-ic" :style="{ background: e.light, borderColor: e.color }">{{ e.emoji }}</span>
          <b>{{ e.label }} · {{ e.type }}</b>
        </div>
        <div class="warm-grid">
          <div class="warm-col">
            <span class="wc-title">共鸣向（resonate）</span>
            <textarea
              rows="6"
              :value="ww(e.type, 'resonate')"
              @input="setWw(e.type, 'resonate', ($event.target as HTMLTextAreaElement).value)"
              placeholder="一行一句：我也曾…"
            ></textarea>
          </div>
          <div class="warm-col">
            <span class="wc-title">托举向（lift）</span>
            <textarea
              rows="6"
              :value="ww(e.type, 'lift')"
              @input="setWw(e.type, 'lift', ($event.target as HTMLTextAreaElement).value)"
              placeholder="一行一句：你已经…"
            ></textarea>
          </div>
        </div>
      </div>

      <div class="warm">
        <div class="warm-head">
          <span class="warm-ic">🌊</span>
          <b>通用兜底池（generic）</b>
        </div>
        <div class="warm-grid">
          <div class="warm-col">
            <span class="wc-title">无明确情绪时回落</span>
            <textarea
              rows="6"
              :value="genericText"
              @input="genericText = ($event.target as HTMLTextAreaElement).value"
              placeholder="一行一句"
            ></textarea>
          </div>
        </div>
      </div>
    </section>

    <!-- ===================== ⑦ 即时预览 ===================== -->
    <section class="blk preview">
      <div class="blk-head">
        <b>⑦ 即时预览</b>
        <span class="hint">保存前核对：容量 / 满溢产出 / 每日上限 / 小三元 / 里程碑档数 / 暖语条数</span>
      </div>
      <div class="pv">
        <div class="pv-item"><b>瓶容量</b><span>{{ cfg.bottle.maxCapacity }} 颗 · 每日 {{ cfg.bottle.dailyLimit }} 次 · 心境+{{ cfg.bottle.moodPerDrop }}/投</span></div>
        <div class="pv-item"><b>满溢产出</b><span>灵珠×{{ cfg.bottle.overflow.pearl }} · 魔丸×{{ cfg.bottle.overflow.magic }} · 天玑概率 {{ Math.round(cfg.bottle.overflow.jadeChance * 100) }}%</span></div>
        <div class="pv-item"><b>小三元</b><span>{{ cfg.bottle.tripleLabel }} · 触发概率 {{ Math.round(cfg.bottle.tripleThemeChance * 100) }}%</span></div>
        <div class="pv-item"><b>中途里程碑</b><span>{{ cfg.bottle.milestones.length }} 档：{{ cfg.bottle.milestones.map((m:any)=>m.at).join(' / ') || '无' }}</span></div>
        <div class="pv-item"><b>漂流瓶</b><span>放流 {{ cfg.drift.sendDaily }}/日 · 捞起 {{ cfg.drift.pickDaily }}/日 · 信箱 {{ cfg.drift.inboxMax }} · 掉落 {{ Math.round(cfg.drift.rewardChance * 100) }}%</span></div>
        <div class="pv-item"><b>暖语条数</b><span>{{ warmCount }} 句（8 情绪共鸣/托举 + 通用兜底）</span></div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import ImageField from '../components/ImageField.vue';

const props = defineProps<{ data: any }>();
const cfg = computed<any>(() => props.data ?? { bottle: {}, drift: {} });

/** 自愈：补默认结构，防止编辑器中 v-model 到 undefined 抛错白屏 */
watch(
  cfg,
  (c: any) => {
    if (!c || typeof c !== 'object') return;
    if (!c.bottle || typeof c.bottle !== 'object') c.bottle = {};
    if (!c.drift || typeof c.drift !== 'object') c.drift = {};
    const B = c.bottle, D = c.drift;
    if (typeof B.maxCapacity !== 'number') B.maxCapacity = 30;
    if (typeof B.dailyLimit !== 'number') B.dailyLimit = 3;
    if (typeof B.moodPerDrop !== 'number') B.moodPerDrop = 2;
    if (typeof B.moodPerDriftOut !== 'number') B.moodPerDriftOut = 1;
    if (typeof B.moodPerLetterRead !== 'number') B.moodPerLetterRead = 1;
    if (!B.overflow || typeof B.overflow !== 'object') B.overflow = {};
    if (typeof B.overflow.pearl !== 'number') B.overflow.pearl = 30;
    if (typeof B.overflow.magic !== 'number') B.overflow.magic = 10;
    if (typeof B.overflow.jadeChance !== 'number') B.overflow.jadeChance = 0.3;
    if (typeof B.tripleLabel !== 'string') B.tripleLabel = '小三元';
    if (typeof B.tripleThemeChance !== 'number') B.tripleThemeChance = 0.35;
    if (!Array.isArray(B.milestones)) B.milestones = [];
    B.milestones.forEach((m: any) => {
      m.at = typeof m?.at === 'number' ? m.at : 10;
      m.pearl = typeof m?.pearl === 'number' ? m.pearl : 5;
      m.mood = typeof m?.mood === 'number' ? m.mood : 3;
      m.text = m?.text ?? '';
    });
    if (!Array.isArray(B.emotions)) B.emotions = [];
    B.emotions.forEach((e: any) => {
      e.type = e.type || 'calm';
      e.label = e.label || '';
      e.emoji = e.emoji || '❔';
      e.color = e.color || '#999999';
      e.light = e.light || '#eeeeee';
    });
    if (typeof B.bottleImage !== 'string') B.bottleImage = '';

    if (typeof D.sendDaily !== 'number') D.sendDaily = 1;
    if (typeof D.pickDaily !== 'number') D.pickDaily = 1;
    if (typeof D.inboxMax !== 'number') D.inboxMax = 30;
    if (typeof D.rewardChance !== 'number') D.rewardChance = 0.7;
    if (typeof D.rewardDoubleChance !== 'number') D.rewardDoubleChance = 0.25;
    if (!Array.isArray(D.rewardPool)) D.rewardPool = [];
    D.rewardPool.forEach((p: any) => {
      p.kind = p?.kind || 'gold';
      p.weight = typeof p?.weight === 'number' ? p.weight : 1;
      p.min = typeof p?.min === 'number' ? p.min : 1;
      p.max = typeof p?.max === 'number' ? p.max : 1;
    });
    if (!D.rewardMeta || typeof D.rewardMeta !== 'object') D.rewardMeta = {};
    if (!D.warmWords || typeof D.warmWords !== 'object') D.warmWords = {};
    B.emotions.forEach((e: any) => {
      if (!D.warmWords[e.type] || typeof D.warmWords[e.type] !== 'object') D.warmWords[e.type] = { resonate: [], lift: [] };
      const w = D.warmWords[e.type];
      if (!Array.isArray(w.resonate)) w.resonate = [];
      if (!Array.isArray(w.lift)) w.lift = [];
    });
    if (!Array.isArray(D.generic)) D.generic = [];
  },
  { immediate: true, deep: false },
);

function addMilestone() {
  const last = cfg.value.bottle.milestones.length
    ? cfg.value.bottle.milestones[cfg.value.bottle.milestones.length - 1].at
    : 0;
  cfg.value.bottle.milestones.push({ at: last + 10, pearl: 5, mood: 3, text: '' });
}
function addReward() {
  cfg.value.drift.rewardPool.push({ kind: 'gold', weight: 1, min: 1, max: 2 });
}

/** 暖语数组 <-> 多行文本 */
function ww(type: string, kind: 'resonate' | 'lift'): string {
  const arr = cfg.value.drift.warmWords?.[type]?.[kind] || [];
  return arr.join('\n');
}
function setWw(type: string, kind: 'resonate' | 'lift', text: string) {
  const arr = text.split('\n').map((s) => s.trim()).filter(Boolean);
  if (!cfg.value.drift.warmWords[type]) cfg.value.drift.warmWords[type] = { resonate: [], lift: [] };
  cfg.value.drift.warmWords[type][kind] = arr;
}

/** 通用兜底池多行文本（computed 双向） */
const genericText = computed<string>({
  get: () => (cfg.value.drift.generic || []).join('\n'),
  set: (v: string) => {
    cfg.value.drift.generic = v.split('\n').map((s) => s.trim()).filter(Boolean);
  },
});

const warmCount = computed(() => {
  let n = (cfg.value.drift.generic || []).length;
  const ww2 = cfg.value.drift.warmWords || {};
  for (const k in ww2) {
    n += (ww2[k].resonate?.length || 0) + (ww2[k].lift?.length || 0);
  }
  return n;
});
</script>

<style scoped>
.bottle-ed { display: flex; flex-direction: column; gap: 18px; }
.blk { border: 1px solid #e6e9f2; border-radius: 14px; padding: 14px; background: #fff; display: flex; flex-direction: column; gap: 12px; }
.blk-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.blk-head b { font-size: 15px; color: #2c3140; }
.hint { font-size: 11px; color: #9aa1b3; }

.param-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
.param { display: flex; flex-direction: column; gap: 3px; font-size: 12px; color: #5a6072; border: 1px solid #eef1f8; border-radius: 10px; padding: 8px; }
.param .pk { font-weight: 600; color: #3a4150; }
.param input { border: 1px solid #dde2ee; border-radius: 8px; padding: 6px 8px; font-size: 13px; box-sizing: border-box; }
.param .ph { font-size: 10px; color: #aab; }
.param.warnp { border-color: #f0c27a; background: #fff8ec; }
.param.warnp .ph { color: #c98a2a; }

/* 情绪球 */
.emo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.emo { display: flex; gap: 12px; border: 1px solid #eef1f8; border-radius: 12px; padding: 12px; align-items: flex-start; }
.emo-prev { width: 52px; height: 52px; border-radius: 50%; border: 2px solid; display: grid; place-items: center; font-size: 24px; flex: none; }
.emo-fields { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; align-items: end; }
.emo-fields label { font-size: 11px; color: #6b7180; display: flex; flex-direction: column; gap: 3px; }
.emo-fields input { border: 1px solid #dde2ee; border-radius: 8px; padding: 5px 7px; font-size: 12px; box-sizing: border-box; }
.emo-fields .em { width: 48px; text-align: center; }
.emo-fields .clr { font-family: monospace; }
.emo-fields .ro, .emo-fields input.ro { background: #f4f6fa; color: #9aa1b3; }

/* 里程碑 / 奖励池 */
.ms-list { display: flex; flex-direction: column; gap: 10px; }
.ms-head { display: flex; align-items: center; justify-content: space-between; }
.ms-head b { font-size: 13px; color: #3a4150; }
.ms { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)) 40px; gap: 10px; align-items: end; border: 1px solid #eef1f8; border-radius: 10px; padding: 10px; }
.ms label { font-size: 11px; color: #6b7180; display: flex; flex-direction: column; gap: 3px; }
.ms label.grow { grid-column: 1 / -1; }
.ms input, .ms select, .ms textarea { border: 1px solid #dde2ee; border-radius: 8px; padding: 6px 8px; font-size: 13px; box-sizing: border-box; }
.add { border: 1px solid #6e8efb; color: #6e8efb; background: #fff; border-radius: 8px; padding: 5px 10px; font-size: 12px; cursor: pointer; }
.del { border: 1px solid #e6c0c0; color: #c96; background: #fff; border-radius: 8px; cursor: pointer; height: 32px; }

/* 暖语库 */
.warm { border: 1px solid #eef1f8; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.warm-head { display: flex; align-items: center; gap: 8px; }
.warm-ic { width: 34px; height: 34px; border-radius: 50%; border: 2px solid; display: grid; place-items: center; font-size: 18px; flex: none; }
.warm-head b { font-size: 13px; color: #3a4150; }
.warm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.warm-col { display: flex; flex-direction: column; gap: 4px; }
.wc-title { font-size: 11px; color: #8a90a0; }
.warm-col textarea { border: 1px solid #dde2ee; border-radius: 10px; padding: 8px 10px; font-size: 12.5px; line-height: 1.6; resize: vertical; font-family: inherit; box-sizing: border-box; }
.warm-col textarea:focus { outline: none; border-color: #6e8efb; }

/* 即时预览 */
.preview .pv { display: flex; flex-direction: column; gap: 8px; }
.pv-item { display: flex; gap: 10px; align-items: baseline; font-size: 13px; border-bottom: 1px dashed #eef1f8; padding-bottom: 6px; }
.pv-item b { width: 110px; color: #6b7180; font-weight: 600; flex: none; }
.pv-item span { color: #3a4150; }
</style>
