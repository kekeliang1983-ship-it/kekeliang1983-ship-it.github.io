<template>
  <div class="home-ed">
    <!-- ===== 一、首页最下层底图 ===== -->
    <fieldset class="blk">
      <legend>一、首页最下层底图</legend>
      <p class="tip">铺满整个首页视口、沉在所有内容之下。留空则用 App 内置渐变底。</p>
      <ImageField v-model="b.image" label="底图（建议 ≥1170×2530，或 1920×1080 通用）" upload-name="home_bg" :max-dim="1920" />
      <div class="row two">
        <label>不透明度 {{ b.opacity ?? 1 }}
          <input type="range" min="0" max="1" step="0.05" :value="b.opacity ?? 1" @input="setNum('opacity', $event)" />
        </label>
        <label>模糊 {{ b.blur ?? 0 }} px
          <input type="range" min="0" max="20" step="1" :value="b.blur ?? 0" @input="setNum('blur', $event)" />
        </label>
      </div>
    </fieldset>

    <!-- ===== 二、今日心语 ===== -->
    <fieldset class="blk">
      <legend>二、今日心语</legend>
      <div class="row two">
        <label>标题<input v-model="q.title" placeholder="今日心语" /></label>
        <label>换一句按钮文案<input v-model="q.refreshText" placeholder="换一句" /></label>
      </div>
      <ImageField v-model="q.cardImage" label="心语卡背景图（留空用内置渐变）" upload-name="home_quote_card" :max-dim="1400" />
      <ImageField v-model="q.flowerImage" label="动态漂浮物（留空用内置 SVG 花朵；建议透明底 PNG）" upload-name="home_quote_flower" :max-dim="600" />
      <p class="tip">漂浮物沿用 <code>.quote-flower</code> 类名，换成图片后 GSAP 漂浮动画照常生效。</p>
    </fieldset>

    <!-- ===== 三、7 大版块白卡 ===== -->
    <fieldset class="blk">
      <legend>三、7 大版块白卡</legend>
      <p class="tip">每个版块可单独换「图标」和「白卡背景图」，留空分别回退内置 SVG 图标与玻璃渐变卡。</p>
      <div class="grid">
        <div class="card" v-for="ft in list" :key="ft.id">
          <div class="head">
            <span class="tag">{{ ft.id }}</span>
            <input class="nm" v-model="ft.name" placeholder="版块名" />
          </div>
          <ImageField v-model="ft.icon" label="图标" :upload-name="`home_icon_${ft.id}`" :max-dim="320" />
          <ImageField v-model="ft.cardImage" label="白卡背景图" :upload-name="`home_card_${ft.id}`" :max-dim="900" />
        </div>
      </div>
      <button class="reset" @click="resetFeatures">↺ 恢复默认 7 项</button>
    </fieldset>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import ImageField from '../components/ImageField.vue';

const props = defineProps<{ home: any }>();
const DEFAULT_IDS: Array<[string, string]> = [
  ['farm', '灵植'], ['music', '天籁'], ['pet', '仙宠'], ['gallery', '画境'],
  ['shrine', '神龛'], ['artifacts', '法器'], ['bottle', '情绪瓶'],
];

/** 空值容错：父级数据未就绪时按空对象渲染，避免整页白屏 */
const h = computed(() => props.home || {});
const b = computed(() => h.value.background || {});
const q = computed(() => h.value.quote || {});
const list = computed(() => (Array.isArray(h.value.features) ? h.value.features : []));

// 自愈：保证 background / quote / features 三段结构存在，
// 使编辑器不依赖调用方先做规范化（未配置时也直接可编辑、可保存）。
watch(
  h,
  (val: any) => {
    if (!val || typeof val !== 'object') return;
    if (!val.background) val.background = {};
    if (!val.quote) val.quote = {};
    if (!Array.isArray(val.features) || !val.features.length) {
      val.features = DEFAULT_IDS.map(([id, name]) => ({ id, name, icon: '', cardImage: '' }));
    }
    val.features.forEach((f: any) => {
      if (!f || typeof f !== 'object') return;
      if (typeof f.icon !== 'string') f.icon = '';
      if (typeof f.cardImage !== 'string') f.cardImage = '';
    });
  },
  { immediate: true, deep: false },
);

function setNum(key: 'opacity' | 'blur', e: Event) {
  const v = Number((e.target as HTMLInputElement).value);
  b.value[key] = Number.isFinite(v) ? v : (key === 'opacity' ? 1 : 0);
}

function resetFeatures() {
  h.value.features = DEFAULT_IDS.map(([id, name]) => ({ id, name, icon: '', cardImage: '' }));
}
</script>

<style scoped>
.home-ed { display: flex; flex-direction: column; gap: 18px; }
.blk { border: 1px solid #e6e9f2; border-radius: 14px; padding: 12px 16px 16px; background: #fff; margin: 0; }
legend { font-size: 13px; font-weight: 700; color: #3d4356; padding: 0 6px; }
.tip { font-size: 12px; color: #8a90a0; margin: 6px 0 10px; line-height: 1.6; }
.tip code { background: #f1f3f9; padding: 1px 5px; border-radius: 4px; font-size: 11px; }
.row { display: flex; flex-wrap: wrap; gap: 12px; }
.row.two { margin-top: 10px; }
.row.two > label { flex: 1; min-width: 180px; font-size: 12px; color: #8a90a0; display: flex; flex-direction: column; gap: 4px; }
.row.two input[type='range'] { width: 100%; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
.card { border: 1px solid #eef1f7; border-radius: 12px; padding: 10px; background: #fbfcfe; display: flex; flex-direction: column; gap: 10px; }
.head { display: flex; align-items: center; gap: 8px; }
.tag { font-size: 11px; color: #7a8092; background: #eef1f8; border-radius: 6px; padding: 2px 7px; flex: none; font-family: ui-monospace, Menlo, Consolas, monospace; }
.nm { flex: 1; border: 1px solid #dde2ee; border-radius: 8px; padding: 6px 8px; font-size: 13px; box-sizing: border-box; }
.reset { margin-top: 12px; align-self: flex-start; border: 1px solid #d6dcec; background: #fff; border-radius: 10px; padding: 7px 14px; font-size: 12px; cursor: pointer; color: #5a6070; }
.reset:hover { background: #f3f6fd; }
</style>
