import type {
  PrePublishGateAction,
  PrePublishGateActionExecution,
  PrePublishGateAdoptionFollowupItem,
  PrePublishGateExportVersionAction,
  PrePublishGateStrategyPlatform,
} from "./prePublishGate.ts";
import type { FailureRepairBatch } from "../ai/taskRunConsole.ts";
import { platformProfiles } from "../platforms/platformProfiles.ts";
import { buildAiPipelinePromptMemorySummary, type AiPipelinePromptMemorySummary, type ControlBatchAudit } from "./projectControlDashboard.ts";

export const gateActionReceiptStorageKey = "ai-webnovel-gate-action-receipts";
export const gateActionReceiptUpdatedEvent = "ai-webnovel-gate-action-receipts-updated";
export const defaultGateActionReceiptLimit = 20;

export type GateActionReceiptExecutionType =
  | PrePublishGateActionExecution["type"]
  | "platform_strategy"
  | "model_route"
  | "first_three_adoption"
  | "export_version"
  | "manual";
export type GateActionReceiptStatusFilter = "all" | GateActionReceipt["status"];
export type GateActionReceiptExecutionFilter = "all" | GateActionReceiptExecutionType;

export interface GateActionReceiptPayload {
  message?: string;
  error?: string;
  executionContext?: "standard" | "repair_resume" | "batch_rhythm_recheck";
  batchRhythmRecheck?: {
    dispatchKey: string;
    title: string;
    completionEvidence: string;
  };
  firstThreeAdoptionClosure?: GateFirstThreeAdoptionClosureSummary;
  aiPipelineRecheck?: {
    dispatchKey?: string;
    mode?: "sample_recheck" | "small_batch_resume";
  };
  plan?: {
    strategyBases?: GateActionReceiptStartTactic[];
    scaleGate?: string;
    actionLabel?: string;
    category?: string | null;
    itemIds?: string[];
    chapterIds?: string[];
    adoptionFollowupCount?: number;
    adoptionFollowupItemIds?: string[];
    executionContext?: "standard" | "repair_resume" | "batch_rhythm_recheck";
  };
  startTactics?: GateActionReceiptStartTactic[];
  variants?: unknown[];
  results?: Array<{
    status?: string;
    taskId?: string;
    chapterId?: string;
    chapterTitle?: string;
    error?: string | null;
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
  batchReceipt?: {
    status?: string;
    headline?: string;
    detail?: string;
    warnings?: string[];
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

export interface GateActionReceiptBatchContext {
  scaleGate: "none" | "sample_only" | "cleared";
  actionLabel: string;
  category: string | null;
  receiptHeadline: string;
  receiptStatus: string;
  rhythmRecheck?: {
    dispatchKey: string;
    title: string;
    completionEvidence: string;
  } | null;
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
  batchContext?: GateActionReceiptBatchContext | null;
  firstThreeAdoptionClosure?: GateFirstThreeAdoptionClosureSummary | null;
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

export type GateRecommendedBatchReceiptFocusTone = "ready" | "review" | "blocked";

export interface GateRecommendedBatchReceiptFocus {
  visible: boolean;
  tone: GateRecommendedBatchReceiptFocusTone;
  headline: string;
  detail: string;
  primaryLabel: string;
  primaryHref: string;
  badges: string[];
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

export interface GateFailureRepairFollowupNotice {
  tone: "open" | "recheck" | "active" | "failed" | "resolved";
  label: string;
  detail: string;
  actionLabel: string;
  href: string;
  badges: string[];
}

export interface GateFailureRepairRecheckCard {
  dispatchKey: string;
  state: GatePlatformGrowthDispatchState;
  title: string;
  detail: string;
  ownerRole: string;
  dueLabel: string;
  href: string;
  primaryActionLabel: string;
  completionEvidencePlaceholder: string;
  acceptanceCriteria: string[];
  evidence: string[];
}

export interface GateFailureRepairThirdRoundResolution {
  status: "none" | "active" | "failed" | "resolved";
  label: string;
  detail: string;
  actionLabel: string;
  href: string;
  totalItems: number;
  completedItems: number;
  unresolvedFailures: number;
  routeLesson: {
    status: "none" | "blocked" | "usable";
    title: string;
    rule: string;
    evidence: string[];
  };
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
  | "failure_config_repair"
  | "failure_route_repair"
  | "failure_retry_repair"
  | "failure_manual_review"
  | "model_route_confirmation_recheck"
  | "model_route_governance"
  | "ai_pipeline_sample_recheck"
  | "ai_pipeline_small_batch"
  | "start_first_three_review"
  | "start_opening_diagnostic"
  | "start_platform_package"
  | "start_role_dispatch_closure"
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

export interface GateKnowledgeFeedbackReceipt {
  id: string;
  projectId: string | null;
  projectTitle?: string | null;
  platformId: string;
  platformName: string;
  actionLabel: string;
  title: string;
  message: string;
  completedStepLabel: string;
  stopReason: string;
  nextAction: string;
  href: string;
  severity: "success" | "needs_action";
  createdAt: string;
}

export interface GateSubmissionCompletionEffectReview {
  metricId: string;
  receiptId: string;
  platformId: string;
  platformName: string;
  status: "promising" | "watch" | "weak";
  headline: string;
  nextAction: string;
  evidence: string[];
}

export interface GatePlatformEvidenceLoop {
  projectId: string;
  projectTitle: string;
  platformId: string;
  platformName: string;
  score: number;
  status: "empty" | "pause" | "repair" | "watch" | "scale";
  label: string;
  headline: string;
  nextAction: string;
  actionLabel: string;
  targetAnchor: string;
  evidence: string[];
  metricsCount: number;
  feedbackCount: number;
  gateCompletionCount: number;
}

export interface GateEvidenceLoopRecheck {
  projectId: string;
  platformId: string;
  platformName: string;
  previousScore: number | null;
  currentScore: number;
  delta: number | null;
  status: GatePlatformEvidenceLoop["status"];
  label: string;
  verdict: "improved" | "unchanged" | "declined" | "unknown";
  headline: string;
  nextAction: string;
  evidence: string[];
}

export interface GateStoryTreeRecheck {
  projectId: string;
  chapterId: string;
  previousScore: number | null;
  currentScore: number;
  delta: number | null;
  label: string;
  verdict: "improved" | "unchanged" | "declined" | "unknown";
  topAction: string;
  axisSummary: string[];
}

export interface GateStructureDiagnosticRecheck {
  projectId: string;
  platformId: string;
  platformName: string;
  previousScore: number | null;
  currentScore: number;
  delta: number | null;
  label: string;
  verdict: "improved" | "unchanged" | "declined" | "unknown";
  topAction: string;
  weakItems: Array<{
    id: string;
    label: string;
    status: "warn" | "fail";
    evidence: string;
    suggestion: string;
  }>;
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
  recheckFollowUpOnly?: boolean;
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
    recheckFollowUp: number;
    activeRecheckFollowUp: number;
    aiPipeline: number;
    activeAiPipeline: number;
    recheckFollowUpChains: number;
    repeatedRecheckFollowUpChains: number;
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
  aiPipelineDispatches: PersistedGatePlatformDispatchTask[];
  aiPipelineGroups: GateDispatchTaskCenterAiPipelineGroup[];
  recheckFollowUpChains: GateDispatchRecheckFollowUpChain[];
}

export type GateDispatchTaskCenterAiPipelineGroupId = "rollback_repair" | "sample_recheck" | "small_batch_resume";

export interface GateDispatchTaskCenterAiPipelineExecutionGuide {
  primaryActionLabel: string;
  primaryHref: string;
  hint: string;
}

export interface GateDispatchTaskCenterAiPipelineGroup {
  id: GateDispatchTaskCenterAiPipelineGroupId;
  label: string;
  headline: string;
  detail: string;
  total: number;
  active: number;
  topPriorityScore: number;
  topTask: PersistedGatePlatformDispatchTask | null;
  executionGuide: GateDispatchTaskCenterAiPipelineExecutionGuide;
  tasks: PersistedGatePlatformDispatchTask[];
}

export interface GateAiPipelineRecoveryPanel {
  anchorId: "ai-pipeline-recovery";
  visible: boolean;
  status: "empty" | "ready" | "watch" | "blocked";
  label: string;
  headline: string;
  detail: string;
  summary: {
    total: number;
    active: number;
    completed: number;
    rollback: number;
    sample: number;
    smallBatch: number;
  };
  primaryAction: {
    label: string;
    href: string;
    detail: string;
  };
  latestEvidence: {
    dispatchKey: string;
    label: string;
    kind: GateAiPipelineRecoveryCompletionKind;
    outcome: GatePlatformTacticExperienceStatus;
    nextAction: string;
    feedback: GateAiPipelineRecoveryCompletionFeedback;
    evidence: string[];
    completedAt: string | null;
    href: string;
  } | null;
  currentConclusion: {
    status: "resume" | "watch" | "rollback";
    label: string;
    headline: string;
    detail: string;
    primaryActionLabel: string;
    href: string;
    latestAt: string | null;
  } | null;
  promptMemory: {
    visible: boolean;
    hasMemory: boolean;
    statusLabel: string;
    headline: string;
    detail: string;
    actionLabel: string | null;
    actionHref: string | null;
    latestAt: string | null;
    quickAction: {
      label: string;
      endpoint: string;
      body: {
        areaId: "ai-pipeline";
        memoryAction: "rollback";
      };
      successHref: string;
      runAfterCreate: {
        lookupEndpoint: string;
        runEndpoint: string;
      };
    } | null;
    history: AiPipelinePromptMemorySummary["history"];
  };
  groups: Array<{
    id: GateDispatchTaskCenterAiPipelineGroupId;
    label: string;
    headline: string;
    detail: string;
    total: number;
    active: number;
    actionLabel: string;
    actionHref: string;
    topTaskTitle: string;
  }>;
}

export interface GateDispatchRecheckFollowUpChain {
  rootDispatchKey: string;
  latestDispatchKey: string;
  projectId: string | null;
  platformId: string;
  platformName: string;
  total: number;
  active: number;
  completed: number;
  maxRound: number;
  status: "active" | "completed";
  latestTitle: string;
  latestActionLabel: string;
  latestHref: string;
  latestUpdatedAt: string;
  reviewAdvice?: GateDispatchRecheckFollowUpReviewAdvice;
  reviewIntervention?: GateDispatchRecheckFollowUpIntervention;
  rounds: Array<{
    round: number;
    dispatchKey: string;
    state: GatePlatformGrowthDispatchState;
    title: string;
    priorityScore: number;
    ownerRole: string;
  }>;
}

export type GateDispatchRecheckFollowUpReviewAdviceType = "acceptance_mismatch" | "weak_execution" | "direction_pause";

export interface GateDispatchRecheckFollowUpReviewAdvice {
  type: GateDispatchRecheckFollowUpReviewAdviceType;
  tone: "amber" | "rose" | "sky";
  title: string;
  detail: string;
  nextAction: string;
  ownerRole: string;
  dispatch: GatePlatformGrowthDispatchItem;
}

export type GateDispatchRecheckFollowUpInterventionStatus = "intervened" | "stopped" | "continue_rework";

export interface GateDispatchRecheckFollowUpIntervention {
  dispatchKey: string;
  status: GateDispatchRecheckFollowUpInterventionStatus;
  label: string;
  detail: string;
  state: GatePlatformGrowthDispatchState;
  title: string;
  ownerRole: string;
  href: string;
  completedAt: string | null;
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

export function isChapterProductionRecheckFollowUpTask(task: Pick<PersistedGatePlatformDispatchTask, "dispatchKey">) {
  return task.dispatchKey.startsWith("story-tree-followup:")
    || task.dispatchKey.startsWith("submission-recheck-followup:");
}

function isRecheckReviewDispatchTask(task: Pick<PersistedGatePlatformDispatchTask, "dispatchKey">) {
  return task.dispatchKey.startsWith("recheck-review:");
}

function recheckReviewTypeFromDispatchKey(dispatchKey: string): GateDispatchRecheckFollowUpReviewAdviceType {
  if (dispatchKey.includes(":direction_pause:")) return "direction_pause";
  if (dispatchKey.includes(":acceptance_mismatch:")) return "acceptance_mismatch";
  return "weak_execution";
}

function recheckReviewTypeLabel(type: GateDispatchRecheckFollowUpReviewAdviceType) {
  if (type === "direction_pause") return "平台方向暂停";
  if (type === "acceptance_mismatch") return "验收标准修正";
  return "执行动作复盘";
}

function sourceDispatchKeyFromEvidence(task: Pick<PersistedGatePlatformDispatchTask, "evidence">) {
  const sourceLine = task.evidence.find((line) => line.startsWith("来源派单："));
  return sourceLine?.replace("来源派单：", "").trim() || null;
}

function recheckChainRootFromEvidence(task: Pick<PersistedGatePlatformDispatchTask, "evidence">) {
  const rootLine = task.evidence.find((line) => line.startsWith("返工链根："));
  return rootLine?.replace("返工链根：", "").trim() || null;
}

function taskReviewText(task: PersistedGatePlatformDispatchTask) {
  return [
    task.title,
    task.detail,
    task.completionEvidence,
    ...task.acceptanceCriteria,
    ...task.evidence,
  ].join(" ");
}

function safeDispatchKeyPart(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 96);
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
  actionLabel: string;
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
export type GatePlatformTacticExperienceStatusFilter = "all" | GatePlatformTacticExperienceStatus;

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

export interface GatePlatformTacticExperienceDisplay {
  badges: string[];
  outcomeLabel: string;
  nextStepLabel: string;
}

export function filterGatePlatformTacticExperienceItems(
  items: GatePlatformTacticExperienceItem[],
  status: GatePlatformTacticExperienceStatusFilter = "all",
) {
  return items.filter((item) => status === "all" || item.status === status);
}

export function buildGatePlatformTacticExperienceDisplay(item: GatePlatformTacticExperienceItem): GatePlatformTacticExperienceDisplay {
  if (/恢复放量/u.test(`${item.tactic} ${item.sourceLabel} ${item.evidence.join(" ")}`)) {
    if (item.status === "blocked") {
      return {
        badges: ["恢复放量", "暂停避坑"],
        outcomeLabel: "暂停迁移",
        nextStepLabel: "重做打法",
      };
    }
    if (item.status === "watch") {
      return {
        badges: ["恢复放量", "继续观察"],
        outcomeLabel: "继续观察，别放量",
        nextStepLabel: "补追读证据",
      };
    }
    return {
      badges: ["恢复放量", "小样本通过"],
      outcomeLabel: "可继续小样本复用",
      nextStepLabel: "继续小样本",
    };
  }

  if (item.sourceLabel === "新书开局闭环") {
    return {
      badges: ["已用于新书开局并闭环"],
      outcomeLabel: "开局闭环",
      nextStepLabel: "复用交接",
    };
  }

  return {
    badges: [],
    outcomeLabel: item.label,
    nextStepLabel: item.status === "usable" ? "可开新项目" : item.status === "watch" ? "继续补证据" : "先避坑",
  };
}

export function buildGatePlatformTacticExperienceFollowupDispatch(
  item: GatePlatformTacticExperienceItem,
  persistedTasks: PersistedGatePlatformDispatchTask[] = [],
): GatePlatformGrowthDispatchItem | null {
  const sourceText = `${item.tactic} ${item.sourceLabel} ${item.evidence.join(" ")}`;
  if (!/恢复放量/u.test(sourceText)) return null;

  const display = buildGatePlatformTacticExperienceDisplay(item);
  const latestDay = item.latestAt.slice(0, 10) || "latest";
  const keyTactic = safeDispatchKeyPart(`${item.status}-${item.tactic}-${item.sourceLabel}`) || "recovery";
  const dispatchKey = `${item.platformId}:tactic_experience_followup:${keyTactic}:${safeDispatchKeyPart(latestDay)}`;
  const persisted = persistedTasks.find((task) => task.dispatchKey === dispatchKey);
  const aiPipelineRecovery = item.platformId === "ai-pipeline" || item.sourceLabel.startsWith("AI 恢复");
  const displayNextStepLabel = aiPipelineRecovery && item.status === "watch"
    ? "继续小样本"
    : aiPipelineRecovery && item.status === "blocked"
      ? "回滚观察修复"
      : display.nextStepLabel;
  const commonEvidence = [
    `经验结论：${display.outcomeLabel}`,
    `下一步：${displayNextStepLabel}`,
    `打法：${item.tactic}`,
    ...item.evidence,
  ].slice(0, 6);

  const spec: Pick<
    GatePlatformGrowthDispatchItem,
    "stage" | "priorityScore" | "ownerRole" | "title" | "detail" | "dueLabel" | "actionLabel" | "acceptanceCriteria"
  > = aiPipelineRecovery && item.status === "blocked"
    ? {
        stage: "ai_pipeline_sample_recheck",
        priorityScore: Math.max(item.priorityScore, 96),
        ownerRole: "写作制片 / 审稿负责人",
        title: `${item.platformName}：恢复小批跌线修复`,
        detail: "AI 写审改恢复小批已经进入暂停避坑，先回滚观察修复，修低分章节、开头钩子和章末追读，再重新跑 1 章小样本。",
        dueLabel: "今天先修",
        actionLabel: "回滚观察修复",
        acceptanceCriteria: [
          "已写明暂停恢复小批原因",
          "已修复低分章节、开头钩子或章末追读弱项",
          "修复后只允许重新跑 1 章小样本，不直接回推荐批量",
        ],
      }
    : aiPipelineRecovery && item.status === "watch"
      ? {
          stage: "ai_pipeline_sample_recheck",
          priorityScore: Math.max(item.priorityScore, 88),
          ownerRole: "写作制片 / 审稿负责人",
          title: `${item.platformName}：恢复观察小样本复验`,
          detail: "AI 写审改恢复依据还在观察期，只准继续 1 章小样本复验，不回推荐批量，过线后再考虑恢复小批。",
          dueLabel: "今天先跑 1 章",
          actionLabel: "继续小样本",
          acceptanceCriteria: [
            "已跑 1 章小样本复验",
            "已记录成功率、质量、失败/成本和放量结论",
            "小样本未过线前不回推荐批量",
          ],
        }
      : item.status === "blocked"
    ? {
        stage: "repair_tactic",
        priorityScore: Math.max(item.priorityScore, 92),
        ownerRole: "打法修复主编",
        title: `${item.platformName} 恢复放量重做打法`,
        detail: "这条恢复放量经验已经进入暂停避坑，先拆失败原因，重做开头钩子、前三章兑现或平台包装，再允许新样本。",
        dueLabel: "今天",
        actionLabel: "重做打法",
        acceptanceCriteria: [
          "已写明暂停迁移原因",
          "已重做开头、前三章兑现或平台包装中的关键弱项",
          "新打法必须重新走小样本，不直接放量",
        ],
      }
    : item.status === "watch"
      ? {
          stage: "start_metrics_recovery",
          priorityScore: Math.max(item.priorityScore, 78),
          ownerRole: "追读数据运营",
          title: `${item.platformName} 恢复放量补追读证据`,
          detail: "这条恢复放量经验还在继续观察，先补一轮曝光、点击、追读、收藏或评论证据，再决定是否继续小样本。",
          dueLabel: "发布后 24 小时",
          actionLabel: "补追读证据",
          acceptanceCriteria: [
            "已回填至少一轮追读或收藏证据",
            "已标明继续观察原因",
            "没有证据前不扩大恢复放量批次",
          ],
        }
      : {
          stage: "scale_up",
          priorityScore: Math.max(item.priorityScore, 84),
          ownerRole: "小样本运营",
          title: `${item.platformName} 恢复放量继续小样本`,
          detail: "这条恢复放量经验只允许小步复用，继续跑小样本验证前三章兑现、平台反馈和追读信号，过线后再进入下一轮加码。",
          dueLabel: "今天",
          actionLabel: "继续小样本",
          acceptanceCriteria: [
            "已建立新的小样本批次",
            "已记录前三章兑现、平台反馈和追读信号",
            "小样本未过线前不进入大批量复用",
          ],
        };

  return {
    id: dispatchKey,
    platformId: item.platformId,
    platformName: item.platformName,
    stage: spec.stage,
    state: persisted?.state ?? "queued",
    priorityScore: spec.priorityScore,
    ownerRole: spec.ownerRole,
    title: spec.title,
    detail: spec.detail,
    dueLabel: spec.dueLabel,
    actionLabel: spec.actionLabel,
    href: item.href || "/gate#platform-tactic-experience",
    acceptanceCriteria: spec.acceptanceCriteria,
    evidence: commonEvidence,
    reviewLatestAt: item.latestAt,
  };
}

export function buildGatePlatformTacticExperienceStartHref(item: Pick<GatePlatformTacticExperienceItem, "platformId" | "tactic" | "status">) {
  const params = new URLSearchParams();
  params.set("startPlatform", item.platformId);
  params.set("startTactic", item.tactic);
  params.set("startSource", item.status);
  return `/projects?${params.toString()}`;
}

function platformFromBatchTacticTitle(title: string) {
  const platformName = title.match(/首轮平台打法[:：](.+)$/u)?.[1]?.trim() ?? "";
  return platformProfiles.find((platform) => platform.name === platformName)
    ?? platformProfiles.find((platform) => title.includes(platform.name))
    ?? null;
}

function batchTacticEffectExperienceItem(item: GateBatchTacticEffectItem): GatePlatformTacticExperienceItem | null {
  const platform = platformFromBatchTacticTitle(item.tacticTitle);
  if (!platform) return null;
  const recovery = item.recoveryBatches > 0;
  const recoveryStableGate = recovery
    ? item.recoveryBatches >= 2
      ? `恢复放量：已验证 ${item.recoveryBatches} 批，满足连续稳定入库线`
      : `恢复放量：已验证 ${item.recoveryBatches} 批，还差 ${2 - item.recoveryBatches} 批稳定样本才准入库`
    : null;
  return {
    platformId: platform.id,
    platformName: platform.name,
    status: item.status,
    label: item.status === "usable" ? "可复用打法" : item.status === "blocked" ? "避坑样本" : "观察样本",
    tactic: recovery
      ? item.status === "usable" ? "恢复放量打法" : item.status === "blocked" ? "恢复放量避坑" : "恢复放量观察"
      : item.label,
    lesson: recovery
      ? item.status === "usable"
        ? `${platform.name} 恢复放量已经连续稳定，成功率 ${item.successRatePercent}%，质量 ${item.averageQualityScore ?? "缺"}，可以作为解除闸门后的谨慎参考打法。`
        : item.status === "blocked"
          ? `${platform.name} 恢复放量样本已经变成避坑信号，先停掉这套恢复节奏，拆失败和低分原因。`
          : `${platform.name} 恢复放量样本还薄，只能作为观察流程，不能写成成功打法。`
      : `${platform.name} ${item.label}，成功率 ${item.successRatePercent}%，质量 ${item.averageQualityScore ?? "缺"}。`,
    reuseHint: recovery
      ? item.status === "usable"
        ? "新项目可以参考这套恢复后的平台节奏，但新项目仍先跑小样本，确认前三章兑现、模型路线和追读证据后再加码。"
        : "新项目只能复用这套恢复验证清单，先小样本，不要直接放量。"
      : item.nextAction,
    risk: recovery
      ? "恢复放量是解除闸门后的参考，不是跨题材无限复用；换题材、换平台或模型路线变化时必须重新小样本验证。"
      : item.risk,
    href: "/gate#platform-tactic-experience",
    sourceStatus: item.status === "blocked" ? "blocked" : item.status === "watch" ? "needs_effect" : "healthy",
    sourceLabel: item.label,
    priorityScore: item.status === "usable" ? 88 : item.status === "watch" ? 68 : 95,
    latestAt: item.latestAt,
    evidence: [
      recoveryStableGate,
      `批量效果：成功 ${item.succeededTasks}，失败 ${item.failedTasks}，成功率 ${item.successRatePercent}%，质量 ${item.averageQualityScore ?? "缺"}`,
      ...item.evidence,
    ].filter((line): line is string => Boolean(line)).slice(0, 5),
  };
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
  recoveryBatches: number;
  rhythmRecheckBatches?: number;
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

function gatePlatformStrategyPayloadTaskId(payload: GatePlatformStrategyReceiptPayload) {
  if (payload.task?.id) return payload.task.id;

  for (const result of payload.results ?? []) {
    if (!result || typeof result !== "object") continue;
    const record = result as Record<string, unknown>;
    if (typeof record.taskId === "string" && record.taskId) return record.taskId;
    const task = record.task;
    if (task && typeof task === "object") {
      const taskRecord = task as Record<string, unknown>;
      if (typeof taskRecord.id === "string" && taskRecord.id) return taskRecord.id;
    }
  }

  return null;
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

export interface GateFirstThreeAdoptionReceiptResult {
  id: string;
  projectId: string;
  projectTitle: string;
  label: string;
  title: string;
  status: "succeeded" | "failed";
  message?: string;
}

export interface GateFirstThreeAdoptionClosureSummaryItem {
  id: string;
  projectId: string;
  projectTitle: string;
  label: string;
  title: string;
  message?: string;
}

export interface GateFirstThreeAdoptionClosureSummary {
  closedCount: number;
  blockedCount: number;
  headline: string;
  nextAction: string;
  closed: GateFirstThreeAdoptionClosureSummaryItem[];
  blocked: GateFirstThreeAdoptionClosureSummaryItem[];
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

function batchScaleGate(value: unknown): GateActionReceiptBatchContext["scaleGate"] {
  if (value === "sample_only" || value === "cleared") return value;
  return "none";
}

function batchContextFromPayload(payload: GateActionReceiptPayload): GateActionReceiptBatchContext | null {
  const recheckMode = payload.aiPipelineRecheck?.mode;
  const scaleGate = recheckMode === "small_batch_resume"
    ? "cleared"
    : recheckMode === "sample_recheck"
      ? "sample_only"
      : batchScaleGate(payload.plan?.scaleGate);
  const actionLabel = payload.plan?.actionLabel ?? "";
  const category = typeof payload.plan?.category === "string" ? payload.plan.category : null;
  const receiptHeadline = payload.batchReceipt?.headline ?? "";
  const receiptStatus = payload.batchReceipt?.status ?? "";
  const rhythmRecheck = payload.batchRhythmRecheck ?? null;
  if (scaleGate === "none" && !actionLabel && !receiptHeadline && !rhythmRecheck) return null;

  return {
    scaleGate,
    actionLabel,
    category,
    receiptHeadline,
    receiptStatus,
    rhythmRecheck,
  };
}

function batchContextText(context?: GateActionReceiptBatchContext | null) {
  if (!context) return "";
  if (context.rhythmRecheck) return "节奏复验";
  if (context.scaleGate === "cleared") return "恢复放量";
  if (context.scaleGate === "sample_only") return "小样本";
  return "";
}

function emptyRecommendedBatchReceiptFocus(): GateRecommendedBatchReceiptFocus {
  return {
    visible: false,
    tone: "review",
    headline: "",
    detail: "",
    primaryLabel: "",
    primaryHref: "/tasks",
    badges: [],
  };
}

function recommendedBatchFocusTone(receipt: GateActionReceipt): GateRecommendedBatchReceiptFocusTone {
  const summary = receipt.batchEffectSummary;
  if (receipt.status === "failed" || receipt.failedCount > 0) return "blocked";
  if (typeof summary?.successRatePercent === "number" && summary.successRatePercent < 80) return "blocked";
  if (typeof summary?.averageQualityScore === "number" && summary.averageQualityScore < 80) return "review";
  return "ready";
}

function recommendedBatchFocusHeadline(tone: GateRecommendedBatchReceiptFocusTone, context?: GateActionReceiptBatchContext | null) {
  if (context?.scaleGate === "cleared") {
    if (tone === "blocked") return "恢复批回执提示先修复";
    if (tone === "review") return "恢复批质量需要复查";
    return "恢复批回执已反哺总闸门";
  }
  if (context?.scaleGate === "sample_only") {
    if (tone === "blocked") return "小样本回执提示先修复";
    if (tone === "review") return "小样本质量需要复查";
    return "小样本回执已反哺总闸门";
  }
  if (tone === "blocked") return "小批回执提示先修复";
  if (tone === "review") return "小批质量需要复查";
  return "小批回执已反哺总闸门";
}

function recommendedBatchFocusDetail(receipt: GateActionReceipt) {
  const summary = receipt.batchEffectSummary;
  const batchContext = batchContextText(receipt.batchContext);
  const metrics = [
    typeof summary?.successRatePercent === "number" ? `成功率 ${summary.successRatePercent}%` : null,
    typeof summary?.averageQualityScore === "number" ? `质量 ${summary.averageQualityScore}` : "质量缺",
    typeof summary?.knownCostUsd === "number" ? `成本 $${summary.knownCostUsd.toFixed(4)}` : null,
  ].filter(Boolean).join("，");
  const context = receipt.batchContext?.receiptHeadline || "";
  const recheck = receipt.recheck.detail;
  return [batchContext, metrics, context, recheck].filter(Boolean).join("。");
}

function recommendedBatchFocusBadges(receipt: GateActionReceipt) {
  const summary = receipt.batchEffectSummary;
  const badges = [
    `成功 ${receipt.succeededCount}`,
    `失败 ${receipt.failedCount}`,
  ];
  if (typeof summary?.averageQualityScore === "number") badges.push(`质量 ${summary.averageQualityScore}`);
  if (typeof summary?.knownCostUsd === "number") badges.push(`成本 $${summary.knownCostUsd.toFixed(4)}`);
  if (receipt.batchContext?.scaleGate === "cleared") badges.push("恢复放量");
  if (receipt.batchContext?.scaleGate === "sample_only") badges.push("小样本验证");
  return badges;
}

export function buildGateRecommendedBatchReceiptFocus(
  receipt?: GateActionReceipt | null,
): GateRecommendedBatchReceiptFocus {
  if (!receipt || receipt.executionType !== "recommended_batch") return emptyRecommendedBatchReceiptFocus();

  const tone = recommendedBatchFocusTone(receipt);
  return {
    visible: true,
    tone,
    headline: recommendedBatchFocusHeadline(tone, receipt.batchContext),
    detail: recommendedBatchFocusDetail(receipt),
    primaryLabel: receipt.recheck.label || "复检任务队列",
    primaryHref: "/tasks",
    badges: recommendedBatchFocusBadges(receipt),
  };
}

function firstThreeAdoptionClosureFromPayload(payload: GateActionReceiptPayload): GateFirstThreeAdoptionClosureSummary | null {
  const summary = payload.firstThreeAdoptionClosure;
  if (!summary) return null;
  return {
    closedCount: Math.max(0, Math.round(summary.closedCount || 0)),
    blockedCount: Math.max(0, Math.round(summary.blockedCount || 0)),
    headline: summary.headline || "",
    nextAction: summary.nextAction || "刷新总闸门复检。",
    closed: Array.isArray(summary.closed) ? summary.closed : [],
    blocked: Array.isArray(summary.blocked) ? summary.blocked : [],
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
    if (input.action.id.startsWith("project-acceptance:")) {
      return {
        status: "ready",
        label: "复检项目验收单",
        detail: "单本作品验收单修复动作已完成，刷新总闸门后确认审稿、二改、派单回执和发布包验收是否解除阻塞。",
        actionLabel: "刷新总闸门",
      };
    }
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
      actionLabel: "去采纳候选",
    };
  }

  if (input.item.actionType === "rewrite_first_three") {
    return {
      status: "ready",
      label: "复检前三章与发布包",
      detail: "前三章已重写，刷新总闸门后确认弱转化平台是否进入新一轮基准和回填。",
      actionLabel: "去采纳改写",
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

export interface GateActionAuditRecord {
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
  taskId?: string | null;
  platformId: string;
  platformName: string;
  recheckStatus: string;
  recheckLabel: string;
  recheckDetail: string;
  recheckAction: string;
  payload: string;
  createdAt: string | Date;
}

function parseGateActionReceiptPayload(payload: string): GateActionReceiptPayload {
  try {
    const parsed = JSON.parse(payload) as GateActionReceiptPayload;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function auditCreatedAt(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export function gateActionReceiptFromAuditRecord(record: GateActionAuditRecord): GateActionReceipt {
  const payload = parseGateActionReceiptPayload(record.payload);

  return {
    id: record.receiptId,
    actionId: record.actionId,
    label: record.label,
    detail: record.detail,
    href: record.href,
    status: record.status === "failed" ? "failed" : "succeeded",
    message: record.message,
    executionType: record.executionType as GateActionReceipt["executionType"],
    succeededCount: record.succeededCount,
    failedCount: record.failedCount,
    taskId: record.taskId ?? null,
    platformId: record.platformId,
    platformName: record.platformName,
    startTactics: startTacticsFromPayload(payload),
    batchEffectSummary: batchEffectSummaryFromPayload(payload),
    batchContext: batchContextFromPayload(payload),
    firstThreeAdoptionClosure: firstThreeAdoptionClosureFromPayload(payload),
    recheck: {
      status: record.recheckStatus === "blocked" ? "blocked" : "ready",
      label: record.recheckLabel,
      detail: record.recheckDetail,
      actionLabel: record.recheckAction,
    },
    createdAt: auditCreatedAt(record.createdAt),
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
  const batchContext = batchContextFromPayload(payload);
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
    batchContext,
    firstThreeAdoptionClosure: firstThreeAdoptionClosureFromPayload(payload),
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

export function buildGateFailureRepairRecheckCard(
  review: GateFailureRepairReceiptReview,
  batch: FailureRepairBatch,
  persistedTasks: PersistedGatePlatformDispatchTask[] = [],
): GateFailureRepairRecheckCard | null {
  const [dispatch] = buildGateFailureRepairRecheckDispatchItems(review, batch, persistedTasks);
  if (!dispatch) return null;

  const primaryActionLabel = dispatch.state === "completed"
    ? "查看复检结果"
    : dispatch.state === "assigned"
      ? "提交复检依据"
      : "接单复检";

  return {
    dispatchKey: dispatch.id,
    state: dispatch.state,
    title: dispatch.title,
    detail: dispatch.detail,
    ownerRole: dispatch.ownerRole,
    dueLabel: dispatch.dueLabel,
    href: dispatch.href,
    primaryActionLabel,
    completionEvidencePlaceholder: "复检配置、重试结果和失败列表：未恢复失败 __ 个；已确认配置/上下文/样本重试；下一步 __。",
    acceptanceCriteria: dispatch.acceptanceCriteria,
    evidence: dispatch.evidence,
  };
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

export function buildGateFailureRepairFollowupNotice(
  review: GateFailureRepairReceiptReview,
  resolution: GateFailureRepairRecheckResolution,
): GateFailureRepairFollowupNotice {
  if (resolution.status === "resolved" || review.status === "cleared") {
    return {
      tone: "resolved",
      label: "失败修复已闭环",
      detail: resolution.status === "resolved" ? resolution.detail : review.detail,
      actionLabel: "恢复任务中心",
      href: "/tasks",
      badges: ["未恢复 0", `回执 ${review.receipts}`, "可恢复小批前复查"],
    };
  }

  if (resolution.status === "failed") {
    return {
      tone: "failed",
      label: "复检未通过，进入第三轮",
      detail: resolution.detail,
      actionLabel: "生成第三轮处理建议",
      href: resolution.href,
      badges: [`未恢复 ${resolution.unresolvedFailures}`, `复检 ${resolution.completedRechecks}`, "继续拆失败"],
    };
  }

  if (resolution.status === "active") {
    return {
      tone: "active",
      label: "等待复检完成",
      detail: resolution.detail,
      actionLabel: "查看复检派单",
      href: resolution.href,
      badges: [`未恢复 ${resolution.unresolvedFailures}`, "已派单", "等完成依据"],
    };
  }

  if (review.status === "recheck" || review.status === "blocked") {
    return {
      tone: "recheck",
      label: review.status === "blocked" ? "修复失败，先派复检" : "已记录修复，去复检",
      detail: `${review.detail} 下一步去派单中心接住失败修复后复检。`,
      actionLabel: "去派单复检",
      href: "/dispatch",
      badges: [`回执 ${review.receipts}`, "复检未派", review.status === "blocked" ? "先查失败动作" : "别直接放量"],
    };
  }

  return {
    tone: "open",
    label: review.label,
    detail: review.detail,
    actionLabel: "记录修复回执",
    href: "/failures",
    badges: [`回执 ${review.receipts}`, "先修再验", "未进入复检"],
  };
}

function failureRepairThirdRoundState(
  dispatchKey: string,
  persistedTasks: PersistedGatePlatformDispatchTask[],
): GatePlatformGrowthDispatchState {
  return persistedTasks.find((task) => task.dispatchKey === dispatchKey)?.state ?? "queued";
}

function failureRepairThirdRoundEvidence(
  resolution: GateFailureRepairRecheckResolution,
  batch: FailureRepairBatch,
  kind?: FailureRepairBatch["items"][number]["repairKind"],
) {
  const scopedItems = kind ? batch.items.filter((item) => item.repairKind === kind) : batch.items;
  return [
    ...resolution.evidence,
    ...scopedItems.slice(0, 3).map((item) => `${item.projectTitle} · ${item.taskLabel} · ${item.providerName}/${item.model}：${item.errorMessage}`),
    `未恢复失败 ${batch.summary.unresolvedFailures} 个`,
  ].slice(0, 6);
}

export function buildGateFailureRepairThirdRoundDispatchItems(
  resolution: GateFailureRepairRecheckResolution,
  batch: FailureRepairBatch,
  persistedTasks: PersistedGatePlatformDispatchTask[] = [],
): GatePlatformGrowthDispatchItem[] {
  if (resolution.status !== "failed" || batch.summary.unresolvedFailures <= 0) return [];

  const now = new Date().toISOString();
  const items: GatePlatformGrowthDispatchItem[] = [];
  const firstRetry = batch.items.find((item) => item.repairKind === "retry");
  const firstManual = batch.items.find((item) => item.repairKind === "manual");

  if (batch.summary.configFailures > 0) {
    const dispatchKey = "global:failure_third_round:config";
    items.push({
      id: dispatchKey,
      platformId: "global",
      platformName: "全局任务",
      stage: "failure_config_repair",
      state: failureRepairThirdRoundState(dispatchKey, persistedTasks),
      priorityScore: 99,
      ownerRole: "模型配置负责人",
      title: "第三轮模型配置修复",
      detail: `${batch.summary.configFailures} 个失败仍指向 API Key、权限或模型配置。先把配置链路验清楚，否则后面的重试只是重复失败。`,
      dueLabel: "立即",
      actionLabel: "派给配置负责人",
      href: "/settings/models",
      acceptanceCriteria: [
        "API Key、权限和模型配置已完成复检",
        "至少一个失败样本完成配置修复后的成功验证",
        "仍异常的提供商已标记为暂缓使用",
      ],
      evidence: failureRepairThirdRoundEvidence(resolution, batch, "config"),
      reviewLatestAt: now,
    });
  }

  if (batch.summary.affectedProviders > 0) {
    const dispatchKey = "global:failure_third_round:route";
    items.push({
      id: dispatchKey,
      platformId: "global",
      platformName: "全局任务",
      stage: "failure_route_repair",
      state: failureRepairThirdRoundState(dispatchKey, persistedTasks),
      priorityScore: 96,
      ownerRole: "模型路由负责人",
      title: "第三轮模型路线降级",
      detail: `${batch.summary.affectedProviders} 个模型/提供商组合受影响。需要给失败任务配置备用模型、降级路线或暂停高风险路线。`,
      dueLabel: "今天",
      actionLabel: "派给路由负责人",
      href: "/settings/models",
      acceptanceCriteria: [
        "已给失败任务配置备用模型或降级路线",
        "高失败率模型已暂停或降权",
        "下一轮批量执行前有小样本验证计划",
      ],
      evidence: failureRepairThirdRoundEvidence(resolution, batch),
      reviewLatestAt: now,
    });
  }

  if (batch.summary.retryableFailures > 0 && firstRetry) {
    const dispatchKey = "global:failure_third_round:retry";
    items.push({
      id: dispatchKey,
      platformId: "global",
      platformName: "全局任务",
      stage: "failure_retry_repair",
      state: failureRepairThirdRoundState(dispatchKey, persistedTasks),
      priorityScore: 92,
      ownerRole: "章节重试负责人",
      title: "第三轮失败章节重试",
      detail: `${batch.summary.retryableFailures} 个失败可直接重试。先按章节抽样重试，确认通过后再恢复批量。`,
      dueLabel: "今天",
      actionLabel: "派给重试负责人",
      href: firstRetry.href,
      acceptanceCriteria: [
        "至少一个可重试失败样本已成功恢复",
        "失败章节的重试结果已回填任务中心",
        "批量恢复前失败率低于安全阈值",
      ],
      evidence: failureRepairThirdRoundEvidence(resolution, batch, "retry"),
      reviewLatestAt: now,
    });
  }

  if (batch.summary.manualFailures > 0 && firstManual) {
    const dispatchKey = "global:failure_third_round:manual";
    items.push({
      id: dispatchKey,
      platformId: "global",
      platformName: "全局任务",
      stage: "failure_manual_review",
      state: failureRepairThirdRoundState(dispatchKey, persistedTasks),
      priorityScore: 90,
      ownerRole: "故障复盘负责人",
      title: "第三轮人工故障复盘",
      detail: `${batch.summary.manualFailures} 个失败不能直接配置或重试解决，需要人工拆原因、定责任人和下一步动作。`,
      dueLabel: "今天",
      actionLabel: "派给复盘负责人",
      href: firstManual.href,
      acceptanceCriteria: [
        "每个人工失败都有明确原因分类",
        "下一步动作已拆到具体负责人",
        "不可恢复任务已标记为暂停或重建",
      ],
      evidence: failureRepairThirdRoundEvidence(resolution, batch, "manual"),
      reviewLatestAt: now,
    });
  }

  return items;
}

const failureRepairThirdRoundStages: GatePlatformGrowthReviewStage[] = [
  "failure_config_repair",
  "failure_route_repair",
  "failure_retry_repair",
  "failure_manual_review",
];

function failureRepairThirdRoundTasks(tasks: PersistedGatePlatformDispatchTask[]) {
  return tasks
    .filter((task) => failureRepairThirdRoundStages.includes(task.stage))
    .sort((left, right) => new Date(right.completedAt ?? right.updatedAt).getTime() - new Date(left.completedAt ?? left.updatedAt).getTime());
}

function failureRepairRouteLesson(
  batch: FailureRepairBatch,
  routeTask: PersistedGatePlatformDispatchTask | null,
  recovered: boolean,
): GateFailureRepairThirdRoundResolution["routeLesson"] {
  if (!routeTask) {
    return {
      status: "none",
      title: "暂无路由经验",
      rule: "第三轮还没有模型路由负责人完成依据，暂时不能沉淀路由避坑规则。",
      evidence: batch.guidance.slice(0, 3),
    };
  }

  const affectedModels = [...new Set(batch.items.map((item) => `${item.providerName}/${item.model}`))];
  const completionEvidence = routeTask.completionEvidence.trim();
  const rule = recovered
    ? `${completionEvidence} 后续同类失败优先避开 ${affectedModels.join("、") || "高失败路线"}，先走已验证备用模型，再恢复批量。`
    : `${completionEvidence} 但失败尚未清空，${affectedModels.join("、") || "当前路线"} 仍需降权或暂停，不能直接恢复批量。`;

  return {
    status: recovered ? "usable" : "blocked",
    title: recovered ? "可复用模型路由避坑" : "路由避坑仍待验证",
    rule,
    evidence: [
      ...(completionEvidence ? [`完成依据：${completionEvidence}`] : []),
      ...affectedModels.map((model) => `受影响模型：${model}`),
    ].slice(0, 5),
  };
}

export function buildGateFailureRepairThirdRoundResolution(
  batch: FailureRepairBatch,
  tasks: PersistedGatePlatformDispatchTask[],
): GateFailureRepairThirdRoundResolution {
  const thirdRoundTasks = failureRepairThirdRoundTasks(tasks);
  const completedTasks = thirdRoundTasks.filter((task) => task.state === "completed" && task.completionEvidence.trim());
  const routeTask = completedTasks.find((task) => task.stage === "failure_route_repair") ?? null;
  const evidence = [
    ...completedTasks.slice(0, 4).map((task) => `${task.ownerRole}：${task.completionEvidence.trim()}`),
    ...batch.items.slice(0, 3).map((item) => `${item.projectTitle} · ${item.taskLabel}：${item.errorMessage}`),
  ].slice(0, 6);

  if (thirdRoundTasks.length === 0) {
    return {
      status: "none",
      label: "第三轮未派单",
      detail: "第三轮处理卡还没有生成；先把复检未通过的问题拆给配置、路由、重试或人工复盘负责人。",
      actionLabel: "查看派单中心",
      href: "/dispatch",
      totalItems: 0,
      completedItems: 0,
      unresolvedFailures: batch.summary.unresolvedFailures,
      routeLesson: failureRepairRouteLesson(batch, null, false),
      evidence: batch.guidance.slice(0, 3),
    };
  }

  if (completedTasks.length < thirdRoundTasks.length) {
    return {
      status: "active",
      label: "第三轮处理中",
      detail: `第三轮已完成 ${completedTasks.length}/${thirdRoundTasks.length} 项，还不能判断是否恢复。`,
      actionLabel: "继续处理第三轮",
      href: "/dispatch",
      totalItems: thirdRoundTasks.length,
      completedItems: completedTasks.length,
      unresolvedFailures: batch.summary.unresolvedFailures,
      routeLesson: failureRepairRouteLesson(batch, routeTask, false),
      evidence: evidence.length ? evidence : thirdRoundTasks.flatMap((task) => task.evidence).slice(0, 5),
    };
  }

  if (batch.status !== "clear" || batch.summary.unresolvedFailures > 0) {
    return {
      status: "failed",
      label: "第三轮仍未恢复",
      detail: `第三轮已完成 ${completedTasks.length} 项，但当前仍有 ${batch.summary.unresolvedFailures} 个未恢复失败；路由和配置不能恢复批量。`,
      actionLabel: "继续总闸门复检",
      href: "/gate",
      totalItems: thirdRoundTasks.length,
      completedItems: completedTasks.length,
      unresolvedFailures: batch.summary.unresolvedFailures,
      routeLesson: failureRepairRouteLesson(batch, routeTask, false),
      evidence,
    };
  }

  return {
    status: "resolved",
    label: "第三轮恢复闭环",
    detail: `第三轮 ${completedTasks.length} 项处理完成后未恢复失败已归零，可以沉淀模型路由避坑规则。`,
    actionLabel: "查看模型路由",
    href: "/settings/models",
    totalItems: thirdRoundTasks.length,
    completedItems: completedTasks.length,
    unresolvedFailures: 0,
    routeLesson: failureRepairRouteLesson(batch, routeTask, true),
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
    taskId: gatePlatformStrategyPayloadTaskId(payload),
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

export function buildGateExportVersionActionReceipt(input: {
  projectId: string;
  projectTitle: string;
  action: PrePublishGateExportVersionAction;
  message?: string;
  now?: Date | string;
}): GateActionReceipt {
  const createdAt = input.now ? new Date(input.now).toISOString() : new Date().toISOString();
  const execution = input.action.execution;
  const actionType = execution?.type ?? "manual";
  const snapshotId = execution?.snapshotId ?? "none";
  const label = input.action.label;
  const message = input.message
    ?? (actionType === "lock_baseline"
      ? `已处理 ${input.projectTitle} 的导出基准：${label}。`
      : `已按快照重新生成 ${input.projectTitle} 的导出包。`);

  return {
    id: `export-version:${input.projectId}:${actionType}:${snapshotId}:${createdAt}`,
    actionId: `export-version:${input.projectId}:${actionType}`,
    label,
    detail: `${input.projectTitle} · 导出版本门禁 · ${input.action.detail}`,
    href: input.action.href,
    status: "succeeded",
    message,
    executionType: "export_version",
    succeededCount: 1,
    failedCount: 0,
    taskId: snapshotId === "none" ? null : snapshotId,
    platformId: "export_version",
    platformName: "导出版本",
    recheck: {
      status: "ready",
      label: "复检导出版本门禁",
      detail: "导出版本动作已执行，刷新总闸门后确认回退风险、基准状态和发布包下载是否恢复。",
      actionLabel: "刷新总闸门",
    },
    createdAt,
  };
}

export function buildGateFirstThreeAdoptionReceipt(input: {
  mode: "single" | "batch_review" | "batch_publish";
  items: PrePublishGateAdoptionFollowupItem[];
  results: GateFirstThreeAdoptionReceiptResult[];
  now?: Date | string;
}): GateActionReceipt {
  const createdAt = input.now ? new Date(input.now).toISOString() : new Date().toISOString();
  const firstItem = input.items[0] ?? null;
  const succeededCount = input.results.filter((result) => result.status === "succeeded").length;
  const failedCount = input.results.filter((result) => result.status === "failed").length;
  const modeLabel = input.mode === "batch_review"
    ? "批量重新审稿"
    : input.mode === "batch_publish"
      ? "批量刷新质检"
      : firstItem?.label ?? "采纳后续处理";
  const platformId = firstItem?.platformId ?? "first-three-adoption";
  const platformName = "前三章采纳闭环";
  const projectCount = new Set(input.items.map((item) => item.projectId)).size;
  const detailTarget = input.items.length > 1
    ? `${projectCount} 个项目 · ${input.items.length} 个后续任务`
    : `${firstItem?.projectTitle ?? "项目"} · ${firstItem?.title ?? "采纳后续任务"}`;
  const failedMessage = input.results.find((result) => result.status === "failed")?.message;
  const firstThreeAdoptionClosure = buildFirstThreeAdoptionClosureSummary(input.results);
  const message = failedCount > 0
    ? `${modeLabel}完成：已闭合 ${succeededCount} 个，仍需处理 ${failedCount} 个。${failedMessage ? `首个失败：${failedMessage}` : ""}`
    : `${modeLabel}完成：已闭合 ${succeededCount} 个，采纳后的审稿和发布质检证据已回到总闸门。`;

  return {
    id: `first-three-adoption:${input.mode}:${createdAt}`,
    actionId: `first-three-adoption:${input.mode}`,
    label: modeLabel,
    detail: `${detailTarget} · 采纳后正文变更闭环`,
    href: firstItem?.href ?? "/gate#first-three-adoption-closure",
    status: failedCount > 0 ? "failed" : "succeeded",
    message,
    executionType: "first_three_adoption",
    succeededCount,
    failedCount,
    taskId: null,
    platformId,
    platformName,
    firstThreeAdoptionClosure,
    recheck: {
      status: failedCount > 0 ? "blocked" : "ready",
      label: failedCount > 0 ? "处理失败项后复检" : "复检采纳闭环",
      detail: `${firstThreeAdoptionClosure.headline}${firstThreeAdoptionClosure.nextAction}`,
      actionLabel: "刷新总闸门",
    },
    createdAt,
  };
}

export function buildFirstThreeAdoptionClosureSummary(
  results: GateFirstThreeAdoptionReceiptResult[],
): GateFirstThreeAdoptionClosureSummary {
  const closed = results
    .filter((result) => result.status === "succeeded")
    .map(({ id, projectId, projectTitle, label, title, message }) => ({ id, projectId, projectTitle, label, title, message }));
  const blocked = results
    .filter((result) => result.status === "failed")
    .map(({ id, projectId, projectTitle, label, title, message }) => ({ id, projectId, projectTitle, label, title, message }));
  const headline = blocked.length > 0
    ? `已闭合 ${closed.length} 条采纳后续，${blocked.length} 条仍阻塞。`
    : `本批 ${closed.length} 条采纳后续已闭合。`;
  const nextAction = blocked.length > 0
    ? "先处理失败项，再刷新总闸门复检。"
    : "刷新总闸门复检，确认前三章采纳链路放行。";

  return {
    closedCount: closed.length,
    blockedCount: blocked.length,
    headline,
    nextAction,
    closed,
    blocked,
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

function isPlatformDispatchCompletionReceipt(receipt: GateActionReceipt) {
  return receipt.actionId.startsWith("gate-dispatch-completion:");
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

function knowledgeFeedbackDispatchStage(receipt: GateKnowledgeFeedbackReceipt): GatePlatformGrowthReviewStage {
  const text = [
    receipt.actionLabel,
    receipt.title,
    receipt.completedStepLabel,
    receipt.stopReason,
    receipt.nextAction,
    receipt.href,
  ].join(" ");
  if (/asset|投稿资产|候选|采纳|素材|简介|标题|标签/i.test(text)) return "adopt_asset";
  if (/metric|effect|数据|曝光|点击|阅读|追读|收藏|转化|效果/i.test(text)) return "record_metrics";
  if (/失败|错误|重试|修复|配置|模型|key|api/i.test(text)) return "fix_failure";
  return "repair_tactic";
}

function knowledgeFeedbackHref(receipt: GateKnowledgeFeedbackReceipt) {
  if (receipt.href.startsWith("/")) return receipt.href;
  if (receipt.projectId && receipt.href.startsWith("#")) return `/projects/${receipt.projectId}${receipt.href}`;
  if (receipt.projectId) return `/projects/${receipt.projectId}#platform-export`;
  return "/gate";
}

function knowledgeFeedbackOwnerRole(stage: GatePlatformGrowthReviewStage) {
  if (stage === "record_metrics") return "运营数据编辑";
  if (stage === "adopt_asset") return "包装运营";
  if (stage === "fix_failure") return "技术运营";
  return "主编";
}

function knowledgeFeedbackActionLabel(stage: GatePlatformGrowthReviewStage) {
  if (stage === "record_metrics") return "派给数据编辑";
  if (stage === "adopt_asset") return "派给包装运营";
  if (stage === "fix_failure") return "派给技术运营";
  return "派给主编修打法";
}

export function buildGateKnowledgeFeedbackDispatchItems(
  feedbackReceipts: GateKnowledgeFeedbackReceipt[],
  limit = 4,
  persistedTasks: PersistedGatePlatformDispatchTask[] = [],
): GatePlatformGrowthDispatchItem[] {
  const persistedByKey = new Map(persistedTasks.map((task) => [task.dispatchKey, task]));
  return [...feedbackReceipts]
    .filter((receipt) => !receipt.id.startsWith("gate-dispatch-completion:"))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .map((receipt): GatePlatformGrowthDispatchItem => {
      const stage = knowledgeFeedbackDispatchStage(receipt);
      const dispatchKey = `knowledge-feedback:${receipt.id}`;
      const persisted = persistedByKey.get(dispatchKey);
      const stopReason = receipt.stopReason.trim() || "反哺链路需要人工收口";
      const nextAction = receipt.nextAction.trim() || "处理平台反哺停点，并回填新的证据。";
      const completedStep = receipt.completedStepLabel.trim() || receipt.actionLabel.trim() || "平台反哺";
      const projectLabel = receipt.projectTitle?.trim() ? `《${receipt.projectTitle.trim()}》` : "对应项目";
      const evidence = [
        `${completedStep}：${receipt.actionLabel || receipt.platformName}`,
        `停点：${stopReason}`,
        `下一步：${nextAction}`,
      ];

      return {
        id: dispatchKey,
        platformId: receipt.platformId,
        platformName: receipt.platformName,
        stage,
        state: persisted?.state ?? "queued",
        priorityScore: receipt.severity === "needs_action" ? 92 : 76,
        ownerRole: knowledgeFeedbackOwnerRole(stage),
        title: `${receipt.platformName} 反哺停点收口`,
        detail: `${projectLabel} 已完成「${completedStep}」，现在卡在「${stopReason}」。下一步：${nextAction}`,
        dueLabel: receipt.severity === "needs_action" ? "今天收口" : "48小时内复核",
        actionLabel: knowledgeFeedbackActionLabel(stage),
        href: knowledgeFeedbackHref(receipt),
        acceptanceCriteria: [
          `已处理停点：${stopReason}`,
          `已完成下一步：${nextAction}`,
          "平台导出中心已有新的反哺记录或完成证据",
        ],
        evidence,
        reviewLatestAt: receipt.createdAt,
      };
    })
    .filter((item, index, allItems) => allItems.findIndex((candidate) => candidate.id === item.id) === index)
    .slice(0, limit);
}

function evidenceLoopStage(status: GatePlatformEvidenceLoop["status"]): GatePlatformGrowthReviewStage {
  if (status === "scale") return "scale_up";
  if (status === "watch") return "record_metrics";
  if (status === "repair") return "repair_tactic";
  if (status === "pause") return "pause_platform";
  return "adopt_asset";
}

function evidenceLoopOwnerRole(status: GatePlatformEvidenceLoop["status"]) {
  if (status === "scale") return "增长运营";
  if (status === "watch") return "运营数据编辑";
  if (status === "repair") return "主编";
  if (status === "pause") return "主编";
  return "包装运营";
}

function evidenceLoopDueLabel(status: GatePlatformEvidenceLoop["status"]) {
  if (status === "scale") return "下一轮更新前";
  if (status === "watch") return "48小时内补证据";
  if (status === "repair") return "今天修打法";
  if (status === "pause") return "今天止损";
  return "今天启动";
}

export function buildGatePlatformEvidenceLoopDispatchItems(
  loops: GatePlatformEvidenceLoop[],
  limit = 5,
  persistedTasks: PersistedGatePlatformDispatchTask[] = [],
): GatePlatformGrowthDispatchItem[] {
  const persistedByKey = new Map(persistedTasks.map((task) => [task.dispatchKey, task]));
  return [...loops]
    .sort((left, right) => right.score - left.score || left.projectTitle.localeCompare(right.projectTitle))
    .map((loop): GatePlatformGrowthDispatchItem => {
      const stage = evidenceLoopStage(loop.status);
      const dispatchKey = `evidence-loop:${loop.projectId}:${loop.platformId}:${loop.status}`;
      const persisted = persistedByKey.get(dispatchKey);
      const projectLabel = `《${loop.projectTitle}》`;
      const title = `${loop.platformName} ${loop.label}派单`;
      return {
        id: dispatchKey,
        platformId: loop.platformId,
        platformName: loop.platformName,
        stage,
        state: persisted?.state ?? "queued",
        priorityScore: loop.status === "pause"
          ? 96
          : loop.status === "repair"
            ? 92
            : loop.status === "scale"
              ? 88
              : loop.status === "empty"
                ? 84
                : 78,
        ownerRole: evidenceLoopOwnerRole(loop.status),
        title,
        detail: `${projectLabel} ${loop.headline} 证据闭环 ${loop.score} 分。下一步：${loop.nextAction}`,
        dueLabel: evidenceLoopDueLabel(loop.status),
        actionLabel: loop.actionLabel,
        href: `/projects/${loop.projectId}#${loop.targetAnchor}`,
        acceptanceCriteria: [
          `证据闭环状态已处理：${loop.label}`,
          `已执行下一步：${loop.nextAction}`,
          "项目控制台或平台导出中心已有新的证据回填",
        ],
        evidence: [
          `证据闭环 ${loop.score} 分：${loop.label}`,
          ...loop.evidence,
        ].slice(0, 4),
        reviewLatestAt: new Date().toISOString(),
      };
    })
    .filter((item, index, allItems) => allItems.findIndex((candidate) => candidate.id === item.id) === index)
    .slice(0, limit);
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

function isFirstDayHandoffDispatchTask(task: Pick<PersistedGatePlatformDispatchTask, "dispatchKey">) {
  return task.dispatchKey.startsWith("first-day-handoff:");
}

function firstDayHandoffStageFromDispatchKey(dispatchKey: string) {
  const stage = dispatchKey.split(":").at(-1);
  if (stage === "opening" || stage === "verification" || stage === "platform-package") return stage;
  return "handoff";
}

function firstDayHandoffStageLabel(dispatchKey: string) {
  const stage = firstDayHandoffStageFromDispatchKey(dispatchKey);
  if (stage === "opening") return "开头打法交接";
  if (stage === "verification") return "验收口径交接";
  if (stage === "platform-package") return "平台包装回收";
  return "经验开书交接";
}

export function buildGatePlatformDispatchReceipt(input: {
  dispatch: GatePlatformGrowthDispatchItem;
  now?: Date | string;
}): GateActionReceipt {
  const createdAt = input.now ? new Date(input.now).toISOString() : new Date().toISOString();
  const actionKey = input.dispatch.id.startsWith("knowledge-feedback:")
    ? input.dispatch.id
    : input.dispatch.stage;
  return {
    id: `gate-platform-dispatch:${input.dispatch.id}:${createdAt}`,
    actionId: `gate-platform-dispatch:${actionKey}:${input.dispatch.platformId}`,
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

export function buildGateDispatchCompletionReceipt(input: {
  dispatch: GatePlatformGrowthDispatchItem;
  completionEvidence: string;
  now?: Date | string;
}): GateActionReceipt {
  const createdAt = input.now ? new Date(input.now).toISOString() : new Date().toISOString();
  const evidence = input.completionEvidence.trim();
  return {
    id: `gate-dispatch-completion:${input.dispatch.id}:${createdAt}`,
    actionId: `gate-dispatch-completion:${input.dispatch.stage}:${input.dispatch.platformId}`,
    label: `${input.dispatch.actionLabel}完成`,
    detail: `${input.dispatch.platformName} · ${input.dispatch.title}`,
    href: input.dispatch.href,
    status: "succeeded",
    message: `已验收 ${input.dispatch.platformName} 派单「${input.dispatch.title}」：${evidence}`,
    executionType: "manual",
    succeededCount: 1,
    failedCount: 0,
    taskId: input.dispatch.id,
    platformId: input.dispatch.platformId,
    platformName: input.dispatch.platformName,
    recheck: {
      status: "ready",
      label: "复检派单完成结果",
      detail: "派单完成依据已经形成业务回执，刷新总闸门后确认平台证据、发布包或修复链路是否闭环。",
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
    firstThreeAdoptionClosure: receipt.firstThreeAdoptionClosure ?? undefined,
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

export async function fetchGateKnowledgeFeedbackReceipts(options?: { limit?: number }) {
  const params = new URLSearchParams();
  if (options?.limit) params.set("limit", String(options.limit));
  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(`/api/gate/knowledge-feedback${query}`, { cache: "no-store" });
  const payload = (await response.json().catch(() => null)) as {
    receipts?: GateKnowledgeFeedbackReceipt[];
    error?: string;
  } | null;
  if (!response.ok) throw new Error(payload?.error ?? "读取平台反哺记录失败。");
  return payload?.receipts ?? [];
}

export async function fetchGatePlatformEvidenceLoops(options?: { limit?: number }) {
  const params = new URLSearchParams();
  if (options?.limit) params.set("limit", String(options.limit));
  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(`/api/gate/evidence-loops${query}`, { cache: "no-store" });
  const payload = (await response.json().catch(() => null)) as {
    loops?: GatePlatformEvidenceLoop[];
    error?: string;
  } | null;
  if (!response.ok) throw new Error(payload?.error ?? "读取平台证据闭环评分失败。");
  return payload?.loops ?? [];
}

export function filterGateDispatchTasks(
  tasks: PersistedGatePlatformDispatchTask[],
  filters: GateDispatchTaskFilters,
) {
  return tasks
    .filter((task) => true
      && (!filters.state || filters.state === "all" || task.state === filters.state)
      && (!filters.platformId || filters.platformId === "all" || task.platformId === filters.platformId)
      && (!filters.ownerRole || filters.ownerRole === "all" || task.ownerRole === filters.ownerRole)
      && (!filters.recheckFollowUpOnly || isChapterProductionRecheckFollowUpTask(task)))
    .sort((left, right) => {
      const stateWeight: Record<GatePlatformGrowthDispatchState, number> = { queued: 0, assigned: 1, completed: 2 };
      const stateDiff = stateWeight[left.state] - stateWeight[right.state];
      if (stateDiff !== 0) return stateDiff;
      const priorityDiff = right.priorityScore - left.priorityScore;
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });
}

function isAiPipelineDispatchTask(task: PersistedGatePlatformDispatchTask) {
  return task.platformId === "ai-pipeline" || task.dispatchKey.startsWith("ai-pipeline-recheck:");
}

function aiPipelineGroupId(task: PersistedGatePlatformDispatchTask): GateDispatchTaskCenterAiPipelineGroupId {
  const text = `${task.dispatchKey} ${task.title} ${task.actionLabel} ${task.detail}`;
  if (/:rollback\b/u.test(task.dispatchKey) || /回滚|跌线|修复/u.test(text)) return "rollback_repair";
  if (task.stage === "ai_pipeline_small_batch" || /:scale\b/u.test(task.dispatchKey) || /恢复小批|回推荐批量/u.test(text)) return "small_batch_resume";
  return "sample_recheck";
}

function aiPipelineGroupMeta(id: GateDispatchTaskCenterAiPipelineGroupId) {
  if (id === "rollback_repair") {
    return {
      label: "回滚修复",
      headline: "恢复小批跌线先修",
      detail: "恢复小批没站住时，先修低分章节、开头钩子和章末追读，再回到 1 章复验。",
    };
  }
  if (id === "small_batch_resume") {
    return {
      label: "恢复小批",
      headline: "只准小步恢复",
      detail: "小样本过线后只恢复小批队列，继续看成功率、质量、成本和失败证据。",
    };
  }
  return {
    label: "小样本复验",
    headline: "观察期先跑样本",
    detail: "观察或修复后先跑 1 章样本，证据不闭合前不恢复批量生产。",
  };
}

function buildAiPipelineExecutionGuide(
  id: GateDispatchTaskCenterAiPipelineGroupId,
  topTask: PersistedGatePlatformDispatchTask | null,
): GateDispatchTaskCenterAiPipelineExecutionGuide {
  const primaryHref = topTask?.href ?? "/dispatch?queue=ai_pipeline";
  if (id === "rollback_repair") {
    return {
      primaryActionLabel: "运行 1 章复验",
      primaryHref,
      hint: "先在目标章节运行初稿、审稿或二改复验，把跌线原因修清楚后再考虑恢复小批。",
    };
  }
  if (id === "small_batch_resume") {
    return {
      primaryActionLabel: "恢复小批执行",
      primaryHref,
      hint: "回到推荐批量队列，但只按小批执行，继续记录成功率、质量、失败原因和成本。",
    };
  }
  return {
    primaryActionLabel: "运行 1 章复验",
    primaryHref,
    hint: "只跑 1 章样本，补齐质量、失败原因和成本证据；证据不闭合前不放量。",
  };
}

function buildAiPipelineDispatchGroups(
  aiPipelineDispatches: PersistedGatePlatformDispatchTask[],
): GateDispatchTaskCenterAiPipelineGroup[] {
  const order: GateDispatchTaskCenterAiPipelineGroupId[] = ["rollback_repair", "sample_recheck", "small_batch_resume"];
  const grouped = new Map<GateDispatchTaskCenterAiPipelineGroupId, PersistedGatePlatformDispatchTask[]>();
  for (const task of aiPipelineDispatches) {
    const id = aiPipelineGroupId(task);
    grouped.set(id, [...(grouped.get(id) ?? []), task]);
  }

  return order.flatMap((id) => {
    const tasks = grouped.get(id) ?? [];
    if (tasks.length === 0) return [];
    const meta = aiPipelineGroupMeta(id);
    const activeTasks = tasks.filter((task) => task.state !== "completed");
    const topTask = tasks[0] ?? null;
    return [{
      id,
      ...meta,
      total: tasks.length,
      active: activeTasks.length,
      topPriorityScore: tasks.reduce((score, task) => Math.max(score, task.priorityScore), 0),
      topTask,
      executionGuide: buildAiPipelineExecutionGuide(id, topTask),
      tasks,
    }];
  });
}

function latestPromptMemoryAudit(audits: ControlBatchAudit[], latestAt: string | null) {
  if (!latestAt) return null;
  return audits
    .filter((audit) => new Date(audit.createdAt).toISOString() === latestAt)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0] ?? null;
}

export function buildGateAiPipelineRecoveryPanel(
  _tasks: PersistedGatePlatformDispatchTask[],
  audits: ControlBatchAudit[] = [],
): GateAiPipelineRecoveryPanel {
  const center = buildGateDispatchTaskCenter(_tasks);
  const groups = center.aiPipelineGroups;
  const total = center.summary.aiPipeline;
  const active = center.summary.activeAiPipeline;
  const promptMemory = buildAiPipelinePromptMemorySummary(audits);
  const promptMemoryAudit = latestPromptMemoryAudit(audits, promptMemory.latestAt);
  const promptMemoryQuickAction = promptMemory.gateActionMode === "rollback" && promptMemoryAudit?.projectId
    ? {
      label: "生成 1 章复验派单",
      endpoint: `/api/projects/${promptMemoryAudit.projectId}/control-actions`,
      body: {
        areaId: "ai-pipeline" as const,
        memoryAction: "rollback" as const,
      },
      successHref: "/dispatch?queue=ai_pipeline",
      runAfterCreate: {
        lookupEndpoint: "/api/gate/dispatch-tasks?platformId=ai-pipeline&limit=80",
        runEndpoint: "/api/gate/ai-pipeline-recheck-samples",
      },
    }
    : null;
  const completed = total - active;
  const rollbackGroup = groups.find((group) => group.id === "rollback_repair") ?? null;
  const sampleGroup = groups.find((group) => group.id === "sample_recheck") ?? null;
  const smallBatchGroup = groups.find((group) => group.id === "small_batch_resume") ?? null;
  const activePrimaryGroup = [rollbackGroup, sampleGroup, smallBatchGroup].find((group) => (group?.active ?? 0) > 0) ?? null;
  const fallbackPrimaryGroup = activePrimaryGroup ?? groups[0] ?? null;
  const status: GateAiPipelineRecoveryPanel["status"] = total === 0
    ? promptMemory.gateTone === "blocked"
      ? "blocked"
      : promptMemory.gateTone === "watch"
        ? "watch"
        : promptMemory.gateTone === "ready"
          ? "ready"
          : "empty"
    : (rollbackGroup?.active ?? 0) > 0
      ? "blocked"
      : active > 0
        ? "watch"
        : "ready";
  const label = status === "empty"
    ? promptMemory.hasMemory
      ? promptMemory.gateStatusLabel
      : "暂无恢复派单"
    : status === "blocked"
      ? "先回滚修复"
      : status === "watch"
        ? "恢复观察中"
        : "恢复闭环完成";

  function dispatchHref(task: PersistedGatePlatformDispatchTask | null | undefined) {
    return task ? `/dispatch?queue=ai_pipeline#dispatch-${task.dispatchKey}` : "/dispatch?queue=ai_pipeline";
  }

  function primaryLabel(group: GateDispatchTaskCenterAiPipelineGroup | null) {
    if (!group) return "查看派单中心";
    if (group.id === "rollback_repair" && group.active > 0) return "先处理回滚修复";
    if (group.id === "sample_recheck" && group.active > 0) return "运行 1 章复验";
    if (group.id === "small_batch_resume" && group.active > 0) return "恢复小批执行";
    return "查看恢复记录";
  }

  function completionKindLabel(kind: GateAiPipelineRecoveryCompletionKind) {
    if (kind === "rollback_repair") return "回滚修复";
    if (kind === "small_batch_resume") return "恢复小批";
    return "小样本复验";
  }

  const latestEvidence = center.aiPipelineDispatches
    .filter((task) => task.state === "completed" && task.completionEvidence.trim().length > 0)
    .map((task) => {
      const completion = parseAiPipelineRecoveryCompletionEvidence(task, task.completionEvidence);
      if (!completion) return null;
      return {
        dispatchKey: task.dispatchKey,
        label: `最近恢复证据 · ${completionKindLabel(completion.kind)}`,
        kind: completion.kind,
        outcome: completion.outcome,
        nextAction: completion.nextAction,
        feedback: buildAiPipelineRecoveryCompletionFeedback(completion),
        evidence: completion.evidence,
        completedAt: task.completedAt,
        updatedAt: task.updatedAt,
        href: dispatchHref(task),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((left, right) => (
      new Date(right.completedAt ?? right.updatedAt).getTime() - new Date(left.completedAt ?? left.updatedAt).getTime()
    ))[0] ?? null;

  const currentConclusion: GateAiPipelineRecoveryPanel["currentConclusion"] = latestEvidence
    ? {
      status: latestEvidence.outcome === "usable"
        ? "resume"
        : latestEvidence.outcome === "blocked"
          ? "rollback"
          : "watch",
      label: latestEvidence.outcome === "usable"
        ? "可恢复小批"
        : latestEvidence.outcome === "blocked"
          ? "回滚修复"
          : "继续观察",
      headline: latestEvidence.feedback.headline,
      detail: latestEvidence.feedback.detail,
      primaryActionLabel: latestEvidence.feedback.primaryActionLabel,
      href: latestEvidence.href,
      latestAt: latestEvidence.completedAt,
    }
    : null;

  return {
    anchorId: "ai-pipeline-recovery",
    visible: total > 0 || promptMemory.history.length > 0 || promptMemory.hasMemory,
    status,
    label,
    headline: "AI 写审改恢复闸门",
    detail: total === 0
      ? "还没有 AI 写审改恢复派单。"
      : status === "blocked"
        ? "恢复小批已经跌线，先回滚修复低分章节、开头钩子和章末追读，再回 1 章小样本。"
        : status === "watch"
          ? "AI 写审改恢复仍在观察期，只允许按样本或小批节奏推进，不直接恢复大批量。"
          : "AI 写审改恢复派单已闭环，后续只按经验库小步复用，不把一次恢复当成永久通行证。",
    summary: {
      total,
      active,
      completed,
      rollback: rollbackGroup?.total ?? 0,
      sample: sampleGroup?.total ?? 0,
      smallBatch: smallBatchGroup?.total ?? 0,
    },
    primaryAction: {
      label: fallbackPrimaryGroup ? primaryLabel(fallbackPrimaryGroup) : promptMemory.gateActionLabel ?? "查看派单中心",
      href: fallbackPrimaryGroup ? dispatchHref(fallbackPrimaryGroup.topTask) : promptMemory.gateActionHref ?? "/dispatch?queue=ai_pipeline",
      detail: fallbackPrimaryGroup?.detail ?? promptMemory.gateStatusDetail,
    },
    latestEvidence: latestEvidence ? {
      dispatchKey: latestEvidence.dispatchKey,
      label: latestEvidence.label,
      kind: latestEvidence.kind,
      outcome: latestEvidence.outcome,
      nextAction: latestEvidence.nextAction,
      feedback: latestEvidence.feedback,
      evidence: latestEvidence.evidence,
      completedAt: latestEvidence.completedAt,
      href: latestEvidence.href,
    } : null,
    currentConclusion,
    promptMemory: {
      visible: promptMemory.history.length > 0 || promptMemory.hasMemory,
      hasMemory: promptMemory.hasMemory,
      statusLabel: promptMemory.gateStatusLabel,
      headline: promptMemory.promptFeedback.headline,
      detail: promptMemory.promptFeedback.detail,
      actionLabel: promptMemory.gateActionLabel,
      actionHref: promptMemory.gateActionHref,
      latestAt: promptMemory.latestAt,
      quickAction: promptMemoryQuickAction,
      history: promptMemory.history,
    },
    groups: groups.map((group) => ({
      id: group.id,
      label: group.label,
      headline: group.headline,
      detail: group.detail,
      total: group.total,
      active: group.active,
      actionLabel: group.topTask?.actionLabel ?? "查看派单",
      actionHref: dispatchHref(group.topTask),
      topTaskTitle: group.topTask?.title ?? group.headline,
    })),
  };
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

function buildGateDispatchRecheckFollowUpChains(tasks: PersistedGatePlatformDispatchTask[]): GateDispatchRecheckFollowUpChain[] {
  const followUps = tasks.filter(isChapterProductionRecheckFollowUpTask);
  const reviewDispatches = tasks.filter(isRecheckReviewDispatchTask);
  const taskByKey = new Map(followUps.map((task) => [task.dispatchKey, task]));
  const rootMemo = new Map<string, string>();
  const roundMemo = new Map<string, number>();

  function rootFor(task: PersistedGatePlatformDispatchTask): string {
    const cached = rootMemo.get(task.dispatchKey);
    if (cached) return cached;
    const sourceKey = sourceDispatchKeyFromEvidence(task);
    const sourceTask = sourceKey ? taskByKey.get(sourceKey) : null;
    const root = sourceTask ? rootFor(sourceTask) : sourceKey || task.dispatchKey;
    rootMemo.set(task.dispatchKey, root);
    return root;
  }

  function roundFor(task: PersistedGatePlatformDispatchTask): number {
    const cached = roundMemo.get(task.dispatchKey);
    if (cached) return cached;
    const sourceKey = sourceDispatchKeyFromEvidence(task);
    const sourceTask = sourceKey ? taskByKey.get(sourceKey) : null;
    const round = sourceTask ? roundFor(sourceTask) + 1 : 1;
    roundMemo.set(task.dispatchKey, round);
    return round;
  }

  const chains = new Map<string, PersistedGatePlatformDispatchTask[]>();
  for (const task of followUps) {
    const root = rootFor(task);
    chains.set(root, [...(chains.get(root) ?? []), task]);
  }
  const reviewDispatchesByRoot = new Map<string, PersistedGatePlatformDispatchTask[]>();
  for (const task of reviewDispatches) {
    const root = recheckChainRootFromEvidence(task);
    if (!root) continue;
    reviewDispatchesByRoot.set(root, [...(reviewDispatchesByRoot.get(root) ?? []), task]);
  }

  function reviewAdviceForChain(
    rootDispatchKey: string,
    chainTasks: PersistedGatePlatformDispatchTask[],
    maxRound: number,
    latest: PersistedGatePlatformDispatchTask,
  ): GateDispatchRecheckFollowUpReviewAdvice | undefined {
    if (maxRound < 2) return undefined;
    const combinedText = chainTasks.map(taskReviewText).join(" ");
    const completedTasks = chainTasks.filter((task) => task.state === "completed");
    const missingCompletionEvidence = completedTasks.length === 0 || completedTasks.some((task) => task.completionEvidence.trim().length < 8);
    const isSubmissionChain = rootDispatchKey.startsWith("submission-")
      || chainTasks.some((task) => task.dispatchKey.startsWith("submission-recheck-followup:"));
    const unchangedSignal = /分数未变|unchanged|仍需修复|仍低于|没有明显变好/.test(combinedText);
    const baseEvidence = [
      `返工链根：${rootDispatchKey}`,
      `最新派单：${latest.dispatchKey}`,
      `当前轮次：第 ${maxRound} 轮`,
      `链路状态：未闭环 ${chainTasks.filter((task) => task.state !== "completed").length}/${chainTasks.length}`,
    ];

    function dispatchForAdvice(input: {
      type: GateDispatchRecheckFollowUpReviewAdviceType;
      title: string;
      detail: string;
      nextAction: string;
      ownerRole: string;
      stage: GatePlatformGrowthReviewStage;
      priorityScore: number;
      actionLabel: string;
      acceptanceCriteria: string[];
    }): GatePlatformGrowthDispatchItem {
      return {
        id: `recheck-review:${input.type}:${safeDispatchKeyPart(rootDispatchKey)}:${maxRound}`,
        platformId: latest.platformId,
        platformName: latest.platformName,
        stage: input.stage,
        state: "queued",
        priorityScore: input.priorityScore,
        ownerRole: input.ownerRole,
        title: `${latest.platformName} · ${input.title}`,
        detail: `${input.detail} ${input.nextAction}`,
        dueLabel: "今天复盘",
        actionLabel: input.actionLabel,
        href: latest.href || "/dispatch",
        acceptanceCriteria: input.acceptanceCriteria,
        evidence: [
          ...baseEvidence,
          `复盘建议：${input.title}`,
          `下一步：${input.nextAction}`,
          ...chainTasks.flatMap((task) => task.evidence.slice(0, 2)).slice(0, 4),
        ],
        reviewLatestAt: latest.updatedAt,
      };
    }

    if (isSubmissionChain && maxRound >= 2) {
      const advice = {
        type: "direction_pause" as const,
        title: "平台方向先暂停",
        detail: "投稿复查已经进入二轮以上，继续补小材料大概率只是把错误投入放大。",
        nextAction: "先停平台加码，回到投稿包、前三章兑现和目标平台匹配度重判，再决定是否继续修包。",
        ownerRole: "主编",
      };
      return {
        ...advice,
        tone: "rose",
        dispatch: dispatchForAdvice({
          ...advice,
          stage: "pause_platform",
          priorityScore: 96,
          actionLabel: "暂停平台",
          acceptanceCriteria: [
            "写清是否暂停当前平台加码，以及暂停原因。",
            "重判投稿包、前三章兑现和目标平台匹配度，给出继续/转向结论。",
            "补充下一轮只验证一个变量的复测方案。",
          ],
        }),
      };
    }

    if (missingCompletionEvidence || /无基准|验收标准|无法提升/.test(combinedText)) {
      const advice = {
        type: "acceptance_mismatch" as const,
        title: "验收标准先补清楚",
        detail: "返工已经进入二轮，但链路里缺少能证明改动有效的完成证据，容易变成机械返工。",
        nextAction: "先把通过线、不可接受项、必须改动的段落写清楚，再派作者继续二改。",
        ownerRole: "主编",
      };
      return {
        ...advice,
        tone: "sky",
        dispatch: dispatchForAdvice({
          ...advice,
          stage: "watch",
          priorityScore: 88,
          actionLabel: "补验收标准",
          acceptanceCriteria: [
            "补齐通过线、不可接受项、必须改动段落和复查证据格式。",
            "标明下一轮返工只允许解决的一个核心问题。",
            "完成后再派作者执行二改，避免继续模糊返工。",
          ],
        }),
      };
    }

    if (unchangedSignal) {
      const advice = {
        type: "weak_execution" as const,
        title: "执行动作太虚",
        detail: "复查分数没有有效上移，说明上一轮动作可能只改了表层，没有打到主线压力或人物选择。",
        nextAction: "要求返工证据写明改了哪一段、服务哪条主线、如何改变读者追读理由。",
        ownerRole: "作者",
      };
      return {
        ...advice,
        tone: "amber",
        dispatch: dispatchForAdvice({
          ...advice,
          stage: "start_rewrite_opening",
          priorityScore: 90,
          actionLabel: "重写动作",
          acceptanceCriteria: [
            "写清改了哪一段、服务哪条主线、如何改变读者追读理由。",
            "返工必须带一条可复查的分数或证据变化。",
            "不能只改措辞，必须改变冲突、选择或代价。",
          ],
        }),
      };
    }

    const advice = {
      type: "weak_execution" as const,
      title: "二轮返工先复盘动作",
      detail: "链路已经进入第二轮，继续派单前先确认上一轮动作为什么没有一次打穿。",
      nextAction: "复盘上一轮验收证据，保留有效动作，删除无效动作，再生成下一轮返工要求。",
      ownerRole: "作者",
    };
    return {
      ...advice,
      tone: "amber",
      dispatch: dispatchForAdvice({
        ...advice,
        stage: "start_rewrite_opening",
        priorityScore: 86,
        actionLabel: "复盘动作",
        acceptanceCriteria: [
          "列出上一轮有效动作、无效动作和遗漏动作。",
          "下一轮返工只保留一个核心目标。",
          "完成后回填可复查证据。",
        ],
      }),
    };
  }

  function reviewInterventionForChain(rootDispatchKey: string): GateDispatchRecheckFollowUpIntervention | undefined {
    const reviewTasks = reviewDispatchesByRoot.get(rootDispatchKey);
    if (!reviewTasks?.length) return undefined;
    const latestReview = [...reviewTasks].sort((left, right) => (
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      || right.priorityScore - left.priorityScore
    ))[0];
    const reviewType = recheckReviewTypeFromDispatchKey(latestReview.dispatchKey);
    const status: GateDispatchRecheckFollowUpInterventionStatus = latestReview.state !== "completed"
      ? "intervened"
      : reviewType === "direction_pause"
        ? "stopped"
        : "continue_rework";
    const label = status === "intervened"
      ? "复盘已介入"
      : status === "stopped"
        ? "已止损"
        : "继续返工";
    const detail = status === "intervened"
      ? "复盘派单已生成，先收口复盘结论，再决定是否继续返工。"
      : status === "stopped"
        ? "复盘派单已完成，当前链路应先暂停方向或平台加码。"
        : "复盘派单已完成，可以按新验收标准或新动作继续返工。";

    return {
      dispatchKey: latestReview.dispatchKey,
      status,
      label,
      detail,
      state: latestReview.state,
      title: latestReview.title,
      ownerRole: latestReview.ownerRole,
      href: latestReview.href,
      completedAt: latestReview.completedAt,
    };
  }

  return [...chains.entries()].map(([rootDispatchKey, chainTasks]) => {
    const rounds = chainTasks
      .map((task) => ({
        round: roundFor(task),
        dispatchKey: task.dispatchKey,
        state: task.state,
        title: task.title,
        priorityScore: task.priorityScore,
        ownerRole: task.ownerRole,
      }))
      .sort((left, right) => left.round - right.round || right.priorityScore - left.priorityScore);
    const sortedByLatest = [...chainTasks].sort((left, right) => (
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      || right.priorityScore - left.priorityScore
    ));
    const latest = sortedByLatest[0];
    const active = chainTasks.filter((task) => task.state !== "completed").length;
    const completed = chainTasks.length - active;
    const maxRound = Math.max(...rounds.map((round) => round.round));

    return {
      rootDispatchKey,
      latestDispatchKey: latest.dispatchKey,
      projectId: latest.projectId,
      platformId: latest.platformId,
      platformName: latest.platformName,
      total: chainTasks.length,
      active,
      completed,
      maxRound,
      status: active > 0 ? "active" as const : "completed" as const,
      latestTitle: latest.title,
      latestActionLabel: latest.actionLabel,
      latestHref: latest.href,
      latestUpdatedAt: latest.updatedAt,
      reviewAdvice: reviewAdviceForChain(rootDispatchKey, chainTasks, maxRound, latest),
      reviewIntervention: reviewInterventionForChain(rootDispatchKey),
      rounds,
    };
  }).sort((left, right) => (
    right.active - left.active
    || right.maxRound - left.maxRound
    || new Date(right.latestUpdatedAt).getTime() - new Date(left.latestUpdatedAt).getTime()
  ));
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
  const recheckFollowUp = tasks.filter(isChapterProductionRecheckFollowUpTask).length;
  const activeRecheckFollowUp = tasks.filter((task) => task.state !== "completed" && isChapterProductionRecheckFollowUpTask(task)).length;
  const aiPipelineDispatches = tasks
    .filter(isAiPipelineDispatchTask)
    .sort((left, right) => {
      const stateWeight: Record<GatePlatformGrowthDispatchState, number> = { queued: 0, assigned: 1, completed: 2 };
      const stateDiff = stateWeight[left.state] - stateWeight[right.state];
      if (stateDiff !== 0) return stateDiff;
      const priorityDiff = right.priorityScore - left.priorityScore;
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });
  const activeAiPipeline = aiPipelineDispatches.filter((task) => task.state !== "completed").length;
  const aiPipelineGroups = buildAiPipelineDispatchGroups(aiPipelineDispatches);
  const recheckFollowUpChains = buildGateDispatchRecheckFollowUpChains(tasks);
  const repeatedRecheckFollowUpChains = recheckFollowUpChains.filter((chain) => chain.maxRound > 1).length;
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
      recheckFollowUp,
      activeRecheckFollowUp,
      aiPipeline: aiPipelineDispatches.length,
      activeAiPipeline,
      recheckFollowUpChains: recheckFollowUpChains.length,
      repeatedRecheckFollowUpChains,
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
      activeAiPipeline > 0 ? `AI 写审改还有 ${activeAiPipeline} 个复检后派单，先处理样本复验，别偷偷恢复批量。` : null,
      activeRecheckFollowUp > 0 ? `先处理 ${activeRecheckFollowUp} 个复查失败返工派单，别让同一个卡点重复冒烟。` : null,
      repeatedRecheckFollowUpChains > 0 ? `${repeatedRecheckFollowUpChains} 条返工链已经进入二轮以上，先复盘为什么第一轮没有打穿。` : null,
      highPriorityQueued > 0 ? `先派掉 ${highPriorityQueued} 个高优先级任务，别让平台机会窗口过期。` : null,
      assigned > 0 ? `跟进 ${assigned} 个已派任务，要求按验收标准回填证据。` : null,
      topPlatform && topPlatform.active > 0 ? `${topPlatform.name} 当前活跃派单最多，先压低它的未闭环数量。` : null,
      activeRoles > 1 ? `跨 ${activeRoles} 个角色协同，今天只看派单是否闭环，不开新坑。` : null,
      tasks.length === 0 ? "还没有派单任务，先从总闸门执行平台复盘和派单。" : null,
    ].filter((action): action is string => Boolean(action)),
    closeoutItems,
    aiPipelineDispatches,
    aiPipelineGroups,
    recheckFollowUpChains,
  };
}

export type GateDispatchCompletionTemplateTask = Pick<
  PersistedGatePlatformDispatchTask,
  "stage" | "title" | "actionLabel" | "platformName"
> & Partial<Pick<PersistedGatePlatformDispatchTask, "acceptanceCriteria" | "dispatchKey" | "evidence" | "href">>;

export type GateAiPipelineRecoveryCompletionKind = "sample_recheck" | "small_batch_resume" | "rollback_repair";

export interface GateAiPipelineRecoveryCompletionFeedback {
  statusLabel: string;
  headline: string;
  detail: string;
  primaryActionLabel: string;
}

export interface GateAiPipelineRecoveryCompletionOutcome {
  kind: GateAiPipelineRecoveryCompletionKind;
  outcome: GatePlatformTacticExperienceStatus;
  nextAction: string;
  evidence: string[];
}

function roleIntentFromTaskEvidence(task: Pick<GateDispatchCompletionTemplateTask, "evidence" | "dispatchKey" | "href">) {
  if (task.dispatchKey?.includes(":story-structure:") || task.href?.includes("#story-structure")) return "story-structure";
  if (task.dispatchKey?.includes(":context-recall:") || task.href?.includes("#context-recall")) return "context-recall";
  if (task.dispatchKey?.includes(":platform-export:") || task.href?.includes("#platform-export")) return "platform-export";
  const evidence = task.evidence ?? [];
  if (evidence.some((item) => item.includes("角色入口：story-structure"))) return "story-structure";
  if (evidence.some((item) => item.includes("角色入口：context-recall"))) return "context-recall";
  if (evidence.some((item) => item.includes("角色入口：platform-export"))) return "platform-export";
  return null;
}

function escapeCompletionLabel(label: string) {
  return label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function completionValueAfterLabel(label: string, text: string) {
  const escaped = escapeCompletionLabel(label);
  const lineMatch = text.match(new RegExp(`^\\s*${escaped}\\s*[:：]\\s*(.+?)\\s*$`, "m"));
  if (lineMatch?.[1]) return lineMatch[1].trim();
  const inlineMatch = text.match(new RegExp(`${escaped}\\s*[:：]\\s*([^，,；;。\\n]+)`));
  return inlineMatch?.[1]?.trim() ?? null;
}

function hasConcreteDispatchCompletionValue(value: string | null) {
  if (!value) return false;
  if (value.includes("/")) return false;
  return !["待填", "未填", "无", "暂无", "-"].includes(value.trim());
}

function completedLabels(text: string, labels: string[]) {
  return labels.filter((label) => hasConcreteDispatchCompletionValue(completionValueAfterLabel(label, text)));
}

function hasMetricOrBusinessSignal(text: string) {
  const normalized = text.replace(/\s+/g, "");
  return /(?:曝光|展示|浏览|阅读|views?|点击|clicks?|收藏|加书架|追读|关注|评论|付费|订阅)\s*[：:=]?\s*(?:[1-9]\d*|0\.\d*[1-9])/iu.test(text)
    || /https?:\/\//iu.test(text)
    || /签约|合同|邀约|站短|拒稿|退稿|审核中|待反馈|pending|offer/iu.test(normalized);
}

const metricCompletionStages = new Set<GatePlatformGrowthReviewStage>(["record_metrics", "start_metrics_recovery"]);
const packageCompletionStages = new Set<GatePlatformGrowthReviewStage>([
  "adopt_asset",
  "start_platform_package",
  "start_publish_finalize",
]);
const repairCompletionStages = new Set<GatePlatformGrowthReviewStage>([
  "fix_failure",
  "start_repair_packaging",
  "repair_tactic",
  "pivot_platform",
  "pause_platform",
]);
const openingCompletionStages = new Set<GatePlatformGrowthReviewStage>([
  "start_first_three_review",
  "start_opening_diagnostic",
  "start_rewrite_opening",
]);

function isAiPipelineSampleCompletionTask(task: GateDispatchCompletionTemplateTask) {
  const text = `${task.title} ${task.actionLabel} ${(task.evidence ?? []).join(" ")}`;
  return task.stage === "ai_pipeline_sample_recheck" && !/回滚|跌线|修复/u.test(text);
}

function isRepairRetestMetricCompletionTask(task: GateDispatchCompletionTemplateTask) {
  if (!metricCompletionStages.has(task.stage)) return false;
  const text = `${task.title} ${task.actionLabel} ${(task.evidence ?? []).join(" ")}`;
  return /修复包已完成|二轮小样本|第二轮小样本|重验标题、简介、标签和前三章/u.test(text);
}

function isPauseRecoveryMetricCompletionTask(task: GateDispatchCompletionTemplateTask) {
  if (!metricCompletionStages.has(task.stage)) return false;
  const text = `${task.title} ${task.actionLabel} ${(task.evidence ?? []).join(" ")}`;
  return /暂停复盘结论：恢复一轮小样本|恢复一轮小样本/u.test(text);
}

function isPausePlatformReviewTask(task: GateDispatchCompletionTemplateTask) {
  const text = `${task.title} ${task.actionLabel} ${(task.evidence ?? []).join(" ")}`;
  return task.stage === "pause_platform" && /暂停复盘|恢复小样本|恢复条件/u.test(text);
}

function isAiPipelineScaleCompletionTask(task: GateDispatchCompletionTemplateTask) {
  return task.stage === "ai_pipeline_small_batch";
}

function isAiPipelineRollbackCompletionTask(task: GateDispatchCompletionTemplateTask) {
  const text = `${task.title} ${task.actionLabel} ${(task.evidence ?? []).join(" ")}`;
  return task.stage === "ai_pipeline_sample_recheck" && /回滚|跌线|修复/u.test(text);
}

function isAiPipelineCompletionTask(task: GateDispatchCompletionTemplateTask) {
  return isAiPipelineSampleCompletionTask(task)
    || isAiPipelineScaleCompletionTask(task)
    || isAiPipelineRollbackCompletionTask(task);
}

function aiPipelineCompletionKind(task: GateDispatchCompletionTemplateTask): GateAiPipelineRecoveryCompletionKind | null {
  if (isAiPipelineRollbackCompletionTask(task)) return "rollback_repair";
  if (isAiPipelineScaleCompletionTask(task)) return "small_batch_resume";
  if (isAiPipelineSampleCompletionTask(task)) return "sample_recheck";
  return null;
}

function aiPipelineCompletionLabels(kind: GateAiPipelineRecoveryCompletionKind) {
  if (kind === "rollback_repair") {
    return {
      evidenceLabels: ["修复对象", "跌线原因", "修复动作", "复验结论"],
      nextLabel: "下一步",
    };
  }
  if (kind === "small_batch_resume") {
    return {
      evidenceLabels: ["小批范围", "成功率", "平均质量", "失败/成本"],
      nextLabel: "下一步节奏",
    };
  }
  return {
    evidenceLabels: ["样本范围", "成功率", "质量", "失败/成本"],
    nextLabel: "放量结论",
  };
}

function aiPipelineRecoveryOutcomeFromAction(nextAction: string): GatePlatformTacticExperienceStatus {
  if (/暂停|回滚|停止|终止|跌线|失败|不允许|不能|不放量/u.test(nextAction)) return "blocked";
  if (/观察|重新小样本|未通过|不通过|待补|补证据|暂缓/u.test(nextAction)) return "watch";
  if (/通过|继续恢复小批|可恢复|恢复小批|继续/u.test(nextAction)) return "usable";
  return "watch";
}

function buildAiPipelineRecoveryCompletionFeedback(
  completion: GateAiPipelineRecoveryCompletionOutcome,
): GateAiPipelineRecoveryCompletionFeedback {
  const evidenceText = completion.evidence.length > 0 ? completion.evidence.join("；") : "完成证据不足，需补成功率、质量、失败原因和成本。";
  if (completion.outcome === "blocked") {
    return {
      statusLabel: "暂停恢复",
      headline: completion.kind === "small_batch_resume" ? "恢复小批证据跌线" : "复验未过线",
      detail: `${evidenceText} 下一步：${completion.nextAction || "暂停恢复小批，先回滚修复。"}`,
      primaryActionLabel: "回滚修复",
    };
  }
  if (completion.outcome === "usable") {
    return {
      statusLabel: "可恢复",
      headline: completion.kind === "small_batch_resume" ? "恢复小批证据已过线" : "小样本复验已过线",
      detail: `${evidenceText} 下一步：${completion.nextAction || "继续恢复小批"}。`,
      primaryActionLabel: "继续小批，不放大批",
    };
  }
  return {
    statusLabel: "继续观察",
    headline: completion.kind === "rollback_repair" ? "回滚修复仍需复验" : "恢复证据仍需补齐",
    detail: `${evidenceText} 下一步：${completion.nextAction || "继续 1 章复验，不恢复批量。"}`,
    primaryActionLabel: "继续复验",
  };
}

export function parseAiPipelineRecoveryCompletionEvidence(
  task: GateDispatchCompletionTemplateTask,
  completionEvidence: string,
): GateAiPipelineRecoveryCompletionOutcome | null {
  const kind = aiPipelineCompletionKind(task);
  if (!kind) return null;
  const text = completionEvidence.trim();
  if (!text) return null;
  const labels = aiPipelineCompletionLabels(kind);
  const evidence = labels.evidenceLabels
    .map((label) => {
      const value = completionValueAfterLabel(label, text);
      return value ? `${label}：${value}` : null;
    })
    .filter((line): line is string => Boolean(line));
  const nextAction = completionValueAfterLabel(labels.nextLabel, text) ?? "";

  return {
    kind,
    outcome: aiPipelineRecoveryOutcomeFromAction(nextAction || text),
    nextAction,
    evidence,
  };
}

export function buildGateDispatchCompletionTemplate(task: GateDispatchCompletionTemplateTask) {
  const roleIntent = roleIntentFromTaskEvidence(task);
  if (roleIntent === "story-structure") {
    return [
      `${task.title}`,
      "工作区：结构诊断",
      "人物弧光：",
      "主线/支线结论：",
      "开头钩子与结尾回收：",
      "伏笔风险：",
      "下一步：回写大纲树 / 改前三章 / 继续观察",
    ].join("\n");
  }
  if (roleIntent === "context-recall") {
    return [
      `${task.title}`,
      "工作区：项目土壤",
      "引用来源：人物卡 / 世界观 / 伏笔 / 历史章节",
      "进入上下文：",
      "排除资料：",
      "连续性风险：",
      "下一步：交给初稿 / 审稿 / 二改",
    ].join("\n");
  }
  if (roleIntent === "platform-export") {
    return [
      `${task.title}`,
      "工作区：平台导出",
      "标题/简介/标签版本：",
      "平台差异：番茄 / 起点 / 七猫 / 知乎盐选 / WebNovel / Royal Road / Wattpad",
      "样章兑现：",
      "基准版本：",
      "下一步：保存发布包 / 记录发布效果 / 回总闸门复盘",
    ].join("\n");
  }
  if (isAiPipelineRollbackCompletionTask(task)) {
    return [
      `${task.title}`,
      "修复对象：",
      "跌线原因：",
      `修复动作：${task.actionLabel}`,
      "复验结论：",
      "下一步：观察 / 重新小样本 / 暂停恢复小批",
    ].join("\n");
  }
  if (isAiPipelineScaleCompletionTask(task)) {
    return [
      `${task.title}`,
      "小批范围：",
      "成功率：",
      "平均质量：",
      "失败/成本：",
      "下一步节奏：继续恢复小批 / 回滚观察修复 / 暂停",
    ].join("\n");
  }
  if (isAiPipelineSampleCompletionTask(task)) {
    return [
      `${task.title}`,
      "样本范围：",
      "成功率：",
      "质量：",
      "失败/成本：",
      "放量结论：通过恢复小批 / 未通过继续观察",
    ].join("\n");
  }
  if (isPauseRecoveryMetricCompletionTask(task)) {
    return [
      `${task.title}`,
      "样本轮次：恢复一轮小样本",
      "恢复依据：",
      "对照口径：暂停前二轮小样本 / 参照平台正反馈",
      "日期：",
      "曝光：",
      "点击：",
      "收藏：",
      "追读：",
      "评论：",
      "付费阅读：",
      "平台反馈：",
      "发布链接：",
      "结论：继续观察 / 回到修包装 / 继续暂停",
    ].join("\n");
  }
  if (isRepairRetestMetricCompletionTask(task)) {
    return [
      `${task.title}`,
      "样本轮次：第二轮小样本",
      "验证变量：标题、简介、标签、前三章兑现",
      "放量限制：不提前放大，不同时改多个变量",
      "日期：",
      "曝光：",
      "点击：",
      "收藏：",
      "追读：",
      "评论：",
      "付费阅读：",
      "平台反馈：",
      "发布链接：",
      "结论：继续观察 / 回到修包装 / 暂停",
    ].join("\n");
  }
  if (metricCompletionStages.has(task.stage)) {
    return [
      `${task.title}`,
      "日期：",
      "曝光：",
      "点击：",
      "收藏：",
      "追读：",
      "评论：",
      "付费阅读：",
      "平台反馈：",
      "发布链接：",
      "结论：继续加码 / 修包装 / 换平台 / 暂停",
    ].join("\n");
  }
  if (packageCompletionStages.has(task.stage)) {
    return [
      `${task.title}`,
      "标题：",
      "简介：",
      "标签：",
      "卖点：",
      "样章/前三章兑现：",
      "基准版本：",
      "待回收数据：",
      "结论：可发布 / 需修包装",
    ].join("\n");
  }
  if (isPausePlatformReviewTask(task)) {
    return [
      `${task.title}`,
      "暂停原因：",
      "参照平台：",
      "恢复条件：",
      "复盘结论：继续暂停 / 恢复一轮小样本 / 转回修包装",
    ].join("\n");
  }
  if (repairCompletionStages.has(task.stage)) {
    return [
      `${task.title}`,
      "修复对象：",
      "修复前问题：",
      `处理动作：${task.actionLabel}`,
      "修复后证据：",
      "复检结果：",
      "下一轮口径：",
    ].join("\n");
  }
  if (task.stage === "scale_up") {
    return [
      `${task.title}`,
      "加码范围：",
      "基准版本：",
      "回收时间：",
      "风险边界：",
      "结论：已小步加码 / 暂缓加码",
    ].join("\n");
  }
  if (openingCompletionStages.has(task.stage)) {
    return [
      `${task.title}`,
      "章节范围：",
      "钩子/追读点：",
      "改动或诊断结论：",
      "复查证据：",
      "下一步：",
    ].join("\n");
  }
  return "";
}

export function reviewGateDispatchCompletionEvidence(
  task: GateDispatchCompletionTemplateTask,
  completionEvidence: string,
) {
  const text = completionEvidence.trim();
  if (!buildGateDispatchCompletionTemplate(task)) return null;

  if (isAiPipelineCompletionTask(task)) {
    const kind = aiPipelineCompletionKind(task);
    const labels = kind
      ? [...aiPipelineCompletionLabels(kind).evidenceLabels, aiPipelineCompletionLabels(kind).nextLabel]
      : [];
    const filled = completedLabels(text, labels);
    return filled.length >= 4
      ? null
      : `请补齐 AI 写审改完成依据：${labels.join("、")}至少写清 4 项。`;
  }

  if (text.length < 8) return "完成派单前，请写清楚完成依据，至少 8 个字。";

  if (isPauseRecoveryMetricCompletionTask(task)) {
    const missing: string[] = [];
    if (completedLabels(text, ["样本轮次", "恢复依据", "对照口径"]).length < 2) missing.push("样本轮次、恢复依据或对照口径");
    if (!hasMetricOrBusinessSignal(text)) missing.push("真实数据或平台反馈");
    if (!hasConcreteDispatchCompletionValue(completionValueAfterLabel("结论", text))) missing.push("结论");
    return missing.length ? `请补齐恢复小样本回填依据：${missing.join("、")}。` : null;
  }

  if (isRepairRetestMetricCompletionTask(task)) {
    const missing: string[] = [];
    if (completedLabels(text, ["样本轮次", "验证变量"]).length < 2) missing.push("样本轮次、验证变量");
    if (!hasMetricOrBusinessSignal(text)) missing.push("真实数据或平台反馈");
    if (!hasConcreteDispatchCompletionValue(completionValueAfterLabel("结论", text))) missing.push("结论");
    return missing.length ? `请补齐二轮小样本复检依据：${missing.join("、")}。` : null;
  }

  if (metricCompletionStages.has(task.stage)) {
    const missing: string[] = [];
    if (!hasMetricOrBusinessSignal(text)) missing.push("真实数据或平台反馈");
    if (!hasConcreteDispatchCompletionValue(completionValueAfterLabel("结论", text))) missing.push("结论");
    return missing.length ? `请补齐数据回收完成依据：${missing.join("、")}。` : null;
  }

  if (packageCompletionStages.has(task.stage)) {
    const filled = completedLabels(text, ["标题", "简介", "标签", "卖点", "样章/前三章兑现", "基准版本"]);
    if (filled.length < 3) return "请补齐发布包完成依据：标题、简介、标签、卖点、样章兑现或基准版本至少写清 3 项。";
    return hasConcreteDispatchCompletionValue(completionValueAfterLabel("结论", text))
      ? null
      : "请补齐发布包完成依据：结论。";
  }

  if (isPausePlatformReviewTask(task)) {
    const filled = completedLabels(text, ["暂停原因", "参照平台", "恢复条件", "复盘结论"]);
    return filled.length >= 3 ? null : "请补齐暂停复盘依据：暂停原因、参照平台、恢复条件或复盘结论至少写清 3 项。";
  }

  if (repairCompletionStages.has(task.stage)) {
    const filled = completedLabels(text, ["修复对象", "修复前问题", "处理动作", "修复后证据", "复检结果", "下一轮口径"]);
    return filled.length >= 3 ? null : "请补齐修复完成依据：修复对象、处理动作、修复后证据、复检结果或下一轮口径至少写清 3 项。";
  }

  if (task.stage === "scale_up") {
    const filled = completedLabels(text, ["加码范围", "基准版本", "回收时间", "风险边界", "结论"]);
    return filled.length >= 3 ? null : "请补齐加码完成依据：加码范围、基准版本、回收时间、风险边界或结论至少写清 3 项。";
  }

  if (openingCompletionStages.has(task.stage)) {
    const filled = completedLabels(text, ["章节范围", "钩子/追读点", "改动或诊断结论", "复查证据", "下一步"]);
    return filled.length >= 3 ? null : "请补齐开头/前三章完成依据：章节范围、钩子追读点、改动结论、复查证据或下一步至少写清 3 项。";
  }

  return null;
}

export function buildGateDispatchEvidenceReview(
  tasks: PersistedGatePlatformDispatchTask[],
  receipts: GateActionReceipt[] = [],
): GateDispatchEvidenceReview {
  const operationalReceipts = trimGateActionReceipts(receipts, 100)
    .filter((receipt) => !isAuditMetaReceipt(receipt));
  const reviewAction = (
    task: PersistedGatePlatformDispatchTask,
    status: Exclude<GateDispatchEvidenceReviewStatus, "verified">,
  ) => {
    if (status === "active") return task.actionLabel || "继续处理";
    if (status === "missing_evidence") return "补完成依据";
    if (task.stage === "start_metrics_recovery") return "回填发布效果";
    if (task.stage === "start_publish_finalize" || task.stage === "start_platform_package") return "复检发布包";
    if (task.stage === "start_repair_packaging" || task.stage === "repair_tactic") return "生成修复回执";
    return "生成业务回执";
  };
  const projectTaskHref = (task: PersistedGatePlatformDispatchTask, anchor: string) => {
    if (task.projectId) return `/projects/${task.projectId}${anchor}`;
    return projectAnchorHref(task.href, anchor);
  };
  const reviewHref = (task: PersistedGatePlatformDispatchTask, status: GateDispatchEvidenceReviewStatus) => {
    if (status === "active" || status === "verified") return task.href;
    if (status === "missing_evidence") return "/dispatch";
    if (task.stage === "start_metrics_recovery") return projectTaskHref(task, "#publish-effect-panel");
    if (
      task.stage === "start_opening_diagnostic"
      || task.stage === "start_rewrite_opening"
      || task.stage === "start_first_three_review"
    ) {
      return projectTaskHref(task, "#first-three-rewrite");
    }
    if (
      task.stage === "start_publish_finalize"
      || task.stage === "start_platform_package"
      || task.stage === "start_repair_packaging"
      || task.stage === "repair_tactic"
    ) {
      return projectTaskHref(task, "#platform-export");
    }
    return task.href;
  };
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
        actionLabel: reviewAction(task, "active"),
        href: reviewHref(task, "active"),
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
        actionLabel: reviewAction(task, "missing_evidence"),
        href: reviewHref(task, "missing_evidence"),
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
        actionLabel: "查看证据链",
        href: reviewHref(task, "verified"),
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
      actionLabel: reviewAction(task, "needs_receipt"),
      href: reviewHref(task, "needs_receipt"),
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
    .filter((task) => (
      task.stage === "start_metrics_recovery"
      && task.dispatchKey.includes(":start_next:metrics_recovery:")
      && task.state === "completed"
      && task.completionEvidence.trim()
    ))
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
    } else if (isPlatformDispatchCompletionReceipt(receipt)) {
      eventPlatform.events.push({
        id: `dispatch-completion-receipt:${receipt.id}`,
        type: "dispatch",
        label: "派单完成回执",
        detail: receipt.message,
        href: receipt.href,
        createdAt: receipt.createdAt,
        evidence: [receipt.message, receipt.recheck.detail],
      });
    }
  }

  for (const task of tasks) {
    const eventPlatform = ensurePlatform(task.platformId, task.platformName, task.href);
    eventPlatform.priorityScore = Math.max(eventPlatform.priorityScore, task.priorityScore);
    const isRecheckReview = isRecheckReviewDispatchTask(task);
    const isRetreatRepair = isRetreatDispatchStage(task.stage);
    const isRetreatRecheck = isRetreatRecheckDispatchTask(task);
    const isFirstDayHandoff = isFirstDayHandoffDispatchTask(task);
    const recheckReviewType = isRecheckReview ? recheckReviewTypeFromDispatchKey(task.dispatchKey) : null;
    const completedAt = task.completedAt ?? task.updatedAt;
    const handoffStageLabel = firstDayHandoffStageLabel(task.dispatchKey);
    eventPlatform.events.push({
      id: `task:${task.dispatchKey}`,
      type: isRecheckReview || isRetreatRecheck ? "recheck" : isRetreatRepair ? "repair" : "dispatch",
      label: task.state === "completed"
        ? isFirstDayHandoff ? "开书交接闭环" : isRecheckReview ? "复盘完成" : isRetreatRecheck ? "重验完成" : isRetreatRepair ? "修复完成" : "派单完成"
        : isFirstDayHandoff ? "开书交接派单" : isRecheckReview ? "复盘派单" : isRetreatRecheck ? "重验派单" : isRetreatRepair ? "修复派单" : "平台派单",
      detail: task.state === "completed" && task.completionEvidence.trim()
        ? isFirstDayHandoff
          ? `已用于新书开局并闭环：${task.completionEvidence.trim()}`
          : task.completionEvidence.trim()
        : `${task.ownerRole} · ${task.title}`,
      href: isFirstDayHandoff ? task.href : task.state === "completed" ? "/dispatch" : task.href,
      createdAt: task.state === "completed" ? completedAt : task.updatedAt,
      evidence: Array.from(new Set([
        ...(isFirstDayHandoff ? [`新书开局闭环：${handoffStageLabel}`] : []),
        ...(isFirstDayHandoff && task.state === "completed" && task.completionEvidence.trim() ? [`交接完成证据：${task.completionEvidence.trim()}`] : []),
        ...(recheckReviewType ? [`复盘类型：${recheckReviewTypeLabel(recheckReviewType)}`] : []),
        ...(isRecheckReview && task.state === "completed" && task.completionEvidence.trim() ? [`复盘结论：${task.completionEvidence.trim()}`] : []),
        ...task.evidence,
        ...task.acceptanceCriteria,
      ])).slice(0, 4),
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
    const completedRecheckReviewEvent = sortedEvents.find((event) => event.id.startsWith("task:recheck-review:") && event.label === "复盘完成");
    const completedRecheckReviewType = completedRecheckReviewEvent ? recheckReviewTypeFromDispatchKey(completedRecheckReviewEvent.id.replace(/^task:/, "")) : null;
    const completedFirstDayHandoff = completedFirstDayHandoffFromTimeline(sortedEvents);
    let status: GatePlatformDecisionTimelineStatus = "healthy";
    let label = "健康观察";
    let detail = `${platform.platformName} 当前没有撤退修复债，继续按总闸门节奏观察。`;
    let actionLabel = "查看平台";
    let href = platform.href;

    if (completedRecheckReviewType === "direction_pause") {
      status = "blocked";
      label = "复盘止损";
      detail = `${platform.platformName} 返工链复盘已完成，当前方向先暂停，避免继续放大错误投入。`;
      actionLabel = "查看复盘派单";
      href = "/dispatch";
    } else if (retreat && ["pause", "pivot_platform", "repair_tactic"].includes(retreat.status) && resolution?.status !== "resolved") {
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
    } else if (completedFirstDayHandoff?.allStagesCompleted) {
      status = "healthy";
      label = "新书开局闭环";
      detail = `${platform.platformName} 的平台经验已经完成开头打法、验收口径和平台包装交接，可作为下一本开书的首轮打法样本。`;
      actionLabel = "查看交接证据";
      href = completedFirstDayHandoff.latestEvent.href;
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

function numberAfterLabel(text: string, label: string) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`${escapedLabel}\\s*([0-9]+(?:\\.[0-9]+)?)`, "u"));
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function publishEffectEventMetrics(event: GatePlatformDecisionTimelineEvent) {
  if (event.type !== "effect") return null;
  const source = `${event.detail} ${event.evidence.join(" ")}`;
  const views = numberAfterLabel(source, "曝光") ?? 0;
  const clicks = numberAfterLabel(source, "点击") ?? 0;
  const favorites = numberAfterLabel(source, "收藏") ?? 0;
  const follows = numberAfterLabel(source, "追读") ?? 0;
  const clickRatePercent = numberAfterLabel(source, "点击率") ?? percent(clicks, views);
  const favoriteRatePercent = numberAfterLabel(source, "收藏率") ?? percent(favorites, views);
  const followRatePercent = numberAfterLabel(source, "追读率") ?? percent(follows, views);

  return {
    views,
    clicks,
    favorites,
    follows,
    clickRatePercent,
    favoriteRatePercent,
    followRatePercent,
  };
}

function isReusablePublishEffectEvent(event: GatePlatformDecisionTimelineEvent) {
  const metrics = publishEffectEventMetrics(event);
  if (!metrics) return false;
  if (metrics.views < 100) return false;
  if (metrics.clickRatePercent < 5 || metrics.followRatePercent < 1) return false;
  return metrics.favoriteRatePercent >= 4 || metrics.followRatePercent >= 2;
}

function latestReusablePublishEffectEvent(
  events: GatePlatformDecisionTimelineEvent[],
  afterEvent?: GatePlatformDecisionTimelineEvent | null,
) {
  const afterTime = afterEvent ? new Date(afterEvent.createdAt).getTime() : null;
  return events.find((event) => {
    if (!isReusablePublishEffectEvent(event)) return false;
    if (afterTime === null || Number.isNaN(afterTime)) return true;
    return new Date(event.createdAt).getTime() >= afterTime;
  }) ?? null;
}

function evidenceLoopRecheckFromTimeline(item: GatePlatformDecisionTimelineItem) {
  const lines = item.events.flatMap((event) => event.evidence);
  for (const line of lines) {
    const match = line.match(/证据闭环复检：(?:(\d+)\s*->\s*)?(\d+)\s*分，(分数变好|分数变差|分数未变|无历史基准)：(.+)/);
    if (!match) continue;
    const previousScore = match[1] ? Number(match[1]) : null;
    const currentScore = Number(match[2]);
    if (!Number.isFinite(currentScore)) continue;
    const verdict = match[3] === "分数变好"
      ? "improved"
      : match[3] === "分数变差"
        ? "declined"
        : match[3] === "分数未变"
          ? "unchanged"
          : "unknown";
    return {
      previousScore,
      currentScore,
      delta: previousScore === null ? null : currentScore - previousScore,
      verdict,
      label: markdownLine(match[4]),
      line,
    };
  }
  return null;
}

function completedRecheckReviewFromTimeline(item: GatePlatformDecisionTimelineItem) {
  const reviewEvents = item.events
    .filter((event) => event.id.startsWith("task:recheck-review:") && event.label === "复盘完成")
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  const event = reviewEvents[0] ?? null;
  if (!event) return null;
  const dispatchKey = event.id.replace(/^task:/, "");
  const type = recheckReviewTypeFromDispatchKey(dispatchKey);
  const conclusion = event.evidence.find((line) => line.startsWith("复盘结论："))?.replace("复盘结论：", "").trim() || event.detail;

  return {
    event,
    type,
    typeLabel: recheckReviewTypeLabel(type),
    conclusion: markdownLine(conclusion),
  };
}

function completedFirstDayHandoffFromTimeline(events: GatePlatformDecisionTimelineEvent[]) {
  const handoffEvents = events
    .filter((event) => event.id.startsWith("task:first-day-handoff:") && event.label === "开书交接闭环")
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  if (handoffEvents.length === 0) return null;

  const completedStages = new Set(handoffEvents.map((event) => firstDayHandoffStageFromDispatchKey(event.id.replace(/^task:/, ""))));
  const allStagesCompleted = ["opening", "verification", "platform-package"].every((stage) => completedStages.has(stage as ReturnType<typeof firstDayHandoffStageFromDispatchKey>));
  const allEvidence = Array.from(new Set(handoffEvents.flatMap((event) => event.evidence)));
  const evidence = allEvidence.slice(0, 4);
  const evidenceText = allEvidence.join(" ");
  const recoveryScale = /恢复放量/u.test(evidenceText);
  const recoveryScaleOutcome = recoveryScale
    ? /放量结论[:：]\s*(暂停|不通过|未过线|失败)|不允许继续放量/u.test(evidenceText)
      ? "blocked"
      : /放量结论[:：]\s*(通过|已通过)|可以恢复|可恢复|小样本已过线/u.test(evidenceText)
        ? "usable"
        : "watch"
    : null;
  const recoveryScaleConclusion = recoveryScale
    ? allEvidence.find((line) => /放量结论|继续观察|暂停|未过线|可以恢复|可恢复/u.test(line)) ?? ""
    : "";

  return {
    latestEvent: handoffEvents[0],
    completedStages,
    completedCount: completedStages.size,
    allStagesCompleted,
    evidence,
    recoveryScale,
    recoveryScaleOutcome,
    recoveryScaleConclusion,
  };
}

function structuredRecoveryFollowupEvidence(detail: string) {
  const scope = completionValueAfterLabel("加码范围", detail);
  const baseline = completionValueAfterLabel("基准版本", detail);
  const riskBoundary = completionValueAfterLabel("风险边界", detail);
  const conclusion = completionValueAfterLabel("结论", detail);
  return [
    scope ? `加码范围：${scope}` : null,
    baseline ? `基准版本：${baseline}` : null,
    riskBoundary ? `适用边界：${riskBoundary}` : null,
    conclusion ? `复用结论：${conclusion}` : null,
  ].filter((item): item is string => Boolean(item));
}

function completedRecoveryFollowupFromTimeline(events: GatePlatformDecisionTimelineEvent[]) {
  const followupEvents = events
    .filter((event) => event.id.includes(":tactic_experience_followup:") && event.label.endsWith("完成"))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  const event = followupEvents[0] ?? null;
  if (!event) return null;
  const text = `${event.id} ${event.detail} ${event.evidence.join(" ")}`;
  const outcome: GatePlatformTacticExperienceStatus = /:blocked-|重做打法|暂停迁移|暂停|未过线|不允许继续放量/u.test(text)
    ? "blocked"
    : /:watch-|补追读证据|继续观察|证据不足|追读证据不足/u.test(text)
      ? "watch"
      : "usable";

  return {
    event,
    outcome,
    conclusion: markdownLine(event.detail),
    evidence: Array.from(new Set([
      ...structuredRecoveryFollowupEvidence(event.detail),
      `后续任务完成：${markdownLine(event.detail)}`,
      ...event.evidence,
    ])).slice(0, 5),
  };
}

function aiPipelineCompletionTaskFromTimelineEvent(event: GatePlatformDecisionTimelineEvent): GateDispatchCompletionTemplateTask | null {
  if (!event.id.startsWith("task:ai-pipeline-recheck:") || event.label !== "派单完成") return null;
  const eventText = `${event.id} ${event.detail} ${event.evidence.join(" ")}`;
  return {
    stage: /:scale\b/u.test(event.id) ? "ai_pipeline_small_batch" : "ai_pipeline_sample_recheck",
    title: eventText,
    actionLabel: eventText,
    platformName: "AI 写审改",
    evidence: event.evidence,
  };
}

function completedAiPipelineRecoveryFromTimeline(events: GatePlatformDecisionTimelineEvent[]) {
  const completedEvents = events
    .filter((event) => aiPipelineCompletionTaskFromTimelineEvent(event))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  for (const event of completedEvents) {
    const task = aiPipelineCompletionTaskFromTimelineEvent(event);
    const completion = task ? parseAiPipelineRecoveryCompletionEvidence(task, event.detail) : null;
    if (!completion) continue;
    return { event, completion };
  }
  return null;
}

export function buildGatePlatformTacticExperienceLibrary(
  timeline: GatePlatformDecisionTimeline,
  limit = 6,
  batchEffects: GateBatchTacticEffectItem[] = [],
): GatePlatformTacticExperienceLibrary {
  const timelineItems = timeline.items.map((item): GatePlatformTacticExperienceItem => {
    const finalEvent = item.events.find((event) => event.type === "final") ?? null;
    const completedRecheckReview = completedRecheckReviewFromTimeline(item);
    const completedFirstDayHandoff = completedFirstDayHandoffFromTimeline(item.events);
    const completedRecoveryFollowup = completedRecoveryFollowupFromTimeline(item.events);
    const completedAiPipelineRecovery = completedAiPipelineRecoveryFromTimeline(item.events);
    const evidenceLoopRecheck = evidenceLoopRecheckFromTimeline(item);
    const dispatchCompletionEvent = item.events.find((event) => event.id.startsWith("dispatch-completion-receipt:")) ?? null;
    const reusableEffectEvent = latestReusablePublishEffectEvent(item.events, dispatchCompletionEvent);
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

    if (completedRecheckReview?.type === "direction_pause") {
      return {
        ...base,
        status: "blocked",
        label: "避坑样本",
        tactic: "复盘止损样本",
        lesson: `${item.platformName} 返工链复盘已完成，结论是先暂停当前平台方向或加码，避免把错误投入继续放大。`,
        reuseHint: "同类项目遇到二轮以上投稿包返工时，先复用这条暂停条件，回到投稿包、前三章兑现和平台匹配度重判。",
        risk: completedRecheckReview.conclusion || "没有写清恢复条件前，不要继续平台加码。",
        evidence: [
          `复盘类型：${completedRecheckReview.typeLabel}`,
          `复盘结论：${completedRecheckReview.conclusion}`,
          ...base.evidence,
        ].slice(0, 4),
      };
    }

    if (completedRecheckReview?.type === "acceptance_mismatch") {
      return {
        ...base,
        status: "watch",
        label: "观察样本",
        tactic: "验收标准修正打法",
        lesson: `${item.platformName} 返工链复盘发现验收标准不够硬，下一轮要先补通过线、不可接受项和证据格式，再继续返工。`,
        reuseHint: "同类项目可复用这套验收收口流程，但必须等下一轮复查或发布效果证明它真的提分。",
        risk: completedRecheckReview.conclusion || "只补标准不等于改动有效，缺复测前不能写成成功打法。",
        evidence: [
          `复盘类型：${completedRecheckReview.typeLabel}`,
          `复盘结论：${completedRecheckReview.conclusion}`,
          ...base.evidence,
        ].slice(0, 4),
      };
    }

    if (completedRecheckReview?.type === "weak_execution") {
      return {
        ...base,
        status: "watch",
        label: "观察样本",
        tactic: "返工动作收口打法",
        lesson: `${item.platformName} 返工链复盘发现执行动作太虚，下一轮必须写清改哪一段、服务哪条主线、改变什么追读理由。`,
        reuseHint: "同类项目可复用动作收口清单，先小步验证，不要把模糊返工继续批量复制。",
        risk: completedRecheckReview.conclusion || "没有段落级改动和复查证据时，任务完成容易被误判为业务改善。",
        evidence: [
          `复盘类型：${completedRecheckReview.typeLabel}`,
          `复盘结论：${completedRecheckReview.conclusion}`,
          ...base.evidence,
        ].slice(0, 4),
      };
    }

    if (completedAiPipelineRecovery) {
      const { event, completion } = completedAiPipelineRecovery;
      const blocked = completion.outcome === "blocked";
      const kindLabel = completion.kind === "rollback_repair"
        ? "回滚修复"
        : completion.kind === "small_batch_resume"
          ? "恢复小批"
          : "小样本复验";
      return {
        ...base,
        status: blocked ? "blocked" : "watch",
        label: blocked ? "避坑样本" : "观察样本",
        tactic: blocked ? "恢复放量避坑" : "恢复放量观察",
        lesson: blocked
          ? `${item.platformName} ${kindLabel}完成后仍要求暂停或回滚，说明当前恢复节奏不能继续放大。`
          : `${item.platformName} ${kindLabel}已经完成并给出继续恢复信号，但单次恢复闭环只能进入观察，不能写成稳定打法。`,
        reuseHint: blocked
          ? "同类项目先暂停迁移这条 AI 写审改恢复节奏，修低分章节、开头钩子和章末追读后再跑 1 章小样本。"
          : "继续观察恢复小批，不要把一次完成依据误判为可复用放量结论；下一轮还要看成功率、质量、成本和失败样本。",
        risk: completion.nextAction || (blocked ? "暂停恢复小批。" : "缺少连续稳定样本前，不允许扩大恢复放量批次。"),
        sourceLabel: blocked ? "AI 恢复避坑" : "AI 恢复观察",
        href: event.href,
        evidence: [
          `AI 写审改恢复闭环：${blocked ? "暂停" : "继续观察"}`,
          `恢复阶段：${kindLabel}`,
          ...completion.evidence,
          completion.nextAction ? `下一步：${completion.nextAction}` : null,
          ...base.evidence,
        ].filter((line): line is string => Boolean(line)).slice(0, 5),
      };
    }

    if (completedRecoveryFollowup) {
      const outcome = completedRecoveryFollowup.outcome;
      const conclusion = completedRecoveryFollowup.conclusion || "恢复放量后续任务已完成，等待下一轮数据回填。";
      return {
        ...base,
        status: outcome,
        label: outcome === "blocked" ? "避坑样本" : outcome === "watch" ? "观察样本" : "可复用打法",
        tactic: outcome === "blocked" ? "恢复放量避坑" : outcome === "watch" ? "恢复放量观察" : "恢复放量打法",
        lesson: outcome === "blocked"
          ? `${item.platformName} 恢复放量后续任务仍未过线，这条打法要进入避坑库，先重做开头、前三章兑现或平台包装。`
          : outcome === "watch"
            ? `${item.platformName} 恢复放量后续任务还缺追读证据，只能继续观察，不能当成可复用成功打法。`
            : `${item.platformName} 恢复放量后续小样本已过线，可以沉淀为谨慎复用打法，但仍不允许跳过新样本。`,
        reuseHint: outcome === "blocked"
          ? "同类项目先暂停迁移这套恢复放量节奏，重做打法后重新跑小样本。"
          : outcome === "watch"
            ? "继续观察并补追读证据，不要把任务完成误判为可复用放量结论。"
            : "新项目可以参考这套恢复放量节奏，但仍先跑小样本，确认前三章兑现和追读信号后再加码。",
        risk: outcome === "blocked"
          ? conclusion
          : outcome === "watch"
            ? "缺少明确过线结论前，不允许扩大恢复放量批次。"
            : "恢复放量只证明这一轮小样本过线，跨题材、跨平台或换模型路线时必须重新验证。",
        sourceLabel: outcome === "blocked" ? "恢复放量避坑" : outcome === "watch" ? "恢复放量观察" : "恢复放量闭环",
        href: completedRecoveryFollowup.event.href,
        evidence: [
          `恢复放量后续闭环：${outcome === "blocked" ? "暂停" : outcome === "watch" ? "继续观察" : "通过"}`,
          ...completedRecoveryFollowup.evidence,
          ...base.evidence,
        ].slice(0, 5),
      };
    }

    if (completedFirstDayHandoff?.allStagesCompleted && completedFirstDayHandoff.recoveryScale) {
      const outcome = completedFirstDayHandoff.recoveryScaleOutcome;
      const conclusion = completedFirstDayHandoff.recoveryScaleConclusion || "恢复放量首日小样本已经完成，等待下一轮效果回填。";
      return {
        ...base,
        status: outcome === "blocked" ? "blocked" : outcome === "usable" ? "usable" : "watch",
        label: outcome === "blocked" ? "避坑样本" : outcome === "usable" ? "可复用打法" : "观察样本",
        tactic: outcome === "blocked" ? "恢复放量避坑" : outcome === "usable" ? "恢复放量打法" : "恢复放量观察",
        lesson: outcome === "blocked"
          ? `${item.platformName} 恢复放量首日小样本没有过线，说明这套恢复节奏不能直接迁移到新书。`
          : outcome === "usable"
            ? `${item.platformName} 恢复放量首日小样本已跑通，开头、验收和平台包装都完成闭环，可以沉淀为谨慎复用打法。`
            : `${item.platformName} 恢复放量首日小样本已完成，但结论仍在观察期，暂时只能复用验证清单。`,
        reuseHint: outcome === "usable"
          ? "新项目仍先跑小样本，确认前三章兑现、模型路线和追读证据后再加码。"
          : outcome === "blocked"
            ? "同类项目先暂停这套恢复放量节奏，重做开头、前三章兑现或平台包装后再小样本验证。"
            : "继续观察恢复放量小样本，不要把任务完成误判成可复用成功打法。",
        risk: outcome === "blocked"
          ? conclusion
          : outcome === "usable"
            ? "恢复放量只证明首日小样本过线，不能跨题材、跨平台无限复用；每次开书仍要重新验前三章追读。"
            : "缺少明确过线结论前，不允许进入稳定放量。",
        sourceLabel: outcome === "blocked" ? "恢复放量避坑" : outcome === "usable" ? "恢复放量闭环" : "恢复放量观察",
        href: completedFirstDayHandoff.latestEvent.href,
        evidence: [
          `恢复放量首日闭环：${outcome === "blocked" ? "暂停" : outcome === "usable" ? "通过" : "继续观察"}`,
          `闭环进度：${completedFirstDayHandoff.completedCount}/3 段交接完成`,
          conclusion,
          ...completedFirstDayHandoff.evidence,
          ...base.evidence,
        ].slice(0, 5),
      };
    }

    if (completedFirstDayHandoff?.allStagesCompleted && item.status !== "blocked") {
      return {
        ...base,
        status: "usable",
        label: "可复用打法",
        tactic: "新书开局闭环打法",
        lesson: `${item.platformName} 已经把平台经验落到新书第一天流程，并完成开头打法、验收口径、平台包装三段交接，可作为同类项目开书首轮打法样本。`,
        reuseHint: "新项目可直接复用这套开书交接顺序：先锁开头钩子和读者承诺，再写通过线与不可接受项，最后回收到标题、简介、标签和卖点包装。",
        risk: "这条经验证明已被用于新书开局并闭环，但仍要继续回填曝光、点击、收藏和追读，不能直接当成长线加码结论。",
        sourceLabel: "新书开局闭环",
        href: completedFirstDayHandoff.latestEvent.href,
        evidence: [
          "已用于新书开局并闭环：开头、验收、包装三段交接完成",
          `闭环进度：${completedFirstDayHandoff.completedCount}/3 段交接完成`,
          ...completedFirstDayHandoff.evidence,
          ...base.evidence,
        ].slice(0, 5),
      };
    }

    if (evidenceLoopRecheck?.verdict === "improved") {
      return {
        ...base,
        status: "usable",
        label: "可复用打法",
        tactic: "证据闭环提分打法",
        lesson: `${item.platformName} 派单完成后证据闭环从 ${evidenceLoopRecheck.previousScore ?? "无基准"} 分提升到 ${evidenceLoopRecheck.currentScore} 分，说明这次运营动作能把平台证据链往前推。`,
        reuseHint: "同类项目可复用这张派单的处理动作和验收口径，但仍要保留发布效果对照。",
        risk: "只证明证据链变硬，不等于已经可以无限加码；下一轮仍要看真实曝光、点击、收藏和追读。",
        evidence: [evidenceLoopRecheck.line, ...base.evidence].slice(0, 4),
      };
    }

    if (evidenceLoopRecheck?.verdict === "declined") {
      return {
        ...base,
        status: "blocked",
        label: "避坑样本",
        tactic: "证据闭环降分样本",
        lesson: `${item.platformName} 派单完成后证据闭环掉到 ${evidenceLoopRecheck.currentScore} 分，这个动作没有解决核心平台问题。`,
        reuseHint: "同类项目不要照抄这次处理动作，先复盘标题简介、前三章兑现和平台匹配。",
        risk: "继续加码会把错误投入放大；先重做小样本，再决定是否恢复。",
        evidence: [evidenceLoopRecheck.line, ...base.evidence].slice(0, 4),
      };
    }

    if (evidenceLoopRecheck?.verdict === "unchanged" || evidenceLoopRecheck?.verdict === "unknown") {
      return {
        ...base,
        status: "watch",
        label: "观察样本",
        tactic: "证据闭环待验证动作",
        lesson: `${item.platformName} 派单完成后证据闭环没有明显变好，动作可能只补了形式证据，还没带来有效平台判断。`,
        reuseHint: "同类项目只能复用检查清单，不能复用加码结论；必须补一轮发布效果或新的 Gate 完成回灌。",
        risk: "无分数提升时不要把任务完成误判成业务改善。",
        evidence: [evidenceLoopRecheck.line, ...base.evidence].slice(0, 4),
      };
    }

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

    if ((item.status === "healthy" || dispatchCompletionEvent) && reusableEffectEvent) {
      const metrics = publishEffectEventMetrics(reusableEffectEvent);
      return {
        ...base,
        status: "usable",
        label: "可复用打法",
        tactic: dispatchCompletionEvent ? "验收后真实效果打法" : "真实效果沉淀打法",
        lesson: `${item.platformName} 已经补齐真实效果，曝光 ${metrics?.views ?? "缺"}、点击率 ${metrics?.clickRatePercent ?? "缺"}%、收藏率 ${metrics?.favoriteRatePercent ?? "缺"}%、追读率 ${metrics?.followRatePercent ?? "缺"}%，可以把这次平台包装和前三章入口沉淀为首轮打法。`,
        reuseHint: "新项目可复用这次标题卖点、前三章钩子、投稿包装和小步验证节奏，但首轮仍要继续回填曝光、点击、收藏、追读。",
        risk: "成功样本只证明当前题材和包装有效，不等于跨题材无限复用；换题材、换平台或数据下滑时必须重新小样本验证。",
        evidence: [
          dispatchCompletionEvent ? `验收依据：${markdownLine(dispatchCompletionEvent.detail)}` : null,
          `效果回填：${markdownLine(reusableEffectEvent.detail)}`,
          ...reusableEffectEvent.evidence,
          ...base.evidence,
        ].filter((line): line is string => Boolean(line)).slice(0, 5),
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

    if (dispatchCompletionEvent) {
      return {
        ...base,
        status: "watch",
        label: "待效果经验",
        tactic: "派单验收打法",
        lesson: `${item.platformName} 已经形成派单完成业务回执，说明验收口径可复用，但还需要发布效果、复查提分或三轮结论证明业务改善。`,
        reuseHint: "同类项目可以复用这次完成依据模板和验收标准，下一步必须补曝光、点击、收藏、追读或证据闭环复检。",
        risk: "派单完成只证明动作做完，不证明平台增长有效；缺效果前不要写成成功打法。",
        evidence: [
          `完成回执：${markdownLine(dispatchCompletionEvent.detail)}`,
          ...base.evidence,
        ].slice(0, 4),
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
  const batchItems = batchEffects
    .map(batchTacticEffectExperienceItem)
    .filter((item): item is GatePlatformTacticExperienceItem => Boolean(item));
  const itemsByKey = new Map<string, GatePlatformTacticExperienceItem>();
  for (const item of [...timelineItems, ...batchItems]) {
    const key = `${item.platformId}:${item.tactic}`;
    const existing = itemsByKey.get(key);
    if (!existing || item.priorityScore > existing.priorityScore || new Date(item.latestAt).getTime() > new Date(existing.latestAt).getTime()) {
      itemsByKey.set(key, item);
    }
  }
  const sortedItems = [...itemsByKey.values()]
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

function batchTacticThirdRoundMode(tactic: GateActionReceiptStartTactic) {
  const text = `${tactic.label} ${tactic.primaryTactic} ${tactic.risk}`;
  if (/三轮降档/u.test(text)) return "downgrade";
  if (/三轮稳住/u.test(text)) return "stable";
  return null;
}

function batchTacticLabel(status: GateBatchTacticEffectStatus) {
  if (status === "blocked") return "避坑打法";
  if (status === "watch") return "观察打法";
  return "可复用打法";
}

function thirdRoundBatchTacticLabel(status: GateBatchTacticEffectStatus, mode: ReturnType<typeof batchTacticThirdRoundMode>) {
  if (mode === "stable") {
    if (status === "blocked") return "三轮稳住避坑";
    if (status === "watch") return "三轮稳住观察";
    return "三轮稳住打法";
  }
  if (mode === "downgrade") {
    if (status === "blocked") return "三轮降档避坑";
    return "三轮降档观察";
  }
  return batchTacticLabel(status);
}

function thirdRoundBatchContextText(mode: ReturnType<typeof batchTacticThirdRoundMode>) {
  if (mode === "stable") return "三轮稳住";
  if (mode === "downgrade") return "三轮降档";
  return "";
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
    const recoveryBatches = sortedReceipts.filter((receipt) => receipt.batchContext?.scaleGate === "cleared").length;
    const rhythmRecheckBatches = sortedReceipts.filter((receipt) => receipt.batchContext?.rhythmRecheck).length;
    const thirdRoundMode = batchTacticThirdRoundMode(group.tactic);
    const baseStatus = batchTacticStatus({
      sampleBatches: sortedReceipts.length,
      successRatePercent,
      averageQualityScore,
      failedTasks,
    });
    const recoveryAdjustedStatus = recoveryBatches > 0 && baseStatus === "usable" && recoveryBatches < 2 ? "watch" : baseStatus;
    const rhythmAdjustedStatus = rhythmRecheckBatches > 0 && recoveryAdjustedStatus === "usable" && rhythmRecheckBatches < 2 ? "watch" : recoveryAdjustedStatus;
    const status = thirdRoundMode === "downgrade" && rhythmAdjustedStatus === "usable" ? "watch" : rhythmAdjustedStatus;
    const label = rhythmRecheckBatches > 0
      ? status === "usable" ? "节奏复验打法" : status === "blocked" ? "节奏复验避坑" : "节奏复验观察"
      : recoveryBatches > 0
      ? status === "usable" ? "恢复放量打法" : status === "blocked" ? "恢复放量避坑" : "恢复放量观察"
      : thirdRoundBatchTacticLabel(status, thirdRoundMode);
    const evidence = sortedReceipts.slice(0, 3).map((receipt) => {
      const quality = receipt.batchEffectSummary?.averageQualityScore ?? "缺";
      const context = [batchContextText(receipt.batchContext), thirdRoundBatchContextText(thirdRoundMode)].filter(Boolean).join("｜");
      const rhythmEvidence = receipt.batchContext?.rhythmRecheck?.completionEvidence ?? "";
      return `${receipt.label}${context ? `｜${context}` : ""}${rhythmEvidence ? `｜${rhythmEvidence}` : ""}：成功 ${receipt.succeededCount}，失败 ${receipt.failedCount}，质量 ${quality}`;
    });
    const nextAction = status === "blocked"
      ? "先拆失败样本和低分原因，暂停把这套打法继续放进新批次。"
      : status === "watch"
        ? rhythmRecheckBatches > 0
          ? "节奏复验已经回流，但样本仍薄；再跑一轮稳定小批后，才允许恢复普通推荐节奏。"
          : recoveryBatches > 0
          ? "恢复放量样本还薄，至少再跑一轮稳定批次后，才允许写成新项目可复用打法。"
          : thirdRoundMode === "stable"
            ? "三轮稳住批次还不能直接写成长期打法，至少再跑一轮健康批次并回收曝光、点击、收藏和追读。"
          : thirdRoundMode === "downgrade"
            ? "三轮降档只沉淀修复流程，下一轮仍先跑小样本，禁止直接复用加码结论。"
          : "只允许小批继续验证，等至少两批稳定后再写入可复用打法。"
        : rhythmRecheckBatches > 0
          ? "节奏复验连续稳定，可恢复普通推荐节奏；仍要保留下一批真实成功率、质量和成本回执。"
          : recoveryBatches > 0
          ? "恢复放量已经连续稳定，可作为观察平台解除闸门后的参考打法，但新项目仍先跑小样本。"
          : thirdRoundMode === "stable"
            ? "三轮稳住批次连续健康，可作为新项目开书参考，但首轮仍要小步验证并回填真实数据。"
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
      recoveryBatches,
      rhythmRecheckBatches,
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
  const payload = (await response.json().catch(() => null)) as {
    task?: PersistedGatePlatformDispatchTask;
    followUpTasks?: PersistedGatePlatformDispatchTask[];
    startMetricAutoDispatch?: {
      createdDispatches: PersistedGatePlatformDispatchTask[];
      skippedDispatches: PersistedGatePlatformDispatchTask[];
    } | null;
    secondMetricAutoDispatch?: {
      createdDispatches: PersistedGatePlatformDispatchTask[];
      skippedDispatches: PersistedGatePlatformDispatchTask[];
    } | null;
    startMetricFollowupAutoDispatch?: {
      createdDispatches: PersistedGatePlatformDispatchTask[];
      skippedDispatches: PersistedGatePlatformDispatchTask[];
    } | null;
    secondMetricFollowupAutoDispatch?: {
      createdDispatches: PersistedGatePlatformDispatchTask[];
      skippedDispatches: PersistedGatePlatformDispatchTask[];
    } | null;
    knowledgeFeedbackReceipt?: GateKnowledgeFeedbackReceipt | null;
    dispatchCompletionReceipt?: GateActionReceipt | null;
    submissionEffectReview?: GateSubmissionCompletionEffectReview | null;
    evidenceLoopRecheck?: GateEvidenceLoopRecheck | null;
    storyTreeRecheck?: GateStoryTreeRecheck | null;
    structureDiagnosticRecheck?: GateStructureDiagnosticRecheck | null;
    error?: string;
  } | null;
  if (!response.ok || !payload?.task) throw new Error(payload?.error ?? "更新平台派单失败。");
  return {
    task: payload.task,
    followUpTasks: payload.followUpTasks ?? [],
    startMetricAutoDispatch: payload.startMetricAutoDispatch ?? null,
    secondMetricAutoDispatch: payload.secondMetricAutoDispatch ?? null,
    startMetricFollowupAutoDispatch: payload.startMetricFollowupAutoDispatch ?? null,
    secondMetricFollowupAutoDispatch: payload.secondMetricFollowupAutoDispatch ?? null,
    knowledgeFeedbackReceipt: payload.knowledgeFeedbackReceipt ?? null,
    dispatchCompletionReceipt: payload.dispatchCompletionReceipt ?? null,
    submissionEffectReview: payload.submissionEffectReview ?? null,
    evidenceLoopRecheck: payload.evidenceLoopRecheck ?? null,
    storyTreeRecheck: payload.storyTreeRecheck ?? null,
    structureDiagnosticRecheck: payload.structureDiagnosticRecheck ?? null,
  };
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
