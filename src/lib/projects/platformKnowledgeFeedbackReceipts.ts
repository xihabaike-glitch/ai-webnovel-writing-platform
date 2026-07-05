import type { GateKnowledgeFeedbackReceipt } from "./gateActionReceipts.ts";
import type { PlatformKnowledgeInsight } from "./platformPublishExport.ts";

function primarySignal(input: PlatformKnowledgeInsight) {
  if (input.status === "learned") return input.winningSignals[0] ?? input.tacticSummary;
  if (input.status === "warning") return input.avoidSignals[0] ?? input.tacticSummary;
  return input.tacticSummary || "缺少可归因证据";
}

export function buildPublishEffectKnowledgeFeedbackReceipt(input: {
  projectId: string;
  projectTitle?: string | null;
  metricId: string;
  platformKnowledge: PlatformKnowledgeInsight;
  effectReviewHeadline: string;
  createdAt?: Date | string;
}): GateKnowledgeFeedbackReceipt {
  const createdAt = input.createdAt ? new Date(input.createdAt).toISOString() : new Date().toISOString();
  const knowledge = input.platformKnowledge;
  const severity: GateKnowledgeFeedbackReceipt["severity"] = knowledge.status === "learned" ? "success" : "needs_action";
  const title = knowledge.status === "learned"
    ? `${knowledge.platformName} 正反馈经验已沉淀`
    : knowledge.status === "warning"
      ? `${knowledge.platformName} 避坑经验待执行`
      : `${knowledge.platformName} 证据链还不够硬`;
  const completedStepLabel = knowledge.status === "learned"
    ? "发布效果正反馈"
    : knowledge.status === "warning"
      ? "发布效果负反馈"
      : "发布效果已记录";
  const stopReason = knowledge.status === "learned"
    ? `可复用信号：${primarySignal(knowledge)}`
    : knowledge.status === "warning"
      ? `避坑信号：${primarySignal(knowledge)}`
      : "缺采纳版本、对照数据或二轮归因，暂时不能写成成功打法。";

  return {
    id: `platform-knowledge:${input.projectId}:${knowledge.platformId}:publish_effect:${input.metricId}`,
    projectId: input.projectId,
    projectTitle: input.projectTitle ?? null,
    platformId: knowledge.platformId,
    platformName: knowledge.platformName,
    actionLabel: knowledge.feedbackLoop.actionLabel,
    title,
    message: `${input.effectReviewHeadline} ${knowledge.feedbackLoop.headline} ${knowledge.tacticSummary} 知识置信度 ${knowledge.confidence} 分。`,
    completedStepLabel,
    stopReason,
    nextAction: knowledge.feedbackLoop.nextStepLabel || knowledge.nextAction,
    href: knowledge.feedbackLoop.nextStepHref || "#platform-strategy-ranking",
    severity,
    createdAt,
  };
}
