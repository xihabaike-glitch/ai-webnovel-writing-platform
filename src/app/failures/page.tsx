import Link from "next/link";
import { AppShell } from "@/components/app-shell/AppShell";
import { FailureRepairLaneReceiptButton } from "@/components/failures/FailureRepairLaneReceiptButton";
import { buildTaskRunConsole } from "@/lib/ai/taskRunConsole";
import { prisma } from "@/lib/db/prisma";
import { buildFailureReviewCenter } from "@/lib/ai/failureReviewCenter";
import {
  buildGateFailureRepairFollowupNotice,
  buildGateFailureRepairReceiptReview,
  buildGateFailureRepairRecheckResolution,
  gateActionReceiptFromAuditRecord,
} from "@/lib/projects/gateActionReceipts";

export const dynamic = "force-dynamic";

function followupToneClass(tone: ReturnType<typeof buildGateFailureRepairFollowupNotice>["tone"]) {
  if (tone === "resolved") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (tone === "failed" || tone === "active") return "border-amber-200 bg-amber-50 text-amber-900";
  if (tone === "recheck") return "border-blue-200 bg-blue-50 text-blue-900";
  return "border-slate-200 bg-white text-slate-900";
}

function groupList(groups: Array<{ id: string; label: string; count: number; percent: number; sample: string; suggestion: string }>) {
  return (
    <div className="grid gap-2">
      {groups.slice(0, 5).map((group) => (
        <div className="rounded-md bg-slate-50 p-3 text-sm" key={group.id}>
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium text-slate-950">{group.label}</div>
            <div className="text-xs text-slate-500">{group.count} 次 · {group.percent}%</div>
          </div>
          <p className="mt-1 text-slate-600">{group.suggestion}</p>
          <p className="mt-1 text-xs text-slate-500">{group.sample}</p>
        </div>
      ))}
      {groups.length === 0 ? <p className="text-sm text-slate-600">暂无失败数据。</p> : null}
    </div>
  );
}

