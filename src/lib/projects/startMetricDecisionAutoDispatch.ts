import { prisma } from "../db/prisma.ts";
import {
  buildGateProjectStartMetricDecision,
  buildGateProjectStartMetricDispatchItems,
  buildGateProjectStartMetricFollowupDispatchItems,
  buildGateProjectSecondMetricDecision,
  buildGateProjectSecondMetricDispatchItems,
  buildGateProjectSecondMetricFollowupDispatchItems,
  gateActionReceiptFromAuditRecord,
  type GateProjectStartMetricDecision,
  type GateProjectSecondMetricDecision,
  type PersistedGatePlatformDispatchTask,
} from "./gateActionReceipts.ts";
import { gatePlatformDispatchTaskFromRecord } from "./gateDispatchTaskRecords.ts";
import { persistServerGateDispatchTask } from "./gateDispatchTaskPersistence.ts";

export interface StartMetricAutoDispatchResult {
  decision: GateProjectStartMetricDecision;
  createdDispatches: PersistedGatePlatformDispatchTask[];
  skippedDispatches: PersistedGatePlatformDispatchTask[];
}

export interface StartMetricFollowupAutoDispatchResult {
  createdDispatches: PersistedGatePlatformDispatchTask[];
  skippedDispatches: PersistedGatePlatformDispatchTask[];
}

export interface SecondMetricAutoDispatchResult {
  decision: GateProjectSecondMetricDecision;
  createdDispatches: PersistedGatePlatformDispatchTask[];
  skippedDispatches: PersistedGatePlatformDispatchTask[];
}

export interface SecondMetricFollowupAutoDispatchResult {
  createdDispatches: PersistedGatePlatformDispatchTask[];
  skippedDispatches: PersistedGatePlatformDispatchTask[];
}

async function loadProjectGateContext(input: { projectId: string; platformId?: string | null }) {
  const where = {
    projectId: input.projectId,
    ...(input.platformId ? { platformId: input.platformId } : {}),
  };
  const [taskRecords, auditRecords] = await Promise.all([
    prisma.gateDispatchTask.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.gateActionAudit.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return {
    persistedTasks: taskRecords.map(gatePlatformDispatchTaskFromRecord),
    receipts: auditRecords.map(gateActionReceiptFromAuditRecord),
  };
}

async function persistNewDispatches(
  dispatches: ReturnType<typeof buildGateProjectStartMetricDispatchItems>,
  persistedTasks: PersistedGatePlatformDispatchTask[],
) {
  const existingKeys = new Set(persistedTasks.map((task) => task.dispatchKey));
  const persistedByKey = new Map(persistedTasks.map((task) => [task.dispatchKey, task]));
  const createdDispatches: PersistedGatePlatformDispatchTask[] = [];
  const skippedDispatches: PersistedGatePlatformDispatchTask[] = [];

  for (const dispatch of dispatches) {
    if (existingKeys.has(dispatch.id)) {
      const persisted = persistedByKey.get(dispatch.id);
      if (persisted) skippedDispatches.push(persisted);
      continue;
    }
    const assignedDispatch = { ...dispatch, state: "assigned" as const };
    const persisted = await persistServerGateDispatchTask(assignedDispatch);
    createdDispatches.push(persisted);
  }

  return { createdDispatches, skippedDispatches };
}

export async function autoDispatchStartMetricDecision(input: {
  projectId: string;
  platformId?: string | null;
}): Promise<StartMetricAutoDispatchResult> {
  const { persistedTasks, receipts } = await loadProjectGateContext(input);
  const decision = buildGateProjectStartMetricDecision(persistedTasks, receipts);
  const dispatches = buildGateProjectStartMetricDispatchItems(decision, persistedTasks);
  const result = await persistNewDispatches(dispatches, persistedTasks);

  return {
    decision,
    ...result,
  };
}

export async function autoDispatchStartMetricFollowups(input: {
  projectId: string;
  platformId?: string | null;
}): Promise<StartMetricFollowupAutoDispatchResult> {
  const { persistedTasks } = await loadProjectGateContext(input);
  const followups = buildGateProjectStartMetricFollowupDispatchItems(persistedTasks, persistedTasks);
  return persistNewDispatches(followups, persistedTasks);
}

export async function autoDispatchSecondMetricDecision(input: {
  projectId: string;
  platformId?: string | null;
}): Promise<SecondMetricAutoDispatchResult> {
  const { persistedTasks, receipts } = await loadProjectGateContext(input);
  const decision = buildGateProjectSecondMetricDecision(persistedTasks, receipts);
  const dispatches = buildGateProjectSecondMetricDispatchItems(decision, persistedTasks);
  const result = await persistNewDispatches(dispatches, persistedTasks);

  return {
    decision,
    ...result,
  };
}

export async function autoDispatchSecondMetricFollowups(input: {
  projectId: string;
  platformId?: string | null;
}): Promise<SecondMetricFollowupAutoDispatchResult> {
  const { persistedTasks } = await loadProjectGateContext(input);
  const followups = buildGateProjectSecondMetricFollowupDispatchItems(persistedTasks, persistedTasks);
  return persistNewDispatches(followups, persistedTasks);
}
