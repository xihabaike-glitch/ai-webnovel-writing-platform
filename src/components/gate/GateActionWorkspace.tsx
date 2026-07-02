"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { trimGateActionReceipts, type GateActionReceipt } from "@/lib/projects/gateActionReceipts";
import type { PrePublishGateAction } from "@/lib/projects/prePublishGate";
import { GatePriorityActionCard } from "./GatePriorityActionCard";

const storageKey = "ai-webnovel-gate-action-receipts";

function receiptStatusClass(status: GateActionReceipt["status"]) {
  if (status === "succeeded") return "bg-emerald-50 text-emerald-700";
  return "bg-rose-50 text-rose-700";
}

function executionLabel(type: GateActionReceipt["executionType"]) {
  if (type === "publish_repair") return "发布修复";
  if (type === "retry_task") return "失败重试";
  if (type === "recommended_batch") return "推荐批次";
  return "人工处理";
}

function loadReceipts() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return trimGateActionReceipts(parsed.filter((item): item is GateActionReceipt => (
      Boolean(item)
      && typeof item === "object"
      && "id" in item
      && "label" in item
      && "createdAt" in item
    )));
  } catch {
    return [];
  }
}

function saveReceipts(receipts: GateActionReceipt[]) {
  window.localStorage.setItem(storageKey, JSON.stringify(trimGateActionReceipts(receipts)));
}

export function GateActionWorkspace({ actions }: { actions: PrePublishGateAction[] }) {
  const [receipts, setReceipts] = useState<GateActionReceipt[]>([]);

  useEffect(() => {
    setReceipts(loadReceipts());
  }, []);

  function addReceipt(receipt: GateActionReceipt) {
    setReceipts((current) => {
      const next = trimGateActionReceipts([receipt, ...current]);
      saveReceipts(next);
      return next;
    });
  }

  function clearReceipts() {
    window.localStorage.removeItem(storageKey);
    setReceipts([]);
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
