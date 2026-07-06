export interface ProjectControlDashboardActionFeedback {
  text: string;
  actionLabel: string | null;
  actionHref: string | null;
}

export interface AiPipelineDispatchFeedbackPayload {
  message?: string;
  dispatchKey?: string | null;
  dispatchTitle?: string | null;
  dispatchHref?: string | null;
}

export function aiPipelineDispatchHref(dispatchKey: string) {
  return `/dispatch?queue=ai_pipeline#dispatch-${dispatchKey}`;
}

export function buildAiPipelineDispatchFeedback(
  payload: AiPipelineDispatchFeedbackPayload,
  fallbackMessage: string,
): ProjectControlDashboardActionFeedback {
  const baseMessage = payload.message?.trim() || fallbackMessage;
  const dispatchTitle = payload.dispatchTitle?.trim() || null;
  const dispatchKey = payload.dispatchKey?.trim() || null;
  const dispatchHref = payload.dispatchHref?.trim() || (dispatchKey ? aiPipelineDispatchHref(dispatchKey) : null);
  const dispatchText = dispatchTitle ? `已派单：${dispatchTitle}。` : "";
  return {
    text: [baseMessage, dispatchText].filter(Boolean).join(" "),
    actionLabel: dispatchHref ? "去处理派单" : null,
    actionHref: dispatchHref,
  };
}
