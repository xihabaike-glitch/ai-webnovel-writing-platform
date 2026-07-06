import { platformProfiles, type PlatformProfile } from "../platforms/platformProfiles.ts";
import type { GatePlatformGrowthDispatchItem } from "./gateActionReceipts.ts";
import { buildSubmissionChecklist, type SubmissionAiTask, type SubmissionChapter } from "./submissionChecklist.ts";
import { buildSubmissionPackage, type SubmissionPackage, type SubmissionPackageChapter } from "./submissionPackage.ts";

export interface MultiPlatformSubmissionInput {
  projectId?: string;
  title: string;
  genre: string;
  sellingPoint: string;
  currentWordCount: number;
  targetWordCount: number;
  targetPlatformId: string;
  chapters: Array<SubmissionPackageChapter & SubmissionChapter>;
  aiTasks: SubmissionAiTask[];
  platformPublishMetrics?: MultiPlatformPublishMetricInput[];
}

export interface MultiPlatformPublishMetricInput {
  platformId: string;
  platformName: string;
  views: number;
  clicks: number;
  favorites: number;
  follows: number;
  comments: number;
  paidReads: number;
  editorFeedback: string;
  contractStatus: string;
  publishUrl: string;
  notes: string;
  snapshotDate: Date | string;
  createdAt?: Date | string;
}

export interface MultiPlatformSubmissionVariant {
  platformId: string;
  platformName: string;
  category: PlatformProfile["category"];
  readinessPercent: number;
  fitScore: number;
  action: "priority" | "test" | "wait";
  actionLabel: string;
  positioning: string;
  opportunity: string;
  rewriteFocus: string[];
  risks: string[];
  submissionPackage: SubmissionPackage;
  packageMatrix: MultiPlatformPackageMatrix;
  effectTracking: MultiPlatformEffectTracking;
  decision: MultiPlatformDecisionItem;
}

export interface MultiPlatformSubmission {
  title: string;
  targetPlatformId: string;
  recommendedPlatformId: string;
  variants: MultiPlatformSubmissionVariant[];
  packageSummary: {
    readyPlatforms: number;
    needsWorkPlatforms: number;
    totalPlatforms: number;
    readyToArchive: boolean;
  };
  effectSummary: MultiPlatformEffectSummary;
  decisionBoard: MultiPlatformDecisionBoard;
  archive: MultiPlatformSubmissionArchive;
  markdown: string;
}

type MultiPlatformSubmissionArchiveSource = Omit<MultiPlatformSubmission, "archive">;

export interface MultiPlatformPackageMatrixItem {
  id: "title" | "logline" | "synopsis" | "tags" | "sample_chapters" | "overseas_synopsis";
  label: string;
  status: "ready" | "warning" | "missing";
  detail: string;
}

export interface MultiPlatformPackageMatrix {
  status: "ready" | "needs_work";
  readyFields: number;
  totalFields: number;
  packageFileName: string;
  sampleChapterCount: number;
  wordCount: number;
  items: MultiPlatformPackageMatrixItem[];
  nextAction: string;
}

export interface MultiPlatformEffectTracking {
  status: "needs_data" | "weak" | "watch" | "promising" | "signed";
  label: string;
  records: number;
  latestSnapshotDate: string | null;
  views: number;
  clicks: number;
  favorites: number;
  follows: number;
  comments: number;
  paidReads: number;
  clickRatePercent: number;
  favoriteRatePercent: number;
  followRatePercent: number;
  nextAction: string;
  repairFocus: string[];
  evidence: string[];
}

export interface MultiPlatformEffectSummary {
  trackedPlatforms: number;
  needsDataPlatforms: number;
  weakPlatforms: number;
  promisingPlatforms: number;
  signedPlatforms: number;
  bestPlatformId: string | null;
  nextAction: string;
}

export type MultiPlatformDecisionKind = "main" | "scale" | "watch" | "repair" | "collect_data" | "prepare_package" | "pause";

export interface MultiPlatformDecisionItem {
  kind: MultiPlatformDecisionKind;
  label: string;
  priority: "high" | "medium" | "low";
  score: number;
  reason: string;
  nextAction: string;
  actionHref: "#publish-effect-panel" | "#submission-package" | "#platform-export";
  evidence: string[];
}

export interface MultiPlatformDecisionLane {
  kind: MultiPlatformDecisionKind;
  label: string;
  count: number;
  platformIds: string[];
}

export interface MultiPlatformDecisionBoard {
  status: "no_data" | "needs_repair" | "watch" | "ready_to_scale" | "main_locked";
  headline: string;
  primaryPlatformId: string | null;
  primaryPlatformName: string | null;
  lanes: MultiPlatformDecisionLane[];
  tasks: MultiPlatformDecisionTask[];
  nextActions: string[];
}

export interface MultiPlatformDecisionTask {
  id: string;
  platformId: string;
  platformName: string;
  kind: MultiPlatformDecisionKind;
  ownerRole: "增长运营" | "平台编辑" | "数据编辑" | "主编";
  priorityScore: number;
  title: string;
  detail: string;
  dueLabel: string;
  actionLabel: string;
  href: string;
  acceptanceCriteria: string[];
  evidence: string[];
}

export interface MultiPlatformDecisionDispatchOptions {
  projectId?: string;
  reviewLatestAt?: string;
}

export interface MultiPlatformSubmissionArchivePlatform {
  platformId: string;
  platformName: string;
  category: PlatformProfile["category"];
  status: "ready" | "needs_work";
  effectStatus: MultiPlatformEffectTracking["status"];
  effectLabel: string;
  fileName: string;
  readyFields: number;
  totalFields: number;
  sampleChapterCount: number;
  wordCount: number;
  blockedFields: string[];
  nextAction: string;
}

