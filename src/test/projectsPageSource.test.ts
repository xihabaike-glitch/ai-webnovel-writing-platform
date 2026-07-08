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

test("projects page shows evidence and stop rules on every portfolio pipeline step card", () => {
  assert.ok(source.includes("step.validationReceipt.requiredEvidence[0]"), "step cards should expose the first required evidence before users click");
  assert.ok(source.includes("step.validationReceipt.stopIfMissing[0]"), "step cards should expose the first stop rule before users click");
  assert.ok(source.includes("验收口径："), "step cards should name the evidence line as an acceptance rule");
  assert.ok(source.includes("停手线："), "step cards should name the stop rule line clearly");
});

test("projects page shows portfolio pipeline acceptance outcomes", () => {
  assert.ok(source.includes("dashboard.pipelineAcceptanceSummary"));
  assert.ok(source.includes("真实流水线验收判定"));
  assert.ok(source.includes("真实流水线收口面板"));
  assert.ok(source.includes("pipelineAcceptanceCloseoutPercent"));
  assert.ok(source.includes("aria-label=\"真实流水线完成率\""));
  assert.ok(source.includes("pipelineAcceptanceReleaseLabel"));
  assert.ok(source.includes("pipelineAcceptanceNextCutLabel"));
  assert.ok(source.includes("放行判断"));
  assert.ok(source.includes("收口缺口"));
  assert.ok(source.includes("下一刀"));
  assert.ok(source.includes("真实作品流水线终检"));
  assert.ok(source.includes("overview.currentPipelineValidation.finalReview"));
  assert.ok(source.includes("overview.currentPipelineValidation.finalReview.title"));
  assert.ok(source.includes("overview.currentPipelineValidation.finalReview.passSignals.map"));
  assert.ok(source.includes("overview.currentPipelineValidation.finalReview.repairSignals.map"));
  assert.ok(source.includes("overview.currentPipelineValidation.finalReview.holdBatchSignals.map"));
  assert.ok(source.includes("overview.currentPipelineValidation.finalReview.receiptHref"));
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
  assert.ok(source.includes("当前实跑动作"));
  assert.ok(source.includes("sample.runbookStep.title"));
  assert.ok(source.includes("sample.runbookStep.sampleAction"));
  assert.ok(source.includes("sample.runbookStep.proofToCapture"));
  assert.ok(source.includes("sample.runbookStep.rollbackIfWeak"));
  assert.ok(source.includes("已收证据"));
  assert.ok(source.includes("缺口退回"));
  assert.ok(source.includes("sample.completedEvidence.slice(0, 2).map"));
  assert.ok(source.includes("sample.missingEvidence.slice(0, 2).map"));
  assert.ok(source.includes("sample.actionHref"));
  assert.ok(source.includes("sample.actionLabel"));
});

test("projects page renders real sample receipt templates for the final gate", () => {
  assert.ok(source.includes("真实作品流水线样本回执"));
  assert.ok(source.includes("sample.receipt.title"));
  assert.ok(source.includes("sample.receipt.ownerRole"));
  assert.ok(source.includes("sample.receipt.outcomeLabel"));
  assert.ok(source.includes("sample.receipt.fields.map"));
  assert.ok(source.includes("field.label"));
  assert.ok(source.includes("field.value"));
  assert.ok(source.includes("sample.receipt.stopRule"));
  assert.ok(source.includes("sample.receipt.ownerConfirmation"));
  assert.ok(source.includes("sample.receipt.evidenceHref"));
  assert.ok(source.includes("sample.receipt.gateRecheckHref"));
  assert.ok(source.includes("sample.receipt.finalReleaseHref"));
  assert.ok(source.includes("sample.receipt.finalReleaseLabel"));
  assert.ok(source.includes("回总闸门复检"));
});

test("projects page shows the portfolio production closure summary", () => {
  assert.ok(source.includes("dashboard.productionClosureSummary"));
  assert.ok(source.includes("组合生产闭环"));
  assert.ok(source.includes("productionLane.allowCount"));
  assert.ok(source.includes("productionLane.watchCount"));
  assert.ok(source.includes("productionLane.blockCount"));
  assert.ok(source.includes("productionLane.actionHref"));
  assert.ok(source.includes("productionLane.actionLabel"));
});

