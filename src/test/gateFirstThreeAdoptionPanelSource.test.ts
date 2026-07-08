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

test("gate adoption panel uses unified chapter adoption copy", () => {
  assert.ok(panelSource.includes("章节采纳闭环"));
  assert.ok(panelSource.includes("章节采纳后续任务"));
  assert.ok(panelSource.includes("重新审稿、必要二改、刷新发布质检"));
  assert.equal(panelSource.includes("前三章采纳闭环"), false);
  assert.equal(panelSource.includes("暂无前三章采纳后续任务"), false);
});

test("gate adoption panel shows a release decision summary", () => {
  assert.ok(panelSource.includes("function adoptionReleaseDecision"));
  assert.ok(panelSource.includes("放行判定"));
  assert.ok(panelSource.includes("已闭合清单"));
  assert.ok(panelSource.includes("剩余卡点"));
  assert.ok(panelSource.includes("刷新总闸门复检"));
});
