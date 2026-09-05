// src/core/devClock.ts —— 开发者调试开关（仅 ?debug=1 时启用，生产构建不可达）
import { ref } from 'vue';

/** 是否开启调试台：URL 带 ?debug=1 即开启（需手动访问，普通用户访问不到） */
export const isDevMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('debug') === '1';
  } catch {
    return false;
  }
};

/** 作物生长时间倍速（仅作用于 FarmPage 的每秒 tick dt），1=正常，300=快 300 倍 */
export const devTimeScale = ref<number>(1);

/** 在真实流逝时间 dt(秒) 上叠加调试倍速；非调试态恒为 1 倍 */
export const scaleElapsed = (dtSeconds: number): number => dtSeconds * devTimeScale.value;
