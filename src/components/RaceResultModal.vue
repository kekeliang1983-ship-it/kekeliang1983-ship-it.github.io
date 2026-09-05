<!--
  src/components/RaceResultModal.vue —— 仙宠竞速结算卡
  展示名次（奖牌/殿后）、奖励、逆袭彩头；末名给「安慰礼」彩蛋（宠物叼花/文案），输了也被温柔接住。
  禁用 alert，复用玻璃卡。
-->
<template>
  <Overlay variant="modal" :open="open" @close="onClose">
    <div class="result">
      <!-- 名次主视觉 -->
      <div class="r-medal" :class="rankClass">
        <span class="rm-emoji">{{ rankEmoji }}</span>
        <div class="rm-rank">
          <b>第 {{ result?.rank }} 名</b>
          <s>{{ rankLabel }}</s>
        </div>
      </div>

      <h3 class="r-title">{{ rankTitle }}</h3>

      <!-- 奖励 -->
      <div class="r-rewards" v-if="result?.gold || result?.pearl">
        <div class="r-r" v-if="result?.gold"><span class="rr-emoji">🪙</span><b>+{{ result?.gold }}</b><s>元宝</s></div>
        <div class="r-r" v-if="result?.pearl"><span class="rr-emoji">🔮</span><b>+{{ result?.pearl }}</b><s>灵珠</s></div>
      </div>
      <p class="r-noreward" v-else>这次没有货币奖励，但有别的小惊喜 ✦</p>

      <!-- 逆袭彩头 -->
      <div class="r-upset" v-if="result?.upset">
        🌟 逆袭彩头！实际第 {{ result?.rank }} 名，比预期（第 {{ result?.expectedRank }} 名）还靠前，额外 +{{ UPSET_GOLD }} 元宝
      </div>

      <!-- 末名安慰礼 -->
      <div class="r-comfort" v-if="result?.comfort">
        <span class="rc-emoji">🌸</span>
        <p>「{{ comfortLine }}」</p>
      </div>

      <!-- 连胜 / 周积分 -->
      <div class="r-meta" v-if="result">
        <span class="rm-chip" v-if="(result?.winStreak ?? 0) >= 2">🔥 {{ result?.winStreak }} 连胜</span>
        <span class="rm-chip" v-if="(result?.streakBonus ?? 0) > 0">+{{ Math.round((result?.streakBonus ?? 0) * 100) }}% 连胜奖励</span>
        <span class="rm-chip">⭐ 周积分 {{ result?.weeklyPoints }}</span>
      </div>

      <!-- 新解锁称号 -->
      <div class="r-titles" v-if="(result?.newTitles?.length ?? 0) > 0">
        🎖️ 解锁新称号：
        <span class="rt" v-for="t in (result?.newTitles ?? [])" :key="t">{{ titleName(t) }}</span>
      </div>

      <div class="r-actions">
        <button class="r-again" v-feedback="'BUTTON_CLICK'" @click="onAgain">再来一局</button>
        <button class="r-ok" v-feedback="'BUTTON_CLICK'" @click="onClose">收下</button>
      </div>
    </div>
  </Overlay>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Overlay from '@/components/common/Overlay.vue';
import { useModulesStore } from '@/stores/useModulesStore';
import type { RaceResult } from '@/stores/useRaceStore';

const props = defineProps<{ open: boolean; result: RaceResult | null }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'again'): void }>();

const modules = useModulesStore();
const UPSET_GOLD = computed(() => modules.raceConfig.upsetBonus.gold);
const comfortLine = computed(() => (props.result?.comfort ? modules.raceComfortLine() : ''));

const rankEmoji = computed(() => {
  const r = props.result?.rank ?? 0;
  return ({ 1: '🥇', 2: '🥈', 3: '🥉', 4: '🎖️', 5: '🌟', 6: '🌸' } as Record<number, string>)[r] ?? '🌟';
});
const rankClass = computed(() => `rank-${props.result?.rank ?? 0}`);
const rankLabel = computed(() => {
  const r = props.result?.rank ?? 0;
  return ({ 1: '拔得头筹', 2: '紧随其后', 3: '稳稳完赛', 4: '中游之列', 5: '惜败一步', 6: '殿后也有礼' } as Record<number, string>)[r] ?? '';
});
const rankTitle = computed(() => {
  const r = props.result?.rank ?? 0;
  if (r === 1) return '它冲线了！第一名 🎉';
  if (r <= 3) return '不错不错，站上领奖台啦';
  if (r === 6) return '没关系，下次一定行';
  return '完赛！带着奖励回家';
});

