"use client";

import { useState } from "react";

export function ExportMarkdownButton({ projectId, title }: { projectId: string; title: string }) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="grid gap-2">
      <button
        className="w-fit rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        disabled={isExporting}
        onClick={exportMarkdown}
        type="button"
      >
        {isExporting ? "导出中" : "导出 Markdown"}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

