# 素材缺口台账（P1 梳理）

> 梳理时间：2026-09-06
> 范围：`public/{audio,icons,images,wallpapers,originals}` + `src/assets/banners`
> 结论：音频、图标齐全；壁纸缺 25 张（靠 Canvas 兜底）；`images`、`banners` 为空且当前无代码引用，属预留目录。

## 各目录盘点

| 目录 | 类型 | 实际文件 | 代码引用 | 状态 |
|---|---|---|---|---|
| `public/audio` | mp3 | 6 | track_001–006（useModulesStore） | ✅ 齐全 |
| `public/icons` | png | 4 | icon-192/512 + maskable（manifest） | ✅ 齐全 |
| `public/wallpapers` | png | 10 | wp_001–wp_035（gallery.ts） | ⚠️ 缺 25 |
| `public/originals` | png | 10 | 与 wallpapers 对应 | ⚠️ 缺 25 |
| `public/images` | — | 0 | 无引用 | 🔲 预留空目录 |
| `src/assets/banners` | — | 0 | 无引用 | 🔲 预留空目录 |

## 缺口明细

### 壁纸（高优先，影响画廊真实度）
- 画廊定义 35 张壁纸（wp_001–wp_035），仅 wp_026–wp_035 有真实 PNG。
- 缺失：wp_001 – wp_025 共 25 张（含 /originals/ 同名原图）。
- 当前行为：gallery.ts 注释说明「有则展示真实图，否则 Canvas 生成」，缺失项会走程序化兜底，不影响运行，但视觉丰富度偏低。

### 预留目录
- `public/images`：当前游戏美术（小生物/场景）未见从此目录加载，疑似走 Canvas/SVG 或远程，需后续确认资源策略。
- `src/assets/banners`：活动 Banner 预留位，暂无引用，待运营位接入。

## 建议补齐顺序
1. **壁纸 wp_001–wp_025**（25 张 + 对应 originals）：直接提升画廊观感，优先级最高。
2. 确认 `public/images` 用途：若小生物/场景美术应放此目录，需补素材并接引用；若走程序化生成，可删目录避免歧义。
3. `banners` 待运营模块启用时再填。

## 待确认
- 小生物本体、场景、UI 图标等核心美术的资源加载路径（本次未在 `public/images` 发现引用，需进一步排查 src 内加载逻辑）。
