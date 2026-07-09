"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type SecondPassMode = "more_hook" | "more_payoff" | "less_exposition" | "more_emotion" | "platform_fit";

interface ReviewPipelineCandidate {
  chapterId: string;
  order: number;
  title: string;
  wordCount: number;
  reviewStatus: "ready" | "empty" | "running" | "reviewed";
  secondPassStatus: "ready" | "blocked" | "running" | "done";
  reviewScore: number | null;
  issueCount: number;
  instruction: string;
  secondPassMode: SecondPassMode;
  reason: string;
  recommendedReview: boolean;
  recommendedSecondPass: boolean;
}

interface ProjectStartTacticSummary {
  title: string;
  label: string;
  primaryTactic: string;
  openingMove: string;
  verificationMove: string;
  risk: string;
}

interface ReviewPipelineQueue {
  totalCandidates: number;
  reviewReadyCount: number;
  secondPassReadyCount: number;
  recommendedReviewChapterIds: string[];
  recommendedSecondPassChapterIds: string[];
  startTactic: ProjectStartTacticSummary | null;
  warnings: string[];
  candidates: ReviewPipelineCandidate[];
}

interface ActiveProvider {
  providerId: string;
  displayName: string;
  model: string;
  enabled: boolean;
  hasApiKey: boolean;
  baseUrl: string | null;
}

interface BatchPipelineResult {
  chapterId: string;
  status: "succeeded" | "failed";
  chapterTitle: string;
  taskId: string;
  score?: number | null;
  issueCount?: number;
  wordCount?: number;
  shouldSecondPass?: boolean;
  error: string | null;
}

interface BatchRouteEffectSummary {
  totalTasks: number;
  succeededTasks: number;
  failedTasks: number;
  successRatePercent: number;
  totalTokens: number;
  knownCostUsd: number;
  averageCostPerSucceededTaskUsd: number;
  averageQualityScore: number | null;
  primaryTasks: number;
  fallbackTasks: number;
  autoTasks: number;
  providerLabels: string[];
  verdict: string;
}

interface BudgetRepairAction {
  id: string;
  kind: "set_batch_size" | "lower_target_words" | "switch_to_review" | "inspect_failures" | "open_budget_settings";
  label: string;
  detail: string;
  impact: string;
  recommendedBatchSize?: number;
  targetWordsMultiplier?: number;
  href?: string;
}

interface BudgetGuardView {
  summary: string;
  repairActions: BudgetRepairAction[];
}

interface BudgetPreviewView extends BudgetGuardView {
  status: "safe" | "warn" | "block";
  estimatedTaskCostUsd: number;
  estimatedBatchCostUsd: number;
  projectedUsedUsd: number;
  monthlyBudgetUsd: number;
  usedUsd: number;
  remainingBudgetUsd: number;
  recommendedBatchSize: number;
  failureRatePercent: number;
}

interface RouteRecommendationView {
  taskType: string;
  label: string;
  status: "ready" | "current" | "insufficient";
  recommendedPrimaryProviderConfigId: string | null;
  recommendedFallbackProviderConfigId: string | null;
  primaryProviderName: string;
  fallbackProviderName: string | null;
  sampleTasks: number;
  successRatePercent: number;
  averageQualityScore: number;
  averageCostPerSucceededTaskUsd: number;
  avoidance: {
    status: "none" | "applied";
    appliedRules: number;
    reason: string | null;
    evidence: string[];
  };
  explanation: {
    headline: string;
    items: Array<{
      id: "history" | "cost" | "governance_recheck" | "avoidance";
      label: string;
      value: string;
      detail: string;
      tone: "positive" | "warning" | "neutral";
    }>;
  };
  reason: string;
}

function reviewStatusLabel(status: ReviewPipelineCandidate["reviewStatus"]) {
  const labels = {
    ready: "待审稿",
    empty: "无正文",
    running: "审稿中",
    reviewed: "已审稿",
  };
  return labels[status];
}

function secondPassStatusLabel(status: ReviewPipelineCandidate["secondPassStatus"]) {
  const labels = {
    ready: "可二改",
    blocked: "未就绪",
    running: "二改中",
    done: "已二改",
  };
  return labels[status];
}

