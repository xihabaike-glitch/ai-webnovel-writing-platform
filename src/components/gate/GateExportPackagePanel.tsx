"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  addGateActionReceipt,
  buildGateExportVersionActionReceipt,
  buildGatePublishEffectReceipt,
  type GatePublishEffectReceiptMetric,
} from "@/lib/projects/gateActionReceipts";
import type { PrePublishGateProjectStatus } from "@/lib/projects/prePublishGate";

interface EffectDraft {
  views: string;
  clicks: string;
  favorites: string;
  follows: string;
  comments: string;
  paidReads: string;
  contractStatus: string;
  publishUrl: string;
  editorFeedback: string;
  note: string;
}

const emptyEffectDraft: EffectDraft = {
  views: "",
  clicks: "",
  favorites: "",
  follows: "",
  comments: "",
  paidReads: "",
  contractStatus: "unknown",
  publishUrl: "",
  editorFeedback: "",
  note: "",
};

function packageKey(item: PrePublishGateProjectStatus) {
  return `${item.projectId}:${item.platformId}`;
}

function packageTone(status: PrePublishGateProjectStatus["status"]) {
  if (status === "ready") return "bg-emerald-50 text-emerald-700";
  if (status === "empty") return "bg-slate-100 text-slate-700";
  return "bg-rose-50 text-rose-700";
}

function loopTone(status: PrePublishGateProjectStatus["loopTimeline"]["status"]) {
  if (status === "needs_effect") return "border-blue-200 bg-blue-50 text-blue-900";
  if (status === "needs_iteration") return "border-rose-200 bg-rose-50 text-rose-900";
  if (status === "scaling") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  return "border-amber-200 bg-amber-50 text-amber-900";
}

function exportVersionTone(status: PrePublishGateProjectStatus["exportVersionGate"]["status"]) {
  if (status === "pass") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "warn") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-rose-200 bg-rose-50 text-rose-800";
}

function exportVersionActionTone(priority: PrePublishGateProjectStatus["exportVersionGate"]["repairActions"][number]["priority"]) {
  if (priority === "primary") return "border-slate-950 bg-slate-950 text-white";
  if (priority === "danger") return "border-rose-200 bg-white text-rose-700";
  return "border-slate-200 bg-white text-slate-700";
}

function hrefWithGateReturn(href: string, gateReturnHref?: string | null) {
  if (!gateReturnHref || !href.startsWith("/") || href.startsWith("/gate")) return href;

  const hashIndex = href.indexOf("#");
  const base = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";
  const separator = base.includes("?") ? "&" : "?";

  return `${base}${separator}gateReturn=${encodeURIComponent(gateReturnHref)}${hash}`;
}

