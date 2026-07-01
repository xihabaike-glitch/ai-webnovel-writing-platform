import test from "node:test";
import assert from "node:assert/strict";
import { buildBatchDraftQueue } from "../lib/ai/batchDrafts.ts";
import { getPlatformProfile } from "../lib/platforms/platformProfiles.ts";

const baseChapter = {
  id: "chapter-1",
  order: 1,
  title: "第一章 雨夜系统",
  wordCount: 0,
  goal: "让主角遭遇系统。",
  hook: "雨夜倒计时出现。",
  conflict: "主角必须救人或逃跑。",
  valueShift: "普通生活转向失控危机。",
  cliffhanger: "系统给出第二个任务。",
  status: "outline",
};

test("buildBatchDraftQueue", async (t) => {
  await t.test("recommends ready chapter cards", () => {
    const queue = buildBatchDraftQueue([
      baseChapter,
      { ...baseChapter, id: "chapter-2", order: 2, title: "第二章 第一次奖励" },
    ], []);

    assert.equal(queue.totalCandidates, 2);
    assert.equal(queue.readyCandidates, 2);
    assert.deepEqual(queue.recommendedChapterIds, ["chapter-1", "chapter-2"]);
    assert.equal(queue.candidates[0].status, "ready");
  });

  await t.test("blocks chapters with existing prose or missing card fields", () => {
    const queue = buildBatchDraftQueue([
      { ...baseChapter, wordCount: 1200 },
      { ...baseChapter, id: "chapter-2", order: 2, hook: "" },
    ], []);

    assert.equal(queue.readyCandidates, 0);
    assert.equal(queue.candidates[0].status, "has_draft");
    assert.equal(queue.candidates[1].status, "needs_card");
    assert.deepEqual(queue.candidates[1].missingFields, ["钩子"]);
    assert.ok(queue.warnings.some((warning) => warning.includes("已有正文")));
    assert.ok(queue.warnings.some((warning) => warning.includes("章节卡缺口")));
  });

  await t.test("does not recommend chapters with running draft tasks", () => {
    const queue = buildBatchDraftQueue([baseChapter], [
      { chapterId: "chapter-1", status: "running" },
    ]);

    assert.equal(queue.readyCandidates, 0);
    assert.equal(queue.candidates[0].status, "running");
  });

  await t.test("filters out complete but weak platform-style cards", () => {
    const queue = buildBatchDraftQueue([
      {
        ...baseChapter,
        hook: "主角醒来。",
        conflict: "聊聊天。",
        valueShift: "从早上到晚上。",
        cliffhanger: "明天再说。",
      },
      {
        ...baseChapter,
        id: "chapter-2",
        order: 2,
        hook: "系统倒计时只剩十秒，门外的人已经开始求救。",
        conflict: "主角必须在逃跑和救人之间选择，否则会失去唯一证据。",
        valueShift: "从普通生活转向失控危机，第一次意识到系统会索命。",
        cliffhanger: "系统刷新第二个任务：亲手交出证据。",
      },
    ], [], getPlatformProfile("fanqie"));

    assert.equal(queue.readyCandidates, 1);
    assert.deepEqual(queue.recommendedChapterIds, ["chapter-2"]);
    assert.equal(queue.candidates[0].status, "weak_style");
    assert.ok((queue.candidates[0].styleScore ?? 100) < 70);
    assert.ok(queue.candidates[0].priorityFixes.length > 0);
    assert.ok(queue.warnings.some((warning) => warning.includes("平台风格体检")));
  });
});
