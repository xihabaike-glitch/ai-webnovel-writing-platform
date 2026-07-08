import type { QueueItem, QueueScaleGate } from "./taskQueueCenter.ts";
import { defaultBatchExecutionStrategy, type BatchExecutionStrategy } from "./batchExecutionStrategy.ts";

export type ExecutableQueueCategory = "draft" | "review" | "second_pass";
type ExecutableQueueItem = QueueItem & { category: ExecutableQueueCategory };

export interface TaskQueueExecutionPlan {
  canRun: boolean;
  category: ExecutableQueueCategory | null;
  projectId: string | null;
  projectIds: string[];
  projectTitle: string | null;
  itemIds: string[];
  chapterIds: string[];
  strategyBases: NonNullable<QueueItem["strategyBasis"]>[];
  scaleGate: QueueScaleGate;
  adoptionFollowupCount: number;
  adoptionFollowupItemIds: string[];
  platformStrategyCount: number;
  platformStrategyItemIds: string[];
  actionLabel: string;
  detail: string;
  batchModeLabel: string;
  batchModeTone: "standard" | "sample" | "recovery";
  batchModeDetail: string;
  warnings: string[];
}

const executableCategories: ExecutableQueueCategory[] = ["review", "second_pass", "draft"];

function isExecutableQueueItem(item: QueueItem): item is ExecutableQueueItem {
  if (item.sourceType === "platform_strategy") return false;
  const firstDayOutcomeStatus = item.handoffGuidance?.firstDayOutcome?.status;
  if (firstDayOutcomeStatus === "watch" || firstDayOutcomeStatus === "blocked") return false;
  return executableCategories.includes(item.category as ExecutableQueueCategory);
}

function chapterIdFromItem(item: QueueItem) {
  if (item.executionChapterId) return item.executionChapterId;
  return item.id.split(":").at(-1) ?? "";
}

function categoryActionLabel(category: ExecutableQueueCategory) {
  if (category === "draft") return "批量初稿";
  if (category === "review") return "批量审稿";
  return "批量二改";
}

export function adoptionFollowupBatchWarning(count: number) {
  return `本批包含 ${count} 个采纳闭环任务；它们不是普通审稿，执行后必须回总闸门复检。`;
}

function scaleWarningFromStrategyBases(strategyBases: NonNullable<QueueItem["strategyBasis"]>[]) {
  const labels = strategyBases.map((basis) => basis.label).join(" ");
  if (/三轮稳住/u.test(labels)) {
    return "本批来自三轮稳住样本，可以小批放大；仍要保留曝光、点击、收藏和追读回收，不要把稳定加码理解成无限放量。";
  }
  if (/三轮降档/u.test(labels)) {
    return "本批来自三轮降档样本，只能按修复型小样本推进；通过线没写清前，不要扩大到标准批量。";
  }
  if (/三轮暂停|三轮换平台/u.test(labels)) {
    return "本批命中三轮避坑样本，理论上不应进入批量；如果看见这条提示，先回首日闸门确认恢复条件。";
  }
  return null;
}

function batchModeFromScaleGate(scaleGate: QueueScaleGate) {
  if (scaleGate === "cleared") {
    return {
      batchModeLabel: "复检通过恢复批",
      batchModeTone: "recovery" as const,
      batchModeDetail: "小样本复检已过线，本批是谨慎恢复，不是普通放量；执行后继续回收质量、失败和成本证据。",
    };
  }
  if (scaleGate === "sample_only") {
    return {
      batchModeLabel: "观察小样本",
      batchModeTone: "sample" as const,
      batchModeDetail: "当前仍在观察闸门内，本批只跑 1 个样本，验收证据过线后再决定是否恢复。",
    };
  }
  return {
    batchModeLabel: "标准推荐批次",
    batchModeTone: "standard" as const,
    batchModeDetail: "按当前队列优先级生成推荐小批次，执行后回流总闸门复盘质量、成本和失败项。",
  };
}

