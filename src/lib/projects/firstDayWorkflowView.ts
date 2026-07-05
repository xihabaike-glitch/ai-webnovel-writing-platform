import type { FirstDayExecutionReceipt, FirstDayRiskLevel, FirstDayWorkflowStep } from "./firstDayWorkflow.ts";
import { updatePersistedGateDispatchTaskState, type PersistedGatePlatformDispatchTask } from "./gateActionReceipts.ts";

const ACCEPTANCE_MARKER = "任务中心已验收：";
const MIN_COMPLETION_EVIDENCE_LENGTH = 8;
const BLOCKED_COMPLETION_KEYWORDS = ["恢复条件", "入口卖点", "前三章兑现", "平台匹配度", "改掉", "重做", "修复"];
const WATCH_COMPLETION_REQUIRED_KEYWORDS = ["通过线", "不可接受", "复查证据", "放量结论"];
const HANDOFF_ACTION_KEYWORDS = ["交接动作", "首日动作", "开头", "验证", "落地"];
const HANDOFF_AVOID_KEYWORDS = ["避坑边界", "避开", "不要", "小样本", "不放量", "暂停"];
const HANDOFF_PACKAGE_KEYWORDS = ["平台回收", "回收口径", "标题", "简介", "标签", "样章", "曝光", "点击", "收藏", "追读"];

function cleanEvidence(value: string) {
  return value.trim().replace(/。{2,}$/u, "。");
}

export interface FirstDayStepView extends FirstDayWorkflowStep {
  primaryEvidence: string;
  acceptanceLabel: string;
  acceptanceEvidence: string | null;
  hasTaskAcceptance: boolean;
}

export interface FirstDayReceiptCompletionInput {
  receipt: { success: boolean; completionEvidence: string } | null;
  completionEvidence: string;
  hasDispatch: boolean;
  isCompleting: boolean;
}

export interface FirstDayReceiptCompletionAction {
  visible: boolean;
  canComplete: boolean;
  label: string;
  reason: string;
}

export interface FirstDayReceiptCompletionEvidenceInput {
  receipt: Pick<FirstDayExecutionReceipt, "success" | "summary" | "writeBackTarget" | "nextAction" | "completionEvidence"> | null;
  fallbackEvidence?: string | null;
  currentEvidence?: string | null;
}

export interface FirstDayDispatchCompletionValidationInput {
  dispatchKey: string;
  dueLabel?: string;
  title?: string;
  acceptanceCriteria?: string[];
  evidence?: string[];
  completionEvidence: string;
}

export interface FirstDayDispatchCompletionValidation {
  valid: boolean;
  level: FirstDayRiskLevel;
  error: string | null;
}

export interface FirstDayExecutionRiskNotice {
  visible: boolean;
  level: FirstDayRiskLevel;
  label: string;
  headline: string;
  detail: string;
  badges: string[];
}

export interface FirstDayExecutionSafetyBanner {
  level: "ready" | "watch" | "blocked";
  headline: string;
  detail: string;
  badges: string[];
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}

export interface FirstDayExecutionRiskNoticeInput {
  riskLevel?: FirstDayRiskLevel;
  riskLabel?: string;
  riskPriorityBoost?: number;
  riskDueLabel?: string;
  owner: FirstDayWorkflowStep["owner"];
  acceptanceCriteria: string[];
  missingEvidence: string[];
}

export interface FirstDayDispatchDeskCard {
  dispatchKey: string;
  projectId: string | null;
  stepId: string;
  stepLabel: string;
  title: string;
  detail: string;
  state: PersistedGatePlatformDispatchTask["state"];
  stateLabel: string;
  ownerRole: string;
  priorityScore: number;
  dueLabel: string;
  href: string;
  firstDayHref: string;
  actionLabel: string;
  completionTemplate: string;
  acceptanceCriteria: string[];
  evidence: string[];
  completionHint: string | null;
}

export interface FirstDayDispatchDesk {
  summary: {
    total: number;
    active: number;
    assigned: number;
    completed: number;
    dueToday: number;
  };
  nextTask: FirstDayDispatchDeskCard | null;
  cards: FirstDayDispatchDeskCard[];
  nextActions: string[];
}

export interface FirstDayHandoffGateCtaProgress {
  visible: boolean;
  label: string;
  completedCount: number;
  totalCount: number;
  progressPercent: number;
  nextAction: string;
  items: Array<{
    label: string;
    status: "done" | "active" | "locked";
  }>;
}

export interface FirstDayHandoffGateCta {
  visible: boolean;
  status: "pending" | "closed";
  headline: string;
  detail: string;
  primaryAction: "link" | "execute_current_step";
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  badges: string[];
}

export interface FirstDayDispatchUpdateSummary {
  visible: boolean;
  status: "none" | "advanced" | "risk_recovered" | "watch_cleared" | "watch_blocked" | "completed";
  title: string;
  detail: string;
  actionLabel: string;
  href: string;
  actionExecution?: FirstDayDispatchUpdateActionExecution;
  badges: string[];
}

export interface FirstDayDispatchUpdateExecutionPlan {
  executable: boolean;
  blockedReason?: string;
}

export interface FirstDayDispatchUpdateActionExecution {
  kind: "first_day_ai";
  endpoint: string;
}

export type FirstDayWorkflowMessageAction = "execute_current_step" | "complete_current_dispatch" | "open_next_step";

export interface FirstDayPostDispatchCompletionPrompt {
  message: string;
  action?: FirstDayWorkflowMessageAction;
  actionLabel?: string;
  actionHref?: string;
}

