import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("project detail page exposes role workflow anchors", () => {
  const projectPage = readFileSync("src/app/projects/[projectId]/page.tsx", "utf8");
  const writingWorkbenchPanel = readFileSync("src/components/projects/WritingWorkbenchPanel.tsx", "utf8");
  const combinedSource = `${projectPage}\n${writingWorkbenchPanel}`;

  for (const anchor of ["story-structure", "context-recall", "platform-export"]) {
    assert.ok(
      combinedSource.includes(`id="${anchor}"`),
      `project detail workflow needs #${anchor} anchor`,
    );
  }
});

test("project detail role navigator renders role skill briefs", () => {
  const projectPage = readFileSync("src/app/projects/[projectId]/page.tsx", "utf8");

  assert.ok(projectPage.includes("entry.skillBriefs.map"));
  assert.ok(projectPage.includes("角色 Skill 口径"));
  assert.ok(projectPage.includes("brief.trigger"));
  assert.ok(projectPage.includes("brief.acceptance"));
  assert.ok(projectPage.includes("brief.modelOwner"));
});

test("project detail role navigator links role work to dispatch center", () => {
  const projectPage = readFileSync("src/app/projects/[projectId]/page.tsx", "utf8");

  assert.ok(projectPage.includes("roleDispatchHref"));
  assert.ok(projectPage.includes("roleIntent"));
  assert.ok(projectPage.includes("projectId"));
  assert.ok(projectPage.includes("entry.dispatchIntent.roleId"));
  assert.ok(projectPage.includes("entry.dispatchIntent.modelOwner"));
  assert.ok(projectPage.includes("entry.dispatchIntent.acceptance"));
  assert.ok(projectPage.includes("#dispatch-task-center"));
  assert.ok(projectPage.includes("去派单中心"));
});

test("project detail role navigator surfaces role dispatch completion evidence", () => {
  const projectPage = readFileSync("src/app/projects/[projectId]/page.tsx", "utf8");

  assert.ok(projectPage.includes('{ dispatchKey: { startsWith: "role-intent:" } }'));
  assert.ok(projectPage.includes("roleDispatchEvidenceByIntent"));
  assert.ok(projectPage.includes("roleDispatchEvidence"));
  assert.ok(projectPage.includes("entry.dispatchIntent.roleId"));
  assert.ok(projectPage.includes("角色派单状态"));
  assert.ok(projectPage.includes("完成依据"));
  assert.ok(projectPage.includes("roleDispatchEvidence.completionEvidence"));
  assert.ok(projectPage.includes("hrefWithGateReturn(`/dispatch#dispatch-${roleDispatchEvidence.dispatchKey}`, gateReturn)"));
});

test("project detail role navigator renders shared role closure progress", () => {
  const projectPage = readFileSync("src/app/projects/[projectId]/page.tsx", "utf8");

  assert.ok(projectPage.includes("dashboard.realSampleAcceptanceSheet.roleClosureProgress"));
  assert.ok(projectPage.includes("角色闭环进度"));
  assert.ok(projectPage.includes("roleClosureProgress.headline"));
  assert.ok(projectPage.includes("roleClosureProgress.lanes.map"));
  assert.ok(projectPage.includes("lane.status === \"done\""));
  assert.ok(projectPage.includes("lane.evidence"));
});

test("project detail page renders the single-project acceptance sheet", () => {
  const projectPage = readFileSync("src/app/projects/[projectId]/page.tsx", "utf8");

  assert.ok(projectPage.includes("dashboard.realSampleAcceptanceSheet"));
  assert.ok(projectPage.includes("单本作品验收单"));
  assert.ok(projectPage.includes("dashboard.realSampleAcceptanceSheet.completedSteps"));
  assert.ok(projectPage.includes("dashboard.realSampleAcceptanceSheet.totalSteps"));
  assert.ok(projectPage.includes("dashboard.realSampleAcceptanceSheet.missingEvidence.map"));
  assert.ok(projectPage.includes("证据缺口"));
  assert.ok(projectPage.includes("dashboard.realSampleAcceptanceSheet.blockReason"));
  assert.ok(projectPage.includes("item.actionLabel"));
  assert.ok(projectPage.includes("item.ownerRole"));
  assert.ok(projectPage.includes("item.executionHint"));
  assert.ok(projectPage.includes("item.dispatchDraftHref"));
  assert.ok(projectPage.includes("生成派单草稿"));
  assert.ok(projectPage.includes("dashboard.realSampleAcceptanceSheet.steps.map"));
  assert.ok(projectPage.includes("step.stopRule"));
  assert.ok(projectPage.includes("dashboard.realSampleAcceptanceSheet.actionHref"));
  assert.ok(projectPage.includes("dashboard.realSampleAcceptanceSheet.actionLabel"));
});

test("project detail page feeds story structure diagnostic into submission checklist", () => {
  const projectPage = readFileSync("src/app/projects/[projectId]/page.tsx", "utf8");

  assert.ok(projectPage.includes("buildStoryStructureDiagnostic"));
  assert.ok(projectPage.includes("const submissionStructureDiagnostic = buildStoryStructureDiagnostic"));
  assert.ok(projectPage.includes("structureDiagnostic: submissionStructureDiagnostic"));
});

