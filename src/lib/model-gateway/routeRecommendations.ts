import { labelForRoutedTask, modelTaskRouteOptions } from "./taskRouting.ts";

export interface RouteRecommendationProvider {
  id: string;
  providerId: string;
  displayName: string;
  defaultModel: string;
  enabled: boolean;
  encryptedApiKey: string | null;
}

export interface RouteRecommendationRoute {
  taskType: string;
  primaryProviderConfigId: string | null;
  fallbackProviderConfigId: string | null;
}

export interface RouteRecommendationTask {
  id: string;
  taskType: string;
  providerConfigId: string;
  status: string;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
  outputText: string | null;
}

export interface RouteRecommendation {
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
  reason: string;
}

function money(value: number) {
  return Math.round(value * 1000000) / 1000000;
}

function parseJsonObject(value: string | null | undefined) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function qualityScore(task: RouteRecommendationTask) {
  const output = parseJsonObject(task.outputText);
  if (!output) return null;
  if (typeof output.score === "number") return output.score;
  const qualityGate = output.qualityGate;
  if (qualityGate && typeof qualityGate === "object" && !Array.isArray(qualityGate)) {
    const score = (qualityGate as Record<string, unknown>).score;
    if (typeof score === "number") return score;
  }
  return null;
}

function canUseProvider(provider: RouteRecommendationProvider) {
  if (!provider.enabled) return false;
  if (provider.providerId === "mock" || provider.providerId === "ollama") return true;
  return Boolean(provider.encryptedApiKey);
}

function providerName(provider: RouteRecommendationProvider | undefined) {
  return provider ? `${provider.displayName} · ${provider.defaultModel}` : "无可用模型";
}

function successRate(succeeded: number, total: number) {
  if (total === 0) return 0;
  return Math.round((succeeded / total) * 100);
}

function sameRoute(
  route: RouteRecommendationRoute | undefined,
  primaryProviderConfigId: string | null,
  fallbackProviderConfigId: string | null,
) {
  return (route?.primaryProviderConfigId ?? null) === primaryProviderConfigId
    && (route?.fallbackProviderConfigId ?? null) === fallbackProviderConfigId;
}

function buildProviderCandidate(
  taskType: string,
  provider: RouteRecommendationProvider,
  tasks: RouteRecommendationTask[],
) {
  const items = tasks.filter((task) => task.taskType === taskType && task.providerConfigId === provider.id);
  const succeeded = items.filter((task) => task.status === "succeeded");
  const scored = items.map(qualityScore).filter((score): score is number => typeof score === "number");
  const averageQualityScore = scored.length > 0
    ? Math.round(scored.reduce((sum, score) => sum + score, 0) / scored.length)
    : 0;
  const knownCost = items.reduce((sum, task) => sum + (task.costUsd ?? 0), 0);
  const averageCostPerSucceededTaskUsd = succeeded.length > 0 ? money(knownCost / succeeded.length) : 0;
  const rate = successRate(succeeded.length, items.length);
  const averageTokens = items.length > 0
    ? Math.round(items.reduce((sum, task) => sum + (task.inputTokens ?? 0) + (task.outputTokens ?? 0), 0) / items.length)
    : 0;
  const qualityBonus = averageQualityScore > 0 ? averageQualityScore * 0.45 : 8;
  const costPenalty = averageCostPerSucceededTaskUsd > 0 ? Math.min(10, averageCostPerSucceededTaskUsd * 100) : 0;
  const sampleBonus = Math.min(8, items.length * 1.5);

  return {
    provider,
    totalTasks: items.length,
    succeededTasks: succeeded.length,
    successRatePercent: rate,
    averageQualityScore,
    averageCostPerSucceededTaskUsd,
    averageTokens,
    score: rate * 0.45 + qualityBonus + sampleBonus - costPenalty,
  };
}

export function buildRouteRecommendations(
  tasks: RouteRecommendationTask[],
  routes: RouteRecommendationRoute[],
  providers: RouteRecommendationProvider[],
): RouteRecommendation[] {
  const routesByTaskType = new Map(routes.map((route) => [route.taskType, route]));
  const usableProviders = providers.filter(canUseProvider);

  return modelTaskRouteOptions.map((option): RouteRecommendation => {
    const route = routesByTaskType.get(option.taskType);
    const candidates = usableProviders
      .map((provider) => buildProviderCandidate(option.taskType, provider, tasks))
      .filter((candidate) => (
        candidate.totalTasks >= 2
        && candidate.successRatePercent >= 60
        && (candidate.averageQualityScore === 0 || candidate.averageQualityScore >= 70)
      ))
      .sort((left, right) => (
        right.score - left.score
        || right.successRatePercent - left.successRatePercent
        || right.averageQualityScore - left.averageQualityScore
        || left.averageCostPerSucceededTaskUsd - right.averageCostPerSucceededTaskUsd
      ));
    const primary = candidates[0] ?? null;
    const fallback = candidates.find((candidate) => candidate.provider.id !== primary?.provider.id) ?? null;
    const recommendedPrimaryProviderConfigId = primary?.provider.id ?? null;
    const recommendedFallbackProviderConfigId = fallback?.provider.id ?? null;
    const status: RouteRecommendation["status"] = !primary
      ? "insufficient"
      : sameRoute(route, recommendedPrimaryProviderConfigId, recommendedFallbackProviderConfigId)
        ? "current"
        : "ready";

    return {
      taskType: option.taskType,
      label: labelForRoutedTask(option.taskType),
      status,
      recommendedPrimaryProviderConfigId,
      recommendedFallbackProviderConfigId,
      currentPrimaryProviderConfigId: route?.primaryProviderConfigId ?? null,
      currentFallbackProviderConfigId: route?.fallbackProviderConfigId ?? null,
      primaryProviderName: providerName(primary?.provider),
      fallbackProviderName: fallback ? providerName(fallback.provider) : null,
      sampleTasks: primary?.totalTasks ?? tasks.filter((task) => task.taskType === option.taskType).length,
      successRatePercent: primary?.successRatePercent ?? 0,
      averageQualityScore: primary?.averageQualityScore ?? 0,
      averageCostPerSucceededTaskUsd: primary?.averageCostPerSucceededTaskUsd ?? 0,
      reason: primary
        ? `近 ${primary.totalTasks} 次样本成功率 ${primary.successRatePercent}%，质量 ${primary.averageQualityScore || "缺"}，单次成功成本 $${primary.averageCostPerSucceededTaskUsd.toFixed(4)}。`
        : `「${option.label}」还没有足够可用样本，先各跑 2 次再让系统接管路由。`,
    };
  });
}
