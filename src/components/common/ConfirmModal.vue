<!--
  src/components/common/ConfirmModal.vue —— 全局购买/消耗二次确认弹层
  样式对齐 Overlay「modal」规范（遮罩 --mask-modal + blur / 玻璃卡 / 居中 / 淡入）
  仅由 useConfirm 单例驱动；确认/取消/点遮罩均 resolve 对应结果。
  挂载点：App.vue（teleport 到 body，全局任意页可用）
-->
<template>
  <teleport to="body">
    <transition name="cf-fade">
      <div
        v-if="state.open"
        class="cf-mask"
        @click.self="cancel"
      >
        <div class="cf-card" role="dialog" aria-modal="true">
          <h3 class="cf-title">{{ state.title }}</h3>
          <p class="cf-msg">{{ state.message }}</p>
          <p v-if="state.costText" class="cf-cost">{{ state.costText }}</p>
          <div class="cf-actions">
            <button class="cf-btn cf-cancel" v-feedback="'BUTTON_CLICK'" @click="cancel">
              {{ state.cancelText }}
            </button>
            <button class="cf-btn cf-ok" v-feedback="'BUTTON_CLICK'" @click="confirm">
              {{ state.confirmText }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { useConfirm } from '@/composables/useConfirm';
import { vFeedback } from '@/core/feedback';
const { state, confirm, cancel } = useConfirm();
</script>

<style scoped>
.cf-mask {
  position: fixed;
  inset: 0;
  z-index: var(--z-confirm, 1200);
  background: var(--mask-modal);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px;
}
.cf-card {
  width: 100%;
  max-width: 320px;
  padding: 22px 20px 18px;
  border-radius: var(--radius-card, 20px);
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-light, rgba(0, 0, 0, .06));
  box-shadow: var(--shadow-float, 0 12px 40px rgba(0, 0, 0, .18));
  text-align: center;
}
.cf-title { margin: 0 0 8px; font-size: 16px; font-weight: 700; color: var(--text-primary); }
.cf-msg { margin: 0 0 6px; font-size: 14px; color: var(--text-secondary, #555); line-height: 1.5; }
.cf-cost { margin: 0 0 16px; font-size: 13px; font-weight: 600; color: #A8842D; }
.cf-actions { display: flex; gap: 12px; }
.cf-btn {
  flex: 1;
  height: 42px;
  border: 0;
  border-radius: 13px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  touch-action: manipulation;
}
.cf-cancel { background: rgba(0, 0, 0, .05); color: var(--text-secondary, #555); }
.cf-ok { background: linear-gradient(135deg, #8A80D8, #A39AE8); color: #fff; }
.cf-fade-enter-active,
.cf-fade-leave-active { transition: opacity .2s ease; }
.cf-fade-enter-from,
.cf-fade-leave-to { opacity: 0; }
</style>
