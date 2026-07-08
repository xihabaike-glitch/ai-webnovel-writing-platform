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
  assert.ok(source.includes("复检结论"));
  assert.ok(source.includes("focusNotice.recheckSummary.recheckVerdict.label"));
  assert.ok(source.includes("focusNotice.recheckSummary.recheckVerdict.detail"));
  assert.ok(source.includes("已完成 {focusNotice.recheckSummary.completedSteps}/{focusNotice.recheckSummary.totalSteps} 步"));
  assert.ok(source.includes("最近回填"));
  assert.ok(source.includes("剩余卡点"));
  assert.ok(source.includes("focusNotice.recheckSummary.nextDispatch"));
});

test("gate page renders role closure recheck progress", () => {
  assert.ok(source.includes("focusNotice.recheckSummary.roleClosureProgress"));
  assert.ok(source.includes("角色闭环进度"));
  assert.ok(source.includes("roleClosureProgress.headline"));
  assert.ok(source.includes("roleClosureProgress.lanes.map"));
  assert.ok(source.includes("lane.status === \"done\""));
  assert.ok(source.includes("lane.evidence"));
});

test("gate page labels prioritized remaining blockers", () => {
  assert.ok(source.includes("focusNotice.recheckSummary.remainingBlockers"));
  assert.ok(source.includes("blocker.priorityLabel"));
  assert.ok(source.includes("blocker.evidence"));
  assert.ok(source.includes("href={hrefWithGateReturn(blocker.href, gateRecheckReturnHref)}"));
  assert.ok(source.includes("blocker.actionLabel"));
});

test("gate page carries action recheck return paths into gate item links", () => {
  assert.ok(source.includes("gateRecheckReturnHref"));
  assert.ok(source.includes("hrefWithGateReturn"));
  assert.ok(source.includes("base.includes(\"gateReturn=\")"));
  assert.ok(source.includes("focus === \"action-recheck\""));
  assert.ok(source.includes("href={hrefWithGateReturn(gate.releaseAction.href, gateRecheckReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(gate.pmFocus.actionHref, gateRecheckReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(focusNotice.primaryHref, gateRecheckReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(item.href, gateRecheckReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(project.href, gateRecheckReturnHref)}"));
});

test("gate page carries action recheck return paths into failure repair links", () => {
  assert.ok(source.includes("href={hrefWithGateReturn(gate.failureRepairBatch.primaryActionHref, gateRecheckReturnHref)}"));
});

test("gate page carries action recheck return paths into pipeline links", () => {
  assert.ok(source.includes("href={hrefWithGateReturn(gate.pmFocus.pipelineActionHref, gateRecheckReturnHref)}"));
});

test("gate page carries action recheck return paths into acceptance sheet links", () => {
  assert.ok(source.includes("href={hrefWithGateReturn(\"/projects#pipeline-projects\", gateRecheckReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(project.acceptanceSheetGate.href, gateRecheckReturnHref)}"));
});

test("gate page carries action recheck return paths into AI recovery links", () => {
  assert.ok(source.includes("href={hrefWithGateReturn(aiRecoveryPanel.primaryAction.href, gateRecheckReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(aiRecoveryPanel.currentConclusion.href, gateRecheckReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(aiRecoveryPanel.latestEvidence.href, gateRecheckReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(aiRecoveryPanel.promptMemory.actionHref, gateRecheckReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(group.actionHref, gateRecheckReturnHref)}"));
});

test("gate page renders project acceptance sheet blockers", () => {
  assert.ok(source.includes("项目验收单联动"));
  assert.ok(source.includes("gate.projectStatuses.filter((project) => project.acceptanceSheetGate.status !== \"pass\")"));
  assert.ok(source.includes("project.acceptanceSheetGate.label"));
  assert.ok(source.includes("project.acceptanceSheetGate.detail"));
  assert.ok(source.includes("project.acceptanceSheetGate.executionHint"));
  assert.ok(source.includes("project.acceptanceSheetGate.href"));
});

test("gate page feeds model role blockers into the final gate", () => {
  assert.ok(source.includes("buildModelRoleMatrix"));
  assert.ok(source.includes("buildModelRoleMatrixPriorityBlocker"));
  assert.ok(source.includes("const modelRolePriorityBlocker = buildModelRoleMatrixPriorityBlocker(modelRoleMatrix);"));
  assert.ok(source.includes("modelRoleBlocker: modelRolePriorityBlocker"));
});
