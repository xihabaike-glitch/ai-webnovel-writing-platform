"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface BatchRunResponse {
  error?: string;
  plan?: {
    actionLabel: string;
    detail: string;
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
}

export function RunRecommendedBatchButton({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function runBatch() {
    setIsRunning(true);
    setMessage(null);
    try {
      const response = await fetch("/api/tasks/recommended-batch", {
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
      setMessage(`${payload.plan?.actionLabel ?? "推荐批次"}完成：成功 ${succeeded}，失败 ${failed}。${summary}`);
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
    </div>
  );
}
