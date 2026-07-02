import Link from "next/link";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <Link className="font-semibold" href="/">
            AI 网文写作平台
          </Link>
          <nav className="flex gap-4 text-sm text-slate-600">
            <Link href="/projects">作品</Link>
            <Link href="/tasks">任务</Link>
            <Link href="/dispatch">派单</Link>
            <Link href="/gate">总闸门</Link>
            <Link href="/failures">复盘</Link>
            <Link href="/settings/models">模型设置</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
    </div>
  );
}