export function buildFirstDayReturnToAcceptanceHref(input: {
  href: string;
  completionEvidence?: string | null;
}) {
  const completionEvidence = cleanEvidence(input.completionEvidence ?? "");
  if (!completionEvidence) return input.href;

  const hashIndex = input.href.indexOf("#");
  const baseHref = hashIndex >= 0 ? input.href.slice(0, hashIndex) : input.href;
  const hash = hashIndex >= 0 ? input.href.slice(hashIndex) : "";
  const separator = baseHref.includes("?") ? "&" : "?";

  return `${baseHref}${separator}firstDayEvidence=${encodeURIComponent(completionEvidence)}${hash}`;
}

export interface FirstDayDispatchFocusInput {
  dispatchKey?: string | null;
  projectId?: string | null;
  stepId?: string | null;
}

export interface FirstDayDispatchFocus {
  requested: boolean;
  card: FirstDayDispatchDeskCard | null;
  matchedBy: "dispatch_key" | "project_step" | "project_active" | "project_latest" | "global_next" | "none";
  message: string;
}

export function buildFirstDayHandoffGateCta(input: {
  projectId: string;
  progress: FirstDayHandoffGateCtaProgress | null;
  nextStep: Pick<FirstDayWorkflowStep, "label" | "actionLabel" | "href">;
  canExecuteCurrentStep?: boolean;
}): FirstDayHandoffGateCta | null {
  if (!input.progress?.visible || input.progress.totalCount <= 0) return null;
  const dispatchHref = `/dispatch?firstDayProject=${input.projectId}#first-day-dispatch`;
  const closed = input.progress.completedCount >= input.progress.totalCount;
  const waitingItem = input.progress.items.find((item) => item.status === "active")
    ?? input.progress.items.find((item) => item.status !== "done");

  if (closed) {
    return {
      visible: true,
      status: "closed",
      headline: "交接闸门已闭环",
      detail: `开头、验收、平台包装三段交接已完成，当前可以继续：${input.nextStep.label}。`,
      primaryAction: input.canExecuteCurrentStep ? "execute_current_step" : "link",
      primaryLabel: input.nextStep.actionLabel || "继续当前节点",
      primaryHref: input.nextStep.href,
      secondaryLabel: "查看派单中心",
      secondaryHref: dispatchHref,
      badges: [input.progress.label, `${input.progress.completedCount}/${input.progress.totalCount}`, "可继续生产"],
    };
  }

  return {
    visible: true,
    status: "pending",
    headline: "交接闸门未闭环",
    detail: input.progress.nextAction,
    primaryAction: "link",
    primaryLabel: "去任务中心补交接",
    primaryHref: dispatchHref,
    secondaryLabel: "查看交接进度",
    secondaryHref: "#first-day-workflow",
    badges: [
      input.progress.label,
      `${input.progress.completedCount}/${input.progress.totalCount}`,
      waitingItem ? `等待：${waitingItem.label}` : "等待交接",
    ],
  };
}

export function buildFirstDayStepView(step: FirstDayWorkflowStep): FirstDayStepView {
  const markerIndex = step.evidence.indexOf(ACCEPTANCE_MARKER);
  if (markerIndex < 0) {
    return {
      ...step,
      primaryEvidence: cleanEvidence(step.evidence),
      acceptanceLabel: "任务中心验收",
      acceptanceEvidence: null,
      hasTaskAcceptance: false,
    };
  }

  const primaryEvidence = cleanEvidence(step.evidence.slice(0, markerIndex));
  const acceptanceEvidence = cleanEvidence(step.evidence.slice(markerIndex + ACCEPTANCE_MARKER.length));

  return {
    ...step,
    primaryEvidence,
    acceptanceLabel: "任务中心验收",
    acceptanceEvidence,
    hasTaskAcceptance: acceptanceEvidence.length > 0,
  };
}

export function buildFirstDayReceiptCompletionEvidence(input: FirstDayReceiptCompletionEvidenceInput): string {
  const currentEvidence = cleanEvidence(input.currentEvidence ?? "");
  if (!input.receipt?.success) return currentEvidence;

  const receiptEvidence = cleanEvidence(input.receipt.completionEvidence);
  if (receiptEvidence.length >= MIN_COMPLETION_EVIDENCE_LENGTH) return receiptEvidence;

  const fallbackEvidence = cleanEvidence(input.fallbackEvidence ?? "");
  if (fallbackEvidence.length >= MIN_COMPLETION_EVIDENCE_LENGTH) return fallbackEvidence;

  return cleanEvidence([
    input.receipt.summary,
    input.receipt.writeBackTarget && input.receipt.writeBackTarget !== "未写回" ? `写回：${input.receipt.writeBackTarget}` : "",
    input.receipt.nextAction ? `下一步：${input.receipt.nextAction}` : "",
  ].filter(Boolean).join(" "));
}

export function buildFirstDayReceiptCompletionAction(input: FirstDayReceiptCompletionInput): FirstDayReceiptCompletionAction {
  if (!input.receipt?.success) {
    return {
      visible: false,
      canComplete: false,
      label: "验收并进入下一步",
      reason: "AI 执行回执未通过，不能直接验收。",
    };
  }

  if (!input.hasDispatch) {
    return {
      visible: true,
      canComplete: false,
      label: "验收并进入下一步",
      reason: "缺少任务中心派单，请先派到任务中心。",
    };
  }

  if (input.completionEvidence.trim().length < MIN_COMPLETION_EVIDENCE_LENGTH) {
    return {
      visible: true,
      canComplete: false,
      label: "验收并进入下一步",
      reason: "验收依据至少 8 个字。",
    };
  }

  return {
    visible: true,
    canComplete: !input.isCompleting,
    label: input.isCompleting ? "验收中" : "验收并进入下一步",
    reason: input.isCompleting ? "正在完成当前派单。" : "回执可验收，点击后刷新到下一个首日节点。",
  };
}

