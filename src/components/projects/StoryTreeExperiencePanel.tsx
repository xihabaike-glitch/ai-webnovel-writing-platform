"use client";

import Link from "next/link";
import { useState } from "react";
import type { StoryTreeExperienceAxisFilter, StoryTreeExperienceEffectDashboard, StoryTreeExperienceGuide, StoryTreeExperienceItem, StoryTreeExperienceStatus } from "@/lib/ai/storyTreeExperience";

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

function decisionItemLine(item: StoryTreeExperienceItem) {
  return `${item.axisLabel}｜${item.action}`;
}

export function StoryTreeExperiencePanel({
  appliedDispatchKeys,
  effectDashboard,
  guide,
  projectId,
}: {
  appliedDispatchKeys?: string[];
  effectDashboard: StoryTreeExperienceEffectDashboard;
  guide: StoryTreeExperienceGuide;
  projectId: string;
}) {
  const [axisFilter, setAxisFilter] = useState<StoryTreeExperienceAxisFilter>("all");
  const filteredItems = axisFilter === "all" ? guide.items : guide.items.filter((item) => item.axisId === axisFilter);
  const topItems = filteredItems.slice(0, 6);
  const [runningKey, setRunningKey] = useState<string | null>(null);
  const [runningBatchKey, setRunningBatchKey] = useState<string | null>(null);
  const [createdDispatchKeys, setCreatedDispatchKeys] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const dispatchedKeys = new Set([...(appliedDispatchKeys ?? []), ...createdDispatchKeys]);

  function isDispatched(item: StoryTreeExperienceItem) {
    return dispatchedKeys.has(item.dispatchKey);
  }

  function hasPendingDispatch(items: StoryTreeExperienceItem[]) {
    return items.some((item) => !isDispatched(item));
  }

  function batchButtonLabel(batchKey: string, items: StoryTreeExperienceItem[]) {
    if (runningBatchKey === batchKey) return "派单中";
    return items.length > 0 && !hasPendingDispatch(items) ? "已派单" : "批量派单";
  }

  async function createExperienceDispatch(item: StoryTreeExperienceItem) {
    const response = await fetch(`/api/projects/${projectId}/story-tree-experience/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dispatchKey: item.dispatchKey }),
    });
    const payload = (await response.json().catch(() => null)) as { task?: { title?: string }; error?: string } | null;
    if (!response.ok) {
      throw new Error(payload?.error ?? "生成结构经验派单失败。");
    }
    return payload?.task?.title ?? item.title;
  }

  async function applyExperience(item: StoryTreeExperienceItem) {
    setRunningKey(item.dispatchKey);
    setMessage(null);
    try {
      const title = await createExperienceDispatch(item);
      setCreatedDispatchKeys((current) => Array.from(new Set([...current, item.dispatchKey])));
      setMessage(`已生成派单：${title}`);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "生成结构经验派单失败。");
    } finally {
      setRunningKey(null);
    }
  }

  async function applyDecisionBatch(batchKey: string, label: string, items: StoryTreeExperienceItem[]) {
    const pendingItems = items.filter((item) => !isDispatched(item));
    if (pendingItems.length === 0) {
      setMessage(`「${label}」里的结构经验都已派单。`);
      return;
    }
    setRunningBatchKey(batchKey);
    setMessage(null);
    let succeeded = 0;
    let failed = 0;
    const createdKeys: string[] = [];

    for (const item of pendingItems) {
      try {
        await createExperienceDispatch(item);
        succeeded += 1;
        createdKeys.push(item.dispatchKey);
      } catch {
        failed += 1;
      }
    }

    if (createdKeys.length > 0) {
      setCreatedDispatchKeys((current) => Array.from(new Set([...current, ...createdKeys])));
    }
    const skipped = items.length - pendingItems.length;
    setMessage(`已按「${label}」生成 ${succeeded} 条结构经验派单${skipped ? `，跳过 ${skipped} 条已派单` : ""}${failed ? `，${failed} 条失败` : ""}。`);
    setRunningBatchKey(null);
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
      <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="font-medium text-slate-950">回流效果决策台</div>
            <p className="mt-1 text-sm text-slate-600">{effectDashboard.decision}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div className="rounded-md bg-white p-2">
              <div className="text-slate-500">继续有效</div>
              <div className="mt-1 font-medium text-emerald-700">{effectDashboard.summary.reinforced}</div>
            </div>
            <div className="rounded-md bg-white p-2">
              <div className="text-slate-500">效果变弱</div>
              <div className="mt-1 font-medium text-rose-700">{effectDashboard.summary.weakened}</div>
            </div>
            <div className="rounded-md bg-white p-2">
              <div className="text-slate-500">继续观察</div>
              <div className="mt-1 font-medium text-amber-700">{effectDashboard.summary.watch}</div>
            </div>
            <div className="rounded-md bg-white p-2">
              <div className="text-slate-500">待回流</div>
              <div className="mt-1 font-medium text-slate-700">{effectDashboard.summary.noFeedback}</div>
            </div>
          </div>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <div className="rounded-md bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium text-emerald-700">优先复用</div>
              <button
                className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                disabled={!hasPendingDispatch(effectDashboard.reusableItems) || Boolean(runningBatchKey)}
                onClick={() => applyDecisionBatch("reusable", "优先复用", effectDashboard.reusableItems)}
                type="button"
              >
                {batchButtonLabel("reusable", effectDashboard.reusableItems)}
              </button>
            </div>
            <div className="mt-2 grid gap-2 text-sm text-slate-600">
              {effectDashboard.reusableItems.map((item) => (
                <div className="flex flex-wrap items-center gap-2" key={item.id}>
                  <Link className="hover:text-slate-950 hover:underline" href={item.href}>
                    {decisionItemLine(item)}
                  </Link>
                  {isDispatched(item) ? <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-500">已派单</span> : null}
                </div>
              ))}
              {effectDashboard.reusableItems.length === 0 ? <div>暂无持续有效证据。</div> : null}
            </div>
          </div>
          <div className="rounded-md bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium text-rose-700">先做避坑</div>
              <button
                className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                disabled={!hasPendingDispatch(effectDashboard.avoidItems) || Boolean(runningBatchKey)}
                onClick={() => applyDecisionBatch("avoid", "先做避坑", effectDashboard.avoidItems)}
                type="button"
              >
                {batchButtonLabel("avoid", effectDashboard.avoidItems)}
              </button>
            </div>
            <div className="mt-2 grid gap-2 text-sm text-slate-600">
              {effectDashboard.avoidItems.map((item) => (
                <div className="flex flex-wrap items-center gap-2" key={item.id}>
                  <Link className="hover:text-slate-950 hover:underline" href={item.href}>
                    {decisionItemLine(item)}
                  </Link>
                  {isDispatched(item) ? <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-500">已派单</span> : null}
                </div>
              ))}
              {effectDashboard.avoidItems.length === 0 ? <div>暂无变弱经验。</div> : null}
            </div>
          </div>
          <div className="rounded-md bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium text-amber-700">继续观察</div>
              <button
                className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                disabled={!hasPendingDispatch(effectDashboard.watchItems) || Boolean(runningBatchKey)}
                onClick={() => applyDecisionBatch("watch", "继续观察", effectDashboard.watchItems)}
                type="button"
              >
                {batchButtonLabel("watch", effectDashboard.watchItems)}
              </button>
            </div>
            <div className="mt-2 grid gap-2 text-sm text-slate-600">
              {effectDashboard.watchItems.map((item) => (
                <div className="flex flex-wrap items-center gap-2" key={item.id}>
                  <Link className="hover:text-slate-950 hover:underline" href={item.href}>
                    {decisionItemLine(item)}
                  </Link>
                  {isDispatched(item) ? <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-500">已派单</span> : null}
                </div>
              ))}
              {effectDashboard.watchItems.length === 0 ? <div>暂无待观察经验。</div> : null}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {guide.groups.map((group) => (
          <button
            className={`rounded-md border px-3 py-2 text-sm font-medium ${
              axisFilter === group.axisId
                ? "border-slate-950 bg-slate-950 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
            key={group.axisId}
            onClick={() => setAxisFilter(group.axisId)}
            type="button"
          >
            {group.axisLabel} · {group.total}
          </button>
        ))}
      </div>

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
                  disabled={runningKey === item.dispatchKey || isDispatched(item)}
                  onClick={() => applyExperience(item)}
                  type="button"
                >
                  {runningKey === item.dispatchKey ? "生成中" : isDispatched(item) ? "已派单" : actionLabel(item.status)}
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
          当前分类还没有完成过的大树结构复检任务。
        </div>
      )}
    </section>
  );
}
