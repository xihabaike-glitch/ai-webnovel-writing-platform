import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/app/projects/page.tsx", "utf8");

test("projects page shows the portfolio pipeline bottleneck receipt", () => {
  assert.ok(source.includes("dashboard.pipelineProofSummary.validationReceipt.headline"));
  assert.ok(source.includes("dashboard.pipelineProofSummary.validationReceipt.proofPrompt"));
  assert.ok(source.includes("dashboard.pipelineProofSummary.validationReceipt.requiredEvidence.map"));
  assert.ok(source.includes("dashboard.pipelineProofSummary.validationReceipt.stopIfMissing.map"));
});
