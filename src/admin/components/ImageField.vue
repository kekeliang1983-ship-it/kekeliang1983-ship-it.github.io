<template>
  <div class="imgf">
    <div class="imgf-preview" :class="{ empty: !modelValue }" @click="pick">
      <img v-if="modelValue" :src="modelValue" :alt="label" />
      <span v-else class="ph">点击上传</span>
      <button v-if="modelValue" class="clear" title="清除" @click.stop="clear">✕</button>
    </div>
    <div class="imgf-ctrl">
      <label>{{ label }}</label>
      <!-- 方式一：本地上传（自动压缩后落盘） -->
      <div class="row">
        <button class="up" :disabled="busy" @click="pick">{{ busy ? '处理中…' : '📤 上传压缩图' }}</button>
        <span class="info" v-if="lastKb">≈ {{ lastKb }} KB</span>
      </div>
      <!-- 方式二：直接填外链 CDN 地址（不进包体，推荐用于大图/原图） -->
      <input class="url" :value="modelValue" placeholder="或粘贴外链图片 URL（如 https://cdn.x/xx.jpg）" @input="onUrl" />
      <p class="hint" v-if="hint">{{ hint }}</p>
    </div>
    <input ref="file" type="file" accept="image/*" hidden @change="onFile" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { compressImage } from '../img';
import { adminFetch } from '../api';

// modelValue 必须可选并给默认值：很多内容条目没有 originalSrc，
// 若声明为必填 String，传 undefined 会刷出满屏 Vue 类型警告。
const props = withDefaults(
  defineProps<{
    modelValue?: string;
    label: string;
    /** 上传后的文件名基（不含后缀），例如 wp_001 / wp_001_full / banner */
    uploadName: string;
    /** 最长边像素上限 */
    maxDim?: number;
    /** 编码质量 */
    quality?: number;
    /** 是否允许外链（默认 true） */
    allowUrl?: boolean;
  }>(),
  { modelValue: '', maxDim: 1280, quality: 0.82, allowUrl: true },
);
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>();

const file = ref<HTMLInputElement | null>(null);
const busy = ref(false);
const lastKb = ref<number | null>(null);
const hint = ref('');

async function api<T = any>(path: string, method = 'GET', body?: any): Promise<T> {
  const res = await adminFetch(`/__admin_api/${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

function pick() { file.value?.click(); }

async function onFile(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (!f) return;
  busy.value = true;
  hint.value = '';
  try {
    const r = await compressImage(f, { maxDim: props.maxDim ?? 1280, quality: props.quality ?? 0.82 });
    lastKb.value = r.kb;
    const res: any = await api('upload', 'POST', { path: `images/${props.uploadName}.jpg`, data: r.base64 });
    if (res.ok) {
      // 加 ?t= 时间戳破浏览器缓存，确保「替换图片」时预览/线上立即刷新（不影响落盘文件名）
      emit('update:modelValue', res.url + '?t=' + Date.now());
      hint.value = `已压缩上传：${r.width}×${r.height}px，≈${r.kb}KB`;
    } else {
      hint.value = '上传失败：' + (res.error || '');
    }
  } catch (err: any) {
    hint.value = '处理失败：' + (err?.message || err);
  } finally {
    busy.value = false;
    (e.target as HTMLInputElement).value = '';
  }
}

function onUrl(e: Event) {
  if (props.allowUrl === false) return;
  emit('update:modelValue', (e.target as HTMLInputElement).value.trim());
}

/** 清除当前图片（modelValue 置空，落盘文件保留，仅解绑引用） */
function clear() {
  emit('update:modelValue', '');
  lastKb.value = null;
  hint.value = '';
}
</script>

<style scoped>
.imgf { display: flex; gap: 10px; align-items: center; }
.imgf-preview { width: 64px; height: 64px; border-radius: 10px; overflow: hidden; background: #eef1f8; flex: none; display: flex; align-items: center; justify-content: center; position: relative; cursor: pointer; }
.imgf-preview img { width: 100%; height: 100%; object-fit: cover; cursor: pointer; }
.imgf-preview .ph { font-size: 11px; color: #9aa1b3; cursor: pointer; }
.imgf-preview .clear { position: absolute; top: 2px; right: 2px; width: 18px; height: 18px; border: 0; border-radius: 50%; background: rgba(0,0,0,.55); color: #fff; font-size: 11px; line-height: 18px; cursor: pointer; padding: 0; }
.imgf-ctrl { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.imgf-ctrl label { font-size: 11px; color: #8a90a0; }
.row { display: flex; gap: 8px; align-items: center; }
.up { border: 1px solid #cfd6e8; background: #f3f6fd; border-radius: 8px; padding: 6px 10px; font-size: 12px; cursor: pointer; }
.info { font-size: 11px; color: #5aa469; }
.url { border: 1px solid #dde2ee; border-radius: 8px; padding: 6px 8px; font-size: 12px; width: 100%; box-sizing: border-box; }
.hint { font-size: 11px; color: #8a90a0; margin: 0; }
</style>
