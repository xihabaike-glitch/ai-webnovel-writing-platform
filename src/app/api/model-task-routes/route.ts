import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { buildModelRouteConfirmationReceipt } from "@/lib/model-gateway/routeConfirmation";
import { modelTaskRouteOptions } from "@/lib/model-gateway/taskRouting";
import { saveModelTaskRouteSchema } from "@/lib/validators/modelProvider";

function maskRoute(route: {
  id: string;
  taskType: string;
  primaryProviderConfigId: string | null;
  fallbackProviderConfigId: string | null;
}) {
  return {
    id: route.id,
    taskType: route.taskType,
    primaryProviderConfigId: route.primaryProviderConfigId,
    fallbackProviderConfigId: route.fallbackProviderConfigId,
  };
}

function providerDisplayName(provider: { displayName: string; defaultModel: string }) {
  return `${provider.displayName} · ${provider.defaultModel}`;
}

export async function GET() {
  const routes = await prisma.modelTaskRoute.findMany({
    orderBy: { taskType: "asc" },
  });

  return NextResponse.json({
    routeOptions: modelTaskRouteOptions,
    routes: routes.map(maskRoute),
  });
}

export async function POST(request: Request) {
  const input = saveModelTaskRouteSchema.parse(await request.json());
  const route = await prisma.modelTaskRoute.upsert({
    where: { taskType: input.taskType },
    create: {
      taskType: input.taskType,
      primaryProviderConfigId: input.primaryProviderConfigId || null,
      fallbackProviderConfigId: input.fallbackProviderConfigId || null,
    },
    update: {
      primaryProviderConfigId: input.primaryProviderConfigId || null,
      fallbackProviderConfigId: input.fallbackProviderConfigId || null,
    },
  });

  let confirmationReceipt = null;
  if (input.confirmation) {
    const providerIds = [input.primaryProviderConfigId, input.fallbackProviderConfigId]
      .filter((id): id is string => Boolean(id));
    const routeProviders = providerIds.length
      ? await prisma.modelProvider.findMany({
        where: { id: { in: providerIds } },
        select: { id: true, displayName: true, defaultModel: true },
      })
      : [];
    const providerNameById = new Map(routeProviders.map((provider) => [provider.id, providerDisplayName(provider)]));
    confirmationReceipt = buildModelRouteConfirmationReceipt({
      taskType: input.taskType,
      primaryProviderName: input.confirmation.primaryProviderName ?? providerNameById.get(input.primaryProviderConfigId ?? "") ?? null,
      fallbackProviderName: input.confirmation.fallbackProviderName ?? providerNameById.get(input.fallbackProviderConfigId ?? "") ?? null,
      reason: input.confirmation.reason,
      source: input.confirmation.source,
      routeStatus: input.confirmation.routeStatus,
      avoidanceStatus: input.confirmation.avoidanceStatus,
      restoredCandidate: input.confirmation.restoredCandidate,
    });

    await prisma.gateActionAudit.upsert({
      where: { receiptId: confirmationReceipt.id },
      create: {
        receiptId: confirmationReceipt.id,
        actionId: confirmationReceipt.actionId,
        platformId: confirmationReceipt.platformId,
        platformName: confirmationReceipt.platformName,
        label: confirmationReceipt.label,
        detail: confirmationReceipt.detail,
        href: confirmationReceipt.href,
        status: confirmationReceipt.status,
        message: confirmationReceipt.message,
        executionType: confirmationReceipt.executionType,
        succeededCount: confirmationReceipt.succeededCount,
        failedCount: confirmationReceipt.failedCount,
        recheckStatus: confirmationReceipt.recheck.status,
        recheckLabel: confirmationReceipt.recheck.label,
        recheckDetail: confirmationReceipt.recheck.detail,
        recheckAction: confirmationReceipt.recheck.action,
        payload: JSON.stringify(confirmationReceipt.payload),
        createdAt: new Date(confirmationReceipt.createdAt),
      },
      update: {
        actionId: confirmationReceipt.actionId,
        platformId: confirmationReceipt.platformId,
        platformName: confirmationReceipt.platformName,
        label: confirmationReceipt.label,
        detail: confirmationReceipt.detail,
        href: confirmationReceipt.href,
        status: confirmationReceipt.status,
        message: confirmationReceipt.message,
        executionType: confirmationReceipt.executionType,
        succeededCount: confirmationReceipt.succeededCount,
        failedCount: confirmationReceipt.failedCount,
        recheckStatus: confirmationReceipt.recheck.status,
        recheckLabel: confirmationReceipt.recheck.label,
        recheckDetail: confirmationReceipt.recheck.detail,
        recheckAction: confirmationReceipt.recheck.action,
        payload: JSON.stringify(confirmationReceipt.payload),
      },
    });
  }

  return NextResponse.json({ route: maskRoute(route), confirmationReceipt });
}
