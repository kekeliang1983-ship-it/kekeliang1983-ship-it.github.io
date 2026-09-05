<template>
  <div class="jsoned">
    <div class="bar">
      <button class="fmt" @click="format">🧹 格式化</button>
      <span class="stat" :class="{ err }">{{ err ? 'JSON 解析错误' : '有效 JSON' }}</span>
    </div>
    <textarea
      ref="ta"
      :value="text"
      spellcheck="false"
      @input="onInput"
    ></textarea>
    <p class="tip">直接编辑 JSON 并点顶部「💾 保存」即可写回 public/content/{{ file }}.json。复杂嵌套配置推荐在此管理，App 侧消费接入见 #173。</p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{ data: any; file: string }>();
const emit = defineEmits<{ (e: 'update', v: any): void }>();

const ta = ref<HTMLTextAreaElement | null>(null);
const text = ref('');
const err = ref(false);

function syncFromData() {
  text.value = JSON.stringify(props.data, null, 2);
  err.value = false;
}
watch(() => props.data, syncFromData, { immediate: true, deep: true });

function onInput(e: Event) {
  const v = (e.target as HTMLTextAreaElement).value;
  text.value = v;
  try {
    const parsed = JSON.parse(v);
    err.value = false;
    emit('update', parsed);
  } catch {
    err.value = true;
  }
}

function format() {
  if (err.value) return;
  text.value = JSON.stringify(JSON.parse(text.value), null, 2);
}
</script>

<style scoped>
.jsoned { display: flex; flex-direction: column; gap: 8px; height: 100%; }
.bar { display: flex; align-items: center; gap: 10px; }
.fmt { border: 1px solid #d6dcec; background: #fff; border-radius: 8px; padding: 6px 12px; font-size: 12px; cursor: pointer; }
.stat { font-size: 12px; color: #5aa469; }
.stat.err { color: #c0392b; }
textarea {
  flex: 1;
  min-height: 420px;
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #dde2ee;
  border-radius: 10px;
  padding: 12px;
  font-family: 'SF Mono', Menlo, Consolas, monospace;
  font-size: 12.5px;
  line-height: 1.5;
  color: #2b2f38;
  resize: vertical;
  background: #fbfcfe;
}
.tip { font-size: 11px; color: #8a90a0; margin: 0; }
</style>
