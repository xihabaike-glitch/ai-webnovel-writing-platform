import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export const STALE_RUNNING_TASK_AFTER_MS = 15 * 60 * 1000;

type AiTaskDatabase = Pick<typeof prisma, "aiTask">;
type AiTaskBatchDatabase = Pick<typeof prisma, "aiTask" | "chapter">;

export type AiTaskConflictCode = "AI_TASK_ALREADY_RUNNING" | "AI_TASK_SUPERSEDED";

class AiTaskConflictError extends Error {
  readonly status = 409;

  constructor(
    message: string,
    readonly code: AiTaskConflictCode,
    readonly taskId?: string,
  ) {
    super(message);
  }
}

export class AiTaskAlreadyRunningError extends AiTaskConflictError {
  constructor(
    readonly chapterId: string,
    readonly taskType: string,
  ) {
    super(
      "An AI task is already running for this chapter and task type.",
      "AI_TASK_ALREADY_RUNNING",
    );
    this.name = "AiTaskAlreadyRunningError";
  }
}

export class AiTaskSupersededError extends AiTaskConflictError {
  constructor(taskId: string) {
    super(
      "This AI task was superseded after its running lease expired; its result was not persisted.",
      "AI_TASK_SUPERSEDED",
      taskId,
    );
    this.name = "AiTaskSupersededError";
  }
}

export interface AiTaskConflictContract {
  status: 409;
  code: AiTaskConflictCode;
  error: string;
  taskId?: string;
}

export class DuplicateChapterIdsError extends Error {
  constructor() {
    super("Duplicate chapter IDs are not allowed in one batch request.");
    this.name = "DuplicateChapterIdsError";
  }
}

export class ChapterNotFoundInProjectError extends Error {
  constructor(readonly chapterId: string) {
    super("Chapter not found in project");
    this.name = "ChapterNotFoundInProjectError";
  }
}

export function assertUniqueChapterIds(chapterIds: string[]) {
  if (new Set(chapterIds).size !== chapterIds.length) {
    throw new DuplicateChapterIdsError();
  }
}

export function isStaleRunningTask(
  task: { status: string; updatedAt: Date },
  now = new Date(),
) {
  return (task.status === "queued" || task.status === "running")
    && task.updatedAt.getTime() <= now.getTime() - STALE_RUNNING_TASK_AFTER_MS;
}

export function isTaskSingleFlightConflict(error: unknown) {
  return getAiTaskConflictContract(error) !== null;
}

function isUniqueConstraintConflict(error: unknown) {
  return Boolean(
    error
    && typeof error === "object"
    && "code" in error
    && (error as { code?: unknown }).code === "P2002",
  );
}

export function getAiTaskConflictContract(error: unknown): AiTaskConflictContract | null {
  if (error instanceof AiTaskConflictError) {
    return {
      status: error.status,
      code: error.code,
      error: error.message,
      ...(error.taskId ? { taskId: error.taskId } : {}),
    };
  }
  if (isUniqueConstraintConflict(error)) {
    return {
      status: 409,
      code: "AI_TASK_ALREADY_RUNNING",
      error: "An AI task is already running for this chapter and task type.",
    };
  }
  return null;
}

export async function recoverStaleRunningTask(
  chapterId: string,
  taskType: string,
  now = new Date(),
  database: AiTaskDatabase = prisma,
) {
  const staleBefore = new Date(now.getTime() - STALE_RUNNING_TASK_AFTER_MS);
  return database.aiTask.updateMany({
    where: {
      chapterId,
      taskType,
      status: { in: ["queued", "running"] },
      updatedAt: { lte: staleBefore },
    },
    data: {
      status: "failed",
      errorMessage: "Task marked failed after exceeding the 15-minute running-task recovery threshold.",
    },
  });
}

export async function recoverStaleAiTaskAndAssertAvailable(
  chapterId: string,
  taskType: string,
  database: AiTaskDatabase = prisma,
  now = new Date(),
) {
  await recoverStaleRunningTask(chapterId, taskType, now, database);
  const activeTask = await database.aiTask.findFirst({
    where: {
      chapterId,
      taskType,
      status: { in: ["queued", "running"] },
    },
    select: { id: true },
  });
  if (activeTask) {
    throw new AiTaskAlreadyRunningError(chapterId, taskType);
  }
}

export async function preflightAiTaskBatch(
  projectId: string,
  items: Array<{ chapterId: string; taskType: string }>,
  database: AiTaskBatchDatabase = prisma,
  now = new Date(),
) {
  const chapterIds = items.map((item) => item.chapterId);
  const scopedChapters = await database.chapter.findMany({
    where: {
      projectId,
      id: { in: chapterIds },
    },
    select: { id: true },
  });
  const scopedChapterIds = new Set(scopedChapters.map((chapter) => chapter.id));
  const missingChapterId = chapterIds.find((chapterId) => !scopedChapterIds.has(chapterId));
  if (missingChapterId) {
    throw new ChapterNotFoundInProjectError(missingChapterId);
  }

  for (const item of items) {
    await recoverStaleAiTaskAndAssertAvailable(item.chapterId, item.taskType, database, now);
  }
}

export async function createRunningAiTask(
  data: Omit<Prisma.AiTaskUncheckedCreateInput, "status"> & { status?: "running" },
  database: AiTaskDatabase = prisma,
  now = new Date(),
) {
  if (data.chapterId) {
    await recoverStaleAiTaskAndAssertAvailable(data.chapterId, data.taskType, database, now);
  }

  try {
    return await database.aiTask.create({
      data: {
        ...data,
        status: "running",
      },
    });
  } catch (error) {
    if (isUniqueConstraintConflict(error) && data.chapterId) {
      throw new AiTaskAlreadyRunningError(data.chapterId, data.taskType);
    }
    throw error;
  }
}

export async function transitionRunningAiTask(
  taskId: string,
  status: "succeeded" | "failed",
  data: Omit<Prisma.AiTaskUpdateManyMutationInput, "status">,
  database: AiTaskDatabase = prisma,
) {
  const transition = await database.aiTask.updateMany({
    where: {
      id: taskId,
      status: "running",
    },
    data: {
      ...data,
      status,
    },
  });
  if (transition.count !== 1) {
    throw new AiTaskSupersededError(taskId);
  }

  return database.aiTask.findUniqueOrThrow({ where: { id: taskId } });
}
