export interface ChapterPublishReadinessTask {
  chapterId?: string | null;
  chapter?: {
    id: string;
  } | null;
  taskType: string;
  status: string;
  createdAt?: Date | string;
}

export interface ChapterTaskFreshnessFor<T extends ChapterPublishReadinessTask> {
  task: T | undefined;
  adoptionTask: T | undefined;
  isFresh: boolean;
  isStaleAfterAdoption: boolean;
}

function taskChapterId(task: ChapterPublishReadinessTask) {
  return task.chapterId ?? task.chapter?.id ?? null;
}

function taskTime(task: ChapterPublishReadinessTask | undefined) {
  if (!task?.createdAt) return 0;
  const value = new Date(task.createdAt).getTime();
  return Number.isFinite(value) ? value : 0;
}

export function latestChapterTask<T extends ChapterPublishReadinessTask>(
  tasks: T[],
  chapterId: string,
  taskType: string,
) {
  return tasks
    .filter((task) => taskChapterId(task) === chapterId && task.taskType === taskType)
    .sort((left, right) => taskTime(right) - taskTime(left))[0];
}

export function chapterTaskFreshness<T extends ChapterPublishReadinessTask>(
  tasks: T[],
  chapterId: string,
  taskType: string,
): ChapterTaskFreshnessFor<T> {
  const task = latestChapterTask(tasks, chapterId, taskType);
  const adoptionTask = latestChapterTask(tasks, chapterId, "chapter_adopt_candidate");
  const adoptionTime = taskTime(adoptionTask);
  const reviewTime = taskTime(task);
  const isSucceeded = task?.status === "succeeded";
  const isFresh = Boolean(isSucceeded && (!adoptionTask || reviewTime > adoptionTime));

  return {
    task,
    adoptionTask,
    isFresh,
    isStaleAfterAdoption: Boolean(adoptionTask && isSucceeded && !isFresh),
  };
}
