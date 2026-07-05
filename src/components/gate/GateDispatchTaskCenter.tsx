"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  buildGateDispatchEvidenceReview,
  buildGateDispatchCompletionTemplate,
  buildGateDispatchTaskCenter,
  filterGateDispatchTasks,
  isChapterProductionRecheckFollowUpTask,
  persistGateDispatchTask,
  reviewGateDispatchCompletionEvidence,
  updatePersistedGateDispatchTaskState,
  type GateActionReceipt,
  type GateDispatchEvidenceReviewStatus,
  type GateDispatchRecheckFollowUpChain,
  type GateDispatchTaskStateFilter,
  type GateDispatchTaskCloseoutStatus,
  type GatePlatformGrowthDispatchState,
  type PersistedGatePlatformDispatchTask,
} from "@/lib/projects/gateActionReceipts";
import {
  buildFirstDayDispatchCompletionTemplate,
  buildFirstDayDispatchDesk,
  buildFirstDayDispatchCompletionHint,
  buildFirstDayDispatchAiExecutionNotice,
  buildFirstDayDispatchCenterHref,
  buildFirstDayDispatchUpdateSummary,
  buildFirstDayPostDispatchCompletionPrompt,
  buildFirstDayReturnToAcceptanceHref,
  resolveFirstDayDispatchFocus,
  type FirstDayDispatchFocusInput,
} from "@/lib/projects/firstDayWorkflowView";
import type { WatchSampleCompletionEvidenceSuggestion } from "@/lib/projects/watchSampleCompletionEvidence";
import {
  buildRouteDispatchCompletionTemplate,
  buildRouteRecheckExecutionDesk,
  filterRouteConfirmationDispatchTasks,
  parseRouteDispatchCompletionEvidence,
  reviewRouteDispatchCompletionEvidence,
  type RouteConfirmationDispatchFlow,
  type RouteConfirmationDispatchFlowLaneId,
  type RouteConfirmationDispatchTaskFilter,
  type RouteDispatchCompletionRecord,
} from "@/lib/model-gateway/routeConfirmation";

function stateClass(state: GatePlatformGrowthDispatchState) {
  if (state === "queued") return "bg-amber-50 text-amber-700";
  if (state === "assigned") return "bg-emerald-50 text-emerald-700";
  return "bg-slate-100 text-slate-600";
}

function stateLabel(state: GatePlatformGrowthDispatchState) {
  if (state === "queued") return "待派";
  if (state === "assigned") return "已派";
  return "完成";
}

function closeoutClass(status: GateDispatchTaskCloseoutStatus) {
  if (status === "overdue") return "border-rose-200 bg-rose-50 text-rose-800";
  if (status === "today") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "done") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function recheckAdviceClass(tone: "amber" | "rose" | "sky") {
  if (tone === "rose") return "border-rose-200 bg-rose-50 text-rose-900";
  if (tone === "sky") return "border-sky-200 bg-sky-50 text-sky-900";
  return "border-amber-200 bg-amber-50 text-amber-900";
}

function recheckInterventionClass(status: NonNullable<GateDispatchRecheckFollowUpChain["reviewIntervention"]>["status"]) {
  if (status === "stopped") return "border-rose-200 bg-rose-50 text-rose-900";
  if (status === "continue_rework") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-sky-200 bg-sky-50 text-sky-900";
}

function evidenceClass(status: GateDispatchEvidenceReviewStatus) {
  if (status === "missing_evidence") return "border-rose-200 bg-rose-50 text-rose-800";
  if (status === "needs_receipt") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "verified") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function actionLabel(state: GatePlatformGrowthDispatchState) {
  if (state === "queued") return "接单";
  if (state === "assigned") return "标记完成";
  return "重新打开";
}

function nextState(state: GatePlatformGrowthDispatchState): GatePlatformGrowthDispatchState {
  if (state === "queued") return "assigned";
  if (state === "assigned") return "completed";
  return "assigned";
}

function routeFlowLaneClass(laneId: RouteConfirmationDispatchFlowLaneId) {
  if (laneId === "needs_governance") return "border-amber-200 bg-amber-50 text-amber-900";
  if (laneId === "waiting_recheck") return "border-sky-200 bg-sky-50 text-sky-900";
  if (laneId === "confirmed") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  return "border-slate-200 bg-slate-50 text-slate-800";
}

function routeTrailClass(status: RouteConfirmationDispatchFlow["trails"][number]["status"]) {
  if (status === "confirmed") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "needs_governance") return "border-amber-200 bg-amber-50 text-amber-900";
  if (status === "manual_review") return "border-rose-200 bg-rose-50 text-rose-900";
  return "border-sky-200 bg-sky-50 text-sky-900";
}

function routeTrailStatusLabel(status: RouteConfirmationDispatchFlow["trails"][number]["status"]) {
  if (status === "confirmed") return "已确认";
  if (status === "needs_governance") return "继续治理";
  if (status === "manual_review") return "人工复核";
  return "处理中";
}

function routeDeskStageClass(stageLabel: "复检" | "治理") {
  if (stageLabel === "治理") return "bg-amber-50 text-amber-800";
  return "bg-sky-50 text-sky-800";
}

function routeFlowFilterFromLane(laneId: RouteConfirmationDispatchFlowLaneId): RouteConfirmationDispatchTaskFilter | null {
  if (laneId === "confirmed") return null;
  return laneId;
}

export type DispatchQueueFilter = "all" | "recheck_followup" | "ai_pipeline";

interface RouteActionExecution {
  kind?: "route_action" | "first_day_ai";
  method: "POST";
  endpoint: string;
  dispatchKey?: string;
  body?: {
    areaId: string;
  };
}

interface RouteActionLink {
  label: string;
  href: string;
  execution?: RouteActionExecution;
  secondary?: {
    label: string;
    href: string;
  };
}

function isAiPipelineExecutableTask(task: PersistedGatePlatformDispatchTask) {
  return task.platformId === "ai-pipeline"
    && (task.stage === "ai_pipeline_sample_recheck" || task.stage === "ai_pipeline_small_batch")
    && task.state !== "completed";
}

function routeCompletionRecordChips(record: RouteDispatchCompletionRecord) {
  const chips: string[] = [];
  if (record.sampleCount !== null) chips.push(`样本 ${record.sampleCount}`);
  if (record.successRatePercent !== null) chips.push(`成功率 ${record.successRatePercent}%`);
  if (record.qualityScore !== null) chips.push(`质量 ${record.qualityScore}`);
  if (record.cost) chips.push(`成本 ${record.cost}`);
  if (record.fallbackHit !== null) chips.push(record.fallbackHit ? "命中备用" : "未命中备用");
  if (record.needsGovernance !== null) chips.push(record.needsGovernance ? "需要治理" : "无需治理");
  if (record.governanceConclusion === "resolved") chips.push("治理完成");
  if (record.governanceConclusion === "watch") chips.push("继续观察");
  if (record.governanceConclusion === "needs_switch") chips.push("仍需换模型");
  if (record.primaryProviderName) chips.push(`首选 ${record.primaryProviderName}`);
  if (record.fallbackProviderName) chips.push(`备用 ${record.fallbackProviderName}`);
  return chips;
}

