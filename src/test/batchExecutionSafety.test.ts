import test from "node:test";
import assert from "node:assert/strict";
import { buildBatchExecutionSafety } from "../lib/projects/batchExecutionSafety.ts";
import { getBatchExecutionStrategy } from "../lib/projects/batchExecutionStrategy.ts";
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
  riskLevel: "standard",
  riskLabel: "标准",
  riskNotice: null,
  scaleGate: "none",
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

    assert.equal(safety.recommendedBatchSize, 3);
    assert.equal(safety.estimatedTokens, 9200);
    assert.equal(safety.estimatedCostUsd, 0.092);
    assert.equal(safety.canRunRecommendedBatch, true);
    assert.ok(safety.warnings.some((warning) => warning.includes("阻塞任务")));
  });

  await t.test("blocks recommended batches until draft candidates are adopted or dismissed", () => {
    const safety = buildBatchExecutionSafety([
      { ...baseItem, id: "candidate-1", category: "candidate", label: "待采纳", priority: 5, actionLabel: "处理候选稿" },
      baseItem,
    ], [{ aiTasks: [] }]);

    assert.equal(safety.recommendedBatchSize, 1);
    assert.deepEqual(safety.recommendedBatchIds, ["item-1"]);
    assert.equal(safety.canRunRecommendedBatch, false);
    const candidateGate = safety.items.find((item) => item.id === "pending-candidates");
    assert.equal(candidateGate?.status, "block");
    assert.ok(candidateGate?.detail.includes("候选稿"));
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

  await t.test("applies conservative and aggressive strategy thresholds", () => {
    const items = Array.from({ length: 6 }, (_, index) => ({
      ...baseItem,
      id: `item-${index + 1}`,
      chapterTitle: `第${index + 1}章`,
      projectId: index % 2 === 0 ? "project-1" : "project-2",
    }));
    const conservative = buildBatchExecutionSafety(items, [{ aiTasks: [] }], getBatchExecutionStrategy("conservative"));
    const aggressive = buildBatchExecutionSafety(items, [{ aiTasks: [] }], getBatchExecutionStrategy("aggressive"));

    assert.equal(conservative.recommendedBatchSize, 3);
    assert.equal(conservative.maxBatchSize, 3);
    assert.equal(conservative.items.find((item) => item.id === "mixed-projects")?.status, "warn");
    assert.equal(aggressive.recommendedBatchSize, 6);
    assert.equal(aggressive.maxBatchSize, 8);
    assert.equal(aggressive.strategy.allowCrossProject, true);
    assert.equal(aggressive.items.find((item) => item.id === "mixed-projects")?.status, "pass");
  });

  await t.test("limits watch drafts to one small sample before scale-up", () => {
    const safety = buildBatchExecutionSafety([
      { ...baseItem, id: "watch-draft-1", category: "draft", label: "待生成", scaleGate: "sample_only", riskLevel: "watch", riskLabel: "恢复观察", actionLabel: "生成小样本" },
      { ...baseItem, id: "watch-draft-2", category: "draft", label: "待生成", scaleGate: "sample_only", riskLevel: "watch", riskLabel: "恢复观察", actionLabel: "生成小样本" },
    ], [{ aiTasks: [] }], getBatchExecutionStrategy("aggressive"));

    assert.deepEqual(safety.recommendedBatchIds, ["watch-draft-1"]);
    assert.equal(safety.recommendedBatchSize, 1);
    assert.equal(safety.canRunRecommendedBatch, true);
    const gate = safety.items.find((item) => item.id === "watch-scale-gate");
    assert.equal(gate?.status, "warn");
    assert.ok(gate?.detail.includes("单章小样本"));
  });
});
