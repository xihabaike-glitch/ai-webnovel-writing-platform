import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/app/gate/page.tsx", "utf8");

test("gate page shows invalid focus feedback", () => {
  assert.ok(source.includes("invalidFocusNotice"));
  assert.ok(source.includes("focus ? `总闸门焦点「${focus}」不存在，已显示总闸门全局验收。` : null"));
  assert.ok(source.includes("焦点已回退"));
  assert.ok(source.includes("查看总闸门"));
  assert.ok(source.includes("href=\"/gate\""));
});

test("gate page renders project acceptance sheet blockers", () => {
  assert.ok(source.includes("项目验收单联动"));
  assert.ok(source.includes("gate.projectStatuses.filter((project) => project.acceptanceSheetGate.status !== \"pass\")"));
  assert.ok(source.includes("project.acceptanceSheetGate.label"));
  assert.ok(source.includes("project.acceptanceSheetGate.detail"));
  assert.ok(source.includes("project.acceptanceSheetGate.executionHint"));
  assert.ok(source.includes("project.acceptanceSheetGate.href"));
});
