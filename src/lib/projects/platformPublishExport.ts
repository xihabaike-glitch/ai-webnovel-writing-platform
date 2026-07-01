import type { PlatformProfile } from "../platforms/platformProfiles.ts";
import { platformProfiles, type PlatformId } from "../platforms/platformProfiles.ts";
import type { SubmissionChecklist } from "./submissionChecklist.ts";
import { buildSubmissionPackage, type SubmissionPackage, type SubmissionPackageChapter } from "./submissionPackage.ts";

export interface PublishExportProject {
  title: string;
  genre: string;
  sellingPoint: string;
  currentWordCount: number;
  targetWordCount: number;
}

export interface PublishExportChapter extends SubmissionPackageChapter {
  id: string;
  status: string;
}

export interface PublishExportAiTask {
  chapterId: string | null;
  taskType: string;
  status: string;
  outputText: string | null;
  createdAt: Date | string;
}

export interface PlatformPublishExportInput {
  project: PublishExportProject;
  chapters: PublishExportChapter[];
  aiTasks?: PublishExportAiTask[];
  submissionChecklist?: SubmissionChecklist;
  targetPlatform: PlatformProfile;
  platforms?: PlatformProfile[];
}

export interface PublishPreflight {
  score: number;
  canExport: boolean;
  passed: string[];
  blocked: string[];
  warnings: string[];
}

export interface PlatformPublishChapter {
  id: string;
  order: number;
  title: string;
  formattedTitle: string;
  wordCount: number;
  status: string;
  ready: boolean;
  preflight: PublishPreflight;
  body: string;
  warnings: string[];
}

export interface PlatformPublishPackage {
  platformId: PlatformId;
  platformName: string;
  category: PlatformProfile["category"];
  title: string;
  logline: string;
  synopsis: string;
  tags: string[];
  publishNote: string;
  chapters: PlatformPublishChapter[];
  preflight: PublishPreflight;
  canExport: boolean;
  warnings: string[];
  markdown: string;
}

export interface PlatformPublishExportCenter {
  packages: PlatformPublishPackage[];
  recommendedPlatformId: PlatformId;
  totalPublishableChapters: number;
}

function compact(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function latestTask(tasks: PublishExportAiTask[], chapterId: string, taskType: string) {
  return tasks
    .filter((task) => task.chapterId === chapterId && task.taskType === taskType)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0];
}

function parseReviewDecision(task: PublishExportAiTask | undefined) {
  if (!task || task.status !== "succeeded" || !task.outputText) return null;
  try {
    const parsed = JSON.parse(task.outputText) as { score?: number; shouldSecondPass?: boolean };
    const score = typeof parsed.score === "number" ? parsed.score : null;
    const shouldSecondPass = typeof parsed.shouldSecondPass === "boolean"
      ? parsed.shouldSecondPass
      : score === null || score < 85;
    return { score, shouldSecondPass };
  } catch {
    return null;
  }
}

function preflightScore(blocked: string[], warnings: string[]) {
  return Math.max(0, Math.min(100, 100 - blocked.length * 22 - warnings.length * 6));
}

function publishableChapters(chapters: PublishExportChapter[]) {
  return chapters
    .filter((chapter) => compact(chapter.content).length > 0)
    .sort((left, right) => left.order - right.order || left.title.localeCompare(right.title));
}

function titleForPlatform(chapter: PublishExportChapter, platform: PlatformProfile) {
  if (platform.category === "overseas") return `Chapter ${chapter.order}: ${chapter.title}`;
  if (platform.id === "zhihu_yanxuan") return `${chapter.title}`;
  return `第 ${chapter.order} 章 ${chapter.title}`;
}

function formatBody(chapter: PublishExportChapter, platform: PlatformProfile) {
  const body = chapter.content.trim();
  if (platform.category === "overseas") {
    return [
      titleForPlatform(chapter, platform),
      "",
      body,
      "",
      `Author note: This chapter is positioned around ${platform.reviewFocus.slice(0, 3).join(", ")}.`,
    ].join("\n");
  }
  if (platform.id === "zhihu_yanxuan") {
    return [
      titleForPlatform(chapter, platform),
      "",
      body,
      "",
      "付费期待：本章结尾必须留下反转或情绪回收问题。",
    ].join("\n");
  }
  return [
    titleForPlatform(chapter, platform),
    "",
    body,
    "",
    `章末检查：${chapter.cliffhanger || platform.reviewFocus[0] || "保留追读问题"}`,
  ].join("\n");
}

