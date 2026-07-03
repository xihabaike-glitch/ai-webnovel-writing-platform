import { AppShell } from "@/components/app-shell/AppShell";
import { ModelProviderSettings } from "@/components/settings/ModelProviderSettings";
import { prisma } from "@/lib/db/prisma";
import { buildPresetRouteBlueprint } from "@/lib/model-gateway/presetRouteBlueprint";
import { providerModelPresets, providerOptions } from "@/lib/model-gateway/providerDefaults";
import { buildProviderHealthDashboard } from "@/lib/model-gateway/providerHealth";
import { buildRouteEffectAudit } from "@/lib/model-gateway/routeEffectAudit";
import { buildRouteRecommendations } from "@/lib/model-gateway/routeRecommendations";
import { modelTaskRouteOptions } from "@/lib/model-gateway/taskRouting";

export const dynamic = "force-dynamic";

function maskProvider(provider: {
  id: string;
  providerId: string;
  displayName: string;
  baseUrl: string | null;
  encryptedApiKey: string | null;
  defaultModel: string;
  enabled: boolean;
  maxContextTokens: number | null;
  updatedAt: Date;
}) {
  return {
    id: provider.id,
    providerId: provider.providerId,
    displayName: provider.displayName,
    baseUrl: provider.baseUrl,
    hasApiKey: Boolean(provider.encryptedApiKey),
    defaultModel: provider.defaultModel,
    enabled: provider.enabled,
    maxContextTokens: provider.maxContextTokens,
    updatedAt: provider.updatedAt,
  };
}

export default async function ModelSettingsPage() {
  const [providers, routes, recentTasks] = await Promise.all([
    prisma.modelProvider.findMany({
      orderBy: { updatedAt: "desc" },
    }),
    prisma.modelTaskRoute.findMany({
      orderBy: { taskType: "asc" },
    }),
    prisma.aiTask.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        id: true,
        taskType: true,
        providerConfigId: true,
        status: true,
        inputTokens: true,
        outputTokens: true,
        costUsd: true,
        outputText: true,
        createdAt: true,
      },
    }),
  ]);
  const maskedProviders = providers.map(maskProvider);
  const healthDashboard = buildProviderHealthDashboard(maskedProviders);
  const routeEffectAudit = buildRouteEffectAudit(
    recentTasks,
    routes,
    providers.map((provider) => ({
      id: provider.id,
      displayName: provider.displayName,
      defaultModel: provider.defaultModel,
    })),
  );
  const routeRecommendations = buildRouteRecommendations(recentTasks, routes, providers.map((provider) => ({
    id: provider.id,
    providerId: provider.providerId,
    displayName: provider.displayName,
    defaultModel: provider.defaultModel,
    enabled: provider.enabled,
    encryptedApiKey: provider.encryptedApiKey,
  })));
  const presetRouteBlueprint = buildPresetRouteBlueprint(providers.map((provider) => ({
    id: provider.id,
    providerId: provider.providerId,
    displayName: provider.displayName,
    defaultModel: provider.defaultModel,
    enabled: provider.enabled,
    encryptedApiKey: provider.encryptedApiKey,
  })), routes);

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">模型设置</h1>
      <p className="mt-1 text-sm text-slate-600">配置 Claude、DeepSeek、Kimi、GPT、兼容网关或本地 Ollama。</p>
      <ModelProviderSettings
        healthDashboard={healthDashboard}
        options={providerOptions}
        presets={providerModelPresets}
        presetRouteBlueprint={presetRouteBlueprint}
        providers={maskedProviders}
        routeEffectAudit={routeEffectAudit}
        routeRecommendations={routeRecommendations}
        routeOptions={modelTaskRouteOptions}
        routes={routes.map((route) => ({
          id: route.id,
          taskType: route.taskType,
          primaryProviderConfigId: route.primaryProviderConfigId,
          fallbackProviderConfigId: route.fallbackProviderConfigId,
        }))}
      />
    </AppShell>
  );
}
