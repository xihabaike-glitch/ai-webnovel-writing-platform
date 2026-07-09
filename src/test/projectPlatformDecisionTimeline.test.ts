import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGatePlatformDecisionTimeline,
  buildGatePlatformTacticExperienceLibrary,
  buildGatePlatformTacticExperienceMarkdown,
  buildGateDispatchCompletionReceipt,
  buildGatePublishEffectReceipt,
  type PersistedGatePlatformDispatchTask,
} from "../lib/projects/gateActionReceipts.ts";

function task(input: Partial<PersistedGatePlatformDispatchTask> = {}): PersistedGatePlatformDispatchTask {
  return {
    id: "submission-decision:fanqie:main",
    databaseId: "dispatch-db-1",
    dispatchKey: "submission-decision:fanqie:main",
    projectId: "project-1",
    sourceReceiptId: null,
    platformId: "fanqie",
    platformName: "番茄小说",
    stage: "record_metrics",
    state: "completed",
    priorityScore: 88,
    ownerRole: "增长运营",
    title: "番茄小说 投稿决策执行",
    detail: "回收首轮投稿效果。",
    dueLabel: "24小时内",
    actionLabel: "回填效果",
    href: "/projects/project-1#publish-effect-panel",
    acceptanceCriteria: ["已记录曝光、点击、收藏、追读。"],
    evidence: ["投放决策：主推"],
    completionEvidence: "曝光 12000，点击 960，收藏 180，追读 72。",
    reviewLatestAt: "2026-01-08T10:00:00.000Z",
    assignedAt: "2026-01-08T10:00:00.000Z",
    completedAt: "2026-01-09T10:00:00.000Z",
    createdAt: "2026-01-08T10:00:00.000Z",
    updatedAt: "2026-01-09T10:00:00.000Z",
    ...input,
  };
}

test("project platform decision timeline", async (t) => {
  await t.test("shows submission dispatch completion and auto-recorded publish effect together", () => {
    const receipt = buildGatePublishEffectReceipt({
      projectId: "project-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      now: "2026-01-09T10:00:01.000Z",
      metric: {
        views: 12000,
        clicks: 960,
        favorites: 180,
        follows: 72,
        snapshotDate: "2026-01-09T00:00:00.000Z",
      },
    });
    const timeline = buildGatePlatformDecisionTimeline({
      receipts: [receipt],
      tasks: [task()],
      limit: 8,
    });
    const fanqie = timeline.items.find((item) => item.platformId === "fanqie");

    assert.ok(fanqie);
    assert.ok(fanqie.events.some((event) => event.type === "effect" && event.detail.includes("曝光 12000")));
    assert.ok(fanqie.events.some((event) => event.type === "dispatch" && event.detail.includes("曝光 12000")));
    assert.ok(["blocked", "needs_effect", "rechecking", "recovering", "healthy"].includes(fanqie.status));
    assert.equal(timeline.summary.total, 1);
  });

  await t.test("turns project decision timeline into reusable tactic experience", () => {
    const receipt = buildGatePublishEffectReceipt({
      projectId: "project-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      now: "2026-01-09T10:00:01.000Z",
      metric: {
        views: 12000,
        clicks: 1200,
        favorites: 360,
        follows: 180,
        snapshotDate: "2026-01-09T00:00:00.000Z",
      },
    });
    const timeline = buildGatePlatformDecisionTimeline({
      receipts: [receipt],
      tasks: [task({
        priorityScore: 96,
        completionEvidence: "曝光 12000，点击 1200，收藏 360，追读 180，进入小步加码。",
      })],
      limit: 8,
    });
    const library = buildGatePlatformTacticExperienceLibrary(timeline, 8);
    const experience = library.items.find((item) => item.platformId === "fanqie");
    const markdown = buildGatePlatformTacticExperienceMarkdown(experience!);

    assert.ok(experience);
    assert.equal(library.summary.total, 1);
    assert.ok(["usable", "watch", "blocked"].includes(experience.status));
    assert.ok(markdown.includes("# 番茄小说 平台打法经验"));
    assert.ok(markdown.includes("## 复用方式"));
  });

  await t.test("keeps dispatch completion receipts as pending effect experience", () => {
    const completedDispatch = task({
      stage: "start_publish_finalize",
      actionLabel: "复检发布包",
      title: "番茄小说 发布包定稿",
      href: "/projects/project-1#platform-export",
      completionEvidence: [
        "番茄小说 发布包定稿",
        "标题：重生后我靠犀利系统爆红",
        "简介：第一章直接给冲突和反转",
        "标签：重生、系统、逆袭",
        "结论：可发布",
      ].join("\n"),
    });
    const receipt = buildGateDispatchCompletionReceipt({
      dispatch: completedDispatch,
      completionEvidence: completedDispatch.completionEvidence,
      now: "2026-01-09T10:00:01.000Z",
    });
    const timeline = buildGatePlatformDecisionTimeline({
      receipts: [receipt],
      limit: 8,
    });
    const library = buildGatePlatformTacticExperienceLibrary(timeline, 8);
    const fanqie = timeline.items.find((item) => item.platformId === "fanqie");
    const experience = library.items.find((item) => item.platformId === "fanqie");

    assert.ok(fanqie?.events.some((event) => event.label === "派单完成回执" && event.detail.includes("已验收")));
    assert.equal(experience?.status, "watch");
    assert.equal(experience?.tactic, "派单验收打法");
    assert.ok(experience?.risk.includes("不证明平台增长有效"));
  });

  await t.test("upgrades dispatch completion into reusable experience after strong publish effect", () => {
    const completedDispatch = task({
      stage: "start_publish_finalize",
      actionLabel: "复检发布包",
      title: "番茄小说 发布包定稿",
      href: "/projects/project-1#platform-export",
      completionEvidence: [
        "番茄小说 发布包定稿",
        "标题：夜雨系统：倒计时重生",
        "简介：第一章直接给冲突和反转",
        "标签：系统、重生、强爽点",
        "结论：可发布",
      ].join("\n"),
      completedAt: "2026-01-09T10:00:00.000Z",
    });
    const completionReceipt = buildGateDispatchCompletionReceipt({
      dispatch: completedDispatch,
      completionEvidence: completedDispatch.completionEvidence,
      now: "2026-01-09T10:00:01.000Z",
    });
    const effectReceipt = buildGatePublishEffectReceipt({
      projectId: "project-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      now: "2026-01-10T10:00:01.000Z",
      metric: {
        views: 1200,
        clicks: 180,
        favorites: 72,
        follows: 36,
        snapshotDate: "2026-01-10T00:00:00.000Z",
      },
    });
    const timeline = buildGatePlatformDecisionTimeline({
      receipts: [completionReceipt, effectReceipt],
      limit: 8,
    });
    const library = buildGatePlatformTacticExperienceLibrary(timeline, 8);
    const experience = library.items.find((item) => item.platformId === "fanqie");

    assert.equal(experience?.status, "usable");
    assert.equal(experience?.tactic, "验收后真实效果打法");
    assert.ok(experience?.lesson.includes("点击率 15%"));
    assert.ok(experience?.reuseHint.includes("标题卖点"));
    assert.ok(experience?.evidence.some((item) => item.includes("效果回填")));
  });
});
