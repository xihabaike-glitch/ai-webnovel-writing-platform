"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface FirstDayWorkflowStep {
  id: string;
  label: string;
  status: "done" | "active" | "locked";
  owner: "策划" | "作者" | "AI" | "运营";
  evidence: string;
  instruction: string;
  actionLabel: string;
  href: string;
}

interface FirstDayWorkflow {
  title: string;
  platformName: string;
  completedCount: number;
  totalSteps: number;
  progressPercent: number;
  verdict: string;
  nextStep: FirstDayWorkflowStep;
  steps: FirstDayWorkflowStep[];
}

function statusLabel(status: FirstDayWorkflowStep["status"]) {
  if (status === "done") return "完成";
  if (status === "active") return "当前";
  return "等待";
}

function statusClass(status: FirstDayWorkflowStep["status"]) {
  if (status === "done") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "active") return "border-slate-950 bg-slate-950 text-white";
  return "border-slate-200 bg-slate-50 text-slate-500";
}

export function FirstDayWorkflowPanel({ projectId }: { projectId: string }) {
  const [workflow, setWorkflow] = useState<FirstDayWorkflow | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadWorkflow() {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/first-day-workflow`);
      if (!response.ok) {
        throw new Error("读取首日工作流失败。");
      }
      const payload = (await response.json()) as { workflow: FirstDayWorkflow };
      setWorkflow(payload.workflow);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "读取首日工作流失败。");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadWorkflow();
  }, [projectId]);

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-medium">首日工作流</h2>
          <p className="mt-1 text-sm text-slate-600">把新书从模板骨架推到第一章可审、可改、可投放的顺序任务板。</p>
        </div>
        <button
          className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          disabled={isLoading}
          onClick={loadWorkflow}
          type="button"
        >
          {isLoading ? "读取中" : "刷新工作流"}
        </button>
      </div>

      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}

      {workflow ? (
        <div className="mt-4 grid gap-4">
          <div className="grid gap-3 lg:grid-cols-[220px_1fr]">
            <div className="rounded-md bg-slate-50 p-4">
              <div className="text-xs text-slate-500">{workflow.platformName}</div>
              <div className="mt-1 text-4xl font-semibold text-slate-950">{workflow.progressPercent}%</div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{workflow.verdict}</p>
            </div>
            <div className="rounded-md border border-slate-200 p-4">
              <div className="text-sm text-slate-500">当前动作</div>
              <div className="mt-1 text-xl font-semibold text-slate-950">{workflow.nextStep.label}</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{workflow.nextStep.instruction}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                <Link className="rounded-md bg-slate-950 px-3 py-2 font-medium text-white" href={workflow.nextStep.href}>
                  {workflow.nextStep.actionLabel}
                </Link>
                <span className="text-slate-500">
                  {workflow.completedCount}/{workflow.totalSteps} 完成
                </span>
              </div>
            </div>
          </div>

          <div className="h-2 overflow-hidden rounded bg-slate-100">
            <div className="h-full bg-slate-950" style={{ width: `${workflow.progressPercent}%` }} />
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {workflow.steps.map((step, index) => (
              <div className="rounded-md border border-slate-200 p-3 text-sm" key={step.id}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs text-slate-500">第 {index + 1} 步 · {step.owner}</div>
                    <div className="mt-1 font-medium text-slate-950">{step.label}</div>
                  </div>
                  <span className={`shrink-0 rounded-md border px-2 py-1 text-xs ${statusClass(step.status)}`}>
                    {statusLabel(step.status)}
                  </span>
                </div>
                <p className="mt-2 leading-6 text-slate-600">{step.evidence}</p>
                <p className="mt-1 leading-6 text-slate-500">{step.instruction}</p>
                <Link className="mt-2 inline-block font-medium text-slate-950" href={step.href}>
                  {step.actionLabel}
                </Link>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
