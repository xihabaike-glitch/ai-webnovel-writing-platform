import { buildBatchDraftQueue } from "../ai/batchDrafts.ts";
import { buildReviewPipelineQueue } from "../ai/batchReviewPipeline.ts";
import { getChapterRevisionSourceLabel, isChapterRevisionCandidate, previewRevisionContent } from "../chapters/revisions.ts";
import { getPlatformProfile, type PlatformId } from "../platforms/platformProfiles.ts";
import { buildFirstDayRiskProfile, type FirstDayRiskLevel } from "./firstDayWorkflow.ts";
import {
  buildPlatformPublishExportCenter,
  type PlatformPublishMetricInput,
  type PlatformSubmissionAssetInput,
  type PlatformSubmissionAssetVersionInput,
  type PublishPackageVersionItem,
} from "./platformPublishExport.ts";
import { findProjectStartTacticSummary, type ProjectStartTacticEntryLike, type ProjectStartTacticSummary } from "./projectStartTactics.ts";

export interface TaskQueueProject {
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
    revisions?: Array<{
      id: string;
      source: string;
      sourceTaskId: string | null;
      title: string;
      content: string;
      wordCount: number;
      notes: string;
      createdAt: Date | string;
    }>;
  }>;
  aiTasks: Array<{
    id: string;
    chapterId: string | null;
    taskType: string;
    status: string;
    outputText: string | null;
    errorMessage: string | null;
    createdAt: Date | string;
  }>;
  worldEntries?: ProjectStartTacticEntryLike[];
  gateDispatchTasks?: Array<{
    dispatchKey: string;
    state: string;
    completionEvidence: string;
    stage?: string;
    title?: string;
    detail?: string;
    actionLabel?: string;
    href?: string;
  }>;
  publishSnapshots?: PublishPackageVersionItem[];
  submissionAssets?: PlatformSubmissionAssetInput[];
  submissionAssetVersions?: PlatformSubmissionAssetVersionInput[];
  platformPublishMetrics?: PlatformPublishMetricInput[];
  gateActionAudits?: Array<{
    actionId: string;
    executionType: string;
    status: string;
    succeededCount: number;
    taskId?: string | null;
    platformId: string;
    createdAt: Date | string;
  }>;
}

export type QueueScaleGate = "none" | "sample_only" | "cleared";

export interface QueueHandoffGuidance {
  label: string;
  detail: string | null;
  firstDayActions: string[];
  avoidRules: string[];
  evidence: string[];
}

export interface QueueItem {
  id: string;
  projectId: string;
  projectTitle: string;
  platformName: string;
  category: "candidate" | "draft" | "review" | "second_pass" | "effect" | "export" | "blocked";
  blockerType: "chapter_card" | "publish_repair" | "risk_recovery" | "watch_scale_gate" | "first_day_gate" | null;
  label: string;
  chapterTitle: string;
  evidence: string;
  strategyBasis?: ProjectStartTacticSummary | null;
  handoffGuidance?: QueueHandoffGuidance | null;
  riskLevel: FirstDayRiskLevel;
  riskLabel: string;
  riskNotice: string | null;
  scaleGate: QueueScaleGate;
  actionLabel: string;
  href: string;
  priority: number;
  effectAction?: {
    platformId: string;
    execution: "generate_asset_variants" | "rewrite_first_three" | "open_target";
    actionId: string;
  } | null;
}

export interface TaskQueueCenter {
  overview: {
    totalItems: number;
    candidateReady: number;
    draftReady: number;
    reviewReady: number;
    secondPassReady: number;
    effectReady: number;
    exportReady: number;
    blockedCards: number;
    firstDayBlocked: number;
    publishBlocked: number;
    chapterCardBlocked: number;
    riskRecoveryBlocked: number;
    watchScaleBlocked: number;
    watchItems: number;
    watchSampleOnly: number;
    watchCleared: number;
  };
  items: QueueItem[];
  recommendedNext: QueueItem | null;
}

type PublishEffectQueueExecution = NonNullable<QueueItem["effectAction"]>["execution"];

const categoryPriority: Record<QueueItem["category"], number> = {
  candidate: 5,
  review: 10,
  second_pass: 20,
  draft: 30,
  effect: 35,
  export: 40,
  blocked: 90,
};

function blockerPriority(blockerType: QueueItem["blockerType"]) {
  if (blockerType === "first_day_gate") return 0;
  if (blockerType === "risk_recovery") return 1;
  if (blockerType === "watch_scale_gate") return 2;
  if (blockerType === "publish_repair") return 3;
  if (blockerType === "chapter_card") return 4;
  return 9;
}

