import { AppShell } from "@/components/app-shell/AppShell";
import { ModelProviderSettings } from "@/components/settings/ModelProviderSettings";
import { prisma } from "@/lib/db/prisma";
import { buildPresetRouteBlueprint } from "@/lib/model-gateway/presetRouteBlueprint";
import { providerModelPresets, providerOptions } from "@/lib/model-gateway/providerDefaults";
import { buildProviderHealthDashboard } from "@/lib/model-gateway/providerHealth";
import { buildRouteEffectAudit } from "@/lib/model-gateway/routeEffectAudit";
import {
  applyRouteAvoidanceOverrides,
  buildRouteAvoidanceDecisionHistory,
  buildRouteAvoidanceGovernance,
  buildRouteAvoidanceRulesFromDispatchTasks,
  buildRouteRecommendations,
  routeAvoidanceOverrideFromRecord,
  type RouteAvoidanceOverride,
} from "@/lib/model-gateway/routeRecommendations";
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
  const [providers, routes, recentTasks, completedRouteRepairs, completedRouteRetests, routeAvoidanceOverrides] = await Promise.all([
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
    prisma.gateDispatchTask.findMany({
      where: {
        stage: "failure_route_repair",
        state: "completed",
      },
      orderBy: { completedAt: "desc" },
      take: 100,
      select: {
        stage: true,
        state: true,
        completionEvidence: true,
        evidence: true,
      },
    }),
    prisma.gateDispatchTask.findMany({
      where: {
        stage: "model_route_retest",
        state: "completed",
      },
      orderBy: { completedAt: "desc" },
      take: 100,
      select: {
        dispatchKey: true,
        stage: true,
        state: true,
        completionEvidence: true,
        evidence: true,
        completedAt: true,
      },
    }),
    prisma.modelRouteAvoidanceOverride.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        ruleKey: true,
        action: true,
        taskType: true,
        note: true,
        expiresAt: true,
        updatedAt: true,
      },
    }),
  ]);
  const maskedProviders = providers.map(maskProvider);
  const routeProviders = providers.map((provider) => ({
    id: provider.id,
    providerId: provider.providerId,
    displayName: provider.displayName,
    defaultModel: provider.defaultModel,
    enabled: provider.enabled,
    encryptedApiKey: provider.encryptedApiKey,
  }));
  const rawRouteAvoidanceRules = buildRouteAvoidanceRulesFromDispatchTasks(completedRouteRepairs, routeProviders);
  const routeAvoidanceOverrideInputs = routeAvoidanceOverrides
    .map(routeAvoidanceOverrideFromRecord)
    .filter((override): override is RouteAvoidanceOverride => Boolean(override));
  const routeAvoidanceRules = applyRouteAvoidanceOverrides(rawRouteAvoidanceRules, routeAvoidanceOverrideInputs);
  const routeAvoidanceGovernance = buildRouteAvoidanceGovernance(routeAvoidanceRules, routeProviders, {
    retestDispatches: completedRouteRetests,
  });
  const routeAvoidanceDecisionHistory = buildRouteAvoidanceDecisionHistory(rawRouteAvoidanceRules, routeAvoidanceOverrideInputs, routeProviders, {
    retestDispatches: completedRouteRetests,
  });
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
  const routeRecommendations = buildRouteRecommendations(recentTasks, routes, routeProviders, {
    avoidanceRules: routeAvoidanceRules,
    routeAvoidanceDecisionHistory,
  });
  const presetRouteBlueprint = buildPresetRouteBlueprint(routeProviders, routes);

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
        routeAvoidanceDecisionHistory={routeAvoidanceDecisionHistory}
        routeAvoidanceGovernance={routeAvoidanceGovernance}
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
