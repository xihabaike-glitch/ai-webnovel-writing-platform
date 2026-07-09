import {
  buildChapterSecondPassPrompt,
  type SecondPassMode,
} from "@/lib/ai/buildChapterSecondPassPrompt";
import { buildAiRecoveryPromptMemory } from "@/lib/ai/aiRecoveryPromptMemory";
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
import { persistServerGateDispatchTaskWithDatabase } from "@/lib/projects/gateDispatchTaskPersistence";
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
              OR: [
                {
                  dispatchKey: { startsWith: "story-tree-experience:" },
                  href: { contains: `/chapters/${options.chapterId}` },
                },
                { platformId: "ai-pipeline" },
                { dispatchKey: { startsWith: "ai-pipeline-recheck:" } },
                { dispatchKey: { startsWith: "ai-pipeline:" } },
              ],
            },
            orderBy: { completedAt: "desc" },
            take: 24,
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
  const gateDispatchTasks = chapter.project.gateDispatchTasks.map(gatePlatformDispatchTaskFromRecord);
  const storyTreeExperienceAdvice = buildStoryTreeExperienceSecondPassAdvice(
    gateDispatchTasks,
    chapter.id,
  );
  const aiRecoveryMemory = buildAiRecoveryPromptMemory(gateDispatchTasks);
  const usedStoryTreeExperienceAdvice = matchStoryTreeExperienceAdviceForInstruction(storyTreeExperienceAdvice, instruction);
  const prompt = buildChapterSecondPassPrompt({
    projectTitle: chapter.project.title,
    genre: chapter.project.genre,
    sellingPoint: chapter.project.sellingPoint,
    platform,
    startTactic,
    aiRecoveryMemory,
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
    inputSnapshot: { prompt, instruction, mode, startTactic, aiRecoveryMemory, storyTreeExperienceAdvice: usedStoryTreeExperienceAdvice },
    request: {
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
      temperature: 0.76,
      maxTokens: 3200,
    },
    persistSuccess: async ({ transaction, result, provider, task }) => {
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
      const candidateRevision = await transaction.chapterRevision.create({
        data: {
          chapterId: chapter.id,
          source: "chapter_second_pass_candidate",
          sourceTaskId: task.id,
          title: chapter.title,
          content: result.text,
          wordCount,
          goal: chapter.goal,
          hook: chapter.hook,
          conflict: chapter.conflict,
          valueShift: chapter.valueShift,
          cliffhanger: chapter.cliffhanger,
          status: "revising",
          notes: `二改候选稿。质量 ${secondPassAudit.score} 分；指令：${instruction}`,
        },
      });
      await transaction.aiTask.create({
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
        await transaction.gateDispatchTask.update({
          where: { id: effect.databaseId },
          data: { evidence: JSON.stringify([...evidence, effect.line]) },
        });
      }
      const storyTreeDispatches = [];
      for (const dispatch of buildStoryTreeRewriteDispatchItems({
        source: "chapter_second_pass",
        projectId: chapter.projectId,
        projectTitle: chapter.project.title,
        chapterId: chapter.id,
        chapterOrder: chapter.order,
        chapterTitle: chapter.title,
        platform,
        audit: secondPassAudit.treeAudit,
      })) {
        storyTreeDispatches.push(await persistServerGateDispatchTaskWithDatabase(dispatch, transaction));
      }
      return { candidateRevision, secondPassAudit, storyTreeExperienceEffects, storyTreeDispatches };
    },
  });

  if (generation.ok) {
    const { result, provider, task, persistence } = generation;

    return {
      task,
      chapter,
      candidateRevision: persistence.candidateRevision,
      content: result.text,
      secondPassAudit: persistence.secondPassAudit,
      storyTreeExperienceEffects: persistence.storyTreeExperienceEffects,
      storyTreeDispatches: persistence.storyTreeDispatches,
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
