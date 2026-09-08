<template>
  <div class="adm">
    <!-- 左侧：模块导航 -->
    <aside class="adm-side">
      <div class="brand">
        <span class="logo">🧩</span>
        <div>
          <h1>内容管理后台</h1>
          <p>本地可视化 · 改完即存</p>
        </div>
      </div>
      <nav>
        <div v-for="grp in groups" :key="grp" class="grp">
          <p class="grp-name">{{ grp }}</p>
          <button
            v-for="m in modulesByGroup(grp)"
            :key="m.id"
            class="nav-item"
            :class="{ on: m.id === activeId }"
            @click="switchModule(m.id)"
          >
            <span class="ico">{{ m.icon }}</span>
            <span class="lbl">{{ m.label }}</span>
            <span v-if="!m.wired" class="dot" title="App 侧消费接入见 #173">●</span>
          </button>
        </div>
      </nav>
    </aside>

    <!-- 右侧：操作区 -->
    <main class="adm-main">
      <header class="adm-head">
        <div class="title-box">
          <h2>{{ active.label }}</h2>
          <p>{{ active.desc }}</p>
        </div>
        <div class="actions">
          <button class="btn" :disabled="busy || loading" @click="save">💾 保存</button>
          <button class="btn primary" :disabled="busy || loading" @click="buildAndSave">🚀 保存并构建</button>
          <button class="btn publish" :disabled="busy || loading" @click="publish" title="校验 → git 提交 → 推送，CI 自动部署上线">
            ☁️ 一键发布
          </button>
          <span class="act-sep"></span>
          <button class="btn ghost" :disabled="busy || loading" @click="showDiff = !showDiff">🔍 对比</button>
          <button class="btn ghost" :disabled="busy || loading" @click="showSnaps = !showSnaps">
            🕘 快照<span v-if="snapCount" class="badge">{{ snapCount }}</span>
          </button>
          <button class="btn ghost" :disabled="busy || loading" @click="exportJson">⬇️ 导出</button>
          <button class="btn ghost" :disabled="busy || loading" @click="triggerImport">⬆️ 导入</button>
          <input ref="importInput" type="file" accept="application/json,.json" hidden @change="onImportFile" />
        </div>
      </header>

      <p class="msg" v-if="msg">{{ msg }}</p>
      <pre class="pub-log" v-if="pubLog">{{ pubLog }}</pre>

      <!-- 关键：必须等 model 就绪再渲染编辑器。
           早期版本 loading 初值为 false，首渲染把 null 传进编辑器 →
           GalleryEditor 读 items.length 抛 TypeError → 整页白屏。 -->
      <section class="adm-content" v-if="!loading && model">
        <GalleryEditor v-if="active.editor === 'gallery'" :items="model" :collections="galleryCollections" />
        <BannerEditor v-else-if="active.editor === 'banner'" :banner="model" />
        <MusicEditor v-else-if="active.editor === 'music'" :data="model" />
        <PetEditor v-else-if="active.editor === 'pet'" :data="model" />
        <ShrineEditor v-else-if="active.editor === 'shrine'" :data="model" />
        <ArtifactsEditor v-else-if="active.editor === 'artifacts'" :data="model" />
        <BottleEditor v-else-if="active.editor === 'bottle'" :data="model" />
        <FarmEditor v-else-if="active.editor === 'farm'" :data="model" />
        <RaceEditor v-else-if="active.editor === 'race'" :data="model" />
        <CheckinEditor v-else-if="active.editor === 'checkin'" :data="model" />
        <PoolEditor v-else-if="active.editor === 'pool'" :data="model" />
        <HomeEditor v-else-if="active.editor === 'home'" :home="model" />
        <NoticeEditor v-else-if="active.editor === 'notice'" :data="model" />
        <JsonEditor v-else :data="model" :file="active.id" @update="onJsonUpdate" />
      </section>
      <div class="loading" v-else>加载中…</div>
    </main>

    <!-- 快照面板：保存前自动留档，可一键回滚 -->
    <div class="snap-pop" v-if="showSnaps" @click.self="showSnaps = false">
      <div class="snap-box">
        <header><b>🕘 配置快照</b><span class="x" @click="showSnaps = false">✕</span></header>
        <p class="snap-tip">每次「保存」前自动留档当前线上内容，可回滚到任意历史版本。</p>
        <div class="snap-list" v-if="snapList.length">
          <div class="snap-row" v-for="s in snapList" :key="s.ts">
            <span class="snap-time">{{ fmtTime(s.ts) }}</span>
            <button class="btn sm" @click="rollback(s.ts)">↩ 回滚</button>
          </div>
        </div>
        <p class="snap-empty" v-else>暂无快照（保存一次后会自动生成）</p>
      </div>
    </div>

    <!-- 变更对比：当前待保存内容 vs 打开时原始内容 -->
    <div class="diff-pop" v-if="showDiff" @click.self="showDiff = false">
      <div class="diff-box">
        <header><b>🔍 变更对比</b><span class="sub">当前待保存 ↔ 打开时原文</span><span class="x" @click="showDiff = false">✕</span></header>
        <div class="diff-list" v-if="diffList.length">
          <div class="diff-row" v-for="(d, i) in diffList" :key="i" :class="d.type">
            <span class="d-path">{{ d.path }}</span>
            <span class="d-from">{{ d.type === 'add' ? '＋新增' : formatVal(d.from) }}</span>
            <span class="d-arrow">→</span>
            <span class="d-to">{{ d.type === 'del' ? '－删除' : formatVal(d.to) }}</span>
          </div>
        </div>
        <p class="diff-empty" v-else>✅ 当前内容与打开时一致，无变更</p>
      </div>
    </div>

    <!-- 后台口令门禁 -->
    <div class="auth-pop" v-if="needAuth" @click.self="needAuth = false">
      <div class="auth-box">
        <header><b>🔒 后台口令</b></header>
        <p class="auth-tip">本地后台已启用手令，请输入启动 dev 时设置的 <code>ADMIN_TOKEN</code>。</p>
        <input
          class="auth-input"
          type="password"
          v-model="pwInput"
          placeholder="请输入后台口令"
          @keyup.enter="unlock"
        />
        <button class="btn primary" @click="unlock">🔓 进入后台</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { MODULES, getModule } from '@/admin/modules';
