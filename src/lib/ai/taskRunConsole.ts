export interface TaskRunInput {
  id: string;
  projectId: string;
  chapterId: string | null;
  taskType: string;
  model: string;
  status: string;
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
    providerId: string;
    displayName: string;
  } | null;
}

export interface TaskRunLog {
  id: string;
  projectId: string;
  projectTitle: string;
  chapterTitle: string;
  taskType: string;
  taskLabel: string;
  providerName: string;
  model: string;
  status: string;
  statusLabel: string;
  createdAt: string;
  updatedAt: string;
  runtimeMs: number;
  tokens: number;
  costUsd: number;
  errorMessage: string | null;
  href: string;
}

export interface TaskRetryCandidate {
  id: string;
  projectId: string;
  projectTitle: string;
  chapterTitle: string;
  taskLabel: string;
  providerName: string;
  model: string;
  retryable: boolean;
  retryReason: string;
  actionLabel: string;
  href: string;
  errorMessage: string;
}

export interface TaskRunConsole {
  status: "idle" | "running" | "blocked" | "healthy";
  verdict: string;
  summary: {
    totalTasks: number;
    queuedTasks: number;
    runningTasks: number;
    succeededTasks: number;
    failedTasks: number;
    retryableFailures: number;
    staleRunningTasks: number;
    knownCostUsd: number;
    totalTokens: number;
    lastRunAt: string | null;
  };
  taskTypeRows: Array<{
    taskType: string;
    label: string;
    totalTasks: number;
    runningTasks: number;
    failedTasks: number;
    succeededTasks: number;
  }>;
  retryCandidates: TaskRetryCandidate[];
  recentLogs: TaskRunLog[];
  nextActions: string[];
}

const taskLabels: Record<string, string> = {
  chapter_draft: "正文初稿",
  chapter_review: "章节审稿",
  chapter_second_pass: "章节二改",
  first_three_rewrite: "前三章改写",
  submission_package_optimize: "投稿资料优化",
};

const statusLabels: Record<string, string> = {
  queued: "排队中",
  running: "运行中",
  succeeded: "成功",
  failed: "失败",
};

function labelFor(taskType: string) {
  return taskLabels[taskType] ?? taskType;
}

function dateIso(value: Date | string) {
  return new Date(value).toISOString();
}

function tokens(task: TaskRunInput) {
  return (task.inputTokens ?? 0) + (task.outputTokens ?? 0);
}

function money(value: number) {
  return Math.round(value * 1000000) / 1000000;
}

function compact(message: string | null) {
  return (message || "任务失败，但没有记录错误信息。").replace(/\s+/g, " ").trim();
}

function isRetryableError(message: string | null) {
  const text = compact(message).toLowerCase();
  return /rate limit|quota|429|timeout|timed out|network|econn|connection|socket|dns|fetch failed|json|parse|schema|provider|server error|500|503|限流|配额|超时|网络|连接|解析|供应商/.test(text);
}

function retryReason(task: TaskRunInput) {
  if (task.taskType === "chapter_second_pass") return "二改任务需要保留作者指令，建议回章节页确认方向后重试。";
  if (isRetryableError(task.errorMessage)) return "错误类型具备重试价值，建议先单章重试，再恢复批量。";
  return "更像配置、权限或输入问题，先修配置再重试。";
}

function actionLabel(task: TaskRunInput) {
  if (task.taskType === "chapter_draft") return "回章节重试初稿";
  if (task.taskType === "chapter_review") return "回章节重试审稿";
  if (task.taskType === "chapter_second_pass") return "回章节重试二改";
  return "回项目处理";
}

function chapterHref(task: TaskRunInput) {
  return task.chapterId ? `/projects/${task.projectId}/chapters/${task.chapterId}` : `/projects/${task.projectId}`;
}

function runtimeMs(task: TaskRunInput) {
  return Math.max(0, new Date(task.updatedAt).getTime() - new Date(task.createdAt).getTime());
}

function isStaleRunning(task: TaskRunInput, now: Date) {
  if (task.status !== "running" && task.status !== "queued") return false;
  return now.getTime() - new Date(task.createdAt).getTime() > 30 * 60 * 1000;
}

function buildLog(task: TaskRunInput): TaskRunLog {
  const projectTitle = task.project?.title ?? "未知项目";
  const chapterTitle = task.chapter?.title ?? "项目任务";

  return {
    id: task.id,
    projectId: task.projectId,
    projectTitle,
    chapterTitle,
    taskType: task.taskType,
    taskLabel: labelFor(task.taskType),
    providerName: task.modelProvider?.displayName ?? "未知模型",
    model: task.model,
    status: task.status,
    statusLabel: statusLabels[task.status] ?? task.status,
    createdAt: dateIso(task.createdAt),
    updatedAt: dateIso(task.updatedAt),
    runtimeMs: runtimeMs(task),
    tokens: tokens(task),
    costUsd: money(task.costUsd ?? 0),
    errorMessage: task.status === "failed" ? compact(task.errorMessage) : null,
    href: chapterHref(task),
  };
}

