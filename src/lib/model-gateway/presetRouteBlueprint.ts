import { providerModelPresets, type ProviderModelPresetTaskTag } from "./providerDefaults.ts";
import { labelForRoutedTask, modelTaskRouteOptions, type RoutedModelTaskType } from "./taskRouting.ts";

export interface PresetRouteBlueprintProvider {
  id: string;
  providerId: string;
  displayName: string;
  defaultModel: string;
  enabled: boolean;
  encryptedApiKey: string | null;
}

export interface PresetRouteBlueprintRoute {
  taskType: string;
  primaryProviderConfigId: string | null;
  fallbackProviderConfigId: string | null;
}

export interface PresetRouteBlueprintItem {
  taskType: RoutedModelTaskType;
  label: string;
  status: "ready" | "current" | "missing";
  recommendedPrimaryProviderConfigId: string | null;
  recommendedFallbackProviderConfigId: string | null;
  currentPrimaryProviderConfigId: string | null;
  currentFallbackProviderConfigId: string | null;
  primaryProviderName: string;
  fallbackProviderName: string | null;
  matchedTags: ProviderModelPresetTaskTag[];
  reason: string;
}

export interface PresetRouteBlueprint {
  summary: {
    total: number;
    ready: number;
    current: number;
    missing: number;
  };
  nextActions: string[];
  items: PresetRouteBlueprintItem[];
}

const taskTagWeights: Record<RoutedModelTaskType, Partial<Record<ProviderModelPresetTaskTag, number>>> = {
  chapter_draft: { "低成本批量": 40, "正文初稿": 30 },
  chapter_review: { "审稿二改": 45, "长篇规划": 15 },
  chapter_second_pass: { "审稿二改": 35, "正文初稿": 25 },
  submission_package_optimize: { "审稿二改": 25, "正文初稿": 25, "长篇规划": 10 },
  first_three_rewrite: { "正文初稿": 35, "审稿二改": 25 },
  control_asset_generate: { "长篇规划": 50, "审稿二改": 20 },
};

const taskProviderOrder: Record<RoutedModelTaskType, string[]> = {
  chapter_draft: ["deepseek", "kimi", "gpt", "claude"],
  chapter_review: ["claude", "gpt", "kimi", "deepseek"],
  chapter_second_pass: ["claude", "kimi", "gpt", "deepseek"],
  submission_package_optimize: ["gpt", "claude", "kimi", "deepseek"],
  first_three_rewrite: ["gpt", "claude", "kimi", "deepseek"],
  control_asset_generate: ["kimi", "claude", "gpt", "deepseek"],
};

function canUseProvider(provider: PresetRouteBlueprintProvider) {
  if (!provider.enabled) return false;
  if (provider.providerId === "mock" || provider.providerId === "ollama") return true;
  return Boolean(provider.encryptedApiKey);
}

function providerName(provider: PresetRouteBlueprintProvider | undefined) {
  return provider ? `${provider.displayName} · ${provider.defaultModel}` : "暂无可用预设模型";
}

function sameRoute(
  route: PresetRouteBlueprintRoute | undefined,
  primaryProviderConfigId: string | null,
  fallbackProviderConfigId: string | null,
) {
  return (route?.primaryProviderConfigId ?? null) === primaryProviderConfigId
    && (route?.fallbackProviderConfigId ?? null) === fallbackProviderConfigId;
}

function providerOrderScore(taskType: RoutedModelTaskType, providerId: string) {
  const index = taskProviderOrder[taskType].indexOf(providerId);
  return index === -1 ? 0 : (taskProviderOrder[taskType].length - index) * 3;
}

function buildCandidate(taskType: RoutedModelTaskType, provider: PresetRouteBlueprintProvider) {
  const weights = taskTagWeights[taskType];
  const presets = providerModelPresets.filter((preset) => (
    preset.providerId === provider.providerId
    && preset.model === provider.defaultModel
  ));
  const matchedTags = Array.from(new Set(presets.flatMap((preset) => preset.taskTags)
    .filter((tag) => Boolean(weights[tag]))));
  const tagScore = matchedTags.reduce((sum, tag) => sum + (weights[tag] ?? 0), 0);
  const score = tagScore + providerOrderScore(taskType, provider.providerId);

  return { provider, matchedTags, score };
}

export function buildPresetRouteBlueprint(
  providers: PresetRouteBlueprintProvider[],
  routes: PresetRouteBlueprintRoute[],
): PresetRouteBlueprint {
  const routesByTaskType = new Map(routes.map((route) => [route.taskType, route]));
  const usableProviders = providers.filter(canUseProvider);
  const items = modelTaskRouteOptions.map((option): PresetRouteBlueprintItem => {
    const candidates = usableProviders
      .map((provider) => buildCandidate(option.taskType, provider))
      .filter((candidate) => candidate.score > 0)
      .sort((left, right) => (
        right.score - left.score
        || providerOrderScore(option.taskType, right.provider.providerId) - providerOrderScore(option.taskType, left.provider.providerId)
        || left.provider.displayName.localeCompare(right.provider.displayName)
      ));
    const primary = candidates[0] ?? null;
    const fallback = candidates.find((candidate) => candidate.provider.id !== primary?.provider.id) ?? null;
    const route = routesByTaskType.get(option.taskType);
    const recommendedPrimaryProviderConfigId = primary?.provider.id ?? null;
    const recommendedFallbackProviderConfigId = fallback?.provider.id ?? null;
    const status: PresetRouteBlueprintItem["status"] = !primary
      ? "missing"
      : sameRoute(route, recommendedPrimaryProviderConfigId, recommendedFallbackProviderConfigId)
        ? "current"
        : "ready";
    const matchedTags = primary?.matchedTags ?? [];

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
      matchedTags,
      reason: primary
        ? `冷启动建议用 ${providerName(primary.provider)}，命中 ${matchedTags.join("、")}；备用 ${fallback ? providerName(fallback.provider) : "暂缺"}。`
        : `「${option.label}」还没有可用的写作预设模型，先配置 GPT、Claude、DeepSeek 或 Kimi。`,
    };
  });
  const ready = items.filter((item) => item.status === "ready").length;
  const current = items.filter((item) => item.status === "current").length;
  const missing = items.filter((item) => item.status === "missing").length;

  return {
    summary: {
      total: items.length,
      ready,
      current,
      missing,
    },
    nextActions: [
      ready > 0 ? `${ready} 条任务路由可按写作预设初始化。` : null,
      current > 0 ? `${current} 条任务路由已经符合冷启动蓝图。` : null,
      missing > 0 ? `${missing} 条任务缺少可用预设模型，先补供应商配置。` : null,
    ].filter((item): item is string => Boolean(item)),
    items,
  };
}
