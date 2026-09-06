<!--
  src/components/NoticeModal.vue —— 系统公告抽屉（玩家端）
  设计要点：
   - 数据来自内容层 notices.json（后台可改）；首页铃铛角标 = 未读数
   - 列表：置顶优先 → 新→旧
   - 点开单条即标记已读（红点随之下降）；「全部已读」一键清零
   - 已读态存 userStore.readNoticeIds（localStorage 持久化）
-->
<template>
  <Overlay :open="open" variant="sheet" @close="onClose">
    <div class="notice">
      <!-- ===== 标题 ===== -->
      <div class="n-head">
        <div class="n-head-l">
          <h3 class="n-title">📢 系统公告</h3>
          <p class="n-sub">未读 <b>{{ unreadCount }}</b> 条 · 点开即标记为已读</p>
        </div>
        <button class="n-all" :disabled="unreadCount === 0" v-feedback="'BUTTON_CLICK'" @click="markAll">
          全部已读
        </button>
      </div>

      <!-- ===== 公告列表 ===== -->
      <div class="n-list" v-if="ordered.length">
        <article
          v-for="n in ordered"
          :key="n.id"
          class="n-item"
          :class="{ unread: isUnread(n), open: openId === n.id }"
          @click="onItemClick(n)"
        >
          <span class="n-pin" v-if="n.pinned">📌</span>
          <div class="n-body">
            <div class="n-meta">
              <span class="n-title2">{{ n.title || '（无标题）' }}</span>
              <span class="n-time">{{ fmtTime(n.createdAt) }}</span>
              <span v-if="isUnread(n)" class="n-dot"></span>
            </div>
            <p class="n-text" v-if="openId === n.id">{{ n.body || '（无正文）' }}</p>
          </div>
        </article>
      </div>

      <!-- ===== 空态 ===== -->
      <div class="n-empty" v-else>暂无公告</div>
    </div>
  </Overlay>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Overlay from '@/components/common/Overlay.vue';
import { useUserStore } from '@/stores/useUserStore';
import { useContentStore } from '@/stores/useContentStore';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const user = useUserStore();
const content = useContentStore();

/** 展开中的公告 id（再次点击收起） */
const openId = ref<string | null>(null);

// 内容层公告：置顶优先，其次按 createdAt 倒序（新→旧）
const ordered = computed<any[]>(() => {
  const arr = Array.isArray(content.notices) ? content.notices : [];
  return arr.slice().sort((a: any, b: any) => {
    const pa = a?.pinned ? 1 : 0;
    const pb = b?.pinned ? 1 : 0;
    if (pa !== pb) return pb - pa;
    const ta = new Date(a?.createdAt || 0).getTime() || 0;
    const tb = new Date(b?.createdAt || 0).getTime() || 0;
    return tb - ta;
  });
});

function isUnread(n: any): boolean {
  return !!(n && typeof n.id === 'string') && !(user.readNoticeIds || []).includes(n.id);
}

const unreadCount = computed(() => user.notifUnread);

function onItemClick(n: any) {
  if (!n || typeof n.id !== 'string') return;
  openId.value = openId.value === n.id ? null : n.id;
  // 点开即标记已读（红点随之下降）
  if (isUnread(n)) user.markNoticeRead(n.id);
}

function markAll() {
  user.markAllNoticesRead();
}

function onClose() {
  emit('close');
}

// 关闭时收起展开，避免下次打开残留
watch(() => props.open, (v) => { if (!v) openId.value = null; });

function fmtTime(s: any): string {
  if (typeof s !== 'string' || !s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '—';
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
</script>

<style scoped>
.notice { display: flex; flex-direction: column; gap: 12px; padding: 4px 2px 8px; }
.n-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--bg-card-strong); }
.n-title { font-size: 18px; font-weight: 800; margin: 0; }
.n-sub { font-size: 12px; color: var(--text-muted); margin: 2px 0 0; }
.n-sub b { color: var(--text); }
.n-all { flex: none; padding: 6px 12px; border-radius: 9px; border: 1px solid var(--bg-card-strong); background: var(--bg-card); color: var(--growth); cursor: pointer; font-size: 13px; }
.n-all:disabled { opacity: .45; cursor: default; }
.n-list { display: flex; flex-direction: column; gap: 10px; max-height: 60vh; overflow-y: auto; }
.n-item { display: flex; gap: 8px; padding: 12px; border-radius: 12px; background: var(--bg-card); cursor: pointer; transition: background .15s; }
.n-item.unread { background: var(--bg-card-strong); }
.n-pin { font-size: 14px; line-height: 1.4; }
.n-body { flex: 1; min-width: 0; }
.n-meta { display: flex; align-items: center; gap: 8px; }
.n-title2 { font-size: 15px; font-weight: 700; flex: 1; min-width: 0; }
.n-time { font-size: 11px; color: var(--text-muted); flex: none; }
.n-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--growth); flex: none; }
.n-text { font-size: 13px; color: var(--text-muted); margin: 8px 0 0; white-space: pre-wrap; line-height: 1.6; }
.n-empty { font-size: 13px; color: var(--text-muted); text-align: center; padding: 24px 0; }
</style>
