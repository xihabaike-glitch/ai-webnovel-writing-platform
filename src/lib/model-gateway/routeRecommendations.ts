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

export interface RouteAvoidanceRule {
  taskType?: string | null;
  providerConfigId?: string | null;
  providerId?: string | null;
  model?: string | null;
  reason: string;
  evidence?: string[];
  governanceNote?: string | null;
  watchUntil?: string | null;
}

export type RouteAvoidanceOverrideAction = "dismiss" | "scope_task" | "extend_watch";

export interface RouteAvoidanceOverride {
  ruleKey: string;
  action: RouteAvoidanceOverrideAction;
  taskType?: string | null;
  note?: string | null;
  expiresAt?: string | null;
}

export interface RouteAvoidanceOverrideRecord {
  ruleKey: string;
  action: string;
  taskType: string | null;
  note: string;
  expiresAt: Date | string | null;
}

export interface RouteRecommendationAvoidance {
  status: "none" | "applied";
  appliedRules: number;
  reason: string | null;
  evidence: string[];
}

export interface RouteRecommendationOptions {
  avoidanceRules?: RouteAvoidanceRule[];
}

export interface RouteAvoidanceDispatchTask {
  stage: string;
  state: string;
  completionEvidence: string;
  evidence?: string[] | string | null;
}

export interface RouteAvoidanceGovernanceItem {
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
}

export interface RouteAvoidanceRetestQueueItem {
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
}

export interface RouteAvoidanceRetestDispatch {
  dispatchKey: string;
  projectId: null;
  platformId: string;
  platformName: string;
  stage: string;
  state: "assigned";
  priorityScore: number;
  ownerRole: string;
  title: string;
  detail: string;
  dueLabel: string;
  actionLabel: string;
  href: string;
  acceptanceCriteria: string[];
  evidence: string[];
  reviewLatestAt: string;
}

export interface RouteAvoidanceGovernance {
  summary: {
    totalRules: number;
    globalRules: number;
    scopedRules: number;
    highRiskRules: number;
  };
  items: RouteAvoidanceGovernanceItem[];
  retestQueue: {
    summary: {
      total: number;
      due: number;
      upcoming: number;
      waiting: number;
    };
    items: RouteAvoidanceRetestQueueItem[];
  };
  nextActions: string[];
}

