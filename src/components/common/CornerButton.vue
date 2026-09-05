<!--
  src/components/common/CornerButton.vue —— 版块右上角统一角标按钮（2026-08-25 规范）
  规格：44×44 圆角16 / 白.45 底+细边框 / 图标 24 stroke1.6；可选下方文字 / 可选角标(红点或数字)
  用法：
    <CornerButton label="种子" @click="..."> <svg .../> </CornerButton>      // 图标+文字竖排
    <CornerButton :badge="n > 0" @click="..."> ... </CornerButton>            // 红点
    <CornerButton :badge="notifUnread" @click="..."> ... </CornerButton>      // 数字徽标(99+)
    <CornerButton tone="accent" @click="..."> ... </CornerButton>             // 图标用品牌紫
-->
<template>
  <button
    class="corner-btn"
    :class="{ accent: tone === 'accent' }"
    :aria-label="ariaLabel"
    v-feedback="'BUTTON_CLICK'"
    @click="emit('click', $event)"
  >
    <slot />
    <span v-if="label" class="cb-label">{{ label }}</span>
    <span
      v-if="badgeVisible"
      class="cb-badge"
      :class="{ dot: typeof badge === 'boolean' }"
    >{{ badgeText }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  label?: string;
  badge?: number | boolean | string;
  ariaLabel?: string;
  tone?: 'default' | 'accent';
}>(), { tone: 'default' });

const emit = defineEmits<{ (e: 'click', ev: MouseEvent): void }>();

const badgeVisible = computed(() => {
  const b = props.badge;
  if (typeof b === 'boolean') return b;
  if (typeof b === 'number') return b > 0;
  return !!b;
});

const badgeText = computed(() => {
  const b = props.badge;
  if (typeof b === 'number') return b > 99 ? '99+' : String(b);
  if (typeof b === 'string') return b;
  return '';
});
</script>

<style scoped>
.corner-btn {
  position: relative;
  width: 44px;
  min-height: 44px;
  border-radius: var(--radius-icon, 16px);
  background: rgba(255, 255, 255, .45);
  border: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 8px 0 7px;
  cursor: pointer;
  color: var(--text-primary);
  transition: transform .12s ease, opacity .12s ease;
}
.corner-btn:active { opacity: .65; transform: scale(.96); }
.corner-btn.accent { color: var(--accent); }
.corner-btn :slotted(svg) {
  width: 24px;
  height: 24px;
  stroke: currentColor;
  stroke-width: 1.6;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.cb-label { font-size: 11px; color: var(--text-secondary); line-height: 1; white-space: nowrap; }
.cb-badge {
  position: absolute;
  top: 6px;
  right: 8px;
  min-width: 16px;
  height: 16px;
  line-height: 16px;
  padding: 0 4px;
  box-sizing: border-box;
  border-radius: 999px;
  background: #F45656;
  color: #FFF;
  font-size: 9px;
  font-weight: 700;
  text-align: center;
  border: 1px solid #FFF;
  box-shadow: 0 1px 4px rgba(244, 86, 86, .35);
}
.cb-badge.dot {
  width: 9px;
  height: 9px;
  min-width: 9px;
  padding: 0;
  border-radius: 50%;
  border: 2px solid #FFF;
}
</style>
