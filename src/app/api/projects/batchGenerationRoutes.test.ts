import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { prisma } from "@/lib/db/prisma";
import { POST as postBatchDrafts } from "./[projectId]/batch-drafts/route.ts";
import { POST as postBatchReview } from "./[projectId]/batch-review/route.ts";

const chapter = {
  id: "chapter-active",
  order: 1,
  title: "Active chapter",
  wordCount: 1200,
  goal: "Advance the goal",
  hook: "Open on danger",
  conflict: "Force a choice",
  valueShift: "Safety to danger",
  cliffhanger: "Reveal the cost",
  status: "draft",
};

function replaceMethod(
  t: TestContext,
  target: Record<string, unknown>,
  methodName: string,
  implementation: (...args: unknown[]) => unknown,
) {
  const original = target[methodName];
  target[methodName] = implementation;
  t.after(() => {
    target[methodName] = original;
  });
}

function mockActiveTaskPreflight(
  t: TestContext,
  taskType: "chapter_draft" | "chapter_review",
  activeOnLookup = 1,
) {
  let chapterQueries = 0;
  let activeLookups = 0;
  replaceMethod(t, prisma.project as unknown as Record<string, unknown>, "findUnique", async () => ({
    id: "project-1",
    targetPlatform: "qidian",
  }));
  replaceMethod(t, prisma.aiTask as unknown as Record<string, unknown>, "updateMany", async () => ({ count: 0 }));
  replaceMethod(t, prisma.aiTask as unknown as Record<string, unknown>, "findFirst", async () => {
    activeLookups += 1;
    return activeLookups === activeOnLookup ? { id: "active-task" } : null;
  });
  replaceMethod(t, prisma.chapter as unknown as Record<string, unknown>, "findMany", async (args: unknown) => {
    chapterQueries += 1;
    const requestedIds = (args as { where?: { id?: { in?: string[] } } }).where?.id?.in;
    return requestedIds?.map((id) => ({ ...chapter, id })) ?? [chapter];
  });
  replaceMethod(t, prisma.aiTask as unknown as Record<string, unknown>, "findMany", async () => [{
    id: "active-task",
    chapterId: chapter.id,
    taskType,
    status: "running",
    outputText: null,
    errorMessage: null,
    createdAt: new Date(),
  }]);
  replaceMethod(t, prisma.worldEntry as unknown as Record<string, unknown>, "findMany", async () => []);
  return {
    activeLookups: () => activeLookups,
    chapterQueries: () => chapterQueries,
  };
}

test("batch draft returns 409 for an active task after stale recovery", async (t) => {
  const calls = mockActiveTaskPreflight(t, "chapter_draft");
  const response = await postBatchDrafts(new Request("http://localhost/api/projects/project-1/batch-drafts", {
    method: "POST",
    body: JSON.stringify({ chapterIds: [chapter.id], targetWords: 1200 }),
  }), { params: Promise.resolve({ projectId: "project-1" }) });

  assert.equal(response.status, 409);
  assert.equal(calls.chapterQueries(), 1);
  assert.deepEqual(await response.json(), {
    code: "AI_TASK_ALREADY_RUNNING",
    error: "An AI task is already running for this chapter and task type.",
    chapterId: chapter.id,
    results: [],
    partialCompletion: {
      occurred: false,
      completedCount: 0,
      requestedCount: 1,
      remainingCount: 1,
      completedChapterIds: [],
    },
  });
});

test("batch review returns 409 for an active task after stale recovery", async (t) => {
  const calls = mockActiveTaskPreflight(t, "chapter_review");
  const response = await postBatchReview(new Request("http://localhost/api/projects/project-1/batch-review", {
    method: "POST",
    body: JSON.stringify({ action: "review", chapterIds: [chapter.id] }),
  }), { params: Promise.resolve({ projectId: "project-1" }) });

  assert.equal(response.status, 409);
  assert.equal(calls.chapterQueries(), 1);
  assert.deepEqual(await response.json(), {
    code: "AI_TASK_ALREADY_RUNNING",
    error: "An AI task is already running for this chapter and task type.",
    chapterId: chapter.id,
    results: [],
    partialCompletion: {
      occurred: false,
      completedCount: 0,
      requestedCount: 1,
      remainingCount: 1,
      completedChapterIds: [],
    },
  });
});

test("batch draft preflights every item before queue or model work", async (t) => {
  const calls = mockActiveTaskPreflight(t, "chapter_draft", 2);
  const response = await postBatchDrafts(new Request("http://localhost/api/projects/project-1/batch-drafts", {
    method: "POST",
    body: JSON.stringify({ chapterIds: ["chapter-clear", "chapter-conflict"], targetWords: 1200 }),
  }), { params: Promise.resolve({ projectId: "project-1" }) });

  assert.equal(response.status, 409);
  assert.equal(calls.activeLookups(), 2);
  assert.equal(calls.chapterQueries(), 1);
  assert.deepEqual(await response.json(), {
    code: "AI_TASK_ALREADY_RUNNING",
    error: "An AI task is already running for this chapter and task type.",
    chapterId: "chapter-conflict",
    results: [],
    partialCompletion: {
      occurred: false,
      completedCount: 0,
      requestedCount: 2,
      remainingCount: 2,
      completedChapterIds: [],
    },
  });
});