test("project detail page keeps a gate recheck return path visible", () => {
  const projectPage = readFileSync("src/app/projects/[projectId]/page.tsx", "utf8");

  assert.ok(projectPage.includes("searchParams"));
  assert.ok(projectPage.includes("gateReturn"));
  assert.ok(projectPage.includes("来自总闸门复检"));
  assert.ok(projectPage.includes("回总闸门复检"));
});

test("project detail page carries gate return through project work entry links", () => {
  const projectPage = readFileSync("src/app/projects/[projectId]/page.tsx", "utf8");
  const writingWorkbenchPanel = readFileSync("src/components/projects/WritingWorkbenchPanel.tsx", "utf8");

  assert.ok(projectPage.includes("function hrefWithGateReturn"));
  assert.ok(projectPage.includes("<WritingWorkbenchPanel gateReturnHref={gateReturn} workbench={writingWorkbench} />"));
  assert.ok(projectPage.includes("href={hrefWithGateReturn(`/projects/${project.id}${entry.projectAnchor}`, gateReturn)}"));
  assert.ok(projectPage.includes("href={hrefWithGateReturn(dashboard.realSampleAcceptanceSheet.actionHref, gateReturn)}"));
  assert.ok(projectPage.includes("href={hrefWithGateReturn(step.href, gateReturn)}"));
  assert.ok(projectPage.includes("href={hrefWithGateReturn(`/projects/${project.id}/chapters/${dashboard.nextChapter.id}`, gateReturn)}"));
  assert.ok(projectPage.includes("href={hrefWithGateReturn(`/projects/${project.id}/exports`, gateReturn)}"));
  assert.ok(projectPage.includes("href={hrefWithGateReturn(`/projects/${project.id}/chapters/${chapter.id}`, gateReturn)}"));

  assert.ok(writingWorkbenchPanel.includes("gateReturnHref?: string | null"));
  assert.ok(writingWorkbenchPanel.includes("function hrefWithGateReturn"));
  assert.ok(writingWorkbenchPanel.includes("href={hrefWithGateReturn(workbench.heroAction.href, gateReturnHref)}"));
  assert.ok(writingWorkbenchPanel.includes("href={hrefWithGateReturn(link.href, gateReturnHref)}"));
  assert.ok(writingWorkbenchPanel.includes("href={hrefWithGateReturn(workbench.pmFocus.actionHref, gateReturnHref)}"));
  assert.ok(writingWorkbenchPanel.includes("href={hrefWithGateReturn(workbench.firstThreeAdoption.href, gateReturnHref)}"));
  assert.ok(writingWorkbenchPanel.includes("href={hrefWithGateReturn(candidate.href, gateReturnHref)}"));
  assert.ok(writingWorkbenchPanel.includes("href={hrefWithGateReturn(step.href, gateReturnHref)}"));
  assert.ok(writingWorkbenchPanel.includes("href={hrefWithGateReturn(asset.href, gateReturnHref)}"));
  assert.ok(writingWorkbenchPanel.includes("href={hrefWithGateReturn(block.href, gateReturnHref)}"));
});

