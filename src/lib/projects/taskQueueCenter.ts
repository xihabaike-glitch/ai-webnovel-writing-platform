import { buildBatchDraftQueue } from "../ai/batchDrafts.ts";
import { buildReviewPipelineQueue } from "../ai/batchReviewPipeline.ts";
import { getPlatformProfile, type PlatformId } from "../platforms/platformProfiles.ts";
import { buildFirstDayRiskProfile, type FirstDayRiskLevel } from "./firstDayWorkflow.ts";
import { buildPlatformPublishExportCenter } from "./platformPublishExport.ts";
import { findProjectStartTacticSummary, type ProjectStartTacticEntryLike, type ProjectStartTacticSummary } from "./projectStartTactics.ts";

export interface TaskQueueProject {
  id: string;
  title: string;
  targetPlatform: string;
  targetWordCount: number;
  currentWordCount: number;
  genre: string;
  sellingPoint: string;
  chapters: Array<{
    id: string;
    order: number;
    title: string;
    content: string;
    wordCount: number;
    goal: string;
    hook: string;
    conflict: string;
    valueShift: string;
    cliffhanger: string;
    status: string;
  }>;
  aiTasks: Array<{
    id: string;
    chapterId: string | null;
    taskType: string;
    status: string;
    outputText: string | null;
    errorMessage: string | null;
    createdAt: Date | string;
  }>;
  worldEntries?: ProjectStartTacticEntryLike[];
}

export interface QueueItem {
  id: string;
  projectId: string;
  projectTitle: string;
  platformName: string;
  category: "draft" | "review" | "second_pass" | "export" | "blocked";
  blockerType: "chapter_card" | "publish_repair" | "risk_recovery" | null;
  label: string;
  chapterTitle: string;
  evidence: string;
  strategyBasis?: ProjectStartTacticSummary | null;
  riskLevel: FirstDayRiskLevel;
  riskLabel: string;
  riskNotice: string | null;
  actionLabel: string;
  href: string;
  priority: number;
}

export interface TaskQueueCenter {
  overview: {
    totalItems: number;
    draftReady: number;
    reviewReady: number;
    secondPassReady: number;
    exportReady: number;
    blockedCards: number;
    publishBlocked: number;
    chapterCardBlocked: number;
    riskRecoveryBlocked: number;
    watchItems: number;
  };
  items: QueueItem[];
  recommendedNext: QueueItem | null;
}

const categoryPriority: Record<QueueItem["category"], number> = {
  review: 10,
  second_pass: 20,
  draft: 30,
  export: 40,
  blocked: 90,
};

function categoryLabel(category: QueueItem["category"]) {
  const labels: Record<QueueItem["category"], string> = {
    draft: "待生成",
    review: "待审稿",
    second_pass: "待二改",
    export: "待导出",
    blocked: "卡住",
  };
  return labels[category];
}

function item(input: Omit<QueueItem, "label" | "priority" | "blockerType" | "riskLevel" | "riskLabel" | "riskNotice"> & {
  blockerType?: QueueItem["blockerType"];
  riskLevel?: QueueItem["riskLevel"];
  riskLabel?: string;
  riskNotice?: string | null;
}): QueueItem {
  return {
    ...input,
    blockerType: input.blockerType ?? null,
    riskLevel: input.riskLevel ?? "standard",
    riskLabel: input.riskLabel ?? "标准",
    riskNotice: input.riskNotice ?? null,
    label: categoryLabel(input.category),
    priority: categoryPriority[input.category],
  };
}

