<!--
  src/views/music/MusicPage.vue —— 天籁（治愈背景音乐）主页面
  机制对齐策划：01-全局规则(模块5) / 02-全局核心常量(五) / 03-API(6.x) / 08-模拟后端(4.6) / 16-真实后端
  拍板(2026-08-25)：解锁费按16珠丸交替；空灵笛翻倍演示层补齐；页内沉浸播放卡；真实音频播放（public/audio）
  拍板(2026-08-25 二轮)：4h奖励=典藏曲「烟火长安」；里程碑扩5档(15min/1h/4h/12h/24h)；「?」=天籁指南弹层（图标与情绪瓶指南统一）
  挂机收益：每满5分钟 → 魔丸+1 心境+2（空灵笛装备魔丸+N）；跨路由/锁屏持续计时（按真实播放时长，去前台闸门）
  里程碑：15min 灵珠x2 / 1h 空灵笛碎片 / 4h 典藏曲 / 12h 碎片x2 / 24h 知音+天玑x1
  注：TabBar 由 AppLayout 全局注入，资源条由 ResourceHud 全局提供
-->
<template>
  <div class="music-page">

    <!-- ============ 品牌区 ============ -->
    <header class="topbar">
      <div class="brand">
        <h1>天籁</h1>
        <p>{{ subtitle }}</p>
      </div>
      <CornerButton tone="accent" aria-label="天籁指南" @click="showGuide = true">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      </CornerButton>
    </header>

    <!-- ============ 沉浸播放卡 ============ -->
    <section class="player card-glass" :class="{ playing: isPlaying }">
      <div class="halo" aria-hidden="true"></div>
      <div class="disc">
        <div class="disc-core">♪</div>
      </div>
      <div class="spectrum" aria-hidden="true">
        <i v-for="n in 5" :key="n" :style="{ animationDelay: (n * 0.12) + 's' }"></i>
      </div>
      <div class="p-info">
        <div class="p-name">{{ currentTrack?.name || '—' }}
          <span v-if="isClaimed(24)" class="zy-badge">✨ 知音</span>
        </div>
        <div class="p-meta">{{ currentTrack ? fmtDuration(currentTrack.durationSeconds) : '' }}
          <template v-if="fluteEquipped"> · <b class="flute-tag">空灵笛·魔丸×{{ fluteMult }}</b></template>
        </div>
      </div>
      <div class="p-progress">
        <div class="bar"><i :style="{ width: playPct + '%' }"></i></div>
        <span class="p-time">{{ fmtDuration(position) }} / {{ duration > 0 ? fmtDuration(duration) : (currentTrack ? fmtDuration(currentTrack.durationSeconds) : '0:00') }}</span>
      </div>
      <div class="p-controls">
        <button class="ctl" v-feedback="'BUTTON_CLICK'" @click="skip(-1)" :disabled="!canSwitch">
          <svg viewBox="0 0 24 24"><path d="M11 6 5 12l6 6V6Zm8 0-6 6 6 6V6Z"/></svg>
        </button>
        <button class="play" v-feedback="'BUTTON_CLICK'" @click="togglePlay" :disabled="!currentTrack">
          <svg v-if="!isPlaying" viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5L8 5.5Z"/></svg>
          <svg v-else viewBox="0 0 24 24"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>
        </button>
        <button class="ctl" v-feedback="'BUTTON_CLICK'" @click="skip(1)" :disabled="!canSwitch">
          <svg viewBox="0 0 24 24"><path d="m13 6 6 6-6 6V6Zm-8 0 6 6-6 6V6Z"/></svg>
        </button>
      </div>
      <p class="p-hint">后台/锁屏持续计时 · 每满 5 分钟 魔丸+1 心境+2</p>
    </section>

    <!-- ============ 挂机奖励 toast ============ -->
    <transition name="fade">
      <div class="reward-toast" v-if="toastMsg">{{ toastMsg }}</div>
    </transition>

    <!-- ============ 曲库 ============ -->
    <section class="card card-glass">
      <div class="sec-head"><div class="c-title">曲库</div><span class="sec-tip">{{ unlockedCount }}/{{ modules.musicTracks.length }}</span></div>
      <!-- ===== 歌单 / 场景合集 tab（复用策展集合模型，后台自由编排） ===== -->
      <div class="tabs">
        <button class="tab" :class="{ active: musicTab === 'all' }" v-feedback="'BUTTON_CLICK'" @click="musicTab = 'all'">全部</button>
        <button
          v-for="c in musicCollections"
          :key="c.id"
          class="tab"
          :class="{ active: musicTab === c.id }"
          v-feedback="'BUTTON_CLICK'"
          @click="musicTab = c.id"
        >{{ c.icon ? c.icon + ' ' : '' }}{{ c.label }}</button>
      </div>
      <div class="track-list">
        <div
          v-for="(t, idx) in filteredTracks"
          :key="t.id"
          class="track"
          :class="{ active: t.isUnlocked && t.id === currentTrackId && isPlaying, current: t.id === currentTrackId }"
        >
          <div class="t-num" v-if="!t.isUnlocked">🔒</div>
          <button class="t-play" v-else v-feedback="'BUTTON_CLICK'" @click="playTrack(t)">
            <svg v-if="t.id === currentTrackId && isPlaying" viewBox="0 0 24 24"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>
            <svg v-else viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5L8 5.5Z"/></svg>
          </button>
          <div class="t-info">
            <b>{{ t.name }}</b>
            <span>{{ fmtDuration(t.durationSeconds) }}{{ t.isUnlocked ? '' : ' · ' + unlockLabel(t) }}</span>
            <div class="t-tags" v-if="t.tags && t.tags.length">
              <i v-for="tag in t.tags" :key="tag">#{{ tag }}</i>
            </div>
          </div>
          <button v-if="!t.isUnlocked && t.unlockCost" class="unlock" v-feedback="'BUTTON_CLICK'" @click="onUnlock(t)">解锁</button>
          <span v-else-if="!t.isUnlocked" class="t-lock">{{ unlockLabel(t) }}</span>
          <span v-else class="t-state" :class="{ on: t.id === currentTrackId && isPlaying }">{{ t.id === currentTrackId && isPlaying ? '播放中' : '就绪' }}</span>
        </div>
      </div>
    </section>

    <!-- ============ 聆听里程碑 ============ -->
    <section class="card card-glass">
      <div class="sec-head"><div class="c-title">聆听里程碑</div><span class="sec-tip">{{ fmtListen(modules.musicListenSeconds) }}</span></div>
      <div class="mile-list">
        <div class="mile" v-for="m in MILESTONES" :key="m.hours">
          <div class="m-icon">{{ m.icon }}</div>
          <div class="m-info">
            <div class="m-head">
              <b>{{ m.name }}</b>
              <span class="m-state" :class="{ claimed: isClaimed(m.hours), ready: canClaim(m.hours) }">
                {{ isClaimed(m.hours) ? '已领取' : (canClaim(m.hours) ? '可领取' : '未达成') }}
              </span>
            </div>
            <p>{{ m.desc }}</p>
            <div class="bar m-bar"><i :style="{ width: milePct(m.hours) + '%' }"></i></div>
          </div>
          <button
            v-if="canClaim(m.hours)"
            class="claim"
            v-feedback="'BUTTON_CLICK'"
            @click="onClaim(m.hours, $event)"
          >领取</button>
        </div>
      </div>
    </section>

    <!-- ============ 天籁指南弹层 ============ -->
    <Overlay variant="modal" :open="showGuide" @close="showGuide = false">
      <div class="guide-card">
        <div class="g-head">
          <b>天籁指南</b>
        </div>
        <div class="g-body">
          <div class="g-item"><span class="g-ic">⏱️</span><div><b>挂机计时</b><p>切到其它版块或锁屏也持续计时（按真实播放时长），听歌同时能照料其它生灵；每满 5 分钟 → 魔丸+1、心境+2</p></div></div>
          <div class="g-item"><span class="g-ic">🎋</span><div><b>空灵笛翻倍</b><p>在「法器背包」点击装备空灵笛后，挂机魔丸收益 ×{{ fluteMult }}（每升 1 级再 +1），碎片更快攒齐</p></div></div>
          <div class="g-item"><span class="g-ic">🔓</span><div><b>曲目解锁</b><p>前 3 首免费，后 2 首以 20 灵珠 / 15 魔丸交替解锁；典藏曲「烟火长安」需聆听 4 小时里程碑领取</p></div></div>
          <div class="g-item"><span class="g-ic">🏆</span><div><b>聆听里程碑</b><p>15分钟 / 1h / 4h / 12h / 24h 五档，累计时长达标即可领取对应奖励</p></div></div>
        </div>
      </div>
    </Overlay>

    <!-- ============ 里程碑庆祝卡 ============ -->
    <Overlay variant="modal" :open="!!celebrate" @close="celebrate = null">
      <div class="celebrate-card">
        <div class="cc-ic">{{ celebrate?.icon }}</div>
        <b class="cc-title">聆听里程碑达成</b>
        <p class="cc-sub">{{ celebrate?.name }}</p>
        <button class="cc-ok" v-feedback="'BUTTON_CLICK'" @click="celebrate = null">收下</button>
      </div>
    </Overlay>

    <!-- ============ 调试：重播入场动画（生产自动移除，预览保留） ============ -->
    <button
      v-if="IS_PREVIEW"
      class="debug-replay-btn"
      aria-label="重播入场动画"
      v-feedback="'BUTTON_CLICK'"
      @click="pageIntro.replay()"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="23 4 23 10 17 10"/>
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'Music' });
import { ref, computed, onMounted, onUnmounted, onActivated, onDeactivated } from 'vue';
import { useUserStore, useModulesStore, useContentStore } from '@/stores/index';
import { vFeedback, audio } from '@/core/feedback';
import type { IMusicTrack } from '@/types/index';
import CornerButton from '@/components/common/CornerButton.vue';
import Overlay from '@/components/common/Overlay.vue';
import { usePageIntro } from '@/composables/usePageIntro';
import { useToast } from '@/composables/useToast';
import { useConfirm } from '@/composables/useConfirm';
import { useAudioPlayer } from '@/composables/useAudioPlayer';
import { useFloaters } from '@/composables/useFloaters';
const { pushFloater, rectCenter } = useFloaters();

