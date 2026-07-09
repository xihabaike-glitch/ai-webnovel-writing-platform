export type FinalDeliveryGateStatus = "ready" | "needs_repair" | "blocked";

export interface FinalDeliveryGateCloseoutInput {
  gateStatus: FinalDeliveryGateStatus;
  publishBlockedCount: number;
  dispatchActiveCount: number;
  aiOpenCount: number;
  qualityActionLabel: string;
  qualityActionHref: string;
  dispatchNextAction?: string;
  taskNextAction?: string;
  deliveryActionLabel: string;
  deliveryActionHref: string;
}

export interface FinalDeliveryGateCloseout {
  openLaneCount: number;
  closeoutPercent: number;
  releaseLabel: string;
  nextCutLabel: string;
  primaryActionHref: string;
  primaryActionLabel: string;
  secondaryActions: Array<{
    label: string;
    href: string;
    count: number;
  }>;
  locked: boolean;
  lockLabel: string;
  deliveryHref: string;
}

export function buildFinalDeliveryGateCloseout(input: FinalDeliveryGateCloseoutInput): FinalDeliveryGateCloseout {
  const openLaneCount = [
    input.publishBlockedCount,
    input.dispatchActiveCount,
    input.aiOpenCount,
  ].filter((count) => count > 0).length;
  const locked = openLaneCount > 0 || input.gateStatus !== "ready";

  const releaseLabel = input.gateStatus === "ready"
    && input.dispatchActiveCount === 0
    && input.aiOpenCount === 0
    && input.publishBlockedCount === 0
    ? "可以进入最终交付"
    : input.publishBlockedCount > 0
      ? "先清发布卡点"
      : input.dispatchActiveCount > 0
        ? "先收派单回执"
        : input.aiOpenCount > 0
          ? "先收 AI 任务"
          : "等待总闸门复检";

  const nextCutLabel = input.publishBlockedCount > 0
    ? input.qualityActionLabel
    : input.dispatchActiveCount > 0
      ? input.dispatchNextAction ?? "回派单中心收口"
      : input.taskNextAction ?? input.deliveryActionLabel ?? "进入最终交付";

  const primaryActionHref = input.publishBlockedCount > 0
    ? input.qualityActionHref
    : input.dispatchActiveCount > 0
      ? "/dispatch#dispatch-receipt-closeout"
      : input.aiOpenCount > 0
        ? "/tasks#task-receipt-closeout"
        : input.deliveryActionHref;

  const primaryActionLabel = input.publishBlockedCount > 0
    ? "处理发布卡点"
    : input.dispatchActiveCount > 0
      ? "收派单回执"
      : input.aiOpenCount > 0
        ? "收 AI 任务"
        : input.deliveryActionLabel;

  return {
    openLaneCount,
    closeoutPercent: Math.round(((3 - openLaneCount) / 3) * 100),
    releaseLabel,
    nextCutLabel,
    primaryActionHref,
    primaryActionLabel,
    secondaryActions: [
      {
        label: "收派单回执",
        href: "/dispatch#dispatch-receipt-closeout",
        count: input.dispatchActiveCount,
      },
      {
        label: "收 AI 任务",
        href: "/tasks#task-receipt-closeout",
        count: input.aiOpenCount,
      },
    ],
    locked,
    lockLabel: locked ? "最终交付已锁定" : "最终交付入口已开放",
    deliveryHref: input.deliveryActionHref,
  };
}
