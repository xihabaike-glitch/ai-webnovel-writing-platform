import Link from "next/link";
import type { ChapterProductionFlow, ChapterProductionFlowTone } from "@/lib/projects/chapterProductionFlow";

function toneClass(tone: ChapterProductionFlowTone) {
  if (tone === "emerald") return "bg-emerald-50 text-emerald-700";
  if (tone === "rose") return "bg-rose-50 text-rose-700";
  if (tone === "sky") return "bg-sky-50 text-sky-700";
  if (tone === "amber") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

function statusLabel(status: ChapterProductionFlow["status"]) {
  if (status === "ready") return "可连续生产";
  if (status === "working") return "推进中";
  return "有卡点";
}

export function ChapterProductionFlowPanel({ flow }: { flow: ChapterProductionFlow }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4" id="chapter-production-flow">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-medium">章节生产流水线</h2>
            <span className={`rounded-md px-2 py-1 text-xs font-medium ${flow.status === "ready" ? "bg-emerald-50 text-emerald-700" : flow.status === "working" ? "bg-sky-50 text-sky-700" : "bg-amber-50 text-amber-700"}`}>
              {statusLabel(flow.status)}
            </span>
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-600">{flow.headline}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{flow.nextAction}</p>
        </div>
        <Link
          className="w-fit rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          href={flow.nextHref}
        >
          {flow.nextActionLabel}
        </Link>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
        {flow.stages.map((stage) => (
          <div
            className={`rounded-md p-3 text-sm ${flow.bottleneck === stage.id ? "ring-1 ring-slate-950" : "bg-slate-50"}`}
            key={stage.id}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium text-slate-950">{stage.label}</div>
              <span className={`rounded-md px-2 py-1 text-xs font-medium ${toneClass(stage.tone)}`}>
                {stage.count}/{stage.target}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-600">{stage.detail}</p>
            <Link
              className="mt-3 inline-flex rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              href={stage.href}
            >
              {stage.actionLabel}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
