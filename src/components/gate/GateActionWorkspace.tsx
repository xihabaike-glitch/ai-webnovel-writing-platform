"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  clearGateActionReceipts,
  clearPersistedGateActionReceipts,
  fetchPersistedGateActionReceipts,
  gateActionReceiptUpdatedEvent,
  loadGateActionReceipts,
  mergeGateActionReceipts,
  persistGateActionReceipt,
  saveGateActionReceipts,
  type GateActionReceipt,
} from "@/lib/projects/gateActionReceipts";
import type { PrePublishGateAction } from "@/lib/projects/prePublishGate";
import { GatePriorityActionCard } from "./GatePriorityActionCard";

function receiptStatusClass(status: GateActionReceipt["status"]) {
  if (status === "succeeded") return "bg-emerald-50 text-emerald-700";
  return "bg-rose-50 text-rose-700";
}

function recheckClass(status: GateActionReceipt["recheck"]["status"]) {
  if (status === "ready") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  return "border-rose-200 bg-rose-50 text-rose-800";
}

function executionLabel(type: GateActionReceipt["executionType"]) {
  if (type === "publish_repair") return "发布修复";
  if (type === "retry_task") return "失败重试";
  if (type === "recommended_batch") return "推荐批次";
  if (type === "platform_strategy") return "平台策略";
  return "人工处理";
}

export function GateActionWorkspace({ actions }: { actions: PrePublishGateAction[] }) {
  const router = useRouter();
  const [receipts, setReceipts] = useState<GateActionReceipt[]>([]);
  const latestReceipt = receipts[0] ?? null;

  useEffect(() => {
    const localReceipts = loadGateActionReceipts();
    setReceipts(localReceipts);

    void fetchPersistedGateActionReceipts()
      .then((persisted) => {
        const merged = mergeGateActionReceipts(persisted, loadGateActionReceipts());
        setReceipts(saveGateActionReceipts(merged));
      })
      .catch(() => undefined);

    function handleReceiptUpdate(event: Event) {
      const customEvent = event as CustomEvent<GateActionReceipt[]>;
      setReceipts(customEvent.detail ?? loadGateActionReceipts());
    }

    window.addEventListener(gateActionReceiptUpdatedEvent, handleReceiptUpdate);
    return () => window.removeEventListener(gateActionReceiptUpdatedEvent, handleReceiptUpdate);
  }, []);

  function addReceipt(receipt: GateActionReceipt) {
    setReceipts((current) => saveGateActionReceipts([receipt, ...current]));
    void persistGateActionReceipt(receipt).catch(() => undefined);
  }

  function clearReceipts() {
    clearGateActionReceipts();
    setReceipts([]);
    void clearPersistedGateActionReceipts().catch(() => undefined);
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        {actions.map((action, index) => (
          <GatePriorityActionCard action={action} index={index} key={action.id} onReceipt={addReceipt} />
        ))}
        {actions.length === 0 ? (
          <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">暂无需要处理的动作。</p>
        ) : null}
      </div>

      <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-medium text-slate-950">执行回执</div>
            <p className="mt-1 text-xs text-slate-500">记录最近从总闸门发起的处理结果。</p>
          </div>
          {receipts.length ? (
            <button
              className="w-fit rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              onClick={clearReceipts}
              type="button"
            >
              清空
            </button>
          ) : null}
        </div>
        {latestReceipt ? (
          <div className={`mt-3 rounded-md border p-3 text-sm ${recheckClass(latestReceipt.recheck.status)}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="font-medium">{latestReceipt.recheck.label}</div>
                <p className="mt-1 leading-6 opacity-85">{latestReceipt.recheck.detail}</p>
              </div>
              {latestReceipt.recheck.status === "ready" ? (
                <button
                  className="w-fit shrink-0 rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-950"
                  onClick={() => router.refresh()}
                  type="button"
                >
                  {latestReceipt.recheck.actionLabel}
                </button>
              ) : (
                <Link
                  className="w-fit shrink-0 rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-950"
                  href={latestReceipt.href}
                >
                  {latestReceipt.recheck.actionLabel}
                </Link>
              )}
            </div>
          </div>
        ) : null}
        <div className="mt-3 grid gap-2">
          {receipts.map((receipt) => (
            <div className="rounded-md border border-slate-200 bg-white p-3 text-sm" key={receipt.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium text-slate-950">{receipt.label}</div>
                <span className={`rounded-md px-2 py-1 text-xs font-medium ${receiptStatusClass(receipt.status)}`}>
                  {receipt.status === "succeeded" ? "成功" : "失败"}
                </span>
              </div>
              <p className="mt-1 leading-6 text-slate-600">{receipt.message}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>{executionLabel(receipt.executionType)}</span>
                <span>{new Date(receipt.createdAt).toLocaleString()}</span>
                {receipt.succeededCount + receipt.failedCount > 0 ? (
                  <span>成功 {receipt.succeededCount} · 失败 {receipt.failedCount}</span>
                ) : null}
                {receipt.taskId ? <span>任务 {receipt.taskId}</span> : null}
              </div>
              <Link className="mt-2 inline-flex text-xs font-medium text-slate-700 hover:underline" href={receipt.href}>
                打开相关位置
              </Link>
            </div>
          ))}
          {receipts.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-600">
              还没有执行记录。点击上方可执行动作后，这里会留下结果。
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
