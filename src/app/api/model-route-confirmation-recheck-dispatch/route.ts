import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  buildRouteConfirmationRecheckSampleDispatch,
  buildRouteConfirmationRecheckSamplePlan,
  type RouteConfirmationRecheckAdviceItem,
} from "@/lib/model-gateway/routeConfirmation";
import { isRoutedModelTaskType } from "@/lib/model-gateway/taskRouting";

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

function adviceFromBody(value: unknown): RouteConfirmationRecheckAdviceItem | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const id = text(raw.id);
  const taskType = text(raw.taskType);
  const label = text(raw.label);
  const action = adviceAction(raw.action);
  const severity = adviceSeverity(raw.severity);
  const actionLabel = text(raw.actionLabel);
  const recommendation = text(raw.recommendation);
  if (!id || !isRoutedModelTaskType(taskType) || !label || !action || !severity || !actionLabel || !recommendation) {
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

function providerName(provider: { displayName: string; defaultModel: string } | undefined) {
  return provider ? `${provider.displayName} · ${provider.defaultModel}` : null;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { advice?: unknown } | null;
  const advice = adviceFromBody(body?.advice);
  if (!advice) {
    return NextResponse.json({ error: "缺少有效模型路由复检建议。" }, { status: 400 });
  }

  const [providers, route] = await Promise.all([
    prisma.modelProvider.findMany({
      orderBy: [{ enabled: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        displayName: true,
        defaultModel: true,
      },
    }),
    prisma.modelTaskRoute.findUnique({
      where: { taskType: advice.taskType },
      select: {
        primaryProviderConfigId: true,
        fallbackProviderConfigId: true,
      },
    }),
  ]);
  const providersById = new Map(providers.map((provider) => [provider.id, provider]));
  const samplePlan = buildRouteConfirmationRecheckSamplePlan(advice, {
    primaryProviderName: providerName(route?.primaryProviderConfigId ? providersById.get(route.primaryProviderConfigId) : undefined),
    fallbackProviderName: providerName(route?.fallbackProviderConfigId ? providersById.get(route.fallbackProviderConfigId) : undefined),
  });
  const dispatch = buildRouteConfirmationRecheckSampleDispatch(advice, samplePlan);
  const now = new Date();
  const task = await prisma.gateDispatchTask.upsert({
    where: { dispatchKey: dispatch.dispatchKey },
    create: {
      dispatchKey: dispatch.dispatchKey,
      projectId: null,
      platformId: dispatch.platformId,
      platformName: dispatch.platformName,
      stage: dispatch.stage,
      state: dispatch.state,
      priorityScore: dispatch.priorityScore,
      ownerRole: dispatch.ownerRole,
      title: dispatch.title,
      detail: dispatch.detail,
      dueLabel: dispatch.dueLabel,
      actionLabel: dispatch.actionLabel,
      href: dispatch.href,
      acceptanceCriteria: JSON.stringify(dispatch.acceptanceCriteria),
      evidence: JSON.stringify(dispatch.evidence),
      sourceReceiptId: null,
      completionEvidence: "",
      reviewLatestAt: new Date(dispatch.reviewLatestAt),
      assignedAt: now,
      completedAt: null,
    },
    update: {
      state: dispatch.state,
      priorityScore: dispatch.priorityScore,
      detail: dispatch.detail,
      actionLabel: dispatch.actionLabel,
      acceptanceCriteria: JSON.stringify(dispatch.acceptanceCriteria),
      evidence: JSON.stringify(dispatch.evidence),
      reviewLatestAt: new Date(dispatch.reviewLatestAt),
      assignedAt: now,
      completedAt: null,
    },
  });

  return NextResponse.json({
    samplePlan,
    task: {
      dispatchKey: task.dispatchKey,
      stage: task.stage,
      state: task.state,
      title: task.title,
      href: task.href,
      actionLabel: task.actionLabel,
    },
  }, { status: 201 });
}
