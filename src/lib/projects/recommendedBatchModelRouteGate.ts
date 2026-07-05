import { buildModelTaskAuditDashboard, type ModelAuditProvider, type ModelAuditRoute, type ModelAuditTask } from "../ai/modelTaskAudit.ts";
import { labelForRoutedTask, type RoutedModelTaskType } from "../model-gateway/taskRouting.ts";
import type { RouteConfirmationRecheckAdviceItem, RouteConfirmationRecheckEvidence } from "../model-gateway/routeConfirmation.ts";
import { adoptionFollowupBatchWarning, type ExecutableQueueCategory, type TaskQueueExecutionPlan } from "./taskQueueExecutionPlan.ts";

export interface RecommendedBatchModelRouteGateProject {
  id: string;
  title: string;
  aiMonthlyBudgetUsd?: number | null;
  aiMaxTaskCostUsd?: number | null;
  aiMaxBatchCostUsd?: number | null;
  aiMaxFailureRatePercent?: number | null;
  aiBudgetEnforcement?: string | null;
  aiTasks: ModelAuditTask[];
}

export interface RecommendedBatchModelRouteGate {
  status: "allow" | "sample" | "block";
  label: string;
  headline: string;
  detail: string;
  actionLabel: string;
  targetHref: string;
  maxBatchSize: number;
  totalTasks: number;
  successRatePercent: number;
  failureRatePercent: number;
  knownCostUsd: number;
  fallbackAttemptRatePercent: number;
  preferredRoutes: string[];
  avoidedRoutes: string[];
  warnings: string[];
  recheckAdvice: RouteConfirmationRecheckAdviceItem | null;
  recoveryEvidence: string | null;
}

export interface RecommendedBatchModelRouteGateAudit {
  receiptId: string;
  projectId?: string | null;
  executionType: string;
  status: string;
  succeededCount: number;
  failedCount: number;
  payload: string;
  createdAt: string | Date;
}

interface RecoveryBatchEvidence {
  receiptId: string;
  summary: string;
  createdAt: string;
}

function taskTypeForCategory(category: ExecutableQueueCategory | null): RoutedModelTaskType | null {
  if (category === "draft") return "chapter_draft";
  if (category === "review") return "chapter_review";
  if (category === "second_pass") return "chapter_second_pass";
  return null;
}

function routeLabel(input: { taskLabel: string; providerName: string; model: string }) {
  return `${input.taskLabel} · ${input.providerName}/${input.model}`;
}

