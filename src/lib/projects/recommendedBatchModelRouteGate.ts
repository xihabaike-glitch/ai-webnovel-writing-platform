import { buildModelTaskAuditDashboard, type ModelAuditProvider, type ModelAuditRoute, type ModelAuditTask } from "../ai/modelTaskAudit.ts";
import type { ExecutableQueueCategory, TaskQueueExecutionPlan } from "./taskQueueExecutionPlan.ts";

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
}

function taskTypeForCategory(category: ExecutableQueueCategory | null) {
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

export function buildRecommendedBatchModelRouteGate(input: {
  plan: TaskQueueExecutionPlan;
  projects: RecommendedBatchModelRouteGateProject[];
  providers: ModelAuditProvider[];
  routes: ModelAuditRoute[];
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
  const hasCostPressure = audit.budgetCenter.status !== "safe"
    || audit.budgetCenter.fallbackAttemptRatePercent >= 20
    || audit.summary.averageCostPerSucceededTaskUsd > audit.budgetCenter.maxTaskCostUsd;
  const status: RecommendedBatchModelRouteGate["status"] = audit.summary.totalTasks === 0
    ? "sample"
    : hasRouteRepairPressure
      ? "block"
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
    ? "模型路线健康，本批可以按当前策略执行。"
    : status === "sample"
      ? "模型路线证据还不够硬，本批只允许跑 1 个样本。"
      : "模型路线存在失败、避用或配置风险，本批先别执行。";
  const detail = audit.summary.totalTasks === 0
    ? "还没有模型任务样本，先跑单章样本建立成功率、质量和成本证据。"
    : `成功率 ${successRate(audit.summary.succeededTasks, audit.summary.totalTasks)}%，失败率 ${audit.summary.failureRatePercent}%，成本 $${audit.summary.knownCostUsd.toFixed(4)}，备用触发 ${audit.budgetCenter.fallbackAttemptRatePercent}%。`;
  const warnings = [
    status === "sample" && input.plan.chapterIds.length > 1 ? `原计划 ${input.plan.chapterIds.length} 个任务，模型路线闸门已降级为 1 个样本。` : null,
    ...audit.riskFlags.slice(0, 3),
    ...avoidedRoutes.map((route) => `避用路线：${route}`),
  ].filter((item): item is string => Boolean(item));

  return {
    status,
    label,
    headline,
    detail,
    actionLabel: status === "block" ? "去修模型路线" : status === "sample" ? "跑单章样本" : "继续执行",
    targetHref: status === "block" ? "/settings/models" : "/tasks#recommended-batch",
    maxBatchSize,
    totalTasks: audit.summary.totalTasks,
    successRatePercent: successRate(audit.summary.succeededTasks, audit.summary.totalTasks),
    failureRatePercent: audit.summary.failureRatePercent,
    knownCostUsd: audit.summary.knownCostUsd,
    fallbackAttemptRatePercent: audit.budgetCenter.fallbackAttemptRatePercent,
    preferredRoutes,
    avoidedRoutes,
    warnings: warnings.length ? warnings : ["模型路线暂无明显执行风险。"],
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
      actionLabel: "模型路线拦截",
      detail: gate.headline,
      warnings: [...plan.warnings, ...gate.warnings],
    };
  }

  return {
    ...plan,
    itemIds: plan.itemIds.slice(0, gate.maxBatchSize),
    chapterIds: plan.chapterIds.slice(0, gate.maxBatchSize),
    actionLabel: `${plan.actionLabel.replace(/\s+\d+\s*个$/u, "")} ${gate.maxBatchSize} 个`,
    detail: `${plan.detail} · ${gate.headline}`,
    warnings: [...plan.warnings, ...gate.warnings],
  };
}
