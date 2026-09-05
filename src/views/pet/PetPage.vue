<!--
  src/views/pet/PetPage.vue —— 仙宠（宠物与旅行）主页面
  版式：2026-08-25 参考图版式复刻（原 PetPrototype 验证通过后并入）
    · 顶部标题 + 右上 CornerButton（粮袋补给/图鉴，与 4 宫格入口零重叠）
    · 主卡左信息（可编辑名字/心情chip/饱食愉悦双条）右形象（五行光晕+浮动动画）
    · 4 宫格功能入口（喂食/互动/旅行/见闻，全部接真实机制，无空壳）
    · 今日成长（每日三件事，store 持久化，跨天重置，全完成 +30 元宝）
    · 仙宠图鉴（5 只五行收集，2 天玑解锁，切换陪伴）
  机制对齐：01-全局规则 模块6 / 02-全局核心常量 六、仙宠数值表 / 05-核心代码 IPet
  2026-08-25 拍板：精粮缩时20%；灵动(饱食+愉悦>80)旅行奖励+10%；食物背包库存；见闻历史(上限20条)
  keepAlive：切走停表（省电），切回按真实流逝时间补齐旅行/衰减结算
-->
<template>
  <div class="pet-page">

    <!-- ============ 顶部：标题 + 右上操作 ============ -->
    <header class="topbar">
      <div class="brand">
        <h1>仙宠</h1>
        <p>{{ subtitle }}</p>
      </div>
      <div class="actions">
        <CornerButton label="粮袋" @click="openSheet('bag')">
          <svg viewBox="0 0 24 24"><path d="M6 8h12l1.2 10.2a2 2 0 0 1-2 2.2H6.8a2 2 0 0 1-2-2.2L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>
        </CornerButton>
        <CornerButton label="图鉴" @click="goCollection">
          <svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>
        </CornerButton>
      </div>
    </header>

    <!-- ============ 主卡：左信息 / 右形象 ============ -->
    <section class="card-glass pet-main">
      <!-- 左：信息卡 -->
      <div class="pet-info">
        <div class="name-row">
          <div class="name-block" v-feedback="'BUTTON_CLICK'" @click="openPetName">
            <div class="name-main">{{ petMainName }}<span class="name-edit">✎</span></div>
            <div class="name-sub">{{ petNickname }}</div>
          </div>
          <span class="mood-chip" :class="moodClass"><b>{{ moodEmoji }}</b>{{ moodLabel }}</span>
        </div>

        <div class="kv-row joy">
          <span class="kv-label">愉悦</span>
          <div class="bar joy-bar"><i :style="{ width: Math.round(liveHappiness) + '%' }"></i></div>
          <b class="kv-val">{{ Math.round(liveHappiness) }}</b>
        </div>
        <div class="kv-row hunger">
          <span class="kv-label">饱食</span>
          <div class="bar hunger-bar"><i :style="{ width: Math.round(liveHunger) + '%' }"></i></div>
          <b class="kv-val">{{ Math.round(liveHunger) }}</b>
        </div>

        <p class="status-desc">{{ statusDesc }}</p>
      </div>

      <!-- 右：宠物形象展示区 -->
      <div class="pet-stage" :class="pet.type">
        <div class="stage-glow" :class="pet.type"></div>
        <div class="pet-figure" :class="[pet.type, { float: lively, hungry: isHungry, low: moodClass === 'low' }]">
          <img v-if="petImg && imgOk" :src="petImg" alt="仙宠" @error="imgOk = false" />
          <span v-else class="fallback">{{ petMeta.emoji }}</span>
          <!-- 三档情绪表情（愉悦≥70开心 / 40-69平静 / <40低落；图形素材到位后由图片承接） -->
          <span class="mood-face" :key="moodClass" :class="moodClass">{{ moodEmoji }}</span>
        </div>
        <span class="hungry-tag" v-if="isHungry">饿了</span>
        <!-- 互动飘出的爱心粒子：纯视觉反馈，强化「被回应」的治愈感 -->
        <transition-group name="heart-pop" tag="div" class="heart-layer">
          <span
            v-for="h in hearts"
            :key="h.id"
            class="heart"
            :class="{ big: h.big }"
            :style="{ left: h.x + '%' }"
          >💗</span>
        </transition-group>
      </div>
    </section>

    <!-- ============ 功能入口 4 宫格（全部接真实机制） ============ -->
    <section class="entries">
      <button class="entry-card" v-feedback="'BUTTON_CLICK'" @click="openSheet('feed')">
        <span class="e-emoji">🥮</span><b>喂食</b><s>干粮 ×{{ pet.food.dry }} · 精粮 ×{{ pet.food.premium }}</s>
      </button>
      <button class="entry-card" v-feedback="'BUTTON_CLICK'" :disabled="interactDisabled || strokeLocked" @click="onStroke($event)">
        <span class="e-emoji">💕</span><b>互动</b><s>{{ strokeHint }}</s>
      </button>
      <button class="entry-card" v-feedback="'BUTTON_CLICK'" @click="openSheet('travel')">
        <span class="e-emoji">🍃</span><b>旅行</b><s>{{ travelEntryHint }}</s>
      </button>
      <button class="entry-card" v-feedback="'BUTTON_CLICK'" @click="openSheet('notes')">
        <span class="e-emoji">🗒️</span><b>见闻</b><s>{{ seenCount ? `图鉴 ${seenCount}/${TOTAL_NOTES}` : '暂无见闻' }}</s>
      </button>
    </section>

    <!-- ============ 仙宠竞速入口（赛马式小游戏） ============ -->
    <button class="race-banner" v-feedback="'BUTTON_CLICK'" @click="goRace">
      <span class="rb-emoji">🏁</span>
      <span class="rb-text">
        <b>仙宠竞速</b>
        <s>派它出战 · 今日免费剩 {{ raceFreeLeft }} 场</s>
      </span>
      <span class="rb-go">去竞速 ›</span>
    </button>

    <!-- ============ 今日成长（每日三件事，store 持久化跨天重置） ============ -->
    <section class="card-glass tasks-card">
      <div class="tasks-head">
        <b>今日成长</b>
        <span class="bonus" :class="{ got: daily.claimed }">
          <template v-if="daily.claimed">+30 元宝 <em>已领取</em></template>
          <template v-else>全部完成 +30 元宝</template>
        </span>
      </div>

      <div class="task" :class="{ done: daily.fed }">
        <span class="t-check">{{ daily.fed ? '✓' : '' }}</span>
        <span class="t-text">喂食 1 次</span>
        <button v-if="!daily.fed" class="go-btn" v-feedback="'BUTTON_CLICK'" @click="openSheet('feed')">去喂食</button>
        <em v-else class="t-done">完成</em>
      </div>
      <div class="task" :class="{ done: daily.stroked }">
        <span class="t-check">{{ daily.stroked ? '✓' : '' }}</span>
        <span class="t-text">互动 1 次</span>
        <button v-if="!daily.stroked" class="go-btn" v-feedback="'BUTTON_CLICK'" @click="onStroke($event)">去互动</button>
        <em v-else class="t-done">完成</em>
      </div>
      <div class="task" :class="{ done: daily.traveled }">
        <span class="t-check">{{ daily.traveled ? '✓' : '' }}</span>
        <span class="t-text">完成 1 次旅行</span>
        <button v-if="!daily.traveled" class="go-btn" v-feedback="'BUTTON_CLICK'" @click="openSheet('travel')">去旅行</button>
        <em v-else class="t-done">完成</em>
      </div>

      <button class="claim-all" :disabled="!allDailyDone || daily.claimed" v-feedback="'BUTTON_CLICK'" @click="onClaimDaily">
        {{ daily.claimed ? '今日奖励已领取' : '领取每日奖励' }}
      </button>
    </section>

    <!-- ============ 五行收藏（解锁 / 切换陪伴） ============ -->
    <section class="card-glass">
      <div class="c-title">仙宠图鉴 <span class="c-sub-inline">{{ pet.ownedPets.length }}/5 已收</span></div>
      <div class="collection">
        <button
          v-for="el in petElements"
          :key="el"
          class="pet-chip"
          v-feedback="'BUTTON_CLICK'"
          :class="{ owned: isOwned(el), current: el === pet.type, locked: !isOwned(el) }"
          @click="onPetChip(el)"
        >
          <span class="chip-emoji">{{ petMetaOf(el).emoji }}</span>
          <b>{{ petMetaOf(el).name }}</b>
          <s v-if="isOwned(el)">{{ el === pet.type ? '陪伴中' : '点我切换' }}</s>
          <s v-else>{{ petMetaOf(el).unlockJade }} 天玑 解锁</s>
        </button>
      </div>
    </section>

    <!-- ============ 喂食 sheet ============ -->
    <Overlay variant="sheet" :open="sheet === 'feed'" @close="sheet = ''">
      <h3 class="sheet-title">喂食</h3>
      <p class="hint-s">它吃饱了就不会再吃；食物不足时去右上角「粮袋」补给</p>
      <div class="food" v-for="f in modules.petConfig.foods" :key="f.type">
        <div class="f-emoji">{{ f.emoji }}</div>
        <div class="f-meta"><b>{{ f.name }}</b><p>{{ f.desc }}</p></div>
        <div class="f-right">
          <span class="f-count">背包 ×{{ pet.food[f.type] }}</span>
          <button class="feed" v-feedback="'BUTTON_CLICK'" @click="onFeed(f.type)" :disabled="!canFeed(f.type)">喂食</button>
        </div>
      </div>
    </Overlay>

    <!-- ============ 粮袋 sheet（补给购买） ============ -->
    <Overlay variant="sheet" :open="sheet === 'bag'" @close="sheet = ''">
      <h3 class="sheet-title">粮袋补给</h3>
      <p class="hint-s">用元宝购买食物；喂食与旅行出发都会消耗</p>
      <div class="food" v-for="f in modules.petConfig.foods" :key="f.type">
        <div class="f-emoji">{{ f.emoji }}</div>
        <div class="f-meta"><b>{{ f.name }}</b><p>{{ f.desc }}</p></div>
        <div class="f-right">
          <span class="f-count">背包 ×{{ pet.food[f.type] }}</span>
          <button class="buy" v-feedback="'BUTTON_CLICK'" @click="onBuy(f.type)" :disabled="!canBuy(f.type)">{{ f.price }} {{ f.priceType === 'gold' ? '元宝' : '灵珠' }}</button>
        </div>
      </div>
    </Overlay>

    <!-- ============ 旅行 sheet ============ -->
    <Overlay variant="sheet" :open="sheet === 'travel'" @close="sheet = ''">
      <h3 class="sheet-title">旅行</h3>

      <template v-if="pet.travelStatus === 'traveling'">
        <div class="traveling">
          <div class="t-bg">{{ petMeta.emoji }}</div>
          <p class="t-line">小家伙正走在 {{ modeLabel }} 的路上，离线也会继续走…</p>
          <div class="t-count">{{ travelRemain }}</div>
          <div class="bar"><i :style="{ width: travelProgress + '%' }"></i></div>
          <span class="t-pct">已完成 {{ travelProgress }}%</span>
          <!-- 旅途碎片：25/50/75% 各一段，把长等待切成 4 个章节（纯文案零资源） -->
          <div class="milestone" v-if="milestoneText">
            <span class="ms-chapter">旅途 {{ milestoneChapter }}/4</span>
            <p class="ms-text">「{{ milestoneText }}」</p>
          </div>
          <p class="ms-next" v-else>它才刚出发，过一会儿来看看它走到哪了</p>
        </div>
      </template>

      <template v-else-if="pet.travelStatus === 'returning'">
        <div class="returning">
          <p class="t-line">🎒 它回来了！快看看带回了什么</p>
          <button class="claim-btn" v-feedback="'BUTTON_CLICK'" @click="onClaimTravel">领取奖励</button>
        </div>
      </template>

      <template v-else>
        <div class="travel-head">
          <span class="th-label">出发方式</span>
          <div class="ch-toggle">
            <button class="ch" :class="{ on: travelChannel === 'food' }" @click="travelChannel = 'food'">携粮出发</button>
            <button class="ch" :class="{ on: travelChannel === 'magic' }" @click="travelChannel = 'magic'">⚡ 魔丸加速</button>
          </div>
        </div>

        <!-- 通道取舍明示：加速买时间、放弃必得天玑（避免玩家事后才发现） -->
        <p class="ch-desc" :class="travelChannel">
          <template v-if="travelChannel === 'food'">✔ 足时长 · <b>保留该地「必得天玑」</b></template>
          <template v-else>⚡ 时长减半 · <b>放弃「必得天玑」</b> · 今日剩 {{ speedUpLeft }}/{{ modules.petConfig.params.speedUpDailyLimit }} 次</template>
        </p>

        <!-- 首旅双倍：让"赚到了"被看见 -->
        <div class="bonus-tips">
          <span class="bt hot" v-if="firstDailyAvailable">🎁 今日首旅 ×1.5 未用，这趟最划算</span>
          <span class="bt" v-else>今日首旅双倍已用完，明日 0 点刷新</span>
        </div>

        <div class="travel-list">
          <div
            v-for="c in modules.petConfig.travels" :key="c.id"
            class="t-row"
            :class="{ locked: !isTravelUnlocked(c.id), match: isElemMatch(c) }"
          >
            <div class="t-info">
              <b>
                {{ c.name }}
                <i class="t-elem">{{ elemLabel(c.element) }}</i>
                <i class="t-match" v-if="isElemMatch(c)">五行契合 ×1.15</i>
              </b>
              <s>{{ travelDurText(c) }} · 带回 {{ rewardText(c) }}</s>
            </div>
            <button
              class="t-go"
              v-feedback="'BUTTON_CLICK'"
              :disabled="!canTravel(c.id)"
              @click="onTravel(c.id)"
            >
              <template v-if="!isTravelUnlocked(c.id)">🔒 旅行 {{ c.unlockAt }} 次解锁</template>
              <template v-else-if="travelChannel === 'magic' && c.magicHours === undefined">短途不可加速</template>
              <template v-else>{{ channelCostText(c) }}</template>
            </button>
          </div>
        </div>
        <p class="hint">
          带回数值为<b>起步值</b>，实际由加成决定：五行契合 ×1.15、每日首旅 ×1.5、灵动（饱食+愉悦&gt;80）×1.1，可叠加。<br />
          魔丸加速仅 3 小时以上长途开放，出发即扣不返还，每日 {{ modules.petConfig.params.speedUpDailyLimit }} 次。
        </p>
      </template>
    </Overlay>

    <!-- ============ 见闻 sheet（历史 20 条 / 图鉴永久收录） ============ -->
    <Overlay variant="sheet" :open="sheet === 'notes'" @close="sheet = ''">
      <h3 class="sheet-title">旅行见闻</h3>
      <div class="notes-tabs">
        <button class="nt" :class="{ on: notesTab === 'history' }" @click="notesTab = 'history'">最近历史</button>
        <button class="nt" :class="{ on: notesTab === 'atlas' }" @click="notesTab = 'atlas'">
          见闻图鉴 {{ seenCount }}/{{ TOTAL_NOTES }}
        </button>
      </div>

      <!-- 历史（滚动淘汰，上限 20 条） -->
      <template v-if="notesTab === 'history'">
        <div class="notes-body" v-if="pet.travelNotes.length">
          <div class="note" v-for="(n, i) in pet.travelNotes" :key="n.timestamp + '-' + i">
            <span class="note-emoji">🗒️</span>
            <p>「{{ n.text }}」<i>{{ modules.petConfig.travelMap[n.mode]?.name ?? '' }} · {{ timeAgo(n.timestamp) }}</i></p>
          </div>
        </div>
        <div class="notes-empty" v-else>
          <span class="ne-emoji">🍃</span>
          <p>还没有见闻<br />派它出去走走吧，回来会带一句话</p>
        </div>
      </template>

      <!-- 图鉴（永久收录，未得显示 ？；给长线收集一个奔头） -->
      <template v-else>
        <div class="atlas">
          <div class="atlas-progress">
            <div class="ap-bar"><i :style="{ width: (seenCount / TOTAL_NOTES * 100) + '%' }"></i></div>
            <span>已收录 {{ seenCount }} / {{ TOTAL_NOTES }} 句</span>
          </div>
          <div class="atlas-group" v-for="g in atlasGroups" :key="g.mode">
            <div class="ag-head"><b>{{ g.name }}</b><i>{{ g.seen }}/{{ g.items.length }}</i></div>
            <p class="ag-item" v-for="(it, i) in g.items" :key="i" :class="{ got: it.got }">
              <template v-if="it.got">「{{ it.text }}」</template>
              <template v-else>？ 尚未收录 · 再去一次{{ g.name }}</template>
            </p>
          </div>
        </div>
      </template>
    </Overlay>

    <!-- ============ 归来结算卡（可回看的"纪念品"，取代一次性 toast） ============ -->
    <Overlay variant="modal" :open="settle.open" @close="closeSettle">
      <div class="settle">
        <div class="s-emoji">🎒</div>
        <h3 class="s-title">{{ settle.modeName }} · 归来</h3>
        <p class="s-sub">{{ settle.channel === 'magic' ? '⚡ 魔丸加速归来' : '它慢慢地走了一趟' }}</p>

        <div class="s-rewards">
          <div class="s-r" v-for="it in settleRewardList" :key="it.label">
            <span class="sr-emoji">{{ it.emoji }}</span>
            <b>+{{ it.value }}</b>
            <s>{{ it.label }}</s>
          </div>
        </div>

        <div class="s-bonus" v-if="settleBonusList.length">
          <span class="sb" v-for="b in settleBonusList" :key="b">{{ b }}</span>
        </div>
        <p class="s-forgone" v-if="settle.jadeForgone">
          ⚡ 加速已放弃 天玑×{{ settle.jadeForgone }} —— 想收集天玑请选「携粮出发」
        </p>

        <div class="s-note">
          <span class="sn-emoji">🗒️</span>
          <p>
            「{{ settle.note }}」
            <i v-if="settle.noteIsNew" class="new">✨ 见闻图鉴 +1（{{ settle.seenCount }}/{{ settle.totalNotes }}）</i>
            <i v-else>这句见闻已收录过（{{ settle.seenCount }}/{{ settle.totalNotes }}）</i>
          </p>
        </div>

        <button class="s-ok" v-feedback="'BUTTON_CLICK'" @click="closeSettle">收下</button>
      </div>
    </Overlay>

    <!-- ============ 隐藏壁纸庆祝弹框（流光金） ============ -->
    <CelebrateModal
      :open="celebrate.open"
      :emoji="celebrate.emoji"
      :title="celebrate.allDone ? '隐藏壁纸 · 全收集！' : celebrate.title"
      :quality-label="celebrate.quality"
      :subtitle="celebrate.allDone ? '六张隐世壁纸齐聚画境，心境大为欢悦（已 +3）' : undefined"
      @close="celebrate.open = false"
      @go="onCelebrateGo"
    />

    <!-- ============ 轻提示 toast ============ -->
    <div class="toast" v-if="toastMsg">{{ toastMsg }}</div>

    <!-- ============ 宠物命名弹窗 ============ -->
    <PetNameModal :open="petNameOpen" @close="petNameOpen = false" />

    <!-- ============ 调试：重播入场动画（生产自动移除） ============ -->
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
defineOptions({ name: 'Pet' });
import { ref, reactive, computed, onMounted, onUnmounted, onActivated, onDeactivated } from 'vue';
import { useUserStore, useModulesStore, useRaceStore } from '@/stores/index';
import { vFeedback, audio } from '@/core/feedback';
import type { ElementType, PetFoodType, TravelMode, TravelChannel } from '@/types/index';
import CornerButton from '@/components/common/CornerButton.vue';
import Overlay from '@/components/common/Overlay.vue';
import CelebrateModal from '@/components/common/CelebrateModal.vue';
import { usePageIntro } from '@/composables/usePageIntro';
import { useToast } from '@/composables/useToast';
import { useConfirm } from '@/composables/useConfirm';
import { useRouter } from 'vue-router';
import PetNameModal from '@/components/PetNameModal.vue';
import { useFloaters } from '@/composables/useFloaters';
const { pushFloater, rectCenter } = useFloaters();
import { SHOP } from '@/constants/shop';
import {
  fmtHours, fmtCountdown, timeAgo,
} from '@/constants/pet';
import { type TravelCfg } from '@/stores/useModulesStore';

