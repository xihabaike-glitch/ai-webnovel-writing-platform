import { NextResponse } from "next/server";
import { countWords } from "@/lib/text/wordCount";
import { prisma } from "@/lib/db/prisma";

interface Params {
  params: Promise<{ chapterId: string; revisionId: string }>;
}

export async function POST(_request: Request, { params }: Params) {
  const { chapterId, revisionId } = await params;
  const [chapter, revision] = await Promise.all([
    prisma.chapter.findUnique({ where: { id: chapterId } }),
    prisma.chapterRevision.findFirst({
      where: {
        id: revisionId,
        chapterId,
      },
    }),
  ]);

  if (!chapter) {
    return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  }

  if (!revision) {
    return NextResponse.json({ error: "Revision not found" }, { status: 404 });
  }

  const restoredWordCount = countWords(revision.content);
  const updatedChapter = await prisma.$transaction(async (tx) => {
    await tx.chapterRevision.create({
      data: {
        chapterId: chapter.id,
        source: "restore_before_overwrite",
        title: chapter.title,
        content: chapter.content,
        wordCount: chapter.wordCount,
        goal: chapter.goal,
        hook: chapter.hook,
        conflict: chapter.conflict,
        valueShift: chapter.valueShift,
        cliffhanger: chapter.cliffhanger,
        status: chapter.status,
        notes: `回滚到版本 ${revision.id} 前自动保存。`,
      },
    });

    const savedChapter = await tx.chapter.update({
      where: { id: chapterId },
      data: {
        title: revision.title,
        content: revision.content,
        wordCount: restoredWordCount,
        goal: revision.goal,
        hook: revision.hook,
        conflict: revision.conflict,
        valueShift: revision.valueShift,
        cliffhanger: revision.cliffhanger,
        status: revision.status,
      },
    });

    const chapters = await tx.chapter.findMany({
      where: { projectId: chapter.projectId },
      select: { wordCount: true },
    });
    await tx.project.update({
      where: { id: chapter.projectId },
      data: {
        currentWordCount: chapters.reduce((sum, item) => sum + item.wordCount, 0),
      },
    });

    return savedChapter;
  });

  return NextResponse.json({ chapter: updatedChapter });
}
