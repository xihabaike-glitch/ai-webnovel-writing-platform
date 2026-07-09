import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { prisma } from "@/lib/db/prisma";
import { POST as postControlAction } from "./[projectId]/control-actions/route.ts";
import { POST as postFirstThreeRewrite } from "./[projectId]/first-three-rewrite/generate/route.ts";

const now = new Date("2026-07-10T10:00:00.000Z");
const chapterOrderConflictBody = {
  code: "CHAPTER_ORDER_CONFLICT",
  error: "Chapter order changed while chapters were being created. Reload and retry.",
  reload: true,
};

function replaceMethod(
  t: TestContext,
  target: Record<string, unknown>,
  methodName: string,
  implementation: (...args: never[]) => unknown,
) {
  const original = target[methodName];
  target[methodName] = implementation;
  t.after(() => {
    target[methodName] = original;
  });
}

function projectFixture(chapters: Array<Record<string, unknown>> = []) {
  return {
    id: "project-1",
    title: "Concurrency Story",
    targetPlatform: "qidian",
    targetLengthType: "long",
    targetWordCount: 100_000,
    currentWordCount: 0,
    genre: "都市",
    sellingPoint: "倒计时翻盘",
    updateCadence: "daily",
    aiMonthlyBudgetUsd: 5,
    aiMaxTaskCostUsd: 0.25,
    aiMaxBatchCostUsd: 1,
    aiMaxFailureRatePercent: 100,
    aiBudgetEnforcement: "block",
    createdAt: now,
    updatedAt: now,
    chapters,
    aiTasks: [],
    publishSnapshots: [],
    characters: [],
    foreshadows: [],
    plotThreads: [],
    submissionAssets: [],
    submissionAssetVersions: [],
    platformPublishMetrics: [],
    worldEntries: [],
    gateDispatchTasks: [],
    gateActionAudits: [],
    outlineNodes: [{
      id: "outline-1",
      projectId: "project-1",
      parentId: null,
      chapterId: null,
      type: "opening",
      title: "雨夜倒计时",
      summary: "主角在雨夜被迫做出选择。",
      goal: "活过倒计时",
      hook: "系统只剩十秒",
      conflict: "救人还是自保",
      valueShift: "被动到主动",
      platformNote: "强钩子",
      order: 1,
      depth: 0,
      status: "planned",
      createdAt: now,
      updatedAt: now,
    }],
  };
}

