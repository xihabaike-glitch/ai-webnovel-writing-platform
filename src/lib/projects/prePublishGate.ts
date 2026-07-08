import { buildFailureReviewCenter, type FailureReviewTask } from "../ai/failureReviewCenter.ts";
import type { TaskBatchHistoryItem } from "../ai/taskBatchHistory.ts";
import { buildTaskRunConsole, type FailureRepairBatch, type TaskRunInput } from "../ai/taskRunConsole.ts";
import { buildExportSnapshotHistory } from "../export/snapshots.ts";
import { buildExportVersionCenter } from "../export/versionCenter.ts";
import type { ModelRoleMatrixPriorityBlocker } from "../model-gateway/modelRoleMatrix.ts";
import { getPlatformProfile, platformDeliveryScope, type PlatformId } from "../platforms/platformProfiles.ts";
import { buildBatchExecutionSafety } from "./batchExecutionSafety.ts";
import { getBatchExecutionStrategy, type BatchExecutionStrategyId } from "./batchExecutionStrategy.ts";
import { buildBatchStrategyComparison, buildBatchStrategyDecision } from "./batchStrategyComparison.ts";
import {
  buildPlatformPublishExportCenter,
  type PlatformPublishEffectSummary,
  type PlatformPublishMetricInput,
  type PlatformPublishOptimizationAction,
  type PlatformPublishPackage,
  type PlatformSubmissionAssetInput,
  type PlatformSubmissionAssetVersionInput,
  type PublishPackageVersionItem,
  type PublishRepairAction,
  type PublishRepairActionKind,
} from "./platformPublishExport.ts";
import { canExecutePublishRepairAction } from "./publishRepairActionExecution.ts";
import { buildProjectDashboard, type ProjectAcceptanceRunbookStep, type ProjectAcceptanceStep } from "./projectDashboard.ts";
import { buildProjectRoleWorkflowEntrypoints } from "./projectListDashboard.ts";
import { buildTaskQueueCenter } from "./taskQueueCenter.ts";

export interface PrePublishGateProject {
  id: string;
  title: string;
  targetPlatform: string;
  targetLengthType: string;
  targetWordCount: number;
  currentWordCount: number;
  genre: string;
  sellingPoint: string;
  chapters: Array<{
    id: string;
    order: number;
    title: string;
    content: string;
    wordCount: number;
    goal: string;
    hook: string;
    conflict: string;
    valueShift: string;
    cliffhanger: string;
    status: string;
  }>;
  aiTasks: Array<{
    id: string;
    chapterId: string | null;
    taskType: string;
    status: string;
    outputText: string | null;
    errorMessage: string | null;
    createdAt: Date | string;
    inputSnapshot?: string | null;
    inputTokens?: number | null;
    outputTokens?: number | null;
    costUsd?: number | null;
  }>;
  worldEntries?: Array<{
    type: string;
    title: string;
    content: string;
  }>;
  gateDispatchTasks?: Array<{
    dispatchKey: string;
    platformId?: string | null;
    state: string;
    completionEvidence: string;
    title?: string;
    detail?: string;
    actionLabel?: string;
    href?: string;
  }>;
  gateActionAudits?: Array<{
    actionId: string;
    executionType: string;
    status: string;
    succeededCount: number;
    failedCount: number;
    taskId?: string | null;
    platformId: string;
    label?: string;
    message?: string;
    payload?: string;
    createdAt: Date | string;
  }>;
  publishSnapshots?: PublishPackageVersionItem[];
  exportPackageSnapshots?: Array<{
    id: string;
    packageKind: string;
    format: string;
    title: string;
    fileName: string;
    contentType: string;
    fileSize: number;
    contentHash: string;
    readinessStatus: string;
    readinessPercent: number;
    chapterCount: number;
    wordCount: number;
    notes: string;
    isBaseline?: boolean;
    baselineLockedAt?: Date | string | null;
    createdAt: Date | string;
  }>;
  submissionAssets?: PlatformSubmissionAssetInput[];
  submissionAssetVersions?: PlatformSubmissionAssetVersionInput[];
  platformPublishMetrics?: PlatformPublishMetricInput[];
}

export interface PrePublishGateLoopTimelineItem {
  id: string;
  type: "asset" | "snapshot" | "metric" | "repair";
  label: string;
  detail: string;
  createdAt: Date | string;
  href: string;
}

export interface PrePublishGateLoopTimeline {
  status: "needs_asset" | "needs_baseline" | "needs_effect" | "needs_iteration" | "scaling";
  label: string;
  nextAction: string;
  actionHref: string;
  items: PrePublishGateLoopTimelineItem[];
}

export interface PrePublishGateEffectAction {
  id: string;
  priority: PlatformPublishOptimizationAction["priority"];
  execution: PlatformPublishOptimizationAction["execution"];
  label: string;
  detail: string;
  target: string;
  href: string;
}

export interface PrePublishGateEffectReview {
  status: PlatformPublishEffectSummary["status"];
  label: string;
  records: number;
  totalViews: number;
  totalClicks: number;
  totalFavorites: number;
  totalFollows: number;
  totalComments: number;
  totalPaidReads: number;
  clickRatePercent: number;
  favoriteRatePercent: number;
  followRatePercent: number;
  paidReadRatePercent: number;
  latestSnapshotDate: Date | string | null;
  latestContractStatus: string | null;
  verdict: string;
  nextAction: string;
  optimizationStatus: "collect_data" | "urgent_rework" | "iterate" | "scale";
  optimizationHeadline: string;
  optimizationActions: PrePublishGateEffectAction[];
}

export interface PrePublishGateProjectStatus {
  projectId: string;
  projectTitle: string;
  platformId: string;
  platformName: string;
  status: "ready" | "needs_repair" | "empty";
  label: string;
  preflightScore: number;
  finalGateLabel: string;
  publishableChapters: number;
  wordCount: number;
  blockedCount: number;
  warningCount: number;
  nextAction: string;
  href: string;
  downloadHref: string | null;
  execution: PrePublishGateActionExecution | null;
  acceptanceSheetGate: PrePublishGateAcceptanceSheetGate;
  exportVersionGate: PrePublishGateExportVersionGate;
  effectReview: PrePublishGateEffectReview;
  loopTimeline: PrePublishGateLoopTimeline;
}

export interface PrePublishGateAcceptanceSheetGate {
  status: PrePublishGateItem["status"];
  label: string;
  detail: string;
  actionLabel: string;
  href: string;
  currentStepId: ProjectAcceptanceStep["id"];
  steps: ProjectAcceptanceStep[];
  latestDispatchEvidence: string | null;
  latestRecheckReceipt: PrePublishGateRecheckReceipt | null;
  roleClosureProgress: PrePublishGateRoleClosureProgress | null;
  runbookStep: ProjectAcceptanceRunbookStep;
  repairMode: "passed" | "executable" | "dispatch" | "manual";
  executionHint: string;
  execution: PrePublishGateActionExecution | null;
}

export interface PrePublishGateExportVersionGate {
  status: PrePublishGateItem["status"];
  label: string;
  detail: string;
  actionLabel: string;
  href: string;
  snapshotCount: number;
  decisionStatus: string | null;
  receiptReview: PrePublishGateExportVersionReceiptReview;
  repairActions: PrePublishGateExportVersionAction[];
}

export interface PrePublishGateExportVersionReceiptReview {
  status: "none" | "handled";
  label: string;
  detail: string;
  actionLabel: string;
  href: string;
  latestActionId: string | null;
  latestAt: Date | string | null;
}

export interface PrePublishGateExportVersionAction {
  id: string;
  label: string;
  detail: string;
  href: string;
  priority: "primary" | "secondary" | "danger";
  execution: PrePublishGateExportVersionActionExecution | null;
}

export type PrePublishGateExportVersionActionExecution =
  | {
    type: "regenerate_snapshot";
    snapshotId: string;
  }
  | {
    type: "lock_baseline";
    snapshotId: string;
  };

function auditTime(value: Date | string | null | undefined) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function latestExportVersionAudit(project: Pick<PrePublishGateProject, "id" | "gateActionAudits">) {
  return (project.gateActionAudits ?? [])
    .filter((audit) => (
      audit.executionType === "export_version"
      && audit.status === "succeeded"
      && audit.actionId.startsWith(`export-version:${project.id}:`)
    ))
    .sort((left, right) => auditTime(right.createdAt) - auditTime(left.createdAt))[0] ?? null;
}

export interface PrePublishGateStrategyProject {
  projectId: string;
  projectTitle: string;
  statusLabel: string;
  effectLabel: string;
  loopLabel: string;
  href: string;
}

export interface PrePublishGateStrategyPlatform {
  platformId: string;
  platformName: string;
  targetProjectId: string | null;
  recommendation: "scale" | "repair" | "collect_data" | "prepare_asset" | "pause";
  actionType: "open_target" | "generate_asset_variants" | "rewrite_first_three" | "save_snapshot";
  label: string;
  actionLabel: string;
  score: number;
  projectCount: number;
  readyPackages: number;
  weakPackages: number;
  dataGaps: number;
  assetGaps: number;
  baselineGaps: number;
  nextAction: string;
  href: string;
  projects: PrePublishGateStrategyProject[];
}

export interface PrePublishGateStrategyReview {
  headline: string;
  verdict: string;
  primary: PrePublishGateStrategyPlatform | null;
  platforms: PrePublishGateStrategyPlatform[];
  totals: {
    scale: number;
    repair: number;
    collectData: number;
    prepareAsset: number;
    pause: number;
  };
}

export interface PrePublishGateItem {
  id: string;
  label: string;
  status: "pass" | "warn" | "block";
  detail: string;
  actionLabel: string;
  href: string;
}

export interface PrePublishGateAdoptionFollowupItem {
  id: string;
  projectId: string;
  projectTitle: string;
  chapterId: string | null;
  revisionId: string | null;
  platformId: string | null;
  family: "first_three" | "chapter";
  type: "review" | "second_pass" | "publish_check" | "other";
  label: string;
  title: string;
  status: PrePublishGateItem["status"];
  state: string;
  detail: string;
  evidence: string;
  actionLabel: string;
  href: string;
  execution: PrePublishGateAdoptionFollowupExecution | null;
}

export interface PrePublishGateAdoptionRepairItem {
  id: string;
  followupItemId: string;
  projectId: string;
  projectTitle: string;
  type: PrePublishGateAdoptionFollowupItem["type"];
  status: PrePublishGateItem["status"];
  priorityScore: number;
  label: string;
  title: string;
  detail: string;
  actionLabel: string;
  href: string;
}

export type PrePublishGateAdoptionFollowupExecution =
  | {
    type: "chapter_review";
    chapterId: string;
  }
  | {
    type: "publish_check";
    projectId: string;
    platformId: string | null;
  };

export type PrePublishGateAdoptionTimelineStepType = "adopted" | "review" | "second_pass" | "publish_check" | "release";
export type PrePublishGateAdoptionTimelineStepStatus = PrePublishGateItem["status"] | "waiting";

export interface PrePublishGateAdoptionTimelineStep {
  id: string;
  type: PrePublishGateAdoptionTimelineStepType;
  label: string;
  status: PrePublishGateAdoptionTimelineStepStatus;
  followupItemId: string | null;
  detail: string;
  evidence: string;
  actionLabel: string;
  href: string;
}

export interface PrePublishGateAdoptionTimeline {
  id: string;
  projectId: string;
  projectTitle: string;
  chapterId: string | null;
  revisionId: string | null;
  platformId: string | null;
  status: PrePublishGateItem["status"];
  label: string;
  detail: string;
  nextActionLabel: string;
  href: string;
  completedSteps: number;
  totalSteps: number;
  steps: PrePublishGateAdoptionTimelineStep[];
}

export interface PrePublishGateAdoptionClosure {
  status: PrePublishGateItem["status"];
  label: string;
  detail: string;
  total: number;
  completed: number;
  pending: number;
  missingEvidence: number;
  receiptEvidence: number;
  reviewPending: number;
  publishPending: number;
  executableReviewCount: number;
  executablePublishCheckCount: number;
  repairQueue: PrePublishGateAdoptionRepairItem[];
  items: PrePublishGateAdoptionFollowupItem[];
  timelines: PrePublishGateAdoptionTimeline[];
}

export interface PrePublishGateAction {
  id: string;
  label: string;
  detail: string;
  href: string;
  tone: "primary" | "repair" | "review";
  execution: PrePublishGateActionExecution | null;
}

export type PrePublishGateActionExecution =
  | {
    type: "publish_repair";
    projectId: string;
    kind: PublishRepairActionKind;
    chapterId?: string;
    chapterTitle?: string;
    detail: string;
  }
  | {
    type: "retry_task";
    taskId: string;
  }
  | {
    type: "recommended_batch";
    strategyId: BatchExecutionStrategyId;
  }
  | {
    type: "first_three_adoption";
    itemId: string;
    title: string;
    execution: PrePublishGateAdoptionFollowupExecution;
  };

export interface PrePublishGate {
  status: "ready" | "needs_repair" | "blocked";
  label: string;
  headline: string;
  verdict: string;
  score: number;
  overview: {
    totalProjects: number;
    readyPackages: number;
    repairPackages: number;
    emptyProjects: number;
    runnableTasks: number;
    blockedTasks: number;
    publishBlocked: number;
    failureTasks: number;
    retryableFailures: number;
    canRunBatch: boolean;
  };
  items: PrePublishGateItem[];
  failureRepairBatch: FailureRepairBatch;
  projectStatuses: PrePublishGateProjectStatus[];
  strategyReview: PrePublishGateStrategyReview;
  firstThreeAdoptionClosure: PrePublishGateAdoptionClosure;
  priorityActions: PrePublishGateAction[];
  releaseAction: PrePublishGateAction | null;
  pmFocus: PrePublishGatePmFocus;
}

export interface PrePublishGatePmFocus {
  status: "empty" | "blocked" | "review" | "ready";
  headline: string;
  detail: string;
  scopeLabel: string;
  actionLabel: string;
  actionHref: string;
  pipelineActionLabel: string;
  pipelineActionHref: string;
  pipelineValidationHint: string;
}

export interface PrePublishGateFocusNotice {
  visible: boolean;
  tone: "ready" | "blocked" | "review";
  headline: string;
  detail: string;
  primaryLabel: string;
  primaryHref: string;
  primaryAction?: PrePublishGateAction | null;
  badges: string[];
  recheckSummary?: PrePublishGateRecheckSummary | null;
}

