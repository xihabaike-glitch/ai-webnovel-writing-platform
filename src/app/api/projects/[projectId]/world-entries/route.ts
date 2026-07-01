import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { buildWorldBibleDashboard } from "@/lib/projects/worldBible";
import { worldEntryPayloadSchema } from "@/lib/validators/worldEntry";

interface Params {
  params: Promise<{ projectId: string }>;
}

async function getWorldPayload(projectId: string) {
  const worldEntries = await prisma.worldEntry.findMany({
    where: { projectId },
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
  });

  return {
    worldEntries,
    dashboard: buildWorldBibleDashboard(worldEntries),
  };
}

export async function GET(_request: Request, { params }: Params) {
  const { projectId } = await params;
  return NextResponse.json(await getWorldPayload(projectId));
}

export async function POST(request: Request, { params }: Params) {
  const { projectId } = await params;
  const body = await request.json();
  const input = worldEntryPayloadSchema.parse(body);
  const worldEntry = await prisma.worldEntry.create({
    data: {
      projectId,
      ...input,
    },
  });

  return NextResponse.json({
    worldEntry,
    ...(await getWorldPayload(projectId)),
  }, { status: 201 });
}
