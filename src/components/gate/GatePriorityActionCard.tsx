"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  buildGateActionReceipt,
  updatePersistedGateDispatchTaskState,
  type GateActionReceipt,
  type GateActionReceiptPayload,
} from "@/lib/projects/gateActionReceipts";
import type { PrePublishGateAction } from "@/lib/projects/prePublishGate";

function actionTone(tone: PrePublishGateAction["tone"]) {
  if (tone === "primary") return "border-slate-950 bg-slate-950 text-white";
  if (tone === "review") return "border-blue-200 bg-blue-50 text-blue-800";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

function executeLabel(action: PrePublishGateAction) {
  if (!action.execution && action.id === "failure-repair-batch") return "记录已处理";
  if (!action.execution) return null;
  if (action.execution.type === "publish_repair") return "立即处理";
  if (action.execution.type === "retry_task") return "一键重试";
  if (action.execution.type === "first_three_adoption") {
    return action.execution.execution.type === "chapter_review" ? "一键审稿" : "刷新质检";
  }
  return "执行批次";
}

function firstThreeAdoptionBody(execution: Extract<NonNullable<PrePublishGateAction["execution"]>, { type: "first_three_adoption" }>) {
  return execution.execution.type === "chapter_review"
    ? { chapterId: execution.execution.chapterId }
    : { action: "snapshot", platformId: execution.execution.platformId };
}

function firstThreeAdoptionUrl(execution: Extract<NonNullable<PrePublishGateAction["execution"]>, { type: "first_three_adoption" }>) {
  return execution.execution.type === "chapter_review"
    ? "/api/ai/tasks/chapter-review"
    : `/api/projects/${execution.execution.projectId}/platform-export`;
}

function firstThreeAdoptionCompletionEvidence(
  execution: Extract<NonNullable<PrePublishGateAction["execution"]>, { type: "first_three_adoption" }>,
  payload: GateActionReceiptPayload,
) {
  const taskId = payload.task?.id ?? payload.result?.taskId;
  if (execution.execution.type === "chapter_review") {
    const score = typeof payload.result === "object" && payload.result && "score" in payload.result
      ? (payload.result as { score?: unknown }).score
      : null;
    const scoreText = typeof score === "number" ? `，审稿分 ${Math.round(score)}` : "";
    return `采纳后重新审稿已完成：${execution.title}${taskId ? `，任务 ${taskId}` : ""}${scoreText}。`;
  }
  return `采纳后发布质检已刷新：${execution.title}${payload.message ? `，${payload.message}` : ""}。`;
}

function receiptDisplayMessage(receipt: GateActionReceipt) {
  if (receipt.status === "failed") return receipt.message;
  return `${receipt.message} ${receipt.recheck.detail} ${receipt.recheck.actionLabel}`;
}

function actionRecheckHref(action: PrePublishGateAction) {
  return `/gate?focus=action-recheck&actionId=${encodeURIComponent(action.id)}#gate-focus-notice`;
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
    if (!action.execution) {
      const receipt = buildGateActionReceipt({
        action,
        payload: { message: "已记录失败修复批次处理，刷新后确认未恢复失败是否清空。" },
        status: "succeeded",
      });
      setMessage(receiptDisplayMessage(receipt));
      onReceipt?.(receipt);
      router.replace(actionRecheckHref(action));
      router.refresh();
      return;
    }
    setIsRunning(true);
    setMessage(null);
    try {
      const execution = action.execution;
      const response = await fetch(
        execution.type === "publish_repair"
          ? `/api/projects/${execution.projectId}/platform-export/repair`
          : execution.type === "retry_task"
            ? `/api/ai/tasks/${execution.taskId}/retry`
            : execution.type === "first_three_adoption"
              ? firstThreeAdoptionUrl(execution)
              : `/api/tasks/recommended-batch?strategy=${encodeURIComponent(execution.strategyId)}`,
        {
          method: "POST",
          headers: execution.type === "publish_repair" || execution.type === "first_three_adoption" ? { "Content-Type": "application/json" } : undefined,
          body: execution.type === "publish_repair"
            ? JSON.stringify({
              kind: execution.kind,
              chapterId: execution.chapterId,
              chapterTitle: execution.chapterTitle,
              detail: execution.detail,
            })
            : execution.type === "first_three_adoption"
              ? JSON.stringify(firstThreeAdoptionBody(execution))
            : undefined,
        },
      );
      const payload = (await response.json().catch(() => ({}))) as GateActionReceiptPayload;
      if (!response.ok) throw new Error(payload.error ?? "动作执行失败。");
      const receiptPayload: GateActionReceiptPayload = execution.type === "first_three_adoption"
        ? {
          ...payload,
          message: payload.message ?? `${execution.title} 已处理，等待总闸门复检。`,
          results: [{
            status: "succeeded",
            taskId: payload.task?.id ?? payload.result?.taskId,
          }],
        }
        : payload;
      const receipt = buildGateActionReceipt({ action, payload: receiptPayload, status: "succeeded" });
      setMessage(receiptDisplayMessage(receipt));
      onReceipt?.(receipt);
      if (execution.type === "first_three_adoption") {
        await updatePersistedGateDispatchTaskState(execution.itemId, "completed", {
          completionEvidence: firstThreeAdoptionCompletionEvidence(execution, payload),
        });
      }
      router.replace(actionRecheckHref(action));
      router.refresh();
    } catch (caught) {
      const errorMessage = caught instanceof Error ? caught.message : "动作执行失败。";
      const receipt = buildGateActionReceipt({
        action,
        payload: { error: errorMessage },
        status: "failed",
        fallbackError: errorMessage,
      });
      setMessage(receiptDisplayMessage(receipt));
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
