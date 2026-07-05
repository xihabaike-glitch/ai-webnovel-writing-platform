import Link from "next/link";
import type { ContinuityAudit, ContinuityAuditItemStatus } from "@/lib/projects/continuityAudit";

function panelClass(status: ContinuityAudit["status"]) {
  if (status === "ready") return "border-emerald-200 bg-emerald-50";
  if (status === "watch") return "border-amber-200 bg-amber-50";
  return "border-rose-200 bg-rose-50";
}

function statusClass(status: ContinuityAuditItemStatus) {
  if (status === "pass") return "bg-emerald-100 text-emerald-800";
  if (status === "watch") return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
}

function statusLabel(status: ContinuityAuditItemStatus) {
  if (status === "pass") return "通过";
  if (status === "watch") return "观察";
  return "阻塞";
}

function metricLabel(value: number) {
  return value > 0 ? `${value}%` : "缺";
}

export function ContinuityAuditPanel({ audit }: { audit: ContinuityAudit }) {
  const visibleItems = audit.items.slice(0, 6);

  return (
    <section className={`rounded-md border p-4 ${panelClass(audit.status)}`} id="continuity-audit">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="font-medium text-slate-950">连续性审校</h2>
          <p className="mt-1 text-sm leading-6 text-slate-700">{audit.summary}</p>
          <p className="mt-2 text-sm font-medium text-slate-950">下一步：{audit.nextAction}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs text-slate-700">
          <div className="rounded-md bg-white/80 px-3 py-2">
            <div className="text-lg font-semibold text-slate-950">{audit.score}</div>
            <div>连续分</div>
          </div>
          <div className="rounded-md bg-white/80 px-3 py-2">
            <div className="text-lg font-semibold text-slate-950">{audit.metrics.blockedIssues}</div>
            <div>阻塞</div>
          </div>
          <div className="rounded-md bg-white/80 px-3 py-2">
            <div className="text-lg font-semibold text-slate-950">{audit.metrics.watchIssues}</div>
            <div>观察</div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-xs sm:grid-cols-5">
        <div className="rounded-md bg-white/80 p-2">
          <div className="text-slate-500">章节卡</div>
          <div className="mt-1 font-medium text-slate-950">{metricLabel(audit.metrics.chapterCoveragePercent)}</div>
        </div>
        <div className="rounded-md bg-white/80 p-2">
          <div className="text-slate-500">人物承接</div>
          <div className="mt-1 font-medium text-slate-950">{metricLabel(audit.metrics.characterReferencePercent)}</div>
        </div>
        <div className="rounded-md bg-white/80 p-2">
          <div className="text-slate-500">设定承接</div>
          <div className="mt-1 font-medium text-slate-950">{metricLabel(audit.metrics.worldReferencePercent)}</div>
        </div>
        <div className="rounded-md bg-white/80 p-2">
          <div className="text-slate-500">伏笔回收</div>
          <div className="mt-1 font-medium text-slate-950">{metricLabel(audit.metrics.foreshadowResolvedPercent)}</div>
        </div>
        <div className="rounded-md bg-white/80 p-2">
          <div className="text-slate-500">剧情锚点</div>
          <div className="mt-1 font-medium text-slate-950">{metricLabel(audit.metrics.threadAnchoredPercent)}</div>
        </div>
      </div>

      {visibleItems.length ? (
        <div className="mt-4 grid gap-2 lg:grid-cols-2">
          {visibleItems.map((item) => (
            <div className="rounded-md border border-white/70 bg-white p-3 text-sm shadow-sm" key={item.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium text-slate-950">{item.title}</div>
                <span className={`rounded-md px-2 py-1 text-xs font-medium ${statusClass(item.status)}`}>
                  {statusLabel(item.status)}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-600">{item.detail}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                {item.evidence.slice(0, 3).map((evidence) => (
                  <span className="rounded-md bg-slate-50 px-2 py-1" key={evidence}>{evidence}</span>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Link className="rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800" href={item.href}>
                  处理
                </Link>
                <span className="text-xs text-slate-500">{item.action}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-md bg-white/80 p-3 text-sm text-slate-600">
          当前没有明显连续性断点。继续写新章时，同步维护人物、设定、伏笔和剧情线。
        </p>
      )}
    </section>
  );
}
