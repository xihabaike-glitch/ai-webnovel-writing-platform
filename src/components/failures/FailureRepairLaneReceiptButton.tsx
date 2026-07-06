"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FailureRepairLane } from "@/lib/ai/failureReviewCenter";
import { buildGateActionReceipt, persistGateActionReceipt } from "@/lib/projects/gateActionReceipts";

export function FailureRepairLaneReceiptButton({
  action,
}: {
  action: FailureRepairLane["receiptAction"];
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function recordReceipt() {
    setIsSaving(true);
    setMessage(null);
    try {
      const payload = { ...action.payload, message: action.message };
      const receipt = buildGateActionReceipt({
        action: {
          id: action.id,
          label: action.label,
          detail: action.detail,
          href: action.href,
          tone: "repair",
          execution: null,
        },
        payload,
        status: "succeeded",
      });
      const saved = await persistGateActionReceipt(receipt, payload);
      setMessage(saved.message);
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "记录修复回执失败。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        disabled={isSaving}
        onClick={() => void recordReceipt()}
        type="button"
      >
        {isSaving ? "记录中" : action.label}
      </button>
      {message ? <p className="mt-2 text-xs leading-5 text-slate-500">{message}</p> : null}
    </div>
  );
}
