import { AppShell } from "@/components/app-shell/AppShell";
import { GateDispatchTaskCenter } from "@/components/gate/GateDispatchTaskCenter";
import { buildTaskBatchHistory } from "@/lib/ai/taskBatchHistory";
import { prisma } from "@/lib/db/prisma";
import {
  buildRouteConfirmationGovernanceEvidenceFromDispatchTasks,
  buildRouteConfirmationGovernanceFollowUpDispatches,
  buildModelRouteConfirmationDispatch,
  modelRouteConfirmationReceiptFromAudit,
} from "@/lib/model-gateway/routeConfirmation";
import {
  buildGateFailureRepairReceiptReview,
  buildGateFailureRepairRecheckDispatchItems,
  buildGateFailureRepairRecheckResolution,
  buildGateFailureRepairThirdRoundDispatchItems,
  type GateActionReceipt,
  type GatePlatformGrowthDispatchItem,
  type GatePlatformGrowthDispatchState,
  type PersistedGatePlatformDispatchTask,
} from "@/lib/projects/gateActionReceipts";
import { buildPrePublishGate } from "@/lib/projects/prePublishGate";
import { parsePublishSnapshotTags } from "@/lib/projects/platformPublishExport";

export const dynamic = "force-dynamic";

function normalizeAssetAuditStatus(status: string): "ready" | "blocked" | "needs_work" {
  if (status === "ready" || status === "blocked") return status;
  return "needs_work";
}

