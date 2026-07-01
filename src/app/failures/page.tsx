import Link from "next/link";
import { AppShell } from "@/components/app-shell/AppShell";
import { prisma } from "@/lib/db/prisma";
import { buildFailureReviewCenter } from "@/lib/ai/failureReviewCenter";

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
  const [tasks, chapters] = await Promise.all([
    prisma.aiTask.findMany({
      where: { status: "failed" },
      include: {
        project: { select: { title: true } },
        modelProvider: { select: { providerId: true, displayName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.chapter.findMany({
      select: { id: true, title: true },
    }),
  ]);
  const chaptersById = new Map(chapters.map((chapter) => [chapter.id, chapter]));
  const center = buildFailureReviewCenter(tasks.map((task) => ({
    ...task,
    chapter: task.chapterId ? chaptersById.get(task.chapterId) ?? null : null,
  })));

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">失败任务复盘</h1>
        <p className="mt-1 text-sm text-slate-600">按错误原因、模型、任务类型和项目聚合失败，先修配置和提示词，再重试。</p>
      </div>

      <section className="mb-6 grid gap-3 md:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">失败任务</div>
          <div className="mt-1 text-2xl font-semibold">{center.summary.totalFailures}</div>
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
                  <Link className="font-semibold text-slate-950 hover:underline" href={failure.href}>{failure.projectTitle}</Link>
                  <span className="text-sm text-slate-500">{failure.taskLabel}</span>
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  {failure.chapterTitle} · {failure.providerName} · {failure.model} · {new Date(failure.createdAt).toLocaleString()}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{failure.errorMessage}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">{failure.suggestion}</p>
              </div>
              <div className="shrink-0 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
                {failure.retryable ? "可单章重试" : "先修配置"}
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
