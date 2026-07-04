import type { PlatformProfile } from "../platforms/platformProfiles.ts";
import type { GatePlatformGrowthDispatchItem, GatePlatformGrowthReviewStage } from "../projects/gateActionReceipts.ts";
import type { StoryTreeQualityAudit, StoryTreeQualityAxis, StoryTreeQualityAxisId } from "./storyTreeQualityAudit.ts";

export type StoryTreeDispatchSource = "chapter_draft" | "chapter_second_pass" | "first_three_rewrite";

export interface StoryTreeDispatchInput {
  source: StoryTreeDispatchSource;
  projectId: string;
  projectTitle: string;
  chapterId: string;
  chapterOrder?: number | null;
  chapterTitle: string;
  platform: PlatformProfile;
  audit: StoryTreeQualityAudit;
  limit?: number;
}

const axisStage: Record<StoryTreeQualityAxisId, GatePlatformGrowthReviewStage> = {
  opening_ending: "start_rewrite_opening",
  trunk_motion: "start_first_three_review",
  branch_causality: "start_repair_packaging",
  leaf_soil: "start_platform_package",
  character_arc: "start_first_three_review",
};

const axisOwner: Record<StoryTreeQualityAxisId, string> = {
  opening_ending: "作者",
  trunk_motion: "作者",
  branch_causality: "策划",
  leaf_soil: "策划",
  character_arc: "作者",
};

const axisTitle: Record<StoryTreeQualityAxisId, string> = {
  opening_ending: "重写开头结尾",
  trunk_motion: "补强主干推进",
  branch_causality: "补分支因果",
  leaf_soil: "补叶片土壤",
  character_arc: "补人物弧光",
};

function sourceLabel(source: StoryTreeDispatchSource) {
  if (source === "chapter_draft") return "初稿";
  if (source === "chapter_second_pass") return "二改";
  return "前三章改写";
}

function priority(axis: StoryTreeQualityAxis, audit: StoryTreeQualityAudit) {
  const statusBoost = axis.status === "fail" ? 20 : 8;
  return Math.min(99, Math.max(55, 100 - axis.score + statusBoost + (audit.shouldRewrite ? 8 : 0)));
}

function dueLabel(axis: StoryTreeQualityAxis) {
  return axis.status === "fail" ? "今天返工" : "下次改稿前";
}

function href(input: StoryTreeDispatchInput) {
  return `/projects/${input.projectId}/chapters/${input.chapterId}#chapter-second-pass`;
}

export function buildStoryTreeRewriteDispatchItems(input: StoryTreeDispatchInput): GatePlatformGrowthDispatchItem[] {
  if (!input.audit.shouldRewrite) return [];
  const weakAxes = input.audit.axes
    .filter((axis) => axis.status !== "pass")
    .sort((left, right) => {
      if (left.status !== right.status) return left.status === "fail" ? -1 : 1;
      return left.score - right.score;
    })
    .slice(0, input.limit ?? 2);
  const now = new Date().toISOString();

  return weakAxes.map((axis): GatePlatformGrowthDispatchItem => ({
    id: `story-tree:${input.projectId}:${input.chapterId}:${input.source}:${axis.id}`,
    platformId: input.platform.id,
    platformName: input.platform.name,
    stage: axisStage[axis.id],
    state: "assigned",
    priorityScore: priority(axis, input.audit),
    ownerRole: axisOwner[axis.id],
    title: `${input.projectTitle} · 第 ${input.chapterOrder ?? "?"} 章${axisTitle[axis.id]}`,
    detail: `${sourceLabel(input.source)}后大树质检 ${input.audit.score} 分，「${axis.label}」只有 ${axis.score} 分。${axis.suggestion}`,
    dueLabel: dueLabel(axis),
    actionLabel: "进入二改",
    href: href(input),
    acceptanceCriteria: [
      `把「${axis.label}」提升到 80 分以上，或写清无法提升的原因。`,
      "完成后重新生成或重新保存一次体检结果。",
      "返工说明必须包含：改了哪一段、服务哪条主线、如何推进人物选择。",
    ],
    evidence: [
      input.audit.summary,
      `${axis.label}：${axis.evidence}`,
      `返工动作：${axis.suggestion}`,
      ...input.audit.topActions.slice(0, 2),
    ],
    reviewLatestAt: now,
  }));
}
