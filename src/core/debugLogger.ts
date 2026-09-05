/* ========================================================================
   src/core/debugLogger.ts — 通用结构化DEV调试日志工具
   ⚠️  设计约束（吸取经验1034968教训，避免全局ReferenceError）：
   1) 同时 default 导出 + named 导出 createDebugLogger，调用方两种 import 风格都 OK
   2) 所有 console 输出由 ENABLED（=DEV 环境）开关，生产构建 100% 不打印
   3) 不引入任何第三方依赖，纯原生 console + CSS color
   4) 提供 3 类常用API：
      · group 折叠组：带tag颜色+时间戳，嵌套 groupEnd 不漏
      · 单行彩色日志：info(蓝)/warn(橙)/error(红)/success(绿)
      · tracePick：随机抽取追踪（文案池/随机路由等场景记录第N条抽中了什么）
======================================================================== */

const ENABLED: boolean = (() => {
  try {
    // Vite 特有标记；如果被打包到不支持的环境，降级为 false 确保不报错
    return Boolean((import.meta as any).env?.DEV);
  } catch (_e) {
    return false;
  }
})();

const COLORS = {
  tag: '#8A80D8',
  info: '#3A86FF',
  warn: '#F59E0B',
  error: '#EF4444',
  success: '#2BB673',
  dim: '#9699A8',
} as const;

function _ts(): string {
  try {
    return new Date().toLocaleTimeString('zh-CN', { hour12: false });
  } catch (_e) {
    return String(Date.now());
  }
}

function _cssColor(color: string, extra = ''): string {
  return `color:${color};font-weight:700;${extra}`;
}

/* ---------- 折叠组 handle ---------- */
export interface DebugLoggerGroup {
  /** 往当前折叠组内打一行普通日志（ENABLED=false时noop）*/
  log: (...args: any[]) => void;
  /** 往当前折叠组内打表格日志（ENABLED=false时noop）*/
  table: (tabularData: any, properties?: string[]) => void;
  /** 单行蓝色普通日志（组内版，与外层logger.info等价）*/
  info: (...args: any[]) => void;
  /** 单行橙色警告（组内版，与外层logger.warn等价）*/
  warn: (...args: any[]) => void;
  /** 单行红色错误（组内版，与外层logger.error等价）*/
  error: (...args: any[]) => void;
  /** 单行绿色成功提示（组内版，与外层logger.success等价）*/
  success: (...args: any[]) => void;
  /** 普通灰色描述性日志（组内版，与外层logger.dim等价）*/
  dim: (...args: any[]) => void;
  /** 结束折叠组，必须与 group() 成对调用（ENABLED=false时noop）*/
  end: () => void;
}

/* ---------- Logger 实例接口 ---------- */
export interface DebugLogger {
  readonly tag: string;
  readonly tagColor: string;
  /** 是否真实打印（DEV环境=true），调用方可以用此字段做高成本日志的守卫 */
  readonly enabled: boolean;

  /**
   * 开一个可折叠的日志分组（默认折叠，点击标题展开）
   * @param title 组内标题，会自动拼接 [tag] 前缀和时间戳
   * @param colorOverride 组标题颜色，不传则使用 logger.tagColor
   */
  group(title: string, colorOverride?: string): DebugLoggerGroup;

  /** 单行蓝色普通日志 */
  info: (...args: any[]) => void;
  /** 单行橙色警告 */
  warn: (...args: any[]) => void;
  /** 单行红色错误（额外会走console.error，便于断点定位）*/
  error: (...args: any[]) => void;
  /** 单行绿色成功提示 */
  success: (...args: any[]) => void;
  /** 普通灰色描述性日志 */
  dim: (...args: any[]) => void;

  /**
   * 随机抽取追踪：统一格式化输出"抽中了池子里第N条（共M条）"
   * @param category 动作名/分类（例：上香祈愿/法器装备）
   * @param pool 候选池数组（用于取length）
   * @param pickedIdx 抽中索引（0-based）
   * @param pickedValue 抽中值，可选
   */
  tracePick<T>(category: string, pool: readonly T[], pickedIdx: number, pickedValue?: T): void;
}

