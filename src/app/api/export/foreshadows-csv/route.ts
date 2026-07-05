import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { exportForeshadowCsv, foreshadowCsvContentType } from "@/lib/export/archive";
import { getPlatformProfile, type PlatformId } from "@/lib/platforms/platformProfiles";

export async function POST(request: Request) {
  const body = (await request.json()) as { projectId: string };
  const project = await prisma.project.findUnique({
    where: { id: body.projectId },
    include: {
      chapters: { orderBy: { order: "asc" } },
      foreshadows: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const platform = getPlatformProfile(project.targetPlatform as PlatformId);
  const csv = exportForeshadowCsv({
    title: project.title,
    genre: project.genre,
    targetPlatformName: platform.name,
    targetLengthType: project.targetLengthType,
    targetWordCount: project.targetWordCount,
    currentWordCount: project.currentWordCount,
    sellingPoint: project.sellingPoint,
    updateCadence: project.updateCadence,
    chapters: project.chapters.map((chapter) => ({
      id: chapter.id,
      order: chapter.order,
      title: chapter.title,
      content: chapter.content,
      wordCount: chapter.wordCount,
      goal: chapter.goal,
      hook: chapter.hook,
      conflict: chapter.conflict,
      valueShift: chapter.valueShift,
      cliffhanger: chapter.cliffhanger,
      status: chapter.status,
    })),
    foreshadows: project.foreshadows.map((entry) => ({
      title: entry.title,
      status: entry.status,
      notes: entry.notes,
      setupChapterId: entry.setupChapterId,
      payoffChapterId: entry.payoffChapterId,
    })),
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": foreshadowCsvContentType(),
      "Content-Disposition": `attachment; filename="${encodeURIComponent(`${project.title}-伏笔表`)}.csv"`,
    },
  });
}
