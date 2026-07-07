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

test("chapter detail page keeps a gate recheck return path visible", () => {
  const chapterPage = readFileSync("src/app/projects/[projectId]/chapters/[chapterId]/page.tsx", "utf8");

  assert.ok(chapterPage.includes("searchParams"));
  assert.ok(chapterPage.includes("gateReturn"));
  assert.ok(chapterPage.includes("来自总闸门复检"));
  assert.ok(chapterPage.includes("回总闸门复检"));
});
