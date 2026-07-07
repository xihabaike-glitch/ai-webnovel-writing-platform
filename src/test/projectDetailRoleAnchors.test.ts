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
