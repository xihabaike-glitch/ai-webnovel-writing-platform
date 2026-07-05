import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGatePlatformDecisionTimeline,
  buildGatePlatformTacticExperienceLibrary,
  buildGatePlatformTacticExperienceMarkdown,
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
});
