import { z } from "zod";

export const worldEntryPayloadSchema = z.object({
  type: z.string().trim().min(1),
  title: z.string().trim().min(1),
  content: z.string().trim().default(""),
});

export type WorldEntryPayload = z.infer<typeof worldEntryPayloadSchema>;