export interface PrePublishGateRecheckSummary {
  title: string;
  statusLabel: string;
  completedSteps: number;
  totalSteps: number;
  currentStepLabel: string;
  recheckVerdict: PrePublishGateRecheckVerdict;
  nextStep: PrePublishGateRecheckNextStep;
  completedEvidence: string[];
  remainingEvidence: string[];
  remainingBlockers: PrePublishGateRemainingBlocker[];
  blockerGroups: PrePublishGateBlockerGroup[];
  roleClosureProgress: PrePublishGateRoleClosureProgress | null;
  firstThreeAdoptionProgress: PrePublishGateFirstThreeAdoptionProgress | null;
  latestEvidence: string | null;
  latestRecheckReceipt: PrePublishGateRecheckReceipt | null;
  closedItems: string[];
  nextDispatch: PrePublishGateRecheckDispatch | null;
  nextDispatches: PrePublishGateRecheckDispatch[];
}

export interface PrePublishGateRecheckReceipt {
  dispatchKey: string;
  evidence: string;
}

export interface PrePublishGateRecheckVerdict {
  tone: "cleared" | "progress" | "stalled";
  label: string;
  detail: string;
}

export interface PrePublishGateRecheckNextStep {
  tone: "release" | "dispatch" | "repair";
  label: string;
  href: string;
  detail: string;
}

export interface PrePublishGateRoleClosureProgress {
  headline: string;
  completedRoles: number;
  totalRoles: number;
  completedLabels: string[];
  missingLabels: string[];
  lanes: PrePublishGateRoleClosureLane[];
}

export interface PrePublishGateRoleClosureLane {
  id: "story-structure" | "context-recall" | "platform-export";
  label: string;
  status: "done" | "missing";
  evidence: string;
}

export interface PrePublishGateFirstThreeAdoptionProgress {
  headline: string;
  detail: string;
  totalTimelines: number;
  completedTimelines: number;
  blockedTimelines: number;
  warningTimelines: number;
  lanes: PrePublishGateFirstThreeAdoptionProgressLane[];
}

export interface PrePublishGateFirstThreeAdoptionProgressLane {
  id: string;
  label: string;
  status: "done" | "blocked" | "warning";
  detail: string;
  evidence: string;
  nextActionLabel: string;
  href: string;
  completedSteps: number;
  totalSteps: number;
}

export interface PrePublishGateRemainingBlocker {
  label: string;
  status: ProjectAcceptanceStep["status"];
  priorityLabel: "优先处理" | "后续卡点";
  actionLabel: string;
  evidence: string;
  stopRule: string;
  href: string;
}

export interface PrePublishGateBlockerGroup {
  label: "当前必须处理" | "后续观察" | "可放行后处理";
  detail: string;
  items: PrePublishGateRemainingBlocker[];
}

export interface PrePublishGateRecheckDispatch {
  id: string;
  platformId: string;
  platformName: string;
  stage:
    | "watch"
    | "start_first_three_review"
    | "start_opening_diagnostic"
    | "start_platform_package"
    | "start_role_dispatch_closure"
    | "start_publish_finalize"
    | "ai_pipeline_sample_recheck";
  state: "queued" | "assigned" | "completed";
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

export interface PrePublishGateInput {
  projects: PrePublishGateProject[];
  failureTasks?: FailureReviewTask[];
  batchHistory?: TaskBatchHistoryItem[];
  batchStrategyId?: BatchExecutionStrategyId | string;
  modelRoleBlocker?: ModelRoleMatrixPriorityBlocker | null;
}

function prePublishGateActionMatchesProject(action: PrePublishGateAction, projectId: string) {
  if (action.id.endsWith(`:${projectId}`) || action.href.includes(`/projects/${projectId}`) || action.href.includes(`firstDayProject=${projectId}`)) {
    return true;
  }

  if (action.execution?.type === "publish_repair") return action.execution.projectId === projectId;
  if (action.execution?.type === "first_three_adoption") {
    const execution = action.execution.execution;
    return execution.type === "publish_check" && execution.projectId === projectId;
  }

  return false;
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function gateItem(input: PrePublishGateItem): PrePublishGateItem {
  return input;
}

type PrePublishGateDispatchTask = NonNullable<PrePublishGateProject["gateDispatchTasks"]>[number];

function isFirstThreeAdoptionFollowup(task: PrePublishGateDispatchTask) {
  return task.dispatchKey.startsWith("first-three-adoption:")
    || task.dispatchKey.startsWith("chapter-adoption:");
}

function firstThreeAdoptionFollowups(projects: PrePublishGateProject[]) {
  return projects.flatMap((project) => (
    (project.gateDispatchTasks ?? [])
      .filter(isFirstThreeAdoptionFollowup)
      .map((task) => ({ project, task }))
  ));
}

function firstThreeFollowupHref(projectId: string, task: PrePublishGateDispatchTask) {
  if (task.href) return task.href;
  if (task.dispatchKey.endsWith(":publish-check")) return `/projects/${projectId}#platform-export`;
  return `/projects/${projectId}`;
}

function firstThreeFollowupType(task: PrePublishGateDispatchTask): PrePublishGateAdoptionFollowupItem["type"] {
  if (task.dispatchKey.endsWith(":review")) return "review";
  if (task.dispatchKey.endsWith(":second-pass")) return "second_pass";
  if (task.dispatchKey.endsWith(":publish-check")) return "publish_check";
  return "other";
}

function firstThreeFollowupLabel(type: PrePublishGateAdoptionFollowupItem["type"]) {
  if (type === "review") return "重新审稿";
  if (type === "second_pass") return "启动二改";
  if (type === "publish_check") return "发布质检";
  return "后续任务";
}

function parseFirstThreeAdoptionDispatchKey(dispatchKey: string) {
  const parts = dispatchKey.split(":");
  if (parts.length < 5 || (parts[0] !== "first-three-adoption" && parts[0] !== "chapter-adoption")) {
    return { family: "first_three" as const, chapterId: null, revisionId: null };
  }
  return {
    family: parts[0] === "chapter-adoption" ? "chapter" as const : "first_three" as const,
    chapterId: parts[2] || null,
    revisionId: parts[3] || null,
  };
}

function firstThreeFollowupExecution(input: {
  projectId: string;
  task: PrePublishGateDispatchTask;
  type: PrePublishGateAdoptionFollowupItem["type"];
  chapterId: string | null;
}): PrePublishGateAdoptionFollowupExecution | null {
  if (input.type === "review" && input.chapterId) {
    return {
      type: "chapter_review",
      chapterId: input.chapterId,
    };
  }
  if (input.type === "publish_check") {
    return {
      type: "publish_check",
      projectId: input.projectId,
      platformId: input.task.platformId ?? null,
    };
  }
  return null;
}

function parseGateAuditPayload(payload: string | null | undefined) {
  if (!payload) return null;
  try {
    const parsed: unknown = JSON.parse(payload);
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function recordArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object") : [];
}

function auditBatchReceiptOutcome(input: {
  project: PrePublishGateProject;
  task: PrePublishGateDispatchTask;
  chapterId: string | null;
}): { status: "pass" | "fail"; evidence: string } | null {
  const queueItemId = `${input.project.id}:adoption-followup:${input.task.dispatchKey}`;
  const audits = (input.project.gateActionAudits ?? [])
    .filter((audit) => audit.executionType === "recommended_batch")
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

  for (const audit of audits) {
    const payload = parseGateAuditPayload(audit.payload);
    const plan = payload?.plan && typeof payload.plan === "object" ? payload.plan as Record<string, unknown> : null;
    const followupIds = stringArray(plan?.adoptionFollowupItemIds);
    if (!followupIds.includes(queueItemId)) continue;

    const matchingResult = recordArray(payload?.results).find((result) => (
      (!input.chapterId || result.chapterId === input.chapterId)
      && (result.status === "succeeded" || result.status === "failed")
    ));
    const resultSucceeded = matchingResult
      ? matchingResult.status === "succeeded"
      : audit.succeededCount > 0 && audit.failedCount === 0;

    const batchReceipt = payload?.batchReceipt && typeof payload.batchReceipt === "object"
      ? payload.batchReceipt as Record<string, unknown>
      : null;
    const receiptStatus = typeof batchReceipt?.status === "string" ? batchReceipt.status : "";
    const headline = typeof batchReceipt?.headline === "string" && batchReceipt.headline
      ? batchReceipt.headline
      : audit.label ?? "推荐批次已完成";
    const chapterTitle = typeof matchingResult?.chapterTitle === "string" && matchingResult.chapterTitle
      ? `，章节：${matchingResult.chapterTitle}`
      : "";
    const error = typeof matchingResult?.error === "string" && matchingResult.error
      ? `，错误：${matchingResult.error}`
      : "";
    const quality = payload?.routeEffectSummary && typeof payload.routeEffectSummary === "object"
      ? (payload.routeEffectSummary as Record<string, unknown>).averageQualityScore
      : null;
    const qualityText = typeof quality === "number" ? `，平均质量 ${Math.round(quality)} 分` : "";
    const receiptFailed = receiptStatus === "repair" || receiptStatus === "review_quality";
    const passed = resultSucceeded && !receiptFailed;
    return resultSucceeded
      ? {
        status: passed ? "pass" : "fail",
        evidence: passed
          ? `任务中心批量回执已验收：${headline}，成功 ${audit.succeededCount} 个、失败 ${audit.failedCount} 个${qualityText}。`
          : `任务中心批量回执未达标：${headline}，成功 ${audit.succeededCount} 个、失败 ${audit.failedCount} 个${chapterTitle}${qualityText}。`,
      }
      : {
        status: "fail",
        evidence: `任务中心批量回执失败：${headline}，成功 ${audit.succeededCount} 个、失败 ${audit.failedCount} 个${chapterTitle}${error}。`,
      };
  }

  return null;
}

function firstThreeAdoptionTimelineStatus(steps: PrePublishGateAdoptionTimelineStep[]): PrePublishGateItem["status"] {
  if (steps.some((step) => step.status === "block" || step.status === "waiting")) return "block";
  if (steps.some((step) => step.status === "warn")) return "warn";
  return "pass";
}

function firstThreeAdoptionTimelineStep(input: {
  id: string;
  type: PrePublishGateAdoptionTimelineStepType;
  label: string;
  item: PrePublishGateAdoptionFollowupItem | null;
  fallbackStatus: PrePublishGateAdoptionTimelineStepStatus;
  detail: string;
  actionLabel: string;
  href: string;
}): PrePublishGateAdoptionTimelineStep {
  return {
    id: input.id,
    type: input.type,
    label: input.label,
    status: input.item?.status ?? input.fallbackStatus,
    followupItemId: input.item?.id ?? null,
    detail: input.item?.detail ?? input.detail,
    evidence: input.item?.evidence ?? "",
    actionLabel: input.item?.actionLabel ?? input.actionLabel,
    href: input.item?.href ?? input.href,
  };
}

function buildFirstThreeAdoptionTimelines(items: PrePublishGateAdoptionFollowupItem[]): PrePublishGateAdoptionTimeline[] {
  const groups = new Map<string, PrePublishGateAdoptionFollowupItem[]>();
  for (const item of items) {
    const key = item.family === "chapter"
      ? `${item.family}:${item.projectId}:${item.chapterId ?? "unknown"}`
      : `${item.family}:${item.projectId}:${item.chapterId ?? "unknown"}:${item.revisionId ?? "unknown"}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return [...groups.entries()].map(([id, group]) => {
    const first = group[0];
    const review = group.find((item) => item.type === "review") ?? null;
    const secondPass = group.find((item) => item.type === "second_pass") ?? null;
    const publish = group.find((item) => item.type === "publish_check") ?? null;
    const projectHref = `/projects/${first.projectId}`;
    const needsSecondPass = group.some((item) => item.family === "chapter" && item.type === "second_pass");
    const secondPassReady = !needsSecondPass || secondPass?.status === "pass";
    const releaseStatus: PrePublishGateAdoptionTimelineStepStatus = review?.status === "pass" && secondPassReady && publish?.status === "pass"
      ? "pass"
      : review?.status === "warn" || secondPass?.status === "warn" || publish?.status === "warn"
        ? "warn"
        : "waiting";
    const releaseDetail = releaseStatus === "pass"
      ? needsSecondPass
        ? "重新审稿、二改和发布质检都已回填，可以回到总闸门判断发布放行。"
        : "重新审稿和发布质检都已回填，可以回到总闸门判断发布放行。"
      : releaseStatus === "warn"
        ? "存在缺证据的闭环任务，补齐验收证据后再判断发布放行。"
        : needsSecondPass
          ? "等待重新审稿、二改和发布质检全部闭合后，再判断发布放行。"
          : "等待重新审稿和发布质检全部闭合后，再判断发布放行。";
    const steps: PrePublishGateAdoptionTimelineStep[] = [
      {
        id: `${id}:adopted`,
        type: "adopted",
        label: "候选已采纳",
        status: "pass",
        followupItemId: null,
        detail: first.family === "chapter" ? "章节候选已经写入正文，旧审稿与旧发布质检自动过期。" : "前三章候选已经写入正文，旧审稿与旧发布质检自动过期。",
        evidence: "正文已采用候选版本。",
        actionLabel: "查看作品",
        href: projectHref,
      },
      firstThreeAdoptionTimelineStep({
        id: `${id}:review`,
        type: "review",
        label: "重新审稿",
        item: review,
        fallbackStatus: "block",
        detail: "缺少采纳后的重新审稿任务，不能沿用旧稿判断。",
        actionLabel: "重新审稿",
        href: projectHref,
      }),
      ...(needsSecondPass ? [firstThreeAdoptionTimelineStep({
        id: `${id}:second-pass`,
        type: "second_pass",
        label: "启动二改",
        item: secondPass,
        fallbackStatus: review?.status === "pass" ? "block" : "waiting",
        detail: review?.status === "pass" ? "重新审稿已完成，等待按审稿问题启动二改。" : "先完成采纳后重新审稿，再启动二改。",
        actionLabel: "启动二改",
        href: first.chapterId ? `/projects/${first.projectId}/chapters/${first.chapterId}#chapter-second-pass` : projectHref,
      })] : []),
      firstThreeAdoptionTimelineStep({
        id: `${id}:publish-check`,
        type: "publish_check",
        label: "发布质检",
        item: needsSecondPass && !secondPassReady ? null : publish,
        fallbackStatus: review?.status === "pass" && secondPassReady ? "block" : "waiting",
        detail: review?.status === "pass" && secondPassReady ? "前置采纳后续已完成，等待刷新发布质检。" : "先完成采纳后重新审稿和必要二改，再回发布质检。",
        actionLabel: "回发布质检",
        href: projectHref,
      }),
      {
        id: `${id}:release`,
        type: "release",
        label: "发布放行",
        status: releaseStatus,
        followupItemId: null,
        detail: releaseDetail,
        evidence: releaseStatus === "pass" ? "总闸门可以使用新正文的审稿与发布质检证据。" : "",
        actionLabel: "刷新总闸门",
        href: "/gate",
      },
    ];
    const status = firstThreeAdoptionTimelineStatus(steps);
    const nextStep = steps.find((step) => step.status === "block" || step.status === "warn" || step.status === "waiting") ?? steps[steps.length - 1];
    const completedSteps = steps.filter((step) => step.status === "pass").length;
    const platformId = group.find((item) => item.platformId)?.platformId ?? null;

    return {
      id,
      projectId: first.projectId,
      projectTitle: first.projectTitle,
      chapterId: first.chapterId,
      revisionId: first.revisionId,
      platformId,
      status,
      label: `${first.projectTitle} · ${review?.title ?? secondPass?.title ?? publish?.title ?? (first.family === "chapter" ? "章节采纳" : "前三章采纳")}`,
      detail: status === "pass"
        ? "采纳后的审稿、发布质检和放行判断已经闭合。"
        : `${nextStep.label}：${nextStep.detail}`,
      nextActionLabel: nextStep.actionLabel,
      href: nextStep.href,
      completedSteps,
      totalSteps: steps.length,
      steps,
    };
  }).sort((left, right) => {
    const statusRank: Record<PrePublishGateItem["status"], number> = { block: 0, warn: 1, pass: 2 };
    return statusRank[left.status] - statusRank[right.status] || left.projectTitle.localeCompare(right.projectTitle);
  });
}

