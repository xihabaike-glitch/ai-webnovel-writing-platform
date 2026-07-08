import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("home page routes users into the current PM delivery path", () => {
  const source = readFileSync("src/app/page.tsx", "utf8");

  assert.ok(source.includes("buildDevelopmentOverview"), "home page should reuse the development overview instead of drifting into a separate pitch");
  assert.ok(source.includes("overview.currentPipelineValidation.actionHref"), "home page should expose the real pipeline validation CTA");
  assert.ok(source.includes("overview.platformScope.statusLabel"), "home page should show the locked 8-platform scope");
  assert.ok(source.includes("overview.modelInterfaces.readyLabel"), "home page should show the model interface status");
  assert.ok(source.includes("overview.finalAcceptanceGate.title"), "home page should show the final product acceptance gate");
  assert.ok(source.includes("overview.finalAcceptanceGate.metrics.ready"), "home page should show ready count in the final gate");
  assert.ok(source.includes("overview.finalAcceptanceGate.metrics.watch"), "home page should show watch count in the final gate");
  assert.ok(source.includes("overview.finalAcceptanceGate.metrics.blocked"), "home page should show blocked count in the final gate");
  assert.ok(source.includes("overview.finalAcceptanceGate.stopRule"), "home page should show the PM stop rule");
  assert.ok(source.includes("overview.pipelineProofRoute.steps.map"), "home page should show the six-step proof route, not just page shortcuts");
  assert.ok(source.includes("overview.pipelineProofRoute.pmRule"), "home page should show the proof route rule");
  assert.ok(source.includes("step.passCondition"), "home page should show pass conditions for each route step");
  assert.ok(source.includes("step.stopRule"), "home page should show stop rules for each route step");
  assert.ok(source.includes("overview.nextActions.map"), "home page should surface the next delivery actions");
  assert.equal(source.includes("新增平台"), false, "home page must not point the user toward adding more platforms");
});
