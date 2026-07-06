"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { groupReviewIssues, nonEmptyReviewGroups } from "@/lib/ai/reviewGrouping";
import { buildAiRecoveryMemoryControlRequest, buildAiRecoveryMemoryDiagnostic, latestTaskStatus, type AiTaskWorkflowItem } from "@/lib/ai/taskWorkflow";
import { buildPlatformStyleScore, type PlatformStyleChapterCard } from "@/lib/chapters/platformStyleScore";
import { isChapterRevisionCandidate, type ChapterRevisionSummary } from "@/lib/chapters/revisions";
import type { PlatformProfile } from "@/lib/platforms/platformProfiles";

interface ReviewIssue {
  severity: string;
  type: string;
  message: string;
  suggestion: string;
}

interface ReviewResult {
  score: number;
  issues: ReviewIssue[];
  summary: string;
}

interface OpeningDiagnosticItem {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  score: number;
  evidence: string;
  suggestion: string;
}

interface OpeningDiagnostic {
  score: number;
  verdict: string;
  excerpt: string;
  wordCount: number;
  items: OpeningDiagnosticItem[];
  rewritePlan: string[];
  platformFocus: string[];
  markdown: string;
}

interface OpeningRewriteVariant {
  id: string;
  name: string;
  strategy: string;
  targetReader: string;
  estimatedScore: number;
  openingText: string;
  fixes: string[];
  platformNote: string;
}

interface OpeningRewritePackage {
  diagnostic: OpeningDiagnostic;
  variants: OpeningRewriteVariant[];
  recommendedVariantId: string;
  markdown: string;
}

interface WorkflowPayload {
  chapter: {
    title: string;
    status: string;
    wordCount: number;
  };
  activeProvider: {
    providerId: string;
    displayName: string;
    model: string;
    enabled: boolean;
    hasApiKey: boolean;
    baseUrl: string | null;
  };
  modelRoute: Array<{
    role: "primary" | "fallback" | "auto" | "forced";
    providerId: string;
    displayName: string;
    model: string;
    enabled: boolean;
    hasApiKey: boolean;
  }>;
  tasks: AiTaskWorkflowItem[];
}

interface BudgetRepairAction {
  id: string;
  label: string;
  detail: string;
  impact: string;
}

interface BudgetGuardView {
  summary: string;
  repairActions: BudgetRepairAction[];
}

interface AdoptRevisionResponse {
  nextAction?: {
    label: string;
    detail: string;
    href: string;
  };
}

function statusText(status: string) {
  const labels: Record<string, string> = {
    queued: "排队中",
    running: "运行中",
    succeeded: "成功",
    failed: "失败",
    not_started: "未开始",
  };
  return labels[status] ?? status;
}

function parseReview(outputText: string | null) {
  if (!outputText) return null;
  try {
    return JSON.parse(outputText) as ReviewResult;
  } catch {
    return null;
  }
}

function modelRouteRoleLabel(role: "primary" | "fallback" | "auto" | "forced") {
  if (role === "primary") return "首选";
  if (role === "fallback") return "备用";
  if (role === "forced") return "指定";
  return "自动";
}

