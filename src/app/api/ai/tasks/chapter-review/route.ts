import { NextResponse } from "next/server";
import { buildChapterReviewPrompt } from "@/lib/ai/buildChapterReviewPrompt";
import { prisma } from "@/lib/db/prisma";
import { getActiveModelProvider } from "@/lib/model-gateway/activeProvider";
import { getPlatformProfile, type PlatformId } from "@/lib/platforms/platformProfiles";

export async function POST(request: Request) {
  const body = (await request.json()) as { chapterId: string };
  const chapter = await prisma.chapter.findUnique({
    where: { id: body.chapterId },
    include: { project: true },
  });

  if (!chapter) {
    return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  }

  const platform = getPlatformProfile(chapter.project.targetPlatform as PlatformId);
  const prompt = buildChapterReviewPrompt({
    projectTitle: chapter.project.title,
    platform,
    chapter: {
      title: chapter.title,
      content: chapter.content,
      goal: chapter.goal,
      hook: chapter.hook,
      conflict: chapter.conflict,
      valueShift: chapter.valueShift,
      cliffhanger: chapter.cliffhanger,
    },
  });

  const { provider, adapter } = await getActiveModelProvider();

  const task = await prisma.aiTask.create({
    data: {
      projectId: chapter.projectId,
      chapterId: chapter.id,
      taskType: "chapter_review",
      providerConfigId: provider.id,
      model: provider.defaultModel,
      status: "running",
      inputSnapshot: JSON.stringify(prompt),
    },
  });

  const result = await adapter.generate({
    providerId: provider.providerId as "claude" | "deepseek" | "kimi" | "gpt" | "openai_compatible" | "ollama" | "mock",
    model: provider.defaultModel,
    systemPrompt: prompt.systemPrompt,
    userPrompt: prompt.userPrompt,
  });

  const updatedTask = await prisma.aiTask.update({
    where: { id: task.id },
    data: {
      status: "succeeded",
      outputText: result.text,
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
      costUsd: result.usage?.costUsd,
    },
  });

  return NextResponse.json({ task: updatedTask, result: JSON.parse(result.text) });
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
