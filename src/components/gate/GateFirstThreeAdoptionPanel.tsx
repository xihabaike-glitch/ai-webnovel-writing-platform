"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PrePublishGateAdoptionClosure, PrePublishGateAdoptionFollowupItem } from "@/lib/projects/prePublishGate";

function panelTone(status: PrePublishGateAdoptionClosure["status"]) {
  if (status === "pass") return "border-emerald-200 bg-emerald-50";
  if (status === "warn") return "border-amber-200 bg-amber-50";
  return "border-rose-200 bg-rose-50";
}

function statusTone(status: PrePublishGateAdoptionFollowupItem["status"]) {
  if (status === "pass") return "bg-emerald-100 text-emerald-800";
  if (status === "warn") return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
}

function statusText(status: PrePublishGateAdoptionFollowupItem["status"]) {
  if (status === "pass") return "已完成";
  if (status === "warn") return "缺证据";
  return "待处理";
}

function stateText(state: string) {
  if (state === "completed") return "完成";
  if (state === "assigned") return "已派单";
  if (state === "queued") return "排队";
  return state || "未知";
}

function visibleEvidence(item: PrePublishGateAdoptionFollowupItem) {
  if (item.evidence.trim()) return item.evidence;
  return item.detail;
}

function executeLabel(item: PrePublishGateAdoptionFollowupItem) {
  if (!item.execution || item.status === "pass") return null;
  if (item.execution.type === "chapter_review") return "一键审稿";
  return "刷新质检";
}

export function GateFirstThreeAdoptionPanel({ closure }: { closure: PrePublishGateAdoptionClosure }) {
  const router = useRouter();
  const [runningId, setRunningId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const visibleItems = closure.items.slice(0, 6);

  async function runFollowup(item: PrePublishGateAdoptionFollowupItem) {
    if (!item.execution) return;
    setRunningId(item.id);
    setMessage(null);
    try {
      const response = await fetch(
        item.execution.type === "chapter_review"
          ? "/api/ai/tasks/chapter-review"
          : `/api/projects/${item.execution.projectId}/platform-export`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.execution.type === "chapter_review"
            ? { chapterId: item.execution.chapterId }
            : { action: "snapshot", platformId: item.execution.platformId }),
        },
      );
      const payload = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "处理采纳后续失败。");
      setMessage(payload.message ?? `${item.title} 已处理，正在刷新总闸门。`);
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "处理采纳后续失败。");
    } finally {
      setRunningId(null);
    }
  }

  return (
    <section className={`mb-6 rounded-md border p-4 ${panelTone(closure.status)}`} id="first-three-adoption-closure">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="font-medium text-slate-950">前三章采纳闭环</h2>
          <p className="mt-1 text-sm leading-6 text-slate-700">{closure.detail}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs text-slate-700">
          <div className="rounded-md bg-white/80 px-3 py-2">
            <div className="text-lg font-semibold text-slate-950">{closure.total}</div>
            <div>任务</div>
          </div>
          <div className="rounded-md bg-white/80 px-3 py-2">
            <div className="text-lg font-semibold text-slate-950">{closure.pending}</div>
            <div>待处理</div>
          </div>
          <div className="rounded-md bg-white/80 px-3 py-2">
            <div className="text-lg font-semibold text-slate-950">{closure.completed}</div>
            <div>完成</div>
          </div>
        </div>
      </div>
      {message ? <div className="mt-3 rounded-md bg-white/80 px-3 py-2 text-sm text-slate-700">{message}</div> : null}

      {visibleItems.length ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {visibleItems.map((item) => {
            const label = executeLabel(item);
            return (
              <div className="rounded-md border border-white/70 bg-white p-3 text-sm shadow-sm" key={item.id}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-md px-2 py-1 text-xs font-medium ${statusTone(item.status)}`}>{statusText(item.status)}</span>
                      <span className="font-medium text-slate-950">{item.projectTitle}</span>
                      <span className="text-xs text-slate-500">{item.label}</span>
                    </div>
                    <div className="mt-2 font-medium text-slate-800">{item.title}</div>
                  </div>
                  <span className="w-fit rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">{stateText(item.state)}</span>
                </div>
                <p className="mt-2 line-clamp-2 leading-6 text-slate-600">{visibleEvidence(item)}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {label ? (
                    <button
                      className="rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                      disabled={runningId === item.id}
                      onClick={() => void runFollowup(item)}
                      type="button"
                    >
                      {runningId === item.id ? "处理中" : label}
                    </button>
                  ) : null}
                  <Link className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50" href={item.href}>
                    打开位置
                  </Link>
                  <span className="text-xs font-medium text-slate-500">{item.actionLabel}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 rounded-md border border-dashed border-white/80 bg-white/70 p-3 text-sm text-slate-600">
          暂无前三章采纳后续任务。生成并采纳前三章候选后，这里会追踪重新审稿和发布质检。
        </p>
      )}
    </section>
  );
}
