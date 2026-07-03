import type { PrePublishGateAction, PrePublishGateActionExecution, PrePublishGateStrategyPlatform } from "./prePublishGate.ts";
import type { FailureRepairBatch } from "../ai/taskRunConsole.ts";

export const gateActionReceiptStorageKey = "ai-webnovel-gate-action-receipts";
export const gateActionReceiptUpdatedEvent = "ai-webnovel-gate-action-receipts-updated";
export const defaultGateActionReceiptLimit = 20;

export type GateActionReceiptExecutionType = PrePublishGateActionExecution["type"] | "platform_strategy" | "manual";
export type GateActionReceiptStatusFilter = "all" | GateActionReceipt["status"];
export type GateActionReceiptExecutionFilter = "all" | GateActionReceiptExecutionType;

export interface GateActionReceiptPayload {
  message?: string;
  error?: string;
  plan?: {
    strategyBases?: GateActionReceiptStartTactic[];
  };
  startTactics?: GateActionReceiptStartTactic[];
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
    verdict?: string;
  };
}

export interface GateActionReceiptStartTactic {
  title: string;
  label: string;
  primaryTactic: string;
  openingMove: string;
  verificationMove: string;
  risk?: string;
}

export interface GateActionReceiptBatchEffectSummary {
  successRatePercent: number;
  knownCostUsd: number;
  averageQualityScore: number | null;
  verdict?: string;
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
  startTactics?: GateActionReceiptStartTactic[];
  batchEffectSummary?: GateActionReceiptBatchEffectSummary | null;
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

export interface GateFailureRepairReceiptReview {
  status: "clear" | "open" | "recheck" | "blocked" | "cleared";
  label: string;
  detail: string;
  actionLabel: string;
  href: string;
  receipts: number;
  latestReceiptId: string | null;
  evidence: string[];
}

export interface GateFailureRepairRecheckResolution {
  status: "none" | "active" | "failed" | "resolved";
  label: string;
  detail: string;
  actionLabel: string;
  href: string;
  completedRechecks: number;
  unresolvedFailures: number;
  latestDispatchKey: string | null;
  evidence: string[];
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
  | "failure_repair_recheck"
  | "start_first_three_review"
  | "start_opening_diagnostic"
  | "start_platform_package"
  | "start_publish_finalize"
  | "start_metrics_recovery"
  | "start_repair_packaging"
  | "start_rewrite_opening"
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

export type GateProjectStartValidationStatus = "ready" | "missing_evidence" | "active";

export interface GateProjectStartValidationPlan {
  key: string;
  projectId: string | null;
  platformId: string;
  platformName: string;
  status: GateProjectStartValidationStatus;
  label: string;
  nextAction: string;
  href: string;
  totalItems: number;
  completedItems: number;
  activeItems: number;
  missingEvidenceItems: number;
  missingStages: GatePlatformGrowthReviewStage[];
  evidence: string[];
  latestAt: string;
}

export interface GateProjectStartValidationReview {
  summary: {
    totalPlans: number;
    readyPlans: number;
    missingEvidencePlans: number;
    activePlans: number;
    totalItems: number;
    completedItems: number;
    activeItems: number;
    missingEvidenceItems: number;
  };
  nextActions: string[];
  plans: GateProjectStartValidationPlan[];
}

export type GateProjectStartMetricDecisionStatus = "scale" | "repair_packaging" | "rewrite_opening" | "wait_metric";

export interface GateProjectStartMetricDecisionItem {
  dispatchKey: string;
  projectId: string | null;
  platformId: string;
  platformName: string;
  status: GateProjectStartMetricDecisionStatus;
  label: string;
  detail: string;
  actionLabel: string;
  href: string;
  priorityScore: number;
  metricAt: string | null;
  clickRatePercent: number | null;
  favoriteRatePercent: number | null;
  followRatePercent: number | null;
  evidence: string[];
}

export interface GateProjectStartMetricDecision {
  summary: {
    total: number;
    scale: number;
    repairPackaging: number;
    rewriteOpening: number;
    waitMetric: number;
  };
  nextActions: string[];
  items: GateProjectStartMetricDecisionItem[];
}

export type GateProjectSecondMetricDecisionStatus = "continue_scale" | "repair_tactic" | "pivot_platform" | "pause" | "wait_metric";

export interface GateProjectSecondMetricDecisionItem {
  dispatchKey: string;
  projectId: string | null;
  platformId: string;
  platformName: string;
  status: GateProjectSecondMetricDecisionStatus;
  label: string;
  detail: string;
  actionLabel: string;
  href: string;
  priorityScore: number;
  metricAt: string | null;
  clickRatePercent: number | null;
  favoriteRatePercent: number | null;
  followRatePercent: number | null;
  evidence: string[];
}

export interface GateProjectSecondMetricDecision {
  summary: {
    total: number;
    continueScale: number;
    repairTactic: number;
    pivotPlatform: number;
    pause: number;
    waitMetric: number;
  };
  nextActions: string[];
  items: GateProjectSecondMetricDecisionItem[];
}

export type GateProjectThirdMetricDecisionStatus = "stable_scale" | "downgrade_repair" | "pivot_platform" | "archive_pause" | "wait_metric";

export interface GateProjectThirdMetricDecisionItem {
  dispatchKey: string;
  projectId: string | null;
  platformId: string;
  platformName: string;
  status: GateProjectThirdMetricDecisionStatus;
  label: string;
  detail: string;
  actionLabel: string;
  href: string;
  priorityScore: number;
  metricAt: string | null;
  clickRatePercent: number | null;
  favoriteRatePercent: number | null;
  followRatePercent: number | null;
  evidence: string[];
}

export interface GateProjectThirdMetricDecision {
  summary: {
    total: number;
    stableScale: number;
    downgradeRepair: number;
    pivotPlatform: number;
    archivePause: number;
    waitMetric: number;
  };
  nextActions: string[];
  items: GateProjectThirdMetricDecisionItem[];
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

export type GatePlatformDecisionTimelineEventType = "effect" | "retreat" | "repair" | "recheck" | "dispatch" | "final";

export interface GatePlatformDecisionTimelineEvent {
  id: string;
  type: GatePlatformDecisionTimelineEventType;
  label: string;
  detail: string;
  href: string;
  createdAt: string;
  evidence: string[];
}

export type GatePlatformDecisionTimelineStatus = "blocked" | "needs_effect" | "rechecking" | "recovering" | "healthy";

export interface GatePlatformDecisionTimelineItem {
  platformId: string;
  platformName: string;
  status: GatePlatformDecisionTimelineStatus;
  label: string;
  detail: string;
  actionLabel: string;
  href: string;
  priorityScore: number;
  latestAt: string;
  events: GatePlatformDecisionTimelineEvent[];
}

export interface GatePlatformDecisionTimeline {
  summary: {
    total: number;
    blocked: number;
    needsEffect: number;
    rechecking: number;
    recovering: number;
    healthy: number;
  };
  nextActions: string[];
  items: GatePlatformDecisionTimelineItem[];
}

export interface GatePlatformDecisionTimelineFilters {
  platformId?: string;
  status?: GatePlatformDecisionTimelineStatus | "all";
  eventType?: GatePlatformDecisionTimelineEventType | "all";
}

export type GatePlatformTacticExperienceStatus = "blocked" | "watch" | "usable";

export interface GatePlatformTacticExperienceItem {
  platformId: string;
  platformName: string;
  status: GatePlatformTacticExperienceStatus;
  label: string;
  tactic: string;
  lesson: string;
  reuseHint: string;
  risk: string;
  href: string;
  sourceStatus: GatePlatformDecisionTimelineStatus;
  sourceLabel: string;
  priorityScore: number;
  latestAt: string;
  evidence: string[];
}

export interface GatePlatformTacticExperienceLibrary {
  summary: {
    total: number;
    blocked: number;
    watch: number;
    usable: number;
  };
  nextActions: string[];
  items: GatePlatformTacticExperienceItem[];
}

export type GateBatchTacticEffectStatus = "blocked" | "watch" | "usable";

export interface GateBatchTacticEffectItem {
  id: string;
  status: GateBatchTacticEffectStatus;
  label: string;
  tacticTitle: string;
  tacticLabel: string;
  primaryTactic: string;
  openingMove: string;
  verificationMove: string;
  risk: string;
  sampleBatches: number;
  succeededTasks: number;
  failedTasks: number;
  successRatePercent: number;
  averageQualityScore: number | null;
  knownCostUsd: number;
  latestAt: string;
  evidence: string[];
  nextAction: string;
}

export interface GateBatchTacticEffectReview {
  summary: {
    total: number;
    blocked: number;
    watch: number;
    usable: number;
  };
  nextActions: string[];
  items: GateBatchTacticEffectItem[];
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

function startTacticsFromPayload(payload: GateActionReceiptPayload) {
  const candidates = payload.startTactics?.length ? payload.startTactics : payload.plan?.strategyBases ?? [];
  return candidates
    .filter((item) => item && typeof item.title === "string" && typeof item.primaryTactic === "string")
    .map((item) => ({
      title: item.title,
      label: item.label || "首轮打法",
      primaryTactic: item.primaryTactic,
      openingMove: item.openingMove,
      verificationMove: item.verificationMove,
      risk: item.risk,
    }));
}

function startTacticReceiptText(startTactics: GateActionReceiptStartTactic[]) {
  if (startTactics.length === 0) return "";
  return `打法依据：${startTactics
    .slice(0, 2)
    .map((item) => `${item.label}｜${item.openingMove || item.primaryTactic}`)
    .join("；")}。`;
}

function batchEffectSummaryFromPayload(payload: GateActionReceiptPayload): GateActionReceiptBatchEffectSummary | null {
  const route = payload.routeEffectSummary;
  if (!route) return null;
  return {
    successRatePercent: route.successRatePercent,
    knownCostUsd: route.knownCostUsd,
    averageQualityScore: route.averageQualityScore,
    verdict: route.verdict,
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
    const tacticText = startTacticReceiptText(startTacticsFromPayload(input.payload));
    const routeText = route
      ? `成功率 ${route.successRatePercent}%，成本 $${route.knownCostUsd.toFixed(4)}，质量 ${route.averageQualityScore ?? "缺"}。`
      : "";
    return `推荐批次完成：成功 ${counts.succeededCount}，失败 ${counts.failedCount}。${routeText}${tacticText}`;
  }

  if (executionType === "retry_task") {
    return input.payload.task?.status === "succeeded" ? "重试成功。" : "已发起重试。";
  }

  if (executionType === "publish_repair") return "发布修复动作已完成。";
  if (input.action.id === "failure-repair-batch") return input.payload.message ?? "已记录失败修复批次处理。";
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
  const startTactics = startTacticsFromPayload(payload);
  const batchEffectSummary = batchEffectSummaryFromPayload(payload);
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
    startTactics,
    batchEffectSummary,
    recheck: recheckHint({
      action: input.action,
      status: input.status,
      message,
    }),
    createdAt,
  };
}

function failureRepairReceiptIds(batch: FailureRepairBatch) {
  return new Set([
    "failure-repair-batch",
    ...batch.items.flatMap((item) => [
      `repair-batch-retry:${item.id}`,
      `retry:${item.id}`,
    ]),
  ]);
}

function failureRepairReceipts(batch: FailureRepairBatch, receipts: GateActionReceipt[]) {
  const ids = failureRepairReceiptIds(batch);
  const taskIds = new Set(batch.items.map((item) => item.id));
  return trimGateActionReceipts(receipts.filter((receipt) => (
    ids.has(receipt.actionId)
    || (receipt.executionType === "retry_task" && receipt.taskId && taskIds.has(receipt.taskId))
  )), defaultGateActionReceiptLimit);
}

export function buildGateFailureRepairReceiptReview(
  batch: FailureRepairBatch,
  receipts: GateActionReceipt[],
): GateFailureRepairReceiptReview {
  const related = failureRepairReceipts(batch, receipts);
  const latest = related[0] ?? null;
  const evidence = related.slice(0, 3).map((receipt) => (
    `${receipt.label}：${receipt.status === "succeeded" ? "成功" : "失败"}｜${receipt.message}`
  ));

  if (batch.status === "clear") {
    return {
      status: related.length > 0 ? "cleared" : "clear",
      label: related.length > 0 ? "失败已清空" : "暂无失败",
      detail: related.length > 0
        ? `失败修复批次已清空，已找到 ${related.length} 条相关处理回执。`
        : "当前没有未恢复失败，也没有需要追踪的修复回执。",
      actionLabel: "查看任务中心",
      href: "/tasks",
      receipts: related.length,
      latestReceiptId: latest?.id ?? null,
      evidence,
    };
  }

  if (!latest) {
    return {
      status: "open",
      label: "等待修复回执",
      detail: `${batch.summary.unresolvedFailures} 个未恢复失败还没有处理回执，先执行修复批次主动作。`,
      actionLabel: batch.primaryActionLabel,
      href: batch.primaryActionHref,
      receipts: 0,
      latestReceiptId: null,
      evidence: batch.guidance.slice(0, 3),
    };
  }

  if (latest.status === "failed") {
    return {
      status: "blocked",
      label: "修复动作失败",
      detail: `最近一次修复回执失败：${latest.message}`,
      actionLabel: "打开失败位置",
      href: latest.href,
      receipts: related.length,
      latestReceiptId: latest.id,
      evidence,
    };
  }

  return {
    status: "recheck",
    label: "已响应待复检",
    detail: `已有 ${related.length} 条失败修复回执，但当前仍有 ${batch.summary.unresolvedFailures} 个未恢复失败；刷新或继续处理后再确认是否清空。`,
    actionLabel: "刷新总闸门",
    href: "/gate",
    receipts: related.length,
    latestReceiptId: latest.id,
    evidence,
  };
}

export function buildGateFailureRepairRecheckDispatchItems(
  review: GateFailureRepairReceiptReview,
  batch: FailureRepairBatch,
  persistedTasks: PersistedGatePlatformDispatchTask[] = [],
): GatePlatformGrowthDispatchItem[] {
  if (review.status !== "recheck" && review.status !== "blocked") return [];

  const dispatchKey = "global:failure_repair_recheck:failure-repair-batch";
  const persisted = persistedTasks.find((task) => task.dispatchKey === dispatchKey);
  const isBlocked = review.status === "blocked";

  return [{
    id: dispatchKey,
    platformId: "global",
    platformName: "全局任务",
    stage: "failure_repair_recheck",
    state: persisted?.state ?? "queued",
    priorityScore: isBlocked ? 98 : 94,
    ownerRole: "故障复检负责人",
    title: isBlocked ? "失败修复动作失败复盘" : "失败修复后复检",
    detail: isBlocked
      ? `${review.detail} 当前仍有 ${batch.summary.unresolvedFailures} 个未恢复失败，先定位失败原因，再重新执行修复。`
      : `已有失败修复回执，但当前仍有 ${batch.summary.unresolvedFailures} 个未恢复失败。需要复检配置、重试结果和失败列表，别把按钮点击误当成真正清空。`,
    dueLabel: isBlocked ? "立即" : "今天",
    actionLabel: "派给复检负责人",
    href: review.href,
    acceptanceCriteria: [
      "总闸门未恢复失败数降为 0",
      "失败修复回执与当前失败列表已对齐",
      "仍未清空的失败已拆成下一轮可执行动作",
    ],
    evidence: [
      ...review.evidence,
      ...batch.guidance,
      `未恢复失败 ${batch.summary.unresolvedFailures} 个`,
    ].slice(0, 5),
    reviewLatestAt: new Date().toISOString(),
  }];
}

function failureRepairRecheckTasks(tasks: PersistedGatePlatformDispatchTask[]) {
  return tasks
    .filter((task) => task.stage === "failure_repair_recheck")
    .sort((left, right) => new Date(right.completedAt ?? right.updatedAt).getTime() - new Date(left.completedAt ?? left.updatedAt).getTime());
}

export function buildGateFailureRepairRecheckResolution(
  batch: FailureRepairBatch,
  tasks: PersistedGatePlatformDispatchTask[],
): GateFailureRepairRecheckResolution {
  const recheckTasks = failureRepairRecheckTasks(tasks);
  const completedTasks = recheckTasks.filter((task) => task.state === "completed");
  const latest = recheckTasks[0] ?? null;
  const latestCompleted = completedTasks[0] ?? null;
  const evidence = [
    ...(latestCompleted?.completionEvidence.trim() ? [`完成依据：${latestCompleted.completionEvidence.trim()}`] : []),
    ...batch.guidance,
    ...batch.items.slice(0, 3).map((item) => `${item.projectTitle} · ${item.taskLabel}：${item.errorMessage}`),
  ].slice(0, 5);

  if (!latest) {
    return {
      status: "none",
      label: "未派复检",
      detail: "失败修复复检还没有派单；先让复检负责人接住未清空失败。",
      actionLabel: "查看派单中心",
      href: "/dispatch",
      completedRechecks: 0,
      unresolvedFailures: batch.summary.unresolvedFailures,
      latestDispatchKey: null,
      evidence: batch.guidance.slice(0, 3),
    };
  }

  if (!latestCompleted) {
    return {
      status: "active",
      label: "等待复检完成",
      detail: "失败修复复检派单已经创建，但还没有完成依据；不能把接单当成闭环。",
      actionLabel: "查看派单",
      href: latest.href,
      completedRechecks: 0,
      unresolvedFailures: batch.summary.unresolvedFailures,
      latestDispatchKey: latest.dispatchKey,
      evidence: latest.evidence.slice(0, 5),
    };
  }

  if (batch.summary.unresolvedFailures > 0 || batch.status !== "clear") {
    return {
      status: "failed",
      label: "复检未通过",
      detail: `复检负责人已提交完成依据，但当前仍有 ${batch.summary.unresolvedFailures} 个未恢复失败；需要进入第三轮处理建议，继续拆配置、重试或人工复盘。`,
      actionLabel: "生成第三轮处理建议",
      href: "/dispatch",
      completedRechecks: completedTasks.length,
      unresolvedFailures: batch.summary.unresolvedFailures,
      latestDispatchKey: latestCompleted.dispatchKey,
      evidence,
    };
  }

  return {
    status: "resolved",
    label: "复检闭环",
    detail: `复检完成后未恢复失败已归零，已记录 ${completedTasks.length} 次复检完成依据。`,
    actionLabel: "查看任务中心",
    href: "/tasks",
    completedRechecks: completedTasks.length,
    unresolvedFailures: 0,
    latestDispatchKey: latestCompleted.dispatchKey,
    evidence,
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

function isProjectStartDecisionReceipt(receipt: GateActionReceipt) {
  return receipt.actionId.startsWith("project_start_decision:");
}

function projectStartDecisionStatus(receipt: GateActionReceipt) {
  return receipt.actionId.split(":")[1] ?? "";
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

function projectIdFromReceiptHref(href: string) {
  return href.match(/\/projects\/([^/#?]+)/)?.[1] ?? "unknown";
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

function precisePercent(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 10000) / 100 : 0;
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

export function buildGateProjectStartValidationDispatchItems(
  receipts: GateActionReceipt[],
  persistedTasks: PersistedGatePlatformDispatchTask[] = [],
): GatePlatformGrowthDispatchItem[] {
  const sorted = trimGateActionReceipts(receipts, defaultGateActionReceiptLimit);
  const persistedByKey = new Map(persistedTasks.map((task) => [task.dispatchKey, task]));
  const latestByPlatform = new Map<string, GateActionReceipt>();

  for (const receipt of sorted) {
    if (!isProjectStartDecisionReceipt(receipt) || receipt.status !== "succeeded") continue;
    if (receipt.recheck.status === "blocked" || projectStartDecisionStatus(receipt) === "pause") continue;
    const platform = gateActionReceiptPlatform(receipt);
    if (!latestByPlatform.has(platform.id)) latestByPlatform.set(platform.id, receipt);
  }

  const specs: Array<{
    suffix: string;
    stage: GatePlatformGrowthReviewStage;
    ownerRole: string;
    titleSuffix: string;
    detail: string;
    dueLabel: string;
    actionLabel: string;
    anchor: string;
    acceptanceCriteria: string[];
  }> = [
    {
      suffix: "first_three_review",
      stage: "start_first_three_review",
      ownerRole: "首轮审稿编辑",
      titleSuffix: "前三章审稿验证",
      detail: "检查前三章是否执行首轮平台打法，重点看开头兑现、冲突升级、章末追读和平台调性。",
      dueLabel: "今天",
      actionLabel: "派给审稿编辑",
      anchor: "#ai-pipeline",
      acceptanceCriteria: ["前三章至少完成一轮审稿", "首轮打法执行问题已列出", "低分章节进入二改或重写队列"],
    },
    {
      suffix: "opening_diagnostic",
      stage: "start_opening_diagnostic",
      ownerRole: "开头诊断编辑",
      titleSuffix: "开头钩子诊断",
      detail: "只盯第一屏和第一章：钩子是否够快、人物压力是否明确、平台避坑是否被真正避开。",
      dueLabel: "今天",
      actionLabel: "派给开头编辑",
      anchor: "#first-three-rewrite",
      acceptanceCriteria: ["开头钩子诊断已完成", "慢热或设定解释问题已标出", "需要重写的段落有明确处理入口"],
    },
    {
      suffix: "platform_package",
      stage: "start_platform_package",
      ownerRole: "平台包装编辑",
      titleSuffix: "平台包装验证",
      detail: "把标题、简介、标签和卖点按目标平台重排，确认开书打法不只存在于正文，也进入投稿包装。",
      dueLabel: "24 小时内",
      actionLabel: "派给包装编辑",
      anchor: "#platform-export",
      acceptanceCriteria: ["标题简介标签已有候选", "卖点和目标平台读者承诺一致", "保存或准备保存发布包基准"],
    },
  ];

  return [...latestByPlatform.entries()].flatMap(([platformId, receipt]) => {
    const platform = gateActionReceiptPlatform(receipt);
    const projectId = projectIdFromReceiptHref(receipt.href);

    return specs.map((spec): GatePlatformGrowthDispatchItem => {
      const dispatchKey = `${platformId}:start_validation:${spec.suffix}:${projectId}`;
      const persisted = persistedByKey.get(dispatchKey);
      return {
        id: dispatchKey,
        platformId,
        platformName: platform.name,
        stage: spec.stage,
        state: persisted?.state ?? "queued",
        priorityScore: spec.stage === "start_first_three_review" ? 82 : spec.stage === "start_opening_diagnostic" ? 78 : 72,
        ownerRole: spec.ownerRole,
        title: `${platform.name} ${spec.titleSuffix}`,
        detail: spec.detail,
        dueLabel: spec.dueLabel,
        actionLabel: spec.actionLabel,
        href: projectAnchorHref(receipt.href, spec.anchor),
        acceptanceCriteria: spec.acceptanceCriteria,
        evidence: adviceEvidence([receipt]),
        reviewLatestAt: receipt.createdAt,
      };
    });
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
    const latestStartDecision = latestReceiptFor(group.receipts, (receipt) => isProjectStartDecisionReceipt(receipt) && receipt.status === "succeeded");

    if (latestStartDecision?.recheck.status === "blocked") {
      const state = adviceState(latestAdviceResponse(group.receipts, "handle_failure", group.platformId), latestStartDecision);
      advice.push({
        id: `${group.platformId}:start-decision-blocked`,
        severity: state === "in_progress" ? "warning" : "urgent",
        state,
        platformId: group.platformId,
        platformName: group.platformName,
        headline: state === "in_progress" ? `${group.platformName} 开书策略避坑已响应，等重写回执。` : `${group.platformName} 开书策略卡住，先处理开头避坑。`,
        detail: state === "in_progress"
          ? "已经进入开头修复位，但还没看到后续重写、审稿或验证回执。修完前三章后再刷新总闸门。"
          : "开书策略回执要求先停用旧打法。别继续扩批，先重写前三章开头和平台包装，再小批验证。",
        action: {
          kind: "handle_failure",
          label: "处理开头避坑",
          href: latestStartDecision.href,
        },
        evidence: adviceEvidence([latestStartDecision]),
      });
      continue;
    }

    if (latestStartDecision && projectStartDecisionStatus(latestStartDecision) !== "pause") {
      const laterValidation = latestReceiptFor(group.receipts, (receipt) => (
        receiptIsAfter(receipt, latestStartDecision)
        && (
          receipt.executionType === "recommended_batch"
          || actionTypeFromReceipt(receipt) === "rewrite_first_three"
          || actionTypeFromReceipt(receipt) === "generate_asset_variants"
          || receipt.taskId !== null
        )
      ));
      if (!laterValidation) {
        const state = adviceState(latestAdviceResponse(group.receipts, "start_gate_action", group.platformId), latestStartDecision);
        advice.push({
          id: `${group.platformId}:start-decision-validate`,
          severity: state === "in_progress" ? "warning" : "opportunity",
          state,
          platformId: group.platformId,
          platformName: group.platformName,
          headline: state === "in_progress" ? `${group.platformName} 首轮验证已响应，等执行回执。` : `${group.platformName} 开书打法已落库，别停在资料层。`,
          detail: state === "in_progress"
            ? "已经进入首轮验证位置，但还没有看到批量审稿、前三章重写或平台包装动作。补一条真实执行回执。"
            : "平台土壤和首轮打法已经写入项目，下一步要跑前三章、审稿或平台包装，让打法进入真实样本。",
          action: {
            kind: "start_gate_action",
            label: "跑首轮验证",
            href: projectAnchorHref(latestStartDecision.href, "#ai-pipeline"),
          },
          evidence: adviceEvidence([latestStartDecision]),
        });
        continue;
      }
    }

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
  const persistedPayload = payload ?? {
    startTactics: receipt.startTactics ?? [],
    routeEffectSummary: receipt.batchEffectSummary ?? undefined,
  };
  const response = await fetch("/api/gate/action-receipts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ receipt, payload: persistedPayload }),
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

const projectStartValidationStages: GatePlatformGrowthReviewStage[] = [
  "start_first_three_review",
  "start_opening_diagnostic",
  "start_platform_package",
];

function isProjectStartValidationStage(stage: GatePlatformGrowthReviewStage) {
  return projectStartValidationStages.includes(stage);
}

function projectStartValidationStageLabel(stage: GatePlatformGrowthReviewStage) {
  if (stage === "start_first_three_review") return "前三章审稿验证";
  if (stage === "start_opening_diagnostic") return "开头钩子诊断";
  if (stage === "start_platform_package") return "平台包装验证";
  return "首轮验证";
}

function projectStartValidationGroupKey(task: PersistedGatePlatformDispatchTask) {
  const projectId = task.projectId ?? projectIdFromReceiptHref(task.href);
  return `${task.platformId}:${projectId}`;
}

function startValidationStatusLabel(status: GateProjectStartValidationStatus) {
  if (status === "ready") return "首轮验证收齐";
  if (status === "missing_evidence") return "缺完成依据";
  return "首轮验证未收口";
}

export function buildGateProjectStartValidationReview(
  tasks: PersistedGatePlatformDispatchTask[],
): GateProjectStartValidationReview {
  const groups = new Map<string, PersistedGatePlatformDispatchTask[]>();

  for (const task of tasks) {
    if (!isProjectStartValidationStage(task.stage)) continue;
    const key = projectStartValidationGroupKey(task);
    groups.set(key, [...(groups.get(key) ?? []), task]);
  }

  const plans = [...groups.entries()].map(([key, groupTasks]): GateProjectStartValidationPlan => {
    const firstTask = groupTasks[0];
    const stageTasks = new Map(groupTasks.map((task) => [task.stage, task]));
    const missingStages = projectStartValidationStages.filter((stage) => {
      const task = stageTasks.get(stage);
      return !task || task.state !== "completed" || !task.completionEvidence.trim();
    });
    const completedItems = groupTasks.filter((task) => task.state === "completed").length;
    const activeItems = groupTasks.filter((task) => task.state !== "completed").length;
    const missingEvidenceItems = groupTasks.filter((task) => task.state === "completed" && !task.completionEvidence.trim()).length;
    const latestAt = groupTasks
      .map((task) => task.completedAt ?? task.updatedAt)
      .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? firstTask.updatedAt;
    const status: GateProjectStartValidationStatus = missingStages.length === 0
      ? "ready"
      : missingEvidenceItems > 0
        ? "missing_evidence"
        : "active";
    const firstMissingStage = missingStages[0];
    const nextAction = status === "ready"
      ? "首轮验证三件套已收齐，可以进入发布包定稿和首轮数据回收。"
      : status === "missing_evidence"
        ? `补齐${projectStartValidationStageLabel(firstMissingStage)}的完成依据，否则不能放行首轮验证。`
        : `先完成${projectStartValidationStageLabel(firstMissingStage)}，别急着进入下一轮加码。`;

    return {
      key,
      projectId: firstTask.projectId ?? projectIdFromReceiptHref(firstTask.href),
      platformId: firstTask.platformId,
      platformName: firstTask.platformName,
      status,
      label: startValidationStatusLabel(status),
      nextAction,
      href: firstTask.href,
      totalItems: projectStartValidationStages.length,
      completedItems,
      activeItems,
      missingEvidenceItems,
      missingStages,
      evidence: groupTasks.flatMap((task) => (
        task.completionEvidence.trim()
          ? [`${task.title}：${task.completionEvidence.trim()}`]
          : task.evidence.slice(0, 1)
      )),
      latestAt,
    };
  });

  const readyPlans = plans.filter((plan) => plan.status === "ready").length;
  const missingEvidencePlans = plans.filter((plan) => plan.status === "missing_evidence").length;
  const activePlans = plans.filter((plan) => plan.status === "active").length;
  const totalItems = plans.reduce((sum, plan) => sum + plan.totalItems, 0);
  const completedItems = plans.reduce((sum, plan) => sum + plan.completedItems, 0);
  const activeItems = plans.reduce((sum, plan) => sum + plan.activeItems, 0);
  const missingEvidenceItems = plans.reduce((sum, plan) => sum + plan.missingEvidenceItems, 0);

  return {
    summary: {
      totalPlans: plans.length,
      readyPlans,
      missingEvidencePlans,
      activePlans,
      totalItems,
      completedItems,
      activeItems,
      missingEvidenceItems,
    },
    nextActions: [
      missingEvidenceItems > 0 ? `${missingEvidenceItems} 个首轮验证任务缺完成依据，先补证据。` : null,
      activeItems > 0 ? `${activeItems} 个首轮验证任务还没完成，优先收口前三章、开头和包装。` : null,
      plans.length > 0 && readyPlans === plans.length ? "所有首轮验证计划都已收齐，可以进入发布包定稿和首轮数据回收。" : null,
      plans.length === 0 ? "还没有首轮验证派单。先在总闸门执行开书策略，再派出三张验证卡。" : null,
    ].filter((action): action is string => Boolean(action)),
    plans: plans.sort((left, right) => {
      const statusWeight: Record<GateProjectStartValidationStatus, number> = { missing_evidence: 0, active: 1, ready: 2 };
      const statusDiff = statusWeight[left.status] - statusWeight[right.status];
      if (statusDiff !== 0) return statusDiff;
      return new Date(right.latestAt).getTime() - new Date(left.latestAt).getTime();
    }),
  };
}

export function buildGateProjectStartNextDispatchItems(
  review: GateProjectStartValidationReview,
  persistedTasks: PersistedGatePlatformDispatchTask[] = [],
): GatePlatformGrowthDispatchItem[] {
  const persistedByKey = new Map(persistedTasks.map((task) => [task.dispatchKey, task]));
  const specs: Array<{
    suffix: string;
    stage: GatePlatformGrowthReviewStage;
    ownerRole: string;
    titleSuffix: string;
    detail: string;
    dueLabel: string;
    actionLabel: string;
    anchor: string;
    acceptanceCriteria: string[];
    priorityScore: number;
  }> = [
    {
      suffix: "publish_finalize",
      stage: "start_publish_finalize",
      ownerRole: "发布包主编",
      titleSuffix: "发布包定稿",
      detail: "在首轮验证通过后，把标题、简介、标签、前三章卖点和平台避坑检查压成一个可发布基准版本。",
      dueLabel: "今天",
      actionLabel: "派给发布主编",
      anchor: "#platform-export",
      acceptanceCriteria: ["发布包定稿版本已保存", "标题简介标签与前三章承诺一致", "平台避坑检查没有未处理红项"],
      priorityScore: 76,
    },
    {
      suffix: "metrics_recovery",
      stage: "start_metrics_recovery",
      ownerRole: "首轮数据运营",
      titleSuffix: "首轮数据回收",
      detail: "定义首轮投放后的数据口径和回收节奏，至少要能拿到曝光、点击、追读或收藏中的核心指标。",
      dueLabel: "发布后 24 小时",
      actionLabel: "派给数据运营",
      anchor: "#platform-export",
      acceptanceCriteria: ["首轮曝光、点击、追读或收藏口径已确定", "数据回收时间点已写清", "下一轮优化判断口径已保存"],
      priorityScore: 68,
    },
  ];

  return review.plans
    .filter((plan) => plan.status === "ready")
    .flatMap((plan) => specs.map((spec): GatePlatformGrowthDispatchItem => {
      const projectId = plan.projectId ?? "unknown";
      const dispatchKey = `${plan.platformId}:start_next:${spec.suffix}:${projectId}`;
      const persisted = persistedByKey.get(dispatchKey);
      const href = plan.projectId ? `/projects/${plan.projectId}${spec.anchor}` : plan.href;

      return {
        id: dispatchKey,
        platformId: plan.platformId,
        platformName: plan.platformName,
        stage: spec.stage,
        state: persisted?.state ?? "queued",
        priorityScore: spec.priorityScore,
        ownerRole: spec.ownerRole,
        title: `${plan.platformName} ${spec.titleSuffix}`,
        detail: spec.detail,
        dueLabel: spec.dueLabel,
        actionLabel: spec.actionLabel,
        href,
        acceptanceCriteria: spec.acceptanceCriteria,
        evidence: plan.evidence,
        reviewLatestAt: plan.latestAt,
      };
    }));
}

function projectStartMetricDecisionFromMetric(
  task: PersistedGatePlatformDispatchTask,
  metric: GatePublishEffectMetricSnapshot | null,
): Pick<GateProjectStartMetricDecisionItem, "status" | "label" | "detail" | "actionLabel" | "href" | "priorityScore" | "evidence"> {
  if (!metric) {
    return {
      status: "wait_metric",
      label: "等首轮数据",
      detail: `${task.platformName} 已完成数据回收派单，但还没有看到回收后的发布效果回执。先补真实数据，再做平台判断。`,
      actionLabel: "回填首轮数据",
      href: task.href,
      priorityScore: task.priorityScore,
      evidence: ["缺少首轮效果回执", ...task.evidence].slice(0, 3),
    };
  }

  if (metric.clickRatePercent < 6 || metric.favoriteRatePercent < 1.5) {
    return {
      status: "repair_packaging",
      label: "先修包装",
      detail: `${task.platformName} 首轮点击率 ${metric.clickRatePercent}%，收藏率 ${metric.favoriteRatePercent}%。入口承诺偏弱，先修标题、简介、标签和卖点包装。`,
      actionLabel: "修包装",
      href: task.href.replace("#platform-export", "#submission-package"),
      priorityScore: Math.max(task.priorityScore, 84),
      evidence: [`点击率 ${metric.clickRatePercent}%`, `收藏率 ${metric.favoriteRatePercent}%`, `追读率 ${metric.followRatePercent}%`],
    };
  }

  if (metric.followRatePercent < 1.2) {
    return {
      status: "rewrite_opening",
      label: "重写开头",
      detail: `${task.platformName} 首轮点击能进来，但追读率只有 ${metric.followRatePercent}%。正文开头兑现弱，先回到前三章和第一章钩子。`,
      actionLabel: "重写开头",
      href: task.href.replace("#platform-export", "#first-three-rewrite"),
      priorityScore: Math.max(task.priorityScore, 80),
      evidence: [`点击率 ${metric.clickRatePercent}%`, `追读率 ${metric.followRatePercent}%`],
    };
  }

  return {
    status: "scale",
    label: "可小步加码",
    detail: `${task.platformName} 首轮点击率 ${metric.clickRatePercent}%，收藏率 ${metric.favoriteRatePercent}%，追读率 ${metric.followRatePercent}%。可以进入小范围加码，但下一轮必须继续回收数据。`,
    actionLabel: "进入小步加码",
    href: task.href,
    priorityScore: Math.max(task.priorityScore, 78),
    evidence: [`点击率 ${metric.clickRatePercent}%`, `收藏率 ${metric.favoriteRatePercent}%`, `追读率 ${metric.followRatePercent}%`],
  };
}

export function buildGateProjectStartMetricDecision(
  tasks: PersistedGatePlatformDispatchTask[],
  receipts: GateActionReceipt[] = [],
): GateProjectStartMetricDecision {
  const operationalReceipts = trimGateActionReceipts(receipts, 100)
    .filter((receipt) => !isAuditMetaReceipt(receipt));
  const metricsByPlatform = new Map<string, GatePublishEffectMetricSnapshot[]>();

  for (const receipt of operationalReceipts) {
    const metric = metricFromReceipt(receipt);
    if (!metric) continue;
    const metrics = metricsByPlatform.get(metric.platformId) ?? [];
    metrics.push(metric);
    metricsByPlatform.set(metric.platformId, metrics);
  }

  for (const metrics of metricsByPlatform.values()) {
    metrics.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  }

  const metricTasks = tasks
    .filter((task) => task.stage === "start_metrics_recovery" && task.state === "completed" && task.completionEvidence.trim())
    .sort((left, right) => new Date(right.completedAt ?? right.updatedAt).getTime() - new Date(left.completedAt ?? left.updatedAt).getTime());
  const latestTaskByPlatform = new Map<string, PersistedGatePlatformDispatchTask>();
  for (const task of metricTasks) {
    if (!latestTaskByPlatform.has(task.platformId)) latestTaskByPlatform.set(task.platformId, task);
  }

  const items = [...latestTaskByPlatform.values()].map((task): GateProjectStartMetricDecisionItem => {
    const completedAt = validDate(task.completedAt) ?? validDate(task.updatedAt);
    const metric = (metricsByPlatform.get(task.platformId) ?? [])
      .find((candidate) => !completedAt || new Date(candidate.createdAt).getTime() > completedAt.getTime()) ?? null;
    const decision = projectStartMetricDecisionFromMetric(task, metric);

    return {
      dispatchKey: task.dispatchKey,
      projectId: task.projectId,
      platformId: task.platformId,
      platformName: task.platformName,
      status: decision.status,
      label: decision.label,
      detail: decision.detail,
      actionLabel: decision.actionLabel,
      href: decision.href,
      priorityScore: decision.priorityScore,
      metricAt: metric?.createdAt ?? null,
      clickRatePercent: metric?.clickRatePercent ?? null,
      favoriteRatePercent: metric?.favoriteRatePercent ?? null,
      followRatePercent: metric?.followRatePercent ?? null,
      evidence: decision.evidence,
    };
  });

  const scale = items.filter((item) => item.status === "scale").length;
  const repairPackaging = items.filter((item) => item.status === "repair_packaging").length;
  const rewriteOpening = items.filter((item) => item.status === "rewrite_opening").length;
  const waitMetric = items.filter((item) => item.status === "wait_metric").length;
  const statusWeight: Record<GateProjectStartMetricDecisionStatus, number> = {
    repair_packaging: 0,
    rewrite_opening: 1,
    wait_metric: 2,
    scale: 3,
  };

  return {
    summary: {
      total: items.length,
      scale,
      repairPackaging,
      rewriteOpening,
      waitMetric,
    },
    nextActions: [
      repairPackaging > 0 ? `${repairPackaging} 个平台首轮入口弱，先修标题简介标签。` : null,
      rewriteOpening > 0 ? `${rewriteOpening} 个平台追读弱，回到开头和前三章重写。` : null,
      waitMetric > 0 ? `${waitMetric} 个平台还缺首轮真实数据，先补效果回执。` : null,
      scale > 0 ? `${scale} 个平台首轮数据可加码，但必须小范围推进。` : null,
      items.length === 0 ? "还没有完成首轮数据回收派单，先收数据再做平台决策。" : null,
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

function projectStartMetricDispatchSpec(item: GateProjectStartMetricDecisionItem) {
  if (item.status === "repair_packaging") {
    return {
      suffix: "repair_packaging",
      stage: "start_repair_packaging" as const,
      ownerRole: "平台包装编辑",
      titleSuffix: "首轮包装修复",
      detail: `${item.detail} 基于首轮数据修正标题、简介、标签和入口卖点，先修入口再谈扩量。`,
      dueLabel: "今天",
      actionLabel: "派给包装编辑",
      acceptanceCriteria: ["标题简介标签完成首轮修复", "新卖点与前三章兑现一致", "保存修复前后对照依据"],
      href: item.href,
    };
  }

  if (item.status === "rewrite_opening") {
    return {
      suffix: "rewrite_opening",
      stage: "start_rewrite_opening" as const,
      ownerRole: "开头重写编辑",
      titleSuffix: "首轮开头重写",
      detail: `${item.detail} 重点重写第一章钩子、前三章追读点和兑现节奏。`,
      dueLabel: "今天",
      actionLabel: "派给开头编辑",
      acceptanceCriteria: ["第一章钩子和前三章追读点完成重写", "重写后再次跑开头诊断", "保留旧版与新版对照"],
      href: item.href,
    };
  }

  if (item.status === "scale") {
    return {
      suffix: "scale",
      stage: "scale_up" as const,
      ownerRole: "增长运营",
      titleSuffix: "首轮小步加码",
      detail: `${item.detail} 加码只能小范围推进，并且下一轮必须继续回填效果。`,
      dueLabel: "下一轮更新前",
      actionLabel: "派给增长运营",
      acceptanceCriteria: ["小步加码范围已限定", "加码版本和基准版本已写清", "下一轮效果回收时间已确定"],
      href: item.href,
    };
  }

  return null;
}

export function buildGateProjectStartMetricDispatchItems(
  decision: GateProjectStartMetricDecision,
  persistedTasks: PersistedGatePlatformDispatchTask[] = [],
): GatePlatformGrowthDispatchItem[] {
  const persistedByKey = new Map(persistedTasks.map((task) => [task.dispatchKey, task]));

  return decision.items
    .map((item): GatePlatformGrowthDispatchItem | null => {
      const spec = projectStartMetricDispatchSpec(item);
      if (!spec) return null;
      const projectId = item.projectId ?? "unknown";
      const dispatchKey = `${item.platformId}:start_metric:${spec.suffix}:${projectId}`;
      const persisted = persistedByKey.get(dispatchKey);

      return {
        id: dispatchKey,
        platformId: item.platformId,
        platformName: item.platformName,
        stage: spec.stage,
        state: persisted?.state ?? "queued",
        priorityScore: item.priorityScore,
        ownerRole: spec.ownerRole,
        title: `${item.platformName} ${spec.titleSuffix}`,
        detail: spec.detail,
        dueLabel: spec.dueLabel,
        actionLabel: spec.actionLabel,
        href: spec.href,
        acceptanceCriteria: spec.acceptanceCriteria,
        evidence: item.evidence,
        reviewLatestAt: item.metricAt ?? new Date().toISOString(),
      };
    })
    .filter((item): item is GatePlatformGrowthDispatchItem => Boolean(item));
}

function projectStartMetricFollowupSpec(task: PersistedGatePlatformDispatchTask) {
  if (task.stage === "start_repair_packaging") {
    return {
      suffix: "publish_finalize",
      stage: "start_publish_finalize" as const,
      ownerRole: "发布包主编",
      titleSuffix: "修包装后发布包复检",
      detail: `${task.platformName} 已完成首轮包装修复，必须回到发布包定稿复检，确认标题、简介、标签和前三章兑现没有打架。`,
      dueLabel: "今天",
      actionLabel: "派给发布主编",
      anchor: "#platform-export",
      acceptanceCriteria: ["修复后的标题简介标签已进入发布包复检", "新入口承诺与前三章兑现一致", "保存修复后发布包基准版本"],
    };
  }

  if (task.stage === "start_rewrite_opening") {
    return {
      suffix: "first_three_recheck",
      stage: "start_first_three_review" as const,
      ownerRole: "前三章审稿编辑",
      titleSuffix: "开头重写后三章重验",
      detail: `${task.platformName} 已完成首轮开头重写，回到前三章审稿验证钩子、追读点和爽点兑现。`,
      dueLabel: "今天",
      actionLabel: "派给审稿编辑",
      anchor: "#first-three-rewrite",
      acceptanceCriteria: ["重写后的前三章已重新审稿", "第一章钩子和第三章追读点重新打分", "保留重写后审稿结论"],
    };
  }

  if (task.stage === "scale_up" && task.dispatchKey.includes(":start_metric:")) {
    return {
      suffix: "next_metrics_recovery",
      stage: "start_metrics_recovery" as const,
      ownerRole: "首轮数据运营",
      titleSuffix: "加码后二轮数据回收",
      detail: `${task.platformName} 已完成首轮小步加码，下一步只能回收加码后的真实数据，不能直接继续扩量。`,
      dueLabel: "加码后 24 小时",
      actionLabel: "派给数据运营",
      anchor: "#platform-export",
      acceptanceCriteria: ["加码后的曝光、点击、追读或收藏已回收", "加码范围与首轮基准可对照", "下一轮平台判断口径已保存"],
    };
  }

  return null;
}

export function buildGateProjectStartMetricFollowupDispatchItems(
  tasks: PersistedGatePlatformDispatchTask[],
  persistedTasks: PersistedGatePlatformDispatchTask[] = [],
): GatePlatformGrowthDispatchItem[] {
  const persistedByKey = new Map(persistedTasks.map((task) => [task.dispatchKey, task]));

  return tasks
    .filter((task) => task.state === "completed" && task.completionEvidence.trim())
    .map((task): GatePlatformGrowthDispatchItem | null => {
      const spec = projectStartMetricFollowupSpec(task);
      if (!spec) return null;
      const projectId = task.projectId ?? projectIdFromReceiptHref(task.href) ?? "unknown";
      const dispatchKey = `${task.platformId}:start_metric_followup:${spec.suffix}:${projectId}`;
      const persisted = persistedByKey.get(dispatchKey);
      const href = projectId !== "unknown" ? `/projects/${projectId}${spec.anchor}` : task.href;

      return {
        id: dispatchKey,
        platformId: task.platformId,
        platformName: task.platformName,
        stage: spec.stage,
        state: persisted?.state ?? "queued",
        priorityScore: Math.max(task.priorityScore, 72),
        ownerRole: spec.ownerRole,
        title: `${task.platformName} ${spec.titleSuffix}`,
        detail: spec.detail,
        dueLabel: spec.dueLabel,
        actionLabel: spec.actionLabel,
        href,
        acceptanceCriteria: spec.acceptanceCriteria,
        evidence: [`上轮完成依据：${task.completionEvidence.trim()}`, ...task.evidence].slice(0, 4),
        reviewLatestAt: task.completedAt ?? task.updatedAt,
      };
    })
    .filter((item): item is GatePlatformGrowthDispatchItem => Boolean(item));
}

function projectSecondMetricDecisionFromMetric(
  task: PersistedGatePlatformDispatchTask,
  metric: GatePublishEffectMetricSnapshot | null,
): Pick<GateProjectSecondMetricDecisionItem, "status" | "label" | "detail" | "actionLabel" | "href" | "priorityScore" | "evidence"> {
  if (!metric) {
    return {
      status: "wait_metric",
      label: "等二轮数据",
      detail: `${task.platformName} 已完成加码后二轮数据回收派单，但还没有看到回收后的效果回执。先补真实数据，再做继续、修复或撤退判断。`,
      actionLabel: "回填二轮数据",
      href: task.href,
      priorityScore: task.priorityScore,
      evidence: ["缺少二轮效果回执", ...task.evidence].slice(0, 3),
    };
  }

  const zeroConversion = metric.views >= 100 && metric.clicks === 0 && metric.follows === 0;
  if (zeroConversion) {
    return {
      status: "pause",
      label: "暂停",
      detail: `${task.platformName} 二轮加码后有曝光但点击和追读为 0。继续推只会扩大损失，先暂停并复盘入口卖点。`,
      actionLabel: "暂停并复盘",
      href: task.href,
      priorityScore: Math.max(task.priorityScore, 92),
      evidence: [`曝光 ${metric.views}`, `点击 ${metric.clicks}`, `追读 ${metric.follows}`],
    };
  }

  if (metric.clickRatePercent < 4 || metric.favoriteRatePercent < 1.2 || metric.followRatePercent < 0.6) {
    return {
      status: "pivot_platform",
      label: "换打法/换平台",
      detail: `${task.platformName} 二轮加码后的点击率 ${metric.clickRatePercent}%，收藏率 ${metric.favoriteRatePercent}%，追读率 ${metric.followRatePercent}%。平台匹配或入口打法偏离，进入换打法/换平台判断。`,
      actionLabel: "制定换平台方案",
      href: task.href,
      priorityScore: Math.max(task.priorityScore, 86),
      evidence: [`点击率 ${precisePercent(metric.clicks, metric.views)}%`, `收藏率 ${precisePercent(metric.favorites, metric.views)}%`, `追读率 ${precisePercent(metric.follows, metric.views)}%`],
    };
  }

  if (metric.clickRatePercent < 7 || metric.favoriteRatePercent < 2.5 || metric.followRatePercent < 1.2) {
    return {
      status: "repair_tactic",
      label: "修打法",
      detail: `${task.platformName} 二轮数据没有崩，但转化还不够硬。先修标题、简介、标签和前三章兑现，再考虑下一轮。`,
      actionLabel: "修投稿打法",
      href: task.href.replace("#platform-export", "#submission-package"),
      priorityScore: Math.max(task.priorityScore, 78),
      evidence: [`点击率 ${precisePercent(metric.clicks, metric.views)}%`, `收藏率 ${precisePercent(metric.favorites, metric.views)}%`, `追读率 ${precisePercent(metric.follows, metric.views)}%`],
    };
  }

  return {
    status: "continue_scale",
    label: "继续加码",
    detail: `${task.platformName} 二轮加码后点击率 ${metric.clickRatePercent}%，收藏率 ${metric.favoriteRatePercent}%，追读率 ${metric.followRatePercent}%。可以继续小步加码，但仍要保留对照组。`,
    actionLabel: "继续小步加码",
    href: task.href,
    priorityScore: Math.max(task.priorityScore, 80),
    evidence: [`点击率 ${precisePercent(metric.clicks, metric.views)}%`, `收藏率 ${precisePercent(metric.favorites, metric.views)}%`, `追读率 ${precisePercent(metric.follows, metric.views)}%`],
  };
}

export function buildGateProjectSecondMetricDecision(
  tasks: PersistedGatePlatformDispatchTask[],
  receipts: GateActionReceipt[] = [],
): GateProjectSecondMetricDecision {
  const operationalReceipts = trimGateActionReceipts(receipts, 100)
    .filter((receipt) => !isAuditMetaReceipt(receipt));
  const metricsByPlatform = new Map<string, GatePublishEffectMetricSnapshot[]>();

  for (const receipt of operationalReceipts) {
    const metric = metricFromReceipt(receipt);
    if (!metric) continue;
    const metrics = metricsByPlatform.get(metric.platformId) ?? [];
    metrics.push(metric);
    metricsByPlatform.set(metric.platformId, metrics);
  }

  for (const metrics of metricsByPlatform.values()) {
    metrics.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  }

  const secondMetricTasks = tasks
    .filter((task) => (
      task.stage === "start_metrics_recovery"
      && task.dispatchKey.includes(":start_metric_followup:next_metrics_recovery:")
      && task.state === "completed"
      && task.completionEvidence.trim()
    ))
    .sort((left, right) => new Date(right.completedAt ?? right.updatedAt).getTime() - new Date(left.completedAt ?? left.updatedAt).getTime());
  const latestTaskByPlatform = new Map<string, PersistedGatePlatformDispatchTask>();
  for (const task of secondMetricTasks) {
    if (!latestTaskByPlatform.has(task.platformId)) latestTaskByPlatform.set(task.platformId, task);
  }

  const items = [...latestTaskByPlatform.values()].map((task): GateProjectSecondMetricDecisionItem => {
    const completedAt = validDate(task.completedAt) ?? validDate(task.updatedAt);
    const metric = (metricsByPlatform.get(task.platformId) ?? [])
      .find((candidate) => !completedAt || new Date(candidate.createdAt).getTime() > completedAt.getTime()) ?? null;
    const decision = projectSecondMetricDecisionFromMetric(task, metric);

    return {
      dispatchKey: task.dispatchKey,
      projectId: task.projectId,
      platformId: task.platformId,
      platformName: task.platformName,
      status: decision.status,
      label: decision.label,
      detail: decision.detail,
      actionLabel: decision.actionLabel,
      href: decision.href,
      priorityScore: decision.priorityScore,
      metricAt: metric?.createdAt ?? null,
      clickRatePercent: metric?.clickRatePercent ?? null,
      favoriteRatePercent: metric?.favoriteRatePercent ?? null,
      followRatePercent: metric?.followRatePercent ?? null,
      evidence: decision.evidence,
    };
  });

  const continueScale = items.filter((item) => item.status === "continue_scale").length;
  const repairTactic = items.filter((item) => item.status === "repair_tactic").length;
  const pivotPlatform = items.filter((item) => item.status === "pivot_platform").length;
  const pause = items.filter((item) => item.status === "pause").length;
  const waitMetric = items.filter((item) => item.status === "wait_metric").length;
  const statusWeight: Record<GateProjectSecondMetricDecisionStatus, number> = {
    pause: 0,
    pivot_platform: 1,
    repair_tactic: 2,
    wait_metric: 3,
    continue_scale: 4,
  };

  return {
    summary: {
      total: items.length,
      continueScale,
      repairTactic,
      pivotPlatform,
      pause,
      waitMetric,
    },
    nextActions: [
      pause > 0 ? `${pause} 个平台二轮加码后要暂停，别继续扩大损失。` : null,
      pivotPlatform > 0 ? `${pivotPlatform} 个平台需要换打法或换平台，别硬推。` : null,
      repairTactic > 0 ? `${repairTactic} 个平台二轮转化偏弱，先修打法再继续。` : null,
      waitMetric > 0 ? `${waitMetric} 个平台缺二轮真实数据，先补效果回执。` : null,
      continueScale > 0 ? `${continueScale} 个平台二轮表现可继续，但只能小步加码并保留对照。` : null,
      items.length === 0 ? "还没有完成加码后二轮数据回收，先把回流任务收口。" : null,
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

function projectSecondMetricDispatchSpec(item: GateProjectSecondMetricDecisionItem) {
  if (item.status === "pause") {
    return {
      suffix: "pause",
      stage: "pause_platform" as const,
      ownerRole: "复盘负责人",
      titleSuffix: "二轮暂停复盘",
      detail: `${item.detail} 暂停不是放弃，是先停止扩大损失，复盘入口、平台和正文兑现。`,
      dueLabel: "今天",
      actionLabel: "派给复盘负责人",
      href: item.href,
      acceptanceCriteria: ["暂停原因和复盘结论已保存", "继续投入条件已写清", "替代平台或修复动作已列出"],
    };
  }

  if (item.status === "pivot_platform") {
    return {
      suffix: "pivot_platform",
      stage: "pivot_platform" as const,
      ownerRole: "平台策略",
      titleSuffix: "二轮换平台/换打法",
      detail: `${item.detail} 先定义新平台或新打法，再决定是否迁移主力资源。`,
      dueLabel: "今天",
      actionLabel: "派给平台策略",
      href: item.href,
      acceptanceCriteria: ["迁移平台或新打法方案已确定", "旧平台继续投入上限已写清", "新平台验证口径已保存"],
    };
  }

  if (item.status === "repair_tactic") {
    return {
      suffix: "repair_tactic",
      stage: "repair_tactic" as const,
      ownerRole: "包装策略编辑",
      titleSuffix: "二轮打法修复",
      detail: `${item.detail} 把二轮弱项拆回标题、简介、标签、前三章兑现和入口承诺。`,
      dueLabel: "今天",
      actionLabel: "派给包装策略编辑",
      href: item.href,
      acceptanceCriteria: ["二轮弱项对应的标题简介标签修复完成", "前三章兑现点和入口承诺重新对齐", "下一轮复测口径已保存"],
    };
  }

  if (item.status === "continue_scale") {
    return {
      suffix: "continue_scale",
      stage: "scale_up" as const,
      ownerRole: "增长运营",
      titleSuffix: "二轮后继续小步加码",
      detail: `${item.detail} 继续加码必须保留基准版本和效果回收时间，别把好信号一次用光。`,
      dueLabel: "下一轮更新前",
      actionLabel: "派给增长运营",
      href: item.href,
      acceptanceCriteria: ["第三轮小步加码范围已限定", "基准版本和加码版本已区分", "第三轮效果回收时间已确定"],
    };
  }

  return null;
}

export function buildGateProjectSecondMetricDispatchItems(
  decision: GateProjectSecondMetricDecision,
  persistedTasks: PersistedGatePlatformDispatchTask[] = [],
): GatePlatformGrowthDispatchItem[] {
  const persistedByKey = new Map(persistedTasks.map((task) => [task.dispatchKey, task]));

  return decision.items
    .map((item): GatePlatformGrowthDispatchItem | null => {
      const spec = projectSecondMetricDispatchSpec(item);
      if (!spec) return null;
      const projectId = item.projectId ?? "unknown";
      const dispatchKey = `${item.platformId}:second_metric:${spec.suffix}:${projectId}`;
      const persisted = persistedByKey.get(dispatchKey);

      return {
        id: dispatchKey,
        platformId: item.platformId,
        platformName: item.platformName,
        stage: spec.stage,
        state: persisted?.state ?? "queued",
        priorityScore: item.priorityScore,
        ownerRole: spec.ownerRole,
        title: `${item.platformName} ${spec.titleSuffix}`,
        detail: spec.detail,
        dueLabel: spec.dueLabel,
        actionLabel: spec.actionLabel,
        href: spec.href,
        acceptanceCriteria: spec.acceptanceCriteria,
        evidence: item.evidence,
        reviewLatestAt: item.metricAt ?? new Date().toISOString(),
      };
    })
    .filter((item): item is GatePlatformGrowthDispatchItem => Boolean(item));
}

function projectSecondMetricFollowupSpec(task: PersistedGatePlatformDispatchTask) {
  if (task.stage === "scale_up" && task.dispatchKey.includes(":second_metric:continue_scale:")) {
    return {
      suffix: "third_metrics_recovery",
      stage: "start_metrics_recovery" as const,
      ownerRole: "数据运营",
      titleSuffix: "第三轮数据回收",
      detail: `${task.platformName} 二轮后继续加码已完成，下一步必须回收第三轮真实数据，验证继续加码有没有透支效果。`,
      dueLabel: "加码后 24 小时",
      actionLabel: "派给数据运营",
      anchor: "#platform-export",
      acceptanceCriteria: ["第三轮曝光、点击、收藏或追读已回收", "第三轮数据与二轮基准可对照", "继续加码后的风险备注已保存"],
    };
  }

  if (task.stage === "repair_tactic" && task.dispatchKey.includes(":second_metric:repair_tactic:")) {
    return {
      suffix: "publish_finalize",
      stage: "start_publish_finalize" as const,
      ownerRole: "发布包主编",
      titleSuffix: "二轮修复后发布包复检",
      detail: `${task.platformName} 二轮打法修复已完成，回到发布包定稿复检，确认入口承诺、标签和前三章兑现重新对齐。`,
      dueLabel: "今天",
      actionLabel: "派给发布主编",
      anchor: "#platform-export",
      acceptanceCriteria: ["二轮修复后的发布包基准已保存", "标题简介标签与前三章兑现重新一致", "下一轮复测口径已写清"],
    };
  }

  if (task.stage === "pivot_platform" && task.dispatchKey.includes(":second_metric:pivot_platform:")) {
    return {
      suffix: "new_platform_validation",
      stage: "start_platform_package" as const,
      ownerRole: "平台验证编辑",
      titleSuffix: "新平台开书验证",
      detail: `${task.platformName} 二轮换平台/换打法方案已完成，先做新平台包装验证，不要直接迁移主力资源。`,
      dueLabel: "今天",
      actionLabel: "派给平台验证",
      anchor: "#submission-package",
      acceptanceCriteria: ["新平台标题简介标签验证已完成", "新平台首章钩子和前三章兑现已对齐", "小范围验证计划已保存"],
    };
  }

  if (task.stage === "pause_platform" && task.dispatchKey.includes(":second_metric:pause:")) {
    return {
      suffix: "pause_archive",
      stage: "pause_platform" as const,
      ownerRole: "复盘负责人",
      titleSuffix: "暂停复盘归档",
      detail: `${task.platformName} 二轮暂停动作已完成，最后把暂停原因、复盘结论和重启条件归档，避免以后重复踩坑。`,
      dueLabel: "今天",
      actionLabel: "派给复盘负责人",
      anchor: "#platform-export",
      acceptanceCriteria: ["暂停复盘归档已完成", "重启条件和禁止动作已写清", "平台经验已进入避坑样本"],
    };
  }

  return null;
}

export function buildGateProjectSecondMetricFollowupDispatchItems(
  tasks: PersistedGatePlatformDispatchTask[],
  persistedTasks: PersistedGatePlatformDispatchTask[] = [],
): GatePlatformGrowthDispatchItem[] {
  const persistedByKey = new Map(persistedTasks.map((task) => [task.dispatchKey, task]));

  return tasks
    .filter((task) => task.state === "completed" && task.completionEvidence.trim())
    .map((task): GatePlatformGrowthDispatchItem | null => {
      const spec = projectSecondMetricFollowupSpec(task);
      if (!spec) return null;
      const projectId = task.projectId ?? projectIdFromReceiptHref(task.href) ?? "unknown";
      const dispatchKey = `${task.platformId}:second_metric_followup:${spec.suffix}:${projectId}`;
      const persisted = persistedByKey.get(dispatchKey);
      const href = projectId !== "unknown" ? `/projects/${projectId}${spec.anchor}` : task.href;

      return {
        id: dispatchKey,
        platformId: task.platformId,
        platformName: task.platformName,
        stage: spec.stage,
        state: persisted?.state ?? "queued",
        priorityScore: Math.max(task.priorityScore, 72),
        ownerRole: spec.ownerRole,
        title: `${task.platformName} ${spec.titleSuffix}`,
        detail: spec.detail,
        dueLabel: spec.dueLabel,
        actionLabel: spec.actionLabel,
        href,
        acceptanceCriteria: spec.acceptanceCriteria,
        evidence: [`二轮完成依据：${task.completionEvidence.trim()}`, ...task.evidence].slice(0, 4),
        reviewLatestAt: task.completedAt ?? task.updatedAt,
      };
    })
    .filter((item): item is GatePlatformGrowthDispatchItem => Boolean(item));
}

function projectThirdMetricDecisionFromMetric(
  task: PersistedGatePlatformDispatchTask,
  metric: GatePublishEffectMetricSnapshot | null,
): Pick<GateProjectThirdMetricDecisionItem, "status" | "label" | "detail" | "actionLabel" | "href" | "priorityScore" | "evidence"> {
  if (!metric) {
    return {
      status: "wait_metric",
      label: "等三轮数据",
      detail: `${task.platformName} 已完成第三轮数据回收派单，但还没有看到第三轮效果回执。先补真实数据，再做最终平台状态判断。`,
      actionLabel: "回填第三轮数据",
      href: task.href,
      priorityScore: task.priorityScore,
      evidence: ["缺少第三轮效果回执", ...task.evidence].slice(0, 3),
    };
  }

  const zeroConversion = metric.views >= 100 && metric.clicks === 0 && metric.follows === 0;
  if (zeroConversion || metric.clickRatePercent < 4 || metric.followRatePercent < 0.6) {
    return {
      status: "archive_pause",
      label: "归档暂停",
      detail: `${task.platformName} 三轮加码后仍然没有形成有效点击或追读，继续投入只会扩大损失。归档暂停，保留避坑样本和重启条件。`,
      actionLabel: "归档暂停",
      href: task.href,
      priorityScore: Math.max(task.priorityScore, 94),
      evidence: [`点击率 ${precisePercent(metric.clicks, metric.views)}%`, `收藏率 ${precisePercent(metric.favorites, metric.views)}%`, `追读率 ${precisePercent(metric.follows, metric.views)}%`],
    };
  }

  if (metric.clickRatePercent < 6 || metric.favoriteRatePercent < 1.5 || metric.followRatePercent < 0.9) {
    return {
      status: "pivot_platform",
      label: "换平台",
      detail: `${task.platformName} 三轮数据仍低于平台匹配线，当前平台或入口打法不值得继续消耗主力资源，转入新平台验证。`,
      actionLabel: "换平台验证",
      href: task.href.replace("#platform-export", "#submission-package"),
      priorityScore: Math.max(task.priorityScore, 88),
      evidence: [`点击率 ${precisePercent(metric.clicks, metric.views)}%`, `收藏率 ${precisePercent(metric.favorites, metric.views)}%`, `追读率 ${precisePercent(metric.follows, metric.views)}%`],
    };
  }

  if (metric.clickRatePercent < 9 || metric.favoriteRatePercent < 3 || metric.followRatePercent < 1.5) {
    return {
      status: "downgrade_repair",
      label: "降档修复",
      detail: `${task.platformName} 三轮数据没有崩，但稳定性还不够硬。降档为修复优先，先收紧投入、复检发布包和前三章兑现。`,
      actionLabel: "降档修复",
      href: task.href,
      priorityScore: Math.max(task.priorityScore, 82),
      evidence: [`点击率 ${precisePercent(metric.clicks, metric.views)}%`, `收藏率 ${precisePercent(metric.favorites, metric.views)}%`, `追读率 ${precisePercent(metric.follows, metric.views)}%`],
    };
  }

  return {
    status: "stable_scale",
    label: "稳定加码",
    detail: `${task.platformName} 三轮数据连续站住，点击率 ${metric.clickRatePercent}%，收藏率 ${metric.favoriteRatePercent}%，追读率 ${metric.followRatePercent}%。可以进入稳定加码，但仍保留周期复盘。`,
    actionLabel: "稳定加码",
    href: task.href,
    priorityScore: Math.max(task.priorityScore, 84),
    evidence: [`点击率 ${precisePercent(metric.clicks, metric.views)}%`, `收藏率 ${precisePercent(metric.favorites, metric.views)}%`, `追读率 ${precisePercent(metric.follows, metric.views)}%`],
  };
}

export function buildGateProjectThirdMetricDecision(
  tasks: PersistedGatePlatformDispatchTask[],
  receipts: GateActionReceipt[] = [],
): GateProjectThirdMetricDecision {
  const operationalReceipts = trimGateActionReceipts(receipts, 100)
    .filter((receipt) => !isAuditMetaReceipt(receipt));
  const metricsByPlatform = new Map<string, GatePublishEffectMetricSnapshot[]>();

  for (const receipt of operationalReceipts) {
    const metric = metricFromReceipt(receipt);
    if (!metric) continue;
    const metrics = metricsByPlatform.get(metric.platformId) ?? [];
    metrics.push(metric);
    metricsByPlatform.set(metric.platformId, metrics);
  }

  for (const metrics of metricsByPlatform.values()) {
    metrics.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  }

  const thirdMetricTasks = tasks
    .filter((task) => (
      task.stage === "start_metrics_recovery"
      && task.dispatchKey.includes(":second_metric_followup:third_metrics_recovery:")
      && task.state === "completed"
      && task.completionEvidence.trim()
    ))
    .sort((left, right) => new Date(right.completedAt ?? right.updatedAt).getTime() - new Date(left.completedAt ?? left.updatedAt).getTime());
  const latestTaskByPlatform = new Map<string, PersistedGatePlatformDispatchTask>();
  for (const task of thirdMetricTasks) {
    if (!latestTaskByPlatform.has(task.platformId)) latestTaskByPlatform.set(task.platformId, task);
  }

  const items = [...latestTaskByPlatform.values()].map((task): GateProjectThirdMetricDecisionItem => {
    const completedAt = validDate(task.completedAt) ?? validDate(task.updatedAt);
    const metric = (metricsByPlatform.get(task.platformId) ?? [])
      .find((candidate) => !completedAt || new Date(candidate.createdAt).getTime() > completedAt.getTime()) ?? null;
    const decision = projectThirdMetricDecisionFromMetric(task, metric);

    return {
      dispatchKey: task.dispatchKey,
      projectId: task.projectId,
      platformId: task.platformId,
      platformName: task.platformName,
      status: decision.status,
      label: decision.label,
      detail: decision.detail,
      actionLabel: decision.actionLabel,
      href: decision.href,
      priorityScore: decision.priorityScore,
      metricAt: metric?.createdAt ?? null,
      clickRatePercent: metric?.clickRatePercent ?? null,
      favoriteRatePercent: metric?.favoriteRatePercent ?? null,
      followRatePercent: metric?.followRatePercent ?? null,
      evidence: decision.evidence,
    };
  });

  const stableScale = items.filter((item) => item.status === "stable_scale").length;
  const downgradeRepair = items.filter((item) => item.status === "downgrade_repair").length;
  const pivotPlatform = items.filter((item) => item.status === "pivot_platform").length;
  const archivePause = items.filter((item) => item.status === "archive_pause").length;
  const waitMetric = items.filter((item) => item.status === "wait_metric").length;
  const statusWeight: Record<GateProjectThirdMetricDecisionStatus, number> = {
    archive_pause: 0,
    pivot_platform: 1,
    downgrade_repair: 2,
    wait_metric: 3,
    stable_scale: 4,
  };

  return {
    summary: {
      total: items.length,
      stableScale,
      downgradeRepair,
      pivotPlatform,
      archivePause,
      waitMetric,
    },
    nextActions: [
      archivePause > 0 ? `${archivePause} 个平台三轮后仍无有效转化，归档暂停，沉淀避坑样本。` : null,
      pivotPlatform > 0 ? `${pivotPlatform} 个平台三轮后平台匹配弱，转去新平台验证。` : null,
      downgradeRepair > 0 ? `${downgradeRepair} 个平台三轮后未稳住，降档修复发布包和前三章。` : null,
      waitMetric > 0 ? `${waitMetric} 个平台缺第三轮真实数据，先补效果回执。` : null,
      stableScale > 0 ? `${stableScale} 个平台三轮数据稳定，可以进入稳定加码池。` : null,
      items.length === 0 ? "还没有完成第三轮数据回收，先把二轮继续加码后的回流任务收口。" : null,
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

export function buildGatePlatformDecisionTimeline(input: {
  receipts: GateActionReceipt[];
  tasks?: PersistedGatePlatformDispatchTask[];
  retreatGate?: GatePlatformRetreatGate;
  retreatResolution?: GatePlatformRetreatResolution;
  scaleFollowup?: GatePlatformScaleFollowup;
  thirdMetricDecision?: GateProjectThirdMetricDecision;
  limit?: number;
}): GatePlatformDecisionTimeline {
  const receipts = trimGateActionReceipts(input.receipts, 100).filter((receipt) => !isAuditMetaReceipt(receipt));
  const tasks = input.tasks ?? [];
  const retreatGate = input.retreatGate ?? buildGatePlatformRetreatGate(receipts);
  const retreatResolution = input.retreatResolution ?? buildGatePlatformRetreatResolution(tasks, receipts);
  const scaleFollowup = input.scaleFollowup ?? buildGatePlatformScaleFollowup(tasks, receipts);
  const thirdMetricDecision = input.thirdMetricDecision ?? buildGateProjectThirdMetricDecision(tasks, receipts);
  const platformMap = new Map<string, {
    platformId: string;
    platformName: string;
    priorityScore: number;
    href: string;
    events: GatePlatformDecisionTimelineEvent[];
  }>();

  function ensurePlatform(platformId: string, platformName: string, href = "/gate") {
    const current = platformMap.get(platformId);
    if (current) {
      if (platformName && current.platformName !== platformName) current.platformName = platformName;
      return current;
    }
    const next = { platformId, platformName, priorityScore: 1, href, events: [] };
    platformMap.set(platformId, next);
    return next;
  }

  for (const receipt of receipts) {
    const platform = gateActionReceiptPlatform(receipt);
    if (platform.id === "manual") continue;
    const metric = metricFromReceipt(receipt);
    const eventPlatform = ensurePlatform(platform.id, platform.name, receipt.href);
    eventPlatform.priorityScore = Math.max(eventPlatform.priorityScore, receipt.status === "failed" ? 70 : 25);
    if (metric) {
      eventPlatform.events.push({
        id: `effect:${receipt.id}`,
        type: "effect",
        label: "效果回填",
        detail: `曝光 ${metric.views}，点击 ${metric.clicks}，收藏 ${metric.favorites}，追读 ${metric.follows}。`,
        href: receipt.href,
        createdAt: receipt.createdAt,
        evidence: [`点击率 ${metric.clickRatePercent}%`, `收藏率 ${metric.favoriteRatePercent}%`, `追读率 ${metric.followRatePercent}%`],
      });
    } else if (isPlatformDispatchReceipt(receipt)) {
      eventPlatform.events.push({
        id: `dispatch-receipt:${receipt.id}`,
        type: "dispatch",
        label: "派单回执",
        detail: receipt.detail,
        href: receipt.href,
        createdAt: receipt.createdAt,
        evidence: [receipt.message],
      });
    }
  }

  for (const task of tasks) {
    const eventPlatform = ensurePlatform(task.platformId, task.platformName, task.href);
    eventPlatform.priorityScore = Math.max(eventPlatform.priorityScore, task.priorityScore);
    const isRetreatRepair = isRetreatDispatchStage(task.stage);
    const isRetreatRecheck = isRetreatRecheckDispatchTask(task);
    const completedAt = task.completedAt ?? task.updatedAt;
    eventPlatform.events.push({
      id: `task:${task.dispatchKey}`,
      type: isRetreatRecheck ? "recheck" : isRetreatRepair ? "repair" : "dispatch",
      label: task.state === "completed"
        ? isRetreatRecheck ? "重验完成" : isRetreatRepair ? "修复完成" : "派单完成"
        : isRetreatRecheck ? "重验派单" : isRetreatRepair ? "修复派单" : "平台派单",
      detail: task.state === "completed" && task.completionEvidence.trim()
        ? task.completionEvidence.trim()
        : `${task.ownerRole} · ${task.title}`,
      href: task.state === "completed" ? "/dispatch" : task.href,
      createdAt: task.state === "completed" ? completedAt : task.updatedAt,
      evidence: task.acceptanceCriteria.slice(0, 3),
    });
  }

  for (const item of retreatGate.items) {
    if (item.status === "healthy" || item.status === "watch") continue;
    const eventPlatform = ensurePlatform(item.platformId, item.platformName, item.href);
    eventPlatform.priorityScore = Math.max(eventPlatform.priorityScore, item.priorityScore);
    eventPlatform.events.push({
      id: `retreat:${item.platformId}:${item.latestAt}`,
      type: "retreat",
      label: item.label,
      detail: item.detail,
      href: item.href,
      createdAt: item.latestAt,
      evidence: item.evidence,
    });
  }

  for (const item of retreatResolution.items) {
    const eventPlatform = ensurePlatform(item.platformId, item.platformName, item.href);
    eventPlatform.priorityScore = Math.max(eventPlatform.priorityScore, item.priorityScore);
    eventPlatform.events.push({
      id: `resolution:${item.dispatchKey}:${item.status}`,
      type: "repair",
      label: item.label,
      detail: item.detail,
      href: item.href,
      createdAt: item.latestEffectAt ?? item.completedAt ?? new Date(0).toISOString(),
      evidence: item.evidence.slice(0, 3),
    });
  }

  for (const item of scaleFollowup.items.filter((followup) => isRetreatRecheckDispatchTask(followup))) {
    const eventPlatform = ensurePlatform(item.platformId, item.platformName, item.href);
    eventPlatform.priorityScore = Math.max(eventPlatform.priorityScore, item.priorityScore);
    eventPlatform.events.push({
      id: `recheck-followup:${item.dispatchKey}:${item.status}`,
      type: "recheck",
      label: item.label,
      detail: item.detail,
      href: item.href,
      createdAt: item.latestEffectAt ?? item.completedAt ?? new Date(0).toISOString(),
      evidence: item.evidence.slice(0, 3),
    });
  }

  for (const item of thirdMetricDecision.items) {
    const eventPlatform = ensurePlatform(item.platformId, item.platformName, item.href);
    eventPlatform.priorityScore = Math.max(eventPlatform.priorityScore, item.priorityScore);
    eventPlatform.events.push({
      id: `final:${item.dispatchKey}:${item.status}`,
      type: "final",
      label: item.label,
      detail: item.detail,
      href: item.href,
      createdAt: item.metricAt ?? new Date(0).toISOString(),
      evidence: item.evidence.slice(0, 3),
    });
  }

  const retreatByPlatform = new Map(retreatGate.items.map((item) => [item.platformId, item]));
  const resolutionByPlatform = new Map(retreatResolution.items.map((item) => [item.platformId, item]));
  const recheckFollowupByPlatform = new Map(
    scaleFollowup.items.filter((item) => isRetreatRecheckDispatchTask(item)).map((item) => [item.platformId, item]),
  );
  const items = [...platformMap.values()].map((platform): GatePlatformDecisionTimelineItem => {
    const sortedEvents = platform.events
      .filter((event) => !Number.isNaN(new Date(event.createdAt).getTime()))
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, 6);
    const retreat = retreatByPlatform.get(platform.platformId);
    const resolution = resolutionByPlatform.get(platform.platformId);
    const recheckFollowup = recheckFollowupByPlatform.get(platform.platformId);
    let status: GatePlatformDecisionTimelineStatus = "healthy";
    let label = "健康观察";
    let detail = `${platform.platformName} 当前没有撤退修复债，继续按总闸门节奏观察。`;
    let actionLabel = "查看平台";
    let href = platform.href;

    if (retreat && ["pause", "pivot_platform", "repair_tactic"].includes(retreat.status) && resolution?.status !== "resolved") {
      status = "blocked";
      label = retreat.label;
      detail = retreat.detail;
      actionLabel = retreat.actionLabel;
      href = retreat.href;
    } else if (resolution && resolution.status !== "resolved") {
      status = "needs_effect";
      label = resolution.label;
      detail = resolution.detail;
      actionLabel = resolution.actionLabel;
      href = resolution.href;
    } else if (recheckFollowup && recheckFollowup.status !== "tracked") {
      status = "rechecking";
      label = recheckFollowup.label;
      detail = recheckFollowup.detail;
      actionLabel = recheckFollowup.actionLabel;
      href = recheckFollowup.href;
    } else if (resolution?.status === "resolved") {
      status = "recovering";
      label = "修复后恢复";
      detail = `${platform.platformName} 已有修复复测证据，继续用重验数据判断是否恢复增长。`;
      actionLabel = "查看重验";
      href = resolution.href;
    }

    return {
      platformId: platform.platformId,
      platformName: platform.platformName,
      status,
      label,
      detail,
      actionLabel,
      href,
      priorityScore: platform.priorityScore,
      latestAt: sortedEvents[0]?.createdAt ?? new Date(0).toISOString(),
      events: sortedEvents,
    };
  });

  const limit = input.limit ?? 5;
  const statusWeight: Record<GatePlatformDecisionTimelineStatus, number> = {
    blocked: 0,
    needs_effect: 1,
    rechecking: 2,
    recovering: 3,
    healthy: 4,
  };
  const sortedItems = items
    .filter((item) => item.events.length > 0)
    .sort((left, right) => {
      const statusDiff = statusWeight[left.status] - statusWeight[right.status];
      if (statusDiff !== 0) return statusDiff;
      const priorityDiff = right.priorityScore - left.priorityScore;
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(right.latestAt).getTime() - new Date(left.latestAt).getTime();
    })
    .slice(0, limit);
  const blocked = sortedItems.filter((item) => item.status === "blocked").length;
  const needsEffect = sortedItems.filter((item) => item.status === "needs_effect").length;
  const rechecking = sortedItems.filter((item) => item.status === "rechecking").length;
  const recovering = sortedItems.filter((item) => item.status === "recovering").length;
  const healthy = sortedItems.filter((item) => item.status === "healthy").length;

  return {
    summary: {
      total: sortedItems.length,
      blocked,
      needsEffect,
      rechecking,
      recovering,
      healthy,
    },
    nextActions: [
      blocked > 0 ? `${blocked} 个平台仍有撤退或修复阻塞，先看时间线里的最近断点。` : null,
      needsEffect > 0 ? `${needsEffect} 个平台修复后缺复测效果，先补数据再判断恢复。` : null,
      rechecking > 0 ? `${rechecking} 个平台处在重验中，下一步只看重验效果回填。` : null,
      recovering > 0 ? `${recovering} 个平台已有恢复证据，继续小步验证，不要直接放量。` : null,
    ].filter((action): action is string => Boolean(action)),
    items: sortedItems,
  };
}

export function filterGatePlatformDecisionTimelineItems(
  items: GatePlatformDecisionTimelineItem[],
  filters: GatePlatformDecisionTimelineFilters = {},
): GatePlatformDecisionTimelineItem[] {
  return items.filter((item) => {
    if (filters.platformId && filters.platformId !== "all" && item.platformId !== filters.platformId) return false;
    if (filters.status && filters.status !== "all" && item.status !== filters.status) return false;
    if (filters.eventType && filters.eventType !== "all" && !item.events.some((event) => event.type === filters.eventType)) return false;
    return true;
  });
}

function markdownLine(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

export function buildGatePlatformTacticExperienceLibrary(
  timeline: GatePlatformDecisionTimeline,
  limit = 6,
): GatePlatformTacticExperienceLibrary {
  const items = timeline.items.map((item): GatePlatformTacticExperienceItem => {
    const finalEvent = item.events.find((event) => event.type === "final") ?? null;
    const evidence = item.events.slice(0, 3).map((event) => `${event.label}：${markdownLine(event.detail)}`);
    const base = {
      platformId: item.platformId,
      platformName: item.platformName,
      href: item.href,
      sourceStatus: item.status,
      sourceLabel: item.label,
      priorityScore: item.priorityScore,
      latestAt: item.latestAt,
      evidence,
    };

    if (finalEvent?.label === "稳定加码") {
      return {
        ...base,
        status: "usable",
        label: "可复用打法",
        tactic: "三轮稳定加码打法",
        lesson: `${item.platformName} 已完成三轮真实数据验证，点击、收藏和追读能连续站住，可以作为同类平台的稳定加码样本。`,
        reuseHint: "新项目可复用这套平台包装、前三章兑现和小步加码节奏，进入稳定加码池前仍要保留基准对照。",
        risk: "稳定加码不是无限放量；每轮仍要回填效果，发现转化下滑就立刻降档。",
        evidence: [`最终判定：${finalEvent.label}：${markdownLine(finalEvent.detail)}`, ...base.evidence].slice(0, 4),
      };
    }

    if (finalEvent?.label === "归档暂停") {
      return {
        ...base,
        status: "blocked",
        label: "避坑样本",
        tactic: "三轮归档暂停样本",
        lesson: `${item.platformName} 三轮后仍未形成有效转化，说明当前平台、入口卖点或正文兑现不适合继续投入。`,
        reuseHint: "同类项目先复用暂停原因和避坑清单，不要复制这套投放路径。",
        risk: "重启条件必须写清：新平台包装、开头兑现或题材定位有明确改动后，才允许重新小样本验证。",
        evidence: [`最终判定：${finalEvent.label}：${markdownLine(finalEvent.detail)}`, ...base.evidence].slice(0, 4),
      };
    }

    if (finalEvent?.label === "换平台") {
      return {
        ...base,
        status: "blocked",
        label: "避坑样本",
        tactic: "三轮换平台样本",
        lesson: `${item.platformName} 三轮后平台匹配仍弱，继续把主力资源压在原平台的性价比不够。`,
        reuseHint: "同类项目优先复用平台转向条件和新平台验证清单。",
        risk: "未完成新平台小样本验证前，不要把旧平台失败包装成题材失败。",
        evidence: [`最终判定：${finalEvent.label}：${markdownLine(finalEvent.detail)}`, ...base.evidence].slice(0, 4),
      };
    }

    if (finalEvent?.label === "降档修复") {
      return {
        ...base,
        status: "watch",
        label: "观察样本",
        tactic: "三轮降档修复打法",
        lesson: `${item.platformName} 三轮数据没有崩，但稳定性不足，适合作为降档修复流程样本。`,
        reuseHint: "同类项目只复用收紧投入、复检发布包和前三章兑现的流程，暂不复用加码结论。",
        risk: "修复后必须再看新一轮效果，缺复测数据前不要恢复稳定加码。",
        evidence: [`最终判定：${finalEvent.label}：${markdownLine(finalEvent.detail)}`, ...base.evidence].slice(0, 4),
      };
    }

    if (item.status === "blocked") {
      return {
        ...base,
        status: "blocked",
        label: "避坑样本",
        tactic: item.label,
        lesson: `${item.platformName} 当前证据仍在撤退或修打法区间，不能把失败样本包装成成功经验。`,
        reuseHint: "同类项目先避开直接加码，优先复制问题诊断清单和撤退条件。",
        risk: markdownLine(item.detail),
      };
    }

    if (item.status === "needs_effect") {
      return {
        ...base,
        status: "watch",
        label: "待复测经验",
        tactic: "修复后复测",
        lesson: `${item.platformName} 已经进入修复链路，但缺少下一轮效果数据，结论还不能写进成功案例。`,
        reuseHint: "新项目可以复用修复清单，但必须补曝光、点击、收藏、追读四项效果样本。",
        risk: "缺复测数据前不要把它当成恢复打法，只能当成待验证模板。",
      };
    }

    if (item.status === "rechecking") {
      return {
        ...base,
        status: "watch",
        label: "重验中打法",
        tactic: "修复后小步重验",
        lesson: `${item.platformName} 已经从修复走到重验阶段，流程可借鉴，胜率还要等回填确认。`,
        reuseHint: "同类项目只复制小步重验节奏，不复制放量结论。",
        risk: "缺下一轮重验效果前，不要提前扩大投放或更新规模。",
      };
    }

    if (item.status === "recovering") {
      return {
        ...base,
        status: "usable",
        label: "可复用打法",
        tactic: "修复后重验打法",
        lesson: `${item.platformName} 已完成修复、复测、重验和效果回填，可以作为同类平台的恢复模板。`,
        reuseHint: "新项目可复用：先修标题简介标签和前三章兑现，再小步重验。",
        risk: "不要直接放量，先保留小步验证窗口。",
      };
    }

    return {
      ...base,
      status: "usable",
      label: "健康观察样本",
      tactic: "稳态观察打法",
      lesson: `${item.platformName} 当前没有撤退修复债，可以作为平台稳定期观察样本。`,
      reuseHint: "新项目可复用健康阈值和复盘口径，继续按总闸门节奏观察。",
      risk: "健康不等于可无限加码，仍要保留效果回填节奏。",
    };
  });

  const statusWeight: Record<GatePlatformTacticExperienceStatus, number> = {
    blocked: 0,
    watch: 1,
    usable: 2,
  };
  const sortedItems = items
    .sort((left, right) => {
      const statusDiff = statusWeight[left.status] - statusWeight[right.status];
      if (statusDiff !== 0) return statusDiff;
      const priorityDiff = right.priorityScore - left.priorityScore;
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(right.latestAt).getTime() - new Date(left.latestAt).getTime();
    })
    .slice(0, limit);
  const blocked = sortedItems.filter((item) => item.status === "blocked").length;
  const watch = sortedItems.filter((item) => item.status === "watch").length;
  const usable = sortedItems.filter((item) => item.status === "usable").length;

  return {
    summary: {
      total: sortedItems.length,
      blocked,
      watch,
      usable,
    },
    nextActions: [
      blocked > 0 ? `${blocked} 个避坑样本要先沉淀撤退条件，别让错误打法复用。` : null,
      watch > 0 ? `${watch} 个观察样本只复用流程，等效果回填后再写成标准打法。` : null,
      usable > 0 ? `${usable} 个可复用打法可以进入新项目平台选择参考。` : null,
    ].filter((action): action is string => Boolean(action)),
    items: sortedItems,
  };
}

function batchTacticKey(tactic: GateActionReceiptStartTactic) {
  return `${markdownLine(tactic.title)}::${markdownLine(tactic.openingMove || tactic.primaryTactic)}`;
}

function batchTacticStatus(input: {
  sampleBatches: number;
  successRatePercent: number;
  averageQualityScore: number | null;
  failedTasks: number;
}): GateBatchTacticEffectStatus {
  if (input.failedTasks > 0 && input.successRatePercent < 80) return "blocked";
  if (input.averageQualityScore !== null && input.averageQualityScore < 75) return "blocked";
  if (input.sampleBatches < 2) return "watch";
  if (input.successRatePercent < 90) return "watch";
  if (input.averageQualityScore !== null && input.averageQualityScore < 85) return "watch";
  return "usable";
}

function batchTacticLabel(status: GateBatchTacticEffectStatus) {
  if (status === "blocked") return "避坑打法";
  if (status === "watch") return "观察打法";
  return "可复用打法";
}

export function buildGateBatchTacticEffectReview(
  receipts: GateActionReceipt[],
  limit = 6,
): GateBatchTacticEffectReview {
  const groups = new Map<string, {
    tactic: GateActionReceiptStartTactic;
    receipts: GateActionReceipt[];
  }>();

  for (const receipt of receipts) {
    if (receipt.executionType !== "recommended_batch") continue;
    for (const tactic of receipt.startTactics ?? []) {
      if (!tactic.title || !tactic.primaryTactic) continue;
      const key = batchTacticKey(tactic);
      const group = groups.get(key) ?? { tactic, receipts: [] };
      group.receipts.push(receipt);
      groups.set(key, group);
    }
  }

  const items = [...groups.entries()].map(([id, group]): GateBatchTacticEffectItem => {
    const sortedReceipts = [...group.receipts].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
    const succeededTasks = sortedReceipts.reduce((sum, receipt) => sum + receipt.succeededCount, 0);
    const failedTasks = sortedReceipts.reduce((sum, receipt) => sum + receipt.failedCount, 0);
    const totalTasks = succeededTasks + failedTasks;
    const successRatePercent = totalTasks ? Math.round((succeededTasks / totalTasks) * 100) : 0;
    const qualitySamples = sortedReceipts
      .map((receipt) => receipt.batchEffectSummary?.averageQualityScore ?? null)
      .filter((score): score is number => typeof score === "number");
    const averageQualityScore = qualitySamples.length
      ? Math.round(qualitySamples.reduce((sum, score) => sum + score, 0) / qualitySamples.length)
      : null;
    const knownCostUsd = Number(sortedReceipts.reduce((sum, receipt) => sum + (receipt.batchEffectSummary?.knownCostUsd ?? 0), 0).toFixed(4));
    const status = batchTacticStatus({
      sampleBatches: sortedReceipts.length,
      successRatePercent,
      averageQualityScore,
      failedTasks,
    });
    const label = batchTacticLabel(status);
    const evidence = sortedReceipts.slice(0, 3).map((receipt) => {
      const quality = receipt.batchEffectSummary?.averageQualityScore ?? "缺";
      return `${receipt.label}：成功 ${receipt.succeededCount}，失败 ${receipt.failedCount}，质量 ${quality}`;
    });
    const nextAction = status === "blocked"
      ? "先拆失败样本和低分原因，暂停把这套打法继续放进新批次。"
      : status === "watch"
        ? "只允许小批继续验证，等至少两批稳定后再写入可复用打法。"
        : "可以进入新项目开书参考，但仍保留小步验证和回执追踪。";

    return {
      id,
      status,
      label,
      tacticTitle: group.tactic.title,
      tacticLabel: group.tactic.label || "首轮打法",
      primaryTactic: group.tactic.primaryTactic,
      openingMove: group.tactic.openingMove,
      verificationMove: group.tactic.verificationMove,
      risk: group.tactic.risk || "继续按批量回执和平台数据复盘。",
      sampleBatches: sortedReceipts.length,
      succeededTasks,
      failedTasks,
      successRatePercent,
      averageQualityScore,
      knownCostUsd,
      latestAt: sortedReceipts[0]?.createdAt ?? new Date(0).toISOString(),
      evidence,
      nextAction,
    };
  });

  const statusWeight: Record<GateBatchTacticEffectStatus, number> = {
    blocked: 0,
    watch: 1,
    usable: 2,
  };
  const sortedItems = items
    .sort((left, right) => {
      const statusDiff = statusWeight[left.status] - statusWeight[right.status];
      if (statusDiff !== 0) return statusDiff;
      if (right.failedTasks !== left.failedTasks) return right.failedTasks - left.failedTasks;
      return new Date(right.latestAt).getTime() - new Date(left.latestAt).getTime();
    })
    .slice(0, limit);
  const blocked = sortedItems.filter((item) => item.status === "blocked").length;
  const watch = sortedItems.filter((item) => item.status === "watch").length;
  const usable = sortedItems.filter((item) => item.status === "usable").length;

  return {
    summary: {
      total: sortedItems.length,
      blocked,
      watch,
      usable,
    },
    nextActions: [
      blocked > 0 ? `${blocked} 套批量打法已经触发避坑条件，先停用并复盘失败样本。` : null,
      watch > 0 ? `${watch} 套批量打法样本还薄，只能小批观察。` : null,
      usable > 0 ? `${usable} 套批量打法可作为新项目首轮打法参考。` : null,
    ].filter((action): action is string => Boolean(action)),
    items: sortedItems,
  };
}

export function buildGatePlatformTacticExperienceMarkdown(item: GatePlatformTacticExperienceItem) {
  const evidenceLines = item.evidence.length
    ? item.evidence.map((evidence, index) => `${index + 1}. ${markdownLine(evidence)}`)
    : ["暂无证据记录。"];

  return [
    `# ${item.platformName} 平台打法经验`,
    "",
    `- 经验状态：${item.label}`,
    `- 来源判断：${item.sourceLabel}`,
    `- 可复用打法：${item.tactic}`,
    `- 处理入口：${item.href}`,
    "",
    "## 经验结论",
    markdownLine(item.lesson),
    "",
    "## 复用方式",
    markdownLine(item.reuseHint),
    "",
    "## 风险提醒",
    markdownLine(item.risk),
    "",
    "## 来源证据",
    ...evidenceLines,
  ].join("\n");
}

export function buildGatePlatformDecisionSummaryMarkdown(item: GatePlatformDecisionTimelineItem) {
  const eventLines = item.events.length
    ? item.events.map((event, index) => [
        `${index + 1}. ${event.label} · ${new Date(event.createdAt).toLocaleString("zh-CN")}`,
        `   - ${markdownLine(event.detail)}`,
        ...event.evidence.slice(0, 3).map((evidence) => `   - 证据：${markdownLine(evidence)}`),
      ].join("\n"))
    : ["暂无事件记录。"];

  return [
    `# ${item.platformName} 平台决策复盘`,
    "",
    `- 当前状态：${item.label}`,
    `- 优先级：${item.priorityScore}`,
    `- 下一步：${item.actionLabel}`,
    `- 处理入口：${item.href}`,
    "",
    "## 主编判断",
    markdownLine(item.detail),
    "",
    "## 证据时间线",
    ...eventLines,
    "",
    "## 复盘口径",
    "- 只按真实回执、派单证据和效果数据判断平台去留。",
    "- 修复、复测、重验、回填必须闭环后，才允许进入下一轮加码。",
    "- 如果最新数据继续走弱，优先修打法或换平台，不扩大错误投入。",
  ].join("\n");
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