const user = useUserStore();
const modules = useModulesStore();
const raceStore = useRaceStore();
const router = useRouter();
const pet = computed(() => modules.pet);
const { ask: askConfirm } = useConfirm();

/* ---------- 页面轻量入场动画（usePageIntro：分区入场，总观感 ~0.55s，MEMORY.md 第十章规范） ---------- */
const IS_PREVIEW = import.meta.env.MODE !== 'production';
const pageIntro = usePageIntro({
  rootSelector: '.pet-page',
  sections: [
    { selector: '.topbar', y: 14, duration: 0.38 },
    { selector: '.pet-main', y: 16, scale: 0.985, duration: 0.45 },
    { selector: '.entries', y: 14, duration: 0.38 },
    { selector: '.tasks-card', y: 14, duration: 0.38 },
    { selector: '.collection .pet-chip', y: 12, duration: 0.34, stagger: 0.06 },
  ],
  // 无 GSAP 循环动效：形象浮动/光晕由 CSS animation 承担（省电铁律，避免双重动画打架）
  loops: [],
});

/* ---------- 常量 ---------- */
const petElements = modules.petConfig.elements;
const petMetaOf = (el: ElementType) => modules.petConfig.petMap[el];
const petMeta = computed(() => modules.petConfig.petMap[pet.value.type]);
// 宠物形象图：后台可配 image（留空则回退五行 emoji）
const petImg = computed(() => modules.petConfig.petMap[pet.value.type]?.image || '');
const imgOk = ref(true);

