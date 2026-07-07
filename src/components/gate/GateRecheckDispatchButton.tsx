"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { persistGateDispatchTask, type GatePlatformGrowthDispatchItem } from "@/lib/projects/gateActionReceipts";
import type { PrePublishGateRecheckDispatch } from "@/lib/projects/prePublishGate";

function hrefWithGateReturn(href: string, gateReturnHref?: string | null) {
  if (!gateReturnHref || !href.startsWith("/") || href.startsWith("/gate")) return href;

  const hashIndex = href.indexOf("#");
  const base = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";
  if (base.includes("gateReturn=")) return href;
  const separator = base.includes("?") ? "&" : "?";

  return `${base}${separator}gateReturn=${encodeURIComponent(gateReturnHref)}${hash}`;
}

export function GateRecheckDispatchButton({
  dispatch,
  gateReturnHref,
}: {
  dispatch: PrePublishGateRecheckDispatch;
  gateReturnHref?: string | null;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "running" | "assigned" | "failed">("idle");
  const [message, setMessage] = useState("");
  const dispatchHref = hrefWithGateReturn(`/dispatch#dispatch-${dispatch.id}`, gateReturnHref);

  async function assign() {
    setState("running");
    setMessage("");
    try {
      await persistGateDispatchTask({ ...(dispatch as GatePlatformGrowthDispatchItem), state: "assigned" });
      setState("assigned");
      setMessage(`已生成派单：${dispatch.title}`);
      router.push(dispatchHref);
    } catch (error) {
      setState("failed");
      setMessage(error instanceof Error ? error.message : "派单生成失败。");
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button
        className="rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-60"
        disabled={state === "running" || state === "assigned"}
        onClick={() => void assign()}
        type="button"
      >
        {state === "running" ? "生成中" : state === "assigned" ? "已生成派单" : "生成下一张派单"}
      </button>
      {state === "assigned" ? (
        <Link className="rounded-md border border-emerald-200 bg-white px-3 py-2 text-xs font-medium text-emerald-700" href={dispatchHref}>
          去派单中心
        </Link>
      ) : null}
      {message ? <span className="text-xs text-slate-600">{message}</span> : null}
    </div>
  );
}
