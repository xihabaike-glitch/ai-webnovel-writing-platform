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
        dispatchHref?: string | null;
      };
      if (!response.ok) throw new Error(payload.error ?? "生成失败");
      setMessage(payload.message ?? "已生成复验派单。");
      setHref(payload.dispatchHref ?? action.successHref);
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
        {isRunning ? "生成中" : action.label}
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
