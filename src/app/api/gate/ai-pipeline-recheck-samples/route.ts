import { NextResponse } from "next/server";
import { z } from "zod";
import { buildReviewPipelineQueue } from "@/lib/ai/batchReviewPipeline";
import { ChapterGenerationFailureError, mapBatchChapterGenerationError } from "@/lib/ai/chapterGenerationHttp";
import { generateChapterDraft } from "@/lib/ai/chapterDraftGeneration";
import { reviewChapterDraft } from "@/lib/ai/chapterReviewGeneration";
import { generateChapterSecondPass } from "@/lib/ai/chapterSecondPassGeneration";
import { prisma } from "@/lib/db/prisma";
import { buildBatchRouteEffectSummary } from "@/lib/model-gateway/batchRouteEffectSummary";
import {
  buildAiPipelineRecheckGateActionReceipt,
  buildAiPipelineRecheckRecoveryDispatchPlan,
  buildAiPipelineRecheckNextAction,
} from "@/lib/projects/aiPipelineRecheckReceipt";
import { buildTaskQueueBatchReceipt, type TaskQueueBatchRunResult } from "@/lib/projects/taskQueueBatchReceipt";
import { buildTaskQueueCenter, type TaskQueueProject } from "@/lib/projects/taskQueueCenter";
import { buildTaskQueueExecutionPlan } from "@/lib/projects/taskQueueExecutionPlan";
import { findProjectStartTacticSummary } from "@/lib/projects/projectStartTactics";

const aiPipelineRecheckSchema = z.object({
  dispatch: z.record(z.string(), z.unknown()),
});

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function projectIdFromHref(href: string) {
  const match = href.match(/\/projects\/([^/#?]+)/);
  return match?.[1] ?? null;
}

function roleFor(result: { attempts: Array<{ taskId: string; role: "primary" | "fallback" | "auto" | "forced" }> }, taskId: string) {
  return result.attempts.find((attempt) => attempt.taskId === taskId)?.role ?? null;
}

function maxSampleCountForStage(stage: string) {
  if (stage === "ai_pipeline_small_batch") return 3;
  return 1;
}

function completionEvidenceFor(input: {
  receipt: ReturnType<typeof buildTaskQueueBatchReceipt>;
  plan: ReturnType<typeof buildTaskQueueExecutionPlan>;
}) {
  if (input.receipt.completionEvidenceTemplate) return input.receipt.completionEvidenceTemplate;
  return [
    "AI 写审改复检已完成：",
    `执行动作：${input.plan.actionLabel}`,
    `执行范围：${input.plan.detail}`,
    `通过线：成功率、质量、失败和成本已回收。`,
    `复查证据：${input.receipt.evidenceItems.join("；")}`,
    `放量结论：${input.receipt.status === "continue" ? "可以继续小批推进，不允许直接无限放量。" : "未通过，先处理质量、失败或成本问题。"}`,
  ].join("\n");
}

async function loadProject(projectId: string): Promise<TaskQueueProject | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
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
      aiTasks: { orderBy: { createdAt: "desc" } },
      worldEntries: { orderBy: [{ type: "asc" }, { createdAt: "asc" }] },
      gateDispatchTasks: {
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
      publishSnapshots: { orderBy: { createdAt: "desc" }, take: 80 },
      exportPackageSnapshots: { orderBy: { createdAt: "desc" }, take: 120 },
      submissionAssets: { orderBy: { updatedAt: "desc" } },
      submissionAssetVersions: { orderBy: { createdAt: "desc" }, take: 80 },
      platformPublishMetrics: { orderBy: { snapshotDate: "desc" }, take: 80 },
      gateActionAudits: {
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
          payload: true,
          createdAt: true,
        },
      },
    },
  });
  return project as unknown as TaskQueueProject | null;
}

async function runPlanItem(input: {
  category: NonNullable<ReturnType<typeof buildTaskQueueExecutionPlan>["category"]>;
  chapterId: string;
  secondPassCandidates: Map<string, ReturnType<typeof buildReviewPipelineQueue>["candidates"][number]>;
}): Promise<TaskQueueBatchRunResult & {
  providerName: string;
  model: string;
  role: "primary" | "fallback" | "auto" | "forced" | null;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
}> {
  if (input.category === "draft") {
    const result = await generateChapterDraft({ chapterId: input.chapterId });
    if ("error" in result) throw new ChapterGenerationFailureError(result);
    return {
      chapterId: input.chapterId,
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
    };
  }

  if (input.category === "review") {
    const result = await reviewChapterDraft(input.chapterId);
    if ("error" in result) throw new ChapterGenerationFailureError(result);
    return {
      chapterId: input.chapterId,
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
    };
  }

  const candidate = input.secondPassCandidates.get(input.chapterId);
  const result = await generateChapterSecondPass({
    chapterId: input.chapterId,
    instruction: candidate?.instruction ?? "按审稿意见强化钩子、冲突、爽点和章末追读。",
    mode: candidate?.secondPassMode,
  });
  if ("error" in result) throw new ChapterGenerationFailureError(result);
  return {
    chapterId: input.chapterId,
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
  };
}