import GalleryEditor from '@/admin/editors/GalleryEditor.vue';
import BannerEditor from '@/admin/editors/BannerEditor.vue';
import MusicEditor from '@/admin/editors/MusicEditor.vue';
import HomeEditor from '@/admin/editors/HomeEditor.vue';
import PetEditor from '@/admin/editors/PetEditor.vue';
import ShrineEditor from '@/admin/editors/ShrineEditor.vue';
import ArtifactsEditor from '@/admin/editors/ArtifactsEditor.vue';
import BottleEditor from '@/admin/editors/BottleEditor.vue';
import FarmEditor from '@/admin/editors/FarmEditor.vue';
import RaceEditor from '@/admin/editors/RaceEditor.vue';
import CheckinEditor from '@/admin/editors/CheckinEditor.vue';
import PoolEditor from '@/admin/editors/PoolEditor.vue';
import NoticeEditor from '@/admin/editors/NoticeEditor.vue';
import JsonEditor from '@/admin/components/JsonEditor.vue';
import { adminFetch, setAdminToken } from '@/admin/api';

/** 后台口令门禁：token 缺失或服务端 401 时弹窗要求输入（与 vite.config adminApiPlugin 对应） */
const needAuth = ref(false);
const pwInput = ref('');
function unlock() {
  const v = pwInput.value.trim();
  if (!v) return;
  setAdminToken(v);
  pwInput.value = '';
  needAuth.value = false;
  load(activeId.value); // 用新口令重试加载
}

const groups = computed(() => [...new Set(MODULES.map((m) => m.group))]);
const modulesByGroup = (g: string) => MODULES.filter((m) => m.group === g);

const activeId = ref(MODULES[0].id);
const active = computed(() => getModule(activeId.value)!);
const model = ref<any>(null);
/** 原始文档保留池：保存时以它为底合并回写，collections 等「编辑器未直接编辑」的字段才不会被覆盖丢失（铁律13⑦ 向前兼容） */
const rawDoc = ref<any>(null);
/** 画境策展集合（精选/限定/季节…）：把数组引用直接交给编辑器 mutate，保存时随 rawDoc 回写 */
const galleryCollections = computed<any[]>(() => rawDoc.value?.collections ?? []);
// 首屏即处于加载态：onMounted 才发起请求，若初值为 false 会先用 null 渲染一次编辑器 → 白屏
const loading = ref(true);
const busy = ref(false);
const msg = ref('');

