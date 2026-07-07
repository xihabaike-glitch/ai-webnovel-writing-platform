import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/components/gate/GatePriorityActionCard.tsx", "utf8");
const workspaceSource = readFileSync("src/components/gate/GateActionWorkspace.tsx", "utf8");

test("gate priority action card shows the recheck hint after successful actions", () => {
  assert.ok(source.includes("receipt.recheck.detail"));
  assert.ok(source.includes("receipt.recheck.actionLabel"));
});

test("gate priority action card focuses the gate recheck notice after successful actions", () => {
  assert.ok(source.includes("focus=action-recheck"));
  assert.ok(source.includes("encodeURIComponent(action.id)"));
  assert.ok(source.includes("router.replace"));
  assert.ok(source.includes("#gate-focus-notice"));
});

test("gate priority action card keeps open-position navigation returnable", () => {
  assert.ok(workspaceSource.includes("<GatePriorityActionCard action={action} gateReturnHref={gateReturnHref} index={index} key={action.id} onReceipt={addReceipt} />"));
  assert.ok(source.includes("gateReturnHref?: string | null"));
  assert.ok(source.includes("function hrefWithGateReturn"));
  assert.ok(source.includes("href={hrefWithGateReturn(action.href, gateReturnHref)}"));
});