function firstDayOutcomeBatchMode(item: QueueItem) {
  if (item.handoffGuidance?.firstDayOutcome?.status !== "scale") return null;
  return {
    batchModeLabel: "首日扩展小批",
    batchModeTone: "recovery" as const,
    batchModeDetail: "首日执行数据已经过线，但本批只扩 1 个小样本；回填新一轮曝光、点击、收藏、追读后再决定是否继续。",
  };
}

function firstDayOutcomeBlockedPlanItem(queueItems: QueueItem[]) {
  return queueItems.find((item) => {
    const status = item.handoffGuidance?.firstDayOutcome?.status;
    return status === "watch" || status === "blocked";
  }) ?? null;
}

function firstDayOutcomeBlockedPlan(item: QueueItem): TaskQueueExecutionPlan {
  const outcome = item.handoffGuidance?.firstDayOutcome;
  const watch = outcome?.status === "watch";
  return {
    canRun: false,
    category: null,
    projectId: item.projectId,
    projectIds: [item.projectId],
    projectTitle: item.projectTitle,
    itemIds: [],
    chapterIds: [],
    strategyBases: [],
    scaleGate: item.scaleGate,
    adoptionFollowupCount: 0,
    adoptionFollowupItemIds: [],
    platformStrategyCount: 0,
    platformStrategyItemIds: [],
    actionLabel: watch ? "先补首日观察证据" : "先处理首日避坑",
    detail: `${item.projectTitle} · ${outcome?.badge ?? item.riskLabel} · ${outcome?.nextMove ?? item.evidence}`,
    batchModeLabel: watch ? "首日观察暂停批量" : "首日避坑暂停批量",
    batchModeTone: watch ? "sample" : "standard",
    batchModeDetail: outcome?.boundary ?? "首日结论没有过线前，不进入推荐批量。",
    warnings: [
      watch
        ? `首日执行继续观察：${outcome?.boundary ?? "追读证据不足前不扩展章节。"}`
        : `首日执行先避坑：${outcome?.nextMove ?? "先重做入口卖点、前三章兑现或平台匹配。"}`
    ],
  };
}

