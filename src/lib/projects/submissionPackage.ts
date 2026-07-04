import type { PlatformProfile } from "@/lib/platforms/platformProfiles";

export interface SubmissionPackageChapter {
  order: number;
  title: string;
  content: string;
  goal: string;
  hook: string;
  conflict: string;
  cliffhanger: string;
  wordCount: number;
}

export interface SubmissionPackageInput {
  title: string;
  genre: string;
  sellingPoint: string;
  currentWordCount: number;
  targetWordCount: number;
  platform: PlatformProfile;
  chapters: SubmissionPackageChapter[];
}

export interface SubmissionPackage {
  title: string;
  platformId: string;
  platformName: string;
  logline: string;
  synopsis: string;
  overseasSynopsis: string;
  tags: string[];
  sellingPoints: string[];
  firstThreeSummaries: Array<{
    order: number;
    title: string;
    summary: string;
  }>;
  submissionNote: string;
  markdown: string;
}

function compact(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function trimEndingPunctuation(text: string) {
  return text.replace(/[。.!！?？]+$/u, "");
}

function summarizeChapter(chapter: SubmissionPackageChapter) {
  const signals = [
    chapter.goal && `目标：${chapter.goal}`,
    chapter.hook && `钩子：${chapter.hook}`,
    chapter.conflict && `冲突：${chapter.conflict}`,
    chapter.cliffhanger && `悬念：${chapter.cliffhanger}`,
  ].filter(Boolean);
  if (signals.length > 0) return signals.join("；");
  const content = compact(chapter.content);
  return content ? content.slice(0, 160) : "待补充章节摘要。";
}

function buildTags(input: SubmissionPackageInput) {
  const baseTags = [input.genre, ...input.platform.genres.slice(0, 4)];
  return [...new Set(baseTags.map((tag) => tag.trim()).filter(Boolean))].slice(0, 8);
}

function buildSynopsis(input: SubmissionPackageInput) {
  const firstChapter = input.chapters[0];
  const hook = firstChapter?.hook || input.platform.openingRules[0] || "主角被推入不可逆危机";
  const sellingPoint = trimEndingPunctuation(input.sellingPoint || "主角在高压选择中不断翻盘");
  return [
    `${input.title}是一部${input.genre}网文，核心卖点是：${sellingPoint}。`,
    `故事从“${hook}”切入，用连续冲突推动主角进入新的规则和关系网。`,
    `全书面向${input.platform.name}读者，重点满足${input.platform.reviewFocus.join("、")}。`,
  ].join("");
}

function buildOverseasSynopsis(input: SubmissionPackageInput) {
  const firstChapter = input.chapters[0];
  const hook = firstChapter?.hook || input.platform.openingRules[0] || "an irreversible crisis";
  const sellingPoint = trimEndingPunctuation(input.sellingPoint || "a protagonist forced to grow through high-stakes choices");
  return [
    `${input.title} is a ${input.genre} web novel built around ${sellingPoint}. `,
    `The story opens with ${hook}, then escalates through clear choices, conflict, and chapter-end hooks. `,
    `It is positioned for ${input.platform.name}, with emphasis on ${input.platform.reviewFocus.join(", ")}.`,
  ].join("");
}

function buildSubmissionNote(input: SubmissionPackageInput) {
  const lengthLine = `当前 ${input.currentWordCount}/${input.targetWordCount} 字。`;
  const platformLine = `${input.platform.name} 重点：${input.platform.reviewFocus.join("、")}。`;
  const riskLine = `投稿前继续注意：${input.platform.risks.join("、")}。`;
  return `${lengthLine}${platformLine}${riskLine}`;
}

export function buildSubmissionPackage(input: SubmissionPackageInput): SubmissionPackage {
  const tags = buildTags(input);
  const firstThreeSummaries = input.chapters.slice(0, 3).map((chapter) => ({
    order: chapter.order,
    title: chapter.title,
    summary: summarizeChapter(chapter),
  }));
  const logline = input.sellingPoint || `${input.genre}主角用连续选择完成逆袭。`;
  const synopsis = buildSynopsis(input);
  const overseasSynopsis = buildOverseasSynopsis(input);
  const sellingPoints = [
    logline,
    `平台适配：${input.platform.name} · ${input.platform.reviewFocus.slice(0, 3).join("、")}`,
    `开头规则：${input.platform.openingRules.join("；")}`,
  ];
  const submissionNote = buildSubmissionNote(input);
  const markdown = [
    `# ${input.title} 投稿资料`,
    "",
    `## 平台`,
    input.platform.name,
    "",
    "## 一句话卖点",
    logline,
    "",
    "## 中文简介",
    synopsis,
    "",
    "## Overseas Synopsis",
    overseasSynopsis,
    "",
    "## 标签",
    tags.join("、"),
    "",
    "## 前三章摘要",
    ...firstThreeSummaries.flatMap((chapter) => [
      `### 第 ${chapter.order} 章 ${chapter.title}`,
      chapter.summary,
      "",
    ]),
    "## 投稿说明",
    submissionNote,
    "",
  ].join("\n");

  return {
    title: input.title,
    platformId: input.platform.id,
    platformName: input.platform.name,
    logline,
    synopsis,
    overseasSynopsis,
    tags,
    sellingPoints,
    firstThreeSummaries,
    submissionNote,
    markdown,
  };
}
