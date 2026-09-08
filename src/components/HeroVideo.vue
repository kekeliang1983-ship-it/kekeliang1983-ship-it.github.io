<!--
  src/components/HeroVideo.vue
  首页 Hero Banner 的视频渲染组件。

  跨浏览器通用方案（核心目标：无论什么浏览器都不出现原生播放器控件）：
  国产浏览器（微信/QQ/X5、百度、华为/小米/OPPO/vivo、UC、夸克等）会强制劫持 <video>，
  在元素上绘制自己的播放器 UI（进度条/下载/TV/听/存网盘），靠 controls/playsinline/X5
  属性只能减少、无法彻底禁止。

  解法：所有浏览器统一走 Canvas 渲染 ——
    1) 真正的 <video> 作为"解码源"藏在底层（opacity:0，仍在 DOM 内可正常解码、可自动播放）；
    2) 上层放一个不透明的 <canvas>，用 requestAnimationFrame 把视频当前帧实时 drawImage 上去；
    3) Canvas 只是普通画布，浏览器不会给它注入任何原生播放控件，因此 PC/手机/各内核表现完全一致。
  静态 poster 兜底层始终存在：视频未就绪/缓冲/失败/「减少动态」时显示封面，杜绝空白体感。
-->
<template>
  <div class="hero-video-wrap" ref="root">
    <!-- 静态 poster 兜底层：视频加载/缓冲/失败/减动时显示封面，杜绝空白 -->
    <div v-if="poster" class="hv-poster" :style="{ backgroundImage: `url(${poster})` }"></div>

    <!-- 解码源：藏在底层、不可见、不接管任何交互，仅用于把帧喂给 canvas -->
    <video
      ref="srcVideo"
      class="hv-source"
      :src="realSrc"
      :poster="poster"
      muted
      loop
      playsinline
      preload="auto"
      webkit-playsinline="true"
      x5-playsinline="true"
      x5-video-player-type="h5"
      x5-video-player-fullscreen="false"
    ></video>

    <!-- 可见层：实时绘制视频帧，盖住底层隐藏 video，任何浏览器都不会给它加原生控件 -->
    <canvas ref="canvas" class="hv-canvas" :class="{ on: canvasReady }" aria-hidden="true"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';

const props = defineProps<{
  src: string;
  poster?: string;
  /** 是否当前可见帧：外层轮播切走时暂停，避免后台解码浪费 */
  playing?: boolean;
  /** 视频循环是否启用丝滑过渡（保留兼容，本组件直接用 video loop，无需额外处理） */
  crossfade?: boolean;
  /** 后台预览用：忽略系统"减少动态"偏好，强制自动播放，便于运营查看效果 */
  ignoreReducedMotion?: boolean;
}>();

// 空 src 时不绑定 <video src>（避免浏览器把空串当当前页请求）
const realSrc = computed(() => (props.src ? props.src : undefined));

const root = ref<HTMLElement | null>(null);
const srcVideo = ref<HTMLVideoElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);

const canvasReady = ref(false);
let ctx: CanvasRenderingContext2D | null = null;
let rafId = 0;
let posterImg: HTMLImageElement | null = null;
let io: IntersectionObserver | null = null;

// 系统是否开启"减少动态"。后台预览可 ignoreReducedMotion 强制播放。
const sysReduceMotion =
  typeof matchMedia !== 'undefined' &&
  matchMedia('(prefers-reduced-motion: reduce)').matches;
const reduceMotion = computed(() => sysReduceMotion && !props.ignoreReducedMotion);

/* ---------- canvas 绘制 ---------- */
function fitCanvas() {
  if (!canvas.value || !root.value) return;
  const rect = root.value.getBoundingClientRect();
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  canvas.value.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.value.height = Math.max(1, Math.round(rect.height * dpr));
  canvas.value.style.width = `${rect.width}px`;
  canvas.value.style.height = `${rect.height}px`;
  if (ctx) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // 变换变了，立刻重绘一帧（封面或视频）
    drawFrame();
  }
}

/** 把图像（poster 或视频）按 cover 方式绘制到 canvas */
function drawCover(img: CanvasImageSource, iw: number, ih: number) {
  if (!ctx || !canvas.value) return;
  const cw = canvas.value.width / (window.devicePixelRatio || 1);
  const ch = canvas.value.height / (window.devicePixelRatio || 1);
  if (!iw || !ih) return;
  const ir = iw / ih;
  const cr = cw / ch;
  let w = cw;
  let h = ch;
  let x = 0;
  let y = 0;
  if (ir > cr) {
    h = ch;
    w = h * ir;
    x = (cw - w) / 2;
  } else {
    w = cw;
    h = w / ir;
    y = (ch - h) / 2;
  }
  ctx.clearRect(0, 0, cw, ch);
  ctx.drawImage(img, x, y, w, h);
}

