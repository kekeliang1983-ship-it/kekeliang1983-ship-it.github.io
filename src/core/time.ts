// src/core/time.ts —— 全局时间引擎（单例），种植/旅行/上香倒计时统一走这里
// 对应 05-核心代码.txt L161-L196 TimeEngine

type TickCb = (deltaSeconds: number) => void;

class TimeEngine {
  private static i: TimeEngine;
  private timer: any = null;
  private listeners = new Map<string, TickCb>();

  static getInstance() { if (!TimeEngine.i) TimeEngine.i = new TimeEngine(); return TimeEngine.i; }

  /** 启动全局秒级心跳（在main.ts启动后调用一次即可）*/
  start() {
    if (this.timer) return;
    this.timer = window.setInterval(() => {
      this.listeners.forEach(cb => cb(1));
    }, 1000);
  }
  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  /** 注册滴答监听，返回取消函数 */
  onTick(cb: TickCb, id: string): () => boolean {
    this.listeners.set(id, cb);
    return () => this.listeners.delete(id);
  }

  /** 离线时长计算（上限8小时，参考05-core L198）*/
  calcOfflineSeconds(lastActiveMs: number): number {
    const diff = Math.floor((Date.now() - lastActiveMs) / 1000);
    const cap = 8 * 3600; // 最大8小时
    return Math.max(0, Math.min(diff, cap));
  }
}

export const timeEngine = TimeEngine.getInstance();
