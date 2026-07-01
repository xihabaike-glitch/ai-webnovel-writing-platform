export interface AiTaskWorkflowInput {
  id: string;
  taskType: string;
  model: string;
  status: string;
  outputText: string | null;
  errorMessage: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
  createdAt: Date | string;
  modelProvider?: {
    providerId: string;
    displayName: string;
  };
}

export interface AiTaskWorkflowItem {
  id: string;
  taskType: string;
  label: string;
  status: string;
  model: string;
  providerName: string;
  providerId: string;
  outputText: string | null;
  outputPreview: string;
  errorMessage: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
  createdAt: string;
}

const taskLabels: Record<string, string> = {
  chapter_draft: "正文初稿",
  chapter_review: "章节审稿",
};

function previewOutput(outputText: string | null) {
  if (!outputText) return "";
  const compact = outputText.replace(/\s+/g, " ").trim();
  return compact.length > 120 ? `${compact.slice(0, 120)}...` : compact;
}

export function summarizeAiTasks(tasks: AiTaskWorkflowInput[]): AiTaskWorkflowItem[] {
  return tasks.map((task) => ({
    id: task.id,
    taskType: task.taskType,
    label: taskLabels[task.taskType] ?? task.taskType,
    status: task.status,
    model: task.model,
    providerName: task.modelProvider?.displayName ?? "未知模型",
    providerId: task.modelProvider?.providerId ?? "unknown",
    outputText: task.outputText,
    outputPreview: previewOutput(task.outputText),
    errorMessage: task.errorMessage,
    inputTokens: task.inputTokens,
    outputTokens: task.outputTokens,
    costUsd: task.costUsd,
    createdAt: new Date(task.createdAt).toISOString(),
  }));
}

export function latestTaskStatus(items: AiTaskWorkflowItem[], taskType: string) {
  return items.find((item) => item.taskType === taskType)?.status ?? "not_started";
}
