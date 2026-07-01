"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface ControlArea {
  id: string;
  label: string;
  score: number;
  status: "good" | "watch" | "blocked";
  evidence: string;
  nextAction: string;
  actionLabel: string;
  targetAnchor: string;
  canExecute: boolean;
  executeLabel: string;
}

interface ControlPriorityAction {
  id: string;
  areaId: string;
  label: string;
  score: number;
  severity: "high" | "medium" | "low";
  reason: string;
  actionLabel: string;
  targetAnchor: string;
  canExecute: boolean;
  executeLabel: string;
}

interface ProjectControlDashboard {
  overallScore: number;
  verdict: string;
  areas: ControlArea[];
  priorityActions: ControlPriorityAction[];
  criticalActions: string[];
  metrics: {
    chapters: number;
    words: number;
    outlineNodes: number;
    characters: number;
    worldEntries: number;
    publishableChapters: number;
  };
}

function statusLabel(status: ControlArea["status"]) {
  if (status === "good") return "稳";
  if (status === "watch") return "盯";
  return "卡";
}

function severityLabel(severity: ControlPriorityAction["severity"]) {
  if (severity === "high") return "高优先级";
  if (severity === "medium") return "中优先级";
  return "可优化";
}

export function ProjectControlDashboardPanel({ projectId }: { projectId: string }) {
  const [dashboard, setDashboard] = useState<ProjectControlDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [runningActionId, setRunningActionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadDashboard() {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/control-dashboard`);
      if (!response.ok) {
        throw new Error("读取项目总控失败。");
      }
      const payload = (await response.json()) as { dashboard: ProjectControlDashboard };
      setDashboard(payload.dashboard);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "读取项目总控失败。");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, [projectId]);

  async function executeAction(action: ControlPriorityAction) {
    setRunningActionId(action.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/control-actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ areaId: action.areaId }),
      });
      const payload = await response.json() as { message?: string; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "执行总控动作失败。");
      }
      await loadDashboard();
      setMessage(payload.message ?? "动作已完成。");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "执行总控动作失败。");
    } finally {
      setRunningActionId(null);
    }
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-medium">项目总控健康仪表盘</h2>
          <p className="mt-1 text-sm text-slate-600">把大纲、人物、设定、生产、审稿、二改、运营和发布汇总成一个全局优先级。</p>
        </div>
        <button
          className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          disabled={isLoading}
          onClick={loadDashboard}
          type="button"
        >
          {isLoading ? "读取中" : "刷新总控"}
        </button>
      </div>

      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}

      {dashboard ? (
        <div className="mt-4 grid gap-4">
          <div className="grid gap-3 lg:grid-cols-[220px_1fr]">
            <div className="rounded-md bg-slate-50 p-4">
              <div className="text-xs text-slate-500">全局健康分</div>
              <div className="mt-1 text-4xl font-semibold text-slate-950">{dashboard.overallScore}</div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{dashboard.verdict}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-slate-500">章节</div>
                <div className="mt-1 text-2xl font-semibold text-slate-950">{dashboard.metrics.chapters}</div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-slate-500">字数</div>
                <div className="mt-1 text-2xl font-semibold text-slate-950">{dashboard.metrics.words}</div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-slate-500">大纲</div>
                <div className="mt-1 text-2xl font-semibold text-slate-950">{dashboard.metrics.outlineNodes}</div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-slate-500">人物</div>
                <div className="mt-1 text-2xl font-semibold text-slate-950">{dashboard.metrics.characters}</div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-slate-500">设定</div>
                <div className="mt-1 text-2xl font-semibold text-slate-950">{dashboard.metrics.worldEntries}</div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-slate-500">可导出</div>
                <div className="mt-1 text-2xl font-semibold text-slate-950">{dashboard.metrics.publishableChapters}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
            <div className="rounded-md border border-slate-200 p-3">
              <div className="font-medium text-slate-950">优先动作</div>
              <div className="mt-3 grid gap-2 text-sm text-slate-600">
                {dashboard.priorityActions?.length ? dashboard.priorityActions.map((action, index) => (
                  <div className="rounded-md bg-slate-50 p-3" key={action.id}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-xs text-slate-500">{index + 1} · {severityLabel(action.severity)} · {action.score}</div>
                        <div className="mt-1 font-medium text-slate-950">{action.label}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {action.canExecute ? (
                          <button
                            className="inline-flex w-fit items-center justify-center rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                            disabled={Boolean(runningActionId)}
                            onClick={() => executeAction(action)}
                            type="button"
                          >
                            {runningActionId === action.id ? "执行中" : action.executeLabel}
                          </button>
                        ) : null}
                        <Link
                          className="inline-flex w-fit items-center justify-center rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-white"
                          href={`/projects/${projectId}#${action.targetAnchor}`}
                        >
                          {action.actionLabel}
                        </Link>
                      </div>
                    </div>
                    <p className="mt-2 leading-6 text-slate-600">{action.reason}</p>
                  </div>
                )) : dashboard.criticalActions.map((action, index) => (
                  <div className="rounded-md bg-slate-50 p-2" key={action}>{index + 1}. {action}</div>
                ))}
              </div>
            </div>
            <div className="rounded-md border border-slate-200 p-3">
              <div className="font-medium text-slate-950">模块健康</div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {dashboard.areas.map((area) => (
                  <div className="rounded-md bg-slate-50 p-3 text-sm" key={area.id}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-slate-950">{area.label}</div>
                      <div className="text-xs text-slate-500">{statusLabel(area.status)} · {area.score}</div>
                    </div>
                    <p className="mt-1 text-slate-600">{area.evidence}</p>
                    <p className="mt-1 text-slate-500">{area.nextAction}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
