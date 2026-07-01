import test from "node:test";
import assert from "node:assert/strict";
import { getPlatformProfile } from "../lib/platforms/platformProfiles.ts";
import { buildSerializationOpsDashboard } from "../lib/projects/serializationOps.ts";

const platform = getPlatformProfile("fanqie");
const project = {
  title: "夜雨系统",
  currentWordCount: 2400,
  targetWordCount: 300000,
  updateCadence: "daily_4000",
};
const chapter = {
  id: "chapter-1",
  order: 1,
  title: "第一章 雨夜系统",
  status: "draft",
  wordCount: 1200,
  hook: "系统倒计时出现。",
  cliffhanger: "第二个任务弹出。",
  updatedAt: "2026-01-01T00:00:00.000Z",
};
const checklist = {
  readinessPercent: 60,
  passCount: 6,
  todoCount: 3,
  riskCount: 1,
  items: [
    { id: "word-count", label: "投稿字数", status: "todo" as const, detail: "字数不足。" },
    { id: "platform-risk", label: "平台风险", status: "risk" as const, detail: "流量波动。" },
  ],
};

test("buildSerializationOpsDashboard", async (t) => {
  await t.test("prioritizes review for drafted unreviewed chapters", () => {
    const dashboard = buildSerializationOpsDashboard({
      project,
      platform,
      chapters: [chapter],
      aiTasks: [],
      submissionChecklist: checklist,
    });

    assert.equal(dashboard.dailyWordTarget, 4000);
    assert.equal(dashboard.reviewQueueCount, 1);
    assert.equal(dashboard.revisionQueueCount, 0);
    assert.equal(dashboard.publishReadyCount, 0);
    assert.equal(dashboard.actions[0].id, "review-next");
    assert.ok(dashboard.warnings.some((warning) => warning.includes("未审稿")));
  });

  await t.test("prioritizes second pass after a weak review", () => {
    const dashboard = buildSerializationOpsDashboard({
      project,
      platform,
      chapters: [chapter],
      aiTasks: [
        {
          id: "review-1",
          chapterId: "chapter-1",
          taskType: "chapter_review",
          status: "succeeded",
          outputText: JSON.stringify({ score: 72, issues: [{ type: "hook" }] }),
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      submissionChecklist: checklist,
    });

    assert.equal(dashboard.reviewQueueCount, 0);
    assert.equal(dashboard.revisionQueueCount, 1);
    assert.equal(dashboard.actions[0].id, "revise-next");
  });

  await t.test("counts reviewed and second-passed chapters as publish ready", () => {
    const dashboard = buildSerializationOpsDashboard({
      project,
      platform,
      chapters: [chapter],
      aiTasks: [
        {
          id: "review-1",
          chapterId: "chapter-1",
          taskType: "chapter_review",
          status: "succeeded",
          outputText: JSON.stringify({ score: 88, issues: [] }),
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "second-1",
          chapterId: "chapter-1",
          taskType: "chapter_second_pass",
          status: "succeeded",
          outputText: "二改正文",
          createdAt: "2026-01-02T00:00:00.000Z",
        },
      ],
      submissionChecklist: { ...checklist, readinessPercent: 90, items: [] },
    });

    assert.equal(dashboard.publishReadyCount, 1);
    assert.equal(dashboard.nextPublishChapter?.id, "chapter-1");
    assert.equal(dashboard.actions.some((action) => action.id === "publish-next"), true);
  });

  await t.test("requires second-pass recheck before publish readiness", () => {
    const failedRecheck = buildSerializationOpsDashboard({
      project,
      platform,
      chapters: [chapter],
      aiTasks: [
        {
          id: "second-1",
          chapterId: "chapter-1",
          taskType: "chapter_second_pass",
          status: "succeeded",
          outputText: "二改正文",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "recheck-1",
          chapterId: "chapter-1",
          taskType: "chapter_review",
          status: "succeeded",
          outputText: JSON.stringify({ score: 80, shouldSecondPass: true, issues: [{ type: "payoff" }] }),
          createdAt: "2026-01-02T00:00:00.000Z",
        },
      ],
      submissionChecklist: { ...checklist, readinessPercent: 90, items: [] },
    });

    assert.equal(failedRecheck.publishReadyCount, 0);
    assert.equal(failedRecheck.revisionQueueCount, 1);
    assert.equal(failedRecheck.actions[0].id, "revise-next");

    const passedRecheck = buildSerializationOpsDashboard({
      project,
      platform,
      chapters: [chapter],
      aiTasks: [
        {
          id: "second-1",
          chapterId: "chapter-1",
          taskType: "chapter_second_pass",
          status: "succeeded",
          outputText: "二改正文",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "recheck-1",
          chapterId: "chapter-1",
          taskType: "chapter_review",
          status: "succeeded",
          outputText: JSON.stringify({ score: 90, shouldSecondPass: false, issues: [{ type: "length" }] }),
          createdAt: "2026-01-02T00:00:00.000Z",
        },
      ],
      submissionChecklist: { ...checklist, readinessPercent: 90, items: [] },
    });

    assert.equal(passedRecheck.publishReadyCount, 1);
    assert.equal(passedRecheck.revisionQueueCount, 0);
  });
});
