import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/app/docs/page.tsx", "utf8");

test("docs page sends validation CTAs to the real pipeline receipt", () => {
  const pipelineHrefUses = source.match(/href=\{overview\.currentPipelineValidation\.actionHref\}/g) ?? [];

  assert.ok(source.includes("overview.currentPipelineValidation.actionLabel"));
  assert.ok(
    pipelineHrefUses.length >= 2,
    "both the pipeline proof CTA and the observation CTA should jump to /projects#pipeline-projects",
  );
});
