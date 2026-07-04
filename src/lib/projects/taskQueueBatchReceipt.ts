import type { TaskQueueExecutionPlan } from "./taskQueueExecutionPlan.ts";
import type { BatchExecutionStrategyId } from "./batchExecutionStrategy.ts";
import { buildGateActionReceipt, type GateActionReceipt, type GateActionReceiptPayload } from "./gateActionReceipts.ts";
import { platformProfiles } from "../platforms/platformProfiles.ts";

export interface TaskQueueBatchRunResult {
  status: "succeeded" | "failed";
  taskId?: string;
  chapterTitle: string;
  error: string | null;
  qualityScore: number | null;
}

export interface TaskQueueBatchRouteEffect {
  totalTasks: number;
  succeededTasks: number;
  failedTasks: number;
  successRatePercent: number;
  knownCostUsd: number;
  averageCostPerSucceededTaskUsd: number;
  averageQualityScore: number | null;
  fallbackTasks: number;
  verdict: string;
}

export interface TaskQueueBatchReceipt {
  status: "continue" | "repair" | "review_quality" | "watch_cost";
  headline: string;
  detail: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  evidenceItems: string[];
  warnings: string[];
}

export interface TaskQueueBatchGateActionReceipt {
  receipt: GateActionReceipt;
  payload: GateActionReceiptPayload & {
    strategyId: BatchExecutionStrategyId;
    batchReceipt: TaskQueueBatchReceipt;
  };
}

function projectHref(plan: Pick<TaskQueueExecutionPlan, "projectId">) {
  return plan.projectId ? `/projects/${plan.projectId}` : "/tasks";
}

function nextSuccessAction(plan: Pick<TaskQueueExecutionPlan, "category" | "projectId">) {
  if (plan.category === "draft") {
    return {
      headline: "初稿批次完成，下一步先审稿",
      detail: "别急着继续堆正文。先把本批章节送进审稿，确认钩子、爽点、冲突和章末追读站得住。",
      primaryLabel: "进入批量审稿",
      primaryHref: `${projectHref(plan)}#ai-pipeline`,
    };
  }
  if (plan.category === "review") {
    return {
      headline: "审稿批次完成，下一步处理二改",
      detail: "审稿不是终点。把低分和明确问题的章节推入二改，先修平台适配再扩大生产。",
      primaryLabel: "进入批量二改",
      primaryHref: `${projectHref(plan)}#ai-pipeline`,
    };
  }
  return {
    headline: "二改批次完成，下一步看发布包",
    detail: "二改后别直接开新批次。先看平台包、投稿资料和发布风险，确认这一轮能对外验证。",
    primaryLabel: "进入平台导出",
    primaryHref: `${projectHref(plan)}#platform-export`,
  };
}

function platformFromStrategyTitle(title: string | undefined) {
  if (!title) return null;
  return platformProfiles.find((platform) => title.includes(platform.name)) ?? null;
}

function receiptStatusFromBatchReceipt(batchReceipt: TaskQueueBatchReceipt) {
  return batchReceipt.status === "repair" ? "failed" : "succeeded";
}

