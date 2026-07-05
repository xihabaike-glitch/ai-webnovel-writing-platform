export interface TacticExperienceFollowupCompletionMessageInput {
  actionLabel: string;
  knowledgeFeedbackWritten: boolean;
  followUpCount: number;
}

export function buildTacticExperienceFollowupCompletionMessage(input: TacticExperienceFollowupCompletionMessageInput) {
  const feedbackText = input.knowledgeFeedbackWritten ? "已回写平台知识反馈" : "已提交完成依据";
  const followUpText = input.followUpCount > 0 ? `，并生成 ${input.followUpCount} 个后续动作` : "";
  return `${input.actionLabel}已完成，${feedbackText}${followUpText}。刷新后这张打法闭环卡会从任务队列移除。`;
}
