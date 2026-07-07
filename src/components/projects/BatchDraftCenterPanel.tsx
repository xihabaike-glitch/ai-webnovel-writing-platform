"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface BatchDraftCandidate {
  chapterId: string;
  order: number;
  title: string;
  status: "ready" | "needs_card" | "weak_style" | "has_draft" | "running";
  wordCount: number;
  missingFields: string[];
  styleScore: number | null;
  styleVerdict: string | null;
  priorityFixes: string[];
  reason: string;
  recommended: boolean;
}

interface BatchDraftQueue {
  totalCandidates: number;
  readyCandidates: number;
  recommendedChapterIds: string[];
  warnings: string[];
  candidates: BatchDraftCandidate[];
}

interface ActiveProvider {
  providerId: string;
  displayName: string;
  model: string;
  enabled: boolean;
  hasApiKey: boolean;
  baseUrl: string | null;
}

interface BatchDraftResult {
  chapterId: string;
  status: "succeeded" | "failed";
  chapterTitle: string;
  taskId: string;
  wordCount: number;
  draftQualityScore: number | null;
  shouldSecondPass: boolean;
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

function statusLabel(status: BatchDraftCandidate["status"]) {
  const labels = {
    ready: "可生成",
    needs_card: "需补卡",
    weak_style: "风格弱",
    has_draft: "已有正文",
    running: "运行中",
  };
  return labels[status];
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

export function BatchDraftCenterPanel({
  projectId,
  gateReturnHref,
}: {
  projectId: string;
  gateReturnHref?: string | null;
}) {
  const [queue, setQueue] = useState<BatchDraftQueue | null>(null);
  const [activeProvider, setActiveProvider] = useState<ActiveProvider | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [targetWords, setTargetWords] = useState(1200);
  const [results, setResults] = useState<BatchDraftResult[]>([]);
  const [routeEffectSummary, setRouteEffectSummary] = useState<BatchRouteEffectSummary | null>(null);
  const [budgetGuard, setBudgetGuard] = useState<BudgetGuardView | null>(null);
  const [budgetPreview, setBudgetPreview] = useState<BudgetPreviewView | null>(null);
  const [routeRecommendation, setRouteRecommendation] = useState<RouteRecommendationView | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplyingRoute, setIsApplyingRoute] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const readyIds = useMemo(
    () => queue?.candidates.filter((candidate) => candidate.status === "ready").map((candidate) => candidate.chapterId) ?? [],
    [queue],
  );
  const weakStyleCount = useMemo(
    () => queue?.candidates.filter((candidate) => candidate.status === "weak_style").length ?? 0,
    [queue],
  );

  async function loadQueue() {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/batch-drafts`);
      if (!response.ok) {
        throw new Error("读取批量初稿队列失败。");
      }
      const payload = (await response.json()) as {
        queue: BatchDraftQueue;
        activeProvider: ActiveProvider;
        budgetPreview?: BudgetPreviewView;
        routeRecommendation?: RouteRecommendationView | null;
      };
      setQueue(payload.queue);
      setActiveProvider(payload.activeProvider);
      if (payload.budgetPreview) setBudgetPreview(payload.budgetPreview);
      setRouteRecommendation(payload.routeRecommendation ?? null);
      setSelectedIds((current) => {
        const kept = current.filter((chapterId) => payload.queue.recommendedChapterIds.includes(chapterId));
        return kept.length ? kept : payload.queue.recommendedChapterIds;
      });
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "读取批量初稿队列失败。");
    } finally {
      setIsLoading(false);
    }
  }

  async function generateBatch() {
    setIsGenerating(true);
    setMessage(null);
    setBudgetGuard(null);
    setResults([]);
    setRouteEffectSummary(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/batch-drafts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterIds: selectedIds, targetWords }),
      });
      const payload = await response.json() as {
        results?: BatchDraftResult[];
        routeEffectSummary?: BatchRouteEffectSummary;
        queue?: BatchDraftQueue;
        activeProvider?: ActiveProvider;
        error?: string;
        guard?: { warnings?: string[] };
        budgetGuard?: BudgetGuardView;
        budgetPreview?: BudgetPreviewView;
        routeRecommendation?: RouteRecommendationView | null;
      };
      if (!response.ok) {
        if (payload.budgetGuard) setBudgetGuard(payload.budgetGuard);
        if (payload.budgetPreview) setBudgetPreview(payload.budgetPreview);
        setRouteRecommendation(payload.routeRecommendation ?? null);
        throw new Error([payload.error, ...(payload.guard?.warnings ?? [])].filter(Boolean).join(" "));
      }
      setResults(payload.results ?? []);
      setRouteEffectSummary(payload.routeEffectSummary ?? null);
      if (payload.queue) setQueue(payload.queue);
      if (payload.activeProvider) setActiveProvider(payload.activeProvider);
      if (payload.budgetPreview) setBudgetPreview(payload.budgetPreview);
      setRouteRecommendation(payload.routeRecommendation ?? null);
      setSelectedIds(payload.queue?.recommendedChapterIds ?? []);
      const succeeded = (payload.results ?? []).filter((result) => result.status === "succeeded").length;
      const failed = (payload.results ?? []).filter((result) => result.status === "failed").length;
      setMessage(`批量初稿完成：成功 ${succeeded} 章，失败 ${failed} 章。`);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "批量生成初稿失败。");
    } finally {
      setIsGenerating(false);
    }
  }

  function toggleChapter(chapterId: string) {
    setSelectedIds((current) => (
      current.includes(chapterId)
        ? current.filter((id) => id !== chapterId)
        : [...current, chapterId].slice(0, 5)
    ));
  }

  function buttonLabel(action: BudgetRepairAction) {
    const labels: Record<BudgetRepairAction["kind"], string> = {
      set_batch_size: "应用批量",
      lower_target_words: "应用字数",
      switch_to_review: "先去审稿",
      inspect_failures: "查看失败",
      open_budget_settings: "打开预算",
    };
    return labels[action.kind];
  }

  function applyBudgetRepair(action: BudgetRepairAction) {
    if (action.kind === "set_batch_size") {
      const fallbackIds = selectedIds.length ? selectedIds : readyIds;
      const nextSize = Math.max(1, Math.min(action.recommendedBatchSize ?? 1, fallbackIds.length || 1, 5));
      setSelectedIds(fallbackIds.slice(0, nextSize));
      setMessage(`已把本批缩到 ${nextSize} 个任务，可以重试。`);
      return;
    }

    if (action.kind === "lower_target_words") {
      const nextWords = Math.max(500, Math.round(targetWords * (action.targetWordsMultiplier ?? 0.7)));
      setTargetWords(nextWords);
      setMessage(`已把单章目标字数降到 ${nextWords}，可以重试。`);
      return;
    }

    if (action.kind === "switch_to_review") {
      setSelectedIds([]);
      document.getElementById("review-pipeline")?.scrollIntoView({ behavior: "smooth", block: "start" });
      setMessage("已暂停初稿选择，请在批量审稿与二改生产线先做质量判断。");
      return;
    }

    if (action.kind === "inspect_failures") {
      window.location.assign(action.href ?? "/failures");
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

  function applyPreviewBatch() {
    if (!budgetPreview) return;
    const nextSize = Math.max(1, Math.min(budgetPreview.recommendedBatchSize, readyIds.length || 1, 5));
    const sourceIds = selectedIds.length >= nextSize ? selectedIds : readyIds;
    setSelectedIds(sourceIds.slice(0, nextSize));
    setMessage(`已按预算预估选择 ${nextSize} 章。`);
  }

  async function applyRouteRecommendation() {
    if (!routeRecommendation?.recommendedPrimaryProviderConfigId) return;
    setIsApplyingRoute(true);
    setMessage(null);
    try {
      const response = await fetch("/api/model-task-routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType: routeRecommendation.taskType,
          primaryProviderConfigId: routeRecommendation.recommendedPrimaryProviderConfigId,
          fallbackProviderConfigId: routeRecommendation.recommendedFallbackProviderConfigId,
          confirmation: {
            source: "recommendation",
            reason: routeRecommendation.reason,
            primaryProviderName: routeRecommendation.primaryProviderName,
            fallbackProviderName: routeRecommendation.fallbackProviderName,
            routeStatus: routeRecommendation.status,
            avoidanceStatus: routeRecommendation.avoidance.status,
            restoredCandidate: routeRecommendation.reason.includes("复测通过"),
            recommendationExplanation: routeRecommendation.explanation,
          },
        }),
      });
      if (!response.ok) throw new Error("应用初稿模型路线失败。");
      await loadQueue();
      setMessage(`已应用「${routeRecommendation.label}」模型路线。`);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "应用初稿模型路线失败。");
    } finally {
      setIsApplyingRoute(false);
    }
  }

  useEffect(() => {
    void loadQueue();
  }, [projectId]);

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-medium">AI 批量初稿生产中心</h2>
          <p className="mt-1 text-sm text-slate-600">从章节卡队列选择 1-5 章，批量调用当前模型生成正文初稿候选；作者采纳后才写入正文。</p>
        </div>
        <button
          className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          disabled={isLoading || isGenerating}
          onClick={loadQueue}
          type="button"
        >
          {isLoading ? "读取中" : "刷新队列"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-5">
        <div className="rounded-md bg-slate-50 p-3">
          <div className="text-xs text-slate-500">候选章节</div>
          <div className="mt-1 text-2xl font-semibold text-slate-950">{queue?.totalCandidates ?? 0}</div>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <div className="text-xs text-slate-500">可批量</div>
          <div className="mt-1 text-2xl font-semibold text-slate-950">{queue?.readyCandidates ?? 0}</div>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <div className="text-xs text-slate-500">已选择</div>
          <div className="mt-1 text-2xl font-semibold text-slate-950">{selectedIds.length}</div>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <div className="text-xs text-slate-500">需补风格</div>
          <div className="mt-1 text-2xl font-semibold text-slate-950">{weakStyleCount}</div>
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

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-md border border-slate-200 p-3">
          <div className="font-medium text-slate-950">批量参数</div>
          <div className="mt-3 grid gap-3 text-sm text-slate-600">
            <label className="grid gap-1">
              单章目标字数
              <input
                className="rounded-md border border-slate-200 px-3 py-2"
                max={5000}
                min={500}
                onChange={(event) => setTargetWords(Number(event.target.value))}
                type="number"
                value={targetWords}
              />
            </label>
            <div className="grid gap-2">
              <button
                className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                disabled={!queue || readyIds.length === 0}
                onClick={() => setSelectedIds((queue?.recommendedChapterIds ?? []).slice(0, 5))}
                type="button"
              >
                选择推荐队列
              </button>
              <button
                className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                disabled={readyIds.length === 0}
                onClick={() => setSelectedIds(readyIds.slice(0, 5))}
                type="button"
              >
                选择前 5 章
              </button>
              <button
                className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                disabled={isGenerating || selectedIds.length === 0}
                onClick={generateBatch}
                type="button"
              >
                {isGenerating ? "生成中" : "开始批量初稿"}
              </button>
            </div>
            <div className="grid gap-2">
              {(queue?.warnings.length ? queue.warnings : ["当前队列暂无明显风险。"]).map((warning) => (
                <div className="rounded-md bg-slate-50 p-2" key={warning}>{warning}</div>
              ))}
            </div>
            {routeRecommendation?.status === "ready" ? (
              <div className="rounded-md border border-cyan-200 bg-cyan-50 p-3 text-cyan-900">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium">模型路线建议</div>
                  <button
                    className="rounded-md bg-cyan-950 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                    disabled={isApplyingRoute || isGenerating}
                    onClick={applyRouteRecommendation}
                    type="button"
                  >
                    {isApplyingRoute ? "应用中" : "先应用路线"}
                  </button>
                </div>
                <div className="mt-2 grid gap-1 text-xs">
                  <div>首选：{routeRecommendation.primaryProviderName}</div>
                  <div>备用：{routeRecommendation.fallbackProviderName ?? "暂无"}</div>
                  <div>样本 {routeRecommendation.sampleTasks} · 成功 {routeRecommendation.successRatePercent}% · 质量 {routeRecommendation.averageQualityScore || "缺"} · {usd(routeRecommendation.averageCostPerSucceededTaskUsd)}/次</div>
                  <div>{routeRecommendation.reason}</div>
                  {routeRecommendation.avoidance.status === "applied" ? (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-amber-900">
                      <div className="font-medium">已应用避坑规则 · {routeRecommendation.avoidance.appliedRules} 条</div>
                      {routeRecommendation.avoidance.evidence.slice(0, 2).map((item) => <div key={item}>{item}</div>)}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
            {budgetPreview ? (
              <div className={`rounded-md border p-3 ${previewTone(budgetPreview.status)}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium">预算预估</div>
                  <button
                    className="rounded-md border border-current px-2 py-1 text-xs font-medium hover:bg-white/60"
                    disabled={readyIds.length === 0}
                    onClick={applyPreviewBatch}
                    type="button"
                  >
                    按推荐选 {Math.min(budgetPreview.recommendedBatchSize, readyIds.length || 1, 5)} 章
                  </button>
                </div>
                <div className="mt-2 grid gap-1 text-xs">
                  <div>当前选择预计：{usd(budgetPreview.estimatedTaskCostUsd * Math.max(1, selectedIds.length))}</div>
                  <div>执行后累计：{usd(budgetPreview.usedUsd + budgetPreview.estimatedTaskCostUsd * Math.max(1, selectedIds.length))} / {usd(budgetPreview.monthlyBudgetUsd)}</div>
                  <div>推荐最大批量：{Math.min(budgetPreview.recommendedBatchSize, 5)} 章 · 失败率 {budgetPreview.failureRatePercent}%</div>
                  <div>{budgetPreview.summary}</div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-md border border-slate-200 p-3">
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
                  <span>
                    {result.status === "succeeded" ? "成功" : "失败"} · {result.wordCount} 字
                    {typeof result.draftQualityScore === "number" ? ` · 体检 ${result.draftQualityScore} 分` : ""}
                  </span>
                </div>
                {result.shouldSecondPass ? <p className="mt-1">自动体检建议进入二改队列。</p> : null}
                {result.error ? <p className="mt-1">{result.error}</p> : null}
                <Link className="mt-2 inline-block text-xs font-medium text-slate-950" href={hrefWithGateReturn(`/projects/${projectId}/chapters/${result.chapterId}`, gateReturnHref)}>
                  打开章节
                </Link>
              </div>
            ))}
            {results.length === 0 ? <p>执行后会显示每章结果、任务编号和失败原因。</p> : null}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {queue?.candidates.map((candidate) => {
          const isReady = candidate.status === "ready";
          return (
            <label
              className="grid gap-2 rounded-md border border-slate-200 p-3 text-sm sm:grid-cols-[auto_1fr_auto]"
              key={candidate.chapterId}
            >
              <input
                checked={selectedIds.includes(candidate.chapterId)}
                className="mt-1"
                disabled={!isReady || isGenerating}
                onChange={() => toggleChapter(candidate.chapterId)}
                type="checkbox"
              />
              <span>
                <span className="block font-medium text-slate-950">第 {candidate.order} 章 · {candidate.title}</span>
                <span className="mt-1 block text-slate-600">{candidate.reason}</span>
                {candidate.missingFields.length ? (
                  <span className="mt-1 block text-slate-500">缺口：{candidate.missingFields.join("、")}</span>
                ) : null}
                {candidate.styleScore !== null ? (
                  <span className="mt-1 block text-slate-500">平台体检：{candidate.styleScore} 分 · {candidate.styleVerdict}</span>
                ) : null}
                {candidate.priorityFixes.length ? (
                  <span className="mt-1 grid gap-1 text-slate-500">
                    {candidate.priorityFixes.map((fix) => (
                      <span key={fix}>补强：{fix}</span>
                    ))}
                  </span>
                ) : null}
              </span>
              <span className="text-xs text-slate-500">
                {statusLabel(candidate.status)}
                {candidate.styleScore !== null ? ` · ${candidate.styleScore} 分` : ""}
                {" · "}
                {candidate.wordCount} 字
              </span>
            </label>
          );
        })}
        {queue && queue.candidates.length === 0 ? (
          <p className="rounded-md border border-slate-200 p-3 text-sm text-slate-600">还没有章节卡。先在章节生产排期里生成章节卡。</p>
        ) : null}
      </div>
    </section>
  );
}
