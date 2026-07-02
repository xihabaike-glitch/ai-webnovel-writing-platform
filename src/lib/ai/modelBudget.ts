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

export interface ModelBudgetRepairAction {
  id: string;
  label: string;
  detail: string;
  impact: string;
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
  repairActions: ModelBudgetRepairAction[];
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

function taskTypeLabel(taskType: string) {
  const labels: Record<string, string> = {
    chapter_draft: "正文初稿",
    chapter_review: "章节审稿",
    chapter_second_pass: "章节二改",
    first_three_rewrite: "前三章改写",
    submission_package_optimize: "投稿资料优化",
    platform_submission_asset_optimize: "平台投稿资产优化",
    control_asset_generate: "总控资料生成",
  };
  return labels[taskType] ?? taskType;
}

function buildRepairActions(input: {
  taskType: string;
  batchSize: number;
  estimatedTaskCostUsd: number;
  usedUsd: number;
  projectedUsedUsd: number;
  monthlyBudgetUsd: number;
  maxBatchCostUsd: number;
  failureRatePercent: number;
  maxFailureRatePercent: number;
  blockers: string[];
  warnings: string[];
}): ModelBudgetRepairAction[] {
  const actions: ModelBudgetRepairAction[] = [];
  const remainingBudgetUsd = Math.max(0, input.monthlyBudgetUsd - input.usedUsd);
  const maxByBatchLimit = input.estimatedTaskCostUsd > 0
    ? Math.floor(input.maxBatchCostUsd / input.estimatedTaskCostUsd)
    : input.batchSize;
  const maxByMonthlyLimit = input.estimatedTaskCostUsd > 0
    ? Math.floor(remainingBudgetUsd / input.estimatedTaskCostUsd)
    : input.batchSize;
  const recommendedBatchSize = Math.max(1, Math.min(input.batchSize, maxByBatchLimit, maxByMonthlyLimit));

  if (input.batchSize > 1 && recommendedBatchSize < input.batchSize) {
    actions.push({
      id: "reduce_batch_size",
      label: `本批改成 ${recommendedBatchSize} 个任务`,
      detail: `当前选择 ${input.batchSize} 个任务，预计本批 $${(input.estimatedTaskCostUsd * input.batchSize).toFixed(4)}。`,
      impact: "立即降低本次批量成本，适合先跑小样本验证质量。",
    });
  }

  if (input.taskType === "chapter_draft" || input.taskType === "chapter_second_pass") {
    actions.push({
      id: "lower_target_words",
      label: "降低目标字数后重试",
      detail: `${taskTypeLabel(input.taskType)}属于长文本输出，目标字数越高，输入输出 Token 越容易超预算。`,
      impact: "把本次目标字数下调 20%-40%，通常能直接压低单次成本。",
    });
  }

  if (input.taskType === "chapter_draft") {
    actions.push({
      id: "review_first",
      label: "先审稿，不继续生成正文",
      detail: "如果项目已经有正文样本，先跑审稿或风格体检，比继续生成新稿更省钱。",
      impact: "把预算用在判断质量上，避免继续生产需要返工的正文。",
    });
  }

  if (input.failureRatePercent > input.maxFailureRatePercent) {
    actions.push({
      id: "fix_failure_rate",
      label: "先处理失败率再放量",
      detail: `近期失败率 ${input.failureRatePercent}%，已经高于 ${input.maxFailureRatePercent}% 上限。`,
      impact: "优先检查 API Key、模型名、上下文长度和 JSON 输出格式，减少失败成本。",
    });
  }

  if (input.projectedUsedUsd > input.monthlyBudgetUsd) {
    actions.push({
      id: "raise_budget_or_warn",
      label: "调高预算或改为只提醒",
      detail: `执行后预计累计 $${input.projectedUsedUsd.toFixed(4)}，月预算为 $${input.monthlyBudgetUsd.toFixed(4)}。`,
      impact: "如果这次调用确实必要，可以在预算中心临时调高额度或切到只提醒。",
    });
  }

  if (input.blockers.length === 0 && input.warnings.length > 0) {
    actions.push({
      id: "small_sample",
      label: "保留小批量试跑",
      detail: input.warnings[0],
      impact: "先跑 1 个任务观察真实成本，再决定是否扩大队列。",
    });
  }

  return actions.filter((action, index, all) => all.findIndex((item) => item.id === action.id) === index).slice(0, 4);
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
  const repairActions = buildRepairActions({
    taskType: input.taskType,
    batchSize,
    estimatedTaskCostUsd,
    usedUsd,
    projectedUsedUsd,
    monthlyBudgetUsd: settings.aiMonthlyBudgetUsd,
    maxBatchCostUsd: settings.aiMaxBatchCostUsd,
    failureRatePercent,
    maxFailureRatePercent: settings.aiMaxFailureRatePercent,
    blockers,
    warnings,
  });

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
    repairActions,
  };
}
