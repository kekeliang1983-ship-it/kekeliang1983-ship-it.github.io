<!-- src/components/common/StatusBar.vue —— 自定义状态栏 54px高（测试页面01 L453-L483）
     注意：必须使用真实SVG图标，禁止使用 📶🔋 等emoji。
-->
<template>
  <div class="status-bar" :style="{ height: statusBarHeight + 'px' }">
    <span class="status-time">{{ currentTime }}</span>
    <span class="status-icons" aria-hidden="true">
      <!-- 信号格 4条 -->
      <svg class="status-icon" viewBox="0 0 18 12" width="17" height="11">
        <rect x="0" y="8" width="3" height="4" rx="0.5" fill="currentColor"/>
        <rect x="5" y="6" width="3" height="6" rx="0.5" fill="currentColor"/>
        <rect x="10" y="3" width="3" height="9" rx="0.5" fill="currentColor"/>
        <rect x="15" y="0" width="3" height="12" rx="0.5" fill="currentColor" opacity="0.3"/>
      </svg>
      <!-- WiFi 弧线 -->
      <svg class="status-icon" viewBox="0 0 16 12" width="15" height="11">
        <path d="M8 11.5a1 1 0 100-2 1 1 0 000 2z" fill="currentColor"/>
        <path d="M8 8 C5.2 8 2.8 6.9 1.2 5.1 L2.6 3.7 C3.9 5.2 5.8 6 8 6 C10.2 6 12.1 5.2 13.4 3.7 L14.8 5.1 C13.2 6.9 10.8 8 8 8 z" fill="currentColor"/>
        <path d="M8 4 C4.7 4 1.7 2.9 -0.3 1 L1.1 -0.4 C2.8 1.2 5.3 2 8 2 C10.7 2 13.2 1.2 14.9 -0.4 L16.3 1 C14.3 2.9 11.3 4 8 4 z" fill="currentColor" opacity="0.85"/>
      </svg>
      <!-- 电池 -->
      <svg class="status-icon" viewBox="0 0 27 13" width="25" height="12">
        <rect x="0.5" y="0.5" width="23" height="12" rx="2.5" fill="none" stroke="currentColor"/>
        <rect x="2" y="2" width="18" height="9" rx="1.2" fill="currentColor"/>
        <rect x="24.5" y="4" width="2" height="5" rx="0.5" fill="currentColor"/>
      </svg>
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const statusBarHeight = ref(54); // 测试页面01 L458：固定54px
const currentTime = ref('');
let timer: any = null;

const update = () => {
  const n = new Date();
  currentTime.value = `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
};

onMounted(() => {
  // 叠加安全区顶部（实际视觉上StatusBar区域=54px + 刘海）
  const envTop = getComputedStyle(document.documentElement)
    .getPropertyValue('env(safe-area-inset-top)').replace('px', '');
  if (envTop && parseInt(envTop) > 0) {
    statusBarHeight.value = 54 + parseInt(envTop);
  }
  update();
  timer = setInterval(update, 30000);
});

onUnmounted(() => { if (timer) clearInterval(timer); });
</script>

<style scoped>
.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px 0 38px; /* 测试页面01 L462：左右安全区 24~38 */
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: .3px;
  flex-shrink: 0;
  padding-top: 4px;
  background: transparent;
}
.status-time { font-variant-numeric: tabular-nums; }
.status-icons {
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: .9;
  color: var(--text-primary);
}
.status-icon { display: block; }
</style>
