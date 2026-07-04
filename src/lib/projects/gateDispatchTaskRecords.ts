import type { GatePlatformGrowthDispatchState, PersistedGatePlatformDispatchTask } from "./gateActionReceipts.ts";

export interface GateDispatchTaskRecord {
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
}

function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function parseJsonList(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return stringList(parsed);
  } catch {
    return [];
  }
}

function state(value: unknown): GatePlatformGrowthDispatchState {
  if (value === "completed") return "completed";
  if (value === "assigned") return "assigned";
  return "queued";
}

export function gatePlatformDispatchTaskFromRecord(item: GateDispatchTaskRecord): PersistedGatePlatformDispatchTask {
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
