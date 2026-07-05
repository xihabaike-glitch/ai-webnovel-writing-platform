import { buildGateActionReceipt, type GateActionReceipt, type GateActionReceiptPayload } from "./gateActionReceipts.ts";
import { buildAiPipelineRecheckDispatchPlan } from "./controlActionSeeds.ts";
import type { TaskQueueBatchReceipt, TaskQueueBatchRouteEffect, TaskQueueBatchRunResult } from "./taskQueueBatchReceipt.ts";
import type { TaskQueueExecutionPlan } from "./taskQueueExecutionPlan.ts";

export interface AiPipelineRecheckGateActionReceipt {
  receipt: GateActionReceipt;
  payload: GateActionReceiptPayload & {
    sourceDispatchKey: string;
    strategyId: "standard";
    aiPipelineRecheck: {
      dispatchKey: string;
      mode: "sample_recheck" | "small_batch_resume";
    };
  };
}

export type AiPipelineRecheckNextActionKind = "resume_small_batch" | "repair_checklist" | "review_quality" | "watch_cost";

export interface AiPipelineRecheckNextActionExecution {
  method: "POST";
  endpoint: string;
  body: {
    areaId: "ai-pipeline";
  };
}

export interface AiPipelineRecheckNextAction {
  kind: AiPipelineRecheckNextActionKind;
  label: string;
  detail: string;
  href: string;
  execution?: AiPipelineRecheckNextActionExecution;
}

function recheckMode(plan: Pick<TaskQueueExecutionPlan, "scaleGate" | "chapterIds">): AiPipelineRecheckGateActionReceipt["payload"]["aiPipelineRecheck"]["mode"] {
  if (plan.scaleGate === "sample_only" || plan.chapterIds.length <= 1) return "sample_recheck";
  return "small_batch_resume";
}

function receiptStatus(batchReceipt: TaskQueueBatchReceipt): GateActionReceipt["status"] {
  return batchReceipt.status === "repair" ? "failed" : "succeeded";
}

function receiptIdFromRecheckDispatchKey(dispatchKey: string, projectId: string) {
  const prefix = `ai-pipeline-recheck:${projectId}:`;
  if (!dispatchKey.startsWith(prefix)) return null;
  const rest = dispatchKey.slice(prefix.length);
  const suffixIndex = rest.lastIndexOf(":");
  if (suffixIndex <= 0) return null;
  const suffix = rest.slice(suffixIndex + 1);
  if (suffix !== "sample" && suffix !== "scale") return null;
  return rest.slice(0, suffixIndex);
}

function platformNameFromPlan(plan: Pick<TaskQueueExecutionPlan, "strategyBases">) {
  const title = plan.strategyBases[0]?.title ?? "";
  const match = title.match(/首轮平台打法[:：](.+)$/u);
  return match?.[1]?.trim() || "AI 写审改";
}

export function buildAiPipelineRecheckNextAction(input: {
  dispatchKey: string;
  projectId: string | null;
  mode: AiPipelineRecheckGateActionReceipt["payload"]["aiPipelineRecheck"]["mode"];
  batchStatus: TaskQueueBatchReceipt["status"];
  primaryHref: string;
  successRatePercent: number;
  averageQualityScore: number | null;
}): AiPipelineRecheckNextAction {
  const projectHref = input.projectId ? `/projects/${input.projectId}#ai-pipeline` : input.primaryHref || "/tasks#recommended-batch";
  if (input.batchStatus === "repair") {
    return {
      kind: "repair_checklist",
      label: "生成修复清单",
      detail: `AI 复检未过线，成功率 ${input.successRatePercent}%，质量 ${input.averageQualityScore ?? "缺样本"}。先生成修复清单，不要恢复批量。`,
      href: projectHref,
      execution: input.projectId
        ? {
          method: "POST",
          endpoint: `/api/projects/${input.projectId}/control-actions`,
          body: { areaId: "ai-pipeline" },
        }
        : undefined,
    };
  }
  if (input.batchStatus === "review_quality") {
    return {
      kind: "review_quality",
      label: "回到二改质检",
      detail: `AI 复检质量 ${input.averageQualityScore ?? "缺样本"}，先回 AI 写审改处理低分章节，再决定是否恢复小批。`,
      href: projectHref,
    };
  }
  if (input.batchStatus === "watch_cost") {
    return {
      kind: "watch_cost",
      label: "看模型成本",
      detail: "AI 复检成本偏高，先看模型审计和路线成本，再恢复小批执行。",
      href: "/settings/models",
    };
  }
  return {
    kind: "resume_small_batch",
    label: input.mode === "sample_recheck" ? "恢复小批执行" : "继续小批执行",
    detail: `AI 复检已过线，成功率 ${input.successRatePercent}%，质量 ${input.averageQualityScore ?? "缺样本"}。下一步只恢复小批，不要直接无限放量。`,
    href: projectHref,
  };
}

