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

test("gate page forwards action recheck focus params", () => {
  assert.ok(source.includes("value === \"action-recheck\""));
  assert.ok(source.includes("actionId"));
  assert.ok(source.includes("buildPrePublishGateFocusNotice({ focus, projectId, actionId, gate })"));
  assert.ok(source.includes("id=\"gate-focus-notice\""));
});

test("gate page renders action recheck summary feedback", () => {
  assert.ok(source.includes("GateRecheckDispatchButton"));
  assert.ok(source.includes("focusNotice.recheckSummary"));
  assert.ok(source.includes("项目验收单回填"));
  assert.ok(source.includes("已完成 {focusNotice.recheckSummary.completedSteps}/{focusNotice.recheckSummary.totalSteps} 步"));
  assert.ok(source.includes("最近回填"));
  assert.ok(source.includes("剩余卡点"));
  assert.ok(source.includes("focusNotice.recheckSummary.nextDispatch"));
});

test("gate page renders project acceptance sheet blockers", () => {
  assert.ok(source.includes("项目验收单联动"));
  assert.ok(source.includes("gate.projectStatuses.filter((project) => project.acceptanceSheetGate.status !== \"pass\")"));
  assert.ok(source.includes("project.acceptanceSheetGate.label"));
  assert.ok(source.includes("project.acceptanceSheetGate.detail"));
  assert.ok(source.includes("project.acceptanceSheetGate.executionHint"));
  assert.ok(source.includes("project.acceptanceSheetGate.href"));
});
