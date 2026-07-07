"use client";

import Link from "next/link";
import { useState } from "react";
import { buildGatePlatformDecisionSummaryMarkdown } from "@/lib/projects/gateActionReceipts";
import type {
  GatePlatformDecisionTimeline,
  GatePlatformDecisionTimelineItem,
  GatePlatformDecisionTimelineEventType,
  GatePlatformDecisionTimelineStatus,
} from "@/lib/projects/gateActionReceipts";

function timelineClass(status: GatePlatformDecisionTimelineStatus) {
  if (status === "blocked") return "border-rose-200 bg-rose-50 text-rose-900";
  if (status === "needs_effect") return "border-amber-200 bg-amber-50 text-amber-900";
  if (status === "rechecking") return "border-blue-200 bg-blue-50 text-blue-900";
  if (status === "recovering") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  return "border-slate-200 bg-slate-50 text-slate-800";
}

function eventClass(type: GatePlatformDecisionTimelineEventType) {
  if (type === "final") return "bg-violet-50 text-violet-700";
  if (type === "retreat") return "bg-rose-50 text-rose-700";
  if (type === "repair") return "bg-amber-50 text-amber-700";
  if (type === "recheck") return "bg-blue-50 text-blue-700";
  if (type === "effect") return "bg-emerald-50 text-emerald-700";
  return "bg-slate-100 text-slate-700";
}

function timeText(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "未记录时间" : date.toLocaleString("zh-CN");
}

function summaryFileName(item: GatePlatformDecisionTimelineItem) {
  return `${item.platformName.replace(/[\\/:*?"<>|]/g, "-")}-平台决策复盘.md`;
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

export function PlatformDecisionTimelinePanel({
  gateReturnHref,
  timeline,
}: {
  gateReturnHref?: string | null;
  timeline: GatePlatformDecisionTimeline;
}) {
  const [message, setMessage] = useState("");
  const summaryItems = [
    { label: "平台轨迹", value: timeline.summary.total, className: "bg-slate-50 text-slate-700" },
    { label: "阻塞", value: timeline.summary.blocked, className: "bg-rose-50 text-rose-700" },
    { label: "待复测", value: timeline.summary.needsEffect, className: "bg-amber-50 text-amber-700" },
    { label: "恢复中", value: timeline.summary.recovering, className: "bg-emerald-50 text-emerald-700" },
  ];

  async function copyDecisionSummary(item: GatePlatformDecisionTimelineItem) {
    const markdown = buildGatePlatformDecisionSummaryMarkdown(item);
    await navigator.clipboard.writeText(markdown);
    setMessage(`${item.platformName} 复盘摘要已复制。`);
  }

  function downloadDecisionSummary(item: GatePlatformDecisionTimelineItem) {
    const markdown = buildGatePlatformDecisionSummaryMarkdown(item);
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = summaryFileName(item);
    link.click();
    URL.revokeObjectURL(url);
    setMessage(`${item.platformName} 复盘摘要已下载。`);
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4" id="platform-decision-timeline">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="font-medium text-slate-950">平台决策时间线</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            当前作品的投稿、效果、派单、返工和复测会在这里串成平台轨迹，先看真实证据，再决定放大、观察或暂停。
          </p>
        </div>
        <Link className="w-fit rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800" href="/gate">
          打开总闸门
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        {summaryItems.map((item) => (
          <div className={`rounded-md px-3 py-2 ${item.className}`} key={item.label}>
            <div className="text-xs opacity-75">{item.label}</div>
            <div className="mt-1 text-2xl font-semibold">{item.value}</div>
          </div>
        ))}
      </div>

      {timeline.nextActions.length ? (
        <div className="mt-4 grid gap-2 lg:grid-cols-2">
          {timeline.nextActions.map((action) => (
            <div className="rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-600" key={action}>{action}</div>
          ))}
        </div>
      ) : null}
      {message ? (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>
      ) : null}

      {timeline.items.length ? (
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {timeline.items.map((item) => (
            <div className={`rounded-md border p-3 text-sm ${timelineClass(item.status)}`} key={item.platformId}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{item.platformName}</span>
                    <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-medium">{item.label}</span>
                    <span className="rounded-md bg-white/70 px-2 py-1 text-xs">优先级 {item.priorityScore}</span>
                  </div>
                  <p className="mt-2 leading-6 opacity-85">{item.detail}</p>
                </div>
                <Link className="w-fit rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-950 hover:bg-white/80" href={hrefWithGateReturn(item.href, gateReturnHref)}>
                  {item.actionLabel}
                </Link>
              </div>
              <div className="mt-3 grid gap-2">
                {item.events.slice(0, 4).map((event) => (
                  <Link className="rounded-md border border-white/70 bg-white/70 p-3 hover:bg-white" href={hrefWithGateReturn(event.href, gateReturnHref)} key={event.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-md px-2 py-1 text-xs font-medium ${eventClass(event.type)}`}>{event.label}</span>
                      <span className="text-xs opacity-70">{timeText(event.createdAt)}</span>
                    </div>
                    <p className="mt-2 leading-6 opacity-85">{event.detail}</p>
                    {event.evidence.length ? (
                      <div className="mt-2 flex flex-wrap gap-1 text-xs opacity-75">
                        {event.evidence.slice(0, 3).map((line) => (
                          <span className="rounded-md bg-white px-2 py-1" key={line}>{line}</span>
                        ))}
                      </div>
                    ) : null}
                  </Link>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="rounded-md border border-white/70 bg-white px-3 py-2 text-xs font-medium text-slate-950 hover:bg-white/80"
                  onClick={() => void copyDecisionSummary(item)}
                  type="button"
                >
                  复制复盘摘要
                </button>
                <button
                  className="rounded-md border border-white/70 bg-white/70 px-3 py-2 text-xs font-medium text-slate-950 hover:bg-white"
                  onClick={() => downloadDecisionSummary(item)}
                  type="button"
                >
                  下载复盘摘要
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
          还没有平台决策轨迹。生成投稿包、派发执行单，并回填首轮数据后，这里会开始出现平台证据链。
        </p>
      )}
    </section>
  );
}
