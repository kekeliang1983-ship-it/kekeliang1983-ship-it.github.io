// src/types/index.ts —— 严格基于 05-核心代码.txt 类型定义

/** 货币类型 */
export type Currency = 'gold' | 'pearl' | 'magic' | 'jade';

/** 五行属性 */
export type ElementType = 'gold' | 'wood' | 'water' | 'fire' | 'earth';

/** 种子品质 */
export type SeedQuality = 'common' | 'uncommon' | 'rare';

/** 作物 id（元素-品质，如 'gold-common'；灵植彩蛋第2/3批） */
export type CropId = `${ElementType}-${SeedQuality}`;

/** 香品类型（神龛，配置化后放宽：后台可增删香品档位，故不再限定死联合类型）*/
export type IncenseType = string;

/** 仙宠旅行档位 */
export type TravelMode = 'taijing' | 'huaxin' | 'fengling' | 'yunmeng' | 'xinghe' | 'taixu';
/** 旅行出发通道：携粮（消耗宠物食物库存）/ 魔丸（特权通道，消耗并返还魔丸） */
export type TravelChannel = 'food' | 'magic';

/** 仙宠食物类型（干粮/精粮）*/
export type PetFoodType = 'dry' | 'premium';

/** 情绪类型 */
export type EmotionType = 'joy' | 'calm' | 'anger' | 'sorrow' | 'surprise' | 'miss' | 'weary' | 'hope';

/** 灵植土地状态 */
export type PlotStatus = 'idle' | 'growing' | 'ready' | 'harvested';

/** Tab键（决策10：首页/灵植/天籁/仙宠/我的）*/
export type TabKey = 'home' | 'farm' | 'music' | 'pet' | 'me';

// ============================================================
// 核心实体类型
// ============================================================

/** 玩家核心数据 —— 对应05-core IUser */
export interface IUser {
  level: number;
  exp: number;
  maxExp: number;
  gold: number;        // 元宝
  pearl: number;       // 灵珠
  magic: number;       // 魔丸
  jade: number;        // 天玑
  qi: number;          // 灵气 0-100
  maxQi: number;       // 灵气上限=100
  mood: number;        // 心境 0-100
  lastActiveTimestamp: number;
  lastDailyReset: string; // YYYY-MM-DD
  nickname: string | null;   // 动态昵称（决策16A）
  renameSkipped: boolean;    // 首进起名引导是否已跳过
  avatar: string | null;     // 头像（emoji 字符串；null=用昵称首字）
  notifUnread: number;      // Header通知角标（决策3A）
  soundOn: boolean;         // 音效开关（持久化）
  hapticOn: boolean;        // 震动开关（持久化）
  qiBubbleDate: string;     // 灵气泡泡当日已收日期（YYYY-MM-DD，跨天清零）
  qiBubbleGain: number;     // 灵气泡泡当日已收灵气（日上限防刷）
}

/** 灵植土地实例 —— 05-core IPlot */
export interface IPlot {
  plotId: number;
  element: ElementType;
  status: PlotStatus;
  seedType: SeedQuality | null;
  sowTimestamp: number;
  growDurationSeconds: number;
  remainingSeconds: number;
  isStealable: boolean;
  stolenPercentage: number;
  /** 轮作地力（0~100，初始 60；异属性轮作+，连作同属性-；灵植彩蛋第2批） */
  fertility: number;
  /** 上一茬作物属性（轮作判定用；null 表示本块尚无前茬；灵植彩蛋第2批） */
  lastCropElement: ElementType | null;
}

/** 旅行见闻历史条目（归来随机带回一句话；倒序最新在前，上限 20 条） */
export interface IPetTravelNote {
  text: string;
  timestamp: number;
  mode: TravelMode;
}

/** 每日成长任务态（三件事全完成可领 +30 元宝；跨天自动重置） */
export interface IPetDailyTasks {
  date: string;      // YYYY-MM-DD
  fed: boolean;      // 喂食 1 次
  stroked: boolean;  // 互动（抚摸）1 次
  traveled: boolean; // 完成 1 次旅行（领取归来奖励时计）
  claimed: boolean;  // 已领取 +30 元宝
}

