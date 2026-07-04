import type { PlatformProfile } from "@/lib/platforms/platformProfiles";
import type { GatePlatformGrowthDispatchItem, GatePlatformGrowthReviewStage } from "./gateActionReceipts.ts";
import type { SubmissionChecklistItem } from "./submissionChecklist.ts";

export interface SubmissionPrecheckRepairTarget {
  stage: GatePlatformGrowthReviewStage;
  ownerRole: string;
  href: string;
  actionLabel: string;
  dueLabel: string;
  instruction: string;
}

export interface SubmissionPrecheckRepairInput {
  projectId: string;
  projectTitle: string;
  platform: PlatformProfile;
  items: SubmissionChecklistItem[];
  existingDispatchKeys?: string[];
  limit?: number;
  now?: string;
}

const targetByItemId: Record<string, SubmissionPrecheckRepairTarget> = {
  title: {
    stage: "start_platform_package",
    ownerRole: "投稿资产编辑",
    href: "#submission-package",
    actionLabel: "补标题",
    dueLabel: "投稿前",
    instruction: "补一个能被读者一眼识别的书名，并同步到投稿包。",
  },
  genre: {
    stage: "start_platform_package",
    ownerRole: "投稿资产编辑",
    href: "#submission-package",
    actionLabel: "补题材",
    dueLabel: "投稿前",
    instruction: "补题材标签和平台定位，避免推荐和读者预期失焦。",
  },
  "selling-point": {
    stage: "start_platform_package",
    ownerRole: "投稿资产编辑",
    href: "#submission-package",
    actionLabel: "补卖点",
    dueLabel: "投稿前",
    instruction: "写清主角、冲突和看点，形成一句话卖点。",
  },
  "word-count": {
    stage: "start_first_three_review",
    ownerRole: "作者",
    href: "#chapter-production",
    actionLabel: "补正文",
    dueLabel: "下次生产前",
    instruction: "先补正文体量，再进入审稿和二改。",
  },
  "first-three": {
    stage: "start_first_three_review",
    ownerRole: "作者",
    href: "#chapter-production",
    actionLabel: "补前三章",
    dueLabel: "下次生产前",
    instruction: "补齐前三章卡片和正文，保证首轮留存样章完整。",
  },
  "opening-hooks": {
    stage: "start_opening_diagnostic",
    ownerRole: "作者",
    href: "#retention-diagnostic",
    actionLabel: "补钩子",
    dueLabel: "下次改稿前",
    instruction: "逐章补第一屏钩子，尤其是第一章的危机、选择或秘密。",
  },
  cliffhangers: {
    stage: "start_rewrite_opening",
    ownerRole: "作者",
    href: "#retention-diagnostic",
    actionLabel: "补悬念",
    dueLabel: "下次改稿前",
    instruction: "补章末新问题、反转或未完成选择，强化追读。",
  },
  "reviewed-first-three": {
    stage: "start_first_three_review",
    ownerRole: "审稿",
    href: "#review-pipeline",
    actionLabel: "审前三章",
    dueLabel: "投稿前",
    instruction: "先审前三章，再决定是否二改或进入发布准备。",
  },
  "final-readiness": {
    stage: "start_publish_finalize",
    ownerRole: "作者",
    href: "#serialization-ops",
    actionLabel: "处理定稿",
    dueLabel: "投稿前",
    instruction: "完成审稿、二改和结构复检后，把可发布章节标记定稿。",
  },
  "platform-risk": {
    stage: "start_repair_packaging",
    ownerRole: "运营",
    href: "#platform-export",
    actionLabel: "平台适配",
    dueLabel: "投稿前",
    instruction: "按目标平台风险重排简介、标签、卖点和投稿版本。",
  },
};

function targetFor(itemId: string) {
  return targetByItemId[itemId] ?? {
    stage: "start_platform_package" as const,
    ownerRole: "投稿资产编辑",
    href: "#submission-precheck",
    actionLabel: "修预检",
    dueLabel: "投稿前",
    instruction: "按投稿前检查项补齐缺口，并留下完成证据。",
  };
}

function priorityScore(item: SubmissionChecklistItem) {
  const base = item.status === "todo" ? 88 : 76;
  if (item.id === "word-count" || item.id === "first-three" || item.id === "reviewed-first-three") return base + 6;
  if (item.id === "platform-risk") return base + 4;
  return base;
}

export function buildSubmissionPrecheckRepairDispatches(input: SubmissionPrecheckRepairInput): GatePlatformGrowthDispatchItem[] {
  const now = input.now ?? new Date().toISOString();
  const existingDispatchKeys = new Set(input.existingDispatchKeys ?? []);
  const dispatches: GatePlatformGrowthDispatchItem[] = [];

  for (const item of input.items) {
    if (item.status !== "todo" && item.status !== "risk") continue;
    const target = targetFor(item.id);
    const dispatchKey = `submission-precheck:${input.projectId}:${item.id}`;
    if (existingDispatchKeys.has(dispatchKey)) continue;

    dispatches.push({
      id: dispatchKey,
      platformId: input.platform.id,
      platformName: input.platform.name,
      stage: target.stage,
      state: "assigned",
      priorityScore: priorityScore(item),
      ownerRole: target.ownerRole,
      title: `${input.projectTitle} · ${item.label}`,
      detail: `${item.detail} 修复要求：${target.instruction}`,
      dueLabel: target.dueLabel,
      actionLabel: target.actionLabel,
      href: `/projects/${input.projectId}${target.href}`,
      acceptanceCriteria: [
        `让「${item.label}」在投稿前检查里变成通过项，或写清暂时不能通过的原因。`,
        "保存对应正文、章节卡、投稿包或发布资产修改。",
        "完成证据必须说明改了哪里，以及为什么更符合目标平台。",
      ],
      evidence: [
        `投稿预检：${item.label} · ${item.status === "todo" ? "待处理" : "风险"}`,
        item.detail,
        `修复动作：${target.instruction}`,
      ],
      reviewLatestAt: now,
    });
  }

  return dispatches
    .sort((left, right) => right.priorityScore - left.priorityScore)
    .slice(0, input.limit ?? 5);
}
