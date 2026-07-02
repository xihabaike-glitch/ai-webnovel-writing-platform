import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGateActionReceipt,
  buildGatePlatformStrategyReceipt,
  mergeGateActionReceipts,
  trimGateActionReceipts,
} from "../lib/projects/gateActionReceipts.ts";
import type { PrePublishGateAction, PrePublishGateStrategyPlatform } from "../lib/projects/prePublishGate.ts";

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

const strategyPlatform: PrePublishGateStrategyPlatform = {
  platformId: "fanqie",
  platformName: "番茄小说",
  targetProjectId: "project-1",
  recommendation: "prepare_asset",
  actionType: "generate_asset_variants",
  label: "先补资产",
  actionLabel: "生成投稿方案",
  score: 72,
  projectCount: 1,
  readyPackages: 0,
  weakPackages: 0,
  dataGaps: 1,
  assetGaps: 1,
  baselineGaps: 0,
  nextAction: "先生成并采纳投稿资产候选。",
  href: "/projects/project-1#submission-asset-editor",
  projects: [{
    projectId: "project-1",
    projectTitle: "夜雨系统",
    statusLabel: "待修复",
    effectLabel: "缺数据",
    loopLabel: "先采纳候选",
    href: "/projects/project-1#submission-asset-editor",
  }],
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
    assert.equal(receipt.recheck.status, "ready");
    assert.equal(receipt.recheck.label, "复检任务队列");
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
    assert.equal(receipt.recheck.status, "blocked");
    assert.equal(receipt.recheck.actionLabel, "打开相关位置");
  });

  await t.test("asks to recheck publish package after a repair succeeds", () => {
    const receipt = buildGateActionReceipt({
      action: {
        ...action,
        label: "补章节审稿",
        execution: {
          type: "publish_repair",
          projectId: "project-1",
          kind: "run_chapter_review",
          chapterId: "chapter-1",
          detail: "补审稿记录。",
        },
      },
      status: "succeeded",
      now: "2026-01-01T00:00:00.000Z",
      payload: { message: "已完成章节审稿。" },
    });

    assert.equal(receipt.executionType, "publish_repair");
    assert.equal(receipt.recheck.status, "ready");
    assert.equal(receipt.recheck.label, "重新质检发布包");
    assert.ok(receipt.recheck.detail.includes("发布修复已完成"));
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

  await t.test("merges local and persisted receipts without duplicates", () => {
    const older = buildGateActionReceipt({
      action,
      status: "succeeded",
      now: "2026-01-01T00:00:00.000Z",
      payload: { results: [{ status: "succeeded", taskId: "task-old" }] },
    });
    const newer = buildGateActionReceipt({
      action,
      status: "succeeded",
      now: "2026-01-01T00:00:01.000Z",
      payload: { results: [{ status: "succeeded", taskId: "task-new" }] },
    });

    const merged = mergeGateActionReceipts([older, newer], [older]);

    assert.equal(merged.length, 2);
    assert.equal(merged[0].taskId, "task-new");
    assert.equal(merged[1].taskId, "task-old");
  });

  await t.test("builds platform strategy receipts for the unified gate audit log", () => {
    const receipt = buildGatePlatformStrategyReceipt({
      item: strategyPlatform,
      status: "succeeded",
      now: "2026-01-01T00:00:00.000Z",
      payload: {
        task: { id: "task-asset-1", status: "succeeded" },
        variants: [{ strategy: "强钩子版" }, { strategy: "短剧版" }],
      },
    });

    assert.equal(receipt.executionType, "platform_strategy");
    assert.equal(receipt.actionId, "platform-strategy:fanqie:generate_asset_variants");
    assert.equal(receipt.succeededCount, 2);
    assert.equal(receipt.failedCount, 0);
    assert.equal(receipt.taskId, "task-asset-1");
    assert.ok(receipt.message.includes("2 个"));
    assert.equal(receipt.recheck.label, "采纳投稿方案并复检");
  });

  await t.test("keeps platform strategy failures actionable", () => {
    const receipt = buildGatePlatformStrategyReceipt({
      item: {
        ...strategyPlatform,
        recommendation: "repair",
        actionType: "rewrite_first_three",
        label: "先修再投",
        actionLabel: "重写前三章",
      },
      status: "failed",
      now: "2026-01-01T00:00:00.000Z",
      payload: { error: "模型额度不足。" },
    });

    assert.equal(receipt.executionType, "platform_strategy");
    assert.equal(receipt.status, "failed");
    assert.equal(receipt.failedCount, 1);
    assert.equal(receipt.message, "模型额度不足。");
    assert.equal(receipt.recheck.status, "blocked");
    assert.equal(receipt.recheck.actionLabel, "打开相关位置");
  });
});
