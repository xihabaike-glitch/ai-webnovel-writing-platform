import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { buildChapterCardFromOutline } from "@/lib/chapters/chapterFromOutline";
import { getPlatformProfile, type PlatformId } from "@/lib/platforms/platformProfiles";
import { createChapterFromOutlineSchema } from "@/lib/validators/outline";

interface Params {
  params: Promise<{ projectId: string }>;
}

export async function POST(request: Request, { params }: Params) {
  const { projectId } = await params;
  const body = await request.json();
  const input = createChapterFromOutlineSchema.parse(body);
  const project = await prisma.project.findUnique({ where: { id: projectId } });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const outlineNode = await prisma.outlineNode.findFirst({
    where: {
      id: input.outlineNodeId,
      projectId,
    },
  });

  if (!outlineNode) {
    return NextResponse.json({ error: "Outline node not found" }, { status: 404 });
  }

  if (outlineNode.chapterId) {
    const chapter = await prisma.chapter.findUnique({ where: { id: outlineNode.chapterId } });
    if (chapter) {
      return NextResponse.json({ chapter, skipped: true });
    }
  }

  const count = await prisma.chapter.count({ where: { projectId } });
  const platform = getPlatformProfile(project.targetPlatform as PlatformId);
  const card = buildChapterCardFromOutline({
    projectTitle: project.title,
    platform,
    outlineNode,
    nextOrder: count + 1,
  });

  const chapter = await prisma.$transaction(async (tx) => {
    const created = await tx.chapter.create({
      data: {
        projectId,
        order: count + 1,
        title: card.title,
        goal: card.goal,
        hook: card.hook,
        conflict: card.conflict,
        valueShift: card.valueShift,
        cliffhanger: card.cliffhanger,
        status: card.status,
      },
    });

    await tx.outlineNode.update({
      where: { id: outlineNode.id },
      data: {
        chapterId: created.id,
        status: "chapter_card",
      },
    });

    return created;
  });

  return NextResponse.json({ chapter }, { status: 201 });
}
