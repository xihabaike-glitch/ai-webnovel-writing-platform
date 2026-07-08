"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  addGateActionReceipt,
  buildGateFirstThreeAdoptionReceipt,
  updatePersistedGateDispatchTaskState,
  type GateFirstThreeAdoptionReceiptResult,
} from "@/lib/projects/gateActionReceipts";
import type {
  PrePublishGateAdoptionClosure,
  PrePublishGateAdoptionFollowupItem,
  PrePublishGateAdoptionTimelineStep,
} from "@/lib/projects/prePublishGate";

type LocalFollowupResult = {
  status: "succeeded" | "failed";
  message: string;
};

type FollowupExecutionResult = {
  message: string;
  taskId?: string;
  score?: number;
};

type BatchFollowupReview = {
  label: string;
  succeeded: number;
  failed: number;
  results: GateFirstThreeAdoptionReceiptResult[];
};

function panelTone(status: PrePublishGateAdoptionClosure["status"]) {
  if (status === "pass") return "border-emerald-200 bg-emerald-50";
  if (status === "warn") return "border-amber-200 bg-amber-50";
  return "border-rose-200 bg-rose-50";
}

function statusTone(status: PrePublishGateAdoptionFollowupItem["status"]) {
  if (status === "pass") return "bg-emerald-100 text-emerald-800";
  if (status === "warn") return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
}

function repairTone(status: PrePublishGateAdoptionFollowupItem["status"]) {
  if (status === "warn") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-rose-200 bg-rose-50 text-rose-800";
}

function statusText(status: PrePublishGateAdoptionFollowupItem["status"]) {
  if (status === "pass") return "已完成";
  if (status === "warn") return "缺证据";
  return "待处理";
}

function timelineStepTone(status: PrePublishGateAdoptionTimelineStep["status"]) {
  if (status === "pass") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "warn") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "waiting") return "border-slate-200 bg-slate-50 text-slate-500";
  return "border-rose-200 bg-rose-50 text-rose-800";
}

function followupResultTone(result: LocalFollowupResult) {
  if (result.status === "succeeded") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  return "border-rose-200 bg-rose-50 text-rose-800";
}

function timelineStepText(status: PrePublishGateAdoptionTimelineStep["status"]) {
  if (status === "pass") return "完成";
  if (status === "warn") return "缺证据";
  if (status === "waiting") return "等待";
  return "阻塞";
}

function followupResultText(result: LocalFollowupResult) {
  if (result.status === "succeeded") return "刚执行成功";
  return "刚执行失败";
}

function batchClosureSummary(results: GateFirstThreeAdoptionReceiptResult[]) {
  const closed = results.filter((result) => result.status === "succeeded");
  const blocked = results.filter((result) => result.status === "failed");
  return {
    closed,
    blocked,
    headline: blocked.length > 0
      ? `已写回 ${closed.length} 条派单，${blocked.length} 条仍需修复。`
      : `本批 ${closed.length} 条派单已写回，可以刷新总闸门复检。`,
  };
}

function stateText(state: string) {
  if (state === "completed") return "完成";
  if (state === "assigned") return "已派单";
  if (state === "queued") return "排队";
  return state || "未知";
}

function visibleEvidence(item: PrePublishGateAdoptionFollowupItem) {
  if (item.evidence.trim()) return item.evidence;
  return item.detail;
}

function executeLabel(item: PrePublishGateAdoptionFollowupItem) {
  if (!item.execution || item.status === "pass") return null;
  if (item.execution.type === "chapter_review") return "一键审稿";
  return "刷新质检";
}

function executableTimelineItem(
  step: PrePublishGateAdoptionTimelineStep,
  itemsById: Map<string, PrePublishGateAdoptionFollowupItem>,
) {
  if (!step.followupItemId) return null;
  const item = itemsById.get(step.followupItemId) ?? null;
  return item && executeLabel(item) ? item : null;
}

function runnableReviewItems(items: PrePublishGateAdoptionFollowupItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (item.status === "pass" || item.execution?.type !== "chapter_review") return false;
    if (seen.has(item.execution.chapterId)) return false;
    seen.add(item.execution.chapterId);
    return true;
  });
}

