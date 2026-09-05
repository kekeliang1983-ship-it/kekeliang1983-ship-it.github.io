<template>
  <div class="shrine-ed">
    <!-- ===================== ① 全局参数 ===================== -->
    <section class="blk">
      <div class="blk-head">
        <b>① 全局参数</b>
        <span class="hint">神龛系统所有可调旋钮，改一处全链路生效（与 App 运行态进度严格分离）</span>
      </div>
      <div class="param-grid">
        <label class="param" :class="{ warnp: cfg.params.buffCeil > 0.45 }">
          <span class="pk">神恩封顶红线</span>
          <input type="number" step="0.01" min="0" v-model.number="cfg.params.buffCeil" />
          <span class="ph" v-if="cfg.params.buffCeil > 0.45">⚠ 超过 0.45 红线 · 运行时仍按设值生效，但建议在红线内</span>
          <span class="ph" v-else>神恩总增益（香品×神位系数）上限 0.45</span>
        </label>
        <label class="param">
          <span class="pk">上香灵气消耗</span>
          <input type="number" min="0" v-model.number="cfg.params.incenseQiCost" />
          <span class="ph">每次上香扣灵气</span>
        </label>
        <label class="param">
          <span class="pk">求签灵气消耗</span>
          <input type="number" min="0" v-model.number="cfg.params.fortuneQiCost" />
          <span class="ph">每次求签扣灵气</span>
        </label>
        <label class="param">
          <span class="pk">头香奖励数量</span>
          <input type="number" min="0" v-model.number="cfg.params.firstIncenseReward" />
          <span class="ph">每日首炷香随机货币数量</span>
        </label>
        <label class="param">
          <span class="pk">上上签兑换元宝</span>
          <input type="number" min="0" v-model.number="cfg.params.couponValueGold" />
          <span class="ph">每张上上签可兑元宝</span>
        </label>
        <label class="param">
          <span class="pk">长按点燃(毫秒)</span>
          <input type="number" step="100" min="0" v-model.number="cfg.params.pressMs" />
          <span class="ph">3000 = 3 秒</span>
        </label>
        <label class="param">
          <span class="pk">心愿墙上限</span>
          <input type="number" min="1" v-model.number="cfg.params.maxWishes" />
          <span class="ph">心愿条数上限</span>
        </label>
        <label class="param">
          <span class="pk">头香随机池</span>
          <input class="ccy" :value="cfg.params.firstRewardCurrencies.join(',')" @input="onCurrencies" placeholder="gold,pearl,magic,jade" />
          <span class="ph">逗号分隔的货币集合</span>
        </label>
      </div>
    </section>

    <!-- ===================== ② 神位（含立绘） ===================== -->
    <section class="blk">
      <div class="blk-head">
        <div class="ch-l">
          <b>② 神位</b>
          <span class="hint">可增删改 · id 唯一 · 可上传立绘（留空回退 emoji）· 高级神位配解锁条件</span>
        </div>
        <button class="add" @click="addDeity">＋ 新神位</button>
      </div>

      <div class="deity" v-for="(d, i) in cfg.deities" :key="i">
        <ImageField
          :model-value="d.image"
          :label="`${d.name || d.id} · 立绘`"
          :upload-name="`shrine_deity_${d.id || 'new' + i}`"
          :max-dim="512"
          :quality="0.85"
          @update:model-value="(v: string) => (d.image = v)"
        />
        <div class="deity-fields">
          <label>id<input v-model="d.id" :class="{ bad: dupDeityIds.has(d.id) }" placeholder="唯一 id" /></label>
          <label>名称<input v-model="d.name" placeholder="如 财神" /></label>
          <label>emoji<input v-model="d.emoji" class="em" maxlength="2" /></label>
          <label class="grow">庇佑语<textarea v-model="d.blessing" rows="1" placeholder="如 庇佑元宝盈仓"></textarea></label>
          <label>神恩系数
            <input type="number" step="0.05" min="1" v-model.number="d.mult" title="高级神位乘在香品 buff 上（1=基础神）" />
          </label>
          <label class="grow">上香小馈赠
            <select :value="bonusKind(d)" @change="(e: any) => onBonusKind(d, e)">
              <option value="none">无</option>
              <option value="currency">货币馈赠</option>
              <option value="mood">心境馈赠</option>
            </select>
          </label>
          <template v-if="bonusKind(d) === 'currency'">
            <label>币种
              <select v-model="d.bonus.currency">
                <option value="gold">元宝</option><option value="pearl">灵珠</option><option value="magic">魔丸</option>
              </select>
            </label>
            <label>数量<input type="number" min="0" v-model.number="d.bonus.amount" /></label>
          </template>
          <template v-else-if="bonusKind(d) === 'mood'">
            <label>心境+<input type="number" min="0" v-model.number="d.bonus.mood" /></label>
          </template>
        </div>
        <div class="unlock">
          <label class="chk"><input type="checkbox" :checked="!!d.unlock" @change="(e: any) => onUnlockToggle(d, e)" /> 需解锁条件</label>
          <template v-if="d.unlock">
            <input class="ud" v-model="d.unlock.desc" placeholder="解锁说明（如 累计上香 10 次）" />
            <label>上香次数<input type="number" min="0" v-model.number="d.unlock.incenseCount" placeholder="选填" /></label>
            <label>满溢次数<input type="number" min="0" v-model.number="d.unlock.overflowCount" placeholder="选填" /></label>
            <label>天玑≥<input type="number" min="0" v-model.number="d.unlock.jade" placeholder="选填" /></label>
          </template>
        </div>
        <p class="warn" v-if="dupDeityIds.has(d.id)">⚠ id「{{ d.id }}」重复，前台会互相覆盖，请改一个。</p>
        <button class="del" @click="removeDeity(i)">✕ 删除此神位</button>
      </div>
    </section>

    <!-- ===================== ③ 香品档位（含立绘） ===================== -->
    <section class="blk">
      <div class="blk-head">
        <div class="ch-l">
          <b>③ 香品档位</b>
          <span class="hint">可增删改 · type 唯一 · 可上传立绘（留空回退 emoji）· 每档香可独立配「必得上上签」</span>
        </div>
        <button class="add" @click="addIncense">＋ 新香品</button>
      </div>

      <div class="inc" v-for="(c, i) in cfg.incenses" :key="i">
        <ImageField
          :model-value="c.image"
          :label="`${c.name || c.type} · 立绘`"
          :upload-name="`shrine_incense_${c.type || 'new' + i}`"
          :max-dim="512"
          :quality="0.85"
          @update:model-value="(v: string) => (c.image = v)"
        />
        <div class="inc-fields">
          <label>type<input v-model="c.type" :class="{ bad: dupIncenseTypes.has(c.type) }" placeholder="唯一 type" /></label>
          <label>名称<input v-model="c.name" placeholder="如 线香" /></label>
          <label>emoji<input v-model="c.emoji" class="em" maxlength="2" /></label>
          <label>币种
            <select v-model="c.cost.currency">
              <option value="gold">元宝</option><option value="pearl">灵珠</option><option value="magic">魔丸</option>
            </select>
          </label>
          <label>价格<input type="number" min="0" v-model.number="c.cost.amount" /></label>
          <label>持续(小时)<input type="number" step="0.5" min="0" v-model.number="c.durationHours" /></label>
          <label>神恩增益<input type="number" step="0.01" min="0" v-model.number="c.buff" title="小数，如 0.05 = +5%" /></label>
          <label>光晕色<input v-model="c.glow" placeholder="rgba(...)" /></label>
          <label class="grow">文案<textarea v-model="c.desc" rows="1" placeholder="如 神恩 1 小时 · 收益 +5%"></textarea></label>
          <label class="grow">特殊说明<textarea v-model="c.special" rows="1" placeholder="留空无"></textarea></label>
          <label>返还概率<input type="number" step="0.01" min="0" max="1" v-model.number="c.refundRate" title="0~1" /></label>
          <label class="chk2"><input type="checkbox" v-model="c.guaranteeTop" /> 必得上上签</label>
        </div>
        <p class="warn" v-if="dupIncenseTypes.has(c.type)">⚠ type「{{ c.type }}」重复，前台会互相覆盖，请改一个。</p>
        <button class="del" @click="removeIncense(i)">✕ 删除此香品</button>
      </div>
    </section>

    <!-- ===================== ④ 签文库 ===================== -->
    <section class="blk">
      <div class="blk-head">
        <div class="ch-l">
          <b>④ 签文库</b>
          <span class="hint">求签随机池，可增删改 · 含 rank=上上签 的签入券包</span>
        </div>
        <button class="add" @click="addFortune">＋ 加一签</button>
      </div>
      <div class="fort" v-for="(f, i) in cfg.fortunes" :key="i">
        <input class="rank" v-model="f.rank" placeholder="签等（如 上上签）" />
        <input class="emoji" v-model="f.emoji" maxlength="2" placeholder="🪙" />
        <input class="text" v-model="f.text" placeholder="签文" />
        <button class="delx" @click="removeFortune(i)">✕</button>
      </div>
      <p class="empty" v-if="!cfg.fortunes.length">暂无签文，点「＋ 加一签」添加。</p>
    </section>

    <!-- ===================== ⑤ 今日宜忌 ===================== -->
    <section class="blk">
      <div class="blk-head">
        <b>⑤ 今日宜忌</b>
        <span class="hint">宜/忌文案池（按日稳定随机）+ 宜→推荐神位映射</span>
      </div>
      <div class="alm">
        <div class="alm-col">
          <div class="alm-h">宜（可增删）<button class="mini" @click="cfg.almanac.yi.push('')">＋</button></div>
          <div class="alm-row" v-for="(y, i) in cfg.almanac.yi" :key="i">
            <input v-model="cfg.almanac.yi[i]" placeholder="如 宜聆听天籁" />
            <select v-model="cfg.almanac.yiDeity[y]" title="该宜推荐的神的 id">
              <option :value="undefined">— 无推荐 —</option>
              <option v-for="d in cfg.deities" :key="d.id" :value="d.id">{{ d.name }}</option>
            </select>
            <button class="delx" @click="removeYi(i)">✕</button>
          </div>
          <p class="warn" v-if="dupYi.size">⚠ 宜文案重复，请保证各不相同。</p>
        </div>
        <div class="alm-col">
          <div class="alm-h">忌（可增删）<button class="mini" @click="cfg.almanac.ji.push('')">＋</button></div>
          <div class="alm-row" v-for="(j, i) in cfg.almanac.ji" :key="i">
            <input v-model="cfg.almanac.ji[i]" placeholder="如 忌久坐不动" />
            <button class="delx" @click="removeJi(i)">✕</button>
          </div>
        </div>
      </div>
    </section>

    <!-- ===================== ⑥ 即时预览 ===================== -->
    <section class="blk preview">
      <div class="blk-head">
        <b>⑥ 即时预览</b>
        <span class="hint">保存前核对：封顶红线、神位/香品数量、解锁条件</span>
      </div>
      <div class="pv">
        <div class="pv-item">
          <b>神恩封顶</b><span :class="{ red: cfg.params.buffCeil > 0.45 }">+{{ Math.round(cfg.params.buffCeil * 100) }}%（红线 45%）</span>
        </div>
        <div class="pv-item"><b>神位</b><span>{{ cfg.deities.length }} 位 · 已解锁门槛 {{ cfg.deities.filter((d: any) => d.unlock).length }} 个</span></div>
        <div class="pv-item"><b>香品</b><span>{{ cfg.incenses.length }} 档</span></div>
        <div class="pv-item"><b>签文</b><span>{{ cfg.fortunes.length }} 条（上上签 {{ cfg.fortunes.filter((f: any) => f.rank === '上上签').length }}）</span></div>
        <div class="pv-item"><b>宜/忌</b><span>{{ cfg.almanac.yi.length }} / {{ cfg.almanac.ji.length }}</span></div>
        <div class="pv-item"><b>必得上上签的香</b><span>{{ cfg.incenses.filter((c: any) => c.guaranteeTop).map((c: any) => c.name).join('、') || '无' }}</span></div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import ImageField from '../components/ImageField.vue';

