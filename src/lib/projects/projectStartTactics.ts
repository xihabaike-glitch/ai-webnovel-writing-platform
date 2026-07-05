import type { PlatformProfile } from "../platforms/platformProfiles.ts";
import type { PlatformWritingStyleTemplate } from "../platforms/writingStyleTemplates.ts";
import type { ModelRouteConfirmationReceipt } from "../model-gateway/routeConfirmation.ts";
import {
  buildGateBatchTacticEffectReview,
  buildGatePlatformDecisionTimeline,
  buildGatePlatformTacticExperienceLibrary,
  type GateActionReceipt,
  type GateBatchTacticEffectItem,
  type GateKnowledgeFeedbackReceipt,
  type GatePlatformTacticExperienceItem,
  type PersistedGatePlatformDispatchTask,
} from "./gateActionReceipts.ts";
import type { ProjectTemplate } from "./projectTemplates.ts";

export type ProjectStartTacticAdviceStatus = "history_blocked" | "history_watch" | "history_usable" | "template";

export interface ProjectStartTacticAdvice {
  status: ProjectStartTacticAdviceStatus;
  label: string;
  title: string;
  primaryTactic: string;
  openingMove: string;
  verificationMove: string;
  risk: string;
  evidence: string[];
  checklist: string[];
}

export interface ProjectStartTacticWorldEntry {
  type: "platform_soil";
  title: string;
  content: string;
}

export interface ProjectStartTacticSummary {
  title: string;
  label: string;
  primaryTactic: string;
  openingMove: string;
  verificationMove: string;
  risk: string;
  handoffStatus?: ProjectStartExperienceHandoffStatus;
  handoffLabel?: string;
  handoffDetail?: string;
  recommendedPlatformName?: string | null;
  recommendedTemplateId?: ProjectTemplate["id"] | null;
  firstDayActions?: string[];
  avoidRules?: string[];
  handoffEvidence?: string[];
}

export type ProjectStartPlatformExperienceStatus = "recommended" | "watch" | "avoid" | "template";

export interface ProjectStartPlatformExperienceItem {
  platformId: PlatformProfile["id"];
  platformName: string;
  status: ProjectStartPlatformExperienceStatus;
  label: string;
  headline: string;
  detail: string;
  priorityScore: number;
  source: "experience" | "batch" | "template";
  href: string;
  evidence: string[];
}

export interface ProjectStartPlatformExperienceGuide {
  summary: {
    total: number;
    recommended: number;
    watch: number;
    avoid: number;
    template: number;
  };
  nextActions: string[];
  items: ProjectStartPlatformExperienceItem[];
}

export type ProjectStartRiskGateLevel = "pass" | "watch" | "blocked";

export interface ProjectStartRiskGate {
  level: ProjectStartRiskGateLevel;
  requiresConfirmation: boolean;
  label: string;
  title: string;
  detail: string;
  actionLabel: string;
  evidence: string[];
}

export interface ProjectStartTacticEntryLike {
  type: string;
  title: string;
  content: string;
}

export interface ProjectStartModelRouteExperience {
  taskLabel: string;
  primaryProviderName: string;
  fallbackProviderName: string | null;
  recommendationSummary: string | null;
  evidence: string[];
}

export interface ProjectStartTacticEvidenceSelection {
  guideItem: ProjectStartPlatformExperienceItem | null;
  experience: GatePlatformTacticExperienceItem | null;
  batchEffect: GateBatchTacticEffectItem | null;
}

export interface ProjectStartGateExperience {
  advice: ProjectStartTacticAdvice;
  selection: ProjectStartTacticEvidenceSelection;
  experiences: GatePlatformTacticExperienceItem[];
  batchEffects: GateBatchTacticEffectItem[];
  modelRoutes: ProjectStartModelRouteExperience[];
}

export type ProjectStartExperienceHandoffStatus = "reuse" | "small_sample" | "blocked" | "template";

export interface ProjectStartExperienceHandoff {
  status: ProjectStartExperienceHandoffStatus;
  label: string;
  title: string;
  detail: string;
  selectedPlatformId: PlatformProfile["id"];
  selectedPlatformName: string;
  recommendedPlatformId: PlatformProfile["id"] | null;
  recommendedPlatformName: string | null;
  recommendedTemplateId: ProjectTemplate["id"] | null;
  shouldSwitchTemplate: boolean;
  firstDayActions: string[];
  avoidRules: string[];
  evidence: string[];
}

function routeDetailValue(detail: string, label: string) {
  const match = detail.match(new RegExp(`${label}：([^；;]+)`));
  return match?.[1]?.trim() || null;
}

function routeRecommendationSummary(detail: string) {
  const match = detail.match(/推荐依据：(.+?)(?:[；;]依据：|$)/);
  return match?.[1]?.trim() || null;
}

const modelRouteTaskOrder = new Map([
  ["正文初稿", 0],
  ["章节审稿", 1],
  ["章节二改", 2],
  ["前三章重写", 3],
  ["投稿包装优化", 4],
  ["总控资料生成", 5],
]);

