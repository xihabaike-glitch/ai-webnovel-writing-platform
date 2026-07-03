"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { RetryTaskButton } from "@/components/tasks/RetryTaskButton";

interface ProviderAuditRow {
  id: string;
  providerName: string;
  providerId: string;
  model: string;
  totalTasks: number;
  succeededTasks: number;
  failedTasks: number;
  runningTasks: number;
  successRatePercent: number;
  totalTokens: number;
  knownCostUsd: number;
  missingUsageTasks: number;
  lastUsedAt: string | null;
}

interface TaskTypeAuditRow {
  taskType: string;
  label: string;
  totalTasks: number;
  succeededTasks: number;
  failedTasks: number;
  runningTasks: number;
  successRatePercent: number;
  averageOutputTokens: number;
  knownCostUsd: number;
}

interface RecentFailure {
  id: string;
  label: string;
  providerName: string;
  model: string;
  chapterTitle: string;
  errorMessage: string;
  recoveryStatus: "recovered" | "unresolved";
  recoveredByTaskId: string | null;
  recoveryLabel: string;
  directRetrySupported: boolean;
  actionLabel: string;
  actionHref: string;
  actionReason: string;
  createdAt: string;
}

interface ModelEffectComparisonRow {
  id: string;
  taskType: string;
  taskLabel: string;
  providerName: string;
  providerId: string;
  model: string;
  totalTasks: number;
  succeededTasks: number;
  failedTasks: number;
  successRatePercent: number;
  averageQualityScore: number;
  averageTotalTokens: number;
  averageCostPerSucceededTaskUsd: number;
  recommendation: "prefer" | "watch" | "avoid" | "insufficient";
  reason: string;
}

interface RouteRecommendationView {
  taskType: string;
  label: string;
  status: "ready" | "current" | "insufficient";
  recommendedPrimaryProviderConfigId: string | null;
  recommendedFallbackProviderConfigId: string | null;
  currentPrimaryProviderConfigId: string | null;
  currentFallbackProviderConfigId: string | null;
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
  reason: string;
}

interface ModelTaskAuditDashboard {
  status: "healthy" | "watch" | "waste";
  score: number;
  verdict: string;
  budgetCenter: {
    status: "safe" | "watch" | "over";
    label: string;
    enforcement: "off" | "warn" | "block";
    monthlyBudgetUsd: number;
    maxTaskCostUsd: number;
    maxBatchCostUsd: number;
    maxFailureRatePercent: number;
    usedUsd: number;
    usedPercent: number;
    remainingUsd: number;
    projectedMonthlyCostUsd: number;
    knownCostCoveragePercent: number;
    fallbackAttemptRatePercent: number;
    fallbackAttempts: number;
    routedAttempts: number;
    failedSpendUsd: number;
    topCostTaskLabel: string | null;
    throttleAdvice: string[];
    repairActions?: Array<{
      id: string;
      label: string;
      detail: string;
      impact: string;
    }>;
  };
  summary: {
    totalTasks: number;
    succeededTasks: number;
    failedTasks: number;
    recoveredFailures: number;
    unresolvedFailures: number;
    failureRecoveryRatePercent: number;
    runningTasks: number;
    queuedTasks: number;
    failureRatePercent: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalTokens: number;
    knownCostUsd: number;
    missingUsageTasks: number;
    averageCostPerSucceededTaskUsd: number;
  };
  providerReadiness: {
    totalProviders: number;
    enabledProviders: number;
    configuredProviders: number;
    unconfiguredEnabledProviders: number;
  };
  providerRows: ProviderAuditRow[];
  taskTypeRows: TaskTypeAuditRow[];
  modelEffectRows: ModelEffectComparisonRow[];
  routeRecommendations: RouteRecommendationView[];
  recentFailures: RecentFailure[];
  riskFlags: string[];
  nextActions: string[];
}

function statusText(status: ModelTaskAuditDashboard["status"]) {
  if (status === "healthy") return "健康";
  if (status === "watch") return "观察";
  return "浪费";
}

function usd(value: number) {
  return `$${value.toFixed(4)}`;
}

function compactNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function recommendationLabel(value: ModelEffectComparisonRow["recommendation"]) {
  if (value === "prefer") return "优先";
  if (value === "avoid") return "暂停";
  if (value === "insufficient") return "补样本";
  return "观察";
}

function routeStatusLabel(value: RouteRecommendationView["status"]) {
  if (value === "ready") return "建议调整";
  if (value === "current") return "已采用";
  return "补样本";
}

