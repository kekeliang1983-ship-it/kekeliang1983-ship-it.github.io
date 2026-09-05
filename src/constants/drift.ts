// src/constants/drift.ts —— 漂流瓶暖语库（2026-09-03 新增）
// 纯单机预置：治愈系、不评判、不说教，像陌生人留的一张温柔便签。
// 共鸣向(resonate)：「我也曾…」让人感到被懂；托举向(lift)：轻轻把人托一把。
import type { EmotionType } from '@/types/index';

/** 每日放流 / 捞起上限（克制：每天各 1 次，不堆货币、不强求） */
export const DRIFT_SEND_DAILY = 1;
export const DRIFT_PICK_DAILY = 1;

/** 合法情绪集合：用于校验云端瓶子携带的 emotion 字段，避免脏数据进信箱 */
export const DRIFT_EMOTION_SET = new Set<string>([
  'joy', 'calm', 'anger', 'sorrow', 'surprise', 'miss', 'weary', 'hope',
]);
/** 信箱最多保留条数（超出丢弃最旧） */
export const DRIFT_INBOX_MAX = 30;

/** ===== 读信「喜悦掉落」（金币/魔丸/灵珠，不含天玑） =====
 *  设计：偶遇式惊喜，不保证每次都掉；元宝最常见、魔丸中等、灵珠稀有；数量刻意克制。 */
export type DriftRewardKind = 'gold' | 'magic' | 'pearl';
export interface DriftReward {
  kind: DriftRewardKind;
  amount: number;
}
/** 触发概率（70% 给一份小惊喜，30% 只是被温柔对待，也很珍贵） */
export const DRIFT_REWARD_CHANCE = 0.7;
/** 在已触发的前提下，额外再掉一种的概率 */
export const DRIFT_REWARD_DOUBLE_CHANCE = 0.25;
/** 加权池：weight 越大越常见；min/max 为数量区间 */
export const DRIFT_REWARD_POOL: { kind: DriftRewardKind; weight: number; min: number; max: number }[] = [
  { kind: 'gold',  weight: 5, min: 2, max: 8 },
  { kind: 'magic', weight: 3, min: 1, max: 3 },
  { kind: 'pearl', weight: 1, min: 1, max: 1 },
];
/** 各奖励的展示信息（emoji + 名称 + 主题色，纯 CSS 动效用） */
export const DRIFT_REWARD_META: Record<DriftRewardKind, { emoji: string; label: string; color: string }> = {
  gold:  { emoji: '🪙', label: '元宝', color: '#E8B84B' },
  magic: { emoji: '🔮', label: '魔丸', color: '#8A80D8' },
  pearl: { emoji: '💠', label: '灵珠', color: '#5BC8C8' },
};

/** 掷一次奖励；返回 0 / 1 / 2 份（0 = 本次无掉落） */
export function rollDriftReward(): DriftReward[] {
  if (Math.random() > DRIFT_REWARD_CHANCE) return [];
  const rollOne = (): DriftReward => {
    const total = DRIFT_REWARD_POOL.reduce((s, r) => s + r.weight, 0);
    let r = Math.random() * total;
    let pick = DRIFT_REWARD_POOL[0];
    for (const p of DRIFT_REWARD_POOL) {
      if (r < p.weight) { pick = p; break; }
      r -= p.weight;
    }
    const amount = pick.min + Math.floor(Math.random() * (pick.max - pick.min + 1));
    return { kind: pick.kind, amount };
  };
  const out = [rollOne()];
  if (Math.random() < DRIFT_REWARD_DOUBLE_CHANCE) {
    let second = rollOne();
    let guard = 0;
    while (second.kind === out[0].kind && guard++ < 6) second = rollOne();
    out.push(second);
  }
  return out;
}

