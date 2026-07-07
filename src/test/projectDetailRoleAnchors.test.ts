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

test("project detail page renders the single-project acceptance sheet", () => {
  const projectPage = readFileSync("src/app/projects/[projectId]/page.tsx", "utf8");

  assert.ok(projectPage.includes("dashboard.realSampleAcceptanceSheet"));
  assert.ok(projectPage.includes("单本作品验收单"));
  assert.ok(projectPage.includes("dashboard.realSampleAcceptanceSheet.steps.map"));
  assert.ok(projectPage.includes("step.stopRule"));
  assert.ok(projectPage.includes("dashboard.realSampleAcceptanceSheet.actionHref"));
  assert.ok(projectPage.includes("dashboard.realSampleAcceptanceSheet.actionLabel"));
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
  assert.ok(firstDayWorkflowPanel.includes("href={hrefWithGateReturn(modelSettingsRepairHref(modelRoute, projectId), gateReturnHref)}"));
  assert.ok(firstDayWorkflowPanel.includes("<FirstDayStepCard gateReturnHref={gateReturnHref} index={index} key={step.id} step={step} />"));
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

  assert.ok(projectPage.includes("<PlatformExportCenterPanel gateReturnHref={gateReturn} projectId={project.id} />"));
  assert.ok(projectPage.includes("<SubmissionPackagePanel gateReturnHref={gateReturn} projectId={project.id} submissionPackage={submissionPackage} />"));

  assert.ok(platformExportCenterPanel.includes("gateReturnHref?: string | null"));
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
  assert.ok(platformExportCenterPanel.includes("href={hrefWithGateReturn(item.href, gateReturnHref, projectId)}"));
  assert.ok(platformExportCenterPanel.includes("href={hrefWithGateReturn(actionHref(projectId, nextRepairAction), gateReturnHref, projectId)}"));
  assert.ok(platformExportCenterPanel.includes("href={hrefWithGateReturn(actionHref(projectId, step), gateReturnHref, projectId)}"));
  assert.ok(platformExportCenterPanel.includes("href={hrefWithGateReturn(actionHref(projectId, action), gateReturnHref, projectId)}"));
  assert.ok(platformExportCenterPanel.includes("href={hrefWithGateReturn(selectedPackage.preview.actionHref, gateReturnHref, projectId)}"));

  assert.ok(submissionPackagePanel.includes("gateReturnHref?: string | null"));
  assert.ok(submissionPackagePanel.includes("function hrefWithGateReturn"));
  assert.ok(submissionPackagePanel.includes("href={hrefWithGateReturn(task.href, gateReturnHref, projectId)}"));
  assert.ok(submissionPackagePanel.includes("href={hrefWithGateReturn(variant.decision.actionHref, gateReturnHref, projectId)}"));
  assert.ok(submissionPackagePanel.includes("href={hrefWithGateReturn(\"#publish-effect-panel\", gateReturnHref, projectId)}"));
});

test("chapter detail page keeps a gate recheck return path visible", () => {
  const chapterPage = readFileSync("src/app/projects/[projectId]/chapters/[chapterId]/page.tsx", "utf8");

  assert.ok(chapterPage.includes("searchParams"));
  assert.ok(chapterPage.includes("gateReturn"));
  assert.ok(chapterPage.includes("来自总闸门复检"));
  assert.ok(chapterPage.includes("回总闸门复检"));
});
