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
    assert.equal(dashboard.actions[0].execution?.method, "POST");
    assert.equal(dashboard.actions[0].execution?.endpoint, "/api/ai/tasks/chapter-review");
    assert.equal(dashboard.actions[0].execution?.payload.chapterId, "chapter-1");
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
    assert.equal(dashboard.actions[0].execution?.endpoint, "/api/chapters/chapter-1/second-pass");
    assert.equal(dashboard.actions[0].execution?.payload.mode, "platform_fit");
    assert.equal(dashboard.actions[0].execution?.payload.targetWords, 1200);
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
    const publishAction = dashboard.actions.find((action) => action.id === "publish-next");
    assert.equal(publishAction?.execution?.method, "PATCH");
    assert.equal(publishAction?.execution?.endpoint, "/api/chapters/chapter-1");
    assert.equal(publishAction?.execution?.payload.status, "final");
  });

  await t.test("routes submission gaps to the matching repair workspace", () => {
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
          outputText: JSON.stringify({ score: 90, shouldSecondPass: false, issues: [] }),
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
      submissionChecklist: {
        ...checklist,
        items: [
          { id: "opening-hooks", label: "前三章钩子", status: "todo" as const, detail: "缺少开头钩子。" },
        ],
      },
    });

    const submissionAction = dashboard.actions.find((action) => action.id === "submission-gap");
    assert.equal(submissionAction?.href, "#retention-diagnostic");
    assert.equal(submissionAction?.hrefLabel, "补开头钩子");
    assert.ok(submissionAction?.detail.includes("下一步"));
  });

  await t.test("surfaces publish asset adoption as an ops signal", () => {
    const dashboard = buildSerializationOpsDashboard({
      project,
      platform,
      chapters: [chapter],
      aiTasks: [
        {
          id: "asset-task-1",
          chapterId: null,
          taskType: "platform_submission_asset_optimize",
          status: "succeeded",
          inputSnapshot: JSON.stringify({ platformId: "fanqie" }),
          outputText: JSON.stringify({ variants: [{ strategy: "强钩子版" }, { strategy: "爽点版" }] }),
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      submissionChecklist: { ...checklist, readinessPercent: 90, items: [] },
      submissionAssets: [
        {
          platformId: "fanqie",
          platformName: "番茄小说",
          title: "夜雨系统",
          logline: "雨夜倒计时降临，主角在救人与逃跑之间连续选择，用系统奖励一步步翻盘。",
          synopsis: "林晚在雨夜觉醒系统，每次选择都会让危机升级。他必须在救人、逃跑和揭开规则真相之间做决定，借连续任务翻盘。第一卷围绕系统倒计时、城市危机和隐藏对手展开，让主角用爽点明确的选择一步步逆袭，并把每次奖励都变成新的追读悬念。",
          overseasSynopsis: "Lin Wan awakens a system in the rain and survives escalating choices.",
          tags: ["都市系统", "爽文", "危机"],
          note: "",
          source: "ai_variant",
          updatedAt: "2026-01-02T00:00:00.000Z",
        },
      ],
      submissionAssetVersions: [
        {
          platformId: "fanqie",
          auditScore: 100,
          auditStatus: "ready",
          action: "adopt",
          strategy: "强钩子版",
          createdAt: "2026-01-02T00:00:00.000Z",
        },
      ],
    });

    assert.equal(dashboard.submissionAssetStatus.status, "ready");
    assert.equal(dashboard.submissionAssetStatus.adoptedVersions, 1);
    assert.equal(dashboard.submissionAssetStatus.generatedVariants, 2);
    assert.equal(dashboard.submissionAssetStatus.latestStrategy, "强钩子版");
    assert.ok(dashboard.submissionAssetStatus.verdict.includes("已采纳"));
    assert.equal(dashboard.actions.some((action) => action.id === "submission-asset-gap"), false);
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
