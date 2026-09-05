<script setup lang="ts">
import { watch } from 'vue';

const props = defineProps<{
  open: boolean;
  emoji?: string;
  title: string;
  subtitle?: string;
  qualityLabel?: string;
  thumbSrc?: string;
}>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'go'): void }>();

// 打开时禁止背景滚动
watch(() => props.open, (v) => {
  if (typeof document !== 'undefined') document.body.style.overflow = v ? 'hidden' : '';
}, { immediate: true });
</script>

<template>
  <teleport to="body">
    <transition name="celebrate-fade">
      <div v-if="open" class="celebrate-mask" @click.self="emit('close')">
        <div class="celebrate-card">
          <div class="light-sweep"></div>
          <span class="spark s1">✦</span>
          <span class="spark s2">✧</span>
          <span class="spark s3">✦</span>
          <span class="spark s4">✧</span>
          <p class="c-eyebrow">✦ 获得隐藏壁纸 ✦</p>
          <div class="thumb">
            <img v-if="thumbSrc" :src="thumbSrc" :alt="title" />
            <span v-else class="thumb-emoji">{{ emoji || '🖼️' }}</span>
          </div>
          <h2 class="c-title">{{ title }}</h2>
          <p v-if="qualityLabel" class="c-quality">{{ qualityLabel }}</p>
          <p class="c-sub">{{ subtitle || '已收入画境隐藏壁纸栏，快去欣赏吧' }}</p>
          <div class="c-actions">
            <button class="c-btn ghost" v-feedback="'BUTTON_CLICK'" @click="emit('close')">收下</button>
            <button class="c-btn primary" v-feedback="'BUTTON_CLICK'" @click="emit('go')">去画境查看</button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<style scoped>
.celebrate-mask {
  position: fixed; inset: 0; z-index: var(--z-overlay, 1000);
  display: flex; align-items: center; justify-content: center;
  background: rgba(20, 14, 4, .62); backdrop-filter: blur(6px);
  padding: 24px;
}
.celebrate-card {
  position: relative; width: 100%; max-width: 320px;
  padding: 30px 24px 24px; border-radius: 24px; overflow: hidden;
  text-align: center;
  background:
    radial-gradient(120% 90% at 50% -10%, #5a4318 0%, #2c2008 55%, #181204 100%);
  border: 1.5px solid rgba(255, 214, 130, .55);
  box-shadow: 0 20px 60px rgba(0, 0, 0, .5), inset 0 0 40px rgba(255, 198, 96, .12);
}
/* 流光金扫过 */
.light-sweep {
  position: absolute; top: -60%; left: -30%; width: 60%; height: 220%;
  background: linear-gradient(90deg, transparent, rgba(255, 224, 150, .35), transparent);
  transform: rotate(18deg); animation: sweep 2.6s ease-in-out infinite;
  pointer-events: none;
}
@keyframes sweep { 0% { left: -40%; } 60%, 100% { left: 120%; } }
.spark {
  position: absolute; color: #ffe3a0; font-size: 14px; opacity: .85;
  text-shadow: 0 0 8px rgba(255, 210, 120, .9); animation: twinkle 2s ease-in-out infinite;
}
.s1 { top: 18px; left: 24px; } .s2 { top: 26px; right: 30px; animation-delay: .4s; }
.s3 { bottom: 64px; left: 32px; animation-delay: .8s; } .s4 { bottom: 80px; right: 26px; animation-delay: 1.2s; }
@keyframes twinkle { 0%, 100% { opacity: .3; transform: scale(.8); } 50% { opacity: 1; transform: scale(1.15); } }

.c-eyebrow {
  position: relative; margin: 0 0 14px; font-size: 13px; letter-spacing: 2px;
  color: #ffe6ad; text-shadow: 0 1px 4px rgba(0, 0, 0, .6);
}
.thumb {
  position: relative; width: 130px; height: 130px; margin: 0 auto 16px;
  border-radius: 18px; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #3a2c0e, #1c1505);
  border: 1.5px solid rgba(255, 214, 130, .6);
  box-shadow: 0 8px 26px rgba(0, 0, 0, .45), inset 0 0 24px rgba(255, 198, 96, .18);
  animation: pop .5s cubic-bezier(.2, .9, .3, 1.3) both;
}
.thumb img { width: 100%; height: 100%; object-fit: cover; border-radius: 16px; }
.thumb-emoji { font-size: 64px; filter: drop-shadow(0 4px 12px rgba(255, 200, 110, .5)); }
@keyframes pop { from { transform: scale(.4); opacity: 0; } to { transform: scale(1); opacity: 1; } }

.c-title {
  position: relative; margin: 0; font-size: 22px; font-weight: 700; color: #fff;
  text-shadow: 0 2px 6px rgba(0, 0, 0, .7), 0 0 14px rgba(255, 205, 110, .55);
}
.c-quality {
  position: relative; margin: 6px 0 0; font-size: 12px; letter-spacing: 1px;
  color: #ffd98a; text-shadow: 0 1px 3px rgba(0, 0, 0, .6);
}
.c-sub {
  position: relative; margin: 10px 0 20px; font-size: 13px; line-height: 1.6;
  color: #f3ead0; text-shadow: 0 1px 3px rgba(0, 0, 0, .6);
}
.c-actions { position: relative; display: flex; gap: 10px; }
.c-btn {
  flex: 1; padding: 12px 0; border: none; border-radius: 14px; font-size: 14px; font-weight: 600;
  cursor: pointer; transition: transform .12s ease;
}
.c-btn:active { transform: scale(.96); }
.c-btn.ghost { background: rgba(255, 255, 255, .1); color: #ffe6ad; border: 1px solid rgba(255, 214, 130, .4); }
.c-btn.primary {
  background: linear-gradient(135deg, #ffd884, #f0a93c); color: #3a2606;
  box-shadow: 0 6px 18px rgba(240, 169, 60, .45);
}
.celebrate-fade-enter-active, .celebrate-fade-leave-active { transition: opacity .28s ease; }
.celebrate-fade-enter-from, .celebrate-fade-leave-to { opacity: 0; }
</style>