function drawFrame() {
  const v = srcVideo.value;
  if (v && v.videoWidth && canvasReady.value && !reduceMotion.value) {
    drawCover(v, v.videoWidth, v.videoHeight);
  } else if (posterImg && posterImg.complete && posterImg.naturalWidth) {
    drawCover(posterImg, posterImg.naturalWidth, posterImg.naturalHeight);
  }
}

function loop() {
  drawFrame();
  rafId = requestAnimationFrame(loop);
}

function startLoop() {
  if (!rafId) rafId = requestAnimationFrame(loop);
}
function stopLoop() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
}

/* ---------- 播放控制 ---------- */
function playSource() {
  const v = srcVideo.value;
  if (!v) return;
  const p = v.play();
  if (p && p.catch) p.catch(() => {});
}
function pauseSource() {
  const v = srcVideo.value;
  if (v) {
    try { v.pause(); } catch (_e) {}
  }
}

function applyPlaying() {
  if (reduceMotion.value) {
    // 减少动态：仅显示 poster，不播放也不画视频
    pauseSource();
    stopLoop();
    canvasReady.value = false; // 让 drawFrame 走 poster 分支
    drawFrame();
    return;
  }
  if (props.playing) {
    playSource();
    startLoop();
  } else {
    pauseSource();
    stopLoop();
  }
}

/* ---------- 源事件 ---------- */
function onCanplay() {
  if (!srcVideo.value) return;
  canvasReady.value = true;
  drawFrame();
  if (props.playing && !reduceMotion.value) playSource();
}

/* ---------- poster 预加载（canvas 初始即显示封面，避免空白/闪原生控件） ---------- */
function loadPoster() {
  if (!props.poster) {
    posterImg = null;
    return;
  }
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    posterImg = img;
    drawFrame();
  };
  img.src = props.poster;
}

/* ---------- 源切换（后台换视频 / 切帧） ---------- */
function loadSource() {
  const v = srcVideo.value;
  if (!v) return;
  canvasReady.value = false;
  if (realSrc.value) {
    v.src = realSrc.value;
    v.load();
  } else {
    v.removeAttribute('src');
    v.load();
  }
}

/* ---------- 离屏 / 标签页隐藏 暂停，省电 ---------- */
function setupObserver() {
  if (typeof IntersectionObserver === 'undefined' || !root.value) return;
  io = new IntersectionObserver(
    (entries) => {
      const vis = entries.some((en) => en.isIntersecting);
      if (vis) applyPlaying();
      else {
        pauseSource();
        stopLoop();
      }
    },
    { threshold: 0.1 },
  );
  io.observe(root.value);
}
function onVisibility() {
  if (document.hidden) {
    pauseSource();
    stopLoop();
  } else {
    applyPlaying();
  }
}
function onResize() {
  fitCanvas();
}

/* iOS / 严格内核兜底：若自动播放被拒（首帧迟迟不来），用户首次触摸/点击时补一次播放 */
function unlockOnGesture() {
  const v = srcVideo.value;
  if (!v) return;
  if (!v.paused) return; // 已经在播就不必
  playSource();
}

onMounted(() => {
  if (canvas.value) ctx = canvas.value.getContext('2d');
  fitCanvas();
  loadPoster();
  setupObserver();
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('resize', onResize);
  const v = srcVideo.value;
  if (v) {
    v.addEventListener('canplay', onCanplay);
    loadSource();
  }
  // 绑定一次性手势解锁（仅用于自动播放被拒的浏览器，正常播放后不再触发）
  root.value?.addEventListener('touchstart', unlockOnGesture, { once: true, passive: true });
  root.value?.addEventListener('click', unlockOnGesture, { once: true });
  applyPlaying();
});

onBeforeUnmount(() => {
  io?.disconnect();
  io = null;
  document.removeEventListener('visibilitychange', onVisibility);
  window.removeEventListener('resize', onResize);
  stopLoop();
  pauseSource();
  const v = srcVideo.value;
  if (v) v.removeEventListener('canplay', onCanplay);
});

watch(() => props.playing, applyPlaying);
watch(
  () => realSrc.value,
  () => {
    loadSource();
    applyPlaying();
  },
);
watch(
  () => props.poster,
  () => loadPoster(),
);
</script>

<style scoped>
.hero-video-wrap {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #c9c3f0; /* 视频/海报未就绪时的温和底色兜底 */
}
.hv-poster {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  z-index: 0;
}
/* 解码源：藏在底层、完全不可见、不接管交互；仅负责把帧喂给上层 canvas */
.hv-source {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0; /* 透明：不再显示原生播放器控件（控件随元素整体透明） */
  pointer-events: none; /* 不拦截任何点击 */
  z-index: 1;
}
/* 可见层：实时绘制视频帧，盖住底层隐藏 video；任何浏览器都不会给 canvas 注入播放控件 */
.hv-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  opacity: 0;
  z-index: 2;
  pointer-events: none;
  transition: opacity 0.4s ease-in-out;
}
.hv-canvas.on {
  opacity: 1;
}
</style>
