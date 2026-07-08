import { buildTaskRetryPlan } from "./taskRetry.ts";

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
  inputSnapshot: string;
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
  archiveExperienceReceipt: TaskArchiveExperienceReceipt;
}

export interface TaskArchiveExperienceReceipt {
  status: "not_applicable" | "attached" | "missing";
  label: string;
  detail: string;
  evidence: string[];
  nextAction: string;
}

export interface TaskArchiveExperienceRepairItem {
  id: string;
  projectId: string;
  projectTitle: string;
  chapterTitle: string;
  taskType: string;
  taskLabel: string;
  statusLabel: string;
  providerName: string;
  model: string;
  createdAt: string;
  href: string;
  actionLabel: string;
  detail: string;
  evidence: string[];
}

export interface TaskArchiveExperienceRepairQueue {
  status: "clear" | "needs_repair";
  missingCount: number;
  title: string;
  detail: string;
  actionLabel: string;
  actionHref: string;
  guidance: string[];
  items: TaskArchiveExperienceRepairItem[];
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
  directRetrySupported: boolean;
}

export interface FailureRepairBatchItem extends TaskRetryCandidate {
  repairKind: "config" | "retry" | "manual";
}

export interface FailureRepairBatch {
  status: "clear" | "fix_config" | "retry_sample" | "review_manual";
  title: string;
  detail: string;
  primaryActionLabel: string;
  primaryActionHref: string;
  summary: {
    unresolvedFailures: number;
    configFailures: number;
    retryableFailures: number;
    manualFailures: number;
    affectedProjects: number;
    affectedProviders: number;
  };
  guidance: string[];
  items: FailureRepairBatchItem[];
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
  failureRepairBatch: FailureRepairBatch;
  archiveExperienceRepairQueue: TaskArchiveExperienceRepairQueue;
  retryCandidates: TaskRetryCandidate[];
  recentLogs: TaskRunLog[];
  nextActions: string[];
}

const taskLabels: Record<string, string> = {
  chapter_draft: "正文初稿",
  chapter_review: "章节审稿",
  chapter_second_pass: "章节二改",
  chapter_adopt_candidate: "采纳候选稿",
  first_three_rewrite: "前三章改写",
  submission_package_optimize: "投稿资料优化",
  platform_submission_asset_optimize: "平台投稿资产优化",
  control_asset_generate: "总控资料生成",
};

const statusLabels: Record<string, string> = {
  queued: "排队中",
  running: "运行中",
  succeeded: "成功",
  failed: "失败",
};

const archiveExperienceTaskTypes = new Set(["chapter_draft", "chapter_review", "chapter_second_pass"]);
const archiveExperienceEvidencePatterns = [
  "最终交付归档强制执行",
  "不允许忽略开书经验",
  "复制动作",
  "踩到不能踩边界",
  "必须执行",
];

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

function parseJsonObject(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function textFromUnknown(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const parts = value.map(textFromUnknown).filter((part): part is string => Boolean(part));
    return parts.length > 0 ? parts.join("\n") : null;
  }
  if (value && typeof value === "object") {
    const parts = Object.values(value).map(textFromUnknown).filter((part): part is string => Boolean(part));
    return parts.length > 0 ? parts.join("\n") : null;
  }
  return null;
}

function promptTextFromSnapshot(snapshot: string) {
  const parsed = parseJsonObject(snapshot);
  if (!parsed) return snapshot;

  const prompt = parsed.prompt && typeof parsed.prompt === "object" && !Array.isArray(parsed.prompt)
    ? parsed.prompt as Record<string, unknown>
    : null;
  const candidates = [
    prompt?.userPrompt,
    prompt?.systemPrompt,
    parsed.userPrompt,
    parsed.prompt,
    parsed.messages,
  ];

  return candidates
    .map(textFromUnknown)
    .filter((part): part is string => Boolean(part))
    .join("\n") || snapshot;
}

function archiveExperienceEvidence(promptText: string) {
  const evidence: string[] = [];
  for (const line of promptText.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (archiveExperienceEvidencePatterns.some((pattern) => trimmed.includes(pattern)) && !evidence.includes(trimmed)) {
      evidence.push(trimmed);
    }
    if (evidence.length >= 5) break;
  }
  return evidence;
}

