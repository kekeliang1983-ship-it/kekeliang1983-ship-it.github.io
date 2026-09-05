<template>
  <div class="gallery-ed">
    <!-- ===== 策展集合（精选 / 限定 / 季节…）与五行解耦，一张壁纸可同属多个集合 ===== -->
    <section class="cols">
      <div class="cols-head">
        <div class="ch-l">
          <b>策展集合</b>
          <span class="hint">与五行解耦 · 一张壁纸可同属多个集合 · order 越小越靠前</span>
        </div>
        <button class="add" @click="addCollection">＋ 新集合</button>
      </div>

      <p v-if="!cols.length" class="empty">暂无集合。点「＋ 新集合」可创建「精选」这类人工策展分类（不分五行）。</p>

      <div class="col-item" v-for="(c, i) in cols" :key="i">
        <div class="col-top">
          <input v-model="c.icon" class="ic" maxlength="2" placeholder="⭐" title="emoji 图标" />
          <input v-model="c.label" class="lb" placeholder="集合名（如 精选）" />
          <input v-model="c.id" class="id" :class="{ bad: dupIds.has(c.id) }" placeholder="id（英文唯一）" title="tab 过滤用的唯一 key" />
          <input type="number" v-model.number="c.order" class="ord" title="排序：0=最前，100+ 排五行之后" />
          <label class="en"><input type="checkbox" v-model="c.enabled" /> 启用</label>
          <button class="mini" @click="openId = openId === c.id ? '' : c.id">{{ openId === c.id ? '收起' : `选成员 (${(c.ids || []).length})` }}</button>
          <button class="del" @click="removeCollection(i)">✕</button>
        </div>

        <p class="warn" v-if="dupIds.has(c.id)">⚠ id「{{ c.id }}」与其他集合重复，前台会互相覆盖，请改一个。</p>
        <p class="warn" v-if="staleCount(c) > 0">
          ⚠ 有 {{ staleCount(c) }} 个失效引用（壁纸已删除）。
          <button class="link" @click="cleanStale(c)">一键清理</button>
        </p>

        <div v-if="openId === c.id" class="members">
          <input v-model="kw" class="m-search" placeholder="🔍 搜索壁纸名 / id" />
          <div class="m-grid">
            <label
              v-for="w in pickList"
              :key="w.id"
              class="m-cell"
              :class="{ on: (c.ids || []).includes(w.id) }"
            >
              <input type="checkbox" :checked="(c.ids || []).includes(w.id)" @change="toggleMember(c, w.id)" />
              <span class="m-ic">{{ w.emoji || '🖼️' }}</span>
              <em>{{ w.name }}</em>
              <small>{{ w.id }}</small>
            </label>
          </div>
          <p class="m-tip" v-if="!pickList.length">没有匹配的壁纸。</p>
        </div>
      </div>
    </section>

    <div class="toolbar">
      <span class="cnt">共 {{ list.length }} 张（常规 {{ normalCount }} / 隐藏 {{ hiddenCount }}）</span>
      <button class="add" @click="addItem">＋ 新增一张</button>
    </div>

    <div class="grid">
      <div class="card" v-for="(wp, i) in list" :key="wp.id || i">
        <div class="head">
          <span class="badge" :class="{ hidden: wp.hidden }">{{ wp.hidden ? '隐藏白卡' : '常规' }}</span>
          <label class="hid"><input type="checkbox" v-model="wp.hidden" /> 设为隐藏</label>
          <button class="del" @click="remove(i)" title="移除">✕</button>
        </div>

        <ImageField v-model="wp.src" label="缩略图" :upload-name="wp.id" :max-dim="1080" />
        <ImageField v-model="wp.originalSrc" label="原图(可选)" :upload-name="wp.id + '_full'" :max-dim="1600" />

        <div class="row"><label>名称</label><input v-model="wp.name" /></div>
        <div class="row two">
          <div><label>属性</label>
            <select v-model="wp.element">
              <option v-for="e in ELEMENTS" :key="e" :value="e">{{ elLabel(e) }}</option>
            </select>
          </div>
          <div><label>品质</label>
            <select v-model="wp.quality">
              <option v-for="q in QUALITIES" :key="q" :value="q">{{ qualityLabel(q) }}</option>
            </select>
          </div>
        </div>
        <div class="row"><label>价格（留空=0，单位：元宝/灵珠/魔丸/天玑）</label>
          <div class="price">
            <input type="number" min="0" v-model.number="wp.price.gold" placeholder="元宝" />
            <input type="number" min="0" v-model.number="wp.price.pearl" placeholder="灵珠" />
            <input type="number" min="0" v-model.number="wp.price.magic" placeholder="魔丸" />
            <input type="number" min="0" v-model.number="wp.price.jade" placeholder="天玑" />
          </div>
        </div>
        <div class="row"><label>Emoji 兜底（无图时显示）</label><input v-model="wp.emoji" maxlength="4" /></div>
        <p class="src" v-if="wp.src">{{ wp.src }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import ImageField from '../components/ImageField.vue';

const props = defineProps<{ items: any[]; collections?: any[] }>();
const ELEMENTS = ['gold', 'wood', 'water', 'fire', 'earth'];
const QUALITIES = ['common', 'uncommon', 'legendary'];
const elLabel = (e: string) => ({ gold: '金', wood: '木', water: '水', fire: '火', earth: '土' }[e] || e);
const qualityLabel = (q: string) => ({ common: '凡品', uncommon: '灵品', legendary: '仙品' }[q] || q);

/** 空值容错：父级数据未就绪（null）时按空数组渲染，避免整页白屏 */
const list = computed(() => props.items || []);

// 自愈：模板里 v-model 到 price.gold/pearl/magic/jade，若某条目没有 price
// 对象会读取 undefined.gold 抛错白屏。编辑器内部补齐，不依赖调用方规范化。
watch(
  list,
  (ws) => ws.forEach((w: any) => { if (!w || typeof w !== 'object') return; if (!w.price) w.price = {}; }),
  { immediate: true, deep: false },
);

const normalCount = computed(() => list.value.filter((w) => !w.hidden).length);
const hiddenCount = computed(() => list.value.filter((w) => w.hidden).length);

function addItem() {
  const n = normalCount.value + 1;
  list.value.push({
    id: `wp_${String(n).padStart(3, '0')}_new`,
    name: '新壁纸', element: 'gold', quality: 'common',
    price: { gold: 0, pearl: 0, magic: 0, jade: 0 }, emoji: '🖼️',
  });
}
function remove(i: number) { list.value.splice(i, 1); }

/* ---------- 策展集合（铁律13：多样灵活 / 参数可调 / 校验防呆） ---------- */
const cols = computed<any[]>(() => props.collections ?? []);
const openId = ref('');   // 当前展开「选成员」的集合 id
const kw = ref('');       // 成员搜索关键词

/** 可选成员 = 常规壁纸（隐藏白卡不进 tab，故排除），支持名称/id 搜索 */
const pickList = computed(() => {
  const k = kw.value.trim().toLowerCase();
  return (props.items || []).filter((w: any) => {
    if (w?.hidden) return false;
    if (!k) return true;
    return String(w.name || '').toLowerCase().includes(k)
      || String(w.id || '').toLowerCase().includes(k);
  });
});

/** 防呆：id 重复会让前台 tab 互相覆盖，这里实时标红告警 */
const dupIds = computed(() => {
  const seen = new Set<string>();
  const dups = new Set<string>();
  for (const c of cols.value) {
    const id = String(c?.id || '');
    if (!id) continue;
    if (seen.has(id)) dups.add(id); else seen.add(id);
  }
  return dups;
});

function addCollection() {
  let n = cols.value.length + 1;
  let id = `collection_${n}`;
  while (cols.value.some((c: any) => c.id === id)) { n += 1; id = `collection_${n}`; }
  cols.value.push({ id, label: '新集合', icon: '✨', ids: [], order: 10 + cols.value.length * 10, enabled: true });
  openId.value = id;
}
function removeCollection(i: number) { cols.value.splice(i, 1); }

function toggleMember(c: any, wid: string) {
  if (!Array.isArray(c.ids)) c.ids = [];
  const at = c.ids.indexOf(wid);
  if (at >= 0) c.ids.splice(at, 1); else c.ids.push(wid);
}

/** 引用完整性：集合里指向「已被删除壁纸」的失效 id 数量 */
function staleCount(c: any): number {
  const alive = new Set((props.items || []).map((w: any) => w?.id));
  return (Array.isArray(c.ids) ? c.ids : []).filter((id: string) => !alive.has(id)).length;
}
function cleanStale(c: any) {
  const alive = new Set((props.items || []).map((w: any) => w?.id));
  c.ids = (Array.isArray(c.ids) ? c.ids : []).filter((id: string) => alive.has(id));
}
</script>

<style scoped>
.gallery-ed { display: flex; flex-direction: column; gap: 14px; }
.toolbar { display: flex; align-items: center; justify-content: space-between; }
.cnt { font-size: 13px; color: #858999; }
.add { border: 1px solid #6e8efb; background: #eef3ff; color: #4060d0; border-radius: 10px; padding: 8px 14px; font-size: 13px; cursor: pointer; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
.card { border: 1px solid #e6e9f2; border-radius: 14px; padding: 12px; background: #fff; display: flex; flex-direction: column; gap: 10px; }
.head { display: flex; align-items: center; gap: 10px; }
.badge { font-size: 11px; padding: 2px 8px; border-radius: 6px; background: #e7f4ee; color: #4a8a6a; }
.badge.hidden { background: #f3ecfb; color: #8a63c4; }
.hid { font-size: 11px; color: #8a90a0; display: flex; align-items: center; gap: 4px; margin-left: auto; }
.del { border: 1px solid #f0d0d0; background: #fff0f0; color: #c0392b; border-radius: 8px; padding: 5px 9px; cursor: pointer; }
.row { display: flex; flex-direction: column; gap: 3px; }
.row.two { flex-direction: row; gap: 8px; }
.row.two > div { flex: 1; display: flex; flex-direction: column; gap: 3px; }
.row label { font-size: 11px; color: #8a90a0; }
.row input, .row select { border: 1px solid #dde2ee; border-radius: 8px; padding: 6px 8px; font-size: 13px; width: 100%; box-sizing: border-box; }
.price { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
.price input { padding: 6px 4px; font-size: 12px; }
.src { font-size: 10px; color: #9aa1b3; word-break: break-all; margin: 0; }

/* ===== 策展集合 ===== */
.cols { border: 1px solid #e6e9f2; border-radius: 14px; padding: 12px; background: #fbfcff; display: flex; flex-direction: column; gap: 10px; }
.cols-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.ch-l { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.ch-l b { font-size: 14px; }
.hint { font-size: 11px; color: #9aa1b3; }
.empty { margin: 0; font-size: 12px; color: #9aa1b3; }
.col-item { border: 1px solid #e6e9f2; border-radius: 12px; padding: 10px; background: #fff; display: flex; flex-direction: column; gap: 8px; }
.col-top { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.col-top input { border: 1px solid #dde2ee; border-radius: 8px; padding: 6px 8px; font-size: 13px; box-sizing: border-box; }
.col-top .ic { width: 46px; text-align: center; }
.col-top .lb { flex: 1 1 120px; }
.col-top .id { flex: 1 1 130px; font-family: ui-monospace, Menlo, monospace; }
.col-top .id.bad { border-color: #e0705f; background: #fff6f5; }
.col-top .ord { width: 66px; }
.en { font-size: 11px; color: #6b7280; display: flex; align-items: center; gap: 3px; }
.mini { border: 1px solid #cfd8ee; background: #f4f7ff; color: #4060d0; border-radius: 8px; padding: 5px 9px; font-size: 12px; cursor: pointer; }
.warn { margin: 0; font-size: 11px; color: #b4542f; background: #fff5ef; border: 1px solid #f6d9c8; border-radius: 8px; padding: 6px 8px; }
.link { border: none; background: none; color: #b4542f; text-decoration: underline; cursor: pointer; font-size: 11px; padding: 0 2px; }
.members { display: flex; flex-direction: column; gap: 8px; border-top: 1px dashed #e6e9f2; padding-top: 8px; }
.m-search { border: 1px solid #dde2ee; border-radius: 8px; padding: 6px 8px; font-size: 12px; width: 100%; box-sizing: border-box; }
.m-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(124px, 1fr)); gap: 6px; max-height: 260px; overflow-y: auto; }
.m-cell { display: flex; align-items: center; gap: 5px; border: 1px solid #e6e9f2; border-radius: 9px; padding: 6px 7px; font-size: 11px; cursor: pointer; background: #fff; }
.m-cell.on { border-color: #7ea2f5; background: #f2f7ff; }
.m-cell .m-ic { font-size: 15px; }
.m-cell em { font-style: normal; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.m-cell small { color: #aab0c0; font-size: 9px; }
.m-tip { margin: 0; font-size: 11px; color: #9aa1b3; }
</style>
