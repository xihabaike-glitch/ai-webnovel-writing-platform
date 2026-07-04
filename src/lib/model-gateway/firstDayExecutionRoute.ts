import { labelForRoutedTask, type RoutedModelTaskType } from "./taskRouting.ts";

export interface FirstDayExecutionRouteProvider {
  id: string;
  providerId: string;
  displayName: string;
  defaultModel: string;
  enabled: boolean;
  encryptedApiKey: string | null;
}

export interface FirstDayExecutionRouteConfig {
  taskType: string;
  primaryProviderConfigId: string | null;
  fallbackProviderConfigId: string | null;
}

export interface FirstDayExecutionRouteStatus {
  taskType: RoutedModelTaskType | null;
  taskLabel: string;
  primaryProviderName: string;
  fallbackProviderName: string;
  status: "ready" | "missing_route" | "mock_fallback" | "manual";
  detail: string;
}

function providerName(provider: FirstDayExecutionRouteProvider | undefined | null) {
  return provider ? `${provider.displayName} · ${provider.defaultModel}` : "自动选择";
}

function configuredProviderName(provider: FirstDayExecutionRouteProvider | undefined | null, providerId: string | null | undefined) {
  if (!providerId) return "自动选择";
  return provider ? providerName(provider) : "已删除模型";
}

function providerById(providers: FirstDayExecutionRouteProvider[], providerId: string | null | undefined) {
  if (!providerId) return null;
  return providers.find((provider) => provider.id === providerId) ?? null;
}

function canUseProvider(provider: FirstDayExecutionRouteProvider | undefined | null) {
  if (!provider?.enabled) return false;
  if (provider.providerId === "mock" || provider.providerId === "ollama") return true;
  return Boolean(provider.encryptedApiKey);
}

export function buildFirstDayExecutionRouteStatus(input: {
  taskType?: RoutedModelTaskType | null;
  providers: FirstDayExecutionRouteProvider[];
  routes: FirstDayExecutionRouteConfig[];
}): FirstDayExecutionRouteStatus {
  if (!input.taskType) {
    return {
      taskType: null,
      taskLabel: "人工节点",
      primaryProviderName: "无需模型",
      fallbackProviderName: "无需模型",
      status: "manual",
      detail: "当前首日节点需要人工确认或运营收口，不会自动调用模型路线。",
    };
  }

  const route = input.routes.find((item) => item.taskType === input.taskType);
  const primary = providerById(input.providers, route?.primaryProviderConfigId);
  const fallback = providerById(input.providers, route?.fallbackProviderConfigId);
  const configured = Boolean(route?.primaryProviderConfigId || route?.fallbackProviderConfigId);
  const usableProviders = [primary, fallback].filter(canUseProvider);
  const hasUsableRoute = usableProviders.length > 0;
  const usesMock = usableProviders.some((provider) => provider?.providerId === "mock");
  const taskLabel = labelForRoutedTask(input.taskType);
  const status: FirstDayExecutionRouteStatus["status"] = !configured || !hasUsableRoute ? "missing_route" : usesMock ? "mock_fallback" : "ready";

  return {
    taskType: input.taskType,
    taskLabel,
    primaryProviderName: configuredProviderName(primary, route?.primaryProviderConfigId),
    fallbackProviderName: configuredProviderName(fallback, route?.fallbackProviderConfigId),
    status,
    detail: status === "ready"
      ? `${taskLabel}会优先走已配置模型路线。`
      : status === "mock_fallback"
        ? `${taskLabel}当前包含 Mock 兜底，只适合本地验收；接平台前要换成真实模型。`
        : `${taskLabel}还没有配置模型路线，执行时会退回默认模型选择。`,
  };
}
