import { prisma } from "../db/prisma.ts";
import {
  buildGateProjectStartMetricDecision,
  buildGateProjectStartMetricDispatchItems,
  gateActionReceiptFromAuditRecord,
  type GateProjectStartMetricDecision,
  type PersistedGatePlatformDispatchTask,
} from "./gateActionReceipts.ts";
import { gatePlatformDispatchTaskFromRecord } from "./gateDispatchTaskRecords.ts";
import { persistServerGateDispatchTask } from "./gateDispatchTaskPersistence.ts";

export interface StartMetricAutoDispatchResult {
  decision: GateProjectStartMetricDecision;
  createdDispatches: PersistedGatePlatformDispatchTask[];
  skippedDispatches: PersistedGatePlatformDispatchTask[];
}

export async function autoDispatchStartMetricDecision(input: {
  projectId: string;
  platformId?: string | null;
}): Promise<StartMetricAutoDispatchResult> {
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
  const persistedTasks = taskRecords.map(gatePlatformDispatchTaskFromRecord);
  const receipts = auditRecords.map(gateActionReceiptFromAuditRecord);
  const decision = buildGateProjectStartMetricDecision(persistedTasks, receipts);
  const existingKeys = new Set(persistedTasks.map((task) => task.dispatchKey));
  const persistedByKey = new Map(persistedTasks.map((task) => [task.dispatchKey, task]));
  const dispatches = buildGateProjectStartMetricDispatchItems(decision, persistedTasks);
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

  return {
    decision,
    createdDispatches,
    skippedDispatches,
  };
}
