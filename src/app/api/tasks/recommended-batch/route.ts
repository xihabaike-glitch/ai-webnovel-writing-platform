import { NextResponse } from "next/server";
import { buildReviewPipelineQueue } from "@/lib/ai/batchReviewPipeline";
import { generateChapterDraft } from "@/lib/ai/chapterDraftGeneration";
import { reviewChapterDraft } from "@/lib/ai/chapterReviewGeneration";
import { generateChapterSecondPass } from "@/lib/ai/chapterSecondPassGeneration";
import { prisma } from "@/lib/db/prisma";
import { buildBatchRouteEffectSummary } from "@/lib/model-gateway/batchRouteEffectSummary";
import { buildBatchExecutionSafety } from "@/lib/projects/batchExecutionSafety";
import { getBatchExecutionStrategy } from "@/lib/projects/batchExecutionStrategy";
import { findProjectStartTacticSummary } from "@/lib/projects/projectStartTactics";
import { buildTaskQueueBatchGateActionReceipt, buildTaskQueueBatchReceipt } from "@/lib/projects/taskQueueBatchReceipt";
import { buildTaskQueueCenter } from "@/lib/projects/taskQueueCenter";
import { buildTaskQueueExecutionPlan } from "@/lib/projects/taskQueueExecutionPlan";

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

export async function POST(request: Request) {
  const strategy = getBatchExecutionStrategy(new URL(request.url).searchParams.get("strategy"));
  const projects = await prisma.project.findMany({
    include: {
      chapters: { orderBy: { order: "asc" } },
      aiTasks: { orderBy: { createdAt: "desc" } },
      worldEntries: { orderBy: [{ type: "asc" }, { createdAt: "asc" }] },
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
  });
  const queue = buildTaskQueueCenter(projects);
  const safety = buildBatchExecutionSafety(queue.items, projects, strategy);
  const plan = buildTaskQueueExecutionPlan(queue.items, strategy.maxBatchSize, strategy);

  if (!plan.canRun || !plan.category || !plan.projectId || plan.projectIds.length === 0) {
    return NextResponse.json({ error: plan.detail, plan, safety }, { status: 400 });
  }
  if (!safety.canRunRecommendedBatch) {
    return NextResponse.json({ error: safety.warnings[0] ?? "批量安全阀未通过。", plan, safety }, { status: 429 });
  }

  const projectsById = new Map(projects.map((item) => [item.id, item]));
  const missingProject = plan.projectIds.find((projectId) => !projectsById.has(projectId));
  if (missingProject) {
    return NextResponse.json({ error: "Project not found", plan, safety }, { status: 404 });
  }

  const secondPassCandidates = new Map<string, ReturnType<typeof buildReviewPipelineQueue>["candidates"][number]>();
  if (plan.category === "second_pass") {
    for (const projectId of plan.projectIds) {
      const project = projectsById.get(projectId);
      if (!project) continue;
      const startTactic = findProjectStartTacticSummary(project.worldEntries);
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
    results,
    routeEffectSummary,
    batchReceipt,
    gateReceipt: gateReceipt.receipt,
  });
}
