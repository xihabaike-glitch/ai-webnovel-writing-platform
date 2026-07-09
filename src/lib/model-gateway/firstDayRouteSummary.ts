import { labelForRoutedTask, type RoutedModelTaskType } from "./taskRouting.ts";

type FirstDayRouteTaskType = Extract<RoutedModelTaskType, "control_asset_generate" | "chapter_draft" | "chapter_review" | "chapter_second_pass">;

export interface FirstDayRouteProvider {
  id: string;
  providerId: string;
  displayName: string;
  defaultModel: string;
  enabled: boolean;
  encryptedApiKey: string | null;
}

export interface FirstDayRouteConfig {
  taskType: string;
  primaryProviderConfigId: string | null;
  fallbackProviderConfigId: string | null;
}

export interface FirstDayRouteBlueprintItem {
  taskType: string;
  status: "ready" | "current" | "missing";
  recommendedPrimaryProviderConfigId: string | null;
  recommendedFallbackProviderConfigId: string | null;
  primaryProviderName: string;
  fallbackProviderName: string | null;
  reason: string;
}

export interface FirstDayRouteSummaryItem {
  taskType: FirstDayRouteTaskType;
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
}

export interface FirstDayRouteSummary {
  summary: {
    total: number;
    configured: number;
    needsRoute: number;
    mockFallback: number;
    applicableRecommendations: number;
  };
  items: FirstDayRouteSummaryItem[];
  nextActions: string[];
}

const firstDayRouteTasks: Array<{ taskType: FirstDayRouteTaskType; stage: string }> = [
  { taskType: "control_asset_generate", stage: "人物和设定支撑" },
  { taskType: "chapter_draft", stage: "生成第一章正文" },
  { taskType: "chapter_review", stage: "第一章审稿" },
  { taskType: "chapter_second_pass", stage: "二改或前三章改写" },
];

function providerName(providersById: Map<string, FirstDayRouteProvider>, providerId: string | null | undefined) {
  if (!providerId) return "自动选择";
  const provider = providersById.get(providerId);
  return provider ? `${provider.displayName} · ${provider.defaultModel}` : "已删除模型";
}

function isMockRoute(providersById: Map<string, FirstDayRouteProvider>, route: FirstDayRouteConfig | undefined) {
  return [route?.primaryProviderConfigId, route?.fallbackProviderConfigId].some((providerId) => (
    providerId ? providersById.get(providerId)?.providerId === "mock" : false
  ));
}

function recommendationFor(status: FirstDayRouteSummaryItem["status"], stage: string) {
  if (status === "configured") return "已指定首选或备用模型，首日按钮会优先按这条路线执行。";
  if (status === "mock_fallback") return "当前路线包含 Mock 兜底，适合跑通产品闭环；接真实平台前要换成有效供应商。";
  return `${stage}还没有明确模型路线，建议先配置首选和备用模型，别让首日执行靠默认选择。`;
}

function routeMatchesBlueprint(route: FirstDayRouteConfig | undefined, blueprint: FirstDayRouteBlueprintItem | undefined) {
  if (!blueprint?.recommendedPrimaryProviderConfigId) return true;
  return (route?.primaryProviderConfigId ?? null) === blueprint.recommendedPrimaryProviderConfigId
    && (route?.fallbackProviderConfigId ?? null) === blueprint.recommendedFallbackProviderConfigId;
}

function recommendedRouteLabel(blueprint: FirstDayRouteBlueprintItem | undefined) {
  if (!blueprint?.recommendedPrimaryProviderConfigId) return null;
  return `${blueprint.primaryProviderName} / ${blueprint.fallbackProviderName ?? "无备用"}`;
}

export function buildFirstDayRouteSummary(input: {
  providers: FirstDayRouteProvider[];
  routes: FirstDayRouteConfig[];
  blueprintItems?: FirstDayRouteBlueprintItem[];
}): FirstDayRouteSummary {
  const providersById = new Map(input.providers.map((provider) => [provider.id, provider]));
  const routesByTaskType = new Map(input.routes.map((route) => [route.taskType, route]));
  const blueprintByTaskType = new Map((input.blueprintItems ?? []).map((item) => [item.taskType, item]));
  const items = firstDayRouteTasks.map(({ taskType, stage }): FirstDayRouteSummaryItem => {
    const route = routesByTaskType.get(taskType);
    const blueprint = blueprintByTaskType.get(taskType);
    const configured = Boolean(route?.primaryProviderConfigId || route?.fallbackProviderConfigId);
    const mockRoute = isMockRoute(providersById, route);
    const status: FirstDayRouteSummaryItem["status"] = mockRoute ? "mock_fallback" : configured ? "configured" : "needs_route";
    const canApplyRecommendation = Boolean(
      blueprint?.recommendedPrimaryProviderConfigId
      && blueprint.status !== "missing"
      && !routeMatchesBlueprint(route, blueprint),
    );

    return {
      taskType,
      label: labelForRoutedTask(taskType),
      stage,
      primaryProviderName: providerName(providersById, route?.primaryProviderConfigId),
      fallbackProviderName: providerName(providersById, route?.fallbackProviderConfigId),
      status,
      recommendation: recommendationFor(status, stage),
      recommendedPrimaryProviderConfigId: blueprint?.recommendedPrimaryProviderConfigId ?? null,
      recommendedFallbackProviderConfigId: blueprint?.recommendedFallbackProviderConfigId ?? null,
      recommendedRouteLabel: recommendedRouteLabel(blueprint),
      canApplyRecommendation,
    };
  });
  const summary = {
    total: items.length,
    configured: items.filter((item) => item.status === "configured").length,
    needsRoute: items.filter((item) => item.status === "needs_route").length,
    mockFallback: items.filter((item) => item.status === "mock_fallback").length,
    applicableRecommendations: items.filter((item) => item.canApplyRecommendation).length,
  };
  const missing = items.filter((item) => item.status === "needs_route").map((item) => item.stage);
  const nextActions = [
    summary.applicableRecommendations > 0 ? `可一键应用 ${summary.applicableRecommendations} 条首日推荐路线。` : null,
    missing.length ? `先补齐${missing.join("、")}的模型路线。` : null,
    summary.mockFallback > 0 ? "Mock 兜底只适合本地验收，接平台前要替换为 Claude、DeepSeek、Gemini、GPT 等有效供应商。" : null,
    "首日工作流至少要保证总控资料、第一章初稿、第一章审稿、二改四条路线可解释。",
  ].filter((action): action is string => Boolean(action));

  return {
    summary,
    items,
    nextActions,
  };
}
