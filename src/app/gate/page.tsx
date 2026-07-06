import Link from "next/link";
import { AppShell } from "@/components/app-shell/AppShell";
import { GateClosedLoopTimelinePanel } from "@/components/gate/GateClosedLoopTimelinePanel";
import { GateActionWorkspace } from "@/components/gate/GateActionWorkspace";
import { GateExportPackagePanel } from "@/components/gate/GateExportPackagePanel";
import { GateFirstThreeAdoptionPanel } from "@/components/gate/GateFirstThreeAdoptionPanel";
import { GatePlatformStrategyReviewPanel } from "@/components/gate/GatePlatformStrategyReviewPanel";
import { GatePriorityActionCard } from "@/components/gate/GatePriorityActionCard";
import { GatePublishEffectReviewPanel } from "@/components/gate/GatePublishEffectReviewPanel";
import { buildTaskBatchHistory } from "@/lib/ai/taskBatchHistory";
import { prisma } from "@/lib/db/prisma";
import { buildGateAiPipelineRecoveryPanel } from "@/lib/projects/gateActionReceipts";
import { gatePlatformDispatchTaskFromRecord } from "@/lib/projects/gateDispatchTaskRecords";
import { buildPrePublishGate, buildPrePublishGateFocusNotice, type PrePublishGateFocusNotice, type PrePublishGateItem } from "@/lib/projects/prePublishGate";
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

function focusNoticeTone(tone: PrePublishGateFocusNotice["tone"]) {
  if (tone === "ready") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (tone === "blocked") return "border-rose-200 bg-rose-50 text-rose-900";
  return "border-amber-200 bg-amber-50 text-amber-900";
}

function repairBatchTone(status: ReturnType<typeof buildPrePublishGate>["failureRepairBatch"]["status"]) {
  if (status === "clear") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "retry_sample") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-rose-200 bg-rose-50 text-rose-800";
}

function aiRecoveryTone(status: ReturnType<typeof buildGateAiPipelineRecoveryPanel>["status"]) {
  if (status === "blocked") return "border-rose-200 bg-rose-50 text-rose-900";
  if (status === "watch") return "border-amber-200 bg-amber-50 text-amber-900";
  if (status === "ready") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  return "border-slate-200 bg-white text-slate-700";
}

