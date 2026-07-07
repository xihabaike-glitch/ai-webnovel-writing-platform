import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/components/gate/GateDispatchTaskCenter.tsx", "utf8");
const dispatchPageSource = readFileSync("src/app/dispatch/page.tsx", "utf8");

test("dispatch task center sends completed acceptance dispatches back to gate recheck", () => {
  assert.ok(source.includes("dispatchGateRecheckHref"));
  assert.ok(source.includes("focus=action-recheck"));
  assert.ok(source.includes("project-acceptance:${encodeURIComponent(projectId)}"));
  assert.ok(source.includes("回总闸门复检"));
});

test("dispatch task center highlights the dispatch targeted by the URL hash", () => {
  assert.ok(source.includes("dispatchKeyFromHash"));
  assert.ok(source.includes("hashFocusedDispatchKey"));
  assert.ok(source.includes("window.addEventListener(\"hashchange\", syncHashFocus)"));
  assert.ok(source.includes("task.dispatchKey === hashFocusedDispatchKey"));
  assert.ok(source.includes("刚生成的派单"));
});

test("dispatch task center points completed dispatches back to remaining gate blockers", () => {
  assert.ok(source.includes("buildGateRecheckActionLink"));
  assert.ok(source.includes("回总闸门复检并查看剩余卡点"));
  assert.ok(source.includes("查看剩余卡点"));
  assert.ok(source.includes("buildGateRecheckActionLink(updated.task)"));
});

test("dispatch task center carries gate return into internal work links", () => {
  assert.ok(dispatchPageSource.includes("gateReturnHref={gateReturn}"));
  assert.ok(source.includes("gateReturnHref?: string | null"));
  assert.ok(source.includes("function hrefWithGateReturn"));
  assert.ok(source.includes("href={hrefWithGateReturn(firstDayDesk.nextTask.firstDayHref, gateReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(card.firstDayHref, gateReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(card.href, gateReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(task.href, gateReturnHref)}"));
});

test("dispatch task center carries gate return through dashboard work entry links", () => {
  assert.ok(source.includes("href={hrefWithGateReturn(firstDayDesk.completionGateCta.primaryHref, gateReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(group.executionGuide.primaryHref, gateReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(chain.reviewIntervention.href, gateReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(chain.latestHref, gateReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(routeConfirmationDispatchFlow.emptyGuide.primaryHref, gateReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(routeConfirmationDispatchFlow.emptyGuide.secondaryHref, gateReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(item.href, gateReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(routeActionLink.href, gateReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(routeActionLink.secondary.href, gateReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(routeExecutionDesk.emptyState.href, gateReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(routeExecutionDesk.nextTask.href, gateReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(item.href, gateReturnHref)} key={item.dispatchKey}"));
});
