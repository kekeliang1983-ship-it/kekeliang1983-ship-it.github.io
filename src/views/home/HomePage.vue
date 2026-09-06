<!--
  src/views/home/HomePage.vue
  ⚠️  严格1:1复刻 _preview/stage0-skeleton-vD-GSAP.html（L467~592，首页.page容器内容）
  ⚠️  违反规则 = 用户愤怒。所有CSS值/HTML结构/类名/SVG图标 逐字复制，禁止凭记忆重写
  ⚠️  仅静态文本→Pinia动态绑定的位置做最小替换

  【动态字段契约（与设计稿方案D-GSAP + project_memory对齐）】
  1. 欢迎标题：nickname存在→Hi，{昵称} ✦ / 不存在→Hi，灵境见 ✦
  2. 灵植副标题：N块地 / M成熟（N=plots.length；M=plots里status==='ready'的数量）
  3. 天籁副标题：听过→听歌 MM分；没听过→已解锁 N 首
  4. 仙宠副标题：traveling→旅行中 Xh；否则→在家
  5. 画境副标题：已收藏 X张
  6. 神龛副标题：今日 N/3 次 · 每次 3 根（方案B加粗主色）
  7. 法器副标题：已装备 X/3（分母固定=3，01-全局规则L46-L51有5件法器，仅3槽可装备）
  8. 情绪瓶副标题：X/30 颗
  9. 今日心语：min-height:180px 自适应（height改min-height）
