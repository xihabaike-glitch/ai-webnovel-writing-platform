"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buildFirstDayStepView, completeFirstDayDispatchStep } from "@/lib/projects/firstDayWorkflowView";
import { persistGateDispatchTask, type GatePlatformGrowthDispatchItem } from "@/lib/projects/gateActionReceipts";

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

interface FirstDayExecutionPackage {
  stepId: string;
  owner: FirstDayWorkflowStep["owner"];
  headline: string;
  actionLabel: string;
  href: string;
  acceptanceCriteria: string[];
  missingEvidence: string[];
  handoffNote: string;
}

interface FirstDayWorkflow {
  title: string;
  platformName: string;
  completedCount: number;
  totalSteps: number;
  progressPercent: number;
  verdict: string;
  nextStep: FirstDayWorkflowStep;
  executionPackage: FirstDayExecutionPackage;
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

function FirstDayStepCard({ step, index }: { step: FirstDayWorkflowStep; index: number }) {
  const view = buildFirstDayStepView(step);

  return (
    <div className="rounded-md border border-slate-200 p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs text-slate-500">第 {index + 1} 步 · {view.owner}</div>
          <div className="mt-1 font-medium text-slate-950">{view.label}</div>
        </div>
        <span className={`shrink-0 rounded-md border px-2 py-1 text-xs ${statusClass(view.status)}`}>
          {statusLabel(view.status)}
        </span>
      </div>
      <p className="mt-2 leading-6 text-slate-600">{view.primaryEvidence}</p>
      {view.hasTaskAcceptance ? (
        <div className="mt-2 border-l-2 border-emerald-400 pl-3 leading-6 text-emerald-800">
          <div className="text-xs font-medium text-emerald-700">{view.acceptanceLabel}</div>
          <p>{view.acceptanceEvidence}</p>
        </div>
      ) : null}
      <p className="mt-1 leading-6 text-slate-500">{view.instruction}</p>
      <Link className="mt-2 inline-block font-medium text-slate-950" href={view.href}>
        {view.actionLabel}
      </Link>
    </div>
  );
}

export function FirstDayWorkflowPanel({ projectId }: { projectId: string }) {
  const [workflow, setWorkflow] = useState<FirstDayWorkflow | null>(null);
  const [dispatch, setDispatch] = useState<GatePlatformGrowthDispatchItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [isCompletingDispatch, setIsCompletingDispatch] = useState(false);
  const [completionEvidence, setCompletionEvidence] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function loadWorkflow() {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/first-day-workflow`);
      if (!response.ok) {
        throw new Error("读取首日工作流失败。");
      }
      const payload = (await response.json()) as { workflow: FirstDayWorkflow; dispatch: GatePlatformGrowthDispatchItem };
      setWorkflow(payload.workflow);
      setDispatch(payload.dispatch);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "读取首日工作流失败。");
    } finally {
      setIsLoading(false);
    }
  }

  async function assignFirstDayDispatch() {
    if (!dispatch) return;
    setIsDispatching(true);
    setMessage(null);
    try {
      const task = await persistGateDispatchTask(dispatch);
      setMessage(`已派到任务中心：${task.title}`);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "首日任务派单失败。");
    } finally {
      setIsDispatching(false);
    }
  }

  async function completeCurrentDispatch() {
    if (!workflow || !dispatch) return;
    setIsCompletingDispatch(true);
    setMessage(null);
    try {
      await persistGateDispatchTask(dispatch);
      const result = await completeFirstDayDispatchStep(projectId, workflow.executionPackage.stepId, completionEvidence);
      setCompletionEvidence("");
      await loadWorkflow();
      setMessage(`已完成当前派单：${result.task.title}`);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "首日派单验收失败。");
    } finally {
      setIsCompletingDispatch(false);
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

          <div className="rounded-md border border-slate-200 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-xs font-medium text-slate-500">下一步执行包 · {workflow.executionPackage.owner}</div>
                <h3 className="mt-1 text-base font-semibold text-slate-950">{workflow.executionPackage.headline}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{workflow.executionPackage.handoffNote}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="w-fit rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                  disabled={isDispatching || !dispatch}
                  onClick={assignFirstDayDispatch}
                  type="button"
                >
                  {isDispatching ? "派单中" : "派到任务中心"}
                </button>
                <Link className="w-fit rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50" href={workflow.executionPackage.href}>
                  {workflow.executionPackage.actionLabel}
                </Link>
                <Link className="w-fit rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50" href="/dispatch">
                  打开任务中心
                </Link>
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-xs font-medium text-slate-500">验收标准</div>
                <ul className="mt-2 grid gap-2 text-sm leading-6 text-slate-600">
                  {workflow.executionPackage.acceptanceCriteria.map((criterion) => (
                    <li className="rounded-md bg-emerald-50 px-3 py-2 text-emerald-800" key={criterion}>{criterion}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">缺失证据</div>
                <ul className="mt-2 grid gap-2 text-sm leading-6 text-slate-600">
                  {workflow.executionPackage.missingEvidence.map((evidence) => (
                    <li className="rounded-md bg-amber-50 px-3 py-2 text-amber-800" key={evidence}>{evidence}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
              <label className="text-xs font-medium text-slate-500" htmlFor={`first-day-completion-${projectId}`}>
                当前派单验收依据
              </label>
              <textarea
                className="mt-2 min-h-24 w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-slate-400"
                disabled={isCompletingDispatch}
                id={`first-day-completion-${projectId}`}
                onChange={(event) => setCompletionEvidence(event.target.value)}
                placeholder="写清楚已经完成了什么，例如：第一章正文已生成并写回章节，钩子、冲突和章末追读已按验收标准检查。"
                value={completionEvidence}
              />
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <button
                  className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                  disabled={isCompletingDispatch || !dispatch || completionEvidence.trim().length < 8}
                  onClick={completeCurrentDispatch}
                  type="button"
                >
                  {isCompletingDispatch ? "验收中" : "完成当前派单"}
                </button>
                <span className="text-xs text-slate-500">至少 8 个字，完成后会刷新首日工作流。</span>
              </div>
            </div>
          </div>

          <div className="h-2 overflow-hidden rounded bg-slate-100">
            <div className="h-full bg-slate-950" style={{ width: `${workflow.progressPercent}%` }} />
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {workflow.steps.map((step, index) => (
              <FirstDayStepCard index={index} key={step.id} step={step} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
