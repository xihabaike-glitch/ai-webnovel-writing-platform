import { NextResponse } from "next/server";
import { buildChapterReviewPrompt } from "@/lib/ai/buildChapterReviewPrompt";
import { prisma } from "@/lib/db/prisma";
import { MockAdapter } from "@/lib/model-gateway/mockAdapter";
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

  const provider = await prisma.modelProvider.upsert({
    where: { id: "mock-provider" },
    create: {
      id: "mock-provider",
      providerId: "mock",
      displayName: "Mock Provider",
      defaultModel: "mock-editor",
      enabled: true,
    },
    update: {},
  });

  const task = await prisma.aiTask.create({
    data: {
      projectId: chapter.projectId,
      chapterId: chapter.id,
      taskType: "chapter_review",
      providerConfigId: provider.id,
      model: "mock-editor",
      status: "running",
      inputSnapshot: JSON.stringify(prompt),
    },
  });

  const result = await new MockAdapter().generate({
    providerId: "mock",
    model: "mock-editor",
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

