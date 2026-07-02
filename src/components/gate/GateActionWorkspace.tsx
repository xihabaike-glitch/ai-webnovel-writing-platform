"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  buildGateAdviceActionReceipt,
  buildGateActionReceiptSummary,
  buildGateActionReviewAdvice,
  clearGateActionReceipts,
  clearPersistedGateActionReceipts,
  filterGateActionReceipts,
  fetchPersistedGateActionReceipts,
  gateActionReceiptUpdatedEvent,
  loadGateActionReceipts,
  mergeGateActionReceipts,
  persistGateActionReceipt,
  saveGateActionReceipts,
  type GateActionReceipt,
  type GateActionReceiptExecutionFilter,
  type GateActionReviewAdvice,
  type GateActionReviewAdviceAction,
  type GateActionReviewAdviceSeverity,
  type GateActionReceiptStatusFilter,
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

function adviceClass(severity: GateActionReviewAdviceSeverity) {
  if (severity === "urgent") return "border-rose-200 bg-rose-50 text-rose-900";
  if (severity === "warning") return "border-amber-200 bg-amber-50 text-amber-900";
  if (severity === "opportunity") return "border-blue-200 bg-blue-50 text-blue-900";
  return "border-emerald-200 bg-emerald-50 text-emerald-900";
}

function adviceLabel(severity: GateActionReviewAdviceSeverity) {
  if (severity === "urgent") return "先救火";
  if (severity === "warning") return "补证据";
  if (severity === "opportunity") return "别浪费";
  return "可加码";
}

function adviceActionTitle(kind: GateActionReviewAdviceAction["kind"]) {
  if (kind === "handle_failure") return "把坑先填上";
  if (kind === "adopt_asset") return "进入资产采纳";
  if (kind === "record_metrics") return "进入效果回填";
  if (kind === "start_gate_action") return "从闸门动作开始";
  return "重新计算闸门";
}

export function GateActionWorkspace({ actions }: { actions: PrePublishGateAction[] }) {
  const router = useRouter();
  const [receipts, setReceipts] = useState<GateActionReceipt[]>([]);
  const [statusFilter, setStatusFilter] = useState<GateActionReceiptStatusFilter>("all");
  const [executionFilter, setExecutionFilter] = useState<GateActionReceiptExecutionFilter>("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const filteredReceipts = filterGateActionReceipts(receipts, {
    status: statusFilter,
    executionType: executionFilter,
    platformId: platformFilter,
  });
  const summary = buildGateActionReceiptSummary(receipts);
  const filteredSummary = buildGateActionReceiptSummary(filteredReceipts);
  const reviewAdvice = buildGateActionReviewAdvice(filteredReceipts);
  const latestReceipt = filteredReceipts[0] ?? null;

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

  function recordAdviceAction(advice: GateActionReviewAdvice) {
    addReceipt(buildGateAdviceActionReceipt({ advice }));
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
            <div className="text-sm font-medium text-slate-950">总闸门审计历史</div>
            <p className="mt-1 text-xs text-slate-500">按平台、动作和结果复盘最近的处理闭环。</p>
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
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <div className="rounded-md border border-slate-200 bg-white p-3">
            <div className="text-xs text-slate-500">当前记录</div>
            <div className="mt-1 text-lg font-semibold text-slate-950">{filteredSummary.total}</div>
          </div>
          <div className="rounded-md border border-emerald-100 bg-white p-3">
            <div className="text-xs text-slate-500">成功回执</div>
            <div className="mt-1 text-lg font-semibold text-emerald-700">{filteredSummary.succeeded}</div>
          </div>
          <div className="rounded-md border border-rose-100 bg-white p-3">
            <div className="text-xs text-slate-500">失败回执</div>
            <div className="mt-1 text-lg font-semibold text-rose-700">{filteredSummary.failed}</div>
          </div>
          <div className="rounded-md border border-amber-100 bg-white p-3">
            <div className="text-xs text-slate-500">待处理动作</div>
            <div className="mt-1 text-lg font-semibold text-amber-700">{filteredSummary.failedActions}</div>
          </div>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <label className="grid gap-1 text-xs font-medium text-slate-600">
            平台
            <select
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800"
              onChange={(event) => setPlatformFilter(event.target.value)}
              value={platformFilter}
            >
              <option value="all">全部平台 · {summary.total}</option>
              {summary.platforms.map((platform) => (
                <option key={platform.id} value={platform.id}>
                  {platform.name} · {platform.total}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-600">
            动作类型
            <select
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800"
              onChange={(event) => setExecutionFilter(event.target.value as GateActionReceiptExecutionFilter)}
              value={executionFilter}
            >
              <option value="all">全部动作 · {summary.total}</option>
              {summary.executionTypes.map((item) => (
                <option key={item.type} value={item.type}>
                  {executionLabel(item.type)} · {item.total}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-600">
            结果
            <select
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800"
              onChange={(event) => setStatusFilter(event.target.value as GateActionReceiptStatusFilter)}
              value={statusFilter}
            >
              <option value="all">全部结果 · {summary.total}</option>
              <option value="succeeded">成功 · {summary.succeeded}</option>
              <option value="failed">失败 · {summary.failed}</option>
            </select>
          </label>
        </div>
        <div className="mt-3 grid gap-2">
          <div className="text-xs font-medium text-slate-500">毒舌复盘建议</div>
          {reviewAdvice.map((item) => (
            <div className={`rounded-md border p-3 text-sm ${adviceClass(item.severity)}`} key={item.id}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-white/75 px-2 py-1 text-xs font-medium">{adviceLabel(item.severity)}</span>
                    <span className="text-xs opacity-75">{item.platformName}</span>
                  </div>
                  <div className="mt-2 font-medium">{item.headline}</div>
                  <p className="mt-1 leading-6 opacity-85">{item.detail}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs opacity-75">
                    {item.evidence.map((evidence) => (
                      <span className="rounded-md bg-white/70 px-2 py-1" key={evidence}>{evidence}</span>
                    ))}
                  </div>
                </div>
                {item.action.kind === "refresh_gate" ? (
                  <button
                    className="w-fit shrink-0 rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-950"
                    onClick={() => {
                      recordAdviceAction(item);
                      router.refresh();
                    }}
                    type="button"
                    title={adviceActionTitle(item.action.kind)}
                  >
                    {item.action.label}
                  </button>
                ) : (
                  <Link
                    className="w-fit shrink-0 rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-950"
                    href={item.action.href}
                    onClick={() => recordAdviceAction(item)}
                    title={adviceActionTitle(item.action.kind)}
                  >
                    {item.action.label}
                  </Link>
                )}
              </div>
            </div>
          ))}
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
          {filteredReceipts.map((receipt) => (
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
          ) : filteredReceipts.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-600">
              当前筛选下没有记录。
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