export function buildProjectStartModelRouteExperienceFromReceipts(receipts: GateActionReceipt[]): ProjectStartModelRouteExperience[] {
  const routes = receipts
    .filter((receipt) => receipt.executionType === "model_route" && receipt.status === "succeeded")
    .map((receipt) => {
      const primaryProviderName = routeDetailValue(receipt.detail, "首选");
      if (!primaryProviderName) return null;
      const taskLabel = receipt.label.replace(/路由已确认$/, "").trim() || receipt.label;
      const recommendationSummary = routeRecommendationSummary(receipt.detail);
      const fallbackProviderName = routeDetailValue(receipt.detail, "备用");
      return {
        taskLabel,
        primaryProviderName,
        fallbackProviderName: fallbackProviderName === "无备用" ? null : fallbackProviderName,
        recommendationSummary,
        evidence: [
          `${taskLabel}首选 ${primaryProviderName}${fallbackProviderName && fallbackProviderName !== "无备用" ? `，备用 ${fallbackProviderName}` : ""}`,
          recommendationSummary ? `推荐依据：${recommendationSummary}` : receipt.message,
        ].filter((item): item is string => Boolean(item)),
        createdAt: receipt.createdAt,
      };
    })
    .filter((route): route is ProjectStartModelRouteExperience & { createdAt: string } => Boolean(route))
    .sort((left, right) => {
      const orderDiff = (modelRouteTaskOrder.get(left.taskLabel) ?? 99) - (modelRouteTaskOrder.get(right.taskLabel) ?? 99);
      if (orderDiff !== 0) return orderDiff;
      return right.createdAt.localeCompare(left.createdAt);
    });
  const usedTaskLabels = new Set<string>();

  return routes.flatMap((route): ProjectStartModelRouteExperience[] => {
    if (usedTaskLabels.has(route.taskLabel)) return [];
    usedTaskLabels.add(route.taskLabel);
    const { createdAt: _createdAt, ...experience } = route;
    return [experience];
  });
}

export function buildProjectStartModelRouteExperienceFromConfirmations(confirmations: ModelRouteConfirmationReceipt[]): ProjectStartModelRouteExperience[] {
  const receipts: GateActionReceipt[] = confirmations.map((confirmation) => ({
    id: confirmation.id,
    actionId: confirmation.actionId,
    label: confirmation.label,
    detail: confirmation.detail,
    href: confirmation.href,
    status: confirmation.status,
    message: confirmation.message,
    executionType: confirmation.executionType,
    succeededCount: confirmation.succeededCount,
    failedCount: confirmation.failedCount,
    taskId: null,
    platformId: confirmation.platformId,
    platformName: confirmation.platformName,
    recheck: {
      status: confirmation.recheck.status,
      label: confirmation.recheck.label,
      detail: confirmation.recheck.detail,
      actionLabel: confirmation.recheck.action,
    },
    createdAt: confirmation.createdAt,
  }));

  return buildProjectStartModelRouteExperienceFromReceipts(receipts);
}

function defaultTacticForCategory(platform: PlatformProfile) {
  if (platform.category === "paid") return "先搭长线主干，再用前三章证明升级期待。";
  if (platform.category === "free") return "先抓首章钩子，再用前三章连续兑现爽点和情绪回报。";
  if (platform.category === "female") return "先立人物关系张力，再让每章推进情感或人物弧光。";
  if (platform.category === "short") return "第一段进矛盾，前千字建立付费期待，结尾回收反转。";
  return "先让海外读者读懂承诺，再用清晰节奏验证题材标签。";
}

function historyStatus(experience: GatePlatformTacticExperienceItem): ProjectStartTacticAdviceStatus {
  if (experience.status === "blocked") return "history_blocked";
  if (experience.status === "watch") return "history_watch";
  return "history_usable";
}

function historyLabel(experience: GatePlatformTacticExperienceItem) {
  if (experience.status === "blocked") return "历史避坑";
  if (experience.status === "watch") return "历史观察";
  return "历史可复用";
}

function isRecheckStopExperience(experience: GatePlatformTacticExperienceItem) {
  return experience.tactic === "复盘止损样本";
}

function isAcceptanceReviewExperience(experience: GatePlatformTacticExperienceItem) {
  return experience.tactic === "验收标准修正打法";
}

function isWeakExecutionReviewExperience(experience: GatePlatformTacticExperienceItem) {
  return experience.tactic === "返工动作收口打法";
}

function batchEffectForPlatform(batchEffects: GateBatchTacticEffectItem[], platform: PlatformProfile) {
  return batchEffects.find((item) => item.tacticTitle.includes(platform.name)) ?? null;
}

function isRecoveryBatchEffect(batchEffect: GateBatchTacticEffectItem | null | undefined) {
  return (batchEffect?.recoveryBatches ?? 0) > 0;
}

function isKnowledgeFeedbackAvoidance(receipt: GateKnowledgeFeedbackReceipt) {
  const text = [
    receipt.actionLabel,
    receipt.title,
    receipt.message,
    receipt.completedStepLabel,
    receipt.stopReason,
    receipt.nextAction,
  ].join(" ");
  return /避坑|负反馈|暂停|止损|不要|不支持|降权/u.test(text);
}

function knowledgeFeedbackExperienceStatus(receipt: GateKnowledgeFeedbackReceipt): GatePlatformTacticExperienceItem["status"] {
  if (receipt.severity === "success") return "usable";
  return isKnowledgeFeedbackAvoidance(receipt) ? "blocked" : "watch";
}

