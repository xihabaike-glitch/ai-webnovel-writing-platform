import test from "node:test";
import assert from "node:assert/strict";
import { buildAiRecoveryMemoryControlRequest, buildAiRecoveryMemoryDiagnostic, latestTaskStatus, summarizeAiTasks } from "../lib/ai/taskWorkflow.ts";

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

  await t.test("diagnoses recovery memory rollback after repeated weak reviews", () => {
    const recoverySnapshot = JSON.stringify({
      input: {
        aiRecoveryMemory: {
          promptBlock: "AI 写审改恢复证据：\n- 恢复小批：小样本通过，可以恢复谨慎小批。",
          sourceLabel: "AI 写审改小批恢复",
          lifecycleStatus: "active",
          lifecycleLabel: "继续生效",
          latestAt: "2026-01-05T00:00:00.000Z",
        },
      },
    });
    const items = summarizeAiTasks([
      {
        id: "review-2",
        taskType: "chapter_review",
        model: "mock-reviewer",
        status: "succeeded",
        outputText: JSON.stringify({
          score: 72,
          issues: [{ type: "ai_recovery", message: "恢复记忆下仍丢开头钩子。" }],
        }),
        errorMessage: null,
        inputTokens: 10,
        outputTokens: 20,
        costUsd: 0,
        inputSnapshot: recoverySnapshot,
        createdAt: "2026-07-02T00:00:00.000Z",
        modelProvider: { providerId: "mock", displayName: "Mock" },
      },
      {
        id: "review-1",
        taskType: "chapter_review",
        model: "mock-reviewer",
        status: "succeeded",
        outputText: JSON.stringify({
          score: 80,
          issues: [{ type: "hook", message: "开头弱。" }],
        }),
        errorMessage: null,
        inputTokens: 10,
        outputTokens: 20,
        costUsd: 0,
        inputSnapshot: recoverySnapshot,
        createdAt: "2026-07-01T00:00:00.000Z",
        modelProvider: { providerId: "mock", displayName: "Mock" },
      },
    ]);
    const diagnostic = buildAiRecoveryMemoryDiagnostic(items);

    assert.equal(diagnostic.status, "rollback");
    assert.equal(diagnostic.label, "恢复记忆疑似失效");
    assert.equal(diagnostic.actionLabel, "回滚小样本");
    assert.ok(diagnostic.detail.includes("连续 2 次"));
    assert.ok(diagnostic.evidence.some((item) => item.includes("72")));
    assert.equal(diagnostic.sourceLabel, "AI 写审改小批恢复");
  });

  await t.test("builds a project control request for rollback diagnostics only", () => {
    const rollbackRequest = buildAiRecoveryMemoryControlRequest({
      projectId: "project-1",
      chapterId: "chapter-2",
      chapterTitle: "第二章 失控的小批恢复",
      diagnostic: {
        status: "rollback",
        label: "恢复记忆疑似失效",
        detail: "连续 2 次带恢复记忆的审稿仍低于 85 分。",
        actionLabel: "回滚小样本",
        sourceLabel: "AI 写审改小批恢复",
        evidence: ["正文审稿 72 分；问题：ai_recovery", "正文审稿 80 分；问题：hook"],
      },
    });

    assert.equal(rollbackRequest?.endpoint, "/api/projects/project-1/control-actions");
    assert.equal(rollbackRequest?.body.areaId, "ai-pipeline");
    assert.equal(rollbackRequest?.body.memoryAction, "rollback");
    assert.equal(rollbackRequest?.body.memorySource?.kind, "chapter_workflow_diagnostic");
    assert.equal(rollbackRequest?.body.memorySource?.chapterId, "chapter-2");
    assert.equal(rollbackRequest?.body.memorySource?.chapterTitle, "第二章 失控的小批恢复");
    assert.ok(rollbackRequest?.body.memorySource?.detail.includes("连续 2 次"));
    assert.deepEqual(rollbackRequest?.body.memorySource?.evidence, [
      "正文审稿 72 分；问题：ai_recovery",
      "正文审稿 80 分；问题：hook",
    ]);

    const watchRequest = buildAiRecoveryMemoryControlRequest({
      projectId: "project-1",
      chapterId: "chapter-2",
      chapterTitle: "第二章",
      diagnostic: {
        status: "watch",
        label: "恢复记忆观察中",
        detail: "最近一次低分。",
        actionLabel: "再看 1 次",
        sourceLabel: "AI 写审改小批恢复",
        evidence: ["正文审稿 80 分"],
      },
    });

    assert.equal(watchRequest, null);
  });
});
