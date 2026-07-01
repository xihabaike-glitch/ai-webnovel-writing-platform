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
}

export interface MultiPlatformSubmission {
  title: string;
  targetPlatformId: string;
  recommendedPlatformId: string;
  variants: MultiPlatformSubmissionVariant[];
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
      "重写重点：",
      ...variant.rewriteFocus.map((focus) => `- ${focus}`),
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

export function buildMultiPlatformSubmission(input: MultiPlatformSubmissionInput): MultiPlatformSubmission {
  const variants = platformProfiles
    .map((platform) => buildVariant(input, platform))
    .sort((left, right) => right.fitScore - left.fitScore || left.platformName.localeCompare(right.platformName));

  return {
    title: input.title,
    targetPlatformId: input.targetPlatformId,
    recommendedPlatformId: variants[0]?.platformId ?? input.targetPlatformId,
    variants,
    markdown: buildMarkdown(input.title, variants),
  };
}
