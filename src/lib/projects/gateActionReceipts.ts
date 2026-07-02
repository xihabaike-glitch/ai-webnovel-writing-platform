import type { PrePublishGateAction, PrePublishGateActionExecution, PrePublishGateStrategyPlatform } from "./prePublishGate.ts";

export const gateActionReceiptStorageKey = "ai-webnovel-gate-action-receipts";
export const gateActionReceiptUpdatedEvent = "ai-webnovel-gate-action-receipts-updated";
export const defaultGateActionReceiptLimit = 20;

export type GateActionReceiptExecutionType = PrePublishGateActionExecution["type"] | "platform_strategy" | "manual";
export type GateActionReceiptStatusFilter = "all" | GateActionReceipt["status"];
export type GateActionReceiptExecutionFilter = "all" | GateActionReceiptExecutionType;

export interface GateActionReceiptPayload {
  message?: string;
  error?: string;
  variants?: unknown[];
  results?: Array<{
    status?: string;
    taskId?: string;
  }>;
  result?: {
    status?: string;
    taskId?: string;
  };
  task?: {
    id?: string;
    status?: string;
  };
  routeEffectSummary?: {
    successRatePercent: number;
    knownCostUsd: number;
    averageQualityScore: number | null;
  };
}

export interface GateActionReceipt {
  id: string;
  actionId: string;
  label: string;
  detail: string;
  href: string;
  status: "succeeded" | "failed";
  message: string;
  executionType: GateActionReceiptExecutionType;
  succeededCount: number;
  failedCount: number;
  taskId: string | null;
  platformId?: string;
  platformName?: string;
  recheck: {
    status: "ready" | "blocked";
    label: string;
    detail: string;
    actionLabel: string;
  };
  createdAt: string;
}

export interface GateActionReceiptFilters {
  status?: GateActionReceiptStatusFilter;
  executionType?: GateActionReceiptExecutionFilter;
  platformId?: string;
}

export interface GateActionReceiptSummary {
  total: number;
  succeeded: number;
  failed: number;
  readyRecheck: number;
  blockedRecheck: number;
  succeededActions: number;
  failedActions: number;
  platforms: Array<{
    id: string;
    name: string;
    total: number;
    failed: number;
  }>;
  executionTypes: Array<{
    type: GateActionReceiptExecutionType;
    total: number;
    failed: number;
  }>;
}

export interface GatePlatformStrategyReceiptPayload {
  message?: string;
  error?: string;
  variants?: unknown[];
  results?: unknown[];
  task?: {
    id?: string;
    status?: string;
  };
}

function countStatus(payload: GateActionReceiptPayload) {
  const results = payload.results?.length ? payload.results : payload.result ? [payload.result] : [];
  return {
    succeededCount: results.filter((result) => result.status === "succeeded").length,
    failedCount: results.filter((result) => result.status === "failed").length,
  };
}

function receiptMessage(input: {
  action: PrePublishGateAction;
  payload: GateActionReceiptPayload;
  status: GateActionReceipt["status"];
  fallbackError?: string;
}) {
  if (input.status === "failed") return input.payload.error ?? input.fallbackError ?? "动作执行失败。";
  if (input.payload.message) return input.payload.message;
  const executionType = input.action.execution?.type;

  if (executionType === "recommended_batch") {
    const counts = countStatus(input.payload);
    const route = input.payload.routeEffectSummary;
    const routeText = route
      ? `成功率 ${route.successRatePercent}%，成本 $${route.knownCostUsd.toFixed(4)}，质量 ${route.averageQualityScore ?? "缺"}。`
      : "";
    return `推荐批次完成：成功 ${counts.succeededCount}，失败 ${counts.failedCount}。${routeText}`;
  }

  if (executionType === "retry_task") {
    return input.payload.task?.status === "succeeded" ? "重试成功。" : "已发起重试。";
  }

  if (executionType === "publish_repair") return "发布修复动作已完成。";
  return "已打开处理位置。";
}

