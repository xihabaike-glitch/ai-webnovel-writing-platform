import type { FirstDayWorkflowStep } from "./firstDayWorkflow.ts";
import { updatePersistedGateDispatchTaskState } from "./gateActionReceipts.ts";

const ACCEPTANCE_MARKER = "任务中心已验收：";
const MIN_COMPLETION_EVIDENCE_LENGTH = 8;

function cleanEvidence(value: string) {
  return value.trim().replace(/。{2,}$/u, "。");
}

export interface FirstDayStepView extends FirstDayWorkflowStep {
  primaryEvidence: string;
  acceptanceLabel: string;
  acceptanceEvidence: string | null;
  hasTaskAcceptance: boolean;
}

export interface FirstDayReceiptCompletionInput {
  receipt: { success: boolean; completionEvidence: string } | null;
  completionEvidence: string;
  hasDispatch: boolean;
  isCompleting: boolean;
}

export interface FirstDayReceiptCompletionAction {
  visible: boolean;
  canComplete: boolean;
  label: string;
  reason: string;
}

export function buildFirstDayStepView(step: FirstDayWorkflowStep): FirstDayStepView {
  const markerIndex = step.evidence.indexOf(ACCEPTANCE_MARKER);
  if (markerIndex < 0) {
    return {
      ...step,
      primaryEvidence: cleanEvidence(step.evidence),
      acceptanceLabel: "任务中心验收",
      acceptanceEvidence: null,
      hasTaskAcceptance: false,
    };
  }

  const primaryEvidence = cleanEvidence(step.evidence.slice(0, markerIndex));
  const acceptanceEvidence = cleanEvidence(step.evidence.slice(markerIndex + ACCEPTANCE_MARKER.length));

  return {
    ...step,
    primaryEvidence,
    acceptanceLabel: "任务中心验收",
    acceptanceEvidence,
    hasTaskAcceptance: acceptanceEvidence.length > 0,
  };
}

export function buildFirstDayReceiptCompletionAction(input: FirstDayReceiptCompletionInput): FirstDayReceiptCompletionAction {
  if (!input.receipt?.success) {
    return {
      visible: false,
      canComplete: false,
      label: "验收并进入下一步",
      reason: "AI 执行回执未通过，不能直接验收。",
    };
  }

  if (!input.hasDispatch) {
    return {
      visible: true,
      canComplete: false,
      label: "验收并进入下一步",
      reason: "缺少任务中心派单，请先派到任务中心。",
    };
  }

  if (input.completionEvidence.trim().length < MIN_COMPLETION_EVIDENCE_LENGTH) {
    return {
      visible: true,
      canComplete: false,
      label: "验收并进入下一步",
      reason: "验收依据至少 8 个字。",
    };
  }

  return {
    visible: true,
    canComplete: !input.isCompleting,
    label: input.isCompleting ? "验收中" : "验收并进入下一步",
    reason: input.isCompleting ? "正在完成当前派单。" : "回执可验收，点击后刷新到下一个首日节点。",
  };
}

export async function completeFirstDayDispatchStep(projectId: string, stepId: string, completionEvidence: string) {
  const trimmedEvidence = completionEvidence.trim();
  if (trimmedEvidence.length < MIN_COMPLETION_EVIDENCE_LENGTH) {
    throw new Error("完成派单前，请写清楚完成依据，至少 8 个字。");
  }

  return updatePersistedGateDispatchTaskState(`first-day:${projectId}:${stepId}`, "completed", {
    completionEvidence: trimmedEvidence,
  });
}
