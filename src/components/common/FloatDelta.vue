<!--
  FloatDelta —— 顶栏资源飘字层
  监听全局资源变动总线，在对应 HUD 胶囊/区域弹「+X / -X」飘字，
  回答玩家「总量变了没有、变了哪个」。与来源处飘字（SourceFloaters）互补。
  固定全屏层、pointer-events:none，不拦截任何操作。
-->
<template>
  <teleport to="body">
    <div class="float-delta-layer">
      <span
        v-for="f in floaters"
        :key="f.id"
        class="fdelta"
        :class="f.kind"
        :style="{ left: f.x + 'px', top: f.y + 'px' }"
        >{{ f.text }}</span
      >
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { onResourceDelta, type ResourceType } from '@/composables/useResourceDelta';

interface FItem {
  id: number;
  x: number;
  y: number;
  text: string;
  kind: 'up' | 'down';
}
const floaters = ref<FItem[]>([]);
let seq = 0;

function spawn(type: ResourceType, amount: number): void {
  // 顶栏对应元素（ResourceHud 已用 data-res 标记）
  const el = document.querySelector(`[data-res="${type}"]`) as HTMLElement | null;
  let x = window.innerWidth / 2;
  let y = 60;
  if (el) {
    const r = el.getBoundingClientRect();
    x = r.left + r.width / 2;
    y = r.bottom + 4;
  }
  const id = ++seq;
  floaters.value.push({
    id,
    x,
    y,
    text: (amount > 0 ? '+' : '') + amount,
    kind: amount > 0 ? 'up' : 'down',
  });
  window.setTimeout(() => {
    const i = floaters.value.findIndex((f) => f.id === id);
    if (i >= 0) floaters.value.splice(i, 1);
  }, 1100);
}

let off: (() => void) | null = null;
onMounted(() => {
  off = onResourceDelta((d) => spawn(d.type, d.amount));
});
onUnmounted(() => {
  off?.();
});
</script>

<style scoped>
.float-delta-layer {
  position: fixed;
  inset: 0;
  z-index: var(--z-confirm, 1200);
  pointer-events: none;
  overflow: hidden;
}
.fdelta {
  position: absolute;
  transform: translate(-50%, -50%);
  font-size: 13px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  animation: fdelta-rise 1.1s ease-out forwards;
  text-shadow: 0 1px 4px rgba(255, 255, 255, 0.8);
  white-space: nowrap;
}
.fdelta.up {
  color: #1f9d5e;
}
.fdelta.down {
  color: #d2605a;
}
@keyframes fdelta-rise {
  0% {
    opacity: 0;
    transform: translate(-50%, -30%) scale(0.8);
  }
  18% {
    opacity: 1;
    transform: translate(-50%, -60%) scale(1.05);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -160%) scale(1);
  }
}
</style>
