export interface AiTaskWorkflowInput {
  id: string;
  taskType: string;
  model: string;
  status: string;
  outputText: string | null;
  errorMessage: string | null;
  inputSnapshot?: string | null;
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
  recoveryMemoryAudit: AiRecoveryMemoryAudit | null;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
  createdAt: string;
}

export interface AiRecoveryMemoryAudit {
  used: boolean;
  lifecycleStatus: "active" | "sample_required" | "rollback";
  lifecycleLabel: string;
  sourceLabel: string;
  summary: string;
  latestAt: string | null;
}

const taskLabels: Record<string, string> = {
  chapter_draft: "正文初稿",
  chapter_review: "章节审稿",
  chapter_second_pass: "章节二改",
  chapter_adopt_candidate: "采纳候选稿",
  first_three_rewrite: "前三章改写",
  submission_package_optimize: "投稿资料优化",
  platform_submission_asset_optimize: "平台投稿资产优化",
  control_asset_generate: "总控资料生成",
};

function previewOutput(outputText: string | null) {
  if (!outputText) return "";
  const compact = outputText.replace(/\s+/g, " ").trim();
  return compact.length > 120 ? `${compact.slice(0, 120)}...` : compact;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseJsonObject(value: string | null | undefined) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function textValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function recoverySummary(promptBlock: string) {
  const line = promptBlock
    .split(/\r?\n/u)
    .map((item) => item.replace(/^[-\s]+/u, "").trim())
    .find((item) => item && !item.startsWith("AI 写审改恢复证据"));
  return line ?? promptBlock.replace(/\s+/g, " ").trim();
}

function recoveryLifecycleStatus(value: unknown): AiRecoveryMemoryAudit["lifecycleStatus"] {
  if (value === "rollback" || value === "sample_required" || value === "active") return value;
  return "active";
}

function parseRecoveryMemoryAudit(inputSnapshot: string | null | undefined): AiRecoveryMemoryAudit | null {
  const snapshot = parseJsonObject(inputSnapshot);
  const input = isRecord(snapshot?.input) ? snapshot.input : snapshot;
  const memory = isRecord(input?.aiRecoveryMemory) ? input.aiRecoveryMemory : null;
  const promptBlock = textValue(memory?.promptBlock);
  if (!memory || !promptBlock) return null;
  const lifecycleStatus = recoveryLifecycleStatus(memory.lifecycleStatus);
  return {
    used: true,
    lifecycleStatus,
    lifecycleLabel: textValue(memory.lifecycleLabel) ?? (lifecycleStatus === "rollback" ? "回滚小样本" : lifecycleStatus === "sample_required" ? "等待小样本" : "继续生效"),
    sourceLabel: textValue(memory.sourceLabel) ?? "AI 写审改恢复证据",
    summary: recoverySummary(promptBlock),
    latestAt: textValue(memory.latestAt),
  };
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
    recoveryMemoryAudit: parseRecoveryMemoryAudit(task.inputSnapshot),
    inputTokens: task.inputTokens,
    outputTokens: task.outputTokens,
    costUsd: task.costUsd,
    createdAt: new Date(task.createdAt).toISOString(),
  }));
}

export function latestTaskStatus(items: AiTaskWorkflowItem[], taskType: string) {
  return items.find((item) => item.taskType === taskType)?.status ?? "not_started";
}
