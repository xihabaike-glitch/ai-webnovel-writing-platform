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

test("buildChapterProductionRecheckDecision keeps weak structure diagnostics actionable", () => {
  const decision = buildChapterProductionRecheckDecision([
    {
      structureDiagnosticRecheck: {
        projectId: "project-1",
        platformId: "fanqie",
        platformName: "番茄小说",
        previousScore: 61,
        currentScore: 68,
        delta: 7,
        label: "结构仍未过线",
        verdict: "improved",
        topAction: "补主角弧光终局和伏笔回收章。",
        weakItems: [
          {
            id: "character-arc",
            label: "人物弧光",
            status: "warn",
            evidence: "完整弧光仍不足。",
            suggestion: "补主角欲望、缺陷和终点变化。",
          },
        ],
      },
    },
  ], { href: "#story-structure", label: "复查结构" });

  assert.equal(decision.status, "needs_action");
  assert.equal(decision.label, "继续处理");
  assert.equal(decision.href, "#story-structure");
  assert.ok(decision.detail.includes("整书结构 61 -> 68 分"));
  assert.ok(decision.detail.includes("补主角弧光终局和伏笔回收章"));
});

test("buildChapterProductionRecheckDecision sends cleared structure diagnostics to submission packaging", () => {
  const decision = buildChapterProductionRecheckDecision([
    {
      structureDiagnosticRecheck: {
        projectId: "project-1",
        platformId: "fanqie",
        platformName: "番茄小说",
        previousScore: 78,
        currentScore: 86,
        delta: 8,
        label: "结构已过线",
        verdict: "improved",
        topAction: "保留现有大树结构，继续投稿包包装。",
        weakItems: [],
      },
    },
  ], { href: "#story-structure", label: "复查结构" });

  assert.equal(decision.status, "cleared");
  assert.equal(decision.title, "复查通过：篇幅结构验收已解除");
  assert.equal(decision.href, "#submission-package");
  assert.equal(decision.label, "生成多平台包");
  assert.ok(decision.detail.includes("篇幅结构验收已解除"));
  assert.ok(decision.detail.includes("多平台投稿版本"));
  assert.ok(decision.detail.includes("8 个核心平台"));
  assert.ok(decision.detail.includes("起点中文网"));
  assert.ok(decision.detail.includes("番茄小说"));
  assert.ok(decision.detail.includes("七猫"));
  assert.ok(decision.detail.includes("知乎盐选"));
  assert.ok(decision.detail.includes("WebNovel"));
  assert.ok(decision.detail.includes("Royal Road"));
  assert.ok(decision.detail.includes("Wattpad"));
  assert.ok(decision.detail.includes("平台导出"));
  assert.ok(decision.detail.includes("整书结构 78 -> 86 分"));
});

test("buildChapterProductionRecheckDecision asks for manual confirmation without scored evidence", () => {
  const decision = buildChapterProductionRecheckDecision([{}, {}], fallback);

  assert.equal(decision.status, "watch");
  assert.equal(decision.title, "复查完成：已刷新 2 条派单证据");
  assert.equal(decision.label, "复查预检");
  assert.ok(decision.detail.includes("没有拿到新的结构或平台证据分数"));
});