export function buildFirstDayExecutionRiskNotice(input: FirstDayExecutionRiskNoticeInput): FirstDayExecutionRiskNotice {
  const level = input.riskLevel ?? "standard";
  const boost = input.riskPriorityBoost ?? 0;
  const dueLabel = input.riskDueLabel ?? "今天收口";
  const evidenceCount = input.missingEvidence.length;
  const criteriaCount = input.acceptanceCriteria.length;

  if (level === "blocked") {
    return {
      visible: true,
      level,
      label: input.riskLabel || "避坑",
      headline: "止损验证模式",
      detail: `当前开书策略被标记为高风险，${input.owner}只验证恢复条件，不进入批量正文生成。`,
      badges: [dueLabel, `优先级 +${boost}`, `${criteriaCount} 条验收线`, `${evidenceCount} 条缺失证据`],
    };
  }

  if (level === "watch") {
    return {
      visible: true,
      level,
      label: input.riskLabel || "观察",
      headline: "小样本验证模式",
      detail: `当前开书策略还在观察期，${input.owner}先跑首轮样本和复查证据，通过后再扩大。`,
      badges: [dueLabel, `优先级 +${boost}`, `${criteriaCount} 条验收线`, `${evidenceCount} 条缺失证据`],
    };
  }

  return {
    visible: false,
    level,
    label: input.riskLabel || "标准",
    headline: "标准首日验证",
    detail: "当前开书策略按普通首日流程推进。",
    badges: [dueLabel],
  };
}

export function buildFirstDayExecutionSafetyBanner(input: {
  routeBlockMessage: string | null;
  executionBlockMessage: string | null;
  handoffGateCta: FirstDayHandoffGateCta | null;
  riskNotice: FirstDayExecutionRiskNotice | null;
  nextStepLabel: string;
  routeRepairHref?: string | null;
  gateReviewHref?: string | null;
  workflowHref?: string | null;
}): FirstDayExecutionSafetyBanner {
  const workflowHref = input.workflowHref ?? "#first-day-workflow";
  const gateReviewHref = input.gateReviewHref ?? "/gate";
  const blockMessage = input.executionBlockMessage ?? input.routeBlockMessage;
  if (blockMessage) {
    const hasRouteBlock = Boolean(input.routeBlockMessage);
    return {
      level: "blocked",
      headline: "连续执行已阻断",
      detail: blockMessage,
      badges: ["模型路线", "先修复配置"],
      primaryLabel: hasRouteBlock ? "去模型配置" : "查看阻断节点",
      primaryHref: hasRouteBlock ? input.routeRepairHref ?? "/settings/models" : workflowHref,
    };
  }

  if (input.handoffGateCta?.visible && input.handoffGateCta.status === "pending") {
    return {
      level: "blocked",
      headline: "先补交接闸门",
      detail: input.handoffGateCta.detail,
      badges: input.handoffGateCta.badges,
      primaryLabel: input.handoffGateCta.primaryLabel,
      primaryHref: input.handoffGateCta.primaryHref,
      secondaryLabel: input.handoffGateCta.secondaryLabel,
      secondaryHref: input.handoffGateCta.secondaryHref,
    };
  }

  if (input.riskNotice?.visible && input.riskNotice.level === "blocked") {
    return {
      level: "blocked",
      headline: input.riskNotice.headline,
      detail: input.riskNotice.detail,
      badges: input.riskNotice.badges,
      primaryLabel: "回总闸门复查",
      primaryHref: gateReviewHref,
    };
  }

  if (input.riskNotice?.visible && input.riskNotice.level === "watch") {
    return {
      level: "watch",
      headline: input.riskNotice.headline,
      detail: input.riskNotice.detail,
      badges: input.riskNotice.badges,
      primaryLabel: "回总闸门复查",
      primaryHref: gateReviewHref,
    };
  }

  return {
    level: "ready",
    headline: "连续执行状态正常",
    detail: `当前首日节点「${input.nextStepLabel}」可以按工作流继续推进。`,
    badges: [
      input.handoffGateCta?.status === "closed" ? "交接已闭环" : "交接无阻断",
      "模型路线可用",
      "风险标准",
    ],
    primaryLabel: "查看当前节点",
    primaryHref: workflowHref,
  };
}

function firstDayStepId(dispatchKey: string) {
  const parts = dispatchKey.split(":");
  return parts[2] ?? "";
}

function firstDayHandoffStepId(dispatchKey: string) {
  const parts = dispatchKey.split(":");
  return parts[2] ?? "";
}

function includesAnyKeyword(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword));
}

function missingKeywords(value: string, keywords: string[]) {
  return keywords.filter((keyword) => !value.includes(keyword));
}

function hasHandoffActionCriteria(input: Pick<FirstDayDispatchCompletionValidationInput, "acceptanceCriteria">) {
  return (input.acceptanceCriteria ?? []).some((criterion) => criterion.startsWith("执行开书交接动作："));
}

function hasHandoffAvoidCriteria(input: Pick<FirstDayDispatchCompletionValidationInput, "acceptanceCriteria">) {
  return (input.acceptanceCriteria ?? []).some((criterion) => criterion.startsWith("避开交接边界："));
}

