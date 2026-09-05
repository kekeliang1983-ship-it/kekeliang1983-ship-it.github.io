<!-- src/views/gallery/GalleryPage.vue —— 画境 全屏子页（无Tab，左上返回）-->
<template>
  <div class="gallery-page app-page">
    <nav class="sub-nav">
      <BackButton />
      <h1 class="nav-title">画境</h1>
      <CornerButton tone="accent" aria-label="画境指南" @click="showGuide = true">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      </CornerButton>
    </nav>

    <!-- ===== 五行 · 灵植元宝加成总览 ===== -->
    <section class="bonus-section card-glass">
      <div class="bs-head">
        <div class="bs-title">五行 · 灵植元宝加成</div>
        <p class="bs-sub">集齐同属性壁纸，永久提升对应灵植的元宝产量</p>
      </div>
      <div class="bs-grid">
        <div
          v-for="r in bonusRows"
          :key="r.key"
          class="el-tile"
          :style="tileStyle(r.key)"
        >
          <span class="el-emoji">{{ r.emoji }}</span>
          <span class="el-name">{{ r.label }}</span>
          <span class="el-val">
            <template v-if="r.bonus > 0">+{{ r.bonus }}%</template>
            <template v-else>—</template>
          </span>
          <span class="el-unit">元宝产出</span>
          <div class="el-bar"><i :style="{ width: r.pct + '%' }"></i></div>
          <span class="el-stat" :class="{ done: r.missing === 0 }">
            {{ r.missing === 0 ? '已集满 ✓' : `还差 ${r.missing} 张` }}
          </span>
        </div>
      </div>
    </section>

    <!-- 今日缘定属性提示（优化A） -->
    <p class="theme-hint" v-if="freeThemeLabel && pendingFreeCount > 0">
      今日缘定 · <b>{{ freeThemeLabel }}</b> · 免费壁纸里多属它，集齐同属性有惊喜
    </p>

    <!-- ===== 分类 tab：全部 + 后台策展集合（精选等）+ 五行，顺序由后台 order 控制 ===== -->
    <div class="tabs">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="tab"
        :class="{ active: tab === t.key, 'tab-collection': t.key.startsWith('c:') }"
        v-feedback="'BUTTON_CLICK'"
        @click="tab = t.key"
      ><span v-if="t.icon" class="tab-ic">{{ t.icon }}</span>{{ t.label }}</button>
    </div>

    <!-- ===== 竖屏壁纸网格（手机比例） ===== -->
    <section class="wp-grid">
      <div
        v-for="wp in filtered"
        :key="wp.id"
        class="wp-card"
        :class="{ unlocked: isUnlocked(wp.id), free: isFree(wp.id), locked: !isUnlocked(wp.id) && !isFree(wp.id) }"
        v-feedback="'BUTTON_CLICK'"
        @click="openPreview(wp)"
      >
        <div class="wp-screen" :style="screenStyle(wp)">
          <img v-if="wp.src" class="wp-thumb" :src="wp.src" :alt="wp.name" />
          <span v-else class="wp-emoji">{{ wp.emoji }}</span>
          <span v-if="isUnlocked(wp.id)" class="badge done">✓</span>
          <span v-else-if="isFree(wp.id)" class="badge free">免费</span>
          <span v-else class="badge lock">🔒</span>
        </div>
        <div class="wp-name">{{ wp.name }}</div>
        <div class="wp-meta">
          <span class="wp-qual" :class="wp.quality">{{ QUALITY_LABEL[wp.quality] }}</span>
          <span class="wp-elem">{{ elementLabel(wp.element) }}</span>
        </div>
      </div>
    </section>

    <!-- ===== 隐藏壁纸（旅行掉落专属，获得后才显现） ===== -->
    <section class="hidden-zone" v-if="hiddenUnlocked.length">
      <h3 class="hz-title">✦ 隐藏壁纸 <span class="hz-tip">旅行长线掉落 · 已集 {{ hiddenUnlocked.length }}/{{ content.hiddenWallpapers.length }}</span></h3>
      <div class="hz-grid">
        <div
          v-for="wp in hiddenUnlocked"
          :key="wp.id"
          class="wp-card unlocked"
          v-feedback="'BUTTON_CLICK'"
          @click="openPreview(wp)"
        >
          <div class="wp-screen" :style="screenStyle(wp)">
            <img v-if="wp.src" class="wp-thumb" :src="wp.src" :alt="wp.name" />
            <span v-else class="wp-emoji">{{ wp.emoji }}</span>
            <span class="badge done">✓</span>
          </div>
          <div class="wp-name">{{ wp.name }}</div>
          <div class="wp-meta">
            <span class="wp-qual" :class="wp.quality">{{ QUALITY_LABEL[wp.quality] }}</span>
            <span class="wp-elem hz-tag">隐藏</span>
          </div>
        </div>
      </div>
    </section>
    <section class="hidden-zone empty" v-else>
      <h3 class="hz-title">✦ 隐藏壁纸</h3>
      <p class="hz-empty">完成长线旅行（6h / 12h）有机会带回隐藏壁纸，集齐它们吧～</p>
    </section>

    <!-- ============ 手机样机预览 + 长按存图 ============ -->
    <Overlay variant="modal" :open="!!preview" @close="closePreview">
      <div class="phone" v-if="preview">
        <div class="screen" :style="screenStyle(preview)">
          <div class="notch"></div>
          <div class="statusbar"><span>9:41</span><span class="sb-r">●●● &nbsp;📶&nbsp;🔋</span></div>
          <!-- 已解锁/免费：真实 <img>，长按即唤起系统存图菜单（iOS/Android 通用） -->
          <img v-if="previewUrl" class="wp-img" :src="previewUrl" :alt="preview.name" />
          <!-- 未解锁：仅预览，不提供存图 -->
          <div v-else class="wp-locked">
            <span class="lk-emoji">{{ preview.emoji }}</span>
            <span class="lk-tip">解锁后可保存到相册</span>
          </div>
        </div>
        <div class="cap">
          <b>{{ preview.name }}</b>
          <span>{{ elementLabel(preview.element) }} · {{ QUALITY_LABEL[preview.quality] }}</span>
        </div>
        <p class="hint" v-if="previewUrl">长按上方图片即可保存到手机相册</p>
        <div class="actions">
          <button v-if="previewUrl" class="btn-save" v-feedback="'BUTTON_CLICK'" @click="downloadWallpaper(preview)">
            保存 / 分享到相册
          </button>
          <button v-else class="btn-unlock" v-feedback="'BUTTON_CLICK'" @click="unlockFromPreview(preview)">
            解锁收藏（{{ priceText(preview.price) }}）
          </button>
        </div>
      </div>
    </Overlay>

    <!-- ============ 画境指南 modal ============ -->
    <Overlay variant="modal" :open="showGuide" @close="showGuide = false">
      <div class="guide-card">
        <div class="g-head"><b>画境指南</b></div>
        <div class="g-body">
          <div class="g-item"><span class="g-ic">🖼️</span><div><b>五行画廊</b><p>壁纸按金木水火土分类，集齐同属性壁纸可永久提升对应灵植的元宝产量</p></div></div>
          <div class="g-item"><span class="g-ic">🎁</span><div><b>缘份免费</b><p>每日首次进入随机刷新 3 张免费缘份壁纸，可直接收藏，无需货币；其中常含「今日缘定」属性，集齐同属性更有惊喜</p></div></div>
          <div class="g-item"><span class="g-ic">💎</span><div><b>三档品质</b><p>凡品(元宝30) / 灵品(灵珠20) / 仙品(魔丸15或天玑1，每日限1张)；集齐同属性全部该品质壁纸，加成分别 +5% / +8% / +12%</p></div></div>
          <div class="g-item"><span class="g-ic">📲</span><div><b>保存壁纸</b><p>点开壁纸进入手机预览，已收藏的可长按图片直接存到相册，或用「保存/分享」按钮走系统分享</p></div></div>
          <div class="g-item"><span class="g-ic">🐾</span><div><b>旅行带回</b><p>仙宠长途 / 远行归来，有几率捎回一张未见的隐藏壁纸自动收进画境；集齐六张有稀有小庆</p></div></div>
          <div class="g-item"><span class="g-ic">🎀</span><div><b>初见赠礼</b><p>10 张真实壁纸已为你免费解锁，逛逛画境就能直接欣赏、保存</p></div></div>
        </div>
      </div>
    </Overlay>

    <!-- ============ 集齐庆祝（属性全套 / 隐藏全收集由旅行触发） ============ -->
    <Overlay variant="modal" :open="celebrate.open" @close="celebrate.open = false">
      <div class="celebrate-card">
        <div class="light-sweep"></div>
        <span class="spark s1">✦</span><span class="spark s2">✧</span>
        <span class="spark s3">✦</span><span class="spark s4">✧</span>
        <p class="c-eyebrow">✦ 画境小成 ✦</p>
        <div class="thumb">{{ celebrate.emoji }}</div>
        <h2 class="c-title">{{ celebrate.title }}</h2>
        <p class="c-sub">{{ celebrate.sub }}</p>
        <button class="c-btn primary" v-feedback="'BUTTON_CLICK'" @click="celebrate.open = false">收下喜悦</button>
      </div>
    </Overlay>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import BackButton from '@/components/navigation/BackButton.vue';
