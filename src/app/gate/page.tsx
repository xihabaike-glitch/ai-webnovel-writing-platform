import Link from "next/link";
import { AppShell } from "@/components/app-shell/AppShell";
import { GateClosedLoopTimelinePanel } from "@/components/gate/GateClosedLoopTimelinePanel";
import { GateActionWorkspace } from "@/components/gate/GateActionWorkspace";
import { GateExportPackagePanel } from "@/components/gate/GateExportPackagePanel";
import { GatePublishEffectReviewPanel } from "@/components/gate/GatePublishEffectReviewPanel";
import { buildTaskBatchHistory } from "@/lib/ai/taskBatchHistory";
import { prisma } from "@/lib/db/prisma";
import { buildPrePublishGate, type PrePublishGateItem } from "@/lib/projects/prePublishGate";
import { parsePublishSnapshotTags } from "@/lib/projects/platformPublishExport";

export const dynamic = "force-dynamic";

function normalizeAssetAuditStatus(status: string): "ready" | "blocked" | "needs_work" {
  if (status === "ready" || status === "blocked") return status;
  return "needs_work";
}

function statusTone(status: string) {
  if (status === "ready") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "needs_repair") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "blocked") return "border-rose-200 bg-rose-50 text-rose-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function checkTone(status: PrePublishGateItem["status"]) {
  if (status === "pass") return "bg-emerald-50 text-emerald-700";
  if (status === "warn") return "bg-amber-50 text-amber-700";
  return "bg-rose-50 text-rose-700";
}

export default async function GatePage() {
  const [projects, recentAiTasks, chapters] = await Promise.all([
    prisma.project.findMany({
      include: {
        chapters: { orderBy: { order: "asc" } },
        aiTasks: { orderBy: { createdAt: "desc" } },
        publishSnapshots: { orderBy: { createdAt: "desc" }, take: 80 },
        submissionAssets: { orderBy: { updatedAt: "desc" } },
        submissionAssetVersions: { orderBy: { createdAt: "desc" }, take: 80 },
        platformPublishMetrics: { orderBy: { snapshotDate: "desc" }, take: 80 },
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
  const recentTasksWithChapter = recentAiTasks.map((task) => ({
    ...task,
    chapter: task.chapterId ? chaptersById.get(task.chapterId) ?? null : null,
  }));
  const gateProjects = projects.map((project) => ({
    ...project,
    submissionAssets: project.submissionAssets.map((asset) => ({
      id: asset.id,
      platformId: asset.platformId,
      platformName: asset.platformName,
      title: asset.title,
      logline: asset.logline,
      synopsis: asset.synopsis,
      overseasSynopsis: asset.overseasSynopsis,
      tags: parsePublishSnapshotTags(asset.tags),
      note: asset.note,
      source: asset.source,
      updatedAt: asset.updatedAt,
    })),
    submissionAssetVersions: project.submissionAssetVersions.map((version) => ({
      id: version.id,
      platformId: version.platformId,
      platformName: version.platformName,
      title: version.title,
      logline: version.logline,
      synopsis: version.synopsis,
      overseasSynopsis: version.overseasSynopsis,
      tags: parsePublishSnapshotTags(version.tags),
      note: version.note,
      source: version.source,
      auditScore: version.auditScore,
      auditStatus: normalizeAssetAuditStatus(version.auditStatus),
      action: version.action,
      sourceTaskId: version.sourceTaskId,
      strategy: version.strategy ?? undefined,
      createdAt: version.createdAt,
    })),
  }));
  const gate = buildPrePublishGate({
    projects: gateProjects,
    failureTasks: recentTasksWithChapter,
    batchHistory: buildTaskBatchHistory(recentTasksWithChapter),
  });

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">发布前总闸门</h1>
          <p className="mt-1 text-sm text-slate-600">{gate.verdict}</p>
        </div>
        <div className={`w-fit rounded-md border px-4 py-2 text-sm font-medium ${statusTone(gate.status)}`}>
          {gate.label} · {gate.score} 分
        </div>
      </div>

      <section className={`mb-6 rounded-md border p-4 ${statusTone(gate.status)}`}>
        <div className="text-lg font-semibold">{gate.headline}</div>
        <p className="mt-1 text-sm">{gate.status === "ready" ? "可以进入导出、保存基准和平台投放。" : "先按下面的优先动作处理，处理完再回到这里复检。"}</p>
      </section>

      <section className="mb-6 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">项目</div>
          <div className="mt-1 text-2xl font-semibold">{gate.overview.totalProjects}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">可发布</div>
          <div className="mt-1 text-2xl font-semibold">{gate.overview.readyPackages}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">待修复</div>
          <div className="mt-1 text-2xl font-semibold">{gate.overview.repairPackages}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">生产任务</div>
          <div className="mt-1 text-2xl font-semibold">{gate.overview.runnableTasks}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">阻塞项</div>
          <div className="mt-1 text-2xl font-semibold">{gate.overview.blockedTasks}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">失败任务</div>
          <div className="mt-1 text-2xl font-semibold">{gate.overview.failureTasks}</div>
        </div>
      </section>

      <GateExportPackagePanel packages={gate.projectStatuses} />

      <GatePublishEffectReviewPanel packages={gate.projectStatuses} />

      <GateClosedLoopTimelinePanel packages={gate.projectStatuses} />

      <section className="mb-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="mb-3 font-medium text-slate-950">四项总检</div>
          <div className="grid gap-2">
            {gate.items.map((item) => (
              <Link className="block rounded-md bg-slate-50 p-3 text-sm hover:bg-slate-100" href={item.href} key={item.id}>
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-slate-950">{item.label}</div>
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${checkTone(item.status)}`}>
                    {item.status === "pass" ? "通过" : item.status === "warn" ? "提醒" : "阻塞"}
                  </span>
                </div>
                <p className="mt-1 leading-6 text-slate-600">{item.detail}</p>
                <div className="mt-1 text-xs font-medium text-slate-500">{item.actionLabel}</div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="mb-3 font-medium text-slate-950">优先动作</div>
          <GateActionWorkspace actions={gate.priorityActions} />
        </div>
      </section>

      <section className="grid gap-3">
        <div className="font-medium text-slate-950">项目发布状态</div>
        {gate.projectStatuses.map((project) => (
          <Link className="rounded-md border border-slate-200 bg-white p-4 hover:bg-slate-50" href={project.href} key={project.projectId}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${project.status === "ready" ? "bg-emerald-50 text-emerald-700" : project.status === "empty" ? "bg-slate-100 text-slate-700" : "bg-rose-50 text-rose-700"}`}>
                    {project.label}
                  </span>
                  <span className="font-semibold text-slate-950">{project.projectTitle}</span>
                  <span className="text-sm text-slate-500">{project.platformName}</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {project.publishableChapters} 章可打包 · 阻塞 {project.blockedCount} 项 · 提醒 {project.warningCount} 项
                </p>
                <p className="mt-1 text-sm text-slate-500">{project.nextAction}</p>
              </div>
              <div className="shrink-0 rounded-md bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                质检 {project.preflightScore} 分 · {project.finalGateLabel}
              </div>
            </div>
          </Link>
        ))}
        {gate.projectStatuses.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
            还没有项目。先创建作品，再回到这里做发布前总检。
          </p>
        ) : null}
      </section>
    </AppShell>
  );
}
