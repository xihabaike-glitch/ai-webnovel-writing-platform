import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/components/projects/PlatformExportCenterPanel.tsx", "utf8");

test("platform export center renders the locked delivery scope", () => {
  assert.ok(source.includes("center.deliveryScope.statusLabel"));
  assert.ok(source.includes("center.deliveryScope.expansionLabel"));
  assert.ok(source.includes("center.deliveryScope.scopeDecision"));
});

test("platform export center renders publish package and effect receipt templates", () => {
  assert.ok(source.includes("buildPlatformPublishReceiptTemplate"));
  assert.ok(source.includes("发布包与平台复盘回执模板"));
  assert.ok(source.includes("publishReceiptTemplate.map"));
  assert.ok(source.includes("平台："));
  assert.ok(source.includes("发布包："));
  assert.ok(source.includes("投稿材料："));
  assert.ok(source.includes("样章："));
  assert.ok(source.includes("发布效果："));
  assert.ok(source.includes("人工验收："));
  assert.ok(source.includes("下一步："));
  assert.ok(source.includes("停手线："));
  assert.ok(source.includes("overflowWrap: \"anywhere\""));
  assert.ok(source.includes("wordBreak: \"break-word\""));
});
