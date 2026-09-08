<!--
  src/components/HeroVideo.vue
  首页 Hero Banner 的视频帧渲染组件。
  解决「单视频 loop 循环时末帧硬切回首帧」的顿挫问题，采用：
  1) 方案三·双视频交叉淡入缓冲：同一源叠两层 <video>。当前主层播到距末尾 ~0.5s 时，
     把已 seek(0) 的备层 opacity 0→1 淡入、主层 1→0 淡出，接缝时刻两帧"同时存在并混合"，
     肉眼看不到硬跳变（若母版本身首尾衔接则更完美，见 BannerEditor 提示）。
  2) 方案四·fade 时长柔化：交叉淡入时长 = CSS transition .6s ease，比生切柔和。
  3) 方案五·离屏/减动暂停：IntersectionObserver 仅视口内播放；prefers-reduced-motion 开启时
     退化为单视频静态 poster（不自动播），省电且尊重无障碍。
     注：后台预览通过 ignoreReducedMotion 强制播放，便于运营查看效果。
-->
<template>
  <div class="hero-video-wrap" ref="root">
    <!-- 静态 poster 兜底层：视频加载/缓冲/失败空窗时始终显示封面，杜绝「图丢/空白」体感 -->
    <div v-if="poster" class="hv-poster" :style="{ backgroundImage: `url(${poster})` }"></div>
    <!-- Canvas 兜底：对 X5/百度/UC 等强制注入原生播放器 UI 的浏览器，用隐藏 video 作为源绘制到 canvas，规避控件 -->
    <canvas
      ref="canvas"
      class="hv-canvas"
      :class="{ on: useCanvas && canvasReady }"
      aria-hidden="true"
    ></canvas>
    <!-- 主层 A：crossfade 关闭时走原生 loop 硬循环（省电）；开启时由交叉逻辑控制 -->
    <video
      ref="vA"
      class="hv"
      :class="{ on: layer === 'A', 'hv-hidden': useCanvas }"
      :src="realSrc"
      :poster="poster"
      :loop="!useCrossfade"
      muted
      playsinline
      webkit-playsinline="true"
      x5-playsinline="true"
      x5-video-player-type="h5"
      x5-video-player-fullscreen="false"
      x5-video-orientation="portraint"
      preload="auto"
      disablepictureinpicture
      disableRemotePlayback
      controlslist="nofullscreen nodownload noremoteplayback"
      @timeupdate="onTime('A', $event)"
      @ended="onEnded('A')"
      @canplay="onCanplay('A')"
    ></video>
    <!-- 备层 B（交叉淡入用；仅 useCrossfade 时渲染第二解码实例） -->
    <video
      v-if="useCrossfade"
      ref="vB"
      class="hv"
      :class="{ on: layer === 'B', 'hv-hidden': useCanvas }"
      :src="realSrc"
      :poster="poster"
      muted
      playsinline
      webkit-playsinline="true"
      x5-playsinline="true"
      x5-video-player-type="h5"
      x5-video-player-fullscreen="false"
      x5-video-orientation="portraint"
      preload="auto"
      disablepictureinpicture
      disableRemotePlayback
      controlslist="nofullscreen nodownload noremoteplayback"
      @timeupdate="onTime('B', $event)"
      @ended="onEnded('B')"
      @canplay="onCanplay('B')"
    ></video>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';

const props = defineProps<{
  src: string;
  poster?: string;
  /** 是否当前可见帧：外层轮播切走时暂停，避免后台解码浪费 */
  playing?: boolean;
  /**
   * 视频循环是否启用「双视频交叉淡入」丝滑过渡。
   * - true（默认）：主层播到距尾 0.5s 时，备层 seek(0) 淡入、主层淡出，接缝无感（双解码）。
   * - false：单视频硬 loop，省电但首尾不衔接时会顿一下。
   * 注意：prefers-reduced-motion 开启时无论此项如何都退化为单视频静态 poster。
   */
  crossfade?: boolean;
  /** 后台预览用：忽略系统"减少动态"偏好，强制自动播放，便于运营查看效果 */
  ignoreReducedMotion?: boolean;
  /**
   * 强制使用 Canvas 渲染（用于后台预览测试跨浏览器兜底）。
   * 默认自动检测：微信/QQ/百度/UC 等会劫持 video UI 的浏览器自动切 Canvas。
   */
  forceCanvas?: boolean;
}>();

