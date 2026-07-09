import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  buildChapterCardFromOutline,
  claimOutlineNodeForChapter,
  OutlineNodeAlreadyClaimedError,
} from "@/lib/chapters/chapterFromOutline";
import { getPlatformProfile, type PlatformId } from "@/lib/platforms/platformProfiles";
import { createChapterFromOutlineSchema } from "@/lib/validators/outline";
import { ChapterOrderConflictError, createWithNextChapterOrder } from "@/lib/chapters/chapterOrder";

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

  const platform = getPlatformProfile(project.targetPlatform as PlatformId);
  let chapter;
  try {
    chapter = await createWithNextChapterOrder(projectId, async (tx, order) => {
      const card = buildChapterCardFromOutline({
        projectTitle: project.title,
        platform,
        outlineNode,
        nextOrder: order,
      });
      const created = await tx.chapter.create({
      data: {
        projectId,
        order,
        title: card.title,
        goal: card.goal,
        hook: card.hook,
        conflict: card.conflict,
        valueShift: card.valueShift,
        cliffhanger: card.cliffhanger,
        status: card.status,
      },
      });

      await claimOutlineNodeForChapter(tx, {
        outlineNodeId: outlineNode.id,
        projectId,
        chapterId: created.id,
      });

      return created;
    });
  } catch (error) {
    if (error instanceof ChapterOrderConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof OutlineNodeAlreadyClaimedError) {
      const claimedNode = await prisma.outlineNode.findFirst({
        where: { id: input.outlineNodeId, projectId },
        include: { chapter: true },
      });
      if (claimedNode?.chapter) {
        return NextResponse.json({ chapter: claimedNode.chapter, skipped: true });
      }
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }

  return NextResponse.json({ chapter }, { status: 201 });
}
