import { buildModelBudgetGuard, normalizeModelBudgetSettings, type ModelBudgetRepairAction, type ModelBudgetSettings } from "./modelBudget.ts";
import { buildTaskRetryPlan } from "./taskRetry.ts";
import { buildRouteRecommendations, type RouteRecommendation } from "../model-gateway/routeRecommendations.ts";

export interface ModelAuditTask {
  id: string;
  projectId?: string | null;
  chapterId?: string | null;
  taskType: string;
  providerConfigId?: string;
  model: string;
  status: string;
  inputSnapshot?: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
  outputText?: string | null;
  errorMessage: string | null;
  createdAt: Date | string;
  modelProvider?: {
    providerId: string;
    displayName: string;
  } | null;
  chapter?: {
    title: string;
  } | null;
}

export interface ModelAuditProvider {
  id: string;
  providerId: string;
  displayName: string;
  defaultModel: string;
  enabled: boolean;
  encryptedApiKey: string | null;
}

export interface ModelAuditRoute {
  taskType: string;
  primaryProviderConfigId: string | null;
  fallbackProviderConfigId: string | null;
}

export interface ProviderAuditRow {
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

export interface TaskTypeAuditRow {
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

export interface RecentFailure {
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

type FailureRecoveryState = Pick<RecentFailure, "recoveryStatus" | "recoveredByTaskId" | "recoveryLabel">;

export interface ModelEffectComparisonRow {
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

export interface ModelTaskAuditDashboard {
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
    repairActions: ModelBudgetRepairAction[];
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
  routeRecommendations: RouteRecommendation[];
  recentFailures: RecentFailure[];
  riskFlags: string[];
  nextActions: string[];
}

const taskLabels: Record<string, string> = {
  chapter_draft: "正文初稿",
  chapter_review: "章节审稿",
  chapter_second_pass: "章节二改",
  first_three_rewrite: "前三章改写",
  submission_package_optimize: "投稿资料优化",
  platform_submission_asset_optimize: "平台投稿资产优化",
  control_asset_generate: "总控资料生成",
};

function labelFor(taskType: string) {
  return taskLabels[taskType] ?? taskType;
}

function tokens(task: ModelAuditTask) {
  return (task.inputTokens ?? 0) + (task.outputTokens ?? 0);
}

function isRunning(status: string) {
  return status === "queued" || status === "running";
}

function successRate(succeeded: number, total: number) {
  if (total === 0) return 0;
  return Math.round((succeeded / total) * 100);
}

function failureRate(failed: number, total: number) {
  if (total === 0) return 0;
  return Math.round((failed / total) * 100);
}

function money(value: number) {
  return Math.round(value * 1000000) / 1000000;
}

function dateIso(value: Date | string) {
  return new Date(value).toISOString();
}

function failureRecovery(task: ModelAuditTask, tasks: ModelAuditTask[]) {
  if (task.status !== "failed") return null;
  const createdAt = new Date(task.createdAt).getTime();
  const recoveredBy = tasks
    .filter((candidate) => (
      candidate.id !== task.id
      && candidate.status === "succeeded"
      && candidate.taskType === task.taskType
      && Boolean(task.chapterId)
      && candidate.chapterId === task.chapterId
      && new Date(candidate.createdAt).getTime() > createdAt
    ))
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())[0];