/* ===================== #303 后台基础设施：快照/回滚 · 变更对比 · 导入导出 ===================== */
/** 打开某模块时的「原文」序列化产物，用于变更对比（每次 applyRaw 后刷新） */
const loadedPayload = ref<any>(null);
/** 快照面板 / 对比面板开关 */
const showSnaps = ref(false);
const showDiff = ref(false);
/** 快照栈：localStorage 持久化，按模块 id 留存「保存前」线上内容（最多 10 条） */
const SNAP_KEY = 'lingjing:admin:snapshots';
const snapshots = ref<Record<string, { ts: number; content: any }[]>>(loadSnaps());
function loadSnaps(): Record<string, { ts: number; content: any }[]> {
  try { return JSON.parse(localStorage.getItem(SNAP_KEY) || '{}'); } catch { return {}; }
}
function persistSnaps() {
  try { localStorage.setItem(SNAP_KEY, JSON.stringify(snapshots.value)); } catch { /* 忽略持久化失败 */ }
}
const snapList = computed(() => snapshots.value[activeId.value] || []);
const snapCount = computed(() => snapList.value.length);

/** 变更对比：当前待保存内容 ↔ 打开时原文 */
const diffList = computed<{ path: string; type: 'add' | 'del' | 'chg'; from: any; to: any }[]>(() => {
  try { return computeDiff(buildPayload(), loadedPayload.value || {}); } catch { return []; }
});