export function recommendedQueueActionLabel(entry: QueueItem | null) {
  if (!entry) return null;
  return `下一步：${entry.actionLabel}`;
}

function categoryLabel(category: QueueItem["category"]) {
  const labels: Record<QueueItem["category"], string> = {
    candidate: "待采纳",
    draft: "待生成",
    review: "待审稿",
    second_pass: "待二改",
    effect: "待复盘",
    export: "待导出",
    blocked: "卡住",
  };
  return labels[category];
}

function buildHandoffGuidance(startTactic: ProjectStartTacticSummary | null): QueueHandoffGuidance | null {
  if (!startTactic) return null;
  const firstDayActions = (startTactic.firstDayActions ?? []).filter(Boolean);
  const avoidRules = (startTactic.avoidRules ?? []).filter(Boolean);
  const evidence = (startTactic.handoffEvidence ?? []).filter(Boolean);
  if (!startTactic.handoffLabel && !startTactic.handoffDetail && firstDayActions.length === 0 && avoidRules.length === 0 && evidence.length === 0) {
    return null;
  }

  return {
    label: startTactic.handoffLabel ?? startTactic.label,
    detail: startTactic.handoffDetail ?? null,
    firstDayActions,
    avoidRules,
    evidence,
  };
}

function item(input: Omit<QueueItem, "label" | "priority" | "blockerType" | "riskLevel" | "riskLabel" | "riskNotice" | "scaleGate"> & {
  blockerType?: QueueItem["blockerType"];
  riskLevel?: QueueItem["riskLevel"];
  riskLabel?: string;
  riskNotice?: string | null;
  scaleGate?: QueueScaleGate;
}): QueueItem {
  return {
    ...input,
    blockerType: input.blockerType ?? null,
    riskLevel: input.riskLevel ?? "standard",
    riskLabel: input.riskLabel ?? "标准",
    handoffGuidance: input.handoffGuidance ?? (input.strategyBasis ? buildHandoffGuidance(input.strategyBasis) : null),
    riskNotice: input.riskNotice ?? null,
    scaleGate: input.scaleGate ?? "none",
    label: categoryLabel(input.category),
    priority: categoryPriority[input.category],
  };
}

function watchDraftScaleCleared(project: TaskQueueProject) {
  const draftDispatch = project.gateDispatchTasks?.find((task) => (
    task.dispatchKey === `first-day:${project.id}:first-draft`
    && task.state === "completed"
    && task.completionEvidence.trim().length >= 8
  ));
  const evidence = draftDispatch?.completionEvidence ?? "";

  return /通过线/u.test(evidence)
    && /不可接受/u.test(evidence)
    && /复查证据/u.test(evidence)
    && /放量结论/u.test(evidence)
    && /(通过|允许|可以恢复|可恢复|恢复后续)/u.test(evidence)
    && !/未通过|暂不放量|继续停留观察/u.test(evidence);
}

function completedFirstDayDispatch(project: TaskQueueProject, stepId: string) {
  return project.gateDispatchTasks?.find((task) => (
    task.dispatchKey === `first-day:${project.id}:${stepId}`
    && task.state === "completed"
    && task.completionEvidence.trim().length >= 8
  )) ?? null;
}

function handoffEvidenceStatus(project: TaskQueueProject, startTactic: ProjectStartTacticSummary | null, stepId: string) {
  const evidence = completedFirstDayDispatch(project, stepId)?.completionEvidence ?? "";
  const requiresAction = (startTactic?.firstDayActions?.length ?? 0) > 0;
  const requiresAvoidRule = (startTactic?.avoidRules?.length ?? 0) > 0;
  const actionCleared = !requiresAction || /交接动作|首日动作|开头|验证|落地/u.test(evidence);
  const avoidRuleCleared = !requiresAvoidRule || /避坑边界|避开|不要|小样本|不放量|暂停/u.test(evidence);

  return {
    required: requiresAction || requiresAvoidRule,
    cleared: actionCleared && avoidRuleCleared,
    missingAction: requiresAction && !actionCleared,
    missingAvoidRule: requiresAvoidRule && !avoidRuleCleared,
  };
}

function firstDayProductionGateCleared(project: TaskQueueProject, riskLevel: FirstDayRiskLevel, scaleGate: QueueScaleGate) {
  if (riskLevel === "watch" && scaleGate === "cleared") return true;
  return Boolean(completedFirstDayDispatch(project, "publish-precheck"));
}