function knowledgeFeedbackExperienceLabel(status: GatePlatformTacticExperienceItem["status"]) {
  if (status === "usable") return "可复用打法";
  if (status === "blocked") return "避坑样本";
  return "观察样本";
}

function knowledgeFeedbackExperienceTactic(status: GatePlatformTacticExperienceItem["status"]) {
  if (status === "usable") return "发布效果正反馈打法";
  if (status === "blocked") return "发布效果避坑样本";
  return "发布效果补证据样本";
}

export function buildProjectStartKnowledgeFeedbackExperiences(
  receipts: GateKnowledgeFeedbackReceipt[],
  limit = 20,
): GatePlatformTacticExperienceItem[] {
  const latestByPlatform = new Map<string, GateKnowledgeFeedbackReceipt>();
  for (const receipt of receipts
    .slice()
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())) {
    if (!latestByPlatform.has(receipt.platformId)) latestByPlatform.set(receipt.platformId, receipt);
  }

  return [...latestByPlatform.values()]
    .slice(0, limit)
    .map((receipt): GatePlatformTacticExperienceItem => {
      const status = knowledgeFeedbackExperienceStatus(receipt);
      const label = knowledgeFeedbackExperienceLabel(status);
      const latestAt = new Date(receipt.createdAt).toISOString();
      return {
        platformId: receipt.platformId,
        platformName: receipt.platformName,
        status,
        label,
        tactic: knowledgeFeedbackExperienceTactic(status),
        lesson: receipt.message,
        reuseHint: receipt.nextAction,
        risk: receipt.stopReason || (status === "usable" ? "复用前仍要保留首轮数据回收。" : "缺下一轮真实效果前，不要写成成功打法。"),
        href: receipt.href,
        sourceStatus: status === "usable" ? "healthy" : status === "blocked" ? "blocked" : "needs_effect",
        sourceLabel: receipt.completedStepLabel || receipt.actionLabel,
        priorityScore: status === "usable" ? 92 : status === "blocked" ? 90 : 72,
        latestAt,
        evidence: uniqueLines([
          `平台反哺：${receipt.actionLabel}`,
          `已推进：${receipt.completedStepLabel}`,
          receipt.stopReason,
          receipt.nextAction,
        ], 4),
      };
    });
}

function batchRecoveryLabel(batchEffect: GateBatchTacticEffectItem) {
  if (!isRecoveryBatchEffect(batchEffect)) {
    if (batchEffect.status === "usable") return "批量可复用";
    if (batchEffect.status === "blocked") return "批量避坑";
    return "批量观察";
  }
  if (batchEffect.status === "usable") return "恢复放量打法";
  if (batchEffect.status === "blocked") return "恢复放量避坑";
  return "恢复放量观察";
}

function batchRecoveryEvidence(batchEffect: GateBatchTacticEffectItem) {
  return isRecoveryBatchEffect(batchEffect)
    ? [`恢复放量：${batchEffect.recoveryBatches} 批，仍按小样本节奏复用`]
    : [];
}

