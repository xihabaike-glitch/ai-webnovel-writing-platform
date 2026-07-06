import { buildChapterDraftPrompt } from "@/lib/ai/buildChapterDraftPrompt";
import { buildAiRecoveryPromptMemory } from "@/lib/ai/aiRecoveryPromptMemory";
import { buildDraftQualityAudit } from "@/lib/ai/draftQualityAudit";
import { buildStoryTreeRewriteDispatchItems } from "@/lib/ai/storyTreeDispatch";
import { buildStoryTreeExperienceGuide } from "@/lib/ai/storyTreeExperience";
import { prisma } from "@/lib/db/prisma";
import { runRoutedGeneration } from "@/lib/model-gateway/routedGeneration";
import type { ForcedProviderTarget } from "@/lib/model-gateway/providerSelection";
import { getPlatformProfile, type PlatformId } from "@/lib/platforms/platformProfiles";
import { persistServerGateDispatchTask } from "@/lib/projects/gateDispatchTaskPersistence";
import { gatePlatformDispatchTaskFromRecord } from "@/lib/projects/gateDispatchTaskRecords";
import { buildProjectContextPack } from "@/lib/projects/projectContextPack";
import { findProjectStartTacticSummary } from "@/lib/projects/projectStartTactics";
import { countWords } from "@/lib/text/wordCount";

export interface GenerateChapterDraftOptions {
  chapterId: string;
  targetWords?: number;
  forcedProvider?: ForcedProviderTarget;
}

export async function generateChapterDraft(options: GenerateChapterDraftOptions) {
  const chapter = await prisma.chapter.findUnique({
    where: { id: options.chapterId },
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
                { dispatchKey: { startsWith: "story-tree:" } },
                { dispatchKey: { startsWith: "story-tree-experience:" } },
                { platformId: "ai-pipeline" },
                { dispatchKey: { startsWith: "ai-pipeline-recheck:" } },
                { dispatchKey: { startsWith: "ai-pipeline:" } },
              ],
            },
            orderBy: { completedAt: "desc" },
            take: 30,
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
  const gateDispatchTasks = chapter.project.gateDispatchTasks.map(gatePlatformDispatchTaskFromRecord);
  const storyTreeExperience = buildStoryTreeExperienceGuide(gateDispatchTasks);
  const aiRecoveryMemory = buildAiRecoveryPromptMemory(gateDispatchTasks);
  const projectContext = buildProjectContextPack({
    currentChapterId: chapter.id,
    chapters: chapter.project.chapters,
    characters: chapter.project.characters,
    worldEntries: chapter.project.worldEntries,
    foreshadows: chapter.project.foreshadows,
    plotThreads: chapter.project.plotThreads,
  });
  const prompt = buildChapterDraftPrompt({
    projectTitle: chapter.project.title,
    genre: chapter.project.genre,
    sellingPoint: chapter.project.sellingPoint,
    platform,
    startTactic,
    projectContext,
    storyTreeExperience,
    aiRecoveryMemory,
    targetWords: options.targetWords ?? 1200,
    chapter: {
      order: chapter.order,
      title: chapter.title,
      goal: chapter.goal,
      hook: chapter.hook,
      conflict: chapter.conflict,
      valueShift: chapter.valueShift,
      cliffhanger: chapter.cliffhanger,
      content: chapter.content,
    },
  });

  const generation = await runRoutedGeneration({
    projectId: chapter.projectId,
    chapterId: chapter.id,
    taskType: "chapter_draft",
    inputSnapshot: { prompt, aiRecoveryMemory },
    request: {
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
      temperature: 0.8,
      maxTokens: 2400,
    },
    forcedProvider: options.forcedProvider,
  });

  if (generation.ok) {
    const { result, provider, task } = generation;
    const wordCount = countWords(result.text);
    const draftQuality = buildDraftQualityAudit({
      platform,
      targetWords: options.targetWords ?? 1200,
      content: result.text,
      projectContext,
      startTactic,
      chapter: {
        title: chapter.title,
        goal: chapter.goal,
        hook: chapter.hook,
        conflict: chapter.conflict,
        valueShift: chapter.valueShift,
        cliffhanger: chapter.cliffhanger,
      },
    });

    const [updatedTask, candidateRevision] = await prisma.$transaction(async (tx) => {
      const savedTask = await tx.aiTask.update({
        where: { id: task.id },
        data: {
          status: "succeeded",
          outputText: result.text,
          inputTokens: result.usage?.inputTokens,
          outputTokens: result.usage?.outputTokens,
          costUsd: result.usage?.costUsd,
        },
      });
      const savedCandidate = await tx.chapterRevision.create({
        data: {
          chapterId: chapter.id,
          source: "ai_draft_candidate",
          sourceTaskId: generation.task.id,
          title: chapter.title,
          content: result.text,
          wordCount,
          goal: chapter.goal,
          hook: chapter.hook,
          conflict: chapter.conflict,
          valueShift: chapter.valueShift,
          cliffhanger: chapter.cliffhanger,
          status: "draft",
          notes: `AI 初稿候选。质量 ${draftQuality.score} 分；采纳后才会进入正文。`,
        },
      });
      await tx.aiTask.create({
        data: {
          projectId: chapter.projectId,
          chapterId: chapter.id,
          taskType: "chapter_review",
          providerConfigId: provider.id,
          model: `${provider.defaultModel}:auto-style-audit`,
          status: "succeeded",
          inputSnapshot: JSON.stringify({
            source: "auto_draft_quality_audit",
            draftTaskId: task.id,
            platformId: platform.id,
            targetWords: options.targetWords ?? 1200,
          }),
          outputText: JSON.stringify(draftQuality),
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 0,
        },
      });
      return [savedTask, savedCandidate];
    });
    const storyTreeDispatches = await Promise.all(buildStoryTreeRewriteDispatchItems({
      source: "chapter_draft",
      projectId: chapter.projectId,
      projectTitle: chapter.project.title,
      chapterId: chapter.id,
      chapterOrder: chapter.order,
      chapterTitle: chapter.title,
      platform,
      audit: draftQuality.treeAudit,
    }).map(persistServerGateDispatchTask));

    return {
      task: updatedTask,
      chapter,
      candidateRevision,
      content: result.text,
      draftQuality,
      storyTreeDispatches,
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
    chapter,
    error: generation.error,
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
