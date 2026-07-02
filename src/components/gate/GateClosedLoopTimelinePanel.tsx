import Link from "next/link";
import type { PrePublishGateProjectStatus } from "@/lib/projects/prePublishGate";

function statusTone(status: PrePublishGateProjectStatus["loopTimeline"]["status"]) {
  if (status === "scaling") return "bg-emerald-50 text-emerald-700";
  if (status === "needs_iteration") return "bg-rose-50 text-rose-700";
  if (status === "needs_effect") return "bg-blue-50 text-blue-700";
  if (status === "needs_baseline") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

function itemTone(type: PrePublishGateProjectStatus["loopTimeline"]["items"][number]["type"]) {
  if (type === "asset") return "bg-violet-50 text-violet-700";
  if (type === "snapshot") return "bg-indigo-50 text-indigo-700";
  if (type === "metric") return "bg-blue-50 text-blue-700";
  return "bg-amber-50 text-amber-700";
}

function timeText(value: Date | string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未知";
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function GateClosedLoopTimelinePanel({ packages }: { packages: PrePublishGateProjectStatus[] }) {
  const activeLoops = packages.filter((item) => item.loopTimeline.items.length > 0 || item.status !== "empty");

  return (
    <section className="mb-6 rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="font-medium text-slate-950">闭环时间线</h2>
          <p className="mt-1 text-sm text-slate-600">
            采纳、基准、投放、回填和二轮判断串成一条链，别让作品卡在半路。
          </p>
        </div>
        <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {activeLoops.length} 个项目有闭环状态
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {activeLoops.map((item) => (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3" key={`${item.projectId}:${item.platformId}:loop`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${statusTone(item.loopTimeline.status)}`}>
                    {item.loopTimeline.label}
                  </span>
                  <span className="font-medium text-slate-950">{item.projectTitle}</span>
                  <span className="text-sm text-slate-500">{item.platformName}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.loopTimeline.nextAction}</p>
              </div>
              <Link className="w-fit rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50" href={item.loopTimeline.actionHref}>
                处理下一步
              </Link>
            </div>
            <div className="mt-3 grid gap-2 lg:grid-cols-2">
              {item.loopTimeline.items.map((event) => (
                <Link className="rounded-md border border-slate-200 bg-white p-3 text-sm hover:bg-slate-50" href={event.href} key={event.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${itemTone(event.type)}`}>{event.label}</span>
                    <span className="text-xs text-slate-500">{timeText(event.createdAt)}</span>
                  </div>
                  <p className="mt-2 leading-6 text-slate-600">{event.detail}</p>
                </Link>
              ))}
              {item.loopTimeline.items.length === 0 ? (
                <p className="rounded-md border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-600">
                  还没有闭环证据，先完成投稿资产和发布包基准。
                </p>
              ) : null}
            </div>
          </div>
        ))}
        {activeLoops.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600">
            暂无可追踪闭环。先创建作品并生成首轮发布包。
          </p>
        ) : null}
      </div>
    </section>
  );
}
