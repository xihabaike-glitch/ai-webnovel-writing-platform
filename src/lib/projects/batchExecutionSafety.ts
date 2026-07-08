import type { QueueItem } from "./taskQueueCenter.ts";
import { defaultBatchExecutionStrategy, type BatchExecutionStrategy } from "./batchExecutionStrategy.ts";
import { buildTaskArchiveExperienceReceipt } from "../ai/archiveExperienceReceipt.ts";

export interface SafetyTaskProject {
  aiTasks: Array<{
    id?: string | null;
    projectId?: string | null;
    chapterId?: string | null;
    taskType?: string | null;
    status: string;
    inputSnapshot?: string | null;
    createdAt?: Date | string | null;
    inputTokens: number | null;
    outputTokens: number | null;
    costUsd: number | null;
  }>;
}

export interface ExecutionSafetyItem {
  id: string;
  label: string;
  status: "pass" | "warn" | "block";
  detail: string;
  actionLabel?: string;
  actionHref?: string;
}

export interface BatchExecutionSafety {
  strategy: BatchExecutionStrategy;
  recommendedBatchIds: string[];
  recommendedBatchSize: number;
  estimatedTokens: number;
  estimatedCostUsd: number;
  maxBatchSize: number;
  canRunRecommendedBatch: boolean;
  items: ExecutionSafetyItem[];
  warnings: string[];
}

export interface BatchSafetyPriorityBlocker {
  id: string;
  title: string;
  detail: string;
  status: ExecutionSafetyItem["status"];
  actionLabel: string;
  actionHref: string;
}

export interface FailureRepairResumeRecommendation {
  status: "ready" | "blocked" | "empty";
  label: string;
  detail: string;
  actionLabel: string;
  href: string;
  batchSize: number;
  taskLabels: string[];
}

const estimatedTokensByCategory: Record<QueueItem["category"], number> = {
  candidate: 0,
  handoff: 0,
  draft: 3200,
  review: 1800,
  second_pass: 4200,
  effect: 0,
  export: 0,
  blocked: 0,
};

function money(value: number) {
  return Math.round(value * 1000000) / 1000000;
}

function safetyItem(
  id: string,
  label: string,
  status: ExecutionSafetyItem["status"],
  detail: string,
  action?: Pick<ExecutionSafetyItem, "actionLabel" | "actionHref">,
): ExecutionSafetyItem {
  return { id, label, status, detail, ...action };
}

function historicalCostPerToken(projects: SafetyTaskProject[]) {
  const succeeded = projects.flatMap((project) => project.aiTasks)
    .filter((task) => task.status === "succeeded" && task.costUsd !== null);
  const totalTokens = succeeded.reduce((sum, task) => sum + (task.inputTokens ?? 0) + (task.outputTokens ?? 0), 0);
  const totalCost = succeeded.reduce((sum, task) => sum + (task.costUsd ?? 0), 0);

  if (totalTokens <= 0 || totalCost <= 0) return 0;
  return totalCost / totalTokens;
}

function categoryMix(batch: QueueItem[]) {
  return new Set(batch.map((item) => item.category));
}

function projectMix(batch: QueueItem[]) {
  return new Set(batch.map((item) => item.projectId));
}

function isRunnableBatchItem(item: QueueItem) {
  return item.category === "draft" || item.category === "review" || item.category === "second_pass";
}

function isOpenAiPipelineRecoveryFollowup(item: QueueItem) {
  return item.sourceType === "tactic_experience_followup"
    && (
      item.sourceLabel === "AI 写审改恢复"
      || item.platformName === "AI 写审改"
      || item.sourceDispatchKey?.startsWith("ai-pipeline:") === true
    );
}

const priorityBlockerOrder = [
  "ai-pipeline-recovery",
  "archive-experience",
  "first-day-gate",
  "risk-recovery",
  "role-closure",
  "publish-repair",
  "export-version",
  "pending-candidates",
  "running-tasks",
  "failure-rate",
  "watch-scale-gate",
  "blocked-items",
  "budget",
  "mixed-actions",
  "mixed-projects",
  "batch-size",
] as const;

