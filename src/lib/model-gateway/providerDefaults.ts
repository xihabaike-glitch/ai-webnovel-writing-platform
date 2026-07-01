import type { ModelProviderId } from "./types.ts";

export interface ProviderOption {
  providerId: ModelProviderId;
  displayName: string;
  defaultBaseUrl: string;
  defaultModel: string;
  requiresApiKey: boolean;
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

export function getProviderOption(providerId: ModelProviderId) {
  return providerOptions.find((option) => option.providerId === providerId);
}
