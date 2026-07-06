import { z } from "zod";
import type { PlatformProfile } from "@/lib/platforms/platformProfiles";
import type { PlatformKnowledgeInsight, PlatformSubmissionAssetAudit, PlatformSubmissionAssetEditorReview } from "@/lib/projects/platformPublishExport";

export interface PlatformSubmissionAssetOptimizationInput {
  platform: PlatformProfile;
  asset: {
    title: string;
    logline: string;
    synopsis: string;
    overseasSynopsis: string;
    tags: string[];
    note: string;
  };
  audit: PlatformSubmissionAssetAudit;
  editorReview?: PlatformSubmissionAssetEditorReview | null;
  chapters: {
    order: number;
    title: string;
    goal: string;
    hook: string;
    conflict: string;
    cliffhanger: string;
  }[];
  platformKnowledge?: PlatformKnowledgeInsight | null;
}

export interface PlatformSubmissionAssetOptimizationVariant {
  strategy: string;
  title: string;
  logline: string;
  synopsis: string;
  overseasSynopsis: string;
  tags: string[];
  rationale: string[];
}

export const platformSubmissionAssetOptimizationResultSchema = z.object({
  variants: z.array(z.object({
    strategy: z.string().min(1),
    title: z.string().min(1),
    logline: z.string().min(1),
    synopsis: z.string().min(1),
    overseasSynopsis: z.string().min(1),
    tags: z.array(z.string().min(1)).min(3).max(8),
    rationale: z.array(z.string().min(1)).min(1).max(4),
  })).min(2).max(3),
});

export function buildPlatformSubmissionAssetOptimizationPrompt(input: PlatformSubmissionAssetOptimizationInput) {
  const systemPrompt = [
    "你是平台投稿资产优化师，只输出 JSON。",
    "你要按目标平台修标题、一句话卖点、简介、海外简介和标签。",
    "不改剧情事实，不新增主线设定，不输出 Markdown，不解释 JSON 外内容。",
  ].join("\n");

  const issueText = input.audit.issues.length
    ? input.audit.issues.map((issue) => `${issue.severity}｜${issue.field}｜${issue.label}：${issue.detail}`).join("\n")
    : "当前质检暂无阻塞，但仍要提升平台点击率和投稿辨识度。";
  const knowledgeLines = input.platformKnowledge
    ? [
        "平台知识库反哺：",
        `知识状态：${input.platformKnowledge.status}`,
        `置信度：${input.platformKnowledge.confidence}`,
        `打法摘要：${input.platformKnowledge.tacticSummary}`,
        `可复用信号：${input.platformKnowledge.winningSignals.join("；") || "暂无"}`,
        `避坑信号：${input.platformKnowledge.avoidSignals.join("；") || "暂无"}`,
        `下一步建议：${input.platformKnowledge.nextAction}`,
      ]
    : ["平台知识库反哺：暂无可用经验，按平台基础规则生成。"];
  const editorReviewLines = input.editorReview
    ? [
        "编辑审稿意见：",
        input.editorReview.headline,
        input.editorReview.primaryAction,
        "生成候选时必须优先解决首要修复项，再处理其它字段。",
        `重点问题：${input.editorReview.focusIssues.map((issue) => `${issue.label}：${issue.detail}`).join("；") || "暂无"}`,
        `已通过证据：${input.editorReview.evidence.join("；") || "暂无"}`,
      ]
    : [
        "编辑审稿意见：暂无独立摘要，按当前质检问题排序优化。",
        "生成候选时必须优先解决首要修复项，再处理其它字段。",
      ];

  const userPrompt = [
    `目标平台：${input.platform.name}`,
    `平台类别：${input.platform.category}`,
    `平台高频题材：${input.platform.genres.join("、")}`,
    `平台开头规则：${input.platform.openingRules.join("；")}`,
    `平台审稿重点：${input.platform.reviewFocus.join("、")}`,
    `平台风险：${input.platform.risks.join("、")}`,
    `当前质检分：${input.audit.score}`,
    `当前质检状态：${input.audit.status}`,
    ...editorReviewLines,
    ...knowledgeLines,
    "当前质检问题：",
    issueText,
    `当前标题：${input.asset.title}`,
    `当前一句话卖点：${input.asset.logline}`,
    `当前中文简介：${input.asset.synopsis}`,
    `当前海外简介：${input.asset.overseasSynopsis}`,
    `当前标签：${input.asset.tags.join("、")}`,
    input.asset.note ? `作者备注：${input.asset.note}` : "作者备注：无",
    "章节卡参考：",
    ...input.chapters.slice(0, 5).map((chapter) => (
      `第 ${chapter.order} 章《${chapter.title}》｜目标：${chapter.goal || "未填"}｜钩子：${chapter.hook || "未填"}｜冲突：${chapter.conflict || "未填"}｜悬念：${chapter.cliffhanger || "未填"}`
    )),
    "输出 JSON：",
    "{",
    "  \"variants\": [",
    "    { \"strategy\": \"方案策略\", \"title\": \"标题\", \"logline\": \"一句话卖点\", \"synopsis\": \"中文简介\", \"overseasSynopsis\": \"英文/海外简介\", \"tags\": [\"标签\"], \"rationale\": [\"优化理由\"] }",
    "  ]",
    "}",
    "要求：输出 3 个 variants；tags 3-8 个；rationale 2-4 条；中文简介必须具体、有主角、有冲突、有长期期待。",
  ].join("\n");

  return { systemPrompt, userPrompt };
}
