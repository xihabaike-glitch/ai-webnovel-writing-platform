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
  buildGateDispatchEvidenceReview,
  buildGatePlatformScaleGate,
  buildGatePlatformScaleFollowup,
  buildGatePlatformScaleCadence,
  buildGatePlatformRetreatGate,
  buildGatePlatformRetreatDispatchItems,
  buildGatePlatformRetreatResolution,
  buildGatePlatformRetreatRecheckDispatchItems,
  buildGatePlatformDecisionTimeline,
  buildGatePlatformDecisionSummaryMarkdown,
  buildGatePlatformTacticExperienceLibrary,
  buildGatePlatformTacticExperienceMarkdown,
  filterGatePlatformDecisionTimelineItems,
  buildGateDispatchTaskCenter,
  buildGateDispatchTaskCloseoutItem,
  buildGatePublishEffectReceipt,
  filterGateDispatchTasks,
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

  await t.test("gates platform scale-up behind verified dispatch evidence", () => {
    const fanqieEffect = buildGatePublishEffectReceipt({
      projectId: "project-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      now: "2026-01-01T02:00:00.000Z",
      metric: {
        views: 3000,
        clicks: 500,
        favorites: 160,
        follows: 90,
      },
    });
    const qimaoEffect = buildGatePublishEffectReceipt({
      projectId: "project-2",
      platformId: "qimao",
      platformName: "七猫小说",
      now: "2026-01-01T02:10:00.000Z",
      metric: {
        views: 1800,
        clicks: 220,
        favorites: 70,
        follows: 32,
      },
    });
    const webnovelEffect = buildGatePublishEffectReceipt({
      projectId: "project-3",
      platformId: "webnovel",
      platformName: "WebNovel",
      now: "2026-01-01T02:20:00.000Z",
      metric: {
        views: 1200,
        clicks: 180,
        favorites: 62,
        follows: 28,
      },
    });
    const reviews = buildGatePlatformGrowthReview([webnovelEffect, qimaoEffect, fanqieEffect]);
    const fanqieDispatch = buildGatePlatformGrowthDispatchItems([fanqieEffect])[0];
    const qimaoDispatch = buildGatePlatformGrowthDispatchItems([qimaoEffect])[0];
    const verifiedFanqieTask = {
      ...fanqieDispatch,
      databaseId: "dispatch-db-fanqie",
      dispatchKey: fanqieDispatch.id,
      projectId: "project-1",
      sourceReceiptId: null,
      completionEvidence: "已完成小步加码并回填后一轮效果。",
      state: "completed" as const,
      assignedAt: "2026-01-01T02:30:00.000Z",
      completedAt: "2026-01-01T03:00:00.000Z",
      createdAt: "2026-01-01T02:30:00.000Z",
      updatedAt: "2026-01-01T03:00:00.000Z",
    };
    const qimaoTaskWithoutReceipt = {
      ...qimaoDispatch,
      databaseId: "dispatch-db-qimao",
      dispatchKey: qimaoDispatch.id,
      projectId: "project-2",
      sourceReceiptId: null,
      completionEvidence: "已做小步加码，等下一条回执。",
      state: "completed" as const,
      assignedAt: "2026-01-01T02:30:00.000Z",
      completedAt: "2026-01-01T03:00:00.000Z",
      createdAt: "2026-01-01T02:30:00.000Z",
      updatedAt: "2026-01-01T03:00:00.000Z",
    };
    const fanqieLaterReceipt = buildGatePublishEffectReceipt({
      projectId: "project-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      now: "2026-01-01T04:00:00.000Z",
      metric: {
        views: 3600,
        clicks: 620,
        favorites: 200,
        follows: 120,
      },
    });
    const evidenceReview = buildGateDispatchEvidenceReview(
      [verifiedFanqieTask, qimaoTaskWithoutReceipt],
      [fanqieLaterReceipt, webnovelEffect, qimaoEffect, fanqieEffect],
    );

    const gate = buildGatePlatformScaleGate(reviews, evidenceReview);

    assert.equal(gate.summary.candidates, 3);
    assert.equal(gate.summary.ready, 1);
    assert.equal(gate.summary.blockedEvidence, 1);
    assert.equal(gate.summary.needsDispatch, 1);
    assert.equal(gate.items.find((item) => item.platformId === "fanqie")?.status, "ready");
    assert.equal(gate.items.find((item) => item.platformId === "qimao")?.status, "blocked_evidence");
    assert.equal(gate.items.find((item) => item.platformId === "webnovel")?.status, "needs_dispatch");
    assert.ok(gate.nextActions.some((actionText) => actionText.includes("真闭环派单")));
  });

  await t.test("requires post-scale publish effect before a second scale-up", () => {
    const fanqieEffect = buildGatePublishEffectReceipt({
      projectId: "project-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      now: "2026-01-01T02:00:00.000Z",
      metric: {
        views: 3000,
        clicks: 500,
        favorites: 160,
        follows: 90,
      },
    });
    const reviews = buildGatePlatformGrowthReview([fanqieEffect]);
    const scaleDispatch = buildGatePlatformGrowthDispatchItems([fanqieEffect])[0];
    const completedScaleTask = {
      ...scaleDispatch,
      databaseId: "dispatch-db-scale",
      dispatchKey: scaleDispatch.id,
      projectId: "project-1",
      sourceReceiptId: null,
      completionEvidence: "已把推荐量放大 20%，保留原标题和标签作为对照。",
      state: "completed" as const,
      assignedAt: "2026-01-01T02:30:00.000Z",
      completedAt: "2026-01-01T03:00:00.000Z",
      createdAt: "2026-01-01T02:30:00.000Z",
      updatedAt: "2026-01-01T03:00:00.000Z",
    };
    const laterNonEffectReceipt = buildGatePlatformStrategyReceipt({
      item: {
        ...strategyPlatform,
        actionType: "generate_asset_variants",
        actionLabel: "生成投稿方案",
      },
      status: "succeeded",
      now: "2026-01-01T04:00:00.000Z",
      payload: {
        variants: [{ strategy: "加码后标题备选" }],
      },
    });
    const evidenceReview = buildGateDispatchEvidenceReview(
      [completedScaleTask],
      [laterNonEffectReceipt, fanqieEffect],
    );
    const followup = buildGatePlatformScaleFollowup(
      [completedScaleTask],
      [laterNonEffectReceipt, fanqieEffect],
    );
    const blockedGate = buildGatePlatformScaleGate(reviews, evidenceReview, followup);
    const laterEffectReceipt = buildGatePublishEffectReceipt({
      projectId: "project-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      now: "2026-01-01T05:00:00.000Z",
      metric: {
        views: 4200,
        clicks: 760,
        favorites: 240,
        follows: 150,
      },
    });
    const trackedFollowup = buildGatePlatformScaleFollowup(
      [completedScaleTask],
      [laterEffectReceipt, laterNonEffectReceipt, fanqieEffect],
    );
    const readyGate = buildGatePlatformScaleGate(
      reviews,
      buildGateDispatchEvidenceReview([completedScaleTask], [laterEffectReceipt, laterNonEffectReceipt, fanqieEffect]),
      trackedFollowup,
    );

    assert.equal(evidenceReview.items[0].status, "verified");
    assert.equal(followup.summary.needsEffect, 1);
    assert.equal(followup.items[0].status, "needs_effect");
    assert.equal(blockedGate.items[0].status, "blocked_evidence");
    assert.equal(blockedGate.items[0].label, "等待加码效果");
    assert.equal(trackedFollowup.summary.tracked, 1);
    assert.equal(readyGate.items[0].status, "ready");
  });

  await t.test("controls continuous scale-up cadence by window, cooldown, and follow-up", () => {
    const fanqieEffect = buildGatePublishEffectReceipt({
      projectId: "project-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      now: "2026-01-20T00:00:00.000Z",
      metric: {
        views: 3000,
        clicks: 500,
        favorites: 160,
        follows: 90,
      },
    });
    const qimaoEffect = buildGatePublishEffectReceipt({
      projectId: "project-2",
      platformId: "qimao",
      platformName: "七猫小说",
      now: "2026-01-20T00:10:00.000Z",
      metric: {
        views: 2500,
        clicks: 420,
        favorites: 120,
        follows: 70,
      },
    });
    const webnovelEffect = buildGatePublishEffectReceipt({
      projectId: "project-3",
      platformId: "webnovel",
      platformName: "WebNovel",
      now: "2026-01-20T00:20:00.000Z",
      metric: {
        views: 1800,
        clicks: 280,
        favorites: 90,
        follows: 48,
      },
    });
    const reviews = buildGatePlatformGrowthReview([webnovelEffect, qimaoEffect, fanqieEffect]);
    const fanqieDispatch = buildGatePlatformGrowthDispatchItems([fanqieEffect])[0];
    const qimaoDispatch = buildGatePlatformGrowthDispatchItems([qimaoEffect])[0];
    const webnovelDispatch = buildGatePlatformGrowthDispatchItems([webnovelEffect])[0];
    const fanqieRecentTask = {
      ...fanqieDispatch,
      databaseId: "dispatch-db-fanqie-recent",
      dispatchKey: fanqieDispatch.id,
      projectId: "project-1",
      sourceReceiptId: null,
      completionEvidence: "已完成一轮小步加码并记录范围。",
      state: "completed" as const,
      assignedAt: "2026-01-18T08:00:00.000Z",
      completedAt: "2026-01-18T09:00:00.000Z",
      createdAt: "2026-01-18T08:00:00.000Z",
      updatedAt: "2026-01-18T09:00:00.000Z",
    };
    const qimaoFirstTask = {
      ...qimaoDispatch,
      databaseId: "dispatch-db-qimao-1",
      dispatchKey: qimaoDispatch.id,
      projectId: "project-2",
      sourceReceiptId: null,
      completionEvidence: "已完成第一轮小步加码。",
      state: "completed" as const,
      assignedAt: "2026-01-08T08:00:00.000Z",
      completedAt: "2026-01-08T09:00:00.000Z",
      createdAt: "2026-01-08T08:00:00.000Z",
      updatedAt: "2026-01-08T09:00:00.000Z",
    };
    const qimaoSecondTask = {
      ...qimaoDispatch,
      databaseId: "dispatch-db-qimao-2",
      dispatchKey: "qimao:scale_up:second",
      projectId: "project-2",
      sourceReceiptId: null,
      completionEvidence: "已完成第二轮小步加码。",
      state: "completed" as const,
      assignedAt: "2026-01-16T08:00:00.000Z",
      completedAt: "2026-01-16T09:00:00.000Z",
      createdAt: "2026-01-16T08:00:00.000Z",
      updatedAt: "2026-01-16T09:00:00.000Z",
    };
    const webnovelTask = {
      ...webnovelDispatch,
      databaseId: "dispatch-db-webnovel",
      dispatchKey: webnovelDispatch.id,
      projectId: "project-3",
      sourceReceiptId: null,
      completionEvidence: "已完成海外小步加码。",
      state: "completed" as const,
      assignedAt: "2026-01-20T08:00:00.000Z",
      completedAt: "2026-01-20T09:00:00.000Z",
      createdAt: "2026-01-20T08:00:00.000Z",
      updatedAt: "2026-01-20T09:00:00.000Z",
    };
    const fanqieAfterScaleEffect = buildGatePublishEffectReceipt({
      projectId: "project-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      now: "2026-01-19T09:00:00.000Z",
      metric: {
        views: 3600,
        clicks: 620,
        favorites: 190,
        follows: 110,
      },
    });
    const qimaoAfterSecondScaleEffect = buildGatePublishEffectReceipt({
      projectId: "project-2",
      platformId: "qimao",
      platformName: "七猫小说",
      now: "2026-01-17T09:00:00.000Z",
      metric: {
        views: 2800,
        clicks: 460,
        favorites: 150,
        follows: 92,
      },
    });
    const receipts = [qimaoAfterSecondScaleEffect, fanqieAfterScaleEffect, webnovelEffect, qimaoEffect, fanqieEffect];
    const tasks = [fanqieRecentTask, qimaoFirstTask, qimaoSecondTask, webnovelTask];
    const followup = buildGatePlatformScaleFollowup(tasks, receipts);
    const cadence = buildGatePlatformScaleCadence(reviews, tasks, followup, "2026-01-20T12:00:00.000Z", {
      windowDays: 14,
      maxScaleInWindow: 2,
      cooldownDays: 7,
    });
    const evidenceReview = buildGateDispatchEvidenceReview(tasks, receipts);
    const gate = buildGatePlatformScaleGate(reviews, evidenceReview, followup, cadence);

    assert.equal(cadence.items.find((item) => item.platformId === "fanqie")?.status, "cooldown");
    assert.equal(cadence.items.find((item) => item.platformId === "qimao")?.status, "over_limit");
    assert.equal(cadence.items.find((item) => item.platformId === "webnovel")?.status, "needs_followup");
    assert.equal(gate.items.find((item) => item.platformId === "fanqie")?.status, "blocked_evidence");
    assert.ok(cadence.nextActions.some((actionText) => actionText.includes("冷却期")));
    assert.ok(cadence.nextActions.some((actionText) => actionText.includes("上限")));
  });

  await t.test("forces tactic repair or platform pivot when effects decline", () => {
    const fanqieStrong = buildGatePublishEffectReceipt({
      projectId: "project-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      now: "2026-01-01T00:00:00.000Z",
      metric: {
        views: 3000,
        clicks: 600,
        favorites: 210,
        follows: 120,
      },
    });
    const fanqieWeak = buildGatePublishEffectReceipt({
      projectId: "project-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      now: "2026-01-08T00:00:00.000Z",
      metric: {
        views: 2600,
        clicks: 260,
        favorites: 88,
        follows: 38,
      },
    });
    const fanqieWeaker = buildGatePublishEffectReceipt({
      projectId: "project-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      now: "2026-01-15T00:00:00.000Z",
      metric: {
        views: 2400,
        clicks: 96,
        favorites: 35,
        follows: 10,
      },
    });
    const qimaoWeak = buildGatePublishEffectReceipt({
      projectId: "project-2",
      platformId: "qimao",
      platformName: "七猫小说",
      now: "2026-01-15T00:10:00.000Z",
      metric: {
        views: 2000,
        clicks: 70,
        favorites: 20,
        follows: 8,
      },
    });
    const webnovelGood = buildGatePublishEffectReceipt({
      projectId: "project-3",
      platformId: "webnovel",
      platformName: "WebNovel",
      now: "2026-01-15T00:20:00.000Z",
      metric: {
        views: 1800,
        clicks: 260,
        favorites: 110,
        follows: 62,
      },
    });
    const receipts = [webnovelGood, qimaoWeak, fanqieWeaker, fanqieWeak, fanqieStrong];
    const reviews = buildGatePlatformGrowthReview(receipts);
    const retreatGate = buildGatePlatformRetreatGate(receipts, reviews);
    const fanqieDispatch = buildGatePlatformGrowthDispatchItems([fanqieWeaker])[0];
    const fanqieTask = {
      ...fanqieDispatch,
      databaseId: "dispatch-db-fanqie-retreat",
      dispatchKey: fanqieDispatch.id,
      projectId: "project-1",
      sourceReceiptId: null,
      completionEvidence: "已完成上一轮小步加码。",
      state: "completed" as const,
      assignedAt: "2026-01-10T08:00:00.000Z",
      completedAt: "2026-01-10T09:00:00.000Z",
      createdAt: "2026-01-10T08:00:00.000Z",
      updatedAt: "2026-01-10T09:00:00.000Z",
    };
    const followup = buildGatePlatformScaleFollowup([fanqieTask], receipts);
    const cadence = buildGatePlatformScaleCadence(reviews, [fanqieTask], followup, "2026-01-20T00:00:00.000Z");
    const scaleGate = buildGatePlatformScaleGate(
      reviews,
      buildGateDispatchEvidenceReview([fanqieTask], receipts),
      followup,
      cadence,
      retreatGate,
    );

    assert.equal(retreatGate.items.find((item) => item.platformId === "fanqie")?.status, "pivot_platform");
    assert.equal(retreatGate.items.find((item) => item.platformId === "qimao")?.status, "repair_tactic");
    assert.equal(retreatGate.items.find((item) => item.platformId === "webnovel")?.status, "watch");
    assert.equal(scaleGate.items.find((item) => item.platformId === "fanqie")?.status, "blocked_evidence");
    assert.ok(retreatGate.nextActions.some((actionText) => actionText.includes("换打法")));
  });

  await t.test("turns retreat decisions into role-based repair dispatch cards", () => {
    const fanqieStrong = buildGatePublishEffectReceipt({
      projectId: "project-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      now: "2026-01-01T00:00:00.000Z",
      metric: { views: 3000, clicks: 600, favorites: 210, follows: 120 },
    });
    const fanqieWeak = buildGatePublishEffectReceipt({
      projectId: "project-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      now: "2026-01-08T00:00:00.000Z",
      metric: { views: 2600, clicks: 260, favorites: 88, follows: 38 },
    });
    const fanqieWeaker = buildGatePublishEffectReceipt({
      projectId: "project-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      now: "2026-01-15T00:00:00.000Z",
      metric: { views: 2400, clicks: 96, favorites: 35, follows: 10 },
    });
    const qimaoWeak = buildGatePublishEffectReceipt({
      projectId: "project-2",
      platformId: "qimao",
      platformName: "七猫小说",
      now: "2026-01-15T00:10:00.000Z",
      metric: { views: 2000, clicks: 70, favorites: 20, follows: 8 },
    });
    const webnovelZero = buildGatePublishEffectReceipt({
      projectId: "project-3",
      platformId: "webnovel",
      platformName: "WebNovel",
      now: "2026-01-15T00:20:00.000Z",
      metric: { views: 600, clicks: 0, favorites: 0, follows: 0 },
    });
    const retreatGate = buildGatePlatformRetreatGate([
      webnovelZero,
      qimaoWeak,
      fanqieWeaker,
      fanqieWeak,
      fanqieStrong,
    ]);
    const queuedDispatches = buildGatePlatformRetreatDispatchItems(retreatGate);
    const assignedDispatches = buildGatePlatformRetreatDispatchItems(retreatGate, [{
      ...queuedDispatches.find((item) => item.platformId === "fanqie")!,
      databaseId: "dispatch-db-retreat",
      dispatchKey: "fanqie:pivot_platform",
      projectId: "project-1",
      sourceReceiptId: null,
      completionEvidence: "",
      state: "assigned",
      assignedAt: "2026-01-15T01:00:00.000Z",
      completedAt: null,
      createdAt: "2026-01-15T01:00:00.000Z",
      updatedAt: "2026-01-15T01:00:00.000Z",
    }]);

    assert.equal(queuedDispatches.length, 3);
    assert.equal(queuedDispatches.find((item) => item.platformId === "fanqie")?.stage, "pivot_platform");
    assert.equal(queuedDispatches.find((item) => item.platformId === "qimao")?.ownerRole, "投稿打法编辑");
    assert.equal(queuedDispatches.find((item) => item.platformId === "webnovel")?.stage, "pause_platform");
    assert.equal(assignedDispatches.find((item) => item.platformId === "fanqie")?.state, "assigned");
    assert.ok(queuedDispatches.find((item) => item.platformId === "qimao")?.acceptanceCriteria.includes("标题简介完成新版"));
  });

  await t.test("requires post-repair effect evidence before retreat blocks are released", () => {
    const fanqieStrong = buildGatePublishEffectReceipt({
      projectId: "project-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      now: "2026-01-01T00:00:00.000Z",
      metric: { views: 3000, clicks: 600, favorites: 210, follows: 120 },
    });
    const fanqieWeak = buildGatePublishEffectReceipt({
      projectId: "project-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      now: "2026-01-08T00:00:00.000Z",
      metric: { views: 2600, clicks: 260, favorites: 88, follows: 38 },
    });
    const fanqieWeaker = buildGatePublishEffectReceipt({
      projectId: "project-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      now: "2026-01-15T00:00:00.000Z",
      metric: { views: 2400, clicks: 96, favorites: 35, follows: 10 },
    });
    const reviews = buildGatePlatformGrowthReview([fanqieWeaker, fanqieWeak, fanqieStrong]);
    const retreatGate = buildGatePlatformRetreatGate([fanqieWeaker, fanqieWeak, fanqieStrong], reviews);
    const retreatDispatch = buildGatePlatformRetreatDispatchItems(retreatGate)[0];
    const completedRetreatTask = {
      ...retreatDispatch,
      databaseId: "dispatch-db-retreat-fanqie",
      dispatchKey: retreatDispatch.id,
      projectId: "project-1",
      sourceReceiptId: null,
      completionEvidence: "已重写标题简介标签，并列出前三章兑现修复点。",
      state: "completed" as const,
      assignedAt: "2026-01-15T00:30:00.000Z",
      completedAt: "2026-01-15T01:00:00.000Z",
      createdAt: "2026-01-15T00:30:00.000Z",
      updatedAt: "2026-01-15T01:00:00.000Z",
    };
    const pendingResolution = buildGatePlatformRetreatResolution(
      [completedRetreatTask],
      [fanqieWeaker, fanqieWeak, fanqieStrong],
    );
    const blockedGate = buildGatePlatformScaleGate(
      reviews,
      buildGateDispatchEvidenceReview([completedRetreatTask], [fanqieWeaker, fanqieWeak, fanqieStrong]),
      undefined,
      undefined,
      retreatGate,
      pendingResolution,
    );
    const laterEffect = buildGatePublishEffectReceipt({
      projectId: "project-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      now: "2026-01-16T00:00:00.000Z",
      metric: { views: 2600, clicks: 420, favorites: 150, follows: 70 },
    });
    const resolvedResolution = buildGatePlatformRetreatResolution(
      [completedRetreatTask],
      [laterEffect, fanqieWeaker, fanqieWeak, fanqieStrong],
    );
    const stillBlockedGate = buildGatePlatformScaleGate(
      reviews,
      buildGateDispatchEvidenceReview([completedRetreatTask], [laterEffect, fanqieWeaker, fanqieWeak, fanqieStrong]),
      undefined,
      undefined,
      retreatGate,
      resolvedResolution,
    );
    const updatedReviews = buildGatePlatformGrowthReview([laterEffect, fanqieWeaker, fanqieWeak, fanqieStrong]);
    const updatedRetreatGate = buildGatePlatformRetreatGate([laterEffect, fanqieWeaker, fanqieWeak, fanqieStrong], updatedReviews);
    const recheckGate = buildGatePlatformScaleGate(
      updatedReviews,
      buildGateDispatchEvidenceReview([completedRetreatTask], [laterEffect, fanqieWeaker, fanqieWeak, fanqieStrong]),
      undefined,
      undefined,
      updatedRetreatGate,
      resolvedResolution,
    );
    const recheckDispatches = buildGatePlatformRetreatRecheckDispatchItems(recheckGate, resolvedResolution);
    const assignedRecheckDispatches = buildGatePlatformRetreatRecheckDispatchItems(recheckGate, resolvedResolution, [{
      ...recheckDispatches[0],
      databaseId: "dispatch-db-retreat-recheck",
      dispatchKey: recheckDispatches[0].id,
      projectId: "project-1",
      sourceReceiptId: null,
      completionEvidence: "",
      state: "assigned",
      assignedAt: "2026-01-16T00:30:00.000Z",
      completedAt: null,
      createdAt: "2026-01-16T00:30:00.000Z",
      updatedAt: "2026-01-16T00:30:00.000Z",
    }]);
    const completedRecheckTask = {
      ...recheckDispatches[0],
      databaseId: "dispatch-db-retreat-recheck-done",
      dispatchKey: recheckDispatches[0].id,
      projectId: "project-1",
      sourceReceiptId: null,
      completionEvidence: "已按修复后新标题小范围重验，保留复测版本作为新基准。",
      state: "completed" as const,
      assignedAt: "2026-01-16T00:30:00.000Z",
      completedAt: "2026-01-16T01:00:00.000Z",
      createdAt: "2026-01-16T00:30:00.000Z",
      updatedAt: "2026-01-16T01:00:00.000Z",
    };
    const postRecheckNonEffectReceipt = buildGatePlatformStrategyReceipt({
      item: {
        ...strategyPlatform,
        actionType: "generate_asset_variants",
        actionLabel: "生成投稿方案",
      },
      status: "succeeded",
      now: "2026-01-16T02:00:00.000Z",
      payload: {
        variants: [{ strategy: "重验后标题备选" }],
      },
    });
    const recheckFollowup = buildGatePlatformScaleFollowup(
      [completedRecheckTask],
      [postRecheckNonEffectReceipt, laterEffect, fanqieWeaker, fanqieWeak, fanqieStrong],
    );
    const recheckBlockedGate = buildGatePlatformScaleGate(
      updatedReviews,
      buildGateDispatchEvidenceReview([completedRecheckTask], [postRecheckNonEffectReceipt, laterEffect, fanqieWeaker, fanqieWeak, fanqieStrong]),
      recheckFollowup,
      undefined,
      updatedRetreatGate,
      resolvedResolution,
    );
    const postRecheckEffect = buildGatePublishEffectReceipt({
      projectId: "project-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      now: "2026-01-17T00:00:00.000Z",
      metric: { views: 3200, clicks: 640, favorites: 220, follows: 130 },
    });
    const trackedRecheckFollowup = buildGatePlatformScaleFollowup(
      [completedRecheckTask],
      [postRecheckEffect, postRecheckNonEffectReceipt, laterEffect, fanqieWeaker, fanqieWeak, fanqieStrong],
    );
    const decisionTimeline = buildGatePlatformDecisionTimeline({
      receipts: [postRecheckEffect, postRecheckNonEffectReceipt, laterEffect, fanqieWeaker, fanqieWeak, fanqieStrong],
      tasks: [completedRetreatTask, completedRecheckTask],
      retreatGate: updatedRetreatGate,
      retreatResolution: resolvedResolution,
      scaleFollowup: trackedRecheckFollowup,
    });
    const timelineItem = decisionTimeline.items.find((item) => item.platformId === "fanqie");
    const timelineMarkdown = buildGatePlatformDecisionSummaryMarkdown(timelineItem!);
    const tacticLibrary = buildGatePlatformTacticExperienceLibrary(decisionTimeline);
    const tacticItem = tacticLibrary.items.find((item) => item.platformId === "fanqie");
    const tacticMarkdown = buildGatePlatformTacticExperienceMarkdown(tacticItem!);

    assert.equal(retreatGate.items.find((item) => item.platformId === "fanqie")?.status, "pivot_platform");
    assert.equal(pendingResolution.items[0].status, "needs_effect");
    assert.equal(blockedGate.items.find((item) => item.platformId === "fanqie")?.label, "修复待复测");
    assert.equal(resolvedResolution.items[0].status, "resolved");
    assert.equal(stillBlockedGate.items.find((item) => item.platformId === "fanqie")?.label, "复测仍异常");
    assert.equal(updatedRetreatGate.items.find((item) => item.platformId === "fanqie")?.status, "healthy");
    assert.equal(recheckGate.items.find((item) => item.platformId === "fanqie")?.status, "needs_dispatch");
    assert.equal(recheckGate.items.find((item) => item.platformId === "fanqie")?.label, "修复后重验");
    assert.equal(recheckDispatches.length, 1);
    assert.equal(recheckDispatches[0].stage, "scale_up");
    assert.ok(recheckDispatches[0].id.includes("retreat_recheck"));
    assert.equal(recheckDispatches[0].title, "番茄小说 修复后小步重验");
    assert.equal(assignedRecheckDispatches[0].state, "assigned");
    assert.equal(recheckFollowup.items[0].status, "needs_effect");
    assert.equal(recheckFollowup.items[0].label, "待重验效果");
    assert.ok(recheckFollowup.nextActions.some((actionText) => actionText.includes("修复后重验缺下一轮效果")));
    assert.equal(recheckBlockedGate.items.find((item) => item.platformId === "fanqie")?.status, "blocked_evidence");
    assert.equal(recheckBlockedGate.items.find((item) => item.platformId === "fanqie")?.label, "等待加码效果");
    assert.equal(trackedRecheckFollowup.items[0].status, "tracked");
    assert.equal(trackedRecheckFollowup.items[0].label, "重验已回填");
    assert.equal(timelineItem?.status, "recovering");
    assert.equal(timelineItem?.events.some((event) => event.type === "repair" && event.label === "修复已复测"), true);
    assert.equal(timelineItem?.events.some((event) => event.type === "recheck" && event.label === "重验已回填"), true);
    assert.equal(timelineItem?.events[0].type, "effect");
    assert.equal(filterGatePlatformDecisionTimelineItems(decisionTimeline.items, { status: "recovering" }).length, 1);
    assert.equal(filterGatePlatformDecisionTimelineItems(decisionTimeline.items, { eventType: "recheck" })[0]?.platformId, "fanqie");
    assert.equal(filterGatePlatformDecisionTimelineItems(decisionTimeline.items, { status: "blocked" }).length, 0);
    assert.ok(timelineMarkdown.includes("# 番茄小说 平台决策复盘"));
    assert.ok(timelineMarkdown.includes("当前状态：修复后恢复"));
    assert.ok(timelineMarkdown.includes("重验已回填"));
    assert.ok(timelineMarkdown.includes("复盘口径"));
    assert.equal(tacticLibrary.summary.usable, 1);
    assert.equal(tacticItem?.status, "usable");
    assert.equal(tacticItem?.label, "可复用打法");
    assert.ok(tacticItem?.reuseHint.includes("小步重验"));
    assert.ok(tacticItem?.evidence.some((evidence) => evidence.includes("重验已回填")));
    assert.ok(tacticMarkdown.includes("# 番茄小说 平台打法经验"));
    assert.ok(tacticMarkdown.includes("可复用打法：修复后重验打法"));
    assert.ok(tacticMarkdown.includes("风险提醒"));
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

  await t.test("uses persisted dispatch tasks to keep completion state after refresh", () => {
    const assetReceipt = buildGatePlatformStrategyReceipt({
      item: strategyPlatform,
      status: "succeeded",
      now: "2026-01-01T00:00:00.000Z",
      payload: {
        variants: [{ strategy: "强钩子版" }],
      },
    });
    const dispatch = buildGatePlatformGrowthDispatchItems([assetReceipt])[0];

    const refreshed = buildGatePlatformGrowthDispatchItems([assetReceipt], 6, [{
      ...dispatch,
      databaseId: "dispatch-db-1",
      dispatchKey: dispatch.id,
      projectId: "project-1",
      sourceReceiptId: null,
      completionEvidence: "已完成资产采纳并保存基准。",
      state: "completed",
      assignedAt: "2026-01-01T00:00:01.000Z",
      completedAt: "2026-01-01T00:00:02.000Z",
      createdAt: "2026-01-01T00:00:01.000Z",
      updatedAt: "2026-01-01T00:00:02.000Z",
    }]);

    assert.equal(refreshed[0].id, "fanqie:adopt_asset");
    assert.equal(refreshed[0].state, "completed");
  });

  await t.test("summarizes and filters persisted dispatch tasks for the task center", () => {
    const baseDispatch = buildGatePlatformGrowthDispatchItems([buildGatePlatformStrategyReceipt({
      item: strategyPlatform,
      status: "succeeded",
      now: "2026-01-01T00:00:00.000Z",
      payload: {
        variants: [{ strategy: "强钩子版" }],
      },
    })])[0];
    const tasks = [
      {
        ...baseDispatch,
        databaseId: "dispatch-db-1",
        dispatchKey: baseDispatch.id,
        projectId: "project-1",
        sourceReceiptId: null,
        completionEvidence: "",
        state: "queued" as const,
        priorityScore: 86,
        assignedAt: null,
        completedAt: null,
        createdAt: "2026-01-01T00:00:01.000Z",
        updatedAt: "2026-01-01T00:00:01.000Z",
      },
      {
        ...baseDispatch,
        id: "qimao:record_metrics",
        databaseId: "dispatch-db-2",
        dispatchKey: "qimao:record_metrics",
        projectId: "project-2",
        sourceReceiptId: null,
        completionEvidence: "",
        platformId: "qimao",
        platformName: "七猫小说",
        stage: "record_metrics" as const,
        state: "assigned" as const,
        ownerRole: "运营数据编辑",
        priorityScore: 42,
        assignedAt: "2026-01-01T00:00:02.000Z",
        completedAt: null,
        createdAt: "2026-01-01T00:00:02.000Z",
        updatedAt: "2026-01-01T00:00:02.000Z",
      },
      {
        ...baseDispatch,
        id: "webnovel:scale_up",
        databaseId: "dispatch-db-3",
        dispatchKey: "webnovel:scale_up",
        projectId: "project-3",
        sourceReceiptId: null,
        completionEvidence: "已完成加码并记录下一轮数据口径。",
        platformId: "webnovel",
        platformName: "WebNovel",
        stage: "scale_up" as const,
        state: "completed" as const,
        ownerRole: "增长运营",
        priorityScore: 22,
        assignedAt: "2026-01-01T00:00:03.000Z",
        completedAt: "2026-01-01T00:00:04.000Z",
        createdAt: "2026-01-01T00:00:03.000Z",
        updatedAt: "2026-01-01T00:00:04.000Z",
      },
    ];

    const center = buildGateDispatchTaskCenter(tasks);
    const assigned = filterGateDispatchTasks(tasks, { state: "assigned" });
    const fanqie = filterGateDispatchTasks(tasks, { platformId: "fanqie" });

    assert.equal(center.summary.total, 3);
    assert.equal(center.summary.active, 2);
    assert.equal(center.summary.queued, 1);
    assert.equal(center.summary.assigned, 1);
    assert.equal(center.summary.completed, 1);
    assert.equal(center.platforms[0].id, "fanqie");
    assert.ok(center.nextActions.some((actionText) => actionText.includes("高优先级")));
    assert.equal(assigned.length, 1);
    assert.equal(assigned[0].platformId, "qimao");
    assert.equal(fanqie.length, 1);
    assert.equal(fanqie[0].ownerRole, "投稿资产编辑");
  });

  await t.test("flags overdue and today dispatch closeout items", () => {
    const baseDispatch = buildGatePlatformGrowthDispatchItems([buildGatePlatformStrategyReceipt({
      item: strategyPlatform,
      status: "succeeded",
      now: "2026-01-01T00:00:00.000Z",
      payload: {
        variants: [{ strategy: "强钩子版" }],
      },
    })])[0];
    const overdueTask = {
      ...baseDispatch,
      databaseId: "dispatch-db-overdue",
      dispatchKey: baseDispatch.id,
      projectId: "project-1",
      sourceReceiptId: null,
      completionEvidence: "",
      state: "assigned" as const,
      dueLabel: "24 小时内",
      assignedAt: "2026-01-01T08:00:00.000Z",
      completedAt: null,
      createdAt: "2026-01-01T08:00:00.000Z",
      updatedAt: "2026-01-01T08:00:00.000Z",
    };
    const todayTask = {
      ...baseDispatch,
      id: "qimao:record_metrics",
      databaseId: "dispatch-db-today",
      dispatchKey: "qimao:record_metrics",
      projectId: "project-2",
      sourceReceiptId: null,
      completionEvidence: "",
      platformId: "qimao",
      platformName: "七猫小说",
      stage: "record_metrics" as const,
      state: "assigned" as const,
      dueLabel: "今天",
      assignedAt: "2026-01-02T08:00:00.000Z",
      completedAt: null,
      createdAt: "2026-01-02T08:00:00.000Z",
      updatedAt: "2026-01-02T08:00:00.000Z",
    };
    const center = buildGateDispatchTaskCenter([todayTask, overdueTask], "2026-01-02T12:00:00.000Z");
    const overdue = buildGateDispatchTaskCloseoutItem(overdueTask, "2026-01-02T12:00:00.000Z");
    const today = buildGateDispatchTaskCloseoutItem(todayTask, "2026-01-02T12:00:00.000Z");

    assert.equal(overdue.status, "overdue");
    assert.equal(overdue.label, "已逾期");
    assert.equal(today.status, "today");
    assert.equal(today.label, "今天必须收");
    assert.equal(center.summary.overdue, 1);
    assert.equal(center.summary.dueToday, 1);
    assert.equal(center.closeoutItems[0].dispatchKey, overdueTask.dispatchKey);
    assert.ok(center.nextActions[0].includes("逾期"));
  });

  await t.test("reviews dispatch completion evidence against later business receipts", () => {
    const baseDispatch = buildGatePlatformGrowthDispatchItems([buildGatePlatformStrategyReceipt({
      item: strategyPlatform,
      status: "succeeded",
      now: "2026-01-01T00:00:00.000Z",
      payload: {
        variants: [{ strategy: "强钩子版" }],
      },
    })])[0];
    const verifiedTask = {
      ...baseDispatch,
      databaseId: "dispatch-db-verified",
      dispatchKey: baseDispatch.id,
      projectId: "project-1",
      sourceReceiptId: null,
      completionEvidence: "已采纳标题简介并保存基准。",
      state: "completed" as const,
      assignedAt: "2026-01-01T00:30:00.000Z",
      completedAt: "2026-01-01T01:00:00.000Z",
      createdAt: "2026-01-01T00:30:00.000Z",
      updatedAt: "2026-01-01T01:00:00.000Z",
    };
    const needsReceiptTask = {
      ...baseDispatch,
      id: "qimao:record_metrics",
      databaseId: "dispatch-db-needs-receipt",
      dispatchKey: "qimao:record_metrics",
      projectId: "project-2",
      sourceReceiptId: null,
      completionEvidence: "已完成数据整理，等待闸门回执。",
      platformId: "qimao",
      platformName: "七猫小说",
      state: "completed" as const,
      priorityScore: 55,
      assignedAt: "2026-01-01T00:30:00.000Z",
      completedAt: "2026-01-01T01:00:00.000Z",
      createdAt: "2026-01-01T00:30:00.000Z",
      updatedAt: "2026-01-01T01:00:00.000Z",
    };
    const missingEvidenceTask = {
      ...baseDispatch,
      id: "webnovel:scale_up",
      databaseId: "dispatch-db-missing",
      dispatchKey: "webnovel:scale_up",
      projectId: "project-3",
      sourceReceiptId: null,
      completionEvidence: "",
      platformId: "webnovel",
      platformName: "WebNovel",
      state: "completed" as const,
      priorityScore: 70,
      assignedAt: "2026-01-01T00:30:00.000Z",
      completedAt: "2026-01-01T01:00:00.000Z",
      createdAt: "2026-01-01T00:30:00.000Z",
      updatedAt: "2026-01-01T01:00:00.000Z",
    };
    const activeTask = {
      ...baseDispatch,
      id: "royalroad:adopt_asset",
      databaseId: "dispatch-db-active",
      dispatchKey: "royalroad:adopt_asset",
      projectId: "project-4",
      sourceReceiptId: null,
      completionEvidence: "",
      platformId: "royalroad",
      platformName: "Royal Road",
      state: "assigned" as const,
      priorityScore: 35,
      assignedAt: "2026-01-01T00:30:00.000Z",
      completedAt: null,
      createdAt: "2026-01-01T00:30:00.000Z",
      updatedAt: "2026-01-01T00:30:00.000Z",
    };
    const laterBusinessReceipt = buildGatePublishEffectReceipt({
      projectId: "project-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      now: "2026-01-01T02:00:00.000Z",
      metric: {
        views: 1000,
        clicks: 180,
        favorites: 35,
        follows: 12,
      },
    });
    const dispatchReceiptAfterCompletion = buildGatePlatformDispatchReceipt({
      dispatch: needsReceiptTask,
      now: "2026-01-01T02:30:00.000Z",
    });

    const review = buildGateDispatchEvidenceReview([
      verifiedTask,
      needsReceiptTask,
      missingEvidenceTask,
      activeTask,
    ], [dispatchReceiptAfterCompletion, laterBusinessReceipt]);

    assert.equal(review.summary.verified, 1);
    assert.equal(review.summary.needsReceipt, 1);
    assert.equal(review.summary.missingEvidence, 1);
    assert.equal(review.summary.active, 1);
    assert.equal(review.items[0].status, "missing_evidence");
    assert.equal(review.items.find((item) => item.dispatchKey === verifiedTask.dispatchKey)?.status, "verified");
    assert.equal(review.items.find((item) => item.dispatchKey === needsReceiptTask.dispatchKey)?.status, "needs_receipt");
    assert.ok(review.nextActions.some((actionText) => actionText.includes("后续业务回执")));
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
