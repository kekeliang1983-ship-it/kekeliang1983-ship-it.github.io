// src/main.ts —— 应用入口（参考 07-应用骨架与路由.txt L764-L788 main.ts 结构）
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { pinia, useUserStore, useModulesStore, useContentStore, useCheckinStore } from './stores';
import { initFeedback, vFeedback, audio, haptic } from './core';
import { timeEngine } from './core/time';
import gsap from 'gsap';
import '@styles/global.css';

// GSAP 本地打包（原 CDN 引入已移除，保证离线可用）；下游代码沿用 window.gsap 全局
(window as any).gsap = gsap;

// Service Worker 注册策略（铁律：dev 禁用 SW 缓存，避免开发版白屏 / 热更新失效）
// - 生产：注册手写 SW，提供 PWA 离线能力
// - 开发：自动注销已注册的 SW，保证 dev 加载最新模块、即时热更
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {});
  });
} else if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
}

const app = createApp(App);

// 1. Pinia + 路由
app.use(pinia);
app.use(router);

// 2. 全局反馈引擎 + v-feedback 指令
initFeedback();
app.directive('feedback', vFeedback);

// 2.5 加载外置内容层（壁纸/Banner 等），失败静默回退内置；不阻塞启动
async function bootstrap() {
  const contentStore = useContentStore();
  try {
    await contentStore.load();
  } catch (e) {
    console.warn('[content] 内容加载异常，已回退内置', e);
  }

  // 3. 初始化 Store（每日重置 + 离线收益占位 + 时间引擎启动）
  //    必须放在 router 之前使用 store
  const userStore = useUserStore();
  const modulesStore = useModulesStore();
  const checkinStore = useCheckinStore();
  audio.setEnabled(userStore.soundOn);
  haptic.setEnabled(userStore.hapticOn);
  userStore.ensureDailyReset();
  modulesStore.ensureDailyReset();
  checkinStore.ensureDailyReset();
  timeEngine.start();

  app.mount('#app');

  // 开发期：挂载调试对象
  if (import.meta.env.DEV) {
    (window as any).__MOCK_PLAYER__ = {
      setOffersToday: (n: number) => { modulesStore.shrineOffersToday = Math.max(0, Math.min(3, n)); },
      setNotif: (n: number) => userStore.setNotifUnread(n),
      setNickname: (n: string | null) => userStore.setNickname(n),
    };
    console.log('[DEV] __MOCK_PLAYER__ 已挂载，可调整测试数据');
  }
}

bootstrap();