export function buildAiPipelineRecheckRecoveryDispatchPlan(input: {
  projectId: string;
  sourceDispatchKey: string;
  mode: AiPipelineRecheckGateActionReceipt["payload"]["aiPipelineRecheck"]["mode"];
  batchStatus: TaskQueueBatchReceipt["status"];
  healthLabel: string;
  healthDetail: string;
}) {
  if (input.mode !== "sample_recheck" || input.batchStatus !== "continue") return null;
  const receiptId = receiptIdFromRecheckDispatchKey(input.sourceDispatchKey, input.projectId);
  if (!receiptId) return null;
  return buildAiPipelineRecheckDispatchPlan({
    projectId: input.projectId,
    receiptId,
    recheckStatus: "small_batch_ready",
    healthLabel: input.healthLabel,
    healthDetail: input.healthDetail,
  });
}

export function buildAiPipelineRecheckGateActionReceipt(input: {
  dispatchKey: string;
  projectId: string | null;
  projectTitle: string | null;
  href: string;
  plan: TaskQueueExecutionPlan;
  results: TaskQueueBatchRunResult[];
  routeEffectSummary: TaskQueueBatchRouteEffect;
  batchReceipt: TaskQueueBatchReceipt;
  now?: Date | string;
}): AiPipelineRecheckGateActionReceipt {
  const payload: AiPipelineRecheckGateActionReceipt["payload"] = {
    sourceDispatchKey: input.dispatchKey,
    strategyId: "standard",
    aiPipelineRecheck: {
      dispatchKey: input.dispatchKey,
      mode: recheckMode(input.plan),
    },
    plan: {
      strategyBases: input.plan.strategyBases,
      scaleGate: input.plan.scaleGate,
      actionLabel: input.plan.actionLabel,
      category: input.plan.category,
      itemIds: input.plan.itemIds,
      chapterIds: input.plan.chapterIds,
      adoptionFollowupCount: input.plan.adoptionFollowupCount,
      adoptionFollowupItemIds: input.plan.adoptionFollowupItemIds,
    },
    results: input.results.map((result) => ({
      status: result.status,
      taskId: result.taskId,
      chapterId: result.chapterId,
      chapterTitle: result.chapterTitle,
      error: result.error,
    })),
    routeEffectSummary: input.routeEffectSummary,
    batchReceipt: input.batchReceipt,
  };
  const platformName = platformNameFromPlan(input.plan);
  const receipt = buildGateActionReceipt({
    action: {
      id: input.dispatchKey,
      label: `沉淀${input.plan.actionLabel}复检经验`,
      detail: `${platformName} · ${input.projectTitle ?? "AI 写审改"} · ${input.plan.actionLabel}`,
      href: input.href || "/gate",
      tone: receiptStatus(input.batchReceipt) === "failed" ? "repair" : "primary",
      execution: {
        type: "recommended_batch",
        strategyId: "standard",
      },
    },
    payload,
    status: receiptStatus(input.batchReceipt),
    now: input.now,
  });

  return {
    receipt: {
      ...receipt,
      href: input.href || receipt.href,
      platformName,
    },
    payload,
  };
}