// 空 src 时不绑定 <video src>（避免浏览器把空串当当前页请求）
const realSrc = computed(() => (props.src ? props.src : undefined));

/** 检测是否在会强制注入原生播放器 UI 的浏览器中运行 */
function browserNeedsCanvas(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  // 腾讯系 X5（微信、QQ、QQ 浏览器）
  if (/micromessenger|qqbrowser|qq\/|mqqbrowser|tbs\/|x5/.test(ua)) return true;
  // 百度系
  if (/baiduboxapp|baidubrowser|baidu/.test(ua)) return true;
  // UC
  if (/ucbrowser|ucweb/.test(ua)) return true;
  // 其它常见会劫持 video 的国内浏览器
  if (/quark|sogou|2345|liebao|qihoo|360/.test(ua)) return true;
  // Android 自带浏览器且非 Chrome/Firefox/Samsung/Edge 现代内核
  if (/android/.test(ua) && !/(chrome|firefox|samsungbrowser|edg|opr)/.test(ua)) return true;
  return false;
}
const useCanvas = computed(() => !reduceMotion.value && (props.forceCanvas || browserNeedsCanvas()));

const canvas = ref<HTMLCanvasElement | null>(null);
const canvasReady = ref(false);
let ctx: CanvasRenderingContext2D | null = null;
let rafId = 0;
let canvasVideo: HTMLVideoElement | null = null;

const CROSS = 0.5; // 距片尾多少秒启动交叉淡入（秒）
const root = ref<HTMLElement | null>(null);
const vA = ref<HTMLVideoElement | null>(null);
const vB = ref<HTMLVideoElement | null>(null);

// 系统是否开启"减少动态"。后台预览可 ignoreReducedMotion 强制播放。
const sysReduceMotion =
  typeof matchMedia !== 'undefined' &&
  matchMedia('(prefers-reduced-motion: reduce)').matches;
const reduceMotion = computed(() => sysReduceMotion && !props.ignoreReducedMotion);

// 是否启用交叉淡入：开关开启且非「减少动态」模式。关闭或减动时退化为单视频 loop。
const useCrossfade = computed(() => props.crossfade !== false && !reduceMotion.value);

// 当前应可见的层（A / B）。交叉淡入通过切 layer 触发 CSS opacity 过渡。
const layer = ref<'A' | 'B'>('A');
let crossing = false; // 防重入：交叉进行中
let io: IntersectionObserver | null = null;

function activeV(): HTMLVideoElement | null {
  return layer.value === 'A' ? vA.value : vB.value;
}
function standbyV(): HTMLVideoElement | null {
  return layer.value === 'A' ? vB.value : vA.value;
}

function tryPlay(v: HTMLVideoElement | null) {
  if (!v) return;
  const p = v.play();
  if (p && p.catch) p.catch(() => {}); // 浏览器可能拒绝（未加载/策略），吞掉由 canplay 重试
}
function playActive() {
  if (useCanvas.value) {
    syncCanvasPlaying(true);
    startCanvasLoop();
    return;
  }
  tryPlay(activeV());
}
function pauseAll() {
  [vA.value, vB.value].forEach((v) => {
    if (v) {
      try { v.pause(); } catch (_e) {}
    }
  });
  if (useCanvas.value) {
    syncCanvasPlaying(false);
    stopCanvasLoop();
  }
}