/** 仙宠 —— 05-core IPet（2026-08-25 扩展：背包/收藏/见闻/衰减时间戳；08-25 二次扩展：名字/见闻历史/每日任务） */
export interface IPet {
  type: ElementType;
  hunger: number;       // 0-100
  happiness: number;    // 0-100
  travelStatus: 'idle' | 'traveling' | 'returning';
  travelEndTimestamp: number; // Date.now() 毫秒
  travelMode: TravelMode | null;
  /** 本次旅行出发通道（携粮 / 魔丸），领取时决定返还与天玑规则 */
  travelChannel: TravelChannel;
  /** 累计完成旅行次数（用于地方渐进解锁：3/8/20 依次解锁 云梦泽/星河渡/太虚境） */
  travelCount: number;
  /** 每日首旅双倍：记录已享受双倍的日期（YYYY-MM-DD），跨天重置 */
  travelFirstDoubleDate: string;
  /** 背包食物库存：干粮/精粮（商店购买；喂食/旅行出发消耗） */
  food: Record<PetFoodType, number>;
  /** 已解锁仙宠收藏（首只免费自选，其余 2 天玑/只） */
  ownedPets: ElementType[];
  /** 上次抚摸时间戳（每 3 小时限 1 次） */
  lastStrokeTimestamp: number;
  /** 上次饱食/愉悦衰减结算时间戳（每 6h 各 -20；旅行中暂停计时） */
  lastDecayTimestamp: number;
  /** 最近一次旅行见闻（归来随机带回一句话；首页副标题用） */
  travelNote: string | null;
  /** 见闻时间戳（显示「X 小时前带回」） */
  travelNoteTimestamp: number;
  /** 宠物名字（主卡可编辑，持久化；默认「小灵灵」） */
  petName: string;
  /** 旅行见闻历史（倒序最新在前，上限 20 条） */
  travelNotes: IPetTravelNote[];
  /**
   * 见闻图鉴已收录键（格式 `mode:index`，如 'taixu:2'）。
   * 与 travelNotes 分离：历史列表有 20 条上限会滚动丢弃，图鉴需**永久留存**收集进度。
   */
  travelNotesSeen: string[];
  /** 每日魔丸加速判定日（YYYY-MM-DD，跨天重置 travelSpeedUpCount） */
  travelSpeedUpDate: string;
  /** 今日已用魔丸加速次数（上限 SPEED_UP_DAILY_LIMIT=2） */
  travelSpeedUpCount: number;
  /** 每日成长任务态（喂食/互动/旅行三件事，全完成 +30 元宝） */
  dailyTasks: IPetDailyTasks;
  /**
   * 非激活（已切换走）但已解锁仙宠的独立状态池。
   * 切换陪伴时，当前 active 的完整状态存入对应元素，载入目标元素的状态——实现「每只宠物饱食/愉悦/旅行独立」。
   * 竞速判定空闲/旅行亦读此处；激活中的宠物直接用本对象顶层字段。键为元素，未进出过场的元素可能缺省（视为空闲满状态）。
   */
  units: Partial<Record<ElementType, IPetUnit>>;
}

/** 单只仙宠的「随身状态」（切换/停放时完整保留，与 IPet 顶层 per-pet 字段同构） */
export interface IPetUnit {
  type: ElementType;
  hunger: number;            // 0-100
  happiness: number;         // 0-100
  travelStatus: 'idle' | 'traveling' | 'returning';
  travelEndTimestamp: number;
  travelMode: TravelMode | null;
  travelChannel: TravelChannel;
  lastStrokeTimestamp: number;
  lastDecayTimestamp: number;
  travelNote: string | null;
  travelNoteTimestamp: number;
  /** 该宠名字（默认「小灵灵」，可单独起名） */
  petName: string;
  travelNotes: IPetTravelNote[];
  travelNotesSeen: string[];
}

/** 情绪瓶 —— 05-core IEmotionBottle（2026-08-25 情绪球扩为8种） */
export interface IEmotionBottle {
  currentCount: number;
  maxCapacity: number; // =30
  todayUsed: number;
  dailyLimit: number;  // =3
  lastThreeEmotions: EmotionType[]; // 仅存最近3次（小三元判定）
  todayBalls: EmotionType[];        // 今日待投3颗（0点刷新，随机生成）
  ballsDay: string;                 // 今日球所属日期（跨天重置 todayUsed/todayBalls）
  contents: Partial<Record<EmotionType, number>>; // 瓶内各情绪分布（统计/液色）
  overflowCount: number;            // 累计灵光乍现次数
  /** 【P0】情绪图鉴永久收录（跨满溢保留；满溢只清 contents，不清它 —— 否则收集进度会从 8/8 倒退回 0/8） */
  emotionsSeen: EmotionType[];
  /** 【P0】小三元当日已触发的判定日（防连投同表情重复触发、把投入次数刷爆） */
  tripleDoneDay: string;
  /** 【P0】小三元返还的额外球（今日第 4 颗，保证「返还 1 次投入」真正可兑现） */
  bonusBalls: EmotionType[];
  /** 【P1】本瓶已发放的中途里程碑档位（10/20），满溢清瓶时一并重置 */
  milestoneGiven: number[];
}

