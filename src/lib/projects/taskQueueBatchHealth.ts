import {
  buildGateBatchTacticEffectReview,
  gateActionReceiptFromAuditRecord,
  type GateActionAuditRecord,
  type GateBatchTacticEffectReview,
} from "./gateActionReceipts.ts";

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