import CornerButton from '@/components/common/CornerButton.vue';
import Overlay from '@/components/common/Overlay.vue';
import { vFeedback, audio } from '@/core/feedback';
import { useModulesStore } from '@/stores/index';
import { useContentStore } from '@/stores/index';
import { useToast } from '@/composables/useToast';
import { useConfirm } from '@/composables/useConfirm';
import {
  GALLERY_ELEMENTS, GALLERY_QUALITY_BONUS, QUALITY_LABEL, ELEMENT_COLORS,
  type IWallpaper,
} from '@/constants/gallery';
import type { ElementType } from '@/types/index';

const modulesStore = useModulesStore();
const content = useContentStore();
const { showToast } = useToast();
const { ask: askConfirm } = useConfirm();

const ELEMENT_LABEL: Record<ElementType, string> = {
  gold: '金', wood: '木', water: '水', fire: '火', earth: '土',
};
const ELEMENT_EMOJI: Record<ElementType, string> = {
  gold: '🪙', wood: '🌳', water: '💧', fire: '🔥', earth: '⛰️',
};

/**
 * tab = 全部(0) + 后台策展集合(order 由后台配，默认 50) + 五行(100+)，统一按 order 升序。
 * 集合 tab 的 key 加 `c:` 前缀 —— 防御后台把集合 id 起成 'gold' 之类与元素撞名的情况。
 * 想让集合排在哪，后台改 order 即可（如精选 order=1 → 落在「全部」与「金」之间）。
 */
