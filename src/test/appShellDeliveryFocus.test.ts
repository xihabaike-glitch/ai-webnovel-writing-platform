import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/components/app-shell/AppShell.tsx", "utf8");

test("AppShell keeps the PM delivery path visible globally", () => {
  assert.ok(source.includes("buildDevelopmentOverview"), "AppShell should reuse the current development overview");
  assert.ok(source.includes("overview.currentPipelineValidation.actionHref"), "AppShell should link back to the real pipeline validation");
  assert.ok(source.includes("overview.currentPipelineValidation.actionLabel"), "AppShell should name the pipeline validation action");
  assert.ok(source.includes("overview.platformScope.statusLabel"), "AppShell should show the locked platform scope");
  assert.ok(source.includes("overview.modelInterfaces.readyLabel"), "AppShell should show model interface readiness");
  assert.ok(source.includes("剩余 10 个平台不再添加"), "AppShell should keep platform expansion out of the global path");
});
