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
});
