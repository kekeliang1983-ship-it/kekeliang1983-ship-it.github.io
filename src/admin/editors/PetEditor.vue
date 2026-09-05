<template>
  <div class="pet-ed">
    <!-- ===================== 1. 全局参数 ===================== -->
    <section class="blk">
      <div class="blk-head">
        <b>① 全局参数</b>
        <span class="hint">仙宠系统所有可调旋钮，改一处全链路生效（与 App 运行态进度严格分离）</span>
      </div>
      <div class="param-grid">
        <label v-for="p in PARAM_DEFS" :key="p.key" class="param">
          <span class="pk">{{ p.label }}</span>
          <input type="number" :step="p.step" v-model.number="cfg.params[p.key]" />
          <span class="ph">{{ p.hint }}</span>
        </label>
      </div>
    </section>

    <!-- ===================== 2. 仙宠本体（换皮/改名/解锁价） ===================== -->
    <section class="blk">
      <div class="blk-head">
        <b>② 仙宠本体</b>
        <span class="hint">五行各一只，可在后台换图/改名/调解锁价（宠物不做增删，五行体系固定）</span>
      </div>
      <div class="pet-card" v-for="(p, i) in cfg.pets" :key="i">
        <ImageField
          :model-value="p.image"
          :label="`${p.elementLabel || p.element} · 立绘`"
          :upload-name="`pet_${p.element}`"
          :max-dim="512"
          :quality="0.85"
          @update:model-value="(v: string) => (p.image = v)"
        />
        <div class="pet-fields">
          <label>五行
            <select v-model="p.element" :class="{ bad: dupPetElements.has(p.element) }">
              <option v-for="el in ELEMENTS" :key="el" :value="el">{{ ELEMENT_LABEL[el] }}</option>
            </select>
          </label>
          <label>主名<input v-model="p.name" placeholder="如 白泽" /></label>
          <label>昵称<input v-model="p.nickname" placeholder="如 金系精灵" /></label>
          <label>体系标签<input v-model="p.elementLabel" placeholder="如 金系" /></label>
          <label>emoji<input v-model="p.emoji" class="em" maxlength="2" /></label>
          <label>解锁天玑
            <input type="number" min="0" v-model.number="p.unlockJade" title="消耗天玑数解锁该宠" />
          </label>
          <label class="grow">简介<textarea v-model="p.desc" rows="1" placeholder="一句话介绍"></textarea></label>
        </div>
      </div>
      <p class="warn" v-if="dupPetElements.size">⚠ 五行（element）重复，前台 petMap 会互相覆盖，请保证 5 个各不相同。</p>
    </section>

    <!-- ===================== 3. 旅行档位 ===================== -->
    <section class="blk">
      <div class="blk-head">
        <div class="ch-l">
          <b>③ 旅行档位</b>
          <span class="hint">目的地可增删改 · id 唯一 · 魔丸加速留空=不开放 · 文案池见每项内部</span>
        </div>
        <button class="add" @click="addTravel">＋ 新目的地</button>
      </div>

      <div class="tvl" v-for="(t, i) in cfg.travels" :key="i">
        <div class="tvl-top">
          <input class="id" v-model="t.id" :class="{ bad: dupTravelIds.has(t.id) }" placeholder="travel_id" title="唯一 id；重复会互相覆盖" />
          <input class="nm" v-model="t.name" placeholder="目的地名" />
          <label>五行
            <select v-model="t.element">
              <option v-for="el in ELEMENTS_CHAOS" :key="el" :value="el">{{ ELEMENT_LABEL[el] }}</option>
            </select>
          </label>
          <label>解锁次数<input type="number" min="0" v-model.number="t.unlockAt" title="累计旅行次数达此值才开放（0=初始即开放）" /></label>
          <button class="del" @click="removeTravel(i)">✕</button>
        </div>
        <p class="warn" v-if="dupTravelIds.has(t.id)">⚠ id「{{ t.id }}」重复，前台会互相覆盖，请改一个。</p>

        <div class="row">
          <label>时长(小时)<input type="number" step="0.25" min="0" v-model.number="t.hours" /></label>
          <label>携粮类型
            <select v-model="t.food">
              <option value="dry">干粮</option><option value="premium">精粮</option>
            </select>
          </label>
          <label>携粮数量<input type="number" min="1" v-model.number="t.foodQty" /></label>
          <label class="mh">加速后时长(小时)
            <input type="number" step="0.25" min="0" :value="t.magicHours ?? ''" @input="onMagicHours(t, $event)" placeholder="留空=不开放" />
          </label>
          <label>加速耗魔丸
            <input type="number" min="0" :value="t.magicCost ?? ''" @input="onMagicCost(t, $event)" placeholder="留空=不开放" />
          </label>
        </div>

        <div class="row rewards">
          <span>必得奖励：</span>
          <label>元宝<input type="number" min="0" v-model.number="t.rewards.gold" /></label>
          <label>灵珠<input type="number" min="0" v-model.number="t.rewards.pearl" /></label>
          <label>魔丸<input type="number" min="0" v-model.number="t.rewards.magic" /></label>
        </div>
        <div class="row drops">
          <span>掉落：</span>
          <label title="概率天玑（0~1）">概率天玑
            <input type="number" step="0.01" min="0" max="1" v-model.number="t.drops.jadeChance" />
          </label>
          <label title="必得天玑（仅携粮通道）">必得天玑
            <input type="number" min="0" v-model.number="t.drops.jadeGuarantee" />
          </label>
          <label title="概率掉落隐藏壁纸（0~1）">隐藏概率
            <input type="number" step="0.01" min="0" max="1" v-model.number="t.drops.hiddenChance" />
          </label>
          <label>隐藏池
            <select v-model="t.drops.hiddenPool">
              <option :value="undefined">—</option>
              <option value="spirit">灵品</option><option value="legend">仙品传说</option>
            </select>
          </label>
        </div>

        <!-- 文案池：旅途碎片 + 见闻 -->
        <div class="copy">
          <div class="copy-h">📜 文案池</div>
          <label class="ml">旅途碎片（25% / 50% / 75% 各一句）
            <div class="ms">
              <input v-for="k in 3" :key="k" v-model="t.milestones[k - 1]" :placeholder="`第 ${k} 段碎片`" />
            </div>
          </label>
          <div class="notes">
            <div class="notes-h">
              <span>见闻文案池（归来随机带回一句，可增删）</span>
              <button class="mini" @click="addNote(t)">＋ 加一句</button>
            </div>
            <div class="note" v-for="(n, ni) in t.notes" :key="ni">
              <input v-model="t.notes[ni]" :placeholder="`见闻 ${ni + 1}`" />
              <button class="delx" @click="removeNote(t, ni)">✕</button>
            </div>
            <p class="empty" v-if="!t.notes.length">暂无见闻，点「＋ 加一句」添加。</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ===================== 4. 食物价格 ===================== -->
    <section class="blk">
      <div class="blk-head">
        <b>④ 食物价格</b>
        <span class="hint">干粮/精粮的饱食增量与售价（售价币种可切元宝/灵珠）</span>
      </div>
      <div class="food" v-for="(f, i) in cfg.foods" :key="i">
        <label>类型
          <select v-model="f.type" :class="{ bad: dupFoodTypes.has(f.type) }">
            <option value="dry">干粮(dry)</option><option value="premium">精粮(premium)</option>
          </select>
        </label>
        <label>emoji<input v-model="f.emoji" class="em" maxlength="2" /></label>
        <label>名称<input v-model="f.name" /></label>
        <label>饱食+<input type="number" min="0" v-model.number="f.hungerGain" /></label>
        <label>币种
          <select v-model="f.priceType">
            <option value="gold">元宝</option><option value="pearl">灵珠</option>
          </select>
        </label>
        <label>价格<input type="number" min="0" v-model.number="f.price" /></label>
        <label class="grow">简介<textarea v-model="f.desc" rows="1"></textarea></label>
      </div>
      <p class="warn" v-if="dupFoodTypes.size">⚠ 食物 type 重复，前台喂食映射会互相覆盖，请保证 2 个各不相同。</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import ImageField from '../components/ImageField.vue';