function buildTaskTypeRows(tasks: TaskRunInput[]) {
  const groups = new Map<string, TaskRunInput[]>();
  for (const task of tasks) {
    groups.set(task.taskType, [...(groups.get(task.taskType) ?? []), task]);
  }

  return [...groups.entries()]
    .map(([taskType, items]) => ({
      taskType,
      label: labelFor(taskType),
      totalTasks: items.length,
      runningTasks: items.filter((task) => task.status === "running" || task.status === "queued").length,
      failedTasks: items.filter((task) => task.status === "failed").length,
      succeededTasks: items.filter((task) => task.status === "succeeded").length,
    }))
    .sort((left, right) => right.runningTasks - left.runningTasks || right.failedTasks - left.failedTasks || right.totalTasks - left.totalTasks);
}

function buildRetryCandidates(tasks: TaskRunInput[]): TaskRetryCandidate[] {
  return tasks
    .filter((task) => task.status === "failed")
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 8)
    .map((task) => ({
      id: task.id,
      projectId: task.projectId,
      projectTitle: task.project?.title ?? "未知项目",
      chapterTitle: task.chapter?.title ?? "项目任务",
      taskLabel: labelFor(task.taskType),
      providerName: task.modelProvider?.displayName ?? "未知模型",
      model: task.model,
      retryable: isRetryableError(task.errorMessage),
      retryReason: retryReason(task),
      actionLabel: actionLabel(task),
      href: chapterHref(task),
      errorMessage: compact(task.errorMessage),
    }));
}

function nextActions(console: Pick<TaskRunConsole, "summary" | "retryCandidates">) {
  const actions: string[] = [];
  if (console.summary.totalTasks === 0) {
    return ["还没有真实任务日志，先从单章初稿、审稿、二改各跑一次，建立第一批运行样本。"];
  }
  if (console.summary.staleRunningTasks > 0) actions.push(`${console.summary.staleRunningTasks} 个任务疑似卡死，先回项目页确认是否需要重新发起。`);
  if (console.summary.failedTasks > 0) actions.push(`先处理 ${console.summary.failedTasks} 个失败任务，修复后只做单章重试。`);
  if (console.summary.runningTasks + console.summary.queuedTasks > 3) actions.push("当前并发较高，先暂停扩大批量，等运行任务落地后再继续。");
  if (console.summary.retryableFailures > 0) actions.push(`${console.summary.retryableFailures} 个失败具备重试价值，优先挑最近一条样本验证。`);
  if (actions.length === 0) actions.push("运行日志健康，可以继续按安全阀扩大批量生产。");
  return actions.slice(0, 5);
}

export function buildTaskRunConsole(tasks: TaskRunInput[], options: { now?: Date } = {}): TaskRunConsole {
  const now = options.now ?? new Date();
  const sortedTasks = [...tasks].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  const summary = {
    totalTasks: tasks.length,
    queuedTasks: tasks.filter((task) => task.status === "queued").length,
    runningTasks: tasks.filter((task) => task.status === "running").length,
    succeededTasks: tasks.filter((task) => task.status === "succeeded").length,
    failedTasks: tasks.filter((task) => task.status === "failed").length,
    retryableFailures: tasks.filter((task) => task.status === "failed" && isRetryableError(task.errorMessage)).length,
    staleRunningTasks: tasks.filter((task) => isStaleRunning(task, now)).length,
    knownCostUsd: money(tasks.reduce((sum, task) => sum + (task.costUsd ?? 0), 0)),
    totalTokens: tasks.reduce((sum, task) => sum + tokens(task), 0),
    lastRunAt: sortedTasks[0] ? dateIso(sortedTasks[0].createdAt) : null,
  };
  const retryCandidates = buildRetryCandidates(sortedTasks);
  const status: TaskRunConsole["status"] = summary.totalTasks === 0
    ? "idle"
    : summary.failedTasks > 0 || summary.staleRunningTasks > 0
      ? "blocked"
      : summary.runningTasks + summary.queuedTasks > 0
        ? "running"
        : "healthy";
  const verdict = status === "idle"
    ? "还没有任务运行样本。"
    : status === "blocked"
      ? "任务链路存在失败或卡死，先复盘再扩大批量。"
      : status === "running"
        ? "任务正在运行，先观察完成率和成本回写。"
        : "任务运行健康，可以继续推进批量生产。";

  return {
    status,
    verdict,
    summary,
    taskTypeRows: buildTaskTypeRows(tasks),
    retryCandidates,
    recentLogs: sortedTasks.slice(0, 12).map(buildLog),
    nextActions: nextActions({ summary, retryCandidates }),
  };
}
