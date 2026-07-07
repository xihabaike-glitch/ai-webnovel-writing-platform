"use client";

import { useState } from "react";
import { persistGateDispatchTask } from "@/lib/projects/gateActionReceipts";
import { buildMultiPlatformDecisionDispatch } from "@/lib/projects/multiPlatformSubmission";
import { buildSubmissionAssetSavePayload } from "@/lib/projects/submissionAssetSavePayload";

interface SubmissionPackageView {
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

interface OptimizedSubmissionPackage {
  logline: string;
  synopsis: string;
  overseasSynopsis: string;
  tags: string[];
  rationale: string[];
  sourceTaskId?: string;
}

interface MultiPlatformSubmissionVariant {
  platformId: string;
  platformName: string;
  category: string;
  readinessPercent: number;
  fitScore: number;
  actionLabel: string;
  positioning: string;
  opportunity: string;
  rewriteFocus: string[];
  risks: string[];
  submissionPackage: {
    logline: string;
    synopsis: string;
    overseasSynopsis: string;
    tags: string[];
  };
  packageMatrix: {
    status: "ready" | "needs_work";
    readyFields: number;
    totalFields: number;
    packageFileName: string;
    sampleChapterCount: number;
    wordCount: number;
    nextAction: string;
    items: Array<{
      id: string;
      label: string;
      status: "ready" | "warning" | "missing";
      detail: string;
    }>;
  };
  effectTracking: {
    status: "needs_data" | "weak" | "watch" | "promising" | "signed";
    label: string;
    records: number;
    latestSnapshotDate: string | null;
    views: number;
    clicks: number;
    favorites: number;
    follows: number;
    comments: number;
    paidReads: number;
    clickRatePercent: number;
    favoriteRatePercent: number;
    followRatePercent: number;
    nextAction: string;
    repairFocus: string[];
    evidence: string[];
  };
  decision: {
    kind: "main" | "scale" | "watch" | "repair" | "collect_data" | "prepare_package" | "pause";
    label: string;
    priority: "high" | "medium" | "low";
    score: number;
    reason: string;
    nextAction: string;
    actionHref: "#publish-effect-panel" | "#submission-package" | "#platform-export";
    evidence: string[];
  };
}

interface MultiPlatformSubmission {
  title: string;
  targetPlatformId: string;
  recommendedPlatformId: string;
  variants: MultiPlatformSubmissionVariant[];
  packageSummary: {
    readyPlatforms: number;
    needsWorkPlatforms: number;
    totalPlatforms: number;
    readyToArchive: boolean;
  };
  effectSummary: {
    trackedPlatforms: number;
    needsDataPlatforms: number;
    weakPlatforms: number;
    pausedPlatforms: number;
    promisingPlatforms: number;
    signedPlatforms: number;
    bestPlatformId: string | null;
    nextAction: string;
  };
  decisionBoard: {
    status: "no_data" | "needs_repair" | "paused_review" | "watch" | "ready_to_scale" | "main_locked";
    headline: string;
    primaryPlatformId: string | null;
    primaryPlatformName: string | null;
    lanes: Array<{
      kind: "main" | "scale" | "watch" | "repair" | "collect_data" | "prepare_package" | "pause";
      label: string;
      count: number;
      platformIds: string[];
    }>;
    tasks: Array<{
      id: string;
      platformId: string;
      platformName: string;
      kind: "main" | "scale" | "watch" | "repair" | "collect_data" | "prepare_package" | "pause";
      ownerRole: "增长运营" | "平台编辑" | "数据编辑" | "主编";
      priorityScore: number;
      title: string;
      detail: string;
      dueLabel: string;
      actionLabel: string;
      href: string;
      acceptanceCriteria: string[];
      evidence: string[];
    }>;
    nextActions: string[];
  };
  archive: {
    archiveFileName: string;
    deliveryScope: {
      corePlatformCount: number;
      completedPlatformCount: number;
      pausedExpansionCount: number;
      statusLabel: string;
      scopeDecision: string;
    };
    readyCount: number;
    blockedCount: number;
    totalPlatforms: number;
    totalSampleChapterCount: number;
    totalWordCount: number;
    platforms: Array<{
      platformId: string;
      platformName: string;
      status: "ready" | "needs_work";
      effectStatus: "needs_data" | "weak" | "watch" | "promising" | "signed" | "paused";
      effectLabel: string;
      fileName: string;
      readyFields: number;
      totalFields: number;
      blockedFields: string[];
      nextAction: string;
    }>;
  };
  markdown: string;
}

interface SubmissionAbVariant {
  id: string;
  name: string;
  angle: string;
  title: string;
  logline: string;
  synopsis: string;
  tags: string[];
  score: number;
  hypothesis: string;
  expectedReader: string;
  revisionFocus: string[];
}

interface SubmissionAbTest {
  platformName: string;
  recommendedVariantId: string;
  variants: SubmissionAbVariant[];
  markdown: string;
}

function optimizedMarkdown(title: string, optimized: OptimizedSubmissionPackage) {
  return [
    `# ${title} 优化投稿资料`,
    "",
    "## 一句话卖点",
    optimized.logline,
    "",
    "## 中文简介",
    optimized.synopsis,
    "",
    "## Overseas Synopsis",
    optimized.overseasSynopsis,
    "",
    "## 标签",
    optimized.tags.join("、"),
    "",
    "## 优化理由",
    ...optimized.rationale.map((item) => `- ${item}`),
    "",
  ].join("\n");
}

function categoryLabel(category: string) {
  const labels: Record<string, string> = {
    paid: "付费订阅",
    free: "免费广告",
    female: "女频垂直",
    short: "短篇小众",
    overseas: "海外平台",
  };
  return labels[category] ?? category;
}

function matrixStatusClass(status: "ready" | "warning" | "missing" | "needs_work") {
  if (status === "ready") return "bg-emerald-50 text-emerald-700";
  if (status === "warning" || status === "needs_work") return "bg-amber-50 text-amber-700";
  return "bg-rose-50 text-rose-700";
}

function effectStatusClass(status: "needs_data" | "weak" | "watch" | "promising" | "signed") {
  if (status === "signed" || status === "promising") return "bg-emerald-50 text-emerald-700";
  if (status === "weak") return "bg-rose-50 text-rose-700";
  if (status === "watch") return "bg-blue-50 text-blue-700";
  return "bg-amber-50 text-amber-700";
}

function decisionStatusClass(kind: MultiPlatformSubmissionVariant["decision"]["kind"]) {
  if (kind === "main" || kind === "scale") return "bg-emerald-50 text-emerald-700";
  if (kind === "repair" || kind === "prepare_package") return "bg-rose-50 text-rose-700";
  if (kind === "watch") return "bg-blue-50 text-blue-700";
  if (kind === "collect_data") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
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
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isSavingAsset, setIsSavingAsset] = useState(false);
  const [optimized, setOptimized] = useState<OptimizedSubmissionPackage | null>(null);
  const [isLoadingMultiPlatform, setIsLoadingMultiPlatform] = useState(false);
  const [isDownloadingMultiPlatform, setIsDownloadingMultiPlatform] = useState(false);
  const [isDownloadingMultiPlatformArchive, setIsDownloadingMultiPlatformArchive] = useState(false);
  const [isAssigningDecisionTasks, setIsAssigningDecisionTasks] = useState(false);
  const [multiPlatform, setMultiPlatform] = useState<MultiPlatformSubmission | null>(null);
  const [isLoadingAbTest, setIsLoadingAbTest] = useState(false);
  const [isDownloadingAbTest, setIsDownloadingAbTest] = useState(false);
  const [abTest, setAbTest] = useState<SubmissionAbTest | null>(null);

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

