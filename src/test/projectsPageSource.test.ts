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
  assert.ok(source.includes("invalidPipelineStep"));
  assert.ok(source.includes("pipelineStepParam ? `流水线步骤「${pipelineStepParam}」不存在，已显示全部作品。` : null"));
  assert.ok(source.includes("invalidPipelineStep ?"));
  assert.ok(source.includes("activePipelineValidationReceipt.headline"));
  assert.ok(source.includes("activePipelineValidationReceipt.proofPrompt"));
  assert.ok(source.includes("activePipelineValidationReceipt.requiredEvidence.map"));
  assert.ok(source.includes("activePipelineValidationReceipt.stopIfMissing.map"));
});

test("projects page shows portfolio pipeline acceptance outcomes", () => {
  assert.ok(source.includes("dashboard.pipelineAcceptanceSummary"));
  assert.ok(source.includes("真实流水线验收判定"));
  assert.ok(source.includes("dashboard.pipelineAcceptanceSummary.passCount"));
  assert.ok(source.includes("dashboard.pipelineAcceptanceSummary.repairCount"));
  assert.ok(source.includes("dashboard.pipelineAcceptanceSummary.holdBatchCount"));
  assert.ok(source.includes("dashboard.pipelineAcceptanceSummary.primaryActionHref"));
  assert.ok(source.includes("dashboard.pipelineAcceptanceSummary.primaryActionLabel"));
});