const props = defineProps<{ data: any }>();
// 空值容错：父级数据未就绪时按空结构渲染，避免整页白屏
const cfg = computed<any>(() => props.data ?? {});

const ELEMENTS = ['gold', 'wood', 'water', 'fire', 'earth'] as const;
const ELEMENTS_CHAOS = ['gold', 'wood', 'water', 'fire', 'earth', 'chaos'] as const;
const ELEMENT_LABEL: Record<string, string> = { gold: '金', wood: '木', water: '水', fire: '火', earth: '土', chaos: '混沌' };

const PARAM_DEFS = [
  { key: 'hungerDecayPerMin', label: '饱食衰减/分钟', def: 1, step: 0.1, hint: '100 点约 100 分钟饿空' },
  { key: 'hungerHappinessFactor', label: '心情衰减系数', def: 0.7, step: 0.05, hint: '心情随饱食同步衰减的倍率' },
  { key: 'hungerTravelMin', label: '出发最低饱食', def: 20, step: 1, hint: '低于此值禁止出发，先喂再走' },
  { key: 'speedUpDailyLimit', label: '每日加速上限', def: 2, step: 1, hint: '魔丸时空加速每日次数上限' },
  { key: 'strokeCoolMs', label: '抚摸冷却(毫秒)', def: 180000, step: 1000, hint: '180000 = 3 分钟' },
  { key: 'strokeGainSmall', label: '抚摸+心情(轻)', def: 3, step: 1, hint: '普通抚摸心情增量' },
  { key: 'strokeGainBig', label: '抚摸+心情(长按)', def: 12, step: 1, hint: '长按抚摸心情增量' },
  { key: 'strokeMoodBig', label: '抚摸改主人心情', def: 2, step: 1, hint: '长按抚摸给主人心情增量' },
  { key: 'multElement', label: '五行匹配加成', def: 1.15, step: 0.05, hint: '目的地五行与宠匹配时奖励倍率' },
  { key: 'multFirstDaily', label: '每日首旅双倍', def: 1.5, step: 0.05, hint: '当天首次旅行奖励倍率' },
  { key: 'multLively', label: '灵动状态倍率', def: 1.1, step: 0.05, hint: '饱食+心情 > 阈值时的加成' },
  { key: 'dailyRewardGold', label: '每日奖励(元宝)', def: 30, step: 1, hint: '每日登录/照料奖励' },
  { key: 'livelyThreshold', label: '灵动阈值', def: 80, step: 1, hint: '饱食+心情 超过此值进入灵动' },
] as const;

