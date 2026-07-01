import { buildChapterReviewPrompt } from "@/lib/ai/buildChapterReviewPrompt";
import { prisma } from "@/lib/db/prisma";
import { getActiveModelProvider } from "@/lib/model-gateway/activeProvider";
import type { ModelProviderId } from "@/lib/model-gateway/types";
import { getPlatformProfile, type PlatformId } from "@/lib/platforms/platformProfiles";

export interface ReviewIssueResult {
  severity: string;
  type: string;
  message: string;
  suggestion: string;
}

export interface ChapterReviewResult {
  score: number;
  issues: ReviewIssueResult[];
  summary: string;
}

export async function reviewChapterDraft(chapterId: string) {
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: { project: true },
  });

  if (!chapter) {
    throw new Error("Chapter not found");
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

  const { provider, adapter } = await getActiveModelProvider("chapter_review");
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

  try {
    const result = await adapter.generate({
      providerId: provider.providerId as ModelProviderId,
      model: provider.defaultModel,
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
    });
    const parsedResult = JSON.parse(result.text) as ChapterReviewResult;

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

    return {
      task: updatedTask,
      result: parsedResult,
      chapter,
      provider: {
        id: provider.id,
        providerId: provider.providerId,
        displayName: provider.displayName,
        model: provider.defaultModel,
      },
    };
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Unknown review error";
    const failedTask = await prisma.aiTask.update({
      where: { id: task.id },
      data: {
        status: "failed",
        errorMessage: message,
      },
    });

    return {
      task: failedTask,
      error: message,
      chapter,
      provider: {
        id: provider.id,
        providerId: provider.providerId,
        displayName: provider.displayName,
        model: provider.defaultModel,
      },
    };
  }
}
