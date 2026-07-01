import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { buildCharacterArcDashboard } from "@/lib/projects/characterArc";
import { characterPayloadSchema } from "@/lib/validators/character";

interface Params {
  params: Promise<{ projectId: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  const { projectId } = await params;
  const characters = await prisma.character.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    characters,
    dashboard: buildCharacterArcDashboard(characters),
  });
}

export async function POST(request: Request, { params }: Params) {
  const { projectId } = await params;
  const body = await request.json();
  const input = characterPayloadSchema.parse(body);
  const character = await prisma.character.create({
    data: {
      projectId,
      ...input,
    },
  });
  const characters = await prisma.character.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    character,
    dashboard: buildCharacterArcDashboard(characters),
  }, { status: 201 });
}