function firstDayCompletionRiskLevel(input: Pick<FirstDayDispatchCompletionValidationInput, "dispatchKey" | "dueLabel" | "title" | "acceptanceCriteria" | "evidence">): FirstDayRiskLevel {
  if (!isFirstDayDispatchTask({ dispatchKey: input.dispatchKey })) return "standard";
  const joined = [
    input.dueLabel,
    input.title,
    ...(input.acceptanceCriteria ?? []),
    ...(input.evidence ?? []),
  ].filter((item): item is string => Boolean(item)).join(" ");

  if (/止损|避坑|恢复条件/u.test(joined)) return "blocked";
  if (/观察|小样本|通过线|不可接受|复查证据|放量结论/u.test(joined)) return "watch";
  return "standard";
}

export function validateFirstDayDispatchCompletionEvidence(input: FirstDayDispatchCompletionValidationInput): FirstDayDispatchCompletionValidation {
  const trimmedEvidence = input.completionEvidence.trim();
  const level = firstDayCompletionRiskLevel(input);
  if (trimmedEvidence.length < MIN_COMPLETION_EVIDENCE_LENGTH) {
    return {
      valid: false,
      level,
      error: "完成派单前，请写清楚完成依据，至少 8 个字。",
    };
  }

  if (isFirstDayHandoffDispatchTask({ dispatchKey: input.dispatchKey })) {
    const handoffStepId = firstDayHandoffStepId(input.dispatchKey);
    if (handoffStepId === "opening" && !includesAnyKeyword(trimmedEvidence, HANDOFF_ACTION_KEYWORDS)) {
      return {
        valid: false,
        level,
        error: "开头打法交接必须写清交接动作如何落到第一章首屏，例如开头、危机、选择或追读问题。",
      };
    }
    if (handoffStepId === "verification") {
      const missingVerificationKeywords = missingKeywords(trimmedEvidence, ["通过线", "不可接受", "复查证据"]);
      if (missingVerificationKeywords.length > 0) {
        return {
          valid: false,
          level: "watch",
          error: `首轮验收交接必须写清：${missingVerificationKeywords.join("、")}。`,
        };
      }
    }
    if (handoffStepId === "platform-package") {
      const hasAvoid = includesAnyKeyword(trimmedEvidence, HANDOFF_AVOID_KEYWORDS);
      const hasPackage = includesAnyKeyword(trimmedEvidence, HANDOFF_PACKAGE_KEYWORDS);
      if (!hasAvoid || !hasPackage) {
        return {
          valid: false,
          level,
          error: "平台回收交接必须同时写清避坑边界和平台回收口径，例如标题、简介、标签、样章、曝光、点击、收藏或追读。",
        };
      }
    }
  }

  if (level === "blocked" && !includesAnyKeyword(trimmedEvidence, BLOCKED_COMPLETION_KEYWORDS)) {
    return {
      valid: false,
      level,
      error: "止损验证派单必须写清恢复条件，例如入口卖点、前三章兑现或平台匹配度具体改了什么。",
    };
  }

  const missingWatchKeywords = level === "watch" ? missingKeywords(trimmedEvidence, WATCH_COMPLETION_REQUIRED_KEYWORDS) : [];
  if (missingWatchKeywords.length > 0) {
    return {
      valid: false,
      level,
      error: `小样本验证派单必须同时写清：${missingWatchKeywords.join("、")}。`,
    };
  }

  if (hasHandoffActionCriteria(input) && !includesAnyKeyword(trimmedEvidence, HANDOFF_ACTION_KEYWORDS)) {
    return {
      valid: false,
      level,
      error: "这张首日派单带有开书交接动作，完成依据必须写清交接动作或首日动作如何落地。",
    };
  }

  if (hasHandoffAvoidCriteria(input) && !includesAnyKeyword(trimmedEvidence, HANDOFF_AVOID_KEYWORDS)) {
    return {
      valid: false,
      level,
      error: "这张首日派单带有避坑边界，完成依据必须写清避开了什么、为何仍只做小样本或不放量。",
    };
  }

  return {
    valid: true,
    level,
    error: null,
  };
}

function firstDayStepLabel(stepId: string) {
  if (stepId === "skeleton") return "作品骨架";
  if (stepId === "opening-hook") return "第一章钩子";
  if (stepId === "story-support") return "人物设定支撑";
  if (stepId === "risk-recovery") return "恢复条件验证";
  if (stepId === "first-draft") return "第一章初稿";
  if (stepId === "first-review") return "第一章审稿";
  if (stepId === "first-rewrite") return "第一章二改";
  if (stepId === "publish-precheck") return "平台包预检";
  return "首日节点";
}

function stateLabel(state: PersistedGatePlatformDispatchTask["state"]) {
  if (state === "completed") return "已完成";
  if (state === "assigned") return "已派单";
  return "待派单";
}

function watchSampleCompletionCleared(completionEvidence: string) {
  return /小样本|通过线|放量结论/u.test(completionEvidence)
    && /通过线/u.test(completionEvidence)
    && /不可接受/u.test(completionEvidence)
    && /复查证据/u.test(completionEvidence)
    && /放量结论/u.test(completionEvidence)
    && /(通过|允许|可以恢复|可恢复|恢复后续)/u.test(completionEvidence)
    && !/未通过|暂不放量|继续停留观察/u.test(completionEvidence);
}

function isWatchSampleCompletion(completionEvidence: string) {
  return /小样本|通过线|不可接受|复查证据|放量结论/u.test(completionEvidence);
}

function handoffCompletionLines(acceptanceCriteria: string[]) {
  return acceptanceCriteria
    .filter((criterion) => criterion.startsWith("执行开书交接动作：") || criterion.startsWith("避开交接边界："))
    .map((criterion) => criterion
      .replace(/^执行开书交接动作：/, "交接动作已落地：")
      .replace(/^避开交接边界：/, "避坑边界已确认："));
}

