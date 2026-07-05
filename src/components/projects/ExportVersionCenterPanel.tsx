"use client";

import Link from "next/link";
import { useState } from "react";
import { buildExportSnapshotFilterOptions, filterExportSnapshots, type ExportSnapshotFilterId } from "@/lib/export/snapshotFilters";
import type { ExportPackageSnapshotView } from "@/lib/export/snapshots";
import type { ExportVersionCenterSummary } from "@/lib/export/versionCenter";

function statusClass(status: string) {
  if (status === "ready") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "warning") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "blocked") return "border-rose-200 bg-rose-50 text-rose-800";
  return "border-slate-200 bg-white text-slate-500";
}

function comparisonClass(status: NonNullable<ExportPackageSnapshotView["comparison"]>["status"]) {
  if (status === "improved") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "declined") return "border-rose-200 bg-rose-50 text-rose-800";
  if (status === "changed") return "border-sky-200 bg-sky-50 text-sky-800";
  return "border-slate-200 bg-white text-slate-600";
}

function timeText(value: string | Date | null) {
  if (!value) return "无记录";
  return new Date(value).toLocaleString("zh-CN");
}

export function ExportVersionCenterPanel({
  projectHref,
  snapshots,
  summary,
}: {
  projectHref: string;
  snapshots: ExportPackageSnapshotView[];
  summary: ExportVersionCenterSummary;
}) {
  const [filterId, setFilterId] = useState<ExportSnapshotFilterId>("all");
  const [expandedSnapshotId, setExpandedSnapshotId] = useState<string | null>(summary.latestSnapshot?.id ?? null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const filterOptions = buildExportSnapshotFilterOptions(snapshots);
  const visibleSnapshots = filterExportSnapshots(snapshots, filterId);

  async function regenerateSnapshot(snapshot: ExportPackageSnapshotView) {
    setRunningId(snapshot.id);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/export/snapshots/${snapshot.id}/download`);
      if (!response.ok) throw new Error("重新生成失败，请稍后重试。");

      const content = await response.blob();
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = snapshot.fileName;
      link.click();
      URL.revokeObjectURL(url);
      setMessage(`已重新生成 ${snapshot.packageKindLabel} · ${snapshot.formatLabel}。刷新后会出现新的版本记录。`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "重新生成失败。");
    } finally {
      setRunningId(null);
    }
  }

  return (
    <div className="grid gap-5">
      <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">版本记录</div>
          <div className="mt-1 text-2xl font-semibold">{summary.totalSnapshots}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">覆盖率</div>
          <div className="mt-1 text-2xl font-semibold">{summary.targetCoveragePercent}%</div>
          <div className="mt-1 text-xs text-slate-500">{summary.coveredTargets}/{summary.totalTargets} 类交付物</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">可交付</div>
          <div className="mt-1 text-2xl font-semibold">{summary.readySnapshots}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">平均准备度</div>
          <div className="mt-1 text-2xl font-semibold">{summary.averageReadinessPercent}%</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">内容变化</div>
          <div className="mt-1 text-2xl font-semibold">{summary.changedSincePreviousCount}</div>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-medium">下一步</h2>
            <p className="mt-1 text-sm text-slate-600">{summary.nextAction.label}：{summary.nextAction.detail}</p>
          </div>
          <Link className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50" href={`${projectHref}#submission-package`}>
            去发布包
          </Link>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded bg-slate-100">
          <div className="h-full bg-slate-950" style={{ width: `${summary.targetCoveragePercent}%` }} />
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-medium">交付物覆盖</h2>
            <p className="mt-1 text-sm text-slate-600">完整包、大纲包、人物伏笔包、章节 ZIP 和伏笔 CSV 都要留版本。</p>
          </div>
          <div className="text-sm text-slate-500">最近版本：{timeText(summary.latestCreatedAt)}</div>
        </div>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          {summary.targets.map((target) => (
            <div className={`rounded-md border p-3 text-sm ${statusClass(target.status)}`} key={target.id}>
              <div className="font-medium">{target.label}</div>
              <div className="mt-1 opacity-80">{target.statusLabel} · {target.readinessPercent}% · {target.fileSizeLabel}</div>
              <div className="mt-1 text-xs opacity-70">{timeText(target.latestCreatedAt)}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-medium">版本历史</h2>
            <p className="mt-1 text-sm text-slate-600">筛选、查看详情、按历史目标重新生成当前内容。</p>
          </div>
          <div className="text-sm text-slate-500">{visibleSnapshots.length}/{snapshots.length} 条</div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {filterOptions.map((option) => (
            <button
              className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                filterId === option.id
                  ? "border-slate-900 bg-slate-950 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
              disabled={option.count === 0}
              key={option.id}
              onClick={() => setFilterId(option.id)}
              type="button"
            >
              {option.label} {option.count}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3">
          {visibleSnapshots.map((snapshot) => (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600" key={snapshot.id}>
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="font-medium text-slate-950">{snapshot.packageKindLabel} · {snapshot.formatLabel}</div>
                  <div className="mt-1">{snapshot.fileName}</div>
                </div>
                <div className="text-xs text-slate-500">{timeText(snapshot.createdAt)}</div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className={`rounded-md border px-2 py-1 ${statusClass(snapshot.readinessStatus)}`}>{snapshot.readinessLabel} · {snapshot.readinessPercent}%</span>
                <span className="rounded-md bg-white px-2 py-1">章节 {snapshot.chapterCount}</span>
                <span className="rounded-md bg-white px-2 py-1">字数 {snapshot.wordCount}</span>
                <span className="rounded-md bg-white px-2 py-1">{snapshot.fileSizeLabel}</span>
                <span className="rounded-md bg-white px-2 py-1">摘要 {snapshot.contentHash.slice(0, 12)}</span>
              </div>
              {snapshot.comparison ? (
                <div className={`mt-3 rounded-md border px-3 py-2 text-xs ${comparisonClass(snapshot.comparison.status)}`}>
                  {snapshot.comparison.label}
                </div>
              ) : null}
              {expandedSnapshotId === snapshot.id ? (
                <div className="mt-3 border-t border-slate-200 pt-3 text-xs leading-5">
                  <div className="font-medium text-slate-900">{snapshot.detail.summary}</div>
                  <div className="mt-2 grid gap-1 md:grid-cols-2">
                    {[...snapshot.detail.metadata, ...snapshot.detail.technical].map((line) => (
                      <div key={line}>{line}</div>
                    ))}
                  </div>
                  <div className="mt-2 grid gap-1">
                    {snapshot.detail.comparison.map((line) => (
                      <div key={line}>{line}</div>
                    ))}
                  </div>
                  <p className="mt-2 text-slate-500">{snapshot.detail.boundary}</p>
                </div>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => setExpandedSnapshotId(expandedSnapshotId === snapshot.id ? null : snapshot.id)}
                  type="button"
                >
                  {expandedSnapshotId === snapshot.id ? "收起详情" : "查看详情"}
                </button>
                <button
                  className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  disabled={runningId !== null}
                  onClick={() => void regenerateSnapshot(snapshot)}
                  type="button"
                >
                  {runningId === snapshot.id ? "生成中" : "重新生成"}
                </button>
              </div>
            </div>
          ))}
          {visibleSnapshots.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-600">
              这个筛选下没有版本记录。
            </div>
          ) : null}
        </div>
      </section>
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

