import { z } from "zod";

const optionalId = z.string().trim().optional().transform((value) => value || null);

export const foreshadowPayloadSchema = z.object({
  title: z.string().trim().min(1),
  setupChapterId: optionalId,
  payoffChapterId: optionalId,
  relatedCharacterIds: z.array(z.string()).default([]),
  status: z.string().trim().default("planned"),
  notes: z.string().trim().default(""),
});

export const plotThreadPayloadSchema = z.object({
  type: z.string().trim().min(1),
  title: z.string().trim().min(1),
  startChapterId: optionalId,
  endChapterId: optionalId,
  status: z.string().trim().default("active"),
});

export type ForeshadowPayload = z.infer<typeof foreshadowPayloadSchema>;
export type PlotThreadPayload = z.infer<typeof plotThreadPayloadSchema>;
