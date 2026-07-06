"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  actionFromRunResult,
  buildPublishRepairExitPrompt,
  labelForAction,
  normalizeRunResult,
  pendingResultFromAction,
  publishRepairResultForAction,
  type PublishRepairNextAction,
  type PublishRepairRunResult,
  type RawPublishRepairRunResult,
} from "@/lib/projects/publishRepairRunResults";
import { addGateActionReceipt, buildGatePublishEffectReceipt } from "@/lib/projects/gateActionReceipts";
import { buildSubmissionAssetAdoptionReviewReceipt, buildSubmissionAssetEditorReview } from "@/lib/projects/platformPublishExport";

type PublishRepairActionKind =
  | "edit_chapter"
  | "adopt_candidate"
  | "run_chapter_review"
  | "run_second_pass"
  | "open_submission_package"
  | "add_publish_chapters";

interface PublishRepairAction {
  id: string;
  kind: PublishRepairActionKind;
  priority: "high" | "medium" | "low";
  label: string;
  detail: string;
  chapterId?: string;
  chapterTitle?: string;
  candidateRevisionId?: string;
}

interface PublishRepairHistoryItem {
  id: string;
  actionKind: PublishRepairActionKind;
  label: string;
  chapterId: string | null;
  chapterTitle: string;
  status: string;
  score: number | null;
  shouldSecondPass: boolean | null;
  message: string;
  createdAt: string;
}

interface PublishRepairPathStep {
  id: string;
  kind: PublishRepairActionKind;
  order: number;
  status: "active" | "queued";
  priority: "high" | "medium" | "low";
  label: string;
  detail: string;
  executable: boolean;
  chapterId?: string;
  chapterTitle?: string;
  candidateRevisionId?: string;
}

interface PublishRepairPathGroup {
  kind: PublishRepairActionKind;
  label: string;
  count: number;
  executableCount: number;
  manualCount: number;
  chapterTitles: string[];
}

interface PublishRepairPath {
  status: "ready" | "needs_repair";
  headline: string;
  nextStep: PublishRepairPathStep | null;
  steps: PublishRepairPathStep[];
  totalActions: number;
  executableActions: number;
  manualActions: number;
  affectedChapters: number;
  blockedCount: number;
  warningCount: number;
  groups: PublishRepairPathGroup[];
}

interface PublishPackageVersionItem {
  id: string;
  platformId: string;
  platformName: string;
  title: string;
  action: string;
  chapterCount: number;
  wordCount: number;
  preflightScore: number;
  canExport: boolean;
  createdAt: string;
}

type PublishPackageVersionActionFilter = "all" | "copy" | "download" | "archive" | "snapshot" | "restore";

interface PublishPackageVersionDetail extends PublishPackageVersionItem {
  logline: string;
  synopsis: string;
  tags: string[];
  markdown: string;
}

interface PublishPackageArchiveGroupPlatform {
  id: string;
  platformId: string;
  platformName: string;
  chapterCount: number;
  wordCount: number;
  preflightScore: number;
  canExport: boolean;
}

interface PublishPackageArchiveGroup {
  createdAt: string;
  platformCount: number;
  totalWordCount: number;
  platforms: PublishPackageArchiveGroupPlatform[];
}

interface PublishPackageVersionComparisonItem {
  label: string;
  current: string;
  version: string;
  changed: boolean;
}

interface PublishPackageVersionComparison {
  changedCount: number;
  items: PublishPackageVersionComparisonItem[];
}

interface PublishPackageVersionDetailState {
  version: PublishPackageVersionDetail;
  comparison: PublishPackageVersionComparison;
  archiveGroup?: PublishPackageArchiveGroup | null;
}

interface PublishPreflight {
  score: number;
  canExport: boolean;
  passed: string[];
  blocked: string[];
  warnings: string[];
  repairActions: PublishRepairAction[];
}

interface PlatformFinalGateItem {
  id: string;
  label: string;
  status: "pass" | "fix" | "block";
  detail: string;
  actionLabel: string;
  href: string;
}

interface PlatformFinalSubmissionGate {
  status: "ready_to_submit" | "fix_first" | "do_not_submit";
  label: string;
  headline: string;
  verdict: string;
  nextAction: string;
  score: number;
  blockers: string[];
  items: PlatformFinalGateItem[];
}

interface PlatformPublishChapter {
  id: string;
  order: number;
  title: string;
  formattedTitle: string;
  wordCount: number;
  status: string;
  ready: boolean;
  preflight: PublishPreflight;
  repairActions: PublishRepairAction[];
  body: string;
  warnings: string[];
}

interface PlatformSubmissionAsset {
  id?: string;
  platformId: string;
  platformName: string;
  title: string;
  logline: string;
  synopsis: string;
  overseasSynopsis: string;
  tags: string[];
  note: string;
  source: string;
  updatedAt?: string;
  persisted: boolean;
}

interface PlatformSubmissionAssetIssue {
  field: "title" | "logline" | "synopsis" | "overseasSynopsis" | "tags";
  severity: "blocker" | "warning";
  label: string;
  detail: string;
}

interface PlatformSubmissionAssetAudit {
  score: number;
  status: "ready" | "needs_work" | "blocked";
  passed: string[];
  issues: PlatformSubmissionAssetIssue[];
}

interface PlatformSubmissionAssetVersion {
  id?: string;
  platformId: string;
  platformName: string;
  title: string;
  logline: string;
  synopsis: string;
  overseasSynopsis: string;
  tags: string[];
  note: string;
  source: string;
  auditScore: number;
  auditStatus: PlatformSubmissionAssetAudit["status"];
  action: string;
  sourceTaskId?: string | null;
  strategy?: string;
  createdAt: string;
}

interface PlatformSubmissionAssetOptimizationVariant {
  strategy: string;
  title: string;
  logline: string;
  synopsis: string;
  overseasSynopsis: string;
  tags: string[];
  rationale: string[];
  audit: PlatformSubmissionAssetAudit;
  addressedIssues?: Array<{
    field: PlatformSubmissionAssetIssue["field"];
    severity: PlatformSubmissionAssetIssue["severity"];
    label: string;
    detail: string;
    status: "resolved";
  }>;
  sourceTaskId?: string;
}

interface PlatformSubmissionAssetAdoption {
  generatedTasks: number;
  generatedVariants: number;
  adoptedVersions: number;
  adoptionRatePercent: number;
  bestAdoptedScore: number;
  recentStrategies: string[];
  verdict: string;
}

interface PlatformPublishMetric {
  id?: string;
  platformId: string;
  platformName: string;
  views: number;
  clicks: number;
  favorites: number;
  follows: number;
  comments: number;
  paidReads: number;
  editorFeedback: string;
  contractStatus: string;
  publishUrl: string;
  notes: string;
  snapshotDate: string;
  createdAt?: string;
  updatedAt?: string;
}

interface PlatformPublishEffect {
  status: "empty" | "weak" | "watch" | "promising" | "signed";
  records: number;
  latest: PlatformPublishMetric | null;
  comparison: PlatformPublishEffectComparison;
  totalViews: number;
  totalClicks: number;
  totalFavorites: number;
  totalFollows: number;
  totalComments: number;
  totalPaidReads: number;
  clickRatePercent: number;
  favoriteRatePercent: number;
  followRatePercent: number;
  commentRatePercent: number;
  paidReadRatePercent: number;
  verdict: string;
  nextAction: string;
  history: PlatformPublishMetric[];
}

interface PlatformPublishEffectComparison {
  status: "none" | "improved" | "declined" | "mixed" | "flat";
  previous: PlatformPublishMetric | null;
  current: PlatformPublishMetric | null;
  viewsDelta: number;
  clicksDelta: number;
  favoritesDelta: number;
  followsDelta: number;
  clickRateDeltaPercent: number;
  favoriteRateDeltaPercent: number;
  followRateDeltaPercent: number;
  verdict: string;
  wins: string[];
  losses: string[];
}

interface PlatformPublishOptimizationAction {
  id: string;
  priority: "high" | "medium" | "low";
  area: "data" | "asset" | "opening" | "platform" | "cadence";
  execution: "generate_asset_variants" | "rewrite_first_three" | "open_target";
  label: string;
  detail: string;
  evidence: string;
  target: string;
  href: string;
}

interface PlatformPublishEffectOptimization {
  status: "collect_data" | "urgent_rework" | "iterate" | "scale";
  headline: string;
  actions: PlatformPublishOptimizationAction[];
}

interface PlatformEffectCaptureField {
  id: "views" | "clicks" | "favorites" | "follows" | "comments" | "paidReads";
  label: string;
  helper: string;
}

interface PlatformEffectCapturePlan {
  status: "needs_record" | "missing_fields" | "ready_to_review";
  primaryMetrics: string[];
  requiredFields: PlatformEffectCaptureField[];
  missingFields: PlatformEffectCaptureField[];
  prompt: string;
  nextAction: string;
}

interface PlatformABExperimentCandidate {
  id: string;
  sourceTaskId: string;
  strategy: string;
  title: string;
  logline: string;
  synopsis: string;
  overseasSynopsis: string;
  tags: string[];
  auditScore: number;
  auditStatus: PlatformSubmissionAssetAudit["status"];
  rationale: string[];
  recommended: boolean;
}

interface PlatformABExperimentAttribution {
  status: "no_data" | "no_experiment" | "positive" | "negative" | "mixed" | "inconclusive";
  headline: string;
  verdict: string;
  attributedStrategy: string | null;
  attributedTitle: string | null;
  sourceVersionId: string | null;
  evidence: string[];
  platformLearnings: string[];
  nextAction: string;
}

interface PlatformABExperimentPlan {
  status: "waiting_effect" | "needs_candidates" | "ready_to_test" | "running" | "winner_found" | "watch";
  headline: string;
  hypothesis: string;
  nextAction: string;
  baselineMetricId: string | null;
  targetMetrics: string[];
  candidates: PlatformABExperimentCandidate[];
  attribution: PlatformABExperimentAttribution;
}

interface PlatformPublishEffectSaveReview {
  platformId: string;
  platformName: string;
  status: PlatformPublishEffectOptimization["status"];
  effectStatus: PlatformPublishEffect["status"];
  comparisonStatus: PlatformPublishEffectComparison["status"];
  headline: string;
  verdict: string;
  nextAction: string;
  recommendedAction: PlatformPublishOptimizationAction | null;
}

interface PlatformPublishPackagePreview {
  status: "blocked" | "needs_baseline" | "needs_effect" | "ready";
  headline: string;
  titleLine: string;
  assetLine: string;
  chapterLine: string;
  riskLine: string;
  nextAction: string;
  actionHref: string;
  highlights: string[];
}

interface PlatformDispatchCompletionEffectValidation {
  status: "needs_effect" | "watch" | "rework" | "reusable_success";
  label: string;
  headline: string;
  verdict: string;
  nextAction: string;
  evidence: string[];
  href: string;
}

interface PlatformPublishPackage {
  platformId: string;
  platformName: string;
  category: string;
  submissionAsset: PlatformSubmissionAsset | null;
  submissionAssetAudit: PlatformSubmissionAssetAudit;
  submissionAssetVersions: PlatformSubmissionAssetVersion[];
  submissionAssetAdoption: PlatformSubmissionAssetAdoption;
  publishEffect: PlatformPublishEffect;
  effectCapturePlan: PlatformEffectCapturePlan;
  dispatchEffectValidation: PlatformDispatchCompletionEffectValidation;
  effectOptimization: PlatformPublishEffectOptimization;
  experimentPlan: PlatformABExperimentPlan;
  title: string;
  logline: string;
  synopsis: string;
  tags: string[];
  publishNote: string;
  chapters: PlatformPublishChapter[];
  preflight: PublishPreflight;
  finalGate: PlatformFinalSubmissionGate;
  canExport: boolean;
  repairActions: PublishRepairAction[];
  repairPath: PublishRepairPath;
  repairHistory: PublishRepairHistoryItem[];
  publishVersions: PublishPackageVersionItem[];
  preview: PlatformPublishPackagePreview;
  warnings: string[];
  markdown: string;
}

interface PlatformEffectCaptureSummary {
  status: "needs_record" | "missing_fields" | "ready_to_review";
  readyToReviewCount: number;
  needsRecordCount: number;
  missingFieldPlatformCount: number;
  missingFieldCount: number;
  platformNamesNeedingInput: string[];
  tasks: PlatformEffectCaptureTask[];
  primaryPlatformId: string | null;
  primaryPlatformName: string | null;
  primaryMissingFields: string[];
  actionLabel: string;
  actionHref: string;
  headline: string;
  nextAction: string;
}

interface PlatformEffectCaptureTask {
  platformId: string;
  platformName: string;
  status: PlatformEffectCapturePlan["status"];
  missingFields: string[];
  actionLabel: string;
  actionHref: string;
}

interface PlatformPublishWorkspaceAction extends PublishRepairAction {
  platformIds: string[];
  platformNames: string[];
  occurrenceCount: number;
}

interface PlatformPublishWorkspace {
  readyPlatforms: number;
  blockedPlatforms: number;
  averagePreflightScore: number;
  totalBlockedItems: number;
  totalWarnings: number;
  executableActions: number;
  manualActions: number;
  archiveReady: boolean;
  nextActions: PlatformPublishWorkspaceAction[];
  headline: string;
}

interface PlatformReadinessItem {
  platformId: string;
  platformName: string;
  status: "ready_to_submit" | "needs_effect_record" | "needs_package_export" | "needs_submission_repair" | "not_generated";
  label: string;
  detail: string;
  actionLabel: string;
  actionHref: string;
  preflightScore: number;
  finalGateScore: number;
  blockers: string[];
}

interface PlatformReadinessSummary {
  totalPlatforms: number;
  readyToSubmitCount: number;
  needsPackageExportCount: number;
  needsEffectRecordCount: number;
  needsSubmissionRepairCount: number;
  notGeneratedCount: number;
  items: PlatformReadinessItem[];
  headline: string;
  nextAction: string;
  primaryAction: PlatformReadinessItem | null;
}

interface PlatformStrategyRankItem {
  rank: number;
  platformId: string;
  platformName: string;
  score: number;
  recommendation: "focus" | "grow" | "watch" | "repair" | "avoid";
  reviewDecision: PlatformStrategyReviewDecision;
  verdict: string;
  nextAction: string;
  href: string;
  scores: {
    preflight: number;
    asset: number;
    effect: number;
    comparison: number;
    adoption: number;
    knowledge: number;
  };
  reasons: string[];
  risks: string[];
}

interface PlatformStrategyReviewDecision {
  kind: "scale" | "iterate" | "collect" | "repair" | "pivot";
  label: string;
  detail: string;
  action: string;
  tasks: PlatformStrategyReviewTask[];
  nextPlan: PlatformStrategyReviewPlan;
  evidenceLedger: PlatformStrategyEvidenceLedger;
  history: PlatformStrategyReviewHistoryItem[];
}

interface PlatformStrategyReviewTask {
  id: string;
  priority: "high" | "medium" | "low";
  execution: "open_target" | "generate_asset_variants" | "rewrite_first_three" | "save_snapshot" | "apply_strategy";
  rankTarget: keyof PlatformStrategyRankItem["scores"] | "evidence";
  rankReason: string;
  label: string;
  detail: string;
  href: string;
}

interface PlatformStrategyReviewHistoryItem {
  id: string;
  type: "snapshot" | "asset" | "metric" | "repair";
  label: string;
  detail: string;
  createdAt: string;
  href: string;
}

interface PlatformStrategyEvidenceLedger {
  status: "empty" | "partial" | "ready";
  score: number;
  headline: string;
  completedSignals: number;
  totalSignals: number;
  latestEvidenceAt: string | null;
  missingSignals: string[];
  entries: PlatformStrategyEvidenceLedgerEntry[];
}

interface PlatformStrategyEvidenceLedgerEntry {
  id: string;
  type: "snapshot" | "asset" | "metric" | "repair";
  actor: "system";
  label: string;
  result: string;
  scoreImpact: string;
  nextReason: string;
  strength: "strong" | "medium" | "weak";
  createdAt: string;
  href: string;
}

interface PlatformStrategyReviewPlan {
  headline: string;
  cadence: "three_step" | "seven_day";
  status: "in_progress" | "complete";
  completedSteps: number;
  totalSteps: number;
  currentStepId: string | null;
  currentStepLabel: string;
  checkpoint: string;
  steps: PlatformStrategyReviewPlanStep[];
}

interface PlatformStrategyReviewPlanStep {
  id: string;
  dayLabel: "今天" | "48小时内" | "第7天";
  taskId: string;
  label: string;
  detail: string;
  status: "done" | "next" | "queued";
  href: string;
  expectedSignal: string;
}

interface PlatformStrategyReviewTaskReceipt {
  id: string;
  platformId: string;
  platformName: string;
  taskLabel: string;
  title: string;
  message: string;
  nextAction: string;
  href: string;
  severity: "success" | "needs_action";
  beforeScore: number;
  afterScore: number;
  scoreDelta: number;
  scoreChanges: PlatformStrategyScoreDeltaItem[];
  draggers: string[];
}

interface PlatformStrategyScoreDeltaItem {
  key: keyof PlatformStrategyRankItem["scores"];
  label: string;
  before: number;
  after: number;
  delta: number;
}

interface PlatformStrategySwitchStep {
  id: string;
  label: string;
  detail: string;
  status: "done" | "next" | "queued";
  executable: boolean;
  href: string;
}

interface PlatformStrategyProgressSummary {
  status: "in_progress" | "complete";
  completedSteps: number;
  totalSteps: number;
  progressPercent: number;
  nextStepId: string | null;
  nextStepLabel: string;
  actionLabel: string;
  actionHref: string;
  bottleneck: string;
  verdict: string;
}

interface PlatformStrategySwitchPlan {
  platformId: string;
  platformName: string;
  headline: string;
  decisionBasis: string;
  evidenceStatus: PlatformStrategyEvidenceLedger["status"];
  evidenceScore: number;
  evidenceGaps: string[];
  previousPlatformId: string;
  previousPlatformName: string;
  recommendation: PlatformStrategyRankItem["recommendation"];
  score: number;
  progress: PlatformStrategyProgressSummary;
  steps: PlatformStrategySwitchStep[];
}

interface PlatformStrategyAutoVerdictItem {
  platformId: string;
  platformName: string;
  role: "primary" | "backup" | "blocked";
  recommendation: PlatformStrategyRankItem["recommendation"];
  score: number;
  evidenceScore: number;
  reason: string;
  action: string;
  href: string;
}

interface PlatformStrategyAutoVerdict {
  status: "ready" | "needs_evidence" | "needs_repair";
  headline: string;
  nextAction: string;
  primary: PlatformStrategyAutoVerdictItem | null;
  backups: PlatformStrategyAutoVerdictItem[];
  blocked: PlatformStrategyAutoVerdictItem[];
  rationale: string[];
}

interface PlatformStrategyExecutionReceipt {
  stepId: string;
  platformId: string;
  platformName: string;
  title: string;
  message: string;
  nextAction: string;
  href: string;
  severity: "success" | "needs_action";
}

interface PlatformKnowledgeFeedbackReceipt {
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
  createdAt: string;
}

interface PlatformKnowledgeApplication {
  area: "submission_asset" | "first_three" | "strategy";
  label: string;
  status: "reuse" | "avoid" | "collect";
  impact: string;
  href: string;
}

interface PlatformKnowledgeFeedbackLoop {
  actionLabel: string;
  headline: string;
  nextStepLabel: string;
  nextStepHref: string;
}

interface PlatformKnowledgeInsight {
  platformId: string;
  platformName: string;
  status: "learned" | "warning" | "insufficient";
  confidence: number;
  evidenceCount: number;
  positiveCount: number;
  negativeCount: number;
  winningSignals: string[];
  avoidSignals: string[];
  tacticSummary: string;
  nextAction: string;
  applications: PlatformKnowledgeApplication[];
  feedbackLoop: PlatformKnowledgeFeedbackLoop;
}

interface PlatformPublishExecutionHandoff {
  platformId: string;
  platformName: string;
  pipelineStages: string[];
  writingFocus: string[];
  submissionFocus: string[];
  feedbackMetric: string[];
  referenceAction: string;
  currentAction: string;
  actionKind: PublishRepairAction["kind"] | "record_publish_effect";
  actionLabel: string;
  actionHref: string;
  chapterId?: string;
  candidateRevisionId?: string;
  preflightScore: number;
  canExport: boolean;
  blockedCount: number;
  warningCount: number;
}

interface PlatformPublishExecutionHandoffSummary {
  readyCount: number;
  blockedCount: number;
  primaryAction: PlatformPublishExecutionHandoff | null;
  primaryActionCount: number;
  primaryActionPlatformNames: string[];
  headline: string;
  nextAction: string;
}

interface PlatformPublishExportCenter {
  packages: PlatformPublishPackage[];
  recommendedPlatformId: string;
  totalPublishableChapters: number;
  workspace: PlatformPublishWorkspace;
  platformReadinessSummary: PlatformReadinessSummary;
  effectCaptureSummary: PlatformEffectCaptureSummary;
  executionHandoffs: PlatformPublishExecutionHandoff[];
  executionHandoffSummary: PlatformPublishExecutionHandoffSummary;
  platformStrategy: PlatformStrategyRankItem[];
  strategyVerdict: PlatformStrategyAutoVerdict;
  platformKnowledge: PlatformKnowledgeInsight[];
  knowledgeFeedbackHistory: PlatformKnowledgeFeedbackReceipt[];
  activeStrategyPlan: PlatformStrategySwitchPlan | null;
}

interface SubmissionAssetDraft {
  title: string;
  logline: string;
  synopsis: string;
  overseasSynopsis: string;
  tags: string;
  note: string;
}

interface SaveSubmissionAssetOptions {
  message?: string;
  saveAction?: "save" | "adopt";
  sourceTaskId?: string;
  strategy?: string;
}

interface PublishEffectDraft {
  views: string;
  clicks: string;
  favorites: string;
  follows: string;
  comments: string;
  paidReads: string;
  contractStatus: string;
  publishUrl: string;
  editorFeedback: string;
  notes: string;
  snapshotDate: string;
}

function actionHref(projectId: string, action: PublishRepairAction) {
  if (action.kind === "adopt_candidate" && action.chapterId) {
    return `/projects/${projectId}/chapters/${action.chapterId}#chapter-revisions`;
  }
  if (action.kind === "open_submission_package") return `/projects/${projectId}#submission-package`;
  if (action.kind === "add_publish_chapters") return `/projects/${projectId}#create-chapter`;
  if (action.kind === "run_second_pass" && action.chapterId) {
    return `/projects/${projectId}/chapters/${action.chapterId}#chapter-second-pass`;
  }
  if (action.kind === "run_chapter_review" && action.chapterId) {
    return `/projects/${projectId}/chapters/${action.chapterId}#chapter-workflow`;
  }
  if (action.chapterId) return `/projects/${projectId}/chapters/${action.chapterId}#chapter-editor`;
  return `/projects/${projectId}`;
}

