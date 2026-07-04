"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { buildFirstDayExecutionRouteBlockMessage, type FirstDayExecutionRouteStatus } from "@/lib/model-gateway/firstDayExecutionRoute";
import { buildFirstDayDispatchUpdateSummary, buildFirstDayExecutionRiskNotice, buildFirstDayReceiptCompletionAction, buildFirstDayStepView, completeFirstDayDispatchStep } from "@/lib/projects/firstDayWorkflowView";
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
  riskLevel: "standard" | "watch" | "blocked";
  riskLabel: string;
  riskPriorityBoost: number;
  riskDueLabel: string;
  headline: string;
  actionLabel: string;
  href: string;
  acceptanceCriteria: string[];
  missingEvidence: string[];
  handoffNote: string;
  modelPrompt: string;
  completionEvidenceTemplate: string;
  tacticFocus: {
    title: string;
    label: string;
    primaryTactic: string;
    openingMove: string;
    verificationMove: string;
    risk: string;
    acceptanceCriteria: string[];
    missingEvidence: string[];
  } | null;
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

interface FirstDayExecutionReceipt {
  success: boolean;
  summary: string;
  writeBackTarget: string;
  nextAction: string;
  completionEvidence: string;
  detailItems: string[];
}

interface FirstDayModelExecutionPlan {
  executable: boolean;
  taskType?: string;
  blockedReason?: string;
}

interface FirstDayContinuationAction {
  status: "first_day_active" | "ready" | "blocked" | "complete";
  headline: string;
  detail: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  queueCategory: "draft" | "review" | "second_pass" | "export" | "blocked" | null;
  itemCount: number;
  warnings: string[];
}

type FirstDayModelRouteStatus = FirstDayExecutionRouteStatus;
type FirstDayMessageAction = "execute_current_step";

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

function modelRouteStatusCopy(status: FirstDayModelRouteStatus["status"]) {
  if (status === "ready") return { label: "路线就绪", className: "bg-emerald-50 text-emerald-700" };
  if (status === "mock_fallback") return { label: "Mock 兜底", className: "bg-sky-50 text-sky-700" };
  if (status === "manual") return { label: "人工节点", className: "bg-slate-100 text-slate-600" };
  return { label: "缺路线", className: "bg-amber-50 text-amber-700" };
}

function modelSettingsRepairHref(route: FirstDayModelRouteStatus, projectId: string) {
  const params = new URLSearchParams({ focus: "first-day-route", projectId });
  if (route.taskType) params.set("taskType", route.taskType);
  return `/settings/models?${params.toString()}`;
}

function refreshedRouteNotice(route: FirstDayModelRouteStatus): { message: string; action?: FirstDayMessageAction } {
  const blockMessage = buildFirstDayExecutionRouteBlockMessage(route);
  if (!blockMessage) {
    return {
      message: `已刷新首日模型路线：${route.taskLabel}路线就绪，可以继续执行当前节点。`,
      action: "execute_current_step",
    };
  }
  return { message: `已刷新首日模型路线：${blockMessage}` };
}

function continuationTone(status: FirstDayContinuationAction["status"]) {
  if (status === "ready") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "blocked") return "border-amber-200 bg-amber-50 text-amber-900";
  if (status === "complete") return "border-slate-200 bg-slate-50 text-slate-900";
  return "border-blue-200 bg-blue-50 text-blue-900";
}

function continuationStatusLabel(status: FirstDayContinuationAction["status"]) {
  if (status === "ready") return "可进入连续生产";
  if (status === "blocked") return "先处理阻塞";
  if (status === "complete") return "已收口";
  return "首日未完成";
}

