<!--
  src/components/HeroVideo.vue
  首页 Hero Banner 的渲染组件。

  跨浏览器通用方案（核心目标：无论什么浏览器都不出现原生播放器控件）：

  部分国产浏览器（小米 MIUI 浏览器、华为、OPPO/vivo、百度、QQ/微信 X5、UC、夸克等）
  会劫持 <video> —— 一旦页面里有 <video> 开始播放，它们会在「浏览器层级」弹出自己的系统
  播放器浮层（进度条/下载/TV/听/存网盘）。这个浮层不在网页 DOM 里，是浏览器盖在最上层的 UI，
  所以仅靠 controls/playsinline/X5 属性、甚至用 <canvas> 盖住视频都挡不住它。

  根治办法：对这类浏览器，<video> 元素根本不要出现 —— 改用「会自己动起来的图片」
  动画 WebP（<img>），图片永远不会被系统播放器劫持，因此零控件、行为一致。

  分流：
    1) 会被劫持的浏览器（UA 命中名单）且有 loopWebp → 直接渲染 <img :src="loopWebp">
       （动画 WebP 自动循环播放，无任何控件，PC/手机/各内核表现一致）。
    2) 其它现代浏览器（Chrome/Safari/Firefox/Edge 等）→ 用隐藏 <video> 作解码源、上层不透明
       <canvas> 实时绘制视频帧，同样不给原生控件，且画质更高、可控播放。
  静态 poster 兜底层始终存在：视频/图片未就绪、缓冲、"减少动态"时显示封面，杜绝空白体感。
-->
<template>
  <div class="hero-video-wrap" ref="root">
    <!-- 静态 poster 兜底层：视频/图片未就绪/缓冲/失败/减动时显示封面，杜绝空白 -->
    <div v-if="poster" class="hv-poster" :style="{ backgroundImage: `url(${poster})` }"></div>

    <!-- 分支 A：会被劫持的浏览器 → 动画 WebP 图片（无 <video>，永不弹系统播放器） -->
    <img
      v-if="useImg && !reduceMotion"
      class="hv-img"
      :src="props.loopSrc"
      alt=""
      aria-hidden="true"
      decoding="async"
    />

    <!-- 分支 B：现代浏览器 → 隐藏 <video> 解码源 + 上层不透明 <canvas> 实时绘制帧 -->
    <template v-else>
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
      <canvas ref="canvas" class="hv-canvas" :class="{ on: canvasReady }" aria-hidden="true"></canvas>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';

const props = defineProps<{
  src: string;
  poster?: string;
  /** 动画 WebP 兜底地址：对会劫持 <video> 的浏览器使用（<img> 永不被系统播放器劫持） */
  loopSrc?: string;
  /** 是否当前可见帧：外层轮播切走时暂停，避免后台解码浪费 */
  playing?: boolean;
  /** 视频循环丝滑过渡（保留兼容，分支 B 直接用 video loop） */
  crossfade?: boolean;
  /** 后台预览用：忽略系统"减少动态"偏好，强制自动播放 */
  ignoreReducedMotion?: boolean;
}>();

// 空 src 时不绑定 <video src>
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

/** 检测是否在会强制劫持 <video> 并弹出系统播放器浮层的浏览器中运行（这些浏览器必须用 <img> 动画兜底） */
function browserHijacksVideo(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return /micromessenger|qqbrowser|mqqbrowser|tbs\/|x5|ucbrowser|ucweb|baiduboxapp|baidubrowser|baiduapp|quark|sogou|liebao|qihoo|360browser|2345|miuibrowser|xiaomi|redmi|huawei|honor|vivo|oppo|oneplus|realme|lenovo|flyme|mxbrowser|taobao|tmall|weibo|douyin|toutiao/i.test(
    ua,
  );
}
// 分支 A：命中劫持名单且有动画 WebP → 用 <img> 动画兜底（彻底无 <video>）
const useImg = computed(() => !!props.loopSrc && browserHijacksVideo());

/* ---------- 分支 B：canvas 绘制 ---------- */
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
    drawFrame();
  }
}
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
  if (reduceMotion.value || useImg.value) {
    pauseSource();
    stopLoop();
    if (!useImg.value) {
      canvasReady.value = false;
      drawFrame();
    }
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
function onCanplay() {
  if (!srcVideo.value) return;
  canvasReady.value = true;
  drawFrame();
  if (props.playing && !reduceMotion.value && !useImg.value) playSource();
}
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
function setupObserver() {
  if (typeof IntersectionObserver === 'undefined' || !root.value) return;
  io = new IntersectionObserver(
    (entries) => {
      const vis = entries.some((en) => en.isIntersecting);
      if (useImg.value || reduceMotion.value) return; // 分支 A / 减动无需控制
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
  if (useImg.value || reduceMotion.value) return;
  if (document.hidden) {
    pauseSource();
    stopLoop();
  } else {
    applyPlaying();
  }
}
function onResize() {
  if (!useImg.value) fitCanvas();
}
function unlockOnGesture() {
  const v = srcVideo.value;
  if (!v || !v.paused) return;
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
  background: #c9c3f0;
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
/* 分支 A：动画 WebP 图片，覆盖整个 Banner，自动循环、绝对无原生控件 */
.hv-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  z-index: 1;
  pointer-events: none;
}
/* 分支 B：解码源，藏在底层不可见、不接管交互，只把帧喂给上层 canvas */
.hv-source {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  pointer-events: none;
  z-index: 1;
}
/* 分支 B：可见层，实时绘制视频帧，盖住隐藏 video；任何浏览器都不会给 canvas 注入播放控件 */
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
