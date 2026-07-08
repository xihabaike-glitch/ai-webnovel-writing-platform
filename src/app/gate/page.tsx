import Link from "next/link";
import { AppShell } from "@/components/app-shell/AppShell";
import { GateAiPromptMemoryQuickActionButton } from "@/components/gate/GateAiPromptMemoryQuickActionButton";
import { GateClosedLoopTimelinePanel } from "@/components/gate/GateClosedLoopTimelinePanel";
import { GateActionWorkspace } from "@/components/gate/GateActionWorkspace";
import { GateExportPackagePanel } from "@/components/gate/GateExportPackagePanel";
import { GateFirstThreeAdoptionPanel } from "@/components/gate/GateFirstThreeAdoptionPanel";
import { GatePlatformStrategyReviewPanel } from "@/components/gate/GatePlatformStrategyReviewPanel";
import { GatePriorityActionCard } from "@/components/gate/GatePriorityActionCard";
import { GatePublishEffectReviewPanel } from "@/components/gate/GatePublishEffectReviewPanel";
import { GateRecheckDispatchButton } from "@/components/gate/GateRecheckDispatchButton";
import { buildTaskBatchHistory } from "@/lib/ai/taskBatchHistory";
import { prisma } from "@/lib/db/prisma";
import { buildModelRoleMatrix, buildModelRoleMatrixPriorityBlocker } from "@/lib/model-gateway/modelRoleMatrix";
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

function aiRecoveryConclusionTone(status: NonNullable<ReturnType<typeof buildGateAiPipelineRecoveryPanel>["currentConclusion"]>["status"]) {
  if (status === "rollback") return "border-rose-200 bg-rose-50 text-rose-900";
  if (status === "watch") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-emerald-200 bg-emerald-50 text-emerald-900";
}

function recheckBlockerTone(priorityLabel: string) {
  if (priorityLabel === "优先处理") return "border-rose-100 bg-rose-50 text-rose-800";
  return "border-slate-100 bg-white text-slate-700";
}

function recheckVerdictTone(tone: "cleared" | "progress" | "stalled") {
  if (tone === "cleared") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (tone === "progress") return "border-blue-200 bg-blue-50 text-blue-900";
  return "border-amber-200 bg-amber-50 text-amber-900";
}

