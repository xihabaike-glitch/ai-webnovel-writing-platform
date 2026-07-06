import { buildBatchDraftQueue } from "../ai/batchDrafts.ts";
import { buildReviewPipelineQueue } from "../ai/batchReviewPipeline.ts";
import { getChapterRevisionSourceLabel, isChapterRevisionCandidate, previewRevisionContent } from "../chapters/revisions.ts";
import { buildExportSnapshotHistory } from "../export/snapshots.ts";
import { buildExportVersionCenter } from "../export/versionCenter.ts";
import { getPlatformProfile, type PlatformId } from "../platforms/platformProfiles.ts";
import { buildFirstDayRiskProfile, type FirstDayRiskLevel } from "./firstDayWorkflow.ts";
import { validateFirstDayDispatchCompletionEvidence } from "./firstDayWorkflowView.ts";
import { buildGateDispatchCompletionTemplate, type GateDispatchCompletionTemplateTask } from "./gateActionReceipts.ts";
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
  gateActionAudits?: Array<{
    actionId: string;
    executionType: string;
    status: string;
    succeededCount: number;
    failedCount?: number;
    taskId?: string | null;
    platformId: string;
    label?: string;
    message?: string;
    payload?: string;
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
  category: "candidate" | "handoff" | "draft" | "review" | "second_pass" | "effect" | "export" | "blocked";
  blockerType: "chapter_card" | "publish_repair" | "export_version" | "risk_recovery" | "watch_scale_gate" | "first_day_gate" | null;
  sourceType?: "first_day_handoff" | "first_three_adoption" | "tactic_experience_followup" | "export_version_recheck";
  sourceLabel?: string;
  sourceDetail?: string;
  sourceDispatchKey?: string;
  completionEvidenceTemplate?: string;
  completionEvidenceTemplateSource?: string;
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
  executionChapterId?: string;
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
    exportVersionBlocked: number;
    chapterCardBlocked: number;
    riskRecoveryBlocked: number;
    watchScaleBlocked: number;
    watchItems: number;
    watchSampleOnly: number;
    watchCleared: number;
    firstDayHandoffs: number;
    firstThreeAdoptionFollowups: number;
    tacticExperienceFollowups: number;
  };
  items: QueueItem[];
  recommendedNext: QueueItem | null;
}

export interface TaskQueueSourcePresentation {
  tone: "standard" | "ai_pipeline_recovery";
  badgeClass: string;
  detailClass: string;
  returnHref: string | null;
  returnLabel: string | null;
}

export interface TaskQueueDebtGroup {
  blockerType: QueueItem["blockerType"];
  label: string;
  count: number;
  actionLabel: string;
  href: string;
}

export interface TaskQueueDebtView {
  totalBlocked: number;
  headline: string;
  detail: string;
  groups: TaskQueueDebtGroup[];
  items: QueueItem[];
  nextAction: QueueItem | null;
  focusedBlockerType: QueueItem["blockerType"] | null;
  focusLabel: string | null;
  focusAcceptanceCriteria: string[];
  resumeAction: QueueItem | null;
  resumeActionLabel: string | null;
  resumeActionHref: string | null;
}

type PublishEffectQueueExecution = NonNullable<QueueItem["effectAction"]>["execution"];

const categoryPriority: Record<QueueItem["category"], number> = {
  candidate: 5,
  handoff: 6,
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
  if (blockerType === "export_version") return 4;
  if (blockerType === "chapter_card") return 5;
  return 9;
}

export function recommendedQueueActionLabel(entry: QueueItem | null) {
  if (!entry) return null;
  if (entry.sourceType === "first_three_adoption") return `下一步：采纳闭环 · ${entry.actionLabel}`;
  if (isAiPipelineRecoveryFollowupItem(entry)) return `下一步：AI 写审改恢复 · ${entry.actionLabel}`;
  if (entry.sourceType === "tactic_experience_followup") return `下一步：打法闭环 · ${entry.actionLabel}`;
  return `下一步：${entry.actionLabel}`;
}

function isAiPipelineRecoveryFollowupItem(entry: QueueItem | null) {
  if (!entry || entry.sourceType !== "tactic_experience_followup") return false;
  return entry.sourceLabel === "AI 写审改恢复"
    || entry.platformName === "AI 写审改"
    || entry.sourceDispatchKey?.startsWith("ai-pipeline:") === true;
}

export function taskQueueSourcePresentation(entry: QueueItem | null): TaskQueueSourcePresentation | null {
  if (isAiPipelineRecoveryFollowupItem(entry)) {
    return {
      tone: "ai_pipeline_recovery",
      badgeClass: "bg-emerald-50 text-emerald-700",
      detailClass: "border-emerald-200 bg-emerald-50 text-emerald-950",
      returnHref: "/gate#ai-pipeline-recovery",
      returnLabel: "回 AI 写审改恢复闸门",
    };
  }

  if (entry?.sourceType === "tactic_experience_followup") {
    return {
      tone: "standard",
      badgeClass: "bg-teal-50 text-teal-700",
      detailClass: "border-teal-200 bg-teal-50 text-teal-950",
      returnHref: null,
      returnLabel: null,
    };
  }

  if (entry?.sourceType === "first_three_adoption") {
    return {
      tone: "standard",
      badgeClass: "bg-indigo-50 text-indigo-700",
      detailClass: "border-indigo-200 bg-indigo-50 text-indigo-950",
      returnHref: "/gate#first-three-adoption-closure",
      returnLabel: "回总闸门复检",
    };
  }

  if (entry?.sourceType === "first_day_handoff") {
    return {
      tone: "standard",
      badgeClass: "bg-cyan-50 text-cyan-700",
      detailClass: "border-cyan-200 bg-cyan-50 text-cyan-950",
      returnHref: null,
      returnLabel: null,
    };
  }

  return null;
}

