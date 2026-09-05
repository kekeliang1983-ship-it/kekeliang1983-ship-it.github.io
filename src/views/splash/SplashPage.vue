<!-- src/views/splash/SplashPage.vue —— 启动页（2页Logo轮播，参考07-应用骨架）-->
<template>
  <div class="splash-page" ref="rootRef">
    <!-- Logo 轮播容器 -->
    <div class="splash-track" ref="trackRef">
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
    <div class="splash-dots">
      <i :class="{ active: slideIdx === 0 }"></i>
      <i :class="{ active: slideIdx >= 1 }"></i>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, shallowRef } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const rootRef = ref<HTMLElement | null>(null);
const trackRef = ref<HTMLElement | null>(null);
const slideIdx = ref(0);

// 定时器引用（统一管理，防泄漏：project_memory Anti-Pattern）
const timers = shallowRef<number[]>([]);
const addTimer = (t: number) => timers.value.push(t);
const clearAllTimers = () => {
  timers.value.forEach((t) => clearTimeout(t));
  timers.value = [];
};

// 切到第2页（1.6s后）→ 跳/home（再1.4s后），总3s
onMounted(() => {
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

  addTimer(window.setTimeout(() => {
    router.replace('/app/home');
  }, 3100));
});

onBeforeUnmount(() => {
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
  background:
    radial-gradient(circle at 20% 20%, rgba(255, 255, 255, .75), transparent 35%),
    radial-gradient(circle at 80% 70%, rgba(180, 188, 235, .45), transparent 40%),
    linear-gradient(180deg, #EDEFF9 0%, #E1E4F2 60%, #EEF0F7 100%);
}

.splash-track {
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
  animation: float 2.4s ease-in-out infinite;
}
@keyframes float {
  0%,100% { transform: translateY(0); }
  50%     { transform: translateY(-10px); }
}
.studio-name {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary, #292A38);
  letter-spacing: 4px;
}
.studio-subtitle {
  font-size: 12px;
  color: var(--text-muted, #A0A4B2);
  letter-spacing: 3px;
  opacity: .85;
}

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
}
.brand-slogan {
  margin-top: 18px;
  font-size: 14px;
  color: var(--text-secondary, #858999);
  letter-spacing: 6px;
}

/* ===== 轮播指示点 ===== */
.splash-dots {
  position: absolute;
  left: 50%;
  bottom: calc(60px + env(safe-area-inset-bottom, 0px));
  transform: translateX(-50%);
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
</style>
