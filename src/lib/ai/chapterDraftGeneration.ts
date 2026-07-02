import { buildChapterDraftPrompt } from "@/lib/ai/buildChapterDraftPrompt";
import { buildDraftQualityAudit } from "@/lib/ai/draftQualityAudit";
import { prisma } from "@/lib/db/prisma";
import { runRoutedGeneration } from "@/lib/model-gateway/routedGeneration";
import { getPlatformProfile, type PlatformId } from "@/lib/platforms/platformProfiles";
import { countWords } from "@/lib/text/wordCount";

export interface GenerateChapterDraftOptions {
  chapterId: string;
  targetWords?: number;
}

export async function generateChapterDraft(options: GenerateChapterDraftOptions) {
  const chapter = await prisma.chapter.findUnique({
    where: { id: options.chapterId },
    include: { project: true },
  });

  if (!chapter) {
    throw new Error("Chapter not found");
  }

  const platform = getPlatformProfile(chapter.project.targetPlatform as PlatformId);
  const prompt = buildChapterDraftPrompt({
    projectTitle: chapter.project.title,
    genre: chapter.project.genre,
    sellingPoint: chapter.project.sellingPoint,
    platform,
    targetWords: options.targetWords ?? 1200,
    chapter: {
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
    inputSnapshot: prompt,
    request: {
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
      temperature: 0.8,
      maxTokens: 2400,
    },
  });

  if (generation.ok) {
    const { result, provider, task } = generation;
    const wordCount = countWords(result.text);
    const draftQuality = buildDraftQualityAudit({
      platform,
      targetWords: options.targetWords ?? 1200,
      content: result.text,
      chapter: {
        title: chapter.title,
        goal: chapter.goal,
        hook: chapter.hook,
        conflict: chapter.conflict,
        valueShift: chapter.valueShift,
        cliffhanger: chapter.cliffhanger,
      },
    });

    const [updatedTask, updatedChapter] = await prisma.$transaction(async (tx) => {
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
      await tx.chapterRevision.create({
        data: {
          chapterId: chapter.id,
          source: "ai_draft_before_overwrite",
          sourceTaskId: generation.task.id,
          title: chapter.title,
          content: chapter.content,
          wordCount: chapter.wordCount,
          goal: chapter.goal,
          hook: chapter.hook,
          conflict: chapter.conflict,
          valueShift: chapter.valueShift,
          cliffhanger: chapter.cliffhanger,
          status: chapter.status,
          notes: "AI 生成正文前自动保存。",
        },
      });
      const savedChapter = await tx.chapter.update({
        where: { id: chapter.id },
        data: {
          content: result.text,
          wordCount,
          status: "draft",
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
      const chapters = await tx.chapter.findMany({
        where: { projectId: chapter.projectId },
        select: { wordCount: true },
      });
      await tx.project.update({
        where: { id: chapter.projectId },
        data: {
          currentWordCount: chapters.reduce((sum, item) => sum + item.wordCount, 0),
        },
      });

      return [savedTask, savedChapter];
    });

    return {
      task: updatedTask,
      chapter: updatedChapter,
      content: result.text,
      draftQuality,
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
