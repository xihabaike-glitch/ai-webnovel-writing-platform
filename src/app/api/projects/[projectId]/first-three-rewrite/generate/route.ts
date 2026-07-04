import { NextResponse } from "next/server";
import { buildFirstThreeRewritePrompt } from "@/lib/ai/buildFirstThreeRewritePrompt";
import { prisma } from "@/lib/db/prisma";
import { getActiveModelProvider } from "@/lib/model-gateway/activeProvider";
import type { ModelProviderId } from "@/lib/model-gateway/types";
import { getPlatformProfile, type PlatformId } from "@/lib/platforms/platformProfiles";
import { buildProjectContextPack } from "@/lib/projects/projectContextPack";
import { buildFirstThreeRewriteEvaluation, buildFirstThreeRewritePackage } from "@/lib/projects/firstThreeRewrite";
import { buildPlatformPublishExportCenter, parsePublishSnapshotTags } from "@/lib/projects/platformPublishExport";
import { findProjectStartTacticSummary } from "@/lib/projects/projectStartTactics";
import { buildSubmissionChecklist } from "@/lib/projects/submissionChecklist";
import { countWords } from "@/lib/text/wordCount";

interface Params {
  params: Promise<{ projectId: string }>;
}

interface GenerateBody {
  targetWords?: number;
  chapterOrders?: number[];
  platformId?: string;
}

function normalizeOrders(rawOrders: number[] | undefined) {
  const orders = rawOrders?.length ? rawOrders : [1, 2, 3];
  return [...new Set(orders.filter((order) => [1, 2, 3].includes(order)))].sort((left, right) => left - right);
}

function planToChapterFields(plan: {
  title: string;
  rewriteTarget: string;
  coldOpen: string;
  currentProblem: string;
  expectedEffect: string;
  ending: string;
}) {
  return {
    title: plan.title,
    goal: plan.rewriteTarget,
    hook: plan.coldOpen,
    conflict: plan.currentProblem,
    valueShift: plan.expectedEffect,
    cliffhanger: plan.ending,
  };
}