/* ---------- 本地状态 ---------- */
const sheet = ref('');            // '' | 'feed' | 'travel' | 'notes' | 'bag'
const travelChannel = ref<TravelChannel>('food'); // 旅行出发通道（携粮 / 魔丸加速）
const notesTab = ref<'history' | 'atlas'>('history'); // 见闻：最近历史 / 永久图鉴
const { toastMsg, showToast } = useToast();
/** 宠物命名弹窗 */
const petNameOpen = ref(false);
function openPetName() { petNameOpen.value = true; }
/** 隐藏壁纸庆祝弹框状态 */
const celebrate = reactive({ open: false, emoji: '', title: '', quality: '', allDone: false });
/** 归来结算卡（可回看的纪念品；隐藏壁纸庆祝框排队在其后弹，避免两层浮层叠一起） */
const settle = reactive({
  open: false,
  modeName: '', channel: 'food' as TravelChannel,
  gold: 0, pearl: 0, magic: 0, jade: 0, jadeForgone: 0,
  bonusElement: false, bonusFirst: false, bonusLively: false, mult: 1,
  note: '', noteIsNew: false, seenCount: 0, totalNotes: 0,
});
/** 结算卡关闭后才弹的隐藏壁纸庆祝（避免浮层叠层） */
let pendingCelebrate: { emoji: string; name: string; quality: string; allDone?: boolean } | null = null;

/* ---------- 计算属性 ---------- */
/** 实时饱食/愉悦：基于真实时间戳连续推算（让进度条肉眼可见地下降，而非数值僵死） */
const tick = ref(0);
const liveHunger = computed(() => {
  tick.value; // 依赖：每秒重算
  const p = pet.value;
  const elapsedMin = (Date.now() - p.lastDecayTimestamp) / 60000;
  return Math.max(0, p.hunger - elapsedMin * modules.petConfig.params.hungerDecayPerMin);
});
const liveHappiness = computed(() => {
  tick.value;
  const p = pet.value;
  const elapsedMin = (Date.now() - p.lastDecayTimestamp) / 60000;
  return Math.max(0, p.happiness - elapsedMin * modules.petConfig.params.hungerDecayPerMin * modules.petConfig.params.hungerHappinessFactor);
});
const lively = computed(() => liveHunger.value + liveHappiness.value > 80);
const isHungry = computed(() => liveHunger.value < 30);
/** 饥饿预警带（20~30）：还能出门但快不行了 —— 补上原本 30→20 这段的空白提示 */
const hungerWarn = computed(() => liveHunger.value < 30 && liveHunger.value >= modules.petConfig.params.hungerTravelMin);
/** 已低于旅行门槛：出不了门 */
const hungerBlocked = computed(() => liveHunger.value < modules.petConfig.params.hungerTravelMin);
/** 主名 = 玩家给宠物起的名字（pet.petName，默认「小灵灵」），点名字可改；
 *  副行 = 物种（山海经神兽名）+ 五行属性，作为上下文辨识。 */
const petMainName = computed(() => pet.value.petName || modules.petConfig.petMap[pet.value.type].name);
const petNickname = computed(() => `${modules.petConfig.petMap[pet.value.type].name} · ${modules.petConfig.petMap[pet.value.type].elementLabel}属`);
const interactDisabled = computed(() => pet.value.travelStatus !== 'idle');
// 冷却中不再锁死按钮：轻摸仍有小回应（治愈不冷场），仅「大满足」受冷却约束
const strokeLocked = computed(() => false);
// 轻摸/大满足飘出的爱心粒子（增强「被回应」的治愈反馈，纯视觉、零数值）
const hearts = ref<{ id: number; x: number; big: boolean }[]>([]);
let heartSeq = 1;
const heartTimers = new Map<number, number>();
function spawnHeart(big: boolean) {
  const id = heartSeq++;
  const x = 30 + Math.random() * 40; // 形象区域附近 30%~70%
  hearts.value.push({ id, x, big });
  const t = window.setTimeout(() => {
    const i = hearts.value.findIndex((h) => h.id === id);
    if (i >= 0) hearts.value.splice(i, 1);
    heartTimers.delete(id);
  }, 1300);
  heartTimers.set(id, t);
}

