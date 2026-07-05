import { NextResponse } from "next/server";
import { buildFirstThreeRewritePrompt } from "@/lib/ai/buildFirstThreeRewritePrompt";
import { buildStoryTreeExperienceGuide } from "@/lib/ai/storyTreeExperience";
import { prisma } from "@/lib/db/prisma";
import { getActiveModelProvider } from "@/lib/model-gateway/activeProvider";
import type { ModelProviderId } from "@/lib/model-gateway/types";
import { getPlatformProfile, type PlatformId } from "@/lib/platforms/platformProfiles";
import { buildProjectContextPack } from "@/lib/projects/projectContextPack";
import { buildFirstThreeRewriteEvaluation, buildFirstThreeRewritePackage, normalizeFirstThreeRewriteOrders } from "@/lib/projects/firstThreeRewrite";
import { buildPlatformPublishExportCenter, parsePublishSnapshotTags } from "@/lib/projects/platformPublishExport";
import { gatePlatformDispatchTaskFromRecord } from "@/lib/projects/gateDispatchTaskRecords";
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
  const requestedChapterOrders = normalizeFirstThreeRewriteOrders(body.chapterOrders, null);

  if (requestedChapterOrders.length === 0) {
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
      gateDispatchTasks: {
        where: {
          state: "completed",
          OR: [
            { dispatchKey: { startsWith: "story-tree:" } },
            { dispatchKey: { startsWith: "story-tree-experience:" } },
          ],
        },
        orderBy: { completedAt: "desc" },
        take: 30,
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const platform = getPlatformProfile((body.platformId ?? project.targetPlatform) as PlatformId);
  const startTactic = findProjectStartTacticSummary(project.worldEntries);
  const chapterOrders = normalizeFirstThreeRewriteOrders(requestedChapterOrders, startTactic);
  const storyTreeExperience = buildStoryTreeExperienceGuide(
    project.gateDispatchTasks.map(gatePlatformDispatchTaskFromRecord),
  );
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
      storyTreeExperience,
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

      const [updatedTask, candidateRevision] = await prisma.$transaction(async (tx) => {
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
        const savedCandidateRevision = await tx.chapterRevision.create({
          data: {
            chapterId: chapter.id,
            source: "first_three_rewrite_candidate",
            sourceTaskId: task.id,
            title: fields.title,
            content: generated.text,
            wordCount,
            goal: fields.goal,
            hook: fields.hook,
            conflict: fields.conflict,
            valueShift: fields.valueShift,
            cliffhanger: fields.cliffhanger,
            status: "draft",
            notes: createdChapter ? "前三章改写候选。新章节已建为空白稿，采纳后才写入正文。" : "前三章改写候选。采纳后才覆盖正文。",
          },
        });
        return [savedTask, savedCandidateRevision];
      });

      const candidateChapter = {
        ...chapter,
        ...fields,
        content: generated.text,
        wordCount,
        status: "draft",
      };
      const evaluation = buildFirstThreeRewriteEvaluation({
        platform,
        before: chapter,
        after: candidateChapter,
        projectContext,
        startTactic,
      });
      results.push({
        order: plan.order,
        createdChapter,
        task: updatedTask,
        chapter: candidateChapter,
        content: generated.text,
        candidateRevisionId: candidateRevision.id,
        evaluation,
        storyTreeDispatches: [],
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