  return {
    recoveryStatus: recoveredBy ? "recovered" as const : "unresolved" as const,
    recoveredByTaskId: recoveredBy?.id ?? null,
    recoveryLabel: recoveredBy ? `已由后续任务 ${recoveredBy.id} 恢复。` : "尚未看到后续成功记录。",
  };
}

function isModelConfigError(errorMessage: string | null) {
  return /api key|apikey|unauthorized|authentication|permission|forbidden|401|403|密钥|授权|权限|未配置|missing/i.test(errorMessage ?? "");
}

function chapterHref(task: ModelAuditTask) {
  if (task.projectId && task.chapterId) return `/projects/${task.projectId}/chapters/${task.chapterId}`;
  if (task.projectId) return `/projects/${task.projectId}`;
  return "/projects";
}

function buildFailureAction(
  task: ModelAuditTask,
  recovery: FailureRecoveryState,
): Pick<RecentFailure, "directRetrySupported" | "actionLabel" | "actionHref" | "actionReason"> {
  if (recovery.recoveryStatus === "recovered") {
    return {
      directRetrySupported: false,
      actionLabel: "查看恢复记录",
      actionHref: chapterHref(task),
      actionReason: recovery.recoveryLabel,
    };
  }

  if (isModelConfigError(task.errorMessage)) {
    return {
      directRetrySupported: false,
      actionLabel: "去模型设置",
      actionHref: "/settings/models",
      actionReason: "这类失败更像 API Key、权限或供应商配置问题，先修配置再继续跑任务。",
    };
  }

  const retryPlan = buildTaskRetryPlan({
    chapterId: task.chapterId ?? null,
    taskType: task.taskType,
    status: task.status,
    inputSnapshot: task.inputSnapshot ?? "",
  });

  return {
    directRetrySupported: retryPlan.supported,
    actionLabel: retryPlan.actionLabel,
    actionHref: chapterHref(task),
    actionReason: retryPlan.reason,
  };
}

function parseJsonObject(value: string | null | undefined) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function routeAttempt(task: ModelAuditTask) {
  const snapshot = parseJsonObject(task.inputSnapshot);
  const attempt = snapshot?.routeAttempt;
  if (!attempt || typeof attempt !== "object" || Array.isArray(attempt)) return null;
  const record = attempt as Record<string, unknown>;
  return {
    role: typeof record.role === "string" ? record.role : null,
    attemptNumber: typeof record.attemptNumber === "number" ? record.attemptNumber : null,
  };
}

function qualityScore(task: ModelAuditTask) {
  const output = parseJsonObject(task.outputText);
  if (!output) return null;
  if (typeof output.score === "number") return output.score;
  const qualityGate = output.qualityGate;
  if (qualityGate && typeof qualityGate === "object" && !Array.isArray(qualityGate)) {
    const score = (qualityGate as Record<string, unknown>).score;
    if (typeof score === "number") return score;
  }
  return null;
}

function providerKey(task: ModelAuditTask) {
  return [
    task.modelProvider?.providerId ?? "unknown",
    task.modelProvider?.displayName ?? "未知模型",
    task.model,
  ].join("::");
}

function recommendationFor(input: {
  totalTasks: number;
  successRatePercent: number;
  averageQualityScore: number;
  averageCostPerSucceededTaskUsd: number;
  missingQualityScores: number;
}): Pick<ModelEffectComparisonRow, "recommendation" | "reason"> {
  if (input.totalTasks < 2) {
    return { recommendation: "insufficient", reason: "样本不足，至少再跑一次同类任务。" };
  }
  if (input.successRatePercent < 60) {
    return { recommendation: "avoid", reason: "成功率偏低，不适合继续扩大调用。" };
  }
  if (input.averageQualityScore > 0 && input.averageQualityScore < 70) {
    return { recommendation: "avoid", reason: "平均质量分偏低，容易制造返工。" };
  }
  if (input.successRatePercent >= 85 && (input.averageQualityScore === 0 || input.averageQualityScore >= 80)) {
    const qualityNote = input.missingQualityScores > 0 ? "但部分任务缺少质量分。" : "质量分和成功率都稳。";
    return { recommendation: "prefer", reason: qualityNote };
  }
  return { recommendation: "watch", reason: "能用，但还需要继续观察质量、失败率或成本。" };
}

function buildModelEffectRows(tasks: ModelAuditTask[]): ModelEffectComparisonRow[] {
  const groups = new Map<string, ModelAuditTask[]>();
  for (const task of tasks) {
    const key = [task.taskType, providerKey(task)].join("::task-provider::");
    groups.set(key, [...(groups.get(key) ?? []), task]);
  }

  return [...groups.entries()]
    .map(([key, items]) => {
      const [taskType, provider] = key.split("::task-provider::");
      const [providerId, providerName, model] = provider.split("::");
      const succeeded = items.filter((task) => task.status === "succeeded");
      const failed = items.filter((task) => task.status === "failed").length;
      const scored = items
        .map(qualityScore)
        .filter((score): score is number => typeof score === "number");
      const averageQualityScore = scored.length > 0
        ? Math.round(scored.reduce((sum, score) => sum + score, 0) / scored.length)
        : 0;
      const averageTotalTokens = items.length > 0
        ? Math.round(items.reduce((sum, task) => sum + tokens(task), 0) / items.length)
        : 0;
      const knownCost = items.reduce((sum, task) => sum + (task.costUsd ?? 0), 0);
      const averageCostPerSucceededTaskUsd = succeeded.length > 0 ? money(knownCost / succeeded.length) : 0;
      const successRatePercent = successRate(succeeded.length, items.length);
      const recommendation = recommendationFor({
        totalTasks: items.length,
        successRatePercent,
        averageQualityScore,
        averageCostPerSucceededTaskUsd,
        missingQualityScores: items.length - scored.length,
      });

      return {
        id: key,
        taskType,
        taskLabel: labelFor(taskType),
        providerName,
        providerId,
        model,
        totalTasks: items.length,
        succeededTasks: succeeded.length,
        failedTasks: failed,
        successRatePercent,
        averageQualityScore,
        averageTotalTokens,
        averageCostPerSucceededTaskUsd,
        ...recommendation,
      };
    })
    .sort((left, right) => {
      const rank = { prefer: 0, watch: 1, insufficient: 2, avoid: 3 };
      return left.taskLabel.localeCompare(right.taskLabel)
        || rank[left.recommendation] - rank[right.recommendation]
        || right.successRatePercent - left.successRatePercent
        || right.averageQualityScore - left.averageQualityScore
        || left.averageCostPerSucceededTaskUsd - right.averageCostPerSucceededTaskUsd;
    });
}

function buildProviderRows(tasks: ModelAuditTask[]): ProviderAuditRow[] {
  const groups = new Map<string, ModelAuditTask[]>();
  for (const task of tasks) {
    const key = providerKey(task);
    groups.set(key, [...(groups.get(key) ?? []), task]);
  }

  return [...groups.entries()]
    .map(([key, items]) => {
      const [providerId, providerName, model] = key.split("::");
      const succeeded = items.filter((task) => task.status === "succeeded").length;
      const failed = items.filter((task) => task.status === "failed").length;
      const running = items.filter((task) => isRunning(task.status)).length;
      const lastUsed = [...items].sort((left, right) => (
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      ))[0];

      return {
        id: key,
        providerName,
        providerId,
        model,
        totalTasks: items.length,
        succeededTasks: succeeded,
        failedTasks: failed,
        runningTasks: running,
        successRatePercent: successRate(succeeded, items.length),
        totalTokens: items.reduce((sum, task) => sum + tokens(task), 0),
        knownCostUsd: money(items.reduce((sum, task) => sum + (task.costUsd ?? 0), 0)),
        missingUsageTasks: items.filter((task) => task.status === "succeeded" && task.inputTokens === null && task.outputTokens === null).length,
        lastUsedAt: lastUsed ? dateIso(lastUsed.createdAt) : null,
      };
    })
    .sort((left, right) => right.knownCostUsd - left.knownCostUsd || right.totalTokens - left.totalTokens || right.totalTasks - left.totalTasks);
}

function buildTaskTypeRows(tasks: ModelAuditTask[]): TaskTypeAuditRow[] {
  const groups = new Map<string, ModelAuditTask[]>();
  for (const task of tasks) {
    groups.set(task.taskType, [...(groups.get(task.taskType) ?? []), task]);
  }

  return [...groups.entries()]
    .map(([taskType, items]) => {
      const succeeded = items.filter((task) => task.status === "succeeded").length;
      const failed = items.filter((task) => task.status === "failed").length;
      const running = items.filter((task) => isRunning(task.status)).length;
      const outputTokenTasks = items.filter((task) => typeof task.outputTokens === "number");

      return {
        taskType,
        label: labelFor(taskType),
        totalTasks: items.length,
        succeededTasks: succeeded,
        failedTasks: failed,
        runningTasks: running,
        successRatePercent: successRate(succeeded, items.length),
        averageOutputTokens: outputTokenTasks.length > 0
          ? Math.round(outputTokenTasks.reduce((sum, task) => sum + (task.outputTokens ?? 0), 0) / outputTokenTasks.length)
          : 0,
        knownCostUsd: money(items.reduce((sum, task) => sum + (task.costUsd ?? 0), 0)),
      };
    })
    .sort((left, right) => right.knownCostUsd - left.knownCostUsd || right.totalTasks - left.totalTasks || left.label.localeCompare(right.label));
}

function buildRecentFailures(tasks: ModelAuditTask[]): RecentFailure[] {
  return tasks
    .filter((task) => task.status === "failed")
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 5)
    .map((task) => {
      const recovery = failureRecovery(task, tasks) ?? {
        recoveryStatus: "unresolved" as const,
        recoveredByTaskId: null,
        recoveryLabel: "尚未看到后续成功记录。",
      };

      return {
        id: task.id,
        label: labelFor(task.taskType),
        providerName: task.modelProvider?.displayName ?? "未知模型",
        model: task.model,
        chapterTitle: task.chapter?.title ?? "项目任务",
        errorMessage: task.errorMessage || "任务失败，但没有记录错误信息。",
        ...recovery,
        ...buildFailureAction(task, recovery),
        createdAt: dateIso(task.createdAt),
      };
    });
}

function auditScore(summary: ModelTaskAuditDashboard["summary"], readiness: ModelTaskAuditDashboard["providerReadiness"]) {
  if (summary.totalTasks === 0) {
    return readiness.configuredProviders > 0 ? 55 : 30;
  }
  const failurePenalty = summary.failureRatePercent * 1.4;
  const missingUsagePenalty = summary.totalTasks > 0 ? (summary.missingUsageTasks / summary.totalTasks) * 25 : 0;
  const providerPenalty = readiness.unconfiguredEnabledProviders > 0 ? 15 : 0;
  const runningPenalty = summary.runningTasks > Math.max(3, summary.succeededTasks) ? 10 : 0;
  return Math.max(0, Math.min(100, Math.round(100 - failurePenalty - missingUsagePenalty - providerPenalty - runningPenalty)));
}

function statusFor(score: number): ModelTaskAuditDashboard["status"] {
  if (score >= 80) return "healthy";
  if (score >= 55) return "watch";
  return "waste";
}

function verdictFor(status: ModelTaskAuditDashboard["status"], summary: ModelTaskAuditDashboard["summary"]) {
  if (summary.totalTasks === 0) return "还没有 AI 任务数据，先跑一轮生成、审稿和二改再看成本效率。";
  if (status === "healthy") return "模型调用链路健康，可以继续扩大批量生产，但仍要盯住成本记录。";
  if (status === "watch") return "模型链路能用，但失败率、用量记录或配置状态会影响稳定生产。";
  return "模型调用正在产生明显浪费，先治理失败和缺失记录，再扩大生成规模。";
}

function buildRiskFlags(summary: ModelTaskAuditDashboard["summary"], readiness: ModelTaskAuditDashboard["providerReadiness"]) {
  const flags: string[] = [];
  if (summary.totalTasks === 0) flags.push("还没有任务样本，无法判断哪个模型最稳。");
  if (summary.unresolvedFailures > 0) flags.push(`${summary.unresolvedFailures} 个未恢复失败还在拖慢生产链路。`);
  if (summary.failureRatePercent >= 20) flags.push(`历史失败率 ${summary.failureRatePercent}%，需要先查供应商、模型或提示词。`);
  if (summary.missingUsageTasks > 0) flags.push(`${summary.missingUsageTasks} 个成功任务缺少 Token 记录，成本口径不完整。`);
  if (readiness.unconfiguredEnabledProviders > 0) flags.push(`${readiness.unconfiguredEnabledProviders} 个启用模型缺少 API Key。`);
  if (summary.runningTasks > 5) flags.push(`${summary.runningTasks} 个任务排队或运行中，注意批量并发。`);
  if (summary.knownCostUsd > 10) flags.push(`当前项目已记录成本 $${summary.knownCostUsd.toFixed(4)}，需要设预算阈值。`);
  if (flags.length === 0) flags.push("暂无明显模型调用风险，继续保留成本和失败记录。");
  return flags;
}

function buildNextActions(
  summary: ModelTaskAuditDashboard["summary"],
  providerRows: ProviderAuditRow[],
  taskTypeRows: TaskTypeAuditRow[],
  modelEffectRows: ModelEffectComparisonRow[],
  readiness: ModelTaskAuditDashboard["providerReadiness"],
) {
  const actions: string[] = [];
  const worstProvider = [...providerRows]
    .filter((row) => row.totalTasks >= 2)
    .sort((left, right) => left.successRatePercent - right.successRatePercent || right.failedTasks - left.failedTasks)[0];
  const expensiveTaskType = taskTypeRows[0];
  const avoidedModel = modelEffectRows.find((row) => row.recommendation === "avoid");
  const preferredModel = modelEffectRows.find((row) => row.recommendation === "prefer");

  if (readiness.unconfiguredEnabledProviders > 0) actions.push("先补齐启用模型的 API Key，避免任务随机失败。");
  if (worstProvider && worstProvider.successRatePercent < 80) actions.push(`优先检查「${worstProvider.providerName} / ${worstProvider.model}」，成功率只有 ${worstProvider.successRatePercent}%。`);
  if (avoidedModel) actions.push(`暂停扩大「${avoidedModel.taskLabel} / ${avoidedModel.providerName}」调用：${avoidedModel.reason}`);
  if (preferredModel) actions.push(`优先把「${preferredModel.taskLabel}」交给「${preferredModel.providerName} / ${preferredModel.model}」，当前表现最好。`);
  if (summary.missingUsageTasks > 0) actions.push("把所有模型适配器的 Token 和成本回写补齐，否则预算看板会失真。");
  if (expensiveTaskType && expensiveTaskType.knownCostUsd > 0) actions.push(`先优化「${expensiveTaskType.label}」提示词和上下文裁剪，它当前成本最高。`);
  if (summary.totalTasks === 0) actions.push("先用 Mock 或真实模型跑一章初稿、审稿、二改，建立第一组审计样本。");
  actions.push("每次批量生成前先看失败率和单任务成本，再决定是否扩大队列。");
  return actions.slice(0, 5);
}

function dateRangeDays(tasks: ModelAuditTask[]) {
  if (tasks.length === 0) return 1;
  const times = tasks.map((task) => new Date(task.createdAt).getTime()).filter(Number.isFinite);
  if (times.length === 0) return 1;
  const min = Math.min(...times);
  const max = Math.max(...times);
  return Math.max(1, Math.ceil((max - min) / 86_400_000) + 1);
}

function buildBudgetCenter(
  tasks: ModelAuditTask[],
  summary: ModelTaskAuditDashboard["summary"],
  taskTypeRows: TaskTypeAuditRow[],
  settingsInput?: ModelBudgetSettings | null,
) {
  const settings = normalizeModelBudgetSettings(settingsInput);
  const monthlyBudgetUsd = settings.aiMonthlyBudgetUsd;
  const usedPercent = monthlyBudgetUsd > 0 ? Math.round((summary.knownCostUsd / monthlyBudgetUsd) * 100) : 0;
  const status: ModelTaskAuditDashboard["budgetCenter"]["status"] = usedPercent >= 100
    ? "over"
    : usedPercent >= 70 || summary.failureRatePercent >= 20
      ? "watch"
      : "safe";
  const routedAttempts = tasks.filter((task) => routeAttempt(task)).length;
  const fallbackAttempts = tasks.filter((task) => {
    const attempt = routeAttempt(task);
    return attempt?.role === "fallback" || (attempt?.role === "auto" && (attempt.attemptNumber ?? 1) > 1);
  }).length;
  const succeededTasks = tasks.filter((task) => task.status === "succeeded").length;
  const usageRecordedTasks = tasks.filter((task) => (
    task.status === "succeeded"
    && (typeof task.inputTokens === "number" || typeof task.outputTokens === "number")
  )).length;
  const failedSpendUsd = money(tasks
    .filter((task) => task.status === "failed")
    .reduce((sum, task) => sum + (task.costUsd ?? 0), 0));
  const projectedMonthlyCostUsd = money((summary.knownCostUsd / dateRangeDays(tasks)) * 30);
  const topCostTask = taskTypeRows.find((row) => row.knownCostUsd > 0) ?? null;
  const guard = buildModelBudgetGuard({
    settings: settingsInput,
    tasks,
    taskType: topCostTask?.taskType ?? "chapter_draft",
    batchSize: 2,
  });
  const throttleAdvice: string[] = [];

  if (usedPercent >= 100) throttleAdvice.push("暂停批量生成，只保留审稿和必要二改，先查最高成本任务。");
  else if (usedPercent >= 70) throttleAdvice.push("进入预算观察区，批量任务改成小批试跑。");
  if (summary.failureRatePercent >= 20) throttleAdvice.push(`失败率 ${summary.failureRatePercent}%，先修模型配置或提示词，再继续烧调用。`);
  if (fallbackAttempts > 0) throttleAdvice.push(`已触发备用模型 ${fallbackAttempts} 次，检查首选模型稳定性。`);
  if (failedSpendUsd > 0) throttleAdvice.push(`失败任务已消耗 $${failedSpendUsd.toFixed(4)}，把失败原因归类后再放量。`);
  if (topCostTask) throttleAdvice.push(`优先压缩「${topCostTask.label}」上下文，它是当前成本最高任务。`);
  if (summary.missingUsageTasks > 0) throttleAdvice.push("补齐 Token/费用回写，否则预算判断会偏乐观。");
  if (throttleAdvice.length === 0) throttleAdvice.push("预算水位安全，可以继续按小批量节奏扩大样本。");

  return {
    status,
    label: status === "safe" ? "安全" : status === "watch" ? "观察" : "超预算",
    enforcement: settings.aiBudgetEnforcement,
    monthlyBudgetUsd,
    maxTaskCostUsd: settings.aiMaxTaskCostUsd,
    maxBatchCostUsd: settings.aiMaxBatchCostUsd,
    maxFailureRatePercent: settings.aiMaxFailureRatePercent,
    usedUsd: summary.knownCostUsd,
    usedPercent,
    remainingUsd: money(Math.max(0, monthlyBudgetUsd - summary.knownCostUsd)),
    projectedMonthlyCostUsd,
    knownCostCoveragePercent: succeededTasks > 0 ? Math.round((usageRecordedTasks / succeededTasks) * 100) : 0,
    fallbackAttemptRatePercent: routedAttempts > 0 ? Math.round((fallbackAttempts / routedAttempts) * 100) : 0,
    fallbackAttempts,
    routedAttempts,
    failedSpendUsd,
    topCostTaskLabel: topCostTask?.label ?? null,
    throttleAdvice: throttleAdvice.slice(0, 5),
    repairActions: guard.repairActions,
  };
}

export function buildModelTaskAuditDashboard(
  tasks: ModelAuditTask[],
  providers: ModelAuditProvider[],
  budgetSettings?: ModelBudgetSettings | null,
  routes: ModelAuditRoute[] = [],
): ModelTaskAuditDashboard {
  const succeededTasks = tasks.filter((task) => task.status === "succeeded").length;
  const failedTasks = tasks.filter((task) => task.status === "failed").length;
  const recoveredFailures = tasks.filter((task) => failureRecovery(task, tasks)?.recoveryStatus === "recovered").length;
  const unresolvedFailures = failedTasks - recoveredFailures;
  const runningTasks = tasks.filter((task) => task.status === "running").length;
  const queuedTasks = tasks.filter((task) => task.status === "queued").length;
  const summary = {
    totalTasks: tasks.length,
    succeededTasks,
    failedTasks,
    recoveredFailures,
    unresolvedFailures,
    failureRecoveryRatePercent: failedTasks > 0 ? Math.round((recoveredFailures / failedTasks) * 100) : 0,
    runningTasks,
    queuedTasks,
    failureRatePercent: failureRate(failedTasks, tasks.length),
    totalInputTokens: tasks.reduce((sum, task) => sum + (task.inputTokens ?? 0), 0),
    totalOutputTokens: tasks.reduce((sum, task) => sum + (task.outputTokens ?? 0), 0),
    totalTokens: tasks.reduce((sum, task) => sum + tokens(task), 0),
    knownCostUsd: money(tasks.reduce((sum, task) => sum + (task.costUsd ?? 0), 0)),
    missingUsageTasks: tasks.filter((task) => task.status === "succeeded" && task.inputTokens === null && task.outputTokens === null).length,
    averageCostPerSucceededTaskUsd: succeededTasks > 0
      ? money(tasks.reduce((sum, task) => sum + (task.costUsd ?? 0), 0) / succeededTasks)
      : 0,
  };
  const providerReadiness = {
    totalProviders: providers.length,
    enabledProviders: providers.filter((provider) => provider.enabled).length,
    configuredProviders: providers.filter((provider) => provider.enabled && Boolean(provider.encryptedApiKey)).length,
    unconfiguredEnabledProviders: providers.filter((provider) => provider.enabled && !provider.encryptedApiKey).length,
  };
  const providerRows = buildProviderRows(tasks);
  const taskTypeRows = buildTaskTypeRows(tasks);
  const modelEffectRows = buildModelEffectRows(tasks);
  const routeRecommendations = buildRouteRecommendations(
    tasks
      .filter((task) => task.providerConfigId)
      .map((task) => ({
        id: task.id,
        taskType: task.taskType,
        providerConfigId: task.providerConfigId as string,
        status: task.status,
        inputTokens: task.inputTokens,
        outputTokens: task.outputTokens,
        costUsd: task.costUsd,
        outputText: task.outputText ?? null,
      })),
    routes,
    providers,
  );
  const budgetCenter = buildBudgetCenter(tasks, summary, taskTypeRows, budgetSettings);
  const score = auditScore(summary, providerReadiness);
  const status = statusFor(score);

  return {
    status,
    score,
    verdict: verdictFor(status, summary),
    budgetCenter,
    summary,
    providerReadiness,
    providerRows,
    taskTypeRows,
    modelEffectRows,
    routeRecommendations,
    recentFailures: buildRecentFailures(tasks),
    riskFlags: buildRiskFlags(summary, providerReadiness),
    nextActions: buildNextActions(summary, providerRows, taskTypeRows, modelEffectRows, providerReadiness),
  };
}
