import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPublishRepairSecondPassInstruction,
  buildPublishRepairTaskSnapshot,
  canExecutePublishRepairAction,
  publishRepairTaskSource,
} from "../lib/projects/publishRepairActionExecution.ts";

test("publish repair action execution helpers", async (t) => {
  await t.test("allows executable chapter actions only", () => {
    assert.equal(canExecutePublishRepairAction({ kind: "run_chapter_review", chapterId: "chapter-1" }), true);
    assert.equal(canExecutePublishRepairAction({ kind: "run_second_pass", chapterId: "chapter-1" }), true);
    assert.equal(canExecutePublishRepairAction({ kind: "adopt_candidate", chapterId: "chapter-1" }), false);
    assert.equal(canExecutePublishRepairAction({ kind: "run_second_pass" }), false);
    assert.equal(canExecutePublishRepairAction({ kind: "open_submission_package" }), false);
  });

  await t.test("builds a platform-safe second-pass instruction", () => {
    const instruction = buildPublishRepairSecondPassInstruction({
      chapterTitle: "雨夜系统",
      detail: "进入二改工作台按平台问题重写，并让系统自动复检。",
    });

    assert.ok(instruction.includes("雨夜系统"));
    assert.ok(instruction.includes("开头钩子"));
    assert.ok(instruction.includes("章末追读悬念"));
    assert.ok(instruction.includes("不要另起炉灶"));
  });

  await t.test("marks repair tasks with source metadata", () => {
    const snapshot = buildPublishRepairTaskSnapshot({
      kind: "run_chapter_review",
      label: "补章节审稿",
      detail: "补齐发布前审稿。",
      chapterId: "chapter-1",
      chapterTitle: "雨夜系统",
    }, "{\"prompt\":\"original\"}");
    const parsed = JSON.parse(snapshot) as Record<string, unknown>;

    assert.equal(parsed.source, publishRepairTaskSource);
    assert.equal(parsed.actionKind, "run_chapter_review");
    assert.equal(parsed.chapterTitle, "雨夜系统");
    assert.equal(parsed.originalInputSnapshot, "{\"prompt\":\"original\"}");
  });
});
