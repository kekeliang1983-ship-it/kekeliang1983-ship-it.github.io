// src/admin/types.ts —— 本地内容后台（dev-only）通用模块框架类型
// 设计目标：做一个「可复用的内容管理引擎」，以后别的应用照此注册模块即可。

/** 模块编辑器类型 */
export type EditorKind = 'gallery' | 'banner' | 'music' | 'home' | 'pet' | 'shrine' | 'artifacts' | 'bottle' | 'farm' | 'race' | 'checkin' | 'pool' | 'notice' | 'share' | 'json';

/** 单个可管理模块的定义（注册表项） */
export interface ModuleDef {
  /** 路由/文件名标识，对应 public/content/<id>.json 与 /__admin_api/<id> */
  id: string;
  /** 侧边栏显示名 */
  label: string;
  /** 侧边栏图标（emoji 即可，保持零素材依赖） */
  icon: string;
  /** 分组（侧边栏按 group 归并） */
  group: string;
  /** 编辑器类型 */
  editor: EditorKind;
  /** 一句话说明，显示在右侧标题下方 */
  desc?: string;
  /** 该模块内容是否已被 App 实际消费（false = 仅后台管理文件，App 侧接入见 #173） */
  wired?: boolean;
}