function recheckHint(input: {
  action: PrePublishGateAction;
  status: GateActionReceipt["status"];
  message: string;
}): GateActionReceipt["recheck"] {
  if (input.status === "failed") {
    return {
      status: "blocked",
      label: "先处理失败原因",
      detail: input.message,
      actionLabel: "打开相关位置",
    };
  }

  if (input.action.execution?.type === "publish_repair") {
    return {
      status: "ready",
      label: "重新质检发布包",
      detail: "发布修复已完成，刷新总闸门后确认发布包、前三章和审稿状态是否解除阻塞。",
      actionLabel: "刷新总闸门",
    };
  }

  if (input.action.execution?.type === "retry_task") {
    return {
      status: "ready",
      label: "刷新失败复盘",
      detail: "失败任务已重试，刷新后检查失败数量、可重试项和模型稳定性是否改善。",
      actionLabel: "刷新总闸门",
    };
  }

  if (input.action.execution?.type === "recommended_batch") {
    return {
      status: "ready",
      label: "复检任务队列",
      detail: "推荐批次已执行，刷新后确认生产任务、阻塞项和下一批策略是否变化。",
      actionLabel: "刷新总闸门",
    };
  }

  return {
    status: "ready",
    label: "复检处理结果",
    detail: "处理位置已打开，完成人工编辑后回到这里刷新总闸门。",
    actionLabel: "刷新总闸门",
  };
}

function strategyReceiptMessage(input: {
  item: PrePublishGateStrategyPlatform;
  payload: GatePlatformStrategyReceiptPayload;
  status: GateActionReceipt["status"];
  fallbackError?: string;
}) {
  if (input.status === "failed") return input.payload.error ?? input.fallbackError ?? "策略动作执行失败。";
  if (input.payload.message) return input.payload.message;

  if (input.item.actionType === "generate_asset_variants") {
    return `已生成 ${input.payload.variants?.length ?? 0} 个 ${input.item.platformName} 投稿方案，下一步采纳最强版本并保存基准。`;
  }
  if (input.item.actionType === "rewrite_first_three") {
    return `已按 ${input.item.platformName} 重写前三章，共 ${input.payload.results?.length ?? 0} 章。`;
  }
  if (input.item.actionType === "save_snapshot") return `已保存 ${input.item.platformName} 发布包基准。`;
  return input.item.nextAction;
}

function strategyRecheckHint(input: {
  item: PrePublishGateStrategyPlatform;
  status: GateActionReceipt["status"];
  message: string;
}): GateActionReceipt["recheck"] {
  if (input.status === "failed") {
    return {
      status: "blocked",
      label: "先处理策略动作失败",
      detail: input.message,
      actionLabel: "打开相关位置",
    };
  }

  if (input.item.actionType === "generate_asset_variants") {
    return {
      status: "ready",
      label: "采纳投稿方案并复检",
      detail: "投稿方案已生成，采纳最强版本后刷新总闸门，确认资产、基准和投放链路是否补齐。",
      actionLabel: "刷新总闸门",
    };
  }

  if (input.item.actionType === "rewrite_first_three") {
    return {
      status: "ready",
      label: "复检前三章与发布包",
      detail: "前三章已重写，刷新总闸门后确认弱转化平台是否进入新一轮基准和回填。",
      actionLabel: "刷新总闸门",
    };
  }

  if (input.item.actionType === "save_snapshot") {
    return {
      status: "ready",
      label: "投放后回填效果",
      detail: "发布包基准已保存，下一步投放后回填曝光、点击、收藏、追读和编辑反馈。",
      actionLabel: "刷新总闸门",
    };
  }

  return {
    status: "ready",
    label: "复检策略结果",
    detail: "策略目标位置已打开，处理完成后刷新总闸门确认平台推荐是否变化。",
    actionLabel: "刷新总闸门",
  };
}

function platformIdFromActionId(actionId: string) {
  const match = actionId.match(/^platform-strategy:([^:]+):/);
  return match?.[1] ?? "manual";
}

function platformNameFromDetail(detail: string) {
  if (!detail.includes("·")) return "总闸门";
  const [name] = detail.split("·");
  return name?.trim() || "总闸门";
}

export function gateActionReceiptPlatform(receipt: GateActionReceipt) {
  return {
    id: receipt.platformId || platformIdFromActionId(receipt.actionId),
    name: receipt.platformName || platformNameFromDetail(receipt.detail),
  };
}