export function buildProjectStartPlatformExperienceGuide(input: {
  platforms: PlatformProfile[];
  experiences?: GatePlatformTacticExperienceItem[];
  batchEffects?: GateBatchTacticEffectItem[];
  limit?: number;
}): ProjectStartPlatformExperienceGuide {
  const experiences = input.experiences ?? [];
  const batchEffects = input.batchEffects ?? [];
  const items = input.platforms.map((platform): ProjectStartPlatformExperienceItem => {
    const experience = experiences.find((item) => item.platformId === platform.id) ?? null;
    const batchEffect = batchEffectForPlatform(batchEffects, platform);

    if (batchEffect?.status === "blocked") {
      const recovery = isRecoveryBatchEffect(batchEffect);
      return {
        platformId: platform.id,
        platformName: platform.name,
        status: "avoid",
        label: batchRecoveryLabel(batchEffect),
        headline: recovery ? `${platform.name} 恢复放量先刹车` : `${platform.name} 暂不优先`,
        detail: recovery
          ? `恢复放量批次已经变成避坑样本，先拆失败原因，避开「${batchEffect.openingMove || batchEffect.primaryTactic}」。`
          : `批量样本已经标记为 ${batchEffect.tacticLabel}，先避开「${batchEffect.openingMove || batchEffect.primaryTactic}」。`,
        priorityScore: 100 + batchEffect.failedTasks,
        source: "batch",
        href: "/gate",
        evidence: [
          `批量样本：${batchEffect.sampleBatches} 批，成功率 ${batchEffect.successRatePercent}%，失败 ${batchEffect.failedTasks}`,
          ...batchRecoveryEvidence(batchEffect),
          ...batchEffect.evidence.slice(0, 2),
        ],
      };
    }

    if (experience?.status === "blocked") {
      const isStopReview = isRecheckStopExperience(experience);
      return {
        platformId: platform.id,
        platformName: platform.name,
        status: "avoid",
        label: isStopReview ? "复盘止损" : "历史避坑",
        headline: isStopReview ? `${platform.name} 先暂停方向` : `${platform.name} 先别硬上`,
        detail: isStopReview
          ? `历史返工复盘已经判定当前方向要止损。${experience.reuseHint}`
          : `${experience.tactic} 已经沉淀为避坑样本。${experience.reuseHint}`,
        priorityScore: experience.priorityScore,
        source: "experience",
        href: experience.href,
        evidence: experience.evidence.slice(0, 3),
      };
    }

    if (experience?.status === "usable") {
      return {
        platformId: platform.id,
        platformName: platform.name,
        status: "recommended",
        label: "历史可复用",
        headline: `${platform.name} 优先参考`,
        detail: `${experience.tactic} 可作为新项目开书参考。${experience.reuseHint}`,
        priorityScore: experience.priorityScore,
        source: "experience",
        href: experience.href,
        evidence: experience.evidence.slice(0, 3),
      };
    }

    if (batchEffect?.status === "usable") {
      const recovery = isRecoveryBatchEffect(batchEffect);
      return {
        platformId: platform.id,
        platformName: platform.name,
        status: "recommended",
        label: batchRecoveryLabel(batchEffect),
        headline: recovery ? `${platform.name} 恢复放量已站住` : `${platform.name} 可复用批量打法`,
        detail: recovery
          ? `${batchEffect.primaryTactic} 恢复放量连续稳定，但新项目仍先跑小样本。`
          : `${batchEffect.primaryTactic} ${batchEffect.nextAction}`,
        priorityScore: batchEffect.successRatePercent,
        source: "batch",
        href: "/gate",
        evidence: [
          `批量样本：${batchEffect.sampleBatches} 批，成功率 ${batchEffect.successRatePercent}%，质量 ${batchEffect.averageQualityScore ?? "缺"}`,
          ...batchRecoveryEvidence(batchEffect),
          ...batchEffect.evidence.slice(0, 2),
        ],
      };
    }

    if (experience?.status === "watch" || batchEffect?.status === "watch") {
      const source = experience?.status === "watch" ? experience : batchEffect;
      const isAcceptanceReview = experience ? isAcceptanceReviewExperience(experience) : false;
      const isWeakExecutionReview = experience ? isWeakExecutionReviewExperience(experience) : false;
      return {
        platformId: platform.id,
        platformName: platform.name,
        status: "watch",
        label: isAcceptanceReview
          ? "验收观察"
          : isWeakExecutionReview
            ? "动作观察"
            : experience?.status === "watch" ? "历史观察" : batchEffect ? batchRecoveryLabel(batchEffect) : "批量观察",
        headline: isAcceptanceReview
          ? `${platform.name} 先补验收线`
          : isWeakExecutionReview
            ? `${platform.name} 先收口动作`
            : isRecoveryBatchEffect(batchEffect) ? `${platform.name} 恢复放量继续观察` : `${platform.name} 小样本观察`,
        detail: experience?.status === "watch"
          ? isAcceptanceReview
            ? `历史返工复盘暴露验收标准不硬。${experience.reuseHint}`
            : isWeakExecutionReview
              ? `历史返工复盘暴露执行动作太虚。${experience.reuseHint}`
              : `${experience.tactic} 还不能写成成功打法。${experience.reuseHint}`
          : isRecoveryBatchEffect(batchEffect)
            ? `${batchEffect?.tacticLabel ?? "恢复放量观察"} 样本还薄，解除闸门后也只能小批验证。`
            : `${batchEffect?.tacticLabel ?? "批量样本"} 样本还薄，只能小批验证。`,
        priorityScore: experience?.status === "watch" ? experience.priorityScore : batchEffect?.successRatePercent ?? 40,
        source: experience?.status === "watch" ? "experience" : "batch",
        href: experience?.href ?? "/gate",
        evidence: experience?.evidence.slice(0, 3) ?? [
          ...(batchEffect ? batchRecoveryEvidence(batchEffect) : []),
          ...(batchEffect?.evidence.slice(0, 3) ?? []),
        ],
      };
    }

    return {
      platformId: platform.id,
      platformName: platform.name,
      status: "template",
      label: "模板默认",
      headline: `${platform.name} 按模板开书`,
      detail: `${defaultTacticForCategory(platform)} 暂无历史样本，先走平台模板和小步验证。`,
      priorityScore: 20,
      source: "template",
      href: "/projects",
      evidence: [`平台风险：${platform.risks[0] ?? "按平台反馈继续校准。"}`],
    };
  });

  const statusWeight: Record<ProjectStartPlatformExperienceStatus, number> = {
    recommended: 0,
    watch: 1,
    template: 2,
    avoid: 3,
  };
  const sortedItems = items
    .sort((left, right) => {
      const statusDiff = statusWeight[left.status] - statusWeight[right.status];
      if (statusDiff !== 0) return statusDiff;
      const priorityDiff = right.priorityScore - left.priorityScore;
      if (priorityDiff !== 0) return priorityDiff;
      return left.platformName.localeCompare(right.platformName);
    })
    .slice(0, input.limit ?? items.length);
  const recommended = sortedItems.filter((item) => item.status === "recommended").length;
  const watch = sortedItems.filter((item) => item.status === "watch").length;
  const avoid = sortedItems.filter((item) => item.status === "avoid").length;
  const template = sortedItems.filter((item) => item.status === "template").length;
  const firstRecommended = sortedItems.find((item) => item.status === "recommended");

  return {
    summary: {
      total: sortedItems.length,
      recommended,
      watch,
      avoid,
      template,
    },
    nextActions: [
      firstRecommended ? `优先参考 ${firstRecommended.platformName}：${firstRecommended.detail}` : null,
      watch > 0 ? `${watch} 个平台只有观察样本，新项目只能小步验证。` : null,
      avoid > 0 ? `${avoid} 个平台有避坑信号，开书前先改入口、题材或验证口径。` : null,
      recommended === 0 ? "暂无可复用平台样本，先按模板开书并保留首轮数据回收。" : null,
    ].filter((action): action is string => Boolean(action)),
    items: sortedItems,
  };
}

