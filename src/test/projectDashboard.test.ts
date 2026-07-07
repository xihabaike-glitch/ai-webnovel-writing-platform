import test from "node:test";
import assert from "node:assert/strict";
import { buildProjectDashboard } from "../lib/projects/projectDashboard.ts";
import { getPlatformProfile } from "../lib/platforms/platformProfiles.ts";

test("buildProjectDashboard", async (t) => {
  await t.test("summarizes progress, status counts, next chapter, and unreviewed chapters", () => {
    const dashboard = buildProjectDashboard({
      currentWordCount: 5000,
      targetWordCount: 10000,
      platform: getPlatformProfile("fanqie"),
      chapters: [
        {
          id: "chapter-1",
          title: "第一章",
          order: 1,
          status: "draft",
          wordCount: 3000,
          updatedAt: "2026-07-01T00:00:00.000Z",
        },
        {
          id: "chapter-2",
          title: "第二章",
          order: 2,
          status: "outline",
          wordCount: 2000,
          updatedAt: "2026-07-01T00:00:00.000Z",
        },
      ],
      aiTasks: [
        {
          id: "task-1",
          taskType: "chapter_review",
          status: "succeeded",
          model: "mock-editor",
          createdAt: "2026-07-01T00:00:00.000Z",
          chapter: { id: "chapter-1", title: "第一章" },
          modelProvider: { providerId: "mock", displayName: "Mock" },
        },
      ],
    });

    assert.equal(dashboard.progressPercent, 50);
    assert.equal(dashboard.statusCounts.draft, 1);
    assert.equal(dashboard.statusCounts.outline, 1);
    assert.equal(dashboard.nextChapter?.id, "chapter-1");
    assert.deepEqual(dashboard.unreviewedChapters.map((chapter) => chapter.id), ["chapter-2"]);
    assert.ok(dashboard.platformWarnings.some((warning) => warning.includes("未审稿")));
  });

  await t.test("builds a single-project real sample acceptance sheet", () => {
    const dashboard = buildProjectDashboard({
      projectId: "project-1",
      currentWordCount: 6600,
      targetWordCount: 300000,
      platform: getPlatformProfile("fanqie"),
      chapters: [
        {
          id: "chapter-1",
          title: "第一章",
          order: 1,
          status: "draft",
          wordCount: 2200,
          goal: "让主角遭遇系统。",
          hook: "门外倒计时和陌生求救同时出现。",
          conflict: "主角必须在自保和救人之间选择。",
          valueShift: "普通生活被系统任务击穿。",
          cliffhanger: "系统提示第一次选择失败过。",
          updatedAt: "2026-07-01T00:00:00.000Z",
        },
        {
          id: "chapter-2",
          title: "第二章",
          order: 2,
          status: "draft",
          wordCount: 2200,
          updatedAt: "2026-07-01T00:00:00.000Z",
        },
        {
          id: "chapter-3",
          title: "第三章",
          order: 3,
          status: "draft",
          wordCount: 2200,
          updatedAt: "2026-07-01T00:00:00.000Z",
        },
      ],
      aiTasks: [
        {
          id: "task-1",
          taskType: "chapter_review",
          status: "succeeded",
          model: "mock-editor",
          createdAt: "2026-07-01T00:00:00.000Z",
          chapter: { id: "chapter-1", title: "第一章" },
          modelProvider: { providerId: "mock", displayName: "Mock" },
        },
      ],
      gateDispatchTasks: [],
    });

    assert.equal(dashboard.realSampleAcceptanceSheet.title, "单本作品验收单");
    assert.equal(dashboard.realSampleAcceptanceSheet.steps.length, 6);
    assert.deepEqual(
      dashboard.realSampleAcceptanceSheet.steps.map((step) => step.id),
      ["project_start", "opening_sample", "chapter_review", "second_pass", "dispatch_receipt", "publish_package"],
    );
    assert.equal(dashboard.realSampleAcceptanceSheet.currentStepId, "second_pass");
    assert.ok(dashboard.realSampleAcceptanceSheet.verdict.includes("二改"));
    assert.equal(dashboard.realSampleAcceptanceSheet.actionHref, "#ai-pipeline");
    assert.ok(dashboard.realSampleAcceptanceSheet.steps.find((step) => step.id === "opening_sample")?.evidence.includes("钩子"));
    assert.ok(dashboard.realSampleAcceptanceSheet.steps.find((step) => step.id === "dispatch_receipt")?.stopRule.includes("人工验收"));
  });
});
