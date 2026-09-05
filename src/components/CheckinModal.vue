<!--
  src/components/CheckinModal.vue —— 七日灵签（签到面板）
  设计要点：
   - 底部抽屉（Overlay variant="sheet"）：7 格横排需要整宽，居中弹窗 340px 放不下
   - 格子三态：已领(灰+✓) / 今日可领(品牌紫脉冲) / 未解锁(暗)
   - 本轮满 7 天后：全部置灰，Day1 高亮脉冲表示「新一轮待启」
   - 补签仅在「确实漏签」时出现（canMakeup getter 判定），避免常态占位制造焦虑
   - 签到后展示签文 + 奖励飞入 + 里程碑庆祝，给足仪式感（决定明天还来不来）
   - 全程无 alert，失败原因走内联文案
-->
<template>
  <Overlay :open="open" variant="sheet" @close="onClose">
    <div class="ck">
      <!-- ===== 标题 ===== -->
      <div class="ck-head">
        <h3 class="ck-title">七日灵签</h3>
        <p class="ck-sub">
          连续签到，灵缘日厚 · 已累计
          <b>{{ store.totalDays }}</b> 天
        </p>
      </div>

      <!-- ===== 7 格进度 ===== -->
      <div class="ck-days">
        <div
          v-for="d in modules.checkinConfig.days"
          :key="d.day"
          class="ck-day"
          :class="dayClass(d.day)"
        >
          <span class="cd-day">{{ d.day }}</span>
          <div class="cd-rewards">
            <div v-for="(e, i) in entries(d.reward)" :key="e.key" class="cd-r" :class="{ sub: i > 0 }">
              <span class="cd-emoji">{{ e.emoji }}</span>
              <span class="cd-amt">{{ e.amount }}</span>
            </div>
          </div>
          <span v-if="dayClass(d.day) === 'claimed'" class="cd-check">✓</span>
        </div>
      </div>

      <!-- ===== 累计里程碑（永不重置的长线进度） ===== -->
      <div class="ck-mile">
        <div class="cm-top">
          <span class="cm-label">
            <template v-if="nextMs">
              再签 <b>{{ nextMs.days - store.totalDays }}</b> 天解锁
              <span class="cm-emoji">{{ nextMs.emoji }}</span>{{ nextMs.title }}
            </template>
            <template v-else>全部里程碑已达成 ✦</template>
          </span>
          <span class="cm-num">{{ store.totalDays }}<s v-if="nextMs">/{{ nextMs.days }}</s></span>
        </div>
        <div class="cm-bar">
          <i :style="{ width: store.milestoneProgress + '%' }"></i>
        </div>
      </div>

      <!-- ===== 补签（仅漏签时出现） ===== -->
      <button
        v-if="store.canMakeup && !result"
        class="ck-makeup"
        v-feedback="'BUTTON_CLICK'"
        @click="onMakeup"
      >
        补签昨天 · 只花 {{ modules.checkinConfig.makeupCost }} 元宝，连签不断
      </button>

      <!-- ===== 签到结果（仪式感） ===== -->
      <transition name="ck-pop">
        <div v-if="result" class="ck-result" :class="{ 'has-mile': !!result.milestone }">
          <div class="cr-glow"></div>
          <div class="cr-items">
            <div v-for="(e, i) in entries(result.reward)" :key="e.key" class="cr-item" :style="{ animationDelay: i * 90 + 'ms' }">
              <span class="cr-emoji">{{ e.emoji }}</span>
              <b class="cr-amt">+{{ e.amount }}</b>
            </div>
          </div>
          <p class="cr-quote">{{ result.quote }}</p>
          <div v-if="result.milestone" class="cr-mile">
            <span class="crm-emoji">{{ result.milestone.emoji }}</span>
            <div class="crm-txt">
              <b>里程碑达成 · {{ result.milestone.title }}</b>
              <s>{{ milestoneText(result.milestone) }}</s>
            </div>
          </div>
        </div>
      </transition>

      <!-- ===== 主按钮 ===== -->
      <button
        class="ck-btn"
        :class="{ done: store.isCheckedInToday }"
        :disabled="store.isCheckedInToday"
        v-feedback="store.isCheckedInToday ? '' : 'BUTTON_CLICK'"
        @click="onCheckin"
      >
        <template v-if="result">收下灵签</template>
        <template v-else-if="store.isCheckedInToday">今日已签 · 明日再来</template>
        <template v-else>签到 · 领取第 {{ store.todayDay }} 天</template>
      </button>

      <p v-if="errMsg" class="ck-err">{{ errMsg }}</p>
    </div>
  </Overlay>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import Overlay from '@/components/common/Overlay.vue';
