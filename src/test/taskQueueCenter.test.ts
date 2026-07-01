import test from "node:test";
import assert from "node:assert/strict";
import { buildTaskQueueCenter, type TaskQueueProject } from "../lib/projects/taskQueueCenter.ts";

const baseChapter = {
  id: "chapter-ready-draft",
  order: 1,
  title: "第一章 雨夜系统",
  content: "",
  wordCount: 0,
  goal: "让主角遭遇系统。",
  hook: "门外倒计时出现。",
  conflict: "主角必须选择救人或逃跑。",
  valueShift: "日常转为危机。",
  cliffhanger: "系统提示第一次失败。",
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
    assert.equal(queue.overview.exportReady, 1);
    assert.equal(queue.overview.blockedCards, 1);
    assert.equal(queue.overview.totalItems, 5);
    assert.equal(queue.recommendedNext?.category, "review");
    assert.deepEqual(
      queue.items.map((item) => item.category),
      ["review", "second_pass", "draft", "export", "blocked"],
    );
    assert.ok(queue.items.find((item) => item.category === "export")?.href.endsWith("#platform-export"));
  });
});
