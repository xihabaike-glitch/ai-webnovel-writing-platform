import { createHash } from "node:crypto";
import type { ExportPackageReadiness, ExportProject } from "./markdown.ts";

export type ExportSnapshotPackageKind = "full" | "outline" | "characters" | "chapters_zip" | "foreshadows_csv";
export type ExportSnapshotFormat = "markdown" | "docx" | "zip" | "csv";

export interface ExportPackageSnapshotInput {
  projectId: string;
  project: ExportProject;
  packageKind: ExportSnapshotPackageKind;
  format: ExportSnapshotFormat;
  fileName: string;
  contentType: string;
  content: string | Buffer;
  readiness: Pick<ExportPackageReadiness, "status" | "readinessPercent">;
}

export interface ExportPackageSnapshotView {
  id: string;
  packageKind: string;
  packageKindLabel: string;
  format: string;
  formatLabel: string;
  title: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  fileSizeLabel: string;
  contentHash: string;
  readinessStatus: string;
  readinessLabel: string;
  readinessPercent: number;
  chapterCount: number;
  wordCount: number;
  notes: string;
  isBaseline: boolean;
  baselineLockedAt: string | Date | null;
  createdAt: string | Date;
  comparison: ExportPackageSnapshotComparison | null;
  detail: ExportPackageSnapshotDetail;
}

export interface ExportSnapshotTarget {
  packageKind: ExportSnapshotPackageKind;
  format: ExportSnapshotFormat;
}

export interface ExportPackageSnapshotComparison {
  previousId: string;
  previousCreatedAt: string | Date;
  readinessDelta: number;
  chapterDelta: number;
  wordDelta: number;
  fileSizeDelta: number;
  fileSizeDeltaLabel: string;
  contentChanged: boolean;
  status: "improved" | "declined" | "changed" | "same";
  label: string;
}

export interface ExportPackageSnapshotDetail {
  summary: string;
  metadata: string[];
  technical: string[];
  comparison: string[];
  boundary: string;
}

function byteLength(content: string | Buffer) {
  return Buffer.isBuffer(content) ? content.length : Buffer.byteLength(content, "utf8");
}

function hashContent(content: string | Buffer) {
  return createHash("sha256").update(content).digest("hex");
}

function exportedChapterCount(project: ExportProject, packageKind: ExportSnapshotPackageKind) {
  if (packageKind === "outline" || packageKind === "characters" || packageKind === "foreshadows_csv") return 0;
  const manuscriptChapters = project.chapters.filter((chapter) => chapter.content.trim().length > 0);
  return manuscriptChapters.length || project.chapters.length;
}

function exportedWordCount(project: ExportProject, packageKind: ExportSnapshotPackageKind) {
  if (packageKind === "outline" || packageKind === "characters" || packageKind === "foreshadows_csv") return 0;
  return project.currentWordCount ?? project.chapters.reduce((sum, chapter) => sum + (chapter.wordCount ?? chapter.content.trim().length), 0);
}

export function packageKindLabel(kind: string) {
  if (kind === "full") return "完整资料包";
  if (kind === "outline") return "大纲包";
  if (kind === "characters") return "人物伏笔包";
  if (kind === "chapters_zip") return "章节包";
  if (kind === "foreshadows_csv") return "伏笔表";
  return kind;
}

export function formatLabel(format: string) {
  if (format === "markdown") return "Markdown";
  if (format === "docx") return "Word";
  if (format === "zip") return "ZIP";
  if (format === "csv") return "CSV";
  return format;
}

export function readinessLabel(status: string) {
  if (status === "ready") return "可交付";
  if (status === "warning") return "需补强";
  if (status === "blocked") return "不建议交付";
  return status;
}