--><template>
  <div class="home-page">
    <!-- 首页最下层底图（内容层可换图；未配置时不渲染，回退全局渐变底） -->
    <div class="home-bg" v-if="homeBgStyle" :style="homeBgStyle"></div>

    <!-- ================================================================
         §十 欢迎区（L470~490 确认稿1:1）
         标题：Hi，{昵称} ✦ / Hi，灵境见 ✦（project_memory 昵称硬要求）
         副标题：动态「今日宜 · ...」（按player数据拼接短语）
    ================================================================ -->
    <section class="welcome-section">
      <div class="welcome-copy">
        <h1 class="welcome-title">Hi，{{ displayNickname }} <span class="spark">✦</span></h1>
        <p class="welcome-sub">{{ suitablePhrase }}</p>
      </div>
      <div class="header-actions">
        <CornerButton aria-label="漂流信箱" :badge="modulesStore.driftInboxUnread" @click="driftOpen = true">
          <svg viewBox="0 0 24 24">
            <path d="M4 4h7v16l-3.5-2L4 20z"/>
            <path d="M9 4h7v16l-3.5-2L9 20z"/>
          </svg>
        </CornerButton>
        <CornerButton aria-label="通知" :badge="userStore.notifUnread" @click="noticeOpen = true">
          <svg viewBox="0 0 24 24">
            <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </CornerButton>
        <!-- 七日灵签（签到）：未签到显示红点 + 轻微悬浮呼吸，制造「未完成」的轻度牵挂 -->
        <CornerButton
          aria-label="签到"
          :badge="!checkinStore.isCheckedInToday"
          :class="{ 'ck-breathe': !checkinStore.isCheckedInToday }"
          @click="checkinOpen = true"
        >
          <svg viewBox="0 0 24 24">
            <rect x="3" y="5" width="18" height="16" rx="3"/>
            <path d="M8 3v4M16 3v4M3 10h18"/>
            <path d="M9 15l2.5 2.5L16 12"/>
          </svg>
        </CornerButton>
      </div>
    </section>

    <!-- ================================================================
         §十一 Hero Banner（L493~503 确认稿1:1）
    ================================================================ -->
    <section
      class="hero-banner"
      v-feedback="'BUTTON_CLICK'"
      @click="onHeroClick"
      @mouseenter="stopHeroAuto"
      @mouseleave="startHeroAuto"
    >
      <template v-if="heroSlides.length">
        <div class="hero-track" :class="heroTransition" :style="trackStyle">
          <div
            v-for="(s, i) in heroSlides"
            :key="s.id"
            class="hero-slide"
            :class="{ active: i === heroIndex }"
          >
            <div v-if="s.bgType === 'video'" class="hero-bg">
              <HeroVideo :src="s.bgVideo || ''" :poster="s.videoPoster" :playing="i === heroIndex" :crossfade="banner.videoCrossfade !== false" />
            </div>
            <div v-else class="hero-bg" :style="bgStyleOf(s)"></div>
            <div v-if="!s.bgImage && !s.bgVideo && s.bgEmoji" class="hero-emoji">{{ s.bgEmoji }}</div>
          </div>
        </div>
        <!-- 独立粒子层：跨帧保活，切帧只换参数不重建 -->
        <BannerParticles
          v-if="currentSlide.particles && currentSlide.particles.enabled"
          :particles="currentSlide.particles"
        />
        <div class="hero-overlay"></div>
        <div class="hero-content">
          <h2 class="hero-title" :style="titleBlockStyle(currentSlide)">
            <div
              v-for="(ln, i) in currentSlide.titleLines"
              :key="i"
              class="hero-line"
              :style="lineStyle(ln)"
            >{{ ln.text }}</div>
          </h2>
          <p
            v-if="currentSlide.subtitle"
            class="hero-sub"
            :style="subStyle(currentSlide)"
          >{{ currentSlide.subtitle }}</p>
          <button class="hero-cta" :style="buttonStyle(currentSlide)">{{ currentSlide.buttonText }}</button>
        </div>
        <div v-if="heroShowDots" class="hero-dots">
          <span
            v-for="(s, i) in heroSlides"
            :key="'dot' + s.id"
            class="dot"
            :class="{ on: i === heroIndex }"
            @click.stop="goHeroSlide(i)"
          ></span>
        </div>
      </template>
      <div v-else class="hero-bg"></div>
    </section>

    <!-- ================================================================
         §十三 第一层功能 4个（L506~531 确认稿1:1）
         副标题全动态：灵植 / 天籁 / 仙宠 / 画境
    ================================================================ -->
    <section class="feature-grid-4" id="grid4">
      <div class="f-card" v-feedback="'BUTTON_CLICK'" :class="{ 'has-bg': hasCardBg('farm') }" :style="cardStyle('farm')" @click="navigate('/app/farm')">
        <div class="f-icon fi-plant" :style="iconStyle('farm')">
          <img v-if="f('farm').icon" class="f-icon-img" :src="f('farm').icon" alt="" />
          <svg v-else viewBox="0 0 24 24"><path d="M12 22c6-7 9-11 9-15A9 9 0 0 0 3 7c0 4 3 8 9 15z"/><path d="M12 22V11"/><path d="M12 11C9 11 6 8 7 5"/></svg>
        </div>
        <b>{{ f('farm').name || '灵植' }}</b><s>{{ plantSubtitle }}</s>
      </div>
      <div class="f-card" v-feedback="'BUTTON_CLICK'" :class="{ 'has-bg': hasCardBg('music') }" :style="cardStyle('music')" @click="navigate('/app/music')">
        <div class="f-icon fi-music" :style="iconStyle('music')">
          <img v-if="f('music').icon" class="f-icon-img" :src="f('music').icon" alt="" />
          <svg v-else viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
        </div>
        <b>{{ f('music').name || '天籁' }}</b><s>{{ musicSubtitle }}</s>
      </div>
      <div class="f-card" v-feedback="'BUTTON_CLICK'" :class="{ 'has-bg': hasCardBg('pet') }" :style="cardStyle('pet')" @click="navigate('/app/pet')">
        <span class="pet-badge" v-if="petHungry">饿了</span>
        <div class="f-icon fi-pet" :style="iconStyle('pet')">
          <img v-if="f('pet').icon" class="f-icon-img" :src="f('pet').icon" alt="" />
          <svg v-else viewBox="0 0 24 24"><circle cx="5" cy="10" r="1.2"/><circle cx="19" cy="10" r="1.2"/><path d="M12 22c3-3 6-5 6-9a6 6 0 0 0-12 0c0 4 3 6 6 9z"/><path d="M10 14c1 1 3 1 4 0"/></svg>
        </div>
        <b>{{ f('pet').name || '仙宠' }}</b><s>{{ petSubtitle }}</s>
      </div>
      <div class="f-card" v-feedback="'BUTTON_CLICK'" :class="{ 'has-bg': hasCardBg('gallery') }" :style="cardStyle('gallery')" @click="navigate('/app/gallery')">
        <div class="f-icon fi-paint" :style="iconStyle('gallery')">
          <img v-if="f('gallery').icon" class="f-icon-img" :src="f('gallery').icon" alt="" />
          <svg v-else viewBox="0 0 24 24"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
        </div>
        <b>{{ f('gallery').name || '画境' }}</b><s>{{ paintSubtitle }}</s>
      </div>
    </section>

    <!-- ================================================================
         §十四 第二层功能 3个（L534~553 确认稿1:1）
         神龛：方案B 12px#5B5F70 + N/3主色加粗
         法器：已装备 X/3
         情绪瓶：X/30 颗
    ================================================================ -->
    <section class="feature-grid-3" id="grid3">
      <div class="f-card fi-shrine-card" v-feedback="'BUTTON_CLICK'" :class="{ 'has-bg': hasCardBg('shrine') }" :style="cardStyle('shrine')" @click="navigate('/app/shrine')">
        <div class="f-icon fi-shrine" :style="iconStyle('shrine')">
          <img v-if="f('shrine').icon" class="f-icon-img" :src="f('shrine').icon" alt="" />
          <svg v-else viewBox="0 0 24 24"><path d="M4 7 L12 2 L20 7 L19 8.5 L5 8.5 Z"/><path d="M7 8.5 L7 18 L17 18 L17 8.5"/><path d="M9 13h6"/><path d="M11 16h2"/></svg>
        </div>
        <b>{{ f('shrine').name || '神龛' }}</b><s>{{ buffActive ? '神恩加持中' : '今日上香 ' + modulesStore.shrineOffersToday + ' 次' }}</s>
      </div>
      <div class="f-card" v-feedback="'BUTTON_CLICK'" :class="{ 'has-bg': hasCardBg('artifacts') }" :style="cardStyle('artifacts')" @click="navigate('/app/artifacts')">
        <div class="f-icon fi-artifact" :style="iconStyle('artifacts')">
          <img v-if="f('artifacts').icon" class="f-icon-img" :src="f('artifacts').icon" alt="" />
          <svg v-else viewBox="0 0 24 24"><path d="M7 7h10v2H7z"/><path d="M5 9h14l-1.5 9H6.5z"/><path d="M9 14h6"/><path d="M12 3c0.5 1 -0.5 1.5 0 2"/></svg>
        </div>
        <b>{{ f('artifacts').name || '法器' }}</b><s>{{ artifactSubtitle }}</s>
      </div>
      <div class="f-card" v-feedback="'BUTTON_CLICK'" :class="{ 'has-bg': hasCardBg('bottle') }" :style="cardStyle('bottle')" @click="navigate('/app/bottle')">
        <div class="f-icon fi-bottle" :style="iconStyle('bottle')">
          <img v-if="f('bottle').icon" class="f-icon-img" :src="f('bottle').icon" alt="" />
          <svg v-else viewBox="0 0 24 24"><path d="M9 3h6v4c0 2 2 3 2 6v7a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-7c0-3 2-4 2-6V3z"/><path d="M10 15c1 1.5 3 1.5 4 0"/><circle cx="12" cy="13" r="0.5" fill="#489EA2"/></svg>
        </div>
        <b>{{ f('bottle').name || '情绪瓶' }}</b><s>{{ bottleSubtitle }}</s>
      </div>
    </section>

    <!-- ================================================================
         §十六 今日心语（L556~592 确认稿1:1）
         ⚠️ height:180px → min-height:180px（project_memory硬约束：文字过长时自动撑高）
    ================================================================ -->
    <section class="quote-card" :style="quoteCardStyle">
      <div class="quote-top">
        <h3>{{ quoteCfg.title || '今日心语' }}</h3>
        <button class="refresh" v-feedback="'BUTTON_CLICK'" @click="rotateQuote">
          <span class="refresh-ic" ref="refreshIcRef">↻</span> {{ quoteCfg.refreshText || '换一句' }}
        </button>
      </div>
      <p ref="quoteTextRef" v-html="currentQuote.html"></p>

      <!-- 动态漂浮物：配了 flowerImage 就用图片（沿用 .quote-flower 类名，GSAP 漂浮动画照常生效），
           未配置则回退内置 SVG 花朵（严格复制确认稿 L566~591） -->
      <img v-if="quoteCfg.flowerImage" class="quote-flower quote-flower-img" :src="quoteCfg.flowerImage" alt="" />
      <svg v-else class="quote-flower" viewBox="0 0 180 180" fill="none">
        <path d="M110 170 C 108 140 100 125 110 105" stroke="#8673b0" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M110 150 C 100 148 92 142 88 134" stroke="#8673b0" stroke-width="2" stroke-linecap="round" fill="none"/>
        <ellipse cx="92" cy="136" rx="10" ry="5" fill="#a3c7b0" transform="rotate(-35 92 136)"/>
        <ellipse cx="100" cy="158" rx="11" ry="5.5" fill="#a3c7b0" transform="rotate(-18 100 158)"/>
        <g transform="translate(112 90)">
          <ellipse cx="0" cy="-22" rx="12" ry="20" fill="#c4b3ec"/>
          <ellipse cx="0" cy="-22" rx="12" ry="20" fill="#d2c4f0" transform="rotate(60)"/>
          <ellipse cx="0" cy="-22" rx="12" ry="20" fill="#d2c4f0" transform="rotate(120)"/>
          <ellipse cx="0" cy="-22" rx="10" ry="18" fill="#d7caf2" transform="rotate(180)"/>
          <ellipse cx="0" cy="-22" rx="10" ry="18" fill="#d2c4f0" transform="rotate(240)"/>
          <ellipse cx="0" cy="-22" rx="10" ry="18" fill="#cbbceb" transform="rotate(300)"/>
          <circle r="8" fill="#e8c97a"/>
          <circle r="4.5" fill="#d19f4a"/>
        </g>
        <g transform="translate(80 108)">
          <ellipse cx="0" cy="-11" rx="6" ry="10" fill="#e5b4d2"/>
          <ellipse cx="0" cy="-11" rx="6" ry="10" fill="#ecc1da" transform="rotate(72)"/>
          <ellipse cx="0" cy="-11" rx="6" ry="10" fill="#ecc1da" transform="rotate(144)"/>
          <ellipse cx="0" cy="-11" rx="6" ry="10" fill="#ecc1da" transform="rotate(216)"/>
          <ellipse cx="0" cy="-11" rx="6" ry="10" fill="#e8c0d8" transform="rotate(288)"/>
          <circle r="4" fill="#f0d08a"/>
        </g>
        <path d="M155 122 l 6 6 l -3 10 l -9 -3 z" fill="#dcc6ef" transform="rotate(18 155 125)" opacity="0.9"/>
        <path d="M60 62 l 5 5 l -2 8 l -7 -2 z" fill="#ecc7dd" transform="rotate(-20 60 65)" opacity="0.85"/>
      </svg>
    </section>

    <!-- ================================================================
         § 调试按钮：重播入场动画（生产环境自动移除，预览版保留）
         - project_memory 硬约束：生产移除/预览保留
         - 800ms 防重复点击节流（project_memory Anti-Pattern ❌2 防卡死）
    ================================================================ -->
    <button
      v-if="IS_PREVIEW"
      class="debug-replay-btn"
      aria-label="重播入场动画"
      v-feedback="'BUTTON_CLICK'"
      @click="handleReplayIntro"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="23 4 23 10 17 10"/>
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
      </svg>
    </button>

    <!-- 七日灵签（签到面板） -->
    <CheckinModal :open="checkinOpen" @close="checkinOpen = false" />
    <!-- 漂流信箱 -->
    <DriftInboxModal :open="driftOpen" @close="driftOpen = false" />
    <!-- 系统公告 -->
    <NoticeModal :open="noticeOpen" @close="noticeOpen = false" />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'Home' });