// 心情 chip（愉悦驱动，替代灵动 tag——同一状态不做两种表达）
// ⚠️ 必须用 liveHappiness（与进度条同口径），否则 chip 与进度条会不同步
const moodLabel = computed(() => {
  const h = liveHappiness.value;
  if (h >= 70) return '开心';
  if (h >= 40) return '平静';
  return '低落';
});
const moodEmoji = computed(() => ({ 开心: '😊', 平静: '😌', 低落: '🥀' }[moodLabel.value] ?? '😌'));
const moodClass = computed(() => ({ 开心: 'happy', 平静: 'calm', 低落: 'low' }[moodLabel.value] ?? 'calm'));

const strokeHint = computed(() => {
  if (interactDisabled.value) return '旅行中';
  const remain = modules.petConfig.params.strokeCoolMs - (Date.now() - pet.value.lastStrokeTimestamp);
  if (remain <= 0) return '愉悦 +12 · 心境 +2';
  // 大满足冷却（3 分钟）：冷却中轻摸也开心，显示「大满足」倒计时（均 <1h，用分钟即可）
  const m = Math.floor(remain / 60000);
  const s = Math.floor((remain % 60000) / 1000);
  return `${m}分${s}秒后大满足（现在轻摸也开心）`;
});

// 副标题：基础文案 + 状态后缀（旅行中主页面也能看到进度）
const subtitle = computed(() => {
  const s = pet.value.travelStatus;
  if (s === 'traveling') return `云游中 · 还剩 ${travelRemain.value}`;
  if (s === 'returning') return '旅行归来 · 待领取';
  if (isHungry.value) return '陪伴成长，传递温暖 · 它有点饿了';
  return '陪伴成长，传递温暖';
});

const statusDesc = computed(() => {
  const s = pet.value.travelStatus;
  if (s === 'traveling') return '它出门旅行去了，等它回来';
  if (s === 'returning') return '它到家了，去领取旅行奖励吧';
  if (hungerBlocked.value) return `太饿了（饱食 < ${modules.petConfig.params.hungerTravelMin}），出不了门，先喂它`;
  if (hungerWarn.value) return '肚子咕咕叫了，再不喂就出不了门啦';
  if (liveHappiness.value < 40) return '有点蔫蔫的，摸摸它吧';
  return '元气满满，随时可以出发';
});

const travelEntryHint = computed(() => {
  const s = pet.value.travelStatus;
  if (s === 'traveling') return `还剩 ${travelRemain.value}`;
  if (s === 'returning') return '待领取';
  return '六地出发';
});

const daily = computed(() => pet.value.dailyTasks);
const allDailyDone = computed(() => daily.value.fed && daily.value.stroked && daily.value.traveled);

const modeLabel = computed(() => (pet.value.travelMode ? modules.petConfig.travelMap[pet.value.travelMode]?.name ?? '' : ''));

/* ---------- 旅行进度（秒表引擎） ---------- */
const travelRemain = ref('--');
const travelProgress = ref(0);

/** 本次旅行的总时长（毫秒）：加速通道用 magicHours，否则用足时长 hours */
function travelTotalMs(mode: TravelMode, channel: TravelChannel) {
  const cfg = modules.petConfig.travelMap[mode];
  const h = channel === 'magic' && cfg.magicHours !== undefined ? cfg.magicHours : cfg.hours;
  return h * 3600 * 1000;
}

function refreshTravel() {
  const s = pet.value.travelStatus;
  if (s === 'traveling' && pet.value.travelMode) {
    const totalMs = travelTotalMs(pet.value.travelMode, pet.value.travelChannel);
    const remainMs = Math.max(0, pet.value.travelEndTimestamp - Date.now());
    travelRemain.value = fmtCountdown(remainMs); // HH:MM:SS 倒计时
    travelProgress.value = Math.round(Math.min(100, Math.max(0, ((totalMs - remainMs) / totalMs) * 100)));
    // 到点 → 归来状态，等待领取
    if (remainMs <= 0) {
      pet.value.travelStatus = 'returning';
      pet.value.lastDecayTimestamp = Date.now(); // 回家后恢复衰减计时
    }
  } else if (s === 'returning') {
    travelProgress.value = 100;
  }
}

/* ---------- 旅途碎片：25% / 50% / 75% 各揭晓一段（长等待 → 4 个章节） ---------- */
const milestoneIdx = computed(() => {
  if (pet.value.travelStatus !== 'traveling') return -1;
  const p = travelProgress.value;
  if (p >= 75) return 2;
  if (p >= 50) return 1;
  if (p >= 25) return 0;
  return -1;
});
const milestoneText = computed(() => {
  const mode = pet.value.travelMode;
  const i = milestoneIdx.value;
  if (!mode || i < 0) return '';
  // i 已被 i<0 拦截，运行时只会是 0|1|2；用字面量联合断言满足元组索引类型
  return modules.petConfig.travelMap[mode]?.milestones?.[i as 0 | 1 | 2] ?? '';
});
/** 章节号（1=刚出发，2/3/4 对应三段碎片） */
const milestoneChapter = computed(() => milestoneIdx.value + 2);

/* ---------- 见闻图鉴（永久收录，与 20 条历史分离） ---------- */
const TOTAL_NOTES = modules.petConfig.travels.reduce((s, t) => s + (t.notes?.length || 0), 0);
const seenSet = computed(() => new Set(pet.value.travelNotesSeen || []));
const seenCount = computed(() => seenSet.value.size);
const atlasGroups = computed(() =>
  modules.petConfig.travels.map((c) => {
    const items = c.notes.map((text, i) => ({ text, got: seenSet.value.has(`${c.id}:${i}`) }));
    return { mode: c.id, name: c.name, items, seen: items.filter((x) => x.got).length };
  }),
);

/* ---------- 出发前的加成感知 ---------- */
/** 今日首旅 ×1.5 是否还没用 */
const firstDailyAvailable = computed(() => pet.value.travelFirstDoubleDate !== new Date().toISOString().slice(0, 10));
/** 今日剩余魔丸加速次数 */
const speedUpLeft = computed(() => Math.max(0, modules.petConfig.params.speedUpDailyLimit - (pet.value.travelSpeedUpCount || 0)));
/** 该目的地是否与当前宠物五行契合（×1.15） */
function isElemMatch(c: TravelCfg) {
  return c.element !== 'chaos' && c.element === pet.value.type;
}

