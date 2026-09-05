<!-- src/layouts/AppLayout.vue —— 主布局：状态栏 + 主内容 + 底部TabBar（条件渲染）-->
<template>
  <div class="app-layout">
    <!-- 1. 自定义状态栏：用户确认移除（PC预览装饰，真实运行环境系统自带）-->
    <!-- 1.5 全局资源条（App级顶部HUD，所有模块共享）-->
    <ResourceHud />

    <!-- 2. 主内容区（路由出口+过渡动效+keepAlive）-->
    <main class="app-content" :class="{ 'no-tab': !$route.meta.showTabBar }">
      <router-view v-slot="{ Component, route }">
        <transition :name="getTransitionName(route)" mode="out-in">
          <keep-alive :include="keepAliveComponents">
            <component :is="Component" :key="route.path" />
          </keep-alive>
        </transition>
      </router-view>
    </main>

    <!-- 3. 底部TabBar（meta控制） -->
    <TabBar v-if="$route.meta.showTabBar !== false" />

    <!-- 4. 灵气泡泡浮层（全局常驻：跨路由持续掉落，点击收取灵气） -->
    <QiBubbles />

    <!-- 5. 数值反馈层：顶栏飘字 + 来源处飘字（双重定位「哪块数值变了」） -->
    <FloatDelta />
    <SourceFloaters />

    <!-- 6. 起名 / 改名弹窗（全局常驻，teleport 到 body） -->
    <NameInputModal />
    <!-- 6.5 换头像弹窗（全局常驻，teleport 到 body） -->
    <AvatarPickerModal />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
// StatusBar 已停用（用户确认移除；文件保留供未来需要时恢复）
import TabBar from '@/components/common/TabBar.vue';
import ResourceHud from '@/components/common/ResourceHud.vue';
import QiBubbles from '@/components/common/QiBubbles.vue';
import FloatDelta from '@/components/common/FloatDelta.vue';
import SourceFloaters from '@/components/common/SourceFloaters.vue';
import { timeEngine } from '@/core/time';
import { useModulesStore, useUserStore } from '@/stores/index';
import { useQiBubbles } from '@/composables/useQiBubbles';
import NameInputModal from '@/components/NameInputModal.vue';
import AvatarPickerModal from '@/components/AvatarPickerModal.vue';
import { useNameModal } from '@/composables/useNameModal';

const route = useRoute();

const getTransitionName = (r: any) => {
  const t = r.meta?.transition;
  return t && t !== 'none' ? `route-${t}` : 'route-fade';
};

// 由 route.meta.keepAlive 控制缓存的页面组件名
const keepAliveComponents = computed(() => ['Home', 'Farm', 'Music', 'Pet', 'Me']);

// 全局心跳：聚灵碗灵气恢复 + 在线时长累计（驱动法器解锁）
// 聚灵碗：按间隔回灵气——interval = 300/rate 秒回 1 点，rate 越高回得越快，每级梯度清晰可见
// （旧实现 Math.round(rate) 每300s一次，Lv1/Lv2 实际 +0，形同无效）
// P2：在线时长与回灵气改为按真实时间差累计，**前后台都计入**——
//     浏览器会把后台 timer 节流到分钟级，直接 +=1 会严重少算；用 Date.now() 差值才准确
let baseAcc = 0; // 在线时长累计（每满 300s 计入法器解锁进度）
let qiAcc = 0;   // 聚灵碗回灵气累计秒
let lastTs = Date.now();
const offQiTick = timeEngine.onTick(() => {
  const now = Date.now();
  let dt = (now - lastTs) / 1000;
  lastTs = now;
  if (dt <= 0) return;
  if (dt > 3600) dt = 3600; // 单次补时上限 1 小时，防改系统时间/长时间休眠导致暴增
  const m = useModulesStore();
  m.normalizeBottle(); // P1⑤ 跨天低频刷新：今日球重新生成 + 次数归零（0 点后进入任意页即生效）
  m.refreshDailyFree(); // 画境跨天：今日免费缘份壁纸 + 今日缘定属性重新生成（0 点后任意页即生效）
  baseAcc += dt;
  qiAcc += dt;
  if (baseAcc >= 300) {
    const chunk = Math.floor(baseAcc / 300) * 300;
    baseAcc -= chunk;
    m.addOnlineSeconds(chunk); // 聚灵碗解锁进度（累计在线满10h）+ 每满 1 小时碎片 +1
  }
  // 聚灵碗（法器）：灵气恢复速度由 artifactEffect('qiSpeed') 配置驱动（默认 +20%/级，满级 +100%）
  const qiEff = m.artifactEffect('qiSpeed');
  const rate = qiEff.equipped ? qiEff.multiplier : 1;
  const interval = 300 / rate; // 回 1 点灵气所需秒数（Lv1≈250s / Lv5=150s / 未装=300s）
  if (qiAcc >= interval) { qiAcc -= interval; useUserStore().changeQi(1); }
}, 'qi-recovery');
onUnmounted(offQiTick);

// 灵气泡泡：应用级启动/卸载（全局常驻，切页面不掉）
const qiBubbles = useQiBubbles();
const nameModal = useNameModal();
onMounted(() => {
  qiBubbles.start();
  // 首进起名引导：未取名且未跳过过 → 自动弹起名卡；用户跳过则持久化 renameSkipped 不再弹
  const u = useUserStore();
  if (u.nickname === null && !u.renameSkipped) {
    nameModal.open({ mode: 'first' }).then((name) => {
      if (name === null) u.renameSkipped = true; // 跳过 → 持久化，避免每次进都弹
    });
  }
});
onUnmounted(() => qiBubbles.stop());
</script>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

.app-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  padding-bottom: var(--safe-bottom, 0px);
}

/* ---------- 路由过渡动效 ---------- */
.route-fade-enter-active, .route-fade-leave-active { transition: opacity .25s ease; }
.route-fade-enter-from, .route-fade-leave-to { opacity: 0; }

/* 左滑进入（全屏子页） */
.route-slide-left-enter-active { animation: slideInRight .3s cubic-bezier(.25,.46,.45,.94) forwards; }
.route-slide-left-leave-active { animation: slideOutLeft  .3s cubic-bezier(.55,.085,.68,.53) forwards; }
@keyframes slideInRight { from { transform: translateX(100%); opacity: .6; } to { transform: translateX(0); opacity: 1; } }
@keyframes slideOutLeft  { from { transform: translateX(0); opacity: 1; }   to { transform: translateX(-30%); opacity: .3; } }

/* 右滑返回 */
.route-slide-right-enter-active { animation: slideInLeft  .3s cubic-bezier(.25,.46,.45,.94) forwards; }
.route-slide-right-leave-active { animation: slideOutRight .3s cubic-bezier(.55,.085,.68,.53) forwards; }
@keyframes slideInLeft  { from { transform: translateX(-30%); opacity: .3; } to { transform: translateX(0); opacity: 1; } }
@keyframes slideOutRight { from { transform: translateX(0); opacity: 1; }   to { transform: translateX(100%); opacity: .6; } }
</style>
