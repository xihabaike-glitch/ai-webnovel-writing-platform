import test from "node:test";
import assert from "node:assert/strict";
import { buildFailureReviewCenter } from "../lib/ai/failureReviewCenter.ts";

const baseTask = {
  id: "task-1",
  projectId: "project-1",
  taskType: "chapter_draft",
  model: "deepseek-chat",
  status: "failed",
  errorMessage: "API key missing",
  createdAt: "2026-01-01T00:00:00.000Z",
  project: { title: "夜雨系统" },
  chapter: { title: "第一章" },
  modelProvider: { providerId: "deepseek", displayName: "DeepSeek" },
};

test("buildFailureReviewCenter", async (t) => {
  await t.test("classifies failures and builds repair actions", () => {
    const center = buildFailureReviewCenter([
      baseTask,
      {
        ...baseTask,
        id: "task-2",
        taskType: "chapter_review",
        errorMessage: "Rate limit exceeded 429",
        createdAt: "2026-01-02T00:00:00.000Z",
      },
      {
        ...baseTask,
        id: "task-3",
        taskType: "chapter_second_pass",
        model: "gpt-4.1",
        errorMessage: "context length too long",
        createdAt: "2026-01-03T00:00:00.000Z",
        modelProvider: { providerId: "openai", displayName: "OpenAI" },
      },
      {
        ...baseTask,
        id: "task-4",
        status: "succeeded",
        errorMessage: null,
      },
    ]);

    assert.equal(center.summary.totalFailures, 3);
    assert.equal(center.summary.retryableFailures, 1);
    assert.equal(center.summary.affectedProjects, 1);
    assert.equal(center.summary.affectedProviders, 2);
    assert.equal(center.categoryGroups[0].count, 1);
    assert.ok(center.categoryGroups.some((group) => group.label === "密钥/权限"));
    assert.ok(center.providerGroups.some((group) => group.label === "DeepSeek · deepseek-chat" && group.count === 2));
    assert.equal(center.recentFailures[0].id, "task-3");
    assert.equal(center.recentFailures.find((item) => item.id === "task-2")?.retryable, true);
    assert.equal(center.recentFailures.find((item) => item.id === "task-1")?.retryable, false);
    assert.ok(center.nextActions[0].includes("密钥/权限"));
  });

  await t.test("handles an empty failure set", () => {
    const center = buildFailureReviewCenter([]);

    assert.equal(center.summary.totalFailures, 0);
    assert.equal(center.summary.mostCommonCategory, "暂无失败");
    assert.equal(center.recentFailures.length, 0);
    assert.ok(center.nextActions[0].includes("暂无失败任务"));
  });
});
