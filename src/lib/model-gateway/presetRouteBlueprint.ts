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
  routingRole: string;
  fallbackPlan: string;
  costEstimate: {
    tier: "low" | "medium" | "high" | "unknown";
    label: string;
    detail: string;
  };
  manualConfirmation: string;
  reasonItems: string[];
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

function taskRole(taskType: RoutedModelTaskType) {
  const roles: Record<RoutedModelTaskType, string> = {
    chapter_draft: "正文生产：负责把章节卡扩写成平台节奏初稿。",
    chapter_review: "主编审稿：负责钩子、爽点、人物选择和格式化问题清单。",
    chapter_second_pass: "二改执行：负责按审稿意见改正文，保留作者原意。",
    submission_package_optimize: "运营包装：负责标题、简介、标签、卖点和平台投稿材料。",
    first_three_rewrite: "首三章抢救：负责高压开头、连续追读和前三章整体重写。",
    control_asset_generate: "总控策划：负责人物弧光、世界规则、主线支线和项目土壤。",
  };
  return roles[taskType];
}

function fallbackPlan(taskType: RoutedModelTaskType, fallback: { provider: PresetRouteBlueprintProvider } | null) {
  if (!fallback) return "暂无备用模型；主模型失败时先暂停任务，人工检查配置、预算和提示词。";
  const fallbackName = providerName(fallback.provider);
  if (taskType === "chapter_draft") return `主模型失败或成本异常时，切到 ${fallbackName} 继续小批量初稿，先跑 1 章复核质量。`;
  if (taskType === "chapter_review") return `主模型审稿失败时，切到 ${fallbackName} 复审同一章，人工比对问题清单是否一致。`;
  if (taskType === "chapter_second_pass") return `二改失败时，切到 ${fallbackName} 重写同一章，必须保留审稿问题和原章节目标。`;
  if (taskType === "submission_package_optimize") return `包装失败时，切到 ${fallbackName} 只重做标题、简介和标签，不自动覆盖已采用版本。`;
  if (taskType === "first_three_rewrite") return `首三章改写失败时，切到 ${fallbackName} 只跑第一章样本，人工确认后再扩大到前三章。`;
  return `总控资料失败时，切到 ${fallbackName} 先补人物和世界观，不直接启动正文生产。`;
}

function costEstimate(taskType: RoutedModelTaskType, primary: { provider: PresetRouteBlueprintProvider } | null): PresetRouteBlueprintItem["costEstimate"] {
  if (!primary) {
    return {
      tier: "unknown",
      label: "成本未知",
      detail: "缺少可用首选模型，暂时不能估算执行成本。",
    };
  }

  if (primary.provider.providerId === "deepseek" || primary.provider.providerId === "ollama" || primary.provider.providerId === "mock") {
    return {
      tier: "low",
      label: "低成本",
      detail: "适合初稿、小样本和批量试跑，但仍要看质量分再放量。",
    };
  }

  if (taskType === "first_three_rewrite" || taskType === "control_asset_generate" || primary.provider.providerId === "claude") {
    return {
      tier: "high",
      label: "高成本",
      detail: "适合结构判断、长上下文和关键改写，不建议无脑批量。",
    };
  }

  return {
    tier: "medium",
    label: "中成本",
    detail: "适合稳定生产和包装任务，执行后需要记录 token、质量和备用命中。",
  };
}

function manualConfirmation(taskType: RoutedModelTaskType) {
  const gates: Record<RoutedModelTaskType, string> = {
    chapter_draft: "首轮只跑 1 章样本，质量分和人工读感过线后再进入批量。",
    chapter_review: "审稿问题必须能落到钩子、爽点、人物弧光或伏笔，不接受泛泛建议。",
    chapter_second_pass: "二改候选必须人工确认后才能覆盖正文。",
    submission_package_optimize: "标题、简介、标签和卖点必须人工采用后才能进入发布包版本。",
    first_three_rewrite: "前三章改写必须逐章对比，确认追读问题更强后再保存。",
    control_asset_generate: "总控资料只作为项目土壤候选，人物和世界观不得自动覆盖。",
  };
  return gates[taskType];
}

function reasonItems(
  taskType: RoutedModelTaskType,
  primary: { provider: PresetRouteBlueprintProvider; matchedTags: ProviderModelPresetTaskTag[] } | null,
  fallback: { provider: PresetRouteBlueprintProvider } | null,
) {
  if (!primary) return ["没有可用首选模型。", "先配置 GPT、Claude、DeepSeek 或 Kimi，并完成连接测试。"];
  return [
    `${providerName(primary.provider)} 命中 ${primary.matchedTags.length ? primary.matchedTags.join("、") : "任务预设"}。`,
    fallback ? `备用路线是 ${providerName(fallback.provider)}，用于失败、超时或成本异常时兜底。` : "当前没有备用路线，执行前要谨慎。",
    manualConfirmation(taskType),
  ];
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
      routingRole: taskRole(option.taskType),
      fallbackPlan: fallbackPlan(option.taskType, fallback),
      costEstimate: costEstimate(option.taskType, primary),
      manualConfirmation: manualConfirmation(option.taskType),
      reasonItems: reasonItems(option.taskType, primary, fallback),
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
