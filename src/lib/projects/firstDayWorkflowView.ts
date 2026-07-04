import type { FirstDayWorkflowStep } from "./firstDayWorkflow.ts";
import { updatePersistedGateDispatchTaskState, type PersistedGatePlatformDispatchTask } from "./gateActionReceipts.ts";

const ACCEPTANCE_MARKER = "任务中心已验收：";
const MIN_COMPLETION_EVIDENCE_LENGTH = 8;

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
  href: string;
  firstDayHref: string;
  actionLabel: string;
  completionTemplate: string;
  acceptanceCriteria: string[];
  evidence: string[];
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

function firstDayStepId(dispatchKey: string) {
  const parts = dispatchKey.split(":");
  return parts[2] ?? "";
}

function firstDayStepLabel(stepId: string) {
  if (stepId === "skeleton") return "作品骨架";
  if (stepId === "opening-hook") return "第一章钩子";
  if (stepId === "story-support") return "人物设定支撑";
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

function firstDayHref(task: PersistedGatePlatformDispatchTask, stepId: string) {
  if (task.projectId) {
    return `/projects/${task.projectId}?firstDayLaunch=1&nextStep=${encodeURIComponent(stepId)}#first-day-workflow`;
  }
  return task.href;
}

export function isFirstDayDispatchTask(task: Pick<PersistedGatePlatformDispatchTask, "dispatchKey">) {
  return task.dispatchKey.startsWith("first-day:");
}

export function buildFirstDayDispatchCompletionTemplate(task: Pick<PersistedGatePlatformDispatchTask, "dispatchKey" | "acceptanceCriteria">) {
  if (!isFirstDayDispatchTask(task)) return "";
  const stepId = firstDayStepId(task.dispatchKey);
  if (stepId === "first-draft") return "第一章正文已生成并写回章节，钩子、冲突和章末追读已按首轮平台打法检查，可以进入审稿。";
  if (stepId === "first-review") return "第一章审稿已完成，钩子、爽点、冲突、解释密度和章末追读问题已列出，可以进入二改。";
  if (stepId === "first-rewrite") return "第一章二改或前三章改写已完成，审稿问题已逐项处理，并保留版本对照。";
  if (stepId === "publish-precheck") return "平台包预检已完成，标题、简介、标签、卖点、样章和首轮数据回收口径已整理。";
  if (stepId === "story-support") return "人物弧光、核心设定和平台土壤已补齐，后续正文生成可以直接引用。";
  if (stepId === "opening-hook") return "第一章目标、钩子、冲突、转变和章末悬念已补齐，并按目标平台开头规则检查。";
  if (stepId === "skeleton") return "作品骨架已完成，开头、结尾、主干、分支、叶片和土壤均已落地。";
  return task.acceptanceCriteria.length ? `首日派单已完成：${task.acceptanceCriteria.join("；")}。` : "";
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
    href: task.href,
    firstDayHref: firstDayHref(task, stepId),
    actionLabel: task.actionLabel,
    completionTemplate: buildFirstDayDispatchCompletionTemplate(task),
    acceptanceCriteria: task.acceptanceCriteria,
    evidence: task.evidence,
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
      nextTask ? `先收口「${nextTask.stepLabel}」：${nextTask.actionLabel}。` : null,
      active.length > 1 ? `还有 ${active.length - 1} 张首日卡排队，完成当前节点后再推进下一张。` : null,
      cards.length > 0 && active.length === 0 ? "首日派单已全部完成，可以进入批量生产和平台包复盘。" : null,
    ].filter((action): action is string => Boolean(action)),
  };
}

export async function completeFirstDayDispatchStep(projectId: string, stepId: string, completionEvidence: string) {
  const trimmedEvidence = completionEvidence.trim();
  if (trimmedEvidence.length < MIN_COMPLETION_EVIDENCE_LENGTH) {
    throw new Error("完成派单前，请写清楚完成依据，至少 8 个字。");
  }

  return updatePersistedGateDispatchTaskState(`first-day:${projectId}:${stepId}`, "completed", {
    completionEvidence: trimmedEvidence,
  });
}
