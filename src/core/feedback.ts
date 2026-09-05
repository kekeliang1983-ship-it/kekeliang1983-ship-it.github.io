// src/core/feedback.ts —— 原生感交互反馈引擎（触觉+听觉+视觉）
// 严格对应策划文档 06-交互反馈.txt 全部8个FEEDBACK_PRESETS
import type { DirectiveBinding } from 'vue';

export type HapticPattern = 'light'|'medium'|'heavy'|'success'|'error'|'selection'|'impact';
class HapticEngine {
  private static i: HapticEngine;
  private ok = false;
  private enabled = true;
  private constructor() {
    this.ok = 'vibrate' in navigator;
    if (this.ok) { try { navigator.vibrate(1); } catch { this.ok = false; } }
  }
  static getInstance() { if (!HapticEngine.i) HapticEngine.i = new HapticEngine(); return HapticEngine.i; }
  setEnabled(v: boolean) { this.enabled = v; }
  play(p: HapticPattern) {
    if (!this.ok || !this.enabled) return;
    try { navigator.vibrate(this.seq(p)); } catch { /* ignore */ }
  }
  private seq(p: HapticPattern): number | number[] {
    switch (p) {
      case 'light': return 8;
      case 'medium': return 15;
      case 'heavy': return 30;
      case 'selection': return 5;
      case 'impact': return [20, 30, 20];
      case 'success': return [10, 50, 10, 50, 10];
      case 'error': return [50, 100, 50];
    }
  }
}
export const haptic = HapticEngine.getInstance();

export type AudioFeedbackType = 'click'|'soft'|'success'|'error'|'pray'|'coin';
class AudioEngine {
  private static i: AudioEngine;
  private ctx: AudioContext | null = null;
  private enabled = true;
  private inited = false;
  private constructor() { this.wake(); }
  static getInstance() { if (!AudioEngine.i) AudioEngine.i = new AudioEngine(); return AudioEngine.i; }
  private wake() {
    const up = () => {
      if (!this.ctx) {
        try { this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); }
        catch { /* 不支持 */ }
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      if (this.ctx && this.ctx.state === 'running') {
        this.inited = true;
        document.removeEventListener('touchstart', up);
        document.removeEventListener('click', up);
      }
    };
    document.addEventListener('touchstart', up, { once: true, passive: true });
    document.addEventListener('click', up, { once: true, passive: true });
  }
  setEnabled(v: boolean) { this.enabled = v; }
  play(t: AudioFeedbackType, volume = 0.12) {
    if (!this.enabled || !this.inited) return;
    if (!this.ctx || this.ctx.state !== 'running') { this.ctx?.resume(); return; }
    try {
      const now = this.ctx.currentTime;
      const c = this.cfg(t);
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.connect(g); g.connect(this.ctx.destination);
      o.type = c.type;
      o.frequency.setValueAtTime(c.freq, now);
      // 频率滑动：success 上行（完成感）/ error 下行（警示感）/ 其余轻滑
      if (c.freqEnd) o.frequency.exponentialRampToValueAtTime(c.freqEnd, now + c.duration);
      // 轻柔起音 + 衰减包络，避免爆音、贴合治愈调性
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(volume, now + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, now + c.duration);
      o.start(now);
      o.stop(now + c.duration);
    } catch { /* ignore */ }
  }
  private cfg(t: AudioFeedbackType): { freq: number; freqEnd?: number; duration: number; type: OscillatorType } {
    switch (t) {
      case 'click':   return { freq: 620,  freqEnd: 860,  duration: .06, type: 'triangle' };
      case 'soft':    return { freq: 500,  freqEnd: 700,  duration: .10, type: 'sine' };
      case 'success': return { freq: 880,  freqEnd: 1320, duration: .20, type: 'triangle' };
      case 'error':   return { freq: 320,  freqEnd: 170,  duration: .24, type: 'triangle' };
      case 'pray':    return { freq: 196,  freqEnd: 294,  duration: .75, type: 'sine' };
      case 'coin':    return { freq: 1318, freqEnd: 1760, duration: .07, type: 'sine' };
    }
  }
}
export const audio = AudioEngine.getInstance();

/* ---------- 视觉瞬时反馈 ---------- */
export function applyPressScale(el: HTMLElement, scale = .95, duration = 150) {
  if ((el as any)._pa) (el as any)._pa.cancel();
  const a = el.animate(
    [{ transform: 'scale(1)' }, { transform: `scale(${scale})` }, { transform: 'scale(1)' }],
    { duration, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'forwards' as FillMode },
  );
  (el as any)._pa = a;
  a.onfinish = () => { (el as any)._pa = null; };
}
export function shakeElement(el: HTMLElement) {
  el.animate(
    [
      { transform: 'translateX(0)' }, { transform: 'translateX(-10px)' },
      { transform: 'translateX(10px)' }, { transform: 'translateX(-6px)' },
      { transform: 'translateX(6px)' }, { transform: 'translateX(0)' },
    ],
    { duration: 400, fill: 'forwards' as FillMode },
  );
}
export function popElement(el: HTMLElement) {
  el.animate(
    [{ transform: 'scale(.5)', opacity: 0 }, { transform: 'scale(1.1)', opacity: 1 }, { transform: 'scale(1)' }],
    { duration: 300, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'forwards' as FillMode },
  );
}

