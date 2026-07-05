import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTaskQueueBatchGateActionReceipt,
  buildTaskQueueBatchReceipt,
  buildTaskQueueBatchReceiptDecisionCard,
  type TaskQueueBatchRouteEffect,
} from "../lib/projects/taskQueueBatchReceipt.ts";
import type { TaskQueueExecutionPlan } from "../lib/projects/taskQueueExecutionPlan.ts";

const plan: TaskQueueExecutionPlan = {
  canRun: true,
  category: "draft",
  projectId: "project-1",
  projectIds: ["project-1"],
  projectTitle: "夜雨系统",
  itemIds: ["project-1:draft:chapter-1"],
  chapterIds: ["chapter-1"],
  strategyBases: [{
    title: "首轮平台打法：番茄小说",
    label: "模板推荐",
    primaryTactic: "先抓首章钩子，再用前三章连续兑现爽点。",
    openingMove: "第一段给倒计时。",
    verificationMove: "批量后检查前三章追读。",
    risk: "慢热会掉节奏。",
  }],
  scaleGate: "none",
  adoptionFollowupCount: 0,
  adoptionFollowupItemIds: [],
  actionLabel: "批量初稿 1 个",
  detail: "夜雨系统 · 待生成 · 第一章",
  warnings: [],
};

const routeEffect: TaskQueueBatchRouteEffect = {
  totalTasks: 1,
  succeededTasks: 1,
  failedTasks: 0,
  successRatePercent: 100,
  knownCostUsd: 0.01,
  averageCostPerSucceededTaskUsd: 0.01,
  averageQualityScore: 86,
  fallbackTasks: 0,
  verdict: "批量执行稳定。",
};

test("buildTaskQueueBatchReceipt recommends the next production step after a healthy draft batch", () => {
  const receipt = buildTaskQueueBatchReceipt({
    plan,
    results: [{ status: "succeeded", chapterTitle: "第一章", error: null, qualityScore: 86 }],
    routeEffectSummary: routeEffect,
  });

  assert.equal(receipt.status, "continue");
  assert.equal(receipt.primaryLabel, "进入批量审稿");
  assert.equal(receipt.primaryHref, "/projects/project-1#ai-pipeline");
  assert.ok(receipt.warnings.some((warning) => warning.includes("模板推荐")));
});

test("buildTaskQueueBatchReceipt blocks scale-up when a batch has failures", () => {
  const receipt = buildTaskQueueBatchReceipt({
    plan,
    results: [{ status: "failed", chapterTitle: "第一章", error: "模型超时", qualityScore: null }],
    routeEffectSummary: {
      ...routeEffect,
      succeededTasks: 0,
      failedTasks: 1,
      successRatePercent: 0,
      averageQualityScore: null,
      verdict: "成功率偏低，先修复。",
    },
  });

  assert.equal(receipt.status, "repair");
  assert.equal(receipt.primaryHref, "/failures");
  assert.ok(receipt.detail.includes("第一章"));
  assert.ok(receipt.warnings.some((warning) => warning.includes("不要继续放大")));
});

test("buildTaskQueueBatchReceiptDecisionCard turns repair receipts into a blocked task queue card", () => {
  const receipt = buildTaskQueueBatchReceipt({
    plan,
    results: [{ status: "failed", chapterTitle: "第一章", error: "模型超时", qualityScore: null }],
    routeEffectSummary: {
      ...routeEffect,
      succeededTasks: 0,
      failedTasks: 1,
      successRatePercent: 0,
      averageQualityScore: null,
      verdict: "成功率偏低，先修复。",
    },
  });

  const card = buildTaskQueueBatchReceiptDecisionCard(receipt);

  assert.equal(card.tone, "blocked");
  assert.equal(card.statusLabel, "先修复");
  assert.equal(card.headline, "批次有失败，先修再放大");
  assert.equal(card.primaryLabel, "查看失败修复");
  assert.equal(card.primaryHref, "/failures");
  assert.ok(card.badges.includes("成功/失败：0/1"));
  assert.ok(card.badges.includes("质量：缺样本"));
  assert.ok(card.warnings.some((warning) => warning.includes("不要继续放大")));
});

test("buildTaskQueueBatchReceipt routes weak quality to review and rewrite", () => {
  const receipt = buildTaskQueueBatchReceipt({
    plan: { ...plan, category: "review", actionLabel: "批量审稿 1 个" },
    results: [{ status: "succeeded", chapterTitle: "第一章", error: null, qualityScore: 72 }],
    routeEffectSummary: {
      ...routeEffect,
      averageQualityScore: 72,
      verdict: "本批质量分偏低。",
    },
  });

  assert.equal(receipt.status, "review_quality");
  assert.equal(receipt.primaryLabel, "进入批量二改");
  assert.ok(receipt.detail.includes("72"));
});