function withHandoffCompletion(base: string, acceptanceCriteria: string[]) {
  const handoffLines = handoffCompletionLines(acceptanceCriteria);
  return handoffLines.length ? [base, ...handoffLines].join("\n") : base;
}

function recoverySafeLines(acceptanceCriteria: string[]) {
  const joined = acceptanceCriteria.join(" ");
  if (!/小样本|恢复放量|放量结论/u.test(joined)) return [];
  return [
    "通过线：本轮只验证一个首日变量，开头、前三章或平台包达到最低可继续标准。",
    "不可接受项：没有把任务完成误判为可复用放量，没有跳过小样本直接批量生产。",
    "复查证据：已保留章节入口、审稿口径或平台回收字段，后续可以回到任务中心复核。",
    "放量结论：通过后才允许恢复后续小步生产；未过线则继续停留观察。",
  ];
}

function firstDayHref(task: PersistedGatePlatformDispatchTask, stepId: string) {
  if (task.projectId) {
    return `/projects/${task.projectId}?firstDayLaunch=1&nextStep=${encodeURIComponent(stepId)}#first-day-workflow`;
  }
  return task.href;
}

export function isFirstDayDispatchTask(task: Pick<PersistedGatePlatformDispatchTask, "dispatchKey">) {
  return task.dispatchKey.startsWith("first-day:");
}

export function isFirstDayHandoffDispatchTask(task: Pick<PersistedGatePlatformDispatchTask, "dispatchKey">) {
  return task.dispatchKey.startsWith("first-day-handoff:");
}

export function buildFirstDayDispatchCompletionTemplate(task: Pick<PersistedGatePlatformDispatchTask, "dispatchKey" | "acceptanceCriteria"> & Partial<Pick<PersistedGatePlatformDispatchTask, "dueLabel" | "title" | "evidence">>) {
  if (isFirstDayHandoffDispatchTask(task)) {
    const handoffStepId = firstDayHandoffStepId(task.dispatchKey);
    const recoveryLines = recoverySafeLines(task.acceptanceCriteria);
    if (handoffStepId === "opening") return [
      "开头编辑交付：交接动作已落地，开头打法已拆到第一章首屏。",
      "首屏钩子：危机、选择、代价和追读问题已写清。",
      "避坑边界已确认：不直接放量，先保留首轮验证窗口。",
      ...recoveryLines,
    ].join("\n");
    if (handoffStepId === "verification") return [
      "审稿编辑交付：验证动作已落地，前三章验收口径已保存。",
      "通过线：前三章钩子、兑现、平台语气和模型路线复检标准已写清。",
      "不可接受项：慢热解释、卖点不兑现、平台风格错位或正文空转。",
      "复查证据：已保留审稿分数、改稿问题和下一轮复查入口。",
      "放量结论：通过后才允许进入后续小步生产；未过线则继续停留观察。",
    ].join("\n");
    if (handoffStepId === "platform-package") return [
      "平台运营交付：标题、简介、标签和样章已按本次开书打法整理。",
      "避坑边界已确认：不要直接放量，先做小样本。",
      "平台回收口径已写清：曝光、点击、收藏和追读。",
      ...recoveryLines,
    ].join("\n");
    return "经验开书交接已完成：交接动作、避坑边界和首轮回收口径已写清。";
  }
  if (!isFirstDayDispatchTask(task)) return "";
  const stepId = firstDayStepId(task.dispatchKey);
  const riskLevel = firstDayCompletionRiskLevel(task);
  if (stepId === "first-draft" && riskLevel === "blocked") return withHandoffCompletion(
    "止损验证已完成：恢复条件已写清，入口卖点、前三章兑现或平台匹配度已至少改掉一项，暂不批量生成正文。",
    task.acceptanceCriteria,
  );
  if (stepId === "first-draft" && riskLevel === "watch") return withHandoffCompletion([
    "小样本验证已完成：",
    "通过线：第一章钩子、冲突、爽点兑现或平台语气已达到本轮最低要求。",
    "不可接受项：未出现慢热解释、卖点不兑现、平台风格错位或正文空转。",
    "复查证据：已保留第一章正文/审稿分数/人工复核结论，可回到任务中心或章节页复查。",
    "放量结论：通过后才允许恢复后续初稿批次；未过线则继续停留观察。",
  ].join("\n"), task.acceptanceCriteria);
  if (stepId === "first-draft") return withHandoffCompletion("第一章正文已生成并写回章节，钩子、冲突和章末追读已按首轮平台打法检查，可以进入审稿。", task.acceptanceCriteria);
  if (stepId === "first-review") return withHandoffCompletion("第一章审稿已完成，钩子、爽点、冲突、解释密度和章末追读问题已列出，可以进入二改。", task.acceptanceCriteria);
  if (stepId === "first-rewrite") return withHandoffCompletion("第一章二改或前三章改写已完成，审稿问题已逐项处理，并保留版本对照。", task.acceptanceCriteria);
  if (stepId === "publish-precheck") return withHandoffCompletion("平台包预检已完成，标题、简介、标签、卖点、样章和首轮数据回收口径已整理。", task.acceptanceCriteria);
  if (stepId === "story-support") return withHandoffCompletion("人物弧光、核心设定和平台土壤已补齐，后续正文生成可以直接引用。", task.acceptanceCriteria);
  if (stepId === "risk-recovery") return withHandoffCompletion("止损恢复条件已写清：入口卖点、前三章兑现或平台匹配度已至少改掉一项，并明确只验证一个变量。", task.acceptanceCriteria);
  if (stepId === "opening-hook") return withHandoffCompletion("第一章目标、钩子、冲突、转变和章末悬念已补齐，并按目标平台开头规则检查。", task.acceptanceCriteria);
  if (stepId === "skeleton") return withHandoffCompletion("作品骨架已完成，开头、结尾、主干、分支、叶片和土壤均已落地。", task.acceptanceCriteria);
  return task.acceptanceCriteria.length ? withHandoffCompletion(`首日派单已完成：${task.acceptanceCriteria.join("；")}。`, task.acceptanceCriteria) : "";
}