/* ---------- 交互 ---------- */
function openSheet(name: string) { sheet.value = sheet.value === name ? '' : name; }
function goCollection() { document.querySelector('.collection')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
/** 仙宠竞速入口 */
const raceFreeLeft = computed(() => raceStore.freeLeft);
function goRace() { router.push('/app/race'); }

function isOwned(el: ElementType) { return pet.value.ownedPets.includes(el); }

function canFeed(type: PetFoodType) {
  return !interactDisabled.value && pet.value.food[type] > 0 && pet.value.hunger < 100;
}
function canBuy(type: PetFoodType) {
  const f = modules.petConfig.foods.find((x) => x.type === type);
  if (!f) return false;
  return f.priceType === 'gold' ? user.gold >= f.price : user.pearl >= f.price;
}
/** 食物购买价（后台可调）：构造 Price 传给确认弹窗（缺配置时回退 SHOP） */
function foodPrice(type: PetFoodType): any {
  const f = modules.petConfig.foods.find((x) => x.type === type);
  return f ? { [f.priceType]: f.price } : SHOP.petFood[type];
}
function canTravel(mode: TravelMode) {
  if (pet.value.travelStatus !== 'idle') return false;
  if (!isTravelUnlocked(mode)) return false;
  if (liveHunger.value < modules.petConfig.params.hungerTravelMin) return false; // 太饿不能出发（先喂再走）
  const cfg = modules.petConfig.travelMap[mode];
  if (travelChannel.value === 'food') return pet.value.food[cfg.food] > 0;
  // 魔丸加速：仅长档开放 + 每日次数 + 魔丸够
  if (cfg.magicHours === undefined || cfg.magicCost === undefined) return false;
  if (speedUpLeft.value <= 0) return false;
  return user.magic >= cfg.magicCost;
}

/* ---------- 旅行辅助展示 ---------- */
function isTravelUnlocked(mode: TravelMode) {
  return modules.petConfig.travels.filter((c) => pet.value.travelCount >= c.unlockAt).map((c) => c.id).includes(mode);
}
function elemLabel(el: ElementType | 'chaos') {
  return { gold: '金', wood: '木', water: '水', fire: '火', earth: '土', chaos: '混沌' }[el];
}
/**
 * 该档理论最高倍率：五行契合(1.15，混沌不参与) × 首旅(1.5) × 灵动(1.1)
 * → 把"必得 X"改成"X ~ Y 区间"，归来时才揭晓实际数额，期待感的核心
 */
function rowMaxMult(c: TravelCfg) {
  let m = 1.5 * 1.1; // 首旅 + 灵动（均可通过自身努力达成）
  if (c.element !== 'chaos') m *= 1.15; // 契合宠物时可达
  return m;
}
function rewardText(c: TravelCfg) {
  const r = c.rewards;
  const max = rowMaxMult(c);
  const range = (v: number) => `${v}~${Math.floor(v * max)}`;
  const parts: string[] = [];
  if (r.gold) parts.push(`${range(r.gold)} 元宝`);
  if (r.pearl) parts.push(`${range(r.pearl)} 灵珠`);
  if (r.magic) parts.push(`${range(r.magic)} 魔丸`);
  // 必得天玑只在携粮通道展示（加速通道主动放弃，不能给虚假承诺）
  if (c.drops.jadeGuarantee && travelChannel.value === 'food') parts.push('天玑×1');
  return parts.join(' + ');
}
/** 时长展示：加速通道显示「12h → 6h」的压缩对比 */
function travelDurText(c: TravelCfg) {
  if (travelChannel.value === 'magic' && c.magicHours !== undefined) {
    return `${fmtHours(c.hours)} → ${fmtHours(c.magicHours)}`;
  }
  return fmtHours(c.hours);
}
function channelCostText(c: TravelCfg) {
  if (travelChannel.value === 'food') return c.food === 'dry' ? '干粮×1' : '精粮×1';
  return `魔丸 ${c.magicCost}`; // 直付不返还，不再显示"110→10"这种误导写法
}

function onFeed(type: PetFoodType) {
  const r = modules.feedPet(type);
  if (r.success) { audio.play('success'); showToast(`它吃了${type === 'dry' ? '干粮' : '精粮'}，饱食 +${r.gain}`); }
  else if (r.reason === 'noFood') showToast('粮袋里没有这种食物了，先补给一下吧');
  else if (r.reason === 'full') showToast('它已经吃饱啦');
  else if (r.reason === 'traveling') showToast('它还在旅行中，等它回家再喂吧');
}

function onStroke(ev?: MouseEvent) {
  const r = modules.strokePet();
  if (r.success && r.big) {
    audio.play('soft');
    spawnHeart(true);
    showToast('它蹭了蹭你的手心，愉悦 +12 · 心境 +2 ✨');
    const hc = rectCenter(ev?.currentTarget as Element | undefined);
    pushFloater({ x: hc.x, y: hc.y - 14, text: '愉悦+12 心境+2', kind: 'mood', duration: 1400 });
  } else if (r.success && !r.big) {
    // 冷却中轻摸：小回应，治愈不冷场
    audio.play('soft');
    spawnHeart(false);
    showToast('它眯起眼睛，很享受你的轻抚 💗 愉悦 +3');
    const hc = rectCenter(ev?.currentTarget as Element | undefined);
    pushFloater({ x: hc.x, y: hc.y - 14, text: '愉悦+3', kind: 'mood', duration: 1400 });
  } else if (r.reason === 'traveling') {
    showToast('它还在旅行中，回来再摸摸');
  }
}

function onTravel(mode: TravelMode) {
  const r = modules.startPetTravel(mode, travelChannel.value);
  if (r.success) {
    audio.play('success');
    const speed = travelChannel.value === 'magic' ? '⚡ 加速 · ' : '';
    showToast(`${speed}${modules.petConfig.travelMap[mode]?.name ?? ''} 出发啦，约 ${fmtHours(r.hours ?? 0)} 后回来`);
    sheet.value = '';
  }
  else if (r.reason === 'hungry') showToast(`它太饿了（饱食需 ≥ ${modules.petConfig.params.hungerTravelMin}），先喂点东西再出发`);
  else if (r.reason === 'noFood') showToast('粮袋里没有对应的食物了，先去补给');
  else if (r.reason === 'noMagic') showToast('魔丸不足，去天籁挂机攒点魔丸吧');
  else if (r.reason === 'noSpeedUp') showToast('短途本来就快，加速留给 3 小时以上的远行吧');
  else if (r.reason === 'speedUpLimit') showToast(`今日魔丸加速已用完（每日 ${modules.petConfig.params.speedUpDailyLimit} 次），明日 0 点刷新`);
  else if (r.reason === 'locked') showToast('该目的地尚未解锁，多旅行几次吧');
  else if (r.reason === 'busy') showToast('它已经在路上了');
}

/** 结算卡：逐项收获列表（元宝→灵珠→魔丸→天玑，有分量地一项项呈现） */
const settleRewardList = computed(() => {
  const list: { emoji: string; label: string; value: number }[] = [];
  if (settle.gold) list.push({ emoji: '🪙', label: '元宝', value: settle.gold });
  if (settle.pearl) list.push({ emoji: '🔮', label: '灵珠', value: settle.pearl });
  if (settle.magic) list.push({ emoji: '⚗️', label: '魔丸', value: settle.magic });
  if (settle.jade) list.push({ emoji: '💎', label: '天玑', value: settle.jade });
  return list;
});
/** 结算卡：加成明细（让玩家看懂"为什么这么多"） */
const settleBonusList = computed(() => {
  const l: string[] = [];
  if (settle.bonusFirst) l.push('🎁 今日首旅 ×1.5');
  if (settle.bonusElement) l.push('🌿 五行契合 ×1.15');
  if (settle.bonusLively) l.push('✨ 灵动状态 ×1.1');
  if (l.length) l.push(`合计 ×${settle.mult.toFixed(2)}`);
  return l;
});

function onClaimTravel() {
  const r = modules.claimPetTravel();
  if (!r.success) {
    if (r.reason === 'notYet') showToast('它还在路上，再等等');
    return;
  }
  audio.play('coin');
  const rw = r.rewards ?? { gold: 0, pearl: 0, magic: 0, jade: 0 };
  // 归来结算卡（可回看的纪念品，取代一坨即逝的 toast）
  settle.modeName = r.modeName ?? '';
  settle.channel = r.channel ?? 'food';
  settle.gold = rw.gold; settle.pearl = rw.pearl; settle.magic = rw.magic; settle.jade = rw.jade;
  settle.jadeForgone = r.jadeForgone ?? 0;
  settle.bonusElement = !!r.bonus?.element;
  settle.bonusFirst = !!r.bonus?.firstDaily;
  settle.bonusLively = !!r.bonus?.lively;
  settle.mult = r.bonus?.mult ?? 1;
  settle.note = r.note ?? '';
  settle.noteIsNew = !!r.noteIsNew;
  settle.seenCount = r.seenCount ?? 0;
  settle.totalNotes = r.totalNotes ?? TOTAL_NOTES;
  settle.open = true;
  sheet.value = ''; // 收起旅行抽屉，让结算卡成为唯一焦点
  // 隐藏壁纸庆祝：排队到结算卡关闭后再弹（避免两层浮层叠一起）
  pendingCelebrate = r.hiddenWallpaper
    ? {
      emoji: r.hiddenWallpaper.emoji,
      name: r.hiddenWallpaper.name,
      quality: r.hiddenWallpaper.quality === 'legendary' ? '隐·仙品传说' : '隐·灵品',
      // 本次掉落使六张隐藏壁纸首次齐聚 → 特殊全收集庆祝（心境+3 已在 store 施加）
      allDone: !!r.hiddenComplete,
    }
    : null;
}

function closeSettle() {
  settle.open = false;
  if (pendingCelebrate) {
    celebrate.emoji = pendingCelebrate.emoji;
    celebrate.title = pendingCelebrate.name;
    celebrate.quality = pendingCelebrate.quality;
    celebrate.allDone = !!pendingCelebrate.allDone;
    pendingCelebrate = null;
    // 等结算卡收起动画走完再弹，避免视觉打架
    window.setTimeout(() => { celebrate.open = true; }, 260);
  }
}

function onCelebrateGo() {
  celebrate.open = false;
  router.push('/gallery');
}

async function onBuy(type: PetFoodType) {
  const label = type === 'dry' ? '宠物干粮' : '宠物精粮';
  if (!(await askConfirm({ title: '购买粮食', message: `确定购买 ${label} 吗？`, cost: foodPrice(type) }))) return;
  const r = modules.buyPetFood(type);
  if (r.success) { audio.play('coin'); showToast(`已放入粮袋：${type === 'dry' ? '干粮 +1' : '精粮 +1'}`); }
  else { audio.play('error'); showToast(type === 'dry' ? '元宝不足' : '灵珠不足'); }
}

function onClaimDaily() {
  if (modules.claimPetDaily()) { audio.play('success'); showToast('已领取今日成长奖励 +30 元宝'); }
}

async function onPetChip(el: ElementType) {
  if (isOwned(el)) {
    if (el === pet.value.type) return;
    if (pet.value.travelStatus !== 'idle') { showToast('旅行中无法切换陪伴，等它回家吧'); return; }
    if (modules.switchPet(el)) showToast(`现在是 ${modules.petConfig.petMap[el].name} 陪伴你了`);
  } else {
    if (user.jade < modules.petConfig.petMap[el].unlockJade) { audio.play('error'); showToast('天玑不足，远行旅行可带回天玑'); return; }
    if (!(await askConfirm({ title: '解锁仙宠', message: `确定解锁 ${modules.petConfig.petMap[el].name} 吗？`, cost: { jade: modules.petConfig.petMap[el].unlockJade } }))) return;
    if (modules.unlockPet(el)) { audio.play('success'); showToast(`解锁 ${modules.petConfig.petMap[el].name}！可以切换到它啦`); }
  }
}

/* ---------- 时间引擎（keepAlive 省电停表：切走停表，切回按真实时钟重算） ---------- */
let tickTimer: number | undefined;

function startTimeEngine() {
  if (tickTimer) return;
  // ⚠️ 切勿对 travelEndTimestamp 做「-= 离开时长」的补偿：
  //    它是**绝对 wall-clock 时间戳**，本身就跟着真实时间走，减去离开时长
  //    等于「在别的 Tab 待 N 分钟，宠物就提前 N 分钟回来」= 时间可刷（已修）。
  //    （FarmPage 用的是 remainingSeconds 相对量，那里才需要 applyElapsed 补时，两套模型不可混用）
  modules.decayPet(); // 衰减按 lastDecayTimestamp 真实结算，同样无需手工补偿
  refreshTravel();
  tickTimer = window.setInterval(() => {
    tick.value++;      // 驱动 liveHunger / liveHappiness 每秒重算（进度条肉眼可见地流动）
    modules.decayPet(); // 每秒结算开销极小（多数周期直接 return），保证停留页面也按时衰减
    refreshTravel();
  }, 1000);
}

function stopTimeEngine() {
  if (tickTimer) { clearInterval(tickTimer); tickTimer = undefined; }
}

onMounted(() => {
  modules.normalizePet(); // 旧持久化数据补齐 + 每日任务跨天重置兜底
  modules.decayPet();
  raceStore.ensureDailyReset();
  refreshTravel();
});
// keepAlive：首次挂载与切回前台都会触发 onActivated；切走触发 onDeactivated
onActivated(() => startTimeEngine());
onDeactivated(() => stopTimeEngine());
onUnmounted(() => stopTimeEngine());
</script>

<style scoped>
.pet-page {
  padding: 14px 22px calc(96px + env(safe-area-inset-bottom, 0px));
  min-height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 14px; /* 区块间距统一 14px（MEMORY.md UI 规范） */
}
.card-glass {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  backdrop-filter: var(--backdrop-lg);
  -webkit-backdrop-filter: var(--backdrop-lg);
  border-radius: var(--radius-card, 20px);
  padding: 18px;
  box-shadow: var(--shadow-float);
}
.c-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.c-sub-inline { font-size: 11.5px; font-weight: 400; color: var(--text-muted); }

/* ---- 顶部 ---- */
.topbar { display: flex; align-items: flex-start; justify-content: space-between; padding: 4px 2px 0; }
.brand h1 { font-size: 27px; font-weight: 800; color: var(--text-primary); letter-spacing: .6px; }
.brand p { margin-top: 5px; font-size: 12.5px; color: var(--text-secondary); }
.actions { display: flex; gap: 10px; }

/* ---- 主卡（左信息 / 右形象） ---- */
.pet-main { display: flex; align-items: center; gap: 16px; }
.pet-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 11px; }

