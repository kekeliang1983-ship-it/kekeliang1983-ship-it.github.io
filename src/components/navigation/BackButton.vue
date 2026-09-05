<!-- src/components/navigation/BackButton.vue —— 全屏子页统一返回按钮（左上）-->
<template>
  <button class="back-btn" @click="onBack" aria-label="返回">
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M15 6 l-6 6 6 6"/>
    </svg>
    <span class="back-label">返回</span>
  </button>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
const router = useRouter();
const onBack = () => router.back();
</script>

<style scoped>
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: 32px;
  padding: 0 10px;
  border: 0;
  border-radius: 16px;
  background: rgba(255, 255, 255, .55);
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  transition: background .15s ease, transform .1s ease;
}
.back-btn:active { transform: scale(.95); background: rgba(255,255,255,.75); }
.back-label { letter-spacing: .5px; }
</style>
