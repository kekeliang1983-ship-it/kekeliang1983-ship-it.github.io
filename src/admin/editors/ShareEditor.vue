<template>
  <div class="share-editor">
    <div class="field">
      <label>分享标题</label>
      <input v-model="data.title" class="inp" placeholder="灵境 · 治愈小生物" />
    </div>

    <div class="field">
      <label>分享描述</label>
      <textarea v-model="data.description" class="inp" rows="3" placeholder="东方治愈 · 沉浸式休闲空间。养成你的灵境小生物，收集、种植、聆听与旅行。" />
    </div>

    <div class="field">
      <label>封面图（建议 1200×630，正方形 ≥300px 兼容更好）</label>
      <div class="cover-row">
        <img v-if="data.image" :src="previewUrl" class="cover-prev" alt="封面预览" />
        <div class="cover-meta">
          <button class="btn sm" :disabled="uploading" @click="pickFile">📤 上传 / 替换封面</button>
          <p class="hint">当前封面：<code>{{ data.image || '(未设置)' }}</code></p>
          <p v-if="uploading" class="hint">上传中…</p>
        </div>
      </div>
      <input ref="fileInput" type="file" accept="image/*" hidden @change="onFile" />
    </div>

    <p class="tip">
      💡 改完点顶部「💾 保存」或「☁️ 一键发布」即可。<br />
      分享卡片在<strong>构建后</strong>生效（爬虫读取的是静态 HTML，约 2–5 分钟）。微信换图后可能需清缓存，已自动加版本号强制刷新。
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { adminFetch } from '@/admin/api';

const props = defineProps<{ data: any }>();
const fileInput = ref<HTMLInputElement | null>(null);
const uploading = ref(false);

// 微信等会缓存封面，预览时强行加时间戳避免看到旧图
const previewUrl = computed(() => props.data?.image || '');

function pickFile() {
  fileInput.value?.click();
}

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  uploading.value = true;
  try {
    const b64 = await fileToBase64(file);
    const res: any = await adminFetch('/__admin_api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: 'og-cover.png', data: b64 }),
    }).then((r) => r.json());
    if (res.ok) {
      // 加版本号让微信爬虫重新抓取封面
      props.data.image = `https://kekeliang1983-ship-it.github.io/og-cover.png?v=${Date.now()}`;
    } else {
      alert('上传失败：' + (res.error || '未知错误'));
    }
  } catch (err: any) {
    alert('上传失败：' + (err?.message || err));
  } finally {
    uploading.value = false;
    input.value = '';
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
</script>

<style scoped>
.share-editor { max-width: 720px; display: flex; flex-direction: column; gap: 20px; }
.field { display: flex; flex-direction: column; gap: 8px; }
.field label { font-size: 13px; color: #4a4f63; font-weight: 600; }
.inp { border: 1px solid #dfe3ee; border-radius: 10px; padding: 10px 12px; font-size: 14px; outline: none; font-family: inherit; resize: vertical; }
.inp:focus { border-color: #8fa6e8; }
.cover-row { display: flex; gap: 16px; align-items: flex-start; }
.cover-prev { width: 240px; height: 126px; object-fit: cover; border-radius: 10px; border: 1px solid #e6e9f2; background: #f3f5fb; }
.cover-meta { display: flex; flex-direction: column; gap: 8px; padding-top: 4px; }
.hint { font-size: 12px; color: #8a90a0; margin: 0; }
.hint code { background: #f0f2f8; padding: 1px 6px; border-radius: 6px; word-break: break-all; }
.btn.sm { padding: 7px 12px; font-size: 13px; border: 1px solid #d6dcec; background: #fff; border-radius: 9px; cursor: pointer; align-self: flex-start; }
.btn.sm:disabled { opacity: .5; cursor: default; }
.tip { font-size: 12.5px; color: #6b7080; line-height: 1.7; background: #f7f8fc; border: 1px solid #eef0f6; border-radius: 10px; padding: 12px 14px; margin: 0; }
</style>
