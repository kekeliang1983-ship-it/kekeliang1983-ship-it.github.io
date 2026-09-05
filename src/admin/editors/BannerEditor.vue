<template>
  <div class="banner-ed">
    <!-- 左：slide 列表 -->
    <div class="side">
      <div class="side-h">
        <span>轮播帧（{{ slides.length }}）</span>
        <button class="add" @click="addSlide">＋ 新增</button>
      </div>
      <ul class="slide-list">
        <li
          v-for="(s, i) in slides"
          :key="s.id"
          :class="{ on: i === activeIdx }"
          @click="activeIdx = i"
        >
          <span class="thumb">
            <img v-if="s.bgImage" :src="s.bgImage" alt="" />
            <video v-else-if="s.bgType === 'video' && s.bgVideo" :src="s.bgVideo"></video>
            <span v-else class="thumb-emoji">{{ s.bgEmoji || '🖼️' }}</span>
          </span>
          <span class="meta">
            <b>{{ (s.titleLines && s.titleLines[0] && s.titleLines[0].text) || '无标题' }}</b>
            <i>{{ s.bgType === 'video' ? '视频' : '图片' }}{{ s.particles?.enabled ? ' · 粒子' : '' }}</i>
          </span>
          <button class="del" v-if="slides.length > 1" @click.stop="removeSlide(i)">✕</button>
        </li>
      </ul>
    </div>

    <!-- 右：编辑 + 实时预览 -->
    <div class="main">
      <!-- 实时预览 -->
      <div class="preview" :style="previewBg">
        <HeroVideo
          v-if="slide && slide.bgType === 'video' && slide.bgVideo"
          :src="slide.bgVideo" :poster="slide.videoPoster"
          :playing="true" :crossfade="banner.videoCrossfade !== false"
          :ignore-reduced-motion="true"
        />
        <BannerParticles
          v-if="slide && slide.particles && slide.particles.enabled"
          :particles="slide.particles"
          :ignore-reduced-motion="true"
        />
        <div class="ov"></div>
        <div class="ct">
          <h2 :style="{ display: 'flex', flexDirection: 'column', gap: ((slide.lineGap ?? 8)) + 'px' }">
            <div
              v-for="(ln, i) in (slide?.titleLines || [])"
              :key="i"
              :style="{ color: ln.color, fontSize: ln.size ? ln.size + 'px' : 'inherit', fontWeight: ln.bold ? '700' : 'inherit', textAlign: ln.align || 'left', textShadow: ln.shadow ? '0 2px 10px rgba(0,0,0,' + (typeof ln.shadowOpacity === 'number' ? ln.shadowOpacity : 0.45) + ')' : 'inherit' }"
            >{{ ln.text }}</div>
          </h2>
          <p
            v-if="slide?.subtitle"
            class="ct-sub"
            :style="{ color: slide.subtitleColor, fontSize: slide.subtitleSize ? slide.subtitleSize + 'px' : 'inherit', fontWeight: slide.subtitleBold ? '700' : 'inherit' }"
          >{{ slide.subtitle }}</p>
          <span class="cta" :style="previewBtnStyle">{{ slide?.buttonText || '按钮' }}</span>
        </div>
      </div>

      <div class="form" v-if="slide">
        <!-- 轮播全局 -->
        <div class="grp">
          <div class="grp-h">轮播设置</div>
          <label class="ck"><input type="checkbox" v-model="banner.autoplay" /> 自动播放</label>
          <div class="row">
            <label>间隔(秒)</label>
            <input type="number" min="1.5" step="0.5" :value="(banner.interval || 5000) / 1000"
                   @input="banner.interval = Math.round(Number(($event.target as HTMLInputElement).value) * 1000)" />
          </div>
          <div class="row">
            <label>切换动画</label>
            <select v-model="banner.transition">
              <option value="fade">淡入淡出</option>
              <option value="slide">横滑</option>
            </select>
          </div>
          <label class="ck"><input type="checkbox" v-model="banner.showDots" /> 显示指示点</label>
          <label class="ck"><input type="checkbox" v-model="banner.videoCrossfade" /> 视频循环交叉淡入(丝滑·双解码)</label>
          <p class="tip">开启后视频循环用「双视频交叉淡入」盖掉接缝（最丝滑，但多一路解码，低端机可关）；关闭则单视频硬循环更省电。系统开启「减少动态」时无论此项都退化为静态海报。</p>
        </div>

        <!-- 当前帧媒体 -->
        <div class="grp">
          <div class="grp-h">第 {{ activeIdx + 1 }} 帧 · 媒体</div>
          <div class="seg">
            <button :class="{ on: slide.bgType === 'image' }" @click="slide.bgType = 'image'">图片</button>
            <button :class="{ on: slide.bgType === 'video' }" @click="slide.bgType = 'video'">视频</button>
          </div>
          <div v-if="slide.bgType === 'image'">
            <ImageField v-model="slide.bgImage" label="背景图" :upload-name="'banner-' + slide.id" :max-dim="1600" />
          </div>
          <div v-else>
            <VideoField v-model="slide.bgVideo" label="视频(外链优先，本地≤8MB)" :upload-name="'banner-video-' + slide.id" />
            <div class="row"><label>视频封面(可选)</label><input v-model="slide.videoPoster" placeholder="https://.../poster.jpg" /></div>
            <p class="tip">⚠ 视频前端无法压缩，强烈建议填外链 CDN（不进包体）；本地上传限 ≤8MB、≤15s。</p>
            <p class="tip">💡 循环最丝滑：导出时让视频「最后一帧运动状态紧接第一帧」（无缝母版），再叠加页面交叉淡入，接缝几乎无感。</p>
          </div>
          <div class="row"><label>Emoji 兜底（无图/视频时显示）</label><input v-model="slide.bgEmoji" maxlength="4" /></div>
          <div class="row"><label>点击跳转</label><input v-model="slide.link" placeholder="/app/gallery" /></div>
        </div>

        <!-- 文案 -->
        <div class="grp">
          <div class="grp-h">文案</div>
          <div class="lines">
            <div class="line-edit" v-for="(ln, i) in slide.titleLines" :key="i">
              <div class="le-top">
                <input class="le-text" v-model="ln.text" placeholder="标题文字（可空行占位）" />
                <button class="le-del" type="button" @click="removeLine(i)" title="删除此行">✕</button>
              </div>
              <div class="le-ctrl">
                <label class="le-c">色<input type="color" v-model="ln.color" /></label>
                <label class="le-c">字号<input type="number" min="12" max="80" v-model.number="ln.size" /></label>
                <label class="le-c"><input type="checkbox" v-model="ln.bold" />粗</label>
                <label class="le-c">对齐
                  <select v-model="ln.align">
                    <option value="center">中</option>
                    <option value="left">左</option>
                    <option value="right">右</option>
                  </select>
                </label>
                <label class="le-c"><input type="checkbox" v-model="ln.shadow" />阴影</label>
                <label class="le-c" v-if="ln.shadow">阴影浓度
                  <input type="range" min="0" max="1" step="0.05" v-model.number="ln.shadowOpacity" />
                </label>
              </div>
            </div>
            <button class="add-line" type="button" @click="addLine">+ 添加一行</button>
          </div>
          <div class="row">
            <label>标题行间距 {{ (slide.lineGap ?? 8) }}px（行与行之间的间距）</label>
            <input type="range" min="0" max="40" step="1" v-model.number="slide.lineGap" />
          </div>
          <div class="row col">
            <label>副标题 / 描述（可选）</label>
            <textarea rows="2" v-model="slide.subtitle" placeholder="一段描述文案，可留空"></textarea>
            <div class="le-ctrl">
              <label class="le-c">色<input type="color" v-model="slide.subtitleColor" /></label>
              <label class="le-c">字号<input type="number" min="12" max="40" v-model.number="slide.subtitleSize" /></label>
              <label class="le-c"><input type="checkbox" v-model="slide.subtitleBold" />粗</label>
            </div>
          </div>
          <div class="row"><label>按钮文案</label><input v-model="slide.buttonText" /></div>
          <div class="row2">
            <label class="le-c">按钮底色<input type="color" v-model="slide.buttonBg" /></label>
            <label class="le-c">按钮字色<input type="color" v-model="slide.buttonColor" /></label>
          </div>
          <div class="row">
            <label>按钮缩放 {{ (slide.buttonScale || 1).toFixed(2) }}×（0.7~1.6）</label>
            <input type="range" min="0.7" max="1.6" step="0.05" v-model.number="slide.buttonScale" />
          </div>
          <p class="tip">按钮底色/字色留空则用默认（白底深字）；缩放幅度仅调大小，不影响文字颜色。</p>
        </div>

        <!-- 粒子 -->
        <div class="grp">
          <div class="grp-h">
            粒子效果
            <label class="ck inline"><input type="checkbox" v-model="pOn" /> 启用</label>
          </div>
          <template v-if="slide.particles && slide.particles.enabled">
            <p class="pstatus" :class="{ bad: effectiveCount === 0 }">
              <template v-if="effectiveCount > 0">✅ 预览中生效 {{ effectiveCount }} 个粒子（后台预览已强制忽略系统「减少动态」）</template>
              <template v-else>⚠ 当前无粒子：数量被上限 {{ slide.particles.maxCount }} 卡到 0，请调大「数量」或「上限」</template>
            </p>
            <div class="row">
              <label>形状</label>
              <select v-model="slide.particles.type">
                <option value="petal">花瓣</option>
                <option value="dot">圆点</option>
                <option value="star">星</option>
                <option value="snow">雪</option>
              </select>
            </div>
            <div class="presets">
              <span>性能预设：</span>
              <button @click="applyPreset('smooth')">流畅(40)</button>
              <button @click="applyPreset('balance')">均衡(80)</button>
              <button @click="applyPreset('lux')">华丽(150)</button>
            </div>
            <div class="row">
              <label>数量 {{ slide.particles.count }} / 上限 {{ slide.particles.maxCount }}</label>
              <div class="slider">
                <input type="range" min="0" :max="slide.particles.maxCount" v-model.number="slide.particles.count" />
                <input type="range" min="20" max="300" v-model.number="slide.particles.maxCount" title="硬上限：拖到顶即锁死，防卡顿" />
              </div>
            </div>
            <div class="row2">
              <label>主色<input type="color" v-model="slide.particles.color" /></label>
              <label>副色<input type="color" v-model="slide.particles.color2" /></label>
            </div>
            <div class="row2">
              <label>大小 {{ slide.particles.sizeMin }}~{{ slide.particles.sizeMax }}px
                <input type="range" min="2" max="40" v-model.number="slide.particles.sizeMin" /></label>
              <input type="range" min="2" max="40" v-model.number="slide.particles.sizeMax" />
            </div>
            <div class="row">
              <label>速度 {{ slide.particles.speed }}</label>
              <input type="range" min="0.2" max="3" step="0.1" v-model.number="slide.particles.speed" />
            </div>
            <div class="row">
              <label>方向</label>
              <select v-model="slide.particles.direction">
                <option value="down">下落</option>
                <option value="up">上升</option>
                <option value="left">向左</option>
                <option value="right">向右</option>
                <option value="random">随机</option>
              </select>
            </div>
            <div class="row">
              <label>透明度 {{ slide.particles.opacity }}</label>
              <input type="range" min="0.1" max="1" step="0.05" v-model.number="slide.particles.opacity" />
            </div>
            <div class="row2">
              <label class="ck"><input type="checkbox" v-model="slide.particles.rotate" /> 旋转</label>
              <label class="ck"><input type="checkbox" v-model="slide.particles.followMouse" /> 跟随鼠标</label>
            </div>
            <div class="grp-sub">辉光（发光描边）</div>
            <label class="ck"><input type="checkbox" v-model="slide.particles.glow" /> 启用辉光</label>
            <div class="row2">
              <label>强度 {{ slide.particles.glowStrength || 0 }}
                <input type="range" min="0" max="30" step="1" v-model.number="slide.particles.glowStrength" :disabled="!slide.particles.glow" />
              </label>
              <label class="le-c">辉光色<input type="color" v-model="slide.particles.glowColor" :disabled="!slide.particles.glow" /></label>
            </div>
            <p class="tip">辉光用 Canvas 光晕实现；弱机（内存≤4GB/核心≤4）强度会自动按设备系数衰减，避免 150 个带光晕粒子卡顿。</p>
            <p class="tip">承载量保护：① 上限滑块锁顶 ② 弱机自动降级 ③ 预设档位。系统开启「减少动态」时粒子自动关闭。</p>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import ImageField from '../components/ImageField.vue';