export interface MultiPlatformSubmissionArchive {
  title: string;
  archiveFileName: string;
  generatedAt: string;
  deliveryScope: {
    corePlatformCount: number;
    completedPlatformCount: number;
    pausedExpansionCount: number;
    statusLabel: string;
    scopeDecision: string;
  };
  readyCount: number;
  blockedCount: number;
  totalPlatforms: number;
  totalSampleChapterCount: number;
  totalWordCount: number;
  platforms: MultiPlatformSubmissionArchivePlatform[];
  markdown: string;
}

const categoryOpportunity: Record<PlatformProfile["category"], string> = {
  paid: "适合拉长主线、做世界观和 IP 改编预期，但前期需要更强耐心。",
  free: "适合快速测流量和追读，用密集钩子、连续爽点换首轮数据。",
  female: "适合强化人物关系、情绪价值和角色弧光，文风稳定比爆点堆叠更重要。",
  short: "适合短篇反转和高压情绪，必须尽早给出付费期待和结尾回收。",
  overseas: "适合出海版本，需要把设定解释、标签和升级承诺写得更直白。",
};

const pausedExpansionPlatformCount = 0;

function buildSubmissionDeliveryScope(totalPlatforms: number) {
  return {
    corePlatformCount: totalPlatforms,
    completedPlatformCount: totalPlatforms,
    pausedExpansionCount: pausedExpansionPlatformCount,
    statusLabel: `${totalPlatforms}/${totalPlatforms} 核心平台已纳入发布闭环`,
    scopeDecision: "扩展平台不再作为待补缺口，不进入本期投稿包；先把核心平台的写作、投稿和复盘跑通。",
  };
}

function normalize(text: string) {
  return text.toLowerCase().replace(/\s+/g, "");
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function percent(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function genreMatchScore(genre: string, platform: PlatformProfile) {
  const normalizedGenre = normalize(genre);
  if (!normalizedGenre) return 0;
  const hasDirectMatch = platform.genres.some((platformGenre) => {
    const normalizedPlatformGenre = normalize(platformGenre);
    return normalizedGenre.includes(normalizedPlatformGenre) || normalizedPlatformGenre.includes(normalizedGenre);
  });
  if (hasDirectMatch) return 12;
  if (platform.category === "overseas" && /系统|玄幻|奇幻|升级|修仙|都市/.test(genre)) return 8;
  if (platform.category === "female" && /言情|甜宠|现言|古言|校园|纯爱|百合/.test(genre)) return 10;
  if (platform.category === "short" && /悬疑|复仇|虐恋|脑洞|反转/.test(genre)) return 10;
  return 3;
}

function lengthFitScore(targetWordCount: number, platform: PlatformProfile) {
  if (platform.defaultLengthType === "short_10k") return targetWordCount <= 80_000 ? 10 : -8;
  if (platform.defaultLengthType === "mid_50k") return targetWordCount <= 150_000 ? 8 : 0;
  if (platform.defaultLengthType === "long_300k_plus") return targetWordCount >= 250_000 ? 10 : -6;
  return targetWordCount >= 800_000 ? 10 : 0;
}

function buildAction(score: number): Pick<MultiPlatformSubmissionVariant, "action" | "actionLabel"> {
  if (score >= 78) return { action: "priority", actionLabel: "优先准备" };
  if (score >= 58) return { action: "test", actionLabel: "可改稿测试" };
  return { action: "wait", actionLabel: "暂缓投稿" };
}

function buildPositioning(input: MultiPlatformSubmissionInput, platform: PlatformProfile, submissionPackage: SubmissionPackage) {
  const focus = platform.reviewFocus.slice(0, 3).join("、");
  const primarySynopsis = platform.category === "overseas" ? submissionPackage.overseasSynopsis : submissionPackage.synopsis;
  return `${platform.name} 版本主打${focus}，简介核心为：${primarySynopsis}`;
}

function safeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "").slice(0, 80) || "submission";
}

