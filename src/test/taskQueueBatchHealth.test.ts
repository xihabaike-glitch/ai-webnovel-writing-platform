import assert from "node:assert/strict";
import test from "node:test";
import { buildTaskQueueBatchHealthReview } from "../lib/projects/taskQueueBatchHealth.ts";
import type { GateActionAuditRecord } from "../lib/projects/gateActionReceipts.ts";

function audit(input: {
  receiptId: string;
  label: string;
  platformName?: string;
  tacticLabel: string;
  quality: number;
  createdAt: string;
  scaleGate?: "none" | "sample_only" | "cleared";
  aiPipelineRecheckMode?: "sample_recheck" | "small_batch_resume";
}): GateActionAuditRecord {
  const platformName = input.platformName ?? "番茄小说";
  return {
    receiptId: input.receiptId,
    actionId: `recommended-batch:standard:draft:${input.receiptId}`,
    label: input.label,
    detail: `${platformName} · 夜雨系统 · 批量初稿`,
    href: "/tasks#recommended-batch",
    status: "succeeded",
    message: "推荐批次完成。",
    executionType: "recommended_batch",
    succeededCount: 2,
    failedCount: 0,
    taskId: null,
    platformId: platformName === "七猫" ? "qimao" : "fanqie",
    platformName,
    recheckStatus: "ready",
    recheckLabel: "复检任务队列",
    recheckDetail: "推荐批次已执行，刷新任务队列确认后续策略。",
    recheckAction: "刷新任务队列",
    payload: JSON.stringify({
      plan: {
        strategyBases: [{
          title: `首轮平台打法：${platformName}`,
          label: input.tacticLabel,
          primaryTactic: input.tacticLabel === "三轮降档" ? "只复用修复流程。" : "三轮数据已站住，可以小批放大。",
          openingMove: input.tacticLabel === "三轮降档" ? "重修前三章兑现。" : "第一段给不可逆危机。",
          verificationMove: "继续回填曝光、点击、收藏和追读。",
          risk: input.tacticLabel === "三轮降档" ? "不能直接进入稳定加码。" : "稳定加码不是无限放量。",
        }],
        scaleGate: input.scaleGate ?? "none",
        actionLabel: "批量初稿 2 个",
        category: "draft",
      },
      aiPipelineRecheck: input.aiPipelineRecheckMode ? {
        dispatchKey: `ai-pipeline-recheck:project-1:${input.receiptId}:scale`,
        mode: input.aiPipelineRecheckMode,
      } : undefined,
      routeEffectSummary: {
        successRatePercent: 100,
        knownCostUsd: 0.02,
        averageQualityScore: input.quality,
      },
      batchReceipt: {
        status: "continue",
        headline: input.label,
      },
    }),
    createdAt: input.createdAt,
  };
}

test("buildTaskQueueBatchHealthReview keeps one healthy third-round batch in watch", () => {
  const review = buildTaskQueueBatchHealthReview([
    audit({
      receiptId: "stable-1",
      label: "三轮稳住批次健康，继续小步加码",
      tacticLabel: "三轮稳住",
      quality: 88,
      createdAt: "2026-01-01T00:00:00.000Z",
    }),
  ]);

  assert.equal(review.summary.watch, 1);
  assert.equal(review.items[0]?.label, "三轮稳住观察");
  assert.ok(review.items[0]?.nextAction.includes("曝光、点击、收藏和追读"));
});

test("buildTaskQueueBatchHealthReview promotes repeated stable batches but not downgrade batches", () => {
  const review = buildTaskQueueBatchHealthReview([
    audit({
      receiptId: "stable-2",
      label: "三轮稳住批次健康，继续小步加码",
      tacticLabel: "三轮稳住",
      quality: 90,
      createdAt: "2026-01-02T00:00:00.000Z",
    }),
    audit({
      receiptId: "stable-1",
      label: "三轮稳住批次健康，继续小步加码",
      tacticLabel: "三轮稳住",
      quality: 88,
      createdAt: "2026-01-01T00:00:00.000Z",
    }),
    audit({
      receiptId: "downgrade-2",
      label: "三轮降档小样本已跑完，先回填验收",
      platformName: "七猫",
      tacticLabel: "三轮降档",
      quality: 90,
      scaleGate: "sample_only",
      createdAt: "2026-01-02T00:00:00.000Z",
    }),
    audit({
      receiptId: "downgrade-1",
      label: "三轮降档小样本已跑完，先回填验收",
      platformName: "七猫",
      tacticLabel: "三轮降档",
      quality: 88,
      scaleGate: "sample_only",
      createdAt: "2026-01-01T00:00:00.000Z",
    }),
  ]);

  const stable = review.items.find((item) => item.tacticTitle.includes("番茄小说"));
  const downgrade = review.items.find((item) => item.tacticTitle.includes("七猫"));

  assert.equal(stable?.status, "usable");
  assert.equal(stable?.label, "三轮稳住打法");
  assert.equal(downgrade?.status, "watch");
  assert.equal(downgrade?.label, "三轮降档观察");
});

test("buildTaskQueueBatchHealthReview treats AI small-batch recheck as recovery evidence", () => {
  const review = buildTaskQueueBatchHealthReview([
    audit({
      receiptId: "ai-scale-1",
      label: "AI 写审改小批恢复完成",
      tacticLabel: "三轮稳住",
      quality: 90,
      aiPipelineRecheckMode: "small_batch_resume",
      createdAt: "2026-01-03T00:00:00.000Z",
    }),
  ]);

  assert.equal(review.items[0]?.recoveryBatches, 1);
  assert.equal(review.items[0]?.label, "恢复放量观察");
  assert.ok(review.items[0]?.evidence[0]?.includes("恢复放量"));
  assert.ok(review.items[0]?.nextAction.includes("恢复放量样本还薄"));
});
