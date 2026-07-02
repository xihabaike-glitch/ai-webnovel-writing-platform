import Link from "next/link";
import { AppShell } from "@/components/app-shell/AppShell";
import { RetryTaskButton } from "@/components/tasks/RetryTaskButton";
import { RunRecommendedBatchButton } from "@/components/tasks/RunRecommendedBatchButton";
import { buildTaskBatchHistory } from "@/lib/ai/taskBatchHistory";
import { buildTaskRunConsole, type TaskRunLog } from "@/lib/ai/taskRunConsole";
import { prisma } from "@/lib/db/prisma";
import { buildBatchExecutionSafety } from "@/lib/projects/batchExecutionSafety";
import { buildBatchStrategyComparison, buildBatchStrategyDecision } from "@/lib/projects/batchStrategyComparison";
import { batchExecutionStrategies, getBatchExecutionStrategy } from "@/lib/projects/batchExecutionStrategy";
import { buildTaskQueueCenter, type QueueItem } from "@/lib/projects/taskQueueCenter";
import { buildTaskQueueExecutionPlan } from "@/lib/projects/taskQueueExecutionPlan";

export const dynamic = "force-dynamic";

function categoryClass(category: QueueItem["category"]) {
  if (category === "review") return "bg-blue-50 text-blue-700";
  if (category === "second_pass") return "bg-amber-50 text-amber-700";
  if (category === "draft") return "bg-emerald-50 text-emerald-700";
  if (category === "export") return "bg-slate-100 text-slate-700";
  return "bg-rose-50 text-rose-700";
}