  async function optimizePackage() {
    setIsOptimizing(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/submission-package/optimize`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("优化投稿资料失败。");
      }
      const payload = (await response.json()) as { task?: { id: string }; optimized: OptimizedSubmissionPackage };
      setOptimized({ ...payload.optimized, sourceTaskId: payload.task?.id });
      setMessage("已生成平台优化版");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "优化投稿资料失败。");
    } finally {
      setIsOptimizing(false);
    }
  }

  async function copyOptimizedMarkdown() {
    if (!optimized) return;
    await navigator.clipboard.writeText(optimizedMarkdown(submissionPackage.title, optimized));
    setMessage("已复制优化版投稿资料");
  }

  async function saveSubmissionAsset(source: "base" | "optimized") {
    const assetSource = source === "optimized" && optimized
      ? {
        title: submissionPackage.title,
        logline: optimized.logline,
        synopsis: optimized.synopsis,
        overseasSynopsis: optimized.overseasSynopsis,
        tags: optimized.tags,
      }
      : {
        title: submissionPackage.title,
        logline: submissionPackage.logline,
        synopsis: submissionPackage.synopsis,
        overseasSynopsis: submissionPackage.overseasSynopsis,
        tags: submissionPackage.tags,
      };
    setIsSavingAsset(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/platform-export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildSubmissionAssetSavePayload({
          platformId: submissionPackage.platformId,
          source: assetSource,
          note: source === "optimized" ? "由投稿资料面板采纳 AI 优化版。" : "由投稿资料面板保存原始投稿包。",
          sourceTaskId: source === "optimized" ? optimized?.sourceTaskId : undefined,
          strategy: source === "optimized" ? "投稿资料优化版" : "原始投稿资料",
          adopt: source === "optimized",
        })),
      });
      const payload = (await response.json().catch(() => null)) as { message?: string; error?: string; audit?: { score: number } } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "保存发布资产失败。");
      }
      const scoreText = payload?.audit?.score ? `，质检 ${payload.audit.score} 分` : "";
      setMessage(source === "optimized" ? `已采纳优化版到发布资产${scoreText}` : `已保存到发布资产${scoreText}`);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "保存发布资产失败。");
    } finally {
      setIsSavingAsset(false);
    }
  }

  async function loadMultiPlatformVersions() {
    setIsLoadingMultiPlatform(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/submission-package/multi-platform`);
      if (!response.ok) {
        throw new Error("生成多平台版本失败。");
      }
      const payload = (await response.json()) as { multiPlatformSubmission: MultiPlatformSubmission };
      setMultiPlatform(payload.multiPlatformSubmission);
      setMessage("已生成多平台投稿版本");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "生成多平台版本失败。");
    } finally {
      setIsLoadingMultiPlatform(false);
    }
  }

  async function copyMultiPlatformMarkdown() {
    if (!multiPlatform) return;
    await navigator.clipboard.writeText(multiPlatform.markdown);
    setMessage("已复制多平台投稿版本");
  }

  async function downloadMultiPlatformMarkdown() {
    setIsDownloadingMultiPlatform(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/submission-package/multi-platform?format=markdown`);
      if (!response.ok) {
        throw new Error("下载多平台版本失败。");
      }
      const markdown = await response.text();
      const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${submissionPackage.title}-多平台投稿版本.md`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "下载多平台版本失败。");
    } finally {
      setIsDownloadingMultiPlatform(false);
    }
  }

  async function downloadMultiPlatformArchive() {
    setIsDownloadingMultiPlatformArchive(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/submission-package/multi-platform?format=archive`);
      if (!response.ok) {
        throw new Error("下载多平台归档包失败。");
      }
      const markdown = await response.text();
      const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = multiPlatform?.archive.archiveFileName ?? `${submissionPackage.title}-多平台投稿包归档.md`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage("已下载多平台投稿包归档");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "下载多平台归档包失败。");
    } finally {
      setIsDownloadingMultiPlatformArchive(false);
    }
  }

  async function downloadPlatformPackage(variant: MultiPlatformSubmissionVariant) {
    setIsDownloadingMultiPlatform(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/submission-package/multi-platform?format=package&platformId=${variant.platformId}`);
      if (!response.ok) {
        throw new Error("下载平台投稿包失败。");
      }
      const markdown = await response.text();
      const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = variant.packageMatrix.packageFileName;
      link.click();
      URL.revokeObjectURL(url);
      setMessage(`已下载 ${variant.platformName} 投稿包`);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "下载平台投稿包失败。");
    } finally {
      setIsDownloadingMultiPlatform(false);
    }
  }

  async function assignDecisionTasks() {
    if (!multiPlatform?.decisionBoard.tasks.length) return;
    setIsAssigningDecisionTasks(true);
    setMessage(null);
    try {
      const tasks = await Promise.all(
        multiPlatform.decisionBoard.tasks.map((task) => persistGateDispatchTask(buildMultiPlatformDecisionDispatch(task, { projectId }))),
      );
      setMessage(`已派发 ${tasks.length} 个投稿决策执行单到派单中心`);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "投稿决策执行单派发失败。");
    } finally {
      setIsAssigningDecisionTasks(false);
    }
  }

  async function loadAbTest() {
    setIsLoadingAbTest(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/submission-package/ab-test`);
      if (!response.ok) {
        throw new Error("生成 A/B 测试失败。");
      }
      const payload = (await response.json()) as { submissionAbTest: SubmissionAbTest };
      setAbTest(payload.submissionAbTest);
      setMessage("已生成投稿 A/B 测试");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "生成 A/B 测试失败。");
    } finally {
      setIsLoadingAbTest(false);
    }
  }

  async function copyAbTestMarkdown() {
    if (!abTest) return;
    await navigator.clipboard.writeText(abTest.markdown);
    setMessage("已复制 A/B 测试");
  }

  async function downloadAbTestMarkdown() {
    setIsDownloadingAbTest(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/submission-package/ab-test?format=markdown`);
      if (!response.ok) {
        throw new Error("下载 A/B 测试失败。");
      }
      const markdown = await response.text();
      const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${submissionPackage.title}-投稿AB测试.md`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "下载 A/B 测试失败。");
    } finally {
      setIsDownloadingAbTest(false);
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
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            disabled={isSavingAsset}
            onClick={() => void saveSubmissionAsset("base")}
            type="button"
          >
            {isSavingAsset ? "保存中" : "保存为发布资产"}
          </button>
          <button
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            disabled={isOptimizing}
            onClick={optimizePackage}
            type="button"
          >
            {isOptimizing ? "优化中" : "AI 优化"}
          </button>
          <button
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            disabled={isLoadingMultiPlatform}
            onClick={loadMultiPlatformVersions}
            type="button"
          >
            {isLoadingMultiPlatform ? "生成中" : "多平台版本"}
          </button>
          <button
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            disabled={isLoadingAbTest}
            onClick={loadAbTest}
            type="button"
          >
            {isLoadingAbTest ? "测试中" : "A/B 测试"}
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
      {optimized ? (
        <div className="mt-4 rounded-md border border-slate-200 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-medium">平台优化版</div>
            <div className="flex flex-wrap gap-2">
              <button
                className="w-fit rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                onClick={copyOptimizedMarkdown}
                type="button"
              >
                复制优化版
              </button>
              <button
                className="w-fit rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                disabled={isSavingAsset}
                onClick={() => void saveSubmissionAsset("optimized")}
                type="button"
              >
                {isSavingAsset ? "保存中" : "采纳到发布资产"}
              </button>
            </div>
          </div>
          <div className="mt-3 grid gap-3">
            <div className="rounded-md bg-slate-50 p-3">
              <div className="text-xs font-medium text-slate-500">一句话卖点</div>
              <p className="mt-1 text-sm text-slate-700">{optimized.logline}</p>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <div className="text-xs font-medium text-slate-500">中文简介</div>
              <p className="mt-1 text-sm leading-6 text-slate-700">{optimized.synopsis}</p>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <div className="text-xs font-medium text-slate-500">标签</div>
              <p className="mt-1 text-sm text-slate-700">{optimized.tags.join("、")}</p>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <div className="text-xs font-medium text-slate-500">优化理由</div>
              <div className="mt-1 grid gap-1 text-sm text-slate-700">
                {optimized.rationale.map((item) => (
                  <div key={item}>{item}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {multiPlatform ? (
        <div className="mt-4 rounded-md border border-slate-200 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-medium">多平台投稿版本</div>
              <p className="mt-1 text-xs text-slate-500">
                推荐：{multiPlatform.variants.find((variant) => variant.platformId === multiPlatform.recommendedPlatformId)?.platformName ?? "待判断"}
                {" · "}
                可归档 {multiPlatform.packageSummary.readyPlatforms}/{multiPlatform.packageSummary.totalPlatforms}
                {" · "}
                已追踪 {multiPlatform.effectSummary.trackedPlatforms}/{multiPlatform.packageSummary.totalPlatforms}
                {" · "}
                {multiPlatform.archive.archiveFileName}
              </p>
              <p className="mt-1 text-xs text-emerald-700">
                {multiPlatform.archive.deliveryScope.statusLabel}；扩展平台不纳入本期
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium hover:bg-slate-50"
                onClick={copyMultiPlatformMarkdown}
                type="button"
              >
                复制多平台
              </button>
              <button
                className="rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                disabled={isDownloadingMultiPlatform}
                onClick={downloadMultiPlatformMarkdown}
                type="button"
              >
                {isDownloadingMultiPlatform ? "下载中" : "下载多平台"}
              </button>
              <button
                className="rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                disabled={isDownloadingMultiPlatformArchive}
                onClick={downloadMultiPlatformArchive}
                type="button"
              >
                {isDownloadingMultiPlatformArchive ? "归档中" : "下载归档包"}
              </button>
              <button
                className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
                disabled={isAssigningDecisionTasks || !multiPlatform.decisionBoard.tasks.length}
                onClick={() => void assignDecisionTasks()}
                type="button"
              >
                {isAssigningDecisionTasks ? "派发中" : "派发执行单"}
              </button>
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-md bg-slate-50 p-3">
              <div className="text-xs text-slate-500">归档平台</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">
                {multiPlatform.archive.readyCount}/{multiPlatform.archive.totalPlatforms}
              </div>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <div className="text-xs text-slate-500">待补字段平台</div>
              <div className="mt-1 text-lg font-semibold text-amber-700">{multiPlatform.archive.blockedCount}</div>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <div className="text-xs text-slate-500">归档样章</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{multiPlatform.archive.totalSampleChapterCount}</div>
            </div>
          </div>
          <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-sm font-medium text-slate-900">投放追踪</div>
                <p className="mt-1 text-sm leading-6 text-slate-600">{multiPlatform.effectSummary.nextAction}</p>
              </div>
              <a
                className="w-fit rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                href="#publish-effect-panel"
              >
                进入效果回填
              </a>
            </div>
            <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-6">
              <div className="rounded-md bg-white p-2">
                <div className="text-slate-500">已追踪</div>
                <div className="mt-1 font-semibold text-slate-900">{multiPlatform.effectSummary.trackedPlatforms}</div>
              </div>
              <div className="rounded-md bg-white p-2">
                <div className="text-slate-500">待回填</div>
                <div className="mt-1 font-semibold text-amber-700">{multiPlatform.effectSummary.needsDataPlatforms}</div>
              </div>
              <div className="rounded-md bg-white p-2">
                <div className="text-slate-500">偏弱</div>
                <div className="mt-1 font-semibold text-rose-700">{multiPlatform.effectSummary.weakPlatforms}</div>
              </div>
              <div className="rounded-md bg-white p-2">
                <div className="text-slate-500">暂停复盘</div>
                <div className="mt-1 font-semibold text-rose-700">{multiPlatform.effectSummary.pausedPlatforms}</div>
              </div>
              <div className="rounded-md bg-white p-2">
                <div className="text-slate-500">有苗头</div>
                <div className="mt-1 font-semibold text-emerald-700">{multiPlatform.effectSummary.promisingPlatforms}</div>
              </div>
              <div className="rounded-md bg-white p-2">
                <div className="text-slate-500">邀约/签约</div>
                <div className="mt-1 font-semibold text-emerald-700">{multiPlatform.effectSummary.signedPlatforms}</div>
              </div>
            </div>
          </div>
          <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-sm font-medium text-slate-900">投放决策板</div>
                <p className="mt-1 text-sm leading-6 text-slate-600">{multiPlatform.decisionBoard.headline}</p>
              </div>
              <div className="w-fit rounded-md bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700">
                主平台：{multiPlatform.decisionBoard.primaryPlatformName ?? "待确认"}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {multiPlatform.decisionBoard.lanes.map((lane) => (
                <span className={`rounded-md px-2 py-1 text-xs font-medium ${decisionStatusClass(lane.kind)}`} key={lane.kind}>
                  {lane.label} {lane.count}
                </span>
              ))}
            </div>
            <div className="mt-3 grid gap-2">
              {multiPlatform.decisionBoard.nextActions.map((action) => (
                <div className="rounded-md bg-slate-50 p-2 text-xs leading-5 text-slate-700" key={action}>{action}</div>
              ))}
            </div>
            <div className="mt-3 grid gap-2 lg:grid-cols-2">
              {multiPlatform.decisionBoard.tasks.map((task) => (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3" key={task.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{task.title}</div>
                      <div className="mt-1 text-xs text-slate-500">{task.ownerRole} · {task.dueLabel}</div>
                    </div>
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${decisionStatusClass(task.kind)}`}>
                      {task.priorityScore}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-600">{task.detail}</p>
                  <div className="mt-2 grid gap-1 text-xs text-slate-600">
                    {task.acceptanceCriteria.map((criterion) => (
                      <div key={criterion}>{criterion}</div>
                    ))}
                  </div>
                  <a className="mt-3 inline-flex w-fit rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50" href={task.href}>
                    {task.actionLabel}
                  </a>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {multiPlatform.variants.map((variant) => (
              <div className="rounded-md bg-slate-50 p-3" key={variant.platformId}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      {variant.platformName}
                      {variant.platformId === multiPlatform.targetPlatformId ? (
                        <span className="ml-2 text-xs font-normal text-slate-500">当前目标</span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{categoryLabel(variant.category)} · 准备度 {variant.readinessPercent}%</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="w-fit rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-700">
                      {variant.fitScore} · {variant.actionLabel}
                    </div>
                    <button
                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      disabled={isDownloadingMultiPlatform}
                      onClick={() => void downloadPlatformPackage(variant)}
                      type="button"
                    >
                      下载单包
                    </button>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">{variant.positioning}</p>
                <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-medium text-slate-500">投放决策</div>
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${decisionStatusClass(variant.decision.kind)}`}>
                      {variant.decision.label} · {variant.decision.score}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-600">{variant.decision.reason}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{variant.decision.nextAction}</p>
                  <a className="mt-2 inline-flex w-fit rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50" href={variant.decision.actionHref}>
                    去执行
                  </a>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-600">
                  <div>
                    <span className="font-medium text-slate-900">平台包：</span>
                    {variant.packageMatrix.readyFields}/{variant.packageMatrix.totalFields} 字段 · {variant.packageMatrix.packageFileName}
                  </div>
                  <div>
                    <span className="font-medium text-slate-900">机会：</span>
                    {variant.opportunity}
                  </div>
                  <div>
                    <span className="font-medium text-slate-900">标签：</span>
                    {variant.submissionPackage.tags.join("、")}
                  </div>
                  <div>
                    <span className="font-medium text-slate-900">重写：</span>
                    {variant.rewriteFocus.join("；")}
                  </div>
                  <div>
                    <span className="font-medium text-slate-900">风险：</span>
                    {variant.risks.join("、")}
                  </div>
                </div>
                <div className="mt-3 rounded-md bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-medium text-slate-500">字段矩阵</div>
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${matrixStatusClass(variant.packageMatrix.status)}`}>
                      {variant.packageMatrix.status === "ready" ? "可归档" : "需补齐"}
                    </span>
                  </div>
                  <div className="mt-2 grid gap-1">
                    {variant.packageMatrix.items.map((item) => (
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs" key={item.id}>
                        <span className="text-slate-700">{item.label}</span>
                        <span className={`rounded-md px-2 py-1 ${matrixStatusClass(item.status)}`}>
                          {item.status === "ready" ? "已齐" : item.status === "warning" ? "补强" : "缺失"}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-600">{variant.packageMatrix.nextAction}</p>
                </div>
                <div className="mt-3 rounded-md bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-medium text-slate-500">投放追踪</div>
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${effectStatusClass(variant.effectTracking.status)}`}>
                      {variant.effectTracking.label}
                    </span>
                  </div>
                  <div className="mt-2 grid gap-2 text-xs sm:grid-cols-4">
                    <div>
                      <div className="text-slate-500">曝光</div>
                      <div className="mt-1 font-medium text-slate-900">{variant.effectTracking.views}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">点击率</div>
                      <div className="mt-1 font-medium text-slate-900">{variant.effectTracking.clickRatePercent}%</div>
                    </div>
                    <div>
                      <div className="text-slate-500">收藏率</div>
                      <div className="mt-1 font-medium text-slate-900">{variant.effectTracking.favoriteRatePercent}%</div>
                    </div>
                    <div>
                      <div className="text-slate-500">追读率</div>
                      <div className="mt-1 font-medium text-slate-900">{variant.effectTracking.followRatePercent}%</div>
                    </div>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-600">{variant.effectTracking.nextAction}</p>
                  {variant.effectTracking.repairFocus.length ? (
                    <div className="mt-2 grid gap-1 text-xs leading-5 text-rose-700">
                      {variant.effectTracking.repairFocus.map((focus) => (
                        <div className="rounded-md bg-rose-50 px-2 py-1" key={focus}>{focus}</div>
                      ))}
                    </div>
                  ) : null}
                  <a className="mt-2 inline-flex w-fit rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50" href="#publish-effect-panel">
                    回填这轮数据
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {abTest ? (
        <div className="mt-4 rounded-md border border-slate-200 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-medium">投稿 A/B 测试</div>
              <p className="mt-1 text-xs text-slate-500">
                推荐：{abTest.variants.find((variant) => variant.id === abTest.recommendedVariantId)?.name ?? "待判断"} · {abTest.platformName}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium hover:bg-slate-50"
                onClick={copyAbTestMarkdown}
                type="button"
              >
                复制测试
              </button>
              <button
                className="rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                disabled={isDownloadingAbTest}
                onClick={downloadAbTestMarkdown}
                type="button"
              >
                {isDownloadingAbTest ? "下载中" : "下载测试"}
              </button>
            </div>
          </div>
          <div className="mt-3 grid gap-3">
            {abTest.variants.map((variant) => (
              <div className="rounded-md bg-slate-50 p-3" key={variant.id}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      {variant.name}
                      {variant.id === abTest.recommendedVariantId ? (
                        <span className="ml-2 text-xs font-normal text-slate-500">推荐</span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{variant.angle}</p>
                  </div>
                  <div className="w-fit rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-700">{variant.score}</div>
                </div>
                <div className="mt-3 rounded-md bg-white p-3">
                  <div className="text-xs font-medium text-slate-500">标题</div>
                  <p className="mt-1 text-sm text-slate-800">{variant.title}</p>
                </div>
                <div className="mt-2 grid gap-2 text-sm text-slate-600">
                  <div>
                    <span className="font-medium text-slate-900">卖点：</span>
                    {variant.logline}
                  </div>
                  <div>
                    <span className="font-medium text-slate-900">假设：</span>
                    {variant.hypothesis}
                  </div>
                  <div>
                    <span className="font-medium text-slate-900">读者：</span>
                    {variant.expectedReader}
                  </div>
                  <div>
                    <span className="font-medium text-slate-900">标签：</span>
                    {variant.tags.join("、")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