function successRate(succeeded: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((succeeded / total) * 100);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parsePayload(payload: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(payload);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function numberFrom(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringFrom(value: unknown) {
  return typeof value === "string" ? value : null;
}

function dateMs(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  return Number.isNaN(time) ? null : time;
}

function settingsFromProjects(projects: RecommendedBatchModelRouteGateProject[]) {
  const first = projects[0] ?? null;
  return {
    aiMonthlyBudgetUsd: first?.aiMonthlyBudgetUsd,
    aiMaxTaskCostUsd: first?.aiMaxTaskCostUsd,
    aiMaxBatchCostUsd: first?.aiMaxBatchCostUsd,
    aiMaxFailureRatePercent: first?.aiMaxFailureRatePercent,
    aiBudgetEnforcement: first?.aiBudgetEnforcement,
  };
}

function latestRecheckForTask(
  taskType: RoutedModelTaskType | null,
  rechecks: RouteConfirmationRecheckEvidence[] = [],
) {
  if (!taskType) return null;
  return rechecks
    .filter((item) => item.taskType === taskType)
    .sort((left, right) => (right.completedAt ?? "").localeCompare(left.completedAt ?? ""))[0] ?? null;
}

function latestPassedRecoveryBatch(input: {
  plan: TaskQueueExecutionPlan;
  latestRecheck: RouteConfirmationRecheckEvidence | null;
  audits?: RecommendedBatchModelRouteGateAudit[];
}): RecoveryBatchEvidence | null {
  const recheckTime = dateMs(input.latestRecheck?.completedAt);
  if (!input.latestRecheck || input.latestRecheck.recommendedAction !== "keep" || recheckTime === null) return null;

  const candidates = (input.audits ?? [])
    .filter((audit) => audit.executionType === "recommended_batch")
    .filter((audit) => audit.projectId === input.plan.projectId)
    .filter((audit) => dateMs(audit.createdAt) !== null && dateMs(audit.createdAt)! > recheckTime)
    .sort((left, right) => dateMs(right.createdAt)! - dateMs(left.createdAt)!);

  for (const audit of candidates) {
    const payload = parsePayload(audit.payload);
    const plan = isRecord(payload.plan) ? payload.plan : {};
    const route = isRecord(payload.routeEffectSummary) ? payload.routeEffectSummary : {};
    const batchReceipt = isRecord(payload.batchReceipt) ? payload.batchReceipt : {};
    const category = stringFrom(plan.category);
    if (category !== input.plan.category) continue;
    if (audit.status !== "succeeded" || audit.failedCount > 0 || audit.succeededCount <= 0) continue;

    const successRatePercent = numberFrom(route.successRatePercent);
    const failedTasks = numberFrom(route.failedTasks) ?? audit.failedCount;
    const quality = numberFrom(route.averageQualityScore);
    const fallbackTasks = numberFrom(route.fallbackTasks) ?? 0;
    const averageCost = numberFrom(route.averageCostPerSucceededTaskUsd) ?? 0;
    const receiptStatus = stringFrom(batchReceipt.status);
    const passed = successRatePercent !== null
      && successRatePercent >= 80
      && failedTasks === 0
      && quality !== null
      && quality >= 80
      && fallbackTasks === 0
      && averageCost <= 0.05
      && receiptStatus !== "repair";
    if (!passed) continue;

    const createdAt = audit.createdAt instanceof Date ? audit.createdAt.toISOString() : audit.createdAt;
    return {
      receiptId: audit.receiptId,
      createdAt,
      summary: `恢复样本通过：成功率 ${successRatePercent}%，质量 ${quality}，无失败、无备用命中，成本 $${averageCost.toFixed(4)}/任务。`,
    };
  }

  return null;
}

function buildGateRecheckAdvice(input: {
  status: RecommendedBatchModelRouteGate["status"];
  taskType: RoutedModelTaskType | null;
  recoveredByRecheck: boolean;
  headline: string;
  detail: string;
  successRatePercent: number;
  knownCostUsd: number;
  fallbackAttemptRatePercent: number;
  avoidedRoutes: string[];
  warnings: string[];
}): RouteConfirmationRecheckAdviceItem | null {
  if (input.status === "allow" || input.recoveredByRecheck || !input.taskType) return null;
  const label = labelForRoutedTask(input.taskType);
  const fallbackHit = input.fallbackAttemptRatePercent > 0 ? true : input.fallbackAttemptRatePercent === 0 ? false : null;
  const action: RouteConfirmationRecheckAdviceItem["action"] = input.status === "block" && input.avoidedRoutes.length > 0
    ? "switch_route"
    : "extend_watch";
  const actionLabel = action === "switch_route" ? "切备用/重分配" : "延长观察";
  const recommendation = input.status === "block"
    ? `推荐批次被模型路线闸门拦截：「${label}」需要先复检并治理，避免继续放大失败路线。`
    : `推荐批次被模型路线闸门降级：「${label}」先跑小样本复检，证据过线后再恢复批量。`;

  return {
    id: `recommended-batch-gate:${input.taskType}:${input.status}`,
    taskType: input.taskType,
    label,
    severity: input.status === "block" ? "blocked" : "warning",
    action,
    actionLabel,
    recommendation,
    sampleCount: input.status === "block" ? 3 : 2,
    successRatePercent: input.successRatePercent,
    qualityScore: null,
    cost: `$${input.knownCostUsd.toFixed(4)}`,
    fallbackHit,
    needsGovernance: input.status === "block",
    evidence: Array.from(new Set([
      input.headline,
      input.detail,
      ...input.avoidedRoutes.map((route) => `避用路线：${route}`),
      ...input.warnings,
    ])).slice(0, 5),
    completedAt: null,
  };
}

export function buildRecommendedBatchModelRouteGate(input: {
  plan: TaskQueueExecutionPlan;
  projects: RecommendedBatchModelRouteGateProject[];
  providers: ModelAuditProvider[];
  routes: ModelAuditRoute[];
  routeConfirmationRechecks?: RouteConfirmationRecheckEvidence[];
  recommendedBatchAudits?: RecommendedBatchModelRouteGateAudit[];
}): RecommendedBatchModelRouteGate {
  const plannedProjectIds = new Set(input.plan.projectIds);
  const scopedProjects = input.projects.filter((project) => plannedProjectIds.has(project.id));
  const tasks = scopedProjects.flatMap((project) => project.aiTasks);
  const audit = buildModelTaskAuditDashboard(
    tasks,
    input.providers,
    settingsFromProjects(scopedProjects),
    input.routes,
  );
  const taskType = taskTypeForCategory(input.plan.category);
  const scopedEffects = taskType
    ? audit.modelEffectRows.filter((row) => row.taskType === taskType)
    : audit.modelEffectRows;
  const latestRecheck = latestRecheckForTask(taskType, input.routeConfirmationRechecks);
  const recoveredByRecheck = latestRecheck?.recommendedAction === "keep";
  const passedRecoveryBatch = latestPassedRecoveryBatch({
    plan: input.plan,
    latestRecheck,
    audits: input.recommendedBatchAudits,
  });
  const releasedByRecoveryBatch = Boolean(passedRecoveryBatch);
  const avoidedRoutes = scopedEffects
    .filter((row) => row.recommendation === "avoid")
    .slice(0, 3)
    .map(routeLabel);
  const preferredRoutes = scopedEffects
    .filter((row) => row.recommendation === "prefer")
    .slice(0, 3)
    .map(routeLabel);
  const hasRouteRepairPressure = audit.providerReadiness.unconfiguredEnabledProviders > 0
    || audit.summary.unresolvedFailures > 0
    || audit.summary.failureRatePercent >= audit.budgetCenter.maxFailureRatePercent
    || avoidedRoutes.length > 0;
  const hasActiveCostPressure = audit.budgetCenter.fallbackAttemptRatePercent >= 20
    || audit.summary.averageCostPerSucceededTaskUsd > audit.budgetCenter.maxTaskCostUsd;
  const hasCostPressure = audit.budgetCenter.status !== "safe"
    || hasActiveCostPressure;
  const status: RecommendedBatchModelRouteGate["status"] = audit.summary.totalTasks === 0
    ? "sample"
    : hasRouteRepairPressure && !recoveredByRecheck
      ? "block"
      : hasRouteRepairPressure && recoveredByRecheck && !releasedByRecoveryBatch
        ? "sample"
      : releasedByRecoveryBatch
        ? hasActiveCostPressure ? "sample" : "allow"
      : hasCostPressure || audit.status !== "healthy"
        ? "sample"
        : "allow";
  const maxBatchSize = status === "allow"
    ? input.plan.chapterIds.length
    : status === "sample"
      ? Math.min(1, input.plan.chapterIds.length)
      : 0;
  const label = status === "allow" ? "模型路线通过" : status === "sample" ? "降级小样本" : "模型路线拦截";
  const headline = status === "allow"
    ? releasedByRecoveryBatch
      ? "恢复样本已过线，本批可以恢复正常批量。"
      : "模型路线健康，本批可以按当前策略执行。"
    : status === "sample" && recoveredByRecheck
      ? "模型路线复检已通过，本批先跑 1 个恢复样本。"
      : status === "sample"
      ? "模型路线证据还不够硬，本批只允许跑 1 个样本。"
      : "模型路线存在失败、避用或配置风险，本批先别执行。";
  const detail = audit.summary.totalTasks === 0
    ? "还没有模型任务样本，先跑单章样本建立成功率、质量和成本证据。"
    : `成功率 ${successRate(audit.summary.succeededTasks, audit.summary.totalTasks)}%，失败率 ${audit.summary.failureRatePercent}%，成本 $${audit.summary.knownCostUsd.toFixed(4)}，备用触发 ${audit.budgetCenter.fallbackAttemptRatePercent}%。`;
  const warnings = [
    status === "sample" && input.plan.chapterIds.length > 1 ? `原计划 ${input.plan.chapterIds.length} 个任务，模型路线闸门已降级为 1 个样本。` : null,
    recoveredByRecheck && latestRecheck ? `复检通过：${latestRecheck.summary}` : null,
    passedRecoveryBatch ? passedRecoveryBatch.summary : null,
    ...audit.riskFlags.slice(0, 3),
    ...avoidedRoutes.map((route) => `避用路线：${route}`),
  ].filter((item): item is string => Boolean(item));
  const successRatePercent = successRate(audit.summary.succeededTasks, audit.summary.totalTasks);
  const normalizedWarnings = warnings.length ? warnings : ["模型路线暂无明显执行风险。"];

  return {
    status,
    label,
    headline,
    detail,
    actionLabel: status === "block" ? "去修模型路线" : status === "sample" ? "跑单章样本" : "继续执行",
    targetHref: status === "block" ? "/settings/models" : "/tasks#recommended-batch",
    maxBatchSize,
    totalTasks: audit.summary.totalTasks,
    successRatePercent,
    failureRatePercent: audit.summary.failureRatePercent,
    knownCostUsd: audit.summary.knownCostUsd,
    fallbackAttemptRatePercent: audit.budgetCenter.fallbackAttemptRatePercent,
    preferredRoutes,
    avoidedRoutes,
    warnings: normalizedWarnings,
    recheckAdvice: buildGateRecheckAdvice({
      status,
      taskType,
      recoveredByRecheck,
      headline,
      detail,
      successRatePercent,
      knownCostUsd: audit.summary.knownCostUsd,
      fallbackAttemptRatePercent: audit.budgetCenter.fallbackAttemptRatePercent,
      avoidedRoutes,
      warnings: normalizedWarnings,
    }),
    recoveryEvidence: passedRecoveryBatch?.summary ?? (recoveredByRecheck && latestRecheck ? latestRecheck.summary : null),
  };
}

export function applyRecommendedBatchModelRouteGate(
  plan: TaskQueueExecutionPlan,
  gate: RecommendedBatchModelRouteGate,
): TaskQueueExecutionPlan {
  if (gate.status === "allow") {
    return {
      ...plan,
      warnings: [...plan.warnings, gate.headline],
    };
  }

  if (gate.status === "block") {
    return {
      ...plan,
      canRun: false,
      itemIds: [],
      chapterIds: [],
      adoptionFollowupCount: 0,
      adoptionFollowupItemIds: [],
      actionLabel: "模型路线拦截",
      detail: gate.headline,
      warnings: [...plan.warnings.filter((warning) => !warning.includes("采纳闭环任务")), ...gate.warnings],
    };
  }

  const itemIds = plan.itemIds.slice(0, gate.maxBatchSize);
  const adoptionFollowupItemIds = plan.adoptionFollowupItemIds.filter((itemId) => itemIds.includes(itemId));
  const adoptionFollowupCount = adoptionFollowupItemIds.length;
  return {
    ...plan,
    itemIds,
    chapterIds: plan.chapterIds.slice(0, gate.maxBatchSize),
    adoptionFollowupCount,
    adoptionFollowupItemIds,
    actionLabel: `${plan.actionLabel.replace(/\s+\d+\s*个$/u, "")} ${gate.maxBatchSize} 个`,
    detail: `${plan.detail} · ${gate.headline}`,
    warnings: [
      ...plan.warnings.filter((warning) => !warning.includes("采纳闭环任务")),
      adoptionFollowupCount > 0 ? adoptionFollowupBatchWarning(adoptionFollowupCount) : null,
      ...gate.warnings,
    ].filter((warning): warning is string => Boolean(warning)),
  };
}
