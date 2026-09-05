<!--
  AnimatedNumber —— 数值翻滚组件
  仅在「离散资源增减」时使用（元宝/灵珠/魔丸/天玑/灵气/心境…），
  连续计数（聆听秒数、在线时长）不要用，避免每秒抖动。
  特性：rAF easeOutCubic 缓动；涨绿跌红短暂着色；尊重 prefers-reduced-motion 降级。
-->
<template>
  <span class="animated-num" :class="dirClass">{{ display }}</span>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';

const props = withDefaults(
  defineProps<{
    value: number;
    format?: (n: number) => string;
    duration?: number;
  }>(),
  { duration: 450 },
);

const display = ref(formatVal(props.value));
const dirClass = ref('');

let raf = 0;
let from = 0;
let to = 0;
let start = 0;

const reduce =
  typeof window !== 'undefined' &&
  !!window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function formatVal(n: number): string {
  return props.format ? props.format(n) : String(Math.round(n));
}

watch(
  () => props.value,
  (nv, ov) => {
    if (reduce || nv === ov) {
      display.value = formatVal(nv);
      return;
    }
    cancelAnimationFrame(raf);
    from = ov;
    to = nv;
    start = performance.now();
    dirClass.value = nv > ov ? 'up' : 'down';
    const dur = props.duration;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - t, 3); // easeOutCubic
      display.value = formatVal(from + (to - from) * e);
      if (t < 1) {
        raf = requestAnimationFrame(step);
      } else {
        display.value = formatVal(to);
        window.setTimeout(() => {
          dirClass.value = '';
        }, 450);
      }
    };
    raf = requestAnimationFrame(step);
  },
);

onUnmounted(() => cancelAnimationFrame(raf));
</script>

<style scoped>
.animated-num {
  display: inline-block;
  font-variant-numeric: tabular-nums;
  transition: color 0.3s;
}
.animated-num.up {
  color: #2faa6a;
  text-shadow: 0 0 6px rgba(47, 170, 106, 0.35);
}
.animated-num.down {
  color: #d9736b;
  text-shadow: 0 0 6px rgba(217, 115, 107, 0.3);
}
</style>
