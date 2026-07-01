export interface FailureReviewTask {
  id: string;
  projectId: string;
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
  errorMessage: string;
  suggestion: string;
  createdAt: string;
  href: string;
}

export interface FailureReviewCenter {
  summary: {
    totalFailures: number;
    retryableFailures: number;
    affectedProjects: number;
    affectedProviders: number;
    mostCommonCategory: string;
  };
  categoryGroups: FailureGroup[];
  providerGroups: FailureGroup[];
  taskTypeGroups: FailureGroup[];
  projectGroups: FailureGroup[];
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

function nextActions(items: FailureReviewItem[], categoryGroups: FailureGroup[], providerGroups: FailureGroup[]) {
  if (items.length === 0) return ["暂无失败任务，继续保持失败原因和成本记录。"];
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

export function buildFailureReviewCenter(tasks: FailureReviewTask[]): FailureReviewCenter {
  const failures = tasks
    .filter((task) => task.status === "failed")
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .map((task): FailureReviewItem => {
      const category = categorize(task.errorMessage);
      const projectTitle = task.project?.title ?? "未知项目";
      const chapterTitle = task.chapter?.title ?? "项目任务";

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
        retryable: retryableCategories.has(category),
        errorMessage: compact(task.errorMessage),
        suggestion: categorySuggestions[category],
        createdAt: dateIso(task.createdAt),
        href: `/projects/${task.projectId}`,
      };
    });
  const categoryGroups = groupBy(
    failures,
    (item) => item.category,
    (item) => item.categoryLabel,
    (item) => item.suggestion,
  );
  const providerGroups = groupBy(
    failures,
    (item) => `${item.providerName}:${item.model}`,
    (item) => `${item.providerName} · ${item.model}`,
    () => "检查该模型的密钥、限流、上下文长度和近期供应商稳定性。",
  );
  const taskTypeGroups = groupBy(
    failures,
    (item) => item.taskLabel,
    (item) => item.taskLabel,
    () => "复查该任务类型的提示词、输出格式约束和上下文裁剪。",
  );
  const projectGroups = groupBy(
    failures,
    (item) => item.projectId,
    (item) => item.projectTitle,
    () => "回到项目工作台，先单章重试失败任务，不要直接批量扩大。",
  );

  return {
    summary: {
      totalFailures: failures.length,
      retryableFailures: failures.filter((item) => item.retryable).length,
      affectedProjects: new Set(failures.map((item) => item.projectId)).size,
      affectedProviders: new Set(failures.map((item) => `${item.providerName}:${item.model}`)).size,
      mostCommonCategory: categoryGroups[0]?.label ?? "暂无失败",
    },
    categoryGroups,
    providerGroups,
    taskTypeGroups,
    projectGroups,
    recentFailures: failures.slice(0, 12),
    nextActions: nextActions(failures, categoryGroups, providerGroups),
  };
}
