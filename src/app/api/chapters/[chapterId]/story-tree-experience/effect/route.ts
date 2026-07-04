import { NextResponse } from "next/server";
import {
  buildStoryTreeExperienceEffectFeedback,
  buildStoryTreeExperienceSecondPassAdvice,
} from "@/lib/ai/storyTreeExperience";
import { buildStoryTreeQualityAudit } from "@/lib/ai/storyTreeQualityAudit";
import { prisma } from "@/lib/db/prisma";
import { gatePlatformDispatchTaskFromRecord } from "@/lib/projects/gateDispatchTaskRecords";
import { buildProjectContextPack } from "@/lib/projects/projectContextPack";
import { findProjectStartTacticSummary } from "@/lib/projects/projectStartTactics";

interface Params {
  params: Promise<{ chapterId: string }>;
}

interface Body {
  dispatchKey?: string;
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

export async function POST(request: Request, { params }: Params) {
  const { chapterId } = await params;
  const body = (await request.json().catch(() => ({}))) as Body;
  const dispatchKey = body.dispatchKey?.trim();

  if (!dispatchKey) {
    return NextResponse.json({ error: "dispatchKey is required" }, { status: 400 });
  }

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: {
      project: {
        include: {
          chapters: { orderBy: { order: "asc" } },
          characters: { orderBy: { createdAt: "asc" } },
          worldEntries: { orderBy: [{ type: "asc" }, { createdAt: "asc" }] },
          foreshadows: { orderBy: { createdAt: "asc" } },
          plotThreads: { orderBy: { createdAt: "asc" } },
          gateDispatchTasks: {
            where: {
              dispatchKey: { startsWith: "story-tree-experience:" },
              state: "completed",
            },
            orderBy: { completedAt: "desc" },
            take: 80,
          },
        },
      },
    },
  });

  if (!chapter) {
    return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  }

  const targetTask = chapter.project.gateDispatchTasks.find((task) => task.dispatchKey === dispatchKey);
  if (!targetTask || !targetTask.href.includes(`/chapters/${chapter.id}`)) {
    return NextResponse.json({ error: "结构经验派单不属于当前章节。" }, { status: 404 });
  }

  const evidence = parseJsonList(targetTask.evidence);
  const existingEffectLine = evidence.find((item) => item.startsWith("经验应用效果："));
  if (existingEffectLine) {
    return NextResponse.json({
      alreadyReturned: true,
      effect: { line: existingEffectLine },
      task: { dispatchKey: targetTask.dispatchKey, title: targetTask.title },
    });
  }

  const persistedTasks = chapter.project.gateDispatchTasks.map(gatePlatformDispatchTaskFromRecord);
  const advice = buildStoryTreeExperienceSecondPassAdvice(
    persistedTasks.filter((task) => task.dispatchKey === dispatchKey),
    chapter.id,
    1,
  )[0];
  if (!advice) {
    return NextResponse.json({ error: "无法从该派单生成复盘依据。" }, { status: 400 });
  }

  const projectContext = buildProjectContextPack({
    currentChapterId: chapter.id,
    chapters: chapter.project.chapters,
    characters: chapter.project.characters,
    worldEntries: chapter.project.worldEntries,
    foreshadows: chapter.project.foreshadows,
    plotThreads: chapter.project.plotThreads,
  });
  const audit = buildStoryTreeQualityAudit({
    content: chapter.content,
    projectContext,
    startTactic: findProjectStartTacticSummary(chapter.project.worldEntries),
    chapter: {
      title: chapter.title,
      goal: chapter.goal,
      hook: chapter.hook,
      conflict: chapter.conflict,
      valueShift: chapter.valueShift,
      cliffhanger: chapter.cliffhanger,
    },
  });
  const effect = buildStoryTreeExperienceEffectFeedback({ advice, audit });
  const nextEvidence = Array.from(new Set([...evidence, effect.line]));
  await prisma.gateDispatchTask.update({
    where: { dispatchKey },
    data: { evidence: JSON.stringify(nextEvidence) },
  });

  return NextResponse.json({
    alreadyReturned: false,
    effect,
    audit: {
      score: audit.score,
      label: audit.label,
    },
    task: {
      dispatchKey: targetTask.dispatchKey,
      title: targetTask.title,
    },
  });
}