function firstDayDispatchHref(projectId: string, stepId?: string) {
  const params = new URLSearchParams({ firstDayProject: projectId });
  if (stepId) params.set("step", stepId);
  return `/dispatch?${params.toString()}#first-day-dispatch`;
}

function normalized(text: string | undefined) {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

function isCandidateAlreadyCurrent(
  chapter: TaskQueueProject["chapters"][number],
  revision: NonNullable<TaskQueueProject["chapters"][number]["revisions"]>[number],
) {
  return normalized(chapter.title) === normalized(revision.title)
    && normalized(chapter.content) === normalized(revision.content)
    && chapter.wordCount === revision.wordCount;
}

function latestPendingCandidates(project: TaskQueueProject) {
  return project.chapters
    .flatMap((chapter) => {
      const latest = (chapter.revisions ?? [])
        .filter((revision) => isChapterRevisionCandidate(revision.source))
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0];
      if (!latest || isCandidateAlreadyCurrent(chapter, latest)) return [];
      return {
        chapter,
        revision: latest,
      };
    })
    .sort((left, right) => new Date(right.revision.createdAt).getTime() - new Date(left.revision.createdAt).getTime());
}

function firstThreeAdoptionFollowupQueueItems(input: {
  project: TaskQueueProject;
  projectHref: string;
  platformName: string;
  startTactic: ProjectStartTacticSummary | null;
  riskLevel: FirstDayRiskLevel;
  riskLabel: string;
  riskNotice: string | null;
  scaleGate: QueueScaleGate;
}) {
  return (input.project.gateDispatchTasks ?? [])
    .filter((task) => task.dispatchKey.startsWith(`first-three-adoption:${input.project.id}:`) && task.state !== "completed")
    .map((task): QueueItem => {
      const isPublishCheck = task.dispatchKey.endsWith(":publish-check");
      return item({
        id: `${input.project.id}:adoption-followup:${task.dispatchKey}`,
        projectId: input.project.id,
        projectTitle: input.project.title,
        platformName: input.platformName,
        category: isPublishCheck ? "export" : "review",
        chapterTitle: task.title ?? (isPublishCheck ? "采纳后发布质检" : "采纳后重新审稿"),
        evidence: task.detail ?? (isPublishCheck
          ? "前三章采纳后需要回发布质检，确认投稿包和新正文一致。"
          : "前三章采纳后旧审稿已过期，需要重新审稿。"),
        strategyBasis: input.startTactic,
        riskLevel: input.riskLevel,
        riskLabel: input.riskLabel,
        riskNotice: input.riskNotice,
        scaleGate: input.scaleGate,
        actionLabel: task.actionLabel ?? (isPublishCheck ? "回发布质检" : "重新审稿"),
        href: task.href ?? (isPublishCheck ? `${input.projectHref}#platform-export` : input.projectHref),
      });
    });
}

function isAutomatedQueueItem(entry: QueueItem) {
  return entry.category === "draft" || entry.category === "review" || entry.category === "second_pass";
}

function effectActionLabel(execution: string) {
  if (execution === "generate_asset_variants") return "生成候选";
  if (execution === "rewrite_first_three") return "重写前三章";
  return "去复盘";
}

function timestamp(value: Date | string | null | undefined) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function latestCompletedPublishEffectAction(input: {
  project: TaskQueueProject;
  platformId: string;
  execution: PublishEffectQueueExecution;
  effectSnapshotDate: Date | string | null | undefined;
}) {
  if (input.execution === "open_target") return null;
  const minTime = timestamp(input.effectSnapshotDate);
  const actionId = `platform-strategy:${input.platformId}:${input.execution}`;

  return (input.project.gateActionAudits ?? [])
    .filter((audit) => (
      audit.executionType === "platform_strategy"
      && audit.actionId === actionId
      && audit.platformId === input.platformId
      && audit.status === "succeeded"
      && audit.succeededCount > 0
      && (minTime === null || (timestamp(audit.createdAt) ?? 0) >= minTime)
    ))
    .sort((left, right) => (timestamp(right.createdAt) ?? 0) - (timestamp(left.createdAt) ?? 0))[0] ?? null;
}

