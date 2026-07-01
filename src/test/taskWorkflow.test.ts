import test from "node:test";
import assert from "node:assert/strict";
import { latestTaskStatus, summarizeAiTasks } from "../lib/ai/taskWorkflow.ts";

test("summarizeAiTasks", async (t) => {
  await t.test("normalizes draft and review tasks into a workflow timeline", () => {
    const items = summarizeAiTasks([
      {
        id: "task-1",
        taskType: "chapter_draft",
        model: "mock-writer",
        status: "succeeded",
        outputText: "第一段正文。\n\n第二段正文。",
        errorMessage: null,
        inputTokens: 10,
        outputTokens: 20,
        costUsd: 0,
        createdAt: "2026-07-01T00:00:00.000Z",
        modelProvider: {
          providerId: "mock",
          displayName: "Mock",
        },
      },
    ]);

    assert.equal(items[0].label, "正文初稿");
    assert.equal(items[0].providerName, "Mock");
    assert.equal(items[0].outputPreview, "第一段正文。 第二段正文。");
    assert.equal(latestTaskStatus(items, "chapter_draft"), "succeeded");
    assert.equal(latestTaskStatus(items, "chapter_review"), "not_started");
  });
});
