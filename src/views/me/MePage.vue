<!-- src/views/me/MePage.vue —— 我的 Tab页（个人中心 / 收集聚合 / 入口）-->
<template>
  <div class="me-page app-page">
    <!-- 点头像/昵称区即可改名（首进若未取名会显示「点此取名 ✦」引导态）-->
    <header class="profile-header card-glass" v-feedback="'BUTTON_CLICK'" @click="openRename">
      <Avatar
        class="avatar"
        :avatar="userStore.avatar"
        :name="userStore.displayName"
        :element="avatarElement"
        :size="54"
        v-feedback="'BUTTON_CLICK'"
        @click.stop="openAvatar"
      />
      <div class="profile-info">
        <div class="nick-row">
          <span class="nickname" v-if="userStore.nickname">{{ userStore.displayName }}</span>
          <span class="nickname nick-unnamed" v-else>点此取名 ✦</span>
          <span v-if="modulesStore.musicTag" class="tag-zhiyin">知音</span>
          <span class="nick-edit">✎</span>
        </div>
        <div class="lv-row">
          <span class="lv-badge">Lv.{{ userStore.level }}</span>
          <span class="exp-text">EXP {{ userStore.exp }}/{{ userStore.maxExp }}</span>
        </div>
      </div>
    </header>

    <!-- 4种货币（契约：01-全局规则 L2-9）-->
    <section class="currency-grid">
      <div class="cur-cell card-glass">
        <div class="cur-ic">🪙</div>
        <div class="cur-name">元宝</div>
        <div class="cur-val">{{ userStore.gold }}</div>
      </div>
      <div class="cur-cell card-glass">
        <div class="cur-ic">🔮</div>
        <div class="cur-name">灵珠</div>
        <div class="cur-val">{{ userStore.pearl }}</div>
      </div>
      <div class="cur-cell card-glass">
        <div class="cur-ic">🌑</div>
        <div class="cur-name">魔丸</div>
        <div class="cur-val">{{ userStore.magic }}</div>
      </div>
      <div class="cur-cell card-glass">
        <div class="cur-ic">💎</div>
        <div class="cur-name">天玑</div>
        <div class="cur-val">{{ userStore.jade }}</div>
      </div>
    </section>

    <section class="status-row card-glass">
      <div class="st-item">
        <span class="st-label">灵气</span>
        <span class="st-val">{{ userStore.qi }} / {{ userStore.maxQi }}</span>
      </div>
      <div class="st-divider"></div>
      <div class="st-item">
        <span class="st-label">心境</span>
        <span class="st-val">{{ userStore.mood }} <em class="st-tip" v-if="userStore.mood > 80">暴击</em></span>
      </div>
    </section>

    <!-- 收藏图鉴聚合（画境/神位/法器/情绪，数据来自各模块 store）-->
    <section class="collection card-glass">
      <div class="col-head">收藏图鉴</div>
      <div
        class="col-item"
        v-for="c in collections"
        :key="c.key"
        v-feedback="'BUTTON_CLICK'"
        @click="go(c.route)"
      >
        <span class="col-ic">{{ c.icon }}</span>
        <div class="col-body">
          <div class="col-top">
            <span class="col-name">{{ c.name }}</span>
            <span class="col-num">{{ c.cur }}/{{ c.total }}</span>
          </div>
          <div class="col-track"><i :style="{ width: c.pct + '%' }"></i></div>
        </div>
      </div>
    </section>

    <!-- 偏好设置（音效 / 震动 开关，持久化）-->
    <section class="prefs card-glass">
      <div class="pref-head">偏好设置</div>
      <div class="pref-row" @click="toggleSound(!userStore.soundOn)">
        <span class="pref-ic">🔊</span>
        <span class="pref-name">音效</span>
        <span class="switch" :class="{ on: userStore.soundOn }"><i></i></span>
      </div>
      <div class="pref-row" @click="toggleHaptic(!userStore.hapticOn)">
        <span class="pref-ic">📳</span>
        <span class="pref-name">震动</span>
        <span class="switch" :class="{ on: userStore.hapticOn }"><i></i></span>
      </div>
    </section>

    <section class="menu-list card-glass">
      <div
        class="menu-item"
        v-for="m in menus"
        :key="m.key"
        v-feedback="'BUTTON_CLICK'"
        @click="m.route ? go(m.route) : (m.action ? m.action() : undefined)"
      >
        <span class="menu-ic">{{ m.icon }}</span>
        <span class="menu-name">{{ m.name }}</span>
        <span class="menu-arrow" v-if="m.route">›</span>
      </div>
    </section>

    <!-- 新手帮助：重看引导（不清空进度）-->
    <OnboardingOverlay :open="showHelp" replay @finish="showHelp = false" />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'Me' });
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useModulesStore, useUserStore, useContentStore } from '@/stores/index';
import { vFeedback, audio, haptic } from '@/core/feedback';
import { useNameModal } from '@/composables/useNameModal';
import { useAvatarModal } from '@/composables/useAvatarModal';
import Avatar from '@/components/Avatar.vue';
import OnboardingOverlay from '@/components/OnboardingOverlay.vue';
import { EMOTIONS } from '@/constants/bottle';
import { PET_ELEMENTS } from '@/stores/useModulesStore';

