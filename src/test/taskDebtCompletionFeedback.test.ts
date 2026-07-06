import assert from "node:assert/strict";
import test from "node:test";
import { buildTaskDebtCompletionFeedback, buildTaskDebtFocusChangeNotice } from "../lib/projects/taskDebtCompletionFeedback.ts";

test("buildTaskDebtCompletionFeedback explains first-day follow-up debt", () => {
  const feedback = buildTaskDebtCompletionFeedback({
    actionLabel: "完成首日链路",
    blockerType: "first_day_gate",
    previousDebtCount: 4,
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
  assert.equal(feedback.autoFocusHref, "/tasks?view=blocked&debt=first_day_gate&cleared=first_day_gate&previousDebt=4#task-debt");
});

test("buildTaskDebtCompletionFeedback tells the user to verify the cleared debt count", () => {
  const feedback = buildTaskDebtCompletionFeedback({
    actionLabel: "完成小样本验收",
    blockerType: "watch_scale_gate",
    previousDebtCount: 2,
    knowledgeFeedbackWritten: true,
  });

  assert.equal(feedback.status, "cleared");
  assert.equal(feedback.message, "完成小样本验收已回写，已回灌到平台知识反馈。刷新后回到阻塞清债页确认该类型数量下降。");
  assert.equal(feedback.actionLabel, "复查阻塞清债");
  assert.equal(feedback.href, "/tasks?view=blocked&debt=watch_scale_gate&cleared=watch_scale_gate&previousDebt=2#task-debt");
  assert.equal(feedback.autoFocusHref, "/tasks?view=blocked&debt=watch_scale_gate&cleared=watch_scale_gate&previousDebt=2#task-debt");
});

test("buildTaskDebtFocusChangeNotice highlights reduced debt after refresh", () => {
  const notice = buildTaskDebtFocusChangeNotice({
    label: "首日闸门",
    previousDebtCount: 4,
    currentDebtCount: 3,
  });

  assert.equal(notice?.tone, "reduced");
  assert.equal(notice?.message, "刚回写首日闸门清债证据：提交前 4 个，现在 3 个，已减少 1 个。继续处理剩余阻塞。");
});

test("buildTaskDebtFocusChangeNotice recommends resumed production after a debt type is cleared", () => {
  const notice = buildTaskDebtFocusChangeNotice({
    label: "首日闸门",
    previousDebtCount: 2,
    currentDebtCount: 0,
    resumeActionLabel: "恢复生产：生成初稿",
    resumeActionHref: "/projects/project-1/chapters/chapter-ready-draft",
  });

  assert.equal(notice?.tone, "cleared");
  assert.equal(notice?.message, "刚回写首日闸门清债证据：提交前 2 个，现在已经清空。可以恢复后续生产。");
  assert.equal(notice?.actionLabel, "恢复生产：生成初稿");
  assert.equal(notice?.actionHref, "/projects/project-1/chapters/chapter-ready-draft");
});

test("buildTaskDebtFocusChangeNotice explains when debt count does not fall", () => {
  const notice = buildTaskDebtFocusChangeNotice({
    label: "观察闸门",
    previousDebtCount: 2,
    currentDebtCount: 2,
  });

  assert.equal(notice?.tone, "unchanged");
  assert.equal(notice?.message, "刚回写观察闸门清债证据：提交前 2 个，现在仍是 2 个。证据可能生成了后续动作，或仍缺验收项。");
});
