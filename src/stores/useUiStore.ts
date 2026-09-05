// src/stores/useUiStore.ts —— UI轻量状态（不持久化）
import { defineStore } from 'pinia';
import type { TabKey, IQuote, IBanner } from '@/types/index';

/** 心语池（测试用，后续可接后端）*/
const QUOTE_POOL: IQuote[] = [
  { text: '慢慢来，世界和我都在陪你长大。', author: '花朵' },
  { text: '今日宜静心耕种，上香祈愿。', author: '灵境' },
  { text: '把心事轻轻放下，风会替你带走它。', author: '山月' },
  { text: '每一颗种子，都有它自己的春天。', author: '灵植' },
  { text: '不必匆忙，星光终会落在你肩上。', author: '天籁' },
];

const DEFAULT_BANNER: IBanner = {
  imageUrl: '', // 美术出图后填入 banner_01_3x.webp
  title: '静心探索\n发现内在的自己',
  ctaText: '开始探索',
  targetRoute: '/app/gallery', // 决策12A：Banner点跳画境
};

export const useUiStore = defineStore('ui', {
  state: () => ({
    currentQuote: QUOTE_POOL[0],
    quoteRefreshLoading: false,
    banner: DEFAULT_BANNER,
    bannerGyroEnabled: true, // 01-全局规则 L123：Banner陀螺仪3D微动
    currentTabKey: 'home' as TabKey,
  }),

  actions: {
    /** 换一句（决策14A：300ms防抖 + 旋转，实际防抖在组件内处理）*/
    refreshQuote() {
      if (this.quoteRefreshLoading) return;
      this.quoteRefreshLoading = true;
      // 随机选一条不同的
      const others = QUOTE_POOL.filter(q => q.text !== this.currentQuote.text);
      this.currentQuote = others[Math.floor(Math.random() * others.length)] || QUOTE_POOL[0];
      setTimeout(() => { this.quoteRefreshLoading = false; }, 300);
    },

    setCurrentTab(tab: TabKey) { this.currentTabKey = tab; },
  },

  // UI状态不持久化
  persist: false,
});
