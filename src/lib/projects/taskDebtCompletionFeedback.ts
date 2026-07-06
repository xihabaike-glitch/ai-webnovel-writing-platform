export type TaskDebtCompletionFeedbackStatus = "cleared" | "needs_follow_up";

export interface TaskDebtCompletionFeedbackTask {
  dispatchKey: string;
  title: string;
  actionLabel?: string;
  href?: string;
}

export interface TaskDebtCompletionFeedbackInput {
  actionLabel: string;
  blockerType?: string | null;
  previousDebtCount?: number | null;
  followUpTasks?: TaskDebtCompletionFeedbackTask[];
  knowledgeFeedbackWritten?: boolean;
  dispatchCompletionReceiptLabel?: string | null;
  submissionEffectHeadline?: string | null;
}

export interface TaskDebtCompletionFeedback {
  status: TaskDebtCompletionFeedbackStatus;
  message: string;
  actionLabel: string;
  href: string;
  autoFocusHref: string;
}

export interface TaskDebtFocusChangeNoticeInput {
  label: string;
  previousDebtCount: number | null;
  currentDebtCount: number;
  resumeActionLabel?: string | null;
  resumeActionHref?: string | null;
  resumeBatch?: {
    canRun: boolean;
    actionLabel: string;
    detail: string;
    href: string;
  } | null;
}

export interface TaskDebtFocusChangeNotice {
  tone: "reduced" | "cleared" | "unchanged";
  message: string;
  actionLabel: string | null;
  actionHref: string | null;
  resumeBatchDetail: string | null;
}

export interface TaskDebtRecoveryBatchAudit {
  label: string;
  href: string;
  payload: string | null;
  createdAt: Date | string;
}

export interface TaskDebtRecoveryBatchRecord {
  headline: string;
  detail: string;
  metrics: string[];
  actionLabel: string;
  actionHref: string;
  decisionTone: "continue" | "repair" | "rollback" | "watch";
  decisionLabel: string;
  decisionDetail: string;
  decisionActionLabel: string;
  decisionActionHref: string;
}

function taskDebtAutoFocusHref(input: Pick<TaskDebtCompletionFeedbackInput, "blockerType" | "previousDebtCount">) {
  const blockerType = input.blockerType?.trim();
  const params = new URLSearchParams({ view: "blocked" });
  if (blockerType) {
    params.set("debt", blockerType);
    params.set("cleared", blockerType);
  }
  if (typeof input.previousDebtCount === "number" && Number.isFinite(input.previousDebtCount)) {
    params.set("previousDebt", String(Math.max(0, Math.round(input.previousDebtCount))));
  }
  return `/tasks?${params.toString()}#task-debt`;
}

