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

export interface MultiPlatformSubmissionArchivePlatform {
  platformId: string;
  platformName: string;
  category: PlatformProfile["category"];
  status: "ready" | "needs_work";
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

export function buildSinglePlatformSubmissionMarkdown(variant: MultiPlatformSubmissionVariant) {
  return [
    `# ${variant.submissionPackage.title} ${variant.platformName} 投稿包`,
    "",
    `包状态：${variant.packageMatrix.status === "ready" ? "可归档" : "需补齐"}`,
    `适配分：${variant.fitScore}`,
    `建议文件名：${variant.packageMatrix.packageFileName}`,
    `下一步：${variant.packageMatrix.nextAction}`,
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
    "| 平台 | 状态 | 字段 | 样章 | 摘要字数 | 文件/待补字段 |",
    "| --- | --- | ---: | ---: | ---: | --- |",
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
    markdown: buildMarkdown(input.title, variants),
  };

  return {
    ...submission,
    archive: buildMultiPlatformSubmissionArchive(submission),
  };
}
