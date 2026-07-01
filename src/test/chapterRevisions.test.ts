import test from "node:test";
import assert from "node:assert/strict";
import { previewRevisionContent, summarizeChapterRevisions } from "../lib/chapters/revisions.ts";

test("chapter revision summaries", async (t) => {
  await t.test("labels AI overwrite snapshots and creates readable previews", () => {
    const summaries = summarizeChapterRevisions([
      {
        id: "revision-1",
        source: "ai_draft_before_overwrite",
        sourceTaskId: "task-1",
        title: "第一章",
        content: "旧稿第一段。\n\n旧稿第二段。",
        wordCount: 10,
        status: "draft",
        notes: "AI 生成前自动保存",
        createdAt: "2026-07-01T00:00:00.000Z",
      },
    ]);

    assert.equal(summaries[0].sourceLabel, "AI 生成前旧稿");
    assert.equal(summaries[0].preview, "旧稿第一段。 旧稿第二段。");
    assert.equal(summaries[0].sourceTaskId, "task-1");
  });

  await t.test("uses a clear placeholder for empty content", () => {
    assert.equal(previewRevisionContent("   "), "空正文");
  });
});
