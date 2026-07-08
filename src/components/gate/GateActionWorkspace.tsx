"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  buildGateAdviceActionReceipt,
  buildGateActionReceiptSummary,
  buildGateActionReviewAdvice,
  buildGateFailureRepairReceiptReview,
  buildGateFailureRepairRecheckDispatchItems,
  buildGateFailureRepairRecheckResolution,
  buildGateFailureRepairThirdRoundDispatchItems,
  buildGateFailureRepairThirdRoundResolution,
  buildGateDispatchEvidenceReview,
  buildGatePlatformScaleFollowup,
  buildGatePlatformScaleCadence,
  buildGatePlatformScaleGate,
  buildGatePlatformRetreatGate,
  buildGatePlatformRetreatDispatchItems,
  buildGatePlatformRetreatResolution,
  buildGatePlatformRetreatRecheckDispatchItems,
  buildGatePlatformDecisionTimeline,
  buildGatePlatformDecisionSummaryMarkdown,
  buildGateBatchTacticEffectReview,
  buildGateRecommendedBatchReceiptFocus,
  buildGatePlatformTacticExperienceLibrary,
  buildGatePlatformTacticExperienceDisplay,
  buildGatePlatformTacticExperienceFollowupDispatch,
  buildGatePlatformTacticExperienceMarkdown,
  buildGatePlatformTacticExperienceStartHref,
  buildGatePlatformDispatchReceipt,
  buildGateKnowledgeFeedbackDispatchItems,
  buildGatePlatformEvidenceLoopDispatchItems,
  buildGatePlatformGrowthDispatchItems,
  buildGateProjectStartValidationDispatchItems,
  buildGateProjectStartValidationReview,
  buildGateProjectStartNextDispatchItems,
  buildGateProjectStartMetricDecision,
  buildGateProjectStartMetricDispatchItems,
  buildGateProjectStartMetricFollowupDispatchItems,
  buildGateProjectSecondMetricDecision,
  buildGateProjectSecondMetricDispatchItems,
  buildGateProjectSecondMetricFollowupDispatchItems,
  buildGateProjectThirdMetricDecision,
  buildGatePlatformGrowthReview,
  clearGateActionReceipts,
  clearPersistedGateActionReceipts,
  filterGateActionReceipts,
  filterGatePlatformDecisionTimelineItems,
  filterGatePlatformTacticExperienceItems,
  fetchPersistedGateActionReceipts,
  fetchPersistedGateDispatchTasks,
  fetchGateKnowledgeFeedbackReceipts,
  fetchGatePlatformEvidenceLoops,
  gateActionReceiptUpdatedEvent,
  loadGateActionReceipts,
  mergeGateActionReceipts,
  persistGateActionReceipt,
  persistGateDispatchTask,
  saveGateActionReceipts,
  type GateActionReceipt,
  type GateActionReceiptExecutionFilter,
  type GateActionReviewAdvice,
  type GateActionReviewAdviceAction,
  type GateActionReviewAdviceSeverity,
  type GateActionReviewAdviceState,
  type GateActionReceiptStatusFilter,
  type GateDispatchEvidenceReviewStatus,
  type GateProjectStartMetricDecisionStatus,
  type GateProjectSecondMetricDecisionStatus,
  type GateProjectThirdMetricDecisionStatus,
  type GateProjectStartValidationStatus,
  type GatePlatformScaleFollowupStatus,
  type GatePlatformScaleCadenceStatus,
  type GatePlatformScaleGateStatus,
  type GatePlatformRetreatStatus,
  type GatePlatformRetreatResolutionStatus,
  type GatePlatformDecisionTimelineEventType,
  type GatePlatformDecisionTimelineStatus,
  type GatePlatformDecisionTimelineItem,
  type GateBatchTacticEffectStatus,
  type GateRecommendedBatchReceiptFocusTone,
  type GatePlatformTacticExperienceItem,
  type GatePlatformTacticExperienceStatus,
  type GatePlatformTacticExperienceStatusFilter,
  type GatePlatformGrowthDispatchItem,
  type GateKnowledgeFeedbackReceipt,
  type GatePlatformEvidenceLoop,
  type GatePlatformGrowthReview,
  type PersistedGatePlatformDispatchTask,
} from "@/lib/projects/gateActionReceipts";
import type { FailureRepairBatch } from "@/lib/ai/taskRunConsole";
import type { PrePublishGateAction } from "@/lib/projects/prePublishGate";
import { GatePriorityActionCard } from "./GatePriorityActionCard";

function receiptStatusClass(status: GateActionReceipt["status"]) {
  if (status === "succeeded") return "bg-emerald-50 text-emerald-700";
  return "bg-rose-50 text-rose-700";
}

function recheckClass(status: GateActionReceipt["recheck"]["status"]) {
  if (status === "ready") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  return "border-rose-200 bg-rose-50 text-rose-800";
}

function recommendedBatchFocusClass(tone: GateRecommendedBatchReceiptFocusTone) {
  if (tone === "ready") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (tone === "blocked") return "border-rose-200 bg-rose-50 text-rose-900";
  return "border-amber-200 bg-amber-50 text-amber-900";
}

function hrefWithGateReturn(href: string, gateReturnHref?: string | null) {
  if (!gateReturnHref || !href.startsWith("/") || href.startsWith("/gate")) return href;

  const hashIndex = href.indexOf("#");
  const base = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";
  if (base.includes("gateReturn=")) return href;
  const separator = base.includes("?") ? "&" : "?";

  return `${base}${separator}gateReturn=${encodeURIComponent(gateReturnHref)}${hash}`;
}

function failureRepairReviewClass(status: ReturnType<typeof buildGateFailureRepairReceiptReview>["status"]) {
  if (status === "cleared" || status === "clear") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "recheck") return "border-blue-200 bg-blue-50 text-blue-900";
  if (status === "blocked") return "border-rose-200 bg-rose-50 text-rose-900";
  return "border-amber-200 bg-amber-50 text-amber-900";
}

function failureRepairResolutionClass(status: ReturnType<typeof buildGateFailureRepairRecheckResolution>["status"]) {
  if (status === "resolved") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "failed") return "border-rose-200 bg-rose-50 text-rose-900";
  if (status === "active") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function failureRepairThirdRoundClass(status: ReturnType<typeof buildGateFailureRepairThirdRoundResolution>["status"]) {
  if (status === "resolved") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "failed") return "border-rose-200 bg-rose-50 text-rose-900";
  if (status === "active") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function executionLabel(type: GateActionReceipt["executionType"]) {
  if (type === "publish_repair") return "发布修复";
  if (type === "retry_task") return "失败重试";
  if (type === "recommended_batch") return "推荐批次";
  if (type === "platform_strategy") return "平台策略";
  if (type === "model_route") return "模型路由";
  if (type === "first_three_adoption") return "采纳闭环";
  return "人工处理";
}

function receiptExecutionLabel(receipt: GateActionReceipt) {
  if (receipt.actionId.startsWith("project_start_decision:")) return "开书策略";
  return executionLabel(receipt.executionType);
}

function adviceClass(severity: GateActionReviewAdviceSeverity) {
  if (severity === "urgent") return "border-rose-200 bg-rose-50 text-rose-900";
  if (severity === "warning") return "border-amber-200 bg-amber-50 text-amber-900";
  if (severity === "opportunity") return "border-blue-200 bg-blue-50 text-blue-900";
  return "border-emerald-200 bg-emerald-50 text-emerald-900";
}

function adviceLabel(severity: GateActionReviewAdviceSeverity) {
  if (severity === "urgent") return "先救火";
  if (severity === "warning") return "补证据";
  if (severity === "opportunity") return "别浪费";
  return "可加码";
}

function adviceStateLabel(state: GateActionReviewAdviceState) {
  if (state === "in_progress") return "处理中";
  return "待处理";
}

function adviceActionTitle(kind: GateActionReviewAdviceAction["kind"]) {
  if (kind === "handle_failure") return "把坑先填上";
  if (kind === "adopt_asset") return "进入资产采纳";
  if (kind === "record_metrics") return "进入效果回填";
  if (kind === "start_gate_action") return "从闸门动作开始";
  return "重新计算闸门";
}

function growthStageClass(stage: GatePlatformGrowthReview["stage"]) {
  if (stage === "start_first_three_review") return "bg-indigo-50 text-indigo-700";
  if (stage === "start_opening_diagnostic") return "bg-cyan-50 text-cyan-700";
  if (stage === "start_platform_package") return "bg-fuchsia-50 text-fuchsia-700";
  if (stage === "start_publish_finalize") return "bg-violet-50 text-violet-700";
  if (stage === "start_metrics_recovery") return "bg-teal-50 text-teal-700";
  if (stage === "start_repair_packaging") return "bg-rose-50 text-rose-700";
  if (stage === "start_rewrite_opening") return "bg-orange-50 text-orange-700";
  if (stage === "fix_failure") return "bg-rose-50 text-rose-700";
  if (stage === "record_metrics") return "bg-amber-50 text-amber-700";
  if (stage === "adopt_asset") return "bg-blue-50 text-blue-700";
  if (stage === "scale_up") return "bg-emerald-50 text-emerald-700";
  return "bg-slate-100 text-slate-700";
}

function growthStageLabel(stage: GatePlatformGrowthReview["stage"]) {
  if (stage === "start_first_three_review") return "前三章审稿";
  if (stage === "start_opening_diagnostic") return "开头钩子诊断";
  if (stage === "start_platform_package") return "平台包装";
  if (stage === "start_publish_finalize") return "发布包定稿";
  if (stage === "start_metrics_recovery") return "首轮数据回收";
  if (stage === "start_repair_packaging") return "首轮包装修复";
  if (stage === "start_rewrite_opening") return "首轮开头重写";
  if (stage === "fix_failure") return "修失败";
  if (stage === "record_metrics") return "补数据";
  if (stage === "adopt_asset") return "采纳资产";
  if (stage === "scale_up") return "小步加码";
  if (stage === "repair_tactic") return "打法修复";
  if (stage === "pivot_platform") return "平台转向";
  if (stage === "pause_platform") return "暂停平台";
  return "继续观察";
}

function dispatchStateClass(state: GatePlatformGrowthDispatchItem["state"]) {
  if (state === "completed") return "bg-slate-100 text-slate-600";
  if (state === "assigned") return "bg-emerald-50 text-emerald-700";
  return "bg-amber-50 text-amber-700";
}

function dispatchStateLabel(state: GatePlatformGrowthDispatchItem["state"]) {
  if (state === "completed") return "已完成";
  if (state === "assigned") return "已派单";
  return "待派单";
}

function evidenceStateClass(status: GateDispatchEvidenceReviewStatus) {
  if (status === "missing_evidence") return "border-rose-200 bg-rose-50 text-rose-900";
  if (status === "needs_receipt") return "border-amber-200 bg-amber-50 text-amber-900";
  if (status === "verified") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  return "border-slate-200 bg-slate-50 text-slate-800";
}

function startValidationClass(status: GateProjectStartValidationStatus) {
  if (status === "ready") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "missing_evidence") return "border-rose-200 bg-rose-50 text-rose-900";
  return "border-amber-200 bg-amber-50 text-amber-900";
}

function startMetricDecisionClass(status: GateProjectStartMetricDecisionStatus) {
  if (status === "scale") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "repair_packaging") return "border-rose-200 bg-rose-50 text-rose-900";
  if (status === "rewrite_opening") return "border-orange-200 bg-orange-50 text-orange-900";
  return "border-amber-200 bg-amber-50 text-amber-900";
}