import VideoField from '../components/VideoField.vue';
import BannerParticles from '@/components/BannerParticles.vue';
import HeroVideo from '@/components/HeroVideo.vue';

const props = defineProps<{ banner: any }>();

const banner = computed(() => props.banner || {});
const slides = computed<any[]>(() => banner.value.slides || []);
const activeIdx = ref(0);
const slide = computed<any>(() => slides.value[activeIdx.value] || null);

/** 启用粒子：开关联动（关闭时保留配置，便于再开） */
const pOn = computed({
  get: () => !!slide.value?.particles?.enabled,
  set: (v: boolean) => {
    ensureParticles();
    if (slide.value.particles) slide.value.particles.enabled = v;
  },
});

function defaultParticles(): any {
  return {
    enabled: true, type: 'petal', count: 60, maxCount: 150,
    color: '#ffffff', color2: '#ffd6e8',
    sizeMin: 6, sizeMax: 14, speed: 1, direction: 'down',
    opacity: 0.8, rotate: true, followMouse: false,
    glow: false, glowStrength: 12, glowColor: '',
  };
}
function ensureParticles() {
  if (!slide.value.particles) slide.value.particles = defaultParticles();
}
function defaultSlide(): any {
  return {
    id: 's' + Date.now(),
    bgType: 'image', bgImage: '', titleLines: [{ text: '新标题' }],
    subtitle: '', buttonText: '按钮', buttonBg: '', buttonColor: '', buttonScale: 1,
    link: '/app/gallery',
  };
}
function addLine() {
  const lines = slide.value.titleLines || (slide.value.titleLines = []);
  lines.push({ text: '' });
}
function removeLine(i: number) {
  const lines = slide.value.titleLines;
  if (lines && lines.length > 1) lines.splice(i, 1);
}
function addSlide() {
  (banner.value.slides || (banner.value.slides = [])).push(defaultSlide());
  activeIdx.value = slides.value.length - 1;
}
function removeSlide(i: number) {
  if (slides.value.length <= 1) return;
  slides.value.splice(i, 1);
  if (activeIdx.value >= slides.value.length) activeIdx.value = slides.value.length - 1;
}
function applyPreset(p: 'smooth' | 'balance' | 'lux') {
  ensureParticles();
  const map: Record<string, [number, number]> = {
    smooth: [40, 80], balance: [80, 120], lux: [150, 150],
  };
  const [c, m] = map[p];
  slide.value.particles!.count = c;
  slide.value.particles!.maxCount = m;
}

