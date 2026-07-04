import type { PlatformProfile } from "../platforms/platformProfiles.ts";
import type { SubmissionChecklist } from "./submissionChecklist.ts";

export interface SerializationProject {
  title: string;
  currentWordCount: number;
  targetWordCount: number;
  updateCadence: string;
}

export interface SerializationChapter {
  id: string;
  order: number;
  title: string;
  status: string;
  wordCount: number;
  hook: string;
  cliffhanger: string;
  updatedAt: Date | string;
}

export interface SerializationTask {
  id: string;
  chapterId: string | null;
  taskType: string;
  status: string;
  outputText: string | null;
  createdAt: Date | string;
}

export interface SerializationOpsInput {
  project: SerializationProject;
  platform: PlatformProfile;
  chapters: SerializationChapter[];
  aiTasks: SerializationTask[];
  submissionChecklist: SubmissionChecklist;
}

export interface SerializationAction {
  id: string;
  label: string;
  priority: "high" | "medium" | "low";
  detail: string;
  chapterId?: string;
  execution: SerializationActionExecution | null;
}

export interface SerializationActionExecution {
  label: string;
  method: "PATCH" | "POST";
  endpoint: string;
  payload: Record<string, string | number | boolean>;
}

export interface SerializationOpsDashboard {
  platformName: string;
  dailyWordTarget: number;
  progressPercent: number;
  publishReadyCount: number;
  reviewQueueCount: number;
  revisionQueueCount: number;
  submissionReadinessPercent: number;
  nextPublishChapter: SerializationChapter | null;
  actions: SerializationAction[];
  warnings: string[];
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function dailyWordTarget(project: SerializationProject, platform: PlatformProfile) {
  if (/6k|6000/.test(project.updateCadence)) return 6000;
  if (/4k|4000/.test(project.updateCadence)) return 4000;
  if (/2k|2000/.test(project.updateCadence)) return 2000;
  if (platform.category === "free") return 4000;
  if (platform.category === "paid") return 3000;
  if (platform.category === "short") return 2000;
  return 2500;
}

function latestTask(tasks: SerializationTask[], chapterId: string, taskType: string) {
  return tasks
    .filter((task) => task.chapterId === chapterId && task.taskType === taskType)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0];
}

function parseReviewDecision(task: SerializationTask | undefined) {
  if (!task?.outputText) return null;
  try {
    const parsed = JSON.parse(task.outputText) as { score?: number; shouldSecondPass?: boolean };
    const score = typeof parsed.score === "number" ? parsed.score : null;
    const shouldSecondPass = typeof parsed.shouldSecondPass === "boolean"
      ? parsed.shouldSecondPass
      : score === null || score < 85;
    return { score, shouldSecondPass };
  } catch {
    return null;
  }
}

function reviewed(chapter: SerializationChapter, tasks: SerializationTask[]) {
  return latestTask(tasks, chapter.id, "chapter_review")?.status === "succeeded";
}

function secondPassed(chapter: SerializationChapter, tasks: SerializationTask[]) {
  return latestTask(tasks, chapter.id, "chapter_second_pass")?.status === "succeeded";
}

