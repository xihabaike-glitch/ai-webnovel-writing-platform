import type { ChapterRewritePlan } from "../projects/firstThreeRewrite.ts";
import type { PlatformProfile } from "../platforms/platformProfiles.ts";
import type { ProjectStartTacticSummary } from "../projects/projectStartTactics.ts";
import type { PlatformKnowledgeInsight } from "../projects/platformPublishExport.ts";

interface FirstThreeRewritePromptInput {
  projectTitle: string;
  genre: string;
  sellingPoint: string;
  platform: PlatformProfile;
  startTactic?: ProjectStartTacticSummary | null;
  platformKnowledge?: PlatformKnowledgeInsight | null;
  targetWords: number;
  chapter: {
    order: number;
    title: string;
    content: string;
    goal: string;
    hook: string;
    conflict: string;
    valueShift: string;
    cliffhanger: string;
  };
  plan: ChapterRewritePlan;
}

function list(items: string[]) {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- 无";
}

export function buildFirstThreeRewritePrompt(input: FirstThreeRewritePromptInput) {
  const startTacticLines = input.startTactic
    ? [
        "首轮平台打法：",
        `来源：${input.startTactic.label}`,
        `打法：${input.startTactic.primaryTactic}`,
        `开头动作：${input.startTactic.openingMove}`,
        `验证动作：${input.startTactic.verificationMove}`,
        `风险提醒：${input.startTactic.risk || "按平台反馈继续校准。"}`,
        "",
      ]
    : [];
  const knowledgeLines = input.platformKnowledge
    ? [
        "平台知识库反哺：",
        `知识状态：${input.platformKnowledge.status}`,
        `置信度：${input.platformKnowledge.confidence}`,
        `打法摘要：${input.platformKnowledge.tacticSummary}`,
        `可复用信号：${input.platformKnowledge.winningSignals.join("；") || "暂无"}`,
        `避坑信号：${input.platformKnowledge.avoidSignals.join("；") || "暂无"}`,
        `下一步建议：${input.platformKnowledge.nextAction}`,
        "",
      ]
    : [];
  const systemPrompt = [
    "你是高执行力网文改稿写手，只输出改写后的正文，不输出解释、标题、Markdown、清单或审稿意见。",
    "你必须严格按改稿处方执行：先抓开头，再压主干，最后用章末悬念把读者推到下一章。",
    "正文要像平台连载稿，不要像故事梗概；每一段都要发生具体动作、信息变化或情绪推进。",
  ].join("\n");

  const userPrompt = [
    `作品：${input.projectTitle}`,
    `题材：${input.genre}`,
    `卖点：${input.sellingPoint || "强钩子、连续冲突、章末追读"}`,
    `目标平台：${input.platform.name}`,
    `平台开头规则：${input.platform.openingRules.join("；")}`,
    `平台审稿重点：${input.platform.reviewFocus.join("、")}`,
    ...startTacticLines,
    ...knowledgeLines,
    `目标字数：约 ${input.targetWords} 字`,
    "",
    `章节：第 ${input.chapter.order} 章 ${input.chapter.title}`,
    `原章节目标：${input.chapter.goal || "未填写"}`,
    `原开头钩子：${input.chapter.hook || "未填写"}`,
    `原冲突：${input.chapter.conflict || "未填写"}`,
    `原价值变化：${input.chapter.valueShift || "未填写"}`,
    `原章末悬念：${input.chapter.cliffhanger || "未填写"}`,
    "",
    "改稿处方：",
    `章节职责：${input.plan.role}`,
    `当前问题：${input.plan.currentProblem}`,
    `改稿目标：${input.plan.rewriteTarget}`,
    `冷开场：${input.plan.coldOpen}`,
    `章末处理：${input.plan.ending}`,
    `预期效果：${input.plan.expectedEffect}`,
    "",
    "必须保留：",
    list(input.plan.keep),
    "",
    "必须删除或压缩：",
    list(input.plan.cut),
    "",
    "必须补写：",
    list(input.plan.add),
    "",
    input.chapter.content ? `原正文：\n${input.chapter.content}` : "原正文：无，请根据章节职责和处方直接写出可连载正文。",
    "",
    "输出要求：",
    "1. 只输出正文。",
    "2. 第一段必须进入现场，不能先解释设定。",
    "3. 中段每 300-500 字至少推动一次选择、冲突、线索或爽点。",
    "4. 结尾必须按处方制造章末追读，不允许平收。",
    "5. 不要出现“根据处方”“以下是改写”等说明文字。",
  ].join("\n");

  return { systemPrompt, userPrompt };
}
