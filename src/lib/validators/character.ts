import { z } from "zod";

export const characterPayloadSchema = z.object({
  name: z.string().trim().min(1),
  role: z.string().trim().min(1),
  desire: z.string().trim().default(""),
  need: z.string().trim().default(""),
  flaw: z.string().trim().default(""),
  arcStart: z.string().trim().default(""),
  arcEnd: z.string().trim().default(""),
  voice: z.string().trim().default(""),
  relationshipNotes: z.string().trim().default(""),
});

export type CharacterPayload = z.infer<typeof characterPayloadSchema>;
