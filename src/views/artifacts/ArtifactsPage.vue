<!-- src/views/artifacts/ArtifactsPage.vue —— 法器 全屏子页 -->
<template>
  <div class="artifacts-page app-page">
    <nav class="sub-nav">
      <BackButton />
      <h1 class="nav-title">法器</h1>
      <CornerButton tone="accent" aria-label="法器指南" @click="showGuide = true">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      </CornerButton>
    </nav>

    <div class="page-body">
      <!-- ===== hero 大卡：当前选中法器 ===== -->
      <section class="hero card-glass" :class="{ locked: !selectedUnlocked }">
        <div class="hero-ic">
          <img v-if="selCfg.image" :src="selCfg.image" class="ic-img" alt="">
          <span v-else>{{ selCfg.emoji }}</span>
        </div>
        <div class="hero-info">
          <div class="h-name">{{ selCfg.name }}</div>
          <div class="h-blurb">{{ selCfg.blurb }}</div>
          <div class="h-effect" v-if="selectedUnlocked">{{ formatArtifactEffect(selCfg.effect, selected.level, MAX_LEVEL) }}</div>
          <div class="h-effect locked" v-else>🔒 {{ selCfg.unlockText }}</div>
          <div class="h-frag" :class="{ online: selCfg.onlineOnly }">
            {{ selCfg.onlineOnly ? '联机后开启' : `碎片来源 · ${selCfg.fragSource}` }}
          </div>
        </div>
      </section>

      <!-- ===== 装备槽指示点 ===== -->
      <div class="slots">
        <span
          v-for="c in artifactList"
          :key="c.id"
          class="slot-dot"
          :class="{ on: slotEquipped(c.id) }"
          :title="c.name"
        ></span>
        <span class="slots-tip">已共鸣 {{ equippedCount }} / {{ artifactList.length }}（可全部开启）</span>
      </div>

      <!-- ===== 分类 tab ===== -->
      <div class="tabs">
        <button
          v-for="t in TABS"
          :key="t.key"
          class="tab"
          :class="{ active: tab === t.key }"
          v-feedback="'BUTTON_CLICK'"
          @click="tab = t.key"
        >{{ t.label }}</button>
      </div>

      <!-- ===== 我的法器网格 ===== -->
      <section class="artifact-grid">
        <div
          v-for="c in filtered"
          :key="c.id"
          class="artifact-card card-glass"
          :class="{ equipped: slotEquipped(c.id), locked: !unlockedOf(c.id), sel: c.id === selectedId, online: c.onlineOnly }"
          v-feedback="'BUTTON_CLICK'"
          @click="selectedId = c.id"
        >
          <div class="art-ic">
            <img v-if="c.image" :src="c.image" class="ic-img" alt="">
            <span v-else>{{ c.emoji }}</span>
          </div>
          <div class="art-name">{{ c.name }}</div>
          <template v-if="unlockedOf(c.id)">
            <div class="art-lv">Lv.{{ artOf(c.id)?.level }}</div>
            <div class="art-frag">碎片 {{ artOf(c.id)?.fragments }}</div>
            <div class="art-status">{{ slotEquipped(c.id) ? '已装备' : '可装备' }}</div>
          </template>
          <template v-else>
            <div class="art-lock">🔒</div>
            <div class="art-lock-txt">{{ c.onlineOnly ? '联机后开启' : c.unlockText }}</div>
          </template>
        </div>
      </section>

      <!-- ===== 养成操作卡（仅已解锁） ===== -->
      <section class="raise card-glass" v-if="selectedUnlocked">
        <div class="r-title">养成 · {{ selCfg.name }}</div>
        <div class="r-row">
          <span>当前等级</span>
          <b>Lv.{{ selected.level }}<em v-if="isMaxLevel" class="max-tag">已满级</em></b>
        </div>
        <template v-if="!isMaxLevel">
          <div class="r-row">
            <span>碎片</span><b>{{ selected.fragments }} / {{ UPGRADE_FRAG }}</b>
          </div>
          <div class="frag-bar"><i :style="{ width: fragPct + '%' }"></i></div>
        </template>
        <div class="r-row">
          <span>效果</span><b class="r-eff">{{ formatArtifactEffect(selCfg.effect, selected.level, MAX_LEVEL) }}</b>
        </div>
        <div class="r-src">碎片来源 · {{ selCfg.fragSource }}</div>
        <div class="r-actions">
          <button
            class="btn-equip"
            :class="{ on: selected.equipped }"
            :disabled="selectedOnlineOnly"
            v-feedback="'BUTTON_CLICK'"
            @click="onToggle"
          >{{ selected.equipped ? '卸下' : '装备' }}</button>
          <button
            class="btn-up"
            :disabled="selectedOnlineOnly || isMaxLevel || selected.fragments < UPGRADE_FRAG"
            v-feedback="'BUTTON_CLICK'"
            @click="onUpgrade"
          >{{ upLabel }}</button>
        </div>
        <div class="r-online" v-if="selectedOnlineOnly">🌐 结界符需联机后开放，届时守护灵田即可生效</div>
      </section>
    </div>

    <!-- ============ 法器指南 modal ============ -->
    <Overlay variant="modal" :open="showGuide" @close="showGuide = false">
      <div class="guide-card">
        <div class="g-head"><b>法器指南</b></div>
        <div class="g-body">
          <div class="g-item"><span class="g-ic">🔔</span><div><b>达成解锁</b><p>五件法器各有成就门槛（收获 / 在线 / 守护 / 听歌 / 满溢），达成即永久解锁，可自由装备</p></div></div>
          <div class="g-item"><span class="g-ic">🥣</span><div><b>装备生效</b><p>招财铃增灵植元宝、聚灵碗快灵气恢复、空灵笛翻听歌魔丸、轮回珠保满溢天玑；结界符减访客借走（联机后开放）</p></div></div>
          <div class="g-item"><span class="g-ic">☸️</span><div><b>碎片升阶</b><p>每件法器的碎片来自它守护的版块：招财铃→灵植收获、聚灵碗→累计在线、空灵笛→天籁聆听、轮回珠→情绪瓶满溢。集 3 枚升 1 级，满级 5 级效果最强</p></div></div>
        </div>
      </div>
    </Overlay>

    <!-- ============ 法器解锁庆祝卡（P2：达成门槛不再静默） ============ -->
    <Overlay variant="modal" :open="!!celebrateId" @close="closeCelebrate">
      <div class="celebrate">
        <div class="ce-ic">{{ celebrateCfg?.emoji }}</div>
        <div class="ce-kicker">法器解锁</div>
        <div class="ce-name">{{ celebrateCfg?.name }}</div>
        <div class="ce-blurb">{{ celebrateCfg?.blurb }}</div>
        <div class="ce-eff">{{ celebrateCfg ? formatArtifactEffect(celebrateCfg.effect, 1, MAX_LEVEL) : '' }}</div>
        <div class="ce-src">碎片来源 · {{ celebrateCfg?.fragSource }}</div>
        <button class="ce-ok" v-feedback="'BUTTON_CLICK'" @click="closeCelebrate">收下这份机缘</button>
      </div>
    </Overlay>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import BackButton from '@/components/navigation/BackButton.vue';
