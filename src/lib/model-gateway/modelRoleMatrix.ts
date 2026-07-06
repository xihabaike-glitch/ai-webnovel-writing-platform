import { getProviderOption, getProviderModelPresets } from "./providerDefaults.ts";
import type { ModelProviderId } from "./types.ts";

export type ModelWritingRoleId = "structure_editor" | "draft_writer" | "context_librarian" | "overseas_packager";
export type ModelWritingRoleStatus = "ready" | "partial" | "missing";

export interface ModelRoleProviderInput {
  id?: string;
  providerId: string;
  displayName: string;
  hasApiKey?: boolean;
  encryptedApiKey?: string | null;
  defaultModel: string;
  enabled: boolean;
  maxContextTokens: number | null;
}

export interface ModelWritingRole {
  id: ModelWritingRoleId;
  title: string;
  ownerLabel: string;
  status: ModelWritingRoleStatus;
  preferredProviderIds: string[];
  providerName: string | null;
  model: string | null;
  minContextTokens: number;
  taskTypes: string[];
  deliverables: string[];
  reason: string;
  nextAction: string;
}

export interface ModelRoleMatrix {
  status: "ready" | "partial" | "blocked";
  summary: {
    totalRoles: number;
    readyRoles: number;
    partialRoles: number;
    missingRoles: number;
  };
  headline: string;
  nextAction: string;
  roles: ModelWritingRole[];
}

export interface ModelRoleMatrixPriorityBlocker {
  tone: "blocked" | "watch";
  title: string;
  detail: string;
  actionLabel: string;
  actionHref: string;
}

interface RoleDefinition {
  id: ModelWritingRoleId;
  title: string;
  ownerLabel: string;
  preferredProviderIds: string[];
  minContextTokens: number;
  taskTypes: string[];
  deliverables: string[];
  fallbackProviderIds: string[];
}

const roleDefinitions: RoleDefinition[] = [
  {
    id: "structure_editor",
    title: "长篇结构主编",
    ownerLabel: "Claude 优先",
    preferredProviderIds: ["claude"],
    fallbackProviderIds: ["gpt", "kimi", "deepseek"],
    minContextTokens: 128000,
    taskTypes: ["story_structure_diagnostic", "chapter_review", "chapter_second_pass", "first_three_rewrite"],
    deliverables: ["人物弧光审校", "主线支线诊断", "伏笔回收建议", "前三章结构复审"],
  },
  {
    id: "draft_writer",
    title: "中文网文写手",
    ownerLabel: "DeepSeek 优先",
    preferredProviderIds: ["deepseek"],
    fallbackProviderIds: ["kimi", "gpt", "claude"],
    minContextTokens: 32000,
    taskTypes: ["chapter_draft", "first_three_rewrite"],
    deliverables: ["章节初稿", "爽点补强", "批量小样本", "平台节奏试写"],
  },
  {
    id: "context_librarian",
    title: "长上下文资料官",
    ownerLabel: "Kimi 优先",
    preferredProviderIds: ["kimi"],
    fallbackProviderIds: ["claude", "gpt", "deepseek"],
    minContextTokens: 128000,
    taskTypes: ["control_asset_generate", "story_tree_recheck", "chapter_review"],
    deliverables: ["世界观整理", "连续性审校", "资料包压缩", "整卷上下文召回"],
  },
  {
    id: "overseas_packager",
    title: "海外投稿包装编辑",
    ownerLabel: "GPT 优先",
    preferredProviderIds: ["gpt"],
    fallbackProviderIds: ["claude", "kimi", "deepseek"],
    minContextTokens: 32000,
    taskTypes: ["submission_package_optimize", "multi_platform_submission"],
    deliverables: ["英文 synopsis", "WebNovel/Royal Road/Wattpad 包装", "标签与简介", "多语言改写"],
  },
];

function isKnownProviderId(providerId: string): providerId is ModelProviderId {
  return ["claude", "deepseek", "kimi", "gpt", "openai_compatible", "ollama", "mock"].includes(providerId);
}

function providerNeedsApiKey(providerId: string) {
  const option = isKnownProviderId(providerId) ? getProviderOption(providerId) : undefined;
  return option?.requiresApiKey ?? (providerId !== "mock" && providerId !== "ollama");
}

function providerHasKey(provider: ModelRoleProviderInput) {
  return provider.hasApiKey ?? Boolean(provider.encryptedApiKey);
}

function providerReady(provider: ModelRoleProviderInput) {
  if (!provider.enabled) return false;
  if (!provider.defaultModel.trim()) return false;
  if (providerNeedsApiKey(provider.providerId) && !providerHasKey(provider)) return false;
  return true;
}

function providerMeetsContext(provider: ModelRoleProviderInput, minContextTokens: number) {
  return (provider.maxContextTokens ?? 0) >= minContextTokens;
}

function providerLabel(providerId: string) {
  return isKnownProviderId(providerId) ? getProviderOption(providerId)?.displayName ?? providerId : providerId;
}

