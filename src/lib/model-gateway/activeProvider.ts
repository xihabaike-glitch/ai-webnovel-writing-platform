import type { ModelProvider } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { createModelAdapter } from "./adapterFactory.ts";
import type { ModelAdapter } from "./types.ts";

export interface SelectedModelProvider {
  provider: ModelProvider;
  adapter: ModelAdapter;
}

function canUseProvider(provider: ModelProvider) {
  if (!provider.enabled) return false;
  if (provider.providerId === "mock") return true;
  if (provider.providerId === "ollama") return true;
  return Boolean(provider.encryptedApiKey);
}

export async function getActiveModelProvider(): Promise<SelectedModelProvider> {
  const providers = await prisma.modelProvider.findMany({
    orderBy: { updatedAt: "desc" },
  });
  const provider = providers.find((item) => item.providerId !== "mock" && canUseProvider(item))
    ?? providers.find((item) => item.providerId === "mock" && canUseProvider(item))
    ?? (await prisma.modelProvider.upsert({
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
    }));

  return {
    provider,
    adapter: createModelAdapter(provider),
  };
}
