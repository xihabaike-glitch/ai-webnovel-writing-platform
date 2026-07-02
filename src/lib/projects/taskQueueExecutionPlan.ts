import type { QueueItem } from "./taskQueueCenter.ts";

export type ExecutableQueueCategory = "draft" | "review" | "second_pass";
type ExecutableQueueItem = QueueItem & { category: ExecutableQueueCategory };

export interface TaskQueueExecutionPlan {
  canRun: boolean;
  category: ExecutableQueueCategory | null;
  projectId: string | null;
  projectTitle: string | null;
  itemIds: string[];
  chapterIds: string[];
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

export function buildTaskQueueExecutionPlan(queueItems: QueueItem[], maxBatchSize = 5): TaskQueueExecutionPlan {
  const executable = queueItems.filter(isExecutableQueueItem);
  const first = executable[0];

  if (!first) {
    return {
      canRun: false,
      category: null,
      projectId: null,
      projectTitle: null,
      itemIds: [],
      chapterIds: [],
      actionLabel: "暂无可执行批次",
      detail: "当前队列没有可直接运行的初稿、审稿或二改任务。",
      warnings: ["先补章节卡、处理发布阻塞，或进入项目生成新的可执行任务。"],
    };
  }

  const batch = executable
    .filter((item) => item.category === first.category && item.projectId === first.projectId)
    .slice(0, maxBatchSize);
  const sameCategoryOtherProjects = executable.filter((item) => item.category === first.category && item.projectId !== first.projectId).length;

  return {
    canRun: batch.length > 0,
    category: first.category,
    projectId: first.projectId,
    projectTitle: first.projectTitle,
    itemIds: batch.map((item) => item.id),
    chapterIds: batch.map(chapterIdFromItem).filter(Boolean),
    actionLabel: `${categoryActionLabel(first.category)} ${batch.length} 个`,
    detail: `${first.projectTitle} · ${first.label} · ${batch.map((item) => item.chapterTitle).join("、")}`,
    warnings: [
      sameCategoryOtherProjects > 0 ? `还有 ${sameCategoryOtherProjects} 个同类任务分布在其他项目，本批先保持单项目上下文。` : null,
      batch.length >= maxBatchSize ? `本批已达到 ${maxBatchSize} 个上限，剩余任务下一批继续。` : null,
    ].filter((warning): warning is string => Boolean(warning)),
  };
}
