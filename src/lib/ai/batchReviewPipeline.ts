import type { SecondPassMode } from "./buildChapterSecondPassPrompt.ts";
import type { ProjectStartTacticSummary } from "../projects/projectStartTactics.ts";

export interface ReviewPipelineChapter {
  id: string;
  order: number;
  title: string;
  wordCount: number;
  status: string;
}

export interface ReviewPipelineTask {
  id: string;
  chapterId: string | null;
  taskType: string;
  status: string;
  outputText: string | null;
  errorMessage: string | null;
  createdAt: Date | string;
}

export interface ReviewPipelineCandidate {
  chapterId: string;
  order: number;
  title: string;
  wordCount: number;
  reviewStatus: "ready" | "empty" | "running" | "reviewed";
  secondPassStatus: "ready" | "blocked" | "running" | "done";
  reviewScore: number | null;
  issueCount: number;
  instruction: string;
  secondPassMode: SecondPassMode;
  reason: string;
  recommendedReview: boolean;
  recommendedSecondPass: boolean;
}

export interface ReviewPipelineQueue {
  totalCandidates: number;
  reviewReadyCount: number;
  secondPassReadyCount: number;
  recommendedReviewChapterIds: string[];
  recommendedSecondPassChapterIds: string[];
  startTactic: ProjectStartTacticSummary | null;
  warnings: string[];
  candidates: ReviewPipelineCandidate[];
}

interface ParsedReview {
  score?: number;
  shouldSecondPass?: boolean;
  issues?: Array<{
    severity?: string;
    type?: string;
    message?: string;
    suggestion?: string;
  }>;
  summary?: string;
}

function latestTask(tasks: ReviewPipelineTask[], chapterId: string, taskType: string) {
  return tasks.find((task) => task.chapterId === chapterId && task.taskType === taskType);
}

function taskTime(task: ReviewPipelineTask | undefined) {
  return task ? new Date(task.createdAt).getTime() : 0;
}

function hasRunning(tasks: ReviewPipelineTask[], chapterId: string, taskType: string) {
  return tasks.some((task) => (
    task.chapterId === chapterId
    && task.taskType === taskType
    && (task.status === "queued" || task.status === "running")
  ));
}

function parseReview(outputText: string | null): ParsedReview | null {
  if (!outputText) return null;
  try {
    return JSON.parse(outputText) as ParsedReview;
  } catch {
    return null;
  }
}

function issueInstruction(review: ParsedReview | null) {
  const issues = review?.issues ?? [];
  if (issues.length === 0) {
    return "按平台适配做二改：强化开头钩子、压缩解释、提高冲突推进和章末追读。";
  }
  return issues
    .slice(0, 4)
    .map((issue) => issue.suggestion || issue.message)
    .filter(Boolean)
    .join("；")
    || "按审稿意见强化钩子、冲突、爽点和章末追读。";
}

function needsSecondPassFromReview(review: ParsedReview | null) {
  if (!review) return false;
  if (typeof review.shouldSecondPass === "boolean") return review.shouldSecondPass;
  const score = typeof review.score === "number" ? review.score : null;
  return (score ?? 100) < 85 || (review.issues?.length ?? 0) > 0;
}

export function chooseSecondPassMode(review: ParsedReview | null): SecondPassMode {
  const types = (review?.issues ?? []).map((issue) => issue.type ?? "").join(" ");
  if (/hook/.test(types)) return "more_hook";
  if (/pacing|exposition/.test(types)) return "less_exposition";
  if (/character|arc|emotion/.test(types)) return "more_emotion";
  if (/payoff|爽点/.test(types)) return "more_payoff";
  return "platform_fit";
}

