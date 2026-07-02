import { AppShell } from "@/components/app-shell/AppShell";
import { GateDispatchTaskCenter } from "@/components/gate/GateDispatchTaskCenter";
import { prisma } from "@/lib/db/prisma";
import type { GatePlatformGrowthDispatchState, PersistedGatePlatformDispatchTask } from "@/lib/projects/gateActionReceipts";

export const dynamic = "force-dynamic";

function parseStringList(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function state(value: string): GatePlatformGrowthDispatchState {
  if (value === "completed") return "completed";
  if (value === "assigned") return "assigned";
  return "queued";
}

function toTask(task: {
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
    databaseId: task.id,
    dispatchKey: task.dispatchKey,
    id: task.dispatchKey,
    projectId: task.projectId,
    platformId: task.platformId,
    platformName: task.platformName,
    stage: task.stage as PersistedGatePlatformDispatchTask["stage"],
    state: state(task.state),
    priorityScore: task.priorityScore,
    ownerRole: task.ownerRole,
    title: task.title,
    detail: task.detail,
    dueLabel: task.dueLabel,
    actionLabel: task.actionLabel,
    href: task.href,
    acceptanceCriteria: parseStringList(task.acceptanceCriteria),
    evidence: parseStringList(task.evidence),
    sourceReceiptId: task.sourceReceiptId,
    completionEvidence: task.completionEvidence,
    reviewLatestAt: task.reviewLatestAt.toISOString(),
    assignedAt: task.assignedAt?.toISOString() ?? null,
    completedAt: task.completedAt?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export default async function DispatchPage() {
  const tasks = await prisma.gateDispatchTask.findMany({
    orderBy: [
      { state: "asc" },
      { priorityScore: "desc" },
      { updatedAt: "desc" },
    ],
    take: 200,
  });

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">平台派单中心</h1>
          <p className="mt-1 text-sm text-slate-600">把总闸门里的平台复盘任务集中管理，按状态、平台和角色推进闭环。</p>
        </div>
        <div className="w-fit rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">
          {tasks.length ? `${tasks.length} 个派单任务` : "等待总闸门派单"}
        </div>
      </div>
      <GateDispatchTaskCenter initialTasks={tasks.map(toTask)} />
    </AppShell>
  );
}
