import { NextResponse } from "next/server";
import { buildFirstThreeRewritePrompt } from "@/lib/ai/buildFirstThreeRewritePrompt";
import { mapChapterGenerationError, mapChapterGenerationFailure } from "@/lib/ai/chapterGenerationHttp";
import { buildStoryTreeExperienceGuide } from "@/lib/ai/storyTreeExperience";
import { prisma } from "@/lib/db/prisma";
import { runRoutedGeneration } from "@/lib/model-gateway/routedGeneration";
import { getPlatformProfile, type PlatformId } from "@/lib/platforms/platformProfiles";
import { buildProjectContextPack, upsertProjectContextChapter } from "@/lib/projects/projectContextPack";
import { buildFirstThreeRewriteEvaluation, buildFirstThreeRewritePackage, normalizeFirstThreeRewriteOrders } from "@/lib/projects/firstThreeRewrite";
import { buildPlatformPublishExportCenter, parsePublishSnapshotTags } from "@/lib/projects/platformPublishExport";
import { gatePlatformDispatchTaskFromRecord } from "@/lib/projects/gateDispatchTaskRecords";
import { findProjectStartTacticSummary } from "@/lib/projects/projectStartTactics";
import { buildSubmissionChecklist } from "@/lib/projects/submissionChecklist";
import { countWords } from "@/lib/text/wordCount";
import { getChapterOrderConflictContract } from "@/lib/chapters/chapterOrder";

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
            { dispatchKey: { startsWith: "first-day:" } },
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
  const chapterOrders = normalizeFirstThreeRewriteOrders(
    requestedChapterOrders,
    startTactic,
    project.gateDispatchTasks.map((task) => task.completionEvidence),
  );
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
    projectId: project.id,
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
  const chaptersByOrder = new Map(project.chapters.map((chapter) => [chapter.order, chapter]));
  let contextChapters = [...project.chapters].sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
  const results = [];
  let activeProvider: {
    id: string;
    providerId: string;
    displayName: string;
    model: string;
  } | null = null;

  for (const plan of rewritePackage.chapterPlans.filter((item) => chapterOrders.includes(item.order))) {
    const fields = planToChapterFields(plan);
    let chapter = chaptersByOrder.get(plan.order);
    let createdChapter = false;

    if (!chapter) {
      try {
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
      } catch (error) {
        const conflict = getChapterOrderConflictContract(error);
        if (conflict) {
          const { status, ...responseBody } = conflict;
          return NextResponse.json(responseBody, { status });
        }
        throw error;
      }
      chaptersByOrder.set(plan.order, chapter);
      createdChapter = true;
    }

    contextChapters = upsertProjectContextChapter(contextChapters, chapter);

    const projectContext = buildProjectContextPack({
      currentChapterId: chapter.id,
      chapters: contextChapters,
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

    let generation;
    try {
      generation = await runRoutedGeneration({
        projectId: project.id,
        chapterId: chapter.id,
        taskType: "first_three_rewrite",
        inputSnapshot: { prompt, plan, startTactic },
        request: {
          systemPrompt: prompt.systemPrompt,
          userPrompt: prompt.userPrompt,
          temperature: 0.78,
          maxTokens: 3200,
        },
        persistSuccess: async ({ transaction, result, task }) => {
          const wordCount = countWords(result.text);
          const candidateRevision = await transaction.chapterRevision.create({
            data: {
              chapterId: chapter.id,
              source: "first_three_rewrite_candidate",
              sourceTaskId: task.id,
              title: fields.title,
              content: result.text,
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
          return { candidateRevision, wordCount };
        },
      });
    } catch (caught) {
      const mapped = mapChapterGenerationError(caught, "Unknown first-three rewrite error");
      return NextResponse.json(mapped.body, { status: mapped.status });
    }

    const providerView = {
      id: generation.provider.id,
      providerId: generation.provider.providerId,
      displayName: generation.provider.displayName,
      model: generation.provider.defaultModel,
    };
    activeProvider ??= providerView;

    if (!generation.ok) {
      const mapped = mapChapterGenerationFailure(generation);
      return NextResponse.json({
        rewritePackage,
        activeProvider: providerView,
        results,
        failedTask: generation.task,
        ...mapped.body,
      }, { status: mapped.status });
    }

    const { candidateRevision, wordCount } = generation.persistence;
    const candidateChapter = {
      ...chapter,
      ...fields,
      content: generation.result.text,
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
      task: generation.task,
      chapter: candidateChapter,
      content: generation.result.text,
      candidateRevisionId: candidateRevision.id,
      evaluation,
      storyTreeDispatches: [],
    });
  }

  return NextResponse.json({
    rewritePackage,
    activeProvider,
    results,
  });
}
