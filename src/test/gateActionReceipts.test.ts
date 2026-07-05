import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGateAdviceActionReceipt,
  buildGateActionReceiptSummary,
  buildGateActionReceipt,
  buildGatePlatformStrategyReceipt,
  buildGateActionReviewAdvice,
  buildGateFailureRepairReceiptReview,
  buildGateFailureRepairRecheckDispatchItems,
  buildGateFailureRepairRecheckResolution,
  buildGateFailureRepairThirdRoundDispatchItems,
  buildGateFailureRepairThirdRoundResolution,
  buildGatePlatformGrowthReview,
  buildGatePlatformGrowthDispatchItems,
  buildGateKnowledgeFeedbackDispatchItems,
  buildGatePlatformEvidenceLoopDispatchItems,
  buildGateProjectStartValidationDispatchItems,
  buildGateProjectStartValidationReview,
  buildGateProjectStartNextDispatchItems,
  buildGateProjectStartMetricDecision,
  buildGateProjectStartMetricDispatchItems,
  buildGateProjectStartMetricFollowupDispatchItems,
  buildGateProjectSecondMetricDecision,
  buildGateProjectSecondMetricDispatchItems,
  buildGateProjectSecondMetricFollowupDispatchItems,
  buildGateProjectThirdMetricDecision,
  buildGatePlatformDispatchReceipt,
  buildGateDispatchCompletionReceipt,
  buildGateDispatchEvidenceReview,
  buildGateDispatchCompletionTemplate,
  buildGatePlatformScaleGate,
  buildGatePlatformScaleFollowup,
  buildGatePlatformScaleCadence,
  buildGatePlatformRetreatGate,
  buildGatePlatformRetreatDispatchItems,
  buildGatePlatformRetreatResolution,
  buildGatePlatformRetreatRecheckDispatchItems,
  buildGatePlatformDecisionTimeline,
  buildGatePlatformDecisionSummaryMarkdown,
  buildGateBatchTacticEffectReview,
  buildGatePlatformTacticExperienceLibrary,
  buildGatePlatformTacticExperienceMarkdown,
  gateActionReceiptFromAuditRecord,
  filterGatePlatformDecisionTimelineItems,
  buildGateDispatchTaskCenter,
  buildGateDispatchTaskCloseoutItem,
  buildGateFirstThreeAdoptionReceipt,
  buildGateExportVersionActionReceipt,
  buildGatePublishEffectReceipt,
  filterGateDispatchTasks,
  filterGateActionReceipts,
  gateActionReceiptPlatform,
  mergeGateActionReceipts,
  reviewGateDispatchCompletionEvidence,
  trimGateActionReceipts,
} from "../lib/projects/gateActionReceipts.ts";
import { buildProjectStartDecisionActionReceipt } from "../lib/projects/projectStartDecisionActions.ts";
import type { PrePublishGateAction, PrePublishGateAdoptionFollowupItem, PrePublishGateStrategyPlatform } from "../lib/projects/prePublishGate.ts";
import type { FailureRepairBatch } from "../lib/ai/taskRunConsole.ts";

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

const firstThreeFollowup: PrePublishGateAdoptionFollowupItem = {
  id: "first-three-adoption:project-1:chapter-1:revision-1:review",
  projectId: "project-1",
  projectTitle: "夜雨系统",
  chapterId: "chapter-1",
  revisionId: "revision-1",
  platformId: "fanqie",
  type: "review",
  label: "重新审稿",
  title: "第 1 章采纳后重新审稿",
  status: "block",
  state: "assigned",
  detail: "采纳后的新正文需要重新审稿。",
  evidence: "",
  actionLabel: "重新审稿",
  href: "/projects/project-1/chapters/chapter-1#chapter-workflow",
  execution: {
    type: "chapter_review",
    chapterId: "chapter-1",
  },
};

