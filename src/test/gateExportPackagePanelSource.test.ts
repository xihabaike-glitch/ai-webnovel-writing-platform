import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const gatePageSource = readFileSync("src/app/gate/page.tsx", "utf8");
const panelSource = readFileSync("src/components/gate/GateExportPackagePanel.tsx", "utf8");

test("gate export package panel receives action recheck return paths", () => {
  assert.ok(gatePageSource.includes("<GateExportPackagePanel gateReturnHref={gateRecheckReturnHref} packages={gate.projectStatuses} />"));
  assert.ok(panelSource.includes("gateReturnHref?: string | null"));
});

test("gate export package panel keeps non-download navigation returnable", () => {
  assert.ok(panelSource.includes("function hrefWithGateReturn"));
  assert.ok(panelSource.includes("href={hrefWithGateReturn(item.href, gateReturnHref)}"));
  assert.ok(panelSource.includes("href={hrefWithGateReturn(item.loopTimeline.actionHref, gateReturnHref)}"));
  assert.ok(panelSource.includes("href={hrefWithGateReturn(item.exportVersionGate.href, gateReturnHref)}"));
  assert.ok(panelSource.includes("href={hrefWithGateReturn(action.href, gateReturnHref)}"));
  assert.ok(panelSource.includes("href={hrefWithGateReturn(item.exportVersionGate.receiptReview.href, gateReturnHref)}"));
});