const user = useUserStore();
const modules = useModulesStore();
const content = useContentStore();
const { ask: askConfirm } = useConfirm();

/* ---------- 歌单 / 场景合集 tab（策展集合模型：与曲目解耦、多对多） ---------- */
const musicTab = ref<string>('all');
const musicCollections = computed(() =>
  (content.remoteMusicCollections || [])
    .filter((c) => c.enabled !== false)
    .slice()
    .sort((a, b) => (a.order ?? 50) - (b.order ?? 50)),
);
const filteredTracks = computed(() => {
  if (musicTab.value === 'all') return modules.musicTracks;
  const c = musicCollections.value.find((x) => x.id === musicTab.value);
  if (!c) return modules.musicTracks;
  const set = new Set(c.ids);
  return modules.musicTracks.filter((t) => set.has(t.id));
});

/* 播放器状态/控制来自全局单例 useAudioPlayer：跨路由/锁屏持续播放与计时 */
const {
  isPlaying, currentTrackId, currentTrack, position, duration,
  canSwitch, fluteEquipped, fluteMult,
  playTrack, togglePlay, skip,
  connectPlayerUI, drainPendingSettle, drainPendingError,
} = useAudioPlayer();

/* ---------- 页面轻量入场动画（usePageIntro：入场 expo.out/back.out + 唱片芯轻浮动循环，总观感 ~0.7s） ---------- */
const IS_PREVIEW = import.meta.env.MODE !== 'production';
const pageIntro = usePageIntro({
  rootSelector: '.music-page',
  sections: [
    { selector: '.topbar', y: 14, duration: 0.38 },
    // 播放卡是页面重点：微缩放 + 上浮淡入
    { selector: '.player', y: 16, scale: 0.985, duration: 0.45 },
    // 曲库 6 首 center stagger 错峰上浮（锁着的曲一起进来）
    { selector: '.track-list .track', y: 12, duration: 0.34, stagger: 0.05 },
    { selector: '.mile-list .mile', y: 12, duration: 0.34, stagger: 0.05 },
  ],
  // 循环只保留唱片芯呼吸浮动（轻）；播放中唱片自转由 CSS animation 负责，GSAP 不动它避免冲突
  loops: [
    { selector: '.disc-core', y: -4, duration: 3.2 },
  ],
});

