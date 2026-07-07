export interface FailureReviewTask {
  id: string;
  projectId: string;
  chapterId?: string | null;
  taskType: string;
  model: string;
  status: string;
  errorMessage: string | null;
  createdAt: Date | string;
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

export interface FailureGroup {
  id: string;
  label: string;
  count: number;
  percent: number;
  sample: string;
  suggestion: string;
}

export interface FailureReviewItem {
  id: string;
  projectId: string;
  projectTitle: string;
  chapterTitle: string;
  taskLabel: string;
  providerName: string;
  model: string;
  category: FailureCategory;
  categoryLabel: string;
  retryable: boolean;
  recoveryStatus: "recovered" | "unresolved";
  recoveredByTaskId: string | null;
  recoveryLabel: string;
  errorMessage: string;
  suggestion: string;
  createdAt: string;
  href: string;
}

export type FailureRepairLaneId = "config" | "prompt_context" | "retry_sample" | "manual_review";

export interface FailureRepairLane {
  id: FailureRepairLaneId;
  priorityLabel: "P0" | "P1" | "P2" | "P3";
  label: string;
  count: number;
  detail: string;
  actionLabel: string;
  href: string;
  evidence: string[];
  sampleTaskIds: string[];
  receiptAction: {
    id: string;
    label: string;
    detail: string;
    href: string;
    message: string;
    payload: {
      source: "failure_repair_lane";
      laneId: FailureRepairLaneId;
      sampleTaskIds: string[];
      evidence: string[];
    };
  };
}

export interface FailureReviewPmFocus {
  tone: "blocked" | "watch" | "ready";
  resumePolicy: "hold_batch" | "sample_only" | "watch_resume";
  headline: string;
  detail: string;
  proof: string;
  actionLabel: string;
  actionHref: string;
}

export interface FailureReviewCenter {
  summary: {
    totalFailures: number;
    recoveredFailures: number;
    unresolvedFailures: number;
    retryableFailures: number;
    affectedProjects: number;
    affectedProviders: number;
    mostCommonCategory: string;
  };
  categoryGroups: FailureGroup[];
  providerGroups: FailureGroup[];
  taskTypeGroups: FailureGroup[];
  projectGroups: FailureGroup[];
  repairLanes: FailureRepairLane[];
  pmFocus: FailureReviewPmFocus;
  recentFailures: FailureReviewItem[];
  nextActions: string[];
}

type FailureCategory = "api_key" | "rate_limit" | "timeout" | "context" | "json_parse" | "network" | "provider" | "unknown";

const taskLabels: Record<string, string> = {
  chapter_draft: "正文初稿",
  chapter_review: "章节审稿",
  chapter_second_pass: "章节二改",
  first_three_rewrite: "前三章改写",
  submission_package_optimize: "投稿资料优化",
  platform_submission_asset_optimize: "平台投稿资产优化",
  control_asset_generate: "总控资料生成",
};

const categoryLabels: Record<FailureCategory, string> = {
  api_key: "密钥/权限",
  rate_limit: "限流/配额",
  timeout: "超时",
  context: "上下文过长",
  json_parse: "格式解析",
  network: "网络连接",
  provider: "供应商异常",
  unknown: "未知错误",
};

const categorySuggestions: Record<FailureCategory, string> = {
  api_key: "先检查模型设置里的 API Key、启用状态和供应商权限，再重试。",
  rate_limit: "降低批量并发，等待配额恢复，必要时切换备用模型。",
  timeout: "缩短上下文、降低目标字数，或把批量任务拆小后重试。",
  context: "裁剪章节上下文和设定资料，优先保留目标、钩子、冲突和审稿意见。",
  json_parse: "强化提示词的 JSON 输出约束，或改用更稳的模型跑结构化任务。",
  network: "确认本地网络和供应商地址可访问，短时间后重试。",
  provider: "查看供应商返回内容，必要时换模型或降低请求复杂度。",
  unknown: "补充错误记录后再复盘；先单章重试，不要直接批量放大。",
};

const retryableCategories = new Set<FailureCategory>(["rate_limit", "timeout", "network", "provider", "json_parse"]);

function labelForTask(taskType: string) {
  return taskLabels[taskType] ?? taskType;
}

function compact(message: string | null) {
  return (message || "任务失败，但没有记录错误信息。").replace(/\s+/g, " ").trim();
}

function categorize(message: string | null): FailureCategory {
  const text = compact(message).toLowerCase();
  if (/api key|apikey|unauthorized|forbidden|401|403|permission|密钥|权限/.test(text)) return "api_key";
  if (/rate limit|quota|429|too many requests|限流|配额/.test(text)) return "rate_limit";
  if (/timeout|timed out|etimedout|超时/.test(text)) return "timeout";
  if (/context|token|too long|max.*length|上下文|长度/.test(text)) return "context";
  if (/json|parse|schema|invalid format|格式|解析/.test(text)) return "json_parse";
  if (/network|econn|connection|socket|dns|fetch failed|网络|连接/.test(text)) return "network";
  if (/model request failed|claude request failed|ollama request failed|provider|供应商|server error|500|503/.test(text)) return "provider";
  return "unknown";
}

function dateIso(value: Date | string) {
  return new Date(value).toISOString();
}

function failureHref(task: FailureReviewTask) {
  return task.chapterId ? `/projects/${task.projectId}/chapters/${task.chapterId}` : `/projects/${task.projectId}`;
}

function groupBy(
  items: FailureReviewItem[],
  getKey: (item: FailureReviewItem) => string,
  getLabel: (item: FailureReviewItem) => string,
  getSuggestion: (item: FailureReviewItem) => string,
): FailureGroup[] {
  const groups = new Map<string, FailureReviewItem[]>();
  for (const item of items) {
    const key = getKey(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return [...groups.entries()]
    .map(([id, values]) => ({
      id,
      label: getLabel(values[0]),
      count: values.length,
      percent: items.length > 0 ? Math.round((values.length / items.length) * 100) : 0,
      sample: values[0].errorMessage,
      suggestion: getSuggestion(values[0]),
    }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

function repairLaneId(item: FailureReviewItem): FailureRepairLaneId {
  if (item.category === "api_key") return "config";
  if (item.category === "context" || item.category === "json_parse") return "prompt_context";
  if (item.retryable) return "retry_sample";
  return "manual_review";
}

function buildRepairLanes(items: FailureReviewItem[]): FailureRepairLane[] {
  const laneOrder: FailureRepairLaneId[] = ["config", "prompt_context", "retry_sample", "manual_review"];
  const laneMeta: Record<FailureRepairLaneId, {
    priorityLabel: FailureRepairLane["priorityLabel"];
    label: string;
    detail: (count: number) => string;
    actionLabel: string;
    href?: string;
    receiptLabel: string;
    receiptMessage: string;
  }> = {
    config: {
      priorityLabel: "P0",
      label: "先修模型配置",
      detail: (count) => `${count} 个失败指向密钥、权限或模型配置。先修配置，否则重试只会重复失败。`,
      actionLabel: "去模型设置",
      href: "/settings/models",
      receiptLabel: "记录配置修复",
      receiptMessage: "已记录模型配置修复，刷新后确认未恢复失败是否清空。",
    },
    prompt_context: {
      priorityLabel: "P1",
      label: "先改提示词/上下文",
      detail: (count) => `${count} 个失败来自上下文过长或结构化输出不稳。先裁剪输入、收紧格式，再重试样本。`,
      actionLabel: "回章节修上下文",
      receiptLabel: "记录上下文修复",
      receiptMessage: "已记录提示词/上下文修复，下一步只跑单章样本复检。",
    },
    retry_sample: {
      priorityLabel: "P2",
      label: "单章重试验证",
      detail: (count) => `${count} 个失败具备重试价值。先挑最近 1 个样本跑通，再恢复同类任务。`,
      actionLabel: "单章重试样本",
      receiptLabel: "记录样本重试",
      receiptMessage: "已记录单章重试样本，刷新后检查失败数量和同类任务是否恢复。",
    },
    manual_review: {
      priorityLabel: "P3",
      label: "人工复盘输入",
      detail: (count) => `${count} 个失败缺少稳定自动修复路径。先回项目核对输入、任务类型和上下文。`,
      actionLabel: "人工复盘输入",
      receiptLabel: "记录人工复盘",
      receiptMessage: "已记录人工复盘处理，下一步回总闸门复检是否仍有失败阻塞。",
    },
  };

  return laneOrder
    .map((laneId) => {
      const values = items.filter((item) => repairLaneId(item) === laneId);
      if (values.length === 0) return null;
      const categoryCounts = new Map<string, number>();
      const providerCounts = new Map<string, number>();
      for (const item of values) {
        categoryCounts.set(item.categoryLabel, (categoryCounts.get(item.categoryLabel) ?? 0) + 1);
        providerCounts.set(`${item.providerName} · ${item.model}`, (providerCounts.get(`${item.providerName} · ${item.model}`) ?? 0) + 1);
      }
      const categoryEvidence = [...categoryCounts.entries()]
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .map(([label, count]) => `${label} ${count}`);
      const providerEvidence = [...providerCounts.entries()]
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .slice(0, 2)
        .map(([label, count]) => `${label} ${count}`);
      const meta = laneMeta[laneId];
      const sampleTaskIds = values.slice(0, 3).map((item) => item.id);
      const href = meta.href ?? values[0].href;
      const detail = meta.detail(values.length);
      const receiptActionId = laneId === "retry_sample" ? `repair-batch-retry:${sampleTaskIds[0]}` : "failure-repair-batch";

      return {
        id: laneId,
        priorityLabel: meta.priorityLabel,
        label: meta.label,
        count: values.length,
        detail,
        actionLabel: meta.actionLabel,
        href,
        evidence: [...categoryEvidence, ...providerEvidence],
        sampleTaskIds,
        receiptAction: {
          id: receiptActionId,
          label: meta.receiptLabel,
          detail: `${meta.label}：${detail}`,
          href,
          message: meta.receiptMessage,
          payload: {
            source: "failure_repair_lane",
            laneId,
            sampleTaskIds,
            evidence: [...categoryEvidence, ...providerEvidence],
          },
        },
      };
    })
    .filter((lane): lane is FailureRepairLane => Boolean(lane));
}

function recoveryFor(task: FailureReviewTask, tasks: FailureReviewTask[]) {
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

  return {
    recoveryStatus: recoveredBy ? "recovered" as const : "unresolved" as const,
    recoveredByTaskId: recoveredBy?.id ?? null,
    recoveryLabel: recoveredBy ? `已由后续任务 ${recoveredBy.id} 恢复。` : "尚未看到后续成功记录。",
  };
}

function nextActions(items: FailureReviewItem[], categoryGroups: FailureGroup[], providerGroups: FailureGroup[], recoveredFailures: number) {
  if (items.length === 0) {
    if (recoveredFailures > 0) return [`${recoveredFailures} 个历史失败已恢复，继续保留恢复证据并观察后续失败率。`];
    return ["暂无失败任务，继续保持失败原因和成本记录。"];
  }
  const actions: string[] = [];
  const topCategory = categoryGroups[0];
  const topProvider = providerGroups[0];
  const apiKeyFailures = items.filter((item) => item.category === "api_key").length;
  const retryable = items.filter((item) => item.retryable).length;

  if (apiKeyFailures > 0) actions.push(`先处理 ${apiKeyFailures} 个密钥/权限失败，批量重试前必须修模型配置。`);
  if (topCategory) actions.push(`最高频失败是「${topCategory.label}」，先按建议修正：${topCategory.suggestion}`);
  if (topProvider && topProvider.count >= 2) actions.push(`重点检查「${topProvider.label}」，它贡献了 ${topProvider.count} 个失败。`);
  if (retryable > 0) actions.push(`${retryable} 个失败具备重试价值，但建议先单章重试，再恢复批量。`);
  actions.push("每次修复后只跑 1 个样本任务，确认成功后再放大到队列。");
  return actions.slice(0, 5);
}

function buildFailureReviewPmFocus(
  unresolvedFailures: FailureReviewItem[],
  recoveredFailures: number,
  repairLanes: FailureRepairLane[],
): FailureReviewPmFocus {
  const topLane = repairLanes[0];
  if (topLane) {
    const retryOnly = topLane.id === "retry_sample";

    return {
      tone: retryOnly ? "watch" : "blocked",
      resumePolicy: retryOnly ? "sample_only" : "hold_batch",
      headline: `当前先处理：${topLane.label}`,
      detail: `${topLane.detail} 修完前不恢复批量；只允许按这条泳道处理样本和复检证据。`,
      proof: `${topLane.priorityLabel} · ${topLane.count} 个未恢复失败 · ${topLane.evidence.join("、") || "等待修复证据"}`,
      actionLabel: topLane.actionLabel,
      actionHref: topLane.href,
    };
  }

  if (recoveredFailures > 0) {
    return {
      tone: "ready",
      resumePolicy: "watch_resume",
      headline: "未恢复失败已清空，恢复生产先看样本。",
      detail: `${recoveredFailures} 个历史失败已有恢复证据；恢复批量前先跑单章样本和小批量观察，不要直接放大。`,
      proof: "未恢复失败 0 个；恢复节奏仍需观察失败率、成本和质量分。",
      actionLabel: "去任务中心",
      actionHref: "/tasks",
    };
  }

  return {
    tone: "ready",
    resumePolicy: "watch_resume",
    headline: "当前没有失败阻塞，继续观察生产节奏。",
    detail: "暂无失败任务；继续保留错误原因、成本和恢复证据，后续批量生产仍按小样本放大。",
    proof: "未恢复失败 0 个；失败中心暂无待修复泳道。",
    actionLabel: "去任务中心",
    actionHref: "/tasks",
  };
}

export function buildFailureReviewCenter(tasks: FailureReviewTask[]): FailureReviewCenter {
  const failures = tasks
    .filter((task) => task.status === "failed")
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .map((task): FailureReviewItem => {
      const category = categorize(task.errorMessage);
      const projectTitle = task.project?.title ?? "未知项目";
      const chapterTitle = task.chapter?.title ?? "项目任务";
      const recovery = recoveryFor(task, tasks);

      return {
        id: task.id,
        projectId: task.projectId,
        projectTitle,
        chapterTitle,
        taskLabel: labelForTask(task.taskType),
        providerName: task.modelProvider?.displayName ?? "未知模型",
        model: task.model,
        category,
        categoryLabel: categoryLabels[category],
        retryable: recovery.recoveryStatus === "unresolved" && retryableCategories.has(category),
        recoveryStatus: recovery.recoveryStatus,
        recoveredByTaskId: recovery.recoveredByTaskId,
        recoveryLabel: recovery.recoveryLabel,
        errorMessage: compact(task.errorMessage),
        suggestion: categorySuggestions[category],
        createdAt: dateIso(task.createdAt),
        href: failureHref(task),
      };
    });
  const unresolvedFailures = failures.filter((item) => item.recoveryStatus === "unresolved");
  const recoveredFailures = failures.length - unresolvedFailures.length;
  const categoryGroups = groupBy(
    unresolvedFailures,
    (item) => item.category,
    (item) => item.categoryLabel,
    (item) => item.suggestion,
  );
  const providerGroups = groupBy(
    unresolvedFailures,
    (item) => `${item.providerName}:${item.model}`,
    (item) => `${item.providerName} · ${item.model}`,
    () => "检查该模型的密钥、限流、上下文长度和近期供应商稳定性。",
  );
  const taskTypeGroups = groupBy(
    unresolvedFailures,
    (item) => item.taskLabel,
    (item) => item.taskLabel,
    () => "复查该任务类型的提示词、输出格式约束和上下文裁剪。",
  );
  const projectGroups = groupBy(
    unresolvedFailures,
    (item) => item.projectId,
    (item) => item.projectTitle,
    () => "回到项目工作台，先单章重试失败任务，不要直接批量扩大。",
  );
  const repairLanes = buildRepairLanes(unresolvedFailures);

  return {
    summary: {
      totalFailures: failures.length,
      recoveredFailures,
      unresolvedFailures: unresolvedFailures.length,
      retryableFailures: unresolvedFailures.filter((item) => item.retryable).length,
      affectedProjects: new Set(unresolvedFailures.map((item) => item.projectId)).size,
      affectedProviders: new Set(unresolvedFailures.map((item) => `${item.providerName}:${item.model}`)).size,
      mostCommonCategory: categoryGroups[0]?.label ?? "暂无失败",
    },
    categoryGroups,
    providerGroups,
    taskTypeGroups,
    projectGroups,
    repairLanes,
    pmFocus: buildFailureReviewPmFocus(unresolvedFailures, recoveredFailures, repairLanes),
    recentFailures: failures.slice(0, 12),
    nextActions: nextActions(unresolvedFailures, categoryGroups, providerGroups, recoveredFailures),
  };
}
