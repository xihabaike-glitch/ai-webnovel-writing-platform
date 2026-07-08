import { getProviderOption, getProviderModelPresets } from "./providerDefaults.ts";
import type { RouteConfirmationRecheckAdviceItem } from "./routeConfirmation.ts";
import { labelForRoutedTask, type RoutedModelTaskType } from "./taskRouting.ts";
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
  providerConfigId: string | null;
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
  interfaceCoverage: ModelProviderInterfaceCoverage;
  headline: string;
  nextAction: string;
  roles: ModelWritingRole[];
}

export interface ModelProviderInterfaceCoverageItem {
  providerId: "claude" | "deepseek" | "kimi" | "gpt";
  providerName: string;
  roleTitle: string;
  ownerLabel: string;
  status: "ready" | "needs_save" | "missing";
  statusLabel: string;
  model: string | null;
  detail: string;
  actionLabel: string;
}

export interface ModelProviderInterfaceCoverage {
  totalInterfaces: number;
  readyInterfaces: number;
  missingInterfaces: number;
  headline: string;
  detail: string;
  actionHref: string;
  actionLabel: string;
  items: ModelProviderInterfaceCoverageItem[];
}

export interface ModelRoleMatrixPriorityBlocker {
  tone: "blocked" | "watch";
  title: string;
  detail: string;
  actionLabel: string;
  actionHref: string;
}

export interface ModelRoleRepairQueueItem {
  providerId: "claude" | "deepseek" | "kimi" | "gpt";
  providerName: string;
  roleTitle: string;
  ownerLabel: string;
  status: "needs_save" | "missing";
  priorityLabel: string;
  repairLabel: string;
  detail: string;
  href: string;
  gateReturnHref: string;
  evidenceChecklist: string[];
  stopLine: string;
}

export interface ModelRoleMatrixPmFocusNotice {
  tone: "blocked" | "watch" | "ready";
  headline: string;
  reason: string;
  proof: string;
  actionLabel: string;
  actionHref: string;
  pipelineActionLabel: string;
  pipelineActionHref: string;
  pipelineValidationHint: string;
}

export interface ModelRoleRouteDraftRoute {
  taskType: string;
  primaryProviderConfigId: string | null;
  fallbackProviderConfigId: string | null;
}

export interface ModelRoleRouteDraftItem {
  taskType: RoutedModelTaskType;
  label: string;
  status: "ready" | "current" | "missing";
  ownerRoleId: ModelWritingRoleId;
  ownerRoleTitle: string;
  fallbackRoleTitle: string | null;
  primaryProviderConfigId: string | null;
  fallbackProviderConfigId: string | null;
  currentPrimaryProviderConfigId: string | null;
  currentFallbackProviderConfigId: string | null;
  primaryProviderName: string;
  fallbackProviderName: string | null;
  reason: string;
  manualGate: string;
  costWatchLabel: string;
  recheckAction: string;
}

export interface ModelRoleRouteDraft {
  summary: {
    total: number;
    ready: number;
    current: number;
    missing: number;
  };
  nextActions: string[];
  items: ModelRoleRouteDraftItem[];
}

export interface ModelRoleRouteBatchSavePlanItem {
  taskType: RoutedModelTaskType;
  label: string;
  ownerRoleTitle: string;
  manualGate: string;
  primaryProviderConfigId: string;
  fallbackProviderConfigId: string | null;
  primaryProviderName: string;
  fallbackProviderName: string | null;
  confirmation: {
    source: "manual";
    reason: string;
    primaryProviderName: string;
    fallbackProviderName: string | null;
    routeStatus: "ready";
  };
}

