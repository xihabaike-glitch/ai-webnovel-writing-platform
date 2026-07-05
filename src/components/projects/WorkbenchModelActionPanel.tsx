"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { WritingWorkbenchModelAction } from "@/lib/projects/writingWorkbench";

export function WorkbenchModelActionPanel({ actions }: { actions: WritingWorkbenchModelAction[] }) {
  const router = useRouter();
  const [runningId, setRunningId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function runAction(action: WritingWorkbenchModelAction) {
    if (action.disabledReason) return;

    setRunningId(action.id);
    setMessage(null);

    try {
      const response = await fetch(action.endpoint, {
        method: action.method,
        headers: action.method === "POST" ? { "Content-Type": "application/json" } : undefined,
        body: action.method === "POST" ? JSON.stringify(action.payload) : undefined,
      });
      const text = await response.text();
      const payload = text ? JSON.parse(text) as { error?: string } : {};

      if (!response.ok) {
        throw new Error(payload.error ?? "模型任务执行失败。");
      }

      setMessage(`已完成：${action.label}`);
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "模型任务执行失败。");
    } finally {
      setRunningId(null);
    }
  }

  return (
    <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="font-medium text-slate-950">模型一键执行</div>
          <p className="mt-1 text-sm text-slate-600">从工作台直接跑开头诊断、正文生成和平台复审。</p>
        </div>
        {message ? <div className="text-sm text-slate-600">{message}</div> : null}
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {actions.map((action) => (
          <div className="rounded-md border border-slate-200 bg-white p-3" key={action.id}>
            <div className="font-medium text-slate-950">{action.label}</div>
            <p className="mt-1 min-h-12 text-sm text-slate-600">{action.description}</p>
            {action.disabledReason ? (
              <p className="mt-2 text-sm text-amber-700">{action.disabledReason}</p>
            ) : null}
            {action.evidenceGate ? (
              <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs leading-5 text-amber-900">
                <div className="font-medium">{action.evidenceGate.detail}</div>
                {action.evidenceGate.missing.length ? (
                  <div className="mt-1">缺口：{action.evidenceGate.missing.join("、")}</div>
                ) : null}
              </div>
            ) : null}
            <button
              className="mt-3 w-full rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-600"
              disabled={Boolean(action.disabledReason) || runningId === action.id}
              onClick={() => void runAction(action)}
              type="button"
            >
              {runningId === action.id ? "执行中" : action.label}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
