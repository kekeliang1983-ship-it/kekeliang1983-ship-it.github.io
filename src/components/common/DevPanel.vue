<template>
  <div v-if="enabled" class="dev-root">
    <!-- 悬浮入口 -->
    <button class="dev-fab" @click="open = !open" title="调试台">🛠️</button>

    <!-- 调试面板 -->
    <transition name="dev-fade">
      <section v-if="open" class="dev-panel card-glass">
        <header class="dev-head">
          <span>🛠️ 调试台 · DEV</span>
          <button class="dev-x" @click="open = false">✕</button>
        </header>

        <div class="dev-sec">
          <div class="dev-label">作物生长倍速（仅实时 tick）</div>
          <div class="dev-seg">
            <button v-for="s in scales" :key="s" :class="{ on: devTimeScale === s }" @click="devTimeScale = s">
              {{ s }}×
            </button>
          </div>
        </div>

        <div class="dev-sec">
          <div class="dev-label">即时操作（手动推状态，测串联）</div>
          <div class="dev-grid">
            <button @click="run('rip', () => modules.debugRipenAll(), '已令全部作物成熟')">🌾 作物全成熟</button>
            <button @click="run('qi', () => user.changeQi(50), '灵气 +50')">💧 灵气 +50</button>
            <button @click="run('money', fillMoney, '货币已拉满')">💎 货币全满</button>
            <button @click="run('pet', () => modules.debugForcePetReturn(), '仙宠已归来')">🐾 仙宠立即归来</button>
            <button @click="run('ff', () => modules.debugFastForwardLong(), '旅行/buff 已快进')">⏩ 长周期快进</button>
            <button @click="run('exp', () => modules.debugExpireBuff(), '神龛buff已失效')">🏯 buff失效</button>
            <button @click="run('ren', () => modules.debugRenewBuff(), '神龛buff续期1h')">🏯 buff续期</button>
            <button @click="run('day', () => modules.debugDailyReset(), '已强制跨天刷新')">🔄 跨天刷新</button>
            <button @click="run('all', () => modules.debugUnlockAllCollections(), '图鉴已全部解锁')">🔓 图鉴全解锁</button>
          </div>
        </div>

        <footer class="dev-foot">仅 ?debug=1 可见 · 生产不可达</footer>
      </section>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useUserStore } from '@/stores/index';
import { useModulesStore } from '@/stores/index';
import { useToast } from '@/composables/useToast';
import { isDevMode, devTimeScale } from '@/core/devClock';

const enabled = isDevMode();
const open = ref(false);
const scales = [1, 10, 60, 300];

const user = useUserStore();
const modules = useModulesStore();
const { showToast } = useToast();

function fillMoney() {
  user.gold = 1e9; user.pearl = 1e9; user.magic = 1e9; user.jade = 1e9;
}

function run(_k: string, fn: () => unknown, msg: string) {
  try {
    fn();
    showToast(msg);
  } catch (e) {
    showToast('调试操作失败：' + (e instanceof Error ? e.message : String(e)));
  }
}
</script>

<style scoped>
.dev-root { position: fixed; right: 14px; bottom: 74px; z-index: var(--z-dev, 9999); }
.dev-fab {
  width: 46px; height: 46px; border-radius: 50%; border: none; cursor: pointer;
  font-size: 22px; background: rgba(40, 30, 60, .82); color: #fff;
  box-shadow: 0 6px 18px rgba(0, 0, 0, .35); backdrop-filter: blur(6px);
}
.dev-panel {
  position: fixed; right: 14px; bottom: 128px; width: 280px; padding: 14px;
  border-radius: 16px; color: #2a2336; background: rgba(255, 255, 255, .92);
  box-shadow: 0 12px 40px rgba(0, 0, 0, .3);
}
.dev-head { display: flex; justify-content: space-between; align-items: center; font-weight: 700; margin-bottom: 10px; }
.dev-x { border: none; background: transparent; font-size: 16px; cursor: pointer; color: #888; }
.dev-sec { margin-bottom: 12px; }
.dev-label { font-size: 12px; color: #6b6280; margin-bottom: 6px; }
.dev-seg { display: flex; gap: 6px; }
.dev-seg button {
  flex: 1; padding: 6px 0; border-radius: 8px; border: 1px solid #d8d2e4; background: #fff; cursor: pointer; font-size: 13px;
}
.dev-seg button.on { background: #7c5cff; color: #fff; border-color: #7c5cff; }
.dev-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.dev-grid button {
  padding: 8px 6px; border-radius: 8px; border: 1px solid #d8d2e4; background: #fff; cursor: pointer; font-size: 12px;
}
.dev-grid button:active { background: #efeaff; }
.dev-foot { font-size: 10px; color: #a59fc0; text-align: center; margin-top: 4px; }
.dev-fade-enter-active, .dev-fade-leave-active { transition: opacity .18s ease, transform .18s ease; }
.dev-fade-enter-from, .dev-fade-leave-to { opacity: 0; transform: translateY(8px); }
</style>
