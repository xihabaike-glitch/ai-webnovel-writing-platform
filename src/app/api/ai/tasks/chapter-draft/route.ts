import { NextResponse } from "next/server";
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
      const error = result.error ?? "生成正文失败。";
      return NextResponse.json({ task: result.task, error, budgetGuard: result.budgetGuard }, { status: error.startsWith("预算拦截") ? 429 : 500 });
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
    const message = caught instanceof Error ? caught.message : "Unknown draft generation error";
    const status = message === "Chapter not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
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
