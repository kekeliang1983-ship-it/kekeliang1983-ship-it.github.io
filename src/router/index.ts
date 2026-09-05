// src/router/index.ts —— 10个路由，严格按07-应用骨架 L60-L157（Tab1改名为"首页"，决策10A）
import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';
import { useUserStore, useModulesStore, useUiStore, useCheckinStore } from '@/stores/index';

declare module 'vue-router' {
  interface RouteMeta {
    title?: string;
    transition?: 'slide-left' | 'slide-right' | 'fade' | 'none';
    keepAlive?: boolean;
    showTabBar?: boolean;
    showStatusBar?: boolean;
  }
}

const routes: RouteRecordRaw[] = [
  // 1. 启动页（BlankLayout，不显示状态栏/Tab）
  {
    path: '/splash',
    name: 'Splash',
    component: () => import('@/layouts/BlankLayout.vue'),
    children: [{
      path: '',
      name: 'SplashPage',
      component: () => import('@/views/splash/SplashPage.vue'),
      meta: { title: '灵境', transition: 'fade', showTabBar: false, showStatusBar: false },
    }],
  },

  // 2-10. 主应用（AppLayout：状态栏 + 主内容 + 条件TabBar）
  {
    path: '/app',
    name: 'App',
    component: () => import('@/layouts/AppLayout.vue'),
    redirect: '/app/home',
    children: [
      // ===== 底部5Tab页（showTabBar=true，keepAlive=true）=====
      {
        path: 'home',
        name: 'Home',
        component: () => import('@/views/home/HomePage.vue'),
        meta: { title: '首页', transition: 'fade', keepAlive: true, showTabBar: true },
      },
      {
        path: 'farm',
        name: 'Farm',
        component: () => import('@/views/farm/FarmPage.vue'),
        meta: { title: '灵植', transition: 'fade', keepAlive: true, showTabBar: true },
      },
      {
        path: 'music',
        name: 'Music',
        component: () => import('@/views/music/MusicPage.vue'),
        meta: { title: '天籁', transition: 'fade', keepAlive: true, showTabBar: true },
      },
      {
        path: 'pet',
        name: 'Pet',
        component: () => import('@/views/pet/PetPage.vue'),
        meta: { title: '仙宠', transition: 'fade', keepAlive: true, showTabBar: true },
      },
      {
        path: 'me',
        name: 'Me',
        component: () => import('@/views/me/MePage.vue'),
        meta: { title: '我的', transition: 'fade', keepAlive: true, showTabBar: true },
      },

      // ===== 4个全屏子页（showTabBar=true 保持底栏常驻，slide-left过渡，左上角返回按钮保留）=====
      {
        path: 'gallery',
        name: 'Gallery',
        component: () => import('@/views/gallery/GalleryPage.vue'),
        meta: { title: '画境', transition: 'slide-left', keepAlive: false, showTabBar: true },
      },
      {
        path: 'shrine',
        name: 'Shrine',
        component: () => import('@/views/shrine/ShrinePage.vue'),
        meta: { title: '神龛', transition: 'slide-left', keepAlive: false, showTabBar: true },
      },
      {
        path: 'artifacts',
        name: 'Artifacts',
        component: () => import('@/views/artifacts/ArtifactsPage.vue'),
        meta: { title: '法器', transition: 'slide-left', keepAlive: false, showTabBar: true },
      },
      {
        path: 'bottle',
        name: 'Bottle',
        component: () => import('@/views/bottle/BottlePage.vue'),
        meta: { title: '情绪瓶', transition: 'slide-left', keepAlive: false, showTabBar: true },
      },
      {
        path: 'race',
        name: 'Race',
        component: () => import('@/views/race/RacePage.vue'),
        meta: { title: '仙宠竞速', transition: 'slide-left', keepAlive: false, showTabBar: true },
      },
    ],
  },

  // 兜底重定向
  { path: '/', redirect: '/splash' },
  { path: '/:pathMatch(.*)*', redirect: '/app/home' },
];

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) return savedPosition;
    return { top: 0, left: 0 };
  },
});

// 本地可视化内容后台：仅 dev 注册 /admin 路由（生产构建不含此页）
if (import.meta.env.DEV) {
  router.addRoute({
    path: '/admin',
    name: 'Admin',
    component: () => import('@/views/admin/AdminPage.vue'),
    meta: { title: '内容后台', transition: 'fade', showTabBar: false, showStatusBar: false },
  });
}

// 全局前置守卫：标题设置 + 启动页跳过 + 每日重置 + 同步currentTabKey
router.beforeEach(async (to, _from, next) => {
  // 本地内容后台：hash 路由下直接访问 /admin（无 #）纠正到 /#/admin，避免用户进错地址看到首页
  if (import.meta.env.DEV && to.path === '/admin' && !window.location.hash) {
    window.location.hash = '/admin';
    return;
  }

  if (to.meta.title) document.title = `灵境 · ${to.meta.title}`;

  const hasSeenSplash = sessionStorage.getItem('hasSeenSplash');
  if (to.path === '/splash') {
    if (hasSeenSplash) return next('/app/home');
    sessionStorage.setItem('hasSeenSplash', 'true');
    return next();
  }

  // 每日重置检测（联动user + modules两个store）
  try {
    const userStore = useUserStore();
    const modulesStore = useModulesStore();
    const checkinStore = useCheckinStore();
    userStore.ensureDailyReset();
    modulesStore.ensureDailyReset();
    checkinStore.ensureDailyReset();
  } catch (_e) { /* store未就绪时跳过（main.ts会再init）*/ }

  // 同步currentTabKey（用于TabBar高亮/下划线）
  try {
    const uiStore = useUiStore();
    const path = to.path;
    if (path.includes('/app/home'))   uiStore.setCurrentTab('home');
    if (path.includes('/app/farm'))   uiStore.setCurrentTab('farm');
    if (path.includes('/app/music'))  uiStore.setCurrentTab('music');
    if (path.includes('/app/pet'))    uiStore.setCurrentTab('pet');
    if (path.includes('/app/me'))     uiStore.setCurrentTab('me');
  } catch (_e) { /* 忽略 */ }

  next();
});

// 本地内容后台：进入 /admin 时让 body 跳出「手机框」全宽可滚动（仅 dev 页用）
router.afterEach((to) => {
  document.body.classList.toggle('admin-mode', to.path === '/admin');
});

export default router;