export function buildTaskArchiveExperienceReceipt(task: Pick<TaskRunInput, "taskType" | "inputSnapshot">): TaskArchiveExperienceReceipt {
  if (!archiveExperienceTaskTypes.has(task.taskType)) {
    return {
      status: "not_applicable",
      label: "无需归档经验",
      detail: "非写稿、审稿、二改任务，按原任务回执验收。",
      evidence: [],
      nextAction: "继续检查任务输出和失败修复记录。",
    };
  }

  const promptText = promptTextFromSnapshot(task.inputSnapshot);
  const evidence = archiveExperienceEvidence(promptText);
  const hasArchiveExperience = promptText.includes("最终交付归档强制执行") && evidence.length > 0;
  if (hasArchiveExperience) {
    return {
      status: "attached",
      label: "归档经验已执行",
      detail: "任务输入已带最终交付归档强制执行，模型不能跳过上一轮开书经验。",
      evidence,
      nextAction: "完成后核对正文、审稿或二改是否落实复制动作和避坑边界。",
    };
  }

  return {
    status: "missing",
    label: "缺归档经验回执",
    detail: "任务输入没有检测到最终交付归档强制执行，下一轮需要先补开书经验再重跑。",
    evidence: ["inputSnapshot 未包含：最终交付归档强制执行"],
    nextAction: "回开书经验或章节页补齐 startTactic 后，再发起单章验证。",
  };
}

function isRetryableError(message: string | null) {
  const text = compact(message).toLowerCase();
  return /rate limit|quota|429|timeout|timed out|network|econn|connection|socket|dns|fetch failed|json|parse|schema|provider|server error|500|503|限流|配额|超时|网络|连接|解析|供应商/.test(text);
}

function isConfigError(message: string | null) {
  const text = compact(message).toLowerCase();
  return /api key|apikey|unauthorized|forbidden|401|403|permission|authentication|密钥|权限|授权|未配置/.test(text);
}

function retryReason(task: TaskRunInput) {
  if (isConfigError(task.errorMessage)) return "这类失败更像 API Key、权限或模型配置问题，先修配置再继续。";
  if (task.taskType === "chapter_second_pass") return "二改任务需要保留作者指令，建议回章节页确认方向后重试。";
  if (isRetryableError(task.errorMessage)) return "错误类型具备重试价值，建议先单章重试，再恢复批量。";
  return "更像配置、权限或输入问题，先修配置再重试。";
}

function actionLabel(task: TaskRunInput) {
  if (isConfigError(task.errorMessage)) return "去模型设置";
  if (task.taskType === "chapter_draft") return "回章节重试初稿";
  if (task.taskType === "chapter_review") return "回章节重试审稿";
  if (task.taskType === "chapter_second_pass") return "回章节重试二改";
  return "回项目处理";
}

function chapterHref(task: TaskRunInput) {
  if (isConfigError(task.errorMessage)) return "/settings/models";
  return task.chapterId ? `/projects/${task.projectId}/chapters/${task.chapterId}` : `/projects/${task.projectId}`;
}

function archiveExperienceRepairActionLabel(taskType: string) {
  if (taskType === "chapter_draft") return "回章节重试初稿";
  if (taskType === "chapter_review") return "回章节重试审稿";
  if (taskType === "chapter_second_pass") return "回章节重试二改";
  return "回项目补经验";
}

function archiveExperienceScopeKey(task: Pick<TaskRunInput, "projectId" | "chapterId" | "taskType">) {
  return `${task.projectId}:${task.chapterId ?? "project"}:${task.taskType}`;
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
    archiveExperienceReceipt: buildTaskArchiveExperienceReceipt(task),
  };
}

