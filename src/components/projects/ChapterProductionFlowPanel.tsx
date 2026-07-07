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
import { buildChapterProductionRecheckDecision, type ChapterProductionRecheckPayload } from "@/lib/projects/chapterProductionRecheckDecision";

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

function followUpResultClass(status: NonNullable<ChapterProductionFlow["followUpResultNotice"]>["status"]) {
  if (status === "cleared") {
    return {
      box: "border-emerald-200 bg-emerald-50 text-emerald-950",
      detail: "text-emerald-800",
      action: "bg-emerald-950 text-white hover:bg-emerald-900",
    };
  }
  if (status === "needs_action") {
    return {
      box: "border-rose-200 bg-rose-50 text-rose-950",
      detail: "text-rose-800",
      action: "bg-rose-950 text-white hover:bg-rose-900",
    };
  }
  return {
    box: "border-amber-200 bg-amber-50 text-amber-950",
    detail: "text-amber-800",
    action: "bg-amber-950 text-white hover:bg-amber-900",
  };
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

function hrefWithGateReturn(href: string, gateReturnHref?: string | null) {
  if (!gateReturnHref || !href.startsWith("/") || href.startsWith("/gate")) return href;

  const hashIndex = href.indexOf("#");
  const base = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";
  if (base.includes("gateReturn=")) return href;
  const separator = base.includes("?") ? "&" : "?";

  return `${base}${separator}gateReturn=${encodeURIComponent(gateReturnHref)}${hash}`;
}

export function ChapterProductionFlowPanel({
  flow,
  gateReturnHref,
}: {
  flow: ChapterProductionFlow;
  gateReturnHref?: string | null;
}) {
  const router = useRouter();
  const [runningStageId, setRunningStageId] = useState<string | null>(null);
  const [runningRecheck, setRunningRecheck] = useState(false);
  const [runningFollowUpResult, setRunningFollowUpResult] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState<ChapterProductionFlowRunAction["afterSuccess"] | null>(null);
  const nextStage = useMemo(
    () => flow.stages.find((stage) => stage.id === flow.bottleneck),
    [flow.bottleneck, flow.stages],
  );
  const followUpResultTone = flow.followUpResultNotice ? followUpResultClass(flow.followUpResultNotice.status) : null;

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
      const results = await Promise.all(action.dispatches.map(async (dispatch): Promise<ChapterProductionRecheckPayload> => {
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
          storyTreeRecheck?: ChapterProductionRecheckPayload["storyTreeRecheck"];
          evidenceLoopRecheck?: ChapterProductionRecheckPayload["evidenceLoopRecheck"];
          followUpTasks?: unknown[];
          error?: string;
        } | null;
        if (!response.ok) throw new Error(payload?.error ?? "派单复查失败。");
        return {
          storyTreeRecheck: payload?.storyTreeRecheck ?? null,
          evidenceLoopRecheck: payload?.evidenceLoopRecheck ?? null,
          followUpTasks: payload?.followUpTasks ?? [],
        };
      }));
      const followUpTaskCount = results.reduce((sum, result) => sum + (result.followUpTasks?.length ?? 0), 0);
      const decision = buildChapterProductionRecheckDecision(results, {
        href: notice.href,
        label: notice.actionLabel,
      });
      setMessage(decision.title);
      setFollowUp({
        href: followUpTaskCount > 0 ? "/dispatch" : decision.href,
        label: followUpTaskCount > 0 ? "查看派单" : decision.label,
        detail: followUpTaskCount > 0
          ? `${decision.detail} 已自动生成 ${followUpTaskCount} 条后续派单。`
          : decision.detail,
      });
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "派单复查失败。");
      setFollowUp(null);
    } finally {
      setRunningRecheck(false);
    }
  }

  async function runFollowUpResultNotice() {
    const notice = flow.followUpResultNotice;
    const action = notice?.runAction;
    if (!notice || !action || action.dispatches.length === 0) return;
    setRunningFollowUpResult(true);
    setMessage(null);
    setFollowUp(null);
    try {
      const results = await Promise.all(action.dispatches.map(async (dispatch): Promise<ChapterProductionRecheckPayload> => {
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
          storyTreeRecheck?: ChapterProductionRecheckPayload["storyTreeRecheck"];
          evidenceLoopRecheck?: ChapterProductionRecheckPayload["evidenceLoopRecheck"];
          followUpTasks?: unknown[];
          error?: string;
        } | null;
        if (!response.ok) throw new Error(payload?.error ?? "再派单失败。");
        return {
          storyTreeRecheck: payload?.storyTreeRecheck ?? null,
          evidenceLoopRecheck: payload?.evidenceLoopRecheck ?? null,
          followUpTasks: payload?.followUpTasks ?? [],
        };
      }));
      const followUpTaskCount = results.reduce((sum, result) => sum + (result.followUpTasks?.length ?? 0), 0);
      const decision = buildChapterProductionRecheckDecision(results, {
        href: notice.href,
        label: notice.actionLabel,
      });
      setMessage(followUpTaskCount > 0 ? "下一轮返工派单已生成" : decision.title);
      setFollowUp({
        href: followUpTaskCount > 0 ? "/dispatch" : decision.href,
        label: followUpTaskCount > 0 ? "查看派单" : decision.label,
        detail: followUpTaskCount > 0
          ? `${decision.detail} 已自动生成 ${followUpTaskCount} 条下一轮返工派单。`
          : decision.detail,
      });
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "再派单失败。");
      setFollowUp(null);
    } finally {
      setRunningFollowUpResult(false);
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
      <Link className={linkClass} href={hrefWithGateReturn(primary ? flow.nextHref : stage.href, gateReturnHref)}>
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
              href={hrefWithGateReturn(followUp.href, gateReturnHref)}
            >
              {followUp.label}
            </Link>
          ) : null}
        </div>
      ) : null}
      {flow.followUpNotice ? (
        <div className="mt-3 flex flex-col gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-950 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-medium">{flow.followUpNotice.title}</div>
            <p className="mt-1 text-xs leading-5 text-rose-800">{flow.followUpNotice.detail}</p>
          </div>
          <Link
            className="w-fit rounded-md bg-rose-950 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-900"
            href={hrefWithGateReturn(flow.followUpNotice.href, gateReturnHref)}
          >
            {flow.followUpNotice.actionLabel}
          </Link>
        </div>
      ) : null}
      {flow.followUpResultNotice && followUpResultTone ? (
        <div className={`mt-3 flex flex-col gap-2 rounded-md border p-3 text-sm sm:flex-row sm:items-center sm:justify-between ${followUpResultTone.box}`}>
          <div>
            <div className="font-medium">{flow.followUpResultNotice.title}</div>
            <p className={`mt-1 text-xs leading-5 ${followUpResultTone.detail}`}>{flow.followUpResultNotice.detail}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {flow.followUpResultNotice.runAction ? (
              <button
                className={`w-fit rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${followUpResultTone.action}`}
                disabled={runningFollowUpResult || runningRecheck || runningStageId !== null}
                onClick={runFollowUpResultNotice}
                type="button"
              >
                {runningFollowUpResult ? "再派单中" : flow.followUpResultNotice.runAction.label}
              </button>
            ) : null}
            <Link
              className={`w-fit rounded-md px-3 py-1.5 text-xs font-medium ${followUpResultTone.action}`}
              href={hrefWithGateReturn(flow.followUpResultNotice.href, gateReturnHref)}
            >
              {flow.followUpResultNotice.actionLabel}
            </Link>
          </div>
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
              href={hrefWithGateReturn(flow.recheckNotice.href, gateReturnHref)}
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
                  <Link className="font-medium text-slate-950" href={hrefWithGateReturn(stage.dispatchSummary.href, gateReturnHref)}>
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