export function buildTaskQueueBatchReceipt(input: {
  plan: TaskQueueExecutionPlan;
  results: TaskQueueBatchRunResult[];
  routeEffectSummary: TaskQueueBatchRouteEffect;
}): TaskQueueBatchReceipt {
  const failed = input.results.filter((result) => result.status === "failed");
  const quality = input.routeEffectSummary.averageQualityScore;
  const projectBase = projectHref(input.plan);
  const evidenceItems = [
    `执行批次：${input.plan.actionLabel}`,
    `成功/失败：${input.routeEffectSummary.succeededTasks}/${input.routeEffectSummary.failedTasks}`,
    `成功率：${input.routeEffectSummary.successRatePercent}%`,
    `质量：${quality ?? "缺样本"}`,
    `成本：$${input.routeEffectSummary.knownCostUsd.toFixed(4)}`,
  ];

  if (failed.length > 0 || input.routeEffectSummary.successRatePercent < 80) {
    return {
      status: "repair",
      headline: "批次有失败，先修再放大",
      detail: failed.length
        ? `${failed.map((result) => result.chapterTitle).join("、")} 执行失败。先处理失败和模型路线，再决定是否继续。`
        : "成功率低于 80%，这不是适合放大的批次。",
      primaryLabel: "查看失败修复",
      primaryHref: "/failures",
      secondaryLabel: "回任务队列",
      secondaryHref: "/tasks",
      evidenceItems,
      warnings: [
        input.routeEffectSummary.verdict,
        "失败批次不要继续放大，先修配置、重试样本或降级模型路线。",
      ],
    };
  }

  if (quality !== null && quality < 80) {
    return {
      status: "review_quality",
      headline: "质量不够，先二改或复审",
      detail: `本批平均质量 ${quality} 分，模型能跑，但还不适合扩大生产。`,
      primaryLabel: input.plan.category === "review" ? "进入批量二改" : "回到 AI 生产线",
      primaryHref: `${projectBase}#ai-pipeline`,
      secondaryLabel: "查看任务队列",
      secondaryHref: "/tasks",
      evidenceItems,
      warnings: [
        input.routeEffectSummary.verdict,
        "质量分低于 80 时，先修开头压力、爽点兑现和章末追读。",
      ],
    };
  }

  if (input.routeEffectSummary.fallbackTasks > 0 || input.routeEffectSummary.averageCostPerSucceededTaskUsd > 0.05) {
    return {
      status: "watch_cost",
      headline: "批次可用，但先看成本和备用命中",
      detail: "这批可以继续推进，但备用模型或成本已经出现压力，下一轮先复盘路线，不要盲目加大批量。",
      primaryLabel: "查看模型审计",
      primaryHref: `${projectBase}#model-task-audit`,
      secondaryLabel: "回任务队列",
      secondaryHref: "/tasks",
      evidenceItems,
      warnings: [
        input.routeEffectSummary.verdict,
        "成本或备用命中异常时，先确认首选/备用模型，再扩大生产。",
      ],
    };
  }

  const next = nextSuccessAction(input.plan);
  return {
    status: "continue",
    headline: next.headline,
    detail: next.detail,
    primaryLabel: next.primaryLabel,
    primaryHref: next.primaryHref,
    secondaryLabel: "查看任务队列",
    secondaryHref: "/tasks",
    evidenceItems,
    warnings: [
      input.routeEffectSummary.verdict,
      input.plan.strategyBases[0] ? `沿用打法：${input.plan.strategyBases[0].label}。` : "执行后继续回填数据，形成可复用打法。",
    ],
  };
}

export function buildTaskQueueBatchGateActionReceipt(input: {
  plan: TaskQueueExecutionPlan;
  results: TaskQueueBatchRunResult[];
  routeEffectSummary: TaskQueueBatchRouteEffect;
  batchReceipt: TaskQueueBatchReceipt;
  strategyId: BatchExecutionStrategyId;
  now?: Date | string;
}): TaskQueueBatchGateActionReceipt {
  const platform = platformFromStrategyTitle(input.plan.strategyBases[0]?.title);
  const platformName = platform?.name ?? "任务中心";
  const projectTitle = input.plan.projectTitle ?? "多项目批次";
  const payload: TaskQueueBatchGateActionReceipt["payload"] = {
    strategyId: input.strategyId,
    plan: {
      strategyBases: input.plan.strategyBases,
    },
    results: input.results.map((result) => ({
      status: result.status,
      taskId: result.taskId,
    })),
    routeEffectSummary: input.routeEffectSummary,
    batchReceipt: input.batchReceipt,
  };
  const receipt = buildGateActionReceipt({
    action: {
      id: `recommended-batch:${input.strategyId}:${input.plan.category ?? "none"}:${input.plan.projectId ?? "multi"}`,
      label: `沉淀${input.plan.actionLabel}经验`,
      detail: `${platformName} · ${projectTitle} · ${input.plan.actionLabel}`,
      href: "/gate",
      tone: receiptStatusFromBatchReceipt(input.batchReceipt) === "failed" ? "repair" : "primary",
      execution: {
        type: "recommended_batch",
        strategyId: input.strategyId,
      },
    },
    payload,
    status: receiptStatusFromBatchReceipt(input.batchReceipt),
    now: input.now,
  });

  return {
    receipt: {
      ...receipt,
      platformId: platform?.id ?? receipt.platformId,
      platformName,
      href: input.batchReceipt.primaryHref || receipt.href,
    },
    payload,
  };
}
