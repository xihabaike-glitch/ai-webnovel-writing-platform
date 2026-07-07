import Link from "next/link";
import type { PlatformKnowledgeBrief } from "@/lib/projects/platformKnowledgeBrief";

function statusClass(status: PlatformKnowledgeBrief["status"]) {
  if (status === "learned") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "needs_action") return "border-amber-200 bg-amber-50 text-amber-900";
  if (status === "watch") return "border-sky-200 bg-sky-50 text-sky-900";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function receiptClass(severity: "success" | "needs_action") {
  if (severity === "success") return "bg-emerald-50 text-emerald-700";
  return "bg-amber-50 text-amber-700";
}

function shortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
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

export function PlatformKnowledgeBriefPanel({
  brief,
  gateReturnHref,
  projectId,
}: {
  brief: PlatformKnowledgeBrief;
  gateReturnHref?: string | null;
  projectId: string;
}) {
  const rawActionHref = brief.actionHref.startsWith("#") ? `/projects/${projectId}${brief.actionHref}` : brief.actionHref;
  const actionHref = hrefWithGateReturn(rawActionHref, gateReturnHref);

  return (
    <section className={`rounded-md border p-4 ${statusClass(brief.status)}`} id="platform-knowledge-brief">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-medium">平台经验快报</h2>
            <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-medium">{brief.label}</span>
            {brief.targetPlatformName ? <span className="text-xs opacity-75">{brief.targetPlatformName}</span> : null}
          </div>
          <p className="mt-2 text-sm leading-6 opacity-85">{brief.headline}</p>
          <p className="mt-1 text-sm leading-6 opacity-75">{brief.detail}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-950 hover:bg-white/80" href={actionHref}>
            {brief.nextAction}
          </Link>
          <Link className="rounded-md border border-white/70 bg-white/70 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-white" href={hrefWithGateReturn(`/projects/${projectId}#platform-tactic-library`, gateReturnHref)}>
            看打法库
          </Link>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5">
        <div className="rounded-md bg-white/70 p-3">
          <div className="text-xs opacity-70">回执</div>
          <div className="mt-1 text-xl font-semibold">{brief.totalReceipts}</div>
        </div>
        <div className="rounded-md bg-white/70 p-3">
          <div className="text-xs opacity-70">正反馈</div>
          <div className="mt-1 text-xl font-semibold">{brief.successCount}</div>
        </div>
        <div className="rounded-md bg-white/70 p-3">
          <div className="text-xs opacity-70">待处理</div>
          <div className="mt-1 text-xl font-semibold">{brief.needsActionCount}</div>
        </div>
        <div className="rounded-md bg-white/70 p-3">
          <div className="text-xs opacity-70">可复用</div>
          <div className="mt-1 text-xl font-semibold">{brief.reusableCount}</div>
        </div>
        <div className="rounded-md bg-white/70 p-3">
          <div className="text-xs opacity-70">避坑</div>
          <div className="mt-1 text-xl font-semibold">{brief.blockedCount}</div>
        </div>
      </div>

      {brief.signals.length ? (
        <div className="mt-4 grid gap-2 lg:grid-cols-2">
          {brief.signals.map((signal) => (
            <div className="rounded-md bg-white/70 p-3 text-sm leading-6" key={signal}>{signal}</div>
          ))}
        </div>
      ) : null}

      {brief.recent.length ? (
        <div className="mt-4 grid gap-2 lg:grid-cols-3">
          {brief.recent.map((receipt) => (
            <div className="rounded-md bg-white/70 p-3 text-sm" key={receipt.id}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{receipt.platformName}</span>
                <span className={`rounded-md px-2 py-1 text-xs font-medium ${receiptClass(receipt.severity)}`}>
                  {receipt.severity === "success" ? "正反馈" : "待处理"}
                </span>
              </div>
              <p className="mt-2 leading-6 opacity-85">{receipt.title}</p>
              <p className="mt-1 text-xs opacity-70">{receipt.actionLabel} · {shortDate(receipt.createdAt)}</p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
