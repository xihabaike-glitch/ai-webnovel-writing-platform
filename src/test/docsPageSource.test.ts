import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/app/docs/page.tsx", "utf8");

test("docs page sends validation CTAs to the real pipeline receipt", () => {
  const pipelineHrefUses = source.match(/href=\{overview\.currentPipelineValidation\.actionHref\}/g) ?? [];

  assert.ok(source.includes("overview.currentPipelineValidation.actionLabel"));
  assert.ok(
    pipelineHrefUses.length >= 3,
    "the traceability, pipeline proof, and observation CTAs should all use the current PM validation route",
  );
});

test("docs page renders original requirement traceability", () => {
  assert.ok(source.includes("overview.requirementTraceability.headline"));
  assert.ok(source.includes("overview.requirementTraceability.pmRule"));
  assert.ok(source.includes("overview.requirementTraceability.items.map"));
  assert.ok(source.includes("item.originalRequest"));
  assert.ok(source.includes("item.currentEvidence"));
  assert.ok(source.includes("item.acceptanceSignal"));
});

test("docs page renders the visible acceptance criteria map", () => {
  assert.ok(source.includes("visibleAcceptanceCriteriaMap"));
  assert.ok(source.includes("端到端可见验收口径地图"));
  assert.ok(source.includes("entry.route"));
  assert.ok(source.includes("entry.criteria"));
  assert.ok(source.includes("entry.proof"));

  for (const criterion of ["开书与发布复盘", "任务回执", "派单回执", "总闸门放量", "失败修复"]) {
    assert.ok(source.includes(criterion), `${criterion} should be visible on the docs page`);
  }
});

test("docs page renders the final acceptance evidence matrix", () => {
  assert.ok(source.includes("overview.finalAcceptanceGate.evidenceMatrix.title"));
  assert.ok(source.includes("overview.finalAcceptanceGate.evidenceMatrix.pmRule"));
  assert.ok(source.includes("overview.finalAcceptanceGate.evidenceMatrix.items.map"));
  assert.ok(source.includes("item.requirementTitle"));
  assert.ok(source.includes("item.currentProof"));
  assert.ok(source.includes("item.missingEvidence"));
  assert.ok(source.includes("item.nextAction"));
  assert.ok(source.includes("item.evidenceHref"));
});