function latestAdoptedAssetAfterAction(input: {
  project: TaskQueueProject;
  platformId: string;
  action: NonNullable<ReturnType<typeof latestCompletedPublishEffectAction>>;
}) {
  const actionTime = timestamp(input.action.createdAt) ?? 0;
  return (input.project.submissionAssetVersions ?? [])
    .filter((version) => (
      version.platformId === input.platformId
      && version.action === "adopt"
      && (!input.action.taskId || version.sourceTaskId === input.action.taskId)
      && (timestamp(version.createdAt) ?? 0) >= actionTime
    ))
    .sort((left, right) => (timestamp(right.createdAt) ?? 0) - (timestamp(left.createdAt) ?? 0))[0] ?? null;
}

function latestPublishBaselineAfter(input: {
  project: TaskQueueProject;
  platformId: string;
  after: Date | string;
}) {
  const afterTime = timestamp(input.after) ?? 0;
  return (input.project.publishSnapshots ?? [])
    .filter((snapshot) => (
      snapshot.platformId === input.platformId
      && snapshot.canExport
      && (snapshot.action === "snapshot" || snapshot.action === "copy" || snapshot.action === "download" || snapshot.action === "archive")
      && (timestamp(snapshot.createdAt) ?? 0) >= afterTime
    ))
    .sort((left, right) => (timestamp(right.createdAt) ?? 0) - (timestamp(left.createdAt) ?? 0))[0] ?? null;
}

function completedEffectActionFollowup(input: {
  execution: PublishEffectQueueExecution;
  baseActionId: string;
  effectVerdict: string;
  assetAdopted: boolean;
  newBaselineSaved: boolean;
  packageReady: boolean;
}) {
  if (input.execution === "generate_asset_variants") {
    if (input.assetAdopted && !input.packageReady) {
      return {
        idSuffix: `${input.baseActionId}:recheck-adopted-asset`,
        chapterTitle: "发布质检",
        evidence: `${input.effectVerdict} 投稿候选已经采纳，下一步回发布质检确认标题、简介、标签和前三章是否可投。`,
        actionLabel: "复查质检",
        href: "#platform-export",
        actionId: "recheck-adopted-asset",
      };
    }

    if (input.assetAdopted && !input.newBaselineSaved) {
      return {
        idSuffix: `${input.baseActionId}:save-adopted-baseline`,
        chapterTitle: "新发布基准",
        evidence: `${input.effectVerdict} 投稿候选已经采纳，别拿旧基准做新实验；下一步保存新发布基准。`,
        actionLabel: "保存新基准",
        href: "#platform-export",
        actionId: "save-adopted-baseline",
      };
    }

    if (input.assetAdopted && input.newBaselineSaved) {
      return {
        idSuffix: `${input.baseActionId}:collect-next-effect`,
        chapterTitle: "下一轮发布效果",
        evidence: `${input.effectVerdict} 候选已采纳且新基准已保存，下一步录入新一轮曝光、点击、收藏和追读。`,
        actionLabel: "录入新效果",
        href: "#publish-effect-panel",
        actionId: "collect-next-effect",
      };
    }

    return {
      idSuffix: `${input.baseActionId}:adopt-generated-candidate`,
      chapterTitle: "AI 优化方案",
      evidence: `${input.effectVerdict} 任务中心已生成候选，别重复开同一炉；下一步先采纳一个候选做实测。`,
      actionLabel: "采纳候选",
      href: "#submission-asset-editor",
      actionId: "adopt-generated-candidate",
    };
  }

  if (input.execution === "rewrite_first_three") {
    return {
      idSuffix: `${input.baseActionId}:adopt-first-three-rewrite`,
      chapterTitle: "前三章改写候选",
      evidence: `${input.effectVerdict} 任务中心已生成前三章改写候选，下一步先采纳候选并回到发布质检。`,
      actionLabel: "采纳改写",
      href: "#first-three-rewrite",
      actionId: "adopt-first-three-rewrite",
    };
  }

  return null;
}

