import { isRoutedModelTaskType, labelForRoutedTask, type RoutedModelTaskType } from "./taskRouting.ts";
import type { GateActionReceipt, GatePlatformGrowthDispatchItem } from "../projects/gateActionReceipts.ts";

export type ModelRouteConfirmationSource = "manual" | "recommendation" | "preset";

export interface ModelRouteConfirmationInput {
  taskType: RoutedModelTaskType;
  primaryProviderName?: string | null;
  fallbackProviderName?: string | null;
  reason?: string | null;
  source?: ModelRouteConfirmationSource;
  routeStatus?: "ready" | "current" | "insufficient" | null;
  avoidanceStatus?: "none" | "applied" | null;
  restoredCandidate?: boolean | null;
  createdAt?: string | Date;
}

export interface ModelRouteConfirmationReceipt {
  id: string;
  actionId: string;
  platformId: string;
  platformName: string;
  label: string;
  detail: string;
  href: string;
  status: "succeeded";
  message: string;
  executionType: "model_route";
  succeededCount: number;
  failedCount: number;
  recheck: {
    status: "ready";
    label: string;
    detail: string;
    action: string;
  };
  payload: {
    taskType: RoutedModelTaskType;
    source: ModelRouteConfirmationSource;
    primaryProviderName: string;
    fallbackProviderName: string | null;
    reason: string | null;
    routeStatus: "ready" | "current" | "insufficient" | null;
    avoidanceStatus: "none" | "applied" | null;
    restoredCandidate: boolean;
  };
  createdAt: string;
}

export type RouteConfirmationHistoryStatus = "waiting_recheck" | "recheck_passed" | "recheck_needs_governance";

export interface RouteConfirmationHistoryItem {
  id: string;
  taskType: RoutedModelTaskType;
  label: string;
  detail: string;
  message: string;
  status: ModelRouteConfirmationReceipt["status"];
  createdAt: string;
  recheckStatus: RouteConfirmationHistoryStatus;
  recheckLabel: string;
  recheckDetail: string;
}

export interface RouteConfirmationDispatchFlowTask {
  dispatchKey: string;
  stage: string;
  state: string;
  title: string;
  detail: string;
  actionLabel: string;
  href: string;
  priorityScore: number;
  reviewLatestAt: string;
  completionEvidence?: string;
  evidence?: string[] | string | null;
  completedAt?: string | Date | null;
}

export interface RouteDispatchCompletionTemplateTask {
  stage: string;
  title: string;
  actionLabel: string;
}

export type RouteDispatchCompletionEvidenceKind = "route_recheck" | "route_governance";
export type RouteDispatchCompletionGovernanceConclusion = "resolved" | "watch" | "needs_switch" | "manual_review";

export interface RouteDispatchCompletionRecord {
  kind: RouteDispatchCompletionEvidenceKind;
  successRatePercent: number | null;
  qualityScore: number | null;
  sampleCount: number | null;
  cost: string | null;
  fallbackHit: boolean | null;
  fallbackLabel: string | null;
  needsGovernance: boolean | null;
  governanceConclusion: RouteDispatchCompletionGovernanceConclusion | null;
  primaryProviderName: string | null;
  fallbackProviderName: string | null;
}

export type RouteConfirmationDispatchFlowLaneId = "needs_governance" | "waiting_recheck" | "confirmed" | "completed";
export type RouteConfirmationDispatchTaskFilter = "all" | "needs_governance" | "waiting_recheck" | "completed";

export interface RouteConfirmationDispatchFlowItem {
  id: string;
  label: string;
  detail: string;
  actionLabel: string;
  href: string;
  priorityScore: number;
  latestAt: string;
  governanceAdvice?: RouteConfirmationRecheckAdviceItem;
}

export interface RouteConfirmationDispatchFlowLane {
  id: RouteConfirmationDispatchFlowLaneId;
  label: string;
  count: number;
  items: RouteConfirmationDispatchFlowItem[];
}

export interface RouteConfirmationClosedLoopStep {
  label: string;
  detail: string;
  latestAt: string;
}

export interface RouteConfirmationClosedLoopTrail {
  id: string;
  taskType: RoutedModelTaskType;
  label: string;
  status: "confirmed" | "needs_governance" | "manual_review" | "in_progress";
  summary: string;
  latestAt: string;
  steps: RouteConfirmationClosedLoopStep[];
}

export interface RouteConfirmationDispatchEmptyGuide {
  title: string;
  detail: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
  steps: Array<{
    label: string;
    detail: string;
  }>;
}

export interface RouteConfirmationDispatchFlow {
  summary: {
    confirmed: number;
    dispatched: number;
    waitingRecheck: number;
    needsGovernance: number;
    completed: number;
  };
  lanes: RouteConfirmationDispatchFlowLane[];
  trails: RouteConfirmationClosedLoopTrail[];
  emptyGuide: RouteConfirmationDispatchEmptyGuide | null;
}

export interface RouteConfirmationOnboardingRouteOption {
  taskType: string;
  label: string;
  description?: string;
}

export interface RouteConfirmationOnboardingRoute {
  taskType: string;
  primaryProviderConfigId: string | null;
  fallbackProviderConfigId: string | null;
}

export interface RouteConfirmationOnboardingItem {
  taskType: RoutedModelTaskType;
  label: string;
  description: string;
  status: "confirmed" | "ready_to_confirm" | "missing_route";
  actionLabel: string;
  detail: string;
}

export interface RouteConfirmationOnboarding {
  title: string;
  detail: string;
  summary: {
    total: number;
    confirmed: number;
    readyToConfirm: number;
    missingRoute: number;
  };
  nextAction: RouteConfirmationOnboardingItem | null;
  items: RouteConfirmationOnboardingItem[];
}

export interface ModelRouteConfirmationDispatch {
  id: string;
  dispatchKey: string;
  platformId: "model-routing";
  platformName: "模型路由";
  stage: "model_route_confirmation_recheck";
  state: "assigned";
  priorityScore: number;
  ownerRole: "模型治理";
  title: string;
  detail: string;
  dueLabel: string;
  actionLabel: string;
  href: string;
  acceptanceCriteria: string[];
  evidence: string[];
  reviewLatestAt: string;
}

export interface ModelRouteConfirmationAuditRecord {
  receiptId: string;
  actionId: string;
  label: string;
  detail: string;
  href: string;
  status: string;
  message: string;
  executionType: string;
  succeededCount: number;
  failedCount: number;
  platformId: string;
  platformName: string;
  recheckStatus: string;
  recheckLabel: string;
  recheckDetail: string;
  recheckAction: string;
  payload: string;
  createdAt: string | Date;
}

export interface RouteConfirmationRecheckDispatchTask {
  dispatchKey: string;
  stage: string;
  state: string;
  completionEvidence: string;
  evidence?: string[] | string | null;
  completedAt?: string | Date | null;
}

export interface RouteConfirmationGovernanceDispatchTask {
  dispatchKey: string;
  stage: string;
  state: string;
  completionEvidence: string;
  evidence?: string[] | string | null;
  completedAt?: string | Date | null;
}

export interface RouteConfirmationRecheckEvidence {
  id: string;
  taskType: RoutedModelTaskType;
  successRatePercent: number | null;
  qualityScore: number | null;
  sampleCount: number | null;
  cost: string | null;
  fallbackHit: boolean | null;
  needsGovernance: boolean | null;
  recommendedAction: "keep" | "watch" | "manual_review";
  summary: string;
  completionEvidence: string;
  evidence: string[];
  completedAt: string | null;
}

export interface RouteConfirmationRecheckDecision {
  status: "confirmed" | "needs_governance" | "manual_review";
  label: string;
  detail: string;
  nextActionLabel: string;
}

export interface RouteConfirmationGovernanceEvidence {
  id: string;
  taskType: RoutedModelTaskType;
  status: "resolved" | "needs_switch" | "watch" | "manual_review";
  summary: string;
  completionEvidence: string;
  evidence: string[];
  completedAt: string | null;
}

export type RouteConfirmationGovernanceFollowUpDispatch = GatePlatformGrowthDispatchItem & { dispatchKey: string };

export interface RouteConfirmationGovernanceFollowUpOptions {
  routeConfirmations?: ModelRouteConfirmationReceipt[];
}

export interface RouteConfirmationRecheckAdviceItem {
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
}