/* ---------- 常量 ---------- */
/* 里程碑（02-L56-58 基础档 + 2026-08-25 拍板扩展：15min 首正反馈、12h 碎片补位） */
const MILESTONES = [
  { hours: 0.25, icon: '🎁', name: '灵珠 ×2', desc: '累计聆听 15 分钟 · 初次沉浸的礼物' },
  { hours: 1,    icon: '🎋', name: '空灵笛碎片 ×1', desc: '累计聆听 1 小时 · 凑齐3枚可合成法器' },
  { hours: 4,    icon: '🌙', name: '典藏曲·烟火长安', desc: '累计聆听 4 小时 · 解锁专属加长曲' },
  { hours: 12,   icon: '🎋', name: '空灵笛碎片 ×2', desc: '累计聆听 12 小时 · 加快法器合成' },
  { hours: 24,   icon: '✨', name: '知音标签 + 天玑 ×1', desc: '累计聆听 24 小时 · 长期陪伴的见证' },
];
/* 真实曲目按 id 映射音频文件（src 见 store 的 musicTracks） */

/* ---------- 本地状态（UI 层；播放态来自全局单例） ---------- */
const { toastMsg, showToast } = useToast(2600);
const showGuide = ref(false);   // 天籁指南弹层（右上「?」）
/* 里程碑领取庆祝卡（强化「获得感」，复用 Overlay 模态） */
const celebrate = ref<{ name: string; icon: string } | null>(null);