export function buildFirstDayDispatchCompletionHint(task: Pick<PersistedGatePlatformDispatchTask, "dispatchKey" | "acceptanceCriteria"> & Partial<Pick<PersistedGatePlatformDispatchTask, "dueLabel" | "title" | "evidence">>) {
  if (isFirstDayHandoffDispatchTask(task)) {
    const handoffStepId = firstDayHandoffStepId(task.dispatchKey);
    if (handoffStepId === "opening") return "这条证据会被首日闸门读取，必须写清开头打法如何落到第一章首屏。";
    if (handoffStepId === "verification") return "这条证据会被首日闸门读取，必须写清首轮验收通过线、不可接受项和复查证据。";
    if (handoffStepId === "platform-package") return "这条证据会被首日闸门读取，必须写清避坑边界和平台数据回收口径。";
    return "完成后会回写到经验开书交接链路，用于判断首日闸门是否可以放行。";
  }
  if (!isFirstDayDispatchTask(task)) return null;
  const stepId = firstDayStepId(task.dispatchKey);
  const riskLevel = firstDayCompletionRiskLevel(task);
  if (stepId === "first-draft" && riskLevel === "watch") {
    return "这条完成依据会决定是否解除观察放量闸门，必须同时写清通过线、不可接受项、复查证据和放量结论。";
  }
  if (stepId === "risk-recovery") {
    return "这是恢复验证，不是正文完成；完成后只会进入恢复观察小样本。";
  }
  if (stepId === "first-draft" && riskLevel === "blocked") {
    return "当前是止损验证，不允许用正文完成替代恢复条件。";
  }
  return null;
}

function toFirstDayCard(task: PersistedGatePlatformDispatchTask): FirstDayDispatchDeskCard {
  const stepId = firstDayStepId(task.dispatchKey);
  return {
    dispatchKey: task.dispatchKey,
    projectId: task.projectId,
    stepId,
    stepLabel: firstDayStepLabel(stepId),
    title: task.title,
    detail: task.detail,
    state: task.state,
    stateLabel: stateLabel(task.state),
    ownerRole: task.ownerRole,
    priorityScore: task.priorityScore,
    dueLabel: task.dueLabel,
    href: task.href,
    firstDayHref: firstDayHref(task, stepId),
    actionLabel: task.actionLabel,
    completionTemplate: buildFirstDayDispatchCompletionTemplate(task),
    acceptanceCriteria: task.acceptanceCriteria,
    evidence: task.evidence,
    completionHint: buildFirstDayDispatchCompletionHint(task),
  };
}

export function buildFirstDayDispatchDesk(tasks: PersistedGatePlatformDispatchTask[]): FirstDayDispatchDesk {
  const cards = tasks
    .filter(isFirstDayDispatchTask)
    .map(toFirstDayCard)
    .sort((left, right) => {
      const stateWeight = { assigned: 0, queued: 1, completed: 2 } as const;
      const stateDiff = stateWeight[left.state] - stateWeight[right.state];
      if (stateDiff !== 0) return stateDiff;
      return right.priorityScore - left.priorityScore;
    });
  const active = cards.filter((card) => card.state !== "completed");
  const assigned = cards.filter((card) => card.state === "assigned").length;
  const completed = cards.filter((card) => card.state === "completed").length;
  const dueToday = active.length;
  const nextTask = active[0] ?? null;
  const hasCompletedRiskRecovery = cards.some((card) => card.stepId === "risk-recovery" && card.state === "completed");
  const isRecoveredWatchDraft = hasCompletedRiskRecovery && nextTask?.stepId === "first-draft";

  return {
    summary: {
      total: cards.length,
      active: active.length,
      assigned,
      completed,
      dueToday,
    },
    nextTask,
    cards,
    nextActions: [
      isRecoveredWatchDraft ? "止损恢复已验收，当前是恢复观察小样本；第一章通过线没过前不要批量放大。" : null,
      nextTask ? `先收口「${nextTask.stepLabel}」：${nextTask.actionLabel}。` : null,
      active.length > 1 ? `还有 ${active.length - 1} 张首日卡排队，完成当前节点后再推进下一张。` : null,
      cards.length > 0 && active.length === 0 ? "首日派单已全部完成，可以进入批量生产和平台包复盘。" : null,
    ].filter((action): action is string => Boolean(action)),
  };
}

