"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PrePublishGateProjectStatus } from "@/lib/projects/prePublishGate";

function packageTone(status: PrePublishGateProjectStatus["status"]) {
  if (status === "ready") return "bg-emerald-50 text-emerald-700";
  if (status === "empty") return "bg-slate-100 text-slate-700";
  return "bg-rose-50 text-rose-700";
}

export function GateExportPackagePanel({ packages }: { packages: PrePublishGateProjectStatus[] }) {
  const router = useRouter();
  const [runningId, setRunningId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
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

  return (
    <section className="mb-6 rounded-md border border-slate-200 bg-white p-4">
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
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3" key={`${item.projectId}:${item.platformId}`}>
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
                  </>
                ) : null}
                <Link className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50" href={item.href}>
                  打开项目
                </Link>
              </div>
            </div>
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
