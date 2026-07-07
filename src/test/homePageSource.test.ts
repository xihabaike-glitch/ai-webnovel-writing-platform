import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("home page routes users into the current PM delivery path", () => {
  const source = readFileSync("src/app/page.tsx", "utf8");

  assert.ok(source.includes("buildDevelopmentOverview"), "home page should reuse the development overview instead of drifting into a separate pitch");
  assert.ok(source.includes("overview.currentPipelineValidation.actionHref"), "home page should expose the real pipeline validation CTA");
  assert.ok(source.includes("overview.platformScope.statusLabel"), "home page should show the locked 8-platform scope");
  assert.ok(source.includes("overview.modelInterfaces.readyLabel"), "home page should show the model interface status");
  assert.ok(source.includes("overview.nextActions.map"), "home page should surface the next delivery actions");
  assert.equal(source.includes("新增平台"), false, "home page must not point the user toward adding more platforms");
});
