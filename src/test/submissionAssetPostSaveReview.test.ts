import test from "node:test";
import assert from "node:assert/strict";
import { buildSubmissionAssetPostSaveReview } from "../lib/projects/platformPublishExport.ts";

const readyAudit = {
  score: 100,
  status: "ready" as const,
  passed: ["标题可用"],
  issues: [],
};

const readyGate = {
  status: "ready_to_submit" as const,
  label: "可投",
  headline: "番茄小说 发布门槛已过。",
  verdict: "标题、简介、前三章、字数、审稿和投稿资产都过了投前线。",
  nextAction: "保存发布包版本基准，然后下载或复制发布包。",
  score: 100,
  blockers: [],
  items: [],
};

test("buildSubmissionAssetPostSaveReview", async (t) => {
  await t.test("routes ready packages to baseline save before download", () => {
    const review = buildSubmissionAssetPostSaveReview({
      platformName: "番茄小说",
      assetAudit: readyAudit,
      finalGate: readyGate,
      canExport: true,
      baselineSaved: false,
    });

    assert.equal(review.status, "ready_for_baseline");
    assert.equal(review.finalGateScore, 100);
    assert.equal(review.href, "#platform-export");
    assert.equal(review.actionLabel, "保存发布基准");
  });

  await t.test("routes baselined packages to download/version history", () => {
    const review = buildSubmissionAssetPostSaveReview({
      platformName: "番茄小说",
      assetAudit: readyAudit,
      finalGate: readyGate,
      canExport: true,
      baselineSaved: true,
    });

    assert.equal(review.status, "ready_for_download");
    assert.equal(review.href, "#package-version-history");
    assert.equal(review.actionLabel, "下载发布包");
  });

  await t.test("keeps fix-first packages on the failing gate item", () => {
    const review = buildSubmissionAssetPostSaveReview({
      platformName: "番茄小说",
      assetAudit: { ...readyAudit, score: 82, status: "needs_work" },
      finalGate: {
        ...readyGate,
        status: "fix_first",
        label: "先修",
        score: 82,
        nextAction: "先修投稿资产。",
        items: [
          {
            id: "asset",
            label: "投稿资产",
            status: "fix" as const,
            detail: "卖点还不够直给。",
            actionLabel: "修投稿资产",
            href: "#submission-asset-editor",
          },
        ],
      },
      canExport: false,
      baselineSaved: false,
    });

    assert.equal(review.status, "fix_first");
    assert.equal(review.href, "#submission-asset-editor");
    assert.equal(review.actionLabel, "继续修");
  });
});
