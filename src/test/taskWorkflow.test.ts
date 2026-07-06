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
        inputSnapshot: "{}",
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

  await t.test("surfaces AI recovery memory used by a writing task", () => {
    const items = summarizeAiTasks([
      {
        id: "task-1",
        taskType: "chapter_second_pass",
        model: "mock-writer",
        status: "succeeded",
        outputText: "二改正文。",
        errorMessage: null,
        inputTokens: 10,
        outputTokens: 20,
        costUsd: 0,
        inputSnapshot: JSON.stringify({
          input: {
            prompt: {
              systemPrompt: "系统提示",
              userPrompt: "用户提示",
            },
            aiRecoveryMemory: {
              promptBlock: "AI 写审改恢复证据：\n- 人工回滚：读感不稳，先回滚到 1 章复验。",
              sourceLabel: "AI 恢复记忆回滚小样本",
              lifecycleStatus: "rollback",
              lifecycleLabel: "回滚小样本",
              latestAt: "2026-01-05T00:00:00.000Z",
            },
          },
          routeAttempt: {
            attemptNumber: 1,
            role: "primary",
          },
        }),
        createdAt: "2026-07-01T00:00:00.000Z",
        modelProvider: {
          providerId: "mock",
          displayName: "Mock",
        },
      },
    ]);

    assert.equal(items[0].recoveryMemoryAudit?.used, true);
    assert.equal(items[0].recoveryMemoryAudit?.lifecycleStatus, "rollback");
    assert.equal(items[0].recoveryMemoryAudit?.lifecycleLabel, "回滚小样本");
    assert.equal(items[0].recoveryMemoryAudit?.sourceLabel, "AI 恢复记忆回滚小样本");
    assert.ok(items[0].recoveryMemoryAudit?.summary.includes("人工回滚"));
    assert.equal(items[0].recoveryMemoryAudit?.latestAt, "2026-01-05T00:00:00.000Z");
  });
});
