import type { FirstDayRiskLevel, FirstDayWorkflowStep } from "./firstDayWorkflow.ts";
import { updatePersistedGateDispatchTaskState, type PersistedGatePlatformDispatchTask } from "./gateActionReceipts.ts";

const ACCEPTANCE_MARKER = "任务中心已验收：";
const MIN_COMPLETION_EVIDENCE_LENGTH = 8;
const BLOCKED_COMPLETION_KEYWORDS = ["恢复条件", "入口卖点", "前三章兑现", "平台匹配度", "改掉", "重做", "修复"];
const WATCH_COMPLETION_REQUIRED_KEYWORDS = ["通过线", "不可接受", "复查证据", "放量结论"];
const HANDOFF_ACTION_KEYWORDS = ["交接动作", "首日动作", "开头", "验证", "落地"];
const HANDOFF_AVOID_KEYWORDS = ["避坑边界", "避开", "不要", "小样本", "不放量", "暂停"];

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

export interface FirstDayDispatchUpdateSummary {
  visible: boolean;
  status: "none" | "advanced" | "risk_recovered" | "watch_cleared" | "watch_blocked" | "completed";
  title: string;
  detail: string;
  actionLabel: string;
  href: string;
  badges: string[];
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

function firstDayStepId(dispatchKey: string) {
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

function firstDayHref(task: PersistedGatePlatformDispatchTask, stepId: string) {
  if (task.projectId) {
    return `/projects/${task.projectId}?firstDayLaunch=1&nextStep=${encodeURIComponent(stepId)}#first-day-workflow`;
  }
  return task.href;
}

export function isFirstDayDispatchTask(task: Pick<PersistedGatePlatformDispatchTask, "dispatchKey">) {
  return task.dispatchKey.startsWith("first-day:");
}

export function buildFirstDayDispatchCompletionTemplate(task: Pick<PersistedGatePlatformDispatchTask, "dispatchKey" | "acceptanceCriteria"> & Partial<Pick<PersistedGatePlatformDispatchTask, "dueLabel" | "title" | "evidence">>) {
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
}): FirstDayDispatchUpdateSummary {
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

  if (completedStepId === "risk-recovery") {
    return {
      visible: true,
      status: "risk_recovered",
      title: "止损已解除，进入恢复观察",
      detail: firstDayFollowUp
        ? `恢复验证已验收，下一张首日卡是「${followUpStepLabel}」。先跑小样本，通过线和复查证据没过之前不要放量。`
        : "恢复验证已验收。请刷新首日工作流，确认下一步是否进入小样本生成。",
      actionLabel: firstDayFollowUp?.actionLabel || "回作品看恢复观察",
      href: firstDayFollowUp ? firstDayHref(firstDayFollowUp as PersistedGatePlatformDispatchTask, followUpStepId) : input.task.href,
      badges: [
        "已完成恢复条件",
        "转入观察小样本",
        firstDayFollowUp?.dueLabel ?? "今天小样本验证",
      ],
    };
  }

  if (completedStepId === "first-draft" && isWatchSampleCompletion(input.task.completionEvidence)) {
    const cleared = watchSampleCompletionCleared(input.task.completionEvidence);
    return {
      visible: true,
      status: cleared ? "watch_cleared" : "watch_blocked",
      title: cleared ? "小样本已过线，放量闸门已解除" : "小样本未过线，继续观察",
      detail: cleared
        ? "完成依据已写清通过线、不可接受项、复查证据和通过结论。任务队列会恢复后续初稿批次，下一步回到任务队列谨慎放量。"
        : "完成依据没有明确通过，或包含未通过、暂不放量、继续观察等结论。后续初稿仍保持小样本闸门，先修问题再测。",
      actionLabel: cleared ? "回任务队列放量" : "回任务队列复查",
      href: "/tasks",
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
      actionLabel: firstDayFollowUp.actionLabel,
      href: firstDayHref(firstDayFollowUp as PersistedGatePlatformDispatchTask, followUpStepId),
      badges: [completedStepLabel, followUpStepLabel, firstDayFollowUp.dueLabel],
    };
  }

  return {
    visible: true,
    status: "completed",
    title: "首日派单已收口",
    detail: `「${completedStepLabel}」已验收，当前没有新的首日派单。可以回到作品页检查是否进入批量生产或平台包复盘。`,
    actionLabel: "回作品检查",
    href: input.task.href,
    badges: [completedStepLabel, "无新增首日卡"],
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