import CornerButton from '@/components/common/CornerButton.vue';
import Overlay from '@/components/common/Overlay.vue';
import { vFeedback, audio } from '@/core/feedback';
import { useModulesStore, formatArtifactEffect } from '@/stores/index';
import { useToast } from '@/composables/useToast';
import { type ArtifactId } from '@/types/index';

const modulesStore = useModulesStore();
const { showToast } = useToast();

/** 配置态：满级 / 升级碎片消耗，来自后台 artifacts.json（改配置即时生效） */
const MAX_LEVEL = computed(() => modulesStore.artifactConfig.params.maxLevel);
const UPGRADE_FRAG = computed(() => modulesStore.artifactConfig.params.upgradeFrag);
/** 法器配置列表（后台驱动；运行态进度不在此） */
const artifactList = computed(() => modulesStore.artifactList);

const TABS = [
  { key: 'all', label: '全部' },
  { key: 'unlocked', label: '已解锁' },
  { key: 'locked', label: '未解锁' },
] as const;
type TabKey = typeof TABS[number]['key'];
const tab = ref<TabKey>('all');

const selectedId = ref<ArtifactId>('bell');

const artOf = (id: ArtifactId) => modulesStore.artifacts.find((a) => a.id === id);
const unlockedOf = (id: ArtifactId) => modulesStore.isArtifactUnlocked(id);
const slotEquipped = (id: ArtifactId) => artOf(id)?.equipped ?? false;

