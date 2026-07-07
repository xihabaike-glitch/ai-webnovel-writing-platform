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
