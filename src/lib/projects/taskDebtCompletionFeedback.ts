export type TaskDebtCompletionFeedbackStatus = "cleared" | "needs_follow_up";

export interface TaskDebtCompletionFeedbackTask {
  dispatchKey: string;
  title: string;
  actionLabel?: string;
  href?: string;
}

export interface TaskDebtCompletionFeedbackInput {
  actionLabel: string;
  followUpTasks?: TaskDebtCompletionFeedbackTask[];
  knowledgeFeedbackWritten?: boolean;
  dispatchCompletionReceiptLabel?: string | null;
  submissionEffectHeadline?: string | null;
}

export interface TaskDebtCompletionFeedback {
  status: TaskDebtCompletionFeedbackStatus;
  message: string;
  actionLabel: string;
  href: string;
}

export function buildTaskDebtCompletionFeedback(input: TaskDebtCompletionFeedbackInput): TaskDebtCompletionFeedback {
  const followUps = input.followUpTasks ?? [];
  const firstDayFollowUp = followUps.find((task) => task.dispatchKey.startsWith("first-day:")) ?? null;

  if (firstDayFollowUp) {
    return {
      status: "needs_follow_up",
      message: `${input.actionLabel}已回写，但清债还没结束：下一张首日卡是「${firstDayFollowUp.title}」。先处理它，再回任务队列复查阻塞是否下降。`,
      actionLabel: firstDayFollowUp.actionLabel || "继续处理",
      href: firstDayFollowUp.href || "/dispatch#first-day-dispatch",
    };
  }

  if (followUps.length > 0) {
    const titleList = followUps.map((task) => `「${task.title}」`).join("、");
    return {
      status: "needs_follow_up",
      message: `${input.actionLabel}已回写，并生成 ${followUps.length} 个后续动作：${titleList}。先处理后续动作，再回任务队列复查阻塞是否下降。`,
      actionLabel: followUps[0].actionLabel || "处理后续动作",
      href: followUps[0].href || "/gate",
    };
  }

  const receiptText = input.submissionEffectHeadline
    ? `，已回写投稿效果：${input.submissionEffectHeadline}`
    : input.dispatchCompletionReceiptLabel
      ? `，已生成业务回执：${input.dispatchCompletionReceiptLabel}`
      : input.knowledgeFeedbackWritten
        ? "，已回灌到平台知识反馈"
        : "";

  return {
    status: "cleared",
    message: `${input.actionLabel}已回写${receiptText}。刷新后回到阻塞清债页确认该类型数量下降。`,
    actionLabel: "复查阻塞清债",
    href: "/tasks?view=blocked#task-debt",
  };
}
