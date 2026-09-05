/**
 * src/composables/usePageIntro.ts
 * 页面「轻量入场」动画 composable（Tab 页/子页样板，手感和首页同源）
 *
 * 设计原则（用户拍板：避免费电，但保持一定表现效果）：
 * 1. 省电：循环动效 ≤2 个，且只用 transform（不做 blur/box-shadow/opacity 循环）；
 *    入场单段时长 ≤0.45s、段间叠放推进，总观感 ≈0.55s
 * 2. 手感统一：入场 expo.out（卡片用 back.out）、循环 sine.inOut —— 与首页 GSAP 一致
 * 3. 优雅降级：window.gsap 不可用（CDN 失败/离线）时静默跳过，页面保持静态可读
 * 4. 尊重系统：prefers-reduced-motion: reduce 时仅清理残留、不播动画
 * 5. keepAlive 友好：onMounted 仅在首次进入触发，切 Tab 回来不重放（AppLayout 缓存页面）
 * 6. 生命周期安全：循环 tween 全部带 id，卸载时精准 kill，防卡死/泄漏
 */
import { onMounted, onBeforeUnmount, ref } from 'vue';

export interface PageIntroSection {
  /** CSS 选择器（页面根内） */
  selector: string;
  /** 上浮距离 px，默认 16 */
  y?: number;
  /** 起始缩放，默认 1（如 0.985） */
  scale?: number;
  /** 时长 s，默认 0.4 */
  duration?: number;
  /** 缓动；缺省时「有 stagger → back.out(1.6)」/「无 stagger → expo.out」 */
  ease?: string;
  /** stagger 间距 s；0/省略 = 整体进入 */
  stagger?: number;
  /** stagger 方向：center / start / end */
  from?: 'center' | 'start' | 'end';
}

export interface PageIntroLoop {
  /** CSS 选择器 */
  selector: string;
  /** 浮动位移 px，默认 -4 */
  y?: number;
  /** 微旋转 deg，默认 0 */
  rotation?: number;
  /** 单程周期 s，默认 2.8 */
  duration?: number;
  /** 错峰延迟 s，默认 0 */
  delay?: number;
}

export interface PageIntroOptions {
  /** 页面根元素选择器（SFC 根 div 的类名，如 '.farm-page'） */
  rootSelector: string;
  /** 入场区块（按声明顺序依次叠放推进） */
  sections?: PageIntroSection[];
  /** 循环动效（内部强制截断为 ≤2 个，省电） */
  loops?: PageIntroLoop[];
  /** 入场延迟 s，默认 0.05 */
  delay?: number;
}

const LOOP_PREFIX = 'pageintro-loop-';

/** 全局 GSAP（CDN 挂 window；组件内勿 import 包，避免重复加载） */
function getGsap(): any {
  return (window as any).gsap || null;
}

