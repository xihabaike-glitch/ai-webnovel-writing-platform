import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getPlatformProfile, type PlatformId } from "@/lib/platforms/platformProfiles";
import { buildProjectControlDashboard } from "@/lib/projects/projectControlDashboard";
import { parsePublishSnapshotTags } from "@/lib/projects/platformPublishExport";
import { buildSubmissionChecklist } from "@/lib/projects/submissionChecklist";

interface Params {
  params: Promise<{ projectId: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  const { projectId } = await params;
  const [project, modelProviders, modelRoutes] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      include: {
        chapters: { orderBy: { order: "asc" } },
        outlineNodes: { orderBy: [{ depth: "asc" }, { order: "asc" }, { createdAt: "asc" }] },
        characters: { orderBy: { createdAt: "asc" } },
        worldEntries: { orderBy: [{ type: "asc" }, { createdAt: "asc" }] },
        foreshadows: { orderBy: { createdAt: "asc" } },
        plotThreads: { orderBy: { createdAt: "asc" } },
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
        publishSnapshots: { orderBy: { createdAt: "desc" }, take: 80 },
        submissionAssets: { orderBy: { updatedAt: "desc" } },
        submissionAssetVersions: { orderBy: { createdAt: "desc" }, take: 80 },
        platformPublishMetrics: { orderBy: { snapshotDate: "desc" }, take: 80 },
        platformKnowledgeFeedbackReceipts: { orderBy: { createdAt: "desc" }, take: 10 },
        gateActionAudits: {
          where: { executionType: { in: ["recommended_batch", "control_action"] } },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    }),
    prisma.modelProvider.findMany({
      orderBy: { createdAt: "asc" },
    }),
    prisma.modelTaskRoute.findMany({
      orderBy: { taskType: "asc" },
    }),
  ]);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const platform = getPlatformProfile(project.targetPlatform as PlatformId);
  const submissionChecklist = buildSubmissionChecklist({
    title: project.title,
    genre: project.genre,
    sellingPoint: project.sellingPoint,
    currentWordCount: project.currentWordCount,
    targetWordCount: project.targetWordCount,
    platform,
    chapters: project.chapters,
    aiTasks: project.aiTasks.map((task) => ({
      taskType: task.taskType,
      status: task.status,
      chapter: task.chapterId ? { id: task.chapterId } : null,
    })),
  });
  const dashboard = buildProjectControlDashboard({
    project: {
      title: project.title,
      genre: project.genre,
      sellingPoint: project.sellingPoint,
      targetLengthType: project.targetLengthType,
      targetWordCount: project.targetWordCount,
      currentWordCount: project.currentWordCount,
      updateCadence: project.updateCadence,
      aiMonthlyBudgetUsd: project.aiMonthlyBudgetUsd,
      aiMaxTaskCostUsd: project.aiMaxTaskCostUsd,
      aiMaxBatchCostUsd: project.aiMaxBatchCostUsd,
      aiMaxFailureRatePercent: project.aiMaxFailureRatePercent,
      aiBudgetEnforcement: project.aiBudgetEnforcement,
    },
    platform,
    chapters: project.chapters,
    outlineNodes: project.outlineNodes,
    characters: project.characters,
    worldEntries: project.worldEntries,
    foreshadows: project.foreshadows,
    plotThreads: project.plotThreads,
    aiTasks: project.aiTasks,
    publishSnapshots: project.publishSnapshots,
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
      auditStatus: version.auditStatus === "ready" || version.auditStatus === "blocked" ? version.auditStatus : "needs_work",
      action: version.action,
      sourceTaskId: version.sourceTaskId,
      strategy: version.strategy,
      createdAt: version.createdAt,
    })),
    platformPublishMetrics: project.platformPublishMetrics.map((metric) => ({
      id: metric.id,
      platformId: metric.platformId,
      platformName: metric.platformName,
      views: metric.views,
      clicks: metric.clicks,
      favorites: metric.favorites,
      follows: metric.follows,
      comments: metric.comments,
      paidReads: metric.paidReads,
      editorFeedback: metric.editorFeedback,
      contractStatus: metric.contractStatus,
      publishUrl: metric.publishUrl,
      notes: metric.notes,
      snapshotDate: metric.snapshotDate,
      createdAt: metric.createdAt,
      updatedAt: metric.updatedAt,
    })),
    platformKnowledgeFeedbackReceipts: project.platformKnowledgeFeedbackReceipts.map((receipt) => ({
      id: receipt.receiptId,
      platformId: receipt.platformId,
      platformName: receipt.platformName,
      actionLabel: receipt.actionLabel,
      title: receipt.title,
      message: receipt.message,
      completedStepLabel: receipt.completedStepLabel,
      stopReason: receipt.stopReason,
      nextAction: receipt.nextAction,
      href: receipt.href,
      severity: receipt.severity === "success" ? "success" : "needs_action",
      createdAt: receipt.createdAt,
    })),
    gateActionAudits: project.gateActionAudits.map((audit) => ({
      receiptId: audit.receiptId,
      actionId: audit.actionId,
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
    modelProviders,
    modelRoutes,
    submissionChecklist,
  });

  return NextResponse.json({ dashboard });
}