test("project detail page carries gate return through control and batch panels", () => {
  const projectPage = readFileSync("src/app/projects/[projectId]/page.tsx", "utf8");
  const controlPanel = readFileSync("src/components/projects/ProjectControlDashboardPanel.tsx", "utf8");
  const controlActionsRoute = readFileSync("src/app/api/projects/[projectId]/control-actions/route.ts", "utf8");
  const batchDraftPanel = readFileSync("src/components/projects/BatchDraftCenterPanel.tsx", "utf8");
  const batchReviewPanel = readFileSync("src/components/projects/BatchReviewPipelinePanel.tsx", "utf8");
  const modelTaskAuditPanel = readFileSync("src/components/projects/ModelTaskAuditPanel.tsx", "utf8");

  assert.ok(projectPage.includes("<ProjectControlDashboardPanel gateReturnHref={gateReturn} projectId={project.id} />"));
  assert.ok(projectPage.includes("<BatchDraftCenterPanel gateReturnHref={gateReturn} projectId={project.id} />"));
  assert.ok(projectPage.includes("<BatchReviewPipelinePanel gateReturnHref={gateReturn} projectId={project.id} />"));
  assert.ok(projectPage.includes("<ModelTaskAuditPanel gateReturnHref={gateReturn} projectId={project.id} />"));

  assert.ok(controlPanel.includes("gateReturnHref?: string | null"));
  assert.ok(controlPanel.includes("function hrefWithGateReturn"));
  assert.ok(controlPanel.includes("href={hrefWithGateReturn(`/projects/${projectId}#${dashboard.storyFoundation.targetAnchor}`, gateReturnHref)}"));
  assert.ok(controlPanel.includes("href={hrefWithGateReturn(`/projects/${projectId}#${axis.targetAnchor}`, gateReturnHref)}"));
  assert.ok(controlPanel.includes("href={hrefWithGateReturn(`/projects/${projectId}#world-bible`, gateReturnHref)}"));
  assert.ok(controlPanel.includes("href={hrefWithGateReturn(message.actionHref, gateReturnHref)}"));
  assert.ok(controlPanel.includes("function productionDecisionClass"));
  assert.ok(controlPanel.includes("async function executeProductionDecisionAction"));
  assert.ok(controlPanel.includes("{dashboard.productionDecision.label}"));
  assert.ok(controlPanel.includes("{dashboard.productionDecision.reason}"));
  assert.ok(controlPanel.includes("{dashboard.productionDecision.dispatchLabel}"));
  assert.ok(controlPanel.includes("{dashboard.productionDecision.dispatchDetail}"));
  assert.ok(controlPanel.includes("dashboard.productionDecision.dispatchHref"));
  assert.ok(controlPanel.includes("dashboard.productionDecision.actionExecutable"));
  assert.ok(controlPanel.includes("onClick={() => void executeProductionDecisionAction()}"));
  assert.ok(controlPanel.includes("dashboard.productionDecision.primaryActionExecution === \"ai_pipeline_recheck\""));
  assert.ok(controlPanel.includes("onClick={() => void recheckBatchChecklist()}"));
  assert.ok(controlPanel.includes("href={hrefWithGateReturn(projectScopedHref(projectId, dashboard.productionDecision.primaryTargetHref), gateReturnHref)}"));
  assert.ok(controlActionsRoute.includes("if (areaId === \"model-route\")"));
  assert.ok(controlActionsRoute.includes("model-route-repair:"));
  assert.ok(controlActionsRoute.includes("模型路线修复派单"));
  assert.ok(controlPanel.includes("href={hrefWithGateReturn(projectScopedHref(projectId, dashboard.aiPipelineBatchHealth.targetHref), gateReturnHref)}"));
  assert.ok(controlPanel.includes("href={hrefWithGateReturn(projectScopedHref(projectId, dashboard.aiPipelinePromptMemory.targetHref), gateReturnHref)}"));
  assert.ok(controlPanel.includes("href={hrefWithGateReturn(projectScopedHref(projectId, dashboard.aiPipelinePromptMemory.gateActionHref), gateReturnHref)}"));
  assert.ok(controlPanel.includes("href={hrefWithGateReturn(projectScopedHref(projectId, dashboard.aiPipelineControlPlan.recheckActionHref), gateReturnHref)}"));
  assert.ok(controlPanel.includes("href={hrefWithGateReturn(projectScopedHref(projectId, dashboard.aiPipelineBatch.targetHref), gateReturnHref)}"));
  assert.ok(controlPanel.includes("href={hrefWithGateReturn(projectScopedHref(projectId, dashboard.aiPipelineRecentBatch.targetHref), gateReturnHref)}"));
  assert.ok(controlPanel.includes("href={hrefWithGateReturn(projectScopedHref(projectId, dashboard.aiPipelineRecentBatch.secondaryTargetHref), gateReturnHref)}"));
  assert.ok(controlPanel.includes("href={hrefWithGateReturn(projectScopedHref(projectId, dashboard.aiPipelineRecentBatch.relayTargetHref), gateReturnHref)}"));
  assert.ok(controlPanel.includes("function aiRecentBatchScaleDecisionClass"));
  assert.ok(controlPanel.includes("{dashboard.aiPipelineRecentBatch.scaleDecisionLabel}"));
  assert.ok(controlPanel.includes("{dashboard.aiPipelineRecentBatch.scaleDecisionDetail}"));
  assert.ok(controlPanel.includes("function aiBatchHealthScaleDecisionClass"));
  assert.ok(controlPanel.includes("{dashboard.aiPipelineBatchHealth.scaleDecisionLabel}"));
  assert.ok(controlPanel.includes("{dashboard.aiPipelineBatchHealth.scaleDecisionDetail}"));
  assert.ok(controlPanel.includes("href={hrefWithGateReturn(projectScopedHref(projectId, dashboard.modelRouteHealth.targetHref), gateReturnHref)}"));
  assert.ok(controlPanel.includes("href={hrefWithGateReturn(`/projects/${projectId}#${action.targetAnchor}`, gateReturnHref)}"));

  assert.ok(batchDraftPanel.includes("gateReturnHref?: string | null"));
  assert.ok(batchDraftPanel.includes("function hrefWithGateReturn"));
  assert.ok(batchDraftPanel.includes("window.location.assign(hrefWithGateReturn(action.href ?? \"/failures\", gateReturnHref));"));
  assert.ok(batchDraftPanel.includes("href={hrefWithGateReturn(`/projects/${projectId}/chapters/${result.chapterId}`, gateReturnHref)}"));

  assert.ok(batchReviewPanel.includes("gateReturnHref?: string | null"));
  assert.ok(batchReviewPanel.includes("function hrefWithGateReturn"));
  assert.ok(batchReviewPanel.includes("window.location.assign(hrefWithGateReturn(action.href ?? \"/failures\", gateReturnHref));"));
  assert.ok(batchReviewPanel.includes("href={hrefWithGateReturn(`/projects/${projectId}/chapters/${candidate.chapterId}`, gateReturnHref)}"));

  assert.ok(modelTaskAuditPanel.includes("gateReturnHref?: string | null"));
  assert.ok(modelTaskAuditPanel.includes("function hrefWithGateReturn"));
  assert.ok(modelTaskAuditPanel.includes("href={hrefWithGateReturn(\"/settings/models\", gateReturnHref)}"));
  assert.ok(modelTaskAuditPanel.includes("href={hrefWithGateReturn(failure.actionHref, gateReturnHref)}"));
});

