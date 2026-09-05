// 来源处飘字服务：动作发生在哪（菜地旁、仙宠旁、上香处），就在哪弹 +X/-X 飘字，
// 与顶栏总量飘字（FloatDelta）形成「双重定位」，让玩家看清「哪一块数值变了」。
import { reactive } from 'vue';

export type FloaterKind =
  | 'up' // 通用增益（绿、上浮）
  | 'down' // 通用消耗（柔和红、下沉）
  | 'qi' // 灵气（青蓝）
  | 'pearl' // 灵珠（粉）
  | 'magic' // 魔丸（紫）
  | 'gold' // 元宝（金）
  | 'jade' // 天玑（翠）
  | 'mood' // 心境（暖）
  | 'info'; // 中性提示

export interface Floater {
  id: number;
  x: number;
  y: number;
  text: string;
  kind: FloaterKind;
}

const floaters = reactive<Floater[]>([]);
let seq = 0;

export function pushFloater(opts: {
  x: number;
  y: number;
  text: string;
  kind?: FloaterKind;
  duration?: number;
}): void {
  const id = ++seq;
  floaters.push({
    id,
    x: opts.x,
    y: opts.y,
    text: opts.text,
    kind: opts.kind ?? 'up',
  });
  const dur = opts.duration ?? 1300;
  window.setTimeout(() => {
    const i = floaters.findIndex((f) => f.id === id);
    if (i >= 0) floaters.splice(i, 1);
  }, dur);
}

// 从 DOM 事件/元素取屏幕坐标（用于来源处飘字定位）
export function rectCenter(el: Element | null | undefined): { x: number; y: number } {
  if (!el) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

export function useFloaters() {
  return { floaters, pushFloater, rectCenter };
}
