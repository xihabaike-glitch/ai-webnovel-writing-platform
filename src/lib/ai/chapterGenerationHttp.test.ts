import assert from "node:assert/strict";
import test from "node:test";
import { AiTaskAlreadyRunningError, AiTaskSupersededError } from "./taskSingleFlight.ts";

const httpErrors = await import("./chapterGenerationHttp.ts").catch(() => null);

test("maps chapter generation domain errors to stable HTTP contracts", () => {
  assert.ok(httpErrors, "chapter generation HTTP mapper must exist");

  assert.deepEqual(
    httpErrors.mapChapterGenerationError(new AiTaskAlreadyRunningError("chapter-1", "chapter_draft")),
    {
      status: 409,
      body: {
        code: "AI_TASK_ALREADY_RUNNING",
        error: "An AI task is already running for this chapter and task type.",
      },
    },
  );
  assert.deepEqual(
    httpErrors.mapChapterGenerationError(new AiTaskSupersededError("task-1")),
    {
      status: 409,
      body: {
        code: "AI_TASK_SUPERSEDED",
        error: "This AI task was superseded after its running lease expired; its result was not persisted.",
        taskId: "task-1",
      },
    },
  );
  assert.deepEqual(
    httpErrors.mapChapterGenerationError(new Error("Chapter not found")),
    {
      status: 404,
      body: {
        code: "CHAPTER_NOT_FOUND",
        error: "Chapter not found",
      },
    },
  );
  assert.deepEqual(
    httpErrors.mapChapterGenerationError(new Error("Project not found")),
    {
      status: 404,
      body: {
        code: "PROJECT_NOT_FOUND",
        error: "Project not found",
      },
    },
  );
  assert.deepEqual(
    httpErrors.mapChapterGenerationError(new Error("Task not found")),
    {
      status: 404,
      body: {
        code: "TASK_NOT_FOUND",
        error: "Task not found",
      },
    },
  );
});

test("maps budget failures to a stable 429 body", () => {
  assert.ok(httpErrors, "chapter generation HTTP mapper must exist");
  const task = { id: "budget-task", status: "failed" };
  const budgetGuard = { allowed: false, status: "block" };

  assert.deepEqual(
    httpErrors.mapChapterGenerationFailure({
      task,
      error: "预算拦截：本次任务超过预算。",
      budgetGuard,
    }),
    {
      status: 429,
      body: {
        code: "AI_BUDGET_EXCEEDED",
        error: "预算拦截：本次任务超过预算。",
        task,
        budgetGuard,
      },
    },
  );
});

test("batch race conflicts expose completed results and partial-completion evidence", () => {
  assert.ok(httpErrors, "chapter generation HTTP mapper must exist");
  const completedResults = [{ chapterId: "chapter-1", status: "succeeded", taskId: "task-1" }];

  assert.deepEqual(
    httpErrors.mapBatchChapterGenerationError(
      new AiTaskAlreadyRunningError("chapter-2", "chapter_draft"),
      {
        chapterId: "chapter-2",
        requestedCount: 3,
        completedResults,
      },
    ),
    {
      status: 409,
      body: {
        code: "AI_TASK_ALREADY_RUNNING",
        error: "An AI task is already running for this chapter and task type.",
        chapterId: "chapter-2",
        results: completedResults,
        partialCompletion: {
          occurred: true,
          completedCount: 1,
          requestedCount: 3,
          remainingCount: 2,
          completedChapterIds: ["chapter-1"],
        },
      },
    },
  );
});

test("batch budget failures preserve completed results in the 429 body", () => {
  assert.ok(httpErrors, "chapter generation HTTP mapper must exist");
  const completedResults = [{ chapterId: "chapter-1", status: "succeeded", taskId: "task-1" }];
  const task = { id: "budget-task", status: "failed" };
  const budgetGuard = { allowed: false, status: "block" };

  assert.deepEqual(
    httpErrors.mapBatchChapterGenerationFailure(
      { task, error: "预算拦截：批次预算已用完。", budgetGuard },
      {
        chapterId: "chapter-2",
        requestedCount: 2,
        completedResults,
      },
    ),
    {
      status: 429,
      body: {
        code: "AI_BUDGET_EXCEEDED",
        error: "预算拦截：批次预算已用完。",
        task,
        budgetGuard,
        chapterId: "chapter-2",
        results: completedResults,
        partialCompletion: {
          occurred: true,
          completedCount: 1,
          requestedCount: 2,
          remainingCount: 1,
          completedChapterIds: ["chapter-1"],
        },
      },
    },
  );
});
