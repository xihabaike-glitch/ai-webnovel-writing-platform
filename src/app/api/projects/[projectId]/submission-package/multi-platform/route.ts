import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { buildMultiPlatformSubmission } from "@/lib/projects/multiPlatformSubmission";

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
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const multiPlatformSubmission = buildMultiPlatformSubmission({
    title: project.title,
    genre: project.genre,
    sellingPoint: project.sellingPoint,
    currentWordCount: project.currentWordCount,
    targetWordCount: project.targetWordCount,
    targetPlatformId: project.targetPlatform,
    chapters: project.chapters,
    aiTasks: project.aiTasks.map((task) => ({
      taskType: task.taskType,
      status: task.status,
      chapter: task.chapterId ? { id: task.chapterId } : null,
    })),
  });

  if (searchParams.get("format") === "markdown") {
    return new NextResponse(multiPlatformSubmission.markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(`${project.title}-多平台投稿版本.md`)}"`,
      },
    });
  }

  return NextResponse.json({ multiPlatformSubmission });
}
