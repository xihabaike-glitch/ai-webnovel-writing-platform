import { buildBatchRouteEffectSummary, type BatchRouteEffectSummary } from "../model-gateway/batchRouteEffectSummary.ts";

export interface TaskBatchHistoryInput {
  id: string;
  projectId: string;
  chapterId: string | null;
  taskType: string;
  model: string;
  status: string;
  inputSnapshot: string;
  outputText: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
  errorMessage: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  project?: {
    title: string;
  } | null;
  chapter?: {
    title: string;
  } | null;
  modelProvider?: {
    displayName: string;
  } | null;
}

export interface TaskBatchHistoryItem {
  id: string;
  projectId: string;
  projectTitle: string;
  taskType: string;
  taskLabel: string;
  startedAt: string;
  finishedAt: string;
  chapterTitles: string[];
  taskIds: string[];
  href: string;
  summary: BatchRouteEffectSummary;
  runningTasks: number;
  failedSamples: string[];
  nextAction: string;
}

const batchTaskLabels: Record<string, string> = {
  chapter_draft: "批量初稿",
  chapter_review: "批量审稿",
  chapter_second_pass: "批量二改",
};

const autoAuditSources = new Set([
  "auto_draft_quality_audit",
  "auto_second_pass_quality_audit",
]);

function dateMs(value: Date | string) {
  return new Date(value).getTime();
}

function dateIso(value: Date | string) {
  return new Date(value).toISOString();
}

function compact(message: string | null) {
  return (message || "失败任务没有记录错误信息。").replace(/\s+/g, " ").trim();
}

