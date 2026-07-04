import {
  buildChapterSecondPassPrompt,
  type SecondPassMode,
} from "@/lib/ai/buildChapterSecondPassPrompt";
import { buildDraftQualityAudit } from "@/lib/ai/draftQualityAudit";
import { buildStoryTreeRewriteDispatchItems } from "@/lib/ai/storyTreeDispatch";
import {
  buildStoryTreeExperienceEffectFeedback,
  buildStoryTreeExperienceSecondPassAdvice,
  matchStoryTreeExperienceAdviceForInstruction,
} from "@/lib/ai/storyTreeExperience";
import { prisma } from "@/lib/db/prisma";
import { runRoutedGeneration } from "@/lib/model-gateway/routedGeneration";
import { getPlatformProfile, type PlatformId } from "@/lib/platforms/platformProfiles";
import { persistServerGateDispatchTask } from "@/lib/projects/gateDispatchTaskPersistence";
import { gatePlatformDispatchTaskFromRecord } from "@/lib/projects/gateDispatchTaskRecords";
import { findProjectStartTacticSummary } from "@/lib/projects/projectStartTactics";
import { countWords } from "@/lib/text/wordCount";

export type { SecondPassMode } from "@/lib/ai/buildChapterSecondPassPrompt";

const validModes: SecondPassMode[] = [
  "more_hook",
  "more_payoff",
  "less_exposition",
  "more_emotion",
  "platform_fit",
];

export function normalizeSecondPassMode(mode: string | undefined): SecondPassMode {
  return validModes.includes(mode as SecondPassMode) ? (mode as SecondPassMode) : "platform_fit";
}

function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function parseJsonList(value: string) {
  try {
    return stringList(JSON.parse(value) as unknown);
  } catch {
    return [];
  }
}

export interface GenerateChapterSecondPassOptions {
  chapterId: string;
  instruction: string;
  mode?: SecondPassMode;
  targetWords?: number;
}

export async function generateChapterSecondPass(options: GenerateChapterSecondPassOptions) {
  const instruction = options.instruction.trim();
  if (!instruction) {
    throw new Error("instruction is required");
  }

  const chapter = await prisma.chapter.findUnique({
    where: { id: options.chapterId },
    include: {
      project: {
        include: {
          worldEntries: true,
          gateDispatchTasks: {
            where: {
              state: "completed",
              dispatchKey: { startsWith: "story-tree-experience:" },
              href: { contains: `/chapters/${options.chapterId}` },
            },
            orderBy: { completedAt: "desc" },
            take: 12,
          },
        },
      },
    },
  });

  if (!chapter) {
    throw new Error("Chapter not found");
  }

  const mode = normalizeSecondPassMode(options.mode);
  const platform = getPlatformProfile(chapter.project.targetPlatform as PlatformId);
  const startTactic = findProjectStartTacticSummary(chapter.project.worldEntries);
  const storyTreeExperienceAdvice = buildStoryTreeExperienceSecondPassAdvice(
    chapter.project.gateDispatchTasks.map(gatePlatformDispatchTaskFromRecord),
    chapter.id,
  );
  const usedStoryTreeExperienceAdvice = matchStoryTreeExperienceAdviceForInstruction(storyTreeExperienceAdvice, instruction);
  const prompt = buildChapterSecondPassPrompt({
    projectTitle: chapter.project.title,
    genre: chapter.project.genre,
    sellingPoint: chapter.project.sellingPoint,
    platform,
    startTactic,
    instruction,
    mode,
    targetWords: options.targetWords ?? Math.max(1200, chapter.wordCount),
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
    taskType: "chapter_second_pass",
    inputSnapshot: { prompt, instruction, mode, startTactic, storyTreeExperienceAdvice: usedStoryTreeExperienceAdvice },
    request: {
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
      temperature: 0.76,
      maxTokens: 3200,
    },
  });

  if (generation.ok) {
    const { result, provider, task } = generation;
    const wordCount = countWords(result.text);
    const secondPassAudit = buildDraftQualityAudit({
      platform,
      targetWords: options.targetWords ?? Math.max(1200, chapter.wordCount),
      content: result.text,
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
    const storyTreeExperienceEffects = usedStoryTreeExperienceAdvice.map((advice) => buildStoryTreeExperienceEffectFeedback({
      advice,
      audit: secondPassAudit.treeAudit,
    }));

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
          source: "chapter_second_pass_before_overwrite",
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
          notes: `二改前自动保存。指令：${instruction}`,
        },
      });
      const savedChapter = await tx.chapter.update({
        where: { id: chapter.id },
        data: {
          content: result.text,
          wordCount,
          status: "revising",
        },
      });
      await tx.aiTask.create({
        data: {
          projectId: chapter.projectId,
          chapterId: chapter.id,
          taskType: "chapter_review",
          providerConfigId: provider.id,
          model: `${provider.defaultModel}:auto-second-pass-audit`,
          status: "succeeded",
          inputSnapshot: JSON.stringify({
            source: "auto_second_pass_quality_audit",
            secondPassTaskId: task.id,
            platformId: platform.id,
            targetWords: options.targetWords ?? Math.max(1200, chapter.wordCount),
            storyTreeExperienceEffects,
          }),
          outputText: JSON.stringify({ ...secondPassAudit, storyTreeExperienceEffects }),
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 0,
        },
      });
      for (const effect of storyTreeExperienceEffects) {
        if (!effect.databaseId) continue;
        const sourceTask = chapter.project.gateDispatchTasks.find((item) => item.id === effect.databaseId);
        const evidence = sourceTask ? parseJsonList(sourceTask.evidence) : [];
        if (evidence.includes(effect.line)) continue;
        await tx.gateDispatchTask.update({
          where: { id: effect.databaseId },
          data: { evidence: JSON.stringify([...evidence, effect.line]) },
        });
      }
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
    const storyTreeDispatches = await Promise.all(buildStoryTreeRewriteDispatchItems({
      source: "chapter_second_pass",
      projectId: chapter.projectId,
      projectTitle: chapter.project.title,
      chapterId: chapter.id,
      chapterOrder: chapter.order,
      chapterTitle: chapter.title,
      platform,
      audit: secondPassAudit.treeAudit,
    }).map(persistServerGateDispatchTask));

    return {
      task: updatedTask,
      chapter: updatedChapter,
      content: result.text,
      secondPassAudit,
      storyTreeExperienceEffects,
      storyTreeDispatches,
      activeProvider: {
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
    activeProvider: {
      id: generation.provider.id,
      providerId: generation.provider.providerId,
      displayName: generation.provider.displayName,
      model: generation.provider.defaultModel,
    },
    budgetGuard: generation.budgetGuard,
    attempts: generation.attempts,
  };
}
