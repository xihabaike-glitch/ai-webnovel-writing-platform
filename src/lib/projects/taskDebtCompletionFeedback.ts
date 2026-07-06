export type TaskDebtCompletionFeedbackStatus = "cleared" | "needs_follow_up";

export interface TaskDebtCompletionFeedbackTask {
  dispatchKey: string;
  title: string;
  actionLabel?: string;
  href?: string;
}

export interface TaskDebtCompletionFeedbackInput {
  actionLabel: string;
  blockerType?: string | null;
  previousDebtCount?: number | null;
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
  autoFocusHref: string;
}

export interface TaskDebtFocusChangeNoticeInput {
  label: string;
  previousDebtCount: number | null;
  currentDebtCount: number;
  resumeActionLabel?: string | null;
  resumeActionHref?: string | null;
}

export interface TaskDebtFocusChangeNotice {
  tone: "reduced" | "cleared" | "unchanged";
  message: string;
  actionLabel: string | null;
  actionHref: string | null;
}

function taskDebtAutoFocusHref(input: Pick<TaskDebtCompletionFeedbackInput, "blockerType" | "previousDebtCount">) {
  const blockerType = input.blockerType?.trim();
  const params = new URLSearchParams({ view: "blocked" });
  if (blockerType) {
    params.set("debt", blockerType);
    params.set("cleared", blockerType);
  }
  if (typeof input.previousDebtCount === "number" && Number.isFinite(input.previousDebtCount)) {
    params.set("previousDebt", String(Math.max(0, Math.round(input.previousDebtCount))));
  }
  return `/tasks?${params.toString()}#task-debt`;
}

export function buildTaskDebtFocusChangeNotice(input: TaskDebtFocusChangeNoticeInput): TaskDebtFocusChangeNotice | null {
  if (input.previousDebtCount === null || !Number.isFinite(input.previousDebtCount)) return null;
  const previous = Math.max(0, Math.round(input.previousDebtCount));
  const current = Math.max(0, Math.round(input.currentDebtCount));
  const delta = previous - current;

  if (current === 0 && previous > 0) {
    return {
      tone: "cleared",
      message: `刚回写${input.label}清债证据：提交前 ${previous} 个，现在已经清空。可以恢复后续生产。`,
      actionLabel: input.resumeActionLabel ?? null,
      actionHref: input.resumeActionHref ?? null,
    };
  }

  if (delta > 0) {
    return {
      tone: "reduced",
      message: `刚回写${input.label}清债证据：提交前 ${previous} 个，现在 ${current} 个，已减少 ${delta} 个。继续处理剩余阻塞。`,
      actionLabel: null,
      actionHref: null,
    };
  }

  return {
    tone: "unchanged",
    message: `刚回写${input.label}清债证据：提交前 ${previous} 个，现在仍是 ${current} 个。证据可能生成了后续动作，或仍缺验收项。`,
    actionLabel: null,
    actionHref: null,
  };
}

export function buildTaskDebtCompletionFeedback(input: TaskDebtCompletionFeedbackInput): TaskDebtCompletionFeedback {
  const followUps = input.followUpTasks ?? [];
  const firstDayFollowUp = followUps.find((task) => task.dispatchKey.startsWith("first-day:")) ?? null;
  const autoFocusHref = taskDebtAutoFocusHref(input);

  if (firstDayFollowUp) {
    return {
      status: "needs_follow_up",
      message: `${input.actionLabel}已回写，但清债还没结束：下一张首日卡是「${firstDayFollowUp.title}」。先处理它，再回任务队列复查阻塞是否下降。`,
      actionLabel: firstDayFollowUp.actionLabel || "继续处理",
      href: firstDayFollowUp.href || "/dispatch#first-day-dispatch",
      autoFocusHref,
    };
  }

  if (followUps.length > 0) {
    const titleList = followUps.map((task) => `「${task.title}」`).join("、");
    return {
      status: "needs_follow_up",
      message: `${input.actionLabel}已回写，并生成 ${followUps.length} 个后续动作：${titleList}。先处理后续动作，再回任务队列复查阻塞是否下降。`,
      actionLabel: followUps[0].actionLabel || "处理后续动作",
      href: followUps[0].href || "/gate",
      autoFocusHref,
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
    href: autoFocusHref,
    autoFocusHref,
  };
}
