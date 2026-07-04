import type { ProjectContextPack } from "../projects/projectContextPack.ts";
import type { ProjectStartTacticSummary } from "../projects/projectStartTactics.ts";
import type { StoryTreeExperienceGuide } from "./storyTreeExperience.ts";

export type StoryTreeProductionPhase = "chapter_draft" | "first_three_rewrite";

export interface StoryTreeProductionInput {
  phase: StoryTreeProductionPhase;
  chapterOrder?: number | null;
  startTactic?: ProjectStartTacticSummary | null;
  projectContext?: ProjectContextPack | null;
  storyTreeExperience?: StoryTreeExperienceGuide | null;
}

function phaseLine(input: StoryTreeProductionInput) {
  if (input.phase === "first_three_rewrite") {
    return "前三章先形成追读链：第一章立不可逆选择，第二章兑现第一个爽点或关系推进，第三章推出新真相、新敌人或新任务。";
  }

  if (input.chapterOrder && input.chapterOrder <= 1) {
    return "当前是开篇章：第一屏必须抓人，章末必须把读者推向第二章。";
  }

  return "当前是连载正文：承接上一章悬念，推进本章主干，结尾留下下一章问题。";
}

function contextLine(context: ProjectContextPack | null | undefined) {
  if (!context) return "上下文缺省时，先按章节卡补足人物选择、主线推进和伏笔位置，不要只写气氛。";
  if (context.status === "pass") return `${context.summary} 可直接承接人物弧光、规则土壤和历史章节。`;
  if (context.status === "warn") return `${context.summary} 写作时优先补齐警告项。`;
  return `${context.summary} 本章必须先补人物弧光、规则土壤或主线支点。`;
}

export function buildStoryTreeProductionBlock(input: StoryTreeProductionInput) {
  return [
    "大树结构生产准则：",
    `- 开头与结尾先定：${phaseLine(input)}`,
    "- 主干：每 300-500 字必须推进一次主线目标、人物选择、冲突升级或价值变化，不能只解释设定。",
    "- 分支：支线、关系、伏笔只能服务主干压力；分支出现后要给读者一个可追踪的因果钩子。",
    "- 叶片与土壤：细节、情绪、世界规则和平台土壤只用于承托动作与选择，不能喧宾夺主。",
    "- 人物弧光：每章都让主角在欲望、缺陷、需求之间做一个可见选择，并让结果改变后续局面。",
    input.startTactic ? `- 平台打法优先级：执行「${input.startTactic.label}」的开头动作和验证动作，避免触碰风险提醒。` : "- 平台打法优先级：没有历史打法时，按目标平台开头规则和审稿重点小步验证。",
    `- 上下文约束：${contextLine(input.projectContext)}`,
    input.storyTreeExperience?.promptBlock ? input.storyTreeExperience.promptBlock : "- 大树复检经验：暂无历史复检结论，先按本章大树质检标准生成。",
  ].join("\n");
}
