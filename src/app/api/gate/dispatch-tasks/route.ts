import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type {
  GateActionReceipt,
  GatePlatformGrowthDispatchItem,
  GatePlatformGrowthDispatchState,
  PersistedGatePlatformDispatchTask,
} from "@/lib/projects/gateActionReceipts";

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function integer(value: unknown) {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : 0;
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
}

function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function date(value: unknown) {
  const parsed = new Date(text(value));
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function projectIdFromHref(href: string) {
  const match = href.match(/\/projects\/([^/#?]+)/);
  return match?.[1] ?? null;
}

function state(value: unknown): GatePlatformGrowthDispatchState {
  if (value === "completed") return "completed";
  if (value === "assigned") return "assigned";
  return "queued";
}

function parseJsonList(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return stringList(parsed);
  } catch {
    return [];
  }
}

function toTask(item: {
  id: string;
  dispatchKey: string;
  projectId: string | null;
  platformId: string;
  platformName: string;
  stage: string;
  state: string;
  priorityScore: number;
  ownerRole: string;
  title: string;
  detail: string;
  dueLabel: string;
  actionLabel: string;
  href: string;
  acceptanceCriteria: string;
  evidence: string;
  sourceReceiptId: string | null;
  completionEvidence: string;
  reviewLatestAt: Date;
  assignedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): PersistedGatePlatformDispatchTask {
  return {
    databaseId: item.id,
    dispatchKey: item.dispatchKey,
    id: item.dispatchKey,
    projectId: item.projectId,
    platformId: item.platformId,
    platformName: item.platformName,
    stage: item.stage as PersistedGatePlatformDispatchTask["stage"],
    state: state(item.state),
    priorityScore: item.priorityScore,
    ownerRole: item.ownerRole,
    title: item.title,
    detail: item.detail,
    dueLabel: item.dueLabel,
    actionLabel: item.actionLabel,
    href: item.href,
    acceptanceCriteria: parseJsonList(item.acceptanceCriteria),
    evidence: parseJsonList(item.evidence),
    sourceReceiptId: item.sourceReceiptId,
    completionEvidence: item.completionEvidence,
    reviewLatestAt: item.reviewLatestAt.toISOString(),
    assignedAt: item.assignedAt?.toISOString() ?? null,
    completedAt: item.completedAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function takeLimit(value: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 50;
  return Math.min(100, Math.max(1, Math.round(parsed)));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const where: Prisma.GateDispatchTaskWhereInput = {};
  const requestedState = searchParams.get("state");
  const platformId = searchParams.get("platformId");

  if (requestedState === "queued" || requestedState === "assigned" || requestedState === "completed") where.state = requestedState;
  if (platformId) where.platformId = platformId;

  const tasks = await prisma.gateDispatchTask.findMany({
    where,
    orderBy: [
      { state: "asc" },
      { priorityScore: "desc" },
      { updatedAt: "desc" },
    ],
    take: takeLimit(searchParams.get("limit")),
  });

  return NextResponse.json({ tasks: tasks.map(toTask) });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    dispatch?: Partial<GatePlatformGrowthDispatchItem>;
    sourceReceipt?: Partial<GateActionReceipt>;
  } | null;
  const dispatch = body?.dispatch;

  if (!dispatch?.id || !dispatch.platformId || !dispatch.platformName || !dispatch.stage) {
    return NextResponse.json({ error: "缺少有效派单。" }, { status: 400 });
  }

  const href = text(dispatch.href, "/gate");
  const candidateProjectId = projectIdFromHref(href);
  const project = candidateProjectId
    ? await prisma.project.findUnique({
        where: { id: candidateProjectId },
        select: { id: true },
      })
    : null;
  const nextState = state(dispatch.state === "completed" ? "completed" : "assigned");
  const now = new Date();
  const data = {
    dispatchKey: text(dispatch.id),
    projectId: project?.id ?? null,
    platformId: text(dispatch.platformId),
    platformName: text(dispatch.platformName),
    stage: text(dispatch.stage),
    state: nextState,
    priorityScore: integer(dispatch.priorityScore),
    ownerRole: text(dispatch.ownerRole),
    title: text(dispatch.title),
    detail: text(dispatch.detail),
    dueLabel: text(dispatch.dueLabel),
    actionLabel: text(dispatch.actionLabel),
    href,
    acceptanceCriteria: JSON.stringify(stringList(dispatch.acceptanceCriteria)),
    evidence: JSON.stringify(stringList(dispatch.evidence)),
    sourceReceiptId: text(body?.sourceReceipt?.id) || null,
    completionEvidence: "",
    reviewLatestAt: date(dispatch.reviewLatestAt),
    assignedAt: nextState === "assigned" ? now : null,
    completedAt: nextState === "completed" ? now : null,
  };

  const task = await prisma.gateDispatchTask.upsert({
    where: { dispatchKey: data.dispatchKey },
    create: data,
    update: {
      ...data,
      assignedAt: data.assignedAt ?? undefined,
      completedAt: data.completedAt ?? undefined,
    },
  });

  return NextResponse.json({ task: toTask(task) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    dispatchKey?: string;
    state?: GatePlatformGrowthDispatchState;
    completionEvidence?: string;
  } | null;
  const dispatchKey = text(body?.dispatchKey);

  if (!dispatchKey) {
    return NextResponse.json({ error: "缺少派单编号。" }, { status: 400 });
  }

  const nextState = state(body?.state);
  const completionEvidence = text(body?.completionEvidence).trim();
  if (nextState === "completed" && completionEvidence.length < 8) {
    return NextResponse.json({ error: "完成派单前，请写清楚完成依据，至少 8 个字。" }, { status: 400 });
  }
  const now = new Date();
  const task = await prisma.gateDispatchTask.update({
    where: { dispatchKey },
    data: {
      state: nextState,
      assignedAt: nextState === "assigned" ? now : undefined,
      completedAt: nextState === "completed" ? now : nextState === "queued" || nextState === "assigned" ? null : undefined,
      completionEvidence: nextState === "completed" ? completionEvidence : nextState === "queued" || nextState === "assigned" ? "" : undefined,
    },
  });

  return NextResponse.json({ task: toTask(task) });
}