test("project detail page carries gate return through first day workflow links", () => {
  const projectPage = readFileSync("src/app/projects/[projectId]/page.tsx", "utf8");
  const firstDayWorkflowPanel = readFileSync("src/components/projects/FirstDayWorkflowPanel.tsx", "utf8");

  assert.ok(projectPage.includes("<FirstDayWorkflowPanel gateReturnHref={gateReturn} projectId={project.id} />"));
  assert.ok(firstDayWorkflowPanel.includes("gateReturnHref?: string | null"));
  assert.ok(firstDayWorkflowPanel.includes("function hrefWithGateReturn"));
  assert.ok(firstDayWorkflowPanel.includes("href={hrefWithGateReturn(view.href, gateReturnHref)}"));
  assert.ok(firstDayWorkflowPanel.includes("href={hrefWithGateReturn(item.href, gateReturnHref)}"));
  assert.ok(firstDayWorkflowPanel.includes("href={hrefWithGateReturn(dispatch.href, gateReturnHref)}"));
  assert.ok(firstDayWorkflowPanel.includes("href={hrefWithGateReturn(executionSafetyBanner.primaryHref, gateReturnHref)}"));
  assert.ok(firstDayWorkflowPanel.includes("href={hrefWithGateReturn(executionSafetyBanner.secondaryHref, gateReturnHref)}"));
  assert.ok(firstDayWorkflowPanel.includes("href={hrefWithGateReturn(messageActionHref ?? workflow?.nextStep.href ?? \"#first-day-workflow\", gateReturnHref)}"));
  assert.ok(firstDayWorkflowPanel.includes("href={hrefWithGateReturn(messageSecondaryActionHref, gateReturnHref)}"));
  assert.ok(firstDayWorkflowPanel.includes("href={hrefWithGateReturn(handoffGateCta.primaryHref, gateReturnHref)}"));
  assert.ok(firstDayWorkflowPanel.includes("href={hrefWithGateReturn(handoffGateCta.secondaryHref, gateReturnHref)}"));
  assert.ok(firstDayWorkflowPanel.includes("href={hrefWithGateReturn(continuation.primaryHref, gateReturnHref)}"));
  assert.ok(firstDayWorkflowPanel.includes("href={hrefWithGateReturn(continuation.secondaryHref, gateReturnHref)}"));
  assert.ok(firstDayWorkflowPanel.includes("href={hrefWithGateReturn(workflow.nextStep.href, gateReturnHref)}"));
  assert.ok(firstDayWorkflowPanel.includes("href={hrefWithGateReturn(workflow.executionPackage.href, gateReturnHref)}"));
  assert.ok(firstDayWorkflowPanel.includes("href={hrefWithGateReturn(\"/dispatch\", gateReturnHref)}"));
  assert.ok(firstDayWorkflowPanel.includes("gateReviewHref: gateReturnHref ?? \"/gate?focus=first-day-risk\""));
  assert.ok(firstDayWorkflowPanel.includes("href={hrefWithGateReturn(modelSettingsRepairHref(modelRoute, projectId), gateReturnHref)}"));
  assert.ok(firstDayWorkflowPanel.includes("<FirstDayStepCard gateReturnHref={gateReturnHref} index={index} key={step.id} step={step} />"));
});

test("first day workflow panel validates returned evidence against the active dispatch", () => {
  const firstDayWorkflowPanel = readFileSync("src/components/projects/FirstDayWorkflowPanel.tsx", "utf8");

  assert.ok(firstDayWorkflowPanel.includes("function returnedEvidenceValidationContext"));
  assert.ok(firstDayWorkflowPanel.includes("...returnedEvidenceValidationContext(payload.dispatch)"));
  assert.ok(firstDayWorkflowPanel.includes("...returnedEvidenceValidationContext(dispatch)"));
});

test("project detail page carries gate return through platform decision links", () => {
  const projectPage = readFileSync("src/app/projects/[projectId]/page.tsx", "utf8");
  const platformKnowledgeBriefPanel = readFileSync("src/components/projects/PlatformKnowledgeBriefPanel.tsx", "utf8");
  const platformDecisionTimelinePanel = readFileSync("src/components/projects/PlatformDecisionTimelinePanel.tsx", "utf8");
  const platformTacticExperiencePanel = readFileSync("src/components/projects/PlatformTacticExperiencePanel.tsx", "utf8");

  assert.ok(projectPage.includes("<PlatformKnowledgeBriefPanel brief={platformKnowledgeBrief} gateReturnHref={gateReturn} projectId={project.id} />"));
  assert.ok(projectPage.includes("<PlatformDecisionTimelinePanel gateReturnHref={gateReturn} timeline={platformDecisionTimeline} />"));
  assert.ok(projectPage.includes("<PlatformTacticExperiencePanel gateReturnHref={gateReturn} library={platformTacticExperienceLibrary} />"));

  assert.ok(platformKnowledgeBriefPanel.includes("gateReturnHref?: string | null"));
  assert.ok(platformKnowledgeBriefPanel.includes("function hrefWithGateReturn"));
  assert.ok(platformKnowledgeBriefPanel.includes("const actionHref = hrefWithGateReturn(rawActionHref, gateReturnHref);"));
  assert.ok(platformKnowledgeBriefPanel.includes("href={hrefWithGateReturn(`/projects/${projectId}#platform-tactic-library`, gateReturnHref)}"));

  assert.ok(platformDecisionTimelinePanel.includes("gateReturnHref?: string | null"));
  assert.ok(platformDecisionTimelinePanel.includes("function hrefWithGateReturn"));
  assert.ok(platformDecisionTimelinePanel.includes("href={gateReturnHref ?? \"/gate\"}"));
  assert.ok(platformDecisionTimelinePanel.includes("href={hrefWithGateReturn(item.href, gateReturnHref)}"));
  assert.ok(platformDecisionTimelinePanel.includes("href={hrefWithGateReturn(event.href, gateReturnHref)}"));

  assert.ok(platformTacticExperiencePanel.includes("gateReturnHref?: string | null"));
  assert.ok(platformTacticExperiencePanel.includes("function hrefWithGateReturn"));
  assert.ok(platformTacticExperiencePanel.includes("href={hrefWithGateReturn(item.href, gateReturnHref)}"));
  assert.ok(platformTacticExperiencePanel.includes("href={hrefWithGateReturn(buildGatePlatformTacticExperienceStartHref(item), gateReturnHref)}"));
});