test("buildTaskQueueBatchReceipt flags fallback and cost pressure before expanding", () => {
  const receipt = buildTaskQueueBatchReceipt({
    plan,
    results: [{ status: "succeeded", chapterTitle: "第一章", error: null, qualityScore: 86 }],
    routeEffectSummary: {
      ...routeEffect,
      fallbackTasks: 1,
      averageCostPerSucceededTaskUsd: 0.08,
      knownCostUsd: 0.08,
      verdict: "备用模型命中且成本偏高。",
    },
  });

  assert.equal(receipt.status, "watch_cost");
  assert.equal(receipt.primaryHref, "/projects/project-1#model-task-audit");
  assert.ok(receipt.warnings.some((warning) => warning.includes("成本")));
});

test("buildTaskQueueBatchReceipt turns a watch sample into task-center acceptance evidence", () => {
  const receipt = buildTaskQueueBatchReceipt({
    plan: {
      ...plan,
      scaleGate: "sample_only",
      actionLabel: "批量初稿 1 个",
      warnings: ["当前处于观察小样本闸门，只运行 1 个样本。"],
    },
    results: [{ status: "succeeded", taskId: "task-1", chapterTitle: "第一章", error: null, qualityScore: 86 }],
    routeEffectSummary: routeEffect,
  });

  assert.equal(receipt.status, "continue");
  assert.equal(receipt.headline, "小样本已跑完，先回填验收");
  assert.equal(receipt.primaryHref, "/dispatch");
  assert.ok(receipt.completionEvidenceTemplate?.includes("通过线"));
  assert.ok(receipt.completionEvidenceTemplate?.includes("不可接受项"));
  assert.ok(receipt.completionEvidenceTemplate?.includes("复查证据"));
  assert.ok(receipt.completionEvidenceTemplate?.includes("放量结论：通过"));
});

test("buildTaskQueueBatchReceipt keeps failed watch samples from producing pass evidence", () => {
  const receipt = buildTaskQueueBatchReceipt({
    plan: {
      ...plan,
      scaleGate: "sample_only",
      actionLabel: "批量初稿 1 个",
      warnings: ["当前处于观察小样本闸门，只运行 1 个样本。"],
    },
    results: [{ status: "succeeded", taskId: "task-1", chapterTitle: "第一章", error: null, qualityScore: 72 }],
    routeEffectSummary: {
      ...routeEffect,
      averageQualityScore: 72,
      verdict: "质量偏低，暂不放量。",
    },
  });

  assert.equal(receipt.status, "review_quality");
  assert.ok(receipt.completionEvidenceTemplate?.includes("放量结论：未通过"));
  assert.ok(receipt.completionEvidenceTemplate?.includes("暂不放量"));
});

test("buildTaskQueueBatchReceipt does not pass a watch sample without quality evidence", () => {
  const receipt = buildTaskQueueBatchReceipt({
    plan: {
      ...plan,
      scaleGate: "sample_only",
      actionLabel: "批量初稿 1 个",
    },
    results: [{ status: "succeeded", taskId: "task-1", chapterTitle: "第一章", error: null, qualityScore: null }],
    routeEffectSummary: {
      ...routeEffect,
      averageQualityScore: null,
      verdict: "缺少质量复查样本。",
    },
  });

  assert.equal(receipt.primaryHref, "/dispatch");
  assert.ok(receipt.completionEvidenceTemplate?.includes("质量 缺样本"));
  assert.ok(receipt.completionEvidenceTemplate?.includes("放量结论：未通过"));
});

test("buildTaskQueueBatchReceipt audits cleared watch scale-up batches with a stricter quality line", () => {
  const receipt = buildTaskQueueBatchReceipt({
    plan: {
      ...plan,
      scaleGate: "cleared",
      actionLabel: "批量初稿 2 个",
      itemIds: ["project-1:draft:chapter-2", "project-1:draft:chapter-3"],
      chapterIds: ["chapter-2", "chapter-3"],
    },
    results: [
      { status: "succeeded", taskId: "task-2", chapterTitle: "第二章", error: null, qualityScore: 82 },
      { status: "succeeded", taskId: "task-3", chapterTitle: "第三章", error: null, qualityScore: 82 },
    ],
    routeEffectSummary: {
      ...routeEffect,
      totalTasks: 2,
      succeededTasks: 2,
      averageQualityScore: 82,
      knownCostUsd: 0.02,
      verdict: "恢复放量质量偏紧。",
    },
  });

  assert.equal(receipt.status, "review_quality");
  assert.equal(receipt.headline, "恢复小批跌线，回滚观察修复");
  assert.equal(receipt.primaryLabel, "回滚观察修复");
  assert.equal(receipt.primaryHref, "/dispatch");
  assert.ok(receipt.detail.includes("85"));
  assert.ok(receipt.detail.includes("回滚到观察/修复"));
  assert.ok(receipt.warnings.some((warning) => warning.includes("暂停恢复小批")));
});

