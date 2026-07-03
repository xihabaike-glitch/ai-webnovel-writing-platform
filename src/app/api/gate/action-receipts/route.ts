import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { GateActionReceipt, GateActionReceiptBatchEffectSummary, GateActionReceiptStartTactic } from "@/lib/projects/gateActionReceipts";

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function integer(value: unknown) {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : 0;
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
}

function date(value: unknown) {
  const parsed = new Date(text(value));
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function projectIdFromHref(href: string) {
  const match = href.match(/\/projects\/([^/#?]+)/);
  return match?.[1] ?? null;
}

function platformIdFromAction(actionId: string) {
  const match = actionId.match(/^platform-strategy:([^:]+):/);
  return match?.[1] ?? "";
}

function platformNameFromDetail(detail: string) {
  return detail.split("·")[0]?.trim() ?? "";
}

function parsePayload(payload: string) {
  try {
    const parsed = JSON.parse(payload) as {
      startTactics?: GateActionReceiptStartTactic[];
      plan?: { strategyBases?: GateActionReceiptStartTactic[] };
      routeEffectSummary?: GateActionReceiptBatchEffectSummary;
    };
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function startTacticsFromPayload(payload: string) {
  const parsed = parsePayload(payload);
  const startTactics = parsed.startTactics?.length ? parsed.startTactics : parsed.plan?.strategyBases ?? [];
  return startTactics.filter((item) => item && typeof item.title === "string" && typeof item.primaryTactic === "string");
}

function batchEffectSummaryFromPayload(payload: string): GateActionReceiptBatchEffectSummary | null {
  const route = parsePayload(payload).routeEffectSummary;
  if (!route || typeof route.successRatePercent !== "number" || typeof route.knownCostUsd !== "number") return null;
  return {
    successRatePercent: route.successRatePercent,
    knownCostUsd: route.knownCostUsd,
    averageQualityScore: typeof route.averageQualityScore === "number" ? route.averageQualityScore : null,
    verdict: typeof route.verdict === "string" ? route.verdict : undefined,
  };
}

function toReceipt(item: {
  receiptId: string;
  actionId: string;
  label: string;
  detail: string;
  href: string;
  status: string;
  message: string;
  executionType: string;
  succeededCount: number;
  failedCount: number;
  taskId: string | null;
  platformId: string;
  platformName: string;
  recheckStatus: string;
  recheckLabel: string;
  recheckDetail: string;
  recheckAction: string;
  payload: string;
  createdAt: Date;
}): GateActionReceipt {
  return {
    id: item.receiptId,
    actionId: item.actionId,
    label: item.label,
    detail: item.detail,
    href: item.href,
    status: item.status === "failed" ? "failed" : "succeeded",
    message: item.message,
    executionType: item.executionType as GateActionReceipt["executionType"],
    succeededCount: item.succeededCount,
    failedCount: item.failedCount,
    taskId: item.taskId,
    platformId: item.platformId,
    platformName: item.platformName,
    startTactics: startTacticsFromPayload(item.payload),
    batchEffectSummary: batchEffectSummaryFromPayload(item.payload),
    recheck: {
      status: item.recheckStatus === "blocked" ? "blocked" : "ready",
      label: item.recheckLabel,
      detail: item.recheckDetail,
      actionLabel: item.recheckAction,
    },
    createdAt: item.createdAt.toISOString(),
  };
}

function takeLimit(value: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 50;
  return Math.min(100, Math.max(1, Math.round(parsed)));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const where: Prisma.GateActionAuditWhereInput = {};
  const status = searchParams.get("status");
  const executionType = searchParams.get("executionType");
  const platformId = searchParams.get("platformId");

  if (status === "succeeded" || status === "failed") where.status = status;
  if (executionType) where.executionType = executionType;
  if (platformId) where.platformId = platformId;

  const items = await prisma.gateActionAudit.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: takeLimit(searchParams.get("limit")),
  });

  return NextResponse.json({ receipts: items.map(toReceipt) });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { receipt?: Partial<GateActionReceipt>; payload?: unknown } | null;
  const receipt = body?.receipt;

  if (!receipt?.id || !receipt.label || !receipt.actionId) {
    return NextResponse.json({ error: "缺少有效回执。" }, { status: 400 });
  }

  const href = text(receipt.href, "/gate");
  const actionId = text(receipt.actionId);
  const detail = text(receipt.detail);
  const candidateProjectId = projectIdFromHref(href);
  const project = candidateProjectId
    ? await prisma.project.findUnique({
        where: { id: candidateProjectId },
        select: { id: true },
      })
    : null;
  const data = {
    receiptId: receipt.id,
    actionId,
    projectId: project?.id ?? null,
    platformId: text(receipt.platformId, platformIdFromAction(actionId)),
    platformName: text(receipt.platformName, platformNameFromDetail(detail)),
    label: text(receipt.label),
    detail,
    href,
    status: receipt.status === "failed" ? "failed" : "succeeded",
    message: text(receipt.message),
    executionType: text(receipt.executionType, "manual"),
    succeededCount: integer(receipt.succeededCount),
    failedCount: integer(receipt.failedCount),
    taskId: text(receipt.taskId) || null,
    recheckStatus: receipt.recheck?.status === "blocked" ? "blocked" : "ready",
    recheckLabel: text(receipt.recheck?.label),
    recheckDetail: text(receipt.recheck?.detail),
    recheckAction: text(receipt.recheck?.actionLabel, "刷新总闸门"),
    payload: JSON.stringify(body?.payload ?? {
      startTactics: receipt.startTactics ?? [],
      routeEffectSummary: receipt.batchEffectSummary ?? undefined,
    }),
    createdAt: date(receipt.createdAt),
  };
  const audit = await prisma.gateActionAudit.upsert({
    where: { receiptId: data.receiptId },
    create: data,
    update: data,
  });

  return NextResponse.json({ receipt: toReceipt(audit) }, { status: 201 });
}

export async function DELETE() {
  const result = await prisma.gateActionAudit.deleteMany();
  return NextResponse.json({ deleted: result.count });
}
