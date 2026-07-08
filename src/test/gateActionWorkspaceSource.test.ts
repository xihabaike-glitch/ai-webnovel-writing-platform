import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const gatePageSource = readFileSync("src/app/gate/page.tsx", "utf8");
const workspaceSource = readFileSync("src/components/gate/GateActionWorkspace.tsx", "utf8");

test("gate action workspace receives action recheck return paths", () => {
  assert.ok(gatePageSource.includes("<GateActionWorkspace actions={gate.priorityActions} failureRepairBatch={gate.failureRepairBatch} finalDeliveryFocus={finalDeliveryFocus} gateReturnHref={gateRecheckReturnHref} />"));
  assert.ok(workspaceSource.includes("gateReturnHref?: string | null"));
  assert.ok(workspaceSource.includes("finalDeliveryFocus?: string | null"));
  assert.ok(workspaceSource.includes("function hrefWithGateReturn"));
});

test("gate action workspace keeps main workspace navigation returnable", () => {
  assert.ok(workspaceSource.includes("href={hrefWithGateReturn(recommendedBatchFocus.primaryHref, gateReturnHref)}"));
  assert.ok(workspaceSource.includes("href={hrefWithGateReturn(failureRepairReview.href, gateReturnHref)}"));
  assert.ok(workspaceSource.includes("href={hrefWithGateReturn(failureRepairResolution.href, gateReturnHref)}"));
  assert.ok(workspaceSource.includes("href={hrefWithGateReturn(failureRepairThirdRound.href, gateReturnHref)}"));
  assert.ok(workspaceSource.includes("href={hrefWithGateReturn(\"/dispatch\", gateReturnHref)}"));
  assert.ok(workspaceSource.includes("href={hrefWithGateReturn(item.href, gateReturnHref)}"));
  assert.ok(workspaceSource.includes("href={hrefWithGateReturn(receipt.href, gateReturnHref)}"));
  assert.ok(workspaceSource.includes("href={gateReturnHref ?? \"/gate\"}"));
});

test("gate action workspace shows batch tactic scale decisions", () => {
  assert.ok(workspaceSource.includes("function batchTacticScaleDecisionClass"));
  assert.ok(workspaceSource.includes("{item.scaleDecisionLabel}"));
  assert.ok(workspaceSource.includes("{item.scaleDecisionDetail}"));
});

test("gate action workspace shows dispatch receipt acceptance criteria", () => {
  assert.ok(workspaceSource.includes("gateDispatchReceiptAcceptanceCriteria"));
  assert.ok(workspaceSource.includes("派单回执验收口径"));
  assert.ok(workspaceSource.includes("执行角色"));
  assert.ok(workspaceSource.includes("输入"));
  assert.ok(workspaceSource.includes("输出"));
  assert.ok(workspaceSource.includes("人工验收"));
  assert.ok(workspaceSource.includes("下一步"));
  assert.ok(workspaceSource.includes("gateDispatchReceiptAcceptanceCriteria.map"));
});

test("gate action workspace explains missing dispatch receipt fields", () => {
  assert.ok(workspaceSource.includes("gateDispatchMissingReceiptFields"));
  assert.ok(workspaceSource.includes("缺字段解释"));
  assert.ok(workspaceSource.includes("缺少派单回执字段"));
  assert.ok(workspaceSource.includes("缺字段："));
  assert.ok(workspaceSource.includes("missingReceiptFields.map"));
  assert.ok(workspaceSource.includes("执行角色"));
  assert.ok(workspaceSource.includes("人工验收"));
  assert.ok(workspaceSource.includes("下一步"));
});

test("gate action workspace shows final delivery receipt closeout review", () => {
  assert.ok(workspaceSource.includes("buildGateFinalDeliveryReceiptReview"));
  assert.ok(workspaceSource.includes("finalDeliveryReview"));
  assert.ok(workspaceSource.includes("最终交付闭环复检"));
  assert.ok(workspaceSource.includes("finalDeliveryReview.completedCount"));
  assert.ok(workspaceSource.includes("finalDeliveryReview.blockedCount"));
  assert.ok(workspaceSource.includes("finalDeliveryReview.missingCount"));
  assert.ok(workspaceSource.includes("finalDeliveryReview.latestFeedback"));
  assert.ok(workspaceSource.includes("finalDeliveryReview.remainingFeedback"));
  assert.ok(workspaceSource.includes("下一刀"));
  assert.ok(workspaceSource.includes("最终交付收口面板"));
  assert.ok(workspaceSource.includes("finalDeliveryCompletionPercent"));
  assert.ok(workspaceSource.includes("aria-label=\"最终交付完成率\""));
  assert.ok(workspaceSource.includes("放行判断"));
  assert.ok(workspaceSource.includes("收口缺口"));
  assert.ok(workspaceSource.includes("finalDeliveryNextCutLabel"));
  assert.ok(workspaceSource.includes("最终交付逐项复检"));
  assert.ok(workspaceSource.includes("finalDeliveryReview.items.map"));
  assert.ok(workspaceSource.includes("finalDeliveryReviewItemStatusLabel"));
  assert.ok(workspaceSource.includes("function hrefWithFinalDeliveryFocus"));
  assert.ok(workspaceSource.includes("finalDeliveryFocus"));
  assert.ok(workspaceSource.includes("const isFocusedFinalDeliveryReviewItem = item.id === finalDeliveryFocus;"));
  assert.ok(workspaceSource.includes("刚写回总闸门"));
  assert.ok(workspaceSource.includes("ring-2 ring-amber-300"));
  assert.ok(workspaceSource.includes("href={hrefWithGateReturn(hrefWithFinalDeliveryFocus(item.href, item.id), gateReturnHref)}"));
  assert.ok(workspaceSource.includes("finalDeliveryReview.evidence.map"));
});
