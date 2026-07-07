"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  addGateActionReceipt,
  buildGatePlatformStrategyReceipt,
  type GateActionReceipt,
  type GatePlatformStrategyReceiptPayload,
} from "@/lib/projects/gateActionReceipts";
import type { PrePublishGateStrategyPlatform, PrePublishGateStrategyReview } from "@/lib/projects/prePublishGate";

function recommendationTone(recommendation: PrePublishGateStrategyPlatform["recommendation"]) {
  if (recommendation === "scale") return "bg-emerald-50 text-emerald-700";
  if (recommendation === "repair") return "bg-rose-50 text-rose-700";
  if (recommendation === "collect_data") return "bg-blue-50 text-blue-700";
  if (recommendation === "prepare_asset") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

function scoreTone(score: number) {
  if (score >= 82) return "text-emerald-700";
  if (score >= 68) return "text-blue-700";
  if (score >= 52) return "text-amber-700";
  return "text-rose-700";
}

function receiptTone(status: GateActionReceipt["status"]) {
  if (status === "succeeded") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  return "border-rose-200 bg-rose-50 text-rose-800";
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

export function GatePlatformStrategyReviewPanel({ review, gateReturnHref }: { review: PrePublishGateStrategyReview; gateReturnHref?: string | null }) {
  const router = useRouter();
  const [runningId, setRunningId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<GateActionReceipt | null>(null);

  function recordReceipt(nextReceipt: GateActionReceipt) {
    setReceipt(nextReceipt);
    addGateActionReceipt(nextReceipt);
  }

  async function runStrategyAction(item: PrePublishGateStrategyPlatform) {
    if (!item.targetProjectId) return;
    const runId = `${item.targetProjectId}:${item.platformId}:${item.actionType}`;
    setRunningId(runId);
    setReceipt(null);

    try {
      if (item.actionType === "open_target") {
        recordReceipt(buildGatePlatformStrategyReceipt({ item, status: "succeeded" }));
        router.push(hrefWithGateReturn(item.href, gateReturnHref));
        return;
      }

      const response = await fetch(
        item.actionType === "generate_asset_variants"
          ? `/api/projects/${item.targetProjectId}/platform-export/asset-optimize`
          : item.actionType === "rewrite_first_three"
            ? `/api/projects/${item.targetProjectId}/first-three-rewrite/generate`
            : `/api/projects/${item.targetProjectId}/platform-export`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            item.actionType === "generate_asset_variants"
              ? { platformId: item.platformId }
              : item.actionType === "rewrite_first_three"
                ? { platformId: item.platformId, chapterOrders: [1, 2, 3], targetWords: 1600 }
                : { action: "snapshot", platformId: item.platformId },
          ),
        },
      );
      const payload = (await response.json().catch(() => null)) as GatePlatformStrategyReceiptPayload | null;
      if (!response.ok) throw new Error(payload?.error ?? "策略动作执行失败。");
      recordReceipt(buildGatePlatformStrategyReceipt({
        item,
        payload: payload ?? {},
        status: "succeeded",
      }));
      router.refresh();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "策略动作执行失败。";
      recordReceipt(buildGatePlatformStrategyReceipt({
        item,
        payload: { error: message },
        status: "failed",
        fallbackError: message,
      }));
    } finally {
      setRunningId(null);
    }
  }

  function buttonText(item: PrePublishGateStrategyPlatform) {
    const runId = `${item.targetProjectId}:${item.platformId}:${item.actionType}`;
    if (runningId === runId) return "执行中";
    return item.actionLabel;
  }

  return (
    <section className="mb-6 rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="font-medium text-slate-950">平台策略复盘</h2>
          <p className="mt-1 text-sm text-slate-600">{review.verdict}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs text-slate-600 sm:grid-cols-5">
          <div className="rounded-md bg-emerald-50 px-3 py-2 text-emerald-700">
            <div className="font-semibold">{review.totals.scale}</div>
            <div>主推</div>
          </div>
          <div className="rounded-md bg-rose-50 px-3 py-2 text-rose-700">
            <div className="font-semibold">{review.totals.repair}</div>
            <div>修复</div>
          </div>
          <div className="rounded-md bg-blue-50 px-3 py-2 text-blue-700">
            <div className="font-semibold">{review.totals.collectData}</div>
            <div>补证据</div>
          </div>
          <div className="rounded-md bg-amber-50 px-3 py-2 text-amber-700">
            <div className="font-semibold">{review.totals.prepareAsset}</div>
            <div>补资产</div>
          </div>
          <div className="rounded-md bg-slate-50 px-3 py-2 text-slate-600">
            <div className="font-semibold">{review.totals.pause}</div>
            <div>暂缓</div>
          </div>
        </div>
      </div>

      {receipt ? (
        <div className={`mt-3 rounded-md border p-3 text-sm ${receiptTone(receipt.status)}`}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="font-medium">{receipt.status === "succeeded" ? "策略动作已执行" : "策略动作失败"} · {receipt.label}</div>
              <p className="mt-1 leading-6 opacity-85">{receipt.message}</p>
              <div className="mt-2 rounded-md bg-white/70 px-3 py-2">
                <div className="text-xs font-medium opacity-80">下一步：{receipt.recheck.label}</div>
                <p className="mt-1 text-xs leading-5 opacity-75">{receipt.recheck.detail}</p>
              </div>
              <p className="mt-1 text-xs opacity-70">{new Date(receipt.createdAt).toLocaleString()}</p>
            </div>
            <Link className="w-fit rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-950" href={hrefWithGateReturn(receipt.href, gateReturnHref)}>
              {receipt.recheck.actionLabel}
            </Link>
          </div>
        </div>
      ) : null}

      {review.primary ? (
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-md px-2 py-1 text-xs font-medium ${recommendationTone(review.primary.recommendation)}`}>
                  {review.primary.label}
                </span>
                <span className="font-medium text-slate-950">{review.primary.platformName}</span>
                <span className={`text-sm font-semibold ${scoreTone(review.primary.score)}`}>{review.primary.score} 分</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{review.primary.nextAction}</p>
            </div>
            <button
              className="w-fit rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
              disabled={Boolean(runningId) || !review.primary.targetProjectId}
              onClick={() => void runStrategyAction(review.primary!)}
              type="button"
            >
              {buttonText(review.primary)}
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {review.platforms.map((item) => (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3" key={item.platformId}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${recommendationTone(item.recommendation)}`}>
                    {item.label}
                  </span>
                  <span className="font-medium text-slate-950">{item.platformName}</span>
                  <span className={`text-sm font-semibold ${scoreTone(item.score)}`}>{item.score}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.nextAction}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="w-fit rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                  disabled={Boolean(runningId) || !item.targetProjectId}
                  onClick={() => void runStrategyAction(item)}
                  type="button"
                >
                  {buttonText(item)}
                </button>
                <Link className="w-fit rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50" href={hrefWithGateReturn(item.href, gateReturnHref)}>
                  打开位置
                </Link>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-slate-600">
              <div className="rounded-md bg-white px-2 py-2">
                <div className="font-semibold text-slate-950">{item.projectCount}</div>
                <div>项目</div>
              </div>
              <div className="rounded-md bg-white px-2 py-2">
                <div className="font-semibold text-slate-950">{item.readyPackages}</div>
                <div>可发</div>
              </div>
              <div className="rounded-md bg-white px-2 py-2">
                <div className="font-semibold text-slate-950">{item.weakPackages}</div>
                <div>弱项</div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.projects.map((project) => (
                <Link className="rounded-md bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-100" href={hrefWithGateReturn(project.href, gateReturnHref)} key={project.projectId}>
                  {project.projectTitle} · {project.effectLabel} · {project.loopLabel}
                </Link>
              ))}
            </div>
          </div>
        ))}
        {review.platforms.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600">
            还没有平台可复盘。
          </p>
        ) : null}
      </div>
    </section>
  );
}
