import type { PlatformProfile } from "@/lib/platforms/platformProfiles";

export interface DashboardChapter {
  id: string;
  title: string;
  order: number;
  status: string;
  wordCount: number;
  updatedAt: Date | string;
  aiTasks?: Array<{
    taskType: string;
    status: string;
    createdAt: Date | string;
  }>;
}

export interface DashboardAiTask {
  id: string;
  taskType: string;
  status: string;
  model: string;
  createdAt: Date | string;
  chapter?: {
    id: string;
    title: string;
  } | null;
  modelProvider?: {
    providerId: string;
    displayName: string;
  };
}

export interface ProjectDashboardInput {
  currentWordCount: number;
  targetWordCount: number;
  platform: PlatformProfile;
  chapters: DashboardChapter[];
  aiTasks: DashboardAiTask[];
}

export interface ProjectDashboardSummary {
  progressPercent: number;
  totalChapters: number;
  totalWords: number;
  targetWords: number;
  statusCounts: Record<string, number>;
  reviewedChapterIds: string[];
  unreviewedChapters: DashboardChapter[];
  nextChapter: DashboardChapter | null;
  recentTasks: DashboardAiTask[];
  platformWarnings: string[];
}

const chapterStatusOrder = ["outline", "draft", "revising", "final"];

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function buildProjectDashboard(input: ProjectDashboardInput): ProjectDashboardSummary {
  const statusCounts = chapterStatusOrder.reduce<Record<string, number>>((counts, status) => {
    counts[status] = 0;
    return counts;
  }, {});

  for (const chapter of input.chapters) {
    statusCounts[chapter.status] = (statusCounts[chapter.status] ?? 0) + 1;
  }

  const reviewedChapterIds = input.aiTasks
    .filter((task) => task.taskType === "chapter_review" && task.status === "succeeded" && task.chapter)
    .map((task) => task.chapter?.id)
    .filter((id): id is string => Boolean(id));
  const reviewedSet = new Set(reviewedChapterIds);
  const unreviewedChapters = input.chapters.filter((chapter) => chapter.wordCount > 0 && !reviewedSet.has(chapter.id));
  const nextChapter = input.chapters.find((chapter) => chapter.status !== "final") ?? input.chapters.at(-1) ?? null;
  const progressPercent = input.targetWordCount > 0
    ? clampPercent((input.currentWordCount / input.targetWordCount) * 100)
    : 0;
  const platformWarnings = [
    ...input.platform.risks,
    ...(unreviewedChapters.length > 0 ? [`${unreviewedChapters.length} 章已有正文但未审稿`] : []),
    ...(input.chapters.length === 0 ? ["还没有章节，项目无法进入写作闭环"] : []),
  ];

  return {
    progressPercent,
    totalChapters: input.chapters.length,
    totalWords: input.currentWordCount,
    targetWords: input.targetWordCount,
    statusCounts,
    reviewedChapterIds,
    unreviewedChapters,
    nextChapter,
    recentTasks: input.aiTasks.slice(0, 6),
    platformWarnings,
  };
}
