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

export async function completeFirstDayDispatchStep(projectId: string, stepId: string, completionEvidence: string) {
  const trimmedEvidence = completionEvidence.trim();
  if (trimmedEvidence.length < MIN_COMPLETION_EVIDENCE_LENGTH) {
    throw new Error("完成派单前，请写清楚完成依据，至少 8 个字。");
  }

  return updatePersistedGateDispatchTaskState(`first-day:${projectId}:${stepId}`, "completed", {
    completionEvidence: trimmedEvidence,
  });
}
