"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  buildGateDispatchTaskCenter,
  filterGateDispatchTasks,
  updatePersistedGateDispatchTaskState,
  type GateDispatchTaskStateFilter,
  type GateDispatchTaskCloseoutStatus,
  type GatePlatformGrowthDispatchState,
  type PersistedGatePlatformDispatchTask,
} from "@/lib/projects/gateActionReceipts";

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

export function GateDispatchTaskCenter({ initialTasks }: { initialTasks: PersistedGatePlatformDispatchTask[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [stateFilter, setStateFilter] = useState<GateDispatchTaskStateFilter>("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [runningKey, setRunningKey] = useState<string | null>(null);
  const [completionDrafts, setCompletionDrafts] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState("");
  const center = useMemo(() => buildGateDispatchTaskCenter(tasks), [tasks]);
  const filteredTasks = useMemo(() => filterGateDispatchTasks(tasks, {
    state: stateFilter,
    platformId: platformFilter,
    ownerRole: roleFilter,
  }), [platformFilter, roleFilter, stateFilter, tasks]);

  async function updateTask(task: PersistedGatePlatformDispatchTask) {
    const targetState = nextState(task.state);
    const completionEvidence = completionDrafts[task.dispatchKey]?.trim() ?? "";
    if (targetState === "completed" && completionEvidence.length < 8) {
      setErrorMessage("完成前请写清楚完成依据，至少 8 个字。");
      return;
    }
    setRunningKey(task.dispatchKey);
    setErrorMessage("");
    try {
      const updated = await updatePersistedGateDispatchTaskState(task.dispatchKey, targetState, { completionEvidence });
      setTasks((current) => current.map((item) => item.dispatchKey === updated.dispatchKey ? updated : item));
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
        {filteredTasks.map((task) => (
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
                  <label className="mt-3 grid gap-1 text-xs font-medium text-slate-600">
                    完成依据
                    <textarea
                      className="min-h-20 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800"
                      onChange={(event) => setCompletionDrafts((current) => ({ ...current, [task.dispatchKey]: event.target.value }))}
                      placeholder="写清楚完成了什么、证据在哪里、是否已回填数据。"
                      value={completionDrafts[task.dispatchKey] ?? ""}
                    />
                  </label>
                ) : null}
                {task.completionEvidence ? (
                  <p className="mt-3 rounded-md bg-emerald-50 p-3 text-sm leading-6 text-emerald-800">
                    完成依据：{task.completionEvidence}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                <button
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={runningKey === task.dispatchKey}
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
        ))}
        {filteredTasks.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
            当前筛选下没有派单任务。
          </p>
        ) : null}
      </section>
    </div>
  );
}
