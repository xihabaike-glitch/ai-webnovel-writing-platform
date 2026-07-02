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

export type GateActionReviewAdviceSeverity = "urgent" | "warning" | "opportunity" | "healthy";
export type GateActionReviewAdviceActionKind = "handle_failure" | "adopt_asset" | "record_metrics" | "refresh_gate" | "start_gate_action";
export type GateActionReviewAdviceState = "open" | "in_progress";

export interface GateActionReviewAdviceAction {
  kind: GateActionReviewAdviceActionKind;
  label: string;
  href: string;
}

export interface GateActionReviewAdvice {
  id: string;
  severity: GateActionReviewAdviceSeverity;
  state: GateActionReviewAdviceState;
  platformId: string;
  platformName: string;
  headline: string;
  detail: string;
  action: GateActionReviewAdviceAction;
  evidence: string[];
}

export type GatePlatformGrowthReviewStage = "fix_failure" | "adopt_asset" | "record_metrics" | "scale_up" | "watch";

export interface GatePlatformGrowthReview {
  platformId: string;
  platformName: string;
  total: number;
  failed: number;
  failureRatePercent: number;
  assetRuns: number;
  baselines: number;
  effects: number;
  blockedRecheck: number;
  readyRecheck: number;
  priorityScore: number;
  stage: GatePlatformGrowthReviewStage;
  stageLabel: string;
  nextAction: string;
  href: string;
  latestAt: string;
  evidence: string[];
}

export type GatePlatformGrowthDispatchState = "queued" | "assigned";

