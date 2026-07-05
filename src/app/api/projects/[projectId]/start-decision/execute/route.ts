import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getPlatformProfile, type PlatformId } from "@/lib/platforms/platformProfiles";
import { getPlatformWritingStyle } from "@/lib/platforms/writingStyleTemplates";
import { buildWorldActionSeeds } from "@/lib/projects/controlActionSeeds";
import { buildProjectControlDashboard } from "@/lib/projects/projectControlDashboard";
import { buildProjectStartDecisionActionReceipt } from "@/lib/projects/projectStartDecisionActions";
import { gateActionReceiptFromAuditRecord } from "@/lib/projects/gateActionReceipts";
import { gatePlatformDispatchTaskFromRecord } from "@/lib/projects/gateDispatchTaskRecords";
import { buildProjectStartGateExperience, buildProjectStartSoilWorldEntries, buildProjectStartTacticWorldEntry } from "@/lib/projects/projectStartTactics";
import { parsePublishSnapshotTags } from "@/lib/projects/platformPublishExport";
import { buildSubmissionChecklist } from "@/lib/projects/submissionChecklist";
import { getDefaultTemplateForPlatform } from "@/lib/projects/projectTemplates";

interface Params {
  params: Promise<{ projectId: string }>;
}

async function saveReceipt(receipt: ReturnType<typeof buildProjectStartDecisionActionReceipt>) {
  const audit = await prisma.gateActionAudit.create({
    data: {
      receiptId: receipt.id,
      actionId: receipt.actionId,
      projectId: receipt.href.match(/\/projects\/([^/#?]+)/)?.[1] ?? null,
      platformId: receipt.platformId ?? "",
      platformName: receipt.platformName ?? "",
      label: receipt.label,
      detail: receipt.detail,
      href: receipt.href,
      status: receipt.status,
      message: receipt.message,
      executionType: receipt.executionType,
      succeededCount: receipt.succeededCount,
      failedCount: receipt.failedCount,
      taskId: receipt.taskId,
      recheckStatus: receipt.recheck.status,
      recheckLabel: receipt.recheck.label,
      recheckDetail: receipt.recheck.detail,
      recheckAction: receipt.recheck.actionLabel,
      payload: JSON.stringify({
        startTactics: receipt.startTactics ?? [],
        startDecisionAction: true,
      }),
      createdAt: new Date(receipt.createdAt),
    },
  });

  return audit;
}

export async function POST(_request: Request, { params }: Params) {
  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      chapters: { orderBy: { order: "asc" } },
      outlineNodes: { orderBy: [{ depth: "asc" }, { order: "asc" }, { createdAt: "asc" }] },
      characters: { orderBy: { createdAt: "asc" } },
      worldEntries: { orderBy: [{ type: "asc" }, { createdAt: "asc" }] },
      foreshadows: { orderBy: { createdAt: "asc" } },
      plotThreads: { orderBy: { createdAt: "asc" } },
      aiTasks: { orderBy: { createdAt: "desc" } },
      publishSnapshots: { orderBy: { createdAt: "desc" }, take: 80 },
      submissionAssets: { orderBy: { updatedAt: "desc" } },
      submissionAssetVersions: { orderBy: { createdAt: "desc" }, take: 80 },
      platformPublishMetrics: { orderBy: { snapshotDate: "desc" }, take: 80 },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const platformId = project.targetPlatform as PlatformId;
  const platform = getPlatformProfile(platformId);
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
    platformPublishMetrics: project.platformPublishMetrics,
    submissionChecklist,
  });
  const created: string[] = [];

  if (dashboard.startDecision.status === "seed") {
    const worldSeeds = buildWorldActionSeeds(project, platform, project.worldEntries);
    const template = getDefaultTemplateForPlatform(platformId);
    const style = getPlatformWritingStyle(platformId);
    const [gateAudits, gateTasks] = await Promise.all([
      prisma.gateActionAudit.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.gateDispatchTask.findMany({
        orderBy: { updatedAt: "desc" },
        take: 100,
      }),
    ]);
    const startExperience = buildProjectStartGateExperience({
      platform,
      template,
      style,
      receipts: gateAudits.map(gateActionReceiptFromAuditRecord),
      tasks: gateTasks.map(gatePlatformDispatchTaskFromRecord),
    });
    const startTacticEntry = buildProjectStartTacticWorldEntry(
      startExperience.advice,
      platform.name,
    );
    const startSoilEntries = buildProjectStartSoilWorldEntries({
      advice: startExperience.advice,
      platform,
      template,
      style,
      modelRoutes: startExperience.modelRoutes,
    });
    const hasStartTactic = project.worldEntries.some((entry) => (
      entry.type === "platform_soil" && entry.title.startsWith("首轮平台打法：")
    ));
    const seeds = [
      ...worldSeeds,
      ...(hasStartTactic ? [] : [startTacticEntry]),
      ...startSoilEntries,
    ].filter((seed) => !project.worldEntries.some((entry) => entry.type === seed.type && entry.title === seed.title));

    if (seeds.length > 0) {
      await prisma.worldEntry.createMany({
        data: seeds.map((seed) => ({
          projectId,
          ...seed,
        })),
      });
      created.push(...seeds.map((seed) => seed.title));
    }
  }

  const receipt = buildProjectStartDecisionActionReceipt({
    projectId,
    projectTitle: project.title,
    platformId,
    platformName: platform.name,
    decision: dashboard.startDecision,
    startTactic: dashboard.startTactic,
    created,
    skipped: created.length === 0 ? dashboard.startDecision.nextExperiment : null,
  });
  await saveReceipt(receipt);

  return NextResponse.json({
    receipt,
    created,
    targetAnchor: dashboard.startDecision.targetAnchor,
  }, { status: 201 });
}
