export interface RecommendedBatchRouteGateViewInput {
  status: "allow" | "sample" | "block";
  label: string;
  headline: string;
  detail: string;
  actionLabel?: string;
  targetHref?: string;
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
  primaryActionLabel: string;
  primaryActionDetail: string;
  items: RecommendedBatchRouteGateTimelineItem[];
}

export interface RecommendedBatchRouteGateActions {
  canCreateRecheckDispatch: boolean;
  primaryLinkLabel: string;
  primaryLinkHref: string;
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
      primaryActionLabel: "先完成模型路线复检",
      primaryActionDetail: "当前推荐批量已暂停；去派单中心完成复检或治理，再回任务页恢复小样本。",
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
      primaryActionLabel: recheckPassed ? `跑 ${gate.maxBatchSize} 个恢复样本` : `跑 ${gate.maxBatchSize} 个观察样本`,
      primaryActionDetail: recheckPassed
        ? "这一步不是恢复正常批量，只验证复检后的路线能否稳定产出，再决定是否放量。"
        : "先用小样本建立成功率、质量、成本证据，通过后再讨论扩大批次。",
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
      primaryActionLabel: "执行恢复后的推荐批次",
      primaryActionDetail: "恢复样本已经过线，可以按当前推荐批次执行；执行后继续回收质量、失败和成本证据。",
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
    primaryActionLabel: "执行推荐批次",
    primaryActionDetail: "按当前队列优先级执行推荐小批次，并把成功率、质量和成本写回总闸门。",
    items: [
      { label: "路线健康", status: "done" },
      { label: "无需恢复样本", status: "done" },
      { label: "标准批量可执行", status: "active" },
    ],
  };
}

export function buildRecommendedBatchRouteGateActions(
  gate: RecommendedBatchRouteGateViewInput,
): RecommendedBatchRouteGateActions {
  const primaryLinkHref = gate.targetHref ?? "/tasks#recommended-batch";
  const waitingForExistingRecheck = gate.status === "block" && primaryLinkHref.includes("filter=waiting_recheck");

  return {
    canCreateRecheckDispatch: Boolean(gate.recheckAdvice) && !waitingForExistingRecheck,
    primaryLinkLabel: waitingForExistingRecheck ? "查看待复检" : gate.actionLabel ?? "继续执行",
    primaryLinkHref,
  };
}
