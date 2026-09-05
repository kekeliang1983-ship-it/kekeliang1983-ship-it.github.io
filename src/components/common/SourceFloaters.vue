<!--
  SourceFloaters —— 来源处飘字层（全局渲染）
  由 useFloaters.pushFloater 在各版块「动作发生处」调用（菜地旁、仙宠旁、上香处…），
  飘 +X/-X 并定位到动作坐标，回答玩家「是哪一块、为什么变」。
  固定全屏层、pointer-events:none，不拦截操作。
-->
<template>
  <teleport to="body">
    <div class="source-floater-layer">
      <span
        v-for="f in floaters"
        :key="f.id"
        class="sfloater"
        :class="f.kind"
        :style="{ left: f.x + 'px', top: f.y + 'px' }"
        >{{ f.text }}</span
      >
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { useFloaters } from '@/composables/useFloaters';
const { floaters } = useFloaters();
</script>

<style scoped>
.source-floater-layer {
  position: fixed;
  inset: 0;
  z-index: var(--z-confirm, 1200);
  pointer-events: none;
  overflow: hidden;
}
.sfloater {
  position: absolute;
  transform: translate(-50%, -50%);
  font-size: 14px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  animation: sfloater-rise 1.3s ease-out forwards;
  text-shadow: 0 1px 5px rgba(255, 255, 255, 0.85);
  white-space: nowrap;
}
.sfloater.up,
.sfloater.gold,
.sfloater.pearl,
.sfloater.magic,
.sfloater.jade,
.sfloater.qi,
.sfloater.mood {
  color: #1f9d5e;
}
.sfloater.down {
  color: #d2605a;
}
.sfloater.qi {
  color: #2f9bd4;
}
.sfloater.pearl {
  color: #d56fa6;
}
.sfloater.magic {
  color: #9a6bd4;
}
.sfloater.gold {
  color: #d9a23a;
}
.sfloater.jade {
  color: #3fae8a;
}
.sfloater.mood {
  color: #e2873a;
}
@keyframes sfloater-rise {
  0% {
    opacity: 0;
    transform: translate(-50%, -30%) scale(0.8);
  }
  16% {
    opacity: 1;
    transform: translate(-50%, -55%) scale(1.05);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -180%) scale(1);
  }
}
</style>
