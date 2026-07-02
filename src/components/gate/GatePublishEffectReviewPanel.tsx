"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PrePublishGateProjectStatus } from "@/lib/projects/prePublishGate";

function statusTone(status: PrePublishGateProjectStatus["effectReview"]["status"]) {
  if (status === "signed") return "bg-emerald-100 text-emerald-800";
  if (status === "promising") return "bg-emerald-50 text-emerald-700";
  if (status === "weak") return "bg-rose-50 text-rose-700";
  if (status === "watch") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

function priorityTone(priority: "high" | "medium" | "low") {
  if (priority === "high") return "bg-rose-50 text-rose-700";
  if (priority === "medium") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

function actionText(priority: "high" | "medium" | "low") {
  if (priority === "high") return "高";
  if (priority === "medium") return "中";
  return "低";
}

function numberText(value: number) {
  return value.toLocaleString("zh-CN");
}

function percentText(value: number) {
  return `${value.toFixed(1)}%`;
}

function dateText(value: Date | string | null) {
  if (!value) return "未记录";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未记录";
  return date.toLocaleDateString("zh-CN");
}

function executeText(execution: PrePublishGateProjectStatus["effectReview"]["optimizationActions"][number]["execution"]) {
  if (execution === "generate_asset_variants") return "生成方案";
  if (execution === "rewrite_first_three") return "重写前三章";
  return "打开位置";
}

export function GatePublishEffectReviewPanel({ packages }: { packages: PrePublishGateProjectStatus[] }) {
  const router = useRouter();
  const [runningActionId, setRunningActionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const totalRecords = packages.reduce((sum, item) => sum + item.effectReview.records, 0);
  const totalViews = packages.reduce((sum, item) => sum + item.effectReview.totalViews, 0);
  const totalClicks = packages.reduce((sum, item) => sum + item.effectReview.totalClicks, 0);
  const readyToScale = packages.filter((item) => item.effectReview.status === "promising" || item.effectReview.status === "signed").length;
  const needsData = packages.filter((item) => item.effectReview.status === "empty").length;
  const needsRework = packages.filter((item) => item.effectReview.status === "weak").length;
  const reviewPackages = [...packages].sort((left, right) => {
    const statusWeight = { signed: 4, promising: 3, weak: 2, watch: 1, empty: 0 };
    return statusWeight[right.effectReview.status] - statusWeight[left.effectReview.status]
      || right.effectReview.totalViews - left.effectReview.totalViews
      || right.preflightScore - left.preflightScore;
  });

  async function runEffectAction(
    item: PrePublishGateProjectStatus,
    action: PrePublishGateProjectStatus["effectReview"]["optimizationActions"][number],
  ) {
    const actionId = `${item.projectId}:${action.id}`;
    setRunningActionId(actionId);
    setMessage(null);
    try {
      if (action.execution === "generate_asset_variants") {
        const response = await fetch(`/api/projects/${item.projectId}/platform-export/asset-optimize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platformId: item.platformId }),
        });
        const payload = (await response.json().catch(() => null)) as {
          variants?: unknown[];
          error?: string;
        } | null;
        if (!response.ok || !payload?.variants) throw new Error(payload?.error ?? "生成投稿方案失败。");
        setMessage(`已按「${action.label}」生成 ${payload.variants.length} 个 ${item.platformName} 投稿方案，进入项目页可采纳。`);
        router.refresh();
        return;
      }

      if (action.execution === "rewrite_first_three") {
        const response = await fetch(`/api/projects/${item.projectId}/first-three-rewrite/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platformId: item.platformId, chapterOrders: [1, 2, 3], targetWords: 1600 }),
        });
        const payload = (await response.json().catch(() => null)) as {
          results?: unknown[];
          error?: string;
        } | null;
        if (!response.ok || !payload?.results) throw new Error(payload?.error ?? "前三章二轮重写失败。");
        setMessage(`已按「${action.label}」重写前三章，共 ${payload.results.length} 章。`);
        router.refresh();
      }
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "二轮优化执行失败。");
    } finally {
      setRunningActionId(null);
    }
  }

  return (
    <section className="mb-6 rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="font-medium text-slate-950">投放效果复盘</h2>
          <p className="mt-1 text-sm text-slate-600">
            {totalRecords ? `${totalRecords} 组真实数据，${readyToScale} 个项目可放大，${needsRework} 个项目要二轮修。` : "等待首轮平台数据回填。"}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs text-slate-600">
          <div className="rounded-md bg-slate-50 px-3 py-2">
            <div className="font-semibold text-slate-950">{numberText(totalViews)}</div>
            <div>曝光</div>
          </div>
          <div className="rounded-md bg-slate-50 px-3 py-2">
            <div className="font-semibold text-slate-950">{numberText(totalClicks)}</div>
            <div>点击</div>
          </div>
          <div className="rounded-md bg-slate-50 px-3 py-2">
            <div className="font-semibold text-slate-950">{needsData}</div>
            <div>待回填</div>
          </div>
        </div>
      </div>
      {message ? (
        <div className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div>
      ) : null}

      <div className="mt-4 grid gap-3">
        {reviewPackages.map((item) => (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3" key={`${item.projectId}:${item.platformId}:effect`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${statusTone(item.effectReview.status)}`}>
                    {item.effectReview.label}
                  </span>
                  <span className="font-medium text-slate-950">{item.projectTitle}</span>
                  <span className="text-sm text-slate-500">{item.platformName}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.effectReview.verdict}</p>
                <p className="mt-1 text-xs text-slate-500">最近记录：{dateText(item.effectReview.latestSnapshotDate)}</p>
              </div>
              <div className="grid min-w-64 grid-cols-3 gap-2 text-center text-xs text-slate-600">
                <div className="rounded-md bg-white px-2 py-2">
                  <div className="font-semibold text-slate-950">{percentText(item.effectReview.clickRatePercent)}</div>
                  <div>点击率</div>
                </div>
                <div className="rounded-md bg-white px-2 py-2">
                  <div className="font-semibold text-slate-950">{percentText(item.effectReview.favoriteRatePercent)}</div>
                  <div>收藏率</div>
                </div>
                <div className="rounded-md bg-white px-2 py-2">
                  <div className="font-semibold text-slate-950">{percentText(item.effectReview.followRatePercent)}</div>
                  <div>追读率</div>
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-950">{item.effectReview.optimizationHeadline}</div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{item.effectReview.nextAction}</p>
                </div>
                <Link className="w-fit rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50" href={`/projects/${item.projectId}#publish-effect-panel`}>
                  打开复盘
                </Link>
              </div>
              <div className="mt-3 grid gap-2">
                {item.effectReview.optimizationActions.map((action) => (
                  <div className="rounded-md bg-slate-50 p-3 text-sm" key={action.id}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-md px-2 py-1 text-xs font-medium ${priorityTone(action.priority)}`}>{actionText(action.priority)}</span>
                        <span className="font-medium text-slate-950">{action.label}</span>
                        <span className="text-xs text-slate-500">{action.target}</span>
                      </div>
                      {action.execution === "open_target" ? (
                        <Link className="w-fit rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50" href={action.href}>
                          {executeText(action.execution)}
                        </Link>
                      ) : (
                        <button
                          className="w-fit rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                          disabled={Boolean(runningActionId)}
                          onClick={() => void runEffectAction(item, action)}
                          type="button"
                        >
                          {runningActionId === `${item.projectId}:${action.id}` ? "执行中" : executeText(action.execution)}
                        </button>
                      )}
                    </div>
                    <p className="mt-1 leading-6 text-slate-600">{action.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
        {packages.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600">
            还没有项目可复盘。
          </p>
        ) : null}
      </div>
    </section>
  );
}
