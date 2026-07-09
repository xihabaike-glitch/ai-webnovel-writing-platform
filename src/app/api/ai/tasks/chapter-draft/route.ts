import { NextResponse } from "next/server";
import { mapChapterGenerationError, mapChapterGenerationFailure } from "@/lib/ai/chapterGenerationHttp";
import { generateChapterDraft } from "@/lib/ai/chapterDraftGeneration";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: Request) {
  const body = (await request.json()) as { chapterId: string; targetWords?: number };

  try {
    const result = await generateChapterDraft({
      chapterId: body.chapterId,
      targetWords: body.targetWords,
    });
    if ("error" in result) {
      const mapped = mapChapterGenerationFailure(result);
      return NextResponse.json(mapped.body, { status: mapped.status });
    }

    return NextResponse.json({
      task: result.task,
      chapter: result.chapter,
      candidateRevision: result.candidateRevision,
      content: result.content,
      draftQuality: result.draftQuality,
      storyTreeDispatches: result.storyTreeDispatches,
      attempts: result.attempts,
    });
  } catch (caught) {
    const mapped = mapChapterGenerationError(caught, "Unknown draft generation error");
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chapterId = searchParams.get("chapterId");

  if (!chapterId) {
    return NextResponse.json({ error: "chapterId is required" }, { status: 400 });
  }

  const tasks = await prisma.aiTask.findMany({
    where: {
      chapterId,
      taskType: "chapter_draft",
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return NextResponse.json({ tasks });
}
