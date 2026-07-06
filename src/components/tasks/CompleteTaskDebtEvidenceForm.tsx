"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updatePersistedGateDispatchTaskState } from "@/lib/projects/gateActionReceipts";
import { buildTaskDebtCompletionFeedback, type TaskDebtCompletionFeedback } from "@/lib/projects/taskDebtCompletionFeedback";

export function CompleteTaskDebtEvidenceForm({
  actionLabel,
  blockerType,
  completionEvidenceTemplate,
  completionEvidenceTemplateSource,
  dispatchKey,
  previousDebtCount,
}: {
  actionLabel: string;
  blockerType?: string | null;
  completionEvidenceTemplate?: string;
  completionEvidenceTemplateSource?: string;
  dispatchKey: string;
  previousDebtCount?: number;
}) {
  const router = useRouter();
  const [completionEvidence, setCompletionEvidence] = useState(completionEvidenceTemplate ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<TaskDebtCompletionFeedback | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function completeDebtEvidence() {
    const evidence = completionEvidence.trim();
    if (evidence.length < 8) {
      setErrorMessage("清债前请写清楚验收依据，至少 8 个字。");
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    setFeedback(null);
    try {
      const updated = await updatePersistedGateDispatchTaskState(dispatchKey, "completed", {
        completionEvidence: evidence,
      });
      const nextFeedback = buildTaskDebtCompletionFeedback({
        actionLabel,
        blockerType,
        previousDebtCount,
        followUpTasks: updated.followUpTasks,
        knowledgeFeedbackWritten: Boolean(updated.knowledgeFeedbackReceipt),
        dispatchCompletionReceiptLabel: updated.dispatchCompletionReceipt?.label ?? null,
        submissionEffectHeadline: updated.submissionEffectReview?.headline ?? null,
      });
      setFeedback(nextFeedback);
      router.push(nextFeedback.autoFocusHref);
      router.refresh();
    } catch (caught) {
      setErrorMessage(caught instanceof Error ? caught.message : "清债证据回写失败。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-3 rounded-md border border-rose-200 bg-rose-50/60 p-3 text-sm text-rose-950">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="font-medium">清债证据回填</div>
          {completionEvidenceTemplateSource ? (
            <div className="mt-1 text-xs text-rose-700">{completionEvidenceTemplateSource}</div>
          ) : null}
        </div>
        {completionEvidenceTemplate ? (
          <button
            className="w-fit rounded-md border border-rose-200 bg-white/80 px-2 py-1 text-xs font-medium text-rose-800 hover:bg-white"
            onClick={() => setCompletionEvidence(completionEvidenceTemplate)}
            type="button"
          >
            套用模板
          </button>
        ) : null}
      </div>
      <textarea
        className="mt-2 min-h-32 w-full rounded-md border border-rose-200 bg-white px-3 py-2 text-sm leading-6 text-slate-800"
        onChange={(event) => setCompletionEvidence(event.target.value)}
        placeholder="写清楚已完成动作、验收口径、风险边界和恢复结论。"
        value={completionEvidence}
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          className="rounded-md bg-rose-950 px-3 py-2 text-sm font-medium text-white hover:bg-rose-900 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          onClick={() => void completeDebtEvidence()}
          type="button"
        >
          {isSubmitting ? "回写中" : `${actionLabel}并回写`}
        </button>
        {errorMessage ? <span className="text-xs leading-5 text-rose-700">{errorMessage}</span> : null}
      </div>
      {feedback ? (
        <div className={`mt-3 rounded-md border px-3 py-2 text-xs leading-5 ${feedback.status === "needs_follow_up" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>
          <div>{feedback.message}</div>
          <a className="mt-2 inline-flex rounded-md bg-white/80 px-2 py-1 font-medium hover:bg-white" href={feedback.href}>
            {feedback.actionLabel}
          </a>
        </div>
      ) : null}
    </div>
  );
}
