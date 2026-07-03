import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import {
  applyRouteAvoidanceOverrides,
  buildRouteAvoidanceGovernance,
  buildRouteAvoidanceRetestDispatch,
  buildRouteAvoidanceRulesFromDispatchTasks,
  routeAvoidanceOverrideFromRecord,
  type RouteAvoidanceOverride,
} from "@/lib/model-gateway/routeRecommendations";

const createRetestSchema = z.object({
  ruleKey: z.string().min(3),
});

function toTask(task: {
  id: string;
  dispatchKey: string;
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
  reviewLatestAt: Date;
  assignedAt: Date | null;
  completedAt: Date | null;
}) {
  return {
    id: task.id,
    dispatchKey: task.dispatchKey,
    platformId: task.platformId,
    platformName: task.platformName,
    stage: task.stage,
    state: task.state,
    priorityScore: task.priorityScore,
    ownerRole: task.ownerRole,
    title: task.title,
    detail: task.detail,
    dueLabel: task.dueLabel,
    actionLabel: task.actionLabel,
    href: task.href,
    acceptanceCriteria: JSON.parse(task.acceptanceCriteria) as string[],
    evidence: JSON.parse(task.evidence) as string[],
    reviewLatestAt: task.reviewLatestAt.toISOString(),
    assignedAt: task.assignedAt?.toISOString() ?? null,
    completedAt: task.completedAt?.toISOString() ?? null,
  };
}

export async function POST(request: Request) {
  const input = createRetestSchema.parse(await request.json());
  const [providers, completedRouteRepairs, routeAvoidanceOverrides] = await Promise.all([
    prisma.modelProvider.findMany({
      orderBy: [{ enabled: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        providerId: true,
        displayName: true,
        defaultModel: true,
        enabled: true,
        encryptedApiKey: true,
      },
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
    prisma.modelRouteAvoidanceOverride.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        ruleKey: true,
        action: true,
        taskType: true,
        note: true,
        expiresAt: true,
      },
    }),
  ]);
  const avoidanceRules = applyRouteAvoidanceOverrides(
    buildRouteAvoidanceRulesFromDispatchTasks(completedRouteRepairs, providers),
    routeAvoidanceOverrides.map(routeAvoidanceOverrideFromRecord).filter((override): override is RouteAvoidanceOverride => Boolean(override)),
  );
  const governance = buildRouteAvoidanceGovernance(avoidanceRules, providers);
  const queueItem = governance.retestQueue.items.find((item) => item.ruleKey === input.ruleKey);

  if (!queueItem) {
    return NextResponse.json({ error: "没有找到可复测的避坑规则。" }, { status: 404 });
  }

  const dispatch = buildRouteAvoidanceRetestDispatch(queueItem);
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
      reviewLatestAt: new Date(dispatch.reviewLatestAt),
      assignedAt: now,
      completedAt: null,
    },
  });

  return NextResponse.json({ task: toTask(task) }, { status: 201 });
}
