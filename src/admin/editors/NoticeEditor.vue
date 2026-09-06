<!--
  src/admin/editors/NoticeEditor.vue —— 系统公告可视化后台
  notices.json 顶层是数组：[{ id, title, body, pinned, createdAt }]
  改动经内容层接缝实时生效（App 刷新即拉 notices.json，首页铃铛角标随之变化）。
-->
<template>
  <div class="editor">
    <div class="ed-head">
      <div class="ed-title">📢 系统公告</div>
      <div class="ed-sub">新增 / 编辑 / 删除 / 置顶 · 保存后首页铃铛角标与公告弹窗实时生效（玩家点开即标记已读）</div>
    </div>

    <div class="ed-body">
      <section class="ed-sec">
        <h4>公告列表（共 {{ list.length }} 条）</h4>
        <p class="ed-hint">置顶公告会排在最前并以 📌 标记；删除不可恢复，请谨慎。</p>

        <div class="ed-list">
          <div class="ed-row ed-row-head">
            <span class="c-pin">置顶</span>
            <span class="c-title">标题</span>
            <span class="c-body">正文</span>
            <span class="c-time">创建时间</span>
            <span class="c-op"></span>
          </div>

          <div class="ed-row" v-for="(n, i) in list" :key="n.__key">
            <label class="c-pin">
              <input type="checkbox" v-model="n.pinned" @change="onPinChange(i)" />
            </label>
            <input class="c-title" v-model="n.title" maxlength="60" placeholder="公告标题" />
            <textarea class="c-body" v-model="n.body" rows="2" placeholder="公告正文"></textarea>
            <span class="c-time">{{ fmtTime(n.createdAt) }}</span>
            <button class="ed-del" @click="remove(i)">✕</button>
          </div>

          <button class="ed-add" @click="add()">+ 新增公告</button>
        </div>
      </section>

      <section class="ed-sec">
        <h4>即时预览（玩家端顺序：置顶优先 → 新→旧）</h4>
        <div class="ed-preview">
          <div v-for="n in previewList" :key="n.__key" class="pv-item" :class="{ pinned: n.pinned }">
            <span class="pv-pin" v-if="n.pinned">📌</span>
            <b class="pv-title">{{ n.title || '（无标题）' }}</b>
            <p class="pv-body">{{ n.body || '（无正文）' }}</p>
          </div>
          <p v-if="!previewList.length" class="pv-empty">暂无公告（保存后首页铃铛无红点）</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ data: any }>();
// data 即 notices.json 顶层数组；编辑器直接 mutate 原数组（保存时 AdminPage 原样回写）
const list = computed<any[]>(() => (Array.isArray(props.data) ? props.data : []));

// 预览：置顶优先，其次按 createdAt 倒序（与玩家端 NoticeModal 排序一致）
const previewList = computed<any[]>(() => {
  const arr = list.value.slice();
  arr.sort((a: any, b: any) => {
    const pa = a?.pinned ? 1 : 0;
    const pb = b?.pinned ? 1 : 0;
    if (pa !== pb) return pb - pa;
    const ta = new Date(a?.createdAt || 0).getTime() || 0;
    const tb = new Date(b?.createdAt || 0).getTime() || 0;
    return tb - ta;
  });
  return arr;
});

function genId(): string {
  return 'n-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
}

function add() {
  list.value.push({
    __key: Math.random().toString(36).slice(2),
    id: genId(),
    title: '',
    body: '',
    pinned: false,
    createdAt: new Date().toISOString(),
  });
}

function remove(i: number) {
  list.value.splice(i, 1);
}

// 勾选置顶时，确保该条有合法 id/createdAt（自愈，防止缺字段保存崩 App）
function onPinChange(i: number) {
  const n = list.value[i];
  if (!n) return;
  if (typeof n.id !== 'string' || !n.id) n.id = genId();
  if (typeof n.createdAt !== 'string' || !n.createdAt) n.createdAt = new Date().toISOString();
}

function fmtTime(s: any): string {
  if (typeof s !== 'string' || !s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '—';
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// 自愈：组件挂载时补全每条公告缺失字段，并给每行补稳定 __key（避免 v-for 错位）
watchSelfHeal();
function watchSelfHeal() {
  const arr = list.value;
  for (const n of arr) {
    if (!n || typeof n !== 'object') continue;
    if (typeof n.__key !== 'string') n.__key = Math.random().toString(36).slice(2);
    if (typeof n.id !== 'string' || !n.id) n.id = genId();
    if (typeof n.title !== 'string') n.title = '';
    if (typeof n.body !== 'string') n.body = '';
    if (typeof n.pinned !== 'boolean') n.pinned = false;
    if (typeof n.createdAt !== 'string' || !n.createdAt) n.createdAt = new Date().toISOString();
  }
}
</script>

<style scoped>
.editor { display: flex; flex-direction: column; gap: 12px; }
.ed-head { padding: 4px 0 8px; border-bottom: 1px solid var(--bg-card-strong); }
.ed-title { font-size: 18px; font-weight: 800; }
.ed-sub { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.ed-body { display: flex; flex-direction: column; gap: 16px; }
.ed-sec h4 { margin: 0 0 8px; font-size: 14px; font-weight: 700; }
.ed-hint { font-size: 12px; color: var(--text-muted); margin: 0 0 6px; }
.ed-list { display: flex; flex-direction: column; gap: 8px; }
.ed-row { display: grid; grid-template-columns: 52px minmax(160px, 1.4fr) minmax(220px, 2fr) 140px 32px; gap: 8px; align-items: start; }
.ed-row-head { font-size: 11px; color: var(--text-muted); font-weight: 700; align-items: center; }
.ed-row input[type="text"], .ed-row input.c-title, .ed-row textarea, .ed-row .c-title {
  padding: 6px 8px; border-radius: 7px; border: 1px solid var(--bg-card-strong); background: var(--bg-card); color: var(--text); font-family: inherit;
}
.c-title { width: 100%; }
.c-body { width: 100%; resize: vertical; line-height: 1.4; }
.c-pin { display: flex; align-items: center; justify-content: center; }
.c-time { font-size: 11px; color: var(--text-muted); align-self: center; }
.ed-del { border: none; background: transparent; color: #E0913A; cursor: pointer; font-size: 14px; align-self: center; }
.ed-add { align-self: flex-start; margin-top: 4px; padding: 6px 14px; border-radius: 8px; border: 1px dashed var(--bg-card-strong); background: transparent; color: var(--growth); cursor: pointer; }
.ed-preview { display: flex; flex-direction: column; gap: 8px; padding: 12px; border-radius: 10px; background: var(--bg-card); }
.pv-item { display: flex; flex-direction: column; gap: 2px; padding: 10px; border-radius: 10px; background: var(--bg-card-strong); }
.pv-item.pinned { border: 1px solid var(--growth); }
.pv-pin { font-size: 12px; }
.pv-title { font-size: 14px; }
.pv-body { font-size: 12px; color: var(--text-muted); margin: 0; white-space: pre-wrap; }
.pv-empty { font-size: 12px; color: var(--text-muted); margin: 0; }
</style>
