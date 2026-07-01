import test from "node:test";
import assert from "node:assert/strict";
import { buildRouteEffectAudit } from "../lib/model-gateway/routeEffectAudit.ts";

const providers = [
  { id: "mock-provider", displayName: "Mock", defaultModel: "mock-writer" },
  { id: "kimi-provider", displayName: "Kimi", defaultModel: "kimi-k2.6" },
  { id: "deepseek-provider", displayName: "DeepSeek", defaultModel: "deepseek-chat" },
];

test("buildRouteEffectAudit", async (t) => {
  await t.test("summarizes configured route hit rates, fallback use, and costs", () => {
    const audit = buildRouteEffectAudit([
      {
        id: "task-1",
        taskType: "chapter_draft",
        providerConfigId: "kimi-provider",
        status: "succeeded",
        inputTokens: 1000,
        outputTokens: 2200,
        costUsd: 0.03,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "task-2",
        taskType: "chapter_draft",
        providerConfigId: "deepseek-provider",
        status: "failed",
        inputTokens: 800,
        outputTokens: 0,
        costUsd: 0.01,
        createdAt: "2026-01-02T00:00:00.000Z",
      },
      {
        id: "task-3",
        taskType: "chapter_review",
        providerConfigId: "mock-provider",
        status: "succeeded",
        inputTokens: 500,
        outputTokens: 500,
        costUsd: 0,
        createdAt: "2026-01-03T00:00:00.000Z",
      },
    ], [
      {
        taskType: "chapter_draft",
        primaryProviderConfigId: "kimi-provider",
        fallbackProviderConfigId: "deepseek-provider",
      },
    ], providers);

    const draft = audit.rows.find((row) => row.taskType === "chapter_draft");
    const review = audit.rows.find((row) => row.taskType === "chapter_review");

    assert.equal(audit.summary.configuredRoutes, 1);
    assert.equal(audit.summary.observedTaskTypes, 2);
    assert.equal(audit.summary.fallbackTaskCount, 1);
    assert.equal(audit.summary.otherTaskCount, 1);
    assert.equal(audit.summary.knownCostUsd, 0.04);
    assert.equal(draft?.primaryTasks, 1);
    assert.equal(draft?.fallbackTasks, 1);
    assert.equal(draft?.successRatePercent, 50);
    assert.equal(draft?.status, "watch");
    assert.equal(review?.status, "unconfigured");
    assert.ok(audit.nextActions.some((action) => action.includes("未配置路由")));
  });
});
