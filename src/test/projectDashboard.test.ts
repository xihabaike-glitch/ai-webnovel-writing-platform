import test from "node:test";
import assert from "node:assert/strict";
import { buildProjectDashboard } from "../lib/projects/projectDashboard.ts";
import { getPlatformProfile } from "../lib/platforms/platformProfiles.ts";

test("buildProjectDashboard", async (t) => {
  await t.test("summarizes progress, status counts, next chapter, and unreviewed chapters", () => {
    const dashboard = buildProjectDashboard({
      currentWordCount: 5000,
      targetWordCount: 10000,
      platform: getPlatformProfile("fanqie"),
      chapters: [
        {
          id: "chapter-1",
          title: "第一章",
          order: 1,
          status: "draft",
          wordCount: 3000,
          updatedAt: "2026-07-01T00:00:00.000Z",
        },
        {
          id: "chapter-2",
          title: "第二章",
          order: 2,
          status: "outline",
          wordCount: 2000,
          updatedAt: "2026-07-01T00:00:00.000Z",
        },
      ],
      aiTasks: [
        {
          id: "task-1",
          taskType: "chapter_review",
          status: "succeeded",
          model: "mock-editor",
          createdAt: "2026-07-01T00:00:00.000Z",
          chapter: { id: "chapter-1", title: "第一章" },
          modelProvider: { providerId: "mock", displayName: "Mock" },
        },
      ],
    });

    assert.equal(dashboard.progressPercent, 50);
    assert.equal(dashboard.statusCounts.draft, 1);
    assert.equal(dashboard.statusCounts.outline, 1);
    assert.equal(dashboard.nextChapter?.id, "chapter-1");
    assert.deepEqual(dashboard.unreviewedChapters.map((chapter) => chapter.id), ["chapter-2"]);
    assert.ok(dashboard.platformWarnings.some((warning) => warning.includes("未审稿")));
  });
});
