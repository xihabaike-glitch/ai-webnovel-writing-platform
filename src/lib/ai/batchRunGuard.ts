export type BatchRunAction = "draft" | "review" | "second_pass";

export interface BatchRunTaskHistory {
  status: string;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
}

export interface BatchRunGuardInput {
  action: BatchRunAction;
  batchSize: number;
  targetWords?: number;
  tasks: BatchRunTaskHistory[];
}

export interface BatchRunGuardItem {
  id: string;
  label: string;
  status: "pass" | "warn" | "block";
  detail: string;
}

export interface BatchRunGuard {
  allowed: boolean;
  summary: string;
  maxBatchSize: number;
  maxRunningTasks: number;
  maxEstimatedTokens: number;
  maxEstimatedCostUsd: number;
  estimatedTokens: number;
  estimatedCostUsd: number | null;
  runningTasks: number;
  items: BatchRunGuardItem[];
  warnings: string[];
}

const maxBatchSize = 5;
const maxRunningTasks = 3;
const maxEstimatedTokens = 20000;
const maxEstimatedCostUsd = 1;

function money(value: number) {
  return Math.round(value * 1000000) / 1000000;
}

function historicalCostPerToken(tasks: BatchRunTaskHistory[]) {
  const succeeded = tasks.filter((task) => task.status === "succeeded" && task.costUsd !== null);
  const totalTokens = succeeded.reduce((sum, task) => sum + (task.inputTokens ?? 0) + (task.outputTokens ?? 0), 0);
  const totalCost = succeeded.reduce((sum, task) => sum + (task.costUsd ?? 0), 0);
  if (totalTokens <= 0 || totalCost <= 0) return null;
  return totalCost / totalTokens;
}

function estimatedTokensPerTask(action: BatchRunAction, targetWords?: number) {
  if (action === "review") return 1800;
  const words = targetWords ?? 1200;
  if (action === "draft") return Math.max(2600, Math.round(words * 2.4));
  return Math.max(3600, Math.round(words * 2.8));
}

function item(id: string, label: string, status: BatchRunGuardItem["status"], detail: string): BatchRunGuardItem {
  return { id, label, status, detail };
}

function actionLabel(action: BatchRunAction) {
  if (action === "draft") return "批量初稿";
  if (action === "review") return "批量审稿";
  return "批量二改";
}

export function buildBatchRunGuard(input: BatchRunGuardInput): BatchRunGuard {
  const runningTasks = input.tasks.filter((task) => task.status === "queued" || task.status === "running").length;
  const estimatedTokens = input.batchSize * estimatedTokensPerTask(input.action, input.targetWords);
  const costPerToken = historicalCostPerToken(input.tasks);
  const estimatedCostUsd = costPerToken === null ? null : money(estimatedTokens * costPerToken);
  const items = [
    item(
      "batch-size",
      "批量数量",
      input.batchSize > 0 && input.batchSize <= maxBatchSize ? "pass" : "block",
      input.batchSize <= 0
        ? "没有选择可执行章节。"
        : `${actionLabel(input.action)}本次选择 ${input.batchSize} 个章节，上限 ${maxBatchSize} 个。`,
    ),
    item(
      "running-tasks",
      "并发上限",
      runningTasks < maxRunningTasks ? "pass" : "block",
      runningTasks < maxRunningTasks
        ? `当前已有 ${runningTasks} 个 AI 任务排队或运行，低于上限 ${maxRunningTasks}。`
        : `当前已有 ${runningTasks} 个 AI 任务排队或运行，达到上限 ${maxRunningTasks}。`,
    ),
    item(
      "token-budget",
      "Token 上限",
      estimatedTokens <= maxEstimatedTokens ? "pass" : "block",
      `预计约 ${estimatedTokens} Token，上限 ${maxEstimatedTokens}。`,
    ),
    item(
      "cost-budget",
      "成本上限",
      estimatedCostUsd === null ? "warn" : estimatedCostUsd <= maxEstimatedCostUsd ? "pass" : "block",
      estimatedCostUsd === null
        ? "暂无历史成本样本，先按 Token 和批量数控量。"
        : `参考历史单价，预计约 $${estimatedCostUsd.toFixed(4)}，上限 $${maxEstimatedCostUsd.toFixed(2)}。`,
    ),
  ];
  const blocking = items.filter((entry) => entry.status === "block");
  const warnings = items
    .filter((entry) => entry.status !== "pass")
    .map((entry) => `${entry.label}：${entry.detail}`);

  return {
    allowed: blocking.length === 0,
    summary: blocking.length === 0
      ? "批量执行预算与并发检查通过。"
      : `批量执行被拦截：${blocking.map((entry) => entry.label).join("、")}。`,
    maxBatchSize,
    maxRunningTasks,
    maxEstimatedTokens,
    maxEstimatedCostUsd,
    estimatedTokens,
    estimatedCostUsd,
    runningTasks,
    items,
    warnings: warnings.length ? warnings : ["批量执行预算与并发检查通过。"],
  };
}
