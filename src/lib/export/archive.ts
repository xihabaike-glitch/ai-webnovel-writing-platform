import { createStoredZip } from "./zip.ts";
import type { ExportProject } from "./markdown.ts";

function line(value: string | undefined | null, fallback = "未填写") {
  const text = value?.trim();
  return text ? text : fallback;
}

function safePathPart(value: string) {
  const cleaned = value
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "未命名";
}

function sortedChapters(project: ExportProject) {
  return [...project.chapters].sort((a, b) => a.order - b.order);
}

function chapterMarkdown(chapter: ExportProject["chapters"][number]) {
  const cardLines = [
    `- 章节目标：${line(chapter.goal)}`,
    `- 开头钩子：${line(chapter.hook)}`,
    `- 冲突：${line(chapter.conflict)}`,
    `- 价值变化：${line(chapter.valueShift)}`,
    `- 章末悬念：${line(chapter.cliffhanger)}`,
    `- 状态：${line(chapter.status)}`,
    `- 字数：${chapter.wordCount ?? chapter.content.trim().length}`,
  ];

  return [
    `# 第 ${chapter.order} 章 ${chapter.title}`,
    "",
    "## 章节卡",
    "",
    ...cardLines,
    "",
    "## 正文",
    "",
    chapter.content.trim() || "未填写正文。",
    "",
  ].join("\n");
}

function archiveReadme(project: ExportProject, manuscriptChapters: ExportProject["chapters"]) {
  return [
    `# ${project.title} 章节包`,
    "",
    `- 题材：${line(project.genre)}`,
    `- 目标平台：${line(project.targetPlatformName)}`,
    `- 篇幅类型：${line(project.targetLengthType)}`,
    `- 当前字数：${project.currentWordCount ?? 0}`,
    `- 一句话卖点：${line(project.sellingPoint)}`,
    `- 可导出章节：${manuscriptChapters.length}/${project.chapters.length}`,
    "",
    "## 文件说明",
    "",
    "- `chapters/`：按章节顺序拆分的 Markdown 正文和章节卡。",
    "- `README.md`：作品基础信息和导出说明。",
    "",
  ].join("\n");
}

export function exportChapterZip(project: ExportProject) {
  const chapters = sortedChapters(project);
  const manuscriptChapters = chapters.filter((chapter) => chapter.content.trim().length > 0);
  const exportableChapters = manuscriptChapters.length > 0 ? manuscriptChapters : chapters;
  const files = [
    { path: "README.md", content: archiveReadme(project, manuscriptChapters) },
    ...exportableChapters.map((chapter) => ({
      path: `chapters/${String(chapter.order).padStart(3, "0")}-${safePathPart(chapter.title)}.md`,
      content: chapterMarkdown(chapter),
    })),
  ];

  return createStoredZip(files);
}

export function chapterZipContentType() {
  return "application/zip";
}

function csvCell(value: string | number | undefined | null) {
  const text = value === undefined || value === null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function chapterAnchor(chapterId: string | null | undefined, chapters: ExportProject["chapters"]) {
  if (!chapterId) return "";
  const chapter = chapters.find((item) => item.id === chapterId);
  return chapter ? `第 ${chapter.order} 章 ${chapter.title}` : chapterId;
}

export function exportForeshadowCsv(project: ExportProject) {
  const chapters = sortedChapters(project);
  const rows = [
    ["伏笔标题", "状态", "埋设章节", "回收章节", "备注"],
    ...(project.foreshadows ?? []).map((entry) => [
      entry.title,
      entry.status ?? "",
      chapterAnchor(entry.setupChapterId, chapters),
      chapterAnchor(entry.payoffChapterId, chapters),
      entry.notes ?? "",
    ]),
  ];

  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}

export function foreshadowCsvContentType() {
  return "text/csv; charset=utf-8";
}
