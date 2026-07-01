"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type PublishRepairActionKind =
  | "edit_chapter"
  | "run_chapter_review"
  | "run_second_pass"
  | "open_submission_package"
  | "add_publish_chapters";

interface PublishRepairAction {
  id: string;
  kind: PublishRepairActionKind;
  priority: "high" | "medium" | "low";
  label: string;
  detail: string;
  chapterId?: string;
  chapterTitle?: string;
}

interface PublishPreflight {
  score: number;
  canExport: boolean;
  passed: string[];
  blocked: string[];
  warnings: string[];
  repairActions: PublishRepairAction[];
}

interface PlatformPublishChapter {
  id: string;
  order: number;
  title: string;
  formattedTitle: string;
  wordCount: number;
  status: string;
  ready: boolean;
  preflight: PublishPreflight;
  repairActions: PublishRepairAction[];
  body: string;
  warnings: string[];
}

interface PlatformPublishPackage {
  platformId: string;
  platformName: string;
  category: string;
  title: string;
  logline: string;
  synopsis: string;
  tags: string[];
  publishNote: string;
  chapters: PlatformPublishChapter[];
  preflight: PublishPreflight;
  canExport: boolean;
  repairActions: PublishRepairAction[];
  warnings: string[];
  markdown: string;
}

interface PlatformPublishExportCenter {
  packages: PlatformPublishPackage[];
  recommendedPlatformId: string;
  totalPublishableChapters: number;
}

function actionHref(projectId: string, action: PublishRepairAction) {
  if (action.kind === "open_submission_package") return `/projects/${projectId}#submission-package`;
  if (action.kind === "add_publish_chapters") return `/projects/${projectId}#create-chapter`;
  if (action.kind === "run_second_pass" && action.chapterId) {
    return `/projects/${projectId}/chapters/${action.chapterId}#chapter-second-pass`;
  }
  if (action.kind === "run_chapter_review" && action.chapterId) {
    return `/projects/${projectId}/chapters/${action.chapterId}#chapter-workflow`;
  }
  if (action.chapterId) return `/projects/${projectId}/chapters/${action.chapterId}#chapter-editor`;
  return `/projects/${projectId}`;
}

