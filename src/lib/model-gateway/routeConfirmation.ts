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
}

export interface RouteConfirmationDispatchFlowLane {
  id: RouteConfirmationDispatchFlowLaneId;
  label: string;
  count: number;
  items: RouteConfirmationDispatchFlowItem[];
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
  recommendedAction: "keep" | "watch" | "manual_review";
  summary: string;
  completionEvidence: string;
  evidence: string[];
  completedAt: string | null;
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
  const match = dispatchKey.match(/^model-route-confirmation-recheck:([^:]+):/);
  const taskType = match?.[1] ?? "";
  return isRoutedModelTaskType(taskType) ? taskType : null;
}

function taskTypeFromGovernanceKey(dispatchKey: string) {
  const match = dispatchKey.match(/^model-route-governance:([^:]+):/);
  const taskType = match?.[1] ?? "";
  return isRoutedModelTaskType(taskType) ? taskType : null;
}

function classifyConfirmationRecheck(completionEvidence: string) {
  const normalized = completionEvidence.replace(/\s+/g, "");
  const successRatePercent = numericPercentAfter("成功率", completionEvidence);
  const qualityScore = numericPercentAfter("质量", completionEvidence);
  const hasFallback = hasFallbackSignal(normalized);
  const hasFailure = hasFailureSignal(normalized);
  const keep = (successRatePercent ?? 0) >= 90 && (qualityScore ?? 0) >= 80 && !hasFailure && !hasFallback;
  const watch = hasFailure || hasFallback || (successRatePercent !== null && successRatePercent < 80) || (qualityScore !== null && qualityScore < 70);
  const recommendedAction: RouteConfirmationRecheckEvidence["recommendedAction"] = keep ? "keep" : watch ? "watch" : "manual_review";
  const summary = recommendedAction === "keep"
    ? `最近路由复检通过：成功率 ${successRatePercent ?? "未填"}%，质量 ${qualityScore ?? "未填"}，可继续沿用。`
    : recommendedAction === "watch"
      ? `最近路由复检需观察：成功率 ${successRatePercent ?? "未填"}%，质量 ${qualityScore ?? "未填"}${hasFallback ? "，仍命中备用路线" : ""}。`
      : "最近路由复检证据不足，需要人工复核成功率、质量和备用命中。";

  return {
    successRatePercent,
    qualityScore,
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

function sortFlowItems(items: RouteConfirmationDispatchFlowItem[]) {
  return [...items].sort((left, right) => (
    right.priorityScore - left.priorityScore || right.latestAt.localeCompare(left.latestAt)
  ));
}

function isRouteConfirmationTask(task: RouteConfirmationDispatchFlowTask) {
  return task.stage === "model_route_confirmation_recheck" || task.stage === "model_route_governance";
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
  const lanes: RouteConfirmationDispatchFlowLane[] = [
    {
      id: "needs_governance",
      label: "需治理",
      count: needsGovernance.length,
      items: sortFlowItems(needsGovernance.map(flowItemFromTask)).slice(0, 4),
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
      count: confirmations.length,
      items: sortFlowItems(confirmations.map(flowItemFromReceipt)).slice(0, 4),
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
      confirmed: confirmations.length,
      dispatched: activeDispatches.length,
      waitingRecheck: waitingRecheck.length,
      needsGovernance: needsGovernance.length,
      completed: completed.length,
    },
    lanes,
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
  const match = text.match(new RegExp(`^\\s*${label}\\s*[:：]\\s*(.+?)\\s*$`, "m"));
  return match?.[1]?.trim() ?? null;
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
