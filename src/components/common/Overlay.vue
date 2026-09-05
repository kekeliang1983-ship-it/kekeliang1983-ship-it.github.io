<!--
  src/components/common/Overlay.vue —— 统一弹层（2026-08-25 规范）
  variant="sheet"：底部抽屉（操作型：多条目选择，拇指友好）
    遮罩 --mask-sheet(灰.32) / 面板顶部圆角28 / rise 上滑
  variant="modal"：居中弹层（信息型：规则/确认/奖励）
    遮罩 --mask-modal(深.38)+blur(3px) / 面板全圆角20 玻璃卡 / fade 淡入 / 右上 ✕
  z-index 分层：弹层 var(--z-overlay,80) < toast var(--z-toast,100)；点遮罩背景关闭
-->
<template>
  <teleport to="body">
    <transition :name="variant === 'sheet' ? 'ov-rise' : 'ov-fade'">
      <div
        v-if="open"
        class="ov-mask"
        :class="variant"
        @click.self="emit('close')"
      >
        <div class="ov-panel">
          <slot />
          <button
            v-if="variant === 'modal'"
            class="ov-x"
            v-feedback="'BUTTON_CLICK'"
            aria-label="关闭"
            @click="emit('close')"
          >✕</button>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  open: boolean;
  variant?: 'sheet' | 'modal';
}>(), { variant: 'sheet' });

const emit = defineEmits<{ (e: 'close'): void }>();
</script>

<style scoped>
.ov-mask {
  position: fixed;
  inset: 0;
  z-index: var(--z-overlay, 1000);
  display: flex;
}
.ov-mask.sheet { background: var(--mask-sheet); align-items: flex-end; }
.ov-mask.modal {
  background: var(--mask-modal);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  align-items: center;
  justify-content: center;
  padding: 28px;
}
/* sheet 面板：顶部圆角 28 上滑 */
.ov-mask.sheet .ov-panel {
  width: 100%;
  background: var(--bg-secondary);
  border-radius: 28px 28px 0 0;
  padding: 22px 22px 30px;
  max-height: 80vh;
  overflow-y: auto;
}
/* modal 面板：全圆角 20 玻璃卡 */
.ov-mask.modal .ov-panel {
  position: relative;
  width: 100%;
  max-width: 340px;
  padding: 18px;
  border-radius: var(--radius-card);
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  backdrop-filter: var(--backdrop-sm);
  -webkit-backdrop-filter: var(--backdrop-sm);
  box-shadow: var(--shadow-float);
}
.ov-x {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 28px;
  height: 28px;
  border-radius: 10px;
  border: 0;
  background: rgba(0, 0, 0, .05);
  color: var(--text-muted);
  font-size: 14px;
  display: grid;
  place-items: center;
  cursor: pointer;
}
/* sheet 上滑 */
.ov-rise-enter-active,
.ov-rise-leave-active {
  transition: transform .28s cubic-bezier(.25, .46, .45, .94), opacity .28s ease;
}
.ov-rise-enter-from,
.ov-rise-leave-to { transform: translateY(40px); opacity: .6; }
/* modal 淡入 */
.ov-fade-enter-active,
.ov-fade-leave-active { transition: opacity .22s ease; }
.ov-fade-enter-from,
.ov-fade-leave-to { opacity: 0; }
</style>
