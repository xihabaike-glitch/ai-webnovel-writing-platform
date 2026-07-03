import test from "node:test";
import assert from "node:assert/strict";
import { buildTaskRunConsole, type TaskRunInput } from "../lib/ai/taskRunConsole.ts";

const baseTask: TaskRunInput = {
  id: "task-1",
  projectId: "project-1",
  chapterId: "chapter-1",
  taskType: "chapter_draft",
  model: "mock-writer",
  status: "succeeded",
  inputTokens: 1000,
  outputTokens: 1800,
  costUsd: 0.01,
  errorMessage: null,
  inputSnapshot: "{}",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:05.000Z",
  project: { title: "夜雨系统" },
  chapter: { title: "第一章 雨夜系统" },
  modelProvider: { providerId: "mock", displayName: "Mock" },
};

test("buildTaskRunConsole", async (t) => {
  await t.test("summarizes running, stale, failed, retryable tasks and logs", () => {
    const console = buildTaskRunConsole([
      baseTask,
      {
        ...baseTask,
        id: "task-2",
        taskType: "chapter_review",
        status: "failed",
        errorMessage: "Model request failed: 503 provider timeout",
        createdAt: "2026-01-01T00:10:00.000Z",
        updatedAt: "2026-01-01T00:10:02.000Z",
      },
      {
        ...baseTask,
        id: "task-3",
        taskType: "chapter_second_pass",
        status: "running",
        errorMessage: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ], { now: new Date("2026-01-01T00:45:00.000Z") });

    assert.equal(console.status, "blocked");
    assert.equal(console.summary.totalTasks, 3);
    assert.equal(console.summary.runningTasks, 1);
    assert.equal(console.summary.failedTasks, 1);
    assert.equal(console.summary.retryableFailures, 1);
    assert.equal(console.summary.staleRunningTasks, 1);
    assert.equal(console.summary.totalTokens, 8400);
    assert.equal(console.retryCandidates[0].retryable, true);
    assert.equal(console.retryCandidates[0].directRetrySupported, true);
    assert.equal(console.retryCandidates[0].actionLabel, "一键重试");
    assert.equal(console.retryCandidates[0].href, "/projects/project-1/chapters/chapter-1");
    assert.equal(console.recentLogs[0].id, "task-2");
    assert.ok(console.nextActions.some((action) => action.includes("疑似卡死")));
  });

  await t.test("marks a completed run history as healthy", () => {
    const console = buildTaskRunConsole([baseTask], { now: new Date("2026-01-01T00:01:00.000Z") });

    assert.equal(console.status, "healthy");
    assert.equal(console.verdict, "任务运行健康，可以继续推进批量生产。");
    assert.equal(console.summary.succeededTasks, 1);
    assert.equal(console.retryCandidates.length, 0);
    assert.equal(console.recentLogs[0].runtimeMs, 5000);
  });

  await t.test("builds a global failure repair batch from unresolved failures", () => {
    const console = buildTaskRunConsole([
      {
        ...baseTask,
        id: "api-key-failure",
        chapterId: "chapter-3",
        taskType: "chapter_review",
        status: "failed",
        model: "deepseek-chat",
        errorMessage: "API key missing",
        createdAt: "2026-01-01T00:10:00.000Z",
        updatedAt: "2026-01-01T00:10:02.000Z",
        chapter: { title: "第三章 密钥门" },
        modelProvider: { providerId: "deepseek", displayName: "DeepSeek" },
      },
      {
        ...baseTask,
        id: "retryable-timeout",
        chapterId: "chapter-2",
        taskType: "chapter_draft",
        status: "failed",
        errorMessage: "Model request failed: 503 provider timeout",
        createdAt: "2026-01-01T00:09:00.000Z",
        updatedAt: "2026-01-01T00:09:02.000Z",
        chapter: { title: "第二章 断桥" },
      },
      {
        ...baseTask,
        id: "old-review-failure",
        taskType: "chapter_review",
        status: "failed",
        errorMessage: "429 too many requests",
        createdAt: "2026-01-01T00:08:00.000Z",
        updatedAt: "2026-01-01T00:08:02.000Z",
      },
      {
        ...baseTask,
        id: "recovered-review",
        taskType: "chapter_review",
        status: "succeeded",
        errorMessage: null,
        createdAt: "2026-01-01T00:12:00.000Z",
        updatedAt: "2026-01-01T00:12:05.000Z",
      },
    ], { now: new Date("2026-01-01T00:20:00.000Z") });

    assert.equal(console.failureRepairBatch.status, "fix_config");
    assert.equal(console.failureRepairBatch.summary.unresolvedFailures, 2);
    assert.equal(console.failureRepairBatch.summary.configFailures, 1);
    assert.equal(console.failureRepairBatch.summary.retryableFailures, 1);
    assert.equal(console.failureRepairBatch.primaryActionLabel, "去模型设置");
    assert.equal(console.failureRepairBatch.primaryActionHref, "/settings/models");
    assert.deepEqual(console.failureRepairBatch.items.map((item) => item.id), ["api-key-failure", "retryable-timeout"]);
    assert.equal(console.failureRepairBatch.items[0].directRetrySupported, false);
    assert.equal(console.failureRepairBatch.items[0].actionLabel, "去模型设置");
    assert.equal(console.failureRepairBatch.items[1].directRetrySupported, true);
    assert.equal(console.failureRepairBatch.items[1].actionLabel, "一键重试");
    assert.ok(console.failureRepairBatch.guidance.some((line) => line.includes("先修配置")));
  });
});
