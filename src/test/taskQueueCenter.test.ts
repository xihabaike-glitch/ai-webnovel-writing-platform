import test from "node:test";
import assert from "node:assert/strict";
import { buildTaskQueueCenter, type TaskQueueProject } from "../lib/projects/taskQueueCenter.ts";

const baseChapter = {
  id: "chapter-ready-draft",
  order: 1,
  title: "第一章 雨夜系统",
  content: "",
  wordCount: 0,
  goal: "让主角在雨夜被系统逼进不可逆选择。",
  hook: "系统倒计时只剩十秒，门外的人已经开始求救。",
  conflict: "主角必须在逃跑和救人之间选择，否则会失去唯一证据。",
  valueShift: "从普通生活转向失控危机，第一次意识到系统会索命。",
  cliffhanger: "系统刷新第二个任务：亲手交出证据。",
  status: "outline",
};

const project: TaskQueueProject = {
  id: "project-1",
  title: "夜雨系统",
  targetPlatform: "fanqie",
  targetWordCount: 300000,
  currentWordCount: 5000,
  genre: "都市系统",
  sellingPoint: "雨夜危机中觉醒系统，主角用一次次选择翻盘。",
  chapters: [
    baseChapter,
    {
      ...baseChapter,
      id: "chapter-review",
      order: 2,
      title: "第二章 第一次奖励",
      content: "已有正文",
      wordCount: 2200,
      status: "draft",
    },
    {
      ...baseChapter,
      id: "chapter-second-pass",
      order: 3,
      title: "第三章 反杀证据",
      content: "已有正文",
      wordCount: 2400,
      status: "revising",
    },
    {
      ...baseChapter,
      id: "chapter-blocked",
      order: 4,
      title: "第四章 缺卡",
      hook: "",
    },
  ],
  aiTasks: [
    {
      id: "review-weak",
      chapterId: "chapter-second-pass",
      taskType: "chapter_review",
      status: "succeeded",
      outputText: JSON.stringify({ score: 70, issues: [{ type: "hook", suggestion: "强化开头钩子。" }] }),
      errorMessage: null,
      createdAt: "2026-01-02T00:00:00.000Z",
    },
  ],
};

test("buildTaskQueueCenter", async (t) => {
  await t.test("collects cross-project draft, review, second-pass, export, and blocked tasks", () => {
    const queue = buildTaskQueueCenter([project]);

    assert.equal(queue.overview.draftReady, 1);
    assert.equal(queue.overview.reviewReady, 1);
    assert.equal(queue.overview.secondPassReady, 1);
    assert.equal(queue.overview.exportReady, 0);
    assert.equal(queue.overview.blockedCards, 2);
    assert.equal(queue.overview.publishBlocked, 1);
    assert.equal(queue.overview.chapterCardBlocked, 1);
    assert.equal(queue.overview.totalItems, 5);
    assert.equal(queue.recommendedNext?.category, "review");
    assert.deepEqual(
      queue.items.map((item) => item.category),
      ["review", "second_pass", "draft", "blocked", "blocked"],
    );
    const publishBlocker = queue.items.find((item) => item.id.includes(":publish-repair:"));
    const cardBlocker = queue.items.find((item) => item.id.includes(":blocked:"));
    assert.ok(publishBlocker?.href.endsWith("#platform-export"));
    assert.equal(publishBlocker?.blockerType, "publish_repair");
    assert.equal(cardBlocker?.blockerType, "chapter_card");
    assert.ok(publishBlocker?.evidence.includes("先处理"));
  });
});
