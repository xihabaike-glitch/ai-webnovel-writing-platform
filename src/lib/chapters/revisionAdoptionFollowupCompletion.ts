import { prisma } from "../db/prisma.ts";

type ReviewFollowupDatabase = Pick<typeof prisma, "gateDispatchTask">;

export interface FirstThreeReviewCompletionInput {
  projectId: string;
  chapterId: string;
  chapterOrder: number;
  chapterTitle: string;
  taskId: string;
  score?: number | null;
  issueCount?: number | null;
  completedAt?: Date;
}

export interface FirstThreePublishCompletionInput {
  projectId: string;
  platformName: string;
  snapshotId: string;
  preflightScore: number;
  canExport: boolean;
  completedAt?: Date;
}

export function buildFirstThreeReviewCompletionEvidence(input: FirstThreeReviewCompletionInput) {
  const scoreText = typeof input.score === "number" ? `审稿分 ${input.score}` : "审稿分未记录";
  const issueText = typeof input.issueCount === "number" ? `问题 ${input.issueCount} 个` : "问题数未记录";
  return `采纳后重新审稿已完成：第 ${input.chapterOrder} 章《${input.chapterTitle}》，任务 ${input.taskId}，${scoreText}，${issueText}。`;
}

export function buildFirstThreePublishCompletionEvidence(input: FirstThreePublishCompletionInput) {
  return `采纳后发布质检已刷新：${input.platformName} 发布包版本 ${input.snapshotId}，质检 ${input.preflightScore} 分，${input.canExport ? "可导出" : "仍未通过"}。`;
}

export async function completeFirstThreeReviewFollowup(
  input: FirstThreeReviewCompletionInput,
  database: ReviewFollowupDatabase = prisma,
) {
  const now = input.completedAt ?? new Date();
  return database.gateDispatchTask.updateMany({
    where: {
      projectId: input.projectId,
      dispatchKey: {
        startsWith: `first-three-adoption:${input.projectId}:${input.chapterId}:`,
        endsWith: ":review",
      },
      state: { not: "completed" },
    },
    data: {
      state: "completed",
      completionEvidence: buildFirstThreeReviewCompletionEvidence(input),
      completedAt: now,
    },
  });
}

export async function completeFirstThreePublishFollowups(input: FirstThreePublishCompletionInput) {
  const now = input.completedAt ?? new Date();
  return prisma.gateDispatchTask.updateMany({
    where: {
      projectId: input.projectId,
      dispatchKey: {
        startsWith: `first-three-adoption:${input.projectId}:`,
        endsWith: ":publish-check",
      },
      state: { not: "completed" },
    },
    data: {
      state: "completed",
      completionEvidence: buildFirstThreePublishCompletionEvidence(input),
      completedAt: now,
    },
  });
}