export function buildGateActionReceipt(input: {
  action: PrePublishGateAction;
  payload?: GateActionReceiptPayload;
  status: GateActionReceipt["status"];
  fallbackError?: string;
  now?: Date | string;
}): GateActionReceipt {
  const payload = input.payload ?? {};
  const counts = countStatus(payload);
  const createdAt = input.now ? new Date(input.now).toISOString() : new Date().toISOString();
  const taskId = payload.task?.id ?? payload.result?.taskId ?? payload.results?.find((result) => result.taskId)?.taskId ?? null;
  const message = receiptMessage({
    action: input.action,
    payload,
    status: input.status,
    fallbackError: input.fallbackError,
  });

  return {
    id: `${input.action.id}:${createdAt}`,
    actionId: input.action.id,
    label: input.action.label,
    detail: input.action.detail,
    href: input.action.href,
    status: input.status,
    message,
    executionType: input.action.execution?.type ?? "manual",
    succeededCount: counts.succeededCount,
    failedCount: counts.failedCount,
    taskId,
    platformId: platformIdFromActionId(input.action.id),
    platformName: platformNameFromDetail(input.action.detail),
    recheck: recheckHint({
      action: input.action,
      status: input.status,
      message,
    }),
    createdAt,
  };
}

export function buildGatePlatformStrategyReceipt(input: {
  item: PrePublishGateStrategyPlatform;
  payload?: GatePlatformStrategyReceiptPayload;
  status: GateActionReceipt["status"];
  fallbackError?: string;
  now?: Date | string;
}): GateActionReceipt {
  const payload = input.payload ?? {};
  const createdAt = input.now ? new Date(input.now).toISOString() : new Date().toISOString();
  const message = strategyReceiptMessage({
    item: input.item,
    payload,
    status: input.status,
    fallbackError: input.fallbackError,
  });
  const succeededCount = input.status === "succeeded"
    ? Math.max(payload.variants?.length ?? 0, payload.results?.length ?? 0, input.item.actionType === "open_target" || input.item.actionType === "save_snapshot" ? 1 : 0)
    : 0;

  return {
    id: `platform-strategy:${input.item.platformId}:${input.item.actionType}:${createdAt}`,
    actionId: `platform-strategy:${input.item.platformId}:${input.item.actionType}`,
    label: input.item.actionLabel,
    detail: `${input.item.platformName} · ${input.item.label} · ${input.item.nextAction}`,
    href: input.item.href,
    status: input.status,
    message,
    executionType: "platform_strategy",
    succeededCount,
    failedCount: input.status === "failed" ? 1 : 0,
    taskId: payload.task?.id ?? null,
    platformId: input.item.platformId,
    platformName: input.item.platformName,
    recheck: strategyRecheckHint({
      item: input.item,
      status: input.status,
      message,
    }),
    createdAt,
  };
}

export function trimGateActionReceipts(receipts: GateActionReceipt[], limit = defaultGateActionReceiptLimit) {
  return receipts
    .slice()
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, limit);
}

function isGateActionReceipt(item: unknown): item is GateActionReceipt {
  if (!item || typeof item !== "object") return false;
  return true
    && "id" in item
    && "label" in item
    && "createdAt" in item
    && "status" in item;
}

function emitReceiptUpdate(receipts: GateActionReceipt[]) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(gateActionReceiptUpdatedEvent, { detail: receipts }));
}

export function loadGateActionReceipts() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(gateActionReceiptStorageKey) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return trimGateActionReceipts(parsed.filter(isGateActionReceipt));
  } catch {
    return [];
  }
}

export function saveGateActionReceipts(receipts: GateActionReceipt[]) {
  if (typeof window === "undefined") return [];
  const next = trimGateActionReceipts(receipts);
  window.localStorage.setItem(gateActionReceiptStorageKey, JSON.stringify(next));
  emitReceiptUpdate(next);
  return next;
}

export function mergeGateActionReceipts(...groups: GateActionReceipt[][]) {
  const byId = new Map<string, GateActionReceipt>();
  for (const group of groups) {
    for (const receipt of group) {
      byId.set(receipt.id, receipt);
    }
  }
  return trimGateActionReceipts([...byId.values()]);
}

