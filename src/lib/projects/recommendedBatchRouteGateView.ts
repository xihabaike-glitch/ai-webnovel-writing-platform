export interface RecommendedBatchRouteGateViewInput {
  status: "allow" | "sample" | "block";
  label: string;
  headline: string;
  detail: string;
  maxBatchSize: number;
  totalTasks?: number;
  recoveryEvidence: string | null;
  recheckAdvice: unknown | null;
}

export interface RecommendedBatchRouteGateTimelineItem {
  label: string;
  status: "done" | "active" | "pending";
}

export interface RecommendedBatchRouteGateTimeline {
  tone: "ok" | "watch" | "blocked";
  label: string;
  summary: string;
  items: RecommendedBatchRouteGateTimelineItem[];
}

function hasRecoverySamplePass(evidence: string | null) {
  return Boolean(evidence?.includes("恢复样本通过"));
}

function hasRouteRecheckPass(evidence: string | null) {
  return Boolean(evidence?.includes("复检通过") || hasRecoverySamplePass(evidence));
}

export function buildRecommendedBatchRouteGateTimeline(
  gate: RecommendedBatchRouteGateViewInput,
): RecommendedBatchRouteGateTimeline {
  const recheckPassed = hasRouteRecheckPass(gate.recoveryEvidence);
  const recoverySamplePassed = hasRecoverySamplePass(gate.recoveryEvidence);

  if (gate.status === "block") {
    return {
      tone: "blocked",
      label: "模型路线拦截",
      summary: "先完成模型路线复检或治理，再恢复推荐批次。",
      items: [
        { label: "路线风险待复检", status: "active" },
        { label: "恢复样本未开启", status: "pending" },
        { label: "标准批量关闭", status: "pending" },
      ],
    };
  }

  if (gate.status === "sample") {
    return {
      tone: "watch",
      label: recheckPassed ? "复检通过，等待恢复样本" : "小样本观察",
      summary: recheckPassed
        ? `本轮最多 ${gate.maxBatchSize} 个恢复样本，样本过线后再恢复正常批量。`
        : `本轮最多 ${gate.maxBatchSize} 个样本，先建立成功率、质量、成本证据。`,
      items: [
        { label: recheckPassed ? "路线复检通过" : "路线证据不足", status: recheckPassed ? "done" : "active" },
        { label: "恢复样本待跑", status: "active" },
        { label: "标准批量未开启", status: "pending" },
      ],
    };
  }

  if (recoverySamplePassed) {
    return {
      tone: "ok",
      label: "正常批量已恢复",
      summary: `恢复样本已过线，本轮最多 ${gate.maxBatchSize} 个任务可按推荐批次执行。`,
      items: [
        { label: "路线复检通过", status: "done" },
        { label: "恢复样本通过", status: "done" },
        { label: "标准批量已开启", status: "active" },
      ],
    };
  }

  return {
    tone: "ok",
    label: "模型路线通过",
    summary: `本轮最多 ${gate.maxBatchSize} 个任务可执行，继续观察成功率、质量和成本。`,
    items: [
      { label: "路线健康", status: "done" },
      { label: "无需恢复样本", status: "done" },
      { label: "标准批量可执行", status: "active" },
    ],
  };
}
