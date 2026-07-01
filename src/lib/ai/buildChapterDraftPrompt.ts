import type { PlatformProfile } from "../platforms/platformProfiles.ts";
import { buildPlatformWritingStylePromptBlock } from "../platforms/writingStyleTemplates.ts";

interface ChapterDraftPromptInput {
  projectTitle: string;
  genre: string;
  sellingPoint: string;
  platform: PlatformProfile;
  targetWords: number;
  chapter: {
    title: string;
    goal: string;
    hook: string;
    conflict: string;
    valueShift: string;
    cliffhanger: string;
    content: string;
  };
}

export function buildChapterDraftPrompt(input: ChapterDraftPromptInput) {
  const platformStyle = buildPlatformWritingStylePromptBlock(input.platform.id);
  const systemPrompt = [
    "你是高执行力网文写手，只输出正文初稿，不输出解释、标题、Markdown 或审稿意见。",
    "优先满足平台读者预期：开头有钩子，中段有冲突推进，结尾有明确悬念。",
    "正文要可继续人工修改，不能只写梗概。",
  ].join("\n");

  const userPrompt = [
    `作品：${input.projectTitle}`,
    `题材：${input.genre}`,
    `卖点：${input.sellingPoint || "用清晰爽点和持续冲突推动读者追读"}`,
    `目标平台：${input.platform.name}`,
    `平台开头规则：${input.platform.openingRules.join("；")}`,
    `平台审稿重点：${input.platform.reviewFocus.join("、")}`,
    platformStyle,
    `目标字数：约 ${input.targetWords} 字`,
    `章节标题：${input.chapter.title}`,
    `章节目标：${input.chapter.goal}`,
    `开头钩子：${input.chapter.hook}`,
    `冲突：${input.chapter.conflict}`,
    `价值变化：${input.chapter.valueShift}`,
    `章末悬念：${input.chapter.cliffhanger}`,
    input.chapter.content ? `已有正文，可在此基础上重写或扩写：\n${input.chapter.content}` : "已有正文：无",
    "输出要求：",
    "1. 直接写正文，不要写章节卡。",
    "2. 第一段必须进入事件现场。",
    "3. 每 300-500 字至少推动一次信息、冲突或选择。",
    "4. 结尾必须扣住章末悬念。",
  ].join("\n");

  return { systemPrompt, userPrompt };
}
