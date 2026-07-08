import Link from "next/link";
import { AppShell } from "@/components/app-shell/AppShell";
import { CompleteTaskDebtEvidenceForm } from "@/components/tasks/CompleteTaskDebtEvidenceForm";
import { CompleteTacticExperienceFollowupForm } from "@/components/tasks/CompleteTacticExperienceFollowupForm";
import { CreateBatchRhythmDispatchButton } from "@/components/tasks/CreateBatchRhythmDispatchButton";
import { RetryTaskButton } from "@/components/tasks/RetryTaskButton";
import { RunRecommendedBatchButton } from "@/components/tasks/RunRecommendedBatchButton";
import { RunPublishEffectQueueActionButton } from "@/components/tasks/RunPublishEffectQueueActionButton";
import { buildTaskBatchHistory } from "@/lib/ai/taskBatchHistory";
import { buildTaskRunConsole, type TaskRunLog } from "@/lib/ai/taskRunConsole";
import { prisma } from "@/lib/db/prisma";
import { buildModelRoleMatrix, buildModelRoleMatrixPriorityBlocker } from "@/lib/model-gateway/modelRoleMatrix";
import { buildRouteConfirmationRecheckEvidenceFromDispatchTasks } from "@/lib/model-gateway/routeConfirmation";
import { buildBatchExecutionSafety, buildBatchSafetyPriorityBlocker } from "@/lib/projects/batchExecutionSafety";
import { buildBatchStrategyComparison, buildBatchStrategyDecision } from "@/lib/projects/batchStrategyComparison";
import { batchExecutionStrategies, getBatchExecutionStrategy } from "@/lib/projects/batchExecutionStrategy";
import type { GateBatchTacticEffectStatus } from "@/lib/projects/gateActionReceipts";
import { gatePlatformDispatchTaskFromRecord } from "@/lib/projects/gateDispatchTaskRecords";
import { buildRecommendedBatchModelRouteGate } from "@/lib/projects/recommendedBatchModelRouteGate";
import { buildFailureRepairResumeBatchRecord, buildFirstDayScaleBatchRecord, buildTaskDebtFocusChangeNotice, buildTaskDebtRecoveryBatchRecord } from "@/lib/projects/taskDebtCompletionFeedback";
import { buildTaskQueueBatchHealthReview, buildTaskQueueBatchRhythmClosure, buildTaskQueueBatchRhythmDecision, buildTaskQueueBatchRhythmDispatch } from "@/lib/projects/taskQueueBatchHealth";
import { taskQueueBatchExecutionContext } from "@/lib/projects/taskQueueBatchReceipt";
import { buildTaskQueueCenter, buildTaskQueueDebtView, buildTaskQueueProjectSubmissionChecklist, recommendedQueueActionLabel, taskQueueSourcePresentation, type QueueItem, type TaskQueueProject } from "@/lib/projects/taskQueueCenter";
import { buildTaskQueueExecutionPlan } from "@/lib/projects/taskQueueExecutionPlan";

export const dynamic = "force-dynamic";

function categoryClass(category: QueueItem["category"]) {
  if (category === "candidate") return "bg-violet-50 text-violet-700";
  if (category === "handoff") return "bg-cyan-50 text-cyan-700";
  if (category === "review") return "bg-blue-50 text-blue-700";
  if (category === "second_pass") return "bg-amber-50 text-amber-700";
  if (category === "draft") return "bg-emerald-50 text-emerald-700";
  if (category === "effect") return "bg-cyan-50 text-cyan-700";
  if (category === "export") return "bg-slate-100 text-slate-700";
  return "bg-rose-50 text-rose-700";
}

function blockerTypeLabel(entry: QueueItem) {
  if (entry.blockerType === "publish_repair") return "发布阻塞";
  if (entry.blockerType === "export_version") return "导出版本";
  if (entry.blockerType === "chapter_card") return "章节卡住";
  if (entry.blockerType === "risk_recovery") return "开书止损";
  if (entry.blockerType === "watch_scale_gate") return "观察闸门";
  if (entry.blockerType === "first_day_gate") return "首日闸门";
  if (entry.blockerType === "role_closure") return "角色闭环";
  return entry.label;
}