/** 自愈：补默认参数/对象/数组，防止编辑器中 v-model 到 undefined 抛错白屏 */
watch(
  cfg,
  (c: any) => {
    if (!c || typeof c !== 'object') return;
    if (!c.params || typeof c.params !== 'object') c.params = {};
    PARAM_DEFS.forEach((p) => { if (typeof c.params[p.key] !== 'number') c.params[p.key] = p.def; });
    if (!Array.isArray(c.pets)) c.pets = [];
    c.pets.forEach((p: any) => {
      if (!p || typeof p !== 'object') return;
      p.element = p.element || 'wood'; p.name = p.name || ''; p.emoji = p.emoji || '🐾';
      p.image = p.image || ''; p.elementLabel = p.elementLabel || ''; p.nickname = p.nickname || '';
      p.desc = p.desc || '';
      p.unlockJade = typeof p.unlockJade === 'number' ? p.unlockJade : 2;
    });
    if (!Array.isArray(c.foods)) c.foods = [];
    c.foods.forEach((f: any) => {
      if (!f || typeof f !== 'object') return;
      f.type = f.type || 'dry'; f.emoji = f.emoji || '🥮'; f.name = f.name || '';
      f.desc = f.desc || ''; f.hungerGain = typeof f.hungerGain === 'number' ? f.hungerGain : 20;
      f.priceType = f.priceType || 'gold'; f.price = typeof f.price === 'number' ? f.price : 5;
    });
    if (!Array.isArray(c.travels)) c.travels = [];
    c.travels.forEach((t: any) => {
      if (!t || typeof t !== 'object') return;
      t.id = t.id || 'new'; t.name = t.name || ''; t.element = t.element || 'wood';
      t.hours = typeof t.hours === 'number' ? t.hours : 1;
      t.food = t.food || 'dry'; t.foodQty = typeof t.foodQty === 'number' ? t.foodQty : 1;
      t.rewards = t.rewards || { gold: 0, pearl: 0, magic: 0 };
      t.drops = t.drops || {};
      t.unlockAt = typeof t.unlockAt === 'number' ? t.unlockAt : 0;
      if (!Array.isArray(t.milestones)) t.milestones = ['', '', ''];
      while (t.milestones.length < 3) t.milestones.push('');
      t.milestones.length = 3;
      if (!Array.isArray(t.notes)) t.notes = [];
    });
  },
  { immediate: true, deep: false },
);

