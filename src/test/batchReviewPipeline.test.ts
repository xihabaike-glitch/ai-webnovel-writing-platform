import test from "node:test";
import assert from "node:assert/strict";
import {
  buildReviewPipelineQueue,
  chooseSecondPassMode,
} from "../lib/ai/batchReviewPipeline.ts";

const chapter = {
  id: "chapter-1",
  order: 1,
  title: "第一章 雨夜系统",
  wordCount: 1200,
  status: "draft",
};

test("buildReviewPipelineQueue", async (t) => {
  await t.test("recommends drafted chapters for review", () => {
    const queue = buildReviewPipelineQueue([chapter], []);

    assert.equal(queue.totalCandidates, 1);
    assert.equal(queue.reviewReadyCount, 1);
    assert.equal(queue.secondPassReadyCount, 0);
    assert.deepEqual(queue.recommendedReviewChapterIds, ["chapter-1"]);
    assert.equal(queue.candidates[0].reviewStatus, "ready");
  });

  await t.test("recommends reviewed weak chapters for second pass", () => {
    const queue = buildReviewPipelineQueue([chapter], [
      {
        id: "task-1",
        chapterId: "chapter-1",
        taskType: "chapter_review",
        status: "succeeded",
        outputText: JSON.stringify({
          score: 72,
          issues: [
            {
              severity: "medium",
              type: "hook",
              message: "开头钩子不够快。",
              suggestion: "第一段加入倒计时和不可逆损失。",
            },
          ],
          summary: "需要强化开头。",
        }),
        errorMessage: null,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);

    assert.equal(queue.reviewReadyCount, 0);
    assert.equal(queue.secondPassReadyCount, 1);
    assert.deepEqual(queue.recommendedSecondPassChapterIds, ["chapter-1"]);
    assert.equal(queue.candidates[0].reviewScore, 72);
    assert.equal(queue.candidates[0].issueCount, 1);
    assert.equal(queue.candidates[0].secondPassMode, "more_hook");
    assert.ok(queue.candidates[0].instruction.includes("倒计时"));
  });

  await t.test("blocks empty chapters and running jobs", () => {
    const queue = buildReviewPipelineQueue([
      { ...chapter, id: "empty", wordCount: 0 },
      { ...chapter, id: "running", order: 2 },
    ], [
      {
        id: "task-running",
        chapterId: "running",
        taskType: "chapter_review",
        status: "running",
        outputText: null,
        errorMessage: null,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);

    assert.equal(queue.candidates[0].reviewStatus, "empty");
    assert.equal(queue.candidates[1].reviewStatus, "running");
    assert.equal(queue.reviewReadyCount, 0);
    assert.ok(queue.warnings.some((warning) => warning.includes("空正文")));
  });
});

test("chooseSecondPassMode", () => {
  assert.equal(chooseSecondPassMode({ issues: [{ type: "hook" }] }), "more_hook");
  assert.equal(chooseSecondPassMode({ issues: [{ type: "pacing" }] }), "less_exposition");
  assert.equal(chooseSecondPassMode({ issues: [{ type: "character" }] }), "more_emotion");
});
