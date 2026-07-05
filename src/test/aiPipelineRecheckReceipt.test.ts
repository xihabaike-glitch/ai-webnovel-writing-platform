import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAiPipelineRecheckGateActionReceipt,
  buildAiPipelineRecheckNextAction,
} from "../lib/projects/aiPipelineRecheckReceipt.ts";
import { buildTaskQueueBatchHealthReview } from "../lib/projects/taskQueueBatchHealth.ts";

test("buildAiPipelineRecheckGateActionReceipt feeds AI recheck results back into batch health", () => {
  const recheck = buildAiPipelineRecheckGateActionReceipt({
    dispatchKey: "ai-pipeline-recheck:project-1:ai-plan-1:sample",
    projectId: "project-1",
    projectTitle: "夜雨系统",
    href: "/projects/project-1#ai-pipeline",
    plan: {
      canRun: true,
      category: "draft",
      projectId: "project-1",
      projectIds: ["project-1"],
      projectTitle: "夜雨系统",
      itemIds: ["project-1:draft:chapter-1"],
      chapterIds: ["chapter-1"],
      strategyBases: [{
        title: "首轮平台打法：番茄小说",
        label: "三轮稳住",
        primaryTactic: "三轮数据已站住，可以小批放大。",
        openingMove: "第一段给不可逆危机。",
        verificationMove: "继续回填曝光、点击、收藏和追读。",
        risk: "稳定加码不是无限放量。",
      }],
      scaleGate: "sample_only",
      adoptionFollowupCount: 0,
      adoptionFollowupItemIds: [],
      actionLabel: "批量初稿 1 个",
      detail: "夜雨系统 · 初稿样本 · 第一章",
      warnings: [],
    },
    results: [{
      status: "succeeded",
      taskId: "task-1",
      chapterId: "chapter-1",
      chapterTitle: "第一章 雨夜系统",
      error: null,
      qualityScore: 88,
    }],
    routeEffectSummary: {
      totalTasks: 1,
      succeededTasks: 1,
      failedTasks: 0,
      successRatePercent: 100,
      knownCostUsd: 0.01,
      averageCostPerSucceededTaskUsd: 0.01,
      averageQualityScore: 88,
      fallbackTasks: 0,
      verdict: "本批路线表现稳定，可以作为后续模型推荐样本。",
    },
    batchReceipt: {
      status: "continue",
      headline: "初稿批次完成，下一步先审稿",
      detail: "复检样本已完成。",
      primaryLabel: "进入批量审稿",
      primaryHref: "/projects/project-1#ai-pipeline",
      secondaryLabel: "查看任务队列",
      secondaryHref: "/tasks",
      evidenceItems: ["执行批次：批量初稿 1 个", "成功率：100%", "质量：88"],
      warnings: [],
    },
    now: "2026-01-03T00:00:00.000Z",
  });

  assert.equal(recheck.receipt.executionType, "recommended_batch");
  assert.equal(recheck.receipt.actionId, "ai-pipeline-recheck:project-1:ai-plan-1:sample");
  assert.equal(recheck.receipt.href, "/projects/project-1#ai-pipeline");
  assert.equal(recheck.payload.sourceDispatchKey, "ai-pipeline-recheck:project-1:ai-plan-1:sample");
  assert.equal(recheck.payload.plan.scaleGate, "sample_only");

  const health = buildTaskQueueBatchHealthReview([{
    receiptId: recheck.receipt.id,
    actionId: recheck.receipt.actionId,
    label: recheck.receipt.label,
    detail: recheck.receipt.detail,
    href: recheck.receipt.href,
    status: recheck.receipt.status,
    message: recheck.receipt.message,
    executionType: recheck.receipt.executionType,
    succeededCount: recheck.receipt.succeededCount,
    failedCount: recheck.receipt.failedCount,
    platformId: recheck.receipt.platformId,
    platformName: recheck.receipt.platformName,
    payload: JSON.stringify(recheck.payload),
    createdAt: recheck.receipt.createdAt,
  }]);

  assert.equal(health.summary.watch, 1);
  assert.equal(health.items[0]?.label, "三轮稳住观察");
  assert.equal(health.items[0]?.sampleBatches, 1);
});

test("buildAiPipelineRecheckNextAction points passed samples to small-batch recovery", () => {
  const action = buildAiPipelineRecheckNextAction({
    dispatchKey: "ai-pipeline-recheck:project-1:ai-plan-1:sample",
    projectId: "project-1",
    mode: "sample_recheck",
    batchStatus: "continue",
    primaryHref: "/projects/project-1#ai-pipeline",
    successRatePercent: 100,
    averageQualityScore: 88,
  });

  assert.equal(action.kind, "resume_small_batch");
  assert.equal(action.label, "恢复小批执行");
  assert.equal(action.href, "/projects/project-1#ai-pipeline");
  assert.ok(action.detail.includes("小批"));
});

test("buildAiPipelineRecheckNextAction points failed samples to repair checklist", () => {
  const action = buildAiPipelineRecheckNextAction({
    dispatchKey: "ai-pipeline-recheck:project-1:ai-plan-1:sample",
    projectId: "project-1",
    mode: "sample_recheck",
    batchStatus: "repair",
    primaryHref: "/failures",
    successRatePercent: 50,
    averageQualityScore: 62,
  });

  assert.equal(action.kind, "repair_checklist");
  assert.equal(action.label, "生成修复清单");
  assert.equal(action.href, "/projects/project-1#ai-pipeline");
  assert.ok(action.detail.includes("不要恢复批量"));
});