/* ---------- Canvas 兜底渲染：对劫持 video UI 的浏览器，用隐藏 video 作为源绘制到 canvas ---------- */
function fitCanvas() {
  if (!canvas.value || !root.value) return;
  const rect = root.value.getBoundingClientRect();
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  canvas.value.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.value.height = Math.max(1, Math.round(rect.height * dpr));
  canvas.value.style.width = `${rect.width}px`;
  canvas.value.style.height = `${rect.height}px`;
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
function drawCanvas() {
  if (!ctx || !canvasVideo || !canvasVideo.videoWidth) return;
  const cvs = canvas.value;
  if (!cvs) return;
  const cw = cvs.width / (window.devicePixelRatio || 1);
  const ch = cvs.height / (window.devicePixelRatio || 1);
  const vr = canvasVideo.videoWidth / canvasVideo.videoHeight;
  const cr = cw / ch;
  let x = 0;
  let y = 0;
  let w = cw;
  let h = ch;
  if (vr > cr) {
    h = ch;
    w = h * vr;
    x = (cw - w) / 2;
  } else {
    w = cw;
    h = w / vr;
    y = (ch - h) / 2;
  }
  ctx.clearRect(0, 0, cw, ch);
  ctx.drawImage(canvasVideo, x, y, w, h);
}
function canvasLoop() {
  if (!useCanvas.value) return;
  drawCanvas();
  rafId = requestAnimationFrame(canvasLoop);
}
function startCanvasLoop() {
  if (!rafId && useCanvas.value) rafId = requestAnimationFrame(canvasLoop);
}
function stopCanvasLoop() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
}
function syncCanvasPlaying(play?: boolean) {
  if (!canvasVideo) return;
  const should = play ?? props.playing;
  if (should) {
    const p = canvasVideo.play();
    if (p && p.catch) p.catch(() => {});
  } else {
    try { canvasVideo.pause(); } catch (_e) {}
  }
}
function onCanvasCanplay() {
  if (!canvasVideo) return;
  canvasReady.value = true;
  drawCanvas();
  if (props.playing) syncCanvasPlaying(true);
}
function onCanvasEnded() {
  if (!canvasVideo) return;
  canvasVideo.currentTime = 0;
  syncCanvasPlaying(true);
}
function setupCanvasVideo() {
  if (!useCanvas.value || canvasVideo) return;
  const v = document.createElement('video');
  v.muted = true;
  v.playsInline = true;
  v.setAttribute('playsinline', 'true');
  v.setAttribute('webkit-playsinline', 'true');
  v.setAttribute('x5-playsinline', 'true');
  v.setAttribute('x5-video-player-type', 'h5');
  v.setAttribute('x5-video-player-fullscreen', 'false');
  v.setAttribute('x5-video-orientation', 'portraint');
  v.setAttribute('preload', 'auto');
  v.setAttribute('disablepictureinpicture', '');
  v.setAttribute('disableremoteplayback', '');
  v.loop = true;
  v.style.position = 'absolute';
  v.style.left = '-9999px';
  v.style.top = '-9999px';
  v.style.width = '1px';
  v.style.height = '1px';
  v.style.opacity = '0';
  v.style.pointerEvents = 'none';
  v.addEventListener('canplay', onCanvasCanplay);
  v.addEventListener('ended', onCanvasEnded);
  canvasVideo = v;
  document.body.appendChild(v);
}
function teardownCanvasVideo() {
  stopCanvasLoop();
  if (canvasVideo) {
    try { canvasVideo.pause(); } catch (_e) {}
    canvasVideo.removeEventListener('canplay', onCanvasCanplay);
    canvasVideo.removeEventListener('ended', onCanvasEnded);
    if (canvasVideo.parentNode) canvasVideo.parentNode.removeChild(canvasVideo);
    canvasVideo = null;
  }
  canvasReady.value = false;
}
function loadCanvasSource() {
  if (!canvasVideo) return;
  canvasReady.value = false;
  if (realSrc.value) {
    canvasVideo.src = realSrc.value;
    canvasVideo.load();
  } else {
    canvasVideo.removeAttribute('src');
    canvasVideo.load();
  }
}

/** 主层播到距末尾 CROSS 时，启动交叉淡入：备层 seek(0) 播放并淡入，主层淡出 */
function onTime(which: 'A' | 'B', e: Event) {
  if (!useCrossfade.value || reduceMotion.value || which !== layer.value) return;
  const v = e.target as HTMLVideoElement;
  if (!v.duration || !isFinite(v.duration) || v.duration < CROSS + 0.2) return;
  const remain = v.duration - v.currentTime;
  if (crossing) {
    // 新激活层刚起步：等它越过交叉窗口（已稳定播放）后才允许下一次交叉，避免死锁冻帧
    if (v.currentTime > CROSS) crossing = false;
    return;
  }
  if (remain <= CROSS) {
    crossing = true;
    const other = standbyV();
    if (other) {
      try {
        other.currentTime = 0;
        tryPlay(other);
      } catch (_e) {
        /* ignore */
      }
    }
    // 切可见层 → 备层 opacity 渐显、主层渐隐（CSS transition）
    layer.value = which === 'A' ? 'B' : 'A';
  }
}