function blockerDebtLabel(blockerType: QueueItem["blockerType"]) {
  if (blockerType === "first_day_gate") return "首日闸门";
  if (blockerType === "risk_recovery") return "开书止损";
  if (blockerType === "watch_scale_gate") return "观察闸门";
  if (blockerType === "publish_repair") return "发布质检";
  if (blockerType === "export_version") return "导出版本";
  if (blockerType === "chapter_card") return "章节卡";
  return "其他阻塞";
}

function blockerDebtActionLabel(blockerType: QueueItem["blockerType"]) {
  if (blockerType === "first_day_gate") return "补首日链路";
  if (blockerType === "risk_recovery") return "写恢复条件";
  if (blockerType === "watch_scale_gate") return "补小样本验收";
  if (blockerType === "publish_repair") return "先修发布质检";
  if (blockerType === "export_version") return "修导出版本";
  if (blockerType === "chapter_card") return "补章节卡";
  return "处理阻塞";
}

function blockerDebtAcceptanceCriteria(blockerType: QueueItem["blockerType"]) {
  if (blockerType === "first_day_gate") return [
    "首日链路派单完成并写入可验收证据。",
    "平台包预检、首轮验证口径和避坑边界已闭环。",
    "回到任务队列确认批量初稿、审稿、二改或导出恢复出现。",
  ];
  if (blockerType === "risk_recovery") return [
    "止损原因、恢复条件和不再放大的边界已写清。",
    "恢复动作必须能回流到首日链路或小样本验证。",
    "处理后风险不再阻断推荐批次。",
  ];
  if (blockerType === "watch_scale_gate") return [
    "小样本验收写清通过线、不可接受项和复查证据。",
    "成功率、质量分、失败样本和放量结论齐全。",
    "结论明确允许恢复后续初稿批次。",
  ];
  if (blockerType === "publish_repair") return [
    "发布质检阻塞项已经修复或有明确暂缓理由。",
    "标题、简介、标签、样章和平台卖点重新通过预检。",
    "处理后导出或发布效果任务恢复出现。",
  ];
  if (blockerType === "export_version") return [
    "导出版本重新生成或恢复到可信基线。",
    "章节数、字数、格式和内容哈希与当前项目一致。",
    "处理后导出版本阻塞数量下降。",
  ];
  if (blockerType === "chapter_card") return [
    "章节目标、钩子、冲突、价值转折和章末追读都不为空。",
    "章节卡能直接进入初稿、审稿或二改，不再返回 needs_card。",
    "处理后回到阻塞清债页确认该类型数量下降。",
  ];
  return ["处理后该阻塞类型数量下降。"];
}

export function buildTaskQueueDebtView(
  items: QueueItem[],
  focusedBlockerType: QueueItem["blockerType"] | null = null,
): TaskQueueDebtView {
  const resumeAction = items.find((entry) => entry.category !== "blocked") ?? null;
  const blockedItems = items
    .filter((entry) => entry.category === "blocked")
    .sort((left, right) => (
      blockerPriority(left.blockerType) - blockerPriority(right.blockerType)
      || left.projectTitle.localeCompare(right.projectTitle)
      || left.chapterTitle.localeCompare(right.chapterTitle)
    ));
  const blockerTypes = [...new Set(blockedItems.map((entry) => entry.blockerType))];
  const groups = blockerTypes.map((blockerType) => ({
    blockerType,
    label: blockerDebtLabel(blockerType),
    count: blockedItems.filter((entry) => entry.blockerType === blockerType).length,
    actionLabel: blockerDebtActionLabel(blockerType),
    href: blockerType ? `/tasks?view=blocked&debt=${blockerType}#task-debt` : "/tasks?view=blocked#task-debt",
  }));
  const totalBlocked = blockedItems.length;
  const activeBlockerType = groups.some((group) => group.blockerType === focusedBlockerType) ? focusedBlockerType : null;
  const visibleBlockedItems = activeBlockerType
    ? blockedItems.filter((entry) => entry.blockerType === activeBlockerType)
    : blockedItems;
  const nextAction = visibleBlockedItems[0] ?? null;
  const focusLabel = activeBlockerType ? blockerDebtLabel(activeBlockerType) : null;

  return {
    totalBlocked,
    headline: totalBlocked > 0
      ? activeBlockerType
        ? `还有 ${totalBlocked} 个阻塞债，正在清理${focusLabel}。`
        : `还有 ${totalBlocked} 个阻塞债，先清最高风险项。`
      : "当前没有阻塞债。",
    detail: nextAction
      ? `优先处理「${nextAction.projectTitle} · ${nextAction.chapterTitle}」：${nextAction.actionLabel}。`
      : resumeAction
        ? `阻塞已经清空，可以恢复「${resumeAction.projectTitle} · ${resumeAction.chapterTitle}」的${resumeAction.actionLabel}。`
        : "可以回到全部任务，继续推进写、审、改、导出。",
    groups,
    items: visibleBlockedItems,
    nextAction,
    focusedBlockerType: activeBlockerType,
    focusLabel,
    focusAcceptanceCriteria: activeBlockerType ? blockerDebtAcceptanceCriteria(activeBlockerType) : [],
    resumeAction,
    resumeActionLabel: resumeAction ? `恢复生产：${resumeAction.actionLabel}` : null,
    resumeActionHref: resumeAction?.href ?? null,
  };
}

