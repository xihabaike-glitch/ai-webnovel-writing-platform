"use client";

import { useState } from "react";
import type { ExportPackageReadiness } from "@/lib/export/markdown";

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

export function ExportMarkdownButton({
  projectId,
  readiness,
  title,
}: {
  projectId: string;
  readiness: ExportPackageReadiness;
  title: string;
}) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const openItems = readiness.items.filter((item) => item.status !== "pass").slice(0, 4);

  async function exportMarkdown() {
    setIsExporting(true);
    setError(null);
    try {
      const response = await fetch("/api/export/markdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        throw new Error("导出失败，请稍后重试。");
      }

      const markdown = await response.text();
      const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${title}.md`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "导出失败。");
    } finally {
      setIsExporting(false);
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
      <button
        className="w-fit rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        disabled={isExporting}
        onClick={exportMarkdown}
        type="button"
      >
        {isExporting ? "导出中" : "导出完整资料包"}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
