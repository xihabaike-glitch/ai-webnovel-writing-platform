"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { buildRecommendedBatchRouteGateTimeline } from "@/lib/projects/recommendedBatchRouteGateView";

export interface BatchRunResponse {
  error?: string;
  plan?: {
    actionLabel: string;
    detail: string;
    strategyBases?: Array<{
      label: string;
      openingMove: string;
      primaryTactic: string;
    }>;
  };
  routeEffectSummary?: {
    successRatePercent: number;
    knownCostUsd: number;
    averageQualityScore: number | null;
    verdict: string;
  };
  results?: Array<{
    status: "succeeded" | "failed";
  }>;
  batchReceipt?: {
    status: "continue" | "repair" | "review_quality" | "watch_cost";
    headline: string;
    detail: string;
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel: string;
    secondaryHref: string;
    evidenceItems: string[];
    warnings: string[];
    completionEvidenceTemplate?: string;
  };
  modelRouteGate?: {
    status: "allow" | "sample" | "block";
    label: string;
    headline: string;
    detail: string;
    actionLabel: string;
    targetHref: string;
    maxBatchSize: number;
    preferredRoutes: string[];
    avoidedRoutes: string[];
    warnings: string[];
    recoveryEvidence: string | null;
    recheckAdvice: {
      id: string;
      taskType: string;
      label: string;
      severity: "warning" | "blocked";
      action: "switch_route" | "extend_watch" | "manual_review";
      actionLabel: string;
      recommendation: string;
      sampleCount: number | null;
      successRatePercent: number | null;
      qualityScore: number | null;
      cost: string | null;
      fallbackHit: boolean | null;
      needsGovernance: boolean | null;
      evidence: string[];
      completedAt: string | null;
    } | null;
  };
}

function receiptTone(status: NonNullable<BatchRunResponse["batchReceipt"]>["status"]) {
  if (status === "continue") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "repair") return "border-rose-200 bg-rose-50 text-rose-900";
  if (status === "watch_cost") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-blue-200 bg-blue-50 text-blue-900";
}

function modelRouteGateTone(status: NonNullable<BatchRunResponse["modelRouteGate"]>["status"]) {
  if (status === "allow") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "sample") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-rose-200 bg-rose-50 text-rose-900";
}

function timelineToneClass(tone: ReturnType<typeof buildRecommendedBatchRouteGateTimeline>["tone"]) {
  if (tone === "ok") return "border-emerald-200 bg-white/70 text-emerald-900";
  if (tone === "watch") return "border-amber-200 bg-white/70 text-amber-900";
  return "border-rose-200 bg-white/70 text-rose-900";
}

function timelineItemClass(status: ReturnType<typeof buildRecommendedBatchRouteGateTimeline>["items"][number]["status"]) {
  if (status === "done") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "active") return "border-slate-950 bg-slate-950 text-white";
  return "border-slate-200 bg-slate-50 text-slate-500";
}