import { ref, shallowRef, nextTick, computed, watch, onMounted, onBeforeUnmount, onActivated } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore, useModulesStore, useContentStore, useCheckinStore } from '@/stores/index';
import { vFeedback } from '@/core/feedback';
import { createDebugLogger } from '@/core/debugLogger';
import CornerButton from '@/components/common/CornerButton.vue';
import CheckinModal from '@/components/CheckinModal.vue';
import DriftInboxModal from '@/components/DriftInboxModal.vue';
import NoticeModal from '@/components/NoticeModal.vue';
import BannerParticles from '@/components/BannerParticles.vue';
import HeroVideo from '@/components/HeroVideo.vue';
import type { BannerSlide, BannerTextLine } from '@/stores/useContentStore';

const router = useRouter();
const userStore = useUserStore();
const modulesStore = useModulesStore();
const content = useContentStore();
const checkinStore = useCheckinStore();
/** 签到面板开关 */
const checkinOpen = ref(false);
/** 漂流信箱开关（首页消息 logo 复活为信箱入口） */
const driftOpen = ref(false);
/** 系统公告开关（首页通知铃铛） */
const noticeOpen = ref(false);

/* ============ 首页 Banner（轮播 + 视频 + 粒子），内容层驱动 ============ */
const banner = computed(() => content.bannerContent);
const heroSlides = computed<BannerSlide[]>(() => banner.value.slides || []);
const heroAutoplay = computed(() => banner.value.autoplay !== false);
const heroInterval = computed(() => Math.max(1500, Number(banner.value.interval) || 5000));
const heroTransition = computed(() => (banner.value.transition === 'slide' ? 'slide' : 'fade'));
const heroShowDots = computed(() => banner.value.showDots !== false && heroSlides.value.length > 1);

const heroIndex = ref(0);
const currentSlide = computed<BannerSlide>(() =>
  heroSlides.value[heroIndex.value] || {
    id: 'fallback', bgType: 'image', titleLines: ['静心探索', '发现内在的自己'],
    buttonText: '开始探索', link: '/app/gallery',
  },
);
const trackStyle = computed(() =>
  heroTransition.value === 'slide' ? { transform: `translateX(-${heroIndex.value * 100}%)` } : {},
);

