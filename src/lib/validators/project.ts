import { z } from "zod";

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
  targetLengthType: z.enum(["short_10k", "mid_50k", "long_300k_plus", "mega_1m_plus"]),
  targetWordCount: z.number().int().positive(),
  genre: z.string().min(1).max(80),
  sellingPoint: z.string().max(500).default(""),
  updateCadence: z.string().max(80).default(""),
});

