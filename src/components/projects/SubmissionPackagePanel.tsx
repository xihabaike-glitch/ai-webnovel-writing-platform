"use client";

import { useState } from "react";

interface SubmissionPackageView {
  title: string;
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

export function SubmissionPackagePanel({
  projectId,
  submissionPackage,
}: {
  projectId: string;
  submissionPackage: SubmissionPackageView;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  async function copyMarkdown() {
    await navigator.clipboard.writeText(submissionPackage.markdown);
    setMessage("已复制投稿资料");
  }

  async function downloadMarkdown() {
    setIsDownloading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/submission-package?format=markdown`);
      if (!response.ok) {
        throw new Error("下载投稿资料失败。");
      }
      const markdown = await response.text();
      const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${submissionPackage.title}-投稿资料.md`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "下载投稿资料失败。");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-medium">投稿资料</h2>
          <p className="mt-1 text-sm text-slate-600">{submissionPackage.platformName} · 书名、简介、标签、前三章摘要</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50"
            onClick={copyMarkdown}
            type="button"
          >
            复制全部
          </button>
          <button
            className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            disabled={isDownloading}
            onClick={downloadMarkdown}
            type="button"
          >
            {isDownloading ? "下载中" : "下载 Markdown"}
          </button>
        </div>
      </div>
      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-md bg-slate-50 p-3">
          <div className="text-sm font-medium">一句话卖点</div>
          <p className="mt-2 text-sm text-slate-600">{submissionPackage.logline}</p>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <div className="text-sm font-medium">标签</div>
          <p className="mt-2 text-sm text-slate-600">{submissionPackage.tags.join("、")}</p>
        </div>
      </div>
      <div className="mt-3 rounded-md bg-slate-50 p-3">
        <div className="text-sm font-medium">中文简介</div>
        <p className="mt-2 text-sm leading-6 text-slate-600">{submissionPackage.synopsis}</p>
      </div>
      <div className="mt-3 rounded-md bg-slate-50 p-3">
        <div className="text-sm font-medium">Overseas Synopsis</div>
        <p className="mt-2 text-sm leading-6 text-slate-600">{submissionPackage.overseasSynopsis}</p>
      </div>
      <div className="mt-3 grid gap-2">
        {submissionPackage.firstThreeSummaries.map((chapter) => (
          <div className="rounded-md bg-slate-50 p-3 text-sm" key={`${chapter.order}-${chapter.title}`}>
            <div className="font-medium">
              第 {chapter.order} 章 · {chapter.title}
            </div>
            <p className="mt-1 text-slate-600">{chapter.summary}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
