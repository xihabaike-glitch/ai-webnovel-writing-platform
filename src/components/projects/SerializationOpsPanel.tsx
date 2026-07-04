"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface SerializationChapter {
  id: string;
  order: number;
  title: string;
  status: string;
  wordCount: number;
}

interface SerializationAction {
  id: string;
  label: string;
  priority: "high" | "medium" | "low";
  detail: string;
  chapterId?: string;
  execution: SerializationActionExecution | null;
}

interface SerializationActionExecution {
  label: string;
  method: "PATCH" | "POST";
  endpoint: string;
  payload: Record<string, string | number | boolean>;
}

interface SerializationOpsDashboard {
  platformName: string;
  dailyWordTarget: number;
  progressPercent: number;
  publishReadyCount: number;
  reviewQueueCount: number;
  revisionQueueCount: number;
  submissionReadinessPercent: number;
  nextPublishChapter: SerializationChapter | null;
  actions: SerializationAction[];
  warnings: string[];
}

interface SubmissionChecklistItem {
  id: string;
  label: string;
  status: "pass" | "todo" | "risk";
  detail: string;
}

interface SubmissionChecklist {
  readinessPercent: number;
  items: SubmissionChecklistItem[];
}

function priorityLabel(priority: SerializationAction["priority"]) {
  if (priority === "high") return "高优先级";
  if (priority === "medium") return "中优先级";
  return "低优先级";
}

export function SerializationOpsPanel({ projectId }: { projectId: string }) {
  const [dashboard, setDashboard] = useState<SerializationOpsDashboard | null>(null);
  const [checklist, setChecklist] = useState<SubmissionChecklist | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [runningActionId, setRunningActionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadOps() {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/serialization-ops`);
      if (!response.ok) {
        throw new Error("读取连载运营看板失败。");
      }
      const payload = (await response.json()) as {
        dashboard: SerializationOpsDashboard;
        submissionChecklist: SubmissionChecklist;
      };
      setDashboard(payload.dashboard);
      setChecklist(payload.submissionChecklist);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "读取连载运营看板失败。");
    } finally {
      setIsLoading(false);
    }
  }

  async function runAction(action: SerializationAction) {
    if (!action.execution) return;
    setRunningActionId(action.id);
    setMessage(null);
    try {
      const response = await fetch(action.execution.endpoint, {
        method: action.execution.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action.execution.payload),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; message?: string; result?: { score?: number }; secondPassAudit?: { score?: number } } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "执行运营动作失败。");
      }
      await loadOps();
      const score = payload?.result?.score ?? payload?.secondPassAudit?.score;
      setMessage(score ? `已完成：${action.label}，复检 ${score} 分。` : `已完成：${action.label}`);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "执行运营动作失败。");
    } finally {
      setRunningActionId(null);
    }
  }

  useEffect(() => {
    void loadOps();
  }, [projectId]);

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-medium">连载运营与投稿发布看板</h2>
          <p className="mt-1 text-sm text-slate-600">汇总今日该审、该改、可发、可投的动作，避免生产完却卡在发布前。</p>
        </div>
        <button
          className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          disabled={isLoading}
          onClick={loadOps}
          type="button"
        >
          {isLoading ? "读取中" : "刷新运营看板"}
        </button>
      </div>

      {dashboard ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-5">
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">目标平台</div>
            <div className="mt-1 text-sm font-medium text-slate-950">{dashboard.platformName}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">日更建议</div>
            <div className="mt-1 text-2xl font-semibold text-slate-950">{dashboard.dailyWordTarget}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">可发布</div>
            <div className="mt-1 text-2xl font-semibold text-slate-950">{dashboard.publishReadyCount}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">待审/待改</div>
            <div className="mt-1 text-2xl font-semibold text-slate-950">{dashboard.reviewQueueCount}/{dashboard.revisionQueueCount}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">投稿准备</div>
            <div className="mt-1 text-2xl font-semibold text-slate-950">{dashboard.submissionReadinessPercent}%</div>
          </div>
        </div>
      ) : null}

      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}

      {dashboard ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-md border border-slate-200 p-3">
            <div className="font-medium text-slate-950">今日动作</div>
            <div className="mt-3 grid gap-2">
              {dashboard.actions.map((action) => (
                <div className="rounded-md bg-slate-50 p-3 text-sm" key={action.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-slate-950">{action.label}</span>
                    <span className="text-xs text-slate-500">{priorityLabel(action.priority)}</span>
                  </div>
                  <p className="mt-1 text-slate-600">{action.detail}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {action.execution ? (
                      <button
                        className="rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                        disabled={runningActionId === action.id}
                        onClick={() => void runAction(action)}
                        type="button"
                      >
                        {runningActionId === action.id ? "执行中" : action.execution.label}
                      </button>
                    ) : null}
                    {action.chapterId ? (
                      <Link className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50" href={`/projects/${projectId}/chapters/${action.chapterId}`}>
                        打开章节
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-slate-200 p-3">
            <div className="font-medium text-slate-950">运营风险</div>
            <div className="mt-3 grid gap-2 text-sm text-slate-600">
              {(dashboard.warnings.length ? dashboard.warnings : ["当前运营链路暂无明显风险。"]).map((warning) => (
                <div className="rounded-md bg-slate-50 p-2" key={warning}>{warning}</div>
              ))}
            </div>
            {dashboard.nextPublishChapter ? (
              <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm">
                <div className="text-xs text-slate-500">下一章可发布</div>
                <div className="mt-1 font-medium text-slate-950">
                  第 {dashboard.nextPublishChapter.order} 章 · {dashboard.nextPublishChapter.title}
                </div>
                <div className="mt-1 text-slate-600">{dashboard.nextPublishChapter.wordCount} 字 · {dashboard.nextPublishChapter.status}</div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {checklist ? (
        <div className="mt-4 rounded-md border border-slate-200 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="font-medium text-slate-950">投稿检查</div>
            <div className="text-sm text-slate-500">{checklist.readinessPercent}%</div>
          </div>
          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            {checklist.items.filter((item) => item.status !== "pass").map((item) => (
              <div className="rounded-md bg-slate-50 p-3 text-sm" key={item.id}>
                <div className="font-medium text-slate-950">{item.label}</div>
                <p className="mt-1 text-slate-600">{item.detail}</p>
              </div>
            ))}
            {checklist.items.every((item) => item.status === "pass") ? (
              <p className="text-sm text-slate-600">投稿检查全部通过。</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