function buildActions(input: SerializationOpsInput, reviewQueue: SerializationChapter[], revisionQueue: SerializationChapter[], publishReady: SerializationChapter[]) {
  const actions: SerializationAction[] = [];
  const failedChecklist = input.submissionChecklist.items.filter((item) => item.status === "todo" || item.status === "risk");

  if (reviewQueue[0]) {
    actions.push({
      id: "review-next",
      label: "先审稿",
      priority: "high",
      chapterId: reviewQueue[0].id,
      detail: `第 ${reviewQueue[0].order} 章《${reviewQueue[0].title}》已有正文但未审稿。`,
      execution: {
        label: "执行审稿",
        method: "POST",
        endpoint: "/api/ai/tasks/chapter-review",
        payload: { chapterId: reviewQueue[0].id },
      },
    });
  }
  if (revisionQueue[0]) {
    const chapter = revisionQueue[0];
    actions.push({
      id: "revise-next",
      label: "先二改",
      priority: "high",
      chapterId: chapter.id,
      detail: `第 ${chapter.order} 章《${chapter.title}》审稿分偏低或仍有问题。`,
      execution: {
        label: "执行二改",
        method: "POST",
        endpoint: `/api/chapters/${chapter.id}/second-pass`,
        payload: {
          instruction: "按最近一次审稿结论执行二改：强化开头钩子、爽点兑现、人物选择和章末追读，保留原主线事实。",
          mode: "platform_fit",
          targetWords: Math.max(chapter.wordCount, 1200),
        },
      },
    });
  }
  if (publishReady[0]) {
    const chapter = publishReady[0];
    actions.push({
      id: "publish-next",
      label: "可发布",
      priority: "medium",
      chapterId: chapter.id,
      detail: `第 ${chapter.order} 章《${chapter.title}》已审稿并二改，可进入发布/定稿检查。`,
      execution: {
        label: "标记定稿",
        method: "PATCH",
        endpoint: `/api/chapters/${chapter.id}`,
        payload: { status: "final" },
      },
    });
  }
  if (failedChecklist[0]) {
    actions.push({
      id: "submission-gap",
      label: "补投稿资料",
      priority: failedChecklist[0].status === "todo" ? "high" : "medium",
      detail: `${failedChecklist[0].label}：${failedChecklist[0].detail}`,
      execution: null,
    });
  }
  if (actions.length === 0) {
    actions.push({
      id: "expand-production",
      label: "扩展生产",
      priority: "low",
      detail: "当前没有明显运营卡点，可以继续扩展章节排期或准备多平台投稿版本。",
      execution: null,
    });
  }

  return actions;
}

export function buildSerializationOpsDashboard(input: SerializationOpsInput): SerializationOpsDashboard {
  const draftedChapters = input.chapters.filter((chapter) => chapter.wordCount > 0);
  const reviewQueue = draftedChapters.filter((chapter) => !reviewed(chapter, input.aiTasks));
  const revisionQueue = draftedChapters.filter((chapter) => {
    const reviewTask = latestTask(input.aiTasks, chapter.id, "chapter_review");
    const decision = parseReviewDecision(reviewTask);
    return reviewed(chapter, input.aiTasks) && (decision?.shouldSecondPass ?? true);
  });
  const publishReady = draftedChapters.filter((chapter) => (
    reviewed(chapter, input.aiTasks)
    && !revisionQueue.some((item) => item.id === chapter.id)
    && (secondPassed(chapter, input.aiTasks) || chapter.status === "final")
  ));
  const progressPercent = input.project.targetWordCount > 0
    ? clampPercent((input.project.currentWordCount / input.project.targetWordCount) * 100)
    : 0;
  const target = dailyWordTarget(input.project, input.platform);
  const warnings: string[] = [];

  if (draftedChapters.length === 0) warnings.push("还没有可运营正文，先用批量初稿生产中心出稿。");
  if (reviewQueue.length > 0) warnings.push(`${reviewQueue.length} 章已有正文但未审稿，直接发布会放大留存风险。`);
  if (revisionQueue.length > 0) warnings.push(`${revisionQueue.length} 章需要二改后再发布。`);
  if (publishReady.length === 0 && draftedChapters.length > 0) warnings.push("暂无发布就绪章节，先完成审稿和二改。");
  if (input.submissionChecklist.readinessPercent < 80) warnings.push(`投稿准备度 ${input.submissionChecklist.readinessPercent}%，还不适合正式投放。`);

  return {
    platformName: input.platform.name,
    dailyWordTarget: target,
    progressPercent,
    publishReadyCount: publishReady.length,
    reviewQueueCount: reviewQueue.length,
    revisionQueueCount: revisionQueue.length,
    submissionReadinessPercent: input.submissionChecklist.readinessPercent,
    nextPublishChapter: publishReady[0] ?? null,
    actions: buildActions(input, reviewQueue, revisionQueue, publishReady),
    warnings,
  };
}