import { useCheckinStore, type CheckinResult } from '@/stores/useCheckinStore';
import { useModulesStore } from '@/stores/useModulesStore';
import type { CheckinReward, CheckinMilestone } from '@/constants/checkin';
import { audio } from '@/core/feedback';

defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const store = useCheckinStore();
const modules = useModulesStore();
const result = ref<CheckinResult | null>(null);
const errMsg = ref('');

const nextMs = computed(() => store.nextMilestone);

/* ---------- 奖励展示：按固定币种顺序展开，最多两行（主 + 副） ---------- */
const ORDER = ['gold', 'pearl', 'magic', 'jade'] as const;
const EMOJI: Record<(typeof ORDER)[number], string> = {
  gold: '🪙', pearl: '🔮', magic: '⚡', jade: '⭐',
};

function entries(r: CheckinReward) {
  return ORDER
    .filter((k) => (r[k] || 0) > 0)
    .map((k) => ({ key: k, emoji: EMOJI[k], amount: r[k] as number }));
}

function milestoneText(m: CheckinMilestone) {
  return entries(m.reward).map((e) => `${e.emoji}+${e.amount}`).join('  ');
}

/* ---------- 格子三态 ---------- */
function dayClass(day: number): 'claimed' | 'active' | 'locked' {
  const s = store.streak;
  if (s >= 7) return day === 1 ? 'active' : 'claimed'; // 本轮已满 → Day1 表示新一轮待启
  if (day <= s) return 'claimed';
  if (day === s + 1) return 'active';
  return 'locked';
}

/* ---------- 交互 ---------- */
function onCheckin() {
  if (result.value) { onClose(); return; } // 结果态：点「收下灵签」直接关闭
  errMsg.value = '';
  store.ensureDailyReset();
  const r = store.checkin();
  if (!r) return;
  result.value = r;
  audio.play(r.milestone ? 'success' : 'coin');
}

function onMakeup() {
  errMsg.value = '';
  store.ensureDailyReset();
  const r = store.makeup();
  if (!r.ok) {
    errMsg.value = {
      checkedIn: '今日已签到，无需补签',
      used: '每自然日仅可补签 1 次',
      none: '还没有签到记录，无需补签',
      noGold: `元宝不足 ${modules.checkinConfig.makeupCost}，无法补签`,
    }[r.reason];
    return;
  }
  audio.play('coin');
}

function onClose() {
  result.value = null;
  errMsg.value = '';
  emit('close');
}
</script>

<style scoped>
.ck { padding: 4px 0 2px; }

/* ===== 标题 ===== */
.ck-head { text-align: center; margin-bottom: 16px; }
.ck-title {
  margin: 0;
  font-size: 19px; font-weight: 800; color: var(--text-primary);
  letter-spacing: 1px;
}
.ck-sub { margin: 5px 0 0; font-size: 12px; color: var(--text-muted); }
.ck-sub b { color: var(--accent); font-weight: 700; }

/* ===== 7 格 ===== */
.ck-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  margin-bottom: 16px;
}
.ck-day {
  position: relative;
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  padding: 9px 2px 8px;
  border-radius: 14px;
  border: 1px solid var(--border-light);
  background: rgba(255, 255, 255, .34);
  transition: all .25s ease;
}
.cd-day { font-size: 10px; color: var(--text-muted); font-weight: 700; }
.cd-rewards { display: flex; flex-direction: column; align-items: center; gap: 1px; }
.cd-r { display: flex; flex-direction: column; align-items: center; line-height: 1.1; }
.cd-emoji { font-size: 15px; }
.cd-amt { font-size: 11px; font-weight: 800; color: var(--text-primary); }
.cd-r.sub { opacity: .85; }
.cd-r.sub .cd-emoji { font-size: 10px; }
.cd-r.sub .cd-amt { font-size: 9px; color: var(--text-secondary); }
.cd-check {
  position: absolute; top: 3px; right: 5px;
  font-size: 9px; color: var(--growth); font-weight: 800;
}

/* 今日可领：品牌紫脉冲（视觉钩子，产生「未完成」的轻度牵挂） */
.ck-day.active {
  background: rgba(138, 128, 216, .14);
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(138, 128, 216, .12);
  animation: ckPulse 1.8s ease-in-out infinite;
}
.ck-day.active .cd-amt { color: var(--accent); }
@keyframes ckPulse {
  0%, 100% { box-shadow: 0 0 0 3px rgba(138, 128, 216, .12); }
  50%      { box-shadow: 0 0 0 6px rgba(138, 128, 216, .06); }
}
/* 已领 */
.ck-day.claimed { background: rgba(127, 184, 154, .1); border-color: rgba(127, 184, 154, .3); }
.ck-day.claimed .cd-emoji { opacity: .5; filter: grayscale(.6); }
.ck-day.claimed .cd-amt { color: var(--text-muted); }
/* 未解锁 */
.ck-day.locked { opacity: .5; }

