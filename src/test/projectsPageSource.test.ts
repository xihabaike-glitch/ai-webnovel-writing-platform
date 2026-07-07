import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/app/projects/page.tsx", "utf8");
const projectFormSource = readFileSync("src/components/projects/ProjectForm.tsx", "utf8");

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

test("projects page shows the prioritized real sample acceptance queue", () => {
  assert.ok(source.includes("dashboard.realSampleAcceptanceQueue"));
  assert.ok(source.includes("真实样本验收队列"));
  assert.ok(source.includes("sample.projectTitle"));
  assert.ok(source.includes("sample.outcomeLabel"));
  assert.ok(source.includes("sample.reason"));
  assert.ok(source.includes("sample.actionHref"));
  assert.ok(source.includes("sample.actionLabel"));
});

test("projects page keeps a gate recheck return path visible", () => {
  assert.ok(source.includes("gateReturnFromParam"));
  assert.ok(source.includes("gateReturn"));
  assert.ok(source.includes("来自总闸门复检"));
  assert.ok(source.includes("回总闸门复检"));
});

test("projects page carries gate return through project action links", () => {
  assert.ok(source.includes("function hrefWithGateReturn"));
  assert.ok(source.includes("href={hrefWithGateReturn(dashboard.pmFocus.actionHref, gateReturn)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(dashboard.pipelineAcceptanceSummary.primaryActionHref, gateReturn)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(sample.actionHref, gateReturn)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(activePipelineAction.recommendedActionHref, gateReturn)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(step.filterHref, gateReturn)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(\"/projects#pipeline-projects\", gateReturn)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(`/projects/${item.id}${entry.projectAnchor}`, gateReturn)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(\"#create-project\", gateReturn, \"/projects\")}"));
  assert.ok(source.includes("href={hrefWithGateReturn(`/projects/${item.id}`, gateReturn)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(item.nextActionHref, gateReturn)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(item.realSampleValidation.nextActionHref, gateReturn)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(item.pipelineProof.nextActionHref, gateReturn)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(step.href, gateReturn)}"));
});

test("project creation keeps the gate return when entering first day workflow", () => {
  assert.ok(source.includes("<ProjectForm experienceLaunch={experienceLaunch} gateReturnHref={gateReturn} />"));
  assert.ok(projectFormSource.includes("gateReturnHref?: string | null"));
  assert.ok(projectFormSource.includes("function hrefWithGateReturn"));
  assert.ok(projectFormSource.includes("router.push(hrefWithGateReturn(`/projects/${payload.project.id}${params}#first-day-workflow`, gateReturnHref));"));
});
