import { z } from "zod";

export const createChapterSchema = z.object({
  title: z.string().min(1).max(120),
});

export const updateChapterSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  content: z.string().optional(),
  goal: z.string().max(500).optional(),
  hook: z.string().max(500).optional(),
  conflict: z.string().max(500).optional(),
  valueShift: z.string().max(500).optional(),
  cliffhanger: z.string().max(500).optional(),
  status: z.enum(["outline", "draft", "revising", "final"]).optional(),
});

