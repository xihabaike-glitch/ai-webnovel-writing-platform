import test from "node:test";
import assert from "node:assert/strict";
import {
  applyRecommendedBatchModelRouteGate,
  buildRecommendedBatchModelRouteGate,
  type RecommendedBatchModelRouteGateProject,
} from "../lib/projects/recommendedBatchModelRouteGate.ts";
import type { TaskQueueExecutionPlan } from "../lib/projects/taskQueueExecutionPlan.ts";

function plan(overrides: Partial<TaskQueueExecutionPlan> = {}): TaskQueueExecutionPlan {
  return {
    canRun: true,
    category: "review",
    projectId: "project-1",
    projectIds: ["project-1"],
    projectTitle: "夜雨系统",
    itemIds: ["item-1", "item-2", "item-3"],
    chapterIds: ["chapter-1", "chapter-2", "chapter-3"],
    strategyBases: [],
    scaleGate: "none",
    actionLabel: "批量审稿 3 个",
    detail: "夜雨系统 · 待审稿 · 第一章、第二章、第三章",
    warnings: [],
    ...overrides,
  };
}

function project(overrides: Partial<RecommendedBatchModelRouteGateProject> = {}): RecommendedBatchModelRouteGateProject {
  return {
    id: "project-1",
    title: "夜雨系统",
    aiMonthlyBudgetUsd: 5,
    aiMaxTaskCostUsd: 0.25,
    aiMaxBatchCostUsd: 1,
    aiMaxFailureRatePercent: 20,
    aiBudgetEnforcement: "block",
    aiTasks: [],
    ...overrides,
  };
}

const providers = [
  {
    id: "gpt-provider",
    providerId: "gpt",
    displayName: "GPT",
    defaultModel: "gpt-4.1",
    enabled: true,
    encryptedApiKey: "encrypted",
  },
  {
    id: "deepseek-provider",
    providerId: "deepseek",
    displayName: "DeepSeek",
    defaultModel: "deepseek-chat",
    enabled: true,
    encryptedApiKey: "encrypted",
  },
];

test("recommended batch model route gate", async (t) => {
  await t.test("blocks a batch when the matching model route has avoid evidence", () => {
    const gate = buildRecommendedBatchModelRouteGate({
      plan: plan(),
      providers,
      routes: [
        { taskType: "chapter_review", primaryProviderConfigId: "gpt-provider", fallbackProviderConfigId: "deepseek-provider" },
      ],
      projects: [
        project({
          aiTasks: [
            {
              id: "review-1",
              projectId: "project-1",
              chapterId: "chapter-1",
              taskType: "chapter_review",
              providerConfigId: "gpt-provider",
              model: "gpt-4.1",
              status: "failed",
              inputSnapshot: "{}",
              inputTokens: 800,
              outputTokens: 0,
              costUsd: 0.02,
              outputText: null,
              errorMessage: "timeout",
              createdAt: "2026-01-01T00:00:00.000Z",
              modelProvider: { providerId: "gpt", displayName: "GPT" },
            },
            {
              id: "review-2",
              projectId: "project-1",
              chapterId: "chapter-2",
              taskType: "chapter_review",
              providerConfigId: "gpt-provider",
              model: "gpt-4.1",
              status: "failed",
              inputSnapshot: "{}",
              inputTokens: 820,
              outputTokens: 0,
              costUsd: 0.02,
              outputText: null,
              errorMessage: "timeout",
              createdAt: "2026-01-02T00:00:00.000Z",
              modelProvider: { providerId: "gpt", displayName: "GPT" },
            },
          ],
        }),
      ],
    });
    const guardedPlan = applyRecommendedBatchModelRouteGate(plan(), gate);

    assert.equal(gate.status, "block");
    assert.equal(gate.maxBatchSize, 0);
    assert.equal(gate.recheckAdvice?.taskType, "chapter_review");
    assert.equal(gate.recheckAdvice?.severity, "blocked");
    assert.equal(gate.recheckAdvice?.action, "switch_route");
    assert.ok(gate.recheckAdvice?.recommendation.includes("推荐批次"));
    assert.ok(gate.avoidedRoutes.some((route) => route.includes("章节审稿")));
    assert.equal(guardedPlan.canRun, false);
    assert.equal(guardedPlan.chapterIds.length, 0);
  });

  await t.test("downgrades an unsampled route to a single chapter", () => {
    const gate = buildRecommendedBatchModelRouteGate({
      plan: plan(),
      providers,
      routes: [],
      projects: [project()],
    });
    const guardedPlan = applyRecommendedBatchModelRouteGate(plan(), gate);

    assert.equal(gate.status, "sample");
    assert.equal(gate.maxBatchSize, 1);
    assert.equal(gate.recheckAdvice?.taskType, "chapter_review");
    assert.equal(gate.recheckAdvice?.severity, "warning");
    assert.equal(gate.recheckAdvice?.action, "extend_watch");
    assert.equal(guardedPlan.canRun, true);
    assert.deepEqual(guardedPlan.chapterIds, ["chapter-1"]);
    assert.ok(guardedPlan.warnings.some((warning) => warning.includes("降级")));
  });
});
