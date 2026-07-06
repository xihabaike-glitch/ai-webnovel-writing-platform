import type { TaskQueueExecutionPlan } from "./taskQueueExecutionPlan.ts";
import type { BatchExecutionStrategyId } from "./batchExecutionStrategy.ts";
import { buildGateActionReceipt, type GateActionReceipt, type GateActionReceiptPayload } from "./gateActionReceipts.ts";
import { platformProfiles } from "../platforms/platformProfiles.ts";

export interface TaskQueueBatchRunResult {
  status: "succeeded" | "failed";
  taskId?: string;
  chapterId?: string;
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

export type TaskQueueBatchExecutionContext = "standard" | "repair_resume";

export function taskQueueBatchExecutionContext(value: string | null | undefined): TaskQueueBatchExecutionContext {
  return value === "repair_resume" ? "repair_resume" : "standard";
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
  completionEvidenceTemplate?: string;
}

export type TaskQueueBatchReceiptDecisionTone = "ready" | "review" | "blocked";

export interface TaskQueueBatchReceiptDecisionCard {
  tone: TaskQueueBatchReceiptDecisionTone;
  statusLabel: string;
  headline: string;
  detail: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  badges: string[];
  warnings: string[];
}

export interface TaskQueueBatchGateActionReceipt {
  receipt: GateActionReceipt;
  payload: GateActionReceiptPayload & {
    strategyId: BatchExecutionStrategyId;
    executionContext: TaskQueueBatchExecutionContext;
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

function adoptionFollowupEvidence(plan: TaskQueueExecutionPlan) {
  return plan.adoptionFollowupCount > 0 ? `采纳闭环：${plan.adoptionFollowupCount} 个，执行后必须回总闸门复检。` : null;
}

function thirdRoundBatchMode(plan: TaskQueueExecutionPlan) {
  const labels = plan.strategyBases.map((basis) => `${basis.label} ${basis.primaryTactic} ${basis.risk}`).join(" ");
  if (/三轮降档/u.test(labels)) return "downgrade";
  if (/三轮稳住/u.test(labels)) return "stable";
  return null;
}

function thirdRoundEvidence(mode: ReturnType<typeof thirdRoundBatchMode>) {
  if (mode === "stable") return "三轮复盘：稳定加码批次仍需回收曝光、点击、收藏和追读。";
  if (mode === "downgrade") return "三轮复盘：降档修复批次只验证修复流程，不沉淀为放量结论。";
  return null;
}

function executionContextEvidence(context: TaskQueueBatchExecutionContext) {
  if (context === "repair_resume") return "执行上下文：失败修复后恢复小批";
  return null;
}

function withAdoptionFollowupReturn(plan: TaskQueueExecutionPlan, receipt: TaskQueueBatchReceipt): TaskQueueBatchReceipt {
  if (plan.adoptionFollowupCount === 0 || receipt.status !== "continue") return receipt;
  return {
    ...receipt,
    primaryLabel: "回总闸门复检",
    primaryHref: "/gate#first-three-adoption-closure",
    secondaryLabel: receipt.primaryLabel,
    secondaryHref: receipt.primaryHref,
    warnings: [
      ...receipt.warnings,
      "采纳闭环任务跑完不等于发布放行，必须回总闸门确认审稿、发布质检和证据都闭合。",
    ],
  };
}

function batchReceiptDecisionTone(status: TaskQueueBatchReceipt["status"]): TaskQueueBatchReceiptDecisionTone {
  if (status === "repair") return "blocked";
  if (status === "continue") return "ready";
  return "review";
}

function batchReceiptDecisionStatusLabel(status: TaskQueueBatchReceipt["status"]) {
  if (status === "repair") return "先修复";
  if (status === "review_quality") return "先质检";
  if (status === "watch_cost") return "看成本";
  return "继续小批";
}

export function buildTaskQueueBatchReceiptDecisionCard(
  receipt: TaskQueueBatchReceipt,
): TaskQueueBatchReceiptDecisionCard {
  return {
    tone: batchReceiptDecisionTone(receipt.status),
    statusLabel: batchReceiptDecisionStatusLabel(receipt.status),
    headline: receipt.headline,
    detail: receipt.detail,
    primaryLabel: receipt.primaryLabel,
    primaryHref: receipt.primaryHref,
    secondaryLabel: receipt.secondaryLabel,
    secondaryHref: receipt.secondaryHref,
    badges: receipt.evidenceItems.slice(0, 5),
    warnings: receipt.warnings,
  };
}

function sampleCompletionEvidenceTemplate(input: {
  plan: TaskQueueExecutionPlan;
  results: TaskQueueBatchRunResult[];
  routeEffectSummary: TaskQueueBatchRouteEffect;
  passed: boolean;
}) {
  const quality = input.routeEffectSummary.averageQualityScore;
  const taskIds = input.results.map((result) => result.taskId).filter((taskId): taskId is string => Boolean(taskId));
  return [
    "小样本验证已完成：",
    `通过线：成功率 ${input.routeEffectSummary.successRatePercent}%，质量 ${quality ?? "缺样本"}，目标是成功率不低于 80%、质量不低于 80。`,
    `不可接受项：${input.passed ? "未出现失败、质量低于 80、备用命中或成本异常。" : "存在失败、质量低于 80、备用命中或成本异常，暂不放量。"}`,
    `复查证据：${taskIds.length ? `AI 任务 ${taskIds.join("、")}` : "请补充任务 ID 或章节复查链接"}；章节 ${input.results.map((result) => result.chapterTitle).join("、")}；${input.routeEffectSummary.verdict}`,
    `放量结论：${input.passed ? "通过，可以恢复后续初稿批次。" : "未通过，继续停留观察并修复后再测。"}`,
  ].join("\n");
}

export function buildTaskQueueBatchReceipt(input: {
  plan: TaskQueueExecutionPlan;
  results: TaskQueueBatchRunResult[];
  routeEffectSummary: TaskQueueBatchRouteEffect;
  executionContext?: TaskQueueBatchExecutionContext;
}): TaskQueueBatchReceipt {
  const executionContext = input.executionContext ?? "standard";
  const failed = input.results.filter((result) => result.status === "failed");
  const quality = input.routeEffectSummary.averageQualityScore;
  const projectBase = projectHref(input.plan);
  const evidenceItems = [
    executionContextEvidence(executionContext),
    `执行批次：${input.plan.actionLabel}`,
    adoptionFollowupEvidence(input.plan),
    thirdRoundEvidence(thirdRoundBatchMode(input.plan)),
    `成功/失败：${input.routeEffectSummary.succeededTasks}/${input.routeEffectSummary.failedTasks}`,
    `成功率：${input.routeEffectSummary.successRatePercent}%`,
    `质量：${quality ?? "缺样本"}`,
    `成本：$${input.routeEffectSummary.knownCostUsd.toFixed(4)}`,
  ].filter((evidence): evidence is string => Boolean(evidence));
  const sampleOnly = input.plan.scaleGate === "sample_only";
  const samplePassed = input.routeEffectSummary.successRatePercent >= 80
    && quality !== null
    && quality >= 80
    && input.routeEffectSummary.fallbackTasks === 0
    && input.routeEffectSummary.averageCostPerSucceededTaskUsd <= 0.05
    && failed.length === 0;
  const sampleTemplate = sampleOnly
    ? sampleCompletionEvidenceTemplate({ ...input, passed: samplePassed })
    : undefined;
  const scaleUpRecovery = input.plan.scaleGate === "cleared";
  const thirdRoundMode = thirdRoundBatchMode(input.plan);

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
      completionEvidenceTemplate: sampleTemplate,
      warnings: [
        input.routeEffectSummary.verdict,
        "失败批次不要继续放大，先修配置、重试样本或降级模型路线。",
      ],
    };
  }