function categoryLabel(category: QueueItem["category"]) {
  const labels: Record<QueueItem["category"], string> = {
    candidate: "待采纳",
    handoff: "经验交接",
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

const watchScaleEvidenceFields = "通过线、不可接受项、复查证据、成功率、质量分、失败样本和放量结论";

function watchDraftScaleReview(project: TaskQueueProject) {
  const draftDispatch = project.gateDispatchTasks?.find((task) => (
    task.dispatchKey === `first-day:${project.id}:first-draft`
    && task.state === "completed"
  ));
  const evidence = draftDispatch?.completionEvidence ?? "";
  const validation = validateFirstDayDispatchCompletionEvidence({
    dispatchKey: `first-day:${project.id}:first-draft`,
    dueLabel: "今天小样本验证",
    title: draftDispatch?.title ?? "恢复观察小样本",
    acceptanceCriteria: [
      "写清通过线",
      "写清不可接受项",
      "写清复查证据",
      "写清成功率、质量分、失败样本和放量结论",
    ],
    evidence: ["观察小样本验收"],
    completionEvidence: evidence,
  });

  if (!validation.valid) {
    return {
      cleared: false,
      error: validation.error ?? `小样本验收必须补齐${watchScaleEvidenceFields}。`,
    };
  }

  const positiveConclusion = /(通过|允许|可以恢复|可恢复|恢复后续)/u.test(evidence)
    && !/未通过|暂不放量|继续停留观察/u.test(evidence);
  return {
    cleared: positiveConclusion,
    error: positiveConclusion ? null : "小样本验收必须给出正向放量结论，未通过或继续观察不能解除放量闸门。",
  };
}

function completedFirstDayDispatch(project: TaskQueueProject, stepId: string) {
  return project.gateDispatchTasks?.find((task) => (
    task.dispatchKey === `first-day:${project.id}:${stepId}`
    && task.state === "completed"
    && task.completionEvidence.trim().length >= 8
  )) ?? null;
}

function activeFirstDayDispatch(project: TaskQueueProject, stepId: string) {
  return project.gateDispatchTasks?.find((task) => (
    task.dispatchKey === `first-day:${project.id}:${stepId}`
    && task.state !== "completed"
  )) ?? null;
}

function dispatchEvidenceDraft(input: {
  task: NonNullable<TaskQueueProject["gateDispatchTasks"]>[number] | null;
  fallbackStage: GateDispatchCompletionTemplateTask["stage"];
  fallbackTitle: string;
  fallbackActionLabel: string;
  platformName: string;
  source: string;
}) {
  if (!input.task) return {};
  return {
    sourceDispatchKey: input.task.dispatchKey,
    completionEvidenceTemplate: buildGateDispatchCompletionTemplate({
      stage: (input.task.stage ?? input.fallbackStage) as GateDispatchCompletionTemplateTask["stage"],
      title: input.task.title ?? input.fallbackTitle,
      actionLabel: input.task.actionLabel ?? input.fallbackActionLabel,
      platformName: input.platformName,
      evidence: input.task.detail ? [input.task.detail] : [],
    }),
    completionEvidenceTemplateSource: input.source,
  };
}

function completedFirstDayHandoffEvidence(project: TaskQueueProject) {
  return (project.gateDispatchTasks ?? [])
    .filter((task) => (
      task.dispatchKey.startsWith(`first-day-handoff:${project.id}:`)
      && task.state === "completed"
      && task.completionEvidence.trim().length >= 8
    ))
    .map((task) => task.completionEvidence.trim())
    .join("\n");
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function firstDayHandoffValidation(task: NonNullable<TaskQueueProject["gateDispatchTasks"]>[number]) {
  if (!task.dispatchKey.startsWith("first-day-handoff:")) return { valid: true, error: null as string | null };
  return validateFirstDayDispatchCompletionEvidence({
    dispatchKey: task.dispatchKey,
    title: task.title,
    acceptanceCriteria: [],
    completionEvidence: task.completionEvidence,
  });
}

function completedFirstDayHandoffEvidenceInvalid(task: NonNullable<TaskQueueProject["gateDispatchTasks"]>[number]) {
  if (!task.dispatchKey.startsWith("first-day-handoff:")) return false;
  if (task.state !== "completed") return false;
  if (task.completionEvidence.trim().length < 8) return true;
  return !firstDayHandoffValidation(task).valid;
}

function handoffEvidenceStatus(project: TaskQueueProject, startTactic: ProjectStartTacticSummary | null, stepId: string) {
  const evidence = [
    completedFirstDayDispatch(project, stepId)?.completionEvidence ?? "",
    completedFirstDayHandoffEvidence(project),
  ].filter(Boolean).join("\n");
  const hasHandoffSignal = Boolean(
    startTactic?.handoffLabel
    || startTactic?.handoffDetail
    || (startTactic?.firstDayActions?.length ?? 0) > 0
    || (startTactic?.avoidRules?.length ?? 0) > 0
    || (startTactic?.handoffEvidence?.length ?? 0) > 0
  );
  const requiresAction = hasHandoffSignal;
  const requiresVerification = hasHandoffSignal;
  const requiresPackage = hasHandoffSignal;
  const requiresAvoidRule = hasHandoffSignal || (startTactic?.avoidRules?.length ?? 0) > 0;
  const invalidCompletedHandoffs = (project.gateDispatchTasks ?? []).filter(completedFirstDayHandoffEvidenceInvalid);
  const actionCleared = !requiresAction || includesAny(evidence, ["交接动作", "首日动作", "开头", "第一章", "首屏", "钩子", "危机", "追读", "落地"]);
  const verificationCleared = !requiresVerification || (
    evidence.includes("通过线")
    && evidence.includes("不可接受")
    && evidence.includes("复查证据")
  );
  const packageCleared = !requiresPackage || includesAny(evidence, ["平台回收", "回收口径", "标题", "简介", "标签", "样章", "曝光", "点击", "收藏", "追读"]);
  const avoidRuleCleared = !requiresAvoidRule || includesAny(evidence, ["避坑边界", "避开", "不要", "小样本", "不放量", "暂停"]);

  return {
    required: hasHandoffSignal,
    cleared: actionCleared && verificationCleared && packageCleared && avoidRuleCleared && invalidCompletedHandoffs.length === 0,
    missingAction: requiresAction && !actionCleared,
    missingVerification: requiresVerification && !verificationCleared,
    missingPackage: requiresPackage && !packageCleared,
    missingAvoidRule: requiresAvoidRule && !avoidRuleCleared,
    invalidCompletedHandoffs,
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

function firstThreeAdoptionChapterId(dispatchKey: string) {
  const parts = dispatchKey.split(":");
  if (parts.length < 5 || parts[0] !== "first-three-adoption") return null;
  return parts[2] || null;
}

function parseTaskQueueAuditPayload(payload: string | null | undefined) {
  if (!payload) return null;
  try {
    const parsed: unknown = JSON.parse(payload);
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function taskQueueStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function taskQueueRecordArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object") : [];
}

function recommendedBatchFollowupOutcome(input: {
  project: TaskQueueProject;
  dispatchKey: string;
  chapterId: string | null;
}): { status: "pass" | "fail"; evidence: string } | null {
  const queueItemId = `${input.project.id}:adoption-followup:${input.dispatchKey}`;
  const audits = (input.project.gateActionAudits ?? [])
    .filter((audit) => audit.executionType === "recommended_batch")
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

  for (const audit of audits) {
    const payload = parseTaskQueueAuditPayload(audit.payload);
    const plan = payload?.plan && typeof payload.plan === "object" ? payload.plan as Record<string, unknown> : null;
    if (!taskQueueStringArray(plan?.adoptionFollowupItemIds).includes(queueItemId)) continue;
    const matchingResult = taskQueueRecordArray(payload?.results).find((result) => (
      (!input.chapterId || result.chapterId === input.chapterId)
      && (result.status === "succeeded" || result.status === "failed")
    ));
    const batchReceipt = payload?.batchReceipt && typeof payload.batchReceipt === "object"
      ? payload.batchReceipt as Record<string, unknown>
      : null;
    const receiptStatus = typeof batchReceipt?.status === "string" ? batchReceipt.status : "";
    const succeeded = matchingResult
      ? matchingResult.status === "succeeded"
      : audit.succeededCount > 0 && (audit.failedCount ?? 0) === 0;
    const passed = succeeded && receiptStatus !== "repair" && receiptStatus !== "review_quality";
    const error = typeof matchingResult?.error === "string" && matchingResult.error ? `错误：${matchingResult.error}` : "";
    return {
      status: passed ? "pass" : "fail",
      evidence: passed
        ? "任务中心批量回执已验收。"
        : succeeded
          ? "上一轮任务中心批量回执未达标，先质量修复。"
          : `上一轮任务中心批量回执失败。${error}`,
    };
  }

  return null;
}

function adoptionFollowupRepairActionLabel(input: {
  isPublishCheck: boolean;
  missingEvidence: boolean;
  batchOutcome: { status: "pass" | "fail"; evidence: string } | null;
  fallbackLabel?: string;
}) {
  if (input.batchOutcome?.status === "fail") {
    if (input.batchOutcome.evidence.includes("未达标")) return input.isPublishCheck ? "修发布包" : "进入二改";
    if (/401|unauthorized|api key|密钥|鉴权|quota|余额|额度/iu.test(input.batchOutcome.evidence)) return "去模型设置";
    if (/timeout|timed out|超时|503|429|rate limit|限流/iu.test(input.batchOutcome.evidence)) return "重试/切模型";
    return input.isPublishCheck ? "回发布质检" : "重新审稿";
  }
  if (input.missingEvidence) return "补验收证据";
  return input.fallbackLabel ?? (input.isPublishCheck ? "回发布质检" : "重新审稿");
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
    .filter((task) => {
      if (!task.dispatchKey.startsWith(`first-three-adoption:${input.project.id}:`)) return false;
      if (task.state === "completed" && task.completionEvidence.trim().length >= 8) return false;
      return recommendedBatchFollowupOutcome({
        project: input.project,
        dispatchKey: task.dispatchKey,
        chapterId: firstThreeAdoptionChapterId(task.dispatchKey),
      })?.status !== "pass";
    })
    .map((task): QueueItem => {
      const isPublishCheck = task.dispatchKey.endsWith(":publish-check");
      const missingEvidence = task.state === "completed" && task.completionEvidence.trim().length < 8;
      const executionChapterId = firstThreeAdoptionChapterId(task.dispatchKey);
      const batchOutcome = recommendedBatchFollowupOutcome({
        project: input.project,
        dispatchKey: task.dispatchKey,
        chapterId: executionChapterId,
      });
      return item({
        id: `${input.project.id}:adoption-followup:${task.dispatchKey}`,
        projectId: input.project.id,
        projectTitle: input.project.title,
        platformName: input.platformName,
        category: isPublishCheck ? "export" : "review",
        sourceType: "first_three_adoption",
        sourceLabel: "采纳闭环",
        sourceDetail: batchOutcome?.status === "fail"
          ? "上一轮采纳闭环批量执行失败，不能当作验收。先处理错误后重跑。"
          : missingEvidence
          ? "这不是普通已完成任务，是采纳后的验收证据没交齐。补证据前，总闸门不会真正放行。"
          : isPublishCheck
            ? "前三章采纳改变了发布包装判断，刷新质检后再导出。"
            : "前三章正文已变更，旧审稿自动失效，必须重新审稿。",
        chapterTitle: task.title ?? (isPublishCheck ? "采纳后发布质检" : "采纳后重新审稿"),
        evidence: batchOutcome?.status === "fail"
          ? `${batchOutcome.evidence}${task.detail ? ` ${task.detail}` : ""}`
          : missingEvidence
          ? `任务已标记完成，但缺少验收证据。${task.detail ?? "补齐审稿分、问题数、发布包版本或质检结果后，再回总闸门复检。"}`
          : task.detail ?? (isPublishCheck
            ? "前三章采纳后需要回发布质检，确认投稿包和新正文一致。"
            : "前三章采纳后旧审稿已过期，需要重新审稿。"),
        strategyBasis: input.startTactic,
        riskLevel: input.riskLevel,
        riskLabel: input.riskLabel,
        riskNotice: input.riskNotice,
        scaleGate: input.scaleGate,
        actionLabel: adoptionFollowupRepairActionLabel({
          isPublishCheck,
          missingEvidence,
          batchOutcome,
          fallbackLabel: task.actionLabel,
        }),
        href: task.href ?? (isPublishCheck ? `${input.projectHref}#platform-export` : input.projectHref),
        executionChapterId: executionChapterId ?? undefined,
      });
    });
}

function firstDayExperienceHandoffQueueItems(input: {
  project: TaskQueueProject;
  platformName: string;
  startTactic: ProjectStartTacticSummary | null;
  riskLevel: FirstDayRiskLevel;
  riskLabel: string;
  riskNotice: string | null;
  scaleGate: QueueScaleGate;
}) {
  return (input.project.gateDispatchTasks ?? [])
    .filter((task) => {
      if (!task.dispatchKey.startsWith(`first-day-handoff:${input.project.id}:`)) return false;
      return task.state !== "completed" || task.completionEvidence.trim().length < 8 || !firstDayHandoffValidation(task).valid;
    })
    .map((task): QueueItem => {
      const missingEvidence = task.state === "completed" && task.completionEvidence.trim().length < 8;
      const validation = firstDayHandoffValidation(task);
      const invalidEvidence = task.state === "completed" && task.completionEvidence.trim().length >= 8 && !validation.valid;
      return item({
        id: `${input.project.id}:first-day-handoff:${task.dispatchKey}`,
        projectId: input.project.id,
        projectTitle: input.project.title,
        platformName: input.platformName,
        category: "handoff",
        sourceType: "first_day_handoff",
        sourceLabel: "经验开书",
        sourceDetail: invalidEvidence
          ? `交接派单已标记完成，但证据没过首日审计：${validation.error ?? "请补齐三段交接证据。"}`
          : missingEvidence
          ? "交接派单已标记完成，但验收证据太薄。补齐动作、边界和回收口径后，经验才算真正落地。"
          : "这不是普通生产任务，是把历史打法拆给首日角色的交接工单。先闭环它，再让后续批量生产吃到正确上下文。",
        chapterTitle: task.title ?? "经验开书交接",
        evidence: invalidEvidence
          ? `任务已标记完成，但交接质量不合格。${validation.error ?? "补齐开头打法、首轮验收和平台回收口径后再复查。"}`
          : missingEvidence
          ? `任务已标记完成，但缺少可验收依据。${task.detail ?? "补齐交接动作、避坑边界和首轮回收口径。"}`
          : task.detail ?? "经验开书交接还未完成，需要确认开头打法、首轮验收或平台回收口径。",
        strategyBasis: input.startTactic,
        handoffGuidance: input.startTactic ? buildHandoffGuidance(input.startTactic) : null,
        riskLevel: input.riskLevel,
        riskLabel: input.riskLabel,
        riskNotice: input.riskNotice,
        scaleGate: input.scaleGate,
        actionLabel: missingEvidence || invalidEvidence ? "补交接证据" : task.actionLabel ?? "处理交接",
        href: task.href ?? firstDayDispatchHref(input.project.id),
      });
    });
}

function latestSmallSampleCompletionEvidence(project: TaskQueueProject) {
  return (project.gateActionAudits ?? [])
    .filter((audit) => audit.executionType === "recommended_batch")
    .map((audit) => {
      const payload = parseTaskQueueAuditPayload(audit.payload);
      const batchReceipt = payload?.batchReceipt && typeof payload.batchReceipt === "object"
        ? payload.batchReceipt as Record<string, unknown>
        : null;
      const completionEvidence = typeof batchReceipt?.completionEvidenceTemplate === "string"
        ? batchReceipt.completionEvidenceTemplate.trim()
        : "";
      if (!completionEvidence.includes("小样本验证已完成")) return null;
      return {
        label: audit.label || "推荐批次",
        completionEvidence,
        createdAt: audit.createdAt,
      };
    })
    .filter((item): item is { label: string; completionEvidence: string; createdAt: string | Date } => Boolean(item))
    .sort((left, right) => (timestamp(right.createdAt) ?? 0) - (timestamp(left.createdAt) ?? 0))[0] ?? null;
}

function recoveryRiskBoundary(detail: string | undefined) {
  if (!detail) return "只允许小步复用，继续验证前三章兑现、平台反馈和追读信号。";
  const limited = detail.match(/(只允许[^，。；;\n]+)/u)?.[1]?.trim();
  return limited || detail;
}

function recoveryTacticCompletionEvidenceTemplate(input: {
  project: TaskQueueProject;
  task: NonNullable<TaskQueueProject["gateDispatchTasks"]>[number];
  title: string;
  actionLabel: string;
  platformName: string;
  stage: GateDispatchCompletionTemplateTask["stage"];
}) {
  const sample = latestSmallSampleCompletionEvidence(input.project);
  if (!sample) {
    return {
      template: buildGateDispatchCompletionTemplate({
        stage: input.stage,
        title: input.title,
        actionLabel: input.actionLabel,
        platformName: input.platformName,
        evidence: input.task.detail ? [input.task.detail] : [],
      }),
      source: undefined,
    };
  }

  return {
    template: [
      input.title,
      `加码范围：${input.title}`,
      `基准版本：最近小样本回执「${sample.label}」`,
      "回收时间：按最近小样本批次完成时间回收",
      `风险边界：${recoveryRiskBoundary(input.task.detail)}`,
      `结论：${input.actionLabel}`,
      "",
      "## 小样本回执",
      sample.completionEvidence,
    ].join("\n"),
    source: `最近小样本回执：${sample.label}`,
  };
}

function isAiPipelineRecoveryFollowupTask(task: NonNullable<TaskQueueProject["gateDispatchTasks"]>[number]) {
  return task.dispatchKey.startsWith("ai-pipeline:tactic_experience_followup:")
    || task.stage === "ai_pipeline_sample_recheck"
    || /AI 写审改/u.test(`${task.title ?? ""} ${task.detail ?? ""}`);
}

function tacticExperienceFollowupQueueItems(input: {
  project: TaskQueueProject;
  platformName: string;
  startTactic: ProjectStartTacticSummary | null;
  riskLevel: FirstDayRiskLevel;
  riskLabel: string;
  riskNotice: string | null;
  scaleGate: QueueScaleGate;
}) {
  return (input.project.gateDispatchTasks ?? [])
    .filter((task) => (
      task.dispatchKey.includes(":tactic_experience_followup:")
      && task.state !== "completed"
    ))
    .map((task): QueueItem => {
      const title = task.title ?? "恢复放量打法闭环";
      const actionLabel = task.actionLabel ?? "处理打法闭环";
      const stage = (task.stage ?? "scale_up") as GateDispatchCompletionTemplateTask["stage"];
      const aiPipelineRecovery = isAiPipelineRecoveryFollowupTask(task);
      const completionEvidence = aiPipelineRecovery
        ? {
            template: buildGateDispatchCompletionTemplate({
              stage,
              title,
              actionLabel,
              platformName: "AI 写审改",
              evidence: task.detail ? [task.detail] : [],
            }),
            source: "AI 写审改恢复模板",
          }
        : recoveryTacticCompletionEvidenceTemplate({
            project: input.project,
            task,
            title,
            actionLabel,
            platformName: input.platformName,
            stage,
          });
      return item({
        id: `${input.project.id}:tactic-experience-followup:${task.dispatchKey}`,
        projectId: input.project.id,
        projectTitle: input.project.title,
        platformName: aiPipelineRecovery ? "AI 写审改" : input.platformName,
        category: "handoff",
        sourceType: "tactic_experience_followup",
        sourceLabel: aiPipelineRecovery ? "AI 写审改恢复" : "打法闭环",
        sourceDetail: task.detail
          ? aiPipelineRecovery
            ? `总闸门经验卡派出的 AI 写审改恢复动作：${task.detail}`
            : `总闸门经验卡派出的恢复放量后续动作：${task.detail}`
          : aiPipelineRecovery
            ? "总闸门经验卡派出的 AI 写审改恢复动作，先跑小样本或回滚修复，再把结论回流到平台打法库。"
            : "总闸门经验卡派出的恢复放量后续动作，先处理它，再把结论回流到平台打法库。",
        sourceDispatchKey: task.dispatchKey,
        completionEvidenceTemplate: completionEvidence.template,
        completionEvidenceTemplateSource: completionEvidence.source,
        chapterTitle: title,
        evidence: task.detail ?? (aiPipelineRecovery
          ? "AI 写审改恢复动作未完成，先跑 1 章小样本或回滚修复，证据不闭合前不回推荐批量。"
          : "恢复放量后续动作未完成，先补小样本、追读证据或打法重做结论。"),
        strategyBasis: input.startTactic,
        riskLevel: input.riskLevel,
        riskLabel: input.riskLabel,
        riskNotice: input.riskNotice,
        scaleGate: input.scaleGate,
        actionLabel,
        href: task.href ?? "/gate#platform-tactic-experience",
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

function latestExportVersionAudit(project: TaskQueueProject) {
  return (project.gateActionAudits ?? [])
    .filter((audit) => (
      audit.executionType === "export_version"
      && audit.status === "succeeded"
      && audit.succeededCount > 0
      && audit.actionId.startsWith(`export-version:${project.id}:`)
    ))
    .sort((left, right) => (timestamp(right.createdAt) ?? 0) - (timestamp(left.createdAt) ?? 0))[0] ?? null;
}

function exportVersionQueueItem(input: {
  project: TaskQueueProject;
  projectHref: string;
  platformName: string;
  startTactic: ProjectStartTacticSummary | null;
  riskLevel: FirstDayRiskLevel;
  riskLabel: string;
  riskNotice: string | null;
  scaleGate: QueueScaleGate;
}): QueueItem | null {
  const rawSnapshots = input.project.exportPackageSnapshots ?? [];
  if (rawSnapshots.length === 0) return null;

  const snapshots = buildExportSnapshotHistory(rawSnapshots);
  const versionCenter = buildExportVersionCenter(snapshots);
  const decision = versionCenter.baselineDecision;
  const latestReceipt = latestExportVersionAudit(input.project);
  const latestSnapshotTime = timestamp(versionCenter.latestSnapshot?.createdAt) ?? 0;
  const receiptTime = timestamp(latestReceipt?.createdAt) ?? 0;
  const receiptAfterLatestSnapshot = Boolean(latestReceipt && receiptTime >= latestSnapshotTime);
  const receiptAction = latestReceipt?.actionId.includes(":lock_baseline")
    ? "基准动作"
    : latestReceipt?.actionId.includes(":regenerate_snapshot")
      ? "重导动作"
      : "导出版本动作";
  const common = {
    projectId: input.project.id,
    projectTitle: input.project.title,
    platformName: input.platformName,
    strategyBasis: input.startTactic,
    riskLevel: input.riskLevel,
    riskLabel: input.riskLabel,
    riskNotice: input.riskNotice,
    scaleGate: input.scaleGate,
  };

  if (decision.status === "risk") {
    if (receiptAfterLatestSnapshot) {
      return item({
        ...common,
        id: `${input.project.id}:export-version:recheck`,
        category: "export",
        sourceType: "export_version_recheck",
        sourceLabel: "导出版本回执",
        sourceDetail: latestReceipt?.message ?? "导出版本动作已经执行，下一步需要回总闸门确认风险是否解除。",
        chapterTitle: "导出版本复检",
        evidence: `${receiptAction}已留下回执，但最新版本仍需要总闸门复检：${decision.detail}`,
        actionLabel: "复检总闸门",
        href: "/gate#gate-export-package",
      });
    }

    return item({
      ...common,
      id: `${input.project.id}:export-version:risk`,
      category: "blocked",
      blockerType: "export_version",
      chapterTitle: "导出版本风险",
      evidence: `${decision.label}：${decision.detail}`,
      actionLabel: "处理导出版本",
      href: `${input.projectHref}/exports#export-baseline-comparison`,
    });
  }

  if (decision.status === "needs_baseline") {
    if (receiptAfterLatestSnapshot && latestReceipt?.actionId.includes(":lock_baseline")) {
      return item({
        ...common,
        id: `${input.project.id}:export-version:baseline-recheck`,
        category: "export",
        sourceType: "export_version_recheck",
        sourceLabel: "导出基准回执",
        sourceDetail: latestReceipt.message ?? "基准动作已经执行，下一步回总闸门复检。",
        chapterTitle: "导出基准复检",
        evidence: "导出基准动作已经留下回执，回总闸门确认正式基准是否生效。",
        actionLabel: "复检总闸门",
        href: "/gate#gate-export-package",
      });
    }

    return item({
      ...common,
      id: `${input.project.id}:export-version:lock-baseline`,
      category: "export",
      chapterTitle: "导出正式基准",
      evidence: decision.detail,
      actionLabel: "锁定推荐基准",
      href: `${input.projectHref}/exports#export-baseline-decision`,
    });
  }

  if (decision.status === "replace") {
    if (receiptAfterLatestSnapshot && latestReceipt?.actionId.includes(":lock_baseline") && latestReceipt.taskId === decision.actionSnapshotId) {
      return item({
        ...common,
        id: `${input.project.id}:export-version:replace-recheck`,
        category: "export",
        sourceType: "export_version_recheck",
        sourceLabel: "导出基准回执",
        sourceDetail: latestReceipt.message ?? "替换基准已经执行，下一步回总闸门复检。",
        chapterTitle: "新基准复检",
        evidence: "新导出基准已经留下回执，回总闸门确认版本替换是否完成。",
        actionLabel: "复检总闸门",
        href: "/gate#gate-export-package",
      });
    }

    return item({
      ...common,
      id: `${input.project.id}:export-version:replace-baseline`,
      category: "export",
      chapterTitle: "替换导出基准",
      evidence: decision.detail,
      actionLabel: "替换为新基准",
      href: `${input.projectHref}/exports#export-baseline-decision`,
    });
  }

  if (decision.status === "observe") {
    return item({
      ...common,
      id: `${input.project.id}:export-version:observe`,
      category: "export",
      chapterTitle: "导出差异确认",
      evidence: decision.detail,
      actionLabel: "人工确认差异",
      href: `${input.projectHref}/exports#export-baseline-comparison`,
    });
  }

  return null;
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
    const watchScaleReview = riskProfile.level === "watch" ? watchDraftScaleReview(project) : null;
    const riskNotice = riskProfile.level === "blocked"
      ? `${riskProfile.headline}${riskProfile.instruction}`
      : riskProfile.level === "watch"
        ? watchScaleReview?.cleared
          ? `小样本验收依据已过线：${watchScaleEvidenceFields}齐全，可以谨慎进入后续初稿批次。`
          : `${riskProfile.headline}${riskProfile.instruction}${watchScaleReview?.error ? ` ${watchScaleReview.error}` : ""}`
        : null;
    const scaleGate: QueueScaleGate = riskProfile.level === "watch"
      ? watchScaleReview?.cleared ? "cleared" : "sample_only"
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

    queueItems.push(...firstDayExperienceHandoffQueueItems({
      project,
      platformName: platform.name,
      startTactic,
      riskLevel: riskProfile.level,
      riskLabel: riskProfile.label,
      riskNotice,
      scaleGate,
    }));

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

    queueItems.push(...tacticExperienceFollowupQueueItems({
      project,
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
      const firstDayStepId = missingHandoffEvidence || riskProfile.level !== "watch" ? "publish-precheck" : "first-draft";
      const firstDayEvidenceDraft = dispatchEvidenceDraft({
        task: activeFirstDayDispatch(project, firstDayStepId),
        fallbackStage: riskProfile.level === "watch" ? "start_first_three_review" : "start_platform_package",
        fallbackTitle: riskProfile.level === "watch" ? "观察小样本验收" : "首日生产闸门",
        fallbackActionLabel: riskProfile.level === "watch" ? "完成小样本验收" : "完成首日链路",
        platformName: platform.name,
        source: riskProfile.level === "watch" ? "观察闸门清债模板" : "首日闸门清债模板",
      });
      const missingParts = [
        handoffStatus.missingAction ? "交接动作落地" : null,
        handoffStatus.missingVerification ? "首轮验收口径" : null,
        handoffStatus.missingPackage ? "平台回收口径" : null,
        handoffStatus.missingAvoidRule ? "避坑边界确认" : null,
        handoffStatus.invalidCompletedHandoffs.length ? "薄弱交接证据重写" : null,
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
          ? `观察项目必须先完成首日小样本验收，写清${watchScaleEvidenceFields}。${watchScaleReview?.error ?? ""}`
          : "首日链路还没完成平台包预检验收，暂不允许进入批量初稿、批量审稿、批量二改或多平台导出。",
        strategyBasis: startTactic,
        riskLevel: riskProfile.level,
        riskLabel: riskProfile.label,
        riskNotice,
        scaleGate,
        actionLabel: missingHandoffEvidence
          ? "补交接验收"
          : riskProfile.level === "watch" ? "完成小样本验收" : "完成首日链路",
        href: firstDayDispatchHref(project.id, firstDayStepId),
        ...firstDayEvidenceDraft,
      }));
    }

    if (riskProfile.level === "blocked" && draftQueue.candidates.some((candidate) => candidate.status === "ready")) {
      const recoveryEvidenceDraft = dispatchEvidenceDraft({
        task: activeFirstDayDispatch(project, "risk-recovery"),
        fallbackStage: "repair_tactic",
        fallbackTitle: "首日止损恢复",
        fallbackActionLabel: "做恢复验证",
        platformName: platform.name,
        source: "开书止损清债模板",
      });
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
        ...recoveryEvidenceDraft,
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
      const watchEvidenceDraft = dispatchEvidenceDraft({
        task: activeFirstDayDispatch(project, "first-draft"),
        fallbackStage: "start_first_three_review",
        fallbackTitle: "观察放量闸门",
        fallbackActionLabel: "完成小样本验收",
        platformName: platform.name,
        source: "观察闸门清债模板",
      });
      queueItems.push(item({
        id: `${project.id}:watch-scale-gate:${platform.id}`,
        projectId: project.id,
        projectTitle: project.title,
        platformName: platform.name,
        category: "blocked",
        blockerType: "watch_scale_gate",
        chapterTitle: "观察放量闸门",
        evidence: `还有 ${readyDraftCandidates.length - draftCandidatesForQueue.length} 个初稿候选，需先完成小样本验收：${watchScaleEvidenceFields}齐全后再放量。${watchScaleReview?.error ?? ""}`,
        strategyBasis: startTactic,
        riskLevel: riskProfile.level,
        riskLabel: riskProfile.label,
        riskNotice,
        scaleGate,
        actionLabel: "完成小样本验收",
        href: firstDayDispatchHref(project.id, "first-draft"),
        ...watchEvidenceDraft,
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

    const versionQueueItem = firstDayGateCleared && exportCenter.totalPublishableChapters > 0 && targetPackage.canExport
      ? exportVersionQueueItem({
        project,
        projectHref,
        platformName: platform.name,
        startTactic,
        riskLevel: riskProfile.level,
        riskLabel: riskProfile.label,
        riskNotice,
        scaleGate,
      })
      : null;

    if (versionQueueItem) {
      queueItems.push(versionQueueItem);
    } else if (firstDayGateCleared && exportCenter.totalPublishableChapters > 0 && targetPackage.canExport) {
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
      exportVersionBlocked: items.filter((entry) => entry.blockerType === "export_version").length,
      chapterCardBlocked: items.filter((entry) => entry.blockerType === "chapter_card").length,
      riskRecoveryBlocked: items.filter((entry) => entry.blockerType === "risk_recovery").length,
      watchScaleBlocked: items.filter((entry) => entry.blockerType === "watch_scale_gate").length,
      watchItems: items.filter((entry) => entry.riskLevel === "watch").length,
      watchSampleOnly: items.filter((entry) => entry.scaleGate === "sample_only" && isAutomatedQueueItem(entry)).length,
      watchCleared: items.filter((entry) => entry.scaleGate === "cleared" && isAutomatedQueueItem(entry)).length,
      firstDayHandoffs: items.filter((entry) => entry.sourceType === "first_day_handoff").length,
      firstThreeAdoptionFollowups: items.filter((entry) => entry.sourceType === "first_three_adoption").length,
      tacticExperienceFollowups: items.filter((entry) => entry.sourceType === "tactic_experience_followup").length,
    },
    items,
    recommendedNext: items.find((entry) => entry.category !== "blocked") ?? items[0] ?? null,
  };
}