function modeLabel(mode: SecondPassMode) {
  const labels = {
    more_hook: "强钩子",
    more_payoff: "强爽点",
    less_exposition: "少解释",
    more_emotion: "强情绪",
    platform_fit: "平台适配",
  };
  return labels[mode];
}

function hrefWithGateReturn(href: string, gateReturnHref?: string | null) {
  if (!gateReturnHref || !href.startsWith("/") || href.startsWith("/gate")) return href;

  const hashIndex = href.indexOf("#");
  const base = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";
  if (base.includes("gateReturn=")) return href;
  const separator = base.includes("?") ? "&" : "?";

  return `${base}${separator}gateReturn=${encodeURIComponent(gateReturnHref)}${hash}`;
}

export function BatchReviewPipelinePanel({
  projectId,
  gateReturnHref,
}: {
  projectId: string;
  gateReturnHref?: string | null;
}) {
  const [queue, setQueue] = useState<ReviewPipelineQueue | null>(null);
  const [activeProvider, setActiveProvider] = useState<ActiveProvider | null>(null);
  const [selectedReviewIds, setSelectedReviewIds] = useState<string[]>([]);
  const [selectedSecondPassIds, setSelectedSecondPassIds] = useState<string[]>([]);
  const [targetWords, setTargetWords] = useState(1200);
  const [results, setResults] = useState<BatchPipelineResult[]>([]);
  const [routeEffectSummary, setRouteEffectSummary] = useState<BatchRouteEffectSummary | null>(null);
  const [budgetGuard, setBudgetGuard] = useState<BudgetGuardView | null>(null);
  const [reviewBudgetPreview, setReviewBudgetPreview] = useState<BudgetPreviewView | null>(null);
  const [secondPassBudgetPreview, setSecondPassBudgetPreview] = useState<BudgetPreviewView | null>(null);
  const [reviewRouteRecommendation, setReviewRouteRecommendation] = useState<RouteRecommendationView | null>(null);
  const [secondPassRouteRecommendation, setSecondPassRouteRecommendation] = useState<RouteRecommendationView | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [runningAction, setRunningAction] = useState<"review" | "second_pass" | null>(null);
  const [lastBudgetAction, setLastBudgetAction] = useState<"review" | "second_pass" | null>(null);
  const [applyingRouteType, setApplyingRouteType] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const reviewReadyIds = useMemo(
    () => queue?.candidates.filter((candidate) => candidate.reviewStatus === "ready").map((candidate) => candidate.chapterId) ?? [],
    [queue],
  );
  const secondPassReadyIds = useMemo(
    () => queue?.candidates.filter((candidate) => candidate.secondPassStatus === "ready").map((candidate) => candidate.chapterId) ?? [],
    [queue],
  );

  const loadQueue = useCallback(async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/batch-review`);
      if (!response.ok) {
        throw new Error("读取批量审稿队列失败。");
      }
      const payload = (await response.json()) as {
        queue: ReviewPipelineQueue;
        activeProvider: ActiveProvider;
        reviewBudgetPreview?: BudgetPreviewView;
        secondPassBudgetPreview?: BudgetPreviewView;
        reviewRouteRecommendation?: RouteRecommendationView | null;
        secondPassRouteRecommendation?: RouteRecommendationView | null;
      };
      setQueue(payload.queue);
      setActiveProvider(payload.activeProvider);
      if (payload.reviewBudgetPreview) setReviewBudgetPreview(payload.reviewBudgetPreview);
      if (payload.secondPassBudgetPreview) setSecondPassBudgetPreview(payload.secondPassBudgetPreview);
      setReviewRouteRecommendation(payload.reviewRouteRecommendation ?? null);
      setSecondPassRouteRecommendation(payload.secondPassRouteRecommendation ?? null);
      setSelectedReviewIds((current) => {
        const kept = current.filter((chapterId) => payload.queue.recommendedReviewChapterIds.includes(chapterId));
        return kept.length ? kept : payload.queue.recommendedReviewChapterIds;
      });
      setSelectedSecondPassIds((current) => {
        const kept = current.filter((chapterId) => payload.queue.recommendedSecondPassChapterIds.includes(chapterId));
        return kept.length ? kept : payload.queue.recommendedSecondPassChapterIds;
      });
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "读取批量审稿队列失败。");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  async function runBatch(action: "review" | "second_pass") {
    const chapterIds = action === "review" ? selectedReviewIds : selectedSecondPassIds;
    setRunningAction(action);
    setLastBudgetAction(action);
    setMessage(null);
    setBudgetGuard(null);
    setResults([]);
    setRouteEffectSummary(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/batch-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, chapterIds, targetWords }),
      });
      const payload = await response.json() as {
        results?: BatchPipelineResult[];
        routeEffectSummary?: BatchRouteEffectSummary;
        queue?: ReviewPipelineQueue;
        activeProvider?: ActiveProvider;
        error?: string;
        guard?: { warnings?: string[] };
        budgetGuard?: BudgetGuardView;
        reviewBudgetPreview?: BudgetPreviewView;
        secondPassBudgetPreview?: BudgetPreviewView;
        reviewRouteRecommendation?: RouteRecommendationView | null;
        secondPassRouteRecommendation?: RouteRecommendationView | null;
      };
      if (!response.ok) {
        if (payload.budgetGuard) setBudgetGuard(payload.budgetGuard);
        if (payload.reviewBudgetPreview) setReviewBudgetPreview(payload.reviewBudgetPreview);
        if (payload.secondPassBudgetPreview) setSecondPassBudgetPreview(payload.secondPassBudgetPreview);
        setReviewRouteRecommendation(payload.reviewRouteRecommendation ?? null);
        setSecondPassRouteRecommendation(payload.secondPassRouteRecommendation ?? null);
        throw new Error([payload.error, ...(payload.guard?.warnings ?? [])].filter(Boolean).join(" "));
      }
      setResults(payload.results ?? []);
      setRouteEffectSummary(payload.routeEffectSummary ?? null);
      if (payload.queue) setQueue(payload.queue);
      if (payload.activeProvider) setActiveProvider(payload.activeProvider);
      if (payload.reviewBudgetPreview) setReviewBudgetPreview(payload.reviewBudgetPreview);
      if (payload.secondPassBudgetPreview) setSecondPassBudgetPreview(payload.secondPassBudgetPreview);
      setReviewRouteRecommendation(payload.reviewRouteRecommendation ?? null);
      setSecondPassRouteRecommendation(payload.secondPassRouteRecommendation ?? null);
      setSelectedReviewIds(payload.queue?.recommendedReviewChapterIds ?? []);
      setSelectedSecondPassIds(payload.queue?.recommendedSecondPassChapterIds ?? []);
      const succeeded = (payload.results ?? []).filter((result) => result.status === "succeeded").length;
      const failed = (payload.results ?? []).filter((result) => result.status === "failed").length;
      setMessage(`${action === "review" ? "批量审稿" : "批量二改"}完成：成功 ${succeeded} 章，失败 ${failed} 章。`);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "批量处理失败。");
    } finally {
      setRunningAction(null);
    }
  }

  function toggleReview(chapterId: string) {
    setSelectedReviewIds((current) => (
      current.includes(chapterId)
        ? current.filter((id) => id !== chapterId)
        : [...current, chapterId].slice(0, 5)
    ));
  }

  function toggleSecondPass(chapterId: string) {
    setSelectedSecondPassIds((current) => (
      current.includes(chapterId)
        ? current.filter((id) => id !== chapterId)
        : [...current, chapterId].slice(0, 5)
    ));
  }

  function buttonLabel(action: BudgetRepairAction) {
    const labels: Record<BudgetRepairAction["kind"], string> = {
      set_batch_size: "应用批量",
      lower_target_words: "应用字数",
      switch_to_review: "改走审稿",
      inspect_failures: "查看失败",
      open_budget_settings: "打开预算",
    };
    return labels[action.kind];
  }

  function applyBudgetRepair(action: BudgetRepairAction) {
    if (action.kind === "set_batch_size") {
      const targetAction = lastBudgetAction ?? (selectedSecondPassIds.length ? "second_pass" : "review");
      const sourceIds = targetAction === "review" ? selectedReviewIds : selectedSecondPassIds;
      const fallbackIds = sourceIds.length ? sourceIds : targetAction === "review" ? reviewReadyIds : secondPassReadyIds;
      const nextSize = Math.max(1, Math.min(action.recommendedBatchSize ?? 1, fallbackIds.length || 1, 5));
      if (targetAction === "review") {
        setSelectedReviewIds(fallbackIds.slice(0, nextSize));
      } else {
        setSelectedSecondPassIds(fallbackIds.slice(0, nextSize));
      }
      setMessage(`已把${targetAction === "review" ? "审稿" : "二改"}队列缩到 ${nextSize} 个任务，可以重试。`);
      return;
    }

    if (action.kind === "lower_target_words") {
      const nextWords = Math.max(500, Math.round(targetWords * (action.targetWordsMultiplier ?? 0.7)));
      setTargetWords(nextWords);
      setMessage(`已把二改目标字数降到 ${nextWords}，可以重试。`);
      return;
    }

    if (action.kind === "switch_to_review") {
      const nextIds = (queue?.recommendedReviewChapterIds.length ? queue.recommendedReviewChapterIds : reviewReadyIds).slice(0, 5);
      setSelectedSecondPassIds([]);
      setSelectedReviewIds(nextIds);
      setLastBudgetAction("review");
      setMessage("已切换到先审稿：先判断质量，再决定是否继续二改。");
      return;
    }

    if (action.kind === "inspect_failures") {
      window.location.assign(hrefWithGateReturn(action.href ?? "/failures", gateReturnHref));
      return;
    }

    document.getElementById("model-task-audit")?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", "#model-task-audit");
    setMessage("已定位到模型预算中心，可以调整额度或拦截模式。");
  }

  function usd(value: number) {
    return `$${value.toFixed(value >= 1 ? 2 : 4)}`;
  }

  function previewTone(status: BudgetPreviewView["status"]) {
    if (status === "block") return "border-rose-200 bg-rose-50 text-rose-900";
    if (status === "warn") return "border-amber-200 bg-amber-50 text-amber-900";
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }

  function effectTone(summary: BatchRouteEffectSummary) {
    if (summary.successRatePercent < 80 || summary.failedTasks > 0) return "border-rose-200 bg-rose-50 text-rose-900";
    if (summary.fallbackTasks > 0 || (summary.averageQualityScore !== null && summary.averageQualityScore < 80)) return "border-amber-200 bg-amber-50 text-amber-900";
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }

  function applyPreviewBatch(action: "review" | "second_pass") {
    const preview = action === "review" ? reviewBudgetPreview : secondPassBudgetPreview;
    const readyIds = action === "review" ? reviewReadyIds : secondPassReadyIds;
    if (!preview) return;
    const nextSize = Math.max(1, Math.min(preview.recommendedBatchSize, readyIds.length || 1, 5));
    const nextIds = readyIds.slice(0, nextSize);
    if (action === "review") {
      setSelectedReviewIds(nextIds);
    } else {
      setSelectedSecondPassIds(nextIds);
    }
    setMessage(`已按预算预估选择 ${nextSize} 个${action === "review" ? "审稿" : "二改"}任务。`);
  }

  function renderBudgetPreview(action: "review" | "second_pass") {
    const preview = action === "review" ? reviewBudgetPreview : secondPassBudgetPreview;
    const selectedCount = action === "review" ? selectedReviewIds.length : selectedSecondPassIds.length;
    const readyCount = action === "review" ? reviewReadyIds.length : secondPassReadyIds.length;
    if (!preview) return null;
    const estimatedBatch = preview.estimatedTaskCostUsd * Math.max(1, selectedCount);

    return (
      <div className={`rounded-md border p-3 ${previewTone(preview.status)}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-medium">预算预估</div>
          <button
            className="rounded-md border border-current px-2 py-1 text-xs font-medium hover:bg-white/60"
            disabled={readyCount === 0}
            onClick={() => applyPreviewBatch(action)}
            type="button"
          >
            按推荐选 {Math.min(preview.recommendedBatchSize, readyCount || 1, 5)} 个
          </button>
        </div>
        <div className="mt-2 grid gap-1 text-xs">
          <div>当前选择预计：{usd(estimatedBatch)}</div>
          <div>执行后累计：{usd(preview.usedUsd + estimatedBatch)} / {usd(preview.monthlyBudgetUsd)}</div>
          <div>推荐最大批量：{Math.min(preview.recommendedBatchSize, 5)} 个 · 失败率 {preview.failureRatePercent}%</div>
          <div>{preview.summary}</div>
        </div>
      </div>
    );
  }

  async function applyRouteRecommendation(action: "review" | "second_pass") {
    const recommendation = action === "review" ? reviewRouteRecommendation : secondPassRouteRecommendation;
    if (!recommendation?.recommendedPrimaryProviderConfigId) return;
    setApplyingRouteType(recommendation.taskType);
    setMessage(null);
    try {
      const response = await fetch("/api/model-task-routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType: recommendation.taskType,
          primaryProviderConfigId: recommendation.recommendedPrimaryProviderConfigId,
          fallbackProviderConfigId: recommendation.recommendedFallbackProviderConfigId,
          confirmation: {
            source: "recommendation",
            reason: recommendation.reason,
            primaryProviderName: recommendation.primaryProviderName,
            fallbackProviderName: recommendation.fallbackProviderName,
            routeStatus: recommendation.status,
            avoidanceStatus: recommendation.avoidance.status,
            restoredCandidate: recommendation.reason.includes("复测通过"),
            recommendationExplanation: recommendation.explanation,
          },
        }),
      });
      if (!response.ok) throw new Error("应用模型路线失败。");
      await loadQueue();
      setMessage(`已应用「${recommendation.label}」模型路线。`);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "应用模型路线失败。");
    } finally {
      setApplyingRouteType(null);
    }
  }

  function renderRouteRecommendation(action: "review" | "second_pass") {
    const recommendation = action === "review" ? reviewRouteRecommendation : secondPassRouteRecommendation;
    if (recommendation?.status !== "ready") return null;

    return (
      <div className="rounded-md border border-cyan-200 bg-cyan-50 p-3 text-cyan-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-medium">模型路线建议</div>
          <button
            className="rounded-md bg-cyan-950 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            disabled={Boolean(runningAction) || applyingRouteType === recommendation.taskType}
            onClick={() => applyRouteRecommendation(action)}
            type="button"
          >
            {applyingRouteType === recommendation.taskType ? "应用中" : "先应用路线"}
          </button>
        </div>
        <div className="mt-2 grid gap-1 text-xs">
          <div>首选：{recommendation.primaryProviderName}</div>
          <div>备用：{recommendation.fallbackProviderName ?? "暂无"}</div>
          <div>样本 {recommendation.sampleTasks} · 成功 {recommendation.successRatePercent}% · 质量 {recommendation.averageQualityScore || "缺"} · {usd(recommendation.averageCostPerSucceededTaskUsd)}/次</div>
          <div>{recommendation.reason}</div>
          {recommendation.avoidance.status === "applied" ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-amber-900">
              <div className="font-medium">已应用避坑规则 · {recommendation.avoidance.appliedRules} 条</div>
              {recommendation.avoidance.evidence.slice(0, 2).map((item) => <div key={item}>{item}</div>)}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  function renderStartTactic(startTactic: ProjectStartTacticSummary | null) {
    if (!startTactic) return null;

    return (
      <div className="mt-2 border-l-2 border-emerald-500 pl-3 text-xs text-emerald-900">
        <div className="font-medium">首轮平台打法 · {startTactic.label}</div>
        <div className="mt-1">{startTactic.primaryTactic}</div>
        {startTactic.openingMove ? <div className="mt-1">开头：{startTactic.openingMove}</div> : null}
        {startTactic.verificationMove ? <div className="mt-1">验证：{startTactic.verificationMove}</div> : null}
        {startTactic.risk ? <div className="mt-1 text-emerald-800">风险：{startTactic.risk}</div> : null}
      </div>
    );
  }

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4" id="review-pipeline">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-medium">批量审稿与二改生产线</h2>
          <p className="mt-1 text-sm text-slate-600">把已生成初稿的章节批量送审，再按审稿问题批量二改；二改结果先进入候选稿，采纳后才覆盖正文。</p>
        </div>
        <button
          className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          disabled={isLoading || Boolean(runningAction)}
          onClick={loadQueue}
          type="button"
        >
          {isLoading ? "读取中" : "刷新生产线"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <div className="rounded-md bg-slate-50 p-3">
          <div className="text-xs text-slate-500">候选章节</div>
          <div className="mt-1 text-2xl font-semibold text-slate-950">{queue?.totalCandidates ?? 0}</div>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <div className="text-xs text-slate-500">待审稿</div>
          <div className="mt-1 text-2xl font-semibold text-slate-950">{queue?.reviewReadyCount ?? 0}</div>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <div className="text-xs text-slate-500">可二改</div>
          <div className="mt-1 text-2xl font-semibold text-slate-950">{queue?.secondPassReadyCount ?? 0}</div>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <div className="text-xs text-slate-500">当前模型</div>
          <div className="mt-1 text-sm font-medium text-slate-950">{activeProvider ? `${activeProvider.displayName} · ${activeProvider.model}` : "读取中"}</div>
        </div>
      </div>

      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
      {budgetGuard ? (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <div className="font-medium">预算修复建议</div>
          <p className="mt-1">{budgetGuard.summary}</p>
          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            {budgetGuard.repairActions.map((action) => (
              <div className="rounded-md bg-white/70 p-3" key={action.id}>
                <div className="font-medium">{action.label}</div>
                <p className="mt-1">{action.detail}</p>
                <p className="mt-1 text-xs">{action.impact}</p>
                <button
                  className="mt-3 rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-950 hover:bg-amber-100"
                  onClick={() => applyBudgetRepair(action)}
                  type="button"
                >
                  {buttonLabel(action)}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
        <div className="rounded-md border border-slate-200 p-3">
          <div className="font-medium text-slate-950">批量审稿</div>
          <div className="mt-3 grid gap-2 text-sm text-slate-600">
            <button
              className="rounded-md border border-slate-200 px-3 py-2 font-medium hover:bg-slate-50 disabled:opacity-50"
              disabled={reviewReadyIds.length === 0 || Boolean(runningAction)}
              onClick={() => setSelectedReviewIds(reviewReadyIds.slice(0, 5))}
              type="button"
            >
              选择前 5 章
            </button>
            <button
              className="rounded-md bg-slate-950 px-3 py-2 font-medium text-white disabled:opacity-50"
              disabled={selectedReviewIds.length === 0 || Boolean(runningAction)}
              onClick={() => runBatch("review")}
              type="button"
            >
              {runningAction === "review" ? "审稿中" : "开始批量审稿"}
            </button>
            {renderRouteRecommendation("review")}
            {renderBudgetPreview("review")}
          </div>
        </div>

        <div className="rounded-md border border-slate-200 p-3">
          <div className="font-medium text-slate-950">批量二改</div>
          <div className="mt-3 grid gap-2 text-sm text-slate-600">
            <label className="grid gap-1">
              二改目标字数
              <input
                className="rounded-md border border-slate-200 px-3 py-2"
                max={6000}
                min={500}
                onChange={(event) => setTargetWords(Number(event.target.value))}
                type="number"
                value={targetWords}
              />
            </label>
            <button
              className="rounded-md border border-slate-200 px-3 py-2 font-medium hover:bg-slate-50 disabled:opacity-50"
              disabled={secondPassReadyIds.length === 0 || Boolean(runningAction)}
              onClick={() => setSelectedSecondPassIds(secondPassReadyIds.slice(0, 5))}
              type="button"
            >
              选择前 5 章
            </button>
            <button
              className="rounded-md bg-slate-950 px-3 py-2 font-medium text-white disabled:opacity-50"
              disabled={selectedSecondPassIds.length === 0 || Boolean(runningAction)}
              onClick={() => runBatch("second_pass")}
              type="button"
            >
              {runningAction === "second_pass" ? "二改中" : "开始批量二改"}
            </button>
            {renderRouteRecommendation("second_pass")}
            {renderBudgetPreview("second_pass")}
          </div>
        </div>

        <div className="rounded-md border border-slate-200 p-3">
          <div className="font-medium text-slate-950">风险提醒</div>
          <div className="mt-3 grid gap-2 text-sm text-slate-600">
            {(queue?.warnings.length ? queue.warnings : ["当前生产线暂无明显风险。"]).map((warning) => (
              <div className="rounded-md bg-slate-50 p-2" key={warning}>{warning}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {queue?.candidates.map((candidate) => (
          <div className="grid gap-3 rounded-md border border-slate-200 p-3 text-sm lg:grid-cols-[auto_auto_1fr_auto]" key={candidate.chapterId}>
            <input
              checked={selectedReviewIds.includes(candidate.chapterId)}
              className="mt-1"
              disabled={candidate.reviewStatus !== "ready" || Boolean(runningAction)}
              onChange={() => toggleReview(candidate.chapterId)}
              title="选择审稿"
              type="checkbox"
            />
            <input
              checked={selectedSecondPassIds.includes(candidate.chapterId)}
              className="mt-1"
              disabled={candidate.secondPassStatus !== "ready" || Boolean(runningAction)}
              onChange={() => toggleSecondPass(candidate.chapterId)}
              title="选择二改"
              type="checkbox"
            />
            <div>
              <div className="font-medium text-slate-950">第 {candidate.order} 章 · {candidate.title}</div>
              <p className="mt-1 text-slate-600">{candidate.reason}</p>
              {renderStartTactic(queue.startTactic)}
              {candidate.secondPassStatus === "ready" ? (
                <p className="mt-1 text-slate-500">二改方向：{modeLabel(candidate.secondPassMode)} · {candidate.instruction}</p>
              ) : null}
            </div>
            <div className="text-xs text-slate-500">
              <div>{reviewStatusLabel(candidate.reviewStatus)} · {candidate.reviewScore ?? "--"} 分 · {candidate.issueCount} 问题</div>
              <div className="mt-1">{secondPassStatusLabel(candidate.secondPassStatus)} · {candidate.wordCount} 字</div>
              <Link className="mt-2 inline-block font-medium text-slate-950" href={hrefWithGateReturn(`/projects/${projectId}/chapters/${candidate.chapterId}`, gateReturnHref)}>
                打开章节
              </Link>
            </div>
          </div>
        ))}
        {queue && queue.candidates.length === 0 ? (
          <p className="rounded-md border border-slate-200 p-3 text-sm text-slate-600">还没有章节，先建立章节卡并生成初稿。</p>
        ) : null}
      </div>

      {results.length > 0 ? (
        <div className="mt-4 rounded-md border border-slate-200 p-3">
          <div className="font-medium text-slate-950">执行结果</div>
          <div className="mt-3 grid gap-2 text-sm text-slate-600">
            {routeEffectSummary ? (
              <div className={`rounded-md border p-3 ${effectTone(routeEffectSummary)}`}>
                <div className="font-medium">本批路线效果回收</div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  <div>成功率 {routeEffectSummary.successRatePercent}%</div>
                  <div>质量 {routeEffectSummary.averageQualityScore ?? "缺"}</div>
                  <div>{usd(routeEffectSummary.knownCostUsd)} 总成本</div>
                  <div>{routeEffectSummary.totalTokens} Token</div>
                </div>
                <div className="mt-2 text-xs">
                  首选 {routeEffectSummary.primaryTasks} · 备用 {routeEffectSummary.fallbackTasks} · 自动 {routeEffectSummary.autoTasks}
                </div>
                <div className="mt-1 text-xs">{routeEffectSummary.providerLabels.join(" / ")}</div>
                <p className="mt-2 text-xs">{routeEffectSummary.verdict}</p>
              </div>
            ) : null}
            {results.map((result) => (
              <div className="rounded-md bg-slate-50 p-3" key={`${result.chapterId}-${result.taskId}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-slate-950">{result.chapterTitle}</span>
                  <span>{result.status === "succeeded" ? "成功" : "失败"}</span>
                </div>
                <div className="mt-1">
                  {typeof result.score === "number" ? `${result.score} 分 · ${result.issueCount ?? 0} 个问题${result.shouldSecondPass ? " · 继续二改" : " · 复检达标"}` : `${result.wordCount ?? 0} 字`}
                </div>
                {result.error ? <p className="mt-1">{result.error}</p> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