export function buildTaskQueueCenter(projects: TaskQueueProject[]): TaskQueueCenter {
  const items = projects.flatMap((project) => {
    const platform = getPlatformProfile(project.targetPlatform as PlatformId);
    const projectHref = `/projects/${project.id}`;
    const startTactic = findProjectStartTacticSummary(project.worldEntries ?? []);
    const riskProfile = buildFirstDayRiskProfile(startTactic);
    const riskNotice = riskProfile.level === "blocked"
      ? `${riskProfile.headline}${riskProfile.instruction}`
      : riskProfile.level === "watch"
        ? watchDraftScaleCleared(project)
          ? "小样本验收依据已过线：通过线、不可接受项、复查证据和放量结论齐全，可以谨慎进入后续初稿批次。"
          : `${riskProfile.headline}${riskProfile.instruction}`
        : null;
    const scaleGate: QueueScaleGate = riskProfile.level === "watch"
      ? watchDraftScaleCleared(project) ? "cleared" : "sample_only"
      : "none";
    const handoffStatus = handoffEvidenceStatus(
      project,
      startTactic,
      riskProfile.level === "watch" && scaleGate === "cleared" ? "first-draft" : "publish-precheck",
    );
    const productionGateCleared = firstDayProductionGateCleared(project, riskProfile.level, scaleGate);
    const firstDayGateCleared = productionGateCleared && (!handoffStatus.required || handoffStatus.cleared);
    const draftQueue = buildBatchDraftQueue(project.chapters, project.aiTasks, platform);
    const reviewQueue = buildReviewPipelineQueue(project.chapters, project.aiTasks, 5, startTactic);
    const exportCenter = buildPlatformPublishExportCenter({
      project: {
        title: project.title,
        genre: project.genre,
        sellingPoint: project.sellingPoint,
        currentWordCount: project.currentWordCount,
        targetWordCount: project.targetWordCount,
      },
      targetPlatform: platform,
      chapters: project.chapters,
      aiTasks: project.aiTasks,
      chapterRevisions: project.chapters.flatMap((chapter) => (
        (chapter.revisions ?? []).map((revision) => ({
          id: revision.id,
          chapterId: chapter.id,
          source: revision.source,
          sourceTaskId: revision.sourceTaskId,
          title: revision.title,
          content: revision.content,
          wordCount: revision.wordCount,
          notes: revision.notes,
          createdAt: revision.createdAt,
        }))
      )),
      publishSnapshots: project.publishSnapshots ?? [],
      submissionAssets: project.submissionAssets ?? [],
      submissionAssetVersions: project.submissionAssetVersions ?? [],
      platformPublishMetrics: project.platformPublishMetrics ?? [],
    });
    const queueItems: QueueItem[] = [];

    queueItems.push(...firstThreeAdoptionFollowupQueueItems({
      project,
      projectHref,
      platformName: platform.name,
      startTactic,
      riskLevel: riskProfile.level,
      riskLabel: riskProfile.label,
      riskNotice,
      scaleGate,
    }));

    for (const candidate of latestPendingCandidates(project)) {
      queueItems.push(item({
        id: `${project.id}:candidate:${candidate.chapter.id}:${candidate.revision.id}`,
        projectId: project.id,
        projectTitle: project.title,
        platformName: platform.name,
        category: "candidate",
        chapterTitle: candidate.chapter.title,
        evidence: `${getChapterRevisionSourceLabel(candidate.revision.source)}还没有写入当前正文：${previewRevisionContent(candidate.revision.content)}`,
        strategyBasis: startTactic,
        riskLevel: riskProfile.level,
        riskLabel: riskProfile.label,
        riskNotice,
        scaleGate,
        actionLabel: "处理候选稿",
        href: `${projectHref}/chapters/${candidate.chapter.id}#chapter-revisions`,
      }));
    }

    if (!firstDayGateCleared && riskProfile.level !== "blocked") {
      const missingHandoffEvidence = productionGateCleared && handoffStatus.required && !handoffStatus.cleared;
      const missingParts = [
        handoffStatus.missingAction ? "交接动作落地" : null,
        handoffStatus.missingAvoidRule ? "避坑边界确认" : null,
      ].filter((part): part is string => Boolean(part));
      queueItems.push(item({
        id: `${project.id}:first-day-gate:${platform.id}`,
        projectId: project.id,
        projectTitle: project.title,
        platformName: platform.name,
        category: "blocked",
        blockerType: "first_day_gate",
        chapterTitle: "首日生产闸门",
        evidence: missingHandoffEvidence
          ? `首日链路已完成，但开书交接证据还没闭环：需要补齐${missingParts.join("、")}后，才允许进入批量初稿、批量审稿、批量二改或多平台导出。`
          : riskProfile.level === "watch"
          ? "观察项目必须先完成首日小样本验收，写清通过线、不可接受项、复查证据和放量结论。"
          : "首日链路还没完成平台包预检验收，暂不允许进入批量初稿、批量审稿、批量二改或多平台导出。",
        strategyBasis: startTactic,
        riskLevel: riskProfile.level,
        riskLabel: riskProfile.label,
        riskNotice,
        scaleGate,
        actionLabel: missingHandoffEvidence
          ? "补交接验收"
          : riskProfile.level === "watch" ? "完成小样本验收" : "完成首日链路",
        href: firstDayDispatchHref(
          project.id,
          missingHandoffEvidence || riskProfile.level !== "watch" ? "publish-precheck" : "first-draft",
        ),
      }));
    }

    if (riskProfile.level === "blocked" && draftQueue.candidates.some((candidate) => candidate.status === "ready")) {
      queueItems.push(item({
        id: `${project.id}:risk-recovery:${platform.id}`,
        projectId: project.id,
        projectTitle: project.title,
        platformName: platform.name,
        category: "blocked",
        blockerType: "risk_recovery",
        chapterTitle: "首日止损恢复",
        evidence: `${riskProfile.headline}${riskProfile.instruction}`,
        strategyBasis: startTactic,
        riskLevel: riskProfile.level,
        riskLabel: riskProfile.label,
        riskNotice,
        actionLabel: "做恢复验证",
        href: firstDayDispatchHref(project.id, "risk-recovery"),
      }));
    }

    const readyDraftCandidates = draftQueue.candidates.filter((candidate) => candidate.status === "ready");
    const draftCandidatesForQueue = riskProfile.level === "watch" && scaleGate === "sample_only"
      ? readyDraftCandidates.slice(0, 1)
      : readyDraftCandidates;

    for (const candidate of draftCandidatesForQueue) {
      if (riskProfile.level === "blocked") continue;
      if (!firstDayGateCleared) continue;
      queueItems.push(item({
        id: `${project.id}:draft:${candidate.chapterId}`,
        projectId: project.id,
        projectTitle: project.title,
        platformName: platform.name,
        category: "draft",
        chapterTitle: candidate.title,
        evidence: riskProfile.level === "watch" && scaleGate === "sample_only"
          ? `${candidate.reason} ${riskProfile.instruction}`
          : riskProfile.level === "watch" && scaleGate === "cleared"
            ? `${candidate.reason} 小样本验收已过线，仍需按同一平台打法谨慎放量。`
            : candidate.reason,
        strategyBasis: startTactic,
        riskLevel: riskProfile.level,
        riskLabel: riskProfile.label,
        riskNotice,
        scaleGate,
        actionLabel: riskProfile.level === "watch" && scaleGate === "sample_only" ? "生成小样本" : "生成初稿",
        href: `${projectHref}/chapters/${candidate.chapterId}`,
      }));
    }

    if (riskProfile.level === "watch" && scaleGate === "sample_only" && readyDraftCandidates.length > draftCandidatesForQueue.length) {
      queueItems.push(item({
        id: `${project.id}:watch-scale-gate:${platform.id}`,
        projectId: project.id,
        projectTitle: project.title,
        platformName: platform.name,
        category: "blocked",
        blockerType: "watch_scale_gate",
        chapterTitle: "观察放量闸门",
        evidence: `还有 ${readyDraftCandidates.length - draftCandidatesForQueue.length} 个初稿候选，需先完成小样本验收：通过线、不可接受项、复查证据和放量结论齐全后再放量。`,
        strategyBasis: startTactic,
        riskLevel: riskProfile.level,
        riskLabel: riskProfile.label,
        riskNotice,
        scaleGate,
        actionLabel: "完成小样本验收",
        href: firstDayDispatchHref(project.id, "first-draft"),
      }));
    }

    for (const candidate of reviewQueue.candidates.filter((candidate) => candidate.recommendedReview)) {
      if (!firstDayGateCleared) continue;
      queueItems.push(item({
        id: `${project.id}:review:${candidate.chapterId}`,
        projectId: project.id,
        projectTitle: project.title,
        platformName: platform.name,
        category: "review",
        chapterTitle: candidate.title,
        evidence: candidate.reason,
        strategyBasis: startTactic,
        riskLevel: riskProfile.level,
        riskLabel: riskProfile.label,
        riskNotice,
        scaleGate,
        actionLabel: "审稿",
        href: `${projectHref}/chapters/${candidate.chapterId}`,
      }));
    }

    for (const candidate of reviewQueue.candidates.filter((candidate) => candidate.recommendedSecondPass)) {
      if (!firstDayGateCleared) continue;
      queueItems.push(item({
        id: `${project.id}:second-pass:${candidate.chapterId}`,
        projectId: project.id,
        projectTitle: project.title,
        platformName: platform.name,
        category: "second_pass",
        chapterTitle: candidate.title,
        evidence: candidate.instruction,
        strategyBasis: startTactic,
        riskLevel: riskProfile.level,
        riskLabel: riskProfile.label,
        riskNotice,
        scaleGate,
        actionLabel: "二改",
        href: `${projectHref}/chapters/${candidate.chapterId}`,
      }));
    }

    const targetPackage = exportCenter.packages.find((pack) => pack.platformId === platform.id) ?? exportCenter.packages[0];
    const primaryEffectAction = targetPackage.effectOptimization.actions[0] ?? null;
    const completedPrimaryEffectAction = primaryEffectAction
      ? latestCompletedPublishEffectAction({
        project,
        platformId: platform.id,
        execution: primaryEffectAction.execution,
        effectSnapshotDate: targetPackage.publishEffect.latest?.snapshotDate ?? null,
      })
      : null;
    const adoptedAssetAfterPrimaryEffectAction = completedPrimaryEffectAction && primaryEffectAction?.execution === "generate_asset_variants"
      ? latestAdoptedAssetAfterAction({
        project,
        platformId: platform.id,
        action: completedPrimaryEffectAction,
      })
      : null;
    const publishBaselineAfterAdoptedAsset = adoptedAssetAfterPrimaryEffectAction
      ? latestPublishBaselineAfter({
        project,
        platformId: platform.id,
        after: adoptedAssetAfterPrimaryEffectAction.createdAt,
      })
      : null;
    const primaryEffectFollowup = primaryEffectAction && completedPrimaryEffectAction
      ? completedEffectActionFollowup({
        execution: primaryEffectAction.execution,
        baseActionId: primaryEffectAction.id,
        effectVerdict: targetPackage.publishEffect.verdict,
        assetAdopted: Boolean(adoptedAssetAfterPrimaryEffectAction),
        newBaselineSaved: Boolean(publishBaselineAfterAdoptedAsset),
        packageReady: targetPackage.canExport,
      })
      : null;

    if (firstDayGateCleared && targetPackage.canExport && targetPackage.publishVersions.length > 0 && targetPackage.publishEffect.records === 0) {
      queueItems.push(item({
        id: `${project.id}:effect:${platform.id}:collect`,
        projectId: project.id,
        projectTitle: project.title,
        platformName: platform.name,
        category: "effect",
        chapterTitle: `${targetPackage.platformName} 发布效果`,
        evidence: "发布包已经保存过基准，但还没有录入曝光、点击、收藏、追读、评论、付费阅读或编辑反馈。",
        strategyBasis: startTactic,
        riskLevel: riskProfile.level,
        riskLabel: riskProfile.label,
        riskNotice,
        scaleGate,
        actionLabel: "录入发布效果",
        href: `${projectHref}#publish-effect-panel`,
        effectAction: {
          platformId: platform.id,
          execution: "open_target",
          actionId: "collect-effect-data",
        },
      }));
    } else if (firstDayGateCleared && targetPackage.canExport && targetPackage.publishEffect.records > 0 && primaryEffectFollowup) {
      queueItems.push(item({
        id: `${project.id}:effect:${platform.id}:${primaryEffectFollowup.idSuffix}`,
        projectId: project.id,
        projectTitle: project.title,
        platformName: platform.name,
        category: "effect",
        chapterTitle: primaryEffectFollowup.chapterTitle,
        evidence: primaryEffectFollowup.evidence,
        strategyBasis: startTactic,
        riskLevel: riskProfile.level,
        riskLabel: riskProfile.label,
        riskNotice,
        scaleGate,
        actionLabel: primaryEffectFollowup.actionLabel,
        href: `${projectHref}${primaryEffectFollowup.href}`,
        effectAction: {
          platformId: platform.id,
          execution: "open_target",
          actionId: primaryEffectFollowup.actionId,
        },
      }));
    } else if (firstDayGateCleared && targetPackage.canExport && targetPackage.publishEffect.records > 0 && primaryEffectAction) {
      queueItems.push(item({
        id: `${project.id}:effect:${platform.id}:${primaryEffectAction.id}`,
        projectId: project.id,
        projectTitle: project.title,
        platformName: platform.name,
        category: "effect",
        chapterTitle: primaryEffectAction.target,
        evidence: `${targetPackage.publishEffect.verdict} ${primaryEffectAction.evidence}`,
        strategyBasis: startTactic,
        riskLevel: riskProfile.level,
        riskLabel: riskProfile.label,
        riskNotice,
        scaleGate,
        actionLabel: effectActionLabel(primaryEffectAction.execution),
        href: `${projectHref}${primaryEffectAction.href}`,
        effectAction: {
          platformId: platform.id,
          execution: primaryEffectAction.execution,
          actionId: primaryEffectAction.id,
        },
      }));
    }

    if (firstDayGateCleared && exportCenter.totalPublishableChapters > 0 && targetPackage.canExport) {
      queueItems.push(item({
        id: `${project.id}:export:${platform.id}`,
        projectId: project.id,
        projectTitle: project.title,
        platformName: platform.name,
        category: "export",
        chapterTitle: `${targetPackage.platformName} 发布包`,
        evidence: `${exportCenter.totalPublishableChapters} 章有正文可导出，${targetPackage.warnings.length} 条发布提醒。`,
        strategyBasis: startTactic,
        riskLevel: riskProfile.level,
        riskLabel: riskProfile.label,
        riskNotice,
        scaleGate,
        actionLabel: "导出平台包",
        href: `${projectHref}#platform-export`,
      }));
    } else if (firstDayGateCleared && exportCenter.totalPublishableChapters > 0 && targetPackage.repairPath.status === "needs_repair") {
      queueItems.push(item({
        id: `${project.id}:publish-repair:${platform.id}`,
        projectId: project.id,
        projectTitle: project.title,
        platformName: platform.name,
        category: "blocked",
        blockerType: "publish_repair",
        chapterTitle: `${targetPackage.platformName} 发布质检`,
        evidence: targetPackage.repairPath.headline,
        strategyBasis: startTactic,
        riskLevel: riskProfile.level,
        riskLabel: riskProfile.label,
        riskNotice,
        scaleGate,
        actionLabel: targetPackage.repairPath.nextStep?.label ?? "处理发布阻塞",
        href: `${projectHref}#platform-export`,
      }));
    }

    for (const candidate of draftQueue.candidates.filter((candidate) => candidate.status === "needs_card").slice(0, 3)) {
      queueItems.push(item({
        id: `${project.id}:blocked:${candidate.chapterId}`,
        projectId: project.id,
        projectTitle: project.title,
        platformName: platform.name,
        category: "blocked",
        blockerType: "chapter_card",
        chapterTitle: candidate.title,
        evidence: candidate.reason,
        strategyBasis: startTactic,
        riskLevel: riskProfile.level,
        riskLabel: riskProfile.label,
        riskNotice,
        scaleGate,
        actionLabel: "补章节卡",
        href: `${projectHref}/chapters/${candidate.chapterId}`,
      }));
    }

    return queueItems;
  }).sort((left, right) => (
    left.priority - right.priority
    || blockerPriority(left.blockerType) - blockerPriority(right.blockerType)
    || left.projectTitle.localeCompare(right.projectTitle)
    || left.chapterTitle.localeCompare(right.chapterTitle)
  ));

  return {
    overview: {
      totalItems: items.length,
      candidateReady: items.filter((entry) => entry.category === "candidate").length,
      draftReady: items.filter((entry) => entry.category === "draft").length,
      reviewReady: items.filter((entry) => entry.category === "review").length,
      secondPassReady: items.filter((entry) => entry.category === "second_pass").length,
      effectReady: items.filter((entry) => entry.category === "effect").length,
      exportReady: items.filter((entry) => entry.category === "export").length,
      blockedCards: items.filter((entry) => entry.category === "blocked").length,
      firstDayBlocked: items.filter((entry) => entry.blockerType === "first_day_gate").length,
      publishBlocked: items.filter((entry) => entry.blockerType === "publish_repair").length,
      chapterCardBlocked: items.filter((entry) => entry.blockerType === "chapter_card").length,
      riskRecoveryBlocked: items.filter((entry) => entry.blockerType === "risk_recovery").length,
      watchScaleBlocked: items.filter((entry) => entry.blockerType === "watch_scale_gate").length,
      watchItems: items.filter((entry) => entry.riskLevel === "watch").length,
      watchSampleOnly: items.filter((entry) => entry.scaleGate === "sample_only" && isAutomatedQueueItem(entry)).length,
      watchCleared: items.filter((entry) => entry.scaleGate === "cleared" && isAutomatedQueueItem(entry)).length,
    },
    items,
    recommendedNext: items.find((entry) => entry.category !== "blocked") ?? items[0] ?? null,
  };
}
