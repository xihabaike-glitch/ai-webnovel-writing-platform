import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { buildStoryLineDashboard } from "@/lib/projects/storyLines";
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
  return NextResponse.json(await getStoryLinePayload(projectId));
}

export async function POST(request: Request, { params }: Params) {
  const { projectId } = await params;
  const body = (await request.json()) as { kind?: string };

  if (body.kind === "plot_thread") {
    const input = plotThreadPayloadSchema.parse(body);
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
