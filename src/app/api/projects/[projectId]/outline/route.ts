import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { buildDefaultOutlineNodes } from "@/lib/outlines/defaultOutline";
import { getPlatformProfile, type PlatformId } from "@/lib/platforms/platformProfiles";

interface Params {
  params: Promise<{ projectId: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  const { projectId } = await params;
  const nodes = await prisma.outlineNode.findMany({
    where: { projectId },
    orderBy: [{ depth: "asc" }, { order: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ nodes });
}

export async function POST(request: Request, { params }: Params) {
  const { projectId } = await params;
  const body = (await request.json().catch(() => ({}))) as { replace?: boolean };
  const project = await prisma.project.findUnique({ where: { id: projectId } });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const existingCount = await prisma.outlineNode.count({ where: { projectId } });
  if (existingCount > 0 && !body.replace) {
    const nodes = await prisma.outlineNode.findMany({
      where: { projectId },
      orderBy: [{ depth: "asc" }, { order: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ nodes, skipped: true });
  }

  const platform = getPlatformProfile(project.targetPlatform as PlatformId);
  const nodes = buildDefaultOutlineNodes({
    projectId: project.id,
    title: project.title,
    genre: project.genre,
    sellingPoint: project.sellingPoint,
    platform,
  });

  await prisma.$transaction(async (tx) => {
    await tx.outlineNode.deleteMany({ where: { projectId } });
    for (const node of nodes) {
      await tx.outlineNode.create({
        data: {
          ...node,
          projectId,
        },
      });
    }
  });

  const createdNodes = await prisma.outlineNode.findMany({
    where: { projectId },
    orderBy: [{ depth: "asc" }, { order: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ nodes: createdNodes }, { status: 201 });
}
