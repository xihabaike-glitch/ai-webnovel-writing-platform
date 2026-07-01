export type DirectRetryTaskType = "chapter_draft" | "chapter_review" | "chapter_second_pass";
export type SecondPassMode = "more_hook" | "more_payoff" | "less_exposition" | "more_emotion" | "platform_fit";

export interface RetryableTaskInput {
  id: string;
  chapterId: string | null;
  taskType: string;
  inputSnapshot: string;
  status: string;
}

export interface TaskRetryPlan {
  supported: boolean;
  reason: string;
  actionLabel: string;
}

export interface SecondPassRetryPayload {
  instruction: string;
  mode: SecondPassMode;
  targetWords?: number;
}

export function isDirectRetryTaskType(taskType: string): taskType is DirectRetryTaskType {
  return taskType === "chapter_draft" || taskType === "chapter_review" || taskType === "chapter_second_pass";
}

function normalizeRetrySecondPassMode(mode: string | undefined): SecondPassMode {
  const modes: SecondPassMode[] = ["more_hook", "more_payoff", "less_exposition", "more_emotion", "platform_fit"];
  return modes.includes(mode as SecondPassMode) ? (mode as SecondPassMode) : "platform_fit";
}

export function buildTaskRetryPlan(task: Pick<RetryableTaskInput, "chapterId" | "taskType" | "status" | "inputSnapshot">): TaskRetryPlan {
  if (task.status !== "failed") {
    return {
      supported: false,
      actionLabel: "查看任务",
      reason: "只有失败任务才需要一键重试。",
    };
  }
  if (!task.chapterId) {
    return {
      supported: false,
      actionLabel: "回项目处理",
      reason: "这个任务没有绑定章节，先回项目页人工处理。",
    };
  }
  if (!isDirectRetryTaskType(task.taskType)) {
    return {
      supported: false,
      actionLabel: "回项目处理",
      reason: "这个任务类型暂不支持一键重试，需要回到项目页重新执行。",
    };
  }
  if (task.taskType === "chapter_second_pass" && !parseSecondPassRetryPayload(task.inputSnapshot)) {
    return {
      supported: false,
      actionLabel: "回章节处理",
      reason: "旧二改任务缺少作者指令，先回章节页确认方向后再重试。",
    };
  }

  return {
    supported: true,
    actionLabel: "一键重试",
    reason: task.taskType === "chapter_second_pass"
      ? "可复用原二改指令重新执行。"
      : "可直接复用当前章节内容重新执行。",
  };
}

export function parseSecondPassRetryPayload(inputSnapshot: string): SecondPassRetryPayload | null {
  try {
    const parsed = JSON.parse(inputSnapshot) as {
      instruction?: unknown;
      mode?: unknown;
      prompt?: { targetWords?: unknown };
      targetWords?: unknown;
    };
    const instruction = typeof parsed.instruction === "string" ? parsed.instruction.trim() : "";
    if (!instruction) return null;
    const rawTargetWords = typeof parsed.targetWords === "number"
      ? parsed.targetWords
      : typeof parsed.prompt?.targetWords === "number"
        ? parsed.prompt.targetWords
        : undefined;

    return {
      instruction,
      mode: normalizeRetrySecondPassMode(typeof parsed.mode === "string" ? parsed.mode : undefined),
      targetWords: rawTargetWords && rawTargetWords > 0 ? rawTargetWords : undefined,
    };
  } catch {
    return null;
  }
}
