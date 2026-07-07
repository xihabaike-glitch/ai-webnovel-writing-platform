import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const gatePageSource = readFileSync("src/app/gate/page.tsx", "utf8");
const workspaceSource = readFileSync("src/components/gate/GateActionWorkspace.tsx", "utf8");

test("gate action workspace receives action recheck return paths", () => {
  assert.ok(gatePageSource.includes("<GateActionWorkspace actions={gate.priorityActions} failureRepairBatch={gate.failureRepairBatch} gateReturnHref={gateRecheckReturnHref} />"));
  assert.ok(workspaceSource.includes("gateReturnHref?: string | null"));
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
