import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getPlatformProfile, platformProfiles, type PlatformId } from "@/lib/platforms/platformProfiles";
import {
  buildPlatformPublishExportCenter,
  buildPlatformPublishArchive,
  buildPublishPackageVersionComparison,
  parsePublishSnapshotTags,
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
  return "snapshot";
}

async function buildCenter(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      chapters: { orderBy: { order: "asc" } },
      aiTasks: { orderBy: { createdAt: "desc" } },
      publishSnapshots: { orderBy: { createdAt: "desc" }, take: 80 },
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

    return NextResponse.json({
      version,
      comparison: buildPublishPackageVersionComparison(version, currentPack),
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
  const body = (await request.json().catch(() => ({}))) as { platformId?: string; action?: string };
  const context = await buildCenter(projectId);

  if (!context) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
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