function candidateFor(chapter: ReviewPipelineChapter, tasks: ReviewPipelineTask[]): ReviewPipelineCandidate {
  const runningReview = hasRunning(tasks, chapter.id, "chapter_review");
  const runningSecondPass = hasRunning(tasks, chapter.id, "chapter_second_pass");
  const reviewTask = latestTask(tasks, chapter.id, "chapter_review");
  const secondPassTask = latestTask(tasks, chapter.id, "chapter_second_pass");
  const adoptionTask = latestTask(tasks, chapter.id, "chapter_adopt_candidate");
  const review = parseReview(reviewTask?.outputText ?? null);
  const issueCount = review?.issues?.length ?? 0;
  const score = typeof review?.score === "number" ? review.score : null;
  const hasDraft = chapter.wordCount > 0;
  const adoptionTime = taskTime(adoptionTask);
  const reviewIsFresh = taskTime(reviewTask) > adoptionTime;
  const secondPassIsFresh = taskTime(secondPassTask) > adoptionTime;
  const hasStaleReviewAfterAdoption = Boolean(adoptionTask && reviewTask?.status === "succeeded" && !reviewIsFresh);
  const reviewed = reviewTask?.status === "succeeded" && Boolean(review) && reviewIsFresh;
  const needsSecondPass = reviewed && needsSecondPassFromReview(review);
  const secondPassDone = secondPassTask?.status === "succeeded" && secondPassIsFresh;
  const reviewStatus = runningReview
    ? "running"
    : !hasDraft
      ? "empty"
      : reviewed
        ? "reviewed"
        : "ready";
  const secondPassStatus = runningSecondPass
    ? "running"
    : needsSecondPass
        ? "ready"
        : secondPassDone
          ? "done"
          : "blocked";

  return {
    chapterId: chapter.id,
    order: chapter.order,
    title: chapter.title,
    wordCount: chapter.wordCount,
    reviewStatus,
    secondPassStatus,
    reviewScore: score,
    issueCount,
    instruction: issueInstruction(review),
    secondPassMode: chooseSecondPassMode(review),
    reason: !hasDraft
      ? "没有正文，先生成初稿。"
      : runningReview || runningSecondPass
        ? "已有任务运行中，等待完成。"
        : reviewed
          ? needsSecondPass
            ? "已审稿，存在可执行二改问题。"
            : secondPassDone
              ? "二改后复检已达标。"
              : "已审稿，暂不需要批量二改。"
          : hasStaleReviewAfterAdoption
            ? "采纳候选稿后正文已变更，需要重新审稿。"
          : "已有正文但未审稿，可以进入批量审稿。",
    recommendedReview: reviewStatus === "ready",
    recommendedSecondPass: secondPassStatus === "ready",
  };
}

export function buildReviewPipelineQueue(
  chapters: ReviewPipelineChapter[],
  tasks: ReviewPipelineTask[],
  limit = 5,
  startTactic: ProjectStartTacticSummary | null = null,
): ReviewPipelineQueue {
  const orderedTasks = [...tasks].sort((left, right) => (
    new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  ));
  const candidates = [...chapters]
    .sort((left, right) => left.order - right.order || left.title.localeCompare(right.title))
    .map((chapter) => candidateFor(chapter, orderedTasks));
  const reviewReady = candidates.filter((candidate) => candidate.reviewStatus === "ready");
  const secondPassReady = candidates.filter((candidate) => candidate.secondPassStatus === "ready");
  const warnings: string[] = [];

  if (chapters.length === 0) warnings.push("还没有章节，先从排期生成章节卡和初稿。");
  if (candidates.some((candidate) => candidate.reviewStatus === "empty")) warnings.push("存在空正文章节，先批量初稿再审稿。");
  if (reviewReady.length === 0 && secondPassReady.length === 0 && chapters.length > 0) warnings.push("当前没有可批量处理的审稿或二改任务。");
  if (reviewReady.length > limit) warnings.push(`一次建议最多审 ${limit} 章，先看问题类型是否稳定。`);
  if (secondPassReady.length > limit) warnings.push(`一次建议最多二改 ${limit} 章，避免风格漂移太大。`);

  return {
    totalCandidates: candidates.length,
    reviewReadyCount: reviewReady.length,
    secondPassReadyCount: secondPassReady.length,
    recommendedReviewChapterIds: reviewReady.slice(0, limit).map((candidate) => candidate.chapterId),
    recommendedSecondPassChapterIds: secondPassReady.slice(0, limit).map((candidate) => candidate.chapterId),
    startTactic,
    warnings,
    candidates,
  };
}
