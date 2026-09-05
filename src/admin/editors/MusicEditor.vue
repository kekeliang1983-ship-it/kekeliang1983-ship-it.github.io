<template>
  <div class="music-ed">
    <!-- ===================== 曲目 ===================== -->
    <div class="toolbar">
      <span class="cnt">共 {{ list.length }} 首（已解锁 {{ unlockedCount }}）</span>
      <button class="add" @click="addTrack">＋ 新增曲目</button>
    </div>

    <div class="track" v-for="(t, i) in list" :key="t.id || i">
      <div class="top">
        <input class="id" v-model="t.id" :class="{ bad: dupTrackIds.has(t.id) }" placeholder="track_007" title="唯一 id；重复会互相覆盖" />
        <input class="name" v-model="t.name" placeholder="曲目名" />
        <span class="t-size" v-if="sizeMap[t.id]">{{ sizeMap[t.id] }}</span>
        <button class="del" @click="remove(i)">✕</button>
      </div>
      <p class="warn" v-if="dupTrackIds.has(t.id)">⚠ id「{{ t.id }}」重复，前台会互相覆盖，请改一个。</p>

      <div class="row">
        <label>时长(秒)<input type="number" min="0" v-model.number="t.durationSeconds" /></label>
        <label class="chk"><input type="checkbox" v-model="t.isUnlocked" /> 默认解锁</label>
        <label>排序<input type="number" v-model.number="t.order" title="列表排序，越小越靠前" /></label>
        <label class="chk"><input type="checkbox" v-model="t.featured" /> 推荐位</label>
        <label class="chk"><input type="checkbox" v-model="t.loop" /> 循环</label>
        <label class="chk"><input type="checkbox" v-model="t.countMilestone" /> 计里程碑</label>
      </div>

      <div class="row">
        <label class="grow">音频
          <input class="src" v-model="t.src" placeholder="/audio/track_007.mp3" />
        </label>
        <label class="file">📁 上传
          <input type="file" accept="audio/*" @change="onPick(t, $event)" />
        </label>
        <button class="mini" v-if="t.src" @click="previewId = previewId === t.id ? '' : t.id">▶ 试听</button>
      </div>
      <div class="preview" v-if="previewId === t.id && t.src">
        <audio :src="t.src" controls autoplay></audio>
      </div>

      <div class="row">
        <label>分类<input v-model="t.category" placeholder="如 古风 / 自然白噪" /></label>
        <label>五行
          <select v-model="t.element">
            <option :value="undefined">—</option>
            <option value="gold">金</option><option value="wood">木</option>
            <option value="water">水</option><option value="fire">火</option><option value="earth">土</option>
          </select>
        </label>
        <label>品质
          <select v-model="t.quality">
            <option :value="undefined">—</option>
            <option value="common">凡</option><option value="uncommon">灵</option><option value="legendary">仙</option>
          </select>
        </label>
        <label class="grow">标签<input v-model="t.tagStr" placeholder="放松,冥想,睡前（逗号分隔）" @change="syncTags(t)" /></label>
      </div>

      <div class="row">
        <label>淡入(s)<input type="number" step="0.1" min="0" v-model.number="t.fadeIn" /></label>
        <label>淡出(s)<input type="number" step="0.1" min="0" v-model.number="t.fadeOut" /></label>
        <label>音量<input type="number" step="0.05" min="0" max="1" v-model.number="t.volume" /></label>
        <label>典藏里程碑(小时)<input type="number" min="0" v-model.number="t.milestoneHours" placeholder="如 4" /></label>
      </div>

      <div class="row cost">
        <span>解锁费（留空=无）：</span>
        <label>灵珠<input type="number" min="0" v-model.number="t.unlockCost.pearl" /></label>
        <label>魔丸<input type="number" min="0" v-model.number="t.unlockCost.magic" /></label>
        <label>元宝<input type="number" min="0" v-model.number="t.unlockCost.gold" /></label>
        <label>天玑<input type="number" min="0" v-model.number="t.unlockCost.jade" /></label>
      </div>

      <label class="desc">简介<textarea v-model="t.desc" rows="2" placeholder="心境描述 / 一句话介绍"></textarea></label>
    </div>

    <!-- ===================== 歌单 / 场景合集 ===================== -->
    <section class="cols">
      <div class="cols-head">
        <div class="ch-l">
          <b>歌单 / 场景合集</b>
          <span class="hint">与曲目解耦 · 一首曲可同属多个合集 · order 越小越靠前</span>
        </div>
        <button class="add" @click="addCollection">＋ 新合集</button>
      </div>
      <p v-if="!cols.length" class="empty">暂无合集。点「＋ 新合集」可创建「禅意 / 睡前 / 雨天」这类自由分类。</p>

      <div class="col-item" v-for="(c, i) in cols" :key="i">
        <div class="col-top">
          <input v-model="c.icon" class="ic" maxlength="2" placeholder="🎵" title="emoji 图标" />
          <input v-model="c.label" class="lb" placeholder="合集名（如 禅意）" />
          <input v-model="c.id" class="id" :class="{ bad: dupColIds.has(c.id) }" placeholder="id（英文唯一）" title="tab 过滤用的唯一 key" />
          <input type="number" v-model.number="c.order" class="ord" title="排序：0=最前" />
          <label class="en"><input type="checkbox" v-model="c.enabled" /> 启用</label>
          <button class="mini" @click="openId = openId === c.id ? '' : c.id">{{ openId === c.id ? '收起' : `选成员 (${(c.ids || []).length})` }}</button>
          <button class="del" @click="removeCollection(i)">✕</button>
        </div>
        <p class="warn" v-if="dupColIds.has(c.id)">⚠ id「{{ c.id }}」重复，前台会互相覆盖，请改一个。</p>
        <p class="warn" v-if="staleCount(c) > 0">⚠ 有 {{ staleCount(c) }} 个失效引用（曲目已删除）。<button class="link" @click="cleanStale(c)">一键清理</button></p>

        <div v-if="openId === c.id" class="members">
          <input v-model="kw" class="m-search" placeholder="🔍 搜索曲目名 / id" />
          <div class="m-grid">
            <label v-for="t in pickList" :key="t.id" class="m-cell" :class="{ on: (c.ids || []).includes(t.id) }">
              <input type="checkbox" :checked="(c.ids || []).includes(t.id)" @change="toggleMember(c, t.id)" />
              <em>{{ t.name }}</em>
              <small>{{ t.id }}</small>
            </label>
          </div>
          <p class="m-tip" v-if="!pickList.length">没有匹配的曲目。</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { adminFetch } from '../api';

