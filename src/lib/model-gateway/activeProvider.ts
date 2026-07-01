import type { ModelProvider } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { createModelAdapter } from "./adapterFactory.ts";
import { selectModelProviderForTask } from "./providerSelection.ts";
import type { RoutedModelTaskType } from "./taskRouting.ts";
import type { ModelAdapter } from "./types.ts";

export interface SelectedModelProvider {
  provider: ModelProvider;
  adapter: ModelAdapter;
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