let heroTimer: number | null = null;
function startHeroAuto() {
  stopHeroAuto();
  if (!heroAutoplay.value || heroSlides.value.length <= 1) return;
  heroTimer = window.setInterval(() => {
    if (!heroSlides.value.length) return;
    heroIndex.value = (heroIndex.value + 1) % heroSlides.value.length;
  }, heroInterval.value);
}
function stopHeroAuto() {
  if (heroTimer !== null) { clearInterval(heroTimer); heroTimer = null; }
}
function goHeroSlide(i: number) {
  heroIndex.value = i;
  startHeroAuto(); // 手动切换重置计时
}
function onHeroClick() {
  navigate(currentSlide.value.link || '/app/gallery');
}
function bgStyleOf(s: BannerSlide) {
  const img = s.bgImage;
  return img ? { backgroundImage: `url("${img}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : {};
}

/** 高自由度文案：逐行样式（颜色/字号/粗体/对齐/阴影，未设则继承默认白字） */
function lineStyle(ln: BannerTextLine): Record<string, string> {
  const st: Record<string, string> = {};
  if (ln.color) st.color = ln.color;
  if (ln.size) st.fontSize = ln.size + 'px';
  else st.fontSize = 'inherit';
  if (ln.bold) st.fontWeight = '700';
  if (ln.align) st.textAlign = ln.align;
  if (ln.shadow) {
    const a = typeof ln.shadowOpacity === 'number' && ln.shadowOpacity >= 0 ? ln.shadowOpacity : 0.45;
    st.textShadow = `0 2px 10px rgba(0,0,0,${a})`;
  }
  return st;
}
/** 标题块：行间距（行与行之间的间距），机型无关 */
function titleBlockStyle(s: BannerSlide): Record<string, string> {
  const gap = typeof s.lineGap === 'number' && s.lineGap >= 0 ? s.lineGap : 8;
  return { display: 'flex', flexDirection: 'column', gap: gap + 'px' };
}
/** 副标题块样式 */
function subStyle(s: BannerSlide): Record<string, string> {
  const st: Record<string, string> = {};
  if (s.subtitleColor) st.color = s.subtitleColor;
  if (s.subtitleSize) st.fontSize = s.subtitleSize + 'px';
  if (s.subtitleBold) st.fontWeight = '700';
  return st;
}
/** CTA 按钮样式：背景色 / 文字色 / 缩放幅度（机型无关，所有端一致生效） */
function buttonStyle(s: BannerSlide): Record<string, string> {
  const st: Record<string, string> = {};
  if (s.buttonBg) st.background = s.buttonBg;
  if (s.buttonColor) st.color = s.buttonColor;
  const sc = typeof s.buttonScale === 'number' && s.buttonScale > 0 ? s.buttonScale : 1;
  st.transform = `scale(${sc})`;
  return st;
}
// 内容加载完成（或轮播帧变化）后重置并启动自动播放
watch(heroSlides, () => { heroIndex.value = 0; startHeroAuto(); }, { immediate: true });

/* ================================================================
   首页可编辑内容层（public/content/home.json，后台「首页」模块可视化维护）
   - 最下层底图 / 今日心语（背景卡 + 动态漂浮物）/ 7 大版块白卡（图标 + 卡背景）
   - 统一策略：图片优先，留空则回退内置 SVG/渐变，行为与未配置时完全一致
================================================================ */
const homeBgStyle = computed(() => content.homeBgStyle);
const quoteCfg = computed(() => content.homeQuote);
const quoteCardStyle = computed(() => {
  const img = quoteCfg.value.cardImage;
  return img ? { backgroundImage: `url("${img}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : {};
});
/** 取某版块的白卡配置（未配置返回 {id}，组件据此回退内置） */
const f = (id: string) => content.homeFeature(id);
const hasCardBg = (id: string) => !!f(id).cardImage;
const iconStyle = (id: string) => {
  const img = f(id).icon;
  return img ? { backgroundImage: `url("${img}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : {};
};
const cardStyle = (id: string) => {
  const img = f(id).cardImage;
  return img ? { backgroundImage: `url("${img}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : {};
};

/* ================================================================
   【契约0 环境】生产/预览环境隔离
   - project_memory 硬约束：「重播入场动画」生产移除，预览保留
   - 生产环境构建时 Tree-Shake 整个 `v-if="IS_PREVIEW"` 分支，零 runtime 开销
================================================================ */
const IS_PREVIEW = import.meta.env.MODE !== 'production';
let _replayLock = false;

/** 重播首页入场动画（仅预览模式可用，800ms 防重复点击防卡死） */
function handleReplayIntro() {
  if (!IS_PREVIEW) return;
  if (_replayLock) return;
  _replayLock = true;
  setTimeout(() => { _replayLock = false; }, 800);
  const root = (document.querySelector('.home-page') as HTMLElement) || homeRootRef.value;
  if (root) _buildGsapAnimations(root);
}

/* 今日宜核心判定日志（DEV环境开启；统一走 debugLogger 工具，便于复用/过滤）*/
const _sl = createDebugLogger('今日宜');

/* ================================================================
   【契约1】欢迎标题动态昵称（project_memory硬约束）
   有昵称 → Hi，{昵称} ✦ ；null/空 → Hi，灵境见 ✦
================================================================ */
const displayNickname = computed(() => {
  const n = userStore.nickname;
  return (n && String(n).trim()) ? String(n).trim() : '灵境见';
});

/* ================================================================
   【契约3】7模块动态副标题（project_memory + 方案D-GSAP硬约束）
   全部取computed，store变化自动响应
================================================================ */
const plantSubtitle = computed(() => {
  const total = modulesStore.plots?.length || 0;
  const mature = (modulesStore.plots || []).filter((p) => p.status === 'ready').length;
  return `${total}块地 / ${mature}成熟`;
});

const musicSubtitle = computed(() => {
  const secs = modulesStore.musicListenSeconds || 0;
  if (secs >= 60) return `听歌 ${Math.floor(secs / 60)}分`;
  const unlocked = (modulesStore.musicTracks || []).filter((t) => t.isUnlocked).length;
  // 注：策划原文是「未解锁X首」但实际字段是musicTracks已解锁数组；实际没听过时展示"已解锁 N首"更积极
  return `已解锁 ${unlocked} 首`;
});

const petSubtitle = computed(() => {
  const pet = modulesStore.pet;
  if (!pet) return '在家';
  if (pet.travelStatus === 'traveling' || pet.travelStatus === 'returning') {
    const remain = Math.max(0, (pet.travelEndTimestamp || 0) - Date.now());
    const hours = Math.ceil(remain / (60 * 60 * 1000));
    return `旅行中 ${hours}h`;
  }
  if (pet.hunger < 30) return '饿了 · 快喂喂它';
  return pet.hunger + pet.happiness > 80 ? '灵动 · 可出发' : '在家';
});
/** 仙宠卡片「饿了」角标：饱食<30 且在家时亮（交互对话 L131 建议） */
const petHungry = computed(() => {
  const pet = modulesStore.pet;
  return !!pet && pet.travelStatus === 'idle' && pet.hunger < 30;
});

const paintSubtitle = computed(() => {
  const n = modulesStore.galleryCount || 0;
  return `已收藏 ${n}张`;
});

const artifactSubtitle = computed(() => {
  const equipped = (modulesStore.artifacts || []).filter((a) => a.equipped).length;
  const total = modulesStore.artifactList.length || equipped;
  return `已装备 ${equipped}/${total}`;
});

const bottleSubtitle = computed(() => {
  const b = modulesStore.emotionBottle;
  const cur = b?.currentCount || 0;
  const max = b?.maxCapacity || 30;
  if (cur >= max) return '灵光乍现 · 去领取'; // P1⑤ 满溢引导：点卡片去情绪瓶领灵光
  return `${cur}/${max} 颗`;
});

/* 神恩Buff是否生效中（首页神龛卡片副标题用） */
const buffActive = computed(() =>
  !!modulesStore.activeBuff.type && modulesStore.activeBuff.expireAt > Date.now());

/* ================================================================
   【契约4·已确认版】欢迎副标题「今日宜 · xxx」
   规则（交互对话内容.txt L56 + L77~L85 用户已拍板，严格执行）：
   1) · 后文字 ≤8 字；2) 最多拼 2 个 4 字短语（4+4=8）；
   3) ≥3 命中时按 P1~P6 固定优先级取前 2，不拼第 3；
   4) 只命中 1 个 → 只显示该 4 字词；5) 全命中=0 → 收尾「诸事皆宜」；
   6) 每类 3 条 4 字词随机抽 1（多样性不单调）
   固定优先级：P1上香祈愿 → P2静心耕种 → P3倾诉情绪 → P4喂养仙宠 → P5静心听音 → P6法器装备
================================================================ */
// 每类 3 条严格 4 汉字（用户已确认，禁止擅自改长）
const DAILY_SUITABLE_POOL: Record<string, string[]> = {
  上香祈愿: ['上香祈愿', '三炷许愿', '焚香祈福'],
  静心耕种: ['静心耕种', '松土播种', '浇花修篱'],
  倾诉情绪: ['倾诉情绪', '心事入瓶', '释放心怀'],
  喂养仙宠: ['喂养仙宠', '陪宠互动', '仙宠相伴'],
  静心听音: ['静心听音', '一曲清心', '天籁入耳'],
  法器装备: ['法器装配', '炼化法器', '法宝护身'],
};
// P1→P6 固定排序（任何情况下不shuffle，保证按优先级取前 2）
const SUITABLE_PRIORITY_ORDER = [
  '上香祈愿', '静心耕种', '倾诉情绪', '喂养仙宠', '静心听音', '法器装备',
];
const SUITABLE_FINALE = '诸事皆宜'; // 用户确认收尾选①（4字内）

function _getMockFlags(): Record<string, boolean> {
  const plots = modulesStore.plots || [];
  const hasIdleOrReady = plots.some((p) => p.status === 'idle' || p.status === 'ready');
  const artifacts = modulesStore.artifacts || [];
  const equippedCount = Array.isArray(artifacts)
    ? artifacts.filter((x) => x?.equipped).length
    : 0;
  const eb = modulesStore.emotionBottle || { todayUsed: 0, dailyLimit: 3 };
  const pet = modulesStore.pet || { hunger: 100 };

  // 每项动作的「原始值 + 判定结果」，分别构造便于后面对比（上香改为今日未上过香）
  const f_上香祈愿 = modulesStore.shrineOffersToday < 1;
  const f_静心耕种 = hasIdleOrReady;
  const f_倾诉情绪 = (eb.todayUsed || 0) < (eb.dailyLimit || 3);
  const f_喂养仙宠 = (pet.hunger ?? 100) < 100;
  const f_静心听音 = (modulesStore.musicListenSeconds || 0) < 20 * 60;
  const f_法器装备 = equippedCount < 3;

  const flags: Record<string, boolean> = {
    上香祈愿: f_上香祈愿,
    静心耕种: f_静心耕种,
    倾诉情绪: f_倾诉情绪,
    喂养仙宠: f_喂养仙宠,
    静心听音: f_静心听音,
    法器装备: f_法器装备,
  };

  // —— 使用 debugLogger.group 折叠组（DEV=true时打印，false时整体noop）
  const g = _sl.group('_getMockFlags');
  try {
    g.log('P1 上香祈愿:', f_上香祈愿,
      '| 条件: shrineOffersToday<1 | 原始值:', modulesStore.shrineOffersToday, '次');
    g.log('P2 静心耕种:', f_静心耕种,
      '| 条件: 有idle空闲地/ready成熟地 | plots总数:', plots.length,
      '| idle:', plots.filter((p) => p.status === 'idle').length,
      '| ready:', plots.filter((p) => p.status === 'ready').length);
    g.log('P3 倾诉情绪:', f_倾诉情绪,
      `| 条件: todayUsed<dailyLimit(${eb.dailyLimit || 3})`,
      '| 原始值: todayUsed =', eb.todayUsed || 0);
    g.log('P4 喂养仙宠:', f_喂养仙宠,
      '| 条件: pet.hunger<100 | 原始值: hunger =', (pet.hunger ?? 100),
      '/100, pet.travelStatus=', pet.travelStatus || 'N/A');
    g.log('P5 静心听音:', f_静心听音,
      '| 条件: musicListenSeconds<1200 | 原始值:', (modulesStore.musicListenSeconds || 0), 's');
    g.log('P6 法器装备:', f_法器装备,
      '| 条件: 已装备数<3 | artifacts=', artifacts, '| equippedCount=', equippedCount);
  } finally {
    g.end();
  }

  return flags;
}
function _rndPick(pool: string[], key: string): string {
  const idx = (Math.random() * pool.length) | 0;
  const v = pool[idx];
  // tracePick：统一格式化「随机抽X第N/M条」文案（debugLogger内部DEV守卫）
  _sl.tracePick(key, pool, idx, v);
  return v;
}
function _buildSuitable(): string {
  const flags = _getMockFlags();
  // 严格按 P1→P6 顺序过滤命中项（禁止shuffle，保证优先级正确）
  const actives = SUITABLE_PRIORITY_ORDER.filter((k) => flags[k]);

  // —— 折叠组：蓝色标题（覆盖默认紫色）
  const g = _sl.group('_buildSuitable', '#3A86FF');
  try {
    g.log('① 6项布尔判定（按优先级顺序）→',
      SUITABLE_PRIORITY_ORDER.map((k) => `${k}=${flags[k] ? '✅' : '❌'}`).join(' | '));
    g.log('② 命中项 actives (按优先级高→低) =', actives.length, '项:', actives.join(' → ') || '（空）');

    // 全部做完 → 收尾4字
    if (actives.length === 0) {
      const finale = '今日宜 · ' + SUITABLE_FINALE;
      g.log('③ 全做完命中=0 → 收尾:', finale);
      _sl.success('最终输出:', finale);
      return finale;
    }

    // 最多取前2（高→低），拼接后正好 4+4=8 字 或 单4字
    const picks = actives.slice(0, 2);
    g.log(`③ 取优先级前${picks.length}个（slice(0,2)截断）: picks =`, picks.join(' + '));
    const phrases = picks.map((k) => _rndPick(DAILY_SUITABLE_POOL[k], k));
    const result = '今日宜 · ' + phrases.join('  ');

    g.log('④ 拼接 phrases =', phrases.map((p, i) => `[${picks[i]}] ${p}`).join('  +  '));
    _sl.success('最终输出:', result);
    return result;
  } finally {
    g.end();
  }
}
const suitablePhrase = ref(_buildSuitable());
(window as any).__recalcSuitable = () => { suitablePhrase.value = _buildSuitable(); };
// keep-alive 下返回首页不重跑 setup；上香/种地等行为后需重算"今日宜"
onActivated(() => { suitablePhrase.value = _buildSuitable(); });

/* ================================================================
   【契约5】今日心语池（严格复刻确认稿L947的4条）
   + 换一句：仅旋转↻图标 300ms + 文字淡出→左移→换→右入淡入（方案D-GSAP行为）
================================================================ */
const QUOTES = [
  { html: '慢慢来，<b>世界和我都在陪你长大。</b><br/>每一次上香、每一次浇水，都是与自己的温柔对话。' },
  { html: '山中无甲子，寒尽不知年。<br/><b>今日灵气充盈，宜静心耕种</b>。' },
  { html: '心若冰清，天塌不惊。<br/><b>神坛三炷香，心念一处去</b>，所愿皆所得。' },
  { html: '花开花落自有时，<b>万物皆有定数</b>。<br/>今日所种，明日所收，不必着急。' },
];
const quoteIdx = ref(0);
const currentQuote = computed(() => QUOTES[quoteIdx.value % QUOTES.length]);

const refreshIcRef = ref<HTMLElement | null>(null);
const quoteTextRef = ref<HTMLElement | null>(null);
const _spinLock = shallowRef(false);
function rotateQuote() {
  if (_spinLock.value) return;
  _spinLock.value = true;
  const ic = refreshIcRef.value;
  const qt = quoteTextRef.value;
  const g = (window as any).gsap;

  // —— 旋转 ↻ 图标（300ms，仅图标）——
  if (g && ic) {
    try { g.killTweensOf(ic, true); } catch(_e) {}
    g.to(ic, { rotation: '+=360', duration: 0.3, ease: 'power2.out' });
  } else if (ic) {
    const prev = (ic as any)._rot || 0;
    (ic as any)._rot = prev + 360;
    ic.style.transition = 'transform .3s ease-out';
    ic.style.transform = `rotate(${(ic as any)._rot}deg)`;
  }

  // —— 文字：淡出→左移→换→右入淡入（方案D-GSAP L976-L982行为）——
  const nextIdx = (quoteIdx.value + 1) % QUOTES.length;
  if (g && qt) {
    const tl = g.timeline({
      onComplete: () => { _spinLock.value = false; },
    });
    tl.to(qt, { autoAlpha: 0, x: -10, duration: 0.22, ease: 'power2.in' }, 0.05);
    tl.add(() => { quoteIdx.value = nextIdx; }, 0.27);
    tl.fromTo(qt, { x: 10 }, { autoAlpha: 1, x: 0, duration: 0.32, ease: 'power3.out' }, 0.28);
  } else if (qt) {
    // 无GSAP兜底：CSS过渡
    qt.style.transition = 'opacity .2s ease, transform .2s ease';
    qt.style.opacity = '0';
    qt.style.transform = 'translateX(-10px)';
    setTimeout(() => {
      quoteIdx.value = nextIdx;
      nextTick(() => {
        const el = quoteTextRef.value;
        if (!el) { _spinLock.value = false; return; }
        el.style.transition = 'none';
        el.style.transform = 'translateX(10px)';
        requestAnimationFrame(() => {
          el.style.transition = 'opacity .32s ease, transform .32s ease';
          el.style.opacity = '1';
          el.style.transform = 'translateX(0)';
        });
        setTimeout(() => { _spinLock.value = false; }, 340);
      });
    }, 220);
    return;
  } else {
    quoteIdx.value = nextIdx;
    setTimeout(() => { _spinLock.value = false; }, 310);
  }
}

/* ================================================================
   【契约6】GSAP入场动画 + 循环动效（方案D-GSAP复刻）
   - 仅当GSAP存在时执行（CDN在index.html引入，失败则降级为静态+原生反馈）
   - 所有循环tween带id，卸载时精准清理（project_memory Anti-Pattern ❌2 防卡死）
================================================================ */
const GSAP_LOOP_IDS: string[] = ['loop-spark', 'loop-flower-float', 'loop-cta-breath'];
for (let i = 0; i < 4; i++) GSAP_LOOP_IDS.push(`loop-icon4-${i}`);
for (let i = 0; i < 3; i++) GSAP_LOOP_IDS.push(`loop-icon3-${i}`);
const GSAP_LOOP_TARGETS = '.spark, .quote-flower, .hero-cta, #grid4 .f-icon, #grid3 .f-icon';

function _killGsapLoops(g: any) {
  if (!g) return;
  try {
    GSAP_LOOP_IDS.forEach((id) => {
      try { g.getById(id)?.kill?.(); } catch(_e) {}
    });
    g.killTweensOf?.(GSAP_LOOP_TARGETS, true);
    g.killTweensOf?.('.f-card', true);
  } catch(_e) {}
}
let _introTL: any = null;
function _buildGsapAnimations(rootEl: HTMLElement) {
  const g = (window as any).gsap;
  if (!g || !rootEl) return;

  const reduceMotion = typeof matchMedia !== 'undefined'
    && matchMedia('(prefers-reduced-motion: reduce)').matches;

  _killGsapLoops(g);
  if (_introTL) { try { _introTL.kill?.(true); } catch(_e) {} _introTL = null; }

  // —— 清理上次残留终点属性 ——
  try {
    g.set(rootEl.querySelectorAll(
      '.welcome-title, .welcome-sub, .hero-banner, .hero-title, .hero-cta, #grid4 .f-card, #grid3 .f-card, .quote-card, .quote-top h3, .quote-top .refresh, #grid4 .f-icon, #grid3 .f-icon, .quote-flower'
    ), { clearProps: 'transform,opacity,autoAlpha,visibility,boxShadow,rotation,scale,translate' });
  } catch(_e) {}

  if (reduceMotion) return;

  /* —— GSAP入场动画提速（用户需求：首页展开再快点）
       总duration从约2.17s压缩到约1.65s（压缩率≈24%）：
       - 启动delay 0.12→0.06
       - 所有单项duration压缩≈22~25%
       - stagger amount / position "<" 同步压缩，节奏紧凑不堆砌
  —— */
  const intro = g.timeline({ defaults: { ease: 'expo.out' }, delay: 0.06 });
  _introTL = intro;

  // ✨ 欢迎区
  intro
    .from('.welcome-title', { y: 16, autoAlpha: 0, duration: 0.45 }, 0)
    .from('.welcome-sub',   { y: 8,  autoAlpha: 0, duration: 0.38 }, '<0.04');

  // Hero
  intro
    .from('.hero-banner', { y: 18, autoAlpha: 0, scale: 0.985, duration: 0.55 }, '+=0.02')
    .from('.hero-title',  { y: 10, autoAlpha: 0, duration: 0.4 },                  '<0.1')
    .from('.hero-cta',    { y: 8,  autoAlpha: 0, scale: 0.94, duration: 0.36 },     '<0.06');

  // 4卡 center stagger
  intro.from('#grid4 .f-card', {
    y: 18, autoAlpha: 0, scale: 0.94,
    duration: 0.43, ease: 'back.out(1.6)',
    stagger: { from: 'center', amount: 0.15 },
  }, '<0.02');

  // 3卡 center stagger
  intro.from('#grid3 .f-card', {
    y: 18, autoAlpha: 0, scale: 0.94,
    duration: 0.45, ease: 'back.out(1.8)',
    stagger: { from: 'center', amount: 0.13 },
  }, '<0.06');

  // 心语区 + 花朵
  intro
    .from('.quote-card', { y: 20, autoAlpha: 0, scale: 0.985, duration: 0.52 }, '<0.05')
    .from('.quote-top h3, .quote-top .refresh', { y: 6, autoAlpha: 0, duration: 0.33, stagger: 0.05 }, '<0.07')
    .from(quoteTextRef.value || '.quote-card p', { y: 8, autoAlpha: 0, duration: 0.36 }, '<0.04')
    .from('.quote-flower', { x: 34, y: 34, rotation: 9, autoAlpha: 0, duration: 0.74, ease: 'elastic.out(1,0.92)' }, '<0.03');

  // ⭐️ 星星闪烁（无限循环，带id）
  g.to('.spark', {
    id: 'loop-spark',
    scale: 0.8, opacity: 0.55,
    duration: 1.1, yoyo: true, repeat: -1, ease: 'sine.inOut',
  });
  // 🌸 花朵漂浮
  g.to('.quote-flower', {
    id: 'loop-flower-float',
    y: -6, rotation: -2.5, duration: 3.5, repeat: -1, yoyo: true,
    ease: 'sine.inOut', transformOrigin: '60% 70%',
  });
  // 4宫格图标呼吸
  g.utils.toArray('#grid4 .f-icon').forEach((el: any, i: number) => {
    g.to(el, {
      id: `loop-icon4-${i}`,
      y: -3, rotation: i % 2 ? -1.5 : 1.5,
      duration: 2.4 + i * 0.22, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: i * 0.08,
    });
  });
  // 3宫格图标呼吸
  g.utils.toArray('#grid3 .f-icon').forEach((el: any, i: number) => {
    g.to(el, {
      id: `loop-icon3-${i}`,
      y: -3.5, rotation: i % 2 ? 2 : -2,
      duration: 2.7 + i * 0.2, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: i * 0.12,
    });
  });
  // CTA 呼吸
  g.to('.hero-cta', {
    id: 'loop-cta-breath',
    scale: 1.04, boxShadow: '0 12px 26px rgba(125,110,200,.32)',
    duration: 1.9, repeat: -1, yoyo: true, ease: 'sine.inOut',
  });
}

/* ================================================================
   生命周期：onMounted 启动GSAP动画；卸载时双保险清理
================================================================ */
const homeRootRef = ref<HTMLElement | null>(null);
onMounted(() => {
  // 漂流瓶跨天重置（清红点判定基准，与情绪瓶同套路）
  modulesStore.normalizeDrift();
  // 组件根 = .home-page （SFC <template>第一个div无ref时，直接query找）
  const root = (document.querySelector('.home-page') as HTMLElement) || homeRootRef.value;
  if (root) _buildGsapAnimations(root);
});
onBeforeUnmount(() => {
  const g = (window as any).gsap;
  _killGsapLoops(g);
  if (_introTL) { try { _introTL.kill?.(true); } catch(_e) {} _introTL = null; }
  try { if (g && refreshIcRef.value) g.killTweensOf?.(refreshIcRef.value, true); } catch(_e) {}
});

/* ---------- 路由跳转 ---------- */
function navigate(path: string) { router.push(path); }
</script>

<!--
  ⚠️  CSS 严格1:1复制 stage0-skeleton-vD-GSAP.html L126~L378
  ⚠️  每个变量名/值/单位/小数点 逐字复制
  ⚠️  修复1：quote-card height → min-height 180px（project_memory自适应）
  ⚠️  修复2：全局缺失的CSS变量（--card-bg/--card-border/--radius-feature1等）用本地值兜底
-->
<style scoped>
.home-page {
  padding: 8px 22px 120px;
  min-height: 100%;
  box-sizing: border-box;
  --card-bg: rgba(255,255,255,.48);
  --card-border: rgba(255,255,255,.62);
  --radius-banner: 28px;
  --radius-quote: 26px;
  --radius-feature1: 20px;
  --radius-feature2: 22px;
  --radius-icon: 16px;
  --shadow: 0 10px 28px rgba(67,82,120,.08), 0 2px 8px rgba(67,82,120,.04);
  --accent: #8A80D8;
  --text-primary: #292A38;
  --text-secondary: #858999;
  position: relative;
}

/* 首页最下层底图（内容层可换图）：fixed 铺满视口并沉到内容之下，不参与布局、不拦截点击 */
.home-bg {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
}

/* 版块图标换成图片时：铺满图标圆角块 */
.f-icon-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: var(--radius-icon);
  display: block;
}

/* 白卡配了背景图时，文字转白并加描边，避免深色图上深色字看不清 */
.f-card.has-bg b,
.f-card.has-bg s {
  color: #fff;
  text-shadow: 0 1px 4px rgba(0, 0, 0, .45);
}

/* 漂浮物换成图片时：尺寸/定位沿用 .quote-flower（180×180 绝对定位），只补 object-fit */
.quote-flower-img {
  object-fit: contain;
}

/* ========== §十 欢迎区 90px L126~L182 ========== */
.welcome-section {
  height: 90px;
  margin-top: 0; /* StatusBar高度由AppLayout流式布局（非absolute）预留，无需再加54px */
  display: flex; justify-content: space-between; align-items: flex-start;
}
.welcome-copy h1 {
  margin: 10px 0 0;
  font-size: 26px; font-weight: 700; letter-spacing: -0.6px; line-height: 1.2;
  color: var(--text-primary);
}
.welcome-copy h1 .spark {
  margin-left: 4px;
  font-size: 13px; color: #D6B45D; font-weight: 700;
  display: inline-block;
  transform-origin: center;
  will-change: transform, opacity;
}
.welcome-copy p {
  margin-top: 10px;
  font-size: 13px; color: var(--text-secondary);
}
.header-actions {
  display: flex; gap: 12px; padding-top: 14px;
}
/* 签到入口：未签到时轻微悬浮呼吸，与红点一起构成「待完成」的轻度牵挂（不做强轰炸） */
.ck-breathe { animation: ckBreathe 2.6s ease-in-out infinite; }
@keyframes ckBreathe {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-3px); }
}

