import Link from "next/link";
import { AppShell } from "@/components/app-shell/AppShell";
import { prisma } from "@/lib/db/prisma";
import { buildTaskQueueCenter, type QueueItem } from "@/lib/projects/taskQueueCenter";

function categoryClass(category: QueueItem["category"]) {
  if (category === "review") return "bg-blue-50 text-blue-700";
  if (category === "second_pass") return "bg-amber-50 text-amber-700";
  if (category === "draft") return "bg-emerald-50 text-emerald-700";
  if (category === "export") return "bg-slate-100 text-slate-700";
  return "bg-rose-50 text-rose-700";
}

export default async function TasksPage() {
  const projects = await prisma.project.findMany({
    include: {
      chapters: { orderBy: { order: "asc" } },
      aiTasks: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { updatedAt: "desc" },
  });
  const queue = buildTaskQueueCenter(projects);

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
