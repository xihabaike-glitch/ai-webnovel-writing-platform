import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/components/gate/GatePriorityActionCard.tsx", "utf8");

test("gate priority action card shows the recheck hint after successful actions", () => {
  assert.ok(source.includes("receipt.recheck.detail"));
  assert.ok(source.includes("receipt.recheck.actionLabel"));
});