function buildArchiveExperienceRepairQueue(tasks: TaskRunInput[]): TaskArchiveExperienceRepairQueue {
  const latestByScope = new Map<string, TaskRunInput>();
  const sortedTasks = [...tasks].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  for (const task of sortedTasks) {
    const receipt = buildTaskArchiveExperienceReceipt(task);
    if (receipt.status === "not_applicable") continue;
    const key = archiveExperienceScopeKey(task);
    if (!latestByScope.has(key)) latestByScope.set(key, task);
  }

  const items = [...latestByScope.values()]
    .map((task) => ({ task, log: buildLog(task) }))
    .filter(({ log }) => log.archiveExperienceReceipt.status === "missing")
    .sort((left, right) => new Date(right.log.createdAt).getTime() - new Date(left.log.createdAt).getTime())
    .map(({ log }): TaskArchiveExperienceRepairItem => ({
      id: log.id,
      projectId: log.projectId,
      projectTitle: log.projectTitle,
      chapterTitle: log.chapterTitle,
      taskType: log.taskType,
      taskLabel: log.taskLabel,
      statusLabel: log.statusLabel,
      providerName: log.providerName,
      model: log.model,
      createdAt: log.createdAt,
      href: log.href,
      actionLabel: archiveExperienceRepairActionLabel(log.taskType),
      detail: `${log.projectTitle} · ${log.chapterTitle} · ${log.taskLabel} 缺「最终交付归档强制执行」输入，不能作为放量依据。`,
      evidence: log.archiveExperienceReceipt.evidence,
    }));

  if (items.length === 0) {
    return {
      status: "clear",
      missingCount: 0,
      title: "归档经验回执已闭合",
      detail: "最新写稿、审稿、二改任务未发现缺归档经验回执，可以继续看失败复盘和批量安全阀。",
      actionLabel: "查看运行日志",
      actionHref: "/tasks#task-run-console",
      guidance: ["继续保留归档经验证据；新任务如果缺「最终交付归档强制执行」，会重新进入修复队列。"],
      items: [],
    };
  }

  return {
    status: "needs_repair",
    missingCount: items.length,
    title: "归档经验修复入口",
    detail: `${items.length} 个最新写审改任务缺归档经验回执；先补开书经验并单章重跑，再回总闸门复检。`,
    actionLabel: items[0]?.actionLabel ?? "回任务运行台",
    actionHref: items[0]?.href ?? "/tasks?focus=archive-experience#task-run-console",
    guidance: [
      "先补开书经验或 startTactic，再重跑对应章节任务。",
      "只看同项目、同章节、同任务类型的最新任务；新任务补齐后旧缺口自动退场。",
      "回执里必须出现「最终交付归档强制执行」和至少一条复制动作或避坑边界。",
    ],
    items,
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

function recoveryFor(task: TaskRunInput, tasks: TaskRunInput[]) {
  const taskCreatedAt = new Date(task.createdAt).getTime();
  const recoveredBy = tasks
    .filter((candidate) => (
      candidate.id !== task.id
      && candidate.status === "succeeded"
      && candidate.projectId === task.projectId
      && candidate.taskType === task.taskType
      && Boolean(task.chapterId)
      && candidate.chapterId === task.chapterId
      && new Date(candidate.createdAt).getTime() > taskCreatedAt
    ))
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())[0];

  return recoveredBy ? { status: "recovered" as const, recoveredByTaskId: recoveredBy.id } : { status: "unresolved" as const, recoveredByTaskId: null };
}

function unresolvedFailures(tasks: TaskRunInput[]) {
  return tasks.filter((task) => task.status === "failed" && recoveryFor(task, tasks).status === "unresolved");
}

function buildRetryCandidates(tasks: TaskRunInput[]): TaskRetryCandidate[] {
  return tasks
    .filter((task) => task.status === "failed")
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 8)
    .map((task) => {
      const retryPlan = buildTaskRetryPlan(task);
      const retryable = isRetryableError(task.errorMessage);
      const directRetrySupported = retryPlan.supported && retryable;
      return {
        id: task.id,
        projectId: task.projectId,
        projectTitle: task.project?.title ?? "未知项目",
        chapterTitle: task.chapter?.title ?? "项目任务",
        taskLabel: labelFor(task.taskType),
        providerName: task.modelProvider?.displayName ?? "未知模型",
        model: task.model,
        retryable,
        retryReason: directRetrySupported ? retryPlan.reason : retryReason(task),
        actionLabel: directRetrySupported ? retryPlan.actionLabel : actionLabel(task),
        href: chapterHref(task),
        errorMessage: compact(task.errorMessage),
        directRetrySupported,
      };
    });
}