/* ---------- 工厂实现 ---------- */
export function createDebugLogger(tag: string, tagColor: string = COLORS.tag): DebugLogger {
  const self: DebugLogger = {
    tag,
    tagColor,
    enabled: ENABLED,

    group(title, colorOverride) {
      const headerColor = _cssColor(colorOverride || tagColor);
      const headerLabel = `%c[${tag}] ${title} @ ${_ts()}`;

      if (!ENABLED) {
        return {
          log() { /* noop */ },
          table() { /* noop */ },
          info() { /* noop */ },
          warn() { /* noop */ },
          error() { /* noop */ },
          success() { /* noop */ },
          dim() { /* noop */ },
          end() { /* noop */ },
        };
      }
      try {
        // console.groupCollapsed 某些极旧浏览器不存在，降级为普通log
        if (typeof (console as any).groupCollapsed === 'function') {
          (console as any).groupCollapsed(headerLabel, headerColor);
        } else {
          console.log(headerLabel, headerColor, '── BEGIN ──');
        }
      } catch (_e) {
        console.log(headerLabel, headerColor);
      }
      return {
        log(...args: any[]) {
          if (!ENABLED) return;
          console.log.apply(console, args as any);
        },
        table(tabularData: any, properties?: string[]) {
          if (!ENABLED) return;
          if (typeof (console as any).table === 'function') {
            try { (console as any).table(tabularData, properties); return; } catch (_e) {}
          }
          console.log(tabularData);
        },
        info(...args: any[]) {
          if (!ENABLED) return;
          console.log('%c   ℹ', _cssColor(COLORS.info), ...args);
        },
        warn(...args: any[]) {
          if (!ENABLED) return;
          console.log('%c   ⚠ WARN', _cssColor(COLORS.warn), ...args);
        },
        error(...args: any[]) {
          if (!ENABLED) return;
          try { console.error('%c   ✗ ERROR', _cssColor(COLORS.error), ...args); }
          catch (_e) { console.log('%c   ✗ ERROR', _cssColor(COLORS.error), ...args); }
        },
        success(...args: any[]) {
          if (!ENABLED) return;
          console.log('%c   ✓', _cssColor(COLORS.success), ...args);
        },
        dim(...args: any[]) {
          if (!ENABLED) return;
          console.log('%c   ·', _cssColor(COLORS.dim, 'font-weight:400;'), ...args);
        },
        end() {
          if (!ENABLED) return;
          try {
            if (typeof (console as any).groupEnd === 'function') {
              (console as any).groupEnd();
            } else {
              console.log(`%c[${tag}] ${title} @ ${_ts()} ── END ──`, headerColor);
            }
          } catch (_e) { /* swallow */ }
        },
      };
    },

    info(...args) {
      if (!ENABLED) return;
      console.log(`%c[${tag}]`, _cssColor(COLORS.info), ...args);
    },
    warn(...args) {
      if (!ENABLED) return;
      console.log(`%c[${tag}] WARN`, _cssColor(COLORS.warn), ...args);
    },
    error(...args) {
      if (!ENABLED) return;
      // console.error 方便开发者直接在Sources面板设置XHR/异常断点
      try { console.error(`%c[${tag}] ERROR`, _cssColor(COLORS.error), ...args); }
      catch (_e) { console.log(`%c[${tag}] ERROR`, _cssColor(COLORS.error), ...args); }
    },
    success(...args) {
      if (!ENABLED) return;
      console.log(`%c[${tag}]`, _cssColor(COLORS.success), ...args);
    },
    dim(...args) {
      if (!ENABLED) return;
      console.log(`%c[${tag}]`, _cssColor(COLORS.dim, 'font-weight:400;'), ...args);
    },

    tracePick<T>(category: string, pool: readonly T[], pickedIdx: number, pickedValue?: T) {
      if (!ENABLED) return;
      const total = pool.length;
      const safeIdx = total > 0 ? Math.max(0, Math.min(pickedIdx, total - 1)) : pickedIdx;
      const v = pickedValue !== undefined ? pickedValue : (pool as any)[safeIdx];
      console.log(
        `%c   → 随机抽 %c${category}%c 第 ${safeIdx + 1}/${total} 条:%c ${String(v)}`,
        _cssColor(COLORS.dim, 'font-weight:400;'),
        _cssColor(tagColor),
        _cssColor(COLORS.dim, 'font-weight:400;'),
        _cssColor(COLORS.info),
      );
    },
  };
  return self;
}

/* default + named 双导出（经验1034968：避免调用方不同import风格引起ReferenceError）*/
export default createDebugLogger;
