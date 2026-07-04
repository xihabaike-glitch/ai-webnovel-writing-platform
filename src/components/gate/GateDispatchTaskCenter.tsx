"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  buildGateDispatchEvidenceReview,
  buildGateDispatchTaskCenter,
  filterGateDispatchTasks,
  persistGateDispatchTask,
  updatePersistedGateDispatchTaskState,
  type GateActionReceipt,
  type GateDispatchEvidenceReviewStatus,
  type GateDispatchTaskStateFilter,
  type GateDispatchTaskCloseoutStatus,
  type GatePlatformGrowthDispatchState,
  type PersistedGatePlatformDispatchTask,
} from "@/lib/projects/gateActionReceipts";
import {
  buildRouteDispatchCompletionTemplate,
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

function routeFlowFilterFromLane(laneId: RouteConfirmationDispatchFlowLaneId): RouteConfirmationDispatchTaskFilter | null {
  if (laneId === "confirmed") return null;
  return laneId;
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
  initialReceipts,
  initialTasks,
  routeConfirmationDispatchFlow,
}: {
  initialReceipts: GateActionReceipt[];
  initialTasks: PersistedGatePlatformDispatchTask[];
  routeConfirmationDispatchFlow: RouteConfirmationDispatchFlow;
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [stateFilter, setStateFilter] = useState<GateDispatchTaskStateFilter>("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [routeFlowFilter, setRouteFlowFilter] = useState<RouteConfirmationDispatchTaskFilter>("all");
  const [runningKey, setRunningKey] = useState<string | null>(null);
  const [runningRouteAdviceId, setRunningRouteAdviceId] = useState<string | null>(null);
  const [runningRouteRecheckKey, setRunningRouteRecheckKey] = useState<string | null>(null);
  const [routeActionMessage, setRouteActionMessage] = useState("");
  const [completionDrafts, setCompletionDrafts] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState("");
  const center = useMemo(() => buildGateDispatchTaskCenter(tasks), [tasks]);
  const evidenceReview = useMemo(() => buildGateDispatchEvidenceReview(tasks, initialReceipts), [initialReceipts, tasks]);
  const evidenceIssues = evidenceReview.items.filter((item) => item.status !== "verified").slice(0, 5);
  const filteredTasks = useMemo(() => {
    const baseTasks = filterGateDispatchTasks(tasks, {
      state: stateFilter,
      platformId: platformFilter,
      ownerRole: roleFilter,
    });
    return filterRouteConfirmationDispatchTasks(baseTasks, routeFlowFilter);
  }, [platformFilter, roleFilter, routeFlowFilter, stateFilter, tasks]);

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
    setRunningKey(task.dispatchKey);
    setErrorMessage("");
    try {
      if (task.databaseId) {
        const updated = await updatePersistedGateDispatchTaskState(task.dispatchKey, targetState, { completionEvidence });
        setTasks((current) => {
          const nextByKey = new Map(current.map((item) => [item.dispatchKey, item]));
          nextByKey.set(updated.task.dispatchKey, updated.task);
          for (const followUp of updated.followUpTasks) nextByKey.set(followUp.dispatchKey, followUp);
          return Array.from(nextByKey.values());
        });
        if (updated.followUpTasks.length) {
          setRouteActionMessage(`已自动生成治理后复检派单：${updated.followUpTasks.map((item) => item.title).join("、")}`);
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

  function insertCompletionTemplate(task: PersistedGatePlatformDispatchTask) {
    const template = buildRouteDispatchCompletionTemplate(task);
    if (!template) return;
    setCompletionDrafts((current) => ({ ...current, [task.dispatchKey]: template }));
  }

  async function executeRouteGovernanceAdvice(item: RouteConfirmationDispatchFlow["lanes"][number]["items"][number]) {
    if (!item.governanceAdvice) return;
    setRunningRouteAdviceId(item.id);
    setErrorMessage("");
    setRouteActionMessage("");
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

  async function runRouteRecheckTask(task: PersistedGatePlatformDispatchTask) {
    setRunningRouteRecheckKey(task.dispatchKey);
    setErrorMessage("");
    setRouteActionMessage("");
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
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "运行模型路由复检样本失败。");
    } finally {
      setRunningRouteRecheckKey(null);
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
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">今天收</div>
          <div className="mt-1 text-2xl font-semibold">{center.summary.dueToday}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">平均优先级</div>
          <div className="mt-1 text-2xl font-semibold">{center.summary.averagePriorityScore}</div>
        </div>
      </section>

      {routeConfirmationDispatchFlow.summary.confirmed || routeConfirmationDispatchFlow.summary.dispatched || routeConfirmationDispatchFlow.summary.completed ? (
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
            <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{routeActionMessage}</p>
          ) : null}
        </section>
      ) : null}

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
        <div className="mt-3 grid gap-2 md:grid-cols-3">
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
          const completionTemplate = buildRouteDispatchCompletionTemplate(task);
          const completionRecord = task.completionEvidence
            ? parseRouteDispatchCompletionEvidence(task, task.completionEvidence)
            : null;
          const completionRecordChips = completionRecord ? routeCompletionRecordChips(completionRecord) : [];
          return (
          <div className="rounded-md border border-slate-200 bg-white p-4" key={task.dispatchKey}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${stateClass(task.state)}`}>{stateLabel(task.state)}</span>
                  <span className="font-semibold text-slate-950">{task.title}</span>
                  <span className="text-sm text-slate-500">{task.platformName}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{task.detail}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="rounded-md bg-slate-50 px-2 py-1">{task.ownerRole}</span>
                  <span className="rounded-md bg-slate-50 px-2 py-1">{task.dueLabel}</span>
                  <span className="rounded-md bg-slate-50 px-2 py-1">优先级 {task.priorityScore}</span>
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
                          填入模板
                        </button>
                      ) : null}
                    </div>
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
                <button
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={runningKey === task.dispatchKey || runningRouteRecheckKey === task.dispatchKey}
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
