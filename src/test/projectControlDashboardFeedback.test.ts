import test from "node:test";
import assert from "node:assert/strict";
import { buildAiPipelineDispatchFeedback } from "../lib/projects/projectControlDashboardFeedback.ts";

test("buildAiPipelineDispatchFeedback", async (t) => {
  await t.test("turns a dispatch response into a linked project control message", () => {
    const feedback = buildAiPipelineDispatchFeedback({
      message: "已把恢复记忆回滚到 1 章复验。",
      dispatchKey: "ai-pipeline-recheck:demo-project:receipt:sample",
      dispatchTitle: "AI 写审改：恢复记忆回滚 1 章复验",
    }, "恢复记忆控制动作已写入。");

    assert.equal(feedback.text, "已把恢复记忆回滚到 1 章复验。 已派单：AI 写审改：恢复记忆回滚 1 章复验。");
    assert.equal(feedback.actionLabel, "去处理派单");
    assert.equal(feedback.actionHref, "/dispatch?queue=ai_pipeline#dispatch-ai-pipeline-recheck:demo-project:receipt:sample");
  });

  await t.test("keeps non-dispatch responses as plain feedback", () => {
    const feedback = buildAiPipelineDispatchFeedback({
      message: "已确认继续使用恢复记忆，后续仍按小批观察。",
    }, "恢复记忆控制动作已写入。");

    assert.equal(feedback.text, "已确认继续使用恢复记忆，后续仍按小批观察。");
    assert.equal(feedback.actionLabel, null);
    assert.equal(feedback.actionHref, null);
  });
});