export async function POST(request: Request, { params }: Params) {
  const { projectId } = await params;
  const body = (await request.json().catch(() => ({}))) as GenerateBody;
  const chapterOrders = normalizeOrders(body.chapterOrders);

  if (chapterOrders.length === 0) {
    return NextResponse.json({ error: "chapterOrders must include 1, 2, or 3" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      chapters: { orderBy: { order: "asc" } },
      aiTasks: { orderBy: { createdAt: "desc" } },
      publishSnapshots: { orderBy: { createdAt: "desc" }, take: 80 },
      characters: { orderBy: { createdAt: "asc" } },
      foreshadows: { orderBy: { createdAt: "asc" } },
      plotThreads: { orderBy: { createdAt: "asc" } },
      submissionAssets: { orderBy: { updatedAt: "desc" } },
      submissionAssetVersions: { orderBy: { createdAt: "desc" }, take: 80 },
      platformPublishMetrics: { orderBy: { snapshotDate: "desc" }, take: 80 },
      worldEntries: true,
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const platform = getPlatformProfile((body.platformId ?? project.targetPlatform) as PlatformId);
  const startTactic = findProjectStartTacticSummary(project.worldEntries);
  const submissionChecklist = buildSubmissionChecklist({
    title: project.title,
    genre: project.genre,
    sellingPoint: project.sellingPoint,
    currentWordCount: project.currentWordCount,
    targetWordCount: project.targetWordCount,
    platform,
    chapters: project.chapters,
    aiTasks: project.aiTasks.map((task) => ({
      taskType: task.taskType,
      status: task.status,
      chapter: task.chapterId ? { id: task.chapterId } : null,
    })),
  });
  const center = buildPlatformPublishExportCenter({
    project: {
      title: project.title,
      genre: project.genre,
      sellingPoint: project.sellingPoint,
      currentWordCount: project.currentWordCount,
      targetWordCount: project.targetWordCount,
    },
    targetPlatform: platform,
    platforms: [platform],
    chapters: project.chapters,
    aiTasks: project.aiTasks,
    publishSnapshots: project.publishSnapshots,
    submissionAssets: project.submissionAssets.map((asset) => ({
      id: asset.id,
      platformId: asset.platformId,
      platformName: asset.platformName,
      title: asset.title,
      logline: asset.logline,
      synopsis: asset.synopsis,
      overseasSynopsis: asset.overseasSynopsis,
      tags: parsePublishSnapshotTags(asset.tags),
      note: asset.note,
      source: asset.source,
      updatedAt: asset.updatedAt,
    })),
    submissionAssetVersions: project.submissionAssetVersions.map((version) => ({
      id: version.id,
      platformId: version.platformId,
      platformName: version.platformName,
      title: version.title,
      logline: version.logline,
      synopsis: version.synopsis,
      overseasSynopsis: version.overseasSynopsis,
      tags: parsePublishSnapshotTags(version.tags),
      note: version.note,
      source: version.source,
      auditScore: version.auditScore,
      auditStatus: version.auditStatus === "ready" || version.auditStatus === "blocked" ? version.auditStatus : "needs_work",
      action: version.action,
      sourceTaskId: version.sourceTaskId,
      strategy: version.strategy,
      createdAt: version.createdAt,
    })),
    platformPublishMetrics: project.platformPublishMetrics.map((metric) => ({
      id: metric.id,
      platformId: metric.platformId,
      platformName: metric.platformName,
      views: metric.views,
      clicks: metric.clicks,
      favorites: metric.favorites,
      follows: metric.follows,
      comments: metric.comments,
      paidReads: metric.paidReads,
      editorFeedback: metric.editorFeedback,
      contractStatus: metric.contractStatus,
      publishUrl: metric.publishUrl,
      notes: metric.notes,
      snapshotDate: metric.snapshotDate,
      createdAt: metric.createdAt,
      updatedAt: metric.updatedAt,
    })),
    submissionChecklist,
  });
  const platformKnowledge = center.platformKnowledge.find((item) => item.platformId === platform.id) ?? null;
  const rewritePackage = buildFirstThreeRewritePackage({
    projectTitle: project.title,
    platform,
    chapters: project.chapters,
  });
  const { provider, adapter } = await getActiveModelProvider("first_three_rewrite");
  const chaptersByOrder = new Map(project.chapters.map((chapter) => [chapter.order, chapter]));
  const results = [];

  for (const plan of rewritePackage.chapterPlans.filter((item) => chapterOrders.includes(item.order))) {
    const fields = planToChapterFields(plan);
    let chapter = chaptersByOrder.get(plan.order);
    let createdChapter = false;

    if (!chapter) {
      chapter = await prisma.chapter.create({
        data: {
          projectId: project.id,
          order: plan.order,
          ...fields,
          content: "",
          wordCount: 0,
          status: "outline",
        },
      });
      chaptersByOrder.set(plan.order, chapter);
      createdChapter = true;
    }

    const projectContext = buildProjectContextPack({
      currentChapterId: chapter.id,
      chapters: project.chapters,
      characters: project.characters,
      worldEntries: project.worldEntries,
      foreshadows: project.foreshadows,
      plotThreads: project.plotThreads,
    });
    const prompt = buildFirstThreeRewritePrompt({
      projectTitle: project.title,
      genre: project.genre,
      sellingPoint: project.sellingPoint,
      platform,
      startTactic,
      projectContext,
      platformKnowledge,
      targetWords: body.targetWords ?? 1600,
      chapter: {
        order: chapter.order,
        title: chapter.title,
        content: chapter.content,
        goal: chapter.goal,
        hook: chapter.hook,
        conflict: chapter.conflict,
        valueShift: chapter.valueShift,
        cliffhanger: chapter.cliffhanger,
      },
      plan,
    });

    const task = await prisma.aiTask.create({
      data: {
        projectId: project.id,
        chapterId: chapter.id,
        taskType: "first_three_rewrite",
        providerConfigId: provider.id,
        model: provider.defaultModel,
        status: "running",
        inputSnapshot: JSON.stringify({ prompt, plan, startTactic }),
      },
    });

    try {
      const generated = await adapter.generate({
        providerId: provider.providerId as ModelProviderId,
        model: provider.defaultModel,
        systemPrompt: prompt.systemPrompt,
        userPrompt: prompt.userPrompt,
        temperature: 0.78,
        maxTokens: 3200,
      });
      const wordCount = countWords(generated.text);

      const [updatedTask, updatedChapter, rollbackRevision] = await prisma.$transaction(async (tx) => {
        const savedTask = await tx.aiTask.update({
          where: { id: task.id },
          data: {
            status: "succeeded",
            outputText: generated.text,
            inputTokens: generated.usage?.inputTokens,
            outputTokens: generated.usage?.outputTokens,
            costUsd: generated.usage?.costUsd,
          },
        });
        const savedRollbackRevision = await tx.chapterRevision.create({
          data: {
            chapterId: chapter.id,
            source: "first_three_rewrite_before_overwrite",
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
            notes: createdChapter ? "前三章改写创建章节后的空白快照。" : "前三章处方改写前自动保存。",
          },
        });
        const savedChapter = await tx.chapter.update({
          where: { id: chapter.id },
          data: {
            ...fields,
            content: generated.text,
            wordCount,
            status: "draft",
          },
        });
        return [savedTask, savedChapter, savedRollbackRevision];
      });

      chaptersByOrder.set(plan.order, updatedChapter);
      results.push({
        order: plan.order,
        createdChapter,
        task: updatedTask,
        chapter: updatedChapter,
        content: generated.text,
        rollbackRevisionId: rollbackRevision.id,
        evaluation: buildFirstThreeRewriteEvaluation({
          platform,
          before: chapter,
          after: updatedChapter,
          projectContext,
          startTactic,
        }),
      });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unknown first-three rewrite error";
      const failedTask = await prisma.aiTask.update({
        where: { id: task.id },
        data: {
          status: "failed",
          errorMessage: message,
        },
      });

      return NextResponse.json({
        rewritePackage,
        activeProvider: {
          id: provider.id,
          providerId: provider.providerId,
          displayName: provider.displayName,
          model: provider.defaultModel,
        },
        results,
        failedTask,
        error: message,
      }, { status: 500 });
    }
  }

  const allChapters = await prisma.chapter.findMany({
    where: { projectId: project.id },
    select: { wordCount: true },
  });
  await prisma.project.update({
    where: { id: project.id },
    data: {
      currentWordCount: allChapters.reduce((sum, chapter) => sum + chapter.wordCount, 0),
    },
  });

  return NextResponse.json({
    rewritePackage,
    activeProvider: {
      id: provider.id,
      providerId: provider.providerId,
      displayName: provider.displayName,
      model: provider.defaultModel,
    },
    results,
  });
}