export interface RouteConfirmationRecheckAdvice {
  summary: {
    total: number;
    switchRoute: number;
    extendWatch: number;
    manualReview: number;
  };
  items: RouteConfirmationRecheckAdviceItem[];
}

export interface RouteConfirmationRecheckSamplePlanOptions {
  primaryProviderName?: string | null;
  fallbackProviderName?: string | null;
}

export interface RouteConfirmationRecheckSamplePlan {
  taskType: RoutedModelTaskType;
  label: string;
  sampleCount: number;
  routeLabel: string;
  actionLabel: string;
  reason: string;
  acceptanceCriteria: string[];
  completionTemplate: string;
  warning: string;
}

export interface RouteConfirmationRecheckSampleDispatchOptions {
  createdAt?: string | Date;
  dispatchKey?: string;
}

export interface RouteConfirmationRecheckAdviceDispatchTask {
  dispatchKey: string;
  stage: string;
  state?: string;
  title: string;
  detail: string;
  actionLabel: string;
  href?: string;
  priorityScore?: number;
  reviewLatestAt: string;
  evidence?: string[] | string | null;
}

export interface RouteConfirmationRecheckGovernanceAction {
  receipt: GateActionReceipt;
  dispatch: GatePlatformGrowthDispatchItem & { dispatchKey: string };
  payload: {
    adviceId: string;
    taskType: RoutedModelTaskType;
    action: RouteConfirmationRecheckAdviceItem["action"];
    severity: RouteConfirmationRecheckAdviceItem["severity"];
    recommendation: string;
    evidence: string[];
  };
}

const sourceLabels: Record<ModelRouteConfirmationSource, string> = {
  manual: "人工保存",
  recommendation: "系统建议",
  preset: "冷启动蓝图",
};

function asIsoString(value: string | Date | undefined) {
  if (!value) return new Date().toISOString();
  return value instanceof Date ? value.toISOString() : value;
}

function normalizeProviderName(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim();
  return normalized || fallback;
}

function includesRestoredSignal(input: ModelRouteConfirmationInput) {
  return Boolean(input.restoredCandidate) || Boolean(input.reason?.includes("复测通过"));
}