function roleReason(definition: RoleDefinition, provider: ModelRoleProviderInput | null, status: ModelWritingRoleStatus) {
  if (!provider) {
    return `缺少 ${definition.ownerLabel.replace(" 优先", "")} 可用配置，这个岗位只能靠人工或 Mock 顶着。`;
  }
  if (status === "ready") {
    return `${provider.displayName} 已可用，上下文 ${provider.maxContextTokens?.toLocaleString() ?? "未填"}，可承接${definition.deliverables.slice(0, 2).join("、")}。`;
  }
  return `${provider.displayName} 可调用，但上下文低于 ${definition.minContextTokens.toLocaleString()}，复杂长篇任务需要拆分或换更长上下文模型。`;
}

function roleNextAction(definition: RoleDefinition, provider: ModelRoleProviderInput | null, status: ModelWritingRoleStatus) {
  if (status === "ready") return `把${definition.title}绑定到 ${definition.taskTypes.slice(0, 2).join("、")}。`;
  if (provider) return `给 ${provider.displayName} 补上下文上限，或切到 ${definition.preferredProviderIds.map(providerLabel).join(" / ")}。`;
  return `先配置 ${definition.preferredProviderIds.map(providerLabel).join(" / ")}，填写 API Key 并测试连接。`;
}

function bestProvider(definition: RoleDefinition, providers: ModelRoleProviderInput[]) {
  const candidates = [...definition.preferredProviderIds, ...definition.fallbackProviderIds]
    .flatMap((providerId) => providers.filter((provider) => provider.providerId === providerId && providerReady(provider)));
  return candidates
    .sort((left, right) => {
      const leftPreferred = definition.preferredProviderIds.includes(left.providerId) ? 1 : 0;
      const rightPreferred = definition.preferredProviderIds.includes(right.providerId) ? 1 : 0;
      return rightPreferred - leftPreferred
        || Number(providerMeetsContext(right, definition.minContextTokens)) - Number(providerMeetsContext(left, definition.minContextTokens))
        || (right.maxContextTokens ?? 0) - (left.maxContextTokens ?? 0);
    })[0] ?? null;
}

export function buildModelRoleMatrix(providers: ModelRoleProviderInput[]): ModelRoleMatrix {
  const roles = roleDefinitions.map((definition): ModelWritingRole => {
    const provider = bestProvider(definition, providers);
    const status: ModelWritingRoleStatus = !provider
      ? "missing"
      : providerMeetsContext(provider, definition.minContextTokens)
        ? "ready"
        : "partial";
    const preset = provider ? getProviderModelPresets(provider.providerId).find((item) => item.model === provider.defaultModel) : null;

    return {
      id: definition.id,
      title: definition.title,
      ownerLabel: definition.ownerLabel,
      status,
      preferredProviderIds: definition.preferredProviderIds,
      providerName: provider?.displayName ?? null,
      model: preset?.label ? `${preset.label} · ${provider?.defaultModel}` : provider?.defaultModel ?? null,
      minContextTokens: definition.minContextTokens,
      taskTypes: definition.taskTypes,
      deliverables: definition.deliverables,
      reason: roleReason(definition, provider, status),
      nextAction: roleNextAction(definition, provider, status),
    };
  });
  const readyRoles = roles.filter((role) => role.status === "ready").length;
  const partialRoles = roles.filter((role) => role.status === "partial").length;
  const missingRoles = roles.filter((role) => role.status === "missing").length;
  const status = missingRoles > 0 ? "blocked" : partialRoles > 0 ? "partial" : "ready";
  const firstOpen = roles.find((role) => role.status !== "ready") ?? null;

  return {
    status,
    summary: {
      totalRoles: roles.length,
      readyRoles,
      partialRoles,
      missingRoles,
    },
    headline: status === "ready"
      ? "模型编辑部四个岗位已就绪，可以进入真实写作任务。"
      : status === "partial"
        ? "模型编辑部可运行，但长篇任务还需要补上下文或拆分。"
        : "模型编辑部缺岗位，正式写作会继续依赖 Mock 或人工补位。",
    nextAction: firstOpen?.nextAction ?? "进入作品页，跑首日工作流和小批量写审改。",
    roles,
  };
}

export function buildModelRoleMatrixPriorityBlocker(matrix: ModelRoleMatrix): ModelRoleMatrixPriorityBlocker | null {
  if (matrix.status === "ready") return null;

  if (matrix.summary.missingRoles > 0) {
    return {
      tone: "blocked",
      title: "模型编辑部缺岗",
      detail: `${matrix.summary.missingRoles} 个岗位还没可用模型。继续跑真实写作会变成 Mock 或人工救火，先补 Claude / DeepSeek / Kimi / GPT 的职责分工。${matrix.nextAction}`,
      actionLabel: "去配置模型岗位",
      actionHref: "/settings/models#model-role-matrix",
    };
  }

  return {
    tone: "watch",
    title: "模型岗位上下文不够",
    detail: `${matrix.summary.partialRoles} 个岗位只能顶岗，长篇结构、整卷资料和海外包装容易被迫拆碎。${matrix.nextAction}`,
    actionLabel: "去调整模型岗位",
    actionHref: "/settings/models#model-role-matrix",
  };
}
