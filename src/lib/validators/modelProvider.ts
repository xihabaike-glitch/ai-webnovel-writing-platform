import { z } from "zod";

export const saveModelProviderSchema = z.object({
  id: z.string().optional(),
  providerId: z.enum(["claude", "deepseek", "kimi", "gpt", "openai_compatible", "ollama", "mock"]),
  displayName: z.string().min(1).max(80),
  baseUrl: z.string().max(300).optional(),
  apiKey: z.string().max(500).optional(),
  defaultModel: z.string().min(1).max(120),
  enabled: z.boolean().optional(),
  maxContextTokens: z.number().int().positive().optional(),
});

export const testModelProviderSchema = saveModelProviderSchema.pick({
  id: true,
  providerId: true,
  baseUrl: true,
  apiKey: true,
  defaultModel: true,
});

export const saveModelTaskRouteSchema = z.object({
  taskType: z.enum([
    "chapter_draft",
    "chapter_review",
    "chapter_second_pass",
    "submission_package_optimize",
    "first_three_rewrite",
  ]),
  primaryProviderConfigId: z.string().optional().nullable(),
  fallbackProviderConfigId: z.string().optional().nullable(),
});