export function GateDispatchTaskCenter({
  initialFirstDayFocus,
  initialReceipts,
  initialTasks,
  initialCompletionSuggestions,
  routeConfirmationDispatchFlow,
  initialQueueFilter = "all",
}: {
  initialFirstDayFocus?: FirstDayDispatchFocusInput;
  initialReceipts: GateActionReceipt[];
  initialTasks: PersistedGatePlatformDispatchTask[];
  initialCompletionSuggestions: WatchSampleCompletionEvidenceSuggestion[];
  routeConfirmationDispatchFlow: RouteConfirmationDispatchFlow;
  initialQueueFilter?: DispatchQueueFilter;
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [stateFilter, setStateFilter] = useState<GateDispatchTaskStateFilter>("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [queueFilter, setQueueFilter] = useState<DispatchQueueFilter>(initialQueueFilter);
  const [routeFlowFilter, setRouteFlowFilter] = useState<RouteConfirmationDispatchTaskFilter>("all");
  const [runningKey, setRunningKey] = useState<string | null>(null);
  const [runningRouteAdviceId, setRunningRouteAdviceId] = useState<string | null>(null);
  const [runningRouteRecheckKey, setRunningRouteRecheckKey] = useState<string | null>(null);
  const [runningAiPipelineKey, setRunningAiPipelineKey] = useState<string | null>(null);
  const [runningRecheckAdviceKey, setRunningRecheckAdviceKey] = useState<string | null>(null);
  const [runningRouteActionLink, setRunningRouteActionLink] = useState(false);
  const [routeActionMessage, setRouteActionMessage] = useState("");
  const [routeActionLink, setRouteActionLink] = useState<RouteActionLink | null>(null);
  const [completionDrafts, setCompletionDrafts] = useState<Record<string, string>>({});
  const [focusedCompletionDispatchKey, setFocusedCompletionDispatchKey] = useState("");
  const [focusedCompletionMessage, setFocusedCompletionMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const center = useMemo(() => buildGateDispatchTaskCenter(tasks), [tasks]);
  const firstDayDesk = useMemo(() => buildFirstDayDispatchDesk(tasks), [tasks]);
  const firstDayFocus = useMemo(() => resolveFirstDayDispatchFocus(tasks, initialFirstDayFocus ?? {}), [
    initialFirstDayFocus,
    tasks,
  ]);
  const evidenceReview = useMemo(() => buildGateDispatchEvidenceReview(tasks, initialReceipts), [initialReceipts, tasks]);
  const routeExecutionDesk = useMemo(() => buildRouteRecheckExecutionDesk(tasks), [tasks]);
  const routeTaskByKey = useMemo(() => new Map(tasks.map((task) => [task.dispatchKey, task])), [tasks]);
  const aiPipelineTaskKeys = useMemo(() => (
    new Set(center.aiPipelineDispatches.map((task) => task.dispatchKey))
  ), [center.aiPipelineDispatches]);
  const completionSuggestionByKey = useMemo(() => (
    new Map(initialCompletionSuggestions.map((suggestion) => [suggestion.dispatchKey, suggestion]))
  ), [initialCompletionSuggestions]);
  const recheckChainByDispatchKey = useMemo(() => {
    const map = new Map<string, {
      rootDispatchKey: string;
      maxRound: number;
      active: number;
      total: number;
      round: number;
    }>();
    for (const chain of center.recheckFollowUpChains) {
      for (const round of chain.rounds) {
        map.set(round.dispatchKey, {
          rootDispatchKey: chain.rootDispatchKey,
          maxRound: chain.maxRound,
          active: chain.active,
          total: chain.total,
          round: round.round,
        });
      }
    }
    return map;
  }, [center.recheckFollowUpChains]);
  const evidenceIssues = evidenceReview.items.filter((item) => item.status !== "verified").slice(0, 5);
  const hasRouteFlow =
    Boolean(routeConfirmationDispatchFlow.emptyGuide)
    || routeConfirmationDispatchFlow.summary.confirmed > 0
    || routeConfirmationDispatchFlow.summary.dispatched > 0
    || routeConfirmationDispatchFlow.summary.completed > 0;
  const firstDayNextSuggestion = firstDayDesk.nextTask
    ? completionSuggestionByKey.get(firstDayDesk.nextTask.dispatchKey)
    : null;
  const focusedDispatchKey = firstDayFocus.card?.dispatchKey ?? "";
  const focusedTask = focusedDispatchKey ? routeTaskByKey.get(focusedDispatchKey) ?? null : null;
  const filteredTasks = useMemo(() => {
    const baseTasks = filterGateDispatchTasks(tasks, {
      state: stateFilter,
      platformId: platformFilter,
      ownerRole: roleFilter,
      recheckFollowUpOnly: queueFilter === "recheck_followup",
    });
    const queueFilteredTasks = queueFilter === "ai_pipeline"
      ? baseTasks.filter((task) => aiPipelineTaskKeys.has(task.dispatchKey))
      : baseTasks;
    return filterRouteConfirmationDispatchTasks(queueFilteredTasks, routeFlowFilter);
  }, [aiPipelineTaskKeys, platformFilter, queueFilter, roleFilter, routeFlowFilter, stateFilter, tasks]);

  function evidenceLoopRecheckMessage(updated: Awaited<ReturnType<typeof updatePersistedGateDispatchTaskState>>) {
    const recheck = updated.evidenceLoopRecheck;
    if (!recheck) return "";
    const scoreText = recheck.previousScore === null
      ? `复检 ${recheck.currentScore} 分`
      : `复检 ${recheck.previousScore} -> ${recheck.currentScore} 分`;
    const verdictText = recheck.verdict === "improved"
      ? "分数变好"
      : recheck.verdict === "declined"
        ? "分数变差"
        : recheck.verdict === "unchanged"
          ? "分数未变"
          : "无历史基准";
    return `证据闭环${scoreText}，${verdictText}：${recheck.label}`;
  }

  function storyTreeRecheckMessage(updated: Awaited<ReturnType<typeof updatePersistedGateDispatchTaskState>>) {
    const recheck = updated.storyTreeRecheck;
    if (!recheck) return "";
    const scoreText = recheck.previousScore === null
      ? `复检 ${recheck.currentScore} 分`
      : `复检 ${recheck.previousScore} -> ${recheck.currentScore} 分`;
    const verdictText = recheck.verdict === "improved"
      ? "结构变好"
      : recheck.verdict === "declined"
        ? "结构变差"
        : recheck.verdict === "unchanged"
          ? "结构持平"
          : "无历史基准";
    return `大树结构${scoreText}，${verdictText}：${recheck.label}`;
  }

  async function updateTask(task: PersistedGatePlatformDispatchTask) {
    const targetState = nextState(task.state);
    const completionEvidence = completionDrafts[task.dispatchKey]?.trim() ?? "";
    if (targetState === "completed" && completionEvidence.length < 8) {
      setErrorMessage("完成前请写清楚完成依据，至少 8 个字。");
      return;
    }
    const routeCompletionIssue = targetState === "completed"
      ? reviewRouteDispatchCompletionEvidence(task, completionEvidence)
      : null;
    if (routeCompletionIssue) {
      setErrorMessage(routeCompletionIssue);
      return;
    }
    const gateCompletionIssue = targetState === "completed"
      ? reviewGateDispatchCompletionEvidence(task, completionEvidence)
      : null;
    if (gateCompletionIssue) {
      setErrorMessage(gateCompletionIssue);
      return;
    }
    setRunningKey(task.dispatchKey);
    setErrorMessage("");
    try {
      if (task.databaseId) {
        const updated = await updatePersistedGateDispatchTaskState(task.dispatchKey, targetState, { completionEvidence });
        setTasks((current) => {
          const nextByKey = new Map(current.map((item) => [item.dispatchKey, item]));
          nextByKey.set(updated.task.dispatchKey, updated.task);
          for (const followUp of updated.followUpTasks) nextByKey.set(followUp.dispatchKey, followUp);
          for (const startMetricTask of updated.startMetricAutoDispatch?.createdDispatches ?? []) {
            nextByKey.set(startMetricTask.dispatchKey, startMetricTask);
          }
          for (const secondMetricTask of updated.secondMetricAutoDispatch?.createdDispatches ?? []) {
            nextByKey.set(secondMetricTask.dispatchKey, secondMetricTask);
          }
          for (const startMetricFollowup of updated.startMetricFollowupAutoDispatch?.createdDispatches ?? []) {
            nextByKey.set(startMetricFollowup.dispatchKey, startMetricFollowup);
          }
          for (const secondMetricFollowup of updated.secondMetricFollowupAutoDispatch?.createdDispatches ?? []) {
            nextByKey.set(secondMetricFollowup.dispatchKey, secondMetricFollowup);
          }
          return Array.from(nextByKey.values());
        });
        const recheckMessage = evidenceLoopRecheckMessage(updated);
        const storyTreeMessage = storyTreeRecheckMessage(updated);
        const submissionEffectMessage = updated.submissionEffectReview
          ? `已自动回写投稿效果：${updated.submissionEffectReview.headline}。下一步：${updated.submissionEffectReview.nextAction}`
          : "";
        const startMetricTasks = updated.startMetricAutoDispatch?.createdDispatches ?? [];
        const startMetricMessage = startMetricTasks.length
          ? `已自动生成首轮数据后的二轮任务：${startMetricTasks.map((item) => item.title).join("、")}`
          : "";
        const secondMetricTasks = updated.secondMetricAutoDispatch?.createdDispatches ?? [];
        const secondMetricMessage = secondMetricTasks.length
          ? `已自动生成二轮数据后的三轮动作：${secondMetricTasks.map((item) => item.title).join("、")}`
          : "";
        const startMetricFollowups = updated.startMetricFollowupAutoDispatch?.createdDispatches ?? [];
        const startMetricFollowupMessage = startMetricFollowups.length
          ? `已自动生成二轮任务后的回流派单：${startMetricFollowups.map((item) => item.title).join("、")}`
          : "";
        const secondMetricFollowups = updated.secondMetricFollowupAutoDispatch?.createdDispatches ?? [];
        const secondMetricFollowupMessage = secondMetricFollowups.length
          ? `已自动生成三轮动作后的回流派单：${secondMetricFollowups.map((item) => item.title).join("、")}`
          : "";
        const firstDayUpdate = buildFirstDayDispatchUpdateSummary(updated);
        if (firstDayUpdate.visible) {
          const firstDayFollowUp = updated.followUpTasks.find((item) => item.dispatchKey.startsWith("first-day:")) ?? null;
          const firstDayPrompt = buildFirstDayPostDispatchCompletionPrompt({
            completedTitle: updated.task.title,
            updateSummary: firstDayUpdate,
            nextStep: firstDayFollowUp
              ? {
                label: firstDayFollowUp.title,
                owner: firstDayUpdate.actionExecution ? "AI" : "运营",
                actionLabel: firstDayUpdate.actionLabel,
                href: firstDayUpdate.href,
                dispatchHref: firstDayFollowUp.projectId
                  ? buildFirstDayDispatchCenterHref({
                    projectId: firstDayFollowUp.projectId,
                    dispatchKey: firstDayFollowUp.dispatchKey,
                  })
                  : undefined,
              }
              : null,
            executionPlan: {
              executable: Boolean(firstDayUpdate.actionExecution),
              blockedReason: firstDayUpdate.actionExecution ? undefined : "当前首日节点暂不支持自动执行。",
            },
          });
          setRouteActionMessage(firstDayPrompt.message);
          setRouteActionLink({
            label: firstDayPrompt.actionLabel ?? firstDayUpdate.actionLabel,
            href: firstDayPrompt.actionHref ?? firstDayUpdate.href,
            execution: firstDayUpdate.actionExecution
              ? {
                kind: firstDayUpdate.actionExecution.kind,
                method: "POST",
                endpoint: firstDayUpdate.actionExecution.endpoint,
              }
              : undefined,
            secondary: firstDayPrompt.secondaryActionLabel && firstDayPrompt.secondaryActionHref
              ? {
                label: firstDayPrompt.secondaryActionLabel,
                href: firstDayPrompt.secondaryActionHref,
              }
              : undefined,
          });
          router.refresh();
        } else if (startMetricMessage) {
          setRouteActionMessage(`${startMetricMessage}${submissionEffectMessage ? `；${submissionEffectMessage}` : ""}`);
          setRouteActionLink({ label: "回总闸门复查", href: "/gate" });
        } else if (secondMetricMessage) {
          setRouteActionMessage(`${secondMetricMessage}${submissionEffectMessage ? `；${submissionEffectMessage}` : ""}`);
          setRouteActionLink({ label: "回总闸门复查", href: "/gate" });
        } else if (startMetricFollowupMessage) {
          setRouteActionMessage(startMetricFollowupMessage);
          setRouteActionLink({ label: "回总闸门复查", href: "/gate" });
        } else if (secondMetricFollowupMessage) {
          setRouteActionMessage(secondMetricFollowupMessage);
          setRouteActionLink({ label: "回总闸门复查", href: "/gate" });
        } else if (updated.followUpTasks.length) {
          setRouteActionMessage(`已自动生成治理后复检派单：${updated.followUpTasks.map((item) => item.title).join("、")}${recheckMessage ? `；${recheckMessage}` : ""}${storyTreeMessage ? `；${storyTreeMessage}` : ""}${submissionEffectMessage ? `；${submissionEffectMessage}` : ""}`);
          setRouteActionLink(null);
        } else if (storyTreeMessage && recheckMessage) {
          setRouteActionMessage(`${storyTreeMessage}；${recheckMessage}${submissionEffectMessage ? `；${submissionEffectMessage}` : ""}`);
          setRouteActionLink(null);
        } else if (storyTreeMessage) {
          setRouteActionMessage(`${storyTreeMessage}${submissionEffectMessage ? `；${submissionEffectMessage}` : ""}`);
          setRouteActionLink(null);
        } else if (recheckMessage) {
          setRouteActionMessage(`${recheckMessage}${submissionEffectMessage ? `；${submissionEffectMessage}` : ""}`);
          setRouteActionLink(null);
        } else if (submissionEffectMessage) {
          setRouteActionMessage(submissionEffectMessage);
          setRouteActionLink(null);
        } else if (updated.dispatchCompletionReceipt) {
          setRouteActionMessage(`已生成业务回执：${updated.dispatchCompletionReceipt.label}。证据复盘会用这条回执判断派单真闭环。`);
          setRouteActionLink({ label: "回总闸门复查", href: "/gate" });
        } else if (updated.knowledgeFeedbackReceipt) {
          setRouteActionMessage(`已回灌到项目反哺证据：${updated.knowledgeFeedbackReceipt.platformName} · ${updated.knowledgeFeedbackReceipt.completedStepLabel}`);
          setRouteActionLink(null);
        }
      } else {
        const updated = await persistGateDispatchTask({ ...task, state: targetState });
        setTasks((current) => current.map((item) => item.dispatchKey === updated.dispatchKey ? updated : item));
      }
      setCompletionDrafts((current) => {
        const next = { ...current };
        delete next[task.dispatchKey];
        return next;
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "派单状态更新失败。");
    } finally {
      setRunningKey(null);
    }
  }

  function completionTextForTask(task: PersistedGatePlatformDispatchTask) {
    return completionSuggestionByKey.get(task.dispatchKey)?.completionEvidence
      || buildRouteDispatchCompletionTemplate(task)
      || buildGateDispatchCompletionTemplate(task)
      || buildFirstDayDispatchCompletionTemplate(task);
  }

  function insertCompletionTemplate(task: PersistedGatePlatformDispatchTask) {
    const template = completionTextForTask(task);
    if (!template) return;
    setCompletionDrafts((current) => ({ ...current, [task.dispatchKey]: template }));
  }

  async function executeRouteGovernanceAdvice(item: RouteConfirmationDispatchFlow["lanes"][number]["items"][number]) {
    if (!item.governanceAdvice) return;
    setRunningRouteAdviceId(item.id);
    setErrorMessage("");
    setRouteActionMessage("");
    setRouteActionLink(null);
    try {
      const response = await fetch("/api/model-route-confirmation-governance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ advice: item.governanceAdvice }),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "生成模型路由治理派单失败。");
      setRouteActionMessage(`已生成「${item.label}」模型路由治理派单`);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "生成模型路由治理派单失败。");
    } finally {
      setRunningRouteAdviceId(null);
    }
  }

  async function createRecheckReviewDispatch(chain: GateDispatchRecheckFollowUpChain) {
    if (!chain.reviewAdvice || chain.reviewIntervention) return;
    setRunningRecheckAdviceKey(chain.rootDispatchKey);
    setErrorMessage("");
    setRouteActionMessage("");
    setRouteActionLink(null);
    try {
      const created = await persistGateDispatchTask(chain.reviewAdvice.dispatch);
      setTasks((current) => {
        const nextByKey = new Map(current.map((item) => [item.dispatchKey, item]));
        nextByKey.set(created.dispatchKey, created);
        return Array.from(nextByKey.values());
      });
      setRouteActionMessage(`已生成复盘派单：${created.title}`);
      setQueueFilter("all");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "生成复盘派单失败。");
    } finally {
      setRunningRecheckAdviceKey(null);
    }
  }

  async function runRouteRecheckTask(task: PersistedGatePlatformDispatchTask) {
    setRunningRouteRecheckKey(task.dispatchKey);
    setErrorMessage("");
    setRouteActionMessage("");
    setRouteActionLink(null);
    try {
      const response = await fetch("/api/model-route-confirmation-recheck-samples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dispatch: task, execute: true }),
      });
      const payload = await response.json().catch(() => null) as {
        error?: string;
        results?: Array<{ status: string }>;
        decision?: {
          label: string;
          detail: string;
          nextActionLabel: string;
        } | null;
        autoGovernance?: {
          task: {
            dispatchKey: string;
            title: string;
            actionLabel: string;
          };
        } | null;
        recheckTask?: {
          dispatchKey: string;
          state: GatePlatformGrowthDispatchState;
          completionEvidence: string;
          completedAt: string | null;
        };
      } | null;
      if (!response.ok) throw new Error(payload?.error ?? "运行模型路由复检样本失败。");
      const succeeded = payload?.results?.filter((result) => result.status === "succeeded").length ?? 0;
      const total = payload?.results?.length ?? 0;
      if (payload?.recheckTask) {
        setTasks((current) => current.map((item) => item.dispatchKey === payload.recheckTask?.dispatchKey
          ? {
            ...item,
            state: payload.recheckTask.state,
            completionEvidence: payload.recheckTask.completionEvidence,
            completedAt: payload.recheckTask.completedAt,
            updatedAt: payload.recheckTask.completedAt ?? item.updatedAt,
          }
          : item));
      }
      const decisionText = payload?.decision
        ? `，决策：${payload.decision.label}，下一步：${payload.decision.nextActionLabel}`
        : "";
      const governanceText = payload?.autoGovernance
        ? `；已自动生成治理派单：${payload.autoGovernance.task.title}`
        : "";
      setRouteActionMessage(`已运行「${task.title}」复检样本：${succeeded}/${total} 成功${decisionText}${governanceText}`);
      setRouteActionLink(null);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "运行模型路由复检样本失败。");
    } finally {
      setRunningRouteRecheckKey(null);
    }
  }

  async function runAiPipelineRecheckTask(task: PersistedGatePlatformDispatchTask) {
    setRunningAiPipelineKey(task.dispatchKey);
    setErrorMessage("");
    setRouteActionMessage("");
    setRouteActionLink(null);
    try {
      const response = await fetch("/api/gate/ai-pipeline-recheck-samples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dispatch: task }),
      });
      const payload = await response.json().catch(() => null) as {
        error?: string;
        results?: Array<{ status: string }>;
        routeEffectSummary?: {
          successRatePercent: number;
          averageQualityScore: number | null;
          verdict: string;
        };
        batchReceipt?: {
          headline: string;
          primaryLabel: string;
          primaryHref: string;
        };
        nextAction?: {
          label: string;
          detail: string;
          href: string;
          execution?: RouteActionExecution;
        };
        recheckTask?: {
          dispatchKey: string;
          state: GatePlatformGrowthDispatchState;
          completionEvidence: string;
          completedAt: string | null;
        };
        recoveryDispatch?: PersistedGatePlatformDispatchTask | null;
      } | null;
      if (!response.ok) throw new Error(payload?.error ?? "运行 AI 写审改复检失败。");
      if (payload?.recheckTask) {
        setTasks((current) => current.map((item) => item.dispatchKey === payload.recheckTask?.dispatchKey
          ? {
            ...item,
            state: payload.recheckTask.state,
            completionEvidence: payload.recheckTask.completionEvidence,
            completedAt: payload.recheckTask.completedAt,
            updatedAt: payload.recheckTask.completedAt ?? item.updatedAt,
          }
          : item));
      }
      if (payload?.recoveryDispatch) {
        setTasks((current) => {
          const nextByKey = new Map(current.map((item) => [item.dispatchKey, item]));
          nextByKey.set(payload.recoveryDispatch!.dispatchKey, payload.recoveryDispatch!);
          return Array.from(nextByKey.values());
        });
      }
      const succeeded = payload?.results?.filter((result) => result.status === "succeeded").length ?? 0;
      const total = payload?.results?.length ?? 0;
      const qualityText = payload?.routeEffectSummary?.averageQualityScore === null || payload?.routeEffectSummary?.averageQualityScore === undefined
        ? "质量缺样本"
        : `质量 ${payload.routeEffectSummary.averageQualityScore}`;
      const recoveryText = payload?.recoveryDispatch ? ` 已生成恢复派单：${payload.recoveryDispatch.title}。` : "";
      const nextActionText = payload?.nextAction ? ` 下一步：${payload.nextAction.detail}` : "";
      setRouteActionMessage(`已运行「${task.title}」：${succeeded}/${total} 成功，成功率 ${payload?.routeEffectSummary?.successRatePercent ?? 0}%，${qualityText}。${payload?.batchReceipt?.headline ?? payload?.routeEffectSummary?.verdict ?? ""}${nextActionText}${recoveryText}`);
      setRouteActionLink(payload?.recoveryDispatch ? {
        label: payload.recoveryDispatch.actionLabel,
        href: `/dispatch?queue=ai_pipeline#dispatch-${payload.recoveryDispatch.dispatchKey}`,
      } : payload?.nextAction?.href ? {
        label: payload.nextAction.label,
        href: payload.nextAction.href,
        execution: payload.nextAction.execution,
      } : payload?.batchReceipt?.primaryHref ? {
        label: payload.batchReceipt.primaryLabel,
        href: payload.batchReceipt.primaryHref,
      } : null);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "运行 AI 写审改复检失败。");
    } finally {
      setRunningAiPipelineKey(null);
    }
  }

  async function executeRouteActionLink(action: RouteActionLink) {
    if (!action.execution) return;
    setRunningRouteActionLink(true);
    setErrorMessage("");
    try {
      const response = await fetch(action.execution.endpoint, {
        method: action.execution.method,
        headers: { "Content-Type": "application/json" },
        body: action.execution.body ? JSON.stringify(action.execution.body) : undefined,
      });
      const payload = await response.json().catch(() => null) as {
        error?: string;
        message?: string;
        dispatchKey?: string;
        executionReceipt?: {
          success?: boolean;
          summary?: string;
          nextAction?: string;
          completionEvidence?: string;
        };
        completionEvidence?: string;
      } | null;
      if (!response.ok) throw new Error(payload?.error ?? "执行下一步失败。");
      if (action.execution.kind === "first_day_ai") {
        const receipt = payload?.executionReceipt;
        const completionEvidence = payload?.completionEvidence || receipt?.completionEvidence || "";
        const dispatchKey = action.execution.dispatchKey;
        const notice = buildFirstDayDispatchAiExecutionNotice({
          summary: receipt?.summary,
          nextAction: receipt?.nextAction,
          completionEvidence,
          canCompleteInDispatch: Boolean(dispatchKey),
          dispatchKey,
        });
        if (notice.canCompleteInDispatch && dispatchKey) {
          setCompletionDrafts((current) => ({
            ...current,
            [dispatchKey]: completionEvidence,
          }));
        }
        if (notice.focusDispatchKey) {
          setFocusedCompletionDispatchKey(notice.focusDispatchKey);
          setFocusedCompletionMessage(notice.focusMessage);
          requestAnimationFrame(() => {
            document.getElementById(`dispatch-${notice.focusDispatchKey}`)?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          });
        }
        setRouteActionMessage(notice.message);
        setRouteActionLink({
          label: notice.actionLabel === "当前页验收" ? "回项目复查" : notice.actionLabel,
          href: buildFirstDayReturnToAcceptanceHref({
            href: action.href,
            completionEvidence,
          }),
        });
        router.refresh();
        return;
      }
      setRouteActionMessage(payload?.message ?? `${action.label}已执行。`);
      setRouteActionLink(payload?.dispatchKey ? {
        label: "查看 AI 复检派单",
        href: `/dispatch?queue=ai_pipeline#dispatch-${payload.dispatchKey}`,
      } : {
        label: "回项目控制台",
        href: action.href,
      });
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "执行下一步失败。");
    } finally {
      setRunningRouteActionLink(false);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">总派单</div>
          <div className="mt-1 text-2xl font-semibold">{center.summary.total}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">待派</div>
          <div className="mt-1 text-2xl font-semibold">{center.summary.queued}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">已派</div>
          <div className="mt-1 text-2xl font-semibold">{center.summary.assigned}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">完成</div>
          <div className="mt-1 text-2xl font-semibold">{center.summary.completed}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">未闭环</div>
          <div className="mt-1 text-2xl font-semibold">{center.summary.active}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">已逾期</div>
          <div className="mt-1 text-2xl font-semibold">{center.summary.overdue}</div>
        </div>
        <button
          className={`rounded-md border p-3 text-left ${queueFilter === "recheck_followup" ? "border-amber-300 bg-amber-50 text-amber-900" : "border-slate-200 bg-white"}`}
          onClick={() => setQueueFilter((current) => current === "recheck_followup" ? "all" : "recheck_followup")}
          type="button"
        >
          <div className="text-xs opacity-75">复查返工</div>
          <div className="mt-1 text-2xl font-semibold">{center.summary.activeRecheckFollowUp}</div>
          <div className="mt-1 text-xs opacity-75">共 {center.summary.recheckFollowUp}</div>
        </button>
        <button
          className={`rounded-md border p-3 text-left ${queueFilter === "ai_pipeline" ? "border-sky-300 bg-sky-50 text-sky-900" : "border-slate-200 bg-white"}`}
          onClick={() => setQueueFilter((current) => current === "ai_pipeline" ? "all" : "ai_pipeline")}
          type="button"
        >
          <div className="text-xs opacity-75">AI 写审改</div>
          <div className="mt-1 text-2xl font-semibold">{center.summary.activeAiPipeline}</div>
          <div className="mt-1 text-xs opacity-75">复检派单 {center.summary.aiPipeline}</div>
        </button>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">返工链</div>
          <div className="mt-1 text-2xl font-semibold">{center.summary.recheckFollowUpChains}</div>
          <div className="mt-1 text-xs text-slate-500">二轮+ {center.summary.repeatedRecheckFollowUpChains}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">今天收</div>
          <div className="mt-1 text-2xl font-semibold">{center.summary.dueToday}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">平均优先级</div>
          <div className="mt-1 text-2xl font-semibold">{center.summary.averagePriorityScore}</div>
        </div>
      </section>

      {firstDayDesk.summary.total > 0 ? (
        <section className="rounded-md border border-slate-200 bg-white p-4" id="first-day-dispatch">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="font-medium text-slate-950">首日执行台</div>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                新书创建后的首日派单集中在这里，先把第一章生成、审稿、二改和平台包预检跑通，再考虑批量放大。
              </p>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center text-xs text-slate-600">
              <div className="rounded-md bg-slate-50 px-3 py-2">
                <div className="font-semibold text-slate-950">{firstDayDesk.summary.active}</div>
                <div>未闭环</div>
              </div>
              <div className="rounded-md bg-emerald-50 px-3 py-2 text-emerald-800">
                <div className="font-semibold">{firstDayDesk.summary.assigned}</div>
                <div>已派</div>
              </div>
              <div className="rounded-md bg-amber-50 px-3 py-2 text-amber-800">
                <div className="font-semibold">{firstDayDesk.summary.dueToday}</div>
                <div>今天收</div>
              </div>
              <div className="rounded-md bg-slate-50 px-3 py-2">
                <div className="font-semibold text-slate-950">{firstDayDesk.summary.completed}</div>
                <div>完成</div>
              </div>
            </div>
          </div>
          {firstDayFocus.requested ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <div className="font-medium">总闸门定位</div>
              <p className="mt-1 leading-6">{firstDayFocus.message}</p>
              {firstDayFocus.card ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-md bg-white px-2 py-1">{firstDayFocus.card.stateLabel}</span>
                  <span className="rounded-md bg-white px-2 py-1">{firstDayFocus.card.title}</span>
                  <span className="rounded-md bg-white px-2 py-1">{firstDayFocus.card.actionLabel}</span>
                </div>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {focusedTask?.state === "assigned" && completionTextForTask(focusedTask) ? (
                  <button
                    className="rounded-md bg-white px-3 py-2 text-xs font-medium text-amber-950 hover:bg-amber-100"
                    onClick={() => insertCompletionTemplate(focusedTask)}
                    type="button"
                  >
                    填入验收模板
                  </button>
                ) : null}
                <Link className="rounded-md border border-amber-300 bg-white/70 px-3 py-2 text-xs font-medium hover:bg-white" href="/gate">
                  回总闸门
                </Link>
              </div>
            </div>
          ) : null}
          {firstDayDesk.nextTask ? (
            <div className="mt-4 rounded-md bg-slate-950 p-4 text-white">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-xs font-medium uppercase text-slate-300">下一张首日卡</div>
                  <div className="mt-1 font-semibold">{firstDayDesk.nextTask.title}</div>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-200">{firstDayDesk.nextTask.detail}</p>
                  {firstDayDesk.nextTask.completionHint ? (
                    <p className="mt-2 max-w-3xl text-xs leading-5 text-amber-100">{firstDayDesk.nextTask.completionHint}</p>
                  ) : null}
                  <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-300">{firstDayDesk.nextTask.continuation.hint}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-200">
                    <span className="rounded-md bg-white/10 px-2 py-1">{firstDayDesk.nextTask.stepLabel}</span>
                    <span className="rounded-md bg-white/10 px-2 py-1">{firstDayDesk.nextTask.ownerRole}</span>
                    <span className="rounded-md bg-white/10 px-2 py-1">{firstDayDesk.nextTask.dueLabel}</span>
                    <span className="rounded-md bg-white/10 px-2 py-1">优先级 {firstDayDesk.nextTask.priorityScore}</span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                  {firstDayDesk.nextTask.continuation.kind === "first_day_ai" && firstDayDesk.nextTask.continuation.endpoint ? (
                    <button
                      className="rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-950 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={runningRouteActionLink}
                      onClick={() => void executeRouteActionLink({
                        label: firstDayDesk.nextTask!.continuation.label,
                        href: firstDayDesk.nextTask!.firstDayHref,
                        execution: {
                          kind: "first_day_ai",
                          method: "POST",
                          endpoint: firstDayDesk.nextTask!.continuation.endpoint!,
                          dispatchKey: firstDayDesk.nextTask!.dispatchKey,
                        },
                      })}
                      type="button"
                    >
                      {runningRouteActionLink ? "执行中" : firstDayDesk.nextTask.continuation.label}
                    </button>
                  ) : null}
                  <Link className="rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-950 hover:bg-slate-100" href={firstDayDesk.nextTask.firstDayHref}>
                    回作品执行
                  </Link>
                  <button
                    className="rounded-md border border-white/20 px-3 py-2 text-sm font-medium text-white hover:bg-white/10"
                    onClick={() => setCompletionDrafts((current) => ({
                      ...current,
                      [firstDayDesk.nextTask!.dispatchKey]: firstDayNextSuggestion?.completionEvidence ?? firstDayDesk.nextTask!.completionTemplate,
                    }))}
                    type="button"
                  >
                    {firstDayNextSuggestion ? "填小样本结果" : "填验收模板"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          {firstDayDesk.nextActions.length ? (
            <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
              {firstDayDesk.nextActions.map((action) => (
                <div className="rounded-md bg-slate-50 p-2" key={action}>{action}</div>
              ))}
            </div>
          ) : null}
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {firstDayDesk.cards.slice(0, 6).map((card) => (
              <div
                className={`rounded-md p-3 text-sm ${card.dispatchKey === focusedDispatchKey ? "bg-amber-50 ring-2 ring-amber-300" : "bg-slate-50"}`}
                key={card.dispatchKey}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-600">{card.stateLabel}</span>
                  <span className="font-medium text-slate-950">{card.stepLabel}</span>
                </div>
                <div className="mt-2 font-medium text-slate-950">{card.title}</div>
                <p className="mt-1 line-clamp-2 leading-6 text-slate-600">{card.detail}</p>
                {card.completionHint ? (
                  <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-xs leading-5 text-amber-800">{card.completionHint}</p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="rounded-md bg-white px-2 py-1">{card.dueLabel}</span>
                  <span className="rounded-md bg-white px-2 py-1">优先级 {card.priorityScore}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link className="rounded-md bg-slate-950 px-2 py-1 text-xs font-medium text-white hover:bg-slate-800" href={card.firstDayHref}>
                    回作品
                  </Link>
                  <Link className="rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50" href={card.href}>
                    {card.actionLabel}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {center.aiPipelineDispatches.length > 0 ? (
        <section className="rounded-md border border-sky-200 bg-sky-50 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="font-medium text-sky-950">AI 写审改复检派单</div>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-sky-800">
                复检后生成的样本、小批和修复动作集中在这里，先完成复验，再恢复批量生产。
              </p>
            </div>
            <button
              className="w-fit rounded-md bg-white px-3 py-2 text-sm font-medium text-sky-900 hover:bg-sky-100"
              onClick={() => setQueueFilter("ai_pipeline")}
              type="button"
            >
              只看 AI 复检
            </button>
          </div>
          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            {center.aiPipelineDispatches.slice(0, 4).map((task) => (
              <div
                className="rounded-md border border-sky-100 bg-white/80 p-3 text-sm text-sky-950 hover:bg-white"
                key={task.dispatchKey}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${stateClass(task.state)}`}>{stateLabel(task.state)}</span>
                  <span className="font-medium">{task.title}</span>
                </div>
                <p className="mt-2 line-clamp-2 leading-6 text-sky-800">{task.detail}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-sky-700">
                  <span className="rounded-md bg-sky-50 px-2 py-1">{task.ownerRole}</span>
                  <span className="rounded-md bg-sky-50 px-2 py-1">{task.actionLabel}</span>
                  <span className="rounded-md bg-sky-50 px-2 py-1">优先级 {task.priorityScore}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    className="rounded-md bg-white px-3 py-2 text-xs font-medium text-sky-900 hover:bg-sky-100"
                    href={`#dispatch-${task.dispatchKey}`}
                  >
                    查看派单
                  </Link>
                  {isAiPipelineExecutableTask(task) ? (
                    <button
                      className="rounded-md bg-sky-900 px-3 py-2 text-xs font-medium text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={runningAiPipelineKey !== null}
                      onClick={() => void runAiPipelineRecheckTask(task)}
                      type="button"
                    >
                      {runningAiPipelineKey === task.dispatchKey ? "运行中" : task.stage === "ai_pipeline_small_batch" ? "恢复小批执行" : "运行 1 章复验"}
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {center.recheckFollowUpChains.length > 0 ? (
        <section className="rounded-md border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="font-medium text-slate-950">返工轮次链路</div>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                同一个复查卡点的返工会串成链，二轮以上优先复盘验收标准和实际改动是否错位。
              </p>
            </div>
            <button
              className="w-fit rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
              onClick={() => setQueueFilter("recheck_followup")}
              type="button"
            >
              只看返工
            </button>
          </div>
          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            {center.recheckFollowUpChains.slice(0, 4).map((chain) => (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm" key={chain.rootDispatchKey}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${chain.status === "active" ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"}`}>
                    {chain.status === "active" ? "处理中" : "已收口"}
                  </span>
                  <span className="font-medium text-slate-950">{chain.latestTitle}</span>
                  <span className="text-xs text-slate-500">{chain.platformName}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                  <span className="rounded-md bg-white px-2 py-1">第 {chain.maxRound} 轮</span>
                  <span className="rounded-md bg-white px-2 py-1">未闭环 {chain.active}</span>
                  <span className="rounded-md bg-white px-2 py-1">完成 {chain.completed}</span>
                </div>
                {chain.reviewIntervention ? (
                  <div className={`mt-3 rounded-md border p-3 text-xs leading-5 ${recheckInterventionClass(chain.reviewIntervention.status)}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{chain.reviewIntervention.label}</span>
                      <span className="rounded-md bg-white/70 px-2 py-1">{stateLabel(chain.reviewIntervention.state)}</span>
                      <span className="opacity-80">{chain.reviewIntervention.ownerRole}</span>
                    </div>
                    <p className="mt-1">{chain.reviewIntervention.detail}</p>
                    <Link className="mt-2 inline-flex rounded-md bg-white/80 px-2 py-1 font-medium hover:bg-white" href={chain.reviewIntervention.href}>
                      查看复盘派单
                    </Link>
                  </div>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-1">
                  {chain.rounds.map((round) => (
                    <span
                      className={`rounded-md px-2 py-1 text-xs ${round.state === "completed" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}
                      key={round.dispatchKey}
                    >
                      R{round.round} · {stateLabel(round.state)} · {round.ownerRole}
                    </span>
                  ))}
                </div>
                {chain.reviewAdvice && !chain.reviewIntervention ? (
                  <div className={`mt-3 rounded-md border p-3 text-xs leading-5 ${recheckAdviceClass(chain.reviewAdvice.tone)}`}>
                    <div className="font-medium">{chain.reviewAdvice.title}</div>
                    <p className="mt-1">{chain.reviewAdvice.detail}</p>
                    <p className="mt-1 font-medium">下一步：{chain.reviewAdvice.nextAction}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="opacity-80">负责人：{chain.reviewAdvice.ownerRole}</span>
                      <button
                        className="rounded-md bg-white/80 px-2 py-1 font-medium hover:bg-white disabled:opacity-50"
                        disabled={runningRecheckAdviceKey !== null}
                        onClick={() => createRecheckReviewDispatch(chain)}
                        type="button"
                      >
                        {runningRecheckAdviceKey === chain.rootDispatchKey ? "生成中" : chain.reviewAdvice.dispatch.actionLabel}
                      </button>
                    </div>
                  </div>
                ) : null}
                <Link className="mt-3 inline-flex rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50" href={chain.latestHref}>
                  {chain.latestActionLabel}
                </Link>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {hasRouteFlow ? (
        <section className="grid gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="font-medium text-slate-950">模型路由流转</div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                <span className="rounded-md bg-slate-50 px-2 py-1">已派单 {routeConfirmationDispatchFlow.summary.dispatched}</span>
                <span className="rounded-md bg-slate-50 px-2 py-1">已确认 {routeConfirmationDispatchFlow.summary.confirmed}</span>
                <span className="rounded-md bg-slate-50 px-2 py-1">待复检 {routeConfirmationDispatchFlow.summary.waitingRecheck}</span>
                <span className="rounded-md bg-slate-50 px-2 py-1">需治理 {routeConfirmationDispatchFlow.summary.needsGovernance}</span>
              </div>
            </div>
            <div className="w-fit rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
              已完成 {routeConfirmationDispatchFlow.summary.completed}
            </div>
          </div>
          {routeConfirmationDispatchFlow.trails.length ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {routeConfirmationDispatchFlow.trails.slice(0, 4).map((trail) => (
                <div className={`rounded-md border p-3 text-sm ${routeTrailClass(trail.status)}`} key={trail.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium">{trail.label}闭环</div>
                    <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-medium">{routeTrailStatusLabel(trail.status)}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    {trail.steps.map((step) => (
                      <span className="rounded-md bg-white/70 px-2 py-1 font-medium" key={`${trail.id}:${step.label}:${step.latestAt}`}>
                        {step.label}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 opacity-80">{trail.summary}</p>
                </div>
              ))}
            </div>
          ) : null}
          {routeConfirmationDispatchFlow.emptyGuide ? (
            <div className="rounded-md border border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-950">{routeConfirmationDispatchFlow.emptyGuide.title}</div>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{routeConfirmationDispatchFlow.emptyGuide.detail}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800" href={routeConfirmationDispatchFlow.emptyGuide.primaryHref}>
                    {routeConfirmationDispatchFlow.emptyGuide.primaryLabel}
                  </Link>
                  <Link className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" href={routeConfirmationDispatchFlow.emptyGuide.secondaryHref}>
                    {routeConfirmationDispatchFlow.emptyGuide.secondaryLabel}
                  </Link>
                </div>
              </div>
              <div className="mt-4 grid gap-2 md:grid-cols-3">
                {routeConfirmationDispatchFlow.emptyGuide.steps.map((step) => (
                  <div className="rounded-md bg-slate-50 p-3 text-sm" key={step.label}>
                    <div className="font-medium text-slate-950">{step.label}</div>
                    <p className="mt-1 leading-6 text-slate-600">{step.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="grid gap-3 lg:grid-cols-4">
            {routeConfirmationDispatchFlow.lanes.map((lane) => {
              const laneFilter = routeFlowFilterFromLane(lane.id);
              const selected = routeFlowFilter === laneFilter;
              return (
                <div className={`rounded-md border p-3 ${routeFlowLaneClass(lane.id)} ${selected ? "ring-2 ring-slate-950/20" : ""}`} key={lane.id}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium">{lane.label}</div>
                    {laneFilter ? (
                      <button
                        className="rounded-md bg-white/80 px-2 py-1 text-xs font-medium hover:bg-white"
                        onClick={() => setRouteFlowFilter(selected ? "all" : laneFilter)}
                        type="button"
                      >
                        {lane.count}
                      </button>
                    ) : (
                      <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-medium">{lane.count}</span>
                    )}
                  </div>
                  <div className="mt-3 grid gap-2">
                    {lane.items.map((item) => (
                      item.governanceAdvice ? (
                        <div className="rounded-md bg-white/70 p-2 text-xs leading-5" key={item.id}>
                          <div className="font-medium">{item.label}</div>
                          <div className="mt-1 line-clamp-2 opacity-80">{item.detail}</div>
                          <div className="mt-1 opacity-70">{item.actionLabel} · 优先级 {item.priorityScore}</div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <button
                              className="rounded-md bg-slate-950 px-2 py-1 text-xs font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={runningRouteAdviceId === item.id}
                              onClick={() => void executeRouteGovernanceAdvice(item)}
                              type="button"
                            >
                              {runningRouteAdviceId === item.id ? "生成中" : "生成治理派单"}
                            </button>
                            <Link className="rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50" href={item.href}>
                              查看模型
                            </Link>
                          </div>
                        </div>
                      ) : (
                        <Link className="rounded-md bg-white/70 p-2 text-xs leading-5 hover:bg-white" href={item.href} key={item.id}>
                          <div className="font-medium">{item.label}</div>
                          <div className="mt-1 line-clamp-2 opacity-80">{item.detail}</div>
                          <div className="mt-1 opacity-70">{item.actionLabel} · 优先级 {item.priorityScore}</div>
                        </Link>
                      )
                    ))}
                    {lane.items.length === 0 ? (
                      <div className="rounded-md bg-white/60 p-2 text-xs opacity-70">暂无</div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
          {routeFlowFilter !== "all" ? (
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span className="rounded-md bg-slate-50 px-2 py-1">已筛选：{routeConfirmationDispatchFlow.lanes.find((lane) => lane.id === routeFlowFilter)?.label}</span>
              <button
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setRouteFlowFilter("all")}
                type="button"
              >
                清除
              </button>
            </div>
          ) : null}
          {routeActionMessage ? (
            <div className="flex flex-col gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 lg:flex-row lg:items-center lg:justify-between">
              <p className="leading-6">{routeActionMessage}</p>
              {routeActionLink ? (
                <div className="flex shrink-0 flex-wrap gap-2">
                  {routeActionLink.execution ? (
                    <button
                      className="w-fit rounded-md bg-white px-3 py-2 text-xs font-medium text-emerald-900 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={runningRouteActionLink}
                      onClick={() => void executeRouteActionLink(routeActionLink)}
                      type="button"
                    >
                      {runningRouteActionLink ? "执行中" : routeActionLink.label}
                    </button>
                  ) : (
                    <Link className="w-fit rounded-md bg-white px-3 py-2 text-xs font-medium text-emerald-900 hover:bg-emerald-100" href={routeActionLink.href}>
                      {routeActionLink.label}
                    </Link>
                  )}
                  {routeActionLink.secondary ? (
                    <Link className="w-fit rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900 hover:bg-emerald-100" href={routeActionLink.secondary.href}>
                      {routeActionLink.secondary.label}
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-md border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="font-medium text-slate-950">模型路由复检执行台</div>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              把路由确认后的复检、治理和治理后复检集中收口，先处理最高优先级卡片，再回填完成依据。
            </p>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center text-xs text-slate-600">
            <div className="rounded-md bg-slate-50 px-3 py-2">
              <div className="font-semibold text-slate-950">{routeExecutionDesk.summary.active}</div>
              <div>未闭环</div>
            </div>
            <div className="rounded-md bg-sky-50 px-3 py-2 text-sky-800">
              <div className="font-semibold">{routeExecutionDesk.summary.waitingRecheck}</div>
              <div>待复检</div>
            </div>
            <div className="rounded-md bg-amber-50 px-3 py-2 text-amber-800">
              <div className="font-semibold">{routeExecutionDesk.summary.needsGovernance}</div>
              <div>需治理</div>
            </div>
            <div className="rounded-md bg-emerald-50 px-3 py-2 text-emerald-800">
              <div className="font-semibold">{routeExecutionDesk.summary.completed}</div>
              <div>已完成</div>
            </div>
          </div>
        </div>
        {routeExecutionDesk.emptyState ? (
          <div className="mt-4 flex flex-col gap-3 rounded-md bg-slate-50 p-4 text-sm lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="font-medium text-slate-950">{routeExecutionDesk.emptyState.title}</div>
              <p className="mt-1 text-slate-600">{routeExecutionDesk.emptyState.detail}</p>
            </div>
            <Link className="w-fit rounded-md bg-slate-950 px-3 py-2 font-medium text-white hover:bg-slate-800" href={routeExecutionDesk.emptyState.href}>
              {routeExecutionDesk.emptyState.actionLabel}
            </Link>
          </div>
        ) : null}
        {routeExecutionDesk.nextTask ? (
          <div className="mt-4 rounded-md bg-slate-950 p-4 text-white">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-xs font-medium uppercase text-slate-300">下一张优先卡</div>
                <div className="mt-1 font-semibold">{routeExecutionDesk.nextTask.title}</div>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-200">{routeExecutionDesk.nextTask.detail}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-200">
                  <span className="rounded-md bg-white/10 px-2 py-1">{routeExecutionDesk.nextTask.taskTypeLabel}</span>
                  <span className="rounded-md bg-white/10 px-2 py-1">{routeExecutionDesk.nextTask.stageLabel}</span>
                  <span className="rounded-md bg-white/10 px-2 py-1">优先级 {routeExecutionDesk.nextTask.priorityScore}</span>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                {(() => {
                  const task = routeTaskByKey.get(routeExecutionDesk.nextTask.dispatchKey);
                  return task?.stage === "model_route_confirmation_recheck" && task.state === "assigned" ? (
                    <button
                      className="rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-950 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={runningRouteRecheckKey === task.dispatchKey}
                      onClick={() => void runRouteRecheckTask(task)}
                      type="button"
                    >
                      {runningRouteRecheckKey === task.dispatchKey ? "运行中" : routeExecutionDesk.nextTask.primaryActionLabel}
                    </button>
                  ) : null;
                })()}
                <Link className="rounded-md border border-white/20 px-3 py-2 text-sm font-medium text-white hover:bg-white/10" href={routeExecutionDesk.nextTask.href}>
                  打开入口
                </Link>
              </div>
            </div>
          </div>
        ) : null}
        {routeExecutionDesk.cards.length ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {routeExecutionDesk.cards.slice(0, 6).map((card) => {
              const task = routeTaskByKey.get(card.dispatchKey);
              return (
                <div className="rounded-md bg-slate-50 p-3 text-sm" key={card.dispatchKey}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${routeDeskStageClass(card.stageLabel)}`}>{card.stageLabel}</span>
                    <span className="rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-600">{card.stateLabel}</span>
                    <span className="font-medium text-slate-950">{card.taskTypeLabel}</span>
                  </div>
                  <div className="mt-2 font-medium text-slate-950">{card.title}</div>
                  <p className="mt-1 line-clamp-2 leading-6 text-slate-600">{card.detail}</p>
                  <div className="mt-3 grid gap-1 text-xs text-slate-600">
                    {card.evidencePrompts.slice(0, 3).map((prompt) => (
                      <div className="rounded-md bg-white px-2 py-1" key={prompt}>{prompt}</div>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {task?.stage === "model_route_confirmation_recheck" && task.state === "assigned" ? (
                      <button
                        className="rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-medium text-sky-800 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={runningRouteRecheckKey === task.dispatchKey}
                        onClick={() => void runRouteRecheckTask(task)}
                        type="button"
                      >
                        {runningRouteRecheckKey === task.dispatchKey ? "运行中" : card.primaryActionLabel}
                      </button>
                    ) : null}
                    <button
                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      onClick={() => setRouteFlowFilter(card.stageLabel === "治理" ? "needs_governance" : card.stateLabel === "完成" ? "completed" : "waiting_recheck")}
                      type="button"
                    >
                      定位任务
                    </button>
                    <Link className="rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50" href={card.href}>
                      {card.secondaryActionLabel}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="font-medium text-slate-950">今天怎么收口</div>
          <div className="mt-3 grid gap-2 text-sm text-slate-600">
            {center.nextActions.map((action, index) => (
              <div className="rounded-md bg-slate-50 p-2" key={action}>{index + 1}. {action}</div>
            ))}
          </div>
          {center.nextActions.length === 0 ? <p className="mt-3 text-sm text-slate-600">没有未闭环派单，当前很干净。</p> : null}
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="font-medium text-slate-950">收口清单</div>
          <div className="mt-3 grid gap-2">
            {center.closeoutItems.slice(0, 5).map((item) => (
              <Link className={`rounded-md border p-3 text-sm ${closeoutClass(item.status)}`} href={item.href} key={item.dispatchKey}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium">{item.title}</div>
                  <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-medium">{item.label}</span>
                </div>
                <p className="mt-1 leading-6 opacity-85">{item.detail}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs opacity-75">
                  <span>{item.platformName}</span>
                  <span>{item.ownerRole}</span>
                  <span>优先级 {item.priorityScore}</span>
                  {item.dueAt ? <span>截止 {new Date(item.dueAt).toLocaleString()}</span> : null}
                </div>
              </Link>
            ))}
            {center.closeoutItems.length === 0 ? <p className="text-sm text-slate-600">暂无派单任务。</p> : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="font-medium text-slate-950">完成证据复盘</div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-md bg-emerald-50 p-3 text-emerald-800">
              <div className="text-xs opacity-75">真闭环</div>
              <div className="mt-1 text-2xl font-semibold">{evidenceReview.summary.verified}</div>
            </div>
            <div className="rounded-md bg-amber-50 p-3 text-amber-800">
              <div className="text-xs opacity-75">待业务回执</div>
              <div className="mt-1 text-2xl font-semibold">{evidenceReview.summary.needsReceipt}</div>
            </div>
            <div className="rounded-md bg-rose-50 p-3 text-rose-800">
              <div className="text-xs opacity-75">缺依据</div>
              <div className="mt-1 text-2xl font-semibold">{evidenceReview.summary.missingEvidence}</div>
            </div>
            <div className="rounded-md bg-slate-50 p-3 text-slate-700">
              <div className="text-xs opacity-75">未完成</div>
              <div className="mt-1 text-2xl font-semibold">{evidenceReview.summary.active}</div>
            </div>
          </div>
          <div className="mt-3 grid gap-2 text-sm text-slate-600">
            {evidenceReview.nextActions.map((action) => (
              <div className="rounded-md bg-slate-50 p-2" key={action}>{action}</div>
            ))}
          </div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="font-medium text-slate-950">证据待复检</div>
          <div className="mt-3 grid gap-2">
            {evidenceIssues.map((item) => (
              <Link className={`rounded-md border p-3 text-sm ${evidenceClass(item.status)}`} href={item.href} key={item.dispatchKey}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium">{item.title}</div>
                  <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-medium">{item.label}</span>
                </div>
                <p className="mt-1 leading-6 opacity-85">{item.detail}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs opacity-75">
                  <span>{item.platformName}</span>
                  <span>{item.ownerRole}</span>
                  <span>优先级 {item.priorityScore}</span>
                  <span>下一步 {item.actionLabel}</span>
                </div>
              </Link>
            ))}
            {evidenceIssues.length === 0 ? (
              <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                当前完成项都有后续业务回执，证据链是闭上的。
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4">
        <div className="font-medium text-slate-950">筛选</div>
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <label className="grid gap-1 text-xs font-medium text-slate-600">
            队列
            <select
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
              onChange={(event) => setQueueFilter(event.target.value as DispatchQueueFilter)}
              value={queueFilter}
            >
              <option value="all">全部队列</option>
              <option value="recheck_followup">复查失败返工</option>
              <option value="ai_pipeline">AI 写审改复检</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-600">
            状态
            <select
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
              onChange={(event) => setStateFilter(event.target.value as GateDispatchTaskStateFilter)}
              value={stateFilter}
            >
              <option value="all">全部</option>
              <option value="queued">待派</option>
              <option value="assigned">已派</option>
              <option value="completed">完成</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-600">
            平台
            <select
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
              onChange={(event) => setPlatformFilter(event.target.value)}
              value={platformFilter}
            >
              <option value="all">全部平台</option>
              {center.platforms.map((platform) => (
                <option key={platform.id} value={platform.id}>{platform.name} · {platform.active}/{platform.total}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-600">
            角色
            <select
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
              onChange={(event) => setRoleFilter(event.target.value)}
              value={roleFilter}
            >
              <option value="all">全部角色</option>
              {center.ownerRoles.map((role) => (
                <option key={role.role} value={role.role}>{role.role} · {role.active}/{role.total}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {errorMessage ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{errorMessage}</p>
      ) : null}

      <section className="grid gap-3">
        {filteredTasks.map((task) => {
          const completionSuggestion = completionSuggestionByKey.get(task.dispatchKey);
          const completionTemplate = completionTextForTask(task);
          const firstDayCompletionHint = buildFirstDayDispatchCompletionHint(task);
          const completionRecord = task.completionEvidence
            ? parseRouteDispatchCompletionEvidence(task, task.completionEvidence)
            : null;
          const completionRecordChips = completionRecord ? routeCompletionRecordChips(completionRecord) : [];
          const isRecheckFollowUp = isChapterProductionRecheckFollowUpTask(task);
          const recheckChain = recheckChainByDispatchKey.get(task.dispatchKey);
          const isFocusedCompletionTask = task.dispatchKey === focusedCompletionDispatchKey;
          const isFocusedTask = task.dispatchKey === focusedDispatchKey || isFocusedCompletionTask;
          return (
          <div
            className={`rounded-md border bg-white p-4 ${isFocusedTask ? "border-amber-300 ring-2 ring-amber-200" : "border-slate-200"}`}
            id={`dispatch-${task.dispatchKey}`}
            key={task.dispatchKey}
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${stateClass(task.state)}`}>{stateLabel(task.state)}</span>
                  {isRecheckFollowUp ? <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">复查返工</span> : null}
                  {aiPipelineTaskKeys.has(task.dispatchKey) ? <span className="rounded-md bg-sky-50 px-2 py-1 text-xs font-medium text-sky-800">AI 复检</span> : null}
                  {recheckChain ? <span className="rounded-md bg-sky-50 px-2 py-1 text-xs font-medium text-sky-800">R{recheckChain.round}/R{recheckChain.maxRound}</span> : null}
                  <span className="font-semibold text-slate-950">{task.title}</span>
                  <span className="text-sm text-slate-500">{task.platformName}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{task.detail}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="rounded-md bg-slate-50 px-2 py-1">{task.ownerRole}</span>
                  <span className="rounded-md bg-slate-50 px-2 py-1">{task.dueLabel}</span>
                  <span className="rounded-md bg-slate-50 px-2 py-1">优先级 {task.priorityScore}</span>
                  {recheckChain ? <span className="rounded-md bg-slate-50 px-2 py-1">链路 {recheckChain.active}/{recheckChain.total} 未闭环</span> : null}
                  {task.completedAt ? <span className="rounded-md bg-slate-50 px-2 py-1">完成 {new Date(task.completedAt).toLocaleString()}</span> : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  {task.acceptanceCriteria.map((criterion) => (
                    <span className="rounded-md bg-slate-50 px-2 py-1" key={criterion}>{criterion}</span>
                  ))}
                </div>
                {task.state === "assigned" ? (
                  <div className="mt-3 grid gap-1">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-slate-600">
                      <span>完成依据</span>
                      {completionTemplate ? (
                        <button
                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          onClick={() => insertCompletionTemplate(task)}
                          type="button"
                        >
                          {completionSuggestion ? "填入小样本结果" : "填入模板"}
                        </button>
                      ) : null}
                    </div>
                    {completionSuggestion ? (
                      <p className="rounded-md bg-emerald-50 px-2 py-1 text-xs leading-5 text-emerald-800">
                        已找到最近小样本结果：{completionSuggestion.label}
                      </p>
                    ) : null}
                    {firstDayCompletionHint ? (
                      <p className="rounded-md bg-amber-50 px-2 py-1 text-xs leading-5 text-amber-800">{firstDayCompletionHint}</p>
                    ) : null}
                    {isFocusedCompletionTask && focusedCompletionMessage ? (
                      <p className="rounded-md bg-emerald-50 px-2 py-1 text-xs leading-5 text-emerald-800">{focusedCompletionMessage}</p>
                    ) : null}
                    <textarea
                      className="min-h-20 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800"
                      onChange={(event) => setCompletionDrafts((current) => ({ ...current, [task.dispatchKey]: event.target.value }))}
                      placeholder="写清楚完成了什么、证据在哪里、是否已回填数据。"
                      value={completionDrafts[task.dispatchKey] ?? ""}
                    />
                  </div>
                ) : null}
                {task.completionEvidence ? (
                  <div className="mt-3 rounded-md bg-emerald-50 p-3 text-sm leading-6 text-emerald-800">
                    <p>完成依据：{task.completionEvidence}</p>
                    {completionRecordChips.length ? (
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        {completionRecordChips.map((chip) => (
                          <span className="rounded-md bg-white px-2 py-1 font-medium text-emerald-900" key={chip}>{chip}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                {task.stage === "model_route_confirmation_recheck" && task.state === "assigned" ? (
                  <button
                    className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-800 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={runningRouteRecheckKey === task.dispatchKey}
                    onClick={() => void runRouteRecheckTask(task)}
                    type="button"
                  >
                    {runningRouteRecheckKey === task.dispatchKey ? "运行中" : "运行复检样本"}
                  </button>
                ) : null}
                {isAiPipelineExecutableTask(task) ? (
                  <button
                    className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-800 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={runningAiPipelineKey === task.dispatchKey}
                    onClick={() => void runAiPipelineRecheckTask(task)}
                    type="button"
                  >
                    {runningAiPipelineKey === task.dispatchKey ? "运行中" : task.stage === "ai_pipeline_small_batch" ? "恢复小批执行" : "运行 1 章复验"}
                  </button>
                ) : null}
                <button
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={runningKey === task.dispatchKey || runningRouteRecheckKey === task.dispatchKey || runningAiPipelineKey === task.dispatchKey}
                  onClick={() => void updateTask(task)}
                  type="button"
                >
                  {runningKey === task.dispatchKey ? "处理中" : actionLabel(task.state)}
                </button>
                <Link className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800" href={task.href}>
                  打开入口
                </Link>
              </div>
            </div>
          </div>
          );
        })}
        {filteredTasks.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
            当前筛选下没有派单任务。
          </p>
        ) : null}
      </section>
    </div>
  );
}
