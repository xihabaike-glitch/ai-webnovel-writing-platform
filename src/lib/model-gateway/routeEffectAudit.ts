import { labelForRoutedTask, modelTaskRouteOptions } from "./taskRouting.ts";

export interface RouteEffectProvider {
  id: string;
  displayName: string;
  defaultModel: string;
}

export interface RouteEffectRoute {
  taskType: string;
  primaryProviderConfigId: string | null;
  fallbackProviderConfigId: string | null;
}

export interface RouteEffectTask {
  id: string;
  taskType: string;
  providerConfigId: string;
  status: string;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
  createdAt: Date | string;
}

export interface RouteEffectRow {
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
}

export interface RouteEffectAudit {
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
  rows: RouteEffectRow[];
  nextActions: string[];
}

function money(value: number) {
  return Math.round(value * 1000000) / 1000000;
}

function tokens(task: RouteEffectTask) {
  return (task.inputTokens ?? 0) + (task.outputTokens ?? 0);
}

function successRate(succeeded: number, total: number) {
  if (total === 0) return 0;
  return Math.round((succeeded / total) * 100);
}

function iso(value: Date | string) {
  return new Date(value).toISOString();
}

function providerName(providersById: Map<string, RouteEffectProvider>, providerId: string | null) {
  if (!providerId) return "自动选择";
  const provider = providersById.get(providerId);
  return provider ? `${provider.displayName} · ${provider.defaultModel}` : "已删除模型";
}

function recommendationFor(input: {
  configured: boolean;
  totalTasks: number;
  fallbackTasks: number;
  otherTasks: number;
  successRatePercent: number;
}) {
  if (!input.configured) return "未配置路由，仍在使用默认活跃模型；建议指定首选和备用模型。";
  if (input.totalTasks === 0) return "路由已配置但还没有任务样本，先跑一轮小批量验证。";
  if (input.otherTasks > 0) return "存在未命中首选/备用的任务，检查历史任务或路由是否刚调整。";
  if (input.fallbackTasks > 0) return "已有任务走备用模型，检查首选模型 Key、启用状态和稳定性。";
  if (input.successRatePercent < 80) return "路由命中正常但成功率偏低，优先复查提示词、模型能力和输出格式。";
  return "路由表现稳定，可以保留当前策略并继续观察成本。";
}

export function buildRouteEffectAudit(
  tasks: RouteEffectTask[],
  routes: RouteEffectRoute[],
  providers: RouteEffectProvider[],
): RouteEffectAudit {
  const providersById = new Map(providers.map((provider) => [provider.id, provider]));
  const routesByTaskType = new Map(routes.map((route) => [route.taskType, route]));
  const rows = modelTaskRouteOptions.map((option): RouteEffectRow => {
    const route = routesByTaskType.get(option.taskType);
    const items = tasks.filter((task) => task.taskType === option.taskType);
    const primaryTasks = route?.primaryProviderConfigId
      ? items.filter((task) => task.providerConfigId === route.primaryProviderConfigId).length
      : 0;
    const fallbackTasks = route?.fallbackProviderConfigId
      ? items.filter((task) => task.providerConfigId === route.fallbackProviderConfigId).length
      : 0;
    const configuredProviderIds = [route?.primaryProviderConfigId, route?.fallbackProviderConfigId].filter(Boolean);
    const otherTasks = items.filter((task) => !configuredProviderIds.includes(task.providerConfigId)).length;
    const succeededTasks = items.filter((task) => task.status === "succeeded").length;
    const failedTasks = items.filter((task) => task.status === "failed").length;
    const rate = successRate(succeededTasks, items.length);
    const configured = Boolean(route?.primaryProviderConfigId || route?.fallbackProviderConfigId);
    const lastUsed = [...items].sort((left, right) => (
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    ))[0];
    const status: RouteEffectRow["status"] = !configured
      ? "unconfigured"
      : items.length > 0 && (fallbackTasks > 0 || otherTasks > 0 || rate < 80)
        ? "watch"
        : "healthy";

    return {
      taskType: option.taskType,
      label: labelForRoutedTask(option.taskType),
      primaryProviderName: providerName(providersById, route?.primaryProviderConfigId ?? null),
      fallbackProviderName: providerName(providersById, route?.fallbackProviderConfigId ?? null),
      totalTasks: items.length,
      primaryTasks,
      fallbackTasks,
      otherTasks,
      succeededTasks,
      failedTasks,
      successRatePercent: rate,
      totalTokens: items.reduce((sum, task) => sum + tokens(task), 0),
      knownCostUsd: money(items.reduce((sum, task) => sum + (task.costUsd ?? 0), 0)),
      lastUsedAt: lastUsed ? iso(lastUsed.createdAt) : null,
      status,
      recommendation: recommendationFor({
        configured,
        totalTasks: items.length,
        fallbackTasks,
        otherTasks,
        successRatePercent: rate,
      }),
    };
  });
  const summary = {
    routedTaskTypes: modelTaskRouteOptions.length,
    configuredRoutes: rows.filter((row) => row.primaryProviderName !== "自动选择" || row.fallbackProviderName !== "自动选择").length,
    observedTaskTypes: rows.filter((row) => row.totalTasks > 0).length,
    fallbackTaskCount: rows.reduce((sum, row) => sum + row.fallbackTasks, 0),
    otherTaskCount: rows.reduce((sum, row) => sum + row.otherTasks, 0),
    knownCostUsd: money(rows.reduce((sum, row) => sum + row.knownCostUsd, 0)),
    healthyRoutes: rows.filter((row) => row.status === "healthy").length,
    watchRoutes: rows.filter((row) => row.status === "watch").length,
    unconfiguredRoutes: rows.filter((row) => row.status === "unconfigured").length,
    nextUnconfiguredTaskLabel: rows.find((row) => row.status === "unconfigured")?.label ?? null,
  };
  const nextActions = [
    summary.configuredRoutes < summary.routedTaskTypes ? "优先补齐未配置路由的任务类型，别继续靠默认模型碰运气。" : null,
    summary.fallbackTaskCount > 0 ? "检查走备用模型的任务，确认首选模型是否缺 Key、被停用或失败率偏高。" : null,
    summary.otherTaskCount > 0 ? "存在未命中路由的历史任务，观察新任务是否仍偏离路由。" : null,
    rows.some((row) => row.totalTasks >= 2 && row.successRatePercent < 80) ? "对成功率低于 80% 的路由做单任务回放，先修提示词再换模型。" : null,
    "每次调整路由后，先跑 1 个初稿、1 个审稿、1 个二改样本，再扩大批量。",
  ].filter((action): action is string => Boolean(action));

  return {
    summary,
    rows,
    nextActions,
  };
}