function repairKind(candidate: TaskRetryCandidate): FailureRepairBatchItem["repairKind"] {
  if (candidate.directRetrySupported) return "retry";
  if (candidate.actionLabel === "去模型设置") return "config";
  return "manual";
}

function buildFailureRepairBatch(tasks: TaskRunInput[]): FailureRepairBatch {
  const candidates = buildRetryCandidates(unresolvedFailures(tasks))
    .map((candidate) => ({ ...candidate, repairKind: repairKind(candidate) }))
    .sort((left, right) => {
      const rank = { config: 0, retry: 1, manual: 2 };
      return rank[left.repairKind] - rank[right.repairKind] || left.projectTitle.localeCompare(right.projectTitle);
    });
  const configFailures = candidates.filter((candidate) => candidate.repairKind === "config").length;
  const retryableFailures = candidates.filter((candidate) => candidate.repairKind === "retry").length;
  const manualFailures = candidates.filter((candidate) => candidate.repairKind === "manual").length;
  const summary = {
    unresolvedFailures: candidates.length,
    configFailures,
    retryableFailures,
    manualFailures,
    affectedProjects: new Set(candidates.map((candidate) => candidate.projectId)).size,
    affectedProviders: new Set(candidates.map((candidate) => `${candidate.providerName}:${candidate.model}`)).size,
  };

  if (candidates.length === 0) {
    return {
      status: "clear",
      title: "失败修复批次已清空",
      detail: "没有未恢复失败，批量生产可以继续按安全阀推进。",
      primaryActionLabel: "查看任务队列",
      primaryActionHref: "/tasks",
      summary,
      guidance: ["继续保留失败记录和恢复证据，下一轮放量仍先看失败率。"],
      items: [],
    };
  }

  if (configFailures > 0) {
    return {
      status: "fix_config",
      title: "先修配置，再谈重试",
      detail: `${configFailures} 个未恢复失败指向 API Key、权限或模型配置。先修配置，否则重试只是在重复烧时间。`,
      primaryActionLabel: "去模型设置",
      primaryActionHref: "/settings/models",
      summary,
      guidance: [
        "先修配置类失败，再处理可重试任务。",
        "修完后只挑 1 个失败样本重试，确认成功再恢复批量。",
      ],
      items: candidates,
    };
  }

  if (retryableFailures > 0) {
    const firstRetry = candidates.find((candidate) => candidate.repairKind === "retry");
    return {
      status: "retry_sample",
      title: "先单章重试，不要直接放量",
      detail: `${retryableFailures} 个未恢复失败具备重试价值。先拿最近样本验证链路，再恢复批量。`,
      primaryActionLabel: firstRetry?.actionLabel ?? "处理失败",
      primaryActionHref: firstRetry?.href ?? "/failures",
      summary,
      guidance: [
        "先重试 1 个样本，成功后再处理剩余同类失败。",
        "如果样本仍失败，立刻回模型路线和提示词，不要继续批量。",
      ],
      items: candidates,
    };
  }

  return {
    status: "review_manual",
    title: "先人工复盘失败输入",
    detail: `${manualFailures} 个未恢复失败暂不适合直接重试，需要回章节或项目页确认输入、上下文和任务类型。`,
    primaryActionLabel: candidates[0]?.actionLabel ?? "查看复盘",
    primaryActionHref: candidates[0]?.href ?? "/failures",
    summary,
    guidance: ["先修输入和上下文，再发起小样本验证。"],
    items: candidates,
  };
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
  const failureRepairBatch = buildFailureRepairBatch(sortedTasks);
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
    failureRepairBatch,
    archiveExperienceRepairQueue: buildArchiveExperienceRepairQueue(tasks),
    retryCandidates,
    recentLogs: sortedTasks.slice(0, 12).map(buildLog),
    nextActions: nextActions({ summary, retryCandidates }),
  };
}
