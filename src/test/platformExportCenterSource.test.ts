import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/components/projects/PlatformExportCenterPanel.tsx", "utf8");

test("platform export center renders the locked delivery scope", () => {
  assert.ok(source.includes("center.deliveryScope.statusLabel"));
  assert.ok(source.includes("center.deliveryScope.expansionLabel"));
  assert.ok(source.includes("center.deliveryScope.scopeDecision"));
});
