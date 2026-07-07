import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/components/gate/GateAiPromptMemoryQuickActionButton.tsx", "utf8");
const gatePageSource = readFileSync("src/app/gate/page.tsx", "utf8");

test("gate AI prompt memory quick action receives action recheck return paths", () => {
  assert.ok(gatePageSource.includes("<GateAiPromptMemoryQuickActionButton action={aiRecoveryPanel.promptMemory.quickAction} gateReturnHref={gateRecheckReturnHref} />"));
  assert.ok(source.includes("gateReturnHref?: string | null"));
  assert.ok(source.includes("function hrefWithGateReturn"));
});

test("gate AI prompt memory quick action keeps generated dispatch links returnable", () => {
  assert.ok(source.includes("useState(hrefWithGateReturn(action.successHref, gateReturnHref))"));
  assert.ok(source.includes("hrefWithGateReturn(payload.dispatchHref ?? action.successHref, gateReturnHref)"));
  assert.ok(source.includes("hrefWithGateReturn(`/dispatch?queue=ai_pipeline#dispatch-${runPayload.recoveryDispatch.dispatchKey}`, gateReturnHref)"));
  assert.ok(source.includes("href={href}"));
});
