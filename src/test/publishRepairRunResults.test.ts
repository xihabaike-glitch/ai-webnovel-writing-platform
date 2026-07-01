import test from "node:test";
import assert from "node:assert/strict";
import {
  actionFromRunResult,
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
});
