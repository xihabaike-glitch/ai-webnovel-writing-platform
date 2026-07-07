import type { AiTask, ModelProvider } from "@prisma/client";
import { prisma } from "../db/prisma.ts";
import { buildModelBudgetGuard, type ModelBudgetGuard } from "../ai/modelBudget.ts";
import { getModelProviderCandidates, type SelectedModelProviderCandidate } from "./activeProvider.ts";
import type { ForcedProviderTarget, ProviderCandidateRole } from "./providerSelection.ts";
import { labelForRoutedTask, type RoutedModelTaskType } from "./taskRouting.ts";
import type { GenerateRequest, GenerateResult, ModelProviderId } from "./types.ts";

export interface RoutedGenerationAttempt {
  taskId: string;
  providerConfigId: string;
  providerId: string;
  displayName: string;
  model: string;
  role: ProviderCandidateRole;
  status: "succeeded" | "failed";
  errorMessage?: string;
}

export interface RoutedGenerationSuccess {
  ok: true;
  task: AiTask;
  result: GenerateResult;
  provider: ModelProvider;
  role: RoutedGenerationAttempt["role"];
  attempts: RoutedGenerationAttempt[];
}

export interface RoutedGenerationFailure {
  ok: false;
  task: AiTask;
  provider: ModelProvider;
  role: RoutedGenerationAttempt["role"];
  error: string;
  budgetGuard?: ModelBudgetGuard;
  attempts: RoutedGenerationAttempt[];
}

export type RoutedGenerationConfirmationMode = "auto" | "manual_recommended" | "manual_required";

export interface RoutedGenerationRouteDecisionCandidate {
  role: ProviderCandidateRole;
  provider: Pick<ModelProvider, "id" | "providerId" | "displayName" | "defaultModel">;
}

export interface RoutedGenerationRouteDecision {
  taskType: RoutedModelTaskType;
  taskLabel: string;
  headline: string;
  primaryProviderName: string;
  fallbackProviderName: string | null;
  selectionReason: string;
  failoverPlan: string;
  costPressure: string;
  confirmationMode: RoutedGenerationConfirmationMode;
  acceptanceChecklist: string[];
}

export interface RunRoutedGenerationOptions {
  projectId: string;
  chapterId?: string;
  taskType: RoutedModelTaskType;
  inputSnapshot: unknown;
  request: Omit<GenerateRequest, "providerId" | "model">;
  validateResult?: (result: GenerateResult, provider: ModelProvider) => void;
  forcedProvider?: ForcedProviderTarget;
}

function providerLabel(candidate: SelectedModelProviderCandidate) {
  return `${candidate.provider.displayName} · ${candidate.provider.defaultModel}`;
}

function routeProviderLabel(candidate: RoutedGenerationRouteDecisionCandidate) {
  return `${candidate.provider.displayName} · ${candidate.provider.defaultModel}`;
}

function money4(value: number) {
  return `$${value.toFixed(4)}`;
}

export function buildRoutedGenerationRouteDecision(input: {
  taskType: RoutedModelTaskType;
  candidates: RoutedGenerationRouteDecisionCandidate[];
  budgetGuard?: ModelBudgetGuard;
}): RoutedGenerationRouteDecision {
  const taskLabel = labelForRoutedTask(input.taskType);
  const primary = input.candidates.find((candidate) => candidate.role === "primary")
    ?? input.candidates.find((candidate) => candidate.role === "forced")
    ?? input.candidates[0];
  const fallback = input.candidates.find((candidate) => candidate.role === "fallback");
  const primaryProviderName = primary ? routeProviderLabel(primary) : "未配置";
  const fallbackProviderName = fallback ? routeProviderLabel(fallback) : null;
  const status = input.budgetGuard?.status ?? "safe";
  const confirmationMode: RoutedGenerationConfirmationMode = status === "block"
    ? "manual_required"
    : status === "warn" || !fallbackProviderName
      ? "manual_recommended"
      : "auto";
  const budgetSummary = input.budgetGuard
    ? `${money4(input.budgetGuard.estimatedTaskCostUsd)} / 次；${input.budgetGuard.summary}`
    : "暂无历史成本样本，执行后回写真实 Token 和费用。";

  return {
    taskType: input.taskType,
    taskLabel,
    headline: `${taskLabel}将使用 ${primaryProviderName}${fallbackProviderName ? `，备用 ${fallbackProviderName}` : "，暂无备用模型"}。`,
    primaryProviderName,
    fallbackProviderName,
    selectionReason: `${taskLabel}先走主模型 ${primaryProviderName}，让模型按写作任务分工，而不是退回通用聊天壳。`,
    failoverPlan: fallbackProviderName
      ? `主模型失败后切换到 ${fallbackProviderName}，失败信息会留在任务记录里供复检。`
      : "当前没有备用模型，主模型失败后需要人工补路由或重试，不建议直接放量。",
    costPressure: `成本压力：预计 ${budgetSummary}`,
    confirmationMode,
    acceptanceChecklist: [
      `主模型已匹配 ${taskLabel} 职责`,
      fallbackProviderName ? "失败替代路线已配置" : "补一个可用备用模型再放量",
      confirmationMode === "auto" ? "预算检查通过，可自动执行" : "建议人工确认预算、失败替代和复检入口后再执行",
    ],
  };
}