/** 漂流瓶 —— 情绪瓶「向外」的一半（2026-09-03 新增）
 * 纯单机模拟：本机预置暖语库 + 情绪匹配，无真实社交/后端
 * 放流：在情绪瓶页写一句心事 + 选情绪，每日 1 次，心境 +1
 * 捞起：每日 1 次，按近期情绪匹配陌生人的暖语，入信箱（消息 logo 红点），读信心境 +1 */
export interface IDriftMessage {
  id: string;             // 唯一 id（时间戳 + 随机）
  emotion: EmotionType;   // 发送者情绪（匹配/展示用）
  text: string;           // 暖语 / 留言正文
  self: boolean;          // true=自己放流的回执；false=捞起的陌生人暖语
  read: boolean;          // 已读（驱动消息 logo 红点；仅对陌生人暖语有意义）
  favorite?: boolean;     // 是否已珍藏（珍藏的永不离箱，留在「珍藏架」）
  reward?: DriftReward[]; // 首次读信时掉落的喜悦奖励（仅陌生人暖语会掉）
  ts: number;             // 生成时间戳（ms）
}

/** 读信掉落奖励：金币(元宝)/魔丸/灵珠，不含天玑 */
export interface DriftReward {
  kind: 'gold' | 'magic' | 'pearl';
  amount: number;
}

export interface IDriftBottle {
  driftedOutDay: string;    // 今日放流日期（跨天重置 driftedOutUsed）
  driftedOutUsed: number;   // 今日已放流次数（上限 DRIFT_SEND_DAILY=1）
  driftedOutTotal: number;  // 累计放流数（统计）
  pickedDay: string;        // 今日捞起日期（跨天重置 pickedUsed）
  pickedUsed: number;       // 今日已捞起次数（上限 DRIFT_PICK_DAILY=1）
  pickedTotal: number;      // 累计捞起数
  archiveCount: number;     // 已「归海」的信件数（读后放归大海，只留星痕）
  inbox: IDriftMessage[];   // 信箱（捞起的暖语 + 放流回执 + 珍藏），最多保留 DRIFT_INBOX_MAX 条
}

/** 法器 id（配置化后放宽 string，由 artifacts.json 决定可用集合；固定 5 件，参数全可调） */
export type ArtifactId = string;

/** 法器（装备）—— 05-core IArtifact */
export interface IArtifact {
  id: string; // bell/bowl/amulet/flute/wheel（对应02-全局常量.txt L46-L51）
  level: number; // 1-5
  equipped: boolean;
  fragments: number;
}

/** 全局Buff（香火）—— 05-core IActiveBuff */
export interface IActiveBuff {
  type: IncenseType | null;
  rate: number;
  expireAt: number; // Unix 毫秒
}

/** 神龛状态 —— 01-全局规则 模块3 / 02-全局常量 三（2026-08-25 落地） */
export interface IWish {
  text: string;
  ts: number;
}

export interface IShrineState {
  deity: string; // 当前神位 id（配置化后放宽，由 shrineConfig.deities 决定可用集合）
  firstIncenseDay: string;  // 头香奖励已领日期（每日首次点香 随机货币x5）
  coupons: number;          // 上上签持有数（龙涎香必得 / 求签概率，可兑换20元宝）
  wishes: IWish[];          // 心愿墙（倒序最新在前，上限20条）
  incenseCount: number;     // 累计上香次数
}

/** 商店每日限购 —— 05-core IDailyLimits */
export interface IDailyLimits {
  legendaryWallpaperBought: number;
  qiPotionBought: number;
  freeWaterUsed: number;
  paidWaterUsed: number; // 付费浇水每日次数（防止无限叠加秒收）
}

/** 今日心语 */
export interface IQuote {
  text: string;
  author?: string; // 如"花朵"
}

/** Hero Banner */
export interface IBanner {
  imageUrl: string;      // 按Banner规范命名
  title: string;         // 左标题
  ctaText: string;       // CTA按钮文字
  targetRoute: string;   // 固定'/app/gallery'（决策12A）
}