/* ========== §十一 Hero Banner L185~L228 ========== */
.hero-banner {
  position: relative;
  width: 100%;
  height: 200px;
  overflow: hidden;
  border-radius: var(--radius-banner);
  box-shadow: var(--shadow);
  margin-top: 12px;
  transform-origin: center;
  will-change: transform, opacity;
  cursor: pointer;
}
.hero-bg {
  position: absolute; inset: 0;
  background: #d8def3;
}
.hero-overlay {
  position: absolute; inset: 0;
  z-index: 1;
  /* 与后台预览 .preview .ov 完全一致：浅紫白渐变，避免游戏内出现灰黑遮罩 */
  background: linear-gradient(90deg, rgba(246,243,249,.65) 0%, rgba(246,243,249,.05) 70%);
}
.hero-content {
  position: absolute; inset: 0; z-index: 3;
  padding: 28px 20px;
  display: flex; flex-direction: column;
  justify-content: flex-end;
  align-items: flex-start;
  color: #fff;
}
.hero-content h2 {
  margin: 0 0 10px;
  font-size: 20px; font-weight: 700;
  line-height: 1.55;
  color: inherit;
  text-shadow: 0 2px 8px rgba(0,0,0,.3);
}
/* 高自由度文案：每行独立成块，行内 style 控制颜色/字号/粗体/对齐/阴影 */
.hero-content .hero-line {
  display: block;
  text-align: left;
}
.hero-content .hero-sub {
  margin: 0 0 10px;
  font-size: 13px;
  line-height: 1.6;
  color: rgba(255,255,255,.92);
  text-shadow: 0 1px 6px rgba(0,0,0,.3);
  text-align: left;
}
.hero-content button {
  margin-top: 0;
  align-self: flex-start;
  border: 0; border-radius: 20px;
  background: rgba(255,255,255,.92);
  color: #4a4f63;
  padding: 8px 18px;
  font-size: 13px; font-weight: 700;
  cursor: pointer;
  transform-origin: center;
}

