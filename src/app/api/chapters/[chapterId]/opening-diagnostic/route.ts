import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getPlatformProfile, type PlatformId } from "@/lib/platforms/platformProfiles";
import { buildOpeningDiagnostic } from "@/lib/chapters/openingDiagnostic";
import { findProjectStartTacticSummary } from "@/lib/projects/projectStartTactics";

interface Params {
  params: Promise<{ chapterId: string }>;
}

export async function GET(request: Request, { params }: Params) {
  const { chapterId } = await params;
  const { searchParams } = new URL(request.url);
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: {
      project: {
        include: {
          worldEntries: true,
        },
      },
    },
  });

  if (!chapter) {
    return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  }

  const platform = getPlatformProfile(chapter.project.targetPlatform as PlatformId);
  const startTactic = findProjectStartTacticSummary(chapter.project.worldEntries);
  const diagnostic = buildOpeningDiagnostic({
    projectTitle: chapter.project.title,
    platform,
    startTactic,
    chapter: {
      title: chapter.title,
      content: chapter.content,
      goal: chapter.goal,
      hook: chapter.hook,
      conflict: chapter.conflict,
      cliffhanger: chapter.cliffhanger,
    },
  });

  if (searchParams.get("format") === "markdown") {
    return new NextResponse(diagnostic.markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(`${chapter.title}-黄金三秒诊断.md`)}"`,
      },
    });
  }

  return NextResponse.json({ diagnostic });
}
