import test from "node:test";
import assert from "node:assert/strict";
import { buildBatchExecutionSafety } from "../lib/projects/batchExecutionSafety.ts";
import type { QueueItem } from "../lib/projects/taskQueueCenter.ts";

const baseItem: QueueItem = {
  id: "item-1",
  projectId: "project-1",
  projectTitle: "夜雨系统",
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

test("buildBatchExecutionSafety", async (t) => {
  await t.test("builds a safe recommended batch with historical cost estimate", () => {
    const safety = buildBatchExecutionSafety([
      baseItem,
      { ...baseItem, id: "item-2", category: "second_pass", label: "待二改", priority: 20 },
      { ...baseItem, id: "item-3", category: "draft", label: "待生成", priority: 30 },
      { ...baseItem, id: "item-4", category: "export", label: "待导出", priority: 40 },
      { ...baseItem, id: "item-5", category: "blocked", label: "卡住", priority: 90 },
    ], [
      {
        aiTasks: [
          { status: "succeeded", inputTokens: 1000, outputTokens: 1000, costUsd: 0.02 },
        ],
      },
    ]);

    assert.equal(safety.recommendedBatchSize, 4);
    assert.equal(safety.estimatedTokens, 9200);
    assert.equal(safety.estimatedCostUsd, 0.092);
    assert.equal(safety.canRunRecommendedBatch, true);
    assert.ok(safety.warnings.some((warning) => warning.includes("阻塞任务")));
  });

  await t.test("blocks execution when too many tasks are already running", () => {
    const safety = buildBatchExecutionSafety([baseItem], [
      {
        aiTasks: [
          { status: "running", inputTokens: null, outputTokens: null, costUsd: null },
          { status: "running", inputTokens: null, outputTokens: null, costUsd: null },
          { status: "queued", inputTokens: null, outputTokens: null, costUsd: null },
          { status: "queued", inputTokens: null, outputTokens: null, costUsd: null },
        ],
      },
    ]);

    assert.equal(safety.canRunRecommendedBatch, false);
    assert.equal(safety.items.find((item) => item.id === "running-tasks")?.status, "block");
  });
});