function firstThreeAdoptionRepairDetail(item: PrePublishGateAdoptionFollowupItem) {
  if (item.evidence.includes("任务中心批量回执未达标")) {
    return `${item.evidence} 这不是模型跑完就算过关：先执行二改或质量修复，再回总闸门复检。`;
  }
  if (item.evidence.includes("任务中心批量回执失败")) {
    if (/401|unauthorized|api key|密钥|鉴权|quota|余额|额度/iu.test(item.evidence)) {
      return `${item.evidence} 先去模型设置修 API Key、额度或供应商配置，再重跑采纳后续任务。`;
    }
    if (/timeout|timed out|超时|503|429|rate limit|限流/iu.test(item.evidence)) {
      return `${item.evidence} 先重试；如果连续超时，切换章节审稿模型路线后再跑采纳闭环。`;
    }
    if (item.type === "publish_check") {
      return `${item.evidence} 先回发布包修复标题、简介、标签或样章一致性，再刷新质检。`;
    }
    return `${item.evidence} 先处理失败原因，再重跑采纳后续任务；失败项不能当作发布放行证据。`;
  }
  if (item.status === "warn") {
    return "任务显示已完成，但验收证据不足。补齐审稿分、问题数、发布包版本或质检结果后，再刷新总闸门。";
  }
  if (item.type === "review") {
    return "采纳后的正文还没有重新审稿，旧审稿不能继续当发布通行证。先生成新审稿，再决定是否二改。";
  }
  if (item.type === "second_pass") {
    return "采纳后的正文已经重新审稿，但二改还没有闭合。先按审稿问题启动二改，采纳二改后再回发布质检。";
  }
  if (item.type === "publish_check") {
    return item.family === "chapter"
      ? "采纳后的章节正文会改变发布包一致性。重新审稿和必要二改后刷新发布质检，避免拿旧包装去投平台。"
      : "采纳后的前三章会改变标题、简介、标签和兑现判断。重新审稿后刷新发布质检，避免拿旧包装去投平台。";
  }
  return item.detail || "采纳后的后续任务没有闭合，发布前需要处理。";
}

function firstThreeAdoptionRepairPriority(item: PrePublishGateAdoptionFollowupItem) {
  const statusWeight = item.status === "block" ? 20 : item.status === "warn" ? 10 : 0;
  const typeWeight = item.type === "review" ? 78 : item.type === "second_pass" ? 74 : item.type === "publish_check" ? 70 : 58;
  return statusWeight + typeWeight;
}

function firstThreeAdoptionRepairAction(input: PrePublishGateAdoptionFollowupItem): { label: string; href: string } {
  if (input.evidence.includes("任务中心批量回执未达标")) {
    return {
      label: input.type === "review" ? "进入二改" : "修发布包",
      href: input.type === "review" && input.chapterId ? `/projects/${input.projectId}/chapters/${input.chapterId}#chapter-second-pass` : input.href,
    };
  }
  if (input.evidence.includes("任务中心批量回执失败")) {
    if (/401|unauthorized|api key|密钥|鉴权|quota|余额|额度/iu.test(input.evidence)) {
      return { label: "去模型设置", href: "/settings/models" };
    }
    if (/timeout|timed out|超时|503|429|rate limit|限流/iu.test(input.evidence)) {
      return { label: "重试/切模型", href: "/settings/models" };
    }
    if (input.type === "publish_check") {
      return { label: "修发布包", href: `/projects/${input.projectId}#platform-export` };
    }
    return { label: input.actionLabel, href: input.href };
  }
  return {
    label: input.status === "warn" ? "补验收证据" : input.actionLabel,
    href: input.href,
  };
}

function buildFirstThreeAdoptionRepairQueue(items: PrePublishGateAdoptionFollowupItem[]): PrePublishGateAdoptionRepairItem[] {
  const statusRank: Record<PrePublishGateItem["status"], number> = { block: 0, warn: 1, pass: 2 };
  return items
    .filter((item) => item.status !== "pass")
    .map((item): PrePublishGateAdoptionRepairItem => {
      const repairAction = firstThreeAdoptionRepairAction(item);
      return {
        id: `adoption-repair:${item.id}`,
        followupItemId: item.id,
        projectId: item.projectId,
        projectTitle: item.projectTitle,
        type: item.type,
        status: item.status,
        priorityScore: firstThreeAdoptionRepairPriority(item),
        label: item.status === "warn" ? "补证据" : item.label,
        title: item.title,
        detail: firstThreeAdoptionRepairDetail(item),
        actionLabel: repairAction.label,
        href: repairAction.href,
      };
    })
    .sort((left, right) => (
      statusRank[left.status] - statusRank[right.status]
      || right.priorityScore - left.priorityScore
      || left.projectTitle.localeCompare(right.projectTitle)
    ));
}

function firstThreeAdoptionRepairExecution(
  item: PrePublishGateAdoptionRepairItem,
  followup: PrePublishGateAdoptionFollowupItem | null,
): PrePublishGateActionExecution | null {
  if (!followup?.execution) return null;
  if (item.actionLabel !== followup.actionLabel) return null;
  return {
    type: "first_three_adoption",
    itemId: followup.id,
    title: followup.title,
    execution: followup.execution,
  };
}

function buildFirstThreeAdoptionClosure(projects: PrePublishGateProject[]): PrePublishGateAdoptionClosure {
  const followups = firstThreeAdoptionFollowups(projects);
  const items = followups.map(({ project, task }): PrePublishGateAdoptionFollowupItem => {
    const type = firstThreeFollowupType(task);
    const keyParts = parseFirstThreeAdoptionDispatchKey(task.dispatchKey);
    const batchReceiptOutcome = auditBatchReceiptOutcome({
      project,
      task,
      chapterId: keyParts.chapterId,
    });
    const directEvidence = task.completionEvidence.trim();
    const evidence = directEvidence || batchReceiptOutcome?.evidence || "";
    const missingEvidence = task.state === "completed" && evidence.trim().length < 8;
    const status: PrePublishGateItem["status"] = batchReceiptOutcome?.status === "fail"
      ? "block"
      : task.state !== "completed" && batchReceiptOutcome?.status !== "pass"
      ? "block"
      : missingEvidence
        ? "warn"
        : "pass";
    return {
      id: task.dispatchKey,
      projectId: project.id,
      projectTitle: project.title,
      chapterId: keyParts.chapterId,
      revisionId: keyParts.revisionId,
      platformId: task.platformId ?? null,
      family: keyParts.family,
      type,
      label: firstThreeFollowupLabel(type),
      title: task.title ?? firstThreeFollowupLabel(type),
      status,
      state: task.state,
      detail: batchReceiptOutcome?.status === "fail"
        ? "任务中心批量执行失败，不能当作采纳闭环验收。先处理失败原因，再重跑采纳后续任务。"
        : batchReceiptOutcome?.status === "pass" && task.state !== "completed"
          ? "任务中心批量执行已经产出验收回执，回总闸门后可用于复检放行。"
        : task.detail ?? "采纳后的正文需要重新审稿并刷新发布质检。",
      evidence,
      actionLabel: task.actionLabel ?? (type === "publish_check" ? "回发布质检" : type === "second_pass" ? "启动二改" : "重新审稿"),
      href: firstThreeFollowupHref(project.id, task),
      execution: firstThreeFollowupExecution({
        projectId: project.id,
        task,
        type,
        chapterId: keyParts.chapterId,
      }),
    };
  });
  const pendingItems = items.filter((item) => item.status === "block");
  const missingEvidenceItems = items.filter((item) => item.status === "warn");
  const receiptEvidenceItems = items.filter((item) => item.evidence.includes("任务中心批量回执已验收"));
  const reviewPending = pendingItems.filter((item) => item.type === "review").length;
  const secondPassPending = pendingItems.filter((item) => item.type === "second_pass").length;
  const publishPending = pendingItems.filter((item) => item.type === "publish_check").length;
  const executableReviewChapterIds = new Set(items.flatMap((item) => (
    item.status !== "pass" && item.execution?.type === "chapter_review" ? [item.execution.chapterId] : []
  )));
  const executablePublishTargets = new Set(items.flatMap((item) => (
    item.status !== "pass" && item.execution?.type === "publish_check"
      ? [`${item.execution.projectId}:${item.execution.platformId ?? "default"}`]
      : []
  )));
  const affectedProjects = new Set(followups.map(({ project }) => project.id)).size;
  const status: PrePublishGateItem["status"] = pendingItems.length > 0
    ? "block"
    : missingEvidenceItems.length > 0
      ? "warn"
      : "pass";
  const detail = pendingItems.length > 0
      ? `${affectedProjects} 个项目有章节采纳后续未闭环：${reviewPending} 个待重新审稿，${secondPassPending} 个待二改，${publishPending} 个待发布质检。正文变更后不能沿用旧审稿。`
    : missingEvidenceItems.length > 0
      ? `${missingEvidenceItems.length} 个采纳后续任务已完成但缺少验收证据，发布前补齐证据。`
      : followups.length > 0
        ? `已验收 ${followups.length} 个采纳后续任务，其中 ${receiptEvidenceItems.length} 个来自任务中心批量回执；重新审稿和发布质检都已回填。`
        : "当前没有未闭环的章节采纳后续任务。";
  const repairQueue = buildFirstThreeAdoptionRepairQueue(items);

  return {
    status,
    label: status === "pass" ? "采纳闭环通过" : status === "warn" ? "采纳闭环缺证据" : "采纳闭环阻塞",
    detail,
    total: items.length,
    completed: items.filter((item) => item.status === "pass").length,
    pending: pendingItems.length,
    missingEvidence: missingEvidenceItems.length,
    receiptEvidence: receiptEvidenceItems.length,
    reviewPending,
    publishPending,
    executableReviewCount: executableReviewChapterIds.size,
    executablePublishCheckCount: executablePublishTargets.size,
    repairQueue,
    items,
    timelines: buildFirstThreeAdoptionTimelines(items),
  };
}

function buildFirstThreeAdoptionGateItem(closure: PrePublishGateAdoptionClosure) {
  const firstAction = closure.repairQueue[0] ?? null;
  const repairDetail = firstAction
    ? `${closure.detail} 下一条：${firstAction.projectTitle} · ${firstAction.title} · ${firstAction.detail}`
    : closure.detail;
  return gateItem({
    id: "first-three-adoption-loop",
    label: "采纳闭环",
    status: closure.status,
    detail: repairDetail,
    actionLabel: firstAction?.actionLabel ?? (closure.missingEvidence > 0 ? "补验收证据" : "查看闭环"),
    href: firstAction?.href ?? "/projects",
  });
}

function actionHref(projectId: string, action: PublishRepairAction) {
  if (action.kind === "adopt_candidate" && action.chapterId) return `/projects/${projectId}/chapters/${action.chapterId}#chapter-revisions`;
  if (action.kind === "open_submission_package") return `/projects/${projectId}#submission-package`;
  if (action.kind === "add_publish_chapters") return `/projects/${projectId}#create-chapter`;
  if (action.kind === "run_second_pass" && action.chapterId) return `/projects/${projectId}/chapters/${action.chapterId}#chapter-second-pass`;
  if (action.kind === "run_chapter_review" && action.chapterId) return `/projects/${projectId}/chapters/${action.chapterId}#chapter-workflow`;
  if (action.chapterId) return `/projects/${projectId}/chapters/${action.chapterId}#chapter-editor`;
  return `/projects/${projectId}`;
}

function publishRepairExecution(projectId: string, action: PublishRepairAction): PrePublishGateActionExecution | null {
  if (!canExecutePublishRepairAction(action)) return null;
  return {
    type: "publish_repair",
    projectId,
    kind: action.kind,
    chapterId: action.chapterId,
    chapterTitle: action.chapterTitle,
    detail: action.detail,
  };
}

function effectLabel(status: PlatformPublishEffectSummary["status"]) {
  if (status === "signed") return "签约信号";
  if (status === "promising") return "可放大";
  if (status === "weak") return "弱转化";
  if (status === "watch") return "观察中";
  return "缺数据";
}

function projectAnchor(projectId: string, href: string) {
  return href.startsWith("#") ? `/projects/${projectId}${href}` : href;
}

