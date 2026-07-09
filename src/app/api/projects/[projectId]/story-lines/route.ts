import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { buildStoryLineDashboard } from "@/lib/projects/storyLines";
import { InvalidStoryLineReferencesError, validateStoryLineReferences } from "@/lib/projects/storyLineReferences";
import { foreshadowPayloadSchema, plotThreadPayloadSchema } from "@/lib/validators/storyLine";

interface Params {
  params: Promise<{ projectId: string }>;
}

async function getStoryLinePayload(projectId: string) {
  const [chapters, characters, foreshadows, plotThreads] = await Promise.all([
    prisma.chapter.findMany({ where: { projectId }, orderBy: { order: "asc" } }),
    prisma.character.findMany({ where: { projectId }, orderBy: { createdAt: "asc" } }),
    prisma.foreshadow.findMany({ where: { projectId }, orderBy: { createdAt: "asc" } }),
    prisma.plotThread.findMany({ where: { projectId }, orderBy: { createdAt: "asc" } }),
  ]);

  return {
    chapters,
    characters,
    foreshadows,
    plotThreads,
    dashboard: buildStoryLineDashboard(chapters, foreshadows, plotThreads),
  };
}

export async function GET(_request: Request, { params }: Params) {
  const { projectId } = await params;
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  return NextResponse.json(await getStoryLinePayload(projectId));
}

export async function POST(request: Request, { params }: Params) {
  const { projectId } = await params;
  const body = (await request.json()) as { kind?: string };
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (body.kind === "plot_thread") {
    const input = plotThreadPayloadSchema.parse(body);
    const chapterIds = [input.startChapterId, input.endChapterId].filter((id): id is string => Boolean(id));
    const chapters = chapterIds.length
      ? await prisma.chapter.findMany({ where: { projectId, id: { in: chapterIds } }, select: { id: true } })
      : [];
    try {
      validateStoryLineReferences({
        chapterIds,
        characterIds: [],
        existingChapterIds: chapters.map((chapter) => chapter.id),
        existingCharacterIds: [],
      });
    } catch (error) {
      if (error instanceof InvalidStoryLineReferencesError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }
    const plotThread = await prisma.plotThread.create({
      data: {
        projectId,
        type: input.type,
        title: input.title,
        startChapterId: input.startChapterId,
        endChapterId: input.endChapterId,
        status: input.status,
      },
    });
    return NextResponse.json({ plotThread, ...(await getStoryLinePayload(projectId)) }, { status: 201 });
  }

  const input = foreshadowPayloadSchema.parse(body);
  const chapterIds = [input.setupChapterId, input.payoffChapterId].filter((id): id is string => Boolean(id));
  const [chapters, characters] = await Promise.all([
    chapterIds.length
      ? prisma.chapter.findMany({ where: { projectId, id: { in: chapterIds } }, select: { id: true } })
      : Promise.resolve([]),
    input.relatedCharacterIds.length
      ? prisma.character.findMany({ where: { projectId, id: { in: input.relatedCharacterIds } }, select: { id: true } })
      : Promise.resolve([]),
  ]);
  try {
    validateStoryLineReferences({
      chapterIds,
      characterIds: input.relatedCharacterIds,
      existingChapterIds: chapters.map((chapter) => chapter.id),
      existingCharacterIds: characters.map((character) => character.id),
    });
  } catch (error) {
    if (error instanceof InvalidStoryLineReferencesError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
  const foreshadow = await prisma.foreshadow.create({
    data: {
      projectId,
      title: input.title,
      setupChapterId: input.setupChapterId,
      payoffChapterId: input.payoffChapterId,
      relatedCharacterIds: JSON.stringify(input.relatedCharacterIds),
      status: input.status,
      notes: input.notes,
    },
  });

  return NextResponse.json({ foreshadow, ...(await getStoryLinePayload(projectId)) }, { status: 201 });
}