const props = defineProps<{ data: any }>();
// 空值容错：父级数据未就绪时按空结构渲染，避免整页白屏
const cfg = computed<any>(() => props.data ?? {});

/** 自愈：补默认参数/对象/数组，防止编辑器中 v-model 到 undefined 抛错白屏 */
watch(
  cfg,
  (c: any) => {
    if (!c || typeof c !== 'object') return;
    if (!c.params || typeof c.params !== 'object') c.params = {};
    const P = c.params;
    if (typeof P.buffCeil !== 'number') P.buffCeil = 0.45;
    if (typeof P.incenseQiCost !== 'number') P.incenseQiCost = 10;
    if (typeof P.fortuneQiCost !== 'number') P.fortuneQiCost = 10;
    if (typeof P.firstIncenseReward !== 'number') P.firstIncenseReward = 5;
    if (typeof P.couponValueGold !== 'number') P.couponValueGold = 20;
    if (typeof P.pressMs !== 'number') P.pressMs = 3000;
    if (typeof P.maxWishes !== 'number') P.maxWishes = 20;
    if (!Array.isArray(P.firstRewardCurrencies)) P.firstRewardCurrencies = ['gold', 'pearl', 'magic', 'jade'];

    if (!Array.isArray(c.deities)) c.deities = [];
    c.deities.forEach((d: any) => {
      if (!d || typeof d !== 'object') return;
      d.id = d.id || 'new'; d.name = d.name || ''; d.emoji = d.emoji || '🧧';
      d.image = d.image || ''; d.blessing = d.blessing || '';
      d.mult = typeof d.mult === 'number' ? d.mult : 1;
      if (d.bonus && typeof d.bonus === 'object') {
        if ('mood' in d.bonus) d.bonus.mood = typeof d.bonus.mood === 'number' ? d.bonus.mood : 2;
        else { d.bonus.currency = d.bonus.currency || 'gold'; d.bonus.amount = typeof d.bonus.amount === 'number' ? d.bonus.amount : 1; }
      }
      if (d.unlock === undefined) d.unlock = null;
      if (d.unlock && typeof d.unlock === 'object') {
        d.unlock.desc = d.unlock.desc || '';
        d.unlock.incenseCount = typeof d.unlock.incenseCount === 'number' ? d.unlock.incenseCount : undefined;
        d.unlock.overflowCount = typeof d.unlock.overflowCount === 'number' ? d.unlock.overflowCount : undefined;
        d.unlock.jade = typeof d.unlock.jade === 'number' ? d.unlock.jade : undefined;
      }
    });

    if (!Array.isArray(c.incenses)) c.incenses = [];
    c.incenses.forEach((x: any) => {
      if (!x || typeof x !== 'object') return;
      x.type = x.type || 'new'; x.name = x.name || ''; x.emoji = x.emoji || '🕯️';
      x.image = x.image || '';
      x.cost = x.cost && typeof x.cost === 'object' ? x.cost : { currency: 'gold', amount: 0 };
      x.cost.currency = x.cost.currency || 'gold';
      x.cost.amount = typeof x.cost.amount === 'number' ? x.cost.amount : 0;
      x.durationHours = typeof x.durationHours === 'number' ? x.durationHours : 1;
      x.buff = typeof x.buff === 'number' ? x.buff : 0.05;
      x.desc = x.desc || ''; x.special = x.special || '';
      x.refundRate = typeof x.refundRate === 'number' ? x.refundRate : 0;
      x.guaranteeTop = typeof x.guaranteeTop === 'boolean' ? x.guaranteeTop : false;
      x.glow = x.glow || 'rgba(200,200,255,.4)';
    });

    if (!Array.isArray(c.fortunes)) c.fortunes = [];
    c.fortunes.forEach((f: any) => {
      if (!f || typeof f !== 'object') return;
      f.rank = f.rank || ''; f.text = f.text || ''; f.emoji = f.emoji || '🪙';
    });

    if (!c.almanac || typeof c.almanac !== 'object') c.almanac = { yi: [], ji: [], yiDeity: {} };
    if (!Array.isArray(c.almanac.yi)) c.almanac.yi = [];
    if (!Array.isArray(c.almanac.ji)) c.almanac.ji = [];
    if (!c.almanac.yiDeity || typeof c.almanac.yiDeity !== 'object') c.almanac.yiDeity = {};
  },
  { immediate: true, deep: false },
);