/* ---------- 上下文反馈映射表（06-交互反馈 L312-L364 共8个）---------- */
export interface FeedbackConfig {
  haptic?: HapticPattern; audio?: AudioFeedbackType;
  visual?: 'press' | 'ripple' | 'shake' | 'pop' | 'none'; visualScale?: number;
}
export const FEEDBACK_PRESETS = {
  BUTTON_CLICK:     { haptic: 'light',   audio: 'click',   visual: 'press', visualScale: .95 },
  PRIMARY_ACTION:   { haptic: 'medium',  audio: 'success', visual: 'press', visualScale: .92 },
  MAJOR_CONFIRM:    { haptic: 'heavy',   audio: 'coin',    visual: 'pop' },
  ERROR_FEEDBACK:   { haptic: 'error',   audio: 'error',   visual: 'shake' },
  PRAY_LONG_PRESS:  { haptic: 'impact',  audio: 'pray',    visual: 'none' },
  SWIPE_SELECT:     { haptic: 'selection', audio: 'soft',  visual: 'none' },
  CARD_TURN:        { haptic: 'light',   audio: 'soft',    visual: 'press', visualScale: .97 },
  COLLECT_SUCCESS:  { haptic: 'success', audio: 'success', visual: 'pop' },
} as const;
export type FeedbackPreset = keyof typeof FEEDBACK_PRESETS;

export function triggerFeedback(preset: FeedbackPreset, el?: HTMLElement, _e?: MouseEvent|TouchEvent) {
  const c = FEEDBACK_PRESETS[preset]; if (!c) return;
  if (c.haptic) haptic.play(c.haptic);
  if (c.audio)  audio.play(c.audio);
  if (el) {
    switch (c.visual) {
      case 'press': applyPressScale(el, c.visualScale || .95); break;
      case 'shake': shakeElement(el); break;
      case 'pop':   popElement(el);   break;
    }
  }
}

/* ---------- Vue 3 自定义指令：v-feedback="'BUTTON_CLICK'" ---------- */
interface FDirVal { preset: FeedbackPreset; ripple?: boolean; disabled?: boolean }
export const vFeedback = {
  mounted(el: HTMLElement, binding: DirectiveBinding<FeedbackPreset | FDirVal>) {
    // 兼容TS旧版声明：webkitTapHighlightColor属扩展属性，用as any绕过类型检查
    (el.style as any).webkitTapHighlightColor = 'transparent';
    el.style.userSelect = 'none';
    el.style.cursor = 'pointer';
    el.style.touchAction = 'manipulation';
    let preset: FeedbackPreset; let disabled = false;
    if (typeof binding.value === 'string') preset = binding.value;
    else { preset = binding.value.preset; disabled = binding.value.disabled ?? false; }

    const onDown = (e: PointerEvent) => {
      if (disabled) return;
      e.preventDefault?.();
      const cfg = FEEDBACK_PRESETS[preset];
      if (cfg) triggerFeedback(preset, el, e);
    };
    const onCtx = (e: Event) => e.preventDefault();
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('contextmenu', onCtx);
    (el as any)._fbCleanup = () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('contextmenu', onCtx);
    };
    (el as any)._fbUpdate = (v: boolean) => { disabled = v; };
  },
  updated(el: HTMLElement, binding: DirectiveBinding<FeedbackPreset | FDirVal>) {
    if (typeof binding.value !== 'string' && binding.value.disabled !== undefined) {
      (el as any)._fbUpdate?.(binding.value.disabled);
    }
  },
  unmounted(el: HTMLElement) { (el as any)._fbCleanup?.(); },
};

/* ---------- 全局样式注入 + 初始化 ---------- */
export function injectFeedbackStyles() {
  if (document.getElementById('feedback-global-styles')) return;
  const s = document.createElement('style');
  s.id = 'feedback-global-styles';
  s.textContent = `
    body { -webkit-tap-highlight-color: transparent; -webkit-touch-callout: none; user-select: none; }
    button, .clickable, [role=button] { will-change: transform; transition: transform .05s ease-out; touch-action: manipulation; }
    .scrollable { -webkit-overflow-scrolling: touch; overscroll-behavior: contain; }
  `;
  document.head.appendChild(s);
}
export function initFeedback() {
  injectFeedbackStyles();
  if (typeof window !== 'undefined') {
    (window as any).__feedback = { haptic, audio, trigger: triggerFeedback, presets: FEEDBACK_PRESETS };
  }
}

export default {
  haptic, audio, triggerFeedback, FEEDBACK_PRESETS, vFeedback, initFeedback,
  applyPressScale, shakeElement, popElement,
};