export function buildBatchSafetyPriorityBlocker(safety: Pick<BatchExecutionSafety, "items">): BatchSafetyPriorityBlocker | null {
  const actionable = safety.items.filter((item) => item.status !== "pass");
  const item = actionable.sort((left, right) => {
    const leftIndex = priorityBlockerOrder.indexOf(left.id as (typeof priorityBlockerOrder)[number]);
    const rightIndex = priorityBlockerOrder.indexOf(right.id as (typeof priorityBlockerOrder)[number]);
    return (leftIndex === -1 ? 99 : leftIndex) - (rightIndex === -1 ? 99 : rightIndex);
  })[0] ?? null;
  if (!item) return null;

  return {
    id: item.id,
    title: `先处理 ${item.label}`,
    detail: item.detail,
    status: item.status,
    actionLabel: item.actionLabel ?? "查看安全阀",
    actionHref: item.actionHref ?? "/tasks#recommended-batch",
  };
}

function resumeTaskLabel(item: QueueItem) {
  return `${item.projectTitle} · ${item.chapterTitle} · ${item.actionLabel}`;
}

function isOpenRoleClosure(item: QueueItem) {
  return item.blockerType === "role_closure" || item.sourceType === "role_closure";
}

function isOpenFirstDayGate(item: QueueItem) {
  return item.blockerType === "first_day_gate";
}

function isOpenRiskRecovery(item: QueueItem) {
  return item.blockerType === "risk_recovery";
}

function isOpenPublishRepair(item: QueueItem) {
  return item.blockerType === "publish_repair";
}

function isOpenExportVersion(item: QueueItem) {
  return item.blockerType === "export_version";
}

function missingArchiveExperienceReceipts(projects: SafetyTaskProject[]) {
  const latestByScope = new Map<string, SafetyTaskProject["aiTasks"][number]>();
  projects.forEach((project, projectIndex) => {
    project.aiTasks.forEach((task, taskIndex) => {
      if (!task.taskType) return false;
      const receipt = buildTaskArchiveExperienceReceipt({
        taskType: task.taskType,
        inputSnapshot: task.inputSnapshot ?? "",
      });
      if (receipt.status === "not_applicable") return false;
      const key = `${projectIndex}:${task.projectId ?? "project"}:${task.chapterId ?? "project-task"}:${task.taskType}`;
      const current = latestByScope.get(key);
      const taskTime = task.createdAt ? new Date(task.createdAt).getTime() : Number.MAX_SAFE_INTEGER - taskIndex;
      const currentTime = current?.createdAt ? new Date(current.createdAt).getTime() : Number.NEGATIVE_INFINITY;
      if (!current || taskTime >= currentTime) latestByScope.set(key, task);
      return true;
    });
  });

  return [...latestByScope.values()].filter((task) => {
    const receipt = buildTaskArchiveExperienceReceipt({
      taskType: task.taskType ?? "",
      inputSnapshot: task.inputSnapshot ?? "",
    });
    return receipt.status === "missing";
  });
}

export function buildFailureRepairResumeRecommendation(input: {
  resolved: boolean;
  safety: BatchExecutionSafety;
  queueItems: QueueItem[];
  resumeStabilityTone?: "ready" | "watch" | "blocked" | null;
}): FailureRepairResumeRecommendation | null {
  if (!input.resolved) return null;

  const queueItemsById = new Map(input.queueItems.map((item) => [item.id, item]));
  const batchItems = input.safety.recommendedBatchIds
    .map((id) => queueItemsById.get(id))
    .filter((item): item is QueueItem => Boolean(item));
  const taskLabels = batchItems.slice(0, 3).map(resumeTaskLabel);

  if (!input.safety.canRunRecommendedBatch) {
    const blocker = buildBatchSafetyPriorityBlocker(input.safety);
    return {
      status: "blocked",
      label: "恢复前仍有安全阀拦截",
      detail: blocker?.detail ?? "失败修复已复检，但推荐批次仍未通过安全阀；先处理阻塞项，再恢复生产。",
      actionLabel: blocker?.actionLabel ?? "查看安全阀",
      href: blocker?.actionHref ?? "/tasks#recommended-batch",
      batchSize: batchItems.length,
      taskLabels,
    };
  }

  if (batchItems.length === 0) {
    return {
      status: "empty",
      label: "暂无可恢复小批",
      detail: "失败修复已复检，但当前没有可执行的初稿、审稿或二改任务；先补章节卡或进入项目工作台。",
      actionLabel: "去任务中心",
      href: "/tasks",
      batchSize: 0,
      taskLabels: [],
    };
  }

  if (input.resumeStabilityTone === "ready") {
    return {
      status: "ready",
      label: "回普通推荐批次",
      detail: `恢复小批已连续稳定，可以回到普通推荐批次继续 ${batchItems.length} 个任务：${taskLabels.join("；")}。`,
      actionLabel: "执行普通推荐批次",
      href: "/tasks#recommended-batch",
      batchSize: batchItems.length,
      taskLabels,
    };
  }

  return {
    status: "ready",
    label: "恢复安全小批",
    detail: `失败修复已复检，可以恢复 ${batchItems.length} 个任务的小批量生产：${taskLabels.join("；")}。`,
    actionLabel: "执行恢复小批",
    href: "/tasks?batchContext=repair_resume#recommended-batch",
    batchSize: batchItems.length,
    taskLabels,
  };
}

