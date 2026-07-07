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

  await t.test("surfaces latest route decisions from routed task snapshots", () => {
    const dashboard = buildModelTaskAuditDashboard([
      {
        id: "task-route-decision",
        taskType: "chapter_review",
        providerConfigId: "deepseek-provider",
        model: "deepseek-chat",
        status: "running",
        inputSnapshot: JSON.stringify({
          routeDecision: {
            taskType: "chapter_review",
            taskLabel: "章节审稿",
            headline: "章节审稿将使用 DeepSeek · deepseek-chat，备用 Mock · mock-novel。",
            primaryProviderName: "DeepSeek · deepseek-chat",
            fallbackProviderName: "Mock · mock-novel",
            selectionReason: "章节审稿先走主模型 DeepSeek · deepseek-chat。",
            failoverPlan: "主模型失败后切换到 Mock · mock-novel。",
            costPressure: "成本压力：预计 $0.0180 / 次；预算观察。",
            confirmationMode: "manual_recommended",
            acceptanceChecklist: ["主模型已匹配章节审稿职责", "失败替代路线已配置", "建议人工确认预算、失败替代和复检入口后再执行"],
          },
        }),
        inputTokens: null,
        outputTokens: null,
        costUsd: null,
        outputText: null,
        errorMessage: null,
        createdAt: "2026-01-04T00:00:00.000Z",
        modelProvider: { providerId: "deepseek", displayName: "DeepSeek" },
        chapter: { title: "第一章" },
      },
    ], providers);

    assert.equal(dashboard.routeDecisionRows.length, 1);
    assert.equal(dashboard.routeDecisionRows[0].taskLabel, "章节审稿");
    assert.equal(dashboard.routeDecisionRows[0].primaryProviderName, "DeepSeek · deepseek-chat");
    assert.equal(dashboard.routeDecisionRows[0].fallbackProviderName, "Mock · mock-novel");
    assert.equal(dashboard.routeDecisionRows[0].confirmationMode, "manual_recommended");
    assert.ok(dashboard.routeDecisionRows[0].costPressure.includes("$0.0180"));
    assert.ok(dashboard.routeDecisionRows[0].acceptanceChecklist.some((item) => item.includes("人工确认")));
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

  await t.test("tracks recovered and unresolved failures inside project audit", () => {
    const dashboard = buildModelTaskAuditDashboard([
      {
        id: "failed-draft",
        chapterId: "chapter-1",
        taskType: "chapter_draft",
        model: "mock-novel",
        status: "failed",
        inputTokens: 800,
        outputTokens: 0,
        costUsd: 0.002,
        outputText: null,
        errorMessage: "503 provider timeout",
        createdAt: "2026-01-01T00:00:00.000Z",
        modelProvider: { providerId: "mock", displayName: "Mock" },
        chapter: { title: "第一章" },
      },
      {
        id: "recovered-draft",
        chapterId: "chapter-1",
        taskType: "chapter_draft",
        model: "mock-novel",
        status: "succeeded",
        inputTokens: 900,
        outputTokens: 1800,
        costUsd: 0.01,
        outputText: "重试后生成正文。",
        errorMessage: null,
        createdAt: "2026-01-01T00:04:00.000Z",
        modelProvider: { providerId: "mock", displayName: "Mock" },
        chapter: { title: "第一章" },
      },
      {
        id: "unresolved-review",
        chapterId: "chapter-2",
        taskType: "chapter_review",
        model: "mock-novel",
        status: "failed",
        inputTokens: 700,
        outputTokens: 0,
        costUsd: 0.002,
        outputText: null,
        errorMessage: "Rate limit exceeded 429",
        createdAt: "2026-01-01T00:06:00.000Z",
        modelProvider: { providerId: "mock", displayName: "Mock" },
        chapter: { title: "第二章" },
      },
    ], [providers[0]]);

    assert.equal(dashboard.summary.failedTasks, 2);
    assert.equal(dashboard.summary.recoveredFailures, 1);
    assert.equal(dashboard.summary.unresolvedFailures, 1);
    assert.equal(dashboard.summary.failureRecoveryRatePercent, 50);
    assert.equal(dashboard.recentFailures.find((failure) => failure.id === "failed-draft")?.recoveryStatus, "recovered");
    assert.equal(dashboard.recentFailures.find((failure) => failure.id === "failed-draft")?.recoveredByTaskId, "recovered-draft");
    assert.equal(dashboard.recentFailures.find((failure) => failure.id === "unresolved-review")?.recoveryStatus, "unresolved");
    assert.ok(dashboard.riskFlags.some((flag) => flag.includes("未恢复失败")));
  });

  await t.test("builds repair actions for unresolved recent failures", () => {
    const dashboard = buildModelTaskAuditDashboard([
      {
        id: "retryable-review",
        projectId: "project-1",
        chapterId: "chapter-1",
        taskType: "chapter_review",
        model: "mock-novel",
        status: "failed",
        inputSnapshot: JSON.stringify({ chapterId: "chapter-1" }),
        inputTokens: 700,
        outputTokens: 0,
        costUsd: 0.002,
        outputText: null,
        errorMessage: "503 provider timeout",
        createdAt: "2026-01-01T00:00:00.000Z",
        modelProvider: { providerId: "mock", displayName: "Mock" },
        chapter: { title: "第一章" },
      },
      {
        id: "config-review",
        projectId: "project-1",
        chapterId: "chapter-2",
        taskType: "chapter_review",
        model: "deepseek-chat",
        status: "failed",
        inputSnapshot: JSON.stringify({ chapterId: "chapter-2" }),
        inputTokens: 700,
        outputTokens: 0,
        costUsd: 0.002,
        outputText: null,
        errorMessage: "API key missing",
        createdAt: "2026-01-01T00:01:00.000Z",
        modelProvider: { providerId: "deepseek", displayName: "DeepSeek" },
        chapter: { title: "第二章" },
      },
      {
        id: "old-draft-failure",
        projectId: "project-1",
        chapterId: "chapter-3",
        taskType: "chapter_draft",
        model: "mock-novel",
        status: "failed",
        inputSnapshot: JSON.stringify({ chapterId: "chapter-3" }),
        inputTokens: 700,
        outputTokens: 0,
        costUsd: 0.002,
        outputText: null,
        errorMessage: "429 too many requests",
        createdAt: "2026-01-01T00:02:00.000Z",
        modelProvider: { providerId: "mock", displayName: "Mock" },
        chapter: { title: "第三章" },
      },
      {
        id: "new-draft-success",
        projectId: "project-1",
        chapterId: "chapter-3",
        taskType: "chapter_draft",
        model: "mock-novel",
        status: "succeeded",
        inputTokens: 700,
        outputTokens: 1800,
        costUsd: 0.01,
        outputText: "重试后正文。",
        errorMessage: null,
        createdAt: "2026-01-01T00:05:00.000Z",
        modelProvider: { providerId: "mock", displayName: "Mock" },
        chapter: { title: "第三章" },
      },
    ], providers);

    const retryable = dashboard.recentFailures.find((failure) => failure.id === "retryable-review");
    const config = dashboard.recentFailures.find((failure) => failure.id === "config-review");
    const recovered = dashboard.recentFailures.find((failure) => failure.id === "old-draft-failure");

    assert.equal(retryable?.directRetrySupported, true);
    assert.equal(retryable?.actionLabel, "一键重试");
    assert.equal(retryable?.actionHref, "/projects/project-1/chapters/chapter-1");
    assert.match(retryable?.actionReason ?? "", /复用当前章节/);

    assert.equal(config?.directRetrySupported, false);
    assert.equal(config?.actionLabel, "去模型设置");
    assert.equal(config?.actionHref, "/settings/models");
    assert.match(config?.actionReason ?? "", /API Key/);

    assert.equal(recovered?.recoveryStatus, "recovered");
    assert.equal(recovered?.directRetrySupported, false);
    assert.equal(recovered?.actionLabel, "查看恢复记录");
  });
});
