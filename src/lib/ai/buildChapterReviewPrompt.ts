import type { PlatformProfile } from "../platforms/platformProfiles.ts";
import type { ProjectStartTacticSummary } from "../projects/projectStartTactics.ts";

interface ChapterReviewPromptInput {
  projectTitle: string;
  platform: PlatformProfile;
  startTactic?: ProjectStartTacticSummary | null;
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

export function buildChapterReviewPrompt(input: ChapterReviewPromptInput) {
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
  const systemPrompt =
    "你是严格的网文编辑。你只输出 JSON，不输出闲聊。重点检查钩子、冲突、爽点、人物弧光、伏笔和平台适配。";

  const userPrompt = [
    `作品：${input.projectTitle}`,
    `目标平台：${input.platform.name}`,
    `平台审稿重点：${input.platform.reviewFocus.join("、")}`,
    ...startTacticLines,
    `章节标题：${input.chapter.title}`,
    `章节目标：${input.chapter.goal}`,
    `开头钩子：${input.chapter.hook}`,
    `冲突：${input.chapter.conflict}`,
    `价值变化：${input.chapter.valueShift}`,
    `章末悬念：${input.chapter.cliffhanger}`,
    "正文：",
    input.chapter.content,
    "输出 JSON 字段：score, issues, summary。issues 内含 severity, type, message, suggestion。",
    input.startTactic ? "审稿时必须单独判断正文是否执行了首轮平台打法；没执行就把 type 标成 start_tactic 或 platform_fit。" : "",
  ].join("\n");

  return { systemPrompt, userPrompt };
}
