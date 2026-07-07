import { AppShell } from "@/components/app-shell/AppShell";
import { ModelProviderSettings } from "@/components/settings/ModelProviderSettings";
import { prisma } from "@/lib/db/prisma";
import { buildFirstDayRouteSummary } from "@/lib/model-gateway/firstDayRouteSummary";
import { buildModelSetupOnboarding } from "@/lib/model-gateway/modelSetupOnboarding";
import { buildModelRoleMatrix, buildModelRoleMatrixPmFocusNotice, buildModelRoleRouteDraft } from "@/lib/model-gateway/modelRoleMatrix";
import { buildPresetRouteBlueprint } from "@/lib/model-gateway/presetRouteBlueprint";
import { providerModelPresets, providerOptions } from "@/lib/model-gateway/providerDefaults";
import { buildProviderHealthDashboard } from "@/lib/model-gateway/providerHealth";
import { buildProviderSetupGuide } from "@/lib/model-gateway/providerSetupGuide";
import { buildProviderSetupWizard } from "@/lib/model-gateway/providerSetupWizard";
import { buildRouteEffectAudit } from "@/lib/model-gateway/routeEffectAudit";
import {
  buildRouteConfirmationHistory,
  buildRouteConfirmationGovernanceStatusSummary,
  buildRouteConfirmationGovernanceEvidenceFromDispatchTasks,
  buildRouteConfirmationOnboarding,
  buildRouteConfirmationRecheckAdvice,
  buildRouteConfirmationRecheckEvidenceFromDispatchTasks,
  buildRouteConfirmationRecheckResultSummary,
  modelRouteConfirmationReceiptFromAudit,
} from "@/lib/model-gateway/routeConfirmation";
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
import Link from "next/link";

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

function gateReturnFromParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;

  if (!raw?.startsWith("/gate?focus=action-recheck")) {
    return null;
  }

  return raw;
}

export default async function ModelSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ gateReturn?: string | string[] }>;
}) {
  const query = await searchParams;
  const gateReturn = gateReturnFromParam(query?.gateReturn);
  const [
    providers,
    routes,
    recentTasks,
    completedRouteRepairs,
    completedRouteRetests,
    completedRouteConfirmationRechecks,
    routeGovernanceDispatchTasks,
    routeAvoidanceOverrides,
    routeConfirmationAudits,
  ] = await Promise.all([
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
    prisma.gateDispatchTask.findMany({
      where: {
        stage: "model_route_confirmation_recheck",
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
    prisma.gateDispatchTask.findMany({
      where: {
        stage: "model_route_governance",
      },
      orderBy: { reviewLatestAt: "desc" },
      take: 100,
      select: {
        dispatchKey: true,
        stage: true,
        state: true,
        completionEvidence: true,
        evidence: true,
        reviewLatestAt: true,
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
    prisma.gateActionAudit.findMany({
      where: { executionType: "model_route" },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        receiptId: true,
        actionId: true,
        label: true,
        detail: true,
        href: true,
        message: true,
        status: true,
        executionType: true,
        succeededCount: true,
        failedCount: true,
        platformId: true,
        platformName: true,
        recheckStatus: true,
        recheckLabel: true,
        recheckDetail: true,
        recheckAction: true,
        payload: true,
        createdAt: true,
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
  const routeConfirmationRechecks = buildRouteConfirmationRecheckEvidenceFromDispatchTasks(completedRouteConfirmationRechecks);
  const routeConfirmationRecheckAdvice = buildRouteConfirmationRecheckAdvice(routeConfirmationRechecks);
  const routeConfirmationRecheckResultSummary = buildRouteConfirmationRecheckResultSummary(routeConfirmationRechecks);
  const routeConfirmationGovernanceStatus = buildRouteConfirmationGovernanceStatusSummary(routeConfirmationRecheckAdvice, routeGovernanceDispatchTasks);
  const routeConfirmationReceipts = routeConfirmationAudits
    .map(modelRouteConfirmationReceiptFromAudit)
    .filter((receipt): receipt is NonNullable<ReturnType<typeof modelRouteConfirmationReceiptFromAudit>> => Boolean(receipt));
  const routeConfirmationHistory = buildRouteConfirmationHistory(routeConfirmationReceipts, routeConfirmationRechecks);
  const routeGovernanceEvidence = buildRouteConfirmationGovernanceEvidenceFromDispatchTasks(routeGovernanceDispatchTasks);
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
    routeConfirmationRechecks,
    routeGovernanceEvidence,
  });
  const providerSetupGuide = buildProviderSetupGuide({
    options: providerOptions,
    presets: providerModelPresets,
    providers: maskedProviders,
  });
  const providerSetupWizard = buildProviderSetupWizard({
    options: providerOptions,
    presets: providerModelPresets,
    providers: maskedProviders,
  });
  const presetRouteBlueprint = buildPresetRouteBlueprint(routeProviders, routes);
  const firstDayRouteSummary = buildFirstDayRouteSummary({
    providers: routeProviders,
    routes,
    blueprintItems: presetRouteBlueprint.items,
  });
  const modelSetupOnboarding = buildModelSetupOnboarding({
    providerSummary: providerSetupGuide.summary,
    firstDayRouteSummary: firstDayRouteSummary.summary,
  });
  const modelRoleMatrix = buildModelRoleMatrix(maskedProviders);
  const modelRoleMatrixPmFocusNotice = buildModelRoleMatrixPmFocusNotice(modelRoleMatrix);
  const modelRoleRouteDraft = buildModelRoleRouteDraft(maskedProviders, routes);
  const routeConfirmationOnboarding = buildRouteConfirmationOnboarding({
    routeOptions: modelTaskRouteOptions,
    routes,
    confirmations: routeConfirmationReceipts,
  });

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">模型设置</h1>
      <p className="mt-1 text-sm text-slate-600">配置 Claude、DeepSeek、Kimi、GPT、兼容网关或本地 Ollama。</p>
      {gateReturn ? (
        <section className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="font-medium">来自总闸门复检</div>
              <p className="mt-1 leading-5">先补齐模型 API Key、供应商启用状态或任务路由配置，处理后回总闸门确认剩余卡点是否减少。</p>
            </div>
            <Link className="w-fit rounded-md bg-white px-3 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100" href={gateReturn}>
              回总闸门复检
            </Link>
          </div>
        </section>
      ) : null}
      <ModelProviderSettings
        healthDashboard={healthDashboard}
        options={providerOptions}
        presets={providerModelPresets}
        providerSetupGuide={providerSetupGuide}
        providerSetupWizard={providerSetupWizard}
        modelSetupOnboarding={modelSetupOnboarding}
        modelRoleMatrix={modelRoleMatrix}
        modelRoleMatrixPmFocusNotice={modelRoleMatrixPmFocusNotice}
        modelRoleRouteDraft={modelRoleRouteDraft}
        firstDayRouteSummary={firstDayRouteSummary}
        presetRouteBlueprint={presetRouteBlueprint}
        providers={maskedProviders}
        routeEffectAudit={routeEffectAudit}
        routeAvoidanceDecisionHistory={routeAvoidanceDecisionHistory}
        routeAvoidanceGovernance={routeAvoidanceGovernance}
        routeConfirmationHistory={routeConfirmationHistory}
        routeConfirmationOnboarding={routeConfirmationOnboarding}
        routeConfirmationGovernanceStatus={routeConfirmationGovernanceStatus}
        routeConfirmationRecheckAdvice={routeConfirmationRecheckAdvice}
        routeConfirmationRecheckResultSummary={routeConfirmationRecheckResultSummary}
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
