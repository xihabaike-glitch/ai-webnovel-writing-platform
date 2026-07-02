import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getPlatformProfile, platformProfiles, type PlatformId } from "@/lib/platforms/platformProfiles";
import {
  buildPlatformPublishExportCenter,
  buildPlatformPublishArchive,
  buildPlatformStrategySwitchPlan,
  buildPublishPackageRestorePatch,
  buildPublishPackageVersionComparison,
  buildSubmissionAssetAudit,
  parsePublishSnapshotTags,
  type PublishPackageArchiveGroup,
  type PlatformPublishPackage,
  type PublishPackageSnapshotDetail,
} from "@/lib/projects/platformPublishExport";
import { buildSubmissionChecklist } from "@/lib/projects/submissionChecklist";

interface Params {
  params: Promise<{ projectId: string }>;
}

function selectedPlatform(platformId: string | null) {
  if (!platformId) return null;
  return platformProfiles.find((platform) => platform.id === platformId) ?? null;
}

function snapshotActionLabel(action: string | null) {
  if (action === "copy") return "copy";
  if (action === "download") return "download";
  if (action === "restore") return "restore";
  return "snapshot";
}

function normalizeTagsInput(tags: unknown) {
  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 12);
  }
  if (typeof tags !== "string") return [];
  try {
    const parsed = JSON.parse(tags) as unknown;
    if (Array.isArray(parsed)) return normalizeTagsInput(parsed);
  } catch {
    // Plain text tag lists are expected from the editor.
  }
  return tags.split(/[、,，\n]/).map((tag) => tag.trim()).filter(Boolean).slice(0, 12);
}

function trimText(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function normalizeMetricNumber(value: unknown) {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value.trim()) : 0;
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.round(number));
}

function normalizeSnapshotDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function normalizeContractStatus(value: unknown) {
  if (value === "signed" || value === "invited" || value === "rejected" || value === "pending") return value;
  return "unknown";
}

function strategyUpdateCadence(platform: ReturnType<typeof selectedPlatform>, fallback: string) {
  if (!platform) return fallback;
  if (platform.category === "free") return "daily_4000_6000_main_platform";
  if (platform.category === "short") return "short_serial_closed_loop";
  if (platform.category === "overseas") return "3_5_chapters_weekly_en";
  if (platform.category === "female") return "daily_3000_emotion_arc";
  return "daily_4000_long_form";
}

async function buildCenter(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      chapters: { orderBy: { order: "asc" } },
      aiTasks: { orderBy: { createdAt: "desc" } },
      publishSnapshots: { orderBy: { createdAt: "desc" }, take: 80 },
      submissionAssets: { orderBy: { updatedAt: "desc" } },
      submissionAssetVersions: { orderBy: { createdAt: "desc" }, take: 80 },
      platformPublishMetrics: { orderBy: { snapshotDate: "desc" }, take: 80 },
    },
  });

  if (!project) {
    return null;
  }

  const targetPlatform = getPlatformProfile(project.targetPlatform as PlatformId);
  const submissionChecklist = buildSubmissionChecklist({
    title: project.title,
    genre: project.genre,
    sellingPoint: project.sellingPoint,
    currentWordCount: project.currentWordCount,
    targetWordCount: project.targetWordCount,
    platform: targetPlatform,
    chapters: project.chapters,
    aiTasks: project.aiTasks.map((task) => ({
      taskType: task.taskType,
      status: task.status,
      chapter: task.chapterId ? { id: task.chapterId } : null,
    })),
  });
  const center = buildPlatformPublishExportCenter({
    project: {
      title: project.title,
      genre: project.genre,
      sellingPoint: project.sellingPoint,
      currentWordCount: project.currentWordCount,
      targetWordCount: project.targetWordCount,
    },
    targetPlatform,
    chapters: project.chapters,
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
    submissionChecklist,
  });

  return { project, targetPlatform, center };
}

async function createPublishSnapshot(projectId: string, pack: PlatformPublishPackage, action: string) {
  return prisma.publishPackageSnapshot.create({
    data: {
      projectId,
      platformId: pack.platformId,
      platformName: pack.platformName,
      title: pack.title,
      logline: pack.logline,
      synopsis: pack.synopsis,
      tags: JSON.stringify(pack.tags),
      markdown: pack.markdown,
      chapterCount: pack.chapters.length,
      wordCount: pack.chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0),
      preflightScore: pack.preflight.score,
      canExport: pack.canExport,
      action,
    },
  });
}