/* ========== 轮播轨道 / 帧 / 指示点 / 视频 ========== */
.hero-track { position: absolute; inset: 0; }
.hero-track.fade .hero-slide {
  position: absolute; inset: 0;
  opacity: 0;
  /* 方案四：帧间 fade 时长柔化（比生切更自然） */
  transition: opacity .9s ease-in-out;
}
.hero-track.fade .hero-slide.active { opacity: 1; }
.hero-track.slide {
  display: flex;
  height: 100%;
  transition: transform .6s cubic-bezier(.4, 0, .2, 1);
}
.hero-track.slide .hero-slide {
  position: relative;
  flex: 0 0 100%;
  width: 100%;
  height: 100%;
}
.hero-slide { overflow: hidden; }
/* 视频帧改由 HeroVideo.vue 组件渲染（双缓冲交叉淡入 + 离屏/减动暂停），
   其样式在组件内 scoped，不再在此处定义 */
.hero-emoji {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 64px; z-index: 0;
}
.hero-dots {
  position: absolute; left: 0; right: 0; bottom: 10px;
  z-index: 4;
  display: flex; gap: 6px; justify-content: center;
}
.hero-dots .dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: rgba(255, 255, 255, .5);
  cursor: pointer; transition: all .3s;
}
.hero-dots .dot.on { background: #fff; width: 18px; border-radius: 4px; }

/* ========== §十二 第一层功能4卡 L231~L274 ========== */
.feature-grid-4 {
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.feature-grid-4 .f-card {
  position: relative; /* 承接「饿了」角标绝对定位 */
  height: 112px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 0;
  border-radius: var(--radius-feature1);
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  box-shadow: var(--shadow);
  cursor: pointer;
  transform-origin: center;
  will-change: transform, opacity;
}
.feature-grid-4 .f-card .f-icon {
  width: 34px; height: 34px; margin-bottom: 7px;
  display: flex; align-items: center; justify-content: center;
  border-radius: var(--radius-icon);
  transform-origin: center;
}
.feature-grid-4 .f-card .f-icon svg {
  width: 22px; height: 22px; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; fill: none;
  filter: drop-shadow(0 2px 4px rgba(255,255,255,0.8));
}
.feature-grid-4 .f-card b { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.feature-grid-4 .f-card s {
  display: block; margin-top: 4px;
  text-decoration: none;
  font-size: 10px; font-weight: 400; color: var(--text-secondary);
}
/* 仙宠「饿了」角标（交互对话 L131：饱食<30 橙色小标） */
.pet-badge {
  position: absolute; top: 8px; right: 8px;
  padding: 2px 8px; border-radius: 999px;
  background: linear-gradient(135deg, #E08A5A, #E8A15A); color: #fff;
  font-size: 10px; font-weight: 700; line-height: 1.5;
  z-index: 2;
  animation: petBadgePulse 1.6s ease-in-out infinite;
}
@keyframes petBadgePulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}
.fi-plant   { background: linear-gradient(145deg, #E2F2E6, #D0EADA); }
.fi-plant svg   { stroke: #59A476; }
.fi-music   { background: linear-gradient(145deg, #ECE7FA, #DCD2F6); }
.fi-music svg   { stroke: #7B6EC4; }
.fi-pet     { background: linear-gradient(145deg, #FFF1DA, #FCE3BE); }
.fi-pet svg     { stroke: #B98A44; }
.fi-paint   { background: linear-gradient(145deg, #D8ECEC, #C2E2E3); }
.fi-paint svg   { stroke: #4EA0A4; }

/* ========== §十四 第二层功能3卡 L276~L326 ========== */
.feature-grid-3 {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.feature-grid-3 .f-card {
  height: 104px;
  border-radius: var(--radius-feature2);
  background: rgba(255,255,255,.52);
  border: 1px solid rgba(255,255,255,.6);
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  box-shadow: var(--shadow);
  cursor: pointer;
  transform-origin: center;
  will-change: transform, opacity;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.feature-grid-3 .f-card .f-icon {
  width: 38px; height: 38px; margin-bottom: 6px;
  border-radius: var(--radius-icon);
  display: flex; align-items: center; justify-content: center;
  transform-origin: center;
}
.feature-grid-3 .f-card .f-icon svg {
  width: 24px; height: 24px; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; fill: none;
  filter: drop-shadow(0 2px 4px rgba(255,255,255,0.8));
}
.feature-grid-3 .f-card b { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.feature-grid-3 .f-card s {
  display:block; margin-top: 4px;
  text-decoration: none;
  font-size: 10px; font-weight: 400; color: var(--text-secondary);
}
/* 神龛副标题：与其余6个模块副标题完全一致（10px var(--text-secondary) 普通字重）
   已移除方案B的12px/#5B5F70/.shrine-count紫色加粗样式，统一回归 .feature-grid-3 .f-card s 默认规则 */
.fi-shrine  { background: linear-gradient(145deg, #ECE7FB, #DDD3F7); }
.fi-shrine svg  { stroke: #7A6DC3; }
.fi-artifact{ background: linear-gradient(145deg, #FBEDD8, #F5DCAF); }
.fi-artifact svg{ stroke: #B08341; }
.fi-bottle  { background: linear-gradient(145deg, #D7EBEC, #C1E0E2); }
.fi-bottle svg  { stroke: #489EA2; }

/* ========== §十六 今日心语 L329~L378 ==========
   ⚠️ 修复：height:180px → min-height:180px（project_memory硬约束：自适应撑高）*/
.quote-card {
  position: relative;
  min-height: 180px; /* 原height=180px → min-height=180px（文字过长自动撑高）*/
  height: auto;
  margin-top: 20px;
  padding: 22px 20px;
  overflow: hidden;
  border-radius: var(--radius-quote);
  background: linear-gradient(135deg, rgba(255,255,255,.65) 0%, rgba(226,224,246,.72) 100%);
  border: 1px solid rgba(255,255,255,.58);
  box-shadow: var(--shadow);
  transform-origin: center;
  will-change: transform, opacity;
}
.quote-top {
  display: flex; justify-content: space-between; align-items: center;
}
.quote-top h3 {
  margin: 0;
  font-size: 17px; font-weight: 650; color: var(--text-primary);
}
.quote-top .refresh {
  border: 0; background: transparent;
  color: var(--text-secondary);
  font-size: 12px; font-weight: 500;
  cursor: pointer;
  padding: 4px 6px; border-radius: 10px;
  transform-origin: center;
}
.refresh-ic {
  display: inline-block;
  transform-origin: 50% 50%;
  margin-right: 2px;
}
.quote-card p {
  margin-top: 18px;
  font-size: 13px; line-height: 1.7;
  color: #626574;
  max-width: 65%;
  will-change: opacity, transform;
}
.quote-card p b { color: #4a4d66; font-weight: 600; }
.quote-flower {
  position: absolute;
  right: -30px; bottom: -22px;
  width: 180px; height: 180px;
  opacity: 0.96;
  pointer-events: none;
  transform-origin: 60% 70%;
  will-change: transform;
}

/* ================================================================
   § 调试重播按钮（预览/开发模式可见；生产构建 v-if=false Tree-Shake 掉）
   - 固定右下安全区上方；避免 TabBar（z-index: 30）用 z-index: 35
   - 与方案D-GSAP原位置和尺寸一致
================================================================ */
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
  z-index: var(--z-fab, 35);
  -webkit-tap-highlight-color: transparent;
  transition: transform .18s cubic-bezier(.2,.8,.2,1), box-shadow .18s ease;
}
.debug-replay-btn:active {
  transform: scale(0.92);
  box-shadow: 0 3px 8px rgba(80,70,120,.18), 0 1px 0 rgba(255,255,255,.5) inset;
}
</style>
