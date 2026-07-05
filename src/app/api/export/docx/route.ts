import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { docxContentType, exportDocxFileSuffix, exportProjectDocxByMode } from "@/lib/export/docx";
import { buildExportPackageReadiness, type ExportMarkdownMode } from "@/lib/export/markdown";
import { buildExportPackageSnapshot } from "@/lib/export/snapshots";
import { getPlatformProfile, type PlatformId } from "@/lib/platforms/platformProfiles";

export async function POST(request: Request) {
  const body = (await request.json()) as { projectId: string; mode?: ExportMarkdownMode };
  const project = await prisma.project.findUnique({
    where: { id: body.projectId },
    include: {
      chapters: { orderBy: { order: "asc" } },
      outlineNodes: { orderBy: [{ depth: "asc" }, { order: "asc" }, { createdAt: "asc" }] },
      characters: { orderBy: { createdAt: "asc" } },
      worldEntries: { orderBy: [{ type: "asc" }, { createdAt: "asc" }] },
      foreshadows: { orderBy: { createdAt: "asc" } },
      plotThreads: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const platform = getPlatformProfile(project.targetPlatform as PlatformId);
  const mode: ExportMarkdownMode = body.mode === "outline" || body.mode === "characters" ? body.mode : "full";
  const exportProject = {
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
    outlineNodes: project.outlineNodes.map((node) => ({
      type: node.type,
      title: node.title,
      summary: node.summary,
      goal: node.goal,
      hook: node.hook,
      conflict: node.conflict,
      valueShift: node.valueShift,
      platformNote: node.platformNote,
      depth: node.depth,
      order: node.order,
      status: node.status,
    })),
    characters: project.characters.map((character) => ({
      name: character.name,
      role: character.role,
      desire: character.desire,
      need: character.need,
      flaw: character.flaw,
      arcStart: character.arcStart,
      arcEnd: character.arcEnd,
      voice: character.voice,
      relationshipNotes: character.relationshipNotes,
    })),
    worldEntries: project.worldEntries.map((entry) => ({
      type: entry.type,
      title: entry.title,
      content: entry.content,
    })),
    foreshadows: project.foreshadows.map((entry) => ({
      title: entry.title,
      status: entry.status,
      notes: entry.notes,
      setupChapterId: entry.setupChapterId,
      payoffChapterId: entry.payoffChapterId,
    })),
    plotThreads: project.plotThreads.map((entry) => ({
      type: entry.type,
      title: entry.title,
      status: entry.status,
    })),
  };
  const docx = exportProjectDocxByMode(exportProject, mode);
  const fileName = `${project.title}-${exportDocxFileSuffix(mode)}.docx`;

  await prisma.exportPackageSnapshot.create({
    data: buildExportPackageSnapshot({
      projectId: project.id,
      project: exportProject,
      packageKind: mode,
      format: "docx",
      fileName,
      contentType: docxContentType(),
      content: docx,
      readiness: buildExportPackageReadiness(exportProject),
    }),
  });

  return new NextResponse(docx, {
    headers: {
      "Content-Type": docxContentType(),
      "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
    },
  });
}
