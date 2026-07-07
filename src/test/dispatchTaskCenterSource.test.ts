import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/components/gate/GateDispatchTaskCenter.tsx", "utf8");

test("dispatch task center sends completed acceptance dispatches back to gate recheck", () => {
  assert.ok(source.includes("dispatchGateRecheckHref"));
  assert.ok(source.includes("focus=action-recheck"));
  assert.ok(source.includes("project-acceptance:${encodeURIComponent(projectId)}"));
  assert.ok(source.includes("回总闸门复检"));
});
