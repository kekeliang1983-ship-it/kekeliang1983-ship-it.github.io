<!--
  src/components/NameInputModal.vue —— 起名 / 改名弹窗
  复用 ConfirmModal 的 teleport + 玻璃卡 overlay 模式（禁用原生 alert）。
  输入框实时预览（头像首字 + 欢迎语）+ 字数统计 + 内联错误 + 「随机一个」按钮。
  校验：trim → 过滤零宽/控制字符 → 按码点 2~8 字；下限提示由 UI 拦截，上限实时截断。
  挂载点：AppLayout（teleport 到 body，全局任意页可用）。驱动：useNameModal 单例。
-->
<template>
  <teleport to="body">
    <transition name="nm-fade">
      <div
        v-if="state.open"
        class="nm-mask"
        @click.self="onCancel"
      >
        <div class="nm-card" role="dialog" aria-modal="true">
          <!-- 标题区 -->
          <h3 class="nm-title">{{ state.mode === 'first' ? '给自己起个名字吧' : '修改昵称' }}</h3>
          <p class="nm-sub">
            {{ state.mode === 'first' ? '取个名字，开启你的灵境之旅 ✦' : '2~8 个字，可随时修改' }}
          </p>

          <!-- 实时预览 -->
          <div class="nm-preview">
            <Avatar class="nm-avatar" :avatar="userStore.avatar" :name="cleaned" :element="previewElement" :size="52" />
            <div class="nm-preview-text">{{ previewText }}</div>
          </div>

          <!-- 输入框 -->
          <div class="nm-input-wrap" :class="{ 'is-error': !!error }">
            <input
              ref="inputEl"
              v-model="input"
              class="nm-input"
              type="text"
              maxlength="16"
              :placeholder="'输入名字…'"
              @input="onInput"
              @keyup.enter="onConfirm"
            />
            <span class="nm-count">{{ charLen }} / {{ NICKNAME_MAX }}</span>
          </div>
          <p v-if="error" class="nm-error">{{ error }}</p>

          <!-- 随机一个 -->
          <button class="nm-random" v-feedback="'BUTTON_CLICK'" @click="onRandom">
            🎲 随机一个
          </button>

          <!-- 操作区 -->
          <div class="nm-actions">
            <button class="nm-btn nm-cancel" v-feedback="'BUTTON_CLICK'" @click="onCancel">
              {{ state.mode === 'first' ? '稍后再说' : '取消' }}
            </button>
            <button
              class="nm-btn nm-ok"
              v-feedback="'BUTTON_CLICK'"
              :disabled="!canConfirm"
              @click="onConfirm"
            >
              确定
            </button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useUserStore, NICKNAME_MIN, NICKNAME_MAX } from '@/stores/useUserStore';
import { useModulesStore } from '@/stores/useModulesStore';
import { useNameModal } from '@/composables/useNameModal';
import Avatar from '@/components/Avatar.vue';
import { vFeedback, audio } from '@/core/feedback';

const userStore = useUserStore();
const modules = useModulesStore();
const { state, resolveName, resolveCancel } = useNameModal();

const inputEl = ref<HTMLInputElement | null>(null);
const input = ref('');

// 打开时同步初始值并聚焦
watch(
  () => state.open,
  (open) => {
    if (open) {
      input.value = state.initial ?? '';
      nextTick(() => inputEl.value?.focus());
    }
  },
);

// 清洗：trim + 过滤零宽/控制字符（与 store 一致）
const cleaned = computed(() => {
  const trimmed = String(input.value).trim();
  return trimmed.replace(/[\u200B-\u200D\uFEFF\u0000-\u001F\u007F]/g, '');
});
const charLen = computed(() => Array.from(cleaned.value).length);

const error = computed(() => {
  const len = charLen.value;
  if (len === 0) return '名字不能为空';
  if (len < NICKNAME_MIN) return `至少 ${NICKNAME_MIN} 个字`;
  return '';
});
const canConfirm = computed(() => error.value === '');

