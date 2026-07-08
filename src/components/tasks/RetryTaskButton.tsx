"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RetryTaskButton({
  taskId,
  className = "mt-3 flex flex-wrap items-center gap-2",
  label = "一键重试",
  runningLabel = "重试中",
  purpose = "failure_retry",
}: {
  taskId: string;
  className?: string;
  label?: string;
  runningLabel?: string;
  purpose?: "failure_retry" | "archive_experience_repair";
}) {
  const router = useRouter();
  const [isRetrying, setIsRetrying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function retryTask() {
    setIsRetrying(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/ai/tasks/${taskId}/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose }),
      });
      const payload = (await response.json()) as { task?: { status: string }; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "重试失败。");
      }
      setMessage(payload.task?.status === "succeeded" ? "执行成功" : "已发起重跑");
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "重试失败。");
    } finally {
      setIsRetrying(false);
    }
  }

  return (
    <div className={className}>
      <button
        className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        disabled={isRetrying}
        onClick={retryTask}
        type="button"
      >
        {isRetrying ? runningLabel : label}
      </button>
      {message ? <span className="text-sm text-slate-600">{message}</span> : null}
    </div>
  );
}
