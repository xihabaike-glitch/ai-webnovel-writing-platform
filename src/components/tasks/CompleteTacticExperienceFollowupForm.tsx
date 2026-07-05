"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updatePersistedGateDispatchTaskState } from "@/lib/projects/gateActionReceipts";
import { buildTacticExperienceFollowupCompletionMessage } from "@/lib/projects/tacticExperienceFollowupCompletion";

export function CompleteTacticExperienceFollowupForm({
  actionLabel,
  completionEvidenceTemplate,
  completionEvidenceTemplateSource,
  dispatchKey,
}: {
  actionLabel: string;
  completionEvidenceTemplate?: string;
  completionEvidenceTemplateSource?: string;
  dispatchKey: string;
}) {
  const router = useRouter();
  const [completionEvidence, setCompletionEvidence] = useState(completionEvidenceTemplate ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function completeFollowup() {
    const evidence = completionEvidence.trim();
    if (evidence.length < 8) {
      setErrorMessage("完成前请写清楚依据，至少 8 个字。");
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    setMessage(null);
    try {
      const updated = await updatePersistedGateDispatchTaskState(dispatchKey, "completed", {
        completionEvidence: evidence,
      });
      const autoFollowUpCount = [
        ...updated.followUpTasks,
        ...(updated.startMetricAutoDispatch?.createdDispatches ?? []),
        ...(updated.secondMetricAutoDispatch?.createdDispatches ?? []),
        ...(updated.startMetricFollowupAutoDispatch?.createdDispatches ?? []),
        ...(updated.secondMetricFollowupAutoDispatch?.createdDispatches ?? []),
      ].length;
      setMessage(buildTacticExperienceFollowupCompletionMessage({
        actionLabel,
        knowledgeFeedbackWritten: Boolean(updated.knowledgeFeedbackReceipt),
        followUpCount: autoFollowUpCount,
      }));
      router.refresh();
    } catch (caught) {
      setErrorMessage(caught instanceof Error ? caught.message : "完成打法闭环失败。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-3 rounded-md border border-teal-200 bg-white p-3 text-sm">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="font-medium text-teal-950">完成依据</div>
          {completionEvidenceTemplateSource ? (
            <div className="mt-1 text-xs text-teal-700">{completionEvidenceTemplateSource}</div>
          ) : null}
        </div>
        {completionEvidenceTemplate ? (
          <button
            className="w-fit rounded-md border border-teal-200 px-2 py-1 text-xs font-medium text-teal-800 hover:bg-teal-50"
            onClick={() => setCompletionEvidence(completionEvidenceTemplate)}
            type="button"
          >
            套用模板
          </button>
        ) : null}
      </div>
      <textarea
        className="mt-2 min-h-32 w-full rounded-md border border-slate-200 px-3 py-2 text-sm leading-6 text-slate-800"
        onChange={(event) => setCompletionEvidence(event.target.value)}
        placeholder="写清楚小样本范围、基准版本、回收时间、风险边界和结论。"
        value={completionEvidence}
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          className="rounded-md bg-teal-700 px-3 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          onClick={() => void completeFollowup()}
          type="button"
        >
          {isSubmitting ? "回写中" : "完成并回写"}
        </button>
        {message ? <span className="text-xs leading-5 text-emerald-700">{message}</span> : null}
        {errorMessage ? <span className="text-xs leading-5 text-rose-700">{errorMessage}</span> : null}
      </div>
    </div>
  );
}