function riskClass(level: QueueItem["riskLevel"]) {
  if (level === "blocked") return "border-rose-200 bg-rose-50 text-rose-800";
  if (level === "watch") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

function riskLabel(level: QueueItem["riskLevel"]) {
  if (level === "blocked") return "止损";
  if (level === "watch") return "观察";
  return "标准";
}

function scaleGateClass(scaleGate: QueueItem["scaleGate"]) {
  if (scaleGate === "sample_only") return "border-amber-200 bg-amber-50 text-amber-800";
  if (scaleGate === "cleared") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function scaleGateLabel(scaleGate: QueueItem["scaleGate"]) {
  if (scaleGate === "sample_only") return "小样本";
  if (scaleGate === "cleared") return "准放量";
  return "标准批次";
}

function scaleGateDecisionLabel(scaleGate: QueueItem["scaleGate"], riskLevel: QueueItem["riskLevel"]) {
  if (riskLevel === "blocked") return "禁止放大";
  if (scaleGate === "cleared") return "允许小步加码";
  if (scaleGate === "sample_only") return "继续观察";
  return "标准生产";
}

function executionBatchModeClass(tone: "standard" | "sample" | "recovery") {
  if (tone === "recovery") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (tone === "sample") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-slate-200 bg-white text-slate-700";
}

function executionScaleDecisionClass(tone: "allow" | "watch" | "block" | "standard") {
  if (tone === "allow") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (tone === "watch") return "border-amber-200 bg-amber-50 text-amber-800";
  if (tone === "block") return "border-rose-200 bg-rose-50 text-rose-800";
  return "border-slate-200 bg-white text-slate-700";
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

function parseTaskQueueTags(value: string | string[] | null | undefined) {
  if (Array.isArray(value)) return value;
  return (value ?? "")
    .split(/[、,，\s]+/u)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function normalizeTaskQueueProjects<T extends {
  submissionAssets?: Array<{ tags: string | string[] | null }>;
  submissionAssetVersions?: Array<{ tags: string | string[] | null; auditStatus: string }>;
}>(projects: T[]): TaskQueueProject[] {
  return projects.map((project) => {
    const normalizedProject = {
      ...project,
      submissionAssets: project.submissionAssets?.map((asset) => ({
        ...asset,
        tags: parseTaskQueueTags(asset.tags),
      })) ?? [],
      submissionAssetVersions: project.submissionAssetVersions?.map((version) => ({
        ...version,
        tags: parseTaskQueueTags(version.tags),
        auditStatus: version.auditStatus === "ready" || version.auditStatus === "blocked" ? version.auditStatus : "needs_work",
      })) ?? [],
    } as unknown as TaskQueueProject;

    return {
      ...normalizedProject,
      submissionChecklist: normalizedProject.submissionChecklist ?? buildTaskQueueProjectSubmissionChecklist(normalizedProject),
    };
  });
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

const taskReceiptAcceptanceCriteria = [
  "执行角色",
  "输入",
  "输出",
  "人工验收",
  "下一步",
];

function batchTone(successRate: number, failedTasks: number, runningTasks: number) {
  if (runningTasks > 0) return "border-blue-200 bg-blue-50 text-blue-800";
  if (failedTasks > 0 || successRate < 80) return "border-rose-200 bg-rose-50 text-rose-800";
  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

function batchTacticTone(status: GateBatchTacticEffectStatus) {
  if (status === "blocked") return "border-rose-200 bg-rose-50 text-rose-900";
  if (status === "watch") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-emerald-200 bg-emerald-50 text-emerald-900";
}

function batchTacticStatusText(status: GateBatchTacticEffectStatus) {
  if (status === "blocked") return "先停用";
  if (status === "watch") return "继续观察";
  return "可参考";
}

function batchRhythmDecisionClass(tone: "scale" | "watch" | "repair" | "empty") {
  if (tone === "scale") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (tone === "repair") return "border-rose-200 bg-rose-50 text-rose-900";
  if (tone === "watch") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-slate-200 bg-slate-50 text-slate-900";
}

function repairBatchTone(status: ReturnType<typeof buildTaskRunConsole>["failureRepairBatch"]["status"]) {
  if (status === "clear") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "fix_config") return "border-rose-200 bg-rose-50 text-rose-900";
  if (status === "retry_sample") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-slate-200 bg-slate-50 text-slate-900";
}

function repairKindLabel(kind: ReturnType<typeof buildTaskRunConsole>["failureRepairBatch"]["items"][number]["repairKind"]) {
  if (kind === "config") return "修配置";
  if (kind === "retry") return "可重试";
  return "人工复盘";
}

function modelRoleBlockerClass(tone: "blocked" | "watch") {
  if (tone === "blocked") return "border-rose-200 bg-rose-50 text-rose-900";
  return "border-amber-200 bg-amber-50 text-amber-900";
}

function modelRoleBlockerButtonClass(tone: "blocked" | "watch") {
  if (tone === "blocked") return "bg-rose-950 text-white hover:bg-rose-900";
  return "bg-amber-950 text-white hover:bg-amber-900";
}

function debtBlockerType(value: string | undefined): QueueItem["blockerType"] | null {
  if (
    value === "chapter_card"
    || value === "publish_repair"
    || value === "export_version"
    || value === "risk_recovery"
    || value === "watch_scale_gate"
    || value === "first_day_gate"
    || value === "role_closure"
  ) return value;
  return null;
}

function debtBlockerTypeName(blockerType: QueueItem["blockerType"]) {
  if (blockerType === "first_day_gate") return "首日闸门";
  if (blockerType === "risk_recovery") return "开书止损";
  if (blockerType === "watch_scale_gate") return "观察闸门";
  if (blockerType === "role_closure") return "角色闭环";
  if (blockerType === "publish_repair") return "发布质检";
  if (blockerType === "export_version") return "导出版本";
  if (blockerType === "chapter_card") return "章节卡";
  return "阻塞";
}

function previousDebtCount(value: string | undefined) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.round(parsed));
}

function isTaskView(value: string | undefined) {
  return value === undefined || value === "blocked";
}

function isDebtBlockerType(value: string | undefined) {
  return value === undefined || debtBlockerType(value) !== null;
}

function isBatchExecutionStrategy(value: string | undefined) {
  return value === undefined || batchExecutionStrategies.some((strategy) => strategy.id === value);
}

function isTaskQueueBatchExecutionContext(value: string | undefined) {
  return value === undefined
    || value === "standard"
    || value === "repair_resume"
    || value === "batch_rhythm_recheck";
}

function debtFocusNoticeClass(tone: "reduced" | "cleared" | "unchanged") {
  if (tone === "cleared") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (tone === "reduced") return "border-cyan-200 bg-cyan-50 text-cyan-900";
  return "border-amber-200 bg-amber-50 text-amber-900";
}

function resumeBatchDecisionClass(tone: "continue" | "repair" | "rollback" | "watch") {
  if (tone === "continue") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (tone === "repair") return "border-rose-200 bg-rose-50 text-rose-900";
  if (tone === "rollback") return "border-blue-200 bg-blue-50 text-blue-900";
  return "border-amber-200 bg-amber-50 text-amber-900";
}

function resumeStabilityClass(tone: "ready" | "watch" | "blocked") {
  if (tone === "ready") return "bg-emerald-100 text-emerald-950";
  if (tone === "blocked") return "bg-rose-100 text-rose-950";
  return "bg-amber-100 text-amber-950";
}

function gateReturnFromParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;

  if (!raw?.startsWith("/gate?focus=action-recheck")) {
    return null;
  }

  return raw;
}

function hrefWithGateReturn(href: string, gateReturnHref?: string | null) {
  if (!gateReturnHref || !href.startsWith("/") || href.startsWith("/gate")) return href;

  const hashIndex = href.indexOf("#");
  const base = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";
  if (base.includes("gateReturn=")) return href;
  const separator = base.includes("?") ? "&" : "?";

  return `${base}${separator}gateReturn=${encodeURIComponent(gateReturnHref)}${hash}`;
}

export default async function TasksPage({ searchParams }: { searchParams?: Promise<{ batchStrategy?: string; batchContext?: string; view?: string; debt?: string; cleared?: string; previousDebt?: string; gateReturn?: string | string[] }> }) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const gateReturn = gateReturnFromParam(resolvedSearchParams.gateReturn);
  const batchStrategyParam = resolvedSearchParams.batchStrategy;
  const activeStrategy = getBatchExecutionStrategy(batchStrategyParam);
  const invalidBatchStrategyNotice = isBatchExecutionStrategy(batchStrategyParam)
    ? null
    : batchStrategyParam ? `批量策略「${batchStrategyParam}」不存在，已回退到标准档。` : null;
  const batchContextParam = resolvedSearchParams.batchContext;
  const activeBatchContext = taskQueueBatchExecutionContext(batchContextParam);
  const invalidBatchContextNotice = isTaskQueueBatchExecutionContext(batchContextParam)
    ? null
    : batchContextParam ? `批量上下文「${batchContextParam}」不存在，已回退到默认生产批次。` : null;
  const viewParam = resolvedSearchParams.view;
  const activeView = viewParam === "blocked" ? "blocked" : "all";
  const invalidViewNotice = isTaskView(viewParam)
    ? null
    : viewParam ? `任务视图「${viewParam}」不存在，已显示全部任务。` : null;
  const debtParam = resolvedSearchParams.debt;
  const activeDebtBlockerType = activeView === "blocked" ? debtBlockerType(debtParam) : null;
  const invalidDebtNotice = activeView === "blocked" && !isDebtBlockerType(debtParam)
    ? debtParam ? `清债类型「${debtParam}」不存在，已显示全部阻塞债务。` : null
    : null;
  const clearedDebtParam = resolvedSearchParams.cleared;
  const clearedDebtBlockerType = activeView === "blocked" ? debtBlockerType(clearedDebtParam) : null;
  const invalidClearedDebtNotice = activeView === "blocked" && !isDebtBlockerType(clearedDebtParam)
    ? clearedDebtParam ? `清债完成类型「${clearedDebtParam}」不存在，已忽略这次完成反馈。` : null
    : null;
  const [
    projects,
    recentAiTasks,
    chapters,
    modelProviders,
    modelRoutes,
    completedRouteConfirmationRechecks,
    activeRouteConfirmationRechecks,
    recentRecommendedBatchAudits,
    batchRhythmTaskRecords,
  ] = await Promise.all([
    prisma.project.findMany({
      include: {
        chapters: {
          orderBy: { order: "asc" },
          include: {
            revisions: {
              orderBy: { createdAt: "desc" },
              take: 5,
            },
          },
        },
        aiTasks: {
          orderBy: { createdAt: "desc" },
          include: {
            modelProvider: {
              select: {
                providerId: true,
                displayName: true,
              },
            },
          },
        },
        worldEntries: { orderBy: [{ type: "asc" }, { createdAt: "asc" }] },
        publishSnapshots: { orderBy: { createdAt: "desc" }, take: 80 },
        exportPackageSnapshots: { orderBy: { createdAt: "desc" }, take: 120 },
        submissionAssets: { orderBy: { updatedAt: "desc" } },
        submissionAssetVersions: { orderBy: { createdAt: "desc" }, take: 80 },
        platformPublishMetrics: { orderBy: { snapshotDate: "desc" }, take: 80 },
        gateActionAudits: {
          where: { executionType: { in: ["platform_strategy", "export_version"] } },
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
            createdAt: true,
          },
        },
        gateDispatchTasks: {
          where: {
            OR: [
              { dispatchKey: { startsWith: "first-day:" } },
              { dispatchKey: { startsWith: "first-day-handoff:" } },
              { dispatchKey: { startsWith: "first-three-adoption:" } },
              { dispatchKey: { startsWith: "role-intent:" } },
            ],
          },
          select: {
            dispatchKey: true,
            stage: true,
            state: true,
            title: true,
            detail: true,
            actionLabel: true,
            href: true,
            completionEvidence: true,
          },
        },
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
    prisma.modelProvider.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.modelTaskRoute.findMany({ orderBy: { taskType: "asc" } }),
    prisma.gateDispatchTask.findMany({
      where: {
        stage: "model_route_confirmation_recheck",
        state: "completed",
      },
      orderBy: { completedAt: "desc" },
      take: 40,
      select: {
        dispatchKey: true,
        stage: true,
        state: true,
        completionEvidence: true,
        evidence: true,
        completedAt: true,
      },
    }),
    prisma.gateDispatchTask.findMany({
      where: {
        stage: "model_route_confirmation_recheck",
        state: { not: "completed" },
      },
      orderBy: { reviewLatestAt: "desc" },
      take: 40,
      select: {
        dispatchKey: true,
        stage: true,
        state: true,
        title: true,
        detail: true,
        actionLabel: true,
        href: true,
        priorityScore: true,
        reviewLatestAt: true,
        evidence: true,
      },
    }),
    prisma.gateActionAudit.findMany({
      where: { executionType: "recommended_batch" },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        receiptId: true,
        actionId: true,
        projectId: true,
        executionType: true,
        status: true,
        label: true,
        detail: true,
        href: true,
        message: true,
        succeededCount: true,
        failedCount: true,
        taskId: true,
        platformId: true,
        platformName: true,
        recheckStatus: true,
        recheckLabel: true,
        recheckDetail: true,
        recheckAction: true,
        payload: true,
        createdAt: true,
      },
    }),
    prisma.gateDispatchTask.findMany({
      where: { dispatchKey: { startsWith: "batch-rhythm:" } },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
  ]);
  const chaptersById = new Map(chapters.map((chapter) => [chapter.id, chapter]));
  const taskQueueProjects = normalizeTaskQueueProjects(projects);
  const safetyProjects = projects.map((project) => ({
    aiTasks: project.aiTasks.map((task) => ({
      status: task.status,
      inputTokens: task.inputTokens ?? null,
      outputTokens: task.outputTokens ?? null,
      costUsd: task.costUsd ?? null,
    })),
  }));
  const queue = buildTaskQueueCenter(taskQueueProjects);
  const debtView = buildTaskQueueDebtView(queue.items, activeDebtBlockerType);
  const visibleQueueItems = activeView === "blocked" ? debtView.items : queue.items;
  const safety = buildBatchExecutionSafety(queue.items, safetyProjects, activeStrategy);
  const safetyPriorityBlocker = buildBatchSafetyPriorityBlocker(safety);
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
  const modelRolesBlockRecommendedBatch = modelRolePriorityBlocker?.tone === "blocked";
  const executionPlan = buildTaskQueueExecutionPlan(queue.items, activeStrategy.maxBatchSize, activeStrategy);
  const runConsole = buildTaskRunConsole(recentAiTasks.map((task) => ({
    ...task,
    chapter: task.chapterId ? chaptersById.get(task.chapterId) ?? null : null,
  })));
  const batchHistory = buildTaskBatchHistory(recentAiTasks.map((task) => ({
    ...task,
    chapter: task.chapterId ? chaptersById.get(task.chapterId) ?? null : null,
  })));
  const strategyComparison = buildBatchStrategyComparison(queue.items, safetyProjects, batchHistory);
  const strategyDecision = buildBatchStrategyDecision(strategyComparison, activeStrategy.id);
  const batchTacticEffectReview = buildTaskQueueBatchHealthReview(recentRecommendedBatchAudits, 5);
  const batchRhythmDecision = buildTaskQueueBatchRhythmDecision(batchTacticEffectReview);
  const batchRhythmDispatch = buildTaskQueueBatchRhythmDispatch(batchRhythmDecision, batchTacticEffectReview);
  const batchRhythmTasks = batchRhythmTaskRecords.map(gatePlatformDispatchTaskFromRecord);
  const batchRhythmClosure = buildTaskQueueBatchRhythmClosure(batchRhythmDecision, batchTacticEffectReview, batchRhythmTasks);
  const debtRecoveryBatchRecord = buildTaskDebtRecoveryBatchRecord(recentRecommendedBatchAudits);
  const firstDayScaleBatchRecord = buildFirstDayScaleBatchRecord(recentRecommendedBatchAudits);
  const failureRepairResumeBatchRecord = buildFailureRepairResumeBatchRecord(recentRecommendedBatchAudits);
  const effectiveBatchContext = activeBatchContext === "repair_resume" && failureRepairResumeBatchRecord?.stabilityTone === "ready"
    ? "standard"
    : activeBatchContext;
  const unlockedDrafts = queue.items.filter((entry) => entry.category === "draft" && entry.scaleGate === "cleared");
  const firstDayHandoffItems = queue.items.filter((entry) => entry.sourceType === "first_day_handoff");
  const firstDayOutcomeHandoffItems = firstDayHandoffItems.filter((entry) => entry.handoffGuidance?.firstDayOutcome);
  const tacticExperienceFollowupItems = queue.items.filter((entry) => entry.sourceType === "tactic_experience_followup");
  const modelRoutePreflightGate = executionPlan.canRun
    ? buildRecommendedBatchModelRouteGate({
      plan: executionPlan,
      projects,
      providers: modelProviders,
      routes: modelRoutes,
      routeConfirmationRechecks: buildRouteConfirmationRecheckEvidenceFromDispatchTasks(completedRouteConfirmationRechecks),
      routeConfirmationRecheckDispatches: activeRouteConfirmationRechecks.map((task) => ({
        ...task,
        reviewLatestAt: task.reviewLatestAt.toISOString(),
      })),
      recommendedBatchAudits: recentRecommendedBatchAudits,
    })
    : null;
  const modelRouteBlocksRecommendedBatch = modelRoutePreflightGate?.status === "block";
  const debtFocusChangeNotice = clearedDebtBlockerType
    ? buildTaskDebtFocusChangeNotice({
        label: debtBlockerTypeName(clearedDebtBlockerType),
        previousDebtCount: previousDebtCount(resolvedSearchParams.previousDebt),
        currentDebtCount: debtView.groups.find((group) => group.blockerType === clearedDebtBlockerType)?.count ?? 0,
        resumeActionLabel: debtView.resumeActionLabel,
        resumeActionHref: debtView.resumeActionHref,
        resumeBatch: {
          canRun: safety.canRunRecommendedBatch && executionPlan.canRun && !modelRouteBlocksRecommendedBatch && !modelRolesBlockRecommendedBatch,
          actionLabel: executionPlan.actionLabel,
          detail: executionPlan.detail,
          href: "/tasks#recommended-batch",
        },
      })
    : null;

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">任务队列</h1>
          <p className="mt-1 text-sm text-slate-600">跨项目集中处理待生成、待审稿、待二改和待导出的任务。</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            className={`rounded-md border px-3 py-2 text-sm font-medium ${activeView === "all" ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
            href={hrefWithGateReturn("/tasks", gateReturn)}
          >
            全部任务
          </Link>
          <Link
            className={`rounded-md border px-3 py-2 text-sm font-medium ${activeView === "blocked" ? "border-rose-950 bg-rose-950 text-white" : "border-rose-200 bg-white text-rose-700 hover:bg-rose-50"}`}
            href={hrefWithGateReturn("/tasks?view=blocked#task-debt", gateReturn)}
          >
            阻塞清债 {debtView.totalBlocked}
          </Link>
          {queue.recommendedNext ? (
            <Link className="w-fit rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white" href={hrefWithGateReturn(queue.recommendedNext.href, gateReturn)}>
              {recommendedQueueActionLabel(queue.recommendedNext)}
            </Link>
          ) : null}
        </div>
      </div>

      {gateReturn ? (
        <section className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="font-medium">来自总闸门复检</div>
              <p className="mt-1 leading-5">先处理任务队列里的阻塞、失败或待执行批次，处理后回总闸门确认剩余卡点是否减少。</p>
            </div>
            <Link className="w-fit rounded-md bg-white px-3 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100" href={gateReturn}>
              回总闸门复检
            </Link>
          </div>
        </section>
      ) : null}

      {invalidViewNotice ? (
        <section className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="font-medium">视图已回退</div>
              <p className="mt-1 text-sm leading-6">{invalidViewNotice}</p>
            </div>
            <Link className="w-fit rounded-md bg-white px-3 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100" href={hrefWithGateReturn("/tasks", gateReturn)}>
              查看全部任务
            </Link>
          </div>
        </section>
      ) : null}

      {invalidDebtNotice ? (
        <section className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="font-medium">清债筛选已回退</div>
              <p className="mt-1 text-sm leading-6">{invalidDebtNotice}</p>
            </div>
            <Link className="w-fit rounded-md bg-white px-3 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100" href={hrefWithGateReturn("/tasks?view=blocked#task-debt", gateReturn)}>
              查看全部阻塞
            </Link>
          </div>
        </section>
      ) : null}

      {invalidClearedDebtNotice ? (
        <section className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="font-medium">清债完成反馈已忽略</div>
              <p className="mt-1 text-sm leading-6">{invalidClearedDebtNotice}</p>
            </div>
            <Link className="w-fit rounded-md bg-white px-3 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100" href={hrefWithGateReturn("/tasks?view=blocked#task-debt", gateReturn)}>
              查看阻塞清债
            </Link>
          </div>
        </section>
      ) : null}

      {invalidBatchStrategyNotice ? (
        <section className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="font-medium">批量策略已回退</div>
              <p className="mt-1 text-sm leading-6">{invalidBatchStrategyNotice}</p>
            </div>
            <Link className="w-fit rounded-md bg-white px-3 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100" href={hrefWithGateReturn("/tasks?batchStrategy=standard", gateReturn)}>
              查看标准档
            </Link>
          </div>
        </section>
      ) : null}

      {invalidBatchContextNotice ? (
        <section className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="font-medium">批量上下文已回退</div>
              <p className="mt-1 text-sm leading-6">{invalidBatchContextNotice}</p>
            </div>
            <Link className="w-fit rounded-md bg-white px-3 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100" href={hrefWithGateReturn("/tasks#recommended-batch", gateReturn)}>
              查看默认批次
            </Link>
          </div>
        </section>
      ) : null}

      <section className="mb-6 rounded-md border border-slate-900 bg-slate-950 p-4 text-white">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-medium text-slate-300">毒舌 PM 当前只派这一单</div>
            <h2 className="mt-1 text-lg font-semibold">{queue.pmFocus.headline}</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-200">{queue.pmFocus.detail}</p>
            <div className="mt-2 text-xs text-slate-400">{queue.pmFocus.scopeLabel}</div>
            <div className="mt-2 rounded-md bg-white/10 px-3 py-2 text-xs leading-5 text-slate-200">
              {queue.pmFocus.pipelineValidationHint}
            </div>
            <div className="mt-3 rounded-md border border-white/15 bg-white/5 p-3">
              <div className="text-xs font-medium text-slate-300">任务回执验收口径</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {taskReceiptAcceptanceCriteria.map((criterion) => (
                  <span className="rounded-md bg-white/10 px-2 py-1 text-xs text-slate-100" key={criterion}>
                    {criterion}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="w-fit rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-950 hover:bg-slate-100" href={hrefWithGateReturn(queue.pmFocus.actionHref, gateReturn)}>
              {queue.pmFocus.actionLabel}
            </Link>
            <Link className="w-fit rounded-md border border-white/25 px-3 py-2 text-sm font-medium text-white hover:bg-white/10" href={hrefWithGateReturn(queue.pmFocus.pipelineActionHref, gateReturn)}>
              {queue.pmFocus.pipelineActionLabel}
            </Link>
          </div>
        </div>
      </section>

      <section className="mb-6 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">总任务</div>
          <div className="mt-1 text-2xl font-semibold">{queue.overview.totalItems}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">待采纳</div>
          <div className="mt-1 text-2xl font-semibold">{queue.overview.candidateReady}</div>
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
          <div className="text-xs text-slate-500">待复盘</div>
          <div className="mt-1 text-2xl font-semibold">{queue.overview.effectReady}</div>
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
          <div className="text-xs text-slate-500">首日闸门</div>
          <div className="mt-1 text-2xl font-semibold">{queue.overview.firstDayBlocked}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">发布阻塞</div>
          <div className="mt-1 text-2xl font-semibold">{queue.overview.publishBlocked}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">章节卡住</div>
          <div className="mt-1 text-2xl font-semibold">{queue.overview.chapterCardBlocked}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">开书止损</div>
          <div className="mt-1 text-2xl font-semibold">{queue.overview.riskRecoveryBlocked}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">观察任务</div>
          <div className="mt-1 text-2xl font-semibold">{queue.overview.watchItems}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">小样本闸门</div>
          <div className="mt-1 text-2xl font-semibold">{queue.overview.watchScaleBlocked}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">已准放量</div>
          <div className="mt-1 text-2xl font-semibold">{queue.overview.watchCleared}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">经验交接</div>
          <div className="mt-1 text-2xl font-semibold">{queue.overview.firstDayHandoffs}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">打法闭环</div>
          <div className="mt-1 text-2xl font-semibold">{queue.overview.tacticExperienceFollowups}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">采纳闭环</div>
          <div className="mt-1 text-2xl font-semibold">{queue.overview.firstThreeAdoptionFollowups}</div>
        </div>
        <Link className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-950 hover:bg-amber-100" href={hrefWithGateReturn("/tasks?view=blocked&debt=role_closure#task-debt", gateReturn)}>
          <div className="text-xs text-amber-700">角色闭环</div>
          <div className="mt-1 text-2xl font-semibold">{queue.overview.roleClosureTasks}</div>
        </Link>
        <Link className="rounded-md border border-violet-200 bg-violet-50 p-3 text-violet-950 hover:bg-violet-100" href={hrefWithGateReturn("/tasks#platform-strategy-tasks", gateReturn)}>
          <div className="text-xs text-violet-700">平台策略</div>
          <div className="mt-1 text-2xl font-semibold">{queue.overview.platformStrategyTasks}</div>
        </Link>
      </section>

      <section className="mb-6 rounded-md border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-medium text-slate-950">平台闭环总览</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              {queue.overview.platformReadiness.headline} {queue.overview.platformReadiness.nextAction}
            </p>
          </div>
          <Link className="w-fit rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white" href={hrefWithGateReturn("/tasks?view=blocked&debt=publish_repair#task-debt", gateReturn)}>
            查看发布阻塞
          </Link>
        </div>
        <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-6">
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">平台样本</div>
            <div className="mt-1 font-medium text-slate-950">{queue.overview.platformReadiness.totalPlatforms}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">已可投</div>
            <div className="mt-1 font-medium text-slate-950">{queue.overview.platformReadiness.readyToSubmitCount}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">需导出包</div>
            <div className="mt-1 font-medium text-slate-950">{queue.overview.platformReadiness.needsPackageExportCount}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">需补效果</div>
            <div className="mt-1 font-medium text-slate-950">{queue.overview.platformReadiness.needsEffectRecordCount}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">需修投稿</div>
            <div className="mt-1 font-medium text-slate-950">{queue.overview.platformReadiness.needsSubmissionRepairCount}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">未生成包</div>
            <div className="mt-1 font-medium text-slate-950">{queue.overview.platformReadiness.notGeneratedCount}</div>
          </div>
        </div>
      </section>

      {activeView === "blocked" ? (
        <section
          className={`mb-6 rounded-md border p-4 ${debtView.totalBlocked > 0 ? "border-rose-200 bg-rose-50 text-rose-950" : "border-emerald-200 bg-emerald-50 text-emerald-950"}`}
          id="task-debt"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="font-medium">阻塞清债</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6">{debtView.headline} {debtView.detail}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link className="rounded-md bg-white/80 px-3 py-2 text-sm font-medium text-rose-900 hover:bg-white" href={hrefWithGateReturn("/tasks", gateReturn)}>
                返回全部任务
              </Link>
              {debtView.totalBlocked > 0 && debtView.focusedBlockerType ? (
                <Link className="rounded-md bg-white/80 px-3 py-2 text-sm font-medium text-rose-900 hover:bg-white" href={hrefWithGateReturn("/tasks?view=blocked#task-debt", gateReturn)}>
                  全部阻塞
                </Link>
              ) : null}
              {debtView.nextAction ? (
                <Link className="rounded-md bg-rose-950 px-3 py-2 text-sm font-medium text-white hover:bg-rose-900" href={hrefWithGateReturn(debtView.nextAction.href, gateReturn)}>
                  先处理：{debtView.nextAction.actionLabel}
                </Link>
              ) : null}
              {!debtView.nextAction && debtView.resumeActionHref && debtView.resumeActionLabel ? (
                <Link className="rounded-md bg-emerald-950 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-900" href={hrefWithGateReturn(debtView.resumeActionHref, gateReturn)}>
                  {debtView.resumeActionLabel}
                </Link>
              ) : null}
            </div>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-3 lg:grid-cols-6">
            {debtView.groups.map((group) => (
              <Link
                className={`rounded-md p-3 ${debtView.focusedBlockerType === group.blockerType ? "bg-rose-950 text-white" : "bg-white/80 hover:bg-white"}`}
                href={hrefWithGateReturn(group.href, gateReturn)}
                key={group.blockerType ?? "unknown"}
              >
                <div className={`text-xs ${debtView.focusedBlockerType === group.blockerType ? "text-white/80" : "text-rose-700"}`}>{group.label}</div>
                <div className="mt-1 text-2xl font-semibold">{group.count}</div>
                <div className={`mt-1 text-xs font-medium ${debtView.focusedBlockerType === group.blockerType ? "text-white/90" : "text-rose-800"}`}>{group.actionLabel}</div>
              </Link>
            ))}
            {debtView.groups.length === 0 ? (
              <div className="rounded-md bg-white/80 p-3 text-sm text-emerald-800">
                清债完成，可以继续批量推进。
              </div>
            ) : null}
          </div>
          {debtView.focusAcceptanceCriteria.length > 0 ? (
            <div className="mt-4 rounded-md bg-white/80 p-3 text-sm">
              <div className="font-medium">{debtView.focusLabel}清债验收</div>
              <div className="mt-2 grid gap-1 leading-6">
                {debtView.focusAcceptanceCriteria.map((criterion) => (
                  <div key={criterion}>- {criterion}</div>
                ))}
              </div>
            </div>
          ) : null}
          {debtFocusChangeNotice ? (
            <div className={`mt-4 rounded-md border px-3 py-2 text-sm leading-6 ${debtFocusNoticeClass(debtFocusChangeNotice.tone)}`}>
              <div>{debtFocusChangeNotice.message}</div>
              {debtFocusChangeNotice.resumeBatchDetail ? (
                <div className="mt-2 rounded-md bg-white/70 px-2 py-1 text-xs">
                  恢复小批：{debtFocusChangeNotice.resumeBatchDetail}
                </div>
              ) : null}
              {debtFocusChangeNotice.actionLabel && debtFocusChangeNotice.actionHref ? (
                <Link className="mt-2 inline-flex rounded-md bg-white/80 px-3 py-1 font-medium hover:bg-white" href={hrefWithGateReturn(debtFocusChangeNotice.actionHref, gateReturn)}>
                  {debtFocusChangeNotice.actionLabel}
                </Link>
              ) : null}
              {debtRecoveryBatchRecord ? (
                <div className="mt-3 rounded-md bg-white/75 px-3 py-2 text-xs leading-5">
                  <div className="font-medium">{debtRecoveryBatchRecord.headline}</div>
                  <div className="mt-1">{debtRecoveryBatchRecord.detail}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {debtRecoveryBatchRecord.metrics.map((metric) => (
                      <span className="rounded-md bg-slate-50 px-2 py-1 font-medium" key={metric}>{metric}</span>
                    ))}
                  </div>
                  <div className="mt-2 rounded-md bg-white px-2 py-1">
                    <span className="font-medium">{debtRecoveryBatchRecord.decisionLabel}</span>
                    <span className="ml-1 text-slate-600">{debtRecoveryBatchRecord.decisionDetail}</span>
                  </div>
                  <Link className="mt-2 inline-flex rounded-md bg-white px-2 py-1 font-medium hover:bg-slate-50" href={hrefWithGateReturn(debtRecoveryBatchRecord.decisionActionHref, gateReturn)}>
                    {debtRecoveryBatchRecord.decisionActionLabel}
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {tacticExperienceFollowupItems.length > 0 ? (
        <section className="mb-6 rounded-md border border-teal-200 bg-teal-50 p-4 text-teal-950">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="font-medium">恢复放量打法闭环</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6">
                这些卡来自总闸门的平台打法经验。先处理继续小样本、补追读证据或重做打法，再让结论回流到平台经验库。
              </p>
            </div>
            <div className="w-fit rounded-md bg-white/80 px-3 py-2 text-sm font-medium">
              {tacticExperienceFollowupItems.length} 个打法闭环待办
            </div>
          </div>
          <div className="mt-3 grid gap-2 lg:grid-cols-3">
            {tacticExperienceFollowupItems.slice(0, 6).map((entry) => (
              <Link className="rounded-md bg-white/80 p-3 text-sm hover:bg-white" href={hrefWithGateReturn(entry.href, gateReturn)} key={entry.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-teal-100 px-2 py-1 text-xs font-medium text-teal-800">{entry.actionLabel}</span>
                  <span className="font-medium text-slate-950">{entry.chapterTitle}</span>
                </div>
                <div className="mt-2 text-slate-600">{entry.projectTitle} · {entry.platformName}</div>
                <p className="mt-2 line-clamp-2 leading-6 text-slate-600">{entry.evidence}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {firstDayHandoffItems.length > 0 ? (
        <section className="mb-6 rounded-md border border-cyan-200 bg-cyan-50 p-4 text-cyan-950">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="font-medium">经验开书交接</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6">
                这些卡来自“用历史打法开项目”。先把开头打法、首轮验收和平台回收口径闭环，再进入批量生产。
              </p>
            </div>
            <div className="w-fit rounded-md bg-white/80 px-3 py-2 text-sm font-medium">
              {firstDayHandoffItems.length} 个交接待办
            </div>
          </div>
          <div className="mt-3 grid gap-2 lg:grid-cols-3">
            <div className="rounded-md bg-white/80 p-3 text-sm lg:col-span-3">
              <div className="font-medium text-slate-950">首日执行分流</div>
              <div className="mt-2 grid gap-2 md:grid-cols-3">
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-emerald-900">
                  <div className="text-xs opacity-75">可以扩展</div>
                  <div className="mt-1 text-xl font-semibold">{queue.overview.firstDayOutcomeScale}</div>
                </div>
                <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-amber-900">
                  <div className="text-xs opacity-75">继续观察</div>
                  <div className="mt-1 text-xl font-semibold">{queue.overview.firstDayOutcomeWatch}</div>
                </div>
                <div className="rounded-md border border-rose-200 bg-rose-50 p-2 text-rose-900">
                  <div className="text-xs opacity-75">先避坑</div>
                  <div className="mt-1 text-xl font-semibold">{queue.overview.firstDayOutcomeBlocked}</div>
                </div>
              </div>
              {firstDayOutcomeHandoffItems.length ? (
                <p className="mt-2 text-xs leading-5 text-slate-600">
                  已识别 {firstDayOutcomeHandoffItems.length} 张首日结论卡，按扩展、观察、避坑分流处理。
                </p>
              ) : null}
            </div>
            {firstDayHandoffItems.slice(0, 6).map((entry) => {
              const firstDayOutcome = entry.handoffGuidance ? entry.handoffGuidance.firstDayOutcome : null;
              return (
                <Link className="rounded-md bg-white/80 p-3 text-sm hover:bg-white" href={hrefWithGateReturn(entry.href, gateReturn)} key={entry.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-cyan-100 px-2 py-1 text-xs font-medium text-cyan-800">{entry.actionLabel}</span>
                    {firstDayOutcome ? (
                      <span className="rounded-md bg-slate-950 px-2 py-1 text-xs font-medium text-white">{firstDayOutcome.badge}</span>
                    ) : null}
                    <span className="font-medium text-slate-950">{entry.chapterTitle}</span>
                  </div>
                  <div className="mt-2 text-slate-600">{entry.projectTitle} · {entry.platformName}</div>
                  <p className="mt-2 line-clamp-2 leading-6 text-slate-600">{entry.evidence}</p>
                  {firstDayOutcome ? (
                    <div className="mt-2 rounded-md bg-cyan-50 p-2 text-xs leading-5 text-cyan-950">
                      <div className="font-medium">{firstDayOutcome.title}</div>
                      <div className="mt-1">{firstDayOutcome.nextMove}</div>
                      <div className="mt-1 opacity-80">{firstDayOutcome.boundary}</div>
                    </div>
                  ) : null}
                  {entry.evidenceChips.length ? (
                    <div className="mt-2 flex flex-wrap gap-1 text-xs">
                      {entry.evidenceChips.map((chip) => (
                        <span className="rounded-md bg-cyan-100 px-2 py-1 font-medium text-cyan-800" key={chip}>{chip}</span>
                      ))}
                    </div>
                  ) : null}
                  {entry.handoffGuidance?.firstDayActions.length ? (
                    <div className="mt-2 text-xs font-medium text-cyan-800">
                      {entry.handoffGuidance.firstDayActions[0]}
                    </div>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {unlockedDrafts.length > 0 ? (
        <section className="mb-6 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="font-medium">小样本已过线，后续初稿可恢复</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6">
                这些不是普通待生成任务，是刚从观察闸门里放出来的后续初稿。先按同一平台打法小批次恢复，别一口气放大到失控。
              </p>
            </div>
            <div className="w-fit rounded-md bg-white/70 px-3 py-2 text-sm font-medium">
              {unlockedDrafts.length} 个准放量初稿
            </div>
          </div>
          <div className="mt-3 grid gap-2 lg:grid-cols-3">
            {unlockedDrafts.slice(0, 6).map((entry) => (
              <Link className="rounded-md bg-white/80 p-3 text-sm hover:bg-white" href={hrefWithGateReturn(entry.href, gateReturn)} key={entry.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800">准放量</span>
                  <span className="font-medium text-slate-950">{entry.chapterTitle}</span>
                </div>
                <div className="mt-2 text-slate-600">{entry.projectTitle} · {entry.platformName}</div>
                <p className="mt-2 line-clamp-2 leading-6 text-slate-600">{entry.evidence}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mb-6 rounded-md border border-slate-200 bg-white p-4" id="task-run-console">
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

      <section className={`mb-6 rounded-md border p-4 ${repairBatchTone(runConsole.failureRepairBatch.status)}`} id="failure-repair-batch">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-medium">失败修复批次</h2>
            <p className="mt-1 text-sm leading-6">{runConsole.failureRepairBatch.title}：{runConsole.failureRepairBatch.detail}</p>
          </div>
          <Link className="w-fit rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white" href={hrefWithGateReturn(runConsole.failureRepairBatch.primaryActionHref, gateReturn)}>
            {runConsole.failureRepairBatch.primaryActionLabel}
          </Link>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-md bg-white/70 p-3">
            <div className="text-xs opacity-70">未恢复</div>
            <div className="mt-1 text-2xl font-semibold">{runConsole.failureRepairBatch.summary.unresolvedFailures}</div>
          </div>
          <div className="rounded-md bg-white/70 p-3">
            <div className="text-xs opacity-70">配置类</div>
            <div className="mt-1 text-2xl font-semibold">{runConsole.failureRepairBatch.summary.configFailures}</div>
          </div>
          <div className="rounded-md bg-white/70 p-3">
            <div className="text-xs opacity-70">可重试</div>
            <div className="mt-1 text-2xl font-semibold">{runConsole.failureRepairBatch.summary.retryableFailures}</div>
          </div>
          <div className="rounded-md bg-white/70 p-3">
            <div className="text-xs opacity-70">人工复盘</div>
            <div className="mt-1 text-2xl font-semibold">{runConsole.failureRepairBatch.summary.manualFailures}</div>
          </div>
          <div className="rounded-md bg-white/70 p-3">
            <div className="text-xs opacity-70">项目</div>
            <div className="mt-1 text-2xl font-semibold">{runConsole.failureRepairBatch.summary.affectedProjects}</div>
          </div>
          <div className="rounded-md bg-white/70 p-3">
            <div className="text-xs opacity-70">模型</div>
            <div className="mt-1 text-2xl font-semibold">{runConsole.failureRepairBatch.summary.affectedProviders}</div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="grid gap-2 text-sm">
            {runConsole.failureRepairBatch.guidance.map((line) => (
              <div className="rounded-md bg-white/70 px-3 py-2" key={line}>{line}</div>
            ))}
          </div>
          <div className="grid gap-2">
            {runConsole.failureRepairBatch.items.slice(0, 4).map((item) => (
              <div className="rounded-md bg-white/70 p-3 text-sm" key={item.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-slate-950 px-2 py-1 text-xs font-medium text-white">{repairKindLabel(item.repairKind)}</span>
                  <span className="font-medium">{item.taskLabel}</span>
                  <span className="text-xs opacity-70">{item.providerName} · {item.model}</span>
                </div>
                <div className="mt-2 opacity-80">{item.projectTitle} · {item.chapterTitle}</div>
                <p className="mt-1 leading-6 opacity-80">{item.retryReason}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {item.directRetrySupported ? (
                    <RetryTaskButton className="flex flex-wrap items-center gap-2" taskId={item.id} />
                  ) : (
                    <Link className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50" href={hrefWithGateReturn(item.href, gateReturn)}>
                      {item.actionLabel}
                    </Link>
                  )}
                </div>
              </div>
            ))}
            {runConsole.failureRepairBatch.items.length === 0 ? (
              <p className="rounded-md bg-white/70 p-3 text-sm">没有未恢复失败。</p>
            ) : null}
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
                  <Link className="mt-3 inline-flex rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-white" href={hrefWithGateReturn(candidate.href, gateReturn)}>
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
              <Link className="rounded-md bg-slate-50 p-3 text-sm hover:bg-slate-100" href={hrefWithGateReturn(log.href, gateReturn)} key={log.id}>
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

      <section className="mb-6 rounded-md border border-slate-200 bg-white p-4" id="batch-health-review">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-medium">批量健康复盘</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              这里直接读取推荐批次回执，识别普通批量、恢复放量、三轮稳住和三轮降档，先判断打法能不能继续喂给下一批。
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 font-medium text-emerald-800">
              可参考 {batchTacticEffectReview.summary.usable}
            </span>
            <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 font-medium text-amber-800">
              观察 {batchTacticEffectReview.summary.watch}
            </span>
            <span className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 font-medium text-rose-800">
              先停 {batchTacticEffectReview.summary.blocked}
            </span>
          </div>
        </div>
        <div className={`mt-4 rounded-md border p-3 text-sm ${batchRhythmDecisionClass(batchRhythmDecision.tone)}`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-xs font-medium uppercase opacity-75">生产节奏决策</div>
              <div className="mt-1 font-medium">{batchRhythmDecision.label}</div>
              <p className="mt-1 leading-6">{batchRhythmDecision.detail}</p>
              {batchRhythmDecision.evidence.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                  {batchRhythmDecision.evidence.map((line) => (
                    <span className="rounded-md bg-white/70 px-2 py-1 font-medium" key={line}>{line}</span>
                  ))}
                </div>
              ) : null}
              {batchRhythmClosure ? (
                <div className="mt-3 rounded-md bg-white/75 px-3 py-2 text-xs leading-5">
                  <div className="font-medium">{batchRhythmClosure.label}</div>
                  <div className="mt-1 opacity-85">{batchRhythmClosure.detail}</div>
                  {batchRhythmClosure.evidence.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {batchRhythmClosure.evidence.map((line) => (
                        <span className="rounded-md bg-white px-2 py-1 font-medium" key={line}>{line}</span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : batchRhythmDispatch ? (
                <div className="mt-3 rounded-md bg-white/75 px-3 py-2 text-xs leading-5">
                  <div className="font-medium">派单预案：{batchRhythmDispatch.title} · {batchRhythmDispatch.ownerRole}</div>
                  <div className="mt-1 opacity-85">{batchRhythmDispatch.acceptanceCriteria[0]}</div>
                </div>
              ) : null}
            </div>
            {batchRhythmClosure?.status === "completed" ? (
              <RunRecommendedBatchButton
                disabled={!safety.canRunRecommendedBatch || !executionPlan.canRun || modelRouteBlocksRecommendedBatch || modelRolesBlockRecommendedBatch}
                executionContext="batch_rhythm_recheck"
                gateReturnHref={gateReturn}
                initialModelRouteGate={modelRoutePreflightGate}
                scaleDecisionDetail={executionPlan.scaleDecisionDetail}
                scaleDecisionLabel={executionPlan.scaleDecisionLabel}
                scaleDecisionTone={executionPlan.scaleDecisionTone}
                sourceDispatchKey={batchRhythmClosure.task.dispatchKey}
                strategyId={activeStrategy.id}
              />
            ) : batchRhythmClosure ? (
              <Link
                className="w-fit shrink-0 rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                href={hrefWithGateReturn(batchRhythmClosure.href, gateReturn)}
              >
                {batchRhythmClosure.actionLabel}
              </Link>
            ) : batchRhythmDispatch ? (
              <CreateBatchRhythmDispatchButton gateReturnHref={gateReturn} label="生成节奏派单" />
            ) : (
              <Link className="w-fit shrink-0 rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800" href={hrefWithGateReturn(batchRhythmDecision.href, gateReturn)}>
                {batchRhythmDecision.actionLabel}
              </Link>
            )}
          </div>
        </div>
        {batchTacticEffectReview.nextActions.length ? (
          <div className="mt-3 grid gap-2 lg:grid-cols-3">
            {batchTacticEffectReview.nextActions.map((action) => (
              <div className="rounded-md bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-600" key={action}>{action}</div>
            ))}
          </div>
        ) : null}
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {batchTacticEffectReview.items.slice(0, 3).map((item) => (
            <div className={`rounded-md border p-3 text-sm ${batchTacticTone(item.status)}`} key={item.id}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-medium">{batchTacticStatusText(item.status)}</span>
                <span className="font-medium">{item.label}</span>
              </div>
              <div className="mt-2 text-xs opacity-75">{item.tacticTitle}</div>
              <p className="mt-2 leading-6">{item.openingMove || item.primaryTactic}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-white/70 p-2">批次 {item.sampleBatches}</div>
                <div className="rounded-md bg-white/70 p-2">成功率 {item.successRatePercent}%</div>
                <div className="rounded-md bg-white/70 p-2">质量 {item.averageQualityScore ?? "缺"}</div>
                <div className="rounded-md bg-white/70 p-2">失败 {item.failedTasks}</div>
                {item.rhythmRecheckBatches ? (
                  <div className="rounded-md bg-white/70 p-2">节奏复验 {item.rhythmRecheckBatches}</div>
                ) : null}
              </div>
              <p className="mt-3 leading-6 opacity-85">{item.nextAction}</p>
              {item.evidence[0] ? (
                <p className="mt-3 rounded-md bg-white/70 p-2 text-xs leading-5 opacity-80">{item.evidence[0]}</p>
              ) : null}
            </div>
          ))}
          {batchTacticEffectReview.items.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-300 p-3 text-sm text-slate-600 lg:col-span-3">
              还没有带首轮打法的推荐批次回执。先执行一次推荐批次，这里会显示可继续、观察或先停用的判断。
            </p>
          ) : null}
        </div>
      </section>

      <section className="mb-6 rounded-md border border-slate-200 bg-white p-4" id="recommended-batch">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-medium">批量执行安全阀</h2>
            <p className="mt-1 text-sm text-slate-600">先看本批数量、混跑风险、并发占用和预算估算，再一键执行推荐小批次。</p>
          </div>
          <div className="flex flex-col gap-2 lg:items-end">
            <div className={`rounded-md border px-3 py-2 text-sm font-medium ${executionScaleDecisionClass(executionPlan.scaleDecisionTone)}`}>
              <div>{safety.canRunRecommendedBatch && executionPlan.canRun && !modelRouteBlocksRecommendedBatch && !modelRolesBlockRecommendedBatch ? "建议批次可执行" : "建议先处理阻塞"}</div>
              <div className="mt-1 text-xs">{executionPlan.scaleDecisionLabel}</div>
            </div>
            <RunRecommendedBatchButton
              disabled={!safety.canRunRecommendedBatch || !executionPlan.canRun || modelRouteBlocksRecommendedBatch || modelRolesBlockRecommendedBatch}
              executionContext={effectiveBatchContext}
              gateReturnHref={gateReturn}
              initialModelRouteGate={modelRoutePreflightGate}
              scaleDecisionDetail={executionPlan.scaleDecisionDetail}
              scaleDecisionLabel={executionPlan.scaleDecisionLabel}
              scaleDecisionTone={executionPlan.scaleDecisionTone}
              strategyId={activeStrategy.id}
            />
          </div>
        </div>
        {activeBatchContext === "repair_resume" ? (
          <div className={`mt-4 rounded-md border p-3 text-sm ${effectiveBatchContext === "standard" ? "border-sky-200 bg-sky-50 text-sky-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>
            <div className="font-medium">{effectiveBatchContext === "standard" ? "已承接普通推荐批次" : "修复后恢复模式"}</div>
            <p className="mt-1 leading-6">
              {effectiveBatchContext === "standard"
                ? "恢复小批已连续稳定，这次执行会按普通推荐批次记录，继续保留安全阀。"
                : "这一批来自失败修复复检后的恢复入口。执行回执会按恢复小批记录，不会被当作普通放量批次。"}
            </p>
          </div>
        ) : null}
        {firstDayScaleBatchRecord ? (
          <div className={`mt-4 rounded-md border p-3 text-sm ${resumeBatchDecisionClass(firstDayScaleBatchRecord.decisionTone)}`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-xs font-medium uppercase opacity-80">首日扩展回流</div>
                <div className="mt-1 font-medium">{firstDayScaleBatchRecord.headline}</div>
                <p className="mt-1 leading-6">{firstDayScaleBatchRecord.detail}</p>
                <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                  {firstDayScaleBatchRecord.metrics.map((metric) => (
                    <span className="rounded-md bg-white/75 px-2 py-1 font-medium" key={metric}>{metric}</span>
                  ))}
                </div>
                <div className="mt-2 rounded-md bg-white/75 px-2 py-1 text-xs leading-5">
                  <span className="font-medium">{firstDayScaleBatchRecord.decisionLabel}</span>
                  <span className="ml-1 opacity-85">{firstDayScaleBatchRecord.decisionDetail}</span>
                </div>
              </div>
              <Link className="w-fit rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800" href={hrefWithGateReturn(firstDayScaleBatchRecord.decisionActionHref, gateReturn)}>
                {firstDayScaleBatchRecord.decisionActionLabel}
              </Link>
            </div>
          </div>
        ) : null}
        {activeBatchContext === "repair_resume" && failureRepairResumeBatchRecord ? (
          <div className={`mt-4 rounded-md border p-3 text-sm ${resumeBatchDecisionClass(failureRepairResumeBatchRecord.decisionTone)}`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="font-medium">{failureRepairResumeBatchRecord.headline}</div>
                <p className="mt-1 leading-6">{failureRepairResumeBatchRecord.detail}</p>
                <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                  {failureRepairResumeBatchRecord.metrics.map((metric) => (
                    <span className="rounded-md bg-white/75 px-2 py-1 font-medium" key={metric}>{metric}</span>
                  ))}
                </div>
                <div className="mt-2 rounded-md bg-white/75 px-2 py-1 text-xs leading-5">
                  <span className="font-medium">{failureRepairResumeBatchRecord.decisionLabel}</span>
                  <span className="ml-1 opacity-85">{failureRepairResumeBatchRecord.decisionDetail}</span>
                </div>
                {failureRepairResumeBatchRecord.stabilityTone && failureRepairResumeBatchRecord.stabilityLabel ? (
                  <div className={`mt-2 rounded-md px-2 py-1 text-xs leading-5 ${resumeStabilityClass(failureRepairResumeBatchRecord.stabilityTone)}`}>
                    <span className="font-medium">{failureRepairResumeBatchRecord.stabilityLabel}</span>
                    <span className="ml-1 opacity-85">{failureRepairResumeBatchRecord.stabilityDetail}</span>
                  </div>
                ) : null}
                {failureRepairResumeBatchRecord.scaleDecisionLabel && failureRepairResumeBatchRecord.scaleDecisionTone ? (
                  <div className={`mt-2 rounded-md border px-2 py-1 text-xs leading-5 ${executionScaleDecisionClass(failureRepairResumeBatchRecord.scaleDecisionTone)}`}>
                    <span className="font-medium">{failureRepairResumeBatchRecord.scaleDecisionLabel}</span>
                    <span className="ml-1 opacity-85">{failureRepairResumeBatchRecord.scaleDecisionDetail}</span>
                  </div>
                ) : null}
              </div>
              <Link className="w-fit rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800" href={hrefWithGateReturn(failureRepairResumeBatchRecord.stabilityActionHref ?? failureRepairResumeBatchRecord.decisionActionHref, gateReturn)}>
                {failureRepairResumeBatchRecord.stabilityActionLabel ?? failureRepairResumeBatchRecord.decisionActionLabel}
              </Link>
            </div>
          </div>
        ) : null}
        {safetyPriorityBlocker ? (
          <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-xs font-medium uppercase text-rose-700">PM 优先处理</div>
                <div className="mt-1 font-medium">{safetyPriorityBlocker.title}</div>
                <p className="mt-1 leading-6">{safetyPriorityBlocker.detail}</p>
              </div>
              <Link className="w-fit shrink-0 rounded-md bg-rose-950 px-3 py-2 text-xs font-medium text-white hover:bg-rose-900" href={hrefWithGateReturn(safetyPriorityBlocker.actionHref, gateReturn)}>
                {safetyPriorityBlocker.actionLabel}
              </Link>
            </div>
          </div>
        ) : null}
        {modelRolePriorityBlocker ? (
          <div className={`mt-3 rounded-md border p-3 text-sm ${modelRoleBlockerClass(modelRolePriorityBlocker.tone)}`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-xs font-medium uppercase opacity-80">模型路线优先处理</div>
                <div className="mt-1 font-medium">{modelRolePriorityBlocker.title}</div>
                <p className="mt-1 leading-6">{modelRolePriorityBlocker.detail}</p>
              </div>
              <Link className={`w-fit shrink-0 rounded-md px-3 py-2 text-xs font-medium ${modelRoleBlockerButtonClass(modelRolePriorityBlocker.tone)}`} href={hrefWithGateReturn(modelRolePriorityBlocker.actionHref, gateReturn)}>
                {modelRolePriorityBlocker.actionLabel}
              </Link>
            </div>
          </div>
        ) : null}
        <div className="mt-4 grid gap-2 md:grid-cols-3">
          {batchExecutionStrategies.map((strategy) => (
            <Link
              className={`rounded-md border p-3 text-sm ${strategy.id === activeStrategy.id ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white hover:bg-slate-50"}`}
              href={hrefWithGateReturn(`/tasks?batchStrategy=${strategy.id}`, gateReturn)}
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
              <RunRecommendedBatchButton
                disabled={!strategyDecision.canRun || modelRouteBlocksRecommendedBatch}
                executionContext={effectiveBatchContext}
                gateReturnHref={gateReturn}
                initialModelRouteGate={modelRoutePreflightGate}
                scaleDecisionDetail={executionPlan.scaleDecisionDetail}
                scaleDecisionLabel={executionPlan.scaleDecisionLabel}
                scaleDecisionTone={executionPlan.scaleDecisionTone}
                strategyId={strategyDecision.strategyId}
              />
            ) : (
              <Link className="w-fit rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white" href={hrefWithGateReturn(strategyDecision.actionHref, gateReturn)}>
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
            <Link className="w-fit rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50" href={hrefWithGateReturn(`/tasks?batchStrategy=${strategyComparison.recommendedStrategyId}`, gateReturn)}>
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="font-medium text-slate-950">{executionPlan.actionLabel}</div>
              <p className="mt-1 leading-6 text-slate-600">{executionPlan.detail}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className={`w-fit rounded-md border px-2 py-1 text-xs font-medium ${executionBatchModeClass(executionPlan.batchModeTone)}`}>
                {executionPlan.batchModeLabel}
              </div>
              <div className={`w-fit rounded-md border px-2 py-1 text-xs font-medium ${executionScaleDecisionClass(executionPlan.scaleDecisionTone)}`}>
                {executionPlan.scaleDecisionLabel}
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-600">{executionPlan.batchModeDetail}</p>
          {executionPlan.strategyBases.length ? (
            <div className="mt-3 grid gap-2 lg:grid-cols-2">
              {executionPlan.strategyBases.map((basis) => (
                <div className="rounded-md bg-white p-3 text-xs text-emerald-900" key={basis.title}>
                  <div className="font-medium">首轮平台打法 · {basis.label}</div>
                  <div className="mt-1">{basis.primaryTactic}</div>
                  <div className="mt-1">开头：{basis.openingMove}</div>
                  <div className="mt-1">验证：{basis.verificationMove}</div>
                </div>
              ))}
            </div>
          ) : null}
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
              {item.actionHref && item.actionLabel ? (
                <Link className="mt-3 inline-flex w-fit rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800" href={hrefWithGateReturn(item.actionHref, gateReturn)}>
                  {item.actionLabel}
                </Link>
              ) : null}
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
                    <Link className="font-medium text-slate-950 hover:underline" href={hrefWithGateReturn(batch.href, gateReturn)}>{batch.taskLabel}</Link>
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
                        <Link className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50" href={hrefWithGateReturn(action.href, gateReturn)} key={action.id} title={action.detail}>
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

      <section className="grid gap-3" id="platform-strategy-tasks">
        {visibleQueueItems.map((entry) => (
          <div className="rounded-md border border-slate-200 bg-white p-4" key={entry.id}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${categoryClass(entry.category)}`}>{blockerTypeLabel(entry)}</span>
                  <span className={`rounded-md border px-2 py-1 text-xs font-medium ${riskClass(entry.riskLevel)}`}>
                    {riskLabel(entry.riskLevel)} · {entry.riskLabel}
                  </span>
                  {entry.scaleGate !== "none" ? (
                    <span className={`rounded-md border px-2 py-1 text-xs font-medium ${scaleGateClass(entry.scaleGate)}`}>
                      {scaleGateDecisionLabel(entry.scaleGate, entry.riskLevel)} · {scaleGateLabel(entry.scaleGate)}
                    </span>
                  ) : null}
                  {taskQueueSourcePresentation(entry) ? (
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${taskQueueSourcePresentation(entry)?.badgeClass}`}>
                      {entry.sourceLabel}
                    </span>
                  ) : null}
                  <Link className="font-semibold text-slate-950 hover:underline" href={hrefWithGateReturn(`/projects/${entry.projectId}`, gateReturn)}>
                    {entry.projectTitle}
                  </Link>
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  {entry.platformName} · {entry.chapterTitle}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{entry.evidence}</p>
                {entry.sourceType === "first_three_adoption" && entry.sourceDetail ? (
                  <div className={`mt-3 rounded-md border px-3 py-2 text-xs leading-5 ${taskQueueSourcePresentation(entry)?.detailClass ?? "border-indigo-200 bg-indigo-50 text-indigo-950"}`}>
                    <span className="font-medium">{entry.sourceLabel}：</span>{entry.sourceDetail}
                    {taskQueueSourcePresentation(entry)?.returnHref ? (
                      <div className="mt-2">
                        <Link className="inline-flex rounded-md bg-white/80 px-2 py-1 font-medium text-indigo-800 hover:bg-white" href={hrefWithGateReturn(taskQueueSourcePresentation(entry)?.returnHref ?? "/gate", gateReturn)}>
                          {taskQueueSourcePresentation(entry)?.returnLabel}
                        </Link>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {entry.sourceType === "first_day_handoff" && entry.sourceDetail ? (
                  <div className={`mt-3 rounded-md border px-3 py-2 text-xs leading-5 ${taskQueueSourcePresentation(entry)?.detailClass ?? "border-cyan-200 bg-cyan-50 text-cyan-950"}`}>
                    <span className="font-medium">{entry.sourceLabel}：</span>{entry.sourceDetail}
                  </div>
                ) : null}
                {entry.sourceType === "tactic_experience_followup" && entry.sourceDetail ? (
                  <div className={`mt-3 rounded-md border px-3 py-2 text-xs leading-5 ${taskQueueSourcePresentation(entry)?.detailClass ?? "border-teal-200 bg-teal-50 text-teal-950"}`}>
                    <span className="font-medium">{entry.sourceLabel}：</span>{entry.sourceDetail}
                    {taskQueueSourcePresentation(entry)?.returnHref ? (
                      <div className="mt-2">
                        <Link className="inline-flex rounded-md bg-white/80 px-2 py-1 font-medium text-emerald-800 hover:bg-white" href={hrefWithGateReturn(taskQueueSourcePresentation(entry)?.returnHref ?? "/gate", gateReturn)}>
                          {taskQueueSourcePresentation(entry)?.returnLabel}
                        </Link>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {entry.sourceType === "platform_strategy" && entry.sourceDetail ? (
                  <div className={`mt-3 rounded-md border px-3 py-2 text-xs leading-5 ${taskQueueSourcePresentation(entry)?.detailClass ?? "border-violet-200 bg-violet-50 text-violet-950"}`}>
                    <span className="font-medium">{entry.sourceLabel}：</span>{entry.sourceDetail}
                  </div>
                ) : null}
                {entry.sourceType === "role_closure" && entry.sourceDetail ? (
                  <div className={`mt-3 rounded-md border px-3 py-2 text-xs leading-5 ${taskQueueSourcePresentation(entry)?.detailClass ?? "border-amber-200 bg-amber-50 text-amber-950"}`}>
                    <span className="font-medium">{entry.sourceLabel}：</span>{entry.sourceDetail}
                    {taskQueueSourcePresentation(entry)?.returnHref ? (
                      <div className="mt-2">
                        <Link className="inline-flex rounded-md bg-white/80 px-2 py-1 font-medium text-amber-800 hover:bg-white" href={hrefWithGateReturn(taskQueueSourcePresentation(entry)?.returnHref ?? "/dispatch", gateReturn)}>
                          {taskQueueSourcePresentation(entry)?.returnLabel}
                        </Link>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {entry.sourceType === "platform_strategy" && entry.sourceNextStep ? (
                  <div className="mt-2 rounded-md border border-violet-200 bg-white px-3 py-2 text-xs leading-5 text-violet-950">
                    <span className="font-medium">做完解锁：</span>{entry.sourceNextStep}
                  </div>
                ) : null}
                {entry.sourceType === "tactic_experience_followup" && entry.sourceDispatchKey ? (
                  <CompleteTacticExperienceFollowupForm
                    actionLabel={entry.actionLabel}
                    completionEvidenceTemplate={entry.completionEvidenceTemplate}
                    completionEvidenceTemplateSource={entry.completionEvidenceTemplateSource}
                    dispatchKey={entry.sourceDispatchKey}
                  />
                ) : null}
                {entry.category === "blocked" && entry.sourceDispatchKey ? (
                  <CompleteTaskDebtEvidenceForm
                    actionLabel={entry.actionLabel}
                    blockerType={entry.blockerType}
                    completionEvidenceTemplate={entry.completionEvidenceTemplate}
                    completionEvidenceTemplateSource={entry.completionEvidenceTemplateSource}
                    dispatchKey={entry.sourceDispatchKey}
                    gateReturnHref={gateReturn}
                    previousDebtCount={entry.blockerType ? debtView.groups.find((group) => group.blockerType === entry.blockerType)?.count ?? 0 : 0}
                  />
                ) : null}
                {entry.riskNotice ? (
                  <div className={`mt-3 rounded-md border px-3 py-2 text-xs leading-5 ${riskClass(entry.riskLevel)}`}>
                    {entry.riskNotice}
                  </div>
                ) : null}
                {entry.strategyBasis ? (
                  <div className="mt-3 border-l-2 border-emerald-500 pl-3 text-xs leading-5 text-emerald-900">
                    <div className="font-medium">首轮平台打法 · {entry.strategyBasis.label}</div>
                    <div className="mt-1">{entry.strategyBasis.primaryTactic}</div>
                    <div className="mt-1">开头：{entry.strategyBasis.openingMove}</div>
                    <div className="mt-1">验证：{entry.strategyBasis.verificationMove}</div>
                  </div>
                ) : null}
                {entry.handoffGuidance ? (
                  <div className="mt-3 grid gap-2 rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs leading-5 text-cyan-950">
                    <div className="font-medium">开书交接 · {entry.handoffGuidance.label}</div>
                    {entry.handoffGuidance.detail ? (
                      <div>{entry.handoffGuidance.detail}</div>
                    ) : null}
                    {entry.handoffGuidance.firstDayActions.length > 0 ? (
                      <div>
                        <div className="font-medium">首日动作</div>
                        <div className="mt-1 grid gap-1">
                          {entry.handoffGuidance.firstDayActions.slice(0, 3).map((action) => (
                            <div key={action}>- {action}</div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {entry.handoffGuidance.avoidRules.length > 0 ? (
                      <div>
                        <div className="font-medium">避坑边界</div>
                        <div className="mt-1 grid gap-1">
                          {entry.handoffGuidance.avoidRules.slice(0, 3).map((rule) => (
                            <div key={rule}>- {rule}</div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
              {entry.effectAction ? (
                <RunPublishEffectQueueActionButton
                  action={entry.effectAction}
                  actionLabel={entry.actionLabel}
                  gateReturnHref={gateReturn}
                  href={entry.href}
                  platformName={entry.platformName}
                  projectId={entry.projectId}
                />
              ) : (
                <Link className="w-fit rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50" href={hrefWithGateReturn(entry.href, gateReturn)}>
                  {entry.actionLabel}
                </Link>
              )}
            </div>
          </div>
        ))}
        {visibleQueueItems.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
            {activeView === "blocked" ? "当前没有阻塞债，可以回到全部任务继续推进。" : "当前没有可调度任务。先创建项目、补章节卡或生成正文。"}
          </p>
        ) : null}
      </section>
    </AppShell>
  );
}
