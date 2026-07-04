import { platformProfiles, type PlatformProfile } from "../platforms/platformProfiles.ts";
import { buildSubmissionChecklist, type SubmissionAiTask, type SubmissionChapter } from "./submissionChecklist.ts";
import { buildSubmissionPackage, type SubmissionPackage, type SubmissionPackageChapter } from "./submissionPackage.ts";

export interface MultiPlatformSubmissionInput {
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
      evidence,
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
    evidence,
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
    packageMatrix: buildPackageMatrix(input.title, platform, submissionPackage),
    effectTracking: buildEffectTracking(platform, input.platformPublishMetrics ?? []),
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
  const totalSampleChapterCount = readyPlatforms.reduce((sum, platform) => sum + platform.sampleChapterCount, 0);
  const totalWordCount = readyPlatforms.reduce((sum, platform) => sum + platform.wordCount, 0);
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
    `可归档平台：${readyPlatforms.length}/${platforms.length}`,
    `归档样章合计：${totalSampleChapterCount}`,
    `归档摘要字数：${totalWordCount}`,
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
    "",
    "## 待补齐平台",
    ...platforms
      .filter((platform) => platform.status !== "ready")
      .flatMap((platform) => [
        "",
        `### ${platform.platformName}`,
        `待补字段：${platform.blockedFields.join("、") || "暂无"}`,
        `下一步：${platform.nextAction}`,
      ]),
    "",
  ].join("\n");

  return {
    title: submission.title,
    archiveFileName: `${safeFileName(`${submission.title || "未命名项目"}-多平台投稿包归档`)}.md`,
    generatedAt: generatedDate.toISOString(),
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
    markdown: buildMarkdown(input.title, variants),
  };

  return {
    ...submission,
    archive: buildMultiPlatformSubmissionArchive(submission),
  };
}