function parsePayload(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function confirmationSource(value: unknown): ModelRouteConfirmationSource {
  return value === "recommendation" || value === "preset" || value === "manual" ? value : "manual";
}

function routeStatus(value: unknown): ModelRouteConfirmationReceipt["payload"]["routeStatus"] {
  return value === "ready" || value === "current" || value === "insufficient" ? value : null;
}

function avoidanceStatus(value: unknown): ModelRouteConfirmationReceipt["payload"]["avoidanceStatus"] {
  return value === "none" || value === "applied" ? value : null;
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function numericPercentAfter(label: string, text: string) {
  const match = text.match(new RegExp(`${label}\\s*[:：]?\\s*(\\d{1,3})\\s*%?`));
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function numericCountAfter(label: string, text: string) {
  const match = text.match(new RegExp(`${label}\\s*[:：]?\\s*(\\d+)`));
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function completedAtIso(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function evidenceList(value: RouteConfirmationRecheckDispatchTask["evidence"]) {
  if (Array.isArray(value)) return value.filter((item) => item.trim().length > 0);
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
  } catch {
    return value.trim() ? [value.trim()] : [];
  }
}

function taskTypeFromConfirmationRecheckKey(dispatchKey: string) {
  const match = dispatchKey.match(/^model-route-confirmation-recheck(?:-sample)?:([^:]+):/);
  const taskType = match?.[1] ?? "";
  return isRoutedModelTaskType(taskType) ? taskType : null;
}

function taskTypeFromGovernanceKey(dispatchKey: string) {
  const match = dispatchKey.match(/^model-route-governance:([^:]+):/);
  const taskType = match?.[1] ?? "";
  return isRoutedModelTaskType(taskType) ? taskType : null;
}

function classifyConfirmationRecheck(completionEvidence: string) {
  const record = parseRouteDispatchCompletionEvidence({
    stage: "model_route_confirmation_recheck",
    title: "模型路由复检",
    actionLabel: "复检模型路由",
  }, completionEvidence);
  const normalized = completionEvidence.replace(/\s+/g, "");
  const successRatePercent = record?.successRatePercent ?? numericPercentAfter("成功率", completionEvidence);
  const qualityScore = record?.qualityScore ?? numericPercentAfter("质量", completionEvidence);
  const hasFallback = record?.fallbackHit ?? hasFallbackSignal(normalized);
  const hasFailure = hasFailureSignal(normalized);
  const hasCostRisk = Boolean(record?.cost && /(高|贵|超|异常|失控|偏高)/.test(record.cost));
  const needsGovernance = record?.needsGovernance === true || hasCostRisk;
  const keep = !needsGovernance && (successRatePercent ?? 0) >= 90 && (qualityScore ?? 0) >= 80 && !hasFailure && !hasFallback;
  const watch = needsGovernance || hasFailure || hasFallback || (successRatePercent !== null && successRatePercent < 80) || (qualityScore !== null && qualityScore < 70);
  const recommendedAction: RouteConfirmationRecheckEvidence["recommendedAction"] = keep ? "keep" : watch ? "watch" : "manual_review";
  const summary = recommendedAction === "keep"
    ? `最近路由复检通过：成功率 ${successRatePercent ?? "未填"}%，质量 ${qualityScore ?? "未填"}，可继续沿用。`
    : recommendedAction === "watch"
      ? `最近路由复检需观察：成功率 ${successRatePercent ?? "未填"}%，质量 ${qualityScore ?? "未填"}${hasFallback ? "，仍命中备用路线" : ""}${needsGovernance ? "，完成依据要求治理" : ""}。`
      : "最近路由复检证据不足，需要人工复核成功率、质量和备用命中。";

  return {
    successRatePercent,
    qualityScore,
    sampleCount: record?.sampleCount ?? null,
    cost: record?.cost ?? null,
    fallbackHit: record?.fallbackHit ?? null,
    needsGovernance: record?.needsGovernance ?? (hasCostRisk ? true : null),
    recommendedAction,
    summary,
  };
}

function classifyGovernanceEvidence(taskType: RoutedModelTaskType, completionEvidence: string): Pick<RouteConfirmationGovernanceEvidence, "status" | "summary"> {
  const normalized = completionEvidence.replace(/\s+/g, "");
  const label = labelForRoutedTask(taskType);
  const hasNeedsSwitch = normalized.includes("仍需换模型")
    || normalized.includes("继续命中备用")
    || normalized.includes("仍命中备用")
    || normalized.includes("换模型")
    || hasFailureSignal(normalized);
  const hasResolved = !hasNeedsSwitch && (
    normalized.includes("已治理")
    || normalized.includes("已切换")
    || normalized.includes("已重分配")
    || normalized.includes("治理完成")
  );
  const hasWatch = normalized.includes("继续观察") || normalized.includes("延长观察") || normalized.includes("观察期");
  if (hasNeedsSwitch) {
    return {
      status: "needs_switch",
      summary: `路由治理仍需换模型：${label}治理后仍有风险，${completionEvidence}`,
    };
  }
  if (hasResolved) {
    return {
      status: "resolved",
      summary: `路由治理已完成：${label}路线已处理，${completionEvidence}`,
    };
  }
  if (hasWatch) {
    return {
      status: "watch",
      summary: `路由治理继续观察：${label}进入观察期，${completionEvidence}`,
    };
  }
  return {
    status: "manual_review",
    summary: `路由治理需人工复核：${label}治理结果不够明确，${completionEvidence}`,
  };
}

function hasFallbackSignal(normalizedCompletionEvidence: string) {
  const hasNoFallback = normalizedCompletionEvidence.includes("未命中备用")
    || normalizedCompletionEvidence.includes("未走备用")
    || normalizedCompletionEvidence.includes("未使用备用");
  return !hasNoFallback && (
    normalizedCompletionEvidence.includes("命中备用")
    || normalizedCompletionEvidence.includes("走备用")
    || normalizedCompletionEvidence.includes("使用备用")
  );
}

function hasFailureSignal(normalizedCompletionEvidence: string) {
  return /(失败|超时|报错|异常|不可用|JSON不稳定|格式错误)/.test(normalizedCompletionEvidence);
}

function buildAdviceEvidence(item: RouteConfirmationRecheckEvidence) {
  return Array.from(new Set([
    item.summary,
    ...item.evidence,
    item.completionEvidence,
  ].filter((entry) => entry.trim().length > 0))).slice(0, 4);
}

function routeRecheckSeverity(item: RouteConfirmationRecheckEvidence, hasFallback: boolean, hasFailure: boolean): RouteConfirmationRecheckAdviceItem["severity"] {
  if (hasFallback || hasFailure || (item.successRatePercent !== null && item.successRatePercent < 80)) return "blocked";
  return "warning";
}

function routeRecheckAction(item: RouteConfirmationRecheckEvidence, hasFallback: boolean, hasFailure: boolean): Pick<RouteConfirmationRecheckAdviceItem, "action" | "actionLabel" | "recommendation"> | null {
  const label = labelForRoutedTask(item.taskType);
  if (item.recommendedAction === "keep") return null;
  if (item.recommendedAction === "manual_review") {
    return {
      action: "manual_review",
      actionLabel: "人工复核",
      recommendation: `「${label}」复检证据不完整，先人工补齐成功率、质量和备用命中，再决定是否调整路线。`,
    };
  }
  if (item.needsGovernance) {
    const cost = item.cost ? `，成本记录为「${item.cost}」` : "";
    return {
      action: "extend_watch",
      actionLabel: "延长观察",
      recommendation: `「${label}」复检完成依据明确需要治理${cost}，先延长观察并跑小样本，暂缓扩大批量。`,
    };
  }
  if (hasFallback) {
    return {
      action: "switch_route",
      actionLabel: "切备用/重分配",
      recommendation: `「${label}」复检仍命中备用路线，先切换首选模型或重分配任务模型。`,
    };
  }
  if (hasFailure || (item.successRatePercent !== null && item.successRatePercent < 80)) {
    return {
      action: "extend_watch",
      actionLabel: "延长观察",
      recommendation: `「${label}」复检成功率偏低，延长观察并先跑小样本，暂缓扩大批量。`,
    };
  }
  return {
    action: "extend_watch",
    actionLabel: "延长观察",
    recommendation: `「${label}」复检未达标，延长观察并先跑小样本。`,
  };
}

function routeRecheckSampleCount(advice: RouteConfirmationRecheckAdviceItem) {
  const baseCount = advice.sampleCount ?? 2;
  if (advice.action === "switch_route" || advice.severity === "blocked") return Math.max(3, baseCount);
  return Math.max(2, baseCount);
}

function routeRecheckPlanRouteLabel(options: RouteConfirmationRecheckSamplePlanOptions) {
  const primary = options.primaryProviderName?.trim();
  const fallback = options.fallbackProviderName?.trim();
  if (primary && fallback) return `${primary} -> ${fallback}`;
  if (primary) return primary;
  return "当前模型路由配置";
}

export function buildRouteConfirmationRecheckSamplePlan(
  advice: RouteConfirmationRecheckAdviceItem,
  options: RouteConfirmationRecheckSamplePlanOptions = {},
): RouteConfirmationRecheckSamplePlan {
  const label = labelForRoutedTask(advice.taskType);
  const sampleCount = routeRecheckSampleCount(advice);
  const routeLabel = routeRecheckPlanRouteLabel(options);
  const cost = advice.cost ? `，当前成本记录为「${advice.cost}」` : "";
  const reason = advice.needsGovernance
    ? `「${label}」复检完成依据要求治理${cost}，下一轮先用 ${sampleCount} 个小样本验证路线是否恢复。`
    : advice.action === "switch_route"
      ? `「${label}」复检仍命中备用或失败，下一轮先用 ${sampleCount} 个小样本验证调整后的模型组合。`
      : `「${label}」复检未完全达标，下一轮先用 ${sampleCount} 个小样本延长观察。`;

  return {
    taskType: advice.taskType,
    label,
    sampleCount,
    routeLabel,
    actionLabel: `准备 ${sampleCount} 个复检样本`,
    reason,
    acceptanceCriteria: [
      `复跑 ${sampleCount} 个「${label}」小样本。`,
      "记录成功率、质量、成本和备用命中。",
      "成功率不低于 90%，质量不低于 80。",
      "如果仍命中备用、成本继续偏高或出现失败，继续保留治理派单。",
    ],
    completionTemplate: [
      `复检${label}模型路由`,
      `样本数：${sampleCount}`,
      `模型组合：${routeLabel}`,
      "成功率：",
      "质量：",
      "成本：",
      "备用命中：未命中备用 / 命中备用",
      "是否需要治理：否 / 是，原因：",
    ].join("\n"),
    warning: "复检样本只验证模型路线，不直接扩大批量生产。",
  };
}

export function buildRouteConfirmationRecheckSampleDispatch(
  advice: RouteConfirmationRecheckAdviceItem,
  plan: RouteConfirmationRecheckSamplePlan,
  options: RouteConfirmationRecheckSampleDispatchOptions = {},
): RouteConfirmationGovernanceFollowUpDispatch {
  const createdAt = asIsoString(options.createdAt);
  const dispatchKey = options.dispatchKey ?? `model-route-confirmation-recheck-sample:${advice.taskType}:${createdAt}`;
  return {
    id: dispatchKey,
    dispatchKey,
    platformId: "model-routing",
    platformName: "模型路由",
    stage: "model_route_confirmation_recheck",
    state: "assigned",
    priorityScore: advice.severity === "blocked" ? 88 : 82,
    ownerRole: "模型治理",
    title: `复检${plan.label}模型路由小样本`,
    detail: `${plan.reason} 模型组合：${plan.routeLabel}。${plan.warning}`,
    dueLabel: "下一批任务前",
    actionLabel: "复检小样本",
    href: "/settings/models",
    acceptanceCriteria: plan.acceptanceCriteria,
    evidence: Array.from(new Set([
      advice.recommendation,
      plan.reason,
      plan.completionTemplate,
      ...advice.evidence,
    ])).slice(0, 5),
    reviewLatestAt: createdAt,
  };
}

export function buildRouteConfirmationRecheckAdviceFromDispatchTask(
  task: RouteConfirmationRecheckAdviceDispatchTask,
): RouteConfirmationRecheckAdviceItem | null {
  if (task.stage !== "model_route_confirmation_recheck") return null;
  const taskType = taskTypeFromConfirmationRecheckKey(task.dispatchKey);
  if (!taskType) return null;
  const label = labelForRoutedTask(taskType);
  const evidence = evidenceList(task.evidence);
  const recommendation = task.detail.trim() || `「${label}」需要运行复检小样本，确认治理后的模型路线是否恢复。`;
  return {
    id: `${task.dispatchKey}:dispatch-advice`,
    taskType,
    label,
    severity: (task.priorityScore ?? 0) >= 88 ? "blocked" : "warning",
    action: "extend_watch",
    actionLabel: task.actionLabel || "复检小样本",
    recommendation,
    sampleCount: null,
    successRatePercent: null,
    qualityScore: null,
    cost: null,
    fallbackHit: null,
    needsGovernance: null,
    evidence: Array.from(new Set([
      recommendation,
      ...evidence,
      task.title,
    ].filter((item) => item.trim().length > 0))).slice(0, 4),
    completedAt: null,
  };
}

function routeGovernanceAcceptanceCriteria(action: RouteConfirmationRecheckAdviceItem["action"]) {
  if (action === "switch_route") {
    return [
      "在模型设置中调整首选模型或备用模型，避免继续命中弱路线。",
      "重新跑至少 2 个同类型小样本，记录成功率、质量和备用命中。",
      "治理后再决定是否恢复批量任务。",
    ];
  }
  if (action === "manual_review") {
    return [
      "补齐复检样本的成功率、质量、成本和备用命中说明。",
      "确认是否需要换模型、降级批量或继续观察。",
      "把人工结论写回完成依据。",
    ];
  }
  return [
    "延长观察窗口，暂缓扩大同类型批量。",
    "继续跑至少 2 个小样本并记录成功率、质量和异常。",
    "观察期结束后回到模型设置复核路线。",
  ];
}

function routeGovernanceFollowUpKey(item: RouteConfirmationGovernanceEvidence, action: string) {
  const timestamp = item.completedAt ?? "latest";
  return `model-route-governance-followup:${item.taskType}:${action}:${timestamp}`;
}

function routeGovernanceRecheckKey(item: RouteConfirmationGovernanceEvidence) {
  const timestamp = item.completedAt ?? "latest";
  return `model-route-confirmation-recheck:${item.taskType}:governance:${timestamp}`;
}

function routeGovernanceFollowUpEvidence(item: RouteConfirmationGovernanceEvidence) {
  return Array.from(new Set([item.summary, ...item.evidence, item.completionEvidence])).slice(0, 4);
}

function routeGovernanceFollowUpReviewLatestAt(item: RouteConfirmationGovernanceEvidence) {
  return item.completedAt ?? new Date().toISOString();
}

function routeConfirmationAfterGovernance(
  item: RouteConfirmationGovernanceEvidence,
  confirmations: ModelRouteConfirmationReceipt[] | undefined,
) {
  if (!item.completedAt) return false;
  return Boolean(confirmations?.some((receipt) => (
    receipt.payload.taskType === item.taskType
    && receipt.createdAt > item.completedAt!
  )));
}

function timestampMs(value: string | null) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function latestRouteConfirmationRecheck(
  receipt: ModelRouteConfirmationReceipt,
  rechecks: RouteConfirmationRecheckEvidence[],
) {
  const receiptAt = timestampMs(receipt.createdAt);
  if (receiptAt === null) return null;
  return rechecks
    .filter((item) => {
      const completedAt = timestampMs(item.completedAt);
      return item.taskType === receipt.payload.taskType && completedAt !== null && completedAt > receiptAt;
    })
    .sort((left, right) => (right.completedAt ?? "").localeCompare(left.completedAt ?? ""))[0] ?? null;
}

function flowItemFromTask(task: RouteConfirmationDispatchFlowTask): RouteConfirmationDispatchFlowItem {
  return {
    id: task.dispatchKey,
    label: task.title,
    detail: task.detail,
    actionLabel: task.actionLabel,
    href: task.href,
    priorityScore: task.priorityScore,
    latestAt: task.reviewLatestAt,
  };
}

function flowItemFromReceipt(receipt: ModelRouteConfirmationReceipt): RouteConfirmationDispatchFlowItem {
  return {
    id: receipt.id,
    label: receipt.label,
    detail: receipt.detail,
    actionLabel: receipt.recheck.label,
    href: receipt.href,
    priorityScore: receipt.payload.restoredCandidate || receipt.payload.avoidanceStatus === "applied" ? 86 : 72,
    latestAt: receipt.createdAt,
  };
}

function flowItemFromPassedRecheck(item: RouteConfirmationRecheckEvidence): RouteConfirmationDispatchFlowItem {
  return {
    id: item.id,
    label: `${labelForRoutedTask(item.taskType)}路由已复检通过`,
    detail: item.summary,
    actionLabel: "已确认",
    href: "/settings/models",
    priorityScore: 78,
    latestAt: item.completedAt ?? "",
  };
}

function flowItemFromRecheckAdvice(item: RouteConfirmationRecheckAdviceItem): RouteConfirmationDispatchFlowItem {
  return {
    id: item.id,
    label: item.label,
    detail: item.recommendation,
    actionLabel: item.actionLabel,
    href: "/settings/models",
    priorityScore: item.severity === "blocked" ? 94 : 82,
    latestAt: item.completedAt ?? "",
    governanceAdvice: item,
  };
}

function sortFlowItems(items: RouteConfirmationDispatchFlowItem[]) {
  return [...items].sort((left, right) => (
    right.priorityScore - left.priorityScore || right.latestAt.localeCompare(left.latestAt)
  ));
}

function isRouteConfirmationTask(task: RouteConfirmationDispatchFlowTask) {
  return task.stage === "model_route_confirmation_recheck" || task.stage === "model_route_governance";
}

function latestByCompletedAt<T extends { completedAt: string | null }>(items: T[]) {
  return items.slice().sort((left, right) => (right.completedAt ?? "").localeCompare(left.completedAt ?? ""))[0] ?? null;
}

function latestByTime<T extends { latestAt: string }>(items: T[]) {
  return items.slice().sort((left, right) => right.latestAt.localeCompare(left.latestAt))[0] ?? null;
}

function governanceStepLabel(status: RouteConfirmationGovernanceEvidence["status"]) {
  if (status === "resolved") return "治理完成";
  if (status === "needs_switch") return "仍需换模型";
  if (status === "watch") return "继续观察";
  return "人工复核";
}

function buildRouteConfirmationClosedLoopTrails(
  confirmations: ModelRouteConfirmationReceipt[],
  activeDispatches: RouteConfirmationDispatchFlowTask[],
  governanceEvidence: RouteConfirmationGovernanceEvidence[],
  recheckEvidence: RouteConfirmationRecheckEvidence[],
): RouteConfirmationClosedLoopTrail[] {
  const taskTypes = new Set<RoutedModelTaskType>();
  for (const receipt of confirmations) taskTypes.add(receipt.payload.taskType);
  for (const item of governanceEvidence) taskTypes.add(item.taskType);
  for (const item of recheckEvidence) taskTypes.add(item.taskType);
  for (const task of activeDispatches) {
    const taskType = task.stage === "model_route_governance"
      ? taskTypeFromGovernanceKey(task.dispatchKey)
      : taskTypeFromConfirmationRecheckKey(task.dispatchKey);
    if (taskType) taskTypes.add(taskType);
  }

  return Array.from(taskTypes).flatMap((taskType): RouteConfirmationClosedLoopTrail[] => {
    const label = labelForRoutedTask(taskType);
    const steps: RouteConfirmationClosedLoopStep[] = [];
    const activeGovernance = activeDispatches
      .filter((task) => task.stage === "model_route_governance" && taskTypeFromGovernanceKey(task.dispatchKey) === taskType)
      .map(flowItemFromTask);
    const activeRechecks = activeDispatches
      .filter((task) => task.stage === "model_route_confirmation_recheck" && taskTypeFromConfirmationRecheckKey(task.dispatchKey) === taskType)
      .map(flowItemFromTask);
    const latestGovernance = latestByCompletedAt(governanceEvidence.filter((item) => item.taskType === taskType));
    const latestRecheck = latestByCompletedAt(recheckEvidence.filter((item) => item.taskType === taskType));
    const latestConfirmation = confirmations
      .filter((receipt) => receipt.payload.taskType === taskType)
      .slice()
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null;

    if (latestGovernance) {
      steps.push({
        label: governanceStepLabel(latestGovernance.status),
        detail: latestGovernance.summary,
        latestAt: latestGovernance.completedAt ?? "",
      });
    }
    const activeGovernanceItem = latestByTime(activeGovernance);
    if (activeGovernanceItem && !latestGovernance) {
      steps.push({
        label: "治理派单",
        detail: activeGovernanceItem.detail,
        latestAt: activeGovernanceItem.latestAt,
      });
    }
    if (latestRecheck) {
      steps.push({
        label: latestRecheck.id.includes(":governance:") ? "治理后复检" : "复检样本",
        detail: latestRecheck.summary,
        latestAt: latestRecheck.completedAt ?? "",
      });
      const decision = buildRouteConfirmationRecheckDecision(latestRecheck);
      steps.push({
        label: decision.label,
        detail: decision.detail,
        latestAt: latestRecheck.completedAt ?? "",
      });
    }
    const activeRecheckItem = latestByTime(activeRechecks);
    if (activeRecheckItem && !latestRecheck) {
      steps.push({
        label: activeRecheckItem.id.includes(":governance:") ? "等待治理后复检" : "等待复检",
        detail: activeRecheckItem.detail,
        latestAt: activeRecheckItem.latestAt,
      });
    }
    if (latestConfirmation && !latestRecheck) {
      steps.push({
        label: "已确认路线",
        detail: latestConfirmation.detail,
        latestAt: latestConfirmation.createdAt,
      });
    }
    if (!steps.length) return [];

    const latestStep = latestByTime(steps);
    const status: RouteConfirmationClosedLoopTrail["status"] = latestRecheck
      ? buildRouteConfirmationRecheckDecision(latestRecheck).status
      : activeGovernanceItem || activeRecheckItem
        ? "in_progress"
        : "confirmed";
    return [{
      id: `route-loop:${taskType}:${latestStep?.latestAt ?? ""}`,
      taskType,
      label,
      status,
      summary: `「${label}」${steps.map((step) => step.label).join(" → ")}`,
      latestAt: latestStep?.latestAt ?? "",
      steps: steps.sort((left, right) => left.latestAt.localeCompare(right.latestAt)),
    }];
  }).sort((left, right) => right.latestAt.localeCompare(left.latestAt));
}

function buildRouteConfirmationEmptyGuide(
  confirmations: ModelRouteConfirmationReceipt[],
  dispatches: RouteConfirmationDispatchFlowTask[],
): RouteConfirmationDispatchEmptyGuide | null {
  if (confirmations.length || dispatches.some(isRouteConfirmationTask)) return null;

  return {
    title: "模型路由闭环",
    detail: "先在模型设置里确认写作任务路线，再从总闸门或任务执行里沉淀复检样本；一旦样本变弱，这里会自动显示治理派单和治理后复检。",
    primaryHref: "/settings/models",
    primaryLabel: "配置模型路线",
    secondaryHref: "/gate",
    secondaryLabel: "回总闸门派单",
    steps: [
      {
        label: "确认路线",
        detail: "给正文初稿、审稿、改写等任务确认首选和备用模型。",
      },
      {
        label: "复检样本",
        detail: "用小样本验证成功率、质量、成本和备用命中情况。",
      },
      {
        label: "治理闭环",
        detail: "弱样本自动进入治理派单，处理后再复检到已确认。",
      },
    ],
  };
}

export function buildRouteConfirmationOnboarding({
  routeOptions,
  routes,
  confirmations,
}: {
  routeOptions: RouteConfirmationOnboardingRouteOption[];
  routes: RouteConfirmationOnboardingRoute[];
  confirmations: ModelRouteConfirmationReceipt[];
}): RouteConfirmationOnboarding {
  const routeByTaskType = new Map(routes.map((route) => [route.taskType, route]));
  const confirmedTaskTypes = new Set(confirmations.map((confirmation) => confirmation.payload.taskType));
  const items = routeOptions.flatMap((option): RouteConfirmationOnboardingItem[] => {
    if (!isRoutedModelTaskType(option.taskType)) return [];
    const route = routeByTaskType.get(option.taskType);
    const hasRoute = Boolean(route?.primaryProviderConfigId);
    const status: RouteConfirmationOnboardingItem["status"] = confirmedTaskTypes.has(option.taskType)
      ? "confirmed"
      : hasRoute
        ? "ready_to_confirm"
        : "missing_route";
    const actionLabel = status === "confirmed"
      ? "已确认"
      : status === "ready_to_confirm"
        ? "确认并生成复检派单"
        : "先配置路线";
    const detail = status === "confirmed"
      ? "这条写作任务路线已有确认记录，后续看复检样本是否稳定。"
      : status === "ready_to_confirm"
        ? "首选模型已配置，可以确认路线并进入小样本复检。"
        : "还没有首选模型，先选择首选和备用模型。";
    return [{
      taskType: option.taskType,
      label: option.label,
      description: option.description ?? "",
      status,
      actionLabel,
      detail,
    }];
  });
  const readyItems = items.filter((item) => item.status === "ready_to_confirm");

  return {
    title: "首轮路由确认",
    detail: "先把核心写作任务的首选和备用模型确认下来，再生成复检派单，避免后面批量写作时靠默认模型乱跑。",
    summary: {
      total: items.length,
      confirmed: items.filter((item) => item.status === "confirmed").length,
      readyToConfirm: readyItems.length,
      missingRoute: items.filter((item) => item.status === "missing_route").length,
    },
    nextAction: readyItems[0] ?? items.find((item) => item.status === "missing_route") ?? null,
    items,
  };
}

export function buildModelRouteConfirmationReceipt(input: ModelRouteConfirmationInput): ModelRouteConfirmationReceipt {
  const taskLabel = labelForRoutedTask(input.taskType);
  const source = input.source ?? "manual";
  const createdAt = asIsoString(input.createdAt);
  const primaryProviderName = normalizeProviderName(input.primaryProviderName, "自动选择");
  const fallbackProviderName = normalizeProviderName(input.fallbackProviderName, "无备用");
  const restoredCandidate = includesRestoredSignal(input);
  const reason = input.reason?.trim() || null;
  const sourceLabel = sourceLabels[source];
  const restoredCopy = restoredCandidate ? "复测通过恢复候选。" : "";
  const avoidanceCopy = input.avoidanceStatus === "applied" ? "已带入避坑规则。" : "";

  return {
    id: `model-route:${input.taskType}:${createdAt}`,
    actionId: `model-route:${input.taskType}:confirm`,
    platformId: "model-routing",
    platformName: "模型路由",
    label: `${taskLabel}路由已确认`,
    detail: [
      `来源：${sourceLabel}`,
      `首选：${primaryProviderName}`,
      `备用：${fallbackProviderName}`,
      reason ? `依据：${reason}` : null,
    ].filter(Boolean).join("；"),
    href: "/settings/models",
    status: "succeeded",
    message: `已确认${taskLabel}模型路由。${restoredCopy}${avoidanceCopy}`.trim(),
    executionType: "model_route",
    succeededCount: 1,
    failedCount: 0,
    recheck: {
      status: "ready",
      label: "复检模型路由",
      detail: "下一批任务后复看成功率、质量、成本和备用命中。",
      action: "查看模型设置",
    },
    payload: {
      taskType: input.taskType,
      source,
      primaryProviderName,
      fallbackProviderName: fallbackProviderName === "无备用" ? null : fallbackProviderName,
      reason,
      routeStatus: input.routeStatus ?? null,
      avoidanceStatus: input.avoidanceStatus ?? null,
      restoredCandidate,
    },
    createdAt,
  };
}

export function buildModelRouteConfirmationDispatch(receipt: ModelRouteConfirmationReceipt): ModelRouteConfirmationDispatch {
  const taskLabel = labelForRoutedTask(receipt.payload.taskType);
  const timestamp = receipt.createdAt;
  const fallbackCopy = receipt.payload.fallbackProviderName ? `，备用 ${receipt.payload.fallbackProviderName}` : "，暂无备用";
  const restoredCopy = receipt.payload.restoredCandidate ? "这条路线来自复测恢复候选，必须重点看回归质量。" : "确认后先用小样本复看真实效果。";

  return {
    id: `model-route-confirmation-recheck:${receipt.payload.taskType}:${timestamp}`,
    dispatchKey: `model-route-confirmation-recheck:${receipt.payload.taskType}:${timestamp}`,
    platformId: "model-routing",
    platformName: "模型路由",
    stage: "model_route_confirmation_recheck",
    state: "assigned",
    priorityScore: receipt.payload.restoredCandidate || receipt.payload.avoidanceStatus === "applied" ? 86 : 72,
    ownerRole: "模型治理",
    title: `复检${taskLabel}路由确认`,
    detail: `${taskLabel}已切到首选 ${receipt.payload.primaryProviderName}${fallbackCopy}。${restoredCopy}`,
    dueLabel: "下一批任务后",
    actionLabel: receipt.recheck.label,
    href: receipt.href,
    acceptanceCriteria: [
      "至少完成 2 个同类型小样本任务。",
      "复看成功率、平均质量、单次成功成本和备用命中情况。",
      "如果成功率低于 80% 或质量低于 75，回到模型设置调整路线。",
    ],
    evidence: [
      receipt.message,
      receipt.detail,
      receipt.payload.reason ?? receipt.recheck.detail,
    ].filter((item): item is string => Boolean(item)),
    reviewLatestAt: timestamp,
  };
}

export function modelRouteConfirmationReceiptFromAudit(record: ModelRouteConfirmationAuditRecord): ModelRouteConfirmationReceipt | null {
  if (record.executionType !== "model_route") return null;
  const payload = parsePayload(record.payload);
  if (!payload || !isRoutedModelTaskType(String(payload.taskType ?? ""))) return null;
  const createdAt = asIsoString(record.createdAt);

  return {
    id: record.receiptId,
    actionId: record.actionId,
    platformId: "model-routing",
    platformName: record.platformName || "模型路由",
    label: record.label,
    detail: record.detail,
    href: record.href || "/settings/models",
    status: "succeeded",
    message: record.message,
    executionType: "model_route",
    succeededCount: record.succeededCount,
    failedCount: record.failedCount,
    recheck: {
      status: "ready",
      label: record.recheckLabel || "复检模型路由",
      detail: record.recheckDetail || "下一批任务后复看成功率、质量、成本和备用命中。",
      action: record.recheckAction || "查看模型设置",
    },
    payload: {
      taskType: String(payload.taskType) as RoutedModelTaskType,
      source: confirmationSource(payload.source),
      primaryProviderName: stringOrNull(payload.primaryProviderName) ?? "自动选择",
      fallbackProviderName: stringOrNull(payload.fallbackProviderName),
      reason: stringOrNull(payload.reason),
      routeStatus: routeStatus(payload.routeStatus),
      avoidanceStatus: avoidanceStatus(payload.avoidanceStatus),
      restoredCandidate: Boolean(payload.restoredCandidate),
    },
    createdAt,
  };
}

export function buildRouteConfirmationHistory(
  receipts: ModelRouteConfirmationReceipt[],
  rechecks: RouteConfirmationRecheckEvidence[],
): RouteConfirmationHistoryItem[] {
  return receipts.map((receipt): RouteConfirmationHistoryItem => {
    const recheck = latestRouteConfirmationRecheck(receipt, rechecks);
    if (!recheck) {
      return {
        id: receipt.id,
        taskType: receipt.payload.taskType,
        label: receipt.label,
        detail: receipt.detail,
        message: receipt.message,
        status: receipt.status,
        createdAt: receipt.createdAt,
        recheckStatus: "waiting_recheck",
        recheckLabel: "等待小样本复检",
        recheckDetail: `下一批同类型任务后，复看${labelForRoutedTask(receipt.payload.taskType)}的成功率、质量、成本和备用命中。`,
      };
    }
    if (recheck.recommendedAction === "keep") {
      return {
        id: receipt.id,
        taskType: receipt.payload.taskType,
        label: receipt.label,
        detail: receipt.detail,
        message: receipt.message,
        status: receipt.status,
        createdAt: receipt.createdAt,
        recheckStatus: "recheck_passed",
        recheckLabel: "已复检通过",
        recheckDetail: recheck.summary,
      };
    }
    return {
      id: receipt.id,
      taskType: receipt.payload.taskType,
      label: receipt.label,
      detail: receipt.detail,
      message: receipt.message,
      status: receipt.status,
      createdAt: receipt.createdAt,
      recheckStatus: "recheck_needs_governance",
      recheckLabel: "已复检需治理",
      recheckDetail: recheck.summary,
    };
  }).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function buildRouteConfirmationDispatchFlow(
  confirmations: ModelRouteConfirmationReceipt[],
  dispatches: RouteConfirmationDispatchFlowTask[],
): RouteConfirmationDispatchFlow {
  const modelRouteDispatches = dispatches.filter(isRouteConfirmationTask);
  const activeDispatches = modelRouteDispatches.filter((task) => task.state !== "completed");
  const waitingRecheck = activeDispatches.filter((task) => task.stage === "model_route_confirmation_recheck");
  const needsGovernance = activeDispatches.filter((task) => task.stage === "model_route_governance");
  const completed = modelRouteDispatches.filter((task) => task.state === "completed");
  const completedRecheckTasks: RouteConfirmationRecheckDispatchTask[] = completed.flatMap((task) => {
    if (
      task.stage !== "model_route_confirmation_recheck"
      || typeof task.completionEvidence !== "string"
      || !task.completionEvidence.trim()
    ) {
      return [];
    }
    return [{
      dispatchKey: task.dispatchKey,
      stage: task.stage,
      state: task.state,
      completionEvidence: task.completionEvidence,
      evidence: task.evidence,
      completedAt: task.completedAt,
    }];
  });
  const completedGovernanceTasks: RouteConfirmationGovernanceDispatchTask[] = completed.flatMap((task) => {
    if (
      task.stage !== "model_route_governance"
      || typeof task.completionEvidence !== "string"
      || !task.completionEvidence.trim()
    ) {
      return [];
    }
    return [{
      dispatchKey: task.dispatchKey,
      stage: task.stage,
      state: task.state,
      completionEvidence: task.completionEvidence,
      evidence: task.evidence,
      completedAt: task.completedAt,
    }];
  });
  const completedRechecks = buildRouteConfirmationRecheckEvidenceFromDispatchTasks(completedRecheckTasks);
  const completedGovernance = buildRouteConfirmationGovernanceEvidenceFromDispatchTasks(completedGovernanceTasks);
  const passedRechecks = completedRechecks.filter((item) => item.recommendedAction === "keep");
  const recheckAdvice = buildRouteConfirmationRecheckAdvice(completedRechecks).items;
  const needsGovernanceItems = [
    ...needsGovernance.map(flowItemFromTask),
    ...recheckAdvice.map(flowItemFromRecheckAdvice),
  ];
  const confirmedItems = [
    ...confirmations.map(flowItemFromReceipt),
    ...passedRechecks.map(flowItemFromPassedRecheck),
  ];
  const lanes: RouteConfirmationDispatchFlowLane[] = [
    {
      id: "needs_governance",
      label: "需治理",
      count: needsGovernanceItems.length,
      items: sortFlowItems(needsGovernanceItems).slice(0, 4),
    },
    {
      id: "waiting_recheck",
      label: "待复检",
      count: waitingRecheck.length,
      items: sortFlowItems(waitingRecheck.map(flowItemFromTask)).slice(0, 4),
    },
    {
      id: "confirmed",
      label: "已确认",
      count: confirmedItems.length,
      items: sortFlowItems(confirmedItems).slice(0, 4),
    },
    {
      id: "completed",
      label: "已完成",
      count: completed.length,
      items: sortFlowItems(completed.map(flowItemFromTask)).slice(0, 4),
    },
  ];

  return {
    summary: {
      confirmed: confirmedItems.length,
      dispatched: activeDispatches.length,
      waitingRecheck: waitingRecheck.length,
      needsGovernance: needsGovernanceItems.length,
      completed: completed.length,
    },
    lanes,
    trails: buildRouteConfirmationClosedLoopTrails(confirmations, activeDispatches, completedGovernance, completedRechecks),
    emptyGuide: buildRouteConfirmationEmptyGuide(confirmations, dispatches),
  };
}

export function filterRouteConfirmationDispatchTasks<T extends RouteConfirmationDispatchFlowTask>(
  tasks: T[],
  filter: RouteConfirmationDispatchTaskFilter,
): T[] {
  if (filter === "all") return tasks;
  if (filter === "needs_governance") {
    return tasks.filter((task) => task.stage === "model_route_governance" && task.state !== "completed");
  }
  if (filter === "waiting_recheck") {
    return tasks.filter((task) => task.stage === "model_route_confirmation_recheck" && task.state !== "completed");
  }
  return tasks.filter((task) => isRouteConfirmationTask(task) && task.state === "completed");
}

export function buildRouteDispatchCompletionTemplate(task: RouteDispatchCompletionTemplateTask) {
  if (task.stage === "model_route_governance") {
    return [
      `${task.title}`,
      `处理动作：${task.actionLabel}`,
      "新首选模型：",
      "新备用模型：",
      "复跑样本数：2",
      "成功率：",
      "质量：",
      "备用命中：未命中备用 / 仍命中备用",
      "治理结论：已治理完成 / 继续观察 / 仍需换模型",
    ].join("\n");
  }
  if (task.stage === "model_route_confirmation_recheck") {
    return [
      `${task.title}`,
      "样本数：2",
      "成功率：",
      "质量：",
      "成本：",
      "备用命中：未命中备用 / 命中备用",
      "是否需要治理：否 / 是，原因：",
    ].join("\n");
  }
  return null;
}

function valueAfterCompletionLabel(label: string, text: string) {
  const lineMatch = text.match(new RegExp(`^\\s*${label}\\s*[:：]\\s*(.+?)\\s*$`, "m"));
  if (lineMatch?.[1]) return lineMatch[1].trim();
  const inlineMatch = text.match(new RegExp(`${label}\\s*[:：]\\s*([^，,；;。\\n]+)`));
  return inlineMatch?.[1]?.trim() ?? null;
}

function hasConcreteCompletionValue(value: string | null) {
  if (!value) return false;
  if (value.includes("/")) return false;
  return !["待填", "未填", "无"].includes(value);
}

function hasConcreteFallbackDecision(text: string) {
  const labeledValue = valueAfterCompletionLabel("备用命中", text);
  if (labeledValue !== null) {
    return hasConcreteCompletionValue(labeledValue)
      && /(未命中备用|未走备用|未使用备用|命中备用|走备用|使用备用)/.test(labeledValue);
  }
  const normalized = text.replace(/\s+/g, "");
  return hasFallbackSignal(normalized)
    || normalized.includes("未命中备用")
    || normalized.includes("未走备用")
    || normalized.includes("未使用备用");
}

function hasRouteRecheckDecision(text: string) {
  const value = valueAfterCompletionLabel("是否需要治理", text);
  return hasConcreteCompletionValue(value);
}

function hasGovernanceConclusion(text: string) {
  const value = valueAfterCompletionLabel("治理结论", text);
  if (value !== null) {
    return hasConcreteCompletionValue(value)
      && /(已治理完成|继续观察|仍需换模型|治理完成)/.test(value);
  }
  return /(已治理完成|继续观察|仍需换模型|治理完成)/.test(text.replace(/\s+/g, ""));
}

function parseRouteDispatchSampleCount(text: string) {
  return numericCountAfter("复跑样本数", text)
    ?? numericCountAfter("样本数", text)
    ?? numericCountAfter("完成", text)
    ?? numericCountAfter("复跑", text);
}

function parseRouteDispatchFallback(text: string) {
  const labeledValue = valueAfterCompletionLabel("备用命中", text);
  const source = hasConcreteCompletionValue(labeledValue) ? labeledValue : text;
  if (!source) {
    return {
      fallbackHit: null,
      fallbackLabel: null,
    };
  }
  const normalized = source.replace(/\s+/g, "");
  const fallbackHit = normalized.includes("未命中备用") || normalized.includes("未走备用") || normalized.includes("未使用备用")
    ? false
    : hasFallbackSignal(normalized)
      ? true
      : null;
  return {
    fallbackHit,
    fallbackLabel: fallbackHit === null ? null : source.trim(),
  };
}

function parseRouteRecheckNeedsGovernance(text: string) {
  const labeledValue = valueAfterCompletionLabel("是否需要治理", text);
  const source = hasConcreteCompletionValue(labeledValue) ? labeledValue : text;
  if (!source) return null;
  const normalized = source.replace(/\s+/g, "");
  if (/^(否|不|无需|不用|暂不)/.test(normalized) || normalized.includes("不需要治理") || normalized.includes("无需治理")) return false;
  if (/^(是|需要)/.test(normalized) || normalized.includes("需要治理") || normalized.includes("仍需治理")) return true;
  return null;
}

function parseRouteGovernanceConclusion(text: string): RouteDispatchCompletionGovernanceConclusion | null {
  const labeledValue = valueAfterCompletionLabel("治理结论", text);
  const source = hasConcreteCompletionValue(labeledValue) ? labeledValue : text;
  if (!source) return null;
  const normalized = source.replace(/\s+/g, "");
  if (normalized.includes("仍需换模型") || normalized.includes("换模型")) return "needs_switch";
  if (normalized.includes("继续观察") || normalized.includes("延长观察") || normalized.includes("观察期")) return "watch";
  if (normalized.includes("已治理完成") || normalized.includes("治理完成") || normalized.includes("已治理")) return "resolved";
  return null;
}

export function parseRouteDispatchCompletionEvidence(
  task: RouteDispatchCompletionTemplateTask,
  completionEvidence: string,
): RouteDispatchCompletionRecord | null {
  if (task.stage !== "model_route_governance" && task.stage !== "model_route_confirmation_recheck") return null;
  const fallback = parseRouteDispatchFallback(completionEvidence);
  return {
    kind: task.stage === "model_route_governance" ? "route_governance" : "route_recheck",
    successRatePercent: numericPercentAfter("成功率", completionEvidence),
    qualityScore: numericPercentAfter("质量", completionEvidence),
    sampleCount: parseRouteDispatchSampleCount(completionEvidence),
    cost: valueAfterCompletionLabel("成本", completionEvidence),
    fallbackHit: fallback.fallbackHit,
    fallbackLabel: fallback.fallbackLabel,
    needsGovernance: task.stage === "model_route_confirmation_recheck" ? parseRouteRecheckNeedsGovernance(completionEvidence) : null,
    governanceConclusion: task.stage === "model_route_governance" ? parseRouteGovernanceConclusion(completionEvidence) : null,
    primaryProviderName: hasConcreteCompletionValue(valueAfterCompletionLabel("新首选模型", completionEvidence))
      ? valueAfterCompletionLabel("新首选模型", completionEvidence)
      : null,
    fallbackProviderName: hasConcreteCompletionValue(valueAfterCompletionLabel("新备用模型", completionEvidence))
      ? valueAfterCompletionLabel("新备用模型", completionEvidence)
      : null,
  };
}

export function reviewRouteDispatchCompletionEvidence(
  task: RouteDispatchCompletionTemplateTask,
  completionEvidence: string,
) {
  if (task.stage !== "model_route_governance" && task.stage !== "model_route_confirmation_recheck") return null;
  if (completionEvidence.trim().length < 8) return "完成前请写清楚完成依据，至少 8 个字。";

  const missing: string[] = [];
  if (numericPercentAfter("成功率", completionEvidence) === null) missing.push("成功率");
  if (numericPercentAfter("质量", completionEvidence) === null) missing.push("质量");
  if (!hasConcreteFallbackDecision(completionEvidence)) missing.push("备用命中");
  if (task.stage === "model_route_confirmation_recheck" && !hasRouteRecheckDecision(completionEvidence)) {
    missing.push("是否需要治理");
  }
  if (task.stage === "model_route_governance" && !hasGovernanceConclusion(completionEvidence)) {
    missing.push("治理结论");
  }

  return missing.length ? `请补齐模型路由完成依据：${missing.join("、")}。` : null;
}

export function buildRouteConfirmationRecheckEvidenceFromDispatchTasks(
  dispatches: RouteConfirmationRecheckDispatchTask[],
): RouteConfirmationRecheckEvidence[] {
  return dispatches
    .filter((dispatch) => (
      dispatch.stage === "model_route_confirmation_recheck"
      && dispatch.state === "completed"
      && dispatch.completionEvidence.trim()
    ))
    .flatMap((dispatch): RouteConfirmationRecheckEvidence[] => {
      const taskType = taskTypeFromConfirmationRecheckKey(dispatch.dispatchKey);
      if (!taskType) return [];
      const decision = classifyConfirmationRecheck(dispatch.completionEvidence);
      return [{
        id: `${dispatch.dispatchKey}:evidence`,
        taskType,
        ...decision,
        completionEvidence: dispatch.completionEvidence,
        evidence: Array.from(new Set([...evidenceList(dispatch.evidence), dispatch.completionEvidence])),
        completedAt: completedAtIso(dispatch.completedAt),
      }];
    })
    .sort((left, right) => (right.completedAt ?? "").localeCompare(left.completedAt ?? ""));
}

export function buildRouteConfirmationRecheckDecision(
  evidence: RouteConfirmationRecheckEvidence,
): RouteConfirmationRecheckDecision {
  const label = labelForRoutedTask(evidence.taskType);
  if (evidence.recommendedAction === "keep") {
    return {
      status: "confirmed",
      label: "已确认",
      detail: `「${label}」复检通过，${evidence.summary}`,
      nextActionLabel: "保持当前路线",
    };
  }
  if (evidence.recommendedAction === "manual_review") {
    return {
      status: "manual_review",
      label: "需人工复核",
      detail: `「${label}」复检证据不足，${evidence.summary}`,
      nextActionLabel: "人工补齐证据",
    };
  }
  return {
    status: "needs_governance",
    label: "需治理",
    detail: `「${label}」复检未达标，${evidence.summary}`,
    nextActionLabel: "生成治理派单",
  };
}

export function buildRouteConfirmationGovernanceEvidenceFromDispatchTasks(
  dispatches: RouteConfirmationGovernanceDispatchTask[],
): RouteConfirmationGovernanceEvidence[] {
  return dispatches
    .filter((dispatch) => (
      dispatch.stage === "model_route_governance"
      && dispatch.state === "completed"
      && dispatch.completionEvidence.trim()
    ))
    .flatMap((dispatch): RouteConfirmationGovernanceEvidence[] => {
      const taskType = taskTypeFromGovernanceKey(dispatch.dispatchKey);
      if (!taskType) return [];
      const decision = classifyGovernanceEvidence(taskType, dispatch.completionEvidence);
      return [{
        id: `${dispatch.dispatchKey}:governance`,
        taskType,
        ...decision,
        completionEvidence: dispatch.completionEvidence,
        evidence: Array.from(new Set([...evidenceList(dispatch.evidence), dispatch.completionEvidence])),
        completedAt: completedAtIso(dispatch.completedAt),
      }];
    })
    .sort((left, right) => (right.completedAt ?? "").localeCompare(left.completedAt ?? ""));
}

export function buildRouteConfirmationGovernanceFollowUpDispatches(
  evidence: RouteConfirmationGovernanceEvidence[],
  options: RouteConfirmationGovernanceFollowUpOptions = {},
): RouteConfirmationGovernanceFollowUpDispatch[] {
  return evidence.flatMap((item): RouteConfirmationGovernanceFollowUpDispatch[] => {
    const label = labelForRoutedTask(item.taskType);
    const reviewLatestAt = routeGovernanceFollowUpReviewLatestAt(item);
    const evidenceList = routeGovernanceFollowUpEvidence(item);
    if (item.status === "needs_switch") {
      if (routeConfirmationAfterGovernance(item, options.routeConfirmations)) return [];
      const dispatchKey = routeGovernanceFollowUpKey(item, "adjust_route");
      return [{
        id: dispatchKey,
        dispatchKey,
        platformId: "model-routing",
        platformName: "模型路由",
        stage: "model_route_governance",
        state: "assigned",
        priorityScore: 94,
        ownerRole: "模型治理",
        title: `调整${label}模型路由`,
        detail: `${item.summary} 先调整首选或备用模型，暂缓扩大同类型批量。`,
        dueLabel: "今天处理",
        actionLabel: "调整模型路由",
        href: "/settings/models",
        acceptanceCriteria: [
          "重新选择首选模型或备用模型，避开仍需换模型的路线。",
          "保存新路由后生成确认记录。",
          "下一批同类型任务先用小样本复检，不直接扩大批量。",
        ],
        evidence: evidenceList,
        reviewLatestAt,
      }];
    }
    if (item.status === "resolved") {
      const dispatchKey = routeGovernanceRecheckKey(item);
      return [{
        id: dispatchKey,
        dispatchKey,
        platformId: "model-routing",
        platformName: "模型路由",
        stage: "model_route_confirmation_recheck",
        state: "assigned",
        priorityScore: 74,
        ownerRole: "模型治理",
        title: `复检${label}治理后小样本`,
        detail: `${item.summary} 下一批同类型任务后复看成功率、质量、成本和备用命中。`,
        dueLabel: "下一批任务后",
        actionLabel: "复检小样本",
        href: "/settings/models",
        acceptanceCriteria: [
          "至少完成 2 个同类型小样本任务。",
          "复看成功率、平均质量、单次成功成本和备用命中情况。",
          "如果成功率低于 80% 或质量低于 75，回到模型设置调整路线。",
        ],
        evidence: evidenceList,
        reviewLatestAt,
      }];
    }
    return [];
  }).sort((left, right) => right.priorityScore - left.priorityScore || right.reviewLatestAt.localeCompare(left.reviewLatestAt));
}

export function buildRouteConfirmationGovernanceAutoFollowUpDispatches(
  evidence: RouteConfirmationGovernanceEvidence[],
  options: RouteConfirmationGovernanceFollowUpOptions & { existingDispatchKeys?: Iterable<string> } = {},
): RouteConfirmationGovernanceFollowUpDispatch[] {
  const existingDispatchKeys = new Set(options.existingDispatchKeys ?? []);
  return buildRouteConfirmationGovernanceFollowUpDispatches(evidence, options)
    .filter((item) => !existingDispatchKeys.has(item.dispatchKey));
}

export function buildRouteConfirmationRecheckAdvice(
  evidence: RouteConfirmationRecheckEvidence[],
): RouteConfirmationRecheckAdvice {
  const items = evidence.flatMap((item): RouteConfirmationRecheckAdviceItem[] => {
    const normalized = item.completionEvidence.replace(/\s+/g, "");
    const hasFallback = hasFallbackSignal(normalized);
    const hasFailure = hasFailureSignal(normalized);
    const action = routeRecheckAction(item, hasFallback, hasFailure);
    if (!action) return [];
    return [{
      id: `${item.id}:advice`,
      taskType: item.taskType,
      label: labelForRoutedTask(item.taskType),
      severity: routeRecheckSeverity(item, hasFallback, hasFailure),
      ...action,
      sampleCount: item.sampleCount,
      successRatePercent: item.successRatePercent,
      qualityScore: item.qualityScore,
      cost: item.cost,
      fallbackHit: item.fallbackHit,
      needsGovernance: item.needsGovernance,
      evidence: buildAdviceEvidence(item),
      completedAt: item.completedAt,
    }];
  }).sort((left, right) => {
    if (left.severity !== right.severity) return left.severity === "blocked" ? -1 : 1;
    return (right.completedAt ?? "").localeCompare(left.completedAt ?? "");
  });

  return {
    summary: {
      total: items.length,
      switchRoute: items.filter((item) => item.action === "switch_route").length,
      extendWatch: items.filter((item) => item.action === "extend_watch").length,
      manualReview: items.filter((item) => item.action === "manual_review").length,
    },
    items,
  };
}

export function buildRouteConfirmationRecheckGovernanceAction(
  advice: RouteConfirmationRecheckAdviceItem,
  options: { createdAt?: string | Date } = {},
): RouteConfirmationRecheckGovernanceAction {
  const createdAt = asIsoString(options.createdAt);
  const dispatchKey = `model-route-governance:${advice.taskType}:${advice.action}:${createdAt}`;
  const priorityScore = advice.severity === "blocked" ? 88 : 76;
  const payload = {
    adviceId: advice.id,
    taskType: advice.taskType,
    action: advice.action,
    severity: advice.severity,
    recommendation: advice.recommendation,
    evidence: advice.evidence,
  };
  const receipt: GateActionReceipt = {
    id: `${dispatchKey}:receipt`,
    actionId: `model-route-governance:${advice.taskType}:${advice.action}`,
    label: `${advice.label}路由治理已派单`,
    detail: `动作：${advice.actionLabel}；建议：${advice.recommendation}`,
    href: "/settings/models",
    status: "succeeded",
    message: `已为「${advice.label}」生成模型路由治理派单：${advice.actionLabel}。`,
    executionType: "model_route",
    succeededCount: 1,
    failedCount: 0,
    taskId: null,
    platformId: "model-routing",
    platformName: "模型路由",
    recheck: {
      status: "ready",
      label: "查看治理派单",
      detail: "到分发中心跟进模型路由治理任务。",
      actionLabel: "打开分发中心",
    },
    createdAt,
  };
  const dispatch: GatePlatformGrowthDispatchItem & { dispatchKey: string } = {
    id: dispatchKey,
    dispatchKey,
    platformId: "model-routing",
    platformName: "模型路由",
    stage: "model_route_governance",
    state: "assigned",
    priorityScore,
    ownerRole: "模型治理",
    title: `处理${advice.label}路由复检问题`,
    detail: advice.recommendation,
    dueLabel: advice.severity === "blocked" ? "今天处理" : "观察期内",
    actionLabel: advice.actionLabel,
    href: "/settings/models",
    acceptanceCriteria: routeGovernanceAcceptanceCriteria(advice.action),
    evidence: advice.evidence,
    reviewLatestAt: createdAt,
  };

  return { receipt, dispatch, payload };
}

export function buildRouteConfirmationRecheckAutoGovernanceAction(
  evidence: RouteConfirmationRecheckEvidence,
  options: { createdAt?: string | Date } = {},
): RouteConfirmationRecheckGovernanceAction | null {
  const decision = buildRouteConfirmationRecheckDecision(evidence);
  if (decision.status !== "needs_governance") return null;
  const advice = buildRouteConfirmationRecheckAdvice([evidence]).items[0];
  return advice ? buildRouteConfirmationRecheckGovernanceAction(advice, options) : null;
}