export function buildTaskQueueCenter(projects: TaskQueueProject[]): TaskQueueCenter {
  const items = projects.flatMap((project) => {
    const platform = getPlatformProfile(project.targetPlatform as PlatformId);
    const projectHref = `/projects/${project.id}`;
    const startTactic = findProjectStartTacticSummary(project.worldEntries ?? []);
    const riskProfile = buildFirstDayRiskProfile(startTactic);
    const riskNotice = riskProfile.level === "blocked"
      ? `${riskProfile.headline}${riskProfile.instruction}`
      : riskProfile.level === "watch"
        ? `${riskProfile.headline}${riskProfile.instruction}`
        : null;
    const draftQueue = buildBatchDraftQueue(project.chapters, project.aiTasks, platform);
    const reviewQueue = buildReviewPipelineQueue(project.chapters, project.aiTasks, 5, startTactic);
    const exportCenter = buildPlatformPublishExportCenter({
      project: {
        title: project.title,
        genre: project.genre,
        sellingPoint: project.sellingPoint,
        currentWordCount: project.currentWordCount,
        targetWordCount: project.targetWordCount,
      },
      targetPlatform: platform,
      chapters: project.chapters,
      aiTasks: project.aiTasks,
    });
    const queueItems: QueueItem[] = [];

    if (riskProfile.level === "blocked" && draftQueue.candidates.some((candidate) => candidate.status === "ready")) {
      queueItems.push(item({
        id: `${project.id}:risk-recovery:${platform.id}`,
        projectId: project.id,
        projectTitle: project.title,
        platformName: platform.name,
        category: "blocked",
        blockerType: "risk_recovery",
        chapterTitle: "首日止损恢复",
        evidence: `${riskProfile.headline}${riskProfile.instruction}`,
        strategyBasis: startTactic,
        riskLevel: riskProfile.level,
        riskLabel: riskProfile.label,
        riskNotice,
        actionLabel: "做恢复验证",
        href: `${projectHref}#first-day-workflow`,
      }));
    }

    for (const candidate of draftQueue.candidates.filter((candidate) => candidate.status === "ready")) {
      if (riskProfile.level === "blocked") continue;
      queueItems.push(item({
        id: `${project.id}:draft:${candidate.chapterId}`,
        projectId: project.id,
        projectTitle: project.title,
        platformName: platform.name,
        category: "draft",
        chapterTitle: candidate.title,
        evidence: riskProfile.level === "watch" ? `${candidate.reason} ${riskProfile.instruction}` : candidate.reason,
        strategyBasis: startTactic,
        riskLevel: riskProfile.level,
        riskLabel: riskProfile.label,
        riskNotice,
        actionLabel: riskProfile.level === "watch" ? "生成小样本" : "生成初稿",
        href: `${projectHref}/chapters/${candidate.chapterId}`,
      }));
    }

    for (const candidate of reviewQueue.candidates.filter((candidate) => candidate.recommendedReview)) {
      queueItems.push(item({
        id: `${project.id}:review:${candidate.chapterId}`,
        projectId: project.id,
        projectTitle: project.title,
        platformName: platform.name,
        category: "review",
        chapterTitle: candidate.title,
        evidence: candidate.reason,
        strategyBasis: startTactic,
        riskLevel: riskProfile.level,
        riskLabel: riskProfile.label,
        riskNotice,
        actionLabel: "审稿",
        href: `${projectHref}/chapters/${candidate.chapterId}`,
      }));
    }

    for (const candidate of reviewQueue.candidates.filter((candidate) => candidate.recommendedSecondPass)) {
      queueItems.push(item({
        id: `${project.id}:second-pass:${candidate.chapterId}`,
        projectId: project.id,
        projectTitle: project.title,
        platformName: platform.name,
        category: "second_pass",
        chapterTitle: candidate.title,
        evidence: candidate.instruction,
        strategyBasis: startTactic,
        riskLevel: riskProfile.level,
        riskLabel: riskProfile.label,
        riskNotice,
        actionLabel: "二改",
        href: `${projectHref}/chapters/${candidate.chapterId}`,
      }));
    }

    const targetPackage = exportCenter.packages.find((pack) => pack.platformId === platform.id) ?? exportCenter.packages[0];
    if (exportCenter.totalPublishableChapters > 0 && targetPackage.canExport) {
      queueItems.push(item({
        id: `${project.id}:export:${platform.id}`,
        projectId: project.id,
        projectTitle: project.title,
        platformName: platform.name,
        category: "export",
        chapterTitle: `${targetPackage.platformName} 发布包`,
        evidence: `${exportCenter.totalPublishableChapters} 章有正文可导出，${targetPackage.warnings.length} 条发布提醒。`,
        strategyBasis: startTactic,
        riskLevel: riskProfile.level,
        riskLabel: riskProfile.label,
        riskNotice,
        actionLabel: "导出平台包",
        href: `${projectHref}#platform-export`,
      }));
    } else if (exportCenter.totalPublishableChapters > 0 && targetPackage.repairPath.status === "needs_repair") {
      queueItems.push(item({
        id: `${project.id}:publish-repair:${platform.id}`,
        projectId: project.id,
        projectTitle: project.title,
        platformName: platform.name,
        category: "blocked",
        blockerType: "publish_repair",
        chapterTitle: `${targetPackage.platformName} 发布质检`,
        evidence: targetPackage.repairPath.headline,
        strategyBasis: startTactic,
        riskLevel: riskProfile.level,
        riskLabel: riskProfile.label,
        riskNotice,
        actionLabel: targetPackage.repairPath.nextStep?.label ?? "处理发布阻塞",
        href: `${projectHref}#platform-export`,
      }));
    }

    for (const candidate of draftQueue.candidates.filter((candidate) => candidate.status === "needs_card").slice(0, 3)) {
      queueItems.push(item({
        id: `${project.id}:blocked:${candidate.chapterId}`,
        projectId: project.id,
        projectTitle: project.title,
        platformName: platform.name,
        category: "blocked",
        blockerType: "chapter_card",
        chapterTitle: candidate.title,
        evidence: candidate.reason,
        strategyBasis: startTactic,
        riskLevel: riskProfile.level,
        riskLabel: riskProfile.label,
        riskNotice,
        actionLabel: "补章节卡",
        href: `${projectHref}/chapters/${candidate.chapterId}`,
      }));
    }

    return queueItems;
  }).sort((left, right) => (
    left.priority - right.priority
    || left.projectTitle.localeCompare(right.projectTitle)
    || left.chapterTitle.localeCompare(right.chapterTitle)
  ));

  return {
    overview: {
      totalItems: items.length,
      draftReady: items.filter((entry) => entry.category === "draft").length,
      reviewReady: items.filter((entry) => entry.category === "review").length,
      secondPassReady: items.filter((entry) => entry.category === "second_pass").length,
      exportReady: items.filter((entry) => entry.category === "export").length,
      blockedCards: items.filter((entry) => entry.category === "blocked").length,
      publishBlocked: items.filter((entry) => entry.blockerType === "publish_repair").length,
      chapterCardBlocked: items.filter((entry) => entry.blockerType === "chapter_card").length,
      riskRecoveryBlocked: items.filter((entry) => entry.blockerType === "risk_recovery").length,
      watchItems: items.filter((entry) => entry.riskLevel === "watch").length,
    },
    items,
    recommendedNext: items.find((entry) => entry.category !== "blocked") ?? items[0] ?? null,
  };
}