const props = defineProps<{ data: any }>();

/** 空值容错：父级数据未就绪时按空结构渲染，避免整页白屏 */
const list = computed<any[]>(() => (props.data && props.data.tracks) || []);
const cols = computed<any[]>(() => (props.data && props.data.collections) || []);

const previewId = ref('');
const sizeMap = ref<Record<string, string>>({});
const openId = ref('');
const kw = ref('');

// 自愈：unlockCost 缺失会让 v-model 抛错白屏
watch(
  list,
  (ts) => ts.forEach((t: any) => { if (!t || typeof t !== 'object') return; if (!t.unlockCost) t.unlockCost = {}; if (!t.tags) t.tags = []; if (t.tagStr === undefined) t.tagStr = (t.tags || []).join(','); }),
  { immediate: true, deep: false },
);

const unlockedCount = computed(() => list.value.filter((t: any) => t.isUnlocked).length);

/** 重复 id 实时标红（铁律13⑧ 校验防呆） */
const dupTrackIds = computed(() => {
  const seen = new Map<string, number>();
  list.value.forEach((t: any) => { if (t.id) seen.set(t.id, (seen.get(t.id) || 0) + 1); });
  return new Set([...seen.entries()].filter(([, n]) => n > 1).map(([id]) => id));
});
const dupColIds = computed(() => {
  const seen = new Map<string, number>();
  cols.value.forEach((c: any) => { if (c.id) seen.set(c.id, (seen.get(c.id) || 0) + 1); });
  return new Set([...seen.entries()].filter(([, n]) => n > 1).map(([id]) => id));
});

function addTrack() {
  const n = list.value.length + 1;
  list.value.push({
    id: `track_${String(n).padStart(3, '0')}`, name: '新曲目', durationSeconds: 180,
    isUnlocked: false, src: `/audio/track_${String(n).padStart(3, '0')}.mp3`,
    unlockCost: {}, tags: [], tagStr: '', order: n, loop: true, countMilestone: true, volume: 1,
  });
}
function remove(i: number) { list.value.splice(i, 1); }

function syncTags(t: any) {
  t.tags = (t.tagStr || '').split(/[,，]/).map((s: string) => s.trim()).filter(Boolean);
}

/** 音频上传：拖拽/选择 → base64 → dev 中间件写 public/audio（控体积保质量：>3MB 预警） */
async function onPick(t: any, e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const mb = file.size / 1024 / 1024;
  sizeMap.value[t.id] = `${file.name} · ${mb.toFixed(2)}MB${mb > 3 ? ' ⚠建议压到3MB内' : ''}`;
  const reader = new FileReader();
  reader.onload = async () => {
    const base64 = String(reader.result).split(',')[1];
    const fname = `${t.id || 'track'}.mp3`;
    try {
      await adminFetch('/__admin_api/upload', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: `audio/${fname}`, data: base64 }),
      });
      t.src = `/audio/${fname}`;
      previewId.value = t.id;
    } catch { sizeMap.value[t.id] = '上传失败，请重试'; }
  };
  reader.readAsDataURL(file);
}

