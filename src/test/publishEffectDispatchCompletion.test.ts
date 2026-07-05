import test from "node:test";
import assert from "node:assert/strict";
import { reviewGateDispatchCompletionEvidence } from "../lib/projects/gateActionReceipts.ts";
import { buildPublishEffectDispatchCompletionEvidence } from "../lib/projects/publishEffectDispatchCompletion.ts";

test("buildPublishEffectDispatchCompletionEvidence", () => {
  const completionEvidence = buildPublishEffectDispatchCompletionEvidence({
    metric: {
      id: "metric-1",
      platformName: "番茄小说",
      views: 1200,
      clicks: 160,
      favorites: 72,
      follows: 41,
      comments: 8,
      paidReads: 0,
      editorFeedback: "点击可以，简介还要更短。",
      publishUrl: "https://example.com/book",
      snapshotDate: "2026-01-01T00:00:00.000Z",
    },
    review: {
      headline: "番茄小说 投稿效果有苗头",
      nextAction: "保留当前卖点和钩子表达，小步加码并继续回填下一轮真实数据。",
    },
  });

  assert.ok(completionEvidence.includes("曝光 1200"));
  assert.ok(completionEvidence.includes("追读 41"));
  assert.ok(completionEvidence.includes("结论：番茄小说 投稿效果有苗头"));

  const issue = reviewGateDispatchCompletionEvidence({
    stage: "start_metrics_recovery",
    title: "番茄小说 首轮数据回收",
    actionLabel: "派给数据运营",
    platformName: "番茄小说",
    acceptanceCriteria: ["首轮曝光、点击、追读或收藏口径已确定", "数据回收时间点已写清", "下一轮优化判断口径已保存"],
    evidence: ["首轮验证收齐"],
  }, completionEvidence);

  assert.equal(issue, null);
});
