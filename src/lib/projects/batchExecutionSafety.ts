import type { QueueItem } from "./taskQueueCenter.ts";
import { defaultBatchExecutionStrategy, type BatchExecutionStrategy } from "./batchExecutionStrategy.ts";

export interface SafetyTaskProject {
  aiTasks: Array<{
    status: string;
    inputTokens: number | null;
    outputTokens: number | null;
    costUsd: number | null;
  }>;
}

export interface ExecutionSafetyItem {
  id: string;
  label: string;
  status: "pass" | "warn" | "block";
  detail: string;
}

export interface BatchExecutionSafety {
  strategy: BatchExecutionStrategy;
  recommendedBatchIds: string[];
  recommendedBatchSize: number;
  estimatedTokens: number;
  estimatedCostUsd: number;
  maxBatchSize: number;
  canRunRecommendedBatch: boolean;
  items: ExecutionSafetyItem[];
  warnings: string[];
}

const estimatedTokensByCategory: Record<QueueItem["category"], number> = {
  candidate: 0,
  draft: 3200,
  review: 1800,
  second_pass: 4200,
  export: 0,
  blocked: 0,
};

function money(value: number) {
  return Math.round(value * 1000000) / 1000000;
}

function safetyItem(
  id: string,
  label: string,
  status: ExecutionSafetyItem["status"],
  detail: string,
): ExecutionSafetyItem {
  return { id, label, status, detail };
}

function historicalCostPerToken(projects: SafetyTaskProject[]) {
  const succeeded = projects.flatMap((project) => project.aiTasks)
    .filter((task) => task.status === "succeeded" && task.costUsd !== null);
  const totalTokens = succeeded.reduce((sum, task) => sum + (task.inputTokens ?? 0) + (task.outputTokens ?? 0), 0);
  const totalCost = succeeded.reduce((sum, task) => sum + (task.costUsd ?? 0), 0);

  if (totalTokens <= 0 || totalCost <= 0) return 0;
  return totalCost / totalTokens;
}

function categoryMix(batch: QueueItem[]) {
  return new Set(batch.map((item) => item.category));
}

function projectMix(batch: QueueItem[]) {
  return new Set(batch.map((item) => item.projectId));
}

function isRunnableBatchItem(item: QueueItem) {
  return item.category === "draft" || item.category === "review" || item.category === "second_pass";
}