export function selectProjectStartTemplateFromExperienceGuide(input: {
  templates: ProjectTemplate[];
  guide: ProjectStartPlatformExperienceGuide;
  fallbackTemplate: ProjectTemplate;
}): ProjectTemplate {
  const recommendedPlatform = input.guide.items.find((item) => item.status === "recommended");
  if (!recommendedPlatform) return input.fallbackTemplate;
  return input.templates.find((template) => template.platformId === recommendedPlatform.platformId) ?? input.fallbackTemplate;
}

export function buildProjectStartRiskGate(item: ProjectStartPlatformExperienceItem | null): ProjectStartRiskGate {
  if (!item) {
    return {
      level: "pass",
      requiresConfirmation: false,
      label: "可创建",
      title: "暂无平台风险信号",
      detail: "当前平台没有命中历史避坑或观察样本，可以按模板进入首轮验证。",
      actionLabel: "创建作品",
      evidence: [],
    };
  }

  if (item.status === "avoid") {
    return {
      level: "blocked",
      requiresConfirmation: true,
      label: "需确认",
      title: `${item.platformName} 命中避坑信号`,
      detail: `${item.detail} 创建前必须确认恢复条件，至少改掉入口卖点、前三章兑现或平台匹配度中的一项。`,
      actionLabel: "确认恢复条件后创建",
      evidence: item.evidence.slice(0, 3),
    };
  }

  if (item.status === "watch") {
    return {
      level: "watch",
      requiresConfirmation: false,
      label: "观察",
      title: `${item.platformName} 只能小样本观察`,
      detail: `${item.detail} 创建后先跑首轮数据回收，不要直接放量或批量复制。`,
      actionLabel: "小样本创建",
      evidence: item.evidence.slice(0, 3),
    };
  }

  return {
    level: "pass",
    requiresConfirmation: false,
    label: item.status === "recommended" ? "可优先" : "可创建",
    title: item.headline,
    detail: item.detail,
    actionLabel: "创建作品",
    evidence: item.evidence.slice(0, 3),
  };
}

function uniqueLines(lines: Array<string | null | undefined>, limit: number) {
  const seen = new Set<string>();
  return lines
    .map((line) => line?.trim())
    .filter((line): line is string => Boolean(line))
    .filter((line) => {
      if (seen.has(line)) return false;
      seen.add(line);
      return true;
    })
    .slice(0, limit);
}

export function buildProjectStartExperienceHandoff(input: {
  platform: PlatformProfile;
  template: ProjectTemplate;
  guide: ProjectStartPlatformExperienceGuide;
  advice: ProjectStartTacticAdvice;
  riskGate: ProjectStartRiskGate;
  recommendedTemplate?: ProjectTemplate | null;
}): ProjectStartExperienceHandoff {
  const guideItem = input.guide.items.find((item) => item.platformId === input.platform.id) ?? null;
  const recommendedItem = input.guide.items.find((item) => item.status === "recommended") ?? null;
  const recommendedTemplate = input.recommendedTemplate ?? null;
  const shouldSwitchTemplate = Boolean(
    recommendedTemplate
      && recommendedTemplate.platformId !== input.platform.id
      && guideItem?.status !== "recommended",
  );
  const status: ProjectStartExperienceHandoffStatus = input.riskGate.level === "blocked"
    ? "blocked"
    : input.riskGate.level === "watch"
      ? "small_sample"
      : guideItem?.status === "recommended"
        ? "reuse"
        : "template";
  const title = status === "blocked"
    ? `${input.platform.name} 开书前先过恢复条件`
    : status === "small_sample"
      ? `${input.platform.name} 只做小样本开书`
      : status === "reuse"
        ? `${input.platform.name} 可复用历史打法`
        : `${input.platform.name} 先按模板开书`;
  const label = status === "blocked"
    ? "避坑交接"
    : status === "small_sample"
      ? "观察交接"
      : status === "reuse"
        ? "复用交接"
        : "模板交接";
  const switchAction = shouldSwitchTemplate && recommendedTemplate && recommendedItem
    ? `可切到 ${recommendedItem.platformName} 的「${recommendedTemplate.label}」作为更稳开书底稿。`
    : null;

  return {
    status,
    label,
    title,
    detail: switchAction ?? input.riskGate.detail,
    selectedPlatformId: input.platform.id,
    selectedPlatformName: input.platform.name,
    recommendedPlatformId: recommendedItem?.platformId ?? null,
    recommendedPlatformName: recommendedItem?.platformName ?? null,
    recommendedTemplateId: recommendedTemplate?.id ?? null,
    shouldSwitchTemplate,
    firstDayActions: uniqueLines([
      `开头：${input.advice.openingMove}`,
      `验证：${input.advice.verificationMove}`,
      input.riskGate.requiresConfirmation ? "创建前写清恢复条件，只允许首轮小样本。" : "创建后回填前三章、平台包装和首轮数据证据。",
    ], 3),
    avoidRules: uniqueLines([
      status === "blocked" ? "不要直接复用历史失败入口、题材包装或前三章兑现方式。" : null,
      guideItem?.status === "watch" ? "不要把观察样本当成成功样本放量。" : null,
      input.advice.risk,
    ], 3),
    evidence: uniqueLines([
      ...(guideItem?.evidence ?? []),
      ...input.riskGate.evidence,
      ...input.advice.evidence,
    ], 5),
  };
}

