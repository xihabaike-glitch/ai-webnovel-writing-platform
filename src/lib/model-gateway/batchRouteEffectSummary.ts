export interface BatchRouteEffectItem {
  status: "succeeded" | "failed";
  taskId: string;
  providerName: string;
  model: string;
  role?: "primary" | "fallback" | "auto" | "forced" | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  costUsd?: number | null;
  qualityScore?: number | null;
}

export interface BatchRouteEffectSummary {
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
  forcedTasks: number;
  providerLabels: string[];
  verdict: string;
}

function money(value: number) {
  return Math.round(value * 1000000) / 1000000;
}

function tokens(item: BatchRouteEffectItem) {
  return (item.inputTokens ?? 0) + (item.outputTokens ?? 0);
}

function successRate(succeeded: number, total: number) {
  if (total === 0) return 0;
  return Math.round((succeeded / total) * 100);
}

function verdictFor(input: {
  totalTasks: number;
  successRatePercent: number;
  failedTasks: number;
  fallbackTasks: number;
  averageQualityScore: number | null;
  averageCostPerSucceededTaskUsd: number;
}) {
  if (input.totalTasks === 0) return "本批还没有可回收的模型路线效果。";
  if (input.successRatePercent < 80) return "本批成功率偏低，下一轮先别放量，优先回看失败原因和模型路线。";
  if (input.fallbackTasks > 0) return "本批触发了备用模型，说明首选路线需要继续观察稳定性。";
  if (input.averageQualityScore !== null && input.averageQualityScore < 80) return "本批质量分偏低，模型能跑但还不适合扩大生产。";
  if (input.averageCostPerSucceededTaskUsd > 0.05) return "本批成本偏高，下一轮建议比较低成本模型或缩小批量。";
  return "本批路线表现稳定，可以作为后续模型推荐样本。";
}

export function buildBatchRouteEffectSummary(items: BatchRouteEffectItem[]): BatchRouteEffectSummary {
  const succeededTasks = items.filter((item) => item.status === "succeeded").length;
  const failedTasks = items.filter((item) => item.status === "failed").length;
  const knownCostUsd = money(items.reduce((sum, item) => sum + (item.costUsd ?? 0), 0));
  const scored = items
    .map((item) => item.qualityScore)
    .filter((score): score is number => typeof score === "number");
  const averageQualityScore = scored.length
    ? Math.round(scored.reduce((sum, score) => sum + score, 0) / scored.length)
    : null;
  const averageCostPerSucceededTaskUsd = succeededTasks
    ? money(knownCostUsd / succeededTasks)
    : 0;
  const primaryTasks = items.filter((item) => item.role === "primary").length;
  const fallbackTasks = items.filter((item) => item.role === "fallback").length;
  const autoTasks = items.filter((item) => !item.role || item.role === "auto").length;
  const forcedTasks = items.filter((item) => item.role === "forced").length;
  const successRatePercent = successRate(succeededTasks, items.length);

  return {
    totalTasks: items.length,
    succeededTasks,
    failedTasks,
    successRatePercent,
    totalTokens: items.reduce((sum, item) => sum + tokens(item), 0),
    knownCostUsd,
    averageCostPerSucceededTaskUsd,
    averageQualityScore,
    primaryTasks,
    fallbackTasks,
    autoTasks,
    forcedTasks,
    providerLabels: [...new Set(items.map((item) => `${item.providerName} · ${item.model}`))],
    verdict: verdictFor({
      totalTasks: items.length,
      successRatePercent,
      failedTasks,
      fallbackTasks,
      averageQualityScore,
      averageCostPerSucceededTaskUsd,
    }),
  };
}