/* ---------- 计算属性 ---------- */
const unlockedCount = computed(() => modules.musicTracks.filter((t) => t.isUnlocked).length);
const playPct = computed(() => (duration.value > 0 ? Math.min(100, (position.value / duration.value) * 100) : 0));
const subtitle = computed(() => `${unlockedCount.value}首曲目 · 已听 ${fmtListen(modules.musicListenSeconds)}`);

/* ---------- 工具 ---------- */
function fmtDuration(s: number) {
  // 播放进度含小数秒（audio.currentTime），取整避免 56.999… 之类小数
  const total = Math.max(0, Math.round(s));
  const m = Math.floor(total / 60), sec = total % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}
function fmtListen(s: number) {
  const total = Math.max(0, Math.round(s)); // 已聆听秒数防御取整
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  // 始终显示「分+秒」（含小时时显示 时+分+秒），让聆听进度观察更直观
  if (h > 0) return `${h}时${m}分${sec}秒`;
  if (m > 0) return `${m}分${sec}秒`;
  return `${sec}秒`;
}
function unlockLabel(t: IMusicTrack) {
  const c = t.unlockCost || {};
  // 典藏曲：无货币价，仅里程碑解锁
  if (t.milestoneHours && !c.pearl && !c.magic) return `聆听 ${t.milestoneHours}h 解锁`;
  return c.pearl ? `${c.pearl}灵珠解锁` : `${c.magic}魔丸解锁`;
}
function isClaimed(h: number) { return modules.musicClaimedMilestones.includes(h); }
function canClaim(h: number) { return !isClaimed(h) && modules.musicListenSeconds / 3600 >= h; }
function milePct(h: number) {
  return Math.min(100, Math.round((modules.musicListenSeconds / 3600 / h) * 100));
}

/* 播放逻辑（playTrack / togglePlay / skip / 音频元素 / 计时）已下沉到全局单例 useAudioPlayer：
   音乐随单例常驻，跨路由切换与锁屏持续播放；聆听时长按真实播放时间累计（后台照计）。 */

/* ---------- 曲目解锁（16 珠丸交替；store 已含扣费） ---------- */
async function onUnlock(t: IMusicTrack) {
  const cost = t.unlockCost || {};
  if (!(await askConfirm({ title: '解锁曲目', message: `确定解锁「${t.name}」吗？`, cost }))) return;
  const ok = modules.unlockMusicTrack(t.id);
  if (!ok) {
    audio.play('error');
    const need = cost.pearl ? `${cost.pearl} 灵珠` : `${cost.magic} 魔丸`;
    showToast(`货币不足，解锁「${t.name}」需 ${need}`);
    return;
  }
  audio.play('success');
  showToast(`已解锁「${t.name}」，去听一听吧`);
}

/* ---------- 里程碑领取 ---------- */
function onClaim(hours: number, ev?: MouseEvent) {
  const m = MILESTONES.find((x) => x.hours === hours);
  const ok = modules.claimMusicMilestone(hours);
  if (ok) {
    audio.play('coin');
    if (m) {
      celebrate.value = { name: m.name, icon: m.icon }; // 庆祝卡强化获得感
      const mc = rectCenter(ev?.currentTarget as Element | undefined);
      pushFloater({ x: mc.x, y: mc.y - 12, text: `🎉 ${m.name}`, kind: 'magic', duration: 1500 });
    }
  }
}