export function buildBatchExecutionSafety(
  queueItems: QueueItem[],
  projects: SafetyTaskProject[],
  strategy: BatchExecutionStrategy = defaultBatchExecutionStrategy,
): BatchExecutionSafety {
  const runnable = queueItems.filter(isRunnableBatchItem);
  const firstRunnable = runnable[0] ?? null;
  const recommended = firstRunnable?.scaleGate === "sample_only"
    ? [firstRunnable]
    : runnable.slice(0, strategy.maxBatchSize);
  const blockedCount = queueItems.filter((item) => item.category === "blocked").length;
  const candidateCount = queueItems.filter((item) => item.category === "candidate").length;
  const sampleOnlyCount = queueItems.filter((item) => item.scaleGate === "sample_only" && isRunnableBatchItem(item)).length;
  const clearedWatchCount = queueItems.filter((item) => item.scaleGate === "cleared" && isRunnableBatchItem(item)).length;
  const estimatedTokens = recommended.reduce((sum, item) => sum + estimatedTokensByCategory[item.category], 0);
  const costPerToken = historicalCostPerToken(projects);
  const estimatedCostUsd = money(estimatedTokens * costPerToken);
  const categoryCount = categoryMix(recommended).size;
  const projectCount = projectMix(recommended).size;
  const runningTasks = projects.flatMap((project) => project.aiTasks)
    .filter((task) => task.status === "queued" || task.status === "running").length;
  const failedTasks = projects.flatMap((project) => project.aiTasks)
    .filter((task) => task.status === "failed").length;
  const totalTasks = projects.flatMap((project) => project.aiTasks).length;
  const failureRate = totalTasks > 0 ? Math.round((failedTasks / totalTasks) * 100) : 0;
  const items = [
    safetyItem(
      "batch-size",
      "批量数量",
      recommended.length === 0 ? "block" : recommended.length <= strategy.maxBatchSize ? "pass" : "block",
      recommended.length === 0
        ? "没有可执行任务，先补章节卡或进入项目工作台。"
        : `建议本批执行 ${recommended.length} 个任务，${strategy.label}档上限 ${strategy.maxBatchSize} 个。`,
    ),
    safetyItem(
      "pending-candidates",
      "候选稿确认",
      candidateCount === 0 ? "pass" : "block",
      candidateCount === 0
        ? "当前没有待采纳 AI 候选稿。"
        : `${candidateCount} 个 AI 候选稿还没由作者确认；先处理候选，再继续批量生产。`,
    ),
    safetyItem(
      "blocked-items",
      "阻塞任务",
      blockedCount === 0 ? "pass" : "warn",
      blockedCount === 0 ? "本批没有阻塞项。" : `${blockedCount} 个任务卡住，不能进入批量执行。`,
    ),
    safetyItem(
      "watch-scale-gate",
      "观察放量闸门",
      sampleOnlyCount === 0 ? "pass" : "warn",
      sampleOnlyCount === 0
        ? clearedWatchCount > 0
          ? `${clearedWatchCount} 个观察任务已通过小样本验收，可以谨慎进入批次。`
          : "当前没有观察期小样本闸门。"
        : `当前只允许单章小样本，本批不会扩大；完成依据需写清通过线、不可接受项、复查证据和放量结论。`,
    ),
    safetyItem(
      "mixed-actions",
      "动作混跑",
      categoryCount <= 1 ? "pass" : "warn",
      categoryCount <= 1 ? "本批任务类型一致。" : `本批包含 ${categoryCount} 类动作，建议按审稿、二改、初稿、导出分批跑。`,
    ),
    safetyItem(
      "mixed-projects",
      "项目混跑",
      projectCount <= 1 || strategy.allowCrossProject ? "pass" : "warn",
      projectCount <= 1
        ? "本批只涉及 1 个项目。"
        : strategy.allowCrossProject
          ? `${strategy.label}档允许同类任务跨项目补齐批次，本批跨 ${projectCount} 个项目。`
          : `本批跨 ${projectCount} 个项目，当前档位建议保持单项目上下文。`,
    ),
    safetyItem(
      "running-tasks",
      "并发占用",
      runningTasks === 0 ? "pass" : runningTasks <= strategy.runningWarnThreshold ? "warn" : runningTasks < strategy.runningBlockThreshold ? "warn" : "block",
      runningTasks === 0 ? "当前没有排队或运行中的 AI 任务。" : `当前已有 ${runningTasks} 个任务排队或运行。`,
    ),
    safetyItem(
      "failure-rate",
      "失败率",
      failureRate < strategy.failureWarnPercent ? "pass" : failureRate < strategy.failureBlockPercent ? "warn" : "block",
      totalTasks === 0 ? "还没有历史任务样本。" : `历史 AI 失败率 ${failureRate}%。`,
    ),
    safetyItem(
      "budget",
      "预算估算",
      estimatedTokens <= strategy.maxEstimatedTokens ? "pass" : "warn",
      costPerToken > 0
        ? `预计约 ${estimatedTokens} Token，${strategy.label}档阈值 ${strategy.maxEstimatedTokens}，参考历史成本约 $${estimatedCostUsd.toFixed(4)}。`
        : `预计约 ${estimatedTokens} Token，${strategy.label}档阈值 ${strategy.maxEstimatedTokens}；暂无真实成本样本，只能先按 Token 控量。`,
    ),
  ];
  const warnings = items
    .filter((item) => item.status !== "pass")
    .map((item) => `${item.label}：${item.detail}`);

  return {
    strategy,
    recommendedBatchIds: recommended.map((item) => item.id),
    recommendedBatchSize: recommended.length,
    estimatedTokens,
    estimatedCostUsd,
    maxBatchSize: strategy.maxBatchSize,
    canRunRecommendedBatch: recommended.length > 0 && items.every((item) => item.status !== "block"),
    items,
    warnings: warnings.length ? warnings : ["建议批次暂无明显执行风险。"],
  };
}
