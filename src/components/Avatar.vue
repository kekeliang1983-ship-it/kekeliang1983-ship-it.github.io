<!--
  src/components/Avatar.vue —— 全局头像组件
  统一替换各处散落的「昵称首字」展示。
  - 已设头像：显示 emoji
  - 未设（avatar=null）：显示昵称首字，无昵称回退 '友'
  - 底环：按 element 五行渐变；未传则用默认紫（与「我的」页原头像一致）
  一处维护，后续加成就边框只改这里。
-->
<template>
  <div
    class="avatar"
    :style="{
      width: size + 'px',
      height: size + 'px',
      borderRadius: Math.round(size * 0.33) + 'px',
      background: `linear-gradient(135deg, ${ring.from}, ${ring.to})`,
      fontSize: Math.round(size * 0.4) + 'px',
    }"
  >
    <img v-if="isImage" :src="(props.avatar ?? undefined) as string | undefined" class="avatar-img" alt="" referrerpolicy="no-referrer" />
    <span v-else>{{ display }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ElementType } from '@/types/index';
import { useModulesStore } from '@/stores/useModulesStore';

const props = withDefaults(defineProps<{
  name?: string;
  avatar?: string | null;
  element?: ElementType | '';
  size?: number;
}>(), {
  name: '',
  avatar: null,
  element: '',
  size: 54,
});

const modules = useModulesStore();

// 底环色：有五行属性用对应渐变（后台 pool.json 可配），否则默认紫
const ring = computed(() => {
  const r = modules.poolConfig.elementRing;
  const d = modules.poolConfig.defaultRing;
  return props.element && r[props.element] ? r[props.element] : d;
});

// 是否为「上传图片」头像（data:image 前缀）
const isImage = computed(() => !!props.avatar && props.avatar.startsWith('data:image'));

// 展示内容：emoji 头像优先，否则昵称首字（按码点兼容 emoji），再否则 '友'
const display = computed(() => {
  if (props.avatar && !isImage.value) return props.avatar; // emoji
  const c = Array.from((props.name || '').trim())[0];
  return c ?? '友';
});
</script>

<style scoped>
.avatar {
  color: #fff;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  line-height: 1;
  box-shadow: 0 8px 18px rgba(138, 128, 216, .3);
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
  display: block;
}
</style>
