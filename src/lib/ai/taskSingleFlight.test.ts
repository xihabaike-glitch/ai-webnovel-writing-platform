import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import {
  AiTaskAlreadyRunningError,
  AiTaskSupersededError,
  assertUniqueChapterIds,
  ChapterNotFoundInProjectError,
  createRunningAiTask,
  getAiTaskConflictContract,
  isStaleRunningTask,
  preflightAiTaskBatch,
  recoverStaleRunningTask,
  STALE_RUNNING_TASK_AFTER_MS,
  transitionRunningAiTask,
} from "./taskSingleFlight.ts";

async function createTaskDatabase() {
  const directory = await mkdtemp(join(tmpdir(), "ai-task-single-flight-"));
  const database = new PrismaClient({ datasourceUrl: `file:${join(directory, "test.db")}` });
  await database.$executeRawUnsafe(`
    CREATE TABLE "AiTask" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "projectId" TEXT NOT NULL,
      "chapterId" TEXT,
      "taskType" TEXT NOT NULL,
      "providerConfigId" TEXT NOT NULL,
      "model" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'queued',
      "inputSnapshot" TEXT NOT NULL,
      "outputText" TEXT,
      "inputTokens" INTEGER,
      "outputTokens" INTEGER,
      "costUsd" REAL,
      "errorMessage" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await database.$executeRawUnsafe(`
    CREATE UNIQUE INDEX "AiTask_chapterId_taskType_active_key"
    ON "AiTask"("chapterId", "taskType")
    WHERE "chapterId" IS NOT NULL AND "status" IN ('queued', 'running')
  `);

  return {
    database,
    async cleanup() {
      await database.$disconnect();
      await rm(directory, { recursive: true, force: true });
    },
  };
}

test("rejects duplicate chapter ids before dispatch", () => {
  assert.throws(() => assertUniqueChapterIds(["chapter-1", "chapter-2", "chapter-1"]), /Duplicate chapter IDs/);
});

test("permits unique chapter ids", () => {
  assert.doesNotThrow(() => assertUniqueChapterIds(["chapter-1", "chapter-2"]));
});

test("batch preflight validates every chapter against the project before task recovery", async () => {
  let recoveryMutations = 0;
  let activeTaskLookups = 0;
  const database = {
    chapter: {
      findMany: async (args: unknown) => {
        assert.deepEqual(args, {
          where: {
            projectId: "project-1",
            id: { in: ["chapter-own", "chapter-foreign"] },
          },
          select: { id: true },
        });
        return [{ id: "chapter-own" }];
      },
    },
    aiTask: {
      updateMany: async () => {
        recoveryMutations += 1;
        return { count: 1 };
      },
      findFirst: async () => {
        activeTaskLookups += 1;
        return { id: "foreign-task" };
      },
    },
  };

  await assert.rejects(
    preflightAiTaskBatch("project-1", [
      { chapterId: "chapter-own", taskType: "chapter_draft" },
      { chapterId: "chapter-foreign", taskType: "chapter_draft" },
    ], database as never),
    (error: unknown) => {
      assert.ok(error instanceof ChapterNotFoundInProjectError);
      assert.equal(error.chapterId, "chapter-foreign");
      assert.match(error.message, /Chapter not found in project/);
      return true;
    },
  );
  assert.equal(recoveryMutations, 0);
  assert.equal(activeTaskLookups, 0);
});

test("treats only expired queued or running tasks as recoverable", () => {
  const now = new Date("2026-07-10T10:00:00.000Z");
  assert.equal(isStaleRunningTask({ status: "running", updatedAt: new Date(now.getTime() - STALE_RUNNING_TASK_AFTER_MS) }, now), true);
  assert.equal(isStaleRunningTask({ status: "running", updatedAt: new Date(now.getTime() - STALE_RUNNING_TASK_AFTER_MS + 1) }, now), false);
  assert.equal(isStaleRunningTask({ status: "succeeded", updatedAt: new Date(0) }, now), false);
});

test("a stale recovered task cannot commit success or reach downstream persistence", async (t) => {
  const { database, cleanup } = await createTaskDatabase();
  t.after(cleanup);
  const now = new Date("2026-07-10T10:00:00.000Z");
  const task = await database.aiTask.create({
    data: {
      id: "stale-task",
      projectId: "project-1",
      chapterId: "chapter-1",
      taskType: "chapter_draft",
      providerConfigId: "provider-1",
      model: "model-1",
      status: "running",
      inputSnapshot: "{}",
      updatedAt: new Date(now.getTime() - STALE_RUNNING_TASK_AFTER_MS),
    },
  });

  const recovered = await recoverStaleRunningTask(task.chapterId!, task.taskType, now, database);
  assert.equal(recovered.count, 1);

  let downstreamPersisted = false;
  await assert.rejects(
    async () => {
      await transitionRunningAiTask(task.id, "succeeded", { outputText: "late result" }, database);
      downstreamPersisted = true;
    },
    (error: unknown) => {
      assert.ok(error instanceof AiTaskSupersededError);
      const contract = getAiTaskConflictContract(error);
      assert.equal(contract?.status, 409);
      assert.equal(contract?.code, "AI_TASK_SUPERSEDED");
      return true;
    },
  );

  const stored = await database.aiTask.findUniqueOrThrow({ where: { id: task.id } });
  assert.equal(stored.status, "failed");
  assert.equal(stored.outputText, null);
  assert.equal(downstreamPersisted, false);
});

test("running task creation recovers stale work and returns a stable active conflict", async (t) => {
  const { database, cleanup } = await createTaskDatabase();
  t.after(cleanup);
  const now = new Date("2026-07-10T10:00:00.000Z");
  const baseData = {
    projectId: "project-1",
    chapterId: "chapter-1",
    taskType: "chapter_review",
    providerConfigId: "provider-1",
    model: "model-1",
    status: "running",
    inputSnapshot: "{}",
  } as const;
  await database.aiTask.create({ data: { id: "active-task", ...baseData, updatedAt: now } });

  const conflict = await createRunningAiTask({ id: "blocked-task", ...baseData }, database, now)
    .then(() => null, (error: unknown) => error);
  assert.ok(conflict instanceof AiTaskAlreadyRunningError);
  assert.equal(getAiTaskConflictContract(conflict)?.status, 409);
  assert.equal(getAiTaskConflictContract(conflict)?.code, "AI_TASK_ALREADY_RUNNING");

  await database.aiTask.update({
    where: { id: "active-task" },
    data: { updatedAt: new Date(now.getTime() - STALE_RUNNING_TASK_AFTER_MS) },
  });
  const replacement = await createRunningAiTask({ id: "replacement-task", ...baseData }, database, now);
  const recovered = await database.aiTask.findUniqueOrThrow({ where: { id: "active-task" } });
  assert.equal(recovered.status, "failed");
  assert.equal(replacement.status, "running");
});
