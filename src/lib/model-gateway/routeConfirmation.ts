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
