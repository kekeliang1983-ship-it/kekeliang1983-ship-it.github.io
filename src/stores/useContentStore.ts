// src/stores/useContentStore.ts
// 内容外置层：把「可运营内容」（壁纸/白卡/Banner 等）从打包代码中抽离到 /content/*.json，
// 支持远程 CDN（VITE_CONTENT_BASE）覆盖，实现「换图/加内容零重建」。
// 加载失败时静默回退到 constants 内置兜底，保证离线/旧部署可用。
import { defineStore } from 'pinia';
import {
  WALLPAPERS,
  HIDDEN_WALLPAPERS,
  type IWallpaper,
  type IGalleryCollection,
} from '@/constants/gallery';
import type { IMusicTrack, IMusicCollection } from '@/types/index';

/** 内容基址：默认同站 public/content；可经 VITE_CONTENT_BASE 指向 CDN 实现热更 */
const BASE = (import.meta.env.VITE_CONTENT_BASE as string | undefined) ?? '/content';

export interface BannerLine {
  text: string;
  sub?: string;
}
/** 首页 Banner 粒子配置（多参数可编辑；maxCount 为硬上限保证流畅性） */
export interface BannerParticles {
  /** 是否启用粒子层 */
  enabled: boolean;
  /** 形状：花瓣 / 圆点 / 星 / 雪 */
  type: 'petal' | 'dot' | 'star' | 'snow';
  /** 实际粒子数 */
  count: number;
  /** 硬上限：编辑器滑块顶，防止手滑堆爆 */
  maxCount: number;
  /** 主色 */
  color: string;
  /** 渐变副色（可选） */
  color2?: string;
  /** 最小尺寸(px) */
  sizeMin: number;
  /** 最大尺寸(px) */
  sizeMax: number;
  /** 速度倍率 0.2~3 */
  speed: number;
  /** 漂浮方向 */
  direction: 'down' | 'up' | 'left' | 'right' | 'random';
  /** 整体透明度 0~1 */
  opacity: number;
  /** 是否旋转 */
  rotate: boolean;
  /** 是否跟随鼠标 */
  followMouse: boolean;
  /** 辉光（发光描边）：开启后粒子带 shadowBlur 光晕 */
  glow?: boolean;
  /** 辉光强度(blur px) 0~30，弱机会按设备系数自动衰减 */
  glowStrength?: number;
  /** 辉光色（留空用粒子主色） */
  glowColor?: string;
}

/** 首页 Banner 文案的一行（高自由度：每行可独立设样式） */
export interface BannerTextLine {
  /** 文案内容 */
  text: string;
  /** 文字颜色（CSS 色；留空继承主题） */
  color?: string;
  /** 字号 px（留空用默认 hero-title 字号） */
  size?: number;
  /** 加粗 */
  bold?: boolean;
  /** 水平对齐 */
  align?: 'left' | 'center' | 'right';
  /** 文字阴影（视频/复杂背景上更清晰） */
  shadow?: boolean;
  /** 阴影透明度 0~1（shadow=true 时生效，默认 0.45） */
  shadowOpacity?: number;
}

/** 首页 Banner 单帧（轮播单元） */
export interface BannerSlide {
  id: string;
  /** 媒体类型：图片 / 视频 */
  bgType: 'image' | 'video';
  /** 图片地址（bgType=image 时） */
  bgImage?: string;
  /** 视频地址（bgType=video 时，外链优先） */
  bgVideo?: string;
  /** 视频封面兜底 */
  videoPoster?: string;
  /** 背景 emoji 兜底（无图/视频时显示） */
  bgEmoji?: string;
  /** 主标题多行（高自由度：每行独立样式，可任意增删） */
  titleLines: BannerTextLine[];
  /** 标题行间距 px（标题块内行与行之间的间距；默认 8） */
  lineGap?: number;
  /** 副标题/描述段落（可选；高自由度块） */
  subtitle?: string;
  subtitleColor?: string;
  subtitleSize?: number;
  subtitleBold?: boolean;
  buttonText: string;
  /** 按钮背景色（CSS 色；留空用默认白底） */
  buttonBg?: string;
  /** 按钮文字色（留空用默认深字） */
  buttonColor?: string;
  /** 按钮缩放幅度 0.7~1.6（1=默认；机型无关，所有端一致） */
  buttonScale?: number;
  /** 点击跳转（每帧可不同） */
  link?: string;
  /** 粒子配置（可选；缺省不显示粒子） */
  particles?: BannerParticles;
}

