import { NextResponse } from "next/server";
import { z } from "zod";
import { generateChapterDraft } from "@/lib/ai/chapterDraftGeneration";
import { reviewChapterDraft } from "@/lib/ai/chapterReviewGeneration";
import { prisma } from "@/lib/db/prisma";
import {
  buildRouteConfirmationRecheckAdviceFromDispatchTask,
  buildRouteConfirmationRecheckSampleDispatch,
  buildRouteConfirmationRecheckSamplePlan,
  type RouteConfirmationRecheckAdviceItem,
} from "@/lib/model-gateway/routeConfirmation";
import {
  buildRouteConfirmationRecheckExecutionEvidence,
  buildRouteConfirmationRecheckExecutionPlan,
} from "@/lib/model-gateway/routeRetestSamples";
import { isRoutedModelTaskType } from "@/lib/model-gateway/taskRouting";

const runRecheckSamplesSchema = z.object({
  advice: z.record(z.string(), z.unknown()).optional(),
  dispatch: z.record(z.string(), z.unknown()).optional(),
  execute: z.boolean().default(false),
});

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function nullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function nullableBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function adviceAction(value: unknown): RouteConfirmationRecheckAdviceItem["action"] | null {
  if (value === "switch_route" || value === "extend_watch" || value === "manual_review") return value;
  return null;
}

function adviceSeverity(value: unknown): RouteConfirmationRecheckAdviceItem["severity"] | null {
  if (value === "warning" || value === "blocked") return value;
  return null;
}

function adviceFromBody(raw: Record<string, unknown>): RouteConfirmationRecheckAdviceItem | null {
  const taskType = text(raw.taskType);
  const action = adviceAction(raw.action);
  const severity = adviceSeverity(raw.severity);
  const id = text(raw.id);
  const label = text(raw.label);
  const actionLabel = text(raw.actionLabel);
  const recommendation = text(raw.recommendation);
  if (!id || !isRoutedModelTaskType(taskType) || !action || !severity || !label || !actionLabel || !recommendation) {
    return null;
  }
  return {
    id,
    taskType,
    label,
    severity,
    action,
    actionLabel,
    recommendation,
    sampleCount: nullableNumber(raw.sampleCount),
    successRatePercent: nullableNumber(raw.successRatePercent),
    qualityScore: nullableNumber(raw.qualityScore),
    cost: text(raw.cost) || null,
    fallbackHit: nullableBoolean(raw.fallbackHit),
    needsGovernance: nullableBoolean(raw.needsGovernance),
    evidence: stringList(raw.evidence),
    completedAt: text(raw.completedAt) || null,
  };
}

function dispatchAdviceFromBody(raw: Record<string, unknown>): RouteConfirmationRecheckAdviceItem | null {
  return buildRouteConfirmationRecheckAdviceFromDispatchTask({
    dispatchKey: text(raw.dispatchKey),
    stage: text(raw.stage),
    state: text(raw.state),
    title: text(raw.title),
    detail: text(raw.detail),
    actionLabel: text(raw.actionLabel),
    href: text(raw.href),
    priorityScore: nullableNumber(raw.priorityScore) ?? undefined,
    reviewLatestAt: text(raw.reviewLatestAt, new Date().toISOString()),
    evidence: stringList(raw.evidence),
  });
}

function providerName(provider: { displayName: string; defaultModel: string } | undefined) {
  return provider ? `${provider.displayName} · ${provider.defaultModel}` : null;
}

async function loadRouteContext(taskType: RouteConfirmationRecheckAdviceItem["taskType"]) {
  const [providers, route, projects] = await Promise.all([
    prisma.modelProvider.findMany({
      orderBy: [{ enabled: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        displayName: true,
        defaultModel: true,
      },
    }),
    prisma.modelTaskRoute.findUnique({
      where: { taskType },
      select: {
        primaryProviderConfigId: true,
        fallbackProviderConfigId: true,
      },
    }),
    prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: {
        chapters: { orderBy: { order: "asc" } },
        aiTasks: { orderBy: { createdAt: "desc" }, take: 200 },
      },
    }),
  ]);
  const providersById = new Map(providers.map((provider) => [provider.id, provider]));
  return {
    primaryProviderName: providerName(route?.primaryProviderConfigId ? providersById.get(route.primaryProviderConfigId) : undefined),
    fallbackProviderName: providerName(route?.fallbackProviderConfigId ? providersById.get(route.fallbackProviderConfigId) : undefined),
    projects,
  };
}

