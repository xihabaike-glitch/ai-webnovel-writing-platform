import test from "node:test";
import assert from "node:assert/strict";
import { buildPublishEffectKnowledgeFeedbackReceipt } from "../lib/projects/platformKnowledgeFeedbackReceipts.ts";
import type { PlatformKnowledgeInsight } from "../lib/projects/platformPublishExport.ts";

const learnedKnowledge: PlatformKnowledgeInsight = {
  platformId: "fanqie",
  platformName: "番茄小说",
  status: "learned",
  confidence: 86,
  evidenceCount: 2,
  positiveCount: 1,
  negativeCount: 0,
  winningSignals: ["夜雨系统：强钩子标题带来点击提升"],
  avoidSignals: [],
  tacticSummary: "强钩子标题 + 前三章连续兑现，在番茄首轮有正反馈。",
  nextAction: "复用到下一轮投稿包装。",
  applications: [],
  feedbackLoop: {
    actionLabel: "执行正反馈链",
    headline: "把番茄小说的正反馈经验继续喂给生成链路。",
    nextStepLabel: "复盘平台策略排序",
    nextStepHref: "#platform-strategy-ranking",
  },
};

test("buildPublishEffectKnowledgeFeedbackReceipt", async (t) => {
  await t.test("turns learned publish effects into reusable platform knowledge", () => {
    const receipt = buildPublishEffectKnowledgeFeedbackReceipt({
      projectId: "project-1",
      projectTitle: "夜雨系统",
      metricId: "metric-1",
      platformKnowledge: learnedKnowledge,
      effectReviewHeadline: "番茄小说 有可追的苗头。",
      createdAt: "2026-07-05T12:00:00.000Z",
    });

    assert.equal(receipt.id, "platform-knowledge:project-1:fanqie:publish_effect:metric-1");
    assert.equal(receipt.platformId, "fanqie");
    assert.equal(receipt.severity, "success");
    assert.equal(receipt.completedStepLabel, "发布效果正反馈");
    assert.equal(receipt.actionLabel, "执行正反馈链");
    assert.ok(receipt.stopReason.includes("强钩子标题"));
    assert.equal(receipt.nextAction, "复盘平台策略排序");
    assert.equal(receipt.href, "#platform-strategy-ranking");
  });

  await t.test("keeps insufficient publish effects as evidence collection work", () => {
    const receipt = buildPublishEffectKnowledgeFeedbackReceipt({
      projectId: "project-1",
      metricId: "metric-2",
      platformKnowledge: {
        ...learnedKnowledge,
        status: "insufficient",
        confidence: 35,
        positiveCount: 0,
        winningSignals: [],
        tacticSummary: "缺少采纳版本，暂时不能归因。",
        feedbackLoop: {
          actionLabel: "启动补证据链",
          headline: "先给番茄小说补一轮可归因证据。",
          nextStepLabel: "保存发布基准",
          nextStepHref: "#package-version-history",
        },
      },
      effectReviewHeadline: "样本还不够硬。",
      createdAt: "2026-07-05T12:00:00.000Z",
    });

    assert.equal(receipt.severity, "needs_action");
    assert.equal(receipt.completedStepLabel, "发布效果已记录");
    assert.ok(receipt.stopReason.includes("缺采纳版本"));
    assert.equal(receipt.actionLabel, "启动补证据链");
    assert.equal(receipt.nextAction, "保存发布基准");
  });
});