test("project detail page carries gate return through export and submission links", () => {
  const projectPage = readFileSync("src/app/projects/[projectId]/page.tsx", "utf8");
  const platformExportCenterPanel = readFileSync("src/components/projects/PlatformExportCenterPanel.tsx", "utf8");
  const submissionPackagePanel = readFileSync("src/components/projects/SubmissionPackagePanel.tsx", "utf8");

  assert.ok(projectPage.includes("<PlatformExportCenterPanel exportSource={exportSource} gateReturnHref={gateReturn} projectId={project.id} />"));
  assert.ok(projectPage.includes("<SubmissionPackagePanel gateReturnHref={gateReturn} projectId={project.id} submissionPackage={submissionPackage} />"));
  assert.ok(projectPage.includes("exportSourceFromParam"));
  assert.ok(projectPage.includes("exportSource={exportSource}"));

  assert.ok(platformExportCenterPanel.includes("gateReturnHref?: string | null"));
  assert.ok(platformExportCenterPanel.includes("exportSource?: \"multi-platform-package\" | null"));
  assert.ok(platformExportCenterPanel.includes("multiPlatformExportSourcePrompt"));
  assert.ok(platformExportCenterPanel.includes("来自多平台投稿包"));
  assert.ok(platformExportCenterPanel.includes("推荐先导出"));
  assert.ok(platformExportCenterPanel.includes("selectedPlatformIsRecommended"));
  assert.ok(platformExportCenterPanel.includes("推荐平台"));
  assert.ok(platformExportCenterPanel.includes("当前推荐导出"));
  assert.ok(platformExportCenterPanel.includes("exportSuccessEffectPrompt"));
  assert.ok(platformExportCenterPanel.includes("去记录发布效果"));
  assert.ok(platformExportCenterPanel.includes("href={hrefWithGateReturn(\"#publish-effect-panel\", gateReturnHref, projectId)}"));
  assert.ok(platformExportCenterPanel.includes("effectReviewStrategyPrompt"));
  assert.ok(platformExportCenterPanel.includes("回到策略裁决"));
  assert.ok(platformExportCenterPanel.includes("href={hrefWithGateReturn(\"#platform-strategy-verdict\", gateReturnHref, projectId)}"));
  assert.ok(platformExportCenterPanel.includes("setStrategySwitchPlan(payload.switchPlan);\n      setStrategyExecutionReceipt(buildStrategyExecutionReceipt(payload.switchPlan, \"switch-target-platform\"));"));
  assert.ok(platformExportCenterPanel.includes("nextAction: `继续执行链里的下一步：${plan.progress.actionLabel}。`"));
  assert.ok(platformExportCenterPanel.includes("href: plan.progress.actionHref"));
  assert.ok(platformExportCenterPanel.includes("function hrefWithGateReturn"));
  assert.ok(platformExportCenterPanel.includes("href={hrefWithGateReturn(item.actionHref, gateReturnHref, projectId)}"));
  assert.ok(platformExportCenterPanel.includes("href={hrefWithGateReturn(handoffActionHref(projectId, center.executionHandoffSummary.primaryAction), gateReturnHref, projectId)}"));
  assert.ok(platformExportCenterPanel.includes("href={hrefWithGateReturn(handoffActionHref(projectId, item), gateReturnHref, projectId)}"));
  assert.ok(platformExportCenterPanel.includes("href={hrefWithGateReturn(item.feedbackLoop.nextStepHref, gateReturnHref, projectId)}"));
  assert.ok(platformExportCenterPanel.includes("href={hrefWithGateReturn(application.href, gateReturnHref, projectId)}"));
  assert.ok(platformExportCenterPanel.includes("href={hrefWithGateReturn(entry.href, gateReturnHref, projectId)}"));
  assert.ok(platformExportCenterPanel.includes("href={hrefWithGateReturn(history.href, gateReturnHref, projectId)}"));
  assert.ok(platformExportCenterPanel.includes("href={hrefWithGateReturn(strategySwitchPlan.progress.actionHref, gateReturnHref, projectId)}"));
  assert.ok(platformExportCenterPanel.includes("href={hrefWithGateReturn(step.href, gateReturnHref, projectId)}"));
  assert.ok(platformExportCenterPanel.includes("href={hrefWithGateReturn(knowledgeFeedbackReceipt.href, gateReturnHref, projectId)}"));
  assert.ok(platformExportCenterPanel.includes("href={hrefWithGateReturn(receipt.href, gateReturnHref, projectId)}"));
  assert.ok(platformExportCenterPanel.includes("href={hrefWithGateReturn(strategyExecutionReceipt.href, gateReturnHref, projectId)}"));
  assert.ok(platformExportCenterPanel.includes("href={hrefWithGateReturn(strategyReviewTaskReceipt.href, gateReturnHref, projectId)}"));
  assert.ok(platformExportCenterPanel.includes("postSaveReview?: SubmissionAssetPostSaveReview | null"));
  assert.ok(platformExportCenterPanel.includes("setSubmissionAssetPostSaveReview(payload?.postSaveReview ?? null);"));
  assert.ok(platformExportCenterPanel.includes("submissionAssetPostSaveReview?.platformName === selectedPackage?.platformName"));
  assert.ok(platformExportCenterPanel.includes("href={hrefWithGateReturn(submissionAssetPostSaveReview.href, gateReturnHref, projectId)}"));
  assert.ok(platformExportCenterPanel.includes("{submissionAssetPostSaveReview.actionLabel}"));
  assert.ok(platformExportCenterPanel.includes("href={hrefWithGateReturn(item.href, gateReturnHref, projectId)}"));
  assert.ok(platformExportCenterPanel.includes("href={hrefWithGateReturn(actionHref(projectId, nextRepairAction), gateReturnHref, projectId)}"));
  assert.ok(platformExportCenterPanel.includes("href={hrefWithGateReturn(actionHref(projectId, step), gateReturnHref, projectId)}"));
  assert.ok(platformExportCenterPanel.includes("href={hrefWithGateReturn(actionHref(projectId, action), gateReturnHref, projectId)}"));
  assert.ok(platformExportCenterPanel.includes("href={hrefWithGateReturn(selectedPackage.preview.actionHref, gateReturnHref, projectId)}"));

  assert.ok(submissionPackagePanel.includes("gateReturnHref?: string | null"));
  assert.ok(submissionPackagePanel.includes("function hrefWithGateReturn"));
  assert.ok(submissionPackagePanel.includes("multiPlatformGatePrompt"));
  assert.ok(submissionPackagePanel.includes("结构复查已放行"));
  assert.ok(submissionPackagePanel.includes("multiPlatformButtonClass"));
  assert.ok(submissionPackagePanel.includes("进入平台导出"));
  assert.ok(submissionPackagePanel.includes("href={hrefWithGateReturn(`/projects/${projectId}?exportSource=multi-platform-package#platform-export`, gateReturnHref, projectId)}"));
  assert.ok(submissionPackagePanel.includes("href={hrefWithGateReturn(task.href, gateReturnHref, projectId)}"));
  assert.ok(submissionPackagePanel.includes("href={hrefWithGateReturn(variant.decision.actionHref, gateReturnHref, projectId)}"));
  assert.ok(submissionPackagePanel.includes("href={hrefWithGateReturn(\"#publish-effect-panel\", gateReturnHref, projectId)}"));
});

