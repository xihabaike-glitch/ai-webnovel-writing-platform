import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { groupReviewIssues } from "../lib/ai/reviewGrouping.ts";

describe("groupReviewIssues", () => {
  it("groups review issues into author-facing buckets", () => {
    const grouped = groupReviewIssues([
      { severity: "medium", type: "hook", message: "钩子弱", suggestion: "加倒计时" },
      { severity: "high", type: "platform_fit", message: "不适合番茄", suggestion: "提高爽点" },
      { severity: "low", type: "arc", message: "弧光不清", suggestion: "补选择代价" },
    ]);

    assert.equal(grouped.hook.label, "钩子");
    assert.equal(grouped.hook.issues.length, 1);
    assert.equal(grouped.platform.issues.length, 1);
    assert.equal(grouped.character.issues.length, 1);
  });
});

