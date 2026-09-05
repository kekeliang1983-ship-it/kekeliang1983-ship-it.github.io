<!--
  src/App.vue —— 根组件（全局启动只在这里做一次）
  ⚠️  职责：只渲染 <router-view />，并在 onMounted 触发：
        ① 跨天重置（先取 lastActive 算离线秒数 → userStore → modulesStore）
        ② 离线时间流逝推进 plots/pet（8小时上限）
        ③ 启动 timeEngine 全局秒级心跳
  ⚠️  不做任何 UI 布局（布局在 layouts/）
-->
<template>
  <router-view />
  <ConfirmModal />
  <DevPanel />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import ConfirmModal from '@/components/common/ConfirmModal.vue';
import DevPanel from '@/components/common/DevPanel.vue';
import { useUserStore, useModulesStore } from '@/stores/index';
import { timeEngine } from '@/core/time';
import { createDebugLogger } from '@/core/debugLogger';

const _l = createDebugLogger('App启动');

onMounted(() => {
  const userStore = useUserStore();
  const modulesStore = useModulesStore();

  /* ================================================================
     1) 先取「上次活跃时间戳」，再 userStore.ensureDailyReset() 会把它刷成 now
        —— 所以计算离线秒数必须放在重置之前
  ================================================================= */
  const lastActiveMs = userStore.lastActiveTimestamp || Date.now();
  const offlineSec = timeEngine.calcOfflineSeconds(lastActiveMs);
  const g = _l.group('启动引导');
  try {
    g.info('lastActiveTimestamp =', new Date(lastActiveMs).toLocaleString(),
      `| 离线 ${offlineSec}s（≈${(offlineSec/3600).toFixed(2)}h，上限8h）`);

    userStore.ensureDailyReset();
    modulesStore.ensureDailyReset();
    g.success('✅ 跨天重置完成');

    /* ================================================================
       2) 离线时间流逝：推进种植 growing→ready（Pinia深层对象Vue可直接响应式修改）
    ================================================================= */
    if (offlineSec > 0 && Array.isArray(modulesStore.plots)) {
      let grownMature = 0;
      modulesStore.plots.forEach((plot) => {
        if (plot.status === 'growing') {
          const next = Math.max(0, (plot.remainingSeconds || 0) - offlineSec);
          plot.remainingSeconds = next;
          if (next <= 0) {
            plot.status = 'ready';
            grownMature += 1;
          }
        }
      });
      if (grownMature > 0) g.success(`🌱 灵植离线成熟 ${grownMature} 块`);
      else g.dim('🌱 灵植：无新成熟地块');
    } else {
      g.dim('🌱 灵植：offlineSec=0 / 跳过');
    }

    /* ================================================================
       3) 离线时间流逝：推进仙宠旅行 → 到达
          保留 traveling 状态与 endTimestamp，交由 PetPage.refreshTravel 在回前台时
          翻转为 returning 并由 claimPetTravel 真实结算奖励（避免离线旅行奖励丢失）
    ================================================================= */
    const pet = modulesStore.pet;
    if (pet && (pet.travelStatus === 'traveling' || pet.travelStatus === 'returning')) {
      const now = Date.now();
      const endMs = pet.travelEndTimestamp || 0;
      if (endMs > 0 && now >= endMs) {
        // 离线已到点：不在此丢弃旅行数据，保持原状，奖励由 PetPage 领取不丢
        g.success('🐾 仙宠旅行已到点（归来待领取，奖励不丢）');
      } else {
        const hours = Math.max(0, Math.ceil((endMs - now) / (60 * 60 * 1000)));
        g.dim(`🐾 仙宠仍在旅行中，约 ${hours}h 归来`);
      }
    } else {
      g.dim('🐾 仙宠：在家状态，跳过离线推进');
    }

    /* ================================================================
       4) 启动 timeEngine 全局秒级心跳（后续玩法页可 onTick 订阅做倒计时）
    ================================================================= */
    timeEngine.start();
    g.success('⏱️ timeEngine 启动完成');
  } finally {
    g.end();
  }
});
</script>

<style>
/* 根级保持空，全局样式在 src/styles/global.css */
</style>
