import { buildFailureReviewCenter, type FailureReviewTask } from "../ai/failureReviewCenter.ts";
import type { TaskBatchHistoryItem } from "../ai/taskBatchHistory.ts";
import { buildTaskRunConsole, type FailureRepairBatch, type TaskRunInput } from "../ai/taskRunConsole.ts";
import { buildExportSnapshotHistory } from "../export/snapshots.ts";
import { buildExportVersionCenter } from "../export/versionCenter.ts";
import { getPlatformProfile, type PlatformId } from "../platforms/platformProfiles.ts";
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
import { buildTaskQueueCenter } from "./taskQueueCenter.ts";

export interface PrePublishGateProject {
  id: string;
  title: string;
  targetPlatform: string;
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
  exportVersionGate: PrePublishGateExportVersionGate;
  effectReview: PrePublishGateEffectReview;
  loopTimeline: PrePublishGateLoopTimeline;
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
  type: "review" | "publish_check" | "other";
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

export type PrePublishGateAdoptionTimelineStepType = "adopted" | "review" | "publish_check" | "release";
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
}

export interface PrePublishGateFocusNotice {
  visible: boolean;
  tone: "ready" | "blocked" | "review";
  headline: string;
  detail: string;
  primaryLabel: string;
  primaryHref: string;
  badges: string[];
}

