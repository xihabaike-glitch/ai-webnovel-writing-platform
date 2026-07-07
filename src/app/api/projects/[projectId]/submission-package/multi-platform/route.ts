import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { buildMultiPlatformSubmission, buildSinglePlatformSubmissionMarkdown } from "@/lib/projects/multiPlatformSubmission";

interface Params {
  params: Promise<{ projectId: string }>;
}

export async function GET(request: Request, { params }: Params) {
  const { projectId } = await params;
  const { searchParams } = new URL(request.url);
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      chapters: { orderBy: { order: "asc" } },
      aiTasks: {
        orderBy: { createdAt: "desc" },
        take: 100,
      },
      platformPublishMetrics: {
        orderBy: { snapshotDate: "desc" },
        take: 100,
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const multiPlatformSubmission = buildMultiPlatformSubmission({
    projectId,
    title: project.title,
    genre: project.genre,
    sellingPoint: project.sellingPoint,
    currentWordCount: project.currentWordCount,
    targetLengthType: project.targetLengthType,
    targetWordCount: project.targetWordCount,
    targetPlatformId: project.targetPlatform,
    chapters: project.chapters,
    aiTasks: project.aiTasks.map((task) => ({
      taskType: task.taskType,
      status: task.status,
      chapter: task.chapterId ? { id: task.chapterId } : null,
    })),
    platformPublishMetrics: project.platformPublishMetrics,
  });

  const format = searchParams.get("format");
  const platformId = searchParams.get("platformId");

  if (format === "archive") {
    return new NextResponse(multiPlatformSubmission.archive.markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(multiPlatformSubmission.archive.archiveFileName)}"`,
      },
    });
  }

  if (format === "package") {
    const variant = multiPlatformSubmission.variants.find((item) => item.platformId === platformId);
    if (!variant) {
      return NextResponse.json({ error: "Platform package not found" }, { status: 404 });
    }

    return new NextResponse(buildSinglePlatformSubmissionMarkdown(variant), {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(variant.packageMatrix.packageFileName)}"`,
      },
    });
  }

  if (format === "markdown") {
    return new NextResponse(multiPlatformSubmission.markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(`${project.title}-多平台投稿版本.md`)}"`,
      },
    });
  }

  return NextResponse.json({ multiPlatformSubmission });
}