function chapterFixture(order = 1) {
  return {
    id: `chapter-${order}`,
    projectId: "project-1",
    volumeId: null,
    order,
    title: `第 ${order} 章`,
    content: "雨夜里，倒计时开始了。",
    wordCount: 12,
    goal: "活过倒计时",
    hook: "系统只剩十秒",
    conflict: "救人还是自保",
    valueShift: "被动到主动",
    cliffhanger: "门外的人是谁",
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
}

function mockProviderSelection(t: TestContext) {
  replaceMethod(t, prisma.modelProvider as unknown as Record<string, unknown>, "findMany", async () => [{
    id: "mock-provider",
    providerId: "mock",
    displayName: "Mock Provider",
    baseUrl: null,
    encryptedApiKey: null,
    defaultModel: "mock-writer",
    enabled: true,
    maxContextTokens: null,
    createdAt: now,
    updatedAt: now,
  }]);
  replaceMethod(t, prisma.modelTaskRoute as unknown as Record<string, unknown>, "findUnique", async () => null);
}

test("control action chapter creation returns a stable reload conflict after allocator retries", async (t) => {
  let transactionAttempts = 0;
  replaceMethod(t, prisma.project as unknown as Record<string, unknown>, "findUnique", async () => projectFixture());
  replaceMethod(t, prisma as unknown as Record<string, unknown>, "$transaction", async () => {
    transactionAttempts += 1;
    throw { code: "P2002" };
  });

  const response = await postControlAction(new Request("http://localhost/api/projects/project-1/control-actions", {
    method: "POST",
    body: JSON.stringify({ areaId: "production", mode: "seed" }),
  }), { params: Promise.resolve({ projectId: "project-1" }) });

  assert.equal(response.status, 409);
  assert.equal(transactionAttempts, 3);
  assert.deepEqual(await response.json(), chapterOrderConflictBody);
});

test("control action allocates each seed transactionally and rolls back a lost outline claim", async (t) => {
  const project = projectFixture();
  project.outlineNodes.push({
    ...project.outlineNodes[0],
    id: "outline-2",
    type: "trunk",
    title: "第二次选择",
    order: 2,
  });
  const persistedChapters: Array<Record<string, unknown>> = [];
  const attemptedChapters: Array<Record<string, unknown>> = [];
  const claims: unknown[] = [];
  let transactionCalls = 0;

  replaceMethod(t, prisma.project as unknown as Record<string, unknown>, "findUnique", async () => project);
  replaceMethod(t, prisma.chapter as unknown as Record<string, unknown>, "findMany", async () => persistedChapters);
  replaceMethod(t, prisma.aiTask as unknown as Record<string, unknown>, "findMany", async () => []);
  replaceMethod(t, prisma as unknown as Record<string, unknown>, "$transaction", async (callback: never) => {
    transactionCalls += 1;
    const pending: Array<Record<string, unknown>> = [];
    const transaction = {
      chapter: {
        aggregate: async () => ({
          _max: {
            order: persistedChapters.reduce((maximum, chapter) => Math.max(maximum, Number(chapter.order)), 4),
          },
        }),
        create: async (args: { data: Record<string, unknown> }) => {
          attemptedChapters.push(args.data);
          const created = {
            id: `chapter-attempt-${attemptedChapters.length}`,
            volumeId: null,
            content: "",
            wordCount: 0,
            createdAt: now,
            updatedAt: now,
            ...args.data,
          };
          pending.push(created);
          return created;
        },
      },
      outlineNode: {
        update: async () => ({ id: "unconditional-overwrite" }),
        updateMany: async (args: unknown) => {
          claims.push(args);
          const outlineNodeId = (args as { where: { id: string } }).where.id;
          return { count: outlineNodeId === "outline-1" ? 1 : 0 };
        },
      },
    };

    try {
      const result = await (callback as (tx: typeof transaction) => Promise<unknown>)(transaction);
      persistedChapters.push(...pending);
      return result;
    } catch (error) {
      throw error;
    }
  });

  const response = await postControlAction(new Request("http://localhost/api/projects/project-1/control-actions", {
    method: "POST",
    body: JSON.stringify({ areaId: "production", mode: "seed" }),
  }), { params: Promise.resolve({ projectId: "project-1" }) });
  const payload = await response.json() as { created: string[]; skipped?: string };

  assert.equal(response.status, 200);
  assert.equal(transactionCalls, 2);
  assert.deepEqual(attemptedChapters.map((chapter) => ({ order: chapter.order, title: chapter.title })), [
    { order: 5, title: "第5章 开局：雨夜倒计时" },
    { order: 6, title: "第6章 主线：第二次选择" },
  ]);
  assert.deepEqual(claims, [
    {
      where: { id: "outline-1", projectId: "project-1", chapterId: null },
      data: { chapterId: "chapter-attempt-1", status: "chapter_card" },
    },
    {
      where: { id: "outline-2", projectId: "project-1", chapterId: null },
      data: { chapterId: "chapter-attempt-2", status: "chapter_card" },
    },
  ]);
  assert.deepEqual(persistedChapters.map((chapter) => chapter.id), ["chapter-attempt-1"]);
  assert.deepEqual(payload.created, ["第5章 开局：雨夜倒计时"]);
  assert.match(payload.skipped ?? "", /1/);
});

test("first-three chapter creation preserves the requested order and maps P2002 to reload conflict", async (t) => {
  let attemptedOrder: number | null = null;
  replaceMethod(t, prisma.project as unknown as Record<string, unknown>, "findUnique", async () => projectFixture());
  mockProviderSelection(t);
  replaceMethod(t, prisma.chapter as unknown as Record<string, unknown>, "create", async (args: never) => {
    attemptedOrder = (args as { data: { order: number } }).data.order;
    throw { code: "P2002" };
  });

  const response = await postFirstThreeRewrite(new Request("http://localhost/api/projects/project-1/first-three-rewrite/generate", {
    method: "POST",
    body: JSON.stringify({ chapterOrders: [2], targetWords: 1600 }),
  }), { params: Promise.resolve({ projectId: "project-1" }) });

  assert.equal(response.status, 409);
  assert.equal(attemptedOrder, 2);
  assert.deepEqual(await response.json(), chapterOrderConflictBody);
});

test("first-three task creation maps the active-task P2002 race to the shared 409 contract", async (t) => {
  replaceMethod(t, prisma.project as unknown as Record<string, unknown>, "findUnique", async () => projectFixture([chapterFixture()]));
  mockProviderSelection(t);
  replaceMethod(t, prisma.aiTask as unknown as Record<string, unknown>, "updateMany", async () => ({ count: 0 }));
  replaceMethod(t, prisma.aiTask as unknown as Record<string, unknown>, "findFirst", async () => null);
  replaceMethod(t, prisma.aiTask as unknown as Record<string, unknown>, "findMany", async () => []);
  replaceMethod(t, prisma.aiTask as unknown as Record<string, unknown>, "create", async () => {
    throw { code: "P2002" };
  });

  const response = await postFirstThreeRewrite(new Request("http://localhost/api/projects/project-1/first-three-rewrite/generate", {
    method: "POST",
    body: JSON.stringify({ chapterOrders: [1], targetWords: 1600 }),
  }), { params: Promise.resolve({ projectId: "project-1" }) });

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    code: "AI_TASK_ALREADY_RUNNING",
    error: "An AI task is already running for this chapter and task type.",
  });
});
