import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/components/app-shell/AppShell.tsx", "utf8");

test("AppShell keeps the control delivery path visible globally", () => {
  assert.ok(source.includes("buildDevelopmentOverview"), "AppShell should reuse the current development overview");
  assert.ok(source.includes("overview.currentPipelineValidation.actionHref"), "AppShell should link back to the real pipeline validation");
  assert.ok(source.includes("overview.currentPipelineValidation.actionLabel"), "AppShell should name the pipeline validation action");
  assert.ok(source.includes("overview.platformScope.statusLabel"), "AppShell should show the locked platform scope");
  assert.ok(source.includes("overview.modelInterfaces.readyLabel"), "AppShell should show model interface readiness");
  assert.ok(source.includes("剩余 10 个平台不再添加"), "AppShell should keep platform expansion out of the global path");
});

test("AppShell navigation can wrap on narrow screens", () => {
  assert.equal(source.includes("h-14 max-w-7xl"), false, "header should not lock the nav into a fixed-height row");
  assert.ok(source.includes("flex-col gap-3") || source.includes("flex-col gap-2"), "header should stack title and nav on narrow screens");
  assert.ok(source.includes("flex-wrap"), "navigation and quality gate chips should wrap instead of overflowing");
  assert.ok(source.includes("leading-5"), "compact global text needs stable line height when wrapped");
  assert.ok(source.includes("px-4") && source.includes("sm:px-6"), "shell spacing should tighten on mobile and expand on larger screens");
});
