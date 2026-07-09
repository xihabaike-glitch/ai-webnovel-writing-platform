import type { ModelProviderId } from "./types.ts";

export interface ProviderSetupGuideOption {
  providerId: ModelProviderId;
  displayName: string;
  defaultBaseUrl: string;
  defaultModel: string;
  requiresApiKey: boolean;
  note: string;
}

export interface ProviderSetupGuidePreset {
  providerId: ModelProviderId;
  label: string;
  model: string;
  maxContextTokens: number;
  taskTags: string[];
}

export interface ProviderSetupGuideProvider {
  providerId: string;
  enabled: boolean;
  hasApiKey: boolean;
  baseUrl: string | null;
  defaultModel: string;
  maxContextTokens: number | null;
}

export interface ProviderSetupGuideItem {
  providerId: ModelProviderId;
  displayName: string;
  status: "ready" | "needs_key" | "needs_test" | "optional";
  headline: string;
  actionLabel: string;
  defaultBaseUrl: string;
  defaultModel: string;
  presetCount: number;
  recommendedModels: string[];
  taskTags: string[];
}

export interface ProviderSetupGuide {
  summary: {
    total: number;
    ready: number;
    needsKey: number;
    needsTest: number;
    optional: number;
  };
  items: ProviderSetupGuideItem[];
  nextActions: string[];
}

const launchProviderOrder: ModelProviderId[] = ["deepseek", "gemini", "claude", "gpt", "openai_compatible", "ollama", "mock"];

function statusFor(option: ProviderSetupGuideOption, provider: ProviderSetupGuideProvider | undefined): ProviderSetupGuideItem["status"] {
  if (!provider && option.providerId === "mock") return "optional";
  if (!provider) return option.requiresApiKey ? "needs_key" : "needs_test";
  if (!provider.enabled) return "needs_test";
  if (option.requiresApiKey && !provider.hasApiKey) return "needs_key";
  if (!provider.defaultModel || !provider.maxContextTokens) return "needs_test";
  return "ready";
}

function headlineFor(status: ProviderSetupGuideItem["status"], option: ProviderSetupGuideOption) {
  if (status === "ready") return "已具备写作路由条件";
  if (status === "needs_key") return `填写 ${option.displayName} API Key 后再测试连接`;
  if (status === "needs_test") return "保存默认模型和上下文上限后测试连接";
  return "演示兜底，可保留但别当正式路线";
}

function actionLabelFor(status: ProviderSetupGuideItem["status"]) {
  if (status === "ready") return "可参与首日路由";
  if (status === "needs_key") return "先填 Key";
  if (status === "needs_test") return "保存并测试";
  return "保留演示";
}

export function buildProviderSetupGuide(input: {
  options: ProviderSetupGuideOption[];
  presets: ProviderSetupGuidePreset[];
  providers: ProviderSetupGuideProvider[];
}): ProviderSetupGuide {
  const providerByProviderId = new Map(input.providers.map((provider) => [provider.providerId, provider]));
  const orderByProviderId = new Map(launchProviderOrder.map((providerId, index) => [providerId, index]));
  const items = input.options
    .slice()
    .sort((left, right) => (
      (orderByProviderId.get(left.providerId) ?? 99) - (orderByProviderId.get(right.providerId) ?? 99)
      || left.displayName.localeCompare(right.displayName)
    ))
    .map((option): ProviderSetupGuideItem => {
      const provider = providerByProviderId.get(option.providerId);
      const presets = input.presets.filter((preset) => preset.providerId === option.providerId);
      const status = statusFor(option, provider);

      return {
        providerId: option.providerId,
        displayName: option.displayName,
        status,
        headline: headlineFor(status, option),
        actionLabel: actionLabelFor(status),
        defaultBaseUrl: provider?.baseUrl ?? option.defaultBaseUrl,
        defaultModel: provider?.defaultModel || option.defaultModel,
        presetCount: presets.length,
        recommendedModels: Array.from(new Set(presets.map((preset) => preset.model))).slice(0, 3),
        taskTags: Array.from(new Set(presets.flatMap((preset) => preset.taskTags))).slice(0, 4),
      };
    });
  const ready = items.filter((item) => item.status === "ready").length;
  const needsKey = items.filter((item) => item.status === "needs_key").length;
  const needsTest = items.filter((item) => item.status === "needs_test").length;
  const optional = items.filter((item) => item.status === "optional").length;

  return {
    summary: {
      total: items.length,
      ready,
      needsKey,
      needsTest,
      optional,
    },
    items,
    nextActions: [
      needsKey > 0 ? `先补 ${needsKey} 个云模型 API Key，优先 DeepSeek、Gemini、Claude、GPT。` : null,
      needsTest > 0 ? `${needsTest} 个模型需要保存上下文上限并测试连接。` : null,
      ready >= 2 ? "已有至少 2 个可用模型，可以进入冷启动路由蓝图。" : "至少准备 2 个真实模型，再应用首日推荐路线。",
    ].filter((action): action is string => Boolean(action)),
  };
}
