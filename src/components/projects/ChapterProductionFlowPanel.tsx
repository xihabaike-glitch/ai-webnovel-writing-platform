"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  ChapterProductionFlow,
  ChapterProductionFlowRunAction,
  ChapterProductionFlowStage,
  ChapterProductionFlowTone,
} from "@/lib/projects/chapterProductionFlow";

function toneClass(tone: ChapterProductionFlowTone) {
  if (tone === "emerald") return "bg-emerald-50 text-emerald-700";
  if (tone === "rose") return "bg-rose-50 text-rose-700";
  if (tone === "sky") return "bg-sky-50 text-sky-700";
  if (tone === "amber") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

function statusLabel(status: ChapterProductionFlow["status"]) {
  if (status === "ready") return "可连续生产";
  if (status === "working") return "推进中";
  return "有卡点";
}

function runningLabel(action: ChapterProductionFlowRunAction) {
  if (action.type === "story_tree_recheck") return "派单中";
  if (action.type === "submission_precheck_repair") return "派单中";
  return action.action === "review" ? "审稿中" : "二改中";
}

function doneLabel(action: ChapterProductionFlowRunAction) {
  if (action.type === "story_tree_recheck") return "大树复检派单";
  if (action.type === "submission_precheck_repair") return "投稿修复派单";
  return action.action === "review" ? "批量审稿" : "批量二改";
}

export function ChapterProductionFlowPanel({ flow }: { flow: ChapterProductionFlow }) {
  const router = useRouter();
  const [runningStageId, setRunningStageId] = useState<string | null>(null);
  const [runningRecheck, setRunningRecheck] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState<ChapterProductionFlowRunAction["afterSuccess"] | null>(null);
  const nextStage = useMemo(
    () => flow.stages.find((stage) => stage.id === flow.bottleneck),
    [flow.bottleneck, flow.stages],
  );

  async function runStageAction(stage: ChapterProductionFlowStage) {
    if (!stage.runAction) return;
    setRunningStageId(stage.id);
    setMessage(null);
    setFollowUp(null);
    try {
      const response = await fetch(stage.runAction.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stage.runAction.type === "batch_review"
          ? {
              action: stage.runAction.action,
              chapterIds: stage.runAction.chapterIds,
              targetWords: stage.runAction.targetWords,
            }
          : stage.runAction.type === "story_tree_recheck" ? {
              chapterIds: stage.runAction.chapterIds,
              source: stage.runAction.source,
            }
          : {}),
      });
      const payload = await response.json().catch(() => null) as {
        results?: Array<{ status: "succeeded" | "failed" }>;
        summary?: { totalChapters: number; rewriteChapters: number; dispatches: number };
        dispatches?: unknown[];
        error?: string;
        guard?: { warnings?: string[] };
      } | null;
      if (!response.ok) {
        throw new Error([payload?.error, ...(payload?.guard?.warnings ?? [])].filter(Boolean).join(" ") || "流水线执行失败。");
      }
      if (stage.runAction.type === "story_tree_recheck") {
        const summary = payload?.summary;
        setMessage(`${doneLabel(stage.runAction)}完成：复检 ${summary?.totalChapters ?? stage.runAction.chapterIds.length} 章，生成 ${summary?.dispatches ?? 0} 条派单。`);
      } else if (stage.runAction.type === "submission_precheck_repair") {
        setMessage(`${doneLabel(stage.runAction)}完成：生成 ${payload?.dispatches?.length ?? 0} 条派单。`);
      } else {
        const results = payload?.results ?? [];
        const succeeded = results.filter((result) => result.status === "succeeded").length;
        const failed = results.filter((result) => result.status === "failed").length;
        setMessage(`${doneLabel(stage.runAction)}完成：成功 ${succeeded} 章，失败 ${failed} 章。`);
      }
      setFollowUp(stage.runAction.afterSuccess);
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "流水线执行失败。");
      setFollowUp(null);
    } finally {
      setRunningStageId(null);
    }
  }

  async function runRecheckNotice() {
    const notice = flow.recheckNotice;
    const action = notice?.runAction;
    if (!notice || !action || action.dispatches.length === 0) return;
    setRunningRecheck(true);
    setMessage(null);
    setFollowUp(null);
    try {
      const results = await Promise.all(action.dispatches.map(async (dispatch) => {
        const response = await fetch(action.endpoint, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dispatchKey: dispatch.dispatchKey,
            state: "completed",
            completionEvidence: dispatch.completionEvidence || action.completionEvidence,
          }),
        });
        const payload = await response.json().catch(() => null) as {
          storyTreeRecheck?: unknown;
          evidenceLoopRecheck?: unknown;
          error?: string;
        } | null;
        if (!response.ok) throw new Error(payload?.error ?? "派单复查失败。");
        return payload;
      }));
      const storyTreeCount = results.filter((result) => result?.storyTreeRecheck).length;
      const evidenceLoopCount = results.filter((result) => result?.evidenceLoopRecheck).length;
      const detailParts = [
        storyTreeCount > 0 ? `大树结构复查 ${storyTreeCount} 项` : "",
        evidenceLoopCount > 0 ? `证据闭环复查 ${evidenceLoopCount} 项` : "",
      ].filter(Boolean);
      setMessage(`复查完成：已处理 ${results.length} 条完成派单。`);
      setFollowUp({
        href: notice.href,
        label: notice.actionLabel,
        detail: detailParts.length > 0 ? detailParts.join("，") : "已刷新派单完成证据，请查看对应复查区域。",
      });
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "派单复查失败。");
      setFollowUp(null);
    } finally {
      setRunningRecheck(false);
    }
  }

  function renderStageAction(stage: ChapterProductionFlowStage, primary = false) {
    const buttonClass = primary
      ? "w-fit rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      : "mt-3 inline-flex rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";
    const linkClass = primary
      ? "w-fit rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
      : "mt-3 inline-flex rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50";

    if (stage.runAction) {
      return (
        <button
          className={buttonClass}
          disabled={runningStageId !== null}
          onClick={() => runStageAction(stage)}
          type="button"
        >
          {runningStageId === stage.id ? runningLabel(stage.runAction) : stage.runAction.label}
        </button>
      );
    }

    return (
      <Link className={linkClass} href={primary ? flow.nextHref : stage.href}>
        {primary ? flow.nextActionLabel : stage.actionLabel}
      </Link>
    );
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4" id="chapter-production-flow">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-medium">章节生产流水线</h2>
            <span className={`rounded-md px-2 py-1 text-xs font-medium ${flow.status === "ready" ? "bg-emerald-50 text-emerald-700" : flow.status === "working" ? "bg-sky-50 text-sky-700" : "bg-amber-50 text-amber-700"}`}>
              {statusLabel(flow.status)}
            </span>
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-600">{flow.headline}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{flow.nextAction}</p>
        </div>
        {nextStage ? renderStageAction(nextStage, true) : null}
      </div>
      {message ? (
        <div className="mt-3 flex flex-col gap-2 rounded-md bg-slate-50 p-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p>{message}</p>
            {followUp?.detail ? <p className="mt-1 text-xs text-slate-500">{followUp.detail}</p> : null}
          </div>
          {followUp ? (
            <Link
              className="w-fit rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              href={followUp.href}
            >
              {followUp.label}
            </Link>
          ) : null}
        </div>
      ) : null}
      {flow.recheckNotice ? (
        <div className="mt-3 flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-medium">{flow.recheckNotice.title}</div>
            <p className="mt-1 text-xs leading-5">{flow.recheckNotice.detail}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {flow.recheckNotice.runAction ? (
              <button
                className="w-fit rounded-md bg-amber-950 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-900 disabled:opacity-50"
                disabled={runningRecheck || runningStageId !== null}
                onClick={runRecheckNotice}
                type="button"
              >
                {runningRecheck ? "复查中" : flow.recheckNotice.runAction.label}
              </button>
            ) : null}
            <Link
              className="w-fit rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-950 hover:bg-amber-100"
              href={flow.recheckNotice.href}
            >
              {flow.recheckNotice.actionLabel}
            </Link>
          </div>
        </div>
      ) : null}
      <div className="mt-4 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
        {flow.stages.map((stage) => (
          <div
            className={`rounded-md p-3 text-sm ${flow.bottleneck === stage.id ? "ring-1 ring-slate-950" : "bg-slate-50"}`}
            key={stage.id}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium text-slate-950">{stage.label}</div>
              <span className={`rounded-md px-2 py-1 text-xs font-medium ${toneClass(stage.tone)}`}>
                {stage.count}/{stage.target}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-600">{stage.detail}</p>
            {stage.dispatchSummary ? (
              <div className="mt-2 rounded-md border border-slate-200 bg-white p-2 text-xs leading-5 text-slate-600">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-800">{stage.dispatchSummary.label}</span>
                  <Link className="font-medium text-slate-950" href={stage.dispatchSummary.href}>
                    {stage.dispatchSummary.actionLabel}
                  </Link>
                </div>
                <p className="mt-1">{stage.dispatchSummary.detail}</p>
              </div>
            ) : null}
            {renderStageAction(stage)}
          </div>
        ))}
      </div>
    </section>
  );
}
