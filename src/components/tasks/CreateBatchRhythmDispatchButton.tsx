"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface BatchRhythmDispatchResponse {
  status?: "created" | "skipped" | "empty";
  message?: string;
  error?: string;
  task?: {
    dispatchKey: string;
    title: string;
    href: string;
  } | null;
}

export function CreateBatchRhythmDispatchButton({ label = "生成派单" }: { label?: string }) {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState("");

  async function createDispatch() {
    setIsRunning(true);
    setMessage("");
    try {
      const response = await fetch("/api/tasks/batch-rhythm-dispatch", {
        method: "POST",
      });
      const payload = await response.json().catch(() => null) as BatchRhythmDispatchResponse | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "生成批次节奏派单失败。");
      }
      setMessage(payload?.message ?? "批次节奏派单已处理。");
      if (payload?.task?.dispatchKey) {
        router.push(`/dispatch#dispatch-${payload.task.dispatchKey}`);
      }
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "生成批次节奏派单失败。");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        className="w-fit rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        disabled={isRunning}
        onClick={createDispatch}
        type="button"
      >
        {isRunning ? "生成中" : label}
      </button>
      {message ? <div className="max-w-sm text-xs leading-5 opacity-80">{message}</div> : null}
    </div>
  );
}