export function ChapterWorkflowPanel({
  projectId,
  chapterId,
  platform,
  chapterCard,
}: {
  projectId: string;
  chapterId: string;
  platform: PlatformProfile;
  chapterCard: PlatformStyleChapterCard;
}) {
  const router = useRouter();
  const [workflow, setWorkflow] = useState<WorkflowPayload | null>(null);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isDiagnosingOpening, setIsDiagnosingOpening] = useState(false);
  const [isDownloadingDiagnostic, setIsDownloadingDiagnostic] = useState(false);
  const [isRewritingOpening, setIsRewritingOpening] = useState(false);
  const [isDownloadingRewrite, setIsDownloadingRewrite] = useState(false);
  const [isSavingRevision, setIsSavingRevision] = useState(false);
  const [restoringRevisionId, setRestoringRevisionId] = useState<string | null>(null);
  const [adoptingRevisionId, setAdoptingRevisionId] = useState<string | null>(null);
  const [isControllingRecoveryMemory, setIsControllingRecoveryMemory] = useState(false);
  const [revisions, setRevisions] = useState<ChapterRevisionSummary[]>([]);
  const [selectedRevision, setSelectedRevision] = useState<ChapterRevisionSummary | null>(null);
  const [openingDiagnostic, setOpeningDiagnostic] = useState<OpeningDiagnostic | null>(null);
  const [openingRewrite, setOpeningRewrite] = useState<OpeningRewritePackage | null>(null);
  const [budgetGuard, setBudgetGuard] = useState<BudgetGuardView | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const groupedIssues = useMemo(
    () => (reviewResult ? nonEmptyReviewGroups(groupReviewIssues(reviewResult.issues)) : []),
    [reviewResult],
  );
  const styleScore = useMemo(() => buildPlatformStyleScore({ platform, chapter: chapterCard }), [platform, chapterCard]);
  const latestDraftStatus = workflow ? latestTaskStatus(workflow.tasks, "chapter_draft") : "not_started";
  const latestReviewStatus = workflow ? latestTaskStatus(workflow.tasks, "chapter_review") : "not_started";
  const recoveryMemoryDiagnostic = useMemo(
    () => (workflow ? buildAiRecoveryMemoryDiagnostic(workflow.tasks) : null),
    [workflow],
  );

  async function loadWorkflow() {
    const response = await fetch(`/api/ai/tasks/chapter-workflow?chapterId=${chapterId}`);
    if (!response.ok) return;
    const payload = (await response.json()) as WorkflowPayload;
    setWorkflow(payload);
    const latestReview = payload.tasks.find((task) => task.taskType === "chapter_review" && task.outputText);
    const parsedReview = parseReview(latestReview?.outputText ?? null);
    if (parsedReview) setReviewResult(parsedReview);
  }

  async function loadRevisions() {
    const response = await fetch(`/api/chapters/${chapterId}/revisions`);
    if (!response.ok) return;
    const payload = (await response.json()) as { revisions: ChapterRevisionSummary[] };
    setRevisions(payload.revisions);
    setSelectedRevision((current) => {
      if (!current) return payload.revisions[0] ?? null;
      return payload.revisions.find((revision) => revision.id === current.id) ?? payload.revisions[0] ?? null;
    });
  }

  useEffect(() => {
    void loadWorkflow();
    void loadRevisions();
  }, [chapterId]);

  async function generateDraft() {
    if (!styleScore.canGenerate) {
      setMessage(`生成前体检 ${styleScore.score} 分：先补强章节卡再生成。`);
      return;
    }
    setIsGeneratingDraft(true);
    setMessage(null);
    setBudgetGuard(null);
    try {
      const response = await fetch("/api/ai/tasks/chapter-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId, targetWords: 1200 }),
      });

      const payload = (await response.json()) as {
        error?: string;
        candidateRevision?: { id: string };
        draftQuality?: { score: number; shouldSecondPass: boolean; treeAudit?: { score: number; label: string } };
        storyTreeDispatches?: Array<{ dispatchKey: string }>;
        budgetGuard?: BudgetGuardView;
        attempts?: Array<{ status: "succeeded" | "failed"; role: string; displayName: string; model: string }>;
      };
      if (!response.ok) {
        if (payload.budgetGuard) setBudgetGuard(payload.budgetGuard);
        throw new Error(payload.error || "生成正文失败。");
      }
      const fallbackUsed = payload.attempts?.some((attempt) => attempt.status === "failed");
      const dispatchText = payload.storyTreeDispatches?.length ? `，已派发 ${payload.storyTreeDispatches.length} 个结构返工任务` : "";
      setMessage(payload.draftQuality
        ? `已生成 AI 初稿候选${fallbackUsed ? "，已自动切换备用模型" : ""}，自动体检 ${payload.draftQuality.score} 分，大树结构 ${payload.draftQuality.treeAudit?.score ?? "缺"} 分${dispatchText}${payload.draftQuality.shouldSecondPass ? "，采纳前建议先看候选稿。" : "，采纳后才会进入正文。"}`
        : "已生成 AI 初稿候选，采纳后才会进入正文。");
      await loadWorkflow();
      await loadRevisions();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "生成正文失败。");
    } finally {
      setIsGeneratingDraft(false);
    }
  }

  async function saveRevision() {
    setIsSavingRevision(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/chapters/${chapterId}/revisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: "作者手动保存快照。" }),
      });

      if (!response.ok) {
        throw new Error("保存快照失败。");
      }

      setMessage("已保存章节快照");
      await loadRevisions();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "保存快照失败。");
    } finally {
      setIsSavingRevision(false);
    }
  }

  async function restoreRevision(revisionId: string) {
    setRestoringRevisionId(revisionId);
    setMessage(null);
    try {
      const response = await fetch(`/api/chapters/${chapterId}/revisions/${revisionId}/restore`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("回滚版本失败。");
      }

      setMessage("已回滚到所选版本");
      await loadWorkflow();
      await loadRevisions();
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "回滚版本失败。");
    } finally {
      setRestoringRevisionId(null);
    }
  }

  async function adoptRevision(revisionId: string) {
    setAdoptingRevisionId(revisionId);
    setMessage(null);
    try {
      const response = await fetch(`/api/chapters/${chapterId}/revisions/${revisionId}/adopt`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("采纳候选稿失败。");
      }

      const payload = await response.json().catch(() => null) as AdoptRevisionResponse | null;
      setMessage(payload?.nextAction
        ? `已采纳候选稿并写入正文。下一步：${payload.nextAction.label}，${payload.nextAction.detail}`
        : "已采纳候选稿并写入正文。下一步请重新审稿。");
      await loadWorkflow();
      await loadRevisions();
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "采纳候选稿失败。");
    } finally {
      setAdoptingRevisionId(null);
    }
  }

  async function rollbackRecoveryMemoryFromDiagnostic() {
    const request = buildAiRecoveryMemoryControlRequest({
      projectId,
      chapterId,
      chapterTitle: workflow?.chapter.title ?? chapterCard.title,
      diagnostic: recoveryMemoryDiagnostic,
    });
    if (!request) return;

    setIsControllingRecoveryMemory(true);
    setMessage(null);
    try {
      const response = await fetch(request.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request.body),
      });
      const payload = await response.json() as { message?: string; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "写入恢复记忆回滚失败。");
      }
      setMessage(payload.message ?? "已写入恢复记忆回滚。");
      await loadWorkflow();
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "写入恢复记忆回滚失败。");
    } finally {
      setIsControllingRecoveryMemory(false);
    }
  }

  async function runReview() {
    setIsReviewing(true);
    setMessage(null);
    setBudgetGuard(null);
    try {
      const response = await fetch("/api/ai/tasks/chapter-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId }),
      });

      const payload = (await response.json()) as {
        error?: string;
        result?: ReviewResult;
        budgetGuard?: BudgetGuardView;
        attempts?: Array<{ status: "succeeded" | "failed"; role: string; displayName: string; model: string }>;
      };
      if (!response.ok) {
        if (payload.budgetGuard) setBudgetGuard(payload.budgetGuard);
        throw new Error(payload.error || "审稿失败。");
      }
      const fallbackUsed = payload.attempts?.some((attempt) => attempt.status === "failed");
      if (payload.result) setReviewResult(payload.result);
      setMessage(`已完成章节审稿${fallbackUsed ? "，已自动切换备用模型" : ""}`);
      await loadWorkflow();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "审稿失败。");
    } finally {
      setIsReviewing(false);
    }
  }

  async function runOpeningDiagnostic() {
    setIsDiagnosingOpening(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/chapters/${chapterId}/opening-diagnostic`);
      if (!response.ok) {
        throw new Error("黄金三秒诊断失败。");
      }
      const payload = (await response.json()) as { diagnostic: OpeningDiagnostic };
      setOpeningDiagnostic(payload.diagnostic);
      setMessage("已完成黄金三秒诊断");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "黄金三秒诊断失败。");
    } finally {
      setIsDiagnosingOpening(false);
    }
  }

  async function copyOpeningDiagnostic() {
    if (!openingDiagnostic) return;
    await navigator.clipboard.writeText(openingDiagnostic.markdown);
    setMessage("已复制黄金三秒诊断");
  }

  async function downloadOpeningDiagnostic() {
    setIsDownloadingDiagnostic(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/chapters/${chapterId}/opening-diagnostic?format=markdown`);
      if (!response.ok) {
        throw new Error("下载诊断失败。");
      }
      const markdown = await response.text();
      const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "黄金三秒诊断.md";
      link.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "下载诊断失败。");
    } finally {
      setIsDownloadingDiagnostic(false);
    }
  }

  async function runOpeningRewrite() {
    setIsRewritingOpening(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/chapters/${chapterId}/opening-rewrite`);
      if (!response.ok) {
        throw new Error("开头重写失败。");
      }
      const payload = (await response.json()) as { rewritePackage: OpeningRewritePackage };
      setOpeningRewrite(payload.rewritePackage);
      setOpeningDiagnostic(payload.rewritePackage.diagnostic);
      setMessage("已生成首章开头重写");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "开头重写失败。");
    } finally {
      setIsRewritingOpening(false);
    }
  }

  async function copyOpeningRewrite() {
    if (!openingRewrite) return;
    await navigator.clipboard.writeText(openingRewrite.markdown);
    setMessage("已复制首章开头重写");
  }

  async function copyOpeningVariant(variant: OpeningRewriteVariant) {
    await navigator.clipboard.writeText(variant.openingText);
    setMessage(`已复制${variant.name}`);
  }

  async function downloadOpeningRewrite() {
    setIsDownloadingRewrite(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/chapters/${chapterId}/opening-rewrite?format=markdown`);
      if (!response.ok) {
        throw new Error("下载重写失败。");
      }
      const markdown = await response.text();
      const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "首章开头重写.md";
      link.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "下载重写失败。");
    } finally {
      setIsDownloadingRewrite(false);
    }
  }

  return (
    <aside className="grid gap-4">
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <div className="mb-4 rounded-md bg-slate-50 p-3 text-sm text-slate-600">
          <div className="font-medium text-slate-900">{platform.name} 平台提醒</div>
          <div className="mt-2">开头：{platform.openingRules.join("；")}</div>
          <div className="mt-1">审稿：{platform.reviewFocus.join("、")}</div>
        </div>
        <h2 className="font-medium">AI 工作流</h2>
        <div className="mt-3 grid gap-2 text-sm text-slate-600">
          <div>当前模型：{workflow ? `${workflow.activeProvider.displayName} · ${workflow.activeProvider.model}` : "读取中"}</div>
          <div>正文生成：{statusText(latestDraftStatus)}</div>
          <div>章节审稿：{statusText(latestReviewStatus)}</div>
          {workflow?.activeProvider.providerId !== "mock" && !workflow?.activeProvider.hasApiKey ? (
            <div className="rounded-md bg-amber-50 p-2 text-amber-700">当前模型未配置 Key，会优先使用可用模型或 Mock。</div>
          ) : null}
        </div>
        {workflow?.modelRoute.length ? (
          <div className="mt-3 rounded-md border border-slate-200 p-3">
            <div className="text-xs font-medium text-slate-500">正文生成调用链</div>
            <div className="mt-2 grid gap-2">
              {workflow.modelRoute.map((candidate, index) => (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-2 text-xs" key={`${candidate.role}-${candidate.providerId}-${candidate.model}-${index}`}>
                  <span className="font-medium text-slate-800">
                    {index + 1}. {modelRouteRoleLabel(candidate.role)} · {candidate.displayName}
                  </span>
                  <span className="text-slate-500">{candidate.model}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div className={`mt-4 rounded-md p-3 text-sm ${styleScore.canGenerate ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="font-medium">生成前体检</div>
            <div className="text-lg font-semibold">{styleScore.score}</div>
          </div>
          <p className="mt-1">{styleScore.verdict}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {styleScore.platformMustHave.map((item) => (
              <span className="rounded-md bg-white/70 px-2 py-1 text-xs" key={item}>
                {item}
              </span>
            ))}
          </div>
          {styleScore.priorityFixes.length > 0 ? (
            <div className="mt-3 grid gap-1">
              {styleScore.priorityFixes.map((fix) => (
                <div key={fix}>补强：{fix}</div>
              ))}
            </div>
          ) : null}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            disabled={isGeneratingDraft || !styleScore.canGenerate}
            onClick={generateDraft}
            type="button"
          >
            {isGeneratingDraft ? "生成中" : "生成正文"}
          </button>
          <button
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            disabled={isReviewing}
            onClick={runReview}
            type="button"
          >
            {isReviewing ? "审稿中" : "运行审稿"}
          </button>
          <button
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            disabled={isDiagnosingOpening}
            onClick={runOpeningDiagnostic}
            type="button"
          >
            {isDiagnosingOpening ? "诊断中" : "黄金三秒"}
          </button>
          <button
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            disabled={isRewritingOpening}
            onClick={runOpeningRewrite}
            type="button"
          >
            {isRewritingOpening ? "重写中" : "开头重写"}
          </button>
        </div>
        {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
        {budgetGuard ? (
          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="font-medium">预算修复建议</div>
            <p className="mt-1">{budgetGuard.summary}</p>
            <div className="mt-3 grid gap-2">
              {budgetGuard.repairActions.map((action) => (
                <div className="rounded-md bg-white/70 p-3" key={action.id}>
                  <div className="font-medium">{action.label}</div>
                  <p className="mt-1">{action.detail}</p>
                  <p className="mt-1 text-xs">{action.impact}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-medium">黄金三秒诊断</h3>
          {openingDiagnostic ? (
            <div className="flex gap-2">
              <button className="text-xs text-slate-500 hover:text-slate-900" onClick={copyOpeningDiagnostic} type="button">
                复制
              </button>
              <button
                className="text-xs text-slate-500 hover:text-slate-900 disabled:opacity-50"
                disabled={isDownloadingDiagnostic}
                onClick={downloadOpeningDiagnostic}
                type="button"
              >
                {isDownloadingDiagnostic ? "下载中" : "下载"}
              </button>
            </div>
          ) : null}
        </div>
        {openingDiagnostic ? (
          <div className="mt-4 grid gap-3 text-sm">
            <div className="rounded-md bg-slate-50 p-3">
              <div className="text-xs text-slate-500">评分</div>
              <div className="mt-1 text-2xl font-semibold text-slate-950">{openingDiagnostic.score}</div>
              <p className="mt-2 text-slate-600">{openingDiagnostic.verdict}</p>
            </div>
            <div className="rounded-md border border-slate-200 p-3">
              <div className="text-xs font-medium text-slate-500">检测窗口 · {openingDiagnostic.wordCount} 字</div>
              <p className="mt-2 line-clamp-4 text-slate-700">{openingDiagnostic.excerpt || "正文为空。"}</p>
            </div>
            <div className="grid gap-2">
              {openingDiagnostic.items.map((entry) => (
                <div className="rounded-md bg-slate-50 p-3" key={entry.id}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-900">{entry.label}</span>
                    <span className="text-xs text-slate-500">
                      {entry.status} · {entry.score}
                    </span>
                  </div>
                  <p className="mt-1 text-slate-600">{entry.evidence}</p>
                  <p className="mt-1 text-slate-500">{entry.suggestion}</p>
                </div>
              ))}
            </div>
            <div className="rounded-md border border-slate-200 p-3">
              <div className="font-medium">修订顺序</div>
              <div className="mt-2 grid gap-2 text-slate-600">
                {openingDiagnostic.rewritePlan.map((step, index) => (
                  <div key={step}>{index + 1}. {step}</div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-600">检查第一章前 800 字：首句钩子、主角处境、不可逆危机、选择压力和平台适配。</p>
        )}
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-medium">首章重写助手</h3>
          {openingRewrite ? (
            <div className="flex gap-2">
              <button className="text-xs text-slate-500 hover:text-slate-900" onClick={copyOpeningRewrite} type="button">
                复制全部
              </button>
              <button
                className="text-xs text-slate-500 hover:text-slate-900 disabled:opacity-50"
                disabled={isDownloadingRewrite}
                onClick={downloadOpeningRewrite}
                type="button"
              >
                {isDownloadingRewrite ? "下载中" : "下载"}
              </button>
            </div>
          ) : null}
        </div>
        {openingRewrite ? (
          <div className="mt-4 grid gap-3 text-sm">
            {openingRewrite.variants.map((variant) => (
              <div className="rounded-md border border-slate-200 p-3" key={variant.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-950">
                      {variant.name}
                      {variant.id === openingRewrite.recommendedVariantId ? (
                        <span className="ml-2 text-xs font-normal text-slate-500">推荐</span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">预估 {variant.estimatedScore} · {variant.platformNote}</p>
                  </div>
                  <button
                    className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    onClick={() => copyOpeningVariant(variant)}
                    type="button"
                  >
                    复制正文
                  </button>
                </div>
                <div className="mt-3 grid gap-2 text-slate-600">
                  <div>
                    <span className="font-medium text-slate-900">策略：</span>
                    {variant.strategy}
                  </div>
                  <div>
                    <span className="font-medium text-slate-900">读者：</span>
                    {variant.targetReader}
                  </div>
                </div>
                <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-xs leading-5 text-slate-700">
                  {variant.openingText}
                </pre>
                <div className="mt-3 grid gap-1 text-xs text-slate-500">
                  {variant.fixes.map((fix) => (
                    <div key={fix}>{fix}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-600">基于黄金三秒诊断，生成 3 套可复制的首章开头改写版本。</p>
        )}
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4">
        <h3 className="font-medium">审稿结果</h3>
        {reviewResult ? (
          <div className="mt-4 grid gap-3 text-sm">
            <div className="font-medium">评分：{reviewResult.score}</div>
            <p className="text-slate-600">{reviewResult.summary}</p>
            {groupedIssues.map((group) => (
              <div key={group.label} className="rounded-md border border-slate-200 p-3">
                <div className="font-medium">{group.label}</div>
                <div className="mt-2 grid gap-2">
                  {group.issues.map((issue, index) => (
                    <div key={`${issue.type}-${index}`} className="rounded-md bg-slate-50 p-3">
                      <div className="font-medium">
                        {issue.severity} · {issue.type}
                      </div>
                      <p className="mt-1 text-slate-700">{issue.message}</p>
                      <p className="mt-1 text-slate-500">{issue.suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-600">运行审稿后，这里会按钩子、冲突、节奏、人物和平台适配归类。</p>
        )}
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-medium">AI 任务时间线</h3>
          <button className="text-xs text-slate-500 hover:text-slate-900" onClick={loadWorkflow} type="button">
            刷新
          </button>
        </div>
        <div className="grid gap-2">
          {recoveryMemoryDiagnostic && recoveryMemoryDiagnostic.status !== "empty" ? (
            <div className={`rounded-md border p-3 text-xs leading-5 ${
              recoveryMemoryDiagnostic.status === "rollback"
                ? "border-rose-200 bg-rose-50 text-rose-800"
                : recoveryMemoryDiagnostic.status === "watch"
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{recoveryMemoryDiagnostic.label}</span>
                {recoveryMemoryDiagnostic.status === "rollback" ? (
                  <button
                    className="rounded-md bg-rose-700 px-2 py-1 text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isControllingRecoveryMemory}
                    onClick={() => void rollbackRecoveryMemoryFromDiagnostic()}
                    type="button"
                  >
                    {isControllingRecoveryMemory ? "写入中" : recoveryMemoryDiagnostic.actionLabel}
                  </button>
                ) : (
                  <span>{recoveryMemoryDiagnostic.actionLabel}</span>
                )}
              </div>
              <p className="mt-1">{recoveryMemoryDiagnostic.detail}</p>
              {recoveryMemoryDiagnostic.sourceLabel ? <p className="mt-1">来源：{recoveryMemoryDiagnostic.sourceLabel}</p> : null}
              {recoveryMemoryDiagnostic.evidence.length ? (
                <div className="mt-2 grid gap-1">
                  {recoveryMemoryDiagnostic.evidence.map((evidence) => (
                    <p className="rounded-md bg-white/70 px-2 py-1" key={evidence}>{evidence}</p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          {workflow?.tasks.map((task) => (
            <button
              className="rounded-md bg-slate-50 p-3 text-left text-xs text-slate-600 hover:bg-slate-100"
              key={task.id}
              onClick={() => {
                if (task.taskType === "chapter_review") {
                  const parsed = parseReview(task.outputText);
                  if (parsed) setReviewResult(parsed);
                }
              }}
              type="button"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-slate-900">{task.label}</span>
                <span>{statusText(task.status)}</span>
              </div>
              <div className="mt-1">
                {task.providerName} · {task.model}
              </div>
              {task.recoveryMemoryAudit ? (
                <div className="mt-2 rounded-md bg-emerald-50 px-2 py-1 text-emerald-800">
                  <div className="font-medium">恢复记忆 · {task.recoveryMemoryAudit.lifecycleLabel}</div>
                  <div className="mt-1 line-clamp-2">{task.recoveryMemoryAudit.sourceLabel}：{task.recoveryMemoryAudit.summary}</div>
                </div>
              ) : null}
              <div className="mt-1">{new Date(task.createdAt).toLocaleString()}</div>
              {task.outputPreview ? <div className="mt-2 line-clamp-2">{task.outputPreview}</div> : null}
              {task.errorMessage ? <div className="mt-2 text-red-600">{task.errorMessage}</div> : null}
            </button>
          ))}
          {workflow && workflow.tasks.length === 0 ? <p className="text-sm text-slate-600">还没有 AI 任务。</p> : null}
          {!workflow ? <p className="text-sm text-slate-600">正在读取 AI 任务。</p> : null}
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-medium">版本快照</h3>
          <button
            className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
            disabled={isSavingRevision}
            onClick={saveRevision}
            type="button"
          >
            {isSavingRevision ? "保存中" : "保存快照"}
          </button>
        </div>
        <div className="grid gap-2">
          {revisions.map((revision) => (
            <button
              className={`rounded-md p-3 text-left text-xs ${selectedRevision?.id === revision.id ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
              key={revision.id}
              onClick={() => setSelectedRevision(revision)}
              type="button"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{revision.sourceLabel}</span>
                <span>{revision.wordCount} 字</span>
              </div>
              {isChapterRevisionCandidate(revision.source) ? (
                <div className={selectedRevision?.id === revision.id ? "mt-1 text-slate-200" : "mt-1 text-emerald-700"}>
                  待作者采纳，尚未覆盖正文
                </div>
              ) : null}
              <div className="mt-1">{new Date(revision.createdAt).toLocaleString()}</div>
              <div className="mt-2 line-clamp-2">{revision.preview}</div>
            </button>
          ))}
          {revisions.length === 0 ? <p className="text-sm text-slate-600">还没有版本快照。AI 重写前会自动保存旧稿。</p> : null}
        </div>
        {selectedRevision ? (
          <div className="mt-4 rounded-md border border-slate-200 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">{selectedRevision.title}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {selectedRevision.sourceLabel} · {selectedRevision.status} · {selectedRevision.wordCount} 字
                </div>
              </div>
              <button
                className="rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                disabled={restoringRevisionId === selectedRevision.id || adoptingRevisionId === selectedRevision.id}
                onClick={() => {
                  if (isChapterRevisionCandidate(selectedRevision.source)) {
                    void adoptRevision(selectedRevision.id);
                  } else {
                    void restoreRevision(selectedRevision.id);
                  }
                }}
                type="button"
              >
                {adoptingRevisionId === selectedRevision.id
                  ? "采纳中"
                  : restoringRevisionId === selectedRevision.id
                    ? "回滚中"
                    : isChapterRevisionCandidate(selectedRevision.source)
                      ? "采纳候选"
                      : "回滚"}
              </button>
            </div>
            <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-xs leading-5 text-slate-700">
              {selectedRevision.content || "空正文"}
            </pre>
          </div>
        ) : null}
      </section>
    </aside>
  );
}
