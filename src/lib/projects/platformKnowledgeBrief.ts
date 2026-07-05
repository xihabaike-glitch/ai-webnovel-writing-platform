import type { GatePlatformTacticExperienceLibrary, GatePlatformTacticExperienceStatus } from "./gateActionReceipts.ts";

export interface PlatformKnowledgeBriefReceipt {
  id: string;
  platformId: string;
  platformName: string;
  actionLabel: string;
  title: string;
  message: string;
  completedStepLabel: string;
  stopReason: string;
  nextAction: string;
  href: string;
  severity: "success" | "needs_action";
  createdAt: Date | string;
}

export type PlatformKnowledgeBriefStatus = "empty" | "learned" | "needs_action" | "watch";

export interface PlatformKnowledgeBrief {
  status: PlatformKnowledgeBriefStatus;
  label: string;
  headline: string;
  detail: string;
  nextAction: string;
  actionHref: string;
  targetPlatformName: string | null;
  totalReceipts: number;
  successCount: number;
  needsActionCount: number;
  reusableCount: number;
  watchCount: number;
  blockedCount: number;
  signals: string[];
  recent: Array<{
    id: string;
    platformName: string;
    title: string;
    actionLabel: string;
    severity: "success" | "needs_action";
    createdAt: string;
  }>;
}

function toIso(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
}

function statusText(status: GatePlatformTacticExperienceStatus) {
  if (status === "usable") return "可复用";
  if (status === "blocked") return "避坑";
  return "观察";
}

export function buildPlatformKnowledgeBrief(input: {
  feedbackReceipts?: PlatformKnowledgeBriefReceipt[];
  tacticLibrary: GatePlatformTacticExperienceLibrary;
  targetPlatformId?: string | null;
}): PlatformKnowledgeBrief {
  const receipts = [...(input.feedbackReceipts ?? [])]
    .sort((left, right) => new Date(toIso(right.createdAt)).getTime() - new Date(toIso(left.createdAt)).getTime());
  const latest = receipts[0] ?? null;
  const targetExperience = input.targetPlatformId
    ? input.tacticLibrary.items.find((item) => item.platformId === input.targetPlatformId) ?? null
    : null;
  const topExperience = targetExperience ?? input.tacticLibrary.items[0] ?? null;
  const successCount = receipts.filter((item) => item.severity === "success").length;
  const needsActionCount = receipts.filter((item) => item.severity === "needs_action").length;
  const reusableCount = input.tacticLibrary.summary.usable;
  const watchCount = input.tacticLibrary.summary.watch;
  const blockedCount = input.tacticLibrary.summary.blocked;

  if (!latest && !topExperience) {
    return {
      status: "empty",
      label: "缺经验",
      headline: "还没有平台经验能拿来复用。",
      detail: "先保存发布基准、录入真实发布效果，再让平台反馈反哺开书和投稿包装。",
      nextAction: "去录入发布效果",
      actionHref: "#publish-effect-panel",
      targetPlatformName: null,
      totalReceipts: 0,
      successCount: 0,
      needsActionCount: 0,
      reusableCount: 0,
      watchCount: 0,
      blockedCount: 0,
      signals: ["缺真实发布效果", "缺平台打法经验"],
      recent: [],
    };
  }

  const status: PlatformKnowledgeBriefStatus = latest?.severity === "success"
    ? "learned"
    : latest?.severity === "needs_action"
      ? "needs_action"
      : topExperience?.status === "usable"
        ? "learned"
        : topExperience?.status === "blocked"
          ? "needs_action"
          : "watch";
  const label = status === "learned"
    ? "可复用"
    : status === "needs_action"
      ? "要处理"
      : "先观察";
  const signals = [
    latest?.completedStepLabel,
    latest?.stopReason,
    topExperience ? `${topExperience.platformName} ${statusText(topExperience.status)}：${topExperience.tactic}` : null,
    topExperience?.reuseHint,
  ].filter((item): item is string => Boolean(item?.trim())).slice(0, 4);

  return {
    status,
    label,
    headline: latest?.title || `${topExperience?.platformName ?? "平台"} 打法经验已生成`,
    detail: latest?.message || topExperience?.lesson || "平台经验已进入打法库，可以用于下一轮项目选择、投稿包装和前三章重写。",
    nextAction: latest?.nextAction || topExperience?.reuseHint || input.tacticLibrary.nextActions[0] || "回看平台打法库。",
    actionHref: latest?.href || topExperience?.href || "#platform-tactic-library",
    targetPlatformName: latest?.platformName ?? topExperience?.platformName ?? null,
    totalReceipts: receipts.length,
    successCount,
    needsActionCount,
    reusableCount,
    watchCount,
    blockedCount,
    signals,
    recent: receipts.slice(0, 3).map((receipt) => ({
      id: receipt.id,
      platformName: receipt.platformName,
      title: receipt.title,
      actionLabel: receipt.actionLabel,
      severity: receipt.severity,
      createdAt: toIso(receipt.createdAt),
    })),
  };
}
