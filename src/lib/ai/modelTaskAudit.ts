export interface ModelAuditTask {
  id: string;
  taskType: string;
  model: string;
  status: string;
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
  createdAt: string;
}

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

const taskLabels: Record<string, string> = {
  chapter_draft: "正文初稿",
  chapter_review: "章节审稿",
  chapter_second_pass: "章节二改",
  first_three_rewrite: "前三章改写",
  submission_package_optimize: "投稿资料优化",
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
    .map((task) => ({
      id: task.id,
      label: labelFor(task.taskType),
      providerName: task.modelProvider?.displayName ?? "未知模型",
      model: task.model,
      chapterTitle: task.chapter?.title ?? "项目任务",
      errorMessage: task.errorMessage || "任务失败，但没有记录错误信息。",
      createdAt: dateIso(task.createdAt),
    }));
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
  if (summary.failureRatePercent >= 20) flags.push(`失败率 ${summary.failureRatePercent}%，需要先查供应商、模型或提示词。`);
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

export function buildModelTaskAuditDashboard(
  tasks: ModelAuditTask[],
  providers: ModelAuditProvider[],
): ModelTaskAuditDashboard {
  const succeededTasks = tasks.filter((task) => task.status === "succeeded").length;
  const failedTasks = tasks.filter((task) => task.status === "failed").length;
  const runningTasks = tasks.filter((task) => task.status === "running").length;
  const queuedTasks = tasks.filter((task) => task.status === "queued").length;
  const summary = {
    totalTasks: tasks.length,
    succeededTasks,
    failedTasks,
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
  const score = auditScore(summary, providerReadiness);
  const status = statusFor(score);

  return {
    status,
    score,
    verdict: verdictFor(status, summary),
    summary,
    providerReadiness,
    providerRows,
    taskTypeRows,
    modelEffectRows,
    recentFailures: buildRecentFailures(tasks),
    riskFlags: buildRiskFlags(summary, providerReadiness),
    nextActions: buildNextActions(summary, providerRows, taskTypeRows, modelEffectRows, providerReadiness),
  };
}
