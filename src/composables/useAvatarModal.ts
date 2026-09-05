// src/composables/useAvatarModal.ts —— 换头像弹窗单例（镜像 useNameModal 模式）
// 全局共享同一弹窗实例：open() 返回 Promise<string | null | undefined>。
// - 用户点「确定」并选了某 emoji：resolve(emoji)
// - 用户点「确定」并选「恢复首字」：resolve(null)（置回昵称首字）
// - 用户点「取消」/ 遮罩：resolve(undefined)（调用方据 undefined 判断为取消，不改头像）
import { reactive } from 'vue';

interface AvatarModalState {
  open: boolean;
  _resolve?: (r: string | null | undefined) => void;
}

const state = reactive<AvatarModalState>({
  open: false,
  _resolve: undefined,
});

export function useAvatarModal() {
  /** 弹出换头像弹窗 */
  function open(): Promise<string | null | undefined> {
    state.open = true;
    return new Promise<string | null | undefined>((resolve) => {
      state._resolve = resolve;
    });
  }

  /** 弹窗内部调用：确认（emoji 或 null=恢复首字） */
  function resolveAvatar(emoji: string | null) {
    const r = state._resolve;
    state.open = false;
    state._resolve = undefined;
    r?.(emoji);
  }

  /** 弹窗内部调用：取消 / 点遮罩 */
  function resolveCancel() {
    const r = state._resolve;
    state.open = false;
    state._resolve = undefined;
    r?.(undefined);
  }

  return { state, open, resolveAvatar, resolveCancel };
}
