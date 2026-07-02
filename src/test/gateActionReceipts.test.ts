import test from "node:test";
import assert from "node:assert/strict";
import { buildGateActionReceipt, trimGateActionReceipts } from "../lib/projects/gateActionReceipts.ts";
import type { PrePublishGateAction } from "../lib/projects/prePublishGate.ts";

const action: PrePublishGateAction = {
  id: "strategy",
  label: "执行推荐批次",
  detail: "按标准档跑下一批。",
  href: "/tasks?batchStrategy=standard",
  tone: "primary",
  execution: {
    type: "recommended_batch",
    strategyId: "standard",
  },
};

test("buildGateActionReceipt", async (t) => {
  await t.test("summarizes recommended batch results", () => {
    const receipt = buildGateActionReceipt({
      action,
      status: "succeeded",
      now: "2026-01-01T00:00:00.000Z",
      payload: {
        results: [
          { status: "succeeded", taskId: "task-1" },
          { status: "failed", taskId: "task-2" },
        ],
        routeEffectSummary: {
          successRatePercent: 50,
          knownCostUsd: 0.01,
          averageQualityScore: 82,
        },
      },
    });

    assert.equal(receipt.status, "succeeded");
    assert.equal(receipt.executionType, "recommended_batch");
    assert.equal(receipt.succeededCount, 1);
    assert.equal(receipt.failedCount, 1);
    assert.equal(receipt.taskId, "task-1");
    assert.ok(receipt.message.includes("成功 1，失败 1"));
    assert.ok(receipt.message.includes("成功率 50%"));
  });

  await t.test("keeps failed action errors readable", () => {
    const receipt = buildGateActionReceipt({
      action: {
        ...action,
        execution: {
          type: "retry_task",
          taskId: "failed-1",
        },
      },
      status: "failed",
      now: "2026-01-01T00:00:00.000Z",
      payload: { error: "密钥已失效。" },
    });

    assert.equal(receipt.status, "failed");
    assert.equal(receipt.executionType, "retry_task");
    assert.equal(receipt.message, "密钥已失效。");
  });

  await t.test("trims receipts by latest created time", () => {
    const receipts = Array.from({ length: 10 }, (_, index) => buildGateActionReceipt({
      action,
      status: "succeeded",
      now: `2026-01-01T00:00:0${index}.000Z`,
      payload: { results: [{ status: "succeeded", taskId: `task-${index}` }] },
    }));

    const trimmed = trimGateActionReceipts(receipts, 3);

    assert.equal(trimmed.length, 3);
    assert.equal(trimmed[0].taskId, "task-9");
    assert.equal(trimmed[2].taskId, "task-7");
  });
});
