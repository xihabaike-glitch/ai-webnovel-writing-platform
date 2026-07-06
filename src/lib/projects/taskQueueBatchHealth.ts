import {
  buildGateBatchTacticEffectReview,
  gateActionReceiptFromAuditRecord,
  type GateActionAuditRecord,
  type GateBatchTacticEffectReview,
} from "./gateActionReceipts.ts";

export interface TaskQueueBatchRhythmDecision {
  tone: "scale" | "watch" | "repair" | "empty";
  label: string;
  detail: string;
  actionLabel: string;
  href: string;
  evidence: string[];
}

export type TaskQueueBatchHealthAudit = Pick<GateActionAuditRecord,
  "receiptId"
  | "label"
  | "detail"
  | "href"
  | "status"
  | "message"
  | "executionType"
  | "succeededCount"
  | "failedCount"
  | "payload"
  | "createdAt"
> & Partial<Pick<GateActionAuditRecord,
  "actionId"
  | "taskId"
  | "platformId"
  | "platformName"
  | "recheckStatus"
  | "recheckLabel"
  | "recheckDetail"
  | "recheckAction"
>>;

function normalizeBatchHealthAudit(audit: TaskQueueBatchHealthAudit): GateActionAuditRecord {
  return {
    receiptId: audit.receiptId,
    actionId: audit.actionId ?? `recommended-batch:${audit.receiptId}`,
    label: audit.label,
    detail: audit.detail,
    href: audit.href,
    status: audit.status,
    message: audit.message,
    executionType: audit.executionType,
    succeededCount: audit.succeededCount,
    failedCount: audit.failedCount,
    taskId: audit.taskId ?? null,
    platformId: audit.platformId ?? "",
    platformName: audit.platformName ?? "",
    recheckStatus: audit.recheckStatus ?? "ready",
    recheckLabel: audit.recheckLabel ?? "复检任务队列",
    recheckDetail: audit.recheckDetail ?? "推荐批次已执行，刷新任务队列确认后续策略。",
    recheckAction: audit.recheckAction ?? "刷新任务队列",
    payload: audit.payload,
    createdAt: audit.createdAt,
  };
}

export function buildTaskQueueBatchHealthReview(
  audits: TaskQueueBatchHealthAudit[],
  limit = 5,
): GateBatchTacticEffectReview {
  return buildGateBatchTacticEffectReview(audits.map((audit) => gateActionReceiptFromAuditRecord(normalizeBatchHealthAudit(audit))), limit);
}

export function buildTaskQueueBatchRhythmDecision(review: GateBatchTacticEffectReview): TaskQueueBatchRhythmDecision {
  const blocked = review.items.find((item) => item.status === "blocked") ?? null;
  if (blocked) {
    return {
      tone: "repair",
      label: "先修批次问题",
      detail: `${blocked.tacticLabel} 最近批次出现失败或低分，先拆失败样本、模型路线和提示词问题，不继续喂给新批次。`,
      actionLabel: "去失败修复",
      href: "/failures",
      evidence: blocked.evidence.slice(0, 2),
    };
  }

  const usable = review.items.find((item) => item.status === "usable") ?? null;
  if (usable) {
    return {
      tone: "scale",
      label: "继续普通推荐批次",
      detail: `${usable.tacticLabel} 已连续健康，可按普通推荐批次继续小步推进；仍保留批量安全阀和回执复盘。`,
      actionLabel: "执行下一批",
      href: "/tasks#recommended-batch",
      evidence: usable.evidence.slice(0, 2),
    };
  }

  const watch = review.items.find((item) => item.status === "watch") ?? null;
  if (watch) {
    return {
      tone: "watch",
      label: "继续小批观察",
      detail: `${watch.tacticLabel} 样本还薄，下一轮继续小批验证；先别扩大批量，也别沉淀成长期模板。`,
      actionLabel: "跑观察小批",
      href: "/tasks#recommended-batch",
      evidence: watch.evidence.slice(0, 2),
    };
  }

  return {
    tone: "empty",
    label: "先跑首个推荐批次",
    detail: "还没有可用的推荐批次回执，先执行一轮普通推荐批次，再用真实成功率、质量和成本决定后续节奏。",
    actionLabel: "查看推荐批次",
    href: "/tasks#recommended-batch",
    evidence: [],
  };
}