export function usePageIntro(options: PageIntroOptions) {
  const rootRef = ref<HTMLElement | null>(null);

  let tl: any = null;
  const loopIds: string[] = [];
  let _replayLock = false;

  /** 停掉全部循环 tween + 进行中的入场 timeline */
  function _killAll(g: any) {
    if (!g) return;
    try {
      loopIds.forEach((id) => {
        try { g.getById(id)?.kill?.(); } catch (_e) { /* noop */ }
      });
      loopIds.length = 0;
    } catch (_e) { /* noop */ }
  }

  /** 清掉上次动画残留的终态属性（transform/opacity/visibility/transition 等） */
  function _clearProps(g: any, rootEl: HTMLElement) {
    try {
      const targets = (options.sections || []).map((s) => s.selector).filter(Boolean).join(', ');
      if (targets) {
        g.set(rootEl.querySelectorAll(targets), {
          clearProps: 'transform,opacity,autoAlpha,visibility,scale,rotation,transition',
        });
      }
      const loopTargets = (options.loops || []).map((l) => l.selector).filter(Boolean).join(', ');
      if (loopTargets) {
        g.set(rootEl.querySelectorAll(loopTargets), {
          clearProps: 'transform,opacity,visibility,scale,rotation,transition',
        });
      }
    } catch (_e) { /* noop */ }
  }

  /**
   * 入场动画期间给目标元素临时置 transition:none（inline 覆盖），
   * 结束后还原 —— 否则元素自带 CSS transition（如 .slot.selected 的
   * translateY 过渡）会和 GSAP 逐帧动画双重插值，导致明显卡顿（卡顿主因）
   */
  function _applyTransitionGuard(g: any, rootEl: HTMLElement) {
    try {
      const targets = (options.sections || []).map((s) => s.selector).filter(Boolean).join(', ');
      if (targets) {
        g.set(rootEl.querySelectorAll(targets), { transition: 'none' });
      }
    } catch (_e) { /* noop */ }
  }

  /** 估算入场总时长（近似：逐段叠加、扣除段间叠放 0.03s），用于循环动效延迟启动 */
  function _introTotal(): number {
    let total = options.delay ?? 0.05;
    (options.sections || []).forEach((s, i) => {
      const dur = s.duration ?? 0.4;
      total += i === 0 ? dur : Math.max(0, dur - 0.03);
    });
    return total;
  }

  function _build(rootEl: HTMLElement) {
    const g = getGsap();
    if (!g || !rootEl) return;

    const reduceMotion = typeof matchMedia !== 'undefined'
      && matchMedia('(prefers-reduced-motion: reduce)').matches;

    _killAll(g);
    if (tl) { try { tl.kill?.(true); } catch (_e) {} tl = null; }
    _clearProps(g, rootEl);

    if (reduceMotion) return;

    // 入场前抑制 CSS transition，动画结束后（含被打断）还原
    _applyTransitionGuard(g, rootEl);

    // —— 入场：段间 '<0.03' 叠放推进，整体不拖沓；force3D 走 GPU 合成层 ——
    tl = g.timeline({ delay: options.delay ?? 0.05 });
    (options.sections || []).forEach((sec, i) => {
      const dur = sec.duration ?? 0.4;
      const hasStagger = !!(sec.stagger && sec.stagger > 0);
      const vars: Record<string, any> = {
        y: sec.y ?? 16,
        autoAlpha: 0,
        duration: dur,
        ease: sec.ease || (hasStagger ? 'back.out(1.6)' : 'expo.out'),
        force3D: true,
      };
      if (sec.scale && sec.scale !== 1) vars.scale = sec.scale;
      if (hasStagger) {
        vars.stagger = { from: sec.from || 'center', amount: sec.stagger };
      }
      tl.from(sec.selector, vars, i === 0 ? 0 : '<0.03');
    });
    // 动画完成/被打断后清掉 inline 残留（transform/transition 等），还原 CSS 类样式
    const finishCleanup = () => _clearProps(g, rootEl);
    tl.eventCallback('onComplete', finishCleanup);
    tl.eventCallback('onInterrupt', finishCleanup);

    // —— 循环动效（≤2 个；只动 transform + force3D 合成层；延迟到入场完成后再启动，避免入场并发掉帧）——
    const loopBase = _introTotal() + 0.15;
    (options.loops || []).slice(0, 2).forEach((lp, i) => {
      const els: HTMLElement[] = Array.from(rootEl.querySelectorAll(lp.selector));
      els.forEach((el, j) => {
        g.to(el, {
          id: LOOP_PREFIX + i + '-' + j,
          y: lp.y ?? -4,
          rotation: lp.rotation ?? 0,
          duration: lp.duration ?? 2.8,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          force3D: true,
          willChange: 'transform',
          delay: loopBase + (lp.delay ?? 0) + j * 0.15,
        });
      });
    });
  }

  /** 重播入场（调试用；600ms 防抖防连点卡顿） */
  function replay() {
    if (_replayLock) return;
    _replayLock = true;
    setTimeout(() => { _replayLock = false; }, 600);
    const root = (document.querySelector(options.rootSelector) as HTMLElement) || rootRef.value;
    if (root) _build(root);
  }

  onMounted(() => {
    const root = (document.querySelector(options.rootSelector) as HTMLElement) || rootRef.value;
    if (root) _build(root);
  });

  onBeforeUnmount(() => {
    const g = getGsap();
    _killAll(g);
    if (tl) { try { tl.kill?.(true); } catch (_e) {} tl = null; }
  });

  return { rootRef, replay };
}
