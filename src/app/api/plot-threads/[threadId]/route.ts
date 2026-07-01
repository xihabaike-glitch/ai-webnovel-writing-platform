import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { buildStoryLineDashboard } from "@/lib/projects/storyLines";
import { plotThreadPayloadSchema } from "@/lib/validators/storyLine";

interface Params {
  params: Promise<{ threadId: string }>;
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
  const { threadId } = await params;
  const body = await request.json();
  const input = plotThreadPayloadSchema.parse(body);
  const existing = await prisma.plotThread.findUnique({ where: { id: threadId } });

  if (!existing) {
    return NextResponse.json({ error: "Plot thread not found" }, { status: 404 });
  }

  const plotThread = await prisma.plotThread.update({
    where: { id: threadId },
    data: input,
  });

  return NextResponse.json({
    plotThread,
    dashboard: await dashboardForProject(plotThread.projectId),
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { threadId } = await params;
  const existing = await prisma.plotThread.findUnique({ where: { id: threadId } });

  if (!existing) {
    return NextResponse.json({ error: "Plot thread not found" }, { status: 404 });
  }

  await prisma.plotThread.delete({ where: { id: threadId } });

  return NextResponse.json({
    deleted: true,
    dashboard: await dashboardForProject(existing.projectId),
  });
}
