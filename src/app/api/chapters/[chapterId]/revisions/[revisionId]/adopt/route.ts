import { NextResponse } from "next/server";
import { isChapterRevisionCandidate } from "@/lib/chapters/revisions";
import { countWords } from "@/lib/text/wordCount";
import { prisma } from "@/lib/db/prisma";
import { getActiveModelProvider } from "@/lib/model-gateway/activeProvider";

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

  if (!isChapterRevisionCandidate(revision.source)) {
    return NextResponse.json({ error: "Only AI candidate revisions can be adopted." }, { status: 400 });
  }

  const sourceTask = revision.sourceTaskId
    ? await prisma.aiTask.findUnique({
      where: { id: revision.sourceTaskId },
      select: { providerConfigId: true, model: true },
    })
    : null;
  let providerConfigId: string;
  let model: string;
  if (sourceTask) {
    providerConfigId = sourceTask.providerConfigId;
    model = sourceTask.model;
  } else {
    const fallbackProvider = await getActiveModelProvider();
    providerConfigId = fallbackProvider.provider.id;
    model = fallbackProvider.provider.defaultModel;
  }

  const adoptedWordCount = countWords(revision.content);
  const updatedChapter = await prisma.$transaction(async (tx) => {
    await tx.chapterRevision.create({
      data: {
        chapterId: chapter.id,
        source: "adopt_candidate_before_overwrite",
        sourceTaskId: revision.sourceTaskId,
        title: chapter.title,
        content: chapter.content,
        wordCount: chapter.wordCount,
        goal: chapter.goal,
        hook: chapter.hook,
        conflict: chapter.conflict,
        valueShift: chapter.valueShift,
        cliffhanger: chapter.cliffhanger,
        status: chapter.status,
        notes: `采纳候选稿 ${revision.id} 前自动保存。`,
      },
    });

    const savedChapter = await tx.chapter.update({
      where: { id: chapterId },
      data: {
        title: revision.title,
        content: revision.content,
        wordCount: adoptedWordCount,
        goal: revision.goal,
        hook: revision.hook,
        conflict: revision.conflict,
        valueShift: revision.valueShift,
        cliffhanger: revision.cliffhanger,
        status: revision.status,
      },
    });

    await tx.aiTask.create({
      data: {
        projectId: chapter.projectId,
        chapterId: chapter.id,
        taskType: "chapter_adopt_candidate",
        providerConfigId,
        model,
        status: "succeeded",
        inputSnapshot: JSON.stringify({
          chapterId: chapter.id,
          revisionId: revision.id,
          revisionSource: revision.source,
          sourceTaskId: revision.sourceTaskId,
          previousWordCount: chapter.wordCount,
          adoptedWordCount,
        }),
        outputText: JSON.stringify({
          adopted: true,
          nextAction: "chapter_review",
          message: "候选稿已采纳，正文发生变化。下一步应重新审稿，再决定二改或发布质检。",
        }),
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

  return NextResponse.json({
    chapter: updatedChapter,
    nextAction: {
      kind: "chapter_review",
      label: "去审稿",
      href: `/projects/${chapter.projectId}/chapters/${chapter.id}#chapter-workflow`,
      detail: "候选稿已采纳，旧审稿不再代表当前正文。先重新审稿，再决定二改或发布质检。",
    },
  });
}
