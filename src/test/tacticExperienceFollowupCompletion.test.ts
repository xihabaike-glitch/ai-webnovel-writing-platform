import assert from "node:assert/strict";
import test from "node:test";
import { buildTacticExperienceFollowupCompletionMessage } from "../lib/projects/tacticExperienceFollowupCompletion.ts";

test("buildTacticExperienceFollowupCompletionMessage explains the completed feedback loop", () => {
  const message = buildTacticExperienceFollowupCompletionMessage({
    actionLabel: "继续小样本",
    knowledgeFeedbackWritten: true,
    followUpCount: 2,
  });

  assert.equal(message, "继续小样本已完成，已回写平台知识反馈，并生成 2 个后续动作。刷新后这张打法闭环卡会从任务队列移除。");
});
