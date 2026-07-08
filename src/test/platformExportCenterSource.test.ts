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

test("platform export center renders the final delivery checklist", () => {
  assert.ok(source.includes("center.finalDeliveryChecklist.headline"));
  assert.ok(source.includes("center.finalDeliveryChecklist.nextAction"));
  assert.ok(source.includes("center.finalDeliveryChecklist.items.map"));
  assert.ok(source.includes("最终交付清单"));
  assert.ok(source.includes("最终交付回执模板"));
  assert.ok(source.includes("item.receiptTemplate.map"));
  assert.ok(source.includes("finalDeliveryChecklistStatusClass"));
  assert.ok(source.includes("buildGateFinalDeliveryReceipt"));
  assert.ok(source.includes("recordFinalDeliveryReceipt"));
  assert.ok(source.includes("const receipt = buildGateFinalDeliveryReceipt"));
  assert.ok(source.includes("addGateActionReceipt(receipt"));
  assert.ok(source.includes("写回总闸门"));
  assert.ok(source.includes("useSearchParams"));
  assert.ok(source.includes("useRouter"));
  assert.ok(source.includes("finalDeliveryFocus"));
  assert.ok(source.includes("focusedFinalDeliveryItem"));
  assert.ok(source.includes("总闸门带回的待处理项"));
  assert.ok(source.includes("border-amber-300"));
  assert.ok(source.includes("finalDeliveryGateReturnHref"));
  assert.ok(source.includes("source\", \"final-delivery-receipt"));
  assert.ok(source.includes("persistGateActionReceipt(receipt"));
  assert.ok(source.includes("router.push(returnHref"));
});