const selCfg = computed(() => modulesStore.artifactMap[selectedId.value]);
const selected = computed(() => artOf(selectedId.value)!);
const selectedUnlocked = computed(() => unlockedOf(selectedId.value));
const equippedCount = computed(() => modulesStore.artifacts.filter((a) => a.equipped).length);

const filtered = computed(() => {
  if (tab.value === 'unlocked') return artifactList.value.filter((c) => unlockedOf(c.id));
  if (tab.value === 'locked') return artifactList.value.filter((c) => !unlockedOf(c.id));
  return artifactList.value;
});

const upLabel = computed(() => {
  const a = selected.value;
  if (a.level >= MAX_LEVEL.value) return '已满级';
  if (a.fragments < UPGRADE_FRAG.value) return `升级(${a.fragments}/${UPGRADE_FRAG.value})`;
  return '升 1 级';
});

/** 结界符：需联机才生效，单机下禁用装备/升级（P0-2） */
const selectedOnlineOnly = computed(() => !!selCfg.value?.onlineOnly);
const isMaxLevel = computed(() => selected.value.level >= MAX_LEVEL.value);
/** 碎片进度（满级按 100% 展示） */
const fragPct = computed(() => {
  const a = selected.value;
  if (!a || a.level >= MAX_LEVEL.value) return 100;
  return Math.min(100, (a.fragments / UPGRADE_FRAG.value) * 100);
});

/* 解锁庆祝卡：消费 store 的待庆祝队列（达成门槛时由各产出点入队） */
const celebrateId = computed(() => modulesStore.pendingArtifactUnlocks[0] ?? null);
const celebrateCfg = computed(() => (celebrateId.value ? modulesStore.artifactMap[celebrateId.value] : null));
watch(celebrateId, (id) => { if (id) audio.play('success'); });
function closeCelebrate() {
  if (celebrateId.value) modulesStore.shiftPendingArtifactUnlock();
}

/* tab 切换：若当前选中项已被过滤掉，自动切到列表首项，避免 hero 与网格割裂（P3） */
watch(tab, () => {
  if (!filtered.value.some((c) => c.id === selectedId.value)) {
    selectedId.value = filtered.value[0]?.id ?? selectedId.value;
  }
});

function onToggle() {
  if (selectedOnlineOnly.value) { showToast('结界符需联机后开放'); return; }
  if (!selectedUnlocked.value) { showToast('尚未解锁'); return; }
  audio.play('soft');
  modulesStore.toggleEquip(selectedId.value);
}
function onUpgrade() {
  if (selectedOnlineOnly.value) { showToast('结界符需联机后开放'); return; }
  const r = modulesStore.upgradeArtifact(selectedId.value);
  if (r.success) { audio.play('success'); showToast(`${selCfg.value.name} 升至 Lv.${selected.value.level}`); }
  else if (r.reason === 'max') showToast('已是满级');
  else if (r.reason === 'frag') { audio.play('error'); showToast(`碎片不足（需 ${UPGRADE_FRAG.value}）`); }
}

const showGuide = ref(false);
</script>

<style scoped>
.artifacts-page { padding-top: 8px; }
.page-body { display: flex; flex-direction: column; gap: 14px; }

.sub-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 2px 8px;
}
.nav-title { font-size: 17px; font-weight: 700; color: var(--text-primary); letter-spacing: .5px; }

