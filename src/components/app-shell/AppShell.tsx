"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { buildDevelopmentOverview } from "@/lib/development/developmentOverview";

const navigationLinks = [
  { href: "/projects", label: "作品" },
  { href: "/tasks", label: "任务" },
  { href: "/dispatch", label: "派单" },
  { href: "/gate", label: "总闸门" },
  { href: "/references", label: "参考库" },
  { href: "/docs", label: "开发文档" },
  { href: "/failures", label: "复盘" },
  { href: "/settings/models", label: "模型设置" },
];

export function navigationLinkState(pathname: string, href: string): { ariaCurrent: "page" | undefined; className: string } {
  const isCurrent = pathname === href || pathname.startsWith(`${href}/`);

  return {
    ariaCurrent: isCurrent ? "page" : undefined,
    className: isCurrent ? "font-medium text-slate-950 underline underline-offset-4" : "hover:text-slate-950",
  };
}

export function AppShell({ children }: { children: ReactNode }) {
  const overview = buildDevelopmentOverview();
  const expansionLabel = "剩余 10 个平台不再添加";
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <Link className="font-semibold" href="/">
            AI 网文写作平台
          </Link>
          <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm leading-5 text-slate-600">
            {navigationLinks.map((link) => {
              const state = navigationLinkState(pathname, link.href);

              return (
                <Link aria-current={state.ariaCurrent} className={state.className} href={link.href} key={link.href}>
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="border-t border-slate-100 bg-slate-950 text-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-2 text-xs leading-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-slate-200">
              <span className="font-medium text-white">主控闸门 路线</span>
              <span>{overview.platformScope.statusLabel}</span>
              <span>{expansionLabel}</span>
              <span>{overview.modelInterfaces.readyLabel}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link className="rounded-md bg-white px-2.5 py-1 font-medium text-slate-950 hover:bg-slate-100" href={overview.currentPipelineValidation.actionHref}>
                {overview.currentPipelineValidation.actionLabel}
              </Link>
              <Link className="rounded-md border border-white/20 px-2.5 py-1 font-medium text-white hover:bg-white/10" href="/docs">
                开发文档
              </Link>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