function buildArchiveGroup(snapshots: {
  id: string;
  platformId: string;
  platformName: string;
  chapterCount: number;
  wordCount: number;
  preflightScore: number;
  canExport: boolean;
  createdAt: Date;
}[]): PublishPackageArchiveGroup | null {
  if (!snapshots.length) return null;
  const sorted = [...snapshots].sort((left, right) => left.platformName.localeCompare(right.platformName));
  return {
    createdAt: sorted[0].createdAt,
    platformCount: sorted.length,
    totalWordCount: sorted.reduce((sum, item) => sum + item.wordCount, 0),
    platforms: sorted.map((item) => ({
      id: item.id,
      platformId: item.platformId,
      platformName: item.platformName,
      chapterCount: item.chapterCount,
      wordCount: item.wordCount,
      preflightScore: item.preflightScore,
      canExport: item.canExport,
    })),
  };
}

export async function GET(request: Request, { params }: Params) {
  const { projectId } = await params;
  const { searchParams } = new URL(request.url);
  const context = await buildCenter(projectId);

  if (!context) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const { project, targetPlatform, center } = context;
  const platform = selectedPlatform(searchParams.get("platformId"));
  const versionId = searchParams.get("versionId");

  if (versionId) {
    const snapshot = await prisma.publishPackageSnapshot.findFirst({
      where: {
        id: versionId,
        projectId,
      },
    });

    if (!snapshot) {
      return NextResponse.json({ error: "Publish package version not found" }, { status: 404 });
    }

    const currentPack = center.packages.find((item) => item.platformId === snapshot.platformId)
      ?? center.packages[0];
    const version: PublishPackageSnapshotDetail = {
      id: snapshot.id,
      platformId: snapshot.platformId,
      platformName: snapshot.platformName,
      title: snapshot.title,
      logline: snapshot.logline,
      synopsis: snapshot.synopsis,
      tags: parsePublishSnapshotTags(snapshot.tags),
      markdown: snapshot.markdown,
      action: snapshot.action,
      chapterCount: snapshot.chapterCount,
      wordCount: snapshot.wordCount,
      preflightScore: snapshot.preflightScore,
      canExport: snapshot.canExport,
      createdAt: snapshot.createdAt,
    };
    const archiveGroup = snapshot.action === "archive"
      ? buildArchiveGroup((await prisma.publishPackageSnapshot.findMany({
        where: { projectId, action: "archive" },
        orderBy: { createdAt: "desc" },
        take: 80,
      })).filter((item) => Math.abs(item.createdAt.getTime() - snapshot.createdAt.getTime()) <= 5000))
      : null;

    return NextResponse.json({
      version,
      comparison: buildPublishPackageVersionComparison(version, currentPack),
      archiveGroup,
    });
  }

  if (searchParams.get("format") === "markdown") {
    const pack = center.packages.find((item) => item.platformId === (platform?.id ?? targetPlatform.id))
      ?? center.packages[0];

    if (!pack.canExport) {
      return NextResponse.json({
        error: "发布前质检未通过",
        preflight: pack.preflight,
      }, { status: 409 });
    }

    await createPublishSnapshot(projectId, pack, "download");

    return new NextResponse(pack.markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(`${project.title}-${pack.platformName}-发布包.md`)}"`,
      },
    });
  }

  if (searchParams.get("format") === "archive") {
    const archive = buildPlatformPublishArchive(center, project.title);
    const exportablePacks = center.packages.filter((pack) => pack.canExport);

    if (!exportablePacks.length) {
      return NextResponse.json({
        error: "没有通过质检的平台发布包，暂不能下载全平台投稿包。",
        archive,
      }, { status: 409 });
    }

    await prisma.$transaction(
      exportablePacks.map((pack) => prisma.publishPackageSnapshot.create({
        data: {
          projectId,
          platformId: pack.platformId,
          platformName: pack.platformName,
          title: pack.title,
          logline: pack.logline,
          synopsis: pack.synopsis,
          tags: JSON.stringify(pack.tags),
          markdown: pack.markdown,
          chapterCount: pack.chapters.length,
          wordCount: pack.chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0),
          preflightScore: pack.preflight.score,
          canExport: pack.canExport,
          action: "archive",
        },
      })),
    );

    return new NextResponse(archive.markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(`${project.title}-全平台投稿包.md`)}"`,
      },
    });
  }

  return NextResponse.json({
    center,
    selectedPackage: platform ? center.packages.find((pack) => pack.platformId === platform.id) ?? null : null,
  });
}

