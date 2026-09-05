// src/services/visitService.ts —— 拜访（邻圃）服务抽象层
// 当前为单机桩实现；联机版本只需替换 visitService 的具体实现，调用方 FarmPage 无需改动。
// 这样提前把"拜访/借产"接口化，可消灭后期接入时的返工隐患（策划 01-L44 抗借比例由调用方计算后传入）。

export interface IBorrowResult {
  ok: boolean;                       // 是否真实借到（联机后为 true）
  borrowed: { gold: number; pearl: number; magic: number };
  note: string;                     // 给玩家的反馈文案
}

export interface IVisitService {
  /** 向某好友借走成熟作物
   *  @param friendId   好友 id
   *  @param ownerLevel 好友等级（用于抗借比例）
   *  @param pct        可借百分比（由调用方依据等级/结界符算出）
   */
  borrow(friendId: number, ownerLevel: number, pct: number): IBorrowResult;
}

/** 单机桩：不产生真实借走，仅返回友好提示，避免"假 BUG"误导玩家 */
class LocalVisitService implements IVisitService {
  borrow(_friendId: number, ownerLevel: number, pct: number): IBorrowResult {
    return {
      ok: false,
      borrowed: { gold: 0, pearl: 0, magic: 0 },
      note: `联机后将可向 Lv.${ownerLevel} 友友借走约 ${pct}% 产量，敬请期待～`,
    };
  }
}

export const visitService: IVisitService = new LocalVisitService();
