import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/components/projects/SubmissionPackagePanel.tsx", "utf8");

test("submission package panel shows publish loop acceptance criteria", () => {
  assert.ok(source.includes("publishLoopAcceptanceCriteria"));
  assert.ok(source.includes("发布包与平台复盘验收口径"));
  assert.ok(source.includes("平台包"));
  assert.ok(source.includes("样章"));
  assert.ok(source.includes("标签"));
  assert.ok(source.includes("卖点"));
  assert.ok(source.includes("版本基线"));
  assert.ok(source.includes("真实反馈"));
  assert.ok(source.includes("复盘指标"));
  assert.ok(source.includes("publishLoopAcceptanceCriteria.map"));
});