interface ITab { key: string; label: string; icon?: string; order: number }
const tabs = computed<ITab[]>(() => {
  const list: ITab[] = [{ key: 'all', label: '全部', order: 0 }];
  for (const c of content.collections) {
    list.push({ key: `c:${c.id}`, label: c.label, icon: c.icon, order: c.order ?? 50 });
  }
  GALLERY_ELEMENTS.forEach((e, i) => {
    list.push({ key: e.key, label: e.label, order: 100 + i });
  });
  return list.sort((a, b) => a.order - b.order);
});

const tab = ref('all');
/** 集合在后台被删/改名 → 当前 tab 失效时自动回退「全部」，绝不白屏（铁律13⑦自愈） */
watch(tabs, (ts) => {
  if (!ts.some((t) => t.key === tab.value)) tab.value = 'all';
});

const filtered = computed(() => {
  const list = content.wallpapers.filter((w) => !w.hidden); // 隐藏壁纸不进常规 tab
  if (tab.value === 'all') return list;
  if (tab.value.startsWith('c:')) {
    const col = content.collections.find((c) => c.id === tab.value.slice(2));
    if (!col) return list;
    // 按后台 ids 顺序展示 → 后台拖动 ids 即可调整集合内部排序
    return col.ids
      .map((id) => list.find((w) => w.id === id))
      .filter((w): w is IWallpaper => !!w);
  }
  return list.filter((w) => w.element === tab.value);
});