export function fileSizeLabel(size: number) {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  if (size >= 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${size} B`;
}

function signedDelta(value: number) {
  if (value > 0) return `+${value}`;
  return String(value);
}

function signedFileSizeDelta(value: number) {
  if (value === 0) return "0 B";
  const prefix = value > 0 ? "+" : "-";
  return `${prefix}${fileSizeLabel(Math.abs(value))}`;
}

function timestampLabel(value: string | Date) {
  return value instanceof Date ? value.toISOString() : value;
}

function comparisonStatus(input: Pick<ExportPackageSnapshotComparison, "readinessDelta" | "chapterDelta" | "wordDelta" | "fileSizeDelta" | "contentChanged">): ExportPackageSnapshotComparison["status"] {
  if (input.readinessDelta > 0 || input.chapterDelta > 0 || input.wordDelta > 0) return "improved";
  if (input.readinessDelta < 0 || input.chapterDelta < 0 || input.wordDelta < 0) return "declined";
  if (input.contentChanged || input.fileSizeDelta !== 0) return "changed";
  return "same";
}

function comparisonLabel(comparison: Pick<ExportPackageSnapshotComparison, "readinessDelta" | "chapterDelta" | "wordDelta" | "fileSizeDelta" | "contentChanged" | "status">) {
  if (comparison.status === "same") return "与上次同类导出一致。";
  const parts = [
    comparison.readinessDelta ? `准备度 ${signedDelta(comparison.readinessDelta)}%` : null,
    comparison.chapterDelta ? `章节 ${signedDelta(comparison.chapterDelta)}` : null,
    comparison.wordDelta ? `字数 ${signedDelta(comparison.wordDelta)}` : null,
    comparison.fileSizeDelta ? `文件 ${signedFileSizeDelta(comparison.fileSizeDelta)}` : null,
    comparison.contentChanged ? "内容摘要已变化" : null,
  ].filter(Boolean);
  if (comparison.status === "improved") return `比上次同类导出更完整：${parts.join("，")}。`;
  if (comparison.status === "declined") return `比上次同类导出有回退：${parts.join("，")}。`;
  return `比上次同类导出有变化：${parts.join("，")}。`;
}

export function parseExportSnapshotTarget(packageKind: string, format: string): ExportSnapshotTarget | null {
  if ((packageKind === "full" || packageKind === "outline" || packageKind === "characters") && (format === "markdown" || format === "docx")) {
    return { packageKind, format };
  }
  if (packageKind === "chapters_zip" && format === "zip") return { packageKind, format };
  if (packageKind === "foreshadows_csv" && format === "csv") return { packageKind, format };
  return null;
}

export function regeneratedSnapshotMessage(target: ExportSnapshotTarget) {
  return `已按历史快照重新生成：${packageKindLabel(target.packageKind)} · ${formatLabel(target.format)}。`;
}

export function buildExportSnapshotDetail(snapshot: {
  id: string;
  packageKind: string;
  format: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  contentHash: string;
  readinessStatus: string;
  readinessPercent: number;
  chapterCount: number;
  wordCount: number;
  createdAt: string | Date;
}, comparison: ExportPackageSnapshotComparison | null = null): ExportPackageSnapshotDetail {
  return {
    summary: `${packageKindLabel(snapshot.packageKind)} · ${formatLabel(snapshot.format)} · ${readinessLabel(snapshot.readinessStatus)} · 准备度 ${snapshot.readinessPercent}%`,
    metadata: [
      `文件名：${snapshot.fileName}`,
      `导出时间：${timestampLabel(snapshot.createdAt)}`,
      `章节：${snapshot.chapterCount}`,
      `字数：${snapshot.wordCount}`,
      `文件大小：${fileSizeLabel(snapshot.fileSize)}`,
    ],
    technical: [
      `内容类型：${snapshot.contentType}`,
      `内容摘要：${snapshot.contentHash}`,
      `快照记录：${snapshot.id}`,
    ],
    comparison: comparison ? [
      `上次同类快照：${comparison.previousId}`,
      `上次时间：${timestampLabel(comparison.previousCreatedAt)}`,
      `准备度变化：${signedDelta(comparison.readinessDelta)}%`,
      `章节变化：${signedDelta(comparison.chapterDelta)}`,
      `字数变化：${signedDelta(comparison.wordDelta)}`,
      `文件变化：${comparison.fileSizeDeltaLabel}`,
      `内容摘要：${comparison.contentChanged ? "已变化" : "未变化"}`,
    ] : ["暂无上一次同类导出可对比。"],
    boundary: "快照只保存导出元信息和内容摘要；重新生成会使用当前项目内容，不回放旧稿原文。",
  };
}

export function buildExportPackageSnapshot(input: ExportPackageSnapshotInput) {
  const fileSize = byteLength(input.content);
  return {
    projectId: input.projectId,
    packageKind: input.packageKind,
    format: input.format,
    title: input.project.title,
    fileName: input.fileName,
    contentType: input.contentType,
    fileSize,
    contentHash: hashContent(input.content),
    readinessStatus: input.readiness.status,
    readinessPercent: input.readiness.readinessPercent,
    chapterCount: exportedChapterCount(input.project, input.packageKind),
    wordCount: exportedWordCount(input.project, input.packageKind),
    notes: `${packageKindLabel(input.packageKind)} · ${formatLabel(input.format)} · ${readinessLabel(input.readiness.status)}`,
  };
}

export function exportSnapshotView(snapshot: {
  id: string;
  packageKind: string;
  format: string;
  title: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  contentHash: string;
  readinessStatus: string;
  readinessPercent: number;
  chapterCount: number;
  wordCount: number;
  notes: string;
  isBaseline?: boolean;
  baselineLockedAt?: string | Date | null;
  createdAt: string | Date;
}, comparison: ExportPackageSnapshotComparison | null = null): ExportPackageSnapshotView {
  return {
    ...snapshot,
    isBaseline: snapshot.isBaseline ?? false,
    baselineLockedAt: snapshot.baselineLockedAt ?? null,
    packageKindLabel: packageKindLabel(snapshot.packageKind),
    formatLabel: formatLabel(snapshot.format),
    fileSizeLabel: fileSizeLabel(snapshot.fileSize),
    readinessLabel: readinessLabel(snapshot.readinessStatus),
    comparison,
    detail: buildExportSnapshotDetail(snapshot, comparison),
  };
}

export function buildExportSnapshotHistory(snapshots: Array<{
  id: string;
  packageKind: string;
  format: string;
  title: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  contentHash: string;
  readinessStatus: string;
  readinessPercent: number;
  chapterCount: number;
  wordCount: number;
  notes: string;
  isBaseline?: boolean;
  baselineLockedAt?: string | Date | null;
  createdAt: string | Date;
}>, limit = snapshots.length): ExportPackageSnapshotView[] {
  return snapshots.slice(0, limit).map((snapshot, index) => {
    const previous = snapshots.slice(index + 1).find((item) => item.packageKind === snapshot.packageKind && item.format === snapshot.format);
    if (!previous) return exportSnapshotView(snapshot);

    const base = {
      previousId: previous.id,
      previousCreatedAt: previous.createdAt,
      readinessDelta: snapshot.readinessPercent - previous.readinessPercent,
      chapterDelta: snapshot.chapterCount - previous.chapterCount,
      wordDelta: snapshot.wordCount - previous.wordCount,
      fileSizeDelta: snapshot.fileSize - previous.fileSize,
      fileSizeDeltaLabel: signedFileSizeDelta(snapshot.fileSize - previous.fileSize),
      contentChanged: snapshot.contentHash !== previous.contentHash,
    };
    const status = comparisonStatus(base);
    const comparison = {
      ...base,
      status,
      label: comparisonLabel({ ...base, status }),
    };

    return exportSnapshotView(snapshot, comparison);
  });
}
