import { NextResponse } from "next/server";
import { reviewChapterDraft } from "@/lib/ai/chapterReviewGeneration";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: Request) {
  const body = (await request.json()) as { chapterId: string };

  try {
    const review = await reviewChapterDraft(body.chapterId);
    if ("error" in review) {
      const error = review.error ?? "审稿失败。";
      return NextResponse.json({ task: review.task, error, budgetGuard: review.budgetGuard }, { status: error.startsWith("预算拦截") ? 429 : 500 });
    }

    return NextResponse.json({ task: review.task, result: review.result, attempts: review.attempts });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Unknown review error";
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
      taskType: "chapter_review",
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return NextResponse.json({ tasks });
}
