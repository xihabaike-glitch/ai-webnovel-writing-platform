import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getPlatformProfile, type PlatformId } from "@/lib/platforms/platformProfiles";
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
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const platform = getPlatformProfile(project.targetPlatform as PlatformId);
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
    return new NextResponse(submissionPackage.markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
      },
    });
  }

  return NextResponse.json({ submissionPackage });
}
