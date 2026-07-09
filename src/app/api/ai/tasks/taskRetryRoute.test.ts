import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { prisma } from "@/lib/db/prisma";
import { POST } from "./[taskId]/retry/route.ts";

function replaceTaskLookup(t: TestContext, result: unknown) {
  const delegate = prisma.aiTask as unknown as Record<string, unknown>;
  const original = delegate.findUnique;
  delegate.findUnique = async () => result;
  t.after(() => {
    delegate.findUnique = original;
  });
}

test("retry returns a stable 404 when the task is missing", async (t) => {
  replaceTaskLookup(t, null);
  const response = await POST(new Request("http://localhost/api/ai/tasks/missing/retry", {
    method: "POST",
    body: "{}",
  }), { params: Promise.resolve({ taskId: "missing" }) });

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    code: "TASK_NOT_FOUND",
    error: "Task not found",
  });
});

test("retry returns a stable 404 when the stored task has no chapter", async (t) => {
  replaceTaskLookup(t, {
    id: "orphaned-task",
    projectId: "project-1",
    chapterId: null,
    taskType: "chapter_review",
    providerConfigId: "provider-1",
    model: "model-1",
    status: "failed",
    inputSnapshot: "{}",
    outputText: null,
    inputTokens: null,
    outputTokens: null,
    costUsd: null,
    errorMessage: "Chapter deleted",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const response = await POST(new Request("http://localhost/api/ai/tasks/orphaned-task/retry", {
    method: "POST",
    body: "{}",
  }), { params: Promise.resolve({ taskId: "orphaned-task" }) });

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    code: "CHAPTER_NOT_FOUND",
    error: "Chapter not found",
  });
});
