"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RetryTaskButton({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [isRetrying, setIsRetrying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function retryTask() {
    setIsRetrying(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/ai/tasks/${taskId}/retry`, {
        method: "POST",
      });
      const payload = (await response.json()) as { task?: { status: string }; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "重试失败。");
      }
      setMessage(payload.task?.status === "succeeded" ? "重试成功" : "已发起重试");
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "重试失败。");
    } finally {
      setIsRetrying(false);
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button
        className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        disabled={isRetrying}
        onClick={retryTask}
        type="button"
      >
        {isRetrying ? "重试中" : "一键重试"}
      </button>
      {message ? <span className="text-sm text-slate-600">{message}</span> : null}
    </div>
  );
}
