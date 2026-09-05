// src/composables/useToast.ts —— 页面级轻提示（抽自灵植/天籁/仙宠各页重复实现）
// 用法：const { toastMsg, showToast } = useToast(); 模板 <div class="toast" v-if="toastMsg">{{ toastMsg }}</div>
// toast 样式各页 scoped 重复，保留在页面（后续可再抽全局组件）
import { ref, onUnmounted } from 'vue';

// duration=0 表示不自动消失（需手动 hideToast 关闭，如灵植福缘 toast）
export function useToast(duration = 2400) {
  const toastMsg = ref('');
  let timer: number | undefined;

  function hideToast() {
    toastMsg.value = '';
    if (timer) clearTimeout(timer);
    timer = undefined;
  }

  function showToast(msg: string) {
    toastMsg.value = msg;
    if (timer) clearTimeout(timer);
    timer = duration > 0
      ? window.setTimeout(() => { toastMsg.value = ''; }, duration)
      : undefined;
  }

  onUnmounted(() => {
    if (timer) clearTimeout(timer);
    timer = undefined;
  });

  return { toastMsg, showToast, hideToast };
}