function effectReview(
  projectId: string,
  effect: PlatformPublishEffectSummary,
  actions: PlatformPublishOptimizationAction[],
  optimizationStatus: PrePublishGateEffectReview["optimizationStatus"],
  optimizationHeadline: string,
): PrePublishGateEffectReview {
  return {
    status: effect.status,
    label: effectLabel(effect.status),
    records: effect.records,
    totalViews: effect.totalViews,
    totalClicks: effect.totalClicks,
    totalFavorites: effect.totalFavorites,
    totalFollows: effect.totalFollows,
    totalComments: effect.totalComments,
    totalPaidReads: effect.totalPaidReads,
    clickRatePercent: effect.clickRatePercent,
    favoriteRatePercent: effect.favoriteRatePercent,
    followRatePercent: effect.followRatePercent,
    paidReadRatePercent: effect.paidReadRatePercent,
    latestSnapshotDate: effect.latest?.snapshotDate ?? null,
    latestContractStatus: effect.latest?.contractStatus ?? null,
    verdict: effect.verdict,
    nextAction: effect.nextAction,
    optimizationStatus,
    optimizationHeadline,
    optimizationActions: actions.slice(0, 3).map((action) => ({
      id: action.id,
      priority: action.priority,
      execution: action.execution,
      label: action.label,
      detail: action.detail,
      target: action.target,
      href: projectAnchor(projectId, action.href),
    })),
  };
}

function loopStatusLabel(status: PrePublishGateLoopTimeline["status"]) {
  if (status === "needs_asset") return "先采纳候选";
  if (status === "needs_baseline") return "保存基准";
  if (status === "needs_effect") return "等待回填";
  if (status === "needs_iteration") return "二轮优化";
  return "放大验证";
}

function buildLoopTimeline(projectId: string, pack: PlatformPublishPackage): PrePublishGateLoopTimeline {
  const latestAdoptedAsset = pack.submissionAssetVersions.find((version) => version.action === "adopt") ?? null;
  const latestAsset = latestAdoptedAsset ?? pack.submissionAssetVersions[0] ?? null;
  const latestSnapshot = pack.publishVersions[0] ?? null;
  const latestMetric = pack.publishEffect.latest;
  const latestRepair = pack.repairHistory[0] ?? null;
  const items: PrePublishGateLoopTimelineItem[] = [
    latestAsset ? {
      id: `asset:${latestAsset.id ?? latestAsset.createdAt}`,
      type: "asset",
      label: latestAsset.action === "adopt" ? "采纳投稿资产" : latestAsset.action === "restore" ? "恢复投稿资产" : "保存投稿资产",
      detail: `${latestAsset.title}｜资产 ${latestAsset.auditScore} 分${latestAsset.strategy ? `｜${latestAsset.strategy}` : ""}`,
      createdAt: latestAsset.createdAt,
      href: `/projects/${projectId}#submission-asset-editor`,
    } : null,
    latestSnapshot ? {
      id: `snapshot:${latestSnapshot.id}`,
      type: "snapshot",
      label: latestSnapshot.action === "snapshot" ? "保存发布包基准" : latestSnapshot.action === "archive" ? "归档发布包" : "记录发布包",
      detail: `${latestSnapshot.title}｜质检 ${latestSnapshot.preflightScore} 分｜${latestSnapshot.chapterCount} 章`,
      createdAt: latestSnapshot.createdAt,
      href: `/projects/${projectId}#package-version-history`,
    } : null,
    latestMetric ? {
      id: `metric:${latestMetric.id ?? latestMetric.snapshotDate}`,
      type: "metric",
      label: "回填投放效果",
      detail: `曝光 ${latestMetric.views}｜点击 ${latestMetric.clicks}｜收藏 ${latestMetric.favorites}｜追读 ${latestMetric.follows}`,
      createdAt: latestMetric.snapshotDate,
      href: `/projects/${projectId}#publish-effect-panel`,
    } : null,
    latestRepair ? {
      id: `repair:${latestRepair.id}`,
      type: "repair",
      label: latestRepair.label,
      detail: `${latestRepair.chapterTitle}｜${latestRepair.message}`,
      createdAt: latestRepair.createdAt,
      href: `/projects/${projectId}#first-three-rewrite`,
    } : null,
  ].filter((item): item is PrePublishGateLoopTimelineItem => Boolean(item))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 5);
  const status: PrePublishGateLoopTimeline["status"] = !latestAsset
    ? "needs_asset"
    : !latestSnapshot
      ? "needs_baseline"
      : !latestMetric
        ? "needs_effect"
        : pack.publishEffect.status === "weak"
          ? "needs_iteration"
          : "scaling";
  const nextAction = status === "needs_asset"
    ? "先生成并采纳一个投稿资产候选，不要拿默认包装去赌平台。"
    : status === "needs_baseline"
      ? "保存当前发布包基准，下一轮投放才有对照。"
      : status === "needs_effect"
        ? "投放后回填曝光、点击、收藏、追读和编辑反馈。"
        : status === "needs_iteration"
          ? "按弱项执行二轮优化，再保存新基准。"
          : "保留有效包装，继续加更和记录下一轮数据。";
  const actionHref = status === "needs_asset"
    ? `/projects/${projectId}#submission-asset-editor`
    : status === "needs_baseline"
      ? `/projects/${projectId}#package-version-history`
      : status === "needs_effect"
        ? `/projects/${projectId}#publish-effect-panel`
        : status === "needs_iteration"
          ? `/projects/${projectId}#first-three-rewrite`
          : `/projects/${projectId}#create-chapter`;

  return {
    status,
    label: loopStatusLabel(status),
    nextAction,
    actionHref,
    items,
  };
}

function buildExportVersionGate(project: PrePublishGateProject): PrePublishGateExportVersionGate {
  const href = `/projects/${project.id}/exports`;
  const latestReceipt = latestExportVersionAudit(project);
  const receiptReview: PrePublishGateExportVersionReceiptReview = latestReceipt
    ? {
      status: "handled",
      label: latestReceipt.label ?? "导出版本动作已执行",
      detail: latestReceipt.message ?? "已经留下导出版本处理回执，刷新后继续确认基准、差异和发布包风险。",
      actionLabel: "复检总闸门",
      href: "/gate#gate-export-package",
      latestActionId: latestReceipt.actionId,
      latestAt: latestReceipt.createdAt,
    }
    : {
      status: "none",
      label: "等待处理回执",
      detail: "还没有导出版本处理回执；执行重导、锁定或替换基准后，总闸门会追踪下一步复检。",
      actionLabel: "处理导出版本",
      href,
      latestActionId: null,
      latestAt: null,
    };
  const actionHref = (hash: string) => `${href}${hash}`;
  const action = (
    id: string,
    label: string,
    detail: string,
    hash: string,
    priority: PrePublishGateExportVersionAction["priority"],
    execution: PrePublishGateExportVersionActionExecution | null = null,
  ): PrePublishGateExportVersionAction => ({
    id,
    label,
    detail,
    href: actionHref(hash),
    priority,
    execution,
  });
  const rawSnapshots = project.exportPackageSnapshots ?? [];
  if (rawSnapshots.length === 0) {
    return {
      status: "pass",
      label: "未接入导出版本中心",
      detail: "这个项目还没有导出版本快照；总闸门暂不因版本中心阻塞发布。",
      actionLabel: "打开版本中心",
      href,
      snapshotCount: 0,
      decisionStatus: null,
      receiptReview,
      repairActions: [
        action("open-version-center", "打开版本中心", "先生成一次导出快照，后续总闸门才能判断版本替换和回退。", "", "secondary"),
      ],
    };
  }

  const snapshots = buildExportSnapshotHistory(rawSnapshots);
  const versionCenter = buildExportVersionCenter(snapshots);
  const decision = versionCenter.baselineDecision;
  const baseActions = [
    action("open-version-center", "打开版本中心", "查看基准对比、时间线和全部导出快照。", "", "secondary"),
  ];
  if (decision.status === "risk") {
    return {
      status: "block",
      label: "导出版本有回退风险",
      detail: `${decision.label}：${decision.detail}`,
      actionLabel: "处理导出版本",
      href,
      snapshotCount: snapshots.length,
      decisionStatus: decision.status,
      receiptReview,
      repairActions: [
        action(
          "regenerate-latest",
          "重导最新包",
          "最新版本出现回退，先按当前内容重新导出同类交付包，再复查差异决策。",
          "#export-history",
          "primary",
          versionCenter.latestSnapshot ? { type: "regenerate_snapshot", snapshotId: versionCenter.latestSnapshot.id } : null,
        ),
        action("keep-old-baseline", "保留旧基准", "旧基准暂时继续作为发布锚点；修完正文或交付包后再替换。", "#export-baseline-timeline", "danger"),
        ...baseActions,
      ],
    };
  }

  if (decision.status === "needs_baseline" || decision.status === "replace" || decision.status === "observe") {
    const repairActions = decision.status === "needs_baseline"
      ? [
        action(
          "lock-recommended-baseline",
          "锁定推荐基准",
          "先锁定正式基准，否则后续版本替换没有参照物。",
          "#export-baseline-decision",
          "primary",
          decision.actionSnapshotId ? { type: "lock_baseline", snapshotId: decision.actionSnapshotId } : null,
        ),
        ...baseActions,
      ]
      : decision.status === "replace"
        ? [
          action(
            "replace-baseline",
            "替换为新基准",
            "最新版本已经明显前进，进入版本中心确认后替换正式基准。",
            "#export-baseline-decision",
            "primary",
            decision.actionSnapshotId ? { type: "lock_baseline", snapshotId: decision.actionSnapshotId } : null,
          ),
          action("review-diff", "先看差异", "替换前查看准备度、章节、字数和内容摘要变化。", "#export-baseline-comparison", "secondary"),
        ]
        : [
          action("review-diff", "人工确认差异", "核心指标没有明确前进，先看差异再决定是否替换。", "#export-baseline-comparison", "primary"),
          ...baseActions,
        ];
    return {
      status: "warn",
      label: decision.label,
      detail: decision.detail,
      actionLabel: decision.actionLabel,
      href,
      snapshotCount: snapshots.length,
      decisionStatus: decision.status,
      receiptReview,
      repairActions,
    };
  }

  return {
    status: "pass",
    label: decision.label,
    detail: decision.detail,
    actionLabel: "查看版本中心",
    href,
    snapshotCount: snapshots.length,
    decisionStatus: decision.status,
    receiptReview,
    repairActions: baseActions,
  };
}

function acceptanceExecutionForStep(
  project: PrePublishGateProject,
  currentStepId: ProjectAcceptanceStep["id"],
  preferredExecution: PrePublishGateActionExecution | null,
) {
  if (preferredExecution?.type === "publish_repair") {
    if (currentStepId === "chapter_review" && preferredExecution.kind === "run_chapter_review") return preferredExecution;
    if (currentStepId === "second_pass" && preferredExecution.kind === "run_second_pass") return preferredExecution;
  }
  const firstChapter = project.chapters[0];
  if (!firstChapter) return null;
  if (currentStepId === "chapter_review") {
    return {
      type: "publish_repair",
      projectId: project.id,
      kind: "run_chapter_review",
      chapterId: firstChapter.id,
      chapterTitle: firstChapter.title,
      detail: "单本作品验收单缺首章审稿证据。",
    } satisfies PrePublishGateActionExecution;
  }
  if (currentStepId === "second_pass") {
    return {
      type: "publish_repair",
      projectId: project.id,
      kind: "run_second_pass",
      chapterId: firstChapter.id,
      chapterTitle: firstChapter.title,
      detail: "单本作品验收单缺首章二改证据。",
    } satisfies PrePublishGateActionExecution;
  }
  return null;
}

function acceptanceRepairMode(
  status: PrePublishGateItem["status"],
  currentStepId: ProjectAcceptanceStep["id"],
  execution: PrePublishGateActionExecution | null,
): PrePublishGateAcceptanceSheetGate["repairMode"] {
  if (status === "pass") return "passed";
  if (currentStepId === "dispatch_receipt") return "dispatch";
  if (execution) return "executable";
  return "manual";
}

function acceptanceExecutionHint(mode: PrePublishGateAcceptanceSheetGate["repairMode"]) {
  if (mode === "passed") return "验收证据已闭合，可以进入发布包确认。";
  if (mode === "executable") return "可一键修复：总闸门会直接运行对应审稿或二改动作。";
  if (mode === "dispatch") return "需去派单中心补完成依据和人工验收，补完后总闸门会自动复检。";
  return "需回到作品页补齐当前验收步骤，再回总闸门复检。";
}

function acceptanceActionHref(projectId: string, stepId: ProjectAcceptanceStep["id"], href: string) {
  if (href === "#ai-pipeline") return "/projects#pipeline-projects";
  const target = href.startsWith("#") ? `/projects/${projectId}${href}` : href;
  if (stepId !== "dispatch_receipt" || !target.startsWith("/dispatch?") || target.includes("step=")) return target;
  if (target.includes("#")) return target.replace("#", "&step=publish-precheck#");
  return `${target}&step=publish-precheck`;
}

const roleClosureProgressLanes = [
  { id: "story-structure", label: "结构主编" },
  { id: "context-recall", label: "资料官" },
  { id: "platform-export", label: "平台包装" },
] as const;

function completedRoleDispatchEvidence(task: NonNullable<PrePublishGateProject["gateDispatchTasks"]>[number]) {
  const evidence = task.completionEvidence.trim();
  return task.state === "completed" && evidence.length >= 20 ? evidence : "";
}

function buildRoleClosureProgress(project: PrePublishGateProject): PrePublishGateRoleClosureProgress | null {
  const roleTasks = (project.gateDispatchTasks ?? []).filter((task) => task.dispatchKey.startsWith(`role-intent:${project.id}:`));
  if (roleTasks.length === 0) return null;

  const lanes = roleClosureProgressLanes.map((lane) => {
    const completedTask = roleTasks.find((task) => (
      task.dispatchKey.startsWith(`role-intent:${project.id}:${lane.id}:`)
      && completedRoleDispatchEvidence(task)
    ));
    const evidence = completedTask ? completedRoleDispatchEvidence(completedTask) : `${lane.label}还缺完成依据。`;
    return {
      id: lane.id,
      label: lane.label,
      status: completedTask ? "done" : "missing",
      evidence,
    } satisfies PrePublishGateRoleClosureLane;
  });
  const completedLabels = lanes.filter((lane) => lane.status === "done").map((lane) => lane.label);
  const missingLabels = lanes.filter((lane) => lane.status === "missing").map((lane) => lane.label);

  return {
    headline: missingLabels.length === 0
      ? `角色闭环 ${completedLabels.length}/${lanes.length}：三类角色已闭合`
      : `角色闭环 ${completedLabels.length}/${lanes.length}：还缺${missingLabels.join("、")}`,
    completedRoles: completedLabels.length,
    totalRoles: lanes.length,
    completedLabels,
    missingLabels,
    lanes,
  };
}