function secondMetricDecisionClass(status: GateProjectSecondMetricDecisionStatus) {
  if (status === "continue_scale") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "repair_tactic") return "border-amber-200 bg-amber-50 text-amber-900";
  if (status === "pivot_platform") return "border-orange-200 bg-orange-50 text-orange-900";
  if (status === "pause") return "border-rose-200 bg-rose-50 text-rose-900";
  return "border-slate-200 bg-slate-50 text-slate-800";
}

function thirdMetricDecisionClass(status: GateProjectThirdMetricDecisionStatus) {
  if (status === "stable_scale") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "downgrade_repair") return "border-amber-200 bg-amber-50 text-amber-900";
  if (status === "pivot_platform") return "border-orange-200 bg-orange-50 text-orange-900";
  if (status === "archive_pause") return "border-rose-200 bg-rose-50 text-rose-900";
  return "border-slate-200 bg-slate-50 text-slate-800";
}

function scaleGateClass(status: GatePlatformScaleGateStatus) {
  if (status === "ready") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "blocked_evidence") return "border-rose-200 bg-rose-50 text-rose-900";
  if (status === "needs_dispatch") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-slate-200 bg-slate-50 text-slate-800";
}

function scaleFollowupClass(status: GatePlatformScaleFollowupStatus) {
  if (status === "tracked") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "needs_effect") return "border-amber-200 bg-amber-50 text-amber-900";
  if (status === "missing_evidence") return "border-rose-200 bg-rose-50 text-rose-900";
  return "border-slate-200 bg-slate-50 text-slate-800";
}

function scaleCadenceClass(status: GatePlatformScaleCadenceStatus) {
  if (status === "ready") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "cooldown") return "border-blue-200 bg-blue-50 text-blue-900";
  if (status === "over_limit") return "border-rose-200 bg-rose-50 text-rose-900";
  if (status === "needs_followup") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-slate-200 bg-slate-50 text-slate-800";
}

function retreatClass(status: GatePlatformRetreatStatus) {
  if (status === "pause") return "border-rose-300 bg-rose-50 text-rose-900";
  if (status === "pivot_platform") return "border-orange-200 bg-orange-50 text-orange-900";
  if (status === "repair_tactic") return "border-amber-200 bg-amber-50 text-amber-900";
  if (status === "healthy") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  return "border-slate-200 bg-slate-50 text-slate-800";
}

function retreatResolutionClass(status: GatePlatformRetreatResolutionStatus) {
  if (status === "missing_evidence") return "border-rose-200 bg-rose-50 text-rose-900";
  if (status === "needs_effect") return "border-amber-200 bg-amber-50 text-amber-900";
  if (status === "resolved") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  return "border-slate-200 bg-slate-50 text-slate-800";
}

function decisionTimelineClass(status: GatePlatformDecisionTimelineStatus) {
  if (status === "blocked") return "border-rose-200 bg-rose-50 text-rose-900";
  if (status === "needs_effect") return "border-amber-200 bg-amber-50 text-amber-900";
  if (status === "rechecking") return "border-blue-200 bg-blue-50 text-blue-900";
  if (status === "recovering") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  return "border-slate-200 bg-slate-50 text-slate-800";
}

function decisionEventClass(type: GatePlatformDecisionTimelineEventType) {
  if (type === "final") return "bg-violet-50 text-violet-700";
  if (type === "retreat") return "bg-rose-50 text-rose-700";
  if (type === "repair") return "bg-amber-50 text-amber-700";
  if (type === "recheck") return "bg-blue-50 text-blue-700";
  if (type === "effect") return "bg-emerald-50 text-emerald-700";
  return "bg-slate-100 text-slate-700";
}

function decisionTimelineStatusLabel(status: GatePlatformDecisionTimelineStatus | "all") {
  if (status === "blocked") return "撤退阻塞";
  if (status === "needs_effect") return "待复测";
  if (status === "rechecking") return "重验中";
  if (status === "recovering") return "恢复中";
  if (status === "healthy") return "健康";
  return "全部状态";
}

function decisionEventLabel(type: GatePlatformDecisionTimelineEventType | "all") {
  if (type === "final") return "最终判定";
  if (type === "effect") return "效果回填";
  if (type === "retreat") return "撤退判断";
  if (type === "repair") return "修复记录";
  if (type === "recheck") return "重验记录";
  if (type === "dispatch") return "派单回执";
  return "全部事件";
}

function tacticExperienceClass(status: GatePlatformTacticExperienceStatus) {
  if (status === "blocked") return "border-rose-200 bg-rose-50 text-rose-900";
  if (status === "watch") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-emerald-200 bg-emerald-50 text-emerald-900";
}

function tacticExperienceStatusLabel(status: GatePlatformTacticExperienceStatus) {
  if (status === "blocked") return "避坑样本";
  if (status === "watch") return "观察样本";
  return "可复用";
}

function tacticExperienceFilterLabel(status: GatePlatformTacticExperienceStatusFilter) {
  if (status === "blocked") return "避坑";
  if (status === "watch") return "观察";
  if (status === "usable") return "可复用";
  return "全部";
}

function batchTacticEffectLabel(status: GateBatchTacticEffectStatus) {
  if (status === "blocked") return "避坑";
  if (status === "watch") return "观察";
  return "可复用";
}

function batchTacticScaleDecisionClass(tone: "allow" | "watch" | "block") {
  if (tone === "allow") return "border-emerald-200 bg-white/70 text-emerald-900";
  if (tone === "watch") return "border-amber-200 bg-white/70 text-amber-900";
  return "border-rose-200 bg-white/70 text-rose-900";
}

const gateDispatchReceiptAcceptanceCriteria = [
  "执行角色",
  "输入",
  "输出",
  "人工验收",
  "下一步",
];

