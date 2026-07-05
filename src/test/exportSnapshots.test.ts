import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildExportPackageSnapshot, exportSnapshotView, fileSizeLabel, formatLabel, packageKindLabel, parseExportSnapshotTarget, readinessLabel, regeneratedSnapshotMessage } from "../lib/export/snapshots.ts";

describe("export package snapshots", () => {
  const project = {
    title: "夜雨系统",
    currentWordCount: 3000,
    chapters: [
      { order: 2, title: "第二章", content: "她回头。", wordCount: 4 },
      { order: 1, title: "第一章", content: "门开了。", wordCount: 4 },
    ],
  };

  it("builds stable snapshot metadata for a downloaded package", () => {
    const snapshot = buildExportPackageSnapshot({
      projectId: "project-1",
      project,
      packageKind: "full",
      format: "markdown",
      fileName: "夜雨系统-完整资料包.md",
      contentType: "text/markdown; charset=utf-8",
      content: "# 夜雨系统\n\n正文",
      readiness: { status: "warning", readinessPercent: 71 },
    });

    assert.equal(snapshot.projectId, "project-1");
    assert.equal(snapshot.packageKind, "full");
    assert.equal(snapshot.format, "markdown");
    assert.equal(snapshot.fileSize, Buffer.byteLength("# 夜雨系统\n\n正文", "utf8"));
    assert.equal(snapshot.contentHash.length, 64);
    assert.equal(snapshot.chapterCount, 2);
    assert.equal(snapshot.wordCount, 3000);
    assert.match(snapshot.notes, /完整资料包 · Markdown · 需补强/);
  });

  it("does not count manuscript words for structure-only exports", () => {
    const snapshot = buildExportPackageSnapshot({
      projectId: "project-1",
      project,
      packageKind: "outline",
      format: "docx",
      fileName: "夜雨系统-大纲包.docx",
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      content: Buffer.from("docx"),
      readiness: { status: "ready", readinessPercent: 100 },
    });

    assert.equal(snapshot.chapterCount, 0);
    assert.equal(snapshot.wordCount, 0);
  });

  it("maps snapshot records to author-facing labels", () => {
    const view = exportSnapshotView({
      id: "snapshot-1",
      packageKind: "foreshadows_csv",
      format: "csv",
      title: "夜雨系统",
      fileName: "夜雨系统-伏笔表.csv",
      contentType: "text/csv; charset=utf-8",
      fileSize: 2048,
      contentHash: "a".repeat(64),
      readinessStatus: "blocked",
      readinessPercent: 42,
      chapterCount: 0,
      wordCount: 0,
      notes: "",
      createdAt: "2026-07-05T00:00:00.000Z",
    });

    assert.equal(view.packageKindLabel, "伏笔表");
    assert.equal(view.formatLabel, "CSV");
    assert.equal(view.fileSizeLabel, "2.0 KB");
    assert.equal(view.readinessLabel, "不建议交付");
  });

  it("keeps label helpers explicit", () => {
    assert.equal(packageKindLabel("chapters_zip"), "章节包");
    assert.equal(formatLabel("docx"), "Word");
    assert.equal(readinessLabel("ready"), "可交付");
    assert.equal(fileSizeLabel(900), "900 B");
  });

  it("parses regeneratable snapshot targets strictly", () => {
    assert.deepEqual(parseExportSnapshotTarget("full", "markdown"), { packageKind: "full", format: "markdown" });
    assert.deepEqual(parseExportSnapshotTarget("outline", "docx"), { packageKind: "outline", format: "docx" });
    assert.deepEqual(parseExportSnapshotTarget("chapters_zip", "zip"), { packageKind: "chapters_zip", format: "zip" });
    assert.deepEqual(parseExportSnapshotTarget("foreshadows_csv", "csv"), { packageKind: "foreshadows_csv", format: "csv" });
    assert.equal(parseExportSnapshotTarget("chapters_zip", "docx"), null);
    assert.equal(parseExportSnapshotTarget("full", "zip"), null);
  });

  it("describes regenerated snapshot downloads", () => {
    assert.equal(
      regeneratedSnapshotMessage({ packageKind: "characters", format: "docx" }),
      "已按历史快照重新生成：人物伏笔包 · Word。",
    );
  });
});
