import assert from "node:assert/strict";
import test from "node:test";
import { buildTaskQueueBatchReceipt, type TaskQueueBatchRouteEffect } from "../lib/projects/taskQueueBatchReceipt.ts";
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