export default async function FailuresPage() {
  const [tasks, chapters, receiptAudits] = await Promise.all([
    prisma.aiTask.findMany({
      where: { status: { in: ["failed", "succeeded"] } },
      include: {
        project: { select: { title: true } },
        modelProvider: { select: { providerId: true, displayName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    prisma.chapter.findMany({
      select: { id: true, title: true },
    }),
    prisma.gateActionAudit.findMany({
      where: {
        OR: [
          { actionId: "failure-repair-batch" },
          { actionId: { startsWith: "repair-batch-retry:" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
  ]);
  const chaptersById = new Map(chapters.map((chapter) => [chapter.id, chapter]));
  const failureTasks = tasks.map((task) => ({
    ...task,
    chapter: task.chapterId ? chaptersById.get(task.chapterId) ?? null : null,
  }));
  const center = buildFailureReviewCenter(failureTasks);
  const runConsole = buildTaskRunConsole(failureTasks.map((task) => ({
    id: task.id,
    projectId: task.projectId,
    chapterId: task.chapterId,
    taskType: task.taskType,
    model: task.model,
    status: task.status,
    inputTokens: task.inputTokens,
    outputTokens: task.outputTokens,
    costUsd: task.costUsd,
    errorMessage: task.errorMessage,
    inputSnapshot: task.inputSnapshot,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    project: task.project,
    chapter: task.chapter,
    modelProvider: task.modelProvider,
  })));
  const repairReceipts = receiptAudits.map(gateActionReceiptFromAuditRecord);
  const failureRepairReview = buildGateFailureRepairReceiptReview(runConsole.failureRepairBatch, repairReceipts);
  const failureRepairFollowup = buildGateFailureRepairFollowupNotice(
    failureRepairReview,
    buildGateFailureRepairRecheckResolution(runConsole.failureRepairBatch, []),
  );

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">失败任务复盘</h1>
        <p className="mt-1 text-sm text-slate-600">按错误原因、模型、任务类型和项目聚合失败，先修配置和提示词，再重试。</p>
      </div>

      <section className="mb-6 grid gap-3 md:grid-cols-3 lg:grid-cols-7">
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">历史失败</div>
          <div className="mt-1 text-2xl font-semibold">{center.summary.totalFailures}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">未恢复</div>
          <div className="mt-1 text-2xl font-semibold">{center.summary.unresolvedFailures}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">已恢复</div>
          <div className="mt-1 text-2xl font-semibold">{center.summary.recoveredFailures}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">可重试</div>
          <div className="mt-1 text-2xl font-semibold">{center.summary.retryableFailures}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">影响项目</div>
          <div className="mt-1 text-2xl font-semibold">{center.summary.affectedProjects}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">影响模型</div>
          <div className="mt-1 text-2xl font-semibold">{center.summary.affectedProviders}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">最高频</div>
          <div className="mt-1 text-xl font-semibold">{center.summary.mostCommonCategory}</div>
        </div>
      </section>

      <section className="mb-6 rounded-md border border-slate-200 bg-white p-4">
        <div className="font-medium text-slate-950">下一步动作</div>
        <div className="mt-3 grid gap-2 text-sm text-slate-600">
          {center.nextActions.map((action, index) => (
            <div className="rounded-md bg-slate-50 p-2" key={action}>{index + 1}. {action}</div>
          ))}
        </div>
      </section>

      <section className={`mb-6 rounded-md border p-4 ${followupToneClass(failureRepairFollowup.tone)}`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-medium">{failureRepairFollowup.label}</h2>
            <p className="mt-1 text-sm leading-6">{failureRepairFollowup.detail}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {failureRepairFollowup.badges.map((badge) => (
                <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-medium" key={badge}>{badge}</span>
              ))}
            </div>
          </div>
          <Link className="w-fit rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800" href={failureRepairFollowup.href}>
            {failureRepairFollowup.actionLabel}
          </Link>
        </div>
      </section>

      <section className="mb-6 rounded-md border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-medium text-slate-950">修复决策台</h2>
            <p className="mt-1 text-sm text-slate-600">按失败原因自动排优先级，先清会拖垮批量生产的断点。</p>
          </div>
          <div className="w-fit rounded-md bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
            {center.repairLanes.length} 条修复泳道
          </div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-4">
          {center.repairLanes.map((lane) => (
            <div className="rounded-md border border-slate-200 p-3 text-sm" key={lane.id}>
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700">{lane.priorityLabel}</span>
                <span className="text-xs text-slate-500">{lane.count} 个</span>
              </div>
              <div className="mt-3 font-medium text-slate-950">{lane.label}</div>
              <p className="mt-2 leading-6 text-slate-600">{lane.detail}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {lane.evidence.slice(0, 3).map((item) => (
                  <span className="rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600" key={item}>{item}</span>
                ))}
              </div>
              <Link className="mt-3 inline-flex rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800" href={lane.href}>
                {lane.actionLabel}
              </Link>
              <FailureRepairLaneReceiptButton action={lane.receiptAction} />
            </div>
          ))}
          {center.repairLanes.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-300 p-3 text-sm text-slate-600">
              没有未恢复失败，继续观察后续失败率和模型成本。
            </div>
          ) : null}
        </div>
      </section>

      <section className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="mb-3 font-medium text-slate-950">错误原因</div>
          {groupList(center.categoryGroups)}
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="mb-3 font-medium text-slate-950">模型分布</div>
          {groupList(center.providerGroups)}
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="mb-3 font-medium text-slate-950">任务类型</div>
          {groupList(center.taskTypeGroups)}
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="mb-3 font-medium text-slate-950">项目分布</div>
          {groupList(center.projectGroups)}
        </div>
      </section>

      <section className="grid gap-3">
        {center.recentFailures.map((failure) => (
          <div className="rounded-md border border-slate-200 bg-white p-4" key={failure.id}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700">{failure.categoryLabel}</span>
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${
                    failure.recoveryStatus === "recovered"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}>
                    {failure.recoveryStatus === "recovered" ? "已恢复" : "未恢复"}
                  </span>
                  <Link className="font-semibold text-slate-950 hover:underline" href={failure.href}>{failure.projectTitle}</Link>
                  <span className="text-sm text-slate-500">{failure.taskLabel}</span>
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  {failure.chapterTitle} · {failure.providerName} · {failure.model} · {new Date(failure.createdAt).toLocaleString()}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{failure.errorMessage}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {failure.recoveryStatus === "recovered" ? failure.recoveryLabel : failure.suggestion}
                </p>
              </div>
              <div className={`shrink-0 rounded-md px-3 py-2 text-sm ${
                failure.recoveryStatus === "recovered"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-50 text-slate-600"
              }`}>
                {failure.recoveryStatus === "recovered" ? "已恢复" : failure.retryable ? "可单章重试" : "先修配置"}
              </div>
            </div>
          </div>
        ))}
        {center.recentFailures.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
            暂无失败任务。继续保持错误记录和成本记录。
          </p>
        ) : null}
      </section>
    </AppShell>
  );
}