function handoffActionHref(projectId: string, handoff: PlatformPublishExecutionHandoff) {
  if (handoff.actionKind === "record_publish_effect") return handoff.actionHref;
  if (handoff.actionKind === "adopt_candidate" && handoff.chapterId) {
    return `/projects/${projectId}/chapters/${handoff.chapterId}#chapter-revisions`;
  }
  if (handoff.actionKind === "open_submission_package") return `/projects/${projectId}#submission-package`;
  if (handoff.actionKind === "add_publish_chapters") return `/projects/${projectId}#create-chapter`;
  if (handoff.actionKind === "run_second_pass" && handoff.chapterId) {
    return `/projects/${projectId}/chapters/${handoff.chapterId}#chapter-second-pass`;
  }
  if (handoff.actionKind === "run_chapter_review" && handoff.chapterId) {
    return `/projects/${projectId}/chapters/${handoff.chapterId}#chapter-workflow`;
  }
  if (handoff.chapterId) return `/projects/${projectId}/chapters/${handoff.chapterId}#chapter-editor`;
  return handoff.actionHref || `/projects/${projectId}`;
}

function canRunAction(action: PublishRepairAction) {
  if (action.kind === "adopt_candidate") return Boolean(action.chapterId && action.candidateRevisionId);
  return (action.kind === "run_chapter_review" || action.kind === "run_second_pass") && Boolean(action.chapterId);
}

function resultStatusLabel(status: PublishRepairRunResult["status"]) {
  if (status === "succeeded") return "成功";
  if (status === "pending") return "处理中";
  return "失败";
}

function resultStatusClass(status: PublishRepairRunResult["status"]) {
  if (status === "succeeded") return "bg-emerald-50 text-emerald-700";
  if (status === "pending") return "bg-amber-50 text-amber-700";
  return "bg-rose-50 text-rose-700";
}

