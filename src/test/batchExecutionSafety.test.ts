import test from "node:test";
import assert from "node:assert/strict";
import { buildBatchExecutionSafety, buildBatchSafetyPriorityBlocker } from "../lib/projects/batchExecutionSafety.ts";
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
    const blockedGate = safety.items.find((item) => item.id === "blocked-items");
    assert.equal(blockedGate?.status, "warn");
    assert.ok(blockedGate?.detail.includes("不拦本批"));
    assert.equal(blockedGate?.actionLabel, "查看阻塞任务");
    assert.equal(blockedGate?.actionHref, "/tasks");
  });

  await t.test("blocks recommended batches until draft candidates are adopted or dismissed", () => {
    const safety = buildBatchExecutionSafety([
      { ...baseItem, id: "candidate-1", category: "candidate", label: "待采纳", priority: 5, actionLabel: "处理候选稿", href: "/projects/project-1/chapters/chapter-1#chapter-revisions" },
      baseItem,
    ], [{ aiTasks: [] }]);

    assert.equal(safety.recommendedBatchSize, 1);
    assert.deepEqual(safety.recommendedBatchIds, ["item-1"]);
    assert.equal(safety.canRunRecommendedBatch, false);
    const candidateGate = safety.items.find((item) => item.id === "pending-candidates");
    assert.equal(candidateGate?.status, "block");
    assert.ok(candidateGate?.detail.includes("候选稿"));
    assert.equal(candidateGate?.actionLabel, "处理候选稿");
    assert.equal(candidateGate?.actionHref, "/projects/project-1/chapters/chapter-1#chapter-revisions");
  });

  await t.test("blocks recommended batches while AI pipeline recovery follow-ups are open", () => {
    const safety = buildBatchExecutionSafety([
      {
        ...baseItem,
        id: "project-1:tactic-experience-followup:ai-pipeline:watch",
        category: "handoff",
        sourceType: "tactic_experience_followup",
        sourceLabel: "AI 写审改恢复",
        sourceDispatchKey: "ai-pipeline:tactic_experience_followup:watch-ai-recovery:2026-01-01",
        platformName: "AI 写审改",
        label: "AI 写审改恢复",
        chapterTitle: "恢复观察小样本复验",
        evidence: "AI 写审改恢复依据还在观察期，只准继续 1 章小样本复验，不回推荐批量。",
        actionLabel: "继续小样本",
        href: "/gate#ai-pipeline-recovery",
        priority: 6,
      },
      baseItem,
    ], [{ aiTasks: [] }]);

    assert.equal(safety.recommendedBatchSize, 1);
    assert.deepEqual(safety.recommendedBatchIds, ["item-1"]);
    assert.equal(safety.canRunRecommendedBatch, false);
    const recoveryGate = safety.items.find((item) => item.id === "ai-pipeline-recovery");
    assert.equal(recoveryGate?.status, "block");
    assert.ok(recoveryGate?.detail.includes("AI 写审改恢复"));
    assert.ok(recoveryGate?.detail.includes("不回推荐批量"));
    assert.equal(recoveryGate?.actionLabel, "回恢复闸门");
    assert.equal(recoveryGate?.actionHref, "/gate#ai-pipeline-recovery");
  });

  await t.test("prioritizes the PM blocker that should be handled before running batches", () => {
    const safety = buildBatchExecutionSafety([
      { ...baseItem, id: "candidate-1", category: "candidate", label: "待采纳", priority: 5, actionLabel: "处理候选稿" },
      {
        ...baseItem,
        id: "project-1:tactic-experience-followup:ai-pipeline:watch",
        category: "handoff",
        sourceType: "tactic_experience_followup",
        sourceLabel: "AI 写审改恢复",
        sourceDispatchKey: "ai-pipeline:tactic_experience_followup:watch-ai-recovery:2026-01-01",
        platformName: "AI 写审改",
        label: "AI 写审改恢复",
        chapterTitle: "恢复观察小样本复验",
        evidence: "AI 写审改恢复依据还在观察期，只准继续 1 章小样本复验，不回推荐批量。",
        actionLabel: "继续小样本",
        href: "/gate#ai-pipeline-recovery",
        priority: 6,
      },
      baseItem,
    ], [
      {
        aiTasks: [
          { status: "running", inputTokens: null, outputTokens: null, costUsd: null },
          { status: "running", inputTokens: null, outputTokens: null, costUsd: null },
          { status: "queued", inputTokens: null, outputTokens: null, costUsd: null },
          { status: "queued", inputTokens: null, outputTokens: null, costUsd: null },
        ],
      },
    ]);
    const blocker = buildBatchSafetyPriorityBlocker(safety);

    assert.equal(blocker?.id, "ai-pipeline-recovery");
    assert.equal(blocker?.title, "先处理 AI 写审改恢复");
    assert.equal(blocker?.actionLabel, "回恢复闸门");
    assert.equal(blocker?.actionHref, "/gate#ai-pipeline-recovery");
    assert.ok(blocker?.detail.includes("不回推荐批量"));
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
    const runningGate = safety.items.find((item) => item.id === "running-tasks");
    assert.equal(runningGate?.status, "block");
    assert.equal(runningGate?.actionLabel, "看任务运行台");
    assert.equal(runningGate?.actionHref, "/tasks#task-run-console");
  });

  await t.test("links high failure rate blockers to the failure review center", () => {
    const safety = buildBatchExecutionSafety([baseItem], [
      {
        aiTasks: [
          { status: "failed", inputTokens: null, outputTokens: null, costUsd: null },
          { status: "failed", inputTokens: null, outputTokens: null, costUsd: null },
          { status: "failed", inputTokens: null, outputTokens: null, costUsd: null },
          { status: "succeeded", inputTokens: 1000, outputTokens: 1000, costUsd: 0.02 },
        ],
      },
    ]);

    assert.equal(safety.canRunRecommendedBatch, false);
    const failureGate = safety.items.find((item) => item.id === "failure-rate");
    assert.equal(failureGate?.status, "block");
    assert.equal(failureGate?.actionLabel, "去失败复盘");
    assert.equal(failureGate?.actionHref, "/failures");
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