export function GateActionWorkspace({
  actions,
  failureRepairBatch,
  gateReturnHref,
}: {
  actions: PrePublishGateAction[];
  failureRepairBatch: FailureRepairBatch;
  gateReturnHref?: string | null;
}) {
  const router = useRouter();
  const [receipts, setReceipts] = useState<GateActionReceipt[]>([]);
  const [statusFilter, setStatusFilter] = useState<GateActionReceiptStatusFilter>("all");
  const [executionFilter, setExecutionFilter] = useState<GateActionReceiptExecutionFilter>("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [timelineStatusFilter, setTimelineStatusFilter] = useState<GatePlatformDecisionTimelineStatus | "all">("all");
  const [timelineEventFilter, setTimelineEventFilter] = useState<GatePlatformDecisionTimelineEventType | "all">("all");
  const [tacticExperienceFilter, setTacticExperienceFilter] = useState<GatePlatformTacticExperienceStatusFilter>("all");
  const [timelineExportMessage, setTimelineExportMessage] = useState("");
  const [persistedDispatchTasks, setPersistedDispatchTasks] = useState<PersistedGatePlatformDispatchTask[]>([]);
  const [knowledgeFeedbackReceipts, setKnowledgeFeedbackReceipts] = useState<GateKnowledgeFeedbackReceipt[]>([]);
  const [platformEvidenceLoops, setPlatformEvidenceLoops] = useState<GatePlatformEvidenceLoop[]>([]);
  const filteredReceipts = filterGateActionReceipts(receipts, {
    status: statusFilter,
    executionType: executionFilter,
    platformId: platformFilter,
  });
  const summary = buildGateActionReceiptSummary(receipts);
  const filteredSummary = buildGateActionReceiptSummary(filteredReceipts);
  const failureRepairReview = buildGateFailureRepairReceiptReview(failureRepairBatch, receipts);
  const failureRepairResolution = buildGateFailureRepairRecheckResolution(failureRepairBatch, persistedDispatchTasks);
  const failureRepairThirdRound = buildGateFailureRepairThirdRoundResolution(failureRepairBatch, persistedDispatchTasks);
  const reviewAdvice = buildGateActionReviewAdvice(filteredReceipts);
  const platformGrowthReview = buildGatePlatformGrowthReview(receipts);
  const allStartValidationReview = buildGateProjectStartValidationReview(persistedDispatchTasks);
  const allStartMetricDecision = buildGateProjectStartMetricDecision(persistedDispatchTasks, receipts);
  const allSecondMetricDecision = buildGateProjectSecondMetricDecision(persistedDispatchTasks, receipts);
  const platformDispatchItems = [
    ...buildGateFailureRepairRecheckDispatchItems(failureRepairReview, failureRepairBatch, persistedDispatchTasks),
    ...buildGateFailureRepairThirdRoundDispatchItems(failureRepairResolution, failureRepairBatch, persistedDispatchTasks),
    ...buildGateProjectStartValidationDispatchItems(receipts, persistedDispatchTasks),
    ...buildGateProjectStartNextDispatchItems(allStartValidationReview, persistedDispatchTasks),
    ...buildGateProjectStartMetricDispatchItems(allStartMetricDecision, persistedDispatchTasks),
    ...buildGateProjectStartMetricFollowupDispatchItems(persistedDispatchTasks, persistedDispatchTasks),
    ...buildGateProjectSecondMetricDispatchItems(allSecondMetricDecision, persistedDispatchTasks),
    ...buildGateProjectSecondMetricFollowupDispatchItems(persistedDispatchTasks, persistedDispatchTasks),
    ...buildGatePlatformEvidenceLoopDispatchItems(platformEvidenceLoops, 5, persistedDispatchTasks),
    ...buildGateKnowledgeFeedbackDispatchItems(knowledgeFeedbackReceipts, 4, persistedDispatchTasks),
    ...buildGatePlatformGrowthDispatchItems(receipts, 6, persistedDispatchTasks),
  ]
    .sort((a, b) => b.priorityScore - a.priorityScore || a.title.localeCompare(b.title))
    .slice(0, 9);
  const visibleDispatchTasks = platformFilter === "all"
    ? persistedDispatchTasks
    : persistedDispatchTasks.filter((task) => task.platformId === platformFilter);
  const dispatchEvidenceReview = buildGateDispatchEvidenceReview(visibleDispatchTasks, receipts);
  const dispatchEvidenceIssues = dispatchEvidenceReview.items.filter((item) => item.status !== "verified").slice(0, 4);
  const startValidationReview = buildGateProjectStartValidationReview(visibleDispatchTasks);
  const startValidationPlans = startValidationReview.plans.slice(0, 4);
  const startMetricDecision = buildGateProjectStartMetricDecision(visibleDispatchTasks, receipts);
  const startMetricDecisionItems = startMetricDecision.items.slice(0, 4);
  const secondMetricDecision = buildGateProjectSecondMetricDecision(visibleDispatchTasks, receipts);
  const secondMetricDecisionItems = secondMetricDecision.items.slice(0, 4);
  const thirdMetricDecision = buildGateProjectThirdMetricDecision(visibleDispatchTasks, receipts);
  const thirdMetricDecisionItems = thirdMetricDecision.items.slice(0, 4);
  const scaleFollowup = buildGatePlatformScaleFollowup(visibleDispatchTasks, receipts);
  const scaleFollowupIssues = scaleFollowup.items.filter((item) => item.status !== "tracked").slice(0, 4);
  const scaleCadence = buildGatePlatformScaleCadence(platformGrowthReview, visibleDispatchTasks, scaleFollowup);
  const scaleCadenceIssues = scaleCadence.items.filter((item) => item.status !== "ready" && item.status !== "not_candidate").slice(0, 4);
  const retreatGate = buildGatePlatformRetreatGate(receipts, platformGrowthReview);
  const retreatVisibleItems = retreatGate.items
    .filter((item) => platformFilter === "all" || item.platformId === platformFilter)
    .slice(0, 4);
  const retreatDispatchItems = buildGatePlatformRetreatDispatchItems(retreatGate, visibleDispatchTasks);
  const retreatResolution = buildGatePlatformRetreatResolution(visibleDispatchTasks, receipts);
  const retreatResolutionIssues = retreatResolution.items.filter((item) => item.status !== "resolved").slice(0, 4);
  const scaleGate = buildGatePlatformScaleGate(platformGrowthReview, dispatchEvidenceReview, scaleFollowup, scaleCadence, retreatGate, retreatResolution);
  const scaleGateVisibleItems = scaleGate.items.filter((item) => item.status !== "not_candidate").slice(0, 4);
  const retreatRecheckDispatchItems = buildGatePlatformRetreatRecheckDispatchItems(scaleGate, retreatResolution, visibleDispatchTasks);
  const decisionTimeline = buildGatePlatformDecisionTimeline({
    receipts,
    tasks: visibleDispatchTasks,
    retreatGate,
    retreatResolution,
    scaleFollowup,
  });
  const filteredDecisionTimelineItems = filterGatePlatformDecisionTimelineItems(decisionTimeline.items, {
    status: timelineStatusFilter,
    eventType: timelineEventFilter,
  });
  const tacticExperienceLibrary = buildGatePlatformTacticExperienceLibrary(decisionTimeline);
  const visibleTacticExperienceItems = filterGatePlatformTacticExperienceItems(tacticExperienceLibrary.items, tacticExperienceFilter);
  const batchTacticEffectReview = buildGateBatchTacticEffectReview(receipts);
  const latestReceipt = filteredReceipts[0] ?? null;
  const latestRecommendedBatchReceipt = receipts.find((receipt) => receipt.executionType === "recommended_batch") ?? null;
  const recommendedBatchFocus = buildGateRecommendedBatchReceiptFocus(latestRecommendedBatchReceipt);

  useEffect(() => {
    const localReceipts = loadGateActionReceipts();
    setReceipts(localReceipts);

    void fetchPersistedGateActionReceipts()
      .then((persisted) => {
        const merged = mergeGateActionReceipts(persisted, loadGateActionReceipts());
        setReceipts(saveGateActionReceipts(merged));
      })
      .catch(() => undefined);
    void fetchPersistedGateDispatchTasks()
      .then(setPersistedDispatchTasks)
      .catch(() => undefined);
    void fetchGateKnowledgeFeedbackReceipts({ limit: 20 })
      .then(setKnowledgeFeedbackReceipts)
      .catch(() => undefined);
    void fetchGatePlatformEvidenceLoops({ limit: 20 })
      .then(setPlatformEvidenceLoops)
      .catch(() => undefined);

    function handleReceiptUpdate(event: Event) {
      const customEvent = event as CustomEvent<GateActionReceipt[]>;
      setReceipts(customEvent.detail ?? loadGateActionReceipts());
    }

    window.addEventListener(gateActionReceiptUpdatedEvent, handleReceiptUpdate);
    return () => window.removeEventListener(gateActionReceiptUpdatedEvent, handleReceiptUpdate);
  }, []);

  function addReceipt(receipt: GateActionReceipt) {
    setReceipts((current) => saveGateActionReceipts([receipt, ...current]));
    void persistGateActionReceipt(receipt).catch(() => undefined);
  }

  function clearReceipts() {
    clearGateActionReceipts();
    setReceipts([]);
    void clearPersistedGateActionReceipts().catch(() => undefined);
  }

  function recordAdviceAction(advice: GateActionReviewAdvice) {
    addReceipt(buildGateAdviceActionReceipt({ advice }));
  }

  function assignDispatch(dispatch: GatePlatformGrowthDispatchItem) {
    const receipt = buildGatePlatformDispatchReceipt({ dispatch });
    addReceipt(receipt);
    void persistGateDispatchTask({ ...dispatch, state: "assigned" }, receipt)
      .then((task) => setPersistedDispatchTasks((current) => [task, ...current.filter((item) => item.dispatchKey !== task.dispatchKey)]))
      .catch(() => undefined);
  }

  function focusPlatform(platformId: string) {
    setPlatformFilter(platformId);
    setExecutionFilter("all");
    setStatusFilter("all");
  }

  async function copyDecisionSummary(item: GatePlatformDecisionTimelineItem) {
    const markdown = buildGatePlatformDecisionSummaryMarkdown(item);
    await navigator.clipboard.writeText(markdown);
    setTimelineExportMessage(`${item.platformName} 复盘摘要已复制。`);
  }

  function downloadDecisionSummary(item: GatePlatformDecisionTimelineItem) {
    const markdown = buildGatePlatformDecisionSummaryMarkdown(item);
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${item.platformName}-平台决策复盘.md`;
    link.click();
    URL.revokeObjectURL(url);
    setTimelineExportMessage(`${item.platformName} 复盘摘要已下载。`);
  }

  async function copyTacticExperience(item: GatePlatformTacticExperienceItem) {
    const markdown = buildGatePlatformTacticExperienceMarkdown(item);
    await navigator.clipboard.writeText(markdown);
    setTimelineExportMessage(`${item.platformName} 打法经验已复制。`);
  }

  function downloadTacticExperience(item: GatePlatformTacticExperienceItem) {
    const markdown = buildGatePlatformTacticExperienceMarkdown(item);
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${item.platformName}-平台打法经验.md`;
    link.click();
    URL.revokeObjectURL(url);
    setTimelineExportMessage(`${item.platformName} 打法经验已下载。`);
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        {actions.map((action, index) => (
          <GatePriorityActionCard action={action} gateReturnHref={gateReturnHref} index={index} key={action.id} onReceipt={addReceipt} />
        ))}
        {actions.length === 0 ? (
          <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">暂无需要处理的动作。</p>
        ) : null}
      </div>

      {recommendedBatchFocus.visible ? (
        <div className={`rounded-md border p-3 text-sm ${recommendedBatchFocusClass(recommendedBatchFocus.tone)}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="font-medium">{recommendedBatchFocus.headline}</div>
              <p className="mt-1 leading-6 opacity-85">{recommendedBatchFocus.detail}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs opacity-85">
                {recommendedBatchFocus.badges.map((badge) => (
                  <span className="rounded-md bg-white/70 px-2 py-1" key={badge}>{badge}</span>
                ))}
              </div>
            </div>
            <Link
              className="w-fit shrink-0 rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-950"
              href={hrefWithGateReturn(recommendedBatchFocus.primaryHref, gateReturnHref)}
            >
              {recommendedBatchFocus.primaryLabel}
            </Link>
          </div>
        </div>
      ) : null}

      <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-medium text-slate-950">总闸门审计历史</div>
            <p className="mt-1 text-xs text-slate-500">按平台、动作和结果复盘最近的处理闭环。</p>
          </div>
          {receipts.length ? (
            <button
              className="w-fit rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              onClick={clearReceipts}
              type="button"
            >
              清空
            </button>
          ) : null}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <div className="rounded-md border border-slate-200 bg-white p-3">
            <div className="text-xs text-slate-500">当前记录</div>
            <div className="mt-1 text-lg font-semibold text-slate-950">{filteredSummary.total}</div>
          </div>
          <div className="rounded-md border border-emerald-100 bg-white p-3">
            <div className="text-xs text-slate-500">成功回执</div>
            <div className="mt-1 text-lg font-semibold text-emerald-700">{filteredSummary.succeeded}</div>
          </div>
          <div className="rounded-md border border-rose-100 bg-white p-3">
            <div className="text-xs text-slate-500">失败回执</div>
            <div className="mt-1 text-lg font-semibold text-rose-700">{filteredSummary.failed}</div>
          </div>
          <div className="rounded-md border border-amber-100 bg-white p-3">
            <div className="text-xs text-slate-500">待处理动作</div>
            <div className="mt-1 text-lg font-semibold text-amber-700">{filteredSummary.failedActions}</div>
          </div>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <label className="grid gap-1 text-xs font-medium text-slate-600">
            平台
            <select
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800"
              onChange={(event) => setPlatformFilter(event.target.value)}
              value={platformFilter}
            >
              <option value="all">全部平台 · {summary.total}</option>
              {summary.platforms.map((platform) => (
                <option key={platform.id} value={platform.id}>
                  {platform.name} · {platform.total}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-600">
            动作类型
            <select
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800"
              onChange={(event) => setExecutionFilter(event.target.value as GateActionReceiptExecutionFilter)}
              value={executionFilter}
            >
              <option value="all">全部动作 · {summary.total}</option>
              {summary.executionTypes.map((item) => (
                <option key={item.type} value={item.type}>
                  {executionLabel(item.type)} · {item.total}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-600">
            结果
            <select
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800"
              onChange={(event) => setStatusFilter(event.target.value as GateActionReceiptStatusFilter)}
              value={statusFilter}
            >
              <option value="all">全部结果 · {summary.total}</option>
              <option value="succeeded">成功 · {summary.succeeded}</option>
              <option value="failed">失败 · {summary.failed}</option>
            </select>
          </label>
        </div>
        <div className="mt-3 grid gap-2">
          <div className={`rounded-md border p-3 ${failureRepairReviewClass(failureRepairReview.status)}`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-sm font-medium">{failureRepairReview.label}</div>
                <p className="mt-1 text-xs leading-5 opacity-85">{failureRepairReview.detail}</p>
              </div>
              <Link
                className="w-fit rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-950"
                href={hrefWithGateReturn(failureRepairReview.href, gateReturnHref)}
              >
                {failureRepairReview.actionLabel}
              </Link>
            </div>
            <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
              <div className="rounded-md bg-white/70 px-3 py-2">相关回执 {failureRepairReview.receipts}</div>
              <div className="rounded-md bg-white/70 px-3 py-2">未恢复 {failureRepairBatch.summary.unresolvedFailures}</div>
              <div className="rounded-md bg-white/70 px-3 py-2">可重试 {failureRepairBatch.summary.retryableFailures}</div>
            </div>
            {failureRepairReview.evidence.length ? (
              <div className="mt-2 grid gap-1 text-xs opacity-80">
                {failureRepairReview.evidence.map((item) => <div key={item}>{item}</div>)}
              </div>
            ) : null}
          </div>
          <div className={`rounded-md border p-3 ${failureRepairResolutionClass(failureRepairResolution.status)}`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-sm font-medium">{failureRepairResolution.label}</div>
                <p className="mt-1 text-xs leading-5 opacity-85">{failureRepairResolution.detail}</p>
              </div>
              <Link
                className="w-fit rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-950"
                href={hrefWithGateReturn(failureRepairResolution.href, gateReturnHref)}
              >
                {failureRepairResolution.actionLabel}
              </Link>
            </div>
            <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
              <div className="rounded-md bg-white/70 px-3 py-2">复检完成 {failureRepairResolution.completedRechecks}</div>
              <div className="rounded-md bg-white/70 px-3 py-2">未恢复 {failureRepairResolution.unresolvedFailures}</div>
              <div className="rounded-md bg-white/70 px-3 py-2">
                {failureRepairResolution.latestDispatchKey ? "已关联复检派单" : "暂无复检派单"}
              </div>
            </div>
            {failureRepairResolution.evidence.length ? (
              <div className="mt-2 grid gap-1 text-xs opacity-80">
                {failureRepairResolution.evidence.map((item) => <div key={item}>{item}</div>)}
              </div>
            ) : null}
          </div>
          <div className={`rounded-md border p-3 ${failureRepairThirdRoundClass(failureRepairThirdRound.status)}`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-sm font-medium">{failureRepairThirdRound.label}</div>
                <p className="mt-1 text-xs leading-5 opacity-85">{failureRepairThirdRound.detail}</p>
              </div>
              <Link
                className="w-fit rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-950"
                href={hrefWithGateReturn(failureRepairThirdRound.href, gateReturnHref)}
              >
                {failureRepairThirdRound.actionLabel}
              </Link>
            </div>
            <div className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
              <div className="rounded-md bg-white/70 px-3 py-2">第三轮完成 {failureRepairThirdRound.completedItems}/{failureRepairThirdRound.totalItems}</div>
              <div className="rounded-md bg-white/70 px-3 py-2">未恢复 {failureRepairThirdRound.unresolvedFailures}</div>
              <div className="rounded-md bg-white/70 px-3 py-2">{failureRepairThirdRound.routeLesson.title}</div>
              <div className="rounded-md bg-white/70 px-3 py-2">
                {failureRepairThirdRound.routeLesson.status === "usable" ? "可复用" : failureRepairThirdRound.routeLesson.status === "blocked" ? "待验证" : "未生成"}
              </div>
            </div>
            <p className="mt-2 rounded-md bg-white/70 p-2 text-xs leading-5 opacity-85">
              {failureRepairThirdRound.routeLesson.rule}
            </p>
            {failureRepairThirdRound.evidence.length ? (
              <div className="mt-2 grid gap-1 text-xs opacity-80">
                {failureRepairThirdRound.evidence.map((item) => <div key={item}>{item}</div>)}
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">派单证据总控</div>
              <p className="mt-1 text-xs text-slate-500">把派单中心的完成证据反哺到总闸门，区分真闭环和纸面完成。</p>
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">派单回执验收口径</span>
                {gateDispatchReceiptAcceptanceCriteria.map((criterion) => (
                  <span className="rounded-md bg-white px-2 py-1 text-xs text-slate-600" key={criterion}>
                    {criterion}
                  </span>
                ))}
              </div>
            </div>
            <Link
              className="w-fit rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              href={hrefWithGateReturn("/dispatch", gateReturnHref)}
            >
              打开派单中心
            </Link>
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            <div className="rounded-md border border-emerald-100 bg-white p-3">
              <div className="text-xs text-slate-500">真闭环</div>
              <div className="mt-1 text-lg font-semibold text-emerald-700">{dispatchEvidenceReview.summary.verified}</div>
            </div>
            <div className="rounded-md border border-amber-100 bg-white p-3">
              <div className="text-xs text-slate-500">待业务回执</div>
              <div className="mt-1 text-lg font-semibold text-amber-700">{dispatchEvidenceReview.summary.needsReceipt}</div>
            </div>
            <div className="rounded-md border border-rose-100 bg-white p-3">
              <div className="text-xs text-slate-500">缺依据</div>
              <div className="mt-1 text-lg font-semibold text-rose-700">{dispatchEvidenceReview.summary.missingEvidence}</div>
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-3">
              <div className="text-xs text-slate-500">未完成</div>
              <div className="mt-1 text-lg font-semibold text-slate-700">{dispatchEvidenceReview.summary.active}</div>
            </div>
          </div>
          {dispatchEvidenceReview.nextActions.length ? (
            <div className="grid gap-2 xl:grid-cols-2">
              {dispatchEvidenceReview.nextActions.map((action) => (
                <div className="rounded-md bg-white p-3 text-sm leading-6 text-slate-600" key={action}>{action}</div>
              ))}
            </div>
          ) : null}
          {dispatchEvidenceIssues.length ? (
            <div className="grid gap-2 xl:grid-cols-2">
              {dispatchEvidenceIssues.map((item) => (
                <div className={`rounded-md border p-3 text-sm ${evidenceStateClass(item.status)}`} key={item.dispatchKey}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{item.title}</span>
                        <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-medium">{item.label}</span>
                      </div>
                      <p className="mt-2 leading-6 opacity-85">{item.detail}</p>
                    </div>
                    <div className="text-right text-xs opacity-75">
                      <div>{item.platformName}</div>
                      <div className="mt-1">{item.ownerRole}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link
                      className="rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-950"
                      href={hrefWithGateReturn(item.href, gateReturnHref)}
                    >
                      {item.actionLabel}
                    </Link>
                    {item.status === "needs_receipt" ? (
                      <button
                        className="rounded-md border border-white/70 bg-white/70 px-3 py-2 text-xs font-medium text-slate-950"
                        onClick={() => {
                          setPlatformFilter(item.platformId);
                          router.refresh();
                        }}
                        type="button"
                      >
                        只看该平台
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : visibleDispatchTasks.length ? (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              当前派单证据链闭合，可以把注意力放到下一轮平台增长动作。
            </p>
          ) : (
            <p className="rounded-md border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-600">
              暂无派单任务。先让平台增长复盘榜生成任务，再进入证据验收。
            </p>
          )}
        </div>
        <div className="mt-3 grid gap-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">开书首轮验证台</div>
              <p className="mt-1 text-xs text-slate-500">只盯前三章审稿、开头钩子、平台包装三件套，没收齐就不放行下一轮。</p>
            </div>
            <Link
              className="w-fit rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              href={hrefWithGateReturn("/dispatch", gateReturnHref)}
            >
              去收验证任务
            </Link>
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            <div className="rounded-md border border-slate-200 bg-white p-3">
              <div className="text-xs text-slate-500">验证计划</div>
              <div className="mt-1 text-lg font-semibold text-slate-950">{startValidationReview.summary.totalPlans}</div>
            </div>
            <div className="rounded-md border border-emerald-100 bg-white p-3">
              <div className="text-xs text-slate-500">已收齐</div>
              <div className="mt-1 text-lg font-semibold text-emerald-700">{startValidationReview.summary.readyPlans}</div>
            </div>
            <div className="rounded-md border border-rose-100 bg-white p-3">
              <div className="text-xs text-slate-500">缺依据</div>
              <div className="mt-1 text-lg font-semibold text-rose-700">{startValidationReview.summary.missingEvidenceItems}</div>
            </div>
            <div className="rounded-md border border-amber-100 bg-white p-3">
              <div className="text-xs text-slate-500">未收口</div>
              <div className="mt-1 text-lg font-semibold text-amber-700">{startValidationReview.summary.activeItems}</div>
            </div>
          </div>
          {startValidationReview.nextActions.length ? (
            <div className="grid gap-2 xl:grid-cols-2">
              {startValidationReview.nextActions.map((action) => (
                <div className="rounded-md bg-white p-3 text-sm leading-6 text-slate-600" key={action}>{action}</div>
              ))}
            </div>
          ) : null}
          {startValidationPlans.length ? (
            <div className="grid gap-2 xl:grid-cols-2">
              {startValidationPlans.map((plan) => (
                <div className={`rounded-md border p-3 text-sm ${startValidationClass(plan.status)}`} key={plan.key}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{plan.platformName} 首轮验证</span>
                        <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-medium">{plan.label}</span>
                      </div>
                      <p className="mt-2 leading-6 opacity-85">{plan.nextAction}</p>
                    </div>
                    <div className="text-right text-xs opacity-75">
                      <div>{plan.completedItems}/{plan.totalItems} 完成</div>
                      <div className="mt-1">{plan.projectId ?? "未绑定项目"}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs opacity-75">
                    {plan.missingStages.length ? plan.missingStages.map((stage) => (
                      <span className="rounded-md bg-white/70 px-2 py-1" key={stage}>{growthStageLabel(stage)}</span>
                    )) : (
                      <span className="rounded-md bg-white/70 px-2 py-1">三件套已收齐</span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link
                      className="rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-950"
                      href={hrefWithGateReturn(plan.status === "ready" ? plan.href : "/dispatch", gateReturnHref)}
                    >
                      {plan.status === "ready" ? "打开项目" : "补齐验证"}
                    </Link>
                    <button
                      className="rounded-md border border-white/70 bg-white/70 px-3 py-2 text-xs font-medium text-slate-950"
                      onClick={() => focusPlatform(plan.platformId)}
                      type="button"
                    >
                      只看该平台
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-600">
              暂无首轮验证派单。先执行开书策略，再从平台派单台派出三张验证卡。
            </p>
          )}
        </div>
        <div className="mt-3 grid gap-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">首轮数据决策台</div>
              <p className="mt-1 text-xs text-slate-500">首轮数据回来后，先判断修包装、重写开头、继续加码，别凭感觉扩大投入。</p>
            </div>
            <Link
              className="w-fit rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              href={hrefWithGateReturn("/dispatch", gateReturnHref)}
            >
              查看数据回收
            </Link>
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            <div className="rounded-md border border-emerald-100 bg-white p-3">
              <div className="text-xs text-slate-500">可加码</div>
              <div className="mt-1 text-lg font-semibold text-emerald-700">{startMetricDecision.summary.scale}</div>
            </div>
            <div className="rounded-md border border-rose-100 bg-white p-3">
              <div className="text-xs text-slate-500">修包装</div>
              <div className="mt-1 text-lg font-semibold text-rose-700">{startMetricDecision.summary.repairPackaging}</div>
            </div>
            <div className="rounded-md border border-orange-100 bg-white p-3">
              <div className="text-xs text-slate-500">重写开头</div>
              <div className="mt-1 text-lg font-semibold text-orange-700">{startMetricDecision.summary.rewriteOpening}</div>
            </div>
            <div className="rounded-md border border-amber-100 bg-white p-3">
              <div className="text-xs text-slate-500">等数据</div>
              <div className="mt-1 text-lg font-semibold text-amber-700">{startMetricDecision.summary.waitMetric}</div>
            </div>
          </div>
          {startMetricDecision.nextActions.length ? (
            <div className="grid gap-2 xl:grid-cols-2">
              {startMetricDecision.nextActions.map((action) => (
                <div className="rounded-md bg-white p-3 text-sm leading-6 text-slate-600" key={action}>{action}</div>
              ))}
            </div>
          ) : null}
          {startMetricDecisionItems.length ? (
            <div className="grid gap-2 xl:grid-cols-2">
              {startMetricDecisionItems.map((item) => (
                <div className={`rounded-md border p-3 text-sm ${startMetricDecisionClass(item.status)}`} key={item.dispatchKey}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{item.platformName} 首轮决策</span>
                        <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-medium">{item.label}</span>
                      </div>
                      <p className="mt-2 leading-6 opacity-85">{item.detail}</p>
                    </div>
                    <div className="text-right text-xs opacity-75">
                      {item.metricAt ? <div>{new Date(item.metricAt).toLocaleDateString()}</div> : <div>未回填</div>}
                      <div className="mt-1">优先级 {item.priorityScore}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs opacity-75">
                    {item.evidence.map((evidence) => (
                      <span className="rounded-md bg-white/70 px-2 py-1" key={evidence}>{evidence}</span>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link
                      className="rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-950"
                      href={hrefWithGateReturn(item.href, gateReturnHref)}
                    >
                      {item.actionLabel}
                    </Link>
                    <button
                      className="rounded-md border border-white/70 bg-white/70 px-3 py-2 text-xs font-medium text-slate-950"
                      onClick={() => focusPlatform(item.platformId)}
                      type="button"
                    >
                      只看该平台
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-600">
              暂无首轮数据决策。先完成“首轮数据回收”派单，并回填发布效果数据。
            </p>
          )}
        </div>
        <div className="mt-3 grid gap-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">二轮数据决策台</div>
              <p className="mt-1 text-xs text-slate-500">加码后二轮数据回来后，决定继续小步加码、修打法、换平台或暂停。</p>
            </div>
            <Link
              className="w-fit rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              href={hrefWithGateReturn("/dispatch", gateReturnHref)}
            >
              查看二轮回收
            </Link>
          </div>
          <div className="grid gap-2 sm:grid-cols-5">
            <div className="rounded-md border border-emerald-100 bg-white p-3">
              <div className="text-xs text-slate-500">继续加码</div>
              <div className="mt-1 text-lg font-semibold text-emerald-700">{secondMetricDecision.summary.continueScale}</div>
            </div>
            <div className="rounded-md border border-amber-100 bg-white p-3">
              <div className="text-xs text-slate-500">修打法</div>
              <div className="mt-1 text-lg font-semibold text-amber-700">{secondMetricDecision.summary.repairTactic}</div>
            </div>
            <div className="rounded-md border border-orange-100 bg-white p-3">
              <div className="text-xs text-slate-500">换平台/打法</div>
              <div className="mt-1 text-lg font-semibold text-orange-700">{secondMetricDecision.summary.pivotPlatform}</div>
            </div>
            <div className="rounded-md border border-rose-100 bg-white p-3">
              <div className="text-xs text-slate-500">暂停</div>
              <div className="mt-1 text-lg font-semibold text-rose-700">{secondMetricDecision.summary.pause}</div>
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-3">
              <div className="text-xs text-slate-500">等数据</div>
              <div className="mt-1 text-lg font-semibold text-slate-700">{secondMetricDecision.summary.waitMetric}</div>
            </div>
          </div>
          {secondMetricDecision.nextActions.length ? (
            <div className="grid gap-2 xl:grid-cols-2">
              {secondMetricDecision.nextActions.map((action) => (
                <div className="rounded-md bg-white p-3 text-sm leading-6 text-slate-600" key={action}>{action}</div>
              ))}
            </div>
          ) : null}
          {secondMetricDecisionItems.length ? (
            <div className="grid gap-2 xl:grid-cols-2">
              {secondMetricDecisionItems.map((item) => (
                <div className={`rounded-md border p-3 text-sm ${secondMetricDecisionClass(item.status)}`} key={item.dispatchKey}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{item.platformName} 二轮决策</span>
                        <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-medium">{item.label}</span>
                      </div>
                      <p className="mt-2 leading-6 opacity-85">{item.detail}</p>
                    </div>
                    <div className="text-right text-xs opacity-75">
                      {item.metricAt ? <div>{new Date(item.metricAt).toLocaleDateString()}</div> : <div>未回填</div>}
                      <div className="mt-1">优先级 {item.priorityScore}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs opacity-75">
                    {item.evidence.map((evidence) => (
                      <span className="rounded-md bg-white/70 px-2 py-1" key={evidence}>{evidence}</span>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link
                      className="rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-950"
                      href={hrefWithGateReturn(item.href, gateReturnHref)}
                    >
                      {item.actionLabel}
                    </Link>
                    <button
                      className="rounded-md border border-white/70 bg-white/70 px-3 py-2 text-xs font-medium text-slate-950"
                      onClick={() => focusPlatform(item.platformId)}
                      type="button"
                    >
                      只看该平台
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-600">
              暂无二轮数据决策。先完成“加码后二轮数据回收”派单，并回填对应效果。
            </p>
          )}
        </div>
        <div className="mt-3 grid gap-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">第三轮最终判定台</div>
              <p className="mt-1 text-xs text-slate-500">第三轮数据回来后，收口为稳定加码、降档修复、换平台或归档暂停。</p>
            </div>
            <Link
              className="w-fit rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              href={hrefWithGateReturn("/dispatch", gateReturnHref)}
            >
              查看第三轮回收
            </Link>
          </div>
          <div className="grid gap-2 sm:grid-cols-5">
            <div className="rounded-md border border-emerald-100 bg-white p-3">
              <div className="text-xs text-slate-500">稳定加码</div>
              <div className="mt-1 text-lg font-semibold text-emerald-700">{thirdMetricDecision.summary.stableScale}</div>
            </div>
            <div className="rounded-md border border-amber-100 bg-white p-3">
              <div className="text-xs text-slate-500">降档修复</div>
              <div className="mt-1 text-lg font-semibold text-amber-700">{thirdMetricDecision.summary.downgradeRepair}</div>
            </div>
            <div className="rounded-md border border-orange-100 bg-white p-3">
              <div className="text-xs text-slate-500">换平台</div>
              <div className="mt-1 text-lg font-semibold text-orange-700">{thirdMetricDecision.summary.pivotPlatform}</div>
            </div>
            <div className="rounded-md border border-rose-100 bg-white p-3">
              <div className="text-xs text-slate-500">归档暂停</div>
              <div className="mt-1 text-lg font-semibold text-rose-700">{thirdMetricDecision.summary.archivePause}</div>
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-3">
              <div className="text-xs text-slate-500">等数据</div>
              <div className="mt-1 text-lg font-semibold text-slate-700">{thirdMetricDecision.summary.waitMetric}</div>
            </div>
          </div>
          {thirdMetricDecision.nextActions.length ? (
            <div className="grid gap-2 xl:grid-cols-2">
              {thirdMetricDecision.nextActions.map((action) => (
                <div className="rounded-md bg-white p-3 text-sm leading-6 text-slate-600" key={action}>{action}</div>
              ))}
            </div>
          ) : null}
          {thirdMetricDecisionItems.length ? (
            <div className="grid gap-2 xl:grid-cols-2">
              {thirdMetricDecisionItems.map((item) => (
                <div className={`rounded-md border p-3 text-sm ${thirdMetricDecisionClass(item.status)}`} key={item.dispatchKey}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{item.platformName} 最终判定</span>
                        <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-medium">{item.label}</span>
                      </div>
                      <p className="mt-2 leading-6 opacity-85">{item.detail}</p>
                    </div>
                    <div className="text-right text-xs opacity-75">
                      {item.metricAt ? <div>{new Date(item.metricAt).toLocaleDateString()}</div> : <div>未回填</div>}
                      <div className="mt-1">优先级 {item.priorityScore}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs opacity-75">
                    {item.evidence.map((evidence) => (
                      <span className="rounded-md bg-white/70 px-2 py-1" key={evidence}>{evidence}</span>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link
                      className="rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-950"
                      href={hrefWithGateReturn(item.href, gateReturnHref)}
                    >
                      {item.actionLabel}
                    </Link>
                    <button
                      className="rounded-md border border-white/70 bg-white/70 px-3 py-2 text-xs font-medium text-slate-950"
                      onClick={() => focusPlatform(item.platformId)}
                      type="button"
                    >
                      只看该平台
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-600">
              暂无第三轮最终判定。先完成“第三轮数据回收”派单，并回填对应效果。
            </p>
          )}
        </div>
        <div className="mt-3 grid gap-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">加码后效果追踪</div>
              <p className="mt-1 text-xs text-slate-500">每次小步加码后必须回填下一轮效果对照，否则暂停第二次加码。</p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            <div className="rounded-md border border-emerald-100 bg-white p-3">
              <div className="text-xs text-slate-500">已回填对照</div>
              <div className="mt-1 text-lg font-semibold text-emerald-700">{scaleFollowup.summary.tracked}</div>
            </div>
            <div className="rounded-md border border-amber-100 bg-white p-3">
              <div className="text-xs text-slate-500">待效果对照</div>
              <div className="mt-1 text-lg font-semibold text-amber-700">{scaleFollowup.summary.needsEffect}</div>
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-3">
              <div className="text-xs text-slate-500">加码未完成</div>
              <div className="mt-1 text-lg font-semibold text-slate-700">{scaleFollowup.summary.needsCompletion}</div>
            </div>
            <div className="rounded-md border border-rose-100 bg-white p-3">
              <div className="text-xs text-slate-500">缺加码依据</div>
              <div className="mt-1 text-lg font-semibold text-rose-700">{scaleFollowup.summary.missingEvidence}</div>
            </div>
          </div>
          {scaleFollowup.nextActions.length ? (
            <div className="grid gap-2 xl:grid-cols-2">
              {scaleFollowup.nextActions.map((action) => (
                <div className="rounded-md bg-white p-3 text-sm leading-6 text-slate-600" key={action}>{action}</div>
              ))}
            </div>
          ) : null}
          {scaleFollowupIssues.length ? (
            <div className="grid gap-2 xl:grid-cols-2">
              {scaleFollowupIssues.map((item) => (
                <div className={`rounded-md border p-3 text-sm ${scaleFollowupClass(item.status)}`} key={item.dispatchKey}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{item.title}</span>
                        <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-medium">{item.label}</span>
                      </div>
                      <p className="mt-2 leading-6 opacity-85">{item.detail}</p>
                    </div>
                    <div className="text-right text-xs opacity-75">
                      <div>{item.platformName}</div>
                      <div className="mt-1">{item.ownerRole}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link
                      className="rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-950"
                      href={hrefWithGateReturn(item.href, gateReturnHref)}
                    >
                      {item.actionLabel}
                    </Link>
                    <button
                      className="rounded-md border border-white/70 bg-white/70 px-3 py-2 text-xs font-medium text-slate-950"
                      onClick={() => focusPlatform(item.platformId)}
                      type="button"
                    >
                      只看该平台
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : scaleFollowup.summary.total ? (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              当前加码派单都有后续效果对照，可以按数据判断继续加码、迭代或撤退。
            </p>
          ) : (
            <p className="rounded-md border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-600">
              暂无加码派单。只有平台通过加码决策闸后，这里才会追踪下一轮效果。
            </p>
          )}
        </div>
        <div className="mt-3 grid gap-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">连续加码节奏闸</div>
              <p className="mt-1 text-xs text-slate-500">控制加码次数、冷却期和回填周期，防止一次好数据被连续猛推。</p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            <div className="rounded-md border border-emerald-100 bg-white p-3">
              <div className="text-xs text-slate-500">节奏允许</div>
              <div className="mt-1 text-lg font-semibold text-emerald-700">{scaleCadence.summary.ready}</div>
            </div>
            <div className="rounded-md border border-blue-100 bg-white p-3">
              <div className="text-xs text-slate-500">冷却中</div>
              <div className="mt-1 text-lg font-semibold text-blue-700">{scaleCadence.summary.cooldown}</div>
            </div>
            <div className="rounded-md border border-rose-100 bg-white p-3">
              <div className="text-xs text-slate-500">窗口超限</div>
              <div className="mt-1 text-lg font-semibold text-rose-700">{scaleCadence.summary.overLimit}</div>
            </div>
            <div className="rounded-md border border-amber-100 bg-white p-3">
              <div className="text-xs text-slate-500">缺效果闭环</div>
              <div className="mt-1 text-lg font-semibold text-amber-700">{scaleCadence.summary.needsFollowup}</div>
            </div>
          </div>
          {scaleCadence.nextActions.length ? (
            <div className="grid gap-2 xl:grid-cols-2">
              {scaleCadence.nextActions.map((action) => (
                <div className="rounded-md bg-white p-3 text-sm leading-6 text-slate-600" key={action}>{action}</div>
              ))}
            </div>
          ) : null}
          {scaleCadenceIssues.length ? (
            <div className="grid gap-2 xl:grid-cols-2">
              {scaleCadenceIssues.map((item) => (
                <div className={`rounded-md border p-3 text-sm ${scaleCadenceClass(item.status)}`} key={item.platformId}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{item.platformName}</span>
                        <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-medium">{item.label}</span>
                      </div>
                      <p className="mt-2 leading-6 opacity-85">{item.detail}</p>
                    </div>
                    <div className="text-right text-xs opacity-75">
                      <div>{item.windowDays} 天窗口</div>
                      <div className="mt-1">{item.recentScaleCount} 次加码</div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link
                      className="rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-950"
                      href={hrefWithGateReturn(item.href, gateReturnHref)}
                    >
                      {item.actionLabel}
                    </Link>
                    <button
                      className="rounded-md border border-white/70 bg-white/70 px-3 py-2 text-xs font-medium text-slate-950"
                      onClick={() => focusPlatform(item.platformId)}
                      type="button"
                    >
                      只看该平台
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : scaleCadence.summary.candidates ? (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              当前加码候选没有触发连续加码限制，可以进入决策闸继续验收。
            </p>
          ) : (
            <p className="rounded-md border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-600">
              暂无加码候选，先让平台复盘榜跑出明确的效果链路。
            </p>
          )}
        </div>
        <div className="mt-3 grid gap-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">撤退/换打法闸</div>
              <p className="mt-1 text-xs text-slate-500">连续效果变弱时，先修打法、换平台或暂停，不把坏趋势继续放大。</p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-5">
            <div className="rounded-md border border-emerald-100 bg-white p-3">
              <div className="text-xs text-slate-500">健康</div>
              <div className="mt-1 text-lg font-semibold text-emerald-700">{retreatGate.summary.healthy}</div>
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-3">
              <div className="text-xs text-slate-500">观察</div>
              <div className="mt-1 text-lg font-semibold text-slate-700">{retreatGate.summary.watch}</div>
            </div>
            <div className="rounded-md border border-amber-100 bg-white p-3">
              <div className="text-xs text-slate-500">修打法</div>
              <div className="mt-1 text-lg font-semibold text-amber-700">{retreatGate.summary.repairTactic}</div>
            </div>
            <div className="rounded-md border border-orange-100 bg-white p-3">
              <div className="text-xs text-slate-500">换平台/打法</div>
              <div className="mt-1 text-lg font-semibold text-orange-700">{retreatGate.summary.pivotPlatform}</div>
            </div>
            <div className="rounded-md border border-rose-100 bg-white p-3">
              <div className="text-xs text-slate-500">暂停</div>
              <div className="mt-1 text-lg font-semibold text-rose-700">{retreatGate.summary.pause}</div>
            </div>
          </div>
          {retreatGate.nextActions.length ? (
            <div className="grid gap-2 xl:grid-cols-2">
              {retreatGate.nextActions.map((action) => (
                <div className="rounded-md bg-white p-3 text-sm leading-6 text-slate-600" key={action}>{action}</div>
              ))}
            </div>
          ) : null}
          {retreatVisibleItems.length ? (
            <div className="grid gap-2 xl:grid-cols-2">
              {retreatVisibleItems.map((item) => (
                <div className={`rounded-md border p-3 text-sm ${retreatClass(item.status)}`} key={item.platformId}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{item.platformName}</span>
                        <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-medium">{item.label}</span>
                      </div>
                      <p className="mt-2 leading-6 opacity-85">{item.detail}</p>
                    </div>
                    <div className="text-right text-xs opacity-75">
                      <div>曝光 {item.latestViews}</div>
                      <div className="mt-1">下滑 {item.declineSignals}/5</div>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs opacity-75">
                    {item.evidence.map((evidence) => (
                      <span className="rounded-md bg-white/70 px-2 py-1" key={evidence}>{evidence}</span>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link
                      className="rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-950"
                      href={hrefWithGateReturn(item.href, gateReturnHref)}
                    >
                      {item.actionLabel}
                    </Link>
                    <button
                      className="rounded-md border border-white/70 bg-white/70 px-3 py-2 text-xs font-medium text-slate-950"
                      onClick={() => focusPlatform(item.platformId)}
                      type="button"
                    >
                      只看该平台
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-600">
              暂无可判断的效果数据。先回填至少一条平台效果。
            </p>
          )}
        </div>
        <div className="mt-3 grid gap-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">撤退修复派单台</div>
              <p className="mt-1 text-xs text-slate-500">把修打法、换平台和暂停复盘变成角色任务，进入派单中心验收。</p>
            </div>
            {retreatDispatchItems.length ? (
              <Link
                className="w-fit rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                href={hrefWithGateReturn("/dispatch", gateReturnHref)}
              >
                打开派单中心
              </Link>
            ) : null}
          </div>
          {retreatDispatchItems.length ? (
            <div className="grid gap-2 xl:grid-cols-2">
              {retreatDispatchItems.map((item) => (
                <div className="rounded-md border border-slate-200 bg-white p-3 text-sm" key={item.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-slate-950">{item.title}</span>
                        <span className={`rounded-md px-2 py-1 text-xs font-medium ${dispatchStateClass(item.state)}`}>{dispatchStateLabel(item.state)}</span>
                      </div>
                      <p className="mt-2 leading-6 text-slate-600">{item.detail}</p>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <div>{item.ownerRole}</div>
                      <div className="mt-1">{item.dueLabel}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                    {item.acceptanceCriteria.map((criterion) => (
                      <span className="rounded-md bg-slate-50 px-2 py-1" key={criterion}>{criterion}</span>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={item.state !== "queued"}
                      onClick={() => assignDispatch(item)}
                      type="button"
                    >
                      {item.state === "queued" ? item.actionLabel : dispatchStateLabel(item.state)}
                    </button>
                    {item.state === "assigned" ? (
                      <Link
                        className="rounded-md border border-emerald-200 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                        href={hrefWithGateReturn("/dispatch", gateReturnHref)}
                      >
                        去派单中心收口
                      </Link>
                    ) : null}
                    <Link
                      className="rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                      href={hrefWithGateReturn(item.href, gateReturnHref)}
                    >
                      打开处理入口
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-600">
              暂无撤退修复派单。只有触发修打法、换平台或暂停时才会出现。
            </p>
          )}
        </div>
        <div className="mt-3 grid gap-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">撤退修复验收</div>
              <p className="mt-1 text-xs text-slate-500">修复方案完成后，还要等一轮效果复测，才解除撤退拦截。</p>
            </div>
            {retreatResolution.summary.total ? (
              <div className="w-fit rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                已复测 {retreatResolution.summary.resolved}/{retreatResolution.summary.total}
              </div>
            ) : null}
          </div>
          {retreatResolution.nextActions.length ? (
            <div className="grid gap-2 xl:grid-cols-2">
              {retreatResolution.nextActions.map((action) => (
                <div className="rounded-md bg-white p-3 text-sm leading-6 text-slate-600" key={action}>{action}</div>
              ))}
            </div>
          ) : null}
          {retreatResolutionIssues.length ? (
            <div className="grid gap-2 xl:grid-cols-2">
              {retreatResolutionIssues.map((item) => (
                <div className={`rounded-md border p-3 text-sm ${retreatResolutionClass(item.status)}`} key={item.dispatchKey}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{item.title}</span>
                        <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-medium">{item.label}</span>
                      </div>
                      <p className="mt-2 leading-6 opacity-85">{item.detail}</p>
                    </div>
                    <div className="text-right text-xs opacity-75">
                      <div>{item.ownerRole}</div>
                      <div className="mt-1">优先级 {item.priorityScore}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs opacity-75">
                    {item.evidence.slice(0, 3).map((evidence) => (
                      <span className="rounded-md bg-white/70 px-2 py-1" key={evidence}>{evidence}</span>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link
                      className="rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-950"
                      href={hrefWithGateReturn(item.href, gateReturnHref)}
                    >
                      {item.actionLabel}
                    </Link>
                    <button
                      className="rounded-md border border-white/70 bg-white/70 px-3 py-2 text-xs font-medium text-slate-950"
                      onClick={() => focusPlatform(item.platformId)}
                      type="button"
                    >
                      只看该平台
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : retreatResolution.summary.total ? (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              当前撤退修复都有后续效果复测，总闸可以重新按新数据判断平台去留。
            </p>
          ) : (
            <p className="rounded-md border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-600">
              暂无撤退修复验收项。先从上方派单台派出并完成修复任务。
            </p>
          )}
        </div>
        <div className="mt-3 grid gap-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">平台加码决策闸</div>
              <p className="mt-1 text-xs text-slate-500">平台复盘说可加码只是候选，必须通过派单证据验收才允许扩量。</p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            <div className="rounded-md border border-emerald-100 bg-white p-3">
              <div className="text-xs text-slate-500">允许加码</div>
              <div className="mt-1 text-lg font-semibold text-emerald-700">{scaleGate.summary.ready}</div>
            </div>
            <div className="rounded-md border border-rose-100 bg-white p-3">
              <div className="text-xs text-slate-500">证据拦截</div>
              <div className="mt-1 text-lg font-semibold text-rose-700">{scaleGate.summary.blockedEvidence}</div>
            </div>
            <div className="rounded-md border border-amber-100 bg-white p-3">
              <div className="text-xs text-slate-500">缺派单验收</div>
              <div className="mt-1 text-lg font-semibold text-amber-700">{scaleGate.summary.needsDispatch}</div>
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-3">
              <div className="text-xs text-slate-500">加码候选</div>
              <div className="mt-1 text-lg font-semibold text-slate-700">{scaleGate.summary.candidates}</div>
            </div>
          </div>
          {scaleGate.nextActions.length ? (
            <div className="grid gap-2 xl:grid-cols-2">
              {scaleGate.nextActions.map((action) => (
                <div className="rounded-md bg-white p-3 text-sm leading-6 text-slate-600" key={action}>{action}</div>
              ))}
            </div>
          ) : null}
          {scaleGateVisibleItems.length ? (
            <div className="grid gap-2 xl:grid-cols-2">
              {scaleGateVisibleItems.map((item) => (
                <div className={`rounded-md border p-3 text-sm ${scaleGateClass(item.status)}`} key={item.platformId}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{item.platformName}</span>
                        <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold">{item.decisionLabel}</span>
                        <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-medium">{item.label}</span>
                      </div>
                      <p className="mt-2 leading-6 opacity-85">{item.detail}</p>
                    </div>
                    <div className="text-right text-xs opacity-75">
                      <div>优先级</div>
                      <div className="mt-1 text-base font-semibold">{item.priorityScore}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs opacity-75">
                    {item.evidence.slice(0, 4).map((evidence) => (
                      <span className="rounded-md bg-white/70 px-2 py-1" key={evidence}>{evidence}</span>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link
                      className="rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-950"
                      href={hrefWithGateReturn(item.href, gateReturnHref)}
                    >
                      {item.actionLabel}
                    </Link>
                    {item.status !== "ready" ? (
                      <button
                        className="rounded-md border border-white/70 bg-white/70 px-3 py-2 text-xs font-medium text-slate-950"
                        onClick={() => focusPlatform(item.platformId)}
                        type="button"
                      >
                        只看该平台
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : platformGrowthReview.length ? (
            <p className="rounded-md border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-600">
              当前没有加码候选。先把平台复盘榜里的救火、采纳资产和效果回填做完。
            </p>
          ) : (
            <p className="rounded-md border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-600">
              还没有平台复盘结果。先执行总闸门动作，生成真实业务回执。
            </p>
          )}
        </div>
        {retreatRecheckDispatchItems.length ? (
          <div className="mt-3 grid gap-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs font-medium text-slate-500">修复后重验派单</div>
                <p className="mt-1 text-xs text-slate-500">复测数据转好后，重新派一张小步加码任务，按新打法重新验收。</p>
              </div>
              <Link
                className="w-fit rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                href={hrefWithGateReturn("/dispatch", gateReturnHref)}
              >
                打开派单中心
              </Link>
            </div>
            <div className="grid gap-2 xl:grid-cols-2">
              {retreatRecheckDispatchItems.map((item) => (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900" key={item.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{item.title}</span>
                        <span className={`rounded-md px-2 py-1 text-xs font-medium ${dispatchStateClass(item.state)}`}>{dispatchStateLabel(item.state)}</span>
                      </div>
                      <p className="mt-2 leading-6 opacity-85">{item.detail}</p>
                    </div>
                    <div className="text-right text-xs opacity-75">
                      <div>{item.ownerRole}</div>
                      <div className="mt-1">{item.dueLabel}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs opacity-75">
                    {item.acceptanceCriteria.map((criterion) => (
                      <span className="rounded-md bg-white/70 px-2 py-1" key={criterion}>{criterion}</span>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      className="rounded-md border border-white/70 bg-white px-3 py-2 text-xs font-medium text-slate-950 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={item.state !== "queued"}
                      onClick={() => assignDispatch(item)}
                      type="button"
                    >
                      {item.state === "queued" ? item.actionLabel : dispatchStateLabel(item.state)}
                    </button>
                    {item.state === "assigned" ? (
                      <Link
                        className="rounded-md border border-white/70 bg-white/80 px-3 py-2 text-xs font-medium text-emerald-800 hover:bg-white"
                        href={hrefWithGateReturn("/dispatch", gateReturnHref)}
                      >
                        去派单中心收口
                      </Link>
                    ) : null}
                    <Link
                      className="rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                      href={hrefWithGateReturn(item.href, gateReturnHref)}
                    >
                      打开处理入口
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div className="mt-3 grid gap-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">平台决策时间线</div>
              <p className="mt-1 text-xs text-slate-500">把撤退、修复、复测、重验和效果回填串起来，看清平台为什么恢复或继续撤退。</p>
            </div>
            {decisionTimeline.summary.total ? (
              <div className="w-fit rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                {filteredDecisionTimelineItems.length}/{decisionTimeline.summary.total} 个平台
              </div>
            ) : null}
          </div>
          {decisionTimeline.items.length ? (
            <div className="grid gap-2 md:grid-cols-2">
              <label className="grid gap-1 text-xs font-medium text-slate-600">
                状态
                <select
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                  onChange={(event) => setTimelineStatusFilter(event.target.value as GatePlatformDecisionTimelineStatus | "all")}
                  value={timelineStatusFilter}
                >
                  {(["all", "blocked", "needs_effect", "rechecking", "recovering", "healthy"] as const).map((status) => (
                    <option key={status} value={status}>{decisionTimelineStatusLabel(status)}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-medium text-slate-600">
                事件
                <select
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                  onChange={(event) => setTimelineEventFilter(event.target.value as GatePlatformDecisionTimelineEventType | "all")}
                  value={timelineEventFilter}
                >
                  {(["all", "final", "retreat", "repair", "recheck", "effect", "dispatch"] as const).map((eventType) => (
                    <option key={eventType} value={eventType}>{decisionEventLabel(eventType)}</option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
          {timelineExportMessage ? (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{timelineExportMessage}</p>
          ) : null}
          {decisionTimeline.nextActions.length ? (
            <div className="grid gap-2 xl:grid-cols-2">
              {decisionTimeline.nextActions.map((action) => (
                <div className="rounded-md bg-white p-3 text-sm leading-6 text-slate-600" key={action}>{action}</div>
              ))}
            </div>
          ) : null}
          {filteredDecisionTimelineItems.length ? (
            <div className="grid gap-2 xl:grid-cols-2">
              {filteredDecisionTimelineItems.map((item) => (
                <div className={`rounded-md border p-3 text-sm ${decisionTimelineClass(item.status)}`} key={item.platformId}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{item.platformName}</span>
                        <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-medium">{item.label}</span>
                      </div>
                      <p className="mt-2 leading-6 opacity-85">{item.detail}</p>
                    </div>
                    <Link
                      className="w-fit rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-950"
                      href={hrefWithGateReturn(item.href, gateReturnHref)}
                    >
                      {item.actionLabel}
                    </Link>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {item.events.slice(0, 4).map((event) => (
                      <Link className="rounded-md border border-white/70 bg-white/70 p-3 hover:bg-white" href={hrefWithGateReturn(event.href, gateReturnHref)} key={event.id}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-md px-2 py-1 text-xs font-medium ${decisionEventClass(event.type)}`}>{event.label}</span>
                          <span className="text-xs opacity-70">{new Date(event.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="mt-2 leading-6 opacity-85">{event.detail}</p>
                      </Link>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      className="rounded-md border border-white/70 bg-white px-3 py-2 text-xs font-medium text-slate-950 hover:bg-white/80"
                      onClick={() => void copyDecisionSummary(item)}
                      type="button"
                    >
                      复制复盘摘要
                    </button>
                    <button
                      className="rounded-md border border-white/70 bg-white/70 px-3 py-2 text-xs font-medium text-slate-950 hover:bg-white"
                      onClick={() => downloadDecisionSummary(item)}
                      type="button"
                    >
                      下载复盘摘要
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : decisionTimeline.items.length ? (
            <p className="rounded-md border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-600">
              当前筛选下没有平台决策链。
            </p>
          ) : (
            <p className="rounded-md border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-600">
              暂无平台决策链。先产生平台效果回执或派单任务。
            </p>
          )}
        </div>
        <div className="mt-3 grid gap-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">批量打法效果复盘</div>
              <p className="mt-1 text-xs text-slate-500">把推荐批次里的首轮打法和成功率、质量分、成本放在一起，判断可复用、观察或避坑。</p>
            </div>
            {batchTacticEffectReview.summary.total ? (
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-800">
                  可复用 {batchTacticEffectReview.summary.usable}
                </span>
                <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-amber-800">
                  观察 {batchTacticEffectReview.summary.watch}
                </span>
                <span className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-rose-800">
                  避坑 {batchTacticEffectReview.summary.blocked}
                </span>
              </div>
            ) : null}
          </div>
          {batchTacticEffectReview.nextActions.length ? (
            <div className="grid gap-2 xl:grid-cols-3">
              {batchTacticEffectReview.nextActions.map((action) => (
                <div className="rounded-md bg-white p-3 text-sm leading-6 text-slate-600" key={action}>{action}</div>
              ))}
            </div>
          ) : null}
          {batchTacticEffectReview.items.length ? (
            <div className="grid gap-2 xl:grid-cols-3">
              {batchTacticEffectReview.items.map((item) => (
                <div className={`rounded-md border p-3 text-sm ${tacticExperienceClass(item.status)}`} key={item.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{item.tacticLabel}</span>
                    <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-medium">{batchTacticEffectLabel(item.status)}</span>
                    <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${batchTacticScaleDecisionClass(item.scaleDecisionTone)}`}>{item.scaleDecisionLabel}</span>
                  </div>
                  <p className="mt-2 rounded-md bg-white/70 p-2 text-xs leading-5 opacity-85">{item.scaleDecisionDetail}</p>
                  <div className="mt-3 rounded-md bg-white/70 p-3">
                    <div className="text-xs font-medium opacity-70">开头动作</div>
                    <p className="mt-1 font-medium leading-6">{item.openingMove || item.primaryTactic}</p>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md bg-white/70 p-2">批次 {item.sampleBatches}</div>
                    <div className="rounded-md bg-white/70 p-2">成功率 {item.successRatePercent}%</div>
                    <div className="rounded-md bg-white/70 p-2">质量 {item.averageQualityScore ?? "缺"}</div>
                    <div className="rounded-md bg-white/70 p-2">成本 ${item.knownCostUsd.toFixed(4)}</div>
                  </div>
                  <p className="mt-3 leading-6 opacity-85">{item.nextAction}</p>
                  {item.evidence.length ? (
                    <div className="mt-3 grid gap-1">
                      {item.evidence.slice(0, 2).map((evidence) => (
                        <p className="rounded-md border border-white/70 bg-white/60 p-2 text-xs leading-5 opacity-80" key={evidence}>{evidence}</p>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-600">
              暂无批量打法样本。先从总闸或任务中心执行带首轮打法的推荐批次。
            </p>
          )}
        </div>
        <div className="mt-3 grid gap-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">平台打法经验库</div>
              <p className="mt-1 text-xs text-slate-500">把时间线里的真实证据沉淀成可复用打法、观察样本和避坑样本。</p>
            </div>
            {tacticExperienceLibrary.summary.total ? (
              <div className="flex flex-wrap gap-2 text-xs">
                {[
                  { status: "all" as const, label: "全部", value: tacticExperienceLibrary.summary.total, className: "border-slate-200 bg-white text-slate-700" },
                  { status: "usable" as const, label: "可复用", value: tacticExperienceLibrary.summary.usable, className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
                  { status: "watch" as const, label: "观察", value: tacticExperienceLibrary.summary.watch, className: "border-amber-200 bg-amber-50 text-amber-800" },
                  { status: "blocked" as const, label: "避坑", value: tacticExperienceLibrary.summary.blocked, className: "border-rose-200 bg-rose-50 text-rose-800" },
                ].map((item) => (
                  <button
                    className={`rounded-md border px-2 py-1 ${item.className} ${tacticExperienceFilter === item.status ? "ring-2 ring-slate-950" : "hover:ring-1 hover:ring-slate-300"}`}
                    key={item.status}
                    onClick={() => setTacticExperienceFilter(item.status)}
                    type="button"
                  >
                    {item.label} {item.value}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          {tacticExperienceLibrary.summary.total ? (
            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
              <span className="rounded-md bg-white px-2 py-1">当前筛选：{tacticExperienceFilterLabel(tacticExperienceFilter)}</span>
              <span className="rounded-md bg-white px-2 py-1">显示 {visibleTacticExperienceItems.length} 条</span>
            </div>
          ) : null}
          {tacticExperienceLibrary.nextActions.length ? (
            <div className="grid gap-2 xl:grid-cols-3">
              {tacticExperienceLibrary.nextActions.map((action) => (
                <div className="rounded-md bg-white p-3 text-sm leading-6 text-slate-600" key={action}>{action}</div>
              ))}
            </div>
          ) : null}
          {visibleTacticExperienceItems.length ? (
            <div className="grid gap-2 xl:grid-cols-3">
              {visibleTacticExperienceItems.map((item) => (
                <div className={`rounded-md border p-3 text-sm ${tacticExperienceClass(item.status)}`} key={item.platformId}>
                  {(() => {
                    const display = buildGatePlatformTacticExperienceDisplay(item);
                    const followupDispatch = buildGatePlatformTacticExperienceFollowupDispatch(item, persistedDispatchTasks);
                    return (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{item.platformName}</span>
                          <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-medium">{tacticExperienceStatusLabel(item.status)}</span>
                          {display.badges.map((badge) => (
                            <span className="rounded-md bg-white/80 px-2 py-1 text-xs font-medium" key={badge}>{badge}</span>
                          ))}
                        </div>
                        <div className="mt-3 rounded-md bg-white/70 p-3">
                          <div className="text-xs font-medium opacity-70">打法</div>
                          <p className="mt-1 font-medium leading-6">{item.tactic}</p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            <span className="rounded-md bg-white/80 px-2 py-1 font-medium">{display.outcomeLabel}</span>
                            <span className="rounded-md bg-white/80 px-2 py-1 font-medium">下一步：{display.nextStepLabel}</span>
                          </div>
                        </div>
                        <p className="mt-3 leading-6 opacity-85">{item.lesson}</p>
                        <div className="mt-3 grid gap-2">
                          <div className="rounded-md bg-white/70 p-3">
                            <div className="text-xs font-medium opacity-70">复用方式</div>
                            <p className="mt-1 leading-6">{item.reuseHint}</p>
                          </div>
                          <div className="rounded-md bg-white/70 p-3">
                            <div className="text-xs font-medium opacity-70">风险提醒</div>
                            <p className="mt-1 leading-6">{item.risk}</p>
                          </div>
                        </div>
                        {item.evidence.length ? (
                          <div className="mt-3 grid gap-1">
                            {item.evidence.slice(0, 2).map((evidence) => (
                              <p className="rounded-md border border-white/70 bg-white/60 p-2 text-xs leading-5 opacity-80" key={evidence}>{evidence}</p>
                            ))}
                          </div>
                        ) : null}
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button
                            className="rounded-md border border-white/70 bg-white px-3 py-2 text-xs font-medium text-slate-950 hover:bg-white/80"
                            onClick={() => focusPlatform(item.platformId)}
                            type="button"
                          >
                            只看该平台
                          </button>
                          {item.status === "usable" ? (
                            <Link className="rounded-md border border-white/70 bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800" href={hrefWithGateReturn(buildGatePlatformTacticExperienceStartHref(item), gateReturnHref)}>
                              用此打法开项目
                            </Link>
                          ) : null}
                          {followupDispatch ? (
                            <button
                              className="rounded-md border border-white/70 bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={followupDispatch.state !== "queued"}
                              onClick={() => assignDispatch(followupDispatch)}
                              type="button"
                            >
                              {followupDispatch.state === "queued" ? followupDispatch.actionLabel : dispatchStateLabel(followupDispatch.state)}
                            </button>
                          ) : null}
                          <button
                            className="rounded-md border border-white/70 bg-white/70 px-3 py-2 text-xs font-medium text-slate-950 hover:bg-white"
                            onClick={() => void copyTacticExperience(item)}
                            type="button"
                          >
                            复制经验
                          </button>
                          <button
                            className="rounded-md border border-white/70 bg-white/70 px-3 py-2 text-xs font-medium text-slate-950 hover:bg-white"
                            onClick={() => downloadTacticExperience(item)}
                            type="button"
                          >
                            下载经验
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-600">
              {tacticExperienceLibrary.items.length
                ? `当前没有${tacticExperienceFilterLabel(tacticExperienceFilter)}经验，切换筛选查看其他样本。`
                : "暂无可沉淀的平台打法经验。先完成平台决策链。"}
            </p>
          )}
        </div>
        <div className="mt-3 grid gap-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">平台增长复盘榜</div>
              <p className="mt-1 text-xs text-slate-500">按最近回执判断每个平台下一步该救火、补证据还是加码。</p>
            </div>
          </div>
          {platformGrowthReview.length ? (
            <div className="grid gap-2 xl:grid-cols-2">
              {platformGrowthReview.map((item, index) => (
                <div className="rounded-md border border-slate-200 bg-white p-3 text-sm" key={item.platformId}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-slate-400">#{index + 1}</span>
                        <span className="font-medium text-slate-950">{item.platformName}</span>
                        <span className={`rounded-md px-2 py-1 text-xs font-medium ${growthStageClass(item.stage)}`}>
                          {item.stageLabel}
                        </span>
                      </div>
                      <p className="mt-2 leading-6 text-slate-600">{item.nextAction}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500">优先级</div>
                      <div className="text-lg font-semibold text-slate-950">{item.priorityScore}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                    {item.evidence.map((evidence) => (
                      <span className="rounded-md bg-slate-50 px-2 py-1" key={evidence}>{evidence}</span>
                    ))}
                    <span className="rounded-md bg-slate-50 px-2 py-1">失败率 {item.failureRatePercent}%</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      onClick={() => focusPlatform(item.platformId)}
                      type="button"
                    >
                      只看该平台
                    </button>
                    <Link
                      className="rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                      href={hrefWithGateReturn(item.href, gateReturnHref)}
                    >
                      处理下一步
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-600">
              还没有平台级回执。先执行上方平台策略动作，复盘榜会自动排序。
            </p>
          )}
        </div>
        <div className="mt-3 grid gap-2">
          <div>
            <div className="text-xs font-medium text-slate-500">平台派单台</div>
            <p className="mt-1 text-xs text-slate-500">把复盘榜翻译成角色任务、截止节奏和验收标准。</p>
          </div>
          {platformDispatchItems.length ? (
            <div className="grid gap-2 xl:grid-cols-2">
              {platformDispatchItems.map((item) => (
                <div className="rounded-md border border-slate-200 bg-white p-3 text-sm" key={item.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-slate-950">{item.title}</span>
                        <span className={`rounded-md px-2 py-1 text-xs font-medium ${dispatchStateClass(item.state)}`}>{dispatchStateLabel(item.state)}</span>
                      </div>
                      <p className="mt-2 leading-6 text-slate-600">{item.detail}</p>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <div>{item.ownerRole}</div>
                      <div className="mt-1">{item.dueLabel}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                    {item.acceptanceCriteria.map((criterion) => (
                      <span className="rounded-md bg-slate-50 px-2 py-1" key={criterion}>{criterion}</span>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={item.state !== "queued"}
                      onClick={() => assignDispatch(item)}
                      type="button"
                    >
                      {item.state === "queued" ? item.actionLabel : dispatchStateLabel(item.state)}
                    </button>
                    {item.state === "assigned" ? (
                      <Link
                        className="rounded-md border border-emerald-200 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                        href={hrefWithGateReturn("/dispatch", gateReturnHref)}
                      >
                        去派单中心收口
                      </Link>
                    ) : null}
                    <Link
                      className="rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                      href={hrefWithGateReturn(item.href, gateReturnHref)}
                    >
                      打开处理入口
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-600">
              还没有可派单的平台任务。先执行平台策略动作，派单台会跟着复盘榜出现。
            </p>
          )}
        </div>
        <div className="mt-3 grid gap-2">
          <div className="text-xs font-medium text-slate-500">毒舌复盘建议</div>
          {reviewAdvice.map((item) => (
            <div className={`rounded-md border p-3 text-sm ${adviceClass(item.severity)}`} key={item.id}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-white/75 px-2 py-1 text-xs font-medium">{adviceLabel(item.severity)}</span>
                    <span className="rounded-md bg-white/60 px-2 py-1 text-xs font-medium">{adviceStateLabel(item.state)}</span>
                    <span className="text-xs opacity-75">{item.platformName}</span>
                  </div>
                  <div className="mt-2 font-medium">{item.headline}</div>
                  <p className="mt-1 leading-6 opacity-85">{item.detail}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs opacity-75">
                    {item.evidence.map((evidence) => (
                      <span className="rounded-md bg-white/70 px-2 py-1" key={evidence}>{evidence}</span>
                    ))}
                  </div>
                </div>
                {item.action.kind === "refresh_gate" ? (
                  <button
                    className="w-fit shrink-0 rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-950"
                    onClick={() => {
                      recordAdviceAction(item);
                      router.refresh();
                    }}
                    type="button"
                    title={adviceActionTitle(item.action.kind)}
                  >
                    {item.action.label}
                  </button>
                ) : (
                  <Link
                    className="w-fit shrink-0 rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-950"
                    href={hrefWithGateReturn(item.action.href, gateReturnHref)}
                    onClick={() => recordAdviceAction(item)}
                    title={adviceActionTitle(item.action.kind)}
                  >
                    {item.action.label}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
        {latestReceipt ? (
          <div className={`mt-3 rounded-md border p-3 text-sm ${recheckClass(latestReceipt.recheck.status)}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="font-medium">{latestReceipt.recheck.label}</div>
                <p className="mt-1 leading-6 opacity-85">{latestReceipt.recheck.detail}</p>
                {latestReceipt.firstThreeAdoptionClosure ? (
                  <div className="mt-2 grid gap-1 text-xs opacity-85">
                    <div>已闭合 {latestReceipt.firstThreeAdoptionClosure.closedCount} · 仍阻塞 {latestReceipt.firstThreeAdoptionClosure.blockedCount}</div>
                    <div>下一步：{latestReceipt.firstThreeAdoptionClosure.nextAction}</div>
                  </div>
                ) : null}
              </div>
              {latestReceipt.recheck.status === "ready" ? (
                <button
                  className="w-fit shrink-0 rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-950"
                  onClick={() => router.refresh()}
                  type="button"
                >
                  {latestReceipt.recheck.actionLabel}
                </button>
              ) : (
                <Link
                  className="w-fit shrink-0 rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-950"
                  href={hrefWithGateReturn(latestReceipt.href, gateReturnHref)}
                >
                  {latestReceipt.recheck.actionLabel}
                </Link>
              )}
            </div>
          </div>
        ) : null}
        <div className="mt-3 grid gap-2">
          {filteredReceipts.map((receipt) => (
            <div className="rounded-md border border-slate-200 bg-white p-3 text-sm" key={receipt.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium text-slate-950">{receipt.label}</div>
                <span className={`rounded-md px-2 py-1 text-xs font-medium ${receiptStatusClass(receipt.status)}`}>
                  {receipt.status === "succeeded" ? "成功" : "失败"}
                </span>
              </div>
              <p className="mt-1 leading-6 text-slate-600">{receipt.message}</p>
              {receipt.firstThreeAdoptionClosure ? (
                <div className="mt-3 rounded-md border border-indigo-200 bg-indigo-50 p-3 text-xs leading-5 text-indigo-950">
                  <div className="font-medium">采纳闭环摘要</div>
                  <div className="mt-1">{receipt.firstThreeAdoptionClosure.headline}</div>
                  <div className="mt-1">下一步：{receipt.firstThreeAdoptionClosure.nextAction}</div>
                  {receipt.firstThreeAdoptionClosure.closed.length ? (
                    <div className="mt-1 text-emerald-700">
                      已闭合：{receipt.firstThreeAdoptionClosure.closed.slice(0, 3).map((item) => item.title).join("、")}
                      {receipt.firstThreeAdoptionClosure.closed.length > 3 ? ` 等 ${receipt.firstThreeAdoptionClosure.closed.length} 项` : ""}
                    </div>
                  ) : null}
                  {receipt.firstThreeAdoptionClosure.blocked.length ? (
                    <div className="mt-1 text-rose-700">
                      仍需处理：{receipt.firstThreeAdoptionClosure.blocked.slice(0, 3).map((item) => item.title).join("、")}
                      {receipt.firstThreeAdoptionClosure.blocked.length > 3 ? ` 等 ${receipt.firstThreeAdoptionClosure.blocked.length} 项` : ""}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {receipt.startTactics?.length ? (
                <div className="mt-3 grid gap-2 lg:grid-cols-2">
                  {receipt.startTactics.slice(0, 2).map((tactic) => (
                    <div className="rounded-md bg-emerald-50 p-3 text-xs text-emerald-900" key={tactic.title}>
                      <div className="font-medium">本批打法依据 · {tactic.label}</div>
                      <div className="mt-1">{tactic.primaryTactic}</div>
                      {tactic.openingMove ? <div className="mt-1">开头：{tactic.openingMove}</div> : null}
                      {tactic.verificationMove ? <div className="mt-1">验证：{tactic.verificationMove}</div> : null}
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>{receiptExecutionLabel(receipt)}</span>
                <span>{new Date(receipt.createdAt).toLocaleString()}</span>
                {receipt.succeededCount + receipt.failedCount > 0 ? (
                  <span>成功 {receipt.succeededCount} · 失败 {receipt.failedCount}</span>
                ) : null}
                {receipt.taskId ? <span>任务 {receipt.taskId}</span> : null}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`rounded-md border px-2 py-1 text-xs font-medium ${recheckClass(receipt.recheck.status)}`}>
                  {receipt.recheck.label}
                </span>
                <Link className="inline-flex text-xs font-medium text-slate-700 hover:underline" href={hrefWithGateReturn(receipt.href, gateReturnHref)}>
                  打开相关位置
                </Link>
                <Link className="inline-flex text-xs font-medium text-slate-700 hover:underline" href={gateReturnHref ?? "/gate"}>
                  {receipt.recheck.actionLabel}
                </Link>
              </div>
            </div>
          ))}
          {receipts.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-600">
              还没有执行记录。点击上方可执行动作后，这里会留下结果。
            </p>
          ) : filteredReceipts.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-600">
              当前筛选下没有记录。
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
