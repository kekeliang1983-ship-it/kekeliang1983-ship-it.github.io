// src/composables/useConfirm.ts —— 全局购买/消耗二次确认（防误触）
// 单例：所有购买点共享同一弹窗实例，ask() 返回 Promise<boolean>，
// 用户点「确认」→ resolve(true)，点「取消」/遮罩/✕ → resolve(false)。
import { reactive } from 'vue';
import type { Currency } from '@/types';
import { CURRENCY_LABEL } from '@/constants/shop';

export type CostMap = Partial<Record<Currency, number>>;

interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  costText: string;
  _resolve?: (ok: boolean) => void;
}

const state = reactive<ConfirmState>({
  open: false,
  title: '确认操作',
  message: '',
  confirmText: '确认',
  cancelText: '取消',
  costText: '',
  _resolve: undefined,
});

function costToText(cost?: CostMap): string {
  if (!cost) return '';
  const parts: string[] = [];
  (['gold', 'pearl', 'magic', 'jade'] as Currency[]).forEach((c) => {
    const n = cost[c];
    if (n) parts.push(`${n} ${CURRENCY_LABEL[c]}`);
  });
  const qi = (cost as Partial<Record<string, number>>).qi;
  if (qi) parts.push(`${qi} 灵气`);
  return parts.length ? `将消耗 ${parts.join(' · ')}` : '';
}

export function useConfirm() {
  /** 弹出确认框，返回用户是否点「确认」 */
  function ask(opts: {
    title?: string;
    message: string;
    cost?: CostMap;
    confirmText?: string;
    cancelText?: string;
  }): Promise<boolean> {
    state.title = opts.title ?? '确认操作';
    state.message = opts.message;
    state.costText = costToText(opts.cost);
    state.confirmText = opts.confirmText ?? '确认';
    state.cancelText = opts.cancelText ?? '取消';
    state.open = true;
    return new Promise<boolean>((resolve) => {
      state._resolve = resolve;
    });
  }

  function resolve(val: boolean) {
    const r = state._resolve;
    state.open = false;
    state._resolve = undefined;
    r?.(val);
  }

  return { state, ask, confirm: () => resolve(true), cancel: () => resolve(false) };
}
