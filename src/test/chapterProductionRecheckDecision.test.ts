import assert from "node:assert/strict";
import test from "node:test";
import { buildChapterProductionRecheckDecision } from "../lib/projects/chapterProductionRecheckDecision.ts";

const fallback = {
  href: "#submission-precheck",
  label: "复查预检",
};

test("buildChapterProductionRecheckDecision clears improved rechecks", () => {
  const decision = buildChapterProductionRecheckDecision([
    {
      storyTreeRecheck: {
        projectId: "project-1",
        chapterId: "chapter-1",
        previousScore: 72,
        currentScore: 86,
        delta: 14,
        label: "结构可用",
        verdict: "improved",
        topAction: "继续沿用当前主干压力。",
        axisSummary: ["主干 86 分/ready"],
      },
    },
    {
      evidenceLoopRecheck: {
        projectId: "project-1",
        platformId: "fanqie",
        platformName: "番茄小说",
        previousScore: 68,
        currentScore: 83,
        delta: 15,
        status: "scale",
        label: "证据可放大",
        verdict: "improved",
        headline: "可以放大",
        nextAction: "进入发布包复核。",
        evidence: ["证据闭环 83 分"],
      },
    },
  ], fallback);

  assert.equal(decision.status, "cleared");
  assert.equal(decision.title, "复查通过：当前卡点可以放行");
  assert.equal(decision.href, "#submission-precheck");
  assert.equal(decision.label, "复查预检");
  assert.ok(decision.detail.includes("大树结构 72 -> 86 分"));
  assert.ok(decision.detail.includes("平台证据 68 -> 83 分"));
});

test("buildChapterProductionRecheckDecision keeps weak rechecks actionable", () => {
  const decision = buildChapterProductionRecheckDecision([
    {
      storyTreeRecheck: {
        projectId: "project-1",
        chapterId: "chapter-1",
        previousScore: 82,
        currentScore: 81,
        delta: -1,
        label: "结构未真正移动",
        verdict: "unchanged",
        topAction: "重补章末选择代价。",
        axisSummary: ["章末 70 分/risk"],
      },
    },
    {
      evidenceLoopRecheck: {
        projectId: "project-1",
        platformId: "qimao",
        platformName: "七猫",
        previousScore: 76,
        currentScore: 74,
        delta: -2,
        status: "repair",
        label: "仍需修复",
        verdict: "declined",
        headline: "证据变弱",
        nextAction: "重新补平台适配证据。",
        evidence: ["证据闭环 74 分"],
      },
    },
  ], fallback);

  assert.equal(decision.status, "needs_action");
  assert.equal(decision.title, "复查未解除：需要继续修复或重新派单");
  assert.equal(decision.label, "继续处理");
  assert.ok(decision.detail.includes("重补章末选择代价"));
  assert.ok(decision.detail.includes("重新补平台适配证据"));
});

test("buildChapterProductionRecheckDecision asks for manual confirmation without scored evidence", () => {
  const decision = buildChapterProductionRecheckDecision([{}, {}], fallback);

  assert.equal(decision.status, "watch");
  assert.equal(decision.title, "复查完成：已刷新 2 条派单证据");
  assert.equal(decision.label, "复查预检");
  assert.ok(decision.detail.includes("没有拿到新的结构或平台证据分数"));
});
