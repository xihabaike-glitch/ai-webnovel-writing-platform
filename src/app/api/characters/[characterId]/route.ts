import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { buildCharacterArcDashboard } from "@/lib/projects/characterArc";
import { characterPayloadSchema } from "@/lib/validators/character";

interface Params {
  params: Promise<{ characterId: string }>;
}

async function dashboardForProject(projectId: string) {
  const characters = await prisma.character.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  });
  return buildCharacterArcDashboard(characters);
}

export async function PATCH(request: Request, { params }: Params) {
  const { characterId } = await params;
  const body = await request.json();
  const input = characterPayloadSchema.parse(body);
  const existing = await prisma.character.findUnique({
    where: { id: characterId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Character not found" }, { status: 404 });
  }

  const character = await prisma.character.update({
    where: { id: characterId },
    data: input,
  });

  return NextResponse.json({
    character,
    dashboard: await dashboardForProject(character.projectId),
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { characterId } = await params;
  const existing = await prisma.character.findUnique({
    where: { id: characterId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Character not found" }, { status: 404 });
  }

  await prisma.character.delete({
    where: { id: characterId },
  });

  return NextResponse.json({
    deleted: true,
    dashboard: await dashboardForProject(existing.projectId),
  });
}
