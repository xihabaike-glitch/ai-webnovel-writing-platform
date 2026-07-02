import test from "node:test";
import assert from "node:assert/strict";
import { buildModelBudgetGuard, normalizeModelBudgetSettings } from "../lib/ai/modelBudget.ts";

test("model budget guard", async (t) => {
  await t.test("normalizes project budget defaults", () => {
    const settings = normalizeModelBudgetSettings({});

    assert.equal(settings.aiMonthlyBudgetUsd, 5);
    assert.equal(settings.aiMaxTaskCostUsd, 0.25);
    assert.equal(settings.aiMaxBatchCostUsd, 1);
    assert.equal(settings.aiMaxFailureRatePercent, 20);
    assert.equal(settings.aiBudgetEnforcement, "block");
  });

  await t.test("blocks a batch that would exceed the monthly budget", () => {
    const guard = buildModelBudgetGuard({
      settings: {
        aiMonthlyBudgetUsd: 0.1,
        aiMaxTaskCostUsd: 0.1,
        aiMaxBatchCostUsd: 0.2,
        aiMaxFailureRatePercent: 50,
        aiBudgetEnforcement: "block",
      },
      taskType: "chapter_draft",
      batchSize: 2,
      tasks: [
        { taskType: "chapter_draft", status: "succeeded", costUsd: 0.06 },
        { taskType: "chapter_draft", status: "succeeded", costUsd: 0.06 },
      ],
    });

    assert.equal(guard.allowed, false);
    assert.equal(guard.status, "block");
    assert.ok(guard.blockers.some((blocker) => blocker.includes("月预算")));
    const batchAction = guard.repairActions.find((action) => action.id === "reduce_batch_size");
    const budgetAction = guard.repairActions.find((action) => action.id === "raise_budget_or_warn");
    const wordsAction = guard.repairActions.find((action) => action.id === "lower_target_words");
    assert.equal(batchAction?.kind, "set_batch_size");
    assert.equal(batchAction?.recommendedBatchSize, 1);
    assert.equal(budgetAction?.kind, "open_budget_settings");
    assert.equal(budgetAction?.href, "#model-task-audit");
    assert.equal(wordsAction?.kind, "lower_target_words");
    assert.equal(wordsAction?.targetWordsMultiplier, 0.7);
  });

  await t.test("warn mode reports blockers without stopping execution", () => {
    const guard = buildModelBudgetGuard({
      settings: {
        aiMonthlyBudgetUsd: 0.05,
        aiMaxTaskCostUsd: 0.01,
        aiMaxBatchCostUsd: 0.02,
        aiMaxFailureRatePercent: 20,
        aiBudgetEnforcement: "warn",
      },
      taskType: "chapter_review",
      tasks: [
        { taskType: "chapter_review", status: "succeeded", costUsd: 0.03 },
      ],
    });

    assert.equal(guard.allowed, true);
    assert.equal(guard.status, "warn");
    assert.ok(guard.blockers.length > 0);
    assert.ok(guard.repairActions.some((action) => action.id === "raise_budget_or_warn" && action.kind === "open_budget_settings"));
  });

  await t.test("blocks when recent failure rate is above the project limit", () => {
    const guard = buildModelBudgetGuard({
      settings: {
        aiMonthlyBudgetUsd: 5,
        aiMaxTaskCostUsd: 1,
        aiMaxBatchCostUsd: 1,
        aiMaxFailureRatePercent: 30,
        aiBudgetEnforcement: "block",
      },
      taskType: "chapter_second_pass",
      tasks: [
        { taskType: "chapter_second_pass", status: "failed", costUsd: 0 },
        { taskType: "chapter_second_pass", status: "failed", costUsd: 0 },
        { taskType: "chapter_review", status: "succeeded", costUsd: 0.01 },
      ],
    });

    assert.equal(guard.allowed, false);
    assert.equal(guard.failureRatePercent, 67);
    assert.ok(guard.blockers.some((blocker) => blocker.includes("失败率")));
    assert.ok(guard.repairActions.some((action) => action.id === "fix_failure_rate" && action.kind === "inspect_failures"));
  });
});