/* ---------- 挂机收益：实时回调（页面可见时立即弹奖励 toast） ---------- */
function handleSettle(info: { magic: number; extra: boolean }) {
  showToast(info.extra
    ? `沉浸 5 分钟 · 魔丸+${info.magic} 心境+2 ✨灵珠+1`
    : `沉浸 5 分钟 · 魔丸+${info.magic} 心境+2`);
}

/* ---------- 与全局播放器绑定 UI ----------
   页面可见时：挂机奖励即时弹 toast；
   离开页面（切版块/后台）：收益缓存进单例，回来再一次性播报；音乐与计时由单例持续承担。 */
function bindPlayerUI() {
  connectPlayerUI({ showToast, onSettle: handleSettle });
  const p = drainPendingSettle();
  if (p.segments > 0) {
    showToast(`挂机 ${p.segments} 段 · 魔丸+${p.magic} 心境+${p.mood}${p.extra ? ` ✨灵珠+${p.extra}` : ''}`);
  }
  const err = drainPendingError();
  if (err) showToast(err);
}
function unbindPlayerUI() {
  connectPlayerUI(null);
}

onMounted(bindPlayerUI);
onActivated(bindPlayerUI);
onDeactivated(unbindPlayerUI);
onUnmounted(unbindPlayerUI);
</script>

<style scoped>
.music-page { padding: 14px 22px calc(96px + env(safe-area-inset-bottom, 0px)); min-height: 100%; box-sizing: border-box; }
.card-glass {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  backdrop-filter: var(--backdrop-lg);
  -webkit-backdrop-filter: var(--backdrop-lg);
  box-shadow: var(--shadow-float);
}
.card { margin: 0; border-radius: var(--radius-card); padding: 18px; }
.card + .card { margin-top: 14px; }

/* 品牌区 */
.topbar { display: flex; justify-content: space-between; align-items: flex-start; padding: 18px 0 0; }
.brand h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -.5px; color: var(--text-primary); }
.brand p { margin: 4px 0 0; font-size: 13px; color: var(--text-muted); }

/* 沉浸播放卡（区块间距统一 14px：topbar→player / player→曲库 / card+card 均一致） */
.player { position: relative; overflow: hidden; margin-top: 14px; margin-bottom: 14px; padding: 26px 22px 20px;
  display: flex; flex-direction: column; align-items: center; gap: 14px; }
.halo { position: absolute; left: 50%; top: 30px; width: 300px; height: 300px; transform: translateX(-50%);
  background: radial-gradient(circle, rgba(138,128,216,.18), transparent 65%); pointer-events: none; }