const failureRepairBatch: FailureRepairBatch = {
  status: "fix_config",
  title: "先修配置，再谈重试",
  detail: "1 个未恢复失败指向 API Key、权限或模型配置。",
  primaryActionLabel: "去模型设置",
  primaryActionHref: "/settings/models",
  summary: {
    unresolvedFailures: 2,
    configFailures: 1,
    retryableFailures: 1,
    manualFailures: 0,
    affectedProjects: 1,
    affectedProviders: 2,
  },
  guidance: ["先修配置类失败，再处理可重试任务。"],
  items: [
    {
      id: "config-failure",
      projectId: "project-1",
      projectTitle: "夜雨系统",
      chapterTitle: "第一章",
      taskLabel: "章节审稿",
      providerName: "DeepSeek",
      model: "deepseek-chat",
      retryable: false,
      retryReason: "这类失败更像 API Key、权限或模型配置问题，先修配置再继续。",
      actionLabel: "去模型设置",
      href: "/settings/models",
      errorMessage: "API key missing",
      directRetrySupported: false,
      repairKind: "config",
    },
    {
      id: "timeout-failure",
      projectId: "project-1",
      projectTitle: "夜雨系统",
      chapterTitle: "第二章",
      taskLabel: "正文初稿",
      providerName: "Mock",
      model: "mock-writer",
      retryable: true,
      retryReason: "可直接复用当前章节内容重新执行。",
      actionLabel: "一键重试",
      href: "/projects/project-1/chapters/chapter-2",
      errorMessage: "503 provider timeout",
      directRetrySupported: true,
      repairKind: "retry",
    },
  ],
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
        plan: {
          strategyBases: [{
            title: "首轮平台打法：番茄小说",
            label: "模板推荐",
            primaryTactic: "先抓首章钩子，再用前三章连续兑现爽点。",
            openingMove: "第一段给倒计时和不可逆损失。",
            verificationMove: "批量后复检前三章追读。",
            risk: "解释过多会掉首秀。",
          }],
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
    assert.ok(receipt.message.includes("打法依据"));
    assert.equal(receipt.startTactics?.[0].label, "模板推荐");
    assert.ok(receipt.startTactics?.[0].openingMove.includes("倒计时"));
    assert.equal(receipt.recheck.status, "ready");
    assert.equal(receipt.recheck.label, "复检任务队列");
  });

  await t.test("records first-three adoption follow-up execution receipts", () => {
    const receipt = buildGateFirstThreeAdoptionReceipt({
      mode: "single",
      items: [firstThreeFollowup],
      results: [{
        id: firstThreeFollowup.id,
        projectId: firstThreeFollowup.projectId,
        projectTitle: firstThreeFollowup.projectTitle,
        label: firstThreeFollowup.label,
        title: firstThreeFollowup.title,
        status: "succeeded",
        message: "审稿已完成。",
      }],
      now: "2026-01-01T00:00:00.000Z",
    });

    assert.equal(receipt.actionId, "first-three-adoption:single");
    assert.equal(receipt.executionType, "first_three_adoption");
    assert.equal(receipt.succeededCount, 1);
    assert.equal(receipt.failedCount, 0);
    assert.equal(receipt.platformId, "fanqie");
    assert.equal(receipt.platformName, "前三章采纳闭环");
    assert.ok(receipt.message.includes("已闭合 1 个"));
    assert.equal(receipt.firstThreeAdoptionClosure?.closedCount, 1);
    assert.equal(receipt.firstThreeAdoptionClosure?.blockedCount, 0);
    assert.equal(receipt.firstThreeAdoptionClosure?.closed[0]?.title, "第 1 章采纳后重新审稿");
    assert.ok(receipt.firstThreeAdoptionClosure?.nextAction.includes("刷新总闸门"));
    assert.equal(receipt.recheck.status, "ready");
    assert.equal(receipt.recheck.label, "复检采纳闭环");

    const filtered = filterGateActionReceipts([receipt], { executionType: "first_three_adoption" });
    const summary = buildGateActionReceiptSummary([receipt]);
    assert.equal(filtered.length, 1);
    assert.equal(summary.executionTypes[0]?.type, "first_three_adoption");
  });

  await t.test("records failed first-three adoption batch receipts", () => {
    const receipt = buildGateFirstThreeAdoptionReceipt({
      mode: "batch_review",
      items: [firstThreeFollowup, { ...firstThreeFollowup, id: "first-three-adoption:project-1:chapter-2:revision-2:review", chapterId: "chapter-2" }],
      results: [
        {
          id: firstThreeFollowup.id,
          projectId: firstThreeFollowup.projectId,
          projectTitle: firstThreeFollowup.projectTitle,
          label: firstThreeFollowup.label,
          title: firstThreeFollowup.title,
          status: "succeeded",
        },
        {
          id: "first-three-adoption:project-1:chapter-2:revision-2:review",
          projectId: "project-1",
          projectTitle: "夜雨系统",
          label: "重新审稿",
          title: "第 2 章采纳后重新审稿",
          status: "failed",
          message: "预算拦截。",
        },
      ],
      now: "2026-01-01T00:00:00.000Z",
    });

    assert.equal(receipt.status, "failed");
    assert.equal(receipt.actionId, "first-three-adoption:batch_review");
    assert.equal(receipt.succeededCount, 1);
    assert.equal(receipt.failedCount, 1);
    assert.ok(receipt.message.includes("仍需处理 1 个"));
    assert.equal(receipt.firstThreeAdoptionClosure?.closedCount, 1);
    assert.equal(receipt.firstThreeAdoptionClosure?.blockedCount, 1);
    assert.equal(receipt.firstThreeAdoptionClosure?.blocked[0]?.title, "第 2 章采纳后重新审稿");
    assert.ok(receipt.firstThreeAdoptionClosure?.nextAction.includes("处理失败项"));
    assert.ok(receipt.message.includes("预算拦截"));
    assert.equal(receipt.recheck.status, "blocked");
    assert.equal(receipt.recheck.label, "处理失败项后复检");
  });

  await t.test("reviews batch tactic effects from recommended batch receipts", () => {
    const stableTactic = {
      title: "首轮平台打法：番茄小说",
      label: "模板推荐",
      primaryTactic: "先抓首章钩子，再用前三章连续兑现爽点。",
      openingMove: "第一段给倒计时和不可逆损失。",
      verificationMove: "批量后复检前三章追读。",
      risk: "解释过多会掉首秀。",
    };
    const weakTactic = {
      ...stableTactic,
      title: "首轮平台打法：七猫小说",
      label: "历史观察",
      openingMove: "第一段慢慢铺关系。",
    };
    const firstStable = buildGateActionReceipt({
      action,
      status: "succeeded",
      now: "2026-01-01T00:00:00.000Z",
      payload: {
        results: [{ status: "succeeded", taskId: "task-1" }],
        routeEffectSummary: { successRatePercent: 100, knownCostUsd: 0.01, averageQualityScore: 88 },
        plan: { strategyBases: [stableTactic] },
      },
    });
    const secondStable = buildGateActionReceipt({
      action,
      status: "succeeded",
      now: "2026-01-02T00:00:00.000Z",
      payload: {
        results: [{ status: "succeeded", taskId: "task-2" }],
        routeEffectSummary: { successRatePercent: 100, knownCostUsd: 0.02, averageQualityScore: 90 },
        plan: { strategyBases: [stableTactic] },
      },
    });
    const weak = buildGateActionReceipt({
      action,
      status: "succeeded",
      now: "2026-01-03T00:00:00.000Z",
      payload: {
        results: [{ status: "failed", taskId: "task-3" }],
        routeEffectSummary: { successRatePercent: 0, knownCostUsd: 0.03, averageQualityScore: 68 },
        plan: { strategyBases: [weakTactic] },
      },
    });
    const review = buildGateBatchTacticEffectReview([weak, secondStable, firstStable]);
    const usable = review.items.find((item) => item.openingMove.includes("不可逆损失"));
    const blocked = review.items.find((item) => item.openingMove.includes("慢慢铺关系"));

    assert.equal(review.summary.usable, 1);
    assert.equal(review.summary.blocked, 1);
    assert.equal(usable?.status, "usable");
    assert.equal(usable?.sampleBatches, 2);
    assert.equal(usable?.successRatePercent, 100);
    assert.equal(usable?.averageQualityScore, 89);
    assert.equal(usable?.recoveryBatches, 0);
    assert.equal(blocked?.status, "blocked");
    assert.ok(blocked?.nextAction.includes("暂停"));
  });

  await t.test("keeps cleared watch batch tactics in recovery watch until repeated", () => {
    const tactic = {
      title: "首轮平台打法：番茄小说",
      label: "批量可复用",
      primaryTactic: "首章先给不可逆危机，三章内连续兑现爽点。",
      openingMove: "第一段给倒计时和身份暴露风险。",
      verificationMove: "批量后复检前三章追读。",
      risk: "解释过多会掉首秀。",
    };
    const receipt = buildGateActionReceipt({
      action,
      status: "succeeded",
      now: "2026-01-01T00:00:00.000Z",
      payload: {
        results: [{ status: "succeeded", taskId: "task-1" }],
        routeEffectSummary: { successRatePercent: 100, knownCostUsd: 0.01, averageQualityScore: 88 },
        plan: {
          strategyBases: [tactic],
          scaleGate: "cleared",
          actionLabel: "批量初稿 2 个",
          category: "draft",
        },
        batchReceipt: {
          status: "continue",
          headline: "准放量批次稳定，下一批仍小步走",
        },
      },
    });
    const review = buildGateBatchTacticEffectReview([receipt]);

    assert.equal(receipt.batchContext?.scaleGate, "cleared");
    assert.equal(review.items[0]?.status, "watch");
    assert.equal(review.items[0]?.label, "恢复放量观察");
    assert.equal(review.items[0]?.recoveryBatches, 1);
    assert.ok(review.items[0]?.evidence[0].includes("恢复放量"));
    assert.ok(review.items[0]?.nextAction.includes("至少再跑一轮"));
  });

  await t.test("turns repeated cleared watch batches into reusable recovery tactics", () => {
    const tactic = {
      title: "首轮平台打法：番茄小说",
      label: "批量可复用",
      primaryTactic: "首章先给不可逆危机，三章内连续兑现爽点。",
      openingMove: "第一段给倒计时和身份暴露风险。",
      verificationMove: "批量后复检前三章追读。",
      risk: "解释过多会掉首秀。",
    };
    const first = buildGateActionReceipt({
      action,
      status: "succeeded",
      now: "2026-01-01T00:00:00.000Z",
      payload: {
        results: [{ status: "succeeded", taskId: "task-1" }],
        routeEffectSummary: { successRatePercent: 100, knownCostUsd: 0.01, averageQualityScore: 88 },
        plan: { strategyBases: [tactic], scaleGate: "cleared", actionLabel: "批量初稿 2 个", category: "draft" },
        batchReceipt: { status: "continue", headline: "准放量批次稳定，下一批仍小步走" },
      },
    });
    const second = buildGateActionReceipt({
      action,
      status: "succeeded",
      now: "2026-01-02T00:00:00.000Z",
      payload: {
        results: [{ status: "succeeded", taskId: "task-2" }],
        routeEffectSummary: { successRatePercent: 100, knownCostUsd: 0.02, averageQualityScore: 90 },
        plan: { strategyBases: [tactic], scaleGate: "cleared", actionLabel: "批量初稿 2 个", category: "draft" },
        batchReceipt: { status: "continue", headline: "准放量批次稳定，下一批仍小步走" },
      },
    });
    const review = buildGateBatchTacticEffectReview([second, first]);

    assert.equal(review.items[0]?.status, "usable");
    assert.equal(review.items[0]?.label, "恢复放量打法");
    assert.equal(review.items[0]?.recoveryBatches, 2);
    assert.ok(review.items[0]?.nextAction.includes("新项目仍先跑小样本"));
  });

  await t.test("restores recommended batch receipts from persisted audits", () => {
    const receipt = gateActionReceiptFromAuditRecord({
      receiptId: "recommended-batch:standard:draft:project-1:2026-01-01T00:00:00.000Z",
      actionId: "recommended-batch:standard:draft:project-1",
      label: "沉淀批量初稿 1 个经验",
      detail: "番茄小说 · 夜雨系统 · 批量初稿 1 个",
      href: "/projects/project-1#ai-pipeline",
      status: "succeeded",
      message: "推荐批次完成：成功 1，失败 0。",
      executionType: "recommended_batch",
      succeededCount: 1,
      failedCount: 0,
      taskId: "task-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      recheckStatus: "ready",
      recheckLabel: "复检任务队列",
      recheckDetail: "推荐批次已执行，刷新后确认生产任务、阻塞项和下一批策略是否变化。",
      recheckAction: "刷新总闸门",
      payload: JSON.stringify({
        plan: {
          scaleGate: "cleared",
          actionLabel: "批量初稿 1 个",
          category: "draft",
          strategyBases: [{
            title: "首轮平台打法：番茄小说",
            label: "批量可复用",
            primaryTactic: "首章先给不可逆危机。",
            openingMove: "第一段给倒计时。",
            verificationMove: "批量后复检前三章追读。",
            risk: "解释过多会掉首秀。",
          }],
        },
        batchReceipt: {
          status: "continue",
          headline: "准放量批次稳定，下一批仍小步走",
        },
        routeEffectSummary: { successRatePercent: 100, knownCostUsd: 0.01, averageQualityScore: 88 },
      }),
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const review = buildGateBatchTacticEffectReview([receipt]);

    assert.equal(receipt.executionType, "recommended_batch");
    assert.equal(receipt.startTactics?.[0].title, "首轮平台打法：番茄小说");
    assert.equal(receipt.batchEffectSummary?.averageQualityScore, 88);
    assert.equal(receipt.batchContext?.scaleGate, "cleared");
    assert.equal(review.items[0]?.status, "watch");
    assert.equal(review.items[0]?.label, "恢复放量观察");
    assert.equal(review.items[0]?.recoveryBatches, 1);
    assert.ok(review.items[0]?.openingMove.includes("倒计时"));
  });

  await t.test("restores first-three adoption closure summaries from persisted audits", () => {
    const receipt = gateActionReceiptFromAuditRecord({
      receiptId: "first-three-adoption:batch_review:2026-01-01T00:00:00.000Z",
      actionId: "first-three-adoption:batch_review",
      label: "批量重新审稿",
      detail: "1 个项目 · 2 个后续任务 · 采纳后正文变更闭环",
      href: "/gate#first-three-adoption-closure",
      status: "failed",
      message: "批量重新审稿完成：已闭合 1 个，仍需处理 1 个。",
      executionType: "first_three_adoption",
      succeededCount: 1,
      failedCount: 1,
      taskId: null,
      platformId: "fanqie",
      platformName: "前三章采纳闭环",
      recheckStatus: "blocked",
      recheckLabel: "处理失败项后复检",
      recheckDetail: "已闭合 1 条采纳后续，1 条仍阻塞。先处理失败项，再刷新总闸门复检。",
      recheckAction: "刷新总闸门",
      payload: JSON.stringify({
        firstThreeAdoptionClosure: {
          closedCount: 1,
          blockedCount: 1,
          headline: "已闭合 1 条采纳后续，1 条仍阻塞。",
          nextAction: "先处理失败项，再刷新总闸门复检。",
          closed: [{
            id: firstThreeFollowup.id,
            projectId: "project-1",
            projectTitle: "夜雨系统",
            label: "重新审稿",
            title: "第 1 章采纳后重新审稿",
          }],
          blocked: [{
            id: "first-three-adoption:project-1:chapter-2:revision-2:review",
            projectId: "project-1",
            projectTitle: "夜雨系统",
            label: "重新审稿",
            title: "第 2 章采纳后重新审稿",
            message: "预算拦截。",
          }],
        },
      }),
      createdAt: "2026-01-01T00:00:00.000Z",
    });

    assert.equal(receipt.executionType, "first_three_adoption");
    assert.equal(receipt.firstThreeAdoptionClosure?.closedCount, 1);
    assert.equal(receipt.firstThreeAdoptionClosure?.blockedCount, 1);
    assert.equal(receipt.firstThreeAdoptionClosure?.blocked[0]?.message, "预算拦截。");
    assert.ok(receipt.recheck.detail.includes("仍阻塞"));
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

  await t.test("tracks failure repair batch receipts until the batch clears", () => {
    const pending = buildGateFailureRepairReceiptReview(failureRepairBatch, []);
    const manualRepair = buildGateActionReceipt({
      action: {
        id: "failure-repair-batch",
        label: "去模型设置",
        detail: "先修配置，再谈重试：1 个未恢复失败指向 API Key、权限或模型配置。",
        href: "/settings/models",
        tone: "repair",
        execution: null,
      },
      status: "succeeded",
      now: "2026-01-01T00:00:00.000Z",
      payload: { message: "已记录模型配置修复。" },
    });
    const retryReceipt = buildGateActionReceipt({
      action: {
        id: "repair-batch-retry:timeout-failure",
        label: "一键重试",
        detail: "夜雨系统 · 第二章 · 可直接复用当前章节内容重新执行。",
        href: "/projects/project-1/chapters/chapter-2",
        tone: "review",
        execution: { type: "retry_task", taskId: "timeout-failure" },
      },
      status: "succeeded",
      now: "2026-01-01T00:01:00.000Z",
      payload: { task: { id: "timeout-failure-retry", status: "succeeded" } },
    });
    const responded = buildGateFailureRepairReceiptReview(failureRepairBatch, [retryReceipt, manualRepair]);
    const cleared = buildGateFailureRepairReceiptReview({
      ...failureRepairBatch,
      status: "clear",
      title: "失败修复批次已清空",
      detail: "没有未恢复失败。",
      summary: {
        unresolvedFailures: 0,
        configFailures: 0,
        retryableFailures: 0,
        manualFailures: 0,
        affectedProjects: 0,
        affectedProviders: 0,
      },
      items: [],
    }, [retryReceipt, manualRepair]);

    assert.equal(pending.status, "open");
    assert.equal(pending.actionLabel, "去模型设置");
    assert.equal(responded.status, "recheck");
    assert.equal(responded.receipts, 2);
    assert.match(responded.detail, /当前仍有 2 个未恢复失败/);
    assert.equal(cleared.status, "cleared");
    assert.match(cleared.detail, /已清空/);
  });

  await t.test("turns unresolved failure repair receipts into recheck dispatch cards", () => {
    const manualRepair = buildGateActionReceipt({
      action: {
        id: "failure-repair-batch",
        label: "去模型设置",
        detail: "先修配置，再谈重试：1 个未恢复失败指向 API Key、权限或模型配置。",
        href: "/settings/models",
        tone: "repair",
        execution: null,
      },
      status: "succeeded",
      now: "2026-01-01T00:00:00.000Z",
      payload: { message: "已记录模型配置修复。" },
    });
    const retryReceipt = buildGateActionReceipt({
      action: {
        id: "repair-batch-retry:timeout-failure",
        label: "一键重试",
        detail: "夜雨系统 · 第二章 · 可直接复用当前章节内容重新执行。",
        href: "/projects/project-1/chapters/chapter-2",
        tone: "review",
        execution: { type: "retry_task", taskId: "timeout-failure" },
      },
      status: "succeeded",
      now: "2026-01-01T00:01:00.000Z",
      payload: { task: { id: "timeout-failure-retry", status: "succeeded" } },
    });
    const review = buildGateFailureRepairReceiptReview(failureRepairBatch, [retryReceipt, manualRepair]);
    const dispatches = buildGateFailureRepairRecheckDispatchItems(review, failureRepairBatch);
    const clearedDispatches = buildGateFailureRepairRecheckDispatchItems(
      buildGateFailureRepairReceiptReview({
        ...failureRepairBatch,
        status: "clear",
        summary: {
          unresolvedFailures: 0,
          configFailures: 0,
          retryableFailures: 0,
          manualFailures: 0,
          affectedProjects: 0,
          affectedProviders: 0,
        },
        items: [],
      }, [retryReceipt, manualRepair]),
      {
        ...failureRepairBatch,
        status: "clear",
        summary: {
          unresolvedFailures: 0,
          configFailures: 0,
          retryableFailures: 0,
          manualFailures: 0,
          affectedProjects: 0,
          affectedProviders: 0,
        },
        items: [],
      },
    );

    assert.equal(dispatches.length, 1);
    assert.equal(dispatches[0].id, "global:failure_repair_recheck:failure-repair-batch");
    assert.equal(dispatches[0].platformId, "global");
    assert.equal(dispatches[0].stage, "failure_repair_recheck");
    assert.equal(dispatches[0].ownerRole, "故障复检负责人");
    assert.equal(dispatches[0].state, "queued");
    assert.equal(dispatches[0].priorityScore, 94);
    assert.equal(dispatches[0].href, "/gate");
    assert.ok(dispatches[0].detail.includes("仍有 2 个未恢复失败"));
    assert.ok(dispatches[0].acceptanceCriteria.includes("总闸门未恢复失败数降为 0"));
    assert.ok(dispatches[0].evidence.some((line) => line.includes("已记录模型配置修复")));
    assert.equal(clearedDispatches.length, 0);
  });

  await t.test("reviews completed failure repair recheck dispatch against unresolved failures", () => {
    const review = buildGateFailureRepairReceiptReview(failureRepairBatch, [
      buildGateActionReceipt({
        action: {
          id: "failure-repair-batch",
          label: "去模型设置",
          detail: "先修配置，再谈重试：1 个未恢复失败指向 API Key、权限或模型配置。",
          href: "/settings/models",
          tone: "repair",
          execution: null,
        },
        status: "succeeded",
        now: "2026-01-01T00:00:00.000Z",
        payload: { message: "已记录模型配置修复。" },
      }),
    ]);
    const [dispatch] = buildGateFailureRepairRecheckDispatchItems(review, failureRepairBatch);
    const completedTask = {
      ...dispatch,
      databaseId: "dispatch-db-recheck",
      dispatchKey: dispatch.id,
      projectId: null,
      sourceReceiptId: null,
      completionEvidence: "已复检配置和重试结果，但仍有 DeepSeek 配置失败未恢复。",
      assignedAt: "2026-01-01T00:05:00.000Z",
      completedAt: "2026-01-01T00:30:00.000Z",
      createdAt: "2026-01-01T00:05:00.000Z",
      updatedAt: "2026-01-01T00:30:00.000Z",
      state: "completed" as const,
    };
    const blocked = buildGateFailureRepairRecheckResolution(failureRepairBatch, [completedTask]);
    const cleared = buildGateFailureRepairRecheckResolution({
      ...failureRepairBatch,
      status: "clear",
      summary: {
        unresolvedFailures: 0,
        configFailures: 0,
        retryableFailures: 0,
        manualFailures: 0,
        affectedProjects: 0,
        affectedProviders: 0,
      },
      items: [],
    }, [completedTask]);

    assert.equal(blocked.status, "failed");
    assert.equal(blocked.label, "复检未通过");
    assert.equal(blocked.completedRechecks, 1);
    assert.equal(blocked.unresolvedFailures, 2);
    assert.equal(blocked.actionLabel, "生成第三轮处理建议");
    assert.ok(blocked.detail.includes("仍有 2 个未恢复失败"));
    assert.ok(blocked.evidence.some((line) => line.includes("DeepSeek 配置失败")));
    assert.equal(cleared.status, "resolved");
    assert.equal(cleared.label, "复检闭环");
    assert.equal(cleared.actionLabel, "查看任务中心");
  });

  await t.test("splits failed rechecks into third-round role dispatch cards", () => {
    const resolution = buildGateFailureRepairRecheckResolution(failureRepairBatch, [{
      id: "global:failure_repair_recheck:failure-repair-batch",
      dispatchKey: "global:failure_repair_recheck:failure-repair-batch",
      databaseId: "dispatch-db-recheck",
      projectId: null,
      platformId: "global",
      platformName: "全局任务",
      stage: "failure_repair_recheck",
      state: "completed",
      priorityScore: 94,
      ownerRole: "故障复检负责人",
      title: "失败修复后复检",
      detail: "复检仍未清空失败。",
      dueLabel: "今天",
      actionLabel: "派给复检负责人",
      href: "/gate",
      acceptanceCriteria: ["总闸门未恢复失败数降为 0"],
      evidence: ["已记录模型配置修复。"],
      sourceReceiptId: null,
      completionEvidence: "复检后仍有配置和重试失败。",
      reviewLatestAt: "2026-01-01T00:00:00.000Z",
      assignedAt: "2026-01-01T00:05:00.000Z",
      completedAt: "2026-01-01T00:30:00.000Z",
      createdAt: "2026-01-01T00:05:00.000Z",
      updatedAt: "2026-01-01T00:30:00.000Z",
    }]);
    const thirdRound = buildGateFailureRepairThirdRoundDispatchItems(resolution, failureRepairBatch);
    const resolved = buildGateFailureRepairThirdRoundDispatchItems({
      ...resolution,
      status: "resolved",
      label: "复检闭环",
      unresolvedFailures: 0,
    }, {
      ...failureRepairBatch,
      status: "clear",
      summary: {
        unresolvedFailures: 0,
        configFailures: 0,
        retryableFailures: 0,
        manualFailures: 0,
        affectedProjects: 0,
        affectedProviders: 0,
      },
      items: [],
    });

    assert.deepEqual(thirdRound.map((item) => item.stage), [
      "failure_config_repair",
      "failure_route_repair",
      "failure_retry_repair",
    ]);
    assert.equal(thirdRound[0].ownerRole, "模型配置负责人");
    assert.equal(thirdRound[0].href, "/settings/models");
    assert.ok(thirdRound[0].acceptanceCriteria.includes("API Key、权限和模型配置已完成复检"));
    assert.equal(thirdRound[1].ownerRole, "模型路由负责人");
    assert.ok(thirdRound[1].acceptanceCriteria.includes("已给失败任务配置备用模型或降级路线"));
    assert.equal(thirdRound[2].ownerRole, "章节重试负责人");
    assert.equal(thirdRound[2].href, "/projects/project-1/chapters/chapter-2");
    assert.ok(thirdRound[2].evidence.some((line) => line.includes("503 provider timeout")));
    assert.equal(resolved.length, 0);
  });

  await t.test("reviews third-round dispatch completion and extracts route lessons", () => {
    const resolution = buildGateFailureRepairRecheckResolution(failureRepairBatch, [{
      id: "global:failure_repair_recheck:failure-repair-batch",
      dispatchKey: "global:failure_repair_recheck:failure-repair-batch",
      databaseId: "dispatch-db-recheck",
      projectId: null,
      platformId: "global",
      platformName: "全局任务",
      stage: "failure_repair_recheck",
      state: "completed",
      priorityScore: 94,
      ownerRole: "故障复检负责人",
      title: "失败修复后复检",
      detail: "复检仍未清空失败。",
      dueLabel: "今天",
      actionLabel: "派给复检负责人",
      href: "/gate",
      acceptanceCriteria: ["总闸门未恢复失败数降为 0"],
      evidence: ["已记录模型配置修复。"],
      sourceReceiptId: null,
      completionEvidence: "复检后仍有配置和重试失败。",
      reviewLatestAt: "2026-01-01T00:00:00.000Z",
      assignedAt: "2026-01-01T00:05:00.000Z",
      completedAt: "2026-01-01T00:30:00.000Z",
      createdAt: "2026-01-01T00:05:00.000Z",
      updatedAt: "2026-01-01T00:30:00.000Z",
    }]);
    const thirdRound = buildGateFailureRepairThirdRoundDispatchItems(resolution, failureRepairBatch);
    const completedThirdRound = thirdRound.map((item, index) => ({
      ...item,
      databaseId: `dispatch-db-third-${index + 1}`,
      dispatchKey: item.id,
      projectId: null,
      sourceReceiptId: null,
      completionEvidence: item.stage === "failure_route_repair"
        ? "已把 DeepSeek 失败路线降级到 Kimi 备用模型，暂停 deepseek-chat 批量路线。"
        : `${item.ownerRole} 已完成第三轮处理。`,
      assignedAt: "2026-01-01T00:40:00.000Z",
      completedAt: `2026-01-01T01:0${index}:00.000Z`,
      createdAt: "2026-01-01T00:40:00.000Z",
      updatedAt: `2026-01-01T01:0${index}:00.000Z`,
      state: "completed" as const,
    }));
    const stillFailed = buildGateFailureRepairThirdRoundResolution(failureRepairBatch, completedThirdRound);
    const recovered = buildGateFailureRepairThirdRoundResolution({
      ...failureRepairBatch,
      status: "clear",
      summary: {
        unresolvedFailures: 0,
        configFailures: 0,
        retryableFailures: 0,
        manualFailures: 0,
        affectedProjects: 0,
        affectedProviders: 0,
      },
      items: [],
    }, completedThirdRound);

    assert.equal(stillFailed.status, "failed");
    assert.equal(stillFailed.label, "第三轮仍未恢复");
    assert.equal(stillFailed.completedItems, 3);
    assert.equal(stillFailed.unresolvedFailures, 2);
    assert.equal(stillFailed.routeLesson.status, "blocked");
    assert.ok(stillFailed.detail.includes("第三轮已完成 3 项"));
    assert.equal(recovered.status, "resolved");
    assert.equal(recovered.label, "第三轮恢复闭环");
    assert.equal(recovered.routeLesson.status, "usable");
    assert.ok(recovered.routeLesson.rule.includes("DeepSeek"));
    assert.ok(recovered.routeLesson.rule.includes("Kimi"));
    assert.ok(recovered.evidence.some((line) => line.includes("deepseek-chat")));
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

  await t.test("turns blocked project start decisions into opening repair advice", () => {
    const startReceipt = buildProjectStartDecisionActionReceipt({
      projectId: "project-1",
      projectTitle: "替身归来",
      platformId: "qimao",
      platformName: "七猫免费小说",
      decision: {
        status: "pause",
        label: "先停用",
        headline: "这套开书打法已经带着避坑信号，别再复用到新批次。",
        nextExperiment: "先重写前三章开头和平台包装，只做小批验证，等审稿分和失败率回正再恢复。",
        actionLabel: "重写前三章",
        targetAnchor: "first-three-rewrite",
        evidence: ["来源：批量避坑"],
      },
      startTactic: {
        title: "首轮平台打法：七猫免费小说",
        label: "批量避坑",
        primaryTactic: "不要复用慢热设定开场。",
        openingMove: "第一屏先给身份暴露。",
        verificationMove: "只做小批验证。",
        risk: "暂停继续放量。",
      },
      created: [],
      skipped: "已记录避坑动作。",
      now: "2026-01-01T00:00:00.000Z",
    });

    const advice = buildGateActionReviewAdvice([startReceipt]);

    assert.equal(advice[0].id, "qimao:start-decision-blocked");
    assert.equal(advice[0].severity, "urgent");
    assert.equal(advice[0].platformName, "七猫免费小说");
    assert.ok(advice[0].headline.includes("开书策略卡住"));
    assert.equal(advice[0].action.kind, "handle_failure");
    assert.equal(advice[0].action.label, "处理开头避坑");
    assert.equal(advice[0].action.href, "/projects/project-1#first-three-rewrite");
  });

  await t.test("turns seeded project start decisions into first validation advice", () => {
    const startReceipt = buildProjectStartDecisionActionReceipt({
      projectId: "project-1",
      projectTitle: "夜雨系统",
      platformId: "fanqie",
      platformName: "番茄小说",
      decision: {
        status: "seed",
        label: "先建打法",
        headline: "这个项目还没有首轮平台打法，先别让 AI 自由发挥。",
        nextExperiment: "先生成平台土壤和首轮开书打法，再进入前三章、审稿和发布包装。",
        actionLabel: "补平台土壤",
        targetAnchor: "world-bible",
        evidence: ["未找到首轮平台打法记录。"],
      },
      startTactic: null,
      created: ["核心规则", "首轮平台打法：番茄小说"],
      skipped: null,
      now: "2026-01-01T00:00:00.000Z",
    });

    const advice = buildGateActionReviewAdvice([startReceipt]);

    assert.equal(advice[0].id, "fanqie:start-decision-validate");
    assert.equal(advice[0].severity, "opportunity");
    assert.ok(advice[0].headline.includes("开书打法已落库"));
    assert.equal(advice[0].action.kind, "start_gate_action");
    assert.equal(advice[0].action.label, "跑首轮验证");
    assert.equal(advice[0].action.href, "/projects/project-1#ai-pipeline");
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

  await t.test("builds export version action receipts for executable gate repairs", () => {
    const receipt = buildGateExportVersionActionReceipt({
      projectId: "project-1",
      projectTitle: "夜雨系统",
      now: "2026-01-01T00:00:03.000Z",
      action: {
        id: "lock-recommended-baseline",
        label: "锁定推荐基准",
        detail: "先锁定正式基准，否则后续版本替换没有参照物。",
        href: "/projects/project-1/exports#export-baseline-decision",
        priority: "primary",
        execution: {
          type: "lock_baseline",
          snapshotId: "snapshot-1",
        },
      },
      message: "已锁定为导出基准。",
    });

    assert.equal(receipt.actionId, "export-version:project-1:lock_baseline");
    assert.equal(receipt.executionType, "export_version");
    assert.equal(receipt.taskId, "snapshot-1");
    assert.equal(receipt.platformName, "导出版本");
    assert.ok(receipt.message.includes("导出基准"));
    assert.equal(receipt.recheck.label, "复检导出版本门禁");
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

  await t.test("turns platform knowledge feedback into gate dispatch cards", () => {
    const dispatchItems = buildGateKnowledgeFeedbackDispatchItems([{
      id: "feedback-1",
      projectId: "project-1",
      projectTitle: "夜雨系统",
      platformId: "fanqie",
      platformName: "番茄小说",
      actionLabel: "保存反哺证据",
      title: "已记录平台反哺",
      message: "候选素材已采纳，等待下一步包装验证。",
      completedStepLabel: "候选资产采纳",
      stopReason: "简介候选还没有进入发布包",
      nextAction: "进入投稿资产编辑器完成标题简介标签定稿",
      href: "#submission-asset-editor",
      severity: "needs_action",
      createdAt: "2026-01-02T00:00:00.000Z",
    }], 4, [{
      databaseId: "task-1",
      dispatchKey: "knowledge-feedback:feedback-1",
      id: "knowledge-feedback:feedback-1",
      projectId: "project-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      stage: "adopt_asset",
      state: "assigned",
      priorityScore: 92,
      ownerRole: "包装运营",
      title: "番茄小说 反哺停点收口",
      detail: "旧任务",
      dueLabel: "今天收口",
      actionLabel: "派给包装运营",
      href: "/projects/project-1#submission-asset-editor",
      acceptanceCriteria: [],
      evidence: [],
      sourceReceiptId: null,
      completionEvidence: "",
      reviewLatestAt: "2026-01-02T00:00:00.000Z",
      assignedAt: "2026-01-02T00:00:00.000Z",
      completedAt: null,
      createdAt: "2026-01-02T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    }]);

    assert.equal(dispatchItems.length, 1);
    assert.equal(dispatchItems[0].id, "knowledge-feedback:feedback-1");
    assert.equal(dispatchItems[0].stage, "adopt_asset");
    assert.equal(dispatchItems[0].state, "assigned");
    assert.equal(dispatchItems[0].ownerRole, "包装运营");
    assert.equal(dispatchItems[0].href, "/projects/project-1#submission-asset-editor");
    assert.ok(dispatchItems[0].detail.includes("夜雨系统"));
    assert.ok(dispatchItems[0].acceptanceCriteria.some((criterion) => criterion.includes("简介候选")));
  });

  await t.test("keeps knowledge feedback dispatch receipts from assigning growth dispatches", () => {
    const assetReceipt = buildGatePlatformStrategyReceipt({
      item: strategyPlatform,
      status: "succeeded",
      now: "2026-01-01T00:00:00.000Z",
      payload: {
        variants: [{ strategy: "强钩子版" }],
      },
    });
    const knowledgeDispatch = buildGateKnowledgeFeedbackDispatchItems([{
      id: "feedback-asset",
      projectId: "project-1",
      projectTitle: "夜雨系统",
      platformId: "fanqie",
      platformName: "番茄小说",
      actionLabel: "保存反哺证据",
      title: "已记录平台反哺",
      message: "候选素材需要继续定稿。",
      completedStepLabel: "候选资产采纳",
      stopReason: "标题简介还没有锁版",
      nextAction: "完成标题简介标签定稿",
      href: "#submission-asset-editor",
      severity: "needs_action",
      createdAt: "2026-01-01T00:00:02.000Z",
    }])[0];
    const knowledgeReceipt = buildGatePlatformDispatchReceipt({
      dispatch: knowledgeDispatch,
      now: "2026-01-01T00:00:03.000Z",
    });
    const growthDispatch = buildGatePlatformGrowthDispatchItems([assetReceipt, knowledgeReceipt])[0];

    assert.equal(knowledgeReceipt.actionId, "gate-platform-dispatch:knowledge-feedback:feedback-asset:fanqie");
    assert.equal(growthDispatch.stage, "adopt_asset");
    assert.equal(growthDispatch.state, "queued");
  });

  await t.test("does not turn gate completion feedback back into a new dispatch", () => {
    const dispatchItems = buildGateKnowledgeFeedbackDispatchItems([{
      id: "gate-dispatch-completion:knowledge-feedback:feedback-asset",
      projectId: "project-1",
      projectTitle: "夜雨系统",
      platformId: "fanqie",
      platformName: "番茄小说",
      actionLabel: "Gate 派单完成回灌",
      title: "番茄小说｜Gate 派单完成回灌",
      message: "Gate 派单已完成。",
      completedStepLabel: "Gate 派单完成：番茄小说 反哺停点收口",
      stopReason: "已收口派单完成证据，无需再次派单。",
      nextAction: "回到平台导出中心复核反哺历史，并刷新项目控制台。",
      href: "/projects/project-1#submission-asset-editor",
      severity: "success",
      createdAt: "2026-01-03T00:00:00.000Z",
    }]);

    assert.equal(dispatchItems.length, 0);
  });

  await t.test("turns platform evidence loop scores into gate dispatch cards", () => {
    const dispatchItems = buildGatePlatformEvidenceLoopDispatchItems([
      {
        projectId: "project-1",
        projectTitle: "夜雨系统",
        platformId: "fanqie",
        platformName: "番茄小说",
        score: 86,
        status: "scale",
        label: "可加码",
        headline: "番茄小说 证据闭环够硬，可以小步加码。",
        nextAction: "扩大一个可控变量，保留旧版本做对照。",
        actionLabel: "进入小步加码",
        targetAnchor: "platform-export",
        evidence: ["反哺回执 2 条，其中 Gate 完成回灌 1 条。", "最新数据：曝光 1600，点击 320。"],
        metricsCount: 1,
        feedbackCount: 2,
        gateCompletionCount: 1,
      },
      {
        projectId: "project-2",
        projectTitle: "雨夜备选",
        platformId: "qimao",
        platformName: "七猫",
        score: 42,
        status: "repair",
        label: "先修打法",
        headline: "七猫 证据偏软，先别扩大投入。",
        nextAction: "优先修标题简介、前三章钩子或投稿资产。",
        actionLabel: "修平台打法",
        targetAnchor: "first-three-rewrite",
        evidence: ["还没有平台反哺回执。", "最新数据：曝光 1200，点击 180。"],
        metricsCount: 1,
        feedbackCount: 0,
        gateCompletionCount: 0,
      },
    ], 5, [{
      databaseId: "task-evidence-loop",
      dispatchKey: "evidence-loop:project-1:fanqie:scale",
      id: "evidence-loop:project-1:fanqie:scale",
      projectId: "project-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      stage: "scale_up",
      state: "assigned",
      priorityScore: 88,
      ownerRole: "增长运营",
      title: "番茄小说 可加码派单",
      detail: "旧任务",
      dueLabel: "下一轮更新前",
      actionLabel: "进入小步加码",
      href: "/projects/project-1#platform-export",
      acceptanceCriteria: [],
      evidence: [],
      sourceReceiptId: null,
      completionEvidence: "",
      reviewLatestAt: "2026-01-07T00:00:00.000Z",
      assignedAt: "2026-01-07T00:00:00.000Z",
      completedAt: null,
      createdAt: "2026-01-07T00:00:00.000Z",
      updatedAt: "2026-01-07T00:00:00.000Z",
    }]);

    assert.equal(dispatchItems.length, 2);
    const repairDispatch = dispatchItems.find((item) => item.id === "evidence-loop:project-2:qimao:repair");
    const scaleDispatch = dispatchItems.find((item) => item.id === "evidence-loop:project-1:fanqie:scale");
    assert.ok(repairDispatch);
    assert.equal(repairDispatch.stage, "repair_tactic");
    assert.equal(repairDispatch.ownerRole, "主编");
    assert.equal(repairDispatch.href, "/projects/project-2#first-three-rewrite");
    assert.ok(scaleDispatch);
    assert.equal(scaleDispatch.stage, "scale_up");
    assert.equal(scaleDispatch.state, "assigned");
    assert.ok(scaleDispatch.detail.includes("证据闭环 86 分"));
  });

  await t.test("turns evidence loop rechecks into tactic experience items", () => {
    const completedTask = {
      databaseId: "task-evidence-loop-recheck",
      dispatchKey: "evidence-loop:project-1:fanqie:repair",
      id: "evidence-loop:project-1:fanqie:repair",
      projectId: "project-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      stage: "repair_tactic" as const,
      state: "completed" as const,
      priorityScore: 92,
      ownerRole: "主编",
      title: "番茄小说 先修打法派单",
      detail: "旧任务",
      dueLabel: "今天修打法",
      actionLabel: "修平台打法",
      href: "/projects/project-1#first-three-rewrite",
      acceptanceCriteria: ["已执行下一步：优先修标题简介、前三章钩子或投稿资产。"],
      evidence: [
        "证据闭环 53 分：先修打法",
        "证据闭环复检：53 -> 71 分，分数变好：继续观察",
      ],
      sourceReceiptId: null,
      completionEvidence: "已重写标题简介和前三章钩子，并回填 Gate 完成证据。",
      reviewLatestAt: "2026-01-07T00:00:00.000Z",
      assignedAt: "2026-01-07T00:00:00.000Z",
      completedAt: "2026-01-07T01:00:00.000Z",
      createdAt: "2026-01-07T00:00:00.000Z",
      updatedAt: "2026-01-07T01:00:00.000Z",
    };
    const decisionTimeline = buildGatePlatformDecisionTimeline({
      receipts: [],
      tasks: [completedTask],
      limit: 10,
    });
    const tacticLibrary = buildGatePlatformTacticExperienceLibrary(decisionTimeline);
    const tacticItem = tacticLibrary.items.find((item) => item.platformId === "fanqie");

    assert.ok(tacticItem);
    assert.equal(tacticItem.status, "usable");
    assert.equal(tacticItem.tactic, "证据闭环提分打法");
    assert.ok(tacticItem.lesson.includes("53"));
    assert.ok(tacticItem.lesson.includes("71"));
    assert.ok(tacticItem.evidence.some((item) => item.includes("分数变好")));
  });

  await t.test("turns project start validation advice into three dispatch cards", () => {
    const startReceipt = buildProjectStartDecisionActionReceipt({
      projectId: "project-1",
      projectTitle: "夜雨系统",
      platformId: "fanqie",
      platformName: "番茄小说",
      decision: {
        status: "seed",
        label: "先建打法",
        headline: "这个项目还没有首轮平台打法，先别让 AI 自由发挥。",
        nextExperiment: "先生成平台土壤和首轮开书打法，再进入前三章、审稿和发布包装。",
        actionLabel: "补平台土壤",
        targetAnchor: "world-bible",
        evidence: ["未找到首轮平台打法记录。"],
      },
      startTactic: null,
      created: ["核心规则", "首轮平台打法：番茄小说"],
      skipped: null,
      now: "2026-01-01T00:00:00.000Z",
    });

    const dispatchItems = buildGateProjectStartValidationDispatchItems([startReceipt]);

    assert.equal(dispatchItems.length, 3);
    assert.deepEqual(dispatchItems.map((item) => item.stage), [
      "start_first_three_review",
      "start_opening_diagnostic",
      "start_platform_package",
    ]);
    assert.equal(dispatchItems[0].id, "fanqie:start_validation:first_three_review:project-1");
    assert.equal(dispatchItems[0].state, "queued");
    assert.equal(dispatchItems[0].ownerRole, "首轮审稿编辑");
    assert.equal(dispatchItems[0].actionLabel, "派给审稿编辑");
    assert.equal(dispatchItems[0].href, "/projects/project-1#ai-pipeline");
    assert.ok(dispatchItems[0].acceptanceCriteria.includes("前三章至少完成一轮审稿"));
    assert.equal(dispatchItems[1].href, "/projects/project-1#first-three-rewrite");
    assert.ok(dispatchItems[1].acceptanceCriteria.includes("开头钩子诊断已完成"));
    assert.equal(dispatchItems[2].href, "/projects/project-1#platform-export");
    assert.ok(dispatchItems[2].acceptanceCriteria.includes("标题简介标签已有候选"));
  });

  await t.test("reviews first-round start validation dispatch completion as a three-part gate", () => {
    const startReceipt = buildProjectStartDecisionActionReceipt({
      projectId: "project-1",
      projectTitle: "夜雨系统",
      platformId: "fanqie",
      platformName: "番茄小说",
      decision: {
        status: "seed",
        label: "先建打法",
        headline: "这个项目还没有首轮平台打法，先别让 AI 自由发挥。",
        nextExperiment: "先生成平台土壤和首轮开书打法，再进入前三章、审稿和发布包装。",
        actionLabel: "补平台土壤",
        targetAnchor: "world-bible",
        evidence: ["未找到首轮平台打法记录。"],
      },
      startTactic: null,
      created: ["核心规则", "首轮平台打法：番茄小说"],
      skipped: null,
      now: "2026-01-01T00:00:00.000Z",
    });
    const dispatchItems = buildGateProjectStartValidationDispatchItems([startReceipt]);
    const tasks = dispatchItems.map((item, index) => ({
      ...item,
      databaseId: `dispatch-db-${index + 1}`,
      dispatchKey: item.id,
      projectId: "project-1",
      sourceReceiptId: startReceipt.id,
      completionEvidence: index === 0 ? "前三章已经审完，问题进入二改队列。" : index === 1 ? "" : "标题简介标签已经生成候选并保存。",
      state: index === 2 ? "completed" as const : index === 0 ? "completed" as const : "assigned" as const,
      assignedAt: "2026-01-01T00:00:01.000Z",
      completedAt: index === 0 || index === 2 ? "2026-01-01T00:00:02.000Z" : null,
      createdAt: "2026-01-01T00:00:01.000Z",
      updatedAt: "2026-01-01T00:00:02.000Z",
    }));

    const review = buildGateProjectStartValidationReview(tasks);

    assert.equal(review.summary.totalPlans, 1);
    assert.equal(review.summary.readyPlans, 0);
    assert.equal(review.summary.completedItems, 2);
    assert.equal(review.summary.activeItems, 1);
    assert.equal(review.plans[0].status, "active");
    assert.equal(review.plans[0].projectId, "project-1");
    assert.equal(review.plans[0].platformName, "番茄小说");
    assert.deepEqual(review.plans[0].missingStages, ["start_opening_diagnostic"]);
    assert.ok(review.plans[0].nextAction.includes("开头钩子诊断"));

    const completedTasks = tasks.map((task) => ({
      ...task,
      state: "completed" as const,
      completionEvidence: task.completionEvidence || "第一章钩子诊断完成，慢热问题已标出。",
      completedAt: task.completedAt ?? "2026-01-01T00:00:03.000Z",
    }));
    const completedReview = buildGateProjectStartValidationReview(completedTasks);

    assert.equal(completedReview.summary.readyPlans, 1);
    assert.equal(completedReview.plans[0].status, "ready");
    assert.equal(completedReview.plans[0].nextAction, "首轮验证三件套已收齐，可以进入发布包定稿和首轮数据回收。");
  });

  await t.test("promotes completed start validation into publish finalization and metric recovery dispatches", () => {
    const startReceipt = buildProjectStartDecisionActionReceipt({
      projectId: "project-1",
      projectTitle: "夜雨系统",
      platformId: "fanqie",
      platformName: "番茄小说",
      decision: {
        status: "seed",
        label: "先建打法",
        headline: "这个项目还没有首轮平台打法，先别让 AI 自由发挥。",
        nextExperiment: "先生成平台土壤和首轮开书打法，再进入前三章、审稿和发布包装。",
        actionLabel: "补平台土壤",
        targetAnchor: "world-bible",
        evidence: ["未找到首轮平台打法记录。"],
      },
      startTactic: null,
      created: ["核心规则", "首轮平台打法：番茄小说"],
      skipped: null,
      now: "2026-01-01T00:00:00.000Z",
    });
    const startTasks = buildGateProjectStartValidationDispatchItems([startReceipt]).map((item, index) => ({
      ...item,
      databaseId: `dispatch-db-${index + 1}`,
      dispatchKey: item.id,
      projectId: "project-1",
      sourceReceiptId: startReceipt.id,
      completionEvidence: `首轮验证第 ${index + 1} 项已完成。`,
      state: "completed" as const,
      assignedAt: "2026-01-01T00:00:01.000Z",
      completedAt: `2026-01-01T00:00:0${index + 2}.000Z`,
      createdAt: "2026-01-01T00:00:01.000Z",
      updatedAt: `2026-01-01T00:00:0${index + 2}.000Z`,
    }));
    const review = buildGateProjectStartValidationReview(startTasks);

    const nextDispatches = buildGateProjectStartNextDispatchItems(review);

    assert.equal(nextDispatches.length, 2);
    assert.deepEqual(nextDispatches.map((item) => item.stage), [
      "start_publish_finalize",
      "start_metrics_recovery",
    ]);
    assert.equal(nextDispatches[0].id, "fanqie:start_next:publish_finalize:project-1");
    assert.equal(nextDispatches[0].ownerRole, "发布包主编");
    assert.equal(nextDispatches[0].href, "/projects/project-1#platform-export");
    assert.ok(nextDispatches[0].acceptanceCriteria.includes("发布包定稿版本已保存"));
    assert.equal(nextDispatches[1].ownerRole, "首轮数据运营");
    assert.equal(nextDispatches[1].href, "/projects/project-1#platform-export");
    assert.ok(nextDispatches[1].acceptanceCriteria.includes("首轮曝光、点击、追读或收藏口径已确定"));

    const persisted = [{
      ...nextDispatches[0],
      databaseId: "dispatch-db-next-1",
      dispatchKey: nextDispatches[0].id,
      projectId: "project-1",
      sourceReceiptId: null,
      completionEvidence: "发布包已经定稿。",
      state: "completed" as const,
      assignedAt: "2026-01-01T00:00:05.000Z",
      completedAt: "2026-01-01T00:00:06.000Z",
      createdAt: "2026-01-01T00:00:05.000Z",
      updatedAt: "2026-01-01T00:00:06.000Z",
    }];
    const refreshed = buildGateProjectStartNextDispatchItems(review, persisted);

    assert.equal(refreshed[0].state, "completed");
    assert.equal(refreshed[1].state, "queued");
  });

  await t.test("decides the first metric recovery outcome before platform scale-up", () => {
    const finalizeDispatch = {
      id: "fanqie:start_next:publish_finalize:project-1",
      dispatchKey: "fanqie:start_next:publish_finalize:project-1",
      databaseId: "dispatch-db-finalize",
      projectId: "project-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      stage: "start_publish_finalize" as const,
      state: "completed" as const,
      priorityScore: 76,
      ownerRole: "发布包主编",
      title: "番茄小说 发布包定稿",
      detail: "发布包已定稿。",
      dueLabel: "今天",
      actionLabel: "派给发布主编",
      href: "/projects/project-1#platform-export",
      acceptanceCriteria: ["发布包定稿版本已保存"],
      evidence: ["首轮验证收齐"],
      sourceReceiptId: null,
      completionEvidence: "发布包已经定稿。",
      reviewLatestAt: "2026-01-01T00:00:04.000Z",
      assignedAt: "2026-01-01T00:00:05.000Z",
      completedAt: "2026-01-01T00:00:06.000Z",
      createdAt: "2026-01-01T00:00:05.000Z",
      updatedAt: "2026-01-01T00:00:06.000Z",
    };
    const metricDispatch = {
      ...finalizeDispatch,
      id: "fanqie:start_next:metrics_recovery:project-1",
      dispatchKey: "fanqie:start_next:metrics_recovery:project-1",
      databaseId: "dispatch-db-metrics",
      stage: "start_metrics_recovery" as const,
      priorityScore: 68,
      ownerRole: "首轮数据运营",
      title: "番茄小说 首轮数据回收",
      actionLabel: "派给数据运营",
      completionEvidence: "首轮曝光点击收藏追读已经回收。",
      completedAt: "2026-01-01T00:00:07.000Z",
      updatedAt: "2026-01-01T00:00:07.000Z",
    };
    const strongReceipt = buildGatePublishEffectReceipt({
      projectId: "project-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      now: "2026-01-01T01:00:00.000Z",
      metric: {
        views: 3200,
        clicks: 620,
        favorites: 180,
        follows: 92,
      },
    });
    const weakReceipt = buildGatePublishEffectReceipt({
      projectId: "project-2",
      platformId: "qimao",
      platformName: "七猫小说",
      now: "2026-01-01T01:00:00.000Z",
      metric: {
        views: 4200,
        clicks: 160,
        favorites: 30,
        follows: 12,
      },
    });
    const qimaoMetricDispatch = {
      ...metricDispatch,
      id: "qimao:start_next:metrics_recovery:project-2",
      dispatchKey: "qimao:start_next:metrics_recovery:project-2",
      databaseId: "dispatch-db-qimao-metrics",
      projectId: "project-2",
      platformId: "qimao",
      platformName: "七猫小说",
      href: "/projects/project-2#platform-export",
      title: "七猫小说 首轮数据回收",
      completedAt: "2026-01-01T00:00:07.000Z",
    };

    const decision = buildGateProjectStartMetricDecision(
      [metricDispatch, finalizeDispatch, qimaoMetricDispatch],
      [weakReceipt, strongReceipt],
    );

    assert.equal(decision.summary.total, 2);
    assert.equal(decision.summary.scale, 1);
    assert.equal(decision.summary.repairPackaging, 1);
    assert.equal(decision.items[0].status, "repair_packaging");
    assert.equal(decision.items[0].platformId, "qimao");
    assert.ok(decision.items[0].detail.includes("点击率"));
    assert.equal(decision.items[1].status, "scale");
    assert.equal(decision.items[1].platformId, "fanqie");
    assert.equal(decision.items[1].actionLabel, "进入小步加码");
  });

  await t.test("turns first metric decisions into executable dispatch cards", () => {
    function metricTask(input: {
      projectId: string;
      platformId: string;
      platformName: string;
      completedAt: string;
    }) {
      return {
        id: `${input.platformId}:start_next:metrics_recovery:${input.projectId}`,
        dispatchKey: `${input.platformId}:start_next:metrics_recovery:${input.projectId}`,
        databaseId: `dispatch-db-${input.platformId}`,
        projectId: input.projectId,
        platformId: input.platformId,
        platformName: input.platformName,
        stage: "start_metrics_recovery" as const,
        state: "completed" as const,
        priorityScore: 68,
        ownerRole: "首轮数据运营",
        title: `${input.platformName} 首轮数据回收`,
        detail: "首轮数据已回收。",
        dueLabel: "发布后 24 小时",
        actionLabel: "派给数据运营",
        href: `/projects/${input.projectId}#platform-export`,
        acceptanceCriteria: ["首轮曝光、点击、追读或收藏口径已确定"],
        evidence: ["首轮验证收齐"],
        sourceReceiptId: null,
        completionEvidence: "首轮曝光点击收藏追读已经回收。",
        reviewLatestAt: "2026-01-01T00:00:04.000Z",
        assignedAt: "2026-01-01T00:00:05.000Z",
        completedAt: input.completedAt,
        createdAt: "2026-01-01T00:00:05.000Z",
        updatedAt: input.completedAt,
      };
    }

    const tasks = [
      metricTask({ projectId: "project-1", platformId: "fanqie", platformName: "番茄小说", completedAt: "2026-01-01T00:00:07.000Z" }),
      metricTask({ projectId: "project-2", platformId: "qimao", platformName: "七猫小说", completedAt: "2026-01-01T00:00:07.000Z" }),
      metricTask({ projectId: "project-3", platformId: "royalroad", platformName: "Royal Road", completedAt: "2026-01-01T00:00:07.000Z" }),
    ];
    const receipts = [
      buildGatePublishEffectReceipt({
        projectId: "project-1",
        platformId: "fanqie",
        platformName: "番茄小说",
        now: "2026-01-01T01:00:00.000Z",
        metric: { views: 3200, clicks: 620, favorites: 180, follows: 92 },
      }),
      buildGatePublishEffectReceipt({
        projectId: "project-2",
        platformId: "qimao",
        platformName: "七猫小说",
        now: "2026-01-01T01:00:00.000Z",
        metric: { views: 4200, clicks: 160, favorites: 30, follows: 12 },
      }),
      buildGatePublishEffectReceipt({
        projectId: "project-3",
        platformId: "royalroad",
        platformName: "Royal Road",
        now: "2026-01-01T01:00:00.000Z",
        metric: { views: 2000, clicks: 220, favorites: 50, follows: 16 },
      }),
    ];
    const decision = buildGateProjectStartMetricDecision(tasks, receipts);

    const dispatches = buildGateProjectStartMetricDispatchItems(decision);

    assert.equal(dispatches.length, 3);
    assert.deepEqual(dispatches.map((item) => item.stage), [
      "start_repair_packaging",
      "start_rewrite_opening",
      "scale_up",
    ]);
    assert.equal(dispatches[0].id, "qimao:start_metric:repair_packaging:project-2");
    assert.equal(dispatches[0].ownerRole, "平台包装编辑");
    assert.equal(dispatches[0].href, "/projects/project-2#submission-package");
    assert.ok(dispatches[0].acceptanceCriteria.includes("标题简介标签完成首轮修复"));
    assert.equal(dispatches[1].ownerRole, "开头重写编辑");
    assert.equal(dispatches[1].href, "/projects/project-3#first-three-rewrite");
    assert.ok(dispatches[1].acceptanceCriteria.includes("第一章钩子和前三章追读点完成重写"));
    assert.equal(dispatches[2].ownerRole, "增长运营");
    assert.equal(dispatches[2].href, "/projects/project-1#platform-export");
    assert.ok(dispatches[2].acceptanceCriteria.includes("小步加码范围已限定"));

    const persisted = [{
      ...dispatches[0],
      databaseId: "dispatch-db-metric-1",
      dispatchKey: dispatches[0].id,
      projectId: "project-2",
      sourceReceiptId: null,
      completionEvidence: "已修复标题简介标签。",
      state: "completed" as const,
      assignedAt: "2026-01-01T02:00:00.000Z",
      completedAt: "2026-01-01T03:00:00.000Z",
      createdAt: "2026-01-01T02:00:00.000Z",
      updatedAt: "2026-01-01T03:00:00.000Z",
    }];
    const refreshed = buildGateProjectStartMetricDispatchItems(decision, persisted);

    assert.equal(refreshed[0].state, "completed");
    assert.equal(refreshed[1].state, "queued");
  });

  await t.test("routes completed first metric dispatches back into validation loops", () => {
    function completedMetricDispatch(input: {
      projectId: string;
      platformId: string;
      platformName: string;
      stage: "start_repair_packaging" | "start_rewrite_opening" | "scale_up";
      completedAt: string;
    }) {
      return {
        id: `${input.platformId}:start_metric:${input.stage}:${input.projectId}`,
        dispatchKey: `${input.platformId}:start_metric:${input.stage}:${input.projectId}`,
        databaseId: `dispatch-db-${input.platformId}-${input.stage}`,
        projectId: input.projectId,
        platformId: input.platformId,
        platformName: input.platformName,
        stage: input.stage,
        state: "completed" as const,
        priorityScore: 82,
        ownerRole: input.stage === "scale_up" ? "增长运营" : "平台编辑",
        title: `${input.platformName} 首轮决策任务`,
        detail: "首轮数据决策任务已完成。",
        dueLabel: "今天",
        actionLabel: "收口",
        href: `/projects/${input.projectId}#platform-export`,
        acceptanceCriteria: ["完成首轮决策任务"],
        evidence: ["首轮数据决策"],
        sourceReceiptId: null,
        completionEvidence: "已完成首轮决策动作。",
        reviewLatestAt: "2026-01-01T01:00:00.000Z",
        assignedAt: "2026-01-01T02:00:00.000Z",
        completedAt: input.completedAt,
        createdAt: "2026-01-01T02:00:00.000Z",
        updatedAt: input.completedAt,
      };
    }

    const completed = [
      completedMetricDispatch({
        projectId: "project-2",
        platformId: "qimao",
        platformName: "七猫小说",
        stage: "start_repair_packaging",
        completedAt: "2026-01-01T03:00:00.000Z",
      }),
      completedMetricDispatch({
        projectId: "project-3",
        platformId: "royalroad",
        platformName: "Royal Road",
        stage: "start_rewrite_opening",
        completedAt: "2026-01-01T03:05:00.000Z",
      }),
      completedMetricDispatch({
        projectId: "project-1",
        platformId: "fanqie",
        platformName: "番茄小说",
        stage: "scale_up",
        completedAt: "2026-01-01T03:10:00.000Z",
      }),
    ];

    const followups = buildGateProjectStartMetricFollowupDispatchItems(completed);

    assert.equal(followups.length, 3);
    assert.deepEqual(followups.map((item) => item.stage), [
      "start_publish_finalize",
      "start_first_three_review",
      "start_metrics_recovery",
    ]);
    assert.equal(followups[0].id, "qimao:start_metric_followup:publish_finalize:project-2");
    assert.equal(followups[0].ownerRole, "发布包主编");
    assert.equal(followups[0].href, "/projects/project-2#platform-export");
    assert.ok(followups[0].acceptanceCriteria.includes("修复后的标题简介标签已进入发布包复检"));
    assert.equal(followups[1].ownerRole, "前三章审稿编辑");
    assert.equal(followups[1].href, "/projects/project-3#first-three-rewrite");
    assert.ok(followups[1].acceptanceCriteria.includes("重写后的前三章已重新审稿"));
    assert.equal(followups[2].ownerRole, "首轮数据运营");
    assert.equal(followups[2].href, "/projects/project-1#platform-export");
    assert.ok(followups[2].acceptanceCriteria.includes("加码后的曝光、点击、追读或收藏已回收"));

    const persisted = [{
      ...followups[2],
      databaseId: "dispatch-db-followup-metrics",
      dispatchKey: followups[2].id,
      projectId: "project-1",
      sourceReceiptId: null,
      completionEvidence: "已回收加码后的第二轮数据。",
      state: "completed" as const,
      assignedAt: "2026-01-01T04:00:00.000Z",
      completedAt: "2026-01-01T05:00:00.000Z",
      createdAt: "2026-01-01T04:00:00.000Z",
      updatedAt: "2026-01-01T05:00:00.000Z",
    }];
    const refreshed = buildGateProjectStartMetricFollowupDispatchItems(completed, persisted);

    assert.equal(refreshed[0].state, "queued");
    assert.equal(refreshed[2].state, "completed");
  });

  await t.test("decides second-round platform direction after scaled metric recovery", () => {
    function secondMetricTask(input: {
      projectId: string;
      platformId: string;
      platformName: string;
      completedAt: string;
    }) {
      return {
        id: `${input.platformId}:start_metric_followup:next_metrics_recovery:${input.projectId}`,
        dispatchKey: `${input.platformId}:start_metric_followup:next_metrics_recovery:${input.projectId}`,
        databaseId: `dispatch-db-second-${input.platformId}`,
        projectId: input.projectId,
        platformId: input.platformId,
        platformName: input.platformName,
        stage: "start_metrics_recovery" as const,
        state: "completed" as const,
        priorityScore: 82,
        ownerRole: "首轮数据运营",
        title: `${input.platformName} 加码后二轮数据回收`,
        detail: "加码后二轮数据已回收。",
        dueLabel: "加码后 24 小时",
        actionLabel: "派给数据运营",
        href: `/projects/${input.projectId}#platform-export`,
        acceptanceCriteria: ["加码后的曝光、点击、追读或收藏已回收"],
        evidence: ["首轮小步加码已完成"],
        sourceReceiptId: null,
        completionEvidence: "已回收加码后的二轮数据。",
        reviewLatestAt: "2026-01-01T03:00:00.000Z",
        assignedAt: "2026-01-01T03:30:00.000Z",
        completedAt: input.completedAt,
        createdAt: "2026-01-01T03:30:00.000Z",
        updatedAt: input.completedAt,
      };
    }

    const tasks = [
      secondMetricTask({ projectId: "project-1", platformId: "fanqie", platformName: "番茄小说", completedAt: "2026-01-01T04:00:00.000Z" }),
      secondMetricTask({ projectId: "project-2", platformId: "qimao", platformName: "七猫小说", completedAt: "2026-01-01T04:00:00.000Z" }),
      secondMetricTask({ projectId: "project-3", platformId: "royalroad", platformName: "Royal Road", completedAt: "2026-01-01T04:00:00.000Z" }),
      secondMetricTask({ projectId: "project-4", platformId: "webnovel", platformName: "WebNovel", completedAt: "2026-01-01T04:00:00.000Z" }),
    ];
    const receipts = [
      buildGatePublishEffectReceipt({
        projectId: "project-1",
        platformId: "fanqie",
        platformName: "番茄小说",
        now: "2026-01-01T05:00:00.000Z",
        metric: { views: 6000, clicks: 980, favorites: 360, follows: 160 },
      }),
      buildGatePublishEffectReceipt({
        projectId: "project-2",
        platformId: "qimao",
        platformName: "七猫小说",
        now: "2026-01-01T05:00:00.000Z",
        metric: { views: 4800, clicks: 260, favorites: 92, follows: 42 },
      }),
      buildGatePublishEffectReceipt({
        projectId: "project-3",
        platformId: "royalroad",
        platformName: "Royal Road",
        now: "2026-01-01T05:00:00.000Z",
        metric: { views: 5200, clicks: 180, favorites: 52, follows: 18 },
      }),
      buildGatePublishEffectReceipt({
        projectId: "project-4",
        platformId: "webnovel",
        platformName: "WebNovel",
        now: "2026-01-01T05:00:00.000Z",
        metric: { views: 3000, clicks: 0, favorites: 0, follows: 0 },
      }),
    ];

    const decision = buildGateProjectSecondMetricDecision(tasks, receipts);

    assert.equal(decision.summary.total, 4);
    assert.equal(decision.summary.continueScale, 1);
    assert.equal(decision.summary.repairTactic, 1);
    assert.equal(decision.summary.pivotPlatform, 1);
    assert.equal(decision.summary.pause, 1);
    assert.deepEqual(decision.items.map((item) => item.status), [
      "pause",
      "pivot_platform",
      "repair_tactic",
      "continue_scale",
    ]);
    assert.equal(decision.items[0].platformId, "webnovel");
    assert.equal(decision.items[0].actionLabel, "暂停并复盘");
    assert.equal(decision.items[1].platformId, "royalroad");
    assert.equal(decision.items[1].href, "/projects/project-3#platform-export");
    assert.ok(decision.items[1].detail.includes("换平台"));
    assert.equal(decision.items[2].platformId, "qimao");
    assert.equal(decision.items[2].actionLabel, "修投稿打法");
    assert.equal(decision.items[3].platformId, "fanqie");
    assert.equal(decision.items[3].actionLabel, "继续小步加码");
    assert.ok(decision.items[3].evidence.includes("追读率 2.67%"));
  });

  await t.test("turns second-round metric decisions into role dispatch cards", () => {
    const decision = {
      summary: {
        total: 5,
        continueScale: 1,
        repairTactic: 1,
        pivotPlatform: 1,
        pause: 1,
        waitMetric: 1,
      },
      nextActions: ["二轮数据已分流。"],
      items: [
        {
          dispatchKey: "webnovel:start_metric_followup:next_metrics_recovery:project-4",
          projectId: "project-4",
          platformId: "webnovel",
          platformName: "WebNovel",
          status: "pause" as const,
          label: "暂停",
          detail: "WebNovel 二轮加码后有曝光但点击和追读为 0。",
          actionLabel: "暂停并复盘",
          href: "/projects/project-4#platform-export",
          priorityScore: 94,
          metricAt: "2026-01-01T05:00:00.000Z",
          clickRatePercent: 0,
          favoriteRatePercent: 0,
          followRatePercent: 0,
          evidence: ["曝光 3000", "点击 0", "追读 0"],
        },
        {
          dispatchKey: "royalroad:start_metric_followup:next_metrics_recovery:project-3",
          projectId: "project-3",
          platformId: "royalroad",
          platformName: "Royal Road",
          status: "pivot_platform" as const,
          label: "换打法/换平台",
          detail: "Royal Road 平台匹配或入口打法偏离。",
          actionLabel: "制定换平台方案",
          href: "/projects/project-3#platform-export",
          priorityScore: 88,
          metricAt: "2026-01-01T05:00:00.000Z",
          clickRatePercent: 3.5,
          favoriteRatePercent: 1,
          followRatePercent: 0.3,
          evidence: ["点击率 3.46%", "收藏率 1%", "追读率 0.35%"],
        },
        {
          dispatchKey: "qimao:start_metric_followup:next_metrics_recovery:project-2",
          projectId: "project-2",
          platformId: "qimao",
          platformName: "七猫小说",
          status: "repair_tactic" as const,
          label: "修打法",
          detail: "七猫小说 二轮数据没有崩，但转化还不够硬。",
          actionLabel: "修投稿打法",
          href: "/projects/project-2#submission-package",
          priorityScore: 82,
          metricAt: "2026-01-01T05:00:00.000Z",
          clickRatePercent: 5.4,
          favoriteRatePercent: 1.9,
          followRatePercent: 0.9,
          evidence: ["点击率 5.42%", "收藏率 1.92%", "追读率 0.88%"],
        },
        {
          dispatchKey: "fanqie:start_metric_followup:next_metrics_recovery:project-1",
          projectId: "project-1",
          platformId: "fanqie",
          platformName: "番茄小说",
          status: "continue_scale" as const,
          label: "继续加码",
          detail: "番茄小说 二轮表现可继续。",
          actionLabel: "继续小步加码",
          href: "/projects/project-1#platform-export",
          priorityScore: 84,
          metricAt: "2026-01-01T05:00:00.000Z",
          clickRatePercent: 16.3,
          favoriteRatePercent: 6,
          followRatePercent: 2.7,
          evidence: ["点击率 16.33%", "收藏率 6%", "追读率 2.67%"],
        },
        {
          dispatchKey: "wattpad:start_metric_followup:next_metrics_recovery:project-5",
          projectId: "project-5",
          platformId: "wattpad",
          platformName: "Wattpad",
          status: "wait_metric" as const,
          label: "等二轮数据",
          detail: "Wattpad 缺二轮效果回执。",
          actionLabel: "回填二轮数据",
          href: "/projects/project-5#platform-export",
          priorityScore: 70,
          metricAt: null,
          clickRatePercent: null,
          favoriteRatePercent: null,
          followRatePercent: null,
          evidence: ["缺少二轮效果回执"],
        },
      ],
    };

    const dispatches = buildGateProjectSecondMetricDispatchItems(decision);

    assert.equal(dispatches.length, 4);
    assert.deepEqual(dispatches.map((item) => item.stage), [
      "pause_platform",
      "pivot_platform",
      "repair_tactic",
      "scale_up",
    ]);
    assert.equal(dispatches[0].id, "webnovel:second_metric:pause:project-4");
    assert.equal(dispatches[0].ownerRole, "复盘负责人");
    assert.ok(dispatches[0].acceptanceCriteria.includes("暂停原因和复盘结论已保存"));
    assert.equal(dispatches[1].ownerRole, "平台策略");
    assert.ok(dispatches[1].acceptanceCriteria.includes("迁移平台或新打法方案已确定"));
    assert.equal(dispatches[2].ownerRole, "包装策略编辑");
    assert.equal(dispatches[2].href, "/projects/project-2#submission-package");
    assert.ok(dispatches[2].acceptanceCriteria.includes("二轮弱项对应的标题简介标签修复完成"));
    assert.equal(dispatches[3].ownerRole, "增长运营");
    assert.ok(dispatches[3].acceptanceCriteria.includes("第三轮小步加码范围已限定"));

    const persisted = [{
      ...dispatches[3],
      databaseId: "dispatch-db-second-scale",
      dispatchKey: dispatches[3].id,
      projectId: "project-1",
      sourceReceiptId: null,
      completionEvidence: "已完成第三轮小步加码。",
      state: "completed" as const,
      assignedAt: "2026-01-01T06:00:00.000Z",
      completedAt: "2026-01-01T07:00:00.000Z",
      createdAt: "2026-01-01T06:00:00.000Z",
      updatedAt: "2026-01-01T07:00:00.000Z",
    }];
    const refreshed = buildGateProjectSecondMetricDispatchItems(decision, persisted);

    assert.equal(refreshed[0].state, "queued");
    assert.equal(refreshed[3].state, "completed");
  });

  await t.test("routes completed second-round dispatches back into the next loop", () => {
    function completedSecondDispatch(input: {
      projectId: string;
      platformId: string;
      platformName: string;
      stage: "scale_up" | "repair_tactic" | "pivot_platform" | "pause_platform";
      suffix: string;
      completedAt: string;
    }) {
      return {
        id: `${input.platformId}:second_metric:${input.suffix}:${input.projectId}`,
        dispatchKey: `${input.platformId}:second_metric:${input.suffix}:${input.projectId}`,
        databaseId: `dispatch-db-second-followup-${input.platformId}`,
        projectId: input.projectId,
        platformId: input.platformId,
        platformName: input.platformName,
        stage: input.stage,
        state: "completed" as const,
        priorityScore: 84,
        ownerRole: "二轮负责人",
        title: `${input.platformName} 二轮派单`,
        detail: "二轮派单已完成。",
        dueLabel: "今天",
        actionLabel: "收口",
        href: `/projects/${input.projectId}#platform-export`,
        acceptanceCriteria: ["二轮派单完成"],
        evidence: ["二轮决策"],
        sourceReceiptId: null,
        completionEvidence: "已完成二轮决策动作。",
        reviewLatestAt: "2026-01-01T05:00:00.000Z",
        assignedAt: "2026-01-01T06:00:00.000Z",
        completedAt: input.completedAt,
        createdAt: "2026-01-01T06:00:00.000Z",
        updatedAt: input.completedAt,
      };
    }

    const completed = [
      completedSecondDispatch({
        projectId: "project-1",
        platformId: "fanqie",
        platformName: "番茄小说",
        stage: "scale_up",
        suffix: "continue_scale",
        completedAt: "2026-01-01T07:00:00.000Z",
      }),
      completedSecondDispatch({
        projectId: "project-2",
        platformId: "qimao",
        platformName: "七猫小说",
        stage: "repair_tactic",
        suffix: "repair_tactic",
        completedAt: "2026-01-01T07:05:00.000Z",
      }),
      completedSecondDispatch({
        projectId: "project-3",
        platformId: "royalroad",
        platformName: "Royal Road",
        stage: "pivot_platform",
        suffix: "pivot_platform",
        completedAt: "2026-01-01T07:10:00.000Z",
      }),
      completedSecondDispatch({
        projectId: "project-4",
        platformId: "webnovel",
        platformName: "WebNovel",
        stage: "pause_platform",
        suffix: "pause",
        completedAt: "2026-01-01T07:15:00.000Z",
      }),
    ];

    const followups = buildGateProjectSecondMetricFollowupDispatchItems(completed);

    assert.equal(followups.length, 4);
    assert.deepEqual(followups.map((item) => item.stage), [
      "start_metrics_recovery",
      "start_publish_finalize",
      "start_platform_package",
      "pause_platform",
    ]);
    assert.equal(followups[0].id, "fanqie:second_metric_followup:third_metrics_recovery:project-1");
    assert.equal(followups[0].ownerRole, "数据运营");
    assert.ok(followups[0].acceptanceCriteria.includes("第三轮曝光、点击、收藏或追读已回收"));
    assert.equal(followups[1].ownerRole, "发布包主编");
    assert.equal(followups[1].href, "/projects/project-2#platform-export");
    assert.ok(followups[1].acceptanceCriteria.includes("二轮修复后的发布包基准已保存"));
    assert.equal(followups[2].ownerRole, "平台验证编辑");
    assert.equal(followups[2].href, "/projects/project-3#submission-package");
    assert.ok(followups[2].acceptanceCriteria.includes("新平台标题简介标签验证已完成"));
    assert.equal(followups[3].ownerRole, "复盘负责人");
    assert.ok(followups[3].acceptanceCriteria.includes("暂停复盘归档已完成"));

    const persisted = [{
      ...followups[0],
      databaseId: "dispatch-db-third-metrics",
      dispatchKey: followups[0].id,
      projectId: "project-1",
      sourceReceiptId: null,
      completionEvidence: "已回收第三轮数据。",
      state: "completed" as const,
      assignedAt: "2026-01-01T08:00:00.000Z",
      completedAt: "2026-01-01T09:00:00.000Z",
      createdAt: "2026-01-01T08:00:00.000Z",
      updatedAt: "2026-01-01T09:00:00.000Z",
    }];
    const refreshed = buildGateProjectSecondMetricFollowupDispatchItems(completed, persisted);

    assert.equal(refreshed[0].state, "completed");
    assert.equal(refreshed[1].state, "queued");
  });

  await t.test("decides final platform state after third-round metric recovery", () => {
    function thirdMetricTask(input: {
      projectId: string;
      platformId: string;
      platformName: string;
      completedAt: string;
    }) {
      return {
        id: `${input.platformId}:second_metric_followup:third_metrics_recovery:${input.projectId}`,
        dispatchKey: `${input.platformId}:second_metric_followup:third_metrics_recovery:${input.projectId}`,
        databaseId: `dispatch-db-third-${input.platformId}`,
        projectId: input.projectId,
        platformId: input.platformId,
        platformName: input.platformName,
        stage: "start_metrics_recovery" as const,
        state: "completed" as const,
        priorityScore: 86,
        ownerRole: "数据运营",
        title: `${input.platformName} 第三轮数据回收`,
        detail: "第三轮数据已回收。",
        dueLabel: "加码后 24 小时",
        actionLabel: "派给数据运营",
        href: `/projects/${input.projectId}#platform-export`,
        acceptanceCriteria: ["第三轮曝光、点击、收藏或追读已回收"],
        evidence: ["二轮后继续加码已完成"],
        sourceReceiptId: null,
        completionEvidence: "已回收第三轮真实数据。",
        reviewLatestAt: "2026-01-01T07:00:00.000Z",
        assignedAt: "2026-01-01T07:30:00.000Z",
        completedAt: input.completedAt,
        createdAt: "2026-01-01T07:30:00.000Z",
        updatedAt: input.completedAt,
      };
    }

    const tasks = [
      thirdMetricTask({ projectId: "project-1", platformId: "fanqie", platformName: "番茄小说", completedAt: "2026-01-01T08:00:00.000Z" }),
      thirdMetricTask({ projectId: "project-2", platformId: "qimao", platformName: "七猫小说", completedAt: "2026-01-01T08:00:00.000Z" }),
      thirdMetricTask({ projectId: "project-3", platformId: "royalroad", platformName: "Royal Road", completedAt: "2026-01-01T08:00:00.000Z" }),
      thirdMetricTask({ projectId: "project-4", platformId: "webnovel", platformName: "WebNovel", completedAt: "2026-01-01T08:00:00.000Z" }),
      thirdMetricTask({ projectId: "project-5", platformId: "wattpad", platformName: "Wattpad", completedAt: "2026-01-01T08:00:00.000Z" }),
    ];
    const receipts = [
      buildGatePublishEffectReceipt({
        projectId: "project-1",
        platformId: "fanqie",
        platformName: "番茄小说",
        now: "2026-01-01T09:00:00.000Z",
        metric: { views: 9000, clicks: 1250, favorites: 390, follows: 180 },
      }),
      buildGatePublishEffectReceipt({
        projectId: "project-2",
        platformId: "qimao",
        platformName: "七猫小说",
        now: "2026-01-01T09:00:00.000Z",
        metric: { views: 7600, clicks: 620, favorites: 190, follows: 92 },
      }),
      buildGatePublishEffectReceipt({
        projectId: "project-3",
        platformId: "royalroad",
        platformName: "Royal Road",
        now: "2026-01-01T09:00:00.000Z",
        metric: { views: 6400, clicks: 310, favorites: 72, follows: 48 },
      }),
      buildGatePublishEffectReceipt({
        projectId: "project-4",
        platformId: "webnovel",
        platformName: "WebNovel",
        now: "2026-01-01T09:00:00.000Z",
        metric: { views: 5200, clicks: 0, favorites: 0, follows: 0 },
      }),
    ];

    const decision = buildGateProjectThirdMetricDecision(tasks, receipts);

    assert.equal(decision.summary.total, 5);
    assert.equal(decision.summary.stableScale, 1);
    assert.equal(decision.summary.downgradeRepair, 1);
    assert.equal(decision.summary.pivotPlatform, 1);
    assert.equal(decision.summary.archivePause, 1);
    assert.equal(decision.summary.waitMetric, 1);
    assert.deepEqual(decision.items.map((item) => item.status), [
      "archive_pause",
      "pivot_platform",
      "downgrade_repair",
      "wait_metric",
      "stable_scale",
    ]);
    assert.equal(decision.items[0].platformId, "webnovel");
    assert.equal(decision.items[0].actionLabel, "归档暂停");
    assert.ok(decision.items[0].detail.includes("三轮"));
    assert.equal(decision.items[1].platformId, "royalroad");
    assert.equal(decision.items[1].actionLabel, "换平台验证");
    assert.equal(decision.items[2].platformId, "qimao");
    assert.equal(decision.items[2].actionLabel, "降档修复");
    assert.equal(decision.items[3].platformId, "wattpad");
    assert.equal(decision.items[3].actionLabel, "回填第三轮数据");
    assert.equal(decision.items[4].platformId, "fanqie");
    assert.equal(decision.items[4].actionLabel, "稳定加码");
    assert.ok(decision.items[4].evidence.includes("追读率 2%"));
  });

  await t.test("turns third-round final outcomes into platform tactic experience", () => {
    function thirdMetricTask(input: {
      projectId: string;
      platformId: string;
      platformName: string;
      completedAt: string;
    }) {
      return {
        id: `${input.platformId}:second_metric_followup:third_metrics_recovery:${input.projectId}`,
        dispatchKey: `${input.platformId}:second_metric_followup:third_metrics_recovery:${input.projectId}`,
        databaseId: `dispatch-db-third-experience-${input.platformId}`,
        projectId: input.projectId,
        platformId: input.platformId,
        platformName: input.platformName,
        stage: "start_metrics_recovery" as const,
        state: "completed" as const,
        priorityScore: 88,
        ownerRole: "数据运营",
        title: `${input.platformName} 第三轮数据回收`,
        detail: "第三轮数据已回收。",
        dueLabel: "加码后 24 小时",
        actionLabel: "派给数据运营",
        href: `/projects/${input.projectId}#platform-export`,
        acceptanceCriteria: ["第三轮曝光、点击、收藏或追读已回收"],
        evidence: ["二轮后继续加码已完成"],
        sourceReceiptId: null,
        completionEvidence: "已回收第三轮真实数据。",
        reviewLatestAt: "2026-01-01T07:00:00.000Z",
        assignedAt: "2026-01-01T07:30:00.000Z",
        completedAt: input.completedAt,
        createdAt: "2026-01-01T07:30:00.000Z",
        updatedAt: input.completedAt,
      };
    }

    const tasks = [
      thirdMetricTask({ projectId: "project-1", platformId: "fanqie", platformName: "番茄小说", completedAt: "2026-01-01T08:00:00.000Z" }),
      thirdMetricTask({ projectId: "project-4", platformId: "webnovel", platformName: "WebNovel", completedAt: "2026-01-01T08:00:00.000Z" }),
    ];
    const receipts = [
      buildGatePublishEffectReceipt({
        projectId: "project-1",
        platformId: "fanqie",
        platformName: "番茄小说",
        now: "2026-01-01T09:00:00.000Z",
        metric: { views: 9000, clicks: 1250, favorites: 390, follows: 180 },
      }),
      buildGatePublishEffectReceipt({
        projectId: "project-4",
        platformId: "webnovel",
        platformName: "WebNovel",
        now: "2026-01-01T09:00:00.000Z",
        metric: { views: 5200, clicks: 0, favorites: 0, follows: 0 },
      }),
    ];

    const decisionTimeline = buildGatePlatformDecisionTimeline({ receipts, tasks, limit: 10 });
    const fanqieTimeline = decisionTimeline.items.find((item) => item.platformId === "fanqie");
    const webnovelTimeline = decisionTimeline.items.find((item) => item.platformId === "webnovel");
    const tacticLibrary = buildGatePlatformTacticExperienceLibrary(decisionTimeline, 10);
    const fanqieExperience = tacticLibrary.items.find((item) => item.platformId === "fanqie");
    const webnovelExperience = tacticLibrary.items.find((item) => item.platformId === "webnovel");
    const fanqieMarkdown = buildGatePlatformTacticExperienceMarkdown(fanqieExperience!);

    assert.equal(fanqieTimeline?.events.some((event) => event.type === "final" && event.label === "稳定加码"), true);
    assert.equal(webnovelTimeline?.events.some((event) => event.type === "final" && event.label === "归档暂停"), true);
    assert.equal(tacticLibrary.summary.usable, 1);
    assert.equal(tacticLibrary.summary.blocked, 1);
    assert.equal(fanqieExperience?.status, "usable");
    assert.equal(fanqieExperience?.label, "可复用打法");
    assert.equal(fanqieExperience?.tactic, "三轮稳定加码打法");
    assert.ok(fanqieExperience?.reuseHint.includes("稳定加码池"));
    assert.ok(fanqieExperience?.evidence.some((evidence) => evidence.includes("最终判定：稳定加码")));
    assert.equal(webnovelExperience?.status, "blocked");
    assert.equal(webnovelExperience?.label, "避坑样本");
    assert.equal(webnovelExperience?.tactic, "三轮归档暂停样本");
    assert.ok(webnovelExperience?.risk.includes("重启条件"));
    assert.ok(fanqieMarkdown.includes("可复用打法：三轮稳定加码打法"));
    assert.ok(fanqieMarkdown.includes("稳定加码池"));
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
      {
        ...baseDispatch,
        id: "story-tree-followup:project-1:chapter-1:source:74",
        databaseId: "dispatch-db-4",
        dispatchKey: "story-tree-followup:project-1:chapter-1:source:74",
        projectId: "project-1",
        sourceReceiptId: null,
        completionEvidence: "",
        platformId: "fanqie",
        platformName: "番茄小说",
        stage: "start_rewrite_opening" as const,
        state: "assigned" as const,
        ownerRole: "作者",
        priorityScore: 91,
        evidence: ["来源派单：story-tree:project-1:chapter-1:chapter_draft:opening_ending"],
        assignedAt: "2026-01-01T00:00:05.000Z",
        completedAt: null,
        createdAt: "2026-01-01T00:00:05.000Z",
        updatedAt: "2026-01-01T00:00:05.000Z",
      },
      {
        ...baseDispatch,
        id: "story-tree-followup:project-1:chapter-1:story-tree-followup-project-1-chapter-1-source-74:77",
        databaseId: "dispatch-db-5",
        dispatchKey: "story-tree-followup:project-1:chapter-1:story-tree-followup-project-1-chapter-1-source-74:77",
        projectId: "project-1",
        sourceReceiptId: null,
        completionEvidence: "",
        platformId: "fanqie",
        platformName: "番茄小说",
        stage: "start_rewrite_opening" as const,
        state: "assigned" as const,
        ownerRole: "作者",
        priorityScore: 89,
        evidence: ["来源派单：story-tree-followup:project-1:chapter-1:source:74"],
        assignedAt: "2026-01-01T00:00:06.000Z",
        completedAt: null,
        createdAt: "2026-01-01T00:00:06.000Z",
        updatedAt: "2026-01-01T00:00:06.000Z",
      },
    ];

    const center = buildGateDispatchTaskCenter(tasks);
    const assigned = filterGateDispatchTasks(tasks, { state: "assigned" });
    const fanqie = filterGateDispatchTasks(tasks, { platformId: "fanqie" });
    const recheckFollowUps = filterGateDispatchTasks(tasks, { recheckFollowUpOnly: true });

    assert.equal(center.summary.total, 5);
    assert.equal(center.summary.active, 4);
    assert.equal(center.summary.queued, 1);
    assert.equal(center.summary.assigned, 3);
    assert.equal(center.summary.completed, 1);
    assert.equal(center.summary.recheckFollowUp, 2);
    assert.equal(center.summary.activeRecheckFollowUp, 2);
    assert.equal(center.summary.recheckFollowUpChains, 1);
    assert.equal(center.summary.repeatedRecheckFollowUpChains, 1);
    assert.equal(center.recheckFollowUpChains[0].rootDispatchKey, "story-tree:project-1:chapter-1:chapter_draft:opening_ending");
    assert.equal(center.recheckFollowUpChains[0].maxRound, 2);
    assert.equal(center.recheckFollowUpChains[0].active, 2);
    assert.equal(center.recheckFollowUpChains[0].reviewAdvice?.type, "acceptance_mismatch");
    assert.equal(center.recheckFollowUpChains[0].reviewAdvice?.title, "验收标准先补清楚");
    assert.ok(center.recheckFollowUpChains[0].reviewAdvice?.nextAction.includes("通过线"));
    assert.equal(center.recheckFollowUpChains[0].reviewAdvice?.dispatch.stage, "watch");
    assert.equal(center.recheckFollowUpChains[0].reviewAdvice?.dispatch.actionLabel, "补验收标准");
    assert.ok(center.recheckFollowUpChains[0].reviewAdvice?.dispatch.id.startsWith("recheck-review:acceptance_mismatch:"));
    assert.ok(center.recheckFollowUpChains[0].reviewAdvice?.dispatch.acceptanceCriteria.some((item) => item.includes("通过线")));
    const intervenedCenter = buildGateDispatchTaskCenter([
      ...tasks,
      {
        ...baseDispatch,
        id: "recheck-review:acceptance_mismatch:story-tree-project-1-chapter-1-chapter_draft-opening_ending:2",
        databaseId: "dispatch-db-9",
        dispatchKey: "recheck-review:acceptance_mismatch:story-tree-project-1-chapter-1-chapter_draft-opening_ending:2",
        projectId: "project-1",
        sourceReceiptId: null,
        completionEvidence: "",
        platformId: "fanqie",
        platformName: "番茄小说",
        stage: "watch" as const,
        state: "assigned" as const,
        ownerRole: "主编",
        priorityScore: 88,
        evidence: ["返工链根：story-tree:project-1:chapter-1:chapter_draft:opening_ending", "复盘建议：验收标准先补清楚"],
        assignedAt: "2026-01-01T00:00:07.000Z",
        completedAt: null,
        createdAt: "2026-01-01T00:00:07.000Z",
        updatedAt: "2026-01-01T00:00:07.000Z",
      },
    ]);
    assert.equal(intervenedCenter.recheckFollowUpChains[0].reviewIntervention?.status, "intervened");
    assert.equal(intervenedCenter.recheckFollowUpChains[0].reviewIntervention?.label, "复盘已介入");
    assert.deepEqual(center.recheckFollowUpChains[0].rounds.map((round) => `${round.round}:${round.dispatchKey}`), [
      "1:story-tree-followup:project-1:chapter-1:source:74",
      "2:story-tree-followup:project-1:chapter-1:story-tree-followup-project-1-chapter-1-source-74:77",
    ]);
    assert.equal(center.platforms[0].id, "fanqie");
    assert.ok(center.nextActions.some((actionText) => actionText.includes("复查失败返工")));
    assert.ok(center.nextActions.some((actionText) => actionText.includes("二轮以上")));
    assert.ok(center.nextActions.some((actionText) => actionText.includes("高优先级")));
    assert.equal(assigned.length, 3);
    assert.equal(assigned[0].dispatchKey, "story-tree-followup:project-1:chapter-1:source:74");
    assert.equal(fanqie.length, 3);
    assert.equal(fanqie[0].ownerRole, "投稿资产编辑");
    assert.equal(recheckFollowUps.length, 2);
    assert.equal(recheckFollowUps[0].ownerRole, "作者");
  });

  await t.test("suggests pausing platform direction for repeated submission follow-up chains", () => {
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
        id: "submission-recheck-followup:project-1:qimao:submission-precheck-project-1-platform-risk:72",
        databaseId: "dispatch-db-6",
        dispatchKey: "submission-recheck-followup:project-1:qimao:submission-precheck-project-1-platform-risk:72",
        projectId: "project-1",
        sourceReceiptId: null,
        completionEvidence: "已补投稿包但平台证据仍未改善。",
        platformId: "qimao",
        platformName: "七猫小说",
        stage: "start_repair_packaging" as const,
        state: "completed" as const,
        ownerRole: "运营",
        priorityScore: 84,
        evidence: ["来源派单：submission-precheck:project-1:platform-risk", "证据闭环复检：72 -> 72 分，分数未变：仍需修复"],
        assignedAt: "2026-01-01T00:00:05.000Z",
        completedAt: "2026-01-01T00:00:06.000Z",
        createdAt: "2026-01-01T00:00:05.000Z",
        updatedAt: "2026-01-01T00:00:06.000Z",
      },
      {
        ...baseDispatch,
        id: "submission-recheck-followup:project-1:qimao:submission-recheck-followup-project-1-qimao-submission-precheck-project-1-platform-risk-72:70",
        databaseId: "dispatch-db-7",
        dispatchKey: "submission-recheck-followup:project-1:qimao:submission-recheck-followup-project-1-qimao-submission-precheck-project-1-platform-risk-72:70",
        projectId: "project-1",
        sourceReceiptId: null,
        completionEvidence: "",
        platformId: "qimao",
        platformName: "七猫小说",
        stage: "pause_platform" as const,
        state: "assigned" as const,
        ownerRole: "主编",
        priorityScore: 92,
        evidence: ["来源派单：submission-recheck-followup:project-1:qimao:submission-precheck-project-1-platform-risk:72"],
        assignedAt: "2026-01-01T00:00:07.000Z",
        completedAt: null,
        createdAt: "2026-01-01T00:00:07.000Z",
        updatedAt: "2026-01-01T00:00:07.000Z",
      },
      {
        ...baseDispatch,
        id: "recheck-review:direction_pause:submission-precheck-project-1-platform-risk:2",
        databaseId: "dispatch-db-8",
        dispatchKey: "recheck-review:direction_pause:submission-precheck-project-1-platform-risk:2",
        projectId: "project-1",
        sourceReceiptId: null,
        completionEvidence: "已暂停七猫加码，转回投稿包和前三章兑现重判。",
        platformId: "qimao",
        platformName: "七猫小说",
        stage: "pause_platform" as const,
        state: "completed" as const,
        ownerRole: "主编",
        priorityScore: 96,
        evidence: ["返工链根：submission-precheck:project-1:platform-risk", "复盘建议：平台方向先暂停"],
        assignedAt: "2026-01-01T00:00:08.000Z",
        completedAt: "2026-01-01T00:00:09.000Z",
        createdAt: "2026-01-01T00:00:08.000Z",
        updatedAt: "2026-01-01T00:00:09.000Z",
      },
    ];

    const center = buildGateDispatchTaskCenter(tasks);

    assert.equal(center.recheckFollowUpChains.length, 1);
    assert.equal(center.recheckFollowUpChains[0].reviewAdvice?.type, "direction_pause");
    assert.equal(center.recheckFollowUpChains[0].reviewAdvice?.title, "平台方向先暂停");
    assert.equal(center.recheckFollowUpChains[0].reviewAdvice?.ownerRole, "主编");
    assert.equal(center.recheckFollowUpChains[0].reviewAdvice?.dispatch.stage, "pause_platform");
    assert.equal(center.recheckFollowUpChains[0].reviewAdvice?.dispatch.actionLabel, "暂停平台");
    assert.equal(center.recheckFollowUpChains[0].reviewAdvice?.dispatch.platformId, "qimao");
    assert.equal(center.recheckFollowUpChains[0].reviewIntervention?.status, "stopped");
    assert.equal(center.recheckFollowUpChains[0].reviewIntervention?.label, "已止损");
    assert.equal(center.recheckFollowUpChains[0].reviewIntervention?.state, "completed");
    assert.ok(center.recheckFollowUpChains[0].reviewAdvice?.nextAction.includes("停平台加码"));
  });

  await t.test("feeds completed recheck review dispatches into platform tactic experience", () => {
    function reviewTask(input: {
      dispatchKey: string;
      platformId: string;
      platformName: string;
      stage: "pause_platform" | "watch";
      title: string;
      completionEvidence: string;
      completedAt: string;
      priorityScore: number;
      evidence: string[];
    }) {
      return {
        id: input.dispatchKey,
        databaseId: `dispatch-db-${input.platformId}-review`,
        dispatchKey: input.dispatchKey,
        projectId: "project-1",
        sourceReceiptId: null,
        platformId: input.platformId,
        platformName: input.platformName,
        stage: input.stage,
        state: "completed" as const,
        priorityScore: input.priorityScore,
        ownerRole: "主编",
        title: input.title,
        detail: "返工链复盘派单。",
        dueLabel: "今天复盘",
        actionLabel: "查看复盘",
        href: "/dispatch",
        acceptanceCriteria: ["写清复盘结论和下一轮边界。"],
        evidence: input.evidence,
        completionEvidence: input.completionEvidence,
        reviewLatestAt: input.completedAt,
        assignedAt: "2026-01-01T00:00:00.000Z",
        completedAt: input.completedAt,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: input.completedAt,
      };
    }

    const timeline = buildGatePlatformDecisionTimeline({
      receipts: [],
      tasks: [
        reviewTask({
          dispatchKey: "recheck-review:direction_pause:submission-precheck-project-1-platform-risk:2",
          platformId: "qimao",
          platformName: "七猫小说",
          stage: "pause_platform",
          title: "七猫小说 · 平台方向先暂停",
          completionEvidence: "已暂停七猫加码，转回投稿包和前三章兑现重判。",
          completedAt: "2026-01-01T01:00:00.000Z",
          priorityScore: 96,
          evidence: ["返工链根：submission-precheck:project-1:platform-risk", "复盘建议：平台方向先暂停"],
        }),
        reviewTask({
          dispatchKey: "recheck-review:acceptance_mismatch:story-tree-project-1-chapter-1-chapter_draft-opening_ending:2",
          platformId: "fanqie",
          platformName: "番茄小说",
          stage: "watch",
          title: "番茄小说 · 验收标准先补清楚",
          completionEvidence: "已补通过线、不可接受项和下一轮只验证一个核心问题。",
          completedAt: "2026-01-01T02:00:00.000Z",
          priorityScore: 88,
          evidence: ["返工链根：story-tree:project-1:chapter-1:chapter_draft:opening_ending", "复盘建议：验收标准先补清楚"],
        }),
      ],
      limit: 10,
    });
    const qimaoTimeline = timeline.items.find((item) => item.platformId === "qimao");
    const fanqieTimeline = timeline.items.find((item) => item.platformId === "fanqie");
    const tacticLibrary = buildGatePlatformTacticExperienceLibrary(timeline, 10);
    const qimaoExperience = tacticLibrary.items.find((item) => item.platformId === "qimao");
    const fanqieExperience = tacticLibrary.items.find((item) => item.platformId === "fanqie");
    const qimaoMarkdown = buildGatePlatformTacticExperienceMarkdown(qimaoExperience!);

    assert.equal(qimaoTimeline?.status, "blocked");
    assert.equal(qimaoTimeline?.label, "复盘止损");
    assert.equal(qimaoTimeline?.events[0].label, "复盘完成");
    assert.ok(qimaoTimeline?.events[0].evidence.some((line) => line.includes("平台方向暂停")));
    assert.equal(qimaoExperience?.status, "blocked");
    assert.equal(qimaoExperience?.tactic, "复盘止损样本");
    assert.ok(qimaoExperience?.risk.includes("已暂停七猫加码"));
    assert.ok(qimaoMarkdown.includes("复盘止损样本"));
    assert.equal(fanqieTimeline?.events[0].label, "复盘完成");
    assert.equal(fanqieExperience?.status, "watch");
    assert.equal(fanqieExperience?.tactic, "验收标准修正打法");
    assert.ok(fanqieExperience?.reuseHint.includes("验收收口流程"));
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
      stage: "start_metrics_recovery" as const,
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
    assert.equal(review.items.find((item) => item.dispatchKey === verifiedTask.dispatchKey)?.actionLabel, "查看证据链");
    assert.equal(review.items.find((item) => item.dispatchKey === verifiedTask.dispatchKey)?.href, verifiedTask.href);
    assert.equal(review.items.find((item) => item.dispatchKey === needsReceiptTask.dispatchKey)?.status, "needs_receipt");
    assert.equal(review.items.find((item) => item.dispatchKey === needsReceiptTask.dispatchKey)?.actionLabel, "回填发布效果");
    assert.equal(review.items.find((item) => item.dispatchKey === needsReceiptTask.dispatchKey)?.href, "/projects/project-2#publish-effect-panel");
    assert.equal(review.items.find((item) => item.dispatchKey === missingEvidenceTask.dispatchKey)?.actionLabel, "补完成依据");
    assert.equal(review.items.find((item) => item.dispatchKey === missingEvidenceTask.dispatchKey)?.href, "/dispatch");
    assert.equal(review.items.find((item) => item.dispatchKey === activeTask.dispatchKey)?.actionLabel, activeTask.actionLabel);
    assert.equal(review.items.find((item) => item.dispatchKey === activeTask.dispatchKey)?.href, activeTask.href);
    assert.ok(review.nextActions.some((actionText) => actionText.includes("后续业务回执")));
  });

  await t.test("counts dispatch completion receipts as business evidence", () => {
    const baseDispatch = buildGatePlatformGrowthDispatchItems([buildGatePlatformStrategyReceipt({
      item: strategyPlatform,
      status: "succeeded",
      now: "2026-01-01T00:00:00.000Z",
      payload: {
        variants: [{ strategy: "强钩子版" }],
      },
    })])[0];
    const completedTask = {
      ...baseDispatch,
      id: "fanqie:publish_finalize",
      databaseId: "dispatch-db-completion-receipt",
      dispatchKey: "fanqie:publish_finalize",
      projectId: "project-1",
      sourceReceiptId: null,
      completionEvidence: [
        "番茄小说 发布包定稿",
        "标题：重生后我靠毒舌系统爆红",
        "简介：第一章直接给冲突和反转",
        "标签：重生、系统、逆袭",
        "结论：可发布",
      ].join("\n"),
      platformId: "fanqie",
      platformName: "番茄小说",
      stage: "start_publish_finalize" as const,
      state: "completed" as const,
      priorityScore: 80,
      assignedAt: "2026-01-01T00:30:00.000Z",
      completedAt: "2026-01-01T01:00:00.000Z",
      createdAt: "2026-01-01T00:30:00.000Z",
      updatedAt: "2026-01-01T01:00:00.000Z",
    };
    const dispatchReceipt = buildGatePlatformDispatchReceipt({
      dispatch: completedTask,
      now: "2026-01-01T01:30:00.000Z",
    });
    const completionReceipt = buildGateDispatchCompletionReceipt({
      dispatch: completedTask,
      completionEvidence: completedTask.completionEvidence,
      now: "2026-01-01T01:30:00.001Z",
    });
    const metaOnlyReview = buildGateDispatchEvidenceReview([completedTask], [dispatchReceipt]);
    const completedReview = buildGateDispatchEvidenceReview([completedTask], [dispatchReceipt, completionReceipt]);

    assert.equal(dispatchReceipt.actionId, "gate-platform-dispatch:start_publish_finalize:fanqie");
    assert.equal(completionReceipt.actionId, "gate-dispatch-completion:start_publish_finalize:fanqie");
    assert.equal(completionReceipt.taskId, completedTask.dispatchKey);
    assert.equal(metaOnlyReview.items[0].status, "needs_receipt");
    assert.equal(completedReview.items[0].status, "verified");
    assert.equal(completedReview.items[0].latestReceiptAt, completionReceipt.createdAt);
  });

  await t.test("builds and validates platform dispatch completion templates", () => {
    const metricTask = {
      stage: "start_metrics_recovery" as const,
      title: "七猫小说 首轮数据回收",
      actionLabel: "派给数据运营",
      platformName: "七猫小说",
    };
    const packageTask = {
      stage: "start_publish_finalize" as const,
      title: "番茄小说 发布包定稿",
      actionLabel: "派给发布主编",
      platformName: "番茄小说",
    };
    const repairTask = {
      stage: "repair_tactic" as const,
      title: "Royal Road 二轮打法修复",
      actionLabel: "派给增长运营",
      platformName: "Royal Road",
    };
    const openingTask = {
      stage: "start_rewrite_opening" as const,
      title: "WebNovel 首轮开头重写",
      actionLabel: "派给开头编辑",
      platformName: "WebNovel",
    };

    assert.ok(buildGateDispatchCompletionTemplate(metricTask).includes("曝光"));
    assert.ok(buildGateDispatchCompletionTemplate(metricTask).includes("发布链接"));
    assert.ok(reviewGateDispatchCompletionEvidence(metricTask, buildGateDispatchCompletionTemplate(metricTask)).includes("真实数据"));
    assert.equal(reviewGateDispatchCompletionEvidence(metricTask, [
      "七猫小说 首轮数据回收",
      "日期：2026-07-05",
      "曝光：12000",
      "点击：960",
      "收藏：180",
      "追读：72",
      "平台反馈：待反馈",
      "结论：继续加码",
    ].join("\n")), null);

    assert.ok(buildGateDispatchCompletionTemplate(packageTask).includes("基准版本"));
    assert.ok(reviewGateDispatchCompletionEvidence(packageTask, [
      "番茄小说 发布包定稿",
      "标题：重生后我靠毒舌系统爆红",
      "简介：第一章直接给冲突和反转",
      "标签：重生、系统、逆袭",
      "结论：可发布",
    ].join("\n")) === null);
    assert.ok(reviewGateDispatchCompletionEvidence(packageTask, "标题：已调整\n结论：可发布")?.includes("至少写清 3 项"));

    assert.ok(buildGateDispatchCompletionTemplate(repairTask).includes("修复对象"));
    assert.equal(reviewGateDispatchCompletionEvidence(repairTask, [
      "Royal Road 二轮打法修复",
      "修复对象：简介和前三章承诺",
      "处理动作：重写英文卖点并收窄 LitRPG 标签",
      "修复后证据：已保存新版发布包",
    ].join("\n")), null);

    assert.ok(buildGateDispatchCompletionTemplate(openingTask).includes("钩子/追读点"));
    assert.equal(reviewGateDispatchCompletionEvidence(openingTask, [
      "WebNovel 首轮开头重写",
      "章节范围：1-3 章",
      "钩子/追读点：第一屏出现系统惩罚和升级目标",
      "复查证据：已重新跑前三章审稿",
    ].join("\n")), null);
    assert.equal(buildGateDispatchCompletionTemplate({
      stage: "model_route_governance" as const,
      title: "模型治理",
      actionLabel: "复检",
      platformName: "模型路由",
    }), "");
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
