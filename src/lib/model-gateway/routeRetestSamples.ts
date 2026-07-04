import { buildBatchDraftQueue, type BatchDraftChapter, type BatchDraftTask } from "../ai/batchDrafts.ts";
import { buildReviewPipelineQueue, type ReviewPipelineChapter, type ReviewPipelineTask } from "../ai/batchReviewPipeline.ts";
import { getPlatformProfile, type PlatformId } from "../platforms/platformProfiles.ts";
import type { RouteConfirmationRecheckAdviceItem, RouteConfirmationRecheckSamplePlan } from "./routeConfirmation.ts";
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
  providerConfigId: string | null;
  providerId: string | null;
  model: string | null;
  projectId: string | null;
  projectTitle: string | null;
  chapterIds: string[];
  sampleCount: number;
  actionLabel: string;
  reason: string;
  warning: string;
}

export interface RouteRetestEvidencePlan {
  providerName: string;
  model: string | null;
  taskScope: string;
  sampleCount: number;
}

export interface RouteRetestEvidenceResult {
  status: string;
  score: number | null;
  routeRole: string | null;
  error: string | null;
}

export interface RouteRetestEvidence {
  successRatePercent: number;
  averageQualityScore: number | null;
  fallbackUsed: boolean;
  completionEvidence: string;
  evidence: string[];
}

export interface RouteConfirmationRecheckExecutionPlan {
  canRun: boolean;
  status: "ready" | "unsupported" | "no_samples";
  taskType: RouteConfirmationRecheckAdviceItem["taskType"];
  projectId: string | null;
  projectTitle: string | null;
  chapterIds: string[];
  sampleCount: number;
  actionLabel: string;
  reason: string;
  warning: string;
}

export interface RouteConfirmationRecheckEvidencePlan {
  routeLabel: string;
  taskScope: string;
  sampleCount: number;
}

function unsupportedPlan(item: RouteAvoidanceRetestQueueItem, status: RouteRetestSamplePlan["status"], reason: string): RouteRetestSamplePlan {
  return {
    canRun: false,
    status,
    taskType: item.taskType,
    providerConfigId: item.providerConfigId,
    providerId: item.providerId,
    model: item.model,
    projectId: null,
    projectTitle: null,
    chapterIds: [],
    sampleCount: 0,
    actionLabel: "暂不可运行",
    reason,
    warning: "复测模式不会绕过模型治理；需要明确任务类型和样本后再执行。",
  };
}

function unsupportedConfirmationPlan(
  advice: RouteConfirmationRecheckAdviceItem,
  status: RouteConfirmationRecheckExecutionPlan["status"],
  reason: string,
): RouteConfirmationRecheckExecutionPlan {
  return {
    canRun: false,
    status,
    taskType: advice.taskType,
    projectId: null,
    projectTitle: null,
    chapterIds: [],
    sampleCount: 0,
    actionLabel: "暂不可运行",
    reason,
    warning: "当前只支持正文初稿和章节审稿的自动复检样本，其它模型路线先用人工派单闭环。",
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
        providerConfigId: item.providerConfigId,
        providerId: item.providerId,
        model: item.model,
        projectId: project.id,
        projectTitle: project.title,
        chapterIds,
        sampleCount: chapterIds.length,
        actionLabel: `运行 ${chapterIds.length} 个复测样本`,
        reason: `已从「${project.title}」挑出 ${chapterIds.length} 个「${item.taskScope}」样本。`,
        warning: `复测模式将强制使用「${item.providerName} · ${item.model}」，不会走普通备用路线。`,
      };
    }
  }

  return unsupportedPlan(item, "no_samples", `当前没有适合「${item.taskScope}」的复测样本。`);
}

