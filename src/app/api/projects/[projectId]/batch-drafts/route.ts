import { NextResponse } from "next/server";
import { z } from "zod";
import type { Project } from "@prisma/client";
import { buildBatchDraftQueue, type BatchDraftQueue } from "@/lib/ai/batchDrafts";
import { buildBatchRunGuard } from "@/lib/ai/batchRunGuard";
import { generateChapterDraft } from "@/lib/ai/chapterDraftGeneration";
import { buildModelBudgetGuard } from "@/lib/ai/modelBudget";
import { prisma } from "@/lib/db/prisma";
import { getActiveModelProvider } from "@/lib/model-gateway/activeProvider";
import { buildRouteRecommendations } from "@/lib/model-gateway/routeRecommendations";
import { getPlatformProfile, type PlatformId } from "@/lib/platforms/platformProfiles";

interface Params {
  params: Promise<{ projectId: string }>;
}

const batchDraftSchema = z.object({
  chapterIds: z.array(z.string().min(1)).min(1).max(5),
  targetWords: z.number().int().min(500).max(5000).default(1200),
});

async function getQueue(projectId: string, targetPlatform: string) {
  const chapters = await prisma.chapter.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
  });
  const tasks = await prisma.aiTask.findMany({
    where: {
      projectId,
      taskType: "chapter_draft",
    },
    select: {
      chapterId: true,
      status: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const platform = getPlatformProfile(targetPlatform as PlatformId);
  return buildBatchDraftQueue(chapters, tasks, platform);
}

async function activeProviderView() {
  const { provider } = await getActiveModelProvider("chapter_draft");
  return {
    providerId: provider.providerId,
    displayName: provider.displayName,
    model: provider.defaultModel,
    enabled: provider.enabled,
    hasApiKey: Boolean(provider.encryptedApiKey),
    baseUrl: provider.baseUrl,
  };
}

async function getRecentBudgetTasks(projectId: string) {
  return prisma.aiTask.findMany({
    where: { projectId },
    select: {
      taskType: true,
      status: true,
      inputTokens: true,
      outputTokens: true,
      costUsd: true,
    },
    take: 500,
    orderBy: { createdAt: "desc" },
  });
}

async function getRouteRecommendation(projectId: string) {
  const [tasks, routes, providers] = await Promise.all([
    prisma.aiTask.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        id: true,
        taskType: true,
        providerConfigId: true,
        status: true,
        inputTokens: true,
        outputTokens: true,
        costUsd: true,
        outputText: true,
      },
    }),
    prisma.modelTaskRoute.findMany({
      orderBy: { taskType: "asc" },
      select: {
        taskType: true,
        primaryProviderConfigId: true,
        fallbackProviderConfigId: true,
      },
    }),
    prisma.modelProvider.findMany({
      orderBy: [{ enabled: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        providerId: true,
        displayName: true,
        defaultModel: true,
        enabled: true,
        encryptedApiKey: true,
      },
    }),
  ]);

  return buildRouteRecommendations(tasks, routes, providers).find((recommendation) => recommendation.taskType === "chapter_draft") ?? null;
}

function buildBudgetPreview(
  project: Project,
  queue: BatchDraftQueue,
  recentTasks: Awaited<ReturnType<typeof getRecentBudgetTasks>>,
) {
  const suggestedBatchSize = queue.recommendedChapterIds.length || Math.min(queue.readyCandidates, 5) || 1;
  return buildModelBudgetGuard({
    settings: project,
    tasks: recentTasks,
    taskType: "chapter_draft",
    batchSize: suggestedBatchSize,
  });
}

export async function GET(_request: Request, { params }: Params) {
  const { projectId } = await params;
  const project = await prisma.project.findUnique({ where: { id: projectId } });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const queue = await getQueue(projectId, project.targetPlatform);
  const recentTasks = await getRecentBudgetTasks(projectId);

  return NextResponse.json({
    queue,
    activeProvider: await activeProviderView(),
    budgetPreview: buildBudgetPreview(project, queue, recentTasks),
    routeRecommendation: await getRouteRecommendation(projectId),
  });
}

export async function POST(request: Request, { params }: Params) {
  const { projectId } = await params;
  const project = await prisma.project.findUnique({ where: { id: projectId } });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const parsed = batchDraftSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid batch draft request" }, { status: 400 });
  }

  const input = parsed.data;
  const queue = await getQueue(projectId, project.targetPlatform);
  const candidateById = new Map(queue.candidates.map((candidate) => [candidate.chapterId, candidate]));
  const rejected = input.chapterIds
    .map((chapterId) => candidateById.get(chapterId))
    .filter((candidate) => !candidate || candidate.status !== "ready");

  if (rejected.length > 0) {
    return NextResponse.json({
      error: "Some chapters are not ready for batch draft generation",
      rejected,
      queue,
    }, { status: 400 });
  }

  const recentTasks = await getRecentBudgetTasks(projectId);
  const guard = buildBatchRunGuard({
    action: "draft",
    batchSize: input.chapterIds.length,
    targetWords: input.targetWords,
    tasks: recentTasks,
  });
  if (!guard.allowed) {
    return NextResponse.json({
      error: guard.summary,
      guard,
      queue,
      activeProvider: await activeProviderView(),
      budgetPreview: buildBudgetPreview(project, queue, recentTasks),
      routeRecommendation: await getRouteRecommendation(projectId),
    }, { status: 429 });
  }
  const budgetGuard = buildModelBudgetGuard({
    settings: project,
    tasks: recentTasks,
    taskType: "chapter_draft",
    batchSize: input.chapterIds.length,
  });
  if (!budgetGuard.allowed) {
    return NextResponse.json({
      error: budgetGuard.summary,
      budgetGuard,
      queue,
      activeProvider: await activeProviderView(),
      budgetPreview: buildBudgetPreview(project, queue, recentTasks),
      routeRecommendation: await getRouteRecommendation(projectId),
    }, { status: 429 });
  }

  const results = [];
  for (const chapterId of input.chapterIds) {
    const result = await generateChapterDraft({
      chapterId,
      targetWords: input.targetWords,
    });

    results.push({
      chapterId,
      status: "error" in result ? "failed" : "succeeded",
      chapterTitle: result.chapter.title,
      taskId: result.task.id,
      wordCount: "error" in result ? result.chapter.wordCount : result.chapter.wordCount,
      draftQualityScore: "error" in result ? null : result.draftQuality.score,
      shouldSecondPass: "error" in result ? false : result.draftQuality.shouldSecondPass,
      error: "error" in result ? result.error : null,
    });
  }

  const nextQueue = await getQueue(projectId, project.targetPlatform);
  const nextRecentTasks = await getRecentBudgetTasks(projectId);

  return NextResponse.json({
    results,
    queue: nextQueue,
    activeProvider: await activeProviderView(),
    budgetPreview: buildBudgetPreview(project, nextQueue, nextRecentTasks),
    routeRecommendation: await getRouteRecommendation(projectId),
  });
}
