<!--
  src/components/common/ResourceHud.vue —— 全局资源条（App 级顶部 HUD）
  常驻于 AppLayout，所有模块共享；数据来自 useUserStore（Pinia 全局）
  版式：上行 4 货币胶囊 + 下行 灵气进度 + 心境（>80 亮出 ×1.15 增益）
-->
<template>
  <div class="res-hud">
    <!-- 上行：四货币 -->
    <div class="res-row">
      <span class="chip gold" data-res="gold"><i class="dot"></i><AnimatedNumber :value="user.gold" :format="fmt" /></span>
      <span class="chip pearl" data-res="pearl"><i class="dot"></i><AnimatedNumber :value="user.pearl" :format="fmt" /></span>
      <span class="chip magic" data-res="magic"><i class="dot"></i><AnimatedNumber :value="user.magic" :format="fmt" /></span>
      <span class="chip jade" data-res="jade"><i class="dot"></i><AnimatedNumber :value="user.jade" :format="fmt" /></span>
    </div>
    <!-- 下行：灵气 + 心境 -->
    <div class="res-row">
      <span class="meter qi" data-res="qi">灵气
        <span class="track"><i class="fill" :style="{ width: qiPct + '%' }"></i></span>
        <b><AnimatedNumber :value="user.qi" />/{{ user.maxQi }}</b>
      </span>
      <span class="mood" data-res="mood" :class="{ active: user.mood > 80 }">
        <template v-if="user.mood > 80">心境 <AnimatedNumber :value="user.mood" /> · <em>×1.15</em></template>
        <template v-else>心境 <AnimatedNumber :value="user.mood" />/100</template>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useUserStore } from '@/stores/index';
import AnimatedNumber from '@/components/common/AnimatedNumber.vue';

const user = useUserStore();
const qiPct = computed(() => Math.round((user.qi / user.maxQi) * 100));

function fmt(n: number) {
  return n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'k' : String(n);
}
</script>

<style scoped>
.res-hud {
  flex: 0 0 auto;
  padding: calc(env(safe-area-inset-top, 0px) + 9px) 16px 9px;
  background: rgba(255, 255, 255, .52);
  backdrop-filter: blur(22px) saturate(150%);
  -webkit-backdrop-filter: blur(22px) saturate(150%);
  border-bottom: 1px solid rgba(255, 255, 255, .55);
  box-shadow: 0 6px 18px rgba(67, 82, 120, .06);
  z-index: var(--z-hud, 20);
}
.res-row { display: flex; align-items: center; gap: 8px; }
.res-row + .res-row { margin-top: 7px; }
.chip {
  flex: 1 1 0;
  display: inline-flex; align-items: center; justify-content: center; gap: 5px;
  height: 26px; padding: 0 8px; border-radius: 13px;
  background: rgba(255, 255, 255, .55);
  font-size: 12px; font-weight: 600; color: var(--text-primary);
  white-space: nowrap; overflow: hidden;
}
.chip .dot { width: 10px; height: 10px; border-radius: 50%; flex: 0 0 auto; }
.chip.gold .dot { background: var(--accent-gold); }
.chip.pearl .dot { background: var(--accent-soft); }
.chip.magic .dot { background: var(--magic); }
.chip.jade .dot { background: var(--jade); }

.meter {
  flex: 1 1 0; min-width: 0;
  display: flex; align-items: center; gap: 7px;
  font-size: 11px; color: var(--text-secondary);
}
.meter .track { flex: 1; height: 6px; border-radius: 10px; background: var(--track-bg); overflow: hidden; }
.meter .fill { display: block; height: 100%; border-radius: 10px; background: var(--accent); }
.meter b { font-size: 11px; font-weight: 700; color: var(--text-primary); flex: 0 0 auto; }

.mood {
  flex: 0 0 auto;
  position: relative;
  font-size: 11px; color: var(--text-secondary);
  white-space: nowrap;
  padding: 2px 9px; border-radius: 11px;
  transition: color .3s, background .3s;
}
/* 暴击态：暖金渐变文字 + 呼吸 + 柔光晕 + 表面流光 */
.mood.active {
  color: transparent;
  background: linear-gradient(100deg, #e8a94e 0%, #ffd98a 45%, #fff0c4 55%, #ffd98a 65%, #e8a94e 100%);
  -webkit-background-clip: text; background-clip: text;
  font-weight: 700;
  animation: moodBreathe 2.6s ease-in-out infinite;
}
/* 背后柔光晕（玻璃拟态上的暖光，呼吸般明灭） */
.mood.active::before {
  content: ''; position: absolute; inset: -3px -5px; border-radius: 13px;
  background: radial-gradient(closest-side, rgba(255, 198, 122, .55), rgba(255, 198, 122, 0));
  filter: blur(3px); z-index: -1;
  animation: moodGlow 2.6s ease-in-out infinite;
}
/* 表面扫过流光（克制的高光，仅扫过瞬间可见） */
.mood.active::after {
  content: ''; position: absolute; inset: 0; border-radius: inherit;
  background: linear-gradient(110deg, transparent 35%, rgba(255, 255, 255, .6) 50%, transparent 65%);
  background-size: 250% 100%;
  animation: moodShine 2.8s linear infinite;
  pointer-events: none;
}
.mood.active em {
  font-style: normal; color: #6b3e12; background: rgba(255, 224, 150, .92);
  padding: 1px 6px; border-radius: 9px; font-weight: 700;
}
@keyframes moodBreathe {
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(1.12); }
}
@keyframes moodGlow {
  0%, 100% { opacity: .55; transform: scale(1); }
  50% { opacity: .9; transform: scale(1.06); }
}
@keyframes moodShine {
  0% { background-position: 150% 0; }
  100% { background-position: -150% 0; }
}
</style>
