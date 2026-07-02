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

  await t.test("carries project start tactics into the review queue", () => {
    const queue = buildReviewPipelineQueue([chapter], [], 5, {
      title: "首轮平台打法：番茄小说",
      label: "模板推荐",
      primaryTactic: "先抓首章钩子，再用前三章连续兑现爽点和情绪回报。",
      openingMove: "第一段给不可逆损失。",
      verificationMove: "跑前三章后复盘追读。",
      risk: "解释过多会掉首秀。",
    });

    assert.equal(queue.startTactic?.label, "模板推荐");
    assert.ok(queue.startTactic?.openingMove.includes("不可逆损失"));
    assert.deepEqual(queue.recommendedReviewChapterIds, ["chapter-1"]);
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

  await t.test("uses automatic draft quality audit as a second-pass signal", () => {
    const queue = buildReviewPipelineQueue([chapter], [
      {
        id: "auto-audit",
        chapterId: "chapter-1",
        taskType: "chapter_review",
        status: "succeeded",
        outputText: JSON.stringify({
          score: 78,
          shouldSecondPass: true,
          issues: [
            {
              severity: "high",
              type: "payoff",
              message: "章末没有形成清晰追读问题。",
              suggestion: "结尾改成系统刷新第二个任务。",
            },
          ],
          summary: "自动平台体检：需要二改。",
        }),
        errorMessage: null,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);

    assert.equal(queue.reviewReadyCount, 0);
    assert.equal(queue.secondPassReadyCount, 1);
    assert.equal(queue.candidates[0].reviewScore, 78);
    assert.equal(queue.candidates[0].secondPassMode, "more_payoff");
    assert.ok(queue.candidates[0].instruction.includes("第二个任务"));
  });

  await t.test("keeps second-pass chapters in queue until automatic recheck passes", () => {
    const failedRecheckQueue = buildReviewPipelineQueue([chapter], [
      {
        id: "second-pass",
        chapterId: "chapter-1",
        taskType: "chapter_second_pass",
        status: "succeeded",
        outputText: "二改正文",
        errorMessage: null,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "auto-recheck",
        chapterId: "chapter-1",
        taskType: "chapter_review",
        status: "succeeded",
        outputText: JSON.stringify({
          score: 80,
          shouldSecondPass: true,
          issues: [{ type: "payoff", suggestion: "章末继续加压。" }],
        }),
        errorMessage: null,
        createdAt: "2026-01-02T00:00:00.000Z",
      },
    ]);

    assert.equal(failedRecheckQueue.secondPassReadyCount, 1);
    assert.equal(failedRecheckQueue.candidates[0].secondPassStatus, "ready");

    const passedRecheckQueue = buildReviewPipelineQueue([chapter], [
      {
        id: "second-pass",
        chapterId: "chapter-1",
        taskType: "chapter_second_pass",
        status: "succeeded",
        outputText: "二改正文",
        errorMessage: null,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "auto-recheck",
        chapterId: "chapter-1",
        taskType: "chapter_review",
        status: "succeeded",
        outputText: JSON.stringify({
          score: 90,
          shouldSecondPass: false,
          issues: [{ type: "length", suggestion: "后续人工精修字数。" }],
        }),
        errorMessage: null,
        createdAt: "2026-01-02T00:00:00.000Z",
      },
    ]);

    assert.equal(passedRecheckQueue.secondPassReadyCount, 0);
    assert.equal(passedRecheckQueue.candidates[0].secondPassStatus, "done");
    assert.equal(passedRecheckQueue.candidates[0].reason, "二改后复检已达标。");
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
