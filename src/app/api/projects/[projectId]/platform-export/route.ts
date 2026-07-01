import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getPlatformProfile, platformProfiles, type PlatformId } from "@/lib/platforms/platformProfiles";
import {
  buildPlatformPublishExportCenter,
  buildPlatformPublishArchive,
  buildPublishPackageRestorePatch,
  buildPublishPackageVersionComparison,
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

async function buildCenter(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      chapters: { orderBy: { order: "asc" } },
      aiTasks: { orderBy: { createdAt: "desc" } },
      publishSnapshots: { orderBy: { createdAt: "desc" }, take: 80 },
      submissionAssets: { orderBy: { updatedAt: "desc" } },
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
  };
  const context = await buildCenter(projectId);

  if (!context) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (body.action === "save-asset") {
    const platform = selectedPlatform(body.platformId ?? null);
    if (!platform) {
      return NextResponse.json({ error: "请选择有效发布平台。" }, { status: 400 });
    }

    const asset = await prisma.platformSubmissionAsset.upsert({
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
        title: trimText(body.title, context.project.title),
        logline: trimText(body.logline),
        synopsis: trimText(body.synopsis),
        overseasSynopsis: trimText(body.overseasSynopsis),
        tags: JSON.stringify(normalizeTagsInput(body.tags)),
        note: trimText(body.note),
        source: "manual",
      },
      update: {
        platformName: platform.name,
        title: trimText(body.title, context.project.title),
        logline: trimText(body.logline),
        synopsis: trimText(body.synopsis),
        overseasSynopsis: trimText(body.overseasSynopsis),
        tags: JSON.stringify(normalizeTagsInput(body.tags)),
        note: trimText(body.note),
        source: "manual",
      },
    });

    return NextResponse.json({
      message: `已保存 ${platform.name} 投稿资产。`,
      asset: {
        ...asset,
        tags: parsePublishSnapshotTags(asset.tags),
      },
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
    const [, , snapshot] = await prisma.$transaction([
      prisma.project.update({
        where: { id: projectId },
        data: {
          title: patch.title,
          sellingPoint: patch.sellingPoint,
        },
      }),
      prisma.platformSubmissionAsset.upsert({
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
      }),
      prisma.publishPackageSnapshot.create({
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
      }),
    ]);

    return NextResponse.json({
      message: `已恢复 ${version.platformName} 历史版本的标题和核心卖点。`,
      patch,
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
