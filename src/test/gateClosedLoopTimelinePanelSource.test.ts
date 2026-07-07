import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const gatePageSource = readFileSync("src/app/gate/page.tsx", "utf8");
const panelSource = readFileSync("src/components/gate/GateClosedLoopTimelinePanel.tsx", "utf8");

test("gate closed-loop timeline receives action recheck return paths", () => {
  assert.ok(gatePageSource.includes("<GateClosedLoopTimelinePanel gateReturnHref={gateRecheckReturnHref} packages={gate.projectStatuses} />"));
  assert.ok(panelSource.includes("gateReturnHref?: string | null"));
});

test("gate closed-loop timeline keeps project navigation returnable", () => {
  assert.ok(panelSource.includes("function hrefWithGateReturn"));
  assert.ok(panelSource.includes("href={hrefWithGateReturn(item.loopTimeline.actionHref, gateReturnHref)}"));
  assert.ok(panelSource.includes("href={hrefWithGateReturn(event.href, gateReturnHref)}"));
});
