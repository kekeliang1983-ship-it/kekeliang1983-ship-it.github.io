// src/admin/modules.ts —— 后台模块注册表（可复用：新应用只要往这里加一项）
import type { ModuleDef } from './types';

/**
 * 每个模块 = 一个 public/content/<id>.json 文件 + 一种编辑器。
 * - gallery / banner：结构化编辑器，且 App 已接入内容层（wired:true）。
 * - music：结构化编辑器，文件由后台管理；App 侧消费接入见 #173。
 * - pet / shrine / artifacts / bottle：通用 JSON 编辑器（适合复杂嵌套配置）。
 */
export const MODULES: ModuleDef[] = [
  // —— 内容素材 ——
  { id: 'gallery', label: '画境 · 壁纸/白卡', icon: '🖼️', group: '内容素材', editor: 'gallery', desc: '管理全部壁纸与隐藏白卡：图片、属性、品质、价格', wired: true },
  { id: 'music', label: '天籁 · 曲库', icon: '🎵', group: '内容素材', editor: 'music', desc: '管理曲目与解锁条件、歌单/场景合集（已接入内容层，App 实时生效）', wired: true },
  { id: 'pool', label: '素材池', icon: '🎨', group: '内容素材', editor: 'pool', desc: '头像库(emoji+五行+中文名)/起名词库/五行底环渐变/默认紫环（已接入内容层，App 实时生效）', wired: true },

  // —— 首页装扮 ——
  { id: 'home', label: '首页整体装扮', icon: '🏠', group: '首页装扮', editor: 'home', desc: '最下层底图 / 今日心语（背景卡 + 动态漂浮物）/ 7 大版块白卡图标与背景', wired: true },
  { id: 'banner', label: '首页 Banner 文案', icon: '🚩', group: '首页装扮', editor: 'banner', desc: '首页顶部展示栏的多行标题、按钮文案与背景图', wired: true },
  { id: 'notices', label: '系统公告', icon: '📢', group: '首页装扮', editor: 'notice', desc: '系统公告管理：新增/编辑/删除/置顶；保存后 App 首页铃铛角标与公告弹窗实时生效', wired: true },
  { id: 'share', label: '分享卡片', icon: '📇', group: '首页装扮', editor: 'share', desc: '微信/QQ/微博等链接分享卡片：标题、描述、封面图（构建后生效，爬虫读静态 HTML）', wired: true },

  // —— 玩法配置 ——
  { id: 'pet', label: '仙宠', icon: '🐾', group: '玩法配置', editor: 'pet', desc: '仙宠全局参数/本体换皮/旅行档位/食物价格/文案池（已接入内容层，App 实时生效）', wired: true },
  { id: 'shrine', label: '神龛', icon: '⛩️', group: '玩法配置', editor: 'shrine', desc: '神龛上香/神恩/签文/今日宜忌配置（已接入内容层，App 实时生效）', wired: true },
  { id: 'artifacts', label: '法器', icon: '🔮', group: '玩法配置', editor: 'artifacts', desc: '法器成就/碎片/效果系数配置（招财铃元宝·聚灵碗灵气·空灵笛魔丸·轮回珠灵珠 均已真接入游戏数值，改系数 App 实时生效；结界符为联机后开启）', wired: true },
  { id: 'bottle', label: '情绪瓶', icon: '🫙', group: '玩法配置', editor: 'bottle', desc: '情绪瓶/漂流瓶全参配置：容量/每日上限/心境加成/满溢产出/小三元/里程碑/漂流参数/暖语库（已接入内容层，App 实时生效）', wired: true },
  { id: 'farm', label: '灵田', icon: '🌾', group: '玩法配置', editor: 'farm', desc: '灵田全参配置：地力/繁荣度/连击/五行生克/风水阵/图鉴/15作物/价目/天象/变异/奇遇（已接入内容层，App 实时生效）', wired: true },
  { id: 'race', label: '竞速', icon: '🏁', group: '玩法配置', editor: 'race', desc: '仙宠竞速全参配置：场次/定价/封顶/赛道五行轮换/赛道皮肤(视觉+全局修正)/天气系统/五行生克/五行→性格差异化/连击结阵/赛事事件/互扔道具/名次奖励/逆袭彩头/BOT名/安慰文案（已接入内容层，App 实时生效）', wired: true },
  { id: 'checkin', label: '签到', icon: '📿', group: '玩法配置', editor: 'checkin', desc: '七日灵签全参配置：补签花费/七日递增曲线(含签文)/累计里程碑(永不重置)（已接入内容层，App 实时生效）', wired: true },
];

export function getModule(id: string): ModuleDef | undefined {
  return MODULES.find((m) => m.id === id);
}
