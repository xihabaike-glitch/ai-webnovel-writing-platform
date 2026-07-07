import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const gatePageSource = readFileSync("src/app/gate/page.tsx", "utf8");
const panelSource = readFileSync("src/components/gate/GatePlatformStrategyReviewPanel.tsx", "utf8");

test("gate platform strategy review receives action recheck return paths", () => {
  assert.ok(gatePageSource.includes("<GatePlatformStrategyReviewPanel gateReturnHref={gateRecheckReturnHref} review={gate.strategyReview} />"));
  assert.ok(panelSource.includes("gateReturnHref?: string | null"));
});

test("gate platform strategy review keeps project navigation returnable", () => {
  assert.ok(panelSource.includes("function hrefWithGateReturn"));
  assert.ok(panelSource.includes("router.push(hrefWithGateReturn(item.href, gateReturnHref))"));
  assert.ok(panelSource.includes("href={hrefWithGateReturn(receipt.href, gateReturnHref)}"));
  assert.ok(panelSource.includes("href={hrefWithGateReturn(item.href, gateReturnHref)}"));
  assert.ok(panelSource.includes("href={hrefWithGateReturn(project.href, gateReturnHref)}"));
});