/** 把任意 titleLines（兼容旧 string[] / 新对象[]）归一化为 BannerTextLine[] */
function toLines(v: any): BannerTextLine[] {
  if (!Array.isArray(v)) return [];
  return v.map((t: any) =>
    typeof t === 'string' ? { text: t } : { text: t?.text || '', color: t?.color, size: t?.size, bold: t?.bold, align: t?.align, shadow: t?.shadow, shadowOpacity: typeof t?.shadowOpacity === 'number' ? t.shadowOpacity : undefined },
  );
}

export interface BannerContent {
  /** 是否自动轮播 */
  autoplay?: boolean;
  /** 轮播间隔(ms) */
  interval?: number;
  /** 切换动画：淡入淡出 / 横滑 */
  transition?: 'fade' | 'slide';
  /** 是否显示指示点 */
  showDots?: boolean;
  /** 视频循环是否启用交叉淡入丝滑过渡(默认 true；false=单视频硬 loop 省电) */
  videoCrossfade?: boolean;
  /** 轮播帧列表（核心） */
  slides?: BannerSlide[];
  /** @deprecated 旧单对象兼容字段，加载时自动归一化进 slides */
  titleLines?: string[];
  buttonText?: string;
  bgImage?: string;
  bgEmoji?: string;
}

/** 把任意 banner 数据归一化为「轮播结构」，保证 HomePage/编辑器拿到的总是标准形态 */
function normalizeBanner(data: any): BannerContent {
  const fallback: BannerContent = {
    autoplay: true, interval: 5000, transition: 'fade', showDots: true, videoCrossfade: true, slides: [],
  };
  if (!data || typeof data !== 'object') return fallback;
  // 新结构：已有 slides
  if (Array.isArray(data.slides) && data.slides.length) {
    return {
      autoplay: data.autoplay ?? true,
      interval: Number(data.interval) || 5000,
      transition: data.transition === 'slide' ? 'slide' : 'fade',
      showDots: data.showDots ?? true,
      videoCrossfade: data.videoCrossfade ?? true,
      slides: data.slides.map((s: any, i: number) => ({
        id: s?.id || `s${i + 1}`,
        bgType: s?.bgType === 'video' ? 'video' : 'image',
        bgImage: s?.bgImage || '',
        bgVideo: s?.bgVideo || '',
        videoPoster: s?.videoPoster || '',
        bgEmoji: s?.bgEmoji || '',
        titleLines: toLines(s?.titleLines),
        lineGap: typeof s?.lineGap === 'number' ? s.lineGap : 8,
        subtitle: s?.subtitle || '',
        subtitleColor: s?.subtitleColor || '',
        subtitleSize: s?.subtitleSize || undefined,
        subtitleBold: s?.subtitleBold || false,
        buttonText: s?.buttonText || '',
        buttonBg: s?.buttonBg || '',
        buttonColor: s?.buttonColor || '',
        buttonScale: typeof s?.buttonScale === 'number' ? s.buttonScale : 1,
        link: s?.link || '/app/gallery',
        particles: s?.particles ? {
          ...s.particles,
          glow: s.particles.glow ?? false,
          glowStrength: typeof s.particles.glowStrength === 'number' ? s.particles.glowStrength : 12,
          glowColor: s.particles.glowColor || '',
        } : undefined,
      })),
    };
  }
  // 旧单对象：包成单帧
  return {
    autoplay: true, interval: 5000, transition: 'fade', showDots: true,
    slides: [{
      id: 's1',
      bgType: data.bgImage ? 'image' : 'image',
      bgImage: data.bgImage || '',
      bgEmoji: data.bgEmoji || '',
      titleLines: toLines(data.titleLines),
      buttonText: data.buttonText || '',
      link: '/app/gallery',
    }],
  };
}

