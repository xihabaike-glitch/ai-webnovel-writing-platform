import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/app/failures/page.tsx", "utf8");
const recheckCardSource = readFileSync("src/components/failures/FailureRepairRecheckCard.tsx", "utf8");

test("failures page keeps a gate recheck return path visible", () => {
  assert.ok(source.includes("gateReturnFromParam"));
  assert.ok(source.includes("gateReturn"));
  assert.ok(source.includes("来自总闸门复检"));
  assert.ok(source.includes("回总闸门复检"));
});

test("failures page shows failure repair receipt acceptance criteria", () => {
  assert.ok(source.includes("failureRepairReceiptAcceptanceCriteria"));
  assert.ok(source.includes("失败修复回执验收口径"));
  assert.ok(source.includes("失败修复实跑手册"));
  assert.ok(source.includes("center.runbookStep"));
  assert.ok(source.includes("当前实跑动作"));
  assert.ok(source.includes("center.runbookStep.sampleAction"));
  assert.ok(source.includes("center.runbookStep.proofToCapture"));
  assert.ok(source.includes("center.runbookStep.rollbackIfWeak"));
  assert.ok(source.includes("失败原因"));
  assert.ok(source.includes("修复泳道"));
  assert.ok(source.includes("重试样本"));
  assert.ok(source.includes("恢复观察"));
  assert.ok(source.includes("是否暂停批量"));
  assert.ok(source.includes("failureRepairReceiptAcceptanceCriteria.map"));
});

test("failures page renders per-lane failure repair receipt templates", () => {
  assert.ok(source.includes("失败修复回执模板"));
  assert.ok(source.includes("lane.runbookStep"));
  assert.ok(source.includes("修复样本动作"));
  assert.ok(source.includes("lane.runbookStep.proofToCapture"));
  assert.ok(source.includes("lane.runbookStep.rollbackIfWeak"));
  assert.ok(source.includes("lane.receiptTemplate.map"));
  assert.ok(source.includes("break-words"));
  assert.ok(source.includes("停手线"));
});

test("failures page carries gate return through repair links", () => {
  assert.ok(source.includes("function hrefWithGateReturn"));
  assert.ok(source.includes("href={hrefWithGateReturn(center.pmFocus.actionHref, gateReturn)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(center.pmFocus.pipelineActionHref, gateReturn)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(failureRepairFollowup.href, gateReturn)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(failureRepairResumeRecommendation.href, gateReturn)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(failureRepairResumeBatchRecord.stabilityActionHref ?? failureRepairResumeBatchRecord.decisionActionHref, gateReturn)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(lane.href, gateReturn)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(failure.href, gateReturn)}"));
  assert.ok(source.includes("failureRepairResumeBatchRecord.scaleDecisionLabel"));
  assert.ok(source.includes("failureRepairResumeBatchRecord.scaleDecisionDetail"));
  assert.ok(source.includes("<FailureRepairRecheckCard card={failureRepairRecheckCard} dispatch={failureRepairRecheckDispatch} gateReturnHref={gateReturn} />"));

  assert.ok(recheckCardSource.includes("gateReturnHref?: string | null"));
  assert.ok(recheckCardSource.includes("function hrefWithGateReturn"));
  assert.ok(recheckCardSource.includes("href={hrefWithGateReturn(\"/dispatch\", gateReturnHref)}"));
  assert.ok(recheckCardSource.includes("href={hrefWithGateReturn(card.href, gateReturnHref)}"));
});
