import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { countWords } from "@/lib/text/wordCount";
import { updateChapterSchema } from "@/lib/validators/chapter";

interface Params {
  params: Promise<{ chapterId: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  const { chapterId } = await params;
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
  });

  if (!chapter) {
    return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  }

  return NextResponse.json({ chapter });
}

export async function PATCH(request: Request, { params }: Params) {
  const { chapterId } = await params;
  const body = await request.json();
  const input = updateChapterSchema.parse(body);
  const wordCount = typeof input.content === "string" ? countWords(input.content) : undefined;
  const chapter = await prisma.$transaction(async (tx) => {
    const existing = await tx.chapter.findUnique({ where: { id: chapterId }, select: { projectId: true } });
    if (!existing) return null;
    const updated = await tx.chapter.update({
      where: { id: chapterId },
      data: {
        ...input,
        ...(wordCount === undefined ? {} : { wordCount }),
      },
    });

    if (wordCount !== undefined) {
      const chapters = await tx.chapter.findMany({
        where: { projectId: existing.projectId },
        select: { wordCount: true },
      });
      await tx.project.update({
        where: { id: existing.projectId },
        data: { currentWordCount: chapters.reduce((sum, item) => sum + item.wordCount, 0) },
      });
    }
    return updated;
  });

  if (!chapter) {
    return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  }

  return NextResponse.json({ chapter });
}
