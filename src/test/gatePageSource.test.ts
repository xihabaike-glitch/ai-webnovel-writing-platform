import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/app/gate/page.tsx", "utf8");

test("gate page shows invalid focus feedback", () => {
  assert.ok(source.includes("invalidFocusNotice"));
  assert.ok(source.includes("focus ? `总闸门焦点「${focus}」不存在，已显示总闸门全局验收。` : null"));
  assert.ok(source.includes("焦点已回退"));
  assert.ok(source.includes("查看总闸门"));
  assert.ok(source.includes("href=\"/gate\""));
});

test("gate page forwards action recheck focus params", () => {
  assert.ok(source.includes("value === \"action-recheck\""));
  assert.ok(source.includes("actionId"));
  assert.ok(source.includes("source?: string | string[]"));
  assert.ok(source.includes("finalDeliveryFocus?: string | string[]"));
  assert.ok(source.includes("const source = Array.isArray(params?.source) ? params?.source[0] : params?.source ?? null"));
  assert.ok(source.includes("const finalDeliveryFocus = Array.isArray(params?.finalDeliveryFocus) ? params?.finalDeliveryFocus[0] : params?.finalDeliveryFocus ?? null"));
  assert.ok(source.includes("if (source) params.set(\"source\", source);"));
  assert.ok(source.includes("if (finalDeliveryFocus) params.set(\"finalDeliveryFocus\", finalDeliveryFocus);"));
  assert.ok(source.includes("focusedProjectId: projectId ?? undefined"));
  assert.ok(source.includes("buildPrePublishGateFocusNotice({ focus, projectId, actionId, gate })"));
  assert.ok(source.includes("id=\"gate-focus-notice\""));
});

test("gate page includes final delivery receipts in recheck context", () => {
  assert.ok(source.includes("executionType: { in: [\"recommended_batch\", \"export_version\", \"manual\"] }"));
  assert.ok(source.includes("finalDeliveryReceiptFocus"));
  assert.ok(source.includes("source === \"final-delivery-receipt\""));
  assert.ok(source.includes("最终交付回执已带回总闸门"));
  assert.ok(source.includes("来自作品发布中心的最终交付写回"));
});

test("gate page renders real sample receipt recheck context", () => {
  assert.ok(source.includes("realSampleReceiptFocus"));
  assert.ok(source.includes("source === \"real-sample-receipt\""));
  assert.ok(source.includes("真实作品流水线样本回执复检"));
  assert.ok(source.includes("来自作品页真实样本验收队列"));
  assert.ok(source.includes("realSampleReceiptProjectTitle"));
  assert.ok(source.includes("真实样本回执已带回总闸门"));
  assert.ok(source.includes("href={hrefWithGateReturn(`/projects/${projectId}#pipeline-projects`, gateRecheckReturnHref)}"));
});

test("gate page surfaces the latest opening sample receipt in real sample focus", () => {
  assert.ok(source.includes("latestOpeningSampleReceipt"));
  assert.ok(source.includes("project-acceptance:opening_sample:"));
  assert.ok(source.includes("openingSampleReceiptProjectId"));
  assert.ok(source.includes("replace(\"project-acceptance:opening_sample:\", \"\")"));
  assert.ok(source.includes("openingSampleReceiptLines"));
  assert.ok(source.includes("latestOpeningSampleReceipt.message.split"));
  assert.ok(source.includes("首章样本回执已接收"));
  assert.ok(source.includes("openingSampleReceiptLines.map"));
  assert.ok(source.includes("latestOpeningSampleReceipt.href"));
});

test("gate page turns opening sample receipts into quality gate recheck branches", () => {
  assert.ok(source.includes("openingSampleRecheckActions"));
  assert.ok(source.includes("首章回执复检分流"));
  assert.ok(source.includes("继续审稿二改"));
  assert.ok(source.includes("#chapter-workflow"));
  assert.ok(source.includes("补作品证据"));
  assert.ok(source.includes("#pipeline-projects"));
  assert.ok(source.includes("暂停批量检查"));
  assert.ok(source.includes("openingSampleRecheckActions.map"));
});

test("gate page renders real sample final review checklist", () => {
  assert.ok(source.includes("buildDevelopmentOverview"));
  assert.ok(source.includes("overview.currentPipelineValidation.finalReview"));
  assert.ok(source.includes("真实作品流水线终检"));
  assert.ok(source.includes("overview.currentPipelineValidation.finalReview.title"));
  assert.ok(source.includes("overview.currentPipelineValidation.finalReview.passSignals.map"));
  assert.ok(source.includes("overview.currentPipelineValidation.finalReview.repairSignals.map"));
  assert.ok(source.includes("overview.currentPipelineValidation.finalReview.holdBatchSignals.map"));
  assert.ok(source.includes("overview.currentPipelineValidation.finalReview.receiptHref"));
});

