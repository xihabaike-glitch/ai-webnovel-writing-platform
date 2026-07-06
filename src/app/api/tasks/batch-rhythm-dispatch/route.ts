import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { persistServerGateDispatchTask } from "@/lib/projects/gateDispatchTaskPersistence";
import { gatePlatformDispatchTaskFromRecord } from "@/lib/projects/gateDispatchTaskRecords";
import { autoDispatchTaskQueueBatchRhythm } from "@/lib/projects/taskQueueBatchHealth";

export async function POST() {
  const [audits, existingTaskRecords] = await Promise.all([
    prisma.gateActionAudit.findMany({
      where: { executionType: "recommended_batch" },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        receiptId: true,
        actionId: true,
        executionType: true,
        status: true,
        label: true,
        detail: true,
        href: true,
        message: true,
        succeededCount: true,
        failedCount: true,
        taskId: true,
        platformId: true,
        platformName: true,
        recheckStatus: true,
        recheckLabel: true,
        recheckDetail: true,
        recheckAction: true,
        payload: true,
        createdAt: true,
      },
    }),
    prisma.gateDispatchTask.findMany({
      where: { dispatchKey: { startsWith: "batch-rhythm:" } },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const result = await autoDispatchTaskQueueBatchRhythm({
    audits,
    existingTasks: existingTaskRecords.map(gatePlatformDispatchTaskFromRecord),
    persist: persistServerGateDispatchTask,
  });
  const task = result.createdTask ?? result.skippedTask;

  return NextResponse.json({
    status: result.status,
    decision: result.decision,
    dispatch: result.dispatch,
    task: task
      ? {
        dispatchKey: task.dispatchKey,
        stage: task.stage,
        state: task.state,
        title: task.title,
        href: task.href,
        actionLabel: task.actionLabel,
      }
      : null,
    message: result.status === "created"
      ? `已生成批次节奏派单：${task?.title ?? result.dispatch?.title ?? "待处理"}。`
      : result.status === "skipped"
        ? `已有批次节奏派单：${task?.title ?? result.dispatch?.title ?? "待处理"}。`
        : "当前批次节奏可以继续推进，不需要新增派单。",
  }, { status: result.status === "created" ? 201 : 200 });
}
