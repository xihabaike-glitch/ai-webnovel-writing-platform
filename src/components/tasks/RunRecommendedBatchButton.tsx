"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface BatchRunResponse {
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
  };
}

function receiptTone(status: NonNullable<BatchRunResponse["batchReceipt"]>["status"]) {
  if (status === "continue") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "repair") return "border-rose-200 bg-rose-50 text-rose-900";
  if (status === "watch_cost") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-blue-200 bg-blue-50 text-blue-900";
}

export function RunRecommendedBatchButton({ disabled, strategyId }: { disabled: boolean; strategyId: string }) {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [batchReceipt, setBatchReceipt] = useState<BatchRunResponse["batchReceipt"] | null>(null);

  async function runBatch() {
    setIsRunning(true);
    setMessage(null);
    setBatchReceipt(null);
    try {
      const response = await fetch(`/api/tasks/recommended-batch?strategy=${encodeURIComponent(strategyId)}`, {
        method: "POST",
      });
      const payload = (await response.json()) as BatchRunResponse;
      if (!response.ok) {
        throw new Error(payload.error ?? "推荐批次执行失败。");
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

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <button
        className="w-fit rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        disabled={disabled || isRunning}
        onClick={runBatch}
        type="button"
      >
      {isRunning ? "执行中" : "执行推荐批次"}
      </button>
      {message ? <p className="max-w-xl text-sm text-slate-600">{message}</p> : null}
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