test("gate page renders computed real pipeline final review verdict", () => {
  assert.ok(source.includes("gate.realPipelineFinalReview"));
  assert.ok(source.includes("const finalReview = gate.realPipelineFinalReview;"));
  assert.ok(source.includes("buildGateFinalDeliveryReceiptReview"));
  assert.ok(source.includes("finalDeliveryReceiptReview"));
  assert.ok(source.includes("function hrefWithFinalDeliveryFocus"));
  assert.ok(source.includes("finalDeliveryFocus="));
  assert.ok(source.includes("真实作品流水线自动终检"));
  assert.ok(source.includes("id=\"pipeline-final-review\""));
  assert.ok(source.includes("finalReview.outcomeLabel"));
  assert.ok(source.includes("finalReview.headline"));
  assert.ok(source.includes("finalReview.detail"));
  assert.ok(source.includes("finalReview.primaryActionHref"));
  assert.ok(source.includes("finalReview.evidence.map"));
  assert.ok(source.includes("finalReview.passSignals.map"));
  assert.ok(source.includes("finalReview.repairSignals.map"));
  assert.ok(source.includes("finalReview.holdBatchSignals.map"));
  assert.ok(source.includes("六项放行证据台账"));
  assert.ok(source.includes("finalDeliveryReceiptReview.items.map"));
  assert.ok(source.includes("finalDeliveryReceiptReview.remainingFeedback"));
  assert.ok(source.includes("href={hrefWithGateReturn(hrefWithFinalDeliveryFocus(item.href, item.id), gateRecheckReturnHref)}"));
  assert.ok(
    source.indexOf("真实作品流水线自动终检") < source.indexOf("{realSampleReceiptFocus ? ("),
    "computed final review should be visible on the gate before receipt-specific context",
  );
  assert.ok(
    source.indexOf("id=\"pipeline-final-review\"") < source.indexOf("六项放行证据台账"),
    "final delivery evidence ledger should stay inside the always-visible final review section",
  );
});

test("gate page summarizes final delivery closeout across task and dispatch receipts", () => {
  assert.ok(source.includes("buildGateDispatchTaskCenter"));
  assert.ok(source.includes("buildTaskRunConsole"));
  assert.ok(source.includes("finalDeliveryGateCloseoutPercent"));
  assert.ok(source.includes("最终交付总闸门面板"));
  assert.ok(source.includes("aria-label=\"最终交付总闸门进度\""));
  assert.ok(source.includes("finalDeliveryGateReleaseLabel"));
  assert.ok(source.includes("finalDeliveryGateNextCutLabel"));
  assert.ok(source.includes("发布卡点"));
  assert.ok(source.includes("派单未闭环"));
  assert.ok(source.includes("AI 未收口"));
  assert.ok(source.includes("进入最终交付判断"));
});

test("gate page breaks final delivery gaps into closeout lanes", () => {
  assert.ok(source.includes("finalDeliveryGateGapLanes"));
  assert.ok(source.includes("最终交付缺口拆解"));
  assert.ok(source.includes("发布卡点"));
  assert.ok(source.includes("派单回执"));
  assert.ok(source.includes("AI 任务"));
  assert.ok(source.includes("最终交付回执"));
  assert.ok(source.includes("lane.count"));
  assert.ok(source.includes("lane.nextAction"));
  assert.ok(source.includes("lane.href"));
  assert.ok(source.includes("finalDeliveryGateGapLanes.map"));
});

test("gate page links final delivery blockers to the matching closeout surface", () => {
  assert.ok(source.includes("buildFinalDeliveryGateCloseout"));
  assert.ok(source.includes("finalDeliveryGatePrimaryActionHref"));
  assert.ok(source.includes("finalDeliveryGatePrimaryActionLabel"));
  assert.ok(source.includes("finalDeliveryGateSecondaryActions"));
  assert.ok(source.includes("dispatchActiveCount: finalDeliveryDispatchCloseout.summary.active"));
  assert.ok(source.includes("aiOpenCount: finalDeliveryGateAiGapCount"));
  assert.ok(source.includes("aria-label=\"最终交付行动入口\""));
  assert.ok(source.includes("finalDeliveryGateSecondaryActions.map"));
});

