"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { buildGateActionReceipt, type GateActionReceipt, type GateActionReceiptPayload } from "@/lib/projects/gateActionReceipts";
import type { PrePublishGateAction } from "@/lib/projects/prePublishGate";

function actionTone(tone: PrePublishGateAction["tone"]) {
  if (tone === "primary") return "border-slate-950 bg-slate-950 text-white";
  if (tone === "review") return "border-blue-200 bg-blue-50 text-blue-800";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

function executeLabel(action: PrePublishGateAction) {
  if (!action.execution) return null;
  if (action.execution.type === "publish_repair") return "立即处理";
  if (action.execution.type === "retry_task") return "一键重试";
  return "执行批次";
}

export function GatePriorityActionCard({
  action,
  index,
  onReceipt,
}: {
  action: PrePublishGateAction;
  index: number;
  onReceipt?: (receipt: GateActionReceipt) => void;
}) {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const label = executeLabel(action);

  async function runAction() {
    if (!action.execution) return;
    setIsRunning(true);
    setMessage(null);
    try {
      const execution = action.execution;
      const response = await fetch(
        execution.type === "publish_repair"
          ? `/api/projects/${execution.projectId}/platform-export/repair`
          : execution.type === "retry_task"
            ? `/api/ai/tasks/${execution.taskId}/retry`
            : `/api/tasks/recommended-batch?strategy=${encodeURIComponent(execution.strategyId)}`,
        {
          method: "POST",
          headers: execution.type === "publish_repair" ? { "Content-Type": "application/json" } : undefined,
          body: execution.type === "publish_repair"
            ? JSON.stringify({
              kind: execution.kind,
              chapterId: execution.chapterId,
              chapterTitle: execution.chapterTitle,
              detail: execution.detail,
            })
            : undefined,
        },
      );
      const payload = (await response.json().catch(() => ({}))) as GateActionReceiptPayload;
      if (!response.ok) throw new Error(payload.error ?? "动作执行失败。");
      const receipt = buildGateActionReceipt({ action, payload, status: "succeeded" });
      setMessage(receipt.message);
      onReceipt?.(receipt);
      router.refresh();
    } catch (caught) {
      const errorMessage = caught instanceof Error ? caught.message : "动作执行失败。";
      const receipt = buildGateActionReceipt({
        action,
        payload: { error: errorMessage },
        status: "failed",
        fallbackError: errorMessage,
      });
      setMessage(receipt.message);
      onReceipt?.(receipt);
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className={`rounded-md border p-3 text-sm ${actionTone(action.tone)}`}>
      <div className="font-medium">{index + 1}. {action.label}</div>
      <p className="mt-1 leading-6 opacity-80">{action.detail}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {label ? (
          <button
            className="rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-950 disabled:opacity-50"
            disabled={isRunning}
            onClick={() => void runAction()}
            type="button"
          >
            {isRunning ? "处理中" : label}
          </button>
        ) : null}
        <Link className="rounded-md border border-current px-3 py-2 text-xs font-medium opacity-80 hover:opacity-100" href={action.href}>
          打开位置
        </Link>
      </div>
      {message ? <p className="mt-2 text-xs opacity-80">{message}</p> : null}
    </div>
  );
}
