import { buildGateActionReceipt, type GateActionReceipt, type GateActionReceiptPayload } from "./gateActionReceipts.ts";
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

function recheckMode(plan: Pick<TaskQueueExecutionPlan, "scaleGate" | "chapterIds">): AiPipelineRecheckGateActionReceipt["payload"]["aiPipelineRecheck"]["mode"] {
  if (plan.scaleGate === "sample_only" || plan.chapterIds.length <= 1) return "sample_recheck";
  return "small_batch_resume";
}

function receiptStatus(batchReceipt: TaskQueueBatchReceipt): GateActionReceipt["status"] {
  return batchReceipt.status === "repair" ? "failed" : "succeeded";
}

function platformNameFromPlan(plan: Pick<TaskQueueExecutionPlan, "strategyBases">) {
  const title = plan.strategyBases[0]?.title ?? "";
  const match = title.match(/首轮平台打法[:：](.+)$/u);
  return match?.[1]?.trim() || "AI 写审改";
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
