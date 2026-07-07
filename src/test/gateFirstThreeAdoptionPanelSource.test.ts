import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const gatePageSource = readFileSync("src/app/gate/page.tsx", "utf8");
const panelSource = readFileSync("src/components/gate/GateFirstThreeAdoptionPanel.tsx", "utf8");

test("gate first-three adoption panel receives action recheck return paths", () => {
  assert.ok(gatePageSource.includes("<GateFirstThreeAdoptionPanel closure={gate.firstThreeAdoptionClosure} gateReturnHref={gateRecheckReturnHref} />"));
  assert.ok(panelSource.includes("gateReturnHref?: string | null"));
  assert.ok(panelSource.includes("function hrefWithGateReturn"));
});

test("gate first-three adoption panel keeps repair and timeline navigation returnable", () => {
  assert.ok(panelSource.includes("href={hrefWithGateReturn(topRepairQueueItem.href, gateReturnHref)}"));
  assert.ok(panelSource.includes("href={hrefWithGateReturn(item.href, gateReturnHref)}"));
  assert.ok(panelSource.includes("href={hrefWithGateReturn(timeline.href, gateReturnHref)}"));
});