function latestProjectAcceptanceRecheckReceipt(project: PrePublishGateProject): PrePublishGateRecheckReceipt | null {
  const receipts = (project.gateDispatchTasks ?? [])
    .filter((task) => (
      task.dispatchKey.startsWith(`project-acceptance-next:${project.id}:`)
      && task.state === "completed"
      && task.completionEvidence.trim()
    ))
    .map((task) => ({
      dispatchKey: task.dispatchKey,
      evidence: task.completionEvidence.trim(),
    }));

  return receipts.at(-1) ?? null;
}

function buildAcceptanceSheetGate(
  project: PrePublishGateProject,
  platformName: string,
  repairExecution: PrePublishGateActionExecution | null,
): PrePublishGateAcceptanceSheetGate {
  const chaptersById = new Map(project.chapters.map((chapter) => [chapter.id, chapter]));
  const dashboard = buildProjectDashboard({
    projectId: project.id,
    currentWordCount: project.currentWordCount,
    targetWordCount: project.targetWordCount,
    platform: getPlatformProfile(project.targetPlatform as PlatformId),
    chapters: project.chapters,
    aiTasks: project.aiTasks.map((task) => ({
      id: task.id,
      taskType: task.taskType,
      status: task.status,
      model: "",
      createdAt: task.createdAt,
      chapter: task.chapterId ? chaptersById.get(task.chapterId) ?? null : null,
    })),
    gateDispatchTasks: project.gateDispatchTasks?.map((task) => ({
      dispatchKey: task.dispatchKey,
      state: task.state,
      completionEvidence: task.completionEvidence,
    })) ?? [],
  });
  const sheet = dashboard.realSampleAcceptanceSheet;
  const current = sheet.steps.find((step) => step.id === sheet.currentStepId) ?? sheet.steps[0];
  const status: PrePublishGateItem["status"] = sheet.gateStatus === "ready"
    ? "pass"
    : current?.id === "publish_package"
      ? "warn"
      : "block";
  const execution = acceptanceExecutionForStep(project, sheet.currentStepId, repairExecution);
  const repairMode = acceptanceRepairMode(status, sheet.currentStepId, execution);
  const href = acceptanceActionHref(project.id, sheet.currentStepId, sheet.actionHref);
  const latestDispatchEvidence = (project.gateDispatchTasks ?? [])
    .filter((task) => task.dispatchKey.startsWith("first-day:") && task.state === "completed" && task.completionEvidence.trim())
    .map((task) => task.completionEvidence.trim())[0] ?? null;
  const latestRecheckReceipt = latestProjectAcceptanceRecheckReceipt(project);
  const roleClosureProgress = sheet.roleClosureProgress;
  const currentMissingEvidence = sheet.missingEvidence.find((item) => item.stepId === sheet.currentStepId)
    ?? sheet.missingEvidence[0]
    ?? null;
  const runbookStep = currentMissingEvidence?.runbookStep
    ?? {
      stepId: "publish_package",
      title: "发布包与平台复盘",
      owner: "投稿包装编辑 + 反馈运营",
      sampleAction: "复查发布包、版本基线、平台卖点、样章和真实反馈。",
      proofToCapture: "保存发布包、导出版本、平台卖点、样章、反馈记录、复盘指标和下一轮修订任务。",
      rollbackIfWeak: "平台卖点、前三章兑现、标签或反馈记录缺失时，停在发布修复，不宣称流水线完成。",
    } satisfies ProjectAcceptanceRunbookStep;

  return {
    status,
    label: status === "pass" ? "验收单通过" : status === "warn" ? "发布包待验" : "验收单阻塞",
    detail: `${project.title} · ${platformName} · ${sheet.verdict}`,
    actionLabel: sheet.actionLabel,
    href,
    currentStepId: sheet.currentStepId,
    steps: sheet.steps,
    latestDispatchEvidence,
    latestRecheckReceipt,
    roleClosureProgress,
    runbookStep,
    repairMode,
    executionHint: acceptanceExecutionHint(repairMode),
    execution: repairMode === "executable" ? execution : null,
  };
}

function projectStatus(project: PrePublishGateProject): PrePublishGateProjectStatus {
  const platform = getPlatformProfile(project.targetPlatform as PlatformId);
  const aiTasks = project.aiTasks.map((task) => ({
    ...task,
    inputSnapshot: task.inputSnapshot ?? undefined,
  }));
  const center = buildPlatformPublishExportCenter({
    project: {
      title: project.title,
      genre: project.genre,
      sellingPoint: project.sellingPoint,
      currentWordCount: project.currentWordCount,
      targetWordCount: project.targetWordCount,
    },
    targetPlatform: platform,
    chapters: project.chapters,
    aiTasks,
    publishSnapshots: project.publishSnapshots ?? [],
    submissionAssets: project.submissionAssets ?? [],
    submissionAssetVersions: project.submissionAssetVersions ?? [],
    platformPublishMetrics: project.platformPublishMetrics ?? [],
    platforms: [platform],
  });
  const pack = center.packages[0];
  const nextRepairAction = pack.repairActions.find((action) => action.id === pack.repairPath.nextStep?.id)
    ?? pack.repairActions.find(canExecutePublishRepairAction)
    ?? pack.repairActions[0]
    ?? null;
  const publishableChapters = center.totalPublishableChapters;
  const exportVersionGate = buildExportVersionGate(project);
  const exportVersionBlocked = exportVersionGate.status === "block";
  const repairExecution = exportVersionBlocked ? null : nextRepairAction ? publishRepairExecution(project.id, nextRepairAction) : null;
  const acceptanceSheetGate = buildAcceptanceSheetGate(project, pack.platformName, repairExecution);
  const acceptanceBlocked = acceptanceSheetGate.status === "block";
  const ready = publishableChapters > 0 && pack.canExport && pack.finalGate.status === "ready_to_submit" && !exportVersionBlocked && acceptanceSheetGate.status === "pass";
  const empty = publishableChapters === 0;
  const nextAction = exportVersionBlocked
    ? exportVersionGate.actionLabel
    : acceptanceBlocked
      ? acceptanceSheetGate.actionLabel
      : ready
      ? "导出平台发布包"
      : nextRepairAction?.label ?? pack.finalGate.nextAction ?? "回到项目工作台补齐发布资料";
  const href = exportVersionBlocked
    ? exportVersionGate.href
    : acceptanceBlocked
      ? acceptanceSheetGate.href
    : nextRepairAction ? actionHref(project.id, nextRepairAction) : `/projects/${project.id}#platform-export`;

  return {
    projectId: project.id,
    projectTitle: project.title,
    platformId: pack.platformId,
    platformName: pack.platformName,
    status: ready ? "ready" : empty ? "empty" : "needs_repair",
    label: ready ? "可发布" : empty ? "无正文" : "待修复",
    preflightScore: pack.preflight.score,
    finalGateLabel: pack.finalGate.label,
    publishableChapters,
    wordCount: pack.chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0),
    blockedCount: pack.preflight.blocked.length + pack.finalGate.blockers.length + (exportVersionGate.status === "block" ? 1 : 0) + (acceptanceSheetGate.status === "block" ? 1 : 0),
    warningCount: pack.warnings.length + pack.preflight.warnings.length + (exportVersionGate.status === "warn" ? 1 : 0) + (acceptanceSheetGate.status === "warn" ? 1 : 0),
    nextAction,
    href,
    downloadHref: ready ? `/api/projects/${project.id}/platform-export?format=markdown&platformId=${pack.platformId}` : null,
    execution: acceptanceBlocked ? acceptanceSheetGate.execution : repairExecution,
    acceptanceSheetGate,
    exportVersionGate,
    effectReview: effectReview(
      project.id,
      pack.publishEffect,
      pack.effectOptimization.actions,
      pack.effectOptimization.status,
      pack.effectOptimization.headline,
    ),
    loopTimeline: buildLoopTimeline(project.id, pack),
  };
}

function action(
  id: string,
  label: string,
  detail: string,
  href: string,
  tone: PrePublishGateAction["tone"] = "repair",
  execution: PrePublishGateActionExecution | null = null,
): PrePublishGateAction {
  return { id, label, detail, href, tone, execution };
}

