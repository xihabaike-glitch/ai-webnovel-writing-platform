import { z } from "zod";
import { OUTLINE_NODE_TYPES } from "@/lib/outlines/defaultOutline";

export const updateOutlineNodeSchema = z.object({
  type: z.enum(OUTLINE_NODE_TYPES).optional(),
  title: z.string().min(1).max(120).optional(),
  summary: z.string().max(1000).optional(),
  goal: z.string().max(800).optional(),
  hook: z.string().max(800).optional(),
  conflict: z.string().max(800).optional(),
  valueShift: z.string().max(800).optional(),
  platformNote: z.string().max(1000).optional(),
  status: z.enum(["planned", "drafted", "chapter_card", "done"]).optional(),
});

export const createChapterFromOutlineSchema = z.object({
  outlineNodeId: z.string().min(1),
});
