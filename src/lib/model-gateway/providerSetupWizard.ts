import type { ModelProviderId } from "./types.ts";

export interface ProviderSetupWizardOption {
  providerId: ModelProviderId;
  displayName: string;
  defaultBaseUrl: string;
  defaultModel: string;
  requiresApiKey: boolean;
}

export interface ProviderSetupWizardPreset {
  providerId: ModelProviderId;
  label: string;
  model: string;
  maxContextTokens: number;
  taskTags: string[];
  note: string;
}

export interface ProviderSetupWizardProvider {
  providerId: string;
  enabled: boolean;
  hasApiKey: boolean;
  baseUrl: string | null;
  defaultModel: string;
  maxContextTokens: number | null;
}

export interface ProviderSetupWizardItem {
  providerId: ModelProviderId;
  displayName: string;
  priority: number;
  status: "ready" | "needs_key" | "needs_save" | "optional";
  statusLabel: string;
  headline: string;
  nextAction: string;
  defaultBaseUrl: string;
  recommendedModel: string;
  recommendedContextTokens: number;
  recommendedPresetLabel: string;
  fitTags: string[];
  why: string;
  canQuickSelect: boolean;
}

export interface ProviderSetupWizard {
  summary: {
    required: number;
    ready: number;
    needsKey: number;
    needsSave: number;
  };
  items: ProviderSetupWizardItem[];
  nextActions: string[];
}

const launchProviderOrder: ModelProviderId[] = ["deepseek", "kimi", "claude", "gpt"];

function statusFor(option: ProviderSetupWizardOption, provider: ProviderSetupWizardProvider | undefined): ProviderSetupWizardItem["status"] {
  if (!launchProviderOrder.includes(option.providerId)) return "optional";
  if (!provider) return option.requiresApiKey ? "needs_key" : "needs_save";
  if (!provider.enabled || !provider.defaultModel || !provider.maxContextTokens) return "needs_save";
  if (option.requiresApiKey && !provider.hasApiKey) return "needs_key";
  return "ready";
}

function preferredPreset(providerId: ModelProviderId, presets: ProviderSetupWizardPreset[]) {
  const providerPresets = presets.filter((preset) => preset.providerId === providerId);
  return providerPresets.find((preset) => preset.taskTags.includes("正文初稿"))
    ?? providerPresets.find((preset) => preset.taskTags.includes("长篇规划"))
    ?? providerPresets[0]
    ?? null;
}

function statusLabelFor(status: ProviderSetupWizardItem["status"]) {
  if (status === "ready") return "可用";
  if (status === "needs_key") return "补 Key";
  if (status === "needs_save") return "保存测试";
  return "可选";
}

function headlineFor(status: ProviderSetupWizardItem["status"], displayName: string) {
  if (status === "ready") return `${displayName} 已可参与首日路线。`;
  if (status === "needs_key") return `先填写 ${displayName} API Key。`;
  if (status === "needs_save") return `保存 ${displayName} 默认模型并测试连接。`;
  return `${displayName} 可作为补充，不是首日必选。`;
}

function nextActionFor(status: ProviderSetupWizardItem["status"]) {
  if (status === "ready") return "可直接进入路线配置";
  if (status === "needs_key") return "选择此模型，粘贴 Key，保存后测试";
  if (status === "needs_save") return "选择此模型，确认模型名和上下文，再保存测试";
  return "需要兼容网关或本地模型时再配置";
}

export function buildProviderSetupWizard(input: {
  options: ProviderSetupWizardOption[];
  presets: ProviderSetupWizardPreset[];
  providers: ProviderSetupWizardProvider[];
}): ProviderSetupWizard {
  const providerByProviderId = new Map(input.providers.map((provider) => [provider.providerId, provider]));
  const orderByProviderId = new Map(launchProviderOrder.map((providerId, index) => [providerId, index]));
  const items = input.options
    .filter((option) => launchProviderOrder.includes(option.providerId))
    .sort((left, right) => (orderByProviderId.get(left.providerId) ?? 99) - (orderByProviderId.get(right.providerId) ?? 99))
    .map((option, index): ProviderSetupWizardItem => {
      const provider = providerByProviderId.get(option.providerId);
      const preset = preferredPreset(option.providerId, input.presets);
      const status = statusFor(option, provider);
      const fitTags = Array.from(new Set(input.presets
        .filter((item) => item.providerId === option.providerId)
        .flatMap((item) => item.taskTags)));

      return {
        providerId: option.providerId,
        displayName: option.displayName,
        priority: index + 1,
        status,
        statusLabel: statusLabelFor(status),
        headline: headlineFor(status, option.displayName),
        nextAction: nextActionFor(status),
        defaultBaseUrl: provider?.baseUrl ?? option.defaultBaseUrl,
        recommendedModel: provider?.defaultModel || preset?.model || option.defaultModel,
        recommendedContextTokens: provider?.maxContextTokens ?? preset?.maxContextTokens ?? 0,
        recommendedPresetLabel: preset?.label ?? "默认模型",
        fitTags: fitTags.slice(0, 4),
        why: preset?.note ?? "用于真实模型接入和首日工作流路由。",
        canQuickSelect: status !== "ready",
      };
    });
  const ready = items.filter((item) => item.status === "ready").length;
  const needsKey = items.filter((item) => item.status === "needs_key").length;
  const needsSave = items.filter((item) => item.status === "needs_save").length;

  return {
    summary: {
      required: items.length,
      ready,
      needsKey,
      needsSave,
    },
    items,
    nextActions: [
      ready >= 2 ? "已有至少 2 个真实模型，可进入首日路线应用。" : `至少先接入 2 个真实模型；当前可用 ${ready} 个。`,
      needsKey > 0 ? `优先补 ${needsKey} 个 API Key，别让首日执行继续依赖 Mock。` : null,
      needsSave > 0 ? `${needsSave} 个模型需要保存默认模型、上下文并测试连接。` : null,
    ].filter((action): action is string => Boolean(action)),
  };
}
