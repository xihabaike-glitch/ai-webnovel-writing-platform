import type { ModelProviderId } from "./types.ts";

export interface ProviderOption {
  providerId: ModelProviderId;
  displayName: string;
  defaultBaseUrl: string;
  defaultModel: string;
  requiresApiKey: boolean;
  note: string;
}

export type ProviderModelPresetTaskTag = "长篇规划" | "正文初稿" | "审稿二改" | "低成本批量";

export interface ProviderModelPreset {
  id: string;
  providerId: ModelProviderId;
  label: string;
  model: string;
  maxContextTokens: number;
  taskTags: ProviderModelPresetTaskTag[];
  note: string;
}

export const providerOptions: ProviderOption[] = [
  {
    providerId: "mock",
    displayName: "Mock 演示模型",
    defaultBaseUrl: "",
    defaultModel: "mock-writer",
    requiresApiKey: false,
    note: "无密钥演示模式，用于本地测试完整写作流程。",
  },
  {
    providerId: "gpt",
    displayName: "GPT / OpenAI",
    defaultBaseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-5-mini",
    requiresApiKey: true,
    note: "走 OpenAI Chat Completions 兼容接口。",
  },
  {
    providerId: "claude",
    displayName: "Claude",
    defaultBaseUrl: "https://api.anthropic.com",
    defaultModel: "claude-sonnet-4-5",
    requiresApiKey: true,
    note: "走 Anthropic Messages API。",
  },
  {
    providerId: "deepseek",
    displayName: "DeepSeek",
    defaultBaseUrl: "https://api.deepseek.com",
    defaultModel: "deepseek-v4-flash",
    requiresApiKey: true,
    note: "OpenAI 兼容格式，适合低成本长文本。",
  },
  {
    providerId: "kimi",
    displayName: "Kimi",
    defaultBaseUrl: "https://api.moonshot.ai/v1",
    defaultModel: "kimi-k2.6",
    requiresApiKey: true,
    note: "OpenAI 兼容格式，适合长上下文中文写作。",
  },
  {
    providerId: "openai_compatible",
    displayName: "OpenAI-Compatible",
    defaultBaseUrl: "",
    defaultModel: "",
    requiresApiKey: true,
    note: "用于硅基流动、OpenRouter、自建网关等兼容服务。",
  },
  {
    providerId: "ollama",
    displayName: "Ollama 本地模型",
    defaultBaseUrl: "http://localhost:11434",
    defaultModel: "qwen3:latest",
    requiresApiKey: false,
    note: "本机模型服务，无需 API Key。",
  },
];

export const providerModelPresets: ProviderModelPreset[] = [
  {
    id: "gpt-balanced",
    providerId: "gpt",
    label: "GPT 均衡写作",
    model: "gpt-5-mini",
    maxContextTokens: 128000,
    taskTags: ["正文初稿", "审稿二改", "低成本批量"],
    note: "适合日常章节生成、审稿和批量试跑，先用它跑稳定性。",
  },
  {
    id: "gpt-longform",
    providerId: "gpt",
    label: "GPT 长篇规划",
    model: "gpt-5",
    maxContextTokens: 128000,
    taskTags: ["长篇规划", "审稿二改"],
    note: "适合世界观、人物弧光和复杂结构拆解，成本更高，别拿来乱跑批量。",
  },
  {
    id: "claude-structure",
    providerId: "claude",
    label: "Claude 结构审稿",
    model: "claude-sonnet-4-5",
    maxContextTokens: 200000,
    taskTags: ["长篇规划", "审稿二改"],
    note: "适合长上下文结构判断、人物动机检查和复杂二改建议。",
  },
  {
    id: "claude-draft",
    providerId: "claude",
    label: "Claude 正文润色",
    model: "claude-haiku-4-5",
    maxContextTokens: 200000,
    taskTags: ["正文初稿", "低成本批量"],
    note: "适合语言流畅度、轻量正文生成和多版本试写。",
  },
  {
    id: "deepseek-batch",
    providerId: "deepseek",
    label: "DeepSeek 批量初稿",
    model: "deepseek-chat",
    maxContextTokens: 64000,
    taskTags: ["正文初稿", "低成本批量"],
    note: "适合低成本批量章节、首轮改写和平台风格试跑。",
  },
  {
    id: "deepseek-reasoner",
    providerId: "deepseek",
    label: "DeepSeek 推理审稿",
    model: "deepseek-reasoner",
    maxContextTokens: 64000,
    taskTags: ["长篇规划", "审稿二改"],
    note: "适合拆问题、查逻辑断点、做复杂审稿，不建议作为所有任务默认。",
  },
  {
    id: "kimi-long-context",
    providerId: "kimi",
    label: "Kimi 长上下文",
    model: "kimi-k2.6",
    maxContextTokens: 128000,
    taskTags: ["长篇规划", "审稿二改"],
    note: "适合整卷材料、人物线和世界观资料一起读的任务。",
  },
  {
    id: "kimi-draft",
    providerId: "kimi",
    label: "Kimi 中文初稿",
    model: "kimi-k2.6",
    maxContextTokens: 128000,
    taskTags: ["正文初稿", "低成本批量"],
    note: "适合中文长文续写、批量章节和平台资料改写。",
  },
];

export function getProviderOption(providerId: ModelProviderId) {
  return providerOptions.find((option) => option.providerId === providerId);
}

export function getProviderModelPresets(providerId: string) {
  return providerModelPresets.filter((preset) => preset.providerId === providerId);
}