export async function POST(request: Request, { params }: Params) {
  const { projectId } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    platformId?: string;
    action?: string;
    versionId?: string;
    title?: unknown;
    logline?: unknown;
    synopsis?: unknown;
    overseasSynopsis?: unknown;
    tags?: unknown;
    note?: unknown;
    sourceTaskId?: unknown;
    strategy?: unknown;
    saveAction?: unknown;
    views?: unknown;
    clicks?: unknown;
    favorites?: unknown;
    follows?: unknown;
    comments?: unknown;
    paidReads?: unknown;
    editorFeedback?: unknown;
    contractStatus?: unknown;
    publishUrl?: unknown;
    snapshotDate?: unknown;
  };
  const context = await buildCenter(projectId);

  if (!context) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (body.action === "apply-strategy") {
    const platform = selectedPlatform(body.platformId ?? null);
    if (!platform) {
      return NextResponse.json({ error: "请选择有效发布平台。" }, { status: 400 });
    }

    const strategy = context.center.platformStrategy.find((item) => item.platformId === platform.id);
    if (!strategy) {
      return NextResponse.json({ error: "当前平台暂未生成策略评分。" }, { status: 400 });
    }

    const previousPlatform = getPlatformProfile(context.project.targetPlatform as PlatformId);
    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        targetPlatform: platform.id,
        updateCadence: strategyUpdateCadence(platform, context.project.updateCadence),
      },
    });
    const switchPlan = buildPlatformStrategySwitchPlan(
      strategy,
      previousPlatform,
      context.center.packages.find((pack) => pack.platformId === platform.id),
    );

    return NextResponse.json({
      message: `已把主战场切到 ${platform.name}。`,
      project,
      strategy,
      switchPlan,
    });
  }

  if (body.action === "save-effect") {
    const platform = selectedPlatform(body.platformId ?? null);
    if (!platform) {
      return NextResponse.json({ error: "请选择有效发布平台。" }, { status: 400 });
    }

    const metric = await prisma.platformPublishMetric.create({
      data: {
        projectId,
        platformId: platform.id,
        platformName: platform.name,
        views: normalizeMetricNumber(body.views),
        clicks: normalizeMetricNumber(body.clicks),
        favorites: normalizeMetricNumber(body.favorites),
        follows: normalizeMetricNumber(body.follows),
        comments: normalizeMetricNumber(body.comments),
        paidReads: normalizeMetricNumber(body.paidReads),
        editorFeedback: trimText(body.editorFeedback),
        contractStatus: normalizeContractStatus(body.contractStatus),
        publishUrl: trimText(body.publishUrl),
        notes: trimText(body.note),
        snapshotDate: normalizeSnapshotDate(body.snapshotDate),
      },
    });

    return NextResponse.json({
      message: `已记录 ${platform.name} 发布效果。`,
      metric,
    }, { status: 201 });
  }

  if (body.action === "save-asset") {
    const platform = selectedPlatform(body.platformId ?? null);
    if (!platform) {
      return NextResponse.json({ error: "请选择有效发布平台。" }, { status: 400 });
    }

    const normalizedTags = normalizeTagsInput(body.tags);
    const normalizedAsset = {
      platformId: platform.id,
      platformName: platform.name,
      title: trimText(body.title, context.project.title),
      logline: trimText(body.logline),
      synopsis: trimText(body.synopsis),
      overseasSynopsis: trimText(body.overseasSynopsis),
      tags: normalizedTags,
      note: trimText(body.note),
      source: typeof body.sourceTaskId === "string" && body.sourceTaskId.trim() ? "ai_variant" : "manual",
    };
    const audit = buildSubmissionAssetAudit(platform, normalizedAsset);
    const sourceTaskId = trimText(body.sourceTaskId) || null;
    const strategy = trimText(body.strategy);
    const versionAction = body.saveAction === "adopt" && sourceTaskId ? "adopt" : "save";
    const [asset, assetVersion] = await prisma.$transaction(async (tx) => {
      const savedAsset = await tx.platformSubmissionAsset.upsert({
        where: {
          projectId_platformId: {
            projectId,
            platformId: platform.id,
          },
        },
        create: {
          projectId,
          platformId: platform.id,
          platformName: platform.name,
          title: normalizedAsset.title,
          logline: normalizedAsset.logline,
          synopsis: normalizedAsset.synopsis,
          overseasSynopsis: normalizedAsset.overseasSynopsis,
          tags: JSON.stringify(normalizedTags),
          note: normalizedAsset.note,
          source: normalizedAsset.source,
        },
        update: {
          platformName: platform.name,
          title: normalizedAsset.title,
          logline: normalizedAsset.logline,
          synopsis: normalizedAsset.synopsis,
          overseasSynopsis: normalizedAsset.overseasSynopsis,
          tags: JSON.stringify(normalizedTags),
          note: normalizedAsset.note,
          source: normalizedAsset.source,
        },
      });
      const savedVersion = await tx.platformSubmissionAssetVersion.create({
        data: {
          projectId,
          assetId: savedAsset.id,
          platformId: platform.id,
          platformName: platform.name,
          title: normalizedAsset.title,
          logline: normalizedAsset.logline,
          synopsis: normalizedAsset.synopsis,
          overseasSynopsis: normalizedAsset.overseasSynopsis,
          tags: JSON.stringify(normalizedTags),
          note: normalizedAsset.note,
          source: normalizedAsset.source,
          sourceTaskId,
          strategy,
          auditScore: audit.score,
          auditStatus: audit.status,
          action: versionAction,
        },
      });
      return [savedAsset, savedVersion];
    });

    return NextResponse.json({
      message: `已保存 ${platform.name} 投稿资产。`,
      asset: {
        ...asset,
        tags: parsePublishSnapshotTags(asset.tags),
      },
      assetVersion: {
        ...assetVersion,
        tags: parsePublishSnapshotTags(assetVersion.tags),
      },
      audit,
    }, { status: 201 });
  }

  if (body.action === "restore" && body.versionId) {
    const version = await prisma.publishPackageSnapshot.findFirst({
      where: {
        id: body.versionId,
        projectId,
      },
    });

    if (!version) {
      return NextResponse.json({ error: "Publish package version not found" }, { status: 404 });
    }

    const patch = buildPublishPackageRestorePatch({
      title: version.title,
      logline: version.logline,
    });
    const restoreTags = parsePublishSnapshotTags(version.tags);
    const restorePlatform = selectedPlatform(version.platformId);
    const restoreAudit = restorePlatform
      ? buildSubmissionAssetAudit(restorePlatform, {
        title: version.title,
        logline: version.logline,
        synopsis: version.synopsis,
        overseasSynopsis: version.synopsis,
        tags: restoreTags,
      })
      : { score: 0, status: "needs_work" as const, passed: [], issues: [] };
    const [, , assetVersion, snapshot] = await prisma.$transaction(async (tx) => {
      const updatedProject = await tx.project.update({
        where: { id: projectId },
        data: {
          title: patch.title,
          sellingPoint: patch.sellingPoint,
        },
      });
      const restoredAsset = await tx.platformSubmissionAsset.upsert({
        where: {
          projectId_platformId: {
            projectId,
            platformId: version.platformId,
          },
        },
        create: {
          projectId,
          platformId: version.platformId,
          platformName: version.platformName,
          title: version.title,
          logline: version.logline,
          synopsis: version.synopsis,
          overseasSynopsis: version.synopsis,
          tags: version.tags,
          note: "由历史发布包恢复。",
          source: "restore",
        },
        update: {
          platformName: version.platformName,
          title: version.title,
          logline: version.logline,
          synopsis: version.synopsis,
          overseasSynopsis: version.synopsis,
          tags: version.tags,
          note: "由历史发布包恢复。",
          source: "restore",
        },
      });
      const restoredAssetVersion = await tx.platformSubmissionAssetVersion.create({
        data: {
          projectId,
          assetId: restoredAsset.id,
          platformId: version.platformId,
          platformName: version.platformName,
          title: version.title,
          logline: version.logline,
          synopsis: version.synopsis,
          overseasSynopsis: version.synopsis,
          tags: version.tags,
          note: "由历史发布包恢复。",
          source: "restore",
          auditScore: restoreAudit.score,
          auditStatus: restoreAudit.status,
          action: "restore",
        },
      });
      const restoredSnapshot = await tx.publishPackageSnapshot.create({
        data: {
          projectId,
          platformId: version.platformId,
          platformName: version.platformName,
          title: version.title,
          logline: version.logline,
          synopsis: version.synopsis,
          tags: version.tags,
          markdown: version.markdown,
          chapterCount: version.chapterCount,
          wordCount: version.wordCount,
          preflightScore: version.preflightScore,
          canExport: version.canExport,
          action: "restore",
        },
      });
      return [updatedProject, restoredAsset, restoredAssetVersion, restoredSnapshot];
    });

    return NextResponse.json({
      message: `已恢复 ${version.platformName} 历史版本，并写入投稿资产版本。`,
      patch,
      assetVersion,
      snapshot,
    });
  }

  const { targetPlatform, center } = context;
  const platform = selectedPlatform(body.platformId ?? null);
  const pack = center.packages.find((item) => item.platformId === (platform?.id ?? targetPlatform.id))
    ?? center.packages[0];

  if (!pack.canExport) {
    return NextResponse.json({
      error: "发布前质检未通过，暂不保存发布包版本。",
      preflight: pack.preflight,
    }, { status: 409 });
  }

  const snapshot = await createPublishSnapshot(projectId, pack, snapshotActionLabel(body.action ?? null));

  return NextResponse.json({
    message: `已保存 ${pack.platformName} 发布包版本。`,
    snapshot,
  }, { status: 201 });
}