export interface ModelRoleRouteBatchSavePlan {
  summary: {
    readyToSave: number;
    alreadyCurrent: number;
    missing: number;
  };
  items: ModelRoleRouteBatchSavePlanItem[];
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

const roleRouteDraftDefinitions: Array<{
  taskType: RoutedModelTaskType;
  ownerRoleId: ModelWritingRoleId;
  fallbackRoleId: ModelWritingRoleId;
  reason: string;
  manualGate: string;
  costWatchLabel: string;
  recheckAction: string;
}> = [
  {
    taskType: "chapter_draft",
    ownerRoleId: "draft_writer",
    fallbackRoleId: "context_librarian",
    reason: "正文初稿先交给中文网文写手，备用用长上下文资料官兜底，避免章节跑偏。",
    manualGate: "首轮只跑 1 章样本，质量分和人工读感过线后再批量。",
    costWatchLabel: "成本观察：低成本批量",
    recheckAction: "跑 1 章样本，复看质量、成本和备用命中。",
  },
  {
    taskType: "chapter_review",
    ownerRoleId: "structure_editor",
    fallbackRoleId: "context_librarian",
    reason: "章节审稿交给长篇结构主编，备用用资料官复核连续性和伏笔。",
    manualGate: "审稿问题必须落到钩子、爽点、人物弧光或伏笔，不接受泛泛建议。",
    costWatchLabel: "成本观察：高成本结构审稿",
    recheckAction: "同章复检问题清单，复看质量、成本和备用命中。",
  },
  {
    taskType: "chapter_second_pass",
    ownerRoleId: "structure_editor",
    fallbackRoleId: "draft_writer",
    reason: "二改由结构主编守住问题清单，备用写手负责把修改落成正文。",
    manualGate: "二改候选必须人工确认后才能覆盖正文。",
    costWatchLabel: "成本观察：高成本二改",
    recheckAction: "同章二改复检，复看改稿收益、成本和备用命中。",
  },
  {
    taskType: "submission_package_optimize",
    ownerRoleId: "overseas_packager",
    fallbackRoleId: "structure_editor",
    reason: "投稿包装交给海外投稿包装编辑，备用结构主编检查卖点是否真实。",
    manualGate: "标题、简介、标签和卖点必须人工采用后才能进入发布包版本。",
    costWatchLabel: "成本观察：中成本包装",
    recheckAction: "跑 1 个发布包样本，复看采用率、成本和备用命中。",
  },
  {
    taskType: "first_three_rewrite",
    ownerRoleId: "structure_editor",
    fallbackRoleId: "draft_writer",
    reason: "前三章改写先由结构主编抓钩子和追读，备用写手只做小样本改写。",
    manualGate: "前三章改写必须逐章对比，确认追读问题更强后再保存。",
    costWatchLabel: "成本观察：高成本开局改写",
    recheckAction: "先改第 1 章样本，复看追读增益、成本和备用命中。",
  },
  {
    taskType: "control_asset_generate",
    ownerRoleId: "context_librarian",
    fallbackRoleId: "structure_editor",
    reason: "总控资料交给长上下文资料官，备用结构主编校验人物弧光和主线支线。",
    manualGate: "总控资料只作为项目土壤候选，人物和世界观不得自动覆盖。",
    costWatchLabel: "成本观察：长上下文消耗",
    recheckAction: "跑 1 份项目土壤样本，复看资料引用、成本和备用命中。",
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

function buildModelProviderInterfaceCoverage(roles: ModelWritingRole[]): ModelProviderInterfaceCoverage {
  const roleById = new Map(roles.map((role) => [role.id, role]));
  const items = roleDefinitions
    .map((definition): ModelProviderInterfaceCoverageItem => {
      const providerId = definition.preferredProviderIds[0] as ModelProviderInterfaceCoverageItem["providerId"];
      const role = roleById.get(definition.id);
      const status: ModelProviderInterfaceCoverageItem["status"] = role?.status === "ready"
        ? "ready"
        : role?.status === "partial"
          ? "needs_save"
          : "missing";
      const providerName = providerLabel(providerId);

      return {
        providerId,
        providerName,
        roleTitle: definition.title,
        ownerLabel: definition.ownerLabel,
        status,
        statusLabel: status === "ready" ? "已就绪" : status === "needs_save" ? "需补配置" : "缺接口",
        model: role?.model ?? null,
        detail: status === "ready"
          ? `${providerName} 已接到「${definition.title}」，可产出${definition.deliverables.slice(0, 2).join("、")}。`
          : status === "needs_save"
            ? `${providerName} 可顶岗，但上下文或配置还没达到长篇要求；先补配置再放大任务。`
            : `缺少 ${providerName} 可用接口，「${definition.title}」会退回 Mock 或人工补位。`,
        actionLabel: status === "ready" ? "已接入" : "补接口",
      };
    });
  const readyInterfaces = items.filter((item) => item.status === "ready").length;
  const missingInterfaces = items.length - readyInterfaces;
  const missingNames = items
    .filter((item) => item.status !== "ready")
    .map((item) => item.providerName);

  return {
    totalInterfaces: items.length,
    readyInterfaces,
    missingInterfaces,
    headline: `模型接口留口：${readyInterfaces}/${items.length} 已就绪`,
    detail: missingInterfaces === 0
      ? "Claude、DeepSeek、Kimi、GPT 四个接口都已接到写作岗位，下一步检查职责路由、备用模型和复检入口。"
      : `还缺 ${missingInterfaces} 个接口：${missingNames.join("、")}。先补齐 Claude、DeepSeek、Kimi、GPT 的写作岗位入口，再让真实项目跑 AI 任务。`,
    actionHref: "/settings/models#model-provider-interfaces",
    actionLabel: missingInterfaces === 0 ? "检查接口留口" : "补模型接口",
    items,
  };
}

function providerDisplay(provider: ModelRoleProviderInput | null) {
  return provider ? `${provider.displayName} · ${provider.defaultModel}` : "暂无可用模型";
}

function modelRoleRepairProviderName(providerId: ModelRoleRepairQueueItem["providerId"], providerName: string) {
  return providerId === "gpt" ? "GPT" : providerName;
}

function sameRoute(
  route: ModelRoleRouteDraftRoute | undefined,
  primaryProviderConfigId: string | null,
  fallbackProviderConfigId: string | null,
) {
  return (route?.primaryProviderConfigId ?? null) === primaryProviderConfigId
    && (route?.fallbackProviderConfigId ?? null) === fallbackProviderConfigId;
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
      providerConfigId: provider?.id ?? null,
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
    interfaceCoverage: buildModelProviderInterfaceCoverage(roles),
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
      actionHref: "/settings/models?focus=model-role-matrix#model-role-matrix",
    };
  }

  return {
    tone: "watch",
    title: "模型岗位上下文不够",
    detail: `${matrix.summary.partialRoles} 个岗位只能顶岗，长篇结构、整卷资料和海外包装容易被迫拆碎。${matrix.nextAction}`,
    actionLabel: "去调整模型岗位",
    actionHref: "/settings/models?focus=model-role-matrix#model-role-matrix",
  };
}

export function buildModelRoleRepairQueue(matrix: ModelRoleMatrix): ModelRoleRepairQueueItem[] {
  return matrix.interfaceCoverage.items
    .filter((item): item is ModelProviderInterfaceCoverageItem & { status: "needs_save" | "missing" } => item.status !== "ready")
    .map((item, index): ModelRoleRepairQueueItem => {
      const providerName = modelRoleRepairProviderName(item.providerId, item.providerName);

      return {
        providerId: item.providerId,
        providerName,
        roleTitle: item.roleTitle,
        ownerLabel: item.ownerLabel,
        status: item.status,
        priorityLabel: `第 ${index + 1} 步`,
        repairLabel: item.status === "missing" ? `配置 ${providerName}` : `补强 ${providerName}`,
        detail: item.status === "missing"
          ? `先给${providerName}保存 API Key、默认模型和上下文上限，再测试连接；否则「${item.roleTitle}」会继续退回 Mock 或人工补位。`
          : `${providerName} 已能顶岗，但上下文或配置不够稳；先补默认模型、上下文上限和连接测试，再放进真实写作链路。`,
        href: `/settings/models?provider=${item.providerId}#provider-config-form`,
        gateReturnHref: "/settings/models?focus=model-role-matrix#model-role-matrix",
        evidenceChecklist: ["API Key 已保存", "连接测试通过", "默认模型与上下文已保存", "回职责矩阵复检"],
        stopLine: `未完成${providerName}修复前，不允许把「${item.roleTitle}」算作真实模型岗位。`,
      };
    });
}

export function buildModelRoleMatrixPmFocusNotice(matrix: ModelRoleMatrix): ModelRoleMatrixPmFocusNotice {
  const tone: ModelRoleMatrixPmFocusNotice["tone"] = matrix.status === "ready"
    ? "ready"
    : matrix.status === "partial"
      ? "watch"
      : "blocked";
  const proof = matrix.status === "ready"
    ? "四个写作岗位都有首选模型，下一步看职责路由、失败替代、成本压力和复检入口是否都已匹配。"
    : "模型岗位矩阵必须说明首选模型、备用模型、失败替代路线、成本压力和后续复检入口。";

  return {
    tone,
    headline: "当前优先：模型任务化，别再做聊天壳。",
    reason: "写作平台的下一步不是增加聊天入口，而是让 Claude、DeepSeek、Kimi、GPT 按写作任务分工并可复检。",
    proof,
    actionLabel: matrix.status === "ready" ? "检查职责路由" : "补模型岗位",
    actionHref: "/settings/models?focus=model-role-matrix#model-role-matrix",
    pipelineActionLabel: "验收真实流水线",
    pipelineActionHref: "/projects#pipeline-projects",
    pipelineValidationHint: "模型岗位必须落到开书、首章、审稿、发布包和复盘证据；没有真实作品流水线，就只是聊天壳。",
  };
}

export function buildModelRoleRouteDraft(
  providers: ModelRoleProviderInput[],
  routes: ModelRoleRouteDraftRoute[],
): ModelRoleRouteDraft {
  const matrix = buildModelRoleMatrix(providers);
  const roleById = new Map(matrix.roles.map((role) => [role.id, role]));
  const providerById = new Map(providers.map((provider) => [provider.id, provider]));
  const routesByTaskType = new Map(routes.map((route) => [route.taskType, route]));

  const items = roleRouteDraftDefinitions.map((definition): ModelRoleRouteDraftItem => {
    const ownerRole = roleById.get(definition.ownerRoleId);
    const fallbackRole = roleById.get(definition.fallbackRoleId);
    const primaryProviderConfigId = ownerRole?.status === "missing" ? null : ownerRole?.providerConfigId ?? null;
    const fallbackProviderConfigId = fallbackRole?.status === "missing" || fallbackRole?.providerConfigId === primaryProviderConfigId
      ? null
      : fallbackRole?.providerConfigId ?? null;
    const route = routesByTaskType.get(definition.taskType);
    const status: ModelRoleRouteDraftItem["status"] = !primaryProviderConfigId
      ? "missing"
      : sameRoute(route, primaryProviderConfigId, fallbackProviderConfigId)
        ? "current"
        : "ready";
    const primaryProvider = primaryProviderConfigId ? providerById.get(primaryProviderConfigId) ?? null : null;
    const fallbackProvider = fallbackProviderConfigId ? providerById.get(fallbackProviderConfigId) ?? null : null;

    return {
      taskType: definition.taskType,
      label: labelForRoutedTask(definition.taskType),
      status,
      ownerRoleId: definition.ownerRoleId,
      ownerRoleTitle: ownerRole?.title ?? definition.ownerRoleId,
      fallbackRoleTitle: fallbackProviderConfigId ? fallbackRole?.title ?? null : null,
      primaryProviderConfigId,
      fallbackProviderConfigId,
      currentPrimaryProviderConfigId: route?.primaryProviderConfigId ?? null,
      currentFallbackProviderConfigId: route?.fallbackProviderConfigId ?? null,
      primaryProviderName: providerDisplay(primaryProvider),
      fallbackProviderName: fallbackProvider ? providerDisplay(fallbackProvider) : null,
      reason: status === "missing" ? `${labelForRoutedTask(definition.taskType)}缺少${ownerRole?.title ?? "负责岗位"}，先补模型岗位再谈路线。` : definition.reason,
      manualGate: definition.manualGate,
      costWatchLabel: definition.costWatchLabel,
      recheckAction: definition.recheckAction,
    };
  });
  const ready = items.filter((item) => item.status === "ready").length;
  const current = items.filter((item) => item.status === "current").length;
  const missing = items.filter((item) => item.status === "missing").length;

  return {
    summary: {
      total: items.length,
      ready,
      current,
      missing,
    },
    nextActions: [
      ready > 0 ? `${ready} 条职责路线可应用到模型任务路由。` : null,
      current > 0 ? `${current} 条职责路线已经匹配当前配置。` : null,
      missing > 0 ? `${missing} 条路线缺少首选岗位，先补模型岗位。` : null,
    ].filter((item): item is string => Boolean(item)),
    items,
  };
}

export function buildModelRoleRouteBatchSavePlan(draft: ModelRoleRouteDraft): ModelRoleRouteBatchSavePlan {
  const items = draft.items
    .filter((item) => item.status === "ready" && Boolean(item.primaryProviderConfigId))
    .map((item): ModelRoleRouteBatchSavePlanItem => ({
      taskType: item.taskType,
      label: item.label,
      ownerRoleTitle: item.ownerRoleTitle,
      manualGate: item.manualGate,
      primaryProviderConfigId: item.primaryProviderConfigId as string,
      fallbackProviderConfigId: item.fallbackProviderConfigId,
      primaryProviderName: item.primaryProviderName,
      fallbackProviderName: item.fallbackProviderName,
      confirmation: {
        source: "manual",
        reason: `职责路由批量保存：${item.label} 交给 ${item.ownerRoleTitle}。${item.reason} 人工闸门：${item.manualGate}`,
        primaryProviderName: item.primaryProviderName,
        fallbackProviderName: item.fallbackProviderName,
        routeStatus: "ready",
      },
    }));

  return {
    summary: {
      readyToSave: items.length,
      alreadyCurrent: draft.items.filter((item) => item.status === "current").length,
      missing: draft.items.filter((item) => item.status === "missing").length,
    },
    items,
  };
}

export function buildModelRoleRouteRecheckAdviceFromBatchPlan(
  plan: ModelRoleRouteBatchSavePlan,
  createdAt: string | Date = new Date(),
): RouteConfirmationRecheckAdviceItem[] {
  const createdAtIso = typeof createdAt === "string" ? new Date(createdAt).toISOString() : createdAt.toISOString();

  return plan.items.map((item): RouteConfirmationRecheckAdviceItem => ({
    id: `role-route-recheck:${item.taskType}:${createdAtIso}`,
    taskType: item.taskType,
    label: item.label,
    severity: "warning",
    action: "manual_review",
    actionLabel: "跑小样本复检",
    recommendation: `${item.label}已按${item.ownerRoleTitle}职责路线保存，先跑 1 个小样本复检质量、成本和备用命中，再开放批量生产。`,
    sampleCount: null,
    successRatePercent: null,
    qualityScore: null,
    cost: null,
    fallbackHit: null,
    needsGovernance: null,
    evidence: [
      `首选：${item.primaryProviderName}`,
      item.fallbackProviderName ? `备用：${item.fallbackProviderName}` : "备用：无",
      `人工闸门：${item.manualGate}`,
      `保存原因：${item.confirmation.reason}`,
    ],
    completedAt: null,
  }));
}
