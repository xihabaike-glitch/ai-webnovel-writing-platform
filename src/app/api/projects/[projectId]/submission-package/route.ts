import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getPlatformProfile, type PlatformId } from "@/lib/platforms/platformProfiles";
import { buildSubmissionChecklist } from "@/lib/projects/submissionChecklist";
import { buildSubmissionPackage } from "@/lib/projects/submissionPackage";

interface Params {
  params: Promise<{ projectId: string }>;
}

export async function GET(request: Request, { params }: Params) {
  const { projectId } = await params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      chapters: { orderBy: { order: "asc" } },
      aiTasks: { orderBy: { createdAt: "desc" } },
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
      taskType: task.taskType,
      status: task.status,
      chapter: task.chapterId ? { id: task.chapterId } : null,
    })),
  });
  const submissionPackage = buildSubmissionPackage({
    title: project.title,
    genre: project.genre,
    sellingPoint: project.sellingPoint,
    currentWordCount: project.currentWordCount,
    targetWordCount: project.targetWordCount,
    platform,
    chapters: project.chapters,
  });

  if (format === "markdown") {
    if (submissionChecklist.readinessPercent < 80) {
      return NextResponse.json({
        error: "投稿资料准备度未达 80%",
        submissionChecklist,
      }, { status: 409 });
    }

    return new NextResponse(submissionPackage.markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
      },
    });
  }

  return NextResponse.json({ submissionPackage, submissionChecklist });
}
