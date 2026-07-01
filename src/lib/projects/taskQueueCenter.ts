import { buildBatchDraftQueue } from "../ai/batchDrafts.ts";
import { buildReviewPipelineQueue } from "../ai/batchReviewPipeline.ts";
import { getPlatformProfile, type PlatformId } from "../platforms/platformProfiles.ts";
import { buildPlatformPublishExportCenter } from "./platformPublishExport.ts";

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
}

export interface QueueItem {
  id: string;
  projectId: string;
  projectTitle: string;
  platformName: string;
  category: "draft" | "review" | "second_pass" | "export" | "blocked";
  label: string;
  chapterTitle: string;
  evidence: string;
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

function item(input: Omit<QueueItem, "label" | "priority">): QueueItem {
  return {
    ...input,
    label: categoryLabel(input.category),
    priority: categoryPriority[input.category],
  };
}

export function buildTaskQueueCenter(projects: TaskQueueProject[]): TaskQueueCenter {
  const items = projects.flatMap((project) => {
    const platform = getPlatformProfile(project.targetPlatform as PlatformId);
    const projectHref = `/projects/${project.id}`;
    const draftQueue = buildBatchDraftQueue(project.chapters, project.aiTasks, platform);
    const reviewQueue = buildReviewPipelineQueue(project.chapters, project.aiTasks);
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
    });
    const queueItems: QueueItem[] = [];

    for (const candidate of draftQueue.candidates.filter((candidate) => candidate.status === "ready")) {
      queueItems.push(item({
        id: `${project.id}:draft:${candidate.chapterId}`,
        projectId: project.id,
        projectTitle: project.title,
        platformName: platform.name,
        category: "draft",
        chapterTitle: candidate.title,
        evidence: candidate.reason,
        actionLabel: "生成初稿",
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
        actionLabel: "二改",
        href: `${projectHref}/chapters/${candidate.chapterId}`,
      }));
    }

    if (exportCenter.totalPublishableChapters > 0) {
      const targetPackage = exportCenter.packages.find((pack) => pack.platformId === platform.id) ?? exportCenter.packages[0];
      queueItems.push(item({
        id: `${project.id}:export:${platform.id}`,
        projectId: project.id,
        projectTitle: project.title,
        platformName: platform.name,
        category: "export",
        chapterTitle: `${targetPackage.platformName} 发布包`,
        evidence: `${exportCenter.totalPublishableChapters} 章有正文可导出，${targetPackage.warnings.length} 条发布提醒。`,
        actionLabel: "导出平台包",
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
        chapterTitle: candidate.title,
        evidence: candidate.reason,
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
    },
    items,
    recommendedNext: items.find((entry) => entry.category !== "blocked") ?? items[0] ?? null,
  };
}