export async function POST(request: Request) {
  const input = aiPipelineRecheckSchema.parse(await request.json());
  const dispatch = input.dispatch;
  const dispatchKey = text(dispatch.dispatchKey);
  const stage = text(dispatch.stage);
  const platformId = text(dispatch.platformId);
  const projectId = text(dispatch.projectId) || projectIdFromHref(text(dispatch.href));

  if (!dispatchKey.startsWith("ai-pipeline-recheck:") || platformId !== "ai-pipeline") {
    return NextResponse.json({ error: "这不是 AI 写审改复检派单。" }, { status: 400 });
  }
  if (!projectId) {
    return NextResponse.json({ error: "AI 复检派单缺少项目 ID。" }, { status: 400 });
  }

  const project = await loadProject(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const maxSampleCount = maxSampleCountForStage(stage);
  const queue = buildTaskQueueCenter([project]);
  const plan = buildTaskQueueExecutionPlan(queue.items, maxSampleCount, { allowCrossProject: false });
  if (!plan.canRun || !plan.category || plan.chapterIds.length === 0) {
    return NextResponse.json({ error: plan.detail, plan }, { status: 400 });
  }

  const startTactic = findProjectStartTacticSummary(project.worldEntries ?? []);
  const secondPassCandidates = new Map<string, ReturnType<typeof buildReviewPipelineQueue>["candidates"][number]>();
  for (const candidate of buildReviewPipelineQueue(project.chapters, project.aiTasks, 5, startTactic).candidates) {
    secondPassCandidates.set(candidate.chapterId, candidate);
  }

  const results = [];
  for (const chapterId of plan.chapterIds) {
    try {
      results.push(await runPlanItem({ category: plan.category, chapterId, secondPassCandidates }));
    } catch (error) {
      const mapped = mapBatchChapterGenerationError(error, {
        chapterId,
        requestedCount: plan.chapterIds.length,
        completedResults: results,
      });
      return NextResponse.json({ ...mapped.body, plan }, { status: mapped.status });
    }
  }

  const routeEffectSummary = buildBatchRouteEffectSummary(results.map((result) => ({
    status: result.status,
    taskId: result.taskId ?? "",
    providerName: result.providerName,
    model: result.model,
    role: result.role,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    costUsd: result.costUsd,
    qualityScore: result.qualityScore,
  })));
  const batchReceipt = buildTaskQueueBatchReceipt({ plan, results, routeEffectSummary });
  const now = new Date();
  const gateReceipt = buildAiPipelineRecheckGateActionReceipt({
    dispatchKey,
    projectId,
    projectTitle: project.title,
    href: text(dispatch.href) || `/projects/${projectId}#ai-pipeline`,
    plan,
    results,
    routeEffectSummary,
    batchReceipt,
    now,
  });
  const nextAction = buildAiPipelineRecheckNextAction({
    dispatchKey,
    projectId,
    mode: gateReceipt.payload.aiPipelineRecheck.mode,
    batchStatus: batchReceipt.status,
    primaryHref: batchReceipt.primaryHref,
    successRatePercent: routeEffectSummary.successRatePercent,
    averageQualityScore: routeEffectSummary.averageQualityScore,
  });
  const recoveryDispatch = buildAiPipelineRecheckRecoveryDispatchPlan({
    projectId,
    sourceDispatchKey: dispatchKey,
    mode: gateReceipt.payload.aiPipelineRecheck.mode,
    batchStatus: batchReceipt.status,
    healthLabel: batchReceipt.headline,
    healthDetail: routeEffectSummary.verdict,
  });
  const completionEvidence = completionEvidenceFor({ receipt: batchReceipt, plan });
  const [task, , recoveryTask] = await prisma.$transaction([
    prisma.gateDispatchTask.update({
      where: { dispatchKey },
      data: {
        state: "completed",
        assignedAt: now,
        completedAt: now,
        completionEvidence,
        evidence: JSON.stringify(Array.from(new Set([
          ...stringList(dispatch.evidence),
          ...batchReceipt.evidenceItems,
          routeEffectSummary.verdict,
          `总闸门回执：${gateReceipt.receipt.id}`,
        ]))),
      },
    }),
    prisma.gateActionAudit.upsert({
      where: { receiptId: gateReceipt.receipt.id },
      create: {
        receiptId: gateReceipt.receipt.id,
        actionId: gateReceipt.receipt.actionId,
        projectId,
        platformId: gateReceipt.receipt.platformId ?? "ai-pipeline",
        platformName: gateReceipt.receipt.platformName ?? "AI 写审改",
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
    }),
    ...(recoveryDispatch ? [
      prisma.gateDispatchTask.upsert({
        where: { dispatchKey: recoveryDispatch.dispatchKey },
        create: {
          dispatchKey: recoveryDispatch.dispatchKey,
          projectId,
          platformId: recoveryDispatch.platformId,
          platformName: recoveryDispatch.platformName,
          stage: recoveryDispatch.stage,
          state: recoveryDispatch.state,
          priorityScore: recoveryDispatch.priorityScore,
          ownerRole: recoveryDispatch.ownerRole,
          title: recoveryDispatch.title,
          detail: recoveryDispatch.detail,
          dueLabel: recoveryDispatch.dueLabel,
          actionLabel: recoveryDispatch.actionLabel,
          href: recoveryDispatch.href,
          acceptanceCriteria: JSON.stringify(recoveryDispatch.acceptanceCriteria),
          evidence: JSON.stringify(recoveryDispatch.evidence),
          sourceReceiptId: recoveryDispatch.sourceReceiptId,
          completionEvidence: recoveryDispatch.completionEvidence,
          reviewLatestAt: new Date(recoveryDispatch.reviewLatestAt),
        },
        update: {
          projectId,
          platformId: recoveryDispatch.platformId,
          platformName: recoveryDispatch.platformName,
          stage: recoveryDispatch.stage,
          state: recoveryDispatch.state,
          priorityScore: recoveryDispatch.priorityScore,
          ownerRole: recoveryDispatch.ownerRole,
          title: recoveryDispatch.title,
          detail: recoveryDispatch.detail,
          dueLabel: recoveryDispatch.dueLabel,
          actionLabel: recoveryDispatch.actionLabel,
          href: recoveryDispatch.href,
          acceptanceCriteria: JSON.stringify(recoveryDispatch.acceptanceCriteria),
          evidence: JSON.stringify(recoveryDispatch.evidence),
          sourceReceiptId: recoveryDispatch.sourceReceiptId,
          completionEvidence: recoveryDispatch.completionEvidence,
          reviewLatestAt: new Date(recoveryDispatch.reviewLatestAt),
        },
      }),
    ] : []),
  ]);

  return NextResponse.json({
    plan,
    results,
    routeEffectSummary,
    batchReceipt,
    gateReceipt: gateReceipt.receipt,
    nextAction,
    recheckTask: {
      dispatchKey: task.dispatchKey,
      state: task.state,
      completionEvidence: task.completionEvidence,
      completedAt: task.completedAt?.toISOString() ?? null,
    },
    recoveryDispatch: recoveryDispatch && recoveryTask ? {
      databaseId: recoveryTask.id,
      dispatchKey: recoveryTask.dispatchKey,
      id: recoveryTask.dispatchKey,
      state: recoveryTask.state,
      title: recoveryTask.title,
      detail: recoveryTask.detail,
      actionLabel: recoveryTask.actionLabel,
      href: recoveryTask.href,
      stage: recoveryTask.stage,
      priorityScore: recoveryTask.priorityScore,
      ownerRole: recoveryTask.ownerRole,
      dueLabel: recoveryTask.dueLabel,
      acceptanceCriteria: stringList(recoveryTask.acceptanceCriteria),
      evidence: stringList(recoveryTask.evidence),
      reviewLatestAt: recoveryTask.reviewLatestAt.toISOString(),
      projectId: recoveryTask.projectId,
      platformId: recoveryTask.platformId,
      platformName: recoveryTask.platformName,
      sourceReceiptId: recoveryTask.sourceReceiptId,
      completionEvidence: recoveryTask.completionEvidence,
      assignedAt: recoveryTask.assignedAt?.toISOString() ?? null,
      completedAt: recoveryTask.completedAt?.toISOString() ?? null,
      createdAt: recoveryTask.createdAt.toISOString(),
      updatedAt: recoveryTask.updatedAt.toISOString(),
    } : null,
  });
}
