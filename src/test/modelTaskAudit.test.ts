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
        providerConfigId: "mock-provider",
        model: "mock-novel",
        status: "succeeded",
        inputTokens: 1000,
        outputTokens: 2400,
        costUsd: 0.012,
        outputText: "正文内容",
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
        inputSnapshot: JSON.stringify({ routeAttempt: { role: "primary", attemptNumber: 1 } }),
        inputTokens: 800,
        outputTokens: 0,
        costUsd: 0.003,
        outputText: null,
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
        inputSnapshot: JSON.stringify({ routeAttempt: { role: "fallback", attemptNumber: 2 } }),
        inputTokens: null,
        outputTokens: null,
        costUsd: null,
        outputText: JSON.stringify({ qualityGate: { score: 82 } }),
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
    assert.equal(dashboard.budgetCenter.status, "watch");
    assert.equal(dashboard.budgetCenter.knownCostCoveragePercent, 50);
    assert.equal(dashboard.budgetCenter.fallbackAttempts, 1);
    assert.equal(dashboard.budgetCenter.fallbackAttemptRatePercent, 50);
    assert.equal(dashboard.budgetCenter.failedSpendUsd, 0.003);
    assert.ok(dashboard.budgetCenter.throttleAdvice.some((action) => action.includes("备用模型")));
    assert.equal(dashboard.providerReadiness.unconfiguredEnabledProviders, 1);
    assert.ok(dashboard.modelEffectRows.some((row) => row.averageQualityScore === 82));
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
        outputText: "正文内容",
        errorMessage: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        modelProvider: { providerId: "mock", displayName: "Mock" },
        chapter: { title: "第一章" },
      },
      {
        id: "task-2",
        taskType: "chapter_review",
        providerConfigId: "mock-provider",
        model: "mock-novel",
        status: "succeeded",
        inputTokens: 1200,
        outputTokens: 900,
        costUsd: 0.006,
        outputText: JSON.stringify({ score: 90, shouldSecondPass: false, issues: [] }),
        errorMessage: null,
        createdAt: "2026-01-02T00:00:00.000Z",
        modelProvider: { providerId: "mock", displayName: "Mock" },
        chapter: { title: "第一章" },
      },
      {
        id: "task-3",
        taskType: "chapter_review",
        providerConfigId: "mock-provider",
        model: "mock-novel",
        status: "succeeded",
        inputTokens: 1100,
        outputTokens: 800,
        costUsd: 0.005,
        outputText: JSON.stringify({ score: 86, shouldSecondPass: false, issues: [] }),
        errorMessage: null,
        createdAt: "2026-01-03T00:00:00.000Z",
        modelProvider: { providerId: "mock", displayName: "Mock" },
        chapter: { title: "第二章" },
      },
    ], [providers[0]], null, [
      {
        taskType: "chapter_review",
        primaryProviderConfigId: "mock-provider",
        fallbackProviderConfigId: null,
      },
    ]);

    assert.equal(dashboard.status, "healthy");
    assert.equal(dashboard.score, 100);
    assert.equal(dashboard.budgetCenter.status, "safe");
    assert.equal(dashboard.budgetCenter.knownCostCoveragePercent, 100);
    assert.equal(dashboard.budgetCenter.topCostTaskLabel, "正文初稿");
    assert.equal(dashboard.providerRows[0].successRatePercent, 100);
    assert.equal(dashboard.taskTypeRows.length, 2);
    const reviewEffect = dashboard.modelEffectRows.find((row) => row.taskType === "chapter_review");
    assert.equal(reviewEffect?.recommendation, "prefer");
    assert.equal(reviewEffect?.averageQualityScore, 88);
    assert.equal(reviewEffect?.averageCostPerSucceededTaskUsd, 0.0055);
    const reviewRoute = dashboard.routeRecommendations.find((recommendation) => recommendation.taskType === "chapter_review");
    assert.equal(reviewRoute?.status, "current");
    assert.equal(reviewRoute?.primaryProviderName, "Mock · mock-novel");
    assert.equal(dashboard.recentFailures.length, 0);
  });
});
