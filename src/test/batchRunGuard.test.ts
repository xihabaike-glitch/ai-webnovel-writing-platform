import test from "node:test";
import assert from "node:assert/strict";
import { buildBatchRunGuard } from "../lib/ai/batchRunGuard.ts";

test("buildBatchRunGuard", async (t) => {
  await t.test("allows a small batch under concurrency and token limits", () => {
    const guard = buildBatchRunGuard({
      action: "review",
      batchSize: 2,
      tasks: [
        { status: "succeeded", inputTokens: 1000, outputTokens: 1000, costUsd: 0.02 },
      ],
    });

    assert.equal(guard.allowed, true);
    assert.equal(guard.estimatedTokens, 3600);
    assert.equal(guard.estimatedCostUsd, 0.036);
  });

  await t.test("blocks when running tasks reach the global limit", () => {
    const guard = buildBatchRunGuard({
      action: "draft",
      batchSize: 1,
      targetWords: 1200,
      tasks: [
        { status: "running", inputTokens: null, outputTokens: null, costUsd: null },
        { status: "queued", inputTokens: null, outputTokens: null, costUsd: null },
        { status: "running", inputTokens: null, outputTokens: null, costUsd: null },
      ],
    });

    assert.equal(guard.allowed, false);
    assert.equal(guard.items.find((item) => item.id === "running-tasks")?.status, "block");
  });

  await t.test("blocks overlarge token estimates", () => {
    const guard = buildBatchRunGuard({
      action: "second_pass",
      batchSize: 5,
      targetWords: 3000,
      tasks: [],
    });

    assert.equal(guard.allowed, false);
    assert.equal(guard.items.find((item) => item.id === "token-budget")?.status, "block");
  });

  await t.test("blocks when historical cost estimate exceeds the cap", () => {
    const guard = buildBatchRunGuard({
      action: "draft",
      batchSize: 2,
      targetWords: 5000,
      tasks: [
        { status: "succeeded", inputTokens: 100, outputTokens: 100, costUsd: 0.1 },
      ],
    });

    assert.equal(guard.allowed, false);
    assert.equal(guard.items.find((item) => item.id === "cost-budget")?.status, "block");
  });
});
