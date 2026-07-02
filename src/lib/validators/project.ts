import { z } from "zod";

export const projectStartTacticAdviceSchema = z.object({
  status: z.enum(["history_blocked", "history_watch", "history_usable", "template"]),
  label: z.string().max(40),
  title: z.string().max(160),
  primaryTactic: z.string().max(1000),
  openingMove: z.string().max(1000),
  verificationMove: z.string().max(1000),
  risk: z.string().max(1000),
  evidence: z.array(z.string().max(500)).max(5).default([]),
  checklist: z.array(z.string().max(500)).max(6).default([]),
});

export const createProjectSchema = z.object({
  title: z.string().min(1).max(120),
  targetPlatform: z.enum([
    "qidian",
    "fanqie",
    "qimao",
    "jjwxc",
    "zhihu_yanxuan",
    "webnovel",
    "royal_road",
    "wattpad",
  ]),
  targetLengthType: z.enum(["short_10k", "mid_50k", "long_300k_plus", "mega_1m_plus"]).optional(),
  targetWordCount: z.number().int().positive().optional(),
  genre: z.string().min(1).max(80),
  sellingPoint: z.string().max(500).default(""),
  updateCadence: z.string().max(80).default(""),
  templateId: z.string().max(80).optional(),
  startTacticAdvice: projectStartTacticAdviceSchema.optional(),
});
