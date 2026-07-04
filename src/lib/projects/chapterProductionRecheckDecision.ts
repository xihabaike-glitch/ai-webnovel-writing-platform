import type { GateEvidenceLoopRecheck, GateStoryTreeRecheck } from "./gateActionReceipts.ts";

export interface ChapterProductionRecheckPayload {
  storyTreeRecheck?: GateStoryTreeRecheck | null;
  evidenceLoopRecheck?: GateEvidenceLoopRecheck | null;
  followUpTasks?: unknown[];
}

export interface ChapterProductionRecheckDecision {
  status: "cleared" | "needs_action" | "watch";
  title: string;
  detail: string;
  href: string;
  label: string;
}

interface DecisionFallback {
  href: string;
  label: string;
}

function scoreText(previousScore: number | null, currentScore: number) {
  return previousScore === null ? `${currentScore} 分` : `${previousScore} -> ${currentScore} 分`;
}

function storyTreeLine(recheck: GateStoryTreeRecheck) {
  const verdictText = recheck.verdict === "improved"
    ? "结构变好"
    : recheck.verdict === "declined"
      ? "结构变差"
      : recheck.verdict === "unchanged"
        ? "结构未动"
        : "缺少基准";
  return `大树结构 ${scoreText(recheck.previousScore, recheck.currentScore)}，${verdictText}：${recheck.topAction}`;
}

function evidenceLoopLine(recheck: GateEvidenceLoopRecheck) {
  const verdictText = recheck.verdict === "improved"
    ? "证据变强"
    : recheck.verdict === "declined"
      ? "证据变弱"
      : recheck.verdict === "unchanged"
        ? "证据未动"
        : "缺少基准";
  return `平台证据 ${scoreText(recheck.previousScore, recheck.currentScore)}，${verdictText}：${recheck.nextAction}`;
}

function storyTreeNeedsAction(recheck: GateStoryTreeRecheck) {
  return recheck.verdict === "declined" || recheck.verdict === "unchanged" || recheck.currentScore < 80;
}

function evidenceLoopNeedsAction(recheck: GateEvidenceLoopRecheck) {
  return recheck.verdict === "declined" || recheck.verdict === "unchanged" || recheck.status === "pause" || recheck.status === "repair";
}

export function buildChapterProductionRecheckDecision(
  payloads: ChapterProductionRecheckPayload[],
  fallback: DecisionFallback,
): ChapterProductionRecheckDecision {
  const storyTreeRechecks = payloads
    .map((payload) => payload.storyTreeRecheck)
    .filter((item): item is GateStoryTreeRecheck => Boolean(item));
  const evidenceLoopRechecks = payloads
    .map((payload) => payload.evidenceLoopRecheck)
    .filter((item): item is GateEvidenceLoopRecheck => Boolean(item));
  const detailLines = [
    ...storyTreeRechecks.map(storyTreeLine),
    ...evidenceLoopRechecks.map(evidenceLoopLine),
  ];
  const needsAction = storyTreeRechecks.some(storyTreeNeedsAction) || evidenceLoopRechecks.some(evidenceLoopNeedsAction);
  const hasUnknown = [...storyTreeRechecks, ...evidenceLoopRechecks].some((recheck) => recheck.verdict === "unknown");

  if (detailLines.length === 0) {
    return {
      status: "watch",
      title: `复查完成：已刷新 ${payloads.length} 条派单证据`,
      detail: "没有拿到新的结构或平台证据分数，先回到对应区域人工确认卡点是否解除。",
      href: fallback.href,
      label: fallback.label,
    };
  }

  if (needsAction) {
    return {
      status: "needs_action",
      title: "复查未解除：需要继续修复或重新派单",
      detail: detailLines.join("；"),
      href: fallback.href,
      label: "继续处理",
    };
  }

  if (hasUnknown) {
    return {
      status: "watch",
      title: "复查进入观察：缺少历史基准",
      detail: detailLines.join("；"),
      href: fallback.href,
      label: fallback.label,
    };
  }

  return {
    status: "cleared",
    title: "复查通过：当前卡点可以放行",
    detail: detailLines.join("；"),
    href: fallback.href,
    label: fallback.label,
  };
}