/** 重复 id 实时标红（铁律13⑧ 校验防呆） */
const dupDeityIds = computed(() => {
  const seen = new Map<string, number>();
  (cfg.value.deities || []).forEach((d: any) => { if (d.id) seen.set(d.id, (seen.get(d.id) || 0) + 1); });
  return new Set([...seen.entries()].filter(([, n]) => n > 1).map(([id]) => id));
});
const dupIncenseTypes = computed(() => {
  const seen = new Map<string, number>();
  (cfg.value.incenses || []).forEach((c: any) => { if (c.type) seen.set(c.type, (seen.get(c.type) || 0) + 1); });
  return new Set([...seen.entries()].filter(([, n]) => n > 1).map(([id]) => id));
});
const dupYi = computed(() => {
  const seen = new Map<string, number>();
  (cfg.value.almanac?.yi || []).forEach((y: string) => { if (y) seen.set(y, (seen.get(y) || 0) + 1); });
  return new Set([...seen.entries()].filter(([, n]) => n > 1).map(([id]) => id));
});

/* ---------- 神位增删改 ---------- */
function bonusKind(d: any): string {
  if (!d.bonus) return 'none';
  return 'mood' in d.bonus ? 'mood' : 'currency';
}
function onBonusKind(d: any, e: Event) {
  const v = (e.target as HTMLSelectElement).value;
  if (v === 'none') d.bonus = null;
  else if (v === 'currency') d.bonus = { currency: 'gold', amount: 1 };
  else d.bonus = { mood: 2 };
}
function onUnlockToggle(d: any, e: Event) {
  const on = (e.target as HTMLInputElement).checked;
  d.unlock = on ? (d.unlock && typeof d.unlock === 'object' ? d.unlock : { desc: '' }) : null;
}
function addDeity() {
  cfg.value.deities.push({ id: `new_${Date.now()}`, name: '新神位', emoji: '🧧', image: '', blessing: '', mult: 1, bonus: null, unlock: null });
}
function removeDeity(i: number) { cfg.value.deities.splice(i, 1); }