/* ---------- 歌单合集（复用策展集合模型） ---------- */
function addCollection() {
  cols.value.push({ id: `c${cols.value.length + 1}`, label: '新合集', icon: '🎵', order: cols.value.length + 1, enabled: true, ids: [] });
}
function removeCollection(i: number) { cols.value.splice(i, 1); }
const pickList = computed(() => {
  const k = kw.value.trim().toLowerCase();
  return list.value.filter((t: any) => !k || t.name?.toLowerCase().includes(k) || t.id?.toLowerCase().includes(k));
});
function toggleMember(c: any, id: string) {
  c.ids = c.ids || [];
  c.ids = c.ids.includes(id) ? c.ids.filter((x: string) => x !== id) : [...c.ids, id];
}
const trackIds = computed(() => new Set(list.value.map((t: any) => t.id)));
function staleCount(c: any): number {
  return (c.ids || []).filter((id: string) => !trackIds.value.has(id)).length;
}
function cleanStale(c: any) {
  c.ids = (c.ids || []).filter((id: string) => trackIds.value.has(id));
}
</script>

<style scoped>
.music-ed { display: flex; flex-direction: column; gap: 16px; }
.toolbar { display: flex; align-items: center; justify-content: space-between; }
.cnt { font-size: 13px; color: #858999; }
.add { border: 1px solid #6e8efb; background: #eef3ff; color: #4060d0; border-radius: 10px; padding: 8px 14px; font-size: 13px; cursor: pointer; }
.track { border: 1px solid #e6e9f2; border-radius: 14px; padding: 12px; background: #fff; display: flex; flex-direction: column; gap: 10px; }
.top { display: flex; gap: 8px; align-items: center; }
.id { width: 120px; flex: none; }
.name { flex: 1; }
.t-size { font-size: 11px; color: #9aa; }
.del { border: 1px solid #f0d0d0; background: #fff0f0; color: #c0392b; border-radius: 8px; padding: 6px 10px; cursor: pointer; }
.id.bad { border-color: #e74c3c; background: #fff5f5; }
.warn { font-size: 12px; color: #e74c3c; margin: 0; }
.row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.row label { font-size: 12px; color: #8a90a0; display: flex; align-items: center; gap: 4px; }
.row label.grow { flex: 1; min-width: 180px; }
.row input, .row select, .src { border: 1px solid #dde2ee; border-radius: 8px; padding: 6px 8px; font-size: 13px; box-sizing: border-box; }
.src { width: 240px; }
.chk { width: auto; }
.file { border: 1px dashed #b9c2e6; border-radius: 8px; padding: 6px 10px; cursor: pointer; background: #f7f9ff; }
.mini { border: 1px solid #dde2ee; border-radius: 8px; padding: 6px 10px; background: #fff; cursor: pointer; font-size: 12px; }
.preview audio { width: 100%; height: 36px; }
.desc { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #8a90a0; }
.desc textarea { border: 1px solid #dde2ee; border-radius: 8px; padding: 6px 8px; font-size: 13px; resize: vertical; }
.cost { background: #fafbff; padding: 8px; border-radius: 10px; }

/* 合集面板 */
.cols { border-top: 1px dashed #e3e7f2; padding-top: 14px; display: flex; flex-direction: column; gap: 12px; }
.cols-head { display: flex; align-items: center; justify-content: space-between; }
.ch-l { display: flex; flex-direction: column; }
.ch-l b { font-size: 14px; color: #2c3140; }
.hint { font-size: 11px; color: #9aa1b3; }
.empty { font-size: 13px; color: #9aa1b3; margin: 0; }
.col-item { border: 1px solid #e6e9f2; border-radius: 12px; padding: 10px; background: #fff; }
.col-top { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.col-top .ic { width: 44px; }
.col-top .lb { flex: 1; min-width: 120px; }
.col-top .id { width: 120px; }
.col-top .ord { width: 64px; }
.col-top .en { font-size: 12px; color: #8a90a0; }
.members { margin-top: 10px; }
.m-search { width: 100%; border: 1px solid #dde2ee; border-radius: 8px; padding: 6px 8px; font-size: 13px; box-sizing: border-box; margin-bottom: 8px; }
.m-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; }
.m-cell { display: flex; flex-direction: column; align-items: center; gap: 2px; border: 1px solid #e6e9f2; border-radius: 10px; padding: 8px; cursor: pointer; font-size: 12px; color: #6b7180; }
.m-cell.on { border-color: #6e8efb; background: #eef3ff; color: #4060d0; }
.m-cell em { font-style: normal; }
.m-cell small { color: #b3b9c7; font-size: 10px; }
.m-tip { font-size: 12px; color: #9aa1b3; }
.link { border: 0; background: none; color: #4060d0; cursor: pointer; text-decoration: underline; font-size: 12px; }
</style>