export function buildRouteAvoidanceRetestEvidence({
  plan,
  results,
}: {
  plan: RouteRetestEvidencePlan;
  results: RouteRetestEvidenceResult[];
}): RouteRetestEvidence {
  const total = results.length || plan.sampleCount;
  const succeeded = results.filter((result) => result.status === "succeeded").length;
  const successRatePercent = total > 0 ? Math.round((succeeded / total) * 100) : 0;
  const scores = results
    .map((result) => result.score)
    .filter((score): score is number => typeof score === "number");
  const averageQualityScore = scores.length
    ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
    : null;
  const fallbackUsed = results.some((result) => result.routeRole === "fallback" || result.routeRole === "auto" || result.routeRole === "primary");
  const errors = results
    .map((result) => result.error)
    .filter((error): error is string => Boolean(error?.trim()));
  const fallbackEvidence = fallbackUsed ? "命中备用路线" : "未命中备用路线";
  const errorEvidence = errors.length ? `失败原因：${errors.slice(0, 2).join("；")}` : "执行稳定";
  const qualityText = averageQualityScore === null ? "未填" : String(averageQualityScore);
  const completionEvidence = [
    `完成 ${total} 个「${plan.taskScope}」小样本复测`,
    `${plan.providerName} · ${plan.model ?? "默认模型"}`,
    `成功率 ${successRatePercent}%`,
    `质量 ${qualityText}`,
    fallbackEvidence,
    errorEvidence,
  ].join("，");

  return {
    successRatePercent,
    averageQualityScore,
    fallbackUsed,
    completionEvidence,
    evidence: [
      completionEvidence,
      `复测模型：${plan.providerName} · ${plan.model ?? "默认模型"}`,
      `复测样本：${total} 个，成功 ${succeeded} 个`,
    ],
  };
}

export function buildRouteConfirmationRecheckExecutionPlan(
  advice: RouteConfirmationRecheckAdviceItem,
  samplePlan: RouteConfirmationRecheckSamplePlan,
  projects: RouteRetestSampleProject[],
): RouteConfirmationRecheckExecutionPlan {
  if (advice.taskType !== "chapter_draft" && advice.taskType !== "chapter_review") {
    return unsupportedConfirmationPlan(advice, "unsupported", `「${samplePlan.label}」暂未接入自动复检样本执行。`);
  }

  for (const project of projects) {
    const limit = samplePlan.sampleCount;
    const chapterIds = advice.taskType === "chapter_draft"
      ? buildBatchDraftQueue(project.chapters, project.aiTasks, getPlatformProfile(project.targetPlatform as PlatformId), limit).recommendedChapterIds
      : buildReviewPipelineQueue(project.chapters, project.aiTasks, limit).recommendedReviewChapterIds;

    if (chapterIds.length > 0) {
      return {
        canRun: true,
        status: "ready",
        taskType: advice.taskType,
        projectId: project.id,
        projectTitle: project.title,
        chapterIds,
        sampleCount: chapterIds.length,
        actionLabel: `运行 ${chapterIds.length} 个复检样本`,
        reason: `已从「${project.title}」挑出 ${chapterIds.length} 个「${samplePlan.label}」复检样本。`,
        warning: `复检将按当前模型路由执行：${samplePlan.routeLabel}。`,
      };
    }
  }

  return unsupportedConfirmationPlan(advice, "no_samples", `当前没有适合「${samplePlan.label}」的自动复检样本。`);
}

export function buildRouteConfirmationRecheckExecutionEvidence({
  plan,
  results,
}: {
  plan: RouteConfirmationRecheckEvidencePlan;
  results: RouteRetestEvidenceResult[];
}): RouteRetestEvidence {
  const total = results.length || plan.sampleCount;
  const succeeded = results.filter((result) => result.status === "succeeded").length;
  const successRatePercent = total > 0 ? Math.round((succeeded / total) * 100) : 0;
  const scores = results
    .map((result) => result.score)
    .filter((score): score is number => typeof score === "number");
  const averageQualityScore = scores.length
    ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
    : null;
  const fallbackUsed = results.some((result) => result.routeRole === "fallback" || result.routeRole === "auto");
  const hasFailure = results.some((result) => result.status !== "succeeded" || Boolean(result.error?.trim()));
  const qualityText = averageQualityScore === null ? "未填" : String(averageQualityScore);
  const fallbackText = fallbackUsed ? "命中备用" : "未命中备用";
  const needsGovernance = hasFailure || fallbackUsed || successRatePercent < 90 || (averageQualityScore !== null && averageQualityScore < 80);
  const completionEvidence = [
    `复检${plan.taskScope}模型路由`,
    `样本数：${total}`,
    `模型组合：${plan.routeLabel}`,
    `成功率：${successRatePercent}%`,
    `质量：${qualityText}`,
    "成本：按任务实耗回看",
    `备用命中：${fallbackText}`,
    `是否需要治理：${needsGovernance ? "是，原因：复检仍有失败、备用命中或质量/成功率未达标" : "否"}`,
  ].join("\n");

  return {
    successRatePercent,
    averageQualityScore,
    fallbackUsed,
    completionEvidence,
    evidence: [
      completionEvidence,
      `复检模型路线：${plan.routeLabel}`,
      `复检样本：${total} 个，成功 ${succeeded} 个`,
    ],
  };
}
