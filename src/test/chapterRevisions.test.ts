import test from "node:test";
import assert from "node:assert/strict";
import {
  buildChapterRevisionComparison,
  isChapterRevisionCandidate,
  previewRevisionContent,
  summarizeChapterRevisions,
} from "../lib/chapters/revisions.ts";

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

  await t.test("labels AI candidates without treating them as current prose", () => {
    const summaries = summarizeChapterRevisions([
      {
        id: "revision-candidate",
        source: "ai_draft_candidate",
        sourceTaskId: "task-candidate",
        title: "第一章",
        content: "AI 候选稿第一段。",
        wordCount: 9,
        status: "draft",
        notes: "AI 初稿候选。采纳后才会进入正文。",
        createdAt: "2026-07-01T00:00:00.000Z",
      },
    ]);

    assert.equal(summaries[0].sourceLabel, "AI 初稿候选");
    assert.equal(isChapterRevisionCandidate(summaries[0].source), true);
    assert.equal(isChapterRevisionCandidate("manual_snapshot"), false);
  });

  await t.test("labels first-three rewrite snapshots", () => {
    const summaries = summarizeChapterRevisions([
      {
        id: "revision-2",
        source: "first_three_rewrite_before_overwrite",
        sourceTaskId: "task-2",
        title: "第二章",
        content: "改写前旧稿。",
        wordCount: 6,
        status: "draft",
        notes: "前三章改写前自动保存",
        createdAt: "2026-07-01T00:00:00.000Z",
      },
    ]);

    assert.equal(summaries[0].sourceLabel, "前三章改写前旧稿");
  });

  await t.test("labels first-three rewrite candidates as adoptable prose", () => {
    const summaries = summarizeChapterRevisions([
      {
        id: "revision-first-three-candidate",
        source: "first_three_rewrite_candidate",
        sourceTaskId: "task-first-three",
        title: "第一章 改写候选",
        content: "候选稿第一段。",
        wordCount: 8,
        status: "draft",
        notes: "前三章改写候选。采纳后才覆盖正文。",
        createdAt: "2026-07-01T00:00:00.000Z",
      },
    ]);

    assert.equal(summaries[0].sourceLabel, "前三章改写候选");
    assert.equal(isChapterRevisionCandidate(summaries[0].source), true);
  });

  await t.test("labels second-pass snapshots", () => {
    const summaries = summarizeChapterRevisions([
      {
        id: "revision-3",
        source: "chapter_second_pass_before_overwrite",
        sourceTaskId: "task-3",
        title: "第一章",
        content: "二改前旧稿。",
        wordCount: 6,
        status: "revising",
        notes: "二改前自动保存",
        createdAt: "2026-07-01T00:00:00.000Z",
      },
    ]);

    assert.equal(summaries[0].sourceLabel, "二改前旧稿");
  });

  await t.test("uses a clear placeholder for empty content", () => {
    assert.equal(previewRevisionContent("   "), "空正文");
  });

  await t.test("compares a revision with the current chapter", () => {
    const comparison = buildChapterRevisionComparison(
      {
        title: "第一章 新稿",
        content: "新稿第一段。",
        wordCount: 12,
        goal: "新目标",
        hook: "新钩子",
        conflict: "冲突",
        valueShift: "变化",
        cliffhanger: "悬念",
        status: "draft",
      },
      {
        title: "第一章 旧稿",
        content: "旧稿第一段。",
        wordCount: 8,
        goal: "旧目标",
        hook: "旧钩子",
        conflict: "冲突",
        valueShift: "变化",
        cliffhanger: "悬念",
        status: "draft",
      },
    );

    assert.equal(comparison.wordDelta, 4);
    assert.deepEqual(comparison.changedFields, ["标题", "正文", "章节目标", "开头钩子"]);
    assert.equal(comparison.oldPreview, "旧稿第一段。");
  });
});
