import { isRoutedModelTaskType, labelForRoutedTask, type RoutedModelTaskType } from "./taskRouting.ts";

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

function classifyConfirmationRecheck(completionEvidence: string) {
  const normalized = completionEvidence.replace(/\s+/g, "");
  const successRatePercent = numericPercentAfter("成功率", completionEvidence);
  const qualityScore = numericPercentAfter("质量", completionEvidence);
  const hasNoFallback = normalized.includes("未命中备用") || normalized.includes("未走备用") || normalized.includes("未使用备用");
  const hasFallback = !hasNoFallback && (normalized.includes("命中备用") || normalized.includes("走备用") || normalized.includes("使用备用"));
  const hasFailure = /(失败|超时|报错|异常|不可用|JSON不稳定|格式错误)/.test(normalized);
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
