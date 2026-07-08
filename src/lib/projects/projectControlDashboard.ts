import type { PlatformProfile } from "../platforms/platformProfiles.ts";
import { buildBatchDraftQueue, type BatchDraftTask } from "../ai/batchDrafts.ts";
import { buildReviewPipelineQueue } from "../ai/batchReviewPipeline.ts";
import { buildModelTaskAuditDashboard, type ModelAuditProvider, type ModelAuditRoute } from "../ai/modelTaskAudit.ts";
import { buildCharacterArcDashboard } from "./characterArc.ts";
import { buildChapterProductionSchedule } from "./chapterProductionSchedule.ts";
import {
  buildPlatformPublishExportCenter,
  type PlatformPublishMetricInput,
  type PlatformStrategyAutoVerdict,
  type PlatformSubmissionAssetInput,
  type PlatformSubmissionAssetVersionInput,
  type PublishPackageVersionItem,
} from "./platformPublishExport.ts";
import { findProjectStartTacticSummary, type ProjectStartTacticSummary } from "./projectStartTactics.ts";
import { buildSerializationOpsDashboard } from "./serializationOps.ts";
import { buildStoryLineDashboard } from "./storyLines.ts";
import type { SubmissionChecklist } from "./submissionChecklist.ts";
import { buildTaskQueueBatchHealthReview } from "./taskQueueBatchHealth.ts";
import { buildWorldBibleDashboard } from "./worldBible.ts";

export interface ControlProject {
  title: string;
  genre: string;
  sellingPoint: string;
  targetLengthType: string;
  targetWordCount: number;
  currentWordCount: number;
  updateCadence: string;
  aiMonthlyBudgetUsd?: number | null;
  aiMaxTaskCostUsd?: number | null;
  aiMaxBatchCostUsd?: number | null;
  aiMaxFailureRatePercent?: number | null;
  aiBudgetEnforcement?: string | null;
}

export interface ControlChapter {
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
  updatedAt: Date | string;
}

export interface ControlOutlineNode {
  id: string;
  parentId: string | null;
  chapterId: string | null;
  type: string;
  title: string;
  summary: string;
  goal: string;
  hook: string;
  conflict: string;
  valueShift: string;
  platformNote: string;
  order: number;
  depth: number;
  status: string;
}

export interface ControlCharacter {
  id: string;
  name: string;
  role: string;
  desire: string;
  need: string;
  flaw: string;
  arcStart: string;
  arcEnd: string;
  voice: string;
  relationshipNotes: string;
}

export interface ControlWorldEntry {
  id: string;
  type: string;
  title: string;
  content: string;
}

export interface ControlForeshadow {
  id: string;
  title: string;
  setupChapterId: string | null;
  payoffChapterId: string | null;
  relatedCharacterIds: string;
  status: string;
  notes: string;
}

export interface ControlPlotThread {
  id: string;
  type: string;
  title: string;
  startChapterId: string | null;
  endChapterId: string | null;
  status: string;
}

export interface ControlAiTask {
  id: string;
  projectId?: string | null;
  chapterId: string | null;
  taskType: string;
  providerConfigId?: string;
  model?: string;
  status: string;
  outputText: string | null;
  inputSnapshot?: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  costUsd?: number | null;
  errorMessage: string | null;
  createdAt: Date | string;
  modelProvider?: {
    providerId: string;
    displayName: string;
  } | null;
  chapter?: {
    title: string;
  } | null;
}

export interface ControlBatchAudit {
  receiptId: string;
  actionId?: string;
  projectId?: string | null;
  label: string;
  detail: string;
  href: string;
  status: string;
  message: string;
  executionType: string;
  succeededCount: number;
  failedCount: number;
  taskId?: string | null;
  platformId?: string;
  platformName?: string;
  recheckStatus?: string;
  recheckLabel?: string;
  recheckDetail?: string;
  recheckAction?: string;
  payload: string;
  createdAt: Date | string;
}

export interface ControlGateDispatchTask {
  dispatchKey: string;
  stage: string;
  state: string;
  title: string;
  detail: string;
  href: string;
  actionLabel: string;
  completionEvidence: string;
  reviewLatestAt: Date | string;
  completedAt?: Date | string | null;
}

export interface ProjectControlDashboardInput {
  project: ControlProject;
  platform: PlatformProfile;
  chapters: ControlChapter[];
  outlineNodes: ControlOutlineNode[];
  characters: ControlCharacter[];
  worldEntries: ControlWorldEntry[];
  foreshadows: ControlForeshadow[];
  plotThreads: ControlPlotThread[];
  aiTasks: ControlAiTask[];
  publishSnapshots?: PublishPackageVersionItem[];
  submissionAssets?: PlatformSubmissionAssetInput[];
  submissionAssetVersions?: PlatformSubmissionAssetVersionInput[];
  platformPublishMetrics?: PlatformPublishMetricInput[];
  platformKnowledgeFeedbackReceipts?: ControlPlatformFeedbackReceipt[];
  gateActionAudits?: ControlBatchAudit[];
  gateDispatchTasks?: ControlGateDispatchTask[];
  modelProviders?: ModelAuditProvider[];
  modelRoutes?: ModelAuditRoute[];
  submissionChecklist: SubmissionChecklist;
}

export interface ControlPlatformFeedbackReceipt {
  id: string;
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
  createdAt: Date | string;
}

export interface ControlArea {
  id: string;
  label: string;
  score: number;
  status: "good" | "watch" | "blocked";
  evidence: string;
  nextAction: string;
  actionLabel: string;
  targetAnchor: string;
  canExecute: boolean;
  executeLabel: string;
  canGenerate: boolean;
  generateLabel: string;
}

export interface StoryFoundationAxis {
  id: string;
  label: string;
  score: number;
  status: ControlArea["status"];
  evidence: string;
  nextAction: string;
  targetAnchor: string;
}

export interface StoryFoundationSummary {
  score: number;
  status: ControlArea["status"];
  label: string;
  headline: string;
  nextAction: string;
  actionLabel: string;
  actionAreaId: string | null;
  actionMode: "seed" | null;
  canExecute: boolean;
  targetAnchor: string;
  axes: StoryFoundationAxis[];
}

export interface ControlPriorityAction {
  id: string;
  areaId: string;
  label: string;
  score: number;
  severity: "high" | "medium" | "low";
  reason: string;
  actionLabel: string;
  targetAnchor: string;
  canExecute: boolean;
  executeLabel: string;
  canGenerate: boolean;
  generateLabel: string;
}

export interface ControlAssetQualityReport {
  taskId: string;
  areaId: string;
  areaLabel: string;
  score: number;
  status: "pass" | "warn" | "fail";
  repaired: boolean;
  createdCount: number;
  issues: string[];
  nextActions: string[];
  createdAt: string;
}

export interface AiPipelineControlPlanItem {
  id: string;
  label: string;
  completed: boolean;
}

export interface AiPipelineControlPlanSummary {
  hasPlan: boolean;
  receiptId: string | null;
  status: "repair" | "watch" | "continue" | "seed_sample" | "empty";
  label: string;
  message: string;
  nextAction: string;
  targetAnchor: string;
  completedCount: number;
  totalCount: number;
  items: AiPipelineControlPlanItem[];
  canRecheck: boolean;
  recheckLabel: string;
  recheckStatus: "small_batch_ready" | "sample_required" | null;
  recheckMessage: string | null;
  recheckOutcomeLabel: string;
  recheckOutcomeTone: "success" | "warning" | "neutral";
  recheckOutcomeDetail: string;
  recheckDispatchKey: string | null;
  recheckDispatchTitle: string | null;
  recheckDispatchHref: string | null;
  recheckActionLabel: string | null;
  recheckActionHref: string | null;
  createdAt: string | null;
}

export interface AiPipelinePromptMemorySummary {
  hasMemory: boolean;
  lifecycleStatus: "active" | "sample_required" | "rollback" | "empty";
  lifecycleLabel: string;
  promptFeedback: {
    statusLabel: string;
    headline: string;
    detail: string;
    primaryActionLabel: string;
  };
  history: Array<{
    statusLabel: string;
    headline: string;
    detail: string;
    primaryActionLabel: string;
    sourceLabel: string;
    latestAt: string;
    transitionLabel: string;
  }>;
  gateTone: "ready" | "watch" | "blocked" | "empty";
  gateStatusLabel: string;
  gateStatusDetail: string;
  gateActionMode: "link" | "rollback" | null;
  gateActionLabel: string | null;
  gateActionHref: string | null;
  label: string;
  headline: string;
  detail: string;
  promptBlock: string;
  nextAction: string;
  actionLabel: string;
  controlDetail: string;
  evidence: string[];
  sourceLabel: string | null;
  latestAt: string | null;
  targetHref: string;
}

export interface ProductionDecisionSummary {
  status: "continue" | "recheck" | "repair" | "watch";
  tone: "allow" | "watch" | "block";
  label: string;
  headline: string;
  reason: string;
  actionExecutable: boolean;
  actionAreaId: string | null;
  actionMode: "seed" | null;
  executeLabel: string;
  dispatchStatus: "none" | "assigned" | "completed" | "needs_governance";
  dispatchLabel: string;
  dispatchDetail: string;
  dispatchHref: string | null;
  primaryActionLabel: string;
  primaryTargetHref: string;
  secondaryActionLabel: string;
  secondaryTargetHref: string;
}

export interface ProjectControlDashboard {
  overallScore: number;
  verdict: string;
  productionDecision: ProductionDecisionSummary;
  platformVerdict: PlatformControlVerdictSummary;
  platformFeedback: PlatformFeedbackSummary;
  platformEvidenceLoop: PlatformEvidenceLoopSummary;
  startTactic: ProjectStartTacticSummary | null;
  startDecision: ProjectStartDecision;
  storyFoundation: StoryFoundationSummary;
  aiPipelineBatch: AiPipelineBatchSummary;
  aiPipelineRecentBatch: AiPipelineRecentBatchSummary;
  aiPipelineBatchHealth: AiPipelineBatchHealthSummary;
  aiPipelineControlPlan: AiPipelineControlPlanSummary;
  aiPipelinePromptMemory: AiPipelinePromptMemorySummary;
  modelRouteHealth: ModelRouteHealthSummary;
  areas: ControlArea[];
  priorityActions: ControlPriorityAction[];
  criticalActions: string[];
  controlAssetQualityReports: ControlAssetQualityReport[];
  metrics: {
    chapters: number;
    words: number;
    outlineNodes: number;
    characters: number;
    worldEntries: number;
    publishableChapters: number;
  };
}

export interface PlatformFeedbackSummary {
  total: number;
  successCount: number;
  needsActionCount: number;
  latest: ControlPlatformFeedbackReceipt | null;
  recent: ControlPlatformFeedbackReceipt[];
  headline: string;
  nextAction: string;
  targetAnchor: string;
}

export interface PlatformEvidenceLoopSummary {
  score: number;
  status: "empty" | "pause" | "repair" | "watch" | "scale";
  label: string;
  platformId: string;
  platformName: string;
  headline: string;
  nextAction: string;
  actionLabel: string;
  targetAnchor: string;
  evidence: string[];
  metricsCount: number;
  feedbackCount: number;
  gateCompletionCount: number;
}

export interface PlatformControlVerdictSummary {
  status: PlatformStrategyAutoVerdict["status"];
  headline: string;
  nextAction: string;
  actionKind: "save_evidence_baseline" | "generate_asset_variants" | "rewrite_first_three" | "open_target";
  actionLabel: string;
  actionExecutable: boolean;
  actionAnchor: string;
  primaryPlatformName: string | null;
  primaryPlatformId: string | null;
  primaryScore: number;
  primaryEvidenceScore: number;
  backupPlatformNames: string[];
  blockedPlatformNames: string[];
  evidenceGaps: string[];
  targetAnchor: string;
}

export interface ProjectStartDecision {
  status: "seed" | "watch" | "scale" | "pause";
  label: string;
  headline: string;
  nextExperiment: string;
  actionLabel: string;
  targetAnchor: string;
  evidence: string[];
}

