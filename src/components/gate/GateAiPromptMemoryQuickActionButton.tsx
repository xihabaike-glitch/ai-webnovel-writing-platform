"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface GateAiPromptMemoryQuickAction {
  label: string;
  endpoint: string;
  body: {
    areaId: "ai-pipeline";
    memoryAction: "rollback";
  };
  successHref: string;
  runAfterCreate: {
    lookupEndpoint: string;
    runEndpoint: string;
  };
}

interface GateAiPipelineDispatchTask {
  dispatchKey: string;
  platformId: string;
  projectId: string | null;
  stage: string;
  href: string;
  [key: string]: unknown;
}

export function GateAiPromptMemoryQuickActionButton({
  action,
}: {
  action: GateAiPromptMemoryQuickAction;
}) {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [href, setHref] = useState(action.successHref);

  async function runAction() {
    setIsRunning(true);
    setMessage("");
    try {
      const response = await fetch(action.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action.body),
      });
      const payload = await response.json().catch(() => ({})) as {
        error?: string;
        message?: string;
        dispatchKey?: string | null;
        dispatchHref?: string | null;
      };
      if (!response.ok) throw new Error(payload.error ?? "生成失败");
      let nextMessage = payload.message ?? "已生成复验派单。";
      let nextHref = payload.dispatchHref ?? action.successHref;
      if (payload.dispatchKey) {
        const lookupResponse = await fetch(action.runAfterCreate.lookupEndpoint);
        const lookupPayload = await lookupResponse.json().catch(() => ({})) as {
          tasks?: GateAiPipelineDispatchTask[];
          error?: string;
        };
        if (!lookupResponse.ok) throw new Error(lookupPayload.error ?? "查找复验派单失败。");
        const dispatch = lookupPayload.tasks?.find((task) => task.dispatchKey === payload.dispatchKey);
        if (!dispatch) throw new Error("复验派单已生成，但未在派单中心找到。");
        const runResponse = await fetch(action.runAfterCreate.runEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dispatch }),
        });
        const runPayload = await runResponse.json().catch(() => ({})) as {
          error?: string;
          results?: Array<{ status?: string }>;
          routeEffectSummary?: {
            successRatePercent?: number;
            averageQualityScore?: number | null;
          };
          recoveryDispatch?: { dispatchKey?: string; title?: string } | null;
        };
        if (!runResponse.ok) throw new Error(runPayload.error ?? "运行 1 章复验失败。");
        const total = runPayload.results?.length ?? 0;
        const succeeded = runPayload.results?.filter((result) => result.status === "succeeded").length ?? 0;
        const quality = runPayload.routeEffectSummary?.averageQualityScore ?? "缺";
        const recoveryText = runPayload.recoveryDispatch?.title ? `，并生成后续派单：${runPayload.recoveryDispatch.title}` : "";
        nextMessage = `已生成并运行 1 章复验：${succeeded}/${total} 成功，成功率 ${runPayload.routeEffectSummary?.successRatePercent ?? 0}%，质量 ${quality}${recoveryText}。`;
        nextHref = runPayload.recoveryDispatch?.dispatchKey
          ? `/dispatch?queue=ai_pipeline#dispatch-${runPayload.recoveryDispatch.dispatchKey}`
          : payload.dispatchHref ?? nextHref;
      }
      setMessage(nextMessage);
      setHref(nextHref);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "生成失败");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="flex w-full flex-col items-start gap-2 lg:w-fit lg:items-end">
      <button
        className="w-fit rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        disabled={isRunning}
        onClick={() => void runAction()}
        type="button"
      >
        {isRunning ? "处理中" : action.label}
      </button>
      {message ? (
        <div className="text-xs leading-5 text-slate-700">
          <span>{message}</span>
          <Link className="ml-2 font-medium text-slate-950 underline underline-offset-2" href={href}>
            查看派单
          </Link>
        </div>
      ) : null}
    </div>
  );
}
