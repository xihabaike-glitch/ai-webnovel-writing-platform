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
