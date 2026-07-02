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

export type GatePlatformGrowthReviewStage =
  | "fix_failure"
  | "adopt_asset"
  | "record_metrics"
  | "scale_up"
  | "repair_tactic"
  | "pivot_platform"
  | "pause_platform"
  | "watch";

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

export type GatePlatformGrowthDispatchState = "queued" | "assigned" | "completed";

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

export interface PersistedGatePlatformDispatchTask extends GatePlatformGrowthDispatchItem {
  databaseId: string;
  dispatchKey: string;
  projectId: string | null;
  sourceReceiptId: string | null;
  completionEvidence: string;
  assignedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type GateDispatchTaskStateFilter = GatePlatformGrowthDispatchState | "all";

export interface GateDispatchTaskFilters {
  state?: GateDispatchTaskStateFilter;
  platformId?: string;
  ownerRole?: string;
}

export interface GateDispatchTaskCenter {
  summary: {
    total: number;
    queued: number;
    assigned: number;
    completed: number;
    active: number;
    overdue: number;
    dueToday: number;
    averagePriorityScore: number;
  };
  platforms: Array<{
    id: string;
    name: string;
    total: number;
    active: number;
    topPriorityScore: number;
  }>;
  ownerRoles: Array<{
    role: string;
    total: number;
    active: number;
    topPriorityScore: number;
  }>;
  nextActions: string[];
  closeoutItems: GateDispatchTaskCloseoutItem[];
}

export type GateDispatchTaskCloseoutStatus = "overdue" | "today" | "planned" | "done";

export interface GateDispatchTaskCloseoutItem {
  dispatchKey: string;
  platformName: string;
  ownerRole: string;
  title: string;
  priorityScore: number;
  state: GatePlatformGrowthDispatchState;
  status: GateDispatchTaskCloseoutStatus;
  label: string;
  detail: string;
  href: string;
  dueAt: string | null;
}

export type GateDispatchEvidenceReviewStatus = "verified" | "needs_receipt" | "missing_evidence" | "active";

export interface GateDispatchEvidenceReviewItem {
  dispatchKey: string;
  platformId: string;
  platformName: string;
  stage: GatePlatformGrowthReviewStage;
  ownerRole: string;
  title: string;
  priorityScore: number;
  state: GatePlatformGrowthDispatchState;
  status: GateDispatchEvidenceReviewStatus;
  label: string;
  detail: string;
  href: string;
  completionEvidence: string;
  completedAt: string | null;
  latestReceiptAt: string | null;
  evidence: string[];
}

export interface GateDispatchEvidenceReview {
  summary: {
    total: number;
    completed: number;
    verified: number;
    needsReceipt: number;
    missingEvidence: number;
    active: number;
  };
  nextActions: string[];
  items: GateDispatchEvidenceReviewItem[];
}

export type GatePlatformScaleGateStatus = "ready" | "blocked_evidence" | "needs_dispatch" | "not_candidate";

export interface GatePlatformScaleGateItem {
  platformId: string;
  platformName: string;
  status: GatePlatformScaleGateStatus;
  label: string;
  detail: string;
  actionLabel: string;
  href: string;
  priorityScore: number;
  stage: GatePlatformGrowthReviewStage;
  evidence: string[];
}

export interface GatePlatformScaleGate {
  summary: {
    total: number;
    candidates: number;
    ready: number;
    blockedEvidence: number;
    needsDispatch: number;
    notCandidate: number;
  };
  nextActions: string[];
  items: GatePlatformScaleGateItem[];
}

export type GatePlatformScaleFollowupStatus = "tracked" | "needs_effect" | "needs_completion" | "missing_evidence";

export interface GatePlatformScaleFollowupItem {
  dispatchKey: string;
  platformId: string;
  platformName: string;
  ownerRole: string;
  title: string;
  status: GatePlatformScaleFollowupStatus;
  label: string;
  detail: string;
  actionLabel: string;
  href: string;
  priorityScore: number;
  completedAt: string | null;
  latestEffectAt: string | null;
  evidence: string[];
}

export interface GatePlatformScaleFollowup {
  summary: {
    total: number;
    tracked: number;
    needsEffect: number;
    needsCompletion: number;
    missingEvidence: number;
  };
  nextActions: string[];
  items: GatePlatformScaleFollowupItem[];
}

export type GatePlatformScaleCadenceStatus = "ready" | "cooldown" | "over_limit" | "needs_followup" | "not_candidate";

export interface GatePlatformScaleCadenceItem {
  platformId: string;
  platformName: string;
  status: GatePlatformScaleCadenceStatus;
  label: string;
  detail: string;
  actionLabel: string;
  href: string;
  priorityScore: number;
  recentScaleCount: number;
  windowDays: number;
  cooldownDays: number;
  latestScaleAt: string | null;
  nextAllowedAt: string | null;
  evidence: string[];
}

export interface GatePlatformScaleCadence {
  summary: {
    total: number;
    candidates: number;
    ready: number;
    cooldown: number;
    overLimit: number;
    needsFollowup: number;
  };
  nextActions: string[];
  items: GatePlatformScaleCadenceItem[];
}

export type GatePlatformRetreatStatus = "healthy" | "watch" | "repair_tactic" | "pivot_platform" | "pause";

export interface GatePlatformRetreatItem {
  platformId: string;
  platformName: string;
  status: GatePlatformRetreatStatus;
  label: string;
  detail: string;
  actionLabel: string;
  href: string;
  priorityScore: number;
  latestAt: string;
  latestViews: number;
  clickRatePercent: number;
  favoriteRatePercent: number;
  followRatePercent: number;
  declineSignals: number;
  evidence: string[];
}

export interface GatePlatformRetreatGate {
  summary: {
    total: number;
    healthy: number;
    watch: number;
    repairTactic: number;
    pivotPlatform: number;
    pause: number;
  };
  nextActions: string[];
  items: GatePlatformRetreatItem[];
}

export type GatePlatformRetreatResolutionStatus = "resolved" | "needs_effect" | "missing_evidence" | "active";

export interface GatePlatformRetreatResolutionItem {
  dispatchKey: string;
  platformId: string;
  platformName: string;
  stage: GatePlatformGrowthReviewStage;
  ownerRole: string;
  title: string;
  status: GatePlatformRetreatResolutionStatus;
  label: string;
  detail: string;
  actionLabel: string;
  href: string;
  priorityScore: number;
  completedAt: string | null;
  latestEffectAt: string | null;
  completionEvidence: string;
  evidence: string[];
}

export interface GatePlatformRetreatResolution {
  summary: {
    total: number;
    resolved: number;
    needsEffect: number;
    missingEvidence: number;
    active: number;
  };
  nextActions: string[];
  items: GatePlatformRetreatResolutionItem[];
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

function percent(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
}

interface GatePublishEffectMetricSnapshot extends GatePublishEffectReceiptMetric {
  receiptId: string;
  platformId: string;
  platformName: string;
  href: string;
  createdAt: string;
  clickRatePercent: number;
  favoriteRatePercent: number;
  followRatePercent: number;
}

function metricFromReceipt(receipt: GateActionReceipt): GatePublishEffectMetricSnapshot | null {
  if (actionTypeFromReceipt(receipt) !== "save_effect" || receipt.status !== "succeeded") return null;
  const source = `${receipt.detail} ${receipt.message}`;
  const views = Number(source.match(/曝光\s*(\d+)/)?.[1] ?? 0);
  const clicks = Number(source.match(/点击\s*(\d+)/)?.[1] ?? 0);
  const favorites = Number(source.match(/收藏\s*(\d+)/)?.[1] ?? 0);
  const follows = Number(source.match(/追读\s*(\d+)/)?.[1] ?? 0);
  if (![views, clicks, favorites, follows].every((value) => Number.isFinite(value))) return null;
  const platform = gateActionReceiptPlatform(receipt);
  return {
    receiptId: receipt.id,
    platformId: platform.id,
    platformName: platform.name,
    href: receipt.href,
    createdAt: receipt.createdAt,
    views,
    clicks,
    favorites,
    follows,
    clickRatePercent: percent(clicks, views),
    favoriteRatePercent: percent(favorites, views),
    followRatePercent: percent(follows, views),
  };
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

export function buildGatePlatformGrowthDispatchItems(
  receipts: GateActionReceipt[],
  limit = 6,
  persistedTasks: PersistedGatePlatformDispatchTask[] = [],
): GatePlatformGrowthDispatchItem[] {
  const reviews = buildGatePlatformGrowthReview(receipts, limit);
  const persistedByKey = new Map(persistedTasks.map((task) => [task.dispatchKey, task]));
  return reviews.map((review): GatePlatformGrowthDispatchItem => {
    const spec = dispatchSpec(review);
    const dispatchKey = `${review.platformId}:${review.stage}`;
    const persisted = persistedByKey.get(dispatchKey);
    const assignedReceipt = latestReceiptFor(
      receipts,
      (receipt) => receipt.actionId === `gate-platform-dispatch:${review.stage}:${review.platformId}` && receipt.status === "succeeded",
    );
    const isAssignedByReceipt = Boolean(assignedReceipt && new Date(assignedReceipt.createdAt).getTime() > new Date(review.latestAt).getTime());
    const state = persisted?.state === "completed"
      ? "completed"
      : persisted?.state === "assigned" || isAssignedByReceipt
        ? "assigned"
        : "queued";

    return {
      id: dispatchKey,
      platformId: review.platformId,
      platformName: review.platformName,
      stage: review.stage,
      state,
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

function retreatDispatchSpec(item: GatePlatformRetreatItem) {
  if (item.status === "repair_tactic") {
    return {
      stage: "repair_tactic" as const,
      ownerRole: "投稿打法编辑",
      title: `${item.platformName} 投稿打法修复`,
      detail: "重写标题、简介、标签和前三章卖点兑现，把弱转化原因拆成可执行修复项。",
      dueLabel: "24 小时内",
      actionLabel: "派给打法编辑",
      acceptanceCriteria: ["标题简介完成新版", "标签和卖点重排", "前三章兑现问题已列出修复方案"],
    };
  }

  if (item.status === "pivot_platform") {
    return {
      stage: "pivot_platform" as const,
      ownerRole: "平台策略编辑",
      title: `${item.platformName} 换打法/迁移方案`,
      detail: "停止沿用当前投放打法，产出新包装方向和候选迁移平台，明确保留、改写和放弃项。",
      dueLabel: "下一轮投放前",
      actionLabel: "派给策略编辑",
      acceptanceCriteria: ["新打法方向已写清", "候选平台已列出", "迁移后的标题简介标签有草案"],
    };
  }

  if (item.status === "pause") {
    return {
      stage: "pause_platform" as const,
      ownerRole: "主编",
      title: `${item.platformName} 暂停投放复盘`,
      detail: "暂停该平台新增投放，复盘零转化原因，决定修入口、换平台或撤出当前版本。",
      dueLabel: "今天",
      actionLabel: "派给主编复盘",
      acceptanceCriteria: ["暂停原因已记录", "下一步处理路径已选择", "恢复投放条件已写清"],
    };
  }

  return null;
}

export function buildGatePlatformRetreatDispatchItems(
  retreatGate: GatePlatformRetreatGate,
  persistedTasks: PersistedGatePlatformDispatchTask[] = [],
): GatePlatformGrowthDispatchItem[] {
  const persistedByKey = new Map(persistedTasks.map((task) => [task.dispatchKey, task]));
  return retreatGate.items
    .map((item): GatePlatformGrowthDispatchItem | null => {
      const spec = retreatDispatchSpec(item);
      if (!spec) return null;
      const dispatchKey = `${item.platformId}:${spec.stage}`;
      const persisted = persistedByKey.get(dispatchKey);

      return {
        id: dispatchKey,
        platformId: item.platformId,
        platformName: item.platformName,
        stage: spec.stage,
        state: persisted?.state ?? "queued",
        priorityScore: item.priorityScore,
        ownerRole: spec.ownerRole,
        title: spec.title,
        detail: spec.detail,
        dueLabel: spec.dueLabel,
        actionLabel: spec.actionLabel,
        href: item.href,
        acceptanceCriteria: spec.acceptanceCriteria,
        evidence: item.evidence,
        reviewLatestAt: item.latestAt,
      };
    })
    .filter((item): item is GatePlatformGrowthDispatchItem => Boolean(item))
    .sort((left, right) => {
      const stateWeight: Record<GatePlatformGrowthDispatchState, number> = { queued: 0, assigned: 1, completed: 2 };
      const stateDiff = stateWeight[left.state] - stateWeight[right.state];
      if (stateDiff !== 0) return stateDiff;
      const priorityDiff = right.priorityScore - left.priorityScore;
      if (priorityDiff !== 0) return priorityDiff;
      return left.platformName.localeCompare(right.platformName);
    });
}

function isRetreatDispatchStage(stage: GatePlatformGrowthReviewStage) {
  return stage === "repair_tactic" || stage === "pivot_platform" || stage === "pause_platform";
}

function isRetreatRecheckDispatchTask(task: Pick<PersistedGatePlatformDispatchTask, "dispatchKey">) {
  return task.dispatchKey.includes(":scale_up:retreat_recheck:");
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

export async function fetchPersistedGateDispatchTasks(options?: {
  state?: GatePlatformGrowthDispatchState | "all";
  platformId?: string;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (options?.state && options.state !== "all") params.set("state", options.state);
  if (options?.platformId && options.platformId !== "all") params.set("platformId", options.platformId);
  if (options?.limit) params.set("limit", String(options.limit));
  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(`/api/gate/dispatch-tasks${query}`, { cache: "no-store" });
  const payload = (await response.json().catch(() => null)) as { tasks?: PersistedGatePlatformDispatchTask[]; error?: string } | null;
  if (!response.ok) throw new Error(payload?.error ?? "读取平台派单失败。");
  return payload?.tasks ?? [];
}

export function filterGateDispatchTasks(
  tasks: PersistedGatePlatformDispatchTask[],
  filters: GateDispatchTaskFilters,
) {
  return tasks
    .filter((task) => true
      && (!filters.state || filters.state === "all" || task.state === filters.state)
      && (!filters.platformId || filters.platformId === "all" || task.platformId === filters.platformId)
      && (!filters.ownerRole || filters.ownerRole === "all" || task.ownerRole === filters.ownerRole))
    .sort((left, right) => {
      const stateWeight: Record<GatePlatformGrowthDispatchState, number> = { queued: 0, assigned: 1, completed: 2 };
      const stateDiff = stateWeight[left.state] - stateWeight[right.state];
      if (stateDiff !== 0) return stateDiff;
      const priorityDiff = right.priorityScore - left.priorityScore;
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });
}

function validDate(value: string | null | undefined) {
  if (!value) return null;
  const dateValue = new Date(value);
  return Number.isNaN(dateValue.getTime()) ? null : dateValue;
}

function receiptIsAfterDate(receipt: GateActionReceipt, dateValue: Date) {
  return new Date(receipt.createdAt).getTime() > dateValue.getTime();
}

function endOfDay(value: Date) {
  const dateValue = new Date(value);
  dateValue.setHours(23, 59, 59, 999);
  return dateValue;
}

function sameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function taskAnchorDate(task: PersistedGatePlatformDispatchTask) {
  return validDate(task.assignedAt) ?? validDate(task.createdAt) ?? new Date();
}

function dispatchDueAt(task: PersistedGatePlatformDispatchTask) {
  const anchor = taskAnchorDate(task);
  if (task.dueLabel === "今天") return endOfDay(anchor);
  if (task.dueLabel.includes("48")) return new Date(anchor.getTime() + 48 * 60 * 60 * 1000);
  if (task.dueLabel.includes("24")) return new Date(anchor.getTime() + 24 * 60 * 60 * 1000);
  return null;
}

export function buildGateDispatchTaskCloseoutItem(
  task: PersistedGatePlatformDispatchTask,
  now: Date | string = new Date(),
): GateDispatchTaskCloseoutItem {
  const current = new Date(now);
  const dueAt = dispatchDueAt(task);
  const overdue = Boolean(task.state !== "completed" && dueAt && current.getTime() > dueAt.getTime());
  const dueToday = Boolean(task.state !== "completed" && dueAt && sameDay(dueAt, current) && !overdue);
  const status: GateDispatchTaskCloseoutStatus = task.state === "completed"
    ? "done"
    : overdue
      ? "overdue"
      : dueToday
        ? "today"
        : "planned";
  const label = status === "done"
    ? "已收口"
    : status === "overdue"
      ? "已逾期"
      : status === "today"
        ? "今天必须收"
        : "计划中";
  const detail = status === "done"
    ? "这个派单已经完成，后续只看复盘数据是否真的回填。"
    : status === "overdue"
      ? "已经超过承诺节奏，不要继续开新派单，先把这个收掉。"
      : status === "today"
        ? "今天该收口，至少要给出完成证据或明确阻塞原因。"
        : "没有硬性今日截止，按优先级排队推进。";

  return {
    dispatchKey: task.dispatchKey,
    platformName: task.platformName,
    ownerRole: task.ownerRole,
    title: task.title,
    priorityScore: task.priorityScore,
    state: task.state,
    status,
    label,
    detail,
    href: task.href,
    dueAt: dueAt?.toISOString() ?? null,
  };
}

export function buildGateDispatchTaskCenter(
  tasks: PersistedGatePlatformDispatchTask[],
  now: Date | string = new Date(),
): GateDispatchTaskCenter {
  const platformMap = new Map<string, GateDispatchTaskCenter["platforms"][number]>();
  const roleMap = new Map<string, GateDispatchTaskCenter["ownerRoles"][number]>();
  let totalPriorityScore = 0;

  for (const task of tasks) {
    const isActive = task.state !== "completed";
    totalPriorityScore += task.priorityScore;

    const platform = platformMap.get(task.platformId) ?? {
      id: task.platformId,
      name: task.platformName,
      total: 0,
      active: 0,
      topPriorityScore: 0,
    };
    platform.total += 1;
    if (isActive) platform.active += 1;
    platform.topPriorityScore = Math.max(platform.topPriorityScore, task.priorityScore);
    platformMap.set(task.platformId, platform);

    const role = roleMap.get(task.ownerRole) ?? {
      role: task.ownerRole,
      total: 0,
      active: 0,
      topPriorityScore: 0,
    };
    role.total += 1;
    if (isActive) role.active += 1;
    role.topPriorityScore = Math.max(role.topPriorityScore, task.priorityScore);
    roleMap.set(task.ownerRole, role);
  }

  const queued = tasks.filter((task) => task.state === "queued").length;
  const assigned = tasks.filter((task) => task.state === "assigned").length;
  const completed = tasks.filter((task) => task.state === "completed").length;
  const highPriorityQueued = tasks.filter((task) => task.state === "queued" && task.priorityScore >= 70).length;
  const activeRoles = [...roleMap.values()].filter((role) => role.active > 0).length;
  const topPlatform = [...platformMap.values()].sort((left, right) => right.active - left.active || right.total - left.total)[0] ?? null;
  const closeoutItems = tasks
    .map((task) => buildGateDispatchTaskCloseoutItem(task, now))
    .sort((left, right) => {
      const statusWeight: Record<GateDispatchTaskCloseoutStatus, number> = { overdue: 0, today: 1, planned: 2, done: 3 };
      const statusDiff = statusWeight[left.status] - statusWeight[right.status];
      if (statusDiff !== 0) return statusDiff;
      const priorityDiff = right.priorityScore - left.priorityScore;
      if (priorityDiff !== 0) return priorityDiff;
      return left.title.localeCompare(right.title);
    });
  const overdue = closeoutItems.filter((item) => item.status === "overdue").length;
  const dueToday = closeoutItems.filter((item) => item.status === "today").length;

  return {
    summary: {
      total: tasks.length,
      queued,
      assigned,
      completed,
      active: queued + assigned,
      overdue,
      dueToday,
      averagePriorityScore: tasks.length ? Math.round(totalPriorityScore / tasks.length) : 0,
    },
    platforms: [...platformMap.values()].sort((left, right) => (
      right.active - left.active
      || right.topPriorityScore - left.topPriorityScore
      || right.total - left.total
      || left.name.localeCompare(right.name)
    )),
    ownerRoles: [...roleMap.values()].sort((left, right) => (
      right.active - left.active
      || right.topPriorityScore - left.topPriorityScore
      || right.total - left.total
      || left.role.localeCompare(right.role)
    )),
    nextActions: [
      overdue > 0 ? `先收 ${overdue} 个逾期派单，拖着不处理就是假闭环。` : null,
      dueToday > 0 ? `今天必须收 ${dueToday} 个派单，至少补齐证据或阻塞原因。` : null,
      highPriorityQueued > 0 ? `先派掉 ${highPriorityQueued} 个高优先级任务，别让平台机会窗口过期。` : null,
      assigned > 0 ? `跟进 ${assigned} 个已派任务，要求按验收标准回填证据。` : null,
      topPlatform && topPlatform.active > 0 ? `${topPlatform.name} 当前活跃派单最多，先压低它的未闭环数量。` : null,
      activeRoles > 1 ? `跨 ${activeRoles} 个角色协同，今天只看派单是否闭环，不开新坑。` : null,
      tasks.length === 0 ? "还没有派单任务，先从总闸门执行平台复盘和派单。" : null,
    ].filter((action): action is string => Boolean(action)),
    closeoutItems,
  };
}

export function buildGateDispatchEvidenceReview(
  tasks: PersistedGatePlatformDispatchTask[],
  receipts: GateActionReceipt[] = [],
): GateDispatchEvidenceReview {
  const operationalReceipts = trimGateActionReceipts(receipts, 100)
    .filter((receipt) => !isAuditMetaReceipt(receipt));
  const items = tasks.map((task): GateDispatchEvidenceReviewItem => {
    const completionEvidence = task.completionEvidence.trim();
    const completedAt = validDate(task.completedAt) ?? validDate(task.updatedAt);

    if (task.state !== "completed") {
      return {
        dispatchKey: task.dispatchKey,
        platformId: task.platformId,
        platformName: task.platformName,
        stage: task.stage,
        ownerRole: task.ownerRole,
        title: task.title,
        priorityScore: task.priorityScore,
        state: task.state,
        status: "active",
        label: "未完成",
        detail: "先把派单推进到完成，再用依据和业务回执验收。",
        href: task.href,
        completionEvidence,
        completedAt: task.completedAt,
        latestReceiptAt: null,
        evidence: task.evidence,
      };
    }

    if (!completionEvidence) {
      return {
        dispatchKey: task.dispatchKey,
        platformId: task.platformId,
        platformName: task.platformName,
        stage: task.stage,
        ownerRole: task.ownerRole,
        title: task.title,
        priorityScore: task.priorityScore,
        state: task.state,
        status: "missing_evidence",
        label: "缺完成依据",
        detail: "状态已经完成，但没有写清楚完成了什么、证据在哪里。这个完成不能算数。",
        href: task.href,
        completionEvidence,
        completedAt: task.completedAt,
        latestReceiptAt: null,
        evidence: ["缺少完成依据", ...task.evidence],
      };
    }

    const latestOperationalReceipt = completedAt
      ? latestReceiptFor(operationalReceipts, (receipt) => {
          const platform = gateActionReceiptPlatform(receipt);
          return platform.id === task.platformId && receipt.status === "succeeded" && receiptIsAfterDate(receipt, completedAt);
        })
      : null;

    if (latestOperationalReceipt) {
      return {
        dispatchKey: task.dispatchKey,
        platformId: task.platformId,
        platformName: task.platformName,
        stage: task.stage,
        ownerRole: task.ownerRole,
        title: task.title,
        priorityScore: task.priorityScore,
        state: task.state,
        status: "verified",
        label: "真闭环",
        detail: "完成依据之后，已经看到同平台新的成功业务回执。",
        href: task.href,
        completionEvidence,
        completedAt: task.completedAt,
        latestReceiptAt: latestOperationalReceipt.createdAt,
        evidence: [`完成依据：${completionEvidence}`, `业务回执：${latestOperationalReceipt.label}`],
      };
    }

    return {
      dispatchKey: task.dispatchKey,
      platformId: task.platformId,
      platformName: task.platformName,
      stage: task.stage,
      ownerRole: task.ownerRole,
      title: task.title,
      priorityScore: task.priorityScore,
      state: task.state,
      status: "needs_receipt",
      label: "待业务回执",
      detail: "已经有完成依据，但还没看到后续业务回执。刷新总闸门或执行对应动作，证明它真的闭环。",
      href: task.href,
      completionEvidence,
      completedAt: task.completedAt,
      latestReceiptAt: null,
      evidence: [`完成依据：${completionEvidence}`, ...task.evidence],
    };
  });

  const verified = items.filter((item) => item.status === "verified").length;
  const needsReceipt = items.filter((item) => item.status === "needs_receipt").length;
  const missingEvidence = items.filter((item) => item.status === "missing_evidence").length;
  const active = items.filter((item) => item.status === "active").length;
  const completed = tasks.filter((task) => task.state === "completed").length;
  const statusWeight: Record<GateDispatchEvidenceReviewStatus, number> = {
    missing_evidence: 0,
    needs_receipt: 1,
    active: 2,
    verified: 3,
  };

  return {
    summary: {
      total: tasks.length,
      completed,
      verified,
      needsReceipt,
      missingEvidence,
      active,
    },
    nextActions: [
      missingEvidence > 0 ? `${missingEvidence} 个完成任务缺依据，先补证据，否则就是纸面闭环。` : null,
      needsReceipt > 0 ? `${needsReceipt} 个完成任务还缺后续业务回执，去总闸门刷新或执行对应动作。` : null,
      active > 0 ? `${active} 个派单还没完成，今天只推进能拿到验收证据的事项。` : null,
      tasks.length > 0 && verified === completed && active === 0 ? "全部完成任务都有后续业务回执，可以进入下一轮平台加码判断。" : null,
    ].filter((action): action is string => Boolean(action)),
    items: items.sort((left, right) => {
      const statusDiff = statusWeight[left.status] - statusWeight[right.status];
      if (statusDiff !== 0) return statusDiff;
      const priorityDiff = right.priorityScore - left.priorityScore;
      if (priorityDiff !== 0) return priorityDiff;
      return left.title.localeCompare(right.title);
    }),
  };
}

export function buildGatePlatformScaleGate(
  reviews: GatePlatformGrowthReview[],
  dispatchEvidenceReview: GateDispatchEvidenceReview,
  scaleFollowup?: GatePlatformScaleFollowup,
  scaleCadence?: GatePlatformScaleCadence,
  retreatGate?: GatePlatformRetreatGate,
  retreatResolution?: GatePlatformRetreatResolution,
): GatePlatformScaleGate {
  const evidenceItemsByPlatform = new Map<string, GateDispatchEvidenceReviewItem[]>();
  for (const item of dispatchEvidenceReview.items) {
    const items = evidenceItemsByPlatform.get(item.platformId) ?? [];
    items.push(item);
    evidenceItemsByPlatform.set(item.platformId, items);
  }
  const scaleFollowupItemsByPlatform = new Map<string, GatePlatformScaleFollowupItem[]>();
  for (const item of scaleFollowup?.items ?? []) {
    const items = scaleFollowupItemsByPlatform.get(item.platformId) ?? [];
    items.push(item);
    scaleFollowupItemsByPlatform.set(item.platformId, items);
  }
  const scaleCadenceByPlatform = new Map((scaleCadence?.items ?? []).map((item) => [item.platformId, item]));
  const retreatByPlatform = new Map((retreatGate?.items ?? []).map((item) => [item.platformId, item]));
  const retreatResolutionByPlatform = new Map((retreatResolution?.items ?? []).map((item) => [item.platformId, item]));

  const items = reviews.map((review): GatePlatformScaleGateItem => {
    const platformEvidenceItems = evidenceItemsByPlatform.get(review.platformId) ?? [];
    const issue = platformEvidenceItems.find((item) => item.status !== "verified" && !isRetreatDispatchStage(item.stage)) ?? null;
    const verifiedEvidence = platformEvidenceItems.filter((item) => item.status === "verified" && !isRetreatDispatchStage(item.stage));
    const scaleFollowupIssue = (scaleFollowupItemsByPlatform.get(review.platformId) ?? [])
      .find((item) => item.status !== "tracked") ?? null;
    const cadenceIssue = scaleCadenceByPlatform.get(review.platformId);
    const retreatIssue = retreatByPlatform.get(review.platformId);
    const retreatResolutionIssue = retreatResolutionByPlatform.get(review.platformId) ?? null;

    if (review.stage !== "scale_up") {
      return {
        platformId: review.platformId,
        platformName: review.platformName,
        status: "not_candidate",
        label: review.stageLabel,
        detail: `${review.platformName} 还在「${review.stageLabel}」阶段，先完成当前动作，别把没闭环的问题伪装成增长机会。`,
        actionLabel: "处理当前阶段",
        href: review.href,
        priorityScore: review.priorityScore,
        stage: review.stage,
        evidence: review.evidence,
      };
    }

    if (issue) {
      return {
        platformId: review.platformId,
        platformName: review.platformName,
        status: "blocked_evidence",
        label: "禁止加码",
        detail: `${review.platformName} 已进入加码候选，但派单证据仍是「${issue.label}」。先把证据链闭上，再谈扩大投入。`,
        actionLabel: issue.status === "active" ? "处理派单" : "补齐证据",
        href: issue.status === "active" ? issue.href : "/dispatch",
        priorityScore: Math.max(review.priorityScore, issue.priorityScore),
        stage: review.stage,
        evidence: issue.evidence.slice(0, 3),
      };
    }

    if (scaleFollowupIssue) {
      return {
        platformId: review.platformId,
        platformName: review.platformName,
        status: "blocked_evidence",
        label: "等待加码效果",
        detail: `${review.platformName} 上一轮加码还没有完成效果对照：${scaleFollowupIssue.detail}`,
        actionLabel: scaleFollowupIssue.actionLabel,
        href: scaleFollowupIssue.href,
        priorityScore: Math.max(review.priorityScore, scaleFollowupIssue.priorityScore),
        stage: review.stage,
        evidence: scaleFollowupIssue.evidence.slice(0, 3),
      };
    }

    if (cadenceIssue && cadenceIssue.status !== "ready" && cadenceIssue.status !== "not_candidate") {
      return {
        platformId: review.platformId,
        platformName: review.platformName,
        status: "blocked_evidence",
        label: cadenceIssue.label,
        detail: `${review.platformName} 未通过连续加码节奏检查：${cadenceIssue.detail}`,
        actionLabel: cadenceIssue.actionLabel,
        href: cadenceIssue.href,
        priorityScore: Math.max(review.priorityScore, cadenceIssue.priorityScore),
        stage: review.stage,
        evidence: cadenceIssue.evidence.slice(0, 3),
      };
    }

    if (retreatIssue && ["pause", "pivot_platform", "repair_tactic"].includes(retreatIssue.status)) {
      if (retreatResolutionIssue && retreatResolutionIssue.status !== "resolved") {
        return {
          platformId: review.platformId,
          platformName: review.platformName,
          status: "blocked_evidence",
          label: retreatResolutionIssue.label,
          detail: `${review.platformName} 触发撤退/换打法闸，修复验收仍是「${retreatResolutionIssue.label}」：${retreatResolutionIssue.detail}`,
          actionLabel: retreatResolutionIssue.actionLabel,
          href: retreatResolutionIssue.href,
          priorityScore: Math.max(review.priorityScore, retreatResolutionIssue.priorityScore),
          stage: review.stage,
          evidence: retreatResolutionIssue.evidence.slice(0, 3),
        };
      }

      if (retreatResolutionIssue?.status === "resolved") {
        return {
          platformId: review.platformId,
          platformName: review.platformName,
          status: "blocked_evidence",
          label: "复测仍异常",
          detail: `${review.platformName} 已完成撤退修复并有复测数据，但最新数据仍触发「${retreatIssue.label}」。继续修打法或换平台，不允许加码。`,
          actionLabel: retreatIssue.actionLabel,
          href: retreatIssue.href,
          priorityScore: Math.max(review.priorityScore, retreatResolutionIssue.priorityScore),
          stage: review.stage,
          evidence: [retreatIssue.detail, ...retreatResolutionIssue.evidence].slice(0, 3),
        };
      }

      return {
        platformId: review.platformId,
        platformName: review.platformName,
        status: "blocked_evidence",
        label: retreatIssue.label,
        detail: `${review.platformName} 触发撤退/换打法闸：${retreatIssue.detail}`,
        actionLabel: retreatIssue.actionLabel,
        href: retreatIssue.href,
        priorityScore: Math.max(review.priorityScore, retreatIssue.priorityScore),
        stage: review.stage,
        evidence: retreatIssue.evidence.slice(0, 3),
      };
    }

    if (retreatResolutionIssue?.status === "resolved") {
      return {
        platformId: review.platformId,
        platformName: review.platformName,
        status: "needs_dispatch",
        label: "修复后重验",
        detail: `${review.platformName} 已完成撤退修复并有复测数据。先重新生成一张小步加码派单，别沿用撤退前的旧证据。`,
        actionLabel: "重新派单验收",
        href: "/dispatch",
        priorityScore: Math.max(review.priorityScore, retreatResolutionIssue.priorityScore),
        stage: review.stage,
        evidence: retreatResolutionIssue.evidence.slice(0, 3),
      };
    }

    if (verifiedEvidence.length === 0) {
      return {
        platformId: review.platformId,
        platformName: review.platformName,
        status: "needs_dispatch",
        label: "先派单验收",
        detail: `${review.platformName} 的效果链路看起来可加码，但还没有同平台真闭环派单。先生成并完成加码派单，避免凭感觉扩量。`,
        actionLabel: "去派单验收",
        href: "/dispatch",
        priorityScore: review.priorityScore,
        stage: review.stage,
        evidence: review.evidence,
      };
    }

    return {
      platformId: review.platformId,
      platformName: review.platformName,
      status: "ready",
      label: "允许小步加码",
      detail: `${review.platformName} 有效果回执，也有同平台真闭环派单，可以进入一轮小幅加码。`,
      actionLabel: "执行小步加码",
      href: review.href,
      priorityScore: review.priorityScore,
      stage: review.stage,
      evidence: [`真闭环派单 ${verifiedEvidence.length}`, ...review.evidence],
    };
  });

  const ready = items.filter((item) => item.status === "ready").length;
  const blockedEvidence = items.filter((item) => item.status === "blocked_evidence").length;
  const needsDispatch = items.filter((item) => item.status === "needs_dispatch").length;
  const candidates = items.filter((item) => item.stage === "scale_up").length;
  const notCandidate = items.filter((item) => item.status === "not_candidate").length;
  const statusWeight: Record<GatePlatformScaleGateStatus, number> = {
    blocked_evidence: 0,
    needs_dispatch: 1,
    ready: 2,
    not_candidate: 3,
  };

  return {
    summary: {
      total: items.length,
      candidates,
      ready,
      blockedEvidence,
      needsDispatch,
      notCandidate,
    },
    nextActions: [
      blockedEvidence > 0 ? `${blockedEvidence} 个加码候选被证据问题拦下，先补派单依据或业务回执。` : null,
      needsDispatch > 0 ? `${needsDispatch} 个加码候选缺少真闭环派单，先走派单验收再扩量。` : null,
      ready > 0 ? `${ready} 个平台允许小步加码，范围要小，下一轮必须回填效果数据。` : null,
      candidates === 0 && items.length > 0 ? "暂无可加码候选，先把救火、采纳资产和效果回填做完。" : null,
      items.length === 0 ? "还没有平台复盘结果，先执行总闸门动作生成业务回执。" : null,
    ].filter((action): action is string => Boolean(action)),
    items: items.sort((left, right) => {
      const statusDiff = statusWeight[left.status] - statusWeight[right.status];
      if (statusDiff !== 0) return statusDiff;
      const priorityDiff = right.priorityScore - left.priorityScore;
      if (priorityDiff !== 0) return priorityDiff;
      return left.platformName.localeCompare(right.platformName);
    }),
  };
}

export function buildGatePlatformRetreatRecheckDispatchItems(
  scaleGate: GatePlatformScaleGate,
  retreatResolution: GatePlatformRetreatResolution,
  persistedTasks: PersistedGatePlatformDispatchTask[] = [],
): GatePlatformGrowthDispatchItem[] {
  const resolvedByPlatform = new Map(
    retreatResolution.items
      .filter((item) => item.status === "resolved")
      .map((item) => [item.platformId, item]),
  );
  const persistedByKey = new Map(persistedTasks.map((task) => [task.dispatchKey, task]));

  return scaleGate.items
    .map((item): GatePlatformGrowthDispatchItem | null => {
      if (item.status !== "needs_dispatch" || item.label !== "修复后重验") return null;
      const resolution = resolvedByPlatform.get(item.platformId);
      if (!resolution?.latestEffectAt) return null;
      const dispatchKey = `${item.platformId}:scale_up:retreat_recheck:${resolution.latestEffectAt}`;
      const persisted = persistedByKey.get(dispatchKey);

      return {
        id: dispatchKey,
        platformId: item.platformId,
        platformName: item.platformName,
        stage: "scale_up",
        state: persisted?.state ?? "queued",
        priorityScore: item.priorityScore,
        ownerRole: "增长运营",
        title: `${item.platformName} 修复后小步重验`,
        detail: "基于撤退修复后的复测数据，重新做一轮小范围加码验收，只验证新打法，不沿用旧判断。",
        dueLabel: "下一轮更新前",
        actionLabel: "派给增长运营",
        href: item.href,
        acceptanceCriteria: ["重验范围已限定", "修复后版本作为新基准", "下一轮效果回填计划已写清"],
        evidence: item.evidence,
        reviewLatestAt: resolution.latestEffectAt,
      };
    })
    .filter((item): item is GatePlatformGrowthDispatchItem => Boolean(item))
    .sort((left, right) => {
      const stateWeight: Record<GatePlatformGrowthDispatchState, number> = { queued: 0, assigned: 1, completed: 2 };
      const stateDiff = stateWeight[left.state] - stateWeight[right.state];
      if (stateDiff !== 0) return stateDiff;
      const priorityDiff = right.priorityScore - left.priorityScore;
      if (priorityDiff !== 0) return priorityDiff;
      return left.platformName.localeCompare(right.platformName);
    });
}

export function buildGatePlatformScaleFollowup(
  tasks: PersistedGatePlatformDispatchTask[],
  receipts: GateActionReceipt[] = [],
): GatePlatformScaleFollowup {
  const operationalReceipts = trimGateActionReceipts(receipts, 100)
    .filter((receipt) => !isAuditMetaReceipt(receipt));
  const scaleTasks = tasks.filter((task) => task.stage === "scale_up");
  const items = scaleTasks.map((task): GatePlatformScaleFollowupItem => {
    const completionEvidence = task.completionEvidence.trim();
    const completedAt = validDate(task.completedAt) ?? validDate(task.updatedAt);
    const isRetreatRecheck = isRetreatRecheckDispatchTask(task);

    if (task.state !== "completed") {
      return {
        dispatchKey: task.dispatchKey,
        platformId: task.platformId,
        platformName: task.platformName,
        ownerRole: task.ownerRole,
        title: task.title,
        status: "needs_completion",
        label: isRetreatRecheck ? "重验未完成" : "加码未完成",
        detail: isRetreatRecheck
          ? "修复后重验派单还没完成，先收口重验范围、版本和执行动作，再要求下一轮效果数据。"
          : "加码派单还没完成，先收口范围、版本和执行动作，再要求下一轮效果数据。",
        actionLabel: isRetreatRecheck ? "处理重验派单" : "处理加码派单",
        href: task.href,
        priorityScore: task.priorityScore,
        completedAt: task.completedAt,
        latestEffectAt: null,
        evidence: task.evidence,
      };
    }

    if (!completionEvidence) {
      return {
        dispatchKey: task.dispatchKey,
        platformId: task.platformId,
        platformName: task.platformName,
        ownerRole: task.ownerRole,
        title: task.title,
        status: "missing_evidence",
        label: isRetreatRecheck ? "缺重验依据" : "缺加码依据",
        detail: isRetreatRecheck
          ? "修复后重验显示完成，但没有写清楚重验范围、版本和执行证据，不能继续判断平台恢复。"
          : "加码派单显示完成，但没有写清楚加码范围、版本和执行证据，不能继续下一次加码。",
        actionLabel: "补齐完成依据",
        href: "/dispatch",
        priorityScore: task.priorityScore,
        completedAt: task.completedAt,
        latestEffectAt: null,
        evidence: [isRetreatRecheck ? "缺少重验完成依据" : "缺少加码完成依据", ...task.evidence],
      };
    }

    const latestEffectReceipt = completedAt
      ? latestReceiptFor(operationalReceipts, (receipt) => {
          const platform = gateActionReceiptPlatform(receipt);
          return true
            && platform.id === task.platformId
            && receipt.status === "succeeded"
            && actionTypeFromReceipt(receipt) === "save_effect"
            && receiptIsAfterDate(receipt, completedAt);
        })
      : null;

    if (latestEffectReceipt) {
      return {
        dispatchKey: task.dispatchKey,
        platformId: task.platformId,
        platformName: task.platformName,
        ownerRole: task.ownerRole,
        title: task.title,
        status: "tracked",
        label: isRetreatRecheck ? "重验已回填" : "已回填对照",
        detail: isRetreatRecheck
          ? "修复后重验完成后已经看到下一轮效果回填，可以用新数据判断恢复、继续修打法或撤退。"
          : "加码完成后已经看到下一轮效果回填，可以用数据判断继续加码、迭代或撤退。",
        actionLabel: "查看效果数据",
        href: latestEffectReceipt.href,
        priorityScore: task.priorityScore,
        completedAt: task.completedAt,
        latestEffectAt: latestEffectReceipt.createdAt,
        evidence: [`${isRetreatRecheck ? "重验依据" : "加码依据"}：${completionEvidence}`, `效果回执：${latestEffectReceipt.label}`],
      };
    }

    return {
      dispatchKey: task.dispatchKey,
      platformId: task.platformId,
      platformName: task.platformName,
      ownerRole: task.ownerRole,
      title: task.title,
      status: "needs_effect",
      label: isRetreatRecheck ? "待重验效果" : "待效果对照",
      detail: isRetreatRecheck
        ? "修复后重验已经完成，但还没有下一轮效果回填。先补曝光、点击、收藏、追读等数据，再判断是否真正恢复。"
        : "加码已经完成，但还没有下一轮效果回填。继续第二次加码之前，先补曝光、点击、收藏、追读等对照数据。",
      actionLabel: isRetreatRecheck ? "回填重验效果" : "回填加码效果",
      href: projectAnchorHref(task.href, "#publish-effect-panel"),
      priorityScore: task.priorityScore,
      completedAt: task.completedAt,
      latestEffectAt: null,
      evidence: [`${isRetreatRecheck ? "重验依据" : "加码依据"}：${completionEvidence}`, ...task.evidence],
    };
  });

  const tracked = items.filter((item) => item.status === "tracked").length;
  const needsEffect = items.filter((item) => item.status === "needs_effect").length;
  const needsCompletion = items.filter((item) => item.status === "needs_completion").length;
  const missingEvidence = items.filter((item) => item.status === "missing_evidence").length;
  const retreatRecheckNeedsEffect = items.filter((item) => item.status === "needs_effect" && item.dispatchKey.includes(":scale_up:retreat_recheck:")).length;
  const regularNeedsEffect = needsEffect - retreatRecheckNeedsEffect;
  const statusWeight: Record<GatePlatformScaleFollowupStatus, number> = {
    missing_evidence: 0,
    needs_effect: 1,
    needs_completion: 2,
    tracked: 3,
  };

  return {
    summary: {
      total: items.length,
      tracked,
      needsEffect,
      needsCompletion,
      missingEvidence,
    },
    nextActions: [
      missingEvidence > 0 ? `${missingEvidence} 个加码派单缺完成依据，先补范围、版本和执行证据。` : null,
      retreatRecheckNeedsEffect > 0 ? `${retreatRecheckNeedsEffect} 个修复后重验缺下一轮效果回填，先补数据再判断是否恢复。` : null,
      regularNeedsEffect > 0 ? `${regularNeedsEffect} 个加码派单缺下一轮效果回填，第二次加码先暂停。` : null,
      needsCompletion > 0 ? `${needsCompletion} 个加码派单还没完成，先收口再看数据。` : null,
      items.length > 0 && tracked === items.length ? "全部加码派单都有后续效果对照，可以用数据决定继续加码或换打法。" : null,
    ].filter((action): action is string => Boolean(action)),
    items: items.sort((left, right) => {
      const statusDiff = statusWeight[left.status] - statusWeight[right.status];
      if (statusDiff !== 0) return statusDiff;
      const priorityDiff = right.priorityScore - left.priorityScore;
      if (priorityDiff !== 0) return priorityDiff;
      return left.title.localeCompare(right.title);
    }),
  };
}

export function buildGatePlatformScaleCadence(
  reviews: GatePlatformGrowthReview[],
  tasks: PersistedGatePlatformDispatchTask[],
  scaleFollowup: GatePlatformScaleFollowup,
  now: Date | string = new Date(),
  options: { windowDays?: number; maxScaleInWindow?: number; cooldownDays?: number } = {},
): GatePlatformScaleCadence {
  const windowDays = options.windowDays ?? 14;
  const maxScaleInWindow = options.maxScaleInWindow ?? 2;
  const cooldownDays = options.cooldownDays ?? 7;
  const current = new Date(now);
  const windowStart = new Date(current.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const followupByPlatform = new Map(scaleFollowup.items.map((item) => [item.platformId, item]));
  const scaleTasksByPlatform = new Map<string, PersistedGatePlatformDispatchTask[]>();
  for (const task of tasks.filter((item) => item.stage === "scale_up")) {
    const platformTasks = scaleTasksByPlatform.get(task.platformId) ?? [];
    platformTasks.push(task);
    scaleTasksByPlatform.set(task.platformId, platformTasks);
  }

  const items = reviews.map((review): GatePlatformScaleCadenceItem => {
    const platformTasks = (scaleTasksByPlatform.get(review.platformId) ?? [])
      .slice()
      .sort((left, right) => new Date(right.completedAt ?? right.updatedAt).getTime() - new Date(left.completedAt ?? left.updatedAt).getTime());
    const completedScaleTasks = platformTasks.filter((task) => task.state === "completed");
    const latestCompletedTask = completedScaleTasks[0] ?? null;
    const latestScaleAt = validDate(latestCompletedTask?.completedAt) ?? validDate(latestCompletedTask?.updatedAt);
    const recentScaleCount = completedScaleTasks.filter((task) => {
      const completedAt = validDate(task.completedAt) ?? validDate(task.updatedAt);
      return completedAt ? completedAt.getTime() >= windowStart.getTime() && completedAt.getTime() <= current.getTime() : false;
    }).length;
    const nextAllowedAt = latestScaleAt
      ? new Date(latestScaleAt.getTime() + cooldownDays * 24 * 60 * 60 * 1000)
      : null;
    const followup = followupByPlatform.get(review.platformId) ?? null;

    if (review.stage !== "scale_up") {
      return {
        platformId: review.platformId,
        platformName: review.platformName,
        status: "not_candidate",
        label: "非加码阶段",
        detail: `${review.platformName} 当前是「${review.stageLabel}」，先完成现阶段动作。`,
        actionLabel: "处理当前阶段",
        href: review.href,
        priorityScore: review.priorityScore,
        recentScaleCount,
        windowDays,
        cooldownDays,
        latestScaleAt: latestScaleAt?.toISOString() ?? null,
        nextAllowedAt: nextAllowedAt?.toISOString() ?? null,
        evidence: review.evidence,
      };
    }

    if (followup && followup.status !== "tracked") {
      return {
        platformId: review.platformId,
        platformName: review.platformName,
        status: "needs_followup",
        label: "先补效果",
        detail: `${review.platformName} 上一轮加码还没完成效果闭环。先补对照数据，不许连续加码。`,
        actionLabel: followup.actionLabel,
        href: followup.href,
        priorityScore: Math.max(review.priorityScore, followup.priorityScore),
        recentScaleCount,
        windowDays,
        cooldownDays,
        latestScaleAt: latestScaleAt?.toISOString() ?? null,
        nextAllowedAt: nextAllowedAt?.toISOString() ?? null,
        evidence: followup.evidence.slice(0, 3),
      };
    }

    if (recentScaleCount >= maxScaleInWindow) {
      return {
        platformId: review.platformId,
        platformName: review.platformName,
        status: "over_limit",
        label: "窗口超限",
        detail: `${review.platformName} 最近 ${windowDays} 天已加码 ${recentScaleCount} 次，达到上限 ${maxScaleInWindow} 次。别把短期噪声当趋势。`,
        actionLabel: "等待窗口释放",
        href: "/gate",
        priorityScore: review.priorityScore,
        recentScaleCount,
        windowDays,
        cooldownDays,
        latestScaleAt: latestScaleAt?.toISOString() ?? null,
        nextAllowedAt: nextAllowedAt?.toISOString() ?? null,
        evidence: [`${windowDays} 天内加码 ${recentScaleCount}/${maxScaleInWindow}`, ...review.evidence],
      };
    }

    if (nextAllowedAt && current.getTime() < nextAllowedAt.getTime()) {
      return {
        platformId: review.platformId,
        platformName: review.platformName,
        status: "cooldown",
        label: "冷却中",
        detail: `${review.platformName} 上一轮加码还在冷却期。至少等到 ${nextAllowedAt.toISOString().slice(0, 10)}，再看对照数据。`,
        actionLabel: "等待冷却结束",
        href: "/gate",
        priorityScore: review.priorityScore,
        recentScaleCount,
        windowDays,
        cooldownDays,
        latestScaleAt: latestScaleAt?.toISOString() ?? null,
        nextAllowedAt: nextAllowedAt.toISOString(),
        evidence: [`冷却 ${cooldownDays} 天`, latestScaleAt ? `最近加码 ${latestScaleAt.toISOString().slice(0, 10)}` : "无最近加码"],
      };
    }

    return {
      platformId: review.platformId,
      platformName: review.platformName,
      status: "ready",
      label: latestScaleAt ? "节奏允许" : "首轮可排期",
      detail: latestScaleAt
        ? `${review.platformName} 未超过加码窗口，冷却期已过，可以排一轮小步加码。`
        : `${review.platformName} 没有近期加码记录，可以排首轮小步加码。`,
      actionLabel: "进入加码决策",
      href: review.href,
      priorityScore: review.priorityScore,
      recentScaleCount,
      windowDays,
      cooldownDays,
      latestScaleAt: latestScaleAt?.toISOString() ?? null,
      nextAllowedAt: nextAllowedAt?.toISOString() ?? null,
      evidence: [`${windowDays} 天内加码 ${recentScaleCount}/${maxScaleInWindow}`, ...review.evidence],
    };
  });

  const ready = items.filter((item) => item.status === "ready").length;
  const cooldown = items.filter((item) => item.status === "cooldown").length;
  const overLimit = items.filter((item) => item.status === "over_limit").length;
  const needsFollowup = items.filter((item) => item.status === "needs_followup").length;
  const candidates = items.filter((item) => item.status !== "not_candidate").length;
  const statusWeight: Record<GatePlatformScaleCadenceStatus, number> = {
    needs_followup: 0,
    over_limit: 1,
    cooldown: 2,
    ready: 3,
    not_candidate: 4,
  };

  return {
    summary: {
      total: items.length,
      candidates,
      ready,
      cooldown,
      overLimit,
      needsFollowup,
    },
    nextActions: [
      needsFollowup > 0 ? `${needsFollowup} 个平台上一轮加码缺效果闭环，先补数据。` : null,
      overLimit > 0 ? `${overLimit} 个平台触发 ${windowDays} 天加码次数上限，先停手观察。` : null,
      cooldown > 0 ? `${cooldown} 个平台仍在 ${cooldownDays} 天冷却期，不要连续推。` : null,
      ready > 0 ? `${ready} 个平台通过节奏检查，可以进入小步加码决策。` : null,
    ].filter((action): action is string => Boolean(action)),
    items: items.sort((left, right) => {
      const statusDiff = statusWeight[left.status] - statusWeight[right.status];
      if (statusDiff !== 0) return statusDiff;
      const priorityDiff = right.priorityScore - left.priorityScore;
      if (priorityDiff !== 0) return priorityDiff;
      return left.platformName.localeCompare(right.platformName);
    }),
  };
}

export function buildGatePlatformRetreatResolution(
  tasks: PersistedGatePlatformDispatchTask[],
  receipts: GateActionReceipt[] = [],
): GatePlatformRetreatResolution {
  const operationalReceipts = trimGateActionReceipts(receipts, 100)
    .filter((receipt) => !isAuditMetaReceipt(receipt));
  const retreatTasks = tasks.filter((task) => isRetreatDispatchStage(task.stage));
  const items = retreatTasks.map((task): GatePlatformRetreatResolutionItem => {
    const completionEvidence = task.completionEvidence.trim();
    const completedAt = validDate(task.completedAt) ?? validDate(task.updatedAt);

    if (task.state !== "completed") {
      return {
        dispatchKey: task.dispatchKey,
        platformId: task.platformId,
        platformName: task.platformName,
        stage: task.stage,
        ownerRole: task.ownerRole,
        title: task.title,
        status: "active",
        label: "修复未完成",
        detail: "撤退修复派单还没收口，先完成打法修复、迁移方案或暂停复盘。",
        actionLabel: "处理撤退派单",
        href: "/dispatch",
        priorityScore: task.priorityScore,
        completedAt: task.completedAt,
        latestEffectAt: null,
        completionEvidence,
        evidence: task.evidence,
      };
    }

    if (!completionEvidence) {
      return {
        dispatchKey: task.dispatchKey,
        platformId: task.platformId,
        platformName: task.platformName,
        stage: task.stage,
        ownerRole: task.ownerRole,
        title: task.title,
        status: "missing_evidence",
        label: "缺修复依据",
        detail: "撤退修复显示完成，但没有写清楚改了什么、暂停原因或迁移判断，不能解除拦截。",
        actionLabel: "补修复依据",
        href: "/dispatch",
        priorityScore: task.priorityScore,
        completedAt: task.completedAt,
        latestEffectAt: null,
        completionEvidence,
        evidence: ["缺少撤退修复依据", ...task.evidence],
      };
    }

    const latestEffectReceipt = completedAt
      ? latestReceiptFor(operationalReceipts, (receipt) => {
          const platform = gateActionReceiptPlatform(receipt);
          return true
            && platform.id === task.platformId
            && receipt.status === "succeeded"
            && actionTypeFromReceipt(receipt) === "save_effect"
            && receiptIsAfterDate(receipt, completedAt);
        })
      : null;

    if (latestEffectReceipt) {
      return {
        dispatchKey: task.dispatchKey,
        platformId: task.platformId,
        platformName: task.platformName,
        stage: task.stage,
        ownerRole: task.ownerRole,
        title: task.title,
        status: "resolved",
        label: "修复已复测",
        detail: "撤退修复完成后，已经看到同平台新的效果回填，可以用新数据重新判断去留和加码。",
        actionLabel: "查看复测数据",
        href: latestEffectReceipt.href,
        priorityScore: task.priorityScore,
        completedAt: task.completedAt,
        latestEffectAt: latestEffectReceipt.createdAt,
        completionEvidence,
        evidence: [`修复依据：${completionEvidence}`, `复测回执：${latestEffectReceipt.label}`],
      };
    }

    return {
      dispatchKey: task.dispatchKey,
      platformId: task.platformId,
      platformName: task.platformName,
      stage: task.stage,
      ownerRole: task.ownerRole,
      title: task.title,
      status: "needs_effect",
      label: "修复待复测",
      detail: "撤退修复方案已经完成，但还没有修复后的效果回填。先补一轮数据，再决定恢复、换平台或撤出。",
      actionLabel: "回填修复后效果",
      href: projectAnchorHref(task.href, "#publish-effect-panel"),
      priorityScore: task.priorityScore,
      completedAt: task.completedAt,
      latestEffectAt: null,
      completionEvidence,
      evidence: [`修复依据：${completionEvidence}`, ...task.evidence],
    };
  });

  const resolved = items.filter((item) => item.status === "resolved").length;
  const needsEffect = items.filter((item) => item.status === "needs_effect").length;
  const missingEvidence = items.filter((item) => item.status === "missing_evidence").length;
  const active = items.filter((item) => item.status === "active").length;
  const statusWeight: Record<GatePlatformRetreatResolutionStatus, number> = {
    missing_evidence: 0,
    needs_effect: 1,
    active: 2,
    resolved: 3,
  };

  return {
    summary: {
      total: items.length,
      resolved,
      needsEffect,
      missingEvidence,
      active,
    },
    nextActions: [
      missingEvidence > 0 ? `${missingEvidence} 个撤退修复缺依据，先补清楚改了什么和恢复条件。` : null,
      needsEffect > 0 ? `${needsEffect} 个撤退修复缺复测效果，别急着恢复加码。` : null,
      active > 0 ? `${active} 个撤退修复派单还没收口，先完成再看平台去留。` : null,
      items.length > 0 && resolved === items.length ? "全部撤退修复都有后续效果复测，可以重新进入平台决策。" : null,
    ].filter((action): action is string => Boolean(action)),
    items: items.sort((left, right) => {
      const statusDiff = statusWeight[left.status] - statusWeight[right.status];
      if (statusDiff !== 0) return statusDiff;
      const priorityDiff = right.priorityScore - left.priorityScore;
      if (priorityDiff !== 0) return priorityDiff;
      return left.title.localeCompare(right.title);
    }),
  };
}

export function buildGatePlatformRetreatGate(
  receipts: GateActionReceipt[],
  reviews: GatePlatformGrowthReview[] = buildGatePlatformGrowthReview(receipts),
): GatePlatformRetreatGate {
  const metricsByPlatform = new Map<string, GatePublishEffectMetricSnapshot[]>();
  for (const receipt of trimGateActionReceipts(receipts, 100).filter((item) => !isAuditMetaReceipt(item))) {
    const metric = metricFromReceipt(receipt);
    if (!metric) continue;
    const metrics = metricsByPlatform.get(metric.platformId) ?? [];
    metrics.push(metric);
    metricsByPlatform.set(metric.platformId, metrics);
  }
  for (const [platformId, metrics] of metricsByPlatform.entries()) {
    metricsByPlatform.set(platformId, metrics.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()));
  }

  const items: GatePlatformRetreatItem[] = [];
  for (const review of reviews) {
    const metrics = metricsByPlatform.get(review.platformId) ?? [];
    const latest = metrics[0] ?? null;
    if (!latest) continue;
    const previous = metrics[1] ?? null;
    const prior = metrics[2] ?? null;
    const declineSignals = previous
      ? [
          latest.clicks < previous.clicks,
          latest.favorites < previous.favorites,
          latest.follows < previous.follows,
          latest.clickRatePercent < previous.clickRatePercent,
          latest.followRatePercent < previous.followRatePercent,
        ].filter(Boolean).length
      : 0;
    const previousDeclineSignals = previous && prior
      ? [
          previous.clicks < prior.clicks,
          previous.favorites < prior.favorites,
          previous.follows < prior.follows,
          previous.clickRatePercent < prior.clickRatePercent,
          previous.followRatePercent < prior.followRatePercent,
        ].filter(Boolean).length
      : 0;
    const weakConversion = latest.views >= 100 && (latest.clickRatePercent < 5 || latest.followRatePercent < 1 || latest.favoriteRatePercent < 2);
    const zeroConversion = latest.views >= 100 && latest.clicks === 0 && latest.follows === 0;
    const repeatedDecline = declineSignals >= 3 && previousDeclineSignals >= 3;
    const href = latest.href;
    let status: GatePlatformRetreatStatus = "healthy";
    let label = "继续观察";
    let detail = `${review.platformName} 最新效果没有明显下滑，继续按证据小步推进。`;
    let actionLabel = "查看效果数据";
    let priorityScore = Math.max(1, review.priorityScore - 10);

    if (zeroConversion) {
      status = "pause";
      label = "暂停投放";
      detail = `${review.platformName} 有曝光但点击和追读为 0，继续投放只是在扩大损失。先暂停，重做入口卖点。`;
      actionLabel = "暂停并复盘";
      priorityScore = Math.max(90, review.priorityScore);
    } else if (repeatedDecline || (declineSignals >= 4 && weakConversion)) {
      status = "pivot_platform";
      label = "换打法/换平台";
      detail = `${review.platformName} 连续效果走弱，不要继续硬推。换标题简介打法，必要时把主力转到更匹配的平台。`;
      actionLabel = "制定换打法";
      priorityScore = Math.max(82, review.priorityScore);
    } else if (weakConversion || declineSignals >= 3) {
      status = "repair_tactic";
      label = "修打法";
      detail = `${review.platformName} 转化偏弱或关键指标下滑，先修标题、简介、标签和前三章兑现，再谈加码。`;
      actionLabel = "修投稿打法";
      priorityScore = Math.max(72, review.priorityScore);
    } else if (!previous) {
      status = "watch";
      label = "样本不足";
      detail = `${review.platformName} 只有一条效果数据，先收第二条对照，不要急着下结论。`;
      actionLabel = "继续回填数据";
      priorityScore = Math.max(35, review.priorityScore);
    }

    items.push({
      platformId: review.platformId,
      platformName: review.platformName,
      status,
      label,
      detail,
      actionLabel,
      href,
      priorityScore,
      latestAt: latest.createdAt,
      latestViews: latest.views,
      clickRatePercent: latest.clickRatePercent,
      favoriteRatePercent: latest.favoriteRatePercent,
      followRatePercent: latest.followRatePercent,
      declineSignals,
      evidence: [
        `点击率 ${latest.clickRatePercent}%`,
        `收藏率 ${latest.favoriteRatePercent}%`,
        `追读率 ${latest.followRatePercent}%`,
        previous ? `下滑信号 ${declineSignals}/5` : "仅 1 条数据",
      ],
    });
  }

  const healthy = items.filter((item) => item.status === "healthy").length;
  const watch = items.filter((item) => item.status === "watch").length;
  const repairTactic = items.filter((item) => item.status === "repair_tactic").length;
  const pivotPlatform = items.filter((item) => item.status === "pivot_platform").length;
  const pause = items.filter((item) => item.status === "pause").length;
  const statusWeight: Record<GatePlatformRetreatStatus, number> = {
    pause: 0,
    pivot_platform: 1,
    repair_tactic: 2,
    watch: 3,
    healthy: 4,
  };

  return {
    summary: {
      total: items.length,
      healthy,
      watch,
      repairTactic,
      pivotPlatform,
      pause,
    },
    nextActions: [
      pause > 0 ? `${pause} 个平台要暂停投放，别拿 0 转化继续烧时间。` : null,
      pivotPlatform > 0 ? `${pivotPlatform} 个平台连续走弱，进入换打法或换平台判断。` : null,
      repairTactic > 0 ? `${repairTactic} 个平台先修投稿打法，再谈继续加码。` : null,
      watch > 0 ? `${watch} 个平台样本不足，先补第二条效果对照。` : null,
      items.length > 0 && healthy === items.length ? "当前有数据的平台没有明显退场信号，继续小步验证。" : null,
    ].filter((action): action is string => Boolean(action)),
    items: items.sort((left, right) => {
      const statusDiff = statusWeight[left.status] - statusWeight[right.status];
      if (statusDiff !== 0) return statusDiff;
      const priorityDiff = right.priorityScore - left.priorityScore;
      if (priorityDiff !== 0) return priorityDiff;
      return left.platformName.localeCompare(right.platformName);
    }),
  };
}

export async function persistGateDispatchTask(dispatch: GatePlatformGrowthDispatchItem, sourceReceipt?: GateActionReceipt) {
  const response = await fetch("/api/gate/dispatch-tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dispatch, sourceReceipt }),
  });
  const payload = (await response.json().catch(() => null)) as { task?: PersistedGatePlatformDispatchTask; error?: string } | null;
  if (!response.ok || !payload?.task) throw new Error(payload?.error ?? "保存平台派单失败。");
  return payload.task;
}

export async function updatePersistedGateDispatchTaskState(
  dispatchKey: string,
  state: GatePlatformGrowthDispatchState,
  options?: { completionEvidence?: string },
) {
  const response = await fetch("/api/gate/dispatch-tasks", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dispatchKey, state, completionEvidence: options?.completionEvidence }),
  });
  const payload = (await response.json().catch(() => null)) as { task?: PersistedGatePlatformDispatchTask; error?: string } | null;
  if (!response.ok || !payload?.task) throw new Error(payload?.error ?? "更新平台派单失败。");
  return payload.task;
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