/** 预览底环五行：跟随当前已设头像（若已选），否则默认紫 */
const previewElement = computed(() => {
  const a = userStore.avatar;
  if (!a) return '' as const;
  return modules.poolConfig.avatars.find((x) => x.emoji === a)?.element ?? ('' as const);
});
const previewText = computed(() => {
  const name = cleaned.value;
  if (!name) return '开启你的灵境之旅';
  return `你好，${name}`;
});

// 实时截断到上限（按码点，emoji 不被拆半个）
function onInput(e: Event) {
  const v = (e.target as HTMLInputElement).value;
  const chars = Array.from(v);
  input.value = chars.length > NICKNAME_MAX ? chars.slice(0, NICKNAME_MAX).join('') : v;
}

function onRandom() {
  input.value = modules.poolRandomName();
  nextTick(() => inputEl.value?.focus());
}

function onConfirm() {
  if (!canConfirm.value) return;
  const name = cleaned.value;
  userStore.setNickname(name); // store 内已二次清洗 + 截断
  audio.play('soft');
  resolveName(name);
}

function onCancel() {
  resolveCancel();
}
</script>

<style scoped>
.nm-mask {
  position: fixed;
  inset: 0;
  z-index: 1300; /* 高于确认弹层(1200) */
  background: var(--mask-modal);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px;
}
.nm-card {
  width: 100%;
  max-width: 330px;
  padding: 22px 20px 18px;
  border-radius: var(--radius-card, 20px);
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-light, rgba(0, 0, 0, .06));
  box-shadow: var(--shadow-float, 0 12px 40px rgba(0, 0, 0, .18));
  text-align: center;
}
.nm-title { margin: 0 0 4px; font-size: 17px; font-weight: 700; color: var(--text-primary); }
.nm-sub { margin: 0 0 16px; font-size: 12px; color: var(--text-muted); }

/* 预览 */
.nm-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
.nm-preview-text { font-size: 13px; color: var(--text-secondary, #555); }

/* 输入框 */
.nm-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  border: 1px solid var(--border-light, rgba(0, 0, 0, .12));
  border-radius: 13px;
  padding: 0 12px;
  background: rgba(0, 0, 0, .02);
  transition: border-color .15s ease;
}
.nm-input-wrap.is-error { border-color: #E08080; }
.nm-input {
  flex: 1;
  height: 44px;
  border: 0;
  outline: 0;
  background: transparent;
  font-size: 16px;
  color: var(--text-primary);
}
.nm-input::placeholder { color: var(--text-muted); }
.nm-count { font-size: 11px; color: var(--text-muted); flex: none; margin-left: 8px; }
.nm-error { margin: 6px 2px 0; font-size: 12px; color: #C94F4F; text-align: left; }

/* 随机按钮 */
.nm-random {
  margin-top: 12px;
  width: 100%;
  height: 38px;
  border: 1px dashed rgba(138, 128, 216, .5);
  border-radius: 12px;
  background: rgba(138, 128, 216, .08);
  color: #6E63C4;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  touch-action: manipulation;
}
.nm-random:active { background: rgba(138, 128, 216, .16); }

/* 操作区 */
.nm-actions { display: flex; gap: 12px; margin-top: 16px; }
.nm-btn {
  flex: 1;
  height: 44px;
  border: 0;
  border-radius: 13px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  touch-action: manipulation;
}
.nm-cancel { background: rgba(0, 0, 0, .05); color: var(--text-secondary, #555); }
.nm-ok { background: linear-gradient(135deg, #8A80D8, #A39AE8); color: #fff; }
.nm-ok:disabled { opacity: .45; cursor: not-allowed; }

.nm-fade-enter-active,
.nm-fade-leave-active { transition: opacity .2s ease; }
.nm-fade-enter-from,
.nm-fade-leave-to { opacity: 0; }
</style>