export function buildTaskQueueExecutionPlan(
  queueItems: QueueItem[],
  maxBatchSize = defaultBatchExecutionStrategy.maxBatchSize,
  strategy: Pick<BatchExecutionStrategy, "allowCrossProject"> = defaultBatchExecutionStrategy,
): TaskQueueExecutionPlan {
  const executable = queueItems.filter(isExecutableQueueItem);
  const first = executable[0];

  if (!first) {
    const firstDayBlocked = firstDayOutcomeBlockedPlanItem(queueItems);
    if (firstDayBlocked) return firstDayOutcomeBlockedPlan(firstDayBlocked);
    const firstBlocker = queueItems.find((item) => item.category === "blocked") ?? null;
    return {
      canRun: false,
      category: null,
      projectId: null,
      projectIds: [],
      projectTitle: null,
      itemIds: [],
      chapterIds: [],
      strategyBases: [],
      scaleGate: "none",
      adoptionFollowupCount: 0,
      adoptionFollowupItemIds: [],
      platformStrategyCount: 0,
      platformStrategyItemIds: [],
      actionLabel: firstBlocker ? `先处理${firstBlocker.chapterTitle}` : "暂无可执行批次",
      detail: firstBlocker?.evidence ?? "当前队列没有可直接运行的初稿、审稿或二改任务。",
      batchModeLabel: "暂无批次",
      batchModeTone: firstBlocker?.blockerType === "watch_scale_gate" ? "sample" : "standard",
      batchModeDetail: firstBlocker
        ? `${firstBlocker.actionLabel}后再回来运行推荐小批次。`
        : "当前没有可执行的小批次，先补章节卡、处理阻塞或回项目生成任务。",
      warnings: firstBlocker
        ? [`${firstBlocker.actionLabel}：${firstBlocker.evidence}`]
        : ["先补章节卡、处理发布阻塞，或进入项目生成新的可执行任务。"],
    };
  }

  const firstDayScaleSample = first.handoffGuidance?.firstDayOutcome?.status === "scale";
  const batch = first.scaleGate === "sample_only" || firstDayScaleSample
    ? [first]
    : executable
      .filter((item) => item.category === first.category && (strategy.allowCrossProject || item.projectId === first.projectId))
      .slice(0, maxBatchSize);
  const sameCategoryOtherProjects = executable.filter((item) => item.category === first.category && item.projectId !== first.projectId).length;
  const projectIds = [...new Set(batch.map((item) => item.projectId))];
  const projectTitles = [...new Set(batch.map((item) => item.projectTitle))];
  const adoptionFollowupItemIds = batch.filter((item) => item.sourceType === "first_three_adoption").map((item) => item.id);
  const adoptionFollowupCount = adoptionFollowupItemIds.length;
  const platformStrategyItems = batch.filter((item) => item.sourceType === "platform_strategy");
  const platformStrategyItemIds = platformStrategyItems.map((item) => item.id);
  const platformStrategyUnlockWarnings = platformStrategyItems
    .map((item) => item.sourceNextStep ? `本批包含平台策略任务「${item.actionLabel}」；${item.sourceNextStep}` : null)
    .filter((warning): warning is string => Boolean(warning));
  const strategyBases = [
    ...new Map(
      batch
        .map((item) => item.strategyBasis)
        .filter((basis): basis is NonNullable<QueueItem["strategyBasis"]> => Boolean(basis))
        .map((basis) => [basis.title, basis]),
    ).values(),
  ];
  const batchMode = firstDayOutcomeBatchMode(first) ?? batchModeFromScaleGate(first.scaleGate);
  const firstDayOutcome = first.handoffGuidance?.firstDayOutcome ?? null;

  return {
    canRun: batch.length > 0,
    category: first.category,
    projectId: first.projectId,
    projectIds,
    projectTitle: projectTitles.length === 1 ? first.projectTitle : `${projectTitles.length} 个项目`,
    itemIds: batch.map((item) => item.id),
    chapterIds: batch.map(chapterIdFromItem).filter(Boolean),
    strategyBases,
    scaleGate: first.scaleGate,
    adoptionFollowupCount,
    adoptionFollowupItemIds,
    platformStrategyCount: platformStrategyItemIds.length,
    platformStrategyItemIds,
    actionLabel: `${categoryActionLabel(first.category)} ${batch.length} 个`,
    detail: `${projectTitles.join("、")} · ${first.label} · ${batch.map((item) => item.chapterTitle).join("、")}`,
    ...batchMode,
    warnings: [
      adoptionFollowupCount > 0 ? adoptionFollowupBatchWarning(adoptionFollowupCount) : null,
      platformStrategyItemIds.length > 0 ? `本批包含 ${platformStrategyItemIds.length} 个平台策略任务；执行后不要停在生成结果，必须继续处理对应采纳、质检或效果回收。` : null,
      ...platformStrategyUnlockWarnings,
      scaleWarningFromStrategyBases(strategyBases),
      firstDayOutcome?.status === "scale" ? `首日执行可扩展：${firstDayOutcome.nextMove} ${firstDayOutcome.boundary}` : null,
      first.scaleGate === "sample_only" ? "当前处于观察小样本闸门，只运行 1 个样本；验收依据写清通过线、不可接受项、复查证据和放量结论后才允许批量生成。" : null,
      first.scaleGate === "cleared" ? "小样本验收已过线，本批属于恢复放量；先保持同一平台打法和小批次节奏，别一次拉满。" : null,
      sameCategoryOtherProjects > 0 && !strategy.allowCrossProject ? `还有 ${sameCategoryOtherProjects} 个同类任务分布在其他项目，本批先保持单项目上下文。` : null,
      projectIds.length > 1 ? `本批跨 ${projectIds.length} 个项目，执行前确认模型路线和风格稳定。` : null,
      batch.length >= maxBatchSize ? `本批已达到 ${maxBatchSize} 个上限，剩余任务下一批继续。` : null,
    ].filter((warning): warning is string => Boolean(warning)),
  };
}