/** 首页最下层底图（图片优先，留空则回退全局渐变） */
export interface HomeBackground {
  image?: string;
  /** 0~1，图片不透明度 */
  opacity?: number;
  /** 模糊像素，做「毛玻璃底图」用 */
  blur?: number;
}
/** 今日心语卡（背景卡 + 动态漂浮物） */
export interface HomeQuote {
  title?: string;
  refreshText?: string;
  /** 心语卡背景图；留空回退内置渐变 */
  cardImage?: string;
  /** 动态漂浮物图片；留空回退内置 SVG 花朵 */
  flowerImage?: string;
}
/** 首页 7 大版块白卡 */
export interface HomeFeature {
  id: string;
  name?: string;
  /** 版块图标图；留空回退内置 SVG 图标 */
  icon?: string;
  /** 白卡背景图；留空回退内置渐变玻璃卡 */
  cardImage?: string;
}
export interface HomeContent {
  background?: HomeBackground;
  quote?: HomeQuote;
  features?: HomeFeature[];
}

interface ContentState {
  ready: boolean;
  galleryLoaded: boolean;
  bannerLoaded: boolean;
  homeLoaded: boolean;
  remoteWallpapers: IWallpaper[] | null;
  remoteHidden: IWallpaper[] | null;
  /** 策展集合（精选/限定/季节…），后台 gallery.json → collections 字段 */
  remoteCollections: IGalleryCollection[] | null;
  /** 天籁曲库目录（后台 music.json → tracks 字段），运行时与 modulesStore 解锁进度合并 */
  remoteMusic: IMusicTrack[] | null;
  /** 天籁歌单 / 场景合集（后台 music.json → collections 字段） */
  remoteMusicCollections: IMusicCollection[] | null;
  /** 仙宠配置（后台 pet.json → params/pets/foods/travels；运行态进度不在此，由 modulesStore 死守 localStorage） */
  remotePet: any | null;
  petLoaded: boolean;
  /** 神龛配置（后台 shrine.json → params/incenses/deities/fortunes/almanac；运行态进度不在此，由 modulesStore 死守 localStorage） */
  remoteShrine: any | null;
  shrineLoaded: boolean;
  /** 法器配置（后台 artifacts.json → params/artifacts；运行态进度不在此，由 modulesStore 死守 localStorage） */
  remoteArtifacts: any | null;
  artifactsLoaded: boolean;
  /** 情绪瓶配置（后台 bottle.json → bottle/drift；运行态进度不在此，由 modulesStore 死守 localStorage） */
  remoteBottle: any | null;
  bottleLoaded: boolean;
  remoteFarm: any | null;
  farmLoaded: boolean;
  /** 竞速配置（后台 race.json；运行态每日场次/战绩不在此，由 raceStore 死守 localStorage） */
  remoteRace: any | null;
  raceLoaded: boolean;
  remoteCheckin: any | null;
  checkinLoaded: boolean;
  /** 素材池配置（后台 pool.json → avatars/names/elementRing/defaultRing；运行态头像/昵称不在此，由 userStore 死守 localStorage） */
  remotePool: any | null;
  poolLoaded: boolean;
  banner: BannerContent | null;
  home: HomeContent | null;
}

