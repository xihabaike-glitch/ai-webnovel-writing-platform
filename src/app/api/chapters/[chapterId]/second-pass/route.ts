import { NextResponse } from "next/server";
import {
  buildChapterSecondPassPrompt,
  type SecondPassMode,
} from "@/lib/ai/buildChapterSecondPassPrompt";
import { prisma } from "@/lib/db/prisma";
import { getActiveModelProvider } from "@/lib/model-gateway/activeProvider";
import type { ModelProviderId } from "@/lib/model-gateway/types";
import { getPlatformProfile, type PlatformId } from "@/lib/platforms/platformProfiles";
import { countWords } from "@/lib/text/wordCount";

interface Params {
  params: Promise<{ chapterId: string }>;
}

interface SecondPassBody {
  instruction?: string;
  mode?: SecondPassMode;
  targetWords?: number;
}

const validModes: SecondPassMode[] = [
  "more_hook",
  "more_payoff",
  "less_exposition",
  "more_emotion",
  "platform_fit",
];

function normalizeMode(mode: string | undefined): SecondPassMode {
  return validModes.includes(mode as SecondPassMode) ? (mode as SecondPassMode) : "platform_fit";
}

export async function POST(request: Request, { params }: Params) {
  const { chapterId } = await params;
  const body = (await request.json().catch(() => ({}))) as SecondPassBody;
  const instruction = body.instruction?.trim();

  if (!instruction) {
    return NextResponse.json({ error: "instruction is required" }, { status: 400 });
  }

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: { project: true },
  });

  if (!chapter) {
    return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  }

  const platform = getPlatformProfile(chapter.project.targetPlatform as PlatformId);
  const prompt = buildChapterSecondPassPrompt({
    projectTitle: chapter.project.title,
    genre: chapter.project.genre,
    sellingPoint: chapter.project.sellingPoint,
    platform,
    instruction,
    mode: normalizeMode(body.mode),
    targetWords: body.targetWords ?? Math.max(1200, chapter.wordCount),
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
      taskType: "chapter_second_pass",
      providerConfigId: provider.id,
      model: provider.defaultModel,
      status: "running",
      inputSnapshot: JSON.stringify({ prompt, instruction, mode: normalizeMode(body.mode) }),
    },
  });

  try {
    const result = await adapter.generate({
      providerId: provider.providerId as ModelProviderId,
      model: provider.defaultModel,
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
      temperature: 0.76,
      maxTokens: 3200,
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
          source: "chapter_second_pass_before_overwrite",
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

    return NextResponse.json({
      task: updatedTask,
      chapter: updatedChapter,
      content: result.text,
      activeProvider: {
        id: provider.id,
        providerId: provider.providerId,
        displayName: provider.displayName,
        model: provider.defaultModel,
      },
    });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Unknown second pass error";
    const failedTask = await prisma.aiTask.update({
      where: { id: task.id },
      data: {
        status: "failed",
        errorMessage: message,
      },
    });

    return NextResponse.json({ task: failedTask, error: message }, { status: 500 });
  }
}