function riskNoticeTone(level: "standard" | "watch" | "blocked") {
  if (level === "blocked") return "border-rose-200 bg-rose-50 text-rose-950";
  if (level === "watch") return "border-amber-200 bg-amber-50 text-amber-950";
  return "border-slate-200 bg-slate-50 text-slate-900";
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
  const searchParams = useSearchParams();
  const routeRepairReturn = searchParams.get("firstDayRoute") === "repaired";
  const createdLaunch = searchParams.get("firstDayLaunch") === "1";
  const [workflow, setWorkflow] = useState<FirstDayWorkflow | null>(null);
  const [dispatch, setDispatch] = useState<GatePlatformGrowthDispatchItem | null>(null);
  const [executionPlan, setExecutionPlan] = useState<FirstDayModelExecutionPlan | null>(null);
  const [modelRoute, setModelRoute] = useState<FirstDayModelRouteStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [isExecutingAi, setIsExecutingAi] = useState(false);
  const [isCompletingDispatch, setIsCompletingDispatch] = useState(false);
  const [completionEvidence, setCompletionEvidence] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [messageAction, setMessageAction] = useState<FirstDayMessageAction | null>(null);
  const [executionReceipt, setExecutionReceipt] = useState<FirstDayExecutionReceipt | null>(null);
  const [continuation, setContinuation] = useState<FirstDayContinuationAction | null>(null);

  function showMessage(nextMessage: string | null, action?: FirstDayMessageAction) {
    setMessage(nextMessage);
    setMessageAction(action ?? null);
  }

  async function loadWorkflow(options?: { fromRouteRepair?: boolean }) {
    setIsLoading(true);
    showMessage(null);
    setExecutionReceipt(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/first-day-workflow`);
      if (!response.ok) {
        throw new Error("读取首日工作流失败。");
      }
      const payload = (await response.json()) as {
        workflow: FirstDayWorkflow;
        dispatch: GatePlatformGrowthDispatchItem;
        executionPlan: FirstDayModelExecutionPlan;
        modelRoute: FirstDayModelRouteStatus;
        continuation: FirstDayContinuationAction;
      };
      setWorkflow(payload.workflow);
      setDispatch(payload.dispatch);
      setExecutionPlan(payload.executionPlan);
      setModelRoute(payload.modelRoute);
      setContinuation(payload.continuation);
      if (options?.fromRouteRepair) {
        const notice = refreshedRouteNotice(payload.modelRoute);
        showMessage(notice.message, notice.action);
      } else if (createdLaunch) {
        showMessage(
          `作品已创建，首日派单已自动进入任务中心：${payload.workflow.nextStep.label}。`,
          payload.workflow.nextStep.owner === "AI" ? "execute_current_step" : undefined,
        );
      }
    } catch (caught) {
      showMessage(caught instanceof Error ? caught.message : "读取首日工作流失败。");
    } finally {
      setIsLoading(false);
    }
  }

  async function assignFirstDayDispatch() {
    if (!dispatch) return;
    setIsDispatching(true);
    showMessage(null);
    setExecutionReceipt(null);
    try {
      const task = await persistGateDispatchTask(dispatch);
      showMessage(`已派到任务中心：${task.title}`);
    } catch (caught) {
      showMessage(caught instanceof Error ? caught.message : "首日任务派单失败。");
    } finally {
      setIsDispatching(false);
    }
  }

  async function executeCurrentStepWithAi() {
    if (!workflow) return;
    if (executionPlan && !executionPlan.executable) {
      showMessage(executionPlan.blockedReason ?? "当前首日节点暂不支持自动执行。");
      return;
    }
    if (modelRoute) {
      const routeBlockMessage = buildFirstDayExecutionRouteBlockMessage(modelRoute);
      if (routeBlockMessage) {
        showMessage(routeBlockMessage);
        return;
      }
    }
    setIsExecutingAi(true);
    showMessage(null);
    setExecutionReceipt(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/first-day-workflow`, {
        method: "POST",
      });
      const payload = (await response.json()) as {
        workflow?: FirstDayWorkflow;
        dispatch?: GatePlatformGrowthDispatchItem;
        executionPlan?: FirstDayModelExecutionPlan;
        modelRoute?: FirstDayModelRouteStatus;
        continuation?: FirstDayContinuationAction;
        executionReceipt?: FirstDayExecutionReceipt;
        completionEvidence?: string;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "首日 AI 执行失败。");
      }
      if (payload.workflow) setWorkflow(payload.workflow);
      if (payload.dispatch) setDispatch(payload.dispatch);
      if (payload.executionPlan) setExecutionPlan(payload.executionPlan);
      if (payload.modelRoute) setModelRoute(payload.modelRoute);
      if (payload.continuation) setContinuation(payload.continuation);
      if (payload.executionReceipt) setExecutionReceipt(payload.executionReceipt);
      if (payload.completionEvidence) setCompletionEvidence(payload.completionEvidence);
      showMessage(payload.executionReceipt?.summary ?? `AI 已执行当前节点：${workflow.nextStep.label}。请检查结果后完成派单验收。`);
    } catch (caught) {
      showMessage(caught instanceof Error ? caught.message : "首日 AI 执行失败。");
    } finally {
      setIsExecutingAi(false);
    }
  }

  async function completeCurrentDispatch() {
    if (!workflow || !dispatch) return;
    setIsCompletingDispatch(true);
    showMessage(null);
    setExecutionReceipt(null);
    try {
      await persistGateDispatchTask(dispatch);
      const result = await completeFirstDayDispatchStep(projectId, workflow.executionPackage.stepId, completionEvidence, {
        dueLabel: dispatch.dueLabel,
        title: dispatch.title,
        acceptanceCriteria: dispatch.acceptanceCriteria,
        evidence: dispatch.evidence,
      });
      setCompletionEvidence("");
      await loadWorkflow();
      const updateSummary = buildFirstDayDispatchUpdateSummary(result);
      showMessage(updateSummary.visible ? `${updateSummary.title}：${updateSummary.detail}` : `已完成当前派单：${result.task.title}`);
    } catch (caught) {
      showMessage(caught instanceof Error ? caught.message : "首日派单验收失败。");
    } finally {
      setIsCompletingDispatch(false);
    }
  }

  useEffect(() => {
    void loadWorkflow({ fromRouteRepair: routeRepairReturn });
  }, [projectId, routeRepairReturn, createdLaunch]);

  const routeBlockMessage = modelRoute ? buildFirstDayExecutionRouteBlockMessage(modelRoute) : null;
  const executionBlockMessage = executionPlan && !executionPlan.executable
    ? executionPlan.blockedReason ?? "当前首日节点暂不支持自动执行。"
    : null;
  const aiBlockMessage = executionBlockMessage ?? routeBlockMessage;
  const receiptTone = executionReceipt?.success
    ? {
      panel: "border-emerald-100 bg-emerald-50 text-emerald-900",
      label: "text-emerald-700",
      body: "text-emerald-800",
    }
    : {
      panel: "border-amber-100 bg-amber-50 text-amber-900",
      label: "text-amber-700",
      body: "text-amber-800",
    };
  const receiptCompletionAction = buildFirstDayReceiptCompletionAction({
    receipt: executionReceipt,
    completionEvidence,
    hasDispatch: Boolean(dispatch),
    isCompleting: isCompletingDispatch,
  });
  const riskNotice = workflow ? buildFirstDayExecutionRiskNotice({
    riskLevel: workflow.executionPackage.riskLevel,
    riskLabel: workflow.executionPackage.riskLabel,
    riskPriorityBoost: workflow.executionPackage.riskPriorityBoost,
    riskDueLabel: workflow.executionPackage.riskDueLabel,
    owner: workflow.executionPackage.owner,
    acceptanceCriteria: workflow.executionPackage.acceptanceCriteria,
    missingEvidence: workflow.executionPackage.missingEvidence,
  }) : null;

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
          onClick={() => void loadWorkflow()}
          type="button"
        >
          {isLoading ? "读取中" : "刷新工作流"}
        </button>
      </div>

      {message ? (
        <div className="mt-3 flex flex-col gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <p>{message}</p>
          {messageAction === "execute_current_step" ? (
            <button
              className="w-fit rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              disabled={isExecutingAi || Boolean(aiBlockMessage)}
              onClick={executeCurrentStepWithAi}
              type="button"
            >
              {isExecutingAi ? "执行中" : "继续执行当前节点"}
            </button>
          ) : null}
        </div>
      ) : null}

      {continuation ? (
        <div className={`mt-3 rounded-md border px-3 py-3 text-sm ${continuationTone(continuation.status)}`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-xs font-medium opacity-75">{continuationStatusLabel(continuation.status)}</div>
              <div className="mt-1 font-medium">{continuation.headline}</div>
              <p className="mt-1 leading-6 opacity-90">{continuation.detail}</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Link className="w-fit rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white" href={continuation.primaryHref}>
                {continuation.primaryLabel}
              </Link>
              <Link className="w-fit rounded-md bg-white/80 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-white" href={continuation.secondaryHref}>
                {continuation.secondaryLabel}
              </Link>
            </div>
          </div>
          {continuation.warnings.length > 0 ? (
            <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
              {continuation.warnings.map((warning) => (
                <div className="rounded-md bg-white/70 px-2 py-1" key={warning}>{warning}</div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {executionReceipt ? (
        <div className={`mt-3 rounded-md border px-3 py-3 text-sm ${receiptTone.panel}`}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className={`text-xs font-medium ${receiptTone.label}`}>AI 执行回执</div>
              <p className="mt-1 leading-6">{executionReceipt.summary}</p>
            </div>
            <span className={`w-fit rounded-md bg-white px-2 py-1 text-xs font-medium ${receiptTone.label}`}>
              {executionReceipt.success ? "可验收" : "需处理"}
            </span>
          </div>
          <div className={`mt-2 grid gap-2 text-xs ${receiptTone.body} sm:grid-cols-2`}>
            <span className="rounded-md bg-white px-2 py-1">写回：{executionReceipt.writeBackTarget}</span>
            <span className="rounded-md bg-white px-2 py-1">下一步：{executionReceipt.nextAction}</span>
          </div>
          {executionReceipt.detailItems.length > 0 ? (
            <ul className={`mt-2 grid gap-1 text-xs leading-5 ${receiptTone.body}`}>
              {executionReceipt.detailItems.map((item) => (
                <li key={item}>· {item}</li>
              ))}
            </ul>
          ) : null}
          {receiptCompletionAction.visible ? (
            <div className="mt-3 flex flex-col gap-2 border-t border-white/70 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <span className={`text-xs ${receiptTone.body}`}>{receiptCompletionAction.reason}</span>
              <button
                className="w-fit rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                disabled={!receiptCompletionAction.canComplete}
                onClick={completeCurrentDispatch}
                type="button"
              >
                {receiptCompletionAction.label}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

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
            {riskNotice?.visible ? (
              <div className={`mt-4 rounded-md border px-3 py-3 text-sm ${riskNoticeTone(riskNotice.level)}`}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="text-xs font-medium opacity-75">{riskNotice.label}</div>
                    <div className="mt-1 font-semibold">{riskNotice.headline}</div>
                    <p className="mt-1 leading-6 opacity-90">{riskNotice.detail}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {riskNotice.badges.map((badge) => (
                      <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-medium" key={badge}>{badge}</span>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
            {workflow.executionPackage.tacticFocus ? (
              <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="text-xs font-medium text-slate-500">开书打法约束</div>
                    <div className="mt-1 font-semibold text-slate-950">{workflow.executionPackage.tacticFocus.title}</div>
                    <p className="mt-1 leading-6 text-slate-600">{workflow.executionPackage.tacticFocus.primaryTactic}</p>
                  </div>
                  <span className="w-fit rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-700">
                    {workflow.executionPackage.tacticFocus.label}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-slate-600 md:grid-cols-3">
                  {workflow.executionPackage.tacticFocus.openingMove ? (
                    <div className="rounded-md bg-white px-2 py-2 leading-5">开头：{workflow.executionPackage.tacticFocus.openingMove}</div>
                  ) : null}
                  {workflow.executionPackage.tacticFocus.verificationMove ? (
                    <div className="rounded-md bg-white px-2 py-2 leading-5">验证：{workflow.executionPackage.tacticFocus.verificationMove}</div>
                  ) : null}
                  {workflow.executionPackage.tacticFocus.risk ? (
                    <div className="rounded-md bg-white px-2 py-2 leading-5">风险：{workflow.executionPackage.tacticFocus.risk}</div>
                  ) : null}
                </div>
              </div>
            ) : null}
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
            <div className="mt-4 rounded-md border border-slate-200 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs font-medium text-slate-500">AI 执行草稿</div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">可以直接让平台执行；也可以复制给 Claude、DeepSeek、Kimi、GPT 或其他模型手动执行。</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="w-fit rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                    disabled={isExecutingAi}
                    onClick={executeCurrentStepWithAi}
                    type="button"
                  >
                    {isExecutingAi ? "AI 执行中" : aiBlockMessage ? "查看阻断原因" : "AI 执行当前节点"}
                  </button>
                  <button
                    className="w-fit rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50"
                    onClick={() => setCompletionEvidence(workflow.executionPackage.completionEvidenceTemplate)}
                    type="button"
                  >
                    套用验收模板
                  </button>
                </div>
              </div>
              {modelRoute ? (
                <div className="mt-3 rounded-md bg-white p-3 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-medium text-slate-500">当前模型路线</div>
                      <div className="mt-1 font-medium text-slate-950">{modelRoute.taskLabel}</div>
                    </div>
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${modelRouteStatusCopy(modelRoute.status).className}`}>
                      {modelRouteStatusCopy(modelRoute.status).label}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                    <span className="rounded-md bg-slate-50 px-2 py-1">首选 {modelRoute.primaryProviderName}</span>
                    <span className="rounded-md bg-slate-50 px-2 py-1">备用 {modelRoute.fallbackProviderName}</span>
                  </div>
                  <p className="mt-2 leading-6 text-slate-600">{modelRoute.detail}</p>
                  {aiBlockMessage ? (
                    <div className="mt-3 flex flex-col gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 sm:flex-row sm:items-center sm:justify-between">
                      <span>{aiBlockMessage}</span>
                      {executionBlockMessage ? null : (
                        <Link className="font-medium text-amber-900 underline underline-offset-2" href={modelSettingsRepairHref(modelRoute, projectId)}>
                          去配置
                        </Link>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <textarea
                className="mt-3 min-h-56 w-full resize-y rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700 outline-none"
                readOnly
                value={workflow.executionPackage.modelPrompt}
              />
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
