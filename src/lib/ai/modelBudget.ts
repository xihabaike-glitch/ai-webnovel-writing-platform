export type ModelBudgetEnforcement = "off" | "warn" | "block";

export interface ModelBudgetSettings {
  aiMonthlyBudgetUsd?: number | null;
  aiMaxTaskCostUsd?: number | null;
  aiMaxBatchCostUsd?: number | null;
  aiMaxFailureRatePercent?: number | null;
  aiBudgetEnforcement?: string | null;
}

export interface ModelBudgetTask {
  taskType: string;
  status: string;
  costUsd: number | null;
}

export interface ModelBudgetGuardInput {
  settings?: ModelBudgetSettings | null;
  tasks: ModelBudgetTask[];
  taskType: string;
  batchSize?: number;
  estimatedTaskCostUsd?: number;
}

export interface ModelBudgetGuard {
  allowed: boolean;
  enforcement: ModelBudgetEnforcement;
  status: "safe" | "warn" | "block";
  summary: string;
  estimatedTaskCostUsd: number;
  estimatedBatchCostUsd: number;
  projectedUsedUsd: number;
  monthlyBudgetUsd: number;
  usedUsd: number;
  failureRatePercent: number;
  blockers: string[];
  warnings: string[];
}

function money(value: number) {
  return Math.round(value * 1000000) / 1000000;
}

function positiveNumber(value: number | null | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function normalizeEnforcement(value: string | null | undefined): ModelBudgetEnforcement {
  return value === "off" || value === "warn" || value === "block" ? value : "block";
}

export function normalizeModelBudgetSettings(settings?: ModelBudgetSettings | null) {
  return {
    aiMonthlyBudgetUsd: positiveNumber(settings?.aiMonthlyBudgetUsd, 5),
    aiMaxTaskCostUsd: positiveNumber(settings?.aiMaxTaskCostUsd, 0.25),
    aiMaxBatchCostUsd: positiveNumber(settings?.aiMaxBatchCostUsd, 1),
    aiMaxFailureRatePercent: Math.max(1, Math.min(100, Math.round(positiveNumber(settings?.aiMaxFailureRatePercent, 20)))),
    aiBudgetEnforcement: normalizeEnforcement(settings?.aiBudgetEnforcement),
  };
}

function knownCost(tasks: ModelBudgetTask[]) {
  return money(tasks.reduce((sum, task) => sum + (task.costUsd ?? 0), 0));
}

function failureRate(tasks: ModelBudgetTask[]) {
  if (tasks.length === 0) return 0;
  const failed = tasks.filter((task) => task.status === "failed").length;
  return Math.round((failed / tasks.length) * 100);
}

function estimateTaskCost(tasks: ModelBudgetTask[], taskType: string) {
  const sameTypeSucceeded = tasks.filter((task) => (
    task.taskType === taskType
    && task.status === "succeeded"
    && typeof task.costUsd === "number"
  ));
  if (sameTypeSucceeded.length > 0) {
    return money(sameTypeSucceeded.reduce((sum, task) => sum + (task.costUsd ?? 0), 0) / sameTypeSucceeded.length);
  }
  const anySucceeded = tasks.filter((task) => task.status === "succeeded" && typeof task.costUsd === "number");
  if (anySucceeded.length > 0) {
    return money(anySucceeded.reduce((sum, task) => sum + (task.costUsd ?? 0), 0) / anySucceeded.length);
  }
  return 0;
}

export function buildModelBudgetGuard(input: ModelBudgetGuardInput): ModelBudgetGuard {
  const settings = normalizeModelBudgetSettings(input.settings);
  const batchSize = Math.max(1, input.batchSize ?? 1);
  const estimatedTaskCostUsd = money(input.estimatedTaskCostUsd ?? estimateTaskCost(input.tasks, input.taskType));
  const estimatedBatchCostUsd = money(estimatedTaskCostUsd * batchSize);
  const usedUsd = knownCost(input.tasks);
  const projectedUsedUsd = money(usedUsd + estimatedBatchCostUsd);
  const failureRatePercent = failureRate(input.tasks);
  const warnings: string[] = [];
  const blockers: string[] = [];

  if (estimatedTaskCostUsd > settings.aiMaxTaskCostUsd) {
    blockers.push(`预计单次成本 $${estimatedTaskCostUsd.toFixed(4)}，超过上限 $${settings.aiMaxTaskCostUsd.toFixed(4)}。`);
  }
  if (estimatedBatchCostUsd > settings.aiMaxBatchCostUsd) {
    blockers.push(`预计本批成本 $${estimatedBatchCostUsd.toFixed(4)}，超过批量上限 $${settings.aiMaxBatchCostUsd.toFixed(4)}。`);
  }
  if (projectedUsedUsd > settings.aiMonthlyBudgetUsd) {
    blockers.push(`执行后预计累计 $${projectedUsedUsd.toFixed(4)}，超过月预算 $${settings.aiMonthlyBudgetUsd.toFixed(4)}。`);
  }
  if (input.tasks.length >= 3 && failureRatePercent > settings.aiMaxFailureRatePercent) {
    blockers.push(`近期失败率 ${failureRatePercent}%，超过上限 ${settings.aiMaxFailureRatePercent}%。`);
  }

  if (estimatedTaskCostUsd === 0) warnings.push("暂无可用历史成本样本，本次只能按预算水位和失败率拦截。");
  if (usedUsd / settings.aiMonthlyBudgetUsd >= 0.7 && projectedUsedUsd <= settings.aiMonthlyBudgetUsd) {
    warnings.push("预算使用已超过 70%，建议小批量试跑。");
  }

  const enforcement = settings.aiBudgetEnforcement;
  const shouldBlock = enforcement === "block" && blockers.length > 0;
  const status: ModelBudgetGuard["status"] = shouldBlock ? "block" : blockers.length > 0 || warnings.length > 0 ? "warn" : "safe";
  const summary = shouldBlock
    ? blockers[0]
    : blockers[0] ?? warnings[0] ?? "预算检查通过。";

  return {
    allowed: enforcement === "off" || !shouldBlock,
    enforcement,
    status,
    summary,
    estimatedTaskCostUsd,
    estimatedBatchCostUsd,
    projectedUsedUsd,
    monthlyBudgetUsd: settings.aiMonthlyBudgetUsd,
    usedUsd,
    failureRatePercent,
    blockers,
    warnings,
  };
}