function RepairNextActionCallout({
  nextAction,
  onRunAction,
  runningActionId,
}: {
  nextAction: PublishRepairNextAction;
  onRunAction: (action: PublishRepairAction) => void;
  runningActionId: string | null;
}) {
  const executable = nextAction.action && canRunAction(nextAction.action);

  return (
    <div className="mt-3 rounded-md border border-emerald-100 bg-emerald-50 p-3 text-sm">
      <div className="font-medium text-emerald-950">下一步：{nextAction.label}</div>
      <p className="mt-1 leading-5 text-emerald-700">{nextAction.detail}</p>
      {executable ? (
        <button
          className="mt-3 rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
          disabled={Boolean(runningActionId)}
          onClick={() => nextAction.action && onRunAction(nextAction.action)}
          type="button"
        >
          {runningActionId === nextAction.action?.id ? "处理中" : nextAction.label}
        </button>
      ) : nextAction.href ? (
        <Link
          className="mt-3 inline-flex rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white"
          href={nextAction.href}
        >
          {nextAction.label}
        </Link>
      ) : null}
    </div>
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDateInput(value?: Date | string) {
  const date = value instanceof Date ? value : new Date(value ?? Date.now());
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function versionActionLabel(action: string) {
  if (action === "copy") return "复制";
  if (action === "download") return "下载";
  if (action === "archive") return "归档";
  if (action === "restore") return "恢复";
  return "保存";
}

function assetAuditStatusLabel(status: PlatformSubmissionAssetAudit["status"]) {
  if (status === "ready") return "可用";
  if (status === "blocked") return "需重写";
  return "需打磨";
}

function assetAuditStatusClass(status: PlatformSubmissionAssetAudit["status"]) {
  if (status === "ready") return "bg-emerald-50 text-emerald-700";
  if (status === "blocked") return "bg-rose-50 text-rose-700";
  return "bg-amber-50 text-amber-700";
}

function assetEditorReviewToneClass(tone: "success" | "warning" | "danger") {
  if (tone === "success") return "border-emerald-100 bg-emerald-50";
  if (tone === "danger") return "border-rose-100 bg-rose-50";
  return "border-amber-100 bg-amber-50";
}

function assetEditorReviewTextClass(tone: "success" | "warning" | "danger") {
  if (tone === "success") return "text-emerald-800";
  if (tone === "danger") return "text-rose-800";
  return "text-amber-800";
}

function assetIssueFieldLabel(field: PlatformSubmissionAssetIssue["field"]) {
  if (field === "title") return "标题";
  if (field === "logline") return "一句话卖点";
  if (field === "synopsis") return "中文简介";
  if (field === "overseasSynopsis") return "海外简介";
  return "标签";
}

function assetVersionActionLabel(action: string) {
  if (action === "adopt") return "采纳";
  if (action === "restore") return "恢复";
  return "保存";
}

function effectStatusLabel(status: PlatformPublishEffect["status"]) {
  if (status === "signed") return "已验证";
  if (status === "promising") return "有苗头";
  if (status === "weak") return "偏弱";
  if (status === "watch") return "观察";
  return "未记录";
}

function effectStatusClass(status: PlatformPublishEffect["status"]) {
  if (status === "signed") return "bg-emerald-50 text-emerald-700";
  if (status === "promising") return "bg-cyan-50 text-cyan-700";
  if (status === "weak") return "bg-rose-50 text-rose-700";
  if (status === "watch") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function effectCaptureStatusLabel(status: PlatformEffectCapturePlan["status"]) {
  if (status === "ready_to_review") return "可复盘";
  if (status === "missing_fields") return "缺数据";
  return "待回填";
}

function effectCaptureStatusClass(status: PlatformEffectCapturePlan["status"]) {
  if (status === "ready_to_review") return "bg-emerald-50 text-emerald-700";
  if (status === "missing_fields") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function platformReadinessStatusClass(status: PlatformReadinessItem["status"]) {
  if (status === "ready_to_submit") return "bg-emerald-50 text-emerald-700";
  if (status === "needs_effect_record") return "bg-cyan-50 text-cyan-700";
  if (status === "needs_package_export") return "bg-blue-50 text-blue-700";
  if (status === "needs_submission_repair") return "bg-rose-50 text-rose-700";
  return "bg-slate-100 text-slate-600";
}

function packagePreviewStatusLabel(status: PlatformPublishPackagePreview["status"]) {
  if (status === "ready") return "可复盘";
  if (status === "needs_effect") return "补效果";
  if (status === "needs_baseline") return "存基准";
  return "先修稿";
}

function packagePreviewStatusClass(status: PlatformPublishPackagePreview["status"]) {
  if (status === "ready") return "bg-emerald-50 text-emerald-700";
  if (status === "needs_effect") return "bg-cyan-50 text-cyan-700";
  if (status === "needs_baseline") return "bg-blue-50 text-blue-700";
  return "bg-rose-50 text-rose-700";
}

function dispatchValidationClass(status: PlatformDispatchCompletionEffectValidation["status"]) {
  if (status === "reusable_success") return "bg-emerald-50 text-emerald-700";
  if (status === "rework") return "bg-rose-50 text-rose-700";
  if (status === "watch") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function contractStatusLabel(status: string) {
  if (status === "signed") return "已签约";
  if (status === "invited") return "收到邀约";
  if (status === "rejected") return "被拒";
  if (status === "pending") return "待反馈";
  return "未知";
}

function optimizationStatusLabel(status: PlatformPublishEffectOptimization["status"]) {
  if (status === "urgent_rework") return "优先返工";
  if (status === "scale") return "放大有效";
  if (status === "collect_data") return "先补数据";
  return "继续迭代";
}

function optimizationPriorityClass(priority: PlatformPublishOptimizationAction["priority"]) {
  if (priority === "high") return "bg-rose-50 text-rose-700";
  if (priority === "medium") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function optimizationAreaLabel(area: PlatformPublishOptimizationAction["area"]) {
  if (area === "asset") return "投稿资产";
  if (area === "opening") return "前三章";
  if (area === "platform") return "平台表达";
  if (area === "cadence") return "更新节奏";
  return "数据";
}

function comparisonStatusLabel(status: PlatformPublishEffectComparison["status"]) {
  if (status === "improved") return "变好";
  if (status === "declined") return "变差";
  if (status === "mixed") return "有涨有跌";
  if (status === "flat") return "没动";
  return "待对照";
}

function comparisonStatusClass(status: PlatformPublishEffectComparison["status"]) {
  if (status === "improved") return "bg-emerald-50 text-emerald-700";
  if (status === "declined") return "bg-rose-50 text-rose-700";
  if (status === "mixed") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function experimentStatusLabel(status: PlatformABExperimentPlan["status"]) {
  if (status === "winner_found") return "已有胜出";
  if (status === "running") return "实验中";
  if (status === "ready_to_test") return "待采纳";
  if (status === "needs_candidates") return "需候选";
  if (status === "waiting_effect") return "待基线";
  return "观察";
}

function experimentStatusClass(status: PlatformABExperimentPlan["status"]) {
  if (status === "winner_found" || status === "running") return "bg-emerald-50 text-emerald-700";
  if (status === "ready_to_test") return "bg-cyan-50 text-cyan-700";
  if (status === "needs_candidates") return "bg-rose-50 text-rose-700";
  if (status === "waiting_effect") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function attributionStatusLabel(status: PlatformABExperimentAttribution["status"]) {
  if (status === "positive") return "正向归因";
  if (status === "negative") return "负向归因";
  if (status === "mixed") return "混合信号";
  if (status === "inconclusive") return "无明显变化";
  if (status === "no_experiment") return "链路断点";
  return "待对照";
}

function attributionStatusClass(status: PlatformABExperimentAttribution["status"]) {
  if (status === "positive") return "bg-emerald-50 text-emerald-700";
  if (status === "negative") return "bg-rose-50 text-rose-700";
  if (status === "mixed") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function saveReviewMessage(review: PlatformPublishEffectSaveReview) {
  const action = review.recommendedAction?.label ?? "查看发布效果复盘";
  return `${review.headline} 下一步：${action}。`;
}

function finalGateStatusClass(status: PlatformFinalSubmissionGate["status"]) {
  if (status === "ready_to_submit") return "bg-emerald-50 text-emerald-700";
  if (status === "do_not_submit") return "bg-rose-50 text-rose-700";
  return "bg-amber-50 text-amber-700";
}

function finalGateItemStatusLabel(status: PlatformFinalGateItem["status"]) {
  if (status === "pass") return "通过";
  if (status === "block") return "阻塞";
  return "先修";
}

function finalGateItemStatusClass(status: PlatformFinalGateItem["status"]) {
  if (status === "pass") return "bg-emerald-50 text-emerald-700";
  if (status === "block") return "bg-rose-50 text-rose-700";
  return "bg-amber-50 text-amber-700";
}

function formatDelta(value: number, suffix = "") {
  if (value > 0) return `+${value}${suffix}`;
  return `${value}${suffix}`;
}

function strategyRecommendationLabel(recommendation: PlatformStrategyRankItem["recommendation"]) {
  if (recommendation === "focus") return "优先打";
  if (recommendation === "grow") return "加码";
  if (recommendation === "repair") return "先修";
  if (recommendation === "avoid") return "靠后";
  return "观察";
}

function strategyRecommendationClass(recommendation: PlatformStrategyRankItem["recommendation"]) {
  if (recommendation === "focus") return "bg-emerald-50 text-emerald-700";
  if (recommendation === "grow") return "bg-cyan-50 text-cyan-700";
  if (recommendation === "repair") return "bg-rose-50 text-rose-700";
  if (recommendation === "avoid") return "bg-slate-100 text-slate-600";
  return "bg-amber-50 text-amber-700";
}

function strategyVerdictStatusClass(status: PlatformStrategyAutoVerdict["status"]) {
  if (status === "ready") return "bg-emerald-50 text-emerald-700";
  if (status === "needs_repair") return "bg-rose-50 text-rose-700";
  return "bg-amber-50 text-amber-700";
}

function strategyVerdictStatusLabel(status: PlatformStrategyAutoVerdict["status"]) {
  if (status === "ready") return "可裁决";
  if (status === "needs_repair") return "先修";
  return "补证据";
}

function strategyVerdictRoleLabel(role: PlatformStrategyAutoVerdictItem["role"]) {
  if (role === "primary") return "主推";
  if (role === "backup") return "备选";
  return "降权";
}

function strategyVerdictRoleClass(role: PlatformStrategyAutoVerdictItem["role"]) {
  if (role === "primary") return "bg-slate-950 text-white";
  if (role === "backup") return "bg-cyan-50 text-cyan-700";
  return "bg-slate-100 text-slate-600";
}

function platformKnowledgeStatusLabel(status: PlatformKnowledgeInsight["status"]) {
  if (status === "learned") return "已沉淀";
  if (status === "warning") return "需避坑";
  return "证据不足";
}

function platformKnowledgeStatusClass(status: PlatformKnowledgeInsight["status"]) {
  if (status === "learned") return "bg-emerald-50 text-emerald-700";
  if (status === "warning") return "bg-rose-50 text-rose-700";
  return "bg-slate-100 text-slate-600";
}

function platformKnowledgeApplicationLabel(status: PlatformKnowledgeApplication["status"]) {
  if (status === "reuse") return "复用";
  if (status === "avoid") return "避坑";
  return "补证据";
}

function platformKnowledgeApplicationClass(status: PlatformKnowledgeApplication["status"]) {
  if (status === "reuse") return "bg-emerald-50 text-emerald-700";
  if (status === "avoid") return "bg-rose-50 text-rose-700";
  return "bg-amber-50 text-amber-700";
}

function strategyReviewDecisionClass(kind: PlatformStrategyReviewDecision["kind"]) {
  if (kind === "scale") return "bg-emerald-50 text-emerald-700";
  if (kind === "iterate") return "bg-cyan-50 text-cyan-700";
  if (kind === "collect") return "bg-amber-50 text-amber-700";
  if (kind === "repair") return "bg-rose-50 text-rose-700";
  return "bg-slate-100 text-slate-600";
}

function strategyReviewTaskPriorityLabel(priority: PlatformStrategyReviewTask["priority"]) {
  if (priority === "high") return "高";
  if (priority === "medium") return "中";
  return "低";
}

function strategyReviewTaskPriorityClass(priority: PlatformStrategyReviewTask["priority"]) {
  if (priority === "high") return "bg-rose-50 text-rose-700";
  if (priority === "medium") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function strategyReviewTaskActionLabel(execution: PlatformStrategyReviewTask["execution"]) {
  if (execution === "generate_asset_variants") return "生成";
  if (execution === "rewrite_first_three") return "重写";
  if (execution === "save_snapshot") return "保存";
  if (execution === "apply_strategy") return "应用";
  return "前往";
}

function strategyReviewHistoryClass(type: PlatformStrategyReviewHistoryItem["type"]) {
  if (type === "snapshot") return "bg-indigo-50 text-indigo-700";
  if (type === "asset") return "bg-cyan-50 text-cyan-700";
  if (type === "metric") return "bg-emerald-50 text-emerald-700";
  return "bg-amber-50 text-amber-700";
}

function evidenceLedgerStatusClass(status: PlatformStrategyEvidenceLedger["status"]) {
  if (status === "ready") return "bg-emerald-50 text-emerald-700";
  if (status === "partial") return "bg-amber-50 text-amber-700";
  return "bg-rose-50 text-rose-700";
}

function evidenceLedgerStatusLabel(status: PlatformStrategyEvidenceLedger["status"]) {
  if (status === "ready") return "可复盘";
  if (status === "partial") return "证据薄";
  return "缺证据";
}

function evidenceLedgerStrengthClass(strength: PlatformStrategyEvidenceLedgerEntry["strength"]) {
  if (strength === "strong") return "bg-emerald-50 text-emerald-700";
  if (strength === "medium") return "bg-amber-50 text-amber-700";
  return "bg-rose-50 text-rose-700";
}

function evidenceLedgerStrengthLabel(strength: PlatformStrategyEvidenceLedgerEntry["strength"]) {
  if (strength === "strong") return "强";
  if (strength === "medium") return "中";
  return "弱";
}

const strategyScoreLabels: { key: keyof PlatformStrategyRankItem["scores"]; label: string }[] = [
  { key: "preflight", label: "质检" },
  { key: "asset", label: "资产" },
  { key: "effect", label: "效果" },
  { key: "comparison", label: "对照" },
  { key: "adoption", label: "采纳" },
  { key: "knowledge", label: "知识库" },
];

function buildStrategyScoreChanges(
  before: PlatformStrategyRankItem,
  after: PlatformStrategyRankItem,
): PlatformStrategyScoreDeltaItem[] {
  return strategyScoreLabels.map((item) => ({
    ...item,
    before: before.scores[item.key],
    after: after.scores[item.key],
    delta: after.scores[item.key] - before.scores[item.key],
  }));
}

function buildStrategyScoreDraggers(item: PlatformStrategyRankItem) {
  return strategyScoreLabels
    .map((score) => ({ label: score.label, value: item.scores[score.key] }))
    .sort((left, right) => left.value - right.value)
    .slice(0, 2)
    .map((score) => `${score.label} ${score.value}`);
}

function scoreDeltaLabel(delta: number) {
  if (delta > 0) return `+${delta}`;
  return String(delta);
}

function buildStrategyReviewTaskReceipt(
  item: PlatformStrategyRankItem,
  task: PlatformStrategyReviewTask,
  resultLabel: string,
  afterItem = item,
): PlatformStrategyReviewTaskReceipt {
  const nextAction = task.execution === "generate_asset_variants"
    ? "去投稿资产区采纳一个候选，否则生成再多也不会进入实测。"
    : task.execution === "rewrite_first_three"
      ? "检查前三章重写结果，再跑发布质检和平台复盘。"
      : task.execution === "save_snapshot"
        ? "版本已经留下证据，下一轮改动后再做对照。"
        : task.execution === "apply_strategy"
          ? "主战场已切换，继续按执行链处理下一步。"
          : "继续在目标面板补齐数据或处理卡点。";
  const scoreDelta = afterItem.score - item.score;

  return {
    id: `${item.platformId}:${task.id}:${Date.now()}`,
    platformId: item.platformId,
    platformName: item.platformName,
    taskLabel: task.label,
    title: `${item.platformName}｜${task.label}已执行`,
    message: resultLabel,
    nextAction,
    href: task.href,
    severity: task.execution === "open_target" || scoreDelta < 0 ? "needs_action" : "success",
    beforeScore: item.score,
    afterScore: afterItem.score,
    scoreDelta,
    scoreChanges: buildStrategyScoreChanges(item, afterItem),
    draggers: buildStrategyScoreDraggers(afterItem),
  };
}

function switchStepStatusLabel(status: PlatformStrategySwitchStep["status"]) {
  if (status === "done") return "已完成";
  if (status === "next") return "现在做";
  return "排队中";
}

function switchStepStatusClass(status: PlatformStrategySwitchStep["status"]) {
  if (status === "done") return "bg-emerald-50 text-emerald-700";
  if (status === "next") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function reviewPlanStepStatusLabel(status: PlatformStrategyReviewPlanStep["status"]) {
  if (status === "done") return "已完成";
  if (status === "next") return "现在做";
  return "排队中";
}

function reviewPlanStepStatusClass(status: PlatformStrategyReviewPlanStep["status"]) {
  if (status === "done") return "bg-emerald-50 text-emerald-700";
  if (status === "next") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function buildReviewPlanStepTask(
  item: PlatformStrategyRankItem,
  step: PlatformStrategyReviewPlanStep,
): PlatformStrategyReviewTask {
  const matchedTask = item.reviewDecision.tasks.find((task) => task.id === step.taskId);
  if (matchedTask && step.href !== "#platform-strategy-ranking") return matchedTask;

  return {
    id: `plan-${step.id}`,
    priority: step.status === "next" ? "high" : "medium",
    execution: "open_target",
    rankTarget: step.href === "#platform-strategy-ranking" ? "evidence" : matchedTask?.rankTarget ?? "evidence",
    rankReason: "这是计划里的检查点，先定位证据面板，再决定下一轮动作。",
    label: step.label,
    detail: step.detail,
    href: step.href,
  };
}

function reviewPlanStepActionLabel(
  step: PlatformStrategyReviewPlanStep,
  task: PlatformStrategyReviewTask,
) {
  if (step.status === "done") return "查看证据";
  if (step.status === "queued") return "等待前一步";
  return strategyReviewTaskActionLabel(task.execution);
}

function buildStrategyExecutionReceipt(
  plan: PlatformStrategySwitchPlan,
  stepId: string,
  resultCount = 0,
): PlatformStrategyExecutionReceipt {
  if (stepId === "adopt-submission-asset") {
    return {
      stepId,
      platformId: plan.platformId,
      platformName: plan.platformName,
      title: "投稿资产已采纳保存",
      message: `${plan.platformName} 的候选方案已经落库。生成只是热身，保存才算开始干活。`,
      nextAction: "看刷新后的执行链，继续执行真正的下一步。",
      href: "#platform-export",
      severity: "success",
    };
  }

  if (stepId === "fix-submission-asset") {
    return {
      stepId,
      platformId: plan.platformId,
      platformName: plan.platformName,
      title: "投稿资产候选已生成",
      message: resultCount
        ? `已给 ${plan.platformName} 生成 ${resultCount} 个候选方案。别停在欣赏文案，挑一个采纳并保存。`
        : `已进入 ${plan.platformName} 投稿资产修复区。别拿通用简介糊弄平台。`,
      nextAction: "采纳一个候选并保存投稿资产，然后重新应用策略链。",
      href: "#submission-asset-editor",
      severity: "needs_action",
    };
  }
  if (stepId === "rewrite-first-three") {
    return {
      stepId,
      platformId: plan.platformId,
      platformName: plan.platformName,
      title: "前三章已按主战场重写",
      message: resultCount
        ? `已重写 ${resultCount} 章。现在别急着投，先看发布质检是不是还在拦你。`
        : "前三章重写动作已完成。现在检查钩子、爽点和章末悬念有没有真的变硬。",
      nextAction: "回到发布前质检；若通过，就记录发布效果，若未通过，继续处理阻塞项。",
      href: "#platform-export",
      severity: "needs_action",
    };
  }
  if (stepId === "record-publish-effect") {
    return {
      stepId,
      platformId: plan.platformId,
      platformName: plan.platformName,
      title: "该录真实效果了",
      message: `把 ${plan.platformName} 的曝光、点击、收藏、追读和编辑反馈填进去。没有数据的策略都是情绪价值。`,
      nextAction: "保存发布效果后再看排行榜，让真实数据决定下一轮主战场。",
      href: "#publish-effect-panel",
      severity: "needs_action",
    };
  }
  if (stepId === "save-publish-effect") {
    return {
      stepId,
      platformId: plan.platformId,
      platformName: plan.platformName,
      title: "发布效果已入账",
      message: `${plan.platformName} 的真实数据已经写进策略系统。现在别拍脑袋，排行榜会重新算账。`,
      nextAction: "回到平台策略排行榜，看主战场是否继续加码，还是该换打法。",
      href: "#platform-export",
      severity: "success",
    };
  }
  return {
    stepId,
    platformId: plan.platformId,
    platformName: plan.platformName,
    title: "主战场已切换",
    message: `${plan.platformName} 已设为当前主战场。`,
    nextAction: "继续执行链里的下一步。",
    href: "#platform-export",
    severity: "success",
  };
}

function buildKnowledgeFeedbackReceipt(
  item: PlatformKnowledgeInsight,
  step: PlatformStrategySwitchStep | null,
  executionReceipt: PlatformStrategyExecutionReceipt | null,
): PlatformKnowledgeFeedbackReceipt {
  const createdAt = new Date().toISOString();
  const completedStepLabel = executionReceipt
    ? step?.label ?? executionReceipt.title
    : "启动执行链";
  const stopReason = executionReceipt
    ? executionReceipt.severity === "success"
      ? "第一步已自动完成，系统停在下一段执行链，避免把需要确认的动作一口气跑完。"
      : "自动动作已经推进到需要人工确认的位置，继续硬跑会把低质量样本写进系统。"
    : step
      ? "当前步骤需要人工处理或等待前置条件，系统已经定位到对应区域。"
      : "当前执行链没有新的可自动动作，回到策略排行榜复盘即可。";

  return {
    id: `${item.platformId}:${createdAt}`,
    platformId: item.platformId,
    platformName: item.platformName,
    actionLabel: item.feedbackLoop.actionLabel,
    title: `${item.platformName}｜反哺链路回执`,
    message: item.feedbackLoop.headline,
    completedStepLabel,
    stopReason,
    nextAction: executionReceipt?.nextAction ?? `下一步：${step?.label ?? item.feedbackLoop.nextStepLabel}`,
    href: executionReceipt?.href ?? step?.href ?? item.feedbackLoop.nextStepHref,
    severity: executionReceipt?.severity ?? (step?.executable === false ? "needs_action" : "success"),
    createdAt,
  };
}

function knowledgeFeedbackHistoryKey(projectId: string) {
  return `ai-webnovel-knowledge-feedback-history:${projectId}`;
}

function isKnowledgeFeedbackReceipt(value: unknown): value is PlatformKnowledgeFeedbackReceipt {
  if (!value || typeof value !== "object") return false;
  const receipt = value as Partial<PlatformKnowledgeFeedbackReceipt>;
  return typeof receipt.id === "string"
    && typeof receipt.platformId === "string"
    && typeof receipt.platformName === "string"
    && typeof receipt.actionLabel === "string"
    && typeof receipt.title === "string"
    && typeof receipt.message === "string"
    && typeof receipt.completedStepLabel === "string"
    && typeof receipt.stopReason === "string"
    && typeof receipt.nextAction === "string"
    && typeof receipt.href === "string"
    && typeof receipt.createdAt === "string"
    && (receipt.severity === "success" || receipt.severity === "needs_action");
}

function loadKnowledgeFeedbackHistory(projectId: string): PlatformKnowledgeFeedbackReceipt[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(knowledgeFeedbackHistoryKey(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isKnowledgeFeedbackReceipt).slice(0, 10) : [];
  } catch {
    return [];
  }
}

function saveKnowledgeFeedbackHistory(projectId: string, receipts: PlatformKnowledgeFeedbackReceipt[]) {
  const next = receipts.slice(0, 10);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(knowledgeFeedbackHistoryKey(projectId), JSON.stringify(next));
  }
  return next;
}

function normalizeVersionAction(action: string): PublishPackageVersionActionFilter {
  if (action === "copy" || action === "download" || action === "archive" || action === "snapshot" || action === "restore") return action;
  return "snapshot";
}

const versionActionFilters: { id: PublishPackageVersionActionFilter; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "copy", label: "复制" },
  { id: "download", label: "下载" },
  { id: "archive", label: "归档" },
  { id: "restore", label: "恢复" },
  { id: "snapshot", label: "保存" },
];

export function PlatformExportCenterPanel({ projectId }: { projectId: string }) {
  const [center, setCenter] = useState<PlatformPublishExportCenter | null>(null);
  const [selectedPlatformId, setSelectedPlatformId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [runningActionId, setRunningActionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [runResults, setRunResults] = useState<PublishRepairRunResult[]>([]);
  const [repairNextAction, setRepairNextAction] = useState<PublishRepairNextAction | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [versionDetail, setVersionDetail] = useState<PublishPackageVersionDetailState | null>(null);
  const [isLoadingVersion, setIsLoadingVersion] = useState(false);
  const [isRestoringVersion, setIsRestoringVersion] = useState(false);
  const [isSavingAsset, setIsSavingAsset] = useState(false);
  const [isOptimizingAsset, setIsOptimizingAsset] = useState(false);
  const [isSavingEffect, setIsSavingEffect] = useState(false);
  const [runningOptimizationActionId, setRunningOptimizationActionId] = useState<string | null>(null);
  const [applyingStrategyPlatformId, setApplyingStrategyPlatformId] = useState<string | null>(null);
  const [runningKnowledgePlatformId, setRunningKnowledgePlatformId] = useState<string | null>(null);
  const [runningStrategyStepId, setRunningStrategyStepId] = useState<string | null>(null);
  const [runningStrategyReviewTaskId, setRunningStrategyReviewTaskId] = useState<string | null>(null);
  const [strategySwitchPlan, setStrategySwitchPlan] = useState<PlatformStrategySwitchPlan | null>(null);
  const [strategyExecutionReceipt, setStrategyExecutionReceipt] = useState<PlatformStrategyExecutionReceipt | null>(null);
  const [strategyReviewTaskReceipt, setStrategyReviewTaskReceipt] = useState<PlatformStrategyReviewTaskReceipt | null>(null);
  const [assetAdoptionReceipt, setAssetAdoptionReceipt] = useState<ReturnType<typeof buildSubmissionAssetAdoptionReviewReceipt> | null>(null);
  const [knowledgeFeedbackReceipt, setKnowledgeFeedbackReceipt] = useState<PlatformKnowledgeFeedbackReceipt | null>(null);
  const [knowledgeFeedbackHistory, setKnowledgeFeedbackHistory] = useState<PlatformKnowledgeFeedbackReceipt[]>([]);
  const [latestEffectReview, setLatestEffectReview] = useState<PlatformPublishEffectSaveReview | null>(null);
  const [assetOptimizationVariants, setAssetOptimizationVariants] = useState<PlatformSubmissionAssetOptimizationVariant[]>([]);
  const [versionActionFilter, setVersionActionFilter] = useState<PublishPackageVersionActionFilter>("all");
  const [assetDraft, setAssetDraft] = useState<SubmissionAssetDraft>({
    title: "",
    logline: "",
    synopsis: "",
    overseasSynopsis: "",
    tags: "",
    note: "",
  });
  const [effectDraft, setEffectDraft] = useState<PublishEffectDraft>({
    views: "",
    clicks: "",
    favorites: "",
    follows: "",
    comments: "",
    paidReads: "",
    contractStatus: "unknown",
    publishUrl: "",
    editorFeedback: "",
    notes: "",
    snapshotDate: formatDateInput(),
  });
  const selectedPackage = useMemo(
    () => center?.packages.find((pack) => pack.platformId === selectedPlatformId) ?? center?.packages[0] ?? null,
    [center, selectedPlatformId],
  );
  const selectedAssetEditorReview = useMemo(
    () => selectedPackage
      ? buildSubmissionAssetEditorReview(selectedPackage.platformName, selectedPackage.submissionAssetAudit)
      : null,
    [selectedPackage],
  );
  const executableActions = useMemo(
    () => selectedPackage?.repairActions.filter(canRunAction).slice(0, 5) ?? [],
    [selectedPackage],
  );
  const nextRepairAction = useMemo(() => {
    if (!selectedPackage?.repairPath.nextStep) return null;
    return selectedPackage.repairActions.find((action) => action.id === selectedPackage.repairPath.nextStep?.id) ?? null;
  }, [selectedPackage]);
  const exportablePackages = useMemo(
    () => center?.packages.filter((pack) => pack.canExport) ?? [],
    [center],
  );
  const workspaceExecutableActions = useMemo(
    () => center?.workspace.nextActions.filter(canRunAction).slice(0, 5) ?? [],
    [center],
  );
  const repairExitPrompt = useMemo(
    () => selectedPackage ? buildPublishRepairExitPrompt({
      canExport: selectedPackage.canExport,
      results: runResults,
      nextAction: repairNextAction,
      hasExportVersion: selectedPackage.publishVersions.length > 0,
      hasPublishEffect: selectedPackage.publishEffect.records > 0,
    }) : null,
    [selectedPackage, runResults, repairNextAction],
  );
  const versionActionCounts = useMemo(() => {
    const counts: Record<PublishPackageVersionActionFilter, number> = {
      all: selectedPackage?.publishVersions.length ?? 0,
      copy: 0,
      download: 0,
      archive: 0,
      snapshot: 0,
      restore: 0,
    };
    selectedPackage?.publishVersions.forEach((version) => {
      counts[normalizeVersionAction(version.action)] += 1;
    });
    return counts;
  }, [selectedPackage]);
  const strategyNextStep = useMemo(
    () => strategySwitchPlan?.steps.find((step) => step.status === "next") ?? null,
    [strategySwitchPlan],
  );
  const filteredPublishVersions = useMemo(() => {
    const versions = selectedPackage?.publishVersions ?? [];
    if (versionActionFilter === "all") return versions;
    return versions.filter((version) => normalizeVersionAction(version.action) === versionActionFilter);
  }, [selectedPackage, versionActionFilter]);

  async function persistKnowledgeFeedbackReceipt(receipt: PlatformKnowledgeFeedbackReceipt) {
    const response = await fetch(`/api/projects/${projectId}/platform-export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save-knowledge-feedback", receipt }),
    });
    const payload = (await response.json().catch(() => null)) as {
      receipt?: PlatformKnowledgeFeedbackReceipt;
      history?: PlatformKnowledgeFeedbackReceipt[];
      error?: string;
    } | null;
    if (!response.ok || !payload?.history) throw new Error(payload?.error ?? "保存反哺链路历史失败。");
    return payload;
  }

  async function clearKnowledgeFeedbackHistory() {
    const response = await fetch(`/api/projects/${projectId}/platform-export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clear-knowledge-feedback" }),
    });
    const payload = (await response.json().catch(() => null)) as {
      history?: PlatformKnowledgeFeedbackReceipt[];
      error?: string;
    } | null;
    if (!response.ok || !payload) throw new Error(payload?.error ?? "清空反哺链路历史失败。");
    return payload.history ?? [];
  }

  async function recordKnowledgeFeedbackReceipt(receipt: PlatformKnowledgeFeedbackReceipt) {
    setKnowledgeFeedbackReceipt(receipt);
    setKnowledgeFeedbackHistory((current) => saveKnowledgeFeedbackHistory(projectId, [receipt, ...current]));
    try {
      const payload = await persistKnowledgeFeedbackReceipt(receipt);
      setKnowledgeFeedbackReceipt(payload.receipt ?? receipt);
      setKnowledgeFeedbackHistory(saveKnowledgeFeedbackHistory(projectId, payload.history ?? [receipt]));
    } catch {
      // Keep local history as a fallback when the server is unavailable.
    }
  }

  async function loadCenter(options?: { keepMessage?: boolean }) {
    setIsLoading(true);
    if (!options?.keepMessage) setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/platform-export`);
      if (!response.ok) {
        throw new Error("读取平台发布包失败。");
      }
      const payload = (await response.json()) as { center: PlatformPublishExportCenter };
      setCenter(payload.center);
      setSelectedPlatformId((current) => current || payload.center.recommendedPlatformId);
      setStrategySwitchPlan((current) => current ?? payload.center.activeStrategyPlan);
      const serverHistory = payload.center.knowledgeFeedbackHistory ?? [];
      if (serverHistory.length) {
        setKnowledgeFeedbackHistory(saveKnowledgeFeedbackHistory(projectId, serverHistory));
        setKnowledgeFeedbackReceipt((current) => current ?? serverHistory[0] ?? null);
      } else {
        const localHistory = loadKnowledgeFeedbackHistory(projectId);
        setKnowledgeFeedbackHistory(localHistory);
        setKnowledgeFeedbackReceipt((current) => current ?? localHistory[0] ?? null);
      }
      return payload.center;
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "读取平台发布包失败。");
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  async function loadVersionDetail(versionId: string) {
    setSelectedVersionId(versionId);
    setVersionDetail(null);
    setIsLoadingVersion(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/platform-export?versionId=${versionId}`);
      const payload = (await response.json().catch(() => null)) as (PublishPackageVersionDetailState & { error?: string }) | null;
      if (!response.ok || !payload) {
        throw new Error(payload?.error ?? "读取发布包版本失败。");
      }
      setVersionDetail({
        version: payload.version,
        comparison: payload.comparison,
        archiveGroup: payload.archiveGroup ?? null,
      });
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "读取发布包版本失败。");
    } finally {
      setIsLoadingVersion(false);
    }
  }

  async function restoreVersion() {
    if (!versionDetail) return;
    setIsRestoringVersion(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/platform-export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", versionId: versionDetail.version.id }),
      });
      const payload = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "恢复历史版本失败。");
      setMessage(payload?.message ?? "已恢复历史版本。");
      await loadCenter({ keepMessage: true });
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "恢复历史版本失败。");
    } finally {
      setIsRestoringVersion(false);
    }
  }

  async function saveSubmissionAsset(nextDraft: SubmissionAssetDraft = assetDraft, options?: SaveSubmissionAssetOptions) {
    if (!selectedPackage) return false;
    setIsSavingAsset(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/platform-export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save-asset",
          platformId: selectedPackage.platformId,
          saveAction: options?.saveAction,
          sourceTaskId: options?.sourceTaskId,
          strategy: options?.strategy,
          ...nextDraft,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "保存投稿资产失败。");
      setMessage(options?.message ?? payload?.message ?? "投稿资产已保存。");
      await loadCenter({ keepMessage: true });
      return true;
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "保存投稿资产失败。");
      return false;
    } finally {
      setIsSavingAsset(false);
    }
  }

  async function refreshStrategyPlan(platformId: string) {
    const response = await fetch(`/api/projects/${projectId}/platform-export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "refresh-strategy", platformId }),
    });
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      switchPlan?: PlatformStrategySwitchPlan;
    } | null;
    if (!response.ok || !payload?.switchPlan) throw new Error(payload?.error ?? "刷新策略执行链失败。");
    setStrategySwitchPlan(payload.switchPlan);
    return payload.switchPlan;
  }

  function openEffectCaptureSummaryAction() {
    if (!center) return;
    const summary = center.effectCaptureSummary;
    if (summary.primaryPlatformId) {
      setSelectedPlatformId(summary.primaryPlatformId);
      setSelectedVersionId(null);
    }
    if (typeof window !== "undefined") {
      window.location.hash = summary.actionHref;
    }
  }

  function openEffectCaptureTask(task: PlatformEffectCaptureTask) {
    setSelectedPlatformId(task.platformId);
    setSelectedVersionId(null);
    if (typeof window !== "undefined") {
      window.location.hash = task.actionHref;
    }
  }

  function openPlatformReadinessItem(item: PlatformReadinessItem) {
    setSelectedPlatformId(item.platformId);
    setSelectedVersionId(null);
    if (typeof window !== "undefined") {
      window.location.hash = item.actionHref;
    }
  }

  async function savePublishEffect() {
    if (!selectedPackage) return;
    const platformId = selectedPackage.platformId;
    setIsSavingEffect(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/platform-export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save-effect",
          platformId: selectedPackage.platformId,
          ...effectDraft,
          note: effectDraft.notes,
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        metric?: PlatformPublishMetric;
        effectReview?: PlatformPublishEffectSaveReview | null;
        completedMetricDispatch?: {
          dispatchKey: string;
          title: string;
          completionEvidence: string;
          receiptId: string;
          completedAt: string;
        } | null;
        startMetricAutoDispatch?: {
          createdDispatches: Array<{ title: string }>;
          skippedDispatches: Array<{ title: string }>;
        } | null;
        secondMetricAutoDispatch?: {
          createdDispatches: Array<{ title: string }>;
          skippedDispatches: Array<{ title: string }>;
        } | null;
        error?: string;
      } | null;
      if (!response.ok) throw new Error(payload?.error ?? "保存发布效果失败。");
      if (payload?.metric) {
        addGateActionReceipt(buildGatePublishEffectReceipt({
          projectId,
          platformId: payload.metric.platformId,
          platformName: payload.metric.platformName,
          metric: payload.metric,
        }));
      }
      if (payload?.effectReview) {
        setLatestEffectReview(payload.effectReview);
      }
      const reviewMessage = payload?.effectReview
        ? saveReviewMessage(payload.effectReview)
        : payload?.message ?? "发布效果已记录。";
      const dispatchMessage = payload?.completedMetricDispatch
        ? ` 已自动完成任务中心派单：${payload.completedMetricDispatch.title}。`
        : "";
      const startMetricMessage = payload?.startMetricAutoDispatch?.createdDispatches.length
        ? ` 已自动生成二轮任务：${payload.startMetricAutoDispatch.createdDispatches.map((item) => item.title).join("、")}。`
        : "";
      const secondMetricMessage = payload?.secondMetricAutoDispatch?.createdDispatches.length
        ? ` 已自动生成三轮动作：${payload.secondMetricAutoDispatch.createdDispatches.map((item) => item.title).join("、")}。`
        : "";
      setMessage(`${reviewMessage}${dispatchMessage}${startMetricMessage}${secondMetricMessage}`);
      await loadCenter({ keepMessage: true });
      if (strategySwitchPlan?.platformId === platformId) {
        const refreshedPlan = await refreshStrategyPlan(platformId);
        setStrategyExecutionReceipt(buildStrategyExecutionReceipt(refreshedPlan, "save-publish-effect"));
        setMessage(`${reviewMessage}${dispatchMessage}${startMetricMessage}${secondMetricMessage} 策略链已刷新。`);
      }
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "保存发布效果失败。");
    } finally {
      setIsSavingEffect(false);
    }
  }

  async function applyPlatformStrategy(item: PlatformStrategyRankItem) {
    setApplyingStrategyPlatformId(item.platformId);
    setStrategyExecutionReceipt(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/platform-export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply-strategy", platformId: item.platformId }),
      });
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        error?: string;
        switchPlan?: PlatformStrategySwitchPlan;
      } | null;
      if (!response.ok || !payload?.switchPlan) throw new Error(payload?.error ?? "应用平台策略失败。");
      setSelectedPlatformId(item.platformId);
      setSelectedVersionId(null);
      setVersionDetail(null);
      setVersionActionFilter("all");
      setStrategySwitchPlan(payload.switchPlan);
      setMessage(payload.message ?? `已应用 ${item.platformName} 平台策略。`);
      return await loadCenter({ keepMessage: true });
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "应用平台策略失败。");
      return null;
    } finally {
      setApplyingStrategyPlatformId(null);
    }
  }

  async function startKnowledgeFeedbackLoop(item: PlatformKnowledgeInsight) {
    const strategy = center?.platformStrategy.find((strategyItem) => strategyItem.platformId === item.platformId);
    if (!strategy) {
      setMessage(`没有找到 ${item.platformName} 的平台策略，先刷新发布中心。`);
      return;
    }

    setRunningKnowledgePlatformId(item.platformId);
    setStrategyExecutionReceipt(null);
    setStrategyReviewTaskReceipt(null);
    setKnowledgeFeedbackReceipt(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/platform-export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply-strategy", platformId: item.platformId }),
      });
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        error?: string;
        switchPlan?: PlatformStrategySwitchPlan;
      } | null;
      if (!response.ok || !payload?.switchPlan) throw new Error(payload?.error ?? "启动知识库反哺链失败。");
      setSelectedPlatformId(item.platformId);
      setSelectedVersionId(null);
      setVersionDetail(null);
      setVersionActionFilter("all");
      setStrategySwitchPlan(payload.switchPlan);
      setStrategyExecutionReceipt(buildStrategyExecutionReceipt(payload.switchPlan, "switch-target-platform"));
      const nextStep = payload.switchPlan.steps.find((step) => step.status === "next");
      if (nextStep?.executable) {
        const executionReceipt = await executeStrategyStep(payload.switchPlan, nextStep, { messagePrefix: item.feedbackLoop.headline });
        await recordKnowledgeFeedbackReceipt(buildKnowledgeFeedbackReceipt(item, nextStep, executionReceipt));
      } else {
        await loadCenter({ keepMessage: true });
        await recordKnowledgeFeedbackReceipt(buildKnowledgeFeedbackReceipt(item, nextStep ?? null, null));
        setMessage(`${item.feedbackLoop.headline} 已启动执行链，下一步：${nextStep?.label ?? item.feedbackLoop.nextStepLabel}。`);
        window.location.hash = nextStep?.href.replace(/^#/, "") ?? "platform-strategy-ranking";
      }
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "启动知识库反哺链失败。");
    } finally {
      setRunningKnowledgePlatformId(null);
    }
  }

  async function runStrategyReviewTask(item: PlatformStrategyRankItem, task: PlatformStrategyReviewTask) {
    const strategyPackage = center?.packages.find((pack) => pack.platformId === item.platformId);
    if (!strategyPackage) return;

    const taskRunId = `${item.platformId}:${task.id}`;
    setSelectedPlatformId(item.platformId);
    setSelectedVersionId(null);
    setVersionDetail(null);
    setRunningStrategyReviewTaskId(taskRunId);
    setStrategyReviewTaskReceipt(null);
    setMessage(null);

    try {
      if (task.execution === "open_target") {
        window.location.hash = task.href.replace(/^#/, "");
        setStrategyReviewTaskReceipt(buildStrategyReviewTaskReceipt(item, task, `已定位到「${task.label}」，现在要补具体内容，别只看一眼就走。`));
        setMessage(`已定位到「${task.label}」。`);
        return;
      }

      if (task.execution === "apply_strategy") {
        const refreshedCenter = await applyPlatformStrategy(item);
        const afterItem = refreshedCenter?.platformStrategy.find((strategy) => strategy.platformId === item.platformId) ?? item;
        setStrategyReviewTaskReceipt(buildStrategyReviewTaskReceipt(item, task, `已把 ${item.platformName} 作为当前策略动作推进对象。`, afterItem));
        return;
      }

      if (task.execution === "save_snapshot") {
        const response = await fetch(`/api/projects/${projectId}/platform-export`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "snapshot", platformId: item.platformId }),
        });
        const payload = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;
        if (!response.ok) throw new Error(payload?.error ?? "保存发布包版本失败。");
        setVersionActionFilter("snapshot");
        setMessage(payload?.message ?? `已保存 ${item.platformName} 发布包版本。`);
        const refreshedCenter = await loadCenter({ keepMessage: true });
        const afterItem = refreshedCenter?.platformStrategy.find((strategy) => strategy.platformId === item.platformId) ?? item;
        setStrategyReviewTaskReceipt(buildStrategyReviewTaskReceipt(item, task, payload?.message ?? `已保存 ${item.platformName} 发布包版本。`, afterItem));
        window.location.hash = "package-version-history";
        return;
      }

      if (task.execution === "generate_asset_variants") {
        const nextDraft = {
          title: strategyPackage.title,
          logline: strategyPackage.logline,
          synopsis: strategyPackage.category === "overseas"
            ? strategyPackage.submissionAsset?.synopsis ?? ""
            : strategyPackage.synopsis,
          overseasSynopsis: strategyPackage.category === "overseas"
            ? strategyPackage.synopsis
            : strategyPackage.submissionAsset?.overseasSynopsis ?? "",
          tags: strategyPackage.tags.join("、"),
          note: strategyPackage.submissionAsset?.note ?? "",
        };
        setAssetDraft(nextDraft);
        setAssetOptimizationVariants([]);
        setIsOptimizingAsset(true);
        const response = await fetch(`/api/projects/${projectId}/platform-export/asset-optimize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            platformId: strategyPackage.platformId,
            ...nextDraft,
          }),
        });
        const payload = (await response.json().catch(() => null)) as {
          task?: { id: string };
          variants?: PlatformSubmissionAssetOptimizationVariant[];
          error?: string;
        } | null;
        if (!response.ok || !payload?.variants) throw new Error(payload?.error ?? "AI 优化投稿资产失败。");
        setAssetOptimizationVariants(payload.variants.map((variant) => ({ ...variant, sourceTaskId: payload.task?.id })));
        const refreshedCenter = await loadCenter({ keepMessage: true });
        const afterItem = refreshedCenter?.platformStrategy.find((strategy) => strategy.platformId === item.platformId) ?? item;
        setStrategyReviewTaskReceipt(buildStrategyReviewTaskReceipt(item, task, `已生成 ${payload.variants.length} 个 ${strategyPackage.platformName} 投稿资产候选。`, afterItem));
        setMessage(`已执行「${task.label}」，生成 ${payload.variants.length} 个 ${strategyPackage.platformName} 投稿资产候选。`);
        window.location.hash = "submission-asset-editor";
        return;
      }

      if (task.execution === "rewrite_first_three") {
        const response = await fetch(`/api/projects/${projectId}/first-three-rewrite/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platformId: strategyPackage.platformId, chapterOrders: [1, 2, 3], targetWords: 1600 }),
        });
        const payload = (await response.json().catch(() => null)) as {
          results?: { order: number }[];
          error?: string;
        } | null;
        if (!response.ok || !payload?.results) throw new Error(payload?.error ?? "前三章二轮重写失败。");
        const refreshedCenter = await loadCenter({ keepMessage: true });
        const afterItem = refreshedCenter?.platformStrategy.find((strategy) => strategy.platformId === item.platformId) ?? item;
        const refreshedPlan = await refreshStrategyPlan(strategyPackage.platformId);
        setStrategyExecutionReceipt(buildStrategyExecutionReceipt(refreshedPlan, "rewrite-first-three", payload.results.length));
        setStrategyReviewTaskReceipt(buildStrategyReviewTaskReceipt(item, task, `已重写前三章共 ${payload.results.length} 章。`, afterItem));
        setMessage(`已执行「${task.label}」，重写前三章共 ${payload.results.length} 章，策略链已刷新。`);
        return;
      }
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "执行复盘任务失败。");
    } finally {
      setIsOptimizingAsset(false);
      setRunningStrategyReviewTaskId(null);
    }
  }

  async function executeStrategyStep(
    plan: PlatformStrategySwitchPlan,
    step: PlatformStrategySwitchStep,
    options?: { messagePrefix?: string },
  ) {
    const strategyPackage = center?.packages.find((pack) => pack.platformId === plan.platformId) ?? selectedPackage;
    if (!strategyPackage) return null;
    setSelectedPlatformId(strategyPackage.platformId);
    setRunningStrategyStepId(step.id);
    setMessage(null);

    try {
      if (step.id === "save-evidence-baseline") {
        const response = await fetch(`/api/projects/${projectId}/platform-export`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "snapshot", platformId: strategyPackage.platformId }),
        });
        const payload = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;
        if (!response.ok) throw new Error(payload?.error ?? "保存发布包版本失败。");
        setVersionActionFilter("snapshot");
        await loadCenter({ keepMessage: true });
        const refreshedPlan = await refreshStrategyPlan(strategyPackage.platformId);
        const receipt = buildStrategyExecutionReceipt(refreshedPlan, step.id);
        setStrategyExecutionReceipt(receipt);
        setMessage(`${options?.messagePrefix ? `${options.messagePrefix} ` : ""}${payload?.message ?? `已保存 ${strategyPackage.platformName} 证据基准。`}`);
        window.location.hash = "package-version-history";
        return receipt;
      } else if (step.id === "fix-submission-asset") {
        const nextDraft = {
          title: strategyPackage.title,
          logline: strategyPackage.logline,
          synopsis: strategyPackage.category === "overseas"
            ? strategyPackage.submissionAsset?.synopsis ?? ""
            : strategyPackage.synopsis,
          overseasSynopsis: strategyPackage.category === "overseas"
            ? strategyPackage.synopsis
            : strategyPackage.submissionAsset?.overseasSynopsis ?? "",
          tags: strategyPackage.tags.join("、"),
          note: strategyPackage.submissionAsset?.note ?? "",
        };
        setAssetDraft(nextDraft);
        setIsOptimizingAsset(true);
        setAssetOptimizationVariants([]);
        const response = await fetch(`/api/projects/${projectId}/platform-export/asset-optimize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            platformId: strategyPackage.platformId,
            ...nextDraft,
          }),
        });
        const payload = (await response.json().catch(() => null)) as {
          task?: { id: string };
          variants?: PlatformSubmissionAssetOptimizationVariant[];
          error?: string;
        } | null;
        if (!response.ok || !payload?.variants) throw new Error(payload?.error ?? "AI 优化投稿资产失败。");
        setAssetOptimizationVariants(payload.variants.map((variant) => ({ ...variant, sourceTaskId: payload.task?.id })));
        const receipt = buildStrategyExecutionReceipt(plan, step.id, payload.variants.length);
        setStrategyExecutionReceipt(receipt);
        setMessage(`${options?.messagePrefix ? `${options.messagePrefix} ` : ""}已按执行链生成 ${payload.variants.length} 个 ${strategyPackage.platformName} 投稿资产候选。`);
        window.location.hash = "submission-asset-editor";
        return receipt;
      } else if (step.id === "rewrite-first-three") {
        const response = await fetch(`/api/projects/${projectId}/first-three-rewrite/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platformId: strategyPackage.platformId, chapterOrders: [1, 2, 3], targetWords: 1600 }),
        });
        const payload = (await response.json().catch(() => null)) as {
          results?: { order: number }[];
          error?: string;
        } | null;
        if (!response.ok || !payload?.results) throw new Error(payload?.error ?? "前三章二轮重写失败。");
        await loadCenter({ keepMessage: true });
        const refreshedPlan = await refreshStrategyPlan(strategyPackage.platformId);
        const receipt = buildStrategyExecutionReceipt(refreshedPlan, step.id, payload.results.length);
        setStrategyExecutionReceipt(receipt);
        setMessage(`${options?.messagePrefix ? `${options.messagePrefix} ` : ""}已按执行链重写 ${strategyPackage.platformName} 前三章，共 ${payload.results.length} 章，策略链已刷新。`);
        return receipt;
      } else if (step.id === "record-publish-effect") {
        window.location.hash = "publish-effect-panel";
        const receipt = buildStrategyExecutionReceipt(plan, step.id);
        setStrategyExecutionReceipt(receipt);
        setMessage(`${options?.messagePrefix ? `${options.messagePrefix} ` : ""}下一步是录入真实发布效果：把曝光、点击、收藏、追读和编辑反馈填进去。`);
        return receipt;
      }
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "执行策略下一步失败。");
      return null;
    } finally {
      setIsOptimizingAsset(false);
      setRunningStrategyStepId(null);
    }
    return null;
  }

  async function executeStrategyNextStep() {
    if (!strategySwitchPlan || !strategyNextStep) return;
    await executeStrategyStep(strategySwitchPlan, strategyNextStep);
  }

  async function optimizeSubmissionAsset() {
    if (!selectedPackage) return false;
    setIsOptimizingAsset(true);
    setAssetOptimizationVariants([]);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/platform-export/asset-optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platformId: selectedPackage.platformId,
          ...assetDraft,
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        task?: { id: string };
        variants?: PlatformSubmissionAssetOptimizationVariant[];
        error?: string;
      } | null;
      if (!response.ok || !payload?.variants) throw new Error(payload?.error ?? "AI 优化投稿资产失败。");
      setAssetOptimizationVariants(payload.variants.map((variant) => ({ ...variant, sourceTaskId: payload.task?.id })));
      setMessage(`已生成 ${payload.variants.length} 个 ${selectedPackage.platformName} 投稿优化方案。`);
      await loadCenter({ keepMessage: true });
      return true;
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "AI 优化投稿资产失败。");
      return false;
    } finally {
      setIsOptimizingAsset(false);
    }
  }

  async function runEffectOptimizationAction(action: PlatformPublishOptimizationAction) {
    if (!selectedPackage) return;
    if (action.execution === "open_target") {
      window.location.hash = action.href.replace(/^#/, "");
      return;
    }

    setRunningOptimizationActionId(action.id);
    setMessage(null);
    try {
      if (action.execution === "generate_asset_variants") {
        const succeeded = await optimizeSubmissionAsset();
        if (!succeeded) return;
        setMessage(`已按「${action.label}」生成投稿资产候选方案。`);
      } else if (action.execution === "rewrite_first_three") {
        const response = await fetch(`/api/projects/${projectId}/first-three-rewrite/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platformId: selectedPackage.platformId, chapterOrders: [1, 2, 3], targetWords: 1600 }),
        });
        const payload = (await response.json().catch(() => null)) as {
          results?: { order: number }[];
          error?: string;
        } | null;
        if (!response.ok || !payload?.results) throw new Error(payload?.error ?? "前三章二轮重写失败。");
        setMessage(`已按「${action.label}」重写前三章，共 ${payload.results.length} 章。`);
        await loadCenter({ keepMessage: true });
      }
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "二轮优化执行失败。");
    } finally {
      setRunningOptimizationActionId(null);
    }
  }

  async function applyOptimizationVariant(variant: PlatformSubmissionAssetOptimizationVariant) {
    const platformId = selectedPackage?.platformId;
    const nextDraft = {
      title: variant.title,
      logline: variant.logline,
      synopsis: variant.synopsis,
      overseasSynopsis: variant.overseasSynopsis,
      tags: variant.tags.join("、"),
      note: assetDraft.note,
    };
    setAssetDraft(nextDraft);
    const saved = await saveSubmissionAsset(nextDraft, {
      message: `已采纳并保存「${variant.strategy}」。`,
      saveAction: "adopt",
      sourceTaskId: variant.sourceTaskId,
      strategy: variant.strategy,
    });
    if (saved && selectedPackage) {
      const receipt = buildSubmissionAssetAdoptionReviewReceipt({
        platformName: selectedPackage.platformName,
        strategy: variant.strategy,
        audit: variant.audit,
        addressedIssues: variant.addressedIssues,
      });
      setAssetAdoptionReceipt(receipt);
      setMessage(receipt.message);
    }
    if (!saved || !platformId || strategySwitchPlan?.platformId !== platformId) return;
    try {
      const refreshedPlan = await refreshStrategyPlan(platformId);
      setStrategyExecutionReceipt(buildStrategyExecutionReceipt(refreshedPlan, "adopt-submission-asset"));
      setMessage(`已采纳并保存「${variant.strategy}」，策略链已刷新。${variant.audit.status === "ready" ? " 投稿资产已通过复检。" : " 投稿资产仍需继续修。"}`);
    } catch (caught) {
      setStrategyExecutionReceipt(buildStrategyExecutionReceipt(strategySwitchPlan, "adopt-submission-asset"));
      setMessage(caught instanceof Error ? caught.message : "投稿资产已保存，但策略链刷新失败。");
    }
  }

  async function applyExperimentCandidate(candidate: PlatformABExperimentCandidate) {
    const nextDraft = {
      title: candidate.title,
      logline: candidate.logline,
      synopsis: candidate.synopsis,
      overseasSynopsis: candidate.overseasSynopsis,
      tags: candidate.tags.join("、"),
      note: assetDraft.note,
    };
    setAssetDraft(nextDraft);
    const saved = await saveSubmissionAsset(nextDraft, {
      message: `已采纳 A/B 候选「${candidate.strategy}」。下一步保存发布基准并投放测试。`,
      saveAction: "adopt",
      sourceTaskId: candidate.sourceTaskId,
      strategy: candidate.strategy,
    });
    if (saved) {
      await loadCenter({ keepMessage: true });
    }
  }

  async function copyMarkdown() {
    if (!selectedPackage) return;
    if (!selectedPackage.canExport) {
      setMessage("发布前质检未通过，先处理阻塞项。");
      return;
    }
    await navigator.clipboard.writeText(selectedPackage.markdown);
    try {
      const response = await fetch(`/api/projects/${projectId}/platform-export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platformId: selectedPackage.platformId, action: "copy" }),
      });
      const payload = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "发布包已复制，但版本保存失败。");
      setMessage(`已复制 ${selectedPackage.platformName} 发布包，并保存版本。下一步记录真实发布效果。`);
      await loadCenter({ keepMessage: true });
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "发布包已复制，但版本保存失败。");
    }
  }

  async function downloadMarkdown() {
    if (!selectedPackage) return;
    if (!selectedPackage.canExport) {
      setMessage("发布前质检未通过，暂不允许下载发布包。");
      return;
    }
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/platform-export?platformId=${selectedPackage.platformId}&format=markdown`);
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? "下载发布包失败。");
      }
      const markdown = await response.text();
      const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${selectedPackage.title}-${selectedPackage.platformName}-发布包.md`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage(`已下载 ${selectedPackage.platformName} 发布包，并保存版本。下一步记录真实发布效果。`);
      await loadCenter({ keepMessage: true });
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "下载发布包失败。");
    } finally {
      setIsLoading(false);
    }
  }

  async function downloadArchive() {
    if (!exportablePackages.length) {
      setMessage("暂无通过质检的平台包，先处理发布前阻塞项。");
      return;
    }
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/platform-export?format=archive`);
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? "下载全平台投稿包失败。");
      }
      const markdown = await response.text();
      const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "全平台投稿包.md";
      link.click();
      URL.revokeObjectURL(url);
      setMessage(`已下载全平台投稿包，包含 ${exportablePackages.length} 个通过质检的平台版本。下一步记录各平台真实效果。`);
      await loadCenter({ keepMessage: true });
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "下载全平台投稿包失败。");
    } finally {
      setIsLoading(false);
    }
  }

  async function runRepairAction(action: PublishRepairAction) {
    if (!canRunAction(action)) return;
    setRunningActionId(action.id);
    setMessage(null);
    setRunResults([pendingResultFromAction(action)]);
    setRepairNextAction(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/platform-export/repair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: action.kind,
          chapterId: action.chapterId,
          chapterTitle: action.chapterTitle,
          candidateRevisionId: action.candidateRevisionId,
          detail: action.detail,
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        error?: string;
        result?: RawPublishRepairRunResult;
        results?: RawPublishRepairRunResult[];
        nextAction?: PublishRepairNextAction | null;
      } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "修复动作执行失败。");
      }
      const results = payload?.results?.length
        ? payload.results.map(normalizeRunResult)
        : payload?.result
          ? [normalizeRunResult(payload.result)]
          : [];
      setRunResults(results.length ? results : [{ ...pendingResultFromAction(action), status: "succeeded", message: payload?.message ?? "修复动作已完成。" }]);
      setMessage(payload?.message ?? "修复动作已完成。");
      setRepairNextAction(payload?.nextAction ?? null);
      await loadCenter({ keepMessage: true });
    } catch (caught) {
      const errorMessage = caught instanceof Error ? caught.message : "修复动作执行失败。";
      setRunResults([{ ...pendingResultFromAction(action), status: "failed", error: errorMessage, message: errorMessage }]);
      setMessage(errorMessage);
    } finally {
      setRunningActionId(null);
    }
  }

  async function runBatchRepairActions() {
    if (!executableActions.length) return;
    setRunningActionId("batch");
    setMessage(null);
    setRunResults(executableActions.map(pendingResultFromAction));
    setRepairNextAction(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/platform-export/repair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actions: executableActions.map((action) => ({
            kind: action.kind,
            chapterId: action.chapterId,
            chapterTitle: action.chapterTitle,
            candidateRevisionId: action.candidateRevisionId,
            detail: action.detail,
          })),
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        error?: string;
        results?: RawPublishRepairRunResult[];
        nextAction?: PublishRepairNextAction | null;
      } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "批量修复失败。");
      }
      setRunResults(payload?.results?.map(normalizeRunResult) ?? []);
      setMessage(payload?.message ?? "批量修复已完成。");
      setRepairNextAction(payload?.nextAction ?? null);
      await loadCenter({ keepMessage: true });
    } catch (caught) {
      const errorMessage = caught instanceof Error ? caught.message : "批量修复失败。";
      setRunResults((current) => current.map((result) => ({ ...result, status: "failed", error: errorMessage, message: errorMessage })));
      setMessage(errorMessage);
    } finally {
      setRunningActionId(null);
    }
  }

  async function runWorkspaceBatchRepairActions() {
    if (!workspaceExecutableActions.length) return;
    setRunningActionId("workspace-batch");
    setMessage(null);
    setRunResults(workspaceExecutableActions.map(pendingResultFromAction));
    setRepairNextAction(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/platform-export/repair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actions: workspaceExecutableActions.map((action) => ({
            kind: action.kind,
            chapterId: action.chapterId,
            chapterTitle: action.chapterTitle,
            candidateRevisionId: action.candidateRevisionId,
            detail: action.detail,
          })),
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        error?: string;
        results?: RawPublishRepairRunResult[];
        nextAction?: PublishRepairNextAction | null;
      } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "全平台批量修复失败。");
      }
      setRunResults(payload?.results?.map(normalizeRunResult) ?? []);
      setMessage(payload?.message ?? "全平台批量修复已完成。");
      setRepairNextAction(payload?.nextAction ?? null);
      await loadCenter({ keepMessage: true });
    } catch (caught) {
      const errorMessage = caught instanceof Error ? caught.message : "全平台批量修复失败。";
      setRunResults((current) => current.map((result) => ({ ...result, status: "failed", error: errorMessage, message: errorMessage })));
      setMessage(errorMessage);
    } finally {
      setRunningActionId(null);
    }
  }

  useEffect(() => {
    void loadCenter();
  }, [projectId]);

  useEffect(() => {
    const history = loadKnowledgeFeedbackHistory(projectId);
    setKnowledgeFeedbackHistory(history);
    setKnowledgeFeedbackReceipt(history[0] ?? null);
  }, [projectId]);

  useEffect(() => {
    if (!selectedPackage) return;
    setAssetDraft({
      title: selectedPackage.title,
      logline: selectedPackage.logline,
      synopsis: selectedPackage.category === "overseas"
        ? selectedPackage.submissionAsset?.synopsis ?? ""
        : selectedPackage.synopsis,
      overseasSynopsis: selectedPackage.category === "overseas"
        ? selectedPackage.synopsis
        : selectedPackage.submissionAsset?.overseasSynopsis ?? "",
      tags: selectedPackage.tags.join("、"),
      note: selectedPackage.submissionAsset?.note ?? "",
    });
    setAssetOptimizationVariants([]);
  }, [selectedPackage?.platformId, selectedPackage?.submissionAsset?.updatedAt]);

  useEffect(() => {
    if (!selectedPackage) return;
    const latest = selectedPackage.publishEffect.latest;
    setEffectDraft({
      views: latest ? String(latest.views) : "",
      clicks: latest ? String(latest.clicks) : "",
      favorites: latest ? String(latest.favorites) : "",
      follows: latest ? String(latest.follows) : "",
      comments: latest ? String(latest.comments) : "",
      paidReads: latest ? String(latest.paidReads) : "",
      contractStatus: latest?.contractStatus ?? "unknown",
      publishUrl: latest?.publishUrl ?? "",
      editorFeedback: latest?.editorFeedback ?? "",
      notes: latest?.notes ?? "",
      snapshotDate: formatDateInput(latest?.snapshotDate),
    });
  }, [selectedPackage?.platformId, selectedPackage?.publishEffect.latest?.id]);

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-medium">平台发布适配与导出中心</h2>
          <p className="mt-1 text-sm text-slate-600">按不同平台整理标题、简介、标签、正文格式和发布提醒，支持复制或下载 Markdown。</p>
        </div>
        <button
          className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          disabled={isLoading}
          onClick={() => void loadCenter()}
          type="button"
        >
          {isLoading ? "读取中" : "刷新发布包"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[220px_1fr_auto]">
        <label className="grid gap-1 text-sm text-slate-600">
          发布平台
          <select
            className="rounded-md border border-slate-200 px-3 py-2"
            onChange={(event) => {
              setSelectedPlatformId(event.target.value);
              setSelectedVersionId(null);
              setVersionDetail(null);
              setVersionActionFilter("all");
              setAssetAdoptionReceipt(null);
            }}
            value={selectedPlatformId}
          >
            {center?.packages.map((pack) => (
              <option key={pack.platformId} value={pack.platformId}>{pack.platformName}</option>
            ))}
          </select>
        </label>
        <div className="rounded-md bg-slate-50 p-3">
          <div className="text-xs text-slate-500">可导出章节</div>
          <div className="mt-1 text-2xl font-semibold text-slate-950">{center?.totalPublishableChapters ?? 0}</div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <button
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            disabled={!selectedPackage || !selectedPackage.canExport}
            onClick={copyMarkdown}
            type="button"
          >
            复制发布包
          </button>
          <button
            className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            disabled={!selectedPackage || !selectedPackage.canExport || isLoading}
            onClick={downloadMarkdown}
            type="button"
          >
            下载发布包
          </button>
          <button
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50 disabled:opacity-50"
            disabled={!exportablePackages.length || isLoading}
            onClick={downloadArchive}
            type="button"
          >
            下载全平台包
          </button>
        </div>
      </div>

      {center ? (
        <div className="mt-3 grid gap-2 rounded-md bg-slate-50 p-3 text-sm text-slate-600 sm:grid-cols-3">
          <div>
            <div className="text-xs text-slate-500">全平台归档</div>
            <div className="mt-1 font-medium text-slate-950">可导出 {exportablePackages.length}/{center.packages.length}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">待处理平台</div>
            <div className="mt-1 font-medium text-slate-950">{center.packages.length - exportablePackages.length}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">归档内容</div>
            <div className="mt-1 font-medium text-slate-950">清单 + Markdown 正文</div>
          </div>
        </div>
      ) : null}

      {center ? (
        <div className="mt-3 rounded-md border border-slate-200 p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="font-medium text-slate-950">全平台发布工作台</div>
              <p className="mt-1 text-sm leading-6 text-slate-600">{center.workspace.headline}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="w-fit rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                disabled={!workspaceExecutableActions.length || Boolean(runningActionId)}
                onClick={() => void runWorkspaceBatchRepairActions()}
                type="button"
              >
                {runningActionId === "workspace-batch" ? "批量处理中" : `批量处理全平台前 ${workspaceExecutableActions.length} 项`}
              </button>
              <button
                className="w-fit rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                disabled={!exportablePackages.length || isLoading}
                onClick={downloadArchive}
                type="button"
              >
                下载全平台包
              </button>
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-md bg-slate-50 p-2">
              <div className="text-xs text-slate-500">就绪平台</div>
              <div className="mt-1 font-medium text-slate-950">{center.workspace.readyPlatforms}/{center.packages.length}</div>
            </div>
            <div className="rounded-md bg-slate-50 p-2">
              <div className="text-xs text-slate-500">平均质检</div>
              <div className="mt-1 font-medium text-slate-950">{center.workspace.averagePreflightScore}</div>
            </div>
            <div className="rounded-md bg-slate-50 p-2">
              <div className="text-xs text-slate-500">阻塞项</div>
              <div className="mt-1 font-medium text-slate-950">{center.workspace.totalBlockedItems}</div>
            </div>
            <div className="rounded-md bg-slate-50 p-2">
              <div className="text-xs text-slate-500">提醒</div>
              <div className="mt-1 font-medium text-slate-950">{center.workspace.totalWarnings}</div>
            </div>
            <div className="rounded-md bg-slate-50 p-2">
              <div className="text-xs text-slate-500">可自动修</div>
              <div className="mt-1 font-medium text-slate-950">{center.workspace.executableActions}</div>
            </div>
            <div className="rounded-md bg-slate-50 p-2">
              <div className="text-xs text-slate-500">需手动</div>
              <div className="mt-1 font-medium text-slate-950">{center.workspace.manualActions}</div>
            </div>
          </div>
          <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="font-medium text-slate-950">8 平台闭环总览</div>
                <p className="mt-1 text-sm leading-6 text-slate-600">{center.platformReadinessSummary.headline}</p>
              </div>
              {center.platformReadinessSummary.primaryAction ? (
                <button
                  className="w-fit rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white"
                  onClick={() => center.platformReadinessSummary.primaryAction && openPlatformReadinessItem(center.platformReadinessSummary.primaryAction)}
                  type="button"
                >
                  {center.platformReadinessSummary.primaryAction.actionLabel}
                </button>
              ) : null}
            </div>
            <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-5">
              <div>已可投 <span className="font-medium text-slate-950">{center.platformReadinessSummary.readyToSubmitCount}</span></div>
              <div>需导出包 <span className="font-medium text-slate-950">{center.platformReadinessSummary.needsPackageExportCount}</span></div>
              <div>需补效果 <span className="font-medium text-slate-950">{center.platformReadinessSummary.needsEffectRecordCount}</span></div>
              <div>需修投稿 <span className="font-medium text-slate-950">{center.platformReadinessSummary.needsSubmissionRepairCount}</span></div>
              <div>未生成包 <span className="font-medium text-slate-950">{center.platformReadinessSummary.notGeneratedCount}</span></div>
            </div>
            <div className="mt-2 rounded-md bg-slate-50 p-2 text-sm text-slate-700">
              <span className="font-medium text-slate-950">下一步：</span>{center.platformReadinessSummary.nextAction}
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {center.platformReadinessSummary.items.map((item) => (
                <button
                  className="rounded-md border border-slate-100 bg-slate-50 p-3 text-left text-sm hover:border-slate-300 hover:bg-white"
                  key={item.platformId}
                  onClick={() => openPlatformReadinessItem(item)}
                  type="button"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="font-medium text-slate-950">{item.platformName}</div>
                    <span className={`rounded-md px-2 py-1 text-[11px] font-medium ${platformReadinessStatusClass(item.status)}`}>
                      {item.label}
                    </span>
                  </div>
                  <div className="mt-2 text-xs leading-5 text-slate-500">
                    质检 {item.preflightScore} · 终检 {item.finalGateScore}
                  </div>
                  <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                    {item.blockers[0] ?? item.detail}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="font-medium text-slate-950">全平台效果回填总览</div>
                <p className="mt-1 text-sm leading-6 text-slate-600">{center.effectCaptureSummary.headline}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`w-fit rounded-md px-2 py-1 text-xs font-medium ${effectCaptureStatusClass(center.effectCaptureSummary.status)}`}>
                  {effectCaptureStatusLabel(center.effectCaptureSummary.status)}
                </span>
                <button
                  className="w-fit rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white"
                  onClick={openEffectCaptureSummaryAction}
                  type="button"
                >
                  {center.effectCaptureSummary.actionLabel}
                </button>
              </div>
            </div>
            <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-4">
              <div>可复盘 <span className="font-medium text-slate-950">{center.effectCaptureSummary.readyToReviewCount}</span></div>
              <div>待回填 <span className="font-medium text-slate-950">{center.effectCaptureSummary.needsRecordCount}</span></div>
              <div>缺字段平台 <span className="font-medium text-slate-950">{center.effectCaptureSummary.missingFieldPlatformCount}</span></div>
              <div>缺字段 <span className="font-medium text-slate-950">{center.effectCaptureSummary.missingFieldCount}</span></div>
            </div>
            {center.effectCaptureSummary.platformNamesNeedingInput.length ? (
              <div className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                {center.effectCaptureSummary.platformNamesNeedingInput.join("、")}
              </div>
            ) : null}
            <div className="mt-2 rounded-md bg-slate-50 p-2 text-sm text-slate-700">
              <span className="font-medium text-slate-950">下一步：</span>{center.effectCaptureSummary.nextAction}
            </div>
            {center.effectCaptureSummary.tasks.length ? (
              <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                {center.effectCaptureSummary.tasks.slice(0, 4).map((task) => (
                  <div className="rounded-md bg-slate-50 p-3 text-sm" key={task.platformId}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="font-medium text-slate-950">{task.platformName}</div>
                      <span className={`rounded-md px-2 py-1 text-[11px] font-medium ${effectCaptureStatusClass(task.status)}`}>
                        {effectCaptureStatusLabel(task.status)}
                      </span>
                    </div>
                    <div className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                      缺：{task.missingFields.join("、") || "无"}
                    </div>
                    <button
                      className="mt-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      onClick={() => openEffectCaptureTask(task)}
                      type="button"
                    >
                      {task.actionLabel}
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          {center.executionHandoffs.length ? (
            <div className="mt-3 rounded-md border border-slate-200 p-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="font-medium text-slate-950">8 平台执行交接卡</div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">把参考库的平台抓手接到当前作品包：每个平台都显示写作、投稿、复盘和当前要处理的动作。</p>
                </div>
                <div className="text-xs text-slate-500">平台还差 0 个</div>
              </div>
              <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="font-medium text-slate-950">{center.executionHandoffSummary.headline}</div>
                    <p className="mt-1 leading-6 text-slate-600">{center.executionHandoffSummary.nextAction}</p>
                  </div>
                  {center.executionHandoffSummary.primaryAction ? (
                    <Link
                      className="w-fit rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white"
                      href={handoffActionHref(projectId, center.executionHandoffSummary.primaryAction)}
                    >
                      {center.executionHandoffSummary.primaryAction.actionLabel}
                    </Link>
                  ) : null}
                </div>
                <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
                  <div>可导出 <span className="font-medium text-slate-950">{center.executionHandoffSummary.readyCount}</span></div>
                  <div>待处理 <span className="font-medium text-slate-950">{center.executionHandoffSummary.blockedCount}</span></div>
                  <div>影响平台 <span className="font-medium text-slate-950">{center.executionHandoffSummary.primaryActionCount}</span></div>
                </div>
                {center.executionHandoffSummary.primaryActionPlatformNames.length ? (
                  <div className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                    {center.executionHandoffSummary.primaryActionPlatformNames.join("、")}
                  </div>
                ) : null}
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                {center.executionHandoffs.map((item) => (
                  <div className="rounded-md bg-slate-50 p-3 text-sm" key={item.platformId}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="font-medium text-slate-950">{item.platformName}</div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {item.pipelineStages.map((stage) => (
                            <span className="rounded-md bg-white px-1.5 py-0.5 text-[11px] text-slate-500" key={stage}>
                              {stage}
                            </span>
                          ))}
                        </div>
                      </div>
                      <span className={`rounded-md px-2 py-1 text-[11px] font-medium ${item.canExport ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {item.canExport ? "可导出" : "待修"}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-500">
                      <div>质检 <span className="font-medium text-slate-950">{item.preflightScore}</span></div>
                      <div>阻塞 <span className="font-medium text-slate-950">{item.blockedCount}</span></div>
                      <div>提醒 <span className="font-medium text-slate-950">{item.warningCount}</span></div>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs leading-5 text-slate-600">
                      <div>写作：{item.writingFocus.join("、")}</div>
                      <div>投稿：{item.submissionFocus.join("、")}</div>
                      <div>复盘：{item.feedbackMetric.join("、")}</div>
                    </div>
                    <div className="mt-3 rounded-md bg-white px-2 py-1.5 text-xs leading-5 text-slate-600">
                      <div>{item.currentAction}</div>
                      <Link
                        className="mt-2 inline-flex w-fit rounded-md bg-slate-950 px-2 py-1 text-[11px] font-medium text-white"
                        href={handoffActionHref(projectId, item)}
                      >
                        {item.actionLabel}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {center.workspace.nextActions.length ? (
            <div className="mt-3 grid gap-2 lg:grid-cols-2">
              {center.workspace.nextActions.slice(0, 4).map((action) => (
                <div className="rounded-md bg-slate-50 p-3 text-sm" key={`${action.kind}-${action.chapterId ?? "project"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-slate-950">{action.label}</div>
                      {action.chapterTitle ? <div className="mt-1 text-xs text-slate-500">{action.chapterTitle}</div> : null}
                    </div>
                    <div className="text-xs text-slate-500">影响 {action.occurrenceCount} 个平台</div>
                  </div>
                  <p className="mt-2 leading-6 text-slate-600">{action.detail}</p>
                  <div className="mt-2 line-clamp-2 text-xs text-slate-500">{action.platformNames.join("、")}</div>
                </div>
              ))}
            </div>
          ) : null}
          <div className="mt-3 rounded-md border border-slate-200 p-3" id="platform-strategy-verdict">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-medium text-slate-950">平台策略自动裁决</div>
                  <span className={`rounded-md px-2 py-1 text-[11px] font-medium ${strategyVerdictStatusClass(center.strategyVerdict.status)}`}>
                    {strategyVerdictStatusLabel(center.strategyVerdict.status)}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-600">{center.strategyVerdict.headline}</p>
                <div className="mt-2 rounded-md bg-slate-50 px-2 py-1 text-xs leading-5 text-slate-600">
                  下一刀：{center.strategyVerdict.nextAction}
                </div>
              </div>
              {center.strategyVerdict.primary ? (
                <button
                  className="w-fit rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                  disabled={Boolean(applyingStrategyPlatformId)}
                  onClick={() => {
                    const target = center.platformStrategy.find((strategy) => strategy.platformId === center.strategyVerdict.primary?.platformId);
                    if (target) void applyPlatformStrategy(target);
                  }}
                  type="button"
                >
                  {applyingStrategyPlatformId === center.strategyVerdict.primary.platformId ? "应用中" : "应用主平台裁决"}
                </button>
              ) : null}
            </div>
            <div className="mt-3 grid gap-2 lg:grid-cols-3">
              {center.strategyVerdict.primary ? (
                <div className="rounded-md bg-slate-50 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-slate-950">{center.strategyVerdict.primary.platformName}</span>
                    <span className={`rounded-md px-2 py-1 text-[11px] font-medium ${strategyVerdictRoleClass(center.strategyVerdict.primary.role)}`}>
                      {strategyVerdictRoleLabel(center.strategyVerdict.primary.role)}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500">
                    <div>策略分 <span className="font-medium text-slate-950">{center.strategyVerdict.primary.score}</span></div>
                    <div>证据分 <span className="font-medium text-slate-950">{center.strategyVerdict.primary.evidenceScore}</span></div>
                  </div>
                  <p className="mt-2 leading-6 text-slate-600">{center.strategyVerdict.primary.reason}</p>
                  <div className="mt-2 rounded-md bg-white px-2 py-1 text-xs leading-5 text-slate-500">
                    {center.strategyVerdict.primary.action}
                  </div>
                </div>
              ) : null}
              <div className="rounded-md bg-slate-50 p-3 text-sm">
                <div className="font-medium text-slate-950">备选平台</div>
                <div className="mt-2 grid gap-1.5">
                  {center.strategyVerdict.backups.length ? center.strategyVerdict.backups.map((item) => (
                    <div className="rounded-md bg-white p-2" key={item.platformId}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-slate-800">{item.platformName}</span>
                        <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${strategyVerdictRoleClass(item.role)}`}>
                          {strategyVerdictRoleLabel(item.role)} · {item.score}
                        </span>
                      </div>
                      <div className="mt-1 leading-5 text-slate-500">{item.reason}</div>
                    </div>
                  )) : (
                    <div className="rounded-md bg-white p-2 text-xs leading-5 text-slate-500">暂无合格备选，先把主平台证据链跑完。</div>
                  )}
                </div>
              </div>
              <div className="rounded-md bg-slate-50 p-3 text-sm">
                <div className="font-medium text-slate-950">降权/禁投</div>
                <div className="mt-2 grid gap-1.5">
                  {center.strategyVerdict.blocked.length ? center.strategyVerdict.blocked.map((item) => (
                    <div className="rounded-md bg-white p-2" key={item.platformId}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-slate-800">{item.platformName}</span>
                        <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${strategyVerdictRoleClass(item.role)}`}>
                          {strategyVerdictRoleLabel(item.role)} · {item.score}
                        </span>
                      </div>
                      <div className="mt-1 leading-5 text-slate-500">{item.action}</div>
                    </div>
                  )) : (
                    <div className="rounded-md bg-white p-2 text-xs leading-5 text-slate-500">暂时没有必须禁投的平台。</div>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-3 grid gap-1 text-xs text-slate-500">
              {center.strategyVerdict.rationale.map((line) => (
                <div key={line}>依据：{line}</div>
              ))}
            </div>
          </div>
          {center.platformKnowledge.length ? (
            <div className="mt-3 rounded-md border border-slate-200 p-3" id="platform-knowledge">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="font-medium text-slate-950">平台知识库反哺</div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">把 A/B 归因、候选采纳和真实效果翻译成可执行经验，直接影响标题简介、前三章重写和平台排序。</p>
                </div>
                <div className="text-xs text-slate-500">Top {Math.min(3, center.platformKnowledge.length)}</div>
              </div>
              <div className="mt-3 grid gap-2 lg:grid-cols-3">
                {center.platformKnowledge.slice(0, 3).map((item) => (
                  <div className="rounded-md bg-slate-50 p-3 text-sm" key={item.platformId}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium text-slate-950">{item.platformName}</div>
                      <span className={`rounded-md px-2 py-1 text-xs font-medium ${platformKnowledgeStatusClass(item.status)}`}>
                        {platformKnowledgeStatusLabel(item.status)}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-500">
                      <div>置信 <span className="font-medium text-slate-950">{item.confidence}</span></div>
                      <div>证据 <span className="font-medium text-slate-950">{item.evidenceCount}</span></div>
                      <div>正/负 <span className="font-medium text-slate-950">{item.positiveCount}/{item.negativeCount}</span></div>
                    </div>
                    <p className="mt-2 leading-6 text-slate-600">{item.tacticSummary}</p>
                    <div className="mt-2 rounded-md border border-cyan-100 bg-cyan-50 p-2 text-xs">
                      <div className="font-medium text-cyan-950">{item.feedbackLoop.actionLabel}</div>
                      <div className="mt-1 leading-5 text-cyan-800">{item.feedbackLoop.headline}</div>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <a className="text-cyan-700 hover:text-cyan-900" href={item.feedbackLoop.nextStepHref}>
                          下一步：{item.feedbackLoop.nextStepLabel}
                        </a>
                        <button
                          className="rounded-md bg-cyan-950 px-2 py-1 text-[11px] font-medium text-white disabled:opacity-50"
                          disabled={Boolean(
                            runningKnowledgePlatformId
                            || applyingStrategyPlatformId
                            || runningStrategyStepId
                            || runningStrategyReviewTaskId,
                          )}
                          onClick={() => void startKnowledgeFeedbackLoop(item)}
                          type="button"
                        >
                          {runningKnowledgePlatformId === item.platformId ? "启动中" : item.feedbackLoop.actionLabel}
                        </button>
                      </div>
                    </div>
                    {item.applications.length ? (
                      <div className="mt-2 rounded-md bg-white p-2 text-xs">
                        <div className="font-medium text-slate-800">已反哺到</div>
                        <div className="mt-2 grid gap-1.5">
                          {item.applications.map((application) => (
                            <a
                              className="block rounded-md border border-slate-100 bg-slate-50 p-2 hover:bg-slate-100"
                              href={application.href}
                              key={`${item.platformId}-${application.area}`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-medium text-slate-800">{application.label}</span>
                                <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${platformKnowledgeApplicationClass(application.status)}`}>
                                  {platformKnowledgeApplicationLabel(application.status)}
                                </span>
                              </div>
                              <div className="mt-1 leading-5 text-slate-500">{application.impact}</div>
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {item.winningSignals.length ? (
                      <div className="mt-2 rounded-md bg-white p-2 text-xs leading-5 text-slate-600">
                        <div className="font-medium text-slate-800">可复用</div>
                        {item.winningSignals.slice(0, 2).map((signal) => (
                          <div className="mt-1" key={signal}>{signal}</div>
                        ))}
                      </div>
                    ) : null}
                    {item.avoidSignals.length ? (
                      <div className="mt-2 rounded-md bg-white p-2 text-xs leading-5 text-slate-600">
                        <div className="font-medium text-slate-800">避坑</div>
                        {item.avoidSignals.slice(0, 2).map((signal) => (
                          <div className="mt-1" key={signal}>{signal}</div>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-2 rounded-md bg-white px-2 py-1 text-xs leading-5 text-slate-500">
                      下一步：{item.nextAction}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {center.platformStrategy.length ? (
            <div className="mt-3 rounded-md border border-slate-200 p-3" id="platform-strategy-ranking">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="font-medium text-slate-950">平台策略排行榜</div>
                  <p className="mt-1 text-sm text-slate-600">按质检、投稿资产、真实效果、二轮改善和候选采纳综合排序。</p>
                </div>
                <div className="text-xs text-slate-500">Top {Math.min(3, center.platformStrategy.length)}</div>
              </div>
              <div className="mt-3 grid gap-2 lg:grid-cols-3">
                {center.platformStrategy.slice(0, 3).map((item) => (
                  <div
                    className="rounded-md bg-slate-50 p-3 text-sm"
                    key={item.platformId}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium text-slate-950">#{item.rank} {item.platformName}</div>
                      <span className={`rounded-md px-2 py-1 text-xs font-medium ${strategyRecommendationClass(item.recommendation)}`}>
                        {strategyRecommendationLabel(item.recommendation)}
                      </span>
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-slate-950">{item.score}</div>
                    <p className="mt-2 leading-6 text-slate-600">{item.verdict}</p>
                    <div className="mt-2 rounded-md bg-white p-2 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-md px-2 py-1 font-medium ${strategyReviewDecisionClass(item.reviewDecision.kind)}`}>
                          复盘：{item.reviewDecision.label}
                        </span>
                        <span className="text-slate-500">{item.reviewDecision.detail}</span>
                      </div>
                      <div className="mt-1 leading-5 text-slate-600">动作：{item.reviewDecision.action}</div>
                      {item.reviewDecision.tasks.length ? (
                        <div className="mt-2 grid gap-1.5">
                          {item.reviewDecision.tasks.slice(0, 3).map((task) => (
                            <div
                              className="rounded-md border border-slate-100 bg-slate-50 p-2"
                              key={task.id}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-medium text-slate-800">{task.label}</span>
                                <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${strategyReviewTaskPriorityClass(task.priority)}`}>
                                  {strategyReviewTaskPriorityLabel(task.priority)}
                                </span>
                              </div>
                              <div className="mt-1 rounded-md bg-white px-2 py-1 leading-5 text-slate-500">
                                排序理由：{task.rankReason}
                              </div>
                              <div className="mt-1 leading-5 text-slate-500">{task.detail}</div>
                              <button
                                className="mt-2 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                disabled={Boolean(runningStrategyReviewTaskId || applyingStrategyPlatformId || (task.execution === "generate_asset_variants" && isOptimizingAsset))}
                                onClick={() => void runStrategyReviewTask(item, task)}
                                type="button"
                              >
                                {runningStrategyReviewTaskId === `${item.platformId}:${task.id}`
                                  ? "执行中"
                                  : strategyReviewTaskActionLabel(task.execution)}
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {item.reviewDecision.nextPlan.steps.length ? (
                        <div className="mt-3 border-t border-slate-100 pt-2">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <div className="font-medium text-slate-800">{item.reviewDecision.nextPlan.headline}</div>
                              <div className="mt-1 text-slate-500">
                                进度 {item.reviewDecision.nextPlan.completedSteps}/{item.reviewDecision.nextPlan.totalSteps} · 当前：{item.reviewDecision.nextPlan.currentStepLabel}
                              </div>
                            </div>
                            <span className={`rounded-md px-2 py-1 text-[11px] font-medium ${
                              item.reviewDecision.nextPlan.status === "complete"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}>
                              {item.reviewDecision.nextPlan.status === "complete" ? "计划完成" : "执行中"}
                            </span>
                          </div>
                          <div className="mt-2 grid gap-1.5">
                            {item.reviewDecision.nextPlan.steps.map((step) => {
                              const planTask = buildReviewPlanStepTask(item, step);
                              const planTaskRunId = `${item.platformId}:${planTask.id}`;
                              const isStepBusy = runningStrategyReviewTaskId === planTaskRunId;
                              const isStepDisabled = Boolean(
                                step.status === "queued"
                                || runningStrategyReviewTaskId
                                || applyingStrategyPlatformId
                                || (planTask.execution === "generate_asset_variants" && isOptimizingAsset),
                              );

                              return (
                                <div
                                  className={`rounded-md border p-2 ${
                                    step.status === "next"
                                      ? "border-amber-200 bg-amber-50"
                                      : step.status === "done"
                                        ? "border-emerald-100 bg-emerald-50"
                                        : "border-slate-100 bg-slate-50"
                                  }`}
                                  key={step.id}
                                >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="font-medium text-slate-800">{step.label}</span>
                                  <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${reviewPlanStepStatusClass(step.status)}`}>
                                    {step.dayLabel} · {reviewPlanStepStatusLabel(step.status)}
                                  </span>
                                </div>
                                <div className="mt-1 leading-5 text-slate-500">{step.detail}</div>
                                <div className="mt-1 rounded-md bg-white px-2 py-1 leading-5 text-slate-500">
                                  验收：{step.expectedSignal}
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <button
                                    className={`rounded-md px-2 py-1 text-[11px] font-medium disabled:opacity-50 ${
                                      step.status === "next"
                                        ? "bg-slate-950 text-white hover:bg-slate-800"
                                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                    }`}
                                    disabled={isStepDisabled}
                                    onClick={() => {
                                      if (step.status === "done") {
                                        window.location.hash = step.href.replace(/^#/, "");
                                        setMessage(`已定位到「${step.label}」的复盘证据。`);
                                        return;
                                      }
                                      void runStrategyReviewTask(item, planTask);
                                    }}
                                    type="button"
                                  >
                                    {isStepBusy ? "执行中" : reviewPlanStepActionLabel(step, planTask)}
                                  </button>
                                  {step.status === "next" ? (
                                    <span className="text-[11px] text-amber-700">当前只推进这一步，完成后再解锁下一步。</span>
                                  ) : null}
                                </div>
                              </div>
                              );
                            })}
                          </div>
                          <div className="mt-2 rounded-md bg-white px-2 py-1 leading-5 text-slate-500">
                            复盘点：{item.reviewDecision.nextPlan.checkpoint}
                          </div>
                        </div>
                      ) : null}
                      <div className="mt-3 border-t border-slate-100 pt-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="font-medium text-slate-800">复盘证据账本</div>
                            <div className="mt-1 text-slate-500">
                              覆盖 {item.reviewDecision.evidenceLedger.completedSignals}/{item.reviewDecision.evidenceLedger.totalSignals}
                              {" "}· 证据分 {item.reviewDecision.evidenceLedger.score}
                              {item.reviewDecision.evidenceLedger.latestEvidenceAt
                                ? ` · 最新 ${formatTime(item.reviewDecision.evidenceLedger.latestEvidenceAt)}`
                                : ""}
                            </div>
                          </div>
                          <span className={`rounded-md px-2 py-1 text-[11px] font-medium ${evidenceLedgerStatusClass(item.reviewDecision.evidenceLedger.status)}`}>
                            {evidenceLedgerStatusLabel(item.reviewDecision.evidenceLedger.status)}
                          </span>
                        </div>
                        <div className="mt-2 rounded-md bg-white px-2 py-1 leading-5 text-slate-500">
                          {item.reviewDecision.evidenceLedger.headline}
                        </div>
                        {item.reviewDecision.evidenceLedger.missingSignals.length ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {item.reviewDecision.evidenceLedger.missingSignals.slice(0, 3).map((signal) => (
                              <span className="rounded-md bg-rose-50 px-2 py-1 text-[11px] text-rose-700" key={signal}>
                                {signal}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {item.reviewDecision.evidenceLedger.entries.length ? (
                          <div className="mt-2 grid gap-1.5">
                            {item.reviewDecision.evidenceLedger.entries.slice(0, 3).map((entry) => (
                              <a
                                className="block rounded-md bg-slate-50 p-2 hover:bg-slate-100"
                                href={entry.href}
                                key={entry.id}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="font-medium text-slate-800">{entry.label}</span>
                                  <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${evidenceLedgerStrengthClass(entry.strength)}`}>
                                    {formatTime(entry.createdAt)} · {evidenceLedgerStrengthLabel(entry.strength)}
                                  </span>
                                </div>
                                <div className="mt-1 leading-5 text-slate-500">系统记录：{entry.result}</div>
                                <div className="mt-1 rounded-md bg-white px-2 py-1 leading-5 text-slate-500">
                                  影响：{entry.scoreImpact}｜下一步依据：{entry.nextReason}
                                </div>
                              </a>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-2 rounded-md bg-slate-50 p-2 text-[11px] leading-5 text-slate-500">
                            还没有能落到账本里的执行结果。
                          </div>
                        )}
                      </div>
                      {item.reviewDecision.history.length ? (
                        <div className="mt-3 border-t border-slate-100 pt-2">
                          <div className="text-[11px] font-medium text-slate-500">最近复盘历史</div>
                          <div className="mt-1 grid gap-1.5">
                            {item.reviewDecision.history.slice(0, 3).map((history) => (
                              <a
                                className="block rounded-md bg-slate-50 p-2 hover:bg-slate-100"
                                href={history.href}
                                key={history.id}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="font-medium text-slate-800">{history.label}</span>
                                  <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${strategyReviewHistoryClass(history.type)}`}>
                                    {formatTime(history.createdAt)}
                                  </span>
                                </div>
                                <div className="mt-1 line-clamp-2 leading-5 text-slate-500">{history.detail}</div>
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 rounded-md bg-slate-50 p-2 text-[11px] leading-5 text-slate-500">
                          暂无复盘历史。先执行一个任务，系统才有证据可追。
                        </div>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">下一步：{item.nextAction}</div>
                    <div className="mt-2 grid gap-1 text-xs text-slate-500">
                      <div>依据：{item.reasons.slice(0, 3).join("；")}</div>
                      {item.risks.length ? <div>风险：{item.risks.slice(0, 2).join("；")}</div> : null}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-white"
                        onClick={() => {
                          setSelectedPlatformId(item.platformId);
                          setSelectedVersionId(null);
                          setVersionDetail(null);
                          setVersionActionFilter("all");
                        }}
                        type="button"
                      >
                        查看平台
                      </button>
                      <button
                        className="rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                        disabled={Boolean(applyingStrategyPlatformId)}
                        onClick={() => void applyPlatformStrategy(item)}
                        type="button"
                      >
                        {applyingStrategyPlatformId === item.platformId ? "应用中" : "设为主战场"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {strategySwitchPlan ? (
                <div className="mt-3 rounded-md border border-cyan-100 bg-cyan-50 p-3">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="font-medium text-cyan-950">{strategySwitchPlan.platformName} 执行链</div>
                      <p className="mt-1 text-sm leading-6 text-cyan-800">{strategySwitchPlan.headline}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="w-fit rounded-md bg-white px-2 py-1 text-xs font-medium text-cyan-700">
                        策略分 {strategySwitchPlan.score}
                      </div>
                      <div className={`w-fit rounded-md px-2 py-1 text-xs font-medium ${evidenceLedgerStatusClass(strategySwitchPlan.evidenceStatus)}`}>
                        证据 {strategySwitchPlan.evidenceScore}
                      </div>
                      {strategyNextStep ? (
                        <button
                          className="rounded-md bg-cyan-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                          disabled={Boolean(runningStrategyStepId) || !strategyNextStep.executable}
                          onClick={() => void executeStrategyNextStep()}
                          type="button"
                        >
                          {runningStrategyStepId ? "执行中" : `执行下一步：${strategyNextStep.label}`}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-3 rounded-md bg-white p-3 text-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="font-medium text-slate-950">
                          执行进度 {strategySwitchPlan.progress.completedSteps}/{strategySwitchPlan.progress.totalSteps}
                        </div>
                        <p className="mt-1 leading-6 text-slate-600">{strategySwitchPlan.progress.verdict}</p>
                      </div>
                      <div className="min-w-44">
                        <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                          <span>{strategySwitchPlan.progress.status === "complete" ? "已闭环" : `下一步：${strategySwitchPlan.progress.nextStepLabel}`}</span>
                          <span>{strategySwitchPlan.progress.progressPercent}%</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={strategySwitchPlan.progress.status === "complete" ? "h-full rounded-full bg-emerald-500" : "h-full rounded-full bg-cyan-700"}
                            style={{ width: `${strategySwitchPlan.progress.progressPercent}%` }}
                          />
                        </div>
                        {strategySwitchPlan.progress.status === "complete" ? (
                          <a
                            className="mt-3 inline-flex w-fit rounded-md bg-emerald-700 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-800"
                            href={strategySwitchPlan.progress.actionHref}
                          >
                            {strategySwitchPlan.progress.actionLabel}
                          </a>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-3 rounded-md bg-cyan-50 px-2 py-1 text-xs leading-5 text-cyan-800">
                      决策依据：{strategySwitchPlan.decisionBasis}
                    </div>
                    {strategySwitchPlan.evidenceGaps.length ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {strategySwitchPlan.evidenceGaps.slice(0, 3).map((gap) => (
                          <span className="rounded-md bg-white px-2 py-1 text-[11px] text-cyan-800" key={gap}>
                            {gap}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {strategySwitchPlan.progress.status !== "complete" ? (
                      <div className="mt-3 rounded-md bg-amber-50 p-2 text-xs leading-5 text-amber-800">
                        当前卡点：{strategySwitchPlan.progress.bottleneck}
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-3 grid gap-2 lg:grid-cols-4">
                    {strategySwitchPlan.steps.map((step) => (
                      <a
                        className="rounded-md bg-white p-3 text-sm hover:bg-cyan-100"
                        href={step.href}
                        key={step.id}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-medium text-slate-950">{step.label}</div>
                          <span className={`rounded-md px-2 py-1 text-xs font-medium ${switchStepStatusClass(step.status)}`}>
                            {switchStepStatusLabel(step.status)}
                          </span>
                        </div>
                        <p className="mt-2 leading-6 text-slate-600">{step.detail}</p>
                      </a>
                    ))}
                  </div>
                  {knowledgeFeedbackReceipt ? (
                    <div className={`mt-3 rounded-md border p-3 text-sm ${
                      knowledgeFeedbackReceipt.severity === "success"
                        ? "border-cyan-100 bg-cyan-50"
                        : "border-amber-100 bg-amber-50"
                    }`}>
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className={knowledgeFeedbackReceipt.severity === "success" ? "font-medium text-cyan-950" : "font-medium text-amber-900"}>
                            {knowledgeFeedbackReceipt.title}
                          </div>
                          <p className={knowledgeFeedbackReceipt.severity === "success" ? "mt-1 leading-6 text-cyan-800" : "mt-1 leading-6 text-amber-800"}>
                            {knowledgeFeedbackReceipt.message}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                            <span className="rounded-md bg-white px-2 py-1 font-medium text-slate-700">
                              来源：{knowledgeFeedbackReceipt.actionLabel}
                            </span>
                            <span className="rounded-md bg-white px-2 py-1 font-medium text-slate-700">
                              已推进：{knowledgeFeedbackReceipt.completedStepLabel}
                            </span>
                          </div>
                          <div className="mt-2 rounded-md bg-white px-2 py-1 text-xs leading-5 text-slate-600">
                            停在这里：{knowledgeFeedbackReceipt.stopReason}
                          </div>
                          <p className="mt-2 leading-6 text-slate-700">下一刀：{knowledgeFeedbackReceipt.nextAction}</p>
                        </div>
                        <a
                          className="w-fit rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          href={knowledgeFeedbackReceipt.href}
                        >
                          去处理
                        </a>
                      </div>
                    </div>
                  ) : null}
                  {knowledgeFeedbackHistory.length ? (
                    <div className="mt-3 rounded-md border border-slate-200 bg-white p-3 text-sm">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="font-medium text-slate-950">反哺链路历史</div>
                          <p className="mt-1 text-xs leading-5 text-slate-500">保留最近 {Math.min(10, knowledgeFeedbackHistory.length)} 次自动反哺，方便复盘哪次经验被执行过。</p>
                        </div>
                        <button
                          className="w-fit rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                          onClick={() => {
                            void clearKnowledgeFeedbackHistory()
                              .then((history) => {
                                saveKnowledgeFeedbackHistory(projectId, history);
                                setKnowledgeFeedbackHistory(history);
                                setKnowledgeFeedbackReceipt(history[0] ?? null);
                              })
                              .catch(() => {
                                saveKnowledgeFeedbackHistory(projectId, []);
                                setKnowledgeFeedbackHistory([]);
                                setKnowledgeFeedbackReceipt(null);
                              });
                          }}
                          type="button"
                        >
                          清空
                        </button>
                      </div>
                      <div className="mt-3 grid gap-2 lg:grid-cols-2">
                        {knowledgeFeedbackHistory.slice(0, 4).map((receipt) => (
                          <a
                            className="block rounded-md bg-slate-50 p-2 hover:bg-slate-100"
                            href={receipt.href}
                            key={receipt.id}
                            onClick={() => setKnowledgeFeedbackReceipt(receipt)}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-medium text-slate-800">{receipt.platformName}｜{receipt.actionLabel}</span>
                              <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
                                receipt.severity === "success" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                              }`}>
                                {formatTime(receipt.createdAt)}
                              </span>
                            </div>
                            <div className="mt-1 leading-5 text-slate-500">已推进：{receipt.completedStepLabel}</div>
                            <div className="mt-1 line-clamp-2 leading-5 text-slate-500">停点：{receipt.stopReason}</div>
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {strategyExecutionReceipt ? (
                    <div className={`mt-3 rounded-md border p-3 text-sm ${
                      strategyExecutionReceipt.severity === "success"
                        ? "border-emerald-100 bg-emerald-50"
                        : "border-amber-100 bg-amber-50"
                    }`}>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className={strategyExecutionReceipt.severity === "success" ? "font-medium text-emerald-900" : "font-medium text-amber-900"}>
                            {strategyExecutionReceipt.title}
                          </div>
                          <p className={strategyExecutionReceipt.severity === "success" ? "mt-1 leading-6 text-emerald-700" : "mt-1 leading-6 text-amber-700"}>
                            {strategyExecutionReceipt.message}
                          </p>
                          <p className="mt-1 leading-6 text-slate-700">下一刀：{strategyExecutionReceipt.nextAction}</p>
                        </div>
                        <a
                          className="w-fit rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          href={strategyExecutionReceipt.href}
                        >
                          去处理
                        </a>
                      </div>
                    </div>
                  ) : null}
                  {strategyReviewTaskReceipt ? (
                    <div className={`mt-3 rounded-md border p-3 text-sm ${
                      strategyReviewTaskReceipt.severity === "success"
                        ? "border-emerald-100 bg-emerald-50"
                        : "border-amber-100 bg-amber-50"
                    }`}>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className={strategyReviewTaskReceipt.severity === "success" ? "font-medium text-emerald-900" : "font-medium text-amber-900"}>
                            {strategyReviewTaskReceipt.title}
                          </div>
                          <p className={strategyReviewTaskReceipt.severity === "success" ? "mt-1 leading-6 text-emerald-700" : "mt-1 leading-6 text-amber-700"}>
                            {strategyReviewTaskReceipt.message}
                          </p>
                          <p className="mt-1 leading-6 text-slate-700">下一刀：{strategyReviewTaskReceipt.nextAction}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                            <span className="rounded-md bg-white px-2 py-1 font-medium text-slate-700">
                              策略分 {strategyReviewTaskReceipt.beforeScore} → {strategyReviewTaskReceipt.afterScore}
                            </span>
                            <span className={`rounded-md px-2 py-1 font-medium ${
                              strategyReviewTaskReceipt.scoreDelta > 0
                                ? "bg-emerald-100 text-emerald-800"
                                : strategyReviewTaskReceipt.scoreDelta < 0
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-slate-100 text-slate-700"
                            }`}>
                              {strategyReviewTaskReceipt.scoreDelta === 0 ? "持平" : scoreDeltaLabel(strategyReviewTaskReceipt.scoreDelta)}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                            {strategyReviewTaskReceipt.scoreChanges
                              .filter((change) => change.delta !== 0)
                              .slice(0, 3)
                              .map((change) => (
                                <span
                                  className={`rounded-md px-2 py-1 ${
                                    change.delta > 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                                  }`}
                                  key={change.key}
                                >
                                  {change.label} {change.before}→{change.after}（{scoreDeltaLabel(change.delta)}）
                                </span>
                              ))}
                            {strategyReviewTaskReceipt.scoreChanges.every((change) => change.delta === 0) ? (
                              <span className="rounded-md bg-white px-2 py-1 text-slate-600">子指标暂未变化，继续补证据。</span>
                            ) : null}
                          </div>
                          {strategyReviewTaskReceipt.draggers.length ? (
                            <p className="mt-2 text-xs leading-5 text-slate-600">
                              当前拖后腿：{strategyReviewTaskReceipt.draggers.join("；")}
                            </p>
                          ) : null}
                        </div>
                        <a
                          className="w-fit rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          href={strategyReviewTaskReceipt.href}
                        >
                          去查看
                        </a>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}

      {assetAdoptionReceipt ? (
        <div className={`mt-3 rounded-md border p-3 text-sm ${assetEditorReviewToneClass(assetAdoptionReceipt.tone)}`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className={`font-medium ${assetEditorReviewTextClass(assetAdoptionReceipt.tone)}`}>
                {assetAdoptionReceipt.title}
              </div>
              <p className="mt-1 leading-6 text-slate-700">{assetAdoptionReceipt.message}</p>
              <div className="mt-2 grid gap-2 text-xs sm:grid-cols-3">
                <div className="rounded-md bg-white px-2 py-1 text-slate-600">
                  复检分 <span className="font-medium text-slate-950">{assetAdoptionReceipt.score}</span>
                </div>
                <div className="rounded-md bg-white px-2 py-1 text-slate-600">
                  已解决 <span className="font-medium text-slate-950">{assetAdoptionReceipt.resolvedLabels}</span>
                </div>
                <div className="rounded-md bg-white px-2 py-1 text-slate-600">
                  剩余 <span className="font-medium text-slate-950">{assetAdoptionReceipt.remainingLabels}</span>
                </div>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-600">下一步：{assetAdoptionReceipt.nextAction}</p>
            </div>
            <span className={`w-fit rounded-md px-2 py-1 text-xs font-medium ${assetAuditStatusClass(assetAdoptionReceipt.status)}`}>
              {assetAuditStatusLabel(assetAdoptionReceipt.status)}
            </span>
          </div>
        </div>
      ) : null}

      {selectedPackage ? (
        <div className="mt-4 grid gap-4">
          <div className="rounded-md border border-slate-200 bg-white p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-medium text-slate-950">投前最终裁决</div>
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${finalGateStatusClass(selectedPackage.finalGate.status)}`}>
                    {selectedPackage.finalGate.label} · {selectedPackage.finalGate.score}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{selectedPackage.finalGate.headline}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">{selectedPackage.finalGate.verdict}</p>
              </div>
              <a
                className="w-fit rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white"
                href={
                  selectedPackage.finalGate.status === "ready_to_submit"
                    ? "#package-version-history"
                    : selectedPackage.finalGate.items.find((item) => item.status !== "pass")?.href ?? "#platform-export"
                }
              >
                {selectedPackage.finalGate.nextAction}
              </a>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {selectedPackage.finalGate.items.map((item) => (
                <div className="rounded-md bg-slate-50 p-3 text-sm" key={item.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium text-slate-950">{item.label}</div>
                    <span className={`rounded-md px-2 py-1 text-[11px] font-medium ${finalGateItemStatusClass(item.status)}`}>
                      {finalGateItemStatusLabel(item.status)}
                    </span>
                  </div>
                  <p className="mt-2 leading-5 text-slate-600">{item.detail}</p>
                  {item.status !== "pass" ? (
                    <a className="mt-2 inline-flex text-xs font-medium text-slate-950 underline" href={item.href}>
                      {item.actionLabel}
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-md border border-slate-200 p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="font-medium text-slate-950">发布前质检</div>
                <p className="mt-1 text-sm text-slate-600">
                  {selectedPackage.canExport ? "允许导出" : "暂不允许导出"} · 质检分 {selectedPackage.preflight.score}
                </p>
              </div>
              <div className={`w-fit rounded-md px-2 py-1 text-xs font-medium ${
                selectedPackage.canExport ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
              }`}>
                {selectedPackage.canExport ? "已通过" : "需处理"}
              </div>
            </div>
            <div className={`mt-3 rounded-md border p-3 text-sm ${
              selectedPackage.repairPath.status === "ready"
                ? "border-emerald-100 bg-emerald-50"
                : "border-amber-100 bg-amber-50"
            }`}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className={selectedPackage.repairPath.status === "ready" ? "font-medium text-emerald-900" : "font-medium text-amber-900"}>
                    修复到可导出
                  </div>
                  <div className={selectedPackage.repairPath.status === "ready" ? "mt-1 text-emerald-700" : "mt-1 text-amber-700"}>
                    {selectedPackage.repairPath.headline}
                  </div>
                </div>
                {nextRepairAction ? (
                  canRunAction(nextRepairAction) ? (
                    <button
                      className="w-fit rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                      disabled={Boolean(runningActionId)}
                      onClick={() => void runRepairAction(nextRepairAction)}
                      type="button"
                    >
                      {runningActionId === nextRepairAction.id ? "处理中" : "处理首要项"}
                    </button>
                  ) : (
                    <Link
                      className="w-fit rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      href={actionHref(projectId, nextRepairAction)}
                    >
                      打开首要位置
                    </Link>
                  )
                ) : null}
              </div>
              {repairExitPrompt ? (
                <div className={`mt-3 rounded-md border p-3 ${
                  repairExitPrompt.status === "ready_to_export"
                    ? "border-emerald-200 bg-emerald-50"
                    : repairExitPrompt.status === "needs_effect"
                      ? "border-cyan-200 bg-cyan-50"
                    : repairExitPrompt.status === "retry_failed"
                      ? "border-rose-200 bg-rose-50"
                      : repairExitPrompt.status === "in_progress"
                        ? "border-amber-200 bg-amber-50"
                        : "border-slate-200 bg-white"
                }`}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="font-medium text-slate-950">{repairExitPrompt.label}</div>
                      <div className="mt-1 leading-5 text-slate-600">{repairExitPrompt.detail}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {repairExitPrompt.primaryAction === "recheck" ? (
                        <button
                          className="rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                          disabled={isLoading}
                          onClick={() => void loadCenter({ keepMessage: true })}
                          type="button"
                        >
                          {isLoading ? "刷新中" : "刷新质检"}
                        </button>
                      ) : null}
                      {repairExitPrompt.primaryAction === "export" ? (
                        <>
                          <button
                            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            disabled={!selectedPackage.canExport}
                            onClick={copyMarkdown}
                            type="button"
                          >
                            复制发布包
                          </button>
                          <button
                            className="rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                            disabled={!selectedPackage.canExport || isLoading}
                            onClick={downloadMarkdown}
                            type="button"
                          >
                            下载发布包
                          </button>
                          <button
                            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            disabled={!exportablePackages.length || isLoading}
                            onClick={downloadArchive}
                            type="button"
                          >
                            全平台包
                          </button>
                        </>
                      ) : null}
                      {repairExitPrompt.primaryAction === "record_effect" ? (
                        <a
                          className="rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white"
                          href="#publish-effect-panel"
                        >
                          记录发布效果
                        </a>
                      ) : null}
                      {repairExitPrompt.primaryAction === "retry" && repairNextAction?.action && canRunAction(repairNextAction.action) ? (
                        <button
                          className="rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                          disabled={Boolean(runningActionId)}
                          onClick={() => repairNextAction.action && void runRepairAction(repairNextAction.action)}
                          type="button"
                        >
                          {runningActionId === repairNextAction.action.id ? "重试中" : "重试失败项"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="mt-3 grid gap-2 sm:grid-cols-4">
                <div className="rounded-md bg-white/80 p-2">
                  <div className="text-xs text-slate-500">阻塞项</div>
                  <div className="mt-1 font-medium text-slate-950">{selectedPackage.repairPath.blockedCount}</div>
                </div>
                <div className="rounded-md bg-white/80 p-2">
                  <div className="text-xs text-slate-500">可一键处理</div>
                  <div className="mt-1 font-medium text-slate-950">{selectedPackage.repairPath.executableActions}</div>
                </div>
                <div className="rounded-md bg-white/80 p-2">
                  <div className="text-xs text-slate-500">需要手动处理</div>
                  <div className="mt-1 font-medium text-slate-950">{selectedPackage.repairPath.manualActions}</div>
                </div>
                <div className="rounded-md bg-white/80 p-2">
                  <div className="text-xs text-slate-500">影响章节</div>
                  <div className="mt-1 font-medium text-slate-950">{selectedPackage.repairPath.affectedChapters}</div>
                </div>
              </div>
              {selectedPackage.repairPath.steps.length ? (
                <div className="mt-3 rounded-md bg-white/80 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-medium text-slate-900">修复流水线</div>
                    <div className="text-xs text-slate-500">{selectedPackage.repairPath.totalActions} 步</div>
                  </div>
                  <div className="mt-2 grid gap-2 lg:grid-cols-3">
                    {selectedPackage.repairPath.steps.slice(0, 6).map((step) => {
                      const stepResult = publishRepairResultForAction(runResults, step);
                      const borderClass = stepResult?.status === "succeeded"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                        : stepResult?.status === "failed"
                          ? "border-rose-200 bg-rose-50 text-rose-950"
                          : stepResult?.status === "pending"
                            ? "border-amber-200 bg-amber-50 text-amber-950"
                            : step.status === "active"
                              ? "border-slate-950 bg-white text-slate-950"
                              : "border-slate-200 bg-slate-50 text-slate-600";
                      return (
                        <div
                          className={`rounded-md border p-2 ${borderClass}`}
                          key={step.id}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium">第 {step.order} 步</span>
                            <span className={`rounded-md px-2 py-0.5 text-[11px] ${
                              stepResult ? resultStatusClass(stepResult.status) : step.executable ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                            }`}>
                              {stepResult ? resultStatusLabel(stepResult.status) : step.executable ? "可一键" : "需打开"}
                            </span>
                          </div>
                          <div className="mt-1 font-medium">{step.label}</div>
                          {step.chapterTitle ? <div className="mt-1 line-clamp-1 text-xs text-slate-500">{step.chapterTitle}</div> : null}
                          {stepResult ? (
                            <div className="mt-1 line-clamp-2 text-xs text-slate-600">
                              {stepResult.error ?? stepResult.message ?? "已记录本次处理结果。"}
                            </div>
                          ) : null}
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {typeof stepResult?.score === "number" ? <span className="text-xs text-slate-500">评分 {stepResult.score}</span> : null}
                            {typeof stepResult?.issueCount === "number" ? <span className="text-xs text-slate-500">问题 {stepResult.issueCount}</span> : null}
                            {canRunAction(step) ? (
                              <button
                                className={`rounded-md px-2 py-1 text-xs font-medium disabled:opacity-50 ${
                                  step.status === "active"
                                    ? "bg-slate-950 text-white"
                                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                }`}
                                disabled={Boolean(runningActionId)}
                                onClick={() => void runRepairAction(step)}
                                type="button"
                              >
                                {runningActionId === step.id ? "处理中" : step.status === "active" ? "立即处理" : "处理此步"}
                              </button>
                            ) : (
                              <Link
                                className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${
                                  step.status === "active"
                                    ? "bg-slate-950 text-white"
                                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                }`}
                                href={actionHref(projectId, step)}
                              >
                                {step.status === "active" ? "打开处理" : "打开位置"}
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {selectedPackage.repairPath.groups.length ? (
                <div className="mt-3 grid gap-2 lg:grid-cols-2">
                  {selectedPackage.repairPath.groups.map((group) => (
                    <div className="rounded-md bg-white/80 p-2" key={group.kind}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-950">{group.label}</span>
                        <span className="text-xs text-slate-500">{group.count} 项</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        可一键 {group.executableCount} · 手动 {group.manualCount}
                      </div>
                      {group.chapterTitles.length ? (
                        <div className="mt-1 line-clamp-2 text-xs text-slate-500">
                          {group.chapterTitles.slice(0, 3).join("、")}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="mt-3 grid gap-2 text-sm text-slate-600 lg:grid-cols-2">
              <div className="rounded-md bg-slate-50 p-3">
                <div className="font-medium text-slate-900">阻塞项</div>
                <div className="mt-2 grid gap-1">
                  {(selectedPackage.preflight.blocked.length ? selectedPackage.preflight.blocked : ["无"]).map((item) => (
                    <div key={item}>{item}</div>
                  ))}
                </div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="font-medium text-slate-900">提醒</div>
                <div className="mt-2 grid gap-1">
                  {(selectedPackage.preflight.warnings.length ? selectedPackage.preflight.warnings.slice(0, 4) : ["暂无明显提醒。"]).map((item) => (
                    <div key={item}>{item}</div>
                  ))}
                </div>
              </div>
            </div>
            {selectedPackage.repairActions.length ? (
              <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="font-medium text-slate-900">下一步处理</div>
                  {executableActions.length ? (
                    <button
                      className="w-fit rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                      disabled={Boolean(runningActionId)}
                      onClick={() => void runBatchRepairActions()}
                      type="button"
                    >
                      {runningActionId === "batch" ? "批量处理中" : `批量处理前 ${executableActions.length} 项`}
                    </button>
                  ) : null}
                </div>
                <div className="mt-2 grid gap-2 lg:grid-cols-2">
                  {selectedPackage.repairActions.slice(0, 6).map((action) => (
                    <div
                      className="rounded-md border border-slate-200 bg-white p-3 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      key={action.id}
                    >
                      <div className="font-medium text-slate-950">{action.label}</div>
                      {action.chapterTitle ? <div className="mt-1 text-xs text-slate-500">{action.chapterTitle}</div> : null}
                      <div className="mt-1 leading-5">{action.detail}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {canRunAction(action) ? (
                          <button
                            className="rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                            disabled={Boolean(runningActionId)}
                            onClick={() => void runRepairAction(action)}
                            type="button"
                          >
                            {runningActionId === action.id ? "处理中" : "立即处理"}
                          </button>
                        ) : null}
                        <Link
                          className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          href={actionHref(projectId, action)}
                        >
                          打开位置
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
                {runResults.length ? (
                  <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="font-medium text-slate-950">本次处理结果</div>
                        <div className="mt-1 text-xs text-slate-500">
                          成功 {runResults.filter((result) => result.status === "succeeded").length} 项 ·
                          失败 {runResults.filter((result) => result.status === "failed").length} 项 ·
                          处理中 {runResults.filter((result) => result.status === "pending").length} 项
                        </div>
                      </div>
                      {runResults.some((result) => result.status === "failed" && canRunAction(actionFromRunResult(result))) ? (
                        <button
                          className="w-fit rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          disabled={Boolean(runningActionId)}
                          onClick={() => {
                            const failedResult = runResults.find((result) => result.status === "failed" && canRunAction(actionFromRunResult(result)));
                            if (failedResult) void runRepairAction(actionFromRunResult(failedResult));
                          }}
                          type="button"
                        >
                          重试首个失败项
                        </button>
                      ) : null}
                    </div>
                    {repairNextAction ? (
                      <RepairNextActionCallout
                        nextAction={repairNextAction}
                        onRunAction={(action) => void runRepairAction(action)}
                        runningActionId={runningActionId}
                      />
                    ) : null}
                    <div className="mt-3 grid gap-2">
                      {runResults.map((result) => {
                        const retryAction = actionFromRunResult(result);
                        return (
                          <div className="rounded-md border border-slate-200 p-3" key={result.id}>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <div className="font-medium text-slate-950">{labelForAction(result.action)}</div>
                                <div className="mt-1 text-xs text-slate-500">{result.chapterTitle}</div>
                              </div>
                              <span className={`w-fit rounded-md px-2 py-1 text-xs font-medium ${resultStatusClass(result.status)}`}>
                                {resultStatusLabel(result.status)}
                              </span>
                            </div>
                            <div className="mt-2 text-slate-600">
                              {result.error ?? result.message ?? (result.status === "pending" ? "等待模型返回结果。" : "已完成处理。")}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                              {typeof result.score === "number" ? <span>评分 {result.score}</span> : null}
                              {typeof result.issueCount === "number" ? <span>问题 {result.issueCount} 个</span> : null}
                              {typeof result.wordCount === "number" ? <span>{result.wordCount} 字</span> : null}
                            </div>
                            {result.status === "failed" && canRunAction(retryAction) ? (
                              <button
                                className="mt-3 rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                                disabled={Boolean(runningActionId)}
                                onClick={() => void runRepairAction(retryAction)}
                                type="button"
                              >
                                {runningActionId === retryAction.id ? "重试中" : "重试此项"}
                              </button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            {runResults.length && !selectedPackage.repairActions.length ? (
              <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm">
                <div className="font-medium text-slate-900">本次处理结果</div>
                <div className="mt-1 text-xs text-slate-500">
                  成功 {runResults.filter((result) => result.status === "succeeded").length} 项 ·
                  失败 {runResults.filter((result) => result.status === "failed").length} 项 ·
                  处理中 {runResults.filter((result) => result.status === "pending").length} 项
                </div>
                {repairNextAction ? (
                  <RepairNextActionCallout
                    nextAction={repairNextAction}
                    onRunAction={(action) => void runRepairAction(action)}
                    runningActionId={runningActionId}
                  />
                ) : null}
                <div className="mt-3 grid gap-2">
                  {runResults.map((result) => (
                    <div className="rounded-md border border-slate-200 bg-white p-3" key={result.id}>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="font-medium text-slate-950">{labelForAction(result.action)}</div>
                          <div className="mt-1 text-xs text-slate-500">{result.chapterTitle}</div>
                        </div>
                        <span className={`w-fit rounded-md px-2 py-1 text-xs font-medium ${resultStatusClass(result.status)}`}>
                          {resultStatusLabel(result.status)}
                        </span>
                      </div>
                      <div className="mt-2 text-slate-600">
                        {result.error ?? result.message ?? (result.status === "pending" ? "等待模型返回结果。" : "已完成处理。")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {selectedPackage.repairHistory.length ? (
              <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm">
                <div className="font-medium text-slate-900">最近修复记录</div>
                <div className="mt-2 grid gap-2">
                  {selectedPackage.repairHistory.map((item) => (
                    <div className="rounded-md border border-slate-200 bg-white p-3" key={item.id}>
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="font-medium text-slate-950">{item.label}</div>
                          <div className="mt-1 text-xs text-slate-500">{item.chapterTitle}</div>
                        </div>
                        <div className="text-xs text-slate-500">{formatTime(item.createdAt)} · {item.status}</div>
                      </div>
                      <div className="mt-2 text-slate-600">{item.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {selectedPackage.publishVersions.length ? (
              <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm" id="package-version-history">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="font-medium text-slate-900">发布包版本</div>
                    <div className="mt-1 text-xs text-slate-500">最近 {selectedPackage.publishVersions.length} 次复制、下载或归档保存。</div>
                  </div>
                  <div className="text-xs text-slate-500">当前平台：{selectedPackage.platformName}</div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {versionActionFilters.map((filter) => (
                    <button
                      className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                        versionActionFilter === filter.id
                          ? "border-slate-950 bg-slate-950 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                      key={filter.id}
                      onClick={() => {
                        setVersionActionFilter(filter.id);
                        setSelectedVersionId(null);
                        setVersionDetail(null);
                      }}
                      type="button"
                    >
                      {filter.label} {versionActionCounts[filter.id]}
                    </button>
                  ))}
                </div>
                <div className="mt-2 grid gap-2">
                  {filteredPublishVersions.map((version) => (
                    <div className="rounded-md border border-slate-200 bg-white p-3" key={version.id}>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="font-medium text-slate-950">{version.title}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {versionActionLabel(version.action)} · {formatTime(version.createdAt)}
                          </div>
                        </div>
                        <div className={`w-fit rounded-md px-2 py-1 text-xs font-medium ${
                          version.canExport ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                        }`}>
                          质检 {version.preflightScore}
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span>{version.chapterCount} 章</span>
                        <span>{version.wordCount} 字</span>
                        <span>{version.platformName}</span>
                      </div>
                      <button
                        className="mt-3 rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        disabled={isLoadingVersion && selectedVersionId === version.id}
                        onClick={() => void loadVersionDetail(version.id)}
                        type="button"
                      >
                        {isLoadingVersion && selectedVersionId === version.id ? "读取中" : "查看详情"}
                      </button>
                    </div>
                  ))}
                  {!filteredPublishVersions.length ? (
                    <div className="rounded-md border border-slate-200 bg-white p-3 text-slate-600">
                      当前筛选下没有历史版本。
                    </div>
                  ) : null}
                </div>
                {versionDetail ? (
                  <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="font-medium text-slate-950">版本详情</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {versionDetail.version.platformName} · {versionActionLabel(versionDetail.version.action)} · {formatTime(versionDetail.version.createdAt)}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="w-fit rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          onClick={() => {
                            void navigator.clipboard.writeText(versionDetail.version.markdown);
                            setMessage("已复制该历史版本 Markdown。");
                          }}
                          type="button"
                        >
                          复制此版本
                        </button>
                        <button
                          className="w-fit rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                          disabled={isRestoringVersion}
                          onClick={() => void restoreVersion()}
                          type="button"
                        >
                          {isRestoringVersion ? "恢复中" : "恢复标题卖点"}
                        </button>
                      </div>
                    </div>
                    {versionDetail.archiveGroup ? (
                      <div className="mt-3 rounded-md bg-slate-50 p-3">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="font-medium text-slate-900">同批归档平台</div>
                            <div className="mt-1 text-xs text-slate-500">
                              {versionDetail.archiveGroup.platformCount} 个平台 · {versionDetail.archiveGroup.totalWordCount} 字
                            </div>
                          </div>
                          <div className="text-xs text-slate-500">{formatTime(versionDetail.archiveGroup.createdAt)}</div>
                        </div>
                        <div className="mt-2 grid gap-2 lg:grid-cols-2">
                          {versionDetail.archiveGroup.platforms.map((platform) => (
                            <div className="rounded-md border border-slate-200 bg-white p-2" key={platform.id}>
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium text-slate-950">{platform.platformName}</span>
                                <span className={`rounded-md px-2 py-1 text-xs font-medium ${
                                  platform.canExport ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                                }`}>
                                  质检 {platform.preflightScore}
                                </span>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                                <span>{platform.chapterCount} 章</span>
                                <span>{platform.wordCount} 字</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <div className="mt-3 rounded-md bg-slate-50 p-3">
                      <div className="font-medium text-slate-900">与当前包对比</div>
                      <div className="mt-1 text-xs text-slate-500">变化 {versionDetail.comparison.changedCount} 项</div>
                      <div className="mt-2 grid gap-2 lg:grid-cols-2">
                        {versionDetail.comparison.items.map((item) => (
                          <div className="rounded-md border border-slate-200 bg-white p-2" key={item.label}>
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-slate-950">{item.label}</span>
                              <span className={`rounded-md px-2 py-1 text-xs font-medium ${
                                item.changed ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                              }`}>
                                {item.changed ? "有变化" : "一致"}
                              </span>
                            </div>
                            <div className="mt-2 grid gap-1 text-xs text-slate-600">
                              <div>当前：{item.current}</div>
                              <div>版本：{item.version}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="font-medium text-slate-900">Markdown 预览</div>
                      <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-slate-950 p-3 text-xs leading-5 text-slate-100">
                        {versionDetail.version.markdown}
                      </pre>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="rounded-md border border-slate-200 p-3" data-testid="submission-asset-editor" id="submission-asset-editor">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="font-medium text-slate-950">投稿资产</div>
                <div className="mt-1 text-xs text-slate-500">
                  {selectedPackage.submissionAsset
                    ? `已保存 · ${selectedPackage.submissionAsset.updatedAt ? formatTime(selectedPackage.submissionAsset.updatedAt) : selectedPackage.submissionAsset.source}`
                    : "自动生成草稿"}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="w-fit rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  data-testid="optimize-submission-asset"
                  disabled={isOptimizingAsset || isSavingAsset}
                  onClick={() => void optimizeSubmissionAsset()}
                  type="button"
                >
                  {isOptimizingAsset ? "优化中" : "按审稿意见优化"}
                </button>
                <button
                  className="w-fit rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                  data-testid="save-submission-asset"
                  disabled={isSavingAsset}
                  onClick={() => void saveSubmissionAsset()}
                  type="button"
                >
                  {isSavingAsset ? "保存中" : "保存投稿资产"}
                </button>
              </div>
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-[180px_1fr]">
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-slate-500">资产质检</div>
                <div className="mt-1 text-2xl font-semibold text-slate-950">{selectedPackage.submissionAssetAudit.score}</div>
                <span className={`mt-2 inline-flex w-fit rounded-md px-2 py-1 text-xs font-medium ${assetAuditStatusClass(selectedPackage.submissionAssetAudit.status)}`}>
                  {assetAuditStatusLabel(selectedPackage.submissionAssetAudit.status)}
                </span>
              </div>
              {selectedAssetEditorReview ? (
                <div className="rounded-md bg-slate-50 p-3 text-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="font-medium text-slate-900">编辑审稿意见</div>
                      <p className="mt-1 leading-5 text-slate-600">{selectedAssetEditorReview.headline}</p>
                    </div>
                    <span className={`w-fit rounded-md px-2 py-1 text-xs font-medium ${assetAuditStatusClass(selectedPackage.submissionAssetAudit.status)}`}>
                      {assetAuditStatusLabel(selectedPackage.submissionAssetAudit.status)}
                    </span>
                  </div>
                  <div className={`mt-3 rounded-md border p-3 ${assetEditorReviewToneClass(selectedAssetEditorReview.tone)}`}>
                    <div className={`text-xs font-medium ${assetEditorReviewTextClass(selectedAssetEditorReview.tone)}`}>
                      {selectedAssetEditorReview.primaryAction}
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {selectedAssetEditorReview.focusIssues.map((issue) => (
                      <div className="rounded-md border border-slate-200 bg-white p-2" key={`${issue.field}-${issue.label}`}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-md px-2 py-1 text-xs font-medium ${
                            issue.severity === "blocker" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"
                          }`}>
                            {issue.severity === "blocker" ? "阻塞" : "提醒"}
                          </span>
                          <span className="font-medium text-slate-950">{issue.label}</span>
                          <span className="text-xs text-slate-500">{assetIssueFieldLabel(issue.field)}</span>
                        </div>
                        <div className="mt-1 leading-5 text-slate-600">{issue.detail}</div>
                      </div>
                    ))}
                    {!selectedAssetEditorReview.focusIssues.length ? (
                      <div className="rounded-md border border-emerald-100 bg-white p-2 text-emerald-700">当前平台投稿字段暂无明显问题。</div>
                    ) : null}
                  </div>
                  {selectedAssetEditorReview.evidence.length ? (
                    <div className="mt-3 rounded-md bg-white p-2 text-xs leading-5 text-slate-500">
                      <div className="font-medium text-slate-800">已通过证据</div>
                      <div className="mt-1">{selectedAssetEditorReview.evidence.join("、")}</div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="mt-3 grid gap-2 rounded-md bg-slate-50 p-3 text-sm sm:grid-cols-4">
              <div>
                <div className="text-xs text-slate-500">AI 候选</div>
                <div className="mt-1 font-medium text-slate-950">{selectedPackage.submissionAssetAdoption.generatedVariants}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">已采纳</div>
                <div className="mt-1 font-medium text-slate-950">{selectedPackage.submissionAssetAdoption.adoptedVersions}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">采纳率</div>
                <div className="mt-1 font-medium text-slate-950">{selectedPackage.submissionAssetAdoption.adoptionRatePercent}%</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">最高采纳分</div>
                <div className="mt-1 font-medium text-slate-950">{selectedPackage.submissionAssetAdoption.bestAdoptedScore || "暂无"}</div>
              </div>
              <div className="sm:col-span-4">
                <div className="text-slate-600">{selectedPackage.submissionAssetAdoption.verdict}</div>
                {selectedPackage.submissionAssetAdoption.recentStrategies.length ? (
                  <div className="mt-1 text-xs text-slate-500">最近采纳：{selectedPackage.submissionAssetAdoption.recentStrategies.join("、")}</div>
                ) : null}
              </div>
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <label className="grid gap-1 text-sm text-slate-600">
                标题
                <input
                  className="rounded-md border border-slate-200 px-3 py-2 text-slate-950"
                  data-testid="submission-asset-title"
                  onChange={(event) => setAssetDraft((current) => ({ ...current, title: event.target.value }))}
                  value={assetDraft.title}
                />
              </label>
              <label className="grid gap-1 text-sm text-slate-600">
                标签
                <input
                  className="rounded-md border border-slate-200 px-3 py-2 text-slate-950"
                  data-testid="submission-asset-tags"
                  onChange={(event) => setAssetDraft((current) => ({ ...current, tags: event.target.value }))}
                  placeholder="系统、重生、爽文"
                  value={assetDraft.tags}
                />
              </label>
              <label className="grid gap-1 text-sm text-slate-600 lg:col-span-2">
                一句话卖点
                <textarea
                  className="min-h-20 rounded-md border border-slate-200 px-3 py-2 text-slate-950"
                  data-testid="submission-asset-logline"
                  onChange={(event) => setAssetDraft((current) => ({ ...current, logline: event.target.value }))}
                  value={assetDraft.logline}
                />
              </label>
              <label className="grid gap-1 text-sm text-slate-600">
                国内简介
                <textarea
                  className="min-h-32 rounded-md border border-slate-200 px-3 py-2 text-slate-950"
                  data-testid="submission-asset-synopsis"
                  onChange={(event) => setAssetDraft((current) => ({ ...current, synopsis: event.target.value }))}
                  value={assetDraft.synopsis}
                />
              </label>
              <label className="grid gap-1 text-sm text-slate-600">
                海外简介
                <textarea
                  className="min-h-32 rounded-md border border-slate-200 px-3 py-2 text-slate-950"
                  data-testid="submission-asset-overseas-synopsis"
                  onChange={(event) => setAssetDraft((current) => ({ ...current, overseasSynopsis: event.target.value }))}
                  value={assetDraft.overseasSynopsis}
                />
              </label>
              <label className="grid gap-1 text-sm text-slate-600 lg:col-span-2">
                备注
                <textarea
                  className="min-h-20 rounded-md border border-slate-200 px-3 py-2 text-slate-950"
                  data-testid="submission-asset-note"
                  onChange={(event) => setAssetDraft((current) => ({ ...current, note: event.target.value }))}
                  value={assetDraft.note}
                />
              </label>
            </div>
            {assetOptimizationVariants.length ? (
              <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="font-medium text-slate-900">AI 优化方案</div>
                    <div className="mt-1 text-xs text-slate-500">选择一个方案应用后，会直接保存为新的投稿资产版本。</div>
                  </div>
                  <button
                    className="w-fit rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() => setAssetOptimizationVariants([])}
                    type="button"
                  >
                    清空方案
                  </button>
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-3">
                  {assetOptimizationVariants.map((variant) => (
                    <div className="rounded-md border border-slate-200 bg-white p-3" key={variant.strategy}>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="font-medium text-slate-950">{variant.strategy}</div>
                          <div className="mt-1 text-xs text-slate-500">{variant.title}</div>
                        </div>
                        <span className={`w-fit rounded-md px-2 py-1 text-xs font-medium ${assetAuditStatusClass(variant.audit.status)}`}>
                          {variant.audit.score}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span>较当前 {variant.audit.score - selectedPackage.submissionAssetAudit.score >= 0 ? "+" : ""}{variant.audit.score - selectedPackage.submissionAssetAudit.score} 分</span>
                        <span>改动 {[
                          variant.title !== assetDraft.title ? "标题" : "",
                          variant.logline !== assetDraft.logline ? "卖点" : "",
                          variant.synopsis !== assetDraft.synopsis ? "简介" : "",
                          variant.tags.join("、") !== assetDraft.tags ? "标签" : "",
                        ].filter(Boolean).join("、") || "无"}</span>
                      </div>
                      <div className="mt-2 leading-6 text-slate-700">{variant.logline}</div>
                      <div className="mt-2 line-clamp-4 leading-6 text-slate-600">{variant.synopsis}</div>
                      <div className="mt-2 text-xs text-slate-500">标签：{variant.tags.join("、")}</div>
                      {variant.addressedIssues?.length ? (
                        <div className="mt-2 rounded-md border border-emerald-100 bg-emerald-50 p-2 text-xs leading-5 text-emerald-800">
                          <div className="font-medium text-emerald-950">解决审稿意见</div>
                          <div className="mt-1">
                            {variant.addressedIssues.slice(0, 2).map((issue) => `${assetIssueFieldLabel(issue.field)}：${issue.label}`).join("；")}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 rounded-md border border-slate-100 bg-slate-50 p-2 text-xs leading-5 text-slate-500">
                          暂未命中明确审稿意见，重点看分数和改动字段。
                        </div>
                      )}
                      <div className="mt-2 grid gap-1 text-xs text-slate-500">
                        {variant.rationale.slice(0, 3).map((item) => (
                          <div key={item}>{item}</div>
                        ))}
                      </div>
                      <button
                        className="mt-3 w-fit rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                        disabled={isSavingAsset}
                        onClick={() => void applyOptimizationVariant(variant)}
                        type="button"
                      >
                        应用并保存
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="font-medium text-slate-900">投稿资产版本</div>
                  <div className="mt-1 text-xs text-slate-500">最近 {selectedPackage.submissionAssetVersions.length} 次保存或恢复。</div>
                </div>
                <div className="text-xs text-slate-500">{selectedPackage.platformName}</div>
              </div>
              <div className="mt-2 grid gap-2 lg:grid-cols-2">
                {selectedPackage.submissionAssetVersions.map((version) => (
                  <div className="rounded-md border border-slate-200 bg-white p-3" key={version.id ?? `${version.platformId}-${version.createdAt}`}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="font-medium text-slate-950">{version.title}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {assetVersionActionLabel(version.action)} · {formatTime(version.createdAt)}
                          {version.strategy ? ` · ${version.strategy}` : ""}
                        </div>
                      </div>
                      <span className={`w-fit rounded-md px-2 py-1 text-xs font-medium ${assetAuditStatusClass(version.auditStatus)}`}>
                        {version.auditScore}
                      </span>
                    </div>
                    <div className="mt-2 line-clamp-2 text-slate-600">{version.logline}</div>
                    <div className="mt-2 text-xs text-slate-500">标签：{version.tags.join("、") || "无"}</div>
                  </div>
                ))}
                {!selectedPackage.submissionAssetVersions.length ? (
                  <div className="rounded-md border border-slate-200 bg-white p-3 text-slate-600">还没有投稿资产版本，保存一次后开始记录。</div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 p-3" data-testid="publish-effect-panel" id="publish-effect-panel">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="font-medium text-slate-950">发布效果复盘</div>
                <p className="mt-1 text-sm leading-6 text-slate-600">{selectedPackage.publishEffect.verdict}</p>
              </div>
              <span className={`w-fit rounded-md px-2 py-1 text-xs font-medium ${effectStatusClass(selectedPackage.publishEffect.status)}`}>
                {effectStatusLabel(selectedPackage.publishEffect.status)}
              </span>
            </div>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3 lg:grid-cols-6">
              <div className="rounded-md bg-slate-50 p-2">
                <div className="text-xs text-slate-500">曝光</div>
                <div className="mt-1 font-medium text-slate-950">{selectedPackage.publishEffect.totalViews}</div>
              </div>
              <div className="rounded-md bg-slate-50 p-2">
                <div className="text-xs text-slate-500">点击率</div>
                <div className="mt-1 font-medium text-slate-950">{selectedPackage.publishEffect.clickRatePercent}%</div>
              </div>
              <div className="rounded-md bg-slate-50 p-2">
                <div className="text-xs text-slate-500">收藏率</div>
                <div className="mt-1 font-medium text-slate-950">{selectedPackage.publishEffect.favoriteRatePercent}%</div>
              </div>
              <div className="rounded-md bg-slate-50 p-2">
                <div className="text-xs text-slate-500">追读率</div>
                <div className="mt-1 font-medium text-slate-950">{selectedPackage.publishEffect.followRatePercent}%</div>
              </div>
              <div className="rounded-md bg-slate-50 p-2">
                <div className="text-xs text-slate-500">评论率</div>
                <div className="mt-1 font-medium text-slate-950">{selectedPackage.publishEffect.commentRatePercent}%</div>
              </div>
              <div className="rounded-md bg-slate-50 p-2">
                <div className="text-xs text-slate-500">付费阅读率</div>
                <div className="mt-1 font-medium text-slate-950">{selectedPackage.publishEffect.paidReadRatePercent}%</div>
              </div>
            </div>
            <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
              <span className="font-medium text-slate-950">下一步：</span>{selectedPackage.publishEffect.nextAction}
            </div>
            <div className="mt-3 rounded-md border border-slate-200 bg-white p-3 text-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="font-medium text-slate-950">效果回填口径</div>
                  <p className="mt-1 leading-6 text-slate-600">{selectedPackage.effectCapturePlan.prompt}</p>
                </div>
                <span className={`w-fit rounded-md px-2 py-1 text-xs font-medium ${effectCaptureStatusClass(selectedPackage.effectCapturePlan.status)}`}>
                  {effectCaptureStatusLabel(selectedPackage.effectCapturePlan.status)}
                </span>
              </div>
              <div className="mt-3 grid gap-2 text-xs text-slate-500 lg:grid-cols-3">
                <div className="rounded-md bg-slate-50 p-2">
                  <div className="font-medium text-slate-700">平台重点</div>
                  <div className="mt-1 leading-5">{selectedPackage.effectCapturePlan.primaryMetrics.join("、")}</div>
                </div>
                <div className="rounded-md bg-slate-50 p-2">
                  <div className="font-medium text-slate-700">必填数据</div>
                  <div className="mt-1 leading-5">{selectedPackage.effectCapturePlan.requiredFields.map((field) => field.label).join("、")}</div>
                </div>
                <div className="rounded-md bg-slate-50 p-2">
                  <div className="font-medium text-slate-700">当前缺失</div>
                  <div className="mt-1 leading-5">{selectedPackage.effectCapturePlan.missingFields.map((field) => field.label).join("、") || "无"}</div>
                </div>
              </div>
              <div className="mt-2 rounded-md bg-slate-50 p-2 text-slate-700">
                <span className="font-medium text-slate-950">回填动作：</span>{selectedPackage.effectCapturePlan.nextAction}
              </div>
            </div>
            <div className="mt-3 rounded-md border border-slate-200 bg-white p-3 text-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="font-medium text-slate-950">{selectedPackage.dispatchEffectValidation.headline}</div>
                  <p className="mt-1 leading-6 text-slate-600">{selectedPackage.dispatchEffectValidation.verdict}</p>
                </div>
                <span className={`w-fit rounded-md px-2 py-1 text-xs font-medium ${dispatchValidationClass(selectedPackage.dispatchEffectValidation.status)}`}>
                  {selectedPackage.dispatchEffectValidation.label}
                </span>
              </div>
              <div className="mt-2 rounded-md bg-slate-50 p-2 text-slate-700">
                <span className="font-medium text-slate-950">验收结论：</span>{selectedPackage.dispatchEffectValidation.nextAction}
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                {selectedPackage.dispatchEffectValidation.evidence.map((item) => (
                  <span className="rounded-md bg-slate-50 px-2 py-1" key={item}>{item}</span>
                ))}
              </div>
            </div>
            {latestEffectReview?.platformId === selectedPackage.platformId ? (
              <div className="mt-3 rounded-md border border-cyan-200 bg-cyan-50 p-3 text-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="font-medium text-slate-950">刚刚自动复盘</div>
                    <p className="mt-1 leading-6 text-slate-700">{latestEffectReview.headline}</p>
                  </div>
                  <span className="w-fit rounded-md bg-white px-2 py-1 text-xs font-medium text-cyan-700">
                    {optimizationStatusLabel(latestEffectReview.status)}
                  </span>
                </div>
                <p className="mt-2 leading-6 text-slate-700">{latestEffectReview.verdict}</p>
                <div className="mt-2 rounded-md bg-white p-2 text-slate-700">
                  <span className="font-medium text-slate-950">建议动作：</span>{latestEffectReview.nextAction}
                </div>
                {latestEffectReview.recommendedAction ? (
                  <button
                    className="mt-3 rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                    disabled={Boolean(runningOptimizationActionId) || isOptimizingAsset}
                    onClick={() => void runEffectOptimizationAction(latestEffectReview.recommendedAction as PlatformPublishOptimizationAction)}
                    type="button"
                  >
                    {latestEffectReview.recommendedAction.execution === "generate_asset_variants"
                      ? "生成方案"
                      : latestEffectReview.recommendedAction.execution === "rewrite_first_three"
                        ? "重写前三章"
                        : "打开位置"}
                  </button>
                ) : null}
              </div>
            ) : null}
            <div className="mt-3 rounded-md border border-slate-200 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="font-medium text-slate-950">下一轮 A/B 实验</div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{selectedPackage.experimentPlan.headline}</p>
                </div>
                <span className={`w-fit rounded-md px-2 py-1 text-xs font-medium ${experimentStatusClass(selectedPackage.experimentPlan.status)}`}>
                  {experimentStatusLabel(selectedPackage.experimentPlan.status)}
                </span>
              </div>
              <div className="mt-3 grid gap-2 text-sm lg:grid-cols-2">
                <div className="rounded-md bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">实验假设</div>
                  <div className="mt-1 leading-6 text-slate-700">{selectedPackage.experimentPlan.hypothesis}</div>
                </div>
                <div className="rounded-md bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">下一步</div>
                  <div className="mt-1 leading-6 text-slate-700">{selectedPackage.experimentPlan.nextAction}</div>
                </div>
              </div>
              <div className="mt-2 text-xs text-slate-500">
                观察指标：{selectedPackage.experimentPlan.targetMetrics.join("、")}
              </div>
              {selectedPackage.experimentPlan.status === "needs_candidates" ? (
                <button
                  className="mt-3 rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                  disabled={Boolean(runningOptimizationActionId) || isOptimizingAsset}
                  onClick={() => {
                    const action = selectedPackage.effectOptimization.actions.find((item) => item.execution === "generate_asset_variants");
                    if (action) void runEffectOptimizationAction(action);
                  }}
                  type="button"
                >
                  {isOptimizingAsset ? "生成中" : "生成 A/B 候选"}
                </button>
              ) : null}
              {selectedPackage.experimentPlan.candidates.length ? (
                <div className="mt-3 grid gap-2 lg:grid-cols-3">
                  {selectedPackage.experimentPlan.candidates.map((candidate) => (
                    <div className="rounded-md bg-slate-50 p-3 text-sm" key={candidate.id}>
                      <div className="flex flex-wrap items-center gap-2">
                        {candidate.recommended ? (
                          <span className="rounded-md bg-cyan-50 px-2 py-1 text-xs font-medium text-cyan-700">优先</span>
                        ) : null}
                        <span className="rounded-md bg-white px-2 py-1 text-xs text-slate-600">质检 {candidate.auditScore}</span>
                      </div>
                      <div className="mt-2 font-medium text-slate-950">{candidate.strategy}</div>
                      <div className="mt-1 text-slate-700">{candidate.title}</div>
                      <p className="mt-2 line-clamp-3 leading-6 text-slate-600">{candidate.logline}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {candidate.tags.slice(0, 5).map((tag) => (
                          <span className="rounded-md bg-white px-2 py-1 text-xs text-slate-500" key={tag}>{tag}</span>
                        ))}
                      </div>
                      <button
                        className="mt-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        disabled={isSavingAsset}
                        onClick={() => void applyExperimentCandidate(candidate)}
                        type="button"
                      >
                        采纳做实验
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="mt-3 rounded-md border border-slate-200 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="font-medium text-slate-950">执行前后对照</div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{selectedPackage.publishEffect.comparison.verdict}</p>
                </div>
                <span className={`w-fit rounded-md px-2 py-1 text-xs font-medium ${comparisonStatusClass(selectedPackage.publishEffect.comparison.status)}`}>
                  {comparisonStatusLabel(selectedPackage.publishEffect.comparison.status)}
                </span>
              </div>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-md bg-slate-50 p-2">
                  <div className="text-xs text-slate-500">曝光变化</div>
                  <div className="mt-1 font-medium text-slate-950">{formatDelta(selectedPackage.publishEffect.comparison.viewsDelta)}</div>
                </div>
                <div className="rounded-md bg-slate-50 p-2">
                  <div className="text-xs text-slate-500">点击率变化</div>
                  <div className="mt-1 font-medium text-slate-950">{formatDelta(selectedPackage.publishEffect.comparison.clickRateDeltaPercent, "%")}</div>
                </div>
                <div className="rounded-md bg-slate-50 p-2">
                  <div className="text-xs text-slate-500">收藏率变化</div>
                  <div className="mt-1 font-medium text-slate-950">{formatDelta(selectedPackage.publishEffect.comparison.favoriteRateDeltaPercent, "%")}</div>
                </div>
                <div className="rounded-md bg-slate-50 p-2">
                  <div className="text-xs text-slate-500">追读率变化</div>
                  <div className="mt-1 font-medium text-slate-950">{formatDelta(selectedPackage.publishEffect.comparison.followRateDeltaPercent, "%")}</div>
                </div>
              </div>
              {(selectedPackage.publishEffect.comparison.wins.length || selectedPackage.publishEffect.comparison.losses.length) ? (
                <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                  <div>上涨：{selectedPackage.publishEffect.comparison.wins.join("、") || "无"}</div>
                  <div>下滑：{selectedPackage.publishEffect.comparison.losses.join("、") || "无"}</div>
                </div>
              ) : null}
              <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="font-medium text-slate-950">实验结果归因</div>
                    <p className="mt-1 leading-6 text-slate-600">{selectedPackage.experimentPlan.attribution.headline}</p>
                  </div>
                  <span className={`w-fit rounded-md px-2 py-1 text-xs font-medium ${attributionStatusClass(selectedPackage.experimentPlan.attribution.status)}`}>
                    {attributionStatusLabel(selectedPackage.experimentPlan.attribution.status)}
                  </span>
                </div>
                <p className="mt-2 leading-6 text-slate-700">{selectedPackage.experimentPlan.attribution.verdict}</p>
                <div className="mt-2 grid gap-2 lg:grid-cols-2">
                  <div className="rounded-md bg-white p-2">
                    <div className="text-xs text-slate-500">归因候选</div>
                    <div className="mt-1 text-slate-700">
                      {selectedPackage.experimentPlan.attribution.attributedStrategy ?? "暂无"}
                      {selectedPackage.experimentPlan.attribution.attributedTitle ? ` · ${selectedPackage.experimentPlan.attribution.attributedTitle}` : ""}
                    </div>
                  </div>
                  <div className="rounded-md bg-white p-2">
                    <div className="text-xs text-slate-500">下一步</div>
                    <div className="mt-1 text-slate-700">{selectedPackage.experimentPlan.attribution.nextAction}</div>
                  </div>
                </div>
                {selectedPackage.experimentPlan.attribution.platformLearnings.length ? (
                  <div className="mt-2 grid gap-1 text-xs text-slate-500">
                    {selectedPackage.experimentPlan.attribution.platformLearnings.map((learning) => (
                      <div key={learning}>经验：{learning}</div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="mt-3 rounded-md border border-slate-200 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="font-medium text-slate-950">二轮优化清单</div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{selectedPackage.effectOptimization.headline}</p>
                </div>
                <span className="w-fit rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                  {optimizationStatusLabel(selectedPackage.effectOptimization.status)}
                </span>
              </div>
              <div className="mt-3 grid gap-2 lg:grid-cols-2">
                {selectedPackage.effectOptimization.actions.map((action) => (
                  <div className="rounded-md bg-slate-50 p-3 text-sm" key={action.id}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-md px-2 py-1 text-xs font-medium ${optimizationPriorityClass(action.priority)}`}>
                          {action.priority === "high" ? "高" : action.priority === "medium" ? "中" : "低"}
                        </span>
                        <span className="rounded-md bg-white px-2 py-1 text-xs text-slate-600">{optimizationAreaLabel(action.area)}</span>
                        <span className="font-medium text-slate-950">{action.label}</span>
                      </div>
                      <button
                        className="w-fit rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                        disabled={Boolean(runningOptimizationActionId) || isOptimizingAsset}
                        onClick={() => void runEffectOptimizationAction(action)}
                        type="button"
                      >
                        {runningOptimizationActionId === action.id
                          ? "执行中"
                          : action.execution === "generate_asset_variants"
                            ? "生成方案"
                            : action.execution === "rewrite_first_three"
                              ? "重写前三章"
                              : "打开位置"}
                      </button>
                    </div>
                    <p className="mt-2 leading-6 text-slate-600">{action.detail}</p>
                    <div className="mt-2 grid gap-1 text-xs text-slate-500">
                      <div>依据：{action.evidence}</div>
                      <div>位置：{action.target}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-3">
              {[
                ["views", "曝光"],
                ["clicks", "点击"],
                ["favorites", "收藏"],
                ["follows", "追读"],
                ["comments", "评论"],
                ["paidReads", "付费阅读"],
              ].map(([field, label]) => (
                <label className="grid gap-1 text-sm text-slate-600" key={field}>
                  {label}
                  <input
                    className="rounded-md border border-slate-200 px-3 py-2 text-slate-950"
                    min="0"
                    onChange={(event) => setEffectDraft((current) => ({ ...current, [field]: event.target.value }))}
                    type="number"
                    value={effectDraft[field as keyof Pick<PublishEffectDraft, "views" | "clicks" | "favorites" | "follows" | "comments" | "paidReads">]}
                  />
                </label>
              ))}
              <label className="grid gap-1 text-sm text-slate-600">
                反馈状态
                <select
                  className="rounded-md border border-slate-200 px-3 py-2 text-slate-950"
                  onChange={(event) => setEffectDraft((current) => ({ ...current, contractStatus: event.target.value }))}
                  value={effectDraft.contractStatus}
                >
                  <option value="unknown">未知</option>
                  <option value="pending">待反馈</option>
                  <option value="invited">收到邀约</option>
                  <option value="signed">已签约</option>
                  <option value="rejected">被拒</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm text-slate-600">
                记录日期
                <input
                  className="rounded-md border border-slate-200 px-3 py-2 text-slate-950"
                  onChange={(event) => setEffectDraft((current) => ({ ...current, snapshotDate: event.target.value }))}
                  type="date"
                  value={effectDraft.snapshotDate}
                />
              </label>
              <label className="grid gap-1 text-sm text-slate-600 lg:col-span-1">
                发布链接
                <input
                  className="rounded-md border border-slate-200 px-3 py-2 text-slate-950"
                  onChange={(event) => setEffectDraft((current) => ({ ...current, publishUrl: event.target.value }))}
                  value={effectDraft.publishUrl}
                />
              </label>
              <label className="grid gap-1 text-sm text-slate-600 lg:col-span-3">
                编辑反馈
                <textarea
                  className="min-h-20 rounded-md border border-slate-200 px-3 py-2 text-slate-950"
                  onChange={(event) => setEffectDraft((current) => ({ ...current, editorFeedback: event.target.value }))}
                  value={effectDraft.editorFeedback}
                />
              </label>
              <label className="grid gap-1 text-sm text-slate-600 lg:col-span-3">
                复盘备注
                <textarea
                  className="min-h-20 rounded-md border border-slate-200 px-3 py-2 text-slate-950"
                  onChange={(event) => setEffectDraft((current) => ({ ...current, notes: event.target.value }))}
                  value={effectDraft.notes}
                />
              </label>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                className="rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                disabled={isSavingEffect}
                onClick={() => void savePublishEffect()}
                type="button"
              >
                {isSavingEffect ? "记录中" : "记录发布效果"}
              </button>
              <span className="text-xs text-slate-500">已记录 {selectedPackage.publishEffect.records} 次</span>
            </div>
            {selectedPackage.publishEffect.history.length ? (
              <div className="mt-3 grid gap-2 lg:grid-cols-2">
                {selectedPackage.publishEffect.history.slice(0, 4).map((metric) => (
                  <div className="rounded-md border border-slate-200 bg-white p-3 text-sm" key={metric.id ?? `${metric.platformId}-${metric.snapshotDate}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium text-slate-950">{formatTime(metric.snapshotDate)}</div>
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">{contractStatusLabel(metric.contractStatus)}</span>
                    </div>
                    <div className="mt-2 text-slate-600">
                      曝光 {metric.views} · 点击 {metric.clicks} · 收藏 {metric.favorites} · 追读 {metric.follows}
                    </div>
                    {metric.editorFeedback ? <div className="mt-2 line-clamp-2 text-slate-500">反馈：{metric.editorFeedback}</div> : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50 p-3" data-testid="platform-package-preview">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${packagePreviewStatusClass(selectedPackage.preview.status)}`}>
                    {packagePreviewStatusLabel(selectedPackage.preview.status)}
                  </span>
                  <div className="font-medium text-slate-950">{selectedPackage.preview.headline}</div>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{selectedPackage.preview.nextAction}</p>
              </div>
              <a
                className="w-fit rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                href={selectedPackage.preview.actionHref}
              >
                跳到动作
              </a>
            </div>

            <div className="mt-3 grid gap-2 text-sm md:grid-cols-2 xl:grid-cols-4">
              {[selectedPackage.preview.titleLine, selectedPackage.preview.assetLine, selectedPackage.preview.chapterLine, selectedPackage.preview.riskLine].map((line) => (
                <div className="rounded-md bg-white p-2 leading-5 text-slate-700" key={line}>
                  {line}
                </div>
              ))}
            </div>

            <div className="mt-3 grid gap-2 text-sm lg:grid-cols-3">
              {selectedPackage.preview.highlights.map((item) => (
                <div className="rounded-md bg-white p-2 leading-5 text-slate-600" key={item}>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-slate-200 p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="font-medium text-slate-950">{selectedPackage.platformName} · 发布包</div>
                <p className="mt-1 text-sm text-slate-600">{selectedPackage.logline}</p>
              </div>
              <div className="text-sm text-slate-500">{selectedPackage.category}</div>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">{selectedPackage.synopsis}</p>
            <div className="mt-3 text-sm text-slate-600">标签：{selectedPackage.tags.join("、")}</div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-md border border-slate-200 p-3">
              <div className="font-medium text-slate-950">发布说明</div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{selectedPackage.publishNote}</p>
            </div>
            <div className="rounded-md border border-slate-200 p-3">
              <div className="font-medium text-slate-950">风险提醒</div>
              <div className="mt-2 grid gap-2 text-sm text-slate-600">
                {(selectedPackage.warnings.length ? selectedPackage.warnings : ["暂无明显风险。"]).map((warning) => (
                  <div className="rounded-md bg-slate-50 p-2" key={warning}>{warning}</div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            {selectedPackage.chapters.map((chapter) => (
              <div className="rounded-md border border-slate-200 p-3 text-sm" key={chapter.id}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="font-medium text-slate-950">{chapter.formattedTitle}</div>
                    <div className="mt-1 text-slate-500">
                      {chapter.wordCount} 字 · {chapter.status} · {chapter.ready ? "可发布" : "待处理"} · 质检 {chapter.preflight.score}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">第 {chapter.order} 章</div>
                </div>
                <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-slate-600">{chapter.body}</p>
                {chapter.preflight.blocked.length ? (
                  <p className="mt-2 text-slate-500">阻塞项：{chapter.preflight.blocked.join("；")}</p>
                ) : null}
                {chapter.repairActions.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {chapter.repairActions.slice(0, 2).map((action) => (
                      canRunAction(action) ? (
                        <button
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          disabled={Boolean(runningActionId)}
                          key={action.id}
                          onClick={() => void runRepairAction(action)}
                          type="button"
                        >
                          {runningActionId === action.id ? "处理中" : action.label}
                        </button>
                      ) : (
                        <Link
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          href={actionHref(projectId, action)}
                          key={action.id}
                        >
                          {action.label}
                        </Link>
                      )
                    ))}
                  </div>
                ) : null}
                {chapter.warnings.length ? (
                  <p className="mt-2 text-slate-500">章节风险：{chapter.warnings.join("；")}</p>
                ) : null}
              </div>
            ))}
            {selectedPackage.chapters.length === 0 ? (
              <p className="rounded-md border border-slate-200 p-3 text-sm text-slate-600">还没有可导出的正文章节。</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
