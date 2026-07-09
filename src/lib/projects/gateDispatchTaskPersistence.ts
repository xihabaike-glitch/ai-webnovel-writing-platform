import { prisma } from "../db/prisma.ts";
import type { GatePlatformGrowthDispatchItem } from "./gateActionReceipts.ts";
import { gatePlatformDispatchTaskFromRecord } from "./gateDispatchTaskRecords.ts";

type GateDispatchTaskDatabase = Pick<typeof prisma, "project" | "gateDispatchTask">;

function projectIdFromHref(href: string) {
  const match = href.match(/\/projects\/([^/#?]+)/);
  return match?.[1] ?? null;
}

export async function persistServerGateDispatchTaskWithDatabase(
  dispatch: GatePlatformGrowthDispatchItem,
  database: GateDispatchTaskDatabase,
) {
  const now = new Date();
  const candidateProjectId = projectIdFromHref(dispatch.href);
  const project = candidateProjectId
    ? await database.project.findUnique({
      where: { id: candidateProjectId },
      select: { id: true },
    })
    : null;
  const projectId = project?.id ?? null;
  const task = await database.gateDispatchTask.upsert({
    where: { dispatchKey: dispatch.id },
    create: {
      dispatchKey: dispatch.id,
      projectId,
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
      assignedAt: dispatch.state === "assigned" ? now : null,
      completedAt: dispatch.state === "completed" ? now : null,
    },
    update: {
      projectId,
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
      assignedAt: dispatch.state === "assigned" ? now : undefined,
      completedAt: dispatch.state === "completed" ? now : dispatch.state === "assigned" || dispatch.state === "queued" ? null : undefined,
    },
  });

  return gatePlatformDispatchTaskFromRecord(task);
}

export async function persistServerGateDispatchTask(dispatch: GatePlatformGrowthDispatchItem) {
  return persistServerGateDispatchTaskWithDatabase(dispatch, prisma);
}
