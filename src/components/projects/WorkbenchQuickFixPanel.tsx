"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { WritingWorkbenchQuickFix } from "@/lib/projects/writingWorkbench";

function fieldLabel(field: string) {
  const labels: Record<string, string> = {
    hook: "开头钩子",
    conflict: "本章冲突",
    cliffhanger: "章末悬念",
    name: "姓名",
    role: "定位",
    desire: "欲望",
    need: "真正需求",
    flaw: "缺陷",
    arcStart: "弧光起点",
    arcEnd: "弧光终点",
    voice: "人物声音",
    relationshipNotes: "关系压力",
    type: "资料类型",
    title: "标题",
    content: "内容",
  };

  return labels[field] ?? field;
}

export function WorkbenchQuickFixPanel({ quickFixes }: { quickFixes: WritingWorkbenchQuickFix[] }) {
  const router = useRouter();
  const initialDrafts = useMemo(
    () => Object.fromEntries(quickFixes.map((fix) => [fix.id, fix.payload])),
    [quickFixes],
  );
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>(initialDrafts);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (quickFixes.length === 0) {
    return null;
  }

  function updateDraft(fixId: string, field: string, value: string) {
    setDrafts((current) => ({
      ...current,
      [fixId]: {
        ...(current[fixId] ?? {}),
        [field]: value,
      },
    }));
  }

  async function applyFix(fix: WritingWorkbenchQuickFix) {
    setSavingId(fix.id);
    setMessage(null);
    try {
      const response = await fetch(fix.endpoint, {
        method: fix.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(drafts[fix.id] ?? fix.payload),
      });

      if (!response.ok) {
        throw new Error("保存失败，请检查字段后重试。");
      }

      setMessage(`已保存：${fix.label}`);
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "保存失败，请重试。");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="font-medium text-slate-950">内联快修</div>
          <p className="mt-1 text-sm text-slate-600">先把最影响写作闭环的缺口补上，再进入正文生产。</p>
        </div>
        {message ? <div className="text-sm text-slate-600">{message}</div> : null}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {quickFixes.map((fix) => {
          const draft = drafts[fix.id] ?? fix.payload;

          return (
            <div className="rounded-md border border-slate-200 bg-white p-3" key={fix.id}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="font-medium text-slate-950">{fix.label}</div>
                  <p className="mt-1 text-sm text-slate-600">{fix.description}</p>
                </div>
                <button
                  className="w-fit rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                  disabled={savingId === fix.id}
                  onClick={() => void applyFix(fix)}
                  type="button"
                >
                  {savingId === fix.id ? "保存中" : "保存"}
                </button>
              </div>

              <div className="mt-3 grid gap-2">
                {Object.entries(draft).map(([field, value]) => (
                  <label className="grid gap-1 text-sm" key={field}>
                    <span className="font-medium text-slate-700">{fieldLabel(field)}</span>
                    <textarea
                      className="min-h-20 resize-y rounded-md border border-slate-200 px-3 py-2 text-sm leading-6 outline-none focus:border-slate-400"
                      onChange={(event) => updateDraft(fix.id, field, event.target.value)}
                      value={value}
                    />
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
