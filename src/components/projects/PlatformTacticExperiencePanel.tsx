"use client";

import Link from "next/link";
import { useState } from "react";
import {
  buildGatePlatformTacticExperienceDisplay,
  buildGatePlatformTacticExperienceFollowupDispatch,
  buildGatePlatformTacticExperienceMarkdown,
  buildGatePlatformTacticExperienceStartHref,
  filterGatePlatformTacticExperienceItems,
  persistGateDispatchTask,
  type GatePlatformTacticExperienceItem,
  type GatePlatformTacticExperienceLibrary,
  type GatePlatformTacticExperienceStatus,
  type GatePlatformTacticExperienceStatusFilter,
} from "@/lib/projects/gateActionReceipts";

function experienceClass(status: GatePlatformTacticExperienceStatus) {
  if (status === "blocked") return "border-rose-200 bg-rose-50 text-rose-900";
  if (status === "watch") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-emerald-200 bg-emerald-50 text-emerald-900";
}

function statusLabel(status: GatePlatformTacticExperienceStatus) {
  if (status === "blocked") return "避坑样本";
  if (status === "watch") return "观察样本";
  return "可复用打法";
}

function filterLabel(status: GatePlatformTacticExperienceStatusFilter) {
  if (status === "usable") return "可复用";
  if (status === "watch") return "观察";
  if (status === "blocked") return "避坑";
  return "全部";
}

function fileName(item: GatePlatformTacticExperienceItem) {
  return `${item.platformName.replace(/[\\/:*?"<>|]/g, "-")}-平台打法经验.md`;
}

