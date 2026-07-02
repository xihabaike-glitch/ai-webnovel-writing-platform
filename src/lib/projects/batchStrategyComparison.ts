import type { TaskBatchHistoryItem } from "../ai/taskBatchHistory.ts";
import { buildBatchExecutionSafety, type SafetyTaskProject } from "./batchExecutionSafety.ts";
import { batchExecutionStrategies, type BatchExecutionStrategy, type BatchExecutionStrategyId } from "./batchExecutionStrategy.ts";
import type { QueueItem } from "./taskQueueCenter.ts";
import { buildTaskQueueExecutionPlan } from "./taskQueueExecutionPlan.ts";

export interface BatchStrategyComparisonRow {
  strategy: BatchExecutionStrategy;
  recommendedBatchSize: number;
  maxBatchSize: number;
  estimatedTokens: number;
  estimatedCostUsd: number;
  passChecks: number;
  warnChecks: number;
  blockChecks: number;
  canRun: boolean;
  predictedSuccessRatePercent: number;
  recentAverageQualityScore: number | null;
  recentAverageCostUsd: number;
  verdict: string;
}

export interface BatchStrategyComparison {
  recommendedStrategyId: BatchExecutionStrategyId;
  headline: string;
  rows: BatchStrategyComparisonRow[];
}

function money(value: number) {
  return Math.round(value * 1000000) / 1000000;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function recentBaseline(history: TaskBatchHistoryItem[]) {
  const samples = history.filter((batch) => batch.summary.totalTasks > 0);
  const totalTasks = samples.reduce((sum, batch) => sum + batch.summary.totalTasks, 0);
  const succeededTasks = samples.reduce((sum, batch) => sum + batch.summary.succeededTasks, 0);
  const scored = samples
    .filter((batch) => batch.summary.averageQualityScore !== null)
    .map((batch) => ({
      score: batch.summary.averageQualityScore ?? 0,
      weight: Math.max(1, batch.summary.succeededTasks),
    }));
  const totalScoreWeight = scored.reduce((sum, item) => sum + item.weight, 0);

  return {
    successRatePercent: totalTasks > 0 ? Math.round((succeededTasks / totalTasks) * 100) : 70,
    averageQualityScore: totalScoreWeight > 0
      ? Math.round(scored.reduce((sum, item) => sum + item.score * item.weight, 0) / totalScoreWeight)
      : null,
    averageCostUsd: totalTasks > 0 ? money(samples.reduce((sum, batch) => sum + batch.summary.knownCostUsd, 0) / totalTasks) : 0,
    sampleBatches: samples.length,
  };
}

function predictedSuccessRate(input: {
  baselineSuccessRatePercent: number;
  warnChecks: number;
  blockChecks: number;
  estimatedTokens: number;
  strategy: BatchExecutionStrategy;
}) {
  const tokenPenalty = input.estimatedTokens > input.strategy.maxEstimatedTokens ? 8 : 0;
  const riskPenalty = input.warnChecks * 4 + input.blockChecks * 25 + tokenPenalty;
  const scaleBonus = input.strategy.id === "aggressive" ? 3 : input.strategy.id === "conservative" ? -2 : 0;
  return clampPercent(input.baselineSuccessRatePercent - riskPenalty + scaleBonus);
}

function rowVerdict(row: Pick<BatchStrategyComparisonRow, "strategy" | "canRun" | "blockChecks" | "warnChecks" | "predictedSuccessRatePercent" | "recentAverageQualityScore" | "recommendedBatchSize">) {
  if (row.recommendedBatchSize === 0) return "当前没有可执行批次，先补章节卡或处理阻塞。";
  if (!row.canRun || row.blockChecks > 0) return "当前档位会触发阻止项，先别用它放量。";
  if (row.predictedSuccessRatePercent < 75) return "预测成功率偏低，只适合排查，不适合扩大生产。";
  if (row.recentAverageQualityScore !== null && row.recentAverageQualityScore < 80) return "最近质量分偏低，先守住章节卡质量再放量。";
  if (row.strategy.id === "aggressive") return "模型路线较稳时可用于提速，但要盯跨项目风格漂移。";
  if (row.strategy.id === "conservative") return "适合在失败或未落地任务较多时稳住链路。";
  return "适合日常生产，风险和吞吐比较均衡。";
}

function recommendedRow(rows: BatchStrategyComparisonRow[], baseline: ReturnType<typeof recentBaseline>) {
  const runnable = rows.filter((row) => row.canRun && row.blockChecks === 0);
  const conservative = rows.find((row) => row.strategy.id === "conservative") ?? rows[0];
  const standard = rows.find((row) => row.strategy.id === "standard") ?? conservative;
  const aggressive = rows.find((row) => row.strategy.id === "aggressive") ?? standard;

  if (runnable.length === 0) return conservative;
  if (baseline.sampleBatches < 2 || baseline.successRatePercent < 80 || (baseline.averageQualityScore !== null && baseline.averageQualityScore < 80)) {
    return runnable.find((row) => row.strategy.id === "conservative") ?? runnable[0];
  }
  if (baseline.successRatePercent >= 92 && (baseline.averageQualityScore ?? 85) >= 84 && aggressive.canRun && aggressive.blockChecks === 0 && aggressive.warnChecks <= 2) {
    return aggressive;
  }
  return standard.canRun && standard.blockChecks === 0 ? standard : runnable[0];
}

export function buildBatchStrategyComparison(
  queueItems: QueueItem[],
  projects: SafetyTaskProject[],
  batchHistory: TaskBatchHistoryItem[],
): BatchStrategyComparison {
  const baseline = recentBaseline(batchHistory);
  const rows = batchExecutionStrategies.map((strategy) => {
    const safety = buildBatchExecutionSafety(queueItems, projects, strategy);
    const plan = buildTaskQueueExecutionPlan(queueItems, strategy.maxBatchSize, strategy);
    const warnChecks = safety.items.filter((item) => item.status === "warn").length;
    const blockChecks = safety.items.filter((item) => item.status === "block").length;
    const passChecks = safety.items.filter((item) => item.status === "pass").length;
    const predicted = predictedSuccessRate({
      baselineSuccessRatePercent: baseline.successRatePercent,
      warnChecks,
      blockChecks,
      estimatedTokens: safety.estimatedTokens,
      strategy,
    });
    const row: BatchStrategyComparisonRow = {
      strategy,
      recommendedBatchSize: plan.chapterIds.length,
      maxBatchSize: strategy.maxBatchSize,
      estimatedTokens: safety.estimatedTokens,
      estimatedCostUsd: safety.estimatedCostUsd,
      passChecks,
      warnChecks,
      blockChecks,
      canRun: safety.canRunRecommendedBatch && plan.canRun,
      predictedSuccessRatePercent: predicted,
      recentAverageQualityScore: baseline.averageQualityScore,
      recentAverageCostUsd: baseline.averageCostUsd,
      verdict: "",
    };
    return {
      ...row,
      verdict: rowVerdict(row),
    };
  });
  const recommended = recommendedRow(rows, baseline);

  return {
    recommendedStrategyId: recommended.strategy.id,
    headline: `建议使用${recommended.strategy.label}档：${recommended.verdict}`,
    rows,
  };
}