function parseStringList(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function state(value: string): GatePlatformGrowthDispatchState {
  if (value === "completed") return "completed";
  if (value === "assigned") return "assigned";
  return "queued";
}

function toTask(task: {
  id: string;
  dispatchKey: string;
  projectId: string | null;
  platformId: string;
  platformName: string;
  stage: string;
  state: string;
  priorityScore: number;
  ownerRole: string;
  title: string;
  detail: string;
  dueLabel: string;
  actionLabel: string;
  href: string;
  acceptanceCriteria: string;
  evidence: string;
  sourceReceiptId: string | null;
  completionEvidence: string;
  reviewLatestAt: Date;
  assignedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): PersistedGatePlatformDispatchTask {
  return {
    databaseId: task.id,
    dispatchKey: task.dispatchKey,
    id: task.dispatchKey,
    projectId: task.projectId,
    platformId: task.platformId,
    platformName: task.platformName,
    stage: task.stage as PersistedGatePlatformDispatchTask["stage"],
    state: state(task.state),
    priorityScore: task.priorityScore,
    ownerRole: task.ownerRole,
    title: task.title,
    detail: task.detail,
    dueLabel: task.dueLabel,
    actionLabel: task.actionLabel,
    href: task.href,
    acceptanceCriteria: parseStringList(task.acceptanceCriteria),
    evidence: parseStringList(task.evidence),
    sourceReceiptId: task.sourceReceiptId,
    completionEvidence: task.completionEvidence,
    reviewLatestAt: task.reviewLatestAt.toISOString(),
    assignedAt: task.assignedAt?.toISOString() ?? null,
    completedAt: task.completedAt?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

function toReceipt(item: {
  receiptId: string;
  actionId: string;
  label: string;
  detail: string;
  href: string;
  status: string;
  message: string;
  executionType: string;
  succeededCount: number;
  failedCount: number;
  taskId: string | null;
  platformId: string;
  platformName: string;
  recheckStatus: string;
  recheckLabel: string;
  recheckDetail: string;
  recheckAction: string;
  createdAt: Date;
}): GateActionReceipt {
  return {
    id: item.receiptId,
    actionId: item.actionId,
    label: item.label,
    detail: item.detail,
    href: item.href,
    status: item.status === "failed" ? "failed" : "succeeded",
    message: item.message,
    executionType: item.executionType as GateActionReceipt["executionType"],
    succeededCount: item.succeededCount,
    failedCount: item.failedCount,
    taskId: item.taskId,
    platformId: item.platformId,
    platformName: item.platformName,
    recheck: {
      status: item.recheckStatus === "blocked" ? "blocked" : "ready",
      label: item.recheckLabel,
      detail: item.recheckDetail,
      actionLabel: item.recheckAction,
    },
    createdAt: item.createdAt.toISOString(),
  };
}

function toVirtualTask(
  item: GatePlatformGrowthDispatchItem,
  persisted?: PersistedGatePlatformDispatchTask,
): PersistedGatePlatformDispatchTask {
  const timestamp = persisted?.updatedAt ?? item.reviewLatestAt;

  return {
    databaseId: persisted?.databaseId ?? "",
    dispatchKey: item.id,
    id: item.id,
    projectId: persisted?.projectId ?? null,
    platformId: item.platformId,
    platformName: item.platformName,
    stage: item.stage,
    state: item.state,
    priorityScore: item.priorityScore,
    ownerRole: item.ownerRole,
    title: item.title,
    detail: item.detail,
    dueLabel: item.dueLabel,
    actionLabel: item.actionLabel,
    href: item.href,
    acceptanceCriteria: item.acceptanceCriteria,
    evidence: item.evidence,
    sourceReceiptId: persisted?.sourceReceiptId ?? null,
    completionEvidence: persisted?.completionEvidence ?? "",
    reviewLatestAt: item.reviewLatestAt,
    assignedAt: persisted?.assignedAt ?? null,
    completedAt: persisted?.completedAt ?? null,
    createdAt: persisted?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
}

export default async function DispatchPage() {
  const [tasks, receipts, projects, recentAiTasks, chapters] = await Promise.all([
    prisma.gateDispatchTask.findMany({
      orderBy: [
        { state: "asc" },
        { priorityScore: "desc" },
        { updatedAt: "desc" },
      ],
      take: 200,
    }),
    prisma.gateActionAudit.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
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
  const persistedTasks = tasks.map(toTask);
  const receiptItems = receipts.map(toReceipt);
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
  const failureRepairReview = buildGateFailureRepairReceiptReview(gate.failureRepairBatch, receiptItems);
  const failureRepairResolution = buildGateFailureRepairRecheckResolution(gate.failureRepairBatch, persistedTasks);
  const persistedByKey = new Map(persistedTasks.map((task) => [task.dispatchKey, task]));
  const routeConfirmationReceipts = receipts
    .map(modelRouteConfirmationReceiptFromAudit)
    .filter((receipt): receipt is NonNullable<ReturnType<typeof modelRouteConfirmationReceiptFromAudit>> => Boolean(receipt));
  const routeConfirmationDispatches = routeConfirmationReceipts.map(buildModelRouteConfirmationDispatch);
  const routeGovernanceEvidence = buildRouteConfirmationGovernanceEvidenceFromDispatchTasks(persistedTasks);
  const routeGovernanceFollowUps = buildRouteConfirmationGovernanceFollowUpDispatches(routeGovernanceEvidence, {
    routeConfirmations: routeConfirmationReceipts,
  });
  const generatedTasks = [
    ...routeConfirmationDispatches,
    ...routeGovernanceFollowUps,
    ...buildGateFailureRepairRecheckDispatchItems(
      failureRepairReview,
      gate.failureRepairBatch,
      persistedTasks,
    ),
    ...buildGateFailureRepairThirdRoundDispatchItems(
      failureRepairResolution,
      gate.failureRepairBatch,
      persistedTasks,
    ),
  ].map((item) => toVirtualTask(item, persistedByKey.get(item.id)));
  const generatedKeys = new Set(generatedTasks.map((task) => task.dispatchKey));
  const mergedTasks = [
    ...generatedTasks,
    ...persistedTasks.filter((task) => !generatedKeys.has(task.dispatchKey)),
  ];

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">平台派单中心</h1>
          <p className="mt-1 text-sm text-slate-600">把总闸门里的平台复盘任务集中管理，按状态、平台和角色推进闭环。</p>
        </div>
        <div className="w-fit rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">
          {mergedTasks.length ? `${mergedTasks.length} 个派单任务` : "等待总闸门派单"}
        </div>
      </div>
      <GateDispatchTaskCenter initialReceipts={receiptItems} initialTasks={mergedTasks} />
    </AppShell>
  );
}