export const useContentStore = defineStore('content', {
  state: (): ContentState => ({
    ready: false,
    galleryLoaded: false,
    bannerLoaded: false,
    homeLoaded: false,
    remoteWallpapers: null,
    remoteHidden: null,
    remoteCollections: null,
    remoteMusic: null,
    remoteMusicCollections: null,
    remotePet: null,
    petLoaded: false,
    remoteShrine: null,
    shrineLoaded: false,
    remoteArtifacts: null,
    artifactsLoaded: false,
    remoteBottle: null,
    bottleLoaded: false,
    remoteFarm: null,
    farmLoaded: false,
    remoteRace: null,
    raceLoaded: false,
    remoteCheckin: null,
    checkinLoaded: false,
    remotePool: null,
    poolLoaded: false,
    banner: null,
    home: null,
  }),
  getters: {
    /** 常规壁纸（远程优先，否则内置兜底） */
    wallpapers(state): IWallpaper[] {
      return state.remoteWallpapers && state.remoteWallpapers.length
        ? state.remoteWallpapers
        : WALLPAPERS;
    },
    /** 隐藏壁纸（远程优先，否则内置兜底） */
    hiddenWallpapers(state): IWallpaper[] {
      return state.remoteHidden && state.remoteHidden.length
        ? state.remoteHidden
        : HIDDEN_WALLPAPERS;
    },
    /** 全部壁纸（常规 + 隐藏），供掉落/解锁/加成统一池 */
    allWallpapers(): IWallpaper[] {
      return [...this.wallpapers, ...this.hiddenWallpapers];
    },
    /**
     * 策展集合（后台可配；无配置返回 []，前台自动不显示集合 tab）。
     * 自愈（铁律13⑦）+ 引用完整性校验（铁律13⑧）：
     * 丢弃残缺项、剔除不存在的壁纸 id、补 order/enabled 默认值、按 order 升序。
     */
    collections(): IGalleryCollection[] {
      const raw = this.remoteCollections;
      if (!Array.isArray(raw) || !raw.length) return [];
      const validIds = new Set(this.allWallpapers.map((w) => w.id));
      return raw
        .filter((c) => c && typeof c.id === 'string' && c.id && typeof c.label === 'string' && c.label)
        .map((c) => ({
          ...c,
          // 引用完整性：集合里引用了已被删除的壁纸 id → 静默剔除，避免前台空卡
          ids: (Array.isArray(c.ids) ? c.ids : []).filter((id) => validIds.has(id)),
          order: typeof c.order === 'number' ? c.order : 50,
          enabled: c.enabled !== false,
        }))
        .filter((c) => c.enabled)
        .sort((a, b) => a.order - b.order);
    },
    bannerContent(state): BannerContent {
      return state.banner || { autoplay: true, interval: 5000, transition: 'fade', showDots: true, videoCrossfade: true, slides: [] };
    },
    homeContent(state): HomeContent | null {
      return state.home;
    },
    /** 首页底图样式：无图时返回 null，由组件回退内置渐变 */
    homeBgStyle(): Record<string, string> | null {
      const bg = this.home?.background;
      const img = bg?.image;
      if (!img) return null;
      const opacity = typeof bg?.opacity === 'number' ? Math.min(1, Math.max(0, bg.opacity)) : 1;
      return {
        backgroundImage: `url("${img}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        opacity: String(opacity),
        filter: bg?.blur ? `blur(${bg.blur}px)` : 'none',
      };
    },
    /** 今日心语配置（永远返回对象，便于组件直接取属性） */
    homeQuote(): HomeQuote {
      return this.home?.quote || {};
    },
    /** 按 id 取版块白卡配置；未配置返回空对象，组件据此回退内置 SVG/渐变 */
    homeFeature(state): (id: string) => HomeFeature {
      return (id: string) => {
        const list = state.home?.features;
        if (!Array.isArray(list)) return { id };
        return list.find((f) => f && f.id === id) || { id };
      };
    },
  },
  actions: {
    async load() {
      await Promise.all([this.loadGallery(), this.loadBanner(), this.loadHome(), this.loadMusic(), this.loadPet(), this.loadShrine(), this.loadArtifacts(), this.loadBottle(), this.loadFarm(), this.loadRace(), this.loadCheckin(), this.loadPool()]);
      this.ready = true;
    },
    async loadGallery() {
      try {
        const res = await fetch(`${BASE}/gallery.json`, { cache: 'no-cache' });
        if (!res.ok) throw new Error('gallery ' + res.status);
        const data = (await res.json()) as {
          wallpapers?: IWallpaper[];
          hidden?: IWallpaper[];
          collections?: IGalleryCollection[];
        };
        if (Array.isArray(data.wallpapers) && data.wallpapers.length) {
          this.remoteWallpapers = data.wallpapers;
        }
        if (Array.isArray(data.hidden) && data.hidden.length) {
          this.remoteHidden = data.hidden;
        }
        // 策展集合：空数组也算有效（用户可在后台删空 → 集合 tab 自动消失）
        if (Array.isArray(data.collections)) {
          this.remoteCollections = data.collections;
        }
        if (this.remoteWallpapers || this.remoteHidden) this.galleryLoaded = true;
      } catch (e) {
        console.warn('[content] gallery.json 加载失败，回退内置兜底', e);
      }
    },
    async loadBanner() {
      try {
        const res = await fetch(`${BASE}/banner.json`, { cache: 'no-cache' });
        if (!res.ok) throw new Error('banner ' + res.status);
        const data = await res.json();
        // 归一化为轮播结构（旧单对象自动兜底成单帧），保证后续消费方形态一致
        this.banner = normalizeBanner(data);
        this.bannerLoaded = true;
      } catch (e) {
        console.warn('[content] banner.json 加载失败，回退内置兜底', e);
      }
    },
    async loadHome() {
      try {
        const res = await fetch(`${BASE}/home.json`, { cache: 'no-cache' });
        if (!res.ok) throw new Error('home ' + res.status);
        const data = (await res.json()) as HomeContent;
        // 空配置也接受（表示「全部用内置兜底」），只要结构合法
        if (data && typeof data === 'object') {
          this.home = data;
          this.homeLoaded = true;
        }
      } catch (e) {
        console.warn('[content] home.json 加载失败，回退内置兜底', e);
      }
    },
    async loadMusic() {
      try {
        const res = await fetch(`${BASE}/music.json`, { cache: 'no-cache' });
        if (!res.ok) throw new Error('music ' + res.status);
        const data = (await res.json()) as {
          tracks?: IMusicTrack[];
          collections?: IMusicCollection[];
        };
        if (Array.isArray(data.tracks) && data.tracks.length) {
          this.remoteMusic = data.tracks;
        }
        if (Array.isArray(data.collections)) {
          this.remoteMusicCollections = data.collections;
        }
        // 目录就绪后通知 modulesStore 合并解锁进度（动态 import 避免循环依赖）
        if (this.remoteMusic) {
          import('@/stores/useModulesStore').then(({ useModulesStore }) => {
            useModulesStore().syncMusicFromContent();
          });
        }
      } catch (e) {
        console.warn('[content] music.json 加载失败，回退内置兜底', e);
      }
    },
    async loadPet() {
      try {
        const res = await fetch(`${BASE}/pet.json`, { cache: 'no-cache' });
        if (!res.ok) throw new Error('pet ' + res.status);
        const data = (await res.json()) as any;
        // 只要结构合法就接收（空对象也接受，表示「全部用内置兜底」）
        if (data && typeof data === 'object') {
          this.remotePet = data;
          this.petLoaded = true;
          // 配置就绪后通知 modulesStore 合并（仅覆盖配置，绝不回写进度）
          import('@/stores/useModulesStore').then(({ useModulesStore }) => {
            useModulesStore().syncPetFromContent();
          });
        }
      } catch (e) {
        console.warn('[content] pet.json 加载失败，回退内置兜底', e);
      }
    },
    async loadShrine() {
      try {
        const res = await fetch(`${BASE}/shrine.json`, { cache: 'no-cache' });
        if (!res.ok) throw new Error('shrine ' + res.status);
        const data = (await res.json()) as any;
        // 只要结构合法就接收（空对象也接受，表示「全部用内置兜底」）
        if (data && typeof data === 'object') {
          this.remoteShrine = data;
          this.shrineLoaded = true;
          // 配置就绪后通知 modulesStore 合并（仅覆盖配置，绝不回写进度）
          import('@/stores/useModulesStore').then(({ useModulesStore }) => {
            useModulesStore().syncShrineFromContent();
          });
        }
      } catch (e) {
        console.warn('[content] shrine.json 加载失败，回退内置兜底', e);
      }
    },
    async loadArtifacts() {
      try {
        const res = await fetch(`${BASE}/artifacts.json`, { cache: 'no-cache' });
        if (!res.ok) throw new Error('artifacts ' + res.status);
        const data = (await res.json()) as any;
        // 只要结构合法就接收（空对象也接受，表示「全部用内置兜底」）
        if (data && typeof data === 'object') {
          this.remoteArtifacts = data;
          this.artifactsLoaded = true;
          // 配置就绪后通知 modulesStore 合并（仅覆盖配置，绝不回写进度）
          import('@/stores/useModulesStore').then(({ useModulesStore }) => {
            useModulesStore().syncArtifactsFromContent();
          });
        }
      } catch (e) {
        console.warn('[content] artifacts.json 加载失败，回退内置兜底', e);
      }
    },
    async loadFarm() {
      try {
        const res = await fetch(`${BASE}/farm.json`, { cache: 'no-cache' });
        if (!res.ok) throw new Error('farm ' + res.status);
        const data = (await res.json()) as any;
        // 只要结构合法就接收（空对象也接受，表示「全部用内置兜底」）
        if (data && typeof data === 'object') {
          this.remoteFarm = data;
          this.farmLoaded = true;
          // 配置就绪后通知 modulesStore 合并（仅覆盖配置，绝不回写进度）
          import('@/stores/useModulesStore').then(({ useModulesStore }) => {
            useModulesStore().syncFarmFromContent();
          });
        }
      } catch (e) {
        console.warn('[content] farm.json 加载失败，回退内置兜底', e);
      }
    },
    async loadRace() {
      try {
        const res = await fetch(`${BASE}/race.json`, { cache: 'no-cache' });
        if (!res.ok) throw new Error('race ' + res.status);
        const data = (await res.json()) as any;
        // 只要结构合法就接收（空对象也接受，表示「全部用内置兜底」）
        if (data && typeof data === 'object') {
          this.remoteRace = data;
          this.raceLoaded = true;
          // 配置就绪后通知 modulesStore 合并（仅覆盖配置，绝不回写战绩）
          import('@/stores/useModulesStore').then(({ useModulesStore }) => {
            useModulesStore().syncRaceFromContent();
          });
        }
      } catch (e) {
        console.warn('[content] race.json 加载失败，回退内置兜底', e);
      }
    },
    async loadCheckin() {
      try {
        const res = await fetch(`${BASE}/checkin.json`, { cache: 'no-cache' });
        if (!res.ok) throw new Error('checkin ' + res.status);
        const data = (await res.json()) as any;
        if (data && typeof data === 'object') {
          this.remoteCheckin = data;
          this.checkinLoaded = true;
          import('@/stores/useModulesStore').then(({ useModulesStore }) => {
            useModulesStore().syncCheckinFromContent();
          });
        }
      } catch (e) {
        console.warn('[content] checkin.json 加载失败，回退内置兜底', e);
      }
    },
    async loadPool() {
      try {
        const res = await fetch(`${BASE}/pool.json`, { cache: 'no-cache' });
        if (!res.ok) throw new Error('pool ' + res.status);
        const data = (await res.json()) as any;
        // 只要结构合法就接收（空对象也接受，表示「全部用内置兜底」）
        if (data && typeof data === 'object') {
          this.remotePool = data;
          this.poolLoaded = true;
          // 配置就绪后通知 modulesStore 合并（仅覆盖配置，绝不回写玩家头像/昵称）
          import('@/stores/useModulesStore').then(({ useModulesStore }) => {
            useModulesStore().syncPoolFromContent();
          });
        }
      } catch (e) {
        console.warn('[content] pool.json 加载失败，回退内置兜底', e);
      }
    },
    async loadBottle() {
      try {
        const res = await fetch(`${BASE}/bottle.json`, { cache: 'no-cache' });
        if (!res.ok) throw new Error('bottle ' + res.status);
        const data = (await res.json()) as any;
        // 只要结构合法就接收（空对象也接受，表示「全部用内置兜底」）
        if (data && typeof data === 'object') {
          this.remoteBottle = data;
          this.bottleLoaded = true;
          // 配置就绪后通知 modulesStore 合并（仅覆盖配置，绝不回写进度）
          import('@/stores/useModulesStore').then(({ useModulesStore }) => {
            useModulesStore().syncBottleFromContent();
          });
        }
      } catch (e) {
        console.warn('[content] bottle.json 加载失败，回退内置兜底', e);
      }
    },
  },
});
