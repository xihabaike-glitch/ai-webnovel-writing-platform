import { NextResponse } from "next/server";
import { z } from "zod";
import type { Project } from "@prisma/client";
import { buildReviewPipelineQueue, type ReviewPipelineQueue } from "@/lib/ai/batchReviewPipeline";
import { buildBatchRunGuard } from "@/lib/ai/batchRunGuard";
import { generateChapterSecondPass } from "@/lib/ai/chapterSecondPassGeneration";
import { reviewChapterDraft } from "@/lib/ai/chapterReviewGeneration";
import { buildModelBudgetGuard } from "@/lib/ai/modelBudget";
import { prisma } from "@/lib/db/prisma";
import { getActiveModelProvider } from "@/lib/model-gateway/activeProvider";
import { buildRouteRecommendations } from "@/lib/model-gateway/routeRecommendations";

interface Params {
  params: Promise<{ projectId: string }>;
}

const batchReviewSchema = z.object({
  action: z.enum(["review", "second_pass"]),
  chapterIds: z.array(z.string().min(1)).min(1).max(5),
  targetWords: z.number().int().min(500).max(6000).optional(),
});

async function getQueue(projectId: string) {
  const chapters = await prisma.chapter.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
  });
  const tasks = await prisma.aiTask.findMany({
    where: {
      projectId,
      taskType: { in: ["chapter_review", "chapter_second_pass"] },
    },
    orderBy: { createdAt: "desc" },
  });

  return buildReviewPipelineQueue(chapters, tasks);
}

async function activeProviderView() {
  const { provider } = await getActiveModelProvider();
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

async function getRouteRecommendations(projectId: string) {
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
  const recommendations = buildRouteRecommendations(tasks, routes, providers);

  return {
    reviewRouteRecommendation: recommendations.find((recommendation) => recommendation.taskType === "chapter_review") ?? null,
    secondPassRouteRecommendation: recommendations.find((recommendation) => recommendation.taskType === "chapter_second_pass") ?? null,
  };
}

function buildBudgetPreviews(
  project: Project,
  queue: ReviewPipelineQueue,
  recentTasks: Awaited<ReturnType<typeof getRecentBudgetTasks>>,
) {
  const reviewBatchSize = queue.recommendedReviewChapterIds.length || Math.min(queue.reviewReadyCount, 5) || 1;
  const secondPassBatchSize = queue.recommendedSecondPassChapterIds.length || Math.min(queue.secondPassReadyCount, 5) || 1;

  return {
    reviewBudgetPreview: buildModelBudgetGuard({
      settings: project,
      tasks: recentTasks,
      taskType: "chapter_review",
      batchSize: reviewBatchSize,
    }),
    secondPassBudgetPreview: buildModelBudgetGuard({
      settings: project,
      tasks: recentTasks,
      taskType: "chapter_second_pass",
      batchSize: secondPassBatchSize,
    }),
  };
}

export async function GET(_request: Request, { params }: Params) {
  const { projectId } = await params;
  const project = await prisma.project.findUnique({ where: { id: projectId } });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const queue = await getQueue(projectId);
  const recentTasks = await getRecentBudgetTasks(projectId);

  return NextResponse.json({
    queue,
    activeProvider: await activeProviderView(),
    ...buildBudgetPreviews(project, queue, recentTasks),
    ...(await getRouteRecommendations(projectId)),
  });
}

export async function POST(request: Request, { params }: Params) {
  const { projectId } = await params;
  const project = await prisma.project.findUnique({ where: { id: projectId } });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const parsed = batchReviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid batch review request" }, { status: 400 });
  }

  const input = parsed.data;
  const queue = await getQueue(projectId);
  const candidateById = new Map(queue.candidates.map((candidate) => [candidate.chapterId, candidate]));
  const rejected = input.chapterIds
    .map((chapterId) => candidateById.get(chapterId))
    .filter((candidate) => !candidate || (
      input.action === "review"
        ? candidate.reviewStatus !== "ready"
        : candidate.secondPassStatus !== "ready"
    ));

  if (rejected.length > 0) {
    return NextResponse.json({
      error: "Some chapters are not ready for the selected batch action",
      rejected,
      queue,
    }, { status: 400 });
  }

  const recentTasks = await getRecentBudgetTasks(projectId);
  const guard = buildBatchRunGuard({
    action: input.action === "review" ? "review" : "second_pass",
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
      ...buildBudgetPreviews(project, queue, recentTasks),
      ...(await getRouteRecommendations(projectId)),
    }, { status: 429 });
  }
  const budgetGuard = buildModelBudgetGuard({
    settings: project,
    tasks: recentTasks,
    taskType: input.action === "review" ? "chapter_review" : "chapter_second_pass",
    batchSize: input.chapterIds.length,
  });
  if (!budgetGuard.allowed) {
    return NextResponse.json({
      error: budgetGuard.summary,
      budgetGuard,
      queue,
      activeProvider: await activeProviderView(),
      ...buildBudgetPreviews(project, queue, recentTasks),
      ...(await getRouteRecommendations(projectId)),
    }, { status: 429 });
  }

  const results = [];
  for (const chapterId of input.chapterIds) {
    const candidate = candidateById.get(chapterId);
    if (input.action === "review") {
      const result = await reviewChapterDraft(chapterId);
      results.push({
        chapterId,
        status: "error" in result ? "failed" : "succeeded",
        chapterTitle: result.chapter.title,
        taskId: result.task.id,
        score: "error" in result ? null : result.result.score,
        issueCount: "error" in result ? 0 : result.result.issues.length,
        error: "error" in result ? result.error : null,
      });
    } else {
      const result = await generateChapterSecondPass({
        chapterId,
        instruction: candidate?.instruction ?? "按审稿意见强化钩子、冲突、爽点和章末追读。",
        mode: candidate?.secondPassMode,
        targetWords: input.targetWords,
      });
      results.push({
        chapterId,
        status: "error" in result ? "failed" : "succeeded",
        chapterTitle: result.chapter.title,
        taskId: result.task.id,
        wordCount: result.chapter.wordCount,
        score: "error" in result ? null : result.secondPassAudit.score,
        issueCount: "error" in result ? 0 : result.secondPassAudit.issues.length,
        shouldSecondPass: "error" in result ? false : result.secondPassAudit.shouldSecondPass,
        error: "error" in result ? result.error : null,
      });
    }
  }

  const nextQueue = await getQueue(projectId);
  const nextRecentTasks = await getRecentBudgetTasks(projectId);

  return NextResponse.json({
    results,
    queue: nextQueue,
    activeProvider: await activeProviderView(),
    ...buildBudgetPreviews(project, nextQueue, nextRecentTasks),
    ...(await getRouteRecommendations(projectId)),
  });
}
