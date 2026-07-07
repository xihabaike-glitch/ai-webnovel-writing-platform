"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { buildPublishEffectQueueActionReceipt } from "@/lib/projects/publishEffectQueueActionReceipts";

export interface PublishEffectQueueAction {
  platformId: string;
  execution: "generate_asset_variants" | "rewrite_first_three" | "open_target";
  actionId: string;
}

function resultMessage(
  action: PublishEffectQueueAction,
  payload: { variants?: unknown[]; results?: unknown[] } | null,
) {
  if (action.execution === "generate_asset_variants") {
    return `已生成 ${payload?.variants?.length ?? 0} 个投稿资产候选。`;
  }
  if (action.execution === "rewrite_first_three") {
    return `已重写前三章，共 ${payload?.results?.length ?? 0} 章。`;
  }
  return "已打开处理位置。";
}

function hrefWithGateReturn(href: string, gateReturnHref?: string | null) {
  if (!gateReturnHref || !href.startsWith("/") || href.startsWith("/gate")) return href;

  const hashIndex = href.indexOf("#");
  const base = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";
  if (base.includes("gateReturn=")) return href;
  const separator = base.includes("?") ? "&" : "?";

  return `${base}${separator}gateReturn=${encodeURIComponent(gateReturnHref)}${hash}`;
}

function queueActionTaskId(payload?: { task?: { id?: string }; results?: Array<{ task?: { id?: string } }> } | null) {
  const resultTask = payload?.results?.find((result) => result.task?.id)?.task;
  return payload?.task?.id ?? resultTask?.id ?? null;
}

async function recordQueueActionReceipt(input: {
  projectId: string;
  platformName: string;
  actionLabel: string;
  href: string;
  action: PublishEffectQueueAction;
  status: "succeeded" | "failed";
  payload?: { task?: { id?: string }; variants?: unknown[]; results?: Array<{ task?: { id?: string } }> } | null;
  error?: string | null;
}) {
  if (input.action.execution === "open_target") return;
  const receipt = buildPublishEffectQueueActionReceipt({
    projectId: input.projectId,
    platformId: input.action.platformId,
    platformName: input.platformName,
    execution: input.action.execution,
    actionLabel: input.actionLabel,
    href: input.href,
    status: input.status,
    taskId: queueActionTaskId(input.payload),
    variantCount: input.payload?.variants?.length ?? 0,
    rewrittenChapterCount: input.payload?.results?.length ?? 0,
    error: input.error,
  });
  await fetch("/api/gate/action-receipts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      receipt,
      payload: {
        source: "task_queue_publish_effect",
        actionId: input.action.actionId,
        platformId: input.action.platformId,
      },
    }),
  }).catch(() => null);
}

export function RunPublishEffectQueueActionButton({
  projectId,
  platformName,
  actionLabel,
  gateReturnHref,
  href,
  action,
}: {
  projectId: string;
  platformName: string;
  actionLabel: string;
  gateReturnHref?: string | null;
  href: string;
  action: PublishEffectQueueAction;
}) {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function runAction() {
    if (action.execution === "open_target") {
      router.push(hrefWithGateReturn(href, gateReturnHref));
      return;
    }

    setIsRunning(true);
    setMessage(null);
    let failureRecorded = false;
    try {
      const response = action.execution === "generate_asset_variants"
        ? await fetch(`/api/projects/${projectId}/platform-export/asset-optimize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platformId: action.platformId }),
        })
        : await fetch(`/api/projects/${projectId}/first-three-rewrite/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platformId: action.platformId, chapterOrders: [1, 2, 3], targetWords: 1600 }),
        });
      const payload = await response.json().catch(() => null) as {
        task?: { id?: string };
        variants?: unknown[];
        results?: Array<{ task?: { id?: string } }>;
        error?: string;
      } | null;
      if (!response.ok) {
        const error = payload?.error ?? "复盘动作执行失败。";
        await recordQueueActionReceipt({
          projectId,
          platformName,
          actionLabel,
          href,
          action,
          status: "failed",
          payload,
          error,
        });
        failureRecorded = true;
        throw new Error(error);
      }
      await recordQueueActionReceipt({
        projectId,
        platformName,
        actionLabel,
        href,
        action,
        status: "succeeded",
        payload,
      });
      setMessage(`${resultMessage(action, payload)} 去结果页采纳或复查。`);
      router.refresh();
    } catch (caught) {
      const error = caught instanceof Error ? caught.message : "复盘动作执行失败。";
      if (!failureRecorded) {
        await recordQueueActionReceipt({
          projectId,
          platformName,
          actionLabel,
          href,
          action,
          status: "failed",
          error,
        });
      }
      setMessage(error);
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <button
        className="w-fit rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        disabled={isRunning}
        onClick={() => void runAction()}
        type="button"
      >
        {isRunning ? "执行中" : actionLabel}
      </button>
      {message ? (
        <div className="max-w-xs text-right text-xs leading-5 text-slate-600">
          {message} <a className="font-medium text-slate-950 underline" href={hrefWithGateReturn(href, gateReturnHref)}>打开结果</a>
        </div>
      ) : null}
    </div>
  );
}
