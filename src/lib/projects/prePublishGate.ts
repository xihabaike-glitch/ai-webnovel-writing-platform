import { buildFailureReviewCenter, type FailureReviewTask } from "../ai/failureReviewCenter.ts";
import type { TaskBatchHistoryItem } from "../ai/taskBatchHistory.ts";
import { getPlatformProfile, type PlatformId } from "../platforms/platformProfiles.ts";
import { buildBatchExecutionSafety } from "./batchExecutionSafety.ts";
import { getBatchExecutionStrategy, type BatchExecutionStrategyId } from "./batchExecutionStrategy.ts";
import { buildBatchStrategyComparison, buildBatchStrategyDecision } from "./batchStrategyComparison.ts";
import {
  buildPlatformPublishExportCenter,
  type PlatformPublishEffectSummary,
  type PlatformPublishMetricInput,
  type PlatformPublishOptimizationAction,
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
  platformPublishMetrics?: PlatformPublishMetricInput[];
}

export interface PrePublishGateEffectAction {
  id: string;
  priority: PlatformPublishOptimizationAction["priority"];
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
}

export interface PrePublishGateItem {
  id: string;
  label: string;
  status: "pass" | "warn" | "block";
  detail: string;
  actionLabel: string;
  href: string;
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
  projectStatuses: PrePublishGateProjectStatus[];
  priorityActions: PrePublishGateAction[];
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

function actionHref(projectId: string, action: PublishRepairAction) {
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
      label: action.label,
      detail: action.detail,
      target: action.target,
      href: projectAnchor(projectId, action.href),
    })),
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
  const projectStatuses = projects.map(projectStatus);
  const readyPackages = projectStatuses.filter((project) => project.status === "ready").length;
  const repairPackages = projectStatuses.filter((project) => project.status === "needs_repair").length;
  const emptyProjects = projectStatuses.filter((project) => project.status === "empty").length;
  const runnableTasks = queue.items.filter((item) => item.category !== "blocked" && item.category !== "export").length;
  const failedTasks = failureCenter.summary.totalFailures;
  const nonRetryableFailures = failedTasks - failureCenter.summary.retryableFailures;
  const hasPublishableWork = projectStatuses.some((project) => project.publishableChapters > 0);
  const taskBlockers = queue.overview.publishBlocked + queue.overview.chapterCardBlocked;

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
        ? `${taskBlockers} 个阻塞项挡住生产链路。`
        : runnableTasks > 0
          ? `${runnableTasks} 个任务可继续处理，发布前建议先跑完关键审稿和二改。`
          : readyPackages > 0
            ? "只剩可导出的发布包，不需要再跑生产任务。"
            : "当前没有待处理生产任务。",
      actionLabel: taskBlockers > 0 || runnableTasks > 0 ? "打开任务队列" : "查看任务队列",
      href: "/tasks",
    }),
    gateItem({
      id: "ai-failures",
      label: "失败复盘",
      status: nonRetryableFailures > 0 ? "block" : failedTasks > 0 ? "warn" : "pass",
      detail: failedTasks > 0
        ? `${failedTasks} 个失败任务，其中 ${failureCenter.summary.retryableFailures} 个可重试。`
        : "近期没有失败任务记录。",
      actionLabel: failedTasks > 0 ? "处理失败任务" : "查看复盘",
      href: "/failures",
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
      ? action("queue:next", queue.recommendedNext.actionLabel, `${queue.recommendedNext.projectTitle} · ${queue.recommendedNext.chapterTitle}`, queue.recommendedNext.href)
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
      retryableFailures: failureCenter.summary.retryableFailures,
      canRunBatch: safety.canRunRecommendedBatch,
    },
    items,
    projectStatuses,
    priorityActions,
  };
}
