<!--
  src/components/PetNameModal.vue —— 宠物命名 / 改名弹窗
  复用 NameInputModal 的 teleport + 玻璃卡 overlay 模式（禁用原生 alert）。
  玩法：仙宠页点宠物名唤起；实时预览宠物 emoji + 名字；🎲随机一个复用 108 词库；
  2~8 字校验（与玩家昵称同套）；留空确认 = 恢复默认名「小灵灵」。
  确定时直接调 useModulesStore.setPetName（含二次清洗），改名后比赛自动显示宠物名。
-->
<template>
  <teleport to="body">
    <transition name="pnm-fade">
      <div
        v-if="open"
        class="pnm-mask"
        @click.self="onCancel"
      >
        <div class="pnm-card" role="dialog" aria-modal="true">
          <h3 class="pnm-title">给伙伴起个名字</h3>
          <p class="pnm-sub">2~8 个字，比赛中它就是它的招牌 ✦</p>

          <!-- 实时预览 -->
          <div class="pnm-preview">
            <span class="pnm-emoji">{{ petEmoji }}</span>
            <div class="pnm-preview-text">{{ previewText }}</div>
          </div>

          <!-- 输入框 -->
          <div class="pnm-input-wrap" :class="{ 'is-error': !!error }">
            <input
              ref="inputEl"
              v-model="input"
              class="pnm-input"
              type="text"
              maxlength="16"
              :placeholder="'输入名字…'"
              @input="onInput"
              @keyup.enter="onConfirm"
            />
            <span class="pnm-count">{{ charLen }} / {{ NICKNAME_MAX }}</span>
          </div>
          <p v-if="error" class="pnm-error">{{ error }}</p>
          <p v-else-if="charLen === 0" class="pnm-hint">留空确认将恢复默认名「小灵灵」</p>

          <!-- 随机一个 -->
          <button class="pnm-random" v-feedback="'BUTTON_CLICK'" @click="onRandom">
            🎲 随机一个
          </button>

          <!-- 操作区 -->
          <div class="pnm-actions">
            <button class="pnm-btn pnm-cancel" v-feedback="'BUTTON_CLICK'" @click="onCancel">取消</button>
            <button
              class="pnm-btn pnm-ok"
              v-feedback="'BUTTON_CLICK'"
              :disabled="!canConfirm"
              @click="onConfirm"
            >确定</button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useModulesStore, PET_META } from '@/stores/useModulesStore';
import { NICKNAME_MIN, NICKNAME_MAX } from '@/stores/index';
import { vFeedback, audio } from '@/core/feedback';

const props = defineProps<{ open: boolean; initial?: string }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const modules = useModulesStore();

const inputEl = ref<HTMLInputElement | null>(null);
const input = ref('');

const petEmoji = computed(() => PET_META[modules.pet.type]?.emoji ?? '🐾');

// 打开时同步初始值并聚焦
watch(
  () => props.open,
  (open) => {
    if (open) {
      input.value = (props.initial ?? modules.pet.petName ?? '').trim();
      nextTick(() => inputEl.value?.focus());
    }
  },
);

// 清洗：trim + 过滤零宽/控制字符（与 store.setPetName 一致）
const cleaned = computed(() => {
  const trimmed = String(input.value).trim();
  return trimmed.replace(/[\u200B-\u200D\uFEFF\u0000-\u001F\u007F]/g, '');
});
const charLen = computed(() => Array.from(cleaned.value).length);

const error = computed(() => {
  const len = charLen.value;
  if (len > 0 && len < NICKNAME_MIN) return `至少 ${NICKNAME_MIN} 个字`;
  return '';
});
// 允许空输入（=恢复默认名）
const canConfirm = computed(() => error.value === '');

const previewText = computed(() => {
  const name = cleaned.value;
  if (!name) return '它将以「小灵灵」示人';
  return `以后就叫 ${name} 啦`;
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
  modules.setPetName(cleaned.value || null); // 空 → 回退默认名
  audio.play('soft');
  emit('close');
}

function onCancel() {
  emit('close');
}
</script>

<style scoped>
.pnm-mask {
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
.pnm-card {
  width: 100%;
  max-width: 330px;
  padding: 22px 20px 18px;
  border-radius: var(--radius-card, 20px);
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-light, rgba(0, 0, 0, .06));
  box-shadow: var(--shadow-float, 0 12px 40px rgba(0, 0, 0, .18));
  text-align: center;
}
.pnm-title { margin: 0 0 4px; font-size: 17px; font-weight: 700; color: var(--text-primary); }
.pnm-sub { margin: 0 0 14px; font-size: 12px; color: var(--text-muted); }

/* 预览 */
.pnm-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
.pnm-emoji { font-size: 46px; filter: drop-shadow(0 6px 12px rgba(80, 70, 120, .25)); }
.pnm-preview-text { font-size: 13px; color: var(--text-secondary, #555); }

/* 输入框 */
.pnm-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  border: 1px solid var(--border-light, rgba(0, 0, 0, .12));
  border-radius: 13px;
  padding: 0 12px;
  background: rgba(0, 0, 0, .02);
  transition: border-color .15s ease;
}
.pnm-input-wrap.is-error { border-color: #E08080; }
.pnm-input {
  flex: 1;
  height: 44px;
  border: 0;
  outline: 0;
  background: transparent;
  font-size: 16px;
  color: var(--text-primary);
}
.pnm-input::placeholder { color: var(--text-muted); }
.pnm-count { font-size: 11px; color: var(--text-muted); flex: none; margin-left: 8px; }
.pnm-error { margin: 6px 2px 0; font-size: 12px; color: #C94F4F; text-align: left; }
.pnm-hint { margin: 6px 2px 0; font-size: 12px; color: var(--text-muted); text-align: left; }

/* 随机按钮 */
.pnm-random {
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
.pnm-random:active { background: rgba(138, 128, 216, .16); }

/* 操作区 */
.pnm-actions { display: flex; gap: 12px; margin-top: 16px; }
.pnm-btn {
  flex: 1;
  height: 44px;
  border: 0;
  border-radius: 13px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  touch-action: manipulation;
}
.pnm-cancel { background: rgba(0, 0, 0, .05); color: var(--text-secondary, #555); }
.pnm-ok { background: linear-gradient(135deg, #8A80D8, #A39AE8); color: #fff; }
.pnm-ok:disabled { opacity: .45; cursor: not-allowed; }

.pnm-fade-enter-active,
.pnm-fade-leave-active { transition: opacity .2s ease; }
.pnm-fade-enter-from,
.pnm-fade-leave-to { opacity: 0; }
</style>
