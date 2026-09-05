<!--
  src/admin/editors/PoolEditor.vue —— 素材池（头像库 + 起名词库 + 五行底环色）可视化后台
  对齐全量 poolConfig：avatarPool(emoji+五行+名) / namePool(起名词库) / elementRing(五行底环渐变) / defaultRing(默认紫环)。
  改动经内容层接缝实时生效（App 刷新即拉 pool.json）。
-->
<template>
  <div class="editor">
    <div class="ed-head">
      <div class="ed-title">🎨 素材池</div>
      <div class="ed-sub">头像库 / 起名词库 / 五行底环色 全量外置 · 改完保存即生效（App 刷新拉取）</div>
    </div>

    <div class="ed-body">
      <!-- ① 头像库 -->
      <section class="ed-sec">
        <h4>① 头像库（emoji + 五行归属 + 中文名）</h4>
        <p class="ed-hint">共 {{ cfg.avatars.length }} 个。五行决定头像底环渐变色，建议五行均衡混搭。</p>
        <div class="ed-list">
          <div class="ed-row ed-row-head">
            <span>Emoji</span><span>五行</span><span>中文名</span><span></span>
          </div>
          <div class="ed-row" v-for="(a, i) in cfg.avatars" :key="i">
            <input v-model="a.emoji" class="w-emoji" maxlength="4" />
            <select v-model="a.element">
              <option v-for="el in elements" :key="el" :value="el">{{ elLabel[el] }}</option>
            </select>
            <input v-model="a.label" />
            <button class="ed-del" @click="cfg.avatars.splice(i, 1)">✕</button>
          </div>
          <button class="ed-add" @click="addAvatar()">+ 新增头像</button>
        </div>
      </section>

      <!-- ② 起名词库 -->
      <section class="ed-sec">
        <h4>② 起名赐名词库</h4>
        <p class="ed-hint">每行一个名字（2~8 字最佳），当前共 {{ cfg.names.length }} 个。随机起名均匀抽取且不与上次撞名。</p>
        <textarea class="ed-area" v-model="namesText" rows="12" placeholder="每行一个名字"></textarea>
      </section>

      <!-- ③ 五行底环色 -->
      <section class="ed-sec">
        <h4>③ 五行底环渐变（头像组件底环色）</h4>
        <div class="ed-grid">
          <div class="ed-ring" v-for="el in elements" :key="el">
            <b>{{ elLabel[el] }}</b>
            <div class="ed-ring-preview" :style="{ background: `linear-gradient(135deg, ${cfg.elementRing[el].from}, ${cfg.elementRing[el].to})` }"></div>
            <label class="ed-inline">起<input type="color" v-model="cfg.elementRing[el].from" /></label>
            <label class="ed-inline">止<input type="color" v-model="cfg.elementRing[el].to" /></label>
          </div>
        </div>
      </section>

      <!-- ④ 默认底环 -->
      <section class="ed-sec">
        <h4>④ 默认底环（未选五行 / 昵称首字态）</h4>
        <div class="ed-ring-preview lg" :style="{ background: `linear-gradient(135deg, ${cfg.defaultRing.from}, ${cfg.defaultRing.to})` }"></div>
        <div class="ed-inline">
          起<input type="color" v-model="cfg.defaultRing.from" />
          止<input type="color" v-model="cfg.defaultRing.to" />
        </div>
      </section>

      <!-- ⑤ 即时预览 -->
      <section class="ed-sec">
        <h4>⑤ 即时预览</h4>
        <div class="ed-preview">
          <div>头像库 <b>{{ cfg.avatars.length }}</b> 个 · 起名词库 <b>{{ cfg.names.length }}</b> 个</div>
          <div>五行分布：
            <span v-for="el in elements" :key="el" class="ed-tag">{{ elLabel[el] }} {{ countByElement(el) }}</span>
          </div>
          <div class="ed-preview-avatars">
            <div class="ed-pa" v-for="el in elements" :key="el"
                 :style="{ background: `linear-gradient(135deg, ${cfg.elementRing[el].from}, ${cfg.elementRing[el].to})` }">
              {{ firstAvatarEmoji(el) }}
            </div>
            <div class="ed-pa" :style="{ background: `linear-gradient(135deg, ${cfg.defaultRing.from}, ${cfg.defaultRing.to})` }">友</div>
          </div>
          <div class="ed-randline">
            随机赐名示例：<b>{{ randomSample }}</b>
            <button class="ed-rand" @click="rollName()">🎲 抽一个</button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

const props = defineProps<{ data: any }>();
const cfg = computed(() => props.data);

