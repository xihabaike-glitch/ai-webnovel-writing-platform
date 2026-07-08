import test from "node:test";
import assert from "node:assert/strict";
import { buildFinalDeliveryGateCloseout } from "../lib/projects/finalDeliveryGateCloseout.ts";

test("buildFinalDeliveryGateCloseout locks delivery while any lane is still open", () => {
  const closeout = buildFinalDeliveryGateCloseout({
    gateStatus: "blocked",
    publishBlockedCount: 4,
    dispatchActiveCount: 1,
    aiOpenCount: 9,
    pmActionLabel: "去配置模型岗位",
    pmActionHref: "/settings/models?focus=model-role-matrix#model-role-matrix",
    dispatchNextAction: "跟进 1 个已派任务，要求按验收标准回填证据。",
    taskNextAction: "先处理失败任务。",
    deliveryActionLabel: "进入最终交付",
    deliveryActionHref: "#pipeline-final-review",
  });

  assert.equal(closeout.locked, true);
  assert.equal(closeout.lockLabel, "最终交付已锁定");
  assert.equal(closeout.closeoutPercent, 0);
  assert.equal(closeout.releaseLabel, "先清发布卡点");
  assert.equal(closeout.primaryActionLabel, "处理发布卡点");
  assert.equal(closeout.primaryActionHref, "/settings/models?focus=model-role-matrix#model-role-matrix");
  assert.deepEqual(closeout.secondaryActions, [
    { label: "收派单回执", href: "/dispatch#dispatch-receipt-closeout", count: 1 },
    { label: "收 AI 任务", href: "/tasks#task-receipt-closeout", count: 9 },
  ]);
});

test("buildFinalDeliveryGateCloseout unlocks delivery only when every lane is clear and gate is ready", () => {
  const closeout = buildFinalDeliveryGateCloseout({
    gateStatus: "ready",
    publishBlockedCount: 0,
    dispatchActiveCount: 0,
    aiOpenCount: 0,
    pmActionLabel: "处理发布卡点",
    pmActionHref: "/gate",
    deliveryActionLabel: "进入最终交付",
    deliveryActionHref: "#pipeline-final-review",
  });

  assert.equal(closeout.locked, false);
  assert.equal(closeout.lockLabel, "最终交付入口已开放");
  assert.equal(closeout.closeoutPercent, 100);
  assert.equal(closeout.releaseLabel, "可以进入最终交付");
  assert.equal(closeout.primaryActionLabel, "进入最终交付");
  assert.equal(closeout.primaryActionHref, "#pipeline-final-review");
  assert.equal(closeout.deliveryHref, "#pipeline-final-review");
});
