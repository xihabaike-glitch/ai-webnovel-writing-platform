import type { AiTask, ModelProvider } from "@prisma/client";
import { prisma } from "../db/prisma.ts";
import { getModelProviderCandidates, type SelectedModelProviderCandidate } from "./activeProvider.ts";
import type { RoutedModelTaskType } from "./taskRouting.ts";
import type { GenerateRequest, GenerateResult, ModelProviderId } from "./types.ts";

export interface RoutedGenerationAttempt {
  taskId: string;
  providerConfigId: string;
  providerId: string;
  displayName: string;
  model: string;
  role: "primary" | "fallback" | "auto";
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
  attempts: RoutedGenerationAttempt[];
}

export interface RunRoutedGenerationOptions {
  projectId: string;
  chapterId?: string;
  taskType: RoutedModelTaskType;
  inputSnapshot: unknown;
  request: Omit<GenerateRequest, "providerId" | "model">;
  validateResult?: (result: GenerateResult, provider: ModelProvider) => void;
}

function providerLabel(candidate: SelectedModelProviderCandidate) {
  return `${candidate.provider.displayName} · ${candidate.provider.defaultModel}`;
}

function snapshotWithAttempt(inputSnapshot: unknown, candidate: SelectedModelProviderCandidate, attemptNumber: number) {
  return JSON.stringify({
    input: inputSnapshot,
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
  const candidates = await getModelProviderCandidates(options.taskType);
  const attempts: RoutedGenerationAttempt[] = [];
  let lastFailure: RoutedGenerationFailure | null = null;

  for (const [index, candidate] of candidates.entries()) {
    const task = await prisma.aiTask.create({
      data: {
        projectId: options.projectId,
        chapterId: options.chapterId,
        taskType: options.taskType,
        providerConfigId: candidate.provider.id,
        model: candidate.provider.defaultModel,
        status: "running",
        inputSnapshot: snapshotWithAttempt(options.inputSnapshot, candidate, index + 1),
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
