import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getPlatformProfile, type PlatformId } from "@/lib/platforms/platformProfiles";
import { buildStoryStructureDiagnostic } from "@/lib/projects/storyStructureDiagnostic";

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
      characters: { orderBy: { createdAt: "asc" } },
      foreshadows: { orderBy: { createdAt: "asc" } },
      outlineNodes: { orderBy: [{ depth: "asc" }, { order: "asc" }, { createdAt: "asc" }] },
      plotThreads: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const platform = getPlatformProfile(project.targetPlatform as PlatformId);
  const diagnostic = buildStoryStructureDiagnostic({
    project: {
      id: project.id,
      title: project.title,
      genre: project.genre,
      sellingPoint: project.sellingPoint,
      targetLengthType: project.targetLengthType,
      targetWordCount: project.targetWordCount,
      currentWordCount: project.currentWordCount,
    },
    platform,
    chapters: project.chapters,
    outlineNodes: project.outlineNodes,
    characters: project.characters,
    foreshadows: project.foreshadows,
    plotThreads: project.plotThreads,
  });

  if (searchParams.get("format") === "markdown") {
    return new NextResponse(diagnostic.markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(`${project.title}-整书结构健康度诊断.md`)}"`,
      },
    });
  }

  return NextResponse.json({ diagnostic });
}
