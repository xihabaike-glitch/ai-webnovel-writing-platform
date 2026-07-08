import test from "node:test";
import assert from "node:assert/strict";
import {
  buildChapterRevisionComparison,
  buildPendingCandidateGate,
  isChapterRevisionCandidate,
  previewRevisionContent,
  summarizeChapterRevisions,
} from "../lib/chapters/revisions.ts";
import { buildFirstThreeAdoptionFollowupDispatches } from "../lib/chapters/revisionAdoptionFollowup.ts";
import {
  buildFirstThreePublishCompletionEvidence,
  buildFirstThreeReviewCompletionEvidence,
} from "../lib/chapters/revisionAdoptionFollowupCompletion.ts";

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

  await t.test("builds a production gate for the latest unadopted candidate", () => {
    const gate = buildPendingCandidateGate({
      projectId: "project-1",
      chapter: {
        id: "chapter-1",
        title: "第一章 当前稿",
        content: "当前正文还停在旧版本。",
        wordCount: 12,
        status: "draft",
      },
      revisions: [
        {
          id: "older-candidate",
          source: "ai_draft_candidate",
          sourceTaskId: "task-old",
          title: "第一章 旧候选",
          content: "旧候选稿。",
          wordCount: 10,
          status: "draft",
          notes: "旧候选。",
          createdAt: "2026-07-01T00:00:00.000Z",
        },
        {
          id: "latest-candidate",
          source: "chapter_second_pass_candidate",
          sourceTaskId: "task-new",
          title: "第一章 二改候选",
          content: "二改候选稿更强，但还没有进入正文。",
          wordCount: 18,
          status: "revising",
          notes: "二改候选。",
          createdAt: "2026-07-02T00:00:00.000Z",
        },
      ],
    });

    assert.equal(gate.status, "blocked");
    assert.equal(gate.revisionId, "latest-candidate");
    assert.equal(gate.label, "待采纳候选稿");
    assert.ok(gate.title.includes("先处理二改候选稿"));
    assert.ok(gate.detail.includes("当前正文还不是最新修复稿"));
    assert.equal(gate.actionLabel, "去采纳候选");
    assert.equal(gate.href, "/projects/project-1/chapters/chapter-1#chapter-revisions");

    const adoptedGate = buildPendingCandidateGate({
      projectId: "project-1",
      chapter: {
        id: "chapter-1",
        title: "第一章 二改候选",
        content: "二改候选稿更强，但还没有进入正文。",
        wordCount: 18,
        status: "revising",
      },
      revisions: [
        {
          id: "latest-candidate",
          source: "chapter_second_pass_candidate",
          sourceTaskId: "task-new",
          title: "第一章 二改候选",
          content: "二改候选稿更强，但还没有进入正文。",
          wordCount: 18,
          status: "revising",
          notes: "已经采纳过的候选。",
          createdAt: "2026-07-02T00:00:00.000Z",
        },
      ],
    });

    assert.equal(adoptedGate.status, "clear");
    assert.equal(adoptedGate.revisionId, null);
  });

  await t.test("builds follow-up dispatches after first-three adoption", () => {
    const dispatches = buildFirstThreeAdoptionFollowupDispatches({
      projectId: "project-1",
      projectTitle: "夜雨系统",
      platformId: "fanqie",
      platformName: "番茄小说",
      chapterId: "chapter-1",
      chapterOrder: 1,
      chapterTitle: "第一章 雨夜系统",
      revisionId: "revision-first-three",
      createdAt: "2026-07-05T12:00:00.000Z",
    });

    assert.equal(dispatches.length, 2);
    assert.equal(dispatches[0].id, "first-three-adoption:project-1:chapter-1:revision-first-three:review");
    assert.equal(dispatches[0].stage, "start_first_three_review");
    assert.equal(dispatches[0].actionLabel, "重新审稿");
    assert.equal(dispatches[0].href, "/projects/project-1/chapters/chapter-1#chapter-workflow");
    assert.ok(dispatches[0].acceptanceCriteria.some((item) => item.includes("新正文")));
    assert.equal(dispatches[1].stage, "start_publish_finalize");
    assert.equal(dispatches[1].actionLabel, "回发布质检");
    assert.equal(dispatches[1].href, "/projects/project-1#platform-export");
    assert.ok(dispatches[1].evidence.some((item) => item.includes("revision-first-three")));
  });

  await t.test("builds automatic completion evidence for adoption follow-ups", () => {
    const reviewEvidence = buildFirstThreeReviewCompletionEvidence({
      projectId: "project-1",
      chapterId: "chapter-1",
      chapterOrder: 1,
      chapterTitle: "第一章 雨夜系统",
      taskId: "review-task-1",
      score: 91,
      issueCount: 1,
    });
    const publishEvidence = buildFirstThreePublishCompletionEvidence({
      projectId: "project-1",
      platformName: "番茄小说",
      snapshotId: "snapshot-1",
      preflightScore: 88,
      canExport: true,
    });

    assert.ok(reviewEvidence.includes("采纳后重新审稿已完成"));
    assert.ok(reviewEvidence.includes("review-task-1"));
    assert.ok(reviewEvidence.includes("审稿分 91"));
    assert.ok(publishEvidence.includes("采纳后发布质检已刷新"));
    assert.ok(publishEvidence.includes("snapshot-1"));
    assert.ok(publishEvidence.includes("可导出"));
  });
});
