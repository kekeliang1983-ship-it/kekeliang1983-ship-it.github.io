// 全局资源变动总线：在 store 的数值入口（货币/灵气/心境增减）统一广播真实变动量，
// 供顶栏飘字（FloatDelta）消费。一处广播、全局受益，无需在各页面逐个埋点。
import type { Ref } from 'vue';

export type ResourceType = 'gold' | 'pearl' | 'magic' | 'jade' | 'qi' | 'mood';

export interface ResourceDelta {
  type: ResourceType;
  amount: number; // 实际变动量（可正可负）
  ts: number;
}

type Listener = (d: ResourceDelta) => void;
const listeners = new Set<Listener>();

export function emitResourceDelta(type: ResourceType, amount: number): void {
  if (!amount) return;
  const d: ResourceDelta = { type, amount, ts: Date.now() };
  listeners.forEach((l) => l(d));
}

export function onResourceDelta(cb: Listener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

// 给 ResourceHud 顶栏翻滚用的轻量订阅（避免直接依赖组件实例）
export function watchResourceDelta(getRef: () => Ref<ResourceDelta[]>): () => void {
  return onResourceDelta((d) => {
    const arr = getRef();
    arr.value = [...arr.value.slice(-12), d];
  });
}