export function resolveFirstDayDispatchFocus(
  tasks: PersistedGatePlatformDispatchTask[],
  input: FirstDayDispatchFocusInput,
): FirstDayDispatchFocus {
  const requested = Boolean(input.dispatchKey || input.projectId || input.stepId);
  const desk = buildFirstDayDispatchDesk(tasks);
  const cards = desk.cards;
  const dispatchKey = input.dispatchKey?.trim() || "";
  const projectId = input.projectId?.trim() || "";
  const stepId = input.stepId?.trim() || "";

  const exact = dispatchKey ? cards.find((card) => card.dispatchKey === dispatchKey) ?? null : null;
  if (exact) {
    return {
      requested,
      card: exact,
      matchedBy: "dispatch_key",
      message: `已定位到「${exact.stepLabel}」，先处理这张首日卡。`,
    };
  }

  const projectCards = projectId ? cards.filter((card) => card.projectId === projectId) : [];
  const projectStep = stepId ? projectCards.find((card) => card.stepId === stepId) ?? null : null;
  if (projectStep) {
    return {
      requested,
      card: projectStep,
      matchedBy: "project_step",
      message: `已定位到「${projectStep.stepLabel}」，先补这张卡的验收证据。`,
    };
  }

  const projectActive = projectCards.find((card) => card.state !== "completed") ?? null;
  if (projectActive) {
    return {
      requested,
      card: projectActive,
      matchedBy: "project_active",
      message: `目标步骤暂未排到，先收口当前首日卡「${projectActive.stepLabel}」。`,
    };
  }

  const projectLatest = projectCards[0] ?? null;
  if (projectLatest) {
    return {
      requested,
      card: projectLatest,
      matchedBy: "project_latest",
      message: `这个项目的首日卡已没有未闭环项，最近一张是「${projectLatest.stepLabel}」。`,
    };
  }

  return {
    requested,
    card: desk.nextTask,
    matchedBy: desk.nextTask ? "global_next" : "none",
    message: desk.nextTask
      ? `没有找到指定项目的首日卡，先处理全局下一张「${desk.nextTask.stepLabel}」。`
      : "没有找到首日派单卡，请先从作品首日流程生成派单。",
  };
}

export function buildFirstDayDispatchUpdateSummary(input: {
  task: Pick<PersistedGatePlatformDispatchTask, "dispatchKey" | "state" | "title" | "completionEvidence" | "href">;
  followUpTasks?: Array<Pick<PersistedGatePlatformDispatchTask, "dispatchKey" | "projectId" | "title" | "actionLabel" | "href" | "dueLabel" | "state">>;
  executionPlan?: FirstDayDispatchUpdateExecutionPlan | null;
}): FirstDayDispatchUpdateSummary {
  if (isFirstDayHandoffDispatchTask(input.task) && input.task.state === "completed") {
    const handoffStepId = firstDayHandoffStepId(input.task.dispatchKey);
    const title = handoffStepId === "opening"
      ? "开头打法交接已回写"
      : handoffStepId === "verification"
        ? "首轮验收交接已回写"
        : handoffStepId === "platform-package"
          ? "平台回收交接已回写"
          : "经验开书交接已回写";
    return {
      visible: true,
      status: "advanced",
      title,
      detail: "这条完成证据会参与首日闸门的交接闭环判断。三张经验交接卡都收口后，任务队列会解除交接证据缺失阻塞。",
      actionLabel: "回任务队列复查",
      href: "/tasks",
      badges: ["经验交接", "证据回写", "复查首日闸门"],
    };
  }

  if (!isFirstDayDispatchTask(input.task) || input.task.state !== "completed") {
    return {
      visible: false,
      status: "none",
      title: "",
      detail: "",
      actionLabel: "",
      href: "",
      badges: [],
    };
  }

  const completedStepId = firstDayStepId(input.task.dispatchKey);
  const completedStepLabel = firstDayStepLabel(completedStepId);
  const firstDayFollowUp = input.followUpTasks?.find(isFirstDayDispatchTask) ?? null;
  const followUpStepId = firstDayFollowUp ? firstDayStepId(firstDayFollowUp.dispatchKey) : "";
  const followUpStepLabel = followUpStepId ? firstDayStepLabel(followUpStepId) : "";
  const followUpHref = firstDayFollowUp ? firstDayHref(firstDayFollowUp as PersistedGatePlatformDispatchTask, followUpStepId) : "";
  const aiExecutableFollowUp = firstDayFollowUp
    && completedStepId !== "risk-recovery"
    && (input.executionPlan?.executable ?? ["story-support", "first-draft", "first-review", "first-rewrite"].includes(followUpStepId));
  const aiFollowUpExecution = aiExecutableFollowUp && firstDayFollowUp.projectId
    ? {
      kind: "first_day_ai" as const,
      endpoint: `/api/projects/${encodeURIComponent(firstDayFollowUp.projectId)}/first-day-workflow`,
    }
    : undefined;

  if (completedStepId === "risk-recovery") {
    return {
      visible: true,
      status: "risk_recovered",
      title: "止损已解除，进入恢复观察",
      detail: firstDayFollowUp
        ? `恢复验证已验收，下一张首日卡是「${followUpStepLabel}」。先跑小样本，通过线和复查证据没过之前不要放量。`
        : "恢复验证已验收。请刷新首日工作流，确认下一步是否进入小样本生成。",
      actionLabel: aiExecutableFollowUp ? "继续 AI 执行" : firstDayFollowUp?.actionLabel || "回作品看恢复观察",
      href: firstDayFollowUp ? followUpHref : input.task.href,
      actionExecution: aiFollowUpExecution,
      badges: [
        "已完成恢复条件",
        "转入观察小样本",
        firstDayFollowUp?.dueLabel ?? "今天小样本验证",
        aiExecutableFollowUp ? "AI 可继续" : null,
      ].filter(Boolean) as string[],
    };
  }

  if (completedStepId === "first-draft" && isWatchSampleCompletion(input.task.completionEvidence)) {
    const cleared = watchSampleCompletionCleared(input.task.completionEvidence);
    return {
      visible: true,
      status: cleared ? "watch_cleared" : "watch_blocked",
      title: cleared ? "小样本已过线，放量闸门已解除" : "小样本未过线，继续观察",
      detail: cleared
        ? "完成依据已写清通过线、不可接受项、复查证据和通过结论。先回总闸门复查放行状态，再进入任务队列谨慎放量。"
        : "完成依据没有明确通过，或包含未通过、暂不放量、继续观察等结论。先回总闸门确认卡点仍关闭，再修问题复测。",
      actionLabel: "回总闸门复查",
      href: "/gate",
      badges: cleared
        ? ["小样本过线", "放量闸门解除", "恢复后续初稿"]
        : ["小样本未过线", "继续观察", "禁止批量放大"],
    };
  }

  if (firstDayFollowUp) {
    return {
      visible: true,
      status: "advanced",
      title: "首日节点已推进",
      detail: `「${completedStepLabel}」已验收，下一张首日卡是「${followUpStepLabel}」。先完成当前节点，再考虑批量扩大。`,
      actionLabel: aiExecutableFollowUp ? "继续 AI 执行" : firstDayFollowUp.actionLabel,
      href: followUpHref,
      actionExecution: aiFollowUpExecution,
      badges: [
        completedStepLabel,
        followUpStepLabel,
        firstDayFollowUp.dueLabel,
        aiExecutableFollowUp ? "AI 可继续" : null,
      ].filter(Boolean) as string[],
    };
  }

  return {
    visible: true,
    status: "completed",
    title: "首日派单已收口",
    detail: `「${completedStepLabel}」已验收，当前没有新的首日派单。回总闸门复查是否已经放行批量生产或平台包复盘。`,
    actionLabel: "回总闸门复查",
    href: "/gate",
    badges: [completedStepLabel, "无新增首日卡", "复查放行"],
  };
}