const elements: string[] = ['gold', 'wood', 'water', 'fire', 'earth'];
const elLabel: Record<string, string> = { gold: '金', wood: '木', water: '水', fire: '火', earth: '土' };

const namesText = computed<string>({
  get: () => (cfg.value.names || []).join('\n'),
  set: (v: string) => { cfg.value.names = v.split('\n').map((s) => s.trim()).filter(Boolean); },
});

const randomSample = ref('——');
function rollName() {
  const pool = cfg.value.names || [];
  randomSample.value = pool.length ? pool[Math.floor(Math.random() * pool.length)] : '（空）';
}
rollName();

function countByElement(el: string): number {
  return (cfg.value.avatars || []).filter((a: any) => a.element === el).length;
}

function firstAvatarEmoji(el: string): string {
  return (cfg.value.avatars || []).find((a: any) => a.element === el)?.emoji || '?';
}

function addAvatar() {
  cfg.value.avatars.push({ emoji: '✨', element: 'gold', label: '新符号' });
}

// 自愈：缺字段补默认值，保证保存/预览不崩
watch(cfg, (c) => {
  c.avatars = Array.isArray(c.avatars) ? c.avatars.map((a: any) => ({
    emoji: typeof a?.emoji === 'string' ? a.emoji : '',
    element: (a?.element ?? 'wood') as string,
    label: typeof a?.label === 'string' ? a.label : '',
  })) : [];
  c.names = Array.isArray(c.names) ? c.names.filter((n: any) => typeof n === 'string' && n.length) : [];
  c.elementRing = c.elementRing && typeof c.elementRing === 'object' ? c.elementRing : {};
  for (const el of elements) {
    if (!c.elementRing[el] || typeof c.elementRing[el].from !== 'string') {
      c.elementRing[el] = { from: '#D6EAF4', to: '#7FB8E0' };
    }
  }
  c.defaultRing = c.defaultRing && typeof c.defaultRing.from === 'string' ? c.defaultRing : { from: '#8A80D8', to: '#A39AE8' };
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
.ed-list { display: flex; flex-direction: column; gap: 6px; }
.ed-row { display: grid; grid-template-columns: 56px 90px 1fr 32px; gap: 8px; align-items: center; }
.ed-row-head { font-size: 11px; color: var(--text-muted); font-weight: 700; }
.ed-row input, .ed-row select { padding: 5px 7px; border-radius: 7px; border: 1px solid var(--bg-card-strong); background: var(--bg-card); color: var(--text); }
.w-emoji { text-align: center; font-size: 18px; }
.ed-del { border: none; background: transparent; color: #E0913A; cursor: pointer; font-size: 14px; }
.ed-add { align-self: flex-start; margin-top: 4px; padding: 5px 12px; border-radius: 8px; border: 1px dashed var(--bg-card-strong); background: transparent; color: var(--growth); cursor: pointer; }
.ed-area { width: 100%; padding: 8px; border-radius: 8px; border: 1px solid var(--bg-card-strong); background: var(--bg-card); color: var(--text); font-family: inherit; resize: vertical; }
.ed-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.ed-ring { display: flex; flex-direction: column; gap: 6px; padding: 10px; border-radius: 10px; background: var(--bg-card); font-size: 12px; }
.ed-ring-preview { width: 100%; height: 40px; border-radius: 10px; }
.ed-ring-preview.lg { width: 120px; height: 48px; margin-bottom: 6px; display: inline-block; vertical-align: middle; }
.ed-inline { display: inline-flex; gap: 4px; align-items: center; font-size: 12px; color: var(--text-muted); }
.ed-inline input[type="color"] { width: 32px; height: 24px; padding: 0; border: 1px solid var(--bg-card-strong); border-radius: 6px; background: transparent; }
.ed-preview { display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; border-radius: 10px; background: var(--bg-card); font-size: 13px; color: var(--text-muted); }
.ed-preview b { color: var(--text); }
.ed-tag { display: inline-block; margin-right: 8px; padding: 1px 6px; border-radius: 6px; background: rgba(0,0,0,.04); }
.ed-preview-avatars { display: flex; gap: 10px; margin-top: 4px; }
.ed-pa { width: 44px; height: 44px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 22px; color: #fff; box-shadow: 0 6px 14px rgba(0,0,0,.15); }
.ed-randline { margin-top: 6px; display: flex; align-items: center; gap: 10px; }
.ed-rand { padding: 4px 10px; border-radius: 8px; border: 1px dashed var(--bg-card-strong); background: transparent; color: var(--growth); cursor: pointer; font-size: 12px; }
</style>