/** 每种情绪两个方向的暖语池 */
export const DRIFT_WARM_WORDS: Record<EmotionType, { resonate: string[]; lift: string[] }> = {
  joy: {
    resonate: [
      '看到你的欢喜，我也跟着弯了嘴角，今天真是个好日子。',
      '我也曾那样笑到停不下来，快乐果然会传染。',
      '替你高兴，这种亮堂堂的感觉值得被记下来。',
      '你写的开心让我想起晒过太阳的被子，暖烘烘的。',
      '隔着屏幕都能感觉到你上扬的嘴角，谢谢你分我这点光。',
      '原来今天也有人跟我一样，被一件小事点亮了。',
      '读到你的雀跃，我也悄悄笑了一下，谢谢。',
    ],
    lift: [
      '你值得这份开心，别急着让它溜走，多留一会儿。',
      '能让别人也笑出来，你本来就很耀眼。',
      '记住这个瞬间，往后的灰暗天就多一盏备用的灯。',
      '开心不是偷来的，是你应得的好天气。',
      '继续保持呀，世界需要你这样的小太阳。',
      '你已经把喜悦握在手里了，握稳就好。',
      '你笑起来的样子，一定很好看。',
    ],
  },
  calm: {
    resonate: [
      '我也贪恋这种安静，像泡进温水里，什么都不必做。',
      '读到你的平静，我手里的杯子都好像变轻了。',
      '原来有人也和我一样，在寻常午后慢慢松下来。',
      '这种不慌不忙的节奏，真好，替你珍惜着。',
      '我懂那种「什么都不想、只是待着」的舒服。',
    ],
    lift: [
      '把这份安静收好，它是你给自己最好的礼物。',
      '能安稳地待着，本身就是一种了不起的能力。',
      '别打扰这刻的宁静，让它再多待一会儿。',
      '你已经把生活过出了呼吸感，很好。',
      '慢一点也没关系，世界会等你。',
    ],
  },
  anger: {
    resonate: [
      '我也曾气得胸口发烫，那种不甘心我太懂了。',
      '读到你憋着的火，我想陪你一起骂一句「凭什么」。',
      '有时候就是想发火，没什么好羞耻的。',
      '我也被相似的事硌过，当时真想摔门。',
      '你的怒气我也接住了，它说明你在乎。',
    ],
    lift: [
      '气完了就吐口气，别让它过夜住在你心里。',
      '你有权生气，那不是脾气差，是底线在说话。',
      '先放过自己，那股火迟早会凉成灰。',
      '把委屈写下来就已经很勇敢了，剩下的交给时间。',
      '别急着原谅，先让自己顺顺气。',
    ],
  },
  sorrow: {
    resonate: [
      '我也曾那样闷闷地难过，像被薄雾罩了一整周。',
      '读到你的低落，我也轻轻叹了口气，陪你坐着。',
      '有些难过说不出原因，可它真实存在，我信。',
      '我也经历过这种提不起劲的日子，你不是一个人。',
      '你的委屈我接住了，哭一会儿也没关系的。',
    ],
    lift: [
      '难过不用解释给别人听，它允许就这么待着。',
      '你已经撑了很久了，今天可以允许自己软一下。',
      '雾会散的，不急着好起来，慢慢来。',
      '记得喝点热水、早点睡，身体先替你扛着。',
      '我就在这儿，不催你，也不劝你。',
    ],
  },
  surprise: {
    resonate: [
      '我也被生活突然的转折惊到过，心跳好半天平不下来。',
      '读到你的错愕，我想说：愣住很正常，先别慌。',
      '有些意外太突然，脑子宕机一下完全可以理解。',
      '我也经历过这种「怎么会这样」的瞬间，懂。',
      '你的惊讶我接住了，先喘口气。',
    ],
    lift: [
      '意外来了先别下结论，给自己一点缓冲的时间。',
      '惊一下没关系，你比想象中稳得住。',
      '把那口气压下来，我们再一件件捋。',
      '新情况也是新可能，先看看再说。',
      '你没做错什么，只是剧本临时改了页。',
    ],
  },
  miss: {
    resonate: [
      '我也常望着某处出神，想念一个不在身边的人。',
      '读到你的牵挂，我心里也软了一块，陪你想会儿。',
      '有些人在远方，却总在饭点、在路口冒出来。',
      '我也懂这种「明明好好的，突然就空了一下」。',
      '你的想念我收着了，它很珍贵。',
    ],
    lift: [
      '想念就说出来，风会替你带到的。',
      '那个人一定也被你这样静静地记挂着过。',
      '距离量得出公里，量不出心意，你并不孤单。',
      '把牵挂写进瓶子，也算见了一面。',
      '思念不是软弱，是你心里还热着。',
    ],
  },
  weary: {
    resonate: [
      '我也曾累到连手机都不想拿，只想瘫着。',
      '读到你的倦怠，我想说：歇会儿吧，没事。',
      '有时候不是懒，是电量真的见底了，我懂。',
      '我也经历过这种「什么都不想管」的阶段。',
      '你的疲惫我接住了，先卸下来。',
    ],
    lift: [
      '累了就歇，不是所有事都得今天做完。',
      '你已经做得够多了，允许自己按下暂停。',
      '充电不是偷懒，是为了下次还能接着走。',
      '今晚早点睡，明天的事明天再扛。',
      '倦怠是你的身体在替你喊停，听它的。',
    ],
  },
  hope: {
    resonate: [
      '我也曾那样眼巴巴盼着什么，连等都觉得甜。',
      '读到你的期待，我也跟着被点亮了一点。',
      '有人还在认真地盼着好事，真好，替你开心。',
      '我也懂这种「明天也许会更好」的小小火苗。',
      '你的盼望我收着了，它很明亮。',
    ],
    lift: [
      '守住这点盼头，它是暗路里的灯。',
      '肯盼着，说明你还没放弃，这本身就很棒。',
      '好事值得等，你等得起。',
      '把期待写下来，明天就更具体了一点。',
      '你眼里有光，别让它灭。',
    ],
  },
};

/** 无明确情绪时的兜底池（通用治愈向） */
export const DRIFT_GENERIC: string[] = [
  '今天也辛苦你了，先给自己一个轻轻的拥抱。',
  '无论此刻怎样，你都被某个角落温柔地记挂着。',
  '慢慢走，不急，路会自己延展开来。',
  '你写下的这一句，已经有人认真读完了。',
  '海会把你的心事带去很远的远方，也会带回来温柔。',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 按情绪从暖语库随机取一句（共鸣向 + 托举向混合，制造「先被懂、再被托」的节奏）。
 * emotion 为 null（无近期情绪）时回落通用池。
 */
export function pickWarmWord(emotion: EmotionType | null): string {
  if (!emotion || !DRIFT_WARM_WORDS[emotion]) return pick(DRIFT_GENERIC);
  const pool = [...DRIFT_WARM_WORDS[emotion].resonate, ...DRIFT_WARM_WORDS[emotion].lift];
  return pick(pool);
}