export function buildFirstDayPostDispatchCompletionPrompt(input: {
  completedTitle: string;
  updateSummary: Pick<FirstDayDispatchUpdateSummary, "visible" | "status" | "title" | "detail"> | null;
  nextStep: Pick<FirstDayWorkflowStep, "label" | "owner" | "actionLabel" | "href"> | null;
  executionPlan: { executable: boolean; blockedReason?: string } | null;
}): FirstDayPostDispatchCompletionPrompt {
  if (input.nextStep?.owner === "AI" && input.executionPlan?.executable) {
    return {
      message: `已完成当前派单：${input.completedTitle}。下一步「${input.nextStep.label}」已准备好，可以继续让 AI 执行。`,
      action: "execute_current_step",
      actionLabel: "继续 AI 执行",
    };
  }

  if (input.nextStep && input.updateSummary?.visible && input.updateSummary.status !== "completed") {
    return {
      message: `${input.updateSummary.title}：${input.updateSummary.detail}`,
      action: "open_next_step",
      actionLabel: input.nextStep.actionLabel,
      actionHref: input.nextStep.href,
    };
  }

  if (input.updateSummary?.visible) {
    return {
      message: `${input.updateSummary.title}：${input.updateSummary.detail}`,
    };
  }

  return {
    message: `已完成当前派单：${input.completedTitle}`,
  };
}

export function buildFirstDayRouteRepairReturnNotice(input: {
  taskLabel: string;
  routeBlockMessage: string | null;
  executionPlan: { executable: boolean; blockedReason?: string } | null;
}): FirstDayPostDispatchCompletionPrompt {
  if (input.routeBlockMessage) {
    return {
      message: `已刷新首日模型路线：${input.routeBlockMessage}`,
    };
  }

  if (!input.executionPlan?.executable) {
    return {
      message: `已刷新首日模型路线：${input.taskLabel}路线就绪；但${input.executionPlan?.blockedReason ?? "当前首日节点暂不支持自动执行。"}`,
    };
  }

  return {
    message: `已刷新首日模型路线：${input.taskLabel}路线就绪，可以继续执行当前节点。`,
    action: "execute_current_step",
  };
}

export function buildFirstDayExecutionReceiptFollowupPrompt(input: {
  receipt: Pick<FirstDayExecutionReceipt, "success" | "summary" | "nextAction"> | null;
  completionAction: Pick<FirstDayReceiptCompletionAction, "visible" | "canComplete" | "label" | "reason">;
  fallbackStepLabel: string;
}): FirstDayPostDispatchCompletionPrompt {
  if (!input.receipt) {
    return {
      message: `AI 已执行当前节点：${input.fallbackStepLabel}。请检查结果后完成派单验收。`,
    };
  }

  if (!input.receipt.success) {
    return {
      message: `${input.receipt.summary} 下一步：${input.receipt.nextAction}`,
    };
  }

  if (input.completionAction.visible && input.completionAction.canComplete) {
    return {
      message: `${input.receipt.summary} 下一步：${input.receipt.nextAction}`,
      action: "complete_current_dispatch",
      actionLabel: input.completionAction.label,
    };
  }

  if (input.completionAction.visible) {
    return {
      message: `${input.receipt.summary} ${input.completionAction.reason}`,
    };
  }

  return {
    message: `${input.receipt.summary} 下一步：${input.receipt.nextAction}`,
  };
}

export async function completeFirstDayDispatchStep(
  projectId: string,
  stepId: string,
  completionEvidence: string,
  validationContext?: Omit<FirstDayDispatchCompletionValidationInput, "dispatchKey" | "completionEvidence">,
) {
  const trimmedEvidence = completionEvidence.trim();
  const validation = validateFirstDayDispatchCompletionEvidence({
    dispatchKey: `first-day:${projectId}:${stepId}`,
    ...validationContext,
    completionEvidence: trimmedEvidence,
  });
  if (!validation.valid) {
    throw new Error(validation.error ?? "完成派单前，请写清楚完成依据。");
  }

  return updatePersistedGateDispatchTaskState(`first-day:${projectId}:${stepId}`, "completed", {
    completionEvidence: trimmedEvidence,
  });
}
