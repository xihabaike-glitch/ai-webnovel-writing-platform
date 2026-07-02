import test from "node:test";
import assert from "node:assert/strict";
import { buildPrePublishGate, type PrePublishGateProject } from "../lib/projects/prePublishGate.ts";

const finalChapters = [1, 2, 3].map((order) => ({
  id: `chapter-${order}`,
  order,
  title: `第${order}夜`,
  content: `第${order}夜，林晚被系统逼到绝境，她必须在倒计时结束前完成选择。`,
  wordCount: 2600,
  goal: "让主角完成高压选择。",
  hook: `第${order}夜开局就出现倒计时。`,
  conflict: "主角必须在救人与自保之间选择。",
  valueShift: "主角从被动挨打转为主动反击。",
  cliffhanger: "系统弹出隐藏任务。",
  status: "final",
}));

const passedReviews = finalChapters.map((chapter, index) => ({
  id: `review-${chapter.id}`,
  chapterId: chapter.id,
  taskType: "chapter_review",
  status: "succeeded",
  outputText: JSON.stringify({ score: 92 - index, shouldSecondPass: false }),
  errorMessage: null,
  createdAt: `2026-01-0${index + 1}T00:00:00.000Z`,
  inputTokens: 1000,
  outputTokens: 500,
  costUsd: 0.01,
}));

const readyProject: PrePublishGateProject = {
  id: "project-ready",
  title: "夜雨系统",
  targetPlatform: "fanqie",
  targetWordCount: 300000,
  currentWordCount: 9000,
  genre: "都市系统",
  sellingPoint: "雨夜危机中觉醒系统，主角用一次次选择翻盘。",
  chapters: finalChapters,
  aiTasks: [
    ...passedReviews,
    {
      id: "asset-optimize-1",
      chapterId: null,
      taskType: "platform_submission_asset_optimize",
      status: "succeeded",
      inputSnapshot: JSON.stringify({ platformId: "fanqie" }),
      outputText: JSON.stringify({ variants: [{ strategy: "强钩子爽点版" }, { strategy: "主线悬疑版" }, { strategy: "情绪复仇版" }] }),
      errorMessage: null,
      createdAt: "2026-01-07T07:00:00.000Z",
      inputTokens: 1000,
      outputTokens: 500,
      costUsd: 0.01,
    },
  ],
};

const blockedProject: PrePublishGateProject = {
  ...readyProject,
  id: "project-blocked",
  currentWordCount: 9000,
  chapters: finalChapters.map((chapter) => ({ ...chapter, status: "draft" })),
  aiTasks: [],
};

test("buildPrePublishGate", async (t) => {
  await t.test("allows launch when package, queue, failures, and strategy are clean", () => {
    const gate = buildPrePublishGate({
      projects: [readyProject],
      failureTasks: [],
      batchHistory: [],
    });

    assert.equal(gate.status, "ready");
    assert.equal(gate.label, "可以发布");
    assert.equal(gate.overview.readyPackages, 1);
    assert.equal(gate.overview.runnableTasks, 0);
    assert.ok(gate.score >= 85);
    assert.ok(gate.items.every((item) => item.status === "pass"));
    assert.equal(gate.projectStatuses[0].platformId, "fanqie");
    assert.equal(gate.projectStatuses[0].wordCount, 7800);
    assert.ok(gate.projectStatuses[0].downloadHref?.includes("format=markdown"));
    assert.ok(gate.projectStatuses[0].downloadHref?.includes("platformId=fanqie"));
    assert.ok(gate.priorityActions.some((action) => action.label === "导出平台发布包"));
  });

  await t.test("blocks launch when publish package and failed tasks are unresolved", () => {
    const gate = buildPrePublishGate({
      projects: [blockedProject],
      failureTasks: [
        {
          id: "failed-1",
          projectId: "project-blocked",
          taskType: "chapter_review",
          model: "claude-sonnet",
          status: "failed",
          errorMessage: "401 unauthorized api key",
          createdAt: "2026-01-08T00:00:00.000Z",
          project: { title: "夜雨系统" },
          chapter: { title: "第一章" },
          modelProvider: { providerId: "anthropic", displayName: "Claude" },
        },
        {
          id: "failed-2",
          projectId: "project-blocked",
          taskType: "chapter_review",
          model: "deepseek-chat",
          status: "failed",
          errorMessage: "request timeout",
          createdAt: "2026-01-08T00:01:00.000Z",
          project: { title: "夜雨系统" },
          chapter: { title: "第二章" },
          modelProvider: { providerId: "deepseek", displayName: "DeepSeek" },
        },
      ],
      batchHistory: [],
    });

    assert.equal(gate.status, "blocked");
    assert.equal(gate.label, "暂不发布");
    assert.equal(gate.overview.readyPackages, 0);
    assert.equal(gate.overview.failureTasks, 2);
    assert.ok(gate.items.some((item) => item.id === "publish-package" && item.status === "block"));
    assert.ok(gate.items.some((item) => item.id === "ai-failures" && item.status === "block"));
    assert.ok(gate.priorityActions.some((action) => action.execution?.type === "publish_repair"));
    assert.ok(gate.priorityActions.some((action) => action.execution?.type === "retry_task" && action.execution.taskId === "failed-2"));
    assert.ok(gate.priorityActions.some((action) => action.href === "/failures"));
  });

  await t.test("summarizes publish effect metrics for launch review", () => {
    const gate = buildPrePublishGate({
      projects: [{
        ...readyProject,
        platformPublishMetrics: [
          {
            platformId: "fanqie",
            platformName: "番茄小说",
            views: 1200,
            clicks: 120,
            favorites: 72,
            follows: 36,
            comments: 8,
            paidReads: 3,
            editorFeedback: "标题方向可继续放大。",
            contractStatus: "pending",
            publishUrl: "https://example.com/book",
            notes: "首轮投放",
            snapshotDate: "2026-01-10T00:00:00.000Z",
          },
        ],
      }],
      failureTasks: [],
      batchHistory: [],
    });
    const review = gate.projectStatuses[0].effectReview;

    assert.equal(review.status, "promising");
    assert.equal(review.label, "可放大");
    assert.equal(review.records, 1);
    assert.equal(review.totalViews, 1200);
    assert.equal(review.clickRatePercent, 10);
    assert.equal(review.favoriteRatePercent, 6);
    assert.equal(review.followRatePercent, 3);
    assert.ok(review.verdict.includes("可追"));
    assert.ok(review.optimizationActions.some((action) => action.href === "/projects/project-ready#create-chapter"));
  });
});
