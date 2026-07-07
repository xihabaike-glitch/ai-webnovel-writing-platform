import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const gatePageSource = readFileSync("src/app/gate/page.tsx", "utf8");
const panelSource = readFileSync("src/components/gate/GatePublishEffectReviewPanel.tsx", "utf8");

test("gate publish effect review receives action recheck return paths", () => {
  assert.ok(gatePageSource.includes("<GatePublishEffectReviewPanel gateReturnHref={gateRecheckReturnHref} packages={gate.projectStatuses} />"));
  assert.ok(panelSource.includes("gateReturnHref?: string | null"));
});

test("gate publish effect review keeps review navigation returnable", () => {
  assert.ok(panelSource.includes("function hrefWithGateReturn"));
  assert.ok(panelSource.includes("href={hrefWithGateReturn(`/projects/${item.projectId}#publish-effect-panel`, gateReturnHref)}"));
  assert.ok(panelSource.includes("href={hrefWithGateReturn(action.href, gateReturnHref)}"));
});