function chapterWarnings(chapter: PublishExportChapter, platform: PlatformProfile) {
  const warnings: string[] = [];
  if (chapter.wordCount <= 0) warnings.push("正文为空。");
  if (!chapter.hook.trim()) warnings.push("缺少开头钩子。");
  if (!chapter.cliffhanger.trim()) warnings.push("缺少章末悬念。");
  if (platform.category === "free" && chapter.wordCount < 1200) warnings.push("免费平台章节偏短，可能影响节奏和广告收益。");
  if (platform.category === "paid" && chapter.wordCount < 2000) warnings.push("付费订阅平台章节偏短，建议补足信息量。");
  if (platform.category === "overseas" && /[。！？]/.test(chapter.content)) warnings.push("海外平台发布前建议人工英文化，不要直接硬翻。");
  return warnings;
}

function buildChapterPreflight(
  chapter: PublishExportChapter,
  platform: PlatformProfile,
  tasks: PublishExportAiTask[],
  warnings: string[],
): PublishPreflight {
  const blocked: string[] = [];
  const passed: string[] = [];
  const softWarnings = [...warnings];
  const reviewDecision = parseReviewDecision(latestTask(tasks, chapter.id, "chapter_review"));

  if (compact(chapter.content).length > 0 && chapter.wordCount > 0) passed.push("正文已生成");
  else blocked.push("正文为空，不能发布。");
  if (chapter.hook.trim()) passed.push("开头钩子已填写");
  else blocked.push("缺少开头钩子。");
  if (chapter.cliffhanger.trim()) passed.push("章末悬念已填写");
  else blocked.push("缺少章末悬念。");
  if (reviewDecision && !reviewDecision.shouldSecondPass) {
    passed.push(`最新平台复检 ${reviewDecision.score ?? "--"} 分`);
  } else if (reviewDecision?.shouldSecondPass) {
    blocked.push(`最新平台复检 ${reviewDecision.score ?? "--"} 分，仍要求二改。`);
  } else {
    blocked.push("缺少通过的审稿/复检记录。");
  }
  if (platform.category === "overseas") softWarnings.push("海外平台发布前建议人工英文化终稿。");

  return {
    score: preflightScore(blocked, softWarnings),
    canExport: blocked.length === 0,
    passed,
    blocked,
    warnings: softWarnings,
  };
}

function buildPublishNote(platform: PlatformProfile, submissionPackage: SubmissionPackage) {
  if (platform.category === "overseas") {
    return [
      `Use the overseas synopsis first: ${submissionPackage.overseasSynopsis}`,
      `Focus before posting: ${platform.reviewFocus.join(", ")}.`,
      `Risk check: ${platform.risks.join(", ")}.`,
    ].join("\n");
  }
  return [
    `发布前先核对：${platform.reviewFocus.join("、")}。`,
    `平台风险：${platform.risks.join("、")}。`,
    `简介建议：${submissionPackage.synopsis}`,
  ].join("\n");
}

function buildPackageWarnings(platform: PlatformProfile, chapters: PlatformPublishChapter[], checklist?: SubmissionChecklist) {
  const warnings: string[] = [];
  if (chapters.length === 0) warnings.push("没有可导出的正文章节。");
  if (chapters.some((chapter) => !chapter.ready)) warnings.push("存在未完全就绪章节，发布前先补钩子、正文或章末悬念。");
  if (checklist && checklist.readinessPercent < 80) warnings.push(`投稿资料准备度 ${checklist.readinessPercent}%，低于发布门槛。`);
  if (platform.id === "qidian" && chapters.length < 3) warnings.push("起点投稿建议至少准备前三章和长期主线期待。");
  if (platform.id === "fanqie" && chapters.length < 8) warnings.push("番茄首秀前建议继续储备章节，减少断更风险。");
  if (platform.id === "zhihu_yanxuan" && chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0) < 1000) warnings.push("知乎盐选短篇至少准备 1000 字以上的付费期待。");
  if (platform.category === "overseas") warnings.push("海外平台发布前建议补英文标题、英文简介和英文正文润色。");
  return warnings;
}

