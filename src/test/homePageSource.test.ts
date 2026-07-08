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
  assert.ok(source.includes("overview.finalAcceptanceGate.evidenceMatrix.title"), "home page should show the original requirement evidence matrix");
  assert.ok(source.includes("overview.finalAcceptanceGate.evidenceMatrix.pmRule"), "home page should show the matrix proof rule");
  assert.ok(source.includes("overview.finalAcceptanceGate.evidenceMatrix.items.map"), "home page should render each final acceptance evidence row");
  assert.ok(source.includes("overview.finalAcceptanceGate.livePipelineReview.title"), "home page should show the live final review entry");
  assert.ok(source.includes("overview.finalAcceptanceGate.livePipelineReview.href"), "home page should link to the live gate verdict");
  assert.ok(source.includes("overview.finalAcceptanceGate.livePipelineReview.outcomeLabels.map"), "home page should show the three live verdict outcomes");
  assert.ok(source.includes("item.currentProof"), "home page should show current proof for each original requirement");
  assert.ok(source.includes("item.missingEvidence"), "home page should show remaining gap for each original requirement");
  assert.ok(source.includes("item.nextAction"), "home page should show next action for each original requirement");
  assert.ok(source.includes("item.evidenceHref"), "home page should link each requirement to its evidence");
  assert.ok(source.includes("overview.pipelineProofRoute.steps.map"), "home page should show the six-step proof route, not just page shortcuts");
  assert.ok(source.includes("overview.pipelineProofRoute.pmRule"), "home page should show the proof route rule");
  assert.ok(source.includes("step.passCondition"), "home page should show pass conditions for each route step");
  assert.ok(source.includes("step.stopRule"), "home page should show stop rules for each route step");
  assert.ok(source.includes("overview.nextActions.map"), "home page should surface the next delivery actions");
  assert.equal(source.includes("新增平台"), false, "home page must not point the user toward adding more platforms");
});
