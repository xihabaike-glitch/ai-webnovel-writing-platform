import { NextResponse } from "next/server";
import { buildReviewPipelineQueue } from "@/lib/ai/batchReviewPipeline";
import { generateChapterDraft } from "@/lib/ai/chapterDraftGeneration";
import { reviewChapterDraft } from "@/lib/ai/chapterReviewGeneration";
import { generateChapterSecondPass } from "@/lib/ai/chapterSecondPassGeneration";
import { prisma } from "@/lib/db/prisma";
import { buildBatchRouteEffectSummary } from "@/lib/model-gateway/batchRouteEffectSummary";
import { buildRouteConfirmationRecheckEvidenceFromDispatchTasks } from "@/lib/model-gateway/routeConfirmation";
import { buildBatchExecutionSafety } from "@/lib/projects/batchExecutionSafety";
import { getBatchExecutionStrategy } from "@/lib/projects/batchExecutionStrategy";
import { findProjectStartTacticSummary } from "@/lib/projects/projectStartTactics";
import { buildTaskQueueBatchGateActionReceipt, buildTaskQueueBatchReceipt } from "@/lib/projects/taskQueueBatchReceipt";
import { buildTaskQueueCenter, type TaskQueueProject } from "@/lib/projects/taskQueueCenter";
import { buildTaskQueueExecutionPlan } from "@/lib/projects/taskQueueExecutionPlan";
import { applyRecommendedBatchModelRouteGate, buildRecommendedBatchModelRouteGate } from "@/lib/projects/recommendedBatchModelRouteGate";

function roleFor(result: { attempts: Array<{ taskId: string; role: "primary" | "fallback" | "auto" | "forced" }> }, taskId: string) {
  return result.attempts.find((attempt) => attempt.taskId === taskId)?.role ?? null;
}

type RecommendedBatchResult = {
  chapterId: string;
  status: "succeeded" | "failed";
  taskId: string;
  chapterTitle: string;
  error: string | null;
  providerName: string;
  model: string;
  role: "primary" | "fallback" | "auto" | "forced" | null;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
  qualityScore: number | null;
};