export interface PrePublishGateInput {
  projects: PrePublishGateProject[];
  failureTasks?: FailureReviewTask[];
  batchHistory?: TaskBatchHistoryItem[];
  batchStrategyId?: BatchExecutionStrategyId | string;
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function gateItem(input: PrePublishGateItem): PrePublishGateItem {
  return input;
}

type PrePublishGateDispatchTask = NonNullable<PrePublishGateProject["gateDispatchTasks"]>[number];

function isFirstThreeAdoptionFollowup(task: PrePublishGateDispatchTask) {
  return task.dispatchKey.startsWith("first-three-adoption:");
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
  if (task.dispatchKey.endsWith(":publish-check")) return "publish_check";
  return "other";
}

function firstThreeFollowupLabel(type: PrePublishGateAdoptionFollowupItem["type"]) {
  if (type === "review") return "重新审稿";
  if (type === "publish_check") return "发布质检";
  return "后续任务";
}

function parseFirstThreeAdoptionDispatchKey(dispatchKey: string) {
  const parts = dispatchKey.split(":");
  if (parts.length < 5 || parts[0] !== "first-three-adoption") {
    return { chapterId: null, revisionId: null };
  }
  return {
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
    const key = `${item.projectId}:${item.chapterId ?? "unknown"}:${item.revisionId ?? "unknown"}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return [...groups.entries()].map(([id, group]) => {
    const first = group[0];
    const review = group.find((item) => item.type === "review") ?? null;
    const publish = group.find((item) => item.type === "publish_check") ?? null;
    const projectHref = `/projects/${first.projectId}`;
    const releaseStatus: PrePublishGateAdoptionTimelineStepStatus = review?.status === "pass" && publish?.status === "pass"
      ? "pass"
      : review?.status === "warn" || publish?.status === "warn"
        ? "warn"
        : "waiting";
    const releaseDetail = releaseStatus === "pass"
      ? "重新审稿和发布质检都已回填，可以回到总闸门判断发布放行。"
      : releaseStatus === "warn"
        ? "存在缺证据的闭环任务，补齐验收证据后再判断发布放行。"
        : "等待重新审稿和发布质检全部闭合后，再判断发布放行。";
    const steps: PrePublishGateAdoptionTimelineStep[] = [
      {
        id: `${id}:adopted`,
        type: "adopted",
        label: "候选已采纳",
        status: "pass",
        followupItemId: null,
        detail: "前三章候选已经写入正文，旧审稿与旧发布质检自动过期。",
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
      firstThreeAdoptionTimelineStep({
        id: `${id}:publish-check`,
        type: "publish_check",
        label: "发布质检",
        item: publish,
        fallbackStatus: review?.status === "pass" ? "block" : "waiting",
        detail: review?.status === "pass" ? "重新审稿已完成，等待刷新发布质检。" : "先完成采纳后重新审稿，再回发布质检。",
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
      label: `${first.projectTitle} · ${review?.title ?? publish?.title ?? "前三章采纳"}`,
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
  if (item.type === "publish_check") {
    return "采纳后的前三章会改变标题、简介、标签和兑现判断。重新审稿后刷新发布质检，避免拿旧包装去投平台。";
  }
  return item.detail || "采纳后的后续任务没有闭合，发布前需要处理。";
}

function firstThreeAdoptionRepairPriority(item: PrePublishGateAdoptionFollowupItem) {
  const statusWeight = item.status === "block" ? 20 : item.status === "warn" ? 10 : 0;
  const typeWeight = item.type === "review" ? 78 : item.type === "publish_check" ? 70 : 58;
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
      actionLabel: task.actionLabel ?? (type === "publish_check" ? "回发布质检" : "重新审稿"),
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
      ? `${affectedProjects} 个项目有前三章采纳后续未闭环：${reviewPending} 个待重新审稿，${publishPending} 个待发布质检。正文变更后不能沿用旧审稿。`
    : missingEvidenceItems.length > 0
      ? `${missingEvidenceItems.length} 个采纳后续任务已完成但缺少验收证据，发布前补齐证据。`
      : followups.length > 0
        ? `已验收 ${followups.length} 个采纳后续任务，其中 ${receiptEvidenceItems.length} 个来自任务中心批量回执；重新审稿和发布质检都已回填。`
        : "当前没有未闭环的前三章采纳后续任务。";
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
  const ready = publishableChapters > 0 && pack.canExport && pack.finalGate.status === "ready_to_submit" && !exportVersionBlocked;
  const empty = publishableChapters === 0;
  const nextAction = exportVersionBlocked
    ? exportVersionGate.actionLabel
    : ready
      ? "导出平台发布包"
      : nextRepairAction?.label ?? pack.finalGate.nextAction ?? "回到项目工作台补齐发布资料";
  const href = exportVersionBlocked
    ? exportVersionGate.href
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
    blockedCount: pack.preflight.blocked.length + pack.finalGate.blockers.length + (exportVersionGate.status === "block" ? 1 : 0),
    warningCount: pack.warnings.length + pack.preflight.warnings.length + (exportVersionGate.status === "warn" ? 1 : 0),
    nextAction,
    href,
    downloadHref: ready ? `/api/projects/${project.id}/platform-export?format=markdown&platformId=${pack.platformId}` : null,
    execution: exportVersionBlocked ? null : nextRepairAction ? publishRepairExecution(project.id, nextRepairAction) : null,
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
  }).slice(0, 6);
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
    ? priorityActions.find((item) => item.id.startsWith("export-version:"))
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

export function buildPrePublishGateFocusNotice(input: {
  focus?: string | null;
  gate: PrePublishGate;
}): PrePublishGateFocusNotice {
  if (input.focus !== "first-day-complete") {
    return {
      visible: false,
      tone: "review",
      headline: "",
      detail: "",
      primaryLabel: "",
      primaryHref: "",
      badges: [],
    };
  }

  const taskQueueItem = input.gate.items.find((item) => item.id === "task-queue") ?? null;
  const firstDayStillBlocked = taskQueueItem?.status === "block"
    && /首日|观察闸门|交接证据/u.test(taskQueueItem.detail);
  const primary = input.gate.releaseAction ?? input.gate.priorityActions[0] ?? null;

  if (firstDayStillBlocked) {
    return {
      visible: true,
      tone: "blocked",
      headline: "首日放行仍被阻塞",
      detail: `${taskQueueItem?.detail ?? "首日链路还没有完全通过总闸门。"} ${primary?.detail ?? "先补齐首日证据，再回到这里复查放行。"}`,
      primaryLabel: primary?.label ?? taskQueueItem?.actionLabel ?? "查看首日阻塞",
      primaryHref: primary?.href ?? taskQueueItem?.href ?? "/tasks",
      badges: ["首日闸门未放行", "先补首日证据", "禁止直接批量"],
    };
  }

  if (input.gate.status === "ready") {
    return {
      visible: true,
      tone: "ready",
      headline: "首日链路已放行",
      detail: `首日派单已收口，总闸门当前可放行。${primary?.detail ? `下一步：${primary.detail}` : "可以进入平台包导出、批量生产或发布复盘。"}`,
      primaryLabel: primary?.label ?? "进入发布闭环",
      primaryHref: primary?.href ?? "#gate-export-package",
      badges: ["首日链路通过", "总闸门可放行", "进入批量前复查完成"],
    };
  }

  return {
    visible: true,
    tone: "review",
    headline: "首日链路已收口，仍需处理总闸门",
    detail: `首日派单已完成，但总闸门还有发布包、失败任务或批量策略提醒。${primary?.detail ? `优先处理：${primary.detail}` : input.gate.verdict}`,
    primaryLabel: primary?.label ?? "查看优先动作",
    primaryHref: primary?.href ?? "/gate",
    badges: ["首日派单完成", "总闸门仍需复查", "处理后再放量"],
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
  const safetyProjects = projects.map((project) => ({
    aiTasks: project.aiTasks.map((task) => ({
      status: task.status,
      inputTokens: task.inputTokens ?? null,
      outputTokens: task.outputTokens ?? null,
      costUsd: task.costUsd ?? null,
    })),
  }));
  const safety = buildBatchExecutionSafety(queue.items, safetyProjects, strategy);
  const comparison = buildBatchStrategyComparison(queue.items, safetyProjects, input.batchHistory ?? []);
  const decision = buildBatchStrategyDecision(comparison, strategy.id);
  const failureCenter = buildFailureReviewCenter(input.failureTasks ?? []);
  const failureRepairBatch = buildTaskRunConsole((input.failureTasks ?? []).map(failureTaskToRunInput)).failureRepairBatch;
  const projectStatuses = projects.map(projectStatus);
  const readyPackages = projectStatuses.filter((project) => project.status === "ready").length;
  const repairPackages = projectStatuses.filter((project) => project.status === "needs_repair").length;
  const emptyProjects = projectStatuses.filter((project) => project.status === "empty").length;
  const exportVersionBlockers = projectStatuses.filter((project) => project.exportVersionGate.status === "block");
  const exportVersionWarnings = projectStatuses.filter((project) => project.exportVersionGate.status === "warn");
  const runnableTasks = queue.items.filter((item) => (
    item.category === "draft" || item.category === "review" || item.category === "second_pass"
  )).length;
  const failedTasks = failureRepairBatch.summary.unresolvedFailures;
  const hasPublishableWork = projectStatuses.some((project) => project.publishableChapters > 0);
  const taskBlockers = queue.overview.blockedCards;
  const firstDayBlockers = queue.overview.firstDayBlocked + queue.overview.riskRecoveryBlocked + queue.overview.watchScaleBlocked;
  const queueBlockerDetail = queue.recommendedNext?.category === "blocked"
    ? `${queue.recommendedNext.actionLabel}：${queue.recommendedNext.evidence}`
    : null;
  const firstThreeAdoptionClosure = buildFirstThreeAdoptionClosure(projects);

  const items: PrePublishGateItem[] = [
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
    queue.recommendedNext
      ? action("queue:next", queue.recommendedNext.actionLabel, `${queue.recommendedNext.projectTitle} · ${queue.recommendedNext.chapterTitle} · ${queue.recommendedNext.evidence}`, queue.recommendedNext.href)
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
      blockedTasks: queue.overview.blockedCards,
      publishBlocked: queue.overview.publishBlocked,
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
  };
}