test("project detail page carries gate return through chapter production links", () => {
  const projectPage = readFileSync("src/app/projects/[projectId]/page.tsx", "utf8");
  const chapterProductionFlowPanel = readFileSync("src/components/projects/ChapterProductionFlowPanel.tsx", "utf8");
  const chapterProductionPanel = readFileSync("src/components/projects/ChapterProductionPanel.tsx", "utf8");

  assert.ok(projectPage.includes("<ChapterProductionFlowPanel flow={chapterProductionFlow} gateReturnHref={gateReturn} />"));
  assert.ok(projectPage.includes("<ChapterProductionPanel gateReturnHref={gateReturn} projectId={project.id} />"));

  assert.ok(chapterProductionFlowPanel.includes("gateReturnHref?: string | null"));
  assert.ok(chapterProductionFlowPanel.includes("function hrefWithGateReturn"));
  assert.ok(chapterProductionFlowPanel.includes("href={hrefWithGateReturn(primary ? flow.nextHref : stage.href, gateReturnHref)}"));
  assert.ok(chapterProductionFlowPanel.includes("href={hrefWithGateReturn(followUp.href, gateReturnHref)}"));
  assert.ok(chapterProductionFlowPanel.includes("href={hrefWithGateReturn(flow.followUpNotice.href, gateReturnHref)}"));
  assert.ok(chapterProductionFlowPanel.includes("href={hrefWithGateReturn(flow.followUpResultNotice.href, gateReturnHref)}"));
  assert.ok(chapterProductionFlowPanel.includes("href={hrefWithGateReturn(flow.recheckNotice.href, gateReturnHref)}"));
  assert.ok(chapterProductionFlowPanel.includes("href={hrefWithGateReturn(stage.dispatchSummary.href, gateReturnHref)}"));

  assert.ok(chapterProductionPanel.includes("gateReturnHref?: string | null"));
  assert.ok(chapterProductionPanel.includes("function hrefWithGateReturn"));
  assert.ok(chapterProductionPanel.includes("href={hrefWithGateReturn(`/projects/${projectId}/chapters/${item.chapterId}`, gateReturnHref)}"));
});

