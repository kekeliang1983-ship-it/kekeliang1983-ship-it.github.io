<!--
  src/components/DriftInboxModal.vue —— 漂流信箱（底部抽屉）
  设计要点：
   - 信箱是「海岸」不是「仓库」：未读漂上岸等你拾；读过留列表，手动「🌊归海」或「⭐珍藏」
   - 逐封点开才读（心境 +1），首次读按概率炸出喜悦奖励（元宝/魔丸/灵珠，不含天玑）
   - 珍藏的留在顶部「珍藏架」永久保存；归海的从信箱消失，只留「已拾起 N 只」的星痕
-->
<template>
  <Overlay :open="open" variant="sheet" @close="onClose">
    <div class="drift">
      <!-- ===== 标题 ===== -->
      <div class="d-head">
        <h3 class="d-title">漂流信箱</h3>
        <p class="d-sub">
          已放流 <b>{{ store.driftBottle.driftedOutTotal }}</b> · 捞起
          <b>{{ store.driftBottle.pickedTotal }}</b> · 已拾起
          <b>{{ picked }}</b> · 珍藏 <b>{{ favCount }}</b>
        </p>
      </div>

      <!-- ===== 信箱列表 ===== -->
      <div class="d-list" v-if="messages.length">
        <article
          v-for="m in messages"
          :key="m.id"
          class="d-msg"
          :class="{ self: m.self, unread: !m.read, fav: m.favorite, open: expandedId === m.id }"
          @click="onMsgClick(m)"
        >
          <span class="d-dot" :style="{ background: meta(m.emotion).color }"></span>
          <div class="d-body">
            <div class="d-meta">
              <span class="d-tag" :style="{ color: meta(m.emotion).color }">
                {{ meta(m.emotion).emoji }} {{ meta(m.emotion).label }}
              </span>
              <span class="d-from">{{ m.self ? '你放流的' : (m.fromCloud ? '🌍 来自远方的暖语' : '陌生人的暖语') }}</span>
              <span class="d-time">{{ fmtTime(m.ts) }}</span>
              <span v-if="!m.read" class="d-unread-dot"></span>
              <span v-else-if="m.favorite" class="d-fav">⭐</span>
            </div>
            <p class="d-text">{{ m.text }}</p>

            <!-- 读信掉落奖励徽标 -->
            <div class="d-reward" v-if="m.reward && m.reward.length">
              <span
                v-for="r in m.reward"
                :key="r.kind"
                class="d-chip"
                :style="{ color: REWARD_META[r.kind].color }"
              >
                {{ REWARD_META[r.kind].emoji }} +{{ r.amount }} {{ REWARD_META[r.kind].label }}
              </span>
            </div>

            <!-- 展开后的操作 -->
            <div class="d-actions" v-if="expandedId === m.id">
              <button
                class="da-btn"
                :class="{ on: m.favorite }"
                v-feedback="'BUTTON_CLICK'"
                @click.stop="toggleFav(m)"
              >
                {{ m.favorite ? '⭐ 已珍藏' : '⭐ 珍藏这只' }}
              </button>
              <button class="da-btn sea" v-feedback="'BUTTON_CLICK'" @click.stop="toArchive(m)">
                🌊 让它归海
              </button>
            </div>

            <!-- 读信喜悦炸裂动效（锚定在展开卡片上） -->
            <div class="burst" v-if="expandedId === m.id && burst && burst.rewards.length" :key="burst.key">
              <span class="burst-glow"></span>
              <span v-for="i in 14" :key="i" class="burst-spark" :style="sparkStyle(i)"></span>
              <div class="burst-rewards">
                <div
                  v-for="r in burst.rewards"
                  :key="r.kind"
                  class="burst-chip"
                  :style="{ '--c': REWARD_META[r.kind].color }"
                >
                  <span class="bc-emoji">{{ REWARD_META[r.kind].emoji }}</span>
                  <span class="bc-amt">+{{ r.amount }} {{ REWARD_META[r.kind].label }}</span>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>

      <!-- ===== 空态 ===== -->
      <div class="d-empty" v-else>
        <span class="de-ic">🌊</span>
        <p class="de-title">信箱还空着</p>
        <p class="de-tip">
          每天可以去「情绪瓶」放流一只写满心事的漂流瓶，<br />
          也能捞起一只陌生人留下的暖语，让它漂进这里。
        </p>
        <button class="de-go" v-feedback="'BUTTON_CLICK'" @click="goBottle">
          去情绪瓶 →
        </button>
      </div>
    </div>
  </Overlay>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import Overlay from '@/components/common/Overlay.vue';
