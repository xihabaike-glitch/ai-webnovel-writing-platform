"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  actionFromRunResult,
  labelForAction,
  normalizeRunResult,
  pendingResultFromAction,
  type PublishRepairRunResult,
  type RawPublishRepairRunResult,
} from "@/lib/projects/publishRepairRunResults";

type PublishRepairActionKind =
  | "edit_chapter"
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
  priority: "high" | "medium" | "low";
  label: string;
  detail: string;
  executable: boolean;
  chapterId?: string;
  chapterTitle?: string;
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

interface PlatformPublishPackage {
  platformId: string;
  platformName: string;
  category: string;
  submissionAsset: PlatformSubmissionAsset | null;
  submissionAssetAudit: PlatformSubmissionAssetAudit;
  submissionAssetVersions: PlatformSubmissionAssetVersion[];
  submissionAssetAdoption: PlatformSubmissionAssetAdoption;
  publishEffect: PlatformPublishEffect;
  effectOptimization: PlatformPublishEffectOptimization;
  title: string;
  logline: string;
  synopsis: string;
  tags: string[];
  publishNote: string;
  chapters: PlatformPublishChapter[];
  preflight: PublishPreflight;
  canExport: boolean;
  repairActions: PublishRepairAction[];
  repairPath: PublishRepairPath;
  repairHistory: PublishRepairHistoryItem[];
  publishVersions: PublishPackageVersionItem[];
  warnings: string[];
  markdown: string;
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
  history: PlatformStrategyReviewHistoryItem[];
}

