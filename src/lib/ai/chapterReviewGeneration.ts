import { buildChapterReviewPrompt } from "@/lib/ai/buildChapterReviewPrompt";
import { buildAiRecoveryPromptMemory } from "@/lib/ai/aiRecoveryPromptMemory";
import { prisma } from "@/lib/db/prisma";
import type { ForcedProviderTarget } from "@/lib/model-gateway/providerSelection";
import { runRoutedGeneration } from "@/lib/model-gateway/routedGeneration";
import { getPlatformProfile, type PlatformId } from "@/lib/platforms/platformProfiles";
import { buildProjectContextPack } from "@/lib/projects/projectContextPack";
import { findProjectStartTacticSummary } from "@/lib/projects/projectStartTactics";
import { completeFirstThreeReviewFollowup } from "@/lib/chapters/revisionAdoptionFollowupCompletion";
import { gatePlatformDispatchTaskFromRecord } from "@/lib/projects/gateDispatchTaskRecords";

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

export interface ReviewChapterDraftOptions {
  forcedProvider?: ForcedProviderTarget;
}

export async function reviewChapterDraft(chapterId: string, options: ReviewChapterDraftOptions = {}) {
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: {
      project: {
        include: {
          chapters: { orderBy: { order: "asc" } },
          characters: { orderBy: { createdAt: "asc" } },
          worldEntries: true,
          foreshadows: { orderBy: { createdAt: "asc" } },
          plotThreads: { orderBy: { createdAt: "asc" } },
          gateDispatchTasks: {
            where: {
              state: "completed",
              OR: [
                { platformId: "ai-pipeline" },
                { dispatchKey: { startsWith: "ai-pipeline-recheck:" } },
                { dispatchKey: { startsWith: "ai-pipeline:" } },
              ],
            },
            orderBy: { completedAt: "desc" },
            take: 20,
          },
        },
      },
    },
  });

  if (!chapter) {
    throw new Error("Chapter not found");
  }

  const platform = getPlatformProfile(chapter.project.targetPlatform as PlatformId);
  const startTactic = findProjectStartTacticSummary(chapter.project.worldEntries);
  const aiRecoveryMemory = buildAiRecoveryPromptMemory(
    chapter.project.gateDispatchTasks.map(gatePlatformDispatchTaskFromRecord),
  );
  const projectContext = buildProjectContextPack({
    currentChapterId: chapter.id,
    chapters: chapter.project.chapters,
    characters: chapter.project.characters,
    worldEntries: chapter.project.worldEntries,
    foreshadows: chapter.project.foreshadows,
    plotThreads: chapter.project.plotThreads,
  });
  const prompt = buildChapterReviewPrompt({
    projectTitle: chapter.project.title,
    platform,
    startTactic,
    projectContext,
    aiRecoveryMemory,
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
    inputSnapshot: { prompt, aiRecoveryMemory },
    request: {
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
    },
    validateResult: (result) => {
      JSON.parse(result.text);
    },
    forcedProvider: options.forcedProvider,
  });

  if (generation.ok) {
    const { result, provider } = generation;
    const parsedResult = JSON.parse(result.text) as ChapterReviewResult;
    await completeFirstThreeReviewFollowup({
      projectId: chapter.projectId,
      chapterId: chapter.id,
      chapterOrder: chapter.order,
      chapterTitle: chapter.title,
      taskId: generation.task.id,
      score: parsedResult.score,
      issueCount: Array.isArray(parsedResult.issues) ? parsedResult.issues.length : null,
    });

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