function markdownTableCell(value: string) {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function matrixItem(
  id: MultiPlatformPackageMatrixItem["id"],
  label: string,
  status: MultiPlatformPackageMatrixItem["status"],
  detail: string,
): MultiPlatformPackageMatrixItem {
  return { id, label, status, detail };
}

function buildPackageMatrix(title: string, platform: PlatformProfile, submissionPackage: SubmissionPackage): MultiPlatformPackageMatrix {
  const sampleChapterCount = submissionPackage.firstThreeSummaries.filter((chapter) => !chapter.summary.includes("待补充")).length;
  const wordCount = submissionPackage.firstThreeSummaries.reduce((sum, chapter) => sum + chapter.summary.length, 0);
  const items: MultiPlatformPackageMatrixItem[] = [
    matrixItem("title", "书名", submissionPackage.title.trim().length >= 2 ? "ready" : "missing", submissionPackage.title || "缺少书名。"),
    matrixItem("logline", "一句话卖点", submissionPackage.logline.trim().length >= 12 ? "ready" : "missing", submissionPackage.logline || "缺少一句话卖点。"),
    matrixItem("synopsis", "中文简介", submissionPackage.synopsis.trim().length >= 80 ? "ready" : "warning", `简介 ${submissionPackage.synopsis.trim().length} 字。`),
    matrixItem("tags", "标签", submissionPackage.tags.length >= 3 ? "ready" : "warning", `${submissionPackage.tags.length} 个标签：${submissionPackage.tags.join("、") || "缺少标签"}`),
    matrixItem("sample_chapters", "样章摘要", sampleChapterCount >= 3 ? "ready" : "warning", `已准备 ${sampleChapterCount}/3 章样章摘要。`),
    matrixItem(
      "overseas_synopsis",
      "海外 Synopsis",
      platform.category === "overseas"
        ? submissionPackage.overseasSynopsis.trim().length >= 80 ? "ready" : "missing"
        : submissionPackage.overseasSynopsis.trim().length >= 80 ? "ready" : "warning",
      platform.category === "overseas"
        ? `出海平台必须准备英文 synopsis，当前 ${submissionPackage.overseasSynopsis.trim().length} 字符。`
        : `非出海平台可选，当前 ${submissionPackage.overseasSynopsis.trim().length} 字符。`,
    ),
  ];
  const readyFields = items.filter((item) => item.status === "ready").length;
  const blockers = items.filter((item) => item.status === "missing").length;
  const status: MultiPlatformPackageMatrix["status"] = blockers === 0 && readyFields >= items.length - 1 ? "ready" : "needs_work";

  return {
    status,
    readyFields,
    totalFields: items.length,
    packageFileName: `${safeFileName(title)}-${safeFileName(platform.name)}-投稿包.md`,
    sampleChapterCount,
    wordCount,
    items,
    nextAction: status === "ready"
      ? "平台包字段已齐，可以归档、复制或进入投放小样本。"
      : `先补 ${items.filter((item) => item.status !== "ready").map((item) => item.label).join("、")}，再归档平台包。`,
  };
}

function contractStatusLabel(status: string) {
  if (status === "signed") return "已签约";
  if (status === "invited") return "收到邀约";
  if (status === "rejected") return "被拒";
  if (status === "pending") return "待审";
  return "未确认";
}

function buildEffectRepairFocus(input: {
  clickRatePercent: number;
  favoriteRatePercent: number;
  followRatePercent: number;
  editorFeedback: string;
}) {
  const focus: string[] = [];
  if (input.clickRatePercent < 5) {
    focus.push("先修标题和简介：点击率低，入口承诺不够直。");
  }
  if (input.favoriteRatePercent < 1.5) {
    focus.push("先修标签和卖点：收藏率低，题材利益点没有被读者记住。");
  }
  if (input.followRatePercent < 0.8) {
    focus.push("先修前三章兑现：追读率低，开头钩子没有转成连续期待。");
  }
  if (/开头|前三章|慢|拖|兑现|钩子/u.test(input.editorFeedback)) {
    focus.push("按编辑反馈复查前三章：把慢热铺垫改成选择、冲突和兑现。");
  }
  if (/标题|简介|卖点|包装|标签/u.test(input.editorFeedback)) {
    focus.push("按编辑反馈重做投稿包装：标题、简介、标签必须同向表达一个卖点。");
  }
  return [...new Set(focus)].slice(0, 4);
}

function hasCompletedRepairPackageEvidence(metric: MultiPlatformPublishMetricInput) {
  const text = `${metric.editorFeedback} ${metric.notes}`;
  return /(?:修复对象|修复后证据|复检结果|下一轮口径)\s*[：:=]\s*\S+/u.test(text)
    || /submission-decision:[^：\s]+:[^：\s]+:repair/u.test(text);
}

function hasCompletedRepairPackageTracking(effectTracking: MultiPlatformEffectTracking) {
  return effectTracking.evidence.some((item) => item.includes("修复包已完成"));
}

function buildEffectTracking(platform: PlatformProfile, metrics: MultiPlatformPublishMetricInput[]): MultiPlatformEffectTracking {
  const history = metrics
    .filter((metric) => metric.platformId === platform.id)
    .sort((left, right) => new Date(right.snapshotDate).getTime() - new Date(left.snapshotDate).getTime());
  const latest = history[0] ?? null;
  if (!latest) {
    return {
      status: "needs_data",
      label: "待回填",
      records: 0,
      latestSnapshotDate: null,
      views: 0,
      clicks: 0,
      favorites: 0,
      follows: 0,
      comments: 0,
      paidReads: 0,
      clickRatePercent: 0,
      favoriteRatePercent: 0,
      followRatePercent: 0,
      nextAction: "下载或复制投稿包后，回填曝光、点击、收藏、追读和编辑反馈。",
      repairFocus: [],
      evidence: ["暂无真实投放数据"],
    };
  }

  const clickRatePercent = percent(latest.clicks, latest.views);
  const favoriteRatePercent = percent(latest.favorites, latest.views);
  const followRatePercent = percent(latest.follows, latest.views);
  const evidence = [
    `曝光 ${latest.views}`,
    `点击率 ${clickRatePercent}%`,
    `收藏率 ${favoriteRatePercent}%`,
    `追读率 ${followRatePercent}%`,
    latest.editorFeedback ? `编辑反馈：${latest.editorFeedback}` : "",
  ].filter(Boolean);
  const completedRepairPackage = hasCompletedRepairPackageEvidence(latest);
  const trackingEvidence = completedRepairPackage
    ? [...evidence, "修复包已完成：等待第二轮小样本重验标题、简介、标签和前三章兑现。"]
    : evidence;
  const repairFocus = buildEffectRepairFocus({
    clickRatePercent,
    favoriteRatePercent,
    followRatePercent,
    editorFeedback: latest.editorFeedback,
  });

  if (latest.contractStatus === "signed" || latest.contractStatus === "invited") {
    return {
      status: "signed",
      label: contractStatusLabel(latest.contractStatus),
      records: history.length,
      latestSnapshotDate: new Date(latest.snapshotDate).toISOString(),
      views: latest.views,
      clicks: latest.clicks,
      favorites: latest.favorites,
      follows: latest.follows,
      comments: latest.comments,
      paidReads: latest.paidReads,
      clickRatePercent,
      favoriteRatePercent,
      followRatePercent,
      nextAction: "保留当前投稿入口承诺，围绕有效卖点稳定更新，不要乱换题眼。",
      repairFocus: [],
      evidence: trackingEvidence,
    };
  }

  const status: MultiPlatformEffectTracking["status"] = latest.views >= 100 && (clickRatePercent < 5 || favoriteRatePercent < 1.5 || followRatePercent < 0.8)
    ? "weak"
    : clickRatePercent >= 10 && favoriteRatePercent >= 3 && followRatePercent >= 1.5
      ? "promising"
      : "watch";
  const nextAction = status === "weak"
    ? "入口数据偏弱，优先重写标题、简介和前三章钩子，再做第二轮小样本。"
    : status === "promising"
      ? "数据有苗头，可以小步加码，但下一轮仍要继续回填对照。"
      : completedRepairPackage
        ? "修复包已完成，下一步只做第二轮小样本重验；不要放大投放，也不要同时改多个变量。"
        : "样本还没站稳，继续观察一轮，不要过早判死或放大。";

  return {
    status,
    label: status === "weak" ? "偏弱" : status === "promising" ? "有苗头" : "观察中",
    records: history.length,
    latestSnapshotDate: new Date(latest.snapshotDate).toISOString(),
    views: latest.views,
    clicks: latest.clicks,
    favorites: latest.favorites,
    follows: latest.follows,
    comments: latest.comments,
    paidReads: latest.paidReads,
    clickRatePercent,
    favoriteRatePercent,
    followRatePercent,
    nextAction,
    repairFocus: status === "weak" ? repairFocus : [],
    evidence: trackingEvidence,
  };
}

function decisionLabel(kind: MultiPlatformDecisionKind) {
  if (kind === "main") return "主战场";
  if (kind === "scale") return "小步加码";
  if (kind === "watch") return "继续观察";
  if (kind === "repair") return "修入口";
  if (kind === "collect_data") return "补数据";
  if (kind === "prepare_package") return "补投稿包";
  return "暂停";
}

function buildDecision(
  platform: PlatformProfile,
  fitScore: number,
  packageMatrix: MultiPlatformPackageMatrix,
  effectTracking: MultiPlatformEffectTracking,
): MultiPlatformDecisionItem {
  if (packageMatrix.status !== "ready") {
    return {
      kind: "prepare_package",
      label: decisionLabel("prepare_package"),
      priority: "high",
      score: Math.max(0, fitScore - 25),
      reason: `${platform.name} 投稿包字段未齐，先别投，投了也是脏样本。`,
      nextAction: packageMatrix.nextAction,
      actionHref: "#submission-package",
      evidence: packageMatrix.items.filter((item) => item.status !== "ready").map((item) => `${item.label}：${item.detail}`),
    };
  }

  if (effectTracking.status === "signed") {
    return {
      kind: "main",
      label: decisionLabel("main"),
      priority: "high",
      score: clampScore(fitScore + 28 + Math.min(effectTracking.records * 2, 8)),
      reason: `${platform.name} 已出现邀约/签约信号，主战场优先级最高。`,
      nextAction: "稳住更新节奏，保留当前标题、简介和前三章承诺，继续回填下一轮平台反馈。",
      actionHref: "#publish-effect-panel",
      evidence: effectTracking.evidence,
    };
  }

  if (effectTracking.status === "promising") {
    return {
      kind: "scale",
      label: decisionLabel("scale"),
      priority: "high",
      score: clampScore(fitScore + 18 + Math.min(effectTracking.records * 2, 8)),
      reason: `${platform.name} 数据有正反馈，可以放大，但别一次拉满。`,
      nextAction: "小步加码更新和曝光，保留对照组，下一轮继续回填点击、收藏、追读。",
      actionHref: "#publish-effect-panel",
      evidence: effectTracking.evidence,
    };
  }

  if (effectTracking.status === "weak") {
    return {
      kind: "repair",
      label: decisionLabel("repair"),
      priority: "high",
      score: clampScore(fitScore - 18),
      reason: `${platform.name} 入口数据偏弱，继续铺量只会把问题放大。`,
      nextAction: "先修标题、简介、标签和前三章钩子，再投第二轮小样本。",
      actionHref: "#platform-export",
      evidence: [...effectTracking.evidence, ...effectTracking.repairFocus],
    };
  }

  if (effectTracking.status === "watch") {
    const repairedWatch = hasCompletedRepairPackageTracking(effectTracking);
    return {
      kind: "watch",
      label: decisionLabel("watch"),
      priority: "medium",
      score: clampScore(fitScore + (repairedWatch ? 14 : 4)),
      reason: repairedWatch
        ? `${platform.name} 修复包已完成，下一步必须二轮小样本重验。`
        : `${platform.name} 有数据但不够硬，不能判死，也不能加码。`,
      nextAction: repairedWatch
        ? "只投第二轮小样本，回填曝光、点击、收藏、追读和编辑反馈，验证修复是否真的起效。"
        : "再收一轮样本，优先观察点击率是否破 10%、收藏率是否破 3%。",
      actionHref: "#publish-effect-panel",
      evidence: effectTracking.evidence,
    };
  }

  if (fitScore < 45) {
    return {
      kind: "pause",
      label: decisionLabel("pause"),
      priority: "low",
      score: fitScore,
      reason: `${platform.name} 当前适配分太低，暂时不是首轮测试位。`,
      nextAction: "先不要分散精力，等主平台或相邻平台跑出数据后再回看。",
      actionHref: "#submission-package",
      evidence: [`适配分 ${fitScore}`, packageMatrix.nextAction],
    };
  }

  return {
    kind: "collect_data",
    label: decisionLabel("collect_data"),
    priority: fitScore >= 70 ? "high" : "medium",
    score: fitScore,
    reason: `${platform.name} 字段已齐但缺真实数据，先小样本，不要靠感觉定主平台。`,
    nextAction: "投放 1 个小样本，回填曝光、点击、收藏、追读和编辑反馈。",
    actionHref: "#publish-effect-panel",
    evidence: [`适配分 ${fitScore}`, "暂无真实投放数据"],
  };
}

function buildVariant(input: MultiPlatformSubmissionInput, platform: PlatformProfile): MultiPlatformSubmissionVariant {
  const submissionPackage = buildSubmissionPackage({
    title: input.title,
    genre: input.genre,
    sellingPoint: input.sellingPoint,
    currentWordCount: input.currentWordCount,
    targetWordCount: input.targetWordCount,
    platform,
    chapters: input.chapters,
  });
  const checklist = buildSubmissionChecklist({
    title: input.title,
    genre: input.genre,
    sellingPoint: input.sellingPoint,
    currentWordCount: input.currentWordCount,
    targetWordCount: input.targetWordCount,
    platform,
    chapters: input.chapters,
    aiTasks: input.aiTasks,
  });
  const targetPlatformBonus = platform.id === input.targetPlatformId ? 4 : 0;
  const fitScore = clampScore(
    checklist.readinessPercent
    + genreMatchScore(input.genre, platform)
    + lengthFitScore(input.targetWordCount, platform)
    + targetPlatformBonus
    - Math.min(platform.risks.length * 2, 8),
  );
  const action = buildAction(fitScore);
  const packageMatrix = buildPackageMatrix(input.title, platform, submissionPackage);
  const effectTracking = buildEffectTracking(platform, input.platformPublishMetrics ?? []);

  return {
    platformId: platform.id,
    platformName: platform.name,
    category: platform.category,
    readinessPercent: checklist.readinessPercent,
    fitScore,
    ...action,
    positioning: buildPositioning(input, platform, submissionPackage),
    opportunity: categoryOpportunity[platform.category],
    rewriteFocus: [
      `开头：${platform.openingRules.join("；")}`,
      `简介：突出${platform.reviewFocus.slice(0, 3).join("、")}`,
      platform.category === "overseas" ? "标签：补足英文读者能直接理解的类型词。" : "标签：保留题材词，再补平台高频爽点词。",
    ],
    risks: platform.risks,
    submissionPackage,
    packageMatrix,
    effectTracking,
    decision: buildDecision(platform, fitScore, packageMatrix, effectTracking),
  };
}

function buildMarkdown(title: string, variants: MultiPlatformSubmissionVariant[]) {
  return [
    `# ${title} 多平台投稿版本`,
    "",
    "## 推荐排序",
    ...variants.map((variant, index) => (
      `${index + 1}. ${variant.platformName}｜适配分 ${variant.fitScore}｜${variant.actionLabel}`
    )),
    "",
    ...variants.flatMap((variant) => [
      `## ${variant.platformName}`,
      `适配分：${variant.fitScore}`,
      `动作：${variant.actionLabel}`,
      `定位：${variant.positioning}`,
      `机会：${variant.opportunity}`,
      `包状态：${variant.packageMatrix.status === "ready" ? "可归档" : "需补齐"}｜字段 ${variant.packageMatrix.readyFields}/${variant.packageMatrix.totalFields}｜文件 ${variant.packageMatrix.packageFileName}`,
      `投放追踪：${variant.effectTracking.label}｜记录 ${variant.effectTracking.records}｜点击率 ${variant.effectTracking.clickRatePercent}%｜收藏率 ${variant.effectTracking.favoriteRatePercent}%｜追读率 ${variant.effectTracking.followRatePercent}%`,
      `追踪下一步：${variant.effectTracking.nextAction}`,
      `投放决策：${variant.decision.label}｜${variant.decision.reason}`,
      `决策动作：${variant.decision.nextAction}`,
      "重写重点：",
      ...variant.rewriteFocus.map((focus) => `- ${focus}`),
      "平台包字段：",
      ...variant.packageMatrix.items.map((item) => `- ${item.label}：${item.status === "ready" ? "已齐" : item.status === "warning" ? "需补强" : "缺失"}｜${item.detail}`),
      "风险：",
      ...variant.risks.map((risk) => `- ${risk}`),
      "",
      "### 一句话卖点",
      variant.submissionPackage.logline,
      "",
      "### 简介",
      variant.category === "overseas" ? variant.submissionPackage.overseasSynopsis : variant.submissionPackage.synopsis,
      "",
      "### 标签",
      variant.submissionPackage.tags.join("、"),
      "",
    ]),
  ].join("\n");
}

function buildEffectSummary(variants: MultiPlatformSubmissionVariant[]): MultiPlatformEffectSummary {
  const trackedPlatforms = variants.filter((variant) => variant.effectTracking.records > 0).length;
  const needsDataPlatforms = variants.filter((variant) => variant.effectTracking.status === "needs_data").length;
  const weakPlatforms = variants.filter((variant) => variant.effectTracking.status === "weak").length;
  const promisingPlatforms = variants.filter((variant) => variant.effectTracking.status === "promising").length;
  const signedPlatforms = variants.filter((variant) => variant.effectTracking.status === "signed").length;
  const best = variants
    .filter((variant) => variant.effectTracking.records > 0)
    .sort((left, right) => (
      right.effectTracking.favoriteRatePercent - left.effectTracking.favoriteRatePercent
      || right.effectTracking.clickRatePercent - left.effectTracking.clickRatePercent
      || right.fitScore - left.fitScore
    ))[0] ?? null;
  const nextAction = trackedPlatforms === 0
    ? "先选 1-2 个平台投放小样本，并回填第一轮曝光、点击、收藏和追读。"
    : weakPlatforms > 0
      ? "优先处理偏弱平台的标题、简介和前三章入口，不要继续盲目铺量。"
      : promisingPlatforms + signedPlatforms > 0
        ? "保留有反馈的平台打法，小步加码并继续做下一轮数据对照。"
        : "已有数据但还不够硬，继续收一轮样本再定主战场。";

  return {
    trackedPlatforms,
    needsDataPlatforms,
    weakPlatforms,
    promisingPlatforms,
    signedPlatforms,
    bestPlatformId: best?.platformId ?? null,
    nextAction,
  };
}

function laneOrder(kind: MultiPlatformDecisionKind) {
  const order: Record<MultiPlatformDecisionKind, number> = {
    main: 0,
    scale: 1,
    repair: 2,
    collect_data: 3,
    watch: 4,
    prepare_package: 5,
    pause: 6,
  };
  return order[kind];
}

function decisionTaskLaneOrder(variant: MultiPlatformSubmissionVariant) {
  if (variant.decision.kind === "watch" && hasCompletedRepairPackageTracking(variant.effectTracking)) return 2.5;
  return laneOrder(variant.decision.kind);
}

function decisionOwnerRole(kind: MultiPlatformDecisionKind): MultiPlatformDecisionTask["ownerRole"] {
  if (kind === "main" || kind === "scale" || kind === "pause") return "增长运营";
  if (kind === "repair" || kind === "prepare_package") return "平台编辑";
  if (kind === "collect_data" || kind === "watch") return "数据编辑";
  return "主编";
}

function decisionDueLabel(kind: MultiPlatformDecisionKind) {
  if (kind === "main" || kind === "scale") return "今天";
  if (kind === "repair" || kind === "prepare_package") return "24 小时内";
  if (kind === "collect_data") return "投放后 24 小时";
  if (kind === "watch") return "下一轮数据后";
  return "本周复盘";
}

function decisionAcceptanceCriteria(variant: MultiPlatformSubmissionVariant) {
  const kind = variant.decision.kind;
  if (kind === "main") {
    return [
      "确认主平台更新节奏和标题简介不乱改。",
      "记录下一轮曝光、点击、收藏、追读和编辑反馈。",
      "保留当前有效投稿包作为对照版本。",
    ];
  }
  if (kind === "scale") {
    return [
      "只做小步加码，不一次性铺满所有平台。",
      "下一轮样本继续回填点击率、收藏率和追读率。",
      "保留本轮标题、简介、标签和前三章作为对照。",
    ];
  }
  if (kind === "repair") {
    const repairFocusCriteria = variant.effectTracking.repairFocus.map((focus) => `按复盘修复焦点处理：${focus}`);
    return [
      ...(repairFocusCriteria.length ? repairFocusCriteria : ["重写标题、简介、标签或前三章钩子中的至少一项。"]),
      "修复后生成第二轮小样本投稿包。",
      "第二轮必须与当前弱数据做前后对照。",
    ];
  }
  if (kind === "prepare_package") {
    return [
      "补齐缺失字段并重新生成平台投稿包。",
      "字段矩阵不得出现缺失项。",
      "归档包里能看到该平台的单平台 Markdown。",
    ];
  }
  if (kind === "collect_data") {
    return [
      "完成 1 个小样本投放或人工模拟投放记录。",
      "回填曝光、点击、收藏、追读和反馈。",
      "数据回来后重新打开投放决策板。",
    ];
  }
  if (kind === "watch") {
    if (hasCompletedRepairPackageTracking(variant.effectTracking)) {
      return [
        "只投第二轮小样本，不提前放大或放弃。",
        "回填曝光、点击、收藏、追读和编辑反馈。",
        "只验证标题、简介、标签和前三章兑现，不同时改多个变量。",
      ];
    }
    return [
      "再收一轮样本，不提前放大或放弃。",
      "观察点击率是否破 10%、收藏率是否破 3%。",
      "保留对照版本，避免多变量同时修改。",
    ];
  }
  return [
    "暂停该平台首轮投入。",
    "等主平台或相邻平台产生稳定数据后再复盘。",
  ];
}

function decisionTaskDetail(variant: MultiPlatformSubmissionVariant) {
  if (variant.decision.kind !== "repair" || !variant.effectTracking.repairFocus.length) {
    return variant.decision.reason;
  }

  return `${variant.decision.reason} 复盘修复焦点：${variant.effectTracking.repairFocus.join("；")}`;
}

function decisionDispatchStage(kind: MultiPlatformDecisionKind): GatePlatformGrowthDispatchItem["stage"] {
  if (kind === "main" || kind === "scale") return "scale_up";
  if (kind === "watch" || kind === "collect_data") return "record_metrics";
  if (kind === "repair") return "start_repair_packaging";
  if (kind === "prepare_package") return "start_platform_package";
  return "pause_platform";
}

function projectIdFromTaskHref(href: string) {
  const match = href.match(/\/projects\/([^/#?]+)/);
  return match?.[1] ?? null;
}

function decisionDispatchKey(task: MultiPlatformDecisionTask, projectId: string | null) {
  return projectId
    ? `submission-decision:${projectId}:${task.platformId}:${task.kind}`
    : task.id;
}

export function buildMultiPlatformDecisionDispatch(
  task: MultiPlatformDecisionTask,
  options: MultiPlatformDecisionDispatchOptions = {},
): GatePlatformGrowthDispatchItem {
  const projectId = options.projectId ?? projectIdFromTaskHref(task.href);
  const dispatchKey = decisionDispatchKey(task, projectId);
  return {
    id: dispatchKey,
    platformId: task.platformId,
    platformName: task.platformName,
    stage: decisionDispatchStage(task.kind),
    state: "assigned",
    priorityScore: task.priorityScore,
    ownerRole: task.ownerRole,
    title: task.title,
    detail: task.detail,
    dueLabel: task.dueLabel,
    actionLabel: task.actionLabel,
    href: task.href,
    acceptanceCriteria: task.acceptanceCriteria,
    evidence: task.evidence,
    reviewLatestAt: options.reviewLatestAt ?? new Date().toISOString(),
  };
}

function projectHref(projectId: string | undefined, anchor: string) {
  return projectId ? `/projects/${projectId}${anchor}` : anchor;
}

function buildDecisionTasks(variants: MultiPlatformSubmissionVariant[], projectId?: string): MultiPlatformDecisionTask[] {
  return [...variants]
    .filter((variant) => variant.decision.kind !== "pause")
    .sort((left, right) => (
      decisionTaskLaneOrder(left) - decisionTaskLaneOrder(right)
      || right.decision.score - left.decision.score
      || right.fitScore - left.fitScore
    ))
    .slice(0, 5)
    .map((variant) => ({
      id: `submission-decision:${variant.platformId}:${variant.decision.kind}`,
      platformId: variant.platformId,
      platformName: variant.platformName,
      kind: variant.decision.kind,
      ownerRole: decisionOwnerRole(variant.decision.kind),
      priorityScore: variant.decision.score,
      title: `${variant.platformName}｜${variant.decision.label}`,
      detail: decisionTaskDetail(variant),
      dueLabel: decisionDueLabel(variant.decision.kind),
      actionLabel: variant.decision.label === "补投稿包" ? "补齐投稿包" : variant.decision.label,
      href: projectHref(projectId, variant.decision.actionHref),
      acceptanceCriteria: decisionAcceptanceCriteria(variant),
      evidence: variant.decision.evidence,
    }));
}

function buildDecisionBoard(variants: MultiPlatformSubmissionVariant[], projectId?: string): MultiPlatformDecisionBoard {
  const sorted = [...variants].sort((left, right) => (
    right.decision.score - left.decision.score
    || laneOrder(left.decision.kind) - laneOrder(right.decision.kind)
    || right.fitScore - left.fitScore
  ));
  const primary = sorted.find((variant) => variant.decision.kind === "main")
    ?? sorted.find((variant) => variant.decision.kind === "scale")
    ?? sorted.find((variant) => variant.decision.kind === "watch")
    ?? sorted.find((variant) => variant.decision.kind === "collect_data")
    ?? sorted[0]
    ?? null;
  const kinds = Array.from(new Set(variants.map((variant) => variant.decision.kind)))
    .sort((left, right) => laneOrder(left) - laneOrder(right));
  const lanes = kinds.map((kind) => {
    const laneVariants = variants.filter((variant) => variant.decision.kind === kind);
    return {
      kind,
      label: decisionLabel(kind),
      count: laneVariants.length,
      platformIds: laneVariants.map((variant) => variant.platformId),
    };
  });
  const hasMain = variants.some((variant) => variant.decision.kind === "main");
  const hasScale = variants.some((variant) => variant.decision.kind === "scale");
  const hasRepair = variants.some((variant) => variant.decision.kind === "repair" || variant.decision.kind === "prepare_package");
  const tracked = variants.some((variant) => variant.effectTracking.records > 0);
  const status: MultiPlatformDecisionBoard["status"] = hasMain
    ? "main_locked"
    : hasScale
      ? "ready_to_scale"
      : hasRepair
        ? "needs_repair"
        : tracked
          ? "watch"
          : "no_data";
  const headline = status === "main_locked"
    ? `主战场锁定：${primary?.platformName ?? "待确认"}。`
    : status === "ready_to_scale"
      ? `优先加码：${primary?.platformName ?? "待确认"}，但保持小步复测。`
      : status === "needs_repair"
        ? "先修入口或补包，别急着继续铺平台。"
        : status === "watch"
          ? "已有数据但还不够硬，继续观察一轮。"
          : "还没真实数据，先做 1-2 个平台小样本。";
  const nextActions = [
    primary ? `${primary.platformName}：${primary.decision.nextAction}` : "",
    ...sorted
      .filter((variant) => variant.platformId !== primary?.platformId)
      .slice(0, 2)
      .map((variant) => `${variant.platformName}：${variant.decision.nextAction}`),
  ].filter(Boolean);
  const tasks = buildDecisionTasks(variants, projectId);

  return {
    status,
    headline,
    primaryPlatformId: primary?.platformId ?? null,
    primaryPlatformName: primary?.platformName ?? null,
    lanes,
    tasks,
    nextActions,
  };
}

export function buildSinglePlatformSubmissionMarkdown(variant: MultiPlatformSubmissionVariant) {
  return [
    `# ${variant.submissionPackage.title} ${variant.platformName} 投稿包`,
    "",
    `包状态：${variant.packageMatrix.status === "ready" ? "可归档" : "需补齐"}`,
    `适配分：${variant.fitScore}`,
    `建议文件名：${variant.packageMatrix.packageFileName}`,
    `下一步：${variant.packageMatrix.nextAction}`,
    `投放追踪：${variant.effectTracking.label}｜记录 ${variant.effectTracking.records}｜点击率 ${variant.effectTracking.clickRatePercent}%｜收藏率 ${variant.effectTracking.favoriteRatePercent}%｜追读率 ${variant.effectTracking.followRatePercent}%`,
    `追踪下一步：${variant.effectTracking.nextAction}`,
    `投放决策：${variant.decision.label}`,
    `决策动作：${variant.decision.nextAction}`,
    "",
    "## 字段矩阵",
    "",
    "| 字段 | 状态 | 说明 |",
    "| --- | --- | --- |",
    ...variant.packageMatrix.items.map((item) => (
      `| ${markdownTableCell(item.label)} | ${item.status === "ready" ? "已齐" : item.status === "warning" ? "需补强" : "缺失"} | ${markdownTableCell(item.detail)} |`
    )),
    "",
    "## 一句话卖点",
    variant.submissionPackage.logline,
    "",
    "## 简介",
    variant.category === "overseas" ? variant.submissionPackage.overseasSynopsis : variant.submissionPackage.synopsis,
    "",
    "## 标签",
    variant.submissionPackage.tags.join("、"),
    "",
    "## 样章摘要",
    ...variant.submissionPackage.firstThreeSummaries.flatMap((chapter) => [
      "",
      `### 第 ${chapter.order} 章 ${chapter.title}`,
      chapter.summary,
    ]),
    "",
    "## 平台改稿重点",
    ...variant.rewriteFocus.map((focus) => `- ${focus}`),
    "",
    "## 平台风险",
    ...variant.risks.map((risk) => `- ${risk}`),
    "",
    "## 投放追踪证据",
    ...variant.effectTracking.evidence.map((item) => `- ${item}`),
    ...(variant.effectTracking.repairFocus.length
      ? [
        "",
        "## 复盘修复焦点",
        ...variant.effectTracking.repairFocus.map((item) => `- ${item}`),
      ]
      : []),
    "",
    "## 投放决策证据",
    ...variant.decision.evidence.map((item) => `- ${item}`),
    "",
  ].join("\n");
}

export function buildMultiPlatformSubmissionArchive(
  submission: MultiPlatformSubmissionArchiveSource,
  generatedAt: Date | string = new Date(),
): MultiPlatformSubmissionArchive {
  const generatedDate = new Date(generatedAt);
  const generatedText = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(generatedDate);
  const platforms = submission.variants.map((variant) => {
    const blockedFields = variant.packageMatrix.items
      .filter((item) => item.status !== "ready")
      .map((item) => item.label);
    return {
      platformId: variant.platformId,
      platformName: variant.platformName,
      category: variant.category,
      status: variant.packageMatrix.status,
      effectStatus: variant.effectTracking.status,
      effectLabel: variant.effectTracking.label,
      fileName: variant.packageMatrix.packageFileName,
      readyFields: variant.packageMatrix.readyFields,
      totalFields: variant.packageMatrix.totalFields,
      sampleChapterCount: variant.packageMatrix.sampleChapterCount,
      wordCount: variant.packageMatrix.wordCount,
      blockedFields,
      nextAction: variant.packageMatrix.nextAction,
    };
  });
  const readyVariants = submission.variants.filter((variant) => variant.packageMatrix.status === "ready");
  const readyPlatforms = platforms.filter((platform) => platform.status === "ready");
  const deliveryScope = buildSubmissionDeliveryScope(platforms.length);
  const totalSampleChapterCount = readyPlatforms.reduce((sum, platform) => sum + platform.sampleChapterCount, 0);
  const totalWordCount = readyPlatforms.reduce((sum, platform) => sum + platform.wordCount, 0);
  const blockedPlatforms = platforms.filter((platform) => platform.status !== "ready");
  const manifestRows = platforms.map((platform) => [
    platform.platformName,
    platform.status === "ready" ? "可归档" : "需补齐",
    platform.effectLabel,
    `${platform.readyFields}/${platform.totalFields}`,
    String(platform.sampleChapterCount),
    String(platform.wordCount),
    platform.status === "ready" ? platform.fileName : platform.blockedFields.join("、") || "暂无",
  ]);
  const markdown = [
    `# ${submission.title || "未命名项目"} 多平台投稿包归档`,
    "",
    `生成时间：${generatedText}`,
    `平台范围：${deliveryScope.statusLabel}`,
    "扩展平台：不纳入本期投稿包，不再作为待补缺口",
    `可归档平台：${readyPlatforms.length}/${platforms.length}`,
    `归档样章合计：${totalSampleChapterCount}`,
    `归档摘要字数：${totalWordCount}`,
    `投放决策：${submission.decisionBoard.headline}`,
    "",
    "## 投放决策板",
    "",
    `主平台：${submission.decisionBoard.primaryPlatformName ?? "待确认"}`,
    "",
    ...submission.decisionBoard.nextActions.map((action) => `- ${action}`),
    "",
    "## 决策执行单",
    "",
    "| 任务 | 负责人 | 优先级 | 截止 | 入口 |",
    "| --- | --- | ---: | --- | --- |",
    ...submission.decisionBoard.tasks.map((task) => (
      `| ${markdownTableCell(task.title)} | ${task.ownerRole} | ${task.priorityScore} | ${task.dueLabel} | ${task.href} |`
    )),
    "",
    "## 平台清单",
    "",
    "| 平台 | 状态 | 追踪 | 字段 | 样章 | 摘要字数 | 文件/待补字段 |",
    "| --- | --- | --- | ---: | ---: | ---: | --- |",
    ...manifestRows.map((row) => `| ${row.map(markdownTableCell).join(" | ")} |`),
    "",
    "## 已就绪平台投稿包",
    ...(readyVariants.length
      ? readyVariants.flatMap((variant) => [
        "",
        `### ${variant.platformName}`,
        "",
        `建议文件名：${variant.packageMatrix.packageFileName}`,
        "",
        buildSinglePlatformSubmissionMarkdown(variant),
      ])
      : ["", "暂无字段齐备的平台投稿包。"]),
    ...(blockedPlatforms.length
      ? [
        "",
        "## 待补齐平台",
        ...blockedPlatforms.flatMap((platform) => [
          "",
          `### ${platform.platformName}`,
          `待补字段：${platform.blockedFields.join("、") || "暂无"}`,
          `下一步：${platform.nextAction}`,
        ]),
      ]
      : []),
    "",
  ].join("\n");

  return {
    title: submission.title,
    archiveFileName: `${safeFileName(`${submission.title || "未命名项目"}-多平台投稿包归档`)}.md`,
    generatedAt: generatedDate.toISOString(),
    deliveryScope,
    readyCount: readyPlatforms.length,
    blockedCount: platforms.length - readyPlatforms.length,
    totalPlatforms: platforms.length,
    totalSampleChapterCount,
    totalWordCount,
    platforms,
    markdown,
  };
}

export function buildMultiPlatformSubmission(input: MultiPlatformSubmissionInput): MultiPlatformSubmission {
  const variants = platformProfiles
    .map((platform) => buildVariant(input, platform))
    .sort((left, right) => right.fitScore - left.fitScore || left.platformName.localeCompare(right.platformName));
  const readyPlatforms = variants.filter((variant) => variant.packageMatrix.status === "ready").length;
  const effectSummary = buildEffectSummary(variants);
  const decisionBoard = buildDecisionBoard(variants, input.projectId);
  const submission: MultiPlatformSubmissionArchiveSource = {
    title: input.title,
    targetPlatformId: input.targetPlatformId,
    recommendedPlatformId: variants[0]?.platformId ?? input.targetPlatformId,
    variants,
    packageSummary: {
      readyPlatforms,
      needsWorkPlatforms: variants.length - readyPlatforms,
      totalPlatforms: variants.length,
      readyToArchive: readyPlatforms > 0,
    },
    effectSummary,
    decisionBoard,
    markdown: buildMarkdown(input.title, variants),
  };

  return {
    ...submission,
    archive: buildMultiPlatformSubmissionArchive(submission),
  };
}