function mockCrossProjectBatchRequest(t: TestContext, foundChapterIds: string[] = []) {
  let chapterQueries = 0;
  let recoveryMutations = 0;
  let activeTaskLookups = 0;
  replaceMethod(t, prisma.project as unknown as Record<string, unknown>, "findUnique", async () => ({
    id: "project-1",
    targetPlatform: "qidian",
  }));
  replaceMethod(t, prisma.chapter as unknown as Record<string, unknown>, "findMany", async () => {
    chapterQueries += 1;
    return foundChapterIds.map((id) => ({ id }));
  });
  replaceMethod(t, prisma.aiTask as unknown as Record<string, unknown>, "updateMany", async () => {
    recoveryMutations += 1;
    return { count: 1 };
  });
  replaceMethod(t, prisma.aiTask as unknown as Record<string, unknown>, "findFirst", async () => {
    activeTaskLookups += 1;
    return { id: "foreign-active-task" };
  });
  return {
    chapterQueries: () => chapterQueries,
    recoveryMutations: () => recoveryMutations,
    activeTaskLookups: () => activeTaskLookups,
  };
}

function crossProjectNotFoundBody(chapterId: string) {
  return {
    code: "CHAPTER_NOT_FOUND",
    error: "Chapter not found in project",
    chapterId,
    results: [],
    partialCompletion: {
      occurred: false,
      completedCount: 0,
      requestedCount: 1,
      remainingCount: 1,
      completedChapterIds: [],
    },
  };
}

function multiChapterNotFoundBody(chapterId: string) {
  return {
    ...crossProjectNotFoundBody(chapterId),
    partialCompletion: {
      occurred: false,
      completedCount: 0,
      requestedCount: 3,
      remainingCount: 3,
      completedChapterIds: [],
    },
  };
}

test("batch draft rejects a cross-project chapter before stale recovery", async (t) => {
  const calls = mockCrossProjectBatchRequest(t);
  const response = await postBatchDrafts(new Request("http://localhost/api/projects/project-1/batch-drafts", {
    method: "POST",
    body: JSON.stringify({ chapterIds: ["chapter-foreign"], targetWords: 1200 }),
  }), { params: Promise.resolve({ projectId: "project-1" }) });

  assert.equal(response.status, 404);
  assert.equal(calls.chapterQueries(), 1);
  assert.equal(calls.recoveryMutations(), 0);
  assert.equal(calls.activeTaskLookups(), 0);
  assert.deepEqual(await response.json(), crossProjectNotFoundBody("chapter-foreign"));
});

test("batch review rejects a cross-project chapter before stale recovery", async (t) => {
  const calls = mockCrossProjectBatchRequest(t);
  const response = await postBatchReview(new Request("http://localhost/api/projects/project-1/batch-review", {
    method: "POST",
    body: JSON.stringify({ action: "review", chapterIds: ["chapter-foreign"] }),
  }), { params: Promise.resolve({ projectId: "project-1" }) });

  assert.equal(response.status, 404);
  assert.equal(calls.chapterQueries(), 1);
  assert.equal(calls.recoveryMutations(), 0);
  assert.equal(calls.activeTaskLookups(), 0);
  assert.deepEqual(await response.json(), crossProjectNotFoundBody("chapter-foreign"));
});

test("batch draft returns the first missing chapter id instead of the first requested id", async (t) => {
  const calls = mockCrossProjectBatchRequest(t, ["chapter-own"]);
  const response = await postBatchDrafts(new Request("http://localhost/api/projects/project-1/batch-drafts", {
    method: "POST",
    body: JSON.stringify({
      chapterIds: ["chapter-own", "chapter-foreign", "chapter-missing"],
      targetWords: 1200,
    }),
  }), { params: Promise.resolve({ projectId: "project-1" }) });

  assert.equal(response.status, 404);
  assert.equal(calls.recoveryMutations(), 0);
  assert.equal(calls.activeTaskLookups(), 0);
  assert.deepEqual(await response.json(), multiChapterNotFoundBody("chapter-foreign"));
});

test("batch review returns the first missing chapter id instead of the first requested id", async (t) => {
  const calls = mockCrossProjectBatchRequest(t, ["chapter-own"]);
  const response = await postBatchReview(new Request("http://localhost/api/projects/project-1/batch-review", {
    method: "POST",
    body: JSON.stringify({
      action: "review",
      chapterIds: ["chapter-own", "chapter-foreign", "chapter-missing"],
    }),
  }), { params: Promise.resolve({ projectId: "project-1" }) });

  assert.equal(response.status, 404);
  assert.equal(calls.recoveryMutations(), 0);
  assert.equal(calls.activeTaskLookups(), 0);
  assert.deepEqual(await response.json(), multiChapterNotFoundBody("chapter-foreign"));
});
