import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/app/projects/[projectId]/exports/page.tsx", "utf8");
const versionCenterSource = readFileSync("src/components/projects/ExportVersionCenterPanel.tsx", "utf8");

test("project exports page keeps a gate recheck return path visible", () => {
  assert.ok(source.includes("gateReturnFromParam"));
  assert.ok(source.includes("gateReturn"));
  assert.ok(source.includes("来自总闸门复检"));
  assert.ok(source.includes("回总闸门复检"));
});

test("project exports page carries gate return through version center links", () => {
  assert.ok(source.includes("function hrefWithGateReturn"));
  assert.ok(source.includes("href={hrefWithGateReturn(projectHref, gateReturn)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(`${projectHref}#create-chapter`, gateReturn)}"));
  assert.ok(source.includes("<ExportVersionCenterPanel gateReturnHref={gateReturn} projectHref={projectHref} snapshots={snapshots} summary={summary} />"));

  assert.ok(versionCenterSource.includes("gateReturnHref?: string | null"));
  assert.ok(versionCenterSource.includes("function hrefWithGateReturn"));
  assert.ok(versionCenterSource.includes("href={hrefWithGateReturn(`${projectHref}#submission-package`, gateReturnHref)}"));
  assert.ok(versionCenterSource.includes("href={hrefWithGateReturn(`${projectHref}#create-chapter`, gateReturnHref)}"));
});