/** 递归结构对比（对象/数组逐键，标量直接比较） */
function computeDiff(a: any, b: any, path = ''): { path: string; type: 'add' | 'del' | 'chg'; from: any; to: any }[] {
  const out: { path: string; type: 'add' | 'del' | 'chg'; from: any; to: any }[] = [];
  const isObj = (v: any) => v && typeof v === 'object' && !Array.isArray(v);
  if (a === b) return out;
  if (isObj(a) && isObj(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      const p = path ? `${path}.${k}` : k;
      if (!(k in a)) out.push({ path: p, type: 'add', from: undefined, to: b[k] });
      else if (!(k in b)) out.push({ path: p, type: 'del', from: a[k], to: undefined });
      else out.push(...computeDiff(a[k], b[k], p));
    }
  } else if (Array.isArray(a) && Array.isArray(b)) {
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) {
      const p = `${path}[${i}]`;
      if (i >= a.length) out.push({ path: p, type: 'add', from: undefined, to: b[i] });
      else if (i >= b.length) out.push({ path: p, type: 'del', from: a[i], to: undefined });
      else out.push(...computeDiff(a[i], b[i], p));
    }
  } else {
    out.push({ path, type: 'chg', from: a, to: b });
  }
  return out;
}
function formatVal(v: any): string {
  if (v === undefined) return '—';
  if (v === null) return 'null';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
function fmtTime(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** 导出当前待保存内容为 JSON 文件 */
function exportJson() {
  const data = JSON.stringify(buildPayload(), null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${activeId.value}.json`;
  a.click();
  URL.revokeObjectURL(url);
  msg.value = `⬇️ 已导出 ${activeId.value}.json`;
}
/** 导入 JSON 文件 → 载入编辑器（需手动保存写回） */
const importInput = ref<HTMLInputElement | null>(null);
function triggerImport() { importInput.value?.click(); }
function onImportFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      applyRaw(activeId.value, parsed);
      msg.value = '⬆️ 已导入到编辑器，请点「保存」写回线上';
    } catch { msg.value = '❌ JSON 解析失败，请检查文件格式'; }
  };
  reader.readAsText(file);
  input.value = '';
}
/** 回滚到指定快照：载入快照内容并立即写回线上 */
async function rollback(ts: number) {
  const snap = (snapshots.value[activeId.value] || []).find((s) => s.ts === ts);
  if (!snap) return;
  applyRaw(activeId.value, snap.content);
  busy.value = true;
  msg.value = '↩ 回滚中…';
  try {
    const res: any = await api(activeId.value, 'POST', buildPayload());
    msg.value = res.ok ? '✅ 已回滚到该快照' : '❌ 回滚失败：' + (res.error || '');
    snapshots.value[activeId.value] = (snapshots.value[activeId.value] || []).filter((s) => s.ts !== ts);
    persistSnaps();
  } catch (e: any) {
    msg.value = '回滚失败：' + (e?.message || e);
  } finally {
    busy.value = false;
  }
}

/** 一键发布：跑 scripts/publish-content.mjs（校验 → 提交 → 推送），CI 随后自动部署 */
const pubLog = ref('');
async function publish() {
  if (busy.value) return;
  busy.value = true;
  pubLog.value = '';
  msg.value = '☁️ 发布中：内容校验 → 提交 → 推送…';
  try {
    const res: any = await api('publish', 'POST', {});
    pubLog.value = String(res?.log || '').trim();
    msg.value = res?.ok
      ? '🎉 已推送！GitHub Actions 正在自动部署（约 2–5 分钟）'
      : '❌ 发布未成功，详见下方日志（线上仍是旧版本，未受影响）';
  } catch (e: any) {
    msg.value = '❌ 发布失败：' + (e?.message || e);
  } finally {
    busy.value = false;
  }
}

async function api<T = any>(path: string, method = 'GET', body?: any): Promise<T> {
  const res = await adminFetch(`/__admin_api/${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    needAuth.value = true; // 口令不对/未设，弹窗要求输入
    throw new Error('需要后台口令');
  }
  return res.json();
}

function applyRaw(id: string, raw: any) {
  const m = getModule(id)!;
  if (m.editor === 'gallery') {
      const g = raw.__empty ? { wallpapers: [], hidden: [] } : raw;
      // 策展集合：旧 JSON 无此字段时补空数组，保证编辑器模板不白屏（铁律13⑦ 自愈）
      if (!Array.isArray(g.collections)) g.collections = [];
      rawDoc.value = g; // 保留池：保存时合并回写，且编辑器直接 mutate 其 collections
      // 规范化：保证 price 是对象（模板里 v-model 到 price.gold/pearl/magic/jade）
      const norm = (w: any) => ({ ...w, price: { ...(w.price || {}) } });
      model.value = [
        ...(g.wallpapers || []).map(norm),
        ...(g.hidden || []).map((w: any) => ({ ...norm(w), hidden: true })),
      ];
    } else if (m.editor === 'banner') {
      // 归一化为轮播结构（与 useContentStore.normalizeBanner 对齐）
      model.value = raw.__empty
        ? { autoplay: true, interval: 5000, transition: 'fade', showDots: true, slides: [] }
        : raw;
    } else if (m.editor === 'music') {
      // 包装结构 { tracks, collections }（collections 为歌单/场景合集，策展集合模型）
      const g = raw.__empty ? { tracks: [], collections: [] } : raw;
      if (!Array.isArray(g.collections)) g.collections = [];
      rawDoc.value = g; // 保留池：保存时合并回写，且编辑器直接 mutate 其 collections
      // 规范化：保证 unlockCost 是对象（模板里 v-model 到 unlockCost.gold/pearl/...）
      model.value = {
        tracks: (g.tracks || []).map((t: any) => ({ ...t, unlockCost: { ...(t.unlockCost || {}) } })),
        collections: g.collections,
      };
    } else if (m.editor === 'pet') {
      // 只暴露规范字段给编辑器；petMap/travelMap 是运行时派生，不入文件、保存时由 store 重建
      const g = raw.__empty
        ? { elements: [], params: {}, pets: [], foods: [], travels: [] }
        : raw;
      model.value = {
        elements: Array.isArray(g.elements) ? g.elements : [],
        params: g.params && typeof g.params === 'object' ? g.params : {},
        pets: Array.isArray(g.pets) ? g.pets : [],
        foods: Array.isArray(g.foods) ? g.foods : [],
        travels: Array.isArray(g.travels) ? g.travels : [],
      };
    } else if (m.editor === 'shrine') {
      // 只暴露规范字段给编辑器；incenseMap/deityMap 是运行时派生，不入文件、保存时由 store 重建
      const g = raw.__empty
        ? { params: {}, incenses: [], deities: [], fortunes: [], almanac: {} }
        : raw;
      model.value = {
        params: g.params && typeof g.params === 'object' ? g.params : {},
        incenses: Array.isArray(g.incenses) ? g.incenses : [],
        deities: Array.isArray(g.deities) ? g.deities : [],
        fortunes: Array.isArray(g.fortunes) ? g.fortunes : [],
        almanac: g.almanac && typeof g.almanac === 'object' ? g.almanac : {},
      };
    } else if (m.editor === 'artifacts') {
      // 只暴露规范字段给编辑器；法器运行态进度（等级/装备/碎片）不在文件内，由 store 自行重建
      const g = raw.__empty
        ? { params: {}, artifacts: [] }
        : raw;
      model.value = {
        params: g.params && typeof g.params === 'object' ? g.params : {},
        artifacts: Array.isArray(g.artifacts) ? g.artifacts : [],
      };
    } else if (m.editor === 'bottle') {
      // 只暴露规范字段给编辑器；bottle/drift 全量结构即规范字段，运行态进度不在此
      const g = raw.__empty
        ? { bottle: {}, drift: {} }
        : raw;
      model.value = {
        bottle: g.bottle && typeof g.bottle === 'object' ? g.bottle : {},
        drift: g.drift && typeof g.drift === 'object' ? g.drift : {},
      };
    } else if (m.editor === 'farm') {
      // farm.json 为扁平全量结构，直接交给 FarmEditor mutate（编辑器的 watch 自适应补默认）
      model.value = raw.__empty ? {} : raw;
    } else if (m.editor === 'race') {
      // race.json 为扁平全量结构，直接交给 RaceEditor mutate
      model.value = raw.__empty ? {} : raw;
    } else if (m.editor === 'checkin') {
      // checkin.json 为扁平全量结构，直接交给 CheckinEditor mutate
      model.value = raw.__empty ? {} : raw;
    } else if (m.editor === 'pool') {
      // pool.json 为扁平全量结构，直接交给 PoolEditor mutate
      model.value = raw.__empty ? {} : raw;
    } else if (m.editor === 'notice') {
      // notices.json 顶层是数组；空/缺失回退空数组（编辑器自愈补默认行）
      model.value = Array.isArray(raw) ? raw : [];
    } else {
      model.value = raw.__empty ? {} : raw;
    }
    loadedPayload.value = buildPayload(); // 记录「打开时原文」序列化结果，供变更对比
  }

async function load(id: string) {
  loading.value = true;
  msg.value = '';
  try {
    const raw: any = await api(id);
    applyRaw(id, raw);
  } catch (e: any) {
    msg.value = '加载失败：' + (e?.message || e);
    model.value = null;
  } finally {
    loading.value = false;
  }
}

function switchModule(id: string) {
  activeId.value = id;
  load(id);
}

function buildPayload(): any {
  const m = active.value;
  if (m.editor === 'gallery') {
    const items: any[] = model.value || [];
    // 以原始文档为底合并回写 → collections 及今后新增字段都不会被编辑器覆盖丢失（铁律13⑦）
    return {
      ...(rawDoc.value || {}),
      wallpapers: items.filter((w) => !w.hidden).map(({ hidden, ...w }) => w),
      hidden: items.filter((w) => w.hidden).map(({ hidden, ...w }) => w),
    };
  }
  if (m.editor === 'music') {
    const d: any = model.value || {};
    // 以原始文档为底合并回写 → collections 及今后曲目新增字段都不会被覆盖丢失（铁律13⑦）
    return {
      ...(rawDoc.value || {}),
      tracks: (d.tracks || []).map((t: any) => ({ ...t, unlockCost: { ...(t.unlockCost || {}) } })),
      collections: d.collections || [],
    };
  }
  if (m.editor === 'pet') {
    const d: any = model.value || {};
    // 仅回写规范字段，派生 map 不落盘（保持 pet.json 干净，store 侧重建）
    return {
      elements: d.elements || [],
      params: d.params || {},
      pets: d.pets || [],
      foods: d.foods || [],
      travels: d.travels || [],
    };
  }
  if (m.editor === 'shrine') {
    const d: any = model.value || {};
    // 仅回写规范字段，store 侧重建 incenseMap/deityMap 派生映射
    return {
      params: d.params || {},
      incenses: d.incenses || [],
      deities: d.deities || [],
      fortunes: d.fortunes || [],
      almanac: d.almanac || {},
    };
  }
  if (m.editor === 'artifacts') {
    const d: any = model.value || {};
    // 仅回写规范字段，运行态进度不落盘（store 侧重建）
    return {
      params: d.params || {},
      artifacts: d.artifacts || [],
    };
  }
  if (m.editor === 'bottle') {
    const d: any = model.value || {};
    // 仅回写规范字段（bottle/drift 全量结构）；运行态进度不落盘
    return {
      bottle: d.bottle && typeof d.bottle === 'object' ? d.bottle : {},
      drift: d.drift && typeof d.drift === 'object' ? d.drift : {},
    };
  }
  if (m.editor === 'farm') {
    // farm.json 扁平全量结构，编辑器直接 mutate 原对象；派生表不落盘，store 侧重建
    return model.value || {};
  }
  if (m.editor === 'race') {
    // race.json 扁平全量结构，编辑器直接 mutate 原对象
    return model.value || {};
  }
  if (m.editor === 'checkin') {
    // checkin.json 扁平全量结构，编辑器直接 mutate 原对象
    return model.value || {};
  }
  if (m.editor === 'pool') {
    // pool.json 扁平全量结构，编辑器直接 mutate 原对象
    return model.value || {};
  }
  if (m.editor === 'notice') {
    // notices.json 顶层是数组，直接回写；编辑器给每行加了内部 __key（仅 v-for 稳定用），落盘前剔除
    const arr: any[] = Array.isArray(model.value) ? model.value : [];
    return arr.map(({ __key, ...rest }) => ({
      id: typeof rest.id === 'string' ? rest.id : '',
      title: typeof rest.title === 'string' ? rest.title : '',
      body: typeof rest.body === 'string' ? rest.body : '',
      pinned: !!rest.pinned,
      createdAt: typeof rest.createdAt === 'string' ? rest.createdAt : new Date().toISOString(),
    }));
  }
  return model.value;
}

async function save() {
  busy.value = true;
  msg.value = '保存中…';
  try {
    // 保存前快照：抓取「保存前」线上内容（即当前已发布态），成功后再压栈，便于一键回滚
    const before: any = await api(activeId.value);
    const res: any = await api(activeId.value, 'POST', buildPayload());
    if (res.ok) {
      const arr = snapshots.value[activeId.value] || [];
      arr.unshift({ ts: Date.now(), content: before });
      snapshots.value[activeId.value] = arr.slice(0, 10); // 最多留存 10 条
      persistSnaps();
      loadedPayload.value = buildPayload(); // 保存后「原文」基准更新，对比归零
      msg.value = '✅ 已保存到 public/content/（dev 热更立即生效）';
    } else {
      msg.value = '❌ 保存失败：' + (res.error || '');
    }
  } catch (e: any) {
    msg.value = '保存失败：' + (e?.message || e);
  } finally {
    busy.value = false;
  }
}

async function buildAndSave() {
  await save();
  if (!msg.value.startsWith('✅')) return;
  busy.value = true;
  msg.value = '🔨 正在构建…（完成后请让我执行 CloudStudio 发布）';
  const res: any = await api('build', 'POST', {});
  busy.value = false;
  msg.value = res.ok ? '✅ 构建成功，请让我执行 CloudStudio 发布' : '❌ 构建失败：' + (res.log || res.error || '');
}

function onJsonUpdate(v: any) {
  model.value = v;
}

onMounted(() => load(activeId.value));
</script>

<style scoped>
.adm { display: flex; height: 100%; overflow: hidden; }
/* 左侧导航 */
.adm-side { width: 240px; flex: none; border-right: 1px solid #e6e9f2; background: #f7f8fc; overflow-y: auto; padding: 16px 12px; }
.brand { display: flex; align-items: center; gap: 10px; padding: 4px 6px 14px; }
.brand .logo { font-size: 26px; }
.brand h1 { font-size: 15px; margin: 0; }
.brand p { font-size: 11px; color: #8a90a0; margin: 2px 0 0; }
.grp { margin-bottom: 14px; }
.grp-name { font-size: 11px; color: #a0a4b2; padding: 6px 8px; margin: 0; letter-spacing: .5px; }
.nav-item { width: 100%; display: flex; align-items: center; gap: 8px; padding: 9px 10px; border: none; background: transparent; border-radius: 10px; cursor: pointer; font-size: 13px; color: #4a4f63; text-align: left; }
.nav-item:hover { background: #eef1f8; }
.nav-item.on { background: #6e8efb; color: #fff; }
.nav-item .ico { font-size: 16px; }
.nav-item .lbl { flex: 1; }
.nav-item .dot { color: #d6b45d; font-size: 8px; }

/* 右侧操作区 */
.adm-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.adm-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 22px; border-bottom: 1px solid #e6e9f2; background: #fff; position: sticky; top: 0; z-index: 2; flex-wrap: wrap; }
.title-box h2 { font-size: 17px; margin: 0; }
.title-box p { font-size: 12px; color: #8a90a0; margin: 3px 0 0; }
.actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.act-sep { width: 1px; height: 22px; background: #e0e4ef; margin: 0 2px; }
.btn { border: 1px solid #d6dcec; background: #fff; border-radius: 10px; padding: 8px 14px; font-size: 13px; cursor: pointer; position: relative; }
.btn.primary { background: #6e8efb; color: #fff; border-color: #6e8efb; }
.btn.ghost { background: #f3f5fb; color: #4a4f63; }
.btn.publish { background: #12b886; color: #fff; border-color: #12b886; }
.pub-log {
  margin: 0; padding: 10px 22px; max-height: 220px; overflow: auto;
  background: #1e222b; color: #c9d1d9; font-size: 12px; line-height: 1.6;
  white-space: pre-wrap; word-break: break-all;
}
.btn.sm { padding: 4px 10px; font-size: 12px; }
.btn:disabled { opacity: .5; cursor: default; }
.badge { position: absolute; top: -6px; right: -6px; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 9px; background: #6e8efb; color: #fff; font-size: 10px; line-height: 16px; text-align: center; }
.msg { margin: 0; padding: 8px 22px; background: #eef3ff; color: #3a5; font-size: 13px; min-height: 18px; }
.adm-content { flex: 1; overflow-y: auto; padding: 22px; }
.loading { padding: 40px; color: #8a90a0; text-align: center; }

/* 快照 / 对比 弹层 */
.snap-pop, .diff-pop, .auth-pop { position: fixed; inset: 0; background: rgba(20,24,40,.4); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 24px; }
.auth-box { width: min(380px, 92vw); background: #fff; border-radius: 16px; box-shadow: 0 18px 50px rgba(0,0,0,.25); padding: 22px; display: flex; flex-direction: column; gap: 12px; }
.auth-box header { font-size: 16px; }
.auth-tip { font-size: 12px; color: #8a90a0; margin: 0; line-height: 1.6; }
.auth-tip code { background: #f0f2f8; padding: 1px 6px; border-radius: 6px; font-size: 11.5px; }
.auth-input { height: 40px; border: 1px solid #dfe3ee; border-radius: 10px; padding: 0 12px; font-size: 14px; outline: none; }
.auth-input:focus { border-color: #8fa6e8; }
.snap-box, .diff-box { width: min(560px, 92vw); max-height: 80vh; background: #fff; border-radius: 16px; box-shadow: 0 18px 50px rgba(0,0,0,.25); display: flex; flex-direction: column; overflow: hidden; }
.snap-box header, .diff-box header { display: flex; align-items: center; gap: 8px; padding: 14px 18px; border-bottom: 1px solid #eef0f6; font-size: 15px; }
.diff-box header .sub { font-size: 12px; color: #8a90a0; font-weight: 400; }
.snap-box header .x, .diff-box header .x { margin-left: auto; cursor: pointer; color: #a0a4b2; font-size: 15px; }
.snap-tip, .diff-empty { padding: 10px 18px; font-size: 12px; color: #8a90a0; margin: 0; }
.snap-list, .diff-list { overflow-y: auto; padding: 6px 10px 14px; }
.snap-row { display: flex; align-items: center; justify-content: space-between; padding: 9px 10px; border-radius: 10px; }
.snap-row:hover { background: #f5f7fc; }
.snap-time { font-size: 13px; color: #4a4f63; }
.snap-empty { padding: 18px; text-align: center; color: #a0a4b2; font-size: 13px; }
.diff-row { display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-radius: 8px; font-size: 12.5px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.diff-row:nth-child(odd) { background: #fafbfe; }
.diff-row.add { color: #16a34a; }
.diff-row.del { color: #dc2626; }
.diff-row.chg { color: #b45309; }
.d-path { flex: 1; color: #4a4f63; word-break: break-all; }
.d-from, .d-to { max-width: 38%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.d-arrow { color: #a0a4b2; }
</style>