/** 重复 id 实时标红（铁律13⑧ 校验防呆） */
const dupTravelIds = computed(() => {
  const seen = new Map<string, number>();
  (cfg.value.travels || []).forEach((t: any) => { if (t.id) seen.set(t.id, (seen.get(t.id) || 0) + 1); });
  return new Set([...seen.entries()].filter(([, n]) => n > 1).map(([id]) => id));
});
const dupPetElements = computed(() => {
  const seen = new Map<string, number>();
  (cfg.value.pets || []).forEach((p: any) => { if (p.element) seen.set(p.element, (seen.get(p.element) || 0) + 1); });
  return new Set([...seen.entries()].filter(([, n]) => n > 1).map(([id]) => id));
});
const dupFoodTypes = computed(() => {
  const seen = new Map<string, number>();
  (cfg.value.foods || []).forEach((f: any) => { if (f.type) seen.set(f.type, (seen.get(f.type) || 0) + 1); });
  return new Set([...seen.entries()].filter(([, n]) => n > 1).map(([id]) => id));
});

/* ---------- 旅行档位增删改 ---------- */
function addTravel() {
  cfg.value.travels.push({
    id: `new_${Date.now()}`, name: '新目的地', element: 'wood', hours: 1,
    food: 'dry', foodQty: 1, rewards: { gold: 0, pearl: 0, magic: 0 }, drops: {},
    unlockAt: 0, milestones: ['', '', ''], notes: [],
  });
}
function removeTravel(i: number) { cfg.value.travels.splice(i, 1); }
// magicHours / magicCost 为可选：填空则置 undefined（= 不开放加速）
function onMagicHours(t: any, e: Event) {
  const v = (e.target as HTMLInputElement).value.trim();
  t.magicHours = v === '' ? undefined : Number(v);
}
function onMagicCost(t: any, e: Event) {
  const v = (e.target as HTMLInputElement).value.trim();
  t.magicCost = v === '' ? undefined : Number(v);
}

/* ---------- 见闻文案池增删 ---------- */
function addNote(t: any) { t.notes = t.notes || []; t.notes.push(''); }
function removeNote(t: any, i: number) { t.notes.splice(i, 1); }
</script>

