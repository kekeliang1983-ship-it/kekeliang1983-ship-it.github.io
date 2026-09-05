// src/composables/useNameModal.ts —— 起名/改名弹窗单例（镜像 useConfirm 模式）
// 全局共享同一弹窗实例：open() 返回 Promise<string | null>。
// - 用户点「确定」：写入昵称后 resolve(name)
// - 用户点「取消」/遮罩/✕/「稍后再说」：resolve(null)
// 调用方据返回值决定行为（首进引导模式下 null 表示跳过，需持久化 renameSkipped）。
import { reactive } from 'vue';

export type NameModalMode = 'first' | 'edit';

interface NameModalState {
  open: boolean;
  mode: NameModalMode;
  initial: string;
  _resolve?: (name: string | null) => void;
}

const state = reactive<NameModalState>({
  open: false,
  mode: 'edit',
  initial: '',
  _resolve: undefined,
});

export function useNameModal() {
  /** 弹出起名弹窗；首进引导用 mode:'first'，手动改名用 mode:'edit' */
  function open(opts?: { mode?: NameModalMode; initial?: string }): Promise<string | null> {
    state.mode = opts?.mode ?? 'edit';
    state.initial = opts?.initial ?? '';
    state.open = true;
    return new Promise<string | null>((resolve) => {
      state._resolve = resolve;
    });
  }

  /** 弹窗内部调用：确定并写入昵称 */
  function resolveName(name: string) {
    const r = state._resolve;
    state.open = false;
    state._resolve = undefined;
    r?.(name);
  }

  /** 弹窗内部调用：取消 / 跳过 */
  function resolveCancel() {
    const r = state._resolve;
    state.open = false;
    state._resolve = undefined;
    r?.(null);
  }

  return { state, open, resolveName, resolveCancel };
}