function recheckNextStepTone(tone: "release" | "dispatch" | "repair") {
  if (tone === "release") return "border-emerald-200 bg-white text-emerald-900 hover:bg-emerald-50";
  if (tone === "dispatch") return "border-blue-200 bg-white text-blue-900 hover:bg-blue-50";
  return "border-amber-200 bg-white text-amber-900 hover:bg-amber-50";
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

function isGateFocus(value: string | null) {
  return value === null || value === "first-day-complete" || value === "action-recheck";
}

function buildGateRecheckReturnHref(focus: string | null, projectId: string | null, actionId: string | null) {
  if (focus === "action-recheck") {
    const params = new URLSearchParams({ focus: "action-recheck" });
    if (projectId) params.set("projectId", projectId);
    if (actionId) params.set("actionId", actionId);

    return `/gate?${params.toString()}#gate-focus-notice`;
  }

  return null;
}

function hrefWithGateReturn(href: string, gateReturn: string | null) {
  if (!gateReturn || !href.startsWith("/") || href.startsWith("/gate")) return href;

  const hashIndex = href.indexOf("#");
  const base = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";
  if (base.includes("gateReturn=")) return href;
  const separator = base.includes("?") ? "&" : "?";

  return `${base}${separator}gateReturn=${encodeURIComponent(gateReturn)}${hash}`;
}

export default async function GatePage({
  searchParams,
}: {
  searchParams?: Promise<{ focus?: string | string[]; projectId?: string | string[]; actionId?: string | string[] }>;
}) {
  const params = await searchParams;
  const focus = Array.isArray(params?.focus) ? params?.focus[0] : params?.focus ?? null;
  const projectId = Array.isArray(params?.projectId) ? params?.projectId[0] : params?.projectId ?? null;
  const actionId = Array.isArray(params?.actionId) ? params?.actionId[0] : params?.actionId ?? null;
  const gateRecheckReturnHref = buildGateRecheckReturnHref(focus, projectId, actionId);
  const invalidFocusNotice = isGateFocus(focus)
    ? null
    : focus ? `总闸门焦点「${focus}」不存在，已显示总闸门全局验收。` : null;
  const [projects, recentAiTasks, chapters, aiRecoveryDispatchRecords, aiPromptMemoryAuditRecords, modelProviders] = await Promise.all([
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
    prisma.gateActionAudit.findMany({
      where: {
        OR: [
          { platformId: "ai-pipeline" },
          { payload: { contains: "aiPipelineControlPlan" } },
          { payload: { contains: "aiPipelinePromptMemoryControl" } },
          { payload: { contains: "aiPipelineRecheck" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.modelProvider.findMany({
      orderBy: { updatedAt: "desc" },
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
  const modelRoleMatrix = buildModelRoleMatrix(modelProviders.map((provider) => ({
    id: provider.id,
    providerId: provider.providerId,
    displayName: provider.displayName,
    encryptedApiKey: provider.encryptedApiKey,
    defaultModel: provider.defaultModel,
    enabled: provider.enabled,
    maxContextTokens: provider.maxContextTokens,
  })));
  const modelRolePriorityBlocker = buildModelRoleMatrixPriorityBlocker(modelRoleMatrix);
  const gate = buildPrePublishGate({
    projects: gateProjects,
    failureTasks: recentTasksWithChapter,
    batchHistory: buildTaskBatchHistory(recentTasksWithChapter),
    modelRoleBlocker: modelRolePriorityBlocker,
  });
  const focusNotice = buildPrePublishGateFocusNotice({ focus, projectId, actionId, gate });
  const aiRecoveryPanel = buildGateAiPipelineRecoveryPanel(
    aiRecoveryDispatchRecords.map(gatePlatformDispatchTaskFromRecord),
    aiPromptMemoryAuditRecords.map((audit) => ({
      receiptId: audit.receiptId,
      actionId: audit.actionId,
      projectId: audit.projectId,
      label: audit.label,
      detail: audit.detail,
      href: audit.href,
      status: audit.status,
      message: audit.message,
      executionType: audit.executionType,
      succeededCount: audit.succeededCount,
      failedCount: audit.failedCount,
      taskId: audit.taskId,
      platformId: audit.platformId,
      platformName: audit.platformName,
      recheckStatus: audit.recheckStatus,
      recheckLabel: audit.recheckLabel,
      recheckDetail: audit.recheckDetail,
      recheckAction: audit.recheckAction,
      payload: audit.payload,
      createdAt: audit.createdAt,
    })),
  );

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
            <a className="w-fit shrink-0 rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-950 hover:bg-slate-50" href={hrefWithGateReturn(gate.releaseAction.href, gateRecheckReturnHref)}>
              {gate.releaseAction.label}
            </a>
          ) : null}
        </div>
        {gate.releaseAction ? (
          <p className="mt-3 rounded-md bg-white/60 px-3 py-2 text-sm leading-6">{gate.releaseAction.detail}</p>
        ) : null}
      </section>

      <section className="mb-6 rounded-md border border-slate-900 bg-slate-950 p-4 text-white">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-medium text-slate-300">毒舌 PM 当前只验收这一项</div>
            <h2 className="mt-1 text-lg font-semibold">{gate.pmFocus.headline}</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-200">{gate.pmFocus.detail}</p>
            <div className="mt-2 text-xs text-slate-400">{gate.pmFocus.scopeLabel}</div>
            <div className="mt-2 rounded-md bg-white/10 px-3 py-2 text-xs leading-5 text-slate-200">
              {gate.pmFocus.pipelineValidationHint}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="w-fit rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-950 hover:bg-slate-100" href={hrefWithGateReturn(gate.pmFocus.actionHref, gateRecheckReturnHref)}>
              {gate.pmFocus.actionLabel}
            </Link>
            <Link className="w-fit rounded-md border border-white/25 px-3 py-2 text-sm font-medium text-white hover:bg-white/10" href={hrefWithGateReturn(gate.pmFocus.pipelineActionHref, gateRecheckReturnHref)}>
              {gate.pmFocus.pipelineActionLabel}
            </Link>
          </div>
        </div>
      </section>

      {invalidFocusNotice ? (
        <section className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="font-medium">焦点已回退</div>
              <p className="mt-1 text-sm leading-6">{invalidFocusNotice}</p>
            </div>
            <Link className="w-fit rounded-md bg-white px-3 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100" href="/gate">
              查看总闸门
            </Link>
          </div>
        </section>
      ) : null}

      {focusNotice.visible ? (
        <section className={`mb-6 rounded-md border p-4 ${focusNoticeTone(focusNotice.tone)}`} id="gate-focus-notice">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-lg font-semibold">{focusNotice.headline}</div>
              <p className="mt-1 text-sm leading-6">{focusNotice.detail}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {focusNotice.badges.map((badge) => (
                  <span className="rounded-md bg-white/70 px-2 py-1 font-medium" key={badge}>{badge}</span>
                ))}
              </div>
              {focusNotice.recheckSummary ? (
                <div className="mt-3 grid gap-2 rounded-md bg-white/70 p-3 text-sm text-slate-900 lg:grid-cols-[0.8fr_1.2fr]">
                  <div>
                    <div className="text-xs font-medium text-slate-500">项目验收单回填</div>
                    <div className="mt-1 font-semibold">{focusNotice.recheckSummary.title}</div>
                    <div className={`mt-2 rounded-md border px-2 py-2 text-xs leading-5 ${recheckVerdictTone(focusNotice.recheckSummary.recheckVerdict.tone)}`}>
                      <div className="font-medium">复检结论：{focusNotice.recheckSummary.recheckVerdict.label}</div>
                      <div className="mt-1">{focusNotice.recheckSummary.recheckVerdict.detail}</div>
                    </div>
                    <Link
                      className={`mt-2 block rounded-md border px-2 py-2 text-xs leading-5 ${recheckNextStepTone(focusNotice.recheckSummary.nextStep.tone)}`}
                      href={hrefWithGateReturn(focusNotice.recheckSummary.nextStep.href, gateRecheckReturnHref)}
                    >
                      <div className="font-medium">下一动作分流：{focusNotice.recheckSummary.nextStep.label}</div>
                      <div className="mt-1">{focusNotice.recheckSummary.nextStep.detail}</div>
                    </Link>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-md bg-slate-950 px-2 py-1 font-medium text-white">
                        已完成 {focusNotice.recheckSummary.completedSteps}/{focusNotice.recheckSummary.totalSteps} 步
                      </span>
                      <span className="rounded-md bg-white px-2 py-1 font-medium text-slate-700">
                        {focusNotice.recheckSummary.statusLabel}
                      </span>
                      <span className="rounded-md bg-white px-2 py-1 font-medium text-slate-700">
                        当前：{focusNotice.recheckSummary.currentStepLabel}
                      </span>
                    </div>
                    {focusNotice.recheckSummary.latestEvidence ? (
                      <p className="mt-2 text-xs leading-5 text-slate-600">
                        最近回填：{focusNotice.recheckSummary.latestEvidence}
                      </p>
                    ) : null}
                    {focusNotice.recheckSummary.roleClosureProgress ? (() => {
                      const roleClosureProgress = focusNotice.recheckSummary.roleClosureProgress;
                      return (
                        <div className="mt-2 rounded-md border border-slate-200 bg-white p-2 text-xs leading-5">
                          <div className="font-medium text-slate-700">角色闭环进度</div>
                          <div className="mt-1 font-semibold text-slate-950">{roleClosureProgress.headline}</div>
                          <div className="mt-2 grid gap-1">
                            {roleClosureProgress.lanes.map((lane) => (
                              <div className="rounded-md bg-slate-50 px-2 py-1" key={lane.id}>
                                <span className={`font-medium ${lane.status === "done" ? "text-emerald-700" : "text-amber-700"}`}>
                                  {lane.status === "done" ? "已回填" : "待补齐"} · {lane.label}
                                </span>
                                <span className="ml-1 text-slate-600">{lane.evidence}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })() : null}
                    {focusNotice.recheckSummary.nextDispatch ? (
                      <GateRecheckDispatchButton
                        dispatch={focusNotice.recheckSummary.nextDispatch}
                        dispatches={focusNotice.recheckSummary.nextDispatches}
                        gateReturnHref={gateRecheckReturnHref}
                      />
                    ) : null}
                  </div>
                  <div className="grid gap-2 text-xs leading-5 md:grid-cols-2">
                    <div>
                      <div className="font-medium text-slate-700">已补证据</div>
                      <div className="mt-1 grid gap-1">
                        {focusNotice.recheckSummary.completedEvidence.slice(-3).map((line) => (
                          <div className="rounded-md bg-white px-2 py-1" key={line}>{line}</div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-slate-700">剩余卡点</div>
                      <div className="mt-1 grid gap-1">
                        {focusNotice.recheckSummary.remainingBlockers.slice(0, 3).map((blocker) => (
                          <Link className={`rounded-md border px-2 py-1 ${recheckBlockerTone(blocker.priorityLabel)}`} href={hrefWithGateReturn(blocker.href, gateRecheckReturnHref)} key={`${blocker.priorityLabel}-${blocker.label}`}>
                            <span className="font-medium">{blocker.priorityLabel}</span>
                            <span className="ml-1">{blocker.label}：{blocker.evidence}</span>
                            <span className="ml-2 font-medium underline underline-offset-2">{blocker.actionLabel}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
            {focusNotice.primaryAction?.execution ? (
              <div className="w-full shrink-0 lg:max-w-sm">
                <GatePriorityActionCard action={focusNotice.primaryAction} index={0} />
              </div>
            ) : (
              <Link className="w-fit shrink-0 rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-950 hover:bg-slate-50" href={hrefWithGateReturn(focusNotice.primaryHref, gateRecheckReturnHref)}>
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
          <Link className="w-fit rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white" href={hrefWithGateReturn(gate.failureRepairBatch.primaryActionHref, gateRecheckReturnHref)}>
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

      <GateExportPackagePanel gateReturnHref={gateRecheckReturnHref} packages={gate.projectStatuses} />

      <section className="mb-6 rounded-md border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-medium text-slate-950">项目验收单联动</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              单本作品页卡在哪一步，总闸门就卡在哪一步；二改、派单回执和发布包缺证据时不允许放量。
            </p>
          </div>
          <Link className="w-fit rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50" href={hrefWithGateReturn("/projects#pipeline-projects", gateRecheckReturnHref)}>
            回项目流水线
          </Link>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {gate.projectStatuses.filter((project) => project.acceptanceSheetGate.status !== "pass").map((project) => (
            <Link className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm hover:bg-white" href={hrefWithGateReturn(project.acceptanceSheetGate.href, gateRecheckReturnHref)} key={project.projectId}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-slate-950">{project.projectTitle}</span>
                <span className="rounded-md bg-white px-2 py-1 text-xs text-slate-600">{project.platformName}</span>
                <span className={`rounded-md px-2 py-1 text-xs font-medium ${checkTone(project.acceptanceSheetGate.status)}`}>
                  {project.acceptanceSheetGate.label}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-600">{project.acceptanceSheetGate.detail}</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">{project.acceptanceSheetGate.executionHint}</p>
              <div className="mt-2 text-xs font-medium text-slate-950">{project.acceptanceSheetGate.actionLabel}</div>
            </Link>
          ))}
          {gate.projectStatuses.filter((project) => project.acceptanceSheetGate.status !== "pass").length === 0 ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              单本作品验收单已全部闭合，可以继续看发布包、版本基线和平台反馈。
            </div>
          ) : null}
        </div>
      </section>

      <GateFirstThreeAdoptionPanel closure={gate.firstThreeAdoptionClosure} gateReturnHref={gateRecheckReturnHref} />

      <GatePublishEffectReviewPanel gateReturnHref={gateRecheckReturnHref} packages={gate.projectStatuses} />

      <GatePlatformStrategyReviewPanel gateReturnHref={gateRecheckReturnHref} review={gate.strategyReview} />

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
            <Link className="w-fit shrink-0 rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-950 hover:bg-slate-50" href={hrefWithGateReturn(aiRecoveryPanel.primaryAction.href, gateRecheckReturnHref)}>
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
          {aiRecoveryPanel.currentConclusion ? (
            <Link
              className={`mt-3 block rounded-md border p-3 text-sm hover:bg-white ${aiRecoveryConclusionTone(aiRecoveryPanel.currentConclusion.status)}`}
              href={hrefWithGateReturn(aiRecoveryPanel.currentConclusion.href, gateRecheckReturnHref)}
            >
              <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">本轮结论</span>
                    <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-medium">
                      {aiRecoveryPanel.currentConclusion.label}
                    </span>
                    <span className="rounded-md bg-white/70 px-2 py-1 text-xs">
                      {shortDateTime(aiRecoveryPanel.currentConclusion.latestAt)}
                    </span>
                  </div>
                  <div className="mt-2 text-xs font-medium">{aiRecoveryPanel.currentConclusion.headline}</div>
                  <p className="mt-1 text-xs leading-5 opacity-80">{aiRecoveryPanel.currentConclusion.detail}</p>
                </div>
                <span className="w-fit shrink-0 rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white">
                  {aiRecoveryPanel.currentConclusion.primaryActionLabel}
                </span>
              </div>
            </Link>
          ) : null}
          {aiRecoveryPanel.latestEvidence ? (
            <Link className="mt-3 block rounded-md border border-white/70 bg-white/80 p-3 text-sm hover:bg-white" href={hrefWithGateReturn(aiRecoveryPanel.latestEvidence.href, gateRecheckReturnHref)}>
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
          {aiRecoveryPanel.promptMemory.visible ? (
            <div className="mt-3 rounded-md border border-white/70 bg-white/80 p-3 text-sm">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">提示词反馈历史</span>
                    <span className="rounded-md bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700">
                      {aiRecoveryPanel.promptMemory.statusLabel}
                    </span>
                    <span className="rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-700">
                      {shortDateTime(aiRecoveryPanel.promptMemory.latestAt)}
                    </span>
                  </div>
                  <div className="mt-2 text-xs font-medium">{aiRecoveryPanel.promptMemory.headline}</div>
                  <p className="mt-1 text-xs leading-5 opacity-75">{aiRecoveryPanel.promptMemory.detail}</p>
                </div>
                {aiRecoveryPanel.promptMemory.quickAction ? (
                  <GateAiPromptMemoryQuickActionButton action={aiRecoveryPanel.promptMemory.quickAction} gateReturnHref={gateRecheckReturnHref} />
                ) : aiRecoveryPanel.promptMemory.actionHref && aiRecoveryPanel.promptMemory.actionLabel ? (
                  <Link className="w-fit shrink-0 rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white" href={hrefWithGateReturn(aiRecoveryPanel.promptMemory.actionHref, gateRecheckReturnHref)}>
                    {aiRecoveryPanel.promptMemory.actionLabel}
                  </Link>
                ) : aiRecoveryPanel.promptMemory.actionLabel ? (
                  <span className="w-fit shrink-0 rounded-md bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700">
                    {aiRecoveryPanel.promptMemory.actionLabel}
                  </span>
                ) : null}
              </div>
              <div className="mt-3 grid gap-2 lg:grid-cols-3">
                {aiRecoveryPanel.promptMemory.history.slice(0, 3).map((item) => (
                  <div className="rounded-md bg-white px-2 py-2 text-xs leading-5" key={`${item.latestAt}-${item.sourceLabel}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-slate-50 px-2 py-1 font-medium text-slate-700">{item.statusLabel}</span>
                      <span className="text-slate-600">{item.transitionLabel}</span>
                    </div>
                    <div className="mt-2 font-medium">{item.sourceLabel}</div>
                    <p className="mt-1 line-clamp-2 opacity-75">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="mt-3 grid gap-2 lg:grid-cols-3">
            {aiRecoveryPanel.groups.map((group) => (
              <Link className="rounded-md border border-white/70 bg-white/70 p-3 text-sm hover:bg-white" href={hrefWithGateReturn(group.actionHref, gateRecheckReturnHref)} key={group.id}>
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

      <GateClosedLoopTimelinePanel gateReturnHref={gateRecheckReturnHref} packages={gate.projectStatuses} />

      <section className="mb-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="mb-3 font-medium text-slate-950">总检卡</div>
          <div className="grid gap-2">
            {gate.items.map((item) => (
              <Link className="block rounded-md bg-slate-50 p-3 text-sm hover:bg-slate-100" href={hrefWithGateReturn(item.href, gateRecheckReturnHref)} key={item.id}>
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
          <GateActionWorkspace actions={gate.priorityActions} failureRepairBatch={gate.failureRepairBatch} gateReturnHref={gateRecheckReturnHref} />
        </div>
      </section>

      <section className="grid gap-3">
        <div className="font-medium text-slate-950">项目发布状态</div>
        {gate.projectStatuses.map((project) => (
          <Link className="rounded-md border border-slate-200 bg-white p-4 hover:bg-slate-50" href={hrefWithGateReturn(project.href, gateRecheckReturnHref)} key={project.projectId}>
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
