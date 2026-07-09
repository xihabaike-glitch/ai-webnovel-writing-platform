import { NextResponse } from "next/server";
import { buildReviewPipelineQueue } from "@/lib/ai/batchReviewPipeline";
import { ChapterGenerationFailureError, mapBatchChapterGenerationError } from "@/lib/ai/chapterGenerationHttp";
import { generateChapterDraft } from "@/lib/ai/chapterDraftGeneration";
import { reviewChapterDraft } from "@/lib/ai/chapterReviewGeneration";
import { generateChapterSecondPass } from "@/lib/ai/chapterSecondPassGeneration";
import { prisma } from "@/lib/db/prisma";
import { buildBatchRouteEffectSummary } from "@/lib/model-gateway/batchRouteEffectSummary";
import { buildModelRoleMatrix, buildModelRoleMatrixPriorityBlocker } from "@/lib/model-gateway/modelRoleMatrix";
import { buildRouteConfirmationRecheckEvidenceFromDispatchTasks } from "@/lib/model-gateway/routeConfirmation";
import { buildBatchExecutionSafety } from "@/lib/projects/batchExecutionSafety";
import { getBatchExecutionStrategy } from "@/lib/projects/batchExecutionStrategy";
import { findProjectStartTacticSummary } from "@/lib/projects/projectStartTactics";
import {
  buildTaskQueueBatchGateActionReceipt,
  buildTaskQueueBatchReceipt,
  taskQueueBatchMaxSizeForContext,
  taskQueueBatchExecutionContext,
} from "@/lib/projects/taskQueueBatchReceipt";
import {
  buildTaskQueueBatchHealthReview,
  buildTaskQueueBatchRhythmDecision,
  buildTaskQueueBatchRhythmRecheckGate,
} from "@/lib/projects/taskQueueBatchHealth";
import { buildTaskQueueCenter, type TaskQueueProject } from "@/lib/projects/taskQueueCenter";
import { buildTaskQueueExecutionPlan } from "@/lib/projects/taskQueueExecutionPlan";
import {
  applyRecommendedBatchModelRouteGate,
  buildRecommendedBatchModelRouteGate,
  buildRecommendedBatchModelRouteGateAfterAudit,
} from "@/lib/projects/recommendedBatchModelRouteGate";

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
  const requestUrl = new URL(request.url);
  const strategy = getBatchExecutionStrategy(requestUrl.searchParams.get("strategy"));
  const executionContext = taskQueueBatchExecutionContext(requestUrl.searchParams.get("context"));
  const sourceDispatchKey = requestUrl.searchParams.get("sourceDispatchKey")?.trim() ?? "";
  const [
    projects,
    modelProviders,
    modelRoutes,
    completedRouteConfirmationRechecks,
    activeRouteConfirmationRechecks,
    recentRecommendedBatchAudits,
  ] = await Promise.all([
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
        exportPackageSnapshots: { orderBy: { createdAt: "desc" }, take: 120 },
        submissionAssets: { orderBy: { updatedAt: "desc" } },
        submissionAssetVersions: { orderBy: { createdAt: "desc" }, take: 80 },
        platformPublishMetrics: { orderBy: { snapshotDate: "desc" }, take: 80 },
        gateActionAudits: {
          where: { executionType: { in: ["platform_strategy", "export_version"] } },
          orderBy: { createdAt: "desc" },
          take: 80,
          select: {
            actionId: true,
            executionType: true,
            status: true,
            succeededCount: true,
            failedCount: true,
            taskId: true,
            platformId: true,
            label: true,
            message: true,
            createdAt: true,
          },
        },
        gateDispatchTasks: {
          where: {
            OR: [
              { dispatchKey: { startsWith: "first-day:" } },
              { dispatchKey: { startsWith: "first-three-adoption:" } },
            ],
          },
          select: {
            dispatchKey: true,
            stage: true,
            state: true,
            title: true,
            detail: true,
            actionLabel: true,
            href: true,
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
    prisma.gateDispatchTask.findMany({
      where: {
        stage: "model_route_confirmation_recheck",
        state: { not: "completed" },
      },
      orderBy: { reviewLatestAt: "desc" },
      take: 40,
      select: {
        dispatchKey: true,
        stage: true,
        state: true,
        title: true,
        detail: true,
        actionLabel: true,
        href: true,
        priorityScore: true,
        reviewLatestAt: true,
        evidence: true,
      },
    }),
    prisma.gateActionAudit.findMany({
      where: { executionType: "recommended_batch" },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        receiptId: true,
        actionId: true,
        projectId: true,
        label: true,
        detail: true,
        href: true,
        executionType: true,
        status: true,
        message: true,
        succeededCount: true,
        failedCount: true,
        taskId: true,
        platformId: true,
        platformName: true,
        recheckStatus: true,
        recheckLabel: true,
        recheckDetail: true,
        recheckAction: true,
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
  const modelRoleMatrix = buildModelRoleMatrix(modelProviders.map((provider) => ({
    id: provider.id,
    providerId: provider.providerId,
    displayName: provider.displayName,
    encryptedApiKey: provider.encryptedApiKey,
    defaultModel: provider.defaultModel,
    enabled: provider.enabled,
    maxContextTokens: provider.maxContextTokens,
  })));
  const modelRolePriorityBlocker = buildModelRoleMatrixPriorityBlocker(modelRoleMatrix);
  const batchRhythmSourceTask = executionContext === "batch_rhythm_recheck"
    ? await prisma.gateDispatchTask.findUnique({
      where: { dispatchKey: sourceDispatchKey },
      select: {
        dispatchKey: true,
        title: true,
        state: true,
        completionEvidence: true,
      },
    })
    : null;
  if (executionContext === "batch_rhythm_recheck") {
    if (!sourceDispatchKey || !sourceDispatchKey.startsWith("batch-rhythm:")) {
      return NextResponse.json({ error: "缺少有效的节奏派单来源，不能执行节奏复验小批。" }, { status: 400 });
    }
    if (!batchRhythmSourceTask || batchRhythmSourceTask.state !== "completed" || !batchRhythmSourceTask.completionEvidence.trim()) {
      return NextResponse.json({ error: "节奏派单还没有完成验收依据，先回派单中心补齐后再复验。" }, { status: 409 });
    }
    const batchRhythmReview = buildTaskQueueBatchHealthReview(recentRecommendedBatchAudits, 5);
    const recheckGate = buildTaskQueueBatchRhythmRecheckGate(batchRhythmReview);
    if (!recheckGate.canRun) {
      return NextResponse.json({
        error: recheckGate.message,
        rhythmDecision: buildTaskQueueBatchRhythmDecision(batchRhythmReview),
        recheckGate,
      }, { status: 409 });
    }
  }
  const batchRhythmSource = batchRhythmSourceTask
    ? {
      dispatchKey: batchRhythmSourceTask.dispatchKey,
      title: batchRhythmSourceTask.title,
      completionEvidence: batchRhythmSourceTask.completionEvidence.trim(),
    }
    : null;
  const basePlan = buildTaskQueueExecutionPlan(
    queue.items,
    taskQueueBatchMaxSizeForContext(executionContext, strategy.maxBatchSize),
    strategy,
  );

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
    routeConfirmationRecheckDispatches: activeRouteConfirmationRechecks.map((task) => ({
      ...task,
      reviewLatestAt: task.reviewLatestAt.toISOString(),
    })),
    recommendedBatchAudits: recentRecommendedBatchAudits,
  });
  const plan = applyRecommendedBatchModelRouteGate(basePlan, modelRouteGate);

  if (!plan.canRun || modelRouteGate.status === "block") {
    return NextResponse.json({ error: modelRouteGate.headline, plan, safety, modelRouteGate }, { status: 429 });
  }
  if (!safety.canRunRecommendedBatch) {
    return NextResponse.json({ error: safety.warnings[0] ?? "批量安全阀未通过。", plan, safety, modelRouteGate }, { status: 429 });
  }
  if (modelRolePriorityBlocker?.tone === "blocked") {
    return NextResponse.json({ error: modelRolePriorityBlocker.detail, plan, safety, modelRouteGate, modelRoleMatrix, modelRoleBlocker: modelRolePriorityBlocker }, { status: 429 });
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
    try {
      if (plan.category === "draft") {
        const result = await generateChapterDraft({ chapterId });
        if ("error" in result) throw new ChapterGenerationFailureError(result);
        results.push({
          chapterId,
          status: "succeeded",
          taskId: result.task.id,
          chapterTitle: result.chapter.title,
          error: null,
          providerName: result.provider.displayName,
          model: result.provider.model,
          role: roleFor(result, result.task.id),
          inputTokens: result.task.inputTokens,
          outputTokens: result.task.outputTokens,
          costUsd: result.task.costUsd,
          qualityScore: result.draftQuality.score,
        });
        continue;
      }

      if (plan.category === "review") {
        const result = await reviewChapterDraft(chapterId);
        if ("error" in result) throw new ChapterGenerationFailureError(result);
        results.push({
          chapterId,
          status: "succeeded",
          taskId: result.task.id,
          chapterTitle: result.chapter.title,
          error: null,
          providerName: result.provider.displayName,
          model: result.provider.model,
          role: roleFor(result, result.task.id),
          inputTokens: result.task.inputTokens,
          outputTokens: result.task.outputTokens,
          costUsd: result.task.costUsd,
          qualityScore: result.result.score,
        });
        continue;
      }

      const candidate = secondPassCandidates.get(chapterId);
      const result = await generateChapterSecondPass({
        chapterId,
        instruction: candidate?.instruction ?? "按审稿意见强化钩子、冲突、爽点和章末追读。",
        mode: candidate?.secondPassMode,
      });
      if ("error" in result) throw new ChapterGenerationFailureError(result);
      results.push({
        chapterId,
        status: "succeeded",
        taskId: result.task.id,
        chapterTitle: result.chapter.title,
        error: null,
        providerName: result.activeProvider.displayName,
        model: result.activeProvider.model,
        role: roleFor(result, result.task.id),
        inputTokens: result.task.inputTokens,
        outputTokens: result.task.outputTokens,
        costUsd: result.task.costUsd,
        qualityScore: result.secondPassAudit.score,
      });
    } catch (error) {
      const mapped = mapBatchChapterGenerationError(error, {
        chapterId,
        requestedCount: plan.chapterIds.length,
        completedResults: results,
      });
      return NextResponse.json({
        ...mapped.body,
        plan,
        safety,
        modelRouteGate,
      }, { status: mapped.status });
    }
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
    executionContext,
    batchRhythmSource,
  });
  const gateReceipt = buildTaskQueueBatchGateActionReceipt({
    plan,
    results,
    routeEffectSummary,
    batchReceipt,
    strategyId: strategy.id,
    executionContext,
    batchRhythmSource,
  });
  const completedRecommendedBatchAudit = {
    receiptId: gateReceipt.receipt.id,
    projectId: plan.projectIds.length === 1 ? plan.projectId : null,
    executionType: gateReceipt.receipt.executionType,
    status: gateReceipt.receipt.status,
    succeededCount: gateReceipt.receipt.succeededCount,
    failedCount: gateReceipt.receipt.failedCount,
    payload: JSON.stringify(gateReceipt.payload),
    createdAt: new Date(gateReceipt.receipt.createdAt),
  };
  await prisma.gateActionAudit.upsert({
    where: { receiptId: gateReceipt.receipt.id },
    create: {
      receiptId: completedRecommendedBatchAudit.receiptId,
      actionId: gateReceipt.receipt.actionId,
      projectId: completedRecommendedBatchAudit.projectId,
      platformId: gateReceipt.receipt.platformId ?? "",
      platformName: gateReceipt.receipt.platformName ?? "",
      label: gateReceipt.receipt.label,
      detail: gateReceipt.receipt.detail,
      href: gateReceipt.receipt.href,
      status: completedRecommendedBatchAudit.status,
      message: gateReceipt.receipt.message,
      executionType: completedRecommendedBatchAudit.executionType,
      succeededCount: completedRecommendedBatchAudit.succeededCount,
      failedCount: completedRecommendedBatchAudit.failedCount,
      taskId: gateReceipt.receipt.taskId,
      recheckStatus: gateReceipt.receipt.recheck.status,
      recheckLabel: gateReceipt.receipt.recheck.label,
      recheckDetail: gateReceipt.receipt.recheck.detail,
      recheckAction: gateReceipt.receipt.recheck.actionLabel,
      payload: completedRecommendedBatchAudit.payload,
      createdAt: completedRecommendedBatchAudit.createdAt,
    },
    update: {
      actionId: gateReceipt.receipt.actionId,
      projectId: completedRecommendedBatchAudit.projectId,
      platformId: gateReceipt.receipt.platformId ?? "",
      platformName: gateReceipt.receipt.platformName ?? "",
      label: gateReceipt.receipt.label,
      detail: gateReceipt.receipt.detail,
      href: gateReceipt.receipt.href,
      status: completedRecommendedBatchAudit.status,
      message: gateReceipt.receipt.message,
      executionType: completedRecommendedBatchAudit.executionType,
      succeededCount: completedRecommendedBatchAudit.succeededCount,
      failedCount: completedRecommendedBatchAudit.failedCount,
      taskId: gateReceipt.receipt.taskId,
      recheckStatus: gateReceipt.receipt.recheck.status,
      recheckLabel: gateReceipt.receipt.recheck.label,
      recheckDetail: gateReceipt.receipt.recheck.detail,
      recheckAction: gateReceipt.receipt.recheck.actionLabel,
      payload: completedRecommendedBatchAudit.payload,
    },
  });
  const postRunModelRouteGate = buildRecommendedBatchModelRouteGateAfterAudit({
    plan: basePlan,
    projects,
    providers: modelProviders,
    routes: modelRoutes,
    routeConfirmationRechecks: buildRouteConfirmationRecheckEvidenceFromDispatchTasks(completedRouteConfirmationRechecks),
    routeConfirmationRecheckDispatches: activeRouteConfirmationRechecks.map((task) => ({
      ...task,
      reviewLatestAt: task.reviewLatestAt.toISOString(),
    })),
    recommendedBatchAudits: recentRecommendedBatchAudits,
    completedAudit: completedRecommendedBatchAudit,
  });

  return NextResponse.json({
    plan,
    safety,
    modelRouteGate: postRunModelRouteGate,
    results,
    routeEffectSummary,
    batchReceipt,
    gateReceipt: gateReceipt.receipt,
    executionContext,
    batchRhythmSource,
  });
}
