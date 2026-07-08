import test from "node:test";
import assert from "node:assert/strict";
import { buildTaskRetryPlan, parseSecondPassRetryPayload } from "../lib/ai/taskRetry.ts";

test("task retry helpers", async (t) => {
  await t.test("allows direct retry for failed chapter draft and review tasks", () => {
    const plan = buildTaskRetryPlan({
      chapterId: "chapter-1",
      taskType: "chapter_review",
      status: "failed",
      inputSnapshot: "{}",
    });

    assert.equal(plan.supported, true);
    assert.equal(plan.actionLabel, "一键重试");
  });

  await t.test("restores second-pass instruction, mode, and target words", () => {
    const payload = parseSecondPassRetryPayload(JSON.stringify({
      instruction: "强化开头钩子。",
      mode: "more_hook",
      prompt: { targetWords: 1800 },
    }));

    assert.equal(payload?.instruction, "强化开头钩子。");
    assert.equal(payload?.mode, "more_hook");
    assert.equal(payload?.targetWords, 1800);
  });

  await t.test("restores second-pass retry payload from routed model snapshots", () => {
    const payload = parseSecondPassRetryPayload(JSON.stringify({
      input: {
        instruction: "压缩解释，补一个章末钩子。",
        mode: "less_exposition",
        prompt: { targetWords: 1600 },
      },
      routeAttempt: {
        role: "fallback",
        providerId: "mock",
      },
    }));

    assert.equal(payload?.instruction, "压缩解释，补一个章末钩子。");
    assert.equal(payload?.mode, "less_exposition");
    assert.equal(payload?.targetWords, 1600);
  });

  await t.test("blocks unsupported or incomplete retry tasks", () => {
    assert.equal(buildTaskRetryPlan({
      chapterId: "chapter-1",
      taskType: "submission_package_optimize",
      status: "failed",
      inputSnapshot: "{}",
    }).supported, false);

    assert.equal(buildTaskRetryPlan({
      chapterId: "chapter-1",
      taskType: "chapter_second_pass",
      status: "failed",
      inputSnapshot: "{}",
    }).supported, false);
  });

  await t.test("allows archive experience repair reruns for missing archive writing tasks", () => {
    const plan = buildTaskRetryPlan({
      chapterId: "chapter-1",
      taskType: "chapter_review",
      status: "succeeded",
      inputSnapshot: JSON.stringify({ prompt: { userPrompt: "普通审稿提示词" } }),
    }, { purpose: "archive_experience_repair" });

    assert.equal(plan.supported, true);
    assert.equal(plan.actionLabel, "一键补经验重跑");
    assert.ok(plan.reason.includes("最终交付归档强制执行"));
  });

  await t.test("does not archive-rerun tasks that already include archive experience", () => {
    const plan = buildTaskRetryPlan({
      chapterId: "chapter-1",
      taskType: "chapter_review",
      status: "succeeded",
      inputSnapshot: JSON.stringify({
        prompt: {
          userPrompt: [
            "最终交付归档强制执行：",
            "- 不允许忽略开书经验；这条经验来自上一轮交付归档。",
            "- 必须执行：审稿核对复制动作。",
          ].join("\n"),
        },
      }),
    }, { purpose: "archive_experience_repair" });

    assert.equal(plan.supported, false);
    assert.ok(plan.reason.includes("已经带归档经验"));
  });
});
