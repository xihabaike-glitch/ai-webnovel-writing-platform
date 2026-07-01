"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  actionFromRunResult,
  labelForAction,
  normalizeRunResult,
  pendingResultFromAction,
  type PublishRepairRunResult,
  type RawPublishRepairRunResult,
} from "@/lib/projects/publishRepairRunResults";

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

interface PublishRepairHistoryItem {
  id: string;
  actionKind: PublishRepairActionKind;
  label: string;
  chapterId: string | null;
  chapterTitle: string;
  status: string;
  score: number | null;
  shouldSecondPass: boolean | null;
  message: string;
  createdAt: string;
}

interface PublishPackageVersionItem {
  id: string;
  platformId: string;
  platformName: string;
  title: string;
  action: string;
  chapterCount: number;
  wordCount: number;
  preflightScore: number;
  canExport: boolean;
  createdAt: string;
}

interface PublishPackageVersionDetail extends PublishPackageVersionItem {
  logline: string;
  synopsis: string;
  tags: string[];
  markdown: string;
}

interface PublishPackageVersionComparisonItem {
  label: string;
  current: string;
  version: string;
  changed: boolean;
}

interface PublishPackageVersionComparison {
  changedCount: number;
  items: PublishPackageVersionComparisonItem[];
}

interface PublishPackageVersionDetailState {
  version: PublishPackageVersionDetail;
  comparison: PublishPackageVersionComparison;
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
  repairHistory: PublishRepairHistoryItem[];
  publishVersions: PublishPackageVersionItem[];
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

function canRunAction(action: PublishRepairAction) {
  return (action.kind === "run_chapter_review" || action.kind === "run_second_pass") && Boolean(action.chapterId);
}

function resultStatusLabel(status: PublishRepairRunResult["status"]) {
  if (status === "succeeded") return "成功";
  if (status === "pending") return "处理中";
  return "失败";
}

function resultStatusClass(status: PublishRepairRunResult["status"]) {
  if (status === "succeeded") return "bg-emerald-50 text-emerald-700";
  if (status === "pending") return "bg-amber-50 text-amber-700";
  return "bg-rose-50 text-rose-700";
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function versionActionLabel(action: string) {
  if (action === "copy") return "复制";
  if (action === "download") return "下载";
  if (action === "archive") return "归档";
  return "保存";
}

export function PlatformExportCenterPanel({ projectId }: { projectId: string }) {
  const [center, setCenter] = useState<PlatformPublishExportCenter | null>(null);
  const [selectedPlatformId, setSelectedPlatformId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [runningActionId, setRunningActionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [runResults, setRunResults] = useState<PublishRepairRunResult[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [versionDetail, setVersionDetail] = useState<PublishPackageVersionDetailState | null>(null);
  const [isLoadingVersion, setIsLoadingVersion] = useState(false);
  const selectedPackage = useMemo(
    () => center?.packages.find((pack) => pack.platformId === selectedPlatformId) ?? center?.packages[0] ?? null,
    [center, selectedPlatformId],
  );
  const executableActions = useMemo(
    () => selectedPackage?.repairActions.filter(canRunAction).slice(0, 5) ?? [],
    [selectedPackage],
  );
  const exportablePackages = useMemo(
    () => center?.packages.filter((pack) => pack.canExport) ?? [],
    [center],
  );

  async function loadCenter(options?: { keepMessage?: boolean }) {
    setIsLoading(true);
    if (!options?.keepMessage) setMessage(null);
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

  async function loadVersionDetail(versionId: string) {
    setSelectedVersionId(versionId);
    setVersionDetail(null);
    setIsLoadingVersion(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/platform-export?versionId=${versionId}`);
      const payload = (await response.json().catch(() => null)) as (PublishPackageVersionDetailState & { error?: string }) | null;
      if (!response.ok || !payload) {
        throw new Error(payload?.error ?? "读取发布包版本失败。");
      }
      setVersionDetail({
        version: payload.version,
        comparison: payload.comparison,
      });
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "读取发布包版本失败。");
    } finally {
      setIsLoadingVersion(false);
    }
  }

  async function copyMarkdown() {
    if (!selectedPackage) return;
    if (!selectedPackage.canExport) {
      setMessage("发布前质检未通过，先处理阻塞项。");
      return;
    }
    await navigator.clipboard.writeText(selectedPackage.markdown);
    try {
      const response = await fetch(`/api/projects/${projectId}/platform-export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platformId: selectedPackage.platformId, action: "copy" }),
      });
      const payload = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "发布包已复制，但版本保存失败。");
      setMessage(`已复制 ${selectedPackage.platformName} 发布包，并保存版本。`);
      await loadCenter({ keepMessage: true });
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "发布包已复制，但版本保存失败。");
    }
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
      setMessage(`已下载 ${selectedPackage.platformName} 发布包，并保存版本。`);
      await loadCenter({ keepMessage: true });
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "下载发布包失败。");
    } finally {
      setIsLoading(false);
    }
  }

  async function downloadArchive() {
    if (!exportablePackages.length) {
      setMessage("暂无通过质检的平台包，先处理发布前阻塞项。");
      return;
    }
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/platform-export?format=archive`);
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? "下载全平台投稿包失败。");
      }
      const markdown = await response.text();
      const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "全平台投稿包.md";
      link.click();
      URL.revokeObjectURL(url);
      setMessage(`已下载全平台投稿包，包含 ${exportablePackages.length} 个通过质检的平台版本。`);
      await loadCenter({ keepMessage: true });
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "下载全平台投稿包失败。");
    } finally {
      setIsLoading(false);
    }
  }

  async function runRepairAction(action: PublishRepairAction) {
    if (!canRunAction(action)) return;
    setRunningActionId(action.id);
    setMessage(null);
    setRunResults([pendingResultFromAction(action)]);
    try {
      const response = await fetch(`/api/projects/${projectId}/platform-export/repair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: action.kind,
          chapterId: action.chapterId,
          chapterTitle: action.chapterTitle,
          detail: action.detail,
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        error?: string;
        result?: RawPublishRepairRunResult;
        results?: RawPublishRepairRunResult[];
      } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "修复动作执行失败。");
      }
      const results = payload?.results?.length
        ? payload.results.map(normalizeRunResult)
        : payload?.result
          ? [normalizeRunResult(payload.result)]
          : [];
      setRunResults(results.length ? results : [{ ...pendingResultFromAction(action), status: "succeeded", message: payload?.message ?? "修复动作已完成。" }]);
      setMessage(payload?.message ?? "修复动作已完成。");
      await loadCenter({ keepMessage: true });
    } catch (caught) {
      const errorMessage = caught instanceof Error ? caught.message : "修复动作执行失败。";
      setRunResults([{ ...pendingResultFromAction(action), status: "failed", error: errorMessage, message: errorMessage }]);
      setMessage(errorMessage);
    } finally {
      setRunningActionId(null);
    }
  }

  async function runBatchRepairActions() {
    if (!executableActions.length) return;
    setRunningActionId("batch");
    setMessage(null);
    setRunResults(executableActions.map(pendingResultFromAction));
    try {
      const response = await fetch(`/api/projects/${projectId}/platform-export/repair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actions: executableActions.map((action) => ({
            kind: action.kind,
            chapterId: action.chapterId,
            chapterTitle: action.chapterTitle,
            detail: action.detail,
          })),
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        error?: string;
        results?: RawPublishRepairRunResult[];
      } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "批量修复失败。");
      }
      setRunResults(payload?.results?.map(normalizeRunResult) ?? []);
      setMessage(payload?.message ?? "批量修复已完成。");
      await loadCenter({ keepMessage: true });
    } catch (caught) {
      const errorMessage = caught instanceof Error ? caught.message : "批量修复失败。";
      setRunResults((current) => current.map((result) => ({ ...result, status: "failed", error: errorMessage, message: errorMessage })));
      setMessage(errorMessage);
    } finally {
      setRunningActionId(null);
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
          onClick={() => void loadCenter()}
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
            onChange={(event) => {
              setSelectedPlatformId(event.target.value);
              setSelectedVersionId(null);
              setVersionDetail(null);
            }}
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
          <button
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50 disabled:opacity-50"
            disabled={!exportablePackages.length || isLoading}
            onClick={downloadArchive}
            type="button"
          >
            下载全平台包
          </button>
        </div>
      </div>

      {center ? (
        <div className="mt-3 grid gap-2 rounded-md bg-slate-50 p-3 text-sm text-slate-600 sm:grid-cols-3">
          <div>
            <div className="text-xs text-slate-500">全平台归档</div>
            <div className="mt-1 font-medium text-slate-950">可导出 {exportablePackages.length}/{center.packages.length}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">待处理平台</div>
            <div className="mt-1 font-medium text-slate-950">{center.packages.length - exportablePackages.length}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">归档内容</div>
            <div className="mt-1 font-medium text-slate-950">清单 + Markdown 正文</div>
          </div>
        </div>
      ) : null}

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
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="font-medium text-slate-900">下一步处理</div>
                  {executableActions.length ? (
                    <button
                      className="w-fit rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                      disabled={Boolean(runningActionId)}
                      onClick={() => void runBatchRepairActions()}
                      type="button"
                    >
                      {runningActionId === "batch" ? "批量处理中" : `批量处理前 ${executableActions.length} 项`}
                    </button>
                  ) : null}
                </div>
                <div className="mt-2 grid gap-2 lg:grid-cols-2">
                  {selectedPackage.repairActions.slice(0, 6).map((action) => (
                    <div
                      className="rounded-md border border-slate-200 bg-white p-3 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      key={action.id}
                    >
                      <div className="font-medium text-slate-950">{action.label}</div>
                      {action.chapterTitle ? <div className="mt-1 text-xs text-slate-500">{action.chapterTitle}</div> : null}
                      <div className="mt-1 leading-5">{action.detail}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {canRunAction(action) ? (
                          <button
                            className="rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                            disabled={Boolean(runningActionId)}
                            onClick={() => void runRepairAction(action)}
                            type="button"
                          >
                            {runningActionId === action.id ? "处理中" : "立即处理"}
                          </button>
                        ) : null}
                        <Link
                          className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          href={actionHref(projectId, action)}
                        >
                          打开位置
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
                {runResults.length ? (
                  <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="font-medium text-slate-950">本次处理结果</div>
                        <div className="mt-1 text-xs text-slate-500">
                          成功 {runResults.filter((result) => result.status === "succeeded").length} 项 ·
                          失败 {runResults.filter((result) => result.status === "failed").length} 项 ·
                          处理中 {runResults.filter((result) => result.status === "pending").length} 项
                        </div>
                      </div>
                      {runResults.some((result) => result.status === "failed" && canRunAction(actionFromRunResult(result))) ? (
                        <button
                          className="w-fit rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          disabled={Boolean(runningActionId)}
                          onClick={() => {
                            const failedResult = runResults.find((result) => result.status === "failed" && canRunAction(actionFromRunResult(result)));
                            if (failedResult) void runRepairAction(actionFromRunResult(failedResult));
                          }}
                          type="button"
                        >
                          重试首个失败项
                        </button>
                      ) : null}
                    </div>
                    <div className="mt-3 grid gap-2">
                      {runResults.map((result) => {
                        const retryAction = actionFromRunResult(result);
                        return (
                          <div className="rounded-md border border-slate-200 p-3" key={result.id}>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <div className="font-medium text-slate-950">{labelForAction(result.action)}</div>
                                <div className="mt-1 text-xs text-slate-500">{result.chapterTitle}</div>
                              </div>
                              <span className={`w-fit rounded-md px-2 py-1 text-xs font-medium ${resultStatusClass(result.status)}`}>
                                {resultStatusLabel(result.status)}
                              </span>
                            </div>
                            <div className="mt-2 text-slate-600">
                              {result.error ?? result.message ?? (result.status === "pending" ? "等待模型返回结果。" : "已完成处理。")}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                              {typeof result.score === "number" ? <span>评分 {result.score}</span> : null}
                              {typeof result.issueCount === "number" ? <span>问题 {result.issueCount} 个</span> : null}
                              {typeof result.wordCount === "number" ? <span>{result.wordCount} 字</span> : null}
                            </div>
                            {result.status === "failed" && canRunAction(retryAction) ? (
                              <button
                                className="mt-3 rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                                disabled={Boolean(runningActionId)}
                                onClick={() => void runRepairAction(retryAction)}
                                type="button"
                              >
                                {runningActionId === retryAction.id ? "重试中" : "重试此项"}
                              </button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            {runResults.length && !selectedPackage.repairActions.length ? (
              <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm">
                <div className="font-medium text-slate-900">本次处理结果</div>
                <div className="mt-1 text-xs text-slate-500">
                  成功 {runResults.filter((result) => result.status === "succeeded").length} 项 ·
                  失败 {runResults.filter((result) => result.status === "failed").length} 项 ·
                  处理中 {runResults.filter((result) => result.status === "pending").length} 项
                </div>
                <div className="mt-3 grid gap-2">
                  {runResults.map((result) => (
                    <div className="rounded-md border border-slate-200 bg-white p-3" key={result.id}>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="font-medium text-slate-950">{labelForAction(result.action)}</div>
                          <div className="mt-1 text-xs text-slate-500">{result.chapterTitle}</div>
                        </div>
                        <span className={`w-fit rounded-md px-2 py-1 text-xs font-medium ${resultStatusClass(result.status)}`}>
                          {resultStatusLabel(result.status)}
                        </span>
                      </div>
                      <div className="mt-2 text-slate-600">
                        {result.error ?? result.message ?? (result.status === "pending" ? "等待模型返回结果。" : "已完成处理。")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {selectedPackage.repairHistory.length ? (
              <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm">
                <div className="font-medium text-slate-900">最近修复记录</div>
                <div className="mt-2 grid gap-2">
                  {selectedPackage.repairHistory.map((item) => (
                    <div className="rounded-md border border-slate-200 bg-white p-3" key={item.id}>
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="font-medium text-slate-950">{item.label}</div>
                          <div className="mt-1 text-xs text-slate-500">{item.chapterTitle}</div>
                        </div>
                        <div className="text-xs text-slate-500">{formatTime(item.createdAt)} · {item.status}</div>
                      </div>
                      <div className="mt-2 text-slate-600">{item.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {selectedPackage.publishVersions.length ? (
              <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="font-medium text-slate-900">发布包版本</div>
                    <div className="mt-1 text-xs text-slate-500">最近 {selectedPackage.publishVersions.length} 次复制或下载保存。</div>
                  </div>
                  <div className="text-xs text-slate-500">当前平台：{selectedPackage.platformName}</div>
                </div>
                <div className="mt-2 grid gap-2">
                  {selectedPackage.publishVersions.map((version) => (
                    <div className="rounded-md border border-slate-200 bg-white p-3" key={version.id}>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="font-medium text-slate-950">{version.title}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {versionActionLabel(version.action)} · {formatTime(version.createdAt)}
                          </div>
                        </div>
                        <div className={`w-fit rounded-md px-2 py-1 text-xs font-medium ${
                          version.canExport ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                        }`}>
                          质检 {version.preflightScore}
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span>{version.chapterCount} 章</span>
                        <span>{version.wordCount} 字</span>
                        <span>{version.platformName}</span>
                      </div>
                      <button
                        className="mt-3 rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        disabled={isLoadingVersion && selectedVersionId === version.id}
                        onClick={() => void loadVersionDetail(version.id)}
                        type="button"
                      >
                        {isLoadingVersion && selectedVersionId === version.id ? "读取中" : "查看详情"}
                      </button>
                    </div>
                  ))}
                </div>
                {versionDetail ? (
                  <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="font-medium text-slate-950">版本详情</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {versionDetail.version.platformName} · {versionActionLabel(versionDetail.version.action)} · {formatTime(versionDetail.version.createdAt)}
                        </div>
                      </div>
                      <button
                        className="w-fit rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        onClick={() => {
                          void navigator.clipboard.writeText(versionDetail.version.markdown);
                          setMessage("已复制该历史版本 Markdown。");
                        }}
                        type="button"
                      >
                        复制此版本
                      </button>
                    </div>
                    <div className="mt-3 rounded-md bg-slate-50 p-3">
                      <div className="font-medium text-slate-900">与当前包对比</div>
                      <div className="mt-1 text-xs text-slate-500">变化 {versionDetail.comparison.changedCount} 项</div>
                      <div className="mt-2 grid gap-2 lg:grid-cols-2">
                        {versionDetail.comparison.items.map((item) => (
                          <div className="rounded-md border border-slate-200 bg-white p-2" key={item.label}>
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-slate-950">{item.label}</span>
                              <span className={`rounded-md px-2 py-1 text-xs font-medium ${
                                item.changed ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                              }`}>
                                {item.changed ? "有变化" : "一致"}
                              </span>
                            </div>
                            <div className="mt-2 grid gap-1 text-xs text-slate-600">
                              <div>当前：{item.current}</div>
                              <div>版本：{item.version}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="font-medium text-slate-900">Markdown 预览</div>
                      <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-slate-950 p-3 text-xs leading-5 text-slate-100">
                        {versionDetail.version.markdown}
                      </pre>
                    </div>
                  </div>
                ) : null}
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
                      canRunAction(action) ? (
                        <button
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          disabled={Boolean(runningActionId)}
                          key={action.id}
                          onClick={() => void runRepairAction(action)}
                          type="button"
                        >
                          {runningActionId === action.id ? "处理中" : action.label}
                        </button>
                      ) : (
                        <Link
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          href={actionHref(projectId, action)}
                          key={action.id}
                        >
                          {action.label}
                        </Link>
                      )
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
