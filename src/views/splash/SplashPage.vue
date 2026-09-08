<!-- src/views/splash/SplashPage.vue —— 启动页（2页Logo轮播 + 加载进度，参考07-应用骨架）-->
<template>
  <div class="splash-page" ref="rootRef">
    <!-- 流动光晕背景（东方治愈 · 静心氛围，争取加载时间不显突兀） -->
    <div class="aurora">
      <span class="blob b1"></span>
      <span class="blob b2"></span>
      <span class="blob b3"></span>
    </div>

    <!-- Logo 轮播容器 -->
    <div class="splash-track" ref="trackRef" v-show="!showOnboarding">
      <!-- 第1页：工作室Logo -->
      <div class="splash-slide studio-slide">
        <div class="logo-mark">🌸</div>
        <h1 class="studio-name">仙境工作室</h1>
        <p class="studio-subtitle">FAIRYLAND STUDIO</p>
      </div>
      <!-- 第2页：品牌Logo -->
      <div class="splash-slide brand-slide">
        <div class="brand-mark">✦ 灵境 ✦</div>
        <p class="brand-slogan">静心 · 耕种 · 祈愿</p>
      </div>
    </div>

    <!-- 进度指示点 -->
    <div class="splash-dots" v-show="!showOnboarding">
      <i :class="{ active: slideIdx === 0 }"></i>
      <i :class="{ active: slideIdx >= 1 }"></i>
    </div>

    <!-- 底部加载进度条（纯装饰：覆盖首屏资源就绪时间，避免"白屏等待感"） -->
    <div class="splash-progress" v-show="!showOnboarding">
      <div class="bar" :style="{ width: progress + '%' }"></div>
    </div>

    <!-- 新手引导覆盖层（首访触发；完成/跳过后再进首页）-->
    <OnboardingOverlay
      :open="showOnboarding"
      @finish="onOnboardingFinish"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, shallowRef } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/useUserStore';
import OnboardingOverlay from '@/components/OnboardingOverlay.vue';

const router = useRouter();
const userStore = useUserStore();
const rootRef = ref<HTMLElement | null>(null);
const trackRef = ref<HTMLElement | null>(null);
const slideIdx = ref(0);
const showOnboarding = ref(false);
const progress = ref(0);

// 定时器引用（统一管理，防泄漏：project_memory Anti-Pattern）
const timers = shallowRef<number[]>([]);
const addTimer = (t: number) => timers.value.push(t);
const clearAllTimers = () => {
  timers.value.forEach((t) => clearTimeout(t));
  timers.value = [];
};

// 进度条动画：整个启动流程约 3.1s，进度平滑走到 ~96%，进首页后由页面接管
let raf = 0;
function tickProgress() {
  // 缓出：先快后慢，停在 96% 让"即将完成"的观感自然
  const target = 96;
  progress.value += (target - progress.value) * 0.04 + 0.15;
  if (progress.value >= target) progress.value = target;
  raf = requestAnimationFrame(tickProgress);
}

// 切到第2页（1.6s后）→ 跳/home（再1.4s后），总3s
onMounted(() => {
  raf = requestAnimationFrame(tickProgress);

  // 尝试使用GSAP（如果可用），否则CSS过渡兜底
  const useGsap = (window as any).gsap;
  const track = trackRef.value;

  addTimer(window.setTimeout(() => {
    slideIdx.value = 1;
    if (useGsap && track) {
      useGsap.to(track, { xPercent: -100, duration: 0.55, ease: 'power3.inOut' });
    } else if (track) {
      track.style.transform = 'translateX(-100%)';
    }
  }, 1600));

  // 轮播结束：未引导过则进引导序列，否则直接进首页
  addTimer(window.setTimeout(() => {
    if (!userStore.onboarded) {
      showOnboarding.value = true;
    } else {
      router.replace('/app/home');
    }
  }, 3100));
});

// 引导完成/跳过：进入首页（onboarded 已在组件内置位）
function onOnboardingFinish() {
  router.replace('/app/home');
}

onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  clearAllTimers();
  // GSAP兜底清理（按元素杀：project_memory Anti-Pattern ❌2）
  try {
    const g = (window as any).gsap;
    if (g && trackRef.value) g.killTweensOf(trackRef.value, true);
  } catch (_e) { /* 忽略 */ }
});
</script>

