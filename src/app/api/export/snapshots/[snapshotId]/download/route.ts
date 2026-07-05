import { NextResponse } from "next/server";
import { chapterZipContentType, exportChapterZip, exportForeshadowCsv, foreshadowCsvContentType } from "@/lib/export/archive";
import { docxContentType, exportDocxFileSuffix, exportProjectDocxByMode } from "@/lib/export/docx";
import { buildExportPackageReadiness, exportMarkdownFileSuffix, exportProjectMarkdownByMode, type ExportMarkdownMode, type ExportProject } from "@/lib/export/markdown";
import { buildExportPackageSnapshot, parseExportSnapshotTarget, regeneratedSnapshotMessage } from "@/lib/export/snapshots";
import { prisma } from "@/lib/db/prisma";
import { getPlatformProfile, type PlatformId } from "@/lib/platforms/platformProfiles";

interface Params {
  params: Promise<{ snapshotId: string }>;
}

interface SnapshotProjectRecord {
  title: string;
  genre: string;
  targetLengthType: string;
  targetWordCount: number;
  currentWordCount: number;
  sellingPoint: string;
  updateCadence: string;
  chapters: Array<{
    id: string;
    order: number;
    title: string;
    content: string;
    wordCount: number;
    goal: string;
    hook: string;
    conflict: string;
    valueShift: string;
    cliffhanger: string;
    status: string;
  }>;
  outlineNodes: Array<{
    type: string;
    title: string;
    summary: string;
    goal: string;
    hook: string;
    conflict: string;
    valueShift: string;
    platformNote: string;
    depth: number;
    order: number;
    status: string;
  }>;
  characters: Array<{
    name: string;
    role: string;
    desire: string;
    need: string;
    flaw: string;
    arcStart: string;
    arcEnd: string;
    voice: string;
    relationshipNotes: string;
  }>;
  worldEntries: Array<{
    type: string;
    title: string;
    content: string;
  }>;
  foreshadows: Array<{
    title: string;
    status: string;
    notes: string;
    setupChapterId: string | null;
    payoffChapterId: string | null;
  }>;
  plotThreads: Array<{
    type: string;
    title: string;
    status: string;
  }>;
}

function exportProjectFromRecord(project: SnapshotProjectRecord, platformName: string): ExportProject {
  return {
    title: project.title,
    genre: project.genre,
    targetPlatformName: platformName,
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
}

export async function GET(_request: Request, { params }: Params) {
  const { snapshotId } = await params;
  const snapshot = await prisma.exportPackageSnapshot.findUnique({
    where: { id: snapshotId },
    include: {
      project: {
        include: {
          chapters: { orderBy: { order: "asc" } },
          outlineNodes: { orderBy: [{ depth: "asc" }, { order: "asc" }, { createdAt: "asc" }] },
          characters: { orderBy: { createdAt: "asc" } },
          worldEntries: { orderBy: [{ type: "asc" }, { createdAt: "asc" }] },
          foreshadows: { orderBy: { createdAt: "asc" } },
          plotThreads: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });

  if (!snapshot) {
    return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
  }

  const target = parseExportSnapshotTarget(snapshot.packageKind, snapshot.format);
  if (!target) {
    return NextResponse.json({ error: "Snapshot cannot be regenerated" }, { status: 400 });
  }

  const platform = getPlatformProfile(snapshot.project.targetPlatform as PlatformId);
  const exportProject = exportProjectFromRecord(snapshot.project, platform.name);
  const readiness = buildExportPackageReadiness(exportProject);
  let content: string | Buffer;
  let fileName: string;
  let contentType: string;

  if (target.format === "markdown") {
    content = exportProjectMarkdownByMode(exportProject, target.packageKind as ExportMarkdownMode);
    fileName = `${snapshot.project.title}-${exportMarkdownFileSuffix(target.packageKind as ExportMarkdownMode)}.md`;
    contentType = "text/markdown; charset=utf-8";
  } else if (target.format === "docx") {
    content = exportProjectDocxByMode(exportProject, target.packageKind as ExportMarkdownMode);
    fileName = `${snapshot.project.title}-${exportDocxFileSuffix(target.packageKind as ExportMarkdownMode)}.docx`;
    contentType = docxContentType();
  } else if (target.format === "zip") {
    content = exportChapterZip(exportProject);
    fileName = `${snapshot.project.title}-章节包.zip`;
    contentType = chapterZipContentType();
  } else {
    content = exportForeshadowCsv(exportProject);
    fileName = `${snapshot.project.title}-伏笔表.csv`;
    contentType = foreshadowCsvContentType();
  }

  await prisma.exportPackageSnapshot.create({
    data: {
      ...buildExportPackageSnapshot({
        projectId: snapshot.projectId,
        project: exportProject,
        packageKind: target.packageKind,
        format: target.format,
        fileName,
        contentType,
        content,
        readiness,
      }),
      notes: regeneratedSnapshotMessage(target),
    },
  });

  const responseBody = typeof content === "string" ? content : new Uint8Array(content);

  return new NextResponse(responseBody, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
    },
  });
}