function uniqueActions(actions: PrePublishGateAction[]) {
  const seen = new Set<string>();
  return actions.filter((item) => {
    const key = `${item.label}:${item.href}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 8);
}

function firstThreeAdoptionPriorityActions(closure: PrePublishGateAdoptionClosure) {
  const itemsById = new Map(closure.items.map((item) => [item.id, item]));
  return closure.repairQueue
    .slice(0, 4)
    .map((item) => {
      const followup = itemsById.get(item.followupItemId) ?? null;
      return action(
        `adoption-followup:${item.followupItemId}`,
        item.actionLabel,
        `${item.projectTitle} · ${item.title} · ${item.detail}`,
        item.href,
        "repair",
        firstThreeAdoptionRepairExecution(item, followup),
      );
    });
}

function buildReleaseAction(
  status: PrePublishGate["status"],
  projectStatuses: PrePublishGateProjectStatus[],
  priorityActions: PrePublishGateAction[],
) {
  const readyProject = projectStatuses.find((project) => project.status === "ready" && project.downloadHref)
    ?? projectStatuses.find((project) => project.status === "ready")
    ?? null;

  if (status === "ready" && readyProject) {
    const releaseLabel = readyProject.loopTimeline.status === "needs_baseline"
      ? "保存基准并下载"
      : readyProject.loopTimeline.status === "needs_effect"
        ? "回填平台效果"
        : readyProject.loopTimeline.status === "needs_iteration"
          ? "处理二轮优化"
          : readyProject.loopTimeline.status === "scaling"
            ? "继续加更复盘"
            : "进入发布闭环";
    return action(
      `release:${readyProject.projectId}`,
      releaseLabel,
      `${readyProject.projectTitle} · ${readyProject.platformName} 已通过总闸门。下一步：${readyProject.loopTimeline.nextAction}`,
      "#gate-export-package",
      "primary",
    );
  }

  const nextAction = status === "blocked"
    ? priorityActions.find((item) => item.id === "model-roles")
      ?? priorityActions.find((item) => item.id.startsWith("export-version:"))
      ?? priorityActions.find((item) => item.id === "queue:next")
      ?? priorityActions.find((item) => item.id.startsWith("adoption-followup:"))
      ?? priorityActions.find((item) => item.id.startsWith("repair:"))
      ?? priorityActions[0]
      ?? null
    : priorityActions[0] ?? null;
  if (!nextAction) return null;

  if (status === "needs_repair") {
    return {
      ...nextAction,
      id: `release-review:${nextAction.id}`,
      label: `先处理提醒：${nextAction.label}`,
      tone: "review" as const,
    };
  }

  return {
    ...nextAction,
    id: `release-blocked:${nextAction.id}`,
    label: `先解除阻塞：${nextAction.label}`,
    tone: "repair" as const,
  };
}

function buildPrePublishGatePmFocus(
  status: PrePublishGate["status"],
  releaseAction: PrePublishGateAction | null,
): PrePublishGatePmFocus {
  const scopeLabel = `${platformDeliveryScope.statusLabel} · ${platformDeliveryScope.expansionLabel}`;
  if (!releaseAction) {
    return {
      status: "empty",
      headline: "总闸门没有可验收动作，先回任务中心补生产证据。",
      detail: "当前没有发布包、阻塞修复或推荐批次可以直接执行。先补章节、审稿、投稿资产或平台效果，再回总闸门复查。",
      scopeLabel,
      actionLabel: "回任务中心",
      actionHref: "/tasks",
      pipelineActionLabel: "核对项目流水线",
      pipelineActionHref: "/projects#pipeline-projects",
      pipelineValidationHint: "放量前先回项目流水线补样本、复查、失败修复和发布包证据；缺证据就不允许放大生产。",
    };
  }

  const focusStatus = status === "ready" ? "ready" : status === "blocked" ? "blocked" : "review";
  return {
    status: focusStatus,
    headline: status === "ready" ? `当前可放行：${releaseAction.label}` : `当前先验收：${releaseAction.label}`,
    detail: releaseAction.detail,
    scopeLabel,
    actionLabel: releaseAction.label,
    actionHref: releaseAction.href,
    pipelineActionLabel: "核对项目流水线",
    pipelineActionHref: "/projects#pipeline-projects",
    pipelineValidationHint: "放量前先回项目流水线核对样本、复查、失败修复和发布包证据；证据不闭合就只允许修复或小样本。",
  };
}

function projectAcceptanceRecheckProjectId(actionId: string | null | undefined) {
  if (!actionId?.startsWith("project-acceptance:")) return null;
  return actionId.slice("project-acceptance:".length);
}

function projectAcceptanceGateReturnHref(projectId: string) {
  return `/gate?focus=action-recheck&actionId=project-acceptance:${encodeURIComponent(projectId)}#gate-focus-notice`;
}

function appendGateReturnHref(href: string, gateReturnHref: string) {
  const hashIndex = href.indexOf("#");
  const base = hashIndex === -1 ? href : href.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : href.slice(hashIndex);
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}gateReturn=${encodeURIComponent(gateReturnHref)}${hash}`;
}

function buildProjectAcceptanceRemainingBlockers(
  projectId: string,
  steps: ProjectAcceptanceStep[],
): PrePublishGateRemainingBlocker[] {
  const gateReturnHref = projectAcceptanceGateReturnHref(projectId);
  return steps
    .filter((step) => step.status !== "done")
    .sort((left, right) => {
      const leftRank = left.status === "current" ? 0 : 1;
      const rightRank = right.status === "current" ? 0 : 1;
      return leftRank - rightRank;
    })
    .map((step) => ({
      label: step.label,
      status: step.status,
      priorityLabel: step.status === "current" ? "优先处理" : "后续卡点",
      actionLabel: `处理${step.label}`,
      evidence: step.evidence,
      stopRule: step.stopRule,
      href: appendGateReturnHref(acceptanceActionHref(projectId, step.id, step.href), gateReturnHref),
    }));
}

function buildProjectAcceptanceBlockerGroups(
  blockers: PrePublishGateRemainingBlocker[],
): PrePublishGateBlockerGroup[] {
  const currentItems = blockers.filter((blocker) => blocker.priorityLabel === "优先处理");
  const laterItems = blockers.filter((blocker) => blocker.priorityLabel === "后续卡点");
  const groups: PrePublishGateBlockerGroup[] = [];
  if (currentItems.length) {
    groups.push({
      label: "当前必须处理",
      detail: "先处理这一组；它没关掉之前，不要跳到后续卡点。",
      items: currentItems,
    });
  }
  if (laterItems.length) {
    groups.push({
      label: "后续观察",
      detail: "等当前卡点关闭后再看这一组，不要提前跳步骤。",
      items: laterItems,
    });
  }
  return groups;
}

function buildProjectAcceptanceRecheckVerdict(input: {
  acceptanceStatus: PrePublishGateProjectStatus["acceptanceSheetGate"]["status"];
  completedSteps: number;
  totalSteps: number;
  currentStepLabel: string;
  remainingBlockers: PrePublishGateRemainingBlocker[];
  latestEvidence: string | null;
}): PrePublishGateRecheckVerdict {
  if (input.acceptanceStatus === "pass" || input.remainingBlockers.length === 0) {
    return {
      tone: "cleared",
      label: "验收缺口已解除",
      detail: `已补 ${input.completedSteps}/${input.totalSteps} 步；这张验收单不再卡总闸门，放量前复查发布包和失败队列。`,
    };
  }

  if (input.latestEvidence) {
    return {
      tone: "progress",
      label: "卡点已减少",
      detail: `已补 ${input.completedSteps}/${input.totalSteps} 步；继续处理「${input.currentStepLabel}」，否则总闸门不会放行。`,
    };
  }

  return {
    tone: "stalled",
    label: "卡点仍在",
    detail: `已补 ${input.completedSteps}/${input.totalSteps} 步；当前仍卡在「${input.currentStepLabel}」，先补完成依据和人工验收。`,
  };
}

function buildProjectAcceptanceRecheckNextStep(input: {
  verdict: PrePublishGateRecheckVerdict;
  currentStepLabel: string;
  nextDispatch: PrePublishGateRecheckDispatch | null;
  remainingBlockers: PrePublishGateRemainingBlocker[];
  releaseAction: PrePublishGateAction | null;
  fallbackAction: PrePublishGateAction | null;
}): PrePublishGateRecheckNextStep {
  if (input.verdict.tone === "cleared") {
    const action = input.releaseAction ?? input.fallbackAction;
    return {
      tone: "release",
      label: action?.label ?? "进入发布闭环",
      href: action?.href ?? "#gate-export-package",
      detail: `验收缺口已解除；下一步按「${action?.label ?? "进入发布闭环"}」继续，不要回头重复补同一张单。`,
    };
  }

  if (input.nextDispatch) {
    return {
      tone: "dispatch",
      label: input.nextDispatch.actionLabel,
      href: input.nextDispatch.href,
      detail: `继续补「${input.currentStepLabel}」完成依据；生成派单后处理产物链接、人工验收和回总闸门复检。`,
    };
  }

  const blocker = input.remainingBlockers[0] ?? null;
  return {
    tone: "repair",
    label: blocker?.actionLabel ?? "继续处理当前卡点",
    href: blocker?.href ?? "/gate",
    detail: blocker
      ? `当前还卡在「${blocker.label}」；先处理这一个卡点，别跳到后续步骤。`
      : "当前没有可自动派发的下一步，先回总闸门核对优先动作。",
  };
}

function buildProjectAcceptanceClosedItems(
  receipt: PrePublishGateRecheckReceipt | null,
): string[] {
  if (!receipt) return [];
  if (receipt.dispatchKey.endsWith(":publish_package")) return ["发布包"];
  if (receipt.dispatchKey.endsWith(":role_dispatch")) {
    return ["资料官", "平台包装"].filter((label) => receipt.evidence.includes(label));
  }
  return [];
}

function buildFirstThreeAdoptionRecheckProgress(
  projectId: string,
  closure: PrePublishGateAdoptionClosure,
): PrePublishGateFirstThreeAdoptionProgress | null {
  const timelines = closure.timelines.filter((timeline) => timeline.projectId === projectId);
  if (timelines.length === 0) return null;

  const lanes = timelines.map((timeline) => {
    const nextStep = timeline.steps.find((step) => step.status !== "pass") ?? timeline.steps.at(-1) ?? null;
    const latestEvidence = timeline.steps
      .filter((step) => step.status === "pass" && step.evidence.trim())
      .map((step) => step.evidence.trim())
      .at(-1) ?? nextStep?.evidence ?? timeline.detail;
    return {
      id: timeline.id,
      label: timeline.label,
      status: timeline.status === "pass" ? "done" : timeline.status === "warn" ? "warning" : "blocked",
      detail: timeline.detail,
      evidence: latestEvidence,
      nextActionLabel: timeline.nextActionLabel,
      href: timeline.href,
      completedSteps: timeline.completedSteps,
      totalSteps: timeline.totalSteps,
    } satisfies PrePublishGateFirstThreeAdoptionProgressLane;
  });
  const completedTimelines = lanes.filter((lane) => lane.status === "done").length;
  const blockedTimelines = lanes.filter((lane) => lane.status === "blocked").length;
  const warningTimelines = lanes.filter((lane) => lane.status === "warning").length;
  const totalTimelines = lanes.length;
  const issueText = [
    blockedTimelines ? `仍阻塞 ${blockedTimelines} 条` : "",
    warningTimelines ? `证据不足 ${warningTimelines} 条` : "",
  ].filter(Boolean).join("，");

  return {
    headline: issueText
      ? `采纳后续 ${completedTimelines}/${totalTimelines}：${issueText}`
      : `采纳后续 ${completedTimelines}/${totalTimelines}：新正文闭环已解除`,
    detail: issueText
      ? `${issueText}；先处理卡住的重新审稿、二改或发布质检，再刷新总闸门。`
      : "采纳后的重新审稿、二改判断和发布质检都已闭合，可以继续看发布放行。",
    totalTimelines,
    completedTimelines,
    blockedTimelines,
    warningTimelines,
    lanes,
  };
}

function buildProjectAcceptanceRecheckSummary(
  actionId: string | null | undefined,
  gate: PrePublishGate,
): PrePublishGateRecheckSummary | null {
  const projectId = projectAcceptanceRecheckProjectId(actionId);
  if (!projectId) return null;
  const project = gate.projectStatuses.find((item) => item.projectId === projectId) ?? null;
  if (!project) return null;

  const steps = project.acceptanceSheetGate.steps;
  const currentStep = steps.find((step) => step.id === project.acceptanceSheetGate.currentStepId) ?? steps[0] ?? null;
  const completedSteps = steps.filter((step) => step.status === "done").length;
  const remainingBlockers = project.acceptanceSheetGate.status === "pass"
    ? []
    : buildProjectAcceptanceRemainingBlockers(project.projectId, steps);
  const blockerGroups = buildProjectAcceptanceBlockerGroups(remainingBlockers);
  const nextDispatch = buildProjectAcceptanceNextDispatch(project, currentStep, completedSteps);
  const nextDispatches = buildProjectAcceptanceNextDispatches(project, currentStep, completedSteps, nextDispatch);
  const latestEvidence = project.acceptanceSheetGate.latestDispatchEvidence;
  const latestRecheckReceipt = project.acceptanceSheetGate.latestRecheckReceipt;
  const closedItems = buildProjectAcceptanceClosedItems(latestRecheckReceipt);
  const firstThreeAdoptionProgress = buildFirstThreeAdoptionRecheckProgress(project.projectId, gate.firstThreeAdoptionClosure);
  const currentStepLabel = currentStep?.label ?? project.acceptanceSheetGate.actionLabel;
  const recheckVerdict = buildProjectAcceptanceRecheckVerdict({
    acceptanceStatus: project.acceptanceSheetGate.status,
    completedSteps,
    totalSteps: steps.length,
    currentStepLabel,
    remainingBlockers,
    latestEvidence: latestEvidence ?? latestRecheckReceipt?.evidence ?? null,
  });

  return {
    title: `${project.projectTitle} · 项目验收单回填`,
    statusLabel: project.acceptanceSheetGate.label,
    completedSteps,
    totalSteps: steps.length,
    currentStepLabel,
    recheckVerdict,
    nextStep: buildProjectAcceptanceRecheckNextStep({
      verdict: recheckVerdict,
      currentStepLabel,
      nextDispatch,
      remainingBlockers,
      releaseAction: gate.releaseAction,
      fallbackAction: gate.priorityActions[0] ?? null,
    }),
    completedEvidence: steps.filter((step) => step.status === "done").map((step) => step.evidence),
    remainingEvidence: steps.filter((step) => step.status !== "done").map((step) => `${step.label}：${step.evidence}`),
    remainingBlockers,
    blockerGroups,
    roleClosureProgress: project.acceptanceSheetGate.roleClosureProgress,
    firstThreeAdoptionProgress,
    latestEvidence,
    latestRecheckReceipt,
    closedItems,
    nextDispatch,
    nextDispatches,
  };
}

function acceptanceNextDispatchSpec(stepId: ProjectAcceptanceStep["id"]) {
  if (stepId === "project_start") {
    return {
      stage: "watch",
      ownerRole: "主编",
      title: "补开书基础",
    } as const;
  }
  if (stepId === "opening_sample") {
    return {
      stage: "start_opening_diagnostic",
      ownerRole: "开头诊断编辑",
      title: "补首章样本",
    } as const;
  }
  if (stepId === "chapter_review") {
    return {
      stage: "start_first_three_review",
      ownerRole: "首轮审稿编辑",
      title: "补首章审稿",
    } as const;
  }
  if (stepId === "second_pass") {
    return {
      stage: "ai_pipeline_sample_recheck",
      ownerRole: "二改编辑",
      title: "补首章二改",
    } as const;
  }
  if (stepId === "dispatch_receipt") {
    return {
      stage: "start_publish_finalize",
      ownerRole: "派单验收负责人",
      title: "补首日派单回执",
    } as const;
  }
  if (stepId === "role_dispatch") {
    return {
      stage: "start_role_dispatch_closure",
      ownerRole: "角色验收负责人",
      title: "补角色派单闭环",
    } as const;
  }
  return {
    stage: "start_platform_package",
    ownerRole: "平台包装编辑",
    title: "补发布包验收",
  } as const;
}

const roleDispatchClosureSpecs = [
  { entryId: "story-structure", missingLabel: "结构主编" },
  { entryId: "context-recall", missingLabel: "资料官" },
  { entryId: "platform-export", missingLabel: "平台包装" },
] as const;

function missingRoleDispatchClosureSpecs(currentStep: ProjectAcceptanceStep | null) {
  if (currentStep?.id !== "role_dispatch") return [];
  return roleDispatchClosureSpecs.filter((spec) => currentStep.evidence.includes(spec.missingLabel));
}

function buildRoleDispatchClosureDispatches(
  project: PrePublishGateProjectStatus,
  currentStep: ProjectAcceptanceStep | null,
  completedSteps: number,
): PrePublishGateRecheckDispatch[] {
  const roleEntrypoints = buildProjectRoleWorkflowEntrypoints();
  return missingRoleDispatchClosureSpecs(currentStep).flatMap((spec) => {
    const entry = roleEntrypoints.find((item) => item.id === spec.entryId);
    if (!entry || !currentStep) return [];
    const intent = entry.dispatchIntent;

    return {
      id: `role-intent:${project.projectId}:${entry.id}:${intent.roleId}`,
      platformId: project.platformId,
      platformName: project.platformName,
      stage: "start_role_dispatch_closure",
      state: "queued",
      priorityScore: project.acceptanceSheetGate.status === "block" ? 92 : 78,
      ownerRole: intent.ownerRole,
      title: `${project.projectTitle}｜${intent.actionLabel}`,
      detail: `${project.projectTitle} · ${project.platformName} · ${entry.detail} ${currentStep.stopRule} 已完成 ${completedSteps}/${project.acceptanceSheetGate.steps.length} 步，处理后回总闸门复检。`,
      dueLabel: "今天收口",
      actionLabel: intent.actionLabel,
      href: `/projects/${project.projectId}${entry.projectAnchor}`,
      acceptanceCriteria: [
        intent.acceptance,
        `建议模型：${intent.modelOwner}`,
        "完成后必须补充产物链接、人工验收和下一步判断。",
      ],
      evidence: [
        ...project.acceptanceSheetGate.steps.filter((step) => step.status === "done").map((step) => step.evidence).slice(-3),
        currentStep.evidence,
      ],
      reviewLatestAt: new Date(0).toISOString(),
    };
  });
}

function buildProjectAcceptanceNextDispatch(
  project: PrePublishGateProjectStatus,
  currentStep: ProjectAcceptanceStep | null,
  completedSteps: number,
): PrePublishGateRecheckDispatch | null {
  if (!currentStep || project.acceptanceSheetGate.status === "pass") return null;
  const spec = acceptanceNextDispatchSpec(currentStep.id);
  const evidence = [
    ...project.acceptanceSheetGate.steps.filter((step) => step.status === "done").map((step) => step.evidence).slice(-3),
    project.acceptanceSheetGate.latestDispatchEvidence,
    project.acceptanceSheetGate.latestRecheckReceipt?.evidence,
  ].filter((line): line is string => Boolean(line));

  return {
    id: `project-acceptance-next:${project.projectId}:${currentStep.id}`,
    platformId: project.platformId,
    platformName: project.platformName,
    stage: spec.stage,
    state: "queued",
    priorityScore: project.acceptanceSheetGate.status === "block" ? 92 : 78,
    ownerRole: spec.ownerRole,
    title: `${project.projectTitle}｜${spec.title}`,
    detail: `${project.projectTitle} · ${project.platformName} · ${currentStep.evidence} ${currentStep.stopRule} 已完成 ${completedSteps}/${project.acceptanceSheetGate.steps.length} 步，处理后回总闸门复检。`,
    dueLabel: "今天收口",
    actionLabel: "生成下一张派单",
    href: project.acceptanceSheetGate.href,
    acceptanceCriteria: [
      `完成「${currentStep.label}」证据`,
      "写清处理结果和人工验收依据",
      "回总闸门复检后卡点减少",
    ],
    evidence,
    reviewLatestAt: new Date(0).toISOString(),
  };
}

function buildProjectAcceptanceNextDispatches(
  project: PrePublishGateProjectStatus,
  currentStep: ProjectAcceptanceStep | null,
  completedSteps: number,
  fallback: PrePublishGateRecheckDispatch | null,
) {
  const roleDispatches = buildRoleDispatchClosureDispatches(project, currentStep, completedSteps);
  if (roleDispatches.length > 0) return roleDispatches;
  return fallback ? [fallback] : [];
}

function appendRecheckSummaryDetail(detail: string, summary: PrePublishGateRecheckSummary | null) {
  if (!summary) return detail;
  return `${detail} 验收单回填：已完成 ${summary.completedSteps}/${summary.totalSteps} 步，当前卡点是「${summary.currentStepLabel}」。`;
}

export function buildPrePublishGateFocusNotice(input: {
  focus?: string | null;
  projectId?: string | null;
  actionId?: string | null;
  gate: PrePublishGate;
}): PrePublishGateFocusNotice {
  if (input.focus === "action-recheck") {
    const recheckSummary = buildProjectAcceptanceRecheckSummary(input.actionId, input.gate);
    const sameAction = input.actionId
      ? input.gate.priorityActions.find((action) => action.id === input.actionId) ?? null
      : null;
    const primary = sameAction ?? input.gate.releaseAction ?? input.gate.priorityActions[0] ?? null;
    const gateReady = input.gate.status === "ready";

    if (sameAction) {
      return {
        visible: true,
        tone: "blocked",
        headline: "上次动作后仍有阻塞",
        detail: appendRecheckSummaryDetail(
          `${sameAction.detail} 这说明刚才的处理还没有完全解除当前卡点，先继续处理同一动作，再刷新总闸门复检。`,
          recheckSummary,
        ),
        primaryLabel: sameAction.label,
        primaryHref: sameAction.href,
        primaryAction: sameAction,
        badges: ["动作复检", "继续处理同一动作", "解除后再放量"],
        recheckSummary,
      };
    }

    if (gateReady) {
      return {
        visible: true,
        tone: "ready",
        headline: "上次动作已清除，总闸门可放行",
        detail: appendRecheckSummaryDetail(
          primary?.detail
            ? `上次处理的阻塞已经不在优先动作里。${primary.detail}`
            : "上次处理的阻塞已经不在优先动作里，总闸门当前可放行。",
          recheckSummary,
        ),
        primaryLabel: primary?.label ?? "进入发布闭环",
        primaryHref: primary?.href ?? "#gate-export-package",
        primaryAction: primary?.execution ? primary : null,
        badges: ["上次动作已清除", "总闸门可放行", "放量前复查证据"],
        recheckSummary,
      };
    }

    return {
      visible: true,
      tone: "review",
      headline: "上次动作已清除，继续下一个阻塞",
      detail: appendRecheckSummaryDetail(
        primary?.detail
          ? `上次处理的动作已经不在优先队列里。现在继续处理：${primary.detail}`
          : `上次处理的动作已经不在优先队列里。${input.gate.verdict}`,
        recheckSummary,
      ),
      primaryLabel: primary?.label ?? "查看优先动作",
      primaryHref: primary?.href ?? "/gate",
      primaryAction: primary?.execution ? primary : null,
      badges: ["上次动作已清除", "继续下一个阻塞", "处理后再复检"],
      recheckSummary,
    };
  }

  if (input.focus !== "first-day-complete") {
    return {
      visible: false,
      tone: "review",
      headline: "",
      detail: "",
      primaryLabel: "",
      primaryHref: "",
      primaryAction: null,
      badges: [],
    };
  }

  const taskQueueItem = input.gate.items.find((item) => item.id === "task-queue") ?? null;
  const firstDayStillBlocked = taskQueueItem?.status === "block"
    && /首日|观察闸门|交接证据/u.test(taskQueueItem.detail);
  const targetProject = input.projectId
    ? input.gate.projectStatuses.find((project) => project.projectId === input.projectId) ?? null
    : null;
  const targetProjectAction = input.projectId
    ? input.gate.priorityActions.find((action) => prePublishGateActionMatchesProject(action, input.projectId ?? "")) ?? null
    : null;
  const focusedProjectAction = input.gate.status === "ready" ? null : targetProjectAction;
  const primary = focusedProjectAction ?? input.gate.releaseAction ?? input.gate.priorityActions[0] ?? null;
  const smallBatchAction = focusedProjectAction
    ? null
    : input.gate.priorityActions.find((action) => action.execution?.type === "recommended_batch") ?? null;
  const targetLead = targetProject ? `${targetProject.projectTitle} · ` : "";
  const targetBadges = targetProject ? [`作品：${targetProject.projectTitle}`] : [];

  if (firstDayStillBlocked) {
    return {
      visible: true,
      tone: "blocked",
      headline: "首日放行仍被阻塞",
      detail: `${targetLead}${taskQueueItem?.detail ?? "首日链路还没有完全通过总闸门。"} ${primary?.detail ?? "先补齐首日证据，再回到这里复查放行。"}`,
      primaryLabel: primary?.label ?? taskQueueItem?.actionLabel ?? "查看首日阻塞",
      primaryHref: primary?.href ?? taskQueueItem?.href ?? "/tasks",
      primaryAction: null,
      badges: [...targetBadges, "首日闸门未放行", "先补首日证据", "禁止直接批量"],
    };
  }

  if (smallBatchAction) {
    return {
      visible: true,
      tone: "ready",
      headline: "首日链路已放行，可以执行小批生产",
      detail: `${targetLead}首日派单已收口，先跑推荐小批验证质量、成本和路线稳定性。${smallBatchAction.detail}`,
      primaryLabel: smallBatchAction.label,
      primaryHref: smallBatchAction.href,
      primaryAction: smallBatchAction,
      badges: [...targetBadges, "首日链路通过", "一键小批生产", "执行后回总闸门复盘"],
    };
  }

  if (input.gate.status === "ready") {
    return {
      visible: true,
      tone: "ready",
      headline: "首日链路已放行",
      detail: `${targetLead}首日派单已收口，总闸门当前可放行。${primary?.detail ? `下一步：${primary.detail}` : "可以进入平台包导出、批量生产或发布复盘。"}`,
      primaryLabel: primary?.label ?? "进入发布闭环",
      primaryHref: primary?.href ?? "#gate-export-package",
      primaryAction: null,
      badges: [...targetBadges, "首日链路通过", "总闸门可放行", "进入批量前复查完成"],
    };
  }

  return {
    visible: true,
    tone: "review",
    headline: "首日链路已收口，仍需处理总闸门",
    detail: `${targetLead}首日派单已完成，但总闸门还有发布包、失败任务或批量策略提醒。${primary?.detail ? `优先处理：${primary.detail}` : input.gate.verdict}`,
    primaryLabel: primary?.label ?? "查看优先动作",
    primaryHref: primary?.href ?? "/gate",
    primaryAction: null,
    badges: [...targetBadges, "首日派单完成", "总闸门仍需复查", "处理后再放量"],
  };
}

function failureTaskToRunInput(task: FailureReviewTask): TaskRunInput {
  return {
    id: task.id,
    projectId: task.projectId,
    chapterId: task.chapterId ?? null,
    taskType: task.taskType,
    model: task.model,
    status: task.status,
    inputTokens: null,
    outputTokens: null,
    costUsd: null,
    errorMessage: task.errorMessage,
    inputSnapshot: "{}",
    createdAt: task.createdAt,
    updatedAt: task.createdAt,
    project: task.project ?? null,
    chapter: task.chapter ?? null,
    modelProvider: task.modelProvider ?? null,
  };
}

function failureGateStatus(batch: FailureRepairBatch): PrePublishGateItem["status"] {
  if (batch.status === "clear") return "pass";
  if (batch.status === "retry_sample") return "warn";
  return "block";
}

function failureRepairAction(batch: FailureRepairBatch): PrePublishGateAction | null {
  if (batch.status === "clear") return null;
  return action(
    "failure-repair-batch",
    batch.primaryActionLabel,
    `${batch.title}：${batch.detail}`,
    batch.primaryActionHref,
    batch.status === "retry_sample" ? "review" : "repair",
  );
}

function strategyRecommendationLabel(recommendation: PrePublishGateStrategyPlatform["recommendation"]) {
  if (recommendation === "scale") return "主推放大";
  if (recommendation === "repair") return "先修再投";
  if (recommendation === "collect_data") return "补齐证据";
  if (recommendation === "prepare_asset") return "先补资产";
  return "暂缓投放";
}

function buildStrategyPlatform(
  platformId: string,
  platformName: string,
  items: PrePublishGateProjectStatus[],
): PrePublishGateStrategyPlatform {
  const projectCount = items.length;
  const readyPackages = items.filter((item) => item.status === "ready").length;
  const weakPackages = items.filter((item) => item.effectReview.status === "weak" || item.loopTimeline.status === "needs_iteration").length;
  const scaleSignals = items.filter((item) => item.effectReview.status === "promising" || item.effectReview.status === "signed" || item.loopTimeline.status === "scaling").length;
  const dataGaps = items.filter((item) => item.effectReview.status === "empty" || item.loopTimeline.status === "needs_effect").length;
  const assetGaps = items.filter((item) => item.loopTimeline.status === "needs_asset" && item.effectReview.records === 0).length;
  const baselineGaps = items.filter((item) => item.loopTimeline.status === "needs_baseline" && item.effectReview.records === 0).length;
  const emptyPackages = items.filter((item) => item.status === "empty").length;
  const averagePreflight = projectCount > 0
    ? items.reduce((sum, item) => sum + item.preflightScore, 0) / projectCount
    : 0;
  const score = clampScore(
    averagePreflight
      + scaleSignals * 12
      + readyPackages * 5
      - weakPackages * 18
      - assetGaps * 10
      - baselineGaps * 8
      - dataGaps * 6
      - emptyPackages * 12,
  );
  const recommendation: PrePublishGateStrategyPlatform["recommendation"] = scaleSignals > 0 && weakPackages === 0 && assetGaps === 0
    ? "scale"
    : weakPackages > 0
      ? "repair"
      : assetGaps > 0
        ? "prepare_asset"
        : dataGaps > 0 || baselineGaps > 0
          ? "collect_data"
          : readyPackages === 0
            ? "pause"
            : "collect_data";
  const nextAction = recommendation === "scale"
    ? "保留有效包装，继续加更、复投，并记录下一轮真实数据。"
    : recommendation === "repair"
      ? "别急着扩量，先按弱项重写标题简介或前三章，再保存新基准。"
      : recommendation === "prepare_asset"
        ? "先生成并采纳投稿资产候选，别用默认包装硬投。"
        : recommendation === "collect_data"
          ? "先补发布包基准和投放回填，没有证据不要拍脑袋换平台。"
          : "先暂停投放，把正文、质检和基础发布包补齐。";
  const target = items.find((item) => (
    recommendation === "scale" && (item.effectReview.status === "promising" || item.effectReview.status === "signed" || item.loopTimeline.status === "scaling")
  ))
    ?? items.find((item) => recommendation === "repair" && (item.effectReview.status === "weak" || item.loopTimeline.status === "needs_iteration"))
    ?? items.find((item) => recommendation === "prepare_asset" && item.loopTimeline.status === "needs_asset")
    ?? items.find((item) => recommendation === "collect_data" && (item.loopTimeline.status === "needs_baseline" || item.loopTimeline.status === "needs_effect"))
    ?? items.find((item) => item.status !== "ready")
    ?? items[0];

  return {
    platformId,
    platformName,
    targetProjectId: target?.projectId ?? null,
    recommendation,
    actionType: recommendation === "prepare_asset"
      ? "generate_asset_variants"
      : recommendation === "repair"
        ? "rewrite_first_three"
        : recommendation === "collect_data" && target?.loopTimeline.status === "needs_baseline"
          ? "save_snapshot"
          : "open_target",
    label: strategyRecommendationLabel(recommendation),
    actionLabel: recommendation === "prepare_asset"
      ? "生成投稿方案"
      : recommendation === "repair"
        ? "重写前三章"
        : recommendation === "collect_data" && target?.loopTimeline.status === "needs_baseline"
          ? "保存基准"
          : recommendation === "scale"
            ? "打开加更"
            : "打开位置",
    score,
    projectCount,
    readyPackages,
    weakPackages,
    dataGaps,
    assetGaps,
    baselineGaps,
    nextAction,
    href: recommendation === "scale" && target
      ? `/projects/${target.projectId}#create-chapter`
      : target?.loopTimeline.actionHref ?? target?.href ?? "/projects",
    projects: items.slice(0, 4).map((item) => ({
      projectId: item.projectId,
      projectTitle: item.projectTitle,
      statusLabel: item.label,
      effectLabel: item.effectReview.label,
      loopLabel: item.loopTimeline.label,
      href: item.href,
    })),
  };
}

