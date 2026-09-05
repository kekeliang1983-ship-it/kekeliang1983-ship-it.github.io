<template>
  <div class="videof">
    <div class="videof-preview" :class="{ empty: !modelValue }" @click="pick">
      <video v-if="modelValue" :src="modelValue" muted playsinline preload="metadata"
             @loadedmetadata="onMeta"></video>
      <span v-else class="ph">点击上传</span>
      <button v-if="modelValue" class="clear" title="清除" @click.stop="clear">✕</button>
    </div>
    <div class="videof-ctrl">
      <label>{{ label }}</label>
      <!-- 本地上传：视频不做压缩，原样转 base64 落盘；大文件强烈建议用外链 -->
      <div class="row">
        <button class="up" :disabled="busy" @click="pick">{{ busy ? '处理中…' : '📤 上传视频' }}</button>
        <span class="info" v-if="lastKb">≈ {{ lastKb }} KB</span>
      </div>
      <!-- 外链 CDN：不进包体，推荐用于大视频 -->
      <input class="url" :value="modelValue" placeholder="或粘贴外链视频 URL（如 https://cdn.x/xx.mp4）" @input="onUrl" />
      <p class="hint" v-if="hint">{{ hint }}</p>
      <p class="meta" v-if="metaText">{{ metaText }}</p>
    </div>
    <input ref="file" type="file" accept="video/*" hidden @change="onFile" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { adminFetch } from '../api';

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    label: string;
    /** 上传后的文件名基（不含后缀），例如 banner-video */
    uploadName: string;
    /** 本地上传体积上限（KB），默认 8192 = 8MB；超出仅提示不拦截 */
    maxKb?: number;
  }>(),
  { modelValue: '', maxKb: 8192 },
);
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>();

const file = ref<HTMLInputElement | null>(null);
const busy = ref(false);
const lastKb = ref<number | null>(null);
const hint = ref('');
const fileName = ref('');
const duration = ref<number | null>(null);

/** 展示用的文件名 + 时长，提升替换时的可见性 */
const metaText = computed(() => {
  const parts: string[] = [];
  if (fileName.value) parts.push(fileName.value);
  if (duration.value && !isNaN(duration.value)) {
    const s = Math.round(duration.value);
    parts.push(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
  }
  return parts.join(' · ');
});

async function api<T = any>(path: string, method = 'GET', body?: any): Promise<T> {
  const res = await adminFetch(`/__admin_api/${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

function pick() { file.value?.click(); }

/** 从 video MIME 推断落盘后缀 */
function extOf(mime: string, fallbackName: string): string {
  const m: Record<string, string> = {
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/ogg': 'ogv',
    'video/quicktime': 'mov',
  };
  if (m[mime]) return m[mime];
  const e = fallbackName.split('.').pop()?.toLowerCase();
  return e && e !== fallbackName.toLowerCase() ? e : 'mp4';
}

async function onFile(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (!f) return;
  busy.value = true;
  hint.value = '';
  try {
    // 视频不压缩：直接 FileReader 转 base64（与 upload 约定一致，不含 data: 前缀）
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onerror = () => reject(new Error('读取失败'));
      r.onload = () => resolve(r.result as string);
      r.readAsDataURL(f);
    });
    const base64 = dataUrl.split(',')[1] || '';
    const kb = Math.round((base64.length * 0.75) / 1024);
    lastKb.value = kb;

    if (kb > props.maxKb) {
      hint.value = `⚠ 体积 ≈${kb}KB 超过 ${props.maxKb}KB 上限，仍会落盘但强烈建议改用外链，以免包体膨胀。`;
    }

    const ext = extOf(f.type, f.name);
    const res: any = await api('upload', 'POST', {
      path: `videos/${props.uploadName}.${ext}`,
      data: base64,
    });
    if (res.ok) {
      // 关键：URL 加 ?t= 时间戳破浏览器缓存，确保「替换视频」时预览/线上都立刻刷新新文件
      const url = res.url + '?t=' + Date.now();
      emit('update:modelValue', url);
      fileName.value = f.name;
      duration.value = null;
      if (!hint.value) hint.value = `已上传并替换成功：${f.name}，${f.type || ext}，≈${kb}KB`;
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

/** 预览视频加载出元数据时记录时长（仅展示用，不影响存储） */
function onMeta(e: Event) {
  const v = e.target as HTMLVideoElement;
  duration.value = v.duration || null;
}

function onUrl(e: Event) {
  const v = (e.target as HTMLInputElement).value.trim();
  emit('update:modelValue', v);
  // 外链：尝试从 URL 文件名展示；清掉本地记录的时长（外链不强制探测）
  fileName.value = v ? (v.split('/').pop() || v).split('?')[0] : '';
  duration.value = null;
}

/** 清除当前视频（modelValue 置空） */
function clear() {
  emit('update:modelValue', '');
  fileName.value = '';
  duration.value = null;
  hint.value = '';
}
</script>

<style scoped>
.videof { display: flex; gap: 10px; align-items: center; }
.videof-preview { width: 100px; height: 64px; border-radius: 10px; overflow: hidden; background: #eef1f8; flex: none; display: flex; align-items: center; justify-content: center; }
.videof-preview video { width: 100%; height: 100%; object-fit: cover; cursor: pointer; }
.videof-preview .ph { font-size: 11px; color: #9aa1b3; cursor: pointer; }
.videof-preview .clear { position: absolute; top: 2px; right: 2px; width: 18px; height: 18px; border: 0; border-radius: 50%; background: rgba(0,0,0,.55); color: #fff; font-size: 11px; line-height: 18px; cursor: pointer; padding: 0; }
.videof-preview { position: relative; }
.videof-ctrl { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.videof-ctrl label { font-size: 11px; color: #8a90a0; }
.row { display: flex; gap: 8px; align-items: center; }
.up { border: 1px solid #cfd6e8; background: #f3f6fd; border-radius: 8px; padding: 6px 10px; font-size: 12px; cursor: pointer; }
.info { font-size: 11px; color: #5aa469; }
.url { border: 1px solid #dde2ee; border-radius: 8px; padding: 6px 8px; font-size: 12px; width: 100%; box-sizing: border-box; }
.hint { font-size: 11px; color: #8a90a0; margin: 0; }
.meta { font-size: 11px; color: #5a6b8c; margin: 0; font-weight: 600; }
</style>
