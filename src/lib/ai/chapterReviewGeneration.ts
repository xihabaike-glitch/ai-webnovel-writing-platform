import { buildChapterReviewPrompt } from "@/lib/ai/buildChapterReviewPrompt";
import { prisma } from "@/lib/db/prisma";
import { runRoutedGeneration } from "@/lib/model-gateway/routedGeneration";
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

  const generation = await runRoutedGeneration({
    projectId: chapter.projectId,
    chapterId: chapter.id,
    taskType: "chapter_review",
    inputSnapshot: prompt,
    request: {
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
    },
    validateResult: (result) => {
      JSON.parse(result.text);
    },
  });

  if (generation.ok) {
    const { result, provider } = generation;
    const parsedResult = JSON.parse(result.text) as ChapterReviewResult;

    return {
      task: generation.task,
      result: parsedResult,
      chapter,
      provider: {
        id: provider.id,
        providerId: provider.providerId,
        displayName: provider.displayName,
        model: provider.defaultModel,
      },
      attempts: generation.attempts,
    };
  }

  return {
    task: generation.task,
    error: generation.error,
    chapter,
    provider: {
      id: generation.provider.id,
      providerId: generation.provider.providerId,
      displayName: generation.provider.displayName,
      model: generation.provider.defaultModel,
    },
    budgetGuard: generation.budgetGuard,
    attempts: generation.attempts,
  };
}
