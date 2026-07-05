import { buildGateAiPipelineRecoveryPanel, type PersistedGatePlatformDispatchTask } from "../projects/gateActionReceipts.ts";

export interface AiRecoveryPromptMemory {
  promptBlock: string;
}

export type AiRecoveryPromptPhase = "draft" | "review" | "second_pass";

export function buildAiRecoveryPromptMemory(tasks: PersistedGatePlatformDispatchTask[]): AiRecoveryPromptMemory | null {
  const latestEvidence = buildGateAiPipelineRecoveryPanel(tasks).latestEvidence;
  if (!latestEvidence) return null;

  return {
    promptBlock: [
      "AI 写审改恢复证据：",
      `- ${latestEvidence.label}：${latestEvidence.evidence.slice(0, 3).join("；")}。`,
      `- 下一步：${latestEvidence.nextAction || "继续小样本观察"}。`,
      "- 禁区：不要直接恢复大批量，不要弱化开头钩子和章末追读。",
    ].join("\n"),
  };
}

export function buildAiRecoveryPromptBlock(memory: AiRecoveryPromptMemory | null | undefined, phase: AiRecoveryPromptPhase) {
  if (!memory?.promptBlock) return "";
  const instruction = phase === "draft"
    ? "恢复证据未清除前，初稿必须保留开头钩子、章末追读和小样本节奏；不要把恢复小批误写成无限放量。"
    : phase === "review"
      ? "审稿时必须单独判断正文是否触发 AI 写审改恢复禁区；触发则把 issue type 标成 ai_recovery。"
      : "二改必须优先修复恢复证据里暴露的问题；不要牺牲开头钩子、章末追读和小样本节奏。";

  return [
    memory.promptBlock,
    `恢复执行要求：${instruction}`,
  ].join("\n");
}
