import Link from "next/link";
import { AppShell } from "@/components/app-shell/AppShell";
import { buildTaskRunConsole, type TaskRunLog } from "@/lib/ai/taskRunConsole";
import { prisma } from "@/lib/db/prisma";
import { buildBatchExecutionSafety } from "@/lib/projects/batchExecutionSafety";
import { buildTaskQueueCenter, type QueueItem } from "@/lib/projects/taskQueueCenter";

export const dynamic = "force-dynamic";

function categoryClass(category: QueueItem["category"]) {
  if (category === "review") return "bg-blue-50 text-blue-700";
  if (category === "second_pass") return "bg-amber-50 text-amber-700";
  if (category === "draft") return "bg-emerald-50 text-emerald-700";
  if (category === "export") return "bg-slate-100 text-slate-700";
  return "bg-rose-50 text-rose-700";
}

function runStatusClass(status: string) {
  if (status === "succeeded") return "bg-emerald-50 text-emerald-700";
  if (status === "failed") return "bg-rose-50 text-rose-700";
  if (status === "running") return "bg-blue-50 text-blue-700";
  if (status === "queued") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

function runtimeLabel(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.round(seconds / 60)}m`;
}

function logMeta(log: TaskRunLog) {
  const parts = [
    log.providerName,
    log.model,
    `${log.tokens} tokens`,
    `$${log.costUsd.toFixed(4)}`,
    runtimeLabel(log.runtimeMs),
  ];
  return parts.join(" · ");
}

export default async function TasksPage() {
  const [projects, recentAiTasks, chapters] = await Promise.all([
    prisma.project.findMany({
      include: {
        chapters: { orderBy: { order: "asc" } },
        aiTasks: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.aiTask.findMany({
      include: {
        project: { select: { title: true } },
        modelProvider: { select: { providerId: true, displayName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 120,
    }),
    prisma.chapter.findMany({
      select: { id: true, title: true },
    }),
  ]);
  const chaptersById = new Map(chapters.map((chapter) => [chapter.id, chapter]));
  const queue = buildTaskQueueCenter(projects);
  const safety = buildBatchExecutionSafety(queue.items, projects);
  const runConsole = buildTaskRunConsole(recentAiTasks.map((task) => ({
    ...task,
    chapter: task.chapterId ? chaptersById.get(task.chapterId) ?? null : null,
  })));

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">任务队列</h1>
          <p className="mt-1 text-sm text-slate-600">跨项目集中处理待生成、待审稿、待二改和待导出的任务。</p>
        </div>
        {queue.recommendedNext ? (
          <Link className="w-fit rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white" href={queue.recommendedNext.href}>
            下一步：{queue.recommendedNext.label}
          </Link>
        ) : null}
      </div>

      <section className="mb-6 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">总任务</div>
          <div className="mt-1 text-2xl font-semibold">{queue.overview.totalItems}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">待生成</div>
          <div className="mt-1 text-2xl font-semibold">{queue.overview.draftReady}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">待审稿</div>
          <div className="mt-1 text-2xl font-semibold">{queue.overview.reviewReady}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">待二改</div>
          <div className="mt-1 text-2xl font-semibold">{queue.overview.secondPassReady}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">待导出</div>
          <div className="mt-1 text-2xl font-semibold">{queue.overview.exportReady}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">卡住</div>
          <div className="mt-1 text-2xl font-semibold">{queue.overview.blockedCards}</div>
        </div>
      </section>

      <section className="mb-6 rounded-md border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-medium">真实运行控制台</h2>
            <p className="mt-1 text-sm text-slate-600">{runConsole.verdict}</p>
          </div>
          <div className="rounded-md bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
            {runConsole.status === "healthy" ? "运行健康" : runConsole.status === "running" ? "任务运行中" : runConsole.status === "blocked" ? "需要复盘" : "等待首跑"}
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">运行中</div>
            <div className="mt-1 text-2xl font-semibold">{runConsole.summary.runningTasks}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">排队中</div>
            <div className="mt-1 text-2xl font-semibold">{runConsole.summary.queuedTasks}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">成功</div>
            <div className="mt-1 text-2xl font-semibold">{runConsole.summary.succeededTasks}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">失败</div>
            <div className="mt-1 text-2xl font-semibold">{runConsole.summary.failedTasks}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">可重试</div>
            <div className="mt-1 text-2xl font-semibold">{runConsole.summary.retryableFailures}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">疑似卡死</div>
            <div className="mt-1 text-2xl font-semibold">{runConsole.summary.staleRunningTasks}</div>
          </div>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-md border border-slate-200 p-3">
            <div className="mb-3 text-sm font-medium text-slate-950">运行下一步</div>
            <div className="grid gap-2 text-sm text-slate-600">
              {runConsole.nextActions.map((action, index) => (
                <div className="rounded-md bg-slate-50 p-2" key={action}>{index + 1}. {action}</div>
              ))}
            </div>
          </div>
          <div className="rounded-md border border-slate-200 p-3">
            <div className="mb-3 text-sm font-medium text-slate-950">任务类型负载</div>
            <div className="grid gap-2">
              {runConsole.taskTypeRows.slice(0, 5).map((row) => (
                <div className="rounded-md bg-slate-50 p-2 text-sm" key={row.taskType}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-950">{row.label}</span>
                    <span className="text-xs text-slate-500">{row.totalTasks} 次</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    运行 {row.runningTasks} · 失败 {row.failedTasks} · 成功 {row.succeededTasks}
                  </div>
                </div>
              ))}
              {runConsole.taskTypeRows.length === 0 ? <p className="text-sm text-slate-600">暂无运行数据。</p> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="mb-3 font-medium text-slate-950">失败重试队列</div>
          <div className="grid gap-3">
            {runConsole.retryCandidates.map((candidate) => (
              <div className="rounded-md bg-slate-50 p-3 text-sm" key={candidate.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={candidate.retryable ? "rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700" : "rounded-md bg-rose-100 px-2 py-1 text-xs font-medium text-rose-700"}>
                    {candidate.retryable ? "可先单章重试" : "先修配置"}
                  </span>
                  <span className="font-medium text-slate-950">{candidate.taskLabel}</span>
                </div>
                <div className="mt-2 text-slate-600">{candidate.projectTitle} · {candidate.chapterTitle}</div>
                <p className="mt-2 leading-6 text-slate-600">{candidate.errorMessage}</p>
                <p className="mt-1 leading-6 text-slate-500">{candidate.retryReason}</p>
                <Link className="mt-3 inline-flex rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-white" href={candidate.href}>
                  {candidate.actionLabel}
                </Link>
              </div>
            ))}
            {runConsole.retryCandidates.length === 0 ? <p className="text-sm text-slate-600">暂无失败任务需要重试。</p> : null}
          </div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="mb-3 font-medium text-slate-950">最近运行日志</div>
          <div className="grid gap-3">
            {runConsole.recentLogs.map((log) => (
              <Link className="rounded-md bg-slate-50 p-3 text-sm hover:bg-slate-100" href={log.href} key={log.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${runStatusClass(log.status)}`}>{log.statusLabel}</span>
                  <span className="font-medium text-slate-950">{log.taskLabel}</span>
                  <span className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString()}</span>
                </div>
                <div className="mt-2 text-slate-600">{log.projectTitle} · {log.chapterTitle}</div>
                <div className="mt-1 text-xs text-slate-500">{logMeta(log)}</div>
                {log.errorMessage ? <p className="mt-2 leading-6 text-rose-700">{log.errorMessage}</p> : null}
              </Link>
            ))}
            {runConsole.recentLogs.length === 0 ? <p className="text-sm text-slate-600">暂无运行日志。</p> : null}
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-md border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-medium">批量执行安全阀</h2>
            <p className="mt-1 text-sm text-slate-600">先看本批数量、混跑风险、并发占用和预算估算，再决定是否进入项目内执行。</p>
          </div>
          <div className="rounded-md bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
            {safety.canRunRecommendedBatch ? "建议批次可执行" : "建议先处理阻塞"}
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">推荐本批</div>
            <div className="mt-1 text-2xl font-semibold">{safety.recommendedBatchSize}/{safety.maxBatchSize}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">预计 Token</div>
            <div className="mt-1 text-2xl font-semibold">{safety.estimatedTokens}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">预计成本</div>
            <div className="mt-1 text-2xl font-semibold">${safety.estimatedCostUsd.toFixed(4)}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">预检项</div>
            <div className="mt-1 text-2xl font-semibold">{safety.items.filter((item) => item.status === "pass").length}/{safety.items.length}</div>
          </div>
        </div>
        <div className="mt-4 grid gap-2 lg:grid-cols-2">
          {safety.items.map((item) => (
            <div className="rounded-md border border-slate-200 p-3 text-sm" key={item.id}>
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-slate-950">{item.label}</div>
                <div className="text-xs text-slate-500">{item.status === "pass" ? "通过" : item.status === "warn" ? "提醒" : "阻止"}</div>
              </div>
              <p className="mt-1 leading-6 text-slate-600">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-3">
        {queue.items.map((entry) => (
          <div className="rounded-md border border-slate-200 bg-white p-4" key={entry.id}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${categoryClass(entry.category)}`}>{entry.label}</span>
                  <Link className="font-semibold text-slate-950 hover:underline" href={`/projects/${entry.projectId}`}>
                    {entry.projectTitle}
                  </Link>
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  {entry.platformName} · {entry.chapterTitle}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{entry.evidence}</p>
              </div>
              <Link className="w-fit rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50" href={entry.href}>
                {entry.actionLabel}
              </Link>
            </div>
          </div>
        ))}
        {queue.items.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
            当前没有可调度任务。先创建项目、补章节卡或生成正文。
          </p>
        ) : null}
      </section>
    </AppShell>
  );
}
