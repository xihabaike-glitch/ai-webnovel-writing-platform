"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  persistGateDispatchTask,
  updatePersistedGateDispatchTaskState,
  type GateFailureRepairRecheckCard as GateFailureRepairRecheckCardView,
  type GatePlatformGrowthDispatchItem,
} from "@/lib/projects/gateActionReceipts";

function hrefWithGateReturn(href: string, gateReturnHref?: string | null) {
  if (!gateReturnHref || !href.startsWith("/") || href.startsWith("/gate")) return href;

  const hashIndex = href.indexOf("#");
  const base = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";
  if (base.includes("gateReturn=")) return href;
  const separator = base.includes("?") ? "&" : "?";

  return `${base}${separator}gateReturn=${encodeURIComponent(gateReturnHref)}${hash}`;
}

export function FailureRepairRecheckCard({
  card,
  dispatch,
  gateReturnHref,
}: {
  card: GateFailureRepairRecheckCardView;
  dispatch: GatePlatformGrowthDispatchItem;
  gateReturnHref?: string | null;
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [completionEvidence, setCompletionEvidence] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function assign() {
    setIsSaving(true);
    setMessage(null);
    try {
      await persistGateDispatchTask(dispatch);
      setMessage("复检派单已接住，写完依据后再提交完成。");
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "接单失败。");
    } finally {
      setIsSaving(false);
    }
  }

  async function complete() {
    const evidence = completionEvidence.trim();
    if (evidence.length < 8) {
      setMessage("完成前请写清楚复检依据，至少 8 个字。");
      return;
    }
    setIsSaving(true);
    setMessage(null);
    try {
      await updatePersistedGateDispatchTaskState(card.dispatchKey, "completed", { completionEvidence: evidence });
      setMessage("复检依据已提交，刷新后看未恢复失败是否清空。");
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "提交复检依据失败。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="mb-6 rounded-md border border-blue-200 bg-blue-50 p-4 text-blue-950">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-medium">{card.title}</h2>
            <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-medium">{card.state}</span>
            <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-medium">{card.ownerRole}</span>
          </div>
          <p className="mt-2 max-w-4xl text-sm leading-6">{card.detail}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {card.evidence.slice(0, 4).map((item) => (
              <span className="rounded-md bg-white/70 px-2 py-1 text-xs" key={item}>{item}</span>
            ))}
          </div>
        </div>
        <Link className="w-fit rounded-md bg-white/80 px-3 py-2 text-sm font-medium hover:bg-white" href={hrefWithGateReturn("/dispatch", gateReturnHref)}>
          打开派单中心
        </Link>
      </div>

      {card.state === "assigned" ? (
        <div className="mt-4">
          <textarea
            className="min-h-24 w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-400"
            onChange={(event) => setCompletionEvidence(event.target.value)}
            placeholder={card.completionEvidencePlaceholder}
            value={completionEvidence}
          />
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {card.state === "completed" ? (
          <Link className="rounded-md bg-white px-3 py-2 text-xs font-medium text-blue-900 hover:bg-blue-100" href={hrefWithGateReturn(card.href, gateReturnHref)}>
            查看复检结果
          </Link>
        ) : (
          <button
            className="rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
            disabled={isSaving}
            onClick={() => void (card.state === "assigned" ? complete() : assign())}
            type="button"
          >
            {isSaving ? "处理中" : card.primaryActionLabel}
          </button>
        )}
        <span className="text-xs text-blue-800">{card.dueLabel}</span>
      </div>
      {message ? <p className="mt-2 text-xs leading-5 text-blue-800">{message}</p> : null}
    </section>
  );
}