function buildStrategyReview(projectStatuses: PrePublishGateProjectStatus[]): PrePublishGateStrategyReview {
  const grouped = new Map<string, PrePublishGateProjectStatus[]>();
  for (const item of projectStatuses) {
    const key = `${item.platformId}:${item.platformName}`;
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }
  const platforms = [...grouped.entries()].map(([key, items]) => {
    const [platformId, platformName] = key.split(":");
    return buildStrategyPlatform(platformId, platformName, items);
  }).sort((left, right) => {
    const recommendationWeight: Record<PrePublishGateStrategyPlatform["recommendation"], number> = {
      scale: 5,
      repair: 4,
      collect_data: 3,
      prepare_asset: 2,
      pause: 1,
    };
    return recommendationWeight[right.recommendation] - recommendationWeight[left.recommendation]
      || right.score - left.score
      || right.projectCount - left.projectCount;
  });
  const totals = {
    scale: platforms.filter((item) => item.recommendation === "scale").length,
    repair: platforms.filter((item) => item.recommendation === "repair").length,
    collectData: platforms.filter((item) => item.recommendation === "collect_data").length,
    prepareAsset: platforms.filter((item) => item.recommendation === "prepare_asset").length,
    pause: platforms.filter((item) => item.recommendation === "pause").length,
  };
  const primary = platforms.find((item) => item.recommendation !== "pause") ?? platforms[0] ?? null;
  const headline = primary
    ? `${primary.platformName}：${primary.label}`
    : "还没有可复盘平台";
  const verdict = primary
    ? totals.scale > 0
      ? `${totals.scale} 个平台可以放大，${totals.repair} 个平台需要先修。`
      : totals.repair > 0
        ? `${totals.repair} 个平台存在弱转化，先修复再扩量。`
        : totals.collectData + totals.prepareAsset > 0
          ? `${totals.collectData + totals.prepareAsset} 个平台缺少资产、基准或真实效果证据。`
          : "平台策略暂无明确主推项，先补齐基础发布链路。"
    : "还没有项目进入平台复盘。";

  return {
    headline,
    verdict,
    primary,
    platforms,
    totals,
  };
}