export interface AiPipelineBatchSummary {
  canRun: boolean;
  category: "review" | "second_pass" | "draft" | null;
  actionLabel: string;
  headline: string;
  detail: string;
  chapterIds: string[];
  chapterTitles: string[];
  targetHref: string;
  warnings: string[];
}

export interface AiPipelineRecentBatchSummary {
  hasRecent: boolean;
  status: "continue" | "repair" | "review_quality" | "watch_cost" | "empty";
  label: string;
  scaleDecisionLabel: string;
  scaleDecisionTone: "allow" | "watch" | "block" | "standard";
  scaleDecisionDetail: string;
  headline: string;
  detail: string;
  actionLabel: string;
  targetHref: string;
  actionExecutable: boolean;
  actionAreaId: string | null;
  actionMode: "seed" | null;
  executeLabel: string;
  relayLabel: string;
  relayDetail: string;
  relayTargetHref: string;
  secondaryActionLabel: string;
  secondaryTargetHref: string;
  evidenceBadges: string[];
  successRatePercent: number | null;
  averageQualityScore: number | null;
  knownCostUsd: number | null;
  succeededCount: number;
  failedCount: number;
  warnings: string[];
  createdAt: string | null;
}

export interface AiPipelineBatchHealthSummary {
  hasSamples: boolean;
  status: "usable" | "watch" | "blocked" | "empty";
  label: string;
  scaleDecisionLabel: string;
  scaleDecisionTone: "allow" | "watch" | "block" | "standard";
  scaleDecisionDetail: string;
  headline: string;
  detail: string;
  actionLabel: string;
  targetHref: string;
  actionExecutable: boolean;
  actionAreaId: string | null;
  actionMode: "seed" | null;
  executeLabel: string;
  total: number;
  usable: number;
  watch: number;
  blocked: number;
  sampleBatches: number;
  recoveryBatches: number;
  successRatePercent: number | null;
  averageQualityScore: number | null;
  failedTasks: number;
  tacticLabel: string;
  tacticTitle: string;
  evidence: string[];
  nextActions: string[];
  latestAt: string | null;
}

export interface ModelRouteHealthSummary {
  status: "empty" | "healthy" | "watch" | "repair" | "cost_guard";
  score: number;
  label: string;
  headline: string;
  detail: string;
  actionLabel: string;
  targetHref: string;
  totalTasks: number;
  successRatePercent: number;
  failureRatePercent: number;
  knownCostUsd: number;
  averageCostPerSucceededTaskUsd: number;
  fallbackAttemptRatePercent: number;
  configuredProviders: number;
  enabledProviders: number;
  preferredRouteLabels: string[];
  avoidRouteLabels: string[];
  warnings: string[];
  nextActions: string[];
}

