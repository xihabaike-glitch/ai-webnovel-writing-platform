"use client";

import { useState } from "react";
import type { ExportMarkdownMode, ExportPackageReadiness } from "@/lib/export/markdown";
import type { ExportPackageSnapshotView } from "@/lib/export/snapshots";

type ExportFormat = "markdown" | "docx";
type ExportSingleFile = "chaptersZip" | "foreshadowsCsv";

function statusClass(status: ExportPackageReadiness["status"]) {
  if (status === "ready") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "warning") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-rose-200 bg-rose-50 text-rose-800";
}

function itemClass(status: ExportPackageReadiness["items"][number]["status"]) {
  if (status === "pass") return "bg-emerald-50 text-emerald-800";
  if (status === "risk") return "bg-amber-50 text-amber-800";
  return "bg-rose-50 text-rose-800";
}

function comparisonClass(status: NonNullable<ExportPackageSnapshotView["comparison"]>["status"]) {
  if (status === "improved") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "declined") return "border-rose-200 bg-rose-50 text-rose-800";
  if (status === "changed") return "border-sky-200 bg-sky-50 text-sky-800";
  return "border-slate-200 bg-white text-slate-600";
}

export function ExportMarkdownButton({
  projectId,
  readiness,
  title,
  snapshots,
}: {
  projectId: string;
  readiness: ExportPackageReadiness;
  title: string;
  snapshots: ExportPackageSnapshotView[];
}) {
  const [exporting, setExporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const openItems = readiness.items.filter((item) => item.status !== "pass").slice(0, 4);

  function modeSuffix(mode: ExportMarkdownMode) {
    return mode === "outline" ? "大纲包" : mode === "characters" ? "人物伏笔包" : "完整资料包";
  }

  function isExporting(format: ExportFormat, mode: ExportMarkdownMode) {
    return exporting === `${format}:${mode}`;
  }

  async function exportPackage(format: ExportFormat, mode: ExportMarkdownMode) {
    setExporting(`${format}:${mode}`);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/export/${format === "docx" ? "docx" : "markdown"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, mode }),
      });

      if (!response.ok) {
        throw new Error("导出失败，请稍后重试。");
      }

      const extension = format === "docx" ? "docx" : "md";
      const content = format === "docx" ? await response.blob() : new Blob([await response.text()], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${title}-${modeSuffix(mode)}.${extension}`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage("已下载，并保存一条导出快照。刷新后可在历史里查看。");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "导出失败。");
    } finally {
      setExporting(null);
    }
  }

  async function exportSingleFile(kind: ExportSingleFile) {
    setExporting(kind);
    setError(null);
    setMessage(null);
    try {
      const endpoint = kind === "chaptersZip" ? "chapters-zip" : "foreshadows-csv";
      const response = await fetch(`/api/export/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        throw new Error("导出失败，请稍后重试。");
      }

      const content = await response.blob();
      const extension = kind === "chaptersZip" ? "zip" : "csv";
      const suffix = kind === "chaptersZip" ? "章节包" : "伏笔表";
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${title}-${suffix}.${extension}`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage("已下载，并保存一条导出快照。刷新后可在历史里查看。");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "导出失败。");
    } finally {
      setExporting(null);
    }
  }

  async function regenerateSnapshot(snapshot: ExportPackageSnapshotView) {
    setExporting(`snapshot:${snapshot.id}`);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/export/snapshots/${snapshot.id}/download`);

      if (!response.ok) {
        throw new Error("重新生成失败，请稍后重试。");
      }

      const content = await response.blob();
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = snapshot.fileName;
      link.click();
      URL.revokeObjectURL(url);
      setMessage(`已按快照重新生成 ${snapshot.packageKindLabel} · ${snapshot.formatLabel}。刷新后可看到新的记录。`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "重新生成失败。");
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="grid gap-3">
      <div className={`rounded-md border px-3 py-2 text-sm ${statusClass(readiness.status)}`}>
        <div className="flex items-center justify-between gap-3">
          <span className="font-medium">{readiness.label}</span>
          <span>{readiness.readinessPercent}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded bg-white/70">
          <div className="h-full bg-current" style={{ width: `${readiness.readinessPercent}%` }} />
        </div>
        <p className="mt-2 text-xs leading-5 opacity-90">{readiness.nextAction}</p>
      </div>
      <div className="grid gap-2 text-xs">
        {readiness.items.map((item) => (
          <div className={`rounded-md px-2 py-1.5 ${itemClass(item.status)}`} key={item.id} title={item.detail}>
            <span className="font-medium">{item.label}</span>
            <span className="ml-2 opacity-80">{item.status === "pass" ? "已齐" : item.status === "risk" ? "补强" : "缺口"}</span>
          </div>
        ))}
      </div>
      {openItems.length ? (
        <div className="rounded-md bg-slate-50 p-3 text-xs leading-5 text-slate-600">
          {openItems.map((item) => (
            <div key={item.id}>
              <span className="font-medium text-slate-900">{item.label}：</span>{item.detail}
            </div>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          disabled={exporting !== null}
          onClick={() => void exportPackage("markdown", "full")}
          type="button"
        >
          {isExporting("markdown", "full") ? "导出中" : "完整资料包"}
        </button>
        <button
          className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          disabled={exporting !== null}
          onClick={() => void exportPackage("markdown", "outline")}
          type="button"
        >
          {isExporting("markdown", "outline") ? "导出中" : "只导出大纲"}
        </button>
        <button
          className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          disabled={exporting !== null}
          onClick={() => void exportPackage("markdown", "characters")}
          type="button"
        >
          {isExporting("markdown", "characters") ? "导出中" : "人物伏笔包"}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-md border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-white disabled:opacity-50"
          disabled={exporting !== null}
          onClick={() => void exportPackage("docx", "full")}
          type="button"
        >
          {isExporting("docx", "full") ? "导出中" : "完整 Word"}
        </button>
        <button
          className="rounded-md border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-white disabled:opacity-50"
          disabled={exporting !== null}
          onClick={() => void exportPackage("docx", "outline")}
          type="button"
        >
          {isExporting("docx", "outline") ? "导出中" : "大纲 Word"}
        </button>
        <button
          className="rounded-md border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-white disabled:opacity-50"
          disabled={exporting !== null}
          onClick={() => void exportPackage("docx", "characters")}
          type="button"
        >
          {isExporting("docx", "characters") ? "导出中" : "人物伏笔 Word"}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          disabled={exporting !== null}
          onClick={() => void exportSingleFile("chaptersZip")}
          type="button"
        >
          {exporting === "chaptersZip" ? "导出中" : "章节 ZIP"}
        </button>
        <button
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          disabled={exporting !== null}
          onClick={() => void exportSingleFile("foreshadowsCsv")}
          type="button"
        >
          {exporting === "foreshadowsCsv" ? "导出中" : "伏笔 CSV"}
        </button>
      </div>
      {snapshots.length ? (
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-medium text-slate-950">最近导出快照</div>
            <div className="text-xs text-slate-500">{snapshots.length} 条</div>
          </div>
          <div className="mt-3 grid gap-2">
            {snapshots.map((snapshot) => (
              <div className="rounded-md bg-slate-50 p-2 text-xs leading-5 text-slate-600" key={snapshot.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-slate-950">{snapshot.packageKindLabel} · {snapshot.formatLabel}</span>
                  <span>{new Date(snapshot.createdAt).toLocaleString("zh-CN")}</span>
                </div>
                <div className="mt-1">
                  {snapshot.fileName} · {snapshot.fileSizeLabel} · 准备度 {snapshot.readinessPercent}% · {snapshot.readinessLabel}
                </div>
                <div className="mt-1 text-slate-500">
                  章节 {snapshot.chapterCount} · 字数 {snapshot.wordCount} · 摘要 {snapshot.contentHash.slice(0, 10)}
                </div>
                {snapshot.comparison ? (
                  <div className={`mt-2 rounded-md border px-2 py-1.5 ${comparisonClass(snapshot.comparison.status)}`}>
                    <div>{snapshot.comparison.label}</div>
                    <div className="mt-1 opacity-80">
                      准备度 {snapshot.comparison.readinessDelta > 0 ? "+" : ""}{snapshot.comparison.readinessDelta}% ·
                      章节 {snapshot.comparison.chapterDelta > 0 ? "+" : ""}{snapshot.comparison.chapterDelta} ·
                      字数 {snapshot.comparison.wordDelta > 0 ? "+" : ""}{snapshot.comparison.wordDelta} ·
                      文件 {snapshot.comparison.fileSizeDeltaLabel}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-slate-500">
                    暂无上一次同类导出可对比。
                  </div>
                )}
                <button
                  className="mt-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  disabled={exporting !== null}
                  onClick={() => void regenerateSnapshot(snapshot)}
                  type="button"
                >
                  {exporting === `snapshot:${snapshot.id}` ? "生成中" : "重新生成"}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="rounded-md bg-slate-50 p-3 text-xs text-slate-600">还没有导出快照。下载任一资料包后会自动留下记录。</p>
      )}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
