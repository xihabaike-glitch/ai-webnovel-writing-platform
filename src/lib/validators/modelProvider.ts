import { z } from "zod";

const routeRecommendationExplanationSchema = z.object({
  headline: z.string().max(80),
  items: z.array(z.object({
    id: z.enum(["history", "cost", "governance_recheck", "avoidance"]),
    label: z.string().min(1).max(40),
    value: z.string().min(1).max(80),
    detail: z.string().max(300),
    tone: z.enum(["positive", "warning", "neutral"]),
  })).max(8),
});

export const saveModelProviderSchema = z.object({
  id: z.string().optional(),
  providerId: z.enum(["claude", "deepseek", "gemini", "gpt", "openai_compatible", "ollama", "mock"]),
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
    "control_asset_generate",
  ]),
  primaryProviderConfigId: z.string().optional().nullable(),
  fallbackProviderConfigId: z.string().optional().nullable(),
  confirmation: z.object({
    source: z.enum(["manual", "recommendation", "preset"]).optional(),
    reason: z.string().max(1000).optional().nullable(),
    primaryProviderName: z.string().max(180).optional().nullable(),
    fallbackProviderName: z.string().max(180).optional().nullable(),
    routeStatus: z.enum(["ready", "current", "insufficient"]).optional().nullable(),
    avoidanceStatus: z.enum(["none", "applied"]).optional().nullable(),
    restoredCandidate: z.boolean().optional().nullable(),
    recommendationExplanation: routeRecommendationExplanationSchema.optional().nullable(),
  }).optional(),
});

export const saveRouteAvoidanceOverrideSchema = z.object({
  ruleKey: z.string().min(3).max(240),
  action: z.enum(["dismiss", "scope_task", "extend_watch"]),
  taskType: z.enum([
    "chapter_draft",
    "chapter_review",
    "chapter_second_pass",
    "submission_package_optimize",
    "first_three_rewrite",
    "control_asset_generate",
  ]).optional().nullable(),
  note: z.string().max(300).optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
}).superRefine((value, ctx) => {
  if (value.action === "scope_task" && !value.taskType) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "限定任务类型时必须选择任务类型。",
      path: ["taskType"],
    });
  }
  if (value.action === "extend_watch" && !value.expiresAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "延长观察期时必须填写到期时间。",
      path: ["expiresAt"],
    });
  }
});
