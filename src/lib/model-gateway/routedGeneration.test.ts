import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const directory = await mkdtemp(join(tmpdir(), "routed-generation-"));
process.env.DATABASE_URL = `file:${join(directory, "test.db")}`;

const { prisma } = await import("../db/prisma.ts");
const { runRoutedGeneration } = await import("./routedGeneration.ts");
const {
  AiTaskAlreadyRunningError,
  AiTaskSupersededError,
  createRunningAiTask,
  getAiTaskConflictContract,
  STALE_RUNNING_TASK_AFTER_MS,
} = await import("../ai/taskSingleFlight.ts");
const { MockAdapter } = await import("./mockAdapter.ts");

await prisma.$executeRawUnsafe(`
  CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "aiMonthlyBudgetUsd" REAL NOT NULL DEFAULT 5,
    "aiMaxTaskCostUsd" REAL NOT NULL DEFAULT 0.25,
    "aiMaxBatchCostUsd" REAL NOT NULL DEFAULT 1,
    "aiMaxFailureRatePercent" INTEGER NOT NULL DEFAULT 20,
    "aiBudgetEnforcement" TEXT NOT NULL DEFAULT 'block'
  )
`);
await prisma.$executeRawUnsafe(`
  CREATE TABLE "ModelProvider" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "baseUrl" TEXT,
    "encryptedApiKey" TEXT,
    "defaultModel" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "maxContextTokens" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);
await prisma.$executeRawUnsafe(`
  CREATE TABLE "ModelTaskRoute" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskType" TEXT NOT NULL UNIQUE,
    "primaryProviderConfigId" TEXT,
    "fallbackProviderConfigId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);
await prisma.$executeRawUnsafe(`
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
await prisma.$executeRawUnsafe(`
  CREATE UNIQUE INDEX "AiTask_chapterId_taskType_active_key"
  ON "AiTask"("chapterId", "taskType")
  WHERE "chapterId" IS NOT NULL AND "status" IN ('queued', 'running')
`);
await prisma.$executeRawUnsafe(`
  CREATE TABLE "RequiredOutput" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL
  )
`);
await prisma.$executeRawUnsafe(`
  INSERT INTO "Project" ("id") VALUES ('project-1')
`);
await prisma.$executeRawUnsafe(`
  INSERT INTO "ModelProvider" ("id", "providerId", "displayName", "defaultModel")
  VALUES ('mock-provider', 'mock', 'Mock Provider', 'mock-writer')
`);

test.after(async () => {
  await prisma.$disconnect();
  await rm(directory, { recursive: true, force: true });
});

function generateFor(chapterId: string) {
  return runRoutedGeneration({
    projectId: "project-1",
    chapterId,
    taskType: "chapter_review",
    inputSnapshot: { chapterId },
    request: {
      systemPrompt: "Review this chapter.",
      userPrompt: "Return the review JSON.",
    },
  });
}

test("routed generation recovers expired work before creating the replacement task", async () => {
  const staleTask = await prisma.aiTask.create({
    data: {
      id: "stale-task",
      projectId: "project-1",
      chapterId: "chapter-stale",
      taskType: "chapter_review",
      providerConfigId: "mock-provider",
      model: "mock-writer",
      status: "running",
      inputSnapshot: "{}",
      updatedAt: new Date(Date.now() - STALE_RUNNING_TASK_AFTER_MS),
    },
  });

  const generation = await generateFor(staleTask.chapterId!);
  assert.equal(generation.ok, true);
  if (!generation.ok) return;

  const recovered = await prisma.aiTask.findUniqueOrThrow({ where: { id: staleTask.id } });
  assert.equal(recovered.status, "failed");
  assert.equal(generation.task.status, "succeeded");
  assert.notEqual(generation.task.id, staleTask.id);
});

test("routed generation exposes a live task as the direct-route 409 conflict contract", async () => {
  await prisma.aiTask.create({
    data: {
      id: "active-task",
      projectId: "project-1",
      chapterId: "chapter-active",
      taskType: "chapter_review",
      providerConfigId: "mock-provider",
      model: "mock-writer",
      status: "running",
      inputSnapshot: "{}",
      updatedAt: new Date(),
    },
  });

  await assert.rejects(
    generateFor("chapter-active"),
    (error: unknown) => {
      assert.ok(error instanceof AiTaskAlreadyRunningError);
      assert.deepEqual(getAiTaskConflictContract(error), {
        status: 409,
        code: "AI_TASK_ALREADY_RUNNING",
        error: "An AI task is already running for this chapter and task type.",
      });
      return true;
    },
  );
});

test("routed generation rolls back required output and fails the task when success persistence fails", async () => {
  await prisma.$executeRawUnsafe(`UPDATE "Project" SET "aiMaxFailureRatePercent" = 100 WHERE "id" = 'project-1'`);
  const generation = await runRoutedGeneration({
    projectId: "project-1",
    chapterId: "chapter-persistence-failure",
    taskType: "chapter_review",
    inputSnapshot: { chapterId: "chapter-persistence-failure" },
    request: {
      systemPrompt: "Review this chapter.",
      userPrompt: "Return the review JSON.",
    },
    persistSuccess: async ({ transaction, task }) => {
      await transaction.$executeRawUnsafe(
        `INSERT INTO "RequiredOutput" ("id", "taskId") VALUES ('partial-output', '${task.id}')`,
      );
      throw new Error("required output persistence failed");
    },
  });

  assert.equal(generation.ok, false);
  assert.match(generation.error, /required output persistence failed/);
  assert.equal(generation.task.status, "failed");
  assert.equal(generation.task.outputText, null);

  const storedTask = await prisma.aiTask.findUniqueOrThrow({ where: { id: generation.task.id } });
  const partialOutputCount = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*) AS count FROM "RequiredOutput" WHERE "taskId" = '${generation.task.id}'`,
  );
  assert.equal(storedTask.status, "failed");
  assert.equal(storedTask.outputText, null);
  assert.equal(Number(partialOutputCount[0]?.count ?? 0), 0);
});