<style scoped>
.splash-page {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: linear-gradient(180deg, #EDEFF9 0%, #E1E4F2 60%, #EEF0F7 100%);
}

/* ===== 流动光晕背景 ===== */
.aurora {
  position: absolute;
  inset: 0;
  overflow: hidden;
  filter: blur(8px);
}
.aurora .blob {
  position: absolute;
  border-radius: 50%;
  opacity: 0.55;
  will-change: transform;
}
.aurora .b1 {
  width: 60vw; height: 60vw;
  left: -15vw; top: -10vh;
  background: radial-gradient(circle, rgba(168,128,216,.55), transparent 70%);
  animation: drift1 11s ease-in-out infinite;
}
.aurora .b2 {
  width: 55vw; height: 55vw;
  right: -18vw; top: 20vh;
  background: radial-gradient(circle, rgba(214,180,93,.40), transparent 70%);
  animation: drift2 13s ease-in-out infinite;
}
.aurora .b3 {
  width: 50vw; height: 50vw;
  left: 20vw; bottom: -20vh;
  background: radial-gradient(circle, rgba(163,200,235,.50), transparent 70%);
  animation: drift3 15s ease-in-out infinite;
}
@keyframes drift1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(6vw,4vh) scale(1.08); } }
@keyframes drift2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-5vw,3vh) scale(1.1); } }
@keyframes drift3 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(4vw,-4vh) scale(1.06); } }

.splash-track {
  position: relative;
  z-index: 2;
  display: flex;
  width: 200%;
  height: 100%;
  transition: transform .55s cubic-bezier(.55,.08,.45,.9);
  will-change: transform;
}

.splash-slide {
  flex: 0 0 50%;
  width: 50%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
}

/* ===== 工作室页 ===== */
.logo-mark {
  font-size: 72px;
  filter: drop-shadow(0 8px 20px rgba(160, 150, 220, .3));
  animation: float 2.4s ease-in-out infinite, glowPulse 3.2s ease-in-out infinite;
}
@keyframes float {
  0%,100% { transform: translateY(0); }
  50%     { transform: translateY(-10px); }
}
@keyframes glowPulse {
  0%,100% { filter: drop-shadow(0 8px 20px rgba(160,150,220,.30)); }
  50%     { filter: drop-shadow(0 10px 30px rgba(168,128,216,.55)); }
}
.studio-name {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary, #292A38);
  letter-spacing: 4px;
  animation: fadeUp .6s ease both;
}
.studio-subtitle {
  font-size: 12px;
  color: var(--text-muted, #A0A4B2);
  letter-spacing: 3px;
  opacity: .85;
  animation: fadeUp .6s .1s ease both;
}
@keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

/* ===== 品牌页 ===== */
.brand-mark {
  font-size: 46px;
  font-weight: 800;
  letter-spacing: 8px;
  background: linear-gradient(135deg, #8A80D8 0%, #A39AE8 50%, #D6B45D 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-shadow: 0 6px 24px rgba(138, 128, 216, .25);
  animation: brandIn .7s ease both, glowPulse 3.6s ease-in-out infinite;
}
@keyframes brandIn { from { opacity: 0; transform: scale(.92); letter-spacing: 14px; } to { opacity: 1; transform: scale(1); letter-spacing: 8px; } }
.brand-slogan {
  margin-top: 18px;
  font-size: 14px;
  color: var(--text-secondary, #858999);
  letter-spacing: 6px;
  animation: fadeUp .6s .15s ease both;
}

/* ===== 轮播指示点 ===== */
.splash-dots {
  position: absolute;
  left: 50%;
  bottom: calc(74px + env(safe-area-inset-bottom, 0px));
  transform: translateX(-50%);
  z-index: 3;
  display: flex;
  gap: 8px;
}
.splash-dots i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgba(138, 128, 216, .25);
  transition: background .25s, width .25s;
}
.splash-dots i.active {
  width: 22px;
  border-radius: 4px;
  background: var(--accent, #8A80D8);
}

/* ===== 底部加载进度条（装饰：覆盖首屏资源就绪时间） ===== */
.splash-progress {
  position: absolute;
  left: 0; right: 0;
  bottom: calc(54px + env(safe-area-inset-bottom, 0px));
  z-index: 3;
  padding: 0 32vw;
}
.splash-progress .bar {
  height: 3px;
  border-radius: 3px;
  background: linear-gradient(90deg, #8A80D8, #D6B45D);
  box-shadow: 0 0 10px rgba(138,128,216,.4);
  transition: width .12s linear;
}
</style>
