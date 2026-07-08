import test from "node:test";
import assert from "node:assert/strict";
import { buildFailureReviewCenter } from "../lib/ai/failureReviewCenter.ts";

const baseTask = {
  id: "task-1",
  projectId: "project-1",
  chapterId: "chapter-1",
  taskType: "chapter_draft",
  model: "deepseek-chat",
  status: "failed",
  errorMessage: "API key missing",
  createdAt: "2026-01-01T00:00:00.000Z",
  project: { title: "夜雨系统" },
  chapter: { title: "第一章" },
  modelProvider: { providerId: "deepseek", displayName: "DeepSeek" },
};

test("buildFailureReviewCenter", async (t) => {
  await t.test("classifies failures and builds repair actions", () => {
    const center = buildFailureReviewCenter([
      baseTask,
      {
        ...baseTask,
        id: "task-2",
        taskType: "chapter_review",
        errorMessage: "Rate limit exceeded 429",
        createdAt: "2026-01-02T00:00:00.000Z",
      },
      {
        ...baseTask,
        id: "task-3",
        taskType: "chapter_second_pass",
        model: "gpt-4.1",
        errorMessage: "context length too long",
        createdAt: "2026-01-03T00:00:00.000Z",
        modelProvider: { providerId: "openai", displayName: "OpenAI" },
      },
      {
        ...baseTask,
        id: "task-4",
        status: "succeeded",
        errorMessage: null,
      },
    ]);

    assert.equal(center.summary.totalFailures, 3);
    assert.equal(center.summary.retryableFailures, 1);
    assert.equal(center.summary.affectedProjects, 1);
    assert.equal(center.summary.affectedProviders, 2);
    assert.equal(center.categoryGroups[0].count, 1);
    assert.ok(center.categoryGroups.some((group) => group.label === "密钥/权限"));
    assert.ok(center.providerGroups.some((group) => group.label === "DeepSeek · deepseek-chat" && group.count === 2));
    assert.equal(center.recentFailures[0].id, "task-3");
    assert.equal(center.recentFailures.find((item) => item.id === "task-2")?.retryable, true);
    assert.equal(center.recentFailures.find((item) => item.id === "task-1")?.retryable, false);
    assert.ok(center.nextActions[0].includes("密钥/权限"));
  });

  await t.test("handles an empty failure set", () => {
    const center = buildFailureReviewCenter([]);

    assert.equal(center.summary.totalFailures, 0);
    assert.equal(center.summary.mostCommonCategory, "暂无失败");
    assert.equal(center.recentFailures.length, 0);
    assert.ok(center.nextActions[0].includes("暂无失败任务"));
  });

  await t.test("separates recovered failures from unresolved repair pressure", () => {
    const center = buildFailureReviewCenter([
      {
        ...baseTask,
        id: "failed-draft",
        taskType: "chapter_draft",
        errorMessage: "503 provider timeout",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        ...baseTask,
        id: "recovered-draft",
        taskType: "chapter_draft",
        status: "succeeded",
        errorMessage: null,
        createdAt: "2026-01-01T00:04:00.000Z",
      },
      {
        ...baseTask,
        id: "unresolved-review",
        taskType: "chapter_review",
        errorMessage: "Rate limit exceeded 429",
        createdAt: "2026-01-01T00:05:00.000Z",
      },
    ]);

    assert.equal(center.summary.totalFailures, 2);
    assert.equal(center.summary.recoveredFailures, 1);
    assert.equal(center.summary.unresolvedFailures, 1);
    assert.equal(center.summary.retryableFailures, 1);
    assert.equal(center.categoryGroups.length, 1);
    assert.equal(center.categoryGroups[0].label, "限流/配额");
    assert.equal(center.recentFailures.find((item) => item.id === "failed-draft")?.recoveryStatus, "recovered");
    assert.equal(center.recentFailures.find((item) => item.id === "failed-draft")?.recoveredByTaskId, "recovered-draft");
    assert.equal(center.recentFailures.find((item) => item.id === "unresolved-review")?.recoveryStatus, "unresolved");
  });

  await t.test("builds prioritized repair lanes for mixed unresolved failures", () => {
    const center = buildFailureReviewCenter([
      {
        ...baseTask,
        id: "config-failure",
        chapterId: "chapter-config",
        errorMessage: "401 unauthorized api key",
        createdAt: "2026-01-01T00:01:00.000Z",
        chapter: { title: "配置章" },
      },
      {
        ...baseTask,
        id: "context-failure",
        chapterId: "chapter-context",
        errorMessage: "context length too long",
        createdAt: "2026-01-01T00:02:00.000Z",
        chapter: { title: "上下文章" },
      },
      {
        ...baseTask,
        id: "timeout-failure",
        chapterId: "chapter-timeout",
        errorMessage: "503 provider timeout",
        createdAt: "2026-01-01T00:03:00.000Z",
        chapter: { title: "超时章" },
      },
      {
        ...baseTask,
        id: "manual-failure",
        chapterId: null,
        errorMessage: "writer output refused without clear reason",
        createdAt: "2026-01-01T00:04:00.000Z",
        chapter: null,
      },
    ]);

    assert.deepEqual(center.repairLanes.map((lane) => lane.id), ["config", "prompt_context", "retry_sample", "manual_review"]);
    assert.equal(center.pmFocus.tone, "blocked");
    assert.equal(center.pmFocus.resumePolicy, "hold_batch");
    assert.ok(center.pmFocus.headline.includes("先修模型配置"));
    assert.ok(center.pmFocus.detail.includes("修完前不恢复批量"));
    assert.equal(center.pmFocus.actionLabel, "去模型设置");
    assert.equal(center.pmFocus.actionHref, "/settings/models");
    assert.ok(center.pmFocus.proof.includes("P0"));
    assert.equal(center.pmFocus.pipelineActionLabel, "核对项目流水线");
    assert.equal(center.pmFocus.pipelineActionHref, "/projects#pipeline-projects");
    assert.ok(center.pmFocus.pipelineValidationHint.includes("恢复前"));
    assert.ok(center.pmFocus.pipelineValidationHint.includes("恢复样本"));
    assert.ok(center.pmFocus.pipelineValidationHint.includes("失败率"));
    assert.ok(center.pmFocus.pipelineValidationHint.includes("放量条件"));
    assert.equal(center.runbookStep.stepId, "failure_repair");
    assert.ok(center.runbookStep.title.includes("失败修复"));
    assert.ok(center.runbookStep.owner.includes("失败修复"));
    assert.ok(center.runbookStep.sampleAction.includes("失败"));
    assert.ok(center.runbookStep.proofToCapture.includes("恢复观察"));
    assert.ok(center.runbookStep.rollbackIfWeak.includes("小样本观察"));
    assert.ok(center.repairLanes.every((lane) => lane.runbookStep.stepId === "failure_repair"));
    assert.equal(center.repairLanes[0].priorityLabel, "P0");
    assert.equal(center.repairLanes[0].label, "先修模型配置");
    assert.equal(center.repairLanes[0].actionLabel, "去模型设置");
    assert.equal(center.repairLanes[0].href, "/settings/models");
    assert.deepEqual(center.repairLanes[0].sampleTaskIds, ["config-failure"]);
    assert.ok(center.repairLanes[0].evidence.some((line) => line.includes("密钥/权限 1")));
    assert.equal(center.repairLanes[0].receiptAction.id, "failure-repair-batch");
    assert.equal(center.repairLanes[0].receiptAction.label, "记录配置修复");
    assert.match(center.repairLanes[0].receiptAction.message, /模型配置修复/);
    assert.equal(center.repairLanes[0].receiptAction.payload.laneId, "config");
    assert.deepEqual(center.repairLanes[0].receiptAction.payload.sampleTaskIds, ["config-failure"]);
    assert.ok(center.repairLanes[0].receiptTemplate.some((line) => line.includes("失败原因：密钥/权限 1")));
    assert.ok(center.repairLanes[0].receiptTemplate.some((line) => line.includes("修复泳道：P0 · 先修模型配置")));
    assert.ok(center.repairLanes[0].receiptTemplate.some((line) => line.includes("重试样本：config-failure")));
    assert.ok(center.repairLanes[0].receiptTemplate.some((line) => line.includes("恢复观察：修复后只跑 1 个样本")));
    assert.ok(center.repairLanes[0].receiptTemplate.some((line) => line.includes("批量结论：继续暂停批量")));
    assert.ok(center.repairLanes[0].receiptTemplate.some((line) => line.includes("下一步：去模型设置")));
    assert.ok(center.repairLanes[0].receiptTemplate.some((line) => line.includes("停手线：没有重试样本和恢复观察")));

    const promptLane = center.repairLanes.find((lane) => lane.id === "prompt_context");
    assert.equal(promptLane?.priorityLabel, "P1");
    assert.equal(promptLane?.actionLabel, "回章节修上下文");
    assert.equal(promptLane?.href, "/projects/project-1/chapters/chapter-context");
    assert.equal(promptLane?.receiptAction.id, "failure-repair-batch");
    assert.equal(promptLane?.receiptAction.label, "记录上下文修复");
    assert.ok(promptLane?.receiptTemplate.some((line) => line.includes("批量结论：继续暂停批量")));

    const retryLane = center.repairLanes.find((lane) => lane.id === "retry_sample");
    assert.equal(retryLane?.priorityLabel, "P2");
    assert.equal(retryLane?.actionLabel, "单章重试样本");
    assert.equal(retryLane?.href, "/projects/project-1/chapters/chapter-timeout");
    assert.equal(retryLane?.receiptAction.id, "repair-batch-retry:timeout-failure");
    assert.equal(retryLane?.receiptAction.label, "记录样本重试");
    assert.match(retryLane?.receiptAction.message ?? "", /单章重试样本/);
    assert.ok(retryLane?.receiptTemplate.some((line) => line.includes("批量结论：只允许小样本观察")));

    const manualLane = center.repairLanes.find((lane) => lane.id === "manual_review");
    assert.equal(manualLane?.priorityLabel, "P3");
    assert.equal(manualLane?.actionLabel, "人工复盘输入");
    assert.equal(manualLane?.href, "/projects/project-1");
    assert.equal(manualLane?.receiptAction.id, "failure-repair-batch");
    assert.equal(manualLane?.receiptAction.label, "记录人工复盘");
    assert.ok(manualLane?.receiptTemplate.some((line) => line.includes("人工复盘输入")));
  });

  await t.test("allows resume watch only when unresolved failures are clear", () => {
    const center = buildFailureReviewCenter([
      {
        ...baseTask,
        id: "failed-draft",
        taskType: "chapter_draft",
        errorMessage: "503 provider timeout",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        ...baseTask,
        id: "recovered-draft",
        taskType: "chapter_draft",
        status: "succeeded",
        errorMessage: null,
        createdAt: "2026-01-01T00:04:00.000Z",
      },
    ]);

    assert.equal(center.pmFocus.tone, "ready");
    assert.equal(center.pmFocus.resumePolicy, "watch_resume");
    assert.ok(center.pmFocus.headline.includes("未恢复失败已清空"));
    assert.ok(center.pmFocus.detail.includes("单章样本"));
    assert.equal(center.pmFocus.actionHref, "/tasks");
    assert.equal(center.pmFocus.pipelineActionHref, "/projects#pipeline-projects");
    assert.ok(center.pmFocus.pipelineValidationHint.includes("项目流水线"));
  });
});
