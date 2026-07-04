"use client";

import Link from "next/link";
import { useState } from "react";
import type { StoryTreeExperienceGuide, StoryTreeExperienceItem, StoryTreeExperienceStatus } from "@/lib/ai/storyTreeExperience";

function statusLabel(status: StoryTreeExperienceStatus) {
  if (status === "usable") return "可复用";
  if (status === "avoid") return "避坑";
  return "观察";
}

function statusClass(status: StoryTreeExperienceStatus) {
  if (status === "usable") return "bg-emerald-50 text-emerald-700";
  if (status === "avoid") return "bg-rose-50 text-rose-700";
  return "bg-amber-50 text-amber-700";
}

function sourceLine(item: StoryTreeExperienceItem) {
  const score = item.delta === null ? `${item.currentScore} 分` : `${item.previousScore} -> ${item.currentScore} 分`;
  return `${item.sourceLabel} · ${item.axisLabel} · ${score}`;
}

function actionLabel(status: StoryTreeExperienceStatus) {
  if (status === "usable") return "生成应用派单";
  if (status === "avoid") return "生成避坑派单";
  return "生成验证派单";
}

export function StoryTreeExperiencePanel({ guide, projectId }: { guide: StoryTreeExperienceGuide; projectId: string }) {
  const topItems = guide.items.slice(0, 6);
  const [runningKey, setRunningKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function applyExperience(item: StoryTreeExperienceItem) {
    setRunningKey(item.dispatchKey);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/story-tree-experience/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dispatchKey: item.dispatchKey }),
      });
      const payload = (await response.json().catch(() => null)) as { task?: { title?: string }; error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "生成结构经验派单失败。");
      }
      setMessage(`已生成派单：${payload?.task?.title ?? item.title}`);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "生成结构经验派单失败。");
    } finally {
      setRunningKey(null);
    }
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4" id="story-tree-experience">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-medium">大树结构经验库</h2>
          <p className="mt-1 text-sm text-slate-600">
            已验证 {guide.summary.total} 条 · 可复用 {guide.summary.usable} 条 · 避坑 {guide.summary.avoid} 条 · 观察 {guide.summary.watch} 条
          </p>
        </div>
        <Link
          className="w-fit rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50"
          href="/dispatch"
        >
          查看派单
        </Link>
      </div>
      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}

      {topItems.length > 0 ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {topItems.map((item) => (
            <div className="rounded-md border border-slate-200 p-3 text-sm" key={item.id}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-md px-2 py-1 text-xs font-medium ${statusClass(item.status)}`}>
                  {statusLabel(item.status)}
                </span>
                <span className="text-xs text-slate-500">{sourceLine(item)}</span>
              </div>
              <div className="mt-3 font-medium text-slate-950">{item.title}</div>
              <p className="mt-2 leading-6 text-slate-600">{item.action}</p>
              {item.effectLine ? (
                <p className="mt-2 rounded-md bg-slate-50 p-2 leading-6 text-slate-600">{item.effectLine}</p>
              ) : null}
              <p className="mt-2 leading-6 text-slate-500">{item.lesson}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                  disabled={runningKey === item.dispatchKey}
                  onClick={() => applyExperience(item)}
                  type="button"
                >
                  {runningKey === item.dispatchKey ? "生成中" : actionLabel(item.status)}
                </button>
                <Link className="font-medium text-slate-950 hover:underline" href={item.href}>
                  回到章节
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-md border border-dashed border-slate-200 p-4 text-sm text-slate-600">
          还没有完成过的大树结构复检任务。
        </div>
      )}
    </section>
  );
}
