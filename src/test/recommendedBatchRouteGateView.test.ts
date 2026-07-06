import test from "node:test";
import assert from "node:assert/strict";
import { buildRecommendedBatchRouteGateTimeline } from "../lib/projects/recommendedBatchRouteGateView.ts";

test("buildRecommendedBatchRouteGateTimeline", async (t) => {
  await t.test("shows a blocked route before recheck", () => {
    const timeline = buildRecommendedBatchRouteGateTimeline({
      status: "block",
      label: "模型路线拦截",
      headline: "模型路线存在失败。",
      detail: "成功率 0%。",
      maxBatchSize: 0,
      recoveryEvidence: null,
      recheckAdvice: { id: "advice-1" },
    });

    assert.equal(timeline.tone, "blocked");
    assert.equal(timeline.items[0].status, "active");
    assert.equal(timeline.items[2].label, "标准批量关闭");
  });

  await t.test("shows the recovery sample stage after route recheck passes", () => {
    const timeline = buildRecommendedBatchRouteGateTimeline({
      status: "sample",
      label: "降级小样本",
      headline: "模型路线复检已通过。",
      detail: "成功率 0%。",
      maxBatchSize: 1,
      recoveryEvidence: "最近路由复检通过：成功率 100%，质量 86，可继续沿用。",
      recheckAdvice: null,
    });

    assert.equal(timeline.tone, "watch");
    assert.equal(timeline.label, "复检通过，等待恢复样本");
    assert.equal(timeline.primaryActionLabel, "跑 1 个恢复样本");
    assert.ok(timeline.primaryActionDetail.includes("不是恢复正常批量"));
    assert.deepEqual(timeline.items.map((item) => item.status), ["done", "active", "pending"]);
  });

  await t.test("shows restored standard batches after the recovery sample passes", () => {
    const timeline = buildRecommendedBatchRouteGateTimeline({
      status: "allow",
      label: "模型路线通过",
      headline: "恢复样本已过线。",
      detail: "成功率 100%。",
      maxBatchSize: 3,
      recoveryEvidence: "恢复样本通过：成功率 100%，质量 88，无失败、无备用命中，成本 $0.0100/任务。",
      recheckAdvice: null,
    });

    assert.equal(timeline.tone, "ok");
    assert.equal(timeline.label, "正常批量已恢复");
    assert.deepEqual(timeline.items.map((item) => item.label), ["路线复检通过", "恢复样本通过", "标准批量已开启"]);
  });
});