function platformVerdictAction(
  primaryPlatformId: string | null,
  nextAction: string,
  evidenceGaps: string[],
): Pick<PlatformControlVerdictSummary, "actionKind" | "actionLabel" | "actionExecutable" | "actionAnchor"> {
  const firstGap = evidenceGaps[0] ?? "";
  const gapText = evidenceGaps.join(" ");
  if (primaryPlatformId && firstGap.includes("发布包版本")) {
    return {
      actionKind: "save_evidence_baseline",
      actionLabel: "保存证据基准",
      actionExecutable: true,
      actionAnchor: "package-version-history",
    };
  }
  if (primaryPlatformId && (firstGap.includes("投稿资产") || nextAction.includes("投稿资产") || nextAction.includes("入口"))) {
    return {
      actionKind: "generate_asset_variants",
      actionLabel: "生成投稿资产候选",
      actionExecutable: true,
      actionAnchor: "submission-asset-editor",
    };
  }
  if (
    primaryPlatformId
    && (
      gapText.includes("前三章")
      || gapText.includes("发布质检修复")
      || nextAction.includes("前三章")
      || nextAction.includes("开头")
    )
  ) {
    return {
      actionKind: "rewrite_first_three",
      actionLabel: "重写前三章",
      actionExecutable: true,
      actionAnchor: "first-three-rewrite",
    };
  }
  if (firstGap.includes("真实曝光") || firstGap.includes("点击") || firstGap.includes("追读")) {
    return {
      actionKind: "open_target",
      actionLabel: "录入发布效果",
      actionExecutable: false,
      actionAnchor: "publish-effect-panel",
    };
  }
  return {
    actionKind: "open_target",
    actionLabel: "看裁决面板",
    actionExecutable: false,
    actionAnchor: "platform-strategy-verdict",
  };
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function area(
  id: string,
  label: string,
  score: number,
  evidence: string,
  nextAction: string | undefined,
  actionLabel: string,
  targetAnchor: string,
  canExecute = false,
  executeLabel = "一键执行",
  canGenerate = false,
  generateLabel = "AI 生成",
): ControlArea {
  const normalized = clampScore(score);
  return {
    id,
    label,
    score: normalized,
    status: normalized >= 80 ? "good" : normalized >= 55 ? "watch" : "blocked",
    evidence,
    nextAction: nextAction ?? "补齐该模块的硬缺口。",
    actionLabel,
    targetAnchor,
    canExecute,
    executeLabel,
    canGenerate,
    generateLabel,
  };
}

function buildStoryFoundationSummary(areas: ControlArea[]): StoryFoundationSummary {
  const axisMap = new Map(areas.map((item) => [item.id, item]));
  const axisConfigs = [
    { id: "outline", label: "大树骨架" },
    { id: "characters", label: "人物弧光" },
    { id: "story-lines", label: "主线支线" },
    { id: "world", label: "土壤设定" },
    { id: "production", label: "章节叶片" },
  ];
  const axes = axisConfigs
    .map((config) => {
      const source = axisMap.get(config.id);
      if (!source) return null;
      return {
        id: config.id,
        label: config.label,
        score: source.score,
        status: source.status,
        evidence: source.evidence,
        nextAction: source.nextAction,
        targetAnchor: source.targetAnchor,
      } satisfies StoryFoundationAxis;
    })
    .filter((item): item is StoryFoundationAxis => Boolean(item));
  const score = clampScore(average(axes.map((item) => item.score)));
  const weakest = [...axes].sort((left, right) => left.score - right.score || left.label.localeCompare(right.label))[0];
  const weakestScore = weakest?.score ?? score;
  const status: ControlArea["status"] = weakestScore < 55
    ? "blocked"
    : weakestScore < 80
      ? "watch"
      : score >= 80
        ? "good"
        : score >= 55
          ? "watch"
          : "blocked";
  const executableAreaIds = new Set(["outline", "characters", "story-lines", "world", "production"]);
  const actionAreaId = weakest && executableAreaIds.has(weakest.id) ? weakest.id : null;
  const label = status === "good" ? "底座可扩写" : status === "watch" ? "底座待加固" : "先搭底座";
  const headline = status === "good"
    ? "开头、结尾、主干、分支和土壤已能支撑持续连载。"
    : status === "watch"
      ? "故事大树已经有雏形，但还要先补最弱的一根承重枝。"
      : "传统写作底座还没立住，先别急着让 AI 批量扩写。";

  return {
    score,
    status,
    label,
    headline,
    nextAction: weakest?.nextAction ?? "先补大纲、人物、主线和世界观的硬缺口。",
    actionLabel: weakest?.label ? `${actionAreaId ? "一键" : ""}补${weakest.label}` : "补写作底座",
    actionAreaId,
    actionMode: actionAreaId ? "seed" : null,
    canExecute: Boolean(actionAreaId),
    targetAnchor: weakest?.targetAnchor ?? "outline-tree",
    axes,
  };
}

function actionSeverity(status: ControlArea["status"]): ControlPriorityAction["severity"] {
  if (status === "blocked") return "high";
  if (status === "watch") return "medium";
  return "low";
}

function ratio(part: number, total: number) {
  if (total <= 0) return 0;
  return part / total;
}

function countByType(nodes: ControlOutlineNode[], type: string) {
  return nodes.filter((node) => node.type === type).length;
}

function outlineScore(nodes: ControlOutlineNode[]) {
  const checks = [
    countByType(nodes, "root") >= 1,
    countByType(nodes, "opening") >= 1,
    countByType(nodes, "ending") >= 1,
    countByType(nodes, "trunk") >= 1,
    countByType(nodes, "branch") >= 3,
    countByType(nodes, "leaf") >= 2,
    countByType(nodes, "soil") >= 1,
  ];
  return ratio(checks.filter(Boolean).length, checks.length) * 100;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function verdict(score: number) {
  if (score >= 85) return "项目进入可持续生产状态，可以集中做发布和增长。";
  if (score >= 70) return "项目生产链基本打通，但仍有模块会拖慢发布。";
  if (score >= 50) return "项目有雏形，但缺口会导致写作和发布互相卡住。";
  return "项目还在搭骨架，先别急着批量扩写或投放。";
}

function buildProjectStartDecision(startTactic: ProjectStartTacticSummary | null): ProjectStartDecision {
  if (!startTactic) {
    return {
      status: "seed",
      label: "先建打法",
      headline: "这个项目还没有首轮平台打法，先别让 AI 自由发挥。",
      nextExperiment: "先生成平台土壤和首轮开书打法，再进入前三章、审稿和发布包装。",
      actionLabel: "补平台土壤",
      targetAnchor: "world-bible",
      evidence: ["未找到首轮平台打法记录。"],
    };
  }

  const evidence = [
    `来源：${startTactic.label}`,
    startTactic.handoffLabel ? `交接：${startTactic.handoffLabel}${startTactic.handoffDetail ? `｜${startTactic.handoffDetail}` : ""}` : null,
    startTactic.recommendedPlatformName ? `推荐平台：${startTactic.recommendedPlatformName}` : null,
    startTactic.recommendedTemplateId ? `推荐模板：${startTactic.recommendedTemplateId}` : null,
    startTactic.openingMove ? `开头：${startTactic.openingMove}` : null,
    startTactic.verificationMove ? `验证：${startTactic.verificationMove}` : null,
    ...(startTactic.firstDayActions ?? []).slice(0, 1).map((action) => `首日动作：${action}`),
    ...(startTactic.avoidRules ?? []).slice(0, 1).map((rule) => `避坑边界：${rule}`),
  ].filter((item): item is string => Boolean(item));
  const labelText = `${startTactic.label} ${startTactic.handoffStatus ?? ""} ${startTactic.primaryTactic} ${startTactic.risk}`;

  if (labelText.includes("避坑") || labelText.includes("失败") || labelText.includes("暂停") || labelText.includes("不要复用")) {
    return {
      status: "pause",
      label: "先停用",
      headline: "这套开书打法已经带着避坑信号，别再复用到新批次。",
      nextExperiment: "先重写前三章开头和平台包装，只做小批验证，等审稿分和失败率回正再恢复。",
      actionLabel: "重写前三章",
      targetAnchor: "first-three-rewrite",
      evidence,
    };
  }

  if (labelText.includes("观察") || labelText.includes("小批") || labelText.includes("样本还薄")) {
    return {
      status: "watch",
      label: "先观察",
      headline: "这套打法可以继续试，但证据还不够支撑放量。",
      nextExperiment: "只跑前三章和少量审稿任务，回填质量分、失败样本和平台包装效果。",
      actionLabel: "小批验证",
      targetAnchor: "ai-pipeline",
      evidence,
    };
  }

  if (labelText.includes("可复用") || labelText.includes("可作为") || labelText.includes("复用")) {
    return {
      status: "scale",
      label: "可放大",
      headline: "这套开书打法已经有复用证据，可以进入项目首轮小批放大。",
      nextExperiment: "先用前三章验证开头兑现，再批量审稿和记录平台包装效果。",
      actionLabel: "进入小批放大",
      targetAnchor: "ai-pipeline",
      evidence,
    };
  }

  return {
    status: "watch",
    label: "先观察",
    headline: "这套打法来自模板或早期判断，还需要项目内证据确认。",
    nextExperiment: "跑完前三章、审稿和平台包装后，再决定是否放大到更多章节。",
    actionLabel: "跑首轮验证",
    targetAnchor: "ai-pipeline",
    evidence,
  };
}

function buildAiPipelineBatchSummary(
  batchDraft: ReturnType<typeof buildBatchDraftQueue>,
  reviewPipeline: ReturnType<typeof buildReviewPipelineQueue>,
): AiPipelineBatchSummary {
  if (reviewPipeline.recommendedReviewChapterIds.length > 0) {
    const chapterIds = reviewPipeline.recommendedReviewChapterIds;
    const titles = reviewPipeline.candidates
      .filter((candidate) => chapterIds.includes(candidate.chapterId))
      .map((candidate) => candidate.title);
    return {
      canRun: true,
      category: "review",
      actionLabel: `批量审稿 ${chapterIds.length} 章`,
      headline: "先审稿，别急着继续堆正文。",
      detail: `待审：${titles.join("、")}`,
      chapterIds,
      chapterTitles: titles,
      targetHref: "/tasks#recommended-batch",
      warnings: reviewPipeline.warnings.slice(0, 2),
    };
  }

  if (reviewPipeline.recommendedSecondPassChapterIds.length > 0) {
    const chapterIds = reviewPipeline.recommendedSecondPassChapterIds;
    const titles = reviewPipeline.candidates
      .filter((candidate) => chapterIds.includes(candidate.chapterId))
      .map((candidate) => candidate.title);
    return {
      canRun: true,
      category: "second_pass",
      actionLabel: `批量二改 ${chapterIds.length} 章`,
      headline: "先二改，把已暴露的问题改掉。",
      detail: `待二改：${titles.join("、")}`,
      chapterIds,
      chapterTitles: titles,
      targetHref: "/tasks#recommended-batch",
      warnings: reviewPipeline.warnings.slice(0, 2),
    };
  }

  if (batchDraft.recommendedChapterIds.length > 0) {
    const chapterIds = batchDraft.recommendedChapterIds;
    const titles = batchDraft.candidates
      .filter((candidate) => chapterIds.includes(candidate.chapterId))
      .map((candidate) => candidate.title);
    return {
      canRun: true,
      category: "draft",
      actionLabel: `批量初稿 ${chapterIds.length} 章`,
      headline: "章节卡已过线，可以小批生成正文。",
      detail: `待初稿：${titles.join("、")}`,
      chapterIds,
      chapterTitles: titles,
      targetHref: "/tasks#recommended-batch",
      warnings: batchDraft.warnings.slice(0, 2),
    };
  }

  return {
    canRun: false,
    category: null,
    actionLabel: "暂无推荐批次",
    headline: "AI 写审改还没有可直接执行的推荐批次。",
    detail: "先补章节卡、生成正文，或处理正在运行和已卡住的任务。",
    chapterIds: [],
    chapterTitles: [],
    targetHref: "/tasks#recommended-batch",
    warnings: [...batchDraft.warnings, ...reviewPipeline.warnings].slice(0, 2),
  };
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function batchReceiptStatus(value: unknown): AiPipelineRecentBatchSummary["status"] {
  if (value === "continue" || value === "repair" || value === "review_quality" || value === "watch_cost") return value;
  return "empty";
}

function recentBatchLabel(status: AiPipelineRecentBatchSummary["status"]) {
  if (status === "continue") return "可继续";
  if (status === "repair") return "先修复";
  if (status === "review_quality") return "看质量";
  if (status === "watch_cost") return "看成本";
  return "暂无回流";
}

function recentBatchScaleDecision(
  payload: Record<string, unknown> | null,
  status: AiPipelineRecentBatchSummary["status"],
): Pick<AiPipelineRecentBatchSummary, "scaleDecisionLabel" | "scaleDecisionTone" | "scaleDecisionDetail"> {
  const plan = isRecord(payload?.plan) ? payload.plan : null;
  const planLabel = textValue(plan?.scaleDecisionLabel);
  const planTone = plan?.scaleDecisionTone;
  const planDetail = textValue(plan?.scaleDecisionDetail);
  if (planLabel && (planTone === "allow" || planTone === "watch" || planTone === "block" || planTone === "standard")) {
    return {
      scaleDecisionLabel: planLabel,
      scaleDecisionTone: planTone,
      scaleDecisionDetail: planDetail ?? "沿用任务中心推荐批次的放量边界。",
    };
  }
  if (status === "repair" || status === "review_quality") {
    return {
      scaleDecisionLabel: "禁止放大",
      scaleDecisionTone: "block" as const,
      scaleDecisionDetail: "最近批次失败或质量未过线，先完成修复与复检，再回到推荐批次。",
    };
  }
  if (status === "watch_cost") {
    return {
      scaleDecisionLabel: "继续观察",
      scaleDecisionTone: "watch" as const,
      scaleDecisionDetail: "最近批次成本或模型路线仍需观察，先收齐成本、质量和失败证据。",
    };
  }
  if (status === "continue") {
    return {
      scaleDecisionLabel: "允许小步加码",
      scaleDecisionTone: "allow" as const,
      scaleDecisionDetail: "最近批次可以继续，但仍要保留下一批真实成功率、质量、成本和失败回执。",
    };
  }
  return {
    scaleDecisionLabel: "标准生产",
    scaleDecisionTone: "standard" as const,
    scaleDecisionDetail: "还没有最近批次回流，先执行推荐小批次再判断放量边界。",
  };
}

function buildAiPipelineRecentBatchSummary(audits: ControlBatchAudit[] = []): AiPipelineRecentBatchSummary {
  const latest = audits
    .filter((audit) => audit.executionType === "recommended_batch")
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0];

  if (!latest) {
    return {
      hasRecent: false,
      status: "empty",
      label: "暂无回流",
      scaleDecisionLabel: "标准生产",
      scaleDecisionTone: "standard",
      scaleDecisionDetail: "还没有最近批次回流，先执行推荐小批次再判断放量边界。",
      headline: "还没有推荐批次执行结果。",
      detail: "先执行一次推荐批次，项目总控才有成功率、质量和成本证据。",
      actionLabel: "去任务中心",
      targetHref: "/tasks#recommended-batch",
      actionExecutable: false,
      actionAreaId: null,
      actionMode: null,
      executeLabel: "",
      relayLabel: "",
      relayDetail: "",
      relayTargetHref: "",
      secondaryActionLabel: "",
      secondaryTargetHref: "",
      evidenceBadges: [],
      successRatePercent: null,
      averageQualityScore: null,
      knownCostUsd: null,
      succeededCount: 0,
      failedCount: 0,
      warnings: [],
      createdAt: null,
    };
  }

  const payload = parseJsonObject(latest.payload);
  const route = isRecord(payload?.routeEffectSummary) ? payload.routeEffectSummary : null;
  const batchReceipt = isRecord(payload?.batchReceipt) ? payload.batchReceipt : null;
  const status = batchReceiptStatus(batchReceipt?.status);
  const scaleDecision = recentBatchScaleDecision(payload, status);
  const warnings = stringArray(batchReceipt?.warnings);
  const headline = typeof batchReceipt?.headline === "string" && batchReceipt.headline
    ? batchReceipt.headline
    : latest.label;
  const detail = typeof batchReceipt?.detail === "string" && batchReceipt.detail
    ? batchReceipt.detail
    : latest.message;
  const primaryLabel = typeof batchReceipt?.primaryLabel === "string" && batchReceipt.primaryLabel
    ? batchReceipt.primaryLabel
    : status === "repair"
      ? "查看失败修复"
      : status === "watch_cost"
        ? "看模型审计"
        : "看推荐批次";
  const primaryHref = typeof batchReceipt?.primaryHref === "string" && batchReceipt.primaryHref
    ? batchReceipt.primaryHref
    : latest.href || "/tasks#recommended-batch";
  const actionExecutable = status === "repair";
  const secondaryLabel = typeof batchReceipt?.secondaryLabel === "string" ? batchReceipt.secondaryLabel : "";
  const secondaryHref = typeof batchReceipt?.secondaryHref === "string" ? batchReceipt.secondaryHref : "";
  const evidenceBadges = stringArray(batchReceipt?.evidenceItems).slice(0, 5);

  return {
    hasRecent: true,
    status,
    label: recentBatchLabel(status),
    ...scaleDecision,
    headline,
    detail,
    actionLabel: primaryLabel,
    targetHref: primaryHref,
    actionExecutable,
    actionAreaId: actionExecutable ? "ai-pipeline" : null,
    actionMode: actionExecutable ? "seed" : null,
    executeLabel: actionExecutable ? "生成修复清单" : "",
    relayLabel: actionExecutable ? "修复接力" : "",
    relayDetail: actionExecutable ? "生成清单后会进入「本书批量健康」面板；完成清单后再复检批量健康，别把失败样本直接放大。" : "",
    relayTargetHref: actionExecutable ? "#ai-pipeline" : "",
    secondaryActionLabel: secondaryLabel,
    secondaryTargetHref: secondaryHref,
    evidenceBadges,
    successRatePercent: numberValue(route?.successRatePercent),
    averageQualityScore: numberValue(route?.averageQualityScore),
    knownCostUsd: numberValue(route?.knownCostUsd),
    succeededCount: latest.succeededCount,
    failedCount: latest.failedCount,
    warnings: warnings.slice(0, 2),
    createdAt: new Date(latest.createdAt).toISOString(),
  };
}

function batchHealthStatusLabel(status: AiPipelineBatchHealthSummary["status"]) {
  if (status === "blocked") return "先停用";
  if (status === "watch") return "继续观察";
  if (status === "usable") return "可参考";
  return "缺样本";
}

function batchHealthHeadline(status: AiPipelineBatchHealthSummary["status"], label: string) {
  if (status === "blocked") return `${label}，本书先别继续复用这套批量打法。`;
  if (status === "watch") return `${label}，本书下一批只能小步验证。`;
  if (status === "usable") return `${label}，本书可以作为后续批量参考。`;
  return "本书还没有可复盘的批量打法样本。";
}

function batchHealthScaleDecision(
  status: AiPipelineBatchHealthSummary["status"],
  nextAction: string,
): Pick<AiPipelineBatchHealthSummary, "scaleDecisionLabel" | "scaleDecisionTone" | "scaleDecisionDetail"> {
  if (status === "usable") {
    return {
      scaleDecisionLabel: "允许小步加码",
      scaleDecisionTone: "allow",
      scaleDecisionDetail: "本书批量打法已达到可参考线，后续只能小步加码，并继续回收成功率、质量、成本和失败证据。",
    };
  }
  if (status === "blocked") {
    return {
      scaleDecisionLabel: "禁止放大",
      scaleDecisionTone: "block",
      scaleDecisionDetail: "本书批量健康已跌线，先修复失败任务和低分环节，复检通过前不要继续放大。",
    };
  }
  if (status === "watch") {
    return {
      scaleDecisionLabel: "继续观察",
      scaleDecisionTone: "watch",
      scaleDecisionDetail: nextAction || "本书批量样本仍薄，继续小批验证，不进入放大生产。",
    };
  }
  return {
    scaleDecisionLabel: "标准生产",
    scaleDecisionTone: "standard",
    scaleDecisionDetail: "本书还没有批量健康样本，先建立推荐小批次样本，再判断放量边界。",
  };
}

function buildAiPipelineBatchHealthSummary(audits: ControlBatchAudit[] = []): AiPipelineBatchHealthSummary {
  const review = buildTaskQueueBatchHealthReview(audits, 5);
  const primary = review.items[0] ?? null;
  const canArchiveRecoveryExperience = primary?.status === "usable" && (primary.recoveryBatches ?? 0) >= 2;
  const latestAudit = [...audits]
    .filter((audit) => audit.executionType === "recommended_batch")
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0] ?? null;

  if (!primary) {
    return {
      hasSamples: false,
      status: "empty",
      label: "缺样本",
      ...batchHealthScaleDecision("empty", ""),
      headline: "本书还没有可复盘的批量打法样本。",
      detail: "先从任务中心跑一次带首轮打法的推荐批次，项目总控才会判断这套打法能不能继续。",
      actionLabel: "去任务中心",
      targetHref: "/tasks#recommended-batch",
      actionExecutable: false,
      actionAreaId: null,
      actionMode: null,
      executeLabel: "建立样本",
      total: 0,
      usable: 0,
      watch: 0,
      blocked: 0,
      sampleBatches: 0,
      recoveryBatches: 0,
      successRatePercent: null,
      averageQualityScore: null,
      failedTasks: 0,
      tacticLabel: "",
      tacticTitle: "",
      evidence: [],
      nextActions: [],
      latestAt: null,
    };
  }

  return {
    hasSamples: true,
    status: primary.status,
    label: batchHealthStatusLabel(primary.status),
    ...batchHealthScaleDecision(primary.status, primary.nextAction),
    headline: batchHealthHeadline(primary.status, primary.label),
    detail: primary.nextAction,
    actionLabel: canArchiveRecoveryExperience ? "写入经验库" : primary.status === "blocked" ? "看失败复盘" : "看任务中心",
    targetHref: canArchiveRecoveryExperience ? "#platform-tactic-experience" : primary.status === "blocked" ? "/failures" : latestAudit?.href || "/tasks#recommended-batch",
    actionExecutable: primary.status === "blocked" || primary.status === "watch",
    actionAreaId: primary.status === "blocked" || primary.status === "watch" ? "ai-pipeline" : null,
    actionMode: primary.status === "blocked" || primary.status === "watch" ? "seed" : null,
    executeLabel: primary.status === "blocked"
      ? "生成修复清单"
      : primary.status === "watch"
        ? primary.recoveryBatches > 0 ? "再跑稳定批次" : "生成复验清单"
        : "继续小批",
    total: review.summary.total,
    usable: review.summary.usable,
    watch: review.summary.watch,
    blocked: review.summary.blocked,
    sampleBatches: primary.sampleBatches,
    recoveryBatches: primary.recoveryBatches,
    successRatePercent: primary.successRatePercent,
    averageQualityScore: primary.averageQualityScore,
    failedTasks: primary.failedTasks,
    tacticLabel: primary.label,
    tacticTitle: primary.tacticTitle,
    evidence: primary.evidence.slice(0, 3),
    nextActions: review.nextActions.slice(0, 3),
    latestAt: primary.latestAt,
  };
}

function aiPipelineAreaDecision(input: {
  baseScore: number;
  baseEvidence: string;
  batch: AiPipelineBatchSummary;
  health: AiPipelineBatchHealthSummary;
}) {
  if (input.health.status === "blocked") {
    return {
      score: 0,
      evidence: input.health.hasSamples ? `${input.baseEvidence} 批量健康：${input.health.tacticLabel}，失败 ${input.health.failedTasks}。` : input.baseEvidence,
      nextAction: `${input.health.headline} ${input.health.detail}`,
      actionLabel: "修批量打法",
      canExecute: true,
      executeLabel: "生成修复清单",
    };
  }
  if (input.health.status === "watch") {
    return {
      score: Math.min(input.baseScore, 64),
      evidence: input.health.hasSamples ? `${input.baseEvidence} 批量健康：${input.health.tacticLabel}，仍需观察。` : input.baseEvidence,
      nextAction: `${input.health.headline} ${input.health.detail}`,
      actionLabel: "小样本复验",
      canExecute: true,
      executeLabel: input.health.executeLabel,
    };
  }
  return {
    score: input.baseScore,
    evidence: input.health.hasSamples ? `${input.baseEvidence} 批量健康：${input.health.tacticLabel}。` : input.baseEvidence,
    nextAction: input.batch.headline,
    actionLabel: input.health.status === "usable" && input.health.recoveryBatches >= 2 ? "沉淀经验库" : "清写审改队列",
    canExecute: false,
    executeLabel: "清写审改队列",
  };
}

function modelRouteStatusLabel(status: ModelRouteHealthSummary["status"]) {
  if (status === "healthy") return "可小批放量";
  if (status === "repair") return "先修路由";
  if (status === "cost_guard") return "先控成本";
  if (status === "watch") return "继续观察";
  return "缺样本";
}

function modelRouteTaskLabel(taskLabel: string, providerName: string, model: string) {
  return `${taskLabel} · ${providerName}/${model}`;
}

function buildModelRouteHealthSummary(input: ProjectControlDashboardInput): ModelRouteHealthSummary {
  const audit = buildModelTaskAuditDashboard(
    input.aiTasks.map((task) => ({
      id: task.id,
      projectId: task.projectId ?? null,
      chapterId: task.chapterId,
      taskType: task.taskType,
      providerConfigId: task.providerConfigId,
      model: task.model ?? "unknown",
      status: task.status,
      inputSnapshot: task.inputSnapshot ?? "",
      inputTokens: task.inputTokens ?? null,
      outputTokens: task.outputTokens ?? null,
      costUsd: task.costUsd ?? null,
      outputText: task.outputText,
      errorMessage: task.errorMessage,
      createdAt: task.createdAt,
      modelProvider: task.modelProvider ?? null,
      chapter: task.chapter ?? null,
    })),
    input.modelProviders ?? [],
    {
      aiMonthlyBudgetUsd: input.project.aiMonthlyBudgetUsd,
      aiMaxTaskCostUsd: input.project.aiMaxTaskCostUsd,
      aiMaxBatchCostUsd: input.project.aiMaxBatchCostUsd,
      aiMaxFailureRatePercent: input.project.aiMaxFailureRatePercent,
      aiBudgetEnforcement: input.project.aiBudgetEnforcement,
    },
    input.modelRoutes ?? [],
  );
  const preferredRouteLabels = audit.modelEffectRows
    .filter((row) => row.recommendation === "prefer")
    .slice(0, 3)
    .map((row) => modelRouteTaskLabel(row.taskLabel, row.providerName, row.model));
  const avoidRouteLabels = audit.modelEffectRows
    .filter((row) => row.recommendation === "avoid")
    .slice(0, 3)
    .map((row) => modelRouteTaskLabel(row.taskLabel, row.providerName, row.model));
  const needsRepair = audit.providerReadiness.unconfiguredEnabledProviders > 0
    || audit.summary.unresolvedFailures > 0
    || audit.summary.failureRatePercent >= audit.budgetCenter.maxFailureRatePercent
    || avoidRouteLabels.length > 0;
  const needsCostGuard = !needsRepair && (
    audit.budgetCenter.status !== "safe"
    || audit.budgetCenter.fallbackAttemptRatePercent >= 20
    || audit.summary.averageCostPerSucceededTaskUsd > audit.budgetCenter.maxTaskCostUsd
  );
  const status: ModelRouteHealthSummary["status"] = audit.summary.totalTasks === 0
    ? "empty"
    : needsRepair
      ? "repair"
      : needsCostGuard
        ? "cost_guard"
        : audit.status === "healthy"
          ? "healthy"
          : "watch";
  const headline = status === "empty"
    ? "模型路线还没有项目样本，别急着判断 Claude、DeepSeek、Kimi、GPT 谁更适合。"
    : status === "repair"
      ? "模型路线已经暴露失败或避用信号，先修路由再继续写。"
      : status === "cost_guard"
        ? "模型路线能跑，但成本或备用路线触发偏高，先限流。"
        : status === "healthy"
          ? "模型路线表现稳定，可以继续小批生产并保留审计。"
          : "模型路线有样本但还不够硬，继续用小批次验证。";
  const successRatePercent = audit.summary.totalTasks > 0
    ? Math.round((audit.summary.succeededTasks / audit.summary.totalTasks) * 100)
    : 0;
  const detail = [
    `成功率 ${successRatePercent}%`,
    `失败率 ${audit.summary.failureRatePercent}%`,
    `成本 $${audit.summary.knownCostUsd.toFixed(4)}`,
    `备用触发 ${audit.budgetCenter.fallbackAttemptRatePercent}%`,
  ].join(" · ");

  return {
    status,
    score: audit.score,
    label: modelRouteStatusLabel(status),
    headline,
    detail,
    actionLabel: status === "empty"
      ? "跑首轮模型样本"
      : status === "repair"
        ? "修模型路线"
        : status === "cost_guard"
          ? "看成本闸门"
          : "看模型审计",
    targetHref: status === "repair" ? "/settings/models" : "#model-task-audit",
    totalTasks: audit.summary.totalTasks,
    successRatePercent,
    failureRatePercent: audit.summary.failureRatePercent,
    knownCostUsd: audit.summary.knownCostUsd,
    averageCostPerSucceededTaskUsd: audit.summary.averageCostPerSucceededTaskUsd,
    fallbackAttemptRatePercent: audit.budgetCenter.fallbackAttemptRatePercent,
    configuredProviders: audit.providerReadiness.configuredProviders,
    enabledProviders: audit.providerReadiness.enabledProviders,
    preferredRouteLabels,
    avoidRouteLabels,
    warnings: audit.riskFlags.slice(0, 3),
    nextActions: audit.nextActions.slice(0, 3),
  };
}

function latestModelRouteRepairDispatch(tasks: ControlGateDispatchTask[] = []) {
  return [...tasks]
    .filter((task) => task.dispatchKey.startsWith("model-route-repair:"))
    .sort((left, right) => new Date(right.reviewLatestAt).getTime() - new Date(left.reviewLatestAt).getTime())[0] ?? null;
}

function modelRouteRepairDispatchFields(
  task: ControlGateDispatchTask | null,
  modelRouteHealth: ModelRouteHealthSummary,
): Pick<ProductionDecisionSummary, "dispatchStatus" | "dispatchLabel" | "dispatchDetail" | "dispatchHref"> {
  if (!task) {
    return {
      dispatchStatus: "none",
      dispatchLabel: "",
      dispatchDetail: "",
      dispatchHref: null,
    };
  }
  const href = `/dispatch#dispatch-${task.dispatchKey}`;
  if (task.state === "completed") {
    const stillRepair = modelRouteHealth.status === "repair";
    return {
      dispatchStatus: stillRepair ? "needs_governance" : "completed",
      dispatchLabel: stillRepair ? "仍需治理" : "已通过",
      dispatchDetail: stillRepair
        ? `${task.title}已完成，但模型路线仍在修复态；继续治理或补一轮复测证据。`
        : `${task.title}已完成，模型路线可回到小批生产判断。`,
      dispatchHref: href,
    };
  }
  return {
    dispatchStatus: "assigned",
    dispatchLabel: "已派单",
    dispatchDetail: `${task.title}待处理：${task.actionLabel || "修复并复测"}。`,
    dispatchHref: href,
  };
}

function emptyProductionDispatch(): Pick<ProductionDecisionSummary, "dispatchStatus" | "dispatchLabel" | "dispatchDetail" | "dispatchHref"> {
  return {
    dispatchStatus: "none",
    dispatchLabel: "",
    dispatchDetail: "",
    dispatchHref: null,
  };
}

function aiPipelineControlPlanDispatchFields(
  plan: AiPipelineControlPlanSummary,
): Pick<ProductionDecisionSummary, "dispatchStatus" | "dispatchLabel" | "dispatchDetail" | "dispatchHref"> {
  if (!plan.hasPlan) return emptyProductionDispatch();

  if (plan.recheckDispatchHref) {
    return {
      dispatchStatus: "needs_governance",
      dispatchLabel: plan.recheckOutcomeLabel || "复检派单",
      dispatchDetail: plan.recheckOutcomeDetail || plan.recheckMessage || "复检已经转入派单，等验收后再恢复批量生产。",
      dispatchHref: plan.recheckActionHref ?? plan.recheckDispatchHref,
    };
  }

  if (plan.canRecheck) {
    return {
      dispatchStatus: "completed",
      dispatchLabel: "待复检",
      dispatchDetail: `修复清单 ${plan.completedCount}/${plan.totalCount} 已完成，下一步复检批量健康。`,
      dispatchHref: "#ai-pipeline",
    };
  }

  return {
    dispatchStatus: "assigned",
    dispatchLabel: "清单处理中",
    dispatchDetail: `修复清单 ${plan.completedCount}/${plan.totalCount}：${plan.nextAction}`,
    dispatchHref: "#ai-pipeline",
  };
}

function buildProductionDecisionSummary(input: {
  batch: AiPipelineBatchSummary;
  batchHealth: AiPipelineBatchHealthSummary;
  aiPipelineControlPlan: AiPipelineControlPlanSummary;
  modelRouteHealth: ModelRouteHealthSummary;
  modelRouteRepairDispatch: ControlGateDispatchTask | null;
}): ProductionDecisionSummary {
  const modelRouteDispatch = modelRouteRepairDispatchFields(input.modelRouteRepairDispatch, input.modelRouteHealth);
  const aiPipelineControlDispatch = aiPipelineControlPlanDispatchFields(input.aiPipelineControlPlan);
  if (input.batchHealth.status === "blocked") {
    const hasControlDispatch = aiPipelineControlDispatch.dispatchStatus !== "none";
    return {
      status: "repair",
      tone: "block",
      label: "先修复",
      headline: "批量健康已经跌线，别继续扩大 AI 写审改。",
      reason: `批量健康：${input.batchHealth.scaleDecisionLabel}；模型路线：${input.modelRouteHealth.label}。先修复失败任务和低分环节，再谈继续生产。`,
      actionExecutable: !hasControlDispatch,
      actionAreaId: hasControlDispatch ? null : "ai-pipeline",
      actionMode: hasControlDispatch ? null : "seed",
      executeLabel: "生成修复清单",
      ...aiPipelineControlDispatch,
      primaryActionLabel: hasControlDispatch
        ? aiPipelineControlDispatch.dispatchStatus === "completed"
          ? "复检批量健康"
          : "看修复清单"
        : "修批量打法",
      primaryTargetHref: hasControlDispatch ? aiPipelineControlDispatch.dispatchHref ?? "#ai-pipeline" : "/failures",
      secondaryActionLabel: input.modelRouteHealth.actionLabel,
      secondaryTargetHref: input.modelRouteHealth.targetHref,
    };
  }

  if (input.modelRouteHealth.status === "repair") {
    return {
      status: "repair",
      tone: "block",
      label: "先修复",
      headline: "模型路线有失败或避用信号，先修路由再继续写。",
      reason: `模型路线：${input.modelRouteHealth.headline} 批量健康：${input.batchHealth.scaleDecisionLabel}。`,
      actionExecutable: modelRouteDispatch.dispatchStatus === "none",
      actionAreaId: modelRouteDispatch.dispatchStatus === "none" ? "model-route" : null,
      actionMode: modelRouteDispatch.dispatchStatus === "none" ? "seed" : null,
      executeLabel: "生成模型路线修复派单",
      ...modelRouteDispatch,
      primaryActionLabel: modelRouteDispatch.dispatchHref ? "查看模型路线派单" : "修模型路线",
      primaryTargetHref: modelRouteDispatch.dispatchHref ?? input.modelRouteHealth.targetHref,
      secondaryActionLabel: input.batchHealth.actionLabel,
      secondaryTargetHref: input.batchHealth.targetHref,
    };
  }

  if (input.modelRouteHealth.status === "cost_guard") {
    return {
      status: "watch",
      tone: "watch",
      label: "先控成本",
      headline: "模型路线能跑，但成本闸门还没稳住。",
      reason: `模型路线：${input.modelRouteHealth.detail}；批量健康：${input.batchHealth.scaleDecisionLabel}。先控成本，再继续放量。`,
      actionExecutable: false,
      actionAreaId: null,
      actionMode: null,
      executeLabel: input.modelRouteHealth.actionLabel,
      dispatchStatus: "none",
      dispatchLabel: "",
      dispatchDetail: "",
      dispatchHref: null,
      primaryActionLabel: input.modelRouteHealth.actionLabel,
      primaryTargetHref: input.modelRouteHealth.targetHref,
      secondaryActionLabel: input.batchHealth.actionLabel,
      secondaryTargetHref: input.batchHealth.targetHref,
    };
  }

  if (input.batchHealth.status === "watch") {
    const hasControlDispatch = aiPipelineControlDispatch.dispatchStatus !== "none";
    return {
      status: "recheck",
      tone: "watch",
      label: "小批复验",
      headline: "批量样本还薄，下一步只跑复验小批。",
      reason: `批量健康：${input.batchHealth.scaleDecisionDetail} 模型路线：${input.modelRouteHealth.label}。`,
      actionExecutable: !hasControlDispatch,
      actionAreaId: hasControlDispatch ? null : "ai-pipeline",
      actionMode: hasControlDispatch ? null : "seed",
      executeLabel: input.batchHealth.executeLabel,
      ...aiPipelineControlDispatch,
      primaryActionLabel: hasControlDispatch
        ? aiPipelineControlDispatch.dispatchStatus === "completed"
          ? "复检批量健康"
          : "看复验清单"
        : input.batchHealth.executeLabel,
      primaryTargetHref: hasControlDispatch ? aiPipelineControlDispatch.dispatchHref ?? "#ai-pipeline" : input.batchHealth.targetHref,
      secondaryActionLabel: input.modelRouteHealth.actionLabel,
      secondaryTargetHref: input.modelRouteHealth.targetHref,
    };
  }

  if (input.batchHealth.status === "empty" || input.modelRouteHealth.status === "empty") {
    return {
      status: "watch",
      tone: "watch",
      label: "先建样本",
      headline: "还缺可复盘样本，先跑一轮推荐小批。",
      reason: `批量健康：${input.batchHealth.scaleDecisionDetail} 模型路线：${input.modelRouteHealth.headline}`,
      actionExecutable: false,
      actionAreaId: null,
      actionMode: null,
      executeLabel: input.batch.canRun ? "执行推荐批次" : input.batch.actionLabel,
      dispatchStatus: "none",
      dispatchLabel: "",
      dispatchDetail: "",
      dispatchHref: null,
      primaryActionLabel: input.batch.canRun ? "执行推荐批次" : input.batch.actionLabel,
      primaryTargetHref: input.batch.targetHref,
      secondaryActionLabel: input.modelRouteHealth.actionLabel,
      secondaryTargetHref: input.modelRouteHealth.targetHref,
    };
  }

  return {
    status: "continue",
    tone: "allow",
    label: "继续生产",
    headline: "批量健康和模型路线都过线，可以继续小步生产。",
    reason: `批量健康：${input.batchHealth.scaleDecisionLabel}；模型路线：${input.modelRouteHealth.label}。继续按推荐批次小步推进，并保留下一批回执。`,
    actionExecutable: false,
    actionAreaId: null,
    actionMode: null,
    executeLabel: "执行推荐批次",
    dispatchStatus: "none",
    dispatchLabel: "",
    dispatchDetail: "",
    dispatchHref: null,
    primaryActionLabel: "执行推荐批次",
    primaryTargetHref: input.batch.targetHref,
    secondaryActionLabel: input.batchHealth.actionLabel,
    secondaryTargetHref: input.batchHealth.targetHref,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseJsonObject(value: string | null | undefined) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function textValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function aiPipelinePlanItem(value: unknown, index: number): AiPipelineControlPlanItem | null {
  if (!isRecord(value)) return null;
  const label = typeof value.label === "string" ? value.label.trim() : "";
  if (!label) return null;
  return {
    id: typeof value.id === "string" && value.id.trim() ? value.id.trim() : `item-${index + 1}`,
    label,
    completed: value.completed === true,
  };
}

function buildAiPipelineControlPlanSummary(audits: ControlBatchAudit[] = []): AiPipelineControlPlanSummary {
  const latest = [...audits]
    .filter((audit) => audit.executionType === "control_action" && (audit.actionId ?? "").startsWith("ai-pipeline-control:"))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0] ?? null;

  if (!latest) {
    return {
      hasPlan: false,
      receiptId: null,
      status: "empty",
      label: "暂无修复清单",
      message: "批量健康一旦进入修复或观察，总控会在这里生成可勾选清单。",
      nextAction: "先根据本书批量健康生成修复或复验清单。",
      targetAnchor: "ai-pipeline",
      completedCount: 0,
      totalCount: 0,
      items: [],
      canRecheck: false,
      recheckLabel: "复检批量健康",
      recheckStatus: null,
      recheckMessage: null,
      recheckOutcomeLabel: "",
      recheckOutcomeTone: "neutral",
      recheckOutcomeDetail: "",
      recheckDispatchKey: null,
      recheckDispatchTitle: null,
      recheckDispatchHref: null,
      recheckActionLabel: null,
      recheckActionHref: null,
      createdAt: null,
    };
  }

  const payload = parseJsonObject(latest.payload);
  const plan = isRecord(payload?.aiPipelineControlPlan) ? payload.aiPipelineControlPlan : null;
  const rawItems = Array.isArray(plan?.items) ? plan.items : stringArray(plan?.nextActions).map((label, index) => ({ id: `item-${index + 1}`, label, completed: false }));
  const items = rawItems
    .map((item, index) => aiPipelinePlanItem(item, index))
    .filter((item): item is AiPipelineControlPlanItem => Boolean(item));
  const completedCount = items.filter((item) => item.completed).length;
  const totalCount = items.length;
  const status = plan?.status === "repair" || plan?.status === "watch" || plan?.status === "continue" || plan?.status === "seed_sample"
    ? plan.status
    : "repair";
  const recheck = isRecord(plan?.recheck) ? plan.recheck : null;
  const recheckStatus = recheck?.status === "small_batch_ready" || recheck?.status === "sample_required" ? recheck.status : null;
  const recheckMessage = recheck
    ? `${typeof recheck.healthLabel === "string" ? recheck.healthLabel : "复检"}：${typeof recheck.detail === "string" ? recheck.detail : latest.recheckDetail ?? latest.message}`
    : null;
  const recheckDispatchKey = typeof recheck?.dispatchKey === "string" && recheck.dispatchKey ? recheck.dispatchKey : null;
  const recheckDispatchTitle = typeof recheck?.dispatchTitle === "string" && recheck.dispatchTitle ? recheck.dispatchTitle : null;
  const recheckDispatchHref = recheckDispatchKey ? `/dispatch?queue=ai_pipeline#dispatch-${recheckDispatchKey}` : null;
  const recheckActionLabel = recheckStatus === "small_batch_ready"
    ? "恢复小批执行"
    : recheckStatus === "sample_required"
      ? "运行 1 章复验"
      : null;
  const recheckActionHref = recheckStatus === "small_batch_ready"
    ? "/tasks#recommended-batch"
    : recheckDispatchHref;
  const recheckOutcomeLabel = recheckStatus === "small_batch_ready"
    ? "可小样本恢复"
    : recheckStatus === "sample_required"
      ? "继续修复"
      : "";
  const recheckOutcomeTone = recheckStatus === "small_batch_ready"
    ? "success"
    : recheckStatus === "sample_required"
      ? "warning"
      : "neutral";
  const recheckOutcomeDetail = recheckStatus === "small_batch_ready"
    ? "复检已允许恢复谨慎小批执行，下一轮仍按小样本观察，不直接放大。"
    : recheckStatus === "sample_required"
      ? recheckDispatchKey
        ? "复检要求先跑 1 章小样本复验；完成派单验收后，再回到总控判断能否恢复。"
        : "复检要求先跑 1 章小样本复验，不能直接恢复批量生产。"
      : "";

  return {
    hasPlan: true,
    receiptId: latest.receiptId,
    status,
    label: latest.label,
    message: latest.message,
    nextAction: totalCount > 0
      ? completedCount === totalCount
        ? "清单已全部完成，下一步复检批量健康，再决定是否恢复小批生产。"
        : `还剩 ${totalCount - completedCount} 项没处理，别急着继续批量生产。`
      : "清单缺少可执行项，重新生成一次批量健康动作。",
    targetAnchor: "ai-pipeline",
    completedCount,
    totalCount,
    items,
    canRecheck: totalCount > 0 && completedCount === totalCount && !recheckDispatchKey,
    recheckLabel: "复检批量健康",
    recheckStatus,
    recheckMessage,
    recheckOutcomeLabel,
    recheckOutcomeTone,
    recheckOutcomeDetail,
    recheckDispatchKey,
    recheckDispatchTitle,
    recheckDispatchHref,
    recheckActionLabel,
    recheckActionHref,
    createdAt: new Date(latest.createdAt).toISOString(),
  };
}

interface AiPipelinePromptMemoryCandidate {
  hasMemory: boolean;
  lifecycleStatus: "active" | "sample_required" | "rollback";
  lifecycleLabel: string;
  healthLabel: string;
  sourceLabel: string;
  nextAction: string;
  actionLabel: string;
  controlDetail: string;
  evidence: string[];
  latestAt: string;
}

function buildAiPipelinePromptFeedback(input: {
  lifecycleStatus: AiPipelinePromptMemorySummary["lifecycleStatus"];
  healthLabel: string;
  evidence: string[];
}): AiPipelinePromptMemorySummary["promptFeedback"] {
  const evidenceText = input.evidence.length > 0 ? input.evidence.join("；") : "暂无恢复证据。";
  if (input.lifecycleStatus === "rollback") {
    return {
      statusLabel: "暂停恢复",
      headline: `${input.healthLabel}，提示词正在强制回滚约束`,
      detail: evidenceText,
      primaryActionLabel: "回滚修复",
    };
  }
  if (input.lifecycleStatus === "sample_required") {
    return {
      statusLabel: "继续观察",
      headline: `${input.healthLabel}，提示词正在限制为小样本`,
      detail: evidenceText,
      primaryActionLabel: "继续复验",
    };
  }
  if (input.lifecycleStatus === "active") {
    return {
      statusLabel: "可恢复",
      headline: `${input.healthLabel}，提示词正在携带恢复约束`,
      detail: evidenceText,
      primaryActionLabel: "继续小批，不放大批",
    };
  }
  return {
    statusLabel: "无反馈",
    headline: "暂无提示词恢复反馈",
    detail: evidenceText,
    primaryActionLabel: "等待复检",
  };
}

function promptHistoryStatus(candidate: AiPipelinePromptMemoryCandidate): AiPipelinePromptMemorySummary["lifecycleStatus"] {
  return candidate.hasMemory ? candidate.lifecycleStatus : "empty";
}

function buildAiPipelinePromptHistory(
  candidates: AiPipelinePromptMemoryCandidate[],
): AiPipelinePromptMemorySummary["history"] {
  const chronological = candidates
    .slice()
    .sort((left, right) => new Date(left.latestAt).getTime() - new Date(right.latestAt).getTime());
  return chronological
    .map((candidate, index) => {
      const status = promptHistoryStatus(candidate);
      const feedback = buildAiPipelinePromptFeedback({
        lifecycleStatus: status,
        healthLabel: candidate.healthLabel,
        evidence: candidate.evidence,
      });
      const previous = index > 0 ? chronological[index - 1] : null;
      const previousFeedback = previous
        ? buildAiPipelinePromptFeedback({
          lifecycleStatus: promptHistoryStatus(previous),
          healthLabel: previous.healthLabel,
          evidence: previous.evidence,
        })
        : null;
      return {
        ...feedback,
        sourceLabel: candidate.sourceLabel,
        latestAt: candidate.latestAt,
        transitionLabel: previousFeedback
          ? previousFeedback.statusLabel === feedback.statusLabel
            ? `保持：${feedback.statusLabel}`
            : `${previousFeedback.statusLabel} -> ${feedback.statusLabel}`
          : `初始：${feedback.statusLabel}`,
      };
    })
    .reverse()
    .slice(0, 5);
}

function compactEvidence(items: Array<string | null | undefined>) {
  return items
    .map((item) => item?.trim() ?? "")
    .filter((item, index, all): item is string => Boolean(item) && all.indexOf(item) === index)
    .slice(0, 4);
}

function buildAiPipelinePromptMemoryGate(
  status: AiPipelinePromptMemorySummary["lifecycleStatus"],
  options: { hasMemory: boolean; sourceLabel?: string | null } = { hasMemory: false },
): Pick<AiPipelinePromptMemorySummary, "gateTone" | "gateStatusLabel" | "gateStatusDetail" | "gateActionMode" | "gateActionLabel" | "gateActionHref"> {
  if (status === "rollback") {
    const sourcePrefix = options.sourceLabel ? `${options.sourceLabel}：` : "";
    return {
      gateTone: "blocked",
      gateStatusLabel: "禁止放量",
      gateStatusDetail: `${sourcePrefix}先停用批量恢复，只能回滚到 1 章复验；开头钩子、章末追读和质量线通过后再重新观察。`,
      gateActionMode: "rollback",
      gateActionLabel: "派 1 章复验",
      gateActionHref: null,
    };
  }
  if (status === "sample_required") {
    return {
      gateTone: "watch",
      gateStatusLabel: "等待样本",
      gateStatusDetail: "只允许 1 章小样本复验；补齐失败原因、正文质量和模型路线证据后再考虑小批。",
      gateActionMode: "rollback",
      gateActionLabel: "派 1 章复验",
      gateActionHref: null,
    };
  }
  if (status === "active") {
    return {
      gateTone: "ready",
      gateStatusLabel: "小批观察",
      gateStatusDetail: "只允许小批观察，持续盯成功率、平均质量和连续失败；任何跌线都回滚到小样本。",
      gateActionMode: "link",
      gateActionLabel: "去小批执行",
      gateActionHref: "/tasks#recommended-batch",
    };
  }
  return {
    gateTone: "empty",
    gateStatusLabel: "无恢复证据",
    gateStatusDetail: options.hasMemory
      ? "恢复证据不可用，等待新复检后再写入提示词。"
      : "没有可用恢复证据，等待新复检或小批恢复产生真实回执。",
    gateActionMode: null,
    gateActionLabel: null,
    gateActionHref: null,
  };
}

function buildAiPipelinePromptMemoryCandidate(audit: ControlBatchAudit): AiPipelinePromptMemoryCandidate | null {
  const payload = parseJsonObject(audit.payload);
  const memoryControl = isRecord(payload?.aiPipelinePromptMemoryControl) ? payload.aiPipelinePromptMemoryControl : null;
  const memoryAction = memoryControl?.action === "confirm" || memoryControl?.action === "rollback" || memoryControl?.action === "clear"
    ? memoryControl.action
    : null;
  if (memoryAction) {
    const label = textValue(memoryControl?.label) ?? (memoryAction === "clear" ? "清除旧记忆" : memoryAction === "rollback" ? "人工回滚" : "人工确认");
    const detail = textValue(memoryControl?.detail) ?? audit.message;
    if (memoryAction === "clear") {
      return {
        hasMemory: false,
        lifecycleStatus: "active",
        lifecycleLabel: "已清除",
        healthLabel: label,
        sourceLabel: audit.label,
        nextAction: "旧恢复记忆已清除，后续提示词不再携带这条证据。",
        actionLabel: "等待新复检",
        controlDetail: detail,
        evidence: compactEvidence([label, detail, audit.message]),
        latestAt: new Date(audit.createdAt).toISOString(),
      };
    }
    return {
      hasMemory: true,
      lifecycleStatus: memoryAction === "rollback" ? "rollback" : "active",
      lifecycleLabel: memoryAction === "rollback" ? "回滚小样本" : "继续生效",
      healthLabel: label,
      sourceLabel: audit.label,
      nextAction: memoryAction === "rollback"
        ? "回滚到小样本修复，不要继续扩大批量。"
        : "继续小批观察，禁止直接恢复大批量。",
      actionLabel: memoryAction === "rollback" ? "回滚到 1 章复验" : "继续使用恢复记忆",
      controlDetail: detail,
      evidence: compactEvidence([label, detail, audit.message]),
      latestAt: new Date(audit.createdAt).toISOString(),
    };
  }

  const controlPlan = isRecord(payload?.aiPipelineControlPlan) ? payload.aiPipelineControlPlan : null;
  const controlRecheck = isRecord(controlPlan?.recheck) ? controlPlan.recheck : null;
  const recheckStatus = controlRecheck?.status === "small_batch_ready" || controlRecheck?.status === "sample_required"
    ? controlRecheck.status
    : null;

  if (recheckStatus) {
    const healthLabel = textValue(controlRecheck?.healthLabel) ?? (recheckStatus === "small_batch_ready" ? "可小批恢复" : "继续小样本复验");
    const detail = textValue(controlRecheck?.detail) ?? textValue(audit.recheckDetail) ?? audit.message;
    return {
      hasMemory: true,
      lifecycleStatus: recheckStatus === "small_batch_ready" ? "active" : "sample_required",
      lifecycleLabel: recheckStatus === "small_batch_ready" ? "继续生效" : "等待小样本",
      healthLabel,
      sourceLabel: audit.label,
      nextAction: recheckStatus === "small_batch_ready"
        ? "只恢复小批执行，继续观察开头钩子、章末追读、质量分和失败率。"
        : "先修复正文质量，再只跑 1 章小样本复验。",
      actionLabel: recheckStatus === "small_batch_ready" ? "继续小批观察" : "运行 1 章复验",
      controlDetail: recheckStatus === "small_batch_ready"
        ? "失效条件：后续小批成功率跌破 80%、平均质量低于 85，或出现连续失败，就回滚到小样本。"
        : "恢复记忆还不能放大；先补失败原因和正文质量，再用 1 章小样本验收。",
      evidence: compactEvidence([
        `复检结论：${healthLabel}`,
        detail,
        audit.message,
      ]),
      latestAt: new Date(audit.createdAt).toISOString(),
    };
  }

  const recheck = isRecord(payload?.aiPipelineRecheck) ? payload.aiPipelineRecheck : null;
  const mode = recheck?.mode === "small_batch_resume" || recheck?.mode === "sample_recheck" ? recheck.mode : null;
  if (!mode) return null;

  const route = isRecord(payload?.routeEffectSummary) ? payload.routeEffectSummary : null;
  const batchReceipt = isRecord(payload?.batchReceipt) ? payload.batchReceipt : null;
  const successRate = numberValue(route?.successRatePercent);
  const qualityScore = numberValue(route?.averageQualityScore);
  const healthLabel = mode === "small_batch_resume" ? "恢复小批回流" : "小样本复验回流";
  const batchStatus = batchReceiptStatus(batchReceipt?.status);
  const shouldRollback = batchStatus === "repair" || batchStatus === "review_quality";
  const nextAction = batchStatus === "repair" || batchStatus === "review_quality"
    ? "回滚到小样本修复，不要继续扩大批量。"
    : "继续小批观察，禁止直接恢复大批量。";

  return {
    hasMemory: true,
    lifecycleStatus: shouldRollback ? "rollback" : batchStatus === "watch_cost" ? "sample_required" : "active",
    lifecycleLabel: shouldRollback ? "回滚小样本" : batchStatus === "watch_cost" ? "等待复验" : "继续生效",
    healthLabel,
    sourceLabel: audit.label,
    nextAction,
    actionLabel: shouldRollback ? "回滚到 1 章复验" : batchStatus === "watch_cost" ? "先看模型成本" : "继续小批观察",
    controlDetail: shouldRollback
      ? "暂停小批，把低分章节回滚到 1 章复验；确认开头钩子、章末追读和质量线恢复后再放量。"
      : batchStatus === "watch_cost"
        ? "成本或备用路线触发异常，先看模型路线，再决定是否保留恢复记忆。"
        : "失效条件：后续小批成功率跌破 80%、平均质量低于 85，或出现连续失败，就回滚到小样本。",
    evidence: compactEvidence([
      textValue(batchReceipt?.headline) ?? audit.label,
      textValue(batchReceipt?.detail) ?? audit.message,
      successRate !== null ? `成功率 ${successRate}%` : null,
      qualityScore !== null ? `质量 ${qualityScore}` : null,
    ]),
    latestAt: new Date(audit.createdAt).toISOString(),
  };
}

export function buildAiPipelinePromptMemorySummary(audits: ControlBatchAudit[] = []): AiPipelinePromptMemorySummary {
  const candidates = audits
    .map(buildAiPipelinePromptMemoryCandidate)
    .filter((item): item is AiPipelinePromptMemoryCandidate => Boolean(item))
    .sort((left, right) => new Date(right.latestAt).getTime() - new Date(left.latestAt).getTime());
  const candidate = candidates[0] ?? null;
  const history = buildAiPipelinePromptHistory(candidates);

  if (!candidate) {
    const gate = buildAiPipelinePromptMemoryGate("empty", { hasMemory: false });
    return {
      hasMemory: false,
      lifecycleStatus: "empty",
      lifecycleLabel: "无记忆",
      promptFeedback: buildAiPipelinePromptFeedback({
        lifecycleStatus: "empty",
        healthLabel: "无恢复证据",
        evidence: [],
      }),
      history,
      ...gate,
      label: "暂无提示词记忆",
      headline: "AI 写审改还没有恢复证据可带入提示词。",
      detail: "先完成一次复检或小批恢复，总控会把结论变成后续初稿、审稿、二改的约束。",
      promptBlock: "",
      nextAction: "先跑复检或小批恢复，拿到真实回执后再写入提示词记忆。",
      actionLabel: "先跑复检",
      controlDetail: "没有恢复证据时不写入额外约束，避免模型被旧判断误导。",
      evidence: [],
      sourceLabel: null,
      latestAt: null,
      targetHref: "#ai-pipeline",
    };
  }

  if (!candidate.hasMemory) {
    const gate = buildAiPipelinePromptMemoryGate("empty", { hasMemory: true, sourceLabel: candidate.healthLabel });
    return {
      hasMemory: false,
      lifecycleStatus: "empty",
      lifecycleLabel: candidate.lifecycleLabel,
      promptFeedback: buildAiPipelinePromptFeedback({
        lifecycleStatus: "empty",
        healthLabel: candidate.healthLabel,
        evidence: candidate.evidence,
      }),
      history,
      ...gate,
      label: "提示词记忆已清除",
      headline: "旧恢复记忆已经被清除，后续 AI 写审改不会继续携带这条证据。",
      detail: "等下一次复检或小批恢复产生新回执后，再写入新的提示词约束。",
      promptBlock: "",
      nextAction: candidate.nextAction,
      actionLabel: candidate.actionLabel,
      controlDetail: candidate.controlDetail,
      evidence: candidate.evidence,
      sourceLabel: candidate.sourceLabel,
      latestAt: candidate.latestAt,
      targetHref: "#ai-pipeline",
    };
  }

  const promptBlock = [
    "AI 写审改恢复证据：",
    `- ${candidate.healthLabel}：${candidate.evidence.slice(0, 3).join("；")}。`,
    `- 下一步：${candidate.nextAction}。`,
    "- 禁区：不要直接恢复大批量，不要弱化开头钩子和章末追读。",
  ].join("\n");
  const gate = buildAiPipelinePromptMemoryGate(candidate.lifecycleStatus, {
    hasMemory: candidate.hasMemory,
    sourceLabel: candidate.healthLabel,
  });

  return {
    hasMemory: true,
    lifecycleStatus: candidate.lifecycleStatus,
    lifecycleLabel: candidate.lifecycleLabel,
    promptFeedback: buildAiPipelinePromptFeedback({
      lifecycleStatus: candidate.lifecycleStatus,
      healthLabel: candidate.healthLabel,
      evidence: candidate.evidence,
    }),
    history,
    ...gate,
    label: "提示词已携带恢复记忆",
    headline: `${candidate.healthLabel}，后续 AI 写审改会带上这条恢复证据。`,
    detail: "初稿、审稿、二改都会先按恢复证据守住开头钩子、章末追读和小样本节奏。",
    promptBlock,
    nextAction: candidate.nextAction,
    actionLabel: candidate.actionLabel,
    controlDetail: candidate.controlDetail,
    evidence: candidate.evidence,
    sourceLabel: candidate.sourceLabel,
    latestAt: candidate.latestAt,
    targetHref: "#ai-pipeline",
  };
}

function controlAssetAreaLabel(areaId: string) {
  if (areaId === "characters") return "人物弧光";
  if (areaId === "world") return "世界观资料";
  if (areaId === "story-lines") return "主线伏笔";
  return "资料生成";
}

function normalizeControlAssetStatus(status: unknown, score: number): ControlAssetQualityReport["status"] {
  if (status === "pass" || status === "warn" || status === "fail") return status;
  if (score >= 75) return "pass";
  if (score >= 60) return "warn";
  return "fail";
}

function arrayCount(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function inferControlAssetArea(generated: Record<string, unknown> | null) {
  if (!generated) return "unknown";
  if (arrayCount(generated.characters) > 0) return "characters";
  if (arrayCount(generated.worldEntries) > 0) return "world";
  if (arrayCount(generated.plotThreads) > 0 || arrayCount(generated.foreshadows) > 0) return "story-lines";
  return "unknown";
}

function generatedAssetCount(generated: Record<string, unknown> | null, areaId: string) {
  if (!generated) return 0;
  if (areaId === "characters") return arrayCount(generated.characters);
  if (areaId === "world") return arrayCount(generated.worldEntries);
  if (areaId === "story-lines") return arrayCount(generated.plotThreads) + arrayCount(generated.foreshadows);
  return arrayCount(generated.characters) + arrayCount(generated.worldEntries) + arrayCount(generated.plotThreads) + arrayCount(generated.foreshadows);
}

function buildControlAssetQualityReports(tasks: ControlAiTask[]): ControlAssetQualityReport[] {
  return tasks
    .filter((task) => task.taskType === "control_asset_generate" && task.outputText)
    .map((task) => {
      const output = parseJsonObject(task.outputText);
      if (!output) return null;
      const qualityGate = isRecord(output.qualityGate) ? output.qualityGate : null;
      if (!qualityGate) return null;

      const generated = isRecord(output.generated) ? output.generated : null;
      const snapshot = parseJsonObject(task.inputSnapshot);
      const snapshotArea = typeof snapshot?.areaId === "string" ? snapshot.areaId : null;
      const areaId = snapshotArea ?? inferControlAssetArea(generated);
      const score = clampScore(typeof qualityGate.score === "number" ? qualityGate.score : 0);
      const repair = isRecord(output.repair) ? output.repair : null;

      return {
        taskId: task.id,
        areaId,
        areaLabel: controlAssetAreaLabel(areaId),
        score,
        status: normalizeControlAssetStatus(qualityGate.status, score),
        repaired: repair?.attempted === true,
        createdCount: generatedAssetCount(generated, areaId),
        issues: stringArray(qualityGate.issues),
        nextActions: stringArray(qualityGate.nextActions),
        createdAt: new Date(task.createdAt).toISOString(),
      } satisfies ControlAssetQualityReport;
    })
    .filter((report): report is ControlAssetQualityReport => Boolean(report))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 3);
}

function buildPlatformFeedbackSummary(receipts: ControlPlatformFeedbackReceipt[] = []): PlatformFeedbackSummary {
  const recent = [...receipts]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 5);
  const latest = recent[0] ?? null;
  const successCount = recent.filter((item) => item.severity === "success").length;
  const needsActionCount = recent.filter((item) => item.severity === "needs_action").length;

  if (!latest) {
    return {
      total: 0,
      successCount: 0,
      needsActionCount: 0,
      latest: null,
      recent,
      headline: "还没有平台反哺链路回执，总控缺一条真实运营证据。",
      nextAction: "去平台导出中心启动一次知识库反哺链。",
      targetAnchor: "platform-knowledge",
    };
  }

  return {
    total: receipts.length,
    successCount,
    needsActionCount,
    latest,
    recent,
    headline: `${latest.platformName} 最近执行了「${latest.actionLabel}」，已推进：${latest.completedStepLabel}。`,
    nextAction: latest.nextAction,
    targetAnchor: latest.href.replace(/^#/, "") || "platform-strategy-ranking",
  };
}

function latestMetricForPlatform(metrics: PlatformPublishMetricInput[] = [], platformId: string) {
  return [...metrics]
    .filter((metric) => metric.platformId === platformId)
    .sort((left, right) => new Date(right.snapshotDate).getTime() - new Date(left.snapshotDate).getTime())[0] ?? null;
}

function platformMetricScore(metric: PlatformPublishMetricInput | null) {
  if (!metric) return 0;
  const volumeScore = Math.min(25, metric.views / 40);
  const clickRate = percent(metric.clicks, metric.views);
  const favoriteRate = percent(metric.favorites, metric.views);
  const followRate = percent(metric.follows, metric.views);
  const conversionScore = Math.min(30, clickRate * 1.2 + favoriteRate * 2 + followRate * 2.5);
  const engagementScore = Math.min(15, metric.comments * 1.2 + metric.paidReads * 2);
  const contract = `${metric.contractStatus} ${metric.editorFeedback}`.toLowerCase();
  const contractScore = /签约|signed|contracted|通过/.test(contract)
    ? 30
    : /拒|reject|fail|淘汰/.test(contract)
      ? -15
      : /编辑|editor|继续|观察|pending/.test(contract)
        ? 8
        : 0;
  return clampScore(volumeScore + conversionScore + engagementScore + contractScore);
}

function percent(part: number, total: number) {
  if (total <= 0) return 0;
  return (part / total) * 100;
}

function buildPlatformEvidenceLoopSummary(input: {
  platform: PlatformProfile;
  metrics?: PlatformPublishMetricInput[];
  receipts?: ControlPlatformFeedbackReceipt[];
}): PlatformEvidenceLoopSummary {
  const platformReceipts = (input.receipts ?? [])
    .filter((receipt) => receipt.platformId === input.platform.id)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  const latestMetric = latestMetricForPlatform(input.metrics, input.platform.id);
  const successCount = platformReceipts.filter((receipt) => receipt.severity === "success").length;
  const needsActionCount = platformReceipts.filter((receipt) => receipt.severity === "needs_action").length;
  const gateCompletionCount = platformReceipts.filter((receipt) => receipt.id.startsWith("gate-dispatch-completion:")).length;
  const feedbackScore = Math.min(35, successCount * 10 + gateCompletionCount * 8) - Math.min(25, needsActionCount * 12);
  const metricScore = platformMetricScore(latestMetric);
  const hasEvidence = platformReceipts.length > 0 || Boolean(latestMetric);
  const score = clampScore((hasEvidence ? 20 : 0) + feedbackScore + metricScore * 0.45);
  const evidence = [
    platformReceipts.length ? `反哺回执 ${platformReceipts.length} 条，其中 Gate 完成回灌 ${gateCompletionCount} 条。` : "还没有平台反哺回执。",
    latestMetric ? `最新数据：曝光 ${latestMetric.views}，点击 ${latestMetric.clicks}，收藏 ${latestMetric.favorites}，追读 ${latestMetric.follows}。` : "还没有发布效果数据。",
    needsActionCount ? `仍有 ${needsActionCount} 条反哺停点未收口。` : "当前没有未收口反哺停点。",
  ];

  if (!hasEvidence) {
    return {
      score: 0,
      status: "empty",
      label: "缺证据",
      platformId: input.platform.id,
      platformName: input.platform.name,
      headline: `${input.platform.name} 还没有形成证据闭环，别急着判断好坏。`,
      nextAction: "先保存证据基准，生成投稿资产，再收第一轮真实数据。",
      actionLabel: "启动证据闭环",
      targetAnchor: "platform-knowledge",
      evidence,
      metricsCount: 0,
      feedbackCount: 0,
      gateCompletionCount: 0,
    };
  }

  if (score >= 80) {
    return {
      score,
      status: "scale",
      label: "可加码",
      platformId: input.platform.id,
      platformName: input.platform.name,
      headline: `${input.platform.name} 证据闭环够硬，可以小步加码。`,
      nextAction: "扩大一个可控变量，保留旧版本做对照，下一轮继续回填数据。",
      actionLabel: "进入小步加码",
      targetAnchor: "platform-export",
      evidence,
      metricsCount: latestMetric ? 1 : 0,
      feedbackCount: platformReceipts.length,
      gateCompletionCount,
    };
  }

  if (score >= 60) {
    return {
      score,
      status: "watch",
      label: "继续观察",
      platformId: input.platform.id,
      platformName: input.platform.name,
      headline: `${input.platform.name} 有证据，但还不到放量程度。`,
      nextAction: "补一轮发布效果或完成未收口派单，再决定是否加码。",
      actionLabel: "补一轮证据",
      targetAnchor: "platform-export",
      evidence,
      metricsCount: latestMetric ? 1 : 0,
      feedbackCount: platformReceipts.length,
      gateCompletionCount,
    };
  }

  if (score >= 40) {
    return {
      score,
      status: "repair",
      label: "先修打法",
      platformId: input.platform.id,
      platformName: input.platform.name,
      headline: `${input.platform.name} 证据偏软，先别扩大投入。`,
      nextAction: "优先修标题简介、前三章钩子或投稿资产，再让 Gate 派单验收。",
      actionLabel: "修平台打法",
      targetAnchor: "first-three-rewrite",
      evidence,
      metricsCount: latestMetric ? 1 : 0,
      feedbackCount: platformReceipts.length,
      gateCompletionCount,
    };
  }

  return {
    score,
    status: "pause",
    label: "暂停扩量",
    platformId: input.platform.id,
    platformName: input.platform.name,
    headline: `${input.platform.name} 当前证据不支持继续投入。`,
    nextAction: "暂停加码，先换平台小样本或重做开头包装。",
    actionLabel: "暂停并换样本",
    targetAnchor: "platform-strategy-ranking",
    evidence,
    metricsCount: latestMetric ? 1 : 0,
    feedbackCount: platformReceipts.length,
    gateCompletionCount,
  };
}

export function buildProjectControlDashboard(input: ProjectControlDashboardInput): ProjectControlDashboard {
  const characterDashboard = buildCharacterArcDashboard(input.characters);
  const worldDashboard = buildWorldBibleDashboard(input.worldEntries);
  const storyLineDashboard = buildStoryLineDashboard(input.chapters, input.foreshadows, input.plotThreads);
  const production = buildChapterProductionSchedule({
    project: input.project,
    platform: input.platform,
    chapters: input.chapters,
    outlineNodes: input.outlineNodes,
    characters: input.characters,
    worldEntries: input.worldEntries,
    foreshadows: input.foreshadows,
    plotThreads: input.plotThreads,
  });
  const batchDraft = buildBatchDraftQueue(input.chapters, input.aiTasks as BatchDraftTask[], input.platform);
  const reviewPipeline = buildReviewPipelineQueue(input.chapters, input.aiTasks);
  const serialization = buildSerializationOpsDashboard({
    project: input.project,
    platform: input.platform,
    chapters: input.chapters,
    aiTasks: input.aiTasks,
    submissionChecklist: input.submissionChecklist,
    worldEntries: input.worldEntries,
  });
  const platformExport = buildPlatformPublishExportCenter({
    project: input.project,
    targetPlatform: input.platform,
    chapters: input.chapters,
    aiTasks: input.aiTasks,
    publishSnapshots: input.publishSnapshots,
    submissionAssets: input.submissionAssets,
    submissionAssetVersions: input.submissionAssetVersions,
    platformPublishMetrics: input.platformPublishMetrics,
    submissionChecklist: input.submissionChecklist,
  });
  const targetPackage = platformExport.packages.find((pack) => pack.platformId === input.platform.id) ?? platformExport.packages[0];
  const primaryPlatformId = platformExport.strategyVerdict.primary?.platformId ?? null;
  const evidenceGaps = platformExport.strategyVerdict.primary
    ? platformExport.platformStrategy.find((item) => item.platformId === platformExport.strategyVerdict.primary?.platformId)?.reviewDecision.evidenceLedger.missingSignals.slice(0, 3) ?? []
    : [];
  const verdictAction = platformVerdictAction(primaryPlatformId, platformExport.strategyVerdict.nextAction, evidenceGaps);
  const platformVerdict: PlatformControlVerdictSummary = {
    status: platformExport.strategyVerdict.status,
    headline: platformExport.strategyVerdict.headline,
    nextAction: platformExport.strategyVerdict.nextAction,
    ...verdictAction,
    primaryPlatformName: platformExport.strategyVerdict.primary?.platformName ?? null,
    primaryPlatformId,
    primaryScore: platformExport.strategyVerdict.primary?.score ?? 0,
    primaryEvidenceScore: platformExport.strategyVerdict.primary?.evidenceScore ?? 0,
    backupPlatformNames: platformExport.strategyVerdict.backups.map((item) => item.platformName),
    blockedPlatformNames: platformExport.strategyVerdict.blocked.map((item) => item.platformName),
    evidenceGaps,
    targetAnchor: "platform-strategy-verdict",
  };
  const startTactic = findProjectStartTacticSummary(input.worldEntries);
  const outline = outlineScore(input.outlineNodes);
  const productionScore = production.dashboard.totalItems > 0
    ? ratio(
      production.dashboard.outlineReadyItems * 0.45
        + production.dashboard.chapterCardItems
        + production.dashboard.draftingItems
        + production.dashboard.doneItems,
      production.dashboard.totalItems,
    ) * 100
    : 0;
  const aiPipelineScore = input.chapters.length > 0
    ? ratio(
      input.chapters.filter((chapter) => chapter.wordCount > 0).length
        + input.aiTasks.filter((task) => task.taskType === "chapter_review" && task.status === "succeeded").length
        + input.aiTasks.filter((task) => task.taskType === "chapter_second_pass" && task.status === "succeeded").length,
      input.chapters.length * 3,
    ) * 100
    : 0;
  const aiPipelineBatch = buildAiPipelineBatchSummary(batchDraft, reviewPipeline);
  const aiPipelineRecentBatch = buildAiPipelineRecentBatchSummary(input.gateActionAudits);
  const aiPipelineBatchHealth = buildAiPipelineBatchHealthSummary(input.gateActionAudits);
  const aiPipelineControlPlan = buildAiPipelineControlPlanSummary(input.gateActionAudits);
  const aiPipelinePromptMemory = buildAiPipelinePromptMemorySummary(input.gateActionAudits);
  const modelRouteHealth = buildModelRouteHealthSummary(input);
  const modelRouteRepairDispatch = latestModelRouteRepairDispatch(input.gateDispatchTasks);
  const productionDecision = buildProductionDecisionSummary({
    batch: aiPipelineBatch,
    batchHealth: aiPipelineBatchHealth,
    aiPipelineControlPlan,
    modelRouteHealth,
    modelRouteRepairDispatch,
  });
  const aiPipelineBaseEvidence = `${batchDraft.readyCandidates} 章可初稿，${reviewPipeline.reviewReadyCount} 章待审，${reviewPipeline.secondPassReadyCount} 章可二改。`;
  const aiPipelineArea = aiPipelineAreaDecision({
    baseScore: aiPipelineScore,
    baseEvidence: aiPipelineBaseEvidence,
    batch: aiPipelineBatch,
    health: aiPipelineBatchHealth,
  });

  const areas = [
    area("outline", "大纲骨架", outline, `${input.outlineNodes.length} 个大纲节点。`, "补齐开头、结尾、主干、分支、叶片和土壤。", "补大纲骨架", "outline-tree", true, "生成骨架"),
    area("characters", "人物弧光", characterDashboard.averageCompleteness, `${characterDashboard.completeCharacters}/${characterDashboard.totalCharacters} 个人物完整。`, characterDashboard.nextActions[0], "补人物弧光", "character-arc", true, "补人物卡", true, "AI 生成人物"),
    area("world", "世界观资料", ratio(worldDashboard.completeEntries, Math.max(worldDashboard.totalEntries, 3)) * 100, `${worldDashboard.completeEntries}/${worldDashboard.totalEntries} 条设定完整。`, worldDashboard.nextActions[0], "补世界观", "world-bible", true, "补设定卡", true, "AI 生成设定"),
    area("story-lines", "伏笔主线", ratio(storyLineDashboard.foreshadowReady + storyLineDashboard.threadResolved, Math.max(storyLineDashboard.foreshadowTotal + storyLineDashboard.threadTotal, 2)) * 100, `${storyLineDashboard.foreshadowReady} 个伏笔已回收，${storyLineDashboard.threadResolved} 条剧情线有终点。`, storyLineDashboard.nextActions[0], "补主线伏笔", "story-lines", true, "补线索卡", true, "AI 生成线索"),
    area("production", "章节生产", productionScore, `${production.dashboard.totalItems} 张排期卡，${production.dashboard.blockedItems} 张卡住。`, production.dashboard.nextActions[0], "排章节生产", "chapter-production", true, "生成章节卡"),
    area("ai-pipeline", "AI 写审改", aiPipelineArea.score, aiPipelineArea.evidence, aiPipelineArea.nextAction, aiPipelineArea.actionLabel, "ai-pipeline", aiPipelineArea.canExecute, aiPipelineArea.executeLabel),
    area("ops", "连载运营", average([serialization.submissionReadinessPercent, serialization.publishReadyCount > 0 ? 100 : 40]), `${serialization.publishReadyCount} 章可发布，投稿准备度 ${serialization.submissionReadinessPercent}%。`, serialization.actions[0]?.detail ?? "继续推进运营动作。", "看运营动作", "serialization-ops"),
    area(
      "export",
      "平台导出",
      targetPackage.canExport ? 95 : platformExport.totalPublishableChapters > 0 ? targetPackage.preflight.score : 30,
      `${platformExport.packages.length} 个平台发布包，${platformExport.totalPublishableChapters} 章有正文，${targetPackage.platformName} 质检 ${targetPackage.preflight.score} 分。`,
      targetPackage.canExport ? "下载发布包并人工最终检查。" : targetPackage.repairPath.headline,
      "处理发布缺口",
      "platform-export",
    ),
  ];
  const storyFoundation = buildStoryFoundationSummary(areas);
  const overallScore = clampScore(average(areas.map((item) => item.score)));
  const priorityActions = [...areas]
    .sort((left, right) => left.score - right.score || left.label.localeCompare(right.label))
    .slice(0, 4)
    .map((item): ControlPriorityAction => ({
      id: `priority-${item.id}`,
      areaId: item.id,
      label: item.label,
      score: item.score,
      severity: actionSeverity(item.status),
      reason: item.nextAction,
      actionLabel: item.actionLabel,
      targetAnchor: item.targetAnchor,
      canExecute: item.canExecute,
      executeLabel: item.executeLabel,
      canGenerate: item.canGenerate,
      generateLabel: item.generateLabel,
    }));
  const criticalActions = priorityActions.map((item) => `${item.label}：${item.reason}`);
  const controlAssetQualityReports = buildControlAssetQualityReports(input.aiTasks);
  const platformFeedback = buildPlatformFeedbackSummary(input.platformKnowledgeFeedbackReceipts);
  const platformEvidenceLoop = buildPlatformEvidenceLoopSummary({
    platform: input.platform,
    metrics: input.platformPublishMetrics,
    receipts: input.platformKnowledgeFeedbackReceipts,
  });

  return {
    overallScore,
    verdict: verdict(overallScore),
    productionDecision,
    platformVerdict,
    platformFeedback,
    platformEvidenceLoop,
    startTactic,
    startDecision: buildProjectStartDecision(startTactic),
    storyFoundation,
    aiPipelineBatch,
    aiPipelineRecentBatch,
    aiPipelineBatchHealth,
    aiPipelineControlPlan,
    aiPipelinePromptMemory,
    modelRouteHealth,
    areas,
    priorityActions,
    criticalActions,
    controlAssetQualityReports,
    metrics: {
      chapters: input.chapters.length,
      words: input.project.currentWordCount,
      outlineNodes: input.outlineNodes.length,
      characters: input.characters.length,
      worldEntries: input.worldEntries.length,
      publishableChapters: platformExport.totalPublishableChapters,
    },
  };
}