  if (thirdRoundMode === "stable" && (quality === null || quality < 85)) {
    return {
      status: "review_quality",
      headline: "三轮稳住批次未站住，先停加码",
      detail: quality === null
        ? "这批来自三轮稳住打法，但缺少质量复查样本。没有质量证据，就不能把它写成稳定加码。"
        : `这批来自三轮稳住打法，平均质量 ${quality} 分，没到 85 分健康线。先修正文，再决定是否继续加码。`,
      primaryLabel: "回到 AI 生产线",
      primaryHref: `${projectBase}#ai-pipeline`,
      secondaryLabel: "查看任务队列",
      secondaryHref: "/tasks",
      evidenceItems,
      warnings: [
        input.routeEffectSummary.verdict,
        "三轮稳住不是免检牌。批量质量低于 85 时，稳定加码结论必须回撤为观察。",
      ],
    };
  }

  if (scaleUpRecovery && (quality === null || quality < 85)) {
    return {
      status: "review_quality",
      headline: "恢复小批跌线，回滚观察修复",
      detail: quality === null
        ? "这是小样本解锁后的恢复放量批次，但缺少质量复查样本。没有质量证据，必须回滚到观察/修复，补证后再跑小样本。"
        : `这是小样本解锁后的恢复放量批次，平均质量 ${quality} 分，没到 85 分复盘线。先回滚到观察/修复，修正文质量后再重新小样本。`,
      primaryLabel: "回滚观察修复",
      primaryHref: "/dispatch",
      secondaryLabel: "查看任务队列",
      secondaryHref: "/tasks",
      evidenceItems,
      warnings: [
        input.routeEffectSummary.verdict,
        "暂停恢复小批。刚解锁的批次按 85 分看，不是 80 分凑合；质量没稳住，放量就是把问题复制得更快。",
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
      completionEvidenceTemplate: sampleTemplate,
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
      completionEvidenceTemplate: sampleTemplate,
      warnings: [
        input.routeEffectSummary.verdict,
        "成本或备用命中异常时，先确认首选/备用模型，再扩大生产。",
      ],
    };
  }

  const next = nextSuccessAction(input.plan);
  if (sampleOnly) {
    return withAdoptionFollowupReturn(input.plan, {
      status: "continue",
      headline: thirdRoundMode === "downgrade" ? "三轮降档小样本已跑完，先回填验收" : "小样本已跑完，先回填验收",
      detail: thirdRoundMode === "downgrade"
        ? "这只证明修复流程可以继续复验，不证明可以放量。把验收依据回填后，再由总闸门判断是否继续观察。"
        : "这不是放量完成。把下面的验收依据回填到首日小样本派单，系统才会判断是否解除观察闸门。",
      primaryLabel: "回任务中心验收",
      primaryHref: "/dispatch",
      secondaryLabel: "查看任务队列",
      secondaryHref: "/tasks",
      evidenceItems,
      completionEvidenceTemplate: sampleTemplate,
      warnings: [
        input.routeEffectSummary.verdict,
        thirdRoundMode === "downgrade" ? "三轮降档批次只沉淀修复流程，不沉淀加码结论。" : null,
        "别继续点批量。先完成小样本验收，再让系统决定是否恢复后续初稿批次。",
      ].filter((warning): warning is string => Boolean(warning)),
    });
  }

  if (thirdRoundMode === "downgrade") {
    return withAdoptionFollowupReturn(input.plan, {
      status: "continue",
      headline: "三轮降档批次只能回闸门复检",
      detail: "本批结果可以作为修复样本，但不能直接沉淀为放量打法。先回总闸门看通过线、不可接受项和复查证据是否闭合。",
      primaryLabel: "回总闸门复检",
      primaryHref: "/gate",
      secondaryLabel: next.primaryLabel,
      secondaryHref: next.primaryHref,
      evidenceItems,
      warnings: [
        input.routeEffectSummary.verdict,
        "三轮降档通过后也只是修复流程可继续，下一步仍按小样本和平台数据复验。",
      ],
    });
  }

  if (scaleUpRecovery) {
    return withAdoptionFollowupReturn(input.plan, {
      status: "continue",
      headline: "准放量批次稳定，下一批仍小步走",
      detail: "小样本后的第一轮恢复放量已过线，但这只证明可以继续验证，不证明可以一次拉满。下一批继续按同一平台打法和安全阀推进。",
      primaryLabel: "继续恢复小批",
      primaryHref: "/tasks#recommended-batch",
      secondaryLabel: next.primaryLabel,
      secondaryHref: next.primaryHref,
      evidenceItems,
      warnings: [
        input.routeEffectSummary.verdict,
        input.plan.strategyBases[0] ? `继续小批沿用打法：${input.plan.strategyBases[0].label}，下一批仍看成功率、质量、成本和备用命中。` : "继续小批次复盘，别把准放量误当成无上限放大。",
      ],
    });
  }

  if (executionContext === "repair_resume") {
    return withAdoptionFollowupReturn(input.plan, {
      status: "continue",
      headline: "修复后恢复小批通过，继续小步观察",
      detail: "失败修复后的第一轮恢复小批已过线，但这只证明修复链路可以继续验证，不证明可以回到普通放量。下一批仍按恢复模式、同一安全阀和真实质量线推进。",
      primaryLabel: "继续恢复小批",
      primaryHref: "/tasks?batchContext=repair_resume#recommended-batch",
      secondaryLabel: "回失败复盘",
      secondaryHref: "/failures",
      evidenceItems,
      warnings: [
        input.routeEffectSummary.verdict,
        input.plan.strategyBases[0] ? `恢复小批沿用打法：${input.plan.strategyBases[0].label}。` : "恢复小批继续保留批次、质量、失败率和成本证据。",
        "恢复小批不是普通放量；连续稳定前不要扩大批次，也不要跳过失败复盘。",
      ],
    });
  }

  return withAdoptionFollowupReturn(input.plan, {
    status: "continue",
    headline: thirdRoundMode === "stable" ? "三轮稳住批次健康，继续小步加码" : next.headline,
    detail: thirdRoundMode === "stable"
      ? "本批达到稳定加码健康线，但仍然只代表这一轮可继续推进。下一批继续回收曝光、点击、收藏、追读和质量分。"
      : next.detail,
    primaryLabel: next.primaryLabel,
    primaryHref: next.primaryHref,
    secondaryLabel: "查看任务队列",
    secondaryHref: "/tasks",
    evidenceItems,
    warnings: [
      input.routeEffectSummary.verdict,
      thirdRoundMode === "stable" ? "三轮稳住通过本批健康线，但下一批仍保持小步加码和真实数据回收。" : null,
      input.plan.strategyBases[0] ? `沿用打法：${input.plan.strategyBases[0].label}。` : "执行后继续回填数据，形成可复用打法。",
    ].filter((warning): warning is string => Boolean(warning)),
  });
}

export function buildTaskQueueBatchGateActionReceipt(input: {
  plan: TaskQueueExecutionPlan;
  results: TaskQueueBatchRunResult[];
  routeEffectSummary: TaskQueueBatchRouteEffect;
  batchReceipt: TaskQueueBatchReceipt;
  strategyId: BatchExecutionStrategyId;
  executionContext?: TaskQueueBatchExecutionContext;
  now?: Date | string;
}): TaskQueueBatchGateActionReceipt {
  const executionContext = input.executionContext ?? "standard";
  const platform = platformFromStrategyTitle(input.plan.strategyBases[0]?.title);
  const platformName = platform?.name ?? "任务中心";
  const projectTitle = input.plan.projectTitle ?? "多项目批次";
  const payload: TaskQueueBatchGateActionReceipt["payload"] = {
    strategyId: input.strategyId,
    executionContext,
    plan: {
      strategyBases: input.plan.strategyBases,
      scaleGate: input.plan.scaleGate,
      actionLabel: input.plan.actionLabel,
      category: input.plan.category,
      itemIds: input.plan.itemIds,
      chapterIds: input.plan.chapterIds,
      adoptionFollowupCount: input.plan.adoptionFollowupCount,
      adoptionFollowupItemIds: input.plan.adoptionFollowupItemIds,
      executionContext,
    },
    results: input.results.map((result) => ({
      status: result.status,
      taskId: result.taskId,
      chapterId: result.chapterId,
      chapterTitle: result.chapterTitle,
      error: result.error,
    })),
    routeEffectSummary: input.routeEffectSummary,
    batchReceipt: input.batchReceipt,
  };
  const actionContext = executionContext === "repair_resume" ? "repair_resume:" : "";
  const actionLabel = executionContext === "repair_resume"
    ? "沉淀修复后恢复小批经验"
    : `沉淀${input.plan.actionLabel}经验`;
  const receipt = buildGateActionReceipt({
    action: {
      id: `recommended-batch:${actionContext}${input.strategyId}:${input.plan.category ?? "none"}:${input.plan.projectId ?? "multi"}`,
      label: actionLabel,
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