export function RunRecommendedBatchButton({
  disabled,
  strategyId,
  initialModelRouteGate = null,
}: {
  disabled: boolean;
  strategyId: string;
  initialModelRouteGate?: BatchRunResponse["modelRouteGate"] | null;
}) {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [batchReceipt, setBatchReceipt] = useState<BatchRunResponse["batchReceipt"] | null>(null);
  const [modelRouteGate, setModelRouteGate] = useState<BatchRunResponse["modelRouteGate"] | null>(initialModelRouteGate);
  const [isCreatingRecheck, setIsCreatingRecheck] = useState(false);
  const routeGateTimeline = modelRouteGate ? buildRecommendedBatchRouteGateTimeline(modelRouteGate) : null;
  const runActionLabel = routeGateTimeline && modelRouteGate?.status !== "block"
    ? routeGateTimeline.primaryActionLabel
    : "执行推荐批次";

  useEffect(() => {
    setModelRouteGate(initialModelRouteGate);
  }, [initialModelRouteGate]);

  async function runBatch() {
    setIsRunning(true);
    setMessage(null);
    setBatchReceipt(null);
    setModelRouteGate(initialModelRouteGate);
    try {
      const response = await fetch(`/api/tasks/recommended-batch?strategy=${encodeURIComponent(strategyId)}`, {
        method: "POST",
      });
      const payload = (await response.json()) as BatchRunResponse;
      setModelRouteGate(payload.modelRouteGate ?? null);
      if (!response.ok) {
        setMessage(payload.error ?? "推荐批次执行失败。");
        router.refresh();
        return;
      }
      const succeeded = payload.results?.filter((result) => result.status === "succeeded").length ?? 0;
      const failed = payload.results?.filter((result) => result.status === "failed").length ?? 0;
      const summary = payload.routeEffectSummary
        ? `成功率 ${payload.routeEffectSummary.successRatePercent}%，成本 $${payload.routeEffectSummary.knownCostUsd.toFixed(4)}，质量 ${payload.routeEffectSummary.averageQualityScore ?? "缺"}。`
        : "";
      const tactic = payload.plan?.strategyBases?.[0];
      const tacticText = tactic ? `打法依据：${tactic.label}｜${tactic.openingMove || tactic.primaryTactic}。` : "";
      setMessage(`${payload.plan?.actionLabel ?? "推荐批次"}完成：成功 ${succeeded}，失败 ${failed}。${summary}${tacticText}`);
      setBatchReceipt(payload.batchReceipt ?? null);
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "推荐批次执行失败。");
    } finally {
      setIsRunning(false);
    }
  }

  async function createModelRouteRecheckDispatch() {
    if (!modelRouteGate?.recheckAdvice) return;
    setIsCreatingRecheck(true);
    setMessage(null);
    try {
      const response = await fetch("/api/model-route-confirmation-recheck-dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ advice: modelRouteGate.recheckAdvice }),
      });
      const payload = await response.json().catch(() => null) as {
        task?: { title?: string; href?: string };
        error?: string;
      } | null;
      if (!response.ok || !payload?.task) {
        throw new Error(payload?.error ?? "生成模型路线复检派单失败。");
      }
      setMessage(`已生成「${payload.task.title ?? modelRouteGate.recheckAdvice.label}」复检派单。`);
      router.push(payload.task.href ?? "/dispatch");
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "生成模型路线复检派单失败。");
    } finally {
      setIsCreatingRecheck(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <button
        className="w-fit rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        disabled={disabled || isRunning}
        onClick={runBatch}
        type="button"
      >
      {isRunning ? "执行中" : runActionLabel}
      </button>
      {message ? <p className="max-w-xl text-sm text-slate-600">{message}</p> : null}
      {modelRouteGate ? (
        <div className={`w-full max-w-2xl rounded-md border p-3 text-left text-sm ${modelRouteGateTone(modelRouteGate.status)}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="font-medium">{modelRouteGate.label}</div>
              <p className="mt-1 leading-6 opacity-90">{modelRouteGate.headline}</p>
              <div className="mt-2 rounded-md bg-white/70 px-2 py-1 text-xs leading-5">{modelRouteGate.detail}</div>
              {routeGateTimeline ? (
                <div className={`mt-2 rounded-md border px-2 py-2 text-xs leading-5 ${timelineToneClass(routeGateTimeline.tone)}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{routeGateTimeline.label}</span>
                    <span>{routeGateTimeline.summary}</span>
                  </div>
                  <div className="mt-2 rounded-md bg-white/75 px-2 py-1">
                    <span className="font-medium">下一步：{routeGateTimeline.primaryActionLabel}</span>
                    <span className="ml-1">{routeGateTimeline.primaryActionDetail}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {routeGateTimeline.items.map((item) => (
                      <span className={`rounded-md border px-2 py-1 font-medium ${timelineItemClass(item.status)}`} key={item.label}>
                        {item.label}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {modelRouteGate.recoveryEvidence ? (
                <div className="mt-2 rounded-md bg-white/80 px-2 py-1 text-xs leading-5">恢复依据：{modelRouteGate.recoveryEvidence}</div>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {modelRouteGate.recheckAdvice ? (
                <button
                  className="w-fit rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                  disabled={isCreatingRecheck}
                  onClick={() => void createModelRouteRecheckDispatch()}
                  type="button"
                >
                  {isCreatingRecheck ? "生成中" : "生成复检派单"}
                </button>
              ) : null}
              <a className="w-fit rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-950" href={modelRouteGate.targetHref}>
                {modelRouteGate.actionLabel}
              </a>
            </div>
          </div>
          {modelRouteGate.preferredRoutes.length || modelRouteGate.avoidedRoutes.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
              {modelRouteGate.preferredRoutes.map((route) => (
                <span className="rounded-md bg-white/75 px-2 py-1" key={route}>优先：{route}</span>
              ))}
              {modelRouteGate.avoidedRoutes.map((route) => (
                <span className="rounded-md bg-white/75 px-2 py-1" key={route}>避用：{route}</span>
              ))}
            </div>
          ) : null}
          {modelRouteGate.warnings.length ? (
            <div className="mt-2 grid gap-1 text-xs leading-5 opacity-90">
              {modelRouteGate.warnings.slice(0, 3).map((warning) => (
                <div key={warning}>· {warning}</div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {batchReceipt ? (
        <div className={`w-full max-w-2xl rounded-md border p-3 text-left text-sm ${receiptTone(batchReceipt.status)}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="font-medium">{batchReceipt.headline}</div>
              <p className="mt-1 leading-6 opacity-90">{batchReceipt.detail}</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <a className="w-fit rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white" href={batchReceipt.primaryHref}>
                {batchReceipt.primaryLabel}
              </a>
              <a className="w-fit rounded-md bg-white/80 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-white" href={batchReceipt.secondaryHref}>
                {batchReceipt.secondaryLabel}
              </a>
            </div>
          </div>
          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            {batchReceipt.evidenceItems.map((item) => (
              <div className="rounded-md bg-white/70 px-2 py-1" key={item}>{item}</div>
            ))}
          </div>
          {batchReceipt.completionEvidenceTemplate ? (
            <div className="mt-3 rounded-md bg-white/75 p-3 text-xs leading-5 text-slate-900">
              <div className="font-medium">可粘贴到任务中心的验收依据</div>
              <pre className="mt-2 whitespace-pre-wrap break-words font-sans">{batchReceipt.completionEvidenceTemplate}</pre>
            </div>
          ) : null}
          {batchReceipt.warnings.length > 0 ? (
            <div className="mt-2 grid gap-1 text-xs leading-5 opacity-90">
              {batchReceipt.warnings.map((warning) => (
                <div key={warning}>· {warning}</div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
