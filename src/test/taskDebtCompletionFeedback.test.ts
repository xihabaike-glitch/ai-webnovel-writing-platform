import assert from "node:assert/strict";
import test from "node:test";
import { buildTaskDebtCompletionFeedback } from "../lib/projects/taskDebtCompletionFeedback.ts";

test("buildTaskDebtCompletionFeedback explains first-day follow-up debt", () => {
  const feedback = buildTaskDebtCompletionFeedback({
    actionLabel: "完成首日链路",
    followUpTasks: [{
      dispatchKey: "first-day:project-1:first-draft",
      title: "首日小样本初稿",
      actionLabel: "继续小样本",
      href: "/dispatch?firstDayProject=project-1&step=first-draft#first-day-dispatch",
    }],
  });

  assert.equal(feedback.status, "needs_follow_up");
  assert.equal(feedback.message, "完成首日链路已回写，但清债还没结束：下一张首日卡是「首日小样本初稿」。先处理它，再回任务队列复查阻塞是否下降。");
  assert.equal(feedback.actionLabel, "继续小样本");
  assert.equal(feedback.href, "/dispatch?firstDayProject=project-1&step=first-draft#first-day-dispatch");
});

test("buildTaskDebtCompletionFeedback tells the user to verify the cleared debt count", () => {
  const feedback = buildTaskDebtCompletionFeedback({
    actionLabel: "完成小样本验收",
    knowledgeFeedbackWritten: true,
  });

  assert.equal(feedback.status, "cleared");
  assert.equal(feedback.message, "完成小样本验收已回写，已回灌到平台知识反馈。刷新后回到阻塞清债页确认该类型数量下降。");
  assert.equal(feedback.actionLabel, "复查阻塞清债");
  assert.equal(feedback.href, "/tasks?view=blocked#task-debt");
});