function buildPackagePreflight(chapters: PlatformPublishChapter[], warnings: string[], checklist?: SubmissionChecklist): PublishPreflight {
  const blocked: string[] = [];
  const passed: string[] = [];

  if (chapters.length > 0) passed.push(`已准备 ${chapters.length} 章正文`);
  else blocked.push("没有可导出的正文章节。");
  const blockedChapters = chapters.filter((chapter) => !chapter.preflight.canExport);
  if (blockedChapters.length === 0 && chapters.length > 0) passed.push("全部章节通过发布前质检");
  if (blockedChapters.length > 0) blocked.push(`${blockedChapters.length} 章未通过发布前质检。`);
  if (checklist) {
    if (checklist.readinessPercent >= 80) passed.push(`投稿资料准备度 ${checklist.readinessPercent}%`);
    else blocked.push(`投稿资料准备度 ${checklist.readinessPercent}%，低于 80%。`);
  }

  return {
    score: preflightScore(blocked, warnings),
    canExport: blocked.length === 0,
    passed,
    blocked,
    warnings,
  };
}

function buildMarkdown(pack: Omit<PlatformPublishPackage, "markdown">) {
  return [
    `# ${pack.platformName} 发布包`,
    "",
    "## 书名",
    pack.title,
    "",
    "## 一句话卖点",
    pack.logline,
    "",
    "## 简介",
    pack.synopsis,
    "",
    "## 标签",
    pack.tags.join("、"),
    "",
    "## 发布说明",
    pack.publishNote,
    "",
    "## 发布前质检",
    `质检分：${pack.preflight.score}`,
    `导出状态：${pack.canExport ? "允许导出" : "暂不允许导出"}`,
    ...(pack.preflight.blocked.length ? pack.preflight.blocked.map((item) => `- 阻塞：${item}`) : ["- 阻塞：无"]),
    ...(pack.preflight.warnings.length ? pack.preflight.warnings.map((item) => `- 提醒：${item}`) : ["- 提醒：无"]),
    "",
    "## 风险提醒",
    ...(pack.warnings.length ? pack.warnings.map((warning) => `- ${warning}`) : ["- 暂无明显风险。"]),
    "",
    "## 章节正文",
    ...pack.chapters.flatMap((chapter) => [
      `### ${chapter.formattedTitle}`,
      "",
      chapter.body,
      "",
      chapter.warnings.length ? `章节风险：${chapter.warnings.join("；")}` : "章节风险：暂无明显风险。",
      "",
    ]),
  ].join("\n");
}

function buildPlatformPackage(
  input: PlatformPublishExportInput,
  platform: PlatformProfile,
): PlatformPublishPackage {
  const submissionPackage = buildSubmissionPackage({
    title: input.project.title,
    genre: input.project.genre,
    sellingPoint: input.project.sellingPoint,
    currentWordCount: input.project.currentWordCount,
    targetWordCount: input.project.targetWordCount,
    platform,
    chapters: input.chapters,
  });
  const chapters = publishableChapters(input.chapters).map((chapter) => {
    const warnings = chapterWarnings(chapter, platform);
    const preflight = buildChapterPreflight(chapter, platform, input.aiTasks ?? [], warnings);
    return {
      id: chapter.id,
      order: chapter.order,
      title: chapter.title,
      formattedTitle: titleForPlatform(chapter, platform),
      wordCount: chapter.wordCount,
      status: chapter.status,
      ready: preflight.canExport,
      preflight,
      body: formatBody(chapter, platform),
      warnings,
    };
  });
  const warnings = buildPackageWarnings(platform, chapters, input.submissionChecklist);
  const preflight = buildPackagePreflight(chapters, warnings, input.submissionChecklist);
  const packWithoutMarkdown = {
    platformId: platform.id,
    platformName: platform.name,
    category: platform.category,
    title: input.project.title,
    logline: submissionPackage.logline,
    synopsis: platform.category === "overseas" ? submissionPackage.overseasSynopsis : submissionPackage.synopsis,
    tags: submissionPackage.tags,
    publishNote: buildPublishNote(platform, submissionPackage),
    chapters,
    preflight,
    canExport: preflight.canExport,
    warnings,
  };

  return {
    ...packWithoutMarkdown,
    markdown: buildMarkdown(packWithoutMarkdown),
  };
}

export function buildPlatformPublishExportCenter(input: PlatformPublishExportInput): PlatformPublishExportCenter {
  const platforms = input.platforms ?? platformProfiles;
  const packages = platforms.map((platform) => buildPlatformPackage(input, platform));

  return {
    packages,
    recommendedPlatformId: input.targetPlatform.id,
    totalPublishableChapters: publishableChapters(input.chapters).length,
  };
}