function onClose() { emit('close'); }
function onAgain() { emit('again'); }
function titleName(id: string): string {
  const def = modules.raceConfig; // 标题名由 store 常量定义，这里仅做兜底展示
  const map: Record<string, string> = {
    first_win: '🌟初露锋芒', streak3: '🔥三连胜王', streak5: '👑五连胜王',
    hundred: '🛡️百战萌将', veteran: '🏆常胜将军', weekly_star: '✨周榜新星',
  };
  return map[id] ?? id;
}
</script>

<style scoped>
.result { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 22px 18px; }
.r-medal { display: flex; align-items: center; gap: 12px; padding: 12px 18px; border-radius: 18px; }
.rm-emoji { font-size: 38px; filter: drop-shadow(0 4px 8px rgba(80,70,120,.25)); }
.rm-rank { display: flex; flex-direction: column; }
.rm-rank b { font-size: 20px; font-weight: 800; color: var(--text-primary); }
.rm-rank s { font-size: 11.5px; color: var(--text-muted); text-decoration: none; margin-top: 2px; }
.rank-1 { background: linear-gradient(135deg, #FBEFD8, #FFF6E2); }
.rank-2 { background: linear-gradient(135deg, #ECEAF6, #F4F2FB); }
.rank-3 { background: linear-gradient(135deg, #F6E9DC, #FBF1E7); }
.rank-6 { background: linear-gradient(135deg, rgba(138,128,216,.12), rgba(138,128,216,.05)); }

.r-title { margin: 0; font-size: 16px; font-weight: 700; color: var(--text-primary); }
.r-rewards { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
.r-r { display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 64px; padding: 12px 10px; border-radius: 14px; background: var(--bg-card-strong); border: 1px solid var(--border-light); }
.r-r b { font-size: 16px; font-weight: 800; color: var(--text-primary); }
.rr-emoji { font-size: 22px; }
.r-r s { font-size: 10.5px; color: var(--text-muted); text-decoration: none; }
.r-noreward { margin: 0; font-size: 12.5px; color: var(--text-muted); }

.r-upset { font-size: 12px; font-weight: 600; color: #B8862D; background: #FBEFD8; border: 1px solid rgba(184,134,45,.25); padding: 8px 12px; border-radius: 12px; text-align: center; line-height: 1.6; }

.r-comfort { display: flex; gap: 10px; align-items: flex-start; background: rgba(138,128,216,.06); border: 1px solid rgba(138,128,216,.18); border-radius: 14px; padding: 12px; }
.rc-emoji { font-size: 22px; flex: 0 0 auto; }
.r-comfort p { margin: 0; font-size: 13px; line-height: 1.7; color: var(--text-primary); font-style: italic; }

.r-meta { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
.rm-chip { font-size: 11.5px; font-weight: 700; color: #E0913A; background: rgba(224,145,58,.12); padding: 3px 9px; border-radius: 999px; }
.r-titles { font-size: 12.5px; font-weight: 600; color: var(--text-secondary); text-align: center; line-height: 1.8; }
.rt { margin: 0 4px; color: #B8862D; font-weight: 800; }

.r-actions { display: flex; gap: 10px; width: 100%; margin-top: 4px; }
.r-again, .r-ok {
  flex: 1; padding: 13px; border: 0; border-radius: 16px; cursor: pointer; font-size: 14px; font-weight: 700;
  transition: transform .14s cubic-bezier(.25,.46,.45,.94);
}
.r-again { background: var(--bg-card-strong); color: var(--text-primary); border: 1px solid var(--border-light); }
.r-ok { background: linear-gradient(135deg, var(--accent), var(--accent-soft)); color: #fff; box-shadow: 0 10px 22px rgba(138,128,216,.3); }
.r-again:active, .r-ok:active { transform: scale(.97); }
</style>
