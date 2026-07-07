import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/app/settings/models/page.tsx", "utf8");
const settingsSource = readFileSync("src/components/settings/ModelProviderSettings.tsx", "utf8");

test("model settings page keeps a gate recheck return path visible", () => {
  assert.ok(source.includes("gateReturnFromParam"));
  assert.ok(source.includes("gateReturn"));
  assert.ok(source.includes("来自总闸门复检"));
  assert.ok(source.includes("回总闸门复检"));
});

test("model settings page carries gate return through model routing links", () => {
  assert.ok(source.includes("gateReturnHref={gateReturn}"));

  assert.ok(settingsSource.includes("gateReturnHref?: string | null"));
  assert.ok(settingsSource.includes("function hrefWithGateReturn"));
  assert.ok(settingsSource.includes("href={hrefWithGateReturn(\"/settings/models\", gateReturnHref)}"));
  assert.ok(settingsSource.includes("href={hrefWithGateReturn(modelRoleMatrix.interfaceCoverage.actionHref, gateReturnHref)}"));
  assert.ok(settingsSource.includes("href={hrefWithGateReturn(modelRoleMatrixPmFocusNotice.actionHref, gateReturnHref)}"));
  assert.ok(settingsSource.includes("href={hrefWithGateReturn(modelRoleMatrixPmFocusNotice.pipelineActionHref, gateReturnHref)}"));
  assert.ok(settingsSource.includes("href={hrefWithGateReturn(routeNotice.href, gateReturnHref)}"));
  assert.ok(settingsSource.includes("href={hrefWithGateReturn(governanceStatus.nextRecheck.href, gateReturnHref)}"));
  assert.ok(settingsSource.includes("href={hrefWithGateReturn(providerSetupNotice.href, gateReturnHref)}"));
});
