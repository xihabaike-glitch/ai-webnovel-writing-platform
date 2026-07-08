import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getPlatformProfile, type PlatformId } from "@/lib/platforms/platformProfiles";
import { buildSerializationOpsDashboard } from "@/lib/projects/serializationOps";
import { buildPlatformPublishExportCenter, parsePublishSnapshotTags } from "@/lib/projects/platformPublishExport";
import { buildSubmissionChecklist } from "@/lib/projects/submissionChecklist";

interface Params {
  params: Promise<{ projectId: string }>;
}

function normalizeAuditStatus(status: string): "ready" | "blocked" | "needs_work" {
  if (status === "ready" || status === "blocked") return status;
  return "needs_work";
}

export async function GET(_request: Request, { params }: Params) {
  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      chapters: {
        orderBy: { order: "asc" },
        include: {
          revisions: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
      },
      aiTasks: {
        orderBy: { createdAt: "desc" },
      },
      publishSnapshots: { orderBy: { createdAt: "desc" }, take: 80 },
      submissionAssets: { orderBy: { updatedAt: "desc" } },
      submissionAssetVersions: { orderBy: { createdAt: "desc" }, take: 80 },
      platformPublishMetrics: { orderBy: { snapshotDate: "desc" }, take: 80 },
      worldEntries: { orderBy: [{ type: "asc" }, { createdAt: "asc" }] },
    },
  });

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
      chapterId: task.chapterId,
      taskType: task.taskType,
      status: task.status,
      chapter: task.chapterId ? { id: task.chapterId } : null,
      createdAt: task.createdAt,
    })),
  });
  const submissionAssets = project.submissionAssets.map((asset) => ({
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
  }));
  const submissionAssetVersions = project.submissionAssetVersions.map((version) => ({
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
    auditStatus: normalizeAuditStatus(version.auditStatus),
    action: version.action,
    sourceTaskId: version.sourceTaskId,
    strategy: version.strategy,
    createdAt: version.createdAt,
  }));
  const publishCenter = buildPlatformPublishExportCenter({
    projectId: project.id,
    project: {
      title: project.title,
      genre: project.genre,
      sellingPoint: project.sellingPoint,
      currentWordCount: project.currentWordCount,
      targetWordCount: project.targetWordCount,
    },
    targetPlatform: platform,
    platforms: [platform],
    chapters: project.chapters,
    aiTasks: project.aiTasks,
    chapterRevisions: project.chapters.flatMap((chapter) => (
      chapter.revisions.map((revision) => ({
        id: revision.id,
        chapterId: chapter.id,
        source: revision.source,
        sourceTaskId: revision.sourceTaskId,
        title: revision.title,
        content: revision.content,
        wordCount: revision.wordCount,
        notes: revision.notes,
        createdAt: revision.createdAt,
      }))
    )),
    publishSnapshots: project.publishSnapshots,
    submissionAssets,
    submissionAssetVersions,
    platformPublishMetrics: project.platformPublishMetrics,
    submissionChecklist,
  });
  const targetPackage = publishCenter.packages.find((pack) => pack.platformId === platform.id) ?? publishCenter.packages[0] ?? null;
  const dashboard = buildSerializationOpsDashboard({
    project: {
      id: project.id,
      title: project.title,
      currentWordCount: project.currentWordCount,
      targetWordCount: project.targetWordCount,
      updateCadence: project.updateCadence,
    },
    platform,
    chapters: project.chapters,
    aiTasks: project.aiTasks,
    submissionChecklist,
    submissionAssets,
    submissionAssetVersions,
    finalGate: targetPackage?.finalGate ?? null,
    publishEffect: targetPackage?.publishEffect ?? null,
    effectOptimization: targetPackage?.effectOptimization ?? null,
    worldEntries: project.worldEntries,
    publishSnapshots: project.publishSnapshots.map((snapshot) => ({
      id: snapshot.id,
      platformId: snapshot.platformId,
      platformName: snapshot.platformName,
      title: snapshot.title,
      action: snapshot.action,
      chapterCount: snapshot.chapterCount,
      wordCount: snapshot.wordCount,
      preflightScore: snapshot.preflightScore,
      canExport: snapshot.canExport,
      createdAt: snapshot.createdAt,
    })),
  });

  return NextResponse.json({
    dashboard,
    submissionChecklist,
  });
}
