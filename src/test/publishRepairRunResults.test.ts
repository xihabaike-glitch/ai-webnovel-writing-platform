import test from "node:test";
import assert from "node:assert/strict";
import {
  actionFromRunResult,
  buildPublishRepairNextAction,
  normalizeRunResult,
  pendingResultFromAction,
} from "../lib/projects/publishRepairRunResults.ts";

test("publish repair run result helpers", async (t) => {
  await t.test("builds pending results from executable actions", () => {
    const result = pendingResultFromAction({
      id: "chapter-1-run_chapter_review",
      kind: "run_chapter_review",
      priority: "high",
      label: "补章节审稿",
      detail: "补齐发布前审稿。",
      chapterId: "chapter-1",
      chapterTitle: "雨夜系统",
    });

    assert.equal(result.id, "chapter-1-run_chapter_review");
    assert.equal(result.status, "pending");
    assert.equal(result.chapterTitle, "雨夜系统");
  });

  await t.test("normalizes API results for display", () => {
    const result = normalizeRunResult({
      action: "run_second_pass",
      chapterId: "chapter-2",
      chapterTitle: "",
      status: "succeeded",
      message: "已完成二改。",
      score: 86,
    });

    assert.equal(result.id, "chapter-2-run_second_pass");
    assert.equal(result.chapterTitle, "项目资料");
    assert.equal(result.status, "succeeded");
    assert.equal(result.score, 86);
  });

  await t.test("turns failed results back into retry actions", () => {
    const action = actionFromRunResult({
      id: "chapter-3-run_second_pass",
      action: "run_second_pass",
      chapterId: "chapter-3",
      chapterTitle: "雨夜追杀",
      status: "failed",
      error: "模型暂时不可用。",
    });

    assert.equal(action.kind, "run_second_pass");
    assert.equal(action.label, "执行二改");
    assert.equal(action.detail, "模型暂时不可用。");
    assert.equal(action.chapterId, "chapter-3");
  });

  await t.test("routes weak review results into second pass", () => {
    const nextAction = buildPublishRepairNextAction([normalizeRunResult({
      action: "run_chapter_review",
      chapterId: "chapter-1",
      chapterTitle: "雨夜系统",
      status: "succeeded",
      message: "已完成章节审稿。",
      score: 72,
      issueCount: 3,
    })], "project-1");

    assert.equal(nextAction?.kind, "run_second_pass");
    assert.equal(nextAction?.action?.kind, "run_second_pass");
    assert.equal(nextAction?.href, "/projects/project-1/chapters/chapter-1#chapter-second-pass");
  });

  await t.test("routes high-scoring reviews with issues into second pass", () => {
    const nextAction = buildPublishRepairNextAction([normalizeRunResult({
      action: "run_chapter_review",
      chapterId: "chapter-1",
      chapterTitle: "雨夜系统",
      status: "succeeded",
      message: "已完成章节审稿。",
      score: 88,
      issueCount: 1,
      shouldSecondPass: true,
    })], "project-1");

    assert.equal(nextAction?.kind, "run_second_pass");
    assert.equal(nextAction?.action?.kind, "run_second_pass");
    assert.equal(nextAction?.href, "/projects/project-1/chapters/chapter-1#chapter-second-pass");
  });

  await t.test("routes clean reviews back to publish recheck", () => {
    const nextAction = buildPublishRepairNextAction([normalizeRunResult({
      action: "run_chapter_review",
      chapterId: "chapter-1",
      chapterTitle: "雨夜系统",
      status: "succeeded",
      message: "已完成章节审稿。",
      score: 92,
      issueCount: 0,
      shouldSecondPass: false,
    })], "project-1");

    assert.equal(nextAction?.kind, "recheck_publish");
    assert.equal(nextAction?.label, "回发布质检");
    assert.equal(nextAction?.href, "/projects/project-1#platform-export");
  });

  await t.test("routes passed second pass candidates into adoption", () => {
    const nextAction = buildPublishRepairNextAction([normalizeRunResult({
      action: "run_second_pass",
      chapterId: "chapter-1",
      chapterTitle: "雨夜系统",
      status: "succeeded",
      message: "已完成二改，复检 90 分。",
      score: 90,
      shouldSecondPass: false,
      candidateRevisionId: "revision-1",
    })], "project-1");

    assert.equal(nextAction?.kind, "adopt_candidate");
    assert.equal(nextAction?.label, "采纳二改候选稿");
    assert.equal(nextAction?.action?.kind, "adopt_candidate");
    assert.equal(nextAction?.action?.candidateRevisionId, "revision-1");
    assert.equal(nextAction?.href, "/projects/project-1/chapters/chapter-1#chapter-revisions");
  });

  await t.test("routes adopted candidates into fresh review", () => {
    const nextAction = buildPublishRepairNextAction([normalizeRunResult({
      action: "adopt_candidate",
      chapterId: "chapter-1",
      chapterTitle: "雨夜系统",
      status: "succeeded",
      message: "已采纳候选稿。",
      candidateRevisionId: "revision-1",
    })], "project-1");

    assert.equal(nextAction?.kind, "run_chapter_review");
    assert.equal(nextAction?.label, "重新审稿");
    assert.equal(nextAction?.action?.kind, "run_chapter_review");
    assert.equal(nextAction?.action?.candidateRevisionId, undefined);
    assert.equal(nextAction?.href, "/projects/project-1/chapters/chapter-1#chapter-workflow");
  });

  await t.test("routes failures into retry", () => {
    const nextAction = buildPublishRepairNextAction([normalizeRunResult({
      action: "run_chapter_review",
      chapterId: "chapter-1",
      chapterTitle: "雨夜系统",
      status: "failed",
      error: "模型暂时不可用。",
    })], "project-1");

    assert.equal(nextAction?.kind, "retry_failed");
    assert.equal(nextAction?.action?.kind, "run_chapter_review");
    assert.equal(nextAction?.href, "/projects/project-1/chapters/chapter-1#chapter-workflow");
  });
});
