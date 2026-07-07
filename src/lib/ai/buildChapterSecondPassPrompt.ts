import type { PlatformProfile } from "../platforms/platformProfiles.ts";
import type { ProjectContextPack } from "../projects/projectContextPack.ts";
import type { ProjectStartTacticSummary } from "../projects/projectStartTactics.ts";
import { buildAiRecoveryPromptBlock, type AiRecoveryPromptMemory } from "./aiRecoveryPromptMemory.ts";

export type SecondPassMode = "more_hook" | "more_payoff" | "less_exposition" | "more_emotion" | "platform_fit";

export interface ChapterSecondPassPromptInput {
  projectTitle: string;
  genre: string;
  sellingPoint: string;
  platform: PlatformProfile;
  startTactic?: ProjectStartTacticSummary | null;
  projectContext?: ProjectContextPack | null;
  aiRecoveryMemory?: AiRecoveryPromptMemory | null;
  instruction: string;
  mode: SecondPassMode;
  targetWords: number;
  chapter: {
    title: string;
    content: string;
    goal: string;
    hook: string;
    conflict: string;
    valueShift: string;
    cliffhanger: string;
  };
}

const modeInstructions: Record<SecondPassMode, string> = {
  more_hook: "强化开头钩子和每段的小悬念，让读者更难划走。",
  more_payoff: "提高爽点兑现密度，让主角每一轮行动都有可见结果。",
  less_exposition: "压缩解释和设定，把说明改成现场行动、对话和后果。",
  more_emotion: "加强人物情绪、关系压力和选择代价，但不能牺牲主线推进。",
  platform_fit: "按目标平台读者偏好重排信息顺序，优先命中平台审稿重点。",
};

export function buildChapterSecondPassPrompt(input: ChapterSecondPassPromptInput) {
  const startTacticLines = input.startTactic
    ? [
        "首轮平台打法：",
        `来源：${input.startTactic.label}`,
        `打法：${input.startTactic.primaryTactic}`,
        `开头动作：${input.startTactic.openingMove}`,
        `验证动作：${input.startTactic.verificationMove}`,
        `风险提醒：${input.startTactic.risk || "按平台反馈继续校准。"}`,
      ]
    : [];
  const systemPrompt = [
    "你是毒舌但高执行力的网文二改写手，只输出二改后的正文。",
    "你不会解释修改思路，不输出标题、Markdown、清单或审稿意见。",
    "你必须在保留核心剧情的基础上按作者指令改写，让文本更像可连载网文正文。",
  ].join("\n");

  const userPrompt = [
    `作品：${input.projectTitle}`,
    `题材：${input.genre}`,
    `卖点：${input.sellingPoint || "强钩子、连续冲突、章末追读"}`,
    `目标平台：${input.platform.name}`,
    `平台开头规则：${input.platform.openingRules.join("；")}`,
    `平台审稿重点：${input.platform.reviewFocus.join("、")}`,
    ...startTacticLines,
    input.projectContext?.promptBlock ?? "",
    buildAiRecoveryPromptBlock(input.aiRecoveryMemory, "second_pass"),
    `二改方向：${modeInstructions[input.mode]}`,
    `作者指令：${input.instruction}`,
    `目标字数：约 ${input.targetWords} 字`,
    "",
    `章节标题：${input.chapter.title}`,
    `章节目标：${input.chapter.goal || "未填写"}`,
    `开头钩子：${input.chapter.hook || "未填写"}`,
    `冲突：${input.chapter.conflict || "未填写"}`,
    `价值变化：${input.chapter.valueShift || "未填写"}`,
    `章末悬念：${input.chapter.cliffhanger || "未填写"}`,
    "",
    "当前正文：",
    input.chapter.content || "空正文，请按章节卡和作者指令直接写出可连载正文。",
    "",
    "硬性要求：",
    "1. 只输出二改后的正文。",
    "2. 不要把故事改成梗概，必须写现场、动作、对话和结果。",
    "3. 保留章节核心事件，不要另开新故事。",
    "4. 开头必须比当前稿更快进入冲突。",
    "5. 结尾必须扣住章末悬念，不能平收。",
    input.startTactic ? "6. 优先执行首轮平台打法，尤其是开头动作和验证动作，不要把它写成注释。" : "",
    input.projectContext ? "7. 二改必须遵守项目上下文召回计划；不要改断人物弧光、世界规则、伏笔状态和历史章节承接。" : "",
  ].join("\n");

  return { systemPrompt, userPrompt };
}