export interface GatePlatformGrowthDispatchItem {
  id: string;
  platformId: string;
  platformName: string;
  stage: GatePlatformGrowthReviewStage;
  state: GatePlatformGrowthDispatchState;
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

export interface GatePublishEffectReceiptMetric {
  views: number;
  clicks: number;
  favorites: number;
  follows: number;
  comments?: number;
  paidReads?: number;
  snapshotDate?: Date | string;
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

export function buildGateAdviceActionReceipt(input: {
  advice: GateActionReviewAdvice;
  now?: Date | string;
}): GateActionReceipt {
  const createdAt = input.now ? new Date(input.now).toISOString() : new Date().toISOString();
  return {
    id: `gate-advice:${input.advice.id}:${createdAt}`,
    actionId: `gate-advice:${input.advice.action.kind}:${input.advice.platformId}`,
    label: input.advice.action.label,
    detail: `${input.advice.platformName} · ${input.advice.headline}`,
    href: input.advice.action.href,
    status: "succeeded",
    message: `已响应复盘建议：${input.advice.detail}`,
    executionType: "manual",
    succeededCount: 1,
    failedCount: 0,
    taskId: null,
    platformId: input.advice.platformId,
    platformName: input.advice.platformName,
    recheck: {
      status: "ready",
      label: "复检建议处理结果",
      detail: "已进入建议对应的处理位置，完成采纳、回填或修复后刷新总闸门，确认审计建议是否解除。",
      actionLabel: "刷新总闸门",
    },
    createdAt,
  };
}

export function buildGatePublishEffectReceipt(input: {
  projectId: string;
  platformId: string;
  platformName: string;
  metric: GatePublishEffectReceiptMetric;
  now?: Date | string;
}): GateActionReceipt {
  const createdAt = input.now ? new Date(input.now).toISOString() : new Date().toISOString();
  const snapshotDate = input.metric.snapshotDate ? new Date(input.metric.snapshotDate).toISOString().slice(0, 10) : "";
  return {
    id: `platform-strategy:${input.platformId}:save_effect:${createdAt}`,
    actionId: `platform-strategy:${input.platformId}:save_effect`,
    label: "回填发布效果",
    detail: `${input.platformName} · 发布效果回填 · 曝光 ${input.metric.views} · 点击 ${input.metric.clicks} · 收藏 ${input.metric.favorites} · 追读 ${input.metric.follows}`,
    href: `/projects/${input.projectId}#publish-effect-panel`,
    status: "succeeded",
    message: `已记录 ${input.platformName} 发布效果：曝光 ${input.metric.views}，点击 ${input.metric.clicks}，收藏 ${input.metric.favorites}，追读 ${input.metric.follows}${snapshotDate ? `，日期 ${snapshotDate}` : ""}。`,
    executionType: "platform_strategy",
    succeededCount: 1,
    failedCount: 0,
    taskId: null,
    platformId: input.platformId,
    platformName: input.platformName,
    recheck: {
      status: "ready",
      label: "复检发布效果建议",
      detail: "真实投放数据已回填，刷新总闸门后确认平台策略、二轮优化和加码建议是否更新。",
      actionLabel: "刷新总闸门",
    },
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

function actionTypeFromReceipt(receipt: GateActionReceipt) {
  const parts = receipt.actionId.split(":");
  return receipt.executionType === "platform_strategy" ? parts[2] ?? "" : receipt.executionType;
}

function isAdviceActionReceipt(receipt: GateActionReceipt) {
  return receipt.actionId.startsWith("gate-advice:");
}

function isPlatformDispatchReceipt(receipt: GateActionReceipt) {
  return receipt.actionId.startsWith("gate-platform-dispatch:");
}

function isAuditMetaReceipt(receipt: GateActionReceipt) {
  return isAdviceActionReceipt(receipt) || isPlatformDispatchReceipt(receipt);
}

function latestReceiptFor(receipts: GateActionReceipt[], predicate: (receipt: GateActionReceipt) => boolean) {
  return trimGateActionReceipts(receipts.filter(predicate), 1)[0] ?? null;
}

function receiptIsAfter(left: GateActionReceipt, right: GateActionReceipt) {
  return new Date(left.createdAt).getTime() > new Date(right.createdAt).getTime();
}

function latestAdviceResponse(receipts: GateActionReceipt[], kind: GateActionReviewAdviceActionKind, platformId: string) {
  return latestReceiptFor(receipts, (receipt) => receipt.actionId === `gate-advice:${kind}:${platformId}` && receipt.status === "succeeded");
}

function adviceState(response: GateActionReceipt | null, trigger: GateActionReceipt | null): GateActionReviewAdviceState {
  return response && trigger && receiptIsAfter(response, trigger) ? "in_progress" : "open";
}

function adviceEvidence(receipts: GateActionReceipt[]) {
  return trimGateActionReceipts(receipts, 3).map((receipt) => `${receipt.label}：${receipt.status === "succeeded" ? "成功" : "失败"}`);
}

function projectAnchorHref(href: string, anchor: string) {
  const match = href.match(/\/projects\/([^/#?]+)/);
  return match?.[1] ? `/projects/${match[1]}${anchor}` : href;
}

function growthEvidence(input: {
  failed: number;
  assetRuns: number;
  baselines: number;
  effects: number;
  blockedRecheck: number;
}) {
  return [
    `失败 ${input.failed}`,
    `资产 ${input.assetRuns}`,
    `基准 ${input.baselines}`,
    `效果 ${input.effects}`,
    `阻塞 ${input.blockedRecheck}`,
  ];
}

export function buildGatePlatformGrowthReview(receipts: GateActionReceipt[], limit = 6): GatePlatformGrowthReview[] {
  const sorted = trimGateActionReceipts(receipts, defaultGateActionReceiptLimit);
  const groups = new Map<string, { platformId: string; platformName: string; receipts: GateActionReceipt[] }>();

  for (const receipt of sorted) {
    const platform = gateActionReceiptPlatform(receipt);
    if (platform.id === "manual") continue;
    const group = groups.get(platform.id) ?? { platformId: platform.id, platformName: platform.name, receipts: [] };
    group.receipts.push(receipt);
    groups.set(platform.id, group);
  }

  const reviews: GatePlatformGrowthReview[] = [];
  for (const group of groups.values()) {
    const operationalReceipts = group.receipts.filter((receipt) => !isAuditMetaReceipt(receipt));
    if (operationalReceipts.length === 0) continue;

    const failedReceipts = operationalReceipts.filter((receipt) => receipt.status === "failed");
    const assetReceipts = operationalReceipts.filter((receipt) => actionTypeFromReceipt(receipt) === "generate_asset_variants" && receipt.status === "succeeded");
    const baselineReceipts = operationalReceipts.filter((receipt) => actionTypeFromReceipt(receipt) === "save_snapshot" && receipt.status === "succeeded");
    const effectReceipts = operationalReceipts.filter((receipt) => actionTypeFromReceipt(receipt) === "save_effect" && receipt.status === "succeeded");
    const latest = operationalReceipts[0];
    const latestFailure = failedReceipts[0] ?? null;
    const latestSuccess = operationalReceipts.find((receipt) => receipt.status === "succeeded") ?? null;
    const latestAsset = assetReceipts[0] ?? null;
    const latestBaseline = baselineReceipts[0] ?? null;
    const latestEffect = effectReceipts[0] ?? null;
    const failureRatePercent = Math.round((failedReceipts.length / operationalReceipts.length) * 100);
    const blockedRecheck = operationalReceipts.filter((receipt) => receipt.recheck.status === "blocked").length;
    const readyRecheck = operationalReceipts.filter((receipt) => receipt.recheck.status === "ready").length;
    const failureIsResolved = Boolean(latestFailure && latestSuccess && receiptIsAfter(latestSuccess, latestFailure));
    const hasFreshBaselineAfterAsset = Boolean(latestAsset && latestBaseline && receiptIsAfter(latestBaseline, latestAsset));
    const hasFreshEffectAfterBaseline = Boolean(latestBaseline && latestEffect && receiptIsAfter(latestEffect, latestBaseline));

    let stage: GatePlatformGrowthReviewStage = "watch";
    let stageLabel = "继续观察";
    let nextAction = "继续执行总闸门推荐动作，等下一条真实回执再复盘。";
    let href = latest.href;

    if (!failureIsResolved && failedReceipts.length > 0) {
      stage = "fix_failure";
      stageLabel = "先救火";
      nextAction = "先处理最近失败项，别在故障没清掉时继续加码。";
      href = latestFailure?.href ?? latest.href;
    } else if (latestAsset && !hasFreshBaselineAfterAsset) {
      stage = "adopt_asset";
      stageLabel = "采纳资产";
      nextAction = "采纳最强投稿方案，并保存发布包基准。";
      href = projectAnchorHref(latestAsset.href, "#submission-asset-editor");
    } else if (latestBaseline && !hasFreshEffectAfterBaseline) {
      stage = "record_metrics";
      stageLabel = "补效果";
      nextAction = "回填曝光、点击、收藏、追读，让平台判断有数据。";
      href = projectAnchorHref(latestBaseline.href, "#publish-effect-panel");
    } else if (latestEffect && failedReceipts.length === 0) {
      stage = "scale_up";
      stageLabel = "可加码";
      nextAction = "效果链路已经闭环，可以做一轮小步加码。";
      href = latestEffect.href;
    }

    const gapScore = stage === "adopt_asset" ? 24 : stage === "record_metrics" ? 22 : stage === "scale_up" ? 8 : 10;
    const priorityScore = Math.max(1, Math.min(100, Math.round(
      failedReceipts.length * 30
      + failureRatePercent * 0.45
      + blockedRecheck * 18
      + gapScore
      + Math.min(operationalReceipts.length, 6),
    )));

    reviews.push({
      platformId: group.platformId,
      platformName: group.platformName,
      total: operationalReceipts.length,
      failed: failedReceipts.length,
      failureRatePercent,
      assetRuns: assetReceipts.length,
      baselines: baselineReceipts.length,
      effects: effectReceipts.length,
      blockedRecheck,
      readyRecheck,
      priorityScore,
      stage,
      stageLabel,
      nextAction,
      href,
      latestAt: latest.createdAt,
      evidence: growthEvidence({
        failed: failedReceipts.length,
        assetRuns: assetReceipts.length,
        baselines: baselineReceipts.length,
        effects: effectReceipts.length,
        blockedRecheck,
      }),
    });
  }

  return reviews
    .sort((left, right) => {
      const scoreDiff = right.priorityScore - left.priorityScore;
      if (scoreDiff !== 0) return scoreDiff;
      const failureDiff = right.failed - left.failed;
      if (failureDiff !== 0) return failureDiff;
      return new Date(right.latestAt).getTime() - new Date(left.latestAt).getTime();
    })
    .slice(0, limit);
}

function dispatchSpec(review: GatePlatformGrowthReview) {
  if (review.stage === "fix_failure") {
    return {
      ownerRole: "平台救火编辑",
      title: `${review.platformName} 失败项修复`,
      detail: "复查最近失败原因，先修标题钩子、前三章冲突或发布包缺口，再回到总闸门复检。",
      dueLabel: "今天",
      actionLabel: "派给救火编辑",
      acceptanceCriteria: ["失败原因已定位", "对应内容或配置已修复", "总闸门刷新后不再显示同一失败"],
    };
  }

  if (review.stage === "adopt_asset") {
    return {
      ownerRole: "投稿资产编辑",
      title: `${review.platformName} 投稿资产采纳`,
      detail: "从已生成方案里选最强版本，完成标题、简介、标签和卖点文案采纳，并保存发布包基准。",
      dueLabel: "24 小时内",
      actionLabel: "派给资产编辑",
      acceptanceCriteria: ["已采纳一个明确版本", "标题简介标签不为空", "保存了新的发布包基准"],
    };
  }

  if (review.stage === "record_metrics") {
    return {
      ownerRole: "运营数据编辑",
      title: `${review.platformName} 发布效果回填`,
      detail: "补录曝光、点击、收藏、追读和评论等真实数据，让下一轮平台判断不再靠感觉。",
      dueLabel: "投放后 48 小时内",
      actionLabel: "派给数据编辑",
      acceptanceCriteria: ["曝光点击已填写", "收藏追读已填写", "保存后审计历史出现效果回填回执"],
    };
  }

  if (review.stage === "scale_up") {
    return {
      ownerRole: "增长运营",
      title: `${review.platformName} 小步加码`,
      detail: "围绕已有正向效果做一轮小幅加码，记录加码前后版本和下一轮对照数据。",
      dueLabel: "下一轮更新前",
      actionLabel: "派给增长运营",
      acceptanceCriteria: ["加码范围已限定", "保留加码前基准", "下一轮效果数据有回填计划"],
    };
  }

  return {
    ownerRole: "主编",
    title: `${review.platformName} 继续观察`,
    detail: "当前没有明确事故或缺口，继续收集下一条业务回执后再决定是否加码。",
    dueLabel: "下一条回执后",
    actionLabel: "派给主编观察",
    acceptanceCriteria: ["继续执行推荐动作", "保留新回执", "下一轮复盘榜有新判断"],
  };
}

export function buildGatePlatformGrowthDispatchItems(receipts: GateActionReceipt[], limit = 6): GatePlatformGrowthDispatchItem[] {
  const reviews = buildGatePlatformGrowthReview(receipts, limit);
  return reviews.map((review): GatePlatformGrowthDispatchItem => {
    const spec = dispatchSpec(review);
    const assignedReceipt = latestReceiptFor(
      receipts,
      (receipt) => receipt.actionId === `gate-platform-dispatch:${review.stage}:${review.platformId}` && receipt.status === "succeeded",
    );

    return {
      id: `${review.platformId}:${review.stage}`,
      platformId: review.platformId,
      platformName: review.platformName,
      stage: review.stage,
      state: assignedReceipt && new Date(assignedReceipt.createdAt).getTime() > new Date(review.latestAt).getTime() ? "assigned" : "queued",
      priorityScore: review.priorityScore,
      ownerRole: spec.ownerRole,
      title: spec.title,
      detail: spec.detail,
      dueLabel: spec.dueLabel,
      actionLabel: spec.actionLabel,
      href: review.href,
      acceptanceCriteria: spec.acceptanceCriteria,
      evidence: review.evidence,
      reviewLatestAt: review.latestAt,
    };
  });
}

export function buildGatePlatformDispatchReceipt(input: {
  dispatch: GatePlatformGrowthDispatchItem;
  now?: Date | string;
}): GateActionReceipt {
  const createdAt = input.now ? new Date(input.now).toISOString() : new Date().toISOString();
  return {
    id: `gate-platform-dispatch:${input.dispatch.id}:${createdAt}`,
    actionId: `gate-platform-dispatch:${input.dispatch.stage}:${input.dispatch.platformId}`,
    label: input.dispatch.actionLabel,
    detail: `${input.dispatch.platformName} · ${input.dispatch.title}`,
    href: input.dispatch.href,
    status: "succeeded",
    message: `已派单给${input.dispatch.ownerRole}：${input.dispatch.detail}`,
    executionType: "manual",
    succeededCount: 1,
    failedCount: 0,
    taskId: null,
    platformId: input.dispatch.platformId,
    platformName: input.dispatch.platformName,
    recheck: {
      status: "ready",
      label: "复检派单结果",
      detail: `验收标准：${input.dispatch.acceptanceCriteria.join("；")}。完成后刷新总闸门，看平台复盘榜是否降级或转入下一阶段。`,
      actionLabel: "刷新总闸门",
    },
    createdAt,
  };
}

export function buildGateActionReviewAdvice(receipts: GateActionReceipt[], limit = 3): GateActionReviewAdvice[] {
  const sorted = trimGateActionReceipts(receipts, defaultGateActionReceiptLimit);
  if (sorted.length === 0) {
    return [{
      id: "empty-audit-history",
      severity: "warning",
      state: "open",
      platformId: "manual",
      platformName: "总闸门",
      headline: "还没有执行证据，别靠感觉判断平台策略。",
      detail: "先从总闸门执行一次修复、生成或保存动作，再让系统根据真实回执复盘下一步。",
      action: {
        kind: "start_gate_action",
        label: "处理上方动作",
        href: "/gate",
      },
      evidence: ["当前没有审计回执"],
    }];
  }

  const groups = new Map<string, { platformId: string; platformName: string; receipts: GateActionReceipt[] }>();
  for (const receipt of sorted) {
    const platform = gateActionReceiptPlatform(receipt);
    const group = groups.get(platform.id) ?? { platformId: platform.id, platformName: platform.name, receipts: [] };
    group.receipts.push(receipt);
    groups.set(platform.id, group);
  }

  const advice: GateActionReviewAdvice[] = [];
  for (const group of groups.values()) {
    const operationalReceipts = group.receipts.filter((receipt) => !isAuditMetaReceipt(receipt));
    const failed = operationalReceipts.filter((receipt) => receipt.status === "failed");
    const succeeded = operationalReceipts.filter((receipt) => receipt.status === "succeeded");
    const latest = operationalReceipts[0] ?? group.receipts[0];
    const latestFailure = failed[0] ?? null;
    const latestSuccess = succeeded[0] ?? null;
    const failureRate = operationalReceipts.length ? failed.length / operationalReceipts.length : 0;
    const failureResponse = latestAdviceResponse(group.receipts, "handle_failure", group.platformId);
    const failureIsResolved = Boolean(latestFailure && latestSuccess && receiptIsAfter(latestSuccess, latestFailure));

    if (!failureIsResolved && (failed.length >= 2 || (failed.length >= 1 && failureRate >= 0.5))) {
      const state = adviceState(failureResponse, latestFailure);
      advice.push({
        id: `${group.platformId}:failure-cluster`,
        severity: state === "in_progress" ? "warning" : "urgent",
        state,
        platformId: group.platformId,
        platformName: group.platformName,
        headline: state === "in_progress" ? `${group.platformName} 失败处理已响应，等真实修复回执。` : `${group.platformName} 失败偏多，别继续硬冲。`,
        detail: state === "in_progress"
          ? `已经进入失败处理位，但最近 ${operationalReceipts.length} 条业务回执里失败仍有 ${failed.length} 条。完成修复后刷新总闸门。`
          : `最近 ${operationalReceipts.length} 条业务回执里失败 ${failed.length} 条，先修最晚失败项，再谈加码。`,
        action: {
          kind: "handle_failure",
          label: "处理失败项",
          href: failed[0]?.href ?? latest.href,
        },
        evidence: adviceEvidence(failed),
      });
      continue;
    }

    const latestAsset = latestReceiptFor(group.receipts, (receipt) => actionTypeFromReceipt(receipt) === "generate_asset_variants" && receipt.status === "succeeded");
    const laterSnapshot = latestAsset
      ? latestReceiptFor(group.receipts, (receipt) => actionTypeFromReceipt(receipt) === "save_snapshot" && receipt.status === "succeeded" && receiptIsAfter(receipt, latestAsset))
      : null;
    if (latestAsset && !laterSnapshot) {
      const state = adviceState(latestAdviceResponse(group.receipts, "adopt_asset", group.platformId), latestAsset);
      advice.push({
        id: `${group.platformId}:asset-without-baseline`,
        severity: "opportunity",
        state,
        platformId: group.platformId,
        platformName: group.platformName,
        headline: state === "in_progress" ? `${group.platformName} 资产采纳已响应，差一个基准回执。` : `${group.platformName} 资产生成了，别让方案躺在草稿箱。`,
        detail: state === "in_progress"
          ? "已经进入资产采纳位置，但还没看到保存发布包基准。采纳后立刻保存基准，别只点到页面就收工。"
          : "已经生成投稿方案，但还没有看到后续保存基准。先采纳最强版本，否则生成动作等于没进生产线。",
        action: {
          kind: "adopt_asset",
          label: "采纳投稿方案",
          href: projectAnchorHref(latestAsset.href, "#submission-asset-editor"),
        },
        evidence: adviceEvidence([latestAsset, ...group.receipts.filter((receipt) => receipt.status === "succeeded")]),
      });
      continue;
    }

    const latestSnapshot = latestReceiptFor(group.receipts, (receipt) => actionTypeFromReceipt(receipt) === "save_snapshot" && receipt.status === "succeeded");
    const latestEffect = latestReceiptFor(group.receipts, (receipt) => actionTypeFromReceipt(receipt) === "save_effect" && receipt.status === "succeeded");
    const effectIsRecorded = Boolean(latestSnapshot && latestEffect && receiptIsAfter(latestEffect, latestSnapshot));
    if (latestSnapshot && !effectIsRecorded) {
      const state = adviceState(latestAdviceResponse(group.receipts, "record_metrics", group.platformId), latestSnapshot);
      advice.push({
        id: `${group.platformId}:baseline-needs-metrics`,
        severity: "warning",
        state,
        platformId: group.platformId,
        platformName: group.platformName,
        headline: state === "in_progress" ? `${group.platformName} 效果回填已响应，等真实数据落表。` : `${group.platformName} 已有发布基准，下一步别缺效果回填。`,
        detail: state === "in_progress"
          ? "已经进入效果回填位置，但审计历史还没看到新的投放数据证据。补完曝光、点击、收藏、追读后再复检。"
          : "基准保存后要补曝光、点击、收藏、追读或编辑反馈，否则平台选择还是拍脑袋。",
        action: {
          kind: "record_metrics",
          label: "回填发布效果",
          href: projectAnchorHref(latestSnapshot.href, "#publish-effect-panel"),
        },
        evidence: adviceEvidence([latestSnapshot, ...succeeded]),
      });
      continue;
    }

    if (succeeded.length >= 3 && failed.length === 0) {
      advice.push({
        id: `${group.platformId}:stable-success`,
        severity: "healthy",
        state: "open",
        platformId: group.platformId,
        platformName: group.platformName,
        headline: `${group.platformName} 执行链路稳定，可以进入小步加码。`,
        detail: "最近动作没有失败，先扩大一次最小批量，再用审计历史看质量和转化是否同步变好。",
        action: {
          kind: "refresh_gate",
          label: "刷新总闸门",
          href: "/gate",
        },
        evidence: adviceEvidence(succeeded),
      });
    }
  }

  const blocked = sorted.filter((receipt) => receipt.recheck.status === "blocked");
  if (blocked.length >= 2) {
    advice.push({
      id: "blocked-recheck-debt",
      severity: "urgent",
      state: adviceState(latestAdviceResponse(sorted, "handle_failure", "manual"), blocked[0] ?? null),
      platformId: "manual",
      platformName: "总闸门",
      headline: "复检欠账太多，继续新增动作只会把坑埋深。",
      detail: `还有 ${blocked.length} 条回执要求先处理失败原因。先清掉阻塞，再跑新批次。`,
      action: {
        kind: "handle_failure",
        label: "处理阻塞项",
        href: blocked[0]?.href ?? "/gate",
      },
      evidence: adviceEvidence(blocked),
    });
  }

  if (advice.length === 0) {
    const latest = sorted[0];
    const platform = gateActionReceiptPlatform(latest);
    advice.push({
      id: "steady-watch",
      severity: "healthy",
      state: "open",
      platformId: platform.id,
      platformName: platform.name,
      headline: "目前没有明显事故，别松手，继续用证据推进。",
      detail: "继续按总闸门推荐动作小步执行，下一次复盘重点看失败率、基准保存和真实投放反馈。",
      action: {
        kind: "refresh_gate",
        label: "刷新总闸门",
        href: "/gate",
      },
      evidence: adviceEvidence(sorted),
    });
  }

  const severityWeight: Record<GateActionReviewAdviceSeverity, number> = {
    urgent: 0,
    warning: 1,
    opportunity: 2,
    healthy: 3,
  };

  return advice
    .sort((left, right) => {
      const severityDiff = severityWeight[left.severity] - severityWeight[right.severity];
      if (severityDiff !== 0) return severityDiff;
      const manualDiff = Number(left.platformId === "manual") - Number(right.platformId === "manual");
      if (manualDiff !== 0) return manualDiff;
      return left.platformName.localeCompare(right.platformName);
    })
    .slice(0, limit);
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