function blockerTypeLabel(entry: QueueItem) {
  if (entry.blockerType === "publish_repair") return "发布阻塞";
  if (entry.blockerType === "chapter_card") return "章节卡住";
  return entry.label;
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

function usd(value: number) {
  return `$${value.toFixed(4)}`;
}

function batchTone(successRate: number, failedTasks: number, runningTasks: number) {
  if (runningTasks > 0) return "border-blue-200 bg-blue-50 text-blue-800";
  if (failedTasks > 0 || successRate < 80) return "border-rose-200 bg-rose-50 text-rose-800";
  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

export default async function TasksPage({ searchParams }: { searchParams?: Promise<{ batchStrategy?: string }> }) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const activeStrategy = getBatchExecutionStrategy(resolvedSearchParams.batchStrategy);
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
  const safety = buildBatchExecutionSafety(queue.items, projects, activeStrategy);
  const executionPlan = buildTaskQueueExecutionPlan(queue.items, activeStrategy.maxBatchSize, activeStrategy);
  const runConsole = buildTaskRunConsole(recentAiTasks.map((task) => ({
    ...task,
    chapter: task.chapterId ? chaptersById.get(task.chapterId) ?? null : null,
  })));
  const batchHistory = buildTaskBatchHistory(recentAiTasks.map((task) => ({
    ...task,
    chapter: task.chapterId ? chaptersById.get(task.chapterId) ?? null : null,
  })));
  const strategyComparison = buildBatchStrategyComparison(queue.items, projects, batchHistory);
  const strategyDecision = buildBatchStrategyDecision(strategyComparison, activeStrategy.id);

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
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">发布阻塞</div>
          <div className="mt-1 text-2xl font-semibold">{queue.overview.publishBlocked}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">章节卡住</div>
          <div className="mt-1 text-2xl font-semibold">{queue.overview.chapterCardBlocked}</div>
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
                {candidate.directRetrySupported ? (
                  <RetryTaskButton taskId={candidate.id} />
                ) : (
                  <Link className="mt-3 inline-flex rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-white" href={candidate.href}>
                    {candidate.actionLabel}
                  </Link>
                )}
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
            <p className="mt-1 text-sm text-slate-600">先看本批数量、混跑风险、并发占用和预算估算，再一键执行推荐小批次。</p>
          </div>
          <div className="flex flex-col gap-2 lg:items-end">
            <div className="rounded-md bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
              {safety.canRunRecommendedBatch && executionPlan.canRun ? "建议批次可执行" : "建议先处理阻塞"}
            </div>
            <RunRecommendedBatchButton disabled={!safety.canRunRecommendedBatch || !executionPlan.canRun} strategyId={activeStrategy.id} />
          </div>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-3">
          {batchExecutionStrategies.map((strategy) => (
            <Link
              className={`rounded-md border p-3 text-sm ${strategy.id === activeStrategy.id ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white hover:bg-slate-50"}`}
              href={`/tasks?batchStrategy=${strategy.id}`}
              key={strategy.id}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{strategy.label}档</span>
                <span className={strategy.id === activeStrategy.id ? "text-xs text-slate-200" : "text-xs text-slate-500"}>{strategy.maxBatchSize} 个上限</span>
              </div>
              <p className={strategy.id === activeStrategy.id ? "mt-2 leading-6 text-slate-200" : "mt-2 leading-6 text-slate-600"}>{strategy.description}</p>
              <div className={strategy.id === activeStrategy.id ? "mt-2 text-xs text-slate-200" : "mt-2 text-xs text-slate-500"}>
                Token {strategy.maxEstimatedTokens} · {strategy.allowCrossProject ? "允许跨项目" : "单项目优先"}
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-sm font-medium text-slate-950">PM 决策卡</div>
              <p className="mt-1 text-sm font-medium text-slate-950">{strategyDecision.title}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">{strategyDecision.detail}</p>
            </div>
            {strategyDecision.status === "ready" ? (
              <RunRecommendedBatchButton disabled={!strategyDecision.canRun} strategyId={strategyDecision.strategyId} />
            ) : (
              <Link className="w-fit rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white" href={strategyDecision.actionHref}>
                {strategyDecision.actionLabel}
              </Link>
            )}
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {strategyDecision.riskNotes.map((note) => (
              <div className="rounded-md bg-white px-3 py-2 text-xs text-slate-600" key={note}>{note}</div>
            ))}
          </div>
        </div>
        <div className="mt-4 rounded-md border border-slate-200 p-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-sm font-medium text-slate-950">策略效果对比</div>
              <p className="mt-1 text-sm leading-6 text-slate-600">{strategyComparison.headline}</p>
            </div>
            <Link className="w-fit rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50" href={`/tasks?batchStrategy=${strategyComparison.recommendedStrategyId}`}>
              切到推荐档
            </Link>
          </div>
          <div className="mt-3 grid gap-2 lg:grid-cols-3">
            {strategyComparison.rows.map((row) => (
              <div className="rounded-md bg-slate-50 p-3 text-sm" key={row.strategy.id}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-950">{row.strategy.label}档</span>
                  <span className={row.strategy.id === strategyComparison.recommendedStrategyId ? "rounded-md bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700" : "text-xs text-slate-500"}>
                    {row.strategy.id === strategyComparison.recommendedStrategyId ? "推荐" : row.canRun ? "可用" : "先别用"}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div>本批 {row.recommendedBatchSize}/{row.maxBatchSize}</div>
                  <div>预测成功 {row.predictedSuccessRatePercent}%</div>
                  <div>质量 {row.recentAverageQualityScore ?? "缺"}</div>
                  <div>成本 {usd(row.estimatedCostUsd || row.recentAverageCostUsd)}</div>
                  <div>提醒 {row.warnChecks}</div>
                  <div>阻止 {row.blockChecks}</div>
                </div>
                <p className="mt-2 leading-6 text-slate-600">{row.verdict}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
          <div className="font-medium text-slate-950">{executionPlan.actionLabel}</div>
          <p className="mt-1 leading-6 text-slate-600">{executionPlan.detail}</p>
          {executionPlan.warnings.length ? (
            <div className="mt-2 grid gap-1 text-xs text-amber-700">
              {executionPlan.warnings.map((warning) => (
                <div key={warning}>{warning}</div>
              ))}
            </div>
          ) : null}
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

      <section className="mb-6 rounded-md border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-medium">最近批量回执</h2>
            <p className="mt-1 text-sm text-slate-600">按同项目、同动作、短时间连续运行自动归批，复盘成功率、成本、质量和下一步。</p>
          </div>
          <div className="rounded-md bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
            {batchHistory.length ? `${batchHistory.length} 批可复盘` : "等待批量样本"}
          </div>
        </div>
        <div className="mt-4 grid gap-3">
          {batchHistory.map((batch) => (
            <div className="rounded-md border border-slate-200 p-3 text-sm" key={batch.id}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-md border px-2 py-1 text-xs font-medium ${batchTone(batch.summary.successRatePercent, batch.summary.failedTasks, batch.runningTasks)}`}>
                      成功率 {batch.summary.successRatePercent}%
                    </span>
                    <Link className="font-medium text-slate-950 hover:underline" href={batch.href}>{batch.taskLabel}</Link>
                    <span className="text-xs text-slate-500">{new Date(batch.startedAt).toLocaleString()}</span>
                  </div>
                  <div className="mt-2 text-slate-600">{batch.projectTitle} · {batch.chapterTitles.join("、")}</div>
                  <p className="mt-2 leading-6 text-slate-600">{batch.summary.verdict}</p>
                  <p className="mt-1 leading-6 text-slate-500">{batch.nextAction}</p>
                  {batch.failedSamples.length ? (
                    <div className="mt-2 grid gap-1 text-xs text-rose-700">
                      {batch.failedSamples.map((sample) => (
                        <div key={sample}>{sample}</div>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {batch.repairActions.map((action) => (
                      action.kind === "retry_failed" && action.taskId ? (
                        <div className="flex flex-wrap items-center gap-2" key={action.id}>
                          <span className="text-xs font-medium text-slate-500" title={action.detail}>{action.label}</span>
                          <RetryTaskButton className="flex flex-wrap items-center gap-2" taskId={action.taskId} />
                        </div>
                      ) : (
                        <Link className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50" href={action.href} key={action.id} title={action.detail}>
                          {action.label}
                        </Link>
                      )
                    ))}
                  </div>
                </div>
                <div className="grid min-w-56 gap-1 rounded-md bg-slate-50 p-3 text-xs text-slate-600">
                  <div>任务 {batch.summary.totalTasks} · 未落地 {batch.runningTasks}</div>
                  <div>成本 {usd(batch.summary.knownCostUsd)} · Token {batch.summary.totalTokens}</div>
                  <div>质量 {batch.summary.averageQualityScore ?? "缺"} · 备用 {batch.summary.fallbackTasks}</div>
                  <div>{batch.summary.providerLabels.join(" / ") || "暂无模型路线"}</div>
                </div>
              </div>
            </div>
          ))}
          {batchHistory.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-300 p-3 text-sm text-slate-600">
              还没有可归因的批量写审改记录。先执行一次推荐小批次，这里会自动生成回执。
            </p>
          ) : null}
        </div>
      </section>

      <section className="grid gap-3">
        {queue.items.map((entry) => (
          <div className="rounded-md border border-slate-200 bg-white p-4" key={entry.id}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${categoryClass(entry.category)}`}>{blockerTypeLabel(entry)}</span>
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
