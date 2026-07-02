import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGateAdviceActionReceipt,
  buildGateActionReceiptSummary,
  buildGateActionReceipt,
  buildGatePlatformStrategyReceipt,
  buildGateActionReviewAdvice,
  buildGatePlatformGrowthReview,
  buildGatePlatformGrowthDispatchItems,
  buildGatePlatformDispatchReceipt,
  buildGatePublishEffectReceipt,
  filterGateActionReceipts,
  gateActionReceiptPlatform,
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

  await t.test("summarizes and filters receipts for the audit center", () => {
    const totalGateReceipt = buildGateActionReceipt({
      action,
      status: "succeeded",
      now: "2026-01-01T00:00:00.000Z",
      payload: { results: [{ status: "succeeded", taskId: "task-gate" }] },
    });
    const platformReceipt = buildGatePlatformStrategyReceipt({
      item: strategyPlatform,
      status: "failed",
      now: "2026-01-01T00:00:01.000Z",
      payload: { error: "发布包缺少钩子。" },
    });

    const summary = buildGateActionReceiptSummary([totalGateReceipt, platformReceipt]);
    const failedFanqie = filterGateActionReceipts([totalGateReceipt, platformReceipt], {
      platformId: "fanqie",
      status: "failed",
    });

    assert.equal(gateActionReceiptPlatform(totalGateReceipt).name, "总闸门");
    assert.equal(gateActionReceiptPlatform(platformReceipt).name, "番茄小说");
    assert.equal(summary.total, 2);
    assert.equal(summary.succeeded, 1);
    assert.equal(summary.failed, 1);
    assert.equal(summary.failedActions, 1);
    assert.equal(summary.platforms.find((platform) => platform.id === "manual")?.total, 1);
    assert.equal(summary.platforms.find((platform) => platform.id === "fanqie")?.total, 1);
    assert.equal(failedFanqie.length, 1);
    assert.equal(failedFanqie[0].actionId, "platform-strategy:fanqie:generate_asset_variants");
  });

  await t.test("turns repeated failures into urgent review advice", () => {
    const failedAsset = buildGatePlatformStrategyReceipt({
      item: strategyPlatform,
      status: "failed",
      now: "2026-01-01T00:00:00.000Z",
      payload: { error: "标题钩子太弱。" },
    });
    const failedRewrite = buildGatePlatformStrategyReceipt({
      item: {
        ...strategyPlatform,
        actionType: "rewrite_first_three",
        actionLabel: "重写前三章",
      },
      status: "failed",
      now: "2026-01-01T00:00:01.000Z",
      payload: { error: "前三章缺少冲突升级。" },
    });

    const advice = buildGateActionReviewAdvice([failedAsset, failedRewrite]);

    assert.equal(advice[0].severity, "urgent");
    assert.equal(advice[0].state, "open");
    assert.equal(advice[0].platformId, "fanqie");
    assert.ok(advice[0].headline.includes("失败偏多"));
    assert.equal(advice[0].action.kind, "handle_failure");
    assert.equal(advice[0].action.label, "处理失败项");
  });

  await t.test("pushes generated assets toward baseline adoption", () => {
    const assetReceipt = buildGatePlatformStrategyReceipt({
      item: strategyPlatform,
      status: "succeeded",
      now: "2026-01-01T00:00:00.000Z",
      payload: {
        variants: [{ strategy: "强钩子版" }, { strategy: "短剧版" }],
      },
    });

    const advice = buildGateActionReviewAdvice([assetReceipt]);

    assert.equal(advice[0].severity, "opportunity");
    assert.equal(advice[0].state, "open");
    assert.equal(advice[0].platformId, "fanqie");
    assert.ok(advice[0].headline.includes("资产生成了"));
    assert.equal(advice[0].action.kind, "adopt_asset");
    assert.equal(advice[0].action.label, "采纳投稿方案");
    assert.equal(advice[0].action.href, "/projects/project-1#submission-asset-editor");
  });

  await t.test("asks for metrics after a platform baseline is saved", () => {
    const snapshotReceipt = buildGatePlatformStrategyReceipt({
      item: {
        ...strategyPlatform,
        actionType: "save_snapshot",
        actionLabel: "保存基准",
      },
      status: "succeeded",
      now: "2026-01-01T00:00:00.000Z",
      payload: { task: { id: "snapshot-1", status: "succeeded" } },
    });

    const advice = buildGateActionReviewAdvice([snapshotReceipt]);

    assert.equal(advice[0].severity, "warning");
    assert.equal(advice[0].state, "open");
    assert.equal(advice[0].platformId, "fanqie");
    assert.ok(advice[0].headline.includes("发布基准"));
    assert.equal(advice[0].action.kind, "record_metrics");
    assert.equal(advice[0].action.label, "回填发布效果");
    assert.equal(advice[0].action.href, "/projects/project-1#publish-effect-panel");
  });

  await t.test("builds audit receipts when an advice action is accepted", () => {
    const assetReceipt = buildGatePlatformStrategyReceipt({
      item: strategyPlatform,
      status: "succeeded",
      now: "2026-01-01T00:00:00.000Z",
      payload: {
        variants: [{ strategy: "强钩子版" }],
      },
    });
    const advice = buildGateActionReviewAdvice([assetReceipt])[0];
    const receipt = buildGateAdviceActionReceipt({
      advice,
      now: "2026-01-01T00:00:01.000Z",
    });

    assert.equal(receipt.id, "gate-advice:fanqie:asset-without-baseline:2026-01-01T00:00:01.000Z");
    assert.equal(receipt.actionId, "gate-advice:adopt_asset:fanqie");
    assert.equal(receipt.executionType, "manual");
    assert.equal(receipt.platformId, "fanqie");
    assert.equal(receipt.platformName, "番茄小说");
    assert.equal(receipt.href, "/projects/project-1#submission-asset-editor");
    assert.equal(receipt.succeededCount, 1);
    assert.equal(receipt.recheck.label, "复检建议处理结果");
  });

  await t.test("marks accepted advice as in progress until a resolving receipt appears", () => {
    const assetReceipt = buildGatePlatformStrategyReceipt({
      item: strategyPlatform,
      status: "succeeded",
      now: "2026-01-01T00:00:00.000Z",
      payload: {
        variants: [{ strategy: "强钩子版" }],
      },
    });
    const accepted = buildGateAdviceActionReceipt({
      advice: buildGateActionReviewAdvice([assetReceipt])[0],
      now: "2026-01-01T00:00:01.000Z",
    });

    const advice = buildGateActionReviewAdvice([assetReceipt, accepted]);

    assert.equal(advice[0].id, "fanqie:asset-without-baseline");
    assert.equal(advice[0].state, "in_progress");
    assert.ok(advice[0].headline.includes("已响应"));
  });

  await t.test("clears asset advice after a later baseline receipt", () => {
    const assetReceipt = buildGatePlatformStrategyReceipt({
      item: strategyPlatform,
      status: "succeeded",
      now: "2026-01-01T00:00:00.000Z",
      payload: {
        variants: [{ strategy: "强钩子版" }],
      },
    });
    const baselineReceipt = buildGatePlatformStrategyReceipt({
      item: {
        ...strategyPlatform,
        actionType: "save_snapshot",
        actionLabel: "保存基准",
      },
      status: "succeeded",
      now: "2026-01-01T00:00:02.000Z",
      payload: { task: { id: "snapshot-1", status: "succeeded" } },
    });

    const advice = buildGateActionReviewAdvice([assetReceipt, baselineReceipt]);

    assert.equal(advice[0].id, "fanqie:baseline-needs-metrics");
    assert.equal(advice[0].action.kind, "record_metrics");
    assert.ok(!advice.some((item) => item.id === "fanqie:asset-without-baseline"));
  });

  await t.test("builds publish effect receipts for the gate audit log", () => {
    const receipt = buildGatePublishEffectReceipt({
      projectId: "project-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      now: "2026-01-01T00:00:00.000Z",
      metric: {
        views: 1200,
        clicks: 180,
        favorites: 72,
        follows: 36,
        snapshotDate: "2026-01-01",
      },
    });

    assert.equal(receipt.actionId, "platform-strategy:fanqie:save_effect");
    assert.equal(receipt.executionType, "platform_strategy");
    assert.equal(receipt.href, "/projects/project-1#publish-effect-panel");
    assert.equal(receipt.platformName, "番茄小说");
    assert.ok(receipt.message.includes("曝光 1200"));
    assert.equal(receipt.recheck.label, "复检发布效果建议");
  });

  await t.test("clears metrics advice after publish effect is recorded", () => {
    const baselineReceipt = buildGatePlatformStrategyReceipt({
      item: {
        ...strategyPlatform,
        actionType: "save_snapshot",
        actionLabel: "保存基准",
      },
      status: "succeeded",
      now: "2026-01-01T00:00:00.000Z",
      payload: { task: { id: "snapshot-1", status: "succeeded" } },
    });
    const accepted = buildGateAdviceActionReceipt({
      advice: buildGateActionReviewAdvice([baselineReceipt])[0],
      now: "2026-01-01T00:00:01.000Z",
    });
    const effectReceipt = buildGatePublishEffectReceipt({
      projectId: "project-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      now: "2026-01-01T00:00:02.000Z",
      metric: {
        views: 1200,
        clicks: 180,
        favorites: 72,
        follows: 36,
      },
    });

    const advice = buildGateActionReviewAdvice([baselineReceipt, accepted, effectReceipt]);

    assert.ok(!advice.some((item) => item.id === "fanqie:baseline-needs-metrics"));
  });

  await t.test("ranks platforms by growth review priority", () => {
    const fanqieFailure = buildGatePlatformStrategyReceipt({
      item: {
        ...strategyPlatform,
        actionType: "rewrite_first_three",
        actionLabel: "重写前三章",
      },
      status: "failed",
      now: "2026-01-01T00:00:03.000Z",
      payload: { error: "前三章冲突不足。" },
    });
    const qimaoBaseline = buildGatePlatformStrategyReceipt({
      item: {
        ...strategyPlatform,
        platformId: "qimao",
        platformName: "七猫小说",
        actionType: "save_snapshot",
        actionLabel: "保存基准",
        href: "/projects/project-2#platform-export",
      },
      status: "succeeded",
      now: "2026-01-01T00:00:02.000Z",
      payload: { task: { id: "snapshot-qimao", status: "succeeded" } },
    });
    const webnovelEffect = buildGatePublishEffectReceipt({
      projectId: "project-3",
      platformId: "webnovel",
      platformName: "WebNovel",
      now: "2026-01-01T00:00:01.000Z",
      metric: {
        views: 2000,
        clicks: 300,
        favorites: 120,
        follows: 80,
      },
    });

    const review = buildGatePlatformGrowthReview([webnovelEffect, qimaoBaseline, fanqieFailure]);

    assert.equal(review[0].platformId, "fanqie");
    assert.equal(review[0].stage, "fix_failure");
    assert.equal(review[0].stageLabel, "先救火");
    assert.equal(review[0].failed, 1);
    assert.ok(review[0].priorityScore > review[1].priorityScore);
    assert.equal(review[1].platformId, "qimao");
    assert.equal(review[1].stage, "record_metrics");
    assert.equal(review[1].href, "/projects/project-2#publish-effect-panel");
    assert.equal(review[2].platformId, "webnovel");
    assert.equal(review[2].stage, "scale_up");
  });

  await t.test("moves generated assets to adoption in the growth review", () => {
    const assetReceipt = buildGatePlatformStrategyReceipt({
      item: strategyPlatform,
      status: "succeeded",
      now: "2026-01-01T00:00:00.000Z",
      payload: {
        variants: [{ strategy: "强钩子版" }],
      },
    });

    const review = buildGatePlatformGrowthReview([assetReceipt]);

    assert.equal(review.length, 1);
    assert.equal(review[0].stage, "adopt_asset");
    assert.equal(review[0].stageLabel, "采纳资产");
    assert.equal(review[0].assetRuns, 1);
    assert.equal(review[0].baselines, 0);
    assert.equal(review[0].href, "/projects/project-1#submission-asset-editor");
    assert.ok(review[0].evidence.includes("资产 1"));
  });

  await t.test("turns growth review items into role-based dispatch cards", () => {
    const baselineReceipt = buildGatePlatformStrategyReceipt({
      item: {
        ...strategyPlatform,
        platformId: "qimao",
        platformName: "七猫小说",
        actionType: "save_snapshot",
        actionLabel: "保存基准",
        href: "/projects/project-2#platform-export",
      },
      status: "succeeded",
      now: "2026-01-01T00:00:00.000Z",
      payload: { task: { id: "snapshot-qimao", status: "succeeded" } },
    });

    const dispatchItems = buildGatePlatformGrowthDispatchItems([baselineReceipt]);

    assert.equal(dispatchItems.length, 1);
    assert.equal(dispatchItems[0].platformId, "qimao");
    assert.equal(dispatchItems[0].stage, "record_metrics");
    assert.equal(dispatchItems[0].state, "queued");
    assert.equal(dispatchItems[0].ownerRole, "运营数据编辑");
    assert.equal(dispatchItems[0].actionLabel, "派给数据编辑");
    assert.ok(dispatchItems[0].acceptanceCriteria.includes("曝光点击已填写"));
  });

  await t.test("records dispatch receipts and marks the dispatch as assigned", () => {
    const assetReceipt = buildGatePlatformStrategyReceipt({
      item: strategyPlatform,
      status: "succeeded",
      now: "2026-01-01T00:00:00.000Z",
      payload: {
        variants: [{ strategy: "强钩子版" }],
      },
    });
    const dispatch = buildGatePlatformGrowthDispatchItems([assetReceipt])[0];
    const receipt = buildGatePlatformDispatchReceipt({
      dispatch,
      now: "2026-01-01T00:00:01.000Z",
    });
    const nextDispatch = buildGatePlatformGrowthDispatchItems([assetReceipt, receipt])[0];
    const review = buildGatePlatformGrowthReview([assetReceipt, receipt]);

    assert.equal(receipt.actionId, "gate-platform-dispatch:adopt_asset:fanqie");
    assert.equal(receipt.executionType, "manual");
    assert.equal(receipt.platformName, "番茄小说");
    assert.ok(receipt.recheck.detail.includes("验收标准"));
    assert.equal(nextDispatch.state, "assigned");
    assert.equal(review[0].assetRuns, 1);
    assert.equal(review[0].total, 1);
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
