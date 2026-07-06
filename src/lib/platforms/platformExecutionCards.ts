import { getPlatformProfile, type PlatformId } from "./platformProfiles.ts";

export interface PlatformExecutionCard {
  platformId: PlatformId;
  platformName: string;
  pipelineStages: string[];
  writingFocus: string[];
  submissionFocus: string[];
  feedbackMetric: string[];
  nextAction: string;
}

const platformExecutionOverrides: Record<
  PlatformId,
  Pick<PlatformExecutionCard, "submissionFocus" | "feedbackMetric" | "nextAction">
> = {
  fanqie: {
    submissionFocus: ["8 万字首秀前包装", "标题简介标签强钩子", "连续爽点样章"],
    feedbackMetric: ["首秀曝光", "读完率", "追读", "收藏"],
    nextAction: "用前三章兑现检查反推标题、简介和标签，先做首秀前投稿包。",
  },
  qidian: {
    submissionFocus: ["长篇卖点", "世界观简介", "升级体系说明"],
    feedbackMetric: ["收藏", "追读", "章节订阅预期", "评论有效反馈"],
    nextAction: "把卷结构、升级线和长期伏笔整理成起点长篇投稿基准。",
  },
  qimao: {
    submissionFocus: ["保底向简介", "稳定更新承诺", "下沉情绪标签"],
    feedbackMetric: ["点击", "收藏", "完读", "保底反馈"],
    nextAction: "把长线情绪供给和更新节奏写进七猫投稿包。",
  },
  jjwxc: {
    submissionFocus: ["人物关系钩子", "情感张力简介", "审核风险自检"],
    feedbackMetric: ["收藏", "评论情绪", "章节留存", "审核反馈"],
    nextAction: "先检查人物关系和情感推进，再生成晋江简介与标签。",
  },
  zhihu_yanxuan: {
    submissionFocus: ["第一人称短篇卖点", "付费节点", "结尾反转承诺"],
    feedbackMetric: ["开篇点击", "付费转化", "反转评价", "完读"],
    nextAction: "把前 1000 字付费期待和结尾回收写成盐选投稿检查单。",
  },
  webnovel: {
    submissionFocus: ["English synopsis", "chapter title package", "power fantasy hook"],
    feedbackMetric: ["views", "library adds", "chapter comments", "retention"],
    nextAction: "先生成英文 synopsis 和章节标题包，再检查文化语境解释。",
  },
  royal_road: {
    submissionFocus: ["progression promise", "system limits", "skill tree clarity"],
    feedbackMetric: ["ratings", "reviews", "followers", "chapter retention"],
    nextAction: "把技能树、等级曲线和战斗规则整理成 Royal Road 投稿说明。",
  },
  wattpad: {
    submissionFocus: ["romance tags", "emotional hook", "mobile chapter blurb"],
    feedbackMetric: ["reads", "votes", "comments", "library adds"],
    nextAction: "围绕关系张力和移动端标签，整理 Wattpad 简介与章节情绪钩子。",
  },
};

export function buildPlatformExecutionCard(id: PlatformId): PlatformExecutionCard {
  const profile = getPlatformProfile(id);
  const override = platformExecutionOverrides[id];

  return {
    platformId: id,
    platformName: profile.name,
    pipelineStages: ["写作", "投稿", "复盘"],
    writingFocus: profile.reviewFocus.slice(0, 3),
    submissionFocus: override.submissionFocus,
    feedbackMetric: override.feedbackMetric,
    nextAction: override.nextAction,
  };
}