function taskDebtRecord(value: unknown) {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function taskDebtNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function parseTaskDebtPayload(payload: string | null) {
  if (!payload) return null;
  try {
    return taskDebtRecord(JSON.parse(payload));
  } catch {
    return null;
  }
}

function taskDebtTimestamp(value: Date | string) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function buildTaskDebtRecoveryDecision(input: {
  successRate: number | null;
  failedTasks: number | null;
  averageQualityScore: number | null;
  averageCostPerSucceededTaskUsd: number | null;
  actionLabel: string;
  actionHref: string;
}): Pick<TaskDebtRecoveryBatchRecord, "decisionTone" | "decisionLabel" | "decisionDetail" | "decisionActionLabel" | "decisionActionHref"> {
  const failedTasks = input.failedTasks ?? 0;
  if (failedTasks > 0 || (input.successRate !== null && input.successRate < 80)) {
    return {
      decisionTone: "repair",
      decisionLabel: "进入失败修复",
      decisionDetail: "恢复小批出现失败，或成功率低于 80%。先修失败项，不继续放量。",
      decisionActionLabel: "查看失败修复",
      decisionActionHref: "/failures",
    };
  }

  if (input.averageQualityScore === null || input.averageQualityScore < 85) {
    return {
      decisionTone: "rollback",
      decisionLabel: "回滚观察修复",
      decisionDetail: "恢复小批质量未过 85 分，先回滚观察修复，再重新跑小批。",
      decisionActionLabel: "回滚观察修复",
      decisionActionHref: "/dispatch",
    };
  }

  if (input.averageCostPerSucceededTaskUsd !== null && input.averageCostPerSucceededTaskUsd > 0.05) {
    return {
      decisionTone: "watch",
      decisionLabel: "暂停加码看成本",
      decisionDetail: `单个成功任务平均成本 $${input.averageCostPerSucceededTaskUsd.toFixed(4)}，先观察模型消耗，不扩大批次。`,
      decisionActionLabel: "查看推荐批次",
      decisionActionHref: input.actionHref,
    };
  }

  return {
    decisionTone: "continue",
    decisionLabel: "继续小批",
    decisionDetail: "恢复小批已过线，下一批仍按安全阀小步推进。",
    decisionActionLabel: input.actionLabel,
    decisionActionHref: input.actionHref,
  };
}

function buildRecoveryBatchRecord(input: {
  audits: TaskDebtRecoveryBatchAudit[];
  predicate: (payload: Record<string, unknown>) => boolean;
  headlinePrefix: string;
}): TaskDebtRecoveryBatchRecord | null {
  const latest = input.audits
    .map((audit) => ({ audit, payload: parseTaskDebtPayload(audit.payload) }))
    .filter((item) => item.payload ? input.predicate(item.payload) : false)
    .sort((left, right) => taskDebtTimestamp(right.audit.createdAt) - taskDebtTimestamp(left.audit.createdAt))[0] ?? null;
  if (!latest) return null;

  const routeEffectSummary = taskDebtRecord(latest.payload?.routeEffectSummary);
  const batchReceipt = taskDebtRecord(latest.payload?.batchReceipt);
  const successRate = taskDebtNumber(routeEffectSummary?.successRatePercent);
  const failedTasks = taskDebtNumber(routeEffectSummary?.failedTasks);
  const knownCostUsd = taskDebtNumber(routeEffectSummary?.knownCostUsd);
  const averageQualityScore = taskDebtNumber(routeEffectSummary?.averageQualityScore);
  const averageCostPerSucceededTaskUsd = taskDebtNumber(routeEffectSummary?.averageCostPerSucceededTaskUsd);
  const headline = typeof batchReceipt?.headline === "string" && batchReceipt.headline
    ? batchReceipt.headline
    : latest.audit.label;
  const detail = typeof batchReceipt?.detail === "string" ? batchReceipt.detail : "";
  const actionLabel = typeof batchReceipt?.primaryLabel === "string" && batchReceipt.primaryLabel
    ? batchReceipt.primaryLabel
    : "查看推荐批次";
  const actionHref = typeof batchReceipt?.primaryHref === "string" && batchReceipt.primaryHref
    ? batchReceipt.primaryHref
    : latest.audit.href || "/tasks#recommended-batch";

  return {
    headline: `${input.headlinePrefix}：${headline}`,
    detail,
    metrics: [
      successRate === null ? null : `成功率 ${Math.round(successRate)}%`,
      failedTasks === null ? null : `失败 ${Math.round(failedTasks)}`,
      knownCostUsd === null ? null : `成本 $${knownCostUsd.toFixed(4)}`,
      averageQualityScore === null ? null : `质量 ${Math.round(averageQualityScore)}`,
    ].filter((metric): metric is string => Boolean(metric)),
    actionLabel,
    actionHref,
    ...buildTaskDebtRecoveryDecision({
      successRate,
      failedTasks,
      averageQualityScore,
      averageCostPerSucceededTaskUsd,
      actionLabel,
      actionHref,
    }),
  };
}

export function buildTaskDebtRecoveryBatchRecord(audits: TaskDebtRecoveryBatchAudit[]): TaskDebtRecoveryBatchRecord | null {
  return buildRecoveryBatchRecord({
    audits,
    headlinePrefix: "恢复小批已回流",
    predicate: (payload) => taskDebtRecord(payload.plan)?.scaleGate === "cleared",
  });
}

export function buildFailureRepairResumeBatchRecord(audits: TaskDebtRecoveryBatchAudit[]): TaskDebtRecoveryBatchRecord | null {
  return buildRecoveryBatchRecord({
    audits,
    headlinePrefix: "失败修复恢复小批已回流",
    predicate: (payload) => {
      const plan = taskDebtRecord(payload.plan);
      return payload.executionContext === "repair_resume" || plan?.executionContext === "repair_resume";
    },
  });
}

export function buildTaskDebtFocusChangeNotice(input: TaskDebtFocusChangeNoticeInput): TaskDebtFocusChangeNotice | null {
  if (input.previousDebtCount === null || !Number.isFinite(input.previousDebtCount)) return null;
  const previous = Math.max(0, Math.round(input.previousDebtCount));
  const current = Math.max(0, Math.round(input.currentDebtCount));
  const delta = previous - current;

  if (current === 0 && previous > 0) {
    const safeResumeBatch = input.resumeBatch?.canRun ? input.resumeBatch : null;
    return {
      tone: "cleared",
      message: `刚回写${input.label}清债证据：提交前 ${previous} 个，现在已经清空。可以恢复后续生产。`,
      actionLabel: safeResumeBatch ? `执行恢复小批：${safeResumeBatch.actionLabel}` : input.resumeActionLabel ?? null,
      actionHref: safeResumeBatch?.href ?? input.resumeActionHref ?? null,
      resumeBatchDetail: safeResumeBatch?.detail ?? null,
    };
  }

  if (delta > 0) {
    return {
      tone: "reduced",
      message: `刚回写${input.label}清债证据：提交前 ${previous} 个，现在 ${current} 个，已减少 ${delta} 个。继续处理剩余阻塞。`,
      actionLabel: null,
      actionHref: null,
      resumeBatchDetail: null,
    };
  }

  return {
    tone: "unchanged",
    message: `刚回写${input.label}清债证据：提交前 ${previous} 个，现在仍是 ${current} 个。证据可能生成了后续动作，或仍缺验收项。`,
    actionLabel: null,
    actionHref: null,
    resumeBatchDetail: null,
  };
}

export function buildTaskDebtCompletionFeedback(input: TaskDebtCompletionFeedbackInput): TaskDebtCompletionFeedback {
  const followUps = input.followUpTasks ?? [];
  const firstDayFollowUp = followUps.find((task) => task.dispatchKey.startsWith("first-day:")) ?? null;
  const autoFocusHref = taskDebtAutoFocusHref(input);

  if (firstDayFollowUp) {
    return {
      status: "needs_follow_up",
      message: `${input.actionLabel}已回写，但清债还没结束：下一张首日卡是「${firstDayFollowUp.title}」。先处理它，再回任务队列复查阻塞是否下降。`,
      actionLabel: firstDayFollowUp.actionLabel || "继续处理",
      href: firstDayFollowUp.href || "/dispatch#first-day-dispatch",
      autoFocusHref,
    };
  }

  if (followUps.length > 0) {
    const titleList = followUps.map((task) => `「${task.title}」`).join("、");
    return {
      status: "needs_follow_up",
      message: `${input.actionLabel}已回写，并生成 ${followUps.length} 个后续动作：${titleList}。先处理后续动作，再回任务队列复查阻塞是否下降。`,
      actionLabel: followUps[0].actionLabel || "处理后续动作",
      href: followUps[0].href || "/gate",
      autoFocusHref,
    };
  }

  const receiptText = input.submissionEffectHeadline
    ? `，已回写投稿效果：${input.submissionEffectHeadline}`
    : input.dispatchCompletionReceiptLabel
      ? `，已生成业务回执：${input.dispatchCompletionReceiptLabel}`
      : input.knowledgeFeedbackWritten
        ? "，已回灌到平台知识反馈"
        : "";

  return {
    status: "cleared",
    message: `${input.actionLabel}已回写${receiptText}。刷新后回到阻塞清债页确认该类型数量下降。`,
    actionLabel: "复查阻塞清债",
    href: autoFocusHref,
    autoFocusHref,
  };
}
