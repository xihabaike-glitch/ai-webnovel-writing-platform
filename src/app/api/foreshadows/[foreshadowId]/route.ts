import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { buildStoryLineDashboard } from "@/lib/projects/storyLines";
import { foreshadowPayloadSchema } from "@/lib/validators/storyLine";

interface Params {
  params: Promise<{ foreshadowId: string }>;
}

async function dashboardForProject(projectId: string) {
  const [chapters, foreshadows, plotThreads] = await Promise.all([
    prisma.chapter.findMany({ where: { projectId }, orderBy: { order: "asc" } }),
    prisma.foreshadow.findMany({ where: { projectId }, orderBy: { createdAt: "asc" } }),
    prisma.plotThread.findMany({ where: { projectId }, orderBy: { createdAt: "asc" } }),
  ]);
  return buildStoryLineDashboard(chapters, foreshadows, plotThreads);
}

export async function PATCH(request: Request, { params }: Params) {
  const { foreshadowId } = await params;
  const body = await request.json() as Record<string, unknown>;
  const input = foreshadowPayloadSchema.parse(body);
  const existing = await prisma.foreshadow.findUnique({ where: { id: foreshadowId } });

  if (!existing) {
    return NextResponse.json({ error: "Foreshadow not found" }, { status: 404 });
  }

  const foreshadow = await prisma.foreshadow.update({
    where: { id: foreshadowId },
    data: {
      title: input.title,
      setupChapterId: input.setupChapterId,
      payoffChapterId: input.payoffChapterId,
      relatedCharacterIds: Array.isArray(body.relatedCharacterIds)
        ? JSON.stringify(input.relatedCharacterIds)
        : existing.relatedCharacterIds,
      status: input.status,
      notes: input.notes,
    },
  });

  return NextResponse.json({
    foreshadow,
    dashboard: await dashboardForProject(foreshadow.projectId),
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { foreshadowId } = await params;
  const existing = await prisma.foreshadow.findUnique({ where: { id: foreshadowId } });

  if (!existing) {
    return NextResponse.json({ error: "Foreshadow not found" }, { status: 404 });
  }

  await prisma.foreshadow.delete({ where: { id: foreshadowId } });

  return NextResponse.json({
    deleted: true,
    dashboard: await dashboardForProject(existing.projectId),
  });
}