.name-row { display: flex; align-items: center; gap: 8px; }
.name-block { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.name-main { font-size: 19px; font-weight: 800; color: var(--text-primary); line-height: 1.15; display: inline-flex; align-items: center; gap: 4px; }
.name-edit {
  font-size: 12px; font-weight: 500; color: var(--accent);
  opacity: .55; transition: opacity .15s ease; transform: translateY(1px);
}
.name-block:active .name-edit { opacity: .9; }
.name-sub { font-size: 11.5px; font-weight: 600; color: var(--text-muted); letter-spacing: .5px; }
.mood-chip {
  flex: 0 0 auto; display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 600;
}
.mood-chip.happy { background: #FBEFD8; color: #B8862D; }
.mood-chip.calm  { background: #E8E6F6; color: #6C63AC; }
.mood-chip.low   { background: #E4EEF2; color: #5A7A86; }

.kv-row { display: flex; align-items: center; gap: 9px; }
.kv-label { flex: 0 0 30px; font-size: 11.5px; color: var(--text-secondary); }
.kv-val { font-size: 12px; font-weight: 700; color: var(--text-primary); flex: 0 0 26px; text-align: right; }
.bar { flex: 1; height: 9px; border-radius: 999px; background: var(--track-bg); overflow: hidden; }
.bar i { display: block; height: 100%; border-radius: 999px; transition: width .5s cubic-bezier(.25,.46,.45,.94); }
.joy-bar i { background: linear-gradient(90deg, var(--accent-soft), var(--accent)); }
.hunger-bar i { background: linear-gradient(90deg, #9ED0B4, var(--growth)); }
.status-desc { margin: 0; font-size: 11.5px; color: var(--text-muted); }

/* 互动爱心粒子：强化「被回应」的治愈反馈（纯视觉） */
.heart-layer { position: absolute; left: 0; right: 0; top: 40%; bottom: 0; pointer-events: none; z-index: 5; }
.heart {
  position: absolute; bottom: 8px; transform: translateX(-50%);
  font-size: 18px; filter: drop-shadow(0 2px 4px rgba(214, 122, 158, .35));
  animation: heart-float 1.3s ease-out forwards;
}
.heart.big { font-size: 24px; }
@keyframes heart-float {
  0%   { opacity: 0; transform: translateX(-50%) translateY(6px) scale(.4); }
  20%  { opacity: 1; transform: translateX(-50%) translateY(-4px) scale(1); }
  100% { opacity: 0; transform: translateX(-50%) translateY(-58px) scale(.9); }
}
.heart-pop-enter-active { animation: heart-float 1.3s ease-out forwards; }
.heart-pop-leave-active { opacity: 0; }

/* 右：形象展示区 */
.pet-stage { position: relative; flex: 0 0 148px; width: 148px; height: 168px; display: grid; place-items: center; }
.stage-glow {
  position: absolute; inset: 6px; border-radius: 50%; filter: blur(22px); opacity: .55; z-index: 0;
}
.stage-glow.gold  { background: radial-gradient(circle, rgba(196,154,62,.5), transparent 70%); }
.stage-glow.wood  { background: radial-gradient(circle, rgba(94,156,122,.5), transparent 70%); }
.stage-glow.water { background: radial-gradient(circle, rgba(79,163,174,.5), transparent 70%); }
.stage-glow.fire  { background: radial-gradient(circle, rgba(210,119,119,.5), transparent 70%); }
.stage-glow.earth { background: radial-gradient(circle, rgba(181,146,79,.5), transparent 70%); }

.pet-figure {
  position: relative; z-index: 1;
  width: 132px; height: 132px; border-radius: 50%;
  display: grid; place-items: center;
  border: 1.5px solid rgba(255,255,255,.75);
  box-shadow: 0 14px 30px rgba(80,70,120,.18), 0 2px 0 rgba(255,255,255,.7) inset;
}
.pet-figure.gold  { background: var(--wuxing-gold-soft); }
.pet-figure.wood  { background: var(--wuxing-wood-soft); }
.pet-figure.water { background: var(--wuxing-water-soft); }
.pet-figure.fire  { background: var(--wuxing-fire-soft); }
.pet-figure.earth { background: var(--wuxing-earth-soft); }
.pet-figure img { width: 112px; height: 112px; object-fit: contain; }
.pet-figure .fallback { font-size: 66px; filter: drop-shadow(0 8px 14px rgba(80,70,120,.25)); }
.pet-figure.float { animation: floatY 3.4s ease-in-out infinite; }
.pet-figure.hungry { animation: tumble 2.2s ease-in-out infinite; }
@keyframes floatY { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
@keyframes tumble { 0%, 100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(4px) rotate(2deg); } }

/* 三档情绪表情徽章（图形素材到位后可移除，由图片表情承接） */
.mood-face {
  position: absolute; right: -4px; bottom: -2px;
  width: 34px; height: 34px; display: grid; place-items: center;
  font-size: 17px; border-radius: 50%;
  background: rgba(255,255,255,.85); box-shadow: var(--shadow-float);
  animation: moodPop .35s cubic-bezier(.34,1.56,.64,1);
}
.mood-face.low { background: rgba(245,240,255,.9); }
.pet-figure.low .fallback { filter: grayscale(.35) drop-shadow(0 6px 10px rgba(80,70,120,.2)); }
@keyframes moodPop { 0% { transform: scale(.4); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }

.hungry-tag {
  position: absolute; top: 30px; left: 2px; z-index: 2;
  padding: 3px 10px; border-radius: 999px;
  font-size: 11px; font-weight: 700; color: #fff;
  background: linear-gradient(135deg, #E08A5A, #E8A15A);
  animation: tagPulse 1.6s ease-in-out infinite;
}
@keyframes tagPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }

/* ---- 功能入口 4 宫格 ---- */
.entries { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.entry-card {
  display: flex; flex-direction: column; align-items: center; gap: 5px;
  padding: 15px 6px 13px; border-radius: 20px; border: 1px solid var(--border-light);
  background: var(--bg-card); backdrop-filter: var(--backdrop-sm);
  -webkit-backdrop-filter: var(--backdrop-sm);
  cursor: pointer; color: var(--text-primary); box-shadow: var(--shadow-float);
  transition: transform .14s cubic-bezier(.25,.46,.45,.94), opacity .2s;
}
.entry-card:active { transform: scale(.94); }
.entry-card:disabled { opacity: .45; cursor: default; transform: none; }
.e-emoji { font-size: 26px; }
.entry-card b { font-size: 13.5px; }
.entry-card s { font-size: 10px; color: var(--text-muted); text-decoration: none; }

/* ---- 仙宠竞速入口横幅 ---- */
.race-banner {
  display: flex; align-items: center; gap: 12px; width: 100%;
  padding: 14px 16px; border: 0; border-radius: 18px; cursor: pointer; text-align: left;
  background: linear-gradient(135deg, rgba(138,128,216,.16), rgba(138,128,216,.06));
  border: 1px solid rgba(138,128,216,.28); color: var(--text-primary);
  box-shadow: var(--shadow-float); transition: transform .14s cubic-bezier(.25,.46,.45,.94);
}
.race-banner:active { transform: scale(.98); }
.rb-emoji { font-size: 28px; flex: 0 0 auto; filter: drop-shadow(0 3px 6px rgba(80,70,120,.25)); }
.rb-text { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.rb-text b { font-size: 15px; font-weight: 800; }
.rb-text s { font-size: 11px; color: var(--text-muted); text-decoration: none; }
.rb-go { flex: 0 0 auto; font-size: 13px; font-weight: 700; color: var(--accent); }

/* ---- 今日成长 ---- */
.tasks-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.tasks-head b { font-size: 15px; font-weight: 700; color: var(--text-primary); }
.bonus { font-size: 11.5px; color: var(--accent); font-weight: 600; }
.bonus em { font-style: normal; color: var(--text-muted); }
.bonus.got { color: var(--text-muted); }

.task { display: flex; align-items: center; gap: 10px; padding: 11px 12px; border-radius: 15px; background: var(--bg-card-strong); border: 1px solid var(--border-light); margin-bottom: 9px; }
.task.done { opacity: .75; }
.t-check {
  flex: 0 0 22px; width: 22px; height: 22px; border-radius: 50%;
  border: 1.5px solid var(--divider); color: #fff;
  display: grid; place-items: center; font-size: 12px; font-weight: 700;
}
.task.done .t-check { background: linear-gradient(135deg, var(--accent), var(--accent-soft)); border-color: transparent; }
.t-text { flex: 1; font-size: 13.5px; color: var(--text-primary); }
.go-btn {
  padding: 6px 14px; border: 0; border-radius: 999px; cursor: pointer;
  background: linear-gradient(135deg, var(--accent), var(--accent-soft)); color: #fff;
  font-size: 11.5px; font-weight: 600;
  transition: transform .14s cubic-bezier(.25,.46,.45,.94);
}
.go-btn:active { transform: scale(.94); }
.t-done { font-style: normal; font-size: 11.5px; color: var(--text-muted); }

.claim-all {
  width: 100%; margin-top: 13px; padding: 13px; border: 0; border-radius: 16px; cursor: pointer;
  background: linear-gradient(135deg, var(--accent), var(--accent-soft)); color: #fff;
  font-size: 14px; font-weight: 700; box-shadow: 0 10px 22px rgba(138,128,216,.3);
  transition: transform .14s cubic-bezier(.25,.46,.45,.94), opacity .2s;
}
.claim-all:active { transform: scale(.97); }
.claim-all:disabled { opacity: .45; cursor: default; transform: none; box-shadow: none; }

/* ---- 图鉴 ---- */
.collection { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.pet-chip {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 12px 6px; border-radius: 16px; border: 1px solid var(--border-light);
  background: var(--bg-card-strong); cursor: pointer; color: var(--text-primary);
  transition: transform .14s cubic-bezier(.25,.46,.45,.94), box-shadow .2s;
}
.pet-chip:active { transform: scale(.96); }
.pet-chip .chip-emoji { font-size: 30px; }
.pet-chip b { font-size: 12px; }
.pet-chip s { font-size: 10px; color: var(--text-muted); text-decoration: none; }
.pet-chip.current { border-color: var(--accent-soft); box-shadow: 0 0 0 2px rgba(138,128,216,.22); }
.pet-chip.locked { opacity: .55; }
.pet-chip.locked .chip-emoji { filter: grayscale(.7); }

/* ---- sheet 通用 ---- */
.sheet-title { margin: 0 0 4px; font-size: 18px; color: var(--text-primary); }
.hint-s { margin: 0 0 16px; font-size: 12px; color: var(--text-muted); }
.food { display: flex; align-items: center; gap: 12px; padding: 14px; border-radius: 16px; margin-bottom: 12px; background: var(--bg-card); border: 1px solid var(--border-light); }
.f-emoji { font-size: 28px; flex: 0 0 auto; }
.f-meta { flex: 1; }
.f-meta b { font-size: 14px; color: var(--text-primary); }
.f-meta p { margin: 3px 0 0; font-size: 11px; line-height: 1.5; color: var(--text-muted); }
.f-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
.f-count { font-size: 11px; color: var(--text-secondary); }
.buy, .feed {
  padding: 7px 15px; border: 0; border-radius: 13px; cursor: pointer;
  font-size: 12px; font-weight: 600; transition: transform .14s, opacity .2s;
}
.buy { background: var(--growth-soft); color: var(--growth); }
.feed { background: linear-gradient(135deg, var(--accent), var(--accent-soft)); color: #fff; }
.buy:active, .feed:active { transform: scale(.94); }
.buy:disabled, .feed:disabled { opacity: .4; cursor: default; }

.travel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.th-label { font-size: 12px; color: var(--text-muted); }
.ch-toggle { display: flex; gap: 6px; background: var(--bg-card-strong); padding: 3px; border-radius: 12px; }
.ch { padding: 6px 12px; border: 0; border-radius: 9px; font-size: 12px; cursor: pointer; background: transparent; color: var(--text-muted); transition: all .15s; }
.ch.on { background: linear-gradient(135deg, var(--accent), var(--accent-soft)); color: #fff; font-weight: 600; }
.travel-list { display: flex; flex-direction: column; gap: 8px; }
.t-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 11px 12px; border-radius: 14px; border: 1px solid var(--border-light); background: var(--bg-card-strong); }
.t-row.locked { opacity: .55; }
.t-info { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.t-info b { font-size: 14px; color: var(--text-primary); display: flex; align-items: center; gap: 6px; }
.t-elem { font-size: 10px; font-style: normal; font-weight: 600; color: var(--accent); background: rgba(138,128,216,.14); padding: 1px 6px; border-radius: 6px; }
.t-info s { font-size: 11px; color: var(--text-muted); text-decoration: none; }
.t-go { flex-shrink: 0; padding: 9px 14px; border: 0; border-radius: 12px; font-size: 12px; font-weight: 600; cursor: pointer; background: linear-gradient(135deg, var(--accent), var(--accent-soft)); color: #fff; transition: transform .14s, opacity .2s; }
.t-go:active { transform: scale(.96); }
.t-go:disabled { opacity: .4; cursor: default; transform: none; background: var(--bg-card-strong); color: var(--text-muted); }

.traveling, .returning { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 10px 0; }
.t-bg { font-size: 44px; filter: drop-shadow(0 6px 12px rgba(80,70,120,.25)); animation: walkBounce 2.2s ease-in-out infinite; }
@keyframes walkBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
.t-line { font-size: 12.5px; color: var(--text-secondary); text-align: center; margin: 0; }
.t-count { font-size: 34px; font-weight: 700; color: var(--text-primary); font-variant-numeric: tabular-nums; letter-spacing: 1px; text-shadow: 0 2px 8px rgba(138,128,216,.2); }
.t-pct { font-size: 11.5px; color: var(--text-muted); }
.claim-btn {
  padding: 12px 34px; border: 0; border-radius: 18px; cursor: pointer;
  background: linear-gradient(135deg, var(--accent), var(--accent-soft)); color: #fff;
  font-size: 14px; font-weight: 700; box-shadow: 0 10px 22px rgba(138,128,216,.35);
  transition: transform .14s cubic-bezier(.25,.46,.45,.94);
}
.claim-btn:active { transform: scale(.96); }
.hint { margin: 12px 0 0; font-size: 11px; color: var(--text-muted); text-align: center; }

/* ---- 见闻历史 ---- */
.notes-body { padding-top: 2px; display: flex; flex-direction: column; gap: 10px; max-height: 52vh; overflow-y: auto; }
.note { display: flex; gap: 12px; align-items: flex-start; background: var(--bg-card-strong); border: 1px solid var(--border-light); border-radius: 14px; padding: 14px; }
.note-emoji { font-size: 22px; flex: 0 0 auto; }
.note p { margin: 0; font-size: 13px; line-height: 1.7; color: var(--text-primary); }
.note p i { display: block; margin-top: 6px; font-size: 10.5px; font-style: normal; color: var(--text-muted); }
.notes-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 26px 0; }
.ne-emoji { font-size: 40px; opacity: .8; }
.notes-empty p { margin: 0; font-size: 12.5px; line-height: 1.8; color: var(--text-muted); text-align: center; }

/* ---- 旅途碎片（长等待 → 4 章节，弥合等待真空） ---- */
.milestone {
  margin-top: 8px; padding: 12px 14px; border-radius: 16px;
  background: linear-gradient(135deg, rgba(138,128,216,.12), rgba(138,128,216,.05));
  border: 1px solid rgba(138,128,216,.22); text-align: center;
}
.ms-chapter { display: inline-block; font-size: 10.5px; font-weight: 700; color: var(--accent); letter-spacing: .5px; margin-bottom: 6px; }
.ms-text { margin: 0; font-size: 13px; line-height: 1.7; color: var(--text-primary); font-style: italic; }
.ms-next { margin: 8px 0 0; font-size: 11.5px; color: var(--text-muted); text-align: center; }

/* ---- 通道取舍明示（出发前就讲清加速=放弃必得天玑） ---- */
.ch-desc { margin: 0 0 10px; font-size: 12px; line-height: 1.6; color: var(--text-secondary); text-align: center; padding: 8px 12px; border-radius: 12px; background: var(--bg-card-strong); border: 1px solid var(--border-light); }
.ch-desc.food b { color: var(--growth); }
.ch-desc.magic b { color: #E0913A; }

/* ---- 首旅提示 ---- */
.bonus-tips { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.bt { font-size: 11.5px; color: var(--text-muted); padding: 7px 12px; border-radius: 11px; background: var(--bg-card-strong); border: 1px solid var(--border-light); }
.bt.hot { color: #B8862D; background: #FBEFD8; border-color: rgba(184,134,45,.25); font-weight: 600; }

/* ---- 五行契合标签 ---- */
.t-match { font-size: 9.5px; font-style: normal; font-weight: 700; color: var(--growth); background: rgba(94,156,122,.16); padding: 1px 6px; border-radius: 6px; letter-spacing: .3px; }
.t-row.match { border-color: rgba(94,156,122,.4); box-shadow: 0 0 0 1.5px rgba(94,156,122,.18); }

/* ---- 见闻 tab（最近历史 / 永久图鉴） ---- */
.notes-tabs { display: flex; gap: 8px; margin-bottom: 14px; background: var(--bg-card-strong); padding: 4px; border-radius: 13px; }
.nt { flex: 1; padding: 8px; border: 0; border-radius: 10px; font-size: 12.5px; font-weight: 600; cursor: pointer; background: transparent; color: var(--text-muted); transition: all .15s; }
.nt.on { background: linear-gradient(135deg, var(--accent), var(--accent-soft)); color: #fff; }

/* ---- 见闻图鉴（永久收录，未得显示 ？） ---- */
.atlas { display: flex; flex-direction: column; gap: 14px; max-height: 56vh; overflow-y: auto; padding-top: 2px; }
.atlas-progress { display: flex; flex-direction: column; gap: 6px; }
.ap-bar { height: 8px; border-radius: 999px; background: var(--track-bg); overflow: hidden; }
.ap-bar i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--accent-soft), var(--accent)); transition: width .5s; }
.atlas-progress > span { font-size: 11px; color: var(--text-muted); }
.atlas-group { background: var(--bg-card-strong); border: 1px solid var(--border-light); border-radius: 14px; padding: 12px; }
.ag-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.ag-head b { font-size: 13.5px; color: var(--text-primary); }
.ag-head i { font-size: 11px; font-style: normal; color: var(--text-muted); }
.ag-item { margin: 0 0 7px; font-size: 12px; line-height: 1.6; color: var(--text-muted); }
.ag-item:last-child { margin-bottom: 0; }
.ag-item.got { color: var(--text-primary); }

/* ---- 归来结算卡（可回看的纪念品，取代一坨即逝的 toast） ---- */
.settle { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 22px 20px; }
.s-emoji { font-size: 40px; filter: drop-shadow(0 6px 12px rgba(80,70,120,.25)); }
.s-title { margin: 0; font-size: 18px; font-weight: 800; color: var(--text-primary); }
.s-sub { margin: 0; font-size: 12px; color: var(--text-muted); }
.s-rewards { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin: 4px 0; }
.s-r { display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 64px; padding: 12px 10px; border-radius: 14px; background: var(--bg-card-strong); border: 1px solid var(--border-light); }
.s-r b { font-size: 16px; font-weight: 800; color: var(--text-primary); }
.sr-emoji { font-size: 22px; }
.s-r s { font-size: 10.5px; color: var(--text-muted); text-decoration: none; }
.s-bonus { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
.sb { font-size: 11px; font-weight: 600; color: var(--accent); background: rgba(138,128,216,.12); padding: 4px 10px; border-radius: 9px; }
.s-forgone { margin: 0; font-size: 11.5px; color: #E0913A; text-align: center; line-height: 1.6; padding: 8px 12px; border-radius: 11px; background: rgba(224,145,58,.1); }
.s-note { display: flex; gap: 10px; align-items: flex-start; background: rgba(138,128,216,.06); border: 1px solid rgba(138,128,216,.18); border-radius: 14px; padding: 12px; }
.s-note p { margin: 0; font-size: 13px; line-height: 1.7; color: var(--text-primary); }
.s-note p i { display: block; margin-top: 5px; font-size: 10.5px; font-style: normal; color: var(--text-muted); }
.sn-emoji { font-size: 20px; flex: 0 0 auto; }
.s-note .new { color: var(--accent); }
.s-ok { width: 100%; margin-top: 6px; padding: 13px; border: 0; border-radius: 16px; cursor: pointer; background: linear-gradient(135deg, var(--accent), var(--accent-soft)); color: #fff; font-size: 14px; font-weight: 700; box-shadow: 0 10px 22px rgba(138,128,216,.3); transition: transform .14s; }
.s-ok:active { transform: scale(.97); }

/* ---- toast ---- */
/* 兜底值必须是 1100（global.css 阶梯：overlay 1000 < toast 1100），写 100 会在变量缺失时被浮层压住 */
.toast { position: fixed; left: 50%; top: 18px; transform: translateX(-50%); z-index: var(--z-toast, 1100);
  background: linear-gradient(135deg, var(--accent), var(--accent-soft)); color: #fff;
  padding: 12px 18px; border-radius: 18px; font-size: 13px; box-shadow: 0 10px 30px rgba(138,128,216,.4);
  white-space: nowrap; }

/* ---- 调试按钮 ---- */
.debug-replay-btn {
  position: fixed; right: 18px; bottom: calc(96px + env(safe-area-inset-bottom, 0px));
  width: 36px; height: 36px; border-radius: 50%; border: 0;
  background: rgba(255,255,255,.72); backdrop-filter: blur(14px) saturate(1.4);
  -webkit-backdrop-filter: blur(14px) saturate(1.4);
  box-shadow: 0 6px 14px rgba(80,70,120,.16), 0 1px 0 rgba(255,255,255,.6) inset;
  color: #6C63AC; cursor: pointer; display: grid; place-items: center;
}
</style>