/* hero */
.hero {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border-radius: var(--radius-card, 20px);
}
.hero.locked { opacity: .72; }
.hero-ic {
  width: 62px; height: 62px;
  border-radius: 20px;
  background: linear-gradient(135deg, #FBEFD2, #F2DFA7);
  display: flex; align-items: center; justify-content: center;
  font-size: 32px; flex-shrink: 0;
  filter: drop-shadow(0 4px 10px rgba(242, 223, 167, .4));
}
.hero-info { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
/* 立绘（后台上传）：填充图标框，溢出裁切，留空则回退 emoji */
.hero-ic .ic-img, .art-ic .ic-img {
  width: 100%; height: 100%; object-fit: cover; border-radius: inherit; display: block;
}
.h-name { font-size: 16px; font-weight: 700; color: var(--text-primary); }
.h-blurb { font-size: 12px; color: var(--text-muted); line-height: 1.4; }
.h-effect { font-size: 12px; font-weight: 600; color: var(--accent-gold, #D6B45D); }
.h-effect.locked { color: var(--text-muted); font-weight: 500; }
.h-frag { margin-top: 2px; font-size: 11px; color: var(--text-muted); line-height: 1.4; }
.h-frag.online { color: var(--accent); font-weight: 600; }

/* 装备槽点 */
.slots { display: flex; align-items: center; gap: 8px; padding: 0 4px; }
.slot-dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: rgba(138, 128, 216, .2);
  transition: background .2s ease, box-shadow .2s ease;
}
.slot-dot.on {
  background: var(--accent-gold, #D6B45D);
  box-shadow: 0 0 8px rgba(214, 180, 93, .5);
}
.slots-tip { font-size: 11px; color: var(--text-muted); margin-left: auto; }

/* tabs */
.tabs { display: flex; gap: 8px; }
.tab {
  flex: 1;
  padding: 8px 0;
  border-radius: 12px;
  border: 1px solid var(--card-border, rgba(255,255,255,.58));
  background: rgba(255,255,255,.3);
  font-size: 13px; font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  transition: all .18s ease;
}
.tab.active {
  color: var(--text-primary);
  background: rgba(255,255,255,.6);
  border-color: rgba(214, 180, 93, .5);
}

/* grid */
.artifact-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.artifact-card {
  padding: 16px 12px 14px;
  border-radius: var(--radius-card, 20px);
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  position: relative; cursor: pointer; touch-action: manipulation;
  transition: border-color .2s ease, opacity .1s ease;
}
.artifact-card:active { opacity: .72; }
.artifact-card.equipped {
  border-color: rgba(214, 180, 93, .45);
  box-shadow: 0 10px 24px rgba(67,82,120,.08), 0 0 0 1px rgba(214,180,93,.28), 0 0 18px rgba(214,180,93,.12);
}
.artifact-card.sel { border-color: rgba(138, 128, 216, .55); }
.artifact-card.locked { opacity: .6; }
.art-ic {
  width: 50px; height: 50px; border-radius: 16px;
  background: linear-gradient(135deg, #FBEFD2, #F2DFA7);
  display: flex; align-items: center; justify-content: center;
  font-size: 26px; margin-bottom: 4px;
  filter: drop-shadow(0 4px 10px rgba(242, 223, 167, .4));
}
.art-name { font-size: 14px; font-weight: 700; color: var(--text-primary); }
.art-lv { font-size: 11px; color: var(--accent-gold, #D6B45D); font-weight: 700; }
.art-frag { font-size: 11px; color: var(--text-muted); }
.art-status {
  margin-top: 2px; font-size: 10px; padding: 2px 8px; border-radius: 8px;
  background: rgba(138, 128, 216, .14); color: var(--accent); font-weight: 600;
}
.artifact-card.equipped .art-status { background: rgba(214, 180, 93, .22); color: #A8842D; }
.art-lock { font-size: 18px; margin-top: 2px; }
.art-lock-txt { font-size: 10px; color: var(--text-muted); text-align: center; line-height: 1.3; padding: 0 4px; }

/* 养成卡 */
.raise { padding: 14px 16px; border-radius: var(--radius-card, 20px); display: flex; flex-direction: column; gap: 8px; }
.r-title { font-size: 14px; font-weight: 700; color: var(--text-primary); }
.r-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: var(--text-muted); }
.r-row b { color: var(--text-primary); font-weight: 600; }
.r-eff { color: var(--accent-gold, #D6B45D) !important; font-weight: 700 !important; text-align: right; max-width: 60%; }
.max-tag {
  margin-left: 6px; font-style: normal; font-size: 10px; font-weight: 700;
  padding: 2px 6px; border-radius: 8px;
  background: rgba(214, 180, 93, .22); color: #A8842D;
}
/* 碎片进度条（P3：比 "x / 3" 更直观） */
.frag-bar {
  height: 6px; border-radius: 999px; overflow: hidden;
  background: rgba(138, 128, 216, .14);
}
.frag-bar i {
  display: block; height: 100%; border-radius: 999px;
  background: linear-gradient(90deg, #E4C87A, #D6B45D);
  transition: width .3s ease;
}
.r-src { font-size: 11px; color: var(--text-muted); line-height: 1.4; }
.r-online {
  font-size: 11px; color: var(--accent); line-height: 1.4;
  padding: 8px 10px; border-radius: 10px; background: rgba(138, 128, 216, .1);
}
.r-actions { display: flex; gap: 10px; margin-top: 4px; }
.btn-equip, .btn-up {
  flex: 1; padding: 10px 0; border-radius: 12px;
  font-size: 13px; font-weight: 700; cursor: pointer;
  border: 1px solid var(--card-border, rgba(255,255,255,.58));
  background: rgba(255,255,255,.45); color: var(--text-primary);
  transition: all .18s ease;
}
.btn-equip.on { background: rgba(214, 180, 93, .22); border-color: rgba(214, 180, 93, .5); color: #A8842D; }
.btn-equip:disabled, .btn-up:disabled { opacity: .45; cursor: not-allowed; }
/* 结界符（联机后开启）卡片：淡紫描边，与"未解锁灰"区分 */
.artifact-card.online { border-style: dashed; border-color: rgba(138, 128, 216, .45); }

/* 解锁庆祝卡 */
.celebrate {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  text-align: center; padding: 6px 2px 2px;
}
.ce-ic {
  width: 76px; height: 76px; border-radius: 24px;
  background: linear-gradient(135deg, #FBEFD2, #F2DFA7);
  display: grid; place-items: center; font-size: 40px;
  filter: drop-shadow(0 6px 14px rgba(242, 223, 167, .5));
  animation: ce-pop .45s cubic-bezier(.34, 1.56, .64, 1);
}
@keyframes ce-pop {
  0% { transform: scale(.6); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
.ce-kicker { font-size: 11px; letter-spacing: 3px; color: var(--accent-gold, #D6B45D); font-weight: 700; }
.ce-name { font-size: 20px; font-weight: 700; color: var(--text-primary); margin-top: -2px; }
.ce-blurb { font-size: 12px; color: var(--text-muted); line-height: 1.5; }
.ce-eff { font-size: 12.5px; font-weight: 700; color: var(--accent-gold, #D6B45D); }
.ce-src { font-size: 11px; color: var(--text-muted); }
.ce-ok {
  margin-top: 6px; width: 100%; padding: 11px 0; border-radius: 14px;
  font-size: 14px; font-weight: 700; cursor: pointer;
  border: 1px solid rgba(214, 180, 93, .5);
  background: linear-gradient(135deg, #F6E4B8, #E9D08A);
  color: #8A6A20;
  transition: transform .16s ease, box-shadow .16s ease;
}
.ce-ok:active { transform: scale(.97); }

/* 指南（遮罩/面板由 Overlay 统一提供；样式 1:1 复用情绪瓶指南弹框） */
.guide-card { display: flex; flex-direction: column; gap: 12px; }
.g-head b { font-size: 16px; font-weight: 700; color: var(--text-primary); }
.g-body { display: flex; flex-direction: column; gap: 10px; }
.g-item { display: flex; gap: 10px; align-items: flex-start; padding: 10px; border-radius: 14px;
  background: rgba(255,255,255,.5); }
.g-ic { width: 34px; height: 34px; border-radius: 11px; background: var(--accent-soft, rgba(140,120,220,.14));
  display: grid; place-items: center; font-size: 16px; flex: 0 0 auto; }
.g-item b { display: block; font-size: 12.5px; color: var(--text-primary); }
.g-item p { margin: 2px 0 0; font-size: 11px; line-height: 1.5; color: var(--text-muted); }
</style>