function safeJson(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function recordValue(value: unknown, key: string) {
  if (!value || typeof value !== "object") return undefined;
  return (value as Record<string, unknown>)[key];
}

function snapshotSource(task: TaskBatchHistoryInput) {
  const parsed = safeJson(task.inputSnapshot);
  const source = recordValue(parsed, "source");
  if (typeof source === "string") return source;
  const input = recordValue(parsed, "input");
  const inputSource = recordValue(input, "source");
  return typeof inputSource === "string" ? inputSource : null;
}

function routeRole(task: TaskBatchHistoryInput) {
  const parsed = safeJson(task.inputSnapshot);
  const routeAttempt = recordValue(parsed, "routeAttempt");
  const role = recordValue(routeAttempt, "role");
  return role === "primary" || role === "fallback" || role === "auto" ? role : null;
}

function isAutoAudit(task: TaskBatchHistoryInput) {
  return task.taskType === "chapter_review" && (task.model.includes(":auto-") || autoAuditSources.has(snapshotSource(task) ?? ""));
}

function isBatchTask(task: TaskBatchHistoryInput) {
  return Object.prototype.hasOwnProperty.call(batchTaskLabels, task.taskType) && !isAutoAudit(task);
}

function scoreFromOutput(outputText: string | null) {
  const parsed = safeJson(outputText);
  const score = recordValue(parsed, "score");
  return typeof score === "number" ? score : null;
}

function referencedTaskId(task: TaskBatchHistoryInput, key: "draftTaskId" | "secondPassTaskId") {
  const parsed = safeJson(task.inputSnapshot);
  const direct = recordValue(parsed, key);
  if (typeof direct === "string") return direct;
  const input = recordValue(parsed, "input");
  const nested = recordValue(input, key);
  return typeof nested === "string" ? nested : null;
}

function buildQualityScores(tasks: TaskBatchHistoryInput[]) {
  const scores = new Map<string, number>();
  for (const task of tasks) {
    const score = scoreFromOutput(task.outputText);
    if (score === null) continue;
    if (task.taskType === "chapter_review" && !isAutoAudit(task)) {
      scores.set(task.id, score);
      continue;
    }
    if (snapshotSource(task) === "auto_draft_quality_audit") {
      const draftTaskId = referencedTaskId(task, "draftTaskId");
      if (draftTaskId) scores.set(draftTaskId, score);
      continue;
    }
    if (snapshotSource(task) === "auto_second_pass_quality_audit") {
      const secondPassTaskId = referencedTaskId(task, "secondPassTaskId");
      if (secondPassTaskId) scores.set(secondPassTaskId, score);
    }
  }
  return scores;
}

function uniqueTexts(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function batchNextAction(input: {
  summary: BatchRouteEffectSummary;
  runningTasks: number;
  failedSamples: string[];
}) {
  if (input.runningTasks > 0) return "这批还有任务未落地，先等状态回写后再扩大批量。";
  if (input.summary.failedTasks > 0) return "先处理失败样本，完成单章重试后再恢复同类批量。";
  if (input.summary.averageQualityScore !== null && input.summary.averageQualityScore < 80) return "质量分没到放量线，下一批先收紧章节卡和平台风格约束。";
  if (input.summary.averageCostPerSucceededTaskUsd > 0.05) return "单章成本偏高，下一批先比较低成本模型路线。";
  return "这批表现稳定，可以继续按安全阀推进下一小批。";
}

export function buildTaskBatchHistory(
  tasks: TaskBatchHistoryInput[],
  options: { windowMinutes?: number; limit?: number } = {},
): TaskBatchHistoryItem[] {
  const windowMs = (options.windowMinutes ?? 5) * 60 * 1000;
  const limit = options.limit ?? 6;
  const qualityScores = buildQualityScores(tasks);
  const sortedBatchTasks = tasks
    .filter(isBatchTask)
    .sort((left, right) => dateMs(left.createdAt) - dateMs(right.createdAt));
  const groups: TaskBatchHistoryInput[][] = [];

  for (const task of sortedBatchTasks) {
    const current = groups.at(-1);
    const last = current?.at(-1);
    if (
      current
      && last
      && last.projectId === task.projectId
      && last.taskType === task.taskType
      && dateMs(task.createdAt) - dateMs(last.createdAt) <= windowMs
    ) {
      current.push(task);
    } else {
      groups.push([task]);
    }
  }

  return groups
    .map((group) => {
      const first = group[0];
      const startedAt = group.reduce((earliest, task) => dateMs(task.createdAt) < dateMs(earliest.createdAt) ? task : earliest, first);
      const finishedAt = group.reduce((latest, task) => dateMs(task.updatedAt) > dateMs(latest.updatedAt) ? task : latest, first);
      const summary = buildBatchRouteEffectSummary(group
        .filter((task) => task.status === "succeeded" || task.status === "failed")
        .map((task) => ({
          status: task.status === "succeeded" ? "succeeded" : "failed",
          taskId: task.id,
          providerName: task.modelProvider?.displayName ?? "未知模型",
          model: task.model,
          role: routeRole(task),
          inputTokens: task.inputTokens,
          outputTokens: task.outputTokens,
          costUsd: task.costUsd,
          qualityScore: qualityScores.get(task.id) ?? null,
        })));
      const runningTasks = group.filter((task) => task.status === "running" || task.status === "queued").length;
      const failedSamples = group
        .filter((task) => task.status === "failed")
        .map((task) => compact(task.errorMessage))
        .slice(0, 2);

      return {
        id: `${first.projectId}:${first.taskType}:${dateIso(startedAt.createdAt)}`,
        projectId: first.projectId,
        projectTitle: first.project?.title ?? "未知项目",
        taskType: first.taskType,
        taskLabel: batchTaskLabels[first.taskType] ?? first.taskType,
        startedAt: dateIso(startedAt.createdAt),
        finishedAt: dateIso(finishedAt.updatedAt),
        chapterTitles: uniqueTexts(group.map((task) => task.chapter?.title ?? "项目任务")).slice(0, 5),
        taskIds: group.map((task) => task.id),
        href: first.chapterId ? `/projects/${first.projectId}/chapters/${first.chapterId}` : `/projects/${first.projectId}`,
        summary,
        runningTasks,
        failedSamples,
        nextAction: batchNextAction({ summary, runningTasks, failedSamples }),
      };
    })
    .sort((left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime())
    .slice(0, limit);
}
