import Link from "next/link";
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

export function GatePlatformStrategyReviewPanel({ review }: { review: PrePublishGateStrategyReview }) {
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
            <Link className="w-fit rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white" href={review.primary.href}>
              处理主平台
            </Link>
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
              <Link className="w-fit rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50" href={item.href}>
                去处理
              </Link>
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
                <Link className="rounded-md bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-100" href={project.href} key={project.projectId}>
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