export async function POST(request: Request) {
  const input = runRecheckSamplesSchema.parse(await request.json());
  const advice = input.advice ? adviceFromBody(input.advice) : input.dispatch ? dispatchAdviceFromBody(input.dispatch) : null;
  if (!advice) {
    return NextResponse.json({ error: "缺少有效模型路由复检建议。" }, { status: 400 });
  }
  const sourceDispatchKey = input.dispatch ? text(input.dispatch.dispatchKey) : "";
  const sourceReviewLatestAt = input.dispatch ? text(input.dispatch.reviewLatestAt) : "";

  const context = await loadRouteContext(advice.taskType);
  const samplePlan = buildRouteConfirmationRecheckSamplePlan(advice, {
    primaryProviderName: context.primaryProviderName,
    fallbackProviderName: context.fallbackProviderName,
  });
  const executionPlan = buildRouteConfirmationRecheckExecutionPlan(advice, samplePlan, context.projects);

  if (!executionPlan.canRun) {
    return NextResponse.json({ error: executionPlan.reason, samplePlan, executionPlan }, { status: 400 });
  }
  if (!input.execute) {
    return NextResponse.json({ samplePlan, executionPlan, results: [] });
  }

  const results = [];
  for (const chapterId of executionPlan.chapterIds) {
    if (executionPlan.taskType === "chapter_draft") {
      const result = await generateChapterDraft({ chapterId });
      results.push({
        chapterId,
        taskId: result.task.id,
        status: "error" in result ? "failed" : "succeeded",
        providerName: result.provider.displayName,
        model: result.provider.model,
        routeRole: result.attempts.find((attempt) => attempt.taskId === result.task.id)?.role ?? null,
        score: "error" in result ? null : result.draftQuality.score,
        error: "error" in result ? result.error ?? null : null,
      });
      continue;
    }

    if (executionPlan.taskType === "chapter_review") {
      const result = await reviewChapterDraft(chapterId);
      results.push({
        chapterId,
        taskId: result.task.id,
        status: "error" in result ? "failed" : "succeeded",
        providerName: result.provider.displayName,
        model: result.provider.model,
        routeRole: result.attempts.find((attempt) => attempt.taskId === result.task.id)?.role ?? null,
        score: "error" in result ? null : result.result.score,
        error: "error" in result ? result.error ?? null : null,
      });
    }
  }

  const recheckEvidence = buildRouteConfirmationRecheckExecutionEvidence({
    plan: {
      routeLabel: samplePlan.routeLabel,
      taskScope: samplePlan.label,
      sampleCount: executionPlan.sampleCount,
    },
    results,
  });
  const dispatch = buildRouteConfirmationRecheckSampleDispatch(advice, samplePlan, {
    dispatchKey: sourceDispatchKey || undefined,
    createdAt: sourceReviewLatestAt || undefined,
  });
  const now = new Date();
  const task = await prisma.gateDispatchTask.upsert({
    where: { dispatchKey: dispatch.dispatchKey },
    create: {
      dispatchKey: dispatch.dispatchKey,
      projectId: null,
      platformId: dispatch.platformId,
      platformName: dispatch.platformName,
      stage: dispatch.stage,
      state: "completed",
      priorityScore: dispatch.priorityScore,
      ownerRole: dispatch.ownerRole,
      title: dispatch.title,
      detail: dispatch.detail,
      dueLabel: dispatch.dueLabel,
      actionLabel: dispatch.actionLabel,
      href: dispatch.href,
      acceptanceCriteria: JSON.stringify(dispatch.acceptanceCriteria),
      evidence: JSON.stringify(Array.from(new Set([...dispatch.evidence, ...recheckEvidence.evidence]))),
      sourceReceiptId: null,
      completionEvidence: recheckEvidence.completionEvidence,
      reviewLatestAt: new Date(dispatch.reviewLatestAt),
      assignedAt: now,
      completedAt: now,
    },
    update: {
      state: "completed",
      priorityScore: dispatch.priorityScore,
      detail: dispatch.detail,
      acceptanceCriteria: JSON.stringify(dispatch.acceptanceCriteria),
      evidence: JSON.stringify(Array.from(new Set([...dispatch.evidence, ...recheckEvidence.evidence]))),
      completionEvidence: recheckEvidence.completionEvidence,
      reviewLatestAt: new Date(dispatch.reviewLatestAt),
      assignedAt: now,
      completedAt: now,
    },
  });

  return NextResponse.json({
    samplePlan,
    executionPlan,
    results,
    recheckEvidence,
    recheckTask: {
      dispatchKey: task.dispatchKey,
      state: task.state,
      completionEvidence: task.completionEvidence,
      completedAt: task.completedAt?.toISOString() ?? null,
    },
  });
}