test("gate page locks the final delivery exit until every closeout lane is clear", () => {
  assert.ok(source.includes("buildFinalDeliveryGateCloseout"));
  assert.ok(source.includes("finalDeliveryGateLocked"));
  assert.ok(source.includes("finalDeliveryGateLockLabel"));
  assert.ok(source.includes("finalDeliveryGateDeliveryHref"));
  assert.ok(source.includes("缺口清零后开放"));
  assert.ok(source.includes("aria-label=\"最终交付锁定提示\""));
  assert.ok(source.includes("aria-disabled=\"true\""));
  assert.ok(source.includes("!finalDeliveryGateLocked ? ("));
  assert.ok(source.includes("href={hrefWithGateReturn(finalDeliveryGateDeliveryHref, gateRecheckReturnHref)}"));
});

test("gate page renders the final delivery formal release card", () => {
  assert.ok(source.includes("gate.finalDeliveryRelease.status"));
  assert.ok(source.includes("最终交付正式放行卡"));
  assert.ok(source.includes("aria-label=\"最终交付正式放行卡\""));
  assert.ok(source.includes("gate.finalDeliveryRelease.pmVerdict"));
  assert.ok(source.includes("gate.finalDeliveryRelease.evidence.map"));
  assert.ok(source.includes("gate.finalDeliveryRelease.actionLabel"));
});

test("gate page keeps the formal release verdict visible before it is ready", () => {
  assert.equal(source.includes("{gate.finalDeliveryRelease.status === \"ready\" ? ("), false);
  assert.ok(source.includes("aria-label=\"最终交付正式放行判定\""));
  assert.ok(source.includes("gate.finalDeliveryRelease.status === \"ready\" ? \"正式放行证据\" : \"未放行依据\""));
});

test("gate page renders final delivery platform tactic archive cards", () => {
  assert.ok(source.includes("gate.finalDeliveryPlatformTacticArchives"));
  assert.ok(source.includes("平台打法归档卡"));
  assert.ok(source.includes("用这条打法开新书"));
  assert.ok(source.includes("archive.reuseHref"));
  assert.ok(source.includes("archive.stopLine"));
  assert.ok(source.includes("archive.evidence.map"));
});

test("gate page renders action recheck summary feedback", () => {
  assert.ok(source.includes("GateRecheckDispatchButton"));
  assert.ok(source.includes("focusNotice.recheckSummary"));
  assert.ok(source.includes("项目验收单回填"));
  assert.ok(source.includes("复检结论"));
  assert.ok(source.includes("focusNotice.recheckSummary.recheckVerdict.label"));
  assert.ok(source.includes("focusNotice.recheckSummary.recheckVerdict.detail"));
  assert.ok(source.includes("下一动作分流"));
  assert.ok(source.includes("focusNotice.recheckSummary.nextStep.label"));
  assert.ok(source.includes("focusNotice.recheckSummary.nextStep.detail"));
  assert.ok(source.includes("已完成 {focusNotice.recheckSummary.completedSteps}/{focusNotice.recheckSummary.totalSteps} 步"));
  assert.ok(source.includes("最近回填"));
  assert.ok(source.includes("复检分流收据"));
  assert.ok(source.includes("focusNotice.recheckSummary.latestRecheckReceipt"));
  assert.ok(source.includes("本次已关闭"));
  assert.ok(source.includes("focusNotice.recheckSummary.closedItems"));
  assert.ok(source.includes("剩余卡点"));
  assert.ok(source.includes("focusNotice.recheckSummary.nextDispatch"));
});

test("gate page renders archive experience recheck receipt evidence", () => {
  assert.ok(source.includes("focusNotice.archiveExperienceRecheck"));
  assert.ok(source.includes("归档经验复检回执"));
  assert.ok(source.includes("archiveExperienceRecheck.latestTaskId"));
  assert.ok(source.includes("archiveExperienceRecheck.latestTaskStatus"));
  assert.ok(source.includes("archiveExperienceRecheck.scopeLabel"));
  assert.ok(source.includes("archiveExperienceRecheck.evidence.map"));
  assert.ok(source.includes("archiveExperienceRecheck.nextActionHref"));
  assert.ok(source.includes("actionId === \"archive-experience\""));
});

test("gate page renders role closure recheck progress", () => {
  assert.ok(source.includes("focusNotice.recheckSummary.roleClosureProgress"));
  assert.ok(source.includes("角色闭环进度"));
  assert.ok(source.includes("roleClosureProgress.headline"));
  assert.ok(source.includes("roleClosureProgress.lanes.map"));
  assert.ok(source.includes("lane.status === \"done\""));
  assert.ok(source.includes("lane.evidence"));
});

test("gate page renders first-three adoption recheck progress", () => {
  assert.ok(source.includes("focusNotice.recheckSummary.firstThreeAdoptionProgress"));
  assert.ok(source.includes("采纳后续闭环"));
  assert.ok(source.includes("adoptionProgress.headline"));
  assert.ok(source.includes("adoptionProgress.lanes.map"));
  assert.ok(source.includes("lane.status === \"done\""));
  assert.ok(source.includes("lane.nextActionLabel"));
  assert.ok(source.includes("href={hrefWithGateReturn(lane.href, gateRecheckReturnHref)}"));
});

