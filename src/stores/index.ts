// src/stores/index.ts —— Pinia 入口（注册持久化插件）
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

export { pinia };
export * from './useUserStore';
export * from './useModulesStore';
export * from './useUiStore';
export * from './useContentStore';
export * from './useRaceStore';
export * from './useCheckinStore';
