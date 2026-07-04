import type { GateStoryTreeRecheck } from "../projects/gateActionReceipts.ts";
import type { StoryTreeQualityAudit } from "./storyTreeQualityAudit.ts";

export function storyTreeBaselineScore(evidence: string[]) {
  for (const item of evidence) {
    const match = item.match(/大树质检：[^，,]*[，,]\s*(\d+)\s*分/);
    if (!match) continue;
    const score = Number(match[1]);
    if (Number.isFinite(score)) return Math.max(0, Math.min(100, Math.round(score)));
  }
  return null;
}

export function storyTreeRecheckVerdict(previousScore: number | null, currentScore: number): GateStoryTreeRecheck["verdict"] {
  if (previousScore === null) return "unknown";
  const delta = currentScore - previousScore;
  if (delta >= 3) return "improved";
  if (delta <= -3) return "declined";
  return "unchanged";
}

export function storyTreeRecheckLine(recheck: GateStoryTreeRecheck) {
  const scoreText = recheck.previousScore === null
    ? `${recheck.currentScore} 分`
    : `${recheck.previousScore} -> ${recheck.currentScore} 分`;
  const verdictText = recheck.verdict === "improved"
    ? "分数变好"
    : recheck.verdict === "declined"
      ? "分数变差"
      : recheck.verdict === "unchanged"
        ? "分数未变"
        : "无历史基准";
  return `大树结构复检：${scoreText}，${verdictText}：${recheck.label}；返工动作：${recheck.topAction}`;
}

export function buildStoryTreeRecheck(input: {
  projectId: string;
  chapterId: string;
  previousScore: number | null;
  audit: StoryTreeQualityAudit;
}): GateStoryTreeRecheck {
  return {
    projectId: input.projectId,
    chapterId: input.chapterId,
    previousScore: input.previousScore,
    currentScore: input.audit.score,
    delta: input.previousScore === null ? null : input.audit.score - input.previousScore,
    label: input.audit.label,
    verdict: storyTreeRecheckVerdict(input.previousScore, input.audit.score),
    topAction: input.audit.topActions[0] ?? "继续按大树结构补强章节。",
    axisSummary: input.audit.axes.map((axis) => `${axis.label} ${axis.score} 分/${axis.status}`),
  };
}