/* ---------- 香品增删改 ---------- */
function addIncense() {
  cfg.value.incenses.push({ type: `new_${Date.now()}`, name: '新香品', emoji: '🕯️', image: '', cost: { currency: 'gold', amount: 5 }, durationHours: 1, buff: 0.05, desc: '', special: '', refundRate: 0, guaranteeTop: false, glow: 'rgba(200,200,255,.4)' });
}
function removeIncense(i: number) { cfg.value.incenses.splice(i, 1); }

/* ---------- 签文库增删改 ---------- */
function addFortune() { cfg.value.fortunes.push({ rank: '中签', text: '', emoji: '🍃' }); }
function removeFortune(i: number) { cfg.value.fortunes.splice(i, 1); }

/* ---------- 宜忌增删 ---------- */
function removeYi(i: number) {
  const y = cfg.value.almanac.yi[i];
  if (y) delete cfg.value.almanac.yiDeity[y];
  cfg.value.almanac.yi.splice(i, 1);
}
function removeJi(i: number) { cfg.value.almanac.ji.splice(i, 1); }

/* ---------- 头香随机池（逗号分隔 → 数组） ---------- */
function onCurrencies(e: Event) {
  const v = (e.target as HTMLInputElement).value;
  cfg.value.params.firstRewardCurrencies = v.split(',').map((s: string) => s.trim()).filter(Boolean);
}
</script>

