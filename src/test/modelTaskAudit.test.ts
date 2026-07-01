import test from "node:test";
import assert from "node:assert/strict";
import { buildModelTaskAuditDashboard } from "../lib/ai/modelTaskAudit.ts";

const providers = [
  {
    id: "mock-provider",
    providerId: "mock",
    displayName: "Mock",
    defaultModel: "mock-novel",
    enabled: true,
    encryptedApiKey: "secret",
  },
  {
    id: "deepseek-provider",
    providerId: "deepseek",
    displayName: "DeepSeek",
    defaultModel: "deepseek-chat",
    enabled: true,
    encryptedApiKey: null,
  },
];

test("buildModelTaskAuditDashboard", async (t) => {
  await t.test("summarizes failures, costs, tokens, and provider readiness", () => {
    const dashboard = buildModelTaskAuditDashboard([
      {
        id: "task-1",
        taskType: "chapter_draft",
        model: "mock-novel",
        status: "succeeded",
        inputTokens: 1000,
        outputTokens: 2400,
        costUsd: 0.012,
        errorMessage: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        modelProvider: { providerId: "mock", displayName: "Mock" },
        chapter: { title: "第一章" },
      },
      {
        id: "task-2",
        taskType: "chapter_review",
        model: "deepseek-chat",
        status: "failed",
        inputTokens: 800,
        outputTokens: 0,
        costUsd: 0.003,
        errorMessage: "API key missing",
        createdAt: "2026-01-02T00:00:00.000Z",
        modelProvider: { providerId: "deepseek", displayName: "DeepSeek" },
        chapter: { title: "第一章" },
      },
      {
        id: "task-3",
        taskType: "chapter_second_pass",
        model: "mock-novel",
        status: "succeeded",
        inputTokens: null,
        outputTokens: null,
        costUsd: null,
        errorMessage: null,
        createdAt: "2026-01-03T00:00:00.000Z",
        modelProvider: { providerId: "mock", displayName: "Mock" },
        chapter: { title: "第一章" },
      },
    ], providers);

    assert.equal(dashboard.summary.totalTasks, 3);
    assert.equal(dashboard.summary.failedTasks, 1);
    assert.equal(dashboard.summary.failureRatePercent, 33);
    assert.equal(dashboard.summary.totalTokens, 4200);
    assert.equal(dashboard.summary.knownCostUsd, 0.015);
    assert.equal(dashboard.summary.missingUsageTasks, 1);
    assert.equal(dashboard.providerReadiness.unconfiguredEnabledProviders, 1);
    assert.equal(dashboard.recentFailures[0].errorMessage, "API key missing");
    assert.ok(dashboard.riskFlags.some((flag) => flag.includes("失败率")));
    assert.ok(dashboard.nextActions.some((action) => action.includes("API Key")));
  });

  await t.test("rewards a healthy model workflow", () => {
    const dashboard = buildModelTaskAuditDashboard([
      {
        id: "task-1",
        taskType: "chapter_draft",
        model: "mock-novel",
        status: "succeeded",
        inputTokens: 1000,
        outputTokens: 2600,
        costUsd: 0.012,
        errorMessage: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        modelProvider: { providerId: "mock", displayName: "Mock" },
        chapter: { title: "第一章" },
      },
      {
        id: "task-2",
        taskType: "chapter_review",
        model: "mock-novel",
        status: "succeeded",
        inputTokens: 1200,
        outputTokens: 900,
        costUsd: 0.006,
        errorMessage: null,
        createdAt: "2026-01-02T00:00:00.000Z",
        modelProvider: { providerId: "mock", displayName: "Mock" },
        chapter: { title: "第一章" },
      },
    ], [providers[0]]);

    assert.equal(dashboard.status, "healthy");
    assert.equal(dashboard.score, 100);
    assert.equal(dashboard.providerRows[0].successRatePercent, 100);
    assert.equal(dashboard.taskTypeRows.length, 2);
    assert.equal(dashboard.recentFailures.length, 0);
  });
});