function snapshotWithAttempt(
  inputSnapshot: unknown,
  candidate: SelectedModelProviderCandidate,
  attemptNumber: number,
  routeDecision: RoutedGenerationRouteDecision,
) {
  return JSON.stringify({
    input: inputSnapshot,
    routeDecision,
    routeAttempt: {
      attemptNumber,
      role: candidate.role,
      providerConfigId: candidate.provider.id,
      providerId: candidate.provider.providerId,
      displayName: candidate.provider.displayName,
      model: candidate.provider.defaultModel,
    },
  });
}

export async function runRoutedGeneration(options: RunRoutedGenerationOptions): Promise<RoutedGenerationSuccess | RoutedGenerationFailure> {
  const candidates = await getModelProviderCandidates(options.taskType, {
    forcedProvider: options.forcedProvider,
  });
  if (candidates.length === 0) {
    throw new Error("指定复测模型不可用，请检查模型是否启用、密钥是否可用，或重新限定避坑规则。");
  }
  const attempts: RoutedGenerationAttempt[] = [];
  let lastFailure: RoutedGenerationFailure | null = null;
  const [project, budgetTasks] = await Promise.all([
    prisma.project.findUnique({
      where: { id: options.projectId },
      select: {
        aiMonthlyBudgetUsd: true,
        aiMaxTaskCostUsd: true,
        aiMaxBatchCostUsd: true,
        aiMaxFailureRatePercent: true,
        aiBudgetEnforcement: true,
      },
    }),
    prisma.aiTask.findMany({
      where: { projectId: options.projectId },
      select: {
        taskType: true,
        status: true,
        costUsd: true,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
  ]);
  const budgetGuard = buildModelBudgetGuard({
    settings: project,
    tasks: budgetTasks,
    taskType: options.taskType,
  });
  const routeDecision = buildRoutedGenerationRouteDecision({
    taskType: options.taskType,
    candidates,
    budgetGuard,
  });

  if (!budgetGuard.allowed) {
    const candidate = candidates[0];
    const task = await prisma.aiTask.create({
      data: {
        projectId: options.projectId,
        chapterId: options.chapterId,
        taskType: options.taskType,
        providerConfigId: candidate.provider.id,
        model: candidate.provider.defaultModel,
        status: "failed",
        inputSnapshot: JSON.stringify({
          input: options.inputSnapshot,
          routeDecision,
          budgetGuard,
        }),
        errorMessage: `预算拦截：${budgetGuard.summary}`,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
      },
    });
    const attempt: RoutedGenerationAttempt = {
      taskId: task.id,
      providerConfigId: candidate.provider.id,
      providerId: candidate.provider.providerId,
      displayName: candidate.provider.displayName,
      model: candidate.provider.defaultModel,
      role: candidate.role,
      status: "failed",
      errorMessage: `预算拦截：${budgetGuard.summary}`,
    };

    return {
      ok: false,
      task,
      provider: candidate.provider,
      role: candidate.role,
      error: `预算拦截：${budgetGuard.summary}`,
      budgetGuard,
      attempts: [attempt],
    };
  }

  for (const [index, candidate] of candidates.entries()) {
    const task = await prisma.aiTask.create({
      data: {
        projectId: options.projectId,
        chapterId: options.chapterId,
        taskType: options.taskType,
        providerConfigId: candidate.provider.id,
        model: candidate.provider.defaultModel,
        status: "running",
        inputSnapshot: snapshotWithAttempt(options.inputSnapshot, candidate, index + 1, routeDecision),
      },
    });

    try {
      const result = await candidate.adapter.generate({
        ...options.request,
        providerId: candidate.provider.providerId as ModelProviderId,
        model: candidate.provider.defaultModel,
      });
      options.validateResult?.(result, candidate.provider);

      const updatedTask = await prisma.aiTask.update({
        where: { id: task.id },
        data: {
          status: "succeeded",
          outputText: result.text,
          inputTokens: result.usage?.inputTokens,
          outputTokens: result.usage?.outputTokens,
          costUsd: result.usage?.costUsd,
        },
      });

      attempts.push({
        taskId: updatedTask.id,
        providerConfigId: candidate.provider.id,
        providerId: candidate.provider.providerId,
        displayName: candidate.provider.displayName,
        model: candidate.provider.defaultModel,
        role: candidate.role,
        status: "succeeded",
      });

      return {
        ok: true,
        task: updatedTask,
        result,
        provider: candidate.provider,
        role: candidate.role,
        attempts,
      };
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : `Unknown ${options.taskType} error`;
      const retryHint = index < candidates.length - 1
        ? `；已切换下一个模型：${providerLabel(candidates[index + 1])}`
        : "";
      const failedTask = await prisma.aiTask.update({
        where: { id: task.id },
        data: {
          status: "failed",
          errorMessage: `${message}${retryHint}`,
        },
      });

      attempts.push({
        taskId: failedTask.id,
        providerConfigId: candidate.provider.id,
        providerId: candidate.provider.providerId,
        displayName: candidate.provider.displayName,
        model: candidate.provider.defaultModel,
        role: candidate.role,
        status: "failed",
        errorMessage: message,
      });

      lastFailure = {
        ok: false,
        task: failedTask,
        provider: candidate.provider,
        role: candidate.role,
        error: message,
        attempts,
      };
    }
  }

  if (!lastFailure) {
    throw new Error("No model provider candidate is available.");
  }

  return lastFailure;
}