export function GateExportPackagePanel({ packages, gateReturnHref }: { packages: PrePublishGateProjectStatus[]; gateReturnHref?: string | null }) {
  const router = useRouter();
  const [runningId, setRunningId] = useState<string | null>(null);
  const [exportActionRunningId, setExportActionRunningId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [effectPackageKey, setEffectPackageKey] = useState<string | null>(null);
  const [effectDraft, setEffectDraft] = useState<EffectDraft>(emptyEffectDraft);
  const readyPackages = packages.filter((item) => item.status === "ready" && item.downloadHref);

  async function saveBaseline(item: PrePublishGateProjectStatus) {
    setRunningId(`${item.projectId}:snapshot`);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${item.projectId}/platform-export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "snapshot",
          platformId: item.platformId,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "保存发布包基准失败。");
      setMessage(payload.message ?? `已保存 ${item.platformName} 发布包基准。`);
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "保存发布包基准失败。");
    } finally {
      setRunningId(null);
    }
  }

  async function saveEffect(item: PrePublishGateProjectStatus) {
    setRunningId(`${item.projectId}:effect`);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${item.projectId}/platform-export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save-effect",
          platformId: item.platformId,
          ...effectDraft,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string; metric?: GatePublishEffectReceiptMetric & {
        platformId: string;
        platformName: string;
      }; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "保存发布效果失败。");
      if (payload.metric) {
        addGateActionReceipt(buildGatePublishEffectReceipt({
          projectId: item.projectId,
          platformId: payload.metric.platformId,
          platformName: payload.metric.platformName,
          metric: payload.metric,
        }));
      }
      setMessage(payload.message ?? `已记录 ${item.platformName} 发布效果。`);
      setEffectDraft(emptyEffectDraft);
      setEffectPackageKey(null);
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "保存发布效果失败。");
    } finally {
      setRunningId(null);
    }
  }

  async function runExportVersionAction(
    item: PrePublishGateProjectStatus,
    action: PrePublishGateProjectStatus["exportVersionGate"]["repairActions"][number],
  ) {
    if (!action.execution) return;
    const actionKey = `${item.projectId}:${action.id}`;
    setExportActionRunningId(actionKey);
    setMessage(null);
    try {
      if (action.execution.type === "lock_baseline") {
        const response = await fetch(`/api/export/snapshots/${action.execution.snapshotId}/baseline`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "lock" }),
        });
        const payload = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "更新导出基准失败。");
        const successMessage = payload.message ?? "已更新导出基准。";
        addGateActionReceipt(buildGateExportVersionActionReceipt({
          projectId: item.projectId,
          projectTitle: item.projectTitle,
          action,
          message: successMessage,
        }));
        setMessage(successMessage);
        router.refresh();
        return;
      }

      const response = await fetch(`/api/export/snapshots/${action.execution.snapshotId}/download`);
      if (!response.ok) throw new Error("重导最新包失败。");
      const content = await response.blob();
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${item.projectTitle}-导出重生成`;
      link.click();
      URL.revokeObjectURL(url);
      const successMessage = `${item.projectTitle} 已按导出快照重新生成。`;
      addGateActionReceipt(buildGateExportVersionActionReceipt({
        projectId: item.projectId,
        projectTitle: item.projectTitle,
        action,
        message: successMessage,
      }));
      setMessage(successMessage);
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "导出版本动作执行失败。");
    } finally {
      setExportActionRunningId(null);
    }
  }

  return (
    <section className="mb-6 rounded-md border border-slate-200 bg-white p-4" id="gate-export-package">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="font-medium text-slate-950">发布包导出</h2>
          <p className="mt-1 text-sm text-slate-600">
            {readyPackages.length ? `已有 ${readyPackages.length} 个发布包通过总闸门。` : "暂无通过总闸门的发布包。"}
          </p>
        </div>
        {message ? <div className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}
      </div>

      <div className="mt-4 grid gap-3">
        {packages.map((item) => (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3" key={packageKey(item)}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${packageTone(item.status)}`}>{item.label}</span>
                  <span className="font-medium text-slate-950">{item.projectTitle}</span>
                  <span className="text-sm text-slate-500">{item.platformName}</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {item.publishableChapters} 章 · {item.wordCount} 字 · 质检 {item.preflightScore} 分 · {item.finalGateLabel}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {item.downloadHref ? (
                  <>
                    <button
                      className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      disabled={runningId === `${item.projectId}:snapshot`}
                      onClick={() => void saveBaseline(item)}
                      type="button"
                    >
                      {runningId === `${item.projectId}:snapshot` ? "保存中" : "保存基准"}
                    </button>
                    <a
                      className="rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white"
                      href={item.downloadHref}
                    >
                      下载发布包
                    </a>
                    <button
                      className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      onClick={() => {
                        const targetKey = packageKey(item);
                        setEffectPackageKey((current) => current === targetKey ? null : targetKey);
                        setEffectDraft(emptyEffectDraft);
                      }}
                      type="button"
                    >
                      回填效果
                    </button>
                  </>
                ) : null}
                <Link className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50" href={hrefWithGateReturn(item.href, gateReturnHref)}>
                  打开项目
                </Link>
              </div>
            </div>
            {item.status === "ready" ? (
              <div className={`mt-3 rounded-md border p-3 text-sm ${loopTone(item.loopTimeline.status)}`}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="font-medium">闭环下一步：{item.loopTimeline.label}</div>
                    <p className="mt-1 leading-6">{item.loopTimeline.nextAction}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {item.loopTimeline.status === "needs_baseline" ? (
                      <button
                        className="rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-950 hover:bg-slate-50 disabled:opacity-50"
                        disabled={runningId === `${item.projectId}:snapshot`}
                        onClick={() => void saveBaseline(item)}
                        type="button"
                      >
                        {runningId === `${item.projectId}:snapshot` ? "保存中" : "保存基准"}
                      </button>
                    ) : null}
                    {item.loopTimeline.status === "needs_effect" ? (
                      <button
                        className="rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-950 hover:bg-slate-50"
                        onClick={() => {
                          setEffectPackageKey(packageKey(item));
                          setEffectDraft(emptyEffectDraft);
                        }}
                        type="button"
                      >
                        回填效果
                      </button>
                    ) : null}
                    {item.loopTimeline.status === "needs_iteration" || item.loopTimeline.status === "scaling" || item.loopTimeline.status === "needs_asset" ? (
                      <Link className="rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-950 hover:bg-slate-50" href={hrefWithGateReturn(item.loopTimeline.actionHref, gateReturnHref)}>
                        打开下一步
                      </Link>
                    ) : null}
                    {item.downloadHref ? (
                      <a className="rounded-md border border-current px-3 py-2 text-xs font-medium" href={item.downloadHref}>
                        下载发布包
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
            {item.exportVersionGate.snapshotCount > 0 || item.exportVersionGate.status !== "pass" ? (
              <div className={`mt-3 rounded-md border p-3 text-sm ${exportVersionTone(item.exportVersionGate.status)}`}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="font-medium">导出版本门禁：{item.exportVersionGate.label}</div>
                    <p className="mt-1 leading-6">{item.exportVersionGate.detail}</p>
                  </div>
                  <Link className="w-fit rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-950 hover:bg-slate-50" href={hrefWithGateReturn(item.exportVersionGate.href, gateReturnHref)}>
                    {item.exportVersionGate.actionLabel}
                  </Link>
                </div>
                {item.exportVersionGate.repairActions.length ? (
                  <div className="mt-3 grid gap-2 md:grid-cols-3">
                    {item.exportVersionGate.repairActions.map((action) => (
                      action.execution ? (
                        <button
                          className={`rounded-md border px-3 py-2 text-left text-xs font-medium disabled:opacity-50 ${exportVersionActionTone(action.priority)}`}
                          disabled={exportActionRunningId !== null}
                          key={action.id}
                          onClick={() => void runExportVersionAction(item, action)}
                          type="button"
                        >
                          <div>{exportActionRunningId === `${item.projectId}:${action.id}` ? "处理中" : action.label}</div>
                          <div className="mt-1 font-normal opacity-80">{action.detail}</div>
                        </button>
                      ) : (
                        <Link
                          className={`rounded-md border px-3 py-2 text-xs font-medium ${exportVersionActionTone(action.priority)}`}
                          href={hrefWithGateReturn(action.href, gateReturnHref)}
                          key={action.id}
                        >
                          <div>{action.label}</div>
                          <div className="mt-1 font-normal opacity-80">{action.detail}</div>
                        </Link>
                      )
                    ))}
                  </div>
                ) : null}
                {item.exportVersionGate.receiptReview.status === "handled" ? (
                  <div className="mt-3 flex flex-col gap-2 rounded-md bg-white/70 px-3 py-2 text-xs lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="font-medium text-slate-950">{item.exportVersionGate.receiptReview.label}</div>
                      <p className="mt-1 leading-5 opacity-80">{item.exportVersionGate.receiptReview.detail}</p>
                    </div>
                    <Link className="w-fit rounded-md border border-slate-200 bg-white px-3 py-2 font-medium text-slate-700 hover:bg-slate-50" href={hrefWithGateReturn(item.exportVersionGate.receiptReview.href, gateReturnHref)}>
                      {item.exportVersionGate.receiptReview.actionLabel}
                    </Link>
                  </div>
                ) : null}
              </div>
            ) : null}
            {effectPackageKey === packageKey(item) ? (
              <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
                <div className="mb-3 text-sm font-medium text-slate-950">回填平台效果</div>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {([
                    ["views", "曝光"],
                    ["clicks", "点击"],
                    ["favorites", "收藏"],
                    ["follows", "追读"],
                    ["comments", "评论"],
                    ["paidReads", "付费阅读"],
                  ] as const).map(([field, label]) => (
                    <label className="grid gap-1 text-sm text-slate-600" key={field}>
                      {label}
                      <input
                        className="rounded-md border border-slate-200 px-3 py-2 text-slate-950"
                        min="0"
                        onChange={(event) => setEffectDraft((current) => ({ ...current, [field]: event.target.value }))}
                        type="number"
                        value={effectDraft[field]}
                      />
                    </label>
                  ))}
                  <label className="grid gap-1 text-sm text-slate-600">
                    反馈状态
                    <select
                      className="rounded-md border border-slate-200 px-3 py-2 text-slate-950"
                      onChange={(event) => setEffectDraft((current) => ({ ...current, contractStatus: event.target.value }))}
                      value={effectDraft.contractStatus}
                    >
                      <option value="unknown">未知</option>
                      <option value="pending">待反馈</option>
                      <option value="invited">收到邀约</option>
                      <option value="signed">已签约</option>
                      <option value="rejected">被拒</option>
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm text-slate-600 lg:col-span-2">
                    发布链接
                    <input
                      className="rounded-md border border-slate-200 px-3 py-2 text-slate-950"
                      onChange={(event) => setEffectDraft((current) => ({ ...current, publishUrl: event.target.value }))}
                      value={effectDraft.publishUrl}
                    />
                  </label>
                  <label className="grid gap-1 text-sm text-slate-600 lg:col-span-3">
                    编辑反馈
                    <textarea
                      className="min-h-20 rounded-md border border-slate-200 px-3 py-2 text-slate-950"
                      onChange={(event) => setEffectDraft((current) => ({ ...current, editorFeedback: event.target.value }))}
                      value={effectDraft.editorFeedback}
                    />
                  </label>
                  <label className="grid gap-1 text-sm text-slate-600 lg:col-span-3">
                    备注
                    <textarea
                      className="min-h-16 rounded-md border border-slate-200 px-3 py-2 text-slate-950"
                      onChange={(event) => setEffectDraft((current) => ({ ...current, note: event.target.value }))}
                      value={effectDraft.note}
                    />
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                    disabled={runningId === `${item.projectId}:effect`}
                    onClick={() => void saveEffect(item)}
                    type="button"
                  >
                    {runningId === `${item.projectId}:effect` ? "保存中" : "保存效果"}
                  </button>
                  <button
                    className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() => setEffectPackageKey(null)}
                    type="button"
                  >
                    收起
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ))}
        {packages.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600">
            还没有项目可导出。
          </p>
        ) : null}
      </div>
    </section>
  );
}
