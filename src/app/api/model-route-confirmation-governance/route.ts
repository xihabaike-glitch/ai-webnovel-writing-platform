import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  buildRouteConfirmationRecheckGovernanceAction,
  type RouteConfirmationRecheckAdviceItem,
} from "@/lib/model-gateway/routeConfirmation";
import { isRoutedModelTaskType } from "@/lib/model-gateway/taskRouting";

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
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
  const taskType = text(raw.taskType);
  const action = adviceAction(raw.action);
  const severity = adviceSeverity(raw.severity);
  const label = text(raw.label);
  const actionLabel = text(raw.actionLabel);
  const recommendation = text(raw.recommendation);
  const id = text(raw.id);
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
    evidence: stringList(raw.evidence),
    completedAt: text(raw.completedAt) || null,
  };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { advice?: unknown } | null;
  const advice = adviceFromBody(body?.advice);
  if (!advice) {
    return NextResponse.json({ error: "缺少有效模型路由治理建议。" }, { status: 400 });
  }

  const action = buildRouteConfirmationRecheckGovernanceAction(advice);
  const reviewLatestAt = new Date(action.dispatch.reviewLatestAt);
  const createdAt = new Date(action.receipt.createdAt);
  const [audit, task] = await prisma.$transaction([
    prisma.gateActionAudit.upsert({
      where: { receiptId: action.receipt.id },
      create: {
        receiptId: action.receipt.id,
        actionId: action.receipt.actionId,
        projectId: null,
        platformId: action.receipt.platformId ?? "model-routing",
        platformName: action.receipt.platformName ?? "模型路由",
        label: action.receipt.label,
        detail: action.receipt.detail,
        href: action.receipt.href,
        status: action.receipt.status,
        message: action.receipt.message,
        executionType: action.receipt.executionType,
        succeededCount: action.receipt.succeededCount,
        failedCount: action.receipt.failedCount,
        taskId: null,
        recheckStatus: action.receipt.recheck.status,
        recheckLabel: action.receipt.recheck.label,
        recheckDetail: action.receipt.recheck.detail,
        recheckAction: action.receipt.recheck.actionLabel,
        payload: JSON.stringify(action.payload),
        createdAt,
      },
      update: {
        detail: action.receipt.detail,
        message: action.receipt.message,
        payload: JSON.stringify(action.payload),
      },
    }),
    prisma.gateDispatchTask.upsert({
      where: { dispatchKey: action.dispatch.dispatchKey },
      create: {
        dispatchKey: action.dispatch.dispatchKey,
        projectId: null,
        platformId: action.dispatch.platformId,
        platformName: action.dispatch.platformName,
        stage: action.dispatch.stage,
        state: action.dispatch.state,
        priorityScore: action.dispatch.priorityScore,
        ownerRole: action.dispatch.ownerRole,
        title: action.dispatch.title,
        detail: action.dispatch.detail,
        dueLabel: action.dispatch.dueLabel,
        actionLabel: action.dispatch.actionLabel,
        href: action.dispatch.href,
        acceptanceCriteria: JSON.stringify(action.dispatch.acceptanceCriteria),
        evidence: JSON.stringify(action.dispatch.evidence),
        sourceReceiptId: action.receipt.id,
        completionEvidence: "",
        reviewLatestAt,
        assignedAt: new Date(),
        completedAt: null,
      },
      update: {
        state: action.dispatch.state,
        priorityScore: action.dispatch.priorityScore,
        detail: action.dispatch.detail,
        acceptanceCriteria: JSON.stringify(action.dispatch.acceptanceCriteria),
        evidence: JSON.stringify(action.dispatch.evidence),
        sourceReceiptId: action.receipt.id,
        assignedAt: new Date(),
        completedAt: null,
      },
    }),
  ]);

  return NextResponse.json({
    receipt: {
      ...action.receipt,
      createdAt: audit.createdAt.toISOString(),
    },
    task: {
      dispatchKey: task.dispatchKey,
      stage: task.stage,
      state: task.state,
      title: task.title,
      href: task.href,
    },
  }, { status: 201 });
}
