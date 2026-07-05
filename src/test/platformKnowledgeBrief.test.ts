import test from "node:test";
import assert from "node:assert/strict";
import { buildPlatformKnowledgeBrief, type PlatformKnowledgeBriefReceipt } from "../lib/projects/platformKnowledgeBrief.ts";
import type { GatePlatformTacticExperienceLibrary } from "../lib/projects/gateActionReceipts.ts";

const emptyLibrary: GatePlatformTacticExperienceLibrary = {
  summary: {
    total: 0,
    blocked: 0,
    watch: 0,
    usable: 0,
  },
  nextActions: [],
  items: [],
};

const usableLibrary: GatePlatformTacticExperienceLibrary = {
  summary: {
    total: 1,
    blocked: 0,
    watch: 0,
    usable: 1,
  },
  nextActions: ["继续复用番茄正反馈打法。"],
  items: [{
    platformId: "fanqie",
    platformName: "番茄小说",
    status: "usable",
    label: "可复用打法",
    tactic: "强钩子标题打法",
    lesson: "番茄小说对强冲突标题和前三章连续兑现有正反馈。",
    reuseHint: "新项目开头先复用强钩子标题和三章兑现链。",
    risk: "不要只改标题不改前三章兑现。",
    href: "#platform-tactic-library",
    sourceStatus: "healthy",
    sourceLabel: "健康观察",
    priorityScore: 88,
    latestAt: "2026-07-05T00:00:00.000Z",
    evidence: ["效果回填：曝光 1200，点击 180。"],
  }],
};

const successReceipt: PlatformKnowledgeBriefReceipt = {
  id: "feedback-1",
  platformId: "fanqie",
  platformName: "番茄小说",
  actionLabel: "执行正反馈链",
  title: "番茄小说 正反馈经验已沉淀",
  message: "点击和追读变好，正反馈经验已经进入生成链路。",
  completedStepLabel: "发布效果正反馈",
  stopReason: "可复用信号：强钩子标题",
  nextAction: "复盘平台策略排序",
  href: "#platform-strategy-ranking",
  severity: "success",
  createdAt: "2026-07-05T10:00:00.000Z",
};

test("buildPlatformKnowledgeBrief", async (t) => {
  await t.test("builds an empty brief before feedback exists", () => {
    const brief = buildPlatformKnowledgeBrief({ tacticLibrary: emptyLibrary });

    assert.equal(brief.status, "empty");
    assert.equal(brief.totalReceipts, 0);
    assert.equal(brief.reusableCount, 0);
    assert.ok(brief.headline.includes("还没有平台经验"));
    assert.equal(brief.actionHref, "#publish-effect-panel");
  });

  await t.test("prioritizes the latest successful feedback receipt", () => {
    const brief = buildPlatformKnowledgeBrief({
      feedbackReceipts: [successReceipt],
      tacticLibrary: usableLibrary,
      targetPlatformId: "fanqie",
    });

    assert.equal(brief.status, "learned");
    assert.equal(brief.label, "可复用");
    assert.equal(brief.successCount, 1);
    assert.equal(brief.reusableCount, 1);
    assert.equal(brief.headline, successReceipt.title);
    assert.equal(brief.nextAction, "复盘平台策略排序");
    assert.ok(brief.signals.some((signal) => signal.includes("强钩子标题")));
    assert.equal(brief.recent.length, 1);
  });

  await t.test("keeps needs-action feedback visible before tactic reuse", () => {
    const brief = buildPlatformKnowledgeBrief({
      feedbackReceipts: [{
        ...successReceipt,
        id: "feedback-2",
        title: "番茄小说 证据链还不够硬",
        severity: "needs_action",
        actionLabel: "启动补证据链",
        completedStepLabel: "发布效果已记录",
        stopReason: "缺采纳版本、对照数据或二轮归因。",
        nextAction: "保存发布基准",
        href: "#package-version-history",
        createdAt: "2026-07-06T10:00:00.000Z",
      }, successReceipt],
      tacticLibrary: usableLibrary,
    });

    assert.equal(brief.status, "needs_action");
    assert.equal(brief.label, "要处理");
    assert.equal(brief.needsActionCount, 1);
    assert.equal(brief.nextAction, "保存发布基准");
    assert.equal(brief.actionHref, "#package-version-history");
  });
});