export function filterGateActionReceipts(receipts: GateActionReceipt[], filters: GateActionReceiptFilters) {
  return trimGateActionReceipts(receipts.filter((receipt) => {
    const platform = gateActionReceiptPlatform(receipt);
    return true
      && (!filters.status || filters.status === "all" || receipt.status === filters.status)
      && (!filters.executionType || filters.executionType === "all" || receipt.executionType === filters.executionType)
      && (!filters.platformId || filters.platformId === "all" || platform.id === filters.platformId);
  }));
}

export function buildGateActionReceiptSummary(receipts: GateActionReceipt[]): GateActionReceiptSummary {
  const platformMap = new Map<string, GateActionReceiptSummary["platforms"][number]>();
  const executionMap = new Map<GateActionReceiptExecutionType, GateActionReceiptSummary["executionTypes"][number]>();
  let succeededActions = 0;
  let failedActions = 0;

  for (const receipt of receipts) {
    const platform = gateActionReceiptPlatform(receipt);
    const platformSummary = platformMap.get(platform.id) ?? {
      id: platform.id,
      name: platform.name,
      total: 0,
      failed: 0,
    };
    platformSummary.total += 1;
    if (receipt.status === "failed") platformSummary.failed += 1;
    platformMap.set(platform.id, platformSummary);

    const executionSummary = executionMap.get(receipt.executionType) ?? {
      type: receipt.executionType,
      total: 0,
      failed: 0,
    };
    executionSummary.total += 1;
    if (receipt.status === "failed") executionSummary.failed += 1;
    executionMap.set(receipt.executionType, executionSummary);

    succeededActions += receipt.succeededCount;
    failedActions += receipt.failedCount;
  }

  return {
    total: receipts.length,
    succeeded: receipts.filter((receipt) => receipt.status === "succeeded").length,
    failed: receipts.filter((receipt) => receipt.status === "failed").length,
    readyRecheck: receipts.filter((receipt) => receipt.recheck.status === "ready").length,
    blockedRecheck: receipts.filter((receipt) => receipt.recheck.status === "blocked").length,
    succeededActions,
    failedActions,
    platforms: [...platformMap.values()].sort((left, right) => right.total - left.total || left.name.localeCompare(right.name)),
    executionTypes: [...executionMap.values()].sort((left, right) => right.total - left.total || left.type.localeCompare(right.type)),
  };
}

function gateActionReceiptQuery(options?: GateActionReceiptFilters & { limit?: number }) {
  const params = new URLSearchParams();
  if (options?.status && options.status !== "all") params.set("status", options.status);
  if (options?.executionType && options.executionType !== "all") params.set("executionType", options.executionType);
  if (options?.platformId && options.platformId !== "all") params.set("platformId", options.platformId);
  if (options?.limit) params.set("limit", String(options.limit));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function fetchPersistedGateActionReceipts(options?: GateActionReceiptFilters & { limit?: number }) {
  const response = await fetch(`/api/gate/action-receipts${gateActionReceiptQuery(options)}`, { cache: "no-store" });
  const payload = (await response.json().catch(() => null)) as { receipts?: GateActionReceipt[]; error?: string } | null;
  if (!response.ok) throw new Error(payload?.error ?? "读取闸门审计历史失败。");
  return trimGateActionReceipts(payload?.receipts ?? [], options?.limit ?? defaultGateActionReceiptLimit);
}

export async function persistGateActionReceipt(receipt: GateActionReceipt, payload?: unknown) {
  const response = await fetch("/api/gate/action-receipts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ receipt, payload }),
  });
  const result = (await response.json().catch(() => null)) as { receipt?: GateActionReceipt; error?: string } | null;
  if (!response.ok || !result?.receipt) throw new Error(result?.error ?? "保存闸门审计记录失败。");
  return result.receipt;
}

export async function clearPersistedGateActionReceipts() {
  const response = await fetch("/api/gate/action-receipts", { method: "DELETE" });
  const result = (await response.json().catch(() => null)) as { deleted?: number; error?: string } | null;
  if (!response.ok) throw new Error(result?.error ?? "清空闸门审计历史失败。");
  return result?.deleted ?? 0;
}

export function addGateActionReceipt(receipt: GateActionReceipt) {
  const next = saveGateActionReceipts([receipt, ...loadGateActionReceipts()]);
  void persistGateActionReceipt(receipt).catch(() => undefined);
  return next;
}

export function clearGateActionReceipts() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(gateActionReceiptStorageKey);
  emitReceiptUpdate([]);
}
