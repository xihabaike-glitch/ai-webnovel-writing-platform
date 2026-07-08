"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { WritingWorkbenchQuickFix } from "@/lib/projects/writingWorkbench";

export function WritingPathQuickFixButton({ fix }: { fix: WritingWorkbenchQuickFix }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function applyFix() {
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetch(fix.endpoint, {
        method: fix.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fix.payload),
      });

      if (!response.ok) {
        throw new Error("执行失败，请进入内联快修检查字段。");
      }

      setMessage(`已执行：${fix.label}`);
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "执行失败，请重试。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mt-2">
      <button
        className="inline-flex w-fit rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        disabled={isSaving}
        onClick={() => void applyFix()}
        type="button"
      >
        {isSaving ? "执行中" : "执行补全草稿"}
      </button>
      {message ? <p className="mt-2 text-xs leading-5 text-slate-600">{message}</p> : null}
    </div>
  );
}
