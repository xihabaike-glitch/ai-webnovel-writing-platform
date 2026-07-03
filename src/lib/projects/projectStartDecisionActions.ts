import type { GateActionReceipt, GateActionReceiptStartTactic } from "./gateActionReceipts.ts";
import type { ProjectStartDecision } from "./projectControlDashboard.ts";
import type { ProjectStartTacticSummary } from "./projectStartTactics.ts";

export interface ProjectStartDecisionActionReceiptInput {
  projectId: string;
  projectTitle: string;
  platformId: string;
  platformName: string;
  decision: ProjectStartDecision;
  startTactic: ProjectStartTacticSummary | null;
  created: string[];
  skipped: string | null;
  now?: string;
}

function receiptId(input: ProjectStartDecisionActionReceiptInput, createdAt: string) {
  return [
    "project-start-decision",
    input.projectId,
    input.decision.status,
    createdAt.replace(/[^0-9]/g, ""),
  ].join(":");
}

function recheck(input: ProjectStartDecisionActionReceiptInput): GateActionReceipt["recheck"] {
  if (input.decision.status === "pause") {
    return {
      status: "blocked",
      label: "等待重写",
      detail: "先完成前三章开头和平台包装修复，再回到总控复查。",
      actionLabel: "完成重写后复查",
    };
  }

  return {
    status: "ready",
    label: "可复查",
    detail: "动作已记录，刷新项目总控查看新的优先级。",
    actionLabel: "刷新项目总控",
  };
}

function tacticFromSummary(startTactic: ProjectStartTacticSummary | null): GateActionReceiptStartTactic[] {
  if (!startTactic) return [];
  return [{
    title: startTactic.title,
    label: startTactic.label,
    primaryTactic: startTactic.primaryTactic,
    openingMove: startTactic.openingMove,
    verificationMove: startTactic.verificationMove,
    risk: startTactic.risk,
  }];
}

function message(input: ProjectStartDecisionActionReceiptInput) {
  if (input.created.length > 0) {
    return `已执行「${input.decision.actionLabel}」：${input.created.join("、")}。`;
  }
  return `已记录「${input.decision.actionLabel}」：${input.skipped ?? input.decision.nextExperiment}`;
}

function succeededCount(input: ProjectStartDecisionActionReceiptInput) {
  if (input.created.length > 0) return input.created.length;
  return 1;
}

export function buildProjectStartDecisionActionReceipt(input: ProjectStartDecisionActionReceiptInput): GateActionReceipt {
  const createdAt = input.now ?? new Date().toISOString();

  return {
    id: receiptId(input, createdAt),
    actionId: `project_start_decision:${input.decision.status}:${input.platformId}`,
    label: `开书策略执行：${input.decision.label}`,
    detail: `${input.projectTitle}｜${input.decision.headline} 下一轮实验：${input.decision.nextExperiment}`,
    href: `/projects/${input.projectId}#${input.decision.targetAnchor}`,
    status: "succeeded",
    message: message(input),
    executionType: "manual",
    succeededCount: succeededCount(input),
    failedCount: 0,
    taskId: null,
    platformId: input.platformId,
    platformName: input.platformName,
    startTactics: tacticFromSummary(input.startTactic),
    batchEffectSummary: null,
    recheck: recheck(input),
    createdAt,
  };
}
