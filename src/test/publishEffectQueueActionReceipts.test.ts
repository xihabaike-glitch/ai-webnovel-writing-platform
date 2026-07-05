import test from "node:test";
import assert from "node:assert/strict";
import { buildPublishEffectQueueActionReceipt } from "../lib/projects/publishEffectQueueActionReceipts.ts";

test("publish effect queue action receipts", async (t) => {
  await t.test("records generated asset candidates as platform strategy receipts", () => {
    const receipt = buildPublishEffectQueueActionReceipt({
      projectId: "project-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      execution: "generate_asset_variants",
      actionLabel: "生成候选",
      href: "/projects/project-1#submission-asset-editor",
      status: "succeeded",
      taskId: "task-1",
      variantCount: 3,
      now: "2026-07-05T08:00:00.000Z",
    });

    assert.equal(receipt.id, "platform-strategy:fanqie:queue_generate_asset_variants:2026-07-05T08:00:00.000Z");
    assert.equal(receipt.actionId, "platform-strategy:fanqie:generate_asset_variants");
    assert.equal(receipt.executionType, "platform_strategy");
    assert.equal(receipt.succeededCount, 3);
    assert.equal(receipt.failedCount, 0);
    assert.equal(receipt.taskId, "task-1");
    assert.equal(receipt.recheck.status, "ready");
    assert.ok(receipt.message.includes("生成 3 个投稿资产候选"));
  });

  await t.test("records failed first-three rewrites as blocked rechecks", () => {
    const receipt = buildPublishEffectQueueActionReceipt({
      projectId: "project-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      execution: "rewrite_first_three",
      actionLabel: "重写前三章",
      href: "/projects/project-1#first-three-rewrite",
      status: "failed",
      error: "模型暂时不可用。",
      now: "2026-07-05T08:01:00.000Z",
    });

    assert.equal(receipt.actionId, "platform-strategy:fanqie:rewrite_first_three");
    assert.equal(receipt.succeededCount, 0);
    assert.equal(receipt.failedCount, 1);
    assert.equal(receipt.recheck.status, "blocked");
    assert.equal(receipt.recheck.actionLabel, "回任务中心重试");
    assert.ok(receipt.message.includes("模型暂时不可用"));
  });
});
