"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  buildRouteConfirmationDispatchFollowUp,
  buildRouteConfirmationRecheckSampleDispatch,
  buildRouteConfirmationRecheckSamplePlan,
} from "@/lib/model-gateway/routeConfirmation";
import { buildFirstDayRouteFocusNotice } from "@/lib/model-gateway/modelSettingsFocus";
import type {
  RouteConfirmationGovernanceStatusSummary,
  RouteConfirmationOnboarding,
  RouteConfirmationRecheckResultSummary,
} from "@/lib/model-gateway/routeConfirmation";
import {
  buildModelRoleRouteBatchSavePlan,
  buildModelRoleRouteRecheckAdviceFromBatchPlan,
  type ModelRoleMatrix,
  type ModelRoleMatrixPmFocusNotice,
  type ModelRoleRouteDraft,
  type ModelRoleRouteDraftItem,
  type ModelWritingRoleStatus,
} from "@/lib/model-gateway/modelRoleMatrix";
import type { ProviderHealthDashboard, ProviderHealthStatus } from "@/lib/model-gateway/providerHealth";
import type { RoutedModelTaskType } from "@/lib/model-gateway/taskRouting";
import type { ModelProviderId } from "@/lib/model-gateway/types";
import { persistGateDispatchTask } from "@/lib/projects/gateActionReceipts";

interface ProviderOptionView {
  providerId: ModelProviderId;
  displayName: string;
  defaultBaseUrl: string;
  defaultModel: string;
  requiresApiKey: boolean;
  note: string;
}

interface ProviderModelPresetView {
  id: string;
  providerId: ModelProviderId;
  label: string;
  model: string;
  maxContextTokens: number;
  taskTags: string[];
  note: string;
}

interface ProviderSetupGuideView {
  summary: {
    total: number;
    ready: number;
    needsKey: number;
    needsTest: number;
    optional: number;
  };
  items: Array<{
    providerId: ModelProviderId;
    displayName: string;
    status: "ready" | "needs_key" | "needs_test" | "optional";
    headline: string;
    actionLabel: string;
    defaultBaseUrl: string;
    defaultModel: string;
    presetCount: number;
    recommendedModels: string[];
    taskTags: string[];
  }>;
  nextActions: string[];
}

interface ProviderSetupWizardView {
  summary: {
    required: number;
    ready: number;
    needsKey: number;
    needsSave: number;
  };
  items: Array<{
    providerId: ModelProviderId;
    displayName: string;
    priority: number;
    status: "ready" | "needs_key" | "needs_save" | "optional";
    statusLabel: string;
    headline: string;
    nextAction: string;
    defaultBaseUrl: string;
    recommendedModel: string;
    recommendedContextTokens: number;
    recommendedPresetLabel: string;
    fitTags: string[];
    why: string;
    canQuickSelect: boolean;
  }>;
  nextActions: string[];
}

interface ModelSetupOnboardingView {
  summary: {
    total: number;
    done: number;
    actionable: number;
    blocked: number;
  };
  currentStep: {
    id: "providers" | "connection" | "routes" | "first_day";
    title: string;
    detail: string;
    status: "done" | "actionable" | "blocked";
    actionLabel: string;
    action: "select_provider" | "test_provider" | "apply_routes" | "open_projects";
  };
  steps: Array<{
    id: "providers" | "connection" | "routes" | "first_day";
    title: string;
    detail: string;
    status: "done" | "actionable" | "blocked";
    actionLabel: string;
    action: "select_provider" | "test_provider" | "apply_routes" | "open_projects";
  }>;
}

interface ProviderView {
  id: string;
  providerId: string;
  displayName: string;
  baseUrl: string | null;
  hasApiKey: boolean;
  defaultModel: string;
  enabled: boolean;
  maxContextTokens: number | null;
}

interface RouteOptionView {
  taskType: string;
  label: string;
  description: string;
}

interface RouteView {
  id: string;
  taskType: string;
  primaryProviderConfigId: string | null;
  fallbackProviderConfigId: string | null;
}

interface RouteEffectAuditView {
  summary: {
    routedTaskTypes: number;
    configuredRoutes: number;
    observedTaskTypes: number;
    fallbackTaskCount: number;
    otherTaskCount: number;
    knownCostUsd: number;
    healthyRoutes: number;
    watchRoutes: number;
    unconfiguredRoutes: number;
    nextUnconfiguredTaskLabel: string | null;
  };
  rows: Array<{
    taskType: string;
    label: string;
    primaryProviderName: string;
    fallbackProviderName: string;
    totalTasks: number;
    primaryTasks: number;
    fallbackTasks: number;
    otherTasks: number;
    succeededTasks: number;
    failedTasks: number;
    successRatePercent: number;
    totalTokens: number;
    knownCostUsd: number;
    lastUsedAt: string | null;
    status: "healthy" | "watch" | "unconfigured";
    recommendation: string;
  }>;
  nextActions: string[];
}

interface RouteRecommendationView {
  taskType: string;
  label: string;
  status: "ready" | "current" | "insufficient";
  recommendedPrimaryProviderConfigId: string | null;
  recommendedFallbackProviderConfigId: string | null;
  currentPrimaryProviderConfigId: string | null;
  currentFallbackProviderConfigId: string | null;
  primaryProviderName: string;
  fallbackProviderName: string | null;
  sampleTasks: number;
  successRatePercent: number;
  averageQualityScore: number;
  averageCostPerSucceededTaskUsd: number;
  avoidance: {
    status: "none" | "applied";
    appliedRules: number;
    reason: string | null;
    evidence: string[];
  };
  explanation: {
    headline: string;
    items: Array<{
      id: "history" | "cost" | "governance_recheck" | "avoidance";
      label: string;
      value: string;
      detail: string;
      tone: "positive" | "warning" | "neutral";
    }>;
  };
  reason: string;
}

interface RouteAvoidanceGovernanceView {
  summary: {
    totalRules: number;
    globalRules: number;
    scopedRules: number;
    highRiskRules: number;
  };
  items: Array<{
    id: string;
    ruleKey: string;
    providerName: string;
    providerId: string | null;
    model: string;
    taskScope: string;
    scopedTaskType: string | null;
    riskLevel: "high" | "medium";
    actionLabel: string;
    reviewAction: string;
    reason: string;
    evidence: string[];
    governanceNote: string | null;
    watchUntil: string | null;
    scopeOptions: Array<{
      taskType: string;
      label: string;
    }>;
  }>;
  retestQueue: {
    summary: {
      total: number;
      due: number;
      upcoming: number;
      waiting: number;
    };
    items: Array<{
      id: string;
      ruleKey: string;
      providerName: string;
      model: string;
      taskScope: string;
      taskType: string | null;
      reason: string;
      evidence: string[];
      status: "due" | "upcoming" | "waiting";
      dueAt: string | null;
      daysUntilDue: number | null;
      recommendedSampleSize: number;
      actionLabel: string;
      recommendation: string;
    }>;
  };
  retestReview: {
    summary: {
      total: number;
      dismissRecommended: number;
      extendWatchRecommended: number;
      manualReviewRecommended: number;
    };
    items: Array<{
      id: string;
      ruleKey: string;
      providerName: string;
      model: string;
      taskScope: string;
      successRatePercent: number | null;
      qualityScore: number | null;
      recommendedAction: "dismiss" | "extend_watch" | "manual_review";
      confidence: "high" | "medium";
      actionLabel: string;
      rationale: string;
      completionEvidence: string;
      evidence: string[];
      completedAt: string | null;
    }>;
  };
  nextActions: string[];
}

interface RouteAvoidanceDecisionHistoryView {
  summary: {
    total: number;
    dismissed: number;
    scoped: number;
    extendedWatch: number;
  };
  items: Array<{
    id: string;
    ruleKey: string;
    providerName: string;
    model: string;
    taskScope: string;
    action: "dismiss" | "scope_task" | "extend_watch";
    actionLabel: string;
    note: string | null;
    expiresAt: string | null;
    updatedAt: string | null;
    latestRetest: {
      successRatePercent: number | null;
      qualityScore: number | null;
      recommendedAction: "dismiss" | "extend_watch" | "manual_review";
      actionLabel: string;
      completionEvidence: string;
      completedAt: string | null;
    } | null;
  }>;
}

interface RouteConfirmationHistoryView {
  id: string;
  taskType: string;
  label: string;
  detail: string;
  message: string;
  status: string;
  createdAt: string;
  recheckStatus: "waiting_recheck" | "recheck_passed" | "recheck_needs_governance";
  recheckLabel: string;
  recheckDetail: string;
}

interface RouteConfirmationRecheckAdviceView {
  summary: {
    total: number;
    switchRoute: number;
    extendWatch: number;
    manualReview: number;
  };
  items: Array<{
    id: string;
    taskType: RoutedModelTaskType;
    label: string;
    severity: "warning" | "blocked";
    action: "switch_route" | "extend_watch" | "manual_review";
    actionLabel: string;
    recommendation: string;
    sampleCount: number | null;
    successRatePercent: number | null;
    qualityScore: number | null;
    cost: string | null;
    fallbackHit: boolean | null;
    needsGovernance: boolean | null;
    evidence: string[];
    completedAt: string | null;
  }>;
}

interface PresetRouteBlueprintView {
  summary: {
    total: number;
    ready: number;
    current: number;
    missing: number;
  };
  nextActions: string[];
  items: Array<{
    taskType: string;
    label: string;
    status: "ready" | "current" | "missing";
    recommendedPrimaryProviderConfigId: string | null;
    recommendedFallbackProviderConfigId: string | null;
    primaryProviderName: string;
    fallbackProviderName: string | null;
    matchedTags: string[];
    reason: string;
    routingRole: string;
    fallbackPlan: string;
    costEstimate: {
      tier: "low" | "medium" | "high" | "unknown";
      label: string;
      detail: string;
    };
    manualConfirmation: string;
    reasonItems: string[];
  }>;
}

const roleRouteDraftStatusCopy: Record<ModelRoleRouteDraftItem["status"], { label: string; className: string }> = {
  ready: { label: "可填入", className: "bg-sky-50 text-sky-700" },
  current: { label: "已匹配", className: "bg-emerald-50 text-emerald-700" },
  missing: { label: "缺岗位", className: "bg-rose-50 text-rose-700" },
};

interface FirstDayRouteSummaryView {
  summary: {
    total: number;
    configured: number;
    needsRoute: number;
    mockFallback: number;
    applicableRecommendations: number;
  };
  nextActions: string[];
  items: Array<{
    taskType: string;
    label: string;
    stage: string;
    primaryProviderName: string;
    fallbackProviderName: string;
    status: "configured" | "needs_route" | "mock_fallback";
    recommendation: string;
    recommendedPrimaryProviderConfigId: string | null;
    recommendedFallbackProviderConfigId: string | null;
    recommendedRouteLabel: string | null;
    canApplyRecommendation: boolean;
  }>;
}

interface RouteDraft {
  primaryProviderConfigId: string;
  fallbackProviderConfigId: string;
}

interface DraftProvider {
  id?: string;
  providerId: ModelProviderId;
  displayName: string;
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
  enabled: boolean;
  maxContextTokens: string;
}

interface ConnectionTestResult {
  ok: boolean;
  status: "connected" | "failed";
  latencyMs: number;
  testedAt: string;
  sampleText: string | null;
  usage: {
    inputTokens: number;
    outputTokens: number;
  } | null;
  errorMessage: string | null;
  repairHint: string | null;
}

interface RouteNotice {
  message: string;
  href?: string;
  actionLabel?: string;
}

interface ProviderSetupNotice {
  message: string;
  actionLabel?: string;
  action?: "apply_first_day_routes" | "return_project";
  href?: string;
}