<style scoped>
.pet-ed { display: flex; flex-direction: column; gap: 18px; }
.blk { border: 1px solid #e6e9f2; border-radius: 14px; padding: 14px; background: #fff; display: flex; flex-direction: column; gap: 12px; }
.blk-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.blk-head b { font-size: 15px; color: #2c3140; }
.hint { font-size: 11px; color: #9aa1b3; }
.ch-l { display: flex; flex-direction: column; }
.add { border: 1px solid #6e8efb; background: #eef3ff; color: #4060d0; border-radius: 10px; padding: 8px 14px; font-size: 13px; cursor: pointer; }

.param-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
.param { display: flex; flex-direction: column; gap: 3px; font-size: 12px; color: #5a6072; border: 1px solid #eef1f8; border-radius: 10px; padding: 8px; }
.param .pk { font-weight: 600; color: #3a4150; }
.param input { border: 1px solid #dde2ee; border-radius: 8px; padding: 6px 8px; font-size: 13px; }
.param .ph { font-size: 10px; color: #aab; }

.pet-card { display: flex; gap: 14px; border: 1px solid #eef1f8; border-radius: 12px; padding: 12px; align-items: flex-start; }
.pet-fields { flex: 1; display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; align-items: end; }
.pet-fields label { font-size: 12px; color: #6b7180; display: flex; flex-direction: column; gap: 3px; }
.pet-fields label.grow { grid-column: 1 / -1; }
.pet-fields input, .pet-fields select, .pet-fields textarea { border: 1px solid #dde2ee; border-radius: 8px; padding: 6px 8px; font-size: 13px; box-sizing: border-box; }
.pet-fields .em { width: 56px; text-align: center; }

.warn { font-size: 12px; color: #e74c3c; margin: 0; }
.id.bad, select.bad { border-color: #e74c3c; background: #fff5f5; }

.tvl { border: 1px solid #eef1f8; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.tvl-top { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.tvl-top .id { width: 130px; }
.tvl-top .nm { flex: 1; min-width: 120px; }
.row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.row label { font-size: 12px; color: #6b7180; display: flex; align-items: center; gap: 4px; }
.row input, .row select { border: 1px solid #dde2ee; border-radius: 8px; padding: 6px 8px; font-size: 13px; box-sizing: border-box; }
.row .mh input { width: 110px; }
.rewards, .drops { background: #fafbff; padding: 8px; border-radius: 10px; }
.rewards input, .drops input { width: 72px; }
.del { border: 1px solid #f0d0d0; background: #fff0f0; color: #c0392b; border-radius: 8px; padding: 6px 10px; cursor: pointer; }

.copy { border-top: 1px dashed #e3e7f2; padding-top: 10px; display: flex; flex-direction: column; gap: 8px; }
.copy-h { font-size: 13px; color: #4060d0; font-weight: 600; }
.copy .ml { font-size: 12px; color: #6b7180; display: flex; flex-direction: column; gap: 4px; }
.ms { display: grid; grid-template-columns: 1fr; gap: 6px; }
.ms input { border: 1px solid #dde2ee; border-radius: 8px; padding: 6px 8px; font-size: 13px; }
.notes { display: flex; flex-direction: column; gap: 6px; }
.notes-h { display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: #6b7180; }
.note { display: flex; gap: 6px; align-items: center; }
.note input { flex: 1; border: 1px solid #dde2ee; border-radius: 8px; padding: 6px 8px; font-size: 13px; }
.delx { border: 1px solid #f0d0d0; background: #fff0f0; color: #c0392b; border-radius: 8px; padding: 4px 8px; cursor: pointer; font-size: 11px; }
.mini { border: 1px solid #dde2ee; border-radius: 8px; padding: 5px 10px; background: #fff; cursor: pointer; font-size: 12px; }
.empty { font-size: 12px; color: #9aa1b3; margin: 0; }

.food { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; align-items: end; border: 1px solid #eef1f8; border-radius: 12px; padding: 12px; }
.food label { font-size: 12px; color: #6b7180; display: flex; flex-direction: column; gap: 3px; }
.food label.grow { grid-column: 1 / -1; }
.food input, .food select, .food textarea { border: 1px solid #dde2ee; border-radius: 8px; padding: 6px 8px; font-size: 13px; box-sizing: border-box; }
.food .em { width: 56px; text-align: center; }
</style>
