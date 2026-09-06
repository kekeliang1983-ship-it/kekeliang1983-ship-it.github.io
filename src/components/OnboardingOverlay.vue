<!-- src/components/OnboardingOverlay.vue —— 新手引导覆盖层（3 步可跳过）-->
<template>
  <transition name="ob-fade">
    <div class="ob-mask" v-if="open" @click.self="skip">
      <div class="ob-card">
        <!-- 进度指示 -->
        <div class="ob-dots">
          <i v-for="n in 3" :key="n" :class="{ active: n <= step }"></i>
        </div>

        <!-- 第1步：欢迎 / 世界观 -->
        <div v-if="step === 1" class="ob-step">
          <div class="ob-bloom">🌸</div>
          <h2 class="ob-title">欢迎来到灵境</h2>
          <p class="ob-text">这里住着等你陪伴的小生物，慢慢来，不着急。</p>
        </div>

        <!-- 第2步：三步核心玩法 -->
        <div v-else-if="step === 2" class="ob-step">
          <h2 class="ob-title">三个温柔的习惯</h2>
          <div class="ob-play">
            <div class="ob-play-item" v-for="p in plays" :key="p.tab">
              <div class="ob-play-ic">{{ p.icon }}</div>
              <div class="ob-play-body">
                <div class="ob-play-name">{{ p.name }}<em>· {{ p.tab }}</em></div>
                <div class="ob-play-desc">{{ p.desc }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 第3步：小提示 -->
        <div v-else class="ob-step">
          <div class="ob-bloom">🔔</div>
          <h2 class="ob-title">一个小提示</h2>
          <p class="ob-text">
            首页右上角的铃铛是系统公告，点开即已读；<br />
            每天来一趟，小生物会更亲近你。
          </p>
        </div>

        <!-- 操作区 -->
        <div class="ob-actions">
          <button class="ob-skip" @click="skip">跳过</button>
          <button class="ob-next" v-if="step < 3" @click="next">下一步</button>
          <button class="ob-next" v-else @click="finish">{{ replay ? '完成' : '进入灵境' }}</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useUserStore } from '@/stores/useUserStore';

const props = defineProps<{
  open: boolean;
  /** 重看模式（「我的→新手帮助」）：完成时只关闭，不负责跳转 */
  replay?: boolean;
}>();

const emit = defineEmits<{ (e: 'finish'): void }>();

const userStore = useUserStore();
const step = ref(1);

// 每次打开重置到第 1 步
watch(
  () => props.open,
  (v) => { if (v) step.value = 1; },
  { immediate: true },
);

const plays = [
  { icon: '🐾', name: '养仙宠', tab: '仙宠', desc: '轻抚小生物，好感度慢慢涨。' },
  { icon: '🌱', name: '种灵植', tab: '灵植', desc: '浇水、收集露水有惊喜。' },
  { icon: '🎵', name: '听天籁', tab: '天籁', desc: '用音乐安抚心境。' },
];

function next() {
  if (step.value < 3) step.value += 1;
}

/** 跳过：等同完成，不要求走完 */
function skip() {
  complete();
}

function finish() {
  complete();
}

/** 统一收尾：置位 onboarded（幂等）+ 通知父级 */
function complete() {
  userStore.setOnboarded();
  emit('finish');
}
</script>

<style scoped>
.ob-mask {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background:
    radial-gradient(circle at 20% 20%, rgba(255, 255, 255, .75), transparent 35%),
    radial-gradient(circle at 80% 70%, rgba(180, 188, 235, .45), transparent 40%),
    linear-gradient(180deg, #EDEFF9 0%, #E1E4F2 60%, #EEF0F7 100%);
}

.ob-card {
  width: 100%;
  max-width: 360px;
  background: rgba(255, 255, 255, .82);
  backdrop-filter: blur(14px);
  border-radius: 24px;
  padding: 28px 24px 20px;
  box-shadow: 0 18px 50px rgba(120, 120, 180, .22);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.ob-dots {
  display: flex;
  gap: 7px;
  margin-bottom: 18px;
}
.ob-dots i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgba(138, 128, 216, .25);
  transition: background .25s, width .25s;
}
.ob-dots i.active {
  width: 20px;
  border-radius: 4px;
  background: var(--accent, #8A80D8);
}

.ob-step {
  min-height: 168px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 6px 0 14px;
}

.ob-bloom {
  font-size: 58px;
  filter: drop-shadow(0 8px 18px rgba(160, 150, 220, .3));
  animation: ob-float 2.6s ease-in-out infinite;
}
@keyframes ob-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.ob-title {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 2px;
  background: linear-gradient(135deg, #8A80D8 0%, #A39AE8 50%, #D6B45D 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.ob-text {
  font-size: 15px;
  line-height: 1.7;
  color: var(--text-secondary, #6c6f7e);
}

.ob-play {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ob-play-item {
  display: flex;
  align-items: center;
  gap: 14px;
  text-align: left;
  background: rgba(138, 128, 216, .07);
  border-radius: 16px;
  padding: 12px 14px;
}
.ob-play-ic {
  font-size: 30px;
  width: 40px;
  text-align: center;
  flex: 0 0 auto;
}
.ob-play-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary, #292A38);
}
.ob-play-name em {
  font-style: normal;
  font-size: 12px;
  font-weight: 600;
  color: var(--accent, #8A80D8);
  margin-left: 6px;
}
.ob-play-desc {
  margin-top: 3px;
  font-size: 12.5px;
  color: var(--text-muted, #8c8f9c);
  line-height: 1.5;
}

.ob-actions {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 6px;
}
.ob-skip {
  flex: 0 0 auto;
  padding: 11px 16px;
  border-radius: 12px;
  border: none;
  background: transparent;
  color: var(--text-muted, #8c8f9c);
  font-size: 14px;
  cursor: pointer;
}
.ob-skip:active { opacity: .6; }
.ob-next {
  flex: 1;
  padding: 12px 0;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #8A80D8 0%, #A39AE8 100%);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 1px;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(138, 128, 216, .3);
}
.ob-next:active { opacity: .85; transform: translateY(1px); }

.ob-fade-enter-active,
.ob-fade-leave-active { transition: opacity .3s ease; }
.ob-fade-enter-from,
.ob-fade-leave-to { opacity: 0; }
</style>