const router = useRouter();
const userStore = useUserStore();
const modulesStore = useModulesStore();
const content = useContentStore();
const nameModal = useNameModal();
const avatarModal = useAvatarModal();

function go(route: string) {
  router.push(`/app/${route}`);
}

/** 头像底环五行：已选头像→该 emoji 的五行属性；未选（首字态）→ 默认紫（传 ''） */
const avatarElement = computed(() => {
  const a = userStore.avatar;
  if (!a) return '' as const;
  return modulesStore.poolConfig.avatars.find((x) => x.emoji === a)?.element ?? ('' as const);
});

/** 点头像区开换头像弹窗（弹窗内已写入 store，无需再处理返回值） */
function openAvatar() {
  avatarModal.open();
}

/** 点昵称区开起名弹窗（手动改名模式，带入当前名作为初始值） */
function openRename() {
  nameModal.open({ mode: 'edit', initial: userStore.nickname ?? '' });
}

/** 偏好开关：写 store（自动持久化）+ 实时切换引擎 */
function toggleSound(v: boolean) {
  userStore.soundOn = v;
  audio.setEnabled(v);
  if (v) audio.play('soft'); // 开启时给一声轻反馈
}
function toggleHaptic(v: boolean) {
  userStore.hapticOn = v;
  haptic.setEnabled(v);
}

/** 收藏图鉴聚合：各模块收集进度（cur/total/pct）+ 跳转路由 */
const collections = computed(() => {
  const m = modulesStore;
  const gLen = content.wallpapers.length + content.hiddenWallpapers.length; // 真实可得总数（常规+隐藏），与内容层一致
  const gCur = m.galleryUnlocked.length;
  const dLen = m.shrineDeities.length;
  const dCur = m.shrineDeities.filter((d) => m.isDeityUnlocked(d.id)).length;
  const aLen = m.artifactList.length;
  const aCur = m.artifactList.filter((a) => m.isArtifactUnlocked(a.id)).length;
  const eLen = EMOTIONS.length;
  const eCur = (m.emotionBottle.emotionsSeen || []).length; // P0：情绪图鉴用永久收录，满溢倒空不再清零
  const pLen = PET_ELEMENTS.length;
  const pCur = m.pet.ownedPets.length;
  const mk = (key: string, icon: string, name: string, cur: number, total: number, route: string) => ({
    key, icon, name, cur, total, route, pct: total ? Math.round((cur / total) * 100) : 0,
  });
  return [
    mk('gallery', '🖼️', '画境壁纸', gCur, gLen, 'gallery'),
    mk('shrine', '🏯', '神位供奉', dCur, dLen, 'shrine'),
    mk('artifacts', '🪔', '法器收藏', aCur, aLen, 'artifacts'),
    mk('pet', '🐾', '仙宠图鉴', pCur, pLen, 'pet'),
    mk('bottle', '🫙', '情绪图鉴', eCur, eLen, 'bottle'),
  ];
});

const menus = [
  { key: 'gallery', icon: '🖼️', name: '我的画境', route: 'gallery' },
  { key: 'artifacts', icon: '🪔', name: '法器背包', route: 'artifacts' },
  { key: 'bottle', icon: '🫙', name: '情绪博物馆', route: 'bottle' },
  { key: 'help', icon: '🌟', name: '新手帮助', action: () => { showHelp.value = true; } },
];

/** 新手帮助：重看引导序列（replay，不清空已有进度） */
const showHelp = ref(false);
</script>

<style scoped>
.me-page { padding-top: 16px; display: flex; flex-direction: column; gap: 16px; }