.player.playing .halo { animation: haloSpin 14s linear infinite; }
@keyframes haloSpin { to { transform: translateX(-50%) rotate(360deg); } }
.disc { position: relative; width: 128px; height: 128px; border-radius: 50%;
  background: conic-gradient(from 0deg, var(--accent-soft), #EDEAFF, var(--accent-soft), #fff, var(--accent-soft));
  box-shadow: inset 0 0 0 6px rgba(255,255,255,.65), 0 12px 30px rgba(138,128,216,.30);
  display: grid; place-items: center; }
.player.playing .disc { animation: discSpin 8s linear infinite; }
@keyframes discSpin { to { transform: rotate(360deg); } }
.disc-core { width: 56px; height: 56px; border-radius: 50%; background: var(--accent); color: #fff;
  font-size: 22px; display: grid; place-items: center; box-shadow: 0 4px 12px rgba(138,128,216,.4); }
.p-info { text-align: center; }
.p-name { font-size: 17px; font-weight: 700; color: var(--text-primary); }
.p-meta { margin-top: 3px; font-size: 12px; color: var(--text-muted); }
.flute-tag { color: var(--magic); }
.p-progress { width: 100%; display: flex; align-items: center; gap: 10px; }
.p-progress .bar { flex: 1; height: 6px; border-radius: 10px; background: var(--track-bg); overflow: hidden; }
.p-progress .bar i { display: block; height: 100%; background: linear-gradient(90deg, var(--accent), #B9B1F2);
  border-radius: 10px; transition: width .4s linear; }
.p-time { font-size: 11px; color: var(--text-muted); white-space: nowrap; }
.p-controls { display: flex; align-items: center; gap: 22px; }
.ctl { width: 44px; height: 44px; border-radius: 50%; border: 1px solid var(--border-light);
  background: rgba(255,255,255,.55); display: grid; place-items: center; cursor: pointer; }
.ctl:disabled { opacity: .4; cursor: default; }
.ctl svg { width: 20px; height: 20px; fill: none; stroke: var(--text-primary); stroke-width: 1.8; }
.play { width: 64px; height: 64px; border-radius: 50%; border: 0; background: var(--accent); color: #fff;
  display: grid; place-items: center; cursor: pointer; box-shadow: 0 8px 20px rgba(138,128,216,.38);
  transition: transform .12s ease; }
.play:active { transform: scale(.94); }
.play svg { width: 26px; height: 26px; fill: #fff; }
.p-hint { margin: 0; font-size: 11px; color: var(--text-muted); }
/* 频谱条：仅播放中脉动，强化治愈沉浸感 */
.spectrum { position: absolute; left: 22px; bottom: 18px; display: flex; align-items: flex-end; gap: 4px; height: 22px; pointer-events: none; }
.spectrum i { width: 4px; height: 6px; border-radius: 3px; background: var(--accent); opacity: .45; }
.player.playing .spectrum i { animation: eqPulse 1s ease-in-out infinite; }
@keyframes eqPulse { 0%, 100% { height: 6px; opacity: .4; } 50% { height: 20px; opacity: .9; } }
/* 知音勋带（24h 里程碑达成后常驻展示） */
.zy-badge { display: inline-block; margin-left: 8px; padding: 1px 9px; border-radius: 999px;
  font-size: 11px; font-weight: 700; color: #fff; background: linear-gradient(135deg, var(--accent), var(--accent-soft));
  vertical-align: middle; box-shadow: 0 4px 12px rgba(138,128,216,.35); }

/* 奖励 toast */
.reward-toast { position: fixed; left: 50%; top: 18px; transform: translateX(-50%); z-index: var(--z-toast, 100);
  background: linear-gradient(135deg, var(--accent), var(--accent-soft)); color: #fff;
  padding: 10px 16px; border-radius: 16px; font-size: 12px; font-weight: 600;
  box-shadow: 0 10px 30px rgba(138,128,216,.4); white-space: nowrap; }
.fade-enter-active, .fade-leave-active { transition: opacity .25s ease, transform .25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateX(-50%) translateY(-6px); }

/* 区块头 */
.sec-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.c-title { font-size: 16px; font-weight: 700; color: var(--text-primary); }
.sec-tip { font-size: 12px; color: var(--text-muted); }

/* 曲库 */
.tabs { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; margin-bottom: 12px; -webkit-overflow-scrolling: touch; }
.tabs::-webkit-scrollbar { height: 0; }
.tab { flex: 0 0 auto; padding: 6px 14px; border-radius: 999px; border: 1px solid rgba(214,180,93,.35);
  background: rgba(255,255,255,.5); color: var(--text-muted); font-size: 13px; cursor: pointer; white-space: nowrap; transition: all .14s ease; }
.tab.active { color: var(--text-primary); background: rgba(255,255,255,.85); border-color: rgba(214,180,93,.6); font-weight: 600; }
.track-list { display: flex; flex-direction: column; gap: 10px; }
.track { display: flex; align-items: center; gap: 12px; padding: 11px 12px; border-radius: 16px;
  background: rgba(255,255,255,.45); border: 1px solid transparent; transition: border-color .14s ease; }
.track.current { border-color: var(--accent); }
.track.active { background: var(--growth-soft); }
.t-num { font-size: 16px; width: 34px; text-align: center; }
.t-play { width: 34px; height: 34px; border-radius: 12px; border: 0; background: var(--accent-soft);
  color: var(--accent); display: grid; place-items: center; cursor: pointer; flex: 0 0 auto; }
.t-play svg { width: 16px; height: 16px; fill: currentColor; }
.t-info { flex: 1; min-width: 0; }
.t-info b { display: block; font-size: 14px; color: var(--text-primary); }
.t-info span { font-size: 11px; color: var(--text-muted); }
.unlock { flex: 0 0 auto; border-radius: 12px; padding: 6px 12px; background: var(--accent); color: #fff;
  font-size: 12px; font-weight: 600; border: 0; cursor: pointer; }
.t-state { flex: 0 0 auto; font-size: 11px; color: var(--text-muted); }
.t-state.on { color: var(--growth); font-weight: 700; }
.t-lock { flex: 0 0 auto; font-size: 11px; color: #B8953F; font-weight: 600; }
.t-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 3px; }
.t-tags i { font-style: normal; font-size: 10px; color: var(--accent); background: rgba(214,180,93,.12); border-radius: 6px; padding: 1px 6px; }

/* 里程碑 */
.mile-list { display: flex; flex-direction: column; gap: 12px; }
.mile { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 16px;
  background: rgba(255,255,255,.45); }
.m-icon { width: 42px; height: 42px; border-radius: 14px; background: var(--growth-soft);
  display: grid; place-items: center; font-size: 20px; flex: 0 0 auto; }
.m-info { flex: 1; min-width: 0; }
.m-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.m-head b { font-size: 13px; color: var(--text-primary); }
.m-state { font-size: 11px; font-weight: 700; color: var(--text-muted); }
.m-state.ready { color: var(--accent); }
.m-state.claimed { color: var(--growth); }
.m-info p { margin: 2px 0 7px; font-size: 11px; color: var(--text-muted); }
.m-bar { height: 4px; border-radius: 10px; background: var(--track-bg); overflow: hidden; }
.m-bar i { display: block; height: 100%; background: linear-gradient(90deg, var(--growth), #9CD3B6);
  border-radius: 10px; }
.claim { flex: 0 0 auto; border-radius: 12px; padding: 7px 12px; background: var(--accent); color: #fff;
  font-size: 12px; font-weight: 600; border: 0; cursor: pointer; }
/* 里程碑庆祝卡（复用 Overlay 模态，强化获得感） */
.celebrate-card { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 8px 6px 4px; text-align: center; }
.cc-ic { width: 64px; height: 64px; border-radius: 20px; background: var(--growth-soft); display: grid; place-items: center; font-size: 30px; }
.cc-title { font-size: 16px; color: var(--text-primary); }
.cc-sub { margin: 0; font-size: 13px; color: var(--text-muted); }
.cc-ok { margin-top: 4px; border: 0; border-radius: 14px; padding: 9px 26px; background: var(--accent); color: #fff;
  font-size: 13px; font-weight: 700; cursor: pointer; }

/* 天籁指南内容（遮罩/面板/关闭按钮/动画由 Overlay 组件统一提供） */
.guide-card { display: flex; flex-direction: column; gap: 12px; }
.g-head b { font-size: 16px; font-weight: 700; color: var(--text-primary); }
.g-body { display: flex; flex-direction: column; gap: 10px; }
.g-item { display: flex; gap: 10px; align-items: flex-start; padding: 10px; border-radius: 14px;
  background: rgba(255,255,255,.5); }
.g-ic { width: 34px; height: 34px; border-radius: 11px; background: var(--accent-soft);
  display: grid; place-items: center; font-size: 16px; flex: 0 0 auto; }
.g-item b { display: block; font-size: 12.5px; color: var(--text-primary); }
.g-item p { margin: 2px 0 0; font-size: 11px; line-height: 1.5; color: var(--text-muted); }

/* 调试重播按钮（预览/开发可见；生产 v-if=false Tree-Shake 掉；右下角避开顶部 toast） */
.debug-replay-btn {
  position: fixed;
  right: 18px;
  bottom: calc(96px + env(safe-area-inset-bottom, 0px));
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 0;
  background: rgba(255,255,255,.72);
  backdrop-filter: blur(14px) saturate(1.4);
  -webkit-backdrop-filter: blur(14px) saturate(1.4);
  box-shadow: 0 6px 14px rgba(80,70,120,.16), 0 1px 0 rgba(255,255,255,.6) inset;
  color: #6C63AC;
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer;
  z-index: 35;
  -webkit-tap-highlight-color: transparent;
  transition: transform .18s cubic-bezier(.2,.8,.2,1), box-shadow .18s ease;
}
.debug-replay-btn:active {
  transform: scale(0.92);
  box-shadow: 0 3px 8px rgba(80,70,120,.18), 0 1px 0 rgba(255,255,255,.5) inset;
}
</style>
