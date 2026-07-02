"use client";

import { useEffect, useState } from "react";

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

interface ModelTaskAuditDashboard {
  status: "healthy" | "watch" | "waste";
  score: number;
  verdict: string;
  budgetCenter: {
    status: "safe" | "watch" | "over";
    label: string;
    monthlyBudgetUsd: number;
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
  };
  summary: {
    totalTasks: number;
    succeededTasks: number;
    failedTasks: number;
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

function budgetStatusClass(status: ModelTaskAuditDashboard["budgetCenter"]["status"]) {
  if (status === "safe") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "over") return "border-rose-200 bg-rose-50 text-rose-800";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

export function ModelTaskAuditPanel({ projectId }: { projectId: string }) {
  const [dashboard, setDashboard] = useState<ModelTaskAuditDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "读取模型审计失败。");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadAudit();
  }, [projectId]);

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
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
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
                    <div className="font-medium text-slate-950">{failure.label} · {failure.chapterTitle}</div>
                    <div className="mt-1 text-slate-500">{failure.providerName} · {failure.model} · {new Date(failure.createdAt).toLocaleString()}</div>
                    <p className="mt-1 text-slate-600">{failure.errorMessage}</p>
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
