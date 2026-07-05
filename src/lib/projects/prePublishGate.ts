import { buildFailureReviewCenter, type FailureReviewTask } from "../ai/failureReviewCenter.ts";
import type { TaskBatchHistoryItem } from "../ai/taskBatchHistory.ts";
import { buildTaskRunConsole, type FailureRepairBatch, type TaskRunInput } from "../ai/taskRunConsole.ts";
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
  publishSnapshots?: PublishPackageVersionItem[];
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
  effectReview: PrePublishGateEffectReview;
  loopTimeline: PrePublishGateLoopTimeline;
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

export interface PrePublishGateAdoptionClosure {
  status: PrePublishGateItem["status"];
  label: string;
  detail: string;
  total: number;
  completed: number;
  pending: number;
  missingEvidence: number;
  reviewPending: number;
  publishPending: number;
  items: PrePublishGateAdoptionFollowupItem[];
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

function buildFirstThreeAdoptionClosure(projects: PrePublishGateProject[]): PrePublishGateAdoptionClosure {
  const followups = firstThreeAdoptionFollowups(projects);
  const items = followups.map(({ project, task }): PrePublishGateAdoptionFollowupItem => {
    const type = firstThreeFollowupType(task);
    const keyParts = parseFirstThreeAdoptionDispatchKey(task.dispatchKey);
    const missingEvidence = task.state === "completed" && task.completionEvidence.trim().length < 8;
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
      status: task.state !== "completed" ? "block" : missingEvidence ? "warn" : "pass",
      state: task.state,
      detail: task.detail ?? "采纳后的正文需要重新审稿并刷新发布质检。",
      evidence: task.completionEvidence,
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
  const reviewPending = pendingItems.filter((item) => item.type === "review").length;
  const publishPending = pendingItems.filter((item) => item.type === "publish_check").length;
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
        ? `已验收 ${followups.length} 个采纳后续任务，重新审稿和发布质检都已回填。`
        : "当前没有未闭环的前三章采纳后续任务。";

  return {
    status,
    label: status === "pass" ? "采纳闭环通过" : status === "warn" ? "采纳闭环缺证据" : "采纳闭环阻塞",
    detail,
    total: items.length,
    completed: items.filter((item) => item.status === "pass").length,
    pending: pendingItems.length,
    missingEvidence: missingEvidenceItems.length,
    reviewPending,
    publishPending,
    items,
  };
}

function buildFirstThreeAdoptionGateItem(closure: PrePublishGateAdoptionClosure) {
  const firstAction = closure.items.find((item) => item.status === "block")
    ?? closure.items.find((item) => item.status === "warn")
    ?? null;
  return gateItem({
    id: "first-three-adoption-loop",
    label: "采纳闭环",
    status: closure.status,
    detail: closure.detail,
    actionLabel: closure.pending > 0
      ? firstAction?.actionLabel ?? "处理采纳后续"
      : closure.missingEvidence > 0
        ? "补验收证据"
        : "查看闭环",
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
  const ready = publishableChapters > 0 && pack.canExport && pack.finalGate.status === "ready_to_submit";
  const empty = publishableChapters === 0;

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
    blockedCount: pack.preflight.blocked.length + pack.finalGate.blockers.length,
    warningCount: pack.warnings.length + pack.preflight.warnings.length,
    nextAction: ready
      ? "导出平台发布包"
      : nextRepairAction?.label ?? pack.finalGate.nextAction ?? "回到项目工作台补齐发布资料",
    href: nextRepairAction ? actionHref(project.id, nextRepairAction) : `/projects/${project.id}#platform-export`,
    downloadHref: ready ? `/api/projects/${project.id}/platform-export?format=markdown&platformId=${pack.platformId}` : null,
    execution: nextRepairAction ? publishRepairExecution(project.id, nextRepairAction) : null,
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

function firstThreeAdoptionPriorityActions(projects: PrePublishGateProject[]) {
  return firstThreeAdoptionFollowups(projects)
    .filter(({ task }) => task.state !== "completed")
    .slice(0, 4)
    .map(({ project, task }) => action(
      `adoption-followup:${task.dispatchKey}`,
      task.actionLabel ?? (task.dispatchKey.endsWith(":publish-check") ? "回发布质检" : "重新审稿"),
      `${project.title} · ${task.title ?? "前三章采纳后续"} · ${task.detail ?? "采纳后的正文需要重新审稿并刷新发布质检。"}`,
      firstThreeFollowupHref(project.id, task),
      "repair",
    ));
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
    ? priorityActions.find((item) => item.id === "queue:next")
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
  const runnableTasks = queue.items.filter((item) => item.category !== "blocked" && item.category !== "export").length;
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
    ...firstThreeAdoptionPriorityActions(projects),
    ...projectStatuses
      .filter((project) => project.status !== "ready")
      .map((project) => action(
        `repair:${project.projectId}`,
        project.nextAction,
        `${project.projectTitle} · ${project.platformName} · ${project.finalGateLabel}`,
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