import { useModulesStore } from '@/stores/index';
import { type DriftReward } from '@/constants/drift';
import type { EmotionType, IDriftMessage } from '@/types/index';
import { audio } from '@/core/feedback';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const store = useModulesStore();
const router = useRouter();

/** 奖励展示元信息（来自后台 bottle.json，改色/改名即时生效） */
const REWARD_META = computed(() => store.bottleConfig.drift.rewardMeta);

/** 珍藏架置顶，其余按原顺序 */
const messages = computed(() =>
  [...store.driftBottle.inbox].sort((a, b) => Number(!!b.favorite) - Number(!!a.favorite)),
);
const picked = computed(
  () => store.driftBottle.archiveCount + store.driftBottle.inbox.filter((m) => m.read).length,
);
const favCount = computed(() => store.driftFavorites.length);

const expandedId = ref<string | null>(null);
const burst = ref<{ key: number; rewards: DriftReward[] } | null>(null);
let burstTimer = 0;

function meta(t: EmotionType) { return store.bottleEmotionMap[t] ?? { color: '#999', emoji: '❔', label: '' }; }

function fmtTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (d.toDateString() === now.toDateString()) return hm;
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return `昨天 ${hm}`;
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 点开单条：未读→首读(心境+1, 可能炸奖励)并展开；已读→切换展开 */
function onMsgClick(m: IDriftMessage) {
  if (!m.read) {
    const res = store.readDriftLetter(m.id);
    expandedId.value = m.id;
    if (res.firstRead) {
      audio.play('soft');
      if (res.reward.length) triggerBurst(res.reward);
    }
  } else {
    expandedId.value = expandedId.value === m.id ? null : m.id;
  }
}

function triggerBurst(rewards: DriftReward[]) {
  clearTimeout(burstTimer);
  burst.value = { key: Date.now(), rewards };
  audio.play('coin');
  burstTimer = window.setTimeout(() => (burst.value = null), 1700);
}

function sparkStyle(i: number): Record<string, string> {
  const angle = (i / 14) * 360 + (i % 2 ? 9 : 0);
  const dist = 46 + (i % 3) * 16;
  return { '--a': `${angle}deg`, '--d': `${dist}px` };
}

function toggleFav(m: IDriftMessage) {
  store.favoriteDrift(m.id);
  audio.play('soft');
}

function toArchive(m: IDriftMessage) {
  store.archiveDrift(m.id);
  if (expandedId.value === m.id) expandedId.value = null;
  audio.play('soft');
}

function goBottle() {
  emit('close');
  router.push('/app/bottle');
}

function onClose() {
  emit('close');
}
</script>

<style scoped>
.drift { padding: 4px 0 2px; }

/* ===== 标题 ===== */
.d-head { text-align: center; margin-bottom: 14px; }
.d-title {
  margin: 0; font-size: 19px; font-weight: 800; color: var(--text-primary); letter-spacing: 1px;
}
.d-sub { margin: 5px 0 0; font-size: 12px; color: var(--text-muted); }
.d-sub b { color: var(--accent); font-weight: 700; }

