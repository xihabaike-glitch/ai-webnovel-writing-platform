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

export interface AiRecoveryMemoryDiagnostic {
  status: "empty" | "healthy" | "watch" | "rollback";
  label: string;
  detail: string;
  actionLabel: string;
  sourceLabel: string | null;
  evidence: string[];
}

export interface AiRecoveryMemoryControlRequest {
  endpoint: string;
  body: {
    areaId: "ai-pipeline";
    mode: "seed";
    memoryAction: "rollback";
    memorySource: {
      kind: "chapter_workflow_diagnostic";
      chapterId: string;
      chapterTitle: string;
      label: string;
      detail: string;
      sourceLabel: string | null;
      evidence: string[];
    };
  };
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

function numericValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function reviewIssueTypes(outputText: string | null) {
  const parsed = parseJsonObject(outputText);
  const issues = Array.isArray(parsed?.issues) ? parsed.issues : [];
  return issues
    .filter(isRecord)
    .map((issue) => textValue(issue.type))
    .filter((type): type is string => Boolean(type));
}

function reviewScore(outputText: string | null) {
  return numericValue(parseJsonObject(outputText)?.score);
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

export function buildAiRecoveryMemoryDiagnostic(items: AiTaskWorkflowItem[]): AiRecoveryMemoryDiagnostic {
  const recoveryReviews = items
    .filter((item) => item.taskType === "chapter_review" && item.status === "succeeded" && item.recoveryMemoryAudit)
    .map((item) => {
      const score = reviewScore(item.outputText);
      const issueTypes = reviewIssueTypes(item.outputText);
      const weak = (score !== null && score < 85) || issueTypes.includes("ai_recovery");
      return {
        item,
        score,
        issueTypes,
        weak,
      };
    })
    .sort((left, right) => new Date(right.item.createdAt).getTime() - new Date(left.item.createdAt).getTime());

  if (recoveryReviews.length === 0) {
    return {
      status: "empty",
      label: "暂无恢复记忆审计",
      detail: "还没有带恢复记忆的审稿样本。",
      actionLabel: "等待样本",
      sourceLabel: null,
      evidence: [],
    };
  }

  const latest = recoveryReviews[0];
  const weakStreak = recoveryReviews.slice(0, 2).filter((item) => item.weak).length;
  const evidence = recoveryReviews.slice(0, 2).map(({ item, score, issueTypes }) => [
    `${item.label} ${score ?? "无分数"} 分`,
    issueTypes.length ? `问题：${issueTypes.join("、")}` : "",
    item.recoveryMemoryAudit?.lifecycleLabel ?? "",
  ].filter(Boolean).join("；"));

  if (weakStreak >= 2) {
    return {
      status: "rollback",
      label: "恢复记忆疑似失效",
      detail: "连续 2 次带恢复记忆的审稿仍低于 85 分或命中 ai_recovery 问题，别继续放大。",
      actionLabel: "回滚小样本",
      sourceLabel: latest.item.recoveryMemoryAudit?.sourceLabel ?? null,
      evidence,
    };
  }

  if (latest.weak) {
    return {
      status: "watch",
      label: "恢复记忆观察中",
      detail: "最近一次带恢复记忆的审稿仍有低分或恢复相关问题；下一次仍弱就回滚小样本。",
      actionLabel: "再看 1 次",
      sourceLabel: latest.item.recoveryMemoryAudit?.sourceLabel ?? null,
      evidence,
    };
  }

  return {
    status: "healthy",
    label: "恢复记忆未触发失效",
    detail: "最近带恢复记忆的审稿过线，继续小批观察。",
    actionLabel: "继续观察",
    sourceLabel: latest.item.recoveryMemoryAudit?.sourceLabel ?? null,
    evidence,
  };
}

export function buildAiRecoveryMemoryControlRequest(input: {
  projectId: string;
  chapterId: string;
  chapterTitle: string;
  diagnostic: AiRecoveryMemoryDiagnostic | null;
}): AiRecoveryMemoryControlRequest | null {
  if (!input.diagnostic || input.diagnostic.status !== "rollback") return null;

  return {
    endpoint: `/api/projects/${input.projectId}/control-actions`,
    body: {
      areaId: "ai-pipeline",
      mode: "seed",
      memoryAction: "rollback",
      memorySource: {
        kind: "chapter_workflow_diagnostic",
        chapterId: input.chapterId,
        chapterTitle: input.chapterTitle,
        label: input.diagnostic.label,
        detail: input.diagnostic.detail,
        sourceLabel: input.diagnostic.sourceLabel,
        evidence: input.diagnostic.evidence,
      },
    },
  };
}