export function selectProjectStartTacticEvidence(input: {
  platform: PlatformProfile;
  experiences?: GatePlatformTacticExperienceItem[];
  batchEffects?: GateBatchTacticEffectItem[];
}): ProjectStartTacticEvidenceSelection {
  const experiences = input.experiences ?? [];
  const batchEffects = input.batchEffects ?? [];
  const guide = buildProjectStartPlatformExperienceGuide({
    platforms: [input.platform],
    experiences,
    batchEffects,
    limit: 1,
  });
  const guideItem = guide.items[0] ?? null;

  if (guideItem?.source === "experience") {
    return {
      guideItem,
      experience: experiences.find((item) => item.platformId === input.platform.id) ?? null,
      batchEffect: null,
    };
  }

  if (guideItem?.source === "batch") {
    return {
      guideItem,
      experience: null,
      batchEffect: batchEffectForPlatform(batchEffects, input.platform),
    };
  }

  return {
    guideItem,
    experience: null,
    batchEffect: null,
  };
}

export function buildProjectStartTacticAdvice(input: {
  platform: PlatformProfile;
  template: ProjectTemplate;
  style: PlatformWritingStyleTemplate;
  experience?: GatePlatformTacticExperienceItem | null;
  batchEffect?: GateBatchTacticEffectItem | null;
  modelRoutes?: ProjectStartModelRouteExperience[];
}): ProjectStartTacticAdvice {
  const { platform, template, style, experience, batchEffect } = input;
  const firstThreeTitles = template.firstThree.map((chapter) => chapter.title).join(" / ");
  const modelRoutes = input.modelRoutes ?? [];
  const modelRouteEvidence = modelRoutes.flatMap((route) => route.evidence).slice(0, 4);
  const modelRouteChecklist = modelRoutes.length
    ? [`模型路线底座：${modelRoutes.map((route) => route.taskLabel).join("、")}`]
    : [];
  const modelRouteVerification = modelRoutes.length
    ? `；首批同时做模型路由复检，确认${modelRoutes.map((route) => route.taskLabel).join("、")}成功率、质量和成本。`
    : "";
  const withModelEvidence = (evidence: string[]) => [...evidence, ...modelRouteEvidence].slice(0, 5);
  const withModelChecklist = (checklist: string[]) => [...checklist, ...modelRouteChecklist].slice(0, 6);

  if (batchEffect) {
    const recovery = isRecoveryBatchEffect(batchEffect);
    const batchLabel = batchRecoveryLabel(batchEffect);
    const batchEvidence = [
      `批量样本：${batchEffect.sampleBatches} 批，成功率 ${batchEffect.successRatePercent}%，质量 ${batchEffect.averageQualityScore ?? "缺"}`,
      `任务结果：成功 ${batchEffect.succeededTasks}，失败 ${batchEffect.failedTasks}，成本 $${batchEffect.knownCostUsd.toFixed(4)}`,
      ...batchRecoveryEvidence(batchEffect),
      ...batchEffect.evidence.slice(0, 2),
    ];

    if (batchEffect.status === "blocked") {
      return {
        status: "history_blocked",
        label: recovery ? "恢复放量避坑" : "批量避坑",
        title: recovery ? `${platform.name}：恢复放量失败，先停再拆` : `${platform.name}：避开已跑崩打法`,
        primaryTactic: `不要复用「${batchEffect.openingMove || batchEffect.primaryTactic}」。先回到平台模板打法，再重做钩子、节奏和前三章兑现。`,
        openingMove: `避开已验证失败开头：${batchEffect.openingMove || batchEffect.primaryTactic}；改用：${style.openingHook}`,
        verificationMove: `创建后只做小批验证，先看前三章审稿分、失败率和平台包装，不允许直接放量。${modelRouteVerification}`,
        risk: batchEffect.nextAction,
        evidence: withModelEvidence(batchEvidence),
        checklist: withModelChecklist([
          `模板前三章：${firstThreeTitles}`,
          `必须具备：${style.mustHave.join("、")}`,
          `避坑动作：不要复制 ${batchLabel}`,
        ]),
      };
    }

    return {
      status: batchEffect.status === "usable" ? "history_usable" : "history_watch",
      label: batchLabel,
      title: `${platform.name}：${batchEffect.tacticLabel} 批量复盘`,
      primaryTactic: batchEffect.primaryTactic,
      openingMove: batchEffect.openingMove || style.openingHook,
      verificationMove: recovery
        ? `${batchEffect.verificationMove || "创建后跑前三章与批量审稿。"}；恢复放量打法只能作为参考，新项目先小样本复验成功率、质量分和失败样本。${modelRouteVerification}`
        : `${batchEffect.verificationMove || "创建后跑前三章与批量审稿。"}；首批复盘继续看成功率、质量分和失败样本。${modelRouteVerification}`,
      risk: recovery ? batchEffect.nextAction : batchEffect.status === "usable" ? batchEffect.risk : batchEffect.nextAction,
      evidence: withModelEvidence(batchEvidence),
      checklist: withModelChecklist([
        `批量状态：${batchLabel}`,
        ...(recovery ? [`恢复放量：已验证 ${batchEffect.recoveryBatches} 批`] : []),
        `模板前三章：${firstThreeTitles}`,
        `必须具备：${style.mustHave.join("、")}`,
      ]),
    };
  }

  if (experience) {
    if (isRecheckStopExperience(experience)) {
      return {
        status: "history_blocked",
        label: "复盘止损",
        title: `${platform.name}：复盘止损，先不做主平台`,
        primaryTactic: `${experience.lesson} 新项目先不要把 ${platform.name} 当主推平台，除非入口卖点、前三章兑现和平台匹配度已经重做。`,
        openingMove: `先按避坑样本重做开头钩子：${style.openingHook}`,
        verificationMove: `如必须验证，只允许一轮小样本，先看投稿包、前三章兑现和平台匹配度，不允许直接加码。${modelRouteVerification}`,
        risk: experience.risk,
        evidence: withModelEvidence(experience.evidence),
        checklist: withModelChecklist([
          `复盘止损：不要直接复用 ${platform.name} 旧方向`,
          `模板前三章：${firstThreeTitles}`,
          `必须具备：${style.mustHave.join("、")}`,
          "恢复条件：入口卖点、前三章兑现、平台匹配度至少改掉一项",
        ]),
      };
    }

    if (isAcceptanceReviewExperience(experience)) {
      return {
        status: "history_watch",
        label: "验收观察",
        title: `${platform.name}：先补验收标准再开书`,
        primaryTactic: experience.lesson,
        openingMove: `先按平台钩子写开头，但每一章必须绑定可验收通过线：${style.openingHook}`,
        verificationMove: `创建后先跑前三章验收：通过线、不可接受项、必须改动段落和复查证据格式都要写清。${modelRouteVerification}`,
        risk: experience.risk,
        evidence: withModelEvidence(experience.evidence),
        checklist: withModelChecklist([
          "通过线：首章钩子、前三章兑现、平台包装各有明确分数或证据",
          "不可接受项：不能只改措辞，必须改变冲突、选择或代价",
          `模板前三章：${firstThreeTitles}`,
          `必须具备：${style.mustHave.join("、")}`,
        ]),
      };
    }

    if (isWeakExecutionReviewExperience(experience)) {
      return {
        status: "history_watch",
        label: "动作观察",
        title: `${platform.name}：先收口返工动作再开书`,
        primaryTactic: experience.lesson,
        openingMove: `开头动作必须段落级落地：${style.openingHook}`,
        verificationMove: `创建后只验证一个核心动作：改哪一段、服务哪条主线、如何改变追读理由，写不清就不进入批量。${modelRouteVerification}`,
        risk: experience.risk,
        evidence: withModelEvidence(experience.evidence),
        checklist: withModelChecklist([
          "动作边界：只验证一个核心问题",
          "段落证据：写清改动段落、主线压力和读者追读理由",
          `模板前三章：${firstThreeTitles}`,
          `必须具备：${style.mustHave.join("、")}`,
        ]),
      };
    }

    return {
      status: historyStatus(experience),
      label: historyLabel(experience),
      title: `${platform.name}：${experience.tactic}`,
      primaryTactic: experience.lesson,
      openingMove: experience.status === "blocked"
        ? `先按避坑样本修正开头：${style.openingHook}`
        : experience.reuseHint,
      verificationMove: experience.status === "usable"
        ? `创建后先跑前三章和平台包装，再记录首轮曝光、点击、收藏、追读。${modelRouteVerification}`
        : `创建后只复用流程，不复用成功结论，必须等第一轮真实数据回填。${modelRouteVerification}`,
      risk: experience.risk,
      evidence: withModelEvidence(experience.evidence),
      checklist: withModelChecklist([
        `模板前三章：${firstThreeTitles}`,
        `首屏钩子：${style.firstScreen}`,
        `必须具备：${style.mustHave.join("、")}`,
      ]),
    };
  }

  return {
    status: "template",
    label: "模板推荐",
    title: `${platform.name} 首轮开书打法`,
    primaryTactic: defaultTacticForCategory(platform),
    openingMove: style.openingHook,
    verificationMove: `创建后先完成前三章、人物弧光、世界规则和平台包装，再进入总闸复盘。${modelRouteVerification}`,
    risk: platform.risks.join("；"),
    evidence: modelRouteEvidence.slice(0, 5),
    checklist: withModelChecklist([
      `模板定位：${template.positioning}`,
      `模板前三章：${firstThreeTitles}`,
      `必须具备：${style.mustHave.join("、")}`,
    ]),
  };
}

