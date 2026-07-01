import type { SubmissionPackage } from "@/lib/projects/submissionPackage";
import type { PlatformProfile } from "@/lib/platforms/platformProfiles";
import { z } from "zod";

export interface SubmissionOptimizationPromptInput {
  platform: PlatformProfile;
  submissionPackage: SubmissionPackage;
}

export interface SubmissionOptimizationResult {
  logline: string;
  synopsis: string;
  overseasSynopsis: string;
  tags: string[];
  rationale: string[];
}

export const submissionOptimizationResultSchema = z.object({
  logline: z.string().min(1),
  synopsis: z.string().min(1),
  overseasSynopsis: z.string().min(1),
  tags: z.array(z.string().min(1)).min(3).max(8),
  rationale: z.array(z.string().min(1)).min(1).max(4),
});

export function buildSubmissionOptimizationPrompt(input: SubmissionOptimizationPromptInput) {
  const systemPrompt = [
    "你是网文平台投稿包装编辑，只输出 JSON。",
    "你要按目标平台优化书名下方的一句话卖点、简介、标签和海外 synopsis。",
    "不要改剧情事实，不要发散新设定，不要输出 Markdown。",
  ].join("\n");

  const userPrompt = [
    `目标平台：${input.platform.name}`,
    `平台开头规则：${input.platform.openingRules.join("；")}`,
    `平台审稿重点：${input.platform.reviewFocus.join("、")}`,
    `平台风险：${input.platform.risks.join("、")}`,
    `原一句话卖点：${input.submissionPackage.logline}`,
    `原中文简介：${input.submissionPackage.synopsis}`,
    `原 Overseas Synopsis：${input.submissionPackage.overseasSynopsis}`,
    `原标签：${input.submissionPackage.tags.join("、")}`,
    "前三章摘要：",
    ...input.submissionPackage.firstThreeSummaries.map((chapter) => (
      `第 ${chapter.order} 章 ${chapter.title}：${chapter.summary}`
    )),
    "输出 JSON 字段：logline, synopsis, overseasSynopsis, tags, rationale。",
    "要求：tags 是 5-8 个字符串；rationale 是 2-4 条优化理由。",
  ].join("\n");

  return { systemPrompt, userPrompt };
}
