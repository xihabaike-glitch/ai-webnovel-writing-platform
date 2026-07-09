import assert from "node:assert/strict";
import test from "node:test";
import { parseChapterReviewResult } from "./chapterReviewGeneration.ts";

test("rejects structurally incomplete model review JSON", () => {
  assert.throws(() => parseChapterReviewResult("{}"), /Invalid chapter review result/);
  assert.throws(() => parseChapterReviewResult("[]"), /Invalid chapter review result/);
  assert.throws(() => parseChapterReviewResult(JSON.stringify({
    score: 88,
    issues: [{ severity: "high", type: "hook", message: "weak opening" }],
    summary: "Needs a stronger first line.",
  })), /Invalid chapter review result/);
});

test("accepts a complete model review result", () => {
  const result = parseChapterReviewResult(JSON.stringify({
    score: 88,
    shouldSecondPass: true,
    issues: [{
      severity: "high",
      type: "hook",
      message: "weak opening",
      suggestion: "Open with the immediate threat.",
    }],
    summary: "Needs a stronger first line.",
  }));

  assert.equal(result.score, 88);
  assert.equal(result.issues.length, 1);
  assert.equal(result.shouldSecondPass, true);
});

test("accepts automatic draft quality audits with compatible extra root fields", () => {
  const result = parseChapterReviewResult(JSON.stringify({
    score: 91,
    shouldSecondPass: false,
    issues: [{
      severity: "medium",
      type: "pacing",
      message: "The middle slows down.",
      suggestion: "Move the choice earlier.",
    }],
    summary: "Automatic quality audit passed with one pacing note.",
    platformName: "Test platform",
    wordCount: 1260,
    treeAudit: {
      score: 87,
      label: "stable",
      shouldRewrite: false,
    },
  }));

  assert.equal(result.score, 91);
  assert.equal(result.summary, "Automatic quality audit passed with one pacing note.");
  assert.equal(result.issues[0]?.suggestion, "Move the choice earlier.");
});