export function buildBatchExecutionSafety(
  queueItems: QueueItem[],
  projects: SafetyTaskProject[],
  strategy: BatchExecutionStrategy = defaultBatchExecutionStrategy,
): BatchExecutionSafety {
  const runnable = queueItems.filter(isRunnableBatchItem);
  const firstRunnable = runnable[0] ?? null;
  const recommended = firstRunnable?.scaleGate === "sample_only"
    ? [firstRunnable]
    : runnable.slice(0, strategy.maxBatchSize);
  const blockedCount = queueItems.filter((item) => item.category === "blocked").length;
  const firstDayGateItems = queueItems.filter(isOpenFirstDayGate);
  const firstDayGateCount = firstDayGateItems.length;
  const riskRecoveryItems = queueItems.filter(isOpenRiskRecovery);
  const riskRecoveryCount = riskRecoveryItems.length;
  const roleClosureItems = queueItems.filter(isOpenRoleClosure);
  const roleClosureCount = roleClosureItems.length;
  const publishRepairItems = queueItems.filter(isOpenPublishRepair);
  const publishRepairCount = publishRepairItems.length;
  const exportVersionItems = queueItems.filter(isOpenExportVersion);
  const exportVersionCount = exportVersionItems.length;
  const missingArchiveExperienceCount = missingArchiveExperienceReceipts(projects).length;
  const candidateCount = queueItems.filter((item) => item.category === "candidate").length;
  const firstCandidate = queueItems.find((item) => item.category === "candidate") ?? null;
  const aiPipelineRecoveryFollowupCount = queueItems.filter(isOpenAiPipelineRecoveryFollowup).length;
  const sampleOnlyCount = queueItems.filter((item) => item.scaleGate === "sample_only" && isRunnableBatchItem(item)).length;
  const clearedWatchCount = queueItems.filter((item) => item.scaleGate === "cleared" && isRunnableBatchItem(item)).length;
  const estimatedTokens = recommended.reduce((sum, item) => sum + estimatedTokensByCategory[item.category], 0);
  const costPerToken = historicalCostPerToken(projects);
  const estimatedCostUsd = money(estimatedTokens * costPerToken);
  const categoryCount = categoryMix(recommended).size;
  const projectCount = projectMix(recommended).size;
  const runningTasks = projects.flatMap((project) => project.aiTasks)
    .filter((task) => task.status === "queued" || task.status === "running").length;
  const failedTasks = projects.flatMap((project) => project.aiTasks)
    .filter((task) => task.status === "failed").length;
  const totalTasks = projects.flatMap((project) => project.aiTasks).length;
  const failureRate = totalTasks > 0 ? Math.round((failedTasks / totalTasks) * 100) : 0;
  const items = [
    safetyItem(
      "batch-size",
      "批量数量",
      recommended.length === 0 ? "block" : recommended.length <= strategy.maxBatchSize ? "pass" : "block",
      recommended.length === 0
        ? "没有可执行任务，先补章节卡或进入项目工作台。"
        : `建议本批执行 ${recommended.length} 个任务，${strategy.label}档上限 ${strategy.maxBatchSize} 个。`,
    ),
    safetyItem(
      "pending-candidates",
      "候选稿确认",
      candidateCount === 0 ? "pass" : "block",
      candidateCount === 0
        ? "当前没有待采纳 AI 候选稿。"
        : `${candidateCount} 个 AI 候选稿还没由作者确认；先处理候选，再继续批量生产。`,
      candidateCount === 0 ? undefined : {
        actionLabel: firstCandidate?.actionLabel ?? "处理候选稿",
        actionHref: firstCandidate?.href ?? "/tasks",
      },
    ),
    safetyItem(
      "ai-pipeline-recovery",
      "AI 写审改恢复",
      aiPipelineRecoveryFollowupCount === 0 ? "pass" : "block",
      aiPipelineRecoveryFollowupCount === 0
        ? "当前没有待处理的 AI 写审改恢复派单。"
        : `${aiPipelineRecoveryFollowupCount} 个 AI 写审改恢复派单未闭环；先回恢复闸门跑小样本或回滚修复，不回推荐批量。`,
      aiPipelineRecoveryFollowupCount === 0 ? undefined : {
        actionLabel: "回恢复闸门",
        actionHref: "/gate#ai-pipeline-recovery",
      },
    ),
    safetyItem(
      "archive-experience",
      "归档经验回执",
      missingArchiveExperienceCount === 0 ? "pass" : "block",
      missingArchiveExperienceCount === 0
        ? "写稿、审稿、二改任务均未发现缺归档经验回执。"
        : `${missingArchiveExperienceCount} 个写审改任务缺归档经验回执；先回任务运行台核对「最终交付归档强制执行」，不进入推荐批量。`,
      missingArchiveExperienceCount === 0 ? undefined : {
        actionLabel: "回任务运行台",
        actionHref: "/tasks?focus=archive-experience#task-run-console",
      },
    ),
    safetyItem(
      "first-day-gate",
      "首日闸门",
      firstDayGateCount === 0 ? "pass" : "block",
      firstDayGateCount === 0
        ? "首日样本、交接证据和平台预检没有未清债务。"
        : `${firstDayGateCount} 个首日闸门债务未清：${firstDayGateItems.slice(0, 3).map((item) => item.chapterTitle).join("、")}；先补首日样本、交接证据或平台预检，不进入推荐批量。`,
      firstDayGateCount === 0 ? undefined : {
        actionLabel: "补首日链路",
        actionHref: "/tasks?view=blocked&debt=first_day_gate#task-debt",
      },
    ),
    safetyItem(
      "risk-recovery",
      "开书止损",
      riskRecoveryCount === 0 ? "pass" : "block",
      riskRecoveryCount === 0
        ? "当前没有未验收的止损恢复债务。"
        : `${riskRecoveryCount} 个开书止损恢复未验收：${riskRecoveryItems.slice(0, 3).map((item) => item.chapterTitle).join("、")}；先写清止损原因、恢复条件和不再放大的边界，不进入推荐批量。`,
      riskRecoveryCount === 0 ? undefined : {
        actionLabel: "做恢复验证",
        actionHref: "/tasks?view=blocked&debt=risk_recovery#task-debt",
      },
    ),
    safetyItem(
      "role-closure",
      "角色闭环",
      roleClosureCount === 0 ? "pass" : "block",
      roleClosureCount === 0
        ? "结构、资料和平台包装角色闭环没有未验收派单。"
        : `${roleClosureCount} 个角色闭环派单未验收：${roleClosureItems.slice(0, 3).map((item) => item.sourceLabel ?? item.chapterTitle).join("、")}；先补结构、资料或平台包装证据，不进入推荐批量。`,
      roleClosureCount === 0 ? undefined : {
        actionLabel: "补角色验收",
        actionHref: "/tasks?view=blocked&debt=role_closure#task-debt",
      },
    ),
    safetyItem(
      "publish-repair",
      "发布质检",
      publishRepairCount === 0 ? "pass" : "block",
      publishRepairCount === 0
        ? "当前没有未修复的平台发布包质检债务。"
        : `${publishRepairCount} 个发布质检债务未清：${publishRepairItems.slice(0, 3).map((item) => item.chapterTitle).join("、")}；先补样章、平台卖点、标签或反馈复盘，不进入推荐批量。`,
      publishRepairCount === 0 ? undefined : {
        actionLabel: "先修发布质检",
        actionHref: "/tasks?view=blocked&debt=publish_repair#task-debt",
      },
    ),
    safetyItem(
      "export-version",
      "导出版本",
      exportVersionCount === 0 ? "pass" : "block",
      exportVersionCount === 0
        ? "当前没有未处理的导出版本回退风险。"
        : `${exportVersionCount} 个导出版本回退风险未清：${exportVersionItems.slice(0, 3).map((item) => item.chapterTitle).join("、")}；先重导、锁定或恢复可信基线，不进入推荐批量。`,
      exportVersionCount === 0 ? undefined : {
        actionLabel: "修导出版本",
        actionHref: "/tasks?view=blocked&debt=export_version#task-debt",
      },
    ),
    safetyItem(
      "blocked-items",
      "阻塞任务",
      blockedCount === 0 ? "pass" : "warn",
      blockedCount === 0 ? "本批没有阻塞项。" : `${blockedCount} 个任务卡住；不拦本批，但别把阻塞债滚到下一轮。`,
      blockedCount === 0 ? undefined : {
        actionLabel: "查看阻塞任务",
        actionHref: "/tasks?view=blocked#task-debt",
      },
    ),
    safetyItem(
      "watch-scale-gate",
      "观察放量闸门",
      sampleOnlyCount === 0 ? "pass" : "warn",
      sampleOnlyCount === 0
        ? clearedWatchCount > 0
          ? `${clearedWatchCount} 个观察任务已通过小样本验收，可以谨慎进入批次。`
          : "当前没有观察期小样本闸门。"
        : `当前只允许单章小样本，本批不会扩大；完成依据需写清通过线、不可接受项、复查证据和放量结论。`,
    ),
    safetyItem(
      "mixed-actions",
      "动作混跑",
      categoryCount <= 1 ? "pass" : "warn",
      categoryCount <= 1 ? "本批任务类型一致。" : `本批包含 ${categoryCount} 类动作，建议按审稿、二改、初稿、导出分批跑。`,
    ),
    safetyItem(
      "mixed-projects",
      "项目混跑",
      projectCount <= 1 || strategy.allowCrossProject ? "pass" : "warn",
      projectCount <= 1
        ? "本批只涉及 1 个项目。"
        : strategy.allowCrossProject
          ? `${strategy.label}档允许同类任务跨项目补齐批次，本批跨 ${projectCount} 个项目。`
          : `本批跨 ${projectCount} 个项目，当前档位建议保持单项目上下文。`,
    ),
    safetyItem(
      "running-tasks",
      "并发占用",
      runningTasks === 0 ? "pass" : runningTasks <= strategy.runningWarnThreshold ? "warn" : runningTasks < strategy.runningBlockThreshold ? "warn" : "block",
      runningTasks === 0 ? "当前没有排队或运行中的 AI 任务。" : `当前已有 ${runningTasks} 个任务排队或运行。`,
      runningTasks === 0 ? undefined : {
        actionLabel: "看任务运行台",
        actionHref: "/tasks#task-run-console",
      },
    ),
    safetyItem(
      "failure-rate",
      "失败率",
      failureRate < strategy.failureWarnPercent ? "pass" : failureRate < strategy.failureBlockPercent ? "warn" : "block",
      totalTasks === 0 ? "还没有历史任务样本。" : `历史 AI 失败率 ${failureRate}%。`,
      failureRate < strategy.failureWarnPercent ? undefined : {
        actionLabel: "去失败复盘",
        actionHref: "/failures",
      },
    ),
    safetyItem(
      "budget",
      "预算估算",
      estimatedTokens <= strategy.maxEstimatedTokens ? "pass" : "warn",
      costPerToken > 0
        ? `预计约 ${estimatedTokens} Token，${strategy.label}档阈值 ${strategy.maxEstimatedTokens}，参考历史成本约 $${estimatedCostUsd.toFixed(4)}。`
        : `预计约 ${estimatedTokens} Token，${strategy.label}档阈值 ${strategy.maxEstimatedTokens}；暂无真实成本样本，只能先按 Token 控量。`,
    ),
  ];
  const warnings = items
    .filter((item) => item.status !== "pass")
    .map((item) => `${item.label}：${item.detail}`);

  return {
    strategy,
    recommendedBatchIds: recommended.map((item) => item.id),
    recommendedBatchSize: recommended.length,
    estimatedTokens,
    estimatedCostUsd,
    maxBatchSize: strategy.maxBatchSize,
    canRunRecommendedBatch: recommended.length > 0 && items.every((item) => item.status !== "block"),
    items,
    warnings: warnings.length ? warnings : ["建议批次暂无明显执行风险。"],
  };
}