/** 当前激活层异常结束（loop 关闭）的兜底：重启并清标志，避免永久冻结 */
function onEnded(which: 'A' | 'B') {
  if (!useCrossfade.value || reduceMotion.value) return;
  if (which === layer.value) {
    crossing = false;
    const v = activeV();
    if (v) {
      try { v.currentTime = 0; tryPlay(v); } catch (_e) {}
    }
  }
}

/**
 * 视频可播放时补一次 play —— 解决「初次/换源时 play() 在加载完成前被浏览器拒绝」导致永远停在首帧。
 * 仅对当前激活层生效。
 */
function onCanplay(which: 'A' | 'B') {
  if (reduceMotion.value || !props.playing) return;
  if (which === layer.value) tryPlay(activeV());
}

function syncPlaying() {
  if (props.playing) {
    playActive();
  } else {
    pauseAll();
  }
}
watch(() => props.playing, syncPlaying);

// 源变化（替换视频 / 切帧）：重置状态，等新源 canplay 后由 onCanplay 自动播放
watch(
  () => realSrc.value,
  () => {
    crossing = false;
    layer.value = 'A';
    if (useCanvas.value) loadCanvasSource();
  },
);

/* ---------- 方案五：离屏暂停 + 标签页隐藏暂停 ---------- */
function setupObserver() {
  if (reduceMotion.value) return; // 静态模式不需要
  if (typeof IntersectionObserver === 'undefined' || !root.value) return;
  io = new IntersectionObserver(
    (entries) => {
      const vis = entries.some((en) => en.isIntersecting);
      if (vis && useCanvas.value) fitCanvas();
      // 仅在「视口内 + 外层允许播放」时播放
      if (vis && props.playing) playActive();
      else pauseAll();
    },
    { threshold: 0.1 },
  );
  io.observe(root.value);
}
function onVisibility() {
  if (document.hidden) pauseAll();
  else if (props.playing) playActive();
}
function onResize() {
  if (useCanvas.value) {
    fitCanvas();
    drawCanvas();
  }
}

onMounted(() => {
  setupObserver();
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('resize', onResize);
  if (useCanvas.value) {
    if (canvas.value) {
      ctx = canvas.value.getContext('2d');
      fitCanvas();
    }
    setupCanvasVideo();
    loadCanvasSource();
  }
  // reduced-motion：单视频静态展示（不自动播，仅显示 poster）；否则且允许播放时启动
  if (!reduceMotion.value && props.playing) playActive();
});
onBeforeUnmount(() => {
  io?.disconnect();
  io = null;
  document.removeEventListener('visibilitychange', onVisibility);
  window.removeEventListener('resize', onResize);
  pauseAll();
  teardownCanvasVideo();
});
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
.hv {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  opacity: 0;
  z-index: 1; /* 视频层在 poster 兜底层之上；视频未就绪/透明时露出底层图 */
  /* 方案四：交叉淡入时长柔化（比生切柔和） */
  transition: opacity 0.6s ease-in-out;
  will-change: opacity;
}
.hv.on {
  opacity: 1;
}
.hv-hidden {
  /* Canvas 兜底时把原视频元素彻底藏到屏幕外，避免被浏览器注入原生播放器 UI */
  position: absolute !important;
  left: -9999px !important;
  top: -9999px !important;
  width: 1px !important;
  height: 1px !important;
  opacity: 0 !important;
  pointer-events: none !important;
  z-index: -1 !important;
}
.hv-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  opacity: 0;
  z-index: 1;
  transition: opacity 0.6s ease-in-out;
  pointer-events: none;
}
.hv-canvas.on {
  opacity: 1;
}
/* 额外尝试压制 webkit 原生控件（对少数尊重 CSS 伪元素的浏览器有效） */
.hv::-webkit-media-controls,
.hv::-webkit-media-controls-enclosure,
.hv::-webkit-media-controls-panel,
.hv::-webkit-media-controls-start-playback-button {
  display: none !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
</style>
