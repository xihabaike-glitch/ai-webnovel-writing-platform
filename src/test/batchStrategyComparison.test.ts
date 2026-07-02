import test from "node:test";
import assert from "node:assert/strict";
import { buildBatchStrategyComparison } from "../lib/projects/batchStrategyComparison.ts";
import type { TaskBatchHistoryItem } from "../lib/ai/taskBatchHistory.ts";
import type { QueueItem } from "../lib/projects/taskQueueCenter.ts";

const baseItem: QueueItem = {
  id: "project-1:review:chapter-1",
  projectId: "project-1",
  projectTitle: "项目一",
  platformName: "番茄小说",
  category: "review",
  blockerType: null,
  label: "待审稿",
  chapterTitle: "第一章",
  evidence: "已有正文但未审稿。",
  actionLabel: "审稿",
  href: "/projects/project-1/chapters/chapter-1",
  priority: 10,
};

function queueItem(input: Partial<QueueItem>): QueueItem {
  return { ...baseItem, ...input };
}

function batch(input: {
  id: string;
  totalTasks: number;
  succeededTasks: number;
  failedTasks: number;
  quality: number | null;
}): TaskBatchHistoryItem {
  return {
    id: input.id,
    projectId: "project-1",
    projectTitle: "项目一",
    taskType: "chapter_review",
    taskLabel: "批量审稿",
    startedAt: "2026-01-01T00:00:00.000Z",
    finishedAt: "2026-01-01T00:01:00.000Z",
    chapterTitles: ["第一章"],
    taskIds: [input.id],
    href: "/projects/project-1/chapters/chapter-1",
    runningTasks: 0,
    failedSamples: [],
    failedTaskIds: [],
    nextAction: "继续下一小批",
    repairActions: [],
    summary: {
      totalTasks: input.totalTasks,
      succeededTasks: input.succeededTasks,
      failedTasks: input.failedTasks,
      successRatePercent: Math.round((input.succeededTasks / input.totalTasks) * 100),
      totalTokens: input.totalTasks * 1000,
      knownCostUsd: 0,
      averageCostPerSucceededTaskUsd: 0,
      averageQualityScore: input.quality,
      primaryTasks: input.succeededTasks,
      fallbackTasks: 0,
      autoTasks: 0,
      providerLabels: ["Mock · writer"],
      verdict: "样本",
    },
  };
}

test("buildBatchStrategyComparison", async (t) => {
  await t.test("recommends conservative mode when samples are weak", () => {
    const comparison = buildBatchStrategyComparison([
      queueItem({ id: "project-1:review:chapter-1" }),
      queueItem({ id: "project-1:review:chapter-2", chapterTitle: "第二章" }),
    ], [{ aiTasks: [] }], [
      batch({ id: "batch-1", totalTasks: 2, succeededTasks: 1, failedTasks: 1, quality: 72 }),
    ]);

    assert.equal(comparison.recommendedStrategyId, "conservative");
    assert.ok(comparison.headline.includes("保守档"));
    assert.equal(comparison.rows.length, 3);
  });

  await t.test("recommends aggressive mode when recent batches are stable", () => {
    const comparison = buildBatchStrategyComparison([
      queueItem({ id: "project-1:review:chapter-1", projectId: "project-1", projectTitle: "项目一" }),
      queueItem({ id: "project-2:review:chapter-2", projectId: "project-2", projectTitle: "项目二", chapterTitle: "第二章" }),
      queueItem({ id: "project-3:review:chapter-3", projectId: "project-3", projectTitle: "项目三", chapterTitle: "第三章" }),
    ], [{ aiTasks: [] }], [
      batch({ id: "batch-1", totalTasks: 4, succeededTasks: 4, failedTasks: 0, quality: 88 }),
      batch({ id: "batch-2", totalTasks: 4, succeededTasks: 4, failedTasks: 0, quality: 90 }),
    ]);

    assert.equal(comparison.recommendedStrategyId, "aggressive");
    assert.equal(comparison.rows.find((row) => row.strategy.id === "aggressive")?.recommendedBatchSize, 3);
    assert.ok(comparison.rows.every((row) => row.predictedSuccessRatePercent > 0));
  });
});