/* ===== 里程碑 ===== */
.ck-mile { margin-bottom: 14px; }
.cm-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.cm-label { font-size: 11.5px; color: var(--text-secondary); }
.cm-label b { color: var(--accent-gold); font-weight: 800; }
.cm-emoji { margin: 0 2px; }
.cm-num { font-size: 11px; color: var(--text-muted); font-weight: 700; }
.cm-num s { text-decoration: none; }
.cm-bar { height: 6px; border-radius: 999px; background: var(--track-bg); overflow: hidden; }
.cm-bar i {
  display: block; height: 100%; border-radius: 999px;
  background: linear-gradient(90deg, var(--accent) 0%, var(--accent-gold) 100%);
  transition: width .5s cubic-bezier(.25, .46, .45, .94);
}

/* ===== 补签 ===== */
.ck-makeup {
  width: 100%; margin-bottom: 10px; padding: 10px;
  border-radius: 14px;
  border: 1px dashed var(--accent-soft);
  background: rgba(138, 128, 216, .06);
  color: var(--accent);
  font-size: 12.5px; font-weight: 700;
  cursor: pointer;
  transition: all .2s ease;
}
.ck-makeup:active { transform: scale(.98); opacity: .8; }

/* ===== 结果 ===== */
.ck-result {
  position: relative;
  overflow: hidden;
  margin-bottom: 12px; padding: 16px 12px 14px;
  border-radius: 16px;
  background: linear-gradient(160deg, rgba(138, 128, 216, .12), rgba(214, 180, 93, .1));
  border: 1px solid var(--border-light);
  text-align: center;
}
.cr-glow {
  position: absolute; top: -40px; left: 50%; transform: translateX(-50%);
  width: 160px; height: 160px; border-radius: 50%;
  background: radial-gradient(circle, rgba(214, 180, 93, .28), transparent 70%);
  animation: crGlow 1.4s ease-out infinite alternate;
}
@keyframes crGlow { from { opacity: .4; transform: translateX(-50%) scale(.85); } to { opacity: .9; transform: translateX(-50%) scale(1.1); } }
.cr-items { position: relative; display: flex; justify-content: center; gap: 18px; margin-bottom: 8px; }
.cr-item {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  animation: crPop .5s cubic-bezier(.34, 1.56, .64, 1) backwards;
}
@keyframes crPop {
  from { opacity: 0; transform: translateY(14px) scale(.6); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.cr-emoji { font-size: 30px; filter: drop-shadow(0 3px 6px rgba(0, 0, 0, .12)); }
.cr-amt { font-size: 15px; font-weight: 900; color: var(--accent); }
.cr-quote {
  position: relative;
  margin: 0; font-size: 12.5px; color: var(--text-secondary);
  letter-spacing: .5px;
}
.cr-mile {
  position: relative;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  margin-top: 12px; padding-top: 10px;
  border-top: 1px dashed rgba(214, 180, 93, .45);
  animation: crPop .5s .2s cubic-bezier(.34, 1.56, .64, 1) backwards;
}
.crm-emoji { font-size: 22px; }
.crm-txt { text-align: left; }
.crm-txt b { display: block; font-size: 12.5px; color: var(--accent-gold); font-weight: 800; }
.crm-txt s { display: block; font-size: 11px; color: var(--text-muted); text-decoration: none; }
.ck-pop-enter-active { transition: all .32s cubic-bezier(.34, 1.56, .64, 1); }
.ck-pop-enter-from { opacity: 0; transform: translateY(16px) scale(.94); }

/* ===== 主按钮 ===== */
.ck-btn {
  width: 100%; padding: 14px;
  border: 0; border-radius: 16px;
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-soft) 100%);
  color: #fff;
  font-size: 15px; font-weight: 800; letter-spacing: 1px;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(138, 128, 216, .32);
  transition: transform .14s ease, opacity .14s ease;
}
.ck-btn:active { transform: scale(.98); opacity: .9; }
.ck-btn.done {
  background: var(--track-bg);
  color: var(--text-muted);
  box-shadow: none;
  cursor: default;
}

.ck-err { margin: 8px 0 0; text-align: center; font-size: 11.5px; color: var(--magic); }
</style>
