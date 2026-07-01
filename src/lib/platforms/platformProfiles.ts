export type PlatformId =
  | "qidian"
  | "fanqie"
  | "qimao"
  | "jjwxc"
  | "zhihu_yanxuan"
  | "webnovel"
  | "royal_road"
  | "wattpad";

export type LengthType = "short_10k" | "mid_50k" | "long_300k_plus" | "mega_1m_plus";

export interface PlatformProfile {
  id: PlatformId;
  name: string;
  category: "paid" | "free" | "female" | "short" | "overseas";
  defaultLengthType: LengthType;
  genres: string[];
  openingRules: string[];
  reviewFocus: string[];
  risks: string[];
}

export const platformProfiles: PlatformProfile[] = [
  {
    id: "qidian",
    name: "起点中文网",
    category: "paid",
    defaultLengthType: "long_300k_plus",
    genres: ["玄幻", "仙侠", "都市", "历史", "科幻", "游戏竞技"],
    openingRules: ["第一章给出长期期待", "前三章展示世界规则和主角方向"],
    reviewFocus: ["卷结构", "升级体系", "世界观厚度", "长期伏笔", "阶段 Boss"],
    risks: ["新人竞争强", "前期反馈慢", "低字数作品不适配"],
  },
  {
    id: "fanqie",
    name: "番茄小说",
    category: "free",
    defaultLengthType: "long_300k_plus",
    genres: ["重生", "系统", "逆袭", "年代", "悬疑", "甜宠"],
    openingRules: ["第一章必须有强钩子", "前三章必须有连续爽点"],
    reviewFocus: ["读完率", "爽点密度", "章末悬念", "首秀前结构"],
    risks: ["流量波动", "版权控制弱", "长线设定容易被快节奏牺牲"],
  },
  {
    id: "qimao",
    name: "七猫",
    category: "free",
    defaultLengthType: "long_300k_plus",
    genres: ["言情", "种田", "年代", "豪门", "悬疑", "玄幻都市"],
    openingRules: ["开局目标清晰", "情绪供给稳定"],
    reviewFocus: ["稳定更新", "保底向节奏", "长线情绪", "下沉市场理解"],
    risks: ["题材同质化", "更新压力", "节奏过慢影响留存"],
  },
  {
    id: "jjwxc",
    name: "晋江文学城",
    category: "female",
    defaultLengthType: "mid_50k",
    genres: ["古言", "现言", "校园", "悬疑言情", "纯爱", "百合"],
    openingRules: ["人物关系先立住", "情感张力早出现"],
    reviewFocus: ["人物关系", "情感推进", "人物弧光", "审核风险"],
    risks: ["审核严格", "签约难度高", "情绪线崩坏会劝退"],
  },
  {
    id: "zhihu_yanxuan",
    name: "知乎盐选",
    category: "short",
    defaultLengthType: "short_10k",
    genres: ["悬疑", "复仇", "虐恋", "脑洞", "第一人称反转"],
    openingRules: ["第一段进入矛盾", "前 1000 字给出付费期待"],
    reviewFocus: ["反转链", "第一人称代入", "短篇爆点", "结尾回收"],
    risks: ["铺垫过长", "反转不成立", "结尾情绪不足"],
  },
  {
    id: "webnovel",
    name: "WebNovel",
    category: "overseas",
    defaultLengthType: "long_300k_plus",
    genres: ["Fantasy", "System", "Cultivation", "Urban Fantasy", "Progression"],
    openingRules: ["Explain the hook without heavy exposition", "Make the power fantasy clear early"],
    reviewFocus: ["English synopsis", "system logic", "chapter titles", "reader comprehension"],
    risks: ["direct translation sounds stiff", "cultural assumptions need context"],
  },
  {
    id: "royal_road",
    name: "Royal Road",
    category: "overseas",
    defaultLengthType: "long_300k_plus",
    genres: ["LitRPG", "Progression Fantasy", "Western Fantasy", "Cultivation"],
    openingRules: ["Make progression promise explicit", "Show system limits early"],
    reviewFocus: ["skill tree", "level curve", "combat logic", "world rules"],
    risks: ["soft systems get challenged", "progression without constraints feels cheap"],
  },
  {
    id: "wattpad",
    name: "Wattpad",
    category: "overseas",
    defaultLengthType: "mid_50k",
    genres: ["Romance", "Werewolf", "Billionaire", "Teen", "Campus"],
    openingRules: ["Lead with emotional tension", "Make the character appeal immediate"],
    reviewFocus: ["relationship tension", "tags", "chapter emotion", "mobile pacing"],
    risks: ["weak character chemistry", "unclear tags", "slow emotional payoff"],
  },
];

export function getPlatformProfile(id: PlatformId): PlatformProfile {
  const profile = platformProfiles.find((item) => item.id === id);
  if (!profile) {
    throw new Error(`Unknown platform profile: ${id}`);
  }
  return profile;
}