/** 今日缘定属性标签（优化A）：今日免费壁纸里多属它的属性，给收集期待 */
const freeThemeLabel = computed(() => {
  const t = modulesStore.galleryFreeTheme;
  return t ? (GALLERY_ELEMENTS.find((e) => e.key === t)?.label || '') : '';
});
/** 今日还剩几张免费壁纸可投（用于缘定提示显隐） */
const pendingFreeCount = computed(() => {
  const today = new Date().toISOString().slice(0, 10);
  if (modulesStore.galleryFreeDate !== today) return 0;
  return modulesStore.galleryFreeIds.filter((id) => !modulesStore.galleryUnlocked.includes(id)).length;
});
/** 五行加成总览：每属性当前加成 / 收集进度 / 还差几张 */
const bonusRows = computed(() =>
  GALLERY_ELEMENTS.map((e) => {
    const all = content.allWallpapers.filter((w) => w.element === e.key);
    const total = all.length;
    const missing = all.filter((w) => !modulesStore.galleryUnlocked.includes(w.id)).length;
    return {
      key: e.key,
      label: e.label,
      emoji: ELEMENT_EMOJI[e.key],
      bonus: Math.round(modulesStore.elementBonus(e.key) * 100),
      pct: total ? Math.round(((total - missing) / total) * 100) : 0,
      missing,
    };
  }),
);

/** 五行柔色转 rgba（用于每属性卡片底色 / 强调色） */
function hexToRgba(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
/** 每属性卡片：柔色底 + 元素强调色（驱动 emoji 环 / 进度条），让五行一眼可辨 */
function tileStyle(el: ElementType) {
  const c = ELEMENT_COLORS[el];
  return {
    background: `linear-gradient(160deg, ${hexToRgba(c.from, 0.30)}, ${hexToRgba(c.to, 0.44)})`,
    borderColor: hexToRgba(c.to, 0.55),
    '--el': c.to,
  } as Record<string, string>;
}

/** 已获得的隐藏壁纸（未获得则不显示，保持神秘感） */
const hiddenUnlocked = computed(() => content.hiddenWallpapers.filter((w) => isUnlocked(w.id)));

const isUnlocked = (id: string) => modulesStore.galleryUnlocked.includes(id);
const isFree = (id: string) =>
  modulesStore.galleryFreeIds.includes(id) && modulesStore.galleryFreeDate === new Date().toISOString().slice(0, 10);

function elementLabel(el: ElementType) {
  return ELEMENT_LABEL[el];
}

function screenStyle(wp: IWallpaper) {
  const c = ELEMENT_COLORS[wp.element];
  return { background: `linear-gradient(160deg, ${c.from}, ${c.to})` };
}

function priceText(price: IWallpaper['price']): string {
  const parts: string[] = [];
  if (price.gold) parts.push(`${price.gold}元宝`);
  if (price.pearl) parts.push(`${price.pearl}灵珠`);
  if (price.magic) parts.push(`${price.magic}魔丸`);
  if (price.jade) parts.push(`${price.jade}天玑`);
  return parts.join(' / ');
}

/* ---------- 预览 / 样机 ---------- */
const preview = ref<IWallpaper | null>(null);
const previewUrl = ref('');

function openPreview(wp: IWallpaper) {
  preview.value = wp;
  // 仅已解锁/免费可生成可存图（避免未付费被长按存走）
  // 展示模态用原图（清晰，长按保存即原图）；列表缩略图用 wp.src 小图（省流量）
  previewUrl.value = isUnlocked(wp.id) || isFree(wp.id) ? (wp.originalSrc || wp.src || generateWallpaper(wp)) : '';
}
function closePreview() {
  preview.value = null;
  previewUrl.value = '';
}

/* ---------- Canvas 生成手机壁纸（9:19.5），输出 dataURL 供 <img> 长按 / 分享 ---------- */
function generateWallpaper(wp: IWallpaper): string {
  const W = 1080, H = 2340;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  if (!ctx) return '';
  const col = ELEMENT_COLORS[wp.element];
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, col.from);
  g.addColorStop(1, col.to);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // 主 emoji
  ctx.font = '460px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(wp.emoji, W / 2, H * 0.4);
  // 标题
  ctx.font = 'bold 76px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,.96)';
  ctx.shadowColor = 'rgba(0,0,0,.35)';
  ctx.shadowBlur = 16;
  ctx.fillText(wp.name, W / 2, H * 0.82);
  // 副标
  ctx.font = '42px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,.82)';
  ctx.fillText(`${QUALITY_LABEL[wp.quality]} · 仙宠小院`, W / 2, H * 0.875);
  return c.toDataURL('image/png');
}