function parseTaskQueueTags(value: string | string[] | null | undefined) {
  if (Array.isArray(value)) return value;
  return (value ?? "")
    .split(/[、,，\s]+/u)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function normalizeTaskQueueProjects<T extends {
  submissionAssets?: Array<{ tags: string | string[] | null }>;
  submissionAssetVersions?: Array<{ tags: string | string[] | null; auditStatus: string }>;
}>(projects: T[]): TaskQueueProject[] {
  return projects.map((project) => ({
    ...project,
    submissionAssets: project.submissionAssets?.map((asset) => ({
      ...asset,
      tags: parseTaskQueueTags(asset.tags),
    })) ?? [],
    submissionAssetVersions: project.submissionAssetVersions?.map((version) => ({
      ...version,
      tags: parseTaskQueueTags(version.tags),
      auditStatus: version.auditStatus === "ready" || version.auditStatus === "blocked" ? version.auditStatus : "needs_work",
    })) ?? [],
  })) as unknown as TaskQueueProject[];
}

export async function POST(request: Request) {
  const strategy = getBatchExecutionStrategy(new URL(request.url).searchParams.get("strategy"));
  const [projects, modelProviders, modelRoutes, completedRouteConfirmationRechecks, recentRecommendedBatchAudits] = await Promise.all([
    prisma.project.findMany({
      include: {
        chapters: {
          orderBy: { order: "asc" },
          include: {
            revisions: {
              orderBy: { createdAt: "desc" },
              take: 5,
            },
          },
        },
        aiTasks: {
          orderBy: { createdAt: "desc" },
          include: {
            modelProvider: {
              select: {
                providerId: true,
                displayName: true,
              },
            },
          },
        },
        worldEntries: { orderBy: [{ type: "asc" }, { createdAt: "asc" }] },
        publishSnapshots: { orderBy: { createdAt: "desc" }, take: 80 },
        submissionAssets: { orderBy: { updatedAt: "desc" } },
        submissionAssetVersions: { orderBy: { createdAt: "desc" }, take: 80 },
        platformPublishMetrics: { orderBy: { snapshotDate: "desc" }, take: 80 },
        gateActionAudits: {
          where: { executionType: "platform_strategy" },
          orderBy: { createdAt: "desc" },
          take: 80,
          select: {
            actionId: true,
            executionType: true,
            status: true,
            succeededCount: true,
            taskId: true,
            platformId: true,
            createdAt: true,
          },
        },
        gateDispatchTasks: {
          where: { dispatchKey: { startsWith: "first-day:" } },
          select: {
            dispatchKey: true,
            state: true,
            completionEvidence: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.modelProvider.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.modelTaskRoute.findMany({ orderBy: { taskType: "asc" } }),
    prisma.gateDispatchTask.findMany({
      where: {
        stage: "model_route_confirmation_recheck",
        state: "completed",
      },
      orderBy: { completedAt: "desc" },
      take: 40,
      select: {
        dispatchKey: true,
        stage: true,
        state: true,
        completionEvidence: true,
        evidence: true,
        completedAt: true,
      },
    }),
    prisma.gateActionAudit.findMany({
      where: { executionType: "recommended_batch" },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        receiptId: true,
        projectId: true,
        executionType: true,
        status: true,
        succeededCount: true,
        failedCount: true,
        payload: true,
        createdAt: true,
      },
    }),
  ]);
  const taskQueueProjects = normalizeTaskQueueProjects(projects);
  const safetyProjects = projects.map((project) => ({
    aiTasks: project.aiTasks.map((task) => ({
      status: task.status,
      inputTokens: task.inputTokens ?? null,
      outputTokens: task.outputTokens ?? null,
      costUsd: task.costUsd ?? null,
    })),
  }));
  const queue = buildTaskQueueCenter(taskQueueProjects);
  const safety = buildBatchExecutionSafety(queue.items, safetyProjects, strategy);
  const basePlan = buildTaskQueueExecutionPlan(queue.items, strategy.maxBatchSize, strategy);

  if (!basePlan.canRun || !basePlan.category || !basePlan.projectId || basePlan.projectIds.length === 0) {
    return NextResponse.json({ error: basePlan.detail, plan: basePlan, safety }, { status: 400 });
  }
  const projectsById = new Map(taskQueueProjects.map((item) => [item.id, item]));
  const missingProject = basePlan.projectIds.find((projectId) => !projectsById.has(projectId));
  if (missingProject) {
    return NextResponse.json({ error: "Project not found", plan: basePlan, safety }, { status: 404 });
  }

  const modelRouteGate = buildRecommendedBatchModelRouteGate({
    plan: basePlan,
    projects,
    providers: modelProviders,
    routes: modelRoutes,
    routeConfirmationRechecks: buildRouteConfirmationRecheckEvidenceFromDispatchTasks(completedRouteConfirmationRechecks),
    recommendedBatchAudits: recentRecommendedBatchAudits,
  });
  const plan = applyRecommendedBatchModelRouteGate(basePlan, modelRouteGate);

  if (!plan.canRun || modelRouteGate.status === "block") {
    return NextResponse.json({ error: modelRouteGate.headline, plan, safety, modelRouteGate }, { status: 429 });
  }
  if (!safety.canRunRecommendedBatch) {
    return NextResponse.json({ error: safety.warnings[0] ?? "批量安全阀未通过。", plan, safety, modelRouteGate }, { status: 429 });
  }

  const secondPassCandidates = new Map<string, ReturnType<typeof buildReviewPipelineQueue>["candidates"][number]>();
  if (plan.category === "second_pass") {
    for (const projectId of plan.projectIds) {
      const project = projectsById.get(projectId);
      if (!project) continue;
      const startTactic = findProjectStartTacticSummary(project.worldEntries ?? []);
      for (const candidate of buildReviewPipelineQueue(project.chapters, project.aiTasks, 5, startTactic).candidates) {
        secondPassCandidates.set(candidate.chapterId, candidate);
      }
    }
  }
  const results: RecommendedBatchResult[] = [];

  for (const chapterId of plan.chapterIds) {
    if (plan.category === "draft") {
      const result = await generateChapterDraft({ chapterId });
      results.push({
        chapterId,
        status: "error" in result ? "failed" : "succeeded",
        taskId: result.task.id,
        chapterTitle: result.chapter.title,
        error: "error" in result ? result.error ?? null : null,
        providerName: result.provider.displayName,
        model: result.provider.model,
        role: roleFor(result, result.task.id),
        inputTokens: result.task.inputTokens,
        outputTokens: result.task.outputTokens,
        costUsd: result.task.costUsd,
        qualityScore: "error" in result ? null : result.draftQuality.score,
      });
      continue;
    }

    if (plan.category === "review") {
      const result = await reviewChapterDraft(chapterId);
      results.push({
        chapterId,
        status: "error" in result ? "failed" : "succeeded",
        taskId: result.task.id,
        chapterTitle: result.chapter.title,
        error: "error" in result ? result.error ?? null : null,
        providerName: result.provider.displayName,
        model: result.provider.model,
        role: roleFor(result, result.task.id),
        inputTokens: result.task.inputTokens,
        outputTokens: result.task.outputTokens,
        costUsd: result.task.costUsd,
        qualityScore: "error" in result ? null : result.result.score,
      });
      continue;
    }

    const candidate = secondPassCandidates.get(chapterId);
    const result = await generateChapterSecondPass({
      chapterId,
      instruction: candidate?.instruction ?? "按审稿意见强化钩子、冲突、爽点和章末追读。",
      mode: candidate?.secondPassMode,
    });
    results.push({
      chapterId,
      status: "error" in result ? "failed" : "succeeded",
      taskId: result.task.id,
      chapterTitle: result.chapter.title,
      error: "error" in result ? result.error ?? null : null,
      providerName: result.activeProvider.displayName,
      model: result.activeProvider.model,
      role: roleFor(result, result.task.id),
      inputTokens: result.task.inputTokens,
      outputTokens: result.task.outputTokens,
      costUsd: result.task.costUsd,
      qualityScore: "error" in result ? null : result.secondPassAudit.score,
    });
  }

  const routeEffectSummary = buildBatchRouteEffectSummary(results.map((result) => ({
    status: result.status as "succeeded" | "failed",
    taskId: result.taskId,
    providerName: result.providerName,
    model: result.model,
    role: result.role,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    costUsd: result.costUsd,
    qualityScore: result.qualityScore,
  })));
  const batchReceipt = buildTaskQueueBatchReceipt({
    plan,
    results,
    routeEffectSummary,
  });
  const gateReceipt = buildTaskQueueBatchGateActionReceipt({
    plan,
    results,
    routeEffectSummary,
    batchReceipt,
    strategyId: strategy.id,
  });
  await prisma.gateActionAudit.upsert({
    where: { receiptId: gateReceipt.receipt.id },
    create: {
      receiptId: gateReceipt.receipt.id,
      actionId: gateReceipt.receipt.actionId,
      projectId: plan.projectIds.length === 1 ? plan.projectId : null,
      platformId: gateReceipt.receipt.platformId ?? "",
      platformName: gateReceipt.receipt.platformName ?? "",
      label: gateReceipt.receipt.label,
      detail: gateReceipt.receipt.detail,
      href: gateReceipt.receipt.href,
      status: gateReceipt.receipt.status,
      message: gateReceipt.receipt.message,
      executionType: gateReceipt.receipt.executionType,
      succeededCount: gateReceipt.receipt.succeededCount,
      failedCount: gateReceipt.receipt.failedCount,
      taskId: gateReceipt.receipt.taskId,
      recheckStatus: gateReceipt.receipt.recheck.status,
      recheckLabel: gateReceipt.receipt.recheck.label,
      recheckDetail: gateReceipt.receipt.recheck.detail,
      recheckAction: gateReceipt.receipt.recheck.actionLabel,
      payload: JSON.stringify(gateReceipt.payload),
      createdAt: new Date(gateReceipt.receipt.createdAt),
    },
    update: {
      actionId: gateReceipt.receipt.actionId,
      projectId: plan.projectIds.length === 1 ? plan.projectId : null,
      platformId: gateReceipt.receipt.platformId ?? "",
      platformName: gateReceipt.receipt.platformName ?? "",
      label: gateReceipt.receipt.label,
      detail: gateReceipt.receipt.detail,
      href: gateReceipt.receipt.href,
      status: gateReceipt.receipt.status,
      message: gateReceipt.receipt.message,
      executionType: gateReceipt.receipt.executionType,
      succeededCount: gateReceipt.receipt.succeededCount,
      failedCount: gateReceipt.receipt.failedCount,
      taskId: gateReceipt.receipt.taskId,
      recheckStatus: gateReceipt.receipt.recheck.status,
      recheckLabel: gateReceipt.receipt.recheck.label,
      recheckDetail: gateReceipt.receipt.recheck.detail,
      recheckAction: gateReceipt.receipt.recheck.actionLabel,
      payload: JSON.stringify(gateReceipt.payload),
    },
  });

  return NextResponse.json({
    plan,
    safety,
    modelRouteGate,
    results,
    routeEffectSummary,
    batchReceipt,
    gateReceipt: gateReceipt.receipt,
  });
}