export function buildProjectStartGateExperience(input: {
  platform: PlatformProfile;
  template: ProjectTemplate;
  style: PlatformWritingStyleTemplate;
  receipts: GateActionReceipt[];
  knowledgeFeedbackReceipts?: GateKnowledgeFeedbackReceipt[];
  tasks?: PersistedGatePlatformDispatchTask[];
  timelineLimit?: number;
  batchLimit?: number;
}): ProjectStartGateExperience {
  const receipts = input.receipts;
  const tasks = input.tasks ?? [];
  const timeline = buildGatePlatformDecisionTimeline({
    receipts,
    tasks,
    limit: input.timelineLimit ?? 20,
  });
  const knowledgeFeedbackExperiences = buildProjectStartKnowledgeFeedbackExperiences(
    input.knowledgeFeedbackReceipts ?? [],
    input.timelineLimit ?? 20,
  );
  const experiences = [
    ...knowledgeFeedbackExperiences,
    ...buildGatePlatformTacticExperienceLibrary(timeline, input.timelineLimit ?? 20).items,
  ];
  const batchEffects = buildGateBatchTacticEffectReview(receipts, input.batchLimit ?? 20).items;
  const modelRoutes = buildProjectStartModelRouteExperienceFromReceipts(receipts);
  const selection = selectProjectStartTacticEvidence({
    platform: input.platform,
    experiences,
    batchEffects,
  });
  const advice = buildProjectStartTacticAdvice({
    platform: input.platform,
    template: input.template,
    style: input.style,
    experience: selection.experience,
    batchEffect: selection.batchEffect,
    modelRoutes,
  });

  return {
    advice,
    selection,
    experiences,
    batchEffects,
    modelRoutes,
  };
}

function trimLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function buildProjectStartTacticWorldEntry(
  advice: ProjectStartTacticAdvice,
  platformName: string,
  handoff?: ProjectStartExperienceHandoff | null,
): ProjectStartTacticWorldEntry {
  const evidence = advice.evidence.slice(0, 2).map((item) => `证据：${trimLine(item)}`);
  const checklist = advice.checklist.slice(0, 3).map((item) => `检查：${trimLine(item)}`);
  const handoffLines = handoff
    ? [
      `交接状态：${handoff.status}`,
      `交接标签：${handoff.label}`,
      `交接说明：${trimLine(handoff.detail)}`,
      handoff.recommendedPlatformName ? `推荐平台：${handoff.recommendedPlatformName}` : null,
      handoff.recommendedTemplateId ? `推荐模板：${handoff.recommendedTemplateId}` : null,
      ...handoff.firstDayActions.slice(0, 3).map((item) => `首日动作：${trimLine(item)}`),
      ...handoff.avoidRules.slice(0, 3).map((item) => `避坑边界：${trimLine(item)}`),
      ...handoff.evidence.slice(0, 2).map((item) => `交接证据：${trimLine(item)}`),
    ].filter((line): line is string => Boolean(line))
    : [];

  return {
    type: "platform_soil",
    title: `首轮平台打法：${platformName}`,
    content: [
      `状态：${advice.label}`,
      `打法：${trimLine(advice.primaryTactic)}`,
      `开头动作：${trimLine(advice.openingMove)}`,
      `验证动作：${trimLine(advice.verificationMove)}`,
      `风险：${trimLine(advice.risk)}`,
      ...handoffLines,
      ...checklist,
      ...evidence,
    ].join("\n"),
  };
}

function lineValue(lines: string[], prefix: string) {
  const line = lines.find((item) => item.startsWith(prefix));
  return line ? line.slice(prefix.length).trim() : "";
}

function lineValues(lines: string[], prefix: string) {
  return lines
    .filter((item) => item.startsWith(prefix))
    .map((item) => item.slice(prefix.length).trim())
    .filter(Boolean);
}

export function parseProjectStartTacticSummary(entry: { title: string; content: string } | null | undefined): ProjectStartTacticSummary | null {
  if (!entry) return null;
  const lines = entry.content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const label = lineValue(lines, "状态：");
  const primaryTactic = lineValue(lines, "打法：");
  const openingMove = lineValue(lines, "开头动作：");
  const verificationMove = lineValue(lines, "验证动作：");
  const risk = lineValue(lines, "风险：");
  const handoffStatus = lineValue(lines, "交接状态：") as ProjectStartExperienceHandoffStatus | "";
  const handoffLabel = lineValue(lines, "交接标签：");
  const handoffDetail = lineValue(lines, "交接说明：");
  const recommendedPlatformName = lineValue(lines, "推荐平台：");
  const recommendedTemplateId = lineValue(lines, "推荐模板：") as ProjectTemplate["id"] | "";

  if (!primaryTactic && !openingMove && !verificationMove) return null;

  return {
    title: entry.title,
    label: label || "首轮打法",
    primaryTactic,
    openingMove,
    verificationMove,
    risk,
    ...(handoffStatus ? { handoffStatus } : {}),
    ...(handoffLabel ? { handoffLabel } : {}),
    ...(handoffDetail ? { handoffDetail } : {}),
    recommendedPlatformName: recommendedPlatformName || null,
    recommendedTemplateId: recommendedTemplateId || null,
    firstDayActions: lineValues(lines, "首日动作："),
    avoidRules: lineValues(lines, "避坑边界："),
    handoffEvidence: lineValues(lines, "交接证据："),
  };
}

export function findProjectStartTacticSummary(entries: ProjectStartTacticEntryLike[]): ProjectStartTacticSummary | null {
  const entry = entries.find((item) => item.type === "platform_soil" && item.title.startsWith("首轮平台打法：")) ?? null;
  return parseProjectStartTacticSummary(entry);
}
