import { NextResponse } from "next/server";
import { buildModelTaskAuditDashboard } from "@/lib/ai/modelTaskAudit";
import { prisma } from "@/lib/db/prisma";
import { buildRouteAvoidanceRulesFromDispatchTasks } from "@/lib/model-gateway/routeRecommendations";

interface Params {
  params: Promise<{ projectId: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      aiMonthlyBudgetUsd: true,
      aiMaxTaskCostUsd: true,
      aiMaxBatchCostUsd: true,
      aiMaxFailureRatePercent: true,
      aiBudgetEnforcement: true,
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const [tasks, providers, routes, chapters, completedRouteRepairs] = await Promise.all([
    prisma.aiTask.findMany({
      where: { projectId },
      include: {
        modelProvider: {
          select: {
            providerId: true,
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.modelProvider.findMany({
      orderBy: [{ enabled: "desc" }, { updatedAt: "desc" }],
    }),
    prisma.modelTaskRoute.findMany({
      orderBy: { taskType: "asc" },
      select: {
        taskType: true,
        primaryProviderConfigId: true,
        fallbackProviderConfigId: true,
      },
    }),
    prisma.chapter.findMany({
      where: { projectId },
      select: { id: true, title: true },
    }),
    prisma.gateDispatchTask.findMany({
      where: {
        stage: "failure_route_repair",
        state: "completed",
      },
      orderBy: { completedAt: "desc" },
      take: 100,
      select: {
        stage: true,
        state: true,
        completionEvidence: true,
        evidence: true,
      },
    }),
  ]);
  const chaptersById = new Map(chapters.map((chapter) => [chapter.id, chapter]));
  const routeAvoidanceRules = buildRouteAvoidanceRulesFromDispatchTasks(completedRouteRepairs, providers);

  return NextResponse.json({
    dashboard: buildModelTaskAuditDashboard(
      tasks.map((task) => ({
        ...task,
        chapter: task.chapterId ? chaptersById.get(task.chapterId) ?? null : null,
      })),
      providers,
      project,
      routes,
      routeAvoidanceRules,
    ),
  });
}