interface PlatformStrategyReviewTask {
  id: string;
  priority: "high" | "medium" | "low";
  execution: "open_target" | "generate_asset_variants" | "rewrite_first_three" | "save_snapshot" | "apply_strategy";
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
  previousPlatformId: string;
  previousPlatformName: string;
  recommendation: PlatformStrategyRankItem["recommendation"];
  score: number;
  progress: PlatformStrategyProgressSummary;
  steps: PlatformStrategySwitchStep[];
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

interface PlatformPublishExportCenter {
  packages: PlatformPublishPackage[];
  recommendedPlatformId: string;
  totalPublishableChapters: number;
  workspace: PlatformPublishWorkspace;
  platformStrategy: PlatformStrategyRankItem[];
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

function canRunAction(action: PublishRepairAction) {
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

const strategyScoreLabels: { key: keyof PlatformStrategyRankItem["scores"]; label: string }[] = [
  { key: "preflight", label: "质检" },
  { key: "asset", label: "资产" },
  { key: "effect", label: "效果" },
  { key: "comparison", label: "对照" },
  { key: "adoption", label: "采纳" },
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
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [versionDetail, setVersionDetail] = useState<PublishPackageVersionDetailState | null>(null);
  const [isLoadingVersion, setIsLoadingVersion] = useState(false);
  const [isRestoringVersion, setIsRestoringVersion] = useState(false);
  const [isSavingAsset, setIsSavingAsset] = useState(false);
  const [isOptimizingAsset, setIsOptimizingAsset] = useState(false);
  const [isSavingEffect, setIsSavingEffect] = useState(false);
  const [runningOptimizationActionId, setRunningOptimizationActionId] = useState<string | null>(null);
  const [applyingStrategyPlatformId, setApplyingStrategyPlatformId] = useState<string | null>(null);
  const [runningStrategyStepId, setRunningStrategyStepId] = useState<string | null>(null);
  const [runningStrategyReviewTaskId, setRunningStrategyReviewTaskId] = useState<string | null>(null);
  const [strategySwitchPlan, setStrategySwitchPlan] = useState<PlatformStrategySwitchPlan | null>(null);
  const [strategyExecutionReceipt, setStrategyExecutionReceipt] = useState<PlatformStrategyExecutionReceipt | null>(null);
  const [strategyReviewTaskReceipt, setStrategyReviewTaskReceipt] = useState<PlatformStrategyReviewTaskReceipt | null>(null);
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
      const payload = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "保存发布效果失败。");
      setMessage(payload?.message ?? "发布效果已记录。");
      await loadCenter({ keepMessage: true });
      if (strategySwitchPlan?.platformId === platformId) {
        const refreshedPlan = await refreshStrategyPlan(platformId);
        setStrategyExecutionReceipt(buildStrategyExecutionReceipt(refreshedPlan, "save-publish-effect"));
        setMessage(`${payload?.message ?? "发布效果已记录。"} 策略链已刷新。`);
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

  async function executeStrategyNextStep() {
    if (!strategySwitchPlan || !strategyNextStep) return;
    const strategyPackage = center?.packages.find((pack) => pack.platformId === strategySwitchPlan.platformId) ?? selectedPackage;
    if (!strategyPackage) return;
    setSelectedPlatformId(strategyPackage.platformId);
    setRunningStrategyStepId(strategyNextStep.id);
    setMessage(null);

    try {
      if (strategyNextStep.id === "fix-submission-asset") {
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
        setStrategyExecutionReceipt(buildStrategyExecutionReceipt(strategySwitchPlan, strategyNextStep.id, payload.variants.length));
        setMessage(`已按执行链生成 ${payload.variants.length} 个 ${strategyPackage.platformName} 投稿资产候选。`);
      } else if (strategyNextStep.id === "rewrite-first-three") {
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
        setStrategyExecutionReceipt(buildStrategyExecutionReceipt(refreshedPlan, strategyNextStep.id, payload.results.length));
        setMessage(`已按执行链重写 ${strategyPackage.platformName} 前三章，共 ${payload.results.length} 章，策略链已刷新。`);
      } else if (strategyNextStep.id === "record-publish-effect") {
        window.location.hash = "publish-effect-panel";
        setStrategyExecutionReceipt(buildStrategyExecutionReceipt(strategySwitchPlan, strategyNextStep.id));
        setMessage("下一步是录入真实发布效果：把曝光、点击、收藏、追读和编辑反馈填进去。");
      }
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "执行策略下一步失败。");
    } finally {
      setIsOptimizingAsset(false);
      setRunningStrategyStepId(null);
    }
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
    if (!saved || !platformId || strategySwitchPlan?.platformId !== platformId) return;
    try {
      const refreshedPlan = await refreshStrategyPlan(platformId);
      setStrategyExecutionReceipt(buildStrategyExecutionReceipt(refreshedPlan, "adopt-submission-asset"));
      setMessage(`已采纳并保存「${variant.strategy}」，策略链已刷新。`);
    } catch (caught) {
      setStrategyExecutionReceipt(buildStrategyExecutionReceipt(strategySwitchPlan, "adopt-submission-asset"));
      setMessage(caught instanceof Error ? caught.message : "投稿资产已保存，但策略链刷新失败。");
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
      setMessage(`已复制 ${selectedPackage.platformName} 发布包，并保存版本。`);
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
      setMessage(`已下载 ${selectedPackage.platformName} 发布包，并保存版本。`);
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
      setMessage(`已下载全平台投稿包，包含 ${exportablePackages.length} 个通过质检的平台版本。`);
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
    try {
      const response = await fetch(`/api/projects/${projectId}/platform-export/repair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: action.kind,
          chapterId: action.chapterId,
          chapterTitle: action.chapterTitle,
          detail: action.detail,
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        error?: string;
        result?: RawPublishRepairRunResult;
        results?: RawPublishRepairRunResult[];
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
    try {
      const response = await fetch(`/api/projects/${projectId}/platform-export/repair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actions: executableActions.map((action) => ({
            kind: action.kind,
            chapterId: action.chapterId,
            chapterTitle: action.chapterTitle,
            detail: action.detail,
          })),
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        error?: string;
        results?: RawPublishRepairRunResult[];
      } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "批量修复失败。");
      }
      setRunResults(payload?.results?.map(normalizeRunResult) ?? []);
      setMessage(payload?.message ?? "批量修复已完成。");
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
    try {
      const response = await fetch(`/api/projects/${projectId}/platform-export/repair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actions: workspaceExecutableActions.map((action) => ({
            kind: action.kind,
            chapterId: action.chapterId,
            chapterTitle: action.chapterTitle,
            detail: action.detail,
          })),
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        error?: string;
        results?: RawPublishRepairRunResult[];
      } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "全平台批量修复失败。");
      }
      setRunResults(payload?.results?.map(normalizeRunResult) ?? []);
      setMessage(payload?.message ?? "全平台批量修复已完成。");
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

      {selectedPackage ? (
        <div className="mt-4 grid gap-4">
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
                  {isOptimizingAsset ? "优化中" : "AI 优化投稿资产"}
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
              <div className="rounded-md bg-slate-50 p-3 text-sm">
                <div className="font-medium text-slate-900">字段问题</div>
                <div className="mt-2 grid gap-2">
                  {(selectedPackage.submissionAssetAudit.issues.length ? selectedPackage.submissionAssetAudit.issues : []).slice(0, 4).map((issue) => (
                    <div className="rounded-md border border-slate-200 bg-white p-2" key={`${issue.field}-${issue.label}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-md px-2 py-1 text-xs font-medium ${
                          issue.severity === "blocker" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"
                        }`}>
                          {issue.severity === "blocker" ? "阻塞" : "提醒"}
                        </span>
                        <span className="font-medium text-slate-950">{issue.label}</span>
                      </div>
                      <div className="mt-1 leading-5 text-slate-600">{issue.detail}</div>
                    </div>
                  ))}
                  {!selectedPackage.submissionAssetAudit.issues.length ? (
                    <div className="rounded-md border border-emerald-100 bg-white p-2 text-emerald-700">当前平台投稿字段暂无明显问题。</div>
                  ) : null}
                </div>
                {selectedPackage.submissionAssetAudit.passed.length ? (
                  <div className="mt-3 text-xs text-slate-500">已通过：{selectedPackage.submissionAssetAudit.passed.slice(0, 3).join("、")}</div>
                ) : null}
              </div>
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
