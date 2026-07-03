import type { WritingWorkbenchModelTimeline } from "@/lib/projects/writingWorkbench";
import { RetryTaskButton } from "@/components/tasks/RetryTaskButton";

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    succeeded: "成功",
    failed: "失败",
    running: "执行中",
    queued: "排队中",
  };

  return labels[status] ?? status;
}

function statusClass(status: string) {
  if (status === "succeeded") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "failed") return "border-rose-200 bg-rose-50 text-rose-800";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

export function WorkbenchModelTimelinePanel({ timeline }: { timeline: WritingWorkbenchModelTimeline }) {
  return (
    <div className="mt-4 rounded-md border border-slate-200 bg-white p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="font-medium text-slate-950">模型执行时间线</div>
          <p className="mt-1 text-sm text-slate-600">记录最近的生成、复审和失败复盘，不让模型动作变成黑箱。</p>
        </div>
        <div className="text-sm text-slate-500">{timeline.totalRuns} 次执行</div>
      </div>

      <div className="mt-3 grid gap-2">
        {timeline.items.map((item) => (
          <div className="rounded-md bg-slate-50 p-3 text-sm" key={item.id}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="font-medium text-slate-950">{item.label}</div>
                <div className="mt-1 text-slate-500">
                  {item.model} · {item.costLabel} · {new Date(item.createdAt).toLocaleString()}
                </div>
              </div>
              <span className={`w-fit rounded-md border px-2 py-1 text-xs ${statusClass(item.status)}`}>
                {statusLabel(item.status)}
              </span>
            </div>
            <p className="mt-2 text-slate-600">{item.summary}</p>
            <p className="mt-2 text-slate-500">下一步：{item.nextAction}</p>
            {item.retryAction ? (
              item.retryAction.supported ? (
                <RetryTaskButton className="mt-3 flex flex-wrap items-center gap-2" taskId={item.id} />
              ) : (
                <div className="mt-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                  {item.retryAction.label}：{item.retryAction.reason}
                </div>
              )
            ) : null}
          </div>
        ))}
        {timeline.items.length === 0 ? (
          <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">{timeline.emptyState}</div>
        ) : null}
      </div>
    </div>
  );
}
