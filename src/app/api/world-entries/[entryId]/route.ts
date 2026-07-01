import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { buildWorldBibleDashboard } from "@/lib/projects/worldBible";
import { worldEntryPayloadSchema } from "@/lib/validators/worldEntry";

interface Params {
  params: Promise<{ entryId: string }>;
}

async function dashboardForProject(projectId: string) {
  const entries = await prisma.worldEntry.findMany({
    where: { projectId },
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
  });
  return buildWorldBibleDashboard(entries);
}

export async function PATCH(request: Request, { params }: Params) {
  const { entryId } = await params;
  const body = await request.json();
  const input = worldEntryPayloadSchema.parse(body);
  const existing = await prisma.worldEntry.findUnique({ where: { id: entryId } });

  if (!existing) {
    return NextResponse.json({ error: "World entry not found" }, { status: 404 });
  }

  const worldEntry = await prisma.worldEntry.update({
    where: { id: entryId },
    data: input,
  });

  return NextResponse.json({
    worldEntry,
    dashboard: await dashboardForProject(worldEntry.projectId),
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { entryId } = await params;
  const existing = await prisma.worldEntry.findUnique({ where: { id: entryId } });

  if (!existing) {
    return NextResponse.json({ error: "World entry not found" }, { status: 404 });
  }

  await prisma.worldEntry.delete({ where: { id: entryId } });

  return NextResponse.json({
    deleted: true,
    dashboard: await dashboardForProject(existing.projectId),
  });
}