export function buildPrePublishGate(input: PrePublishGateInput): PrePublishGate {
  const projects = input.projects;
  const queue = buildTaskQueueCenter(projects);
  const strategy = getBatchExecutionStrategy(input.batchStrategyId);
  const targetPlatformByProjectId = new Map(
    projects.map((project) => [
      project.id,
      getPlatformProfile(project.targetPlatform as PlatformId).name,
    ]),
  );
  const gateSafetyQueueItems = queue.items.filter((item) => (
    item.blockerType !== "publish_repair"
    || targetPlatformByProjectId.get(item.projectId) === item.platformName
  ));
  const safetyProjects = projects.map((project) => ({
    aiTasks: project.aiTasks.map((task) => ({
      status: task.status,
      inputTokens: task.inputTokens ?? null,
      outputTokens: task.outputTokens ?? null,
      costUsd: task.costUsd ?? null,
    })),
  }));
  const safety = buildBatchExecutionSafety(gateSafetyQueueItems, safetyProjects, strategy);
  const comparison = buildBatchStrategyComparison(gateSafetyQueueItems, safetyProjects, input.batchHistory ?? []);
  const decision = buildBatchStrategyDecision(comparison, strategy.id);
  const failureCenter = buildFailureReviewCenter(input.failureTasks ?? []);
  const failureRepairBatch = buildTaskRunConsole((input.failureTasks ?? []).map(failureTaskToRunInput)).failureRepairBatch;
  const projectStatuses = projects.map(projectStatus);
  const readyPackages = projectStatuses.filter((project) => project.status === "ready").length;
  const repairPackages = projectStatuses.filter((project) => project.status === "needs_repair").length;
  const emptyProjects = projectStatuses.filter((project) => project.status === "empty").length;
  const exportVersionBlockers = projectStatuses.filter((project) => project.exportVersionGate.status === "block");
  const exportVersionWarnings = projectStatuses.filter((project) => project.exportVersionGate.status === "warn");
  const acceptanceBlockers = projectStatuses.filter((project) => project.acceptanceSheetGate.status === "block");
  const acceptanceWarnings = projectStatuses.filter((project) => project.acceptanceSheetGate.status === "warn");
  const gateBlockingQueueItems = queue.items.filter((item) => {
    if (item.category !== "blocked") return false;
    if (item.blockerType !== "publish_repair") return true;
    return targetPlatformByProjectId.get(item.projectId) === item.platformName;
  });
  const runnableTasks = queue.items.filter((item) => (
    item.category === "draft" || item.category === "review" || item.category === "second_pass"
  )).length;
  const failedTasks = failureRepairBatch.summary.unresolvedFailures;
  const hasPublishableWork = projectStatuses.some((project) => project.publishableChapters > 0);
  const taskBlockers = gateBlockingQueueItems.length;
  const firstDayBlockers = queue.overview.firstDayBlocked + queue.overview.riskRecoveryBlocked + queue.overview.watchScaleBlocked;
  const queueBlockerDetail = gateBlockingQueueItems[0]
    ? `${gateBlockingQueueItems[0].actionLabel}：${gateBlockingQueueItems[0].evidence}`
    : null;
  const firstThreeAdoptionClosure = buildFirstThreeAdoptionClosure(projects);

  const items: PrePublishGateItem[] = [
    ...(input.modelRoleBlocker ? [gateItem({
      id: "model-roles",
      label: "模型岗位",
      status: input.modelRoleBlocker.tone === "blocked" ? "block" as const : "warn" as const,
      detail: input.modelRoleBlocker.detail,
      actionLabel: input.modelRoleBlocker.actionLabel,
      href: input.modelRoleBlocker.actionHref,
    })] : []),
    gateItem({
      id: "publish-package",
      label: "发布包",
      status: readyPackages > 0 ? (repairPackages > 0 || emptyProjects > 0 ? "warn" : "pass") : "block",
      detail: readyPackages > 0
        ? `${readyPackages} 个项目可发布，${repairPackages} 个项目仍需修复，${emptyProjects} 个项目暂无正文。`
        : hasPublishableWork
          ? "已有正文，但还没有项目通过平台发布质检。"
          : "还没有可发布正文，先完成章节初稿和前三章质检。",
      actionLabel: readyPackages > 0 ? "查看可发布项目" : "处理发布质检",
      href: projectStatuses.find((project) => project.status !== "ready")?.href ?? projectStatuses[0]?.href ?? "/projects",
    }),
    gateItem({
      id: "project-acceptance",
      label: "项目验收单",
      status: acceptanceBlockers.length > 0 ? "block" : acceptanceWarnings.length > 0 ? "warn" : "pass",
      detail: acceptanceBlockers.length > 0
        ? `${acceptanceBlockers.length} 个项目卡在单本作品验收单。下一条：${acceptanceBlockers[0].acceptanceSheetGate.detail}`
        : acceptanceWarnings.length > 0
          ? `${acceptanceWarnings.length} 个项目已到发布包验收，先确认平台包再放量。`
          : "单本作品验收单没有发现阻塞。",
      actionLabel: acceptanceBlockers[0]?.acceptanceSheetGate.actionLabel ?? acceptanceWarnings[0]?.acceptanceSheetGate.actionLabel ?? "查看作品验收",
      href: acceptanceBlockers[0]?.acceptanceSheetGate.href ?? acceptanceWarnings[0]?.acceptanceSheetGate.href ?? "/projects#pipeline-projects",
    }),
    gateItem({
      id: "task-queue",
      label: "任务队列",
      status: taskBlockers > 0 ? "block" : runnableTasks > 0 ? "warn" : "pass",
      detail: taskBlockers > 0
        ? `${taskBlockers} 个阻塞项挡住生产链路。${firstDayBlockers > 0 ? `其中 ${firstDayBlockers} 个来自首日闸门或观察闸门。` : ""}${queueBlockerDetail ? ` ${queueBlockerDetail}` : ""}`
        : runnableTasks > 0
          ? `${runnableTasks} 个任务可继续处理，发布前建议先跑完关键审稿和二改。`
          : readyPackages > 0
            ? "只剩可导出的发布包，不需要再跑生产任务。"
            : "当前没有待处理生产任务。",
      actionLabel: taskBlockers > 0 || runnableTasks > 0 ? "打开任务队列" : "查看任务队列",
      href: "/tasks",
    }),
    buildFirstThreeAdoptionGateItem(firstThreeAdoptionClosure),
    gateItem({
      id: "export-version",
      label: "导出版本",
      status: exportVersionBlockers.length > 0 ? "block" : exportVersionWarnings.length > 0 ? "warn" : "pass",
      detail: exportVersionBlockers.length > 0
        ? `${exportVersionBlockers.length} 个项目的导出版本存在回退风险，不能直接进入最终发布。`
        : exportVersionWarnings.length > 0
          ? `${exportVersionWarnings.length} 个项目的导出版本需要处理基准、替换或观察提醒。`
          : "导出版本没有发现回退风险。",
      actionLabel: exportVersionBlockers.length > 0
        ? exportVersionBlockers[0].exportVersionGate.actionLabel
        : exportVersionWarnings.length > 0
          ? exportVersionWarnings[0].exportVersionGate.actionLabel
          : "查看版本中心",
      href: exportVersionBlockers[0]?.exportVersionGate.href ?? exportVersionWarnings[0]?.exportVersionGate.href ?? "/projects",
    }),
    gateItem({
      id: "ai-failures",
      label: "失败复盘",
      status: failureGateStatus(failureRepairBatch),
      detail: failedTasks > 0
        ? failureRepairBatch.detail
        : "近期没有失败任务记录。",
      actionLabel: failedTasks > 0 ? failureRepairBatch.primaryActionLabel : "查看复盘",
      href: failedTasks > 0 ? failureRepairBatch.primaryActionHref : "/failures",
    }),
    gateItem({
      id: "batch-safety",
      label: "批量策略",
      status: runnableTasks === 0 ? "pass" : taskBlockers > 0 ? "warn" : decision.status === "blocked" ? "block" : decision.status === "switch_strategy" ? "warn" : "pass",
      detail: runnableTasks === 0
        ? "无需批量执行，生产队列已清空。"
        : taskBlockers > 0
          ? `${taskBlockers} 个阻塞项还在队列里，批量前先拆开处理；${decision.title}。`
        : `${decision.title}。${safety.warnings[0]}`,
      actionLabel: runnableTasks === 0 ? "查看策略" : decision.actionLabel,
      href: runnableTasks === 0 ? "/tasks" : decision.actionHref,
    }),
  ];

  const blockCount = items.filter((item) => item.status === "block").length;
  const warnCount = items.filter((item) => item.status === "warn").length;
  const strategyReview = buildStrategyReview(projectStatuses);
  const averagePreflight = projectStatuses.length > 0
    ? projectStatuses.reduce((sum, project) => sum + project.preflightScore, 0) / projectStatuses.length
    : 0;
  const score = clampScore(averagePreflight - blockCount * 12 - warnCount * 5);
  const status: PrePublishGate["status"] = blockCount > 0 ? "blocked" : warnCount > 0 ? "needs_repair" : "ready";
  const label = status === "ready" ? "可以发布" : status === "needs_repair" ? "先修再发" : "暂不发布";
  const headline = status === "ready"
    ? "总闸门通过，可以进入平台包导出。"
    : status === "needs_repair"
      ? "已经有可发布资产，但发布前仍建议清理提醒项。"
      : "总闸门拦截：先处理发布包、失败任务或阻塞队列。";
  const verdict = status === "ready"
    ? "发布包、任务队列、失败复盘和批量策略均已通过。"
    : status === "needs_repair"
      ? "有项目已经能投，但仍存在未处理提醒；先按优先动作走一轮。"
      : "当前发布会把未修复风险带到平台，先完成阻塞项再放行。";
  const priorityActions = uniqueActions([
    input.modelRoleBlocker
      ? action(
        "model-roles",
        input.modelRoleBlocker.actionLabel,
        input.modelRoleBlocker.detail,
        input.modelRoleBlocker.actionHref,
        input.modelRoleBlocker.tone === "blocked" ? "repair" : "review",
      )
      : null,
    ...acceptanceBlockers.map((project) => action(
      `project-acceptance:${project.projectId}`,
      project.acceptanceSheetGate.actionLabel,
      `${project.acceptanceSheetGate.detail} ${project.acceptanceSheetGate.executionHint}`,
      project.acceptanceSheetGate.href,
      "repair",
      project.acceptanceSheetGate.execution,
    )),
    ...firstThreeAdoptionPriorityActions(firstThreeAdoptionClosure),
    ...projectStatuses
      .filter((project) => project.status !== "ready")
      .map((project) => action(
        project.exportVersionGate.status === "block" ? `export-version:${project.projectId}` : `repair:${project.projectId}`,
        project.nextAction,
        project.exportVersionGate.status === "block"
          ? `${project.projectTitle} · ${project.exportVersionGate.label} · ${project.exportVersionGate.detail}`
          : `${project.projectTitle} · ${project.platformName} · ${project.finalGateLabel}`,
        project.href,
        "repair",
        project.execution,
      )),
    failureRepairAction(failureRepairBatch),
    ...failureRepairBatch.items
      .filter((item) => item.directRetrySupported)
      .slice(0, 2)
      .map((item) => action(
        `repair-batch-retry:${item.id}`,
        item.actionLabel,
        `${item.projectTitle} · ${item.chapterTitle} · ${item.retryReason}`,
        item.href,
        "review",
        { type: "retry_task", taskId: item.id },
      )),
    ...failureCenter.recentFailures
      .filter((failure) => failure.retryable)
      .slice(0, 2)
      .map((failure) => action(
        `retry:${failure.id}`,
        "一键重试失败任务",
        `${failure.projectTitle} · ${failure.chapterTitle} · ${failure.categoryLabel}`,
        failure.href,
        "review",
        { type: "retry_task", taskId: failure.id },
      )),
    ...failureCenter.nextActions.map((detail, index) => action(`failure:${index}`, "处理失败复盘", detail, "/failures", "review")),
    (gateBlockingQueueItems[0] ?? queue.recommendedNext)
      ? action(
        "queue:next",
        (gateBlockingQueueItems[0] ?? queue.recommendedNext)?.actionLabel ?? "打开任务队列",
        `${(gateBlockingQueueItems[0] ?? queue.recommendedNext)?.projectTitle ?? "任务队列"} · ${(gateBlockingQueueItems[0] ?? queue.recommendedNext)?.chapterTitle ?? "下一步"} · ${(gateBlockingQueueItems[0] ?? queue.recommendedNext)?.evidence ?? "继续处理队列任务。"}`,
        (gateBlockingQueueItems[0] ?? queue.recommendedNext)?.href ?? "/tasks",
      )
      : null,
    runnableTasks > 0
      ? action(
        "strategy",
        decision.actionLabel,
        decision.detail,
        decision.actionHref,
        decision.canRun ? "primary" : "repair",
        decision.canRun ? { type: "recommended_batch", strategyId: decision.strategyId } : null,
      )
      : null,
    ...projectStatuses
      .filter((project) => project.status === "ready")
      .map((project) => action(`export:${project.projectId}`, "导出平台发布包", `${project.projectTitle} · ${project.platformName} 已通过发布质检。`, project.href, "primary")),
  ].filter((item): item is PrePublishGateAction => Boolean(item)));
  const releaseAction = buildReleaseAction(status, projectStatuses, priorityActions);

  return {
    status,
    label,
    headline,
    verdict,
    score,
    overview: {
      totalProjects: projects.length,
      readyPackages,
      repairPackages,
      emptyProjects,
      runnableTasks,
      blockedTasks: taskBlockers,
      publishBlocked: gateBlockingQueueItems.filter((item) => item.blockerType === "publish_repair").length,
      failureTasks: failedTasks,
      retryableFailures: failureRepairBatch.summary.retryableFailures,
      canRunBatch: safety.canRunRecommendedBatch,
    },
    items,
    failureRepairBatch,
    projectStatuses,
    strategyReview,
    firstThreeAdoptionClosure,
    priorityActions,
    releaseAction,
    pmFocus: buildPrePublishGatePmFocus(status, releaseAction),
  };
}