const previewBg = computed(() => {
  const img = slide.value?.bgImage;
  return img ? { backgroundImage: `url("${img}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : {};
});

/** 后台预览里"实际生效粒子数"提示（忽略系统减少动态，仅受数量/上限约束） */
const effectiveCount = computed(() => {
  const p = slide.value?.particles;
  if (!p || !p.enabled) return 0;
  const n = Math.min(Number(p.count) || 0, Number(p.maxCount) || 150);
  return Math.max(0, Math.round(n));
});

/** 后台预览 CTA 按钮样式（颜色/缩放，所见即所得） */
const previewBtnStyle = computed(() => {
  const s = slide.value;
  const st: Record<string, string> = {};
  if (s?.buttonBg) st.background = s.buttonBg;
  if (s?.buttonColor) st.color = s.buttonColor;
  const sc = typeof s?.buttonScale === 'number' && s.buttonScale > 0 ? s.buttonScale : 1;
  st.transform = `scale(${sc})`;
  return st;
});

onMounted(() => {
  const b = banner.value;
  // 旧单对象（缺 slides）迁移：把旧字段搬进首帧，避免数据丢失
  if (!b.slides || !b.slides.length) {
    if (b.titleLines || b.bgImage || b.bgEmoji || b.buttonText) {
      b.slides = [{
        id: 's1', bgType: 'image',
        bgImage: b.bgImage || '', bgEmoji: b.bgEmoji || '',
        titleLines: (b.titleLines || ['新标题']).map((t: any) => (typeof t === 'string' ? { text: t } : t)),
        subtitle: '', buttonText: b.buttonText || '按钮', link: '/app/gallery',
      }];
    } else {
      b.slides = [defaultSlide()];
    }
  }
});
</script>

<style scoped>
.banner-ed { display: grid; grid-template-columns: 260px 1fr; gap: 18px; align-items: start; }
/* 左栏 slide 列表 */
.side { border: 1px solid #e7eaf2; border-radius: 12px; overflow: hidden; background: #fff; }
.side-h { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; font-size: 13px; font-weight: 700; color: #4a4f63; border-bottom: 1px solid #eef1f6; }
.side-h .add { border: 0; background: #8a80d8; color: #fff; border-radius: 8px; padding: 4px 10px; font-size: 12px; cursor: pointer; }
.slide-list { list-style: none; margin: 0; padding: 6px; display: flex; flex-direction: column; gap: 6px; max-height: 520px; overflow: auto; }
.slide-list li { display: flex; align-items: center; gap: 8px; padding: 6px; border-radius: 8px; cursor: pointer; border: 1px solid transparent; }
.slide-list li.on { border-color: #8a80d8; background: #f3f1fc; }
.thumb { width: 46px; height: 30px; border-radius: 6px; overflow: hidden; background: #eef; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; }
.thumb img, .thumb video { width: 100%; height: 100%; object-fit: cover; }
.thumb-emoji { font-size: 18px; }
.meta { flex: 1; min-width: 0; }
.meta b { display: block; font-size: 12px; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.meta i { font-size: 11px; color: #999; font-style: normal; }
.del { border: 0; background: #ffe3e3; color: #d33; border-radius: 6px; width: 22px; height: 22px; cursor: pointer; flex: 0 0 auto; }

/* 右栏 */
.main { display: flex; flex-direction: column; gap: 14px; }
.preview { position: relative; height: 220px; border-radius: 28px; overflow: hidden; background: linear-gradient(135deg, #c9d6f7, #e7d6f3); }
.preview video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.preview .ov { position: absolute; inset: 0; z-index: 1; background: linear-gradient(90deg, rgba(246,243,249,.65), rgba(246,243,249,.05)); }
.preview .ct { position: absolute; inset: 0; z-index: 3; padding: 28px 20px; display: flex; flex-direction: column; justify-content: flex-end; color: #fff; }
.preview .ct h2 { margin: 0 0 10px; font-size: 20px; text-shadow: 0 2px 8px rgba(0,0,0,.3); }
.preview .ct h2 div { line-height: 1.5; }
.preview .ct .ct-sub { margin: 0 0 10px; font-size: 13px; text-shadow: 0 1px 6px rgba(0,0,0,.3); }
.preview .cta { align-self: flex-start; background: rgba(255,255,255,.92); color: #4a4f63; border-radius: 20px; padding: 8px 18px; font-size: 13px; font-weight: 700; transform-origin: center; }

/* 高自由度文案编辑 */
.lines { display: flex; flex-direction: column; gap: 10px; }
.line-edit { border: 1px solid #e7eaf2; border-radius: 10px; padding: 8px 10px; background: #fbfbff; display: flex; flex-direction: column; gap: 6px; }
.line-edit .le-top { display: flex; gap: 8px; align-items: center; }
.line-edit .le-text { flex: 1; border: 1px solid #dde2ee; border-radius: 8px; padding: 7px 9px; font-size: 13px; box-sizing: border-box; }
.line-edit .le-del { border: 0; background: #ffe3e3; color: #d33; border-radius: 6px; width: 26px; height: 30px; cursor: pointer; flex: 0 0 auto; font-size: 13px; }
.le-ctrl { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.le-c { font-size: 12px; color: #8a90a0; display: flex; align-items: center; gap: 4px; }
.le-c input[type="color"] { width: 28px; height: 24px; padding: 0; border: 1px solid #dde2ee; border-radius: 6px; background: none; cursor: pointer; }
.le-c input[type="number"] { width: 56px; border: 1px solid #dde2ee; border-radius: 6px; padding: 4px 6px; font-size: 12px; }
.le-c select { border: 1px solid #dde2ee; border-radius: 6px; padding: 4px 6px; font-size: 12px; }
.add-line { align-self: flex-start; border: 1px dashed #8a80d8; background: #f6f4ff; color: #6b5fc0; border-radius: 8px; padding: 6px 14px; font-size: 12px; cursor: pointer; }
.row.col { gap: 6px; }
.row.col textarea { resize: vertical; }

.form { display: flex; flex-direction: column; gap: 14px; }
.grp { border: 1px solid #e7eaf2; border-radius: 12px; padding: 12px 14px; background: #fff; display: flex; flex-direction: column; gap: 10px; }
.grp-h { font-size: 13px; font-weight: 700; color: #4a4f63; display: flex; justify-content: space-between; align-items: center; }
.row { display: flex; flex-direction: column; gap: 4px; }
.row label { font-size: 12px; color: #8a90a0; }
.row input, .row textarea, .row select, .grp select, .row2 input { border: 1px solid #dde2ee; border-radius: 8px; padding: 8px; font-size: 13px; width: 100%; box-sizing: border-box; }
.row2 { display: flex; gap: 12px; align-items: center; }
.row2 label { font-size: 12px; color: #8a90a0; display: flex; align-items: center; gap: 6px; }
.row2 input[type="range"] { width: 100%; }
.slider { display: flex; flex-direction: column; gap: 2px; }
.ck { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #4a4f63; }
.ck.inline { font-size: 12px; }
.seg { display: flex; gap: 6px; }
.seg button { flex: 1; border: 1px solid #dde2ee; background: #fff; border-radius: 8px; padding: 7px; cursor: pointer; font-size: 13px; }
.seg button.on { background: #8a80d8; color: #fff; border-color: #8a80d8; }
.presets { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #8a90a0; flex-wrap: wrap; }
.presets button { border: 1px solid #dde2ee; background: #fafbff; border-radius: 8px; padding: 5px 10px; cursor: pointer; font-size: 12px; }
.tip { font-size: 11px; color: #a08; margin: 0; line-height: 1.5; }
.pstatus { font-size: 12px; margin: 0 0 4px; padding: 7px 10px; border-radius: 8px; background: #eefaf0; color: #2c7a3f; line-height: 1.4; }
.pstatus.bad { background: #fff4e5; color: #b25b00; }
@media (max-width: 860px) { .banner-ed { grid-template-columns: 1fr; } }
</style>
