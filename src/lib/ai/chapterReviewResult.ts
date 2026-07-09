import { z } from "zod";

export interface ReviewIssueResult {
  severity: string;
  type: string;
  message: string;
  suggestion: string;
}

export interface ChapterReviewResult {
  score: number;
  shouldSecondPass?: boolean;
  issues: ReviewIssueResult[];
  summary: string;
}

const reviewIssueSchema = z.object({
  severity: z.string().trim().min(1),
  type: z.string().trim().min(1),
  message: z.string().trim().min(1),
  suggestion: z.string().trim().min(1),
}).strict();

const chapterReviewResultSchema = z.object({
  score: z.number().finite().min(0).max(100),
  shouldSecondPass: z.boolean().optional(),
  issues: z.array(reviewIssueSchema),
  summary: z.string().trim().min(1),
});

export function parseChapterReviewResult(outputText: string): ChapterReviewResult {
  try {
    return chapterReviewResultSchema.parse(JSON.parse(outputText));
  } catch {
    throw new Error("Invalid chapter review result");
  }
}
