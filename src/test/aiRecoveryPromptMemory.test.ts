import test from "node:test";
import assert from "node:assert/strict";
import { buildAiRecoveryPromptMemory } from "../lib/ai/aiRecoveryPromptMemory.ts";
import type { PersistedGatePlatformDispatchTask } from "../lib/projects/gateActionReceipts.ts";

function aiRecoveryTask(input: {
  completionEvidence: string;
  completedAt?: string;
}): PersistedGatePlatformDispatchTask {
  const completedAt = input.completedAt ?? "2026-01-01T00:00:00.000Z";
  return {
    id: "ai-pipeline-recheck:project-1:receipt-1:sample",
    databaseId: "dispatch-db-1",
    dispatchKey: "ai-pipeline-recheck:project-1:receipt-1:sample",
    projectId: "project-1",
    sourceReceiptId: "receipt-1",
    platformId: "ai-pipeline",
    platformName: "AI 写审改",
    stage: "ai_pipeline_sample_recheck",
    state: "completed",
    priorityScore: 96,
    ownerRole: "写作制片 / 审稿负责人",
    title: "AI 写审改：恢复记忆回滚 1 章复验",
    detail: "章节诊断回滚后的 1 章复验。",
    dueLabel: "今天跑 1 章",
    actionLabel: "运行 1 章复验",
    href: "/projects/project-1/chapters/chapter-2#chapter-workflow",
    acceptanceCriteria: ["只选择这 1 章进入初稿、审稿或二改复验"],
    evidence: ["诊断结论：恢复记忆疑似失效"],
    completionEvidence: input.completionEvidence,
    reviewLatestAt: completedAt,
    assignedAt: "2026-01-01T00:00:00.000Z",
    completedAt,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: completedAt,
  };
}

test("buildAiRecoveryPromptMemory", async (t) => {
  await t.test("uses rollback recheck completion outcome to restore active memory", () => {
    const memory = buildAiRecoveryPromptMemory([
      aiRecoveryTask({
        completionEvidence: [
          "AI 写审改：恢复记忆回滚 1 章复验",
          "修复对象：第 2 章",
          "跌线原因：质量 82，钩子弱",
          "修复动作：重写前三段和章末追读",
          "复验结论：质量 88，ai_recovery 问题消失",
          "下一步：继续恢复小批",
        ].join("\n"),
      }),
    ]);

    assert.equal(memory?.lifecycleStatus, "active");
    assert.equal(memory?.lifecycleLabel, "继续生效");
    assert.ok(memory?.promptBlock.includes("继续恢复小批"));
    assert.ok(memory?.promptBlock.includes("质量 88"));
  });

  await t.test("keeps rollback recheck in sample mode when completion asks for another sample", () => {
    const memory = buildAiRecoveryPromptMemory([
      aiRecoveryTask({
        completionEvidence: [
          "AI 写审改：恢复记忆回滚 1 章复验",
          "修复对象：第 2 章",
          "跌线原因：质量 82，钩子弱",
          "修复动作：重写前三段和章末追读",
          "复验结论：质量 84，仍需补证据",
          "下一步：重新小样本",
        ].join("\n"),
      }),
    ]);

    assert.equal(memory?.lifecycleStatus, "sample_required");
    assert.equal(memory?.lifecycleLabel, "等待小样本");
    assert.ok(memory?.promptBlock.includes("重新小样本"));
  });
});