export interface RouteAvoidanceGovernanceOptions {
  now?: string | Date;
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
  avoidance: RouteRecommendationAvoidance;
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

function sameText(left: string | null | undefined, right: string | null | undefined) {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function providerRiskMention(evidence: string, provider: RouteRecommendationProvider) {
  const normalized = evidence.toLowerCase();
  const markers = [provider.displayName, provider.providerId, provider.defaultModel]
    .filter((value) => value.trim().length > 0)
    .map((value) => value.toLowerCase());

  return markers.some((marker) => {
    const escaped = escapeRegExp(marker);
    return [
      new RegExp(`${escaped}\\s*(失败|报错|不可用|异常)`),
      new RegExp(`(暂停|禁用|避开|拉黑)\\s*${escaped}`),
      new RegExp(`${escaped}.{0,16}降级到`),
    ].some((pattern) => pattern.test(normalized));
  });
}

function evidenceList(value: RouteAvoidanceDispatchTask["evidence"]) {
  if (Array.isArray(value)) return value.filter((item) => item.trim().length > 0);
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
  } catch {
    return value.trim() ? [value.trim()] : [];
  }
}

function matchesAvoidanceRule(
  taskType: string,
  provider: RouteRecommendationProvider,
  rule: RouteAvoidanceRule,
) {
  if (rule.taskType && rule.taskType !== taskType) return false;
  const matchesProviderConfig = sameText(rule.providerConfigId, provider.id);
  const matchesProvider = sameText(rule.providerId, provider.providerId);
  const matchesModel = sameText(rule.model, provider.defaultModel);
  const hasProviderScope = Boolean(rule.providerConfigId || rule.providerId || rule.model);

  if (!hasProviderScope) return true;
  if (rule.providerConfigId && !matchesProviderConfig) return false;
  if (rule.providerId && !matchesProvider) return false;
  if (rule.model && !matchesModel) return false;

  return true;
}

function avoidanceForTask(
  taskType: string,
  provider: RouteRecommendationProvider | null,
  rules: RouteAvoidanceRule[],
): RouteRecommendationAvoidance {
  const applied = provider
    ? rules.filter((rule) => matchesAvoidanceRule(taskType, provider, rule))
    : [];
  const evidence = Array.from(new Set(applied.flatMap((rule) => rule.evidence ?? [])));
  const reason = applied.length > 0
    ? `已避开 ${provider?.displayName}${provider?.defaultModel ? ` · ${provider.defaultModel}` : ""}：${applied[0].reason}`
    : null;

  return {
    status: applied.length > 0 ? "applied" : "none",
    appliedRules: applied.length,
    reason,
    evidence,
  };
}

export function buildRouteAvoidanceRulesFromDispatchTasks(
  tasks: RouteAvoidanceDispatchTask[],
  providers: RouteRecommendationProvider[],
): RouteAvoidanceRule[] {
  const rules = new Map<string, RouteAvoidanceRule>();

  tasks
    .filter((task) => task.stage === "failure_route_repair" && task.state === "completed")
    .forEach((task) => {
      const completionEvidence = task.completionEvidence.trim();
      if (!completionEvidence) return;

      providers
        .filter((provider) => providerRiskMention(completionEvidence, provider))
        .forEach((provider) => {
          const key = provider.id;
          if (rules.has(key)) return;

          rules.set(key, {
            providerConfigId: provider.id,
            providerId: provider.providerId,
            model: provider.defaultModel,
            reason: completionEvidence,
            evidence: Array.from(new Set([...evidenceList(task.evidence), completionEvidence])),
          });
        });
    });

  return Array.from(rules.values());
}

export function buildRouteAvoidanceRuleKey(rule: RouteAvoidanceRule) {
  return [
    rule.providerConfigId ?? rule.providerId ?? "provider",
    rule.model ?? "model",
  ].join(":");
}

export function applyRouteAvoidanceOverrides(
  rules: RouteAvoidanceRule[],
  overrides: RouteAvoidanceOverride[],
): RouteAvoidanceRule[] {
  const overridesByKey = new Map(overrides.map((override) => [override.ruleKey, override]));

  return rules.flatMap((rule) => {
    const override = overridesByKey.get(buildRouteAvoidanceRuleKey(rule));
    if (!override) return [rule];
    if (override.action === "dismiss") return [];
    if (override.action === "scope_task") {
      return [{
        ...rule,
        taskType: override.taskType ?? rule.taskType ?? null,
        governanceNote: override.note ?? null,
      }];
    }
    return [{
      ...rule,
      governanceNote: override.note ?? null,
      watchUntil: override.expiresAt ?? null,
    }];
  });
}

export function routeAvoidanceOverrideFromRecord(record: RouteAvoidanceOverrideRecord): RouteAvoidanceOverride | null {
  if (record.action !== "dismiss" && record.action !== "scope_task" && record.action !== "extend_watch") return null;
  return {
    ruleKey: record.ruleKey,
    action: record.action,
    taskType: record.taskType,
    note: record.note,
    expiresAt: record.expiresAt instanceof Date ? record.expiresAt.toISOString() : record.expiresAt,
  };
}

function providerForRule(
  rule: RouteAvoidanceRule,
  providers: RouteRecommendationProvider[],
) {
  return providers.find((provider) => (
    (rule.providerConfigId && sameText(rule.providerConfigId, provider.id))
    || (rule.providerId && sameText(rule.providerId, provider.providerId))
    || (rule.model && sameText(rule.model, provider.defaultModel))
  ));
}

function routeAvoidanceRuleId(rule: RouteAvoidanceRule, index: number) {
  return [
    rule.taskType ?? "all",
    rule.providerConfigId ?? rule.providerId ?? "provider",
    rule.model ?? "model",
    index,
  ].join(":");
}

const DAY_MS = 24 * 60 * 60 * 1000;

function daysUntil(dueAt: string | null, now: Date) {
  if (!dueAt) return null;
  const dueTime = new Date(dueAt).getTime();
  if (Number.isNaN(dueTime)) return null;
  return Math.ceil((dueTime - now.getTime()) / DAY_MS);
}

function retestStatus(daysUntilDue: number | null): RouteAvoidanceRetestQueueItem["status"] {
  if (daysUntilDue === null) return "due";
  if (daysUntilDue <= 0) return "due";
  if (daysUntilDue <= 3) return "upcoming";
  return "waiting";
}

function buildRetestQueue(
  items: RouteAvoidanceGovernanceItem[],
  now: Date,
): RouteAvoidanceGovernance["retestQueue"] {
  const queueItems = items.map((item): RouteAvoidanceRetestQueueItem => {
    const untilDue = daysUntil(item.watchUntil, now);
    const status = retestStatus(untilDue);
    const recommendedSampleSize = item.riskLevel === "high" ? 3 : 2;
    const actionLabel = status === "due"
      ? "立即复测"
      : status === "upcoming"
        ? `即将复测 · ${untilDue} 天`
        : `等待观察 · ${untilDue} 天`;
    const recommendation = status === "due"
      ? `跑 ${recommendedSampleSize} 个小样本复测；通过后解除观察，失败则继续避开。`
      : status === "upcoming"
        ? `准备 ${recommendedSampleSize} 个小样本，观察期到后立刻复测。`
        : `继续收集「${item.taskScope}」样本，到期前不恢复放量。`;

    return {
      id: `${item.id}:retest`,
      ruleKey: item.ruleKey,
      providerName: item.providerName,
      model: item.model,
      taskScope: item.taskScope,
      taskType: item.scopedTaskType,
      reason: item.reason,
      evidence: item.evidence,
      status,
      dueAt: item.watchUntil,
      daysUntilDue: untilDue,
      recommendedSampleSize,
      actionLabel,
      recommendation,
    };
  }).sort((left, right) => {
    const statusRank = { due: 0, upcoming: 1, waiting: 2 };
    return statusRank[left.status] - statusRank[right.status]
      || (left.daysUntilDue ?? -999) - (right.daysUntilDue ?? -999)
      || left.providerName.localeCompare(right.providerName);
  });

  return {
    summary: {
      total: queueItems.length,
      due: queueItems.filter((item) => item.status === "due").length,
      upcoming: queueItems.filter((item) => item.status === "upcoming").length,
      waiting: queueItems.filter((item) => item.status === "waiting").length,
    },
    items: queueItems,
  };
}

export function buildRouteAvoidanceRetestDispatch(item: RouteAvoidanceRetestQueueItem): RouteAvoidanceRetestDispatch {
  const dueLabel = item.status === "due"
    ? "今天"
    : item.status === "upcoming"
      ? `${item.daysUntilDue ?? 3} 天内`
      : item.dueAt
        ? item.dueAt.slice(0, 10)
        : "观察期内";
  const priorityScore = item.status === "due" ? 90 : item.status === "upcoming" ? 70 : 50;
  const reviewLatestAt = item.dueAt && !Number.isNaN(new Date(item.dueAt).getTime())
    ? item.dueAt
    : new Date().toISOString();

  return {
    dispatchKey: `model-route-retest:${item.ruleKey}`,
    projectId: null,
    platformId: "model-routing",
    platformName: "模型路由",
    stage: "model_route_retest",
    state: "assigned",
    priorityScore,
    ownerRole: "模型治理",
    title: `${item.providerName} · ${item.model} 复测`,
    detail: `对「${item.taskScope}」跑 ${item.recommendedSampleSize} 个小样本，判断是否解除避坑规则。原始原因：${item.reason}`,
    dueLabel,
    actionLabel: "运行复测样本",
    href: "/settings/models",
    acceptanceCriteria: [
      `完成 ${item.recommendedSampleSize} 个小样本复测`,
      "记录成功率、质量分、成本和是否命中备用路线",
      "复测通过则解除观察；复测失败则延长观察或继续避开",
    ],
    evidence: item.evidence.length ? item.evidence : [item.reason],
    reviewLatestAt,
  };
}

export function buildRouteAvoidanceGovernance(
  rules: RouteAvoidanceRule[],
  providers: RouteRecommendationProvider[],
  options: RouteAvoidanceGovernanceOptions = {},
): RouteAvoidanceGovernance {
  const items = rules.map((rule, index): RouteAvoidanceGovernanceItem => {
    const provider = providerForRule(rule, providers);
    const scoped = Boolean(rule.taskType);
    const providerName = provider?.displayName ?? rule.providerId ?? rule.providerConfigId ?? "未知模型";
    const model = provider?.defaultModel ?? rule.model ?? "未指定模型";
    const taskScope = rule.taskType ? labelForRoutedTask(rule.taskType) : "全部写作任务";

    return {
      id: routeAvoidanceRuleId(rule, index),
      ruleKey: buildRouteAvoidanceRuleKey(rule),
      providerName,
      providerId: provider?.providerId ?? rule.providerId ?? null,
      model,
      taskScope,
      scopedTaskType: rule.taskType ?? null,
      riskLevel: scoped ? "medium" : "high",
      actionLabel: scoped ? "人工复核" : "限定任务类型",
      reviewAction: rule.watchUntil
        ? `延长观察到 ${rule.watchUntil.slice(0, 10)}：${rule.governanceNote ?? "到期后再决定是否解除。"}`
        : scoped
          ? `人工解除观察：如果「${taskScope}」连续小批量通过，可移除这条避坑规则。`
          : `人工解除观察前，先把「${providerName}」限定到具体任务类型，避免全局误伤。`,
      reason: rule.reason,
      evidence: rule.evidence ?? [],
      governanceNote: rule.governanceNote ?? null,
      watchUntil: rule.watchUntil ?? null,
      scopeOptions: modelTaskRouteOptions.map((option) => ({
        taskType: option.taskType,
        label: option.label,
      })),
    };
  }).sort((left, right) => (
    (left.riskLevel === "high" ? 0 : 1) - (right.riskLevel === "high" ? 0 : 1)
    || left.providerName.localeCompare(right.providerName)
  ));
  const globalRules = items.filter((item) => item.taskScope === "全部写作任务").length;
  const scopedRules = items.length - globalRules;
  const highRiskRules = items.filter((item) => item.riskLevel === "high").length;
  const now = options.now instanceof Date ? options.now : new Date(options.now ?? Date.now());
  const retestQueue = buildRetestQueue(items, now);
  const nextActions = [
    retestQueue.summary.due > 0 ? `${retestQueue.summary.due} 条避坑规则已到复测日，先跑小样本再决定是否解除观察。` : "",
    retestQueue.summary.upcoming > 0 ? `${retestQueue.summary.upcoming} 条避坑规则将在 3 天内复测，提前准备样本。` : "",
    globalRules > 0 ? `有 ${globalRules} 条全局避坑规则，先限定到任务类型再长期生效。` : "",
    scopedRules > 0 ? `有 ${scopedRules} 条任务级避坑规则，等下一批样本稳定后人工解除观察。` : "",
    items.length === 0 ? "暂无避坑规则；继续用第三轮派单沉淀模型路线经验。" : "",
  ].filter(Boolean);

  return {
    summary: {
      totalRules: items.length,
      globalRules,
      scopedRules,
      highRiskRules,
    },
    items,
    retestQueue,
    nextActions,
  };
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
  options: RouteRecommendationOptions = {},
): RouteRecommendation[] {
  const routesByTaskType = new Map(routes.map((route) => [route.taskType, route]));
  const usableProviders = providers.filter(canUseProvider);
  const avoidanceRules = options.avoidanceRules ?? [];

  return modelTaskRouteOptions.map((option): RouteRecommendation => {
    const route = routesByTaskType.get(option.taskType);
    const candidates = usableProviders
      .map((provider) => buildProviderCandidate(option.taskType, provider, tasks))
      .filter((candidate) => (
        candidate.totalTasks >= 2
        && candidate.successRatePercent >= 60
        && (candidate.averageQualityScore === 0 || candidate.averageQualityScore >= 70)
        && !avoidanceRules.some((rule) => matchesAvoidanceRule(option.taskType, candidate.provider, rule))
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
    const avoidedProvider = usableProviders.find((provider) => (
      avoidanceRules.some((rule) => matchesAvoidanceRule(option.taskType, provider, rule))
    )) ?? null;
    const avoidance = avoidanceForTask(option.taskType, avoidedProvider, avoidanceRules);
    const status: RouteRecommendation["status"] = !primary
      ? "insufficient"
      : sameRoute(route, recommendedPrimaryProviderConfigId, recommendedFallbackProviderConfigId)
        ? "current"
        : "ready";
    const baseReason = primary
      ? `近 ${primary.totalTasks} 次样本成功率 ${primary.successRatePercent}%，质量 ${primary.averageQualityScore || "缺"}，单次成功成本 $${primary.averageCostPerSucceededTaskUsd.toFixed(4)}。`
      : `「${option.label}」还没有足够可用样本，先各跑 2 次再让系统接管路由。`;

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
      avoidance,
      reason: avoidance.reason ? `${avoidance.reason} ${baseReason}` : baseReason,
    };
  });
}