test("projects page filters project cards by production closure lane", () => {
  assert.ok(source.includes("closureLaneParam"));
  assert.ok(source.includes("activeProductionClosureLane"));
  assert.ok(source.includes("invalidClosureLane"));
  assert.ok(source.includes("function projectsFilterHref"));
  assert.ok(source.includes("activeFilterChips"));
  assert.ok(source.includes("当前筛选条件"));
  assert.ok(source.includes("清除这个条件"));
  assert.ok(source.includes("pipelineFilteredItems"));
  assert.ok(source.includes("item.productionClosure.some((closure) => closure.id === activeProductionClosureLane.id && closure.status !== \"allow\")"));
  assert.ok(source.includes("projectsFilterHref({ pipelineStepId: activePipelineStep?.id ?? null, closureLaneId: productionLane.id })"));
  assert.ok(source.includes("projectsFilterHref({ pipelineStepId: step.id, closureLaneId: activeProductionClosureLane?.id ?? null })"));
  assert.ok(source.includes("projectsFilterHref({ pipelineStepId: null, closureLaneId: activeProductionClosureLane?.id ?? null })"));
  assert.ok(source.includes("projectsFilterHref({ pipelineStepId: activePipelineStep?.id ?? null, closureLaneId: null })"));
  assert.ok(source.includes("当前只看生产闭环"));
  assert.ok(source.includes("activeProductionClosureCountLabel"));
  assert.ok(source.includes("visibleItems.length"));
  assert.ok(source.includes("这条生产闭环当前没有未放行作品"));
});

test("projects page renders role closure progress on project cards", () => {
  assert.ok(source.includes('{ dispatchKey: { startsWith: "role-intent:" } }'));
  assert.ok(source.includes("item.roleClosureProgress"));
  assert.ok(source.includes("角色闭环进度"));
  assert.ok(source.includes("item.roleClosureProgress.headline"));
  assert.ok(source.includes("item.roleClosureProgress.lanes.map"));
  assert.ok(source.includes("lane.status === \"done\""));
  assert.ok(source.includes("lane.evidence"));
});

test("projects page renders production closure lanes on each project card", () => {
  assert.ok(source.includes("item.productionClosure.map"));
  assert.ok(source.includes("单本生产闭环"));
  assert.ok(source.includes("closure.statusLabel"));
  assert.ok(source.includes("closure.detail"));
  assert.ok(source.includes("closure.actionHref"));
  assert.ok(source.includes("closure.actionLabel"));
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
  assert.ok(source.includes("href={hrefWithGateReturn(projectsFilterHref({ pipelineStepId: step.id, closureLaneId: activeProductionClosureLane?.id ?? null }), gateReturn)}"));
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

test("project form makes short, mid, long, and mega length presets executable", () => {
  assert.ok(projectFormSource.includes("targetWordCount: 10000"));
  assert.ok(projectFormSource.includes("targetWordCount: 60000"));
  assert.ok(projectFormSource.includes("targetWordCount: 300000"));
  assert.ok(projectFormSource.includes("targetWordCount: 1000000"));
  assert.ok(projectFormSource.includes("const selectedLengthOption = lengthOptionFor(lengthType)"));
  assert.ok(projectFormSource.includes("setTargetWordCount(nextLengthOption.targetWordCount)"));
  assert.ok(projectFormSource.includes('name="targetWordCount"'));
  assert.ok(projectFormSource.includes("毒舌 PM 篇幅口径"));
});

test("project form surfaces first-day execution outcomes before creation", () => {
  assert.ok(projectFormSource.includes("function firstDayExecutionOutcome"));
  assert.ok(projectFormSource.includes("const firstDayOutcome = firstDayExecutionOutcome"));
  assert.ok(projectFormSource.includes("首日执行结论"));
  assert.ok(projectFormSource.includes("可以扩展"));
  assert.ok(projectFormSource.includes("继续观察"));
  assert.ok(projectFormSource.includes("先避坑"));
  assert.ok(projectFormSource.includes("执行扩展"));
  assert.ok(projectFormSource.includes("执行观察"));
  assert.ok(projectFormSource.includes("执行避坑"));
  assert.ok(projectFormSource.includes("firstDayOutcome.nextMove"));
  assert.ok(projectFormSource.includes("firstDayOutcome.boundary"));
});

test("project form surfaces final delivery archive reuse before creation", () => {
  assert.ok(projectFormSource.includes("finalDeliveryArchiveBridge"));
  assert.ok(projectFormSource.includes("最终交付归档回灌"));
  assert.ok(projectFormSource.includes("交付归档正在反向喂给这次开书"));
  assert.ok(projectFormSource.includes("archiveSignal"));
  assert.ok(projectFormSource.includes("recommendedPlatformLabel"));
  assert.ok(projectFormSource.includes("recommendedTemplateLabel"));
  assert.ok(projectFormSource.includes("selectedArchiveEvidence"));
  assert.ok(projectFormSource.includes("selectedArchiveNextUse"));
  assert.ok(projectFormSource.includes("startExperienceHandoff.firstDayActions.slice(0, 2).map"));
  assert.ok(projectFormSource.includes("startExperienceHandoff.avoidRules.slice(0, 2).map"));
  assert.ok(projectFormSource.includes("hrefWithGateReturn(\"/gate?focus=action-recheck&source=platform-tactic-experience#platform-tactic-experience\", gateReturnHref)"));
  assert.equal(projectFormSource.includes("hrefWithGateReturn(\"/gate#platform-tactic-experience\", gateReturnHref)"), false);
});
