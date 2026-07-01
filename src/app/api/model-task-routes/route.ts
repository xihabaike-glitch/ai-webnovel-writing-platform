import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
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

  return NextResponse.json({ route: maskRoute(route) });
}
