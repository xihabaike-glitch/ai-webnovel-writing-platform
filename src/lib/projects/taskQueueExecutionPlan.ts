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
  actionLabel: string;
  detail: string;
  warnings: string[];
}

const executableCategories: ExecutableQueueCategory[] = ["review", "second_pass", "draft"];

function isExecutableQueueItem(item: QueueItem): item is ExecutableQueueItem {
  return executableCategories.includes(item.category as ExecutableQueueCategory);
}

function chapterIdFromItem(item: QueueItem) {
  return item.id.split(":").at(-1) ?? "";
}

function categoryActionLabel(category: ExecutableQueueCategory) {
  if (category === "draft") return "批量初稿";
  if (category === "review") return "批量审稿";
  return "批量二改";
}

export function buildTaskQueueExecutionPlan(
  queueItems: QueueItem[],
  maxBatchSize = defaultBatchExecutionStrategy.maxBatchSize,
  strategy: Pick<BatchExecutionStrategy, "allowCrossProject"> = defaultBatchExecutionStrategy,
): TaskQueueExecutionPlan {
  const executable = queueItems.filter(isExecutableQueueItem);
  const first = executable[0];

  if (!first) {
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
      actionLabel: "暂无可执行批次",
      detail: "当前队列没有可直接运行的初稿、审稿或二改任务。",
      warnings: ["先补章节卡、处理发布阻塞，或进入项目生成新的可执行任务。"],
    };
  }

  const batch = first.scaleGate === "sample_only"
    ? [first]
    : executable
      .filter((item) => item.category === first.category && (strategy.allowCrossProject || item.projectId === first.projectId))
      .slice(0, maxBatchSize);
  const sameCategoryOtherProjects = executable.filter((item) => item.category === first.category && item.projectId !== first.projectId).length;
  const projectIds = [...new Set(batch.map((item) => item.projectId))];
  const projectTitles = [...new Set(batch.map((item) => item.projectTitle))];
  const strategyBases = [
    ...new Map(
      batch
        .map((item) => item.strategyBasis)
        .filter((basis): basis is NonNullable<QueueItem["strategyBasis"]> => Boolean(basis))
        .map((basis) => [basis.title, basis]),
    ).values(),
  ];

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
    actionLabel: `${categoryActionLabel(first.category)} ${batch.length} 个`,
    detail: `${projectTitles.join("、")} · ${first.label} · ${batch.map((item) => item.chapterTitle).join("、")}`,
    warnings: [
      first.scaleGate === "sample_only" ? "当前处于观察小样本闸门，只运行 1 个样本；验收依据写清通过线、不可接受项、复查证据和放量结论后才允许批量生成。" : null,
      first.scaleGate === "cleared" ? "小样本验收已过线，本批属于恢复放量；先保持同一平台打法和小批次节奏，别一次拉满。" : null,
      sameCategoryOtherProjects > 0 && !strategy.allowCrossProject ? `还有 ${sameCategoryOtherProjects} 个同类任务分布在其他项目，本批先保持单项目上下文。` : null,
      projectIds.length > 1 ? `本批跨 ${projectIds.length} 个项目，执行前确认模型路线和风格稳定。` : null,
      batch.length >= maxBatchSize ? `本批已达到 ${maxBatchSize} 个上限，剩余任务下一批继续。` : null,
    ].filter((warning): warning is string => Boolean(warning)),
  };
}
