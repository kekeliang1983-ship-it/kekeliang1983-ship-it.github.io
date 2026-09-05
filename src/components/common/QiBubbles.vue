<template>
  <div class="qi-layer">
    <button
      v-for="b in bubbles"
      :key="b.id"
      class="qi-bubble"
      :class="{ rare: b.rare }"
      :style="bubbleStyle(b)"
      type="button"
      @click="onPop(b)"
      aria-label="收取灵气"
    >
      <span class="qi-core">💧</span>
      <span class="qi-amt">+{{ b.amount }}</span>
    </button>

    <!--
      收取后的浮字（独立于气泡，气泡移除后仍上飘）
      ⚠️ 刻意不用 <transition-group>：动画挂 -enter-active 时，Vue 在入场结束摘掉该类
         会让 animation 一并失效、浮字弹回基类样式（opacity 由 forwards 的 0 变回 1）
         → 表现为「本该消失的字又闪一次」。改为动画直接挂基类，无类可摘，杜绝回弹。
    -->
    <div class="qi-floats">
      <div v-for="f in floats" :key="f.id" class="qi-float" :class="{ rare: f.rare }" :style="f.style">
        <span class="qf-qi">+{{ f.amount }} 灵气</span>
        <span v-if="f.gold" class="qf-gold">🪙+{{ f.gold }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useQiBubbles, type QiBubble } from '@/composables/useQiBubbles';

const { bubbles, popBubble } = useQiBubbles();

interface FloatItem {
  id: number;
  x: number;
  y: number;
  amount: number;
  rare: boolean;
  gold: number;
  style: Record<string, string>;
}

const floats = ref<FloatItem[]>([]);
let floatSeq = 1;

function bubbleStyle(b: QiBubble) {
  return {
    left: b.x + 'vw',
    top: b.y + 'vh',
    '--drift': String(b.drift),
  } as Record<string, string>;
}

function onPop(b: QiBubble) {
  const res = popBubble(b.id);
  if (!res) return;
  const id = floatSeq++;
  const item: FloatItem = {
    id,
    x: b.x,
    y: b.y,
    amount: res.gained > 0 ? res.gained : 0,
    rare: res.rare,
    gold: res.gold,
    style: { left: b.x + 'vw', top: b.y + 'vh' },
  };
  floats.value.push(item);
  window.setTimeout(() => {
    const i = floats.value.findIndex((f) => f.id === id);
    if (i >= 0) floats.value.splice(i, 1);
  }, 1300);
}
</script>

<style scoped>
/* 全屏浮层：容器本身不拦截点击，仅气泡可点（不影响下方内容操作/滚动） */
.qi-layer {
  position: fixed;
  inset: 0;
  z-index: 55;            /* 高于内容/HUD，低于 TabBar(100) 与弹层(1000) */
  pointer-events: none;
  overflow: hidden;
}

.qi-bubble {
  position: absolute;
  pointer-events: auto;
  width: 52px;
  height: 52px;
  border: 0;
  padding: 0;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, rgba(186, 246, 255, 0.95), rgba(120, 200, 240, 0.55) 60%, rgba(120, 200, 240, 0.15) 100%);
  box-shadow: 0 6px 18px rgba(90, 180, 230, 0.45), inset 0 0 12px rgba(255, 255, 255, 0.6);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transform: translate(-50%, -50%);
  /* 升起（0.8s）→ 原地轻轻悬浮等待，永远不消失，点了才收（治愈系零惩罚） */
  animation: qi-appear 0.8s ease-out forwards, qi-bob 3.4s ease-in-out 0.8s infinite;
  will-change: transform, opacity;
}
.qi-bubble:active {
  transform: translate(-50%, -50%) scale(0.88);
}
.qi-core {
  font-size: 20px;
  line-height: 1;
  filter: drop-shadow(0 1px 2px rgba(40, 120, 170, 0.5));
}
.qi-amt {
  font-size: 10px;
  font-weight: 700;
  color: #0a5d8c;
  margin-top: 1px;
}

.qi-bubble.rare {
  width: 64px;
  height: 64px;
  background: radial-gradient(circle at 35% 30%, rgba(255, 244, 200, 0.98), rgba(255, 206, 110, 0.7) 60%, rgba(255, 206, 110, 0.2) 100%);
  box-shadow: 0 0 22px rgba(255, 200, 90, 0.8), inset 0 0 14px rgba(255, 255, 255, 0.7);
}
.qi-bubble.rare .qi-core {
  font-size: 26px;
}
.qi-bubble.rare .qi-amt {
  color: #9a6b00;
  font-size: 11px;
}
/* 金色宝泡呼吸光晕（停留期间更显眼，吸引点击） */
.qi-bubble.rare::after {
  content: '';
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  box-shadow: 0 0 22px rgba(255, 200, 90, 0.85);
  animation: qi-glow 1.6s ease-in-out infinite;
  pointer-events: none;
}
@keyframes qi-glow {
  0%, 100% { opacity: 0.45; }
  50%      { opacity: 1; }
}

@keyframes qi-appear {
  0%   { transform: translate(-50%, -50%) scale(0.4); opacity: 0; }
  60%  { opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
}
@keyframes qi-bob {
  0%, 100% { transform: translate(-50%, -50%) translateY(0)            translateX(0); }
  50%      { transform: translate(-50%, -50%) translateY(-7px)         translateX(calc(var(--drift) * 5px)); }
}

/* 收取浮字 */
.qi-floats {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.qi-float {
  position: absolute;
  transform: translate(-50%, -50%);
  font-size: 14px;
  font-weight: 800;
  color: #0a6db0;
  text-shadow: 0 1px 3px rgba(255, 255, 255, 0.9);
  white-space: nowrap;
  /* 关键：动画挂基类而非 -enter-active。Vue 入场结束会摘掉 -enter-active 类，
     导致 forwards 保住的 opacity:0 失效、浮字弹回 opacity:1 闪一次；挂基类无类可摘，杜绝回弹。 */
  opacity: 0;
  animation: qi-float-up 1.2s ease-out forwards;
}
.qi-float.rare {
  color: #b87900;
  font-size: 16px;
}
.qf-gold {
  display: block;
  margin-top: 1px;
  color: #d99a18;
  font-size: 12px;
  text-shadow: 0 1px 3px rgba(255, 255, 255, 0.95);
}
@keyframes qi-float-up {
  0%   { transform: translate(-50%, -50%) scale(0.7); opacity: 0; }
  20%  { opacity: 1; transform: translate(-50%, -70%) scale(1.05); }
  100% { transform: translate(-50%, -160%) scale(1); opacity: 0; }
}
</style>