export function PlatformTacticExperiencePanel({ library }: { library: GatePlatformTacticExperienceLibrary }) {
  const [message, setMessage] = useState("");
  const [assigningDispatchId, setAssigningDispatchId] = useState("");
  const [statusFilter, setStatusFilter] = useState<GatePlatformTacticExperienceStatusFilter>("all");
  const visibleItems = filterGatePlatformTacticExperienceItems(library.items, statusFilter);
  const summaryItems = [
    { status: "all" as const, label: "经验", value: library.summary.total, className: "bg-slate-50 text-slate-700" },
    { status: "usable" as const, label: "可复用", value: library.summary.usable, className: "bg-emerald-50 text-emerald-700" },
    { status: "watch" as const, label: "观察", value: library.summary.watch, className: "bg-amber-50 text-amber-700" },
    { status: "blocked" as const, label: "避坑", value: library.summary.blocked, className: "bg-rose-50 text-rose-700" },
  ];

  async function copyExperience(item: GatePlatformTacticExperienceItem) {
    await navigator.clipboard.writeText(buildGatePlatformTacticExperienceMarkdown(item));
    setMessage(`${item.platformName} 打法经验已复制。`);
  }

  function downloadExperience(item: GatePlatformTacticExperienceItem) {
    const markdown = buildGatePlatformTacticExperienceMarkdown(item);
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName(item);
    link.click();
    URL.revokeObjectURL(url);
    setMessage(`${item.platformName} 打法经验已下载。`);
  }

  async function assignFollowupDispatch(item: GatePlatformTacticExperienceItem) {
    const dispatch = buildGatePlatformTacticExperienceFollowupDispatch(item);
    if (!dispatch) return;
    setAssigningDispatchId(dispatch.id);
    try {
      await persistGateDispatchTask({ ...dispatch, state: "assigned" });
      setMessage(`${item.platformName} 已生成「${dispatch.actionLabel}」任务。`);
    } catch {
      setMessage("任务生成失败，请稍后再试。");
    } finally {
      setAssigningDispatchId("");
    }
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4" id="platform-tactic-library">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="font-medium text-slate-950">平台打法库</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            把当前作品的平台决策链沉淀成可复用打法、观察样本和避坑样本，下一本开书时直接拿来做平台选择和首轮验证。
          </p>
        </div>
        <Link className="w-fit rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" href="#platform-decision-timeline">
          回看时间线
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        {summaryItems.map((item) => (
          <button
            className={`rounded-md px-3 py-2 text-left transition ${item.className} ${statusFilter === item.status ? "ring-2 ring-slate-950" : "hover:ring-1 hover:ring-slate-300"}`}
            key={item.label}
            onClick={() => setStatusFilter(item.status)}
            type="button"
          >
            <div className="text-xs opacity-75">{item.label}</div>
            <div className="mt-1 text-2xl font-semibold">{item.value}</div>
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span className="rounded-md bg-slate-50 px-2 py-1">当前筛选：{filterLabel(statusFilter)}</span>
        <span className="rounded-md bg-slate-50 px-2 py-1">显示 {visibleItems.length} 条</span>
      </div>

      {library.nextActions.length ? (
        <div className="mt-4 grid gap-2 xl:grid-cols-3">
          {library.nextActions.map((action) => (
            <div className="rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-600" key={action}>{action}</div>
          ))}
        </div>
      ) : null}
      {message ? (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>
      ) : null}

      {visibleItems.length ? (
        <div className="mt-4 grid gap-3 xl:grid-cols-3">
          {visibleItems.map((item) => (
            <div className={`rounded-md border p-3 text-sm ${experienceClass(item.status)}`} key={item.platformId}>
              {(() => {
                const display = buildGatePlatformTacticExperienceDisplay(item);
                const followupDispatch = buildGatePlatformTacticExperienceFollowupDispatch(item);
                return (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{item.platformName}</span>
                      <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-medium">{statusLabel(item.status)}</span>
                      {display.badges.map((badge) => (
                        <span className="rounded-md bg-white/80 px-2 py-1 text-xs font-medium" key={badge}>{badge}</span>
                      ))}
                    </div>
                    <div className="mt-3 rounded-md bg-white/70 p-3">
                      <div className="text-xs font-medium opacity-70">打法</div>
                      <p className="mt-1 font-medium leading-6">{item.tactic}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-md bg-white/80 px-2 py-1 font-medium">{display.outcomeLabel}</span>
                        <span className="rounded-md bg-white/80 px-2 py-1 font-medium">下一步：{display.nextStepLabel}</span>
                      </div>
                    </div>
                    <p className="mt-3 leading-6 opacity-85">{item.lesson}</p>
                    <div className="mt-3 grid gap-2">
                      <div className="rounded-md bg-white/70 p-3">
                        <div className="text-xs font-medium opacity-70">复用方式</div>
                        <p className="mt-1 leading-6">{item.reuseHint}</p>
                      </div>
                      <div className="rounded-md bg-white/70 p-3">
                        <div className="text-xs font-medium opacity-70">风险提醒</div>
                        <p className="mt-1 leading-6">{item.risk}</p>
                      </div>
                    </div>
                    {item.evidence.length ? (
                      <div className="mt-3 grid gap-1">
                        {item.evidence.slice(0, 2).map((evidence) => (
                          <p className="rounded-md border border-white/70 bg-white/60 p-2 text-xs leading-5 opacity-80" key={evidence}>{evidence}</p>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link className="rounded-md border border-white/70 bg-white px-3 py-2 text-xs font-medium text-slate-950 hover:bg-white/80" href={item.href}>
                        查看来源
                      </Link>
                      {item.status === "usable" ? (
                        <Link className="rounded-md border border-white/70 bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800" href={buildGatePlatformTacticExperienceStartHref(item)}>
                          用此打法开项目
                        </Link>
                      ) : null}
                      {followupDispatch ? (
                        <button
                          className="rounded-md border border-white/70 bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={assigningDispatchId === followupDispatch.id}
                          onClick={() => void assignFollowupDispatch(item)}
                          type="button"
                        >
                          {assigningDispatchId === followupDispatch.id ? "生成中" : followupDispatch.actionLabel}
                        </button>
                      ) : null}
                      <button
                        className="rounded-md border border-white/70 bg-white/70 px-3 py-2 text-xs font-medium text-slate-950 hover:bg-white"
                        onClick={() => void copyExperience(item)}
                        type="button"
                      >
                        复制经验
                      </button>
                      <button
                        className="rounded-md border border-white/70 bg-white/70 px-3 py-2 text-xs font-medium text-slate-950 hover:bg-white"
                        onClick={() => downloadExperience(item)}
                        type="button"
                      >
                        下载经验
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
          {library.items.length
            ? `当前没有${filterLabel(statusFilter)}经验，切换筛选查看其他样本。`
            : "暂无可沉淀的平台打法。先完成投稿派单、回填发布效果，平台决策时间线形成证据后，这里会自动生成经验样本。"}
        </p>
      )}
    </section>
  );
}
