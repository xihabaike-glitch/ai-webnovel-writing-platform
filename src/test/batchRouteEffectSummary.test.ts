import test from "node:test";
import assert from "node:assert/strict";
import { buildBatchRouteEffectSummary } from "../lib/model-gateway/batchRouteEffectSummary.ts";

test("buildBatchRouteEffectSummary", async (t) => {
  await t.test("summarizes route quality, cost, tokens, and fallback usage", () => {
    const summary = buildBatchRouteEffectSummary([
      {
        status: "succeeded",
        taskId: "task-1",
        providerName: "Claude",
        model: "claude-sonnet",
        role: "primary",
        inputTokens: 1000,
        outputTokens: 1800,
        costUsd: 0.02,
        qualityScore: 88,
      },
      {
        status: "succeeded",
        taskId: "task-2",
        providerName: "DeepSeek",
        model: "deepseek-chat",
        role: "fallback",
        inputTokens: 900,
        outputTokens: 1200,
        costUsd: 0.01,
        qualityScore: 82,
      },
    ]);

    assert.equal(summary.totalTasks, 2);
    assert.equal(summary.successRatePercent, 100);
    assert.equal(summary.totalTokens, 4900);
    assert.equal(summary.knownCostUsd, 0.03);
    assert.equal(summary.averageCostPerSucceededTaskUsd, 0.015);
    assert.equal(summary.averageQualityScore, 85);
    assert.equal(summary.primaryTasks, 1);
    assert.equal(summary.fallbackTasks, 1);
    assert.ok(summary.verdict.includes("备用模型"));
  });

  await t.test("flags low success rate before expanding a batch", () => {
    const summary = buildBatchRouteEffectSummary([
      {
        status: "succeeded",
        taskId: "task-1",
        providerName: "GPT",
        model: "gpt-4.1",
        role: "primary",
        costUsd: 0.04,
      },
      {
        status: "failed",
        taskId: "task-2",
        providerName: "GPT",
        model: "gpt-4.1",
        role: "primary",
        costUsd: 0.01,
      },
    ]);

    assert.equal(summary.successRatePercent, 50);
    assert.equal(summary.failedTasks, 1);
    assert.equal(summary.averageQualityScore, null);
    assert.ok(summary.verdict.includes("成功率偏低"));
  });
});