<style scoped>
.shrine-ed { display: flex; flex-direction: column; gap: 18px; }
.blk { border: 1px solid #e6e9f2; border-radius: 14px; padding: 14px; background: #fff; display: flex; flex-direction: column; gap: 12px; }
.blk-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.blk-head b { font-size: 15px; color: #2c3140; }
.hint { font-size: 11px; color: #9aa1b3; }
.ch-l { display: flex; flex-direction: column; }
.add { border: 1px solid #6e8efb; background: #eef3ff; color: #4060d0; border-radius: 10px; padding: 8px 14px; font-size: 13px; cursor: pointer; }

.param-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
.param { display: flex; flex-direction: column; gap: 3px; font-size: 12px; color: #5a6072; border: 1px solid #eef1f8; border-radius: 10px; padding: 8px; }
.param .pk { font-weight: 600; color: #3a4150; }
.param input { border: 1px solid #dde2ee; border-radius: 8px; padding: 6px 8px; font-size: 13px; box-sizing: border-box; }
.param .ccy { width: 100%; }
.param .ph { font-size: 10px; color: #aab; }
.param.warnp { border-color: #f0c27a; background: #fff8ec; }
.param.warnp .ph { color: #c98a2a; }

/* 神位卡 */
.deity { display: flex; gap: 14px; border: 1px solid #eef1f8; border-radius: 12px; padding: 12px; align-items: flex-start; flex-wrap: wrap; }
.deity-fields { flex: 1; display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; align-items: end; min-width: 240px; }
.deity-fields label { font-size: 12px; color: #6b7180; display: flex; flex-direction: column; gap: 3px; }
.deity-fields label.grow { grid-column: 1 / -1; }
.deity-fields input, .deity-fields select, .deity-fields textarea { border: 1px solid #dde2ee; border-radius: 8px; padding: 6px 8px; font-size: 13px; box-sizing: border-box; }
.deity-fields .em { width: 56px; text-align: center; }
.unlock { flex-basis: 100%; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; border-top: 1px dashed #e3e7f2; padding-top: 10px; }
.unlock .chk { font-size: 12px; color: #6b7180; display: flex; align-items: center; gap: 5px; }
.unlock .ud { flex: 1; min-width: 180px; border: 1px solid #dde2ee; border-radius: 8px; padding: 6px 8px; font-size: 13px; }
.unlock label { font-size: 12px; color: #6b7180; display: flex; flex-direction: column; gap: 3px; }
.unlock input { border: 1px solid #dde2ee; border-radius: 8px; padding: 6px 8px; font-size: 13px; width: 90px; }

/* 香品卡 */
.inc { display: flex; gap: 14px; border: 1px solid #eef1f8; border-radius: 12px; padding: 12px; align-items: flex-start; flex-wrap: wrap; }
.inc-fields { flex: 1; display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; align-items: end; min-width: 240px; }
.inc-fields label { font-size: 12px; color: #6b7180; display: flex; flex-direction: column; gap: 3px; }
.inc-fields label.grow { grid-column: 1 / -1; }
.inc-fields input, .inc-fields select, .inc-fields textarea { border: 1px solid #dde2ee; border-radius: 8px; padding: 6px 8px; font-size: 13px; box-sizing: border-box; }
.inc-fields .em { width: 56px; text-align: center; }
.inc-fields .chk2 { flex-direction: row; align-items: center; gap: 5px; }

.warn { font-size: 12px; color: #e74c3c; margin: 0; flex-basis: 100%; }
.id.bad, .type.bad, select.bad { border-color: #e74c3c; background: #fff5f5; }
.del { border: 1px solid #f0d0d0; background: #fff0f0; color: #c0392b; border-radius: 8px; padding: 6px 12px; cursor: pointer; align-self: flex-end; }

/* 签文库 */
.fort { display: flex; gap: 8px; align-items: center; }
.fort .rank { width: 110px; border: 1px solid #dde2ee; border-radius: 8px; padding: 6px 8px; font-size: 13px; }
.fort .emoji { width: 56px; text-align: center; border: 1px solid #dde2ee; border-radius: 8px; padding: 6px 8px; font-size: 13px; }
.fort .text { flex: 1; border: 1px solid #dde2ee; border-radius: 8px; padding: 6px 8px; font-size: 13px; }
.delx { border: 1px solid #f0d0d0; background: #fff0f0; color: #c0392b; border-radius: 8px; padding: 4px 8px; cursor: pointer; font-size: 11px; }
.empty { font-size: 12px; color: #9aa1b3; margin: 0; }

/* 今日宜忌 */
.alm { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.alm-col { display: flex; flex-direction: column; gap: 8px; }
.alm-h { font-size: 13px; color: #4060d0; font-weight: 600; display: flex; align-items: center; gap: 8px; }
.alm-row { display: flex; gap: 6px; align-items: center; }
.alm-row input { flex: 1; border: 1px solid #dde2ee; border-radius: 8px; padding: 6px 8px; font-size: 13px; }
.alm-row select { border: 1px solid #dde2ee; border-radius: 8px; padding: 6px 8px; font-size: 12px; max-width: 120px; }
.mini { border: 1px solid #dde2ee; border-radius: 8px; padding: 4px 10px; background: #fff; cursor: pointer; font-size: 12px; }

/* 即时预览 */
.preview .pv { display: flex; flex-direction: column; gap: 8px; }
.pv-item { display: flex; gap: 10px; align-items: baseline; font-size: 13px; border-bottom: 1px dashed #eef1f8; padding-bottom: 6px; }
.pv-item b { width: 130px; color: #6b7180; font-weight: 600; flex: none; }
.pv-item span.red { color: #e67e22; font-weight: 600; }
</style>
