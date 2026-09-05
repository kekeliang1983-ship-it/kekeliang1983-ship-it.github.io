<!--
  src/components/AvatarPickerModal.vue —— 换头像弹窗
  复用 ConfirmModal / NameInputModal 的 teleport + 玻璃卡 overlay 模式（禁用原生 alert）。
  头像库网格选择 + 实时预览（五行底环随所选属性）+ 随机一个 / 恢复首字 / 确定 / 取消。
  驱动：useAvatarModal 单例。挂载点：AppLayout（teleport 到 body，全局任意页可用）。
-->
<template>
  <teleport to="body">
    <transition name="av-fade">
      <div
        v-if="state.open"
        class="av-mask"
        @click.self="onCancel"
      >
        <div class="av-card" role="dialog" aria-modal="true">
          <h3 class="av-title">换个头像</h3>
          <p class="av-sub">挑一个喜欢的符号，五行底环随属性 ✦</p>

          <!-- 实时预览 -->
          <div class="av-preview">
            <Avatar
              :avatar="selected"
              :name="userStore.displayName"
              :element="selectedElement"
              :size="64"
            />
          </div>

          <!-- 头像库网格 -->
          <div class="av-grid">
            <button
              v-for="opt in modules.poolConfig.avatars"
              :key="opt.emoji"
              class="av-cell"
              :class="{ sel: selected === opt.emoji }"
              v-feedback="'BUTTON_CLICK'"
              @click="select(opt.emoji)"
            >{{ opt.emoji }}</button>
          </div>

          <!-- 辅助操作 -->
          <div class="av-tools">
            <button class="av-tool" v-feedback="'BUTTON_CLICK'" @click="onRandom">🎲 随机一个</button>
            <button class="av-tool" v-feedback="'BUTTON_CLICK'" @click="onRestore">↺ 恢复首字</button>
            <button class="av-tool" v-feedback="'BUTTON_CLICK'" @click="onUpload">🖼️ 上传图片</button>
          </div>
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            class="av-file-hidden"
            @change="onFile"
          />

          <!-- 操作区 -->
          <div class="av-actions">
            <button class="av-btn av-cancel" v-feedback="'BUTTON_CLICK'" @click="onCancel">取消</button>
            <button class="av-btn av-ok" v-feedback="'BUTTON_CLICK'" @click="onConfirm">确定</button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useUserStore } from '@/stores/useUserStore';
import { useModulesStore } from '@/stores/useModulesStore';
import { useAvatarModal } from '@/composables/useAvatarModal';
import Avatar from '@/components/Avatar.vue';
import { compressAvatar } from '@/utils/image';
import { vFeedback, audio } from '@/core/feedback';

const userStore = useUserStore();
const modules = useModulesStore();
const { state, resolveAvatar, resolveCancel } = useAvatarModal();

// 当前选中（打开时同步为已设头像；null=未选=首字态）
const selected = ref<string | null>(userStore.avatar);

watch(
  () => state.open,
  (open) => { if (open) selected.value = userStore.avatar; },
);

// 选中项的五行（决定预览底环色）；未选回默认
const selectedElement = computed(() => {
  const v = selected.value;
  if (!v) return '' as const;
  if (v.startsWith('data:image')) return '' as const; // 上传图：默认环
  return modules.poolConfig.avatars.find((a) => a.emoji === v)?.element ?? ('' as const);
});

function select(emoji: string) { selected.value = emoji; }

function onRandom() {
  selected.value = modules.poolRandomAvatar().emoji;
  audio.play('soft');
}

// 恢复首字：预览回到昵称首字（确定时置 null）
function onRestore() { selected.value = null; }

// 上传图片：打开文件选择器
const fileInput = ref<HTMLInputElement | null>(null);
function onUpload() { fileInput.value?.click(); }

// 选图后自动压缩（居中裁剪 + 缩放 + WebP），结果作为 dataURL 头像即时预览
function onFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = ''; // 允许重复选同一文件
  if (!file) return;
  compressAvatar(file, { maxSize: 256, quality: 0.9 })
    .then((dataUrl) => { selected.value = dataUrl; audio.play('soft'); })
    .catch(() => { /* 压缩失败静默忽略，禁用 alert */ });
}

function onConfirm() {
  const v = selected.value;
  userStore.setAvatar(v); // v 为 emoji 或 null（恢复首字）
  audio.play('soft');
  resolveAvatar(v);
}

function onCancel() {
  resolveCancel();
}
</script>

<style scoped>
.av-mask {
  position: fixed;
  inset: 0;
  z-index: 1300; /* 与起名弹窗同级（高于确认弹层 1200） */
  background: var(--mask-modal);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px;
}
.av-card {
  width: 100%;
  max-width: 340px;
  padding: 22px 20px 18px;
  border-radius: var(--radius-card, 20px);
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-light, rgba(0, 0, 0, .06));
  box-shadow: var(--shadow-float, 0 12px 40px rgba(0, 0, 0, .18));
  text-align: center;
}
.av-title { margin: 0 0 4px; font-size: 17px; font-weight: 700; color: var(--text-primary); }
.av-sub { margin: 0 0 14px; font-size: 12px; color: var(--text-muted); }

.av-preview { display: flex; justify-content: center; margin-bottom: 16px; }

/* 网格 */
.av-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  max-height: 230px;
  overflow-y: auto;
  padding: 2px;
}
.av-cell {
  aspect-ratio: 1 / 1;
  border: 2px solid transparent;
  border-radius: 14px;
  background: rgba(0, 0, 0, .03);
  font-size: 24px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  touch-action: manipulation;
  transition: border-color .15s ease, background .15s ease, transform .1s ease;
}
.av-cell:active { transform: scale(.92); }
.av-cell.sel {
  border-color: var(--accent, #8A80D8);
  background: rgba(138, 128, 216, .12);
}

/* 辅助操作 */
.av-tools {
  display: flex;
  gap: 12px;
  margin-top: 14px;
}
.av-tool {
  flex: 1;
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
.av-tool:active { background: rgba(138, 128, 216, .16); }
.av-file-hidden { display: none; }

/* 操作区 */
.av-actions { display: flex; gap: 12px; margin-top: 14px; }
.av-btn {
  flex: 1;
  height: 44px;
  border: 0;
  border-radius: 13px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  touch-action: manipulation;
}
.av-cancel { background: rgba(0, 0, 0, .05); color: var(--text-secondary, #555); }
.av-ok { background: linear-gradient(135deg, #8A80D8, #A39AE8); color: #fff; }

.av-fade-enter-active,
.av-fade-leave-active { transition: opacity .2s ease; }
.av-fade-enter-from,
.av-fade-leave-to { opacity: 0; }
</style>