/* ---------- 保存到相册：原生分享优先，降级 <a download>（见下方统一实现，避免重复） ---------- */
async function unlockFromPreview(wp: IWallpaper) {
  if (!(await askConfirm({ title: '收藏壁纸', message: `确定收藏「${wp.name}」吗？`, cost: wp.price }))) return;
  const r = modulesStore.unlockWallpaper(wp.id);
  if (r.success) {
    audio.play('success');
    previewUrl.value = generateWallpaper(wp);
    if (r.completedElement) {
      // 【P2 快乐度】集齐某属性全套 → 庆祝 + 心境（心境已在 store 施加，此处仅庆祝）
      celebrate.value.emoji = ELEMENT_EMOJI[r.completedElement] || '🖼️';
      celebrate.value.title = `${ELEMENT_LABEL[r.completedElement]}系壁纸 · 集齐！`;
      celebrate.value.sub = `同属性全套收齐，对应灵植元宝产出再上一层，心境也更愉悦（已 +3）`;
      celebrate.value.open = true;
    } else {
      showToast(`收藏成功 · ${wp.name}（心境 +1）`);
    }
  } else if (r.reason === '货币不足') { audio.play('error'); showToast(`货币不足（需 ${priceText(wp.price)}）`); }
  else if (r.reason === '今日仙品已达上限') showToast('今日仙品已达上限');
  else if (r.reason) showToast(r.reason);
}

/** 集齐属性全套庆祝弹层（P2 快乐度） */
const celebrate = ref({ open: false, emoji: '🖼️', title: '', sub: '' });