test("buildTaskQueueBatchReceipt keeps healthy cleared watch scale-up batches small-step", () => {
  const receipt = buildTaskQueueBatchReceipt({
    plan: {
      ...plan,
      scaleGate: "cleared",
      actionLabel: "批量初稿 2 个",
      itemIds: ["project-1:draft:chapter-2", "project-1:draft:chapter-3"],
      chapterIds: ["chapter-2", "chapter-3"],
    },
    results: [
      { status: "succeeded", taskId: "task-2", chapterTitle: "第二章", error: null, qualityScore: 88 },
      { status: "succeeded", taskId: "task-3", chapterTitle: "第三章", error: null, qualityScore: 88 },
    ],
    routeEffectSummary: {
      ...routeEffect,
      totalTasks: 2,
      succeededTasks: 2,
      averageQualityScore: 88,
      knownCostUsd: 0.02,
      verdict: "恢复放量稳定。",
    },
  });

  assert.equal(receipt.status, "continue");
  assert.equal(receipt.headline, "准放量批次稳定，下一批仍小步走");
  assert.equal(receipt.primaryLabel, "继续恢复小批");
  assert.equal(receipt.primaryHref, "/tasks#recommended-batch");
  assert.ok(receipt.detail.includes("不证明可以一次拉满"));
  assert.ok(receipt.warnings.some((warning) => warning.includes("继续小批")));
});

test("buildTaskQueueBatchReceipt rolls back weak third-round stable batches to watch", () => {
  const receipt = buildTaskQueueBatchReceipt({
    plan: {
      ...plan,
      strategyBases: [{
        ...plan.strategyBases[0],
        label: "三轮稳住",
        primaryTactic: "三轮数据已站住，可以小批放大。",
        risk: "稳定加码不是无限放量。",
      }],
      actionLabel: "批量初稿 2 个",
    },
    results: [
      { status: "succeeded", taskId: "task-2", chapterTitle: "第二章", error: null, qualityScore: 84 },
      { status: "succeeded", taskId: "task-3", chapterTitle: "第三章", error: null, qualityScore: 84 },
    ],
    routeEffectSummary: {
      ...routeEffect,
      totalTasks: 2,
      succeededTasks: 2,
      averageQualityScore: 84,
      knownCostUsd: 0.02,
      verdict: "三轮稳住批次质量偏紧。",
    },
  });

  assert.equal(receipt.status, "review_quality");
  assert.equal(receipt.headline, "三轮稳住批次未站住，先停加码");
  assert.ok(receipt.evidenceItems.some((item) => item.includes("三轮复盘")));
  assert.ok(receipt.warnings.some((warning) => warning.includes("稳定加码结论必须回撤")));
});

test("buildTaskQueueBatchReceipt keeps healthy third-round stable batches small-step", () => {
  const receipt = buildTaskQueueBatchReceipt({
    plan: {
      ...plan,
      strategyBases: [{
        ...plan.strategyBases[0],
        label: "三轮稳住",
        primaryTactic: "三轮数据已站住，可以小批放大。",
        risk: "稳定加码不是无限放量。",
      }],
      actionLabel: "批量初稿 2 个",
    },
    results: [
      { status: "succeeded", taskId: "task-2", chapterTitle: "第二章", error: null, qualityScore: 88 },
      { status: "succeeded", taskId: "task-3", chapterTitle: "第三章", error: null, qualityScore: 88 },
    ],
    routeEffectSummary: {
      ...routeEffect,
      totalTasks: 2,
      succeededTasks: 2,
      averageQualityScore: 88,
      knownCostUsd: 0.02,
      verdict: "三轮稳住批次健康。",
    },
  });

  assert.equal(receipt.status, "continue");
  assert.equal(receipt.headline, "三轮稳住批次健康，继续小步加码");
  assert.ok(receipt.detail.includes("曝光、点击、收藏、追读"));
  assert.ok(receipt.warnings.some((warning) => warning.includes("真实数据回收")));
});

