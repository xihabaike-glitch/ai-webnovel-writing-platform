import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/components/gate/GateRecheckDispatchButton.tsx", "utf8");
const gatePageSource = readFileSync("src/app/gate/page.tsx", "utf8");

test("gate recheck dispatch button jumps to the created dispatch card", () => {
  assert.ok(source.includes("useRouter"));
  assert.ok(source.includes("const router = useRouter();"));
  assert.ok(source.includes("router.push(dispatchHref);"));
  assert.ok(source.includes("`/dispatch#dispatch-${dispatch.id}`"));
});

test("gate recheck dispatch button keeps generated dispatch navigation returnable", () => {
  assert.ok(gatePageSource.includes("<GateRecheckDispatchButton"));
  assert.ok(gatePageSource.includes("dispatch={focusNotice.recheckSummary.nextDispatch}"));
  assert.ok(source.includes("gateReturnHref?: string | null"));
  assert.ok(source.includes("function hrefWithGateReturn"));
  assert.ok(source.includes("hrefWithGateReturn(`/dispatch#dispatch-${dispatch.id}`, gateReturnHref)"));
});

test("gate recheck dispatch button can persist multiple role closure dispatches", () => {
  assert.ok(gatePageSource.includes("dispatches={focusNotice.recheckSummary.nextDispatches}"));
  assert.ok(source.includes("dispatches?: PrePublishGateRecheckDispatch[]"));
  assert.ok(source.includes("const dispatchQueue = dispatches?.length ? dispatches : [dispatch];"));
  assert.ok(source.includes("Promise.all(dispatchQueue.map"));
  assert.ok(source.includes("已生成 ${dispatchQueue.length} 张派单"));
});