test("gate page labels prioritized remaining blockers", () => {
  assert.ok(source.includes("focusNotice.recheckSummary.blockerGroups"));
  assert.ok(source.includes("可放行后处理"));
  assert.ok(source.includes("group.label"));
  assert.ok(source.includes("group.detail"));
  assert.ok(source.includes("group.items"));
  assert.ok(source.includes("blocker.priorityLabel"));
  assert.ok(source.includes("blocker.evidence"));
  assert.ok(source.includes("href={hrefWithGateReturn(blocker.href, gateRecheckReturnHref)}"));
  assert.ok(source.includes("blocker.actionLabel"));
});

test("gate page carries action recheck return paths into gate item links", () => {
  assert.ok(source.includes("gateRecheckReturnHref"));
  assert.ok(source.includes("hrefWithGateReturn"));
  assert.ok(source.includes("base.includes(\"gateReturn=\")"));
  assert.ok(source.includes("focus === \"action-recheck\""));
  assert.ok(source.includes("finalDeliveryFocus={finalDeliveryFocus}"));
  assert.ok(source.includes("href={hrefWithGateReturn(gate.releaseAction.href, gateRecheckReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(gate.pmFocus.actionHref, gateRecheckReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(focusNotice.primaryHref, gateRecheckReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(item.href, gateRecheckReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(project.href, gateRecheckReturnHref)}"));
});

test("gate page carries action recheck return paths into failure repair links", () => {
  assert.ok(source.includes("href={hrefWithGateReturn(gate.failureRepairBatch.primaryActionHref, gateRecheckReturnHref)}"));
});

test("gate page carries action recheck return paths into pipeline links", () => {
  assert.ok(source.includes("href={hrefWithGateReturn(gate.pmFocus.pipelineActionHref, gateRecheckReturnHref)}"));
});

test("gate page carries action recheck return paths into acceptance sheet links", () => {
  assert.ok(source.includes("href={hrefWithGateReturn(\"/projects#pipeline-projects\", gateRecheckReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(project.acceptanceSheetGate.href, gateRecheckReturnHref)}"));
});

test("gate page carries action recheck return paths into AI recovery links", () => {
  assert.ok(source.includes("href={hrefWithGateReturn(aiRecoveryPanel.primaryAction.href, gateRecheckReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(aiRecoveryPanel.currentConclusion.href, gateRecheckReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(aiRecoveryPanel.latestEvidence.href, gateRecheckReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(aiRecoveryPanel.promptMemory.actionHref, gateRecheckReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(group.actionHref, gateRecheckReturnHref)}"));
});

test("gate page renders project acceptance sheet blockers", () => {
  assert.ok(source.includes("项目验收单联动"));
  assert.ok(source.includes("gate.projectStatuses.filter((project) => project.acceptanceSheetGate.status !== \"pass\")"));
  assert.ok(source.includes("project.acceptanceSheetGate.label"));
  assert.ok(source.includes("project.acceptanceSheetGate.detail"));
  assert.ok(source.includes("project.acceptanceSheetGate.executionHint"));
  assert.ok(source.includes("当前实跑动作"));
  assert.ok(source.includes("project.acceptanceSheetGate.runbookStep.title"));
  assert.ok(source.includes("project.acceptanceSheetGate.runbookStep.sampleAction"));
  assert.ok(source.includes("project.acceptanceSheetGate.runbookStep.proofToCapture"));
  assert.ok(source.includes("project.acceptanceSheetGate.runbookStep.rollbackIfWeak"));
  assert.ok(source.includes("验收回执模板"));
  assert.ok(source.includes("project.acceptanceSheetGate.receiptTemplate.map"));
  assert.ok(source.includes("href={hrefWithGateReturn(project.acceptanceSheetGate.dispatchDraftHref, gateRecheckReturnHref)}"));
  assert.ok(source.includes("生成派单草稿"));
  assert.ok(source.includes("project.acceptanceSheetGate.href"));
});

test("gate page feeds model role blockers into the final gate", () => {
  assert.ok(source.includes("buildModelRoleMatrix"));
  assert.ok(source.includes("buildModelRoleMatrixPriorityBlocker"));
  assert.ok(source.includes("const modelRolePriorityBlocker = buildModelRoleMatrixPriorityBlocker(modelRoleMatrix);"));
  assert.ok(source.includes("modelRoleBlocker: modelRolePriorityBlocker"));
});
