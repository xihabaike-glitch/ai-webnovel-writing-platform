import type { GateActionReceipt } from "./gateActionReceipts.ts";

export type PublishEffectQueueReceiptExecution = "generate_asset_variants" | "rewrite_first_three";

function executionLabel(execution: PublishEffectQueueReceiptExecution) {
  if (execution === "generate_asset_variants") return "生成投稿候选";
  return "重写前三章";
}

function succeededCount(input: {
  execution: PublishEffectQueueReceiptExecution;
  variantCount?: number;
  rewrittenChapterCount?: number;
}) {
  if (input.execution === "generate_asset_variants") return Math.max(0, input.variantCount ?? 0);
  return Math.max(0, input.rewrittenChapterCount ?? 0);
}

export function buildPublishEffectQueueActionReceipt(input: {
  projectId: string;
  platformId: string;
  platformName: string;
  execution: PublishEffectQueueReceiptExecution;
  actionLabel: string;
  href: string;
  status: GateActionReceipt["status"];
  taskId?: string | null;
  variantCount?: number;
  rewrittenChapterCount?: number;
  error?: string | null;
  now?: Date | string;
}): GateActionReceipt {
  const createdAt = input.now ? new Date(input.now).toISOString() : new Date().toISOString();
  const label = input.actionLabel || executionLabel(input.execution);
  const count = succeededCount(input);
  const actionResult = input.execution === "generate_asset_variants"
    ? `生成 ${count} 个投稿资产候选`
    : `重写 ${count} 章前三章候选`;
  const message = input.status === "succeeded"
    ? `任务中心已为 ${input.platformName} 执行复盘动作：${actionResult}。`
    : `任务中心执行 ${input.platformName} 复盘动作失败：${input.error ?? "未知错误"}`;

  return {
    id: `platform-strategy:${input.platformId}:queue_${input.execution}:${createdAt}`,
    actionId: `platform-strategy:${input.platformId}:${input.execution}`,
    label,
    detail: `${input.platformName} · 任务中心复盘 · ${label}`,
    href: input.href,
    status: input.status,
    message,
    executionType: "platform_strategy",
    succeededCount: input.status === "succeeded" ? count : 0,
    failedCount: input.status === "failed" ? 1 : 0,
    taskId: input.taskId ?? null,
    platformId: input.platformId,
    platformName: input.platformName,
    recheck: {
      status: input.status === "succeeded" ? "ready" : "blocked",
      label: input.status === "succeeded" ? "复检发布复盘动作" : "复盘动作失败待处理",
      detail: input.status === "succeeded"
        ? "复盘动作已经从任务中心触发，刷新总闸门后确认投稿资产、前三章、平台策略和下一轮效果回收是否更新。"
        : "复盘动作没有成功落地，先处理模型、接口或素材问题，再回任务中心重试。",
      actionLabel: input.status === "succeeded" ? "刷新总闸门" : "回任务中心重试",
    },
    createdAt,
  };
}
