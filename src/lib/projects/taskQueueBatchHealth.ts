import {
  buildGateBatchTacticEffectReview,
  gateActionReceiptFromAuditRecord,
  type GateActionAuditRecord,
  type GateBatchTacticEffectReview,
  type GatePlatformGrowthDispatchItem,
} from "./gateActionReceipts.ts";

export interface TaskQueueBatchRhythmDecision {
  tone: "scale" | "watch" | "repair" | "empty";
  label: string;
  detail: string;
  actionLabel: string;
  href: string;
  evidence: string[];
}

export type TaskQueueBatchHealthAudit = Pick<GateActionAuditRecord,
  "receiptId"
  | "label"
  | "detail"
  | "href"
  | "status"
  | "message"
  | "executionType"
  | "succeededCount"
  | "failedCount"
  | "payload"
  | "createdAt"
> & Partial<Pick<GateActionAuditRecord,
  "actionId"
  | "taskId"
  | "platformId"
  | "platformName"
  | "recheckStatus"
  | "recheckLabel"
  | "recheckDetail"
  | "recheckAction"
>>;

function normalizeBatchHealthAudit(audit: TaskQueueBatchHealthAudit): GateActionAuditRecord {
  return {
    receiptId: audit.receiptId,
    actionId: audit.actionId ?? `recommended-batch:${audit.receiptId}`,
    label: audit.label,
    detail: audit.detail,
    href: audit.href,
    status: audit.status,
    message: audit.message,
    executionType: audit.executionType,
    succeededCount: audit.succeededCount,
    failedCount: audit.failedCount,
    taskId: audit.taskId ?? null,
    platformId: audit.platformId ?? "",
    platformName: audit.platformName ?? "",
    recheckStatus: audit.recheckStatus ?? "ready",
    recheckLabel: audit.recheckLabel ?? "复检任务队列",
    recheckDetail: audit.recheckDetail ?? "推荐批次已执行，刷新任务队列确认后续策略。",
    recheckAction: audit.recheckAction ?? "刷新任务队列",
    payload: audit.payload,
    createdAt: audit.createdAt,
  };
}

export function buildTaskQueueBatchHealthReview(
  audits: TaskQueueBatchHealthAudit[],
  limit = 5,
): GateBatchTacticEffectReview {
  return buildGateBatchTacticEffectReview(audits.map((audit) => gateActionReceiptFromAuditRecord(normalizeBatchHealthAudit(audit))), limit);
}

export function buildTaskQueueBatchRhythmDecision(review: GateBatchTacticEffectReview): TaskQueueBatchRhythmDecision {
  const blocked = review.items.find((item) => item.status === "blocked") ?? null;
  if (blocked) {
    return {
      tone: "repair",
      label: "先修批次问题",
      detail: `${blocked.tacticLabel} 最近批次出现失败或低分，先拆失败样本、模型路线和提示词问题，不继续喂给新批次。`,
      actionLabel: "去失败修复",
      href: "/failures",
      evidence: blocked.evidence.slice(0, 2),
    };
  }

  const usable = review.items.find((item) => item.status === "usable") ?? null;
  if (usable) {
    return {
      tone: "scale",
      label: "继续普通推荐批次",
      detail: `${usable.tacticLabel} 已连续健康，可按普通推荐批次继续小步推进；仍保留批量安全阀和回执复盘。`,
      actionLabel: "执行下一批",
      href: "/tasks#recommended-batch",
      evidence: usable.evidence.slice(0, 2),
    };
  }

  const watch = review.items.find((item) => item.status === "watch") ?? null;
  if (watch) {
    return {
      tone: "watch",
      label: "继续小批观察",
      detail: `${watch.tacticLabel} 样本还薄，下一轮继续小批验证；先别扩大批量，也别沉淀成长期模板。`,
      actionLabel: "跑观察小批",
      href: "/tasks#recommended-batch",
      evidence: watch.evidence.slice(0, 2),
    };
  }

  return {
    tone: "empty",
    label: "先跑首个推荐批次",
    detail: "还没有可用的推荐批次回执，先执行一轮普通推荐批次，再用真实成功率、质量和成本决定后续节奏。",
    actionLabel: "查看推荐批次",
    href: "/tasks#recommended-batch",
    evidence: [],
  };
}

export function buildTaskQueueBatchRhythmDispatch(
  decision: TaskQueueBatchRhythmDecision,
  review: GateBatchTacticEffectReview,
  options: { createdAt?: Date | string } = {},
): GatePlatformGrowthDispatchItem | null {
  if (decision.tone !== "repair" && decision.tone !== "watch") return null;

  const createdAt = new Date(options.createdAt ?? new Date()).toISOString();
  const target = review.items.find((item) => decision.evidence.some((line) => item.evidence.includes(line)))
    ?? review.items.find((item) => decision.tone === "repair" ? item.status === "blocked" : item.status === "watch")
    ?? review.items[0]
    ?? null;
  const platformName = target?.tacticTitle.replace(/^首轮平台打法：/u, "") || "全平台";
  const platformId = platformName === "全平台" ? "batch-rhythm" : platformName.toLowerCase().replace(/[^a-z0-9]+/gu, "-") || "batch-rhythm";
  const repair = decision.tone === "repair";

  return {
    id: `batch-rhythm:${decision.tone}:${createdAt}`,
    platformId,
    platformName,
    stage: repair ? "repair_tactic" : "watch",
    state: "queued",
    priorityScore: repair ? 92 : 68,
    ownerRole: repair ? "毒舌产品经理" : "增长运营",
    title: repair ? "批次节奏跌线修复" : "批次节奏观察小批",
    detail: decision.detail,
    dueLabel: repair ? "今天" : "下一批前",
    actionLabel: repair ? "处理批次修复" : "执行观察小批",
    href: decision.href,
    acceptanceCriteria: repair
      ? [
        "拆出失败样本、低分章节和模型路线问题。",
        "给出不可继续放量的原因和修复后复检方式。",
        "修复完成后再跑一轮小批，并回填成功率、质量和成本证据。",
      ]
      : [
        "至少再跑一轮同类小批，不扩大批量。",
        "回填成功率、质量、成本，以及曝光、点击、收藏和追读证据。",
        "连续健康后再允许回普通推荐批次。",
      ],
    evidence: [
      decision.label,
      decision.detail,
      ...decision.evidence,
      ...(target?.nextAction ? [target.nextAction] : []),
    ].slice(0, 6),
    reviewLatestAt: target?.latestAt ?? createdAt,
  };
}
