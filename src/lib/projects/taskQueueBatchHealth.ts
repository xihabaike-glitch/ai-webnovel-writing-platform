import {
  buildGateBatchTacticEffectReview,
  gateActionReceiptFromAuditRecord,
  type GateActionAuditRecord,
  type GateBatchTacticEffectReview,
} from "./gateActionReceipts.ts";

export function buildTaskQueueBatchHealthReview(
  audits: GateActionAuditRecord[],
  limit = 5,
): GateBatchTacticEffectReview {
  return buildGateBatchTacticEffectReview(audits.map((audit) => gateActionReceiptFromAuditRecord(audit)), limit);
}
