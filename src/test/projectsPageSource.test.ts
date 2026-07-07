import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/app/projects/page.tsx", "utf8");

test("projects page shows the portfolio pipeline bottleneck receipt", () => {
  assert.ok(source.includes("activePipelineValidationReceipt"));
  assert.ok(source.includes("activePipelineStep?.validationReceipt ?? dashboard.pipelineProofSummary.validationReceipt"));
  assert.ok(source.includes("activePipelineAction"));
  assert.ok(source.includes("activePipelineStep?.recommendedActionHref ?? dashboard.pipelineProofSummary.recommendedActionHref"));
  assert.ok(source.includes("activePipelineAction.recommendedActionHref"));
  assert.ok(source.includes("activePipelineAction.recommendedActionLabel"));
  assert.ok(source.includes("activePipelineAction.recommendedProjectTitle"));
  assert.ok(source.includes("activePipelineSummary"));
  assert.ok(source.includes("activePipelineStep ? `当前筛选：${activePipelineStep.count}/${dashboard.pipelineProofSummary.totalProjects} 本卡在「${activePipelineStep.label}」。` : dashboard.pipelineProofSummary.headline"));
  assert.ok(source.includes("activePipelineSummary.headline"));
  assert.ok(source.includes("activePipelineSummary.countLabel"));
  assert.ok(source.includes("activePipelineValidationReceipt.headline"));
  assert.ok(source.includes("activePipelineValidationReceipt.proofPrompt"));
  assert.ok(source.includes("activePipelineValidationReceipt.requiredEvidence.map"));
  assert.ok(source.includes("activePipelineValidationReceipt.stopIfMissing.map"));
});