test("routed generation treats downstream unique failures as persistence failures, not task conflicts", async () => {
  const generation = await runRoutedGeneration({
    projectId: "project-1",
    chapterId: "chapter-persistence-unique-failure",
    taskType: "chapter_review",
    inputSnapshot: { chapterId: "chapter-persistence-unique-failure" },
    request: {
      systemPrompt: "Review this chapter.",
      userPrompt: "Return the review JSON.",
    },
    persistSuccess: async ({ transaction, task }) => {
      await transaction.$executeRawUnsafe(
        `INSERT INTO "RequiredOutput" ("id", "taskId") VALUES ('unique-partial-output', '${task.id}')`,
      );
      throw { code: "P2002" };
    },
  });

  assert.equal(generation.ok, false);
  assert.equal(generation.task.status, "failed");
  const partialOutputCount = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*) AS count FROM "RequiredOutput" WHERE "taskId" = '${generation.task.id}'`,
  );
  assert.equal(Number(partialOutputCount[0]?.count ?? 0), 0);
});

test("a superseded late first-three rewrite cannot persist output or overwrite its recovered failure", async (t) => {
  let resolveGeneration: (result: { text: string; usage: { inputTokens: number; outputTokens: number; costUsd: number } }) => void = () => {
    throw new Error("Generation did not start");
  };
  let markGenerationStarted: (() => void) | null = null;
  const generationStarted = new Promise<void>((resolve) => {
    markGenerationStarted = resolve;
  });
  const originalGenerate = MockAdapter.prototype.generate;
  MockAdapter.prototype.generate = async () => new Promise((resolve) => {
    resolveGeneration = resolve;
    markGenerationStarted?.();
  });
  t.after(() => {
    MockAdapter.prototype.generate = originalGenerate;
  });

  const lateGeneration = runRoutedGeneration({
    projectId: "project-1",
    chapterId: "chapter-first-three-late",
    taskType: "first_three_rewrite",
    inputSnapshot: { chapterId: "chapter-first-three-late" },
    request: {
      systemPrompt: "Rewrite the opening chapters.",
      userPrompt: "Return the rewritten chapter.",
    },
    persistSuccess: async ({ transaction, task }) => {
      await transaction.$executeRawUnsafe(
        `INSERT INTO "RequiredOutput" ("id", "taskId") VALUES ('late-first-three-output', '${task.id}')`,
      );
      return { outputId: "late-first-three-output" };
    },
  });

  await generationStarted;
  const staleTask = await prisma.aiTask.findFirstOrThrow({
    where: {
      chapterId: "chapter-first-three-late",
      taskType: "first_three_rewrite",
      status: "running",
    },
  });
  const recoveryNow = new Date(Date.now() + STALE_RUNNING_TASK_AFTER_MS + 1_000);
  await prisma.aiTask.update({
    where: { id: staleTask.id },
    data: { updatedAt: new Date(recoveryNow.getTime() - STALE_RUNNING_TASK_AFTER_MS) },
  });
  const replacement = await createRunningAiTask({
    id: "replacement-first-three-task",
    projectId: "project-1",
    chapterId: "chapter-first-three-late",
    taskType: "first_three_rewrite",
    providerConfigId: "mock-provider",
    model: "mock-writer",
    inputSnapshot: "{}",
  }, prisma, recoveryNow);

  resolveGeneration({
    text: "Late rewrite result",
    usage: { inputTokens: 10, outputTokens: 20, costUsd: 0.01 },
  });

  await assert.rejects(lateGeneration, (error: unknown) => {
    assert.ok(error instanceof AiTaskSupersededError);
    assert.deepEqual(getAiTaskConflictContract(error), {
      status: 409,
      code: "AI_TASK_SUPERSEDED",
      error: "This AI task was superseded after its running lease expired; its result was not persisted.",
      taskId: staleTask.id,
    });
    return true;
  });

  const [storedStaleTask, outputCount] = await Promise.all([
    prisma.aiTask.findUniqueOrThrow({ where: { id: staleTask.id } }),
    prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*) AS count FROM "RequiredOutput" WHERE "id" = 'late-first-three-output'`,
    ),
  ]);
  assert.equal(storedStaleTask.status, "failed");
  assert.equal(storedStaleTask.outputText, null);
  assert.equal(Number(outputCount[0]?.count ?? 0), 0);
  assert.equal(replacement.status, "running");
});
