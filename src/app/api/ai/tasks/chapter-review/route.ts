import { NextResponse } from "next/server";
import { mapChapterGenerationError, mapChapterGenerationFailure } from "@/lib/ai/chapterGenerationHttp";
import { reviewChapterDraft } from "@/lib/ai/chapterReviewGeneration";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: Request) {
  const body = (await request.json()) as { chapterId: string };

  try {
    const review = await reviewChapterDraft(body.chapterId);
    if ("error" in review) {
      const mapped = mapChapterGenerationFailure(review);
      return NextResponse.json(mapped.body, { status: mapped.status });
    }

    return NextResponse.json({ task: review.task, result: review.result, attempts: review.attempts });
  } catch (caught) {
    const mapped = mapChapterGenerationError(caught, "Unknown review error");
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
      taskType: "chapter_review",
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return NextResponse.json({ tasks });
}