function routeStatusClass(value: RouteRecommendationView["status"]) {
  if (value === "ready") return "bg-cyan-50 text-cyan-700";
  if (value === "current") return "bg-emerald-50 text-emerald-700";
  return "bg-slate-100 text-slate-600";
}

function budgetStatusClass(status: ModelTaskAuditDashboard["budgetCenter"]["status"]) {
  if (status === "safe") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "over") return "border-rose-200 bg-rose-50 text-rose-800";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

export function ModelTaskAuditPanel({ projectId }: { projectId: string }) {
  const [dashboard, setDashboard] = useState<ModelTaskAuditDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const [applyingRouteType, setApplyingRouteType] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [budgetDraft, setBudgetDraft] = useState({
    aiMonthlyBudgetUsd: "5",
    aiMaxTaskCostUsd: "0.25",
    aiMaxBatchCostUsd: "1",
    aiMaxFailureRatePercent: "20",
    aiBudgetEnforcement: "block" as "off" | "warn" | "block",
  });

  async function loadAudit() {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/model-task-audit`);
      if (!response.ok) {
        throw new Error("读取模型审计失败。");
      }
      const payload = (await response.json()) as { dashboard: ModelTaskAuditDashboard };
      setDashboard(payload.dashboard);
      setBudgetDraft({
        aiMonthlyBudgetUsd: String(payload.dashboard.budgetCenter.monthlyBudgetUsd),
        aiMaxTaskCostUsd: String(payload.dashboard.budgetCenter.maxTaskCostUsd),
        aiMaxBatchCostUsd: String(payload.dashboard.budgetCenter.maxBatchCostUsd),
        aiMaxFailureRatePercent: String(payload.dashboard.budgetCenter.maxFailureRatePercent),
        aiBudgetEnforcement: payload.dashboard.budgetCenter.enforcement,
      });
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "读取模型审计失败。");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadAudit();
  }, [projectId]);

  async function saveBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingBudget(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/model-budget`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiMonthlyBudgetUsd: Number(budgetDraft.aiMonthlyBudgetUsd),
          aiMaxTaskCostUsd: Number(budgetDraft.aiMaxTaskCostUsd),
          aiMaxBatchCostUsd: Number(budgetDraft.aiMaxBatchCostUsd),
          aiMaxFailureRatePercent: Number(budgetDraft.aiMaxFailureRatePercent),
          aiBudgetEnforcement: budgetDraft.aiBudgetEnforcement,
        }),
      });
      if (!response.ok) throw new Error("保存预算规则失败。");
      setMessage("预算规则已保存");
      await loadAudit();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "保存预算规则失败。");
    } finally {
      setIsSavingBudget(false);
    }
  }

  async function applyRouteRecommendation(recommendation: RouteRecommendationView) {
    if (!recommendation.recommendedPrimaryProviderConfigId) return;
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
        }),
      });
      if (!response.ok) throw new Error("应用模型路线失败。");
      await loadAudit();
      setMessage(`已应用「${recommendation.label}」模型路线`);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "应用模型路线失败。");
    } finally {
      setApplyingRouteType(null);
    }
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-medium">模型任务与成本审计</h2>
          <p className="mt-1 text-sm text-slate-600">看清 Claude、DeepSeek、Kimi、GPT 等模型调用的成功率、Token、成本和失败风险。</p>
        </div>
        <button
          className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          disabled={isLoading}
          onClick={loadAudit}
          type="button"
        >
          {isLoading ? "审计中" : "刷新审计"}
        </button>
      </div>

      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}

      {dashboard ? (
        <div className="mt-4 grid gap-4">
          <div className="grid gap-3 lg:grid-cols-[220px_1fr]">
            <div className="rounded-md bg-slate-50 p-4">
              <div className="text-xs text-slate-500">模型健康分</div>
              <div className="mt-1 flex items-end gap-2">
                <span className="text-4xl font-semibold text-slate-950">{dashboard.score}</span>
                <span className="pb-1 text-sm text-slate-500">{statusText(dashboard.status)}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{dashboard.verdict}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-8">
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-slate-500">任务</div>
                <div className="mt-1 text-2xl font-semibold text-slate-950">{dashboard.summary.totalTasks}</div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-slate-500">成功</div>
                <div className="mt-1 text-2xl font-semibold text-slate-950">{dashboard.summary.succeededTasks}</div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-slate-500">失败率</div>
                <div className="mt-1 text-2xl font-semibold text-slate-950">{dashboard.summary.failureRatePercent}%</div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-slate-500">未恢复</div>
                <div className="mt-1 text-2xl font-semibold text-slate-950">{dashboard.summary.unresolvedFailures}</div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-slate-500">恢复率</div>
                <div className="mt-1 text-2xl font-semibold text-slate-950">{dashboard.summary.failureRecoveryRatePercent}%</div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Token</div>
                <div className="mt-1 text-2xl font-semibold text-slate-950">{compactNumber(dashboard.summary.totalTokens)}</div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-slate-500">成本</div>
                <div className="mt-1 text-2xl font-semibold text-slate-950">{usd(dashboard.summary.knownCostUsd)}</div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-slate-500">可用模型</div>
                <div className="mt-1 text-2xl font-semibold text-slate-950">{dashboard.providerReadiness.configuredProviders}/{dashboard.providerReadiness.enabledProviders}</div>
              </div>
            </div>
          </div>

          <div className={`rounded-md border p-4 ${budgetStatusClass(dashboard.budgetCenter.status)}`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-xs opacity-80">预算中心</div>
                <div className="mt-1 text-2xl font-semibold">{dashboard.budgetCenter.label} · {dashboard.budgetCenter.usedPercent}%</div>
                <p className="mt-2 text-sm leading-6">
                  已用 {usd(dashboard.budgetCenter.usedUsd)} / 月预算 {usd(dashboard.budgetCenter.monthlyBudgetUsd)}，
                  预计月消耗 {usd(dashboard.budgetCenter.projectedMonthlyCostUsd)}。
                </p>
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-2 lg:min-w-[520px] lg:grid-cols-4">
                <div className="rounded-md bg-white/70 p-3">
                  <div className="text-xs opacity-70">剩余额度</div>
                  <div className="mt-1 font-semibold">{usd(dashboard.budgetCenter.remainingUsd)}</div>
                </div>
                <div className="rounded-md bg-white/70 p-3">
                  <div className="text-xs opacity-70">成本覆盖</div>
                  <div className="mt-1 font-semibold">{dashboard.budgetCenter.knownCostCoveragePercent}%</div>
                </div>
                <div className="rounded-md bg-white/70 p-3">
                  <div className="text-xs opacity-70">备用触发</div>
                  <div className="mt-1 font-semibold">{dashboard.budgetCenter.fallbackAttempts}/{dashboard.budgetCenter.routedAttempts}</div>
                </div>
                <div className="rounded-md bg-white/70 p-3">
                  <div className="text-xs opacity-70">失败成本</div>
                  <div className="mt-1 font-semibold">{usd(dashboard.budgetCenter.failedSpendUsd)}</div>
                </div>
              </div>
            </div>
            <div className="mt-3 grid gap-2 text-sm lg:grid-cols-2">
              {dashboard.budgetCenter.throttleAdvice.map((action) => (
                <div className="rounded-md bg-white/70 px-3 py-2" key={action}>{action}</div>
              ))}
            </div>
            {dashboard.budgetCenter.repairActions?.length ? (
              <div className="mt-3 grid gap-2 text-sm lg:grid-cols-2">
                {dashboard.budgetCenter.repairActions.map((action) => (
                  <div className="rounded-md bg-white/70 p-3" key={action.id}>
                    <div className="font-medium">{action.label}</div>
                    <p className="mt-1">{action.detail}</p>
                    <p className="mt-1 text-xs opacity-80">{action.impact}</p>
                  </div>
                ))}
              </div>
            ) : null}
            <form className="mt-4 grid gap-3 rounded-md bg-white/70 p-3 text-sm text-slate-700 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto]" onSubmit={saveBudget}>
              <label className="grid gap-1">
                月预算
                <input
                  className="rounded-md border border-slate-200 px-3 py-2"
                  min="0.01"
                  onChange={(event) => setBudgetDraft((current) => ({ ...current, aiMonthlyBudgetUsd: event.target.value }))}
                  step="0.01"
                  type="number"
                  value={budgetDraft.aiMonthlyBudgetUsd}
                />
              </label>
              <label className="grid gap-1">
                单次上限
                <input
                  className="rounded-md border border-slate-200 px-3 py-2"
                  min="0.01"
                  onChange={(event) => setBudgetDraft((current) => ({ ...current, aiMaxTaskCostUsd: event.target.value }))}
                  step="0.01"
                  type="number"
                  value={budgetDraft.aiMaxTaskCostUsd}
                />
              </label>
              <label className="grid gap-1">
                批量上限
                <input
                  className="rounded-md border border-slate-200 px-3 py-2"
                  min="0.01"
                  onChange={(event) => setBudgetDraft((current) => ({ ...current, aiMaxBatchCostUsd: event.target.value }))}
                  step="0.01"
                  type="number"
                  value={budgetDraft.aiMaxBatchCostUsd}
                />
              </label>
              <label className="grid gap-1">
                失败率上限
                <input
                  className="rounded-md border border-slate-200 px-3 py-2"
                  max="100"
                  min="1"
                  onChange={(event) => setBudgetDraft((current) => ({ ...current, aiMaxFailureRatePercent: event.target.value }))}
                  type="number"
                  value={budgetDraft.aiMaxFailureRatePercent}
                />
              </label>
              <label className="grid gap-1">
                执行策略
                <select
                  className="rounded-md border border-slate-200 px-3 py-2"
                  onChange={(event) => setBudgetDraft((current) => ({ ...current, aiBudgetEnforcement: event.target.value as "off" | "warn" | "block" }))}
                  value={budgetDraft.aiBudgetEnforcement}
                >
                  <option value="block">超限拦截</option>
                  <option value="warn">只提醒</option>
                  <option value="off">关闭</option>
                </select>
              </label>
              <button
                className="self-end rounded-md bg-slate-950 px-4 py-2 font-medium text-white disabled:opacity-50"
                disabled={isSavingBudget}
                type="submit"
              >
                {isSavingBudget ? "保存中" : "保存"}
              </button>
            </form>
          </div>

          <div className="rounded-md border border-slate-200 p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="font-medium text-slate-950">推荐模型路线</div>
              <a className="text-sm font-medium text-slate-600 hover:text-slate-950" href="/settings/models">
                去模型设置应用
              </a>
            </div>
            <div className="mt-3 grid gap-2 lg:grid-cols-2">
              {dashboard.routeRecommendations.slice(0, 6).map((recommendation) => (
                <div className="rounded-md bg-slate-50 p-3 text-sm" key={recommendation.taskType}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-slate-950">{recommendation.label}</div>
                      <div className="mt-1 text-xs text-slate-500">首选：{recommendation.primaryProviderName}</div>
                      <div className="mt-1 text-xs text-slate-500">备用：{recommendation.fallbackProviderName ?? "暂无"}</div>
                    </div>
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${routeStatusClass(recommendation.status)}`}>
                      {routeStatusLabel(recommendation.status)}
                    </span>
                  </div>
                  {recommendation.status === "ready" ? (
                    <button
                      className="mt-3 rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                      disabled={applyingRouteType === recommendation.taskType}
                      onClick={() => applyRouteRecommendation(recommendation)}
                      type="button"
                    >
                      {applyingRouteType === recommendation.taskType ? "应用中" : "应用这条路线"}
                    </button>
                  ) : null}
                  <div className="mt-2 grid grid-cols-2 gap-2 text-slate-600 sm:grid-cols-4">
                    <div>样本 {recommendation.sampleTasks}</div>
                    <div>成功 {recommendation.successRatePercent}%</div>
                    <div>质量 {recommendation.averageQualityScore || "缺"}</div>
                    <div>{usd(recommendation.averageCostPerSucceededTaskUsd)}/次</div>
                  </div>
                  <p className="mt-2 leading-6 text-slate-600">{recommendation.reason}</p>
                  {recommendation.avoidance.status === "applied" ? (
                    <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs leading-5 text-amber-900">
                      <div className="font-medium">已应用避坑规则 · {recommendation.avoidance.appliedRules} 条</div>
                      {recommendation.avoidance.evidence.slice(0, 2).map((item) => <div key={item}>{item}</div>)}
                    </div>
                  ) : null}
                </div>
              ))}
              {dashboard.routeRecommendations.length === 0 ? <p className="text-sm text-slate-600">还没有模型路线样本。</p> : null}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
            <div className="rounded-md border border-slate-200 p-3">
              <div className="font-medium text-slate-950">风险与动作</div>
              <div className="mt-3 grid gap-2 text-sm text-slate-600">
                {dashboard.riskFlags.map((flag) => (
                  <div className="rounded-md bg-slate-50 p-2" key={flag}>{flag}</div>
                ))}
              </div>
              <div className="mt-3 grid gap-2 text-sm text-slate-600">
                {dashboard.nextActions.map((action, index) => (
                  <div className="rounded-md border border-slate-200 p-2" key={action}>{index + 1}. {action}</div>
                ))}
              </div>
            </div>
            <div className="rounded-md border border-slate-200 p-3">
              <div className="font-medium text-slate-950">供应商表现</div>
              <div className="mt-3 grid gap-2">
                {dashboard.providerRows.slice(0, 4).map((row) => (
                  <div className="rounded-md bg-slate-50 p-3 text-sm" key={row.id}>
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div className="font-medium text-slate-950">{row.providerName} · {row.model}</div>
                      <div className="text-xs text-slate-500">成功率 {row.successRatePercent}% · {usd(row.knownCostUsd)}</div>
                    </div>
                    <div className="mt-1 text-slate-600">
                      {row.totalTasks} 次调用 · {compactNumber(row.totalTokens)} Token · 失败 {row.failedTasks} · 缺用量 {row.missingUsageTasks}
                    </div>
                  </div>
                ))}
                {dashboard.providerRows.length === 0 ? <p className="text-sm text-slate-600">还没有模型调用记录。</p> : null}
              </div>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 p-3">
            <div className="font-medium text-slate-950">任务模型对比</div>
            <div className="mt-3 grid gap-2 lg:grid-cols-2">
              {dashboard.modelEffectRows.slice(0, 6).map((row) => (
                <div className="rounded-md bg-slate-50 p-3 text-sm" key={row.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-medium text-slate-950">{row.taskLabel}</div>
                      <div className="mt-1 text-xs text-slate-500">{row.providerName} · {row.model}</div>
                    </div>
                    <div className="text-xs text-slate-500">{recommendationLabel(row.recommendation)}</div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-slate-600 sm:grid-cols-4">
                    <div>成功 {row.successRatePercent}%</div>
                    <div>质量 {row.averageQualityScore || "缺"}</div>
                    <div>{usd(row.averageCostPerSucceededTaskUsd)}/次</div>
                    <div>{compactNumber(row.averageTotalTokens)} Token</div>
                  </div>
                  <p className="mt-2 leading-6 text-slate-600">{row.reason}</p>
                </div>
              ))}
              {dashboard.modelEffectRows.length === 0 ? <p className="text-sm text-slate-600">还没有足够的模型调用样本。</p> : null}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-md border border-slate-200 p-3">
              <div className="font-medium text-slate-950">任务类型成本</div>
              <div className="mt-3 grid gap-2">
                {dashboard.taskTypeRows.slice(0, 5).map((row) => (
                  <div className="rounded-md bg-slate-50 p-3 text-sm" key={row.taskType}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-slate-950">{row.label}</div>
                      <div className="text-xs text-slate-500">{usd(row.knownCostUsd)}</div>
                    </div>
                    <div className="mt-1 text-slate-600">
                      {row.totalTasks} 次 · 成功率 {row.successRatePercent}% · 均出 {compactNumber(row.averageOutputTokens)} Token
                    </div>
                  </div>
                ))}
                {dashboard.taskTypeRows.length === 0 ? <p className="text-sm text-slate-600">还没有任务类型数据。</p> : null}
              </div>
            </div>
            <div className="rounded-md border border-slate-200 p-3">
              <div className="font-medium text-slate-950">最近失败</div>
              <div className="mt-3 grid gap-2">
                {dashboard.recentFailures.map((failure) => (
                  <div className="rounded-md bg-slate-50 p-3 text-sm" key={failure.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium text-slate-950">{failure.label} · {failure.chapterTitle}</div>
                      <span className={`rounded-md px-2 py-1 text-xs font-medium ${
                        failure.recoveryStatus === "recovered"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}>
                        {failure.recoveryStatus === "recovered" ? "已恢复" : "未恢复"}
                      </span>
                    </div>
                    <div className="mt-1 text-slate-500">{failure.providerName} · {failure.model} · {new Date(failure.createdAt).toLocaleString()}</div>
                    <p className="mt-1 text-slate-600">{failure.errorMessage}</p>
                    <p className="mt-1 text-xs text-slate-500">{failure.recoveryLabel}</p>
                    {failure.recoveryStatus === "unresolved" ? (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {failure.directRetrySupported ? (
                          <RetryTaskButton taskId={failure.id} className="flex flex-wrap items-center gap-2" />
                        ) : (
                          <a
                            className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white"
                            href={failure.actionHref}
                          >
                            {failure.actionLabel}
                          </a>
                        )}
                        <span className="text-xs text-slate-500">{failure.actionReason}</span>
                      </div>
                    ) : (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <a className="text-sm font-medium text-slate-600 hover:text-slate-950" href={failure.actionHref}>
                          {failure.actionLabel}
                        </a>
                        <span className="text-xs text-slate-500">{failure.actionReason}</span>
                      </div>
                    )}
                  </div>
                ))}
                {dashboard.recentFailures.length === 0 ? <p className="text-sm text-slate-600">暂无失败任务。</p> : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