/** 优化D：保存壁纸后给予"设为今日心境壁纸"仪式感 */
async function downloadWallpaper(wp: IWallpaper) {
  const url = wp.originalSrc || previewUrl.value || generateWallpaper(wp);
  if (!url) return;
  try {
    const blob = await (await fetch(url)).blob();
    const file = new File([blob], `${wp.name}.png`, { type: 'image/png' });
    const nav = navigator as any;
    if (nav.canShare && nav.canShare({ files: [file] })) {
      await nav.share({ files: [file], title: wp.name });
      audio.play('success');
      showToast('已存为今日心境壁纸 🌿');
      return;
    }
  } catch (e) {
    /* 用户取消分享或无分享能力，走降级 */
  }
  // 降级：浏览器直接下载
  const a = document.createElement('a');
  a.href = url;
  a.download = `${wp.name}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  audio.play('success');
  showToast('已存为今日心境壁纸 🌿');
}

const showGuide = ref(false);

onMounted(() => {
  modulesStore.refreshDailyFree();
});
</script>

<style scoped>
.gallery-page { padding-top: 8px; display: flex; flex-direction: column; gap: 14px; }

.sub-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 2px 8px;
}
.nav-title { font-size: 17px; font-weight: 700; color: var(--text-primary); letter-spacing: .5px; }

/* 五行 · 灵植元宝加成总览 */
.bonus-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border-radius: var(--radius-card, 20px);
}
.bs-head { display: flex; flex-direction: column; gap: 2px; }
.bs-title { font-size: 14px; font-weight: 700; color: var(--text-primary); letter-spacing: .3px; }
.bs-sub { margin: 0; font-size: 11px; color: var(--text-muted); line-height: 1.45; }

.bs-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
.el-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 4px 9px;
  border-radius: 14px;
  border: 1px solid transparent;
  background: rgba(255,255,255,.30);
}
.el-emoji {
  width: 30px; height: 30px; border-radius: 50%;
  display: grid; place-items: center; font-size: 15px;
  background: #fff;
  box-shadow: 0 2px 6px rgba(0,0,0,.08), 0 0 0 2px var(--el, #ccc);
}
.el-name { font-size: 12px; font-weight: 700; color: var(--text-primary); line-height: 1; }
.el-val { font-size: 15px; font-weight: 800; color: var(--accent-gold, #D6B45D); line-height: 1; }
.el-unit { font-size: 9px; color: var(--text-muted); margin-top: -2px; letter-spacing: .5px; }
.el-bar { width: 100%; height: 4px; border-radius: 4px; background: rgba(255,255,255,.55); overflow: hidden; margin-top: 2px; }
.el-bar i { display: block; height: 100%; border-radius: 4px; background: var(--el, #8a80d8); transition: width .4s ease; }
.el-stat { font-size: 9px; color: var(--text-muted); white-space: nowrap; }
.el-stat.done { color: #6FBF8A; font-weight: 700; }

/* 今日缘定属性提示 */
.theme-hint { margin: 0; font-size: 12px; color: var(--text-secondary); text-align: center; }
.theme-hint b { color: var(--accent-gold, #D6B45D); }

/* tabs */
.tabs { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px; }
.tab {
  flex: 1;
  min-width: 44px;
  padding: 7px 0;
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
/* 策展集合 tab（如「⭐精选」）字数多于单字元素，按内容给宽，避免挤成两行 */
.tab-collection { flex: 0 0 auto; min-width: 58px; padding: 7px 10px; }
.tab-collection.active { background: rgba(255, 236, 190, .72); }
.tab-ic { margin-right: 3px; font-size: 11px; }

/* ===== 竖屏壁纸网格 ===== */
.wp-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }

/* 隐藏壁纸专区 */
.hidden-zone { margin-top: 18px; padding-top: 16px; border-top: 1px dashed rgba(138,128,216,.28); }
.hz-title { display: flex; align-items: baseline; gap: 8px; margin: 0 0 12px; font-size: 15px; color: var(--text-primary); }
.hz-tip { font-size: 11px; font-weight: 400; color: var(--accent); }
.hz-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
.hz-tag { color: #a07bd8; font-weight: 600; }
.hz-empty { margin: 0; font-size: 12px; color: var(--text-muted); line-height: 1.6; }
.wp-card {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  cursor: pointer; touch-action: manipulation;
  transition: opacity .1s ease, transform .12s ease;
}
.wp-card:active { opacity: .85; transform: scale(.97); }

/* 手机比例屏幕 */
.wp-screen {
  width: 100%;
  aspect-ratio: 9 / 19.5;
  border-radius: 16px;
  display: flex; align-items: center; justify-content: center;
  position: relative; overflow: hidden;
  box-shadow: 0 8px 18px rgba(80, 60, 30, .18);
  border: 1px solid rgba(255,255,255,.5);
}
.wp-card.locked .wp-screen { filter: saturate(.7) brightness(.96); }
.wp-emoji { font-size: 46px; filter: drop-shadow(0 4px 10px rgba(0,0,0,.18)); }
.wp-card.locked .wp-emoji { opacity: .55; }
/* 真实壁纸缩略图（铺满卡片，badge 浮于其上） */
.wp-thumb { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }

.badge {
  position: absolute; top: 7px; left: 7px;
  font-size: 10px; font-weight: 700;
  padding: 2px 7px; border-radius: 9px;
  backdrop-filter: blur(4px);
}
.badge.done { background: rgba(214,180,93,.9); color: #fff; }
.badge.free { background: rgba(140,120,220,.92); color: #fff; }
.badge.lock { background: rgba(40,40,50,.55); color: #fff; font-size: 13px; padding: 2px 8px; }

.wp-name { font-size: 13px; font-weight: 700; color: var(--text-primary); text-align: center; }
.wp-meta { display: flex; gap: 6px; align-items: center; }
.wp-qual {
  font-size: 10px; padding: 1px 7px; border-radius: 8px; font-weight: 600;
  background: rgba(138,128,216,.16); color: var(--accent);
}
.wp-qual.uncommon { background: rgba(90,160,220,.18); color: #3C7FB0; }
.wp-qual.legendary { background: rgba(214,180,93,.22); color: #A8842D; }
.wp-elem { font-size: 10px; color: var(--text-muted); }

/* ===== 手机样机预览 ===== */
.phone {
  width: 280px;
  margin: 0 auto;
  background: #0d0d12;
  border-radius: 42px;
  padding: 12px;
  box-shadow: 0 24px 60px rgba(0,0,0,.45);
}
.screen {
  position: relative;
  width: 100%;
  aspect-ratio: 9 / 19.5;
  border-radius: 30px;
  overflow: hidden;
}
.notch {
  position: absolute; top: 0; left: 50%; transform: translateX(-50%);
  width: 110px; height: 24px;
  background: #0d0d12;
  border-radius: 0 0 16px 16px;
  z-index: 3;
}
.statusbar {
  position: absolute; top: 14px; left: 0; right: 0;
  display: flex; justify-content: space-between;
  padding: 0 26px;
  font-size: 11px; font-weight: 600;
  color: rgba(0,0,0,.5);
  z-index: 4; pointer-events: none;
}
.wp-img {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: cover;
  /* 关键：保留系统长按菜单（iOS 长按存图 / Android 长按下载） */
  -webkit-touch-callout: default;
  -webkit-user-select: none;
  user-select: none;
}
.wp-locked {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 14px;
  background: rgba(0,0,0,.18);
}
.lk-emoji { font-size: 84px; filter: grayscale(.3) drop-shadow(0 4px 12px rgba(0,0,0,.3)); }
.lk-tip { font-size: 12px; color: rgba(0,0,0,.55); font-weight: 600; }

.cap { text-align: center; margin-top: 14px; display: flex; flex-direction: column; gap: 3px; }
.cap b { font-size: 15px; color: #fff; }
.cap span { font-size: 11px; color: rgba(255,255,255,.65); }
.hint { text-align: center; font-size: 11px; color: rgba(255,255,255,.6); margin: 8px 0 2px; }
.actions { display: flex; margin-top: 8px; }
.btn-save, .btn-unlock {
  flex: 1;
  padding: 12px 0;
  border: none; border-radius: 14px;
  font-size: 14px; font-weight: 700;
  cursor: pointer;
  color: #2a2113;
  background: linear-gradient(135deg, #F4E3B0, #E2C076);
}
.btn-unlock { color: #fff; background: linear-gradient(135deg, #8C78DC, #6E5BC4); }
.btn-save:active, .btn-unlock:active { transform: scale(.98); }

/* 指南（1:1 复用情绪瓶/法器指南弹框样式） */
.guide-card { display: flex; flex-direction: column; gap: 12px; }
.g-head b { font-size: 16px; font-weight: 700; color: var(--text-primary); }
.g-body { display: flex; flex-direction: column; gap: 10px; }
.g-item { display: flex; gap: 10px; align-items: flex-start; padding: 10px; border-radius: 14px;
  background: rgba(255,255,255,.5); }
.g-ic { width: 34px; height: 34px; border-radius: 11px; background: var(--accent-soft, rgba(140,120,220,.14));
  display: grid; place-items: center; font-size: 16px; flex: 0 0 auto; }
.g-item b { display: block; font-size: 12.5px; color: var(--text-primary); }
.g-item p { margin: 2px 0 0; font-size: 11px; line-height: 1.5; color: var(--text-muted); }

/* ============ 集齐庆祝卡（属性全套） ============ */
.celebrate-card {
  position: relative; width: 100%; max-width: 320px;
  padding: 30px 24px 24px; border-radius: 24px; overflow: hidden; text-align: center;
  background: radial-gradient(120% 90% at 50% -10%, #5a4318 0%, #2c2008 55%, #181204 100%);
  border: 1.5px solid rgba(255, 214, 130, .55);
  box-shadow: 0 20px 60px rgba(0, 0, 0, .5), inset 0 0 40px rgba(255, 198, 96, .12);
}
.light-sweep {
  position: absolute; top: -60%; left: -30%; width: 60%; height: 220%;
  background: linear-gradient(90deg, transparent, rgba(255, 224, 150, .35), transparent);
  transform: rotate(18deg); animation: sweep 2.6s ease-in-out infinite; pointer-events: none;
}
@keyframes sweep { 0% { left: -40%; } 60%, 100% { left: 120%; } }
.spark { position: absolute; color: #ffe3a0; font-size: 14px; opacity: .85; text-shadow: 0 0 8px rgba(255, 210, 120, .9); animation: twinkle 2s ease-in-out infinite; }
.s1 { top: 18px; left: 24px; } .s2 { top: 26px; right: 30px; animation-delay: .4s; }
.s3 { bottom: 64px; left: 32px; animation-delay: .8s; } .s4 { bottom: 80px; right: 26px; animation-delay: 1.2s; }
@keyframes twinkle { 0%, 100% { opacity: .3; transform: scale(.8); } 50% { opacity: 1; transform: scale(1.15); } }
.c-eyebrow { position: relative; margin: 0 0 14px; font-size: 13px; letter-spacing: 2px; color: #ffe6ad; text-shadow: 0 1px 4px rgba(0, 0, 0, .6); }
.celebrate-card .thumb {
  position: relative; width: 120px; height: 120px; margin: 0 auto 16px; border-radius: 18px;
  display: flex; align-items: center; justify-content: center; font-size: 60px;
  background: linear-gradient(135deg, #3a2c0e, #1c1505); border: 1.5px solid rgba(255, 214, 130, .6);
  box-shadow: 0 8px 26px rgba(0, 0, 0, .45), inset 0 0 24px rgba(255, 198, 96, .18);
  animation: pop .5s cubic-bezier(.2, .9, .3, 1.3) both;
}
@keyframes pop { from { transform: scale(.4); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.c-title { position: relative; margin: 0; font-size: 21px; font-weight: 700; color: #fff; text-shadow: 0 2px 6px rgba(0, 0, 0, .7), 0 0 14px rgba(255, 205, 110, .55); }
.c-sub { position: relative; margin: 10px 0 20px; font-size: 13px; line-height: 1.6; color: #f3ead0; text-shadow: 0 1px 3px rgba(0, 0, 0, .6); }
.celebrate-card .c-btn { width: 100%; padding: 12px 0; border: none; border-radius: 14px; font-size: 14px; font-weight: 600; cursor: pointer; }
.celebrate-card .c-btn.primary { background: linear-gradient(135deg, #ffd884, #f0a93c); color: #3a2606; box-shadow: 0 6px 18px rgba(240, 169, 60, .45); }
.celebrate-card .c-btn.primary:active { transform: scale(.97); }
</style>
