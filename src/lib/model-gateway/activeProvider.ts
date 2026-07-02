import type { ModelProvider } from "@prisma/client";
import { prisma } from "../db/prisma.ts";
import { createModelAdapter } from "./adapterFactory.ts";
import { selectModelProviderCandidatesForTask, selectModelProviderForTask } from "./providerSelection.ts";
import type { RoutedModelTaskType } from "./taskRouting.ts";
import type { ModelAdapter } from "./types.ts";

export interface SelectedModelProvider {
  provider: ModelProvider;
  adapter: ModelAdapter;
}

export interface SelectedModelProviderCandidate extends SelectedModelProvider {
  role: "primary" | "fallback" | "auto";
}

async function ensureMockProvider() {
  return prisma.modelProvider.upsert({
    where: { id: "mock-provider" },
    create: {
      id: "mock-provider",
      providerId: "mock",
      displayName: "Mock Provider",
      defaultModel: "mock-writer",
      enabled: true,
    },
    update: {
      enabled: true,
    },
  });
}

export async function getActiveModelProvider(taskType?: RoutedModelTaskType): Promise<SelectedModelProvider> {
  const providers = await prisma.modelProvider.findMany({
    orderBy: { updatedAt: "desc" },
  });
  let provider: ModelProvider | undefined;

  if (taskType) {
    const route = await prisma.modelTaskRoute.findUnique({
      where: { taskType },
      include: {
        primaryProvider: true,
        fallbackProvider: true,
      },
    });
    provider = selectModelProviderForTask(providers, route);
  }

  provider = provider ?? selectModelProviderForTask(providers) ?? await ensureMockProvider();

  return {
    provider,
    adapter: createModelAdapter(provider),
  };
}

export async function getModelProviderCandidates(taskType?: RoutedModelTaskType): Promise<SelectedModelProviderCandidate[]> {
  let providers = await prisma.modelProvider.findMany({
    orderBy: { updatedAt: "desc" },
  });

  if (providers.length === 0) {
    providers = [await ensureMockProvider()];
  }

  let route: {
    primaryProvider?: ModelProvider | null;
    fallbackProvider?: ModelProvider | null;
  } | null = null;

  if (taskType) {
    route = await prisma.modelTaskRoute.findUnique({
      where: { taskType },
      include: {
        primaryProvider: true,
        fallbackProvider: true,
      },
    });
  }

  let candidates = selectModelProviderCandidatesForTask(providers, route);

  if (candidates.length === 0) {
    const mockProvider = await ensureMockProvider();
    candidates = [{ provider: mockProvider, role: "auto" }];
  }

  return candidates.map((candidate) => ({
    role: candidate.role,
    provider: candidate.provider,
    adapter: createModelAdapter(candidate.provider),
  }));
}