/* ===== 列表 ===== */
.d-list {
  display: flex; flex-direction: column; gap: 10px;
  max-height: 56vh; overflow-y: auto;
  padding: 2px;
}
.d-msg {
  position: relative;
  display: flex; gap: 10px; align-items: flex-start;
  padding: 12px; border-radius: 16px;
  background: rgba(255, 255, 255, .5);
  border: 1px solid var(--border-light);
  cursor: pointer; transition: background .2s ease, transform .12s ease, box-shadow .2s ease;
}
.d-msg:active { transform: scale(.99); }
.d-msg.self { background: rgba(138, 128, 216, .07); }
.d-msg.unread { box-shadow: 0 0 0 2px rgba(232, 184, 75, .35); }
.d-msg.fav { background: rgba(232, 184, 75, .08); }
.d-msg.open { box-shadow: 0 8px 26px rgba(138, 128, 216, .18); }
.d-dot {
  width: 10px; height: 10px; border-radius: 50%; margin-top: 5px; flex: 0 0 auto;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, .6);
}
.d-body { flex: 1; min-width: 0; }
.d-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.d-tag { font-size: 12px; font-weight: 700; }
.d-from { font-size: 11px; color: var(--text-secondary); }
.d-time { margin-left: auto; font-size: 10.5px; color: var(--text-muted); }
.d-unread-dot { width: 7px; height: 7px; border-radius: 50%; background: #E8B84B; flex: 0 0 auto; }
.d-fav { margin-left: 2px; font-size: 12px; }
.d-text {
  margin: 0; font-size: 13px; line-height: 1.6; color: var(--text-primary);
  letter-spacing: .3px; word-break: break-word;
}

/* 读信掉落徽标 */
.d-reward { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.d-chip {
  font-size: 11.5px; font-weight: 800; padding: 3px 9px; border-radius: 12px;
  background: rgba(255, 255, 255, .7); box-shadow: 0 2px 6px rgba(0, 0, 0, .06);
}

/* 展开操作 */
.d-actions { display: flex; gap: 8px; margin-top: 10px; }
.da-btn {
  flex: 1; padding: 9px 0; border: 1px solid var(--border-light); border-radius: 14px;
  background: rgba(255, 255, 255, .6); color: var(--text-primary);
  font-size: 12.5px; font-weight: 700; cursor: pointer; transition: all .15s ease;
}
.da-btn:active { transform: scale(.97); }
.da-btn.on { background: rgba(232, 184, 75, .16); border-color: rgba(232, 184, 75, .5); }
.da-btn.sea {
  background: linear-gradient(135deg, #8fd0e8 0%, #6db8d8 100%);
  color: #fff; border-color: transparent;
}

/* ===== 读信喜悦炸裂 ===== */
.burst {
  position: absolute; left: 50%; top: 46%;
  width: 0; height: 0; pointer-events: none; z-index: 5;
}
.burst-glow {
  position: absolute; left: 0; top: 0; width: 130px; height: 130px;
  margin: -65px 0 0 -65px; border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 233, 168, .95), rgba(255, 233, 168, 0) 70%);
  animation: bGlow .8s ease-out forwards;
}
.burst-spark {
  position: absolute; left: 0; top: 0; width: 7px; height: 7px; border-radius: 50%;
  background: radial-gradient(circle, #fff 0%, #FFE9A8 60%, rgba(255, 233, 168, 0) 100%);
  transform: translate(-50%, -50%);
  animation: bSpark .9s ease-out forwards;
}
.burst-rewards {
  position: absolute; left: 0; top: 0; transform: translate(-50%, -50%);
  display: flex; gap: 10px;
}
.burst-chip {
  display: flex; align-items: center; gap: 4px; padding: 6px 12px; border-radius: 14px;
  background: rgba(255, 255, 255, .94); box-shadow: 0 6px 16px rgba(0, 0, 0, .14);
  color: var(--c); font-weight: 800; font-size: 14px;
  animation: bChip 1.4s cubic-bezier(.2, 1.2, .4, 1) forwards;
}
.bc-emoji { font-size: 18px; }
@keyframes bGlow { from { opacity: .9; transform: scale(.4); } to { opacity: 0; transform: scale(1.5); } }
@keyframes bSpark {
  0% { opacity: 0; transform: translate(-50%, -50%) rotate(var(--a)) translateY(0) scale(.4); }
  20% { opacity: 1; }
  100% { opacity: 0; transform: translate(-50%, -50%) rotate(var(--a)) translateY(calc(var(--d) * -1)) scale(1); }
}
@keyframes bChip {
  0% { opacity: 0; transform: translateY(8px) scale(.5); }
  25% { opacity: 1; transform: translateY(-6px) scale(1); }
  100% { opacity: 0; transform: translateY(-36px) scale(1); }
}

/* ===== 空态 ===== */
.d-empty {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 26px 18px 30px; text-align: center;
}
.de-ic { font-size: 40px; animation: bob 3s ease-in-out infinite; }
.de-title { margin: 4px 0 0; font-size: 15px; font-weight: 700; color: var(--text-primary); }
.de-tip { margin: 0; font-size: 12px; line-height: 1.7; color: var(--text-muted); }
.de-go {
  margin-top: 8px; padding: 10px 22px; border: 0; border-radius: 16px; cursor: pointer;
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-soft) 100%);
  color: #fff; font-size: 13px; font-weight: 700; letter-spacing: .5px;
  box-shadow: 0 6px 18px rgba(138, 128, 216, .3);
}
.de-go:active { transform: scale(.97); }

@keyframes bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
</style>