test("buildTaskQueueBatchReceipt keeps third-round downgrade samples out of scale-up", () => {
  const receipt = buildTaskQueueBatchReceipt({
    plan: {
      ...plan,
      scaleGate: "sample_only",
      strategyBases: [{
        ...plan.strategyBases[0],
        label: "三轮降档",
        primaryTactic: "只复用修复流程。",
        risk: "不能直接进入稳定加码。",
      }],
      actionLabel: "批量初稿 1 个",
    },
    results: [{ status: "succeeded", taskId: "task-1", chapterTitle: "第一章", error: null, qualityScore: 86 }],
    routeEffectSummary: routeEffect,
  });

  assert.equal(receipt.status, "continue");
  assert.equal(receipt.headline, "三轮降档小样本已跑完，先回填验收");
  assert.ok(receipt.detail.includes("不证明可以放量"));
  assert.ok(receipt.warnings.some((warning) => warning.includes("不沉淀加码结论")));
});

test("buildTaskQueueBatchReceipt routes adoption follow-up batches back to the gate", () => {
  const receipt = buildTaskQueueBatchReceipt({
    plan: {
      ...plan,
      category: "review",
      actionLabel: "批量审稿 1 个",
      itemIds: ["project-1:adoption-followup:first-three-adoption:project-1:chapter-1:revision-1:review"],
      chapterIds: ["chapter-1"],
      adoptionFollowupCount: 1,
      adoptionFollowupItemIds: ["project-1:adoption-followup:first-three-adoption:project-1:chapter-1:revision-1:review"],
    },
    results: [{ status: "succeeded", taskId: "task-1", chapterTitle: "第 1 章采纳后重新审稿", error: null, qualityScore: 88 }],
    routeEffectSummary: routeEffect,
  });

  assert.equal(receipt.status, "continue");
  assert.equal(receipt.primaryLabel, "回总闸门复检");
  assert.equal(receipt.primaryHref, "/gate#first-three-adoption-closure");
  assert.equal(receipt.secondaryLabel, "进入批量二改");
  assert.ok(receipt.evidenceItems.some((item) => item.includes("采纳闭环：1 个")));
  assert.ok(receipt.warnings.some((warning) => warning.includes("采纳闭环任务跑完不等于发布放行")));
});

test("buildTaskQueueBatchGateActionReceipt turns a recommended batch into gate experience", () => {
  const batchReceipt = buildTaskQueueBatchReceipt({
    plan,
    results: [{ status: "succeeded", taskId: "task-1", chapterId: "chapter-1", chapterTitle: "第一章", error: null, qualityScore: 86 }],
    routeEffectSummary: routeEffect,
  });
  const gateReceipt = buildTaskQueueBatchGateActionReceipt({
    plan,
    results: [{ status: "succeeded", taskId: "task-1", chapterId: "chapter-1", chapterTitle: "第一章", error: null, qualityScore: 86 }],
    routeEffectSummary: routeEffect,
    batchReceipt,
    strategyId: "standard",
    now: "2026-01-01T00:00:00.000Z",
  });

  assert.equal(gateReceipt.receipt.executionType, "recommended_batch");
  assert.equal(gateReceipt.receipt.platformId, "fanqie");
  assert.equal(gateReceipt.receipt.platformName, "番茄小说");
  assert.equal(gateReceipt.receipt.succeededCount, 1);
  assert.equal(gateReceipt.receipt.failedCount, 0);
  assert.equal(gateReceipt.receipt.taskId, "task-1");
  assert.equal(gateReceipt.receipt.batchEffectSummary?.successRatePercent, 100);
  assert.equal(gateReceipt.receipt.startTactics?.[0].title, "首轮平台打法：番茄小说");
  assert.equal(gateReceipt.receipt.batchContext?.scaleGate, "none");
  assert.equal(gateReceipt.payload.plan.scaleGate, "none");
  assert.equal(gateReceipt.payload.plan.actionLabel, "批量初稿 1 个");
  assert.equal(gateReceipt.payload.plan.category, "draft");
  assert.deepEqual(gateReceipt.payload.plan.itemIds, plan.itemIds);
  assert.deepEqual(gateReceipt.payload.plan.adoptionFollowupItemIds, []);
  assert.equal(gateReceipt.payload.results[0]?.chapterId, "chapter-1");
  assert.equal(gateReceipt.payload.results[0]?.chapterTitle, "第一章");
  assert.equal(gateReceipt.payload.results[0]?.error, null);
  assert.equal(gateReceipt.payload.batchReceipt.status, "continue");
  assert.equal(gateReceipt.payload.strategyId, "standard");
});