// ============================================================
// 7模块动态副标题计算所需的扩展字段（契约2.3）
// ============================================================
/** 天籁曲目（08/16 一致：8首普通曲，前3免费后5珠丸解锁；另含1首典藏曲由4h里程碑解锁） */
export interface IMusicTrack {
  id: string;                 // track_001 ~ track_006
  name: string;               // 真实曲目名（孤城之心/心境如水/...）
  durationSeconds: number;    // 音频时长（秒），取真实文件时长
  isUnlocked: boolean;        // 是否已解锁（前3默认 true）
  /** 音频资源路径（public/audio 下，按 id 命名）；缺省则无法播放 */
  src?: string;
  unlockCost?: Partial<Record<'pearl' | 'magic' | 'gold' | 'jade', number>>; // 解锁费
  /** 典藏曲标记：由 X 小时里程碑解锁（无 unlockCost，不可货币购买），如 track_006 烟火长安 → 4 */
  milestoneHours?: number;
  // —— 以下字段为后台高自由度扩展（铁律13：全可调、不改代码）——
  desc?: string;              // 曲目简介 / 心境描述
  tags?: string[];            // 自由标签（睡前/放松/专注…）
  category?: string;          // 分类（如「古琴」「自然白噪」「电子疗愈」）
  element?: ElementType;      // 五行亲和（与情绪瓶/画境体系呼应）
  quality?: 'common' | 'uncommon' | 'legendary'; // 品质（凡/灵/仙）
  loop?: boolean;             // 是否循环（背景常驻建议 true）
  fadeIn?: number;            // 淡入秒数
  fadeOut?: number;           // 淡出秒数
  volume?: number;            // 相对音量 0~1（默认 1）
  countMilestone?: boolean;   // 是否计入聆听里程碑进度（默认 true）
  featured?: boolean;         // 推荐位（首页/精选展示）
  order?: number;             // 列表排序，越小越靠前
}

/** 天籁歌单 / 场景合集（复用策展集合模型：与曲目解耦、多对多、后台自由编排） */
export interface IMusicCollection {
  id: string;        // 唯一 key（如 'calm'），tab 过滤用它
  label: string;     // tab 显示名（如 '禅意'）
  icon?: string;     // 可选 emoji，显示在名称前
  ids: string[];     // 成员曲目 id（可跨分类）
  order?: number;    // 排序，越小越靠前（默认 50）
  enabled?: boolean; // 是否启用（默认 true）
}

export interface IModuleExtras {
  /** 画境模块：已收藏壁纸张数（= 已解锁数，同步维护） */
  galleryCount: number;
  /** 画境模块：已解锁壁纸 id 列表 */
  galleryUnlocked: string[];
  /** 画境模块：今日免费缘份壁纸刷新日期 */
  galleryFreeDate: string;
  /** 画境模块：今日免费缘份壁纸 id 列表（直接下载不计费） */
  galleryFreeIds: string[];
  /** 画境模块：今日缘定属性（每日免费 3 张中至少 2 张同属性，给收集期待） */
  galleryFreeTheme: ElementType | '';
  /** 画境模块：隐藏壁纸全收集庆祝是否已触发（防重复庆祝；隐藏壁纸仅增不减） */
  galleryHiddenCelebrated: boolean;
  /** 神龛模块：今日上香次数 0-3（契约2.3）*/
  shrineOffersToday: number;
  /** 天籁模块：6首真实曲目（3免费 + 2付费 + 1典藏，含解锁状态） */
  musicTracks: IMusicTrack[];
  /** 天籁模块：累计听歌秒数（03-6.3 heartbeat，每满300s结算一次奖励） */
  musicListenSeconds: number;
  /** 天籁模块：已领取里程碑小时数（0.25/1/4/12/24） */
  musicClaimedMilestones: number[];
  /** 天籁模块：24h里程碑"知音"标签（演示落库标记） */
  musicTag: boolean;
  /** 法器模块：解锁成就进度（收获 / 在线秒 / 守护） */
  artifactProgress: { harvest: number; onlineSec: number; defend: number };
  /** 法器模块：已解锁记录（驱动"首次解锁"庆祝卡；老存档首次进入只补齐不弹卡） */
  unlockedArtifacts: ArtifactId[];
  /** 法器模块：待庆祝的新解锁队列（运行时，不持久化） */
  pendingArtifactUnlocks: ArtifactId[];
  /** 灵植模块：今日已拜访好友 id 列表（每日一次，刷新不重复刷） */
  visitedFriendIds: number[];
  /** 灵植模块：拜访记录日期基准（跨天重置） */
  visitClaimsDay: string;
  /** 灵植模块：演示苗仅首进播种一次（避免刷新循环刷 common 收益） */
  farmDemoDone: boolean;
  /** 灵植彩蛋·灵田繁荣度（0~100，随收获增长，提升产出；第3批） */
  farmProsperity: number;
  /** 灵植彩蛋·收获连击数（1 起；连收窗口内累加，超时归 1；第3批） */
  harvestCombo: number;
  /** 灵植彩蛋·上次收获时间戳（连击窗口判定；第3批） */
  lastHarvestTs: number;
  /** 灵植彩蛋·种子图鉴永久收录（元素-品质 id，只增不减；第3批） */
  seedSeen: CropId[];
  /** 灵植彩蛋·今日五行风水阵主属性（'' 为未布阵；玩家自选，相生加成；第2批） */
  farmFormation: ElementType | '';
}
