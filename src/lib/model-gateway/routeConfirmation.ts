import { labelForRoutedTask, type RoutedModelTaskType } from "./taskRouting.ts";

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
