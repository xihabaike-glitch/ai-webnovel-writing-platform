import assert from "node:assert/strict";
import test from "node:test";
import { buildChapterProductionRecheckFollowUpTasks } from "../lib/projects/chapterProductionRecheckFollowUp.ts";

test("buildChapterProductionRecheckFollowUpTasks creates story tree repair dispatches for weak rechecks", () => {
  const dispatches = buildChapterProductionRecheckFollowUpTasks({
    projectTitle: "夜雨系统",
    platformId: "fanqie",
    platformName: "番茄小说",
    sourceDispatchKey: "story-tree:project-1:chapter-1:chapter_draft:opening_ending",
    now: "2026-07-05T00:00:00.000Z",
    storyTreeRecheck: {
      projectId: "project-1",
      chapterId: "chapter-1",
      previousScore: 82,
      currentScore: 76,
      delta: -6,
      label: "结构变弱",
      verdict: "declined",
      topAction: "重写章末选择代价。",
      axisSummary: ["开头结尾 70 分/fail", "主干 78 分/watch"],
    },
  });

  assert.equal(dispatches.length, 1);
  assert.equal(dispatches[0].id, "story-tree-followup:project-1:chapter-1:story-tree-project-1-chapter-1-chapter_draft-opening_ending:76");
  assert.equal(dispatches[0].stage, "start_rewrite_opening");
  assert.equal(dispatches[0].href, "/projects/project-1/chapters/chapter-1#chapter-second-pass");
  assert.equal(dispatches[0].actionLabel, "进入二改");
  assert.ok(dispatches[0].detail.includes("重写章末选择代价"));
});

test("buildChapterProductionRecheckFollowUpTasks creates submission repair dispatches for failed evidence loops", () => {
  const dispatches = buildChapterProductionRecheckFollowUpTasks({
    projectTitle: "夜雨系统",
    platformId: "qimao",
    platformName: "七猫",
    sourceDispatchKey: "submission-precheck:project-1:platform-risk",
    now: "2026-07-05T00:00:00.000Z",
    evidenceLoopRecheck: {
      projectId: "project-1",
      platformId: "qimao",
      platformName: "七猫",
      previousScore: 81,
      currentScore: 72,
      delta: -9,
      status: "repair",
      label: "仍需修复",
      verdict: "declined",
      headline: "平台证据变弱",
      nextAction: "补平台适配和投稿包证据。",
      evidence: ["投稿包风险仍在"],
    },
  });

  assert.equal(dispatches.length, 1);
  assert.equal(dispatches[0].id, "submission-recheck-followup:project-1:qimao:submission-precheck-project-1-platform-risk:72");
  assert.equal(dispatches[0].stage, "start_repair_packaging");
  assert.equal(dispatches[0].href, "/projects/project-1#submission-precheck");
  assert.equal(dispatches[0].actionLabel, "修投稿包");
  assert.ok(dispatches[0].evidence.includes("补平台适配和投稿包证据。"));
});

test("buildChapterProductionRecheckFollowUpTasks skips passed rechecks", () => {
  const dispatches = buildChapterProductionRecheckFollowUpTasks({
    projectTitle: "夜雨系统",
    platformId: "fanqie",
    platformName: "番茄小说",
    sourceDispatchKey: "story-tree:project-1:chapter-1:chapter_draft:opening_ending",
    storyTreeRecheck: {
      projectId: "project-1",
      chapterId: "chapter-1",
      previousScore: 76,
      currentScore: 88,
      delta: 12,
      label: "结构可用",
      verdict: "improved",
      topAction: "继续维持。",
      axisSummary: ["主干 88 分/pass"],
    },
  });

  assert.equal(dispatches.length, 0);
});

test("buildChapterProductionRecheckFollowUpTasks skips already persisted follow ups", () => {
  const dispatches = buildChapterProductionRecheckFollowUpTasks({
    projectTitle: "夜雨系统",
    platformId: "fanqie",
    platformName: "番茄小说",
    sourceDispatchKey: "story-tree:project-1:chapter-1:chapter_draft:opening_ending",
    existingDispatchKeys: ["story-tree-followup:project-1:chapter-1:story-tree-project-1-chapter-1-chapter_draft-opening_ending:74"],
    storyTreeRecheck: {
      projectId: "project-1",
      chapterId: "chapter-1",
      previousScore: 76,
      currentScore: 74,
      delta: -2,
      label: "结构未动",
      verdict: "unchanged",
      topAction: "继续重写主干压力。",
      axisSummary: ["主干 74 分/watch"],
    },
  });

  assert.equal(dispatches.length, 0);
});
