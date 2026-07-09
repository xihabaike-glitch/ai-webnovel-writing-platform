import { getAiTaskConflictContract } from "./taskSingleFlight.ts";

export type ChapterGenerationHttpStatus = 404 | 409 | 429 | 500;

export interface ChapterGenerationHttpResult {
  status: ChapterGenerationHttpStatus;
  body: Record<string, unknown> & { error: string };
}

export interface GenerationFailureLike {
  task: unknown;
  error?: string | null;
  budgetGuard?: unknown;
}

export class ChapterGenerationFailureError extends Error {
  constructor(readonly failure: GenerationFailureLike) {
    super(failure.error ?? "AI generation failed");
    this.name = "ChapterGenerationFailureError";
  }
}

interface BatchGenerationErrorContext {
  chapterId: string;
  requestedCount: number;
  completedResults: readonly unknown[];
}

const notFoundContracts = new Map<string, { code: string; error: string }>([
  ["Chapter not found", { code: "CHAPTER_NOT_FOUND", error: "Chapter not found" }],
  ["Chapter not found in project", { code: "CHAPTER_NOT_FOUND", error: "Chapter not found in project" }],
  ["Project not found", { code: "PROJECT_NOT_FOUND", error: "Project not found" }],
  ["Task not found", { code: "TASK_NOT_FOUND", error: "Task not found" }],
]);

function errorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error.message : fallbackMessage;
}

function completedChapterIds(results: readonly unknown[]) {
  return results.flatMap((result) => (
    result
    && typeof result === "object"
    && "chapterId" in result
    && typeof result.chapterId === "string"
      ? [result.chapterId]
      : []
  ));
}

export function mapChapterGenerationError(
  error: unknown,
  fallbackMessage = "AI generation failed",
): ChapterGenerationHttpResult {
  if (error instanceof ChapterGenerationFailureError) {
    return mapChapterGenerationFailure(error.failure);
  }
  const conflict = getAiTaskConflictContract(error);
  if (conflict) {
    const { status, ...body } = conflict;
    return { status, body };
  }

  const message = errorMessage(error, fallbackMessage);
  const notFound = notFoundContracts.get(message);
  if (notFound) {
    return {
      status: 404,
      body: notFound,
    };
  }

  return {
    status: 500,
    body: {
      code: "AI_GENERATION_FAILED",
      error: message,
    },
  };
}

export function mapChapterGenerationFailure(failure: GenerationFailureLike): ChapterGenerationHttpResult {
  const message = failure.error ?? "AI generation failed";
  if (failure.budgetGuard || message.startsWith("预算拦截")) {
    return {
      status: 429,
      body: {
        code: "AI_BUDGET_EXCEEDED",
        error: message,
        task: failure.task,
        ...(failure.budgetGuard ? { budgetGuard: failure.budgetGuard } : {}),
      },
    };
  }

  return {
    status: 500,
    body: {
      code: "AI_GENERATION_FAILED",
      error: message,
      task: failure.task,
    },
  };
}

export function mapBatchChapterGenerationError(
  error: unknown,
  context: BatchGenerationErrorContext,
): ChapterGenerationHttpResult {
  return withBatchContext(mapChapterGenerationError(error), context);
}

export function mapBatchChapterGenerationFailure(
  failure: GenerationFailureLike,
  context: BatchGenerationErrorContext,
): ChapterGenerationHttpResult {
  return withBatchContext(mapChapterGenerationFailure(failure), context);
}

function withBatchContext(
  mapped: ChapterGenerationHttpResult,
  context: BatchGenerationErrorContext,
): ChapterGenerationHttpResult {
  const completedCount = context.completedResults.length;
  return {
    status: mapped.status,
    body: {
      ...mapped.body,
      chapterId: context.chapterId,
      results: context.completedResults,
      partialCompletion: {
        occurred: completedCount > 0,
        completedCount,
        requestedCount: context.requestedCount,
        remainingCount: Math.max(0, context.requestedCount - completedCount),
        completedChapterIds: completedChapterIds(context.completedResults),
      },
    },
  };
}
