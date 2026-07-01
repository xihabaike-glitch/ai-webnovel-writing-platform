import { getProviderOption } from "./providerDefaults.ts";
import type { ModelProviderId } from "./types.ts";

export type ProviderHealthStatus = "ready" | "warn" | "blocked" | "disabled";

export interface ProviderHealthInput {
  id: string;
  providerId: string;
  displayName: string;
  baseUrl: string | null;
  encryptedApiKey?: string | null;
  hasApiKey?: boolean;
  defaultModel: string;
  enabled: boolean;
  maxContextTokens: number | null;
  updatedAt?: Date | string;
}

export interface ProviderHealthRow {
  id: string;
  providerId: string;
  displayName: string;
  defaultModel: string;
  enabled: boolean;
  status: ProviderHealthStatus;
  score: number;
  hasApiKey: boolean;
  hasBaseUrl: boolean;
  maxContextTokens: number | null;
  taskFit: string[];
  risks: string[];
  nextAction: string;
}

export interface ProviderHealthDashboard {
  status: "healthy" | "attention" | "blocked";
  score: number;
  summary: {
    totalProviders: number;
    enabledProviders: number;
    readyProviders: number;
    warningProviders: number;
    blockedProviders: number;
    disabledProviders: number;
    missingApiKeyProviders: number;
    missingContextProviders: number;
    customBaseUrlProviders: number;
  };
  rows: ProviderHealthRow[];
  topRisks: string[];
  nextActions: string[];
}

function isKnownProviderId(providerId: string): providerId is ModelProviderId {
  return ["claude", "deepseek", "kimi", "gpt", "openai_compatible", "ollama", "mock"].includes(providerId);
}

function contextTaskFit(maxContextTokens: number | null) {
  if (!maxContextTokens) return ["短提示词", "演示流程"];
  if (maxContextTokens >= 128000) return ["长篇大纲", "整卷审稿", "跨章节二改", "平台改写"];
  if (maxContextTokens >= 32000) return ["中长篇大纲", "前三章打磨", "章节初稿", "二改"];
  if (maxContextTokens >= 16000) return ["章节初稿", "章节审稿", "短篇扩写"];
  if (maxContextTokens >= 8000) return ["短篇审稿", "单章续写"];
  return ["标题简介", "短钩子", "局部润色"];
}

function scoreFromRisks(risks: string[], blocked: boolean, enabled: boolean) {
  if (!enabled) return 40;
  if (blocked) return Math.max(10, 55 - risks.length * 8);
  return Math.max(60, 100 - risks.length * 12);
}

export function buildProviderHealthDashboard(providers: ProviderHealthInput[]): ProviderHealthDashboard {
  const rows = providers.map((provider) => {
    const option = isKnownProviderId(provider.providerId) ? getProviderOption(provider.providerId) : undefined;
    const requiresApiKey = option?.requiresApiKey ?? (provider.providerId !== "mock" && provider.providerId !== "ollama");
    const hasApiKey = provider.hasApiKey ?? Boolean(provider.encryptedApiKey);
    const hasBaseUrl = Boolean(provider.baseUrl?.trim() || option?.defaultBaseUrl);
    const risks: string[] = [];

    if (!provider.defaultModel.trim()) risks.push("缺少默认模型名，任务无法稳定派发。");
    if (provider.enabled && requiresApiKey && !hasApiKey) risks.push("缺少 API Key，当前不可调用。");
    if (provider.enabled && provider.providerId === "openai_compatible" && !provider.baseUrl?.trim()) {
      risks.push("兼容网关缺少 Base URL，无法定位服务。");
    }
    if (provider.enabled && provider.providerId === "ollama" && !hasBaseUrl) {
      risks.push("本地 Ollama 缺少服务地址。");
    }
    if (provider.enabled && !provider.maxContextTokens) {
      risks.push("未填写上下文上限，长篇任务无法自动分配。");
    } else if (provider.enabled && provider.maxContextTokens && provider.maxContextTokens < 8000) {
      risks.push("上下文低于 8k，只适合短提示词任务。");
    } else if (provider.enabled && provider.maxContextTokens && provider.maxContextTokens < 32000) {
      risks.push("上下文不足 32k，长篇大纲和整卷审稿需要拆分。");
    }

    const blocked = provider.enabled && risks.some((risk) => risk.includes("不可调用") || risk.includes("无法定位") || risk.includes("缺少默认模型"));
    const status: ProviderHealthStatus = !provider.enabled ? "disabled" : blocked ? "blocked" : risks.length > 0 ? "warn" : "ready";
    const score = scoreFromRisks(risks, blocked, provider.enabled);
    const nextAction = !provider.enabled
      ? "按需启用，或保留为备用配置。"
      : blocked
        ? "先补齐 Key、Base URL 或模型名，再进入写作任务。"
        : risks.length > 0
          ? "补充上下文上限，并把长篇任务拆给更大上下文模型。"
          : "可作为主要写作模型，进入项目任务队列。";

    return {
      id: provider.id,
      providerId: provider.providerId,
      displayName: provider.displayName,
      defaultModel: provider.defaultModel,
      enabled: provider.enabled,
      status,
      score,
      hasApiKey,
      hasBaseUrl,
      maxContextTokens: provider.maxContextTokens,
      taskFit: contextTaskFit(provider.maxContextTokens),
      risks,
      nextAction,
    };
  });

  const enabledRows = rows.filter((row) => row.enabled);
  const summary = {
    totalProviders: rows.length,
    enabledProviders: enabledRows.length,
    readyProviders: rows.filter((row) => row.status === "ready").length,
    warningProviders: rows.filter((row) => row.status === "warn").length,
    blockedProviders: rows.filter((row) => row.status === "blocked").length,
    disabledProviders: rows.filter((row) => row.status === "disabled").length,
    missingApiKeyProviders: rows.filter((row) => row.enabled && !row.hasApiKey && row.providerId !== "mock" && row.providerId !== "ollama").length,
    missingContextProviders: rows.filter((row) => row.enabled && !row.maxContextTokens).length,
    customBaseUrlProviders: providers.filter((provider) => Boolean(provider.baseUrl?.trim())).length,
  };
  const score = enabledRows.length
    ? Math.round(enabledRows.reduce((total, row) => total + row.score, 0) / enabledRows.length)
    : 0;
  const status = summary.blockedProviders > 0 ? "blocked" : summary.warningProviders > 0 ? "attention" : "healthy";
  const topRisks = rows.flatMap((row) => row.risks.map((risk) => `${row.displayName}：${risk}`)).slice(0, 5);
  const nextActions = [
    summary.blockedProviders > 0 ? "先修复不可调用模型，避免章节任务排队后失败。" : null,
    summary.missingContextProviders > 0 ? "给启用模型填写上下文上限，用于长篇/中篇任务自动分配。" : null,
    rows.some((row) => row.maxContextTokens && row.maxContextTokens >= 32000) ? null : "至少准备一个 32k 以上上下文模型，承接大纲、前三章、二改任务。",
    summary.readyProviders > 0 ? "把可用模型绑定到项目任务队列，开始小批量试跑。" : "保留 Mock 演示模型，同时补齐真实模型配置。",
  ].filter((action): action is string => Boolean(action));

  return {
    status,
    score,
    summary,
    rows,
    topRisks,
    nextActions,
  };
}
