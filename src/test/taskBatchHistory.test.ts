import test from "node:test";
import assert from "node:assert/strict";
import { buildTaskBatchHistory, type TaskBatchHistoryInput } from "../lib/ai/taskBatchHistory.ts";

const baseTask: TaskBatchHistoryInput = {
  id: "task-1",
  projectId: "project-1",
  chapterId: "chapter-1",
  taskType: "chapter_draft",
  model: "deepseek-writer",
  status: "succeeded",
  inputSnapshot: JSON.stringify({
    input: { prompt: "写第一章" },
    routeAttempt: { role: "primary" },
  }),
  outputText: "正文",
  inputTokens: 1000,
  outputTokens: 2200,
  costUsd: 0.02,
  errorMessage: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:12.000Z",
  project: { title: "夜雨系统" },
  chapter: { title: "第一章 雨夜系统" },
  modelProvider: { displayName: "DeepSeek" },
};

function task(input: Partial<TaskBatchHistoryInput>): TaskBatchHistoryInput {
  return { ...baseTask, ...input };
}

test("buildTaskBatchHistory", async (t) => {
  await t.test("groups adjacent same-project same-type tasks into one receipt", () => {
    const history = buildTaskBatchHistory([
      task({ id: "draft-1", chapterId: "chapter-1", chapter: { title: "第一章" }, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:10.000Z" }),
      task({ id: "draft-2", chapterId: "chapter-2", chapter: { title: "第二章" }, createdAt: "2026-01-01T00:02:00.000Z", updatedAt: "2026-01-01T00:02:10.000Z" }),
      task({ id: "review-1", taskType: "chapter_review", chapterId: "chapter-3", createdAt: "2026-01-01T00:20:00.000Z", updatedAt: "2026-01-01T00:20:10.000Z", outputText: JSON.stringify({ score: 88 }) }),
    ]);

    assert.equal(history.length, 2);
    assert.equal(history[1].taskLabel, "批量初稿");
    assert.equal(history[1].summary.totalTasks, 2);
    assert.deepEqual(history[1].chapterTitles, ["第一章", "第二章"]);
    assert.equal(history[0].taskLabel, "批量审稿");
  });

  await t.test("ignores automatic review audits but uses their quality scores", () => {
    const history = buildTaskBatchHistory([
      task({ id: "draft-1", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:10.000Z" }),
      task({
        id: "audit-1",
        taskType: "chapter_review",
        model: "deepseek-writer:auto-style-audit",
        inputSnapshot: JSON.stringify({ source: "auto_draft_quality_audit", draftTaskId: "draft-1" }),
        outputText: JSON.stringify({ score: 91 }),
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        createdAt: "2026-01-01T00:00:11.000Z",
        updatedAt: "2026-01-01T00:00:11.000Z",
      }),
    ]);

    assert.equal(history.length, 1);
    assert.equal(history[0].taskIds.length, 1);
    assert.equal(history[0].summary.averageQualityScore, 91);
  });

  await t.test("keeps failed samples and recommends repair before scaling", () => {
    const history = buildTaskBatchHistory([
      task({ id: "review-1", taskType: "chapter_review", status: "failed", outputText: null, errorMessage: "503 provider timeout", createdAt: "2026-01-01T00:00:00.000Z" }),
    ]);

    assert.equal(history[0].summary.failedTasks, 1);
    assert.equal(history[0].failedSamples[0], "503 provider timeout");
    assert.deepEqual(history[0].failedTaskIds, ["review-1"]);
    assert.equal(history[0].repairActions[0].kind, "retry_failed");
    assert.equal(history[0].repairActions[0].taskId, "review-1");
    assert.ok(history[0].nextAction.includes("失败样本"));
  });

  await t.test("recommends chapter repair for low quality and continuing for stable batches", () => {
    const weakHistory = buildTaskBatchHistory([
      task({
        id: "review-1",
        taskType: "chapter_review",
        outputText: JSON.stringify({ score: 72 }),
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
    ]);
    const stableHistory = buildTaskBatchHistory([
      task({
        id: "review-2",
        taskType: "chapter_review",
        outputText: JSON.stringify({ score: 91 }),
        createdAt: "2026-01-01T00:10:00.000Z",
      }),
    ]);

    assert.equal(weakHistory[0].repairActions[0].kind, "open_chapter");
    assert.equal(stableHistory[0].repairActions[0].kind, "continue_batch");
  });

  await t.test("recommends model route inspection for costly fallback batches", () => {
    const history = buildTaskBatchHistory([
      task({
        id: "draft-1",
        costUsd: 0.08,
        inputSnapshot: JSON.stringify({
          input: { prompt: "写第一章" },
          routeAttempt: { role: "fallback" },
        }),
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
    ]);

    assert.ok(history[0].repairActions.some((action) => action.kind === "open_model_routes"));
  });
});
