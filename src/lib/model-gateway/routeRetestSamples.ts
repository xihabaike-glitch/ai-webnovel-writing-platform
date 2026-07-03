import { buildBatchDraftQueue, type BatchDraftChapter, type BatchDraftTask } from "../ai/batchDrafts.ts";
import { buildReviewPipelineQueue, type ReviewPipelineChapter, type ReviewPipelineTask } from "../ai/batchReviewPipeline.ts";
import { getPlatformProfile, type PlatformId } from "../platforms/platformProfiles.ts";
import type { RouteAvoidanceRetestQueueItem } from "./routeRecommendations.ts";

export interface RouteRetestSampleProject {
  id: string;
  title: string;
  targetPlatform: string;
  chapters: Array<BatchDraftChapter & ReviewPipelineChapter>;
  aiTasks: Array<BatchDraftTask & ReviewPipelineTask>;
}

export interface RouteRetestSamplePlan {
  canRun: boolean;
  status: "ready" | "needs_scope" | "unsupported" | "no_samples";
  taskType: string | null;
  projectId: string | null;
  projectTitle: string | null;
  chapterIds: string[];
  sampleCount: number;
  actionLabel: string;
  reason: string;
  warning: string;
}

function unsupportedPlan(item: RouteAvoidanceRetestQueueItem, status: RouteRetestSamplePlan["status"], reason: string): RouteRetestSamplePlan {
  return {
    canRun: false,
    status,
    taskType: item.taskType,
    projectId: null,
    projectTitle: null,
    chapterIds: [],
    sampleCount: 0,
    actionLabel: "暂不可运行",
    reason,
    warning: "复测模式不会绕过模型治理；需要明确任务类型和样本后再执行。",
  };
}

export function buildRouteAvoidanceRetestSamplePlan(
  item: RouteAvoidanceRetestQueueItem,
  projects: RouteRetestSampleProject[],
): RouteRetestSamplePlan {
  if (!item.taskType) {
    return unsupportedPlan(item, "needs_scope", "这条避坑规则仍是全局范围，先限定任务类型，再跑复测样本。");
  }
  if (item.taskType !== "chapter_draft" && item.taskType !== "chapter_review") {
    return unsupportedPlan(item, "unsupported", `「${item.taskScope}」暂未接入自动复测样本执行。`);
  }

  for (const project of projects) {
    const limit = item.recommendedSampleSize;
    const chapterIds = item.taskType === "chapter_draft"
      ? buildBatchDraftQueue(project.chapters, project.aiTasks, getPlatformProfile(project.targetPlatform as PlatformId), limit).recommendedChapterIds
      : buildReviewPipelineQueue(project.chapters, project.aiTasks, limit).recommendedReviewChapterIds;

    if (chapterIds.length > 0) {
      return {
        canRun: true,
        status: "ready",
        taskType: item.taskType,
        projectId: project.id,
        projectTitle: project.title,
        chapterIds,
        sampleCount: chapterIds.length,
        actionLabel: `运行 ${chapterIds.length} 个复测样本`,
        reason: `已从「${project.title}」挑出 ${chapterIds.length} 个「${item.taskScope}」样本。`,
        warning: "复测模式会标记样本来源；下一步需要指定被观察模型执行，避免普通路由绕开它。",
      };
    }
  }

  return unsupportedPlan(item, "no_samples", `当前没有适合「${item.taskScope}」的复测样本。`);
}
