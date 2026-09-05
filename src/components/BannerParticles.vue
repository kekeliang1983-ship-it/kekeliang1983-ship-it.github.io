<template>
  <canvas ref="cv" class="banner-particles" :class="{ off: !active }"></canvas>
</template>

<script setup lang="ts">
// Canvas 单图层粒子引擎：用 Canvas 而非 DOM 节点，150 个粒子也能稳定 60fps。
// 承载量三道闸：① 硬上限 maxCount 滑块锁顶 ② 设备分级自动降级 ③ 性能预设（由 count 体现）
// 无障碍/省电：尊重 prefers-reduced-motion（关闭动画），页面切后台时暂停 rAF。
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import type { BannerParticles as PConfig } from '@/stores/useContentStore';

const props = defineProps<{
  particles?: PConfig | null;
  /** 后台编辑预览用：忽略系统「减少动态」强制显示，便于作者调参。首页 App 不传，仍尊重无障碍。 */
  ignoreReducedMotion?: boolean;
}>();

const cv = ref<HTMLCanvasElement | null>(null);
let ctx: CanvasRenderingContext2D | null = null;
let raf = 0;
let list: any[] = [];
let w = 0;
let h = 0;
let dpr = 1;
let running = false;
const mouse = { x: -9999, y: -9999 };

const reduceMotion = (): boolean =>
  typeof window !== 'undefined' && !!window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** 设备分级降级系数：弱机自动砍粒子数，保证两端都不卡 */
function deviceFactor(): number {
  if (typeof navigator === 'undefined') return 1;
  const mem = (navigator as any).deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  if (mem <= 2 || cores <= 2) return 0.4;
  if (mem <= 4 || cores <= 4) return 0.7;
  return 1;
}

/** 实际生效粒子数：关/减少动态=0；否则硬上限锁顶 + 设备降级 */
const effectiveCount = computed(() => {
  const p = props.particles;
  if (!p || !p.enabled) return 0;
  if (!props.ignoreReducedMotion && reduceMotion()) return 0;
  let n = Number(p.count) || 0;
  n = Math.min(n, Number(p.maxCount) || 150); // ① 硬上限
  n = Math.round(n * deviceFactor());          // ② 设备降级
  return Math.max(0, n);
});
const active = computed(() => effectiveCount.value > 0);

/** 实际辉光强度：关闭/无强度=0；否则按设备系数自动衰减，弱机上光晕更收敛避免卡顿 */
const glowBlur = computed(() => {
  const p = props.particles;
  if (!p || !p.enabled || !p.glow) return 0;
  const base = Number(p.glowStrength) || 0;
  if (base <= 0) return 0;
  return base * deviceFactor();
});

const rand = (a: number, b: number) => a + Math.random() * (b - a);

function baseVelocity(p: PConfig): { vx: number; vy: number } {
  const s = (Number(p.speed) || 1) * 0.45; // 基础速度 px/帧
  switch (p.direction) {
    case 'up': return { vx: 0, vy: -s };
    case 'left': return { vx: -s, vy: 0 };
    case 'right': return { vx: s, vy: 0 };
    case 'random': {
      const a = rand(0, Math.PI * 2);
      return { vx: Math.cos(a) * s, vy: Math.sin(a) * s };
    }
    default: return { vx: rand(-0.15, 0.15), vy: s }; // down
  }
}

function spawn(reset = false): any {
  const p = props.particles!;
  const size = rand(p.sizeMin, p.sizeMax);
  const v = baseVelocity(p);
  const x = reset ? rand(0, w) : rand(0, w);
  const y = reset ? rand(-h, h) : -size;
  return {
    x, y, size,
    vx: v.vx, vy: v.vy,
    rot: rand(0, Math.PI * 2),
    vrot: p.rotate ? rand(-0.02, 0.02) : 0,
    phase: rand(0, Math.PI * 2),
    alpha: rand(0.55, 1) * (Number(p.opacity) || 1),
    color: Math.random() < 0.5 ? p.color : (p.color2 || p.color),
  };
}

function rebuild() {
  const n = effectiveCount.value;
  list = [];
  for (let i = 0; i < n; i++) list.push(spawn(true));
}

