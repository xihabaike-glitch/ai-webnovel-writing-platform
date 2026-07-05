import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSubmissionDecisionCompletionEffect,
  inferSubmissionDecisionContractStatus,
} from "../lib/projects/submissionDecisionCompletion.ts";

test("submission decision completion effect", async (t) => {
  await t.test("parses dispatch completion evidence into publish metrics", () => {
    const effect = buildSubmissionDecisionCompletionEffect({
      projectId: "project-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      dispatchKey: "submission-decision:fanqie:main",
      stage: "record_metrics",
      completedAt: "2026-01-08T10:00:00.000Z",
      completionEvidence: [
        "已完成首轮投稿，日期：2026-01-09。",
        "曝光 1.2万，点击 960，收藏 180，追读 72，评论 11，付费 3。",
        "编辑反馈：开头钩子有效，继续观察前三章。",
        "链接：https://fanqie.example/book/1",
      ].join("\n"),
    });

    assert.ok(effect);
    assert.equal(effect.projectId, "project-1");
    assert.equal(effect.views, 12000);
    assert.equal(effect.clicks, 960);
    assert.equal(effect.favorites, 180);
    assert.equal(effect.follows, 72);
    assert.equal(effect.comments, 11);
    assert.equal(effect.paidReads, 3);
    assert.equal(effect.publishUrl, "https://fanqie.example/book/1");
    assert.equal(effect.snapshotDate.toISOString().slice(0, 10), "2026-01-09");
    assert.equal(effect.review.status, "promising");
    assert.ok(effect.notes.includes("submission-decision:fanqie:main"));
  });

  await t.test("records contract outcomes even when traffic metrics are missing", () => {
    const effect = buildSubmissionDecisionCompletionEffect({
      projectId: "project-1",
      platformId: "qimao",
      platformName: "七猫小说",
      dispatchKey: "submission-decision:qimao:repair",
      stage: "start_platform_package",
      completionEvidence: "补包后被拒稿，反馈：简介卖点不够直，先不要继续加码。",
    });

    assert.ok(effect);
    assert.equal(effect.contractStatus, "rejected");
    assert.equal(effect.review.status, "weak");
    assert.equal(effect.views, 0);
  });

  await t.test("ignores ordinary completion text without effect signals", () => {
    const effect = buildSubmissionDecisionCompletionEffect({
      projectId: "project-1",
      platformId: "webnovel",
      platformName: "WebNovel",
      dispatchKey: "submission-decision:webnovel:watch",
      stage: "record_metrics",
      completionEvidence: "已联系运营同学处理，后续等待进一步消息。",
    });

    assert.equal(effect, null);
  });

  await t.test("does not record model routing or projectless tasks", () => {
    assert.equal(buildSubmissionDecisionCompletionEffect({
      projectId: null,
      platformId: "fanqie",
      platformName: "番茄小说",
      dispatchKey: "fanqie:record_metrics",
      stage: "record_metrics",
      completionEvidence: "曝光 100，点击 20。",
    }), null);
    assert.equal(buildSubmissionDecisionCompletionEffect({
      projectId: "project-1",
      platformId: "model-routing",
      platformName: "模型路由",
      dispatchKey: "model-route:chapter_draft",
      stage: "record_metrics",
      completionEvidence: "成功率 100%，质量 86。",
    }), null);
  });

  await t.test("infers contract status from platform language", () => {
    assert.equal(inferSubmissionDecisionContractStatus("收到编辑邀约，站短已来"), "invited");
    assert.equal(inferSubmissionDecisionContractStatus("已经签约成功"), "signed");
    assert.equal(inferSubmissionDecisionContractStatus("审核中，待反馈"), "pending");
    assert.equal(inferSubmissionDecisionContractStatus("退稿，未过"), "rejected");
  });
});