function hrefWithGateReturn(href: string, gateReturnHref?: string | null) {
  if (!gateReturnHref || !href.startsWith("/") || href.startsWith("/gate")) return href;

  const hashIndex = href.indexOf("#");
  const base = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";
  if (base.includes("gateReturn=")) return href;
  const separator = base.includes("?") ? "&" : "?";

  return `${base}${separator}gateReturn=${encodeURIComponent(gateReturnHref)}${hash}`;
}

function runnablePublishItems(items: PrePublishGateAdoptionFollowupItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (item.status === "pass" || item.execution?.type !== "publish_check") return false;
    const key = `${item.execution.projectId}:${item.execution.platformId ?? "default"}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function completionEvidenceForFollowup(item: PrePublishGateAdoptionFollowupItem, result: FollowupExecutionResult) {
  if (item.execution?.type === "chapter_review") {
    const taskText = result.taskId ? `，任务 ${result.taskId}` : "";
    const scoreText = typeof result.score === "number" ? `，审稿分 ${Math.round(result.score)}` : "";
    return `采纳后重新审稿已完成：${item.title}${taskText}${scoreText}。`;
  }
  return `采纳后发布质检已刷新：${item.title}${result.message ? `，${result.message}` : ""}。`;
}

export function GateFirstThreeAdoptionPanel({ closure, gateReturnHref }: { closure: PrePublishGateAdoptionClosure; gateReturnHref?: string | null }) {
  const router = useRouter();
  const [runningId, setRunningId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [followupResults, setFollowupResults] = useState<Record<string, LocalFollowupResult>>({});
  const [batchReview, setBatchReview] = useState<BatchFollowupReview | null>(null);
  const visibleItems = closure.items.slice(0, 6);
  const visibleTimelines = closure.timelines.slice(0, 4);
  const itemsById = new Map(closure.items.map((item) => [item.id, item]));
  const reviewBatchItems = runnableReviewItems(closure.items);
  const publishBatchItems = runnablePublishItems(closure.items);
  const visibleRepairQueue = closure.repairQueue.slice(0, 4);
  const topRepairQueueItem = closure.repairQueue[0] ?? null;
  const topRepairFollowupItem = topRepairQueueItem ? itemsById.get(topRepairQueueItem.followupItemId) ?? null : null;
  const topRepairExecuteLabel = topRepairFollowupItem ? executeLabel(topRepairFollowupItem) : null;

  useEffect(() => {
    setFollowupResults((current) => {
      const unresolvedItemIds = new Set(closure.items.filter((item) => item.status !== "pass").map((item) => item.id));
      let changed = false;
      const next: Record<string, LocalFollowupResult> = {};
      for (const [itemId, result] of Object.entries(current)) {
        if (unresolvedItemIds.has(itemId)) {
          next[itemId] = result;
        } else {
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [closure.items]);

  async function executeFollowupRequest(item: PrePublishGateAdoptionFollowupItem) {
    if (!item.execution) throw new Error("当前任务缺少执行配置。");
    const response = await fetch(
      item.execution.type === "chapter_review"
        ? "/api/ai/tasks/chapter-review"
        : `/api/projects/${item.execution.projectId}/platform-export`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.execution.type === "chapter_review"
          ? { chapterId: item.execution.chapterId }
          : { action: "snapshot", platformId: item.execution.platformId }),
      },
    );
    const payload = (await response.json().catch(() => ({}))) as {
      message?: string;
      error?: string;
      task?: { id?: string };
      result?: { score?: number };
    };
    if (!response.ok) throw new Error(payload.error ?? "处理采纳后续失败。");
    return {
      message: payload.message ?? `${item.title} 已处理。`,
      taskId: payload.task?.id,
      score: payload.result?.score,
    };
  }

  async function closeFollowupDispatch(item: PrePublishGateAdoptionFollowupItem, result: FollowupExecutionResult) {
    await updatePersistedGateDispatchTaskState(item.id, "completed", {
      completionEvidence: completionEvidenceForFollowup(item, result),
    });
  }

  async function runFollowup(item: PrePublishGateAdoptionFollowupItem) {
    setRunningId(item.id);
    setMessage(null);
    setBatchReview(null);
    try {
      const result = await executeFollowupRequest(item);
      await closeFollowupDispatch(item, result);
      setFollowupResults((current) => ({
        ...current,
        [item.id]: {
          status: "succeeded",
          message: `${result.message} 已写回派单证据，等待总闸门复检。`,
        },
      }));
      addGateActionReceipt(buildGateFirstThreeAdoptionReceipt({
        mode: "single",
        items: [item],
        results: [{
          id: item.id,
          projectId: item.projectId,
          projectTitle: item.projectTitle,
          label: item.label,
          title: item.title,
          status: "succeeded",
          message: result.message,
        }],
      }));
      setMessage(`${result.message} 已写回派单证据，正在刷新总闸门。`);
      router.refresh();
    } catch (caught) {
      const errorMessage = caught instanceof Error ? caught.message : "处理采纳后续失败。";
      setFollowupResults((current) => ({
        ...current,
        [item.id]: {
          status: "failed",
          message: errorMessage,
        },
      }));
      addGateActionReceipt(buildGateFirstThreeAdoptionReceipt({
        mode: "single",
        items: [item],
        results: [{
          id: item.id,
          projectId: item.projectId,
          projectTitle: item.projectTitle,
          label: item.label,
          title: item.title,
          status: "failed",
          message: errorMessage,
        }],
      }));
      setMessage(errorMessage);
    } finally {
      setRunningId(null);
    }
  }

  async function runBatch(kind: "review" | "publish") {
    const batchItems = kind === "review" ? reviewBatchItems : publishBatchItems;
    if (!batchItems.length) return;
    setRunningId(`batch:${kind}`);
    setMessage(null);
    setBatchReview(null);
    const results: GateFirstThreeAdoptionReceiptResult[] = [];
    for (const item of batchItems) {
      try {
        const result = await executeFollowupRequest(item);
        await closeFollowupDispatch(item, result);
        results.push({
          id: item.id,
          projectId: item.projectId,
          projectTitle: item.projectTitle,
          label: item.label,
          title: item.title,
          status: "succeeded",
          message: result.message,
        });
      } catch (caught) {
        results.push({
          id: item.id,
          projectId: item.projectId,
          projectTitle: item.projectTitle,
          label: item.label,
          title: item.title,
          status: "failed",
          message: caught instanceof Error ? caught.message : "处理采纳后续失败。",
        });
      }
    }
    setFollowupResults((current) => {
      const next = { ...current };
      for (const result of results) {
        next[result.id] = {
          status: result.status,
          message: result.status === "succeeded"
            ? `${result.message ?? result.title} 已写回派单证据，等待总闸门复检。`
            : result.message ?? "处理采纳后续失败。",
        };
      }
      return next;
    });
    const succeeded = results.filter((result) => result.status === "succeeded").length;
    const failed = results.filter((result) => result.status === "failed").length;
    const label = kind === "review" ? "批量重新审稿" : "批量刷新质检";
    setBatchReview({
      label,
      succeeded,
      failed,
      results,
    });
    addGateActionReceipt(buildGateFirstThreeAdoptionReceipt({
      mode: kind === "review" ? "batch_review" : "batch_publish",
      items: batchItems,
      results,
    }));
    setMessage(`${label}完成：已闭合 ${succeeded} 个，仍需处理 ${failed} 个。`);
    setRunningId(null);
    router.refresh();
  }

  return (
    <section className={`mb-6 rounded-md border p-4 ${panelTone(closure.status)}`} id="first-three-adoption-closure">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="font-medium text-slate-950">章节采纳闭环</h2>
          <p className="mt-1 text-sm leading-6 text-slate-700">{closure.detail}</p>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center text-xs text-slate-700">
          <div className="rounded-md bg-white/80 px-3 py-2">
            <div className="text-lg font-semibold text-slate-950">{closure.total}</div>
            <div>任务</div>
          </div>
          <div className="rounded-md bg-white/80 px-3 py-2">
            <div className="text-lg font-semibold text-slate-950">{closure.pending}</div>
            <div>待处理</div>
          </div>
          <div className="rounded-md bg-white/80 px-3 py-2">
            <div className="text-lg font-semibold text-slate-950">{closure.completed}</div>
            <div>完成</div>
          </div>
          <div className="rounded-md bg-white/80 px-3 py-2">
            <div className="text-lg font-semibold text-slate-950">{closure.receiptEvidence}</div>
            <div>回执</div>
          </div>
        </div>
      </div>
      {topRepairQueueItem || reviewBatchItems.length || publishBatchItems.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {topRepairFollowupItem && topRepairExecuteLabel ? (
            <button
              className="rounded-md bg-rose-700 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
              disabled={runningId !== null}
              onClick={() => void runFollowup(topRepairFollowupItem)}
              type="button"
            >
              {runningId === topRepairFollowupItem.id ? "修复中" : `优先修复：${topRepairExecuteLabel}`}
            </button>
          ) : null}
          {topRepairQueueItem && (!topRepairFollowupItem || !topRepairExecuteLabel) ? (
            <Link
              className="rounded-md bg-rose-700 px-3 py-2 text-xs font-medium text-white hover:bg-rose-800"
              href={hrefWithGateReturn(topRepairQueueItem.href, gateReturnHref)}
            >
              优先处理：{topRepairQueueItem.actionLabel}
            </Link>
          ) : null}
          {reviewBatchItems.length ? (
            <button
              className="rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
              disabled={runningId !== null}
              onClick={() => void runBatch("review")}
              type="button"
            >
              {runningId === "batch:review" ? "审稿中" : `批量重新审稿 ${reviewBatchItems.length} 章`}
            </button>
          ) : null}
          {publishBatchItems.length ? (
            <button
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              disabled={runningId !== null}
              onClick={() => void runBatch("publish")}
              type="button"
            >
              {runningId === "batch:publish" ? "刷新中" : `批量刷新质检 ${publishBatchItems.length} 个`}
            </button>
          ) : null}
        </div>
      ) : null}
      {message ? <div className="mt-3 rounded-md bg-white/80 px-3 py-2 text-sm text-slate-700">{message}</div> : null}
      {batchReview ? (
        <div className="mt-3 rounded-md border border-white/70 bg-white/80 p-3 text-sm text-slate-700">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-medium text-slate-950">{batchReview.label}分项复盘</div>
            <div className="text-xs text-slate-500">成功 {batchReview.succeeded} · 失败 {batchReview.failed}</div>
          </div>
          {(() => {
            const summary = batchClosureSummary(batchReview.results);
            return (
              <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700">
                <div className="font-medium text-slate-950">闭环复检摘要</div>
                <p className="mt-1">{summary.headline}</p>
                {summary.closed.length ? (
                  <p className="mt-1 text-emerald-700">
                    已闭合：{summary.closed.slice(0, 3).map((result) => result.title).join("、")}
                    {summary.closed.length > 3 ? ` 等 ${summary.closed.length} 项` : ""}
                  </p>
                ) : null}
                {summary.blocked.length ? (
                  <p className="mt-1 text-rose-700">
                    仍需处理：{summary.blocked.slice(0, 3).map((result) => result.title).join("、")}
                    {summary.blocked.length > 3 ? ` 等 ${summary.blocked.length} 项` : ""}
                  </p>
                ) : null}
              </div>
            );
          })()}
          <div className="mt-2 grid gap-2 lg:grid-cols-2">
            {batchReview.results.map((result) => (
              <div
                className={`rounded-md border px-3 py-2 text-xs leading-5 ${
                  result.status === "succeeded"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-rose-200 bg-rose-50 text-rose-800"
                }`}
                key={result.id}
              >
                <div className="font-medium">{result.status === "succeeded" ? "成功" : "失败"} · {result.title}</div>
                <div className="mt-1 opacity-80">{result.message ?? result.label}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {visibleRepairQueue.length ? (
        <div className="mt-4 rounded-md border border-white/70 bg-white/80 p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-medium text-slate-950">采纳失败修复队列</div>
              <p className="mt-1 text-xs leading-5 text-slate-600">按发布风险排序，先处理旧审稿失效，再补发布包质检和验收证据。</p>
            </div>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
              {closure.repairQueue.length} 项
            </span>
          </div>
          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            {visibleRepairQueue.map((item) => {
              const followupItem = itemsById.get(item.followupItemId) ?? null;
              const itemResult = followupResults[item.followupItemId] ?? null;
              const label = followupItem ? executeLabel(followupItem) : null;
              return (
                <div
                  className={`rounded-md border p-3 ${itemResult ? followupResultTone(itemResult) : repairTone(item.status)}`}
                  key={item.id}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{item.label} · {item.projectTitle}</span>
                    <span className="text-xs">P{item.priorityScore}</span>
                  </div>
                  <div className="mt-1 text-xs font-medium opacity-90">{item.title}</div>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 opacity-80">
                    {itemResult?.message ?? item.detail}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {followupItem && label && itemResult?.status !== "succeeded" ? (
                      <button
                        className="rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-950 disabled:opacity-50"
                        disabled={runningId !== null}
                        onClick={() => void runFollowup(followupItem)}
                        type="button"
                      >
                        {runningId === followupItem.id ? "处理中" : label}
                      </button>
                    ) : null}
                    <Link className="rounded-md border border-white/80 bg-white/70 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-white" href={hrefWithGateReturn(item.href, gateReturnHref)}>
                      打开位置
                    </Link>
                    <span className="text-xs font-medium opacity-80">{itemResult ? followupResultText(itemResult) : item.actionLabel}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {visibleTimelines.length ? (
        <div className="mt-4 grid gap-3">
          <div>
            <div className="text-sm font-medium text-slate-950">采纳后发布链路</div>
            <p className="mt-1 text-xs leading-5 text-slate-600">先确认候选已写入正文，再重新审稿、必要二改、刷新发布质检，最后回总闸门判断是否放行。</p>
          </div>
          {visibleTimelines.map((timeline) => (
            <div className="rounded-md border border-white/70 bg-white p-3 text-sm shadow-sm" key={timeline.id}>
              <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="font-medium text-slate-950">{timeline.label}</div>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{timeline.detail}</p>
                </div>
                <Link className="w-fit rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50" href={hrefWithGateReturn(timeline.href, gateReturnHref)}>
                  {timeline.nextActionLabel}
                </Link>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-4">
                {timeline.steps.map((step) => (
                  (() => {
                    const executableItem = executableTimelineItem(step, itemsById);
                    const stepResult = step.followupItemId ? followupResults[step.followupItemId] ?? null : null;
                    return (
                      <div className={`rounded-md border p-3 ${stepResult ? followupResultTone(stepResult) : timelineStepTone(step.status)}`} key={step.id}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{step.label}</span>
                          <span className="text-xs">{stepResult ? followupResultText(stepResult) : timelineStepText(step.status)}</span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs leading-5 opacity-80">{stepResult?.message ?? (step.evidence || step.detail)}</p>
                        {executableItem && stepResult?.status !== "succeeded" ? (
                          <button
                            className="mt-3 rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-950 disabled:opacity-50"
                            disabled={runningId !== null}
                            onClick={() => void runFollowup(executableItem)}
                            type="button"
                          >
                            {runningId === executableItem.id ? "处理中" : executeLabel(executableItem)}
                          </button>
                        ) : null}
                      </div>
                    );
                  })()
                ))}
              </div>
              <div className="mt-2 text-xs text-slate-500">进度 {timeline.completedSteps}/{timeline.totalSteps}</div>
            </div>
          ))}
        </div>
      ) : null}

      {visibleItems.length ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {visibleItems.map((item) => {
            const label = executeLabel(item);
            const itemResult = followupResults[item.id] ?? null;
            return (
              <div className="rounded-md border border-white/70 bg-white p-3 text-sm shadow-sm" key={item.id}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-md px-2 py-1 text-xs font-medium ${statusTone(item.status)}`}>{statusText(item.status)}</span>
                      <span className="font-medium text-slate-950">{item.projectTitle}</span>
                      <span className="text-xs text-slate-500">{item.label}</span>
                    </div>
                    <div className="mt-2 font-medium text-slate-800">{item.title}</div>
                  </div>
                  <span className="w-fit rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">{stateText(item.state)}</span>
                </div>
                <p className="mt-2 line-clamp-2 leading-6 text-slate-600">{visibleEvidence(item)}</p>
                {itemResult ? (
                  <p className={`mt-2 rounded-md border px-3 py-2 text-xs leading-5 ${followupResultTone(itemResult)}`}>
                    {followupResultText(itemResult)}：{itemResult.message}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {label && itemResult?.status !== "succeeded" ? (
                    <button
                      className="rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                      disabled={runningId !== null}
                      onClick={() => void runFollowup(item)}
                      type="button"
                    >
                      {runningId === item.id ? "处理中" : label}
                    </button>
                  ) : null}
                  <Link className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50" href={hrefWithGateReturn(item.href, gateReturnHref)}>
                    打开位置
                  </Link>
                  <span className="text-xs font-medium text-slate-500">{item.actionLabel}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 rounded-md border border-dashed border-white/80 bg-white/70 p-3 text-sm text-slate-600">
          暂无章节采纳后续任务。生成并采纳前三章或普通章节候选后，这里会追踪重新审稿、必要二改、刷新发布质检。
        </p>
      )}
    </section>
  );
}