function resize() {
  const el = cv.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  w = Math.max(1, Math.round(rect.width));
  h = Math.max(1, Math.round(rect.height));
  el.width = w * dpr;
  el.height = h * dpr;
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawShape(p: PConfig, pt: any) {
  if (!ctx) return;
  ctx.save();
  ctx.globalAlpha = pt.alpha;
  ctx.translate(pt.x, pt.y);
  ctx.rotate(pt.rot);
  // 辉光：用 shadowBlur 在粒子外缘做光晕（弱机 glowBlur 已自动衰减）
  if (glowBlur.value > 0) {
    ctx.shadowBlur = glowBlur.value;
    ctx.shadowColor = p.glowColor || pt.color;
  } else {
    ctx.shadowBlur = 0;
  }
  ctx.fillStyle = pt.color;
  if (p.type === 'dot' || p.type === 'snow') {
    ctx.beginPath();
    ctx.arc(0, 0, pt.size / 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.type === 'star') {
    star(pt.size / 2);
  } else {
    // petal：椭圆花瓣
    ctx.beginPath();
    ctx.ellipse(0, 0, pt.size / 2, pt.size / 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function star(r: number) {
  if (!ctx) return;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    const a2 = a + Math.PI / 5;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.lineTo(Math.cos(a2) * r * 0.45, Math.sin(a2) * r * 0.45);
  }
  ctx.closePath();
  ctx.fill();
}

function step() {
  const p = props.particles;
  if (!ctx || !p || !active.value) { running = false; return; }
  ctx.clearRect(0, 0, w, h);
  const follow = p.followMouse;
  for (const pt of list) {
    pt.x += pt.vx;
    pt.y += pt.vy;
    if (p.type === 'snow') pt.x += Math.sin((pt.phase += 0.02)) * 0.4;
    if (pt.vrot) pt.rot += pt.vrot;
    // 跟随鼠标：近距斥力
    if (follow && mouse.x > -9000) {
      const dx = pt.x - mouse.x;
      const dy = pt.y - mouse.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 9000) {
        const f = (9000 - d2) / 9000 * 0.6;
        const d = Math.sqrt(d2) || 1;
        pt.x += (dx / d) * f * 6;
        pt.y += (dy / d) * f * 6;
      }
    }
    // 边界回收
    const m = pt.size + 4;
    if (pt.y > h + m) { pt.y = -m; pt.x = rand(0, w); }
    else if (pt.y < -m) { pt.y = h + m; pt.x = rand(0, w); }
    if (pt.x > w + m) pt.x = -m;
    else if (pt.x < -m) pt.x = w + m;
    drawShape(p, pt);
  }
  raf = requestAnimationFrame(step);
}

function start() {
  if (running || !active.value) return;
  running = true;
  raf = requestAnimationFrame(step);
}
function stop() {
  running = false;
  cancelAnimationFrame(raf);
}

function onVisibility() {
  if (document.hidden) stop();
  else if (active.value) start();
}
function onMouse(e: MouseEvent) {
  const el = cv.value;
  if (!el) return;
  const r = el.getBoundingClientRect();
  mouse.x = e.clientX - r.left;
  mouse.y = e.clientY - r.top;
}
function onLeave() { mouse.x = -9999; mouse.y = -9999; }

let ro: ResizeObserver | null = null;

onMounted(() => {
  const el = cv.value;
  if (!el) return;
  ctx = el.getContext('2d');
  resize();
  rebuild();
  // 容器尺寸变化自适应
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => { resize(); rebuild(); });
    ro.observe(el.parentElement || el);
  }
  window.addEventListener('mousemove', onMouse);
  window.addEventListener('mouseout', onLeave);
  document.addEventListener('visibilitychange', onVisibility);
  if (active.value) start();
  else stop();
});

onBeforeUnmount(() => {
  stop();
  if (ro) ro.disconnect();
  window.removeEventListener('mousemove', onMouse);
  window.removeEventListener('mouseout', onLeave);
  document.removeEventListener('visibilitychange', onVisibility);
});

// 参数变化（数量/类型/设备切回）重建
watch(effectiveCount, () => { rebuild(); if (active.value) start(); else stop(); });
watch(() => props.particles, () => rebuild(), { deep: true });
</script>

<style scoped>
.banner-particles {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* 不挡按钮点击；鼠标跟随走 window 事件 */
  z-index: 2;
}
.banner-particles.off { display: none; }
</style>