const statusCopy: Record<ProviderHealthStatus, { label: string; className: string }> = {
  ready: { label: "可用", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  warn: { label: "需注意", className: "border-amber-200 bg-amber-50 text-amber-700" },
  blocked: { label: "阻塞", className: "border-rose-200 bg-rose-50 text-rose-700" },
  disabled: { label: "未启用", className: "border-slate-200 bg-slate-50 text-slate-500" },
};

const routeRecheckStatusCopy: Record<RouteConfirmationHistoryView["recheckStatus"], { className: string }> = {
  waiting_recheck: { className: "border-sky-200 bg-sky-50 text-sky-700" },
  recheck_passed: { className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  recheck_needs_governance: { className: "border-amber-200 bg-amber-50 text-amber-700" },
};

const routeOnboardingStatusCopy: Record<RouteConfirmationOnboarding["items"][number]["status"], { label: string; className: string }> = {
  confirmed: { label: "已确认", className: "bg-emerald-50 text-emerald-700" },
  ready_to_confirm: { label: "待确认", className: "bg-sky-50 text-sky-700" },
  missing_route: { label: "缺路线", className: "bg-amber-50 text-amber-700" },
};

const routeRecheckResultStatusCopy: Record<RouteConfirmationRecheckResultSummary["items"][number]["status"], { className: string }> = {
  confirmed: { className: "bg-emerald-50 text-emerald-700" },
  needs_governance: { className: "bg-amber-50 text-amber-700" },
  manual_review: { className: "bg-rose-50 text-rose-700" },
};

const routeGovernanceStatusCopy: Record<RouteConfirmationGovernanceStatusSummary["items"][number]["status"], { className: string }> = {
  not_created: { className: "bg-slate-50 text-slate-600" },
  assigned: { className: "bg-sky-50 text-sky-700" },
  completed: { className: "bg-emerald-50 text-emerald-700" },
};

const routeRecommendationExplanationToneCopy: Record<RouteRecommendationView["explanation"]["items"][number]["tone"], string> = {
  positive: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  neutral: "border-slate-200 bg-white text-slate-700",
};

const routeCostTierCopy: Record<PresetRouteBlueprintView["items"][number]["costEstimate"]["tier"], string> = {
  low: "bg-emerald-50 text-emerald-700",
  medium: "bg-sky-50 text-sky-700",
  high: "bg-amber-50 text-amber-700",
  unknown: "bg-slate-100 text-slate-600",
};

const firstDayRouteStatusCopy: Record<FirstDayRouteSummaryView["items"][number]["status"], { label: string; className: string }> = {
  configured: { label: "已配置", className: "bg-emerald-50 text-emerald-700" },
  needs_route: { label: "缺路线", className: "bg-amber-50 text-amber-700" },
  mock_fallback: { label: "Mock 兜底", className: "bg-sky-50 text-sky-700" },
};

const providerSetupStatusCopy: Record<ProviderSetupGuideView["items"][number]["status"], { label: string; className: string }> = {
  ready: { label: "可用", className: "bg-emerald-50 text-emerald-700" },
  needs_key: { label: "缺 Key", className: "bg-amber-50 text-amber-700" },
  needs_test: { label: "待测试", className: "bg-sky-50 text-sky-700" },
  optional: { label: "演示", className: "bg-slate-100 text-slate-600" },
};

const providerSetupWizardStatusCopy: Record<ProviderSetupWizardView["items"][number]["status"], string> = {
  ready: "bg-emerald-50 text-emerald-700",
  needs_key: "bg-amber-50 text-amber-700",
  needs_save: "bg-sky-50 text-sky-700",
  optional: "bg-slate-100 text-slate-600",
};

const modelSetupStepStatusCopy: Record<ModelSetupOnboardingView["steps"][number]["status"], { label: string; className: string }> = {
  done: { label: "完成", className: "bg-emerald-50 text-emerald-700" },
  actionable: { label: "当前", className: "bg-slate-950 text-white" },
  blocked: { label: "等待", className: "bg-slate-100 text-slate-600" },
};

const modelRoleStatusCopy: Record<ModelWritingRoleStatus, { label: string; className: string }> = {
  ready: { label: "已就位", className: "bg-emerald-50 text-emerald-700" },
  partial: { label: "可顶岗", className: "bg-amber-50 text-amber-700" },
  missing: { label: "缺岗位", className: "bg-rose-50 text-rose-700" },
};

const modelRolePmFocusToneCopy: Record<ModelRoleMatrixPmFocusNotice["tone"], { className: string; badgeClassName: string; label: string }> = {
  blocked: {
    className: "border-rose-200 bg-rose-50 text-rose-950",
    badgeClassName: "bg-white text-rose-700",
    label: "阻塞",
  },
  watch: {
    className: "border-amber-200 bg-amber-50 text-amber-950",
    badgeClassName: "bg-white text-amber-700",
    label: "观察",
  },
  ready: {
    className: "border-emerald-200 bg-emerald-50 text-emerald-950",
    badgeClassName: "bg-white text-emerald-700",
    label: "可推进",
  },
};

function draftFromOption(option: ProviderOptionView, existing?: ProviderView): DraftProvider {
  return {
    id: existing?.id,
    providerId: option.providerId,
    displayName: existing?.displayName ?? option.displayName,
    baseUrl: existing?.baseUrl ?? option.defaultBaseUrl,
    apiKey: "",
    defaultModel: existing?.defaultModel ?? option.defaultModel,
    enabled: existing?.enabled ?? option.providerId === "mock",
    maxContextTokens: existing?.maxContextTokens ? String(existing.maxContextTokens) : "",
  };
}

function hrefWithGateReturn(href: string, gateReturnHref?: string | null) {
  if (!gateReturnHref || !href.startsWith("/") || href.startsWith("/gate")) return href;

  const hashIndex = href.indexOf("#");
  const base = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";
  if (base.includes("gateReturn=")) return href;
  const separator = base.includes("?") ? "&" : "?";

  return `${base}${separator}gateReturn=${encodeURIComponent(gateReturnHref)}${hash}`;
}

export function ModelProviderSettings({
  gateReturnHref,
  healthDashboard,
  options,
  presets,
  providerSetupGuide,
  providerSetupWizard,
  modelSetupOnboarding,
  modelRoleMatrix,
  modelRoleMatrixPmFocusNotice,
  modelRoleRouteDraft,
  firstDayRouteSummary,
  presetRouteBlueprint,
  providers,
  routeEffectAudit,
  routeAvoidanceDecisionHistory,
  routeAvoidanceGovernance,
  routeConfirmationHistory,
  routeConfirmationGovernanceStatus,
  routeConfirmationOnboarding,
  routeConfirmationRecheckAdvice,
  routeConfirmationRecheckResultSummary,
  routeRecommendations,
  routeOptions,
  routes,
}: {
  gateReturnHref?: string | null;
  healthDashboard: ProviderHealthDashboard;
  options: ProviderOptionView[];
  presets: ProviderModelPresetView[];
  providerSetupGuide: ProviderSetupGuideView;
  providerSetupWizard: ProviderSetupWizardView;
  modelSetupOnboarding: ModelSetupOnboardingView;
  modelRoleMatrix: ModelRoleMatrix;
  modelRoleMatrixPmFocusNotice: ModelRoleMatrixPmFocusNotice;
  modelRoleRouteDraft: ModelRoleRouteDraft;
  firstDayRouteSummary: FirstDayRouteSummaryView;
  presetRouteBlueprint: PresetRouteBlueprintView;
  providers: ProviderView[];
  routeEffectAudit: RouteEffectAuditView;
  routeAvoidanceDecisionHistory: RouteAvoidanceDecisionHistoryView;
  routeAvoidanceGovernance: RouteAvoidanceGovernanceView;
  routeConfirmationHistory: RouteConfirmationHistoryView[];
  routeConfirmationGovernanceStatus: RouteConfirmationGovernanceStatusSummary;
  routeConfirmationOnboarding: RouteConfirmationOnboarding;
  routeConfirmationRecheckAdvice: RouteConfirmationRecheckAdviceView;
  routeConfirmationRecheckResultSummary: RouteConfirmationRecheckResultSummary;
  routeRecommendations: RouteRecommendationView[];
  routeOptions: RouteOptionView[];
  routes: RouteView[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusParam = searchParams.get("focus");
  const firstDayFocusTaskType = searchParams.get("taskType");
  const firstDayReturnProjectId = searchParams.get("projectId");
  const isFirstDayRouteFocus = focusParam === "first-day-route";
  const invalidFocusNotice = focusParam === null || focusParam === "first-day-route"
    ? null
    : focusParam ? `模型设置焦点「${focusParam}」不存在，已显示全部模型设置。` : null;
  const firstDayReturnHref = firstDayReturnProjectId
    ? `/projects/${encodeURIComponent(firstDayReturnProjectId)}?firstDayRoute=repaired#first-day-workflow`
    : "/projects";
  const existingByProvider = useMemo(
    () => new Map(providers.map((provider) => [provider.providerId, provider])),
    [providers],
  );
  const [selectedProviderId, setSelectedProviderId] = useState<ModelProviderId>(options[0]?.providerId ?? "mock");
  const selectedOption = options.find((option) => option.providerId === selectedProviderId) ?? options[0];
  const selectedPresets = presets.filter((preset) => preset.providerId === selectedProviderId);
  const selectedSetupGuideItem = providerSetupGuide.items.find((item) => item.providerId === selectedProviderId);
  const existing = existingByProvider.get(selectedProviderId);
  const [draft, setDraft] = useState<DraftProvider>(() => draftFromOption(selectedOption, existing));
  const [message, setMessage] = useState<string | null>(null);
  const [providerSetupNotice, setProviderSetupNotice] = useState<ProviderSetupNotice | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [testingProviderId, setTestingProviderId] = useState<ModelProviderId | null>(null);
  const [testResults, setTestResults] = useState<Record<string, ConnectionTestResult>>({});
  const [routeDrafts, setRouteDrafts] = useState<Record<string, RouteDraft>>(() => Object.fromEntries(
    routeOptions.map((option) => {
      const route = routes.find((item) => item.taskType === option.taskType);
      return [option.taskType, {
        primaryProviderConfigId: route?.primaryProviderConfigId ?? "",
        fallbackProviderConfigId: route?.fallbackProviderConfigId ?? "",
      }];
    }),
  ));
  const [savingRouteType, setSavingRouteType] = useState<string | null>(null);
  const [applyingRecommendationType, setApplyingRecommendationType] = useState<string | null>(null);
  const [savingRoleRouteBatch, setSavingRoleRouteBatch] = useState(false);
  const [applyingFirstDayRouteType, setApplyingFirstDayRouteType] = useState<string | "all" | null>(null);
  const [governingRuleKey, setGoverningRuleKey] = useState<string | null>(null);
  const [creatingRetestRuleKey, setCreatingRetestRuleKey] = useState<string | null>(null);
  const [runningRetestRuleKey, setRunningRetestRuleKey] = useState<string | null>(null);
  const [executingRouteAdviceId, setExecutingRouteAdviceId] = useState<string | null>(null);
  const [creatingRouteRecheckPlanId, setCreatingRouteRecheckPlanId] = useState<string | null>(null);
  const [runningRouteRecheckPlanId, setRunningRouteRecheckPlanId] = useState<string | null>(null);
  const [scopeDrafts, setScopeDrafts] = useState<Record<string, string>>(() => Object.fromEntries(
    routeAvoidanceGovernance.items.map((item) => [
      item.ruleKey,
      item.scopedTaskType ?? item.scopeOptions[0]?.taskType ?? "chapter_review",
    ]),
  ));
  const [routeNotice, setRouteNotice] = useState<RouteNotice | null>(null);
  const currentTestResult = testResults[selectedProviderId];
  const roleRouteBatchSavePlan = useMemo(
    () => buildModelRoleRouteBatchSavePlan(modelRoleRouteDraft),
    [modelRoleRouteDraft],
  );
  const modelRolePmFocusTone = modelRolePmFocusToneCopy[modelRoleMatrixPmFocusNotice.tone];
  const latestRetestReviewByRuleKey = useMemo(() => {
    const reviewsByRuleKey = new Map<string, RouteAvoidanceGovernanceView["retestReview"]["items"][number]>();
    [...routeAvoidanceGovernance.retestReview.items]
      .sort((left, right) => (right.completedAt ?? "").localeCompare(left.completedAt ?? ""))
      .forEach((review) => {
        if (!reviewsByRuleKey.has(review.ruleKey)) {
          reviewsByRuleKey.set(review.ruleKey, review);
        }
      });
    return reviewsByRuleKey;
  }, [routeAvoidanceGovernance.retestReview.items]);

  function providerNameForRoute(providerConfigId: string | null | undefined) {
    if (!providerConfigId) return null;
    const provider = providers.find((item) => item.id === providerConfigId);
    return provider ? `${provider.displayName} · ${provider.defaultModel}` : null;
  }

  function routeConfirmationSamplePlanForAdvice(item: RouteConfirmationRecheckAdviceView["items"][number]) {
    const routeDraft = routeDrafts[item.taskType] ?? routes.find((route) => route.taskType === item.taskType);
    return buildRouteConfirmationRecheckSamplePlan(item, {
      primaryProviderName: providerNameForRoute(routeDraft?.primaryProviderConfigId),
      fallbackProviderName: providerNameForRoute(routeDraft?.fallbackProviderConfigId),
    });
  }

  function selectProvider(providerId: ModelProviderId) {
    const option = options.find((item) => item.providerId === providerId) ?? options[0];
    setSelectedProviderId(providerId);
    setDraft(draftFromOption(option, existingByProvider.get(providerId)));
    setMessage(null);
  }

  function selectProviderBySetupStatus(statuses: ProviderSetupGuideView["items"][number]["status"][]) {
    const item = providerSetupGuide.items.find((candidate) => statuses.includes(candidate.status));
    selectProvider(item?.providerId ?? selectedProviderId);
  }

  function selectProviderFromWizard(item: ProviderSetupWizardView["items"][number]) {
    selectProvider(item.providerId);
    setDraft((current) => ({
      ...current,
      baseUrl: item.defaultBaseUrl,
      defaultModel: item.recommendedModel,
      maxContextTokens: String(item.recommendedContextTokens || ""),
      enabled: true,
    }));
    setMessage(`已选中 ${item.displayName}，按向导补 Key 后保存并测试。`);
  }

  function handleModelSetupAction(action: ModelSetupOnboardingView["steps"][number]["action"]) {
    if (action === "select_provider") {
      selectProviderBySetupStatus(["needs_key", "needs_test"]);
      return;
    }
    if (action === "test_provider") {
      selectProviderBySetupStatus(["needs_test", "needs_key"]);
      return;
    }
    if (action === "apply_routes") {
      void applyFirstDayRecommendedRoutes();
    }
  }

  function applyPreset(preset: ProviderModelPresetView) {
    setDraft((current) => ({
      ...current,
      defaultModel: preset.model,
      maxContextTokens: String(preset.maxContextTokens),
    }));
    setMessage(`已套用「${preset.label}」`);
  }

  async function runProviderConnectionTest(input: {
    id?: string;
    providerId: ModelProviderId;
    baseUrl: string;
    apiKey: string;
    defaultModel: string;
    clearMessage?: boolean;
  }) {
    setTestingProviderId(input.providerId);
    if (input.clearMessage) setMessage(null);

    try {
      const response = await fetch("/api/model-providers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: input.id,
          providerId: input.providerId,
          baseUrl: input.baseUrl.trim(),
          apiKey: input.apiKey.trim() || undefined,
          defaultModel: input.defaultModel.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("模型连接测试失败。");
      }

      const payload = (await response.json()) as { result: ConnectionTestResult };
      setTestResults((current) => ({ ...current, [input.providerId]: payload.result }));
      return payload.result;
    } catch (caught) {
      const result: ConnectionTestResult = {
        ok: false,
        status: "failed",
        latencyMs: 0,
        testedAt: new Date().toISOString(),
        sampleText: null,
        usage: null,
        errorMessage: caught instanceof Error ? caught.message : "模型连接测试失败。",
        repairHint: "检查模型名、Base URL 和 API Key 后重新测试。",
      };
      setTestResults((current) => ({ ...current, [input.providerId]: result }));
      return result;
    } finally {
      setTestingProviderId(null);
    }
  }

  async function saveProvider(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const draftSnapshot = { ...draft };
    setIsSaving(true);
    setMessage(null);
    setProviderSetupNotice(null);

    try {
      const response = await fetch("/api/model-providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          baseUrl: draft.baseUrl.trim(),
          apiKey: draft.apiKey.trim() || undefined,
          defaultModel: draft.defaultModel.trim(),
          maxContextTokens: draft.maxContextTokens ? Number(draft.maxContextTokens) : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("保存模型配置失败。");
      }

      const payload = (await response.json()) as { provider: ProviderView };
      const testResult = await runProviderConnectionTest({
        id: payload.provider.id,
        providerId: draftSnapshot.providerId,
        baseUrl: draftSnapshot.baseUrl,
        apiKey: draftSnapshot.apiKey,
        defaultModel: draftSnapshot.defaultModel,
      });

      setDraft((current) => ({ ...current, id: payload.provider.id, apiKey: "" }));
      if (testResult.ok) {
        setMessage("已保存并测试通过");
        setProviderSetupNotice({
          message: firstDayRouteSummary.summary.applicableRecommendations > 0
            ? `连接已通过，还有 ${firstDayRouteSummary.summary.applicableRecommendations} 条首日推荐路线可应用。`
            : "连接已通过；下一步检查并应用首日路线。",
          actionLabel: "应用首日路线",
          action: "apply_first_day_routes",
        });
      } else {
        setMessage("已保存，但连接测试失败");
        setProviderSetupNotice({ message: "先按下方错误建议修好连接，再应用首日路线。" });
      }
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "保存模型配置失败。");
    } finally {
      setIsSaving(false);
    }
  }

  async function testProviderConnection() {
    setProviderSetupNotice(null);
    const result = await runProviderConnectionTest({ ...draft, clearMessage: true });
    if (result.ok) {
      setProviderSetupNotice({
        message: firstDayRouteSummary.summary.applicableRecommendations > 0
          ? `连接测试通过，还有 ${firstDayRouteSummary.summary.applicableRecommendations} 条首日推荐路线可应用。`
          : "连接测试通过；下一步检查并应用首日路线。",
        actionLabel: "应用首日路线",
        action: "apply_first_day_routes",
      });
    }
  }

  async function saveRoute(taskType: string) {
    const draftRoute = routeDrafts[taskType] ?? { primaryProviderConfigId: "", fallbackProviderConfigId: "" };
    setSavingRouteType(taskType);
    setRouteNotice(null);
    try {
      const response = await fetch("/api/model-task-routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType,
          primaryProviderConfigId: draftRoute.primaryProviderConfigId || null,
          fallbackProviderConfigId: draftRoute.fallbackProviderConfigId || null,
          confirmation: {
            source: "manual",
            reason: "人工保存模型路由。",
            primaryProviderName: providerNameForRoute(draftRoute.primaryProviderConfigId),
            fallbackProviderName: providerNameForRoute(draftRoute.fallbackProviderConfigId),
          },
        }),
      });
      if (!response.ok) throw new Error("保存模型路由失败。");
      setRouteNotice(buildRouteConfirmationDispatchFollowUp(taskType as RoutedModelTaskType));
      router.refresh();
    } catch (caught) {
      setRouteNotice({ message: caught instanceof Error ? caught.message : "保存模型路由失败。" });
    } finally {
      setSavingRouteType(null);
    }
  }

  async function applyRecommendation(recommendation: RouteRecommendationView) {
    if (!recommendation.recommendedPrimaryProviderConfigId) return;
    setApplyingRecommendationType(recommendation.taskType);
    setRouteNotice(null);
    try {
      const response = await fetch("/api/model-task-routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType: recommendation.taskType,
          primaryProviderConfigId: recommendation.recommendedPrimaryProviderConfigId,
          fallbackProviderConfigId: recommendation.recommendedFallbackProviderConfigId,
          confirmation: {
            source: "recommendation",
            reason: recommendation.reason,
            primaryProviderName: recommendation.primaryProviderName,
            fallbackProviderName: recommendation.fallbackProviderName,
            routeStatus: recommendation.status,
            avoidanceStatus: recommendation.avoidance.status,
            restoredCandidate: recommendation.reason.includes("复测通过"),
            recommendationExplanation: recommendation.explanation,
          },
        }),
      });
      if (!response.ok) throw new Error("应用路由建议失败。");
      setRouteDrafts((current) => ({
        ...current,
        [recommendation.taskType]: {
          primaryProviderConfigId: recommendation.recommendedPrimaryProviderConfigId ?? "",
          fallbackProviderConfigId: recommendation.recommendedFallbackProviderConfigId ?? "",
        },
      }));
      setRouteNotice(buildRouteConfirmationDispatchFollowUp(recommendation.taskType as RoutedModelTaskType));
      router.refresh();
    } catch (caught) {
      setRouteNotice({ message: caught instanceof Error ? caught.message : "应用路由建议失败。" });
    } finally {
      setApplyingRecommendationType(null);
    }
  }

  const focusedFirstDayRoute = isFirstDayRouteFocus
    ? firstDayRouteSummary.items.find((item) => item.taskType === firstDayFocusTaskType) ?? null
    : null;
  const firstDayRouteFocusNotice = buildFirstDayRouteFocusNotice({
    isFocused: isFirstDayRouteFocus,
    projectId: firstDayReturnProjectId,
    focusedItem: focusedFirstDayRoute,
  });

  useEffect(() => {
    if (!isFirstDayRouteFocus) return;
    const target = document.getElementById("first-day-routes");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [isFirstDayRouteFocus]);

  async function applyFirstDayRecommendedRoutes(taskType?: string) {
    const applicableItems = firstDayRouteSummary.items.filter((item) => (
      item.canApplyRecommendation && item.recommendedPrimaryProviderConfigId
      && (!taskType || item.taskType === taskType)
    ));
    if (!applicableItems.length) {
      setRouteNotice({ message: "当前没有可直接应用的首日推荐路线；先确认至少两个真实模型已保存并测试通过。" });
      document.getElementById("first-day-routes")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    setApplyingFirstDayRouteType(taskType ?? "all");
    setRouteNotice(null);
    try {
      for (const item of applicableItems) {
        const response = await fetch("/api/model-task-routes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskType: item.taskType,
            primaryProviderConfigId: item.recommendedPrimaryProviderConfigId,
            fallbackProviderConfigId: item.recommendedFallbackProviderConfigId,
            confirmation: {
              source: "preset",
              reason: `首日工作流推荐路线：${item.stage}。`,
              primaryProviderName: providerNameForRoute(item.recommendedPrimaryProviderConfigId),
              fallbackProviderName: providerNameForRoute(item.recommendedFallbackProviderConfigId),
              routeStatus: "ready",
            },
          }),
        });
        if (!response.ok) throw new Error(`应用「${item.stage}」推荐路线失败。`);
      }

      setRouteDrafts((current) => {
        const next = { ...current };
        applicableItems.forEach((item) => {
          next[item.taskType] = {
            primaryProviderConfigId: item.recommendedPrimaryProviderConfigId ?? "",
            fallbackProviderConfigId: item.recommendedFallbackProviderConfigId ?? "",
          };
        });
        return next;
      });
      setRouteNotice({ message: taskType ? `已修复「${applicableItems[0]?.stage}」模型路线` : `已应用 ${applicableItems.length} 条首日推荐路线` });
      if (firstDayReturnProjectId) {
        setProviderSetupNotice({
          message: "首日路线已应用，可以回到作品继续执行首日工作流。",
          actionLabel: "回到作品",
          action: "return_project",
          href: firstDayReturnHref,
        });
        setRouteNotice({
          message: taskType ? `已修复「${applicableItems[0]?.stage}」模型路线，可以回到作品继续首日工作流。` : `已应用 ${applicableItems.length} 条首日推荐路线，可以回到作品继续首日工作流。`,
          href: firstDayReturnHref,
          actionLabel: "回到作品",
        });
      }
      router.refresh();
    } catch (caught) {
      setRouteNotice({ message: caught instanceof Error ? caught.message : "应用首日推荐路线失败。" });
    } finally {
      setApplyingFirstDayRouteType(null);
    }
  }

  async function createRetestDispatch(item: RouteAvoidanceGovernanceView["retestQueue"]["items"][number]) {
    setCreatingRetestRuleKey(item.ruleKey);
    setRouteNotice(null);
    try {
      const response = await fetch("/api/model-route-avoidance-retests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleKey: item.ruleKey }),
      });
      if (!response.ok) throw new Error("生成复测派单失败。");
      setRouteNotice({ message: `已生成「${item.providerName}」复测派单` });
      router.refresh();
    } catch (caught) {
      setRouteNotice({ message: caught instanceof Error ? caught.message : "生成复测派单失败。" });
    } finally {
      setCreatingRetestRuleKey(null);
    }
  }

  async function runRetestSamples(item: RouteAvoidanceGovernanceView["retestQueue"]["items"][number]) {
    setRunningRetestRuleKey(item.ruleKey);
    setRouteNotice(null);
    try {
      const response = await fetch("/api/model-route-avoidance-retest-samples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleKey: item.ruleKey, execute: true }),
      });
      const payload = await response.json().catch(() => null) as { results?: Array<{ status: string }>; error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "运行复测样本失败。");
      const succeeded = payload?.results?.filter((result) => result.status === "succeeded").length ?? 0;
      const total = payload?.results?.length ?? 0;
      setRouteNotice({ message: `已运行复测样本：${succeeded}/${total} 成功` });
      router.refresh();
    } catch (caught) {
      setRouteNotice({ message: caught instanceof Error ? caught.message : "运行复测样本失败。" });
    } finally {
      setRunningRetestRuleKey(null);
    }
  }

  async function applyRetestDecision(item: RouteAvoidanceGovernanceView["retestReview"]["items"][number]) {
    if (item.recommendedAction === "manual_review") return;
    const governanceItem = routeAvoidanceGovernance.items.find((candidate) => candidate.ruleKey === item.ruleKey);
    if (!governanceItem) {
      setRouteNotice({ message: "没有找到对应避坑规则，无法应用复测建议。" });
      return;
    }
    await saveAvoidanceOverride(governanceItem, item.recommendedAction);
  }

  async function executeRouteRecheckAdvice(item: RouteConfirmationRecheckAdviceView["items"][number]) {
    setExecutingRouteAdviceId(item.id);
    setRouteNotice(null);
    try {
      const response = await fetch("/api/model-route-confirmation-governance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ advice: item }),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "生成模型路由治理派单失败。");
      setRouteNotice({ message: `已生成「${item.label}」模型路由治理派单`, href: "/dispatch", actionLabel: "去派单中心查看治理任务" });
      router.refresh();
    } catch (caught) {
      setRouteNotice({ message: caught instanceof Error ? caught.message : "生成模型路由治理派单失败。" });
    } finally {
      setExecutingRouteAdviceId(null);
    }
  }

  async function createRouteRecheckSampleDispatch(item: RouteConfirmationRecheckAdviceView["items"][number]) {
    setCreatingRouteRecheckPlanId(item.id);
    setRouteNotice(null);
    try {
      const samplePlan = routeConfirmationSamplePlanForAdvice(item);
      const dispatch = buildRouteConfirmationRecheckSampleDispatch(item, samplePlan);
      await persistGateDispatchTask(dispatch);
      setRouteNotice({ message: `已生成「${item.label}」复检样本派单`, href: "/dispatch", actionLabel: "去派单中心查看复检任务" });
      router.refresh();
    } catch (caught) {
      setRouteNotice({ message: caught instanceof Error ? caught.message : "生成复检样本派单失败。" });
    } finally {
      setCreatingRouteRecheckPlanId(null);
    }
  }

  async function runRouteConfirmationRecheckSamples(item: RouteConfirmationRecheckAdviceView["items"][number]) {
    setRunningRouteRecheckPlanId(item.id);
    setRouteNotice(null);
    try {
      const response = await fetch("/api/model-route-confirmation-recheck-samples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ advice: item, execute: true }),
      });
      const payload = await response.json().catch(() => null) as { results?: Array<{ status: string }>; error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "运行模型路由复检样本失败。");
      const succeeded = payload?.results?.filter((result) => result.status === "succeeded").length ?? 0;
      const total = payload?.results?.length ?? 0;
      setRouteNotice({ message: `已运行「${item.label}」复检样本：${succeeded}/${total} 成功` });
      router.refresh();
    } catch (caught) {
      setRouteNotice({ message: caught instanceof Error ? caught.message : "运行模型路由复检样本失败。" });
    } finally {
      setRunningRouteRecheckPlanId(null);
    }
  }

  async function saveAvoidanceOverride(
    item: RouteAvoidanceGovernanceView["items"][number],
    action: "dismiss" | "scope_task" | "extend_watch",
  ) {
    setGoverningRuleKey(`${item.ruleKey}:${action}`);
    setRouteNotice(null);
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const selectedTaskType = scopeDrafts[item.ruleKey] ?? item.scopedTaskType ?? item.scopeOptions[0]?.taskType ?? "chapter_review";
    const selectedTaskLabel = item.scopeOptions.find((option) => option.taskType === selectedTaskType)?.label ?? "所选任务";

    try {
      const response = await fetch("/api/model-route-avoidance-overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ruleKey: item.ruleKey,
          action,
          taskType: action === "scope_task" ? selectedTaskType : null,
          note: action === "dismiss"
            ? "人工复测通过，解除观察。"
            : action === "scope_task"
              ? `先限定在${selectedTaskLabel}任务继续观察。`
              : "延长观察 14 天，再跑两批后复核。",
          expiresAt: action === "extend_watch" ? expiresAt : null,
        }),
      });
      if (!response.ok) throw new Error("保存避坑规则治理动作失败。");
      setRouteNotice({ message: "避坑规则治理动作已保存" });
      router.refresh();
    } catch (caught) {
      setRouteNotice({ message: caught instanceof Error ? caught.message : "保存避坑规则治理动作失败。" });
    } finally {
      setGoverningRuleKey(null);
    }
  }

  async function applyPresetRoute(item: PresetRouteBlueprintView["items"][number]) {
    if (!item.recommendedPrimaryProviderConfigId) return;
    setApplyingRecommendationType(item.taskType);
    setRouteNotice(null);
    try {
      const response = await fetch("/api/model-task-routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType: item.taskType,
          primaryProviderConfigId: item.recommendedPrimaryProviderConfigId,
          fallbackProviderConfigId: item.recommendedFallbackProviderConfigId,
          confirmation: {
            source: "preset",
            reason: item.reason,
            primaryProviderName: item.primaryProviderName,
            fallbackProviderName: item.fallbackProviderName,
            routeStatus: item.status === "ready" ? "ready" : item.status === "current" ? "current" : "insufficient",
          },
        }),
      });
      if (!response.ok) throw new Error("应用冷启动路由失败。");
      setRouteDrafts((current) => ({
        ...current,
        [item.taskType]: {
          primaryProviderConfigId: item.recommendedPrimaryProviderConfigId ?? "",
          fallbackProviderConfigId: item.recommendedFallbackProviderConfigId ?? "",
        },
      }));
      setRouteNotice(buildRouteConfirmationDispatchFollowUp(item.taskType as RoutedModelTaskType));
      router.refresh();
    } catch (caught) {
      setRouteNotice({ message: caught instanceof Error ? caught.message : "应用冷启动路由失败。" });
    } finally {
      setApplyingRecommendationType(null);
    }
  }

  function fillRoleRouteDraft(item: ModelRoleRouteDraftItem) {
    if (!item.primaryProviderConfigId) {
      setRouteNotice({ message: `${item.label}还缺首选模型岗位，先补模型配置。` });
      return;
    }

    setRouteDrafts((current) => ({
      ...current,
      [item.taskType]: {
        primaryProviderConfigId: item.primaryProviderConfigId ?? "",
        fallbackProviderConfigId: item.fallbackProviderConfigId ?? "",
      },
    }));
    setRouteNotice({ message: `已把「${item.label}」职责草案填入手动路由表，确认后点击保存路由。` });
    document.getElementById("manual-model-routes")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function saveRoleRouteBatch() {
    const plan = roleRouteBatchSavePlan;
    if (!plan.items.length) {
      setRouteNotice({ message: "当前没有可批量保存的职责路线；已匹配或缺岗位的路线会被跳过。" });
      document.getElementById("model-role-matrix")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    setSavingRoleRouteBatch(true);
    setRouteNotice(null);
    try {
      for (const item of plan.items) {
        const response = await fetch("/api/model-task-routes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskType: item.taskType,
            primaryProviderConfigId: item.primaryProviderConfigId,
            fallbackProviderConfigId: item.fallbackProviderConfigId,
            confirmation: item.confirmation,
          }),
        });
        if (!response.ok) throw new Error(`保存「${item.label}」职责路线失败。`);
      }
      const recheckAdvice = buildModelRoleRouteRecheckAdviceFromBatchPlan(plan);
      let dispatchedRechecks = 0;
      for (const advice of recheckAdvice) {
        const response = await fetch("/api/model-route-confirmation-recheck-dispatch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ advice }),
        });
        if (response.ok) dispatchedRechecks += 1;
      }
      setRouteDrafts((current) => ({
        ...current,
        ...Object.fromEntries(plan.items.map((item) => [
          item.taskType,
          {
            primaryProviderConfigId: item.primaryProviderConfigId,
            fallbackProviderConfigId: item.fallbackProviderConfigId ?? "",
          },
        ])),
      }));
      setRouteNotice({
        message: `已批量保存 ${plan.items.length} 条职责路线，并生成 ${dispatchedRechecks} 条小样本复检派单；已匹配 ${plan.summary.alreadyCurrent} 条，缺岗位 ${plan.summary.missing} 条已跳过。`,
        href: "/dispatch?filter=waiting_recheck",
        actionLabel: "去复检派单",
      });
      router.refresh();
    } catch (caught) {
      setRouteNotice({ message: caught instanceof Error ? caught.message : "批量保存职责路线失败。" });
    } finally {
      setSavingRoleRouteBatch(false);
    }
  }

  return (
    <div className="mt-6 grid gap-5">
      {invalidFocusNotice ? (
        <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="font-medium">焦点已回退</div>
              <p className="mt-1 text-sm leading-6">{invalidFocusNotice}</p>
            </div>
            <Link className="w-fit rounded-md bg-white px-3 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100" href={hrefWithGateReturn("/settings/models", gateReturnHref)}>
              查看模型设置
            </Link>
          </div>
        </section>
      ) : null}
      <section className="grid gap-3">
        <div className="rounded-md border border-slate-900 bg-slate-950 p-4 text-white" id="model-provider-interfaces">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-xs font-medium text-slate-300">毒舌 PM 模型接口留口</div>
              <h2 className="mt-1 text-lg font-semibold">{modelRoleMatrix.interfaceCoverage.headline}</h2>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-200">{modelRoleMatrix.interfaceCoverage.detail}</p>
            </div>
            <a
              className="inline-flex w-fit shrink-0 rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-950 hover:bg-slate-100"
              href={hrefWithGateReturn(modelRoleMatrix.interfaceCoverage.actionHref, gateReturnHref)}
            >
              {modelRoleMatrix.interfaceCoverage.actionLabel}
            </a>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-2 lg:grid-cols-4">
            {modelRoleMatrix.interfaceCoverage.items.map((item) => (
              <div className="rounded-md bg-white/10 p-3 text-sm" key={item.providerId}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs text-slate-300">{item.ownerLabel}</div>
                    <div className="mt-1 font-medium">{item.providerName}</div>
                  </div>
                  <span className="rounded-md bg-white/15 px-2 py-1 text-xs text-slate-100">{item.statusLabel}</span>
                </div>
                <div className="mt-2 text-xs leading-5 text-slate-300">{item.roleTitle}</div>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-300">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="font-medium text-slate-950">真实模型接入向导</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                先接入 DeepSeek、Kimi、Claude、GPT 里的至少两个真实模型，再去修复首日路线。别让正式写作还靠 Mock 顶着。
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-600">
              <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">可用 {providerSetupWizard.summary.ready}</span>
              <span className="rounded-md bg-amber-50 px-2 py-1 text-amber-700">补 Key {providerSetupWizard.summary.needsKey}</span>
              <span className="rounded-md bg-sky-50 px-2 py-1 text-sky-700">保存测试 {providerSetupWizard.summary.needsSave}</span>
            </div>
          </div>
          <div className="mt-3 grid gap-2 lg:grid-cols-4">
            {providerSetupWizard.items.map((item) => (
              <article
                className={`rounded-md border p-3 text-sm ${
                  selectedProviderId === item.providerId ? "border-slate-950 bg-slate-50" : "border-slate-200 bg-white"
                }`}
                key={item.providerId}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-xs text-slate-500">第 {item.priority} 个</div>
                    <h3 className="mt-1 font-medium text-slate-950">{item.displayName}</h3>
                  </div>
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${providerSetupWizardStatusCopy[item.status]}`}>
                    {item.statusLabel}
                  </span>
                </div>
                <p className="mt-2 min-h-10 leading-5 text-slate-700">{item.headline}</p>
                <div className="mt-2 grid gap-1 text-xs text-slate-600">
                  <span className="rounded-md bg-slate-50 px-2 py-1">推荐 {item.recommendedPresetLabel}</span>
                  <span className="rounded-md bg-slate-50 px-2 py-1">{item.recommendedModel}</span>
                  <span className="rounded-md bg-slate-50 px-2 py-1">上下文 {item.recommendedContextTokens ? item.recommendedContextTokens.toLocaleString() : "未设"} tokens</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1 text-xs text-slate-500">
                  {item.fitTags.map((tag) => (
                    <span className="rounded-md bg-slate-100 px-2 py-1" key={tag}>{tag}</span>
                  ))}
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{item.why}</p>
                <button
                  className="mt-3 w-full rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={item.status === "ready" && selectedProviderId === item.providerId}
                  onClick={() => selectProviderFromWizard(item)}
                  type="button"
                >
                  {item.status === "ready" ? "查看配置" : item.nextAction}
                </button>
              </article>
            ))}
          </div>
          <div className="mt-3 grid gap-2 text-sm leading-6 text-slate-600 md:grid-cols-3">
            {providerSetupWizard.nextActions.map((action) => (
              <div className="rounded-md bg-slate-50 px-3 py-2" key={action}>{action}</div>
            ))}
          </div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4" id="model-role-matrix">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="font-medium text-slate-950">模型编辑部职责矩阵</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{modelRoleMatrix.headline}</p>
              <p className="mt-2 text-sm font-medium text-slate-950">下一步：{modelRoleMatrix.nextAction}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs text-slate-700">
              <div className="rounded-md bg-emerald-50 px-3 py-2 text-emerald-700">
                <div className="text-lg font-semibold">{modelRoleMatrix.summary.readyRoles}</div>
                <div>已就位</div>
              </div>
              <div className="rounded-md bg-amber-50 px-3 py-2 text-amber-700">
                <div className="text-lg font-semibold">{modelRoleMatrix.summary.partialRoles}</div>
                <div>可顶岗</div>
              </div>
              <div className="rounded-md bg-rose-50 px-3 py-2 text-rose-700">
                <div className="text-lg font-semibold">{modelRoleMatrix.summary.missingRoles}</div>
                <div>缺岗位</div>
              </div>
            </div>
          </div>
          <div className={`mt-4 -mx-4 border-y px-4 py-3 text-sm ${modelRolePmFocusTone.className}`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-xs font-medium opacity-70">毒舌 PM 优先哨卡</div>
                <div className="mt-1 font-medium">{modelRoleMatrixPmFocusNotice.headline}</div>
              </div>
              <span className={`w-fit rounded-md px-2 py-1 text-xs font-medium ${modelRolePmFocusTone.badgeClassName}`}>
                {modelRolePmFocusTone.label}
              </span>
            </div>
            <p className="mt-2 leading-6">{modelRoleMatrixPmFocusNotice.reason}</p>
            <p className="mt-1 text-xs leading-5 opacity-80">验收证据：{modelRoleMatrixPmFocusNotice.proof}</p>
            <div className="mt-2 rounded-md bg-white/60 px-3 py-2 text-xs leading-5 text-slate-700">
              {modelRoleMatrixPmFocusNotice.pipelineValidationHint}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                className="inline-flex w-fit rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-950 hover:bg-slate-100"
                href={hrefWithGateReturn(modelRoleMatrixPmFocusNotice.actionHref, gateReturnHref)}
              >
                {modelRoleMatrixPmFocusNotice.actionLabel}
              </a>
              <a
                className="inline-flex w-fit rounded-md border border-white/60 px-3 py-2 text-xs font-medium text-slate-950 hover:bg-white/50"
                href={hrefWithGateReturn(modelRoleMatrixPmFocusNotice.pipelineActionHref, gateReturnHref)}
              >
                {modelRoleMatrixPmFocusNotice.pipelineActionLabel}
              </a>
            </div>
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {modelRoleMatrix.roles.map((role) => {
              const status = modelRoleStatusCopy[role.status];
              return (
                <article className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm" key={role.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="text-xs text-slate-500">{role.ownerLabel}</div>
                      <h3 className="mt-1 font-medium text-slate-950">{role.title}</h3>
                    </div>
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${status.className}`}>{status.label}</span>
                  </div>
                  <div className="mt-2 text-xs leading-5 text-slate-600">
                    <div>模型：{role.providerName ? `${role.providerName} · ${role.model ?? "未填模型"}` : "未配置"}</div>
                    <div>上下文要求：{role.minContextTokens.toLocaleString()} tokens</div>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-600">{role.reason}</p>
                  <div className="mt-2 flex flex-wrap gap-1 text-xs text-slate-500">
                    {role.deliverables.slice(0, 4).map((deliverable) => (
                      <span className="rounded-md bg-white px-2 py-1" key={deliverable}>{deliverable}</span>
                    ))}
                  </div>
                  <p className="mt-2 text-xs font-medium leading-5 text-slate-700">下一步：{role.nextAction}</p>
                </article>
              );
            })}
          </div>
          <div className="mt-4 rounded-md border border-slate-200 bg-white p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-sm font-medium text-slate-950">职责路由草案</div>
                <p className="mt-1 text-sm leading-6 text-slate-600">按四个模型岗位给六类写作任务分配首选和备用模型，先填入表单，再人工保存。</p>
              </div>
              <div className="flex flex-col gap-2 lg:items-end">
                <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                  <span className="rounded-md bg-sky-50 px-2 py-1 text-sky-700">可保存 {roleRouteBatchSavePlan.summary.readyToSave}</span>
                  <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">已匹配 {roleRouteBatchSavePlan.summary.alreadyCurrent}</span>
                  <span className="rounded-md bg-rose-50 px-2 py-1 text-rose-700">缺岗位 {roleRouteBatchSavePlan.summary.missing}</span>
                </div>
                <button
                  className="w-fit rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={savingRoleRouteBatch || roleRouteBatchSavePlan.items.length === 0}
                  onClick={() => void saveRoleRouteBatch()}
                  type="button"
                >
                  {savingRoleRouteBatch ? "保存中" : `保存 ${roleRouteBatchSavePlan.items.length} 条职责路线`}
                </button>
              </div>
            </div>
            {modelRoleRouteDraft.nextActions.length ? (
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {modelRoleRouteDraft.nextActions.map((action) => (
                  <div className="rounded-md bg-slate-50 p-2 text-xs leading-5 text-slate-600" key={action}>{action}</div>
                ))}
              </div>
            ) : null}
            <div className="mt-3 grid gap-2 lg:grid-cols-2">
              {modelRoleRouteDraft.items.map((item) => {
                const status = roleRouteDraftStatusCopy[item.status];
                return (
                  <article className="rounded-md bg-slate-50 p-3 text-sm" key={item.taskType}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="font-medium text-slate-950">{item.label}</div>
                        <div className="mt-1 text-xs text-slate-500">{item.ownerRoleTitle}</div>
                      </div>
                      <span className={`rounded-md px-2 py-1 text-xs font-medium ${status.className}`}>{status.label}</span>
                    </div>
                    <div className="mt-2 grid gap-1 text-xs leading-5 text-slate-600 md:grid-cols-2">
                      <div>首选：{item.primaryProviderName}</div>
                      <div>备用：{item.fallbackProviderName ?? "无"}</div>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-600">{item.reason}</p>
                    <div className="mt-2 grid gap-1 text-xs leading-5 text-slate-600">
                      <div className="rounded-md bg-white px-2 py-1">{item.costWatchLabel}</div>
                      <div className="rounded-md bg-white px-2 py-1">复检：{item.recheckAction}</div>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-amber-700">{item.manualGate}</p>
                    {item.status === "ready" ? (
                      <button
                        className="mt-3 rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                        onClick={() => fillRoleRouteDraft(item)}
                        type="button"
                      >
                        填入路由表单
                      </button>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">体检分</div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">{healthDashboard.score}</div>
            <div className="mt-1 text-xs text-slate-500">
              {healthDashboard.status === "healthy" ? "模型队列健康" : healthDashboard.status === "blocked" ? "存在阻塞项" : "需要补齐配置"}
            </div>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">可用模型</div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">{healthDashboard.summary.readyProviders}</div>
            <div className="mt-1 text-xs text-slate-500">启用 {healthDashboard.summary.enabledProviders} 个</div>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">缺 Key</div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">{healthDashboard.summary.missingApiKeyProviders}</div>
            <div className="mt-1 text-xs text-slate-500">真实模型调用前必须处理</div>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">缺上下文</div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">{healthDashboard.summary.missingContextProviders}</div>
            <div className="mt-1 text-xs text-slate-500">影响长篇任务分配</div>
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-medium text-slate-950">模型配置体检</h2>
            <div className="mt-3 grid gap-2 text-sm text-slate-600">
              {(healthDashboard.topRisks.length ? healthDashboard.topRisks : ["暂无阻塞风险，可以进入小批量试跑。"]).map((risk) => (
                <div className="rounded-md bg-slate-50 px-3 py-2" key={risk}>{risk}</div>
              ))}
            </div>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-medium text-slate-950">下一步动作</h2>
            <div className="mt-3 grid gap-2 text-sm text-slate-600">
              {healthDashboard.nextActions.map((action) => (
                <div className="rounded-md bg-slate-50 px-3 py-2" key={action}>{action}</div>
              ))}
            </div>
          </div>
        </div>
        <div className="grid gap-3 xl:grid-cols-2">
          {healthDashboard.rows.map((row) => {
            const status = statusCopy[row.status];
            return (
              <article className="rounded-md border border-slate-200 bg-white p-4" key={row.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-slate-950">{row.displayName}</h3>
                    <p className="mt-1 text-xs text-slate-500">{row.defaultModel || "未填写模型名"}</p>
                  </div>
                  <span className={`rounded-md border px-2 py-1 text-xs ${status.className}`}>{status.label} · {row.score}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                  <span className="rounded-md bg-slate-100 px-2 py-1">{row.hasApiKey || row.providerId === "mock" || row.providerId === "ollama" ? "Key 就绪" : "缺 Key"}</span>
                  <span className="rounded-md bg-slate-100 px-2 py-1">{row.hasBaseUrl ? "Base URL 就绪" : "缺 Base URL"}</span>
                  <span className="rounded-md bg-slate-100 px-2 py-1">上下文 {row.maxContextTokens ? `${row.maxContextTokens.toLocaleString()} tokens` : "未填"}</span>
                </div>
                <div className="mt-3 text-xs text-slate-500">适配任务：{row.taskFit.join(" / ")}</div>
                <div className="mt-2 text-xs text-slate-600">{row.nextAction}</div>
              </article>
            );
          })}
        </div>
      </section>
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-medium text-slate-950">模型路由策略</h2>
            <p className="mt-1 text-sm text-slate-600">给不同 AI 任务指定首选模型和备用模型，未配置时自动使用当前可用模型。</p>
          </div>
          {routeNotice ? (
            <div className="flex flex-wrap items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <span>{routeNotice.message}</span>
              {routeNotice.href && routeNotice.actionLabel ? (
                <Link className="rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100" href={hrefWithGateReturn(routeNotice.href, gateReturnHref)}>
                  {routeNotice.actionLabel}
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="mt-4 rounded-md border border-sky-200 bg-sky-50/50 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-sm font-medium text-slate-950">{routeConfirmationOnboarding.title}</div>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{routeConfirmationOnboarding.detail}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-600">
              <span className="rounded-md bg-white px-2 py-1">已确认 {routeConfirmationOnboarding.summary.confirmed}</span>
              <span className="rounded-md bg-white px-2 py-1">待确认 {routeConfirmationOnboarding.summary.readyToConfirm}</span>
              <span className="rounded-md bg-white px-2 py-1">缺路线 {routeConfirmationOnboarding.summary.missingRoute}</span>
            </div>
          </div>
          {routeConfirmationOnboarding.nextAction ? (
            <div className="mt-3 flex flex-col gap-3 rounded-md bg-white p-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-sm font-medium text-slate-950">下一条：{routeConfirmationOnboarding.nextAction.label}</div>
                <p className="mt-1 text-sm leading-6 text-slate-600">{routeConfirmationOnboarding.nextAction.detail}</p>
              </div>
              {routeConfirmationOnboarding.nextAction.status === "ready_to_confirm" ? (
                <button
                  className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={savingRouteType === routeConfirmationOnboarding.nextAction.taskType}
                  onClick={() => void saveRoute(routeConfirmationOnboarding.nextAction?.taskType ?? "")}
                  type="button"
                >
                  {savingRouteType === routeConfirmationOnboarding.nextAction.taskType ? "确认中" : routeConfirmationOnboarding.nextAction.actionLabel}
                </button>
              ) : (
                <span className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                  {routeConfirmationOnboarding.nextAction.actionLabel}
                </span>
              )}
            </div>
          ) : null}
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {routeConfirmationOnboarding.items.slice(0, 4).map((item) => {
              const status = routeOnboardingStatusCopy[item.status];
              return (
                <div className="rounded-md bg-white p-3 text-sm" key={item.taskType}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-slate-950">{item.label}</span>
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${status.className}`}>{status.label}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{item.detail}</p>
                </div>
              );
            })}
          </div>
        </div>
        <div
          className={`mt-4 rounded-md border bg-white p-4 ${
            isFirstDayRouteFocus ? "border-amber-300 ring-2 ring-amber-100" : "border-slate-200"
          }`}
          id="first-day-routes"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-sm font-medium text-slate-950">首日工作流模型路线</div>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                首日按钮会依次用到总控资料、第一章初稿、第一章审稿和二改路线。这里先把关键路线露出来，避免执行时才发现模型不对。
              </p>
              {firstDayRouteFocusNotice ? (
                <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800">
                  <div className="font-medium">{firstDayRouteFocusNotice.headline}</div>
                  <p className="mt-1">{firstDayRouteFocusNotice.detail}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {firstDayRouteFocusNotice.badges.map((badge) => (
                      <span className="rounded-md bg-white/80 px-2 py-1" key={badge}>{badge}</span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">已配 {firstDayRouteSummary.summary.configured}</span>
                <span className="rounded-md bg-amber-50 px-2 py-1 text-amber-700">缺路线 {firstDayRouteSummary.summary.needsRoute}</span>
                <span className="rounded-md bg-sky-50 px-2 py-1 text-sky-700">Mock {firstDayRouteSummary.summary.mockFallback}</span>
                <span className="rounded-md bg-violet-50 px-2 py-1 text-violet-700">可应用 {firstDayRouteSummary.summary.applicableRecommendations}</span>
              </div>
              <button
                className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={Boolean(applyingFirstDayRouteType) || firstDayRouteSummary.summary.applicableRecommendations === 0}
                onClick={() => void applyFirstDayRecommendedRoutes()}
                type="button"
              >
                {applyingFirstDayRouteType === "all" ? "应用中" : "一键应用首日推荐"}
              </button>
            </div>
          </div>
          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            {firstDayRouteSummary.items.map((item) => {
              const status = firstDayRouteStatusCopy[item.status];
              return (
                <div
                  className={`rounded-md p-3 text-sm ${
                    isFirstDayRouteFocus && item.taskType === firstDayFocusTaskType
                      ? "border border-amber-200 bg-amber-50/70"
                      : "bg-slate-50"
                  }`}
                  key={item.taskType}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-slate-950">{item.stage}</div>
                      <div className="mt-1 text-xs text-slate-500">{item.label}</div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <span className={`rounded-md px-2 py-1 text-xs font-medium ${status.className}`}>{status.label}</span>
                      {item.canApplyRecommendation ? (
                        <button
                          className="rounded-md bg-slate-950 px-2 py-1 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={Boolean(applyingFirstDayRouteType)}
                          onClick={() => void applyFirstDayRecommendedRoutes(item.taskType)}
                          type="button"
                        >
                          {applyingFirstDayRouteType === item.taskType ? "修复中" : "修复此路线"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                    <span className="rounded-md bg-white px-2 py-1">首选 {item.primaryProviderName}</span>
                    <span className="rounded-md bg-white px-2 py-1">备用 {item.fallbackProviderName}</span>
                  </div>
                  {item.recommendedRouteLabel ? (
                    <div className={`mt-2 rounded-md px-2 py-1 text-xs ${item.canApplyRecommendation ? "bg-amber-50 text-amber-800" : "bg-white text-slate-600"}`}>
                      推荐 {item.recommendedRouteLabel}
                    </div>
                  ) : null}
                  <p className="mt-2 leading-6 text-slate-600">{item.recommendation}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-3 grid gap-2 text-sm leading-6 text-slate-600">
            {firstDayRouteSummary.nextActions.map((action) => (
              <div className="rounded-md bg-slate-50 px-3 py-2" key={action}>{action}</div>
            ))}
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">已配置</div>
            <div className="mt-1 text-2xl font-semibold">{routeEffectAudit.summary.configuredRoutes}/{routeEffectAudit.summary.routedTaskTypes}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">健康路由</div>
            <div className="mt-1 text-2xl font-semibold">{routeEffectAudit.summary.healthyRoutes}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">需观察</div>
            <div className="mt-1 text-2xl font-semibold">{routeEffectAudit.summary.watchRoutes}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">未配置</div>
            <div className="mt-1 text-2xl font-semibold">{routeEffectAudit.summary.unconfiguredRoutes}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">有样本</div>
            <div className="mt-1 text-2xl font-semibold">{routeEffectAudit.summary.observedTaskTypes}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">走备用</div>
            <div className="mt-1 text-2xl font-semibold">{routeEffectAudit.summary.fallbackTaskCount}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">偏离路由</div>
            <div className="mt-1 text-2xl font-semibold">{routeEffectAudit.summary.otherTaskCount}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">路由成本</div>
            <div className="mt-1 text-2xl font-semibold">${routeEffectAudit.summary.knownCostUsd.toFixed(4)}</div>
          </div>
        </div>
        {routeEffectAudit.summary.nextUnconfiguredTaskLabel ? (
          <div className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            下一条建议补齐：{routeEffectAudit.summary.nextUnconfiguredTaskLabel}
          </div>
        ) : null}
        {routeConfirmationHistory.length ? (
          <div className="mt-4 rounded-md border border-slate-200 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-medium text-slate-950">路由确认记录</div>
              <span className="rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-500">最近 {routeConfirmationHistory.length} 条</span>
            </div>
            <div className="mt-3 grid gap-2 lg:grid-cols-2">
              {routeConfirmationHistory.map((item) => {
                const recheckStatus = routeRecheckStatusCopy[item.recheckStatus];
                return (
                  <div className="rounded-md bg-slate-50 p-3 text-sm" key={item.id}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="font-medium text-slate-950">{item.label}</div>
                        <div className="mt-1 text-xs text-slate-500">{item.createdAt.slice(0, 10)}</div>
                      </div>
                      <span className="rounded-md bg-white px-2 py-1 text-xs text-emerald-700">
                        {item.status === "succeeded" ? "已确认" : item.status}
                      </span>
                    </div>
                    <p className="mt-2 leading-6 text-slate-600">{item.message}</p>
                    <div className={`mt-2 rounded-md border px-2 py-1 text-xs leading-5 ${recheckStatus.className}`}>
                      <span className="font-medium">{item.recheckLabel}</span>
                      <span className="ml-1">{item.recheckDetail}</span>
                    </div>
                    <div className="mt-2 rounded-md bg-white p-2 text-xs leading-5 text-slate-500">{item.detail}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
        <div className="mt-4 rounded-md border border-slate-200 bg-white p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-sm font-medium text-slate-950">{routeConfirmationRecheckResultSummary.headline}</div>
              <p className="mt-1 text-sm leading-6 text-slate-600">{routeConfirmationRecheckResultSummary.detail}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-600">
              <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">沿用 {routeConfirmationRecheckResultSummary.summary.keep}</span>
              <span className="rounded-md bg-amber-50 px-2 py-1 text-amber-700">治理 {routeConfirmationRecheckResultSummary.summary.watch}</span>
              <span className="rounded-md bg-rose-50 px-2 py-1 text-rose-700">复核 {routeConfirmationRecheckResultSummary.summary.manualReview}</span>
            </div>
          </div>
          {routeConfirmationRecheckResultSummary.items.length ? (
            <div className="mt-3 grid gap-2 lg:grid-cols-3">
              {routeConfirmationRecheckResultSummary.items.slice(0, 6).map((item) => {
                const resultStatus = routeRecheckResultStatusCopy[item.status];
                return (
                  <div className="rounded-md bg-slate-50 p-3 text-sm" key={item.id}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="font-medium text-slate-950">{item.label}</div>
                        <div className="mt-1 text-xs text-slate-500">{item.completedAt ? item.completedAt.slice(0, 10) : "待补日期"}</div>
                      </div>
                      <span className={`rounded-md px-2 py-1 text-xs font-medium ${resultStatus.className}`}>{item.statusLabel}</span>
                    </div>
                    <p className="mt-2 line-clamp-3 leading-6 text-slate-600">{item.detail}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                      {item.metricChips.slice(0, 5).map((chip) => (
                        <span className="rounded-md bg-white px-2 py-1" key={chip}>{chip}</span>
                      ))}
                    </div>
                    <div className="mt-3 flex justify-end">
                      {item.status === "confirmed" ? (
                        <span className="rounded-md bg-white px-2 py-1 text-xs font-medium text-emerald-700">{item.actionLabel}</span>
                      ) : (
                        <button
                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          onClick={() => {
                            const target = document.getElementById("route-recheck-governance-advice");
                            target?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }}
                          type="button"
                        >
                          {item.actionLabel}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-600">
              暂无派单中心回填的复检结果。先确认模型路由并到派单中心完成小样本复检，这里会自动显示继续沿用、治理或人工复核结论。
            </div>
          )}
        </div>
        {routeConfirmationRecheckAdvice.summary.total ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50/40 p-3" id="route-recheck-governance-advice">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-sm font-medium text-slate-950">复检治理建议</div>
                <p className="mt-1 text-sm text-slate-600">只展示复检未达标的模型路线，方便先处理会拖慢生产的任务。</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                <span className="rounded-md bg-white px-2 py-1">切换 {routeConfirmationRecheckAdvice.summary.switchRoute}</span>
                <span className="rounded-md bg-white px-2 py-1">观察 {routeConfirmationRecheckAdvice.summary.extendWatch}</span>
                <span className="rounded-md bg-white px-2 py-1">复核 {routeConfirmationRecheckAdvice.summary.manualReview}</span>
              </div>
            </div>
            <div className="mt-3 grid gap-2 lg:grid-cols-2">
              {routeConfirmationRecheckAdvice.items.slice(0, 6).map((item) => {
                const samplePlan = routeConfirmationSamplePlanForAdvice(item);
                const governanceStatus = routeConfirmationGovernanceStatus.items.find((status) => status.adviceId === item.id);
                const governanceStatusStyle = governanceStatus ? routeGovernanceStatusCopy[governanceStatus.status] : null;
                return (
                  <div
                    className={`rounded-md border bg-white p-3 text-sm ${
                      item.severity === "blocked" ? "border-rose-200" : "border-amber-200"
                    }`}
                    key={item.id}
                  >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-slate-950">{item.label}</div>
                      <div className="mt-1 text-xs text-slate-500">{item.completedAt ? item.completedAt.slice(0, 10) : "待补复检日期"}</div>
                    </div>
                    <span className={`rounded-md px-2 py-1 text-xs ${
                      item.severity === "blocked" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"
                    }`}>
                      {item.actionLabel}
                    </span>
                  </div>
                  {governanceStatus ? (
                    <div className="mt-2 rounded-md border border-slate-100 bg-slate-50 p-2 text-xs leading-5 text-slate-600">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-slate-700">治理派单状态</span>
                        <span className={`rounded-md px-2 py-1 font-medium ${governanceStatusStyle?.className ?? "bg-slate-100 text-slate-600"}`}>
                          {governanceStatus.statusLabel}
                        </span>
                      </div>
                      <p className="mt-1">{governanceStatus.detail}</p>
                      {governanceStatus.completionEvidence ? (
                        <div className="mt-2 rounded-md bg-white p-2">
                          <div className="font-medium text-slate-700">治理完成依据</div>
                          <p className="mt-1 line-clamp-3 whitespace-pre-line text-slate-600">{governanceStatus.completionEvidence}</p>
                        </div>
                      ) : null}
                      {governanceStatus.nextRecheck ? (
                        <div className="mt-2 rounded-md border border-sky-100 bg-sky-50 p-2 text-sky-900">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium">下一轮复检入口</span>
                            <Link className="rounded-md bg-white px-2 py-1 font-medium text-sky-700 hover:bg-sky-100" href={hrefWithGateReturn(governanceStatus.nextRecheck.href, gateReturnHref)}>
                              {governanceStatus.nextRecheck.actionLabel}
                            </Link>
                          </div>
                          <p className="mt-1">{governanceStatus.nextRecheck.detail}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {governanceStatus.nextRecheck.acceptanceCriteria.slice(0, 3).map((criterion) => (
                              <span className="rounded-md bg-white px-2 py-1" key={criterion}>{criterion}</span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {governanceStatus.latestAt ? (
                          <span className="rounded-md bg-white px-2 py-1">{governanceStatus.latestAt.slice(0, 10)}</span>
                        ) : null}
                        {governanceStatus.status === "assigned" ? (
                          <Link className="rounded-md bg-white px-2 py-1 font-medium text-sky-700 hover:bg-sky-50" href={hrefWithGateReturn("/dispatch", gateReturnHref)}>
                            {governanceStatus.actionLabel}
                          </Link>
                        ) : (
                          <span className="rounded-md bg-white px-2 py-1 font-medium text-slate-600">{governanceStatus.actionLabel}</span>
                        )}
                      </div>
                    </div>
                  ) : null}
                  <p className="mt-2 leading-6 text-slate-700">{item.recommendation}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                    {item.sampleCount !== null ? <span className="rounded-md bg-slate-50 px-2 py-1">样本 {item.sampleCount}</span> : null}
                    {item.successRatePercent !== null ? <span className="rounded-md bg-slate-50 px-2 py-1">成功率 {item.successRatePercent}%</span> : null}
                    {item.qualityScore !== null ? <span className="rounded-md bg-slate-50 px-2 py-1">质量 {item.qualityScore}</span> : null}
                    {item.cost ? <span className="rounded-md bg-slate-50 px-2 py-1">成本 {item.cost}</span> : null}
                    {item.fallbackHit !== null ? <span className="rounded-md bg-slate-50 px-2 py-1">{item.fallbackHit ? "命中备用" : "未命中备用"}</span> : null}
                    {item.needsGovernance !== null ? <span className="rounded-md bg-slate-50 px-2 py-1">{item.needsGovernance ? "需要治理" : "无需治理"}</span> : null}
                  </div>
                  <div className="mt-3 rounded-md border border-sky-100 bg-sky-50 p-2 text-xs leading-5 text-sky-900">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">下一轮复检计划</span>
                      <span className="rounded-md bg-white px-2 py-1">{samplePlan.actionLabel}</span>
                    </div>
                    <p className="mt-2">{samplePlan.reason}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-md bg-white px-2 py-1">{samplePlan.routeLabel}</span>
                      {samplePlan.acceptanceCriteria.slice(1, 4).map((criterion) => (
                        <span className="rounded-md bg-white px-2 py-1" key={criterion}>{criterion}</span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-2 grid gap-1">
                    {item.evidence.slice(0, 3).map((entry) => (
                      <div className="rounded-md bg-slate-50 px-2 py-1 text-xs leading-5 text-slate-500" key={entry}>{entry}</div>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <button
                      className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={creatingRouteRecheckPlanId === item.id}
                      onClick={() => void createRouteRecheckSampleDispatch(item)}
                      type="button"
                    >
                      {creatingRouteRecheckPlanId === item.id ? "生成中" : "生成复检派单"}
                    </button>
                    <button
                      className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-800 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={runningRouteRecheckPlanId === item.id}
                      onClick={() => void runRouteConfirmationRecheckSamples(item)}
                      type="button"
                    >
                      {runningRouteRecheckPlanId === item.id ? "运行中" : "运行复检样本"}
                    </button>
                    <button
                      className="rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={executingRouteAdviceId === item.id || governanceStatus?.status === "assigned" || governanceStatus?.status === "completed"}
                      onClick={() => void executeRouteRecheckAdvice(item)}
                      type="button"
                    >
                      {executingRouteAdviceId === item.id
                        ? "生成中"
                        : governanceStatus?.status === "assigned"
                          ? "治理已派单"
                          : governanceStatus?.status === "completed"
                            ? "治理已完成"
                            : "生成治理派单"}
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        ) : null}
        <div className="mt-4 rounded-md border border-slate-200 p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-sm font-medium text-slate-950">冷启动路由蓝图</div>
              <p className="mt-1 text-sm text-slate-600">没有历史样本时，先按写作任务模型预设初始化路由。</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-600">
              <span className="rounded-md bg-slate-50 px-2 py-1">可初始化 {presetRouteBlueprint.summary.ready}</span>
              <span className="rounded-md bg-slate-50 px-2 py-1">已符合 {presetRouteBlueprint.summary.current}</span>
              <span className="rounded-md bg-slate-50 px-2 py-1">缺配置 {presetRouteBlueprint.summary.missing}</span>
            </div>
          </div>
          {presetRouteBlueprint.nextActions.length ? (
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {presetRouteBlueprint.nextActions.map((action) => (
                <div className="rounded-md bg-slate-50 p-2 text-xs leading-5 text-slate-600" key={action}>{action}</div>
              ))}
            </div>
          ) : null}
          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            {presetRouteBlueprint.items.map((item) => (
              <div className="rounded-md bg-slate-50 p-3 text-sm" key={item.taskType}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-950">{item.label}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {item.status === "ready" ? "可初始化" : item.status === "current" ? "已符合蓝图" : "缺少可用模型"}
                    </div>
                  </div>
                  {item.status === "ready" ? (
                    <button
                      className="rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                      disabled={applyingRecommendationType === item.taskType}
                      onClick={() => applyPresetRoute(item)}
                      type="button"
                    >
                      {applyingRecommendationType === item.taskType ? "应用中" : "应用蓝图"}
                    </button>
                  ) : null}
                </div>
                <div className="mt-2 grid gap-1 text-xs text-slate-600 md:grid-cols-2">
                  <div>首选：{item.primaryProviderName}</div>
                  <div>备用：{item.fallbackProviderName ?? "无"}</div>
                </div>
                <div className="mt-3 rounded-md bg-white p-3 text-xs leading-5 text-slate-600">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-md px-2 py-1 font-medium ${routeCostTierCopy[item.costEstimate.tier]}`}>
                      {item.costEstimate.label}
                    </span>
                    <span className="rounded-md bg-slate-100 px-2 py-1">人工确认</span>
                  </div>
                  <div className="mt-2 font-medium text-slate-950">{item.routingRole}</div>
                  <p className="mt-1">{item.costEstimate.detail}</p>
                  <p className="mt-1">{item.fallbackPlan}</p>
                  <p className="mt-1 text-amber-700">{item.manualConfirmation}</p>
                </div>
                {item.matchedTags.length ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {item.matchedTags.map((tag) => (
                      <span className="rounded-md bg-white px-2 py-1 text-xs text-slate-600" key={tag}>{tag}</span>
                    ))}
                  </div>
                ) : null}
                <p className="mt-2 leading-6 text-slate-600">{item.reason}</p>
                <div className="mt-2 grid gap-1">
                  {item.reasonItems.map((reason) => (
                    <div className="rounded-md bg-white px-2 py-1 text-xs leading-5 text-slate-600" key={reason}>{reason}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 rounded-md border border-slate-200 p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-sm font-medium text-slate-950">避坑规则治理</div>
              <p className="mt-1 text-sm text-slate-600">第三轮路由修复沉淀出的模型避坑规则，先治理范围，再影响下一批任务。</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-600">
              <span className="rounded-md bg-slate-50 px-2 py-1">规则 {routeAvoidanceGovernance.summary.totalRules}</span>
              <span className="rounded-md bg-slate-50 px-2 py-1">全局 {routeAvoidanceGovernance.summary.globalRules}</span>
              <span className="rounded-md bg-slate-50 px-2 py-1">任务级 {routeAvoidanceGovernance.summary.scopedRules}</span>
              <span className="rounded-md bg-slate-50 px-2 py-1">高风险 {routeAvoidanceGovernance.summary.highRiskRules}</span>
              <span className="rounded-md bg-slate-50 px-2 py-1">待复测 {routeAvoidanceGovernance.retestQueue.summary.due}</span>
              <span className="rounded-md bg-slate-50 px-2 py-1">已判定 {routeAvoidanceGovernance.retestReview.summary.total}</span>
            </div>
          </div>
          {routeAvoidanceGovernance.nextActions.length ? (
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {routeAvoidanceGovernance.nextActions.map((action) => (
                <div className="rounded-md bg-amber-50 p-2 text-xs leading-5 text-amber-900" key={action}>{action}</div>
              ))}
            </div>
          ) : null}
          {routeAvoidanceGovernance.retestReview.items.length ? (
            <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-medium text-slate-950">复测判定</div>
                <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                  <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">可解除 {routeAvoidanceGovernance.retestReview.summary.dismissRecommended}</span>
                  <span className="rounded-md bg-amber-50 px-2 py-1 text-amber-700">继续观察 {routeAvoidanceGovernance.retestReview.summary.extendWatchRecommended}</span>
                  <span className="rounded-md bg-slate-50 px-2 py-1">人工复核 {routeAvoidanceGovernance.retestReview.summary.manualReviewRecommended}</span>
                </div>
              </div>
              <div className="mt-3 grid gap-2 lg:grid-cols-2">
                {routeAvoidanceGovernance.retestReview.items.slice(0, 6).map((item) => (
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm" key={item.id}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="font-medium text-slate-950">{item.providerName} · {item.model}</div>
                        <div className="mt-1 text-xs text-slate-500">{item.taskScope} · {item.confidence === "high" ? "高置信" : "中置信"}</div>
                      </div>
                      <span className={`rounded-md px-2 py-1 text-xs font-medium ${
                        item.recommendedAction === "dismiss"
                          ? "bg-emerald-50 text-emerald-700"
                          : item.recommendedAction === "extend_watch"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-white text-slate-600"
                      }`}>{item.actionLabel}</span>
                    </div>
                    <p className="mt-2 leading-6 text-slate-600">{item.rationale}</p>
                    <div className="mt-2 rounded-md bg-white p-2 text-xs leading-5 text-slate-500">{item.completionEvidence}</div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {item.completedAt ? <span className="rounded-md bg-white px-2 py-1 text-xs text-slate-500">{item.completedAt.slice(0, 10)}</span> : null}
                      {item.recommendedAction !== "manual_review" ? (
                        <button
                          className="rounded-md bg-slate-950 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                          disabled={governingRuleKey === `${item.ruleKey}:${item.recommendedAction}`}
                          onClick={() => applyRetestDecision(item)}
                          type="button"
                        >
                          {governingRuleKey === `${item.ruleKey}:${item.recommendedAction}` ? "应用中" : "应用建议"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {routeAvoidanceDecisionHistory.items.length ? (
            <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-medium text-slate-950">治理历史</div>
                <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                  <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">解除 {routeAvoidanceDecisionHistory.summary.dismissed}</span>
                  <span className="rounded-md bg-sky-50 px-2 py-1 text-sky-700">限定 {routeAvoidanceDecisionHistory.summary.scoped}</span>
                  <span className="rounded-md bg-amber-50 px-2 py-1 text-amber-700">延长 {routeAvoidanceDecisionHistory.summary.extendedWatch}</span>
                </div>
              </div>
              <div className="mt-3 grid gap-2 lg:grid-cols-2">
                {routeAvoidanceDecisionHistory.items.slice(0, 6).map((item) => (
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm" key={item.id}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="font-medium text-slate-950">{item.providerName} · {item.model}</div>
                        <div className="mt-1 text-xs text-slate-500">{item.taskScope}</div>
                      </div>
                      <span className={`rounded-md px-2 py-1 text-xs font-medium ${
                        item.action === "dismiss"
                          ? "bg-emerald-50 text-emerald-700"
                          : item.action === "extend_watch"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-sky-50 text-sky-700"
                      }`}>{item.actionLabel}</span>
                    </div>
                    {item.note ? <p className="mt-2 leading-6 text-slate-600">{item.note}</p> : null}
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                      {item.updatedAt ? <span className="rounded-md bg-white px-2 py-1">应用 {item.updatedAt.slice(0, 10)}</span> : null}
                      {item.expiresAt ? <span className="rounded-md bg-white px-2 py-1">观察到 {item.expiresAt.slice(0, 10)}</span> : null}
                    </div>
                    {item.latestRetest ? (
                      <div className="mt-2 rounded-md bg-white p-2 text-xs text-slate-600">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium text-slate-800">闭环证据</span>
                          <span>{item.latestRetest.actionLabel}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-md bg-slate-50 px-2 py-1">
                            成功率 {item.latestRetest.successRatePercent === null ? "未填" : `${item.latestRetest.successRatePercent}%`}
                          </span>
                          <span className="rounded-md bg-slate-50 px-2 py-1">质量 {item.latestRetest.qualityScore ?? "未填"}</span>
                          {item.latestRetest.completedAt ? <span className="rounded-md bg-slate-50 px-2 py-1">{item.latestRetest.completedAt.slice(0, 10)}</span> : null}
                        </div>
                        <p className="mt-2 leading-5 text-slate-500">{item.latestRetest.completionEvidence}</p>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {routeAvoidanceGovernance.retestQueue.items.length ? (
            <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-medium text-slate-950">复测队列</div>
                <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                  <span className="rounded-md bg-white px-2 py-1">到期 {routeAvoidanceGovernance.retestQueue.summary.due}</span>
                  <span className="rounded-md bg-white px-2 py-1">3 天内 {routeAvoidanceGovernance.retestQueue.summary.upcoming}</span>
                  <span className="rounded-md bg-white px-2 py-1">观察中 {routeAvoidanceGovernance.retestQueue.summary.waiting}</span>
                </div>
              </div>
              <div className="mt-3 grid gap-2 lg:grid-cols-3">
                {routeAvoidanceGovernance.retestQueue.items.slice(0, 6).map((item) => {
                  const latestReview = latestRetestReviewByRuleKey.get(item.ruleKey);
                  return (
                    <div
                      className={`rounded-md border bg-white p-3 text-sm ${
                        item.status === "due"
                          ? "border-rose-200 text-rose-950"
                          : item.status === "upcoming"
                            ? "border-amber-200 text-amber-950"
                            : "border-slate-200 text-slate-700"
                      }`}
                      key={item.id}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="font-medium text-slate-950">{item.providerName} · {item.model}</div>
                          <div className="mt-1 text-xs opacity-75">{item.taskScope}</div>
                        </div>
                        <span className="rounded-md bg-slate-50 px-2 py-1 text-xs font-medium">{item.actionLabel}</span>
                      </div>
                      <p className="mt-2 leading-6 text-slate-600">{item.recommendation}</p>
                      {latestReview ? (
                        <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium text-slate-800">最近复测</span>
                            <span className={`rounded-md px-2 py-1 font-medium ${
                              latestReview.recommendedAction === "dismiss"
                                ? "bg-emerald-50 text-emerald-700"
                                : latestReview.recommendedAction === "extend_watch"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-white text-slate-600"
                            }`}>{latestReview.actionLabel}</span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="rounded-md bg-white px-2 py-1">
                              成功率 {latestReview.successRatePercent === null ? "未填" : `${latestReview.successRatePercent}%`}
                            </span>
                            <span className="rounded-md bg-white px-2 py-1">质量 {latestReview.qualityScore ?? "未填"}</span>
                            {latestReview.completedAt ? <span className="rounded-md bg-white px-2 py-1">{latestReview.completedAt.slice(0, 10)}</span> : null}
                          </div>
                          <p className="mt-2 leading-5 text-slate-500">{latestReview.completionEvidence}</p>
                        </div>
                      ) : null}
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="rounded-md bg-slate-50 px-2 py-1">样本 {item.recommendedSampleSize}</span>
                        <span className="rounded-md bg-slate-50 px-2 py-1">{item.dueAt ? item.dueAt.slice(0, 10) : "立即安排"}</span>
                        <button
                          className="rounded-md bg-slate-950 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                          disabled={creatingRetestRuleKey === item.ruleKey}
                          onClick={() => createRetestDispatch(item)}
                          type="button"
                        >
                          {creatingRetestRuleKey === item.ruleKey ? "生成中" : "生成复测派单"}
                        </button>
                        <button
                          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-50"
                          disabled={runningRetestRuleKey === item.ruleKey}
                          onClick={() => runRetestSamples(item)}
                          type="button"
                        >
                          {runningRetestRuleKey === item.ruleKey ? "运行中" : "运行复测样本"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            {routeAvoidanceGovernance.items.map((item) => (
              <div className={`rounded-md border p-3 text-sm ${item.riskLevel === "high" ? "border-amber-200 bg-amber-50 text-amber-950" : "border-slate-200 bg-slate-50 text-slate-700"}`} key={item.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-950">{item.providerName} · {item.model}</div>
                    <div className="mt-1 text-xs opacity-75">影响范围：{item.taskScope}</div>
                  </div>
                  <span className="rounded-md bg-white px-2 py-1 text-xs font-medium">{item.actionLabel}</span>
                </div>
                <p className="mt-2 leading-6">{item.reason}</p>
                <div className="mt-2 rounded-md bg-white/70 p-2 text-xs leading-5">{item.reviewAction}</div>
                {item.evidence.length ? (
                  <div className="mt-2 grid gap-1 text-xs opacity-80">
                    {item.evidence.slice(0, 2).map((evidence) => <div key={evidence}>{evidence}</div>)}
                  </div>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <select
                    className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700"
                    onChange={(event) => setScopeDrafts((current) => ({ ...current, [item.ruleKey]: event.target.value }))}
                    value={scopeDrafts[item.ruleKey] ?? item.scopedTaskType ?? item.scopeOptions[0]?.taskType ?? "chapter_review"}
                  >
                    {item.scopeOptions.map((option) => (
                      <option key={option.taskType} value={option.taskType}>{option.label}</option>
                    ))}
                  </select>
                  <button
                    className="rounded-md bg-slate-950 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                    disabled={governingRuleKey === `${item.ruleKey}:scope_task`}
                    onClick={() => saveAvoidanceOverride(item, "scope_task")}
                    type="button"
                  >
                    {governingRuleKey === `${item.ruleKey}:scope_task` ? "保存中" : "限定到所选任务"}
                  </button>
                  <button
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-50"
                    disabled={governingRuleKey === `${item.ruleKey}:extend_watch`}
                    onClick={() => saveAvoidanceOverride(item, "extend_watch")}
                    type="button"
                  >
                    {governingRuleKey === `${item.ruleKey}:extend_watch` ? "保存中" : "延长 14 天"}
                  </button>
                  <button
                    className="rounded-md border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 disabled:opacity-50"
                    disabled={governingRuleKey === `${item.ruleKey}:dismiss`}
                    onClick={() => saveAvoidanceOverride(item, "dismiss")}
                    type="button"
                  >
                    {governingRuleKey === `${item.ruleKey}:dismiss` ? "保存中" : "解除观察"}
                  </button>
                </div>
              </div>
            ))}
            {routeAvoidanceGovernance.items.length === 0 ? (
              <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">暂无避坑规则。等第三轮路由修复完成后，这里会集中展示可治理的模型经验。</div>
            ) : null}
          </div>
        </div>
        <div className="mt-4 rounded-md border border-slate-200 p-3">
          <div className="text-sm font-medium text-slate-950">系统路由建议</div>
          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            {routeRecommendations.map((recommendation) => (
              <div className="rounded-md bg-slate-50 p-3 text-sm" key={recommendation.taskType}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-950">{recommendation.label}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {recommendation.status === "ready" ? "可应用" : recommendation.status === "current" ? "已采用" : "样本不足"}
                    </div>
                  </div>
                  {recommendation.status === "ready" ? (
                    <button
                      className="rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                      disabled={applyingRecommendationType === recommendation.taskType}
                      onClick={() => applyRecommendation(recommendation)}
                      type="button"
                    >
                      {applyingRecommendationType === recommendation.taskType ? "应用中" : "应用建议"}
                    </button>
                  ) : null}
                </div>
                <div className="mt-2 grid gap-1 text-xs text-slate-600 md:grid-cols-2">
                  <div>首选：{recommendation.primaryProviderName}</div>
                  <div>备用：{recommendation.fallbackProviderName ?? "无"}</div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                  <span className="rounded-md bg-white px-2 py-1">样本 {recommendation.sampleTasks}</span>
                  <span className="rounded-md bg-white px-2 py-1">成功率 {recommendation.successRatePercent}%</span>
                  <span className="rounded-md bg-white px-2 py-1">质量 {recommendation.averageQualityScore || "缺"}</span>
                  <span className="rounded-md bg-white px-2 py-1">${recommendation.averageCostPerSucceededTaskUsd.toFixed(4)}/次</span>
                </div>
                <p className="mt-2 leading-6 text-slate-600">{recommendation.reason}</p>
                <div className="mt-3 border-t border-slate-200 pt-3">
                  <div className="text-xs font-medium text-slate-700">{recommendation.explanation.headline}</div>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {recommendation.explanation.items.map((item) => (
                      <div
                        className={`rounded-md border px-2 py-1.5 text-xs leading-5 ${routeRecommendationExplanationToneCopy[item.tone]}`}
                        key={item.id}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{item.label}</span>
                          <span className="shrink-0">{item.value}</span>
                        </div>
                        <p className="mt-1">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {recommendation.avoidance.status === "applied" ? (
                  <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs leading-5 text-amber-900">
                    <div className="font-medium">已应用避坑规则 · {recommendation.avoidance.appliedRules} 条</div>
                    {recommendation.avoidance.evidence.slice(0, 2).map((item) => <div key={item}>{item}</div>)}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-md border border-slate-200 p-3">
            <div className="text-sm font-medium text-slate-950">路由下一步</div>
            <div className="mt-3 grid gap-2 text-sm text-slate-600">
              {routeEffectAudit.nextActions.map((action, index) => (
                <div className="rounded-md bg-slate-50 p-2" key={action}>{index + 1}. {action}</div>
              ))}
            </div>
          </div>
          <div className="rounded-md border border-slate-200 p-3">
            <div className="text-sm font-medium text-slate-950">路由效果审计</div>
            <div className="mt-3 grid gap-2">
              {routeEffectAudit.rows.map((row) => (
                <div className="rounded-md bg-slate-50 p-3 text-sm" key={row.taskType}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium text-slate-950">{row.label}</div>
                    <div className="text-xs text-slate-500">{row.status === "healthy" ? "稳定" : row.status === "watch" ? "观察" : "未配置"}</div>
                  </div>
                  <div className="mt-2 grid gap-1 text-xs text-slate-500 md:grid-cols-2">
                    <div>首选：{row.primaryProviderName}</div>
                    <div>备用：{row.fallbackProviderName}</div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                    <span className="rounded-md bg-white px-2 py-1">任务 {row.totalTasks}</span>
                    <span className="rounded-md bg-white px-2 py-1">成功率 {row.successRatePercent}%</span>
                    <span className="rounded-md bg-white px-2 py-1">首选 {row.primaryTasks}</span>
                    <span className="rounded-md bg-white px-2 py-1">备用 {row.fallbackTasks}</span>
                    <span className="rounded-md bg-white px-2 py-1">偏离 {row.otherTasks}</span>
                    <span className="rounded-md bg-white px-2 py-1">${row.knownCostUsd.toFixed(4)}</span>
                  </div>
                  <p className="mt-2 leading-6 text-slate-600">{row.recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-3" id="manual-model-routes">
          {routeOptions.map((option) => {
            const draftRoute = routeDrafts[option.taskType] ?? { primaryProviderConfigId: "", fallbackProviderConfigId: "" };
            return (
              <div className="rounded-md border border-slate-200 p-3" key={option.taskType}>
                <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px_auto] lg:items-end">
                  <div>
                    <div className="font-medium text-slate-950">{option.label}</div>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{option.description}</p>
                  </div>
                  <label className="grid gap-1 text-sm">
                    首选模型
                    <select
                      className="rounded-md border border-slate-200 px-3 py-2"
                      onChange={(event) => setRouteDrafts((current) => ({
                        ...current,
                        [option.taskType]: { ...draftRoute, primaryProviderConfigId: event.target.value },
                      }))}
                      value={draftRoute.primaryProviderConfigId}
                    >
                      <option value="">自动选择</option>
                      {providers.map((provider) => (
                        <option key={provider.id} value={provider.id}>
                          {provider.displayName} · {provider.defaultModel}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm">
                    备用模型
                    <select
                      className="rounded-md border border-slate-200 px-3 py-2"
                      onChange={(event) => setRouteDrafts((current) => ({
                        ...current,
                        [option.taskType]: { ...draftRoute, fallbackProviderConfigId: event.target.value },
                      }))}
                      value={draftRoute.fallbackProviderConfigId}
                    >
                      <option value="">无备用</option>
                      {providers.map((provider) => (
                        <option key={provider.id} value={provider.id}>
                          {provider.displayName} · {provider.defaultModel}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="w-fit rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    disabled={savingRouteType === option.taskType}
                    onClick={() => saveRoute(option.taskType)}
                    type="button"
                  >
                    {savingRouteType === option.taskType ? "保存中" : "保存路由"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-medium text-slate-950">模型上线流程</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              从补 Key 到首日执行只走一条路：先让真实模型可用，再应用首日路线，最后进作品页跑首日工作流。
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <div className="flex flex-wrap gap-2 text-xs text-slate-600">
              <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">完成 {modelSetupOnboarding.summary.done}</span>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">等待 {modelSetupOnboarding.summary.blocked}</span>
            </div>
            {modelSetupOnboarding.currentStep.action === "open_projects" ? (
              <Link
                className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                href={hrefWithGateReturn("/projects", gateReturnHref)}
              >
                {modelSetupOnboarding.currentStep.actionLabel}
              </Link>
            ) : (
              <button
                className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={Boolean(applyingFirstDayRouteType) && modelSetupOnboarding.currentStep.action === "apply_routes"}
                onClick={() => handleModelSetupAction(modelSetupOnboarding.currentStep.action)}
                type="button"
              >
                {applyingFirstDayRouteType === "all" && modelSetupOnboarding.currentStep.action === "apply_routes"
                  ? "应用中"
                  : modelSetupOnboarding.currentStep.actionLabel}
              </button>
            )}
          </div>
        </div>
        <div className="mt-3 grid gap-2 lg:grid-cols-4">
          {modelSetupOnboarding.steps.map((item, index) => {
            const status = modelSetupStepStatusCopy[item.status];
            return (
              <div className="rounded-md bg-slate-50 p-3 text-sm" key={item.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-slate-950">{index + 1}. {item.title}</span>
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${status.className}`}>{status.label}</span>
                </div>
                <p className="mt-2 min-h-12 text-xs leading-5 text-slate-600">{item.detail}</p>
                {item.status === "actionable" ? (
                  <div className="mt-2 text-xs font-medium text-slate-950">下一步：{item.actionLabel}</div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-medium text-slate-950">模型供应商配置向导</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              按首日上线优先级准备 DeepSeek、Kimi、Claude、GPT；真实模型就绪后，冷启动蓝图会自动给首日工作流分配路线。
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-600">
            <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">可用 {providerSetupGuide.summary.ready}</span>
            <span className="rounded-md bg-amber-50 px-2 py-1 text-amber-700">缺 Key {providerSetupGuide.summary.needsKey}</span>
            <span className="rounded-md bg-sky-50 px-2 py-1 text-sky-700">待测试 {providerSetupGuide.summary.needsTest}</span>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">演示 {providerSetupGuide.summary.optional}</span>
          </div>
        </div>
        <div className="mt-3 grid gap-2 lg:grid-cols-4">
          {providerSetupGuide.items.slice(0, 4).map((item) => {
            const status = providerSetupStatusCopy[item.status];
            return (
              <button
                className={`rounded-md border p-3 text-left text-sm ${item.providerId === selectedProviderId ? "border-slate-950 bg-slate-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                key={item.providerId}
                onClick={() => selectProvider(item.providerId)}
                type="button"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-slate-950">{item.displayName}</span>
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${status.className}`}>{status.label}</span>
                </div>
                <p className="mt-2 min-h-10 text-xs leading-5 text-slate-600">{item.headline}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {item.taskTags.slice(0, 3).map((tag) => (
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600" key={tag}>{tag}</span>
                  ))}
                </div>
                <div className="mt-3 rounded-md bg-slate-950 px-3 py-2 text-center text-xs font-medium text-white">
                  {item.actionLabel}
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {providerSetupGuide.nextActions.map((action) => (
            <div className="rounded-md bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-600" key={action}>{action}</div>
          ))}
        </div>
      </section>
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <nav className="grid content-start gap-2">
          {options.map((option) => {
            const provider = existingByProvider.get(option.providerId);
            const isSelected = option.providerId === selectedProviderId;
            return (
              <button
                className={`rounded-md border px-3 py-3 text-left text-sm ${isSelected ? "border-slate-950 bg-white" : "border-slate-200 bg-slate-50 hover:bg-white"}`}
                key={option.providerId}
                onClick={() => selectProvider(option.providerId)}
                type="button"
              >
                <div className="font-medium text-slate-950">{option.displayName}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {provider?.enabled ? "已启用" : "未启用"} · {provider?.hasApiKey || !option.requiresApiKey ? "可调用" : "缺少 Key"}
                </div>
              </button>
            );
          })}
        </nav>
        <form className="grid gap-4 rounded-md border border-slate-200 bg-white p-4" onSubmit={saveProvider}>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-medium">{selectedOption.displayName}</h2>
              {selectedSetupGuideItem ? (
                <span className={`rounded-md px-2 py-1 text-xs font-medium ${providerSetupStatusCopy[selectedSetupGuideItem.status].className}`}>
                  {providerSetupStatusCopy[selectedSetupGuideItem.status].label}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-slate-600">{selectedOption.note}</p>
            {selectedSetupGuideItem ? (
              <div className="mt-3 grid gap-2 rounded-md bg-slate-50 p-3 text-xs text-slate-600 md:grid-cols-3">
                <div>
                  <div className="font-medium text-slate-700">默认接口</div>
                  <div className="mt-1 break-all">{selectedSetupGuideItem.defaultBaseUrl || "本地或演示模式"}</div>
                </div>
                <div>
                  <div className="font-medium text-slate-700">推荐模型</div>
                  <div className="mt-1">{selectedSetupGuideItem.recommendedModels.join(" / ") || selectedSetupGuideItem.defaultModel || "自定义模型"}</div>
                </div>
                <div>
                  <div className="font-medium text-slate-700">写作预设</div>
                  <div className="mt-1">{selectedSetupGuideItem.presetCount} 套</div>
                </div>
              </div>
            ) : null}
          </div>
          {selectedPresets.length ? (
            <div className="grid gap-2">
              <div className="text-sm font-medium text-slate-950">写作任务模型预设</div>
              <div className="grid gap-2 md:grid-cols-2">
                {selectedPresets.map((preset) => (
                  <button
                    className="rounded-md border border-slate-200 bg-slate-50 p-3 text-left text-sm hover:bg-white"
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    type="button"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-slate-950">{preset.label}</span>
                      <span className="text-xs text-slate-500">{preset.maxContextTokens.toLocaleString()} tokens</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{preset.model}</div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {preset.taskTags.map((tag) => (
                        <span className="rounded-md bg-white px-2 py-1 text-xs text-slate-600" key={tag}>{tag}</span>
                      ))}
                    </div>
                    <p className="mt-2 leading-5 text-slate-600">{preset.note}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <label className="grid gap-1 text-sm">
            显示名称
            <input
              className="rounded-md border border-slate-200 px-3 py-2"
              onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))}
              value={draft.displayName}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Base URL
            <input
              className="rounded-md border border-slate-200 px-3 py-2"
              onChange={(event) => setDraft((current) => ({ ...current, baseUrl: event.target.value }))}
              placeholder={selectedOption.defaultBaseUrl || "https://your-gateway.example/v1"}
              value={draft.baseUrl}
            />
          </label>
          <label className="grid gap-1 text-sm">
            模型名
            <input
              className="rounded-md border border-slate-200 px-3 py-2"
              onChange={(event) => setDraft((current) => ({ ...current, defaultModel: event.target.value }))}
              placeholder={selectedOption.defaultModel || "provider-model-name"}
              value={draft.defaultModel}
            />
          </label>
          <label className="grid gap-1 text-sm">
            API Key
            <input
              className="rounded-md border border-slate-200 px-3 py-2"
              onChange={(event) => setDraft((current) => ({ ...current, apiKey: event.target.value }))}
              placeholder={existing?.hasApiKey ? "已保存，留空则不覆盖" : selectedOption.requiresApiKey ? "请输入 API Key" : "无需填写"}
              type="password"
              value={draft.apiKey}
            />
          </label>
          <label className="grid gap-1 text-sm">
            上下文上限
            <input
              className="rounded-md border border-slate-200 px-3 py-2"
              inputMode="numeric"
              onChange={(event) => setDraft((current) => ({ ...current, maxContextTokens: event.target.value }))}
              placeholder="例如 128000"
              value={draft.maxContextTokens}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              checked={draft.enabled}
              onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))}
              type="checkbox"
            />
            启用这个模型配置
          </label>
          <div className="flex items-center gap-3">
            <button
              className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              disabled={isSaving || testingProviderId === draft.providerId}
              type="submit"
            >
              {isSaving ? "保存并测试中" : "保存配置"}
            </button>
            <button
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
              disabled={isSaving || testingProviderId === draft.providerId}
              onClick={testProviderConnection}
              type="button"
            >
              {testingProviderId === draft.providerId ? "测试中" : "测试连接"}
            </button>
            {message ? <span className="text-sm text-slate-600">{message}</span> : null}
          </div>
          {providerSetupNotice ? (
            <div className="flex flex-col gap-2 rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900 sm:flex-row sm:items-center sm:justify-between">
              <span>{providerSetupNotice.message}</span>
              {providerSetupNotice.action === "apply_first_day_routes" ? (
                <button
                  className="w-fit rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={Boolean(applyingFirstDayRouteType)}
                  onClick={() => void applyFirstDayRecommendedRoutes()}
                  type="button"
                >
                  {applyingFirstDayRouteType === "all" ? "应用中" : providerSetupNotice.actionLabel}
                </button>
              ) : null}
              {providerSetupNotice.action === "return_project" && providerSetupNotice.href ? (
                <Link className="w-fit rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white" href={hrefWithGateReturn(providerSetupNotice.href, gateReturnHref)}>
                  {providerSetupNotice.actionLabel}
                </Link>
              ) : null}
            </div>
          ) : null}
          {currentTestResult ? (
            <div className={`rounded-md border p-4 text-sm ${currentTestResult.ok ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className={`font-medium ${currentTestResult.ok ? "text-emerald-800" : "text-rose-800"}`}>
                  {currentTestResult.ok ? "连接成功" : "连接失败"}
                </h3>
                <span className={currentTestResult.ok ? "text-emerald-700" : "text-rose-700"}>
                  {currentTestResult.latencyMs}ms
                </span>
              </div>
              {currentTestResult.sampleText ? (
                <p className="mt-2 text-slate-700">返回样例：{currentTestResult.sampleText}</p>
              ) : null}
              {currentTestResult.usage ? (
                <p className="mt-2 text-xs text-slate-600">
                  Token：输入 {currentTestResult.usage.inputTokens} / 输出 {currentTestResult.usage.outputTokens}
                </p>
              ) : null}
              {currentTestResult.errorMessage ? (
                <p className="mt-2 text-slate-700">错误：{currentTestResult.errorMessage}</p>
              ) : null}
              {currentTestResult.repairHint ? (
                <p className="mt-2 text-slate-700">建议：{currentTestResult.repairHint}</p>
              ) : null}
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}
