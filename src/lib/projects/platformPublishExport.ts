import type { PlatformProfile } from "../platforms/platformProfiles.ts";
import { platformProfiles, type PlatformId } from "../platforms/platformProfiles.ts";
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

export interface PlatformPublishExportInput {
  project: PublishExportProject;
  chapters: PublishExportChapter[];
  targetPlatform: PlatformProfile;
  platforms?: PlatformProfile[];
}

export interface PlatformPublishChapter {
  id: string;
  order: number;
  title: string;
  formattedTitle: string;
  wordCount: number;
  status: string;
  ready: boolean;
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

function buildPackageWarnings(platform: PlatformProfile, chapters: PlatformPublishChapter[]) {
  const warnings: string[] = [];
  if (chapters.length === 0) warnings.push("没有可导出的正文章节。");
  if (chapters.some((chapter) => !chapter.ready)) warnings.push("存在未完全就绪章节，发布前先补钩子、正文或章末悬念。");
  if (platform.id === "qidian" && chapters.length < 3) warnings.push("起点投稿建议至少准备前三章和长期主线期待。");
  if (platform.id === "fanqie" && chapters.length < 8) warnings.push("番茄首秀前建议继续储备章节，减少断更风险。");
  if (platform.id === "zhihu_yanxuan" && chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0) < 1000) warnings.push("知乎盐选短篇至少准备 1000 字以上的付费期待。");
  if (platform.category === "overseas") warnings.push("海外平台发布前建议补英文标题、英文简介和英文正文润色。");
  return warnings;
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
    return {
      id: chapter.id,
      order: chapter.order,
      title: chapter.title,
      formattedTitle: titleForPlatform(chapter, platform),
      wordCount: chapter.wordCount,
      status: chapter.status,
      ready: warnings.length === 0 || warnings.every((warning) => warning.includes("海外平台")),
      body: formatBody(chapter, platform),
      warnings,
    };
  });
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
    warnings: buildPackageWarnings(platform, chapters),
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