function shortDateTime(value: string | null) {
  if (!value) return "未记录时间";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function GatePage({
  searchParams,
}: {
  searchParams?: Promise<{ focus?: string | string[] }>;
}) {
  const params = await searchParams;
  const focus = Array.isArray(params?.focus) ? params?.focus[0] : params?.focus ?? null;
  const [projects, recentAiTasks, chapters, aiRecoveryDispatchRecords] = await Promise.all([
    prisma.project.findMany({
      include: {
        chapters: { orderBy: { order: "asc" } },
        aiTasks: { orderBy: { createdAt: "desc" } },
        worldEntries: { orderBy: [{ type: "asc" }, { createdAt: "asc" }] },
        gateDispatchTasks: {
          where: {
            OR: [
              { dispatchKey: { startsWith: "first-day:" } },
              { dispatchKey: { startsWith: "first-three-adoption:" } },
            ],
          },
          select: {
            dispatchKey: true,
            platformId: true,
            state: true,
            completionEvidence: true,
            title: true,
            detail: true,
            actionLabel: true,
            href: true,
          },
        },
        gateActionAudits: {
          where: { executionType: { in: ["recommended_batch", "export_version"] } },
          orderBy: { createdAt: "desc" },
          take: 80,
          select: {
            actionId: true,
            executionType: true,
            status: true,
            succeededCount: true,
            failedCount: true,
            taskId: true,
            platformId: true,
            label: true,
            message: true,
            payload: true,
            createdAt: true,
          },
        },
        publishSnapshots: { orderBy: { createdAt: "desc" }, take: 80 },
        exportPackageSnapshots: { orderBy: { createdAt: "desc" }, take: 120 },
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
    prisma.gateDispatchTask.findMany({
      where: {
        OR: [
          { platformId: "ai-pipeline" },
          { dispatchKey: { startsWith: "ai-pipeline-recheck:" } },
          { dispatchKey: { startsWith: "ai-pipeline:" } },
        ],
      },
      orderBy: [{ state: "asc" }, { priorityScore: "desc" }, { updatedAt: "desc" }],
      take: 80,
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
  const focusNotice = buildPrePublishGateFocusNotice({ focus, gate });
  const aiRecoveryPanel = buildGateAiPipelineRecoveryPanel(aiRecoveryDispatchRecords.map(gatePlatformDispatchTaskFromRecord));

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
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-lg font-semibold">{gate.headline}</div>
            <p className="mt-1 text-sm">{gate.status === "ready" ? "可以进入导出、保存基准和平台投放。" : "先按下面的优先动作处理，处理完再回到这里复检。"}</p>
          </div>
          {gate.releaseAction ? (
            <a className="w-fit shrink-0 rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-950 hover:bg-slate-50" href={gate.releaseAction.href}>
              {gate.releaseAction.label}
            </a>
          ) : null}
        </div>
        {gate.releaseAction ? (
          <p className="mt-3 rounded-md bg-white/60 px-3 py-2 text-sm leading-6">{gate.releaseAction.detail}</p>
        ) : null}
      </section>

      {focusNotice.visible ? (
        <section className={`mb-6 rounded-md border p-4 ${focusNoticeTone(focusNotice.tone)}`} id="first-day-complete-focus">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-lg font-semibold">{focusNotice.headline}</div>
              <p className="mt-1 text-sm leading-6">{focusNotice.detail}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {focusNotice.badges.map((badge) => (
                  <span className="rounded-md bg-white/70 px-2 py-1 font-medium" key={badge}>{badge}</span>
                ))}
              </div>
            </div>
            {focusNotice.primaryAction?.execution ? (
              <div className="w-full shrink-0 lg:max-w-sm">
                <GatePriorityActionCard action={focusNotice.primaryAction} index={0} />
              </div>
            ) : (
              <Link className="w-fit shrink-0 rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-950 hover:bg-slate-50" href={focusNotice.primaryHref}>
                {focusNotice.primaryLabel}
              </Link>
            )}
          </div>
        </section>
      ) : null}

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

      <section className={`mb-6 rounded-md border p-4 ${repairBatchTone(gate.failureRepairBatch.status)}`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-medium">失败修复批次</h2>
            <p className="mt-1 text-sm leading-6">{gate.failureRepairBatch.title}：{gate.failureRepairBatch.detail}</p>
          </div>
          <Link className="w-fit rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white" href={gate.failureRepairBatch.primaryActionHref}>
            {gate.failureRepairBatch.primaryActionLabel}
          </Link>
        </div>
        <div className="mt-3 grid gap-2 text-sm md:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-md bg-white/70 px-3 py-2">未恢复 {gate.failureRepairBatch.summary.unresolvedFailures}</div>
          <div className="rounded-md bg-white/70 px-3 py-2">配置类 {gate.failureRepairBatch.summary.configFailures}</div>
          <div className="rounded-md bg-white/70 px-3 py-2">可重试 {gate.failureRepairBatch.summary.retryableFailures}</div>
          <div className="rounded-md bg-white/70 px-3 py-2">人工复盘 {gate.failureRepairBatch.summary.manualFailures}</div>
          <div className="rounded-md bg-white/70 px-3 py-2">项目 {gate.failureRepairBatch.summary.affectedProjects}</div>
          <div className="rounded-md bg-white/70 px-3 py-2">模型 {gate.failureRepairBatch.summary.affectedProviders}</div>
        </div>
      </section>

      <GateExportPackagePanel packages={gate.projectStatuses} />

      <GateFirstThreeAdoptionPanel closure={gate.firstThreeAdoptionClosure} />

      <GatePublishEffectReviewPanel packages={gate.projectStatuses} />

      <GatePlatformStrategyReviewPanel review={gate.strategyReview} />

      {aiRecoveryPanel.visible ? (
        <section className={`mb-6 rounded-md border p-4 ${aiRecoveryTone(aiRecoveryPanel.status)}`} id={aiRecoveryPanel.anchorId}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-medium">{aiRecoveryPanel.headline}</h2>
                <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-medium">{aiRecoveryPanel.label}</span>
              </div>
              <p className="mt-1 max-w-3xl text-sm leading-6">{aiRecoveryPanel.detail}</p>
            </div>
            <Link className="w-fit shrink-0 rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-950 hover:bg-slate-50" href={aiRecoveryPanel.primaryAction.href}>
              {aiRecoveryPanel.primaryAction.label}
            </Link>
          </div>
          <div className="mt-3 grid gap-2 text-sm md:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-md bg-white/70 px-3 py-2">总派单 {aiRecoveryPanel.summary.total}</div>
            <div className="rounded-md bg-white/70 px-3 py-2">未闭环 {aiRecoveryPanel.summary.active}</div>
            <div className="rounded-md bg-white/70 px-3 py-2">已闭环 {aiRecoveryPanel.summary.completed}</div>
            <div className="rounded-md bg-white/70 px-3 py-2">回滚 {aiRecoveryPanel.summary.rollback}</div>
            <div className="rounded-md bg-white/70 px-3 py-2">复验 {aiRecoveryPanel.summary.sample}</div>
            <div className="rounded-md bg-white/70 px-3 py-2">小批 {aiRecoveryPanel.summary.smallBatch}</div>
          </div>
          {aiRecoveryPanel.latestEvidence ? (
            <Link className="mt-3 block rounded-md border border-white/70 bg-white/80 p-3 text-sm hover:bg-white" href={aiRecoveryPanel.latestEvidence.href}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium">{aiRecoveryPanel.latestEvidence.label}</div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700">
                    {aiRecoveryPanel.latestEvidence.feedback.statusLabel}
                  </span>
                  <span className="rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-700">
                    {shortDateTime(aiRecoveryPanel.latestEvidence.completedAt)}
                  </span>
                </div>
              </div>
              <div className="mt-2 text-xs font-medium">{aiRecoveryPanel.latestEvidence.feedback.headline}</div>
              <p className="mt-1 text-xs leading-5 opacity-75">{aiRecoveryPanel.latestEvidence.feedback.detail}</p>
              <div className="mt-2 w-fit rounded-md bg-slate-950 px-2 py-1 text-xs font-medium text-white">
                {aiRecoveryPanel.latestEvidence.feedback.primaryActionLabel}
              </div>
              <div className="mt-2 grid gap-1 text-xs leading-5">
                {aiRecoveryPanel.latestEvidence.evidence.slice(0, 3).map((line) => (
                  <div className="rounded-md bg-white px-2 py-1" key={line}>{line}</div>
                ))}
              </div>
            </Link>
          ) : null}
          <div className="mt-3 grid gap-2 lg:grid-cols-3">
            {aiRecoveryPanel.groups.map((group) => (
              <Link className="rounded-md border border-white/70 bg-white/70 p-3 text-sm hover:bg-white" href={group.actionHref} key={group.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{group.label}</span>
                  <span className="rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-700">活跃 {group.active}/{group.total}</span>
                </div>
                <div className="mt-2 text-xs font-medium">{group.headline}</div>
                <p className="mt-1 line-clamp-2 leading-6 opacity-80">{group.detail}</p>
                <div className="mt-3 rounded-md bg-white px-2 py-2 text-xs">
                  <div className="font-medium">{group.topTaskTitle}</div>
                  <div className="mt-1 opacity-75">{group.actionLabel}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <GateClosedLoopTimelinePanel packages={gate.projectStatuses} />

      <section className="mb-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="mb-3 font-medium text-slate-950">总检卡</div>
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
          <GateActionWorkspace actions={gate.priorityActions} failureRepairBatch={gate.failureRepairBatch} />
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