/* ===== 个人资料 ===== */
.profile-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  border-radius: var(--radius-card, 20px);
  cursor: pointer;
  touch-action: manipulation;
  transition: opacity .1s ease;
}
.profile-header:active { opacity: .7; }
.profile-info { flex: 1; }
.nick-row { display: flex; align-items: center; gap: 6px; }
.nickname { font-size: 18px; font-weight: 700; color: var(--text-primary); }
.nick-unnamed {
  color: var(--accent, #8A80D8);
  font-weight: 600;
  font-size: 16px;
  letter-spacing: .5px;
}
.nick-edit {
  margin-left: 2px;
  font-size: 13px;
  color: var(--text-muted);
  opacity: .6;
}
.tag-zhiyin {
  padding: 1px 7px;
  border-radius: 7px;
  background: rgba(214, 180, 93, .18);
  color: #A8842D;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .5px;
}
.lv-row {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.lv-badge {
  padding: 2px 8px;
  border-radius: 8px;
  background: rgba(214, 180, 93, .22);
  color: #A8842D;
  font-size: 11px;
  font-weight: 700;
}
.exp-text { font-size: 12px; color: var(--text-muted); }

/* ===== 4货币网格 ===== */
.currency-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.cur-cell {
  padding: 14px 8px 12px;
  border-radius: var(--radius-card, 20px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.cur-ic { font-size: 22px; line-height: 1; }
.cur-name { margin-top: 4px; font-size: 11px; color: var(--text-muted); }
.cur-val { font-size: 14px; font-weight: 700; color: var(--text-primary); }

/* ===== 状态行 ===== */
.status-row {
  display: flex;
  align-items: center;
  padding: 14px 18px;
  border-radius: var(--radius-card, 20px);
}
.st-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.st-label { font-size: 11px; color: var(--text-muted); }
.st-val { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.st-tip {
  font-style: normal;
  padding: 1px 6px;
  border-radius: 6px;
  background: rgba(236, 110, 110, .15);
  color: #C94F4F;
  font-size: 10px;
  font-weight: 700;
  margin-left: 4px;
}
.st-divider {
  width: 1px;
  height: 24px;
  background: var(--divider);
}

/* ===== 收藏图鉴聚合 ===== */
.collection {
  padding: 16px 16px 8px;
  border-radius: var(--radius-card, 20px);
}
.col-head {
  font-size: 13px; font-weight: 700; color: var(--text-primary);
  margin-bottom: 10px; padding-left: 2px;
}
.col-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 4px;
  border-bottom: 1px solid var(--divider);
  cursor: pointer; touch-action: manipulation;
  transition: opacity .1s ease;
}
.col-item:last-child { border-bottom: 0; }
.col-item:active { opacity: .7; }
.col-ic { font-size: 22px; width: 30px; text-align: center; flex: 0 0 auto; }
.col-body { flex: 1; min-width: 0; }
.col-top {
  display: flex; align-items: baseline; justify-content: space-between;
  margin-bottom: 6px;
}
.col-name { font-size: 13px; color: var(--text-primary); font-weight: 500; }
.col-num { font-size: 12px; color: var(--text-muted); font-weight: 600; }
.col-track {
  height: 6px; border-radius: 10px;
  background: var(--track-bg);
  overflow: hidden;
}
.col-track i {
  display: block; height: 100%; border-radius: 10px;
  background: linear-gradient(90deg, #8A80D8, #A39AE8);
  transition: width .4s ease;
}

/* ===== 菜单列表 ===== */
.menu-list {
  padding: 4px 14px;
  border-radius: var(--radius-card, 20px);
}
.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 6px;
  border-bottom: 1px solid var(--divider);
  cursor: pointer;
  touch-action: manipulation;
  transition: opacity .1s ease;
}
.menu-item:last-child { border-bottom: 0; }
.menu-item:active { opacity: .7; }
.menu-ic { font-size: 20px; width: 28px; text-align: center; }
.menu-name { flex: 1; font-size: 14px; color: var(--text-primary); font-weight: 500; }
.menu-arrow { font-size: 20px; color: var(--text-muted); }
.prefs { padding: 4px 16px 8px; }
.pref-head { font-size: 13px; color: var(--text-secondary, #8a8a99); padding: 8px 0 2px; }
.pref-row { display: flex; align-items: center; gap: 12px; padding: 13px 0; cursor: pointer; }
.pref-ic { font-size: 18px; }
.pref-name { flex: 1; font-size: 15px; color: var(--text-primary, #2a2a33); }
.switch { width: 44px; height: 26px; border-radius: 999px; background: rgba(0,0,0,.12); position: relative; transition: background .2s; flex: none; }
.switch.on { background: var(--accent, #8A80D8); }
.switch i { position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.2); transition: left .2s; }
.switch.on i { left: 21px; }
</style>
