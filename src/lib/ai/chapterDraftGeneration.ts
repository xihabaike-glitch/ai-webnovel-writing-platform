import { buildChapterDraftPrompt } from "@/lib/ai/buildChapterDraftPrompt";
import { prisma } from "@/lib/db/prisma";
import { getActiveModelProvider } from "@/lib/model-gateway/activeProvider";
import type { ModelProviderId } from "@/lib/model-gateway/types";
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

  const { provider, adapter } = await getActiveModelProvider("chapter_draft");
  const task = await prisma.aiTask.create({
    data: {
      projectId: chapter.projectId,
      chapterId: chapter.id,
      taskType: "chapter_draft",
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
      temperature: 0.8,
      maxTokens: 2400,
    });
    const wordCount = countWords(result.text);

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
          sourceTaskId: task.id,
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
      provider: {
        id: provider.id,
        providerId: provider.providerId,
        displayName: provider.displayName,
        model: provider.defaultModel,
      },
    };
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Unknown draft generation error";
    const failedTask = await prisma.aiTask.update({
      where: { id: task.id },
      data: {
        status: "failed",
        errorMessage: message,
      },
    });

    return {
      task: failedTask,
      chapter,
      error: message,
      provider: {
        id: provider.id,
        providerId: provider.providerId,
        displayName: provider.displayName,
        model: provider.defaultModel,
      },
    };
  }
}