test("project detail page carries gate return through continuity audit repairs", () => {
  const projectPage = readFileSync("src/app/projects/[projectId]/page.tsx", "utf8");
  const continuityAuditPanel = readFileSync("src/components/projects/ContinuityAuditPanel.tsx", "utf8");

  assert.ok(projectPage.includes("<ContinuityAuditPanel audit={continuityAudit} gateReturnHref={gateReturn} />"));

  assert.ok(continuityAuditPanel.includes("gateReturnHref?: string | null"));
  assert.ok(continuityAuditPanel.includes("function hrefWithGateReturn"));
  assert.ok(continuityAuditPanel.includes("href={hrefWithGateReturn(item.href, gateReturnHref)}"));
});

test("project detail page carries gate return through chapter creation jumps", () => {
  const projectPage = readFileSync("src/app/projects/[projectId]/page.tsx", "utf8");
  const outlineTreePanel = readFileSync("src/components/outlines/OutlineTreePanel.tsx", "utf8");
  const createChapterForm = readFileSync("src/components/chapters/CreateChapterForm.tsx", "utf8");
  const firstThreeRewritePanel = readFileSync("src/components/projects/FirstThreeRewritePanel.tsx", "utf8");

  assert.ok(projectPage.includes("<OutlineTreePanel gateReturnHref={gateReturn} projectId={project.id} nodes={outlineNodes} />"));
  assert.ok(projectPage.includes("<CreateChapterForm gateReturnHref={gateReturn} projectId={project.id} />"));
  assert.ok(projectPage.includes("<FirstThreeRewritePanel gateReturnHref={gateReturn} projectId={project.id} />"));

  assert.ok(outlineTreePanel.includes("gateReturnHref?: string | null"));
  assert.ok(outlineTreePanel.includes("function hrefWithGateReturn"));
  assert.ok(outlineTreePanel.includes("router.push(hrefWithGateReturn(`/projects/${projectId}/chapters/${payload.chapter.id}`, gateReturnHref));"));
  assert.ok(outlineTreePanel.includes("router.push(hrefWithGateReturn(`/projects/${projectId}/chapters/${node.chapterId}`, gateReturnHref))"));
  assert.ok(outlineTreePanel.includes("<OutlineBranch childrenMap={childrenMap} gateReturnHref={gateReturnHref} key={child.id} node={child} projectId={projectId} />"));

  assert.ok(createChapterForm.includes("gateReturnHref?: string | null"));
  assert.ok(createChapterForm.includes("function hrefWithGateReturn"));
  assert.ok(createChapterForm.includes("router.push(hrefWithGateReturn(`/projects/${projectId}/chapters/${payload.chapter.id}`, gateReturnHref));"));

  assert.ok(firstThreeRewritePanel.includes("gateReturnHref?: string | null"));
  assert.ok(firstThreeRewritePanel.includes("function hrefWithGateReturn"));
  assert.ok(firstThreeRewritePanel.includes("window.location.href = hrefWithGateReturn(`/projects/${projectId}/chapters/${result.chapter.id}#chapter-revisions`, gateReturnHref);"));
  assert.ok(firstThreeRewritePanel.includes("window.location.href = hrefWithGateReturn(`/projects/${projectId}#platform-export`, gateReturnHref);"));
  assert.ok(firstThreeRewritePanel.includes("href={hrefWithGateReturn(`/projects/${projectId}/chapters/${result.chapter.id}`, gateReturnHref)}"));
  assert.ok(firstThreeRewritePanel.includes("href={hrefWithGateReturn(firstThreeDecisionHref(projectId, result), gateReturnHref)}"));
});