export function PlatformExportCenterPanel({ projectId }: { projectId: string }) {
  const [center, setCenter] = useState<PlatformPublishExportCenter | null>(null);
  const [selectedPlatformId, setSelectedPlatformId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const selectedPackage = useMemo(
    () => center?.packages.find((pack) => pack.platformId === selectedPlatformId) ?? center?.packages[0] ?? null,
    [center, selectedPlatformId],
  );

  async function loadCenter() {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/platform-export`);
      if (!response.ok) {
        throw new Error("读取平台发布包失败。");
      }
      const payload = (await response.json()) as { center: PlatformPublishExportCenter };
      setCenter(payload.center);
      setSelectedPlatformId((current) => current || payload.center.recommendedPlatformId);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "读取平台发布包失败。");
    } finally {
      setIsLoading(false);
    }
  }

  async function copyMarkdown() {
    if (!selectedPackage) return;
    if (!selectedPackage.canExport) {
      setMessage("发布前质检未通过，先处理阻塞项。");
      return;
    }
    await navigator.clipboard.writeText(selectedPackage.markdown);
    setMessage(`已复制 ${selectedPackage.platformName} 发布包`);
  }

  async function downloadMarkdown() {
    if (!selectedPackage) return;
    if (!selectedPackage.canExport) {
      setMessage("发布前质检未通过，暂不允许下载发布包。");
      return;
    }
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/platform-export?platformId=${selectedPackage.platformId}&format=markdown`);
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? "下载发布包失败。");
      }
      const markdown = await response.text();
      const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${selectedPackage.title}-${selectedPackage.platformName}-发布包.md`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage(`已下载 ${selectedPackage.platformName} 发布包`);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "下载发布包失败。");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadCenter();
  }, [projectId]);

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-medium">平台发布适配与导出中心</h2>
          <p className="mt-1 text-sm text-slate-600">按不同平台整理标题、简介、标签、正文格式和发布提醒，支持复制或下载 Markdown。</p>
        </div>
        <button
          className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          disabled={isLoading}
          onClick={loadCenter}
          type="button"
        >
          {isLoading ? "读取中" : "刷新发布包"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[220px_1fr_auto]">
        <label className="grid gap-1 text-sm text-slate-600">
          发布平台
          <select
            className="rounded-md border border-slate-200 px-3 py-2"
            onChange={(event) => setSelectedPlatformId(event.target.value)}
            value={selectedPlatformId}
          >
            {center?.packages.map((pack) => (
              <option key={pack.platformId} value={pack.platformId}>{pack.platformName}</option>
            ))}
          </select>
        </label>
        <div className="rounded-md bg-slate-50 p-3">
          <div className="text-xs text-slate-500">可导出章节</div>
          <div className="mt-1 text-2xl font-semibold text-slate-950">{center?.totalPublishableChapters ?? 0}</div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <button
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            disabled={!selectedPackage || !selectedPackage.canExport}
            onClick={copyMarkdown}
            type="button"
          >
            复制发布包
          </button>
          <button
            className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            disabled={!selectedPackage || !selectedPackage.canExport || isLoading}
            onClick={downloadMarkdown}
            type="button"
          >
            下载发布包
          </button>
        </div>
      </div>

      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}

      {selectedPackage ? (
        <div className="mt-4 grid gap-4">
          <div className="rounded-md border border-slate-200 p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="font-medium text-slate-950">发布前质检</div>
                <p className="mt-1 text-sm text-slate-600">
                  {selectedPackage.canExport ? "允许导出" : "暂不允许导出"} · 质检分 {selectedPackage.preflight.score}
                </p>
              </div>
              <div className={`w-fit rounded-md px-2 py-1 text-xs font-medium ${
                selectedPackage.canExport ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
              }`}>
                {selectedPackage.canExport ? "已通过" : "需处理"}
              </div>
            </div>
            <div className="mt-3 grid gap-2 text-sm text-slate-600 lg:grid-cols-2">
              <div className="rounded-md bg-slate-50 p-3">
                <div className="font-medium text-slate-900">阻塞项</div>
                <div className="mt-2 grid gap-1">
                  {(selectedPackage.preflight.blocked.length ? selectedPackage.preflight.blocked : ["无"]).map((item) => (
                    <div key={item}>{item}</div>
                  ))}
                </div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="font-medium text-slate-900">提醒</div>
                <div className="mt-2 grid gap-1">
                  {(selectedPackage.preflight.warnings.length ? selectedPackage.preflight.warnings.slice(0, 4) : ["暂无明显提醒。"]).map((item) => (
                    <div key={item}>{item}</div>
                  ))}
                </div>
              </div>
            </div>
            {selectedPackage.repairActions.length ? (
              <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm">
                <div className="font-medium text-slate-900">下一步处理</div>
                <div className="mt-2 grid gap-2 lg:grid-cols-2">
                  {selectedPackage.repairActions.slice(0, 6).map((action) => (
                    <Link
                      className="rounded-md border border-slate-200 bg-white p-3 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      href={actionHref(projectId, action)}
                      key={action.id}
                    >
                      <div className="font-medium text-slate-950">{action.label}</div>
                      {action.chapterTitle ? <div className="mt-1 text-xs text-slate-500">{action.chapterTitle}</div> : null}
                      <div className="mt-1 leading-5">{action.detail}</div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-md border border-slate-200 p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="font-medium text-slate-950">{selectedPackage.platformName} · 发布包</div>
                <p className="mt-1 text-sm text-slate-600">{selectedPackage.logline}</p>
              </div>
              <div className="text-sm text-slate-500">{selectedPackage.category}</div>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">{selectedPackage.synopsis}</p>
            <div className="mt-3 text-sm text-slate-600">标签：{selectedPackage.tags.join("、")}</div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-md border border-slate-200 p-3">
              <div className="font-medium text-slate-950">发布说明</div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{selectedPackage.publishNote}</p>
            </div>
            <div className="rounded-md border border-slate-200 p-3">
              <div className="font-medium text-slate-950">风险提醒</div>
              <div className="mt-2 grid gap-2 text-sm text-slate-600">
                {(selectedPackage.warnings.length ? selectedPackage.warnings : ["暂无明显风险。"]).map((warning) => (
                  <div className="rounded-md bg-slate-50 p-2" key={warning}>{warning}</div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            {selectedPackage.chapters.map((chapter) => (
              <div className="rounded-md border border-slate-200 p-3 text-sm" key={chapter.id}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="font-medium text-slate-950">{chapter.formattedTitle}</div>
                    <div className="mt-1 text-slate-500">
                      {chapter.wordCount} 字 · {chapter.status} · {chapter.ready ? "可发布" : "待处理"} · 质检 {chapter.preflight.score}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">第 {chapter.order} 章</div>
                </div>
                <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-slate-600">{chapter.body}</p>
                {chapter.preflight.blocked.length ? (
                  <p className="mt-2 text-slate-500">阻塞项：{chapter.preflight.blocked.join("；")}</p>
                ) : null}
                {chapter.repairActions.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {chapter.repairActions.slice(0, 2).map((action) => (
                      <Link
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        href={actionHref(projectId, action)}
                        key={action.id}
                      >
                        {action.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
                {chapter.warnings.length ? (
                  <p className="mt-2 text-slate-500">章节风险：{chapter.warnings.join("；")}</p>
                ) : null}
              </div>
            ))}
            {selectedPackage.chapters.length === 0 ? (
              <p className="rounded-md border border-slate-200 p-3 text-sm text-slate-600">还没有可导出的正文章节。</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