test("project detail page carries gate return through story experience and serialization links", () => {
  const projectPage = readFileSync("src/app/projects/[projectId]/page.tsx", "utf8");
  const storyTreeExperiencePanel = readFileSync("src/components/projects/StoryTreeExperiencePanel.tsx", "utf8");
  const serializationOpsPanel = readFileSync("src/components/projects/SerializationOpsPanel.tsx", "utf8");

  assert.ok(projectPage.includes("gateReturnHref={gateReturn}\n          guide={storyTreeExperience}"));
  assert.ok(projectPage.includes("<SerializationOpsPanel gateReturnHref={gateReturn} projectId={project.id} />"));

  assert.ok(storyTreeExperiencePanel.includes("gateReturnHref?: string | null"));
  assert.ok(storyTreeExperiencePanel.includes("function hrefWithGateReturn"));
  assert.ok(storyTreeExperiencePanel.includes("href={hrefWithGateReturn(\"/dispatch\", gateReturnHref, projectId)}"));
  assert.ok(storyTreeExperiencePanel.includes("href={hrefWithGateReturn(flow.nextHref, gateReturnHref, projectId)}"));
  assert.ok(storyTreeExperiencePanel.includes("href={hrefWithGateReturn(reviewBacklog.nextItem.href, gateReturnHref, projectId)}"));
  assert.ok(storyTreeExperiencePanel.includes("href={hrefWithGateReturn(item.href, gateReturnHref, projectId)}"));

  assert.ok(serializationOpsPanel.includes("gateReturnHref?: string | null"));
  assert.ok(serializationOpsPanel.includes("function hrefWithGateReturn"));
  assert.ok(serializationOpsPanel.includes("window.location.href = hrefWithGateReturn(projectHref(projectId, action.afterSuccess.href), gateReturnHref, projectId);"));
  assert.ok(serializationOpsPanel.includes("href={hrefWithGateReturn(projectHref(projectId, message.href), gateReturnHref, projectId)}"));
  assert.ok(serializationOpsPanel.includes("href={hrefWithGateReturn(projectHref(projectId, action.href), gateReturnHref, projectId)}"));
  assert.ok(serializationOpsPanel.includes("href={hrefWithGateReturn(`/projects/${projectId}/chapters/${action.chapterId}`, gateReturnHref, projectId)}"));
  assert.ok(serializationOpsPanel.includes("href={hrefWithGateReturn(projectHref(projectId, dashboard.submissionAssetStatus.href), gateReturnHref, projectId)}"));
  assert.ok(serializationOpsPanel.includes("href={hrefWithGateReturn(projectHref(projectId, dashboard.submissionAssetCandidates.href), gateReturnHref, projectId)}"));
  assert.ok(serializationOpsPanel.includes("href={hrefWithGateReturn(projectHref(projectId, dashboard.publishBaselineStatus.href), gateReturnHref, projectId)}"));
  assert.ok(serializationOpsPanel.includes("href={hrefWithGateReturn(projectHref(projectId, dashboard.publishEffectStatus.href), gateReturnHref, projectId)}"));
  assert.ok(serializationOpsPanel.includes("href={hrefWithGateReturn(`/projects/${projectId}#publish-effect-panel`, gateReturnHref, projectId)}"));
  assert.ok(serializationOpsPanel.includes("href={hrefWithGateReturn(projectHref(projectId, action.href), gateReturnHref, projectId)}"));
  assert.ok(serializationOpsPanel.includes("href={hrefWithGateReturn(`/projects/${projectId}#package-version-history`, gateReturnHref, projectId)}"));
  assert.ok(serializationOpsPanel.includes("href={hrefWithGateReturn(projectHref(projectId, checklistRepairTarget(item.id).href), gateReturnHref, projectId)}"));
});

test("chapter detail page keeps a gate recheck return path visible", () => {
  const chapterPage = readFileSync("src/app/projects/[projectId]/chapters/[chapterId]/page.tsx", "utf8");

  assert.ok(chapterPage.includes("searchParams"));
  assert.ok(chapterPage.includes("gateReturn"));
  assert.ok(chapterPage.includes("来自总闸门复检"));
  assert.ok(chapterPage.includes("回总闸门复检"));
});

test("chapter detail page carries gate return through adoption next actions", () => {
  const chapterPage = readFileSync("src/app/projects/[projectId]/chapters/[chapterId]/page.tsx", "utf8");
  const chapterWorkflowPanel = readFileSync("src/components/ai/ChapterWorkflowPanel.tsx", "utf8");
  const chapterRevisionWorkbench = readFileSync("src/components/chapters/ChapterRevisionWorkbench.tsx", "utf8");

  assert.ok(chapterPage.includes("gateReturnHref={gateReturn}"));
  assert.ok(chapterPage.includes("<ChapterRevisionWorkbench chapter={editableChapter} gateReturnHref={gateReturn} />"));
  assert.ok(chapterPage.includes("<ChapterWorkflowPanel chapterCard={editableChapter} chapterId={chapterId} gateReturnHref={gateReturn} platform={platform} projectId={projectId} />"));

  assert.ok(chapterWorkflowPanel.includes("gateReturnHref?: string | null"));
  assert.ok(chapterWorkflowPanel.includes("function hrefWithGateReturn"));
  assert.ok(chapterWorkflowPanel.includes("setNextAction(payload?.nextAction ?? null);"));
  assert.ok(chapterWorkflowPanel.includes("href={hrefWithGateReturn(nextAction.href, gateReturnHref)}"));

  assert.ok(chapterRevisionWorkbench.includes("gateReturnHref?: string | null"));
  assert.ok(chapterRevisionWorkbench.includes("function hrefWithGateReturn"));
  assert.ok(chapterRevisionWorkbench.includes("setNextAction(payload?.nextAction ?? null);"));
  assert.ok(chapterRevisionWorkbench.includes("href={hrefWithGateReturn(nextAction.href, gateReturnHref)}"));
});

test("chapter revision workbench surfaces adoption follow-up dispatch links", () => {
  const chapterRevisionWorkbench = readFileSync("src/components/chapters/ChapterRevisionWorkbench.tsx", "utf8");

  assert.ok(chapterRevisionWorkbench.includes("followupDispatches?: Array<"));
  assert.ok(chapterRevisionWorkbench.includes("setFollowupDispatches(payload?.followupDispatches ?? []);"));
  assert.ok(chapterRevisionWorkbench.includes("followupDispatches.map((dispatch)"));
  assert.ok(chapterRevisionWorkbench.includes("href={hrefWithGateReturn(dispatch.href, gateReturnHref)}"));
  assert.ok(chapterRevisionWorkbench.includes("{dispatch.actionLabel}"));
});
